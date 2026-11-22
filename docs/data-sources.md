# Data sources and confidence register

This file is the audit trail for every scientific or behavioural number used by Almanair. It complements `docs/model.md`, which explains how the numbers are combined.

## Source ledger

| File | Contains | Authority |
|---|---|---|
| `src/data/standards.json` | US EPA 2024 and India CPCB PM2.5 bands, severities and breakpoints | EPA AQS fact sheet; CPCB NAI |
| `src/data/factors.json` | Named factors with value/range, unit, source, confidence and notes | WHO, US EPA, CDC/NIOSH, UK DESNZ, NOAA, peer-reviewed indoor-air studies and authoritative energy reports |
| `src/data/solar-constants.json` | Named NOAA solar algorithm coefficients | NOAA Solar Calculator calculation details |
| `src/data/solar-vectors.json` | Boulder solstice verification vector (`781.7` solar-noon minutes) | NOAA Solar Calculations spreadsheet |
| `src/data/diurnal-profiles.json` | Four normalised hourly shapes | Scenario shapes, not live measurements; provenance owned by a separate workstream |
| `src/data/regions.json` | Reviewed coordinates, UTC offsets, timezone labels and default standards | GeoNames records |
| `src/data/local-tiers.json` | Qualitative local-pollutant tiers | WHO and UK DESNZ guidance |
| `src/data/action-effects.json` | Which model and source ids each action uses | Declarative model wiring, not a scientific authority |
| `src/data/community-playbooks.json` | Community checklists | WHO and bundled guidance |
| `src/data/sources.json` | Citation cards shown in the UI | Publisher, title, URL and year |
| `src/content/messages/<locale>.json` | All user-facing text | Product content, not scientific authority |

Every factor carries a `unit`. Every source card carries a publisher and URL. Values are never written as anonymous literals in UI components.

## High-confidence anchors

- **WHO 2021 PM2.5 AQG:** `15 µg/m³` as a 24-hour mean, 99th percentile. It is a guideline, not a health-effect threshold.
- **US EPA 2024 PM2.5 AQI breakpoints:** `0–9.0`, `9.1–35.4`, `35.5–55.4`, `55.5–125.4`, `125.5–225.4`, `225.5–325.4 µg/m³`.
- **India CPCB PM2.5 bands:** `0–30`, `31–60`, `61–90`, `91–120`, `121–250`, `250+ µg/m³`. CPCB publishes no upper concentration bound for severe; `concentrationHigh: 500` is retained only to close AQI `401–500` and is explicitly marked by `assumption` on `in-severe`.
- **US EPA inhalation rates:** child, adult and older-adult long-term means and upper envelopes from the *Exposure Factors Handbook*, converted to hourly rates where needed.
- **EPA air-cleaner guidance:** the clean-room target of `4.9 ACH` is derived from the published CADR table for a `100 ft²` room with `65 cfm` CADR and an `8 ft` ceiling. A generic clean-room ACH range from uncited secondary material is deliberately excluded.
- **NOAA solar algorithm:** all coefficients and the `781.7`-minute Boulder verification vector come from NOAA's published calculation details.
- **UK DESNZ 2024:** transport and household-energy CO2e conversion factors. These are climate factors, not local smog measurements.

## AQI standard sourcing

- **US EPA:** 2024 PM2.5 breakpoints are published by EPA AQS; the six selected bands are reproduced directly in `src/data/standards.json`.
- **India CPCB:** the official [About National Air Quality Index](https://airquality.cpcb.gov.in/ccr_docs/About_AQI.pdf) and [National Air Quality Index](https://cpcb.gov.in/National-Air-Quality-Index/) pages list the severe PM2.5 breakpoint as `250+`, with no upper concentration bound. The retained `500` upper bound is marked as an extrapolation on the `in-severe` band; it is not a published CPCB limit.
- **China/MEE:** HJ 633—2012 PM2.5 IAQI breakpoints (`0/35/75/115/150/250/350/500 µg/m³` for IAQI `0/50/100/150/200/300/400/500`) were verified in the [official MEE standard text](https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/201203/W020250407406362045613.pdf). However, [HJ 633—2026](https://www.mee.gov.cn/xxgk2018/xxgk/xxgk01/202602/W020260224717684550618.pdf) replaced HJ 633—2012 on `2026-03-01`, and the owned message catalogue has no `standards.chinaMee` label key. No `china-mee` standard is added in this change. Lahore, Dhaka, Kathmandu and Beijing continue to use `us-epa` as a neutral fallback; this is a display standard, not a claim about local regulation.

## Low-confidence and unverifiable register

The following ids are explicitly marked `low` in `src/data/factors.json`. They are envelopes for illustration and comparison, not measured values, not probability distributions and not clinical predictions. The UI shows them as such and attaches a low-confidence label to receipts that depend on them.

| Factor id | Value / range | Unit | Why it is low confidence | Used for |
|---|---:|---|---|---|
| `particle-penetration` | 0.6 / 0.8 / 1.0 | ratio | No universal value; housing stock and leaks vary widely | Outdoor-to-indoor entry term |
| `air-exchange-rate` | 0.2 / 0.5 / 1.2 | ACH | Homes differ by construction, weather and occupant behaviour | Indoor removal and ventilation term |
| `particle-deposition` | 0.1 / 0.2 / 0.4 | 1/h | No universal PM2.5 deposition loss rate | Indoor removal term and damp-wipe action |
| `indoor-source-cooking` | 1000 / 3000 / 9000 | µg/h | Unflued cooking emissions depend on fuel, food, hood and duration | High indoor source case |
| `mask-cloth-filtration` | 0.2 / 0.4 / 0.7 | ratio | Cloth filtration varies by material, layers and condition | Cloth-mask reduction estimate |
| `mask-fit-factor` | 0.5 / 0.7 / 0.9 | ratio | Seal quality dominates real-world protection and is user-specific | Multiplier for all mask classes |
| `mask-wearing-share` | 0 | ratio | User-stated behaviour; 0 means no routine outdoor mask use has been declared, not an AQI-derived prediction | Profile input for mask-use scenarios |
| `vehicle-ratio-car` | 0.5 / 0.8 / 1.2 | ratio | In-car concentration depends on recirculation, age and traffic | In-vehicle dose term |
| `vehicle-ratio-bus` | 0.4 / 0.7 / 1.0 | ratio | No universal bus-cabin to outdoor ratio | In-vehicle dose term |
| `vehicle-ratio-bicycle` | 0.9 / 1.0 / 1.1 | ratio | Roadside exposure varies with route and traffic | Active-travel dose term |
| `walk-co2e-per-km` | 0 | kg CO2e/passenger-km | Zero operational emissions by definition; embodied emissions are excluded | Climate comparison only |
| `bicycle-co2e-per-km` | 0 | kg CO2e/passenger-km | Zero operational emissions by definition; embodied emissions are excluded | Climate comparison only |
| `cooking-energy-per-day` | 3 / 6 / 12 | kWh/day | Highly household- and climate-dependent | Illustrative household energy estimate |
| `heating-energy-per-day` | 10 / 25 / 60 | kWh/day | Winter heating demand varies by region, insulation and fuel | Illustrative household energy estimate |

Also note:

- `indoor-source-clean` is `0 µg/h` **by definition** when there is no unflued combustion or frying; its low label reflects that it is a modelling convention, not a measured universal rate.
- `mask-wearing-share` is a profile input. `0` means the profile has not stated routine outdoor mask use; it must not be inferred from the AQI. WHO guidance informs the correct-use caveat but does not supply a universal wearing share.
- Diurnal shapes are scenario shapes, not forecasts. A daily mean is rescaled to preserve its mean; the resulting hourly values are illustrative.
- `target-clean-room-ach` is `medium`, not low, because it is derived arithmetically from an EPA CADR table; it is still a derived target rather than an EPA "recommended ACH" statement.
- N95 filtration is `medium`: N95 denotes at least 95% filtration of the most penetrating particle size under test conditions, not a guarantee of personal protection without a good seal.
- Biomass CO2e is `medium`: biogenic CO2 is reported separately by DESNZ and local particulate effects are not included in that factor.

## Confidence rules

- A receipt's confidence is the **weakest** confidence among the source ids it cites.
- Low/high dose and indoor values are input envelopes. They are not confidence intervals and must not be described as a 95% range.
- Qualitative local-pollutant tiers are labels (`lower`, `similar`, `higher`), not grams per kilometre or health outcomes.
- AQI bands are standards and guidance; Almanair does not invent a "safe" exposure level.
- Scientific source metadata must name an external publisher and title; `tests/data.node.test.ts` rejects any case-insensitive `Almanair` self-citation across sourced datasets.

## Updating a value

1. Find or add a publisher record in `src/data/sources.json` or the relevant catalogue's inline `source` object.
2. Add the id, value or range, unit, confidence and note to `src/data/factors.json` or the appropriate catalogue.
3. Update the tables above and `docs/model.md` in the same change.
4. Run `npm run index` if message, action or knowledge content changed.
5. Run `npm run verify` and include the source URL in the commit message or PR description.
