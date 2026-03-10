# Real War Master

> The gap between simulation and reality. Every entry here is something we found where the sim does something that would be inconceivable in real war — especially the Bosnian War (1992-1995), a chaotic, desperate, existential conflict.

## Guiding Principle

In the Bosnian War, every brigade mattered. Commanders fought with what they had, where they were. There was no rear echelon luxury. Formations scrounged weapons, walked to the front, and fought from day one. If the sim produces behavior that a real Bosnian War commander would find absurd, it's a bug — even if the code is technically correct.

---

## Fixed

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

## Open / Under Investigation

### 14. HVO Central Bosnia — 13-edge ghost front, 7 brigades unassigned (n528)

**What we found:** `sector:hvo_central_bosnia:0` has 13 front edges facing RS — zero brigades, zero defensive power. But 7 HVO central_bosnia brigades (10,385 personnel) exist in Kiseljak, Vitez, Busovača, Žepče — all unassigned. The brigade classification BFS can't reach from enclave pockets to the sector's front edges through friendly territory.

**Historical context:** HVO enclaves in central Bosnia WERE isolated — this part is correct. But the HVO still defended them fiercely. 10,000 troops sitting in unassigned limbo while their front is naked is wrong.

**Status:** P2 — partially historical. Fix planned (enclave-aware brigade assignment).

---

### 15. Intra-corps density imbalance — 16x ratios (n528)

**What we found:** Extreme density imbalances within corps: 2nd Corps 16x (0.06–1.00), 1KK 15.3x (0.13–2.00). VRS 1KK has 6 brigades (15,565 men) on a 3-edge rear sector at Banja Luka while the 20-edge Posavina front has 3 brigades. SRK sector:0 has 25 edges defended by 519 men. `equalizeSectorDensity` and `sector_reassignment_orders` aren't working effectively.

**Historical context:** Mladić would never have 4 fresh infantry brigades idling in Banja Luka while Posavina bleeds. Every VRS unit was committed forward in 1992.

**Status:** P1 — density equalization investigation needed.

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

### 6. 64-68% of front OSIDs undefended (n473) — PARTIALLY ADDRESSED n500

**What we found:** Only ~35% of front-line OSIDs have any brigade on them. The rest are empty. While the real Bosnian War had thin front lines, they were continuously manned with at minimum local militia or home defense units. Huge gaps invite breakthroughs.

**Note:** This may be partially by design — 744 OSIDs is a large map and 213 brigades can't cover everything. But the stacking problem (4 brigades on one OSID while 64% are empty) suggests poor distribution rather than genuine shortage.

**Status (n500):** Unified sector defense model now treats the front as a continuous locked line — defense at any OSID = `totalPower * (1/sector_edges) * densityMod`. Empty OSIDs are no longer completely undefended; the sector's total power covers all edges. Casualty distribution: 50% primary (closest brigade), 50% proportional to remaining sector brigades. This is a structural fix — the problem shifts from "undefended gaps" to "defense per edge too thin" (100% attack success rate in n500). Defense needs a minimum floor per edge.

---

### 7. HVO near-total passivity — 0 attacks in 40 weeks (n560, was 11 in n473)

**What we found:** HRHB conducted 0 attacks in n560 (was 11 in n473 before ops-only doctrine). This is historically very wrong.

**Historical context:** HVO was one of the most offensively active factions in 1992:
- **Operation Jackal** (Jun 7-26): HVO/HV liberated Mostar (Jun 11-12), captured Stolac (Jun 13), seized 1,800 km² — the first major VRS defeat of the war
- **Posavina** (Mar-May): HVO/HV defended Bosanski Brod, counterattacked to capture Modrica and Derventa
- **Posavina defense** (Jun-Oct): Sustained combat against Operation Corridor (HVO losses: 918 KIA, 4,254 WIA)
- **Kupres-Livno axis**: HVO stopped JNA advance at Suica and Livno (Apr 10-13)
- **Central Bosnia** (Oct+): HVO actively consolidating Lasva Valley, Vitez, Busovaca
- Realistic HVO offensive actions: **40-60** in this period, not 0

**Root causes (n560 investigation):**
1. **Graz Accords blocks ALL HRHB→RS targets**: Graz Agreement implemented as blanket RS-HRHB truce. Exceptions exist for corridor municipalities (Derventa, Orašje, etc.) but HRHB corps in those areas are too small or geographically separated to launch operations. HRHB Herzegovina corps pairs cannot attack their RS neighbors at all.
2. **No HVO↔RBiH conflict in 1992**: The sim correctly models the 1992 alliance. HVO-ARBiH war doesn't start until 1993 (outside 40w window).
3. **HRHB doctrine set to `offensive` w0-26 (n560)** — stance is correct, but with zero valid targets (all blocked by Graz), operations can never launch.
4. HRHB territory fragmentation prevents brigades reaching active fronts.

**Status:** The Graz mechanic needs sector-specific exceptions — HVO fought VRS actively in Posavina, Jajce, and around Mostar throughout 1992 despite Graz. The current exception list (Derventa, Orašje, etc.) is too narrow. Herzegovina operations (Op Jackal) need to be modeled as explicit Graz exceptions or pre-planned operations that bypass the truce filter.

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

## Priority Ranking

**Post-n560 state:** Dissolution fix + RBiH doctrine fix + HRHB doctrine fix shipped. 1 destroyed brigade (was 12). 24.8k KIA (was 23.5k). RS 91.7% success. RBiH launches 24 attacks from w17 (was 0). HRHB still 0 attacks (Graz blocking). 153 total battles (was ~130).

| Priority | Issue | Impact | Status |
|----------|-------|--------|--------|
| ~~**P0**~~ | ~~#2 Attack outcomes inverted~~ | ~~Root cause~~ | **FIXED n482** |
| ~~**P0**~~ | ~~#9 Entrenchment saturation~~ | ~~Contributes to #2~~ | **Partially fixed n482** |
| ~~**P0**~~ | ~~#11 Sarajevo falls~~ | ~~5 root causes: supply detection, enclave scaling, urban tank penalty, urban defense, garrison power~~ | **FIXED n527** |
| ~~**P0**~~ | ~~#13 Sectors span enemy territory~~ | ~~Edge adjacency walked through interior instead of following front — triple-junction fix~~ | **FIXED n532** |
| **P1** | #15 Density imbalance (16x ratios) | 1KK 4 brigades idle in Banja Luka, SRK 25-edge sector with 519 men | Investigation needed |
| **P1** | 100% early-war attack success | Target 70-80%. Every early attack succeeds — no defensive resistance | Active |
| **P1** | Late-war success rate 88.6% (n527) | Target 30-50%; improved from 100% (n500) but still too high | Active |
| ~~**P1**~~ | ~~#12 Suicide attacks (zombie brigades)~~ | ~~Dissolution absolute floor bypass~~ | **Partially fixed n556** (12→1 destroyed) |
| **P1** | Casualty volume (~24.8k vs 30-37k) | Still below historical; +1.2k from RBiH doctrine fix | Active — RBiH now attacks |
| **P1** | #7 HVO passivity (0 attacks) | Graz Accords blocks ALL HRHB→RS targets; need wider exceptions | Active |
| **P1** | #5/#10 Morale system | No victory boost + no zero-morale consequence | Active |
| ~~**P1**~~ | ~~H5 Casualty ratio inverted~~ | ~~Was 0.38 → now 0.87~~ | **Substantially fixed n524** |
| ~~**P1**~~ | ~~Anchor failures: Bihać~~ | ~~Bihać holds in n524~~ | **Fixed n524** |
| ~~**P1**~~ | ~~H6 ARBiH too passive~~ | ~~RBiH defensive all 40w → zero attacks~~ | **Partially fixed n560** (24 attacks from w17) |
| **P2** | #14 HVO ghost front (13 edges, 0 brigades) | 10k HVO personnel unassigned — enclave BFS can't reach sector fronts | Planned |
| **P2** | Anchor failures: Orašje | Corridor loss | Active |
| **P2** | #6/#8 Front coverage + stacking | Mitigated by reactive sector defense | Monitoring |
| **P2** | H4 VRS armor not concentrated | Maneuverable brigade tagging not yet implemented | Open |
| **P3** | #3 Formation casualty_ledger | Design gap, data exists in state-level ledger | Open |

---

## Methodology

**How to audit for realism:**
1. Run 40w scenario
2. Examine final save for patterns a real commander would find absurd
3. Check: brigade positions, casualty rates, territorial outcomes, troop strengths, operation tempos
4. Cross-reference against historical record (ARBiH 60-80k→180k, VRS ~80-110k, HVO 25-55k)
5. Document findings here with evidence, root cause, and fix status
