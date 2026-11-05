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
