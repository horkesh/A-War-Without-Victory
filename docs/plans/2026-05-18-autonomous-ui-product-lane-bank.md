# Autonomous UI Product Lane Bank Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use superpowers:test-driven-development for UI behavior changes and superpowers:verification-before-completion before every handoff.

**Goal:** Give Claude a product/UI-focused autonomous work queue that complements the broader roadmap lane bank without inventing new sim authority.

**Architecture:** UI lanes consume existing engine/read-model truth. Decision Room, Warroom, Army HQ Records, Chronicle, Inbox, and Turn Aftermath remain the owning surfaces already established in current docs. Do not create second owners for decisions, costs, records, operation AARs, or history.

**Tech Stack:** TypeScript, React, Vite, Vitest, existing browser/Playwright scripts when available, no new dependencies without Codex review.

---

## Global UI Rules

- Start every lane with `git status --short --branch`.
- Read `docs/40_reports/GUI_MASTER.md` and the relevant row in `docs/40_reports/GAME_STATE_RATING_MASTER.md`.
- Use existing helpers in `src/ui/map/data/`, `src/ui/map/utils/`, and existing shell navigation before adding new state.
- Keep UI text compact and source-grounded. Do not describe features inside the app.
- Every new interactive control needs keyboard access and a programmatic name.
- If a local browser target is practical, capture browser evidence for layout-sensitive changes.
- Update GUI/Game State masters, implemented report, and ledger only after tests pass.

## Stop Gates

Stop if the work needs a new simulation field, new operation AAR schema, sensitive-history wording, operator testimony, or a design ruling. Do not turn UI polish into mechanics.

---

## UI-1 - Supply Visibility Read-Model

**Objective:** Make existing supply truth visible in commander briefing and Decision Room warnings without changing supply mechanics.

**Sources:**

- `docs/40_reports/GAME_STATE_RATING_MASTER.md` row 8
- `docs/40_reports/implemented/20260517_SUPPLY_DESIGN_COMPLETION.md`

**Likely files:**

- `src/sim/combat/commander/briefing.ts`
- `src/ui/shared/operational_sitrep_views.ts`
- `src/ui/map/data/presidentialDecisionRoom.ts`
- existing supply panel/map-mode tests found with `rg "supply" tests src/ui/map`

**Tasks:**

1. Audit existing fields: `supply_by_osid`, `political.war_supply_condition`, supply pressure summaries, and adapter projections.
2. Write tests for three states: populated supply data, absent supply data, and isolated/corridor-at-risk data.
3. Add a compact read-model row: corridor at risk, isolated/low-supply formations, and unknown-data fallback.
4. Surface the row through existing Decision Room/briefing lanes, not a new modal.
5. Verify no enemy-truth leakage for non-player factions.

**Validation:**

- `npm.cmd run typecheck`
- focused supply/briefing/Decision Room tests
- `npx.cmd vitest run tests/ui_shell_navigation.test.ts --reporter=dot`
- `npm.cmd run desktop:map:build`
- `git diff --check`

---

## UI-2 - Decision Room Pushback Explanations

**Objective:** Promote existing Army CO pushback rationale into the Decision Room "Inspect Next" loop.

**Sources:**

- `docs/40_reports/GAME_STATE_RATING_MASTER.md` row 3
- Existing A5 pushback report/tests

**Likely files:**

- `src/ui/components/ArmyCoPushbackPanel*`
- `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx`
- `src/ui/map/data/presidentialDecisionRoom.ts`
- `tests/a5_army_co_pushback_ui.test.ts`
- Decision Room tests

**Tasks:**

1. Locate the current pushback packet owner and tests.
2. Add a failing Decision Room test that expects a blocked/resisted action to show the existing rationale.
3. Reuse the existing packet; do not add a new queue or local-only blocker.
4. Add compact rows for blocked, warning, and no-pushback states.
5. Ensure source handoff routes preserve the existing navigation target.

**Validation:**

- `npm.cmd run typecheck`
- `npx.cmd vitest run tests/a5_army_co_pushback_ui.test.ts tests/ui/pre_advance_command_review.test.ts tests/ui_shell_navigation.test.ts --reporter=dot`
- `npm.cmd run desktop:map:build`
- `git diff --check`

---

## UI-3 - GUI Playtest D3-D7 Remainder

**Objective:** Execute remaining non-P0 GUI playtest defects that were not closed as D1/D2 verified-stale.

**Source:** `docs/plans/2026-05-16-gui-playtest-defects-plan.md`

**Order:**

1. D3 Vance-Owen modal pass.
2. D4 War Summary completeness and reconciliation.
3. D5 save persistence / tutorial-seen flag if still live.
4. D6 inbox dedupe and Records button clarity.
5. D7 visual polish and dev cleanup.

**Tasks:**

1. Re-read the source plan and mark which defects are already closed on disk.
2. For each still-live defect, write a focused failing test first.
3. Fix only the owner named in the source plan.
4. Use player-faction-aware read models where relevant.
5. Update the playtest report status defect-by-defect after verification.

**Validation:**

- `npm.cmd run typecheck`
- focused tests for touched D-track
- `npx.cmd vitest run tests/ui_shell_navigation.test.ts --reporter=dot`
- `npm.cmd run desktop:map:build`
- browser evidence for visual defects when practical
- `git diff --check`

---

## UI-4 - Army HQ and Decision Room Progressive Disclosure

**Objective:** Reduce first-paint density in Army HQ/Decision Room without removing information or creating new owners.

**Sources:**

- `docs/40_reports/GAME_STATE_RATING_MASTER.md` rows 20 and 21
- `docs/40_reports/GUI_MASTER.md`

**Likely files:**

- `src/ui/map/components/army_hq/*`
- `src/ui/map/components/PresidentialDecisionRoom*`
- `src/ui/map/data/presidentialDecisionRoom.ts`
- Army HQ / Decision Room tests

**Tasks:**

1. Inventory first-paint elements and identify repeated/low-priority blocks.
2. Write tests asserting primary cards remain visible and hidden sections are still reachable.
3. Add tabs, collapsible groups, or source-handoff grouping using existing data.
4. Preserve keyboard navigation and focus order.
5. Do not move decision execution out of its current owner.

**Validation:**

- `npm.cmd run typecheck`
- focused Army HQ / Decision Room tests
- `npx.cmd vitest run tests/ui_shell_navigation.test.ts --reporter=dot`
- `npm.cmd run desktop:map:build`
- browser screenshots at 390px and desktop if practical
- `git diff --check`

---

## UI-5 - Endgame Faction Report Mobile Subdivision

**Objective:** Split the long faction report into smaller mobile sections without touching scoring, Cost Ledger truth, or verdict selection.

**Source:** `docs/40_reports/GAME_STATE_RATING_MASTER.md` row 15.

**Likely files:**

- `src/ui/map/components/VerdictScreen.tsx`
- verdict subcomponents under `src/ui/map/components/`
- `tests/ui/endgame_presentation_proof.test.ts`

**Tasks:**

1. Locate the long faction-report render path.
2. Add tests proving all existing score/result text remains present.
3. Add mobile-only sections or section controls with stable dimensions.
4. Keep desktop dense and unchanged unless tests prove a defect.
5. Capture mobile viewport evidence if practical.

**Validation:**

- `npm.cmd run typecheck`
- focused verdict/endgame tests
- `npm.cmd run desktop:map:build`
- `git diff --check`

---

## UI-6 - Onboarding First-Session Evidence and Legacy Cleanup

**Objective:** Produce current first-session evidence and remove dormant legacy orientation only if current tests can move safely.

**Source:** `docs/40_reports/GAME_STATE_RATING_MASTER.md` row 24.

**Tasks:**

1. Browser-run or script the first-session path if practical.
2. Search references to `FirstTurnOrientationCard` and current onboarding owners.
3. If legacy is truly dead, migrate compatibility tests to current onboarding surfaces before deletion.
4. If not dead, document the actual owner and add missing tests.
5. Do not remove any first-session affordance without replacement coverage.

**Validation:**

- `npm.cmd run typecheck`
- focused onboarding/z-index/UI tests
- `npm.cmd run desktop:map:build`
- browser evidence if practical
- `git diff --check`

---

## UI-7 - Accessibility RC Browser Evidence

**Objective:** Add release-candidate browser evidence on top of the already-closed static P0 accessibility gate.

**Scope:** Verification-first. Code changes only if evidence finds a real P0 regression.

**Validation:**

- `npm.cmd run typecheck`
- `npx.cmd vitest run tests/ui/accessibility_clickable_controls.test.ts tests/ui/accessibility_contrast_tokens.test.ts tests/ui/accessibility_reduced_motion.test.ts tests/ui/accessibility_form_labels.test.ts tests/v093_a11y_lane_e_forms_live_regions.test.ts tests/ui_shell_navigation.test.ts --reporter=dot`
- `npm.cmd run desktop:map:build`
- browser keyboard/focus/reduced-motion/labels spot-check if practical
- `git diff --check`

**Output:** Verification report only unless fixes are required.

---

## Ready-to-paste Claude prompt

### 1. Role and objective

You are the UI/product implementation worker for AWWV. Execute `docs/plans/2026-05-18-autonomous-ui-product-lane-bank.md` in order, one coherent batch at a time, starting from a clean branch.

### 2. Canon references

Read `docs/40_reports/GUI_MASTER.md`, `docs/40_reports/GAME_STATE_RATING_MASTER.md`, and the batch-specific plan/report before editing. For gameplay-adjacent UI, also inspect the source read-model and tests.

### 3. Determinism and ledger constraints

Do not add randomness, timestamps, hidden-truth leaks, or new sim authority. Stable ordering is required for generated rows. Update implemented report, `docs/PROJECT_LEDGER.md`, GUI master, and Game State rating master after validation.

### 4. STOP AND ASK triggers

Canon conflicts or canon silence on required decision; determinism or stable ordering cannot be guaranteed; ledger update requirement is unclear; scope expands beyond prompt objective. Also stop for new schema fields, sensitive-history prose, or operator-only evidence.

### 5. Output format and validation

Report changed files, exact commands with pass/fail, browser evidence if any, docs updates, commit hash or not committed, and the next UI lane.

