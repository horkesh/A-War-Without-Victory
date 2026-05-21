# Strict-Null Formation Spawn Tail

**Date:** 2026-05-21
**Type:** Strict-null cleanup; behavior-equivalent runtime refactor.

## Summary

Cleaned the remaining inventory-counted index non-null assertions from `src/sim/formation_spawn.ts`.

The function already initialized `state.military.formations` before any write. This change hoists that initialized map into a local `formations` record and writes through it at the three spawn sites.

## Inventory Result

Current strict-null inventory floor after this slice:

```text
as_factionid_casts 2
as_unknown_casts 4
as_any_casts 179
non_null_assertions_dot 7
non_null_assertions_index 20
optional_fields_game_state 473
```

`src/sim/formation_spawn.ts` now contributes zero inventory-counted index non-null assertions.

## Verification

```text
npx.cmd vitest run tests/strict_null_inventory_progress.test.ts tests/formation_spawn.test.ts tests/formation_spawn_directive.test.ts tests/wia_trickleback.test.ts --reporter=dot
PASS 67/67

npx.cmd vitest run tests/militia_rework.test.ts tests/proto_brigade_spawn.test.ts tests/siege_mobilization.test.ts tests/early_war_turn_structure.test.ts --reporter=dot
PASS 38/38

npm.cmd run typecheck
PASS

npm.cmd run test:baselines
PASS - Baseline regression: all scenarios match.
```
