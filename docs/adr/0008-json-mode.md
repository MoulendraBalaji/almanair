# 8. Strict JSON chat responses instead of streaming

- **Status:** Accepted
- **Date:** 2026-11-22

## Context

Ask Pulse is an optional, consented call to one server-configured provider. The client has to render citations that are checked against the user's own plan and bundled catalogues, and every remote failure already degrades to a deterministic local BM25 answer. Streaming token deltas would make it much harder to validate a complete answer before it is shown, and an interrupted stream would not produce a checkable citation list. The route also enforces same-origin, body-size, per-client and global daily limits before any provider work.

## Decision

Keep the single bounded `response_format: json_object` request and validate the whole reply on the server before returning it to the browser. The response schema keeps `mode: "remote"` for client compatibility and adds an explicit `source: "model" | "local"`. Provider replies are stamped `source: "model"` only after their citations are non-empty and all cite requested, known ids; the global-cap and provider-failure fallback is a schema-valid local BM25 answer with `source: "local"`. No CORS wildcard is emitted; same-origin requests only.

## Consequences

- Answers are bounded, complete and deterministic for the client: one object, one answer string, one citation list and one provenance label.
- Invalid or invented citations are rejected before display, so partially streamed text can never appear as a verified answer.
- The local fallback satisfies the same contract, so the UI can label model and local answers without special error handling.
- Streaming remains a future option only if citation and source validation can be moved to an equally complete final event; it is not required by the current product contract.
- The provider response is still the only network-bound part of Ask Pulse; all other work stays on device or in the bundled library.
