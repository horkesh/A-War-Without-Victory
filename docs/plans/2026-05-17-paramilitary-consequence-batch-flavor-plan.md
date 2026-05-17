# Paramilitary Consequence, Batch UI, And Flavor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make paramilitary authorizations legible and consequential through named units, batch decisions, scaled consequence previews, and explicit player action.

**Architecture:** Keep core sweep mechanics, extend request metadata, project grouped pending decisions, and resolve only explicit submitted choices.

**Tech Stack:** TypeScript sim state, decision manifest, React modal, Vitest UI and engine tests.

---

## Files

- `src/sim/combat/paramilitary_sweep.ts`
- `src/state/formation_constants.ts`
- `src/state/player_decision_manifest.ts`
- `src/ui/map/data/GameStateAdapter.ts`
- `src/ui/map/data/inboxItems.ts`
- `src/ui/map/components/ParamilitaryReviewModal.tsx`
- `tests/paramilitary_sweep.test.ts`
- `tests/player_decision_manifest.test.ts`
- `tests/ui/paramilitary_inbox_items.test.ts`
- `tests/ui/paramilitary_review_modal.test.ts`

## Implementation Tasks

1. Add failing engine tests for deterministic named-unit assignment, catalog fallback, scaled civilian-risk preview, and explicit resolver output.
2. Add failing UI tests for batch allow selected, deny selected, deny all, and explicit submit.
3. Extend pending request shape with `mode`, `estimated_civilian_risk`, `unit_label`, and deterministic grouping key.
4. Add deterministic named-unit catalog by faction/mode/turn index, with generic fallback only after catalog exhaustion.
5. Update Inbox and modal projections to group requests without hiding individual consequences.
6. Ensure resolver preserves per-request decisions and clears queue exactly once.
7. Update manifest entry and docs.

## Verification

- `npx.cmd vitest run tests/paramilitary_sweep.test.ts tests/ui/paramilitary_inbox_items.test.ts tests/ui/paramilitary_review_modal.test.ts tests/player_decision_manifest.test.ts`
- `npm.cmd run typecheck`

## Documentation And Ledger

- Update consequence-system docs and `docs/20_engineering/GUI_MASTER.md` if UI flow changes.
- Add sensitive-history note because captures record war crimes/civilian casualties.
- Add `docs/PROJECT_LEDGER.md` behavior/UI entry.

## Stop Gates

- Stop if named units imply real historical participation without source review.
- Stop if batch UI can silently allow all without explicit submit.
- Stop if generated decisions are missing from `player_decision_manifest.ts`.
