# 2026-04-02 - Map sector orders now use the canonical sector override lane

## Summary

This checkpoint closes a live split-authority bug in the desktop shell. The tactical-map click path looked like a brigade-to-sector command, but it was still calling the older `assignBrigadeToFront(...)` IPC route. That meant one player surface was secretly mutating `brigade_front_assignment/local_fronts` while other surfaces already used the canonical sector override lane.

## Root cause

- `src/ui/map/desktop/orderActions.ts`
  - `stageAssignBrigadeToSectorAction(...)` was mislabeled: the UI and queued-order text said "sector", but the implementation still called `ipc.assignBrigadeToFront(brigadeId, sectorId)`
- `src/desktop/desktop_sim.ts`
  - `assignBrigadeToFront(...)` still writes `state.military.brigade_front_assignment`
- `src/sim/combat/local_front_defense.ts`
  - `getLocalFrontDensityModifier(...)` still consumes `brigade_front_assignment/local_fronts`
- `src/sim/combat/combat_math.ts`
  - defender power still reads that local-front density modifier

So the bug was not just "wrong IPC method." It was a product-facing command accidentally reviving an older combat-affecting authority path.

## Implemented

- `src/ui/map/desktop/orderActions.ts`
  - `stageAssignBrigadeToSectorAction(...)` now routes through `ipc.assignBrigadeToSector(...)`
  - clarified the contract comment so future work knows this path must not write the older local-front lane
- `tests/ui_map_order_actions.test.ts`
  - added a regression proving the staged sector action calls `assignBrigadeToSector(...)`
  - proved it does not call `assignBrigadeToFront(...)`
  - proved the queued order is still recorded as a sector assignment for the UI shell
- `vitest.config.ts`
  - added the new regression file to the explicit Vitest include list so the guard actually executes in this branch

## Verification

- `node_modules\.bin\vitest.cmd run tests\ui_map_order_actions.test.ts tests\ui_map_render_smoke.test.ts`
  - PASS (`14` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

## Why this matters

- a player-visible sector command must not secretly mutate the older front-assignment authority path
- this kind of shell mismatch is exactly how legacy state writers survive after the architecture has supposedly moved on
- once one player surface keeps writing the older lane, later combat audits become much harder because sector truth and front-density truth diverge again

## Follow-up

- continue draining live desktop/UI surfaces that still expose or mutate legacy combat authority
- keep treating `brigade_front_assignment/local_fronts` as suspect until every remaining live writer is either retired or explicitly justified
