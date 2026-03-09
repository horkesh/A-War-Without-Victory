# Real War Master

> The gap between simulation and reality. Every entry here is something we found where the sim does something that would be inconceivable in real war — especially the Bosnian War (1992-1995), a chaotic, desperate, existential conflict.

## Guiding Principle

In the Bosnian War, every brigade mattered. Commanders fought with what they had, where they were. There was no rear echelon luxury. Formations scrounged weapons, walked to the front, and fought from day one. If the sim produces behavior that a real Bosnian War commander would find absurd, it's a bug — even if the code is technically correct.

---

## Fixed

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

## Open / Under Investigation

### 2. 83% of attacks end in catastrophic defeat (n473)

**What we found:** Of 453 battles in 40 weeks, 378 (83.4%) resulted in "catastrophic" defeat for the attacker. Only 56 decisive victories (12.4%). The sim's outcome distribution is essentially the inverse of reality.

**Historical context:** April-January 1993 was the most offensively successful period of the entire war, primarily for VRS:
- VRS controlled ~60% of BiH territory by mid-May 1992 (6 weeks into the war)
- **Operation Corridor 92** (Jun-Oct): 40-54k troops, captured 760 km², took Modrica, Derventa, Odzak in rapid succession. VRS casualties: 413 KIA, 1,509 WIA — *attacker suffered fewer casualties than defender* (HVO: 918 KIA, 4,254 WIA)
- Jajce, Prijedor, Zvornik, Visegrad, Foca all fell to VRS offensives
- Realistic VRS attack success rate in 1992: **60-75%**, not 17%
- ARBiH had essentially zero anti-armor capability — VRS tanks operated with near-impunity

**Also wrong: casualty volume.** Sim produces ~19,400 total military casualties in 40 weeks. Historical total military casualties in 1992 alone: ~75,000-105,000 (25-30k KIA × 2.5-3 WIA multiplier). Sim is at one-fifth of historical levels.

**Likely root causes:** (1) Multiplicative defense bonus stacking makes nearly all attacks fail; (2) Combat predictor prevents most attacks from being launched; (3) Single-brigade probes dominate instead of multi-brigade concentration; (4) No early-war window where defenders haven't entrenched yet. See also #9 (entrenchment saturation) and #10 (no victory morale boost).

**Evidence:** `weekly_report.jsonl` outcome distribution: catastrophic=378, decisive_victory=56, victory=9, costly_victory=6, stalemate=4.

**Status:** Highest priority. This is the root cause that cascades into most other issues — if VRS can't advance, territory doesn't change, morale doesn't rise from victory, and the war stagnates into 1994-style positional warfare from week 6 onward.

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

### 5. Full-strength brigades at zero morale (n473)

**What we found:** 22 formations at morale=0, 66 at morale < 30. Some with full personnel (2,500+ men). In the real war, a unit at zero morale would be dissolving — desertions, refusals, retreats.

**Root cause (identified):** Morale drift in `morale_drift.ts` applies -2/turn when brigade is in area with <30% own-ethnicity population. Over 40 turns, that's -80 morale from starting 60. Brigades deployed to low-affinity areas (RS units in Bosniak-majority zones, RBiH in Serb-majority) lose morale relentlessly. No positive counterweight for winning/holding ground or victory in battle. There are two problems:
1. **No consequence for zero morale** — formations at morale=0 with full strength keep fighting. They should dissolve, surrender, or at minimum refuse orders.
2. **No morale boost from winning** — VRS was winning in 1992 and morale was high. The sim only drifts morale based on population affinity, encirclement, and exhaustion — not battlefield success.

**Evidence:** VRS morale was high in 1992 (they were advancing), yet sim produces zero-morale VRS brigades.

**Status:** Needs both a victory-based morale boost and consequences for sustained zero morale (desertion, dissolution).

---

### 6. 64-68% of front OSIDs undefended (n473)

**What we found:** Only ~35% of front-line OSIDs have any brigade on them. The rest are empty. While the real Bosnian War had thin front lines, they were continuously manned with at minimum local militia or home defense units. Huge gaps invite breakthroughs.

**Note:** This may be partially by design — 744 OSIDs is a large map and 213 brigades can't cover everything. But the stacking problem (4 brigades on one OSID while 64% are empty) suggests poor distribution rather than genuine shortage.

**Status:** Needs investigation — is sector assignment concentrating brigades too much? Should brigades spread more thinly?

---

### 7. HVO near-total passivity — 11 attacks in 40 weeks (n473)

**What we found:** HRHB conducted only 11 attacks in 40 weeks. This is an order of magnitude too few.

**Historical context:** HVO was one of the most offensively active factions in 1992:
- **Operation Jackal** (Jun 7-26): HVO/HV liberated Mostar (Jun 11-12), captured Stolac (Jun 13), seized 1,800 km² — the first major VRS defeat of the war
- **Posavina** (Mar-May): HVO/HV defended Bosanski Brod, counterattacked to capture Modrica and Derventa
- **Posavina defense** (Jun-Oct): Sustained combat against Operation Corridor (HVO losses: 918 KIA, 4,254 WIA)
- **Kupres-Livno axis**: HVO stopped JNA advance at Suica and Livno (Apr 10-13)
- **Central Bosnia** (Oct+): HVO actively consolidating Lasva Valley, Vitez, Busovaca
- Realistic HVO offensive actions: **40-60** in this period, not 11

**Root causes:**
1. **Graz Accords over-suppression**: The Graz Agreement (May 6, 1992) is implemented as blanket RS-HRHB truce, but historically it was honored mainly in Herzegovina — HVO still fought VRS actively in Posavina, Jajce, and Mostar
2. HRHB deep-rear brigade problem (partially fixed n473)
3. HRHB territory fragmentation prevents brigades reaching active fronts
4. No offensive corps stances for HVO corps

**Status:** The Graz mechanic needs sector-specific exceptions (Posavina, Central Bosnia were active HVO-VRS combat zones). HVO corps stances need offensive capability, especially for Mostar operations.

---

### 8. Brigade stacking — 4 units on one OSID, most front empty (n473)

**What we found:** 6 OSIDs have 4+ brigades stacked on them. 5 OSIDs have 3. Meanwhile 64% of the front is empty. In the real war, commanders distributed forces along the front. Having 4 brigades in Banja Luka rear area while the Posavina corridor is undermanned is militarily absurd.

**Evidence:** `op:banja_luka:rekavice_2` has 4 RS brigades. `op:centar_sarajevo:sarajevo_dio_centar_sajarevo` has 4 RBiH brigades. `op:neum:gornje_hrasno_2` has 4 HRHB brigades.

**Status:** Related to deep-rear fix (#1) and front distribution. The sector system should spread brigades more evenly along the front.

---

### 9. Entrenchment saturation — every defender at max by week 6 (n473)

**What we found:** 195/213 formations have `entrenchment_turns` > 0, with average 11.3 (max 12). Since `MAX_ENTRENCHMENT=6` caps the defensive bonus, this means effectively ALL defenders are at maximum entrenchment after just 6 weeks. This combines with terrain, corps stance, resilience streak, urban, and front density bonuses — all multiplicative. The stacking may explain the 83% catastrophic attack rate (issue #2).

**Evidence:** Individual entrenchment bonus at cap is only 17.1% (`sqrt(6) * 0.07`). But combined with terrain (1.2-1.5×), corps stance (1.1-1.3×), resilience (up to 1.1×), and other multipliers, defenders can easily reach 2× effective power.

**Real war context:** In the Bosnian War, initial positions in April-June 1992 were hasty and poorly fortified. VRS assaults succeeded largely because defenders hadn't dug in yet. By late 1992, entrenched positions became harder to crack — Goražde, Sarajevo. The sim reaches "late 1992 entrenchment" by week 6, making the entire war feel like trench warfare from week 6 onward.

**Status:** Related to issue #2. May need early-war entrenchment ramp-up penalty or reduced stacking.

---

### 10. No morale boost from battlefield victory (n473)

**What we found:** The morale drift system (`morale_drift.ts`) only adjusts morale based on population affinity, encirclement, and exhaustion — never from winning or losing battles. A formation that wins 10 consecutive victories gets zero morale boost. A formation that loses everything gets no additional penalty beyond combat casualties.

**Real war context:** Victory is the primary morale driver in real armies. VRS morale was high in 1992 because they were winning everywhere. ARBiH morale plummeted initially because they were losing, then recovered as they organized and achieved small victories. The sim has no mechanism for this.

**Impact:** Combined with population-affinity drift, this means formations in ethnically-mismatched areas lose morale relentlessly regardless of combat success. A VRS brigade that conquers and holds Bosniak-majority territory will have zero morale despite winning every battle.

**Status:** Needs a victory/defeat morale modifier in combat resolution or morale drift.

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

### H6. ARBiH too purely defensive — needs local counteroffensive capability (open)

The sim sets all 5 ARBiH corps to `general_defensive` through week 56. Historically, ARBiH was predominantly defensive but with significant local counteroffensive activity:
- **5th Corps (Bihac)**: Under Gen. Dudakovic, the most offensively-minded ARBiH commander. Conducted offensives throughout 1992.
- **2nd Corps (Tuzla)**: Launched operations in Majevica hills and toward Brcko.
- **Srebrenica**: Naser Oric's forces conducted aggressive raids, temporarily seizing Bratunac.
- **1st Corps (Sarajevo)**: Counterattacked at Otes (Nov-Dec 1992), periodically attacked toward airport and Igman.

At minimum, 5th Corps should be `balanced` and 2nd Corps should be capable of limited offensive action.

---

## Priority Ranking

**The root cause chain:** Issue #2 (attack outcomes) → #9 (entrenchment saturation) → all other issues cascade. If VRS can't advance, territory doesn't change, morale doesn't rise from victory, casualties stay low, and the war stagnates into 1994-style positional warfare from week 6.

| Priority | Issue | Impact |
|----------|-------|--------|
| **P0** | #2 Attack outcomes inverted | Root cause. VRS should succeed 60-75% of attacks in 1992 |
| **P0** | #9 Entrenchment saturation | Contributes to #2. All defenders at max by week 6 |
| **P1** | #5/#10 Morale system | No victory boost + no zero-morale consequence |
| **P1** | #7 HVO passivity | Graz Accords over-suppression + no offensive stances |
| **P1** | H5 Casualty ratio inverted | VRS firepower advantage not modeled |
| **P2** | #6/#8 Front coverage + stacking | Distribution problem, partially by design |
| **P2** | H4 VRS armor not concentrated | Sector system doesn't prioritize armor |
| **P2** | H6 ARBiH too passive | 5th Corps should be balanced |
| **P3** | #3 Formation casualty_ledger | Design gap, data exists in state-level ledger |

---

## Methodology

**How to audit for realism:**
1. Run 40w scenario
2. Examine final save for patterns a real commander would find absurd
3. Check: brigade positions, casualty rates, territorial outcomes, troop strengths, operation tempos
4. Cross-reference against historical record (ARBiH 60-80k→180k, VRS ~80-110k, HVO 25-55k)
5. Document findings here with evidence, root cause, and fix status
