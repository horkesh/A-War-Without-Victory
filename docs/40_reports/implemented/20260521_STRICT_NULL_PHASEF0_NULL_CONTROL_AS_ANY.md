# Strict-Null Phase F0 Null-Control As-Any Tail

**Date:** 2026-05-21
**Type:** Strict-null cleanup; CLI diagnostic state-initializer refactor.

## Summary

Cleaned the three `as any` initializer casts in `src/cli/phaseF0_null_political_control_settlements_report.ts`.

The audit-only `GameState` initializer now uses the actual `MilitaryState`, `PoliticalState`, and `DisplacementDomainState` shapes directly. The required military maps were already present, while the political and displacement domains are valid empty optional-field containers before `prepareNewGameState(...)` initializes political control.

No political-control initialization behavior, source data, derived canonical data, scenario behavior, save schema, or output tuning changed.

## Inventory Result

Current strict-null inventory floor after this slice:

```text
as_factionid_casts 2
as_unknown_casts 2
as_any_casts 168
non_null_assertions_dot 0
non_null_assertions_index 0
optional_fields_game_state 473
```

## Verification

```text
npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot
PASS 76/76

npm.cmd run typecheck
PASS

npx.cmd tsx src/cli/phaseF0_null_political_control_settlements_report.ts
PASS; canonical init reported 744 graph nodes and null=0
```
