const { createClient } = require('redis');
const pool = require('../db/pool');

async function main() {
  const host = process.env.REDIS_HOST;
  const port = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 443;
  const password = process.env.REDIS_PASSWORD;

  console.log('[Redis Cache Warmup] Connecting to Redis...');
  console.log('[Redis] Config:', { host, port, hasPassword: !!password, username: process.env.REDIS_USERNAME });

  if (!host) {
    console.error('[Redis Cache Warmup] REDIS_HOST not configured');
    process.exit(1);
  }

  const isTls = port === 443 || process.env.REDIS_TLS === 'true';
  
  const client = createClient({
    username: process.env.REDIS_USERNAME || 'default',
    password: password || undefined,
    socket: {
      host,
      port,
      tls: isTls ? {} : undefined,
    }
  });

  client.on('error', err => console.error('[Redis] Client Error:', err.message));

  try {
    await client.connect();
    console.log('[Redis] Connected successfully\n');
  } catch (err) {
    console.error('[Redis] Connection failed:', err.message);
    process.exit(1);
  }

  // Fetch all books
  console.log('[Cache Warmup] Fetching all books from database...');
  const booksRes = await pool.query('SELECT id, user_id, title, protagonist_name, theme, location, is_favorite, created_at, style, border_style, page_count, style_filter, dedicated_by, cover_image_url, font, embedding FROM books ORDER BY id');
  const books = booksRes.rows;
  console.log(`[Cache Warmup] Found ${books.length} books\n`);

  let cached = 0;
  let errors = 0;

  for (const book of books) {
    try {
      // Fetch pages for this book
      const pagesRes = await pool.query(
        'SELECT id, book_id, page_number, image_url, content, type, created_at, ai_image_url, dedication, audio_url, image_prompt FROM book_pages WHERE book_id = $1 ORDER BY page_number ASC',
        [book.id]
      );

      const bookData = {
        ...book,
        pages: pagesRes.rows
      };

      // Cache for 24 hours (longer TTL for warmup)
      await client.setEx(`book:${book.id}`, 86400, JSON.stringify(bookData));
      cached++;
      
      if (cached % 10 === 0) {
        console.log(`[Cache Warmup] Cached ${cached}/${books.length} books...`);
      }
    } catch (err) {
      errors++;
      console.error(`[Cache Warmup] Error caching book ${book.id}:`, err.message);
    }
  }

  console.log(`\n[Cache Warmup] Complete!`);
  console.log(`  - Cached: ${cached} books`);
  console.log(`  - Errors: ${errors}`);

  await client.quit();
  await pool.end();
  process.exit(errors > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('[Cache Warmup] Fatal error:', err);
  process.exit(1);
});
