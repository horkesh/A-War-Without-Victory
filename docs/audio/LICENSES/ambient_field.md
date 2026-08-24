# Audio provenance: `ambient_field`

- **File committed:** `src/ui/map/assets/audio/ambient/ambient_field.ogg`
- **Cue role:** Restrained tactical-map wind and distant environmental rumble.
- **Source recipe:** `tools/audio/generate_ambient_beds.mjs#ambient_field`
- **Author/rightsholder:** A War Without Victory project.
- **License:** `FIRST_PARTY`; original project work redistributable with the game.
- **Generation:** `node tools/audio/generate_ambient_beds.mjs --verify-toolchain ambient_field`
- **Canonical source PCM:** signed 16-bit little-endian, mono, 48 kHz; SHA-256 `51a55f990a056c4ae3b2fcdf2ea82734487b13ed6f2473af5dc00fbd6352f366`.
- **Format:** OGG Vorbis, mono, 48 kHz, 30.000000 seconds.
- **Measured loudness:** -39.9 LUFS integrated.
- **Measurement:** FFprobe 8.1.2 `format.duration`; FFmpeg 8.1.2 `ebur128`, final Summary integrated `I`.
- **Content boundary:** Procedural wind/environmental texture only; nonmusical, voice-free, combat-free, weapon-free, and without sensational battlefield content or hidden information.

The fixed-seed recipe uses only integer harmonics of the 30-second loop period. Canonical PCM is cross-platform test truth; processed OGG byte reproducibility is scoped to the documented FFmpeg/FFprobe 8.1.2 full-build toolchain. The resulting first-party synthesis may be copied, modified, packaged, and redistributed as part of A War Without Victory.
