# AWWV Calibration Master Reference

**Purpose:** Persistent lessons-learned record for Phase II 40w calibration (April 1992 → January 1993).
**Updated:** 2026-02-28
**Canonical target run:** n254 (`apr1992_definitive_40w__26e02206211e085d__w40_n254`)

---

## Target State (January 1993 / Week 40)

### Territory (OSIDs of 753 total)
| Faction | Target | n254 | Delta | Status |
|---|---|---|---|---|
| RS | 416 | 422 | +6 | Near |
| RBiH | 248 | 248 | 0 | ✅ Exact |
| HRHB | 89 | 83 | -6 | Near |

### Army Strengths (end of 40w)
| Faction | Personnel | Brigades | Target | Status |
|---|---|---|---|---|
| VRS (RS) | ~116k | 86 | ~100k | Over by 16k |
| ARBiH (RBiH) | ~134k | 70 | ~130k | Over by 4k — acceptable |
| HVO (HRHB) | ~45k | 29 | ~45k | ✅ Exact |

### Casualties (40 weeks, n254)
- **Attacker total:** ~24,000 — dominated by RS (318 attack orders vs RBiH 87 vs HRHB low)
- **Defender total:** ~3,100
- **Attacker:Defender casualty ratio:** ~7.7:1

**Historical full-war KIA targets (3.5 years = 182 weeks):**
| Faction | Full-War KIA | Yr 1 Est (~50%) | At w40 (~77% of Yr 1) |
|---|---|---|---|
| VRS (RS) | ~24,000 | ~12,000 | ~9,200 |
| ARBiH (RBiH) | ~30,000 | ~15,000 | ~11,500 |
| HVO (HRHB) | ~8,000 | ~3,200 | ~2,500 |
| **Total** | **~62,000** | **~30,200** | **~23,200** |

**n254 distribution concern:** RS is listed as attacker in 318/405 (~78%) orders. At that rate, RS loses ~18.7k attacker casualties — 2× their estimated year-1 historical total. The issue is NOT total casualties but that **RS is fighting too much, including against wrong targets (HRHB), while ARBiH attacks 87 times (still too many historically).**

### Displacement (n254)
- **Displaced (routed):** ~43k people
- **Fled abroad:** ~5.7k
- **Killed in displacement:** ~5.7k
- **Total displacement events:** 65 municipalities over 37 weeks
- **Minority flight:** 0 (disabled — `enable_rbih_hrhb_dynamics: false`)
- **Historical note:** Real displacement by Jan 1993 was ~1M+. Engine counts only Phase II takeover-triggered + pressure displacement. Phase I mass displacement is baked into `init_control` snapshot, not tracked in run summaries.

### Match Rate vs Painted Targets (n254)
Overall: **81.4%** (613/753 OSIDs correct)

| Region | Match | Key Issues |
|---|---|---|
| KRAJINA | 95.5% | RS holds 6 Bihac pocket edge OSIDs it shouldn't |
| POSAVINA_NE | 78.0% | Orasje (HRHB→RS), Brcko south (RBiH→RS), Zvornik interior wrong |
| DRINA | 62.5% | Enclave brigades push outward into RS-painted territory (~36 OSIDs) |
| CENTRAL_CORRIDOR | 77.7% | RS pushes too deep into Tešanj/Zavidovići/Kakanj (+13 extra) |
| CENTRAL_BOSNIA | 84.3% | RS/HRHB overrun some RBiH areas (Bugojno, Konjic, Travnik) |
| SARAJEVO | 67.7% | Count perfect (21/21 RS) but wrong distribution — Trnovo/Ilidža swap |
| HERZEGOVINA | 94.6% | RS holds 3 Kupres + 2 Stolac/Trebinje HRHB-painted OSIDs |

---

## Calibration Run History

| Run | Scenario Hash | RS | RBiH | HRHB | Notes |
|---|---|---|---|---|---|
| n233 | 52w | 526 | 163 | 64 | Old 52w run, front frozen w35 |
| n246 | 4524ee926374c26f | 406 | 265 | 82 | First 40w baseline, all 6 benchmarks pass |
| n252 | 4524ee926374c26f | — | — | — | Same hash as n246 — avoided_osids silently dropped |
| n253 | 26e02206211e085d | 392 | 279 | 82 | Vozuca anchor PASS; RS dropped 14 from Vozuca fix |
| **n254** | 26e02206211e085d | **422** | **248** | **83** | **OOB home fixes. Best run. RBiH exact.** |
| n255 | 54295acf83337756 | 406 | 265 | 82 | Bulk avoided_osids made things worse — reverted |
| **n268** | 00750db9480be428 | **437** | **235** | **81** | Phase M mechanics (morale, ZoC virtual defense, enclave OOB, displacement routing). 81.0% match (610/753). 6/6 benchmarks. Drina enclave overexpansion (+24 RBiH OSIDs). |

---

## Historical OOB Baselines

### VRS Strength (April 1992 → January 1993)
| Period | Strength | Character |
|---|---|---|
| April 1992 | ~80,000 | JNA inheritance, full heavy weapons |
| December 1992 (w40 target) | ~90,000–100,000 | Expansion + consolidation |
| 1993–1994 peak | ~100,000–110,000 | Plateau |

**Corps breakdown (April 1992):**
| Corps | HQ | Strength | Mission |
|---|---|---|---|
| 1st Krajina | Banja Luka | ~40,000 | Strongest; offensive; Posavina corridor |
| 2nd Krajina | Drvar | ~15,000 | Weakest; besieging Bihać |
| East Bosnian | Bijeljina | ~25,000 | Corridor security; northeastern ops |
| Drina | Vlasenica | ~15,000 | Siege of Srebrenica, Žepa, Goražde |
| Sarajevo-Romanija | Lukavica | ~20,000 | Static siege of Sarajevo |
| Herzegovina | Bileća | ~10,000 | **DEFENSIVE** — southern BiH; Goražde ops |

**Key point:** Herzegovina Corps was DEFENSIVE. VRS attacking HRHB in Herzegovina = misuse of Herzegovinian forces they didn't have to spare.

**Equipment inherited from JNA:**
- Tanks: ~200–300 (T-55, T-72, T-34) — by end 1992 ~300–400
- APCs/IFVs: ~400–500 (M-80, BOV)
- Artillery: Extensive JNA stockpiles — 155mm, 122mm, 105mm, mortars
- Ammunition: Abundant (full JNA depots)

### ARBiH Strength (April 1992 → January 1993)
| Period | Strength | Character |
|---|---|---|
| April 1992 | ~60,000–80,000 | Many UNARMED; arms embargo from day 1 |
| December 1992 (w40 target) | ~110,000–130,000 | Growing but still outgunned |
| 1995 peak | ~180,000–200,000 | Fully organized |

**Corps at w40 (December 1992):**
| Corps | HQ | Est. Strength | Mission |
|---|---|---|---|
| 1st Corps | Sarajevo | ~20,000–30,000+ | Defending besieged capital (1,425 days) |
| 2nd Corps | Tuzla | ~10,000–15,000 | Industrial base; some counter-pressure on corridor |
| 3rd Corps | Zenica | ~15,000–20,000 | Central Bosnia defense (incl. Bugojno); two-front war forming 1993 |
| 4th Corps | Mostar | ~5,000–10,000 | Neretva valley defense; Konjic/Jablanica |
| 5th Corps | Bihać | ~10,000–15,000 | ISOLATED POCKET; no resupply; internal Abdić crisis forming |

**Enclave commands — survival posture ONLY:**
| Enclave | Fighters | Equipment | Supply | Historical Mission |
|---|---|---|---|---|
| Srebrenica | 1,000–2,000 | **Small arms only** (hunting rifles, captured weapons) | **NONE** — besieged | Survival; Orić raids were desperate foraging, not offensive |
| Goražde | 2,000–3,000 | **Small arms only** | **NONE** — besieged | Survival; relied on UNPROFOR presence |
| Žepa | 500–800 | **Small arms only** | **NONE** — besieged | Survival |

**Critical constraint:** ARMS EMBARGO throughout entire war. No tanks, no artillery at start. Equipment only via capture or black market. At week 40, enclave brigades have zero resupply, zero logistics, no ammunition reserves.

### HVO Strength (April 1992 → January 1993)
| Period | Strength | Character |
|---|---|---|
| April 1992 | ~25,000–35,000 | Establishing control in Croat-majority areas |
| December 1992 (w40 target) | ~40,000–45,000 | Expanded; Croatian supply lines functional |
| 1993 peak (war with ARBiH) | ~50,000–55,000 | Maximum expansion |

**Operational Zones at w40:**
| OZ | HQ | Strength | Mission |
|---|---|---|---|
| Southeast Herzegovina | Mostar (west) | ~10,000–15,000 | Strongest; Croatian supply; defensive vs VRS |
| Central Bosnia | Vitez/Busovača | ~8,000–12,000 | Besieged enclaves; helicopter supply from Split |
| Posavina NW | Orašje | ~5,000–8,000 | Isolated pockets; fighting VRS WITH ARBiH |
| Tomislavgrad | Tomislavgrad | ~5,000–8,000 | Western sector; defensive |

---

## RS-HRHB Relations in 1992

**Classification: "Ambiguous Ally" — NO OPEN WAR between VRS and HVO in 1992.**

| Area | Reality | Implication |
|---|---|---|
| Posavina | HVO and ARBiH fighting TOGETHER against VRS | RS vs HRHB conflict is ACCEPTABLE here |
| Kupres (April 1992) | HVO cooperated with VRS to take from ARBiH | Exception — specific, brief |
| Herzegovina | **No VRS-HVO combat in 1992** | RS attacking HRHB here = AHISTORICAL |
| Central Bosnia | Competing territorial claims; uneasy cooperation | No open fighting |

**Calibration rule:** If RS is attacking HRHB territory in Herzegovina or Central Bosnia, the root cause is that **RS doesn't have enough brigades in its actual priority areas** (Drina corridor, Central Corridor). The fix is correct brigade positioning and a large scoring penalty, not behavioral blocks.

**RS-HRHB scoring rule (to implement):** RS attacking HRHB-controlled OSIDs outside Posavina = -400 score penalty. "VRS would not spend Serb blood for Croatian land unless strategically compelled."

---

## Displacement System Reference

### Implementation Files
- `src/sim/phase_i/displacement_hooks.ts` — Phase I (one-time flip trigger)
- `src/state/displacement.ts` — Phase II continuous pressure triggers
- `src/state/displacement_takeover.ts` — 4-week timer + camp maturation
- `src/state/displacement_routing_data.ts` — Routing tables by faction/region
- `src/state/displacement_state_utils.ts` — Brigade presence check for routing gate

### Timer System (Phase II Takeover)
- `TAKEOVER_DISPLACEMENT_DELAY_TURNS = 4` — settlement flip → displacement initiation
- `CAMP_REROUTE_DELAY_TURNS = 4` — camp creation → population routed to receiving municipality
- Total: **8 turns** from settlement flip to displaced population visible at destination
- Stored in `state.hostile_takeover_timers` keyed by MunicipalityId

### Kill and Flight Fractions
| Scenario | Killed | Flee Abroad | Internal Camp |
|---|---|---|---|
| RS displaced (Serb) | 10% | 30% | 60% |
| HRHB displaced (Croat) | 10% | 25% | 65% |
| RBiH displaced (Bosniak) | 10% | 0% (no external state) | 90% |
| Posavina Croats (regional override) | 10% | 70% | 20% |
| **Enclave overrun** (RS takes RBiH enclave) | **35%** | — | 65% |
| No 1991 census available | 20% lost | — | 15% displaced per flip |

### Camp Routing (Motherland Preference)
- **RBiH displaced**: Tuzla → Zenica → Travnik → Goražde → Srebrenica → Sarajevo → Bihać
- **HRHB displaced**: Mostar → Livno → Gradačac → Brčko → Orašje
- **RS displaced**: Pale/Sokolac/Han Pijesak (if Sarajevo area) → Banja Luka → Bijeljina → Doboj

**Routing gate:** Displaced can only route to municipalities where the **receiving faction has a brigade present**. If no brigade: population stays in camp awaiting future brigade deployment. This is critical for enclave supply simulation.

### Phase II Continuous Pressure Triggers
- Unsupplied 3+ consecutive turns: 5% per turn
- Encirclement (no friendly adjacency path): 10% per turn
- 2+ concurrent front breaches: 3% per turn
- Max per turn: 5% remaining population (PHASE_F_MAX_DELTA_PER_TURN)

### Calibration Context
- n254: ~43k routed + ~5.7k fled + ~5.7k killed for Phase II displacement only
- Phase I displacement (historical: ~1M+ by Jan 1993) is baked into `init_control` snapshot
- Minority flight disabled (`enable_rbih_hrhb_dynamics: false`)
- **The engine is correct**. The discrepancy vs historical 1M+ is by design — Phase I chaos is not re-simulated.

---

## Engine Combat Mechanics Reference

### Existing "Last Stand" Logic (`attack_resolution_osid.ts` lines 610–629)
```
if (retreatDests.length === 0) {
  defenderPower ×= 1.5        // defender fights harder
  lastStandCasMult = 2        // BOTH sides take double casualties
}
```
Triggers only when defender has **zero valid retreat destinations** (complete encirclement).

### Casualty Rate Constants
- `BASE_ATTACKER_LOSS_RATE = 0.03` (3% of attacker personnel per engagement)
- `BASE_DEFENDER_LOSS_RATE = 0.015` (1.5%)
- `KIA_FRACTION = 0.25` (25% of casualties are killed; 60% wounded; 15% MIA)
- Outcome multipliers: decisive\_victory → attacker 1.0×/defender 2.5×; stalemate → 1.0×/0.8×; repulsed → 2.0×/0.5×

### Cohesion Mechanics
- Cohesion is a **direct multiplier** on combat power (`coh/100` × other factors)
- `RBiH cohesion floor`: rises from 35 (week 0) → 62 (week 52) — enforcing professionalization
- `RS cohesion ceiling`: falls from 85 (week 0) → 68 (week 52) — enforcing decay
- `surrenderCascade`: cohesion < 10 AND powerRatio > 2.5 → forced decisive victory, defender eliminated in place

### What Does NOT Exist
- No "desperation" parameter (encirclement does not boost morale)
- No "homeland defense" multiplier (home municipality not weighted)
- No retreat reluctance (defenders always retreat if a friendly OSID is adjacent)
- Entrenchment increases defender **power** but does not reduce **casualty rates**
- No background attrition (artillery bombardment between formal combats)

---

## Root Cause Analysis (n254 Gaps)

### Gap 1: Enclave Brigades Attack Outward [DRINA 62.5%]
- **Symptom:** ~36 OSIDs wrong — Srebrenica 5 brigades + Goražde 7 brigades push into RS territory
- **Root cause:** Enclave brigades are given same equipment and supply as regular ARBiH brigades. No material constraint prevents them from scoring attacks as worthwhile.
- **Historical reality:**
  - Srebrenica: Naser Orić's "raids" were desperate food-foraging into surrounding villages, not coordinated offensive operations
  - Goražde/Žepa: Pure survival. No ammunition reserves. UNPROFOR presence.
  - These brigades had **no tanks, no artillery, no supply lines**
- **Wrong fix:** `avoided_osids` — proven to redirect attacks to other RS targets (n255: RS dropped 422→406)
- **Correct fix:** Material deprivation — enclave brigade compositions with zero heavy weapons; enclave supply status = CRITICAL by definition
- **Engine leverage:** RBiH CRITICAL supply penalty = -300 per attack score. If enclave brigades are always marked CRITICAL supply, attacks score negative and they stop.

### Gap 2: RS Attacks HRHB Territory [HRHB territory −6 OSIDs; Central Bosnia wrong]
- **Symptom:** RS holds Kupres, Orasje (HRHB pocket), some Bugojno/Konjic/Herzegovina OSIDs
- **Root cause:** RS brigades are not covering their actual priority areas (Drina, Central Corridor) densely enough. Attack scoring finds HRHB-adjacent OSIDs as convenient targets.
- **Historical reality:** VRS Herzegovina Corps was DEFENSIVE. VRS had no reason to attack HVO territory in 1992 — they weren't at war.
- **Correct fix 1:** Large scoring penalty for RS attacking HRHB-controlled OSIDs outside Posavina (~-400)
- **Correct fix 2:** Remaining OOB home municipality corrections — more RS brigades in Drina Corps AOR

### Gap 3: Central Corridor — RS Overruns ARBiH Territory [CORRIDOR 77.7%]
- **Symptom:** ~13 extra RS OSIDs in Tešanj, Zavidovići, Kakanj, Maglaj
- **Root cause:** ARBiH 3rd Corps brigades (Zenica, ~15–20k men) not defending organically. Current weight=80 insufficient vs RS 1st Krajina pressure.
- **Historical reality:** 3rd Corps held a continuous corridor through Tešanj-Maglaj-Zavidovići-Žepče throughout 1992–1993. This was their core defensive mission.
- **Correct fix:** Increase 3rd Corps "Central Corridor Counter" weight (80→110–120) AND/OR ensure 3rd Corps brigades spawn in corridor municipalities (OOB home_mun review)

### Gap 4: ARBiH Attacks Too Much (87 orders over 40 weeks)
- **Symptom:** RBiH issues 87 attack orders. Even this is too many for an arm-embargoed army defending from siege.
- **Root cause:** `general_defensive` stance still allocates attack shares. Most attacks likely from enclave brigades or 2nd Corps opportunism.
- **Historical reality:** ARBiH was almost entirely defensive in 1992. No ammunition for offense. Defending urban centers.
- **Correct fix:** Enclave brigades: attack_share = 0.0 (when supply=CRITICAL, attack_score will anyway be negative). Global ARBiH attack_share reduction for early war period.

### Gap 5: Casualty Distribution Wrong — ARBiH Absorbs Too Few Casualties
- **Symptom:** Total n254 casualties: ~27k (attacker+defender combined). At KIA_FRACTION=0.25 → ~6.75k KIA. Historical target at w40: ~20–23k KIA total. Deficit: ~3×.
- **Deeper symptom:** Defender casualties (~3.1k) are minimal. ARBiH historically had MORE total KIA than VRS (30k vs 24k over full war) despite being predominantly defenders. In the game, ARBiH defenders barely bleed.
- **Historical reality (BB evidence):**
  - 5th Corps fought "harder and more grimly" as pushed back — inverse of normal morale collapse (BB2 p556)
  - Srebrenica engagements: VRS lost 30 KIA + 100 wounded in ONE action (BB2 p405) — defenders also bled heavily
  - HV 81st Guards (400–500 elite) took 40 casualties to dislodge 120 VRS defenders at Previle Pass (BB1 p456)
  - "Bitterly contested" Donji Vakuf — some of the hardest-fought ground of the entire war (BB2 p484)
  - ARBiH fighters used "iron pipes filled with nails" and still fought hard (BB2 p416)
- **Root cause:** Defenders who CAN retreat DO retreat, taking minimal casualties. The engine models this correctly for conventional defense, but ARBiH defenders often chose NOT to retreat because retreat = abandoning civilians/families, and there was nowhere safe to go. The "no retreat option" → higher absorption — this is only partially modeled (lastStand at complete encirclement). Between encirclement and free defense lies the "homeland defense" zone that the engine does not capture.
- **Correct fix:** "Homeland Determination" mechanic — when a brigade defends its home municipality or an enclave, apply a power multiplier (+20–30%) and casualty multiplier (×1.3–1.5) that shifts outcomes toward stalemate/costly while raising total casualties on both sides.

### Gap 6: VRS Troop Count 116k vs 100k Target
- **Symptom:** VRS spawns ~116k personnel; target is ~100k (historically ~90–100k by December 1992)
- **Root cause:** `FACTION_POOL_SCALE` RS=0.35 generates excess recruits
- **Correct fix:** Lower to RS=0.30 (estimated result: ~97–100k)

---

## Lessons Learned

### L1 — OOB home municipalities matter enormously
**Session:** 2026-02-28 (n253→n254)
Brigade spawn location (home_mun) determines initial placement. Correcting 4 brigades
(107th Gradačac, 108th Brčko, 115th Zrinski, VRS 2nd Sarajevo) moved RS from 392 to 422
— a +30 OSID swing for 4 OOB fixes. Brigade spawn is the highest-leverage calibration knob.
**Do instead:** Before any AI tuning, audit all brigade home municipalities against OOB master docs.

### L2 — avoided_osids is a crutch, not a fix
**Session:** 2026-02-28 (n254→n255)
Adding avoided_osids for 36 RBiH Drina OSIDs caused RS to DROP from 422 to 406.
Blocking RBiH from attacking Drina redirected their attack slots to OTHER RS targets.
Net effect: worse. The correct fix changes the AI's incentive structure materially.
**Exception:** Single specific historical anchors (e.g., op:zavidovici:vozuca_2) are
acceptable when there is a clear historiographic reason and no better structural fix.

### L3 — Co-ethnic scoring (-80..+80) alone is insufficient
**Session:** 2026-02-28
RS still attacks HRHB-held OSIDs despite penalty. -80 does not overcome strategic
scoring bonuses. Need explicit RS-HRHB scoring penalty (~-400 outside Posavina):
"VRS would not spend Serb blood for Croatian land unless strategically compelled."

### L4 — Enclave brigades need material deprivation, not behavioral blocks
**Session:** 2026-02-28 (REVISED from initial behavioral fix proposal)
Srebrenica/Goražde/Žepa enclave brigades attack outward. The fix is NOT behavioral
(avoided_osids, attack_share=0 in strategy) but MATERIAL:
- Enclave brigade OOB composition: infantry=1000, tanks=0, art=0, aa=0
- Enclave supply status: always CRITICAL (besieged = no supply)
- CRITICAL supply penalty (-300 for RBiH) makes attack scoring negative → organically stops attacks
**Do instead:** Fix the material conditions. Behavior follows from conditions.

### L5 — normalizeScenario is a whitelist — new fields must be explicitly added
**Session:** 2026-02-28
`scenario_loader.ts:normalizeScenario()` explicitly extracts each known field. Any new
field MUST be added in both return objects. Otherwise silently dropped (same hash).
This burned 2 runs (n252 same as n246).

### L6 — Scenario hash depends on scenario JSON, not OOB data
**Session:** 2026-02-28
Changing `oob_brigades.json` does not change the scenario hash. Always check run folder
name (hash) AND actual territory counts. Same hash ≠ same results if OOB changed.

### L7 — Central Corridor: RS pushes too deep
**Session:** 2026-02-28 (n254 analysis)
RS holds ~13 extra OSIDs in Tešanj/Zavidovići/Kakanj that should be RBiH.
ARBiH 3rd Corps Counter (weight=80) not sufficient. Historical: 3rd Corps held
continuous corridor Tešanj-Maglaj-Zavidovići-Žepče throughout 1992–1993.

### L8 — Sarajevo OSID distribution: count correct, positions wrong
**Session:** 2026-02-28 (n254)
Sarajevo faction counts perfect (RS=21/21, RBiH=10/10). But specific OSIDs wrong —
Trnovo extra RS, Ilidža/Vogošća RS deficit. Positional issue, not quantity. Harder to fix.

### L9 — Phase I bypassed: init_control is a snapshot
**Session:** 2026-02-28
The canonical 40w scenario starts in phase_ii with init_control: "apr1992". April chaos
is not simulated. Casualties and displacement in run summaries do NOT include Phase I.
This is deliberate — calibrating Phase I is harder than starting from known snapshot.

### L10 — "Last stand" mechanic exists but triggers too rarely
**Session:** 2026-02-28 (engine research)
The engine has `lastStandCasMult=2` and defender power ×1.5 when `retreatDests.length === 0`
(complete encirclement). This is correct but only fires in extreme geographic isolation.
Historically, defenders fought like cornered soldiers even when technically adjacent to
one more friendly OSID — because that OSID was just the next position in the last stand.
**Do instead:** Extend the determination mechanic to "homeland defense" (not just encirclement).

### L11 — RS attacking HRHB = RS too weak in priority areas, not too aggressive
**Session:** 2026-02-28 (user correction)
If RS attacks HRHB territory (Herzegovina, Bugojno, Kupres), the diagnosis is NOT
"RS is over-aggressive" but "RS doesn't have enough brigades covering its actual
priorities (Drina valley, Central Corridor, Posavina)." Fix RS brigade positioning first;
then add co-ethnic RS-HRHB penalty to prevent residual attacks.

### L12 — ARBiH was almost entirely defensive in 1992
**Session:** 2026-02-28 (user directive + OOB research)
87 ARBiH attack orders in 40 weeks is already too many. Historical: ARBiH had no
ammunition reserves, no heavy weapons, no logistics. Defending Sarajevo, Tuzla, Zenica,
Bihać. Any attack capability is emergent from 2nd Corps (Tuzla) only. Enclave brigades
(Srebrenica, Goražde, Žepa) had ZERO offensive capability.

### L13 — Homeland defense = last stand psychology even without encirclement
**Session:** 2026-02-28 (BB2 research)
BB2 p556: 5th Corps fighters fought "harder and more grimly" as pushed toward original positions.
BB2 p484: 7th Corps (Donji Vakuf displaced men) were "coldly determined to return to their homes."
Abdić insight (BB2 p538): kept civilians in Pecigrad because defenders lose willingness if
civilians evacuate — population proximity IS the willingness mechanic.
This pattern does NOT require complete encirclement to activate. Brigades fighting in their
home municipality or in an enclave fight with elevated determination organically.
**Engine implication:** `home_mun === defending_mun` is the data hook. No new fields needed.
The OOB already encodes home municipality. Use it as the determination trigger.

### L14 — Defender casualties are structurally too low
**Session:** 2026-02-28
n254: defender total ~3.1k for 40 weeks. Historical ARBiH KIA alone: ~11.5k by week 40.
Gap of ~10k. Root: defenders retreat when adjacent friendly exists (taking minimal casualties).
ARBiH historically did NOT retreat like conventional armies — they absorbed casualties.
Fix: Homeland determination mechanic must RAISE defender casualty rate in home/enclave
positions even when they succeed in holding. A stalemate in their home municipality should
bleed the defender at 0.8× rate (current) × 1.35 (homeland mult) = 1.08× — meaningful.

### L15 — Morale is separate from cohesion; population affinity drives retreat resistance
**Session:** 2026-02-28 (user directive)
Cohesion = tactical effectiveness (how organized/trained a unit is).
Morale = willingness to fight and resist (how much a unit WANTS to hold).
These are distinct. A badly organized militia defending its home village has LOW cohesion but HIGH morale.
A professional unit fighting for territory it doesn't care about has HIGH cohesion but LOW morale.
Currently the engine conflates both into cohesion. Morale needs to be a separate field.

**Population affinity as the data hook (NOT home_mun):**
The retreat/determination decision should be based on the 1991 CENSUS POPULATION of the OSID
being defended — not the brigade's home_mun (which is a coarser proxy).
- OSID with 80% Bosniak population → ARBiH defenders EXTREMELY reluctant to retreat
- OSID with 80% Serb population → ARBiH defenders more likely to yield (fighting for enemy land)
- OSID with mixed population → intermediate determination
This data already exists in the engine (1991 census drives displacement calculations).
Population affinity = fraction of OSID population sharing ethnicity with the defending faction.
**Effect:** High-affinity defense → morale bonus → retreat requires worse outcome → casualties absorbed instead of territory yielded.

### L16 — Both attacker and defender bleed more in homeland defense engagements
**Session:** 2026-02-28 (BB1/BB2 evidence)
BB1 p456: 40 attacker casualties to dislodge 120 mountain defenders. BB2 p405: 130 VRS
casualties in one Srebrenica action. The pattern: determined defense costs BOTH sides dearly.
The engine's lastStand mechanic (×2 casualties both sides) captures this at encirclement.
Homeland determination should extend this (×1.35 casualty mult) to home-municipality defense.
Net effect: more total casualties in contested areas, VRS bleed higher when hitting
determined ARBiH positions, ARBiH defender casualties rise toward historical.

### L17 — Command hierarchy is already correct — brigades don't freelance
**Session:** 2026-02-28 (BB research + engine research)
BB1 p417, BB2 p540: All VRS operations were corps-directed or Main Staff-coordinated.
BB2 p401, p506: ARBiH organized under Corps → Operational Groups → Brigades.
The engine's three-tier bot AI (Army → Corps → Brigade) matches history.
CorpsDirective generates offensive_targets; brigades execute from the list.
**Exception:** Enclave brigades (Srebrenica, Goražde) were de facto autonomous due to
isolation, but formally under 1st Corps / 28th Division / 81st Division.

### L18 — Rear-area cleanup was a distinct early-war phase for all sides
**Session:** 2026-02-28 (BB research)
VRS systematically secured Serb-majority areas by eliminating hostile populations (Prijedor,
Sanski Most, Kotor Varoš, Ključ, Zvornik). Used paramilitaries + police + regular forces.
Corps-directed, Main Staff-coordinated. (BB1 PATTERN_REPORT, BB1 pp496-501)
ARBiH also cleaned isolated settlements (Bilješevo, Čardak — user-confirmed, not in BB KB).
This is a phase-specific priority: weeks 0-10, corps directives should include "cleanup"
targets — undefended hostile-population OSIDs behind the front line.
**Data hook:** Population composition (1991 census). High hostile population + undefended =
high cleanup priority. Not faction-coded — emerges from population data.

### L19 — ZoC-locked frontlines need defense extension
**Session:** 2026-02-28 (engine research)
Current linked ZoC blocks enemy MOVEMENT but provides NO DEFENSE. An unoccupied OSID in a
ZoC chain has no defender if attacked — easy victory. Historically a brigade covers its
entire sector, not just the settlement it sits in. Patrols, outposts, firing positions span
the whole zone.
**Fix:** ZoC-locked brigades should defend adjacent OSIDs in their linked ZoC chain at 100%
readiness. When an attacker targets an empty ZoC'd OSID, the nearest locked brigade in the
chain provides the defense. This simulates continuous frontline defense.
**Implication:** Fewer "free" OSID captures. More combat, more casualties. Front stabilizes
faster. This is probably the single biggest behavior fix for realistic front lines.

### L20 — Cut-off brigades need breakthrough/escape mechanic
**Session:** 2026-02-28 (BB research)
Current engine: cut-off = last stand → win or die (personnel=0, inactive). No escape.
Historical: HVO brigades from Derventa/Modriča retreated to Orašje through hostile territory.
Orasje Corps originally had 6 brigades (101st-106th, BB1 p437-438). After "heavy combat
losses in 1992 and early 1993" they consolidated at Orašje (3,000 dead + 10,000 WIA total
war, BB1 p462).
**Fix:** Cut-off brigades should attempt breakthrough toward nearest friendly territory.
High-casualty movement through hostile OSIDs. Not guaranteed — may fail and be destroyed.
But better than instant annihilation.

### L21 — Player-proofing: model conditions, never assumptions
**Session:** 2026-02-28 (user directive)
"A real player will take a bot side at some point and we don't want HVO breaking from Livno
to Banja Luka just because RS bot 'knows' HRHB won't attack."
HRHB didn't attack RS because: (A) no offensive power — light infantry, no tanks, limited
artillery → low attack scores vs entrenched VRS. (B) no strategic incentive — war aims don't
include RS territory. Both must be modeled through CONDITIONS:
- (A) HVO equipment composition: historically accurate → material limit on offensive capability
- (B) HVO army priorities: no targets in RS territory → bot doesn't generate offensive orders
If a player takes HRHB: they ALSO can't attack RS because equipment composition makes it
impossible to overcome VRS entrenchment. Not because of a bot rule.
RS bot defensive posture should be based on threat assessment (power ratios, brigade counts),
not on faction-specific "HRHB won't attack" assumptions.

### L22 — Displacement system is complete and deterministic
**Session:** 2026-02-28 (research finding)
The engine has a full displacement system: 4-turn takeover timer + 4-turn camp maturation,
kill fractions by ethnicity (10% normal, 35% enclave overrun), flee-abroad fractions
(RS=30%, HRHB=25%, RBiH=0%, Posavina Croats=70%), and brigade-gated routing.
The n254 displacement numbers are not wrong — they reflect Phase II only.
Phase I (~1M+ historical) is captured in the init_control snapshot, not re-simulated.

### L23 — Orasje pocket: 3 HVO brigades stay, Derventa/Modrica brigades fall back
**Session:** 2026-03-01 (user directive)
3 HVO brigades currently under ARBiH 2nd Corps coordination are supposed to REMAIN in
the Orasje pocket throughout the war. These are the Posavina NW OZ garrison.
Separately, HVO brigades from Derventa, Modrica, and other Posavina municipalities that
RS captures in weeks 1–8 must fall back to Orasje (not be destroyed in place).
Historical: HVO Orasje Corps originally had 6 brigades (101st–106th, BB1 p437–438) —
the 3 garrison brigades plus retreating Derventa/Modrica units that consolidated there.
After heavy combat losses in 1992–early 1993, they consolidated at ~3,000 dead + 10,000
WIA total war (BB1 p462).
**Two fixes needed:**
1. **OOB:** Assign 3 brigades to `hvo_northwest_bosnia` (currently 0) with home_mun in
   Orasje area. These must NOT be reassignable.
2. **Breakthrough retreat:** When RS captures Derventa/Modrica, HVO brigades there must
   attempt high-casualty retreat toward Orasje instead of being destroyed.
   This is the primary historical test case for the N8 breakthrough mechanic.
**Do instead:** Fix the OOB (3 brigades at Orasje) FIRST — this alone may fix the
Orasje gap. Breakthrough retreat is the second layer for Derventa/Modrica fallback.

---

## Known Gaps (as of n268)

| # | Region | Gap (n268) | Root Cause | Fix | Priority |
|---|---|---|---|---|---|
| 1 | DRINA (68.8%) | RBiH holds 53 vs painted 29 — enclave brigades push +24 OSIDs outward | Morale 70 = MORALE_RESIST_FLOOR → enclaves never retreat on costly victories AND counterattack | Enclave morale 70→55 (below resist floor); also material deprivation (N1) | **CRITICAL** |
| 2 | CORRIDOR (78.7%) | RS holds 54 vs painted 38 — Tešanj/Maglaj/Zavidovići/Kakanj overrun | RS offensive w0-20 captures corridor; morale retreat resistance helps RS hold vs 3rd Corps counterattacks | RS attack share w0-20: 0.28→0.22; RBiH aggression w20-40: −0.05→+0.05; 3rd Corps weight 120→140 | **HIGH** |
| 3 | C. BOSNIA (80.1%) | RS holds 57 vs painted 42 — Bugojno (10 OSIDs) completely overrun | Bugojno defense wrongly assigned to 4th Corps (Mostar) instead of 3rd Corps (Zenica); 3rd Corps too weak vs VRS 2nd Krajina | Reassign Bugojno-Konjic Defense to `arbih_3rd_corps`; weight 60→90; remove Bugojno from VRS 2KK targets (ahistorical) | **HIGH** |
| 4 | POSAVINA (75.2%) | Orasje falls (HRHB 0 vs painted 2); Teocak/Brcko south wrong | `hvo_northwest_bosnia` has 0 brigades; Derventa/Modrica HVO don't retreat to Orasje (L23) | OOB: assign 3 brigades to Orasje; breakthrough retreat for Derventa/Modrica (N8) | **HIGH** (OOB) |
| 5 | VRS strength | 115k vs 100k target (+15k over) | FACTION_POOL_SCALE RS=0.28 still too high | RS pool scale 0.28→0.25 | **MEDIUM** |
| 6 | Military KIA | 6,082 total vs ~16,000 expected at w40 | 180/312 attacks (58%) undefended → near-zero casualties; defender casualties minimal (2,718 total) | ZoC frontline defense (N6) to reduce free captures; homeland determination (N0) to raise defender casualties | **MEDIUM** |
| 7 | Displacement | 61k resettled vs 1M+ historical | Phase II displacement requires settlement flips + 4-turn timer; no continuous drain from territorial control | Add continuous displacement: non-aligned population drains at X%/turn while hostile faction controls municipality | **MEDIUM** |
| 8 | Brigade concentration | 1KK: 35 brigades / 35 targets = 1.0 per target (no concentration) | Corps pass ALL army priority targets as directive targets; too many for available brigades | Cap directive targets to floor(brigades × 0.5); prioritize subset | **MEDIUM** |
| 9 | SARAJEVO (67.7%) | Wrong OSID distribution (count correct: RS 21, RBiH 10) | Front-line edge wobble: Trnovo/Ilidža swap | Positional — low leverage | LOW |
| 10 | Anchors | 10/14 pass (4 fail: Zvornik, Teocak, Orasje, Brcko south) | Enclave overexpansion (#1) + Posavina gaps (#4) | Fixes from #1 and #4 should resolve | LOW |

---

## Next Actions (Structural, Not Artificial)

**Rule:** Every fix must change material conditions, not impose behavioral blocks.

### N0 — Morale + Population Affinity [Gap 5 — Casualty Distribution] ← SUPERSEDED by Mechanic 1
**Full design:** `docs/30_planning/20260228_phase_ii_mechanics_design.md` §Mechanic 1

The original `home_mun` trigger has been replaced by population affinity from 1991 census data.
Morale is now a separate field from cohesion. Key changes from original N0:
- Trigger: census-based population affinity of OSID, not `home_mun`
- Morale gates retreat resistance (high-morale defenders absorb costly_victory without retreating)
- Encirclement of own-population defenders → morale SPIKE (not collapse)
- Morale drift system: +3/turn for high-affinity defense, −2/turn for low-affinity
- Both sides bleed more in high-affinity contests (1.2× defender, 1.8× attacker for absorbed costly_victory)
- Symmetric: works for all factions equally — VRS also fights hard for Serb-majority OSIDs

### N1 — Enclave Brigade Material Deprivation [Gap 1, 5]
Change enclave brigade OOB compositions in `data/source/oob_brigades.json`:
- Srebrenica brigades: `{infantry: 1000, tanks: 0, art: 0, aa: 0}`, condition: 0.4
- Goražde brigades: `{infantry: 1000, tanks: 0, art: 0, aa: 0}`, condition: 0.45
- Žepa brigades: `{infantry: 1000, tanks: 0, art: 0, aa: 0}`, condition: 0.35
And ensure these brigades are always marked CRITICAL supply in their municipality context.
Expected effect: attack scoring goes negative (-300 CRITICAL penalty) → no offensive orders

### N2 — RS-HRHB Co-Ethnic Penalty [Gap 3]
In `bot_brigade_ai_osid.ts`, add scoring penalty for RS attacking HRHB-controlled OSIDs:
- Outside Posavina corridor: -400 score ("VRS won't bleed for Croat land")
- Within Posavina (Orasje/Brcko area): -100 score (some RS-HVO conflict is historical)
Expected effect: RS redirects attacks to RS priority areas (Drina, Corridor)

### N3 — ARBiH 3rd Corps Corridor Weight [Gap 2]
In `bot_strategy.ts`, increase 3rd Corps "Central Corridor Counter" weight: 80 → 120
Consider also adding specific hold_osids for Tešanj, Maglaj, Zavidovići, Žepče in 3rd Corps directive.
Expected effect: RS pushed back to ~77% → 85%+ in Corridor region

### N4 — VRS Troop Count [Gap 4]
In `src/sim/phase_i/pool_population.ts`, lower `FACTION_POOL_SCALE` RS: 0.35 → 0.30
Expected result: VRS ~97–100k (currently 116k)

### N5 — Run n256 [Verification]
After implementing N1–N4:
- Drina should improve significantly (enclave brigades stop attacking)
- Central Corridor should improve (3rd Corps holds)
- HRHB territory should improve (RS-HRHB penalty redirects RS)
- VRS troop count should drop to target range
- RBiH attack orders should drop significantly (enclave brigades go quiet)
- Target: >85% overall match rate

### N6 — ZoC Frontline Defense Extension [Gap 6 — Free OSID Captures]
**Full design:** `docs/30_planning/20260228_phase_ii_mechanics_design.md` §Mechanic 2
ZoC-locked brigades defend adjacent empty OSIDs at 50% entrenchment, 50% casualty exposure.
Expected: free OSID captures drop from ~188 to <50; more actual combat required.

### N7 — Per-Municipality Displacement Routing [Displacement Correctness]
**Full design:** `docs/30_planning/20260228_phase_ii_mechanics_design.md` §Mechanic 8
Replaces generic `FALLBACK_ROUTES_BY_FACTION` with origin-specific routing tables for all
110 municipalities, 8 geographic regions, and 3 displaced ethnicities. Adds OSID-level tracking
of displacement origins and destinations. Design complete — ready for implementation.

### N8 — Cut-Off Brigade Breakthrough + Orasje OOB [HVO Posavina] ← SEE L23
**Full design:** `docs/30_planning/20260228_phase_ii_mechanics_design.md` §Mechanic 4
**Two-part fix (per L23):**
1. **OOB first:** Assign 3 HVO brigades to `hvo_northwest_bosnia` with home_mun in Orasje area.
   These are the garrison that STAYS. This alone may fix the Orasje gap (currently 0 brigades).
2. **Breakthrough retreat second:** HVO brigades from Derventa/Modriča attempt high-casualty
   retreat toward Orasje when RS captures those municipalities. Primary historical test case.
Historical: HVO 101st–106th Brigades (BB1 p437–438). Derventa/Modriča units fell back to
Orašje and consolidated there. 3 brigades under 2nd Corps coordination must stay at Orasje.

### N9 — Rear-Area Cleanup Priority [Early-War Territory]
**Full design:** `docs/30_planning/20260228_phase_ii_mechanics_design.md` §Mechanic 3
Census-driven corps directive priority for weeks 0-10: secure hostile-population OSIDs
behind front line. Player-proof (available to all factions equally).

### N10 — Phase Restructuring [Architecture]
Peace Phase → War Phase. No Phase 0/I/II distinction. When war starts, all mechanics active.
`init_control: "apr1992"` is turn 0 of War Phase. Displacement runs from turn 0.

### N11 — Deferred: 52w Validation
After 40w converges to >85%, run 52w to verify front freezes appropriately at w40–52.

---

## Post-n268 Iteration Plan (2026-03-01)

**Status of N0–N11 after Phase M:**
- N0 (Morale + population affinity): **DONE** (Phase M2). Morale field, drift, retreat resistance, ZoC virtual defense.
- N1 (Enclave material deprivation): **PARTIAL** (Phase M3). Enclave OOB infantry-only + morale 70, but morale 70 = resist floor → they NEVER retreat and counterattack. Needs morale 70→55.
- N3 (3rd Corps corridor weight): **DONE** (Phase M4). Weight 80→120. Still insufficient — RS overruns +16 in corridor.
- N4 (VRS troop count): **PARTIAL**. Pool scale lowered 0.35→0.28. Still 115k vs 100k target. Needs 0.28→0.25.
- N6 (ZoC frontline defense): **PARTIAL** (Phase M2). Virtual ZoC defense at 50% readiness. Still 180 free captures. Bigger structural issue: see P6 below.
- N7 (Per-municipality displacement routing): **DONE** (Phase M4). 47 sub-regions × 3 ethnicities.
- N8 (Orasje OOB + breakthrough): **NOT STARTED**. See L23.
- N9 (Rear-area cleanup): **DONE** (Phase M4). REAR_CLEANUP_END_WEEK = 12.
- N10 (Phase restructuring): **DONE**. Peace/War lifecycle migration complete. See Phase M refactor-pass report.

### Post-n268 Next Actions (Priority Order)

#### P1 — Continuous displacement under hostile control [Gap 7]
When faction X controls a municipality, non-X population should drain at a configurable
rate per turn (e.g. 5–10% of hostile population per week). This does NOT need settlement
flips — it models ongoing ethnic cleansing as a consequence of territorial control.
Current displacement requires a settlement flip + 4-turn timer. Hundreds of thousands of
Bosniaks in RS-controlled Banja Luka, Prijedor, Bijeljina, Zvornik are never displaced.
**Implementation:** New pipeline step in war turn: for each municipality, if controller ≠
population majority ethnicity, drain `HOSTILE_DRAIN_RATE × hostile_pop` per turn into
displacement routing. Use existing routing tables from Phase M4.

#### P2 — Enclave morale 70→55 [Gap 1 — CRITICAL, single biggest territory improvement]
Enclave brigade `initial_morale` in OOB: 70 → 55. Since `MORALE_RESIST_FLOOR = 70`,
this means enclave brigades at morale 55 WILL retreat on costly victories instead of
absorbing them. They stop counterattacking outward because morale < floor means retreat
resistance doesn't activate. Expected improvement: ~24 OSIDs in Drina alone.
**One-line OOB change** for 13 enclave brigades in `data/source/oob_brigades.json`.

#### P3 — Reduce corps target sprawl [Gap 8 — enables concentration]
Corps directives currently pass ALL army priority targets through as offensive_targets.
VRS 1st Krajina: 35 brigades / 35 targets = 1.0 brigades per target — no concentration
is physically possible. Pioneer + concentration mechanics are inert.
**Fix:** Cap directive `offensive_targets` to `floor(assigned_brigades × 0.5)`, selecting
the highest-priority subset. With 35 brigades → 17 targets → ~2 brigades per target.
Corps can rotate targets over time. This naturally creates the concentration the pioneer
mechanic needs to function.

#### P4 — Increase free-capture casualties [Gap 6 — KIA too low]
180 undefended captures generating 0 attacker KIA is unrealistic. RS blitzkrieg still
took casualties from civilian resistance, militia ambushes, booby traps, friendly fire.
**Fix:** Add `BASE_FREE_CAPTURE_CASUALTY_RATE` (e.g. 0.005 = 0.5% of attacker personnel)
applied to every undefended capture. For a 1,500-man brigade: ~8 casualties per free
capture. Over 180 captures: ~1,400 additional casualties. Small per-event, significant
in aggregate.

#### P5 — RS FACTION_POOL_SCALE 0.28→0.25 [Gap 5]
Brings VRS from 115k toward 100k target. Simple constant change in `pool_population.ts`.

#### P6 — Front segment assignment (replaces ZoC as defensive model) [Structural]
Current linked ZoC provides only 35% defense power to adjacent OSIDs. A brigade defending
OSID A provides 35% power to OSID B — better than nothing but doesn't model a continuous
front line. Attackers can snipe individual unoccupied OSIDs between brigades.

**Corps-level front assignment would:**
- Assign X brigades to cover a contiguous Y-OSID front segment
- Calculate defensive strength = f(brigades, terrain, front width)
- Force attackers to concentrate against the entire segment, not snipe individual OSIDs
- Naturally create "too few brigades to cover the front" pressure
- Make brigade-to-front-width ratio the key defensive metric

**This is the biggest structural lift** but addresses the root of multiple issues: free
captures, thin coverage, unrealistic defensive posture. Consider after P1–P5 are validated.

#### P7 — Orasje OOB + breakthrough retreat [Gap 4, L23]
Two-part fix per L23:
1. OOB: 3 HVO brigades at Orasje (immediate)
2. Breakthrough retreat for Derventa/Modrica HVO (mechanic)

### Verification Target
After P1–P5: expect 85–88% match rate. After P6–P7: expect 88–90%+.
