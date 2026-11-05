# Continuation 6 front-distribution writer diagnostics implementation

Base: `09dcd816e44566961e224bf010c8d7bfaad83edb`

## Result

Implemented an opt-in `front_distribution` topic using the existing `AWWV_DEBUG_MOVEMENT_FORMATIONS` selector. Both production calls emit ordered invocation receipts (`distribute-brigades-to-front`, then `final-distribute-brigades-to-front`) and selected-actor no-write coverage. Successful writes identify the real helper, direct-location versus column-order action, detached pre-write actor/order/state/roster/operation context, gameplay-ordered candidate and target lists, selected target, distance, score, and already-computed feature inputs.

Seven helper action records exist. The six column-capable writer families exercised empirically through real distributor calls with synthetic inputs are `main_phase_b`, `rear_stack_dispersion`, `threatened_reserve_commit`, `empty_front_subsegment_fill`, `shared_front_stack_deconflict`, and `must_hold_garrison_pin`. `main_phase_a` direct-location writes are also observable but are not counted as column-order coverage. Both production phase callers were exercised for invocation/report ordering. Source inspection establishes where each hook sits immediately before its existing mutation; no retained historical run yet measures these new receipts. Production callers preserve the effective default for `enableStandingOgReserveCommit` and pass completed turn and invocation ordinal. Weekly projection and the strict CLI reader are wired. OFF leaves the report key absent and does not create a recorder or selector snapshots; ON preserved complete state and the ordinary report in the real-caller fixture.

Receipts state `causal_proof: false`. `boundary: pre_write` and `selection_inputs_boundary: post_selection_pre_write` distinguish the observed write boundary from an unobserved pre-selection boundary. A selected actor's no-write invocation is coverage, not a refusal reason. These fixtures characterize reachable mechanisms and do not attribute the historical n41 or original n37 cause.

## Verification

- Required RED: exit `1`, 1 file / 1 test failed because enabled distribution returned no diagnostic. Evidence: `continuation6_front_writer_20261004_red.command.txt`, `.log`, `.exit.txt`.
- First focused GREEN: exit `0`, 1 file / 5 tests passed. Evidence: `continuation6_front_writer_20261004_green.*`.
- First affected selection: exit `1`, 29 distributor tests failed from one compatibility category: default-off evaluation accessed `state.meta.turn` before the topic gate in legacy minimal fixtures. Evidence: `continuation6_front_writer_20261004_affected.*`.
- Cheap correction: the completed-turn fallback now executes only after `front_distribution` is enabled. Corrected affected selection: exit `0`, 4 files / 61 tests passed. Evidence: `continuation6_front_writer_20261004_affected_correction.*`.
- Two unlogged focused diagnosis runs also failed before the final fixture: one asserted target IDs in `candidate_ids`; one selected the rear-stack anchor instead of the intended moving actor. Both were fixture expectation/setup errors, with no gameplay change.
- Reader-hardening RED: exit `1`, 1 of 5 tests failed because a numeric movement-state status inside a typed snapshot was accepted. Evidence: `continuation6_front_writer_20261004_reader_hardening_red.*`.
- Reader-hardening GREEN: exit `0`, 1 file / 5 tests passed. New negative controls reject malformed typed snapshot status, primitive candidate elements, and a primitive weekly row without crashing. Evidence: `continuation6_front_writer_20261004_reader_hardening_green.*`.
- Final reader/schema and real-caller/report selection after all changes: exit `0`, 4 files / 61 tests passed. Evidence: `continuation6_front_writer_20261004_final4_green.*`.
- Final reader syntax after the last reader edit: exit `0`. Evidence: `continuation6_front_writer_20261004_reader_hardening_syntax.*`.
- `git diff --check`: exit `0`. No manual TypeScript check, campaign, replay, full suite, commit, or staging was run.

The reader positive control accepts the real weekly projection only with explicit `actor:21`. Negative controls reject a missing expectation (exit 2), numeric receipt actor, malformed typed snapshot, primitive candidate item, and primitive weekly row (exit 1). It validates weekly index, topic/envelope, selector manifest, typed actor/order/state/roster/operation snapshots, typed feature inputs, actor/type boundaries, invocation uniqueness and complete requested-actor coverage for each emitted call, write identity linkage/count/helper order/ordinal continuity, callsites, integer turns/ordinals, helpers, action kind, boundary labels, target/candidate element types, and absence of fabricated causal proof.

## Final SHA-256

- `e9059b458d582722a0c2f301fd562b98367d49bae917e83713bf70bcc0d7a61a` `src/sim/combat/front_distribution_diagnostic.ts`
- `92c4bfb02a8c8aedfdf78901b73dea7152fe66df4d5cc16e62c0649c50dee1e6` `src/sim/combat/brigade_front_distribution.ts`
- `cac140facd432e206a079093514702237f7690088b92eac10a556de9e6ba62d8` `src/sim/combat/movement_phase_diagnostic.ts`
- `cbf8e09da6754f18d6f5aa1497eb3bbd45905debb960bf69e1a699c8c08c18a2` `src/sim/combat/reason_code_debug.ts`
- `5ae935c3db6bc80e0b1f878a1871067fb6ffdcb239dcf317574433acfb8f2709` `src/sim/turn_phases/war_phases.ts`
- `c09184e75d1be6917beb3daf7167132bc52c52c4acd5e7c4df1a13204dfe31c2` `src/sim/turn_phases/war_phase_reconciliation_steps.ts`
- `dbf02b2ce77484d6b872122e9415c84b8d33171559f785320eacb9b048073694` `src/sim/turn_pipeline_types.ts`
- `df0c17f6473f80ad2867106749d07ceda18fef1a53a68097586d3231e4f521c2` `src/scenario/scenario_reporting.ts`
- `dad9f156b7db3a641871753714c950971407fb530d34cf128c4184ab0d2b6365` `src/scenario/scenario_runner.ts`
- `b287f7ffa94ba116a93e96f6c53bc66684bffc09947d39832dbc4054b20e3890` `tools/diagnostics/front_distribution_writer_coverage.cjs`
- `61fa1efe43e07c1ec253ce2750695a9cd20b33384af9d8d340a108c08fb05314` `tests/front_distribution_writer_diagnostic.test.ts`
