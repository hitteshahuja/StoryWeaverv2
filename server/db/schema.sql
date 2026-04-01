-- DreamWeaver PostgreSQL Schema

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT,
  credits INTEGER DEFAULT 3,
  subscription_status BOOLEAN DEFAULT FALSE,
  stripe_customer_id TEXT,
  child_name TEXT,
  child_age INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  image_url TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_intent TEXT,
  amount INTEGER,
  type TEXT CHECK (type IN ('subscription', 'topup', 'trial')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  protagonist_name TEXT,
  theme TEXT,
  location TEXT,
  style TEXT,
  style_filter TEXT,
  border_style TEXT,
  page_count INTEGER DEFAULT 10,
  cover_image_url TEXT,
  dedicated_by TEXT DEFAULT 'Mummy and Daddy',
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS book_pages (
  id SERIAL PRIMARY KEY,
  book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  image_url TEXT,
  ai_image_url TEXT,
  audio_url TEXT,
  content TEXT,
  type TEXT CHECK (type IN ('title', 'story', 'conclusion')),
  dedication TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_user_id ON billing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_books_user_id ON books(user_id);
CREATE INDEX IF NOT EXISTS idx_book_pages_book_id ON book_pages(book_id);

-- Migration: add ai_image_url to book_pages (run if column doesn't exist)
ALTER TABLE book_pages ADD COLUMN IF NOT EXISTS ai_image_url TEXT;

-- Migration: add cover_image_url to books (run if column doesn't exist)
ALTER TABLE books ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Migration: add audio_url to book_pages (run if column doesn't exist)
ALTER TABLE book_pages ADD COLUMN IF NOT EXISTS audio_url TEXT;
