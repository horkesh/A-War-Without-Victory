# terminal_min_gap threshold — downstream scoring evidence base (R6 exhaustion/scoring lane)

**Date:** 2026-08-06
**Author:** scenario-creator-runner-tester (measurement + draft; NO engine change, read-only)
**Purpose:** empirical evidence for the ratification panel deciding whether to RE-DERIVE the exhaustion redesign's `terminal_min_gap_pct` acceptance threshold (owner chose re-derivation over forcing 5% via combat re-calibration — friction fix #2 RETIRED, see `20260806_EXHAUSTION_SATURATION_ROOT_CAUSE.md` + commit 69f4c46d6).
**Method:** called the real `computeWarCostIndex` / `capGradeByCost` (`src/sim/negotiation/scoring.ts`) on the ADOPTED n153 `final_save` (current `codex/master-roadmap-execution` engine, commit 41b5c31cd), and on the same save with the RETIRED friction-fix n1 terminal exhaustion substituted (isolates the exhaustion-spread variable; holds casualties/duration/atrocity constant). Determinism-safe, read-only.

---

## The question

Is the adopted asymptotic run's **3.05%** `terminal_min_gap` (terminal `war_exhaustion` RS 9775 / RBiH 8867 / HRHB 8562; min pair RBiH–HRHB = 305 units) ENOUGH terminal differentiation to satisfy what the metric exists to protect — differentiated `war_cost_index`, differentiated `COST_GRADE_CAPS`, and a live §6 atrocity term? The metric is a proxy; the real requirements are downstream.

## Answer (raw): NO — and neither is 9.14%. The metric is the wrong proxy.

`computeWarCostIndex` base = `exhaustionScore*0.4 + casualtyScore*0.4 + durationScore*0.2`, each sub-score `clamp01(value / reference)`:
- `exhaustion_full = 8000` · `casualties_full = 40000` · `duration_full_weeks = 156`.

### A) ADOPTED n153 (terminal_min_gap 3.05%) — decision_mode=historical, turn=188
| faction | exh | eS | casualties (k+w+m) | cS | dS | base | **war_cost_index** | **grade cap** | atrocity headroom |
|---|---|---|---|---|---|---|---|---|---|
| RBiH | 8867 | 1.000 | 355,933 | 1.000 | 1.000 | 1.0000 | **1.0000** | **C** | 0.0000 |
| RS | 9775 | 1.000 | 188,478 | 1.000 | 1.000 | 1.0000 | **1.0000** | **C** | 0.0000 |
| HRHB | 8562 | 1.000 | 46,532 | 1.000 | 1.000 | 1.0000 | **1.0000** | **C** | 0.0000 |

All three sub-scores saturate independently → `war_cost_index = 1.0000` for every faction → all capped at **C**, zero differentiation, zero atrocity headroom.

### B) n153 + n1 terminal exhaustion substituted (terminal_min_gap 9.14%) — isolates the spread
| faction | exh | eS | cS | dS | base | **grade cap** | atrocity headroom |
|---|---|---|---|---|---|---|---|
| RBiH | 7736 | 0.967 | 1.000 | 1.000 | 0.9868 | **C** | 0.0132 |
| RS | 8650 | 1.000 | 1.000 | 1.000 | 1.0000 | **C** | 0.0000 |
| HRHB | 3733 | 0.467 | 1.000 | 1.000 | 0.7867 | **C** | 0.2133 |

Even at 9.14% — with HRHB's exhaustion driven all the way down to 3733 (eS 0.467) — casualties (cS=1.0) + duration (dS=1.0) alone contribute 0.60, and HRHB's residual exhaustion adds 0.187 → base **0.7867 > 0.78** → **still C**. No faction escapes C. The extra 6 points of gap buys **nothing** downstream.

### C) §6 atrocity-term liveness (forced emergent mode on n153)
The atrocity inputs are strongly NON-ZERO (so the null movement below is caused by the `clamp01`, not by a missing atrocity signal):

| faction | war_crimes_events (ref 3) | refugees (ref 50k) | civ_cas (ref 5k) | atrocity sub-score | **atrocity penalty (×0.85)** |
|---|---|---|---|---|---|
| RBiH | 13 | 387,301 | 2,830 | 0.913 | +0.776 |
| RS | 39 | 1,100,308 | 27,541 | **1.000** | **+0.850 (max)** |
| HRHB | 18 | 137,037 | 1,011 | 0.840 | +0.714 |

| faction | base | emergent war_cost_index | **atrocity moved index by** | grade cap |
|---|---|---|---|---|
| RBiH | 1.0000 | 1.0000 | **0.0000** | C |
| RS | 1.0000 | 1.0000 | **0.0000** | C |
| HRHB | 1.0000 | 1.0000 | **0.0000** | C |

At base = 1.0000 the atrocity penalty is fully absorbed by `clamp01` → the bright-line term is **arithmetically inert**. The starkest case: **RS ran the largest cleansing campaign in the run (atrocity sub-score saturated at 1.0, the maximum +0.85 penalty) and it moved RS's cost index by literally nothing** because the index was already pinned at the ceiling. A faction that commits mass atrocity and one that does not both read `war_cost_index = 1.0` → identical grade cap. §6 Non-Goal #3 ("atrocity is never rewarded") is not expressible at these cost values — and this is caused by the same triple-saturation, so it is NOT fixed by any exhaustion-gap change.

### D) exhaustion-only sensitivity (casualties + duration saturated, which they always are in a full war)
`base = 0.6 + 0.4 * eS`.
- Escape **C** (base < 0.78) ⇒ `eS < 0.45` ⇒ terminal exhaustion **< 3600** (36% of the 10000 cap).
- Escape **B** (base < 0.60) ⇒ `eS < 0` ⇒ **impossible** while casualties + duration saturate.

## Why the grades are pinned (root, not the exhaustion gap)

1. **`casualties_full = 40000` is ~8× too low.** Real per-faction cumulative casualties are HRHB 46,532 · RS 188,478 · RBiH 355,933 → `casualtyScore = 1.0` for every faction in any full-length war. Fixed +0.40.
2. **`duration_full_weeks = 156 < 188`.** Any canonical-length campaign saturates duration → `durationScore = 1.0`. Fixed +0.20.
3. Those two alone floor `base` at **0.60** and, with realistic casualties, drive it to **1.0** — capping at C **before exhaustion is even considered**.
4. **`exhaustion_full = 8000`** sits *below* the adopted de-saturated terminal band (8562–9775), so all three `eS = 1.0`; the 3.05% spread lives entirely above the reference ceiling and is invisible to scoring.

The exhaustion-curve redesign is a genuine **engine-health** win (`first_saturation` 50→never, keystone `dead_weeks` 57.4%→0.5%) — but by construction it cannot flow through to grade/atrocity differentiation, because the `war_cost_index` pin is dominated by the Phase-3 scoring references (`casualties_full`, `duration_full_weeks`), and only secondarily by `exhaustion_full` relative to the terminal band.

## Proposed threshold re-derivation (DRAFT — for panel ratification)

1. **Accept `terminal_min_gap_pct ≥ 3.05%` (the adopted value), and DEMOTE it from a downstream-grade proxy to an advisory engine-health differentiation signal.** Numeric justification: the 5% target is not derived from any downstream requirement; empirically the maximum spread the retired friction fix could buy (9.14%, at a combat-floor cost of matched_osids 634→611 + a §6 Bihać flip) produces **identical** downstream results (all-C, atrocity inert). There is no downstream "knee" anywhere on the exhaustion-gap axis under the current scoring references — so chasing >3.05% is provably valueless until Phase 3 lands.
2. **Keep the exhaustion redesign's binding acceptance on the two metrics that ARE legitimate and that it passes:** `first_saturation_week ≥ 150` and keystone `dead_weeks_pct ≤ 15%`. Restate `terminal_min_gap` as "> 0 and monotonically non-recollapsing" (satisfied at 3.05%), not a 5% floor.
3. **Re-route the grade-unpin and atrocity-liveness objectives to Phase 3 (scoring references)** — the actual pins. The panel should record that the objectives `terminal_min_gap` was standing in for are only reachable by re-deriving `casualties_full` (per-faction, from `historical_baseline.json`), `duration_full_weeks` (from the 182-week canonical length + a severity factor), and `exhaustion_full` (coordinated with the new terminal band, e.g. anchored below the coolest faction's terminal so `eS` differentiates). Sensitivity (D) shows that once casualties/duration no longer saturate, terminal exhaustion below ~3600 begins to move the grade — so Phase 3 and the exhaustion terminal band must be co-derived, not sequenced blindly.

## Bottom line for the panel

3.05% is defensible **not** because it clears the bar the bar was set at, but because the bar itself measures the wrong thing: no achievable exhaustion-gap unpins the grades or the atrocity term under the current scoring references. Adopt 3.05% as an engine-health signal, and move the differentiation objective to Phase 3. (Confirms the prior finding recorded in memory `rbih_war_cost_index_always_saturates`.)
