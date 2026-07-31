# Presidential Judgment Loop Implementation Plan

> **Required skills:** `test-driven-development`, `ui-ux-developer`, `ledger-process-scribe`, and `verification-before-completion`.

**Goal:** Raise the D2 Desk → Decision → Advance loop from 3/5 toward 5/5 by making required action, advisory review, deliberate restraint, acknowledgement, and reported-data limits explicit.

**Architecture:** Reuse the canonical presidential blocker and consequence read models. Add only optional UI-read-model inputs and presentation helpers. Do not create simulation actions, persist acknowledgement, or alter blocker truth.

**Tech stack:** React, TypeScript, Zustand read state, Vitest, Testing Library, Electron/Vite desktop renderer.

## Task 1 — Direct required-signature route

**Files:**
- Modify: `tests/ui/warroom_priority_docket.test.ts`
- Modify: `tests/ui/president_desk_shell.test.ts`
- Modify: `src/ui/map/components/warroom/WarroomStatusBar.tsx`
- Modify: `src/ui/map/components/presidential_desk/PresidentDeskShell.tsx`
- Modify: `src/ui/map/App.tsx`
- Modify: `src/ui/map/i18n/messages.en.ts`
- Modify: `src/ui/map/i18n/messages.bcs.ts`

1. Add tests that require one-click resolution of a single blocker and explicit three-state Desk language.
2. Run the focused tests and confirm the expected red failures.
3. Pass the existing blocker action/id directly to the App-owned resolver.
4. Re-run focused tests.

## Task 2 — Deliberate Advance language

**Files:**
- Modify: `tests/ui/advance_turn_button_gated_feedback.test.ts`
- Modify: `src/ui/map/components/warroom/AdvanceTurnModal.tsx`
- Modify: `src/ui/map/i18n/messages.en.ts`
- Modify: `src/ui/map/i18n/messages.bcs.ts`

1. Add clear/review copy assertions.
2. Confirm red.
3. Select confirmation and action copy from the existing pre-advance status.
4. Confirm green without changing the hard blocker gate.

## Task 3 — Unified aftermath acknowledgement

**Files:**
- Modify: `tests/ui/pre_advance_command_review.test.ts`
- Modify: `src/ui/map/data/preAdvanceCommandReview.ts`
- Modify: `src/ui/map/components/warroom/WarroomStatusBar.tsx`
- Modify: `src/ui/map/components/warroom/AdvanceTurnModal.tsx`
- Modify: `src/ui/map/components/presidential_desk/PresidentDeskShell.tsx`

1. Add a regression proving a retained aftermath turn is excluded only from pre-advance review.
2. Confirm red.
3. Add optional `reviewedAftermathTurn` input, filter only its matching hard-turn card, and recompute affected compact metrics.
4. Pass the current retained aftermath turn from the owning UI store/components.
5. Confirm the full Decision Room still retains the record.

## Task 4 — Truthful aftermath and opening-force figures

**Files:**
- Modify: `tests/ui/turn_aftermath.test.ts`
- Modify: `tests/ui/turn_aftermath_modal_i18n.test.ts`
- Modify: `tests/ui/peace_war_transition.test.ts`
- Modify: `src/ui/map/data/turnAftermath.ts`
- Modify: `src/ui/map/components/TurnAftermathModal.tsx`
- Modify: `src/ui/map/components/PeaceWarTransition.tsx`
- Modify: `src/ui/map/i18n/messages.en.ts`
- Modify: `src/ui/map/i18n/messages.bcs.ts`

1. Add regressions for non-reconciling notable territory details, no-action loss narrative, and absent force reports.
2. Confirm red.
3. Add an explicit territory-breakdown completeness flag and conditional copy.
4. Build faction force totals that remain null until all contributing brigade records report the metric.
5. Confirm green.

## Task 5 — Consequence receipt copy and documentation

**Files:**
- Modify: `tests/ui/president_desk_shell.test.ts`
- Modify: `src/ui/map/i18n/messages.en.ts`
- Modify: `src/ui/map/i18n/messages.bcs.ts`
- Modify: `docs/40_reports/GUI_MASTER.md`
- Modify: `docs/PROJECT_LEDGER.md`

1. Assert the receipt heading names consequence rather than generic recency.
2. Update EN/BCS copy without changing ledger derivation.
3. Record the UI/read-model behavior and verification.

## Task 6 — Verification

Run serially:

1. Focused red/green test files from Tasks 1–5.
2. Every UI test found by grepping the changed host components/read models.
3. `npm.cmd run typecheck`.
4. `npm.cmd run desktop:map:build`.
5. The relevant player-journey gate if time permits.
6. `git diff --check` and a final status/diff audit.

Do not commit, push, package, create a branch, or alter release state.
