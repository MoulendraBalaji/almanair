# 7. Free-tier provider only, never an automatic paid fallback

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

Provider free tiers change frequently. Several advertised credits require a payment method or are limited to development and evaluation. A hidden paid fallback would break the project's no-cost and privacy promises.

## Decision

Use Groq Free as the configured primary OpenAI-compatible provider, with `openai/gpt-oss-20b` as the documented default model. Treat OpenRouter `:free` models as a conditional second path and Gemini as an opt-in path only after data-use and legal review. The final fallback is always local BM25. Never configure a paid model as an automatic fallback. Provider limits, model IDs, data-handling notes and verification steps are recorded in `docs/llm-free-tier-research.md`.

## Consequences

- The deployment cost stays at zero for the documented path, subject to provider limit changes.
- Provider failures degrade to local answers rather than bills.
- Operators must re-check limits and model IDs before launch and monthly.
- In-memory rate limiting is documented as best-effort on Vercel because serverless instances do not share state.
