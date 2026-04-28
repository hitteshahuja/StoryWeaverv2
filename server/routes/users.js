const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { verifyWebhook } = require('@clerk/express/webhooks');
const { sendEmail } = require('../services/resend');
const { handlePrint } = require('../services/print');
// GET /api/users/me — get current user's profile + credits
router.get('/me', requireAuth, async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    const result = await pool.query('SELECT * FROM users WHERE clerk_id = $1', [clerkId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[GET /users/me]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users/sync — called by frontend after Clerk sign-in to provision user
router.post(
  '/sync',
  requireAuth,
  [
    body('email').isEmail().normalizeEmail().optional(),
    body('name').isLength({ max: 200 }).trim().escape().optional(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const clerkId = req.auth.userId;
    const { email, name } = req.body;

    try {
      // Upsert: create user if not exists, return existing if they do
      const result = await pool.query(
        `INSERT INTO users (clerk_id, email, name, credits)
         VALUES ($1, $2, $3, 3)
         ON CONFLICT (clerk_id) DO UPDATE
           SET email = COALESCE(EXCLUDED.email, users.email),
               name  = COALESCE(EXCLUDED.name, users.name)
         RETURNING *`,
        [clerkId, email || null, name || null]
      );

      // Log the welcome credits as billing history (only on first insert)
      if (result.rows[0].credits === 3) {
        await pool.query(
          `INSERT INTO billing_history (user_id, amount, type, description)
           VALUES ($1, 0, 'trial', '3 Welcome Credits')
           ON CONFLICT DO NOTHING`,
          [result.rows[0].id]
        );
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error('[POST /users/sync]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/users/billing — get billing history
router.get('/billing', requireAuth, async (req, res) => {
  try {
    const clerkId = req.auth.userId;
    const userRes = await pool.query('SELECT id FROM users WHERE clerk_id = $1', [clerkId]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const result = await pool.query(
      'SELECT * FROM billing_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userRes.rows[0].id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[GET /users/billing]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/profile - update user profile (e.g. child name and age)
router.put(
  '/profile',
  requireAuth,
  [
    body('child_name').isString().trim().escape().optional(),
    body('child_age').isInt({ min: 1, max: 18 }).optional(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const clerkId = req.auth.userId;
    const { child_name, child_age } = req.body;

    try {
      const result = await pool.query(
        `UPDATE users
         SET child_name = COALESCE($2, child_name),
             child_age = COALESCE($3, child_age)
         WHERE clerk_id = $1
         RETURNING *`,
        [clerkId, child_name, child_age]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error('[PUT /users/profile]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/users/consent — save parental consent
router.post(
  '/consent',
  requireAuth,
  [
    body('is_adult_confirmed').isBoolean().withMessage('Adult confirmation required'),
    body('consent_image_processing').isBoolean().withMessage('Image consent required'),
    body('consent_privacy_policy').isBoolean().withMessage('Privacy policy consent required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const clerkId = req.auth.userId;
    const { is_adult_confirmed, consent_image_processing, consent_voice_cloning, consent_privacy_policy } = req.body;

    if (!is_adult_confirmed || !consent_image_processing || !consent_privacy_policy) {
      return res.status(400).json({ error: 'All mandatory consents must be provided' });
    }

    try {
      // Ensure user exists first (in case sync didn't happen)
      let userResult = await pool.query('SELECT id FROM users WHERE clerk_id = $1', [clerkId]);
      if (userResult.rows.length === 0) {
        userResult = await pool.query(
          'INSERT INTO users (clerk_id, credits) VALUES ($1, 3) RETURNING id',
          [clerkId]
        );
      }

      const result = await pool.query(
        `UPDATE users
         SET consent_given = TRUE,
             consent_image = $2,
             consent_voice = $3,
             consent_privacy = $4,
             consent_timestamp = NOW()
         WHERE clerk_id = $1
         RETURNING *`,
        [clerkId, consent_image_processing, consent_voice_cloning || false, consent_privacy_policy]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error('[POST /users/consent]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
// POST /api/users/purchase-font — buy a premium font for 1 credit (permanent unlock)
router.post(
  '/purchase-font',
  requireAuth,
  [body('fontId').isString().trim().notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const clerkId = req.auth.userId;
    const { fontId } = req.body;

    const { FONTS } = require('../config/fonts');
    const font = FONTS.find(f => f.id === fontId);
    if (!font) return res.status(400).json({ error: 'Unknown font' });
    if (!font.premium) return res.status(400).json({ error: 'Font is already free' });

    try {
      const userRes = await pool.query('SELECT * FROM users WHERE clerk_id = $1', [clerkId]);
      if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      const user = userRes.rows[0];

      // Already owns it — return success without charging
      const owned = (user.purchased_fonts || '').split(',').filter(Boolean);
      if (owned.includes(fontId)) return res.json({ purchased_fonts: user.purchased_fonts });

      if (user.credits < 1) return res.status(402).json({ error: 'Insufficient credits' });

      const newFonts = [...owned, fontId].join(',');
      const result = await pool.query(
        `UPDATE users SET credits = credits - 1, purchased_fonts = $2 WHERE clerk_id = $1 RETURNING *`,
        [clerkId, newFonts]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error('[POST /users/purchase-font]', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Implement clerk webhooks endpoint.
router.post('/clerk/webhooks', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const evt = await verifyWebhook(req);
    // REMOVE 'await' here. wh.verify is synchronous.
    //const evt = wh.verify(payload, svixHeaders);

    const { id } = evt.data;
    const eventType = evt.type;

    console.log(`Verified event ${eventType} for user ${id}`);
    // Handle GDPR Deletion
    if (eventType === 'user.deleted') {
      // 1. Get user email from your DB first!
      /* const user = await pool.query('SELECT email FROM users WHERE clerk_id = $1', [id]);
      const books = await pool.query('SELECT * FROM books WHERE user_id = $1', [user.rows[0].id]);
      for (const book of books.rows) {
        const pdf = handlePrint(book);
        zip.file(`${book.title.replace(/\s+/g, '_')}.pdf`, pdf);
      }
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
      const attachment = {
        filename: `${book.title.replace(/\s+/g, '_')}.zip`,
        content: zipBuffer,
        contentType: 'application/zip',
      };
      await sendEmail(user.rows[0].email, 'Your account has been deleted',
        'Your account has been deleted', [attachment]);
      console.log('Email sent to user'); */
      // 2. Trigger your zip/email background task
      if (user.rows.length > 0) {

        // 3. Delete user from your DB
      }
    }

    return res.status(200).send('Webhook received');

  } catch (err) {
    console.error('Svix Verification Error:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }
});

module.exports = router;
