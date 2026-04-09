# 2026-04-09 - Operation Execution-Capability Gate Hardening

## Lane summary

- **Lane title:** Operation execution-capability gate for hopeless ready assaults
- **Why this lane:** Fresh baseline `n1406` still serialized `cmd_vrs_east_bosnian_t29` as a live execution-phase failure even though no participating brigade could produce a legal, above-threshold opening attack against the current objective. The end report still emitted `operation_zero_eligible_execution`, and the operation AAR ended with `0` total attacks.
- **Canonical owner after cleanup:** `src/sim/combat/sector_offensive.ts` planning-to-execution transition
- **Demoted path after cleanup:** positional readiness alone as authority for entering execution

## Candidate seams considered

1. Podrinje strandedness / ownerless unreachable brigades.
2. East Bosnian zero-eligible execution in `cmd_vrs_east_bosnian_t29`.
3. Broader operation-generation realism around late-war VRS objective quality.

## Exact seam chosen

`sector_offensive.ts` was still promoting a named operation from planning into execution once participants had reached the coarse approach positions accepted by `areParticipantsReadyForExecution(...)`.

That was weaker than the truth surface used one phase later by brigade-side attack issuance:

- the brigade AI uses the real adjacent-target predictor
- it enforces the concrete outcome threshold through the same attackability helpers
- it can therefore reject every opening attack even after the operation is considered "ready"

In `n1406`, that mismatch produced `cmd_vrs_east_bosnian_t29`:

- participants: `rs_2nd_semberija_light_infantry`, `rs_3rd_majevica_infantry`
- current objectives: `op:brcko:brka_2`, `op:lopare:nahvioci`
- operation phase reached execution
- direct predictor probes for the live objective still rated the opening attacks as `catastrophic`
- the operation then completed with `0` attacks and triggered `operation_zero_eligible_execution`

## Why this was the highest-value bounded step

This was still pure substrate hardening:

- the wrong owner was clear: planning-to-execution promotion in the operation engine
- the runtime evidence was explicit in the latest 40-week run
- no new packet, UI contract, or product doctrine was needed
- the fix could be proven against the same scenario and against targeted unit coverage

Podrinje strandedness remained blocked by a missing canonical lifecycle owner, which would have crossed into redesign rather than preservation of already-owned truth.

## Canon / invariants alignment

- **Engine invariants / determinism:** execution lifecycle must not serialize fake executable authority.
- **Operation truth doctrine:** operation planning and execution must read the same concrete attackability surface when deciding whether an assault is real.
- **CODE_CANON / downstream truth:** reports and diagnostics should inherit cleaner sim-owned operation truth rather than compensating for false execution phases downstream.

The fix preserves those contracts. It does not add a new operation type or new UI explanation packet. It narrows the planning owner so hopeless assaults recover as `planning_invalidated` before execution truth is claimed.

## Files changed

- `src/sim/combat/sector_offensive.ts`
- `tests/sector_offensive_idle_recovery.test.ts`
- `docs/40_reports/implemented/20260409_OPERATION_EXECUTION_CAPABILITY_GATE_HARDENING.md`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`
- `docs/plans/MASTER_ROADMAP.md`
- `.claude/architect_notes.md`

## Implementation

### Code

`src/sim/combat/sector_offensive.ts` now adds an execution-capability gate before a planning operation is promoted into execution:

- derive the planning attack threshold from the operation
- inspect the live adjacent objective targets through the same concrete predictor surface used by brigade execution
- accept execution only if at least one participant can produce a threshold-satisfying opening attack against the current objective
- otherwise demote the operation directly into recovery as `planning_invalidated`

The implementation also keeps a narrow compatibility fallback:

- if a sparse test state has no `war_front_edges_osid` adjacency at all, the new helper returns `true` rather than pretending predictor certainty
- that preserves the existing lightweight-test contract while keeping live runtime on the stricter graph-valid path

### Regression coverage

`tests/sector_offensive_idle_recovery.test.ts` now proves the exact seam:

- participants can satisfy coarse objective-approach readiness
- the real predictor still rejects every opening attack
- the operation must recover as `planning_invalidated` instead of entering execution

## Verification

### Targeted tests

- `npx.cmd vitest run tests/sector_offensive_idle_recovery.test.ts -t "predictor still rejects every opening attack"`
- `npx.cmd vitest run tests/sector_offensive_idle_recovery.test.ts tests/sector_offensive.test.ts tests/scenario_operation_diagnostics.test.ts tests/operation_birth_anomaly_contract.test.ts`
- `npx.cmd vitest run tests/corps_level_operations.test.ts tests/bot_operation_objective_focus.test.ts`
- `npx.cmd vitest run tests/h_phase_intelligence_warfare.test.ts tests/sector_offensive_idle_recovery.test.ts`

### Scenario / runtime proof

- Baseline scenario: `npm.cmd run sim:scenario:run:40w` -> `n1406`, hash `b9d4706b45e36354`
- Post-fix scenario: `npm.cmd run sim:scenario:run:40w` -> `n1407`, hash `bde31c0aab141f42`
- Consistency: `node tools/validate_run_consistency.cjs runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1407`

### Full verification bar

- `npm.cmd run recovery:check`
- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

All passed.

## Exact scenario / anomaly proof

### Baseline

Run `n1406`:

- `end_report.md` included:
  - `★★☆☆☆ cmd_vrs_east_bosnian_t29 (w29-w40) ... failure`
  - `[operation_zero_eligible_execution] Operation "cmd_vrs_east_bosnian_t29" ... completed with 0 total attacks`
- `operation_aars.json` showed:
  - objectives `op:brcko:brka_2`, `op:lopare:nahvioci`
  - `total_attacks = 0`
  - outcome `failure`
- `weekly_report.jsonl` still showed the operation in execution with `eligible_attacker_count = 0` and `objective_attempt_count = 0`
- direct predictor probes on the saved state rated both live opening attacks into `op:brcko:brka_2` as `catastrophic`

### Post-fix

Run `n1407`:

- `end_report.md` no longer contains `cmd_vrs_east_bosnian_t29`
- the explicit `operation_zero_eligible_execution` anomaly is gone
- `operation_aars.json` no longer contains `cmd_vrs_east_bosnian_t29`
- the engine instead invalidates hopeless launch windows during planning, before execution truth is claimed

### Before / after difference

- Before: a positionally ready but concretely hopeless operation entered execution and polluted the operation-quality surface with a fake live assault
- After: the same seam is caught at the owning lifecycle boundary, so the impossible execution never exists in final scenario truth

This is real hardening, not wording cleanup. The canonical operation owner stopped manufacturing a false execution phase.

## Player-visible truth after cleanup

- Players and diagnostics no longer see `cmd_vrs_east_bosnian_t29` as an execution-phase failure that never attacked
- downstream reports inherit cleaner operation lifecycle truth without any UI-side reconstruction

## Canonical UI surface after cleanup

- unchanged; the canonical downstream surfaces remain operation reports, diagnostics, and scenario summaries fed by sim-owned operation truth

## Residual risks

- This hardens execution-capability truth, not the broader realism of late-war East Bosnian objective choice
- `n1407` still reports `invalid_operation_count: 1`, so operation substrate hardening is improved but not fully complete
- Podrinje strandedness remains a blocked lifecycle-owner seam and should not be "fixed" opportunistically through this lane

## Exact report path

- `docs/40_reports/implemented/20260409_OPERATION_EXECUTION_CAPABILITY_GATE_HARDENING.md`
