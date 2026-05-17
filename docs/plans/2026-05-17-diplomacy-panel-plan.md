# Diplomacy Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace placeholder diplomacy access with a real per-turn diplomacy panel showing patron stance, international pressure, active proposals, and what would move the needle.

**Architecture:** Build a read-only UI projection over existing diplomacy, negotiation, patron, and strategic-dimension state. Do not add a new diplomacy simulation loop in this lane.

**Tech Stack:** React, TypeScript read models, Vitest.

---

## Task 1: Diplomacy Read Model

**Files:**
- Create: `src/ui/map/data/diplomacyView.ts`
- Modify: `src/ui/map/data/types.ts`
- Inspect: `src/ui/map/data/GameStateAdapter.ts`
- Inspect: existing negotiation, patron-pressure, and peace-plan data owners before adding new data fields.
- Test: `tests/ui/diplomacy_view.test.ts`

**Steps:**
1. Write tests for a fixture with patron pressure, active peace plans, and international pressure.
2. Implement `buildDiplomacyView(state, playerFaction)`.
3. Sort all lists with existing strict ordering helpers.

**Acceptance:** View contains patron stance, active proposals, external actors, and top pressure reasons.

## Task 2: Panel Component

**Files:**
- Create: `src/ui/map/components/DiplomacyPanel.tsx`
- Modify: `src/ui/map/App.tsx`
- Test: `tests/ui/diplomacy_panel.test.ts`

**Steps:**
1. Add failing render test for non-empty and empty diplomacy states.
2. Implement panel with compact operational layout, not marketing copy.
3. Wire existing toolbar/shell route to open it, naming the route/button owner in the implemented report.

**Acceptance:** Warroom/toolbar diplomacy action opens this panel, not a placeholder.

## Task 3: Player-Truth Copy

**Files:**
- Modify: `src/ui/map/components/DiplomacyPanel.tsx`
- Test: `tests/ui/diplomacy_player_truth.test.ts`

**Steps:**
1. Add tests that raw hidden thresholds are not printed.
2. Present "likely", "uncertain", and "known" copy from existing confidence fields where available.
3. If confidence fields do not exist, use neutral qualitative labels and record the missing field as follow-up rather than inventing thresholds.

**Acceptance:** Panel does not leak debug-only exact formulas unless existing player-visible policy allows it.

## Verification

Run:
- `npm.cmd run typecheck`
- `npx.cmd vitest run tests\ui\diplomacy_view.test.ts tests\ui\diplomacy_panel.test.ts tests\ui\diplomacy_player_truth.test.ts`
- `npm.cmd run desktop:map:build`

## Docs and Ledger

Update:
- `docs/40_reports/GUI_MASTER.md`
- `docs/40_reports/GAME_STATE_RATING_MASTER.md`
- `docs/40_reports/implemented/YYYYMMDD_DIPLOMACY_PANEL.md`
- `docs/PROJECT_LEDGER.md`

Determinism: read-only UI projection; no simulation behavior or save schema mutation.

## Browser Smoke And Closeout

- Browser-check that the diplomacy action opens this panel from the live shell and that empty-state copy does not overlap at mobile width.
- Stop if implementing the panel requires a new diplomacy simulation loop or save-schema mutation.
- Stage only diplomacy read-model/UI, focused tests, browser evidence/report, roadmap, and ledger files owned by this plan.
