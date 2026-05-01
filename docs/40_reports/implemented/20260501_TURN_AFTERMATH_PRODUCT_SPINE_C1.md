# Turn Aftermath Product Spine C1-C2

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

## C2 Persistent Records Extension

Turn Aftermath is now durable inside Army HQ RECORDS instead of only appearing as a post-advance modal:

- Added `buildTurnAftermathRecordViews(...)`, a pure read model that builds newest-first history from `LoadedGameState.turnSummaries`, while preserving `latestTurnSummary` as a fallback for freshly loaded saves. Only the latest record carries live inbox obligations; older records are archived turn packets, not reconstructed historical inbox snapshots.
- Added `TurnAftermathRecordsPanel`, a compact Army HQ records surface showing recent turn packets, net territorial movement, player-faction battle/casualty counts, displacement/action summaries, and the lead territorial/action note per turn.
- Added an Army HQ RECORDS subtab:
  - `aftermath` / `TURN AFTERMATH`
- The modal's records action now opens `recordsSubTab: 'aftermath'` instead of dropping the player into generic AAR records.
- Shared shell handoff and game-store typing now accept `ArmyHQRecordsSubTab = 'aftermath' | 'aar' | 'ops' | 'opportunities'`.

## Files

- `src/ui/map/data/turnAftermath.ts`
- `src/ui/map/components/TurnAftermathModal.tsx`
- `src/ui/map/components/army_hq/TurnAftermathRecordsPanel.tsx`
- `src/ui/map/components/army_hq/RecordsContent.tsx`
- `src/ui/shared/shellHandoff.ts`
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
  - `tests/ui_shell_navigation.test.ts`

## Verification

- `npx.cmd vitest run tests/ui/turn_aftermath.test.ts tests/ui_map_order_actions.test.ts tests/ui/gamestore_load_reset.test.ts tests/ui_turn_aftermath_wiring.test.ts`
  - 20/20 pass
- `npx.cmd vitest run tests/ui/turn_aftermath.test.ts tests/ui_turn_aftermath_wiring.test.ts tests/ui_shell_navigation.test.ts tests/ui_map_order_actions.test.ts tests/ui/gamestore_load_reset.test.ts`
  - 43/43 pass after C2
- `npx.cmd tsc --noEmit`
  - clean
- `npx.cmd tsc --noEmit -p tsconfig.json`
  - clean after C2
- `npm.cmd run desktop:map:build`
  - succeeded after C2; Vite emitted existing chunk-size/dynamic-import warnings only.

No scenario run is required: this is a UI/read-model bridge over already-persisted state. It does not alter the turn pipeline, combat, control, operation execution, or saved simulation truth except for existing UI store state after load.

## Remaining Product-Spine Work

- Add richer per-turn cost deltas when Cost Ledger gains an in-campaign read model, not only game-over aggregation.
- Add visual browser proof for the modal inside the desktop map shell after current Claude lanes settle.
- Consider a Chronicle cross-link once Chronicle gets a unified campaign timeline filter.
