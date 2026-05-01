# Turn Aftermath Product Spine C1

**Date:** 2026-05-01
**Type:** UI/product-spine implementation. No simulation mechanics, scenario data, OOB, painted targets, calibration constants, or run artifacts changed.

## Why

The C0 product-spine audit found that the main campaign loop had live Brief / Inspect / Decide / Execute surfaces, but the post-execute handoff was weak. The engine already persisted `latestTurnSummary`, and desktop advance-turn already returned a `turn-report-updated` report, but the player had no dedicated "what just happened and what needs attention now" packet before returning to the map.

## What Changed

- Added `src/ui/map/data/turnAftermath.ts`, a pure read model that composes:
  - `LoadedGameState.latestTurnSummary`
  - player faction
  - `deriveInboxItems(...)`
  - OSID display names
- Added `TurnAftermathModal`, opened after a successful turn advance. It summarizes:
  - net territory, notable flips, combat, casualties, displacement
  - formation spawns/destructions and supply deltas
  - next presidential obligations from the unified inbox
  - links to War Summary, AAR Records, and Inbox
- Extended `advanceTurnAndSync(...)` with optional aftermath hooks. The canonical path now:
  1. captures previous loaded state
  2. advances the turn through desktop IPC
  3. stores the raw desktop turn report for existing consumers
  4. loads the next save
  5. builds and opens the aftermath view
- Added `getTurnAftermathAdvanceDeps()` so all tactical advance-turn entrypoints share the same bridge:
  - `PresidentialToolbar`
  - `AdvanceTurnModal`
  - `useKeyboardShortcuts` spacebar path
  - `PeaceStatusPanel`
  - legacy `TopToolbar`
- Added store state:
  - `turnAftermath`
  - `turnAftermathOpen`
  - reset on fresh save load so stale aftermath packets cannot survive across saves.

## Files

- `src/ui/map/data/turnAftermath.ts`
- `src/ui/map/components/TurnAftermathModal.tsx`
- `src/ui/map/desktop/turnAftermathAdvanceDeps.ts`
- `src/ui/map/desktop/orderActions.ts`
- `src/ui/map/store/gameStore.ts`
- `src/ui/map/App.tsx`
- Advance-turn entrypoints listed above
- Tests:
  - `tests/ui/turn_aftermath.test.ts`
  - `tests/ui_map_order_actions.test.ts`
  - `tests/ui/gamestore_load_reset.test.ts`
  - `tests/ui_turn_aftermath_wiring.test.ts`

## Verification

- `npx.cmd vitest run tests/ui/turn_aftermath.test.ts tests/ui_map_order_actions.test.ts tests/ui/gamestore_load_reset.test.ts tests/ui_turn_aftermath_wiring.test.ts`
  - 20/20 pass
- `npx.cmd tsc --noEmit`
  - clean

No scenario run is required: this is a UI/read-model bridge over already-persisted state. It does not alter the turn pipeline, combat, control, operation execution, or saved simulation truth except for existing UI store state after load.

## Remaining Product-Spine Work

- Add richer per-turn cost deltas when Cost Ledger gains an in-campaign read model, not only game-over aggregation.
- Add visual browser proof for the modal inside the desktop map shell after current Claude lanes settle.
- Consider making the modal optionally persistent in Chronicle / Records for players who dismiss it quickly.
