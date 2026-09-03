# Screenshot / Capture Plan

**Updated:** 2026-09-03 (supersedes the 2026-05-17 draft, which planned 1440×900 shots that were
never taken from a modern build).
**Standard:** every published still and video is captured at **1920×1080** from the current
playable build. No mockups, no upscaling, no hand-composited frames.

Live output: the public showcase at <https://horkesh.github.io/a-war-without-victory-showcase/>
(EN, plus `/bs/`) — repo `horkesh/a-war-without-victory-showcase`.

## Capture pipeline (scripted)

Harness lives in `tmp_gui_observation/` (untracked working area; documented in project memory under
`showcase-pitch-site-harness`).

| Step | Tool | Notes |
|---|---|---|
| 1. Build | `npm run desktop:map:build` | check the exit code directly, then `node tools/ui/check_chunk_cycles.cjs` — a stale `dist` once carried the cyclic-chunk TDZ crash |
| 2. Saves | `generate_pitch_saves.mjs` | headless per-faction player saves via `desktop_sim` (startNewCampaign + advanceTurn, autonomy 3); w68 for mid-campaign, w191 for the Dayton/endgame set |
| 3. Serve | `serve_map.mjs` | serves `dist/tactical-map` **plus** repo `/data` and `/runs` on `127.0.0.1:3002` |
| 4. Stills | `capture_faction_v2.mjs`, `capture_extras.mjs`, `capture_endgame_1080.mjs` | browser rig |
| 5. Command-surface stills | `electron_lib.mjs` + `electron_capture_verbs.mjs` | real Electron app; the browser build renders directive levers inert |
| 6. Video | `record_opening_v2.mjs`, `record_tour_v2.mjs`, `record_directive_flagship.mjs` | Playwright `recordVideo`; transcode webm + H.264 mp4 |
| 7. Publish | showcase `build_panels.mjs` | regenerates EN/BS media panels and reads real durations via ffprobe |

## Current published set (all 1920×1080)

| Group | Count | Surface |
|---|---|---|
| Per faction (RBiH / RS / HRHB) | 17 each | Desk, War Map, Cost Ledger, Review Before Advance, Decision Room, Peace Proposal, Required Decision, Army HQ Request, Army HQ Briefing, Corps Command, Sector Command, Formation Detail, War Summary, Personnel, Records, Chronicle, Codex |
| Presidential verbs | 4 | Command surface tray, Decorate a unit, Visit the front, Address the nation (Electron) |
| Endgame | 4 | Dayton negotiation, Verdict, campaign recap ("What It Cost"), Another Such Victory |
| Video | 7 | 3 openings (desk → war map), 3 command tours, 1 flagship order clip |

## Capture rules

- Reference the save and scenario setup behind every shot; the pitch saves are reproducible from
  step 2 above.
- Exclude rig artifacts that are **not** product state: the `?dev=1` DEV chip, and the browser-only
  "Desktop command bridge unavailable" notice (the packaged desktop app has the bridge).
- Never publish a shot of a feature marked planned or gated in `claims_inventory.md`.
- Do not crop away UI needed to understand the claim.
- **Check the published FILES, not the capture run** — `check_media.mjs` in the showcase repo
  fails if any still a page references is not 1920x1080. This is not belt-and-braces: the
  1920x1080 re-shoot *missed one file* and nobody saw it. `capture_faction_v2.mjs`'s
  `05_decision_room` step looks for `OPEN REVIEW` / `REVIEW PRIORITIES` and **skips without
  failing** when neither exists; HRHB exposes that queue as the `N REVIEWS` toolbar chip, so the
  step wrote nothing and a stale 1440x900 file from the previous round stayed published on both
  language versions for a day. **A skipped capture is invisible — the old file is still there and
  looks exactly like a fresh one.** Prefer a step that throws over one that logs and continues.
- If a capture reveals a defect, log it in the screenshot GUI audit rather than hiding it —
  see `docs/40_reports/working/20260903_SHOWCASE_SCREENSHOT_GUI_AUDIT.md`. Re-capture affected
  surfaces after the fix lands (the 2026-09-03 toolbar fix required a full re-shoot of every
  tactical-shell still and video).
