# Strict-Null Runtime Non-Null Tail 3

**Date:** 2026-05-21
**Type:** Strict-null cleanup; behavior-equivalent runtime refactor.

## Summary

Cleaned a third safe runtime slice of inventory-counted escapes:

- `src/sim/combat/commander_march_correction.ts`
- `src/sim/combat/paramilitary_sweep.ts`
- `src/sim/early_war/minority_erosion.ts`

This is a type-safety cleanup only. It does not change scenario data, save schema, commander movement correction behavior, paramilitary capture/casualty rules, or minority-erosion behavior.

## Changes

- Replaced commander march-correction movement-state deletes with the already-local `moveStates` object.
- Replaced paramilitary civilian casualty `cc!` access with the initialized casualty map local.
- Replaced minority-erosion militia-strength non-null writes with initialized local strength maps, also removing one stale `as any` escape.
- Added a strict-null inventory progress assertion pinning the three-file slice at zero for `as_any_casts`, `non_null_assertions_dot`, and `non_null_assertions_index`.

## Inventory Result

Current strict-null inventory floor after this slice:

```text
as_factionid_casts 2
as_unknown_casts 4
as_any_casts 179
non_null_assertions_dot 7
non_null_assertions_index 23
optional_fields_game_state 473
```

The three cleaned files now contribute zero inventory-counted `as any` and dot/index non-null assertions.

## Verification

```text
npx.cmd vitest run tests/strict_null_inventory_progress.test.ts tests/paramilitary_sweep.test.ts tests/commander/elite_formation_utilization.test.ts --reporter=dot
PASS 130/130

npx.cmd vitest run tests/alliance_lifecycle.test.ts tests/seam_a_isolation_guard.test.ts --reporter=dot
PASS 46/46

npm.cmd run typecheck
PASS

npm.cmd run test:baselines
PASS - Baseline regression: all scenarios match.
```
