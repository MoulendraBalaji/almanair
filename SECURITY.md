# Security Policy

## Supported versions

Only the latest deployed version of Almanair receives security fixes. The app runs
local-only by default; the optional chat provider is inactive unless an operator
configures it.

## Reporting a vulnerability

Report suspected vulnerabilities privately through this repository's GitHub Security
tab ("Report a vulnerability"). Please do not open a public issue for an unfixed
vulnerability. Include a minimal reproduction, the affected route or file, and the
impact you observed. We aim to acknowledge reports promptly and to coordinate a fix
before disclosure.

## Secrets and the chat provider

- `LLM_API_KEY`, `LLM_BASE_URL` and `LLM_MODEL` are server-only Vercel environment
  variables. Never use a `NEXT_PUBLIC_*` prefix for a key and never commit one.
- A previously exposed key was removed from the deployment. Do not reuse it; rotate a
  fresh key before enabling remote answers.
- Vercel snapshots environment variables per deployment, so redeploy after changing
  any provider variable.
- The browser calls `POST /api/chat` only after explicit consent, with a bounded prompt
  and plan digest. Almanair code writes no prompt bodies, response bodies, storage keys
  or analytics identifiers to logs.
- Cross-origin POSTs to the chat route are rejected, and the in-memory rate limit is
  best-effort across serverless instances. Confirm provider free-tier limits before
  enabling the route.

## Hardening notes

- Content Security Policy nonces are generated per request, and the service worker
  never caches `/api/*`.
- No live AQI feed, analytics, error tracker or third-party script is loaded in the
  browser.
- The profile and reading stay in browser storage; coordinates never enter the private
  Plan Digest.
