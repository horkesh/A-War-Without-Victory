# Sana n37 convergence correction — STOP report

## Verdict

**STOP — no production correction; calibration remains NO-GO.** The original
probe reproduced the 517th destination but did not prove it was stale. The clean
continuation below supports lawful current-objective routing in a resumed trace;
it does not establish the unique original n37 pre-order cause.

## Reproduction

Fixture: `tests/sana_n37_convergence_fixture.test.ts` (local diagnostic only; it requires the ignored n37 run artifact and is not part of the tracked test suite).

Real inputs:

- `runs/apr1992_definitive_188w__6deb5845c150c196__w188_n37/final_save.json`
- `data/derived/operational/operational_contact_graph.json`

Observed from the retained t188 state and after one production-shaped `generateAllBotOrdersOsid` call:

- Sana axis current objective: `op:sanski_most:stari_majdan`
- 517th location: `op:sanski_most:lusci_palanka_2`
- retained 517th order: column movement to `op:sanski_most:budimlic_japra_2`
- regenerated 517th attack order: none
- regenerated 517th movement order: still column movement to `op:sanski_most:budimlic_japra_2`
- political control and formation location were not mutated by the fixture

This confirms the reproduced destination and the absence of a 517th Stari-Majdan attack receipt. It does **not** establish previous-objective drift, prove the unique t187 selector predicate or establish that a forced retarget would be lawful production behavior.

## Checks

| Check | Exit | Evidence |
|---|---:|---|
| Focused real-save Vitest fixture | 0 (1 passed, 0 failed) | `sana_n37_convergence_focused.stdout.log`, `.stderr.log`, `.exit.txt` |
| TypeScript `--noEmit` | 0 | `sana_n37_convergence_typecheck.stdout.log`, `.stderr.log`, `.exit.txt` |
| `git diff --check` | 0 | `sana_n37_convergence_diffcheck.stdout.log`, `.stderr.log`, `.exit.txt` |

No prefix, full suite, campaign, battle-power change, control edit, retiming, teleportation, or forced capture was run.

## Remaining blocker

The missing evidence is the serialized t187 pre-order state (including the exact movement state/order lifecycle and selector decision receipt). Do not adopt a production retarget/clear-order rule until that boundary is retained or independently traced with the same real inputs.

## Clean continuation diagnosis — 2026-10-03

Base: `codex/october-calibration-continuation-20261003` at `24452b5fa`.
OpenCode's explicit Sol route failed with exit **126**, `provider.no-route`;
a fresh Sol worker performed the bounded diagnosis. No production/test/canon,
paint, initial-control, denominator, baseline or save-schema change was made.

Two cloned single-turn resumes were the entire replay allowance. `exact-t187`
exited **0**, matching all seven declared n37 counterparts: turn, 506th/517th
movement snapshots, current objective, Sana battle, controller totals and column
totals. The 506th captured Skučani Vakuf while the 517th remained in transit
Donji Dubovik → Lušci Palanka. This is selected-receipt agreement; the original
complete n37 t187 state is not retained for a whole-state comparison.

`trace-t188` exited **2**. Its pre-order receipt records 517th at Lušci Palanka,
Stari Majdan RS-held, `tactically_adjacent=false`, `decision=march_to_approach`,
and freshly issued Budimlić Japra. Post-turn approach reconstruction gives the
direct friendly set `{Budimlić Japra, Skučani Vakuf}`; deterministic nearest
friendly BFS selects Budimlić Japra with no sector/staging fallback. Local Sana
movement, objective, battle and controller totals match n37, including the
506th's Stari Majdan stalemate. **Measured in the resumed trace:** this is a
fresh selection for the current objective. **Supported explanation, not exact
original-run attribution:** the destination need not be leftover intent.

Orders precede attack resolution/objective advancement, and column transit skips
regeneration (`war_phases.ts:1547,2650,2958,3075`; `bot_brigade_ai_osid.ts:583`;
`bot_brigade_eval_attack.ts:468-506`). The older n38 post-turn probe's written
Lušci-Palanka conclusion contradicts its generated Budimlić output and must not
be treated as a decision receipt.

The t188 equivalence gate failed: column blocked/starts were **12/5** versus
n37 **11/6** (advances/arrivals both **1/6**), and diagnostic-free state hashes
differ. All **1,147** differing leaves were classified: military 1,093, turn
summaries 54, including commander, formation, movement/arc/battle, front-sector,
casualty, pool, negotiation and reserve categories. Two endpoint movement
discrepancies concern the 1st Cerska and 105th Modriča formations, reconstituted
only in the resumed trace. Missing movement-rejection receipts prevent assigning
the aggregate blocked/start difference to one actor. No retry followed.

Retained n37/n38 consumed-input digest and initial-save hash agree. Original
source is recorded as dirty `df3cc`, without its dirty source patch hash; the
current checkpoint differs from that clean commit in 23 simulation/scenario
files. Second-resume behavior, deeper unretained t187 state, source continuity
and diagnostic-flag neutrality remain unresolved explanations for drift.
Static receipt-field inspection is not runtime proof of neutrality. Matching
local results cannot waive whole-state failure. Original pre-order attribution
remains open; no selector/lifecycle correction is justified.

## Separate western failures and acceptance

Fresh n25/n37 comparison confirms **707/707/706/681 → 707/707/706/684**,
denominator 712. No earlier matching OSID is lost; October loses exactly Barevo,
Lupnica, Majdan and Varošluk. Petrovac t181 and Ključ t185 have Operation Sana
combat lineage; Sanski town stays RS. Four Sanski belt gains hold at t184–187.
Protected controls agree with their checkpoint timeline, including Lug/Paroš
RBiH in January then HRHB; anomalies are 27 total, zero critical.

- **Jajce:** Mistral 2 launches t180 versus n25 t178, producing Bravnice, Vinac
  and Jajce town at t185–187. By t188 its HGZ/112th participants are no longer
  in the roster; the Jajce axis has the 2nd Guard Mechanized at Lupnica.
  Barevo/Lupnica remain RS. The upstream late-launch cause is unresolved;
  participant count alone does not establish it.
- **Majdan:** n37 Southern Move starts planning t185 and remains planning t188,
  preparation `intel_gathering`, elapsed **3/5**. Initial intelligence assessment
  is unreported. The older five-turn/zero-intel/t188-execution narrative is not
  an n37 receipt.
- **Varošluk:** the 737th route loss already occurs in retained n29/n30; it
  remains a separate inherited failure, not a Sana correction criterion.

The authoritative retained n37 checkpoint verifier exits **0**. Actual Farz
operation-owned combat receipts are t162 Vozuća, t164 Donja Bočinja, t163 Gornja
Bočinja and t167 Spreča/north Ozren, all RBiH at w188. No 2nd Corps participant
is recorded; under the 2026-09-29 ruling that is a fidelity diagnostic. Sana
belt captures are not Farz receipts; the old wrong-corps blocker is superseded.

Independent Sol review is **GO for this bounded stop disposition only**, and
**BLOCK for claiming the exact original pre-order cause**. See
`continuation_independent_review.md`. No calibration acceptance, merge or
baseline adoption follows. Remaining gates: exact original pre-order attribution,
Sanski ordinary-combat capture by w188 after Ključ, all n25 matching OSIDs, five
Jajce gains, and any future candidate's required suite/campaign/provenance/review.
No additional expensive campaign is authorized. The smallest future diagnostic
proposal must establish source continuity, then test one continuous t186→t188
trace with `axis_reject,movement_reject`, avoiding the second resume boundary.
That proposal is not a run authorization.

## Continuation evidence and exact exits

Files below are in this report's directory. Raw replay artifact directories
remain local. Original n37 suite/campaign and n38 prefix exit 0 are reused.

| Check | Exit | Receipt |
| --- | ---: | --- |
| OpenCode route preflight | 126 | `continuation_opencode_preflight.exit.txt` |
| Import/usage preflight, no mode and no replay | 1 | `continuation_sana_preorder_compilecheck.exit.txt` |
| t187 selected-receipt comparison | 0 | `continuation_sana_t187_exact_result.json` |
| t188 trace / whole-state comparison | 2 | `continuation_sana_t188_trace_result.json` |
| All t188 difference categories | 0 | `continuation_sana_t188_diff_classification.json` |
| Retained checkpoint/Farz verifier | 0 | `continuation_n37_checkpoints.exit.txt` |
| Cell-level acceptance audit | 0 | `continuation_retained_acceptance_audit_final.json` |
| Western lifecycle audit | 0 | `continuation_western_receipts.json` |
| TypeScript `--noEmit` | 0 | `continuation_sana_preorder_typecheck.exit.txt` |
| Citation / plan-index focused tests, 56/56 | 0 | `continuation_docs_focused.exit.txt` |
| Desktop/roadmap truth tests, 7/7 | 0 | `continuation_docs_truth.exit.txt` |
| Derived plan index `--check` | 0 | `continuation_plan_index.exit.txt` |
| Final working/staged whitespace checks | 0 | `continuation_final_diffcheck.exit.txt` |

The first cell-audit extraction exited 1 for an incorrect Petrovac OSID; the
authored `_2` ID corrected it. The next extraction exited 0 but overasserted
January HRHB for Lug/Paroš. The final explicit checkpoint timeline agrees with
paint and exits 0. Earlier outputs are retained; these correct audit assumptions,
not simulation control or acceptance criteria.

## Continuation 2 source-continuity gate — 2026-10-03

**STOP — insufficient continuity; conditional trace not run.** The exact retained
run metadata for n37 and n38 records clean commit
`df3cc3167f387b052ea74e2d008dc5aa84f7b2ff` with `git_dirty: true`. No complete
run-bound dirty-tree fingerprint was recovered by this bounded audit.

The retained evidence does bind the consumed inputs: both runs record digest
`8f13061b19ed9fd2d899f77f0115fdd4c5379e52cb058b3edadbd00e0e41af20` and initial
save SHA-256
`413ce64acaa420e130e293230dfa470dcaa46c5b4df2c6d3706d7e31cb8455e1`.
Current bytes for the three changed calibration input files match their run
recorded hashes. That is input/save continuity, not executable-source
continuity.

The current checkpoint differs from clean `df3cc` in 30 paths: 24 `src/`
executable-source paths, 3 changed calibration inputs, and 3 `tools/` runner or
verifier paths. Clean-commit object hashes are recorded where available, but
current-vs-clean hashes and matching selected outcomes cannot identify the
original dirty bytes. The bounded older-checkout search recovered no complete
run-bound snapshot or patch. A Git object scan timed out; it is incomplete
search evidence, not proof that no recoverable object exists. Exact coverage
and all paths are preserved in raw `continuation2_source_continuity.json`.

Independent review identified a partial source receipt:
`sana_ivanjska_candidate_only_provenance.md` records catalog SHA-256
`35577cf555869989f22321a9c56453793e9f9f65f03e52468dd781ea57d7de94`, matching
the current `operation_opportunity_catalog_5th_corps.ts`. That candidate-scoped
receipt does not bind those bytes to n37/n38 execution or cover the other 23
changed source paths. All 24 remain **not bound to n37/n38**. The reviewed
addendum `continuation2_source_continuity_reviewed.json` narrows the raw receipt's
absence wording without changing or overwriting it.

**Measured:** dirty provenance, digest/save equality, 30-path change set and
hash coverage above. **Hypotheses not tested:** source continuity, second-resume
effects, and flag neutrality. **Missing evidence:** the original dirty
executable source receipt. Per the gate, no new helper was prepared or invoked,
no validation-plan dispatch was recorded, and no production correction or
campaign followed.

OpenCode executed the bounded handoff through
`opencode-go/gpt-5.6-luna#medium`; dispatch exit **0** is in
`continuation2_opencode_dispatch.exit.txt`, with raw stdout/stderr retained
locally. Exit 0 means the audit completed; the source-continuity gate failed.
The earlier explicit OpenAI Sol route failure remains separate. Independent
review and its targeted correction verification are GO for this STOP
disposition; calibration remains NO-GO.

Exact dispatch command (stdout/stderr captured in the corresponding local logs):

```powershell
opencode run --standalone --model 'opencode-go/gpt-5.6-luna#medium' --format json --auto --title 'Sana source continuity' --file logs/prusac-diagnostic-20260929/continuation2_opencode_handoff.md 'Execute the attached bounded diagnostic handoff. Start with source continuity and stop if it is not established. Preserve all evidence; no production correction or campaign.'
```

Focused documentation closeout: 63/63 tests exit 0
(`continuation2_docs_focused.exit.txt`); derived plan index exits 0
(`continuation2_plan_index.exit.txt`). Raw-receipt and catalog-hash checks pass;
board length is 19,940/20,000 and roadmap 59,226/60,000 characters.

## Continuation 3 retained western failure extraction — 2026-10-03

**Initial coverage claim superseded after independent review; STOP for causal
diagnosis.** The single guarded read-only command exited **0**, but omitted
relevant actor/order history and mislabeled temporal indices. It covered all
four exact lost OSIDs at denominator 712 and preserved before/after rows, operation
names, formation IDs, battle/control/lifecycle rows, inherited n29/n30 receipts
where applicable, and SHA-256 hashes for every consumed artifact. The receipt is
`continuation3_western_failure_receipts.json`; raw stdout/stderr and the exact
exit are `continuation3_western_audit.stdout.log`,
`continuation3_western_audit.stderr.log`, and
`continuation3_western_audit.exit.txt`.

The initial helper's differences below are confined to its filtered temporal
`week_index170–188` window, not run-earliest or causal divergences:

- **Barevo** (`op:jajce:barevo_2`, HRHB→RS): formation/roster/movement rows
  already differ at **week_index170**. The retained Operation Mistral 2 chain then shows
  n25 target execution at **t186** and a later HRHB battle/control receipt at
  t187, while n37 has no Barevo target receipt after the prior RS control.
  Relevant IDs include `hv_112th_infantry_1995`, `hv_1st_hgz_1995`,
  `hvo_1st_guard_abb`, `hvo_3rd_guard_jastrebovi`, and `hvo_rama_brigade`;
  n37's late Mistral participants instead include
  `hv_4th_guards_split` and `hvo_2nd_guard_mechanized`.
- **Lupnica** (`op:jajce:lupnica`, HRHB→RS): formation/roster/movement rows
  already differ at **week_index170**. Mistral target receipts are n25 **t185** versus
  n37 **t187–188**; n25 has the HRHB capture battle/control receipt at t186,
  n37 does not. The same exact formation IDs and n37 2nd Guard Mechanized
  axis are retained in the JSON receipt.
- **Majdan** (`op:mrkonjic_grad:majdan_2`, HRHB→RS): formation/roster/movement
  rows already differ at **week_index170**; Southern Move target planning is n25 **t183**
  versus n37 **t185**. n37 remains planning through t188 with
  `intel_gathering`, elapsed **3/5**, and `intel_confidence_at_assessment`
  null. n25 has the HRHB combat/control receipt at t188; n37 has none.
  This is the Mrkonjić Grad Majdan ID, not Stari Majdan.
- **Varošluk** (`op:travnik:varosluk`, RBiH→RS): relevant temporal rows first
  differ at **week_index173 within that filtered set**, but both retained n25 and n37 show the RS
  `rs_43rd_prijedor_motorized` and `rs_6th_sanske_infantry` destroyed at
  **t174**. n25 alone has the 737th (`arbih_737th_muslim_light`) RBiH
  combat/control receipt at t181; n37, n29, and n30 retain only the earlier
  t119 battle. n29/n30 therefore localize the route issue as inherited,
  without identifying its cause.

Recorded predicates do **not** establish why the divergence occurred. Operation
assignment/objective, temporal formation state, battle rows, and control events
are present where listed; withdrawal/destruction is only recorded where the
destroyed-brigade artifact says so. Selector rejection, order lifecycle cause,
route-loss cause, and any causal code predicate are **unreported**, not zero.
No scenario, resume, production change, control edit, denominator change,
acceptance waiver, or causal attribution follows this extraction. The smallest
discriminating next check would be a newly authorized trace that retains the
first missing lifecycle/route-rejection predicate at the relevant boundary; it
was not run here.

### Consolidated integration receipt and disposition

OpenCode's targeted correction produced
`continuation3_western_failure_receipts_corrected.json`, extraction exit **0**,
then the session terminated with dispatch exit **126**, `provider.quota`,
HTTP 429, “Go usage limit exceeded”. No retry followed. Original and corrected
raw receipts/helpers/logs remain preserved locally. The corrected extraction
adds order/AAR/actor history but still projects temporal `week_index` into a
field named `turn`; its aggregate first-divergence labels are not accepted.

The lead's compact `continuation3_reviewed_summary.json` is authoritative for
the chronology claims below. Its guarded projection exits **0**, verifies all
**36** consumed artifact hashes and the parent receipt SHA, and uses original
temporal `turn` explicitly. Raw temporal rows have `turn = week_index + 1`;
weekly reports use `week_index` for completed turn. This is a schema difference,
not a one-turn simulation discrepancy. No raw receipt was overwritten.

**Measured separation of failures:**

- **Barevo/Lupnica:** n25 and n29 Mistral first execute t178; n30 and n37 first
  execute t180. n29 retains both HRHB target controls; n30 already loses both.
  n25 HGZ attack orders target Jajce/Lupnica/Barevo at t185/186/187; n37 HGZ
  targets Bravnice/Vinac/Jajce at those same turns. At t188 n37 has no HGZ
  Lupnica/Barevo order. This localizes the late-stage regression to the retained
  n29→n30 transition; it does not identify the launch-delay predicate.
- **Mrkonjić Grad Majdan:** already RS in n29. n25 Southern Move plans t183,
  executes t188 with four Majdan orders and an HRHB combat capture. n29 also
  executes t188, but its orders target Gerzovo. n30/n37 start planning t185 and
  never execute by w188. The target difference and subsequent delay are distinct
  measured failures; neither authorizes objective substitution or retiming.
- **Varošluk:** the first recorded route-state difference for the named 737th
  between n25/n37 is **completed t138**: both at Gornja Rovna, but only n37 has
  Udurlije as a movement destination. This is post-turn intent, not a retained
  selector predicate. At t181 n25's 737th is at Varošluk after the RBiH capture;
  n29/n30/n37 are at Brizina with Udurlije intent. n37 stays there through w188,
  changing destination to Komar t187 and Gornje Krčevine t188. The missing
  Varošluk capture is inherited before the latest Sana continuation.

**Evidence limits:** HGZ/112th have zero temporal-log rows in n25/n37 and no
destroyed-brigade receipt. Their operation-order/roster history is recorded;
their disappearance cause is unreported. Neither watched-operation set contains
Mistral/Southern Move, and the operation receipts lack launch-readiness/blocker
details. Recorded skipped-order arrays at the cited late targets are empty;
they do not prove a selector rejection. Source continuity remains unproved.

**Decision:** no selector, order-lifecycle, launch-timing, roster or objective
correction is supported. Stop at causal attribution; preserve the measured
chains and all acceptance gaps. No suite, resume or campaign was launched.
Any future clean-source trace would characterize a new candidate and must retain
the missing pre-order predicate; it cannot prove the original dirty-run cause.

Targeted independent correction verification is **GO for this chronology and
STOP disposition only**, not calibration acceptance. Final focused documentation
checks pass **63/63**, exit **0** (`continuation3_docs_focused.exit.txt`);
derived index exits **0** (`continuation3_plan_index.exit.txt`). Node syntax
checks for the corrected/reviewed helpers and working/staged whitespace checks
exit **0**. Board/roadmap limits hold at 19,953/20,000 and 59,543/60,000.
Large raw JSON extracts remain preserved locally; compact summary, guarded
helpers, handoffs and exit receipts are retained with this documentation.

## Instrumentation-preparation instructions — 2026-10-03

Owner requested the next OpenCode handoff. It reuses existing axis, roster,
movement and formation-lifecycle topics, bounds edits to proved observation
gaps, requires focused neutrality/compatibility proof, and prepares a concrete
campaign proposal without authorizing execution. Instructions:
`continuation4_opencode_instrumentation_handoff.md`. Dispatch exits126 on
provider.quota429 (Go usage limit exceeded), before any worker tool action.
No retry or worker tool use followed that dispatch. Subsequent Sol preparation
and its incident are recorded below. Calibration remains NO-GO.

## Continuation 4 incident audit — 2026-10-03

Implementation and validation stopped after an unauthorized runner launch and
an overbroad process-stop command. This subsection records observed facts only;
all draft code, logs, junctions and partial run artifacts remain preserved.

The command that caused the launch was:

```powershell
node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_scenario_with_preflight.ts --help
```

It ran from the October continuation checkout as one member of a parallel
read-only prerequisite batch. `run_scenario_with_preflight.ts` forwards unknown
arguments, and `run_scenario.ts` ignores `--help`; because no `--scenario` was
provided, it selected the default 52-week historical scenario. The tool call
yielded after about 10.2 seconds with no recorded exit and its session id was
not retained in the wrapper output. No dedicated local stdout/stderr file was
created for this command. Exact process start time is unavailable. The preceding
focused consumer receipt completed at 20:48:05+02:00; the accidental run
directory was created at 20:49:01.5285256+02:00.

The attempted containment command was exactly:

```powershell
$matches = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*run_scenario_with_preflight.ts --help*' }; $matches | Select-Object ProcessId,Name,CommandLine | Format-List; foreach ($p in $matches) { Stop-Process -Id $p.ProcessId -Force }; Write-Output "STOPPED=$($matches.Count)"
```

The filter had no checkout or parent-process constraint. It matched these six
PIDs before the loop (parent PIDs and process creation times were not captured
and cannot be recovered from the ended processes):

| PID | Name | Observed command line / identity |
|---:|---|---|
| 13096 | `pwsh.exe` | Codex exec wrapper whose command invoked the October-checkout `node ... run_scenario_with_preflight.ts --help` command |
| 17120 | `node.exe` | Volta Node invocation of `node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_scenario_with_preflight.ts --help` |
| 13640 | `cmd.exe` | `cmd.exe /C node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_scenario_with_preflight.ts --help` |
| 20228 | `node.exe` | Node invocation of the same TSX/preflight command |
| 12176 | `node.exe` | TSX loader command whose loader paths resolve through `C:\Users\User\.codex\worktrees\april-1995-glamoc\A-War-Without-Victory\node_modules`, ending in `tools/scenario_runner/run_scenario_with_preflight.ts --help` |
| 17864 | `pwsh.exe` | The containment command itself; its own literal filter text matched |

The loop reached its own PID and terminated before printing `STOPPED=...`; no
per-PID success receipt, aggregate exit, or session id exists. It is therefore
unknown which termination calls completed successfully or the exact stop time.
The matched `april-1995-glamoc` path does **not** by itself prove PID 12176 was
an unrelated prior job: this checkout's `node_modules` is a junction to that
exact older-checkout directory, so PID 12176 may have been the TSX execution
child of the accidental command. Because parent PIDs were omitted from the
capture, its ownership remains unresolved. The earlier worker message calling
it an unrelated process was premature. The process filter was still overbroad
and could have affected another matching process; absence of deletion evidence
does not establish absence of damage.

The accidental job's preserved output is
`runs/apr1992_historical_52w__434fe8ff83b7b523__w52`. The October checkout's
`runs` junction targets the older checkout's `runs` directory, so both paths
name the same physical artifact. `run_meta.json` identifies commit
`c3354ee3a9c3563dc5eec88da94c55cc91861fec`, `git_dirty: true`, Node
`v22.23.2`, default scenario `apr1992_historical_52w`, 52 requested weeks and
consumed-input digest
`ab5ee17ba732cb991d2b5305b7bd3841e76244143d61e20bd630454637cd04e5`.
The directory is incomplete and is not validation evidence. Preserved files:

| File | Bytes | Last write (+02:00) |
|---|---:|---|
| `run_meta.json` | 9,382 | 20:49:01.9467034 |
| `initial_save.json` | 1,124,102 | 20:49:03.6212653 |
| `weekly_report.jsonl` | 64,430 (4 rows) | 20:49:15.0063077 |
| `brigade_temporal_log.jsonl` | 513,474 (1,000 rows) | 20:49:15.0847344 |
| `displacement_event_log.jsonl` | 5,586 (30 rows) | 20:49:15.0837346 |

No `final_save.json`, `run_summary.json`, `end_report.md`, operation AAR or exact
exit marker exists. The write stream continued until 20:49:15 after the process
enumeration/kill attempt; the exact child lifetime is not recoverable. No other
new run directory was identified at the same timestamp in the shared target.

Instrumentation remains an uncommitted draft in:

- `src/scenario/combat_causality.ts`
- `src/sim/combat/bot_brigade_ai_osid.ts`
- `src/sim/combat/bot_brigade_eval_movement.ts`
- `src/sim/combat/reason_code_debug.ts`
- `tests/reason_code_debug.test.ts`
- `tests/bot_route_decision_diagnostic.test.ts`
- `tests/bot_route_decision_coverage_diagnostic.test.ts`
- `tools/diagnostics/bot_route_decision_coverage.cjs`
- the coverage/validation-plan addition in
  `sana_ivanjska_joint_validation_plan.md`

Last settled focused checks, separate from the incident: receipt red exit 1;
first green attempt exit 1 because the positive fixture was correctly rejected
as risky; corrected receipt green 2/2 exit 0; consumer error/red exits 1 and 1;
consumer green 3/3 exit 0; combined focused set 91/91 across eight files exit 0.
Evidence is preserved under `continuation4_route_receipt_*`,
`continuation4_route_consumer_*`, and `continuation4_focused_tests.*`.
Typecheck was launched at 20:50:00+02:00 and its controlling tool call was
aborted after 14.3 seconds. At the 20:50:48 audit the process tree remained live
(PIDs 10912 → 12460 → 6976 → 10192), with empty stdout/stderr and no exit file.
It then completed without another command: `continuation4_typecheck.exit.txt`
was written at 20:51:07.9881754+02:00 with exit 0, stdout/stderr still empty,
and none of those PIDs remained at the next audit. No diff check,
save-compatibility gate, independent review, full suite or
authorized diagnostic campaign was completed. Root owns containment,
restoration and any decision about this preserved draft.

## Continuation 4 focused preparation result — 2026-10-03

After root's incident assessment, preparation continued within the existing
owner authorization; no new campaign authorization was given. The
draft adds one `route_decision` reason-code topic at the actual generic interior
pre-order seam. It records existing locals: turn/phase, formation location and
transit/prior-order state, operation/axis/objective when present, chosen rule,
sorted route goals, candidate destination, issued destination and exact terminal
outcome/rejection. It neither recomputes routing nor feeds a decision. The
receipt is projected through `bot_order_diagnostics`; the read-only coverage
consumer fails closed on a missing named formation or issued/order mismatch.

Existing instrumentation was reused unchanged for axis launch/readiness and
517th order decisions, opportunity rosters, downstream movement rejection and
HGZ/112th lifecycle visibility. `movement_reject` remains downstream rejection
evidence and is not presented as selector evidence.

Save compatibility is structural and directly bounded: no `GameState`, state
schema, serializer, loader or migration file changed. The new optional field is
an ephemeral bot-order/`TurnReport` diagnostic only. The focused paired fixture
proves the default report shape omits it and enabled/disabled complete states are
equal; removing only `route_decision_details` makes the returned diagnostics and
report snapshots equal. No summary or order map is discarded. A no-order
positive control preserves the terminal fallback as an explicit receipt.

Focused proof is **91/91**, exit0 across the six handoff files and two new
diagnostic files (`continuation4_focused_tests.*`). TypeScript `--noEmit` exits0
with empty stdout/stderr (`continuation4_typecheck.*`). Earlier red/fixture and
consumer evidence remains preserved under `continuation4_route_receipt_*` and
`continuation4_route_consumer_*`; it is not rewritten as passing evidence.
Consumer syntax and the pre-summary working/staged whitespace check exit0 in
`continuation4_consumer_syntax.*` and `continuation4_diffcheck.*`.

The existing validation plan now contains the concrete full-horizon campaign
proposal, exact source-supported flags, source/initial/final artifact binding,
named 737th/517th and late-operation coverage, lifecycle/roster consumers,
five-minute estimate and one-failure stop rule. It is **NOT AUTHORIZED** and was
not executed. A future known-source run characterizes only its own candidate;
it cannot prove original n37 attribution or waive any calibration criterion.

## Continuation 4 independent-review correction — 2026-10-03

The candidate now closes the real serialization gap. After
`buildWeeklyReport`, the production runner attaches `bot_order_diagnostics`
only when the env-gated `route_decision_details` array is non-empty. The
env-off weekly row remains absent of the field; the env-on focused production
projection serializes the exact receipt and `movement_orders_by_brigade` map.
No `GameState`, save schema, serializer, loader or migration path changes.

Turn semantics were checked against the real pipeline. `runTurn` increments
`working.meta.turn` before war order generation. The receipt reads that value,
and `buildWeeklyReport` later assigns the same completed-turn value to
`week_index`. The consumer requires exact integer equality. The temporal-log
loop index remains a separate zero-based counter and is not substituted.

The receipt now separates the turn-scoped
`preexisting_movement_order_destination_osid` from
`persistent_movement_state_destination_osid`. The former
`no_lawful_destination` label is replaced by the observed
`no_destination_selected`. This is a terminal generic-interior receipt only;
it does not claim complete predicate history. Active column transit skips
before this seam, and the focused negative control proves no terminal receipt
or weekly attachment is emitted for that path.

The consumer now fails closed on exact receipt keys and types, known rules,
outcomes and rejection reasons, outcome-field invariants, sorted unique goal
sets, row/receipt completed-turn mismatch, duplicate brigade receipts in a row,
movement-map disagreement, missing named formations and missing repeated
`--expect-boundary FORMATION:TURN` gates. Its output separates structural
coverage and sets `causal_proof: false`.

TDD correction evidence is preserved under `continuation4_correction_*`.
The red run exits1 with 12 intended failures across 14 tests. The first green
passes 14/14. The sole intervening change is an existing-path active-transit
negative regression; green2 passes 15/15, exit0. `node --check` exits0. The
first non-interactive typecheck attempt returned after its 30-second command
window with stdout/stderr files but no exit receipt at that audit. A second
typecheck was unnecessarily started while the first completion was pending.
Both ultimately exit0; both receipts remain preserved. No further manual
typecheck follows; the required pre-commit hook remains part of local integration.
The initial 91/91 result was not rerun; its five original route/consumer cases
are superseded by the 15 correction cases, and its other 86 cases are reused.

The plan's proposed command now checks the entire 188-turn output and explicit
737th completed t137/t138/t139 boundaries. Those are observation gates around
the retained t138 post-turn divergence, not a promise that a new known-source
candidate reproduces the old route. A missing boundary stops the proposal as
incomplete coverage. The campaign remains **NOT AUTHORIZED** and was not run;
full default-horizon/global gates remain pending.

### Root integration disposition

Independent targeted correction verification is **GO for observation preparation
only**, recorded in `continuation_independent_review.md`. No routing/lifecycle
correction is justified by the retained evidence. Final read-only inventory
exits0 and still finds four weekly rows and1,000 temporal rows in the incomplete
accidental output, with no final save or run summary. Its file fingerprints,
junction targets and runtime versions are preserved in
`continuation4_final_inventory.json`; it is not calibration evidence. Reuse the
exit0 all36 retained-artifact fingerprint check; subsequent changes are confined
to candidate source/tests/docs. No retained log/save/run was deleted or replaced.
The unchanged canon still governs deterministic state and ordinary combat;
no mechanic, control/reference, denominator or save schema is amended.

Final documentation checks pass63/63, exit0. Strict tracked citation validation
passes128 citations, exit0; plan-index and final working/staged whitespace checks
exit0. Their `continuation4_closeout_*` exits are retained with the existing
proof receipts. Board19,920 and roadmap59,917 characters remain within limits.
The final source commit runs the existing pre-commit typecheck hook; its exact
commit/hook outcome is retained locally under `continuation4_local_commit`.

## n39 known-source campaign — bounded STOP — 2026-10-03

Owner's “Next it is” authorized one campaign from clean source
`7b9c242a3d3942a8a64673457c4e75b545dab6e4`. It completed once in
`runs/apr1992_definitive_188w__6deb5845c150c196__w188_n39` with runner/preflight
exit0 and final hash `afa185b2591dac1a`. The initial-save SHA256 and input digest
match retained n25/n37. All31 inputs match the actual CRLF→LF provenance protocol;
the first raw-byte GeoJSON mismatch is a checker error, preserved separately.
No input was rewritten, and no retry or full suite followed.

| Check | Exit | Measured result |
|---|---:|---|
| Runner/preflight | 0 | Complete188-week output; clean source binding |
| Route coverage | 1 | 145 valid receipts,0 inconsistencies;737th absent,137–139 missing |
| Launch/order join | 1 | 978 axes,63 first-execution axes,4 mismatches; positive control detected |
| HV lifecycle | 0 | Six spawned/traced formations and positive controls; disappearance cause unreported |
| Authoritative checkpoints/Farz | 0 | Protected guards/current Farz receipts hold |
| Audit/Sana supplement | 0 | Reviewed counts: towns2/3,belt4/4 |
| Raw-byte input comparison | 1 | Wrong hashing protocol on one CRLF GeoJSON |
| Correct normalized comparison | 0 | 31/31 inputs match |

The517th has13 exact order receipts across176–188. At188 it is at Lušci,
objective Stari Majdan, and issues Budimlić Japra through `march_to_approach`.
This is a fresh bound n39 decision, not proof of original dirty n37 attribution
or a stale-selector defect. The737th has188 active-brigade temporal rows and
movement orders on30 serialized weekly rows, but no terminal route receipt.
An earlier evaluator bypass is only a source-consistent hypothesis. Pre-order
transit/filter eligibility and the first handled evaluator were not serialized.
This supersedes the raw audit's unsupported “proves earlier evaluator bypass”.

The four launch flags occur at14(Srebrenica–Cerska),70(Lukavac93) and two Sana
axes at177. Sana's paired axes retain launch-readiness names whose actual orders
appear under sibling axes; this is missing axis-local evidence, not proof of
omitted global production orders. The agreed join gate remains failed; exact
t14/t70 missing branches are unresolved. HV112/HGZ are active Mistral participants
through187, absent at188/final registry. No explicit withdrawal action receipt
exists; their disappearance is not itself a measured cause.

Ordinary Operation Sana combat captures Petrovac181 and Ključ185; Sanski town
remainsRS. Belt captures are Budimlić184,Lušci185,Jelašinovci186,Skučani187.
Jajce remains3/5(Bravnice185,Vinac186,town187). Barevo,Lupnica,Mrkonjić Grad
Majdan and Varošluk remain the four lost n25 matches. Scores707/707/706/684
retain denominator712; earlier matching OSIDs and protected controls hold.
Anomalies27=0critical/5warning/22info. Farz four operation-owned receipts at
162/164/163/167 pass; no2nd-Corps participation remains a fidelity diagnostic.

The raw town/belt helper incorrectly required an absent optional
`battle.territory_flipped` flag and counted zero. Reviewed combat-control-event
and winning matching-battle joins prove2/3 towns and4/4 belt. Raw helper/output
and exit remain preserved; only the counts and unsupported causal wording are
superseded. The reviewed supplement's `parent_sha` is the40-character candidate
Git commit, not a file SHA256. Separate file fingerprints are in the compact
authoritative `continuation4_campaign_reviewed_summary.json`, including raw,
corrected and reviewed supplements, source/run/input/artifact hashes and exits.
The started marker preserves its pre-authorization nested source-binding false;
its top-level owner message/scope records the later one-run grant.

Independent review is **GO for bounded STOP**, **NO-GO for calibration/adoption
or exact original attribution**. No selector/lifecycle correction is supported.
Next cheap scope is a dispatcher eligibility/first-handler observation for737
with meaningful branch controls, before separately authorizing at most a139-week
question. Unaffected n39 late receipts should be reused; no188-week retry is
authorized. All town/order/match/protected/critical/Farz/source and independent
acceptance requirements remain in force.

Final targeted correction verification is GO for bounded STOP. All10 compact
parent-artifact fingerprints match. Campaign closeout documentation63/63,
strict129 tracked citations, plan-index and working/staged whitespace exit0.
The129 count is this final invocation; the128 count above belongs to preparation.
No production proof, consumer or campaign was repeated for this closeout.
Local documentation/receipt integration retains the existing pre-commit hook;
its exact outcome is captured under `continuation4_campaign_docs_commit`.

### Dispatcher preparation and targeted review — 2026-10-03

Independent targeted GO is limited to observation preparation. Ordinary pre-order
eligibility/filter/first handler and distinct pre-cap/generated/snapshot receipts
are default-absent. Real cap/merge off/on state/orders match; no gameplay/save fix.
Initial NO-GO and targeted GO retained in continuation4_dispatcher_independent_review.md.
RED1(19/22), corrected22/22 exits0; syntax/diff0, prior54/54 and typecheck0 reused.
Real weekly JSON passes strict consumer; global duplicate and inverse transit gaps closed.

OpenCode Sol126/no-route and Luna126/quota429 before tools. Direct n39 negative
ran once: expected1,0 receipts, missing737 at137–139; no cause inferred.
Compact: `continuation4_dispatcher_reviewed_summary.json`.
No campaign/suite/replay/prefix ran. Reuse n39 late517, towns/belt/Jajce/matches/
protected/critical/Farz evidence. Original cause, continuous737 boundary, launch/
HV receipts, full-suite/default campaign neutrality and calibration acceptance
remain open. Next is a separately authorized139-week branch question; no188 retry.

Final closeout: documentation63/63, strict130 tracked citations, plan-index,
inventory and working/staged whitespace exit0. Eight source/22 parent/seven n39
fingerprints match; raw runs/logs and local junctions retained, Node22.23.2,
protected source/data/canon diff empty. Required local commit hook is retained;
its actual result is captured in continuation4_dispatcher_commit logs. No
simulation or unaffected check was repeated for this closeout.

### n40 one authorized139-week run — bounded measurement/STOP

Owner Go for it exhausts the one-run proposal from cleanfe828b9e0.
Runner0/strictcoverage0; n40 finalhashd6715e9cefa14d0c. Three737 receipts137–139
eligible→offensive/dig_in,no ordinarymovement/attack; balanced3rdCorps/GornjaRovna,
no assigned sector/operation/transit. This closes interior-hook absence, not
Varosluk or originaldirty517 cause. Aligned temporal137/138/139 rawloop136/137/138
has postturn destinationsnull/Udurlije/Udurlije. Later finaldistribution is a
source-supported possiblewriter after ordinarysnapshot; exactbranchnotmeasured.
173events/139weeklymaps unchanged; reached39/104 both707/712 andsame matching
OSIDs/protectedcontrols. Prefixcritical0/24, not188acceptance.

Preserve failures:rawprovenance1 compares139manifest30 with188manifest31/digest
and incorrectly requiresplayernull; actual30common/current hashes match, only
octpaint omitted byhorizon, initialSHA equal and neutralfield absentboth.
Protocolaudit0 is notwaiver of literal31criterion. Rawaudit1 is a misnamed
temporalrawloop boundary; correctedtemporal-onlyaudit0 reusescontrolcomparisons.
Originalhelperbytes/rawlogs/exits retained. OpenCode126/quota429 beforetools;
one atomicdirectfallback, no campaignretry. IndependentGO boundedmeasurement/STOP.
Compact: `continuation4_139_20261004_reviewed_summary.json`.
No production correction/fullsuite/newcampaign. Reuse n39 lateacceptance failures/
protected/Farz evidence. Nextcheap scope:post-bot movement ancestry; all gapsopen.

Closeout: documentation63/63, strict131 tracked citations, plan-index and
preservation inventory all exit0.18 parent/eight source hashes match; production
diff empty, n37–n40/partial52 and local junctions retained. Required local hook
result is recorded separately; no simulation or unaffected validation repeated.

### Bounded causal diagnosis — 2026-10-04

The retained evidence supports STOP without a gameplay correction. n40 measures
the 737th ordinary-pass dig_in/no-movement branch at completed t137–139. Its
post-turn Udurlije destination can come from movement state or orders; neither
source nor writer is reported. The candidate inventory includes front
distribution, drift recall, elite-loan ticking and elite repair, but is not
exhaustive and does not establish the 737th's eligibility for those branches.
The next cheap preparation is a named-actor state/order observer across relevant
post-bot phase boundaries, followed by a fixture proving observer coverage.

n39's 517th at t188 freshly issues Budimlić as an approach to Stari Majdan.
The receipt omits complete adjacency/control/candidate/path/prior-order inputs;
it cannot reproduce that full pre-order context or attribute dirty n37.
Barevo/Lupnica localize to n29→n30 with Mistral execution t178→t180. Majdan
already differs in n29 (Gerzovo rather than Majdan) before the later launch
delay. Varošluk requires both t138 movement ownership and later admission linkage.
These are separate chronology boundaries, not proved failing predicates.

OpenCode child126/provider429 before tools (wrapper0), no retry; local helper
syntax/extraction/artifact checks0. Initial independent review accepts bounded
STOP/chronology and requires narrower wording; original artifacts and failures
are preserved with the corrected supplement. No production change or new run.
All town/Jajce/lost-match, launch/HV receipt, protected-control, Farz, save,
denominator and final calibration gates remain open or retained as previously
measured. [Corrected causal receipt](continuation4_causal_20261004_reviewed_summary.json).

Targeted independent correction verification is GO for the bounded table and
wording fixes only. Causal attribution and calibration acceptance remain NO-GO.

Causal closeout: 63/63 documentation tests, 132 tracked citations, plan index,
35-fingerprint preservation inventory and working/staged whitespace all exit0.
Seven parent receipts and 16 source files remain bound; production diff empty.
n37–n40, partial52 and junctions retained. Prior campaign evidence is reused.
The required local commit hook result is recorded separately; no extra simulation.
