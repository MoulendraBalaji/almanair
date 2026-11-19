# Almanair

Almanair is a bilingual, on-device-first winter-smog navigator for families and communities. It turns a manually entered air-quality reading into a plain-language daily plan: when to ventilate, which routine to soften, what one change would do, and where that number came from.

## What is included

- **Setup** — profile, household, mobility, language and accessibility preferences; saved locally.
- **Today** — standard-aware reading, hourly outdoor shape, indoor estimate and a ventilation suggestion.
- **Routine** — a deterministic day plan with usual and quieter activity schedules.
- **Home Air Lab** — sourced indoor mass-balance model, clean-air sizing and Impact Receipts.
- **Ask Pulse** — local BM25 answers from bundled knowledge cards, plus an optional consented AI answer.
- **Move** — lower-emission alternatives ranked from the plan's own Impact Receipts, with free-first filtering.
- **Community** — sourced playbooks, local pledges, scaled estimates, clean-air-room sizing and printable/shareable summaries.
- **Settings** — bilingual display preferences, standards and diurnal shapes, plus validated import, export and deletion on this device.
- **Offline PWA** — a hand-written service worker caches the static shell after first load and never caches `/api/*`.
- **English and Spanish** — key-identical message catalogues and a build-time retrieval index.

The Learn route is still a staged placeholder for the P2 field library.

## Privacy model

Almanair is designed so that the browser does the work:

- No live AQI feed, geocoding service, map provider, analytics, error tracker or third-party script.
- The profile and reading are persisted in the browser's local storage.
- "Nearest region" uses optional device geolocation and local arithmetic only; no coordinates leave the device.
- The browser's only network call is `POST /api/chat`, and it happens only after explicit consent.
- The chat route sends a bounded prompt and plan digest to one server-configured provider; it never receives storage keys or browser analytics.
- The provider key is server-side only. Never use a `NEXT_PUBLIC_*` name for it.
- On any provider failure, timeout, rate limit or invalid response, Ask Pulse falls back to local BM25. No paid model is used automatically.

See `docs/llm-free-tier-research.md` for current provider limits and the no-paid-fallback policy.

## How the model stays honest

- Numbers live in `src/config/app.json` or named records under `src/data/`, with units, sources and confidence where appropriate.
- User-facing copy lives in `src/content/messages/<locale>.json`; both locales keep the same keys.
- Design values live in `styles/tokens.css`; components use CSS Modules.
- `zod` validates configuration and catalogues at boot; invalid data fails fast.
- `src/domain/` is pure and cannot import UI, server, browser or persistence code.
- Branded-unit conversions are confined to `src/data/parse.ts`; no `any`, non-null assertions or casts appear elsewhere in application code.
- `docs/data-sources.md` records the high-confidence anchors and the explicitly low-confidence or unverifiable assumptions.
- `docs/model.md` explains every formula and its limits. Almanair gives estimates, not medical advice or guaranteed health outcomes.

After changing a message catalogue, action catalogue or knowledge card, run `npm run index` to regenerate `src/data/generated/`.

## Repository layout

```text
app/                 Next App Router pages, shell layout and /api/chat
src/domain/          Pure AQI, exposure, indoor, emissions, plan and retrieval engines
src/data/            Validated catalogues and the only branded-unit parser
src/config/          zod-validated limits, budgets and timeouts
src/features/        Screen controllers and components
src/infra/           Browser persistence, geolocation, chat client and PWA registration
src/server/          Server-only prompt, provider and rate-limit modules
src/ui/              Shared accessible primitives
styles/              Design tokens and global styles
public/              Manifest, icon and hand-written service worker
content/             Message catalogues (see src/content)
tests/               Node and jsdom tests
docs/                Model, data sources, ADRs and provider research
scripts/             Index builder and budget checker
```

## Getting started

Requirements: Node.js 22 or newer.

```bash
npm ci
cp .env.example .env.local   # optional: enables the remote chat provider
npm run dev
```

Open `http://localhost:3000`. Without provider variables the app still works fully; Ask Pulse uses local answers.

To enable the optional remote answer:

```bash
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_API_KEY=your-server-side-key
LLM_MODEL=openai/gpt-oss-20b
```

Keep these values out of browser bundles and client-side code.

## Quality gates

```bash
npm run verify          # index, typecheck, lint, dependency rules, knip, jscpd, tests, build, budgets
npm run test:coverage   # domain coverage report with thresholds
npm run format          # apply Prettier formatting
```

`npm run verify` is the gate used before every commit in this project.

## Deployment

The project targets Vercel with the default Next.js build:

- Set `LLM_BASE_URL`, `LLM_API_KEY` and `LLM_MODEL` as server-side environment variables only.
- Leave analytics and third-party script integrations disabled.
- Confirm the free-tier limits in the provider console before launch; the in-memory rate limit is best-effort across serverless instances.
- Re-run the provider checks in `docs/llm-free-tier-research.md` at launch and monthly.

 No secrets, prompt bodies or response bodies are written to logs by Almanair code.

## Documentation

- `docs/model.md` — formulas, terms, envelopes and limitations.
- `docs/data-sources.md` — source ledger, high-confidence anchors and low-confidence register.
- `docs/architecture.md` — layers, boundaries and runtime data flow.
- `docs/adr/` — architecture decision records.
- `docs/llm-free-tier-research.md` — provider comparison and deployment constraints.

## Roadmap

1. **P0 (done):** Setup, Today, Routine, Home Air Lab, Ask Pulse, PWA shell and chat route.
2. **P1 (done):** Move, Community, Settings, local print/share actions and sourced P1 domain engines.
3. **P2 (next):** Learn cards, expanded print/share, accessibility audit and Lighthouse verification.
