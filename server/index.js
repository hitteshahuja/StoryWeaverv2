require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const usersRouter = require('./routes/users');
const storiesRouter = require('./routes/stories');
const stripeRouter = require('./routes/stripe');
const uploadRouter = require('./routes/upload');
const booksRouter = require('./routes/books');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Security Headers ─────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
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

// ─── Stripe webhook MUST use raw body — register BEFORE json() ─
app.use('/api/stripe/webhook', require('./routes/stripe'));

// ─── JSON Body Parser ─────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Rate Limiting ────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
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
app.use('/api/stories', storiesRouter);
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
app.listen(PORT, () => {
  console.log(`\n🌙 DreamWeaver API running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
