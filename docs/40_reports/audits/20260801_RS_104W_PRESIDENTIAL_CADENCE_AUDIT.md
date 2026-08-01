# RS 104-Week Presidential Cadence Audit

**Date:** 2026-08-01
**Scope:** FR-04 from the RS 104-week friction-remediation plan
**Status:** Diagnostic, source audit, paired all-faction 104-week replay, and FR-05 Electron viewport proof complete; fresh integrated owner acceptance remains pending

## Outcome

The cadence repair does not add a fictional presidential initiative. The available event and scenario inventory did not support a new historically grounded lever in the identified quiet intervals. Instead, the implementation adds a deterministic, read-only cadence report, keeps ordinary emergent work and notices from masquerading as sourced presidential judgment, and allows an interval to close only through an exact, evidenced positive-hold disposition.

The existing RS turn-104 diary save freezes 44 decision receipts:

| Classification | Count | Closes sourced cadence gap |
| --- | ---: | --- |
| Required authored | 12 | Yes |
| Optional source-backed | 16 | Yes |
| Ordinary emergent | 11 | No |
| Notice | 5 | No |

The source-backed sequence has a maximum 23-turn gap. Four exact intervals are intentionally quiet and carry positive-hold evidence: turns `17-40`, `41-56`, `56-69`, and `76-89`. All four are resolved as holds in the frozen RS diagnostic; no generic initiative or automatic Authority spend is introduced. The Milosevic notices at turns 54 and 68 and the Zivanovic personnel arrival remain visible records but do not close a source-backed gap.

## Paired all-faction replay

Two fresh, sequential runs of `apr1992_definitive_104w` reached turn 104. Their final saves, summaries, weekly reports, operation AARs, manifests, formation/control deltas, and temporal logs are byte-identical. Only `run_meta.json`, which records the chosen output directory, differs. The final-save SHA-256 is `d83d10c983da384dd7f0e5f957da69e346f9d50df788e4fac8a90923b8260ccc`; the cadence reports generated from each save are also byte-identical at SHA-256 `647ee513bca77f800de5db469801419258e5ec5acabe09c1013ae57ac6d4018f`.

The fresh save contains no resolved player proposal reviews, so its optional-source-backed count is zero. That is expected for a headless all-faction projection and is why the owner-play RS fixture remains the acceptance evidence for historical operation authorizations. The headless report uses its own exact all-faction hold fixture; it does not reuse or approximately match the different owner-play endpoints. All eleven headless long gaps resolve as evidenced positive holds, with zero unresolved gaps and zero invalid hold IDs.

| Faction | Required authored | Optional source-backed | Ordinary emergent | Notice | Maximum sourced gap | Exact long-gap intervals |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| RBiH | 17 | 0 | 8 | 0 | 18 | `20-38`, `40-54`, `54-70`, `82-97` |
| RS | 12 | 0 | 8 | 3 | 23 | `17-40`, `40-56`, `56-70`, `76-89` |
| HRHB | 18 | 0 | 22 | 2 | 15 | `40-51`, `52-65`, `87-102` |

These intervals are the explicit positive-hold inventory from the clean replay: the historian/source review found no supported additional presidential lever within them. They are not permission to fabricate an event, treat a notice as a decision, or spend Authority automatically. The small endpoint differences from the player fixture (for example, RS `40-56` instead of `41-56`) reflect the absence of resolved player historical-operation proposals in the headless save.

The RBiH `82-97` hold ends at turn 97 on `event:rbih_nato_ultimatum_compliance_1994`. It does not end on the separate Washington Agreement response at turn 102. The retained bundle now declares both endpoint turns and the exact receipt IDs, and the reporter rejects a hold when either declared receipt set differs from the computed source-backed gap even if its turns still match.

## Positive-hold source inventory

Each frozen RS hold resolves to this stable report anchor and to the owner-play diary. The review checked the event catalogs in `data/scenarios/events/war_1992.json`, `war_1993.json`, and `war_1994.json`; the historical-operation catalog in `data/scenarios/historical_operations.json`; and the durable player receipts preserved in `docs/40_reports/playtests/20260731_rs_104week_player_diary.md`. An interval is a hold only when its exact source-backed endpoints match the cadence report and the intervening inventory contains no supported executable presidential lever.

| Frozen RS interval | Source-backed endpoints | Intervening records reviewed | Disposition |
| --- | --- | --- | --- |
| `17-40` | turn 17: `event:concentration_camps_revealed_1992`, `proposal:herzegovina_consolidation`; turn 40: `peace-plan:vance_owen:RS`, `proposal:cerska_kamenica` | Milosevic isolation notice, reserve/personnel acknowledgements, and ordinary command-presence work | No additional sourced presidential lever; preserve current policy. |
| `41-56` | `proposal:pracha_river` -> `event:rs_assembly_rejects_voplan_1993` | Turn-54 Milosevic acknowledgement and ordinary emergent work | Notice only; no presidential signature or invented initiative. |
| `56-69` | `event:rs_assembly_rejects_voplan_1993` -> `proposal:trnovo` | Turn-68 Milosevic acknowledgement and ordinary emergent work | Notice only; the next supported executable authorization is the turn-69 Trnovo operation proposal. |
| `76-89` | `event:rs_belgrade_pressure_response_1993` -> `event:rs_autonomy_path_decision_1993` | Personnel/reserve acknowledgements and ordinary command-presence work | No additional sourced presidential lever before the autonomy-path decision. |

The owner fixture's admitted evidence inventory contains repository-relative paths, optionally followed by this Markdown anchor. `tests/rs_104week_decision_cadence.test.ts` resolves every referenced path and anchor, and separately freezes the exact eleven-interval headless inventory in `tests/fixtures/diagnostics/all_faction_104week_headless_positive_holds.json`. The pure reporter rejects any hold that cites an ID outside the caller's admitted inventory. An invented or orphaned audit label therefore cannot satisfy the evidence contract, and an owner-play endpoint cannot silently close a different headless gap.

## Diagnostic contract

`src/sim/presidency/presidential_cadence.ts` owns the pure projection and report. It:

- distinguishes `required_authored`, `optional_source_backed`, `ordinary_emergent`, and `notice` receipts;
- aggregates event decisions, peace-plan dispositions, resolved proposals, officer decisions, reserve requests, convoy decisions, and paramilitary authorizations;
- normalizes and sorts receipts deterministically;
- computes source-backed turn gaps without treating routine work or notification traffic as authored judgment;
- validates positive holds against exact long-gap turns and exact endpoint receipt-ID sets, a non-empty rationale, and one or more IDs from the caller's admitted evidence inventory;
- reports invalid holds and unresolved gaps instead of silently accepting them.

## Retained-evidence caveats

The later R4 Task 2.2 replay manifest records `processCountAfterExit: 0` and summarizes deterministic stdout warnings, but those rows are manifest attestations: raw process-list snapshots and raw stdout/stderr logs were not retained. They support historical execution bookkeeping, not independent reconstruction of teardown or console bytes.

The three retained accepted `end_report.md` files are byte-identical and independently inspectable. Each contains `0` critical, `3` warning, and `11` info anomalies. The warning classes are `frontline_density_imbalance`, `undefended_painted_mismatch`, and `adjacent_uncontested_territory`; these are simulation-anomaly findings and remain distinct from presidential-cadence bugs or source-hold validity.

`tools/diagnostics/presidential_cadence_report.ts` reads a durable save and emits the same report for RBiH, RS, and HRHB. Generic command-presence rows are explicitly source-ineligible. The tool writes only when `--out` is supplied; it does not mutate the save or simulation.

## Historical disposition

The historian/canon review approved the report and explicit positive holds, but blocked new initiative rows from the current inventory. Authority near its cap is a reason to inspect eligible sourced content, not evidence for inventing a decision.

The same review found that the Operation Lukavac 93 material could not support any cadence work in its previous form. The corrected event and essay now record:

- the opening attack on 2-3 July 1993;
- approximately 10,000 VRS troops, not 15,000;
- the final assault on 31 July;
- the 5 August withdrawal agreement and 9 August phased NATO strike timetable;
- withdrawal of all but roughly 200 troops by 15 August;
- the player decision window at turns 69-71, with no late firing after turn 71;
- the independent August 9 NATO Council notice at exact turn 70, with no premature turn-69 firing and no withdrawal assertion before the RS response;
- *Balkan Battlegrounds*, volume II, pages 410-411 as the principal citation.

The unsupported `defy_nato` war-crimes delta was removed. This is a historical correction, not a new initiative or lever.

Both related Codex entries now keep their base essays pre-choice. Historical withdrawal chronology appears only after `RESPONSE:operation_lukavac_93:comply`; `defy_nato` receives campaign-divergence text, and a standalone NATO notice remains an authorization/pressure record with unresolved territorial disposition.

The twelve generic command-presence rows are now unambiguously once-only in natural event evaluation. Their former engine `recurrence` metadata moved to a separate `action_cadence` contract: strategic-posture metadata remains bounded at 8 fires / 8 turns, while visits, addresses, and decorations remain bounded at 5 fires / 10 turns. Existing desktop initiators consume that contract for visits, addresses, and decorations and fail closed when it is absent; the event evaluator ignores it. Therefore no generic row can naturally re-queue an Advance-blocking decision after its first occurrence. Their abstract or fictionalized provenance remains explicit and their receipt classification is `ordinary_emergent`, so a voluntary action cannot become source-backed or close a historical cadence gap.

## Verification

- cadence report, catalog audit, and frozen RS turn-104 evidence: 3 files / 16 tests green;
- combined priority, consolidation, cadence, Army HQ, Lukavac, event, and essay integration: 23 files / 424 tests green;
- committee-blocker repair proof: 5 files / 102 tests green; Codex index/resolver/localization/response proof: 7 files / 120 tests green; adjacent recurrence, ordering, pressure, acceptance, packaging, and cadence proof: 7 files / 82 tests green;
- player journeys: 44 files / 769 tests green;
- TypeScript: `npm.cmd run typecheck` green;
- canon static scan and strict baseline regression: green;
- tactical-map, desktop-simulation, and Warroom production builds: green;
- paired 104-week scenario replay: identical final state and substantive output artifacts across both runs.

Both scenario runs emitted the same two unresolved-assignment warnings for `rs_65th_protection_motorized_regiment`. The final save remained deterministic; this is retained as an existing diagnostic anomaly and is not reclassified here as a confirmed product bug.

No package/installer, baseline refresh, package/version/tag, or release action was performed in this packet. An isolated unpackaged Electron proof loaded the immutable RS turn-104 save and passed FR-05 at physical 1920x1080 and 3440x1440 viewports with zero unexpected runtime diagnostics, unchanged repository/source saves, verified process-tree exit, and remote-debug port cleanup. The [evidence packet](../playtests/evidence/20260801_r2_fr05_viewport_1920_3440_v6/README.md) records the exact DOM, screenshot, hash, process, and cleanup assertions. A fresh integrated owner diary remains a parent-coordinated acceptance gate; the prior diary's `3/5` President-feel score is unchanged.
