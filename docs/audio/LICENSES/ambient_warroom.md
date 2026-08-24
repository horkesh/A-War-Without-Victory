# Audio provenance: `ambient_warroom`

- **File committed:** `src/ui/map/assets/audio/ambient/ambient_warroom.ogg`
- **Cue role:** Restrained Warroom interior HVAC and room texture.
- **Source recipe:** `tools/audio/generate_ambient_beds.mjs#ambient_warroom`
- **Author/rightsholder:** A War Without Victory project.
- **License:** `FIRST_PARTY`; original project work redistributable with the game.
- **Generation:** `node tools/audio/generate_ambient_beds.mjs --verify-toolchain ambient_warroom`
- **Canonical source PCM:** signed 16-bit little-endian, mono, 48 kHz; SHA-256 `4deef2e87ad50ea084755264266ac2a9e3b1cd62375241a8c66f94942ac09295`.
- **Format:** OGG Vorbis, mono, 48 kHz, 30.000000 seconds.
- **Measured loudness:** -41.6 LUFS integrated.
- **Measurement:** FFprobe 8.1.2 `format.duration`; FFmpeg 8.1.2 `ebur128`, final Summary integrated `I`.
- **Content boundary:** Procedural low interior texture only; nonmusical, voice-free, weapon-free, and without signaling transients or hidden information.

The fixed-seed recipe uses only integer harmonics of the 30-second loop period. Canonical PCM is cross-platform test truth; processed OGG byte reproducibility is scoped to the documented FFmpeg/FFprobe 8.1.2 full-build toolchain. The resulting first-party synthesis may be copied, modified, packaged, and redistributed as part of A War Without Victory.
