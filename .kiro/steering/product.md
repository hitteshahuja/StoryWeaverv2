# DreamWeaver — Product Overview

AI-powered personalised bedtime story generator for children. Parents upload a photo, configure a child profile, and receive a fully illustrated, family-safe storybook in seconds.

## Core User Flow
1. Sign up / log in via Clerk (Google or Facebook OAuth)
2. Complete initial setup (child name, age, parental consent)
3. Upload a photo → AI extracts character features
4. Configure story options (theme, location, art style, font, page count)
5. AI generates illustrated storybook (text + images per page)
6. Read in-app, listen via TTS, or print/export as PDF

## Monetisation
- **Free tier**: 3 credits on signup
- **Subscription**: $9.99/month → 15 credits/month (Stripe)
- **Top-up**: $3.00 one-time → 5 credits (Stripe)
- Each story generation costs 1 credit

## Key Capabilities
- Multi-provider AI orchestration via Portkey (Gemini, GPT-4o-mini)
- Per-page AI illustrations with selectable art styles
- Text-to-speech audio per page (OpenAI TTS `ballad` voice)
- "Similar Books" discovery via pgvector RAG embeddings
- Story library with favourites, pagination
- Strict family-safe content moderation on all AI outputs
- All user data (photos, stories) is private per account
