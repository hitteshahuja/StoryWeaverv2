const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { generateBook, moderateContent, generateAIImage, generateSpeech } = require('../services/openai');
const { saveBase64, cleanupUserUploads } = require('../services/localStorage');

// POST /api/books/generate - Create a multi-page book
router.post(
  '/generate',
  requireAuth,
  [
    body('imageUrls').isArray({ min: 1, max: 12 }).withMessage('At least one and up to 12 images required'),
    body('childName').optional().isLength({ max: 50 }).trim().escape(),
    body('location').optional().isLength({ max: 500 }).trim().escape(),
    body('theme').optional().isLength({ max: 500 }).trim().escape(),
    body('style').optional().isLength({ max: 50 }).trim().escape(),
    body('borderStyle').optional().isLength({ max: 50 }).trim().escape(),
    body('pageCount').optional().isInt({ min: 1, max: 20 }).withMessage('Page count must be between 1 and 20'),
    body('childAge').optional().isInt({ min: 1, max: 18 }).withMessage('Age must be between 1 and 18'),
    // It can be optional
    body('childFeatures').optional().isObject().withMessage('Child features must be an object'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const clerkId = req.auth.userId;

    try {
      const userRes = await pool.query('SELECT * FROM users WHERE clerk_id = $1', [clerkId]);
      if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      const user = userRes.rows[0];

      if (user.credits <= 0) {
        return res.status(402).json({ error: 'Insufficient credits' });
      }

      const { imageUrls, childName, childAge, location, theme, style, styleFilter, borderStyle, pageCount = 10, childFeatures, customPrompt, dedicatedBy, coverImageUrl } = req.body;

      // User's pageCount = story pages only; total includes title + conclusion
      const totalPageCount = pageCount + 2;

      // Credit cost = 1 credit per page
      if (user.credits < pageCount) {
        return res.status(402).json({ error: `Insufficient credits. You need ${pageCount} credits for ${pageCount} story pages. You have ${user.credits}.` });
      }

      // 1. Generate the book content (passing child features and age for accurate representation)
      const pages = await generateBook(imageUrls, childName, location, theme, style, totalPageCount, childFeatures, childAge, customPrompt, dedicatedBy, coverImageUrl);

      // 2. Moderate the whole thing
      await moderateContent(pages.map(p => p.content).join('\n'));

      // 3. Save to DB
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const bookTitle = pages.find(p => p.type === 'title')?.content?.substring(0, 80) || `${childName}'s Magical Adventure`;

        const bookRes = await client.query(
          `INSERT INTO books (user_id, title, protagonist_name, theme, location, style, style_filter, border_style, page_count, cover_image_url, dedicated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
          [user.id, bookTitle, childName, theme, location, style, styleFilter, borderStyle, pageCount, coverImageUrl || null, dedicatedBy || 'Mummy and Daddy']
        );
        const book = bookRes.rows[0];

        // Insert pages (initial pass with just original photos if any)
        for (let i = 0; i < pages.length; i++) {
          const p = pages[i];
          await client.query(
            `INSERT INTO book_pages (book_id, page_number, image_url, content, type, dedication)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [book.id, i + 1, p.image_url || null, p.content, p.type, p.dedication || null]
          );
        }

        // 4. Trigger Background AI Image Generation (True AI Transformation)
        // We do this asynchronously so the user doesn't wait minutes for DALL-E 3
        (async () => {
          try {
            console.log(`[AI TRANSFORMATION] Starting for book ${book.id}...`);
            for (let i = 0; i < pages.length; i++) {
              const p = pages[i];
              if (p.image_prompt) {
                console.log(`[AI TRANSFORMATION] Generating image for page ${i + 1}...`);
                const aiUrl = await generateAIImage(p.image_prompt, style);
                if (aiUrl) {
                  const result = await pool.query(
                    'UPDATE book_pages SET ai_image_url = $1 WHERE book_id = $2 AND page_number = $3',
                    [aiUrl, book.id, i + 1]
                  );
                  console.log(`[AI TRANSFORMATION] Updated page ${i + 1}, rows affected: ${result.rowCount}`);
                } else {
                  console.log(`[AI TRANSFORMATION] No image URL returned for page ${i + 1}`);
                }
              }
            }
            console.log(`[AI TRANSFORMATION] Completed for book ${book.id}`);

            // Clean up user's uploaded photos (no longer needed after AI images generated)
            try {
              cleanupUserUploads(clerkId);
            } catch (cleanupErr) {
              console.error('[CLEANUP ERROR]', cleanupErr);
            }
          } catch (err) {
            console.error('[AI TRANSFORMATION ERROR]', err);
          }
        })();

        // Deduct credits: 1 credit per story page
        await client.query('UPDATE users SET credits = credits - $1 WHERE id = $2', [pageCount, user.id]);

        await client.query('COMMIT');

        res.json({ bookId: book.id, title: book.title });
      } catch (dbErr) {
        await client.query('ROLLBACK');
        console.error('[DATABASE ERROR]', dbErr);
        throw dbErr;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('[POST /books/generate] UNEXPECTED FAILURE:', {
        message: err.message,
        stack: err.stack,
        details: err.response?.data || err
      });
      res.status(500).json({ error: err.message || 'Book generation failed' });
    }
  }
);

// GET /api/books - List user's books
router.get('/', requireAuth, async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    const userRes = await pool.query('SELECT id FROM users WHERE clerk_id = $1', [clerkId]);
    if (userRes.rows.length === 0) return res.json([]);

    const result = await pool.query(
      'SELECT * FROM books WHERE user_id = $1 ORDER BY created_at DESC',
      [userRes.rows[0].id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// GET /api/books/:id - Get details and pages
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    const userRes = await pool.query('SELECT id FROM users WHERE clerk_id = $1', [clerkId]);
    const bookId = req.params.id;

    const bookRes = await pool.query(
      'SELECT * FROM books WHERE id = $1 AND user_id = $2',
      [bookId, userRes.rows[0].id]
    );

    if (bookRes.rows.length === 0) return res.status(404).json({ error: 'Book not found' });

    const pagesRes = await pool.query(
      'SELECT * FROM book_pages WHERE book_id = $1 ORDER BY page_number ASC',
      [bookId]
    );

    res.json({
      ...bookRes.rows[0],
      pages: pagesRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch book details' });
  }
});

// POST /api/books/proxy-image — proxy image download to bypass CORS
router.post('/proxy-image', requireAuth, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error('[proxy-image] upstream error:', response.status, url.substring(0, 100));
      return res.status(response.status).json({ error: 'Failed to fetch image' });
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    res.json({ data: `data:${contentType};base64,${base64}` });
  } catch (err) {
    console.error('[proxy-image] error:', err.message);
    res.status(500).json({ error: 'Failed to proxy image' });
  }
});

// POST /api/books/tts — Generate text-to-speech audio for a page
router.post(
  '/tts',
  requireAuth,
  [
    body('text').isLength({ min: 1, max: 4096 }).withMessage('Text is required (max 4096 chars)'),
    body('bookId').isInt().withMessage('Book ID required'),
    body('pageNumber').isInt().withMessage('Page number required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const clerkId = req.auth.userId;
    const { text, bookId, pageNumber } = req.body;

    try {
      // Verify ownership
      const userRes = await pool.query('SELECT id FROM users WHERE clerk_id = $1', [clerkId]);
      if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

      const bookRes = await pool.query('SELECT id FROM books WHERE id = $1 AND user_id = $2', [bookId, userRes.rows[0].id]);
      if (bookRes.rows.length === 0) return res.status(404).json({ error: 'Book not found' });

      // Check if audio already cached
      const pageRes = await pool.query(
        'SELECT audio_url FROM book_pages WHERE book_id = $1 AND page_number = $2',
        [bookId, pageNumber]
      );
      if (pageRes.rows.length > 0 && pageRes.rows[0].audio_url) {
        return res.json({ audioUrl: pageRes.rows[0].audio_url, cached: true });
      }

      // Generate speech
      const audioBuffer = await generateSpeech(text);
      if (!audioBuffer) return res.status(500).json({ error: 'Failed to generate audio' });

      // Save to persistent storage (R2)
      const { v4: uuidv4 } = require('uuid');
      const filename = `${uuidv4()}.mp3`;
      const audioUrl = await saveBase64(audioBuffer.toString('base64'), `tts/${bookId}`, filename);

      if (!audioUrl) return res.status(500).json({ error: 'Failed to save audio' });

      // Cache the audio URL
      await pool.query(
        'UPDATE book_pages SET audio_url = $1 WHERE book_id = $2 AND page_number = $3',
        [audioUrl, bookId, pageNumber]
      );

      res.json({ audioUrl, cached: false });
    } catch (err) {
      console.error('[POST /books/tts]', err);
      const status = err.status || 500;
      res.status(status).json({
        error: err.message || 'TTS generation failed',
        code: err.code || 'tts_error',
      });
    }
  }
);

module.exports = router;
