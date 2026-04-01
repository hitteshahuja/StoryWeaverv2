const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { generateStory, moderateContent, describeImage, analyzeImageForThemes, extractChildFeatures } = require('../services/openai');
const { suggestVisualStyles } = require('../services/gemini');

// Accepts both absolute URLs (http/https) and relative paths (/uploads/...)
const isUrlOrPath = (value) => {
  if (!value || typeof value !== 'string') return false;
  if (value.startsWith('/')) return true;
  try { new URL(value); return true; } catch { return false; }
};

// POST /api/stories/analyze — get AI themes from image (no credit cost)
router.post(
  '/analyze',
  requireAuth,
  [
    body('imageUrl').custom(isUrlOrPath).withMessage('Valid image URL required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const themes = await analyzeImageForThemes(req.body.imageUrl, req.body.childName || '', req.body.location || '');
      res.json({ themes });
    } catch (err) {
      console.error('[POST /stories/analyze]', err);
      res.status(500).json({ error: 'Failed to analyze image themes' });
    }
  }
);
// POST /api/stories/suggest-filters — get AI filters from image (no credit cost)
router.post('/suggest-filters', requireAuth, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: 'Image URL required' });
    const styles = await suggestVisualStyles(imageUrl); // Nano Banana logic
    res.json({ styles });
  } catch (err) {
    console.error('[POST /stories/suggest-filters]', err);
    res.status(500).json({ error: 'Failed to generate filters' });
  }
});

// POST /api/stories/extract-features — extract child's features from photos (no credit cost)
router.post(
  '/extract-features',
  requireAuth,
  [
    body('imageUrls').isArray({ min: 1 }).withMessage('At least one image URL required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const features = await extractChildFeatures(req.body.imageUrls, req.body.childName);
      res.json({ features });
    } catch (err) {
      console.error('[POST /stories/extract-features]', err);
      res.status(500).json({ error: 'Failed to extract child features' });
    }
  }
);

// POST /api/stories/generate — generate a story, deduct 1 credit
router.post(
  '/generate',
  requireAuth,
  [
    body('imageUrl').custom(isUrlOrPath).withMessage('Valid image URL required'),
    body('childName').optional().isLength({ max: 50 }).trim().escape(),
    body('location').optional().isLength({ max: 100 }).trim().escape(),
    body('theme').optional().isLength({ max: 500 }).trim().escape(),
    body('customPrompt').optional().isLength({ max: 500 }).trim().escape(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const clerkId = req.auth.userId;

    try {
      // Get user and check credits
      const userRes = await pool.query('SELECT * FROM users WHERE clerk_id = $1', [clerkId]);
      if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

      const user = userRes.rows[0];
      if (user.credits <= 0) {
        return res.status(402).json({ error: 'Insufficient credits', credits: 0 });
      }

      const { imageUrl, childName, location, theme, customPrompt } = req.body;

      // Step 1: Describe image with vision
      const imageDescription = await describeImage(imageUrl);

      // Step 2: Generate story
      const { title, content } = await generateStory(
        imageDescription,
        childName || '',
        location || '',
        theme || '',
        customPrompt || ''
      );

      // Step 3: Moderate AI output (secondary safety check)
      await moderateContent(content);

      // Step 4: Deduct 1 credit and save story atomically
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('UPDATE users SET credits = credits - 1 WHERE id = $1', [user.id]);
        const storyRes = await client.query(
          `INSERT INTO stories (user_id, title, content, image_url)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [user.id, title, content, imageUrl]
        );
        await client.query('COMMIT');

        const story = storyRes.rows[0];
        const updatedCredits = user.credits - 1;

        res.json({ story, credits: updatedCredits });
      } catch (txErr) {
        await client.query('ROLLBACK');
        throw txErr;
      } finally {
        client.release();
      }
    } catch (err) {
      if (err.message?.includes('Content moderation failed')) {
        return res.status(422).json({ error: 'Story could not be generated safely. Please try again.' });
      }
      console.error('[POST /stories/generate]', err);
      res.status(500).json({ error: 'Story generation failed. Please try again.' });
    }
  }
);

// GET /api/stories — list user's stories
router.get('/', requireAuth, async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    const userRes = await pool.query('SELECT id FROM users WHERE clerk_id = $1', [clerkId]);
    if (userRes.rows.length === 0) return res.json([]);

    const result = await pool.query(
      'SELECT * FROM stories WHERE user_id = $1 ORDER BY created_at DESC',
      [userRes.rows[0].id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[GET /stories]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/stories/favorites — only favorited stories
router.get('/favorites', requireAuth, async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    const userRes = await pool.query('SELECT id FROM users WHERE clerk_id = $1', [clerkId]);
    if (userRes.rows.length === 0) return res.json([]);

    const result = await pool.query(
      'SELECT * FROM stories WHERE user_id = $1 AND is_favorite = TRUE ORDER BY created_at DESC',
      [userRes.rows[0].id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/stories/:id/favorite — toggle favorite
router.patch(
  '/:id/favorite',
  requireAuth,
  [param('id').isInt()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const clerkId = req.auth.userId;
    const storyId = parseInt(req.params.id);

    try {
      const userRes = await pool.query('SELECT id FROM users WHERE clerk_id = $1', [clerkId]);
      if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

      const result = await pool.query(
        `UPDATE stories SET is_favorite = NOT is_favorite
         WHERE id = $1 AND user_id = $2 RETURNING *`,
        [storyId, userRes.rows[0].id]
      );

      if (result.rows.length === 0) return res.status(404).json({ error: 'Story not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/stories/:id
router.delete(
  '/:id',
  requireAuth,
  [param('id').isInt()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const clerkId = req.auth.userId;
    const storyId = parseInt(req.params.id);

    try {
      const userRes = await pool.query('SELECT id FROM users WHERE clerk_id = $1', [clerkId]);
      if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

      await pool.query(
        'DELETE FROM stories WHERE id = $1 AND user_id = $2',
        [storyId, userRes.rows[0].id]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/stories/refresh — refresh themes & features, costs 1 credit
router.post(
  '/refresh',
  requireAuth,
  [
    body('imageUrl').custom(isUrlOrPath).withMessage('Valid image URL required'),
    body('imageUrls').isArray({ min: 1 }).withMessage('At least one image URL required'),
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
        return res.status(402).json({ error: 'Insufficient credits. You need at least 1 credit to refresh.' });
      }

      const { imageUrl, imageUrls, childName, location } = req.body;

      // Run analysis and feature extraction in parallel
      const [themes, features] = await Promise.all([
        analyzeImageForThemes(imageUrl, childName || '', location || ''),
        extractChildFeatures(imageUrls, childName || 'the child')
      ]);

      // Deduct 1 credit
      await pool.query('UPDATE users SET credits = credits - 1 WHERE id = $1', [user.id]);

      res.json({ themes, features, credits: user.credits - 1 });
    } catch (err) {
      console.error('[POST /stories/refresh]', err);
      res.status(500).json({ error: 'Refresh failed' });
    }
  }
);

module.exports = router;
