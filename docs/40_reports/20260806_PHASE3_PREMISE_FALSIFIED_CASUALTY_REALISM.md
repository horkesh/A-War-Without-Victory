# Phase 3 premise falsified — grade-unpin is gated on combat-casualty realism, not scoring references

**Date:** 2026-08-06
**Status:** Owner decision — Phase 3 (scoring-reference re-derivation) DEFERRED to the post-1.0 combat-casualty-realism lane ([[lane3_casualty_realism_held_at_649]]). No engine/scoring code changed. The exhaustion/scoring lane's PRE-1.0 scope closes here with the de-saturation + canon banked.

## The premise, and why it's false

The exhaustion/scoring redesign plan (Phase 3, §92; brainstorm doc Part 8) asserted: *"fixing all three `COST_REFERENCE` values together moves the grade to A/B."* Measured offline against the real `scoring.ts` and the adopted `n153` per-faction cost inputs, this is **FALSE** under any canon-compliant reference set.

`computeWarCostIndex` base (`scoring.ts`):
```
base = 0.4·casualtyScore + 0.4·exhaustionScore + 0.2·durationScore
casualtyScore  = clamp01( (killed+wounded+missing) / casualties_full )
exhaustionScore= clamp01( exhaustion / exhaustion_full )
durationScore  = clamp01( weeks / duration_full_weeks )
```

**Sim per-faction casualties (n153): RBiH 355,933 · RS 188,478 · HRHB 46,532.** Canon §3.5 mandates `casualties_full` on the KIA+WIA+MIA **historical** basis (≈ ARBiH 137k / VRS 95k / HVO 35k). Sim output is **1.3–2.9× above** those references → `casualtyScore` **saturates to 1.0 for every faction and every strategy** (fixed +0.40). Duration saturates identically on any full 188-week run (+0.20 at `duration_full_weeks ≤ 188`). So `base ≈ 0.83–0.94` before differentiation, and `COST_GRADE_CAPS` caps every full campaign at **C**.

Calibration seat's offline sweep (adopted `n153` inputs):
| reference set | RBiH / RS / HRHB base | grades |
|---|---|---|
| A — canon-historical (137k/95k/35k, dur 188, exh=cap) | 0.955 / 0.991 / 0.942 | all C |
| B — canon + duration severity 1.5 | 0.888 / 0.924 / 0.876 | all C |
| C — canon HIGH end (155k/105k/40k, severity 2.0) | 0.858 / 0.895 / 0.846 | all C |
| D — `casualties_full` ABOVE sim output (**violates canon**) | 0.712 / 0.740 / 0.696 | uniform B (still no differentiation, no A) |

Only Set D reaches B — and it requires setting `casualties_full` above sim output, which is exactly the "mismatching the basis reproduces the saturation defect" path that canon §3.5 (A2 + the units-basis rule) now **forbids**. The earlier "references → A/B" premise was a Set-D-style (canon-violating) measurement; the canon landed 2026-08-06 (`86e5d9212`) retroactively rules it out.

## Root cause and why references can't fix it

The binding constraint is **the sim's casualty model runs ~2–3× historical** (combined KIA+WIA+MIA), so `casualtyScore` is pinned at 1.0 independent of references or strategy. The only de-saturated, faction-differentiated input is exhaustion (RS 9775 / RBiH 8867 / HRHB 8562), but a 0.74–0.98 `exhaustionScore` spread cannot cross a grade-cap boundary while casualties + duration pin `base ≥ 0.83`. Atrocity liveness is gated the same way: with `base ≥ 0.78` already, the additive atrocity term (max +0.85, clamped) cannot be grade-decisive.

**Therefore grade differentiation AND atrocity liveness are gated on combat-casualty realism — a known, deliberately post-1.0-shelved lane (`lane3_casualty_realism_held_at_649`) — not on scoring references or the exhaustion accumulator.**

## Why defer rather than land a correctness-only fix

Landing the per-faction `casualties_full` now is **behaviorally inert** (grades stay C while casualties run hot) and the *correct* reference value depends on the realistic casualty scale the casualty-realism lane will establish — so it must be **co-derived** with that lane (the same coupling canon §3.5 already states for `exhaustion_full` and the terminal band). Deferring is the correct engineering, not avoidance.

## Handoff to the casualty-realism lane (post-1.0)

When combat-casualty realism is picked up, bundle the Phase-3 scoring-reference re-derivation with it:
- Bring sim combined casualties toward the historical KIA+WIA+MIA scale (≈ ARBiH 137k / VRS 95k / HVO 35k).
- THEN set `casualties_full` per-faction with headroom above the realistic scale so `casualtyScore < 1.0` for sub-maximal wars — grades differentiate naturally, atrocity becomes grade-decisive.
- Re-derive `duration_full_weeks` (188 × severity — owner-reviewed) and `exhaustion_full` (vs the terminal band) in the same pass.
- Acceptance: ≥2 distinct grades across a strategy set + nonzero `war_cost_index_spread`; all canon A0–A3 invariants hold; state the new historical-baseline grade.

Canon §3.5 already documents the reachability condition correctly ("A/B reachable only when casualties, duration, AND exhaustion each stay below their references") — it is simply unmet today because casualties run hot. No canon change needed; canon is honest.
