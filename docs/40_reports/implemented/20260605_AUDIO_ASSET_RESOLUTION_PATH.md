# Audio Asset Resolution Path

**Date:** 2026-06-05

**Type:** Tactical-map audio substrate wiring. No binary audio assets, simulation behavior, scenario data, save schema, generated baseline, replay output, or player command behavior changed.

## Change

`src/ui/map/audio/audioAssets.ts` now owns the Rollup URL-import asset-resolution map for future audio binaries. The map is intentionally empty because no real audio binaries are committed yet.

`src/ui/map/audio/sound_manifest.ts` resolves playable cue URLs through that map instead of trusting bare manifest `filePath` strings. `src/ui/map/audio/audio_engine.ts` records the last resolved asset URL in bus state so tests and future playback wiring can distinguish resolved assets from placeholders.

Five composer-briefed manifest slots were added for future ambient/stinger coverage:

- `ambient_diplomatic_table`
- `ambient_late_war_exhaustion`
- `ambient_dayton_aftermath`
- `stinger_major_escalation`
- `stinger_humanitarian_warning`

## Contract

Cue IDs remain the stable public contract. Placeholder cues remain silent no-ops until a real binary is added with one static import, one map entry, and a matching `assetStatus: 'provided'` manifest update.

The tactical-map build uses `publicDir:false` and `copyPublicDir:false`, so bare strings like `audio/ui_click.mp3` are metadata only. Runtime playback must use the hashed bundler URL from `audioAssets.ts`.

## Determinism

The new path is pure module wiring. It performs no network fetch, Web Audio initialization, timestamps, random work, save mutation, scenario mutation, or generated artifact write. Missing binaries remain deterministic silent placeholders.

## Verification

PR #197 landed the substrate with no binary assets. No scenario or baseline regression is required because no sim/output/save/scenario bytes can move.
