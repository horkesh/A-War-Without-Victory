# Soundscape Kickoff Audio Stub

Date: 2026-05-17

## Summary

Implemented the soundscape kickoff scope without adding real audio assets or runtime playback dependencies.

Existing surface inspection found live map audio files at:
- `src/ui/map/audio/sound_manifest.ts`
- `src/ui/map/audio/audio_engine.ts`

The implementation extends that existing tree. No parallel `src/ui/audio` tree was created.

## Implementation

- Added an operator-ready composer brief at `docs/audio/2026-05-17-awwv-composer-brief.md`.
- Reworked `sound_manifest.ts` into a stable cue manifest with cue ids, categories, default volumes, optional file paths, and compatibility exports for existing SFX/music registry callers.
- Replaced the eager Web Audio/fetch behavior with a deterministic stub bus in `audio_engine.ts`.
- Kept audio disabled and silent by default.
- Added no-op hook points for:
  - `peace_plan_offered` when `PeacePlanModal` opens.
  - `turn_review_open` when `AdvanceTurnModal` opens.
- Did not add Howler.js. The kickoff pass has no approved assets and no playback requirement, so adding a dependency would only increase package scope.

## Determinism And Packaging

- No simulation state mutation.
- No save schema changes.
- No network fetches.
- No Web Audio initialization.
- No timestamps.
- No randomness.
- Placeholder file paths are manifest metadata only and are not loaded by the stub.

## Tests

Added focused coverage:
- `tests/ui/audio_manifest.test.ts`
- `tests/ui/audio_bus.test.ts`
- `tests/ui/audio_hook_points.test.ts`

Focused audio tests verify manifest schema, stable ids, disabled default behavior, no browser/network IO, volume clamping, and modal hook calls.

## Follow-Up Notes

- Ledger entry needed, but intentionally not written in this pass per user instruction.
- Roadmap status note needed, but intentionally not written in this pass per user instruction.
- Later soundscape integration should decide whether to keep direct Web Audio, use HTMLAudioElement, or add Howler.js once real packaged assets exist.
