# OpenCode: prepare causal receipts and focused proof; no campaign

Work only in `C:/Users/User/.codex/worktrees/october-calibration-checkpoint/A-War-Without-Victory`.
Branch `codex/october-calibration-continuation-20261003`, checkpoint `c3354ee3a`.
Codex is reasoning lead and owns diagnosis, acceptance, integration and independent
review. Your task is bounded instrumentation preparation and focused checks.
Resolve routine reversible choices from project evidence.

## Authority and read-first

Read `AGENTS.md`, `docs/20_engineering/AGENT_WORKFLOW.md`, current Sana sections
of `docs/40_reports/CALIBRATION_MASTER.md` and `docs/plans/MASTER_ROADMAP.md`;
then the existing plan/report/review in `logs/prusac-diagnostic-20260929/`:
`sana_ivanjska_joint_validation_plan.md`, `sana_n37_convergence_report.md`,
`continuation_independent_review.md`, `continuation3_reviewed_summary.json`.
For touched simulation/state code, read `docs/10_canon/CANON.md`, relevant
sections of `Engine_Invariants_v0_9_0.md`, `Phase_Specifications_v0_9_0.md`,
`War_Specification_v0_9_0.md`, `Systems_Manual_v0_9_0.md` in that canon directory,
and `docs/20_engineering/DETERMINISM_TEST_MATRIX.md`. Follow scoped AGENTS files.

You may implement minimal observation-only diagnostics and focused regression
proof. You are NOT authorized to change selector/order-lifecycle behavior,
launch predicates, thresholds, forces, timing, operation routes/objectives,
control, paint, denominators, canon authority, saves, or baseline fixtures.
No scenario runner, campaign, prefix, resume, package build, full suite, push,
merge, baseline adoption or calibration acceptance. No historical retiming,
teleportation, direct flip or scripted capture. Preserve ordinary combat.

## Established evidence and unresolved questions

- n37 suite/campaign exit0 but NO-GO. Petrovac t181, Ključ t185; Sanski Most
  town RS at w188. Belt gains t184–187; Jajce3/5; exactly four n25 October
  matches lost. Protected controls and zero critical anomalies hold.
- Barevo `op:jajce:barevo_2` / Lupnica `op:jajce:lupnica`: retained n29 keeps
  HRHB, n30 already loses both. Mistral first execution n25/n29 t178 versus
  n30/n37 t180. n25 HGZ orders Jajce/Lupnica/Barevo t185/186/187; n37 orders
  Bravnice/Vinac/Jajce. Missing predicate: why the launch/advance/roster differs.
- Majdan is `op:mrkonjic_grad:majdan_2`, NOT Sana's Stari Majdan. Already RS
  n29. n25 Southern Move plans183, executes188 with four Majdan orders; n29
  executes188 toward Gerzovo; n30/n37 plan185 and never execute by188.
- 737th is `arbih_737th_muslim_light`, RBiH. First recorded n25/n37 route-state
  difference is completedt138: same Gornja Rovna location, n37 Udurlije intent.
  At181 n25 captures Varošluk; n29/n30/n37 are at Brizina with Udurlije intent.
  Missing predicate: exact non-operation route/order selection and rejection.
- 517th is `arbih_517th_light`. The resumed local context freshly chooses
  Budimlić Japra for Stari Majdan, but whole-state equivalence fails (exit2).
  Original n37 pre-order attribution and dirty executable binding are absent.
  A new known-source trace establishes its own cause, not the original cause.
- HV HGZ/112th have zero default temporal rows, not proof of destruction or
  withdrawal. Current code has withdrawal_turn188; this is source context,
  not a retained runtime receipt. Capture actual lifecycle action when observed.
- Temporal raw `turn = week_index + 1`; weekly_report.week_index is completed
  turn. Preserve both meanings. A filtered window floor is not earliest cause.
- Farz2026-09-29 either-corps owner ruling remains authoritative. Required
  operation-owned combat receipts/control remain; wrong-corps blocker is retired.

## First deliverable: coverage before edits

Use the existing instrumentation before inventing a subsystem. Inspect:

- `src/sim/combat/reason_code_debug.ts` (topic cache and default-absent contract)
- `src/sim/combat/bot_brigade_ai_osid.ts`, `bot_brigade_eval_attack.ts`,
  `bot_brigade_movement_ai.ts`, `bot_brigade_context.ts`
- `src/sim/combat/sector_offensive.ts`, `sector_offensive_launch_helpers.ts`,
  `operation_opportunities.ts`, `bot_corps_operations.ts`
- `src/sim/combat/jna_phantom_brigades.ts`
- `src/scenario/brigade_temporal_emit.ts`, `src/scenario/scenario_runner.ts`
- `tools/diagnostics/hv_1995_lifecycle.ts` and
  `tools/diagnostics/operation_launch_order_consistency.cjs`.

Existing topics include `axis_reject`, `movement_reject`, `opportunity_roster`,
`formation_lifecycle`, `objective_filter`. Formation_lifecycle already opts
expeditionary ghosts into temporal logging. Axis receipts include
launch_readiness_detail, launch_blocker_detail and order_generation_details.
Axis-only receipts may miss the non-operation 737th; check the real call path.
Verify writer→projection→serializer→consumer coverage and cache configuration
before adding code. Record a compact matrix in the EXISTING validation plan:
question, existing receipt/topic, actual gap, smallest correction, focused proof.
If existing facilities cover a question, reuse them and test the path.

## Bounded implementation and proof

Only fill demonstrated receipt gaps. Record values/decisions at the actual
pre-order or lifecycle-action boundary using existing locals. Required receipt
facts as applicable: turn/phase; formation/location/transit; prior order;
operation/axis/current objective; route goal/approach/selected destination;
exact selected/rejected predicate or fallback; launch blocker; roster admission,
reassignment or actual withdrawal action. Distinguish proposed, issued,
accepted/rejected movement, arrival, battle and ordinary capture.

Diagnostics must never recompute core predictors/pathfinding to choose behavior,
mutate live inputs, alter iteration/branches, consume RNG or add clocks. Use
strictCompare and existing deterministic report boundaries. New fields are
absent when disabled, not null/zero. Prefer existing topics/typed optional
receipts; no broad schema redesign. Preserve old-save loading and normal saves.

Start with focused fixtures exercising real production entrypoints. Cover a
non-operation route decision (737th-shaped), current-axis approach decision
(517th-shaped), launch readiness/blocker, roster and ghost lifecycle as needed.
Positive controls must demonstrate each receipt is observable. Use portable
fixtures, not ignored retained run files in tracked tests. Test cache correctly
with existing reset utilities or isolated processes; don't silently toggle a
process-scoped flag mid-run.

Prove paired debug-off/on equivalence from identical known-source inputs:
orders, movement, objectives, combat/control, RNG state and every behavioral
field match. Normalize only an explicit reviewed allowlist of diagnostic
receipts; never discard military/summary differences broadly. Default artifacts
must retain their prior shape; debug-only extra fields/ghost rows are expected.
Verify old-save round-trip compatibility if any serialization path is touched.

Initial cheap check set (reuse passed unaffected checks; add only affected tests):

```powershell
node node_modules/vitest/vitest.mjs run tests/reason_code_debug.test.ts tests/brigade_temporal_emit.test.ts tests/scenario_operation_diagnostics.test.ts tests/operation_execution_staging_truth.test.ts tests/operation_launch_order_consistency_diagnostic.test.ts tests/hv_1995_lifecycle_diagnostic.test.ts --reporter=dot
node node_modules/typescript/bin/tsc --noEmit
git diff --check
```

Record exact commands/new fixture names, pass criteria, expected cost and stop
rule in the plan before execution. Cost: focused tests/typecheck minutes, no
campaign. Stop broad checks after unexpected failure; diagnose all categories,
correct only the established cause, run the smallest affected proof. Don't rerun
an unchanged set or interpret passing tests as calibration acceptance. If a
required broad/campaign gate remains, leave it explicitly pending owner approval.

## Final deliverable: reviewable future campaign proposal, NOT execution

Update the existing plan with one concrete proposed diagnostic campaign:
question, exact command and actually supported flags, initial/save/source
fingerprints, receipt windows/actors, coverage verifier, pass criteria, expected
cost (~5min campaign estimate from the retained prefix; verify prerequisites),
and stop rule. Cheapest startup/schema/selector/fixture checks must precede it.
Bind executable source using a clean candidate commit or complete dirty patch
and untracked executable manifest; hash relevant source/input/lockfiles and
record Node/dependency versions. No secrets or huge dependency-tree scans.
Do not npm-ci/reinstall into shared node_modules junctions.

The proposal must distinguish valid diagnostic coverage from passing calibration.
Stop after one failed expensive run and diagnose before any retry. A new run
cannot prove original n37 attribution. No instrumented campaign is authorized
by this handoff; Codex will seek owner authorization after focused proof/review.

Final calibration remains open until ordinary RBiH captures Petrovac/Ključ/Sanski
by188, Ključ strictly before Sanski, every n25 matching checkpoint OSID and
protected control retained, four belt/five Jajce gains, zero critical anomalies,
required Farz/source/run receipts and independent acceptance review all pass.
No proxy score or diagnostic gate waives any item. Behavior-changing corrections
retain required fresh full-suite/188-week gates; unaffected evidence may be reused.

Keep stdout/stderr/exact exit files with prefix `continuation4_` under the existing
log directory. Guard new evidence paths against overwrite. Retain all prior
runs/logs, and the runs/node_modules junction targets in the older checkout.
Update the existing plan/report with settled results; Codex batches master,
board, roadmap and ledger after independent review. No new status journals or
process commits. Do not commit yourself. Stop when focused proof and the concrete
proposal are ready, or report the consolidated unresolved blocker.

Return concise changed paths, coverage matrix, exact exits/counts/evidence paths,
remaining proof/acceptance gaps and the ready-to-review campaign proposal.
