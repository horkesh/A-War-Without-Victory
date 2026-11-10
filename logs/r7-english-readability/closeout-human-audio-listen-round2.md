# R7 human listening pass, round 2, and R7 closure

Gates: `R7-AUDIO-HUMAN-ACCEPTANCE` and `R7-ACCEPTANCE-ALL-GREEN` (`docs/open_gates.yml`). **Both closed 2026-11-08 by the owner.**
Round 1 and the round-2 technical handoff are in [closeout-human-audio-listen.md](closeout-human-audio-listen.md).

## Round 1 clarifications (owner, in chat, 2026-11-08)

- The 13 interface sounds left unmarked in round 1 are fine.
- The sensitivity answer "Needs work" referred only to the sounds already flagged. Nothing in the set is inappropriate for the subject.

## Round 2 — 2026-11-08

- **Reviewer:** the owner (Haris), on the same review sheet.
- **Files:** the ten changed cues from Codex's PR #558 at `91ef2af42` (nine first-party replacements for the Kenney cues, and `turn_complete` louder with its playback timestamp defect fixed). The sheet offered each round-1 version for comparison.
- **Claude's check before the owner listened:** the same measurement as round 1 matches Codex's table exactly. The nine replacements play at -37.7 to -34.0 dB mean in game, inside the range of the seven cues accepted in round 1, with spectral centres of 274–470 Hz. `turn_complete` plays at -32.0 dB, +6.2 dB on round 1. All ten files decode with no FFmpeg errors.
- **Owner's verdict:** "Yeah, they're fine." All ten are recorded as Good on the sheet (`listening/r2_<cue>`).

So all 17 interface cues the game ships are accepted for listening and sensitivity. The three ambient beds were retired for 1.0 on 2026-11-08 and are out of scope.

## In-game checks waived to R8

The sheet's five in-game checks (sounds at the right moments, levels under the music, mute, music transitions, settings after a restart) were not run. The owner closed the gate without them on 2026-11-08: "We can always debug those." Part of that ground is already covered by machine evidence: mute, volume, the music switch and same-profile restart persistence passed in the packaged app ([offline runtime record](closeout-offline-audio-runtime.md)). The rest is played and judged in R8's packaged 24-turn shakedowns and 188-turn campaigns, which run with sound. An audio fault found there is filed as an R8 finding.

## R7 closure — owner, 2026-11-08

The owner directed: "Close the listening gate and R7." Every R7 gate in the register is now closed:

| Gate | Closed | Evidence |
|---|---|---|
| `R7-BASELINE-SIX-PIN` | 2026-09-12 | `docs/40_reports/CALIBRATION_MASTER.md` |
| `R7-WARROOM-PRESENTATION` | 2026-09-12 | `docs/plans/2026-09-10-warroom-whiteboard-date-and-corkboard-map-design.md` |
| `R7-AUDIO-CUE-WIRING` | 2026-11-07 | `docs/40_reports/implemented/20261105_PLAYER_EXPERIENCE_COMPLETION.md` |
| `R7-AUDIO-OFFLINE-RUNTIME` | 2026-11-07 | [closeout-offline-audio-runtime.md](closeout-offline-audio-runtime.md) |
| `R7-AUDIO-HUMAN-ACCEPTANCE` | 2026-11-08 | this file |
| `R7-ACCEPTANCE-ALL-GREEN` | 2026-11-08 | this file (roll-up) |

Work under R7 that was not finished moves as follows:
- **In-game audio checks:** R8 packaged campaigns, as above.
- **Visual-polish follow-ups, lane D (Army HQ on paper):** slices 1 and 2 are on main; the further optional slices go to the post-1.0 backlog in the master roadmap.
- **Visual-polish follow-ups, lane B (held enclave art):** HOLD stands; the panel's revised brief travels with the enclave feature's own PR.
- **Phase 3 localization:** remains post-1.0, as before.

The plan's §6 success-criteria boxes are not ticked retroactively; the gate register above is the acceptance record.
