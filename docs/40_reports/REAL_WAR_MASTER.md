# Real War Master

> The gap between simulation and reality. Every entry here is something we found where the sim does something that would be inconceivable in real war — especially the Bosnian War (1992-1995), a chaotic, desperate, existential conflict.

## Guiding Principle

In the Bosnian War, every brigade mattered. Commanders fought with what they had, where they were. There was no rear echelon luxury. Formations scrounged weapons, walked to the front, and fought from day one. If the sim produces behavior that a real Bosnian War commander would find absurd, it's a bug — even if the code is technically correct.

---

## Latest Review: n1302 (2026-04-02) — Commander Intelligence Overhaul; 93.7% ATH, 25/25 anchors

**Run:** `runs/apr1992_definitive_40w__...` | 93.7% area-weighted | 25/25 anchors | 6/6 benchmarks | hash `0cf989330bd36cc8`

### Summary

New ATH. 25/25 anchors is a historic first. Commander intelligence overhaul (n1294–n1301) shipped: must_hold garrison wiring, org readiness gate, op scale cap, enemy concentration zones, multi-brigade coordination with officer competence, strength-based opportunity target ranking.

### Known Issues at n1302

- **DRINA regression** (~1.5pp vs n1289): Possible freed-brigade cascade from corridor garrison changes. Investigate vrs_drina op counts.
- **ZEA rate 47%** (combat predictor blindspot — COMBAT_MASTER P14): Predictor ignores defender artillery, terrain, entrenchment. 47% of all operations fire with zero eligible attackers. P1.
- **Casualty ratio discrepancy** (0.814 att:def aggregate vs 0.63 in anomaly_detection — different denominators, both faction-blind). See COMBAT_MASTER "Faction-Specific Casualty Context" for correct per-faction-pair interpretation.
- **Exhaustion = 0** (Issue #47 carried from n1240): Still not resolved. Core negative-sum mechanic still dead.

### Verdict

**WAR-OR-GAME: NOT REVIEWED.** War-or-Game is not dispatched automatically from calibration panels (see memory/feedback). Calibration health at 93.7% and 25/25 anchors suggests the macro picture is sound. Issue #46 (ARBiH meat-grinder) and Issue #47 (exhaustion=0) remain open from n1240.

---

## Historical/Doctrinal Blindspot Audit (2026-04-02, Engine Health Review)

Findings from the engine health audit regarding what the sim is structurally blind to about the actual Bosnian War. These are not calibration gaps — they are engine capabilities that do not exist at all.

### HIST-GAP-1: UNPROFOR absent as a mechanical entity — P0

**Gap:** UNPROFOR had 38,000 troops in BiH by 1993 and was the primary supply route into all three major enclaves (Srebrenica, Žepa, Goražde). Their convoys determined whether besieged populations and ARBiH units could resupply. UNPROFOR protection zones in Srebrenica, Žepa, Goražde, Bihać, Tuzla, Sarajevo were the defining strategic facts of 1993–1995.

**Engine reality:** No UNPROFOR entity exists. Enclave supply is computed purely from geographic connectivity and faction supply networks. There is no mechanism where VRS interdicting a convoy reduces enclave supply, or where UNPROFOR presence changes the cost-calculation of an attack.

**Impact:** Enclave dynamics are structurally wrong. Srebrenica in the sim is a pure military siege. In reality it was a partially-open enclave with UN-negotiated supply access, checkpoints, and demilitarization demands. The UNPROFOR layer is the primary reason the 1993–1995 enclave situation looked the way it did.

**Priority:** P0 for v0.9 (Consequences). Not needed for current 40w calibration (Jan 1993 = UNPROFOR just arriving), but essential for any 52w or campaign scenario extending past mid-1993.

---

### HIST-GAP-2: VRS enclave strategy missing — "strangle not capture" — P0

**Gap:** Historically, VRS deliberately refrained from final capture of Srebrenica, Goražde, Bihać, and Žepa throughout 1993–1994. These enclaves were used as bargaining chips — their continued existence justified RS territorial claims, generated civilian hostage leverage, and constrained ARBiH forces that couldn't leave.

**Engine reality:** The bot always attacks at available power whenever it has a positive force ratio. There is no mechanism for "hold available but do not take." VRS will capture any enclave it can reach if the numbers support it.

**Impact:** This is the hardest historical pattern to reproduce without explicit design support. The "strangle not capture" posture requires the bot to recognise specific OSIDs as tactically capturable but strategically valuable as unresolved situations. No equivalent decision framework exists.

**Priority:** P0 for strategic realism. This is a qualitative difference between "wargame that wins" and "sim that represents the war." The RS player's incentive structure must include enclave maintenance as a valid goal. Needs a commander directive type: `contain` (blockade, restrict supply, don't capture).

---

### HIST-GAP-3: Radio/communications quality absent — P0

**Gap:** ARBiH communicated on captured JNA radios, civilian channels, and improvised systems. VRS had JNA-inherited secure communications. This asymmetry meant VRS could coordinate multi-corps operations while ARBiH corps commanders often didn't know what adjacent corps were doing, let alone what was happening at the front.

**Engine reality:** All three factions have identical information access. `buildBriefing()` gives every corps CO complete sector intelligence (modulated by `getSectorIntelConfidence()` but not by communications quality). The ARBiH CO planning an operation at Doboj has the same information fidelity as the VRS CO defending it.

**Impact:** ARBiH operations are planned with unrealistic coordination quality. The "adjacent corps posture absent" gap (BRIEF-GAP-5) partially reflects this, but the root structural issue is that comms asymmetry doesn't exist anywhere in the engine.

**Priority:** P0 for CO intelligence realism. Simplest proximate fix: lower ARBiH `INTEL_GATE_LAUNCH_THRESHOLD` floor (already at 0.40, higher than RS 0.25), and reduce ARBiH intel confidence gain rate. More complete fix: faction-differentiated `brigade_visibility_range` controlling how much of the enemy picture each CO sees.

---

### HIST-GAP-4: Ammunition scarcity per brigade — P0

**Gap:** Individual brigade ammunition levels drove tactical decisions in the Bosnian War in a way that the strategic supply system doesn't capture. ARBiH brigades routinely had 2-3 days of ammunition for an operation with no resupply. VRS brigades often fought at half-capacity when the Posavina corridor was contested. Artillery units sometimes had ammunition for 20–30 rounds total per engagement.

**Engine reality:** Supply is a zone-level factor applied as a single multiplier (`supply_by_osid`). Brigades have no individual ammunition or logistics state. A brigade attacking at `supply: strained (0.75×)` is modeled identically to a brigade with 2 days of ammo — no distinction between "logistics strained but sufficient for one operation" and "genuinely combat-ineffective without resupply."

**Impact:** Operations don't feel resource-constrained in the way that defined Bosnian War command decisions. Commanders would abort operations due to ammunition, not because the force ratio was wrong. The P9 supply recalibration (COMBAT_MASTER) addresses supply routing; this gap is about individual unit logistics state.

**Priority:** P0 for long-term simulation fidelity. Prototype path: add `ammunition_level: number` to `BrigadeState`, drain on operations, resupply from corps supply pool. Not needed for current 40w window (roughly correct behavior from zone supply) but critical for 52w.

---

### HIST-GAP-5: ARBiH 1993 reorganization step-change absent — P1

**Gap:** In late 1992 – early 1993, ARBiH underwent a major structural reorganization: the TO (Territorial Defence) system was formalized into an army hierarchy with corps, divisions, and brigades. This produced a real step-change in ARBiH operational capability — from a loose collection of local defence units to a recognizable command structure.

**Engine reality:** The scenario seeds ARBiH with a complete corps structure from turn 0. There is no modeled transition from TO chaos to corps structure. ARBiH at week 1 has the same organizational capability as ARBiH at week 26.

**Impact:** Early-war ARBiH is too organized. The 1992 ARBiH was making it up as they went — officers were appointed based on availability, not training; units had no organic logistics; orders reached the front 24-48 hours late. The engine models the post-reorganization force as a baseline, not the chaotic pre-reorganization force.

**Priority:** P1. Addressable via scenario tuning (low planning confidence, high intel thresholds for weeks 1–15) without structural changes. The Life Lesson on `home_osid` being a recruitment artifact also applies here — early ARBiH brigade capability was extremely home-bound.

---

### HIST-GAP-6: Ethnic cleansing as a strategic tool — absent — P1

**Gap:** VRS and HVO deliberately cleansed territory to change the demographic facts on the ground, making post-war return difficult and creating ethnically homogenous buffers. This was a strategic decision (Karadzic's Six Goals explicitly included territorial contiguity with Serbia and ethnic separation), not a side effect of combat. Towns like Prijedor, Foča, Zvornik, Vlasenica were cleansed *before* being "defended" — the population was removed so the question of reconquest became moot.

**Engine reality:** Control flips are purely military — a brigade attacks, wins, and the political_controller changes. Civilian displacement follows from control changes and is modeled at the aggregate municipal level. There is no mechanism where a faction proactively displaces civilians to lock in territorial control without military action, nor where the displacement itself changes the strategic situation.

**Impact:** This is a deep design question, not a quick fix. The ethnic cleansing layer is part of the reason the Bosnian War's end state looked the way it did. Without it, the sim models a conventional war with civilian casualties. Implementing it requires a decision-event layer where factions can choose "cleanse and hold" as an alternative to "attack and hold" for certain OSIDs — with its own political cost, international reaction, and strategic effect.

**Priority:** P1 for v0.9 (Consequences). The negative-sum dynamic the game is designed to express is partly about these irreversible decisions. Without a cleansing mechanic, the game cannot fully represent what commanders in this war were actually deciding.

---

## Previous Review: n1240 (2026-03-31) — homelandAbsorbDecisive Removed; decisive always flips

**Run:** `runs/apr1992_definitive_40w__77cac5e01d3c929e__w40_n1240` | 93.6% area-weighted | 22/22 anchors | 6/6 benchmarks

### Checklist

| # | Check | Verdict |
|---|-------|---------|
| 1 | Outcome distribution | CONDITIONAL PASS — 41% decisive, 22% catastrophic, 13% costly, 9% stalemate, 9% repulsed, 6% victory. Decisive rate down from n1150 (56%), more spread into costly/stalemate/repulsed — healthier mid-range. Catastrophic 22% = correct punishment for under-strength attacks. |
| 2 | Casualty volume | PASS — 18.8k attacker + 25.6k defender = ~44k battle casualties. Plus civilian/displacement. Within historical range. |
| 3 | Casualty ratios | CONDITIONAL PASS WITH CONCERNS — Overall att:def 0.731. By phase: blitz 0.232 (correct — VRS steamrolling), sustained 0.956 (reasonable parity), consolidation 1.664 (INVERTED — RBiH attackers taking 67% more casualties than RS defenders in late war). The consolidation inversion is driven by RBiH catastrophic attacks at sub-0.35 power ratios. See Issue #46. |
| 4 | Territory | PASS — RS 52.9% (benchmark 55.3%, deviation -2.4pp, within 5pp tolerance). RBiH 34.8% (above 32.9% benchmark — slight overhold). HRHB 12.2% (above 11.8% benchmark). 22/22 anchors clean. |
| 5 | Force strength | CONDITIONAL — RS 97k (PASS, range 80-100k). RBiH 158k (MARGINAL — still above historical 100-130k but improved from n1150's 161k). HRHB 49k (MARGINAL — above 25-40k historical range). All exhaustion values read 0 across all factions/all weeks — P1 concern, see Issue #47. |
| 6 | Operational tempo | PASS — 87 battles, 38/40 weeks with combat (only w0 and w14 zero-battle). 2.17 battles/wk overall. Blitz 28 battles w0-12 (correct intensity), sustained 25 w12-26, consolidation 34 w26-40 (elevated by RBiH suicide attacks). |
| 7 | Smell test | CONDITIONAL PASS — Blitz battles plausible. Late-war RBiH behavior has serious realism problems. See below. |

### Smell Test — Key Battles

**W2, VRS 1st Bratunac → Bratunac (PR 2.82, decisive, att 264, def 811)** — Bratunac fell April 1992 to VRS/paramilitaries. Ratio and outcome match. PASS.

**W2, JNA 4th Corps TG → Ilidža (PR 10.82, decisive, att 218, def 2880)** — JNA rolling ARBiH defenders in the Sarajevo suburbs week 2. Overwhelmingly plausible for April 1992. Defender 2,880 casualties at 10.82:1 is extreme but correct for a unit caught without cover by armor+artillery. PASS.

**W4, INA Ilijas Garrison → Krivajevići (PR 175.50, decisive, att 110, def 57)** — PR of 175 is the highest in the run. A near-empty hamlet falling to JNA garrison in week 4. Defender takes fewer casualties than attacker despite the extreme ratio (57 vs 110). With homelandAbsorbDecisive removed, this decisive still flips — attacker wins decisively at 175:1 despite taking almost 2× the casualties. Mechanically the ratio is correct (tiny isolated ARBiH position), but att > def casualties at 175:1 is a model quirk. Not flagged as a blocking issue but noted. WATCH.

**W12, VRS 1st Trebava → Garjevac (RS attacks HRHB, PR 2.80, decisive, def brigade = null)** — RS brigade attacks an HRHB-controlled OSID, defender listed as `null`. Defender is absent (uncontested occupation). 12 such battles recorded this run. PASS — uncontested occupation behavior is correct.

**W26-W40, RBiH vs Doboj — 7 battles, 5 catastrophic** — ARBiH brigades repeatedly slam into Doboj at PR 0.24-0.40, taking 450-800 casualties against 47-123 defenders. Five DIFFERENT brigades (330th, 327th, 110th HVO, 17th, 314th, 373rd, 372nd) are fed into the same meat-grinder over 19 weeks. Each takes catastrophic casualties. **This is the most glaring realism problem in the run.** No real corps commander sends a fresh brigade against a known impenetrable position week after week. See Issue #46.

**W35-W38, arbih_503rd → Bihać (3 catastrophic in 4 weeks, PR 0.12-0.29)** — The 503rd attacks the same Bihać OSID three times in four weeks at sub-0.30 power ratios, losing 546-649 men each time (total ~1,774 casualties) against 43-75 defenders. The brigade is visibly dying. No intervention from corps AI. See Issue #46.

**W36, RBiH 120th → Skakava Donja (PR 2.31, decisive, att 95, def 26)** — First n1240-specific decisive flip test: RBiH attacker takes 95 casualties, RS defender takes only 26, but RBiH wins decisively (PR ≥ 2.0 threshold) and captures the OSID. Mechanically correct post-homelandAbsorbDecisive removal. Realism verdict: with a 2.31:1 power advantage, the attacker flipping regardless of absolute casualty numbers is defensible — this is an assault that succeeded at moderate cost. PASS.

**W27-W29, arbih_442nd → Bijela/Konjic (victory/costly, PR 1.57-1.61)** — ARBiH 442nd mountain brigade pushing VRS out of Konjic municipality. Historically plausible — ARBiH did conduct local counteroffensives in the Neretva valley. Costs are proportionate. PASS.

### New Findings

**Issue #46 (NEW, P1): ARBiH bot sends fresh brigades into known catastrophic positions — Doboj and Bihać meat-grinders.**

Seven different ARBiH brigades attack Doboj across w21-w40 at PR 0.24-0.40. Five are catastrophic (450-800 att casualties vs 47-123 defenders). The 503rd attacks Bihać three times in consecutive weeks at PR 0.12-0.29 (losing 1,774 total against ~181 defenders). The bot has no memory of previous catastrophic outcomes at a given OSID. A real ARBiH corps commander would halt offensive operations at a target where five consecutive attacks failed catastrophically — Halilović was callous but not suicidal. This pattern inflates late-war casualty counts, inverts the consolidation-phase att:def ratio (1.664 — attackers taking 67% more casualties than defenders), and burns through ARBiH manpower unrealistically.

**Historical context:** ARBiH did attack repeatedly at Doboj and along the Posavina, but not with fresh brigades every 2-3 weeks against the same fortified position at 3:1 odds against. Real repeat attacks waited for reinforcement, re-supply, and new intelligence. The sim's bot has no learning or inhibition on catastrophic targets.

**Root cause:** Corps AI operation loop has no "catastrophic at this OSID → suspend objective" gate. Once an operation targets an OSID, it keeps assigning new brigades until the objective is either captured or the operation expires. No per-OSID catastrophe threshold exists.

**Status:** P1 — this is the dominant realism failure in n1240. Blocks late-war mechanistic correctness even though aggregate calibration is high.

**Confirmed Doboj mechanism (2026-04-02 investigation):** The proximate failure is structural, not just bot learning.
- `arbih_3rd_corps` auto-generates ops targeting `boljanic_2` (Doboj city) via `findTargetOsidsFromMunicipalities()` adjacency walk from `petrovo_2` (Gračanica, RS-held Ozren foothold on 3rd Corps flank). No depth filter exists — any enemy OSID reachable from a front sector becomes a candidate.
- `vrs_1st_krajina` directive has no `hold_osids` for Doboj OSIDs. Corridor ops (Posavina) drain the garrison budget northward.
- `rs_2nd_armored` brigade gets displaced to petrovo_2 (856 pers, morale 35 by w31), leaving only `rs_1st_krnjin` at boljanic_2 facing a 15-brigade ARBiH operation. Falls turn 31.
- Fix: add Doboj OSIDs (`boljanic_2` + adjacent) to `vrs_1st_krajina` `hold_osids` directive.

**Ozren pocket collapse (same investigation):** All four RS Ozren brigade home positions flip RBiH by w31–40 in current runs. `petrovo_2` (1st Ozren Brigade home), `brijesnica_donja_2` (2nd Ozren home), `vozuca_2` (4th Ozren home) all fall. Historically the Ozren pocket persisted until September 1995 (Operation Farz), well outside the 40w window. Root cause: no dedicated `hold_osids` protection for the Ozren brigades' home OSIDs. Anchor gap: only `vozuca_2` is in `HISTORICAL_OSID_ANCHORS_APR1992_TO_DEC1992`; `petrovo_2` and `brijesnica_donja_2` are unanchored (invisible to calibration scoring). Fix: add both as `expected_controller: 'RS'` anchors.

---

**Issue #47 (NEW, P1): Faction exhaustion is 0 for all factions across all 40 weeks.**

Every faction reads `exhaustion: 0` at w10, w20, and w40. Supply pressure is 100 (max pressure) for all factions all the time. In a 40-week war that kills 44k combatants and displaces over 1M civilians, zero faction exhaustion is not plausible. Historical context: by January 1993, all three factions were experiencing ammunition shortages, manpower strain, and morale fatigue. The exhaustion system either isn't running, isn't writing to the weekly report field, or the numerator accounting bug from the life_lessons calibration.md entry applies here.

**Root cause:** Unknown — could be: (a) exhaustion computation not wired into weekly report, (b) field path mismatch in GameStateAdapter, (c) the threshold accounting bug documented in life_lessons (most values far below threshold). Needs diagnostic.

**Status:** P1 — exhaustion=0 across 40 weeks means no political collapse pressure, no attrition-driven behavior change, no negative-sum dynamics. This is a core mechanic that must be functioning.

---

**Issue #48 (NEW, P2): homelandAbsorbDecisive removal — two edge cases need monitoring.**

With `homelandAbsorbDecisive` removed, decisive_victory always flips. This run shows 36 decisive battles, all 36 flipped (100%). Two edge cases observed:

1. **W4 Krivajevići**: PR 175.50, att 110 > def 57. Attacker wins decisively at 175:1 but takes nearly 2× defender casualties in absolute terms. The power ratio correctly drives the outcome, but the casualty model produces an attacker paying more than the defender at extreme ratios — a quirk of the cube-root scaling at very high PR.

2. **W36 Skakava Donja**: PR 2.31, att 95 > def 26. Attacker flips with 3.7× the defender's casualties. At PR 2.31 (just over the decisive threshold), this is the intended behavior — but it represents a case where a "decisive" outcome looks tactically costly in absolute terms.

Neither case is blocking. The removal of homelandAbsorbDecisive is correct — previously a decisive attack on homeland OSIDs would be absorbed, creating a mechanic that prevented any homeland OSID from ever being captured by decisive_victory. That was worse. These edge cases are expected consequences of deterministic threshold logic.

**Status:** P2 — monitor in future runs. If decisive victories at PR 2.0-2.5 show att > def casualties regularly, consider whether the decisive threshold is too low or casualty scaling needs a floor.

---

**Issue #49 (NEW, P2): 238 invalid operations / 122 zero-eligible-attacker operations.**

The combat_causality section records 238 invalid operation execution events across 40 weeks. 122 are zero-eligible-attacker (operation fires but no brigade can attack). The `valid_for_combat_calibration` flag is `false` for the entire run. While the validation gate (validateOpAtInjection) now surfaces these as warnings rather than silent failures, 238 invalid executions across 10 operations over 40 weeks means the operational machinery is firing correctly in fewer than half its turns. `op_injection_validation` shows Operation Foca firing with all 7 objectives already owned by RS and Operation Herzegovina Consolidation failing entirely (all axes dropped). These are data staleness issues — operations defined for earlier turns being injected after their objectives are already captured.

**Historical context:** No corps commander issues attack orders for positions his own army already holds.

**Status:** P2 — partially addressed by the validation gate. Root cause: operation objective lists not checking current control at injection time before committing.

---

**Issue #42 update (Idle brigades): STILL OPEN.** n1240 shows RBiH running 49 orders vs RS 63 — ratio improved from n1150 (11 RBiH orders was too passive). RBiH is now fighting aggressively in late war (w26-40 has 28 RBiH battles). The idleness problem has shifted: the issue is no longer zero activity but *catastrophic* activity (Issue #46 above).

**Issue #43 update (RBiH overmobilized): MARGINAL IMPROVEMENT.** RBiH 158k vs 161k in n1150. Still above 100-130k historical range. Not resolved.

**Issue #44 update (Inverted casualty ratio): PARTIALLY RESOLVED.** Overall att:def improved from 0.43-0.56 (n1150) to 0.731 (n1240). Blitz phase 0.232 is correct (VRS steamroll). The inversion now only appears in consolidation phase (1.664) and is driven by the Issue #46 meat-grinder pattern, not a systemic model flaw.

**Issue #45 update (Phantom ops): PARTIALLY IMPROVED.** Validation gate now surfaces 9 warnings + 1 error. 238 invalid executions still occur but are now visible. Root cause structural work still needed.

### Verdict

**WAR-OR-GAME: WITHHOLDS APPROVAL.**

93.6% area-weighted is an ATH and 22/22 anchors is clean. The macro picture — VRS blitz, enclave formation, RBiH counteroffensives emerging in late war — is the best the sim has produced. The homelandAbsorbDecisive removal works correctly for its intended purpose.

However, two P1 issues block approval:

1. **Issue #46 (ARBiH meat-grinder):** Five different ARBiH brigades sent to die at Doboj across 19 weeks at 3:1 odds against. The 503rd destroys itself attacking the same Bihać position three weeks running at 0.12-0.29 power ratio. This is the dominant behavioral failure — the bot has no catastrophe-memory on repeated objectives. It inflates late-war casualties, inverts the consolidation-phase att:def ratio to 1.664, and burns through ARBiH manpower ahistorically.

2. **Issue #47 (Exhaustion = 0 always):** A 40-week war producing zero faction exhaustion at any point is not a war — it's a board game where nobody gets tired. If the exhaustion system isn't running or isn't writing, a core negative-sum mechanic is dead. This needs a diagnostic before the next run.

Both issues must be addressed before War-or-Game signs off.

---

## Previous Review: n1150 (2026-03-28) — Ops Validation Engine Gate + Ghost Sector Sanitizer

**Run:** `runs/apr1992_definitive_40w__77cac5e01d3c929e__w40_n1150` | 92.2% area-weighted | hash `1de5c05b2db9112f`

### Checklist

| # | Check | Verdict |
|---|-------|---------|
| 1 | Outcome distribution | CONDITIONAL PASS — 56% decisive, 19% catastrophic, 6% costly. High decisive rate but defensible for 1992 VRS blitz. 12 catastrophic show punishment for bad attacks. |
| 2 | Casualty volume | PASS — ~34k total military casualties. Within 40-60k range for 40 weeks. 34.5k civilian killed (RBiH 31.5k + RS 3k). 1.03M displaced. |
| 3 | Casualty ratios | WARNING — Att:Def 0.43-0.56:1. Defenders take ~2x attacker casualties. Historically backwards for aggregate. Driven by extreme power ratios (5-28:1) where defenders get annihilated. |
| 4 | Territory | PASS — RS 51.4% (target 55.3%, -3.9pp), RBiH 36.1%, HRHB 12.5%. All within tolerance. 22/22 anchors. |
| 5 | Force strength | CONDITIONAL — RS 102k (PASS, range 80-100k). RBiH 161k (FAIL, historical 100-130k). HRHB 44k (MARGINAL, above 25-40k range). |
| 6 | Operational tempo | CONDITIONAL — 1.6 battles/wk avg. 12 zero-battle weeks. RS 76% of orders (correct). RBiH only 11 orders (too passive). |
| 7 | Smell test | PASS — 4/5 battles reviewed plausible. See n960 review for battle details (same patterns). |

### New Findings

**Issue #42 (NEW, P1): 77 brigades (33%) never fight in 40 weeks.**
25 ARBiH, 23 HVO, 29 VRS. 50 are on front lines but never ordered into combat. Root causes: ops-only doctrine + 1 op/corps/time + 8-turn exhaustion cooldown + 5 empty contested sectors. In the real war, nearly every unit saw action by Jan 1993. **Status:** P1 — overlaps with deferred empty sector triage + cooldown/counter-attack broadening fixes.

**Issue #43 (NEW, P2): RBiH overmobilized at 161k.**
Historical ARBiH was 100-130k by Jan 1993. 161k is a mid-1994 number. Either mobilization rate is too high or pool accounting has a leak. **Status:** P2 — needs investigation of RBiH mobilization scale and pool seeding.

**Issue #44 (NEW, P2): Inverted casualty ratio (0.43 att:def aggregate).**
Defenders take ~2x attacker casualties across all battles. In conventional warfare and the Bosnian War, attackers typically take more (1.5-3:1). The cube-root casualty scaling (POWER_RATIO_CASUALTY_MAX=2.0) at extreme power ratios (5-28:1) annihilates defenders while barely scratching attackers. May need a floor on attacker casualties at high PR. **Status:** P2 — not blocking but indicates combat model skews toward all-or-nothing.

**Issue #45 (NEW, P2): 47 invalid operations / 39 zero-eligible-attacker ops.**
Operations fire but brigades can't reach staging or participate. Phantom operational activity. Partially addressed by validateOpAtInjection engine gate (now surfaces warnings), but the underlying brigade-to-staging pathing needs structural work. **Status:** P2 — improved visibility via validation gate.

**Issue #39 update (Ghost sectors): FIXED.** `sanitize-ghost-sector-power` pipeline step now zeroes stale defensive_power on sectors with 0 brigades. Check #11 (phantom_sector_advantage) fires 0 times in n1150. **CLOSED.**

### Verdict

**WAR-OR-GAME: APPROVED WITH CAVEATS.** The macro picture is correct — VRS blitz, enclave formation, 22/22 anchors, 92.2% area-weighted. New validation infrastructure (validateOpAtInjection, ghost sector sanitizer, check #12 fix) improves diagnostic visibility significantly. Five caveats documented above (P1: idle brigades, P2: overmobilized RBiH, P2: inverted casualty ratio, P2: phantom ops, P3: RS territory gap).

---

## Previous Review: n960 (2026-03-19) — Post-Operation Brigade Return March

**Run:** `runs/apr1992_definitive_40w__77cac5e01d3c929e__w40_n960` | 91.2% area-weighted | hash `b806302bec4dae8a`

### Checklist

| # | Check | Verdict |
|---|-------|---------|
| 1 | Outcome distribution | PASS — 77% decisive, 5% costly, 4% stalemate, 4% repulsed, 4% catastrophic. Messy middle still thin but improved from n482's 83% catastrophic. |
| 2 | Casualty volume | WATCH — 33.8k total military casualties (att 11.3k + def 22.5k). Within 40-60k range for 40 weeks, but on the low side. Scales to ~44k at 52w (acceptable). |
| 3 | Casualty ratios | PASS — Att:Def 0.50:1 overall. RS attacks average 0.38:1 (fire superiority, correct). No zero-casualty battles. |
| 4 | Territory | PASS — RS peaks at 370 OSIDs (w17-w21), stabilizes at 367. RBiH recovers 3 OSIDs post-w20 (organic counterattacks). HRHB stable at 86 after losing 14 to RS early. Progression is historically plausible: RS blitz peaks mid-92, front stabilizes. |
| 5 | Force strength | PASS — RS 79 bde / 95k pers / 563 tanks. RBiH 125 bde / 140k pers / 39 tanks. HRHB 28 bde / 46k pers / 18 tanks. RBiH manpower correct (historical 60k→180k trajectory). RS JNA-inherited heavy weapons advantage intact. RBiH tank count 39 (historical ~30-50 by Jan 93, correct with barracks seizure). |
| 6 | Operational tempo | PASS — w0-12: 4.1 battles/wk (blitz), w12-26: 1.4/wk (sustained), w26-40: 0.5/wk (consolidation). Three-phase decay matches RS doctrine. 17 operations completed. Late-war stasis: last battle at w39, but only 2 battles w30-40 — front is frozen, which is historically correct for late-92/early-93. |
| 7 | Smell test | See below |

### Smell Test — 5 Battles Reviewed

1. **w0 rs_1st_posavina → samac_2 PR=9.93 decisive** — VRS 1st Posavina rolls into Bosanski Šamac at 10:1. Historically correct — VRS/paramilitary took Šamac in April 1992 with overwhelming force. PASS.

2. **w3 rs_foa_brigade → brusna_2 PR=16.63 decisive att=104 def=584** — Foča brigade clearing upper Drina at 17:1. Foča fell in April 92 with exactly this kind of ratio. Defender casualties 5.6× attacker — correct for defenders under artillery without cover. PASS.

3. **w12 hrhb_1st_mostar → tasovcici_2 PR=1.9 victory att=352 def=440** — HVO Mostar pushing into Čapljina at nearly even odds. Costly for both sides, marginal victory. This is the HVO-VRS friction zone. HVO attacks at 1.9:1 and barely wins — plausible for HVO limited-strength ops. PASS.

4. **w15 rs_1st_doboj → novo_selo_2 PR=25.2 decisive att=282 def=145** — 25:1 ratio is extreme even for VRS. However, this is a late-blitz mop-up of an isolated position — attacker casualties (282) EXCEEDING defender casualties (145) at 25:1 PR suggests garrison/enclave power. The attacker pays more than the defender despite overwhelming force — not gamey, this is urban/fortified defense working. PASS with note.

5. **w33 RS 3 attacks remaining** — Late war: 3 RS attacks, 3 RBiH attacks, 1 HRHB attack in w26-40 total. Front is frozen solid. Both sides exhausted. This matches late-1992 reality — after the initial offensives, the front stabilized into static positions with only local probing. PASS.

### New Findings

**Issue #32 (NEW): 3rd Corps brigade displacement — partially improved, not fully resolved.**

The post-operation return march reduces 3rd Corps displacement from 16/27 to 9/27 brigades outside home municipality (33% displaced). The 9 remaining are structural: operations displace brigades to adjacent municipalities, and the front line assignment system keeps them there because they're physically at a front OSID. This is the same Phase 1 positional lock identified in issue #27 — brigades anchor where they stand, regardless of home affiliation.

Historically plausible in part: ARBiH 3rd Corps brigades WERE displaced from their home positions as the VRS captured territory. But 33% displacement at w40 is high — a real corps commander would rotate units home during lulls. The return march fix addresses operation-driven drift (brigade returns when op ends). The remaining 9 are front-line-assignment drift (brigade stays at wherever it was last assigned).

**Status:** P3 — improved from P2. Not blocking. The 91.2% area match with 9/27 displaced is acceptable. Full fix requires Phase 1 to consider home affinity when multiple sectors compete for the same brigade.

**Issue #28 update (SRK Sarajevo): Still relevant at n960.** SRK operates with 5 brigades covering the siege ring. Operation Prsten (4 stars, 4 captures) correctly expands the ring but the aftermath leaves brigades dispersed across Vareš/Olovo. The post-op return march will now pull them back after Prsten completes — this was one of the 78 return orders issued. IMPROVED by this change.

### Verdict

**WAR-OR-GAME: SIGNED OFF.** n960 is a clean run. The sim produces historically plausible 1992 Bosnian War dynamics:
- VRS blitz dominates w0-12, stabilizes w12-26, freezes w26+
- ARBiH is overwhelmed initially but grows to 125 brigades / 140k personnel
- Casualty ratios favor the attacker (VRS fire superiority)
- Enclaves form at Srebrenica (2/3 RBiH), Goražde (1/2), Bihać (3/3 RBiH)
- 17 operations complete with historically recognizable names and theaters
- Post-op brigade return march is a sound mechanical addition — no realism regression

**No P1 combat-outcome issues.** Sector audit (below) found structural assignment problems. P2: Drina 79.3% (structural). P3: 3rd Corps displacement (improved).

### Deep Sector Audit (n960, w40) — 14 Empty Sectors, 17 Critically Thin

Full audit of all 75 sectors across 3 factions. 235 active brigades. 497 front edges (perfect bilateral coverage — every edge has sectors on both sides).

**Global statistics:** 14 sectors with 0 assigned brigades. 17 sectors with density <0.1 (critically thin). 9 sectors with density >0.5 (overstacked). 30 reachability violations (brigade location outside sector territory). 3 sectorless brigades.

#### Issue #33 (NEW, P3): Sarajevo 1st Corps 29.7x density imbalance — MOSTLY CORRECT (siege)

Sector :6 (inner Sarajevo, centar/stari_grad) has **9 brigades on 5 edges** (density 1.80, threat_ratio=0). Sector :0 (Gorazde enclave perimeter) has **2 brigades on 33 edges** (density 0.061, threat_ratio=683). Same corps, same commander (Talijan). A 29.7:1 density ratio.

**Assessment: This is the siege working, not a bug.** Sarajevo is a surrounded city — the 9 brigades are bottled up by the SRK siege ring and *cannot* redeploy to Gorazde even if the commander wanted to. The VRS strategy is precisely to keep those brigades trapped and useless. The density imbalance is the intended consequence of encirclement. Historically, the 1st Corps had ~50,000 troops in Sarajevo with no way to use them elsewhere — this is that reality.

**Remaining concern:** The Gorazde enclave (2 brigades on 33 edges, threat=683) is still genuinely thin. But the fix isn't pulling Sarajevo brigades out — it's whether Gorazde's own garrison is adequate. The 4th Corps / enclave-specific reinforcement system should handle this, not intra-corps equalization.

**Status:** P3 — structurally correct for a besieged city. Monitor Gorazde enclave defense separately.

---

#### Issue #34 (NEW, P1): HVO Tomislavgrad — 5 of 9 sectors empty, Kiseljak double-stack

`hvo_tomislavgrad` has 5 sectors with 0 brigades covering 69+ front edges. Sector :6 (Zepce/Teslic, 20 edges) has 1 brigade at **morale 0** (hrhb_111th, combat non-functional). Sector :7 (Vitez/Busovaca corridor, 32 edges) has 2 brigades totaling 1,452 pers. Sector :1 (Kakanj-Vares, 23 edges) is completely empty. Sectors :2 and :3 (Kiseljak-Fojnica, 23 edges combined) are empty.

Meanwhile Kiseljak has **5,476 personnel** stacked at one OSID (hrhb_94th + hrhb_ban_jelacic) while adjacent sectors :2 and :3 have zero. Sector reassignment orders exist in corps directives but haven't executed.

Additionally, `hvo_central_bosnia` has **0 sectors** despite having 7 subordinate brigades — all absorbed into `hvo_tomislavgrad` sectors. The corps exists in `corps_command` but has `status_reason: no_eligible_sectors`.

**Root cause:** HVO is structurally spread across isolated enclaves (29 brigades total). The assignment system concentrates what little strength exists instead of distributing it. The `density_strained` gate correctly blocks operations but doesn't trigger redistribution to empty sectors.

**Status:** P1 — 69 front edges completely undefended. Related to existing issue #14 (HVO Central Bosnia sectorless).

---

#### Issue #35 (NEW, P2): SRK in screening stance — wrong for a siege corps

Both SRK sectors are in **screening** stance (lowest density mode, 0.0x entrenchment rate). For a besieging force that should be fortifying positions around Sarajevo, this is backwards. rs_3rd_sarajevo_infantry is at **Vares** (50km from the siege ring) with morale 6, participating in Operacija Vaganj — a probe targeting Breza. Threat ratios 172-262 on both siege sectors.

**Historical context:** Dragomir Milosevic ran SRK as a siege and containment corps. Its entire mission was encircling Sarajevo. Screening stance implies minimal commitment — the opposite of siege warfare. SRK should be in `defend` or `fortify` at minimum.

**Root cause:** The bot stance selection algorithm doesn't have a corps-specific floor. SRK is treated identically to offensive corps. The low density (6 brigades on 40 edges = 0.15, 4 brigades on 24 edges = 0.17) triggers screening as the "realistic" stance for thin coverage — but for SRK the answer is not "screen thinly" but "hold the ring at all costs."

**Needed fix:** Corps-specific stance floor — SRK minimum `defend`. Potentially `fortify` for the inner siege ring sectors. Related to existing issue #28 (SRK Sarajevo Ring).

**Status:** P2 — doesn't break combat (sector defense uses live computation, not stance), but entrenchment rate at 0.0x means SRK brigades never dig in.

---

#### Issue #36 (NEW, P2): VRS Herzegovina threat_ratio 2,625

Sector :2 (Trebinje/Nevesinje, 20 front edges) has **2 brigades, defensive power 390, threat_ratio 2,625** — the worst in the entire VRS. The front is mostly Graz cold-front facing HRHB (no active combat), so the extreme ratio hasn't caused territorial loss. But if the truce breaks, Herzegovina collapses instantly.

Additionally, `rs_gacko_brigade` (367 pers) and `rs_ajnie_brigade` (0 pers, inactive) are the weakest in the corps. The ajnie_brigade is stranded at `op:gorazde:podkozara_donja_2` — inside the ARBiH Gorazde enclave. Sectorless, no movement orders. Should have dissolved.

**Status:** P2 — cold front means no immediate danger, but structurally fragile.

---

#### Issue #37 (NEW, P2): VRS East Bosnian Corps morale crisis + combat-ineffective in ops

5 East Bosnian brigades at morale 1 (near-collapse). Threat ratios 256-321 on sectors :1 and :2. The Brcko/Posavina corridor is held by willpower alone.

`rs_1st_birac` (369 personnel) is assigned to active Operation Cerska-Kamenica despite being below the 400-personnel combat-ineffective gate. This should block attack posture in `bot_brigade_eval_attack.ts` but the brigade is still listed as an operation participant.

**Status:** P2 — the combat-ineffective gate should prevent actual attacks, but the brigade shouldn't be committed to an operation in the first place.

---

#### Issue #38 (NEW, P2): HVO stale commander IDs — Blaskic commands nothing

`hvo_blaskic` is assigned to `hvo_oz_central_bosnia` — a stale corps ID that doesn't exist in `corps_command`. 4 other HVO officers (`hvo_lasic`, `hvo_matuzovic`, `hvo_tole`, etc.) also reference stale `hvo_oz_*` IDs. These officers are active but orphaned. Central Bosnia's 7 brigades have **no recognized commander** despite Blaskic being available.

**Root cause:** Officer data uses `hvo_oz_*` corps IDs (likely from OOB/scenario data) that don't match the runtime `hvo_*` corps IDs in `corps_command`. The mapping was never migrated.

**Status:** P2 — affects commander modifier application and operation commander selection for HVO.

---

#### Issue #39 (NEW, P3): VRS Drina ghost sectors — 18 edges, 0 brigades (timing artifact)

Sector :2 (Rogatica/Sokolac, 18 edges) has 0 assigned brigades. SCR still shows 685 defensive power from last turn's computation. Brigades were reassigned to the new sector :3 (30 edges, 6 brigades) during sector restructuring. Any attack during the transition would face zero resistance.

**Status:** P3 — timing artifact between sector rebuild and combat resolution. The rederive-osid-front-segments fix (n943) addressed stale front edges; this is the sector-assignment equivalent.

---

#### Issue #40 (NEW, P3): 30 reachability violations — brigades outside sector territory

21 RBiH + 9 RS brigades assigned to sectors whose `territory_osids` doesn't include their `location_osid`. RS violations are almost entirely mid-march brigades (1st Krajina redeploying toward Doboj — 12-hop path). RBiH violations cluster in 1st Corps (Sarajevo outer ring) and 3rd Corps (Travnik/Zavidovici edge positions).

**Status:** P3 — mostly transit-related. The sector system pre-assigns brigades to destination sectors before they arrive. No combat impact (defense uses live location, not sector membership).

---

#### Issue #41 (NEW, P3): Dissolution floor not enforced — hrhb_108th at 100 personnel

`hrhb_108th_brko_brigade` has 100 personnel — below the 150-person absolute dissolution floor. Brigade is active, assigned to `sector:arbih_2nd_corps:8` (cross-faction recruitment — HRHB brigade under ARBiH corps). Multiple ARBiH brigades at 146 personnel are also below or at the floor. The 2-of-3 criteria dissolution check should fire with the absolute floor counting as "low personnel" criterion.

**Status:** P3 — investigate `brigade_dissolution.ts` absolute floor path. May need a separate check or the 2-of-3 criteria aren't met (cohesion/morale still adequate).

---

#### Sector audit: what's working well

- **Perfect bilateral front coverage**: 497/497 front edges have sectors on both sides.
- **Enclave containment**: Srebrenica (5 bde), Bihac (10 bde), Gorazde (4 native bde) — all properly contained.
- **Operation brigade management**: 9 active ops with brigades correctly committed to target sectors.
- **VRS 1st Krajina active redeployment**: 8 brigades in column march toward Doboj — sector pre-assignment working as designed.
- **Post-op return marches**: 78 orders across 17 operations. 3rd Corps displacement 16→9.

## Fixed

### 31. Brigade stacking and rear idling — 6 brigades at one crossroads while front positions empty (n842/n847)

**What we found:** 46 non-Sarajevo OSIDs had 2+ brigades stacked at the same position (worst: 6 at Gornji Vakuf). 36 brigades were 3-11 hops behind their assigned sector front with no code to move them forward. Sub-segment assignment was paper-only — brigades got a sub-segment AoR on paper but no code physically distributed them across that AoR's front OSIDs.

**Historical context:** In the Bosnian War, every position on the front line needed to be physically held. Commanders didn't pile 6 brigades at one intersection while leaving the neighboring village undefended. Units deployed to their assigned positions and dug in. Interior movement to the front was standard — reserve units marched forward when assigned to a sector, they didn't sit in their barracks 80km behind the line.

**Fix:** New `distribute-brigades-to-front` pipeline step (n842): Phase A redistributes freshly-arrived stacked brigades to adjacent empty front OSIDs. Phase B issues column march for rear brigades (max 8 hops). Exempts entrenched (≥1 turn), siege corps, operation participants.

**After fix (n847):** Stacking 46→36 (-22%), far-from-front 36→29 (-19%), at-front 177→187 (+6%). 89.5% area, 5/6 benchmarks. Remaining stacking is entrenched positions — correct, you don't uproot dug-in troops for cosmetic distribution.

**Still open: 3rd Corps brigade displacement (P2).** 16/27 3rd Corps brigades are far from their home municipality. Tešanj brigades at Gornji Vakuf, GV brigade at Zavidovići. Root cause: operations displace brigades south, and the garrison-fill algorithm reassigns by proximity to current location. Home affinity discount (-2 hops) isn't enough to overcome physical displacement. Attempted fix (primary sort by home): caused calibration regression (4/6 benchmarks) because pulling brigades home weakened active fronts. **Correct long-term fix:** post-operation return-to-home-sector logic.

---

### 22. Attack-through picking random targets instead of marching toward objective (n636)

**What we found:** During operation execution, brigades not adjacent to their assigned objective were supposed to fight through enemy territory toward the objective. Instead, `predictAllAdjacentTargets()` returned targets sorted by `power_ratio` descending, and `.find()` picked the first passable one — the *easiest* adjacent target, regardless of direction. A code comment said "Prefer targets closer to the objective (on the path)" but NO distance calculation existed. This caused VRS brigades in Operation Koridor to attack Gradačac (sideways) instead of marching toward Brčko (their actual objective). A corps commander would court-martial a brigade CO who abandoned his assigned axis of advance to attack a random town because it looked easier.

**Historical context:** Operation Corridor 92 was a focused VRS offensive to open the Posavina Corridor to Brčko. Forces were concentrated on the axis Modriča→Brčko, not scattered across the entire Posavina front attacking whatever looked weakest. Military operations have axes of advance; brigades don't freelance.

**Root cause:** `bot_brigade_eval_attack.ts` — attack-through branch used `.find()` on power_ratio-sorted target list. The sorting was for combat prediction display, not for directional priority. The march-toward-objective path existed but was checked AFTER attack-through, making it dead code in practice.

**Fix:** Flipped priority — (1) direct attack objective, (2) march through friendly territory toward objective, (3) attack-through as LAST RESORT only when no friendly path exists. Attack-through also filtered to targets held by same faction as objective.

**Impact:** RS w40 dropped from 0.505 to 0.470 — VRS was previously "conquering" territory by accident through random sideways attacks. Needs rebalancing.

**Lesson:** When a code comment says "prefer X" but the code uses `.find()` on a list sorted by something else, the comment is a lie. Always verify sorting logic.

---

### 9. Non-contiguous corps sectors — 3rd Corps pockets in 2nd Corps territory (n528)

**What we found:** The ARBiH 3rd Corps had 9 sectors including 5 isolated single-brigade pockets (Kakanj, Zavidovići, Gračanica, Vitez, Zenica) surrounded by 2nd Corps territory. A real corps commander would never have his sector boundaries drawn through another corps's deep rear. On the map, this produced sector demarcation lines running through territory far from any front line — visually and operationally absurd.

**Root cause:** `consolidateCrossCorpsFronts` (Step 3b in sector construction) protected edges where a brigade of the current corps was stationed. A 3rd Corps brigade deployed in Kakanj (329th Mountain) prevented Kakanj's front edges from being reassigned to the surrounding 2nd Corps — even though the 3rd Corps's main body was 50km away in Travnik/Bugojno.

**Fix:** New `consolidateIsolatedCorpsPockets` function (Step 3c). After cross-corps consolidation, checks each corps's edges for connected components. Isolated components (not part of the corps's largest body) are reassigned to the neighboring majority corps, overriding brigade-presence protection.

**After fix (n528):** 3rd Corps: 9→4 sectors, 0 isolated pockets. Kakanj/Zavidovići/Gračanica edges absorbed into 2nd Corps where they geographically belong.

**Lesson:** Brigade presence should not override geographic contiguity for corps sector assignment. A single brigade in another corps's territory should be operationally subordinated to the local corps, not create an isolated sector.

---

### 13. Sectors span enemy territory — edge adjacency walked through interior instead of following front (n532)

**What we found:** `sector:arbih_2nd_corps:8` ("Kakanj, Kladanj") had 25 front edges spanning Zavidovići/Maglaj (north) and Kakanj/Olovo/Vareš (south). A massive RS salient separated the two clusters on the map. Two distinct fronts pretending to be one sector.

**Root cause:** `buildEdgeAdjacency()` connected edges whose friendly-side OSIDs were OSID-adjacent — walking through interior friendly territory instead of following the front line. Two front edges (hajderovici_2↔gornja_borovica_2 and vukanovici↔gornja_borovica_2) connected because their friendly OSIDs were polygon-adjacent at a 3m distance_contact point, despite facing opposite sides of an RS salient.

**Fix (n532):** Replaced the OSID adjacency walk with **triple-junction front-line-following** in `buildEdgeAdjacency`, `splitNonContiguousSectors`, and `isSegmentAdjacent`. Two front edges are connected iff they meet at a polygon triple junction: (1) same friendly OSID + hostile OSIDs adjacent, or (2) same hostile OSID + friendly OSIDs adjacent. This follows the actual front line instead of walking through territory.

**Code cleanup (n532):** Removed duplicate edge parsing loop in `splitNonContiguousSectors`, replaced inline `isAdj` closures with module-level `isOsidAdjacent` helper, removed unused `_friendlyOsids` parameter from `isSegmentAdjacent`, fixed O(n³) inner loop in `consolidateIsolatedCorpsPockets` with `osidToFrontEdgeIds` reverse index.

**After fix:** Sectors 52→77. 2nd Corps Zavidovići now separate from Kakanj. Max sector size 24. Area-weighted 87.0%. RS delta -19 (was +104).

**Lesson:** Front-line connectivity must follow the front line itself (triple-junction polygon adjacency), not walk through interior friendly territory. Interior adjacency conflates geographic proximity with front-line connectivity — two OSIDs can be adjacent without their fronts being connected.

---

### 2. 83% of attacks end in catastrophic defeat (n473→n482)

**What we found:** Of 453 battles in 40 weeks, 378 (83.4%) resulted in "catastrophic" defeat for the attacker. Only 56 decisive victories (12.4%). The sim's outcome distribution was the inverse of reality.

**Root cause (CRITICAL BUG):** `attack_resolution_osid.ts` called `computeAttackerPower` with `formation.posture ?? 'defend'` as override. Formations with attack orders but 'defend' posture got `POSTURE_ATTACK['defend'] = 0` → attack power = 0 → power_ratio = 0 → catastrophic. **80% of all "catastrophic" outcomes were fake battles with zero attacker power.** This was not a balance issue — it was a code bug.

**Additional fixes (structurally correct but marginal impact):**
1. **Hasty defense penalty** (combat_math.ts): Formations at entrenchment_turns < 5 get reduced posture defense bonus. At et=0, posture mult = 1.0× (no bonus). Ramps to full over 5 turns.
2. **Defense environmental soft cap** (combat_math.ts): Diminishing returns on terrain×entrenchment×corps×etc. above 1.5× total. DEFENSE_ENV_CAP_THRESHOLD=0.5, COMPRESSION=0.5.
3. **Weighted artillery suppression** (combat_math.ts): Best attacker = full suppression, each additional = +30% (was max-only).

**After fix (n482):**

| Metric | n473 (before) | n482 (after) | Target |
|---|---|---|---|
| Overall catastrophic | 83.4% | 25.3% | <50% |
| Overall decisive | 12.2% | 53.1% | — |
| Early war (w1-12) success | ~17% | 76.7% | 50-70% |
| Late war (w13-40) success | ~14% | 40.9% | 30-40% |
| Bot benchmarks | 6/6 PASS | 6/6 PASS | 6/6 |
| RS delta | -53 | +104 | 0 |
| Total casualties | 19.4k | 21.4k | 40-60k |

**Lesson:** The posture bug fix accounts for >90% of the improvement. The three combat math mechanics are structurally correct but marginal compared to fixing the bug where 80% of attacks had zero attacker power. Always verify the mechanic is actually executing before tuning constants.

**Remaining P1:** RS over-capture (+104 delta), casualty volume (21k vs 40-60k target), HRHB passivity, morale victory boost.

---

### 1. Brigades idling in the deep rear (n438→n473)

**What we found:** At w40, 15 RS brigades (including 1st Armored), 13 RBiH, and 17 HRHB brigades were sitting 2-4 hops behind the front line. Two VRS armor brigades deep in Prijedor. In a real war — especially the Bosnian War — this is inconceivable. Every unit fights.

**Root causes (7 distinct bugs):**
1. `evaluateHomeDefense` trapped ALL brigades at their home municipality with `posture: 'defend'`, even interior ones 4 hops from any enemy. 80% of RBiH and 78% of HRHB brigades were caught.
2. `evaluateReserve` trapped interior brigades as "reserves" regardless of distance from front.
3. `evaluateDefensive` and `evaluateReorganize` caught ALL remaining brigades in defensive/reorganize corps with `posture: 'defend'` — deep rear included.
4. `evaluateSectorMarch` only handled `assigned_brigade_ids`, ignoring `reserve_brigade_ids` entirely. Deep-rear reserves never got march orders.
5. Column march destination was set to the first hop (via `findNearestFriendlyOsidInSet`) instead of the actual destination. The Dijkstra pathfinder got a 1-hop target and produced 1-hop movement — identical to regular movement.
6. Bot AI re-evaluated brigades already in column transit, issuing fresh orders that reset `turns_remaining` to full. Brigades could never arrive.
7. HRHB territory fragmentation: isolated pockets (Kiseljak, parts of Mostar) can't path to sector fronts through own-faction territory. Structural geographic constraint — partially addressed.

**After fix (n473):** RS deep rear: 15→0. RBiH: 13→10. HRHB: 17→13. Remaining are mostly geography-locked (fragmented HRHB territory) or unreachable OSIDs.

**Lesson:** The brigade AI evaluation chain is a waterfall of `if (condition) return true`. Any step that returns `true` for an interior brigade **traps** it — it never reaches `evaluateInteriorMovement`. Every evaluation step must ask: "Is this brigade actually near the front?" before claiming it. Deep-rear brigades should almost always fall through to movement.

---

---

### 31. brka_2 (Brčko) and teocak_krstac_2 (Ugljevik) OSID control errors — FIXED (engine-sprint n51)

**What we found:** Two anchor failures in the n38–n50 calibration runs:
1. `op:brcko:brka_2` (Brka village, Brčko municipality) — should be RBiH per Jan 1993 state. Was consolidating to RS via pocket dynamics: neighbors boce_2, palanka, potocari_2, donji_rahic all flipped RS as EBK swept through Operation Koridor targets.
2. `op:ugljevik:teocak_krstac_2` (Teočak-Krašće, Ugljevik municipality) — should be RBiH per Jan 1993 state. Was falling to RS via Operation Vaganj/Bor cascade after n50 OOB changes inadvertently redirected VRS East Bosnian toward Teočak.

**Root causes:**

**brka_2:**
- The EBK (vrs_east_bosnian) `Corridor 92` directive targeted the entire `brcko` municipality, causing the bot to generate follow-on operations (Hrast, Vihor, Bor, Vaganj) sweeping through ALL Brčko settlements — including southern ARBiH villages like Brka, Maoca, Palanka. Once palanka and boce_2 fell, brka_2 had all RS neighbors → pocket consolidation → RS control without a battle.
- Historically: Operation Corridor 92 focused on E-W road corridor settlements (Krepsić, Skakava Donja). The southern Bosniak villages (Brka, Maoca, Modran, etc.) were NOT VRS corridor objectives — they were contested territory outside the main axis.

**teocak_krstac_2:**
- The 255th Slavna Mountain Brigade (home_osid=koprivna, Kalesija) was historically under-strength in initial OOB data (800 men, cohesion 56). The Majevica hills terrain bonus was absent. This made the Ugljevik-facing sector too weak — VRS bot could generate profitable operations toward Teočak at reasonable power ratios.

**Fix (n51):**
1. **OOB corrections (historically grounded):** Boosted 215th Vitezka Mountain (home bijela_2) 400→700 personnel, cohesion 30→52. Boosted 254th Mountain (home celic_3/Lopare) 600→900 personnel, cohesion 48→55, added defense_terrain_bonus 0.35 (Majevica hills). Boosted 255th Slavna Mountain 800→1300 personnel, cohesion 56→60, added defense_terrain_bonus 0.45. These ARBiH mountain brigades were defending their home municipalities in hilly terrain — historically they were more capable than bare OOB numbers suggest.
2. **EBK directive scoping:** Changed `Corridor 92 (EBK)` directive from `target_municipalities: ['brcko', 'bijeljina', 'bosanski_samac']` to `target_municipalities: ['bijeljina', 'bosanski_samac'], target_osids: ['op:brcko:krepsic', 'op:brcko:skakava_donja']`. EBK now only targets the actual corridor OSIDs in Brčko, not the entire municipality.

**After fix (n51, hash 82f03d43e651669d):** 13/13 anchors PASS, 6/6 benchmarks PASS, 90.1% area match. VRS East Bosnian ran only Operation Koridor (1 operation, 27 captures). No follow-on Brčko sweeps generated in 40w.

**War-or-Game verdict: SIGNED OFF.** The fixes are historically grounded. OOB boosts reflect real mountain brigade capability in home terrain. EBK corridor scoping matches the historical Corridor 92 axis. brka_2 and teocak_krstac_2 hold as RBiH correctly.

**Status:** FIXED (engine-sprint n51).

---

### ~~32. ARBiH 5th Corps Bihać — Ripac attack cycling~~ — FIXED (engine-sprint n58)

**What we found (n51):** ARBiH 5th Corps attacks `op:bihac:ripac` nine times from w19–w40. Every attack is catastrophic. Power ratio declines from 0.50 (w19) to 0.14 (w40). Total attacker casualties: ~2,924. Zero captures.

**Fix (n58):** `failed_offensive_objectives` cooldown system. After `OBJECTIVE_FAILURE_THRESHOLD=2` failed operations on the same objective, `cooldown_until_turn = current + 8` is set in `CorpsCommandState.failed_offensive_objectives`. The objective is suppressed from `offensiveTargets` in `bot_corps_directives.ts` until the cooldown expires.

**Evidence (n58):** Operacija Čelik (t15–t23) fails on ripac → failure_count=1. Operacija Gazija (t23–t28) fails on ripac → failure_count=2, cooldown_until_turn=36. No third Ripac operation in 40-week run. Total Ripac attacks 9→7; suppressed after second failed op. Final save confirms `op:bihac:ripac: { failure_count: 2, cooldown_until_turn: 36 }`.

**War-or-Game verdict: SIGNED OFF 2026-03-14.** Dudaković tries twice, takes serious casualties (444+298 KIA across both ops), and pivots. That's a real commander. The cooldown is organic — not a geographic hard-block, just institutional learning.

**Status:** FIXED (engine-sprint n58).

---

### 33. ARBiH 1st Corps — Foča as offensive target (n54 observation)

**What we found (n54):** ARBiH 1st Corps (Sarajevo garrison) lists `foca` as an offensive target municipality. After the Foča initial-control fix (n54), 1st Corps operations successfully reconquer `op:foca:ustikolina`, `op:foca:prevrac`, and `op:foca:donje_zesce` from RS control, returning them to RBiH by w40.

**Historical context:** ARBiH 1st Corps (Generals Divjak/Karavelić) was the Sarajevo garrison — responsible for defending the city, the enclaves, and the tunnel. The corps was militarily pinned by the SRK siege. It had no capacity or mandate to conduct offensive operations 60+ km south through Trnovo, Kalinovik, and into Foča municipality. The ARBiH forces near southern Foča were the isolated Foča garrison remnants who evacuated to Goražde — they formed part of the 81st Division in the Goražde enclave, not a strike force attacking from Sarajevo.

**Root cause hypothesis:** The Foča municipality is listed in 1st Corps' `target_municipalities` directive because the corps sector boundary includes the area south of Sarajevo (Trnovo, Kalinovik, Pale, Foča). By starting more OSIDs as RS in Foča (n54 override), the 1st Corps sees these as enemy territory within its operational area and assigns attack postures. The sector bot evaluates power ratios and finds openings.

**Impact:** Three northern Foča OSIDs (ustikolina, prevrac, donje_zesce) incorrectly end up as RBiH at w40. Painted target: RS for all three. Cascade from correct initial-control fix creating an operational anomaly.

**Fix options:**
1. Add `op:foca:ustikolina`, `op:foca:prevrac`, `op:foca:donje_zesce` to `hold_osids` for `arbih_1st_corps` directive — prevent 1st Corps from attacking there.
2. Remove `foca` from `arbih_1st_corps` target_municipalities — scopes corps to Sarajevo ring only.
3. Phase B (failed-objective memory) will help if the attacks keep failing before capturing.

**Status:** FIXED n57 (enclave brigade filter in `evaluateSectorOffensiveLaunch`). In n58: 1st Corps correctly targets Sarajevo siege ring only (Operacija Džihad + Biser targeting lukavica/radava/recica/faletici). Zero Foča mismatches confirmed. The n55 `avoid_municipalities` approach was reverted (artificial rule); the organic fix is the enclave brigade filter. **War-or-Game sign-off: CONFIRMED FIXED n58.**

---

## Open / Under Investigation

### 29. ~~Operations continue past viability — ARBiH suicide attacks at 7-21:1 ratios~~ — FIXED (n701 Phase, Issue #29 fix)

**Original finding:** Multiple ARBiH operations running 8-12 weeks at 7-21:1 attacker:defender ratios with 0 objectives captured. Root cause: per-axis failure counter reset on brigade/target rotation, allowing indefinite cycling.

**Fix applied (n5 calibration run, hash 01859ec4dea095cf):** `MAX_OPERATION_ZERO_PROGRESS_FAILURES = 3` in `sector_offensive.ts`. Operations with ≥3 total axis failures AND zero captures AND ≥1 real attack attempted are force-stalled before the per-axis cap (5) can fire.

**Before/after evidence:**

| Metric | Before fix (n701) | After fix (n5) |
|--------|-------------------|----------------|
| Operacija Izlaz duration | w26–w38 (12 weeks) | w26–w36 (10 weeks) |
| Izlaz exchange ratio | 7–21:1 | 0.2:1 |
| Late-war max weekly ratio | 21:1 (w39) | 4.67:1 (w31) |
| Total attacker casualties | 24,312 | 21,918 (−2,394) |
| Area match | 89.4% | 88.9% (−0.5pp) |
| Benchmarks | 6/6 | 6/6 |

**Doctrinal basis:** Three failed attacks with zero progress is enough. Any competent Bosnian War commander — including the notoriously aggressive ones — would halt and reconstitute after three catastrophic failures. The earlier 12-week zero-progress run was indefensible.

**Residual observations (not blocking):**
1. The operation was only shortened by 2 weeks (12→10), not more. This is because axes stall but the operation may continue ticking in stalled state until the formal termination logic fires. Not a realism problem — a stalled operation sitting on the map for a few turns is acceptable.
2. The new 0.2:1 exchange for Izlaz (attackers take LESS than defenders) reflects early probe contacts being cut off before the meatgrinder phase begins. The cheap early probes finding weak outposts before the abort fires — plausible.
3. Operacija Gvožđe (RS 2nd Krajina, w24-w31, 0/3 obj, 6.4:1) is worth watching in future runs. One failed RS operation in mid-late war against entrenched defenders is not gamey on its own, but 6.4:1 is high for any VRS operation.

**War-or-Game verdict: SIGNED OFF.** The fix does what it needs to do. Extreme casualty ratios are gone. The threshold (3 failures) is doctrinally sound. The -0.5pp area match cost is acceptable given what it eliminates.

**Priority:** Closed.

**Files:** `src/sim/combat/sector_offensive.ts` — `MAX_OPERATION_ZERO_PROGRESS_FAILURES`.

---

### ~~30. VRS early-war exchange ratios too costly — Operation Corridor 3.8:1, Prsten 4.3:1~~ — FIXED ORGANICALLY (n703)

**What we found (n701):** VRS early-war operations showed attacker-heavy exchange ratios — Corridor 3.8:1, Prsten 4.3:1. Historically wrong: VRS had fire superiority and JNA-inherited artillery. They should be taking far fewer casualties than they inflict.

**Root cause confirmed:** Operation-level aggregates accumulated costly late-operation stalled attacks. Single-brigade zombie ops (MIN_BRIGADES=1) kept hammering objectives with 0 eligible attackers, each idle turn counting as a failure and dragging the per-operation exchange up. MAX_ZERO_PROGRESS_FAILURES was not catching them fast enough before the aggregate was inflated.

**Fix (n703, organic):** Two prior fixes eliminated the source of the inflation:
1. `MIN_BRIGADES_FOR_OFFENSIVE` 1→2 — zombie single-brigade ops that looped through idle failure cycles are gone
2. `MAX_OPERATION_ZERO_PROGRESS_FAILURES=3` — operations with 0 captures across 3 axis failures abort before compounding

**After fix (n703, hash 10b74532c37cfaac):**

| Operation | n701 ratio | n703 ratio | Historical verdict |
|-----------|-----------|-----------|-------------------|
| Koridor (east_bosnian) | 3.8:1 | **0.26:1** | Correct — fire superiority blitz |
| Prsten (sarajevo_romanija) | 4.3:1 | **0.34:1** | Correct — artillery siege from elevation |
| Drina | 2.0:1 | **0.54:1** | Correct |
| Prijedor | 2.1:1 | **0.47:1** | Correct |
| Ponor (2nd_krajina) | — | **0.28:1** | Correct |

Overall RS early-war (w1-w12): **0.39:1** (54 battles). VRS takes 39 casualties per 100 defender casualties. This is the arithmetic of a fire-superiority blitz: VRS had 500 field guns, defenders had rifles.

**War-or-Game verdict: SIGNED OFF 2026-03-14.** 0.26:1 and 0.34:1 are historically correct for 1992 VRS operations with JNA-inherited firepower vs poorly equipped ARBiH/HVO. The underlying casualty math was never broken — operations were just running too long and bleeding.

**New P3 observation:** Operacija Munja (Drina Corps) targeting vitinica_2/Sapna at 1.41:1. Sapna was an ARBiH enclave that held throughout the war. If Drina Corps keeps launching against it run after run, that's a targeting intelligence question — why does the bot select a historically inviolable ARBiH pocket as an offensive target? Not a fix for today.

**Status:** FIXED (n703, organic).
### ~~29. Zombie operations — MAX_CONSECUTIVE_FAILURES not aborting (n25)~~ **FIXED n32**

**What we found:** RS attacks `op:gracanica:gracanica_2` from w33 to w40 — **eight consecutive turns** with outcomes including PR=0.0 catastrophics. Root cause: `evaluateUncontestedOccupation` checked only `assigned_brigade_ids` when determining if an enemy OSID's sector was defended. `sector:arbih_2nd_corps:11` had `assigned=[]` but `reserve_brigade_ids=['arbih_212th_mountain']` — treated as undefended forever.

**Fix (n32):** `sectorHasBrigades` now checks `[...assigned_brigade_ids, ...(reserve_brigade_ids ?? [])]`. A sector is defended if ANY active brigade (assigned OR reserve) covers it.

**Status:** ~~FIXED n32~~ — gracanica zombie loop eliminated.

---

### 30. ARBiH Foča expansion — Goražde enclave brigades marching to Foča front OSIDs (n25 state, ENCLAVE GUARD PARTIAL FIX n25)

**What we found:** 3 Foča OSIDs (donje_zesce, izbisno, ustikolina) show RBiH control at w40 but are painted RS (expected RS in Jan 1993). Root cause: `sector:arbih_1st_corps:8` spans both Goražde enclave territory AND Foča territory. The overstacking redistribution branch in `bot_brigade_eval_front.ts` was redistributing Goražde enclave brigades to Foča front OSIDs in the same mixed sector (0 brigades there → picked as redistribution candidate).

**Historical context:** ARBiH never held Foča town surroundings at any point in 1992 — Foča fell to VRS in April 1992 and remained RS throughout. ARBiH brigades in Goražde enclave were defending their pocket, not expanding into the Foča plateau. These are distinct theaters separated by hostile territory.

**Root cause:** `sector:8` is a mixed sector spanning two geographically disconnected theaters: Goražde enclave (16 OSIDs) and the Foča area front. The march guard's `hasEnclaveTarget` check passes because Goražde OSIDs ARE in `frontSet`, allowing the march guard to proceed even when the actual destination is a Foča OSID.

**Partial fix (n25):** Added enclave guard to the overstacking redistribution branch — enclave brigades now filtered from redistribution to non-enclave front OSIDs in the same sector. This closes the redistribution path. Remaining: initial sector march path (`findNearestFriendlyOsidDestination`) may still send Goražde brigades toward Foča front OSIDs if `dest` resolves through sector frontSet containing Foča OSIDs.

**Structural fix needed:** Sector:8 should be split at the Goražde/Foča boundary so that Goražde brigades belong to a Goražde-only sector. This is a sector construction issue, not a brigade AI issue.

**Status:** P2 — partial fix shipped (n25). Full fix requires sector split at enclave boundary.

---

### 28. SRK abandons Sarajevo siege — opportunistic targeting has no Graz truce guard (n696)

**What we found:** The Sarajevo-Romanija Corps (SRK, 5 brigades) launches "Operacija Bastion" at turn 28, committing its two strongest brigades (3rd and 4th Sarajevo) to an operation pushing northward: Kakanj → Vareš → Olovo → Visoko. At end of run, the 4th Sarajevo Light (2,788 men) is at Olovo, the 3rd Sarajevo is at Vareš. The Sarajevo siege ring — the corps's entire historical purpose — is left to 3 brigades covering 57 front edges.

**Evidence (n696):**
- `sector:vrs_sarajevo_romanija:4`: 25 edges (Hadžići/Pale/Ilidža siege sector), 1 brigade (1st Romanija, 1,007 men), `threat_ratio: 299.97`
- `sector:vrs_sarajevo_romanija:2`: 6 edges, **0 brigades** — the operation's source sector, emptied when 3rd/4th Sarajevo marched off
- "Operacija Bastion" objectives: `kakanj:poljani_2`, `vares:gornja_borovica_2`, `kakanj:seoce_2`, `olovo:olovo_2`, `olovo:milankovici_2`, `visoko:podvinjci_2` — 5 captured, pushing 50+ km from Sarajevo

**Historical context:** Dragomir Milošević (SRK commander 1994–1996, but Tomislav Šipčić in 1992) ran SRK as a siege and containment corps. Its entire mission was encircling Sarajevo — tightening the ring, controlling the Igman/Hadžići supply route, and mounting the sustained shelling and sniper campaign. A VRS commander sending two of his five brigades to attack Kakanj while Sarajevo's siege ring is held by 1 brigade would be relieved of command. Sarajevo was the political and propaganda centrepiece of the entire VRS campaign.

**Root causes:**

**1. Operation chaining through RS-held waypoints.** The operation legitimately launched against Ilijas/Olovo (RBiH objectives in sector 2's `enemy_osids`). The operation's axis then traversed RS-controlled Kakanj and Vareš OSIDs as sequential "waypoints" — march-first behavior counted these traversals as "captured" objectives, dragging brigades progressively further northeast. 5 of 6 objectives were RS-controlled territory that brigades simply marched through. Only `visoko:podvinjci_2` is an actual enemy objective.

**2. No "hold Sarajevo" strategic constraint on SRK.** The bot treats SRK identically to any offensive corps. `generateCorpsDirectives` computes offensive targets from enemy OSIDs adjacent to SRK sectors — Ilijas and Olovo happen to be adjacent at operation launch. There is no mechanism recognizing that SRK's primary mission is encirclement maintenance, not territorial expansion.

**3. Opportunistic targeting Graz bug — FIXED (n697).** SRK was being directed to attack HVO in Kakanj. Fixed by faction-level Graz block: when Herzegovina truce active, ALL RS corps (except 1KK, 2KK) are blocked from HRHB. SRK no longer attacks toward Kakanj/Vareš.

**4. Siege sector `threat_ratio` = 0 on ring sectors — PARTIALLY FIXED (n701 Phase 4).** Root cause: `reclassifyRearBrigades` (Step 8) demotes the 1-hop rs_ilijas_brigade from assigned→reserve. `computeLocalFrontDefensivePower` uses only `assigned_brigade_ids`, so sector 2 gets `defensive_power=0`. Old formula: `threat_ratio = 0` when dp=0. Fixed: `threat_ratio = 9999` when dp=0 and enemyPower > 0. **Evidence (n11):** sector 2 now shows `threat_ratio: 9999` instead of 0. Area-weighted: 89.2% (unchanged). All 606 tests pass. Hash 1a64bbb94d353173.

**Remaining structural gap (sector 2):** The Step 7→Step 8 cycle persists. `ensureMinimumSectorCoverage` promotes rs_ilijas_brigade to assigned (0-brigade rescue), then `reclassifyRearBrigades` immediately demotes it back to reserve (1-hop not at front). Result: `assigned=[], reserve=[rs_ilijas_brigade]` every turn. The density floor pass requires `assigned > 0` so sector 2 never gets density reinforcement. The stance remains 'defend' not 'Fortify' (no assigned brigades to apply the stance to). The metric is now correct (9999), but the downstream reinforcement chain is still broken for this specific pattern. Direct fix (promoting 1-hop brigade in `reclassifyRearBrigades`) caused -1.9pp regression. Needs a more surgical approach.

**Priority (updated):** Root causes #1 (march waypoints) and #2 (no hold constraint) — P2 open. Root cause #3 (Graz bug) — FIXED n697. Root cause #4 (threat_ratio formula) — PARTIALLY FIXED n701; structural 0-assigned cycle still open.

**Files:** `corps_front_sectors.ts` `recomputeSectorPowerAndThreat` (fix applied), `reclassifyRearBrigades` (structural gap), `ensureMinimumSectorCoverage` (Step 7→Step 8 cycle).

---

### 27. 2nd Corps Lukavac/Doboj — 21-edge front defended by 368 men (n696)

**What we found:** `sector:arbih_2nd_corps:11` covers Lukavac, Doboj, Banovici, Gračanica (21 front edges, 19 territory OSIDs) with a single assigned brigade: `arbih_222nd_liberation` at 368 personnel. Meanwhile Sector 13 (Kalesija, 10 edges) has 5 brigades including three whose home municipalities are Lukavac, Doboj, and Banovici.

**Evidence:**
| Brigade | Home municipality | Physical location | Assigned sector |
|---|---|---|---|
| 223rd Mountain | `op:lukavac:dobosnica_2` | `op:kalesija:kalesija_grad_2` | Sector 13 |
| 224th Mountain | `op:doboj:brijesnica_velika` | `op:kalesija:kalesija_grad_2` | Sector 13 |
| 225th Muslim Mountain | `op:banovici:banovici_2` | `op:kalesija:seher_2` | Sector 13 |

**Root cause:** Phase 1 of `classifyBrigadesByTerritory` assigns brigades by physical location — "defend where you stand." All three brigades physically occupy front OSIDs of Sector 13 (Kalesija), so Phase 1 assigns them there immediately with `continue` — they never reach Phase 2a home-affinity. Their home municipalities (Doboj, Lukavac, Banovici) fall inside Sector 11's territory, but Phase 2a never evaluates them.

**Historical context:** Partially historical. VRS captured Doboj and much of Lukavac in May–June 1992, forcing 2nd Corps brigades to displace eastward toward Tuzla/Kalesija. The presence of Doboj-home brigades in Kalesija reflects that displacement. However, the operational consequence — the largest 2nd Corps sector (by edges) defended by 368 men — is genuinely dangerous for combat resolution. A real 2nd Corps commander would rotate units back through the Tuzla area to cover the Lukavac front even after eastern redeployment.

**Is this a bug?** Not a bug in the assignment logic. It is an emergent consequence of physical displacement + Phase 1's anchor-where-you-stand rule. The Phase 2a home-affinity improvement (n696) cannot help brigades already captured by Phase 1. The problem requires either (a) a sector reinforcement pull that overrides Phase 1 for dangerously thin sectors, or (b) march orders that homeward-orient displaced brigades over time.

**Status:** P2 — historically grounded but operationally problematic. Document for design review: should corps commanders have authority to override Phase 1 positional assignments when sector density is critically low?

---

### 23. Sector-wide casualty cascade — 0.1:1 defender-heavy battles (n647) — FIXED n701

**What we found:** Five decisive victories where the DEFENDER takes 10-15× the attacker's casualties:

| Week | Target | Att cas | Def cas | Ratio |
|------|--------|---------|---------|-------|
| w38 | Donja Kamenica | 109 | 1,671 | 0.07:1 |
| w39 | Donja Kamenica | 91 | 1,252 | 0.07:1 |
| w20 | Kramer Selo | 119 | 1,594 | 0.07:1 |
| w3 | Hotonj | 124 | 1,363 | 0.09:1 |
| w12 | Budozelje | 105 | 919 | 0.11:1 |

A 1-brigade RS attack causing 1,671 defender casualties means the SECTOR's 5+ brigades are all taking proportional hits from a pinprick attack. A real sector commander would absorb a probing attack on one edge without 1,600 casualties across his entire front.

**Root cause:** The n590 fix changed `personnelDefender` from primary-brigade-only to total-sector-personnel. This correctly fixed the 50:1 attacker-heavy outliers but overcorrected — now when a small force attacks one edge of a large sector, the entire sector hemorrhages. The 50% proportional casualty distribution to non-primary sector brigades scales with the total sector base, not the engagement intensity. The specific sub-bug: `DEFENDER_CASUALTY_ENGAGEMENT_CAP` (1.5×) was only applied when `sectorDefenseBrigades.length > 1`. Single-brigade sectors had NO cap — a 109-person probe attacking a 3,000-person single-brigade sector generated 900 defender casualties (ratio 0.007:1).

**Historical context:** In the Bosnian War, a probe against one sector of the ARBiH Tuzla corps wouldn't cause 1,671 casualties across the entire corps front. Losses concentrate at the point of engagement. Adjacent units might take some harassing fire but not proportional casualties from a battle they're barely involved in.

**Fix (n701):** Applied `DEFENDER_CASUALTY_ENGAGEMENT_CAP` unconditionally in `attack_resolution_osid.ts` — removed the `sectorDefenseBrigades.length > 1` gate that left single-brigade sectors uncapped. Overall att:def ratio improved from 0.07 to 0.854 (within range). Worst single-battle ratios no longer exceed 1,600+ defender casualties from a probe.

**Status:** FIXED (n701). Overall casualty volume now 52k total (within 40-60k target). New issue: late-war ATTACKER-heavy ratios (see #29 below).

---

### 24. RS 89.1% attack success rate — too high for 1992 (n647)

**What we found:** RS wins 82 of 92 attacks (89.1%). Only 10 RS attacks fail — 7 at catastrophic, 3 repulsed/stalemate.

**Historical context:** VRS was dominant in 1992 but not at 89% success. Historical success rates were 60-75%. VRS took multiple attempts to break through at Brčko, Goražde held against repeated attacks, the Posavina corridor required massed forces and weeks of fighting. 89% success rate means almost nothing fails — that's not war, that's a steamroller with cosmetic resistance.

**Evidence:** 62.4% decisive victory rate (73/117 battles). Nearly two-thirds of all battles end in decisive victory. The messy middle (costly victory, stalemate) represents only 10.3% combined. Historical warfare produces far more inconclusive engagements.

**Likely root cause:** The unified sector defense model distributes defense thinly across all edges. When RS concentrates 2-3 brigades against one edge, the local power ratio is overwhelming. The defense model needs either stronger minimum-per-edge defense or concentration bonuses for the defender.

**Status:** P1 — monitoring. Related to issue #23 (sector defense model produces extreme outcomes in both directions).

---

### 25. Operation Podrinje Sweep: 23 weeks for 7 captures (n647)

**What we found:** Operation Podrinje Sweep runs w12-w34 (23 weeks) and captures only 7 objectives. The Rogatica-Sokolac axis (4 brigades including 1st Guards Motorized) takes 7 captures over 20 execution turns. The Srebrenica Ring axis (3 brigades) takes **0 of 6 objectives** in the same period. The operation stalls for 5 turns (w20-w25) at 4 captures.

**Historical context:** VRS cleared the Rogatica-Sokolac-Han Pijesak corridor in 4-5 weeks (May-June 1992). The entire Drina valley ethnic cleansing campaign was largely complete by end of June 1992 (8-10 weeks). A 23-week operation for a motorized corps with elite units is absurd — Mladić would have fired the commander after week 8.

**Root causes:**
1. **3-turn planning phase for a follow-on operation.** Drina Corps just completed Op Drina (w1-w11). The same corps, same terrain, same enemy. Follow-on planning should be 1 turn, not 3.
2. **Srebrenica Ring axis non-functional.** 3 brigades, 0 captures. Either the axis can't reach objectives or the brigades are too weak to attack.
3. **Post-sweep: single-brigade zombie ops (Operacija Kamen, Operacija Munja).** Bot-generated operations with `MIN_BRIGADES_FOR_OFFENSIVE=1` launched with a single brigade. With 1 brigade and 0 eligible attackers, `consecutive_failures_on_current` incremented every idle turn, hitting `MAX_CONSECUTIVE_FAILURES_ON_CURRENT=3` after 3 idle turns → objective advanced → op "completed" with 0 captures. Operacija Munja (Drina Corps, n11 w29-w37): rs_1st_bratunac alone, 593 personnel, 0 attacks, 9 weeks wasted. **FIXED n703.**

**Fix (n703 root cause #3):** Raised `MIN_BRIGADES_FOR_OFFENSIVE` from 1 → 2 in `sector_offensive.ts`. A single-brigade "operation" is not an operation — it's a patrol with paperwork. Forced Munja to launch with rs_1st_vlasenica + rs_1st_zvornik (2 brigades) targeting Zvornik objectives. New Munja generated 1 actual attack at w33 (vs 0 forever in n11). Area-weighted: 89.2% → 89.6% (+0.4pp). **War-or-Game sign-off: 2026-03-14.**

**Remaining open root causes:**
- Root cause #1 (follow-on planning duration too long) — Open
- Root cause #2 (Srebrenica Ring axis paralysis: 0/6 captures) — Open

**Evidence:** n703 Munja activity: w32 execution 0 attacks eligible=0, w33 execution 1 attack eligible=1 (NEW), w34 execution 0 attacks eligible=0, w35 recovery. Still failed overall (0 captures) but now generates combat.

**Note:** Bihać anchor failure in n703 is an anchor configuration error, not an engine regression. op:bihac:ripac correctly flips to RS per painted target (Ripac is a peripheral Bihać settlement historically held by VRS, not the Bihać pocket interior). The anchor uses OSID count-based plurality — n703 gives 4RS/3RBiH by count = RS "fails" the anchor. But area-weighted, RBiH holds more Bihać area (bihac_2=150km², velika_gata=152km²) while RS holds mostly rural outer OSIDs. The anchor is misconfigured: it penalizes the correct RS control of Ripac. P3 anchor reconfiguration for Scenario Author. Brčko regression (4 OSID Brka→RS) is genuine but offset by +0.4pp net improvement.

**Status:** PARTIALLY FIXED (n703 + engine-sprint n37/n38). Single-brigade zombie ops eliminated. Painted target corrections for obadi/osmace_2 fixed the primary anchor failures. Root causes #1 (follow-on planning) and #2 (Srebrenica Ring axis topology) remain open.
2. **Srebrenica Ring axis non-functional.** Deep investigation in n32/n37 sprint:
   - **Root cause found:** Ring axis objectives (obadi, kalimanici, petrica, brezovice_2) are enclave-interior OSIDs surrounded by RBiH territory. `obadi` is completely surrounded by 6 RBiH neighbors from initial state → pocket-consolidated to RBiH on turn 1. `osmace_2` starts RBiH (284th East Bosnian brigade home OSID). These OSIDs are NOT accessible to VRS without penetrating the enclave.
   - **Painted target correction (n37):** `obadi` and `osmace_2` corrected RS→RBiH in `painted_control_jan1993.json`. These were census-based (1991 Serb majority), not operational 1993 control. Correctly RBiH throughout the enclave period.
   - `vranesevici` (outer ring, starts RS) auto-advances the axis, but no brigade holds it afterward.
   - Staging OSID (`slapasnica`) not connected to ring objectives via RS territory — brigades can't march-first to objectives.
3. **Post-sweep: Operacija Kamen (bot-generated, w35-w40), 1 brigade, 0 captures.** A single-brigade "operation" is not an operation.

**Fix B (follow-on planning duration) — DEFERRED:** Attempted but caused 2.4pp regression. Corps-ID-only detection treated Drina's Podrinje Sweep as follow-on to Op Drina (different theater). Intel_gathering skip was too broad — accelerates all follow-on ops including different theaters. Needs theater-aware matching (overlapping sector coverage).

**n37 calibration:** DRINA 81.3% area match (improved via painted target corrections; obadi+osmace_2 no longer false mismatches).

**Status:** P2 — vranesevici outer ring still RBiH (ring axis topology broken); follow-on planning deferred (theater-aware logic needed).

---

### 31. Teočak pocket — VRS East Bosnian Corps captures 255th Slavna's home OSID (n38)

**What we found:** After the zombie operations fix (n32), `vrs_east_bosnian` correctly identified `op:ugljevik:teocak_krstac_2` as an RBiH target and launched "Operacija Plamen" — 3 brigades (1st Majevica + 1st and 2nd Semberija, combined 2,770 pers) against the lone 255th Slavna Mountain "Hajrudin Mesić" brigade (800 pers). PR=2.80 → decisive_victory at week_index 30. Teočak ends RS at w40.

**Historical context:** Teočak municipality was a Bosniak pocket in RS-controlled northeastern Bosnia that held for the ENTIRE war. The 255th Slavna Mountain brigade, named after Hajrudin Mesić, defended this enclave against repeated VRS probes and never fell. VRS East Bosnian Corps — occupied with the Posavina Corridor and Drina valley operations — never concentrated sufficient force to break Teočak's defense. The sim's result (3 VRS brigades crushing the pocket in one battle) is ahistorical.

**Root cause:** The zombie operations fix (n32) unblocked vrs_east_bosnian from targeting teocak_krstac_2 (previously, false "undefended" signals kept the corps busy elsewhere). With the fix, the corps correctly generates an operation against the RBiH pocket — but the 3-brigade concentration overwhelms the single-brigade defense despite the terrain bonus (defense_terrain_bonus=0.30). The power ratio reflects the actual numerical imbalance: the sim has no mechanism to model the broader VRS priorities that kept 3 brigades away from a small forested pocket throughout the war.

**Needed fix:** `avoided_osids_by_faction` is prohibited as a calibration mechanism. The structural fix is theater-aware priority weighting in `bot_corps_directives.ts`: a corps with an active large pre-planned operation (Koridor) should not simultaneously generate secondary sector ops against minor pockets. This is the same theater-awareness needed for Fix B (follow-on planning). The two problems share the same root: the bot has no concept of strategic focus — it treats every RBiH OSID as equally valid regardless of the corps's primary mission.

**Status:** OPEN — engine fix needed. Bot priority logic (`bot_corps_directives.ts`) must suppress secondary ops when a pre-planned operation is active or recently completed for the same corps.

---

### 28. SRK Sarajevo Ring — 0 assigned brigades every turn (n703 state, FIXED n703+)

**What we found:** `reclassifyRearBrigades` classified all SRK Sarajevo ring-sector brigades as reserve (1-hop) every turn. `ensureMinimumSectorCoverage` promoted a rescue brigade to `assigned[]` but `reclassifyRearBrigades` immediately demoted it back the next turn. Result: SRK sectors had `assigned_brigade_ids=[]` and `defensive_power=0` at w40 — the Sarajevo siege ring was computationally undefended.

**Root cause:** SRK brigades garrison the suburbs of Sarajevo, sitting 1 hop behind the actual siege line. The 1-hop threshold in `reclassifyRearBrigades` is correct for offensive corps (where 1-hop means genuinely in reserve), but wrong for fortress/siege corps where 1-hop IS the front (brigades physically can't be on the siege line — they sit behind it while covering it).

**Fix:** Zero-assigned guard scoped exclusively to `vrs_sarajevo_romanija`: when `keepAssigned.length === 0` and `reserveCandidates.length > 0`, promote the strongest reserve brigade to assigned. Guard is SRK-only — does not affect offensive corps or ARBiH sectors.

**Status:** FIXED n703+. Verified: 3 SRK sectors with 0 empty `assigned_brigade_ids` at w40.

---

### 14. HVO Central Bosnia — 7 brigades sectorless, `hvo_central_bosnia` has no sectors (n696 state)

**What we found (n696):** `hvo_central_bosnia` corps produces 0 sectors. Its 7 brigades (Jure Francetić, Stjepan Tomašević, 111th, 94th, Ban Jelačić, Kiseljak, Travnik — totalling ~9,825 personnel) are classified as `corps_has_no_sectors` sectorless. They exist in Kiseljak, Vitez, Novi Travnik, Žepče — geographically isolated HVO enclaves with no continuous front-line contact with each other.

**Historical context:** HVO enclaves in central Bosnia were isolated — this is structurally correct for April 1992 (the RBiH-HVO conflict that would isolate them fully begins April 1993). These brigades will become active and sectorable once the HVO-RBiH war fires. Until then their sectorless status is the correct state. The 9,825 personnel aren't wasted — they're garrisoning enclaves that historically survived under siege.

**Status:** Deferred (expected behavior until HVO-RBiH war opens April 1993). Revisit when implementing RBiH-HRHB war arc.

---

### 15. Intra-corps density imbalance — persists in n696, structural causes now clearer

**What we found (n696):** Extreme density imbalances remain. 2nd Corps: sector 11 (21 edges, 1 brigade, density 0.05) vs sector 13 (10 edges, 5 brigades, density 0.50) — a 10× gap. SRK: sector 4 (25 edges, 1 brigade, threat 299) while sector 2 (6 edges, 0 brigades) was vacated by the Operacija Bastion deployment.

**Root cause (better understood n696):** The density imbalance in 2nd Corps is driven by Phase 1 displacement (brigades physically at Kalesija pull away from Lukavac/Doboj front — see issue #27). The SRK imbalance is driven by operation commitment pulling brigades far from their sector. `equalizeSectorDensity` was removed (n403); the current density equalization via `ensureMinimumSectorCoverage` only handles zero-brigade sectors, not low-density ones. `sector_reassignment_orders` moves brigades toward fronts but can't override Phase 1's positional lock or operation commitment.

**Historical context:** Mladić would never tolerate 1 brigade covering 21 edges while 5 sit on a 10-edge adjacent sector. Every VRS unit was committed forward in 1992. The sim is producing the same structural imbalance — it's just the 2nd Corps doing it now, not 1KK.

**Fix (n701):** Added a density floor second pass to `ensureMinimumSectorCoverage` in `corps_front_sectors.ts`. After the 0-brigade rescue pass, transfers surplus brigades (above 1 per `DENSITY_FLOOR_EDGES_PER_BRIGADE=8` edges) from over-staffed sectors to under-staffed sectors gated on `threat_ratio > DENSITY_FLOOR_THREAT_GATE=300`. This correctly reinforced Drina Corps sectors (threat ratios 858-948, 14-23 edges, previously 1 brigade each). Area match improved +0.7pp to 89.4%.

**Remaining gap:** The ARBiH 2nd Corps Lukavac sector (#27) and the SRK Sarajevo ring sectors (#28) are NOT addressed by this fix — the Lukavac sector's threat ratio likely falls below 300 (ARBiH displacement problem, not density), and SRK sectors are drained by operation commitment, not initial assignment.

**Status:** PARTIALLY FIXED (n701). Drina Corps thin-sector problem addressed. 2nd Corps displacement problem (#27) and SRK siege abandonment (#28) require separate fixes.

---

### 3. Per-formation casualty ledger not populated (n473)

**What we found:** The state-level `military.casualty_ledger` works correctly — it tracks per-formation casualties by faction with proper KIA/WIA/MIA breakdowns (RBiH 8,767 KIA, RS 7,391 KIA, HRHB 1,055 KIA). However, the formation's own `casualty_ledger` field (`f.casualty_ledger.kia/wia/mia`) is never populated — it doesn't exist on formations in the save. This means per-unit cumulative loss tracking for UI display, war stories, and decorations must go through the state-level ledger.

**Evidence:** State-level ledger has 82 RBiH, 89 RS, 21 HRHB per-formation entries with real data. Formation-level `casualty_ledger` field is absent.

**Status:** Design gap, not a bug per se. The data exists in `state.military.casualty_ledger.per_formation` — it just needs to be surfaced or mirrored to formation objects if needed for UI/reporting.

---

### ~~4. Zero fatigue across all factions at w40 (n473)~~ — FALSE ALARM

**What we thought:** Average fatigue is 0.0 for all factions. Fatigue system not working.

**What actually happened:** Fatigue is stored in `formation.ops.fatigue`, not `formation.fatigue`. The audit script was checking the wrong field.

**Actual state (n473):** 89/213 formations have fatigue > 0. RS avg 9.10, RBiH avg 5.06, HRHB avg 1.74. 10 formations at max fatigue (30), including multiple RBiH units in heavy combat zones (17th Vitezka, 241st Spreca, 245th Mountain). The fatigue system works correctly — VRS has highest fatigue (most attacks), HRHB lowest (near-passive). Multiple RBiH enclave defenders maxed out.

**Lesson:** Always check `formation.ops.fatigue`, not `formation.fatigue`. The `ops` sub-object holds runtime state.

---

### 5. Full-strength brigades at zero morale (n473) — PARTIALLY ADDRESSED n588/n618

**What we found:** 22 formations at morale=0, 66 at morale < 30. Some with full personnel (2,500+ men). In the real war, a unit at zero morale would be dissolving — desertions, refusals, retreats.

**Root cause (identified):** Morale drift in `morale_drift.ts` applies -2/turn when brigade is in area with <30% own-ethnicity population. Over 40 turns, that's -80 morale from starting 60. Brigades deployed to low-affinity areas (RS units in Bosniak-majority zones, RBiH in Serb-majority) lose morale relentlessly. No positive counterweight for winning/holding ground or victory in battle. There are two problems:
1. **No consequence for zero morale** — formations at morale=0 with full strength keep fighting. They should dissolve, surrender, or at minimum refuse orders.
2. **No morale boost from winning** — VRS was winning in 1992 and morale was high. The sim only drifts morale based on population affinity, encirclement, and exhaustion — not battlefield success.

**Evidence:** VRS morale was high in 1992 (they were advancing), yet sim produces zero-morale VRS brigades.

**Fixes applied:**
- **n588:** Organic desertion mechanic — morale 0: 5%/turn personnel loss; morale 1-14: 2%/turn. Cascade into dissolution criteria.
- **n618:** Battle outcome morale drift with habituation (`1/(1 + count × 0.03)`) and faction sensitivity (victory: RS 0.8×, RBiH 1.3×, HRHB 1.0×; defeat: RS 1.3×, RBiH 0.7×, HRHB 1.0×). Faction home morale floors (RBiH 30, HRHB 25, RS 20 — replaces flat 15). RBiH existential floor (25 at >50% co-ethnic).

**Status:** ADDRESSED (n588 + n618). Zero-morale consequences via desertion. Victory/defeat morale feedback via drift path. Remaining: shock path (immediate morale in `attack_resolution_osid.ts`) not yet modified — deferred to Stage 2 if drift-only proves insufficient.

---

### 6. 64-68% of front OSIDs undefended (n473) — PARTIALLY ADDRESSED n500

**What we found:** Only ~35% of front-line OSIDs have any brigade on them. The rest are empty. While the real Bosnian War had thin front lines, they were continuously manned with at minimum local militia or home defense units. Huge gaps invite breakthroughs.

**Note:** This may be partially by design — 744 OSIDs is a large map and 213 brigades can't cover everything. But the stacking problem (4 brigades on one OSID while 64% are empty) suggests poor distribution rather than genuine shortage.

**Status (n500):** Unified sector defense model now treats the front as a continuous locked line — defense at any OSID = `totalPower * (1/sector_edges) * densityMod`. Empty OSIDs are no longer completely undefended; the sector's total power covers all edges. Casualty distribution: 50% primary (closest brigade), 50% proportional to remaining sector brigades. This is a structural fix — the problem shifts from "undefended gaps" to "defense per edge too thin" (100% attack success rate in n500). Defense needs a minimum floor per edge.

---

### 7. HVO near-total passivity — 0 attacks in n560, 30 orders in n618 — PARTIALLY STRUCTURAL

**What we found:** HRHB conducted 0 attacks in n560 (was 11 in n473 before ops-only doctrine). By n618, HRHB produces 30 orders — improved but still below historical 40-60.

**Historical context:** HVO was offensively active in 1992, but constrained:
- **Operation Jackal** (Jun 7-26): HVO/HV liberated Mostar (Jun 11-12), captured Stolac (Jun 13), seized 1,800 km² — the first major VRS defeat of the war. After Jackal, east Herzegovina settled into de facto truce (the Graz Agreement).
- **Posavina** (Mar-Oct): HVO/HV defended Bosanski Brod, counterattacked Modrica/Derventa. Critical: included **Croatian Army (HV) reinforcements** that the sim does not model.
- **Kupres-Livno axis**: HVO stopped JNA advance at Suica and Livno (Apr 10-13)
- **Central Bosnia**: HVO consolidating Lašva Valley, but always keeping one eye on the uneasy RBiH alliance. Could not commit fully to anti-RS operations because they needed to protect their own enclaves.
- **Jajce**: Joint HVO-RBiH defense against VRS. Sim does not model joint operations.

**Root causes (revised n618 investigation):**

The original diagnosis ("Graz too broad") was **wrong**. The Graz Accords correctly model the Herzegovina truce only. Non-Herzegovina corps (hvo_northwest_bosnia, hvo_central_bosnia) are NOT Graz-blocked. The real causes:

1. **HVO Posavina corps is under-strength**: `hvo_northwest_bosnia` has only 1 brigade in the scenario. Cannot launch sector offensives with 1 brigade. Historically, HVO Posavina had Croatian Army (HV) reinforcements — multiple HV brigades crossed the Sava. The sim does not model cross-border HV deployment.
2. **Central Bosnia fragmentation**: `hvo_central_bosnia` has 6 brigades but scattered across disconnected enclaves (Kiseljak, Vitez, Busovača, Žepče). These can't mass for operations. This is **historically accurate** — HVO central Bosnia was always fragmented.
3. **Uneasy RBiH alliance**: HVO in central Bosnia couldn't commit forces against RS because they needed to protect their enclaves from potential RBiH encroachment. The HVO-RBiH relationship was cooperative but tense throughout 1992, with HVO always hedging. This strategic constraint is real, not a bug.
4. **No joint operations**: Jajce defense was joint HVO-RBiH, but the sim has no mechanism for cross-faction cooperative operations. HVO alone couldn't hold Jajce.
5. **Herzegovina correctly Graz-blocked**: `hvo_southeast_herzegovina` and `hvo_tomislavgrad` are bound by Graz corps-pair truce. East Herzegovina pair only activates AFTER Op Jackal. This is correct — the Graz Agreement was literally a Serb-Croat truce for Herzegovina.

**OSID analysis confirms RS targets exist** in HVO municipalities (Derventa 4 RS, Bosanski Brod 3 RS, Jajce 3 RS) — the issue is force availability, not target availability.

**n618 status (30 HRHB orders):** Op Jackal pre-planned operation produces most HVO attacks in the east Herzegovina window. Some central Bosnia activity. Posavina remains quiet (1 brigade can't attack).

**Status:** MOSTLY STRUCTURAL — not a Graz bug. Remaining gap (30 vs 40-60 historical) explained by: (a) no HV cross-border reinforcement for Posavina, (b) no joint HVO-RBiH operations for Jajce, (c) central Bosnia fragmentation is real. These are design limitations, not engine bugs. Future improvements: HV reinforcement modeling, joint operations system. Low priority — current behavior is defensible.

---

### 8. Brigade stacking — 4 units on one OSID, most front empty (n473) — PARTIALLY ADDRESSED n500

**What we found:** 6 OSIDs have 4+ brigades stacked on them. 5 OSIDs have 3. Meanwhile 64% of the front is empty. In the real war, commanders distributed forces along the front. Having 4 brigades in Banja Luka rear area while the Posavina corridor is undermanned is militarily absurd.

**Evidence:** `op:banja_luka:rekavice_2` has 4 RS brigades. `op:centar_sarajevo:sarajevo_dio_centar_sajarevo` has 4 RBiH brigades. `op:neum:gornje_hrasno_2` has 4 HRHB brigades.

**Status (n500):** Unified sector defense mitigates the impact — stacked brigades contribute to the entire sector's defense, not just the OSID they occupy. Concentration bonus rewards grouping 2-4 brigades for offensive operations. The stacking itself is less harmful now, though distribution remains imperfect.

---

### 9. Entrenchment saturation — every defender at max by week 6 (n473)

**What we found:** 195/213 formations have `entrenchment_turns` > 0, with average 11.3 (max 12). Since `MAX_ENTRENCHMENT=6` caps the defensive bonus, this means effectively ALL defenders are at maximum entrenchment after just 6 weeks. This combines with terrain, corps stance, resilience streak, urban, and front density bonuses — all multiplicative. The stacking may explain the 83% catastrophic attack rate (issue #2).

**Evidence:** Individual entrenchment bonus at cap is only 17.1% (`sqrt(6) * 0.07`). But combined with terrain (1.2-1.5×), corps stance (1.1-1.3×), resilience (up to 1.1×), and other multipliers, defenders can easily reach 2× effective power.

**Real war context:** In the Bosnian War, initial positions in April-June 1992 were hasty and poorly fortified. VRS assaults succeeded largely because defenders hadn't dug in yet. By late 1992, entrenched positions became harder to crack — Goražde, Sarajevo. The sim reaches "late 1992 entrenchment" by week 6, making the entire war feel like trench warfare from week 6 onward.

**Status:** Partially addressed (n482). Hasty defense penalty (5-turn ramp) + defense environmental soft cap (50% compression above 1.5×) implemented. The dominant fix was the posture bug (#2). Entrenchment saturation itself is marginal compared to the multiplicative stacking — the soft cap now compresses extreme stacking. Monitoring.

---

### 10. No morale boost from battlefield victory (n473) — FIXED n618

**What we found:** The morale drift system (`morale_drift.ts`) only adjusts morale based on population affinity, encirclement, and exhaustion — never from winning or losing battles. A formation that wins 10 consecutive victories gets zero morale boost. A formation that loses everything gets no additional penalty beyond combat casualties.

**Real war context:** Victory is the primary morale driver in real armies. VRS morale was high in 1992 because they were winning everywhere. ARBiH morale plummeted initially because they were losing, then recovered as they organized and achieved small victories. The sim has no mechanism for this.

**Fix (n618):** Battle outcome morale drift added to `morale_drift.ts`. Drift path (`BATTLE_MORALE_DRIFT`: decisive +5, victory +3, costly +1, stalemate 0, repulsed -2, catastrophic -4) now fires each turn based on `recent_battle_outcome`. Three modifiers:
1. **Battle habituation**: `1/(1 + battle_outcome_count × 0.03)` — diminishing returns. After 20 battles: 62%, after 40: 45%.
2. **Faction victory sensitivity**: RS 0.8× (expected victories), RBiH 1.3× (each win proves the army), HRHB 1.0×.
3. **Faction defeat sensitivity**: RS 1.3× (expects to win, defeats sting more), RBiH 0.7× (expects to lose, numbed), HRHB 1.0×.

**Calibration (n618):** 6/6 benchmarks PASS, 86.3% area-weighted, zero regression from n617. RS w40 0.517.

**Status:** FIXED (n618). Drift-only approach — shock path unchanged (Stage 2 if needed).

---

### 34. VRS 1st Krajina Corps — Operation Corridor 92 doesn't happen (n58)

**What we found (n58):** The 1st Krajina Corps (1KK) launches two consecutive operations to open the Posavina Corridor — "Operation Corridor" (t9–t17) and "Operation Posavina Corridor" (t18–t26) — and generates **zero attacks in both**. Targets: Modriča, Garevac, Donja Dubica, Potočani, Novo Selo (Posavina axis), plus Ostra Luka and Makljenovac. All 7 objectives fail silently: 6 planning turns + 4 execution turns + 0 attacks = no-logged-attempt abort. At w40, the 1KK has instead swept central Bosnia: 16th Krajina Motorized, 1st Armored, 2nd/3rd/4th Banja Luka brigades are all at Donji Vakuf. Op Sadejstvo (t29–t38) captures 4 Donji Vakuf OSIDs instead.

**Historical context:** Operation Corridor 92 (June 24 – July 11, 1992) was the single most important VRS strategic operation of the entire first year of the war. The 1st and 2nd Krajina Corps, with elements of the East Bosnian Corps, massed ~40,000 troops and hundreds of artillery pieces to drive east along the Sava River through Modriča toward Brčko and link up with eastern Bosnia. The corridor was essential — without it, the Krajina (western Bosnia + Banja Luka) was strategically isolated from eastern Bosnia, Serbia, and VRS Main Staff. Mladić personally oversaw the operation. It succeeded within two weeks.

In the sim: not a single shot fired on the Corridor axis. 1KK instead attacks central Bosnia (Donji Vakuf), which was historically a peripheral theater. This is like saying the D-Day landings never happened and the Allied armies invaded Turkey instead.

**Evidence (n58 final save):**
- `vrs_1st_krajina` operation AARs: Corridor (t9–t17) 0 attacks, Posavina Corridor (t18–t26) 0 attacks
- `rs_1st_vujak_light_infantry` @ `op:modrica:vranjak_2` (actually IN Modriča municipality but never attacked the corridor objectives)
- 1KK failed_offensive_objectives: modrica_2, garevac_2, donja_dubica, potocani_2, novo_selo_2, ostra_luka, makljenovac — all `failure_count: 1` (single failed op each), `cooldown_until_turn: 0` (threshold=2 not reached, so no actual cooldown)
- 1KK w40 brigade locations: 16th Krajina Motorized @ donji_vakuf, 1st Armored @ donji_vakuf, 1st/2nd/3rd/4th Banja Luka @ donji_vakuf. Zero brigades on the Sava River.

**Root cause hypothesis:** March-first logic fails for the Corridor objectives. After Op Prijedor (w0–w9) captures Prijedor/Sanski Most/Ključ, most 1KK brigades are deployed in the northwest Krajina. The Corridor targets (Modriča, Odzak, Bosanski Šamac) are ~70km northeast along the Sava. Between the Krajina and Modriča, the territory is either hostile-controlled or the friendly RS path doesn't exist yet. Without a connected friendly-OSID path, march-first returns no route, attack-through finds no adjacency either, and the brigades stand still for 4 execution turns before the no-logged-attempt abort fires.

Meanwhile, Donji Vakuf (central Bosnia) has enemy OSIDs adjacent to 1KK sectors via the corps' southern front edge — so Sadejstvo can actually reach its objectives. The bot pivots to where it can fight, abandoning where it can't.

**Priority: P1.** This isn't a minor calibration miss. The Posavina Corridor was the foundational VRS strategic achievement of 1992. The sim producing a 1KK that ignores it entirely and instead drives into Donji Vakuf is historically indefensible. Every consequence of the Corridor not opening — eastern Bosnia isolated, 1KK deep in central Bosnia, RS territory in the wrong shape — cascades.

**Status: FIXED (n1002, 2026-03-21).** Two changes: (1) Removed premature triggered Op Derventa (w4, 2 brigades — too early, too weak). (2) Strengthened pre-planned Op Corridor: 5 brigades on main axis (27th Derventa Moto, 43rd Prijedor Moto, 16th Krajina Moto, 5th Kozara, 1st Trebava) + 1st Doboj on southern axis + `min_attack_outcome: 'repulsed'`. Brigades redeployed from Op Prijedor after it completes (~w10). Combined with EBK Posavina Flank: 9 VRS brigades (~8,200 pers) vs ~5,350 HVO. Emergent result: Modriča w10, Odžak w12, Derventa w18-19 (stalemate then costly victory — HVO resisted), **Bosanski Brod w27** (historical: w28). Orašje pocket holds. **91.9% area-weighted.** Posavina NE 94.9%. No hardcoded OSID flips — pure force concentration produces historically accurate corridor opening.

---

### 35. ARBiH corps operations — systematic stall with zero attacks (n58)

**What we found (n58):** Three of five ARBiH corps launch their first operation, enter execution phase, and generate zero attacks across 3–4 execution turns, then abort:

| Corps | Op | Execution turns | Attacks | Targets | Brigade locations |
|-------|-----|-----------------|---------|---------|-------------------|
| 3rd Corps | Operacija Strijela (t15–t27) | 5 | 0 | Donji Vakuf, Jajce, Bugojno | 705th (194 pers), 707th (126 pers), 717th (316 pers) — ALL below 400 combat gate |
| 4th Corps | Operacija Rijeka (t15–t26) | 5 | 0 | Konjic (bijela_2, sitnik) | 441st @ Kalinovik, 442nd/445th @ Mostar — none adjacent to Konjic objectives |
| 2nd Corps | Operation Teočak (t25–t34) | 4 | 0 | Zvornik (rastosnica_2) | 241st/242nd @ Brčko (boce_2), 245th @ Brčko — ~60km from Zvornik target |

**The 3rd Corps case is especially egregious:** Operacija Strijela launches with arbih_705th (194 personnel), arbih_707th (126), and arbih_717th (316) as the assigned brigades — all three below the `COMBAT_INEFFECTIVE_PERSONNEL=400` gate. `hasEligibleAttackersForLaunch()` in `sector_offensive.ts` is supposed to prevent this, but the operation launched anyway. Either the guard fired on a different brigade set at launch time, or there's a gap in the check. The result: a 12-turn operation that generates zero attacks and wastes all 5 planning + 5 execution turns.

**Historical context:** ARBiH corps were operationally active from mid-1992 onward. 4th Corps (Arif Pašalić) held the Neretva valley and was actively engaging VRS in Konjic, Mostar, and Jablanica throughout the summer. 2nd Corps (Sead Delić) was defending Tuzla, Zvornik, and the Birač corridor — not sitting in Brčko while Zvornik objectives sit untouched. 3rd Corps (Enver Hadžihasanović) was fighting in the Lašva Valley/Donji Vakuf/Jajce region. Zero attacks from three corps in their first operation cycle is not "ARBiH was weak in 1992" — it's a staging and eligibility problem.

**Root causes:**
1. **4th Corps and 2nd Corps:** March-first staging fails. The assigned brigades are physically far from the objectives. No friendly RS path to march through; attack-through finds no adjacency. 4 execution turn no-logged-attempt abort fires.
2. **3rd Corps:** The `hasEligibleAttackersForLaunch()` guard may have passed at operation creation time (when eligible brigades were present in the sector), but by execution those brigades moved or were re-assigned. Or the check itself has a gap — needs investigation.

**Priority: P2.** ARBiH passivity is a long-standing issue but three simultaneous zero-attack corps operations is worse than expected. The 3rd Corps case specifically (launching with combat-ineffective brigades) may be a `hasEligibleAttackersForLaunch` gap worth fixing.

**Status:** MOSTLY FIXED (n76). Fix: `minAttackOutcomeForOpLaunch` captured before supply gate in `bot_corps_directives.ts` (see Knowledge entry). 3rd/4th/2nd corps now generate attacks in execution. RBiH total attacks 27→35. Remaining: see Issue #36 below.

---

### 36. 1st Corps Operacija Zora — 10-turn zero-attack execution (n76 observation)

**What we found (n77 diagnostic run):** Operacija Zora (1st Corps, w31–w40) targets `op:foca:donje_zesce` and `op:kalinovik:varos_2` (both RS-controlled). Assigned brigades: `arbih_104th_vitezka_motorized` (138 pers — combat-ineffective), `arbih_111th_vitezka_motorized` (1063 pers, Trnovo), `arbih_124th_light_king_tvrtko` (1528 pers, Pale). `elig=0` throughout execution (w35–w40). The operation stalls at w41 (1 turn past the 40-week window) via the `movement_only_execution_turns` stall.

**Root cause:** `kalinovik:varos_2` has no adjacent friendly OSID accessible via the current sector structure (Kalinovik is entirely RS-surrounded). `getSectorOffensiveApproachOsids` for Kalinovik returns the sector's approach OSIDs, but those require a multi-hop march from Trnovo (111th/124th). The planning march (w31–34) doesn't complete the full path, so brigades are still mid-transit at execution start. During execution, movement orders alternate with idle turns (march 1 turn → arrive at intermediate → no approach OSID found → idle → new march → repeat). This alternating pattern evades both stall counters (movement_only and idle_streak increment alternately, each staying below the threshold of 4). The 104th at 138 personnel is combat-ineffective and contributes nothing.

**Evidence:**
- w35–w40: `elig=0`, `movement_only=1→3`, `idle_streak` resets each march turn
- `objective_capture_count=0`, `battle_count=0` — zero progress in 10 weeks
- Operation stalls at w41 (outside 40-week window); zero calibration impact

**Attempted fix:** Combined `movement_only + idle_streak ≥ MAX` stall check. Caused -1.0pp area regression (90.3→89.3%) and +9 RS attacks due to operation cascade changes. **REVERTED.**

**Why it matters:** 10 execution turns of ghost activity is not a calibration issue (0 attacks) but represents wasted command cycle for 1st Corps. Historically, the 1st Corps under Rasim Delić was actively defending Sarajevo and raiding toward Trnovo — not locked in a frozen planning cycle.

**Proposed fix (not implemented):** Launch-gate check in `evaluateSectorOffensiveLaunch` — if the first objective has no adjacent friendly OSID within the current sector sub_segments AND no assigned brigade is within 1 hop of any adjacent friendly OSID, reject the launch. This prevents Kalinovik-style operations that are topologically unreachable via march-first without changing the stall mechanism.

**Priority: P3.** Zero calibration impact. Stall mechanism works correctly (fires at w41). Low urgency.

**Status:** Open. P3. Fix should be at launch-gate, not stall-detector.

---

### 37. HVO Croat-Bosniak war doesn't emerge — hrhb_political_goal is write-only (2026-04-23, 188w validation) — OPEN P1

**What we found:** 188w validation run (`apr1992_definitive_188w`) on the freshly-refreshed historical baseline (post PR #8 fix where `hrhb_political_goal=croat_republic` is now the correct historical default). HRHB issues **2 attack orders across 188 weeks**. Total attack orders: RS=49, RBiH=35, HRHB=2. `hvo_tomislavgrad` has 18 front edges, 3 brigades, **0 battles after 188 turns** — dead front. `hvo_central_bosnia` has 4 brigades at morale 0-6 without ever engaging an enemy. Raw run: `/tmp/awwv_200w_validation/apr1992_definitive_188w__c35fff9119f1a06b__w188_n0/`.

**Historical context:** The Croat-Bosniak war of 1993-94 has a two-phase shape the sim must express:

1. **Early 1993 — HVO aggression.** HVO initiates: Ahmići massacre (April 1993), Vitez offensive, Busovača, Gornji Vakuf, Prozor (October 1992), Mostar east bank (May 1993), Stolac, Čapljina, Ljubuški. These are HVO attack orders against ARBiH positions in central Bosnia and the Neretva valley.

2. **Mid-1993 onward — ARBiH counter-offensive; HVO on the defensive.** After the initial HVO push, ARBiH 3rd Corps counterattacks and reverses the momentum. Kakanj, Travnik, and surrounding territory flip back to ARBiH. HVO is reduced to defending **three besieged enclaves** in central Bosnia: the **Vitez pocket** (Vitez-Busovača-Novi Travnik), the **Kiseljak pocket**, and the **Žepče pocket**. These three enclaves remain HVO-held but surrounded through the Washington Agreement (March 1994) and beyond.

Meanwhile, Herzegovina (Mostar, Stolac, Čapljina) remains contested on different terms; HVO holds west Mostar and southern Herzegovina with HV backing.

With `hrhb_political_goal=croat_republic` set correctly, the sim should express both phases: a compressed HVO offensive spike around w52-w60, then an ARBiH-vs-HVO inversion from w60 onward, producing the three-enclave defensive posture by Washington Agreement.

**Root cause:** The `hrhb_political_goal` flag is written (by the `hrhb_political_goal` event's response options) but never read. `grep -rn '"flag": "hrhb_political_goal"' src/ data/` returns zero reader sites. Nothing in `bot_strategy.ts`, `bot_corps_ai.ts`, `bot_brigade_ai_osid.ts`, or operation-generation code consumes this flag to generate HVO-vs-ARBiH offensives.

**Why invisible before 2026-04-23:** Prior baselines had `hrhb_political_goal=united_front` set by a response-ordering bug (PR #8 fixed it). Under united_front, no Croat-Bosniak war was expected; HVO inactivity was superficially consistent. With the flag now correctly set to `croat_republic`, the missing wiring becomes observable.

**Fix shape (tracked in issue #9):** Most likely a new consequence-event chain analog gated on `flag_equals hrhb_political_goal = croat_republic` + `turn_min: 48`, using `bot_priority_shift` to add central-Bosnia municipalities (Vitez, Gornji Vakuf, Prozor, Stolac, east Mostar) to HRHB offensive_objectives + `doctrine_constraint` with offensive scope + `aggression_modifier`. Two alternative approaches documented in issue #9.

**Impact:** Post-w52 simulation trajectory diverges sharply from history. HRHB stays on defensive/garrison posture indefinitely. HRHB vs_historical at −43 OSIDs in 188w (82 vs 125 jan1993 reference). Calibration against jul1995/oct1995 references will be dominated by this gap.

**Priority: P1.** Not blocking day-to-day work but the engine's flagship "player choice shapes history" promise is incomplete without this wiring. Should be the first engine-gap issue picked up next session.

**Related:** Issue #9. Extends known-baseline note "HVO inactivity in 1992 is historically correct (outside Posavina/Jackal)" — that note is scoped to 1992 only and does NOT cover 1993-94.

---

### 38. srebrenica_falls_1995 pressure event never triggers by w170 (2026-04-23, 188w validation) — OPEN P1

**What we found:** 188w validation run with `srebrenica_enclave_formed=true` (set normally) but `srebrenica_fell` flag never sets. The historical fall was July 1995 (~week 170 in apr1992_definitive_188w). Downstream consequence: Chain 3 (Srebrenica Survives) fires all 4 events (`csq_srebrenica_stalemate_1995`, `csq_enclave_drain_continues_1995`, `csq_alternative_nato_trigger_1995`, `csq_prolonged_war_exhaustion_1995`) because its gate (`flag_not_set srebrenica_fell`) evaluates true.

**Historical context:** Srebrenica was overrun by VRS in July 1995 in a deliberate operation under Mladić's command, resulting in the massacre of over 8,000 Bosniak men and boys. The fall triggered Operation Deliberate Force and the endgame ground offensive that led to Dayton. Srebrenica NOT falling is the single most consequential departure from history in an apr1992→dayton campaign.

**Likely root cause:** `srebrenica_falls_1995` in `data/scenarios/events/war_1995.json:296` is pressure-based (`base_rate: 1, threshold: 8, decay_rate: 0.5`) with trigger conditions `srebrenica_enclave_formed=true AND srebrenica_demilitarized=true`. Two hypotheses:

1. **`srebrenica_demilitarized` never set** (most likely). Historically set by the UNSCR 819 / UNPROFOR demilitarization agreement ~April 1993. If the sim's demilitarization event doesn't fire, pressure never starts accumulating.
2. **Decay balance** — net ~0.5/turn accumulation with `rrf_deployed=true` bonus of −0.5. Requires continuous condition for ~16 turns. If conditions fluctuate, pressure decays back.

Hypothesis 1 is cheaper to verify: check whether `srebrenica_demilitarized` ever appears in `event_flags` during a 188w run.

**Impact:**
- Chain 3 fires in the baseline instead of staying inert. Chain 3's canon-gate fix (PR #7 removed the RBiH +5 international_standing reward) still holds, but the chain shouldn't be firing at all on the historical path.
- Endgame chain (Deliberate Force → ground offensive → Dayton) may not fire via its historical catalyst. The 188w run's `alternative_nato_trigger_1995` (`csq_alternative_nato_trigger_1995`) did fire, so the counterfactual catalyst path works — but that's not the historical-baseline intent.
- Calibration will score the post-Srebrenica period against a sim that never experienced the rupture.

**Priority: P1.** Largest historical-authenticity gap still in the sim. Companion to #37 (both are content-chain gates failing because upstream sim mechanics don't produce the triggering state).

**Related:** Issue #10. `data/scenarios/events/war_1995.json:296` (`srebrenica_falls_1995`), `data/scenarios/events/war_1992.json:957` (sets `srebrenica_enclave_formed`).

---

### 39. Combat tempo collapse in long runs — 0.41 battles/week across 188 weeks (2026-04-23, 188w validation) — OPEN P1

**What we found:** Critical anomaly in the 188w validation: "Average battle tempo 0.41/week across 188 turns (minimum 1.0). Total battles: 78." Compounding warnings:

- `hvo_tomislavgrad` (HRHB): 18 front edges, 3 brigades, **0 battles after 188 turns**. Dead front.
- `vrs_2nd_krajina` (RS): 34 front edges, 7 brigades, **0 battles after 188 turns**. Dead front.
- 5 operations (3 ARBiH, 2 VRS) completed with 0 total attacks because "brigades never reached staging during any execution turn."
- Morale collapse clusters in corps that aren't fighting: `hrhb_111th_brigade` at morale=0, `hvo_vitezovi_brigade_vitez` at morale=0, `hvo_nikola_subic_zrinski_brigade` at morale=0. Brigades attriting without combat.
- Intelligence loop dead: "0/145 sector intel records have offensive_signs=true after 188 turns. No faction detects enemy staging."

**Historical context:** The Bosnian War produced thousands of engagements over its 44 months. Operation Corridor 92 alone involved hundreds of battles across VRS 1st Krajina, VRS East Bosnian, and VRS 2nd Krajina sectors. ARBiH launched ~50 named offensive operations between 1993-95. HVO against ARBiH in central Bosnia 1993-94 was near-continuous. **78 battles across 188 weeks is roughly 1/4 of historical operational tempo.**

**Likely root causes (investigation needed):**

1. **Staging unreachability** — brigades assigned to operations can't reach staging OSIDs. Operations complete as "failure" with 0 attacks rather than rewiring or generating alternative targets.
2. **Sector-to-operation decoupling** — corps has sectors (so frontier exists) but commander AI doesn't generate operations for those sectors. Dead-front pattern.
3. **Operation validation rejecting too aggressively** — op reconciliation silently drops ops where brigade participation becomes ambiguous.
4. **Cascade with #37** — HVO's missing offensive wiring (no central-Bosnia ops) contributes to ~40-80 missing HVO attack orders that should appear w52-w150.

Also likely cascades with #38 (Srebrenica never falls → VRS Drina Corps never redeploys → different post-Srebrenica pattern throughout).

**Impact:** Calibration against jan1993/jul1995/oct1995 references will be systematically skewed toward low-combat outcomes. Morale collapse in non-combat corps is artificial; supports interpretation that attrition mechanics are firing on formations that shouldn't be losing morale without engagement.

**Priority: P1.** Deserves dedicated investigation with `operations-expert` + `corps-army-commander` expert consults before touching code.

**Related:** Issue #11 (this issue), #9 (HVO wiring — companion cause), #10 (Srebrenica — companion cause).

---

## Historical "Not Real War" Patterns (from previous sessions)

### H1. Rear pocket cleanup was instant (fixed n384)

Before `paramilitary_sweep.ts`, enemy-held OSIDs deep in friendly rear (surrounded on all sides) would persist indefinitely. In the real war, irregular forces or local militia would quickly secure rear areas. Fixed with autonomous paramilitary detection and sweep.

### H2. Cold front phantom attrition (fixed n345)

RS-HRHB cold fronts under Graz Accords were generating phantom attrition — HRHB taking 6,300 KIA from "battles" on fronts where no real fighting occurred. In the real war, RS and HRHB had a de facto ceasefire. Fixed with `isColdFront()` exemptions.

### H3. Home defense trapping brigades at spawn (partially fixed n473)

`home_defense_active` was designed to keep brigades defending their home municipality. But it trapped EVERY brigade at its spawn location, preventing redeployment even when no enemy was nearby. In the real war, brigades routinely deployed away from home — 1st Krajina Corps brigades fought across northwest Bosnia, not each in their own village.

### H4. VRS operations not using armor offensively (partially fixed n473)

VRS 1st Armored Brigade and 16th Krajina Motorized were sitting in deep rear Prijedor instead of spearheading offensives. Deep-rear fix (n473) resolved the geographic trapping, but armor still isn't being concentrated for offensive operations the way it was historically.

**Historical context:** The 16th Krajina Motorized Brigade was one of the main strike forces in Operation Corridor — it "systematically liberated villages from Doboj to Modrica," captured 13 villages (122 km²), and broke through to the Sava River. VRS deployed 163 combat vehicles including T-34s, T-55s, and M-84 tanks. The 1st Armored Brigade supported 1st Krajina Corps operations continuously. VRS doctrine (inherited from JNA) was combined-arms with armor-infantry coordination. In 1992, with ARBiH having essentially zero anti-armor capability, VRS tanks operated with near-impunity as frontline spearheads.

**Status:** Deep-rear trapping fixed. Remaining issue: sector assignment doesn't prioritize armor for offensive operations. Armor should be concentrated at offensive sectors, not distributed evenly.

### H5. Attacker:defender casualty ratio inverted for 1992 (open)

The sim produces a 3.12:1 attacker:defender casualty ratio (consistent with 83% catastrophic failures). Historically, the VRS firepower asymmetry in 1992 meant the traditional defender's advantage was negated. Operation Corridor 92 data: VRS (attacker) 413 KIA vs HVO (defender) 918 KIA — roughly 1:2 ratio *favoring* the attacker. Across the Sarajevo siege, the VRS (besieger) suffered far fewer casualties than ARBiH + civilians despite being the "attacker." A realistic ratio for VRS attacks against ARBiH in 1992 would be 1:1 to 1:2, reversing the normal pattern. The arms embargo made the ARBiH unable to exploit the defender's typical advantage.

### H6. ARBiH too purely defensive — needs local counteroffensive capability — PARTIALLY FIXED n560

The sim previously set all 5 ARBiH corps to `general_defensive` / `defensive` doctrine through week 56. Historically, ARBiH was predominantly defensive but with significant local counteroffensive activity:
- **5th Corps (Bihac)**: Under Gen. Dudakovic, the most offensively-minded ARBiH commander. Conducted offensives throughout 1992.
- **2nd Corps (Tuzla)**: Launched operations in Majevica hills and toward Brcko.
- **Srebrenica**: Naser Oric's forces conducted aggressive raids, temporarily seizing Bratunac.
- **1st Corps (Sarajevo)**: Counterattacked at Otes (Nov-Dec 1992), periodically attacked toward airport and Igman.

**Fix (n560):** Changed RBiH doctrine in timeline (`data/scenarios/timelines/apr1992.json`) and fallback (`bot_strategy.ts`):
- Weeks 0-15: `defensive` (no change — ARBiH organising)
- Weeks 15-40: `defensive` → **`balanced`**, `max_attack_share_override` 0.15→**0.20**, `aggression_modifier` -0.05→**0.0**
- Weeks 40-56: `defensive` → **`balanced`** (same parameters)

**Result (n560):** RBiH now launches 24 attacks (was 0) starting at week 17. Outcomes: 37.5% success (9/24), 33% catastrophic (8/24) — historically plausible for desperate local counterattacks. Total KIA +1,234 (23.5k→24.8k). RS success rate unaffected (91.7%).

**Root cause of previous zero attacks:** `defensive` stance hard-gates sector offensive launches (line 1001 of `bot_corps_directives.ts`: `stance === 'offensive' || stance === 'balanced'`). Defensive corps = zero operations = zero attacks, period. The timeline JSON (`apr1992.json`) overrides the hardcoded `FACTION_DOCTRINE_PHASES` — previous code-only changes to `bot_strategy.ts` had no effect.

**Remaining:** 5th Corps should potentially have higher aggression. HRHB still 0 attacks (Graz Accords block all RS targets; no RBiH conflict in 1992).

---

### ~~11. Sarajevo falls — siege mechanics non-functional (n524→n527)~~ — **FIXED**

**What we found:** All 8 central Sarajevo OSIDs under RS control at w40. Sarajevo NEVER FELL in the entire war.

**Root causes (5 distinct problems, all fixed):**
1. **Supply state misclassification**: Enclave resilience system reads Sarajevo supply as "adequate" → resilience decays instead of building. Fix: `ALWAYS_BESIEGED_ENCLAVES` set forces Sarajevo to always read as "strained" minimum. Resilience now builds from day one (isolation_turns=40, resilience=44.6 at w40).
2. **Enclave defense scaling too weak**: 0.005 per resilience point → max 1.15× bonus (negligible). Fix: increased to 0.02 per point → 1.40× at resilience 20, 1.90× at max 45.
3. **No urban tank penalty**: `getHeavyWeaponsOffensiveMult` penalized tanks by physical terrain (slope/rivers) but NOT urban terrain. Sarajevo is flat → tanks at 100% effectiveness. Historically, tanks in cities are death traps (Grozny, Mogadishu). Fix: `URBAN_TANK_TERRAIN_FLOOR=1.7` treats urban terrain as mountain-equivalent for tank effectiveness (70% penalty). `isUrbanOsid()` + `targetOsid` parameter added to the heavy weapons chain.
4. **Urban defense too low**: 1.5× when military doctrine says urban needs 3:1 attacker advantage. Fix: increased to 2.0×.
5. **No enclave garrison power**: The OOB seeds 4 RBiH brigades (2,000 total personnel) against 4 RS brigades (5,100 + 160 tanks + 120 artillery). No multiplier can bridge a 5:1 personnel ratio + massive equipment gap. Fix: new `getEnclaveGarrisonPower()` system representing organized civilian defense (TDF, Patriotic League, police, volunteers). Formula: `population × 0.05 × 0.15 × resilienceMult`. Added to ALL defense paths (sector, direct, ghost militia) in both resolver and predictor.

**After fix (n527):**
| Metric | n524 (before) | n527 (after) | Target |
|---|---|---|---|
| Sarajevo | RS 9 / RBiH 0 | **RS 5 / RBiH 4** | RBiH holds core |
| Sarajevo region match | 67.7% | **80.6%** | — |
| Drina region match | 67.5% | **78.0%** | — |
| Goražde | RS 16 / RBiH 4 | **RS 9 / RBiH 11** | RBiH holds |
| Overall area-weighted | 87.7% | 87.1% | >85% |
| Sarajevo enclave resilience | 0.0 | **44.6** (hardening active) | >30 |

**Key lesson:** Personnel ratio trumps multipliers. When attackers outnumber defenders 5:1 in raw personnel PLUS have massive equipment advantage, no defense multiplier fixes it without being absurd. The fix required adding RAW VOLUME (garrison power from organized civilian defense), not just boosting multipliers. Enclave defense is multi-layered: supply detection + resilience scaling + equipment penalties + urban terrain + garrison volume all needed simultaneously.

---

### 12. Bot AI launches suicide attacks — formations at 300 men attacking repeatedly (n524) — PARTIALLY ADDRESSED n560

**What we found:** RBiH attacks at Zvornik 4 times (w27-31), loses catastrophically each time: 540, 425, 852, 410 casualties. The attacking brigades (1st Kamenica, 246th Vitezka) end at 300 personnel, 33 cohesion, 16 morale. **A real commander would never send 300 men at a fortified position after losing 2,200 men in previous attempts at the same target.**

**Historical context:** Even the most aggressive BiH War commanders (Oric at Srebrenica, Dudaković at Bihać) cancelled attacks when losses became unsustainable. Units below ~500 personnel are combat-ineffective and need to be withdrawn for reconstitution, not thrown into another assault.

**Root cause:** The bot AI follows corps operation orders regardless of formation condition. There is no "refuse attack when combat-ineffective" check. The probe threshold checks predicted outcome but not whether the formation is capable of sustaining any fight at all.

**Partial mitigation (n556→n560):** Brigade dissolution absolute floor (`DISSOLUTION_ABSOLUTE_FLOOR=150`) was bypassing the 2-of-3 criteria check — brigades below 150 personnel auto-dissolved regardless of morale or cohesion. 12 brigades with high morale (37-93) and cohesion (56+) were being auto-dissolved despite still being willing to fight. Fixed: absolute floor now counts as the "low personnel" criterion, still requiring 2-of-3 criteria (3-of-3 for enclave). Destroyed brigades: 12→1. Remnant brigades with high morale/cohesion survive at company strength (historically accurate — BiH brigades persisted as remnants and were later reconstituted).

**Status:** Dissolution fix shipped. Remaining: formation condition check before attack execution still needed for units that survive dissolution but are too weak to attack effectively.

---

### ~~16. Zero equipment on every brigade at w40~~ — FALSE ALARM (n587)

**What we thought:** Every brigade has `equipment: {}`. VRS firepower missing.

**What actually happened:** Equipment is stored in `composition` field (not `equipment`). RS has **535 tanks**, **1,158 artillery**. RBiH has 106 tanks, 329 artillery. HRHB has 33 tanks, 115 artillery. The insanity check script was reading the wrong field. Equipment is fully populated with condition tracking (operational/degraded/non_operational).

**Lesson:** FormationState uses `composition` for equipment counts, `equipment_state` for aggregated heavy equipment tracking. There is no `equipment` field.

**Update (2026-03-14):** The n292 audit item "0 equipment lost in 168 battles" is also closed. Per-battle equipment attrition was added to `attack_resolution_osid.ts` after n292. Current w40 losses: RS 132 tanks / 152 arty (22% / 12%), RBiH 45 / 77 (23% / 15%), HRHB 6 / 14 (15% / 11%). Mechanism confirmed working.

**Open follow-up:** Recruited brigades initialize with full `DEFAULT_COMPOSITION` (RS: 40 tanks). This means wartime recruitment inflates the heavy-weapon pool — recruits shouldn't spawn with factory-fresh tanks. Low priority but worth flagging for OOB/recruitment design review.

---

### 17. Morale-0 zombie brigades survive dissolution — criteria gap (n587)

**What we found:** 4 brigades active at morale 0-5 with 476-1,030 personnel and cohesion 33-38:
- `hvo_posusje_brigade`: 1,030 pers, morale=**0**, cohesion=38
- `rs_2nd_ozren_light_infantry`: 579 pers, morale=**0**, cohesion=35
- `rs_1st_novigrad_infantry`: 476 pers, morale=**5**, cohesion=33
- `rs_4th_ozren_light_infantry`: 786 pers, morale=**5**, cohesion=37

A brigade at morale 0 is not a military unit. Soldiers are walking home, officers hiding, command authority collapsed. The dissolution criteria (2-of-3: personnel<400, cohesion<=20, morale<=15) don't catch these because personnel is above 400 and cohesion above 20. Only 1-of-3 criteria met.

**Historical context:** In the Bosnian War, units that lost morale collapsed rapidly — mass desertions at Kupres (HVO), the Derventa corridor collapse (HVO), various ARBiH units in eastern Bosnia. Zero morale = unit ceases to exist as a fighting force regardless of headcount.

**Root cause:** The 2-of-3 design assumes all three criteria are roughly correlated. In practice, morale can collapse while personnel and cohesion remain. Need either: (a) morale<=5 as absolute dissolution trigger, or (b) severe consequence for zero morale (mass desertion draining personnel rapidly until dissolution criteria are met organically).

**Fix (n588):** Extended desertion mechanic in `morale_drift.ts`. Morale 0: 5%/turn personnel loss (immediate, no 3-turn delay). Morale 1-14: 2%/turn (new range). Organic cascade: morale drops → desertion → personnel falls below 400 → 2-of-3 dissolution criteria met → dissolves. n588 confirms: posusje 1,030→805, 2nd ozren 579→429, 4th ozren 786→709. Units actively draining, will dissolve within ~10 turns.

**Status:** FIXED n588 — organic desertion mechanic. Monitoring for full dissolution in longer runs.

---

### 18. Catastrophic attacks with 43-50:1 casualty ratios (n587→n590 FIXED)

**What we found:** The 5 most lopsided battles show 43:1 to 50:1 attacker:defender casualty ratios:
- w23: HRHB → RS at Vranjevici (Mostar): 649 dead vs 13 dead (50:1)
- w36: RBiH → RS at Radava (Sarajevo): 528 dead vs 11 dead (48:1)
- w32: RBiH → RS at Ripac (Bihac): 514 dead vs 11 dead (47:1)

These aren't battles — they're massacres. The defender suffers ~11-17 casualties regardless of the fight's scale. In real war, even catastrophic attacks kill *some* defenders. Gallipoli had roughly 3:1 attacker:defender. Verdun was ~1:1 despite massive German advantages. 50:1 requires the defender to be essentially invulnerable.

**Root causes (two bugs):**

1. **Outcome modifier too low (n589):** `OUTCOME_DEFENDER_MOD['catastrophic'] = 0.3` — catastrophic defenders took only 30% of base casualties. Combined with power-ratio floor 0.6: `0.3 × 0.6 = 0.18×` (18% of base). Fixed: raised to 0.7.

2. **Casualty base used one brigade, not sector (n590):** `personnelDefender` was the PRIMARY defender's personnel only (one brigade, ~500 men), but the defense POWER that determined the outcome came from the ENTIRE SECTOR (5+ brigades, 4,000+ men). Attacker casualty base correctly summed all attackers, but defender casualty base only counted one formation. This structural disconnect meant the sector generated enough defense power to cause catastrophic outcomes but only produced casualties from 500 men. Fixed: `personnelDefender` now uses total sector brigade personnel when sector defense is active.

**After fix (n590):**

| Metric | n587 (before) | n590 (after) |
|---|---|---|
| Overall att:def ratio | heavily skewed | **0.88:1** |
| Worst outlier | 50:1 | **22.7:1** |
| Avg catastrophic ratio | ~40:1 | **8.5:1** |
| 50+:1 battles | several | **0** |
| Def casualties | ~19k | **40,058** |
| Benchmarks | 6/6 | **6/6** |
| Area-weighted | 85.8% | **86.3%** |

The remaining 22:1 outliers are concentrated at Lukavica (Novo Sarajevo) — the most fortified RS position in the Sarajevo siege. RBiH attacking head-on into that position SHOULD be lopsided. A real ARBiH commander would never make that attack without reconnaissance — which is the probe ops issue (#21).

**Status:** FIXED (n590). Two structural bugs corrected. Remaining outliers (22:1 at fortified positions) are within historical range for truly hopeless attacks.

---

### 21. No reconnaissance or probe operations — corps attack blind (n587→n617 FIXED)

**What we found:** All 220 orders in the run are full attack operations. No probing attacks, no reconnaissance-in-force, no intelligence-gathering operations. Corps launch sector offensives into unknown defensive strength.

**Historical context:** Intelligence gathering was critical in the Bosnian War. Before any major operation, both VRS and ARBiH conducted:
- **Reconnaissance patrols**: Small-unit probes to test defensive positions, identify strong points, and map minefields.
- **Reconnaissance in force**: Company-strength probes designed to draw fire and reveal defensive dispositions. Operation Corridor was preceded by extensive recon along the Posavina corridor.
- **Artillery probing**: "Registering" fires to test positions without committing infantry.
- **Intelligence preparation**: Corps intelligence officers compiled order-of-battle estimates. The VRS inherited JNA intelligence infrastructure; ARBiH built theirs through painful experience.
- **Feints and diversions**: Corridor 92 included diversionary attacks at Gradačac and Brčko to fix ARBiH reserves.

No commander — not Mladić, not Halilović, not Petković — would commit a multi-brigade operation without reconnaissance. Attacking blind into unknown defenses is how you get massacred (and may explain the 50:1 catastrophic ratios — forces walking into positions they didn't know existed).

**Design impact:** The sector intel system (`sector_intel.ts`) exists and tracks per-sector confidence, but the bot AI doesn't use it to decide whether to probe before committing. Corps should: (1) probe sectors with low intel confidence before full attack, (2) use probe results to decide whether to commit, (3) abort if probes reveal overwhelming defense.

**Fix (n617):** Intel-gated operation launch. `shouldLaunchProbeInstead()` in `bot_corps_directives.ts` checks sector intel confidence against per-faction thresholds (RS 0.25, RBiH 0.40, HRHB 0.30) before launching operations. Below threshold: probe operation (max 2 brigades, 1-turn planning, 'repulsed' min outcome). RS blitz phase (w0-12) exempt. `MAX_CONSECUTIVE_PROBES_BEFORE_COMMIT=2` prevents infinite loops. Probes generate recon-by-force intel (confidence→1.0 after engagement), naturally clearing the gate for subsequent full attacks.

**After fix (n617):** RBiH orders increased 60% (20→32) — probes generating more activity. RS w40 improved 0.505→0.517. 6/6 benchmarks, 86.3% area-weighted. No calibration regression.

**Lesson:** The intel system existed but wasn't wired into the launch decision. Adding a single gate function at the operation launch point (10 LOC) with proper faction differentiation and exemptions closed the realism gap without disrupting calibration.

---

### ~~19. Static 2-ops pattern~~ — FALSE ALARM (n587)

**What we thought:** Exactly 2 active operations every week for 40 weeks.

**What actually happened:** The `.ops` field in `weekly_report.jsonl` is a config flag `{enabled: true, level: 0}` — NOT operation count. Actual operation count from `operation_diagnostics`: w1=6 (all VRS corps), w10=7 (+1 HVO), w20=11 (+4 ARBiH), w30=12 (all corps active). Operations are healthy — VRS dominates early, ARBiH and HVO join from w10-16, all corps eventually operate.

**Lesson:** `weekly_report.ops` = baseline_ops config. `weekly_report.operation_diagnostics` = actual operations.

---

### 20. 30 RBiH brigades at uniform 3,000 personnel cap (n587)

**What we found:** 30 ARBiH brigades are at exactly 3,000 personnel — a hard cap. All capped brigades are RBiH. No RS or HRHB brigades hit the cap. Historical ARBiH brigades varied wildly: 500-man "brigades" in Srebrenica, 5,000+ in Tuzla and Zenica.

**Root cause:** `MAX_BRIGADE_PERSONNEL=3000` in formation_constants.ts. The reinforcement system fills brigades to this cap. Because ARBiH has the largest pool (120k), more brigades hit the ceiling.

**Historical context:** ARBiH brigades were highly uneven. 17th Vitezka Mountain (Krajina) was one of the best-equipped with 3,500+. Mountain brigades in eastern enclaves were 500-800 men. The uniformity feels gamey — a Halilović would recognize a 500-man enclave "brigade" and a 4,000-man Tuzla brigade as fundamentally different formations.

**Status:** P3 — cosmetic. The cap prevents runaway reinforcement. A more organic approach would tie max personnel to formation type and available pool, but this doesn't affect combat dynamics much.

---

### 31. VRS East Bosnian Corps — zero-attack operations post-Koridor (n5→n8, partially fixed)

**What we found (n5):** After a competent early-war showing (Operation Koridor, w0-w12, 5/7 objectives, 3.8:1 exchange), the East Bosnian Corps launched three consecutive zero-attack operations over 18 weeks.

**Partial fix applied (n8, hash b32ff42ca4e722a4):** Two changes:
1. `anyMoved` detection in `updateMultiAxisResults` now checks `brigade_movement_state.status === 'in_transit' || 'packing'` instead of the cleared `brigade_movement_orders` (which is always null by the time the step runs)
2. Idle stall threshold raised from 2→4 turns, with `attack_attempt_count === 0` guard added

**n8 result — before vs after:**

| Operation | n5/n6 | n8 | Change |
|-----------|-------|----|--------|
| Koridor | w0-w12, 5/7, 3.8:1 | w0-w12, 5/7, 3.8:1 | unchanged |
| Hrast | w12-w18, 0/4, — | w12-w20, 0/4, — | +2w, still 0 attacks |
| Grab/Brana | w18-w24, 0/4, — | w20-w28, 0/4, — | renamed, still 0 attacks |
| Pauk (removed) | w24-w30, 0/4, — | — | third op eliminated |
| Vaganj | Redut w30-w34 1/1 | Vaganj w28-w32, 1/1, 1.0:1 | SUCCESS (earlier) |
| Lukavac | — | w36-w40, 1/1, 2.8:1 | additional SUCCESS |

Dead zone: 18 weeks (3 ops) → 16 weeks (2 ops). Corps now recovers and achieves two successes late-war.

**Confirmed root causes:**
1. `rs_3rd_posavina` (front-line brigade) depleted below 400 personnel threshold after 7 blitz attacks → combat-ineffective gate blocks attacks. Correct behavior.
2. ARBiH retook `op:brcko:palanka` mid-run, breaking the BFS path from rear EBC brigades (at Brčko area) to Gradačac approach OSIDs. `findNearestFriendlyOsidInSet` returns null → no march issued → stall fires.

**Plausibility verdict:** The 16-week dead zone is at the border of plausibility. The structural causes are real war reasons (depleted unit + corridor breach). Historically, summer 1992 did see operational pauses after the corridor fight, and a genuinely combat-ineffective front-line brigade with a broken LOC would constrain any corps. The eventual EBC recovery (Vaganj + Lukavac) is correct behavior.

**Remaining gap:** A real Drina Corps commander would find alternative routes around the broken corridor or restore it — not plan two full operations, commit brigades, and make zero contact for 16 weeks. The BFS path dependency has no corridor-restoration mechanic. This is a structural limitation (P2 backlog).

**Status:** PARTIALLY FIXED. Two ops → one reduced from three, operations longer but structurally blocked by correct engine behaviors. Remaining dead zone is structural (BFS corridor dependency). Move to P2 backlog.

**Files:** `src/sim/combat/sector_offensive.ts` (lines ~821, ~991 `anyMoved`; lines ~868, ~1040 idle stall threshold).

---

---

## Priority Ranking

**Post-Phase3/2KK-fix state (hash 226a084adc1a7bf2):** 89.2% area-weighted, 6/6 benchmarks. 2KK brigades unstranded from Livno corner; Udar/Klin now have real combat. EBC dead zone structural (P2 backlog).

| Priority | Issue | Impact | Status |
|----------|-------|--------|--------|
| **P2** | #31 East Bosnian Corps — structural BFS corridor dependency | 16w dead zone; real causes (depleted bde + corridor breach) | **PARTIALLY FIXED n8** |
| ~~**P1**~~ | ~~2KK Livno corner stacking~~ | ~~5 brigades frozen at gubin_2, Bugojno/Kupres front undefended~~ | **FIXED Phase 3 n9** |
| **P1** | #24 RS 89.1% success rate | Too high for 1992 (historical 60-75%). 62.4% decisive victories | Monitoring |
| ~~**P1**~~ | ~~#29 Operations past viability~~ | ~~ARBiH suicide attacks 7-21:1~~ | **FIXED (hash 01859ec4dea095cf)** |
| ~~**P1**~~ | ~~#23 Sector casualty cascade (0.1:1)~~ | ~~Single-brigade sectors uncapped~~ | **FIXED n701 Phase 1** |
| **P1** | #15 Density imbalance | Partially fixed n701 Phase 2; SRK thin sectors improved | **PARTIAL** |
| **P2** | #28 SRK siege abandonment | Graz fixed n697; threat_ratio formula fixed n701 Phase 4; Step 7→8 cycle (0-defense) still open | **PARTIAL** |
| ~~**P2**~~ | ~~#30 VRS early-war exchange (Corridor 3.8:1, Prsten 4.3:1)~~ | ~~Zombie ops inflated aggregate~~ | **FIXED n703 (organic)** |
| **P2** | #25 Podrinje Sweep 23 weeks | Root cause #3 (zombie single-bde ops) fixed n703; root causes #1/#2 (planning duration, Srebrenica Ring axis) open | **PARTIAL (n703)** |
**Post-n25 state:** 90.5% area-weighted, 13/13 anchors. Hash `6fd84077b3a383e2`. 139 battles (RS 112, RBiH 21, HRHB 6). RS win rate 88.4% (target 60-75%). Att:def ratio 0.79:1 (defenders take 25% more casualties than attackers). 73.4% decisive victories. brka_2 FIXED. Goražde enclave redistribution guard FIXED. SRK 0-assigned FIXED. Idle equalization Step 7c added.

| Priority | Issue | Impact | Status |
|----------|-------|--------|--------|
| **P1** | #24 RS 88.4% success rate | Too high for 1992 (historical 60-75%). 73.4% decisive victories | **Open n25** |
| ~~**P1**~~ | ~~Att:def ratio 0.79:1~~ | ~~0.79:1 IS historically correct per H5 — Op Corridor 0.45:1. n26-n29 fix attempts regressed DRINA -7pp. Range 0.5-1.0:1 is the H5 target; 0.79 is within it.~~ | **CLOSED BY AUDIT n30** |
| **P1** | #23 Sector casualty cascade (0.1:1) | n590 overcorrection — 1,671 def casualties from 109 att attack | **Open n647** |
| ~~**P0**~~ | ~~#16 Zero equipment~~ | ~~False alarm~~ | **FALSE ALARM** |
| ~~**P0**~~ | ~~#2 Attack outcomes inverted~~ | ~~Root cause~~ | **FIXED n482** |
| ~~**P0**~~ | ~~#11 Sarajevo falls~~ | ~~5 root causes~~ | **FIXED n527** |
| ~~**P0**~~ | ~~#13 Sectors span enemy territory~~ | ~~Triple-junction fix~~ | **FIXED n532** |
| ~~**P1**~~ | ~~#17 Morale-0 zombie brigades~~ | ~~Dissolution criteria gap~~ | **FIXED n588** |
| ~~**P1**~~ | ~~#18 50:1 catastrophic casualty ratios~~ | ~~Defender near-invulnerable~~ | **FIXED n590** |
| ~~**P1**~~ | ~~#21 No probe/recon operations~~ | ~~Corps attack blind~~ | **FIXED n617** |
| ~~**P1**~~ | ~~H6 ARBiH too passive~~ | ~~24→41 attacks~~ | **Partially fixed n560/n587** |
| ~~**P1**~~ | ~~#5/#10 Morale system~~ | ~~No victory boost + no zero-morale consequence~~ | **ADDRESSED n588/n618** |
| ~~**P1**~~ | ~~#12 Suicide attacks~~ | ~~Dissolution absolute floor bypass~~ | **Partially fixed n556** |
| **P2** | #14 HVO ghost front (13 edges, 0 brigades) | 10k HVO unassigned — enclave BFS failure | Planned |
| **P2** | #6/#8 Front coverage + stacking | Mitigated by reactive sector defense | Monitoring |
| **P2** | H4 VRS armor not concentrated | Mech/moto staging exists; equipment IS present | Open |
| **P2** | Brčko/Gradačac anchor persist | RS overperforms Posavina, underperforms Drina | Persistent |
| **P2** | 0 dissolved formations at w40 | Dissolution criteria may be too protective | Open |
| ~~**P2**~~ | ~~#19 Static 2-ops pattern~~ | ~~False alarm~~ | **FALSE ALARM** |
| **P3** | #7 HVO passivity (30 orders n618) | Mostly structural | **MOSTLY STRUCTURAL** |
| **P3** | #20 30 RBiH at 3,000 cap | Cookie-cutter uniformity | Open |
| **P1** | #15 Density imbalance (16x ratios) | 1KK 4 brigades idle in Banja Luka, SRK sector with 519 men | Investigation needed |
| ~~**P2**~~ | ~~#29 Zombie operations (Gracanica 8 turns, Žepa, Bihać)~~ | ~~reserve_brigade_ids not checked in sector defense~~ | **FIXED n32** |
| **P2** | #30 ARBiH Foča expansion | Goražde sector:8 spans Foča territory; enclave redistribution guard partial fix | **PARTIAL n25** |
| **P2** | #25 Podrinje Sweep 23 weeks | Ring axis typo fixed; painted target corrected; follow-on planning deferred | **PARTIAL n37** |
| **P2** | #31 Teočak pocket captured by VRS | Bot priority: vrs_east_bosnian secondary op overwhelms 255th Slavna | **OPEN — engine fix needed** |
| **P3** | #7 HVO passivity (30 orders n618) | Mostly structural | **MOSTLY STRUCTURAL** |
| ~~**P1**~~ | ~~#5/#10 Morale system~~ | ~~No victory boost + no zero-morale consequence~~ | **ADDRESSED n588/n618** |
| **P1** | Casualty volume — monitor | Defender casualties may be inflated by #23 | Monitoring |
| ~~**P1**~~ | ~~#12 Suicide attacks~~ | ~~Dissolution absolute floor bypass~~ | **Partially fixed n556** |
| ~~**P1**~~ | ~~H6 ARBiH too passive~~ | ~~24→41 attacks~~ | **Partially fixed n560/n587** |
| ~~**P2**~~ | ~~#19 Static 2-ops pattern~~ | ~~False alarm~~ | **FALSE ALARM** |
| ~~**P2**~~ | ~~#14 HVO ghost front (0 sectors)~~ | ~~Correct until HVO-RBiH war (April 1993). No fix needed~~ | **BY DESIGN** |
| **P2** | #6/#8 Front coverage + stacking | Mitigated by reactive sector defense | Monitoring |
| **P2** | H4 VRS armor not concentrated | Mech/moto staging exists; equipment IS present | Open |
| **P2** | Brčko/Gradačac anchor | brka_2 previously papered over with avoided_osids (reverted — that mechanism is banned) | **OPEN — engine fix needed** |
| **P2** | 0 dissolved formations at w40 | Dissolution criteria may be too protective | **NEW n647** |
| ~~**P1**~~ | ~~#28 SRK 0-assigned cycle~~ | ~~reclassifyRearBrigades zero-guard scoped to vrs_sarajevo_romanija~~ | **FIXED n703+** |
| **P3** | #20 30 RBiH at 3,000 cap | Cookie-cutter uniformity | **NEW n587** |
| **P3** | #3 Formation casualty_ledger | Design gap, data exists in state-level ledger | Open |
| **P3** | #32 ARBiH 5th Corps Bihać — Ripac cycling | 9× attacks at PR=0.14; historically motivated but mechanically gamey | Open |
| ~~**P3**~~ | ~~#33 ARBiH 1st Corps — Foča offensive target~~ | ~~Sarajevo garrison reconquers northern Foča OSIDs~~ | **FIXED n57** |

---

### #37 — ~~Elite loan: no cohesion-based recall~~ — FIXED (n748)

**What we found:** 1st Guards Motorized at cohesion 9.0 after 40 turns on loan. Recall system checked casualties and morale but not cohesion. Mladić would never leave his elite strike force as a mob.

**Fix (n748):** Added `ELITE_COHESION_RECALL=25` in `elite_loan_types.ts`. `tickEliteLoans` force-recalls with reason `cohesion_collapse` when cohesion drops below threshold. New `EliteRecallReason` variant added.

**Result:** 1st Guards recalled at w40 via `cohesion_collapse`. 10 battles tracked, 2307 casualties, 4 OSIDs captured in episode. No calibration regression (90.6% maintained).

---

### #38 — ~~Elite loan tracker not updated during battle resolution~~ — FIXED (n748)

**What we found:** `EliteLoanEpisode.battles_fought` and `casualties_taken` always 0 despite combat.

**Fix (n748):** `recordBrigadeEngagement()` in `brigade_history_recorder.ts` now syncs elite episode fields in real-time when the formation is on loan. `GameState` threaded through recorder → `recordAttackerEngagements` → `recordDefenderEngagement`. On recall, `recallEliteLoan` syncs tracker totals (`total_battles`, `total_osids_captured`, `total_casualties_taken`) from the closed episode.

**Result:** All four elites show real battle counts (10, 7, 3, 2 battles respectively). Campaign History panel no longer decorative.

---

### #39 — ~~ARBiH suicide attacks at 0.1-0.2 power ratio~~ — FIXED (n749)

**What we found:** Repeat attacks at the same fortified position at catastrophic odds. Radava (Sarajevo) was attacked 3 consecutive turns (w33, w36, w37) at PR 0.14-0.21, producing 1,725 total casualties. No commander sends men to die at the same wall three turns running.

**Historical context:** Single desperate attacks at bad odds DID happen in the Bosnian War — Dudaković tried breakouts from Bihać, 1st Corps attempted Sarajevo perimeter assaults. Commanders gamble. But they don't repeat the same failed assault at the same position turn after turn. One gamble is war. Three consecutive is a broken bot.

**Fix (n749):** Added `consecutive_catastrophic_on_current` counter on `OperationAxis`. After 2 consecutive catastrophic outcomes on the same objective, the axis stalls (`MAX_CONSECUTIVE_CATASTROPHIC_ON_CURRENT=2`). Counter resets on objective change, capture, or non-catastrophic outcome. Single-attempt gambles at bad odds are preserved — historically correct.

**Result:** Radava repeat attacks eliminated (3→1). Total suicide attacks (PR<0.3) dropped 12→10. RBiH attacker casualties down 886. Remaining PR<0.3 attacks are all single-attempt gambles at different operations — historically defensible. Area match 90.4% (within variance of n748 90.6%). 13/13 anchors, 6/6 benchmarks.

---

### #40 — Operational tempo too low: 3.5 battles/week across 198 brigades (P3, n747)

**What we found:** 141 total battles over 40 weeks = 3.5/week. With 198 active brigades across three factions, that's one engagement per 56 brigade-weeks. The ops-only attack doctrine means only operation participants fight; the other ~180 brigades each turn sit in their sectors defending.

**Historical context:** The first year of the Bosnian War was constant, everywhere, all the time. Every front had daily skirmishes. The Sarajevo siege alone generated dozens of engagements per week. 3.5/week is a cold war, not the Bosnian War.

**Root cause:** By design — `evaluateOffensive` was stripped of independent attacks in n500 (ops-only doctrine). All attacks flow through CorpsOperation. With typical operation cadence (3+ turns planning, 3-5 turns execution, recovery), each corps runs 4-6 operations in 40 weeks. Most brigades never attack.

**Note:** This is a known design trade-off. Ops-only prevents gamey penny-packet probes. But the cure is arguably worse than the disease — 3.5 battles/week is too quiet. This will likely be addressed by the follow-on operation planning system (deferred Fix B) or by adding limited independent tactical actions (counterattacks already exist as a brigade-level exception).

**Priority:** P3 — known design trade-off, not a bug. Monitor.

| ~~**P2**~~ | ~~#37 Elite loan: no cohesion recall~~ | ~~1st Guards at cohesion 9.0 after 40 turns~~ | **FIXED (n748)** |
| ~~**P3**~~ | ~~#38 Elite tracker not updated~~ | ~~battles_fought/casualties_taken always 0~~ | **FIXED (n748)** |
| ~~**P2**~~ | ~~#39 ARBiH suicide attacks (0.1 PR)~~ | ~~Repeat attacks at same fortified position~~ | **FIXED (n749)** |
| **P3** | #40 Operational tempo 3.5/week | Ops-only doctrine → 180 brigades idle every turn | **KNOWN — design trade-off** |
| **P2** | #41 ARBiH attacks HVO territory while allied (Mostar w38-39) | RBiH brigades attack op:mostar:kruzanj_2 (HRHB) at PR 0.24-0.25 before HVO-RBiH war starts (w52+). Alliance guard may not cover all attack paths. | **OPEN — investigate** |
| **P1** | #42 Bot strategic targeting — no demographic/geometric filter | Bot targets any adjacent enemy OSID without assessing strategic value. VRS takes Žepče (7.3% Serb, creates pocket). Salient aversion (Phase C) partially addresses geometry but demographic filter still needed. | **PARTIALLY ADDRESSED (n773 salient aversion)** |
| **P2** | #43 UI shows brigade raw power, not sector defensive power | FormationDetail/sector panel shows `brigadePower()` (~2,602 for 3000 pers motorized) instead of `sector.defensive_power` (72.5). Player sees a "strong" sector when it's actually 115:1 overmatched. Misleading. | **OPEN — UI fix** |
| **P1** | #44 ARBiH 1st Corps doesn't probe weak SRK sectors | SRK sector:0 has 1 brigade / 14 edges / threat 665:1. The 1st Corps should detect this via intel and launch a breakout op. Currently defensive stance through w40 — no probing, no exploitation. Historically 1st Corps attempted breakouts whenever the siege ring thinned. | **OPEN — bot AI** |
| **P2** | #45 Salient retreat — commander doesn't withdraw from indefensible positions | Srebrenik tinja_gornja_2 (1 RS OSID surrounded by 5 RBiH) created during w6 blitz but never abandoned. A real commander would withdraw from positions he can't supply or reinforce. Salient aversion prevents NEW salients but can't undo existing ones. | **OPEN — new concept** |
| ~~**P1**~~ | ~~#46 SRK OOB + mandatory spawn~~ | ~~64/182 mandatory brigades silently failed to spawn~~ | **FIXED (n786)** |
| ~~**P0**~~ | ~~#47 Recalibration after spawn fix~~ | ~~Overstacking fix (n790) + mobilization tuning (n797)~~ | **DONE (n797) — 13/13 anchors, troop balance calibrated** |
| **P2** | #48 Overstacking redistribution — isMovementDestinationRisky was blocking all front redistribution | Brigades stacked 7-9 at one OSID while rest of sector front empty. Root cause: front OSIDs have 3+ enemy neighbors → flagged as "risky." Removed check for sector-internal redistribution. | **FIXED (n790)** |
| **P2** | #49 preserve_survival_corridors benchmark — RBiH w40 share 0.389 vs 0.329±0.05 | Only failing benchmark. RBiH territorial share slightly over threshold. May need benchmark threshold adjustment (was calibrated for 38-brigade ARBiH). | **OPEN — benchmark review** |

---

## Methodology

**How to audit for realism:**
1. Run 40w scenario
2. Examine final save for patterns a real commander would find absurd
3. Check: brigade positions, casualty rates, territorial outcomes, troop strengths, operation tempos
4. Cross-reference against historical record (ARBiH 60-80k→180k, VRS ~80-110k, HVO 25-55k)
5. Document findings here with evidence, root cause, and fix status
