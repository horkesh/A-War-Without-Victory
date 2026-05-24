# Soundscape Cue Metadata Readiness

**Date:** 2026-05-23
**Scope:** Tactical-map audio manifest/readiness metadata
**Result:** Implemented

## Summary

The soundscape registry now records playback-readiness metadata for every cue without adding real audio playback, packaged assets, network IO, Web Audio initialization, timestamps, randomness, simulation events, or save-schema changes.

This advances the 2026-05-17 soundscape integration plan's cue-catalog task while keeping the current bus silent and cosmetic.

## Changes

- Added typed cue readiness fields to `src/ui/map/audio/sound_manifest.ts`:
  - `cooldownMs`
  - `assetStatus`
  - `reducedMotionPolicy`
- Kept cue registrations concise by normalizing defaults inside `registerCue(...)`.
- Added deterministic default cooldowns by category:
  - `ui`: 75 ms
  - `stinger`: 1500 ms
  - `ambient`: 5000 ms
  - `music`: 5000 ms
- Marked current placeholder file paths as `missing_placeholder`; no cue claims bundled assets are present.
- Added manifest regression coverage proving every registered cue exposes stable readiness metadata.

## Determinism And Boundaries

- UI/audio substrate only.
- No simulation behavior changed.
- No combat, operation, scenario, calibration, army-arc, save, or generated-artifact contract changed.
- The silent audio bus still performs no browser audio or network work.
- Cooldown fields are metadata only in this slice; runtime cooldown suppression remains future work for the asset-backed service.

## Verification

- `npx.cmd vitest run tests\ui\audio_manifest.test.ts --reporter=dot` failed first on missing cue metadata.
- `npx.cmd vitest run tests\ui\audio_manifest.test.ts tests\ui\audio_bus.test.ts tests\ui\audio_hook_points.test.ts tests\ui\audio_preferences.test.ts tests\ui\settings_audio_preferences.test.ts --reporter=dot` passed 13/13.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with the repo's existing Vite externalization/chunk warnings.
- `git diff --check` passed.

## Remaining Work

- Add an event adapter that maps stable UI-visible events to cue IDs without remount spam.
- Add an asset-backed playback service only after approved packaged assets exist.
- Keep soundscape controls opt-in and local-first.
- Commission music, ambience, stingers, UI feedback, and any narration before claiming AAA-grade audio.
