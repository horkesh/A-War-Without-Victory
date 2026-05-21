# Strict-Null Verdict Codex Unknown-Cast Tail

**Date:** 2026-05-22
**Result:** Global inventory-counted `as_unknown_casts` are now zero.

## Summary
- Removed the last inventory-counted `as unknown` cast from `src/ui/map/components/VerdictScreen.tsx`.
- Replaced the raw `GameState` requirement on `buildGhostEntries(...)` with a narrow `GhostEntryStateView` read contract that matches the fields the predicates actually consume.
- Kept the change scoped to the endgame Codex ghost-entry display path. No simulation behavior, scenario data, save schema, operation behavior, or output tuning changed.

## Changes Made
### Codex Ghost-Entry Boundary
- Added `GhostEntryStateView` in `src/sim/codex/dynamic_section_builder.ts` with optional `meta.player_faction`, top-level adapter `player_faction`, `paramilitary_policy`, and the military event/negotiation fields read by ghost predicates.
- Updated ghost-entry predicates and the Ring guard to consume `GhostEntryStateView`.
- Left `BuilderInput` and dynamic-section construction on full `GameState`, since that path remains sim-state owned.

### Verdict Screen
- Removed the `loadedGameState as unknown as Parameters<typeof buildGhostEntries>[0]` bridge from `VerdictScreen`.
- `LoadedGameState` now satisfies the narrow ghost-entry view structurally, without pretending to be full raw engine state.

### Regression Guard
- Added `VERDICT_SCREEN_CODEX_UNKNOWN_TAIL_FILES` to `tests/strict_null_inventory_progress.test.ts`.
- Added a focused assertion that `src/ui/map/components/VerdictScreen.tsx` stays at zero for `as_unknown_casts`.

## Verification
- Red check: `npx.cmd vitest run tests\strict_null_inventory_progress.test.ts --reporter=dot` failed as expected before implementation with `expected 1 to be +0`.
- Green check: `npx.cmd vitest run tests\strict_null_inventory_progress.test.ts --reporter=dot` PASS (83/83).
- `npx.cmd vitest run tests\codex_ghost_entries_wave_2.test.ts --reporter=dot` PASS (40/40).
- `npm.cmd run typecheck` PASS.
- `npm.cmd run desktop:map:build` PASS. Vite still reports the existing browser-external and chunk-size warnings.
- `node tools\diagnostics\strict_null_inventory.cjs` current floor: `as_factionid_casts 2`, `as_unknown_casts 0`, `as_any_casts 147`, `non_null_assertions_dot 0`, `non_null_assertions_index 0`, `optional_fields_game_state 473`.

## Files Changed
| File | Change |
|---|---|
| `src/sim/codex/dynamic_section_builder.ts` | Added the narrow ghost-entry state view and updated predicate signatures. |
| `src/ui/map/components/VerdictScreen.tsx` | Removed the LoadedGameState-to-GameState double-cast. |
| `tests/strict_null_inventory_progress.test.ts` | Added the VerdictScreen unknown-cast guard. |

## Next Steps
- Continue strict-null cleanup on compact `as_any_casts` tails before the larger adapter and CLI harness boundaries.
