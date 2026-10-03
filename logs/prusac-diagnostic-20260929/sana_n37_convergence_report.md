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
