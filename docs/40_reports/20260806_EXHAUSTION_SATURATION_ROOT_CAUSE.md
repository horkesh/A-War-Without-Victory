# Exhaustion saturation — root cause located (R6 exhaustion/scoring lane)

**Date:** 2026-08-06
**Run:** `runs/apr1992_definitive_188w__63a3a0858050b865__w188_n152` (hash `6d6d43f7f11afa80`), post Phase-0-fix-#1 (`db87adc7e`).
**Status:** Investigation finding — RAW mechanism. Interpretive ADOPT/RETIRE + the de-saturation calibration change belong to the scenario-tester (rate-limited until 2:30pm Sarajevo) / owner. Not yet implemented.

## What Phase 0 fix #1 proved (by NOT moving the metric)

Removing the faction-uniform `war_exhaustion` write from `applyBaselineOpsExhaustion` left the exhaustion-curve gate **byte-identical** to the failing baseline (`first_saturation_week 50`, `dead_weeks_pct 57.4%`, `terminal_min_gap_pct 0`, all three factions → 10000). Therefore baseline-ops was **not** the saturator. The saturator is the pipeline writer `updateExhaustion` (`src/sim/combat/exhaustion.ts`), run every war turn.

## The mechanism (empirical, weekly series)

```
wk  RBiH   dRBiH   RS     dRS    HRHB   dHRHB
 2    270  +158    349  +200    139   +82
 8   1190  +150   1549  +200   1041  +200
20   2901  +136   3949  +200   2660   +95
44   5810  +110   8749  +200   4884   +88
52   6690  +110  10000    +0   5945  +177
80   9770  +110  10000    +0  10000    +0
first-hit-10000:  RS wk51 · HRHB wk77 · RBiH wk83
terminal (wk188): RBiH 10000 · RS 10000 · HRHB 10000
```

- **`MAX_DELTA_PER_TURN = 200`, saturation cap `= 10000`** → minimum 50 turns to saturate at max delta.
- **RS's true (amplified) per-turn delta exceeds 200 every turn**, so it is clamped to a flat **+200/turn** and rises linearly to 10000 at **week 51**. RS static-front count (~27) × 2 = 54 raw, then × friction-multiplier × (1 + externalMod + legitimacyMod) + Sarajevo besieger extra pushes the true value past the 200 clamp continuously.
- **RBiH** (+150 tapering to +110) and **HRHB** (variable +80–200) are not always clamped, but still accumulate monotonically (Engine Invariants §8 — irreversible) to the cap by weeks 83 / 77.
- After each faction hits 10000 it stays (§8 monotonic) → **57.4% of the war** all three sit within 1% of each other, and the terminal gap is **0**.

## Root cause

The accumulator's **delta-to-cap ratio is far too high for a 188-week horizon**, and the `MAX_DELTA_PER_TURN` clamp **homogenises** the high-input factions:

1. **Saturation-too-early:** 10000 / 200 = 50 weeks. The hottest faction reaches the ceiling ~⅓ of the way through the war. The 2026-05-22 rescale (100→10000 cap, 10→200 delta) moved first-saturation t13→t50 but kept the same delta:cap ratio class, so it did not solve saturation over 188 weeks.
2. **Differentiation-killer:** the flat `MAX_DELTA_PER_TURN` clamp catches every faction whose friction/legitimacy/Sarajevo-amplified delta exceeds 200 (RS always; RBiH/HRHB intermittently), collapsing distinct inputs to an identical +200 → identical trajectories → terminal gap 0.

Downstream consequence (the reason this lane exists): `war_cost_index` is derived from a saturated `war_exhaustion`, so `COST_GRADE_CAPS` caps **every** full-length campaign at grade C, and the §6 atrocity bright-line term is arithmetically inert once the field is pinned at the cap.

## The lever (de-saturation change — NOT yet made)

Preserve §8 monotonicity (never decrease) while making terminal `war_exhaustion` **spread below the cap** across 188 weeks:

- The hottest faction should *approach* (not slam into) 10000 only near week 188 → sustained effective delta on the order of **~50/week**, with cooler factions ending materially lower (e.g. ~9000 / ~6000 / ~4000, not 10000/10000/10000).
- This means reworking the **delta scale AND the clamp** so distinct faction inputs produce distinct trajectories — lowering the `MAX_DELTA` clamp alone would make MORE factions hit it and homogenise further (wrong direction).

**Cost of the change (why it is not a one-liner):** the 10000 scale is load-bearing for every downstream gate keyed to it — `WASH_COMBINED_EXHAUSTION 5500`, `CEASEFIRE_HRHB_EXHAUSTION 3500`, `CEASEFIRE_RBIH_EXHAUSTION 3000`, combat-tempo thresholds `3000/8000`, plus `STORM_COMBINED_EXHAUSTION` and `formation_fatigue`. Any change to the cap/delta must **re-rescale those gates in lockstep** or the Washington Agreement / bilateral-ceasefire / Operation Storm fire-weeks (the Federation timeline) shift. This is exactly the plan's "three rescale gates" + "§8 monotonicity" Phase 0 items, feeding the Phase 3/4 accumulator redesign.

## Recommendation

Route the de-saturation design to the scenario-tester at 2:30pm: rework `updateExhaustion` delta/clamp/cap so terminal values differentiate, **bundled with** the downstream-gate re-rescale, validated in ONE 188w run against (a) the exhaustion-curve gate (targets: first_saturation ≥150, dead_weeks ≤15%, terminal_gap ≥5%), (b) matched_osids ≥630, (c) unchanged Washington/ceasefire/Storm fire-weeks, (d) §6 fall/hold.
