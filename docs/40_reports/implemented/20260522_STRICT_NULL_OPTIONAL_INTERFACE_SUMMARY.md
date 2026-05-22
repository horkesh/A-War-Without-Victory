# Strict-Null Optional Interface Summary

**Date:** 2026-05-22
**Scope:** Diagnostic tooling for optional `GameState` field slicing.

## Summary

Added `--field-interfaces` to `tools/diagnostics/strict_null_inventory.cjs`. The new mode groups optional `GameState` fields by interface and domain, sorted by descending optional-field count, so future strict-null optional-field work can choose bounded owner slices instead of scanning the full 477-field list.

Initial current-tree signal:

- `MilitaryState`: 105 optional fields.
- `FormationState`: 63 optional fields.
- `CorpsOperation`: 58 optional fields.
- Derived domain remains 8 optional fields and is already classified separately.

## Verification

```powershell
npx.cmd vitest run tests\strict_null_inventory.test.ts --reporter=dot
node tools\diagnostics\strict_null_inventory.cjs --field-interfaces
git diff --check
```

Results: strict-null inventory tests passed 4/4; `--field-interfaces` emitted deterministic JSON; diff check passed.
