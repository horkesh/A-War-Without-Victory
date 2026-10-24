# Player-validation evidence audit

This is a read-only audit of retained evidence. It ran no engine, replay, native application, build, simulation, or campaign and changed no production or plan file. It does not adopt a numeric player floor. The player contract remains the seven hard gates in `docs/plans/2026-07-31-full-campaign-electron-validation-plan.md:24-34`; the plan explicitly says the retained RBiH t39 result is partial and keeps later checkpoints, all factions, full surface/diaries, same-input replay, audio, and release qualification open (`:12-13`, `:38-42`).

## Coverage matrix

| Hard gate | RBiH | RS | HRHB |
|---|---|---|---|
| Player agency and lawful input | **PARTIAL** — visible faction/mode/seed/autonomy and action-specific evidence exists, but no complete ordered replayable input transcript; strategic authority and final-tour proof are null | **UNREACHED** | **UNREACHED** |
| Same-input determinism | **UNREACHED** — one execution; Save/load is not repeat/replay | **UNREACHED** | **UNREACHED** |
| Save/load per faction | **PASS_CURRENT_EVIDENCE** at retained t39 | **PARTIAL** — retained zero-turn prerequisite only | **PARTIAL** — retained zero-turn prerequisite only |
| Legal/protected/history | **PARTIAL** — canonical consistency plus 30 January OSIDs, Brčko band, and five January events pass; full canonical protected reader and Farz do not | **UNREACHED** | **UNREACHED** |
| Engine/runtime health | **FAILED** — t39 has 12/12 measured infrastructure checks, but the required inherited full-tour strict audio failure remains; canonical health reader coverage is incomplete | **UNREACHED** | **UNREACHED** |
| Coverage/product quality | **PARTIAL** — capture-only t39 and earlier partial opening; no clean full tour, qualified 24/188, replay/endgame, diaries, or campaign performance | **UNREACHED** | **UNREACHED** |
| Preservation/provenance | **PASS_CURRENT_EVIDENCE** for t39 package/source/raw result/manifest and preserved baselines/telemetry | **PARTIAL** — shared provenance only, no current qualified campaign packet | **PARTIAL** — shared provenance only, no current qualified campaign packet |

Counts across 21 hard-gate/faction cells: **2 PASS_CURRENT_EVIDENCE, 7 PARTIAL, 1 FAILED, 11 UNREACHED, 0 INAPPLICABILITY_REQUIRES_AUTHORITY**. Applicability questions are recorded separately below; none changes these gate outcomes.

## Evidence findings

The portable manifest resolves the real evidence rather than implying that the portable folder contains it: `logs/r8-native-calibration-parity-20261024/MANIFEST.json` points to `tmp-paradox-qa-20260710/paradox-local-qa-native-calibration-rbih-t39-20261024-03.json` and the raw post-run audit at `tmp/r8-native-calibration-parity-20261024/native-t39-03-postrun-audit-01`. The actual embedded evidence manifest is `tmp-paradox-qa-20260710/evidence/native-calibration-rbih-t39-20261024-03/rbih/manifest.json`.

The actual result contains six event choices with receipts, two reserve receipts, four proposal records, two officer receipts, 39 Advance clicks, 39 settled archives, and exact Save/load evidence. It contains no standalone complete action/input/command transcript and no demonstrated production replay consumer. `strategicConfiguration` and `strategicCommandAuthority` are null (`actual result:4130-4131`), `finalTourProof` is null (`:460064`, `:627814`), turn archives and Save/load begin at `:628107` and `:628382`, and the event-choice transcript begins at `:631931`. This is useful agency and serialization evidence but cannot establish same-input determinism. The governing rule requires identical initial state and ordered inputs (`docs/20_engineering/DETERMINISM_TEST_MATRIX.md:90-94`); player authorization changes phase inputs relative to headless behavior (`docs/10_canon/Engine_Invariants_v0_9_0.md:455-467`). The plan itself states Save/load does not establish replay (`docs/plans/2026-07-31-full-campaign-electron-validation-plan.md:683-689`) and still lists complete transcript/replay binding as unfinished (`:1128-1132`).

The old outcome comparator is not a canonical protected or health reader. It reconstructs n94 and compares player outputs to it, defines the “protected” set as all 712 cells equal in n91/n92/n94, and hard-codes the retired score/equality checks (`tools/diagnostics/native_calibration_outcome_compare.cjs:33-190`, `:267-282`, `:320-381`). Its seven losses remain diagnostic player-versus-no-player differences, not a canonical protected-gate failure. Its health object is a small set of archive/cardinality/identity/Save-load/manifest booleans, not the `tools/engine_health_gate.cjs` contract. The canonical health/checkpoint readers expect full-run inputs such as `run_summary.json`, `final_save.json`, weekly reports, AARs, and 188-turn checkpoints that this t39 artifact shape does not contain. Full canonical protected and health reader coverage is therefore **UNREACHED**, even where the current 12 measured infrastructure checks pass.

January anchor and event checks have no source-defined exemption for different player choices. The anchor source provides the Brčko band and January event/OSID observations but no choice-conditioned applicability predicate (`src/scenario/historical_anchors.ts:142-199`, `:348-397`). Any proposed exemption is **INAPPLICABILITY_REQUIRES_AUTHORITY** and must be predeclared by the governing owner. The measured RBiH January subset currently passes; RS and HRHB are unreached. Farz is **UNREACHED** for all factions because no player run reaches week 188. Its accepted rule allows either 2nd or 3rd Corps to make the final blow, requires all four late authored operation capture receipts and RBiH week-188 control, and keeps 2nd Corps participation diagnostic (`docs/40_reports/CALIBRATION_MASTER.md:2536-2549`; `tools/lib/farz_objective_gate.cjs:5-23`).

The current harness does not cheaply admit an RS or HRHB native opening. It has faction and historical-selector fixtures, but its counter coverage dynamically takes up to 12 formations from the current runtime and reduces the target to the available sample (`tools/ui/paradox_local_qa.cjs:3744-3834`). It does not prove a frozen required cross-faction counter set. Recruitment is enforced only when the strategic, auto-recruit, and require-recruitment flags are active (`:20-40`, `:5724-5725`); the t39 command did not use them. The retained RBiH opening proves 11/11 available members of its frozen 12-member set, with 17th Vitezka unavailable (`validation plan:85-87`). That does not qualify RS or HRHB selectors, counters, recruitment, or opening choices.

The retained 700 score is diagnostic only. The owner contract expressly rejects adopting it as a player floor (`validation plan:12-13`, `:40`). Required 3×24 and 3×188 packaged sessions, replay/endgame, recorded performance, two clean diaries, and full product-surface evidence remain open (`:33`, `:1142-1174`, `:2045-2080`). n94 remains a no-player benchmark and is not substitute player evidence.

## Cheapest rejecting next step

Do **offline input and opening-contract qualification before any native run**. A new native zero-turn Save/load run would repeat a prerequisite already evidenced and would not answer either current dependency: whether a complete transcript can drive production replay, or whether RS/HRHB satisfy a frozen opening contract.

Run the cheapest existing checks first, each capped at 180 seconds and expected to take seconds to about three minutes total:

```text
node --check tools/ui/paradox_local_qa.cjs
node node_modules/vitest/vitest.mjs run tests/paradox_local_qa_harness.test.ts tests/native_calibration_outcome_compare.test.ts --pool=forks --reporter=dot
```

These checks can reject syntax or retained fixture assumptions, but they cannot prove production replay or all-faction opening coverage. Closing that gap requires separately authorized implementation of a read-only, source-owned input-contract reader and production-shaped frozen opening fixtures. The reader must enumerate every mutating action in order; bind actor, faction, turn, visible options, selection, receipt, and adjacent settled archives; and name the production replay serialization and consumer. Opening fixtures must declare fixed counter, choice, proposal, reserve, officer, and recruitment expectations for each faction rather than accepting a dynamic sample.

After that implementation exists, the proposed offline command is:

```text
node tools/diagnostics/player_input_contract_audit.cjs --result tmp-paradox-qa-20260710/paradox-local-qa-native-calibration-rbih-t39-20261024-03.json --manifest tmp-paradox-qa-20260710/evidence/native-calibration-rbih-t39-20261024-03/rbih/manifest.json --out tmp/player-validation-evidence-audit-20261024/input-contract-qualification-01/INPUT_CONTRACT_AUDIT.json
```

Pass requires a complete ordered transcript that the production replay path consumes without reselection, exact result/manifest/source provenance, and all three frozen opening fixtures passing. Stop on the first missing, unordered, unbound, or non-replay-consumable action class, or the first faction whose frozen opening set cannot be proven; record `MISSING_REPLAYABLE_INPUT_CONTRACT` or `OPENING_CONTRACT_UNQUALIFIED` and do not launch or retry native. No valid existing native command can currently satisfy the same-input gate because no production replay-input consumer is demonstrated.

The audit preserved all required hard gates. It grants no source-conditioned waiver, no protected-choice exception, no 700-point floor, and no substitution of n94, Save/load, or shared package provenance for player campaign evidence.
