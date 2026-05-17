# Officer Character Mini-Bio Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make officers feel like people by surfacing concise, historically bounded mini-bios and command traits without creating new commander behavior.

**Architecture:** Add authored/read-only officer metadata and UI presentation. Keep simulation behavior unchanged unless a later plan explicitly wires traits into mechanics.

**Tech Stack:** JSON data, TypeScript adapter, React Army HQ/OOB UI, Vitest.

---

## Task 1: Data Schema

**Files:**
- Modify: `data/scenarios/officers/apr1992_officers.json`
- Modify: `src/state/game_state.ts` if officer type is defined there.
- Test: `tests/officer_mini_bio_schema.test.ts`

**Fields:**
- `bio_short`
- `command_style`
- `known_for`
- `political_alignment_note`
- `sensitive_history_note` optional and neutral.

**Acceptance:** Every displayed officer has a short bio or a safe fallback.

## Task 2: Historical/Canon Review

**Files:**
- Create: `docs/40_reports/audits/YYYYMMDD_OFFICER_MINI_BIO_SOURCE_REVIEW.md`

**Steps:**
1. List officers included in the first pass.
2. Mark each note as source-backed, conservative inference, or generic fallback.
3. Stop for historian review on sensitive-history-adjacent copy.

## Task 3: Adapter Projection

**Files:**
- Modify: `src/ui/map/data/GameStateAdapter.ts`
- Modify: `src/ui/map/data/types.ts`
- Test: `tests/ui_map_game_state_adapter.test.ts`

**Acceptance:** UI receives mini-bio fields without mutating save state.

## Task 4: UI Presentation

**Files:**
- Modify: `src/ui/map/components/OOBSidebar.tsx`
- Modify: `src/ui/map/components/army_hq/ArmyHQModal.tsx`
- Test: `tests/ui/officer_mini_bio.test.ts`

**Steps:**
1. Add compact bio/trait rows where officers are already displayed.
2. Keep text dense and scannable; no hero cards.
3. Ensure fallback copy appears for unknown officers.

## Verification

Run:
- `npm.cmd run typecheck`
- `npx.cmd vitest run tests\officer_mini_bio_schema.test.ts tests\ui_map_game_state_adapter.test.ts tests\ui\officer_mini_bio.test.ts`
- `npm.cmd run desktop:map:build`

## Docs and Ledger

Update:
- `docs/40_reports/implemented/YYYYMMDD_OFFICER_CHARACTER_MINI_BIOS.md`
- `docs/40_reports/GAME_STATE_RATING_MASTER.md`
- `docs/PROJECT_LEDGER.md`

Determinism: data/read-model/UI only; no commander decision behavior.
