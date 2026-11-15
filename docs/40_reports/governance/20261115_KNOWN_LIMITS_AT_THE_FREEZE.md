# Known limits at the engine freeze

**Date:** 2026-11-15
**Authority:** orchestrator ruling of 2026-11-15 (Fable consult 2, the freeze cut; ORCHESTRATION §4b rules 8 to 10) and `RF-ENGINE-FREEZE` condition 5 in `docs/open_gates.yml`.
**Status:** draft for the freeze. The cell lists are from the #591 record and the register entry for the ARBiH plan lockout (formerly RF-3C-EXH); the freeze commit re-checks them against the frozen run before this note is final.

Fitted defects ship with a record, not a fix. This note lists the engine defects that are deliberately left in at the freeze, the checkpoint cells and guards that match today because of them, and the rule the calibration pass follows because of them. A match on a listed cell is not evidence of fidelity.

## 1. ARBiH plan lockout (army-wide) with VRS2: the ARBiH corps stop planning (post-1.0)

**What the run shows (measured, RF-ROSTER 188-week run, 709/709/708/681).**
- In 1994 (weeks 91 to 143) ARBiH corps 1 to 4 ran 83 probes and 3 real operations. At week 188 their exhaustion reads 89, 57, 97 and 67; every VRS corps reads 2 or below.
- After the 7th Corps split at week 99 the 3rd Corps made 1 commander plan in weeks 99 to 178 (12 on main without the split) and 31 one-brigade probes with no sector attack.
- The lockout is army-wide, not a 3rd Corps effect. On main the 1st, 2nd and 4th Corps also made no commander plans in weeks 99 to 178. The split changed only the 3rd Corps. It was first registered as RF-3C-EXH because it was found in the 3rd Corps after the split; the seats and the orchestrator renamed it "ARBiH plan lockout (army-wide)" (2026-11-15).
- At week 188 all four corps read "corps in defensive stance, no new plans", not an exhaustion refusal. Before the trace, the cause had two candidates (the stance gate and the exhaustion gate) because run reports carried no per-corps exhaustion field. The inert per-corps trace (PR #686) has now measured the mechanism (below). The fix is multi-run and any fix also needs VRS2: two earlier experiments (RF-1 step 7 and RF-AI2 D2) broke the Farz guard through Ozren when the 3rd Corps woke.

**The mechanism (traced, PR #686, inert).**
- The exhaustion that the 1st to 4th Corps carry comes almost entirely from their own commander probes: `buildProbeOperation` adds +5 exhaustion each, and each corps ran 17 to 30 probes over weeks 99 to 178.
- A probe is active on most turns, so exhaustion decays at the active rate of 1 a turn instead of the idle rate of 3. Inflow outruns decay and exhaustion stays above the planning gate of 30.
- Probes are exempt from that gate, so the loop sustains itself: exhaustion blocks real plans, and the probes that remain keep exhaustion up.
- The 5th and 7th Corps run named operations (+15 each) with idle decay in between, so they come back under the gate and keep planning.
- RF-STRENGTH's replacement churn writes no exhaustion, so it does not touch this loop.
- Candidate fixes, all for 1.1 and none now: probes respect the gate; probes cost less exhaustion; decay treats a probe turn as idle. Any of them wakes the 1st to 4th Corps, so each must pair with VRS2 on Ozren, because the Farz breach is the risk that keeps this post-1.0.

**Cells that match because of it (checkpoint, from the #591 record).**
- October 1995 (t188), all RS-held matches: `doboj:boljanic_2`, `doboj:bukovica_velika_2`, `doboj:makljenovac`, `gracanica:petrovo_2`, `teslic:blatnica_2`, `teslic:kamenica_2`, `teslic:vitkovci`. A freed 3rd Corps took Boljanić at t162 and Petrovo at t163.
- April 1995 (t156): `maglaj:donja_bocinja_2`, `maglaj:gornja_bocinja`, `zavidovici:vozuca_2`, `lukavac:brijesnica_donja_2`. Exposure here is not demonstrated, because the breaches landed after t156.
- Guards: Farz P1 (Vozuća, Donja Bočinja, Gornja Bočinja, Spreča), P-A and P-B. A freed corps took Vozuća at t163 and broke them.
- January 1993 and April 1994 are not listed: January 1993 precedes the split and April 1994 is five weeks after it.
- Not enumerated: the 1st, 2nd and 4th Corps zones. The lockout reaches them, and nobody has listed which of their cells depend on it. The freeze run must do that.

**What is historically true and what is not (historian seat).**
- The 3rd Corps did not only take hills in 1994 to 1995. In 1994 its Teslić operation took 100 km² or more from the VRS 27th Motorized Brigade (BB2 pp.479-480) and OG 7-South took Husar on 19 August 1994. Vozuća failed in June 1994 (BB2 p.486) and was won as hilltops and villages about 1 km deep in November 1994 (BB2 pp.487-488). Spring 1995 attacks failed (BB1 p.385); Uragan took Vozuća on 10 September 1995 (BB1 p.386) and about 280 km² (BB1 p.388). About six offensives fall in the weeks the sim shows one plan and 31 probes.
- The key towns (Vozuća, Teslić, Doboj) did stay VRS until September 1995. So the outcome is sound for Vozuća through August 1995, for the Ozren salient (borders "almost unchanged", BB1 p.384), for Brijesnica Donja through April 1995 (BB2 p.488 n.3) and for the Farz P-B pass, but the cause is accidental: the sim holds them by inaction, not by the VRS counterattacks and ARBiH overextension that held them in history.
- Not verified: Bočinja (no source hit); whether a painted Teslić-south cell was taken in 1994. Any RS-matched village in the 27th Brigade area south of Teslić may be unsound, since history has it passing to the ARBiH in October and November 1994 (BB2 p.480).
- A literate player would notice a 3rd Corps that makes one plan in 80 weeks.
- The sim has no 1994 Teslić or Vozuća offensive and no spring 1995 Ozren attack. Those, and the 3rd Corps offensive record of 1994 and spring 1995, are 1.1 history targets.

**The owner's probe-channel ruling does not protect this.** The ruling of 2026-08-26 (`docs/plans/2026-08-26-probe-channel-scope.md`) records "it was blindness" (owner ruling 2) and accepts a tempo rise that comes from repairing a defect; its N1 item is report-only. The complaint it names ("38 times in a row") has the same shape as the 31 back-to-back probes. The deferral rests on the traced mechanism needing a multi-run fix that pairs with VRS2, not on that ruling. The owner is told this, and is asked to assent, not told the ruling covers the case.

**The 1.1 brief.**
- VRS2 is grounded in history: the VRS Ozren tactical group was "caught without the elite reserves" in September 1995 (BB1 p.386), and the 16th Krajina Brigade was pulled to Ozren only on 5 to 7 October (BB1 pp.388-389). Write it as a dated September 1995 reserve commitment.
- The first step, a per-corps trace of `corps_exhaustion` and `last_plan_reason` for every corps, is done as an inert reporting trace (PR #686, headless hash unchanged, landed before RF-STRENGTH). It traced the mechanism in section 1, so 1.1 starts from the three candidate fixes there, each paired with VRS2 and each its own measured run.
- The 1.1 fix is expected to flip the Ozren, Teslić, Bočinja, Vozuća and Brijesnica Donja cells and the Farz P-B pass. That is an honest loss, not a regression.
- The Bible says exhaustion drives negotiation and constraint for every actor, yet every VRS corps ends at 2 or below while the ARBiH corps sit at 57 to 97. That asymmetry is a design question for 1.1.

## 2. The political-directive producer saturates, and the economy role never binds (post-1.0)

- `political_directive_producer.ts:83` uses an exhaustion threshold of 500. Every faction passes it by t4 to t6 and then issues HONOR_TRUCE or PREPARE_RESERVE for about 182 weeks.
- Wave 6 coupling (`briefing.ts:657-661`): every bot corps has authored targets, so the economy role never binds.
- Matched cells depend on this chain staying inert (RF-ROSTER gate finding, 2026-11-15).

## 3. Competence decay is quadratic (post-1.0)

- `applyEmergentVariationRules` in `army_co_lifecycle.ts` (about line 715) decays competence quadratically, not at the documented linear rate. The documents describe a linear rate; the engine does not.

## 4. Rule for the calibration pass

For every limit in this note, the calibration pass follows this rule:

1. No calibration lever may be selected, justified or scored by a listed cell, and no match on a listed cell is credited.
2. Every calibration run reports the delta on the listed cells, and scores are reported with and without them. The freeze figures read as "681, of which N cells rest on the lockout" and are not targets.
3. A change that moves any listed cell in either direction, by any pathway, is an engine change and goes to the 1.1 pass with its own panel. A lever that strengthens the VRS on Ozren would hide the defect further, and counts.
4. Nothing is tuned that depends on the limit persisting: the 3rd Corps and other ARBiH corps exhaustion constants, the probe fallback, the stance gate for the ARBiH corps, the directive producer threshold and its Wave 6 coupling, the competence decay rate.
5. Farz P1, P-A and P-B are not tuned.
6. The route back in for section 1 is the traced mechanism and its three candidate fixes; which one runs, and when, is the orchestrator's and the owner's decision.

## 5. Ratification of the deferral

The ARBiH plan lockout (army-wide) with VRS2 is deferred to the post-1.0 engine pass by the orchestrator, on the recommendation of Fable consult 2. Three independent seats (fresh sessions, read-only, none of them the author of the memo or of this note) tested the reasoning on 2026-11-15. None said the deferral is wrong. Each corrected the memo's reasons, and those corrections are in section 1.

| Seat | Verdict | Reasons and conditions |
|---|---|---|
| `historian` | AGREE WITH CONDITIONS | The memo's claim that the 3rd Corps "took hills, not cells" fails against BB2 pp.479-488 and BB1 pp.385-388. The deferral stands on the VRS2 dependency (a dated September 1995 reserve commitment) and, since the trace, on a traced mechanism whose fix is multi-run, not on history or on the owner's ruling. At the time of the seat read, the cause was still untraced. No matched cell is cited as fidelity evidence. The 3rd Corps offensive record goes to the 1.1 targets. |
| `scenario-creator-runner-tester` | AGREE WITH CONDITIONS | Reproduced the 1994 counts (83 probes, 3 operations) and the week-188 exhaustion; the lockout is army-wide and mostly not an effect of the split; the cause has two candidates and per-turn evidence does not exist; the owner's ruling does not forbid a fix. Supplied the exact cell list and a stronger rule (section 4). Add an inert per-corps trace before the freeze (done, PR #686). |
| `game-designer` | AGREE WITH CONDITIONS | A passive central front is partly the intended texture, but the lockout is a self-reinforcing probe and exhaustion loop, a defect and not a design stance. The memo stretches the owner's ruling, so the owner is asked to assent. The note must say the cells are held by a defect, the 1.1 fix is expected to flip them, and the rule is reworded as in section 4. |

The owner is told after the merge. The orchestrator is told before it that no seat called the deferral wrong, and that the memo's stated reasons on the 3rd Corps history and on the probe ruling were corrected by two seats each.

## 6. Hash-neutral notes carried by the same pass

- The roster tenure starts run early for Praljak (week 64 against 67), Roso (80 against 83), Petković-2 (100 against 107) and Blaškić-2 (120 against 121). This is item H-C4 in the calibration-pass list, one measured change each.
- The autonomous-launch path stays inert after RF-ROSTER (#677): its gate (stubbornness 4 or more) finds no eligible catalog opportunity today. The §6 panel reviews the DDR framing before any activation.
- `data/derived/latest_run_final_save.json` dates from 2026-09-01 and is stale; lanes read run folders instead. It is not regenerated in a docs PR.
- FORAWWV :310 names the wrong writer for the field. A FORAWWV panel handles it later; this pass does not edit FORAWWV.
