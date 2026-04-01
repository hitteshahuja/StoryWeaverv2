const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const r2 = require('./r2');

// Temporary: user uploads (cleaned up after AI generation)
const TEMP_DIR = '/tmp/storyweaver';

// Ensure temp directory exists
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

ensureDir(TEMP_DIR);

/**
 * Creates multer storage that saves to /tmp/storyweaver/uploads/{clerkId}/
 */
function createUploadStorage() {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const clerkId = req.auth?.userId || 'anonymous';
      const safeId = clerkId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const dir = path.join(TEMP_DIR, 'uploads', safeId);
      ensureDir(dir);
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      const name = `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`;
      cb(null, name);
    },
  });
}

const upload = multer({
  storage: createUploadStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpg, png, webp, gif)'));
    }
  },
});

/**
 * Save a base64 string to persistent storage (R2) or temporary storage (/tmp).
 * - "generated" and "tts/*" → R2 (persistent)
 * - everything else → /tmp (temporary)
 *
 * Returns the URL path: R2 public URL for persistent, relative path for temp.
 */
async function saveBase64(base64String, folder, filename) {
  const isPersistent = folder === 'generated' || folder.startsWith('tts');

  if (isPersistent) {
    // Upload to R2
    return r2.uploadBase64(base64String, folder, filename);
  }

  // Save to local /tmp
  const dir = path.join(TEMP_DIR, folder);
  ensureDir(dir);

  let buffer;
  if (base64String.startsWith('data:')) {
    const parts = base64String.split(',');
    buffer = Buffer.from(parts[1], 'base64');
  } else {
    buffer = Buffer.from(base64String, 'base64');
  }

  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, buffer);
  return `/${folder}/${filename}`;
}

/**
 * Read a local file and return as a data URL (for AI vision APIs).
 */
function fileToDataUrl(relativePath) {
  const cleanPath = relativePath.replace(/^\//, '');
  const fullPath = path.join(TEMP_DIR, cleanPath);

  if (fs.existsSync(fullPath)) {
    const buffer = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const mimeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.mp3': 'audio/mpeg',
    };
    const mime = mimeMap[ext] || 'application/octet-stream';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  }

  return null;
}

/**
 * Convert any URL to a data URL for AI vision APIs.
 * Delegates to R2 service for R2 URLs, handles local temp files.
 */
async function urlToDataUrl(url) {
  if (!url || url.startsWith('data:')) return url;

  // R2 public URL — delegate to R2 service
  if (r2.PUBLIC_BASE && url.startsWith(r2.PUBLIC_BASE)) {
    return r2.urlToDataUrl(url);
  }

  // External URL
  if (url.startsWith('http') && !url.includes('/uploads/')) {
    try {
      const res = await fetch(url);
      const buffer = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      return `data:${contentType};base64,${buffer.toString('base64')}`;
    } catch (err) {
      console.error('[urlToDataUrl] Failed to fetch external URL:', err.message);
      return url;
    }
  }

  // Local temp file (user uploads from /tmp)
  if (url.includes('/uploads/')) {
    const urlObj = new URL(url, 'http://localhost');
    const dataUrl = fileToDataUrl(urlObj.pathname);
    if (dataUrl) return dataUrl;
  }

  return url;
}

function removeDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

function cleanupUserUploads(clerkId) {
  const safeId = clerkId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dir = path.join(TEMP_DIR, 'uploads', safeId);
  removeDir(dir);
  console.log(`[CLEANUP] Removed uploads for user ${safeId}`);
}

module.exports = {
  upload,
  saveBase64,
  fileToDataUrl,
  urlToDataUrl,
  cleanupUserUploads,
  removeDir,
  TEMP_DIR,
};
