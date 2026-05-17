# Code Audit Round 2 Residuals Plan

**Date:** 2026-05-17
**Source audit:** `docs/40_reports/audits/20260516_CODE_AUDIT.md`
**Scope:** Round 2 findings 7-12 after later closeout work. Findings 7-9 were implemented by `docs/40_reports/implemented/20260516_AUDIT_ROUND2_O7_O9_CLOSEOUT.md`; this plan handles remaining verification/content-QA/operator residuals.

## Findings Triage

| Finding | Status | Action |
|---|---|---|
| 7 officer roster dead refs | Closed by O7-O9 closeout | Keep regression tests; no new action unless tests fail. |
| 8 IPC result contracts | Closed by O7-O9 closeout | Keep contract tests; no new action unless new IPC methods violate shape. |
| 9 tutorial copy/spotlight defects | Closed by O7-O9 closeout | Keep spotlight target regression; no new action unless guide/onboarding copy diverges. |
| 10 Codex source-depth consistency | Open optional QA | Add source-floor/citation-format audit if adopted. |
| 11 CLI scenario integrity walk | Open operator/Windows verification | Add a repeatable Windows-host script and result template. |
| 12 Decision Room walkthrough | Open browser QA | Re-run in a clean browser session and file report. |

## Task 1: Codex Source-Depth QA

**Files:** `data/scenarios/essays/**`, `tests/codex_source_quality.test.ts` or `tools/diagnostics/codex_source_quality.cjs`, optional report under `docs/40_reports/audits/`.

**Steps:**
1. Inventory essay categories and source counts.
2. Define category-specific floors only where historically/editorially defensible.
3. Validate ICTY case-number format using a narrow regex, while allowing primary documents and UN records for diplomatic events.
4. Report exceptions rather than weakening content.

**Stop Gate:** If the source-floor policy would force weak or irrelevant citations into an essay, route to historian/editor review.

## Task 2: Windows Scenario Integrity Walk

**Files:** `tools/diagnostics/scenario_integrity_walk.cjs`, `docs/40_reports/audits/` result report, optional npm script in `package.json`.

**Checks:**
- run the active 40w scenario on the Windows host;
- compare run hash to the current active calibration baseline from `docs/40_reports/CALIBRATION_MASTER.md`;
- verify formation corps IDs exist in `oob_corps.json` and loaded save state;
- verify operation `participating_brigades` references exist in formation roster;
- reconcile displacement aggregate totals where current state exposes both sides;
- classify failures as `ERROR`, `WARNING`, or `INFO`.

**Verification:** `npm.cmd run sim:scenario:run:40w`; `node tools\diagnostics\scenario_integrity_walk.cjs runs\<latest_40w_run>`.

## Task 3: Fresh Decision Room Walkthrough

**Files:** `docs/40_reports/audits/202605xx_DECISION_ROOM_WALKTHROUGH.md`; optional browser smoke if stable enough.

**Steps:**
1. Start a clean dev map session.
2. Select each faction once, open Army HQ -> Briefing -> Decision Room.
3. Exercise the product-loop heartbeat and command-loop rows.
4. Verify deep links preserve source targets and do not blank panels.
5. Capture screenshots or concise observations for each faction.

**Acceptance:** no viewport/screenshot blocker; no panel crash; every row either routes to a real owner surface or is explicitly disabled with a reason.

## Required Docs

- Update `docs/40_reports/CONSOLIDATED_BACKLOG.md` when a residual task closes.
- Ledger entry after implementation.
- Knowledge entry only if the walkthrough or integrity script creates a reusable testing rule.
