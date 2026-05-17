# AWWV Composer Brief - Soundscape Kickoff

Date: 2026-05-17

## Project Frame

*A War Without Victory* is a historically grounded strategic wargame about Bosnia and Herzegovina in the 1990s. The score must support sustained decision-making, moral weight, fatigue, and historical seriousness. Audio should never glamorize combat or turn suffering into spectacle.

The first delivery should be modular: short cues and loopable beds that engineering can trigger from a manifest-backed audio bus. No national anthems, no direct political songs, and no inflammatory nationalist motifs.

## Main Theme

Provide one main theme suitable for the main menu and campaign identity.

Requirements:
- 90-150 seconds, loop-safe or with a clean ending.
- Restrained instrumentation: low strings, prepared piano, muted brass, sparse percussion, subtle room tone.
- Mood: solemn, tense, unresolved.
- Avoid triumphant cadence, heroic march rhythm, or victory fanfare.
- Deliver full mix plus stems for strings, percussion, drones/texture, and melodic lead.

## Ambient Loops

Provide 4-6 ambient loops, each 60-120 seconds and seamless.

Requested set:
- Peace spring: sparse rural ambience, distant town life, early instability under the surface.
- Sarajevo siege: indoor room tone, distant impacts, intermittent city silence; never action-film intensity.
- Front winter: wind, distant artillery pressure, low mechanical texture, reduced warmth.
- Diplomatic table: subdued institutional room tone, paper movement, low sustained tension.
- Late-war exhaustion: near-silence, wind, low-frequency fatigue, minimal musical content.
- Dayton ceasefire aftermath: quiet human presence returns, restrained relief without celebration.

## UI Feedback Set

Provide short non-musical UI cues, 100-700 ms each:
- Confirm/click.
- Hover/focus.
- Open panel.
- Close panel.
- Advance turn confirmation.
- Decision required.
- Review warning.
- Operation launched.
- Operation complete.
- Peace proposal offered.

These should be dry, quiet, and tactile. Avoid bright game-like beeps.

## Stingers

Provide 3-5 stingers, 2-8 seconds each:
- Major escalation.
- Peace plan offered.
- Dayton ceasefire.
- Campaign verdict.
- Severe humanitarian warning.

Stingers should mark gravity, not reward the player.

## Sensitive-History Constraints

Hard constraints:
- No glorifying violence.
- No inflammatory nationalist cues.
- No national anthems.
- No folk quotations that could be read as factional endorsement.
- No celebratory battle music.
- No realistic screams, suffering vocals, or exploitative trauma sound design.
- Keep human voice use rare and specific; the first clear human voice is reserved for the ceasefire concept unless separately approved.

## Delivery Format

Preferred delivery:
- WAV 48 kHz / 24-bit masters.
- OGG or MP3 preview exports for integration tests.
- Loop files with exact loop point notes if not sample-perfect.
- Stems for main theme and ambient loops.
- Filename prefix matching cue intent, for example `ambient_war_winter_loop.wav`.

Engineering will map files into `src/ui/map/audio/sound_manifest.ts` after asset approval.
