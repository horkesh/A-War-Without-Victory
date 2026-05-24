# Combat Evaluator BFS Queue Cursor

**Date:** 2026-05-23
**Status:** Implemented and locally verified
**Lane:** Engine quality / bot-order evaluator performance
**Scope:** Compute-only FIFO BFS queue optimization in the return-to-corps evaluator. No scenario data, combat math, operation behavior, save schema, UI, calibration, painted targets, or output contract changed.

## Summary

`evaluateReturnToCorps(...)` in `src/sim/combat/bot_brigade_eval_front.ts` used `Array.shift()` while searching friendly territory for a path back to the brigade's own corps territory. The loop now uses a monotonic `head` cursor.

This preserves FIFO traversal, parent-map construction, and first-target behavior while avoiding repeated array reindexing during dequeue.

## Determinism

- No cache was added.
- Queue insertion order is unchanged.
- Existing adjacency order is unchanged.
- The same parent-map and first-step reconstruction logic is preserved.
- No timestamps, randomness, scenario data, or serialized output fields changed.

## Verification

| Check | Result |
|---|---|
| Red characterization | `npx.cmd vitest run tests\combat_movement_queue_cursor.test.ts --reporter=dot` failed before implementation because the return-to-corps BFS region still contained `.shift()`. |
| Focused evaluator tests | PASS, 36/36: `tests\combat_movement_queue_cursor.test.ts`, `tests\brigade_front_distribution.test.ts`, `tests\brigade_home_return.test.ts`. |
| Source grep | PASS: no `.shift()` remains in `src\sim\combat\bot_brigade_eval_front.ts`. |
| Typecheck | PASS: `npm.cmd run typecheck`. |
| 40w scenario | PASS: `npm.cmd run sim:scenario:run:40w` produced `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n5`, final hash `30abd0696b9d7e24`. |
| Run consistency | PASS: `node tools\validate_run_consistency.cjs runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n5`. |
| Baseline regression | PASS: `npm.cmd run test:baselines`, all scenarios match. |
| Diff hygiene | PASS: `git diff --check`. |

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/bot_brigade_eval_front.ts` | Return-to-corps BFS now uses a head cursor. |
| `tests/combat_movement_queue_cursor.test.ts` | Adds a static guard against `.shift()` in the return-to-corps BFS region. |
