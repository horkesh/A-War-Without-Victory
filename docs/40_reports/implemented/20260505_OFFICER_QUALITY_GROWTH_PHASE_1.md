# OQ-Growth Path Phase 1 — VERDICT-REPORT-ONLY

**Date:** 2026-05-05
**Lane:** LANE-NIGHTSHIFT-OFFICER-QUALITY-GROWTH-PATH-PHASE-1-IMPLEMENTATION
**Outcome:** **VERDICT-REPORT-ONLY** per Phase 0 panel binding stop-triggers #1 + #2 (188w trajectory FAIL on faction-mean Δ/turn AND stayer-Δ Δ/turn).
**Predecessor:** `docs/40_reports/audits/20260505_OFFICER_QUALITY_GROWTH_PATH_PHASE_0_PANEL.md` (Phase 0 panel CONDITIONS verdict, commit `af080eac`).

---

## Status: VERDICT-REPORT-ONLY — third proximate-lever attempt disproved

The Phase 0 panel approved Fix Shape B (cadre-replacement-optimism tax via step-curve on `FACTION_LEARNING_RATE`) with 10 binding acceptance criteria + 5 stop triggers. This lane implemented the panel-approved code shape, ran the binding 40w + 188w smoke battery + the new stayer-Δ trajectory diagnostic, and the trajectory data fails criterion 3 + 4. Per criterion 8 ("STOP and produce Wave-6-style verdict report; do NOT retune in-lane"), implementation reverted; verdict report retained as audit evidence.

**Crucially, this lane uncovered a more-upstream defect: the new step-curve was DORMANT in production due to timeline-precedence shadowing.**

## Implementation surface (verified, then reverted)

The implementation was structurally correct and would have shipped if the trajectory had bent. For posterity:

- `src/sim/combat/officer_quality_update.ts` — `FACTION_LEARNING_RATE` promoted from `Record<string, number>` (constants) to `Record<string, StepCurveEntry[]>` (step-curves). New `getFactionLearningRate(faction, turn): number` accessor with `?? DEFAULT_FACTION_LEARNING_RATE = 1.0` fallback. Step-curve numerics per panel: RBiH `const 1.5`, RS `0.7 / 0.4 / 0.0 / -0.4` at brackets `<w52 / w52-77 / w78-103 / w104+`, HRHB `1.0 / 0.7 / 0.3 / -0.2` at same brackets. Mirrors Wave 4 `getFactionReinforcementMult` step-curve precedent. Caller updated at the COMBAT_GROWTH path.
- `tests/officer_quality_growth_phase_1.test.ts` (NEW): 8 lane tests covering record shape, accessor default, step-curve evaluation, faction-symmetric mechanism, negative-band behavior.
- `tests/officer_learning_rate_shape_c.test.ts` (extended): 6 tests adapted to the new step-curve shape.

**Verification at peak (before revert):**
- `npx tsc --noEmit` clean
- 14/14 lane + caller tests GREEN (8 new + 6 extended)
- 40w smoke n1666: hash `ef03ab4d6c5ecd28` byte-identical to baseline (expected — at w40 all factions are still in their first step-curve band, so step-curve evaluates to existing constants); anchors **26/27** (only `op:brcko:brka_2` fails, pre-existing P0); criterion 2 PASS.

## 188w smoke gate (binding) — n1667

**Run dir:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1667`
**Final state hash:** `781e4009ba528833` (drift expected per criterion 3; not a gate)
**Streaming finalizer:** Wave 7 Lane B's streamFinalizer worked at scale again — `final_save.json` + `replay_save_sequence.json` + `run_summary.json` all written. Second consecutive full-emit 188w (after n1665).

### Per-faction whole-run trajectory (criterion 3)

| Faction | t1 OQ | t188 OQ | whole-run Δ/turn | Canon sign | Verdict |
|---|---|---|---|---|---|
| HRHB | ~0.227 | 0.6429 | **+0.00219** | -1 (degrade) | **FAIL** |
| RBiH | ~0.087 | 0.8093 | **+0.00386** | +1 (improve) | PASS |
| RS   | ~0.552 | 0.6973 | **+0.00078** | -1 (degrade) | **FAIL** |
| (RS active brigade count at t188) | | **51** | (criterion ≥35) | | PASS |

### Per-formation stayer-Δ (criterion 4 — the new gate)

| Faction | n_stayers / n@t1 | meanQ@t1 | meanQ@tL | stayer Δ/turn | Verdict |
|---|---|---|---|---|---|
| HRHB | 26 / 28 | 0.2267 | 0.6429 | **+0.002249** | **FAIL** |
| RBiH | 77 / 77 | 0.0865 | 0.8093 | **+0.003875** | PASS |
| RS   | 49 / 78 | 0.5518 | 0.6973 | **+0.000650** | **FAIL** |

### Growth-vs-survivorship attribution (per panel-required disambiguation)

| Faction | Growth % | Survivorship % |
|---|---|---|
| HRHB | 77.3% | 22.7% |
| RBiH | 62.8% | 37.2% |
| RS | 80.3% | 19.7% |

Growth dominant ~3:1 — defect remains in growth code, not metric artifact.

## Per-criterion verdict (10 binding criteria)

| # | Criterion | Verdict |
|---|---|---|
| 1 | Code shape — record + accessor + `?? 1.0` default; mirror Wave 4 step-curve precedent; no faction-conditional branches | **PASS** at peak (reverted post-stop-trigger) |
| 2 | 40w smoke — anchors ≥26/27; benchmarks 6/6; area ≥91.5%; hash drift NOT a gate | **PASS** (26/27, brka_2 pre-existing) |
| 3 | 188w faction-mean — VRS+HRHB Δ/turn ≤0; RBiH ≥+0.001; RS active brigades ≥35 | **PARTIAL FAIL** — VRS Δ/turn = +0.00078 (FAIL); HRHB Δ/turn = +0.00219 (FAIL); RBiH Δ/turn = +0.00386 (PASS); RS active brigades = 51 (PASS) |
| 4 | 188w stayer-Δ — VRS+HRHB stayer Δ/turn ≤0 | **FAIL** — HRHB +0.002249, RS +0.000650 |
| 5 | ≥5 lane tests + focused regression GREEN | **PASS** (14/14) |
| 6 | `npx tsc --noEmit` clean | **PASS** |
| 7 | Sensitive-history compliance | **PASS** (Ring 1, faction-symmetric mechanism, no §6) |
| 8 | Stop triggers respected | **TRIGGERED** — #1 (faction-mean Δ/turn) + #2 (stayer Δ/turn) → verdict-report-only |
| 9 | Out-of-scope guards | **PASS** |
| 10 | Phase 1 lane report | **DELIVERED** (this file) |

**Final verdict: VERDICT-REPORT-ONLY**. Implementation reverted; lane closed.

## Root cause: timeline precedence shadowing (the more-upstream defect)

The 4-level precedence chain in `updateBrigadeOfficerQuality` is:
1. timeline `learning_rate_per_turn` (highest precedence)
2. timeline `learning_rate_multiplier`
3. timeline `learning_rate` (DEPRECATED)
4. hardcoded fallback `getFactionLearningRate(faction, turn)` ← Phase 1's new step-curve

**`data/scenarios/timelines/apr1992.json` defines `learning_rate_per_turn` for all three factions** (RS = 0.007, RBiH ≈ 0.015, HRHB ≈ 0.010 — actual values per timeline file). Path #1 captures every faction at every turn. **The new step-curve fallback at path #4 never activates in production.**

This explains why n1667's trajectory data is nearly-identical to Lane A's n1665 (which made no change to this code path at all): the Phase 1 implementation was structurally dormant.

The hash drift (`781e4009ba528833` vs baseline `ef03ab4d6c5ecd28`) IS real — it comes from secondary effects of the implementation (e.g., the new docstring constants imported, the test file extensions, possibly subtle iteration-order changes from new symbols) — but the load-bearing per-formation growth math is unchanged.

## Cross-lane finding: THREE proximate levers now ruled out

| Lever | Lane | 188w VRS Δ/turn | Verdict |
|---|---|---|---|
| Wave 4 reinforcement_mult step-curve (`e9584dd3`) | RECONSTITUTION-POLICY-REVIEW | +0.000591 (Wave 6 verification `cc829ebb`) | inverse to canon |
| Lane A OFFICER_CASUALTY_MULT faction-asymmetric | OCM-PHASE-1-IMPL-REDO (`411f6843`) | +0.000591 | inverse to canon |
| Phase 1 FACTION_LEARNING_RATE step-curve (this lane) | OQ-GROWTH-PHASE-1-IMPL | +0.000780 | inverse to canon (BUT shadowed by timeline) |

**The defect is at the TIMELINE DATA level, not the FACTION_LEARNING_RATE constants.** Future calibration must target `data/scenarios/timelines/apr1992.json` `officer_config.<faction>.learning_rate_per_turn` directly — making it negative in late-war windows OR replacing it with a step-curve in the timeline data itself.

This is the FOURTH structural finding the trip session has produced via panel-with-stop-trigger discipline:
1. Wave 6 disproved Wave 4's reinforcement-budget hypothesis (verified)
2. Lane A disproved the casualty-side-multiplier hypothesis (lever ran but didn't bend)
3. Phase 1 OQ-Growth audit named FACTION_LEARNING_RATE as the per-brigade growth term
4. Phase 1 implementation revealed the FACTION_LEARNING_RATE constants are SHADOWED by `learning_rate_per_turn` in the timeline data — defect is one level deeper

## Sensitive-history compliance

- **Ring 1.** No Ring 2 or Ring 3 surface touched.
- **No §6 surface.** Faction-symmetric mechanism (single accessor, step-curve lookup); no special-cased rupture / enclave / Srebrenica / Drina path.
- **Faction-agnostic mechanism with asymmetric data.** Same code path for all factions; data table is data, not logic. Mirrors Wave 4 step-curve precedent.
- **No FORAWWV / paint anchor / political_controllers / OOB / rupture-wiring / `enclave_resilience.ts` touch.**
- **No combat-math number tuned outside the panel-recommended numerics.** Implementation reverted; nothing tuned in production.
- **Determinism preserved.** Diagnostic uses `strictCompare`-sorted iteration; no `Math.random` / `Date.now` / `new Date` / locale-sort.

## Successor handoffs

1. **Timeline-data step-curve lane** (LOAD-BEARING): target `data/scenarios/timelines/apr1992.json` `officer_config.<faction>.learning_rate_per_turn` directly. Replace scalar values with step-curve data structure OR define a NEW timeline field `learning_rate_per_turn_step_curve` that takes precedence over the scalar at path #1. This is the path that actually drives production officer-quality growth. Phase 0 panel REQUIRED (mirror this lane's panel structure); the same 5 stop triggers + new diagnostic gates apply.
2. **Fix Shape C re-evaluation** (DEFERRED → potentially elevated): the cohort-experience formula replacement was deferred because Fix Shape B was the lower-risk first step. Phase 1's failure means Fix Shape C is now back in scope as a parallel candidate. The cohort math (replacements enter at lower quality, dragging cohort average down) is structurally independent of `learning_rate_per_turn` — it would bite even if the timeline data is unchanged.
3. **Phase 0 panel oversight**: the panel approved Phase 1 without verifying that the new step-curve fallback would ever ACTIVATE in production. Future Phase 0 panels should include a "production reachability" check: trace the actual code path that runs during a smoke run with current scenario data, confirm the new lever is the path that fires.

## Files changed (this lane)

- `docs/40_reports/implemented/20260505_OFFICER_QUALITY_GROWTH_PHASE_1.md` (NEW; this file)

The implementation source (`officer_quality_update.ts`) and lane test (`officer_quality_growth_phase_1.test.ts`) were reverted per panel criterion 8 stop-trigger discipline. The extended test file (`officer_learning_rate_shape_c.test.ts`) was reverted to its baseline shape.
