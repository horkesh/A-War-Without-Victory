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
