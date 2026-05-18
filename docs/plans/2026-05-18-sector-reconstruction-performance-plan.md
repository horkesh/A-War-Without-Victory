# Sector Reconstruction Performance Plan

**Date:** 2026-05-18
**Owner lane:** sector performance planning and instrumentation
**Status:** Ready for implementation
**Source evidence:** [Batch 6 measured wall-clock follow-up](../40_reports/implemented/20260518_PERFORMANCE_WALL_CLOCK_BATCH6_MEASURED_FOLLOWUP.md)

## Goal

Reduce the measured sector reconstruction/reconciliation wall-clock hotspot without changing simulation behavior, output ordering, save schema, scenario data, or player-visible results.

Batch 6 baseline:

| evidence | value |
|---|---:|
| 40w run | `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1881` |
| final hash | `42607f83870e01d5` |
| total wall-clock | 102962.338ms |
| simulation bucket | 84483.876ms |
| `partition-corps-front-sectors` | 11089.454ms / 40 calls |
| `reconcile-final-sector-truth` | 10972.853ms / 40 calls |
| `reconcile-final-sector-truth-after-ops` | 4223.628ms / 40 calls |

Sector subprofile leaders:

| sub-function | total ms | count | immediate implication |
|---|---:|---:|---|
| `buildFactionSectors:RS` | 3842.799 | 95 | profile inside RS faction build before changing algorithms |
| `buildFactionSectors:RBiH` | 3655.124 | 95 | profile inside RBiH faction build before changing algorithms |
| `recoverDroppedFrontEdges:1` | 1735.119 | 95 | first concrete optimization candidate after deeper attribution |
| `recoverDroppedFrontEdges:2` | 1351.722 | 95 | likely duplicate recovery/search work, but must prove equivalence |
| `buildFactionSectors:HRHB` | 1287.266 | 95 | lower priority unless new data changes ranking |

## Non-Goals

- No speculative cache or algorithm rewrite without before/after profile evidence.
- No changes to `src/sim/combat/corps_front_sectors.ts` behavior unless a separate implementation task proves byte identity.
- No edits to shared integration docs in this lane: `docs/PROJECT_LEDGER.md`, `docs/plans/MASTER_ROADMAP.md`, or `docs/40_reports/audits/20260518_MASTER_BACKLOG_EXECUTION_QUEUE.md`.
- No baseline updates unless an explicitly approved behavior change happens in a different lane.

## Execution Tasks

### Task 1 - Reproduce and lock the measured baseline

1. Run `npm.cmd run sim:scenario:run:40w:timed`.
2. Confirm the final hash remains `42607f83870e01d5`.
3. Preserve `timing.json` path and generated run directory in the implementation report.
4. Run `npm.cmd run perf:wall-clock:report -- --timing <timing.json> --json-out data/derived/_debug/sector_perf_wall_clock_report.json --markdown-out data/derived/_debug/sector_perf_wall_clock_report.md --benchmark-mode full_harness --command "npm.cmd run sim:scenario:run:40w:timed"`.

Gate: stop if the hash differs, if the dominant bucket is no longer simulation, or if sector steps are not in the top hotspot group.

### Task 2 - Refresh hotspot and sector subprofile evidence

1. Run dominant-bucket profile:
   - `npx.cmd tsx tools/perf/profile_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out runs_perf/sector_reconstruction_profile --report data/derived/_debug/sector_reconstruction_profile_40w.json`
2. Run sector partition subprofile:
   - `PERF_PROFILE_SECTOR_PARTITION=true npx.cmd tsx tools/perf/profile_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out runs_perf/sector_reconstruction_partition_profile --report data/derived/_debug/sector_reconstruction_partition_profile_40w.json`
3. Summarize:
   - `npm.cmd run perf:profile-hotspot:report -- --profile data/derived/_debug/sector_reconstruction_profile_40w.json --final-state-hash 42607f83870e01d5 --sector-partition-jsonl data/derived/_debug/sector_partition_perf.jsonl --json-out data/derived/_debug/sector_reconstruction_hotspot_report.json --markdown-out data/derived/_debug/sector_reconstruction_hotspot_report.md --risk-note "partition-corps-front-sectors=Sector reconstruction mutates deterministic derived combat truth; optimize only with byte-identity gates."`

Gate: choose the next implementation task from the highest repeated child cost, not from intuition. If `recoverDroppedFrontEdges:*` falls below the top three child costs, rewrite Task 3 against the new leader.

### Task 3 - Add deeper read-only attribution for `recoverDroppedFrontEdges`

Implementation scope:

- Add opt-in instrumentation only under the existing `PERF_PROFILE_SECTOR_PARTITION=true` path.
- Attribute costs inside `recoverDroppedFrontEdges(...)` at deterministic labels, for example:
  - candidate missing front-edge scan
  - owner/corps claim lookup
  - adjacency/component search
  - sector reconstruction/merge attempt
  - final insertion/prune pass
- Write only to the existing sidecar JSONL path `data/derived/_debug/sector_partition_perf.jsonl`.
- Do not read environment variables inside hot loops; use the existing captured flag pattern.
- Do not introduce `Date.now`, `new Date`, `Math.random`, `performance.now`, `localeCompare`, unsorted object-key iteration, or serialized state fields.

Required tests:

- Extend `tests/sector_partition_instrumentation.test.ts` static scan if the instrumentation block expands.
- Add or extend a focused test proving new JSONL labels are sorted and timestamp-free.
- Run `npx.cmd vitest run tests/sector_partition_instrumentation.test.ts tests/profile_hotspot_report.test.ts --reporter=dot`.

Gate: this task is complete only if flag-off behavior remains byte-identical by construction and the new labels identify one concrete inner loop with at least 20% of combined `recoverDroppedFrontEdges:1+2` time.

### Task 4 - Implement the first bounded optimization

Chosen first candidate: reduce duplicate work in `recoverDroppedFrontEdges:*` only after Task 3 proves the exact repeated inner loop.

Allowed patterns:

- Per-invocation caches scoped inside one `buildCorpsFrontSectors(...)` call.
- Precomputed sorted lookup maps derived from inputs already read by `recoverDroppedFrontEdges(...)`.
- Reuse of adjacency/component facts already built earlier in the same call.

Disallowed patterns:

- Module-level caches.
- Cross-turn caches.
- Caches keyed only by array length or object identity.
- Changes that reorder `sector_id`, `edge_ids`, `territory_osids`, `assigned_brigade_ids`, `reserve_brigade_ids`, `rear_brigade_ids`, or `sub_segments`.
- Skipping final truth passes unless an explicit no-read/no-write proof covers every intervening mutator.

Required tests:

- Focused unit/property test for the changed helper or inner loop.
- `npx.cmd vitest run tests/sector_partition_buildCorpsFrontSectors_integration.test.ts --reporter=dot`
- `npx.cmd vitest run tests/final_sector_truth_reconciliation_cache.test.ts tests/final_sector_truth_reconciliation.test.ts tests/war_phase_step_order.test.ts --reporter=dot`

Gate: stop and revert the optimization if cached and uncached sector snapshots differ on any real-save fixture or deterministic variant.

### Task 5 - Prove 40w byte identity and performance delta

1. Run pre/post comparable 40w timed commands on the same machine.
2. Run `npm.cmd run sim:scenario:run:40w:timed` after the change.
3. Confirm final hash is still `42607f83870e01d5`.
4. Compare key artifacts against the pre-change run:
   - `final_save.json`
   - `run_summary.json`
   - `weekly_report.jsonl`
   - `end_report.md`
5. Run `npm.cmd run test:baselines` for canonical baseline regression.

Required evidence table:

| bucket/step | before ms | after ms | delta | output hash/status | evidence path |
|---|---:|---:|---:|---|---|
| total | tbd | tbd | tbd | `42607f83870e01d5` required | tbd |
| simulation | tbd | tbd | tbd | `42607f83870e01d5` required | tbd |
| `partition-corps-front-sectors` | tbd | tbd | tbd | byte-identical artifacts required | tbd |
| `reconcile-final-sector-truth` | tbd | tbd | tbd | byte-identical artifacts required | tbd |
| `reconcile-final-sector-truth-after-ops` | tbd | tbd | tbd | byte-identical artifacts required | tbd |

Gate: do not claim a win from a single noisy run unless step-level profiles and full-harness timing agree directionally. If wall-clock noise hides the result, report the optimization as inconclusive and keep only if profile-local evidence is strong and byte identity is proven.

## 40w Byte-Identity Requirements

Every implementation batch must preserve:

- final hash `42607f83870e01d5` for `data/scenarios/apr1992_definitive_40w.json`;
- stable ordering of all sector packet lists and sub-segment lists;
- no added fields in deterministic save/state/scenario artifacts;
- no changed hashes in canonical baseline regression unless explicitly authorized outside this lane;
- no change in anomaly/recovery interpretation caused by sector packet ordering.

Minimum verification before merge:

1. Focused sector tests named in the task.
2. `npm.cmd run sim:scenario:run:40w:timed`.
3. `npm.cmd run test:baselines`.
4. For TypeScript changes, `npm.cmd run typecheck`.

## Stop Conditions

Stop and report instead of continuing if any of these occur:

- Baseline hash differs from `42607f83870e01d5`.
- The hotspot moves away from sector reconstruction/reconciliation before implementation starts.
- A proposed optimization needs cross-turn or module-level mutable cache state.
- Any focused sector equivalence test fails.
- Any 40w artifact differs without explicit non-performance design approval.
- The optimization changes sector truth, brigade ownership, operation truth, combat ratings, or final unresolved-sector warnings.
- Instrumentation starts writing wall-clock/profile values into saves, reports consumed by game logic, or scenario truth artifacts.

## Next Implementable Task

Task 3 is the next implementation task: add deeper opt-in attribution inside `recoverDroppedFrontEdges(...)`, then choose the exact bounded optimization from that evidence. The Batch 6 data makes `recoverDroppedFrontEdges:1+2` the first concrete target because it is high-cost, repeated, and narrower than all of `buildFactionSectors:*`.
