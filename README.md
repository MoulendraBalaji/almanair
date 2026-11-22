# Almanair

[![CI](https://github.com/MoulendraBalaji/almanair/actions/workflows/ci.yml/badge.svg)](https://github.com/MoulendraBalaji/almanair/actions/workflows/ci.yml)

Almanair is a trilingual (English, Spanish and Hindi), on-device-first winter-smog navigator for families and communities. It turns a manually entered air-quality reading into a plain-language daily plan: when to ventilate, which routine to soften, what one change would do, and where that number came from.

## What is included

- **Setup** — profile, household, mobility, language and accessibility preferences; saved locally.
- **Today** — standard-aware reading, hourly outdoor shape, indoor estimate and a ventilation suggestion.
- **Routine** — a deterministic day plan with usual and quieter activity schedules.
- **Home Air Lab** — sourced indoor mass-balance model, clean-air sizing and Impact Receipts.
- **Ask Pulse** — local BM25 answers from bundled knowledge cards, plus an optional consented AI answer.
- **Move** — lower-emission alternatives ranked from the plan's own Impact Receipts, with free-first filtering.
- **Community** — sourced playbooks, local pledges, scaled estimates, clean-air-room sizing and printable/shareable summaries.
- **Learn** — a searchable, cited field library using the same local BM25 index as Ask Pulse.
- **Settings** — multilingual display preferences, standards and diurnal shapes, plus validated import, export and deletion on this device.
- **Offline PWA** — a hand-written service worker caches the static shell after first load and never caches `/api/*`.
- **English, Spanish and Hindi** — key-identical message catalogues and a build-time retrieval index.

Today includes an expanded local share panel: copy the private Plan Digest, copy a cited summary, or print the plan. No file or network call is involved.

## Contents

- [What is included](#what-is-included)
- [Privacy model](#privacy-model)
- [How the model stays honest](#how-the-model-stays-honest)
- [Regions and standards](#regions-and-standards)
- [Fonts](#fonts)
- [Code map](#code-map)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Continuous integration](#continuous-integration)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)
- [Roadmap](#roadmap)

## Privacy model

Almanair is designed so that the browser does the work:

- No live AQI feed, geocoding service, map provider, analytics, error tracker or third-party script.
- The profile and reading are persisted in the browser's local storage.
- "Nearest region" uses optional device geolocation and local arithmetic only; no coordinates leave the device.
- The browser's only network call is `POST /api/chat`, and it happens only after explicit consent.
- If a chat key is configured, the route sends a bounded prompt and plan digest to Google Gemini. Google may use submitted content to improve products and its default logging retains it for up to 55 days. Gemini's free terms restrict user-facing consumer use and availability in the EEA, Switzerland and the UK; use local answers where those terms apply. The current deployment has **no chat provider key**, so answers stay local until an operator rotates a fresh key and sets it in Vercel.
- The chat route never receives storage keys or browser analytics.
- The provider key is server-side only (`LLM_API_KEY`, with `LLM_BASE_URL` and `LLM_MODEL`). Never use a `NEXT_PUBLIC_*` name for it, and never commit keys to this repository.
- On any provider failure, timeout, rate limit or invalid response, Ask Pulse falls back to local BM25. No paid model is used automatically.

See `docs/llm-free-tier-research.md` for current provider limits and the no-paid-fallback policy.

## How the model stays honest

- Numbers live in `src/config/app.json` or named records under `src/data/`, with units, sources and confidence where appropriate.
- User-facing copy lives in `src/content/messages/<locale>.json`; all three locales keep the same keys.
- Design values live in `styles/tokens.css`; components use CSS Modules.
- `zod` validates configuration and catalogues at boot; invalid data fails fast.
- `src/domain/` is pure and cannot import UI, server, browser or persistence code.
- Branded-unit conversions are confined to `src/data/parse.ts`; no `any`, non-null assertions or casts appear elsewhere in application code.
- `docs/data-sources.md` records the high-confidence anchors and the explicitly low-confidence or unverifiable assumptions.
- `docs/model.md` explains every formula and its limits. Almanair gives estimates, not medical advice or guaranteed health outcomes.

After changing a message catalogue, action catalogue or knowledge card, run `npm run index` to regenerate `src/data/generated/`.

## Regions and standards

Alongside the Indian cities, `src/data/regions.json` ships Lahore, Dhaka, Kathmandu and Beijing. Each record carries a GeoNames source URL for its coordinates and timezone, an explicit UTC offset, and a `standardId` that must resolve to a shipped AQI scale. English, Spanish and Hindi use the same `regions.*` label keys.

Beijing currently uses `us-epa` as a **transparent fallback**: no `china-mee` breakpoint set is shipped, so no Chinese national AQI scale is implied. If a sourced `china-mee` standard is added later, switch Beijing's `standardId` in `src/data/regions.json` and re-run `npm run index` plus the tests. Custom locations are accepted only when their standard id resolves to a shipped scale, and coordinates never enter the private Plan Digest.

## Fonts

`app/layout.tsx` loads Instrument Serif, Schibsted Grotesk and Spline Sans Mono through `next/font/google`. Next.js fetches those files at build time and serves them from the app origin; builds (including CI) therefore need network access to Google Fonts, while the browser makes no third-party font request at runtime. Self-hosting the font files is a future option; the current font choices and visual design are unchanged.

## Code map

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

Open `http://localhost:3000`. Without provider variables the app still works fully; Ask Pulse uses local answers. This is the current production state: the deployed chat provider key is absent, and local-only answers are used until an operator rotates a key and configures the Vercel environment variables below. Keys are never committed to the repository.

To enable the optional remote answer:

```bash
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
LLM_API_KEY=your-server-side-google-key
LLM_MODEL=gemini-3.5-flash-lite
```

Keep these values out of browser bundles and client-side code. `gemini-2.5-flash-lite` is unavailable to new users; do not configure it. Gemini's product-improvement use, default logging and regional/consumer terms are disclosed in the consent and privacy copy; if they are unacceptable, leave the variables unset and use local BM25 answers. Do not reuse the exposed key that was removed from the deployment.

## Scripts

| Command                                   | Purpose                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------ |
| `npm run dev`                             | Start the Next.js development server.                                                |
| `npm run build`                           | Produce the production build (regenerates the index first).                          |
| `npm run start`                           | Serve a production build.                                                            |
| `npm run index`                           | Regenerate `src/data/generated/` from the catalogues and knowledge cards.            |
| `npm run typecheck`                       | Run `tsc --noEmit`.                                                                  |
| `npm run lint`                            | Run ESLint with type-aware rules.                                                    |
| `npm run deps`                            | Check dependency boundaries with dependency-cruiser.                                 |
| `npm run knip`                            | Find unused files, exports and dependencies.                                         |
| `npm run jscpd`                           | Detect duplicated code.                                                              |
| `npm test`                                | Run the Vitest suite (Node and jsdom).                                               |
| `npm run test:coverage`                   | Run tests with domain coverage thresholds.                                           |
| `npm run budgets`                         | Check the first-load JavaScript gzip budget per route.                               |
| `npm run verify`                          | Run the full gate: index, typecheck, lint, deps, knip, jscpd, tests, build, budgets. |
| `npm run format` / `npm run format:check` | Apply or check Prettier formatting.                                                  |

`npm run verify` is the gate used before every commit in this project.

## Continuous integration

`.github/workflows/ci.yml` runs on pushes and pull requests with Node 22, `actions/checkout@v4` and `actions/setup-node@v4` (npm cache). Steps run in this order: `npm ci`, `npm run typecheck`, `npm run lint`, `npm run deps`, `npm run knip`, `npm run jscpd`, `npm test`, `npm run build`, `npm run budgets`, `npm audit --omit=dev`. The audit step keeps that exact command but only fails on high or critical advisories.

Knip runs both locally (`npm run knip`) and in CI. If it crashes on memory on your machine, run the exact command below:

```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run knip
```

## Deployment

The project targets Vercel with the default Next.js build:

- Leave provider variables unset to run local-only (the current production state). If remote chat is later enabled, set `LLM_API_KEY`, `LLM_BASE_URL` and `LLM_MODEL` as server-side environment variables in the Vercel project, using a fresh rotated key, then redeploy because Vercel snapshots environment variables per deployment. Keys are never committed here; Vercel project linking is deliberately not attempted from this repository.
- Leave analytics and third-party script integrations disabled.
- Confirm the free-tier limits in the provider console before launch; the in-memory rate limit is best-effort across serverless instances.
- Re-run the provider checks in `docs/llm-free-tier-research.md` at launch and monthly.

No secrets, prompt bodies or response bodies are written to logs by Almanair code.

## Documentation

- `docs/model.md` — formulas, terms, envelopes and limitations.
- `docs/data-sources.md` — source ledger, high-confidence anchors and low-confidence register.
- `docs/architecture.md` — layers, boundaries and runtime data flow.
- `docs/adr/` — architecture decision records:
  - [On-device-first with no third-party browser calls](docs/adr/0001-on-device-first.md)
  - [Data, configuration and content separation](docs/adr/0002-data-config-content.md)
  - [Pure domain boundaries](docs/adr/0003-pure-domain-boundaries.md)
  - [Explainable estimates and Impact Receipts](docs/adr/0004-explainable-model.md)
  - [Local BM25 with consented chat](docs/adr/0005-local-retrieval-consented-chat.md)
  - [Offline PWA without API caching](docs/adr/0006-offline-pwa.md)
  - [Free-tier provider, no paid fallback](docs/adr/0007-free-tier-provider.md)
  - [Strict JSON chat responses](docs/adr/0008-json-mode.md)
- `docs/llm-free-tier-research.md` — provider comparison and deployment constraints.
- `docs/lighthouse.md` — reproducible performance, accessibility, best-practices and SEO checks.

## Contributing

See `CONTRIBUTING.md` for local setup, commit conventions, the golden-master rule and the
pull-request checklist.

## Security

See `SECURITY.md` for the private vulnerability reporting process and the server-only
provider-key policy. Please do not disclose an unfixed issue in a public ticket.

## License

Almanair is released under the [MIT License](LICENSE).

## Roadmap

1. **P0 (done):** Setup, Today, Routine, Home Air Lab, Ask Pulse, PWA shell and chat route.
2. **P1 (done):** Move, Community, Settings, local print/share actions and sourced P1 domain engines.
3. **P2 (done):** Learn cards, expanded print/share, accessibility fixes and Lighthouse verification.
