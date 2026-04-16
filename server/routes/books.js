const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { generateBook, moderateContent, generateAIImage, generateSpeech, generateEmbedding, describeImage, analyzeImageForThemes, extractChildFeatures, suggestVisualStyles } = require('../services/openai');
const { FONTS, getFontById, DEFAULT_FONT } = require('../config/fonts');
const { saveBase64, cleanupUserUploads } = require('../services/localStorage');
const redisClient = require('../services/redis');

// GET /api/books/fonts - Get available fonts
router.get('/fonts', (req, res) => {
  res.json({ fonts: FONTS, default: DEFAULT_FONT });
});

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
    body('font').optional().isLength({ max: 50 }).trim().escape(),
    body('pageCount').optional().isInt({ min: 1, max: 20 }).withMessage('Page count must be between 1 and 20'),
    body('childAge').optional({ values: 'null' }).isInt({ min: 1, max: 18 }).withMessage('Age must be between 1 and 18'),
    // It can be optional
    body('childFeatures').optional({ values: 'null' }).isObject().withMessage('Child features must be an object'),
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

      const { imageUrls, childName, childAge, location, theme, style, styleFilter, borderStyle, pageCount = 10, childFeatures, customPrompt, dedicatedBy, coverImageUrl, font } = req.body;

      // Validate font - default to system if invalid
      const validFont = font && FONTS.some(f => f.id === font) ? font : DEFAULT_FONT;

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
        const firstStoryContent = pages.find(p => p.type === 'story')?.content || '';

        // Generate embedding for search & discovery
        const embedding = await generateEmbedding(`${bookTitle}. ${firstStoryContent}`);

        const bookRes = await client.query(
          `INSERT INTO books (user_id, title, protagonist_name, theme, location, style, style_filter, border_style, page_count, cover_image_url, dedicated_by, font, embedding)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
          [user.id, bookTitle, childName, theme, location, style, styleFilter, borderStyle, pageCount, coverImageUrl || null, dedicatedBy || 'Mummy and Daddy', validFont, embedding ? JSON.stringify(embedding) : null]
        );
        const book = bookRes.rows[0];

        // Insert pages (initial pass with just original photos if any)
        for (let i = 0; i < pages.length; i++) {
          const p = pages[i];
          await client.query(
            `INSERT INTO book_pages (book_id, page_number, image_url, content, type, dedication, image_prompt)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [book.id, i + 1, p.image_url || null, p.content, p.type, p.dedication || null, p.image_prompt || null]
          );
        }

        // 4. Trigger Background AI Image Generation (True AI Transformation)
        // We do this asynchronously so the user doesn't wait minutes for generation
        (async () => {
          try {
            console.log(`[AI TRANSFORMATION] Starting for book ${book.id}...`);
            // Generate a stable seed for this entire book to ensure visual consistency
            const bookSeed = Math.floor(Math.random() * 2147483647);
            
            for (let i = 0; i < pages.length; i++) {
              const p = pages[i];
              if (p.image_prompt) {
                console.log(`[AI TRANSFORMATION] Generating image for page ${i + 1} (Seed: ${bookSeed})...`);
                const aiUrl = await generateAIImage(p.image_prompt, style, bookSeed);
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

            // Invalidate cache so updated ai_image_url is served
            try {
              await redisClient.del(`book:${book.id}`);
              console.log(`[CACHE] Invalidated book:${book.id}`);
            } catch (e) {
              console.error('[CACHE DEL ERROR]', e);
            }

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

// GET /api/books/favorites - List user's favorite books with pagination
router.get('/favorites', requireAuth, async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const userRes = await pool.query('SELECT id FROM users WHERE clerk_id = $1', [clerkId]);
    if (userRes.rows.length === 0) return res.json({ books: [], total: 0, page, limit });

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM books WHERE user_id = $1 AND is_favorite = TRUE',
      [userRes.rows[0].id]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT b.*, 
        COALESCE(
          (SELECT array_agg(row_to_json(p)) FROM (
            SELECT page_number, ai_image_url, content, type 
            FROM book_pages WHERE book_id = b.id AND ai_image_url IS NOT NULL ORDER BY page_number LIMIT 1
          ) p), 
          NULL
        ) AS pages
       FROM books b WHERE b.user_id = $1 AND b.is_favorite = TRUE ORDER BY b.created_at DESC LIMIT $2 OFFSET $3`,
      [userRes.rows[0].id, limit, offset]
    );
    const books = result.rows.map(b => ({
      ...b,
      pages: b.pages || []
    }));
    res.json({ books, total, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch favorite books' });
  }
});
router.get('/', requireAuth, async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const userRes = await pool.query('SELECT id FROM users WHERE clerk_id = $1', [clerkId]);
    if (userRes.rows.length === 0) return res.json({ books: [], total: 0, page, limit });

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM books WHERE user_id = $1',
      [userRes.rows[0].id]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT b.*, 
        COALESCE(
          (SELECT array_agg(row_to_json(p)) FROM (
            SELECT page_number, ai_image_url, content, type 
            FROM book_pages WHERE book_id = b.id AND ai_image_url IS NOT NULL ORDER BY page_number LIMIT 1
          ) p), 
          NULL
        ) AS pages
       FROM books b WHERE b.user_id = $1 ORDER BY b.created_at DESC LIMIT $2 OFFSET $3`,
      [userRes.rows[0].id, limit, offset]
    );
    const books = result.rows.map(b => ({
      ...b,
      pages: b.pages || []
    }));
    res.json({ books, total, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// GET /api/books/:id - Get details and pages
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    const userRes = await pool.query('SELECT id FROM users WHERE clerk_id = $1', [clerkId]);
    const userId = userRes.rows[0].id;
    const bookId = req.params.id;

    // Check Cache
    try {
      const cachedBook = await redisClient.get(`book:${bookId}`);
      if (cachedBook) {
        const bookData = JSON.parse(cachedBook);
        if (bookData.user_id !== userId) return res.status(404).json({ error: 'Book not found' });
        return res.json(bookData);
      }
    } catch (e) {
      console.error('Redis GET error:', e);
    }

    const bookRes = await pool.query(
      'SELECT * FROM books WHERE id = $1 AND user_id = $2',
      [bookId, userId]
    );

    if (bookRes.rows.length === 0) return res.status(404).json({ error: 'Book not found' });

    const pagesRes = await pool.query(
      'SELECT * FROM book_pages WHERE book_id = $1 ORDER BY page_number ASC',
      [bookId]
    );

    const bookData = {
      ...bookRes.rows[0],
      pages: pagesRes.rows
    };

    // Set Cache
    try {
      await redisClient.setEx(`book:${bookId}`, 3600, JSON.stringify(bookData));
    } catch (e) {
      console.error('Redis SET error:', e);
    }

    res.json(bookData);
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

      // Invalidate book cache
      try {
        await redisClient.del(`book:${bookId}`);
      } catch (e) {
        console.error('Redis DEL error:', e);
      }

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

// POST /api/books/analyze - Analyze an image for themes
router.post(
  '/analyze',
  requireAuth,
  [
    body('imageUrl').custom(val => {
      if (!val) return false;
      return val.startsWith('/') || val.startsWith('http') || val.startsWith('data:');
    }).withMessage('Invalid image URL format'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const themes = await analyzeImageForThemes(req.body.imageUrl);
      res.json({ themes });
    } catch (err) {
      res.status(500).json({ error: 'Failed to analyze image' });
    }
  }
);

// POST /api/books/suggest-filters - Suggest visual styles/filters
router.post(
  '/suggest-filters',
  requireAuth,
  [
    body('imageUrl').custom(val => {
      if (!val) return false;
      return val.startsWith('/') || val.startsWith('http') || val.startsWith('data:');
    }).withMessage('Invalid image URL format'),
  ],
  async (req, res) => {
    try {
      const styles = await suggestVisualStyles(req.body.imageUrl);
      res.json({ styles });
    } catch (err) {
      res.status(500).json({ error: 'Failed' });
    }
  }
);

// POST /api/books/extract-features - Detailed physical character analysis
router.post(
  '/extract-features',
  requireAuth,
  [body('imageUrls').isArray({ min: 1 })],
  async (req, res) => {
    try {
      const { imageUrls, childName, childAge } = req.body;
      const features = await extractChildFeatures(imageUrls, childName, childAge);
      res.json({ features });
    } catch (err) {
      console.error('[EXTRACT FEATURES ERROR]', err);
      res.status(500).json({ error: 'Failed to extract features', details: err.message });
    }
  }
);

// POST /api/books/refresh - Regenerate themes and features (costs 1 credit)
router.post(
  '/refresh',
  requireAuth,
  async (req, res) => {
    const clerkId = req.auth.userId;
    try {
      const userRes = await pool.query('SELECT * FROM users WHERE clerk_id = $1', [clerkId]);
      if (userRes.rows[0].credits < 1) return res.status(402).json({ error: 'Insufficient credits' });

      const { imageUrl, imageUrls, childName, location, childAge } = req.body;
      const [themes, features] = await Promise.all([
        analyzeImageForThemes(imageUrl, childName, location),
        extractChildFeatures(imageUrls, childName, childAge)
      ]);

      await pool.query('UPDATE users SET credits = credits - 1 WHERE id = $1', [userRes.rows[0].id]);
      res.json({ themes, features });
    } catch (err) {
      res.status(500).json({ error: 'Refresh failed' });
    }
  }
);

// POST /api/books/:id/related — find similar public books using RAG
router.post(
  '/:id/related',
  requireAuth,
  [param('id').isInt()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const bookId = parseInt(req.params.id);
    console.log(bookId);

    // Check Cache for related books
    try {
      const cachedRelated = await redisClient.get(`related_books:${bookId}`);
      if (cachedRelated) {
        return res.json(JSON.parse(cachedRelated));
      }
    } catch (e) {
      console.error('Redis GET error:', e);
    }

    try {
      const currentBookRes = await pool.query(
        'SELECT id, embedding FROM books WHERE id = $1',
        [bookId]
      );

      if (currentBookRes.rows.length === 0) return res.status(404).json({ error: 'Book not found' });
      let embedding = currentBookRes.rows[0].embedding;

      // Fix malformed embedding if it's stored as '"[...]"' instead of '[...]'
      if (embedding && typeof embedding === 'string') {
        if (embedding.startsWith('"') && embedding.endsWith('"')) {
          try {
            embedding = JSON.parse(embedding);
            console.log('[RELATED] Repaired malformed embedding');
          } catch (e) {
            embedding = null;
          }
        }
      }

      // Backwards compatibility: Generate embedding on the fly if it's an older book
      if (!embedding) {
        const firstPageRes = await pool.query(
          "SELECT content FROM book_pages WHERE book_id = $1 AND type = 'story' ORDER BY page_number ASC LIMIT 1",
          [bookId]
        );
        const firstStoryContent = firstPageRes.rows[0]?.content || '';
        const bookTitle = currentBookRes.rows[0]?.title || '';

        embedding = await generateEmbedding(`${bookTitle}. ${firstStoryContent}`);

        // Save it for future use - store as proper PostgreSQL vector literal
        if (embedding && Array.isArray(embedding) && embedding.length > 0) {
          const vectorLiteral = JSON.stringify(embedding);
          await pool.query('UPDATE books SET embedding = $1::vector WHERE id = $2', [vectorLiteral, bookId]);
        } else if (!embedding) {
          // If generation fails (e.g. rate limit), just gracefully return no related books instead of 404
          return res.json([]);
        }
      }

      const embeddingStr = (embedding && Array.isArray(embedding) && embedding.length > 0) ? JSON.stringify(embedding) : null;
      if (!embeddingStr) return res.json([]);

      const relatedRes = await pool.query(
        `SELECT id, title, cover_image_url as image_url, 
                (1 - (embedding <=> $1::vector)) * 100 as similarity
         FROM books
         WHERE id != $2 AND is_public = true AND embedding IS NOT NULL
         ORDER BY embedding <=> $1::vector
         LIMIT 4`,
        [embeddingStr, bookId]
      );

      // Set Cache for related books (1 hour TTL)
      try {
        await redisClient.setEx(`related_books:${bookId}`, 3600, JSON.stringify(relatedRes.rows));
      } catch (e) {
        console.error('Redis SET error:', e);
      }

      res.json(relatedRes.rows);
    } catch (err) {
      console.error('[POST /books/:id/related]', err);
      res.status(500).json({ error: 'Failed to fetch related books' });
    }
  }
);

// PATCH /api/books/:id/favorite — toggle favorite
router.patch(
  '/:id/favorite',
  requireAuth,
  [param('id').isInt()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const clerkId = req.auth.userId;
    const bookId = parseInt(req.params.id);

    try {
      const userRes = await pool.query('SELECT id FROM users WHERE clerk_id = $1', [clerkId]);
      if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

      const result = await pool.query(
        `UPDATE books SET is_favorite = NOT is_favorite
         WHERE id = $1 AND user_id = $2 RETURNING *`,
        [bookId, userRes.rows[0].id]
      );

      if (result.rows.length === 0) return res.status(404).json({ error: 'Book not found' });

      // Invalidate book cache
      try {
        await redisClient.del(`book:${bookId}`);
      } catch (e) {
        console.error('Redis DEL error:', e);
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error('[PATCH /books/:id/favorite]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/books/:id/refresh-image — Refresh a single page's AI image (costs 2 credits)
router.post(
  '/:id/refresh-image',
  requireAuth,
  [
    param('id').isInt().withMessage('Book ID must be an integer'),
    body('pageNumber').isInt({ min: 1 }).withMessage('Page number is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const clerkId = req.auth.userId;
    const bookId = parseInt(req.params.id);
    const { pageNumber, customPrompt } = req.body;

    try {
      const userRes = await pool.query('SELECT * FROM users WHERE clerk_id = $1', [clerkId]);
      if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

      const user = userRes.rows[0];

      if (user.credits < 2) {
        return res.status(402).json({ error: 'Insufficient credits. You need 2 credits to refresh an image.' });
      }

      // Verify book ownership
      const bookRes = await pool.query('SELECT * FROM books WHERE id = $1 AND user_id = $2', [bookId, user.id]);
      if (bookRes.rows.length === 0) return res.status(404).json({ error: 'Book not found' });

      const book = bookRes.rows[0];

      // Get the page
      const pageRes = await pool.query(
        'SELECT * FROM book_pages WHERE book_id = $1 AND page_number = $2',
        [bookId, pageNumber]
      );
      if (pageRes.rows.length === 0) return res.status(404).json({ error: 'Page not found' });

      const page = pageRes.rows[0];

      if (!page.image_prompt) {
        return res.status(400).json({ error: 'No image prompt available for this page' });
      }

      // Build the final prompt: original + custom instructions
      let finalPrompt = page.image_prompt;
      if (customPrompt && customPrompt.trim()) {
        finalPrompt = `${page.image_prompt}. Additional instructions: ${customPrompt.trim()}`;
      }

      // Generate new AI image
      const newAiImageUrl = await generateAIImage(finalPrompt, book.style);
      if (!newAiImageUrl) {
        return res.status(500).json({ error: 'Failed to generate new image' });
      }

      // Update the page with the new image
      await pool.query(
        'UPDATE book_pages SET ai_image_url = $1 WHERE book_id = $2 AND page_number = $3',
        [newAiImageUrl, bookId, pageNumber]
      );

      // Deduct 2 credits
      await pool.query('UPDATE users SET credits = credits - 2 WHERE id = $1', [user.id]);

      // Invalidate book cache
      try {
        await redisClient.del(`book:${bookId}`);
      } catch (e) {
        console.error('Redis DEL error:', e);
      }

      res.json({ success: true, newImageUrl: newAiImageUrl, creditsRemaining: user.credits - 2 });
    } catch (err) {
      console.error('[POST /books/:id/refresh-image]', err);
      res.status(500).json({ error: 'Failed to refresh image' });
    }
  }
);

module.exports = router;
