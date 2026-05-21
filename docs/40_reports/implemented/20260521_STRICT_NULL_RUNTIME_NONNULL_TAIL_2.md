# Strict-Null Runtime Non-Null Tail 2

**Date:** 2026-05-21
**Type:** Strict-null cleanup; behavior-equivalent runtime refactor.

## Summary

Cleaned a second safe runtime slice of inventory-counted dot/index non-null assertions:

- `src/sim/combat/sector_offensive.ts`
- `src/sim/turn_phases/war_phase_negotiation_steps.ts`
- `src/sim/war_stories.ts`
- `src/state/displacement_state_utils.ts`

This is a type-safety cleanup only. It does not change scenario data, save schema, sector/offensive behavior, negotiation rules, displacement math, or war-story output semantics.

## Changes

- Replaced sector-offensive movement-order `!` write with a local initialized movement-order map.
- Replaced Dayton trigger `negotiation!` persistence with a narrowed local after `initiateDaytonNegotiation(...)`.
- Replaced war-story formation iteration `formations!` access with a local formations object.
- Replaced displacement casualty map `civilian_casualties!` access with a local guarded map.
- Added a strict-null inventory progress assertion pinning the four-file continuation slice at zero for both `non_null_assertions_dot` and `non_null_assertions_index`.

## Inventory Result

Current strict-null inventory floor after this slice:

```text
as_factionid_casts 2
as_unknown_casts 4
as_any_casts 180
non_null_assertions_dot 7
non_null_assertions_index 29
optional_fields_game_state 473
```

The four cleaned files now contribute zero inventory-counted dot/index non-null assertions.

## Verification

```text
npx.cmd vitest run tests/strict_null_inventory_progress.test.ts tests/war_stories.test.ts tests/dayton_negotiation.test.ts tests/brigade_home_return.test.ts tests/displacement.test.ts --reporter=dot
PASS 131/131

npm.cmd run typecheck
PASS

npm.cmd run test:baselines
PASS - Baseline regression: all scenarios match.
```
