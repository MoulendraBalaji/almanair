# Architecture

Almanair is a Next.js App Router application with one optional server route. The design goal is that all meaningful computation, retrieval and persistence happen in the browser; the server exists only to keep a provider key secret and to forward one consented prompt.

## Runtime data flow

```text
Profile + reading (localStorage)
        ↓ zod validation
Pure plan builder → Today / Routine / Home Air Lab cards
        ↓
Plan digest + consent → POST /api/chat (only network call)
        ↓
Grounded prompt → free-tier provider → validated JSON → cited answer
        ↓ failure
Local BM25 index → cited fallback answer
```

The service worker caches the static app shell after first load. It explicitly ignores every `/api/` request and every cross-origin request.

## Layers

| Layer | Path | Rule |
|---|---|---|
| Configuration | `src/config/` | zod-validated limits and budgets from `app.json` |
| Data | `src/data/` | Named, sourced catalogues; the only branded-unit conversions live in `parse.ts` |
| Domain | `src/domain/` | Pure functions only; no React, browser, server or storage imports |
| Features | `src/features/` | Screen controllers and presentational components |
| UI primitives | `src/ui/` | Shared accessible controls and select helpers |
| Infrastructure | `src/infra/` | Browser storage, geolocation, chat client and PWA registration |
| Server | `src/server/` | Server-only prompt, provider and in-memory rate limit |
| Routes | `app/` | Next pages plus the single chat route |

`dependency-cruiser` enforces these boundaries. In particular, browser modules cannot import `src/server/`, domain modules cannot import anything outside domain/config/data/zod, and server modules can only import retrieval types and config plus their own scope.

## Client state

`src/features/app/AppProvider.tsx` is the single `'use client'` boundary for profile, plan, locale, online state and persistence. The first render is a loading state so server and client markup agree. Writes are debounced, size-limited and versioned in local storage.

## Server route

`app/api/chat/route.ts` validates the shared `chatRequestSchema`, applies a best-effort per-client limit, enforces a body-size cap, calls `src/server/provider.ts`, and returns a validated response with `cache-control: no-store`. The provider has no key when environment variables are absent, so the route fails closed and the client falls back locally.

`middleware.ts` adds a per-response CSP nonce, privacy headers, HSTS and permissions policy. It does not add third-party origins.

## Build-time generation

`scripts/build-index.mjs` flattens message catalogues, actions and knowledge cards into `src/data/generated/`. The generated BM25 index is bundled instead of being computed on first load. Run `npm run index` after editing those sources; `npm run verify` runs it automatically.

## Quality gates

`npm run verify` runs the index builder, TypeScript, ESLint, dependency-cruiser, knip, jscpd, Vitest, a production build and route JS budgets. `npm run test:coverage` enforces domain coverage thresholds. All commit-worthy changes must pass both.

## Decisions

See `docs/adr/` for the rationale behind on-device-first design, data/configuration separation, pure layers, explainable receipts, local retrieval with consented chat, the offline shell and the free-tier provider policy.
