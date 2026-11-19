# LLM free-tier research for Almanair

**Date checked:** 2026-11-19  
**Scope:** Official provider documentation only. Free tiers, model IDs, and limits change frequently; anything not clearly published by the provider is marked **unverified** rather than guessed. Promotional credits, Studio-only access, and development/evaluation tiers are **not** treated as reliable free production API tiers.

## 1. Decision summary

**Recommended production no-cost setup (research default)**

1. **Primary: Groq Free** using a strict-JSON model, preferably `openai/gpt-oss-20b` or `qwen/qwen3.8-27b`. It has verified free-plan limits, verified strict JSON support, and no default customer-data retention. Because the public rate-limit page is internally inconsistent, confirm exact organization limits in the Groq console before launch.
2. **Fallback: OpenRouter `:free` models only**, ideally through the Free Models Router with structured-output filtering. Use it only with free models and disable any paid fallback. It adds resilience but has a low 50 RPD cap unless at least 10 credits have been purchased, and the free model catalog changes.
3. **Conditional fallback: Google Gemini Free** only if Almanair accepts its product-improvement data use, default logging/retention, and terms restricting user-facing consumer use and EEA/Switzerland/UK availability. It is **not** the default recommendation for a privacy-sensitive public app.
4. **Final fallback: local BM25** on network failure, 429/5xx, timeout, invalid JSON, or exhausted free quota. Never fall back to a paid model automatically.

**Do not include in the default free chain:** Anthropic, OpenAI, Mistral, and Cerebras. No reliable general no-cost production API tier was verified. Cerebras has only a payment-method-required promotional credit with a development/evaluation caveat; OpenAI/Anthropic/Mistral credits or trials are not durable free production tiers.

**Why this order:** Groq best matches the app’s strict JSON, low-token, no-default-retention needs. OpenRouter is useful as a second free path but introduces changing third-party providers and data-handling variability. Gemini offers a genuine free tier but its default logging/training posture and terms make it unsuitable unless explicitly accepted.

## 1a. Current deployment choice and key health check (2026-11-19)

The deployed `carbonpulse` project is **not** using the research default. It is configured with Google Gemini through the OpenAI-compatible endpoint:

- `LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai`
- `LLM_MODEL=gemini-3.5-flash-lite`
- `LLM_API_KEY` is stored only as a Vercel Secret; no key value is committed or written to docs/tests.

Health checks with the supplied key:

- Native `GenerateContent` with `x-goog-api-key` and `gemini-2.5-flash-lite` returned **404**. Google’s message says that model is no longer available to new users and recommends `gemini-3.5-flash-lite`.
- Native `GenerateContent` with `gemini-3.5-flash-lite` returned **200** with `generated:OK`.
- `POST /v1beta/openai/chat/completions` with `gemini-3.5-flash-lite`, `response_format: json_object` and the app’s grounded answer shape returned **200** with valid strict JSON.
- The same key sent as an `Authorization: Bearer` header to the native endpoint returned **401**; the native endpoint requires `x-goog-api-key`, while the OpenAI-compatible endpoint uses `Authorization: Bearer`.

This choice accepts Google’s product-improvement data use, default logging/retention, and terms restricting user-facing consumer use and EEA/Switzerland/UK availability. Those limits are disclosed in `ask.consent` and `settings.privacyBody`; users in restricted regions should choose local answers only. Exact RPM/TPM/RPD remain project-specific in AI Studio and must be checked there. Never configure a paid fallback; local BM25 remains the final fallback.

**Operational note:** the key was pasted into a chat session and must be rotated after final verification. Treat it as exposed even though it is stored as a Vercel Secret.

**Deployment incident (2026-11-19):** the first production deployment returned `{"error":"unavailable"}` from `/api/chat` even though a new preview deployment with the same source and project environment returned a validated `mode:"remote"` answer. Vercel snapshots environment variables when a deployment is created, so the production deployment made before `LLM_API_KEY` was added could not read the Secret. Redeploying after the environment change is required. The provider now emits non-sensitive warnings that distinguish “provider is not configured”, an upstream rejection status, and a thrown request error by error name only; it never logs the key, prompt, digest or response body.

## 2. Comparison table

| Provider / plan | Free allowance verified on 2026-11-19 | Grounded JSON examples | Card requirement | Training / data use | Region / legal | Vercel production caveats |
|---|---|---|---|---|---|---|
| **Google Gemini Free** | Free tier exists with limited model access and limited free tokens. **Exact RPM / input TPM / RPD are project- and model-specific in AI Studio and were not publicly verified.** Specified limits are not guaranteed; RPD resets at midnight Pacific. Free qualification requires an active project or free trial; some projects require verification. Tier 1 requires billing and a minimum **$5** prepay. | `gemini-3.5-flash-lite` via the OpenAI-compatible endpoint with `response_format: {"type":"json_object"}` returned valid strict JSON on 2026-11-19. `gemini-2.5-flash-lite` returned 404 as unavailable to new users. | **Unverified for Free.** Billing/prepay is required for Tier 1, not verified for Free. | Google states content may be used to improve products. Logging is on by default for Generate Content calls in projects created on/after 2026-10-26, with 55-day default retention. Contributor Tier is opt-in/invite-only with a data-use tradeoff. | Terms state 18+, professional/business use rather than consumer use, and only Paid Services when making API Clients available to users in the EEA, Switzerland, or UK. | Dynamic limits and default logs make it hard to promise “no user-text storage.” Use only behind explicit consent and region/legal review; verify current model mapping. |
| **Groq Free** | High-level Free Plan table: `openai/gpt-oss-20b`, `openai/gpt-oss-120b`, `qwen/qwen3.8-27b` = **30 RPM**, **1K RPD**, **8K TPM**, **200K TPD**. Exact org limits are in the Groq console; the public page has a tab/body inconsistency, so treat these as high-level until confirmed. | Strict JSON: `openai/gpt-oss-20b`, `openai/gpt-oss-120b`, `qwen/qwen3.8-27b`, `meta-models/muse-spark-open`. Streaming and tool use are not currently supported with Structured Outputs. | **Unverified for Free.** Payment method is required only to upgrade to Developer tier. | Usage metadata is always collected. Customer data is not retained by default. Reliability/abuse logs may be kept up to 30 days unless opted out. ZDR is available. Retained data is stored in GCP buckets in the United States; SCCs are mentioned. | **Unverified from fetched official docs.** | Best default fit. Use non-streaming calls, cap tokens, throttle to 8K TPM, handle 429 with backoff, and fall back to OpenRouter/BM25. |
| **OpenRouter `:free` models** | `:free` models: **20 RPM**. **50 RPD** if fewer than 10 credits have been purchased; **1000 RPD** if at least 10 credits have been purchased. `GET /api/v1/key` reports `free_model_daily_requests` used/limit/remaining; daily counters reset UTC. **TPM / TPD unverified.** Extra accounts/keys do not raise limits. | Free-catalog examples observed 2026-11-19: `inclusionai/ling-3.2-flash:free`, `baidu/ernie-5.5-flash-preview:free`, `liquid/lfm-3-1.7b:free`, `particle-ai/particle-1:free`, `nvidia/nemotron-3.5-super-vl:free`, `dots-studio/dots-3-note-preview:free` (expires 2026-12-31). The Free Models Router filters for structured outputs and falls back only to free models. Verify IDs/support at runtime. | **Unverified for free usage.** Card/crypto/Alipay are documented for credit purchases. | Prompts are not stored by default; metadata such as tokens/latency is stored. Prompt data is never sold/licensed. Downstream provider training capture varies; ZDR controls exist. Legal/CSAM preservation exceptions apply. Small anonymous input categorization samples may occur with the ZDR model. | EU routing is Business-only via `eu.openrouter.ai`; router models are excluded from regional model lists. Broader region restrictions **unverified**. | Use only `:free` models or `openrouter/free`. Paid fallbacks are billed. Availability changes; check the key endpoint for daily cap but note RPM is not reported there. |
| **Anthropic API** | **No genuine general free production API tier verified.** API is paid per token; rate limits depend on paid tier. Credits/trials are not a durable free tier. | Structured outputs are stable, with examples `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`, but these are paid. | Claude Console account and API key or Workload Identity Federation; billing required for paid use. | Structured Outputs docs say prompts and Claude outputs are not stored; only the JSON schema is cached up to 24 hours, excluding Covered Models. Broader training/data specifics were not fully verified from fetched pages. | Supported regions list exists; check current list. | Exclude from the no-cost chain. If ever added as paid opt-in, disclose cost and billing separately. |
| **OpenAI API** | **No supported general free API tier verified.** Pricing shows paid usage tiers; new API accounts use prepaid billing. Free credits are promotional and not a durable tier. | Structured Outputs constrain completed, non-refusal output to a supplied JSON Schema. Examples include `o3` and `gpt-5.1`. Handle refusals, incomplete responses, and validation errors. | Payment method/prepaid billing guidance verified. Purchased credits expire after one year, or 180 days in Japan after 2026-11-13. Positive balance does not imply requests are below rate limits. | API data is not used to train/improve models unless explicitly opted in. Abuse-monitoring logs may contain prompts/responses. | Supported-country list exists; access outside supported countries may lead to block/suspension. | Exclude from the no-cost chain. Do not treat credits as free production capacity. |
| **Mistral API** | **No genuine free production API tier verified.** Docs distinguish Vibe/Studio/Inference products; pricing is paid for inference. Studio-only or promotional access is not a reliable production API tier. | **N/A for a no-cost tier.** Paid structured-output models are not relied upon here. | Free tier card requirement **unverified**; paid API requires account/billing. | **Unverified / not relied upon** because no free production tier was verified. | **Unverified.** | Exclude from the no-cost chain. |
| **Cerebras Inference** | **No no-cost production tier verified.** Pricing includes a **$5** promotional credit requiring a valid payment method, expiring 30 days after activation, with development/evaluation/experimentation caveat and “not intended for production use.” Rate limits use dual buckets for uncached tokens and total tokens with RPM/RPH/RPD and TPM/TPH/TPD. | **N/A for a no-cost production tier.** | Payment method required for the promo credit. | **Not relied upon** because the available offer is promo/dev-eval, not a free production tier. | **Unverified.** | Do not use promo credits as the production free tier. |

## 3. Source notes per provider

### Google Gemini

- Rate limits and model-specific values: <https://ai.google.dev/gemini-api/docs/rate-limits>
- Live project limits: <https://aistudio.google.com/rate-limit?timeRange=last-28-days>
- Pricing and free/paid tier distinction: <https://ai.google.dev/gemini-api/docs/pricing>
- Terms: <https://ai.google.dev/gemini-api/docs/terms>
- Logging/retention: <https://ai.google.dev/gemini-api/docs/logs-policy>
- Billing/Tier 1 prepay: <https://ai.google.dev/gemini-api/docs/billing>
- API keys: <https://ai.google.dev/gemini-api/docs/api-key>
- Structured outputs: <https://aistudio.google.com/docs/structured-output.md>

**Notes:** The public docs do not provide one stable global free-tier RPM/TPM/RPD table; the AI Studio page is authoritative for the active project. The free tier’s product-improvement data use and default logging are material for Almanair’s no-storage promise. The terms’ consumer-use and EEA/Switzerland/UK restrictions must be reviewed before using Gemini as a public user-facing backend.

### Groq

- Rate limits: <https://console.groq.com/docs/rate-limits>
- Exact org limits: <https://console.groq.com/settings/limits>
- Structured outputs: <https://console.groq.com/docs/structured-outputs>
- Data handling: <https://console.groq.com/docs/your-data>
- Billing FAQ: <https://console.groq.com/docs/billing-faqs>
- Service tiers: <https://console.groq.com/docs/service-tiers>

**Notes:** The high-level Free Plan table lists 30 RPM, 1K RPD, 8K TPM, and 200K TPD for the named models, but the page’s tab/body inconsistency means the console should be treated as authoritative. Structured Outputs are strict for the listed models; streaming and tool use are not currently supported with them. The data page supports no default customer-data retention but confirms metadata collection and possible abuse logs.

### OpenRouter free models

- Limits: <https://openrouter.ai/docs/api_reference/limits>
- FAQ: <https://openrouter.ai/docs/faq>
- Privacy: <https://openrouter.ai/docs/guides/privacy>
- Free model variants: <https://openrouter.ai/docs/guides/routing/model-variants/free.md>
- Free Models Router: <https://openrouter.ai/docs/guides/routing/routers/free-router.md>
- Current model catalog: <https://openrouter.ai/api/v1/models>
- Key limit status: `GET https://openrouter.ai/api/v1/key`

**Notes:** The documented free-model caps are 20 RPM and 50/1000 RPD depending on credit purchase history. Free model availability changes, so the catalog and `response_format`/structured-output support should be checked at runtime. Only `:free` models or `openrouter/free` keep requests free; configuring a paid fallback creates charges.

### Anthropic

- API overview: <https://platform.claude.com/docs/en/api/overview>
- Pricing: <https://platform.claude.com/docs/en/about-claude/pricing>
- Getting started: <https://platform.claude.com/docs/en/get-started>
- Rate limits: <https://platform.claude.com/docs/en/api/rate-limits>
- Supported regions: <https://platform.claude.com/docs/en/api/supported-regions>
- Structured outputs: <https://platform.claude.com/docs/en/build-with-claude/structured-outputs>

**Notes:** Structured outputs are available and stable, but the API is paid. No durable free production API tier was verified.

### OpenAI

- Structured outputs: <https://developers.openai.com/api/docs/guides/structured-outputs>
- Pricing: <https://developers.openai.com/api/docs/pricing>
- Supported countries: <https://developers.openai.com/api/docs/supported-countries>
- Your data / training: <https://platform.openai.com/docs/guides/your-data>
- Payment method requirement: <https://help.openai.com/en/articles/8264644-why-do-i-need-to-add-a-payment-method-to-get-api-access>
- Model examples: <https://platform.openai.com/docs/models/o3>, <https://platform.openai.com/docs/models/gpt-5.1>

**Notes:** Structured outputs are suitable for JSON, but there is no verified general free API tier. Credits and prepaid billing do not make a durable no-cost production tier.

### Mistral

- Pricing: <https://mistral.ai/pricing>
- Platform overview: <https://docs.mistral.ai/getting-started/platform-overview>
- Inference pricing: <https://docs.mistral.ai/inference/pricing>
- Quickstart: <https://docs.mistral.ai/inference/quickstarts/send-your-first-request>
- Models: <https://docs.mistral.ai/getting-started/models/>

**Notes:** The fetched official material distinguishes Studio/Vibe/Inference products and shows paid inference. No genuine free production API tier was verified.

### Cerebras

- Pricing: <https://www.cerebras.ai/pricing>
- Rate limits: <https://inference-docs.cerebras.ai/support/rate-limits>
- Account/billing: <https://inference-docs.cerebras.ai/console/account-billing>
- Privacy policy: <https://www.cerebras.ai/privacy-policy>

**Notes:** The visible offer is a payment-method-required promotional credit with explicit development/evaluation caveats. It should not be represented as a reliable free production tier.

## 4. Deployment implications for Almanair

- **Active provider:** The deployed project uses Gemini as described in §1a. Groq and OpenRouter remain documented alternatives, not automatic fallbacks.
- **Keys:** Store provider keys only as server-side Vercel environment variables. Never use `NEXT_PUBLIC_*`, commit keys, or expose them to browser code. Keep the browser limited to `POST /api/chat`.
- **Consent and disclosures:** Ask for consent before sending user text to any external provider. If OpenRouter or Gemini is in the fallback chain, the consent text should name all possible recipients. Do not claim “no storage” globally unless provider-side logging/training/retention settings are also acceptable and disclosed.
- **Data minimization:** Send only the prompt needed for the request. Keep prompts roughly ≤2K input tokens and outputs ≤500 tokens. Do not log or persist prompt/response bodies in Vercel logs, analytics, databases, or error trackers. If any operational telemetry is kept, limit it to status, latency, token counts, and provider-used counters.
- **Rate limiting:** Almanair’s per-IP limit cannot be reliably enforced with in-memory state across Vercel serverless instances. Use a shared counter store with minimal IP/count data, or document the limit as best-effort. Respect provider daily caps: Groq 1K RPD, OpenRouter 50 RPD without 10 credits, and whatever Gemini AI Studio reports.
- **Structured JSON:** Use provider structured-output modes where available, but still validate the returned JSON against Almanair’s schema on the server. Handle refusals, incomplete outputs, API errors, and schema violations. Structured Outputs constrain syntax, not truthfulness or business rules.
- **Failure chain:** On 429/5xx/timeout/invalid JSON, retry sparingly with backoff, then move to the next **free** provider, then BM25. Do not configure paid fallbacks. Surface a clear “offline/local answers” state to users.
- **Provider-specific settings:** For Groq, use non-streaming Structured Outputs. For OpenRouter, pin the provider/model allowlist to current `:free` IDs, filter for structured outputs, check `GET /api/v1/key` for daily remaining quota, and verify no paid fallback is enabled. For Gemini, verify live AI Studio limits, default logging/retention, and legal eligibility before enabling.
- **No third-party scripts:** Keep analytics and third-party browser scripts out of the app. Any rate-limit store or server telemetry must not receive user text and should be covered by the privacy notice.
- **Monitoring:** Re-check model IDs, free status, and limits at launch and at least monthly. Free models can be removed or renamed with little notice; stale IDs should fail closed to the next free provider or BM25.

## 5. Open questions / verification checklist

- [ ] Confirm Groq organization-specific limits at <https://console.groq.com/settings/limits> and resolve the public page’s tab/body inconsistency.
- [ ] Confirm whether Groq Free requires a payment method in the actual signup flow and whether abuse-log opt-out/ZDR can be enabled for the project.
- [x] Check the supplied key and model availability for `gemini-3.5-flash-lite` on both the native and OpenAI-compatible endpoints (§1a).
- [ ] Read Gemini AI Studio live limits for the exact project and models; confirm logging/retention settings and whether the app’s use case satisfies the terms, especially consumer use and EEA/Switzerland/UK availability.
- [x] Accept Google’s product-improvement data use and default retention for this deployment and disclose them in the bilingual consent/privacy copy; local answers remain available for restricted regions.
- [ ] Verify OpenRouter free model IDs and structured-output support at runtime; maintain an allowlist of `:free` models only.
- [ ] Decide whether to accept OpenRouter’s 50 RPD no-credit cap or purchase at least 10 credits solely to raise the free-model RPD to 1000; document that this is a spend decision, not a new per-request charge.
- [ ] Confirm OpenRouter signup availability/region and whether EU routing/Business-only requirements apply to Almanair.
- [ ] Review provider data-processing terms for Groq and OpenRouter, including downstream provider training behavior, before writing the consent text.
- [ ] Confirm the shared per-IP rate-limit store design and what minimal data it stores.
- [ ] Test the full failure path: success, 429, 5xx, timeout, refusal, malformed JSON, exhausted daily cap, and offline mode.
- [ ] Verify no provider keys or prompt/response bodies appear in browser bundles, Vercel logs, analytics, or third-party scripts.
- [ ] Re-check all free limits and model IDs before production launch and on a recurring schedule.
- [ ] Rotate the exposed Google key after final production verification and update the Vercel Secret.
