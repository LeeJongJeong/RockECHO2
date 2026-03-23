# RockECHO

RockECHO is a Hono + Cloudflare Pages/D1 application for capturing DB incidents, generating AI-assisted knowledge drafts, routing them through review, and making them searchable later.

## Architecture

- Backend: Hono routes on Cloudflare Pages Functions / Workers
- Database: Cloudflare D1 (SQLite)
- Frontend: Vanilla JS SPA served from `public/static`
- AI pipeline: OpenAI-compatible client with rule-based fallback

## Current Structure

- `src/index.tsx`: HTML shell and route registration
- `src/routes`: thin HTTP routes only
- `src/services`: application logic and status transitions
- `src/repositories`: D1 access layer
- `src/ai`: prompt building, client, fallback, sanitization, pattern detection
- `public/static/app`: modular frontend entry, router, state, components, and page modules

## Key Flows

The current baseline flows are documented in [`docs/baseline-flows.md`](./docs/baseline-flows.md).

## Development

```bash
npm install
npm run db:migrate:local
npm run typecheck
npm run build
```

To run locally with Wrangler and PM2:

```bash
npm run build
pm2 start ecosystem.config.cjs
```

## Environment

Use `.dev.vars` or environment variables for secrets.

```dotenv
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://api.openai.com/v1
DEV_DIAGNOSTICS=false
```

`GET /api/health` returns only non-sensitive application metadata.
`GET /api/health/ai-test` is gated behind `DEV_DIAGNOSTICS=true`.

## API Surface

Stable routes retained by the refactor:

- `/api/incidents`
- `/api/knowledge`
- `/api/search`
- `/api/dashboard`
- `/api/ai`
- `/api/users`

## Verification Target

The refactor is complete when the following pass:

- `npm run typecheck`
- `npm run build`
- manual smoke checks for dashboard, search, detail, quick input, reviewer, and zero-result recovery