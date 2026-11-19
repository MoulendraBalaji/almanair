# 5. Local BM25 first, consented chat second

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

Ask Pulse should answer common questions without sending user text anywhere, but a language model can help with unusual questions. The fallback must be understandable and must not fail open to a paid service.

## Decision

Bundle a build-time BM25 index of knowledge cards and use it for every answer by default. Only after explicit consent does the client send a bounded request to `POST /api/chat`. The server wraps untrusted text, requests strict JSON, validates the shape and requires at least one citation from the supplied allowlist. Any error, timeout, rate limit, missing configuration or invalid answer returns to the local result with a machine-readable reason mapped to catalogue copy.

## Consequences

- The core Q&A experience works with no key, no network and no consent.
- The remote path has a narrow, auditable contract and cannot invent citations that pass validation.
- Consent state is stored locally and can be withdrawn through the UI.
- The generated index must be refreshed when knowledge content changes.
