# 20-week and 52-week checkpoint control: External research (web / map references)

**Date:** 2026-02-24  
**Purpose:** Supplement the BB KB with web and map lookups to support authoring **20w (~Sept 1992)** and **52w (~April 1993)** baseline control reference data. The Historian report found no explicit BB snapshots for these dates; this doc collects external sources for scenario authors.  
**Related:** HISTORIAN_BASELINE_CONTROL_EXTRACTION_PLAN.md, 20260224_HISTORIAN_BASELINE_CONTROL_START_20W_52W.md (extractions/).

**Baseline control files (created from this doc):** `data/source/municipalities_1990_initial_political_controllers_sept1992.json` (20w) and `data/source/municipalities_1990_initial_political_controllers_apr1993.json` (52w). Use in scenarios via `init_control: "sept1992"` or `init_control: "apr1993"`. Both include all strongholds (§4) and timeline-derived changes (§2–§3).

**Summary of baseline content:**  
- **sept1992 (20w):** From apr1992, apply: Corridor 92 → derventa, odzak, modrica, bosanski_brod, brcko, bosanski_samac = RS; Central Krajina → sanski_most, prijedor, kljuc = RS; ilidza = RS. **Vareš = HRHB** (not RS; Vozuća is RS stronghold in the area but municipality Vareš is HRHB). **Lašva valley (vitez, busovaca, novi_travnik, travnik) and Kiseljak–Kreševo (kiseljak, kresevo) = HRHB** — Sept 1992 no subordination, ARBiH and HVO coexist. **Jajce = HRHB** (mixed ARBiH and HRHB defenders; falls Oct 29). ARBiH strongholds (gradacac, maglaj, tesanj, kladanj, olovo, kalesija) = RBiH; Orašje = HRHB; Žepče = HRHB.  
- **apr1993 (52w):** Same as sept1992 **except jajce = RS** (fell Oct 29 1992). Vareš and Lašva/coexistence unchanged. Enclaves (srebrenica, gorazde, bihac) = RBiH.

---

## 1. Map and archival sources (authoritative)

### Library of Congress / CIA

- **Balkan Battlegrounds (CIA, 2002–2003)** — LoC item 2010588135. Multi-sheet military history; includes:
  - **1992:** Posavina Corridor (Apr–Jun, Jun–Jul, Aug 1992–Jan 1993); Bosanski Brod (Jul–Oct 1992); **Jajce (Jul–Nov 1992)** — covers 20w; Zvornik–Srebrenica (Apr–Dec 1992); Foča–Goražde (May–Dec 1992); Kupres (Apr 1992).
  - **1993:** Srebrenica–Čerska (Jan 1993, **Mar–Apr 1993** — close to 52w); Goražde–Trnovo (Jan–Aug 1993); Bihać (1993); Vitez (Jun 1993–Jan 1994); Brčko (Jul 1993); Vareš–Stupni Do (Oct–Nov 1993).
- **"Territorial changes in Bosnia and Herzegovina since January 1993"** — LoC 2009584251. CIA 1995 map; shows areas of control (Serb / Croat / Muslim) and UN safe/patrolled areas; useful for 1993+.
- **"Areas of control in Bosnia and Herzegovina, July 1993"** — Map J in CIA 2001 collection (LoC 2010588123). Closest single-map snapshot to **52-week (April 1993)**; three-way control (Serb / Croat / Muslim) + UN Safe Areas.
- **"Bosnia and Herzegovina, summary map"** — LoC 93685376. CIA 1993; ancillary maps on ethnic majorities and related data.

**Use:** Consult LoC digital/catalog or physical maps to derive municipality-level or regional control for Sept 1992 and April/July 1993 when authoring `municipalities_1990_controllers_sept1992.json` and `municipalities_1990_controllers_apr1993.json` (or equivalent).

---

## 2. Timeline and events (20w ≈ Sept 1992)

- **Jajce:** Fell to VRS on **29 October 1992** (Operation Vrbas '92). So at **20 weeks (≈ Sept 1992)** Jajce was still **HRHB** (Croat/Bosniak held); after 20w it falls to **RS**. (Wikipedia: Siege of Jajce (1992), Operation Vrbas '92.)
- **Operation Corridor 92 (Jun–Oct 1992):** VRS gained northern Bosnia (Posavina). Municipalities cited: **Derventa, Odžak, Modriča, Bosanski Brod** — by end Oct 1992 these were under Serb control; at 20w (Sept) some may already have been RS or in flux. (Wikipedia: Operation Corridor 92.)
- **Central Bosanska Krajina (Apr–May 1992):** Serb takeover of **Sanski Most, Prijedor, Ključ** (and related). By 20w these were **RS**. (Wikipedia: 1992 ethnic cleansing of central Bosanska Krajina.)
- **Eastern Bosnia:** Fighting through late 1992 in **Zvornik, Srebrenica, Foča, Goražde** (LoC/CIA regional maps; Wikipedia 1992 campaign).
- **Serb control by end 1992 (partial list):** Foča, Višegrad, Zvornik, Čajniče, Bratunac (east); Prijedor, Kupres, Doboj (central); Šamac, Brčko (north); Ilidža (near Sarajevo). (Web search: “Bosnia war which towns Serb control end 1992”.)

---

## 3. Timeline and events (52w ≈ April 1993)

- **UN Safe Areas:** **Srebrenica** declared safe area **16 April 1993** (UNSCR 819); **12 April 1993** VRS shelling. Srebrenica remained a Bosniak (RBiH) enclave, surrounded. (Wikipedia: UN Safe Areas, 12 April 1993 Srebrenica shelling.)
- **Goražde, Žepa, Bihać:** Also designated safe areas (Resolution 824); RBiH-held enclaves/pocket in April 1993.
- **July 1993 CIA map:** “Areas of control in Bosnia and Herzegovina, July 1993” (Map J) gives a full three-way (Serb / Croat / Muslim) + UN Safe Areas snapshot; the **52w (April 1993)** situation is slightly earlier but structurally similar; use July 1993 map as proxy where April 1993 data are missing.
- **Croat–Bosniak conflict:** Operation Neretva '93 (Sep–Oct 1993) — ARBiH vs HVO in Herzegovina and central Bosnia; relevant for 52w as context that RBiH/HRHB front lines were not static.

---

## 4. Notable strongholds and HVO/ARBiH subordination

**Source:** Authoritative input for baseline and scenario authoring (strongholds and formation-subordination context). Use when assigning control, enclave/holdout behaviour, or formation allegiance in 20w/52w reference data.

### 4.1 ARBiH strongholds (notable)

- **Teočak** — ARBiH stronghold.
- **Sapna** — ARBiH holdout within Zvornik municipality (BB/Historian: Sapna held while Zvornik mun under RS).
- **Gradačac**
- **Maglaj**
- **Tešanj** (Tešanj municipality)
- **Kladanj**
- **Olovo**
- **Kalesija**

### 4.2 RS stronghold

- **Vozuća** — RS stronghold (in Vareš area; municipality **Vareš** is HRHB, not RS).

### 4.3 HRHB stronghold

- **Orašje** — HRHB stronghold in Posavina.

### 4.4 Ethnic Croat territories: HVO subordinated to ARBiH

In these **ethnic Croat** territories, HVO formations were **subordinated to ARBiH** (not independent HRHB command):

- **North / Tuzla area:** Maglaj, Tešanj, Gračanica, Tuzla, Srebrenik, Brčko, Živinice, Banovići, Gradačac.

**Exceptions in central Bosnia** (HVO not subordinated to ARBiH, or different status):

- **Žepče** (Žepče)
- **Vareš** (Vareš)

**Additional areas with HVO subordinated to ARBiH:**

- **Lašva valley** — In **September 1992** there was **no subordination of either side; ARBiH and HVO coexisted**. (For baseline sept1992/apr1993, Lašva muns are set to HRHB to reflect coexistence; subordination came later.) Relevant municipalities: Vitez, Busovača, Novi Travnik, Travnik, etc.
- **Kiseljak–Kreševo pocket** — Kiseljak and Kreševo area (for Sept 1992 baseline treated as HRHB; see Lašva note).

Use this to distinguish political control (RBiH vs HRHB) from formation allegiance: in subordination areas, control may be RBiH or mixed while HVO units fight under ARBiH; Žepče and Vareš are HRHB (exceptions to subordination). **Jajce (Sept 1992)** had mixed ARBiH and HRHB defenders; it fell to RS in October 1992. **Orašje** is HRHB stronghold in Posavina.

---

## 5. Suggested use for baseline authors

1. **20w (~Sept 1992):**  
   - Use LoC **Jajce (Jul–Nov 1992)** and **Posavina / Bosanski Brod (Jul–Oct 1992)** maps.  
   - Apply: Jajce = HRHB at 20w; Derventa, Modriča, Odžak, Bosanski Brod = RS or in flux by Sept (Corridor 92).  
   - Cross-check Historian report (BB) and this doc for other muns; fill remaining from narrative or leave null/unknown.

2. **52w (~April 1993):**  
   - Use **“Areas of control in Bosnia and Herzegovina, July 1993”** (Map J) as primary geographic reference; adjust where narrative gives April 1993 specifics (e.g. Srebrenica safe area from 16 Apr 1993).  
   - Use **Srebrenica–Čerska (Mar–Apr 1993)** and **Goražde–Trnovo (Jan–Aug 1993)** for enclaves.  
   - Enclaves (Srebrenica, Žepa, Goražde, Bihać) = RBiH in April 1993; surround by RS where applicable.

3. **Schema:** Same as init control: `{ "controllers_by_mun1990_id": { "<mun1990_id>": "RBiH" | "RS" | "HRHB" | null } }`. Place files in `data/source/` (e.g. `municipalities_1990_initial_political_controllers_sept1992.json`, `..._apr1993.json`) or document in scenario data contract. When assigning control, respect **§4 Notable strongholds and HVO/ARBiH subordination** (Teočak, Sapna, Gradačac, Maglaj, Tešanj, Kladanj, Olovo, Kalesija as ARBiH strongholds; Vozuća as RS stronghold in Vareš area but **Vareš municipality = HRHB**; Orašje as HRHB; Lašva Sept 1992 = coexistence, no subordination; Jajce Sept 1992 = mixed ARBiH/HRHB defenders, then falls to RS Oct 1992; Žepče and Vareš = HRHB).

---

## 6. References (URLs)

- LoC Balkan Battlegrounds: https://www.loc.gov/item/2010588135/
- LoC Territorial changes since Jan 1993: https://www.loc.gov/item/2009584251/
- LoC Yugoslavia maps 1991–1995: https://www.loc.gov/item/2010588123/
- LoC Bosnia summary map 1993: https://www.loc.gov/item/93685376/
- Wikipedia: Operation Corridor 92; Siege of Jajce (1992); Operation Vrbas '92; 1992 ethnic cleansing of central Bosanska Krajina; United Nations Safe Areas; 12 April 1993 Srebrenica shelling.
- Wikimedia: Map of UN Safe Areas in Bosnia and Herzegovina 1993–1995 (Commons).
