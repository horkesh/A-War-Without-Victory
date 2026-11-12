# Original audio provenance for `game_over`

- **Active file.** `src/ui/map/assets/audio/designed/game_over.ogg`
- **Cue role.** Three descending muted contacts.
- **Author and license.** A War Without Victory project, FIRST_PARTY. Fixed-seed procedural synthesis from damped modes and filtered noise.
- **Recipe.** `python tools/audio/generate_original_soundscape.py --interface-refresh --publish`
- **Masters.** 48 kHz mono PCM24 WAV in `logs/r7-english-readability/interface-cue-refresh/`. The PCM and runtime OGG hashes are in `docs/audio/AUDIO_ASSET_PROVENANCE.json`.

## Replaced Kenney source retained in the repository

- Current runtime file: `src/ui/map/assets/audio/compat/game_over.ogg`.
- Source: Kenney Interface Sounds, `minimize_007.ogg`, CC0 1.0; original source and full source/license attribution remain below and in the sidecar previous version.
- Processing: `python tools/audio/remux_game_over.py`, FFmpeg 8.1.2; `-fflags +genpts -map_metadata -1 -c:a copy -fflags +bitexact` repairs Ogg presentation timestamps without transcoding. All 30 compressed Vorbis packet hashes are identical, with no transcode. The original 8064 decoded samples remain identical; repaired timestamps expose an additional 128-sample decoder tail (8192 total at 44.1 kHz). FFprobe container duration reports 0.182857 seconds; decoded audio/Chromium presentation is 0.185760 seconds.
- Reproduction check: `python tools/audio/remux_game_over.py --verify`; original and processed SHA256 are recorded in `AUDIO_ASSET_PROVENANCE.json`.
- Reason: Chromium rejected the original container with `PTS is not defined`; browser decoding is verified separately from lossless/reproducibility checks.
- Original `src/ui/map/assets/audio/ui/game_over.ogg` remains unchanged.

## Retained original source and license

# Audio provenance: `game_over`

- **File committed:** `src/ui/map/assets/audio/ui/game_over.ogg`
- **Cue role:** Game over — low descending, somber.
- **Source pack:** Kenney — "Interface Sounds" (v1.0, created 2020-02-11)
- **Source file in pack:** `Audio/minimize_007.ogg`
- **Source page:** https://kenney.nl/assets/interface-sounds
- **Download (CC0 zip):** https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip
- **License:** Creative Commons Zero (CC0 1.0 Universal — public domain dedication)
- **License URL:** https://creativecommons.org/publicdomain/zero/1.0/
- **License verification:** Pack `License.txt` states verbatim: "License: (Creative Commons Zero, CC0) ... free to use in personal, educational and commercial projects. Support us by crediting Kenney or www.kenney.nl (this is not mandatory)". CC0 permits unrestricted redistribution inside a distributed/sold desktop (Electron) binary; attribution is not required.
- **Modifications:** None. File renamed from `minimize_007.ogg` to `game_over.ogg` to match the manifest cue stem; bytes unchanged.

CC0 places the work in the public domain; no attribution is legally required, but Kenney is credited here and in the project audio credits as a courtesy.
