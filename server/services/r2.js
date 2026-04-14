const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const BUCKET = process.env.R2_BUCKET_NAME;
const ENDPOINT = process.env.R2_ENDPOINT;

// Extract account ID from endpoint URL for public URL construction
// e.g. https://22d595225ccd23da7743a34f49477973.eu.r2.cloudflarestorage.com
const ACCOUNT_ID = ENDPOINT ? new URL(ENDPOINT).hostname.split('.')[0] : '';

const PUBLIC_BASE = process.env.R2_PUBLIC_URL
  || (ACCOUNT_ID ? `https://pub-${ACCOUNT_ID}.r2.dev` : '');

console.log(`[R2] Public URL base: ${PUBLIC_BASE}`);
console.log(`[R2] Using bucket: ${BUCKET}`);

const r2 = new S3Client({
  region: 'auto',
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload a buffer to R2 and return the public URL.
 * @param {Buffer} buffer
 * @param {string} key  — object key, e.g. "generated/abc.png" or "tts/123/abc.mp3"
 * @param {string} contentType
 * @returns {string} public URL
 */
async function uploadBuffer(buffer, key, contentType) {
  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return `${PUBLIC_BASE}/${key}`;
}

/**
 * Upload a base64 string (raw or data-URL) to R2.
 * Returns the public URL.
 */
async function uploadBase64(base64String, folder, filename) {
  let buffer;
  let contentType = 'application/octet-stream';

  if (base64String.startsWith('data:')) {
    const parts = base64String.split(',');
    buffer = Buffer.from(parts[1], 'base64');
    const mimeMatch = base64String.match(/data:([^;]+)/);
    if (mimeMatch) contentType = mimeMatch[1];
  } else {
    buffer = Buffer.from(base64String, 'base64');
  }

  // Detect content type from extension
  const ext = path.extname(filename).toLowerCase();
  const mimeMap = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.mp3': 'audio/mpeg',
  };
  if (mimeMap[ext]) contentType = mimeMap[ext];

  const key = `${folder}/${filename}`;
  return uploadBuffer(buffer, key, contentType);
}

/**
 * Fetch an object from R2 and return as a data URL (for AI vision APIs).
 */
async function objectToDataUrl(key) {
  try {
    const res = await r2.send(new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }));
    const chunks = [];
    for await (const chunk of res.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const contentType = res.ContentType || 'application/octet-stream';
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch (err) {
    console.error('[R2 GetObject Error]', err.message);
    return null;
  }
}

/**
 * Convert any URL to a data URL for AI vision APIs.
 * Handles: data: URLs, R2 public URLs, local server URLs, external URLs.
 */
async function urlToDataUrl(url) {
  if (!url || url.startsWith('data:')) return url;

  // R2 public URL — extract key and fetch from R2
  if (PUBLIC_BASE && url.startsWith(PUBLIC_BASE)) {
    const key = url.replace(PUBLIC_BASE + '/', '');
    return objectToDataUrl(key);
  }

  // Other external URL — fetch directly
  if (!url.includes('/uploads/') && url.startsWith('http')) {
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

  // Local server URL (legacy /uploads paths from before R2 migration)
  try {
    const baseUrl = process.env.API_URL || 'http://localhost:3001';
    const fullUrl = url.startsWith('/') ? `${baseUrl}${url}` : url;
    const res = await fetch(fullUrl);
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch (err) {
    console.error('[urlToDataUrl] Failed to fetch local URL:', err.message);
    return url;
  }
}

/**
 * Generate a presigned URL for temporary access (useful for private buckets).
 */
async function getPresignedUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(r2, command, { expiresIn });
}

module.exports = {
  uploadBuffer,
  uploadBase64,
  objectToDataUrl,
  urlToDataUrl,
  getPresignedUrl,
  PUBLIC_BASE,
  BUCKET,
};
