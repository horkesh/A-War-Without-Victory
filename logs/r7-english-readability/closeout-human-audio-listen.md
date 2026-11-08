# R7 human listening pass

Gate: `R7-AUDIO-HUMAN-ACCEPTANCE` (`docs/open_gates.yml`). **Status after round 1: OPEN.**

## Round 1 — 2026-11-07

- **Reviewer:** the owner (Haris).
- **When:** 2026-11-07, 23:02–23:04 UTC (answers saved by the review sheet).
- **Listening on:** headphones.
- **Files heard:** the original OGG files, byte-identical to `origin/main` at the time (sheet built from `70c36e481`; SHA-256 list below). The sheet played each file at full element volume. The game also applies its own per-cue volume, so this round judged the files themselves.
- **Sheet:** the owner's private review page (`https://claude.ai/artifact/DhGnbSQVFExKqPyDdU1kYj`), collection `listening`.

### Owner's answers, verbatim

| Item | Verdict | Owner's note |
|---|---|---|
| `turn_complete` | (none) | "I don't hear anything" |
| `operation_complete` | (none) | "Too high" |
| `event_notification` | (none) | "Too high" |
| `game_over` | (none) | "Too high" |
| `ambient_field` | (none) | "There is no wind, just constant noise. Anyway, should rely more on background music" |
| `ambient_archive` | (none) | "It's just constant noiuse" |
| Set as a whole (sensitivity) | Needs work | (no note; asked the owner what felt wrong) |
| 13 other interface sounds | (none) | (none; asked the owner whether unmarked means fine) |
| In-game checks (5) | (none) | (none; these were for a later session) |

### What the measurements show

Measured with FFmpeg 8.1.2 (`volumedetect`, `aspectralstats` centroid). The "in game" column adds the cue's `sound_manifest.ts` volume as gain (master and category at 1.0).

| Cue | Origin | Peak dB | Mean dB | Cue volume | Mean in game dB | Spectral centre Hz |
|---|---|---:|---:|---:|---:|---:|
| `ui_click` | made for AWWV | -10.2 | -26.2 | 0.5 | -32.2 | 878 |
| `ui_hover` | made for AWWV | -13.9 | -27.0 | 0.3 | -37.5 | 920 |
| `ui_open_panel` | made for AWWV | -10.3 | -29.5 | 0.4 | -37.5 | 783 |
| `ui_close_panel` | made for AWWV | -11.1 | -29.9 | 0.4 | -37.9 | 894 |
| `turn_review_open` | made for AWWV | -11.6 | -31.4 | 0.35 | -40.5 | 890 |
| `turn_advance` | made for AWWV | -9.8 | -32.8 | 0.6 | -37.2 | 761 |
| `turn_complete` | made for AWWV | -11.9 | -33.8 | 0.6 | -38.2 | 770 |
| `peace_plan_offered` | made for AWWV | -10.7 | -33.3 | 0.6 | -37.7 | 846 |
| `battle_notification` (`battle.ogg`) | Kenney CC0 | -0.9 | -14.0 | 0.5 | -20.0 | 4280 |
| `battle_decisive` | Kenney CC0 | -0.9 | -16.2 | 0.7 | -19.3 | 507 |
| `battle_catastrophic` | Kenney CC0 | -1.0 | -20.0 | 0.7 | -23.1 | 1990 |
| `operation_launched` (`op_launch.ogg`) | Kenney CC0 | -1.1 | -17.3 | 0.5 | -23.3 | 3135 |
| `operation_complete` (`op_complete.ogg`) | Kenney CC0 | -1.0 | -15.2 | 0.5 | -21.2 | 4756 |
| `event_notification` (`event.ogg`) | Kenney CC0 | -0.9 | -10.0 | 0.5 | -16.0 | 2871 |
| `event_critical` | Kenney CC0 | -1.3 | -16.4 | 0.7 | -19.5 | 2387 |
| `game_over` (`compat/game_over.ogg`) | Kenney CC0 | -1.0 | -13.6 | 0.8 | -15.5 | 2821 |
| `tutorial_objective_complete` (`tutorial_complete.ogg`) | Kenney CC0 | -1.3 | -18.7 | 0.5 | -24.7 | 1330 |

The set is two families. The eight sounds made for AWWV peak near -10 dB, average -32 to -40 dB in game and centre around 800 Hz. The nine Kenney library sounds are unprocessed, peak near 0 dB, average -15 to -25 dB in game, and mostly centre between 2 and 4.8 kHz. In the game the library sounds therefore play roughly 15–22 dB louder and much brighter. The three cues the owner called "too high" are among the loudest and brightest; `battle_notification` is in the same range. `turn_complete` is one of the quietest files.

Integrated loudness (EBU R128) read as the -70 LUFS floor for 13 of the 17 files, because they are shorter than or barely reach its 400 ms gating block, so mean level is the comparison used here.

### Owner decisions, 2026-11-08

On the owner's go-ahead ("Yes, go ahead"):
1. **Background loops retired for 1.0.** `ambient_warroom`, `ambient_field` and `ambient_archive` stay switched off (the existing `ambientPlaybackEnabled` policy gate, default off) and are out of the listening scope. Atmosphere comes from the music. The files and their provenance stay in the repository.
2. **The nine Kenney library cues are to be remade** as first-party sounds in the same family as the eight made for AWWV, level- and tone-matched to them, and **`turn_complete` made louder**. Work order to Codex: `CL-20261108-043` in the shared coordination file.
3. Round 2 covers only the changed sounds, on the same sheet.

### Still open before round 2

- What the owner found wrong in the sensitivity question.
- Whether the 13 unmarked interface sounds count as accepted.
- The five in-game checks.

### Files heard in round 1 (SHA-256)

See `closeout-human-audio-listen-round1.sha256` beside this file.
