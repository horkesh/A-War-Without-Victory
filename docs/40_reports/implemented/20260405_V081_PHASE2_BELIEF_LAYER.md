# v0.8.1 Phase 2 — Belief Layer

**Date:** 2026-04-05
**Type:** Implementation — v0.8.1 Commander Maturity Phase 2
**Baseline:** n1323 — 94.0%, 27/27 anchors, 6/6 benchmarks
**Verification:** tsc clean, 2392/2392 vitest (171 files), desktop:map:build clean

---

## Purpose

Give corps commanders a persistent perception layer between raw intel and decisions. Commanders now form beliefs about enemy strength, enemy intent, supply continuity, subordinate reliability, and neighbor support — then route decision logic through those beliefs instead of raw data. Beliefs blend new observations with prior beliefs, decay toward baseline without contact, and persist across turns.

## Deliverables

### 1. Belief Assembly (belief.ts — NEW)

New file `src/sim/combat/commander/belief.ts` containing `assembleBeliefState()` — a pure, deterministic function that builds `CommanderBeliefState` from raw intel, force assessments, and previous beliefs.

| Belief Component | Source | Blending | Decay |
|---|---|---|---|
| `estimated_enemy_strength` (per zone) | Raw intel force estimates | 0.7 new / 0.3 previous | Toward baseline without contact |
| `estimated_enemy_intent` (per zone) | Concentration, attack, probe signals | Categorical: mass / attack / probe / hold / unknown | 3-turn staleness decay to unknown |
| `confidence` (per zone) | `IntelPicture` confidence | Direct from intel | — |
| `last_confirmed_turn` (per zone) | Current turn on contact | — | — |
| `supply_continuity_confidence` | Ratio of non-critical OSIDs in corps territory | Direct computation | — |
| `subordinate_reliability` (per brigade) | Fitness, combat effectiveness, disruption | 0.7 new / 0.3 previous | — |
| `neighbor_support_confidence` (per adjacent corps) | Stance and active operations | 0.6 new / 0.4 previous | — |

### 2. Commander Loop Integration (commander_loop.ts)

Step 3.5 "ASSEMBLE BELIEFS" inserted between PLAN (Step 3) and DECIDE (Step 4):

```
Step 1: ASSESS
Step 2: ALLOCATE
Step 3: PLAN
Step 3.5: ASSEMBLE BELIEFS  ← NEW
Step 4: DECIDE (now receives beliefState)
Step 5: EMIT (now receives beliefState)
```

`assembleBeliefState` called with `allocation.zones`, `forces`, `previousBeliefs`, and `turn`. Result passed downstream to `makeDecisions` and `emitCommanderOutput`.

### 3. Belief Persistence (emit.ts)

`emitCommanderOutput` accepts `beliefState` parameter. `buildUpdatedState` now persists the actively assembled `belief_state` on `CommanderState`, replacing Phase 1's carry-forward-only wiring.

### 4. Decision Seams Rerouted (decide.ts)

Two decision seams now route through beliefs when available, with raw fallback when beliefState is null/undefined:

| Seam | Before | After |
|---|---|---|
| `computeStanceChanges` — enemy massing detection | Raw `concentrationSectors` | `ZoneBelief.estimated_enemy_intent === 'mass'` via belief layer |
| `computeReserveShifts` — escalated zone prioritization | Unordered escalation | Sorted by `ZoneBelief.estimated_enemy_strength` (highest first) |

`findZoneBeliefForSector` helper added to map sector OSIDs to zone beliefs via OSID overlap.

---

## Tests Added

14 new tests in `tests/commander/commander_belief_layer.test.ts`:

| Category | Tests | Coverage |
|---|---|---|
| Belief creation | 3 | Zone beliefs from zones+intel, supply confidence, subordinate reliability |
| Belief persistence | 3 | Beliefs survive turn cycle, blend with previous, persist on CommanderState |
| Stale decay | 3 | Intent decays to unknown after 3 turns, strength decays toward baseline, confidence drops without contact |
| Determinism | 2 | Same inputs produce identical output, sorted iteration |
| Decision consumption | 3 | Stance change uses belief intent, reserve shift uses belief strength, null fallback to raw |

2 existing tests updated in `tests/commander/commander_maturity_phase1.test.ts` to reflect that `belief_state` is now actively assembled (no longer `undefined` after a commander loop run).

---

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/commander/belief.ts` | NEW — `assembleBeliefState()` pure function, zone belief blending, supply/subordinate/neighbor confidence |
| `src/sim/combat/commander/commander_loop.ts` | Step 3.5 ASSEMBLE BELIEFS inserted, belief passed to decide + emit |
| `src/sim/combat/commander/decide.ts` | `makeDecisions` accepts optional `beliefState`, `computeStanceChanges` routes massing through beliefs, `computeReserveShifts` sorts by believed strength, `findZoneBeliefForSector` helper |
| `src/sim/combat/commander/emit.ts` | `emitCommanderOutput` accepts `beliefState`, `buildUpdatedState` persists active belief_state |
| `tests/commander/commander_belief_layer.test.ts` | NEW — 14 tests across 5 categories |
| `tests/commander/commander_maturity_phase1.test.ts` | 2 tests updated for active belief assembly |

---

## Behavior Safety Guarantees

1. **Zero behavioral regression.** Raw fallback preserved when `beliefState` is null/undefined. All existing tests pass unchanged (except 2 Phase 1 tests updated for active assembly).
2. **Backward compatible.** `makeDecisions` parameter is optional — callers without belief state continue to work identically.
3. **Deterministic.** `assembleBeliefState` is a pure function with no randomness, no timestamps, sorted iteration throughout.
4. **Old saves compatible.** `belief_state` on `CommanderState` remains optional — missing field deserializes as `undefined`, triggering first-turn belief assembly from scratch.

---

## Verification Results

- `npx tsc --noEmit`: clean
- `npm run test:vitest`: 2392/2392 (171 files, 0 failures)
- `npm run desktop:map:build`: clean

---

## Recommended Next Phase

**v0.8.1 Phase 3: Candidate Intent Competition** in `plan.ts`.

Tasks:
- Populate `CommanderIntentCandidate` with competing intents (hold_line, reinforce_zone, stage_operation, etc.)
- Score candidates against zone beliefs, subordinate reliability, and supply confidence
- Select winning intent per turn, record in `CommanderDecisionTrace`
- Route plan creation/modification through winning intent rather than fixed priority
