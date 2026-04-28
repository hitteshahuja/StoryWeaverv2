# Project Structure

## Root
```
/
├── client/          # React frontend (Vite)
├── server/          # Node.js/Express backend
├── .env.example     # Server env template (copy to server/.env)
└── README.md
```

## Client (`client/src/`)
```
src/
├── components/      # Reusable UI components
├── context/         # React context providers
│   ├── UserContext.jsx     # Clerk → DB user sync, exposes useDbUser()
│   └── ThemeProvider.jsx
├── lib/
│   └── api.js       # Axios instance + all API call functions (grouped by domain)
├── pages/           # Route-level page components
├── config/          # Static config (fonts, legal)
├── utils/           # Helper functions (e.g. printHelpers)
└── test/
    └── setup.js     # Vitest global setup
```

### Key Client Conventions
- All API calls go through `src/lib/api.js` — never use raw `fetch` or a separate axios instance
- Auth token is attached automatically via the axios interceptor; never manually add `Authorization` headers
- `useDbUser()` hook provides the database user object (credits, subscription status, child profile)
- Pages live in `src/pages/`, shared UI in `src/components/`
- Tailwind for all styling — no CSS modules or styled-components

## Server (`server/`)
```
server/
├── routes/          # Express routers (users, books, stripe, upload)
├── middleware/
│   └── auth.js      # requireAuth — Clerk JWT guard, apply to all protected routes
├── services/        # External service wrappers
│   ├── openai.js    # GPT-4o-mini (vision/analysis/TTS)
│   ├── gemini.js    # Gemini text + image generation
│   ├── r2.js        # Cloudflare R2 storage
│   ├── redis.js     # Redis cache
│   ├── stripe.js    # Stripe helpers
│   ├── resend.js    # Email
│   ├── print.js     # PDF generation
│   └── localStorage.js  # Temp file handling
├── db/
│   ├── pool.js      # pg connection pool
│   ├── schema.sql   # Canonical DB schema
│   └── schema.ts    # Drizzle schema (TypeScript)
├── drizzle/         # Drizzle migration files + snapshots
├── config/
│   └── fonts.js     # Font configuration
├── scripts/         # One-off utility scripts
├── tests/           # Jest test files
└── index.js         # App entry point, middleware setup, route mounting
```

### Key Server Conventions
- CommonJS throughout (`require`/`module.exports`) — do not use ESM `import`
- All routes mounted under `/api/` prefix in `index.js`
- Apply `requireAuth` middleware to any route that needs a logged-in user
- Access `req.auth.userId` (Clerk ID) then look up the internal DB user via `clerk_id`
- All AI calls go through service files in `services/` — never call AI SDKs directly in routes
- Stripe webhook route skips JSON body parsing (raw body required for signature verification)
- Generated images/audio stored in Cloudflare R2, not local disk
- Temp uploads stored locally and cleaned up after AI processing

## Database Schema (PostgreSQL)
| Table | Purpose |
|---|---|
| `users` | Clerk-linked accounts, credits, subscription status, child profile, consent flags |
| `books` | Generated storybooks (metadata, style, cover image) |
| `book_pages` | Individual pages with text, AI image URL, audio URL |
| `stories` | Legacy story format (pre-book model) |
| `billing_history` | Stripe payment records |

- `users.clerk_id` is the join key between Clerk auth and the DB
- `books` and `book_pages` have a cascade delete relationship
- pgvector used on `books` for RAG-based "Similar Books" search
