# 2. Separate data, configuration and content

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

"Do not hardcode" must be testable. Numeric constants scattered through components would make units, sources and confidence impossible to audit; strings scattered through JSX would make bilingual parity impossible.

## Decision

- Operational limits, budgets and timeouts live in `src/config/app.json` and are validated by zod at boot.
- Scientific and behavioural values live in named records under `src/data/`, each with a unit and source, and are validated at boot.
- User-facing text lives in `src/content/messages/en.json` and `es.json`, which must have identical keys.
- Design values live in `styles/tokens.css`; components use CSS Modules.
- `src/data/parse.ts` is the only module that contains TypeScript assertions for branded units.

## Consequences

- Sources and uncertainty are visible next to values and can be reviewed in one place.
- Adding a locale requires a key-identical catalogue, not code changes.
- `npm run index` must be run after catalogue edits; `npm run verify` does it automatically.
- Boot-time validation turns malformed data into an immediate failure rather than a silent bad plan.
