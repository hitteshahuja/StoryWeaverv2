# Tech Stack

## Frontend (client/)
- **Framework**: React 19 + Vite 8
- **Styling**: Tailwind CSS 3
- **Routing**: React Router v7
- **Auth**: Clerk (`@clerk/clerk-react`)
- **HTTP**: Axios with Clerk JWT interceptor (`src/lib/api.js`)
- **Animations**: Framer Motion
- **UI**: Headless UI, Lucide React icons, DnD Kit (drag-and-drop)
- **PDF/Print**: jsPDF + html2canvas
- **Sanitisation**: DOMPurify (client-side XSS protection)
- **Testing**: Vitest + Testing Library + jsdom

## Backend (server/)
- **Runtime**: Node.js (CommonJS — `require`/`module.exports`)
- **Framework**: Express 5
- **Auth**: Clerk JWT via `@clerk/clerk-sdk-node` (`requireAuth` middleware)
- **Database**: PostgreSQL (Neon serverless) via `pg` pool + Drizzle ORM
- **Migrations**: Drizzle Kit (`server/drizzle/`)
- **AI**: Portkey orchestration → Gemini 2.5 Flash Lite (text), Gemini image models (illustrations), GPT-4o-mini (vision/analysis)
- **Storage**: Cloudflare R2 (`@aws-sdk/client-s3`) for generated images/audio
- **Payments**: Stripe (subscriptions + one-time top-ups)
- **Email**: Resend
- **Cache**: Redis
- **Rate Limiting**: `express-rate-limit` (100 req/15min general, 20/hr generation)
- **Security**: Helmet, express-validator
- **Testing**: Jest + Supertest

## Environment
- Server env: `server/.env` (copy from `.env.example`)
- Client env: `client/.env` (copy from `client/.env.example`)
- Key vars: `CLERK_SECRET_KEY`, `PORTKEY_API_KEY`, `DATABASE_URL`, `STRIPE_SECRET_KEY`, `R2_*`, `REDIS_URL`

## Common Commands

### Client
```bash
cd client
npm run dev        # Dev server → http://localhost:5173
npm run build      # Production build
npm run lint       # ESLint
npm run test       # Vitest (watch mode)
```

### Server
```bash
cd server
npm run dev        # nodemon dev server → http://localhost:3001
npm start          # Production start
npm test           # Jest test suite
```

### Database
```bash
# Initial setup
psql dreamweaver -f server/db/schema.sql

# Drizzle migrations
cd server
npx drizzle-kit generate   # Generate migration
npx drizzle-kit migrate    # Apply migrations
```

### Stripe (local webhooks)
```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```
