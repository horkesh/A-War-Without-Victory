# 2026-04-02 - Retire front assignment from the live player shell

## Summary

This checkpoint removes `assignBrigadeToFront` and `brigadeFrontAssignment` from the live desktop/UI player shell. The tactical map had already moved to the canonical brigade-sector override model, but the preload bridge, IPC contract, adapter, and sidebar still taught the product that front assignment was a current player-facing concept.

While validating that removal, two separate `GameStateAdapter` robustness bugs also surfaced:
- sparse state fixtures without `displacement` still crashed the parser
- OPSEC sectors were being read from the wrong state branch for command briefing generation

## Root cause

- `src/desktop/preload.cjs`
  - still exposed `assignBrigadeToFront(...)` to the live renderer
- `src/ui/map/desktop/useIPC.ts`
  - still advertised `assignBrigadeToFront(...)` in the React IPC contract
- `src/desktop/electron-main.cjs`
  - still handled `assign-brigade-to-front`
- `src/ui/map/data/GameStateAdapter.ts`
  - still surfaced `brigadeFrontAssignment` into `LoadedGameState`
- `src/ui/map/components/OOBSidebar.tsx`
  - still used `brigadeFrontAssignment` to decide which brigades counted as reserve

That meant a legacy front-assignment concept still looked alive in the live product even though current player-facing sector assignment had already become the intended control path.

## Implemented

- `src/desktop/preload.cjs`
  - removed the live `assignBrigadeToFront(...)` bridge export
- `src/ui/map/desktop/useIPC.ts`
  - removed `assignBrigadeToFront(...)` from the player-facing IPC contract
- `src/desktop/electron-main.cjs`
  - removed the `assign-brigade-to-front` main-process handler from the live desktop shell
- `src/ui/map/data/GameStateAdapter.ts`
  - stopped surfacing `brigadeFrontAssignment` in `LoadedGameState`
  - hardened sparse-state parsing with optional reads for `displacement.civilian_casualties` and `displacement.displacement_state`
  - fixed OPSEC-sector parsing to read `state.military.opsec_sectors` first, with root fallback only for compatibility
- `src/ui/map/data/types.ts`
  - removed `brigadeFrontAssignment` from the player-facing `LoadedGameState` contract
- `src/ui/map/components/OOBSidebar.tsx`
  - reserve classification now relies on explicit corps policy (`!corps_id` or sector-assignment-exempt corps) instead of the older front-assignment lane
- `tests/engine_honesty_legacy_contracts.test.ts`
  - added a regression proving the live desktop shell no longer advertises `assignBrigadeToFront(...)`
- `tests/ui_map_game_state_adapter.test.ts`
  - updated the player-shell contract expectation: `brigadeFrontAssignment` must now be absent from parsed state

## Verification

- `node_modules\.bin\vitest.cmd run tests\ui_map_order_actions.test.ts tests\engine_honesty_legacy_contracts.test.ts tests\ui_map_render_smoke.test.ts`
  - PASS (`22` tests)
- `node_modules\.bin\tsx.cmd --test tests\ui_map_game_state_adapter.test.ts`
  - PASS (`11` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

## Why this matters

- a legacy concept is still live if the preload bridge, main-process handler, adapter, and sidebar all keep teaching the product that it exists
- player-facing reserve classification should follow explicit corps/sector policy, not a ghost lane inherited from earlier UI eras
- the adapter hardening matters beyond this slice: sparse-state tolerance and correct OPSEC sourcing make the player shell more robust and stop tests from encoding fragile happy-path assumptions

## Follow-up

- keep `assignBrigadeToFront(...)` as a sim-side compatibility lane only until a broader local-front authority decision is made
- audit the remaining sim consumers of `brigade_front_assignment/local_fronts` and decide which are still canonical, compatibility-only, or ready for retirement
