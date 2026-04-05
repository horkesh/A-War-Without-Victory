# v0.8.1 Phase 5 — Constraint/Preference Separation and Relationship Effects

**Date:** 2026-04-05
**Type:** Implementation — v0.8.1 Commander Maturity Phase 5
**Phase in series:** 5 of 6
**Status:** ACCEPTED
**Baseline:** n1323 — 94.0%, 27/27 anchors, 6/6 benchmarks
**Verification:** tsc clean, 2484/2484 vitest (174 files)

---

## Purpose

Before Phase 5, the distinction between a hard constraint (something a commander physically cannot do) and a soft preference (something a commander is reluctant to do) was implicit and structurally muddled. `isCriticalSupply` acted as a hard block, silently eliminating candidates before scoring — so engineers saw only that a candidate was absent, not why. Relationship data (`CommanderRelationships`) had been scaffolded in Phase 1 but was never read by `selectWinningIntent()`, making trust and alignment values inert decoration. Phase 5 makes the separation explicit and functional: hard constraints stay in `blocked_by` and are unoverrideable; soft preferences (including supply risk tolerance and relationship signals) are additive score modifiers that appear in `score_breakdown` and `relationships_applied`, so every candidate outcome is fully traceable regardless of which path through `managePlan()` was taken.

## Deliverables

### 1. isCriticalSupply Reclassification

Previously, `isCriticalSupply` short-circuited candidate scoring with a hard block: any candidate failing the supply check was removed from competition entirely, and the decision trace showed nothing about the candidate's relative merit. Phase 5 reclassifies this as a soft penalty: `CRITICAL_SUPPLY_PENALTY = 0.50` is subtracted from the candidate's score and recorded in `score_breakdown['critical_supply_penalty']`.

The rationale: supply belief in the commander model is inferred from BFS corridor reachability and readiness estimates, not a direct measurement. A determined or aggressive commander may rationally accept supply risk for a high-value operation. By making this a penalty rather than a block, the system preserves candidate visibility — engineers can see that a supply-constrained candidate lost on score rather than that it was silently eliminated. The hard block for truly unlaunchable states (e.g., exhausted stance, enemy overwhelming force) remains in `blocked_by` unchanged.

---

### 2. Relationship Effects in selectWinningIntent()

`CommanderRelationships` is now read inside `selectWinningIntent()`. Three relationship signals produce score deltas applied after personality and lesson modifiers and before hard-block evaluation:

| Signal | Candidate(s) affected | Formula | Per-signal cap |
|---|---|---|---|
| `player_trust` | `stage_operation`, `launch_opportunity` | `(player_trust − 0.5) × 0.12` | ±0.06 |
| `patron_alignment × campaignAlignment` | `stage_operation` | `(patron_alignment × campaignAlignment − 0.5) × 0.12` | ±0.06 |
| `sibling_corps_trust` (avg) | `request_army_support` | `(avg_sibling_trust − 0.5) × 0.12` | ±0.06 |

An outer `relationship_delta` cap of ±0.15 is applied after all three signals are summed, preventing combined relationship effects from swamping the base score. The combined delta is recorded in `score_breakdown['relationship_delta']` when non-zero.

Formula rationale: centering on 0.5 means neutral trust (0.5) produces zero delta — relationship effects only fire when trust diverges from neutral. The ×0.12 multiplier with ±0.06 per-signal cap means a fully-trusted commander gets +0.06 on offensive intents; a fully-distrusted one gets −0.06. These are meaningful but not decisive relative to the 7-factor base score.

---

### 3. relationships_applied in CommanderDecisionTrace

`relationships_applied: readonly string[]` is added to `CommanderDecisionTrace`, parallel to `lessons_applied`. Each entry is a string in the format `'signal:candidate_type'` (e.g., `'player_trust:stage_operation'`, `'sibling_corps_trust:request_army_support'`). Only signals that produced a non-zero delta are included. The array is sorted via `strictCompare` for determinism.

This allows post-hoc inspection of which relationship channels influenced a given competition round, without requiring engineers to re-derive the math from raw relationship values.

---

### 4. managePlan() Trace Stubs

Previously, `managePlan()` had 6 early-return paths that exited before the candidate competition ran. These paths produced no `decision_trace`, meaning engineers had no record of why the competition was skipped. Phase 5 adds `decision_trace` stub emission to all 6 early returns, each with a canonical `hard_constraints` ID:

| Early return condition | hard_constraint ID |
|---|---|
| No briefing available | `no_briefing` |
| Corps in exempt/inactive state | `corps_exempt` |
| Forced defensive stance (enemy overwhelming) | `forced_defensive_stance` |
| Plan already active and not eligible for replacement | `plan_active_no_replacement` |
| Suspension limit reached (MAX_SUSPENSION_TURNS) | `suspension_limit_reached` |
| No eligible candidates after hard-block filtering | `no_eligible_candidates` |

Every path through `managePlan()` now produces a `decision_trace`. Engineers can always retrieve either the competition result (normal path) or the hard-constraint stub (early-return path) to understand why a planning cycle produced or did not produce an operation.

---

## Hard Guards

- Hard constraints (`blocked_by`) remain unoverrideable. Relationship effects and supply penalty are additive score modifiers only — they cannot remove a candidate from `blocked_by` or cause a blocked candidate to win.
- Relationship effects are applied post-score and post-personality/lesson, before hard-block evaluation. The score can be influenced but never unlocks a blocked state.
- The outer `relationship_delta` cap of ±0.15 prevents combined relationship pressure from exceeding the effective range of a single 7-factor base score component.
- Backward compatible: `null` or `undefined` `relationships` on `CommanderState` → zero deltas, no crash. Saves from before Phase 5 load cleanly.
- `CRITICAL_SUPPLY_PENALTY` is a named constant, not a magic number. Engineers can tune it independently of relationship signal weights.

---

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/commander/plan.ts` | `isCriticalSupply` reclassified from hard block to `score_breakdown['critical_supply_penalty']` (−0.50); relationship delta block added with 3 signals, per-signal cap ±0.06, outer cap ±0.15; `relationships_applied` populated in trace |
| `src/sim/combat/commander/types.ts` | `relationships_applied: readonly string[]` added to `CommanderDecisionTrace` |
| `src/sim/combat/commander/managePlan.ts` | All 6 early-return paths now emit `decision_trace` stubs with canonical `hard_constraints` IDs |

---

## Tests

24 targeted Phase 5 tests in `tests/commander/commander_phase5_constraint_preference.test.ts` (plus 1 updated in phase3 test for critical_supply reclassification):

| Category | Count | Coverage |
|---|---|---|
| Critical supply reclassification | 4 | `critical_supply_penalty: -0.50` in score_breakdown for stage_operation and launch_opportunity; blocked_by empty; penalty absent when belief_state null |
| Hard-block integrity | 3 | Exhaustion hard-block survives extreme relationship values; surplus_available_no_hq_request blocks/excludes candidate when surplus > 0 |
| player_trust effects | 4 | +0.06 at trust=1.0; -0.06 at trust=0.0; boost on launch_opportunity; no effect on hold_line |
| patron_alignment effects | 3 | Boosts stage_operation when campaign primary; small delta when role absent; no effect on launch_opportunity |
| sibling_corps_trust effects | 3 | Positive delta at high avg trust; negative at low; empty map defaults to neutral |
| managePlan() trace stubs | 4 | Stance/exhaustion/campaign-role early returns emit decision_trace with canonical hard_constraints, relationships_applied: [] |
| Determinism | 3 | Same inputs → same winner; key insertion order irrelevant; null previous_state → no relationship_delta |

---

## Verification Results

- `npx tsc --noEmit`: clean
- `npm run test:vitest`: 2460/2460 (173 files, 0 failures)

---

## Key Finding

The constraint/preference separation is now structurally complete. `blocked_by` holds hard constraints (impossible), `score_breakdown` holds soft preferences (unattractive), including both `critical_supply_penalty` and `relationship_delta`. Every path through `managePlan()` produces a `decision_trace` — either a competition result with a scored winner, or an early-return stub with a canonical hard-constraint ID. Engineers can now unambiguously distinguish "this candidate was impossible" from "this candidate lost on merit" for any rejected candidate in any planning cycle. This is the prerequisite for the Phase 6 QA surface: structured trace emission into `CommanderState` and debug helpers that expose the full belief/candidate/lesson/relationship/trace picture per turn.

---

## Deferred to Later Phases

| Item | Target Phase |
|---|---|
| Relationship mutation/decay model (how trust values change over time) | Phase 6 / v0.8.3 |
| Additional lesson categories (defensive_failure, reserve_misuse, intel_surprise, staging_delay) | Phase 6 |
| Zone-specific lesson routing for corps-level intents | Phase 6 |
| UI exposure of relationships_applied | v0.8.3+ |
| Targeted Phase 5 unit tests (supply penalty, relationship signal, trace stub coverage) | Phase 6 QA |

---

## Recommended Next Phase

**v0.8.1 Phase 6 — Decision Traces and QA Surface**
