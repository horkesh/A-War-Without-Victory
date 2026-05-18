# Autonomous Visual QA Evidence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Produce repeatable browser/visual evidence for the most important player-facing surfaces without changing mechanics.

**Architecture:** Treat visual QA as evidence capture plus focused fixes only when the capture finds a concrete defect. Reuse existing local dev/build scripts and browser helpers. Keep evidence organized under `docs/40_reports/implemented/visual_validation/`.

**Tech Stack:** Vite tactical map build/dev server, browser/Playwright-style scripts if available, Vitest UI tests, Markdown reports.

---

## Target Surfaces

Capture evidence for:

- First-session onboarding and opening brief.
- Decision Room and pre-advance review.
- Army HQ Records -> Operation History.
- Supply / Authority / Legitimacy / Force Quality / OSID Damage map modes.
- Endgame verdict at mobile and desktop widths.
- Accessibility focus/reduced-motion spot checks.

## Task 1 - Inventory Existing Visual Evidence

**Files:**

- Read: `docs/40_reports/GUI_MASTER.md`
- Read: `docs/40_reports/GAME_STATE_RATING_MASTER.md`
- Create: `docs/40_reports/audits/YYYYMMDD_VISUAL_QA_EVIDENCE_INVENTORY.md`

**Steps:**

1. Find existing evidence folders under `docs/40_reports/implemented/visual_validation/`.
2. Create a table of surface, latest evidence, missing viewport, and owner plan.
3. Mark stale evidence if the component changed after the screenshot/report.

## Task 2 - Build The Capture Matrix

**Matrix columns:**

- Surface
- Route/save/setup
- Viewport
- Required assertions
- Screenshot path
- Console-error policy

Prioritize 390px mobile and desktop. Do not attempt every possible panel in one lane.

## Task 3 - Capture Or Script Evidence

**Steps:**

1. Build or start the map UI using existing scripts.
2. Use an existing browser/Playwright helper if present; otherwise record manual instructions in the report.
3. For each surface, capture:
   - screenshot path
   - viewport dimensions
   - console errors/assertions
   - critical element box metrics when layout risk exists
4. If a capture reveals a defect, open a focused fix sub-lane with tests.

## Task 4 - Report And Close

**Files:**

- Create: `docs/40_reports/implemented/YYYYMMDD_VISUAL_QA_EVIDENCE.md`
- Update: `docs/40_reports/GUI_MASTER.md`
- Update: `docs/PROJECT_LEDGER.md`

**Validation:**

- `npm.cmd run typecheck`
- focused UI tests for any changed code
- `npm.cmd run desktop:map:build`
- `git diff --check`

## Stop Gates

- Stop if a required route/save cannot be produced.
- Stop if browser automation is unavailable and manual evidence is needed from the user.
- Stop if a screenshot exposes sensitive-history prose needing historian review.
- Stop before broad redesign; file a defect instead.

## Ready-to-paste Claude prompt

### 1. Role and objective

You are the visual-QA evidence worker for AWWV. Build a current evidence matrix and capture or script visual proof for the highest-value surfaces.

### 2. Canon references

Read `docs/40_reports/GUI_MASTER.md`, `docs/40_reports/GAME_STATE_RATING_MASTER.md`, and the relevant implemented reports for each surface.

### 3. Determinism and ledger constraints

Do not change mechanics. Keep evidence filenames stable and sorted. Update ledger/docs only after validation.

### 4. STOP AND ASK triggers

Canon conflicts or canon silence on required decision; determinism or stable ordering cannot be guaranteed; ledger update requirement is unclear; scope expands beyond prompt objective. Also stop if browser/manual evidence requires user action.

### 5. Output format and validation

Report evidence folders, screenshots/captures, commands run, defects found/fixed, docs updated, and remaining visual gaps.

