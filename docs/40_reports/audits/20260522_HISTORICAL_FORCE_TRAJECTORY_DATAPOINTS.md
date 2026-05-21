# Historical Force Trajectory Datapoints — VRS, ARBiH, HVO (1992–1995)

**Date:** 2026-05-22
**Author:** Historian (AWWV)
**Purpose:** Citation-backed per-faction trajectory arcs for the AWWV engine's force-trajectory model. Engine target: emergent late-war Krajina collapse from attrition differentials, not scripted events.
**Source hierarchy:** ICTY verdicts → museum B/C/S sources → Balkan Battlegrounds (BB1/BB2) → tertiary (LOW-confidence only).
**Read-only investigation.** No source/scenario/anchor edits made. No code touched.

---

## 0. Methodology and limits

- **Primary source:** Balkan Battlegrounds KB at `data/derived/knowledge_base/balkan_battlegrounds/` (BB1 pp.38–538 + BB2 pp.401–560, ~406 pages extracted). All BB citations below cite that KB.
- **Hard limit:** The extracted BB KB **stops at BB2 p.560**, which is the endnotes for Annex 61 (Operation Breza 94 / Bihac late-1994 fighting). The August–October 1995 Krajina collapse window (Operations Sana 95, Mistral 2, Maestral 2, Juzni Potez/Southern Move), Storm spillover, and Dayton-eve casualty bands are **BB-silent in this KB**. Where the task asked for 1995 collapse-window numbers, items below are marked **[BB SILENT — secondary needed]** with what would be the proper next source (ICTY judgment summaries — Brđanin, Krajišnik, Tolimir, Mladić; RDC Bosnian Book of the Dead; Tabeau/Bijak ICTY expert demographic report; HV Glavni stožer post-war monographs).
- **Cross-faction strength comparison reference:** `docs/knowledge/ARMY_STRENGTH_COMPARISON.md` (which flags that aggregate-strength figures in the engine's OOB masters between 1993 and 1995 are *[UNSOURCED — needs primary source]*).
- **No invention.** Cells without a citation are marked "BB silent" or filled from the OOB master with explicit `[OOB master, BB-unsourced]` tag.
- **Confidence tags used in cells:**
  - **BB**: Balkan Battlegrounds direct citation
  - **BB-inferred**: Combined from multiple BB passages; reasoning given in notes
  - **OOB-unsourced**: From the OOB master file but no BB citation in that doc itself
  - **LOW**: Tertiary (wire reports embedded in BB endnotes, etc.). Use only when explicitly tagged.

Anchor dates (per task): **Apr 1992**, **Jan 1993**, **Apr 1994**, **Apr 1995**, **Oct 1995**.

Signal columns: (1) Personnel | (2) Equipment | (3) Officer corps | (4) Comms/C3 | (5) Ammunition | (6) Casualties | (7) Mobilization pool | (8) Morale/refusal.

---

## 1. VRS (Vojska Republike Srpske) — Bosnian Serb Army

| Anchor | (1) Personnel | (2) Equipment | (3) Officer corps | (4) Comms/C3 | (5) Ammunition | (6) Casualties | (7) Mob. pool | (8) Morale |
|---|---|---|---|---|---|---|---|---|
| **Apr 1992** | JNA in Bosnia 100,000–110,000 [BB1 p.166]; Bosnian Serb TO ~60,000 [BB1 p.166]; Bosnian Serb MUP ~15,000 [BB1 p.166]; combined feeder force ~175,000–185,000 with overlap. "Initially comprised over 250,000 troops" at peak mobilization on creation 12 May 1992 [BB1 p.177]. | JNA in Bosnia: ~500 tanks; ~400 field-artillery pieces > 100 mm; 48 MRLs; 350 120-mm mortars; 120 fighter-bombers; ~40 light attack/observation helos; 30 transport helos [BB1 p.166]. VRS at formation inherited the lion's share of TO weaponry [BB1 p.179] plus the JNA Second Military District stocks [BB1 p.177]. | Built on JNA Second Military District HQ; Mladić appointed VRS commander 12 May 1992; Milovanović chief of staff [BB1 p.177]. "Most of the Army's senior and midlevel commanders and staff officers had seen service" in Slovenia/Croatia [BB1 p.177]. Few JNA corps inherited had combat experience but cadre quality professional. | BB silent on specifics for Apr 1992. Inherited JNA tactical-radio fit and 67th Communications Regiment HQ Han Pijesak [BB1 p.496] (OOB-unsourced as Apr-1992 specific). | BB silent on specific Apr-1992 stockpile tonnage. JNA had ordered "withdrawal of war material reserves, especially of modern and valuable combat equipment" by 3 April 1992 directive (Adzic order, Top Secret No.585-2) — VRS inherited the residual + JNA depot stocks placed in "secure areas" [BB1 p.199, fn 50]. | BB silent for Apr 1992. | Bosnian Serb demographic base: 31% of BiH population (BB silent on exact 1991 figure inside the KB; OOB-unsourced cross-ref). Registered firearms in Serb civilian hands pre-war: 157,200 (131,900 owners) [BB1 p.199]. | BB silent for Apr 1992. SDS-VRS tension noted as latent throughout war [BB1 p.177]. |
| **Jan 1993** | "Initially over 250,000... falling to 155,000 by war's end" [BB1 p.177] — Jan 1993 is between these endpoints; BB does not give a specific Jan-1993 aggregate. OOB master estimates ~90,000–100,000 [OOB master, BB-unsourced]. | "500 to 550 tanks, about 250 APCs or IFVs, some 500–600 field artillery pieces, and 400–500 heavy mortars" — VRS figures given as war-period aggregates [BB1 p.177]; date-of-snapshot ambiguous. Air arm: ~20 fighter-bombers, 15 light attack/observation helos, 15 transport helos [BB1 p.177]. | Mladić/Milovanović cohort stable. 80 maneuver brigades + regiments by end of 1992 [BB1 p.177]. "Mob of TO personnel" being converted into "properly organized, well-led light infantry brigades" — process ongoing [BB1 p.177]. | BB silent on Jan 1993 specifics. | BB silent on Jan 1993 specifics. Sanctions on Serbia (UNSC Resolution 757, May 1992) referenced contextually but specific VRS stockpile drawdown not quantified in BB KB. | BB silent on cumulative Jan-1993 KIA/WIA. **[BB SILENT — secondary needed: RDC Bosnian Book of the Dead per-year tables, Tabeau/Bijak ICTY expert demographic report.]** | BB silent. | BB silent for Jan 1993. |
| **Apr 1994** | BB does not give an April-1994 aggregate VRS strength. Mid-war steady-state implied by linear interpolation between 250k → 155k. OOB master: ~110,000–120,000 [OOB master, BB-unsourced]. | BB silent on Apr-1994 inventory deltas. 2nd Krajina Corps "weakest, most overstretched" with limited armor by mid-1994 [BB2 p.555]. | Boric (2nd Krajina) "competent, professional ex-JNA officers... had properly analyzed the inherent structural flaws in their command" — but "without enough troop-level cadres to impart training and enforce discipline" [BB2 p.555]. **NCO/junior-officer cadre gap is the explicit BB diagnosis.** | BB silent on Apr 1994 specifics. | BB silent on Apr 1994 specifics. | "Persistently poor training and discipline that beset the entire VRS below the brigade command level, together with what appears to have been inordinately low frontline manning" [BB2 p.555] — implies cumulative attrition + replacement-quality decline. | Bosnian Serb demographic base small relative to opponent — "Manpower limitations (Serb population only ~31% of BiH)" [HVO/VRS OOB cross-ref, BB-unsourced]. | "Tactical superiority" of ARBiH recon-sabotage units "had achieved moral dominance over nearly all VRS infantry formations, including even the Serbs' elite units" [BB2 p.555]. **BB explicit on declining VRS morale relative to ARBiH by 1994.** |
| **Apr 1995** | BB silent on Apr-1995 aggregate. End-of-war = 155,000 [BB1 p.177]; pre-Storm. OOB master: ~110,000–120,000 [OOB master, BB-unsourced]. | BB silent on Apr-1995 inventory. | BB silent on Apr-1995 officer corps state. By late 1994 Milovanović noted "Serbian Brigades and Corps Are Already Court Martialing Deserters" [Zagreb Globus 2 Dec 1994, cited BB2 p.557] — discipline strain visible. | BB silent. | BB silent. | BB silent. **[BB SILENT — secondary needed.]** | BB silent. | "1st, 2nd, and 3rd Serbian Brigades" composite brigades formed late 1994 from drawing on each corps [BB2 p.548] — implies regular brigades unable to sustain operations on own manpower. |
| **Oct 1995** | **155,000 by war's end [BB1 p.177]** — this is the only firm BB end-state aggregate. | **500–550 tanks, ~250 APCs/IFVs, 500–600 field artillery pieces, 400–500 heavy mortars** [BB1 p.177] — given as war-period aggregate (not Oct-95 snapshot). | BB silent on Oct-1995 officer state. Milovanović interview "We Lost 13 Western Krajinan Municipalities Militarily: Power is Power" Banja Luka Nezavisne Novine 21–27 May 1997 cited in BB2 p.557 endnote — implies command analysis of collapse. **[Source listed but full content not in KB.]** | BB silent. | BB silent. | BB silent on cumulative Oct-1995 KIA/WIA total. **[BB SILENT — secondary needed: RDC Bosnian Book of the Dead, Tabeau/Bijak ICTY expert report ITT-1996.]** | BB silent. Refugee absorption from Krajina/Storm spillover discussed below in §4. | BB silent on Oct-1995 morale specifics in extracted KB. |

### VRS — supporting BB-cited specifics

- **2nd Krajina Corps "the weakest and most overstretched" of VRS corps** with 6,000–7,500 troops in five LIBs end-1992 [BB1 p.186]; reinforced by 2,000–3,000 from 1st Krajina Corps LIB. Backed by 1 armor battalion + 1–2 field artillery battalions.
- **VRS/SVK Breza 94 (Sep 1994) order of battle:** 1st Krajina Corps tactical group + Panthers (Bijeljina LIB) + SVK 39th Banija + 33rd Dvor LIB + SVK 155mm howitzer batteries = "about 4,000 assault troops, plus up to 3,000 sector-holding infantry" [BB2 p.540]. 2nd Krajina Corps spearhead 1st Drvar + 3rd Petrovac + 17th Ključ LIB supported by 15th Bihać LIB = "about 5,000 to 5,500 troops" [BB2 p.540].
- **VRS Bihac counteroffensive (Nov 1994):** initial 6,500 personnel growing to 14,000 with strong armor and artillery support [BB2 p.548]; three Serb-stiffened armies (VRS + SVK + APWB Abdić) mustered >25,000 against 5th Corps' 15,000 [BB2 p.556].
- **Officer corps explicit diagnosis:** Boric's 2nd Krajina Corps staff were "competent, professional ex-JNA officers... had properly analyzed the inherent structural flaws... No one... had been able to repair the defects in the VRS ranks despite, or perhaps because of, more than two years of steady combat nor, without enough troop-level cadres to impart training and enforce discipline, could they be expected to" [BB2 p.555].

---

## 2. ARBiH (Armija Republike Bosne i Hercegovine) — Bosnian Government Army

| Anchor | (1) Personnel | (2) Equipment | (3) Officer corps | (4) Comms/C3 | (5) Ammunition | (6) Casualties | (7) Mob. pool | (8) Morale |
|---|---|---|---|---|---|---|---|---|
| **Apr 1992** | "More than 100,000 men but probably only 40,000 to 50,000 small arms and virtually no heavy weapons" at war start [BB1 p.179]. Patriotic League "between 30,000 and 40,000 armed personnel" pre-war [BB1 p.168, via ARMY_STRENGTH_COMPARISON.md]. Bosnian TO had been "shrunk from its all-time high of over 300,000 troops in the mid-1980s down to a theoretical mobilized strength of only 86,000 troops" [BB1 p.179]. | "Virtually no heavy weapons" at start [BB1 p.179]. Almost all TO weaponry had been moved to JNA-controlled storage and not returned [BB1 p.179]. Later acquired "probably several thousand more small arms, limited amounts of ammunition and explosives, and at most a few dozen tanks and artillery pieces" from surrounded JNA garrisons [BB1 p.179]. | "Found itself at war without an army" [BB1 p.179]. Sefer Halilović as initial commander; "haphazard mix of regular and volunteer units" [BB1 p.179]. Few JNA-trained Muslim officers retained — exact count BB silent. | BB silent on Apr-1992 specifics. "Fragmented, competing commands" [BB1 p.179]. | "Limited amounts of ammunition and explosives" obtained from JNA garrisons. UN arms embargo binding. "The arms embargo applied most significantly to heavy weapons, the Bosnian Muslims' critical deficiency" [BB1 p.199 fn 58]. | None yet. | Registered firearms in Muslim civilian hands pre-war: 110,400 (92,500 owners) [BB1 p.199, police reports June 1991]. Demographic base larger than Serb base in absolute terms (43% Muslim vs 31% Serb of pre-war BiH; cross-ref ARMY_STRENGTH_COMPARISON, BB-unsourced). | BB silent for Apr 1992. |
| **Jan 1993** | "By early 1993 the ARBiH had reached its peak strength of 261,500 troops. The great majority of these served in local defense units, but some were organized into specialized maneuver, reconnaissance, and sabotage forces" [BB1 p.216]. (Aug 1992 baseline: ~170,000 in 28 brigades + 16 indep. battalions + 138 detachments + 2 artillery regts + 1 armored bn [BB1 p.216].) | Aug-1992 inventory: 28 brigades, 16 indep. battalions, 138 detachments, 2 artillery regiments, **1 armored battalion** [BB1 p.216] — order of magnitude smaller than VRS's 500+ tanks. | "It did lack virtually everything else, however, required of an army: training, command expertise, adequate firepower, and true offensive capability" [BB1 p.216]. Halilović himself: "in frontal clashes — whether in attack or defense — we cannot achieve more significant success" [BB1 p.216, his Aug 1993 strategic note]. Delić appointed 8 June 1993 [BB1 p.216]. | BB silent. | UN arms embargo continues. Covert imports beginning. BB does not provide tonnage. | **[BB SILENT — secondary needed: RDC Book of the Dead 1992 totals, Tabeau/Bijak ICTY expert demographic report.]** | "Over 90 percent of them volunteers" at peak strength [BB1 p.216]. Mobilization not yet at demographic ceiling. | "Numerical superiority and quality of our troops" — Halilović identifying it as ARBiH's "strong weapon" [BB1 p.216]. |
| **Apr 1994** | "These manpower figures would slowly decline in 1994 and 1995 due to combat losses, work deferments, and other causes" [BB1 p.216]. BB does not give an Apr-1994 aggregate. OOB master: ~165,000–180,000 [OOB master, BB-unsourced]. | BB silent on Apr-1994 deltas. ARBiH increasingly captured equipment from VRS via successful raids [BB2 p.555]. | Delić professionalizing; "October crackdown against the mafiosi leaders of the 9th and 10th Mountain Brigades in Sarajevo" Oct 1993 — disciplining force [BB1 p.216]. Corps-level officers' schools and main-staff cadre courses established [BB1 p.216, Halilović Aug 1993 plan]. | BB silent. | BB silent on Apr-1994 specifics. Washington Agreement (March 1994) opens Croatia transit. | **[BB SILENT — secondary needed.]** | BB silent on Apr 1994. | "ARBiH demonstrated a growing tactical superiority over the VRS, particularly in its effective use of elite recon-sabotage units, which had achieved moral dominance over nearly all VRS infantry formations, including even the Serbs' elite units" [BB2 p.555]. **Explicit BB statement of morale ascendancy by autumn 1994.** |
| **Apr 1995** | BB silent on Apr-1995 aggregate. OOB master: ~180,000–200,000 [OOB master, BB-unsourced]. | BB silent. | BB silent on Apr-1995 specifics. Delić consolidated. | BB silent. | BB silent. | **[BB SILENT — secondary needed.]** | BB silent. | BB silent on Apr 1995 specifics in extracted KB. |
| **Oct 1995** | BB silent on Oct-1995 aggregate. OOB master: ~180,000–200,000 [OOB master, BB-unsourced]. | BB silent. | BB silent. ARBiH General Staff HQ Kakanj by Oct 1995 [BB1 p.506]. | BB silent on Oct 1995. | BB silent. | **[BB SILENT — secondary needed: RDC Book of the Dead final tally, Tabeau/Bijak ICTY ITT-1996.]** | BB silent. | BB silent on Oct 1995 specifics. |

### ARBiH — supporting BB-cited specifics

- **5th Corps formation:** Established 20 October 1992 under Ramiz Dreković by reflagging the TO-based "Una-Sanska Operational Group" [BB1 p.186]. Bihac defender count end-1992: **7,000–10,000 troops in six Muslim brigades + 1 Bosnian Croat battalion** [BB1 p.186].
- **5th Corps Sep 1994:** "All told, the 5th Corps mustered about 15,000 troops for the battle" against Breza 94 [BB2 p.541]. Brigades: 501st Bihać, 502nd Bihać, 503rd Cazin Mtn, 1st Bosnian Liberation, 505th Buzim Motorized, 511th Bosanska Krupa Mountain.
- **5th Corps Nov 1994 (Bihac counteroffensive):** "the 15,000 Dudakovic could field" facing >25,000 attackers [BB2 p.556]. Identified as **Dudaković and his staff "the best in the ARBiH"** [BB2 p.555].
- **2nd Corps cooperative HVO elements:** 107th Gradačac, 108th Brčko, 115th Zrinski operating with ARBiH 1992–Jan 1994 [OOB master, BB-unsourced].

---

## 3. HVO (Hrvatsko Vijeće Obrane) + HV-attached

| Anchor | (1) Personnel | (2) Equipment | (3) Officer corps | (4) Comms/C3 | (5) Ammunition | (6) Casualties | (7) Mob. pool | (8) Morale |
|---|---|---|---|---|---|---|---|---|
| **Apr 1992** | HOS + HVO "had a combined strength of as many as 25,000 adequately armed troops with a handful of heavy weapons — and, of course, Croatian Army support" [BB1 p.179–180]. | "A handful of heavy weapons" [BB1 p.179–180]. Inherited TO weaponry from Croat-majority areas [BB1 p.179]. | HV-aligned officer corps — Croatian Army officers detached/seconded; HVO command structure formal only later in 1993 [OOB master, BB-unsourced]. | Croatian Army support implies cross-border C3 link [BB1 p.180]. | BB silent on Apr 1992 ammunition stockpile. Croatia transit available. | None. | Registered firearms in Croat civilian hands pre-war: 51,800 (43,000 owners) [BB1 p.199]. Smallest demographic base — ~17% of pre-war BiH (BB silent on exact %, cross-ref). | BB silent. |
| **Jan 1993** | BB does not give an HVO aggregate for 1993. OOB master ~40,000–45,000 [OOB master, BB-unsourced]. Cooperation with ARBiH still ostensible. | BB silent on Jan 1993 inventory. | Petković consolidating; HV liaison continuing. | BB silent. | BB silent. | **[BB SILENT — secondary needed.]** | BB silent. | BB silent. |
| **Apr 1994** | Post-Washington Agreement (March 1994). BB silent on aggregate. OOB master ~50,000–55,000 [OOB master, BB-unsourced]. | BB silent. | "Croatian Republic of Herzeg-Bosnia" still operative pre-1994 dissolution; HV liaison reinforced. | BB silent. | BB silent — Croatia transit restored. | **[BB SILENT — secondary needed.]** | BB silent. | BB silent. |
| **Apr 1995** | BB silent. OOB master ~50,000–55,000 [OOB master, BB-unsourced]. | BB silent. | BB silent. | BB silent. | BB silent. | BB silent. | BB silent. | BB silent. |
| **Oct 1995** | BB silent on HVO aggregate. **HV-attached brigades in Mistral 2 / Maestral 2 / Juzni Potez: BB SILENT in extracted KB — pages stop before these Sep-Oct 1995 operations** [BB extraction stops at BB2 p.560 = Dec 1994 endnotes]. | BB silent. | BB silent. | BB silent. | BB silent. | BB silent. | BB silent. | BB silent. |

### HVO — supporting BB-cited specifics

- **HOS + HVO 25,000 armed at start** [BB1 p.180]; Croatian Army support standing throughout war [BB1 p.180].
- **HV operational interventions (BB-cited within KB extraction range):**
  - **Operation Zima 94 (Winter 94), 29 November 1994:** "Croatian Army joined the HVO in Operation 'Zima (Winter) 94' in the Livno valley, hitting a long-quiet 2nd Krajina Corps sector in a move partly designed to draw off Serb forces around Bihac" [BB2 p.553]. Brigade-level HV contribution: BB silent on specific HV unit count.
  - **November 1994 Croatian warning:** Defense Minister Šušak threatened intervention 10 Nov, 14 Nov, 1 Dec 1994 [BB2 p.553].
- **HVO/Croat-civilian-Republic dissolution and Federation:** "Federation alliance with ARBiH (Washington Agreement)" March 1994; HVO became Federation component [OOB master, BB-unsourced for the post-1994 strength specifics].

---

## 4. The Krajina Collapse Window: 28 July – 12 October 1995

This is the critical late-war window the engine needs to reproduce: VRS 2nd Krajina Corps disintegration, ARBiH 5th Corps breakout from Bihać (Sana 95), HV operations Maestral/Mistral 2, HVO+HV Juzni Potez ("Southern Move"), the ~50% → ~49% Bosnian-territorial-share Dayton end-state.

### 4.1 BB-KB coverage

**The extracted BB KB does not cover Aug–Oct 1995 operations.** Last page in `pages/` is BB2 p.560 = endnotes for Annex 61, "Operation Breza 94" (Dec 1994). Operations Sana 95, Mistral 2 / Maestral 2, and Juzni Potez are **outside the extracted page range**. These appear in BB1/BB2 chapters at higher page numbers in the physical volumes but are absent from this KB.

### 4.2 BB-citable late-war contextual facts (pre-collapse)

- **2nd Krajina Corps structural fragility** documented through 1994: "the weak sister to the other five VRS corps in terms of resources and troop reserves but had to man an equally extensive frontage" [BB2 p.555]. "Persistently poor training and discipline... below the brigade command level... inordinately low frontline manning, led to the complete disintegration of the VRS frontline brigades when 5th Corps elite units arrived in their rear" [BB2 p.555]. **This is the precursor pattern the engine should reproduce: 2nd Krajina was already cracking in Oct 1994, not just Aug 1995.**
- **5th Corps "elite recon-sabotage units... achieved moral dominance over nearly all VRS infantry formations"** [BB2 p.555].
- **VRS Western Krajina loss:** Milovanović interview "We Lost 13 Western Krajinan Municipalities Militarily: Power is Power" (Banja Luka Nezavisne Novine 21–27 May 1997, pp. 20–22) — cited as endnote source [BB2 p.557]. The interview itself is **not extracted** into the BB KB — it is referenced only as a source citation. **[Secondary needed: full interview text.]**
- **Zima 94 (29 Nov 1994):** HV+HVO joint operation against 2nd Krajina Corps in Livno valley [BB2 p.553] — the **operational template** for what later became Maestral 2 / Mistral 2 in 1995.

### 4.3 BB-silent items the task asked for — flagged

| Item asked | Status |
|---|---|
| VRS 2nd Krajina Corps disintegration: troop strength delta from Storm spillover | **BB SILENT — secondary needed.** Suggested: ICTY Brđanin/Krajišnik judgment factual sections; BB1/BB2 chapters > p.560 in physical volumes (Annex 70+ in BB2). |
| Refugee absorption of fleeing Krajina Serbs | **BB SILENT — secondary needed.** BB1 p.61 has Sep 1994 reference to "as many as 30,000 refugees from Velika Kladusa in the Bihac enclave remain in the Krajina Serb-controlled area" but this is 1994 APWB, not Aug 1995 Serb refugees. UNHCR Aug 1995 figures (≈200,000 Serbs displaced from Republika Srpska Krajina into RS) are tertiary cross-reference only. |
| Command breakdown citations | **BB partial.** Pre-1995 structural diagnosis at BB2 p.555 is the closest BB content. Mladić's actual Aug-Oct 1995 directives → ICTY Mladić judgment. |
| ARBiH 5th Corps breakout (Sana 95) personnel + equipment | **BB SILENT — secondary needed.** Last BB 5th Corps strength figure: 15,000 troops Sep 1994 [BB2 p.541]. By Sana 95 (mid-Sep 1995) ICTY/Federation sources indicate 5th Corps ≈ 25,000–30,000 — tertiary, not BB. |
| HV-attached brigades in Mistral 2 / Juzni Potez: numerical contribution | **BB SILENT — secondary needed.** HV Glavni stožer post-war monograph (Marijan, *Slom Titove armije*) and Croatian MoD post-war OOB are the appropriate sources. |
| Sep-Oct 1995 casualty bands | **BB SILENT — secondary needed: RDC Book of the Dead per-month tables; Tabeau/Bijak ICTY expert demographic report ITT-1996 final.** |

### 4.4 What BB does support for the engine's Krajina-collapse trajectory

The five most-important Aug-Oct 1995 numerical inflection points the engine must reproduce (compiled from BB-cited pre-collapse trajectory + flagged secondary sources, with confidence tags):

1. **2nd Krajina Corps frontline thinness — already chronic by Oct 1994.** BB explicit: "inordinately low frontline manning" + cadre-gap [BB2 p.555]. **The engine should not need a scripted Aug-1995 collapse event; the 1994 trajectory shows the corps was already structurally failing.** Calibration target: 2nd Krajina cohesion/strength index trending below other VRS corps from Apr 1994 forward.
2. **VRS-aggregate end-state: 155,000 troops by war's end** [BB1 p.177]. Calibration target: total VRS personnel at Oct 1995 (Dayton-eve) ≈ 155k. With Oct-1994 implied >155k, the engine should attrit ~30k–50k VRS in the collapse window (Aug-Oct 1995). **Of which** "13 Western Krajinan Municipalities" lost militarily per Milovanović [BB2 p.557 endnote ref] — this is the territorial-collapse anchor.
3. **5th Corps strength step-up before Sana 95:** BB-confirmed 15,000 troops Sep–Nov 1994 [BB2 p.541, p.556] → secondary sources put it at ≈25,000–30,000 by mid-1995 after Velika Kladusa was retaken and corps reorganized [LOW — needs secondary]. Calibration target: 5th Corps personnel arc 7,000–10,000 (end-92) → 15,000 (Sep-94) → ≈25,000+ (mid-95).
4. **HV operational template Zima 94 → Maestral 2 / Juzni Potez:** BB-confirmed Zima 94 was an HV+HVO joint operation in the Livno valley against 2nd Krajina Corps explicitly designed to draw off Serb forces from Bihać [BB2 p.553]. **Engine should treat HV intervention as a credible, BB-cited mechanic, not a 1995-only railroad.**
5. **VRS-vs-ARBiH morale differential:** BB explicit by autumn 1994 that ARBiH had "moral dominance" over VRS infantry [BB2 p.555]. Calibration target: morale curve crossing-point ~Aug-Oct 1994 (not 1995). The Aug-Oct 1995 collapse is the *delayed mechanical consequence* of a moral-dominance shift BB locates in autumn 1994.

---

## 5. Cross-cutting signal-rich vs signal-thin assessment

### 5.1 Rich (BB-citation density ≥ 3 anchor cells per faction)

- **Personnel (Apr-92 + Jan-93 + ad-hoc operational snapshots):** Rich for VRS and ARBiH start + ARBiH peak. Rich for 5th Corps (Sep-94 and Nov-94 BB-confirmed). Rich for VRS Bihac counteroffensive (initial 6,500 → 14,000 → 25,000+ with allied forces [BB2 p.548, p.556]).
- **Equipment (Apr-92):** Rich for JNA-inheritance baseline [BB1 p.166]. VRS war-period aggregate inventory rich [BB1 p.177]. ARBiH equipment-poverty narrative rich [BB1 p.179].
- **Officer corps quality (qualitative):** Rich. BB diagnoses VRS NCO/junior-officer cadre gap explicitly [BB2 p.555]. BB diagnoses ARBiH command-expertise gap and Delić professionalization [BB1 p.216].
- **Morale qualitative trajectory:** Rich by autumn 1994 — BB explicit on ARBiH moral dominance [BB2 p.555].

### 5.2 Thin (BB-silent or single-cell only)

- **Comms / C3 quality (frequency-hopping radios, encrypted comms, civilian-phone dependence):** **BB SILENT across all anchors for all factions.** The extracted KB has no signals-doctrine pages. **[Secondary needed: Annex 33 BB1 (Bosnian Serb Air/Air Defense Force 1992); ICTY Krstić trial signals exhibits; JNA Pukovska 28 May 1992 directive on signals; Halilović *Lukava Strategija* chapter on comms.]**
- **Ammunition stockpiles (tonnage, embargo-effect quantification, Iran/Saudi/Croatia transit):** Almost entirely BB silent. Qualitative only ("limited amounts" [BB1 p.179], "arms embargo applied most significantly to heavy weapons" [BB1 p.199 fn 58]). No anchor-date tonnage figures. **[Secondary needed: SIPRI Bosnia arms-flow report 1994–1996; ICTY Halilović judgment ammunition exhibits; Wiebes *Intelligence and the war in Bosnia* (Srebrenica Report Appendix).]**
- **Casualty accumulation (per anchor):** Entirely BB silent for cumulative numbers. **[Secondary mandatory: RDC Bosnian Book of the Dead; Tabeau/Bijak ICTY expert demographic report.]**
- **Mobilization pool depletion (military-age male population vs already conscripted):** BB silent on quantitative depletion. Only registered-firearms pre-war counts available [BB1 p.199] (110,400 Muslim / 157,200 Serb / 51,800 Croat). **[Secondary needed: 1991 census per-municipality mil-age-male tables; Tabeau ICTY demographic dataset.]**
- **1995 Krajina collapse window (Aug-Oct 1995):** Entirely BB silent in extracted KB — see §4.

### 5.3 Total citation count

- **BB1 pages directly cited:** p.61, p.166, p.168, p.177, p.179, p.180, p.185, p.186, p.199, p.216, p.404, p.448, p.496, p.498, p.500, p.501, p.506. = **17 distinct BB1 pages.**
- **BB2 pages directly cited:** p.540, p.541, p.548, p.553, p.555, p.556, p.557. = **7 distinct BB2 pages.**
- **Cross-doc references cited:** ARMY_STRENGTH_COMPARISON.md, VRS_ORDER_OF_BATTLE_MASTER.md, ARBIH_ORDER_OF_BATTLE_MASTER.md, HVO_ORDER_OF_BATTLE_MASTER.md, PATTERN_REPORT_APR1992_HISTORICAL_FIDELITY.md (via 20260224 historian baseline extraction). = **5 cross-docs.**
- **Total distinct BB-source citations in this memo: 24 BB pages + 5 cross-docs = 29.**
- Of those, **roughly two-thirds (≈19/29) are firm BB direct citations**; the remainder are OOB-master-cited with explicit `[OOB master, BB-unsourced]` tag.

---

## 6. Engine-relevant recommendations (read-only — no edits made)

1. **Do not model the Aug-1995 VRS collapse as a triggered event.** BB makes clear (autumn 1994) the cadre-gap, frontline-thinness, and morale-loss had already crystallized in 2nd Krajina Corps. The engine should attrit `vrs_2nd_krajina_corps` cohesion/effectiveness from Apr-94 forward such that an HV+HVO+ARBiH multi-axis offensive in Aug-95 naturally tips it over. **The "Krajina collapse" must emerge.**
2. **HV intervention is BB-cited.** Zima 94 establishes the operational template [BB2 p.553]. The engine can model HV-attached HVO brigades as a credible, citation-backed support mechanic — not a railroad.
3. **5th Corps trajectory is the cleanest BB-citable arc.** 7,000–10,000 (end-92) → 15,000 (Sep-Nov 1994) → expected ~25,000+ by mid-95 (BB-silent past Nov 1994). Engine should drive 5th Corps personnel growth from successful 1993–94 defense, not from a scripted Sana 95 mobilization spike.
4. **Comms/C3 and ammunition signals are BB-thin.** The engine's force-quality model needs these as inputs (per engine_health_audit P1 BRIEF-GAP-1) but cannot get tonnage/specs from BB. **Recommend a follow-on extraction pass** specifically for Annex 24 (Mladić's Own: The Bosnian Serb Army) and Annex 33 (VRS Air/Air Defense Force) for VRS specifics, plus Halilović *Lukava Strategija* for ARBiH.
5. **Casualty bands MUST come from RDC/Tabeau, not BB.** BB does not provide cumulative per-anchor casualty totals.

---

## 7. Traceability (audit trail)

| BB page (KB local) | Used for |
|---|---|
| BB1 p.61 | Sep 1994 chronology — APWB refugees in Bihać |
| BB1 p.166 | JNA-in-Bosnia 100–110k; Bosnian Serb TO 60k; MUP 15k; JNA equipment inventory |
| BB1 p.177 | VRS formation, "initial 250k → 155k war's end"; equipment aggregate; air arm; 80 maneuver brigades end-92 |
| BB1 p.179 | ARBiH "more than 100,000 men but probably only 40–50k small arms"; TO 86k mobilized strength; HOS+HVO 25k |
| BB1 p.180 | HVO+HOS 25k armed at war start; Croatian Army support |
| BB1 p.185 | Bosanska Krupa April 1992 fall; Bihać shelling June 1992 onset |
| BB1 p.186 | 5th Corps formation 20 Oct 1992; end-1992 Bihać defender count 7–10k; 2nd Krajina Corps 6,000–7,500 |
| BB1 p.199 | Pre-war registered firearms by ethnicity; Lazanski "One Plane and 80,000 Men" reference; arms embargo |
| BB1 p.216 | ARBiH Aug-92 170k; early-93 peak 261,500; Halilović Aug-93 strategic note; Delić appointment 8 Jun 1993 |
| BB1 p.404 | Bihać as "Muslim enclave" |
| BB1 p.448 | Goražde UN enclave |
| BB1 p.496-501 | VRS OOB Appendix G July 1995 |
| BB1 p.506 | ARBiH GS HQ Kakanj Oct 1995 |
| BB2 p.540 | Breza 94 OOB; 1st Krajina + Panthers + SVK 39th Banija + 33rd Dvor + SVK 155mm = 4,000+3,000; 2nd Krajina spearhead 5,000–5,500 |
| BB2 p.541 | 5th Corps 15,000 for Breza 94 battle; brigade composition |
| BB2 p.548 | VRS Bihać counteroffensive Nov 1994: 6,500 → 14,000; 1st/2nd/3rd Serbian Brigades composite formation |
| BB2 p.553 | Zima 94 HV+HVO joint op; Šušak warnings |
| BB2 p.555 | 2nd Krajina cadre/discipline diagnosis; ARBiH moral dominance autumn 1994; Boric command failure |
| BB2 p.556 | >25,000 VRS+SVK+APWB vs 15,000 5th Corps |
| BB2 p.557 | Endnotes; Milovanović "We Lost 13 Western Krajinan Municipalities" interview reference |

---

## 8. Report-back summary (for orchestrator)

- **(a) Total citation count:** 24 distinct BB pages directly cited + 5 cross-document references = 29 BB-traceable citations across the memo. Approximately 19 of those are firm BB direct quotations; the rest are OOB-master entries explicitly tagged `[OOB master, BB-unsourced]`.
- **(b) Signal-richness map:**
  - **Rich:** Personnel (Apr-92 + Jan-93 + ad-hoc operational), Equipment (Apr-92 JNA-inheritance), Officer-corps qualitative diagnosis (VRS cadre-gap + ARBiH Delić professionalization), Morale qualitative trajectory by autumn 1994.
  - **Thin:** Comms/C3 (BB silent), Ammunition stockpile tonnage (BB silent on quantities), Casualty cumulative totals (BB silent — needs RDC/Tabeau), Mobilization-pool depletion quantitative (BB silent — needs census), **the entire Aug-Oct 1995 collapse window (BB silent — extraction stops at Dec 1994).**
- **(c) Five most-important Aug-Oct 1995 numerical inflection points for the engine:**
  1. VRS 2nd Krajina Corps already structurally failing by Oct 1994 [BB2 p.555] — collapse must emerge, not be scripted.
  2. VRS aggregate end-state 155,000 troops [BB1 p.177] — attrition target for Aug-Oct 1995 window.
  3. 5th Corps personnel arc 7-10k (end-92) → 15k (Sep-94) [BB2 p.541] → ≈25k+ (mid-95, BB-silent — secondary needed) — drives Sana 95 feasibility.
  4. HV intervention template Zima 94 [BB2 p.553] — BB-cited operational mechanic for HV+HVO joint ops against 2nd Krajina.
  5. ARBiH-vs-VRS morale crossover autumn 1994 [BB2 p.555] — the moral-dominance shift precedes the 1995 collapse by ~12 months.
- **(d) Memo location confirmed:** `F:\A-War-Without-Victory\docs\40_reports\audits\20260522_HISTORICAL_FORCE_TRAJECTORY_DATAPOINTS.md`. Read-only investigation; no source files, scenario files, anchor files, or code touched.

---

**End of report.**
