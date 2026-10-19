# 729 independent review — retained shard diagnosis

**Verdict:** `SCOPED_DIAGNOSIS_REQUIRES_CAUSAL_QUALIFICATION`.

728 correctly establishes a large planning error and a strongly skewed shard, but its `BOUNDED_CAUSE_ESTABLISHED` wording is stronger than the retained evidence supports. The correct closeout is: **stale/incomplete duration weights and the resulting shard skew are the strongest measured contributor and plausibly explain the timeout without a hang; the exact timeout cause remains unmeasured.**

## Material finding

The arithmetic is correct. Shard 1 accumulated 931,969 ms of unique reported file duration and shard 2 accumulated 647,242 ms. Allowing the full 836,608–853,246 ms range for the shared property suite yields a 268,089–301,365 ms shard-1 excess. Shard 2 completed in 1,876,180 ms, 223,820 ms under the 2,100,000 ms cap. The six largest shard-1 planner underweights total 615,382 ms, and five used the planner's 1,000 ms default.

That comparison is not a strict wall-time bound. `fileParallelism=false` and `maxWorkers=1` serialize files within a worker (`tools/test/run_vitest_balanced.mjs:109-112`), but Vitest's reported file durations chiefly compose its `tests` category. Completed shard 2 reports 1,497,590 ms of tests within 1,876,180 ms wall time (`396-varosluk-718-fullsuite.stdout.log:1704-1707`); transform, collection, environment, prepare, and uncategorized overhead account for the rest. Shard 1 has no terminal summary, so its corresponding overhead is unknown. Cache and machine-resource effects are also unmeasured. The reported-duration excess therefore makes ordinary skew a compelling explanation, but does not prove it caused the timeout.

## Verified scope

- Shards 0, 2, and 3 completed 338/338, 342/342 (including two skipped files), and 344/344. Together they report 10,152 passed and 30 skipped tests. The deliberate 529 ms nested failure belongs to a passing 13/13 harness and is correctly excluded from genuine failures.
- Shard 1 has 325 completion paths for 342 planned files. The 17 absent paths are completion gaps, not start or in-flight receipts. All are jsdom sources; one uses fake timers, while the token scan found no named child-process/server/listener primitive. Those source facts prove neither a hang nor absence of a hang.
- The serial 74-file lane was unreachable because the runner waits for all parallel workers before starting it (`tools/test/run_vitest_balanced.mjs:207-221`).
- The shared property suite completed four shard-indexed executions at 836,608–853,246 ms, about 40% of the cap. The retained evidence does not prove identical case-data ownership across those copies.
- The planner's 1,000 ms default and greedy balancing are confirmed at `tools/test/test_suite_inventory.mjs:35-65`. Retained 602/710 output confirms recurring slow named files, but does not convert the inference into a strict cause.
- 728 records the required protected emit, threshold, and C/D telemetry hashes as passing. It references unchanged 703/712 artifacts and the 31-entry 720 native inventory; it did **not** freshly hash all 31 native files itself.

## Next bounded action

Correct the causal wording in the root synthesis. No new run is needed for that correction. If further work is authorized, the cheapest first step is an offline candidate rebalance using retained 718 durations, conservative assumptions for the 17 unknown files, and explicit overhead sensitivity. That can show whether the known planner error is actionable, but cannot identify the terminal file.

If the owner requires exact cause, the smallest execution remains one preserved replay of the exact 718 shard-1 membership with per-file start/finish timestamps and unchanged worker semantics, stopping at a bounded per-file budget breach or the shard terminal summary. It would be diagnostic only and would not satisfy the default full-suite gate.

Overall status remains **NO-GO**. No threshold, timeout, shard count, test selection, floor, historical gate, campaign gate, or acceptance criterion changes are justified. No tests, suite, campaign, build, engine, source, test, harness, config, documentation, or Git operation was performed.
