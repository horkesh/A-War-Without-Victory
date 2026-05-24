# State Supply BFS Queue Cursor

**Date:** 2026-05-23
**Status:** Implemented and locally verified
**Lane:** Engine quality / deterministic state derivation performance
**Scope:** Compute-only FIFO BFS queue optimization in supply reachability, supply state derivation, siege pocket grouping, sustainability surrounded-search, and enclave component grouping. No scenario data, combat math, operation behavior, save schema, UI, calibration, painted targets, or output contract changed.

## Summary

Several state-layer supply and enclave helpers used `Array.shift()` as a FIFO dequeue primitive. These paths now use a monotonic `head` cursor while preserving enqueue order, neighbor iteration, and all existing sorted output boundaries.

The slice intentionally does not touch semantic queues, UI buffers, priority queues, or archived code.

## Determinism

- No cache was added.
- Queue insertion order is unchanged.
- Existing adjacency and neighbor iteration are unchanged.
- Existing sorted outputs remain sorted by their prior comparators.
- No timestamps, randomness, scenario data, or serialized output fields changed.
- Aligns with `docs/10_canon/Engine_Invariants_v0_9_0.md` Section 4 supply propagation ordering and `docs/20_engineering/DETERMINISM_TEST_MATRIX.md` stable-ordering / byte-identical rerun gates.

## Verification

| Check | Result |
|---|---|
| Red characterization | `npx.cmd vitest run tests\state_supply_queue_cursor.test.ts --reporter=dot` failed before implementation because all targeted regions still contained `.shift()`. |
| Focused state/supply tests | PASS, 65/65: `tests\state_supply_queue_cursor.test.ts`, `tests\supply_reachability.test.ts`, `tests\supply_reachability_osid.test.ts`, `tests\supply_bridge_finding_tarjan.test.ts`, `tests\supply_bridge_finding_property.test.ts`, `tests\supply_cascade_deterministic_order.test.ts`, `tests\supply_reserves_phase_b.test.ts`, `tests\sustainability.test.ts`, and `tests\enclave_integrity.test.ts`. |
| Source grep | PASS: no `.shift()` remains in the five targeted state files. |
| Typecheck | PASS: `npm.cmd run typecheck`. |
| 40w scenario | PASS: `npm.cmd run sim:scenario:run:40w` produced `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n6`, final hash `30abd0696b9d7e24`. |
| Run consistency | PASS: `node tools\validate_run_consistency.cjs runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n6`. |
| Baseline regression | PASS: `npm.cmd run test:baselines`, all scenarios match. |
| Diff hygiene | PASS: `git diff --check`. |

## Files Changed

| File | Change |
|---|---|
| `src/state/supply_reachability.ts` | `runSupplyBfs(...)` uses a head cursor. |
| `src/state/supply_state_derivation.ts` | SID/OSID bridge checks, adequate-state BFS, and heartland component BFS use head cursors. |
| `src/state/supply_reserves.ts` | Siege critical-pocket grouping BFS uses a head cursor. |
| `src/state/sustainability.ts` | Municipality surrounded-search BFS uses a head cursor. |
| `src/state/enclave_integrity.ts` | Enclave component BFS uses a head cursor. |
| `tests/state_supply_queue_cursor.test.ts` | Adds static guards for the state supply/enclave BFS regions. |
