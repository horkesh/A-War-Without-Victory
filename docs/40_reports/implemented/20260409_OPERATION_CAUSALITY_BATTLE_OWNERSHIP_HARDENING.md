# 2026-04-09 - Operation Causality Battle Ownership Hardening

## Lane summary

- **Lane title:** Operation-local battle ownership for causality and weekly reporting
- **Why this lane:** Fresh baseline `n1407` still reported `invalid_operation_count: 1` even after the execution-capability gate lane. The remaining invalid seam was `cmd_vrs_east_bosnian_t24`: the operation logged one attack and one real battle at `op:brcko:boce_2`, but causality still flagged `attack_orders_without_battles`.
- **Canonical owner after cleanup:** sim-owned battle-to-operation attribution emitted from `src/sim/combat/attack_resolution_osid.ts` and consumed by `src/scenario/combat_causality.ts`
- **Demoted path after cleanup:** survivor-list inference from post-turn `participating_brigades` and late weekly-report re-derivation

## Candidate seams considered

1. Residual invalid-operation seam in `n1407`.
2. Podrinje strandedness / ownerless unreachable brigades.
3. Broader realism/pacing anomalies (`brigade_never_fights`, density imbalance, dead fronts).

## Exact seam chosen

`cmd_vrs_east_bosnian_t24` in `n1407` still tripped `operation_attack_orders_without_battles`, but the failure was no longer in the operation engine.

The false invalidation came from downstream attribution drift:

- the real week-29 battle log included `29:op:brcko:boce_2:rs_2nd_semberija_light_infantry:arbih_253rd_mountain`
- the same weekly operation diagnostic showed:
  - `attack_attempt_count = 1`
  - `current_objective_attack_count = 1`
  - `current_objective_battle_count = 1`
  - `battle_count = 0`
- the operation's surviving `participating_brigades` only listed `rs_3rd_majevica_infantry`

So causality was still inferring battle ownership from the post-trim survivor list instead of preserving the sim-owned battle-to-operation owner at battle resolution time.

## Why this was the highest-value bounded step

This was still pure hardening:

- the runtime evidence was explicit in the latest 40-week proof run
- the owner was already knowable at the source of truth
- no new packet or product doctrine was required
- the fix could be proven with one targeted regression plus the same 40-week scenario line

Podrinje strandedness remained blocked behind a missing lifecycle owner and still sat on the redesign side of the board.

## Files changed

- `src/sim/combat/attack_resolution_osid.ts`
- `src/scenario/combat_causality.ts`
- `src/scenario/scenario_runner.ts`
- `tests/scenario_operation_diagnostics.test.ts`
- `docs/40_reports/implemented/20260409_OPERATION_CAUSALITY_BATTLE_OWNERSHIP_HARDENING.md`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`
- `docs/plans/MASTER_ROADMAP.md`
- `.claude/architect_notes.md`

## Implementation

### Code

`src/sim/combat/attack_resolution_osid.ts` now stamps raw battle records with:

- `operation_id`
- `operation_name`

when the attacking brigade belongs to an execution-phase active operation at battle resolution time.

`src/scenario/combat_causality.ts` now prefers that canonical operation owner when counting:

- per-operation `battle_count`
- per-operation-per-objective `current_objective_battle_count`

It still falls back to the older brigade-based inference when battle records do not carry operation metadata, which keeps sparse tests and older compatibility cases narrow and stable.

`src/scenario/scenario_runner.ts` now preserves the sim-owned battle operation fields into `weekly_report.jsonl` and only falls back to late re-derivation when the source record lacks them.

### Regression coverage

`tests/scenario_operation_diagnostics.test.ts` now locks the exact survivor-trim seam:

- a battle is still owned by the operation when the brigade that actually fought is no longer present in the operation's surviving `participating_brigades`
- the diagnostic must not emit `attack_orders_without_battles` in that case

## Scenario proof

- Baseline: `runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1407`
  - `run_summary.json` reported:
    - `invalid_operation_count: 1`
    - `invalidation_reasons: ["operation_attack_orders_without_battles"]`
    - `valid_for_combat_calibration: false`
  - week 29 diagnostics for `cmd_vrs_east_bosnian_t24` showed:
    - `attack_attempt_count: 1`
    - `battle_count: 0`
    - `current_objective_battle_count: 1`
    - `participating_brigades: ["rs_3rd_majevica_infantry"]`
  - the same week's battle list still contained the real `op:brcko:boce_2` fight by `rs_2nd_semberija_light_infantry`
- Post-fix: `runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1408`
  - final hash stayed `bde31c0aab141f42`
  - `run_summary.json` now reports:
    - `invalid_operation_count: 0`
    - `invalidation_reasons: []`
    - `valid_for_combat_calibration: true`
  - `end_report.md` still includes `cmd_vrs_east_bosnian_t24` as a real failed operation, but no longer claims a false no-battle causality defect
  - `brigade_far_from_home_unassigned` for the Podrinje pair remains unchanged, proving the lane removed a false attribution seam rather than masking the remaining stranded-brigade problem

## Verification

- `npx.cmd vitest run tests/scenario_operation_diagnostics.test.ts -t "trimmed from surviving participants"`
- `npx.cmd vitest run tests/scenario_operation_diagnostics.test.ts -t "attack orders and battles exist"`
- `npx.cmd vitest run tests/scenario_operation_diagnostics.test.ts tests/operation_birth_anomaly_contract.test.ts`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run sim:scenario:run:40w`
- `node tools/validate_run_consistency.cjs runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1408`
- `npm.cmd run recovery:check`
- `npm.cmd run test:vitest`
- `npm.cmd run build`

## Residual risks

- This lane hardens attribution truth only. `cmd_vrs_east_bosnian_t24` still fails militarily; the engine is simply no longer lying about whether the battle happened.
- `brigade_far_from_home_unassigned` remains live for `rs_1st_podrinje` and `rs_5th_podrinje`, and that lifecycle owner gap still sits below the A+++ bar.
