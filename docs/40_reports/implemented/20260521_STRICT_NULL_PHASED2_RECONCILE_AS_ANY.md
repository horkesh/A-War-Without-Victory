# Strict-Null Phase D2 Reconcile As-Any Tail

**Date:** 2026-05-21
**Type:** Strict-null cleanup; CLI diagnostic type-shape correction.

## Summary

Cleaned the three `as any` reads in `src/cli/phaseD2_settlement_count_reconcile_audit.ts`.

The CLI now reads the current top-level JSON shapes through the existing local interfaces:

- `SettlementsIndex.settlements`
- `CensusFile.municipalities`

An initial typed-wrapper attempt produced zero counts and was rejected during local verification. The accepted change preserves the live diagnostic output: `count_index: 6101`, `count_census: 6139`, `intersection_count: 6081`, `in_index_not_in_census: 20`, and `in_census_not_in_index: 58`.

No source data, derived canonical data, scenario behavior, save schema, or output tuning changed. The generated debug report remains untracked.

## Inventory Result

Current strict-null inventory floor after this slice:

```text
as_factionid_casts 2
as_unknown_casts 2
as_any_casts 171
non_null_assertions_dot 0
non_null_assertions_index 0
optional_fields_game_state 473
```

## Verification

```text
npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot
PASS 75/75

npm.cmd run typecheck
PASS

npx.cmd tsx src/cli/phaseD2_settlement_count_reconcile_audit.ts
PASS; report counts preserved at 6101 / 6139 / 6081 / 20 / 58
```
