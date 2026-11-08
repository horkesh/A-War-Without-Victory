# Original audio provenance for `battle_notification`

- **Active file.** `src/ui/map/assets/audio/designed/battle_notification.ogg`
- **Cue role.** Low battle report with a damped second contact.
- **Author and license.** A War Without Victory project, FIRST_PARTY. Fixed-seed procedural synthesis from damped modes and filtered noise.
- **Recipe.** `python tools/audio/generate_original_soundscape.py --interface-refresh --publish`
- **Masters.** 48 kHz mono PCM24 WAV in `logs/r7-english-readability/interface-cue-refresh/`. The PCM and runtime OGG hashes are in `docs/audio/AUDIO_ASSET_PROVENANCE.json`.

## Replaced Kenney source retained in the repository

- **File committed:** `src/ui/map/assets/audio/ui/battle.ogg`
- **Cue role:** Battle reported — dull toggle, not an alarm.
- **Source pack:** Kenney — "Interface Sounds" (v1.0, created 2020-02-11)
- **Source file in pack:** `Audio/toggle_001.ogg`
- **Source page:** https://kenney.nl/assets/interface-sounds
- **Download (CC0 zip):** https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip
- **License:** Creative Commons Zero (CC0 1.0 Universal — public domain dedication)
- **License URL:** https://creativecommons.org/publicdomain/zero/1.0/
- **License verification:** Pack `License.txt` states verbatim: "License: (Creative Commons Zero, CC0) ... free to use in personal, educational and commercial projects. Support us by crediting Kenney or www.kenney.nl (this is not mandatory)". CC0 permits unrestricted redistribution inside a distributed/sold desktop (Electron) binary; attribution is not required.
- **Modifications:** None. File renamed from `toggle_001.ogg` to `battle_notification.ogg` to match the manifest cue stem; bytes unchanged.

CC0 places the work in the public domain; no attribution is legally required, but Kenney is credited here and in the project audio credits as a courtesy.
