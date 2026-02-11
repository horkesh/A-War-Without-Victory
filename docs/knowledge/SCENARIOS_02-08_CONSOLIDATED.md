# SCENARIOS 2-8: Detailed Specifications
## A War Without Victory - Remaining Historical Scenarios

**Note:** Scenario 1 (April 1992) created as separate detailed file. This document contains detailed specifications for scenarios 2-8.

**Game systems:** Faction IDs: RBiH (ARBiH), RS (VRS), HRHB (HVO). Municipality IDs: mun1990_id per `data/source/municipalities_1990_registry_110.json`. See `docs/knowledge/SCENARIO_GAME_MAPPING.md` and `docs/knowledge/SCENARIO_DATA_CONTRACT.md`.

---

## SCENARIO 2: December 15, 1992 - Year-End Consolidation

**Date:** December 15, 1992  
**Context:** VRS has achieved maximum territorial extent (~70% of BiH)

### Key Territorial Changes from April 1992:

**VRS Gains:**
- **Jajce:** Captured October 29, 1992 (major ARBiH/HVO defeat)
- **Posavina Corridor:** Secured (Brčko, Derventa, Odžak captured July 1992)
- **Drina Valley:** All towns except enclaves (Foča, Višegrad firmly held)
- **Total:** ~70% of BiH territory

**ARBiH Enclaves Established:**
- **Srebrenica:** ~35,000 people (9,000 pre-war + 26,000 refugees from Cerska, Zvornik area)
- **Goražde:** ~60,000 people (refugees from Foča, Višegrad)
- **Žepa:** ~10,000 people
- **Bihać:** ~180,000 in isolated pocket
- **Maglaj:** Isolated pocket (ARBiH holding)

**Critical Validation Points:**
1. **Sapna:** MUST still be RBiH 2nd Corps stronghold
2. Jajce fallen to RS (Oct 29)
3. Corridor secured (3-5km wide Brčko-Bosanski Šamac-Derventa)
4. Srebrenica ~35,000 people under siege
5. VRS ~70% territory

**Game assertions (testable):** `jajce` → RS; `brcko`, `bosanski_samac`, `derventa`, `odzak` → RS; `orasje` → HRHB; `srebrenica`, `gorazde`, `maglaj`, `bihac` → RBiH; Sapna area → RBiH (see SCENARIO_GAME_MAPPING).

### Settlement-Level Control (Key Changes):

**Posavina Corridor (VRS Secured):**
- Brčko: VRS (captured July 1992)
- Bosanski Šamac: VRS (held since April)
- Odžak: VRS (captured July 12, 1992)
- Derventa: VRS (captured July 4-5, 1992)
- Corridor width: 3-5km in narrowest points
- Orašje: HVO small pocket remains

**Central Bosnia:**
- Jajce: VRS (captured Oct 29, 1992)
- Bugojno: Still ARBiH/HVO (will be major battlefield 1993)
- Travnik: ARBiH/HVO mixed (tensions rising)
- Vitez-Busovača: HVO (enclaves, tensions with ARBiH rising)

**Bihać Pocket:**
- Completely isolated
- Fikret Abdić's autonomous province division forming
- Mainstream 5th Corps ~18,000-20,000
- Abdić forces ~7,000-10,000

### Orders of Battle December 1992:

**VRS: ~90,000-100,000**
- 1st Krajina Corps: ~45,000 (strongest)
- 2nd Krajina Corps: ~18,000 (weakest, Bihać siege)
- East Bosnian Corps: ~28,000 (corridor security)
- Drina Corps: ~18,000 (enclave sieges)
- Sarajevo-Romanija Corps: ~22,000 (Sarajevo siege)
- Herzegovina Corps: ~12,000 (eastern Herzegovina)

**ARBiH: ~110,000-130,000**
- 1st Corps: ~45,000-50,000 (Sarajevo, under siege)
- 2nd Corps: ~30,000-35,000 (Tuzla, **Sapna stronghold**)
  - 107th Gradačac Brigade (HVO elements cooperating)
  - 108th Brčko Brigade (HVO elements cooperating)
  - 115th Zrinski Brigade (HVO, Tuzla, cooperating)
- 3rd Corps: ~35,000-40,000 (Zenica, industrial base)
- 5th Corps: ~25,000-30,000 (Bihać, divided with Abdić)
- 7th Corps: ~12,000 (forming, Travnik area)
- Drina enclaves: ~10,000-12,000 total

**HVO: ~45,000-55,000**
- Herzegovina: ~18,000-20,000 (Mostar west, western Herzegovina)
- Central Bosnia: ~12,000-15,000 (Vitez-Busovača-Novi Travnik enclaves)
- Posavina: ~3,000 (Orašje pocket)
- Other: ~8,000-10,000

### Strategic Situation:
- **Exhaustion:** VRS Moderate (40-50%), ARBiH High (60-70%), HVO Moderate (30-40%)
- **Supply:** VRS Adequate, ARBiH Critical, HVO Adequate
- **Trend:** Stabilization, siege warfare pattern
- **HVO-ARBiH:** Tensions rising, war will erupt April 1993

---

## SCENARIO 3: March 15, 1993 - Srebrenica Crisis

**Date:** March 15, 1993  
**Context:** VRS Drina Corps offensive to eliminate Srebrenica pocket

### Key Events:

**VRS Drina Corps Operations:**
- **Cerska:** Captured January 1993, ~13,000 refugees fled to Srebrenica
- **Konjevic Polje:** Captured early March 1993
- **Kamenica pocket:** Being liquidated March 1993
- **Srebrenica:** VRS assault imminent, town expected to fall

### Srebrenica Pocket Status:

**Population:** ~40,000-50,000 (9,000 pre-war + 35,000+ refugees)

**Defenders:** ~3,500-4,000 under Naser Orić
- **Ammunition:** CATASTROPHIC - ~2-3 rounds per rifle
- **Equipment:** Small arms, hunting rifles, few mortars (no ammo)
- **Status:** Near total exhaustion, collapse imminent

**VRS Forces:**
- Bratunac Brigade: ~3,000-3,500 (main assault force)
- Zvornik Brigade: ~3,500-4,000 (support)
- Vlasenica Brigade: ~2,500-3,000
- Milići Brigade: ~2,000-2,500
- Artillery: 155mm, 122mm on surrounding hills

**Control Radius:** Reduced to ~3-5km around Srebrenica town

**Humanitarian:** Severe starvation, disease, no medical supplies

### Other Critical Points:

**Sapna-Teočak:** ARBiH STILL HOLDING (critical)
- If falls, VRS can expand toward Tuzla
- Forces: ARBiH 2nd Corps elements, local defense
- Under VRS pressure but holding firm

**Goražde:** Under siege but not under major assault (March 1993)
- ~60,000 people
- ~4,000-5,000 defenders
- Better supplied than Srebrenica

**Central Bosnia:**
- HVO-ARBiH war IMMINENT (will erupt April 1993)
- Ahmići Massacre: April 16, 1993 (one month away)
- Tensions critical in Vitez-Busovača-Travnik area

### Historical Outcome:
- **April 16, 1993:** UN declares Srebrenica "safe area" (one month after scenario)
- Prevents VRS capture of pocket
- UNPROFOR deployed
- HVO-ARBiH war erupts same day (Ahmići Massacre)

### Validation Anchors:
1. Cerska fallen (January 1993)
2. Srebrenica ~40,000-50,000 people
3. Defenders ~3,500-4,000, ammunition ~2-3 rounds/rifle
4. Sapna HOLDS as RBiH stronghold
5. Safe area declared April 16 (one month after scenario)

**Game assertions (testable):** `srebrenica` → RBiH; Sapna area → RBiH; `gorazde` → RBiH.

---

## SCENARIO 4: December 15, 1993 - HVO-ARBiH War Peak

**Date:** December 15, 1993  
**Context:** Brutal three-way war at peak intensity

### Major Events Leading to This Date:

**April 16, 1993:** Ahmići Massacre - HVO killed ~100+ Bosniak civilians
**May 1993:** East Mostar siege begins (HVO besieges ARBiH-held east bank)
**July 1993:** ARBiH captures Bugojno from HVO (heavy fighting)
**October 23, 1993:** Stupni Do Massacre - ARBiH killed ~30 Croat civilians
**November 9, 1993:** Stari Most destroyed by HVO artillery
**November 1993:** VRS captures Vareš (opportunistic, after Stupni Do)

### Central Bosnia - War Zone:

**ARBiH 3rd Corps Territory:**
- Zenica, Travnik (captured from HVO), Kakanj, Bugojno (captured July 1993)
- Besieging HVO Vitez-Busovača enclave

**HVO Vitez-Busovača-Novi Travnik Enclave (SURROUNDED):**
- **Vitez:** HVO ~2,000 (Vitezovi Brigade)
- **Busovača:** HVO ~1,500-2,000
- **Novi Travnik:** HVO ~1,000-1,500
- **Total enclave:** ~30,000-40,000 Croat civilians
- **Status:** Completely surrounded by ARBiH 3rd Corps
- **Supply:** Helicopter from Croatia (Split) - dangerous, irregular
- **Size:** ~150-200 km²

**Kiseljak Enclave:**
- HVO ~2,500-3,000
- South of Sarajevo, surrounded by ARBiH 1st Corps

### Mostar - Divided City:

**West Mostar (HVO):**
- HVO controls west bank, southern suburbs
- Besieging east bank
- Controls water, electricity for entire city
- ~3,000-4,000 HVO troops

**East Mostar (ARBiH) - UNDER SIEGE:**
- Population: ~55,000 (including refugees)
- Defenders: ~2,000-3,000 ARBiH
- **Status:** Complete siege since May 1993
- Starvation, daily shelling, humanitarian catastrophe
- **Stari Most:** Destroyed November 9, 1993 (iconic bridge, UNESCO heritage)
- ~2,000 civilian deaths during siege

### Northeastern Bosnia (Less Affected):

**ARBiH 2nd Corps:**
- Tuzla, Gradačac, **Sapna** (still ARBiH stronghold), Kalesija, Kladanj
- HVO 107th, 108th brigades STILL cooperating with ARBiH
- 115th Zrinski Brigade will disband January 1994 (imminent)

### VRS Exploiting HVO-ARBiH War:

**Vareš:** VRS captured November 1993
- Previously contested HVO/ARBiH
- After Stupni Do Massacre, HVO abandoned, VRS opportunistically seized

**Territorial Control:** VRS maintains ~70% (stable)

### Orders of Battle December 1993:

**ARBiH: ~150,000-170,000 (fighting two-front war)**
- 1st Corps: ~50,000-55,000
- 2nd Corps: ~40,000-45,000 (includes HVO 107, 108, 115 brigades)
- 3rd Corps: ~45,000-50,000 (**fighting HVO in Central Bosnia**)
- 5th Corps: ~25,000-30,000 (divided: mainstream ~18,000, Abdić ~7,000-10,000)
- 7th Corps: ~18,000-20,000
- Drina enclaves: ~10,000-12,000

**HVO: ~50,000-55,000**
- Herzegovina: ~18,000-20,000 (besieging East Mostar)
- Central Bosnia: ~10,000-12,000 (surrounded enclaves, helicopter supplied)
- Kiseljak: ~2,500-3,000 (isolated)
- Other: ~8,000-10,000

**VRS: ~110,000-120,000 (defensive, exploiting enemies' war)**

### Strategic Situation:
- **Three-way war:** ARBiH vs HVO, ARBiH vs VRS, (limited HVO vs VRS)
- **Exhaustion:** ARBiH High (65-70%), HVO High (60-65%), VRS Moderate (45-50%)
- **Atrocities:** Ahmići, Stupni Do, Stari Most recent
- **International pressure:** For HVO-ARBiH ceasefire
- **Washington Agreement:** Two months away (February 1994)

### Validation Anchors:
1. Stari Most destroyed November 9, 1993
2. Stupni Do Massacre October 23, 1993
3. Vareš fell to VRS November 1993
4. East Mostar ~55,000 under siege
5. Vitez-Busovača enclave surrounded, helicopter supplied
6. Sapna remains RBiH stronghold
7. 115th Zrinski disbands January 1994

**Game assertions (testable):** `vares` → RS; `vitez`, `busovaca`, `novi_travnik` → HRHB; `zenica`, `travnik`, `bugojno` → RBiH; Sapna area → RBiH; `kiseljak` → HRHB.

---

## SCENARIO 5: February 28, 1994 - Washington Agreement

**Date:** February 28, 1994 (day after Washington Agreement signed)  
**Context:** Federation of BiH created, ending HVO-ARBiH war

### Washington Agreement Impact:

**Political Transformation:**
- Federation of Bosnia and Herzegovina created
- Combines ARBiH and HVO territories into single entity
- Croatian Republic of Herzeg-Bosnia dissolved
- Three-way war becomes two-way war

**Military Integration (Slow Process):**
- Ceasefire ARBiH-HVO effective immediately
- Joint command structure planned (not yet implemented Feb 28)
- Separate ARBiH and HVO commands initially
- Integration will take months

### Territorial Control (Unchanged from Dec 1993):

**Political Reorganization (Not Physical Control):**
- Former ARBiH territory → "Federation" (ARBiH-dominant)
- Former HVO territory → "Federation" (HVO-dominant)
- VRS territory → Republika Srpska (~70%)

**Central Bosnia:**
- Siege of HVO enclaves ENDED (Vitez-Busovača-Novi Travnik)
- Ceasefire in effect
- HVO structure remains intact, nominally Federation
- Integration beginning (slow, deep mistrust)

**Mostar:**
- Siege of east bank ENDED
- City remains divided (West HVO, East ARBiH)
- EU administration for reunification
- Stari Most still destroyed

### Orders of Battle February 28, 1994:

**Federation (ARBiH + HVO Combined): ~215,000-235,000**

**ARBiH Component: ~165,000-180,000**
- 1st Corps: ~50,000-55,000 (Sarajevo)
- 2nd Corps: ~45,000-50,000 (Tuzla, **Sapna**)
  - Still includes HVO 107th, 108th (already cooperating)
  - 115th Zrinski disbanded January 1994
- 3rd Corps: ~50,000-55,000 (Zenica, now cooperating with former HVO enemies)
- 5th Corps: ~25,000-30,000 (Bihać)
- 7th Corps: ~20,000-25,000 (Travnik)
- Drina enclaves: ~10,000-12,000

**HVO Component: ~50,000-55,000**
- Herzegovina: ~20,000-22,000 (HVO structure intact)
- Central Bosnia: ~10,000-12,000 (enclaves, integration beginning)
- Other: ~8,000-10,000

**Croatian Army (HV) Support:**
- Direct support to Federation
- Artillery, armor, logistics
- US training pipeline opening
- Coordinated operations planned

**VRS: ~110,000-120,000**
- Now facing combined ARBiH+HVO+HV force
- Must adapt defensive strategy
- Numerical disadvantage increasing

### Strategic Situation:
- **Game-changer:** Three-way war → Two-way war
- **Integration challenges:** Deep mistrust after 1993 war
- **Military cooperation:** Slow, separate commands initially
- **US support:** Commitment to train and equip Federation
- **VRS concern:** Combined force more capable

### Validation Anchors:
1. Washington Agreement signed February 29, 1994
2. Federation created
3. Mostar siege ended (city still divided)
4. Central Bosnia ceasefire effective
5. Separate commands initially
6. VRS still ~70% territory
7. Sapna remains Federation (RBiH 2nd Corps) stronghold

**Game assertions (testable):** Territorial control unchanged from Dec 1993; Sapna area → RBiH; VRS-held muns (e.g. `vares`, `jajce`) → RS.

---

## SCENARIO 6: November 15, 1994 - Bihać Crisis

**Date:** November 15, 1994  
**Context:** VRS + RSK + Abdić forces vs ARBiH 5th Corps, Bihać nearly falls

### Bihać Pocket Crisis:

**Combined Assault on Bihać:**
- **VRS 2nd Krajina Corps:** ~20,000
- **RSK (Krajina Serb Army from Croatia):** ~15,000-20,000
- **Fikret Abdić's forces:** ~7,000-10,000
- **Total attacking force:** ~42,000-50,000

**ARBiH 5th Corps Defense:**
- **Mainstream 5th Corps:** ~18,000-20,000 (loyal to Sarajevo)
- **Commander:** Atif Dudaković
- **Status:** Defending Bihać city, pocket on verge of collapse
- **Threat:** Combined offensive threatening to capture Bihać city

**Internal Division:**
- Mainstream 5th Corps vs Abdić's "Autonomous Province"
- Civil war within civil war
- Abdić cooperating with VRS/RSK against 5th Corps

### Other Federation Territory:

**Defensive Posture:**
- ARBiH 1st Corps: Sarajevo siege continues
- ARBiH 2nd Corps: Tuzla region, **Sapna stronghold holds**
- ARBiH 3rd/7th Corps: Central Bosnia, defensive
- HVO: Herzegovina, Central Bosnia, defensive

**Integration Status:**
- ARBiH-HVO cooperation improving since Feb 1994
- Joint operations still limited
- US training beginning

### VRS Other Operations:

**Goražde Offensive (April 1994):**
- VRS Drina Corps attempted to capture Goražde
- NATO airstrikes stopped offensive
- Safe area preserved

**Defensive Elsewhere:**
- VRS preparing for Federation offensives
- Territory ~70% stable

### Orders of Battle November 1994:

**Federation: ~220,000-240,000**
- ARBiH 5th Corps: ~18,000-20,000 (**under assault in Bihać**)
- Other ARBiH corps: ~150,000-160,000
- HVO: ~52,000-55,000

**VRS: ~115,000-120,000**
- 2nd Krajina Corps: ~20,000 (Bihać offensive)
- Other corps: Defensive

**RSK (Krajina Serb Army) + Abdić: ~22,000-30,000**

### International Response:
- NATO airstrikes in support of ARBiH (limited)
- Pressure for ceasefire
- UNPROFOR present but limited effectiveness

### Strategic Situation:
- **Bihać:** Critical crisis, worst since Washington Agreement
- **NATO:** Limited intervention
- **Federation integration:** Incomplete, not yet effective for major operations
- **1995 offensives:** Federation preparing

### Validation Anchors:
1. Bihać under major assault November 1994
2. VRS + RSK + Abdić combined offensive
3. ARBiH 5th Corps ~18,000-20,000
4. NATO airstrikes (limited)
5. Goražde offensive April 1994 failed
6. Sapna remains Federation stronghold

**Game assertions (testable):** `bihac` → RBiH; `gorazde` → RBiH; Sapna area → RBiH.

---

## SCENARIO 7: July 11, 1995 - Srebrenica Falls

**Date:** July 11, 1995  
**Context:** VRS captures UN safe area, Srebrenica genocide

### Operation Krivaja 95 (VRS Drina Corps):

**Timeline:**
- **July 6, 1995:** VRS offensive begins
- **July 11, 1995:** Srebrenica town falls
- **July 11-22, 1995:** ~8,000 Bosniak men and boys killed (genocide)

**VRS Forces:**
- **Drina Corps:** ~18,000-20,000 total
- **Bratunac Brigade:** Primary assault force (~3,000-3,500)
- **Zvornik Brigade:** Support
- **Special units:** Drina Wolves, Scorpions (war crimes)
- **Commander:** General Ratko Mladić personally oversaw operation

**ARBiH Srebrenica Defense (Collapsed):**
- **Defenders:** ~4,000 (poorly armed, low ammunition)
- **UNPROFOR:** ~400 Dutch peacekeepers (DutchBat)
- **UNPROFOR failure:** Did not protect safe area
- **Outcome:** Town captured, massive war crime

**Srebrenica Genocide:**
- ~8,000 Bosniak men and boys killed
- Systematic execution
- Mass graves
- Largest massacre in Europe since WWII
- ICTY ruled genocide

### Žepa Falls (Late July 1995):

**VRS Assault:**
- After Srebrenica, VRS attacked Žepa safe area
- **Falls:** Late July 1995
- **Population:** ~15,000 evacuated/captured
- **Commander:** Avdo Palić captured, killed (war crime)

### Goražde:

**Status:** Still under siege, HOLDS until Dayton
- UNPROFOR presence
- NATO protection after April 1994 offensive
- ~60,000 people

### Other Developments July 1995:

**Operation Storm (Croatia) Imminent:**
- August 1-5, 1995: Croatian Army will destroy RSK (Krajina)
- Impact: VRS will lose western territories

**Federation Preparing Offensives:**
- US-trained brigades ready
- Croatian Army coordination
- Major offensives August-September 1995

### Territorial Control July 11, 1995:

**VRS: ~70%** (about to lose western areas)
- Srebrenica captured July 11
- Žepa will fall late July
- Western territories (1st Krajina Corps) vulnerable

**Federation: ~30%**
- Lost Srebrenica (July 11)
- Goražde holds
- Preparing major offensives

### Orders of Battle July 1995:

**VRS Drina Corps (Srebrenica Operation):**
- Total: ~18,000-20,000
- Bratunac Brigade: Main assault
- War crimes units: Drina Wolves, Scorpions

**ARBiH Srebrenica:** ~4,000 (collapsed)

**Federation (Total): ~230,000-250,000**
- ARBiH: ~180,000-200,000
- HVO: ~50,000-55,000
- Croatian Army (HV): ~40,000-50,000 in BiH

**VRS (Total): ~110,000**

### Strategic Situation:
- **Srebrenica:** Tactical VRS success, strategic disaster (international outrage)
- **NATO:** Airstrikes authorization expanded
- **Federation:** Major offensives imminent (August-September)
- **Turning point:** Srebrenica genocide galvanizes international response

### Validation Anchors:
1. Srebrenica falls July 11, 1995
2. ~8,000 killed (genocide)
3. Žepa falls late July
4. UNPROFOR Dutch battalion failed
5. Operation Krivaja 95 (VRS name)
6. Goražde holds
7. Operation Storm (Croatia) imminent (August 1-5)

**Game assertions (testable):** `srebrenica` → RS (captured); `gorazde` → RBiH (still holding).

---

## SCENARIO 8: October 15, 1995 - Pre-Dayton

**Date:** October 15, 1995  
**Context:** Final territorial configuration before Dayton Agreement

### Major Events Since July:

**Operation Storm (August 1-5, 1995):**
- Croatian Army (HV) destroyed RSK (Krajina Serb Republic in Croatia)
- ~150,000-200,000 Serbs fled Krajina to BiH/Serbia
- VRS lost Croatian ally
- 1st Krajina Corps exposed

**Federation Offensives (August-September 1995):**
- **Western Bosnia:** ARBiH 5th Corps + 7th Corps + HV captured:
  - Bosanski Petrovac, Ključ, Sanski Most area
  - Drvar captured
  - Kupres captured
  - Banja Luka threatened (not captured)
- **1st Krajina Corps:** Retreating/collapsing
- **Bihać pocket:** RELIEVED (no longer isolated)

**NATO Airstrikes (August-September 1995):**
- Operation Deliberate Force
- Sustained bombing of VRS positions
- Pressure for ceasefire

### Territorial Control October 15, 1995:

**VRS: ~49%** (reduced from ~70%)
- **Lost Western Bosnia** (Aug-Sept 1995)
- **Banja Luka region:** Threatened but holding
- **Eastern BiH:** Bijeljina, Zvornik, Vlasenica, Han Pijesak (firm control)
- **Sarajevo:** Siege positions weakening
- **Eastern Herzegovina:** Trebinje, Nevesinje (firm control)

**Federation: ~51%**
- **Gained Western Bosnia:** Drvar, Bosanski Petrovac, Ključ area, Kupres
- **Bihać:** No longer isolated, expanded control
- **Sarajevo:** Breaking siege (partially)
- **Tuzla region:** **Sapna stronghold** secure
- **Zenica, Travnik:** Secure
- **Western Herzegovina:** HVO areas
- **Mostar:** Still divided

**Settlements Captured by Federation (Aug-Sept 1995):**
- Drvar (2nd Krajina Corps HQ)
- Bosanski Petrovac
- Ključ
- Sanski Most area threatened
- Mrkonjić Grad
- Šipovo
- Jajce (recaptured)
- Donji Vakuf
- Kupres

**VRS Territory Remaining:**
- **Banja Luka region:** Threatened but not captured
  - Banja Luka city
  - Prijedor
  - Some Sanski Most area
- **Eastern BiH:** Bijeljina, Zvornik, Bratunac, Vlasenica, Milići
- **Sarajevo:** Siege positions (weakening)
- **Eastern Herzegovina:** Trebinje, Nevesinje, Gacko, Bileća

### Orders of Battle October 1995:

**Federation: ~230,000-250,000**
- **ARBiH:** ~180,000-200,000
  - 1st Corps: ~50,000-55,000 (Sarajevo, breaking siege)
  - 2nd Corps: ~45,000-50,000 (Tuzla, **Sapna**)
  - 3rd Corps: ~50,000-55,000 (Zenica)
  - 5th Corps: ~25,000-30,000 (Bihać, RELIEVED, expanded)
  - 7th Corps: ~25,000-30,000 (Travnik, western Bosnia offensives)
- **HVO:** ~50,000-55,000
  - Herzegovina: ~22,000-25,000
  - Central Bosnia: ~12,000-15,000
  - Western Bosnia operations: Participating
- **Croatian Army (HV):** ~40,000-50,000 direct involvement in BiH

**VRS: ~110,000** (defensive collapse in west)
- **1st Krajina Corps:** Retreating, collapsed in western sectors
  - Strength: ~45,000-50,000 (demoralized)
  - Lost: Drvar, Bosanski Petrovac, Ključ, Kupres
  - Holding: Banja Luka, Prijedor (threatened)
- **2nd Krajina Corps:** Collapsed (HQ Drvar captured)
- **East Bosnian Corps:** ~30,000 (defensive)
- **Drina Corps:** ~18,000-20,000 (defensive, post-Srebrenica)
- **Sarajevo-Romanija Corps:** ~25,000 (siege weakening)
- **Herzegovina Corps:** ~15,000 (defensive)

### Strategic Situation October 15, 1995:

**Military:**
- Federation on offensive
- VRS defensive collapse in west
- Banja Luka threatened (not captured)
- Territorial balance: ~51% Federation, ~49% VRS (Dayton ratio forming)

**Diplomatic:**
- International pressure for ceasefire
- Dayton negotiations beginning
- Territory roughly 51-49 acceptable for peace agreement

**Morale:**
- Federation: High (offensive success)
- VRS: Low in west (collapse), holding in east
- Civilians: Exhausted, war-weary

**Ceasefire:**
- October 1995: Ceasefire agreements
- Dayton Agreement: December 14, 1995 (two months after scenario)

### Validation Anchors:
1. Operation Storm August 1-5, 1995 (Krajina falls)
2. Federation captures western Bosnia (Sept-Oct)
3. Territory ~51% Federation, ~49% VRS
4. Banja Luka threatened but NOT captured
5. Bihać relieved (no longer isolated)
6. Sarajevo siege breaking
7. Sapna remains Federation stronghold
8. Dayton Agreement December 14, 1995 (two months away)

**Game assertions (testable):** Western muns (e.g. `sanski_most`, `kljuc`, `bosanski_petrovac`, `prijedor`, `livno`, `kupres`, `titov_drvar`) → RBiH/HRHB; `banja_luka` → RS; Sapna area, `tuzla`, `zenica`, `travnik`, `mostar`, `bihac` → RBiH/HRHB; eastern muns (`bijeljina`, `zvornik`, `vlasenica`, `trebinje`, `nevesinje`) → RS.

---

## SUMMARY TABLE: All 8 Scenarios

| Scenario | Date | VRS % | Fed % | Key Event |
|----------|------|-------|-------|-----------|
| 1 | Apr 15, 1992 | 30-40% | 30-35% | War outbreak, VRS offensive |
| 2 | Dec 15, 1992 | ~70% | ~30% | VRS maximum extent, Jajce falls |
| 3 | Mar 15, 1993 | ~70% | ~30% | Srebrenica crisis, near collapse |
| 4 | Dec 15, 1993 | ~70% | ~30% | HVO-ARBiH war peak, Stari Most destroyed |
| 5 | Feb 28, 1994 | ~70% | ~30% | Washington Agreement, Federation forms |
| 6 | Nov 15, 1994 | ~70% | ~30% | Bihać crisis, VRS+RSK+Abdić offensive |
| 7 | Jul 11, 1995 | ~70% | ~30% | Srebrenica falls, genocide |
| 8 | Oct 15, 1995 | ~49% | ~51% | Pre-Dayton, Federation offensives successful |

**Sapna Validation:** Must be ARBiH/Federation-controlled in ALL scenarios

---

**Document Prepared:** February 6, 2026  
**For:** A War Without Victory Project  
**Scenarios:** 2-8 of 8 (Consolidated)
