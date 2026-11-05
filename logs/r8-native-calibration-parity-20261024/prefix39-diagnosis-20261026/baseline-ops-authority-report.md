# Baseline-ops native-authority audit

Read-only source/canon/provenance audit at `33f99fc5aac9a620a7bb0000cf233d86f270ce24`. No simulation, replay, build, test, or engine advance.

## Supported facts

- `baseline_ops_scheduler.ts:1-5` defines this as “scenario-only, run-only.” Its two writers and the runner option are explicitly “harness-only” (`baseline_ops_scheduler.ts:35-49,70-72`; `scenario_runner.ts:402-405`). The 2026-08-06 decision deliberately retained `profile.exhaustion` as the “designed harness signal,” distinct from production `accumulateExhaustion` (`PROJECT_LEDGER_ARCHIVE_2026Q3.md:2882-2892`).
- `ScenarioDefinition.use_harness_bots` says the harness injects `baseline_ops` weekly and is off by default (`scenario_types.ts:115-116`). The definitive scenario has `turns: []` and `use_harness_bots: true`; therefore these are synthesized actions, not authored weekly operations with historical provenance. Explicit `baseline_ops_*` fixtures and April-1993/94/95 scenario actions show the separate opt-in research surface.
- Production already owns real pressure-work accumulation inside `runTurn`: War calls `accumulateExhaustion` (`war_phases.ts:4138-4145`), derived from active-front pressure/supply and written per faction (`state/exhaustion.ts:87-164`). Desktop calls public `runTurn` and has no scheduler call. Canon requires exhaustion from actual drivers but does not authorize a uniform weekly baseline add (`Engine_Invariants_v0_9_0.md:158-166`).
- Tests establish scenario determinism, monotonic sensitivity, and artifact emission (`scenario_harness_contracts.test.ts:539-592`; `h1_11_baseline_ops_sensitivity.test.ts`); none asserts production/native equivalence.
- Retained current T1 proves the boundary exactly: public `runTurn` A has all three profiles `0`; post-runner B has all three `0.002`. Current scenario T39 has all three `0.0601316666666667`; packaged Historical native T39 has all three `0`. The T39 runs are different source commits, so the numeric comparison is corroboration, while the same-current-head A→B trace proves writer ownership.

## Governing contract and verdict

The player acceptance contract requires identical production path plus consumed inputs for a same-input claim (`2026-07-31-full-campaign-electron-validation-plan.md:76-86`). `baseline_ops` is intentional legacy harness scaffolding, not an authored operation that native is required to copy. It does not violate its own scenario-harness contract. It **does** make a baseline-ops-enabled headless state ineligible for a same-input production/native comparison unless that extra mutation is explicitly treated as a differing input. Copying the uniform writer into native is unsupported by canon and duplicates the real production owner.

## Smallest correction boundary / decision

For a production-parity calibration lane, decouple weekly baseline injection from `use_harness_bots` at the loader/runner caller boundary: retain explicit `baseline_ops` actions for research fixtures, but do not synthesize them merely to run bots. This would change the accepted headless benchmark, so calibration authority must choose between (a) preserving the legacy scaffolded no-player benchmark as a separate lane and (b) establishing a production-parity benchmark without it. No evidence supports silently changing native.

Evidence hashes: prior audit `6dd296bb23039cc09290288ef6bf9f0c126c16ff208aa1d88bc14f27a437ec3`; current T1 A `979d76ae8af1f23b8c381325e4be5aa3e6c8ed02f632c797d224237f536403df`, B `c3884c4abc43da2d3fe0d704450e7c779ddf1c675683e92a4852d10325841fd4`; scenario T39 `54145050851f1fc0293f3cddb0d4cfa8576cf99fd901a498869ca68aee5c91b9`; native T39 `5b3b9318b03daca7f7e4fcd0e30a7ef52002446725643c24fcf2e7166f3590b1`.
