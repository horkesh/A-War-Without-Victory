# CLI Harness BFS Queue Cursor

**Date:** 2026-05-23
**Status:** Implemented and locally verified
**Lane:** Engine quality / deterministic diagnostic-harness performance
**Scope:** Compute-only FIFO BFS queue optimization in Phase 3A A/B and Phase 3ABC audit CLI harness seed builders. No scenario data, combat math, operation behavior, save schema, UI behavior, calibration tuning, painted targets, or output contract changed.

## Summary

Five Phase 3 diagnostic-harness BFS loops still used `Array.shift()` as their dequeue primitive. They now use monotonic head cursors while preserving enqueue order, sorted-neighbor expansion, parent/depth maps, and cluster selection semantics.

This closes the reviewed true-FIFO CLI harness tail from the broader queue-cursor cleanup. Remaining live `.shift()` sites are semantic queues, priority queues, UI buffers, tests, painter undo history, or archived/report examples unless separately proven otherwise.

## Determinism

- No cache was added.
- Queue insertion order is unchanged.
- Neighbor ordering remains the existing sorted `localeCompare` order.
- Parent/depth map writes occur at the same traversal points.
- No timestamps, randomness, scenario data, or serialized output fields changed.
- Aligns with the stable-ordering / byte-identical rerun gates in `docs/20_engineering/DETERMINISM_TEST_MATRIX.md` and the deterministic entrypoint discipline in `docs/20_engineering/CODE_CANON.md`.

## Verification

| Check | Result |
|---|---|
| Red characterization | `npx.cmd vitest run tests\cli_harness_queue_cursor.test.ts --reporter=dot` failed before implementation because the targeted harness regions still contained `.shift()`. |
| Focused guard | PASS, 2/2: `npx.cmd vitest run tests\cli_harness_queue_cursor.test.ts --reporter=dot`. |
| Phase 3A A/B harness | PASS: `npm.cmd run sim:phase3a:ab` completed BFS, bottleneck, and weaklink seed reports. |
| Phase 3ABC audit harness | PASS: `npm.cmd run phase3:abc_audit`; report hashes A-D were `af234629acd600274dc686878045016f67183ff175a9a35f5c24e48288bcdbdb`, `60e29e56aea11572ebcfdd814bbe34135682fe5113033212b0900518b588c924`, `10b78029c549b2df04cda0ed6e1386ad2a5d41b8044df69b760573a04a05de64`, and `23544920575e8dfdf2a46c82574e511cec6242dc94e37576ee3b6ef0953774be`. |
| Strict-null inventory progress | PASS, 91/91 as part of `npx.cmd vitest run tests\cli_harness_queue_cursor.test.ts tests\strict_null_inventory_progress.test.ts --reporter=dot`. |
| Typecheck | PASS: `npm.cmd run typecheck`. |
| Baseline regression | PASS: `npm.cmd run test:baselines`, all scenarios match. |
| Diff hygiene | PASS: `git diff --check`. |

## Files Changed

| File | Change |
|---|---|
| `src/cli/phase3a_ab_harness.ts` | Three seed-builder BFS loops now use head cursors instead of `Array.shift()`. |
| `src/cli/phase3abc_audit_harness.ts` | Two seed-builder BFS loops now use head cursors instead of `Array.shift()`. |
| `tests/cli_harness_queue_cursor.test.ts` | Adds static guards for the Phase 3 diagnostic-harness FIFO BFS regions. |

## Next Steps

- Leave semantic operation queues, priority queues, and UI/history buffers untouched unless a future lane proves they are true FIFO traversal bottlenecks.
