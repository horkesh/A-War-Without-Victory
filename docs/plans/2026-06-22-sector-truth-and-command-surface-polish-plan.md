# Sector Truth And Command Surface Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the next layer of first-hour command-surface confusion by making sector, brigade, corps, and decision-room surfaces tell the same player truth.

**Architecture:** Keep this lane UI/read-model first unless an audit proves sector generation itself is wrong. Use shared helpers for repeated player-facing truth rules, pin every visible correction with focused tests, and only escalate into simulation/calibration if the startup sector data is invalid rather than merely mispresented.

**Tech Stack:** React/TypeScript tactical-map UI, Zustand game store, Vitest/jsdom focused UI tests, Puppeteer live browser QA, existing i18n keys.

---

## Current Recommended Queue

### Task 1: Sector Coverage Truth

**Status:** IMPLEMENTED 2026-06-22 in report `docs/40_reports/implemented/20260622_SECTOR_COVERAGE_TRUTH_ALIGNMENT.md`.

**Files:**
- Modify: `src/ui/map/utils/sectorUtils.ts`
- Modify: `src/ui/map/components/OOBSidebar.tsx`
- Modify: `src/ui/map/components/CorpsDetail.tsx`
- Test: `tests/ui/oob_drilldown_routing.test.ts`
- Test: `tests/ui/corps_detail_sector_truth.test.ts`

**Steps:**
1. Write failing tests for OOB and Corps Detail where a sector has `density > 0` but no current frontline, reserve, or command-directed formations.
2. Run the focused tests and confirm they fail by showing `Held coverage` or `Dense coverage`.
3. Add a shared sector coverage helper that takes current assignment, not just density.
4. Update OOB and Corps Detail to use the shared helper.
5. Re-run the focused tests and typecheck.

**Acceptance:** An uncovered command slice reads as uncovered/no friendly line wherever sector coverage is shown, while staffed sectors keep density-derived thin/held/dense wording.

**Evidence:** Red tests reproduced OOB and Corps Detail showing dense coverage for zero-formation sectors. Green proof: `node node_modules\vitest\vitest.mjs run tests\ui\oob_drilldown_routing.test.ts tests\ui\corps_detail_sector_truth.test.ts --pool=forks --reporter=dot` passed 4/4, adjacent command-surface pack passed 24/24, `npm.cmd run typecheck` passed, and `npm.cmd run qa:live-surface:browser` passed with temp evidence cleaned. Startup audit counted 70 zero-assignment sectors in `data/derived/startup/apr_1992_initial_save.json` (RBiH 35, HRHB 21, RS 14), so the remaining deeper question is a separate sector-builder/data audit, not a blocker for this UI truth fix.

### Task 2: Ops Modal Player-Surface Hardening

**Status:** IMPLEMENTED 2026-06-22 in report `docs/40_reports/implemented/20260622_OPS_AND_COMMAND_SURFACE_POLISH.md`.

**Files:**
- Audit first: `src/ui/map/components/ops_modal/**`
- Likely tests: `tests/ui/oob_operations_panel.test.ts`, `tests/ui/ops_planning_target_discovery.test.ts`

**Steps:**
1. Sweep op authorization, staging, G2 prediction, and briefing surfaces for raw validation/system copy.
2. Pin any exposed OSID, raw step label, or diagnostic phrase with focused tests.
3. Replace with existing player-safe settlement, phase, and recommendation helpers.

**Acceptance:** Operation planning reads like staff work, not validation output.

**Evidence:** G-2 prediction failures now render localized staff copy instead of raw IPC/engine diagnostics; Plan staging displays the settlement name rather than raw staging OSID; the modal phase rail is i18n-backed; Authorize eligibility findings map to player-safe copy; G-2 proceed is disabled while loading/awaiting assessment. Green proof included in the final combined command-surface pack: `node node_modules\vitest\vitest.mjs run tests\ui\ops_planning_target_discovery.test.ts tests\ui\oob_operations_panel.test.ts tests\ui\corps_front_panel_routing.test.ts tests\ui\formation_detail_parity.test.ts tests\ui\gui_audit_label_discipline.test.ts --pool=forks --reporter=dot` passed 74/74.

### Task 3: Army HQ And OOB Command Copy Cleanup

**Status:** IMPLEMENTED 2026-06-22 in report `docs/40_reports/implemented/20260622_OPS_AND_COMMAND_SURFACE_POLISH.md`.

**Files:**
- Audit first: `src/ui/map/components/army_hq/**`, `src/ui/map/components/OOBSidebar.tsx`, `src/ui/map/components/CorpsDetail.tsx`

**Steps:**
1. Sweep officer descriptors, OOB operation objective labels, corps-card count labels, ORBAT footer sector labels, and Army Reserve HQ display names.
2. Add focused label-discipline tests for each confirmed leak.
3. Prefer existing localized/player-safe helpers over new one-off string assembly.

**Acceptance:** Corps/brigade command surfaces are internally consistent and free of shorthand or ambiguous staff abbreviations.

**Evidence:** OOB and Corps Detail objective progress now shows one-based player progress; Corps Front logistics includes command-directed override brigade manpower; Corps Front metadata separates calendar date from numeric turn; Formation Detail sector picker counts use projected current brigade assignments; Army HQ corps cards and ORBAT expanded brigade rows convert equipment condition fractions into operational equipment counts; Army HQ cards label planning-only operations explicitly. Green proof included in the final combined command-surface pack: `node node_modules\vitest\vitest.mjs run tests\ui\ops_planning_target_discovery.test.ts tests\ui\oob_operations_panel.test.ts tests\ui\corps_front_panel_routing.test.ts tests\ui\formation_detail_parity.test.ts tests\ui\gui_audit_label_discipline.test.ts --pool=forks --reporter=dot` passed 74/74.

### Task 4: Records And Decision Room Provenance Consistency

**Status:** IMPLEMENTED 2026-06-22 in report `docs/40_reports/implemented/20260622_RECORD_PROVENANCE_AND_LIVE_SWEEP_HARDENING.md`.

**Files:**
- Audit first: `src/ui/map/data/presidentialCategories.ts`, `src/ui/map/components/DecisionRoom*`, Records/Chronicle adapters.

**Steps:**
1. Verify every count/action that references records uses the narratable filed-record guard.
2. Pin any turn-zero setup or non-filed item that appears as a normal record.
3. Preserve source handoffs while keeping primary review routes in the owning surface.

**Acceptance:** The player never sees turn-zero setup facts as if they happened during play.

**Evidence:** Decision Room record-category cards, report/cost/judge loop steps, Chronicle generated entries/generals digest, and President's Desk consequence strip now share the turn-zero filed-record guard. Report loop routing uses the normalized Decision Room card as primary action and preserves Army HQ aftermath as the source handoff. Focused proof passed 112/112, `npm.cmd run typecheck` passed, and `npm.cmd run qa:live-surface:browser` passed with temp evidence cleaned.

### Task 5: Targeted Live Browser Sweep

**Status:** IMPLEMENTED 2026-06-22 in report `docs/40_reports/implemented/20260622_RECORD_PROVENANCE_AND_LIVE_SWEEP_HARDENING.md`.

**Files:**
- Extend if needed: `tools/ui/live_surface_browser_sweep.cjs`

**Steps:**
1. Run RBiH and RS first-hour War Map -> OOB -> Corps Front -> Brigade -> Settlement -> Ops modal path.
2. Record selectors for the fixed sector-coverage truth.
3. Keep failures focused on player truth/usability, not Bosnian localization.

**Acceptance:** The live browser journey confirms the corrected surfaces and no console errors.

**Evidence:** `qa:live-surface:browser` now runs the owner drilldown for RBiH and an RS startup fixture through Desk -> Command Surface -> Decision Room -> OOB sector -> Corps Front tabs -> Ops Planning modal -> Formation Detail -> Settlement Detail -> Records tabs. It also injects a turn-zero setup-provenance fixture and proves the Desk does not show `Last filed record` while the command-strip record card stays at `data-awwv-count="0"`. Live proof passed with `ownerJourneyDrilldownByFaction: { RBiH: true, RS: true }`, `ownerJourneyOpsPlanningModalByFaction: { RBiH: true, RS: true }`, `turnZeroSetupProvenanceLiveProof.recordCardCount: 0`, and server port cleanup verified.
