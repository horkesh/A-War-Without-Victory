# Replay Map-State Inspection

**Date:** 2026-05-10
**Lane:** Replay consumer closure
**Scope:** UI/store read-model inspection only; no simulation behavior, scenario data, OOB, combat math, political controller writes, rupture wiring, or sensitive-history canon mechanics changed.

## Summary

Full replay sidecars can now be inspected as tactical-map frames from the endgame replay scrubber. The `Inspect Map` action is shown only when `ReplayScrubber` is backed by a full `replay_save_sequence.json` frame. Sparse `replay_save_manifest.json` data remains summary-only because it intentionally does not contain raw `GameState` frames.

The inspection path temporarily swaps the UI store's `loadedGameState` read model to the parsed replay frame, preserves the final loaded endgame state as the return target, and mounts a replay inspection banner with a `Return to Final` action. This keeps the map inspection loop read-only and separate from live campaign load/advance paths.

## Implementation

- `src/ui/map/store/gameStore.ts`
  - Added `replayInspection` metadata and `replayInspectionReturnState`.
  - Added `startReplayInspection(frame, frameIndex)` and `exitReplayInspection()`.
  - `loadSave(...)` clears any active replay inspection state.
- `src/ui/map/components/replay/ReplayScrubber.tsx`
  - Added optional `onInspectFrame`.
  - Renders `Inspect Map` only for full replay frames, not sparse manifests.
- `src/ui/map/components/replay/ReplayInspectionBanner.tsx`
  - New App-root banner for active inspection mode.
  - Shows inspected turn/date plus final return target.
- `src/ui/map/components/VerdictScreen.tsx`
  - Wires the scrubber action to `gameStore.startReplayInspection(...)`.
- `src/ui/map/App.tsx`
  - Mounts `ReplayInspectionBanner`.

## Determinism And Canon

This is a renderer/store read-model feature. It parses an already serialized replay frame through the same `GameStateAdapter.parseGameState(...)` path as normal saves, then restores the exact final `LoadedGameState` object reference on exit. It does not advance turns, run sim phases, write state, or alter replay artifacts.

Canon impact is limited to documentation truth: `Systems_Manual_v0_9_0.md` now names replay scrubber selected-frame map inspection as part of the desktop/tactical-map UI delivery note. Simulation mechanics remain unchanged.

## Verification

- Red first:
  - `npx.cmd vitest run tests/ui/gamestore_load_reset.test.ts --reporter=dot` failed on missing `startReplayInspection`.
  - `npx.cmd vitest run tests/ui/endgame_verdict_screen_mount.test.ts --reporter=dot` failed on missing `Inspect Map`.
- Green focused:
  - `npx.cmd vitest run tests/ui/gamestore_load_reset.test.ts tests/ui/endgame_verdict_screen_mount.test.ts --reporter=dot` passed 51/51 after store + UI wiring.
- Final verification for this commit also covered doc-truth, typecheck, desktop map build, and diff whitespace checks.

## Roadmap Delta

The replay consumer lane now covers summary scrubber, sparse manifest loading, and selected-frame map inspection. Remaining replay polish is auto-play/animation and richer post-run presentation, not the basic product-shell inspection loop.
