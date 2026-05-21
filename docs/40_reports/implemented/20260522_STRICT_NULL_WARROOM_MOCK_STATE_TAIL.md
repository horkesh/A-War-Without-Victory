# Strict-Null Warroom Mock-State Tail

**Date:** 2026-05-22
**Result:** `src/ui/warroom/warroom.ts` now contributes zero inventory-counted `as_any_casts` and zero `as_unknown_casts`.

## Summary
- Replaced the legacy browser/dev mock-state double-cast with a directly typed `GameState`.
- Kept the fallback scoped to Warroom startup/dev loading; no simulation behavior, scenario data, save migration, operation behavior, or output tuning changed.
- Added a strict-null progress guard pinning the Warroom mock-state tail at zero.

## Changes Made
### Warroom Mock State
- Imported `CURRENT_SCHEMA_VERSION` and constructed the mock state with typed `GameState['military']`, `GameState['political']`, and `displacement` domains.
- Narrowed `loadMockState(...)` `phase` input to `GameState['meta']['phase']`.
- Removed three `as any` casts and one `as unknown as GameState` cast from the dev fallback.

### Regression Guard
- Added `WARROOM_MOCK_STATE_STRICT_NULL_TAIL_FILES` to `tests/strict_null_inventory_progress.test.ts`.
- Added a focused assertion that `src/ui/warroom/warroom.ts` stays at zero for both `as_any_casts` and `as_unknown_casts`.

## Verification
- Red check: `npx.cmd vitest run tests\strict_null_inventory_progress.test.ts --reporter=dot` failed as expected before implementation with `expected 3 to be +0`.
- Green check: `npx.cmd vitest run tests\strict_null_inventory_progress.test.ts --reporter=dot` PASS (82/82).
- `npm.cmd run typecheck` PASS.
- `npm.cmd run warroom:build` PASS. Vite still reports the existing loaders.gl browser-external `spawn` warning.
- `node tools\diagnostics\strict_null_inventory.cjs` current floor: `as_factionid_casts 2`, `as_unknown_casts 1`, `as_any_casts 147`, `non_null_assertions_dot 0`, `non_null_assertions_index 0`, `optional_fields_game_state 473`.

## Files Changed
| File | Change |
|---|---|
| `src/ui/warroom/warroom.ts` | Typed browser/dev mock state directly and removed broad casts. |
| `tests/strict_null_inventory_progress.test.ts` | Added strict-null inventory guard for the Warroom mock-state tail. |

## Next Steps
- Continue strict-null cleanup with the remaining compact tails before larger adapter boundaries.
- Current high-count candidates are `src/scenario/scenario_runner.ts`, `src/cli/phaseD3_trace_missing_census_settlements.ts`, `src/ui/map/data/GameStateAdapter.ts`, `src/ui/map/map/MapContainer.tsx`, `src/state/save_migration.ts`, and CLI harnesses.
