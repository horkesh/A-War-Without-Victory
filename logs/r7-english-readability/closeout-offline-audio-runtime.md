# R7 offline audio runtime — packaged Windows build, 2026-11-07

**Gate:** `R7-AUDIO-OFFLINE-RUNTIME` (`docs/open_gates.yml`). **Result: PASS.**

**Source:** `81ab0051c5804dc0a3f5dc0343b3af4239826668` (main `70c36e481` plus one docs-only commit; includes #551, which stores audio settings in the Electron profile).
**Package:** `npm run desktop:package:dir`, exit 0, Electron 41.0.3, `dist-packaged/win-unpacked`.

| Item | SHA-256 |
|---|---|
| `A War Without Victory.exe` | `0dc0da808653b7ff6e01e4e92d6529f976d0a838eb5055983e253bfb1b46f9fe` |
| `resources/app.asar` | `5f599d5ab2eedf66057508ab8876a4f1a819eb1751ed9c64c4423393c11ad576` |
| Chromium NetLog, run 1 (not committed, 1.6 MB) | `60bcba16d133e90f3a63c9cf3f56f82960631f9d18311fa792c1be492048e365` |

Both hashes were rechecked after each launch and did not change.

## Method

Codex's harness from the morning qualification (`CX-20261107-PACKAGED-AUDIO-QA`, source `f64ddf748`) was reused unchanged except for the commit label (`harness/`, origin hashes in `harness/harness-origin.sha256`). It launches the real packaged executable with an isolated profile, save root and app-data folders, and with no machine-wide network change:

- Chromium traffic goes through a loopback proxy that answers 502 to everything, so any external HTTP(S) fails; loopback app traffic is direct.
- Node `http`/`https` in the main process is restricted to loopback, and the developer-server ports 3002–3005 are refused.
- Chromium NetLog records every URL the network stack touches.
- `window.Audio` is wrapped to observe each media element's source, clock, volume, pause and decode state. Every action goes through the real UI.

## Run 1 — offline playback and controls (`runtime01-receipt.json`, exit 0)

1. Packaged boot on `http://127.0.0.1:60482`; proxy resolution and served bundle bytes match `app/` in the package. All 30 packaged OGG files hash-match their source files.
2. Music is off by default; opening Settings plays `ui_open_panel`.
3. Turning music on plays the 35-second opening, which ends naturally into the looping menu theme. The master and music sliders each lower the element gain. Mute pauses everything; unmute resumes where it stopped. The music switch stops and restarts the menu theme independently.
4. Closing Settings plays `ui_close_panel`. A new RBiH campaign at turn 0 plays the campaign track *The Long Winter*; `ui_click` played and decoded.

Sounds observed playing: opening, menu theme, *The Long Winter*, `ui_open_panel`, `ui_click`, `ui_close_panel`. Page errors 0, console warnings/errors 0, decode errors 0.

**Requests:** 109 renderer requests, 0 remote. NetLog 11,190 events: 6 local OGG URLs, **0 remote URLs**. The denying proxy received **0** requests. The main process made 8 Node requests, all to `127.0.0.1:3002–3005/index.html` (the developer-server probe, see below), none remote. Four local OGG range requests were cancelled by the media element (`ERR_ABORTED`); playback and decode checks passed. Clean exit 0.

## Run 2 — same-profile relaunch (`relaunch01-receipt.json`, exit 0)

Same package and profile, first port held so the origin changes (`60482` → `55149`). Settings showed music on, master 45%, music 45%, matching run 1. The turn-0 save stayed byte-identical. NetLog 0 remote URLs; proxy 0 requests; clean exit 0. The morning run on `f64ddf748` failed this check (reset to off/50%); #551 fixed it.

## Scope

This closes the gate's stated evidence: playback and controls observed in the packaged app, and a trace with zero remote audio requests. It does not cover the rest of the plan's QA row (Chronicle/Records, Review Before Advance and peace-plan surfaces, silence of the optional placeholders, a distinct QA reviewer's sign-off) or human listening; those stay with `R7-AUDIO-HUMAN-ACCEPTANCE` and the roll-up gate. Ambient beds stay disabled by policy and were not exercised.

## Finding outside this gate

The packaged app probes `127.0.0.1:3002–3005` for a Vite dev server on every launch (`resolveMapServerBaseUrl` in `src/desktop/electron-main.cjs`, no `app.isPackaged` check). In a released build, a dev server on one of those ports would be loaded into the game window with the preload bridge. Not an internet request and not part of this gate; recorded for a separate fix.
