const express = require('express');
const router = express.Router();
const path = require('path');
const { upload } = require('../services/localStorage');
const { requireAuth } = require('../middleware/auth');

// POST /api/upload — save image locally, returns relative serving URL
router.post('/', requireAuth, (req, res) => {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      const message =
        err.message === 'File too large'
          ? 'Image must be under 5MB'
          : err.message || 'Upload failed';
      return res.status(400).json({ error: message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Build the relative serving URL: /uploads/{clerkId}/{filename}
    const clerkId = req.auth.userId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = path.basename(req.file.filename);

    res.json({
      url: `/uploads/${clerkId}/${filename}`,
      filename,
    });
  });
});

module.exports = router;
