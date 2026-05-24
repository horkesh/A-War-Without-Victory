# Soundscape Event Adapter

**Date:** 2026-05-23
**Scope:** Tactical-map audio cue adapter
**Result:** Implemented

## Summary

Added a pure, deterministic audio event adapter that maps newly observed UI-visible campaign events to cue requests. This continues the soundscape integration plan without adding playback, assets, React wiring, browser audio initialization, network IO, timestamps, randomness, simulation events, or save-schema changes.

## Changes

- Added `src/ui/map/audio/audio_event_adapter.ts`.
- Added `buildAudioCueEventsForState(previous, next)` to emit cue requests only when a newer `latestTurnSummary` is observed.
- Emits stable cue request keys for:
  - completed turn: `turn_complete`
  - battles: `battle_notification`
  - territory-flipping battles: `battle_decisive`
  - fired historical events: `event_notification`
  - newly completed operation AARs ending on the observed turn: `operation_complete`
- Sorts event and operation cue requests by stable ids.
- Filters requests through the cue manifest so stale adapter mappings cannot emit unknown cue IDs.
- Suppresses duplicate cue requests when the same turn is observed again.

## Determinism And Boundaries

- UI/read-model adapter only.
- No simulation behavior changed.
- No combat, operation, scenario, calibration, army-arc, save, or generated-artifact contract changed.
- No playback side effects: the adapter returns data; it does not call `playCue(...)`.
- No wall-clock or browser API dependency.

## Verification

- `npx.cmd vitest run tests\ui\audio_event_adapter.test.ts --reporter=dot` failed first because the adapter module did not exist.
- `npx.cmd vitest run tests\ui\audio_event_adapter.test.ts --reporter=dot` passed 2/2 after implementation.
- `npx.cmd vitest run tests\ui\audio_event_adapter.test.ts tests\ui\audio_manifest.test.ts tests\ui\audio_bus.test.ts tests\ui\audio_hook_points.test.ts tests\ui\audio_preferences.test.ts tests\ui\settings_audio_preferences.test.ts --reporter=dot` passed 15/15.
- `npm.cmd run typecheck` passed after correcting the test fixture to use the canonical `CombatOutcome` value `victory`.
- `npm.cmd run desktop:map:build` passed with the repo's existing Vite externalization/chunk warnings.
- `git diff --check` passed.

## Remaining Work

- Wire the adapter into a React/store-side observer only after a remount-safe call site is selected.
- Add runtime cooldown suppression in the audio service before enabling high-frequency event categories.
- Keep asset loading deferred until approved packaged assets exist.
