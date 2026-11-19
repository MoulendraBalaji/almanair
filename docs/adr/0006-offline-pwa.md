# 6. Hand-written service worker that never caches the API

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

Offline access is a core requirement, but a generic caching strategy could store prompts, responses or provider errors and quietly violate the privacy model.

## Decision

Use a small hand-written service worker. It precaches a minimal static shell, uses network-first navigation with a cached shell fallback, and lazily caches same-origin static GET responses. It ignores all non-GET requests, cross-origin URLs and every path beginning with `/api/`. Cache names are versioned and old caches are removed on activation.

## Consequences

- The app shell and bundled data are available after the first successful load.
- Chat requests and responses are never stored by the service worker.
- Cache invalidation is explicit when the shell changes.
- Static assets not visited or precached may still require a first online load.
