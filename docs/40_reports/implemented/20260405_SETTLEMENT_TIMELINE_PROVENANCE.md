# Settlement Timeline Provenance / Turn-0 Control Truth

**Date:** 2026-04-05
**Status:** CLOSED

## Summary

Persisted `initial_political_controllers` as a snapshot at scenario init, wired it through the adapter to the timeline builder as `startController`, emitted turn-0 "Controlled by X at scenario start" entries, and suppressed false displacement-inferred takeover entries when the inferred faction matches the start controller and no real control flips exist.

## Root Cause

`control_events` in GameState only keeps the last 3 turns of combat flips. `buildSettlementTimeline.ts` inferred control flips from displacement events when `control_events` was empty. This produced entries like "VRS took control -- inferred from displacement" for OSIDs that were already VRS-controlled at scenario start. No initial controller truth was persisted anywhere in the state model.

The result was misleading player-facing information: settlements that a faction held from the very start of the scenario appeared to have been "taken" by that faction, with displacement events cited as evidence. This is engine/state-model debt, not just UI wording -- the simulation had no first-class provenance for "held at scenario start" vs "taken during the simulation."

## Model Decision

Smallest truthful implementation: persist `initial_political_controllers` as a snapshot at scenario init, wire it through the adapter to the timeline builder as `startController`, emit turn-0 "Controlled by X at scenario start" entries, and suppress false displacement-inferred takeover entries when the inferred faction matches the start controller and no real control flips exist. Displacement inference remains as a fallback for genuine mid-simulation takeovers that fall outside the 3-turn `control_events` window.

## Files Changed

1. **`src/state/game_state.ts`** -- Added `initial_political_controllers?: Record<SettlementId, FactionId | null>` to GameState. New optional field preserving the political controller snapshot at scenario start.

2. **`src/scenario/scenario_runner.ts`** -- Snapshots `{ ...political_controllers }` into `initial_political_controllers` after all `init_control` directives have been applied. One-time capture at scenario init.

3. **`src/ui/map/data/types.ts`** -- Added `initialControlBySettlement` field to `LoadedGameState` interface. Plumbs the initial-controller snapshot into the UI data layer.

4. **`src/ui/map/data/GameStateAdapter.ts`** -- Extracts `initial_political_controllers` from raw GameState via `buildControlLookup`, populating `LoadedGameState.initialControlBySettlement`.

5. **`src/ui/map/components/SettlementDetailContent.tsx`** -- Accepts and passes `startController` prop to `buildSettlementTimeline`. Bridges the adapter data to the timeline builder.

6. **`src/ui/map/components/SelectionPanel.tsx`** -- Passes `loadedGameState.initialControlBySettlement` down to `SettlementDetailContent`. Wiring at the panel level.

7. **`src/ui/map/utils/buildSettlementTimeline.ts`** -- Two changes: (a) emits turn-0 "Controlled by X at scenario start" entry when `startController` is provided, (b) suppresses displacement-inferred "took control" entries when the inferred faction matches the start controller and no real control flips exist. Displacement inference remains as fallback for genuine mid-sim takeovers.

8. **`tests/settlement_timeline_provenance.test.ts`** -- 7 targeted tests covering: turn-0 entry emission, displacement inference suppression for start-state holdings, displacement inference retained for genuine takeovers, missing startController graceful degradation, and edge cases.

## Verification

- `tsc --noEmit`: PASS (clean)
- `vitest`: PASS -- 2360/2360 (169 files)
- `npm run build`: PASS (clean)
- 7 targeted tests: all pass

## Completion Block

- **Canonical owner:** `buildSettlementTimeline` (timeline construction) + `initial_political_controllers` snapshot on GameState (state-model truth)
- **Demoted path:** Displacement-inferred "took control" entries are now fallback-only. Previously they were the primary source for any OSID without recent `control_events`, including start-state holdings.
- **Player-visible truth:** "Controlled by X at scenario start" replaces false "X took control -- inferred from displacement" for start-state holdings. Players now see truthful provenance for who held what at the beginning of the scenario.
- **Canonical UI surface:** Settlement Timeline in SelectionPanel (panel variant)
- **Done means:** Settlement timelines distinguish held-at-start from taken-during-sim. Displacement inference is fallback-only for genuine mid-sim takeovers outside the 3-turn control_events window. 7 targeted tests pass. Full suite passes (2360/2360).
