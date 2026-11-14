# Siege displacement and flight abroad: panel record and implementation (2026-11-14)

**Lane:** RF-3 (out-of-scope register DA1), with realism-audit finding F4 added by the orchestrator. PR horkesh/A-War-Without-Victory#600.
**Canon record:** `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` §1 Ring 1 (displacement), §2a(ii)(b), §4, §6 "Record (Siege displacement and flight abroad, 2026-11-14)". Also `VICTORY_AND_PYRRHIC_SCORING.md` §3.4, `Engine_Invariants_v0_9_0.md` §14.8a item 12, `Systems_Manual_v0_9_0.md` §12.2, `PLAYER_TURN_GUIDE.md`, `docs/20_engineering/DISPLACEMENT_MASTER.md`.
**Authority:** owner-delegated broader bright-line panel (the displacement-attribution record bound any lane reviving the pressure path to re-convene it). Eight independent seats, implementer excluded, lane lead integrating without a vote. The owner accepted the checkpoint loss (2026-11-14) inside an envelope set by the orchestrator.

## What was wrong

| Finding | Evidence |
|---|---|
| The siege path never fired | On a t188 save the war step's legacy `S…` edges give 0 front edges against 269 on the OSID graph; `front_segments` and `front_pressure` are empty; the legacy supply search reaches 0 settlements for every side |
| Each municipality was processed three times | 324 pools over 110 municipalities; every pool displaced the whole municipality's population |
| The siege counter lived in a module cache | Lost on save/load, leaked between games in one process |
| `applyDisplacementFromFlips` was unreachable | `early-control-flip` always reports `flips: []` |
| The dormant coefficients were absurd | Measured live (P2): displaced out 1.06M to 2.02M, Bosniak killed 33,903 to 54,611 |
| Bosniak flight abroad was 0 | "No external state to flee to": Bosniaks came out as the people least likely to leave (realism audit F4) |

`tests/state/siege_displacement_wiring.test.ts` drove the real war step: 5 of 7 checks failed on unchanged code.

## What changed

- **One pass per (municipality, side holding settlements there).** The war step feeds the OSID front (`computeFrontEdgesOsid`) and OSID supply (`computeSupplyReachabilityOsid`) through `buildOsidDisplacementPressureInputs`, which the F1 sweep can reuse.
- **Triggers.** Siege: the side's settlements touch an at-war front and none is supplied for 3 consecutive turns (counter per side with the turn last counted, `DisplacementState.unsupplied_pressure_by_side`). Encirclement: under front pressure, every held settlement in a body outside the side's main territorial body holding at most 15% (`POCKET_MAX_SHARE`) of its settlements at turn 0. A front that splits a side into two large regions is not a siege (the 1993 Tuzla region).
- **Rate.** 0.1% of the side's own people per week, the larger of the two triggers, never the sum (Krstić TJ ¶11, ¶14, ¶16: Srebrenica's 1991 population, its swelling to 50,000-60,000, and the 1993 UNHCR evacuations; UNCOE Annex VI; Tabeau 2002). The old 5%/10%/3% rates, the breach trigger and the ×1.5 sustainability-collapse multiplier are gone.
- **Attribution.** Booked to the pressing side (`resolvePressingFactions`, holder passed in), pro rata between two besiegers. Only the holder's own people leave; a pocket's minority leaving is booked by the takeover writer. None are killed by leaving; none go abroad; people with nowhere to go stay. Only the leaving side's pool loses manpower.
- **Flight abroad at the moment of displacement (F4, then F4b).** Bosniak default 0.20 (was 0.0); eastern Bosnia and the Sarajevo ring 0.08 (27 ids); Bijeljina, Posavina, Čapljina, Stolac 0.40; Krajina convoys 0.55 (was 0.35); the 0.10 border override is gone; Croats 0.40 (was 0.25); Serbs 0.30; Posavina Croats 0.70; Croats displaced by RBiH 0.35; nobody goes abroad when a Drina enclave falls. The ICTY OTP figures (Muslims 48%, Srebrenica 18%, Zvornik 45%) are 1997-98 registrations after onward migration, which the model does not have.
- **Ledger copy.** "Displaced or killed, by side controlling or besieging the area"; column "Controlling or besieging side"; the scope note adds "It also counts people who left an area held by their own side while the named side besieged it." and says siege killing is not counted (BCS in the canon record). "Fled abroad" is unchanged.
- **Farz guard.** Receipts count the authored operation's own cross-corps participants (the General Staff's 120th took Spreča inside Farz in one run); a Farz that really fails still fails.

## Panel

| Seat | Round 1 | Round 2 |
|---|---|---|
| Historian | GO-WITH-CHANGES | GO (pinpoint and wording fixes applied) |
| Scenario-tester / calibration | GO-WITH-CHANGES | GO-WITH-CHANGES (two record sentences) |
| Engine / systems | GO-WITH-CHANGES | GO |
| Red-team | **BLOCK** (minority-pocket gap; holder computed twice) | GO |
| Game Designer | GO-WITH-CHANGES | GO |
| Narrative Designer | GO-WITH-CHANGES | GO |
| Canon Compliance | GO-WITH-CHANGES | GO |
| War-or-Game | **BLOCK** on F4 (enclaves stopped filling) | GO |

Seat verdicts in brief:
- **Historian.** Round 1: attribution follows *Galić*, *D. Milošević* and UNCOE; 0.1% a week is bracketed by Krstić TJ ¶16 and Sarajevo after 1992; July 1995 was forcible transfer, not evacuation. Round 2: Krstić pinpoints corrected (¶11, ¶14, ¶16); the F4b regional shares approved; keep "Fled abroad".
- **Scenario-tester / calibration.** Figures verified run by run. Asked for the P4 sentence, a statement of the RBiH recruitment lever, the premise worded "unchanged and still open", and no flight abroad when an enclave falls.
- **Engine / systems.** Determinism confirmed. Asked for a per-side counter that restarts on a gap or a change of holder, the holder passed in, holder-only pool reduction, and tests for each.
- **Red-team.** Round 1 BLOCK: a minority-of-municipality pocket never fired, and two holder computations could disagree. Both fixed in P6; GO in round 2, with SD11 recorded.
- **Game Designer.** No perverse incentive. Canon had to move in the same change.
- **Narrative Designer.** Final EN/BCS strings; dropped its "Displaced abroad" proposal in round 2.
- **Canon Compliance.** Listed every canon passage to amend and the contents of the §6 row. Round 2: all passages true of the code.
- **War-or-Game.** Round 1 BLOCK on F4: a flat 0.40 emptied the enclaves. F4b resolved it; GO in round 2.

## Pyrrhic merge gate (2026-11-14)

The gate had four independent seats: canon compliance, determinism auditor, historian and war-or-game. All four returned GO WITH CONDITIONS on head 44aa96ed5.

Conditions:
- re-measure on main after RF-2 (#604) and reproduce the hash, inside the owner-accepted envelope (total shortfall at most 10; Jan93, Apr94 and Apr95 at most -2 each; Oct95 at most -8; battles per week total drop at most 5% and RBiH at most 8%; consistency 0);
- regenerate the PR's tables from the final run;
- add to the §6 record that this panel's GO clears binding (3) of the 2026-11-13 record;
- record the Goražde shortfall;
- log ARBiH holding Prozor in `REAL_WAR_MASTER.md` (the HVO held Rama throughout, BB1 p.195, p.217);
- state whether the final run passes the old corps-only Farz reading;
- CI green.

Standing question: main's matched cells were calibrated while the siege path never fired and Bosniak flight abroad was 0. War-or-game spot-checked Prozor (an operation choice) and Varosluk (launch timing of "Donji Vakuf 95"). No control writes, scripted captures or cuts in battle frequency were found. The Farz read-fix counts only Farz's own logged cross-corps participants, and real failures still fail.

Battles per week (orchestrator ruling): the 5% line applies to the total. RBiH's -5.3% at F4b is accepted, because it is an emergent effect of the sourced manpower correction; no battle-generation code changed. The figures are re-checked at the final run.

## Measurement (188w)

| Run | Change | Hash | Jan93/Apr94/Apr95/Oct95 | Health |
|---|---|---|---|---|
| baseline `0450a2e8d` | | `0ec6d6112fd0e954` | 712/711/711/710 | PASS |
| P1 | delete flips path | identical | 712/711/711/710 | PASS |
| P2 | wiring, old rates | `5d60779eb68b0be8` | 710/705/703/705 | FAIL |
| P3 | sourced rates | `0d72d57e401cb5cb` | 712/711/711/709 | consistency 4 |
| P4 | drop ×1.5 | `d66fdf4a8448473d` | 712/709/707/700 | guard breached |
| P5 | pockets only | `93cfcbe7dbb2d325` | 712/709/707/703 | PASS |
| F4 | flight abroad (flat) | `1dcf801a1f804c13` | 711/710/710/703 | PASS |
| P6 | panel engine fixes | `1bf1f66936637a69` | 711/710/709/707 | PASS |
| F4b | regional flight abroad | `efe1b8555b16029f` | 712/709/710/707 | PASS, consistency 1 (SE7 signature) |

P4 measured alone (run n5) breached the checkpoint guard (712/709/707/700: Farz Spreča receipt missing, unwarranted late captures at Doboj Boljanić and Gračanica Petrovo); P5 cured it.

Humanitarian figures at F4b: killed Bosniak/Serb/Croat 33,903 / 3,293 / 2,718 (baseline 33,903 / 3,308 / 2,706); fled abroad 207,595 / 107,695 / 125,343 (baseline 88,732 / 108,077 / 109,012); "not recorded" 0. Enclave end populations: Srebrenica 54.9k (history 50-60k), Goražde 45.1k. Pockets book to the besieger (P5: Sarajevo +33.8k, Goražde +1,735, Srebrenica +883, Bihać +319, Orašje +1,540 to RS; Kiseljak and Žepče pro rata).

Flight abroad also drains the RBiH manpower pool: at F4b committed militia ends at 768k against 868k on main, so later calibration must count it as a recruitment lever.

Moved cells at F4b (owner-accepted envelope; per-cell table in the PR body): Apr94 and Apr95 Prozor `lug_2` and `paros` (one "Operacija Ponos" choice, t77-81); Apr95 Travnik `gornje_krcevine` gained; Oct95 the Prozor pair and Travnik `varosluk` (not retaken in "Donji Vakuf 95"). Defect dependency: main's cells were calibrated with the siege path dead and Bosniak flight abroad at 0.

## Known limits and open items

- Siege deaths in place (shelling, sniping, starvation) are not modelled (SD6); the §2a(ii)(b) 15,000 premise is unchanged and still open.
- The siege base excludes refugees in the pocket, and weekly amounts floor; Žepa qualifies but rounds to 0 a week (SD9).
- Some Sarajevo convoy and tunnel leavers went abroad; Orašje's Sava crossing led to Croatia; Abdić's followers left the Bihać pocket for Croatia. The model sends none abroad from a pocket.
- Onward migration is not modelled; total abroad stays ~0.44M against ~1.2M (SD10). Novo Sarajevo receives no arrivals (SD12).
- Routing has no supply or connectivity check (SD7); a pocket that grows into its side's largest body cannot count as encircled (SD11).
- Sustainability, negotiation pressure and the front-segment readers still run on legacy edges (SD2, audit F1).
