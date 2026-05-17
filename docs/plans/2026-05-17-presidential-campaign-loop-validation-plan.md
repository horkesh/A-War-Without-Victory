# Presidential Campaign Loop Validation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prove and polish the end-to-end player loop from Warroom to Army HQ, map inspection, decision, advance, aftermath, Chronicle, and next-turn review.

**Architecture:** Treat this as a validation and shell-cohesion lane, not a new product surface. Reuse existing Decision Room, Warroom docket, pre-advance review, Turn Aftermath, Chronicle, and shell-navigation helpers. Any new work must remove friction between owners, not add another queue.

**Tech Stack:** React UI, Vitest, Playwright/browser validation, existing desktop IPC.

---

## Task 1: Write the Loop Contract

**Files:**
- Create: `docs/40_reports/audits/YYYYMMDD_PRESIDENTIAL_CAMPAIGN_LOOP_VALIDATION.md`
- Modify: `docs/40_reports/GUI_MASTER.md`

**Steps:**
1. Define the canonical loop: `Brief -> Inspect -> Decide -> Execute -> Report -> Cost -> Judge -> Next`.
2. Map each step to an existing UI owner and route helper.
3. Mark any step with no live owner as a defect.

**Acceptance:** The audit has a table of all loop steps, owner files, and entry/exit actions.

Stop after Task 1 if any loop step lacks a live owner; add the missing owner decision to the audit before writing route patches.

## Task 2: Add Route-Level Regression Coverage

**Files:**
- Modify: `tests/ui_presidential_decision_room_wiring.test.ts`
- Modify: `tests/ui/pre_advance_command_review.test.ts`
- Modify: `tests/ui/records_button_behavior.test.ts`
- Modify: `tests/ui_shell_frame_contract.test.ts`

**Steps:**
1. Add tests that open a Decision Room source handoff and assert the expected owner surface.
2. Add tests that a pre-advance row routes to the same preserved target.
3. Add tests that Turn Aftermath record links return to Chronicle or records without losing shell context.
4. Run focused tests.

**Acceptance:** Every loop handoff has a regression test for target preservation.

## Task 3: Browser Playthrough Script

**Files:**
- Create: `tools/ui/presidential_loop_smoke.cjs` or add to existing browser validation tooling.
- Create: `docs/40_reports/implemented/visual_validation/YYYYMMDD_presidential_loop/`.

**Steps:**
1. Load a known save with pending decisions; record its fixture/save path in the audit.
2. Capture screenshots for each loop step.
3. Assert no blocking overlay stack, empty rail, or unclickable primary action.
4. Save screenshots under the curated visual-validation folder.

**Acceptance:** Script emits a deterministic summary JSON with pass/fail per loop step.

Expected manual/browser startup: `npm.cmd run dev:map`, then validate the smoke against `http://127.0.0.1:3002` unless the script discovers another local port.

## Task 4: Patch Only Broken Handoffs

**Files:** Determined by Task 1/3 findings. Expected owners:
- `src/ui/map/utils/presidentialDecisionRoomNavigation.ts`
- `src/ui/map/utils/shellNavigation.ts`
- `src/ui/map/components/warroom/WarroomStatusBar.tsx`
- `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx`

**Steps:**
1. For each failing handoff, write a focused failing test.
   - Each finding must name `source route/button -> owner surface -> regression test`.
2. Patch the single route owner.
3. Rerun the focused tests.

**Acceptance:** No new queue, modal, ledger, or duplicate owner is introduced.

## Verification

Run:
- `npm.cmd run typecheck`
- `npx.cmd vitest run tests\ui_presidential_decision_room_wiring.test.ts tests\ui\pre_advance_command_review.test.ts tests\ui\records_button_behavior.test.ts tests\ui_shell_frame_contract.test.ts`
- `npm.cmd run desktop:map:build`
- Browser smoke script from Task 3.

## Docs and Ledger

Update:
- `docs/40_reports/GUI_MASTER.md`
- `docs/40_reports/implemented/YYYYMMDD_PRESIDENTIAL_CAMPAIGN_LOOP_VALIDATION.md`
- `docs/plans/MASTER_ROADMAP.md`
- `docs/PROJECT_LEDGER.md`

Determinism statement: UI route validation only unless a route patch mutates persisted state.

## Commit And Closeout

- Stop if a patch adds a new queue, modal owner, or duplicate navigation state instead of repairing the existing handoff.
- Stage only loop audit/report, route-owner patches, focused tests, visual evidence, roadmap, and ledger files owned by this plan.
