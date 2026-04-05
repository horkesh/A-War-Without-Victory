# v0.8.1 Phase 1 — State and Type Foundation

**Date:** 2026-04-05
**Type:** Implementation — v0.8.1 Commander Maturity Phase 1
**Baseline:** n1323 — 94.0%, 27/27 anchors, 6/6 benchmarks
**Verification:** tsc clean, 2378/2378 vitest (170 files), desktop:map:build clean

---

## Purpose

Lay the foundational commander-state structures for v0.8.1 with safe defaults and clean wiring, without materially changing commander behavior.

## Deliverables

### 1. New Type Structures (commander_state.ts)

Five new type structures added to `commander_state.ts`:

| Type | Purpose | Fields |
|---|---|---|
| `CommanderBeliefState` | Perception layer, distinct from raw truth | `zone_beliefs`, `supply_continuity_confidence`, `subordinate_reliability`, `neighbor_support_confidence` |
| `ZoneBelief` | Per-zone enemy posture belief | `zone_id`, `estimated_enemy_strength`, `estimated_enemy_intent`, `confidence`, `last_confirmed_turn` |
| `CommanderRelationships` | Trust model for order interpretation | `player_trust`, `sibling_corps_trust`, `patron_alignment` |
| `CommanderLesson` | Outcome memory affecting scoring | `lesson_id`, `category`, `zone_id`, `relevant_osids`, `weight`, `created_turn`, `expires_turn` |
| `CommanderLessonCategory` | 6 lesson categories | `offensive_failure`, `defensive_failure`, `reserve_misuse`, `intel_surprise`, `staging_delay`, `success_pattern` |
| `CommanderIntentCandidate` | Competing intent evaluation | `intent_id`, `type`, `target_zone`, `score`, `score_breakdown`, `blocked_by` |
| `CommanderIntentType` | 7 strategic intent types | `hold_line`, `reinforce_zone`, `stage_operation`, `launch_opportunity`, `thin_quiet_sector`, `recall_exposed_brigades`, `request_army_support` |
| `CommanderDecisionTrace` | Per-turn reasoning audit trail | `turn`, `winning_intent_id`, `candidates`, `hard_constraints`, `lessons_applied` |
| `CommanderIntelData` | Typed intel payload (was `unknown`) | `sector_intel`, `opsec_active_sectors` |

### 2. CommanderState Extended

Four new optional fields on `CommanderState`:

```typescript
belief_state?: CommanderBeliefState;
relationships?: CommanderRelationships;
lessons?: readonly CommanderLesson[];
decision_trace?: CommanderDecisionTrace;
```

All optional (`?:`) — old saves deserialize as `undefined`. No migration needed.

### 3. Safe Defaults Wired (emit.ts)

`buildUpdatedState` carries forward v0.8.1 fields from `previous_state`:

```typescript
belief_state: briefing.previous_state?.belief_state,
relationships: briefing.previous_state?.relationships,
lessons: briefing.previous_state?.lessons,
decision_trace: briefing.previous_state?.decision_trace,
```

Phase 1 is carry-forward only. Active population deferred to later phases.

---

## Soft Conditions Resolved

### A. `estimateTurnsActive` Suspend Counter Fix (plan.ts)

**Bug:** `suspendedTurns = turn - (plan.created_turn + estimateTurnsActive(plan, turn))` always computed 0 when plan was young, preventing plans from ever timing out via `MAX_SUSPENSION_TURNS`.

**Fix:** Added `suspended_since_turn?: number` to `CommanderPlan`. Suspension now tracks the actual turn suspension began. `suspendedTurns = turn - suspended_since_turn`. Cleared on resume (ready/executing transitions). Removed broken `estimateTurnsActive` function.

### B. Tightened Loose Types

| Field | Before | After |
|---|---|---|
| `CommanderBriefing.supply_by_osid` | `unknown` | `SupplyStateByOsidReport \| null` |
| `CommanderBriefing.intel_data` | `unknown` | `CommanderIntelData \| null` |
| `evaluateCorpsForces.supplyByOsid` | `unknown` | `SupplyStateByOsidReport \| null` |
| `getBrigadeSupplyState.supplyByOsid` | `unknown` | `SupplyStateByOsidReport \| null \| undefined` |
| `runCommanderForCorps.supplyByOsid` | `unknown` | `SupplyStateByOsidReport \| null` |
| `buildBriefing.supplyByOsid` | `unknown` | `SupplyStateByOsidReport \| null` |
| `collectIntelData` return | `unknown` | `CommanderIntelData` |

Removed 3 `as` casts in `decide.ts` and `force_eval.ts`.

---

## Tests Added

18 new tests in `tests/commander/commander_maturity_phase1.test.ts`:

| Category | Tests | Coverage |
|---|---|---|
| Type structures | 6 | Shape validation for all 5 new types |
| CommanderState persistence | 4 | Defaults, JSON round-trip, old save compat, key presence |
| Multi-turn continuity | 2 | Carry-forward with populated fields, undefined when absent |
| Suspension timeout fix | 3 | Records suspended_since_turn, preserves on re-suspend, abandons at MAX |
| Tightened types | 3 | supply_by_osid null, intel_data populated/null |

1 existing test updated: `commander.test.ts` — added `suspended_since_turn: 8` to suspension timeout test.

---

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/commander/commander_state.ts` | +5 type structures, +4 CommanderState fields, +1 CommanderPlan field, +CommanderIntelData, tightened supply_by_osid/intel_data, +SectorIntelRecord/SupplyStateByOsidReport imports |
| `src/sim/combat/commander/emit.ts` | Wire v0.8.1 field carry-forward in buildUpdatedState |
| `src/sim/combat/commander/plan.ts` | Fix suspend counter (suspended_since_turn), remove estimateTurnsActive, clear on resume |
| `src/sim/combat/commander/briefing.ts` | Tighten collectIntelData return type, add SupplyStateByOsidReport/SectorIntelRecord/CommanderIntelData imports |
| `src/sim/combat/commander/decide.ts` | Remove 2 `as` casts for intel_data |
| `src/sim/combat/commander/force_eval.ts` | Tighten getBrigadeSupplyState/evaluateCorpsForces parameter types, remove `as` cast |
| `src/sim/combat/commander/commander_loop.ts` | Tighten supplyByOsid parameter type, add SupplyStateByOsidReport import |
| `src/sim/combat/bot_corps_ai.ts` | Add `?? null` for supplyByOsid at call site |
| `tests/commander/commander_maturity_phase1.test.ts` | NEW — 18 tests |
| `tests/commander/commander.test.ts` | Updated suspension timeout test with suspended_since_turn |

---

## Behavior Safety Guarantees

1. **Zero behavioral change from type additions.** All new CommanderState fields are optional and carry-forward only (undefined → undefined).
2. **Suspension timeout now works correctly.** Previously broken — plans could never time out. Now bounded by `suspended_since_turn + MAX_SUSPENSION_TURNS`.
3. **Type tightening is narrowing only.** All `unknown` → concrete type changes are compatible with existing call sites. No runtime behavior change.
4. **Old saves compatible.** Missing v0.8.1 fields deserialize as `undefined`. Existing fields unchanged.

---

## Verification Results

- `npx tsc --noEmit`: clean
- `npm run test:vitest`: 2378/2378 (170 files, 0 failures)
- `npm run desktop:map:build`: clean (8.43s)

---

## Recommended Next Phase

**v0.8.1 Phase 2: Belief Layer** in `briefing.ts` and `decide.ts`.

Tasks:
- Add belief assembly/update helpers that transform raw intel into `CommanderBeliefState`
- Update beliefs each turn with confidence decay and confirmation
- Route initial decision logic through belief objects where possible
- Test for belief persistence and divergence from raw state
