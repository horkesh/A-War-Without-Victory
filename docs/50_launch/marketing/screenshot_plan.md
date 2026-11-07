# Screenshot / Capture Plan

**Updated:** 2026-11-06 (supersedes the 2026-09-03 plan; the untracked `tmp_gui_observation/`
harness it described was lost, and the clips were reshot and re-edited with the score).
**Standard:** every published still and video is captured at **1920×1080** from the current
playable build. No mockups, no upscaling, no hand-composited frames. Clips are edited for pace
(holds cut, captions, zooms, the game's UI cues and music) but every frame is a build capture.

Live output: the public showcase at <https://horkesh.github.io/a-war-without-victory-showcase/>
(EN, plus `/bs/`), repo `horkesh/a-war-without-victory-showcase`.

## Capture and edit pipeline (scripted, versioned)

The rig lives **in the showcase repo** under `production/` (read its `PLAN.md` first). Nothing is
left in an untracked folder any more. It borrows Playwright, Electron and tsx from this repo's
`node_modules` through `createRequire`; it never junctions into them.

| Step | Tool (showcase repo, `production/`) | Notes |
|---|---|---|
| 1. Build | this repo: `npm run desktop:map:build`, then `node tools/ui/check_chunk_cycles.cjs` | check the exit code directly; a stale `dist` once carried the cyclic-chunk TDZ crash |
| 2. Saves | `capture/generate_pitch_saves.mjs` (run with this repo's tsx) | headless per-faction player saves via `tools/ai_play/president_playthrough.ts`, historical defaults, w68; about a minute for all three |
| 3. Serve | `capture/serve.mjs` | serves `dist/tactical-map` plus repo `/data`, `/runs` and the pitch saves on `127.0.0.1:3002` |
| 4. Record | `capture/record_opening.mjs`, `capture/record_tour.mjs` (browser), `capture/record_directive.mjs` (real Electron shell) | CDP screencast at 1920×1080 with per-frame timestamps and an action log (every click, beat and on-screen position); `assemble.mjs` makes a 60 fps CFR `raw.mp4` per take |
| 5. Plan | `capture/plan_edit.mjs` | hold-then-cut per beat, zooms aimed at the logged control, UI cues from the log, music per clip; writes `remotion/src/plans.generated.ts` |
| 6. Edit | `remotion/` (Remotion 4) | one composition per clip and language plus `trailer-en`/`trailer-bs`; captions in `src/strings.ts` under the copy rules below |
| 7. Finish | `remotion/render_all.mjs` → `finalize.mjs` | loudness −14 LUFS / −1.5 dBTP with a true-peak limiter, H.264 MP4 only, poster frame; EN into `media/videos/`, BS into `media/videos/bs/` (captions are burned in) |
| 8. Publish | showcase `build_screens.mjs`, then `check_media.mjs` | regenerates the screenshots pages for both languages; the check must pass before the push |

Music is the approved runtime set only (opening cue, calm menu theme, the eight Revised v2
campaign tracks), copied from this repo's audio assets at edit time and never committed to the
showcase repo; the mapping is in `plan_edit.mjs` and `Trailer.tsx`.

## Current published set (all 1920×1080)

| Group | Count | Surface |
|---|---|---|
| Per faction (RBiH / RS / HRHB), on `screens.html` | 16 each | Desk, War Map, Review Before Advance, Decision Room, Peace Proposal, Required Decision, Army HQ Request, Army HQ Briefing, Corps Command, Sector Command, Formation Detail, War Summary, Personnel, Records, Chronicle, Codex |
| Front page stills | 4 | the three desks, the campaign recap ("What It Cost") |
| Video, EN and BS | 8 each | 3 openings, 3 command tours (week 68), the directive clip (2nd Corps reserve request, real Electron shell), the 85 s trailer |

## Copy rules for captions and the page

No "X, not Y" constructions, no triads, no em-dash stings, no eyebrow labels or middle-dot
separators, no numbering of things that are not a sequence. Sentence case. Every line traces to
an implemented row of `claims_inventory.md`.

## Capture rules

- Reference the save and scenario setup behind every shot; the pitch saves are reproducible from
  step 2 above.
- Exclude rig artifacts that are **not** product state: the `?dev=1` DEV chip, and the browser-only
  "Desktop command bridge unavailable" notice (the packaged desktop app has the bridge).
- Never publish a shot of a feature marked planned or gated in `claims_inventory.md`.
- Do not crop away UI needed to understand the claim.
- **Check the published FILES, not the capture run.** `check_media.mjs` in the showcase repo
  fails if any still a page references is not 1920x1080. This is not belt-and-braces: the
  1920x1080 re-shoot of September 2026 *missed one file* and nobody saw it, because a capture
  step that looked for `OPEN REVIEW` / `REVIEW PRIORITIES` skipped without failing when HRHB
  exposed that queue as the `N REVIEWS` toolbar chip, and the stale 1440x900 file stayed published
  on both language versions for a day. A skipped capture is invisible: the old file is still there
  and looks exactly like a fresh one. Prefer a step that throws over one that logs and continues.
- **Traps the November 2026 reshoot paid for** (each cost a take): Escape in the tactical shell
  opens the pause menu, so close things with their own controls; a save loaded from the main menu
  leaves the menu up until Continue; the pending peace-plan modal's "Review Later" sits outside any
  `role=dialog` and its backdrop eats clicks; brigade counters carry their name in `aria-label`;
  Electron's first window can be DevTools, and a HiDPI desktop clamps a 1080-tall window unless
  the shell is launched with `--force-device-scale-factor=1`; Remotion's `startFrom` counts
  composition frames, not source frames.
- If a capture reveals a defect, log it in the screenshot GUI audit rather than hiding it —
  see `docs/40_reports/working/20260903_SHOWCASE_SCREENSHOT_GUI_AUDIT.md`. Re-capture affected
  surfaces after the fix lands (the 2026-09-03 toolbar fix required a full re-shoot of every
  tactical-shell still and video).
