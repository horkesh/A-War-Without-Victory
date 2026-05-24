# Soundscape Observer Wiring

**Date:** 2026-05-23
**Scope:** Tactical-map UI audio observer
**Result:** Implemented

## Summary

The tactical-map React root now mounts a remount-safe `AudioCueObserver` that watches loaded game state transitions, asks the pure soundscape adapter for cue requests, and calls the existing silent audio bus with an explicit timestamp. Audio remains opt-in, disabled by default, and silent unless the user enables the existing local audio preference.

## Changes

- Added `src/ui/map/components/AudioCueObserver.tsx`.
- Mounted `AudioCueObserver` once at the `App` root.
- The observer:
  - suppresses cue emission on initial save hydration,
  - compares previous and next loaded game state through `buildAudioCueEventsForState(...)`,
  - emits only when a later `latestTurnSummary` is observed,
  - passes one explicit timestamp per cue batch into `playCue(...)`,
  - performs no rendering and returns `null`.
- Added `tests/ui/audio_cue_observer.test.ts` for initial-hydration suppression and later-turn cue emission.

## Determinism And Boundaries

- UI observer only.
- No simulation behavior changed.
- No combat, operation, scenario, calibration, army-arc, save, or generated-artifact contract changed.
- The observer does not generate events; it consumes already-loaded UI state.
- The bus still performs no playback, fetch, Web Audio initialization, or randomness. The observer's timestamp is UI-local and used only for cosmetic cooldown gating.

## Verification

- `npx.cmd vitest run tests\ui\audio_cue_observer.test.ts --reporter=dot` failed first because the observer component did not exist.
- `npx.cmd vitest run tests\ui\audio_cue_observer.test.ts --reporter=dot` passed 1/1 after implementation.
- `npx.cmd vitest run tests\ui\audio_cue_observer.test.ts tests\ui\audio_event_adapter.test.ts tests\ui\audio_manifest.test.ts tests\ui\audio_bus.test.ts tests\ui\audio_hook_points.test.ts tests\ui\audio_preferences.test.ts tests\ui\settings_audio_preferences.test.ts --reporter=dot` passed 17/17.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with the repo's existing Vite externalization/chunk warnings.
- `git diff --check` passed.

## Remaining Work

- Add asset-backed playback only after approved packaged assets exist.
- Decide whether additional stable UI event families should be mapped after visual/audio QA.
- Keep audio opt-in and local-first.
