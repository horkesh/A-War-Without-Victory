# [078] Retained control-contract failure — difference result (Claude f75b0a11, read-only)

Verdict: the 130 failing ordinary rows are fully explained by ONE env-gated diagnostic key, `operation_diagnostics[*].axis_decision_diagnostics`, present only in the clean n39 baseline. It is gated by the reason-code topic `axis_reject`, which n39's recorded launch env enabled and n42's did not. No behavior, phase, objective, participant, count or ordering difference was found in turns 1–139. A usable, narrowly specified contract exists for turns 1–139; it is not evidence about turns 140–181 or whole-state neutrality.

Nothing run, applied or edited. Codex's `078-control-prefix-*` and staged-docs files untouched. Exclusive receipts (each: command file, raw output, numeric exit):
- `078-difference-extract.*` — v1 exit **1** (TypeError: `JSON.stringify(undefined).slice` on a field absent from one op); preserved. `078-difference-extract-v2.*` exit 0 (v2 only wraps two example-string expressions in `String(...)`). Output `078-difference-extract-v2-out.json`; view `078-difference-view.txt` (exit not recorded, formatter only).
- `078-difference-temporal.*` exit 0, `078-difference-hvtg.*` exit 0, `078-difference-raw.*` exit 0.

## 1. All 130 operation-diagnostic differences (n42 vs clean n39, turns 1–139; same normalizer `c3cb5e54…` as Codex's check)
Weekly rows: 139 vs 139, `week_index` 1..139. Differing normalized rows: **130**, all in `operation_diagnostics` only (no other normalized key differs). Operations compared by identity `corps_id|operation_name|operation_type`:
| Category | Count |
|---|---|
| operations per run (summed over turns) | 831 vs 831 |
| turns with added ops in n42 / missing ops in n42 | 0 / 0 |
| turns with differing op count | 0 |
| turns with ordering difference among common ops | 0 |
| duplicate op identities within a turn | 0 |
| matched ops with any field difference | **484** (130 turns) |
| – phase / recovery_reason | 0 |
| – objectives (`current_objective(s)`) | 0 |
| – participants / eligible attackers / participant attack orders | 0 |
| – attack, battle, movement, skipped-order, capture, idle counts | 0 |
| – invalidation fields | 0 |
| – other (the only one) | 484, field **`axis_decision_diagnostics`** |
Key-set change: `only_n39:axis_decision_diagnostics` on all 484 ops; n42 has no key (value `undefined`, not null/empty). Volume: 830,677 bytes of n39 content across those 484 ops. The 9 non-differing turns are turns with no op carrying axis detail. First example (turn 1, `jna_herzegovina_command|Operation Herzegovina|sector_attack`): n39 carries `[{axis_id:'konjic_south', launch_readiness_detail:{…brigades:[{id:'jna_konjic_south_tg', power_ratio:5.07…}]}}]`.
After deleting only that key from the n39 side (484 ops) the normalized rows differ in **0** of 139 rows (`078-difference-raw-out.json`).

## 2. Source path and delta (bound)
- Writers: `sector_offensive_launch_helpers.ts:1194-1218` sets `axis.launch_readiness_detail` only when `isReasonCodeTopicEnabled('axis_reject')` allocates `rejectionFacts`; `bot_brigade_eval_attack.ts:77` returns unless `axis_reject` is enabled before writing `order_generation_details`. Reporter: `combat_causality.ts:266-271, 418-420` copies both onto the diagnostic only when present. Gate: env `AWWV_DEBUG_REASON_CODES` parsed by `reason_code_debug.ts` (cached per process).
- Recorded envs: n39 launch record `continuation4_instrumented_188w.started.json`: commit `7b9c242a3…`, `git_dirty false`, `debug_reason_codes: axis_reject,opportunity_roster,formation_lifecycle,movement_reject,route_decision`. n42 runner command: `AWWV_DEBUG_REASON_CODES=front_distribution,movement_reject` (+ `AWWV_DEBUG_MOVEMENT_FORMATIONS`). So `axis_reject` was ON in n39 and OFF in n42. The n39 record is a launch-time field, not a process-env receipt; it is corroborated by the n39 outputs themselves (axis_decision_diagnostics present, below).
- Source delta `7b9c242a3` → n42's `2a1554a50` (8 commits, 12 src files, +732/−42): `combat_causality.ts` (+dispatcher snapshot fields only; axis emission lines unchanged), `scenario_reporting.ts`, `scenario_runner.ts`, `bot_brigade_ai_osid.ts`, `brigade_front_distribution.ts`, `front_distribution_diagnostic.ts` (new), `movement_phase_diagnostic.ts` (new), `reason_code_debug.ts` (+3 topics), `war_phase_reconciliation_steps.ts`, `war_phases.ts`, `turn_pipeline.ts`, `turn_pipeline_types.ts`. **Unchanged** across that delta: `sector_offensive_launch_helpers.ts`, `bot_brigade_eval_attack.ts`, `brigade_temporal_emit.ts` (empty diff stat). So the axis-detail difference is explained by the env gate, not by a source change to those writers. The delta files change behavior-adjacent code (`bot_brigade_ai_osid.ts` +280, `brigade_front_distribution.ts` +68); their gating is not re-audited here (Codex's 040–042 reviews cover it); measured 139-turn behavior is equal (below).

## 3. Other retained categories (turns 1–139 / weeks 0–138)
- Raw top-level keys: n42-only `front_distribution_diagnostics` (139 rows; new topic on in n42); n39-only `bot_order_diagnostics` (58 rows, with `route_decision_details`; `route_decision` topic on in n39). Both are removed by the reviewed normalizer. `column_movement` carries the same 5 keys in all 139 rows of both (incl. `column_rejections`).
- `control_counts`: 0 differing rows of 139 (Codex's check; recomputed 0). Weekly rows beyond the above (events_fired, battles, corps_summary, etc.) are equal after normalization.
- Temporal (brigade_temporal_log, week_index ≤ 138): 32,991 (n42) vs 33,063 (n39) keyed rows; **0** shared keys differ; only-n42 0; only-n39 **72** = 4 `hv_phantom` ids (`hv_113th_brigade_tg`, `hv_116th_brigade_tg`, `hv_1st_guards_tg`, `hv_4th_guards_tg`, HRHB, `hvo_southeast_herzegovina`) × weeks 0–17. They are emitted only when `kind==='hv_phantom'` and topic `formation_lifecycle` is on (`brigade_temporal_emit.ts:182`; emitter unchanged across the delta). Present in n39 only; absent from n40/n41/n42 and dirty n25–n38 (`078-difference-hvtg-out.json`), whose envs lacked that topic (n39's recorded env has it).

## 4. Measured vs inferred
Measured: the 130-row failure is exactly the single key above; all other weekly fields, op identities/order/counts, control_counts and shared temporal rows are equal; the n39-only temporal rows are the 4 hv_phantom ids for weeks 0–17. Inferred (source + recorded env): the cause of both is the debug-topic mismatch (`axis_reject`, `formation_lifecycle`, `route_decision` ON in n39 only; `front_distribution` ON in n42 only). Not measured: whether `opportunity_roster` (on in n39) produces any retained field; whole-controller maps and ordered control events of n42 vs **n39** (Codex's n42 control audit was against n40); anything after turn 139; behavior of the new source with n39's five topics ON.

## 5. Contract options (changed values stay visible)
A (preferred, no comparator change): run the 181-week measurement with n39's recorded topics, i.e. `AWWV_DEBUG_REASON_CODES=axis_reject,opportunity_roster,formation_lifecycle,movement_reject,route_decision` plus `AWWV_MISTRAL_PREP_TRACE=1`. This replaces the 077 statement "no other AWWV_* variable". Expected: operation_diagnostics and temporal rows compare directly with n39 (no migration); the new topics (`front_distribution`, `dispatcher_decision`, `movement_phase`) stay OFF. Any remaining divergence is then a real finding.
B (fallback only): narrow documented migration for a run WITHOUT `axis_reject`/`formation_lifecycle`: map `operation_diagnostics[*].axis_decision_diagnostics` as "baseline-only env-gated key" and the 4 `hv_phantom` temporal ids (weeks 0–17) as "baseline-only gated rows"; the comparator must report the dropped counts (here 484 ops/830,677 bytes and 72 rows) and keep the dropped baseline content on disk. Proof retained: stripping that key alone gives 0/139 differing rows; excluding the 72 rows gives 0 temporal differences. Do not remove all `operation_diagnostics`, and do not broaden the normalizer.

## 6. Residual and smallest next scope
Residual: this explains the failed prefix contract; it does not validate A (n39's five topics under the new source) or any behavior after turn 139. Smallest next check, no run needed: confirm from `reason_code_debug.ts` `parseTopics` that the five-topic string parses identically in the new source and that none of the three new-source topics default on; optionally read where `opportunity_roster` writes (to know whether it adds a field). Anything beyond that is the already-proposed 181-week measurement under A, which still needs owner authorization.
