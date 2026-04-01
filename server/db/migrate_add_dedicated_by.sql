-- Migration: Add dedicated_by and missing columns
-- Run this against your database to add the new columns

ALTER TABLE books ADD COLUMN IF NOT EXISTS style_filter TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS border_style TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS page_count INTEGER DEFAULT 10;
ALTER TABLE books ADD COLUMN IF NOT EXISTS dedicated_by TEXT DEFAULT 'Mummy and Daddy';

ALTER TABLE book_pages ADD COLUMN IF NOT EXISTS dedication TEXT;
