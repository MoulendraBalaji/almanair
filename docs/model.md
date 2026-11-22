# Almanair model notes

Almanair estimates relative exposure and climate effects from a user-entered reading and a local profile. It does not fetch live pollution data, diagnose conditions or promise health outcomes. Every number comes from `src/config/app.json` or a named record in `src/data/`.

## 1. Reading and severity

A user may enter a category, an AQI index or a PM2.5 concentration. `src/domain/aqi/` maps the input through the selected standard in `src/data/standards.json` and returns a severity from 0 to 5. An incomplete reading falls back to the lowest severity so the rest of the plan remains computable; the UI labels that state as a baseline rather than a measurement.

The selected standard determines which published band applies. WHO's `15 µg/m³` 24-hour AQG is shown as context, not substituted for a regulatory AQI band.

## 2. Outdoor hourly shape

`src/data/diurnal-profiles.json` supplies four 24-hour shapes: morning traffic inversion, night inversion, weak variation and flat. `outdoorProfile` normalises the selected shape so its mean equals the user's daily mean, then emits one concentration per hour. The shape is a scenario, not a forecast.

## 3. Indoor steady state

`src/domain/indoor/model.ts` uses a well-mixed box model:

```text
C_in = (P · a · C_out + S / V) / (a + k + Q / V)
```

| Term | Meaning | Unit |
|---|---|---|
| `C_out` | Outdoor concentration for the scenario | µg/m³ |
| `C_in` | Indoor concentration | µg/m³ |
| `P` | Penetration factor | ratio |
| `a` | Air-exchange rate | ACH |
| `k` | Deposition loss | 1/h |
| `S` | Indoor source strength | µg/h |
| `V` | Room volume | m³ |
| `Q` | Purifier clean-air delivery rate | m³/h |

The largest room in the profile is modelled. Low, central and high envelope values are computed by selecting the corresponding factor endpoints together; the resulting spread is an input envelope, not a confidence interval.

The clean-air target is `4.9 ACH`, derived from the EPA CADR table. Required clean-air delivery is `target ACH × V`, and the purifier count is the ceiling of that requirement divided by one unit's CADR. With no purifier, the count is zero.

## 4. Inhaled dose

`src/domain/exposure/dose.ts` sums hourly `concentration × breathing rate × one hour` for each household member:

- Indoor and sleeping hours use `C_in`.
- Vehicle hours use `C_out × vehicle ratio`.
- Outdoor and exercise hours use `C_out`.
- Mask reduction applies only to outdoor, exercise and vehicle hours: `reduction = filtration × fit × stated wearing share`, with `share = 0` by default. Owning a mask alone never changes indoor or sleep dose. Indoor and sleep concentrations are never multiplied by a mask factor. The optional “wear a mask outdoors” action models full outdoor use (`share = 1`) and produces its own receipt; it does not change emissions.
- Exercise and vehicle hours use the active breathing rate; other hours use the resting rate.

The same envelope discipline applies: low uses low indoor, vehicle and breathing inputs; high uses high inputs. Household dose is the sum of member doses. `hourly` values are central-case values used by the chart only.

## 5. Ventilation window

`src/domain/ventilation/solar.ts` implements the NOAA solar-position algorithm locally using coefficients from `src/data/solar-constants.json`; the Boulder vector is a build-time/runtime test anchor. Solar noon is expressed in local minutes from midnight using the region's UTC offset.

`src/domain/ventilation/window.ts` marks an hour as a candidate when:

1. it lies within the configured half-width around solar noon, and
2. modelled outdoor concentration is below modelled indoor concentration.

The longest contiguous run becomes the suggested opening window. If there is no such run, the plan says to keep windows closed. This is a heuristic for relative cleanliness, not a guarantee of outdoor air quality.

## 6. Emissions and swaps

`src/domain/emissions/index.ts` multiplies a daily distance or energy amount by the matching UK DESNZ 2024 factor. Daily values are scaled by seven days for weekly figures. Transport and household-fuel swaps replace one mode or fuel with a cleaner illustrative alternative.

`src/data/local-tiers.json` supplies separate qualitative local-pollutant tiers. CO2e and local smog are different effects and are never presented as one number.

## 7. Recommendations and Impact Receipts

`src/domain/recommender/` applies declarative rules to non-identifying facts derived from the profile and reading. Each candidate action is then passed through the corresponding model in `src/data/action-effects.json`:

- lower air exchange,
- remove an indoor source,
- clean-room filtration,
- higher deposition,
- active travel,
- shared ride,
- switch electric,
- community or waste behaviour.

The score is the sum of relative central-case exposure improvement and relative daily emissions improvement. The UI shows the top configured number of actions after budget filtering.

Each Impact Receipt compares the same baseline and changed scenario, showing before/after central exposure, the low/high envelope of the changed case, emissions delta, confidence, formula label and cited source ids. No receipt claims a reduction in symptoms, illness or mortality.

## 8. Retrieval and chat

Ask Pulse first retrieves the top knowledge cards with local BM25 over a build-time index. BM25 parameters live in `src/config/app.json`; tokenisation is shared by the index builder and the runtime retriever.

If the user has consented and the optional provider is configured, a bounded request sends the question, locale, a short plan digest and allowed citation ids to `POST /api/chat`. The server wraps untrusted text in delimiters, requests strict JSON, validates the answer and requires at least one citation drawn from the allowlist. Any failure returns to the local answer. See `docs/llm-free-tier-research.md` for provider limits and the no-paid-fallback rule.

## 9. Known limitations

- Inputs are user supplied; Almanair does not verify them or fetch live conditions.
- Diurnal shapes and indoor envelopes are illustrative scenarios.
- A box model assumes complete mixing and does not resolve rooms, airflow paths or particle size distributions.
- Cloth-mask, fit, vehicle and energy assumptions are explicitly low confidence; see `docs/data-sources.md`.
- CO2e factors are climate metrics, not local toxicity metrics.
- Solar noon depends on the configured coordinate and UTC offset; a custom location is only as accurate as the values entered.
- Rate limiting is best-effort in a serverless deployment because instances do not share in-memory state.
