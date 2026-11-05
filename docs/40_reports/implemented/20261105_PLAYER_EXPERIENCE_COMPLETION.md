# Player experience, original soundscape and accessible controls

**Date:** 2026-11-05, Europe/Sarajevo.

**Branch/base:** `codex/player-experience-completion` from `f0d77121c`.

**Status:** Implemented, verified and independently reviewed GO for the scoped local branch. No integration or R7 closure.

## Delivered behavior

- Audio disable/mute pauses media immediately. Master/category volume changes reach existing elements. Enable is idempotent, bed replacement is exclusive, unsupported media is contained, failed decodes can be retried, and stopped pending music cannot outlive its owner.
- Gesture unlock works from the main menu. Controller retries retain the current in-memory preference, including when browser storage is unavailable. Playback does not begin before a user gesture.
- Background music has its own persisted opt-in, **off by default**, and volume control. The existing global Soundscape enable/mute and Master Volume apply to music as well as interface sounds. The independent ambient gate remains **off**. The current theme may repeat after its clean fade ending; it is not advertised as a seamless loop.
- Settings uses the shared dialog focus helper, labelled dialog semantics, forward/reverse Tab containment, Escape closure and opener focus restoration. Section buttons wrap, disclose selection and remain usable at 1366×768 and 700×560; reduced-motion preference remains available.
- Existing visual feedback remains canonical. Sound does not grant information, authorize an action, select a policy or change a campaign.

## Original audio and compatibility

The owner selected sparse piano, low strings and analogue texture, then asked for less sparsity and a haunting character. **Still Table v2** is an original 90-second synthesized score with a recurring low piano figure, overlapping string suspensions, longer decays and evolving texture. The first draft remains preserved. Eight new tactile effects replace selected runtime mappings; all 20 pre-existing binaries remain byte-exact. Deterministic recipes, provenance/history, license notes, PCM24 mix/four stems, MP3 auditions and measurements are retained. There is no connected music-generation service or recorded instrumental performance claim.

The final music is 48 kHz stereo, approximately −21.3 LUFS with −9.47 dBFS decoded peak. These are technical measurements, not aesthetic or human listening approval. Preview paths are recorded in the [receipt](20261105_PLAYER_EXPERIENCE_COMPLETION_RECEIPT.json).

Chromium rejected the retained original `game_over.ogg` with `DEMUXER_ERROR_COULD_NOT_PARSE: PTS is not defined`. A reproducible FFmpeg stream-copy remux supplies its compatibility URL. All 30 compressed packets are unchanged; repaired timestamps expose 128 additional decoder-tail samples after the identical original 8064-sample prefix. No re-encoding or full decoded-PCM-identity claim is made. The original is retained, and the exact compatibility file passes Chromium decode at 0.18576 seconds.

## Formerly unproven cue disposition

| Cue | Current disposition |
|---|---|
| `ui_click`, `ui_open_panel`, `ui_close_panel` | Scoped Settings actions/entry/exit; no blanket click listener |
| `turn_advance` | Explicit confirmed Advance request past existing blockers; does not claim successful completion |
| `game_over` | Existing terminal appearance, using compatibility asset |
| `tutorial_objective_complete` | Existing successful onboarding step |
| `ui_hover` | Asset available; deliberately dormant to avoid continuous hover noise |
| `battle_catastrophic`, `event_critical` | Dormant; no invented severity classifications |
| `operation_launched` | Dormant; staging an order does not establish execution |

## Verification and retained failures

Evidence root: `logs/player-experience-completion-20261105/`, ignored locally and preserved in this worktree. The committed receipt lists source hashes and evidence paths.

- Controls baseline: 12 files / 67 tests. Final affected pack: 18 files / 121 tests, followed by two equivalent selector corrections verified separately. Independent review's pending-stop regression failed before the fix, then the affected four files / 49 tests passed. Unaffected evidence is reused; these counts overlap and are not summed.
- Initial asset pack: three files / 20 tests and three Python synthesis checks. The owner-requested v2 music has its own reproducibility check. The compatibility repair has a corrected targeted packet/tail test plus provenance checks. A misnamed initial `game-over-compat-green.log` contains a failure and is retained as failed evidence; corrected evidence is named explicitly.
- Final typecheck, negative-assertion hygiene, tactical-map build and chunk-cycle check exit 0. All 21 emitted OGGs match current source/provenance hashes; 18 chunks have no import cycles.
- `browser-03` completed real Settings/music control checks and both viewports before a hidden narrow-width shell selector stopped it. Only its completed first four checks are reused. `browser-05` passes the remaining real Map/Chronicle/Warroom routes, file/fingerprint preservation, all 21 local decodes and cue-specific successful play promises. External networking was blocked; no external font/audio attempt or unhandled renderer error was recorded. Direct bus probes are distinguished from product hooks. No campaign was advanced.
- Earlier harness URL/viewport failures and the original demux failure remain recorded. `npm ci` failed on inherited packaging lock omissions; non-lock-writing install failed on an unavailable dependency version. An isolated physical dependency copy excluded junctions; manifests/lockfile are unchanged. No clean-install or packaged-runtime acceptance is claimed.

## Scope and review

Changed surfaces are renderer audio/preferences/controller, Settings and narrow existing cue hosts, EN/BCS keys, asset/provenance tooling, tests and the browser diagnostic. No simulation, canonical state/save schema, desktop mutation/IPC, scenario, authored/control data, calibration tooling or dependencies changed. Original-audio preservation and protected-path checks pass.

Independent review identified the pending `stopMusic` race and a proof-quality issue; both have targeted corrections. Final review status is recorded in the receipt. Human listening, distinct sensitivity/design acceptance, packaged/native offline acceptance and global R7/calibration gates remain open. No push, merge, publication or release is part of this packet.

## New sampled theme audition — What Remains of Home (2026-11-05)

The owner rejected the two procedural music drafts and requested a new original theme with The Leftovers and This War of Mine as references. A separate audition now uses recorded instruments: an upright piano from Simon Dalzell/Ivy Audio, and cello/violin recordings distributed in Versilian Studios' CC0 VSCO2CE library. The source repository is pinned to `440300901dfe9275fd84e0b7763af1f8443ae62e`. These are sampled performances of project-authored notes, not a new live recording or borrowed soundtrack melody.

**What Remains of Home** is approximately 2:05: an original eight-bar piano melody enters at about 0:07, develops with cello responses and violin suspensions, rises through the middle, then returns softly to an unresolved D-minor/add9 coda. The 32-bar score contains 302 events (241 piano, 43 cello, 18 violin). Piano key-release/pedal clearance prevents notes smearing across harmonies; the strings overlap more freely. Master/stem WAVs are 48 kHz/24-bit stereo; MP3/OGG auditions and editable score JSON are retained. Final mix measures −18.4 LUFS, 7.3 LU loudness range and −2.6 dBFS true peak. These metrics do not establish artistic approval.

[Audition provenance and source hashes](../../audio/WHAT_REMAINS_OF_HOME_AUDITION.json) records all source URLs, license/credits, score/recipe/export hashes and verification. The 23-WAV cache is 88.26 MB (22 samples used), within the 120 MB cap. Pitch measurements established the upright mapping and corrected a cello/violin filename octave convention; all used anchors were checked. Technical gates cover finite/nonclipped samples, decoded compressed exports, PCM24 frame/stem consistency and source preservation. Chromium also decoded and successfully played both final MP3/OGG exports with advancing time. An initial metadata-only NumPy serialization failure and first mix are preserved; one bounded release/pedal correction was rendered. No broad composition campaign or frontend/simulation validation was repeated.

Reproduce with `python tools/audio/create_after_the_silence.py`; `--score` accepts the retained editable score JSON. Source hashes, authored timing and seeded room texture are pinned under the recorded toolchain; byte-identical encoded output across different platforms/toolchains is not promised. Auditions, three stems, evidence and sample/license cache are under `logs/player-experience-completion-20261105/theme-v3/`. Preserve that directory before any worktree retirement.

This audition leaves the integrated v2 theme, runtime audio mappings, UI and previous engineering receipt unchanged. Human listening/creative acceptance remains open. Final independent technical/provenance verdict is recorded in the audition JSON; no R7, calibration, packaged/native, merge or publication acceptance follows from this draft.

## Musician-feedback continuation audition (2026-11-05)

The owner forwarded positive feedback from a musician and suggested a faster later section with timpani, war drums and fuller strings, with Game of Thrones as an arrangement reference. A separate **What Remains of Home - Continuation** audition develops the existing original theme; no reference recording, MIDI or melody was imported.

The 44-bar, **2:25** version retains the original first 16 bars' 144 score events (identities, timing, duration and velocity), introduces an 80 BPM build around **0:58**, then moves to 96 BPM with fuller strings and percussion around **1:22**, before an unresolved slowing coda. New recorded viola, cello spiccato, timpani and frame-drum parts add movement and weight. The final master prefix is not claimed byte-identical, because overall gain/mix/tails can differ. The original v3 recipe, master/MP3/OGG, score and source cache were separately checked: all 33 recorded file hashes remain exact.

The first bounded full render passed. The master is 48 kHz/24-bit stereo, 144.771521 seconds, −18.3 LUFS and −3.1 dBFS true peak. Four additive stems (piano, strings, percussion, texture) match the mix within two PCM24 LSB. Both MP3 and OGG decode and resolve trusted-gesture play promises with advancing time in Chromium. The selected CC0 VSCO2CE cache totals 112.78 MB, within the existing 120 MB cap. New pitched string anchors were checked; timpani tuning is described through inharmonic resonant partials rather than a false pure-fundamental claim. Source and imported-v3 dependency hashes were frozen before rendering and confirmed afterward.

[Continuation provenance](../../audio/WHAT_REMAINS_OF_HOME_CONTINUATION_AUDITION.json) records source/score/export/stem hashes, tempo entrances, preservation and final independent technical/provenance review. Reproduce using `python tools/audio/create_theme_continuation.py`; outputs, the short preflight excerpt, samples/licenses, editable score and review evidence are in `logs/player-experience-completion-20261105/theme-v4/`. Human creative/sensitivity acceptance and runtime adoption remain open. Previous frontend/engine evidence is reused; no runtime/UI/state/save/calibration/data/dependency changes or repeated campaign/build/package followed this audition.

## Settled audio roles and short opening cue (2026-11-05)

The creative role decision is **original sampled v3 for calm menu background**, plus a separate **35-second opening/title identity**. The original main-theme candidate remains within its 90–150 second brief; the short cue has a distinct function. The busy continuation remains available for comparison. No further function decision was requested from the owner.

The opening starts the original A-to-D motif at 0.5 seconds in bowed cello, with warm viola/violin support, two restrained low timpani strikes and one swell leading to an arrival near 23.8 seconds. There is no piano, metallic tuned percussion, clattering frame hit or spiccato ostinato. It contains 54 authored events and uses only ten existing source/license records, with zero downloads. WAV PCM24/48 kHz stereo, MP3/OGG and strings/percussion/texture stems are retained. Final level is −18.1 LUFS/−5.6 dBFS true peak; the three stems add within two PCM24 LSB. One common-gain refinement matched menu listening level; this was level matching, not an artistic pass/fail rule. First-attempt audio and browser evidence remain retained.

[Opening audition provenance](../../audio/WHAT_REMAINS_OF_HOME_OPENING_AUDITION.json) binds all three frozen recipes, source/score/export hashes, final Chromium MP3/OGG decode/play/time-advance checks, preservation and independent technical review. All 14 recorded prior main-artifact/score/recipe checks pass. Reproduce with `python tools/audio/create_opening_cue.py`; evidence and masters are under `logs/player-experience-completion-20261105/theme-v5-opening/`. Private MP3 copies of the selected menu and opening were uploaded and metadata-verified through the connected Drive workflow for phone access; only owner permissions are present. Personal Drive links are retained in ignored delivery evidence, not committed metadata.

This settles the audio-purpose choice and delivers both files. Human artistic/sensitivity acceptance and runtime adoption remain separate. No production audio/mapping/UI/engine/state/save/IPC/calibration/data/dependency change, campaign/build/package, merge/push or release followed this cue.

## Actual native opening video (2026-11-05)

Recorded the real Electron game from title through faction/dossier/setup into a new RBiH campaign at turn 0, with the selected 35-second cue played live through temporary renderer preview wiring. The 43.64-second phone MP4 is H264 1280x720 / AAC stereo, 1,941,515 bytes, SHA256 `c28f13bb8391dad8ef483af7ce8fab133ef4caaf23edf65277d8ffb8c004b948`. Private Drive delivery was read back with matching size/type and owner-only permission; personal links remain in ignored delivery evidence.

The first in-game announcement is visible by about 31 seconds; the cue ends at 35.665 seconds into the video. Keep the 35-second opening identity: it covers this brisk walkthrough and arrival. Title dismissal and setup are player-paced, so this does not establish a universal opening duration. Runtime adoption should hand off to the calm menu theme for longer reading, rather than prolonging the cue or forcing a wait.

Evidence is retained under `logs/player-experience-completion-20261105/opening-video/`: actual native frames, live MediaRecorder audio, capture epochs, source/profile receipts, final encode/probe/decode analysis and independent review. The first take was rejected because the native resolver selected another worktree's existing Vite server. Corrected preflight and take bind the served JS to this worktree's built asset and explicitly verify isolated native userData/sessionData/save roots. The original preflight's command-line profile flag alone did not establish native isolation. No foreign server/process was changed. Two isolated campaign initializations across rejected/qualified takes, zero Advances/orders; no existing save loaded. Task-owned app processes closed.

Independent review identified out-of-order frame arrival and stop-boundary frames. An encode-only correction sorted original timestamped frames and excluded five beyond captureEnd; all 1,236 retained intervals are positive and sum to the capture duration. CFR rounding adds 38.868 ms within the declared 40 ms bound. Prior encodes and every raw frame remain in `attempt02/encode01/` and the original capture evidence. Final decode passes with no detected black intervals. No recapture followed this correction.

This is an actual-game audio preview, not permanent integration of the new cue or a packaged-runtime acceptance test. No production source, audio mapping/asset, engine/state/save schema, calibration or dependency change followed it. Unaffected prior engineering evidence is reused; no suite, simulation campaign or release package was repeated.
