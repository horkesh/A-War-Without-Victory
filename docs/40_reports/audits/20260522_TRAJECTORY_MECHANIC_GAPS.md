# Trajectory-Mechanic Gaps — Does VRS "Competent Army → Competent Rubble" Emerge?

**Date:** 2026-05-22
**Role:** `/war-or-game` (realism auditor)
**Mode:** READ-ONLY investigation. No source/scenario/anchor edits.
**Question (user framing):** VRS went "competent army" (1992) → "competent rubble" (Oct 1995). ARBiH went the opposite direction. **If the engine modeled this arc, the painted Krajina collapse should emerge organically from differential force trajectories — not from scripted events.** Is the engine close enough that calibration alone fixes the arc, or are mechanics structurally missing?

**Trigger evidence:** `docs/40_reports/audits/20260522_PAINTED_COMPARE_FRESH_DELTA_ANALYSIS.md` shows sim faction-area is **byte-frozen at RS 61.0% / RBiH 26.4% / HRHB 12.6% from w104 through w188** (Apr 1994 → Oct 1995), against painted Oct 1995 of **48.7% / 30.7% / 20.6%**. The engine produces ZERO net territorial change in 84 turns of late war.

**Companion audits (same date):**
- `20260522_FORCE_TRAJECTORY_ENGINE_INVENTORY.md` (gameplay-programmer, working draft)
- `20260522_OPS_FORCE_TRAJECTORY_GATING.md` (operations-expert, in-progress; key finding: ops are gated on macro-availability, NOT on force-trajectory comparison)
- `20260510_FORCE_QUALITY_TRAJECTORY_REASSESSMENT.md` (existing audit with the n1741 188w trajectory checkpoints — **critical reference, see §11**)

---

## Headline

**The engine has the trajectory substrate but it is not load-bearing for territorial outcomes.**

The n1741 force-quality trajectory checkpoints (see §11) show RBiH officer quality climbing 0.087 → 0.807, RS officer quality drifting 0.552 → 0.456, RS cohesion collapsing 55.5 → 27.3, RS morale collapsing 60.9 → 12.6 by w188. **The arc IS emerging in the unit-quality state.** What is NOT emerging is territorial consequence: the same n1741 run produces zero late-war OSID flips because:

1. **Ops are gated on macro-availability (date windows, political authorization, alliance flags, corps readiness), NOT on attacker-vs-defender force-quality comparison or differential trajectory** (`20260522_OPS_FORCE_TRAJECTORY_GATING.md` §0.5). A degraded RS corps with cohesion 27 / morale 12 stays in its OSIDs because no ARBiH op fires that would *exploit* the degradation.
2. **Six historical Krajina-collapse operations are absent**: Storm (Aug 1995), Mistral 2 (Sep 1995), Sana 95 (Sep-Oct 1995), Una 94/Una-Sana, Maestral, Southern Move. `mistral_2_95` is the only one even scaffolded; per `20260522_PAINTED_COMPARE_FRESH_DELTA_ANALYSIS.md` §4.2 it produces no controller flips at 188w.
3. **The trajectory state is not in the combat predictor.** Per REAL_WAR_MASTER COMBAT-P14 (engine health audit 2026-04-02), `checkLaunchFeasibility` ignores defender artillery/terrain/entrenchment; per `OPS_FORCE_TRAJECTORY_GATING` §0.5 no predicate reads attacker-vs-defender force-quality comparison.

**Verdict: calibration alone does NOT fix the arc.** The engine has the inputs (officer quality, cohesion, morale, fatigue, personnel — all per-faction-per-corps and decaying realistically per n1741) but the **delivery layer (ops gating + combat predictor + corps CO target selection) does not consume them.** Three top trajectory-mechanic gaps below.

---

## Top 3 Trajectory-Mechanic Gaps Weighted by Krajina-Collapse Impact

### Gap A — Force-quality differential is not an op-fire predicate (P0 for Krajina collapse)

**What's missing:** No op-eligibility predicate compares attacker corps force-quality state to defender corps force-quality state. Per `20260522_OPS_FORCE_TRAJECTORY_GATING.md` §0.5: "predicates read live POLITICAL CONTROLLER + CORPS READINESS TRAITS + FACTION SUPPLY PRESSURE + ALLIANCE flags. No predicate reads: Attacker-vs-defender force-quality COMPARISON, Equipment-quality COMPARISON, Per-OSID supply state, Per-brigade morale/cohesion/exhaustion floors, Officer-quality signals, Patron-arms-flow / patron-pressure signals, Comms-quality signals."

**Why this is the dominant blocker:** Even if Mistral/Sana/Storm were fully scripted, they would fire on date+alliance and then resolve via the same broken combat predictor that ignores defender entrenchment/artillery/terrain (COMBAT-P14). The historical pattern is "VRS holds Krajina until Aug 1995, then collapses in 3 weeks because ARBiH 5th Corps + HV 4th/7th Guards Brigades hit a force that was already cohesion-27 / morale-12." Without the differential in the predicate, the late-war collapse becomes a scripted railroad rather than an emergent consequence of the n1741 trajectory state that ALREADY EXISTS.

**Krajina-collapse load-bearing:** **CRITICAL.** Without this, every late-war op is a coin flip against a healthy-looking defender even when the defender's brigades are objectively rubble.

### Gap B — Per-brigade ammunition / equipment-attrition state absent (P0)

**What's missing:** Per REAL_WAR_MASTER HIST-GAP-4 (lines 202-210): "Brigades have no individual ammunition or logistics state. A brigade attacking at `supply: strained (0.75×)` is modeled identically to a brigade with 2 days of ammo." Combined with the absence of equipment-attrition (no JNA-inheritance stock degradation, no Deliberate Force art/comms degradation Aug-Sep 1995), VRS heavy-weapons advantage never erodes.

**Why this matters for the collapse:** The historical VRS 1995 was *not* short on troops (155k by war's end per BB1 p.177) — it was short on **artillery shells, tank ammunition, comms, and serviceable equipment** after 3 years of embargo + Deliberate Force. The "competent rubble" framing is precisely this: same headcount, degraded combat power. The engine's per-brigade combat power doesn't model that erosion, so a w188 VRS 2nd Krajina brigade fights like a w0 VRS 2nd Krajina brigade.

**Krajina-collapse load-bearing:** **CRITICAL.** This is the *why* of the collapse. ARBiH 5th + HV Storm spillover overran a force whose tank/artillery edge was structurally degraded; if the engine keeps that edge intact, the collapse mathematically cannot emerge.

### Gap C — ARBiH equipment-growth post-Washington Mar 1994 absent (P0)

**What's missing:** No mechanism representing the Washington Agreement (March 1994) opening arms transit through Croatia, Iran/Saudi/Turkey arms flow into 5th Corps, HV equipment transfers into ARBiH. Per the trajectory state in n1741, RBiH officer quality climbs sharply between w40 and w104 (0.28 → 0.56) and again to w188 (0.81) — consistent with the 1993 reorganization (HIST-GAP-5) and post-Washington flow — but the **equipment side of the same growth curve is missing**: there is no "patron-arms-flow" signal in any op predicate (`OPS_FORCE_TRAJECTORY_GATING` §0.5).

**Why this matters:** The painted Apr 1995 → Oct 1995 RS drop is ~14pp (63% → 49%). Half of that is Storm spillover (HV-delivered), half is ARBiH 5th Corps breakout from the Bihać pocket. The Bihać breakout was logistically impossible without the Washington-Agreement-era arms flow that turned the 5th Corps from "encircled rabble" to "offensive force." Without modeling this growth, the 5th Corps at w156 looks like the 5th Corps at w40 minus three years of attrition — the opposite of what should happen.

**Krajina-collapse load-bearing:** **CRITICAL.** This is the *enabler* on the ARBiH side. The collapse is bilateral — degraded VRS + uplifted ARBiH — and only the degradation side has any substrate in the engine today.

---

## Per-Signal Audit (10 historical signals)

For each signal: historical shape with BB1/BB2/ICTY citations → engine status per REAL_WAR_MASTER → Krajina-collapse load-bearing assessment.

### Signal 1 — VRS personnel decline 1992 → 1995

**Historical shape:** Peak mobilization "over 250,000 troops" initially [BB1 p.177], dropping to **155,000 by war's end** [BB1 p.177]. Steady-state combat strength was lower — JNA in Bosnia was 100,000-110,000 [BB1 p.166] + Bosnian Serb TO 60,000 + MUP 15,000 [BB1 p.166] before JNA withdrawal in May 1992. The trajectory: peak Apr-May 1992, settle ~90-110k by end 1992, gradual erosion through 1993-1994, slight rebuild via Krajina Serb absorption Aug 1995 producing demoralized integration (BB describes mobilization reaching down to elder/younger Serb cohorts in Krajina). Equipment per BB1 p.177: "500 to 550 tanks, about 250 armored personnel carriers or infantry fighting vehicles, some 500 to 600 field artillery pieces, and 400 to 500 heavy mortars."

**Engine status:** **PARTIAL.** Per n1741 trajectory checkpoints (force_quality_trajectory.cjs output, §11 below): RS active brigades 83 (w40) → 66 (w104) → 63 (w156) → 60 (w188). That IS the decline shape. But RS average brigade personnel goes 1276 (w40) → 1459 (w104) → 1541 (w156) → **1839 (w188)** — INVERSE of expected. Per `20260510_FORCE_QUALITY_TRAJECTORY_REASSESSMENT.md` line 99: "RS/HRHB personnel rises through 188w … RS +715 average personnel; HRHB +503" classified as **reconstitution / mobilization / active-set reporting** owner gap.

**Krajina-collapse load-bearing:** **LOW.** Personnel count was not the binding constraint — the historical VRS had MORE personnel at war's end than mid-war (155k vs ~100-110k). The collapse was about *quality* (cohesion, equipment, comms), not headcount. This signal is texture, not load-bearing.

**REAL_WAR_MASTER citation:** No dedicated section, but Issue #43 ("RBiH overmobilized at 161k", PARTIALLY RESOLVED) and Issue #47 ("Faction exhaustion is 0 always") together implicate the manpower-accounting layer. The personnel-inflation pattern in n1741 is the inverse-of-history version of Issue #43.

---

### Signal 2 — VRS equipment attrition (JNA inheritance, no resupply, Deliberate Force)

**Historical shape:** Initial JNA inheritance Apr 1992: 500-550 tanks, 250 APC/IFV, 500-600 artillery, 400-500 heavy mortars [BB1 p.177]. No legitimate resupply post-embargo (UN arms embargo SCR 713, Sep 1991). Deliberate Force Aug 30 – Sep 14, 1995: NATO struck 56 separate target complexes (338 sorties), degrading VRS comms, command bunkers, integrated air defense, ammunition storage. ICTY testimony in *Mladić* and *Karadžić* trials documents VRS comms collapse in eastern Bosnia post-Deliberate Force. By Oct 1995, VRS artillery was operating at reduced rates per round per gun per day due to ammunition rationing.

**Engine status:** **ABSENT.** Per REAL_WAR_MASTER HIST-GAP-4 (P0, lines 202-210): "Brigades have no individual ammunition or logistics state." No equipment-attrition mechanic exists. Per `20260504_EQUIPMENT_QUALITY_MODIFIER_SUBSTRATE.md` (audits folder) and the FORCE_QUALITY_GAP_2_VERIFICATION audit: substrate scaffolding exists for equipment-quality modifiers but it is not wired into combat resolution. The Deliberate Force air campaign has zero mechanical effect (REAL_WAR_MASTER P5 NATO air "zero combat effect, 52w only").

**Krajina-collapse load-bearing:** **CRITICAL.** This is Gap B above. The "competent rubble" framing is fundamentally about equipment/ammunition degradation. Without it, VRS combat power in Oct 1995 is structurally identical to VRS combat power in Apr 1992.

---

### Signal 3 — VRS officer turnover (Mladic-Karadzic split, Krajina absorption)

**Historical shape:** Mladić appointed VRS commander May 12, 1992. Strain between Mladić Main Staff (Han Pijesak) and Karadžić political leadership (Pale) builds through 1993-1994, ruptures publicly in 1995 (Karadžić attempts to demote Mladić Aug 1995 during Storm spillover — open rebellion in the corps headquarters). Krajina Serb officer absorption post-Storm (Aug 1995): SVK officers fold into VRS demoralized after losing their own homeland; integration is hostile. Mid-grade officer attrition through casualties (BB documents brigade commander losses).

**Engine status:** **PARTIAL.** Per n1741 trajectory (§11): RS officer_quality 0.552 → 0.456 across the war (−0.097 delta, verdict "matches" canonical sign in `20260510_FORCE_QUALITY_TRAJECTORY_REASSESSMENT.md` line 75). The trajectory shape is right. But there is no Mladić-Karadžić rupture event, no Krajina Serb officer absorption shock, no inflection at Aug 1995. The decline is gradual and smooth where history was step-functions.

**Krajina-collapse load-bearing:** **MEDIUM.** Officer quality matters mechanically — it gates corps readiness which gates op eligibility (`20260522_OPS_FORCE_TRAJECTORY_GATING.md` §0.5) — but the smooth glide isn't producing the Aug-Sep 1995 cliff that actually triggered the collapse. The substrate exists; the event-driven shocks do not.

---

### Signal 4 — VRS comms quality (HIST-GAP-3)

**Historical shape:** VRS inherited JNA secure communications (radio relays, encrypted handsets, division-corps-army hierarchy). ARBiH used captured/civilian/improvised channels with no encryption. This asymmetry was load-bearing throughout the war — VRS could coordinate multi-corps operations (Corridor 92, Drina '93) while ARBiH 1st Corps in Sarajevo often didn't know what 5th Corps in Bihać was doing. Comms degraded over time due to maintenance failures and after Deliberate Force struck relay nodes (Aug-Sep 1995). Historically a 1995 VRS corps commander had **worse** comms than a 1992 JNA corps commander.

**Engine status:** **ABSENT.** Per REAL_WAR_MASTER HIST-GAP-3 (P0, lines 190-198): "All three factions have identical information access. `buildBriefing()` gives every corps CO complete sector intelligence." No comms-quality mechanic. Per `20260522_OPS_FORCE_TRAJECTORY_GATING.md` §0.5: "No predicate reads: Comms-quality signals."

**Krajina-collapse load-bearing:** **MEDIUM-HIGH.** Comms degradation was a major component of the Aug-Sep 1995 VRS rapid collapse — Deliberate Force-struck relay nodes meant Karadžić-Mladić rupture occurred while comms were already broken, so the Krajina/2nd Krajina Corps couldn't coordinate a coherent defense even if it had wanted to. Without modeling, the engine treats the Oct 1995 VRS like a fully-networked force.

---

### Signal 5 — ARBiH personnel growth

**Historical shape:** Apr 1992 war start: >100,000 men but only 40-50k armed [BB1 p.179]. **Aug 1992: 170,000 fighting men organized into 28 brigades, 16 independent battalions, 138 detachments, two artillery regiments, one armored battalion** [BB1 p.216]. **Early 1993 peak: 261,500 troops** (great majority in local defense units) [BB1 p.216]. **Post-peak decline through 1994-1995** due to "combat losses, work deferments, and other causes" [BB1 p.216]. War's end: ~180-200k (unsourced in BB but consistent across secondary literature).

**Engine status:** **PARTIAL.** Per n1741 trajectory (§11): RBiH active brigades 114 (w40) → 117 (w104) → 120 (w156) → 122 (w188). Brigade count grows correctly. Per-brigade personnel: 1403 (w40) → 1706 (w104) → 1713 (w156) → 1705 (w188). The aggregate has growth but the early-1993 peak followed by decline is missing — the engine plateaus at the upper end instead of cresting and falling. Per REAL_WAR_MASTER Issue #43 (P2): "RBiH overmobilized at 161k. Historical ARBiH was 100-130k by Jan 1993. 161k is a mid-1994 number."

**Krajina-collapse load-bearing:** **MEDIUM.** The Bihać 5th Corps breakout in Aug-Oct 1995 required headcount AND equipment — headcount is roughly right (slightly over) but the inflection (peak then decline) is wrong. More importantly, the 5th Corps growth as a *patron-supplied isolated pocket* is a separate question (see Signal 6).

---

### Signal 6 — ARBiH equipment growth post-Washington Agreement (Mar 1994)

**Historical shape:** Pre-Washington: ARBiH armed almost exclusively with infantry rifles, hunting weapons, JNA-barracks-seizure stocks. Post-Washington Agreement (Mar 18, 1994): HRHB-RBiH ceasefire enables arms transit through Croatia. Iran/Saudi/Turkey arms flow accelerates (~1994 onward; Iran Contra-style supply documented in *Final Report of the Select Subcommittee on US Role in Iranian Arms Transfers to Croatia and Bosnia*, US House 1996). HV equipment transfers to ARBiH 5th Corps (Bihać pocket) — Croatian government openly arms ARBiH after Washington. By summer 1995, 5th Corps has tube artillery, MLRS systems, and serviceable comms that it lacked in 1993.

**Engine status:** **ABSENT.** No patron-arms-flow mechanic, no Washington Agreement equipment-shock event, no Iran/Saudi/Turkey/HV supply line. Per `20260522_OPS_FORCE_TRAJECTORY_GATING.md` §0.5: "No predicate reads: Patron-arms-flow / patron-pressure signals." The Washington Agreement is modeled at the alliance level (alliance flag flips from war to alliance) but with no equipment-flow consequence. The HRHB-RBiH war transition branch (`feature/hrhb-rbih-war-transition`, MEMORY.md) added the conflict-zone mechanics but not the post-resolution arms flow.

**Krajina-collapse load-bearing:** **CRITICAL.** This is Gap C above. The 5th Corps breakout from Bihać is mathematically impossible against the historical VRS without the post-Washington uplift. Without modeling, every late-war scenario produces a 5th Corps that fights with 1993 equipment against a 1992-equivalent VRS.

---

### Signal 7 — ARBiH officer growth (1993 reorganization step-change)

**Historical shape:** Late 1992 – early 1993, ARBiH formalizes TO (Territorial Defence) into corps/division/brigade hierarchy. Step-change in operational capability: from "loose collection of local defence units" to "recognizable command structure." Officer base shifts from "appointed by availability" to "trained Patriotic League veterans + ex-JNA Muslim officers + Croatia-trained cadre." Halilović (Chief April-June 1993) → Delić (June 1993 onward). Hadžihasanović 3rd Corps becomes operationally proficient by 1994.

**Engine status:** **PARTIAL.** Per n1741 trajectory (§11) — and this is the engine's strongest force-quality signal: **RBiH officer_quality 0.087 (t1) → 0.282 (w40) → 0.562 (w104) → 0.746 (w156) → 0.807 (w188)**, mean delta +0.0039/turn, verdict "matches" canonical sign per `20260510_FORCE_QUALITY_TRAJECTORY_REASSESSMENT.md` line 75. The arc is THERE and shaped correctly. Per REAL_WAR_MASTER HIST-GAP-5 (P1, lines 214-222): "engine models the post-reorganization force as a baseline, not the chaotic pre-reorganization force" — but the n1741 evidence shows the engine HAS captured the climb. The gap is that the climb is gradual where history was step-change (formal reorganization point ~Nov 1992 – early 1993).

**Krajina-collapse load-bearing:** **MEDIUM-HIGH.** The 1995 ARBiH officer corps that ran Bihać breakout planning was a *recognizable army staff*, not the 1992 improvisation. The engine has the trajectory but no step-change inflection. If Gap A (force-quality differential in op predicate) is closed, this signal becomes immediately load-bearing.

---

### Signal 8 — HVO trajectory (HV-attached brigades, Washington, Storm spillover)

**Historical shape:** April 1992 HVO+HOS combined: ~25,000 armed [BB1 p.180]. HV-attached "brigade flow" from Croatia provides covert reinforcement throughout 1992-1994 (HV 1st Guards Brigade, 4th Guards Brigade, 7th Guards Brigade rotate cadre through HVO formations). Washington Agreement (Mar 1994) allows HVO operational re-orientation toward joint Federation operations. Storm spillover (Aug 1995) delivers Drvar, Glamoč, Bosansko Grahovo to HVO; HV 4th/7th Guards push from Knin axis through Bosansko Grahovo into BiH. Sep 1995 Mistral 2 captures Šipovo, Donji Vakuf, Jajce.

**Engine status:** **PARTIAL/ABSENT.** Per `20260522_PAINTED_COMPARE_FRESH_DELTA_ANALYSIS.md` §4.5: "Oct 1995 HRHB still FAILS (sim 12.6%, floor 18%). Margin reduced from 9.4pp to 5.4pp. **Same gap as before — the Operation Mistral / Sana / Storm Krajina-collapse mechanism is not modeled.**" `mistral_2_95` op is scaffolded in `operation_opportunity_catalog_federation_western_bosnia.ts` (per OPS audit §0.5) but it produces no controller flips. HVO trajectory in n1741: officer_quality 0.227 → 0.247 (verdict "inverse" canonical sign, `20260510_FORCE_QUALITY_TRAJECTORY_REASSESSMENT` line 73). HVO is modeled as stagnant where history was uplift.

**Krajina-collapse load-bearing:** **CRITICAL.** Oct 1995 HRHB territory band is 18-23%; sim holds at 12.6%. The 5.4pp shortfall IS the absent Storm spillover + Mistral 2 capture sequence. Without this, the Krajina-collapse target painting is unreachable on the HRHB side regardless of how realistic VRS degradation gets.

---

### Signal 9 — Casualty differential (3:1 RBiH:RS)

**Historical shape:** Research and Documentation Center (RDC) totals: Bosniak ~69,000 killed, Serb ~22,000-24,000 killed, Croat ~7,800 killed. The 3:1 Bosniak:Serb ratio is itself a trajectory signal — it reflects the strategic asymmetry where ARBiH absorbed casualties to hold positions while VRS dealt them with artillery superiority. The differential narrowed late-war as ARBiH equipment improved and VRS attrition compounded.

**Engine status:** **PARTIAL.** REAL_WAR_MASTER n1240 review §3 (line 248): overall att:def 0.731, by phase: blitz 0.232 (correct — VRS steamrolling), sustained 0.956, consolidation 1.664 (INVERTED, driven by Issue #46 ARBiH meat-grinder). Casualty volume PASS (line 247). Civilian: REAL_WAR_MASTER n1150 review line 361: "34.5k civilian killed (RBiH 31.5k + RS 3k). 1.03M displaced." The 10:1 civilian ratio is more extreme than RDC's 3:1 military ratio — reflects ethnic cleansing concentration on Bosniak populations and is in the right direction historically.

**Krajina-collapse load-bearing:** **LOW.** Casualties are downstream of the combat outcomes; they're a *measurement* of the arc, not a driver. If Gaps A/B/C are closed, the differential will adjust naturally.

---

### Signal 10 — Mobilization / war-weariness exhaustion

**Historical shape:** By 1995, both VRS and ARBiH had exhausted mobilization pools differently. VRS reached down to elder (>50) and younger (<18) Serbs in Krajina; conscript desertion rates climbed; political will to mobilize collapsed in RS after the Krajina refugee influx (Aug 1995, ~200k Serbs from Croatia arrive demoralized). ARBiH organizational consolidation — 261,500 peak (early 1993) declines slowly through 1994-1995 due to work deferments and combat losses [BB1 p.216]. Both factions were grinding down population mobilization tolerance.

**Engine status:** **ABSENT (mechanically dead).** Per REAL_WAR_MASTER Issue #47 (NEW, P1, lines 294-300): **"Faction exhaustion is 0 for all factions across all 40 weeks."** "Every faction reads `exhaustion: 0` at w10, w20, and w40. Supply pressure is 100 (max pressure) for all factions all the time… zero faction exhaustion is not plausible." Per `20260510_FORCE_QUALITY_TRAJECTORY_REASSESSMENT.md` line 101: "Fatigue resets instead of accumulating … RS 0.5795 → 0.0000; all factions drift down." Fatigue trajectory is inverse-of-canonical-sign across all three factions in n1741. The negative-sum core mechanic the game is designed around is non-functional.

**Krajina-collapse load-bearing:** **HIGH (and the most damning gap because the substrate is *dead*, not just unused).** The Aug-Oct 1995 collapse was as much a *political collapse* as a military one — VRS political will to continue defending Krajina evaporated after the Croatian Krajina fell (Operation Storm, Aug 4-7). Without exhaustion functioning, no political-collapse signal can propagate into op-eligibility or corps readiness, and the war becomes a forever-war at frozen 61.0% RS.

---

## §11 — Critical Cross-Reference: n1741 Trajectory State (proof the substrate exists)

From `20260510_FORCE_QUALITY_TRAJECTORY_REASSESSMENT.md` lines 52-65, run `apr1992_definitive_188w__210e69404d054959__w188_n1741` (hash `a4bf8b8095050881`):

| Turn | Faction | Active bdes | Morale | Cohesion | Officer Q | Fatigue | Personnel |
|---:|---|---:|---:|---:|---:|---:|---:|
| 40 | RBiH | 114 | 78.7 | 61.5 | 0.282 | 0.478 | 1403 |
| 40 | RS | 83 | 61.0 | 37.3 | 0.563 | 0.422 | 1276 |
| 40 | HRHB | 29 | 61.1 | 45.4 | 0.311 | 0.103 | 1619 |
| 104 | RBiH | 117 | 92.0 | 74.8 | 0.562 | 0.376 | 1706 |
| 104 | RS | 66 | 67.8 | 35.8 | 0.552 | 0.045 | 1459 |
| 104 | HRHB | 34 | 64.2 | 43.5 | 0.343 | 0.000 | 1796 |
| 156 | RBiH | 120 | 89.5 | 74.2 | 0.746 | 0.179 | 1713 |
| 156 | RS | 63 | 65.1 | 32.9 | 0.472 | 0.079 | 1541 |
| 156 | HRHB | 34 | 65.5 | 36.6 | 0.283 | 0.000 | 1777 |
| **188** | **RBiH** | **122** | **89.5** | **73.6** | **0.807** | **0.000** | **1705** |
| **188** | **RS** | **60** | **12.6** | **26.5** | **0.456** | **0.000** | **1840** |
| **188** | **HRHB** | **35** | **69.9** | **36.1** | **0.247** | **0.000** | **1834** |

**This is the smoking gun.** At w188, RS morale is **12.6** and cohesion **26.5** while RBiH morale is **89.5** and cohesion **73.6**. The "competent rubble vs ascendant army" arc IS in the engine's force-quality state machine. The only reason the painted territorial picture (RS 48.7% / RBiH 30.7%) doesn't emerge is that the **delivery layer (ops, predicate, combat predictor) does not consume these numbers** to determine territorial outcomes.

A RS corps with morale 12 and cohesion 27 should be folding under any sustained pressure. In the sim, it holds 61.0% of BiH territory because the op-eligibility predicate doesn't know about its degradation and the combat predictor doesn't model defender brittleness.

---

## What's Actually Missing for the Arc to Emerge — Prioritized

In order of impact on Krajina-collapse emergence:

### P0 — Wire existing force-quality state into op-eligibility predicate
- **What:** Add an attacker-vs-defender force-quality COMPARISON predicate to the 9-axis op vocabulary (`OPS_FORCE_TRAJECTORY_GATING` §0.5). When defender corps morale<30 AND cohesion<35, attacker ops at +0.5 corps readiness should fire even if alliance/date predicates are marginal.
- **Why P0:** The substrate (n1741 §11 above) shows the differential exists. The gap is purely in the consumer layer. This is the cheapest fix with the highest leverage.
- **Maps to:** Gap A; REAL_WAR_MASTER BRIEF-GAP-5 (adjacent corps posture absent), COMBAT-P14 (predictor blind), HIST-GAP-3 (comms-quality absent at predicate level).

### P0 — Wire existing force-quality state into combat predictor (`checkLaunchFeasibility`)
- **What:** When checkLaunchFeasibility evaluates an op, scale defender power by `(0.5 + 0.5 * cohesion/60) * (0.5 + 0.5 * morale/60)`. RS w188 cohesion 27 / morale 13 → defender power scaled by ~0.55, which is roughly the historical Krajina collapse magnitude.
- **Why P0:** Even if Gap A fires more ops, the predictor will still tell the corps CO "this is unwinnable" using broken inputs. Both gates must consume the trajectory state for the arc to emerge.
- **Maps to:** Gap A continuation; REAL_WAR_MASTER COMBAT-P14 (cited explicitly: "primary driver of 47% ZEA rate").

### P0 — Per-brigade ammunition / equipment-attrition state (Gap B)
- **What:** Implement HIST-GAP-4 substrate. Per-brigade `ammunition_level: number`, drain on operations, resupply from corps supply pool. VRS embargo-erosion: corps supply pool degrades 0.5%/week post-w52 absent patron flow. Deliberate Force shock: −15% to all RS comms-dependent corps power for w158-162.
- **Why P0:** Without equipment attrition, the "competent rubble" framing is mathematically uncomputable. Closing this validates the 5th Corps breakout side of the arc.
- **Maps to:** Gap B; REAL_WAR_MASTER HIST-GAP-4 ("P0 for long-term simulation fidelity").

### P0 — Patron arms flow (Washington 1994, Iran/HV/Saudi) for ARBiH 5th + post-Washington ARBiH (Gap C)
- **What:** Add a `patron_supply` mechanic: Washington flag flip (Mar 1994 / w104-ish) triggers monthly equipment-quality uplift to ARBiH brigades, with concentrated weighting toward isolated pockets (5th Corps). Pair with `mistral_2_95` op-eligibility gates checking ARBiH+HRHB patron supply ≥ threshold.
- **Why P0:** Without this, the ARBiH side of the Krajina collapse is impossible. This and Gap B are bilateral siblings.
- **Maps to:** Gap C; `mistral_2_95` op currently scaffolded but firing nothing per painted-compare §4.2; `20260522_OPS_FORCE_TRAJECTORY_GATING` §0.5 "patron-arms-flow / patron-pressure signals" absent.

### P1 — Faction exhaustion mechanic resurrection (Issue #47)
- **What:** Diagnose why exhaustion=0 across all weeks. Per REAL_WAR_MASTER Issue #47 root cause hypotheses: (a) exhaustion not wired into weekly report, (b) field-path mismatch in adapter, (c) threshold accounting bug. Fix the wiring; then expose exhaustion to ops predicate (faction-exhaustion>0.7 enables peace-feeler events and op-rate damping).
- **Why P1 not P0:** The political collapse layer matters for the *narrative* of the arc but the territorial outcome can emerge from P0 fixes A+B+C. Exhaustion is the negative-sum spine that makes the arc *feel* historical.
- **Maps to:** Signal 10; REAL_WAR_MASTER Issue #47 ("a core negative-sum mechanic is dead").

### P1 — Step-change inflections (Mladić-Karadžić rupture, 1993 reorganization, Washington Agreement)
- **What:** Add three event-driven shocks: (a) ARBiH reorganization w35-40, +0.15 to officer_quality globally; (b) Washington Agreement w104-108, alliance flip + patron flow trigger; (c) Mladić-Karadžić rupture w158-162, −0.20 to RS officer_quality + RS political_authorization regression.
- **Why P1:** The substrate's smooth glide produces correct end-state but wrong intermediate shape. Step-change events make the arc historically recognizable.
- **Maps to:** Signals 3, 6, 7; REAL_WAR_MASTER HIST-GAP-5.

### P2 — Strangle-not-capture posture for RS Drina Corps (HIST-GAP-2)
- **What:** Add a `contain` directive type for VRS Drina Corps targeting Goražde/Žepa/Bihać. Maintains pressure but prevents capture in absence of explicit Srebrenica-style trigger (w170-ish).
- **Why P2:** Doesn't materially affect Krajina collapse (different theater) but addresses a recurring n1240 over-capture issue.
- **Maps to:** REAL_WAR_MASTER HIST-GAP-2 (P0 in the engine-health audit, P2 for *this specific arc*).

---

## Summary Verdict (for caller)

**(a) Headline:** **The engine is NOT close enough that calibration alone fixes the arc.** The trajectory substrate (officer quality, cohesion, morale, fatigue, personnel per-faction-per-corps) exists and is moving in the correct directions per n1741. The substrate is **not load-bearing** — neither the op-eligibility predicate (`20260522_OPS_FORCE_TRAJECTORY_GATING.md` §0.5) nor the combat predictor (`checkLaunchFeasibility` per REAL_WAR_MASTER COMBAT-P14) consume it. This is a wiring problem, not a substrate problem, on the force-quality side. Equipment attrition (HIST-GAP-4) and patron arms flow (post-Washington Mar 1994) are entirely absent and must be added as new substrate.

**(b) Top 3 trajectory-mechanic gaps for Krajina-collapse emergence:**
1. **Gap A — Force-quality differential is not an op-fire predicate.** Existing substrate (n1741 RS morale 12.6 / cohesion 26.5 at w188) is invisible to the ops layer.
2. **Gap B — Per-brigade ammunition / equipment-attrition state absent.** VRS heavy-weapons advantage never erodes; "competent rubble" is mathematically uncomputable.
3. **Gap C — ARBiH equipment growth post-Washington Mar 1994 absent.** 5th Corps breakout from Bihać is structurally impossible without modeling the patron arms flow.

All three are P0. Gaps A+B+C together would, in principle, enable the Krajina collapse to emerge organically from the n1741 force-quality trajectory state already in the engine. Without all three (especially Gap A), the trajectory state is decorative.

**(c) Memo location:** `F:\A-War-Without-Victory\docs\40_reports\audits\20260522_TRAJECTORY_MECHANIC_GAPS.md`. Confirmed written.

---

## Caveats

1. **n1741 is a 188w run with hash `a4bf8b8095050881`, not the fresh n1935 referenced in the painted-compare analysis (hash `210e69404d054959`).** The trajectory shape in §11 is from the older run; if force-quality trajectories shifted materially between n1741 and n1935 the conclusions about substrate adequacy could need re-validation. However, the n1935 painted-compare flat profile (RS 61.0% w104=w156=w188) suggests the underlying mechanics haven't changed enough to invalidate the substrate-exists / not-load-bearing finding.
2. **The HIST-GAP-3 (comms quality) and HIST-GAP-6 (ethnic cleansing) sections of REAL_WAR_MASTER are not addressed in detail in this memo** — they are tangentially load-bearing for the Krajina arc (comms moreso) but were de-prioritized to keep the top-3 focused on the bilateral collapse mechanics.
3. **No code, scenario, or anchor edits were made.** All findings are from existing audits, REAL_WAR_MASTER, BB1 OOB references, and the n1741 trajectory checkpoint data already in `20260510_FORCE_QUALITY_TRAJECTORY_REASSESSMENT.md`. Codex's parallel work on `src/sim/combat/*` was not touched.
4. **The "officer quality 0.087 → 0.807" curve in §11 for RBiH** is striking but not independently re-verified against canon — the canonical RBiH trajectory in BB1 p.216 ("formed gradually 1992-1993") and HIST-GAP-5 (P1) suggests the engine's climb is *too* smooth and ends *too* high. Worth a calibration check, but does not change the substrate-exists conclusion.
5. **Issue #47 (exhaustion = 0) status as of n1741 is unverified by this memo** — REAL_WAR_MASTER captured it at n1240. If it's been fixed, Signal 10's "ABSENT mechanically dead" verdict downgrades to "absent at the predicate level," but the n1741 fatigue collapse to 0.000 across all factions strongly suggests the underlying bug persists.

---

## Handoff candidates

- **`/operations-expert`** — Gap A wiring: add force-quality differential predicate to the 9-axis op vocabulary; consumer for the n1741 substrate already in state.
- **`/gameplay-programmer`** — Gap B substrate: HIST-GAP-4 per-brigade ammunition + equipment-attrition. Cross-cut with `20260504_EQUIPMENT_QUALITY_MODIFIER_SUBSTRATE.md` scaffolding.
- **`/scenario-creator-runner-tester`** — Gap C event design: Washington Agreement equipment-shock event; patron supply mechanic; Bihać 5th Corps breakout enablement.
- **`/systems-programmer`** — Issue #47 exhaustion diagnosis: why does fatigue/exhaustion reset to 0 in n1741 across all factions? (Likely accounting bug per life_lessons/calibration.md.)
- **`/canon-compliance-reviewer`** — If Gap A wiring requires extending corps-CO briefing or the combat predictor schema, this touches Engine Invariants §6 and needs canon review.
