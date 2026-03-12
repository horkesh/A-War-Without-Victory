# Cursor/Agent Prompt: Architecture & QA/Engineering Cleanup

**Date:** 2026-03-12
**Assigned by:** Orchestrator
**Plan:** `docs/plans/2026-03-12-architecture-qa-engineering-cleanup.md`

## What's happening

The Orchestrator is executing a 5-phase architecture and QA/engineering cleanup. These are structural improvements that do NOT touch:
- Combat mechanics, bot AI, or calibration constants
- Pre-planned operations or operation preparation system
- UI components or warroom
- OOB data or scenario files

## Active workstreams to coordinate with

1. **Operation Preparation System** — Another agent owns this (Phase 1: officer data fixes + schema + core mechanic). Plan at `docs/plans/2026-03-11-operation-preparation-system.md`. **No conflicts** — ops prep touches `officer_system.ts`, `game_state.ts` (schema additions), and `sector_offensive.ts`. Architecture cleanup touches `validateGameState.ts`, `determinism_guard.ts`, `displacement_takeover.ts` (rename only), and `game_state.ts` (type rename only).

2. **Calibration** — Ongoing. Architecture cleanup does NOT change any simulation behavior. Pure structural.

## Files being modified (architecture cleanup)

| Phase | Files | Change type |
|-------|-------|-------------|
| 1 | `src/state/validateGameState.ts` | Add partition root checks |
| 2 | `src/state/game_state.ts` | Rename `PhaseIIFrontStability` → `FrontStability` |
| 2 | `src/state/displacement_takeover.ts` | Rename `PhaseIIBattleResolutionLike` → `BattleResolutionLike` |
| 2 | `src/sim/combat/phase_ii_adjacency.ts` → `war_adjacency.ts` | File rename + 4 import updates |
| 3 | `tests/war_phase_step_order.test.ts` | New test file |
| 4 | `tools/engineering/determinism_guard.ts` | 1-line fix |
| 5 | `.github/workflows/ci.yml` | New file |

## If you're an agent working on this repo

- **Do not modify** the files listed above during this cleanup window
- If you need to add fields to `GameState`, coordinate — Phase 2 renames a type in `game_state.ts`
- If you need to add pipeline steps, note that Phase 3 will assert step count — update the test
- The cleanup is non-breaking: all renames are internal, no exported API changes affect consumers
