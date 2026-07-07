# Ambient Bed Asset Manifest

WP-8 reserves three ambient bed cue IDs. The current build treats them as
missing placeholders: the audio bus may request them, but no browser audio,
network fetch, or decode work occurs until approved `.ogg` files are added to
`src/ui/map/assets/audio/ambient/` and wired through `audioAssets.ts`.

## Required Files

| Cue ID | File | Surface | Direction |
|---|---|---|---|
| `ambient_warroom` | `ambient_warroom.ogg` | Warroom | Interior room tone, low and sober. |
| `ambient_field` | `ambient_field.ogg` | Tactical map | Wind with very distant, non-graphic low rumble. |
| `ambient_archive` | `ambient_archive.ogg` | Chronicle and Records | Paper/room tone, subdued and archival. |

## Asset Requirements

- Format: compressed `.ogg`.
- Length: loopable, 60 seconds or shorter.
- Loudness: LUFS-matched to the existing UI cue set and conservative under the
  default `masterVolume: 0.5`.
- Content: non-musical, no voice-over, no bright UI stingers, no graphic
  violence, no sensational battlefield audio.
- Looping: clean loop points with no obvious clicks, pop, or hard transient.
- Licensing: source/license note must be added under `docs/audio/LICENSES/`
  before flipping the cue's `assetStatus` to `provided`.

## Wiring Checklist

1. Add the `.ogg` file under `src/ui/map/assets/audio/ambient/`.
2. Add one static import and one `AUDIO_ASSET_URLS` entry in
   `src/ui/map/audio/audioAssets.ts`.
3. Change that cue's `assetStatus` in `src/ui/map/audio/sound_manifest.ts` from
   `missing_placeholder` to `provided`.
4. Run `npx.cmd vitest run tests/ui/audio_ambient_floor.test.ts tests/ui/audio_manifest.test.ts --pool=forks --reporter=dot`.
5. Run `npm.cmd run desktop:map:build` and a packaged listen pass.
