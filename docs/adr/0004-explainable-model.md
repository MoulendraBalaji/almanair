# 4. Explainable estimates and Impact Receipts

- **Status:** Accepted
- **Date:** 2026-11-19

## Context

A health-adjacent app can easily produce a confident-looking score whose provenance is invisible. Families need to know what changed, what did not and how uncertain the estimate is.

## Decision

Use transparent models with named terms: a steady-state indoor box model, hourly microenvironment dose, factor-based CO2e comparison and declarative recommendation rules. Every action produces an Impact Receipt with before/after values, a low/high input envelope, confidence, formula label and citations. Confidence is the weakest confidence among cited factors. The UI never claims symptom, illness or mortality outcomes.

## Consequences

- Receipts can be checked against `docs/model.md` and `docs/data-sources.md`.
- Low-confidence assumptions are visible rather than hidden in a composite score.
- Envelopes must be explained as input ranges, not statistical confidence intervals.
- The model is less precise than a calibrated sensor or a full CFD study, which is an accepted tradeoff.
