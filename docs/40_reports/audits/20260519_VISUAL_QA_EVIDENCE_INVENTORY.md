# Visual QA Evidence Inventory + Capture Matrix

**Date:** 2026-05-19
**Plan:** `docs/plans/2026-05-18-autonomous-visual-qa-evidence-plan.md` Tasks 1-2.
**Branch:** `codex/rc-hardening-evidence-2026-05-19`.

This audit inventories repo-resident visual evidence under
`docs/40_reports/implemented/visual_validation/` and the parent player-facing
surfaces named in the plan, marks staleness against current component state,
and lays out the capture matrix for surfaces still missing evidence. No UI
mechanics changed; this is documentation only. Per plan stop-gate, fresh
browser captures are not run from this batch because they require a local
Vite dev server and operator presence; the matrix names exact `capture.cjs`
invocations operators can run when the dev server is available.

## Inventory of existing visual evidence

### Captures with capture scripts + screenshots

| Date | Folder | Surface | Viewports captured | Tooling | Status (2026-05-19) |
|---|---|---|---|---|---|
| 2026-05-18 | `20260518_cinematic_verdict/` | Endgame `VerdictScreen` shell + `CinematicVerdict` band | 390x844, 768x1024, 1440x900 | per-folder `capture.cjs` against `http://127.0.0.1:3002/?dev=1&live=1` | **Active** — locks down the `shrink-0` fix recorded in `docs/40_reports/implemented/20260518_CINEMATIC_VERDICT.md`. |
| 2026-05-18 | `20260518_endgame_small_screen_verdict_flow/` | Endgame Report/Reckoning segmented flow | 390x844 (Report + Reckoning sections), 1440x900 (Overview) | per-folder `capture.cjs` | **Active** — captures the segmented small-screen presentation. |
| 2026-05-18 | `20260518_presidential_loop/` | Presidential Decision Room product loop (Brief → Inspect → Decide → Execute → Report → Cost → Judge → Next) | Single viewport step sequence (8 PNGs) | `tools/ui/presidential_loop_smoke.cjs` against dev tactical map | **Active** — corresponds to `docs/40_reports/implemented/20260515_DECISION_ROOM_PRODUCT_LOOP_HEARTBEAT.md`. |
| 2026-05-17 | `20260517_track_c_*_unblocked.jpg` (3 files) | Tactical map Authority / Legitimacy / Supply modes | Single viewport JPG each | Manual capture (no committed script) | **Active** — recorded with `docs/40_reports/implemented/20260516_TACTICAL_MAP_INFORMATION_DESIGN_TRACK_C.md`. Re-capture only when overlay code changes. |
| 2026-05-17 | `20260517_track_d_*_anchor.jpg` (2 files) | Chronicle filter coachmark + HQ coachmark anchors | Single viewport JPG each | Manual capture (no committed script) | **Active** — corresponds to `docs/40_reports/implemented/20260517_TRACK_C_D_BROWSER_VISUAL_VALIDATION.md`. |

### Implementation/audit reports cross-referencing visual evidence

- `docs/40_reports/audits/20260518_A11Y_RC_BROWSER_EVIDENCE_VERIFICATION.md` —
  a11y RC browser evidence verification report (Batch 46 closeout).
- `docs/40_reports/implemented/20260518_ACCESSIBILITY_P0_BATCH18.md` —
  Accessibility P0 doc reconciliation.
- `docs/40_reports/audits/20260518_ACCESSIBILITY_P0_CLOSEOUT_VERIFY_STALE.md` —
  source-of-truth for the closed Accessibility P0 lane.

## Capture matrix — high-value surfaces with planned captures

Columns: Surface · Route/save/setup · Viewport · Required assertions ·
Screenshot path · Console-error policy.

The matrix below is the operator-runnable plan. Each row that already has a
folder under `visual_validation/` is marked **(have)**. Rows marked
**(pending)** still need a capture, and the listed command should be run
from a clean dev shell with the Vite tactical map dev server already up.

### Endgame + verdict

| Surface | Route/save/setup | Viewport | Required assertions | Screenshot path | Console-error policy |
|---|---|---|---|---|---|
| Cinematic verdict band **(have)** | `?dev=1&live=1`; injected loaded-game state | 390x844, 768x1024, 1440x900 | Verdict surface + cinematic band present; cinematic band height > 0; share copy action visible at mobile | `20260518_cinematic_verdict/{mobile,tablet,desktop}_*.png` | Zero unexpected console errors. |
| Endgame Report / Reckoning segmented flow **(have)** | Same as above | 390x844 (report and reckoning sections), 1440x900 (overview) | Active section is measurable, inactive section is `0x0`; overall flow visible at desktop | `20260518_endgame_small_screen_verdict_flow/*.png` | Zero unexpected console errors. |

### Decision Room + pre-advance review

| Surface | Route/save/setup | Viewport | Required assertions | Screenshot path | Console-error policy |
|---|---|---|---|---|---|
| Presidential Decision Room — full eight-step loop **(have)** | `tools/ui/presidential_loop_smoke.cjs` with base save `data/derived/latest_run_final_save.json` | Default loop viewport | Each loop step renders the labeled surface; no blank/empty state on any step | `20260518_presidential_loop/*.png` | Zero unexpected console errors. |
| Pre-advance command review modal **(pending)** | Loaded save with pending Decision Room rows; advance-turn modal open | 390x844, 1440x900 | Pre-advance modal lists deterministic rows; deep-link routes navigate to Decision Room source surfaces | `<new>/20260519_pre_advance_review/{mobile,desktop}_*.png` | Zero unexpected console errors. |

### First-session onboarding + opening brief

| Surface | Route/save/setup | Viewport | Required assertions | Screenshot path | Console-error policy |
|---|---|---|---|---|---|
| Opening brief 3-bullet scan card **(pending)** | Fresh save (first-session); `OnboardingOverlay` armed | 390x844, 1440x900 | 3 bullets visible; no stacked first-run overlays | `<new>/20260519_first_session_overview/{mobile,desktop}_*.png` | Zero unexpected console errors. |
| First-turn coachmarks: Decision Room, Operation Opportunity, Chronicle, Codex **(pending)** | Fresh save; hover/focus each anchor | 1440x900 | Each `data-coachmark-id` target has nonzero box; coachmark renders adjacent to the actual rendered element, not a `display:contents` wrapper | `<new>/20260519_first_session_coachmarks/*.png` | Zero unexpected console errors. |

### Army HQ Records → Operation History

| Surface | Route/save/setup | Viewport | Required assertions | Screenshot path | Console-error policy |
|---|---|---|---|---|---|
| Operation History tab with completed-operation AAR rows **(pending)** | Loaded mid-run save with completed ops | 1440x900 | Per-axis objective chips visible; row focus opens the right Chronicle entry; intel labels stay coarse (`stale_intel` / `defender_opsec` / confidence band) | `<new>/20260519_hq_records_op_history/desktop_*.png` | Zero unexpected console errors. |

### Tactical map information-design modes

| Surface | Route/save/setup | Viewport | Required assertions | Screenshot path | Console-error policy |
|---|---|---|---|---|---|
| Authority mode **(have)** | Track C live save | 1440x900 | Overlay legible, mode label correct | `20260517_track_c_authority_mode_unblocked.jpg` | Pending replacement with a script-driven capture. |
| Legitimacy mode **(have)** | Track C live save | 1440x900 | Same | `20260517_track_c_legitimacy_mode_unblocked.jpg` | Same. |
| Supply mode **(have)** | Track C live save | 1440x900 | Same | `20260517_track_c_supply_mode_unblocked.jpg` | Same. |
| Force Quality + OSID Damage modes **(pending)** | Loaded mid-run save | 1440x900 | Glow polygon coordinate validity; mode toggle persists | `<new>/20260519_map_modes_force_quality_osid_damage/desktop_*.png` | Zero unexpected console errors. |

### Accessibility spot checks

| Surface | Route/save/setup | Viewport | Required assertions | Screenshot path | Console-error policy |
|---|---|---|---|---|---|
| Reduced-motion + focus rings spot-check **(pending)** | Fresh save with `prefers-reduced-motion` simulated | 1440x900 | Reduced-motion-respecting components do not animate; focus rings visible on tab cycle | `<new>/20260519_a11y_reduced_motion_focus/desktop_*.png` | Static a11y guards pass (existing 33 tests). |

## Stale-evidence audit (2026-05-19)

The following existing evidence is **active** (no stale rows found):

- `20260518_cinematic_verdict/` — `CinematicVerdict` and `VerdictScreen`
  shell continue to use the `shrink-0` non-shrinking primary band per the
  related napkin entry; no later refactor invalidated the captures.
- `20260518_endgame_small_screen_verdict_flow/` — Endgame segmented
  Report/Reckoning flow is the current shape per
  `docs/40_reports/implemented/20260518_CINEMATIC_VERDICT.md`.
- `20260518_presidential_loop/` — Loop heartbeat is current per
  `docs/40_reports/implemented/20260515_DECISION_ROOM_PRODUCT_LOOP_HEARTBEAT.md`.
- `20260517_track_c_*` — Track C overlays remain the documented shape per
  `docs/40_reports/implemented/20260516_TACTICAL_MAP_INFORMATION_DESIGN_TRACK_C.md`.
- `20260517_track_d_*` — Coachmark anchors recorded against the
  `data-coachmark-id` contract documented in the napkin.

No row is currently flagged stale. Future component changes touching any of
these surfaces should re-capture in the same folder shape, or add a new
dated folder if the surface materially changed.

## Operator-only / pending captures

The five rows marked **(pending)** above all require:

1. A local Vite tactical-map dev server (`npm run dev:map`) on
   `127.0.0.1:3002`.
2. A loaded base save (`data/derived/latest_run_final_save.json` or a
   chosen scenario save).
3. Operator presence to confirm reduced-motion settings and visual sanity.

The autonomous worker cannot run these captures without that environment.
Each row already names the screenshot path, viewport, and required
assertion; treat the row as the ready-to-run capture spec.

## Defects identified by this audit

None. No capture exposed a regression. The pending captures are
evidence-gap closures, not defect investigations.

## Cross-references

- `docs/40_reports/GUI_MASTER.md`
- `docs/40_reports/implemented/20260518_CINEMATIC_VERDICT.md`
- `docs/40_reports/implemented/20260515_DECISION_ROOM_PRODUCT_LOOP_HEARTBEAT.md`
- `docs/40_reports/implemented/20260516_TACTICAL_MAP_INFORMATION_DESIGN_TRACK_C.md`
- `docs/40_reports/implemented/20260517_TRACK_C_D_BROWSER_VISUAL_VALIDATION.md`
- `docs/40_reports/audits/20260518_A11Y_RC_BROWSER_EVIDENCE_VERIFICATION.md`
- `docs/40_reports/audits/20260518_ACCESSIBILITY_P0_CLOSEOUT_VERIFY_STALE.md`
- `tools/ui/presidential_loop_smoke.cjs`

## Stop conditions

- Captures requiring operator presence are not auto-run from this batch.
- No surface redesign is proposed here.
- No sensitive-history prose was uncovered that would require historian
  review.
