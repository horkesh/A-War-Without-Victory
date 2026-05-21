# Strict-Null Treaty Apply Tail

**Date:** 2026-05-21
**Type:** Strict-null cleanup; behavior-equivalent runtime refactor with explicit invariant check.

## Summary

Cleaned the remaining inventory-counted index non-null assertions from `src/state/treaty_apply.ts`.

`applyTreatyTerritorialAnnex(...)` already initializes `political.control_overrides` and `political.control_recognition` before applying Brcko special-status, transfer, rollback, and recognition clauses. The old code still wrote and deleted through indexed non-null assertions. The new code narrows both initialized maps into locals and uses those locals for all writes/deletes.

No treaty acceptance, territorial transfer, Brcko special-status, recognition, capital cost, save schema, scenario data, or output tuning changed.

## Inventory Result

Current strict-null inventory floor after this slice:

```text
as_factionid_casts 2
as_unknown_casts 4
as_any_casts 179
non_null_assertions_dot 5
non_null_assertions_index 4
optional_fields_game_state 473
```

`src/state/treaty_apply.ts` now contributes zero inventory-counted index non-null assertions.

## Verification

```text
npx.cmd vitest run tests/strict_null_inventory_progress.test.ts tests/treaty_apply_territorial.test.ts tests/treaty_brcko.test.ts tests/treaty_apply_military.test.ts tests/treaty.test.ts --reporter=dot
PASS 115/115
npm.cmd run typecheck
PASS
npm.cmd run test:baselines
PASS (Baseline regression: all scenarios match.)
```
