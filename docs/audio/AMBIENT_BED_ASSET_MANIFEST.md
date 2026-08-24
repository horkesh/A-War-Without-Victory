# Ambient Bed Asset Manifest

WP-8 provides three first-party ambient bed cue IDs. Each bed is committed as a
mono 48 kHz OGG, statically bundled through `audioAssets.ts`, and selected by the
existing surface-bed controller after the shared audio bus is gesture-unlocked.
Mute, master volume, and the existing conservative per-cue volumes remain the
authoritative playback controls.

## Required Files

| Cue ID | File | Surface | Direction | Duration | Loudness |
|---|---|---|---|---:|---:|
| `ambient_warroom` | `ambient_warroom.ogg` | Warroom | Interior HVAC/room texture | 30.000000 s | -41.6 LUFS |
| `ambient_field` | `ambient_field.ogg` | Tactical map | Wind and distant environmental rumble, no combat | 30.000000 s | -39.9 LUFS |
| `ambient_archive` | `ambient_archive.ogg` | Chronicle and Records | Quiet paper-air/room texture | 30.000000 s | -41.7 LUFS |

## Asset Requirements

- Format: compressed `.ogg`.
- Length: 30-second loop, below the 60-second ceiling.
- Loudness: conservative under the default `masterVolume: 0.5`; measurements
  above are FFmpeg 8.1.2 `ebur128` final Summary integrated `I` values.
- Content: non-musical, no voice-over, no bright UI stingers, no graphic
  violence, no sensational battlefield audio.
- Looping: clean loop points with no obvious clicks, pop, or hard transient.
- Licensing: original AWWV first-party procedural synthesis, redistributable
  with the game; per-cue notes are under `docs/audio/LICENSES/`.

## Reproducible source recipe

The checked-in `tools/audio/generate_ambient_beds.mjs` recipe uses fixed seeds
and random-phase spectral components at integer multiples of the complete
30-second loop period. That periodic basis makes the decoded boundary
continuous without a fade that would advertise the loop. The canonical source
hash for each bed is the SHA-256 of its 48 kHz mono signed-16-bit little-endian
PCM bytes, before WAV wrapping or OGG encoding:

| Cue ID | Canonical source PCM SHA-256 |
|---|---|
| `ambient_warroom` | `4deef2e87ad50ea084755264266ac2a9e3b1cd62375241a8c66f94942ac09295` |
| `ambient_field` | `51a55f990a056c4ae3b2fcdf2ea82734487b13ed6f2473af5dc00fbd6352f366` |
| `ambient_archive` | `0ad1c6fbf2c98aa570b1070842591fe9ab03bbf4bcfec7f6cf4e72d175a92583` |

Ordinary Vitest runs render and hash this PCM directly and never require
FFmpeg on `PATH`. Regenerate all processed OGGs only with the documented
toolchain check enabled:

```powershell
node tools/audio/generate_ambient_beds.mjs --verify-toolchain
```

Processed OGG byte reproducibility is scoped to `ffmpeg version
8.1.2-full_build-www.gyan.dev` and matching FFprobe 8.1.2. Encoding is explicit
(`libvorbis`, quality 4, mono, 48 kHz, bit-exact flags, metadata removed). The
encoder writes to a generator-owned directory beside the destination and only
atomically publishes a validated nonempty `OggS` payload after success.
Durations were measured with FFprobe 8.1.2 `format.duration`.

## Wiring Checklist

1. Regenerate the three binaries from the checked-in source recipe.
2. Run the focused audio tests and strict provenance diagnostic.
3. Run `npm.cmd run desktop:map:build` and confirm the three hashed OGG outputs.
4. Perform the required human listen pass for loop clicks, relative level,
   fatigue, semantic fit, and sensitivity restraint. Mechanical checks do not
   replace this subjective gate.
