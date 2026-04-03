# 2026-04-03 - Brigade reposition runtime retirement

## Summary
- Removed the dead `applyBrigadeRepositionOrders(...)` compatibility sink from the live war pipeline.
- Deleted the now-unused `src/sim/combat/apply_brigade_reposition.ts` file.
- Kept `brigade_reposition_orders` in the state schema only as explicit retired compatibility residue for older saves/tools.
- Hardened the legacy-contract test so the live war pipeline cannot quietly start consuming retired brigade reposition orders again.

## Why
- The shell already rejected new brigade reposition staging.
- The tactical-map adapter already hid `brigade_reposition_orders` from the player-facing shell.
- But the war pipeline still ran an `apply-brigade-reposition` step every turn even though the function only cleared legacy baggage and never changed live sector or movement truth.

That made brigade reposition another classic false-authority sink:
- not player-owned
- not engine-owned
- still executed in the canonical turn pipeline

## Files changed
- `src/sim/turn_phases/war_phases.ts`
- `src/state/game_state.ts`
- `tests/engine_honesty_legacy_contracts.test.ts`
- deleted:
  - `src/sim/combat/apply_brigade_reposition.ts`

## Implementation notes
- Removed the `apply-brigade-reposition` war-phase step.
- Removed the import of `applyBrigadeRepositionOrders(...)` from `war_phases.ts`.
- Updated the schema comment on `brigade_reposition_orders` to say what is actually true now:
  - old-save/tool residue only
  - no live runtime consumption
- Added a regression to `engine_honesty_legacy_contracts.test.ts` proving the war pipeline no longer contains this retired path.

## Verification
- `node .\node_modules\vitest\vitest.mjs run tests\engine_honesty_legacy_contracts.test.ts tests\front_assignment.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`

## Outcome
- The live war pipeline no longer spends a step on a dead reposition compatibility sink.
- Save compatibility remains honest without pretending the retired order type is part of current runtime authority.
