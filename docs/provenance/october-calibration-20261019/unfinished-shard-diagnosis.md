# Unfinished shard diagnosis — retained evidence, 2026-10-20

The strongest measured contributor is stale/incomplete duration weighting and uneven shard workload. This plausibly explains the timeout; the exact historical cause, in-flight file, resource state and presence or absence of a hang remain unmeasured. The initial728wording of an established sufficient cause is qualified by independent729review; summed reported-file durations cannot be compared with another worker's wall margin as a strict bound.

718completed shards0/2/3 at338/338,342/342 including2skipfiles,and344/344. Shard1 has325/342completion paths and17without completion records; serial74neverstarted because all parallel workers must finish first. The parser's membership coverage is positively checked against all three completed groups; the intentional nested529ms failure control belongs to a passing13/13parent. Completed native scope remains10152passedtests+30skipped,zeroobservedgenuinefailures. Fullsuite remains TIMEOUT/INCOMPLETE,notgreen.

Shard1's unique reported file work was931969ms versus shard2's647242ms. Allowing the observed range of the unassigned shared property executions yields268089–301365ms more known file work onshard1. The last completed worker had223820ms margin before the35minute cap. Collection/transform/environment/preparation/other overhead differs and is unmeasured forshard1, so this comparison supports plausibility only.

Six recurring slow shard1files were underweighted by615382ms in aggregate: phase_d_causality_runtime_integration, audio_ambient_generation, integration_state_assertions, integration_run_diagnostics, integration_anomaly andscenario_continue_from_save_equivalence. Five used the unmeasured1000ms default. The shared property file completed four indexed executions at836608–853246ms,about40%ofthecapperworker; exact values are not bound to worker IDs and identical case ownership is not assumed.

All17missingcompletion paths arejsdom tests, but completion-only globally interleaved stdout does not identify starts or the in-flight file. The initial Vitest ordering cache/configs and resource/handle telemetry were not retained. No hang or no-hang claim follows from a static token scan or a missing completion line.

## Offline model, not a test run

The185ms pure-data replay exited0/0. Baseline estimated unique loads464736/465581/464605/465528ms appeared balanced (976msspread); counterfactual completion-derived weights yield610673mseach (0spread) with999filesreassigned. All1362unique parallel files remain exactly once, existing property file once per four indexed workers,and74serial files unchanged:1440planned executions. Repeated model assignments are deterministic.

Unknown17file weights and observed overhead are sensitivity inputs, not future bounds. The model does not predict wall completion, promise35minutes, exclude a stall or change the real planner. No test, fullsuite, campaign, build, simulation, timeout, shard count, test selection, threshold, floor or source/config change was executed/applied.

## Recommended next scope

Prioritize future reliability: refresh measured duration estimates and add per-file start/finish receipts, then verify the harness with focused checks. This is a recommendation, not an implemented fix. Exact historical cause would instead require a separately authorized replay of unchanged718shard1membership with start/finish telemetry. Do not run both by default. No new fullsuite or campaign is approved.

Raw evidence stays LOCAL by explicit owner choice2026-10-20, with the already-pushed inventory; remote raw-byte backup is not provided. That choice closes only the storage-pending blocker. Source/docs checkpoints a9c92d820/83b56ced8 remain pushed; retainedn80 stays703/712,NO-GO/unadopted. Fresh730protection hashes match all31native n80files,source,threshold,paintedreference andC/D. Every other historical unmet gate remains open.

Local immutable evidence: logs/claude-channel-20261004/728-retained-diagnosis-a,728-offline-rebalance-a,729-independent-review.json,729-offline-verification.json,730-protection-a. The original728causaloverstatement is preserved in its closed local record rather than silently rewritten; use this qualified synthesis with729review.