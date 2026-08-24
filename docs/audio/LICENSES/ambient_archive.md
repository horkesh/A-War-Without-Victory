# Audio provenance: `ambient_archive`

- **File committed:** `src/ui/map/assets/audio/ambient/ambient_archive.ogg`
- **Cue role:** Quiet paper-air and room texture for Chronicle and Records surfaces.
- **Source recipe:** `tools/audio/generate_ambient_beds.mjs#ambient_archive`
- **Author/rightsholder:** A War Without Victory project.
- **License:** `FIRST_PARTY`; original project work redistributable with the game.
- **Generation:** `node tools/audio/generate_ambient_beds.mjs --verify-toolchain ambient_archive`
- **Canonical source PCM:** signed 16-bit little-endian, mono, 48 kHz; SHA-256 `0ad1c6fbf2c98aa570b1070842591fe9ab03bbf4bcfec7f6cf4e72d175a92583`.
- **Format:** OGG Vorbis, mono, 48 kHz, 30.000000 seconds.
- **Measured loudness:** -41.7 LUFS integrated.
- **Measurement:** FFprobe 8.1.2 `format.duration`; FFmpeg 8.1.2 `ebur128`, final Summary integrated `I`.
- **Content boundary:** Procedural paper-air/quiet-room texture only; nonmusical, voice-free, weapon-free, and without foreground pitch or hidden information.

The fixed-seed recipe uses only integer harmonics of the 30-second loop period. Canonical PCM is cross-platform test truth; processed OGG byte reproducibility is scoped to the documented FFmpeg/FFprobe 8.1.2 full-build toolchain. The resulting first-party synthesis may be copied, modified, packaged, and redistributed as part of A War Without Victory.
