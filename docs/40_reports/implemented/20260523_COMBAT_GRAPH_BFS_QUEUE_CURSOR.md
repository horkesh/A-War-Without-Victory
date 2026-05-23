# Combat Graph BFS Queue Cursor

**Date:** 2026-05-23
**Status:** Implemented and locally verified
**Lane:** Engine quality / combat graph performance
**Scope:** Compute-only FIFO BFS queue optimization in combat graph/rear-pocket helpers. No scenario data, combat math, operation behavior, save schema, UI, calibration, painted targets, or output contract changed.

## Summary

Six FIFO BFS loops used `Array.shift()`:

- `bfsReachable(...)` in `src/sim/combat/osid_graph_analysis.ts`
- optimized `analyzeFactionGraphOptimized(...)` pocket-cluster BFS in `src/sim/combat/osid_graph_analysis.ts`
- legacy `analyzeFactionGraphLegacy(...)` pocket-cluster BFS in `src/sim/combat/osid_graph_analysis.ts`
- `isSettlementSetContiguous(...)` in `src/sim/combat/war_adjacency.ts`
- `consolidateRearPockets(...)` in `src/sim/combat/rear_pocket_consolidation.ts`
- `buildFriendlyComponentsLocal(...)` in `src/sim/combat/attack_retreat_displacement.ts`

Each loop now uses a monotonic `head` cursor to preserve FIFO traversal while avoiding repeated array reindexing during dequeue.

## Determinism

- No cache was added.
- Queue insertion order is unchanged.
- Neighbor ordering remains exactly as before.
- Both optimized and legacy `analyzeFactionGraph(...)` paths were updated so the existing 10,000-trial parity tests still compare equivalent traversal mechanics.
- No timestamps, randomness, scenario data, or serialized output fields changed.

## Verification

| Check | Result |
|---|---|
| Red characterization | `npx.cmd vitest run tests\combat_graph_queue_cursor.test.ts --reporter=dot` failed before implementation because the target BFS regions still contained `.shift()`. |
| Focused graph/rear-pocket tests | PASS, 47/47: `tests\combat_graph_queue_cursor.test.ts`, `tests\analyze_faction_graph_dedupe.test.ts`, `tests\sarajevo_core_defense.test.ts`, `tests\paramilitary_sweep.test.ts`. |
| Source grep | PASS: no `.shift()` remains in `src\sim\combat\osid_graph_analysis.ts`, `war_adjacency.ts`, `rear_pocket_consolidation.ts`, or `attack_retreat_displacement.ts`. |
| Typecheck | PASS: `npm.cmd run typecheck`. |
| 40w scenario | PASS: `npm.cmd run sim:scenario:run:40w`; final hash `30abd0696b9d7e24`; run `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n4`. |
| Consistency validation | PASS: `node tools\validate_run_consistency.cjs runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n4` with 0 unresolved assignments, 0 false owners, 0 disconnected sectors, 0 empty contested sectors, 0 missed legal floor donors, and 0 wide undefended front gaps. |
| Baseline regression | PASS: `npm.cmd run test:baselines`; all scenarios match. |
| Diff hygiene | PASS: `git diff --check`. |

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/osid_graph_analysis.ts` | `bfsReachable(...)` and both optimized/legacy pocket-cluster BFS loops now use head cursors. |
| `src/sim/combat/war_adjacency.ts` | `isSettlementSetContiguous(...)` now uses a head cursor. |
| `src/sim/combat/rear_pocket_consolidation.ts` | Rear-pocket same-controller cluster BFS now uses a head cursor. |
| `src/sim/combat/attack_retreat_displacement.ts` | `buildFriendlyComponentsLocal(...)` now uses a head cursor. |
| `tests/combat_graph_queue_cursor.test.ts` | Adds static guards against `.shift()` in these FIFO BFS regions. |
