# 3. Pure domain layer with enforced boundaries

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

The same plan values appear on several screens, and chat digests must describe exactly what the UI computed. Domain logic that depends on React, local storage or the network would be hard to test and easy to drift.

## Decision

`src/domain/` contains pure functions. It may import only other domain modules, validated config/data and zod schemas. `dependency-cruiser` fails the build on violations. Browser modules cannot import `src/server/`; server modules can import only retrieval types, config and their own scope. The app uses one `'use client'` provider to assemble state and pass domain results to presentational components.

## Consequences

- Screens cannot compute competing versions of a value.
- Domain behaviour is covered by deterministic Node tests.
- Adding a feature requires deciding deliberately which layer owns it.
- The dependency rules add a small amount of configuration maintenance.
