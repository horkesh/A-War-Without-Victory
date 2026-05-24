# Brigade Movement Order Helper

**Date:** 2026-05-23
**Status:** Implemented and locally verified
**Lane:** Strict-null hygiene / movement-order contract cleanup
**Scope:** Type-safety cleanup for column-march order producers. No scenario data, combat math, movement behavior, save schema, UI behavior, calibration tuning, painted targets, or output contract changed.

## Summary

`BrigadeMovementOrder.stance` remains intentionally optional: absence still means the normal/default non-column order path, while `stance: 'column'` continues to mark operational marches consumed by `osid_column_movement.ts`.

This slice adds `createColumnMovementOrder(...)` as the shared constructor for column-march orders and replaces repeated local shape casts in movement producers:

- `brigade_front_distribution.ts`
- `brigade_home_return.ts`
- `commander_march_correction.ts`
- `sector_offensive.ts`

The helper returns the existing `BrigadeMovementOrder` shape: `destination_sids: [destination]` plus `stance: 'column'`.

## Determinism

- Movement-order payloads are byte-equivalent in field names and values.
- No ordering, pathfinding, staging, combat, lifecycle, or save/default semantics changed.
- No randomness, timestamps, caches, or output fields were introduced.
- The optional `stance` contract remains unchanged; only column-order producers now share a typed construction boundary.

## Verification

| Check | Result |
|---|---|
| Red characterization | `npx.cmd vitest run tests\brigade_movement_order_helper.test.ts --reporter=dot` failed before implementation because movement producers still used local `destination_sids` shape casts. |
| Focused movement/sector pack | PASS, 61/61: `npx.cmd vitest run tests\brigade_movement_order_helper.test.ts tests\osid_column_movement.test.ts tests\seam_a_isolation_guard.test.ts tests\sector_frontline_truth.test.ts tests\tooth_guard.test.ts --reporter=dot`. |
| Strict-null inventory progress | PASS, 92/92: `npx.cmd vitest run tests\brigade_movement_order_helper.test.ts tests\strict_null_inventory_progress.test.ts --reporter=dot`. |
| Typecheck | PASS: `npm.cmd run typecheck`. |
| Baseline regression | PASS: `npm.cmd run test:baselines`, all scenarios match. |
| Diff hygiene | PASS: `git diff --check`. |

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/brigade_movement_order_helpers.ts` | Adds the typed `createColumnMovementOrder(...)` helper. |
| `src/sim/combat/brigade_front_distribution.ts` | Replaces four local column-order shape casts with the helper. |
| `src/sim/combat/brigade_home_return.ts` | Replaces the return-march column-order shape cast with the helper. |
| `src/sim/combat/commander_march_correction.ts` | Replaces two corrected-march column-order shape casts with the helper. |
| `src/sim/combat/sector_offensive.ts` | Replaces the post-operation return-march column-order shape cast with the helper. |
| `tests/brigade_movement_order_helper.test.ts` | Guards the movement producer files against reintroducing local column-order casts. |

## Next Steps

- Keep `BrigadeMovementOrder.stance` optional unless a future save-schema/defaulting lane proves all existing order producers and loaded saves can safely require it.
