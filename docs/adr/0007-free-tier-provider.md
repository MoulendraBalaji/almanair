# 7. Free-tier provider only, never an automatic paid fallback

- **Status:** Accepted
- **Date:** 2026-11-19
- **Amended:** 2026-11-19 to record the active Gemini deployment

## Context

Provider free tiers change frequently. Several advertised credits require a payment method or are limited to development and evaluation. A hidden paid fallback would break the project's no-cost and privacy promises. A Google key was supplied and health-checked during P2; the operator explicitly chose to accept Gemini's data-use and regional terms for the deployed project.

## Decision

Use a single server-configured, no-cost provider through the OpenAI-compatible chat route. The research default is Groq Free with `openai/gpt-oss-20b`; OpenRouter `:free` models remain a conditional second path. The **active deployment** is Google Gemini with `LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai` and `LLM_MODEL=gemini-3.5-flash-lite`, with the key stored only as a Vercel Secret. `gemini-2.5-flash-lite` returned 404 as unavailable to new users and must not be used. The final fallback is always local BM25. Never configure a paid model as an automatic fallback. Provider limits, model IDs, data-handling notes and verification steps are recorded in `docs/llm-free-tier-research.md`.

## Consequences

- The deployed path stays at zero provider cost, subject to Gemini's project-specific free-tier limits.
- Gemini may use submitted content to improve products and logs by default with up to 55-day retention; this is disclosed in bilingual consent and privacy copy.
- Gemini's free terms restrict user-facing consumer use and EEA/Switzerland/UK availability; local-only answers are available in those cases.
- Provider failures degrade to local answers rather than bills.
- Operators must re-check limits and model IDs before launch and monthly.
- In-memory rate limiting is documented as best-effort on Vercel because serverless instances do not share state.
- The supplied key was disclosed in chat and must be rotated after final verification.
