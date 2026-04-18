require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const usersRouter = require('./routes/users');
const stripeRouter = require('./routes/stripe');
const uploadRouter = require('./routes/upload');
const booksRouter = require('./routes/books');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Security Headers ─────────────────────────────────────────
const r2Domain = process.env.R2_PUBLIC_URL
  ? new URL(process.env.R2_PUBLIC_URL).hostname
  : '*.r2.dev';

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "blob:", r2Domain, "*.r2.dev", "https://*.clerk.com", "https://*.stripe.com"],
      "connect-src": ["'self'", "https://*.clerk.com", "https://*.stripe.com", "https://generativelanguage.googleapis.com", "*.portkey.ai"],
    },
  },
}));
// ─── CORS ─────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// ─── Logging ──────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Stripe Webhook Test Route ─────────────────────────────────
app.get('/api/stripe/test-webhook', (req, res) => {
  res.json({ message: 'Webhook endpoint is reachable' });
});

// ─── JSON Body Parser (Skip for Stripe Webhook) ────────────────
const skipJsonParsing = (url) =>
  url.startsWith('/api/stripe/webhook') ||
  url.startsWith('/api/stripe/test-') ||
  url.startsWith('/api/users/clerk/webhooks');

app.use((req, res, next) => {
  if (req.originalUrl.includes('stripe')) {
    console.log(`[REQUEST] ${req.method} ${req.originalUrl} - skipping parsing: ${skipJsonParsing(req.originalUrl)}`);
  }
  if (skipJsonParsing(req.originalUrl)) {
    next();
  } else {
    express.json({ limit: '10mb' })(req, res, next);
  }
});
app.use((req, res, next) => {
  if (skipJsonParsing(req.originalUrl)) {
    next();
  } else {
    express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
  }
});

// ─── Rate Limiting ────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 200 : 10000, // Much higher limit for local dev
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/users/sync' || req.path === '/users/me',
  message: { error: 'Too many requests, please try again later.' },
});

// Tighter limit for story generation (expensive AI call)
const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { error: 'Too many story generation requests. Please try again in an hour.' },
});

app.use('/api/', limiter);
app.use('/api/stories/generate', generateLimiter);
app.use('/api/books/generate', generateLimiter);

// ─── Routes ───────────────────────────────────────────────────
app.use('/api/users', usersRouter);
app.use('/api/stripe', stripeRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/books', booksRouter);

// ─── Serve static files ──────────────────────────────────────
const { TEMP_DIR } = require('./services/localStorage');

// User uploads only (temporary — cleaned up after AI generation)
// AI-generated images and TTS audio are served from Cloudflare R2
app.use('/uploads', express.static(path.join(TEMP_DIR, 'uploads')));

// ─── Health Check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// ─── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Global Error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start Server ─────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🌙 DreamWeaver API running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health\n`);
  });
}

module.exports = app;
