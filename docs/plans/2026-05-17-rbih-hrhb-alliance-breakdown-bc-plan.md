# RBiH-HRHB Alliance Breakdown Phases B/C Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the RBiH-HRHB lane from transition mechanics into active-war behavior: operations, pockets, ceasefire/Washington visibility, and player-readable phase state.

**Architecture:** Add typed alliance phase packets and fix proven operation/doctrine blockers after `isRbihHrhbCombatEnabled` becomes true.

**Tech Stack:** TypeScript early-war alliance logic, combat operations, events data, Vitest, scenario proof.

---

## Files

- `src/sim/early_war/alliance_update.ts`
- `src/sim/combat/bot_corps_directives.ts`
- `src/sim/combat/sector_offensive.ts`
- `data/scenarios/events/war_1993.json`
- `tests/alliance_lifecycle.test.ts`
- `tests/alliance_mobilization.test.ts`
- `docs/40_reports/BOSNIAK_CROAT_CONFLICT_MASTER.md`

## Implementation Tasks

1. Add failing tests for `strong_alliance`, `fragile_alliance`, `mobilizing`, `open_war`, `ceasefire`, and `washington_locked` phase packets.
2. Add operation/doctrine tests proving ARBiH 3rd/4th Corps and HVO Central Bosnia can legally respond after open war starts.
3. Add ceasefire/Washington tests proving further RBiH-HRHB combat is blocked when the lock is active.
4. Patch only proven blockers: opportunity catalog, corps stance, target filters, or event gates.
5. Add event/report player surface explaining why the second front opened, paused, or locked.
6. Run 56w scenario proof and document drift.

## Verification

- `npx.cmd vitest run tests/alliance_lifecycle.test.ts tests/alliance_mobilization.test.ts`
- `npm.cmd run sim:scenario:run:56w`
- `npm.cmd run typecheck`

## Documentation And Ledger

- Update `docs/40_reports/BOSNIAK_CROAT_CONFLICT_MASTER.md`.
- Update relevant phase/canon docs if semantics change.
- Add `docs/PROJECT_LEDGER.md` behavior entry.

## Stop Gates

- Stop before changing earliest-war floor or Washington lock semantics.
- Stop if the fix is a generic aggression bump rather than a typed blocker/catalog/doctrine repair.
