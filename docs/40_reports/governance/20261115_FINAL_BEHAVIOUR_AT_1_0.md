# Final behaviour at 1.0

**Date:** 2026-11-15
**Authority:** owner rulings of 2026-11-15 (no engine change after 1.0; a finished game reproduces history if left alone and lets the player create ahistorical outcomes); orchestrator ruling on Fable consult 2, revision 2 (`fable_consults/2_freeze_cut.md`, "Appendix A, revised"); `RF-ENGINE-FREEZE` condition 5 in `docs/open_gates.yml`.
**Status:** record for the freeze. Section 1 is ratified. Sections 3 to 5 list what is not accepted and what the sitting found; the freeze commit re-checks the cell lists against the frozen run before this record is final.

## The test every accepted item passes

> "A finished game will reproduce history accurately if left alone, BUT also allow the player to create ahistorical outcomes." (owner, 2026-11-15)

Each item accepted as final has two answers.
- **Left alone:** does it keep hands-off and bot runs historical?
- **Played:** does a player keep real agency over it?

An item that removes player agency is not accepted as final. Accept-as-final is narrow: it is right for a finished game, and cost is never the reason. Dead paths, saturating formulas and code that contradicts its documentation are fixed or retired.

## 1. Accepted as final (game-designer and historian, one sitting, 2026-11-15)

Two fresh read-only seats sat in parallel and independently, each checking the code and canon in the repository. Both returned RATIFY WITH CONDITIONS on all four items. Three of the four reasons in the memo were wrong or too wide and are corrected below. The conditions are open work, listed in section 6.

### CODE3. Authored and triggered operations are not exhaustion-gated

- **Reason for the record.** Authored and triggered operations are scripted history, and exhaustion in this game is a cost, not a veto: they launch on schedule and book +15 corps exhaustion (`sector_offensive.ts:3225`), after which the corps is barred from discretionary plans. The exhaustion gate (`MAX_EXHAUSTION_FOR_OPERATION = 30`) covers discretionary commander plans only. Historical staffs launched dated operations while worn (Zvezda 94 opened its preparation on 28 March 1994, BB2 pp.478-479; Krivaja 95 was a dated set-piece, BB1 p.443).
- **Left alone:** yes. Bots launch dated operations on schedule.
- **Played:** yes. The President can stop a live operation (stop-op, 25 command authority and a patron penalty), request one (25) or author one (25), and may force an operation over a commander's shown objection at a patron-confidence price. A player faction's historical operations are born authorized, opt-out (`historical_operation_authorization.ts`).
- **Canon line to add:** "Authored and triggered operations are scripted history and are not exhaustion-gated; discretionary commander plans are gated; exhaustion is booked as a cost; the player's counter is stop-op."
- **Conditions.** The line says the gate covers only discretionary plans, not "all operations". Before the line says "any live operation", someone checks that a halt order is accepted while an operation is still in planning (neither seat read `findLiveOp`).
- **Seats:** game-designer RATIFY WITH CONDITIONS; historian RATIFY WITH CONDITIONS.

### RB5. No expulsion-policy waves for a human HRHB President

- **The memo's reason was wrong.** "The player authors that policy" is false: no player lever or card exists in 1.0 (`SENSITIVE_HISTORY_DESIGN_GATE.md:140`, `displacement_takeover.ts:143`; the RB3 card is later). The real reason is the §6 bright-line ruling of 2026-11-14, that a player is never made a perpetrator by default.
- **Reason for the record.** A human HRHB government does not run the 1993-94 expulsion waves, by a §6 panel decision. No player card exists in 1.0. A human HRHB war is cleaner than history by design.
- **Left alone:** a hands-off human HRHB President gets no waves, so history is absent by omission. This is accepted for a player-controlled HRHB only, and only because of the §6 ruling.
- **Played:** the player can restrain, and an ahistorical outcome is always available, but the historical policy cannot be chosen. The owner's principle asks for the first; the second is withheld on purpose.
- **Extent.** `hasMinorityExpulsionPolicy` returns false whenever `player_faction === faction`, at any autonomy, so staff-controlled and Observer levels (autonomy 1 to 3) also get no waves. Both seats want autonomy 1 and above to run the bot policy; that extends Part 3's Observer-level fix and is a fix, not an acceptance.
- **Conditions.** The reason text above replaces the memo's. No Verdict, ending or ledger copy may present the missing waves as the player's restraint, or imply the minority was treated gently (not checked: whether the displacement comparison against history does this). The Observer and staff-controlled cases are the separate fix.
- **Seats:** game-designer RATIFY WITH CONDITIONS; historian RATIFY WITH CONDITIONS.

### PK5, the no-retry half. Authored operations do not retry

- **Reason for the record.** An authored operation is one historical set-piece and the scenario does not re-run it when it fails. Retries belong to the corps' discretionary planner, and to the player, who can re-author or request the same target (25 each).
- **Left alone:** yes for the set-pieces, and Zvezda 94 already holds its own pause and resumption (28 March to 10 April, then 15 to 20 April; BB2 p.479). History did repeat attempts within weeks at Vozuća and Ozren (June and July 1994, August 1994, September 1995; BB1 pp.422-423, BB2 pp.506-508), at Zuc and Trebević (BB1 p.190, BB2 p.428), at Donji Vakuf from October 1994 (BB2 p.486) and at Bihać (BB2 pp.546-549). A single attempt is wrong for the 1994-95 Vozuća, Teslić, Ozren and Donji Vakuf fights, which are ARBiH and are not authored today.
- **Played:** yes.
- **Conditions.** Accept only the no-retry half. The other half of PK5, a queue head below its floor blocking the corps chain, is a defect and is fixed as C7. The retry duty for the 1994 ARBiH fights is met by the package (the planner, P5) or by authoring the 1994 Teslić and Vozuća attempts in the calibration pass (Part 6).
- **Seats:** game-designer RATIFY WITH CONDITIONS (narrowed); historian RATIFY WITH CONDITIONS.

### SD6 and SD8. Siege deaths in place and military-age departures are not modelled

- **Reason for the record.** A scope choice. The siege path books displacement only (0.1% a week, "none killed"; §6 panel record in `SENSITIVE_HISTORY_DESIGN_GATE.md`, unanimous GO, 2026-11-14). The omission understates harm; it does not claim that nobody died. Formation siege attrition does exist (`siege_attrition.ts`).
- **Left alone:** bot runs show Sarajevo, Goražde, Srebrenica and Bihać emptying and never killing. Goražde ends near 45,000 against 60,000 to 65,000 (SD13, in batch A). The knowledge base holds no Sarajevo siege-death figure, and the Galić judgment figures are not verified.
- **Played:** no agency is lost. Siege onset needs 3 turns unsupplied under front pressure, so a breakout or a corridor lifts it, and the player's siege and relief actions still move supply and displacement. The omission removes a cost, not a choice.
- **Player text, grepped by the game-designer seat.** Three strings already disclose the gap, in English and BCS: `humanitarianLedger.note.scope`, `verdict.compare.civilianDead`, `verdict.basis.campaignAllSides` (`messages.en.ts:6445, 6761, 6802`). No player-visible text claims siege deaths or military-age departures in `src/` or `data`. The Verdict is unaffected (`civilian_casualties_full` is deliberately 5,000 against about 39,684 real dead).
- **Conditions.** Keep those three strings in English and BCS. No UI shows a Sarajevo or siege civilian-death number as simulation output. No player-facing text equates the displaced count with casualties or says nobody died. The `scoring.ts:172` premise (15,000 compared against about 3,500 to 5,500 Sarajevo dead) rests on a quantity the engine does not model and stays an open note. SD8's military-age exit bar for Sarajevo is not verified against a source.
- **Seats:** game-designer RATIFY WITH CONDITIONS; historian RATIFY WITH CONDITIONS.

## 2. The ARBiH plan lockout (army-wide): fixed in the package, not accepted

The lockout was first filed as RF-3C-EXH. An earlier sitting (historian, scenario-creator-runner-tester, game-designer, 2026-11-15) ratified deferring it, each AGREE WITH CONDITIONS; the owner's ruling that no engine change follows 1.0 supersedes that deferral. Its findings stand and are kept here.

**What the run shows (RF-ROSTER 188-week run, 709/709/708/681).**
- In weeks 91 to 143 ARBiH corps 1 to 4 ran 83 probes and 3 real operations. At week 188 their exhaustion reads 89, 57, 97 and 67; every VRS corps reads 2 or below.
- After the 7th Corps split at week 99 the 3rd Corps made 1 commander plan in weeks 99 to 178 (12 on main without the split). The 1st, 2nd and 4th Corps also made no commander plans on main in that window, so the lockout is army-wide.
- The #686 trace shows the cause: the exhaustion gate, fed by the corps' own probes. `buildProbeOperation` adds +5 exhaustion each (17 to 30 probes per corps over weeks 99 to 178). A probe is active on most turns, so exhaustion decays at the active rate of 1 a turn instead of the idle rate of 3, inflow outruns decay, and exhaustion stays above the gate of 30. Probes are exempt from the gate, so the loop sustains itself. The 5th and 7th Corps run named operations (+15) with idle decay in between, and keep planning. RF-STRENGTH's replacement churn writes no exhaustion.
- The gate that would end it was designed and never wired: `PROBE_EXHAUSTION_MARGIN = 10` exists with a test, and nothing calls it (CODE2). Wired into the no-plan probe branch (`commander/emit.ts`, about line 2889) at the designed gate of 40, it ends the loop (Fable's throwaway run).

**Why it is not simply switched on.** In Fable's runs a woken 1st to 4th Corps won 16 of 17 operations, 11 of the 12 with a reported launch ratio at 2.8:1 or more (highest 56:1), many against barely defended cells (Vitez town and Busovača fell to one or two brigades in one attack). Vozuća fell at week 127; history has it at week 180. Both fixes together cost 38 cells, in two groups (Ozren, Doboj and Teslić with Farz's four objectives a year early; Trnovo, Kalinovik and Nevesinje), and broke Farz P-A and P-B. Two earlier experiments (RF-1 step 7 and RF-AI2 D2) also breached Farz through Ozren. So the defence is repaired first. The order is the package of the roadmap's BC19 row: a defence trace, the defence repairs, planner odds, RF-STRENGTH's live change, the probe gate (P5).

**Cells that match today because of the lockout (checkpoint, from the #591 record).** They are expected to move honestly when the package lands.
- October 1995 (t188), RS-held: `doboj:boljanic_2`, `doboj:bukovica_velika_2`, `doboj:makljenovac`, `gracanica:petrovo_2`, `teslic:blatnica_2`, `teslic:kamenica_2`, `teslic:vitkovci`. A freed 3rd Corps took Boljanić at t162 and Petrovo at t163.
- April 1995 (t156): `maglaj:donja_bocinja_2`, `maglaj:gornja_bocinja`, `zavidovici:vozuca_2`, `lukavac:brijesnica_donja_2`. Exposure here is not demonstrated, because the breaches landed after t156.
- Guards: Farz P1 (Vozuća, Donja Bočinja, Gornja Bočinja, Spreča), P-A and P-B.
- January 1993 and April 1994 are not listed: January 1993 precedes the split and April 1994 is five weeks after it.
- Not enumerated: the 1st, 2nd and 4th Corps zones. The package's defence trace lists them.

**History (historian seat).** The 3rd Corps did not only take hills in 1994 to 1995. Its Teslić operation took 100 km² or more from the VRS 27th Motorized Brigade (BB2 pp.479-480) and OG 7-South took Husar on 19 August 1994. Vozuća failed in June 1994 (BB2 p.486) and was won as hilltops and villages about 1 km deep in November 1994 (BB2 pp.487-488). Spring 1995 attacks failed (BB1 p.385); Uragan took Vozuća on 10 September 1995 (BB1 p.386) and about 280 km² (BB1 p.388). About six offensives fall in the weeks where the sim shows one plan and 31 probes. The key towns (Vozuća, Teslić, Doboj) stayed VRS until September 1995, so the outcome is sound there, but the sim holds them by inaction, not by the VRS counterattacks and ARBiH overextension that held them in history. VRS2 is grounded in history: the VRS Ozren group was "caught without the elite reserves" in September 1995 (BB1 p.386) and the 16th Krajina Brigade was pulled to Ozren on 5 to 7 October (BB1 pp.388-389). Page citations here are the knowledge base's page ids.

**The owner's probe-channel ruling** (`docs/plans/2026-08-26-probe-channel-scope.md`, "it was blindness", ruling 2) accepts a tempo rise that comes from repairing a defect; its N1 item is report-only. It does not forbid the fix.

**The fallback is gone.** Revision 2 does not list shipping the passive ARBiH as final behaviour, and both seats object to it: a President who gets no proposal from four of six corps for about 80 weeks has lost his central verb, which fails the played test, and holding Ozren and Vozuća by inaction is not history (the 1st to 4th Corps' 1994 record is Teslić, Husar, Vozuća and Donji Vakuf). Only the owner could put it back.

**Calibration-pass rule for the cells above.** No calibration lever is selected, justified or scored by a listed cell, and a match on a listed cell is not credited as fidelity. Farz P1, P-A and P-B are not tuned. After the package lands the list is re-derived and the freeze figures are read against it.

## 3. Items not accepted, with the Revision 2 answer

Each of these was on the memo's first accept list and moved to fix or retire. The seats' views are added where they bear on the work.

| Item | Answer | Seat views |
|---|---|---|
| F1h recruitment at half rate | Retire the dead connectivity term; keep 0.5 as a named constant | The term is a flat `connectivity \|\| 0.5` (`supply_state_derivation.ts:376-388`); Systems Manual §15 ("constrained by connectivity") overstates and is reworded (game-designer). |
| Political-directive producer saturation, Wave 6 coupling, RS corps-role overlay | Retire for bot factions (B3); the directive layer stays as the player's tool | The producer skips only an autonomy-0 player: at autonomy 1 and above the human's own staff gets the same saturated directive, and no player directive UI exists (game-designer). The retirement must cover the human's staff, and the documents must say so. |
| Quadratic competence decay | Fix to the documented linear rate (B1) | Both seats object to accepting it: the effective rate is 6.5 times the documented rate at 12 weeks and an overstayer reaches the floor in about 40 weeks. |
| AI1 target ranking; RF-L3d follow-ups 1, 3, 4 | Fix (P3) | Both a 56:1 walkover and attacks below 0.6:1 are launched today. |
| 538 pending officer events never acknowledged | Fix (B2) | The same machinery as `army_directive_pushback`: check whether a human at autonomy 1 or above is shown those events, because the producer cannot be retired for bots only if the player's staff also receives them (game-designer). |
| Live = headless differ by one soldier | Fix (C6, the identity card applied at week 0 live and week 3 headless) | |
| RB2 unlogged re-route | Fix (A4) | The §6 seats rule the design at their sitting. |
| F2 casualty scale of failed operations | Fix in P3 if it remains | Historian: the verifiable successful-attack exchange is about 3:1 (Goražde, BB2 pp.480-481); 10:1 to 20:1 for failed ARBiH operations is not supported. |
| F3 VRS "last stand", VRS wins nothing after week 99 | Fix or retire at P2 | Historian: not acceptable. Zvezda 94 took ground (BB2 pp.479-480) and the VRS and SVK retook Kulen Vakuf on 3 to 4 November 1994 (BB2 p.549). |
| A real emergency defence (reserve commitment, a local counterattack) | Disposition pending the ruling at P2 | The seats split. Game-designer: the absence is acceptable, because reactive sector defence, Army HQ reserve loans and Active Defense counterattacks exist (Rulebook §5.10, §6.3). Historian: armies did commit reserves and counterattack, so the absence is not historical, and the June 1994 Vozuća gains were lost to a VRS counterattack using corps reserves (BB1 p.422, BB2 p.506). The "post-1.0 design item" wording in the retirement fragment of #683 and in the Systems Manual §6 note is stale and is deleted when the ruling is made. |

## 4. Historical gaps a finished game cannot ship with (historian seat)

- No human-HRHB expulsion-policy waves at autonomy 1 and above (RB5; the fix is in Part 3).
- ARBiH inactivity in 1994: no Teslić, Husar or Vozuća offensives and no Donji Vakuf attempts (the package; then the authored 1994 offensives in Part 6).
- The VRS winning nothing after week 99 (F3, P2).
- No reserve commitment or local counterattack in defence anywhere (P2).

## 5. Process record

- First sitting, 2026-11-15 (historian, scenario-creator-runner-tester, game-designer, read-only, none the author of the memo): ratified deferring the lockout; corrected the memo's claim that the 3rd Corps "took hills, not cells", the claim that the owner's probe ruling covered the case, and the scope (army-wide, not the 3rd Corps). Superseded by the owner's ruling; the corrections are in section 2.
- Second sitting, 2026-11-15 (game-designer, historian, one sitting, read-only, independent): the four items in section 1, each with both owner tests. The memo's RB5 reason, its PK5 scope and its "directive layer is the player's tool" were corrected; the memo's accept of quadratic decay was rejected. The §6 seats rule RB2 and the RB items at their own sitting.
- The orchestrator is told before the merge of every correction above.

## 6. Open conditions (work owed by this record)

1. A canon line for CODE3 (discretionary plans only; exhaustion is a cost; stop-op is the player's counter), after a check that stop-op works on an operation in planning.
2. RB5: the reason text of section 1 in canon; autonomy 1 and above run the bot policy; no Verdict, ending or ledger copy presents the missing waves as the player's restraint.
3. PK5: C7 fixed; the retry duty for the 1994 ARBiH fights met by the package or by Part 6.
4. SD6 and SD8: keep the three disclosure strings; no UI shows a siege civilian-death number as simulation output; the `scoring.ts:172` note stays open.
5. Systems Manual §15 reworded for F1h; the stale "post-1.0 design item" lines deleted once the emergency-defence ruling is made.
6. The directive-producer retirement (B3) covers the human's staff at autonomy 1 and above; B2 checks whether the human sees the pushback events.

## 7. Hash-neutral notes

- Roster tenure starts (H-C4: Praljak 64 to 67, Roso 80 to 83, Petković-2 100 to 107, Blaškić-2 120 to 121) go to the calibration pass.
- The autonomous-launch path is inert and is retired (B4).
- `data/derived/latest_run_final_save.json` dates from 2026-09-01 and is stale; lanes read run folders instead.
- FORAWWV :310 is left for a FORAWWV panel.
- The 188-week headless `final_state_hash` is 518de17970af5914 on main after #677; it is the main hash at #677, not the freeze hash.
