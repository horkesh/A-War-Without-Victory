# Save Migration Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the real deserialize path handle older numeric schema versions through the same migration/defaulting contract used by direct migration tests.

**Architecture:** Future versions reject clearly; old versions and missing versions enter canonical defaulting and deterministic migrations before strict serialization.

**Tech Stack:** TypeScript save serialization/migration/validation, Vitest roundtrip tests.

---

## Files

- `src/state/serialize.ts`
- `src/state/save_migration.ts`
- `src/state/serializeGameState.ts`
- `src/state/validateGameState.ts`
- `tests/save_migration.test.ts`
- `tests/migration_nested_ownership.test.ts`
- `tests/save_load_real_roundtrip.test.ts`
- `tests/serialize_gamestate_stability.test.ts`
- `tests/serialize_gamestate_no_derived_fields.test.ts`
- `tests/serialize_gamestate_rejects_wrappers.test.ts`

## Implementation Tasks

1. Add failing test: `deserializeState(JSON.stringify({ schema_version: 1, ... }))` migrates to current instead of throwing.
2. Add real-load test for `active_operation -> active_operations`.
3. Add legacy top-level residue rescue test before serialization strictness.
4. Add future-version test proving `schema_version: 999` throws.
5. Refactor `migrateState(...)` so `undefined`, `0`, `1`, and current versions enter defaulting then `applyMigrations(...)`.
6. Sort migrations deterministically and guard duplicate migration versions.
7. Keep `serializeGameState(...)` top-level allowlist strict.

## Verification

- `npx.cmd vitest run tests/save_migration.test.ts tests/migration_nested_ownership.test.ts tests/save_load_real_roundtrip.test.ts`
- `npx.cmd vitest run tests/serialize_gamestate_no_derived_fields.test.ts tests/serialize_gamestate_stability.test.ts tests/serialize_gamestate_rejects_wrappers.test.ts`
- `npm.cmd run typecheck`

## Documentation And Ledger

- Update save/migration docs if present.
- Add `docs/PROJECT_LEDGER.md` save-compatibility entry.

## Stop Gates

- Stop if old saves require top-level allowlist expansion.
- Stop if migration order can depend on object insertion order.
- Stop if future schema versions are silently accepted.
