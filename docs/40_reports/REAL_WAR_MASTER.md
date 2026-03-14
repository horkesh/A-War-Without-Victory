# Real War Master

> The gap between simulation and reality. Every entry here is something we found where the sim does something that would be inconceivable in real war — especially the Bosnian War (1992-1995), a chaotic, desperate, existential conflict.

## Guiding Principle

In the Bosnian War, every brigade mattered. Commanders fought with what they had, where they were. There was no rear echelon luxury. Formations scrounged weapons, walked to the front, and fought from day one. If the sim produces behavior that a real Bosnian War commander would find absurd, it's a bug — even if the code is technically correct.

---

## Fixed

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

## Open / Under Investigation

### 29. Zombie operations — MAX_CONSECUTIVE_FAILURES not aborting (n25)

**What we found:** RS attacks `op:gracanica:gracanica_2` from w33 to w40 — **eight consecutive turns** — with outcomes stalemate, stalemate, repulsed, catastrophic (PR=0.35), catastrophic (PR=0.05), catastrophic (PR=0.16), catastrophic (PR=0.0), catastrophic (PR=0.0). An operation that has produced 4+ catastrophics should be long dead. Similarly, RS attacks Žepa at w38 (PR=0.48, 577 att / 83 def) and w39 (PR=0.11, 298 att / 59 def) — continued assault at near-zero power. RBiH 5th Corps attacks ripac repeatedly (W34 repulsed, W35 catastrophic 636/21, W40 catastrophic 720/23) at PR=0.29–0.43.

**Historical context:** No corps commander in the Bosnian War kept hammering a position after 4+ catastrophic defeats. Gracanica (Tuzla suburb) was a defensive stronghold; VRS probed it but abandoned direct assault when losses mounted. Operations had finite lifespans — if the intelligence was wrong or the defense too strong, the operation was reassigned or cancelled. The 1992 VRS was doctrine-capable; they did not charge positions at PR=0.05 repeatedly.

**Root cause hypothesis:** `MAX_CONSECUTIVE_FAILURES=5` and `MAX_TOTAL_FAILURES=5` should be terminating these operations. Either: (1) the failure counter is not incrementing on catastrophic outcomes — only on explicitly "failed" attack orders, (2) the operation is cycling through recovery/restart rather than terminal failure, or (3) `combat_causality` shows 19 invalid operations and 16 zero-eligible-attacker operations — the zombie op may be consuming turns as "movement-only" without registering battle failures.

**Evidence (n25):** gracanica_2 attacked w33–w40 (8 turns). Žepa attacked twice at PR<0.5. Bihać ripac attacked at PR=0.29–0.43 three times. RS Gracanica at PR=0.0 in final turn — no power whatsoever.

**Status:** P2 — open. Investigation needed into failure counter path for catastrophic outcomes.

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

**Evidence:**
- `sector:vrs_sarajevo_romanija:4`: 25 edges (Hadžići/Pale/Ilidža siege sector), 1 brigade (1st Romanija, 1,007 men), `threat_ratio: 299.97`
- `sector:vrs_sarajevo_romanija:2`: 6 edges, **0 brigades** — the operation's source sector, emptied when 3rd/4th Sarajevo marched off
- "Operacija Bastion" objectives: `kakanj:poljani_2`, `vares:gornja_borovica_2`, `kakanj:seoce_2`, `olovo:olovo_2`, `olovo:milankovici_2`, `visoko:podvinjci_2` — 5 captured, pushing 50+ km from Sarajevo

**Historical context:** Dragomir Milošević (SRK commander 1994–1996, but Tomislav Šipčić in 1992) ran SRK as a siege and containment corps. Its entire mission was encircling Sarajevo — tightening the ring, controlling the Igman/Hadžići supply route, and mounting the sustained shelling and sniper campaign. A VRS commander sending two of his five brigades to attack Kakanj while Sarajevo's siege ring is held by 1 brigade would be relieved of command. Sarajevo was the political and propaganda centrepiece of the entire VRS campaign.

**Root causes:**

**1. Operation chaining through RS-held waypoints.** The operation legitimately launched against Ilijas/Olovo (RBiH objectives in sector 2's `enemy_osids`). The operation's axis then traversed RS-controlled Kakanj and Vareš OSIDs as sequential "waypoints" — march-first behavior counted these traversals as "captured" objectives, dragging brigades progressively further northeast. 5 of 6 objectives were RS-controlled territory that brigades simply marched through. Only `visoko:podvinjci_2` is an actual enemy objective.

**2. No "hold Sarajevo" strategic constraint on SRK.** The bot treats SRK identically to any offensive corps. `generateCorpsDirectives` computes offensive targets from enemy OSIDs adjacent to SRK sectors — Ilijas and Olovo happen to be adjacent at operation launch. There is no mechanism recognizing that SRK's primary mission is encirclement maintenance, not territorial expansion.

**3. Opportunistic targeting has NO truce guard — potential Graz violation (BUG).** Once Operacija Bastion moved SRK brigades into the Kakanj/Vareš area, SRK's sectors now border HRHB-controlled Kakanj OSIDs (`op:kakanj:bukovlje_2`, `op:kakanj:slapnica_2`). The opportunistic target code path in `bot_corps_directives.ts` (~line 537–560) adds adjacent enemy sectors with 0 brigades as targets with **no truce/Graz check**. `shouldGrazBlockAttack()` in `local_truces.ts` only protects the pairs `vrs_2nd_krajina ↔ hvo_tomislavgrad` and `vrs_herzegovina ↔ hvo_southeast_herzegovina`. **SRK is not in any Graz pair.** The current directive has HRHB Kakanj OSIDs as offensive targets — VRS SRK is being directed to attack HVO in Kakanj despite the Graz Accords. This is a confirmed code bug.

**4. Siege sector `threat_ratio` = 0 on ring sectors 0–3.** Sectors 0, 1, 2, 3 all show `threat_ratio: 0.00` despite ARBiH 1st Corps brigades (101st, 105th, 112th, 115th, 141st) physically at the enemy OSIDs in central Sarajevo. The reason requires further investigation — likely the `computeLocalFrontDefensivePower` denominator or the way encirclement topology (front faces inward rather than outward) interacts with the threat calculation. Zero threat causes the bot to assign `active_defense` stance to these sectors, suppressing any urgency to reinforce or protect them.

**Priority:** P0 for the Graz truce bug (SRK attacking HVO in Kakanj). P1 for the siege abandonment pattern and the threat_ratio=0 issue on ring sectors.

**Files to investigate:** `bot_corps_directives.ts` ~line 537–560 (opportunistic target selection), `corps_front_sectors.ts` threat_ratio computation at end of `classifyBrigadesByTerritory`, `local_truces.ts` (`shouldGrazBlockAttack` for missing SRK corps pair).

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

### 23. Sector-wide casualty cascade — 0.1:1 defender-heavy battles (n647)

**What we found:** Five decisive victories where the DEFENDER takes 10-15× the attacker's casualties:

| Week | Target | Att cas | Def cas | Ratio |
|------|--------|---------|---------|-------|
| w38 | Donja Kamenica | 109 | 1,671 | 0.07:1 |
| w39 | Donja Kamenica | 91 | 1,252 | 0.07:1 |
| w20 | Kramer Selo | 119 | 1,594 | 0.07:1 |
| w3 | Hotonj | 124 | 1,363 | 0.09:1 |
| w12 | Budozelje | 105 | 919 | 0.11:1 |

A 1-brigade RS attack causing 1,671 defender casualties means the SECTOR's 5+ brigades are all taking proportional hits from a pinprick attack. A real sector commander would absorb a probing attack on one edge without 1,600 casualties across his entire front.

**Root cause:** The n590 fix changed `personnelDefender` from primary-brigade-only to total-sector-personnel. This correctly fixed the 50:1 attacker-heavy outliers but overcorrected — now when a small force attacks one edge of a large sector, the entire sector hemorrhages. The 50% proportional casualty distribution to non-primary sector brigades scales with the total sector base, not the engagement intensity.

**Historical context:** In the Bosnian War, a probe against one sector of the ARBiH Tuzla corps wouldn't cause 1,671 casualties across the entire corps front. Losses concentrate at the point of engagement. Adjacent units might take some harassing fire but not proportional casualties from a battle they're barely involved in.

**Proposed fix:** Scale the proportional casualty distribution by engagement intensity. When a small force attacks a large sector, cap the total defender casualties at some multiple of attacker personnel (e.g., 3-5×). Or reduce the 50% proportional share for non-primary brigades when attacker force is small relative to sector size.

**Status:** P1 — NEW (n647). The 50:1 attacker-heavy ratios are fixed, but 15:1 defender-heavy ratios are the new overcorrection.

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
2. **Srebrenica Ring axis non-functional.** 3 brigades, 0 captures. Either the axis can't reach objectives or the brigades are too weak to attack. **Partially fixed n703+: typo `rs_1st_milici` → `rs_1st_milii` now gives Ring axis its 3rd brigade. `osmace_2` removed from Srebrenica enclave OSID list (it was painted RS in Jan 1993 calibration data — VRS had already captured it).** Ring axis still gets 0 captures but force ratio is now correct; remaining issue is approach routes.
3. **Post-sweep: Operacija Kamen (bot-generated, w35-w40), 1 brigade, 0 captures.** A single-brigade "operation" is not an operation.

**Fix B (follow-on planning duration) — DEFERRED:** Attempted in engine-sprint but caused regression. Corps-ID-only follow-on detection incorrectly marked Drina's Podrinje Sweep as follow-on to Op Drina (different theater). Needs theater-aware matching (overlapping sector coverage, not just corps_id). Documented for future sprint.

**Result (n703+, post-sprint):** Drina region improved. DRINA 84.1% area match. Ring axis still 0 captures — force ratio now structurally correct after typo fix.

**Status:** P2 — Ring axis approaches need investigation. Follow-on planning duration deferred (needs theater-aware logic).

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

**Status:** P1 — density equalization below minimum threshold needed. Design question: should `ensureMinimumSectorCoverage` enforce a minimum ratio (e.g., 1 brigade per 8 edges) and pull from overstaffed adjacent sectors?

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

---

## Priority Ranking

**Post-n25 state:** 90.5% area-weighted, 13/13 anchors. Hash `6fd84077b3a383e2`. 139 battles (RS 112, RBiH 21, HRHB 6). RS win rate 88.4% (target 60-75%). Att:def ratio 0.79:1 (defenders take 25% more casualties than attackers). 73.4% decisive victories. brka_2 FIXED. Goražde enclave redistribution guard FIXED. SRK 0-assigned FIXED. Idle equalization Step 7c added.

| Priority | Issue | Impact | Status |
|----------|-------|--------|--------|
| **P1** | #24 RS 88.4% success rate | Too high for 1992 (historical 60-75%). 73.4% decisive victories | **Open n25** |
| **P1** | Att:def ratio 0.79:1 | Defenders take 25% more casualties than attackers globally | **Open n25** |
| **P1** | #23 Sector casualty cascade (0.1:1) | n590 overcorrection — 1,671 def casualties from 109 att attack | **Open n647** |
| ~~**P0**~~ | ~~#16 Zero equipment~~ | ~~False alarm~~ | **FALSE ALARM** |
| ~~**P0**~~ | ~~#2 Attack outcomes inverted~~ | ~~Root cause~~ | **FIXED n482** |
| ~~**P0**~~ | ~~#11 Sarajevo falls~~ | ~~5 root causes~~ | **FIXED n527** |
| ~~**P0**~~ | ~~#13 Sectors span enemy territory~~ | ~~Triple-junction fix~~ | **FIXED n532** |
| ~~**P1**~~ | ~~#17 Morale-0 zombie brigades~~ | ~~Dissolution criteria gap~~ | **FIXED n588** |
| ~~**P1**~~ | ~~#18 50:1 catastrophic casualty ratios~~ | ~~Defender near-invulnerable~~ | **FIXED n590** (overcorrection: #23) |
| ~~**P1**~~ | ~~#21 No probe/recon operations~~ | ~~Corps attack blind~~ | **FIXED n617** |
| **P1** | #15 Density imbalance (16x ratios) | 1KK 4 brigades idle in Banja Luka, SRK sector with 519 men | Investigation needed |
| **P2** | #29 Zombie operations (Gracanica 8 turns, Žepa, Bihać) | MAX_CONSECUTIVE_FAILURES not aborting | **NEW n25** |
| **P2** | #30 ARBiH Foča expansion | Goražde sector:8 spans Foča territory; enclave redistribution guard partial fix | **PARTIAL n25** |
| **P2** | #25 Podrinje Sweep 23 weeks | Ring axis typo fixed; Follow-on planning deferred (theater-aware logic needed) | **PARTIAL n703+** |
| **P3** | #7 HVO passivity (30 orders n618) | Mostly structural | **MOSTLY STRUCTURAL** |
| ~~**P1**~~ | ~~#5/#10 Morale system~~ | ~~No victory boost + no zero-morale consequence~~ | **ADDRESSED n588/n618** |
| **P1** | Casualty volume — monitor | Defender casualties may be inflated by #23 | Monitoring |
| ~~**P1**~~ | ~~#12 Suicide attacks~~ | ~~Dissolution absolute floor bypass~~ | **Partially fixed n556** |
| ~~**P1**~~ | ~~H6 ARBiH too passive~~ | ~~24→41 attacks~~ | **Partially fixed n560/n587** |
| ~~**P2**~~ | ~~#19 Static 2-ops pattern~~ | ~~False alarm~~ | **FALSE ALARM** |
| ~~**P2**~~ | ~~#14 HVO ghost front (0 sectors)~~ | ~~Correct until HVO-RBiH war (April 1993). No fix needed~~ | **BY DESIGN** |
| **P2** | #6/#8 Front coverage + stacking | Mitigated by reactive sector defense | Monitoring |
| **P2** | H4 VRS armor not concentrated | Mech/moto staging exists; equipment IS present | Open |
| ~~**P2**~~ | ~~Brčko/Gradačac anchor~~ | ~~brka_2 fixed: avoided_osids_by_faction RS scenario constraint~~ | **FIXED n703+** |
| **P2** | 0 dissolved formations at w40 | Dissolution criteria may be too protective | **NEW n647** |
| ~~**P1**~~ | ~~#28 SRK 0-assigned cycle~~ | ~~reclassifyRearBrigades zero-guard scoped to vrs_sarajevo_romanija~~ | **FIXED n703+** |
| **P3** | #20 30 RBiH at 3,000 cap | Cookie-cutter uniformity | **NEW n587** |
| **P3** | #3 Formation casualty_ledger | Design gap, data exists in state-level ledger | Open |

---

## Methodology

**How to audit for realism:**
1. Run 40w scenario
2. Examine final save for patterns a real commander would find absurd
3. Check: brigade positions, casualty rates, territorial outcomes, troop strengths, operation tempos
4. Cross-reference against historical record (ARBiH 60-80k→180k, VRS ~80-110k, HVO 25-55k)
5. Document findings here with evidence, root cause, and fix status
