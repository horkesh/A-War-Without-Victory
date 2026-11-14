# Ending truth pass: §4 sensitive-copy panel record

Lane: R8 council fix 1, "Make the ending tell one true story" (council diary
`docs/40_reports/playtests/20261114_r8_dry_rbih_council_diary.md`, B1-B9, C1-C4, C8, H1-H3, B2).
Implementer: the lane lead (no vote). Seats: independent Agent subagents. Facts: a prior historian
ruling (ICTY first, then BB); scoring: a prior game-designer ruling ("C").

| Round | Historian | Narrative Designer | Canon Compliance | Red-team | Game Design |
| --- | --- | --- | --- | --- | --- |
| 1 | GO-WITH-AMENDMENTS | GO-WITH-AMENDMENTS | GO-WITH-AMENDMENTS | BLOCK (B1, B2) | GO-WITH-AMENDMENTS |
| 2 | GO-WITH-AMENDMENTS (3, applied) | GO-WITH-AMENDMENTS (6, applied) | GO-WITH-AMENDMENTS (2, applied) | BLOCK (R1 basis string; R2 `visit_to_front_hrhb`) | GO-WITH-AMENDMENTS (applied) |
| 3 | — | — | — | **GO** (after R1, R2 and a missing-id test pin) | — |

**Result: unanimous GO.** Record row: `SENSITIVE_HISTORY_DESIGN_GATE.md` §6, "Ending truth pass".
Canon: `VICTORY_AND_PYRRHIC_SCORING.md` §2, §3.5a, §3.6. Guard: `tests/ui/ending_truth_pass.test.ts`.

Round-2 amendments applied after the table below was written: the cap sentence says "For this side,
counting only its own condemnation, the signed settlement scores {index}…" when a grade trace exists
(older saves keep the settlement-wide wording); both Srebrenica divergence notes name the victims;
BCS war-crimes card "Broj ratnih zločina zabilježenih u ovoj kampanji ({forces}): {events}."; BCS
"U historijskom ratu" for "Historijski,"; BCS Srebrenica finding sentence aligned with the signed
receipt; "authorized" spelling; `verdict.basis.displacedBooked` = "Displaced or killed in areas this
side took, held or besieged, this campaign"; `visit_to_front_hrhb` excluded; canon §3.6 wording on
the Dayton modal's structural floor and on the ≥80 band changing no class today.

## Round 2 integration (as sent to the seats)

**Final strings, EN and BCS:** the block marked `R8 council fix 1: ending truth pass` at the end of
`src/ui/map/i18n/messages.en.ts` and `src/ui/map/i18n/messages.bcs.ts`, plus these changed existing
keys: `dayton.signing.date`, `dayton.capWarning`, `dayton.capActive`, `verdict.condemnation.genocide`,
`warCost.divergence.srebrenicaOccurred`; `verdict.footer.tagline` is deleted (EN and BCS).
English finding text in the engine equals the EN keys (`src/sim/endgame/cost_ledger.ts`).

## Blocks resolved

**B1 (red team), and Q-A (4 of 5 seats: structural-only; narrative designer accepted the pooled
term with a disclosure line).** Adopted the majority rule, in every decision mode: the reading that
caps a side's outcome counts only that side's own rupture flags, both in its condemnation term and
in its `ratified_cleansing` flag (`computePeaceDysfunctionBreakdown(state, ownFaction)`,
`src/sim/negotiation/peace_dysfunction.ts`; `computeFactionVerdict`, `src/sim/negotiation/scoring.ts`).
The ICTY non-cooperation floor stays in the index (a settlement term) but no longer sets the flag
for a side. The settlement-wide reading is unchanged for the snapshot, the Dayton result and the
Dayton room, and the grade trace records both (`peace_dysfunction_index` per side,
`settlement_peace_dysfunction_index`). Effect: RBiH and HRHB can never be capped, nor failed at ≥80,
for the Srebrenica genocide; the perpetrator's reading is unchanged (genocide already forces
Failure). This also changes emergent mode (the desktop default), where the pooled flag could fail
RBiH; no calibration run reaches a signed Dayton (188w ends at turn 188, game_over false), so no
baseline moves. Narrative designer: your disclosure line is no longer needed, because another
side's crime no longer adds points to this side's index; the Dayton room hint says "Only this
side's own condemnation counts toward its index."

**B2 (red team).** `isSensitiveDecisionEvent` (`src/ui/map/data/verdictDecisions.ts`) now also
excludes any event whose title, narrative or option label/description, in any locale, matches the
red-team regex; harm effects are read at event level and option level (game design A4), any
`war_crimes_delta` counts; the Sarajevo heavy-weapons events are excluded by id (canon compliance
#2). Test pins the six named ids (`dayton_talks_begin_1995`, `rbih_late_war_offensive_1995`,
`rbih_nato_ultimatum_compliance_1994`, `nato_ultimatum_sarajevo_1994`, `visit_to_front_rs`,
`strategic_posture_review_rs`) and every bundled multi-option event that books harm.

## Amendments, as integrated

| Item | Adopted text or rule (EN; BCS in the catalog) | From |
| --- | --- | --- |
| Hollow (signed settlement) headline | "{side} ended the war in a hollow peace" / "{side} je rat okončala praznim mirom" | ND A2, RT A5 |
| Hollow (own §2a condemnation) headline | "{side} ended the war under condemnation for harm to civilians in this campaign" (no "international", no "gained ground", no "expulsion": the trigger counts killed civilians and authorized sweeps) | ND A3, CC 3-4, Hist A8-A9, GD A1, RT A4 |
| Genocide headline (perpetrator) | "{side} ended the war in failure: its forces committed the Srebrenica genocide" (no court convicted the entity) | RT A3, Hist A1, ND A4 |
| Failure (other) | "{side} ended the war in failure" / "… neuspjehom" | ND A5, RT A5 |
| Sentence (a) | "Its war record is graded {grade}; the signed peace caps the outcome at {outcome}." | ND A6 |
| Sentence (b) | split by band: hard (≥60) "… at 60 or more no outcome stands as a clean result."; soft (45-59) "… from 45, Strategic Success is held to Survival."; failure (≥80, own flag only) "… from 80, with this side's own condemnation, no outcome is better than Failure." No "by design". {index} is this side's own reading. | ND A7, CC 1, GD A2, RT A1 |
| Sentence (c) | victims named in every variant; no "gravest loss"; RBiH: "… against Bosniaks, citizens of this Republic, stands permanently in the record of this war."; rendered on its own line, never joined after a cap sentence (screen and share text) | ND A8, Hist A6, RT A2 |
| Cap chip BCS | "Prazna pobjeda" (matches the shipped label) | ND A1, RT A5 |
| Standing-score heading | "Standing score (context; the grade is not computed from this total)" | GD A3 |
| Ceasefire line | "… Historically, the country-wide ceasefire came into force on 12 October 1995." | Hist A4 |
| RDC lines | "killed or missing", "Research and Documentation Center, Sarajevo, 2007" (June 2007 release); civilian line adds "People killed by shelling or in sieges, including the siege of Sarajevo, are not counted in this campaign's figure." | Hist A5, RT A6 |
| Territory line | reads the signed settlement's shares (every cell), front line otherwise; the unsourced "RS about 46%" ceasefire share is removed from the data and the copy | RT A7, Hist A10 |
| War-crimes card | count only: "This campaign recorded {n} war-crime events by {forces}."; cards in fixed RBiH, RS, HRHB order, never by count | RT A8, CC 5 (Hist A7 / ND A9 wording superseded by dropping the sentence) |
| Paramilitary card | "… paramilitary deployments authorized by {command}. Each is recorded as a war-crimes finding." ({command} = badge names) | ND A11 |
| Srebrenica finding | second sentence "Historically, after the safe area fell in July 1995, …"; sources prefixed "ICTY and IRMCT:" | ND A10, Hist A3 |
| Genocide label | "Its forces committed the Srebrenica genocide (found by the ICTY and the ICJ)" | RT A3, Hist A2 |
| §2a label | "Condemned for harm to civilians across this campaign: civilians killed in areas its forces took or held, or by paramilitary actions it authorised (an assessment of the whole campaign, not of a single event)" | CC 3, Hist A8 |
| Signing beat | EN "The parties initialled the agreement in the week of {date}." + record line with the full agreement name and "near Dayton"; BCS per ND A12 | ND A12, Hist (round 0) |
| Decisions note | "… Decisions that touch war crimes, camps, paramilitary policy, the safe areas, enclaves or sieges are never ranked." | CC 2, GD A4, RT B2 |
| Duration notes | the comparison no longer writes "War lasted N weeks shorter/longer"; the Verdict dates the end of the war instead | GD A5, RT A9 |
| "Srebrenica genocide occurred" | shown as "The Srebrenica genocide, committed by Bosnian Serb forces, is recorded in this campaign."; "enclave survived" only for a war that reached turn 160 | RT A9 |
| Q-B | the comparison stops writing rupture milestone rows at source; the Verdict and the Codex reader also drop them for older saves (the Codex sections conditioned on the row stay hidden; enclave_defended records the counterfactual) | all seats |
| Q-C | footer tagline deleted, EN and BCS, no replacement | all seats |
| Canon records | VICTORY_AND_PYRRHIC_SCORING.md §2 table, new §3.6, §3.5a line; SENSITIVE_HISTORY_DESIGN_GATE.md §6 record row; Amended headers | CC 7 |

## Not adopted in this lane (reported to the orchestrator as out-of-scope findings)

- Codex essay `{casualty_ratio_pct}` ("casualties at N percent of the historical baseline") and the
  `CASUALTY_ABOVE:1.1/1.2` gates, which now read military dead over historical military dead
  (57,523) instead of over all deaths (RT A9): Codex content lane.
- The Wrapped slides' second person and duration notes (2026-11-13 record): Wrapped lane.
- The t184 Dayton card states 21 Nov 1995 before the player could know it (historian, round 0):
  fix 3 lane (future-telling cards).
