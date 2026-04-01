# 🌙 DreamWeaver

AI-powered bedtime story generator for children. Upload a photo → get a personalised, family-safe bedtime story in seconds.

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS 3 + Clerk Auth
- **Backend**: Node.js + Express + PostgreSQL
- **AI**: OpenAI GPT-4o-mini (story generation + vision + moderation)
- **Payments**: Stripe (subscriptions + one-time top-ups)
- **Storage**: Cloudinary (image uploads)

## Quick Start

### 1. Clone & Install

```bash
# Install dependencies
cd client && npm install
cd ../server && npm install
```

### 2. Set Up Environment Variables

```bash
# Root config for server
cp .env.example server/.env

# Client config
cp client/.env.example client/.env
```

Fill in your real API keys in `server/.env` and `client/.env`.

### 3. Set Up PostgreSQL

```bash
# Create the database
createdb dreamweaver

# Run the schema
psql dreamweaver -f server/db/schema.sql
```

### 4. Set Up Stripe Products (in Stripe Dashboard)

1. Create a **Subscription** product: $9.99/month → copy Price ID to `STRIPE_SUBSCRIPTION_PRICE_ID`
2. Create a **One-time** product: $3.00 → copy Price ID to `STRIPE_TOPUP_PRICE_ID`

### 5. Run the App

**Terminal 1 — Backend:**
```bash
cd server && npm run dev
# Runs on http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd client && npm run dev
# Runs on http://localhost:5173
```

**Terminal 3 — Stripe Webhooks (optional, for local Stripe testing):**
```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
# Copy the webhook signing secret to server/.env STRIPE_WEBHOOK_SECRET
```

## Key Features
- 🔐 Google/Facebook OAuth via Clerk
- 📸 Photo upload → AI bedtime story (GPT-4o-mini)
- 🛡️ Strict family-safe system prompt + OpenAI moderation check
- 🌙 Night Mode UI
- 📚 Story Library with favourites
- 💳 Stripe: $9.99/mo subscription (15 credits) + $3 top-up (5 credits)
- 🔊 Text-to-Speech (Web Speech API)
- 🔒 All photos & stories private to the user's account

## Security
- All secrets in `.env` (never committed)
- Clerk JWT on every protected API endpoint
- `helmet` security headers
- Rate limiting (100 req/15min general, 20/hr for story generation)
- Input sanitisation: `express-validator` (server) + `DOMPurify` (client)
- Stripe webhook signature verification
- User stories filtered by `user_id` — no cross-account access

## Project Structure

```
StoryWeaverv2/
├── client/
│   ├── src/
│   │   ├── components/   # Navbar, PhotoUpload, StoryDisplay, CreditModal, StarField
│   │   ├── context/      # UserContext (Clerk → DB sync)
│   │   ├── lib/          # api.js (axios client)
│   │   └── pages/        # Landing, App, Library, Dashboard, Pricing
│   └── ...
└── server/
    ├── db/               # pool.js, schema.sql
    ├── middleware/        # auth.js (Clerk JWT)
    ├── routes/            # users, stories, stripe, upload
    ├── services/          # openai.js, cloudinary.js
    └── index.js
```
