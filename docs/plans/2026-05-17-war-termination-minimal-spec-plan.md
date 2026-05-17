# War Termination Minimal Spec Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Lock the minimum end-of-war contract: termination priority, saved outcome state, frozen snapshot, and early peace handoff.

**Architecture:** Write the spec against current code first; add small contract tests only where current behavior is already intended.

**Tech Stack:** Markdown spec, TypeScript war termination/end-state tests, canon check.

---

## Files

- `src/sim/war_termination.ts`
- `src/sim/endgame/endgame_snapshot.ts`
- `src/validate/end_state.ts`
- `tests/war_termination.test.ts`
- `tests/end_state.test.ts`
- `docs/plans/2026-04-14-v090-victory-pyrrhic-scoring-contract-plan.md`

## Implementation Tasks

1. Draft minimal spec for priority order: victory condition, negotiated peace, faction collapse, turn limit.
2. Define persisted fields: `meta.game_over`, `meta.outcome`, `political.end_state`, and frozen endgame snapshot.
3. Define early peace handoff and what systems may still write after game-over.
4. Add or update contract tests only for current intended behavior.
5. Add static docs test if repo has doc validators; otherwise cite exact code owners in the spec.
6. Wire spec into roadmap/backlog and ledger.

## Verification

- `npx.cmd vitest run tests/war_termination.test.ts tests/end_state.test.ts`
- `npm.cmd run typecheck`
- `npm.cmd run canon:check`

## Documentation And Ledger

- Create or update the war-termination spec under `docs/30_planning/` or `docs/20_engineering/`.
- Update `docs/plans/MASTER_ROADMAP.md`.
- Add `docs/PROJECT_LEDGER.md` docs/contract entry.

## Stop Gates

- Stop if the spec contradicts current code without a paired implementation plan.
- Stop if the spec introduces new victory/scoring mechanics by accident.
