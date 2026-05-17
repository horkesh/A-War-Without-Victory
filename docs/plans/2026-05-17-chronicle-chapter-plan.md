# Chronicle Chapter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add deterministic Chronicle chapters that group campaign history into readable narrative arcs without inventing unsupported facts.

**Architecture:** Use existing Chronicle entries, Turn Aftermath records, Cost Ledger signals, and dynamic Codex sections. Chapter generation is deterministic and may be LLM-assisted only as an offline/operator drafting workflow, not a runtime dependency.

**Tech Stack:** TypeScript read models, React Chronicle UI, Vitest.

---

## Design Gate: Chapter Boundary

Before implementation, user chooses:
1. End-of-month chapters.
2. End-of-phase chapters.
3. User-triggered bookmarks.

Default recommendation: end-of-phase chapters for v1.0, user bookmarks later.

Record the chosen boundary in `docs/40_reports/audits/YYYYMMDD_CHRONICLE_CHAPTER_BOUNDARY_DECISION.md` before writing implementation code.

## Task 1: Chapter Builder

**Files:**
- Create: `src/ui/map/data/chronicleChapters.ts`
- Test: `tests/ui/chronicle_chapters.test.ts`

**Steps:**
1. Add fixture entries across multiple months/phases.
2. Build deterministic grouping and title generation.
3. Sort entries by turn then stable id.
4. Preserve source entry ids, Turn Aftermath ids, Cost Ledger references, and Codex references in the chapter model.

## Task 2: Chapter UI

**Files:**
- Modify: `src/ui/map/components/chronicle/ChronicleOverlay.tsx`
- Test: `tests/ui/chronicle_chapter_ui.test.ts`

**Acceptance:** Player can switch between entry list and chapter view without losing filters.

The chapter view must preserve existing Chronicle filters, selected entry state, and deterministic title ordering.

## Task 3: Narrative Guardrails

**Files:**
- Test: `tests/ui/chronicle_chapter_guardrails.test.ts`

**Steps:**
1. Assert chapters only cite source entry ids.
2. Assert no generated chapter claims an atrocity/rupture unless source entries contain that signal.

## Verification

Run:
- `npm.cmd run typecheck`
- `npx.cmd vitest run tests\ui\chronicle_chapters.test.ts tests\ui\chronicle_chapter_ui.test.ts tests\ui\chronicle_chapter_guardrails.test.ts`
- `npm.cmd run desktop:map:build`

## Docs and Ledger

Update:
- `docs/40_reports/implemented/YYYYMMDD_CHRONICLE_CHAPTERS.md`
- `docs/40_reports/GAME_STATE_RATING_MASTER.md`
- `docs/PROJECT_LEDGER.md`

Stop gate: user must select chapter boundary before implementation.

## Commit And Closeout

- Stop if any chapter title/body invents an unsupported event, atrocity, rupture, or outcome not present in source entries.
- Stage only Chronicle read-model/UI, focused tests, boundary decision report, implemented report, roadmap, and ledger files owned by this plan.
