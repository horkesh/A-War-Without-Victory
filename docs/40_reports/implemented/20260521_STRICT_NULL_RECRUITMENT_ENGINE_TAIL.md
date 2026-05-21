# Strict-Null Recruitment Engine Tail

**Date:** 2026-05-21
**Type:** Strict-null cleanup; behavior-equivalent runtime refactor with explicit invariant check.

## Summary

Cleaned the remaining inventory-counted index non-null assertion from `src/sim/recruitment_engine.ts`.

`applyRecruitment(...)` receives a successful recruitment result whose pools were already checked during recruitment. The old code relied on non-null assertions when applying the result. The new code narrows the militia pool, recruitment-capital pool, and equipment pool into locals and throws a clear invariant error if an external malformed success result references missing resources.

## Inventory Result

Current strict-null inventory floor after this slice:

```text
as_factionid_casts 2
as_unknown_casts 4
as_any_casts 179
non_null_assertions_dot 7
non_null_assertions_index 19
optional_fields_game_state 473
```

`src/sim/recruitment_engine.ts` now contributes zero inventory-counted index non-null assertions.

## Verification

```text
npx.cmd vitest run tests/strict_null_inventory_progress.test.ts tests/recruitment_engine.test.ts tests/recruitment_existing_formation_identity.test.ts tests/emergent_brigade_formation.test.ts --reporter=dot
PASS 108/108

npm.cmd run typecheck
PASS

npm.cmd run test:baselines
PASS - Baseline regression: all scenarios match.
```
