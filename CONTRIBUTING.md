# Contributing

Thanks for helping improve Almanair. This repository keeps a strict boundary between
deterministic domain logic and the browser or server shell, so changes are easiest to
review when they follow the conventions below.

## Local setup

Use Node.js 22 (`nvm use` reads `.nvmrc`), then install and start the app:

```bash
npm ci
npm run dev
```

The app works without provider variables; Ask Pulse uses local BM25 answers. Copy
`.env.example` to `.env.local` only if you are deliberately testing the optional remote
answer with your own server-side key.

## Repository conventions

- `src/domain/` stays pure: no UI, server, browser or persistence imports. Dependency
  boundaries are enforced by `npm run deps`.
- User-facing copy lives only in `src/content/messages/<locale>.json`; every locale keeps
  the same keys.
- Numbers live in `src/config/app.json` or named, sourced records under `src/data/`.
- Branded-unit conversions are confined to `src/data/parse.ts`. Application code uses no
  `any`, non-null assertions or casts.
- Files in `src/data/generated/` are generated and committed. Regenerate them with
  `npm run index` after editing a message catalogue, action catalogue or knowledge card,
  and commit the result. CI verifies that the committed index is current.

## Changes and commits

- Keep one logical change per commit and use conventional commit subjects such as
  `feat:`, `fix:`, `refactor(scope):`, `test:`, `docs:` and `chore:`.
- A refactor must not change behaviour, UI, CSS, copy, data values, routes or API
  response shapes, and must not add dependencies.
- `tests/golden.node.test.ts` locks deterministic output for eight profiles across three
  readings. Never regenerate `tests/golden/expected.json` to accommodate a refactor. If
  that test changes, revert the refactor instead of patching the fixture forward.
- Do not remove or weaken tests. When renaming a test file, keep every assertion.

## Quality gates

Run `npm run verify` before opening a pull request. It runs `npm run index`, typecheck,
lint, dependency rules, knip, jscpd, the full test suite, the production build and the
first-load budgets. `npm run test:coverage` additionally enforces the domain coverage
thresholds. Use `npm run format` to apply Prettier.

## Pull requests

Keep pull requests focused, describe what behaviour stays unchanged, and include the
verify result. Never commit secrets: provider keys belong in Vercel environment
variables only. See `SECURITY.md` for the reporting process.
