# Cinematic Verdict Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the endgame verdict from a stat presentation into a memorable, shareable conclusion while preserving the canonical victory/Pyrrhic scoring contract.

**Architecture:** Build presentation on top of existing verdict, Cost Ledger, historical comparison, Chronicle, and dynamic Codex outputs. Do not change scoring rules in this lane.

**Tech Stack:** React verdict UI, CSS animation, existing endgame data builders, Vitest, Playwright screenshots.

---

## Task 1: Verdict Scene Model

**Files:**
- Create: `src/ui/map/data/verdictScene.ts`
- Test: `tests/ui/verdict_scene.test.ts`

**Steps:**
1. Build a pure function that selects scene tone, headline, cost emphasis, and comparison callouts from existing verdict data.
2. Add tests for Pyrrhic, catastrophic, and early-peace outcomes.

## Task 2: Cinematic Verdict Component

**Files:**
- Modify: `src/ui/map/components/VerdictScreen.tsx`
- Create/modify: `src/ui/map/components/verdict/CinematicVerdict.tsx`
- Test: `tests/ui/cinematic_verdict.test.ts`

**Acceptance:** No nested cards, no marketing hero layout, no score rule changes.

## Task 3: Shareable Summary Export

**Files:**
- Create: `src/ui/map/data/verdictShareSummary.ts`
- Test: `tests/ui/verdict_share_summary.test.ts`

**Steps:**
1. Generate deterministic plain-text summary.
2. Include outcome class, cost ledger headline, and historical comparison.

## Task 4: Visual Regression

**Files:**
- Create: `docs/40_reports/implemented/visual_validation/YYYYMMDD_cinematic_verdict/`

**Acceptance:** Desktop and mobile screenshots show no text overlap and no blank state.

**Required viewports:** capture at least `390x844`, `768x1024`, and `1440x900` against the local map shell. Save the command, URL, and screenshot filenames in the visual-validation README.

## Verification

Run:
- `npm.cmd run typecheck`
- `npx.cmd vitest run tests\ui\verdict_scene.test.ts tests\ui\cinematic_verdict.test.ts tests\ui\verdict_share_summary.test.ts`
- `npm.cmd run desktop:map:build`

## Docs and Ledger

Update:
- `docs/40_reports/implemented/YYYYMMDD_CINEMATIC_VERDICT.md`
- `docs/40_reports/GAME_STATE_RATING_MASTER.md`
- `docs/PROJECT_LEDGER.md`

Determinism: presentation-only over existing verdict data.

## Stop Gates And Closeout

- Stop if any change touches victory scoring, Pyrrhic classification, cost ledger calculation, or historical comparison data contracts.
- Stop if screenshots show clipped verdict copy, overlapping controls, blank state, or nested-card presentation.
- Stage only verdict presentation/read-model, focused tests, screenshots/report, roadmap, and ledger files owned by this plan.
