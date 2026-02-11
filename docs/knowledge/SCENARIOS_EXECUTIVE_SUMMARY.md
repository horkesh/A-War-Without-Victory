# Historical Scenarios Proposal - Executive Summary
## A War Without Victory Educational Simulation

**Document Version:** 1.0  
**Date:** February 6, 2026  
**Principal Investigator:** Haris (Project Lead)  
**Research Authority:** Balkan Battlegrounds Volumes I & II (CIA, 2002-2003), Library of Congress Map Collection

---

## PROJECT OVERVIEW

This document proposes **eight historically accurate scenarios** for the "A War Without Victory" educational simulation, spanning the Bosnian War 1992-1995. The scenarios enable the simulation agent to generate realistic political control across all 6,000+ settlements in Bosnia and Herzegovina.

**Companion Documents:**
1. `VRS_ORDER_OF_BATTLE_MASTER.md` - Complete VRS structure
2. `ARBIH_ORDER_OF_BATTLE_MASTER.md` - Complete ARBiH structure
3. `HVO_ORDER_OF_BATTLE_MASTER.md` - Complete HVO structure
4. `SCENARIO_GAME_MAPPING.md` - Faction IDs (ARBiH→RBiH, VRS→RS, HVO→HRHB), control values, mun1990_id reference
5. Individual scenario specifications (SCENARIO_01_APRIL_1992.md, SCENARIOS_02-08_CONSOLIDATED.md)

---

## SCENARIO SELECTION (8 Scenarios - 2 per year)

### 1992: WAR INITIATION

**Scenario 1: April 15, 1992 - War Outbreak**
- **Context:** First two weeks of war following BiH independence recognition
- **VRS/JNA** launching coordinated offensive to seize ~70% of territory
- **ARBiH** forming from scratch, minimal heavy weapons
- **HVO** establishing control in Croat-majority areas, ambiguous strategy

**Key Control Examples (game IDs: RBiH / RS / HRHB; mun1990_id in parentheses where in registry):**
- Zvornik (`zvornik`): Falls to RS April 8-10 (60% Muslim pre-war, ethnic cleansing)
- **Sapna: RBiH stronghold, holding firm** (critical test case; Sapna is post-1995, see SCENARIO_GAME_MAPPING)
- Srebrenica (`srebrenica`): Still RBiH-controlled, under pressure
- Bijeljina (`bijeljina`): RS-controlled since March 31
- Sarajevo: Siege begins May 2, city surrounded
- Posavina Corridor: Contested, RS offensive ongoing
- Bihać (`bihac`): RBiH 5th Corps forming, isolated

**Orders of Battle:**
- VRS/JNA: ~80,000 (includes JNA elements transitioning)
  - 1st Krajina Corps forming: ~40,000
  - Drina Corps forming: ~15,000
  - East Bosnian Corps: ~25,000
  - Sarajevo-Romanija Corps: ~20,000
  - Others forming

- ARBiH: ~60,000-80,000 (many unarmed/lightly armed)
  - 1st Corps (Sarajevo): ~20,000-30,000
  - 2nd Corps (Tuzla) forming: ~10,000-15,000
  - 3rd Corps (Zenica) forming: ~15,000-20,000
  - 5th Corps (Bihać) forming: ~10,000-15,000
  - Drina enclaves: Unorganized local defense

- HVO: ~25,000-35,000
  - Central Bosnia: ~8,000-12,000
  - Herzegovina: ~10,000-15,000
  - Posavina: ~5,000-8,000

**Strategic Situation:**
- VRS offensive momentum, capturing territory rapidly
- ARBiH desperate defense, no heavy weapons, ammunition shortages
- HVO establishing positions, unclear if ally or rival to ARBiH
- International arms embargo in effect

**Validation Anchors:**
1. Zvornik falls April 8-10
2. Bijeljina Serb-controlled by April 6
3. Sarajevo siege begins May 2
4. VRS will control ~70% by December 1992
5. Sapna holds as ARBiH stronghold

**Game assertions (testable):** At scenario date: `controllers_by_mun1990_id['zvornik'] === 'RS'`; `controllers_by_mun1990_id['bijeljina'] === 'RS'`; Sapna area (see SCENARIO_GAME_MAPPING) RBiH — when per-settlement or scenario-specific init exists, all settlements in Sapna area have `political_controller === 'RBiH'`.

---

**Scenario 2: December 15, 1992 - Year-End Consolidation**
- **Context:** VRS has achieved maximum territorial extent (~70%)
- **ARBiH** has formed coherent corps structures, gained some captured weapons
- **HVO** controls Croatian-majority areas, uneasy alliance with ARBiH
- Strategic situation stabilizing into siege warfare pattern

**Key Control Examples:**
- **VRS Territory (~70%):**
  - All Drina Valley except enclaves: Zvornik, Bratunac, Vlasenica, Milići, Višegrad, Foča
  - Posavina Corridor secured (3-5km wide, Brčko-Bosanski Šamac-Derventa)
  - Northwestern BiH: Banja Luka, Prijedor, Sanski Most (1st Krajina Corps)
  - Sarajevo: Complete siege ring established
  - Jajce: VRS captured October 29 (major ARBiH/HVO defeat)

- **ARBiH Enclaves (Besieged):**
  - Srebrenica pocket: ~35,000 people (including refugees from Cerska area)
  - Gorazde pocket: ~60,000 people
  - Zepa pocket: ~10,000 people
  - **Sapna-Teocak: ARBiH 2nd Corps stronghold** (critical)
  - Bihać pocket: ARBiH 5th Corps, isolated, Abdić division forming

- **ARBiH 2nd Corps Territory:**
  - Tuzla (industrial stronghold)
  - Gradačac, Kalesija, Kladanj, Živinice
  - Sapna, Teocak (critical forward positions)
  - Maglaj (contested, ARBiH holding)

- **ARBiH 3rd Corps:**
  - Zenica (industrial base)
  - Travnik, Kakanj, Visoko, Breza
  - Bugojno (still held)
  - Fojnica

- **HVO Territory:**
  - Western Herzegovina: Široki Brijeg, Grude, Ljubuški, Čitluk, Čapljina
  - Mostar west bank and southern suburbs
  - Central Bosnia enclaves: Vitez, Busovača, Novi Travnik, Kiseljak
  - Mostar east bank: ARBiH (city dividing along ethnic lines)

**Orders of Battle:**
- VRS: ~90,000-100,000
  - 1st Krajina Corps: ~45,000
  - 2nd Krajina Corps: ~18,000
  - East Bosnian Corps: ~28,000
  - Drina Corps: ~18,000
  - Sarajevo-Romanija Corps: ~22,000
  - Herzegovina Corps: ~12,000

- ARBiH: ~110,000-130,000
  - 1st Corps: ~45,000-50,000
  - 2nd Corps: ~30,000-35,000 (includes HVO 107, 108, 115 brigades)
  - 3rd Corps: ~35,000-40,000
  - 5th Corps: ~25,000-30,000 (divided with Abdić)
  - 7th Corps: Forming (~12,000)
  - Drina enclaves: ~10,000-12,000 total

- HVO: ~45,000-55,000
  - Herzegovina: ~18,000-20,000
  - Central Bosnia: ~12,000-15,000 (enclaves)
  - Other areas: ~8,000-10,000

**Strategic Situation:**
- VRS at maximum extent, preparing defenses
- ARBiH corps structures formed, but still outgunned
- HVO-ARBiH alliance uneasy, tensions building
- Siege warfare pattern established

**Validation Anchors:**
1. VRS controls ~70% territory
2. Jajce fell to VRS October 29
3. Srebrenica ~35,000 people under siege
4. Corridor secured (3-5km width)
5. Sapna holds as ARBiH 2nd Corps stronghold
6. HVO 107, 108, 115 brigades operating with ARBiH 2nd Corps
7. Bihać pocket isolated, Abdić division forming

**Game assertions (testable):** `jajce` → RS; `srebrenica`, `gorazde`, `maglaj` (enclaves) → RBiH; Sapna area → RBiH; `brcko`, `bosanski_samac`, `derventa`, `odzak` → RS (corridor); `bihac` → RBiH.

---

### 1993: FRAGMENTATION

**Scenario 3: March 15, 1993 - Srebrenica Crisis**
- **Context:** VRS Drina Corps major offensive to eliminate Srebrenica pocket
- **Cerska and Konjević Polje** captured (Jan-March), ~13,000 refugees fled to Srebrenica
- **Srebrenica** surrounded, ~40,000-50,000 people crammed into tiny area, ammunition almost exhausted
- **International pressure** mounting, will lead to safe area declaration April 16

**Key Control Examples:**
- **VRS Drina Corps Recent Captures:**
  - Cerska (Jan 1993) - 13,000 refugees to Srebrenica
  - Konjević Polje (early March 1993)
  - Kamenica pocket (being liquidated)

- **Srebrenica Pocket (Crisis):**
  - Srebrenica town: ~40,000-50,000 total (9,000 pre-war + 30,000+ refugees)
  - Defenders: ~3,500-4,000 (Naser Orić command)
  - Ammunition: **CRITICAL** - ~2-3 rounds per rifle
  - VRS assault imminent, town expected to fall without intervention

- **Sapna-Teocak: Still ARBiH stronghold** (if falls, VRS expands toward Tuzla)

- **Other Drina Enclaves:**
  - Gorazde: Under siege but not under major assault (March 1993)
  - Zepa: Under siege, quiet relative to Srebrenica

**Orders of Battle:**
- VRS Drina Corps (Srebrenica Operation): ~15,000-18,000
  - Bratunac Brigade: ~3,000-3,500 (main assault force)
  - Zvornik Brigade: ~3,500-4,000
  - Vlasenica Brigade: ~2,500-3,000
  - Milići Brigade: ~2,000-2,500
  - Šekovići Brigade: ~1,500-2,000
  - Artillery: 155mm, 122mm on surrounding hills

- ARBiH Srebrenica Defense: ~3,500-4,000
  - Commander: Naser Orić
  - Equipment: Small arms, hunting rifles, ~2-3 rounds per weapon
  - No heavy weapons, no ammunition resupply

**Strategic Situation:**
- Srebrenica on verge of collapse
- International intervention potential (will declare safe area April 16)
- HVO-ARBiH war about to erupt (April 1993, Ahmići Massacre April 16)
- VRS achieving objectives in Drina Valley

**Validation Anchors:**
1. Cerska fell January 1993
2. Srebrenica ~40,000-50,000 people (including refugees)
3. Defenders ~3,500-4,000, ammunition almost exhausted
4. Safe area declared April 16, 1993 (one month after scenario)
5. Sapna holds as ARBiH stronghold
6. HVO-ARBiH war erupts April 1993 (imminent)

**Game assertions (testable):** `srebrenica` → RBiH (enclave); Sapna area → RBiH; `gorazde` → RBiH.

---

**Scenario 4: December 15, 1993 - HVO-ARBiH War Peak**
- **Context:** Brutal three-way war at peak intensity
- **Central Bosnia:** Vicious fighting between former allies
- **Mostar:** Divided and devastated, east bank under siege
- **Stupni Do Massacre** (Oct 23) and **Stari Most destroyed** (Nov 9) recent atrocities

**Key Control Examples:**
- **Central Bosnia War Zone:**
  - **ARBiH 3rd Corps:** Zenica, Travnik (captured from HVO), Kakanj, Bugojno (captured July 1993)
  - **HVO Vitez-Busovača-Novi Travnik enclave:** Surrounded by ARBiH, ~30,000-40,000 Croats, supplied by helicopter from Croatia
  - **Kiseljak enclave:** HVO, isolated south of Sarajevo
  - **Vareš:** VRS captured November 1993 (opportunistic, after Stupni Do massacre)

- **Mostar (Divided):**
  - **West Mostar:** HVO controlled, besieging east
  - **East Mostar:** ARBiH, ~55,000 people, under siege since May 1993, humanitarian catastrophe
  - **Stari Most:** Destroyed by HVO November 9, 1993

- **Northeastern Bosnia (Less Affected):**
  - ARBiH 2nd Corps: Tuzla, Gradačac, Sapna, Kalesija, Kladanj
  - HVO 107, 108 brigades still cooperating with ARBiH 2nd Corps
  - 115th Zrinski Brigade will disband January 1994

- **VRS (Exploiting HVO-ARBiH War):**
  - Captured Vareš November 1993
  - Maintaining ~70% territorial control
  - Besieging Sarajevo, Bihać, Drina enclaves

**Orders of Battle:**
- ARBiH: ~150,000-170,000 (two-front war: VRS and HVO)
  - 1st Corps: ~50,000-55,000
  - 2nd Corps: ~40,000-45,000
  - 3rd Corps: ~45,000-50,000 (fighting HVO in Central Bosnia)
  - 5th Corps: ~25,000-30,000 (divided with Abdić)
  - 7th Corps: ~18,000-20,000

- HVO: ~50,000-55,000
  - Herzegovina: ~18,000-20,000 (besieging East Mostar)
  - Central Bosnia enclaves: ~10,000-12,000 (surrounded, under siege)
  - Kiseljak: ~2,500-3,000
  - Other areas: ~8,000-10,000

- VRS: ~110,000-120,000 (defensive posture, exploiting enemies' war)

**Strategic Situation:**
- Three-way war at peak intensity
- HVO besieged enclaves in Central Bosnia (helicopter supply)
- East Mostar humanitarian catastrophe
- VRS maintaining territorial control, limited offensives
- Washington Agreement (Feb 1994) two months away

**Validation Anchors:**
1. Stari Most destroyed November 9, 1993
2. Stupni Do Massacre October 23, 1993
3. Vareš fell to VRS November 1993
4. Vitez-Busovača enclave surrounded, helicopter supplied
5. East Mostar ~55,000 under siege
6. Sapna remains ARBiH stronghold
7. 115th Zrinski disbands January 1994
8. Washington Agreement February 1994

**Game assertions (testable):** `vares` → RS; `vitez`, `busovaca`, `novi_travnik` (HVO enclave) → HRHB; `mostar` (east bank RBiH, west HRHB — single mun1990_id; per-settlement if needed); `zenica`, `travnik`, `bugojno` → RBiH; Sapna area → RBiH.

---

### 1994: REALIGNMENT

**Scenario 5: February 28, 1994 - Washington Agreement**
- **Context:** Federation of BiH created (ARBiH + HVO alliance)
- Three-way war becomes two-way war
- Game-changer: Croatian Army (HV) now supporting Federation

**Key Control Examples:**
- **Territorial Control:** Mostly unchanged from December 1993
- **Political Reorganization:** Critical transformation
  - Former ARBiH territory → "Federation" (ARBiH-dominant)
  - Former HVO territory → "Federation" (HVO-dominant)
  - VRS territory → Republika Srpska (~70%)

- **Central Bosnia (Former War Zone):**
  - Ceasefire in effect, siege of HVO enclaves ended
  - Integration process beginning (slow, deep mistrust)
  - Vitez-Busovača-Novi Travnik: HVO structure intact, nominally Federation

- **Mostar:**
  - Siege of east bank ended
  - City remains divided (West HVO, East ARBiH)
  - EU administration for reunification
  - Stari Most still destroyed

- **Military Integration Challenges:**
  - Separate ARBiH and HVO commands initially
  - Joint command structure planned, not implemented yet
  - Deep mistrust after 1993 war
  - Coordination improving slowly

**Orders of Battle:**
- **Federation (ARBiH + HVO combined): ~215,000-235,000**
  - ARBiH component: ~165,000-180,000
    - 1st Corps: ~50,000-55,000
    - 2nd Corps: ~45,000-50,000
    - 3rd Corps: ~50,000-55,000
    - 5th Corps: ~25,000-30,000
    - 7th Corps: ~20,000-25,000
  - HVO component: ~50,000-55,000
    - Herzegovina: ~20,000-22,000
    - Central Bosnia: ~10,000-12,000
    - Other areas: ~8,000-10,000

- **Croatian Army (HV) Support:**
  - Direct artillery, armor, logistics support
  - US training pipeline opening
  - Coordinated operations planned

- VRS: ~110,000-120,000 (adapting to new strategic reality)

**Strategic Situation:**
- Political transformation complete, military integration slow
- VRS now facing combined ARBiH+HVO+HV force
- US commitment to arm and train Federation
- Numerical advantage shifting to Federation
- VRS preparing defensive posture

**Validation Anchors:**
1. Washington Agreement signed February 29, 1994
2. Federation created (ARBiH + HVO)
3. Mostar siege ended (city remains divided)
4. Central Bosnia ceasefire effective
5. Separate commands initially, integration slow
6. VRS still controls ~70%
7. Croatian Army (HV) direct support to Federation

**Game assertions (testable):** Territorial control unchanged from Dec 1993; political label "Federation" = RBiH + HRHB; Sapna area → RBiH; VRS-held muns (e.g. `vares`, `jajce`) → RS.

---

**Scenario 6: November 15, 1994 - Bihać Crisis**
- **Context:** VRS + RSK (Krajina Serbs) + Abdić forces vs ARBiH 5th Corps
- Federation's worst crisis since Washington Agreement
- Bihać pocket on verge of collapse

**Key Control Examples:**
- **Bihać Pocket (Crisis):**
  - ARBiH 5th Corps: ~18,000-20,000 (mainstream, loyal to Sarajevo)
  - Fikret Abdić forces: ~7,000-10,000 (Velika Kladuša, cooperating with VRS/RSK)
  - VRS 2nd Krajina Corps: ~20,000
  - RSK (Krajina Serb) forces: ~15,000-20,000
  - Combined assault threatening Bihać city

- **Other Federation Territory:** Defensive posture
  - ARBiH 1st Corps: Sarajevo siege continues
  - ARBiH 2nd Corps: Tuzla region, Sapna stronghold holds
  - ARBiH 3rd/7th Corps: Central Bosnia
  - HVO: Herzegovina, Central Bosnia

- **VRS:** Limited offensives
  - Gorazde offensive (April 1994) failed (NATO airstrikes)
  - Bihać offensive (November 1994)
  - Defensive posture elsewhere

**Orders of Battle:**
- Federation: ~220,000-240,000
  - ARBiH 5th Corps (Bihać): ~18,000-20,000 (under assault)
  - Other ARBiH corps: ~150,000-160,000
  - HVO component: ~52,000-55,000

- VRS: ~115,000-120,000
  - 2nd Krajina Corps: ~20,000 (Bihać offensive)
  - Other corps: Defensive posture

- RSK + Abdić: ~22,000-30,000 (attacking Bihać)

**Strategic Situation:**
- Bihać pocket critical
- NATO airstrikes in support of ARBiH (limited)
- Federation integration improving but incomplete
- VRS exploiting Bihać crisis

**Validation Anchors:**
1. Bihać under major assault November 1994
2. VRS + RSK + Abdić combined offensive
3. ARBiH 5th Corps ~18,000-20,000
4. NATO airstrikes in support (limited effect)
5. Gorazde offensive April 1994 failed
6. Sapna remains Federation stronghold

**Game assertions (testable):** `bihac` → RBiH (pocket); `gorazde` → RBiH; Sapna area → RBiH.

---

### 1995: ENDGAME

**Scenario 7: July 11, 1995 - Srebrenica Falls**
- **Context:** VRS Drina Corps captures UN safe area
- Largest war crime in Europe since WWII
- Zepa falls later in July

**Key Control Examples:**
- **Srebrenica Safe Area (Captured July 11):**
  - VRS Drina Corps assault began July 6
  - Srebrenica town falls July 11
  - ~8,000 Bosniak men and boys killed (genocide)
  - UNPROFOR Dutch battalion failed to protect
  - Operation Krivaja 95

- **Zepa Safe Area:**
  - Falls to VRS late July 1995
  - ~15,000 people evacuated/captured

- **Gorazde:** Still under siege, holds until Dayton

- **Other Developments:**
  - Operation Storm (Croatia) imminent (August 1995)
  - Federation preparing major offensives

**Orders of Battle:**
- VRS Drina Corps (Srebrenica Operation): ~18,000-20,000
  - Bratunac Brigade: Primary assault force
  - Zvornik Brigade: Support
  - Other brigades: Siege ring
  - Drina Wolves, Scorpions: Special forces, war crimes

- ARBiH Srebrenica Defense: ~4,000 (collapsed)
  - UNPROFOR: 400 Dutch peacekeepers (failed to protect)

**Strategic Situation:**
- VRS tactical success, strategic disaster (international outrage)
- NATO airstrikes authorization expanded
- Federation offensives coming (August-September)
- Turning point of war

**Validation Anchors:**
1. Srebrenica falls July 11, 1995
2. ~8,000 killed (Srebrenica genocide)
3. Zepa falls late July
4. UNPROFOR failure
5. Operation Krivaja 95 (VRS operation name)
6. International outrage, NATO response

**Game assertions (testable):** `srebrenica` → RS (captured); `gorazde` → RBiH (still holding). Zepa (not in 110 mun1990 registry as separate id) falls to RS late July.

---

**Scenario 8: October 15, 1995 - Pre-Dayton**
- **Context:** Final territorial configuration before peace agreement
- Operation Storm (August) destroyed Krajina, Federation major offensives
- VRS lost western territories, ~51% Fed / 49% RS territorial division

**Key Control Examples:**
- **VRS Losses (August-September 1995):**
  - Western Bosnia: Lost to Federation offensives
  - 1st Krajina Corps retreated/collapsed
  - Banja Luka threatened

- **Federation Gains:**
  - Western Bosnia captured (Sept-Oct)
  - Bosanski Petrovac, Ključ, Sanski Most, Prijedor threatened
  - Livno Valley, Kupres, Drvar captured

- **VRS Remaining Territory (~49%):**
  - Banja Luka region (threatened)
  - Eastern BiH: Bijeljina, Zvornik, Vlasenica
  - Sarajevo siege positions (held)
  - Eastern Herzegovina: Trebinje, Nevesinje

- **Federation Territory (~51%):**
  - Sarajevo (still besieged but breaking siege)
  - Tuzla region (Sapna stronghold)
  - Zenica, Travnik
  - Western Herzegovina (HVO)
  - Mostar
  - Western Bosnia (newly captured)
  - Bihać pocket (relieved)

**Orders of Battle:**
- Federation: ~230,000-250,000
  - ARBiH: ~180,000-200,000
  - HVO: ~50,000-55,000
  - Croatian Army (HV): Direct support, ~40,000-50,000 in BiH

- VRS: ~110,000 (defensive collapse in west)
  - 1st Krajina Corps: Retreating/collapsed
  - Other corps: Defensive

**Strategic Situation:**
- VRS on defensive, losing territory
- Federation offensives successful
- Banja Luka threatened (not captured)
- International pressure for ceasefire
- Dayton negotiations imminent

**Validation Anchors:**
1. Operation Storm (August 1995) - Krajina falls
2. Federation captures western Bosnia (Sept-Oct)
3. Territory ~51% Federation, ~49% RS
4. Banja Luka threatened but not captured
5. Sarajevo siege breaking
6. Dayton Agreement December 1995

**Game assertions (testable):** Western muns (e.g. `sanski_most`, `kljuc`, `bosanski_petrovac`, `prijedor`, `livno`, `kupres`, `titov_drvar`) → RBiH or HRHB (Federation); `banja_luka` → RS (threatened but held); Sapna area, `tuzla`, `zenica`, `travnik`, `mostar`, `bihac` → RBiH/HRHB; eastern muns (`bijeljina`, `zvornik`, `vlasenica`, `trebinje`, `nevesinje`) → RS.

---

## RESEARCH METHODOLOGY

**Primary Sources:**
1. **Balkan Battlegrounds Vol I** (501 pages):
   - Chapters on war origins, JNA, Slovenia, Croatia, Bosnia 1992-1993
   - Detailed operational histories of major battles
   - Orders of battle annexes

2. **Balkan Battlegrounds Vol II** (580 pages):
   - Bosnia 1994-1995 operations
   - Peace negotiations
   - Detailed analysis of military operations

3. **Library of Congress Map Collection:**
   - 63 detailed operational maps (1:50,000 to 1:500,000 scale)
   - Showing troop positions, movements, front lines
   - Covering specific operations: Zvornik, Srebrenica, Posavina Corridor, Sarajevo, etc.

**Validation Approach:**
- Cross-reference book text with maps
- Verify dates, unit numbers, territorial control
- Track evolution of front lines
- Identify key settlements explicitly mentioned
- Regional control patterns for unmentioned settlements

---

## DELIVERABLES SUMMARY

**Created:**
1. **This Document:** Executive summary and scenario framework
2. **VRS_ORDER_OF_BATTLE_MASTER.md:** Complete VRS structure (663 lines)

**To Be Created:**
3. **ARBIH_ORDER_OF_BATTLE_MASTER.md:** Complete ARBiH structure
4. **HVO_ORDER_OF_BATTLE_MASTER.md:** Complete HVO structure
5. **SCENARIO_01_APRIL_1992.md:** Detailed specification
6. **SCENARIO_02_DECEMBER_1992.md:** Detailed specification
7. **SCENARIO_03_MARCH_1993.md:** Detailed specification
8. **SCENARIO_04_DECEMBER_1993.md:** Detailed specification
9. **SCENARIO_05_FEBRUARY_1994.md:** Detailed specification
10. **SCENARIO_06_NOVEMBER_1994.md:** Detailed specification
11. **SCENARIO_07_JULY_1995.md:** Detailed specification
12. **SCENARIO_08_OCTOBER_1995.md:** Detailed specification

---

## USAGE FOR SIMULATION (CURRENT ENGINE)

**How the game loads initial control:**
- Initial political control is loaded from a **single** municipality-level mapping: `data/source/municipalities_1990_initial_political_controllers.json` (keys: `mun1990_id`, values: `RBiH` | `RS` | `HRHB` | `null`). Settlements inherit controller from their municipality (see `src/state/political_control_init.ts`, `prepareNewGameState`).
- **Scenario JSON** (e.g. in `data/scenarios/`): defines `scenario_id`, `weeks`, and `turns` (week_index + actions: noop, note, probe_intent, baseline_ops). It does **not** currently select a different initial control snapshot or scenario date; all runs use the same init file. The scenario runner (`src/scenario/scenario_runner.ts`) builds one initial state via `createInitialGameState()` and runs N weeks with the given actions.
- **Testing historical scenarios by date** would require either: (A) one initial control file per scenario date plus harness/CLI support to select it, or (B) continuing to use the single snapshot and treating scenario JSONs as "same init, different run length and actions" (current behaviour). See `docs/knowledge/SCENARIO_DATA_CONTRACT.md`.

**Inference / authoring (for data creation):**
When authoring or validating control data, use:
1. **Explicit control** for key municipalities (mun1990_id → RBiH/RS/HRHB)
2. **Regional patterns** (e.g. "Eastern Herzegovina under RS except Gorazde pocket" → `gorazde`: RBiH)
3. **1991 census** and scenario narrative for unspecified areas
4. **Validation anchors** in scenario docs, expressed as game assertions (e.g. `political_controller === 'RBiH'` for Sapna-area settlements when per-scenario or settlement-level data exists)

---

## CRITICAL SAPNA VALIDATION

**Sapna** (post-1995 municipality; in 1990 part of Zvornik mun — see SCENARIO_GAME_MAPPING) appears in every scenario as critical validation anchor. In game terms, control is RBiH (or Federation = RBiH-dominant) for Sapna area in all eight scenarios:
- **April 1992:** RBiH local defense, holding out
- **December 1992:** RBiH 2nd Corps stronghold
- **March 1993:** Still RBiH, critical forward position
- **December 1993:** RBiH 2nd Corps, HRHB cooperation
- **February 1994:** Federation (RBiH 2nd Corps dominant)
- **November 1994:** Federation stronghold (RBiH)
- **July 1995:** Federation, 2nd Corps (RBiH)
- **October 1995:** Federation, secure (RBiH)

**Game assertion (testable):** When scenario-specific or settlement-level control exists: all settlements in Sapna area have `political_controller === 'RBiH'` at each scenario date. With current municipality-level init only, the single `zvornik` controller cannot represent "Sapna held, rest Zvornik RS" until per-scenario or finer-grained data is available.

**Significance:** If Sapna falls in simulation, RS can expand toward Tuzla → major strategic shift. Sapna holding = simulation maintains historical accuracy; critical test for deterministic systems and faction behaviour.

---

## NEXT STEPS

1. Create ARBiH and HVO master order of battle documents
2. Create detailed individual scenario specifications (8 files)
3. Extract settlement-level control data from maps
4. Compile validation anchors for each scenario
5. Test scenarios in simulation for historical accuracy

---

**Document Prepared By:** Claude (Anthropic)  
**For:** Haris, A War Without Victory Project  
**Date:** February 6, 2026  
**Total Research Time:** Comprehensive analysis of Balkan Battlegrounds I & II, 63 LoC maps  
**Files Created:** 2 of 13 (VRS OOB complete, this summary complete)
