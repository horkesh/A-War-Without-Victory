# Audio asset provenance & licenses

One file per committed audio binary, recording its source, license, and license
verification. **No binary may be committed without a matching provenance file
here** (Soundscape packet §4 cross-cutting rule 4).

## Priority-1 UI feedback set (17 cues) — committed

All 17 UI cues are sourced from a single CC0 pack:

- **Pack:** Kenney — "Interface Sounds" (v1.0, 2020-02-11)
- **Page:** https://kenney.nl/assets/interface-sounds
- **License:** Creative Commons Zero (CC0 1.0 Universal — public-domain dedication),
  https://creativecommons.org/publicdomain/zero/1.0/
- **Verification:** the pack's bundled `License.txt` states verbatim
  *"License: (Creative Commons Zero, CC0) ... free to use in personal, educational
  and commercial projects. Support us by crediting Kenney or www.kenney.nl (this is
  not mandatory)."* CC0 permits unrestricted redistribution inside a distributed /
  sold desktop (Electron) binary; attribution is **not** legally required. Kenney is
  credited here as a courtesy.
- **On disk:** `src/ui/map/assets/audio/ui/*.ogg` (compressed `.ogg` only; no raw
  masters committed, per the no-raw-sources-in-git rule).
- **Wiring:** `src/ui/map/audio/audioAssets.ts` (Rollup URL-import map) →
  `sound_manifest.ts` cues flipped to `assetStatus: 'provided'`.

| Cue id | Committed file | Kenney source file |
|---|---|---|
| `ui_click` | `ui_click.ogg` | `click_001.ogg` |
| `ui_hover` | `ui_hover.ogg` | `tick_002.ogg` |
| `ui_open_panel` | `ui_open.ogg` | `open_001.ogg` |
| `ui_close_panel` | `ui_close.ogg` | `close_001.ogg` |
| `turn_advance` | `turn_advance.ogg` | `switch_001.ogg` |
| `turn_complete` | `turn_complete.ogg` | `confirmation_001.ogg` |
| `turn_review_open` | `turn_review_open.ogg` | `drop_001.ogg` |
| `battle_notification` | `battle.ogg` | `toggle_001.ogg` |
| `battle_decisive` | `battle_decisive.ogg` | `bong_001.ogg` |
| `battle_catastrophic` | `battle_catastrophic.ogg` | `glass_001.ogg` |
| `operation_launched` | `op_launch.ogg` | `select_001.ogg` |
| `operation_complete` | `op_complete.ogg` | `confirmation_003.ogg` |
| `event_notification` | `event.ogg` | `question_003.ogg` |
| `event_critical` | `event_critical.ogg` | `error_004.ogg` |
| `peace_plan_offered` | `peace_plan.ogg` | `confirmation_002.ogg` |
| `game_over` | `game_over.ogg` | `minimize_007.ogg` |
| `tutorial_objective_complete` | `tutorial_complete.ogg` | `select_005.ogg` |

Selections favor the dry / quiet / tactile variants the composer brief requires
(no bright game beeps; gravity-not-fanfare for battle/catastrophe/game-over).

## Not yet sourced (placeholder slots — no binaries)

Ambient beds, music states, and stingers remain `missing_placeholder` and are
unwired in `audioAssets.ts`. Several are SENSITIVE / §6-gated (siege/winter
ambience, atrocity-adjacent stingers, the ceasefire human voice) and must pass
sensitivity review before sourcing. See
`docs/40_reports/20260605_SOUNDSCAPE_ASSET_SUBSTRATE_PACKET.md` §6.
