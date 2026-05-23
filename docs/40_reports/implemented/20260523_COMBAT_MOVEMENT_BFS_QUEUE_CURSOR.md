# Combat Movement BFS Queue Cursor

**Date:** 2026-05-23
**Status:** Implemented and locally verified
**Lane:** Engine quality / combat movement performance
**Scope:** Compute-only FIFO BFS queue optimization in combat movement helpers. No scenario data, combat math, operation behavior, save schema, UI, calibration, painted targets, or output contract changed.

## Summary

Five combat movement BFS loops used `Array.shift()`:

- `findNearestFrontOsid(...)` in `src/sim/combat/bot_brigade_movement_ai.ts`
- `findNearestOsidByPattern(...)` in `src/sim/combat/bot_brigade_movement_ai.ts`
- `computeHopsToFront(...)` in `src/sim/combat/bot_brigade_movement_ai.ts`
- `findFrontDestinationForColumnMarch(...)` in `src/sim/combat/bot_brigade_movement_ai.ts`
- `shortestPathThroughFriendly(...)` in `src/sim/combat/brigade_movement.ts`

Each loop now uses a monotonic `head` cursor:

```ts
let head = 0;
while (head < queue.length) {
    const current = queue[head++]!;
    ...
}
```

This preserves FIFO traversal and sorted neighbor insertion order while avoiding repeated array reindexing during dequeue.

## Determinism

- No cache was added.
- Queue insertion order is unchanged.
- Neighbor ordering remains exactly as before.
- Traversal still consumes the same queue entries in the same order.
- No timestamps, randomness, scenario data, or serialized output fields changed.

## Verification

| Check | Result |
|---|---|
| Red characterization | `npx.cmd vitest run tests\combat_movement_queue_cursor.test.ts --reporter=dot` failed before implementation because the target BFS regions still contained `.shift()`. |
| Focused movement tests | PASS, 18/18: `tests\combat_movement_queue_cursor.test.ts`, `tests\brigade_deploy_orders.test.ts`, `tests\interior_movement_corps_boundary.test.ts`, `tests\bot_operation_objective_focus.test.ts`. |
| Typecheck | PASS: `npm.cmd run typecheck`. |
| 40w scenario | PASS: `npm.cmd run sim:scenario:run:40w`; final hash `30abd0696b9d7e24`; run `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n3`. |
| Consistency validation | PASS: `node tools\validate_run_consistency.cjs runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n3` with 0 unresolved assignments, 0 false owners, 0 disconnected sectors, 0 empty contested sectors, 0 missed legal floor donors, and 0 wide undefended front gaps. |
| Baseline regression | PASS: `npm.cmd run test:baselines`; all scenarios match. |
| Diff hygiene | PASS: `git diff --check`. |

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/bot_brigade_movement_ai.ts` | Four FIFO BFS helpers now use head cursors instead of `Array.shift()`. |
| `src/sim/combat/brigade_movement.ts` | `shortestPathThroughFriendly(...)` now uses a head cursor instead of `Array.shift()`. |
| `tests/combat_movement_queue_cursor.test.ts` | Adds static guards against `.shift()` in these FIFO BFS regions. |
