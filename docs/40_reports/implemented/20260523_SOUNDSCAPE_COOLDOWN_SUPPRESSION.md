# Soundscape Cooldown Suppression

**Date:** 2026-05-23
**Scope:** Tactical-map silent audio bus
**Result:** Implemented

## Summary

The silent audio bus now honors cue cooldown metadata when callers provide an explicit timestamp. This completes the deterministic side of runtime cooldown suppression without adding real playback, assets, browser audio initialization, network IO, wall-clock reads, randomness, simulation events, or save-schema changes.

## Changes

- Extended `playCue(id, nowMs?)` to accept an optional caller-supplied millisecond timestamp.
- Suppresses repeated cue accepts when the same cue is requested inside its `cooldownMs` window.
- Keeps existing no-timestamp call sites backward-compatible.
- Tracks `acceptedCueCount` and per-cue accepted timestamps in the silent bus state for deterministic tests and future adapter wiring.
- Clones timestamp state from `getAudioState()` so tests/consumers cannot mutate the internal bus state by reference.

## Determinism And Boundaries

- UI/audio substrate only.
- No simulation behavior changed.
- No combat, operation, scenario, calibration, army-arc, save, or generated-artifact contract changed.
- The bus still performs no audio playback, no fetch, no Web Audio initialization, no timestamps, and no randomness.
- Cooldown enforcement depends only on the explicit `nowMs` value supplied by the caller.

## Verification

- `npx.cmd vitest run tests\ui\audio_bus.test.ts --reporter=dot` failed first on missing accepted-cue count/cooldown memory.
- `npx.cmd vitest run tests\ui\audio_bus.test.ts --reporter=dot` passed 4/4 after implementation.
- `npx.cmd vitest run tests\ui\audio_event_adapter.test.ts tests\ui\audio_manifest.test.ts tests\ui\audio_bus.test.ts tests\ui\audio_hook_points.test.ts tests\ui\audio_preferences.test.ts tests\ui\settings_audio_preferences.test.ts --reporter=dot` passed 16/16.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with the repo's existing Vite externalization/chunk warnings.
- `git diff --check` passed.

## Remaining Work

- Wire the pure event adapter into a remount-safe observer that supplies deterministic monotonic timestamps.
- Add asset-backed playback only after approved packaged assets exist.
- Keep soundscape opt-in and local-first.
