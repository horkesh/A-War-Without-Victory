# Map and Scenario BFS Queue Cursor

**Date:** 2026-05-23
**Status:** Implemented and locally verified
**Lane:** Engine quality / deterministic graph traversal performance
**Scope:** Compute-only FIFO BFS queue optimization in front-region derivation, anomaly diagnostics, early-war OOB overstack search, holdout supply cleanup, event corridor-severed predicates, and desktop movement-order contiguity validation. No scenario data, combat math, operation behavior, save schema, UI, calibration, painted targets, or output contract changed.

## Summary

Six remaining non-UI, non-semantic FIFO graph traversals used `Array.shift()` as their dequeue primitive. They now use monotonic head cursors while preserving enqueue order, depth accounting, early exits, neighbor iteration, and existing sorted output boundaries.

The slice intentionally does not touch semantic queues, priority queues, UI buffers, CLI audit harnesses, tests used as examples, or archived code.

## Determinism

- No cache was added.
- Queue insertion order is unchanged.
- Existing adjacency and neighbor iteration are unchanged.
- Existing sorted outputs remain sorted by their prior comparators.
- No timestamps, randomness, scenario data, or serialized output fields changed.
- Aligns with the stable-ordering / byte-identical rerun gates in `docs/20_engineering/DETERMINISM_TEST_MATRIX.md` and the no-runtime-wall-clock contract in `docs/20_engineering/CODE_CANON.md`.

## Verification

| Check | Result |
|---|---|
| Red characterization | `npx.cmd vitest run tests\map_scenario_queue_cursor.test.ts --reporter=dot` failed before implementation because all targeted regions still contained `.shift()`. |
| Focused map/scenario tests | PASS, 80/80: `tests\map_scenario_queue_cursor.test.ts`, `tests\artifact_determinism.test.ts`, `tests\treaty_apply_military.test.ts`, `tests\anomaly_detector_sector_subtype.test.ts`, `tests\anomaly_detector_deployment_truth.test.ts`, `tests\brigade_stacking_sector_truth.test.ts`, `tests\oob_early_war_entry.test.ts`, `tests\settlement_control.test.ts`, `tests\condition_evaluator.test.ts`, and `tests\consequence_pressure_c2_patron_distance.test.ts`. |
| Source grep | PASS: no `.shift()` remains in the six targeted files. |
| Typecheck | PASS: `npm.cmd run typecheck`. |
| 40w scenario | PASS: `npm.cmd run sim:scenario:run:40w` produced `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n7`, final hash `30abd0696b9d7e24`. |
| Run consistency | PASS: `node tools\validate_run_consistency.cjs runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n7`. |
| Baseline regression | PASS: `npm.cmd run test:baselines`, all scenarios match. |
| Diff hygiene | PASS: `git diff --check`. |

## Known Blocked Check

`tests\startup_snapshot_contract.test.ts` and `tests\desktop_sim_bundle_smoke.test.ts` were attempted because this slice touches `src/desktop/desktop_sim.ts`, but both are blocked by pre-existing baked startup snapshot drift:

`Startup snapshot drift detected for apr_1992: data\derived\startup\apr_1992_initial_save.json`

This slice does not refresh that generated artifact; it should be handled as a separate snapshot-refresh lane if accepted.

## Files Changed

| File | Change |
|---|---|
| `src/map/front_regions.ts` | Front-region connected-component BFS uses a head cursor. |
| `src/scenario/anomaly_detector.ts` | Disconnected-sector and far-from-home BFS checks use head cursors. |
| `src/scenario/oob_early_war_entry.ts` | Early-war overstack donor search uses a head cursor while preserving layer depth counters. |
| `src/sim/early_war/settlement_control.ts` | Holdout supply-connection BFS uses a head cursor. |
| `src/sim/events/event_types.ts` | Corridor-severed condition BFS uses a head cursor. |
| `src/desktop/desktop_sim.ts` | Movement-order destination-contiguity BFS uses a head cursor. |
| `tests/map_scenario_queue_cursor.test.ts` | Adds static guards for the map/scenario/desktop/event FIFO BFS regions. |
