# Architect Decisions: v0.6.0-alpha Night Shift Review

**Date**: 2026-03-22
**Reviewer**: Technical Architect
**Context**: Night shift completed 17 tasks for v0.6.0-alpha emergent event system infrastructure. 56 new tests, 93.1% calibration maintained. Three decisions and three opportunities flagged for day shift review.

---

## DECISION-1: Test placement in `tests/` root

**Night shift choice**: Tests placed in `tests/` root directory, not `src/sim/events/__tests__/`.

**Investigation**: The vitest config (`vitest.config.ts`) uses an explicit include array listing individual files, all under `tests/`. There are zero `__tests__/` directories used by vitest anywhere in the project source tree (only node_modules contain `__tests__/`). The `tests/` root directory contains 100+ test files -- every vitest test in the project lives here.

**Decision**: APPROVED. This is the correct convention, not a shortcut. The `src/sim/events/__tests__/` directory was never created. All project tests live in `tests/` root and are individually listed in the vitest include array. The night shift correctly followed the established pattern.

**Action required**: None.

---

## DECISION-2: `siege_active` and `operation_completed` stubs kept as `return false`

**Night shift choice**: Replaced handlers with `return false` + TODO comment rather than deleting them.

**Investigation**:
1. Both types ARE still present in the `EventCondition` union type (`src/sim/events/event_types.ts`, lines 15-16).
2. They are documented in the Systems Manual v0.7.0 (line 449-450) as planned condition types.
3. No event definition JSON files currently reference either condition type -- they are forward-declared but unused.
4. The `evaluateCondition` switch statement (line 335-340) has `return false` + TODO for both.
5. Two other conditions (`enclave_supply_status`, `corridor_severed`) follow the same pattern (lines 410-417) -- placeholder `return false` stubs for unimplemented features.

**Decision**: APPROVED. Keeping the stubs is correct. The type variants belong in the union because they are part of the v0.7.0 system design. Removing the type would create a break when siege/operation tracking is wired later. The `return false` behavior is safe (condition never fires) and the TODO leaves a clear breadcrumb. This is consistent with how `enclave_supply_status` and `corridor_severed` are handled in the same file.

**Action required**: None.

---

## DECISION-3: Emergency posture sweep uses `defaultValue=""` reset pattern

**Night shift choice**: Select element with `defaultValue=""` and `onChange` that resets value to empty after dispatching, rather than a button.

**Investigation**: The Army HQ has three `<select>` dropdowns at different levels:
- **Corps stance** (`ArmyHQCorpsCard.tsx` line 254): Uses `value={data.stance}` -- a controlled select that reflects current state. Standard persistent selection.
- **Sector stance** (`SectorsSection.tsx` line 176): Uses `value={sector.sector_stance}` -- same controlled pattern, reflects current state.
- **Emergency posture** (`ArmyHQModal.tsx` line 166): Uses `defaultValue=""` with `onChange` that resets to empty. This is a command dispatch, not a state reflection.

**Decision**: APPROVED WITH NOTE. The implementation is functionally correct and the pattern difference is justified. Corps/sector stance dropdowns reflect persistent state (you are viewing and can change the current stance). The emergency posture is a one-shot command ("set all corps to X") -- it has no resting state to display. The self-resetting select acts as a dropdown-button hybrid: pick an action, it fires, the label returns to "EMERGENCY POSTURE". This is the right UX for a bulk command vs. a state toggle.

**Note for future**: If a dedicated `<DropdownButton>` component is ever created for the warroom UI, this should migrate to it. The `e.target.value = ''` direct DOM mutation is a React anti-pattern (uncontrolled mutation outside React's knowledge). It works here because the element is uncontrolled (`defaultValue`, not `value`), but a proper React solution would use `useState` with a reset in the handler. Low priority -- cosmetic only.

**Action required**: None now. Minor refactor candidate if a warroom component library materializes.

---

## OPP-1: `as any` casts in evaluateCondition

**Night shift observation**: ~15 `as any` casts for state field access in `event_types.ts`.

**Investigation**: `evaluateCondition` receives `state: GameState`, where `state.military` is typed as `MilitaryState`. Checking `MilitaryState` in `game_state.ts`:
- `general_supply_reserve` -- line 1628, properly typed
- `negotiation` -- line 1733, properly typed (imports `NegotiationState`)
- `event_flags` -- line 1748, properly typed
- `event_fire_counts` -- line 1744, properly typed
- `event_last_fired_turn` -- line 1746, properly typed

All 11 `as any` casts in `event_types.ts` (lines 348-405) are casting `state.military` to `any` to access fields that are ALREADY properly declared on `MilitaryState`. The casts are unnecessary. The night shift likely added them defensively without checking the interface.

**Decision**: NO sub-interface needed. The fix is simpler: remove the `as any` casts and access fields directly via `state.military.general_supply_reserve`, `state.military.negotiation`, etc. The 1 cast in `evaluate_events.ts` line 74 (`(state.military as any).negotiation`) is equally unnecessary.

**Action required**: YES -- remove 12 `as any` casts across `event_types.ts` and `evaluate_events.ts`. Straightforward cleanup, ~15 minutes. Should be done before v0.6.0-beta to avoid the casts spreading as a pattern. Assign to next available session.

---

## OPP-2: Mutex group support in collect-then-fire

**Night shift observation**: The restructured `evaluateEvents` (collect-then-fire) naturally supports mutex groups with ~10 lines of dedup between sort and cap.

**Investigation**: The current flow in `evaluate_events.ts`:
1. Phase 1 (lines 158-178): Collect candidates
2. Phase 2 (lines 180-182): Sort by priority, cap at 3
3. Phase 3 (lines 184-234): Fire selected events

A mutex group dedup step between Phase 2 sort and Phase 3 fire would be trivial: iterate the sorted list, track seen mutex group IDs, skip duplicates. The structure is ready.

**Decision**: ACKNOWLEDGED, defer implementation. The structure is indeed ready, but there are zero events that need mutex groups today. Adding the dedup code before any consumer exists would be dead code. When v0.6.0-beta event migration creates the first mutex-needing events (e.g., competing diplomatic events that should not co-fire), add the ~10 lines then.

**Action required**: None now. Note in the v0.6.0-beta plan that mutex support is a 10-line addition when needed.

---

## OPP-3: DimensionStore type duplication

**Night shift observation**: `DimensionStore` in `strategic_dimensions.ts` duplicates the inline type on `NegotiationState.strategic_dimensions`.

**Investigation**:
- `strategic_dimensions.ts` line 14: `DimensionStore` = `{ [faction: string]: { [dimension: string]: { base_value, event_modifier, effective_value } } }`
- `negotiation_types.ts` line 145: `strategic_dimensions?: Record<string, Record<string, { base_value: number; event_modifier: number; effective_value: number }>>`

These are structurally identical. Currently `evaluate_events.ts` imports `DimensionStore` and casts the negotiation field to it (line 76).

**Decision**: `DimensionStore` in `strategic_dimensions.ts` should be CANONICAL. Rationale:
1. It is the named, exported interface -- easier to reference and refactor.
2. `strategic_dimensions.ts` owns all the manipulation functions (`applyDimensionShift`, `getDimensionEffective`, `updateBaseValue`) that operate on this type.
3. `NegotiationState` should import and use it rather than redeclaring the shape inline.

**Action required**: YES -- update `negotiation_types.ts` to import `DimensionStore` from `strategic_dimensions.ts` and use it for the `strategic_dimensions` field type. This eliminates the inline duplicate and the `as DimensionStore` cast in `evaluate_events.ts` line 76. ~5 minutes. Bundle with the OPP-1 cast cleanup.

---

## Summary

| Item | Verdict | Action Now? |
|------|---------|-------------|
| DECISION-1: Test placement | APPROVED | No |
| DECISION-2: Stub handlers | APPROVED | No |
| DECISION-3: Posture dropdown | APPROVED | No |
| OPP-1: `as any` casts | Remove casts, no sub-interface | Yes -- 12 casts to remove |
| OPP-2: Mutex groups | Defer until first consumer | No |
| OPP-3: DimensionStore | Canonicalize in strategic_dimensions.ts | Yes -- import in negotiation_types.ts |

**Recommended next action**: Bundle OPP-1 + OPP-3 into a single cleanup commit before starting v0.6.0-beta work. Estimated effort: 20 minutes. Run smoke-test triad after.
