# 2026-04-03 - Assignable front segment DTO retirement

## Summary

Removed `assignableFrontSegments` from the live tactical-map `LoadedGameState` contract.

`assignable_front_segments` still exists underneath as a compatibility-era raw-state snapshot, but no active non-archived player shell consumes it anymore. Keeping it in the loaded UI DTO made the tactical shell imply a second front-truth owner after sectors, front-pressure summaries, and the newer player-safe drilldowns had already moved on.

This pass:

- removed `AssignableFrontSegmentView` from the live tactical-map types
- stopped `GameStateAdapter` from deriving or returning `assignableFrontSegments`
- updated the adapter regression test so it only locks the still-canonical front-edge and front-pressure views
- propagated the contract change into the tactical-map/system memory docs

## Why this matters

In AWWV, the swampiest legacy concepts are the ones that still ride through “official-looking” DTOs after the UI has stopped using them. Once that happens, future work starts treating them as safe to revive.

For the player shell, `assignable_front_segments` had already been demoted to compatibility residue:

- summaries no longer derive counts from it
- tooltips no longer read it
- front-assignment editing is retired from the live shell

The loaded DTO needed to become equally honest.

## Files changed

- `src/ui/map/data/types.ts`
- `src/ui/map/data/GameStateAdapter.ts`
- `tests/ui_map_game_state_adapter.test.ts`
- `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`
- `docs/40_reports/GUI_MASTER.md`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`

## Verification

- `node .\node_modules\tsx\dist\cli.mjs --test tests\ui_map_game_state_adapter.test.ts`
- `node .\node_modules\vitest\vitest.mjs run tests\ui_player_visibility.test.ts`
- `node .\node_modules\typescript\bin\tsc --noEmit -p tsconfig.json`

## Result

The live tactical shell DTO is now stricter:

- `frontEdges` and `frontEdgesOsid` remain live player-shell spatial views
- `frontPressureByEdge` remains the canonical summary pressure view
- `assignable_front_segments` remains raw compatibility state only, not a `LoadedGameState` surface

That makes the player-facing model more honest and reduces the chance of another accidental front-era regression.
