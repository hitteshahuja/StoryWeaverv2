---
inclusion: always
---

# DreamWeaver Guardrails

## Critical Security & Safety Rules

### Content Moderation
- **NEVER** bypass or disable content moderation checks on AI-generated text or images
- All story content MUST pass family-safe validation before being saved or displayed
- User-uploaded photos MUST be validated for appropriateness before AI processing
- If moderation fails, return clear error messages without exposing moderation details

### Authentication & Authorization
- **NEVER** expose Clerk secret keys or JWT tokens in client code
- All protected routes MUST use `requireAuth` middleware — no exceptions
- Always look up users via `clerk_id` from `req.auth.userId`, never trust client-provided user IDs
- Stripe webhook routes MUST verify signature before processing events

### Data Privacy
- User data (photos, stories, child profiles) is private per account — enforce user ownership checks
- **NEVER** expose one user's data to another user
- Clean up temporary uploaded files after AI processing completes
- Do not log sensitive data (tokens, API keys, personal info)

### API Keys & Secrets
- **NEVER** commit `.env` files or expose API keys in code
- All external service calls (Portkey, Stripe, R2, Redis) MUST use environment variables
- Client-side code MUST NOT contain server API keys

## Architecture Patterns

### Client-Server Communication
- All API calls MUST go through `client/src/lib/api.js` — never use raw `fetch` or separate axios instances
- Auth tokens are attached automatically via axios interceptor — never manually add `Authorization` headers
- API responses should follow `{ data, error }` pattern for consistency
- Handle loading and error states in UI components

### Server Module System
- Server uses CommonJS (`require`/`module.exports`) — **NEVER** use ESM `import` syntax
- All routes mount under `/api/` prefix in `index.js`
- External service integrations live in `services/` — never call AI SDKs directly in route handlers

### Database Access
- Use Drizzle ORM for all database queries — avoid raw SQL except for migrations
- `users.clerk_id` is the join key between Clerk auth and DB records
- Always use parameterized queries to prevent SQL injection
- Cascade deletes are configured for `books` → `book_pages` relationship

### AI Service Integration
- All AI calls MUST go through Portkey orchestration (configured in service files)
- Gemini 2.5 Flash Lite for story text generation
- Gemini image models for illustrations
- GPT-4o-mini for vision analysis and TTS
- Always handle AI service failures gracefully with user-friendly error messages

## Code Style & Conventions

### Frontend (React)
- Use functional components with hooks — no class components
- `useDbUser()` hook provides database user object (credits, subscription, child profile)
- Tailwind CSS for all styling — no CSS modules or styled-components
- Component files in `src/components/`, page files in `src/pages/`
- Use Lucide React for icons, Framer Motion for animations

### Backend (Express)
- Route handlers should be thin — delegate business logic to service functions
- Use `express-validator` for input validation on all user-facing endpoints
- Apply rate limiting to expensive operations (AI generation, uploads)
- Stripe webhook route skips JSON body parsing (requires raw body for signature verification)

### Error Handling
- Always catch and handle errors in async functions
- Return structured error responses: `{ error: 'Error type', message: 'User-friendly message' }`
- Log errors with context for debugging, but don't expose stack traces to clients
- Use try-catch blocks around external service calls (AI, Stripe, R2, Redis)

### Testing
- Client tests use Vitest + Testing Library + jsdom
- Server tests use Jest + Supertest
- Mock external services (AI, Stripe, R2) in tests
- Test authentication flows with mocked Clerk tokens

## Resource Management

### Credits & Billing
- Each story generation costs 1 credit — enforce this consistently
- Check user credit balance BEFORE starting expensive AI operations
- Free tier: 3 credits on signup
- Subscription: 15 credits/month ($9.99)
- Top-up: 5 credits ($3.00 one-time)

### Storage
- Generated images and audio stored in Cloudflare R2, not local disk
- Temporary uploads stored locally in `TEMP_DIR` and cleaned up after processing
- Use R2 presigned URLs for secure access to generated content

### Rate Limiting
- General API: 100 requests per 15 minutes (200 in production)
- Story generation: 20 requests per hour (expensive AI operations)
- Skip rate limiting for health checks and user sync endpoints

## Common Pitfalls to Avoid

- **DON'T** use `import` syntax in server code (CommonJS only)
- **DON'T** create separate axios instances in client code (use `api.js`)
- **DON'T** manually add `Authorization` headers (interceptor handles this)
- **DON'T** call AI SDKs directly in routes (use service layer)
- **DON'T** store generated images locally (use R2)
- **DON'T** skip content moderation checks
- **DON'T** expose internal error details to users
- **DON'T** trust client-provided user IDs (always verify via Clerk)
- **DON'T** forget to clean up temporary files after processing
- **DON'T** bypass rate limiting on expensive operations