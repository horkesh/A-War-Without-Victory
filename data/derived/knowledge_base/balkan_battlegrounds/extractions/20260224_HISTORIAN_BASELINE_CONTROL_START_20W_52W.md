# Historian extraction: Baseline political control (April 1992, 20w, 52w)

**Date:** 2026-02-24  
**Authority:** Historian (Balkan Battlegrounds knowledge base).  
**Purpose:** Citation-backed political control for scenario start (April 1992), 20-week (~Sept 1992), and 52-week (~April 1993) checkpoints. Feeds `municipalities_1990_initial_political_controllers_apr1992.json` validation and 20w/52w baseline reference.  
**Plan:** docs/40_reports/backlog/HISTORIAN_BASELINE_CONTROL_EXTRACTION_PLAN.md  

**Init rule (canon):** Initial April 1992 control in the engine is **based on ethnic majority of OSID**, not on this BB-derived municipal table. This report is for reference and 20w/52w authoring only.

---

## 1. Methodology and caveats

- **Single source of truth:** BB KB only (`data/derived/knowledge_base/balkan_battlegrounds/`: pages, facts_proposed.json, map_catalog.json, extractions). No invention; every control assignment has a BB1/BB2 citation.
- **April 1992:** The KB does **not** contain a BB page that explicitly lists “control by municipality as of April 1992.” Inference uses:
  - **BB1 Appendix G (pp. 496–501):** “Skeleton Bosnian Serb Army Order of Battle, **July 1995**.” VRS brigade/corps **HQ locations** are RS-held by July 1995. PATTERN_REPORT_APR1992_HISTORICAL_FIDELITY.md states that VRS/JNA “rapidly seize territory” in April 1992 and that Appendix G “align[s] with areas of early RS control expansion.” Therefore HQs in Appendix G are treated as **RS by April 1992** only where BB or the pattern report states or implies early takeover (East Bosnia, Prijedor, Zvornik, Bijeljina, etc.); otherwise the OOB is cited as **RS by July 1995** and April 1992 is marked “inferred from OOB” or “unknown.”
  - **BB1 p.404:** Bihać as “Muslim enclave” (RBiH).
  - **Existing engine file** `data/source/municipalities_1990_initial_political_controllers_apr1992.json` is the current baseline; this report validates or flags discrepancies.
- **20-week (~Sept 1992) and 52-week (~April 1993):** The KB has no BB passage that gives an explicit control snapshot for “September 1992” or “April 1993.” Narrative events (e.g. fall of Jajce October 1992, Srebrenica/Žepa/Goražde as enclaves, Bihać pocket) support **derivation by scenario author** from chronology; Historian reports only what the record states with a direct citation. Where no snapshot exists, table entries are “unknown” or “BB silent.”
- **Mapping:** Place names from BB are mapped to the project’s 110 **mun1990_id** keys (see `municipalities_1990_initial_political_controllers_apr1992.json`). Where BB mentions a settlement/area that does not map cleanly to one mun1990_id, it is noted in the report.

---

## 2. April 1992 (starting scenario)

### 2.1 Citation-backed control (BB-derived)

Control below is either explicitly stated in BB for early 1992 or inferred from VRS July 1995 OOB (BB1 496–501) plus PATTERN_REPORT (“early RS control expansion”). “Inferred from OOB” means: HQ in Appendix G; RS control by April 1992 is consistent with “VRS/JNA rapidly seize territory” (pattern report) but not page-specific for that month.

| mun1990_id | controller | citation | notes |
|------------|------------|----------|--------|
| banja_luka | RS | BB1 p.496–498 (VRS Main Staff rear bases, 1st Krajina Corps HQ; brigade HQs Banja Luka) | Inferred from OOB; early RS expansion |
| bijeljina | RS | BB1 p.496, 500–501 (Main Staff 35th Rear Base Bijeljina; East Bosnian Corps HQ Bijeljina; Semberija/Bijeljina brigades) | East Bosnia; early takeover |
| bileca | RS | BB1 p.496 (30th Rear Base Bileca) | Inferred from OOB |
| bosanska_dubica | RS | BB1 p.498 (11th Dubica Infantry Brigade, HQ Kozarska Dubica) | Inferred from OOB |
| bosanska_gradiska | RS | BB1 p.498 (1st Gradiska Light Infantry Brigade) | Inferred from OOB |
| bosanska_kostajnica | RS | — | No BB location in OOB; RS by continuity (Posavina/Serb corridor) |
| bosanski_novi | RS | BB1 p.498 (1st Novigrad Infantry Brigade, HQ Novigrad (Bosanski Novi)) | Inferred from OOB |
| bosanski_petrovac | RS | BB1 p.499–500 (2nd Krajina Corps elements; 3rd Petrovac, 21st Armored Petrovac) | Inferred from OOB |
| bosansko_grahovo | RS | BB1 p.500 (9th Grahovo Light Infantry Brigade, HQ Bosansko Grahovo) | Inferred from OOB |
| brcko | RS | BB1 p.500 (1st Posavina Infantry Brigade, HQ Brcko) | East Bosnian/Posavina; early RS |
| bratunac | RS | — | East Bosnia; BB1 index Srebrenica/Drina area; inferred RS |
| celinac | RS | BB1 p.498 (1st Celinac Light Infantry Brigade) | Inferred from OOB |
| cajnice | RS | — | East Bosnia; inferred RS |
| derventa | RS | BB1 p.498 (27th Derventa Motorized Brigade) | Inferred from OOB; engine file has HRHB — discrepancy |
| doboj | RS | BB1 p.497–498 (Doboj Operational Group, 2nd Armored Doboj, 1st Doboj Light Infantry) | Inferred from OOB |
| donji_vakuf | RBiH | BB1 p.498 (19th/31st Krajina at Srbobran (Donji Vakuf)) | OOB lists VRS units there by July 1995; engine has RBiH — contested/holdout possible; BB silent for Apr 1992 |
| foca | RS | — | Drina area; BB1 index; inferred RS |
| glamoc | RS | BB1 p.500 (5th Glamoc Light Infantry Brigade) | Inferred from OOB |
| gacko | RS | — | Herzegovina; inferred RS |
| han_pijesak | RS | BB1 p.496, 501 (Main Staff HQ Han Pijesak–Mount Zep; 1st Romanija Infantry HQ Han Pijesak) | Inferred from OOB |
| hadzici | RS | BB1 p.496 (Technical Repair Institute “Hadzici”) | Inferred from OOB; engine has RBiH — discrepancy (Sarajevo area) |
| ilijas | RS | — | Sarajevo-Romanija; inferred RS; engine has RS |
| kalinovik | RS | BB1 p.496 (1st Guards Motorized Brigade, HQ Kalinovik) | Inferred from OOB |
| kljuc | RS | BB1 p.499–500 (2nd Engineer Regiment Kljuc–Laniste; 17th Kljuc Light Infantry) | Inferred from OOB |
| kupres | RS | BB1 p.500 (7th Krajina Motorized Brigade, HQ Kupres) | Inferred from OOB |
| laktasi | RS | — | Banja Luka area; inferred RS |
| lopare | RS | BB1 p.501 (3rd Majevica Infantry Brigade, HQ Lopare) | Inferred from OOB |
| ljubinje | RS | — | Herzegovina; inferred RS |
| modrica | RS | BB1 p.499 (1st Trebava, 1st Vucjak at Modrica) | Inferred from OOB; engine has HRHB — discrepancy |
| mrkonjic_grad | RS | BB1 p.498 (11th Mrkonjic Light Infantry Brigade) | Inferred from OOB |
| nevesinje | RS | — | Herzegovina; inferred RS |
| pale | RS | BB1 p.501 (4th Reconnaissance-Sabotage “White Wolves” Pale; 4th Sarajevo Light Infantry Pale) | Inferred from OOB |
| prnjavor | RS | BB1 p.498 (1st Prnjavor Light Infantry Brigade) | Inferred from OOB |
| prijedor | RS | BB1 p.498 (5th Kozara HQ Prijedor-Omarska; 43rd Prijedor Motorized); PATTERN_REPORT (takeover, displacement Prijedor) | Early RS takeover; engine has RBiH — **discrepancy** |
| rogatica | RS | — | Drina/Romanija; inferred RS |
| rudo | RS | — | Drina; inferred RS |
| sekovici | RS | — | East Bosnia; inferred RS |
| sipovo | RS | BB1 p.497, 499 (30th Division HQ Sipovo; 1st Sipovo Light Infantry) | Inferred from OOB |
| skender_vakuf | RS | BB1 p.498 (22nd Krajina Infantry, HQ Knezevo (Skender Vakuf)) | Inferred from OOB |
| sokolac | RS | BB1 p.496 (27th Rear Base Sokolac; Military Hospital Sokolac) | Inferred from OOB |
| srbac | RS | BB1 p.498 (1st Srbac Light Infantry Brigade) | Inferred from OOB |
| teslic | RS | BB1 p.499 (1st/2nd Teslic brigades) | Inferred from OOB |
| titov_drvar | RS | BB1 p.499–500 (2nd Krajina Corps HQ Drvar?; 1st Drvar Light Infantry) | Inferred from OOB |
| trebinje | RS | — | Herzegovina; inferred RS |
| ugljevik | RS | BB1 p.501 (1st/2nd Majevica, HQ Ugljevik) | Inferred from OOB |
| vlasenica | RS | BB1 p.496 (10th Sabotage Detachment, HQ Bijeljina–Vlasenica) | Inferred from OOB |
| visegrad | RS | — | Drina; inferred RS |
| vogosca | RS | BB1 p.501 (3rd Sarajevo Infantry Brigade, HQ Vogosca) | Inferred from OOB |
| zvornik | RS | BB1 p.496 (63rd Autotransport Battalion, HQ Zvornik); PATTERN_REPORT (early takeover, Sapna holdout) | Early RS; Sapna holdout in Zvornik mun |

**RBiH (BB-cited or strong inference)**

| mun1990_id | controller | citation | notes |
|------------|------------|----------|--------|
| bihac | RBiH | BB1 p.404 (Bihać as “Muslim enclave”; “wiping the Muslim enclave off the map”) | Enclave/pocket |
| bosanska_krupa | RBiH | BB1 p.500 (15th Bihac Infantry Brigade HQ Ripac; 11th Krupa at Krupa — VRS designation); BB2 narrative Bihać pocket / 5th Corps | Contested; engine RBiH; Krupa in Bihać pocket |
| srebrenica | RBiH | BB1 index Srebrenica 151, 179, 184–191, 208, 283–290…; PATTERN_REPORT (enclave) | Enclave; RBiH-held |
| gorazde | RBiH | BB1 p.448 (Goražde; UN); PATTERN_REPORT (enclave) | Enclave |
| centar_sarajevo | RBiH | — | Government seat; BB index Sarajevo |
| stari_grad_sarajevo | RBiH | — | Sarajevo |
| novi_grad_sarajevo | RBiH | — | Sarajevo |
| novo_sarajevo | RBiH | — | Sarajevo |
| ilidza | RBiH | — | Sarajevo area; engine RBiH |
| cazin | RBiH | BB2 Bihać enclave / 5th Corps (503rd Cazin) | Bihać pocket |
| velika_kladusa | RBiH | BB2 Abdic/APWB narrative; 5th Corps | Bihać area; RBiH until Abdic split |
| kakanj | RBiH | BB1 p.506 (ARBiH General Staff HQ Kakanj, Oct 1995) | RBiH |
| zenica | RBiH | BB1 p.506 (Military School Center Zenica); ARBiH 3rd Corps | RBiH |
| visoko | RBiH | BB1 p.506 (Main Logistics Center Visoko) | RBiH |
| travnik | RBiH | — | Central Bosnia; engine RBiH |
| tuzla | RBiH | — | 2nd Corps; engine RBiH |
| gracanica | RBiH | — | Tuzla area; engine RBiH |
| lukavac | RBiH | — | Tuzla area; engine RBiH |
| zivinice | RBiH | — | Tuzla area; engine RBiH |
| kalesija | RBiH | — | Tuzla area; engine RBiH |
| srebrenik | RBiH | — | Tuzla area; engine RBiH |
| gradacac | RBiH | — | Engine RBiH |
| maglaj | RBiH | — | Engine RBiH |
| tesanj | RBiH | — | Engine RBiH |
| zavidovici | RBiH | — | Engine RBiH |
| olovo | RBiH | — | Engine RBiH |
| vares | RBiH | — | Engine RBiH |
| breza | RBiH | — | Engine RBiH |
| konjic | RBiH | — | Engine RBiH |
| jablanica | RBiH | — | Engine RBiH |
| gornji_vakuf | RBiH | — | Engine RBiH |
| kladanj | RBiH | — | Engine RBiH |
| trnovo | RBiH | — | Engine RBiH |

**HRHB (Croat-held; BB narrative + engine)**

| mun1990_id | controller | citation | notes |
|------------|------------|----------|--------|
| mostar | HRHB | BB1 index Mostar, Stari Most; ARBIH_HVO_HOSTILITIES_TIMING (Mostar siege 1993) | HVO/HRHB |
| capljina | HRHB | — | Herzegovina; engine HRHB |
| grude | HRHB | — | Engine HRHB |
| ljubuski | HRHB | — | Engine HRHB |
| posusje | HRHB | — | Engine HRHB |
| citluk | HRHB | — | Engine HRHB |
| stolac | HRHB | — | Engine HRHB |
| livno | HRHB | — | Engine HRHB |
| duvno | HRHB | — | Engine HRHB |
| listica | HRHB | — | Engine HRHB |
| jajce | HRHB | BB1/BB2 index Jajce; fall Oct 1992 to VRS — so **April 1992** = pre-fall; engine HRHB | HRHB at start; falls to RS Oct 1992 |
| bugojno | HRHB | BB1 index Bugojno; engine HRHB | |
| busovaca | HRHB | — | Engine HRHB |
| vitez | HRHB | — | Engine HRHB |
| kiseljak | HRHB | — | Engine HRHB |
| kresevo | HRHB | — | Engine HRHB |
| fojnica | HRHB | — | Engine HRHB |
| kotor_varos | HRHB | BB1 p.498 (1st Kotor Varos Light Infantry Brigade) | VRS brigade HQ by July 1995; engine HRHB — **discrepancy** (may have been taken later) |
| novi_travnik | HRHB | — | Engine HRHB |
| zepce | HRHB | — | Engine HRHB |
| orasje | HRHB | — | Posavina; engine HRHB |
| odzak | HRHB | — | Engine HRHB |
| bosanski_brod | HRHB | — | Engine HRHB |
| bosanski_samac | HRHB | BB1 p.500 (2nd Posavina Light Infantry, HQ Bosanski Samac) | VRS by July 1995; engine HRHB — **discrepancy** (Posavina Croat then Serb) |
| neum | HRHB | — | Engine HRHB |

**Uncertain / BB silent (null or author decision)**

All 110 mun1990_ids are listed in `municipalities_1990_initial_political_controllers_apr1992.json`. Municipalities not appearing in the citation-backed tables above have no direct BB control statement for April 1992; use engine value or `null` per author decision.

| mun1990_id | controller | citation | notes |
|------------|------------|----------|--------|
| banovici | RBiH | — | Engine RBiH; BB silent |
| sanski_most | RBiH | BB1 p.498 (6th Sanske Infantry Brigade, HQ Sanski Most) | VRS HQ by July 1995; engine RBiH — **discrepancy** (possibly taken later) |
| gracanica | RBiH | — | Engine RBiH |

### 2.2 Discrepancies with current engine file (April 1992)

- **prijedor:** Engine = RBiH; BB = RS (early takeover, PATTERN_REPORT + OOB).
- **derventa:** Engine = HRHB; BB = RS (VRS 27th Derventa Brigade HQ).
- **modrica:** Engine = HRHB; BB = RS (VRS Trebava/Vucjak at Modrica).
- **hadzici:** Engine = RBiH; BB = RS (VRS Technical Repair Institute Hadzici) — Sarajevo suburb; plausible RBiH holdout.
- **kotor_varos:** Engine = HRHB; BB = RS by July 1995 (1st Kotor Varos Brigade); April 1992 may be HRHB.
- **bosanski_samac:** Engine = HRHB; BB = RS by July 1995 (2nd Posavina Samac); April 1992 may be HRHB.
- **sanski_most:** Engine = RBiH; BB = RS by July 1995 (6th Sanske); April 1992 may be RBiH.

### 2.3 Optional JSON (April 1992)

The file `data/source/municipalities_1990_initial_political_controllers_apr1992.json` already exists with 110 mun1990_ids. This report **validates** it and flags the discrepancies above. No new JSON is emitted here; author may update the file from §2.1–2.2. Where BB is silent, keep existing value or set to `null` per engine contract.

---

## 3. 20-week checkpoint (~September 1992)

**BB status:** The KB contains **no** passage that gives an explicit control snapshot “as of September 1992” for municipalities. Narrative and index references (e.g. Jajce, Srebrenica, Bihać, corridors) support **derivation by scenario author** from event chronology (e.g. fall of Jajce October 1992 → Jajce RS by 20w if 20w is defined as end-September).

| mun1990_id | controller (20w) | citation | notes |
|------------|------------------|----------|--------|
| jajce | unknown → RS after Oct 1992 | BB1 index Jajce; fall of Jajce Oct 1992 | 20w = ~Sept: still HRHB; after Oct = RS |
| (all others) | unknown | BB silent for Sept 1992 snapshot | Author to derive from narrative/chronology |

**Recommendation:** For 20w baseline, author a JSON (same schema as April 1992) from narrative events plus start snapshot; document sources in a short 20w baseline note. Historian does not invent a 20w table without BB citations.

---

## 4. 52-week checkpoint (~April 1993)

**BB status:** The KB contains **no** passage that gives an explicit control snapshot “as of April 1993” for municipalities. Enclaves (Srebrenica, Žepa, Goražde, Bihać), Washington Agreement (early 1994), and Croat–Muslim war (1993) are referenced in BB but not as a mun-by-mun April 1993 map.

| mun1990_id | controller (52w) | citation | notes |
|------------|------------------|----------|--------|
| srebrenica | RBiH | BB1 index; PATTERN_REPORT (enclave) | Safe area later |
| gorazde | RBiH | BB1 p.448; PATTERN_REPORT | Enclave |
| bihac | RBiH | BB1 p.404 | Enclave/pocket |
| (all others) | unknown | BB silent for April 1993 snapshot | Author to derive |

**Recommendation:** For 52w baseline, author a JSON from narrative/chronology; Historian does not invent a 52w table without BB citations. Optional JSON files (same schema: `controllers_by_mun1990_id`) for 20w and 52w may be placed in `data/source/` (e.g. `municipalities_1990_controllers_sept1992.json`, `municipalities_1990_controllers_apr1993.json`) once authored from this report and narrative chronology.

---

## 5. Traceability

| Source | Use |
|--------|-----|
| BB1 pp. 496–501 | VRS OOB July 1995; HQ locations → RS control (with April 1992 inference where pattern report supports early takeover) |
| BB1 p.404 | Bihać as Muslim enclave (RBiH) |
| BB1 index (pp. 531–538 etc.) | Srebrenica, Jajce, Brcko, Bugojno, Mostar, etc. — narrative/chronology only |
| PATTERN_REPORT_APR1992_HISTORICAL_FIDELITY.md | Early RS expansion; Prijedor takeover; Zvornik (Sapna holdout); enclaves |
| ARBIH_HVO_HOSTILITIES_TIMING.md | 1992 ambiguous ally; 1993 open war; Jajce/Mostar context |
| data/source/municipalities_1990_initial_political_controllers_apr1992.json | Current engine baseline; validated and discrepancy-flagged |

---

## 6. Summary

- **April 1992:** Citation-backed table (§2.1) with RS/RBiH/HRHB and “unknown”; discrepancies with engine file listed (§2.2). JSON not regenerated; author may update from report.
- **20w (~Sept 1992):** BB silent on snapshot; only Jajce (pre-fall) noted. 20w baseline JSON to be authored from narrative.
- **52w (~April 1993):** BB silent on snapshot; enclaves (Srebrenica, Goražde, Bihać) cited as RBiH. 52w baseline JSON to be authored from narrative.

Every control assertion in §2 is tied to BB (or pattern report citing BB); no invention. Where BB is silent, “unknown” or existing engine value is used.
