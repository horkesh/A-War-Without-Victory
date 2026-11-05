# Focused Sana sequence policy test — 2026-10-02

## Question and boundary

Would preserving Operation Sana's 14-objective Sanski axis when a later Ključ objective first becomes reachable through allied HRHB contact keep an actionable ordinary-combat path to Donji Dubovik and the Sanski belt, or merely retain an unreachable first target? The user authorized testing this recommended narrow rule. This is a **focused test-only experiment**, not adoption of a production rule or a new measured calibration candidate.

Established n30 evidence: `sana_boundary_177w_result.md` and four JSON trace receipts in `sana_boundary_177w_once.stdout.log`. At t176 the first 11 objectives have empty approach sets; Hadžići at index 11 has HRHB Prekaja as approach via live bidirectional Prekaja–Hadžići edge. `reconcilePlanningObjectives` cuts 14→3 under default behavior. A single 177-week replay matched n30 byte for byte and restored its temporary catalog edit exactly. The earlier Jasenovac fixture is synthetic; use the measured Prekaja edge for this test.

## OpenCode task

In `tests/sector_offensive_planning_objective_reconciliation.test.ts`, add the smallest focused fixture based on the actual t176 controllers and live edge. Compare the existing default policy with `preserve_objective_sequence: true` (already supported on `CorpsOperation`): exact axis objectives and reconciliation verdict. Also exercise the nearest production execution/readiness or order-emission path that can establish whether the retained first objective Donji Dubovik has a lawful attack/approach; if a full production-path fixture is too broad for this bounded task, report that limitation and inspect the existing gate without inventing a success claim. Include an allied-contact positive check and an enemy/no-contact negative check as needed to distinguish the policy. The test should capture meaningful behavior, not assert only the flag's implementation.

Read `docs/20_engineering/AGENT_WORKFLOW.md`, relevant canon operation/control invariants, and affected code. Do not change production code, catalog data, scenario, painted controls, denominators, timing, rosters, merge/baseline, or the existing diagnostic receipt. Preserve dirty work. Do not start a full suite, prefix, or 188-week campaign. If the test shows that sequence preservation strands the first objective, report the failed hypothesis rather than broadening into a fix. If a production change becomes necessary, stop with an exact proposed small scope and evidence; it is outside this test-only authorization.

## Checks and done condition

Run only `node node_modules/vitest/vitest.mjs run tests/sector_offensive_planning_objective_reconciliation.test.ts`, `node node_modules/typescript/bin/tsc --noEmit` if test typing changed, and `git diff --check`. Capture raw output and exact exits under `logs/prusac-diagnostic-20260929/sana_sequence_policy_test_*`. Expected cost: minutes, no expensive validation. Stop after focused evidence or one targeted correction for a test setup error; no repeated runs for reassurance. Return concise verdict, exact assertion evidence, exits, changed files, and limitation. Keep Farz P-A §6 NO-MERGE and all protected control gates.
