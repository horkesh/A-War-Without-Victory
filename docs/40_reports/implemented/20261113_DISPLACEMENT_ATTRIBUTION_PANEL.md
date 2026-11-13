# Displacement attribution: panel record and implementation (2026-11-13)

**Lane:** follow-ups 1-3 of the sensitive-copy lane (`20261113_SENSITIVE_COPY_LANE_PANEL.md`; out-of-scope register SC1, SC2, SC3, SC7).
**Canon record:** `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` §1 Ring 1 (displacement), §2a(ii)(b), §4 (responsible party), §6 "Record (Displacement attribution, 2026-11-13)". Also `VICTORY_AND_PYRRHIC_SCORING.md` (condemnation source 2), `Engine_Invariants_v0_9_0.md` §14.8a item 12, `Systems_Manual_v0_9_0.md` §12.2, `docs/40_reports/REAL_WAR_MASTER.md` (open FAIL).
**Authority:** owner-delegated Pyrrhic panel sign-off. `caused_by` feeds the §2a(ii)(b) condemnation input, so the lane convened the broader bright-line panel (AGENT_WORKFLOW.md): eight independent seats, implementer excluded, lane lead integrating without a vote. The packet is visible to the owner in the PR.

## What the lane found first

| Finding | Evidence |
|---|---|
| The pressure path in `updateDisplacement` (supply starvation, encirclement, breaches) never fires in a campaign | Instrumented 188w run: called every turn on 324 pools, 0 front edges every turn (it gets legacy `S…` settlement edges while control is keyed by `op:` OSIDs), `front_segments` empty, 0 displacement written; final hash unchanged by the instrumentation |
| `applyDisplacementFromFlips` is unreachable too | `early-control-flip` always sets `flips: []`, and `displacement-apply` is not in the war pipeline (Calibration and Engine seats) |
| Live `caused_by` has two writers, both naming the side that acted | `displacement_takeover.ts` books the side that took or held control (including war-start departures); `paramilitary_sweep.ts` books the sweeping side, after the sweep takes the settlement |
| Siege harm is not modelled anywhere | No writer records deaths from shelling, sniping or starvation |
| The two ledger "Killed" figures already agree in a real campaign | 188w baseline: `civilian_casualties` and the aggregates both give Croats 2,706, Bosniaks 33,903, Serbs 3,288 |
| They could disagree only through the dormant paths | `pushDisplacementEventLogFromMun` split each loss across peoples pro rata by displaced count, then rounded killed per settlement |

So the reason the sensitive-copy lane withdrew the responsible column (siege losses booked to the town's holder) was true of the code and of no figure a player has seen. The column could return honestly, labelled for what the live writers record.

## Panel

| Seat | Round 1 | Round 2 (integrated) | Round 3 (final strings) |
|---|---|---|---|
| Historian | GO-WITH-CHANGES (P1-B BLOCK) | GO (BCS "potcjenjuju" required) | GO |
| Scenario-tester / calibration | GO-WITH-CHANGES | GO | GO |
| Engine / systems | GO-WITH-CHANGES | GO | GO |
| Red-team | **BLOCK** P1 as drafted; BLOCK P4 if "Responsible"/"Against" kept | GO | GO |
| Game Designer | GO-WITH-CHANGES (P1-B, P2-B BLOCK) | GO | GO |
| Narrative Designer | GO-WITH-CHANGES ("Against" BLOCK) | GO, scope note BLOCK with replacement | GO |
| Canon Compliance | GO-WITH-CHANGES (P1-B BLOCK) | GO, record wording condition | GO |
| War-or-Game | GO-WITH-CHANGES (P1-B BLOCK) | GO | GO |

Result: **unanimous GO.** Every seat rejected a separate siege bucket (P1-B) and a no-people fallback (P2-B), because both let harm leave a side's condemnation input.

### Decisions that came from the seats

- **Holder, not pool (Red-team).** Every pool displaces the whole municipality, so the first draft, keyed on the pool's side, would have booked Srebrenica's Bosniaks to RBiH. The holder is the side controlling most of the municipality's OSIDs.
- **At war only (Red-team).** RBiH and HRHB are not each other's causers before their war or while allied.
- **Pro rata (War-or-Game).** East Mostar 1993-94 and Maglaj 1993-94 had two besiegers. Ties are shared, so no enum order assigns blame (Canon and Engine accepted this in place of "ties go to unknown").
- **No guess (Historian, War-or-Game, Canon, Engine, Red-team).** The country-wide fallback, which in practice would almost always name RS, was dropped. Without front contact or enemy-held OSIDs in the municipality, the harm is booked "not recorded" explicitly, so it cannot fall back to the origin controller. The Game Designer withdrew "never unknown" in round 2.
- **Same-side rows stay with the besieger (Historian, Game Designer, Engine; Red-team accepted in round 2).** *Galić* IT-98-29-A and *D. Milošević* IT-98-29/1-A attribute SRK fire to the SRK whatever the victims' ethnicity. A same-side ban would let the besieger shed SRK harm against Sarajevo's Serbs.
- **National census sums (Historian, Engine).** Integer floors; constants pinned to the file; documented as file sums, 16,940 short of the published 4,377,033 (Statistički bilten 234), with shares within 0.2 points. Tagged for audit. Slug test with `hanpijesak` pinned (War-or-Game).
- **Flips path to the losing side's people (Red-team).** The amount is sized from that people's share.
- **Exact P3 allocation (Engine).** No pro rata, no `Math.round`.
- **Control, not culpability (Red-team, War-or-Game, Historian).** The live takeover writer books war-start departures, including 10% of Serbs in RBiH-held urban Sarajevo, to the side holding the area. Header: "Side controlling the area"; victims: "People" (no claim of targeting).
- **Scope note (Narrative Designer round 3, Historian BCS words).** It removes the triad (owner rule). "Potcjenjuju" replaces "umanjuju", which read as minimising. It names Sarajevo and the direction of the gap.
- **Placement (Red-team, Game Designer, Canon).** Both notes sit inside the table block, above the rows.
- **Rows (Engine, Game Designer, Narrative, Canon).** Displaced-or-killed or killed > 0 only. Never `refugees_received`. "Not recorded" comes last and appears only when non-zero. No totals, no subtotals.

## What changed

| Item | Files |
|---|---|
| SC1 pressing side | `src/state/displacement.ts` (`resolvePressingFactions`, `splitAmountByCauser`, `killFractionForCauser`, pressure-path block), `src/state/displacement_event_log.ts` (`causerUnrecorded` option) |
| SC2 national split, flips path | `src/state/displacement.ts` (`NATIONAL_POPULATION_1991_SUMS`, `CENSUS_FALLBACK_NATIONAL_REASON`, `splitDisplacedByEthnicityWithSource`, `applyDisplacementFromFlips`; `LOST_POPULATION_FRACTION` removed) |
| SC3 exact allocation | `src/state/displacement.ts` (`pushDisplacementEventLogFromMun`) |
| Ledger column | `src/ui/map/components/HumanitarianLedgerPanel.tsx` (`displacedOrKilledBySide`), `humanitarianLedger.section.byPerpetrator`, `col.perpetrator`, `col.victims` (values), `note.scope` (new), EN and BCS |
| Comment | `src/sim/negotiation/scoring.ts` (§2a(ii)(b) premise) |
| Tests | `tests/state/displacement_attribution.test.ts` (new, 13); `tests/ui/sensitive_copy_lane.test.ts` (ledger block rewritten) |

Save format unchanged: no new state field. `appendDisplacementEvent` without the new option behaves exactly as before.

## Measurement

Each engine change was committed alone and measured. Baseline is unchanged `origin/main` `c1299da25`.

| Run | 40w hash | 188w hash | Checkpoints | Health gate | Six-field byte diff at 188w |
|---|---|---|---|---|---|
| Baseline | `44375b6b1484e128` | `2a2bb1ff54155f00` | 712/711/712/710 | PASS | n/a |
| P1 (SC1) | `44375b6b1484e128` | `2a2bb1ff54155f00` | 712/711/712/710 | PASS | identical |
| P2 (SC2) | `44375b6b1484e128` | `2a2bb1ff54155f00` | 712/711/712/710 | PASS | identical |
| P3 (SC3) | `44375b6b1484e128` | `2a2bb1ff54155f00` | 712/711/712/710 | PASS | identical |
| P4 (UI) | `44375b6b1484e128` | n/a | n/a | n/a | n/a |

The six fields were the aggregates, `civilian_casualties`, every `civilian_casualties_caused`, international standing, condemnation flags and fired events. Every run kept killed 2,706 / 33,903 / 3,288 in both fields, with no same-side causer rows.

Rendered proof is in `F:/AWWV-coordination/surface_steps/displacement_attribution/` (`humanitarian_ledger{,_bcs}_{2293x960,1280x720}.png` and `ledger_report.json`). The ledger was opened through its U hotkey in the running app. The 13 px floor holds and there is no horizontal overflow.

## Binding on later lanes (from the §6 record)

1. A lane that revives the pressure path or models siege harm must:
   - rewrite the scope note, the column header and the section title;
   - re-convene this panel;
   - show that whole-municipality pockets book to the besieger;
   - fix the per-pool triple processing first;
   - re-measure the 15,000 premise.
2. Consumers read the aggregates; they never re-derive blame from the event log.
3. Any hash change in a lane touching these paths stops it.

## Follow-ups (not in this change)

1. `hanpijesak` (OSID slug) vs `han_pijesak` (census key): every census lookup for Han Pijesak misses. Fix it as its own measured change.
2. HVO-against-Bosniaks realism FAIL (`REAL_WAR_MASTER.md`): 1,279 vs 43,267 the other way. The cause is the absent HVO-ARBiH war. Fix it in the engine, never in the ledger.
3. Optional copy precision (Historian): "recorded as Yugoslavs or others", because the 1991 "others" also covered undeclared people.
4. Pressure-path revival lane, under the binding conditions above.
