# Scalar-zero feasibility supplement

Source-only at `33f99fc5aac9a620a7bb0000cf233d86f270ce24`; no scenario, test, build, replay, or engine advance.

## Verdict

`RunScenarioOptions.baselineOpsScalar: 0` is **not** a complete state-neutral switch. It suppresses the numeric baseline deltas, and it does not disable smart bots or directly change historical operation admission, but the enabled baseline writer still persists zero-valued displacement structure. It is therefore unsuitable by itself for exact same-input/native-state proof.

## Exact behavior

- `runScenario` defaults the option to `1` (`scenario_runner.ts:2397-2410`). Its only production read is after the public turn (`:3222-3242`), where it becomes `Math.max(0, baselineOpsScalar)`. Bot construction is independently controlled by `scenario.use_smart_bots || use_smart_bots` (`:2865-2871`), before the loop. No operation-admission selector reads this option.
- At zero, `applyBaselineOpsExhaustion` adds zero to each valid numeric `profile.exhaustion`; ordinary canonical values remain numerically unchanged.
- At zero, `applyBaselineOpsDisplacement` still creates/updates `settlement_displacement[sid]=0` and stamps `settlement_displacement_started_turn[sid]=turn` for every front-active SID (`baseline_ops_scheduler.ts:74-103`). The runner then calls municipality aggregation, which writes `municipality_displacement[munId]=0` across the municipality map (`displacement_municipality_aggregation.ts:31-67`). These are persisted-field/key changes even though totals remain zero. Weekly reporting also still emits `ops.enabled=true` and a nonzero engagement `level`; the end summary remains enabled.

## Provenance gap

The scalar is absent from `run_meta.json`, `run_id`, and consumed-input provenance. `computeRunId(effectiveScenario)` hashes the scenario definition, while `run_meta` records scenario/weeks/path/provenance but no run options (`scenario_runner.ts:2507-2595`). Weekly `ops` records enabled/level, and the end summary records intensity/average/nonzero booleans, not scalar (`:4015-4036`). Thus a standalone scalar-zero run is not self-identifying.

The existing sensitivity entry does identify scalar externally:

`npm.cmd run sim:scenario:baseline-ops:sensitivity -- --scalars 0 --weeks 52 --scope all_front_active --outDir <fresh-path>`

It writes `run_all_front_active_52w_x0`, per-run metrics with `scalar: 0`, and an aggregate report. It uses `baseline_ops_52w.json`, not the definitive calibration scenario, and its nested `run_meta.json` still omits scalar. The ordinary scenario CLI exposes no scalar argument.

## Remaining independent-input blockers

Even a genuinely state-neutral baseline suppression would establish only one removed harness mutation. Same-input proof still requires exact package/source and initial canonical state, seed, player identity/autonomy timing, Historical policy and ordered decision transcript (including paramilitary authorization), officer-succession choices, event/proposal/recruitment inputs, and the same production mutation/Advance owners. The retained player contract already marks the complete ordered production-consumable input stream/reexecution consumer as missing. No scalar experiment can waive those inputs or alter the unchanged 707 legacy target.
