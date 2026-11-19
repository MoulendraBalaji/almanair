# 1. On-device-first with no live third-party browser calls

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

A smog navigator is most useful when a family can open it during a pollution episode, on a weak connection, without creating a new data trail. Live AQI APIs, geocoders, maps and analytics would add keys, terms of service, network dependence and location disclosure.

## Decision

All calculations, recommendations, retrieval and persistence run in the browser. The app uses a manually entered reading or category. Optional geolocation is resolved to a bundled region by local arithmetic. The only browser network request is `POST /api/chat`, and it requires explicit consent. There are no analytics, third-party scripts, maps or live data feeds.

## Consequences

- The app works offline after the first load and has a small, predictable privacy surface.
- Values shown to users are clearly labelled as estimates from their input, not live measurements.
- Users must enter or update their own reading.
- Product analytics cannot be added without reopening this decision.
