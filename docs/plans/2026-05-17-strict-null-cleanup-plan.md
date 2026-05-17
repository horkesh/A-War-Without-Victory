# Strict Null Contract Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clean boundary null contracts under already-enabled strict mode without changing intentional domain null semantics.

**Architecture:** Harden state/read-model/validation boundaries first; do not attempt repo-wide optionality churn in one pass.

**Tech Stack:** TypeScript strict mode, state validation, UI adapter tests, Vitest static guard.

---

## Files

- `tsconfig.json`
- `src/ui/map/tsconfig.json`
- `src/ui/map/data/GameStateAdapter.ts`
- `src/state/serialize.ts`
- `src/state/validateGameState.ts`
- `src/state/settlement_control.ts`
- `tests/ui_map_game_state_adapter.test.ts`
- `tests/validate_game_state_shape.test.ts`
- `tests/migration_nested_ownership.test.ts`
- New optional `tests/null_contract_static.test.ts`

## Implementation Tasks

1. Add static test proving no tsconfig sets `strictNullChecks: false`.
2. Add adapter contract tests for null/undefined `military`, `political`, `displacement`, `player_faction`, officer state, and control maps.
3. Add validation tests preserving explicit domain nulls while rejecting missing required fields.
4. Optionally add explicit `"strictNullChecks": true` for readability; behavior already follows `"strict": true`.
5. Replace repeated `as any` boundary reads with local guards such as `isRecord`, `readString`, `readNumber`, and `readArray`.
6. Avoid enabling `exactOptionalPropertyTypes` or `noUncheckedIndexedAccess` in this lane.

## Verification

- `npm.cmd run typecheck`
- `npx.cmd vitest run tests/ui_map_game_state_adapter.test.ts tests/validate_game_state_shape.test.ts tests/migration_nested_ownership.test.ts`
- Optional: `npm.cmd run test:vitest:fast`

## Documentation And Ledger

- Add `docs/PROJECT_LEDGER.md` entry only if runtime contracts or validation behavior change.
- No canon update unless political-control/save null semantics change.

## Stop Gates

- Stop if domain `null` changes meaning to `undefined`.
- Stop if cleanup turns into broad repo-wide churn.
- Stop if adapters hide malformed state that validators should reject.
