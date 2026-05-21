# SCRT — Painted-Target Band Anchor Proposals (Type 1 + Type 5)

**Date:** 2026-05-21
**Role:** `/scenario-creator-runner-tester`
**Scope:** Band-based historical anchor proposals for four painted-target epochs (Jan 1993, Apr 1994, Apr 1995, Oct 1995) covering Type 1 (faction area-share %) and Type 5 (attrition / exhaustion / displacement). Read-only. No scenario runs executed. No source / scenario / anchor file edits.
**Evidence base:** painted-compare diagnostics `tools/diagnostics/_phase5a_painted_compares/painted_{40w_jan1993,104w_apr1994,156w_apr1995,188w_oct1995}.txt` (runs n1597-n1599, ~4 weeks stale, pre-H1 / pre-strict-null wave; per `docs/40_reports/audits/20260519_LATE_WAR_188W_ANCHOR_RESIDUE.md` and the perf-wave commits the 40w hash is now `4368f50c00c464ad` / n1931 but no fresh painted compares have been generated).
**Source hierarchy (per skill required reading):** ICTY verdicts > Balkan Battlegrounds I-II > museum B/C/S > museum/Wikipedia. Each band cites its specific source; judgment calls are flagged inline as **[JUDGMENT]**.

**Design principle:** Bands must be **≥±2-3 percentage points** unless the historical reference is itself precise (Dayton 51/49 is treaty text; that floor justifies tighter bands at Oct 1995 only). Overfit is the failure mode — these anchors must not regress on innocuous determinism-safe refactors. Type 5 bands are explicitly **floors / directional asserts**, not point targets, because the historical KIA / displacement record carries large numerical confidence intervals.

---

## Epoch 1 — January 1993 (turn 40)

### Historical context

The Jan 1993 map is the **post-blitz steady state**: VRS has completed its territorial maximum and consolidated the Posavina corridor; ARBiH controls the central Bosnian core plus the eastern enclaves (Srebrenica, Žepa, Goražde, Bihać); the HVO-ARBiH war has not yet ignited (it begins April 1993, BB1 p.44, Lašva Valley). The Vance-Owen plan was presented this month proposing 10 provinces with roughly Serbs ~43% / Muslims ~28% / Croats ~25% / Sarajevo separate (`docs/40_reports/audits/20260517_HISTORIAN_OPEN_QUESTIONS_RESEARCH.md` H2, citing BB1 p.44). The painted target reflects de-facto military control, not the negotiated VOPP map.

### Type 1 — Faction area-share bands

| Faction | Painted (area-weighted) | Proposed band | Citation |
|---|---|---|---|
| RS | 65.1% | **62-68%** (±3) | Painted file `painted_control_jan1993.json` is the canonical target derived from BB1 maps p.222 (1993 dispositions). Burg & Shoup (BB-tier secondary) put VRS-held territory at "approximately two-thirds of Bosnia" through 1993 — the painted file is within that bound. |
| RBiH | 23.5% | **21-26%** (±2.5) | Same painted source. Burg & Shoup / BB1 p.215-216 ARBiH controls "central pocket plus eastern enclaves"; pre-HVO-war the central pocket boundary is still inclusive of CB. |
| HRHB | 11.3% | **9-13%** (±2) | Same painted source. BB1 p.170 (HVO formation) and p.180 (initial 25k HVO+HOS) imply HRHB still holds the Croat-majority western Herzegovina canton roughly co-extensive with the 1991 census majority municipalities. Pre-war HRHB held no contiguous territory; the 11% is the post-Cutileiro / pre-VOPP "Croat canton" footprint. |

**Why these widths:** Jan 1993 is the *most precise* of the four epochs because (a) the painted source is the highest-confidence file we have, (b) the front had stabilized for 6+ months after the VRS spring/summer 1992 offensive, and (c) the HVO-ARBiH war hadn't perturbed the central Bosnia faction split. ±2.5 to ±3 is justified.

### Type 5 — Attrition / exhaustion / displacement bands

| Metric | Faction | Proposed band | Citation |
|---|---|---|---|
| Cumulative KIA (military + civilian, faction-aligned) | RBiH | **≥ 25,000** (floor) | RDC Bosnian Book of the Dead (final 2007 tally) records ~31,000 ARBiH-side military KIA + ~38,000 Bosniak civilian deaths across the whole war; the ICTY-cited Tabeau/Bijak demographics paper (Karadžić IT-95-5/18, expert report) estimates ~45% of total war dead occurred in 1992 alone. Floor `≥25,000` is the cautious lower envelope at week-40 of total Bosniak war dead. **[JUDGMENT]** on the 1992-fraction split. |
| Cumulative KIA | RS | **≥ 8,000** (floor) | RDC final: ~22,000-24,000 Serb military+civilian dead total war. ~30-40% of those fell in 1992-early 1993 (BB1 p.215-216 describes the most intense combat as Apr-Oct 1992). Floor 8,000 is the cautious lower envelope. **[JUDGMENT]** on the split. |
| Cumulative KIA | HRHB | **≥ 2,000** (floor) | RDC final: ~7,800 Croat military+civilian war dead total. Pre-HVO-war (which begins Apr 1993) most Croat casualties were anti-VRS fronts and the Posavina front in May-Jun 1992. Floor 2,000 is conservative. **[JUDGMENT]**. |
| Cumulative displacement-events floor (full removal: displaced+killed+fled) | All factions combined | **≥ 1.2 million** | UNHCR/ICRC by end-1992: ~1.8M displaced or refugees from BiH; ICTY Karadžić TJ (IT-95-5/18-T) "before the end of 1992, more than 1.7 million people had been displaced." Week-40 (early Jan 1993) is 1-2 months prior; floor 1.2M is the conservative lower envelope. |
| Final exhaustion floor (faction-level monotonic, `war_exhaustion` field per Engine Invariants §8) | RBiH | **≥ 80** | The Jan 1993 ARBiH had survived Sarajevo siege turn 30+, the Posavina collapse, and the Srebrenica/Goražde enclave compression. Galic IT-98-29-T documents continuous Sarajevo shelling Apr 1992 - 1995. Floor must prove attrition occurred — exact value is a tuning knob, but it cannot be near zero. **[JUDGMENT]** on the magnitude. |
| Final exhaustion floor | RS | **≥ 50** | VRS had completed its territorial blitz and faced international sanctions / 713 enforcement. BB1 p.180-216 describe the VRS at this point as already worn from the spring/summer 1992 offensive momentum. Floor is lower than RBiH because the besieger's exhaustion accrues slower than the besieged's. **[JUDGMENT]**. |
| Final exhaustion floor | HRHB | **≥ 25** | Pre-HVO-war HRHB was holding the western Herzegovina canton against the JNA/VRS rump; lower exposure than the other two factions. **[JUDGMENT]**. |
| Brigade-count trend (w0 → w40) | RBiH | **monotone increasing** | BB1 p.216: "As early as August 1992 the ARBiH was able to field some 170,000 fighting men organized into 28 brigades… By early 1993 the ARBiH had reached its peak strength of 261,500 troops." Brigade count must grow w0→w40. |
| Brigade-count trend (w0 → w40) | RS | **flat-or-increasing** | BB1 p.166: "JNA in Bosnia: some 100,000 to 110,000 troops" at war start, becoming VRS in May 1992. Through Jan 1993 the VRS was still consolidating and absorbing JNA legacy; brigade count should not decline. |
| Brigade-count trend (w0 → w40) | HRHB | **monotone increasing** | BB1 p.170 / p.180: HVO formed from HZ-HB local militias plus HOS absorption (HOS dissolved 9 Aug 1992 per Kraljević assassination). The HVO order of battle expanded through 1992 into a corps structure. |

---

## Epoch 2 — April 1994 (turn 104)

### Historical context

April 1994 is **post-Washington Agreement** (signed 18 Mar 1994 — BB1 p.55). The HVO-ARBiH war has ended; the Federation has formed. VRS is at its territorial maximum holding ~70% of BiH including the eastern enclaves under siege (Srebrenica safe area declared Apr 1993, Goražde siege Apr 1994 underway — Karadžić IT-95-5/18-T documents the Apr 1994 Goražde offensive). NATO has begun air strikes (Feb 1994 Sarajevo market shelling response). Federation forces have not yet retaken territory. The painted file reflects this maximum-VRS / minimum-Federation state.

### Type 1 — Faction area-share bands

| Faction | Painted (area-weighted) | Proposed band | Citation |
|---|---|---|---|
| RS | 68.0% | **65-71%** (±3) | Painted `painted_control_apr1994.json`. Burg & Shoup put VRS-held territory at "approximately 70%" through 1993-mid-1994. Karadžić TJ describes the period Mar 1994 - Jul 1995 as the VRS "territorial steady-state." |
| RBiH | 21.7% | **19-24%** (±2.5) | Same painted source. Pre-Federation-counteroffensive (which begins Nov 1994 Kupres, BB1 p.62). ARBiH controlled the central pocket, the enclaves, and Bihać. |
| HRHB | 10.3% | **8-13%** (±2.5) | Same painted source. Federation framework means HRHB is now political-only on paper but still holds the western Herzegovina canton operationally. The 10.3% is essentially unchanged from Jan 1993 because Washington Agreement froze the HVO position. |

**Why these widths:** ±2.5 to ±3 is justified because the 1994 territorial state was *historically frozen* for the year (no major fronts moved between Mar 1994 Washington and Nov 1994 Kupres). Painted data confidence is high.

### Type 5 — Attrition / exhaustion / displacement bands

| Metric | Faction | Proposed band | Citation |
|---|---|---|---|
| Cumulative KIA (military + civilian, faction-aligned) | RBiH | **≥ 45,000** (floor) | RDC: ~70% of Bosniak war dead occurred by end-1994 per Tabeau/Bijak; ~38k civilian + ~31k military = ~69k total → ~48k by Apr 1994. Floor 45k is the conservative lower envelope. **[JUDGMENT]** on the temporal split. |
| Cumulative KIA | RS | **≥ 14,000** (floor) | RDC: ~22-24k Serb war dead total; ~60-65% accrued by spring 1994 (BB1 p.46-57 chronology; Karadžić TJ on 1992-1993 intensity). Floor 14k is conservative. **[JUDGMENT]**. |
| Cumulative KIA | HRHB | **≥ 5,500** (floor) | RDC: ~7,800 Croat war dead total; the bulk fell during 1992 (Posavina, Mostar east bank fall, Vukovar overspill) and 1993 (HVO-ARBiH war: Ahmići, Stupni Do, Mostar siege of east). By Apr 1994 ~70% had accrued. Floor 5,500 is conservative. **[JUDGMENT]**. |
| Cumulative displacement-events floor | All factions combined | **≥ 1.8 million** | UNHCR/ICRC reported 2.2M displaced/refugees from BiH peak (1993-1994). ICTY Karadžić TJ §§4944-4948 documents continuous post-1992 displacement (Prijedor camps, Eastern Bosnia ethnic cleansing). Floor 1.8M is the conservative w104 envelope. |
| Final exhaustion floor | RBiH | **≥ 180** | Two years of two-front war (Sarajevo siege, HVO-ARBiH war 1993, eastern enclave compression). Galic TJ + Karadžić TJ document continuous Sarajevo bombardment 1992-1995. Exhaustion floor must reflect this — **[JUDGMENT]** on the magnitude relative to a v0.9.x simulation calibration baseline. |
| Final exhaustion floor | RS | **≥ 130** | Two years of holding the largest territory under sanctions; Operation Koridor consolidation; international pressure post-Feb 1994 NATO ultimatum. **[JUDGMENT]**. |
| Final exhaustion floor | HRHB | **≥ 75** | The 1993 HVO-ARBiH war was the HRHB's most exhausting period. By Apr 1994 the war has ended but the canton is fully mobilized. **[JUDGMENT]**. |
| Brigade-count trend (w40 → w104) | RBiH | **monotone increasing** | BB1 p.216: ARBiH peaked at 261,500 in early 1993, "manpower figures would slowly decline in 1994 and 1995 due to combat losses." **Brigade count rose even as headcount drifted down** because the army reorganized from large mobilized formations into more professional brigade structure (BB1 p.216, OOB Master). |
| Brigade-count trend (w40 → w104) | RS | **monotone increasing or flat** | VRS formalized its corps structure through 1992-1993 and held it; brigade count should not contract w40 → w104. |
| Brigade-count trend (w40 → w104) | HRHB | **flat-or-modest-increase** | Post-Washington-Agreement HVO froze its order of battle within the Federation framework; minor expansion plausible. **[JUDGMENT]**. |

---

## Epoch 3 — April 1995 (turn 156)

### Historical context

April 1995 is **immediately post-Bihać encirclement** and pre-Operation-Storm. Federation has gained western Herzegovina (Cincar/Kupres operations Nov 1994 onward). VRS still holds eastern enclaves and the Posavina corridor; April 1995 is roughly 3 months before Srebrenica falls (Jul 1995). The painted file shows VRS area-share has begun to erode (~64% vs 68% in Apr 1994).

### Type 1 — Faction area-share bands

| Faction | Painted (area-weighted) | Proposed band | Citation |
|---|---|---|---|
| RS | 63.7% | **60-67%** (±3.5) | Painted `painted_control_apr1995.json`. The Apr 1995 territorial state is mid-erosion (post-Cincar/Kupres, pre-Storm); ±3.5 reflects the active-front uncertainty. Burg & Shoup post-Storm baseline is "~50% RS"; Apr 1995 is between Apr 1994 (~68%) and Aug 1995 post-Storm (~50%). |
| RBiH | 22.6% | **20-26%** (±3) | Same painted source. Federation has consolidated; ARBiH 5th Corps is breaking out of the Bihać pocket (BB1 chronology Mar-Apr 1995). |
| HRHB | 13.6% | **11-17%** (±3) | Same painted source. HRHB area-share is *growing* through HV/HVO Cincar (Nov 1994) and Operation Leap-1 (Apr 1995, BB1 p.65). The +2pp vs Jan 1993 reflects western Herzegovina gains. |

**Why these widths:** Apr 1995 is the **least stable** of the four targets because the front was actively moving. ±3 to ±3.5 is justified. The painted source itself carries the most uncertainty here.

### Type 5 — Attrition / exhaustion / displacement bands

| Metric | Faction | Proposed band | Citation |
|---|---|---|---|
| Cumulative KIA | RBiH | **≥ 55,000** (floor) | RDC: ~80% of Bosniak war dead by Apr 1995. ~69k total → ~55k by w156. Floor conservative. **[JUDGMENT]**. |
| Cumulative KIA | RS | **≥ 17,000** (floor) | RDC: ~75-80% of Serb war dead by Apr 1995 (pre-Storm); ~22-24k total → ~17k floor. **[JUDGMENT]**. |
| Cumulative KIA | HRHB | **≥ 6,500** (floor) | RDC: ~7,800 Croat total; ~85% accrued by Apr 1995 (pre-Storm, pre-Mistral); floor 6,500. **[JUDGMENT]**. |
| Cumulative displacement-events floor | All factions combined | **≥ 1.9 million** | Pre-Srebrenica-fall and pre-Krajina-Serb-exodus. ICTY Karadžić TJ + UNHCR cumulative. Floor 1.9M conservative. |
| Final exhaustion floor | RBiH | **≥ 260** | Three years of war. **[JUDGMENT]**. |
| Final exhaustion floor | RS | **≥ 200** | Three years of war + Federation counteroffensive Nov 1994 - Apr 1995. **[JUDGMENT]**. |
| Final exhaustion floor | HRHB | **≥ 110** | Three years of war + active offensive operations. **[JUDGMENT]**. |
| Brigade-count trend (w104 → w156) | RBiH | **monotone increasing** | OOB Master: ARBiH 1994 ~165-180k → 1995 ~180-200k; brigade-level continues to grow. |
| Brigade-count trend (w104 → w156) | RS | **flat-or-decreasing** | BB1 p.177: VRS "falling to 155,000 troops by war's end." Decline begins ~1994. Brigade count should plateau or contract. |
| Brigade-count trend (w104 → w156) | HRHB | **flat-or-modest-increase** | HVO held steady ~50-55k through 1995 per OOB Master. **[JUDGMENT]** on directionality. |

---

## Epoch 4 — October 1995 (turn 188)

### Historical context

October 1995 is **immediately post-Operation-Storm (Aug 1995), post-Mistral (Sep 1995), and during the final Federation counteroffensive in western Bosnia.** Dayton negotiations are underway (initialed 21 Nov 1995, signed 14 Dec 1995). The Contact Group 51/49 envelope (BB1 p.57, "51 percent of Bosnian territory for the Croat-Muslim federation") was the *negotiated* target; the *actual* Oct 1995 map per `painted_control_oct1995.json` shows RS still holding ~49% area-weighted (the war ended approximately on the Contact Group line, which is why Dayton ratified it).

The painted file ALSO reflects HVO **regaining western Krajina** post-Storm via Operation Mistral and Operation Sana — Bosansko Grahovo, Glamoč, Kupres, Mrkonjić Grad, Šipovo, Jajce, Drvar all shifted HRHB-controlled per painted (BB1 chronology Sep-Oct 1995).

### Type 1 — Faction area-share bands

| Faction | Painted (area-weighted) | Proposed band | Citation |
|---|---|---|---|
| RS | 48.8% | **47-51%** (±1.5) | Dayton/Contact Group: **51% Federation / 49% RS** by treaty text. BB1 p.57 documents the May 1994 Contact Group proposal. The Oct 1995 painted file converges to within ~2 points of treaty. ±1.5 is **defensible** because the painted target itself is constrained by the negotiated map. |
| RBiH | 30.7% | **28-33%** (±2.5) | Painted file. The Federation 51% is split RBiH/HRHB; the Oct 1995 split per painted is ~30.7%/20.6%, reflecting the post-Mistral expansion of the HVO/HRHB. |
| HRHB | 20.6% | **18-23%** (±2.5) | Painted file. HVO regained ~10pp through Storm/Mistral/Sana operations (BB1 p.74-75 chronology). |

**Why these widths:** Oct 1995 has **two reference targets** — the painted file (operational reality) and the Contact Group 51/49 envelope (treaty text). RS band can be tight (±1.5) because both targets agree to within 2pp. RBiH/HRHB bands are wider (±2.5) because the Federation internal split was operationally fluid through Sep-Oct 1995.

### Type 5 — Attrition / exhaustion / displacement bands

| Metric | Faction | Proposed band | Citation |
|---|---|---|---|
| Cumulative KIA | RBiH | **≥ 60,000** (floor) | RDC: ~69k Bosniak total war dead; ~88-90% by Oct 1995 (Srebrenica falls Jul 1995, adding ~8k to the floor). **[JUDGMENT]** on the precise fraction. |
| Cumulative KIA | RS | **≥ 20,000** (floor) | RDC: ~22-24k Serb total; ~88-90% by Oct 1995 (Storm causalties Aug 1995 add to floor). **[JUDGMENT]**. |
| Cumulative KIA | HRHB | **≥ 7,000** (floor) | RDC: ~7,800 Croat total; ~90% by Oct 1995. **[JUDGMENT]**. |
| Cumulative displacement-events floor | All factions combined | **≥ 2.1 million** | Includes Krajina Serb exodus Aug 1995 (~200k displaced, ICTY Gotovina TJ context, BB1 p.71) and Srebrenica/Žepa survivors Jul 1995. Floor 2.1M conservative envelope. UNHCR 1995 mid-year figure was ~2.7M total displaced from BiH. |
| Final exhaustion floor | RBiH | **≥ 320** | Three-and-a-half years of war; Sarajevo siege from start to Dayton; the most exhausted of the three. **[JUDGMENT]**. |
| Final exhaustion floor | RS | **≥ 260** | Three-and-a-half years of war + Storm/Mistral collapse of western front. **[JUDGMENT]**. |
| Final exhaustion floor | HRHB | **≥ 150** | Three-and-a-half years + active offensives Aug-Oct 1995. **[JUDGMENT]**. |
| Brigade-count trend (w156 → w188) | RBiH | **flat-or-modest-increase** | OOB Master 1995 ~180-200k; war's end manpower decline began per BB1 p.216 "manpower figures would slowly decline." Brigade count likely stable. **[JUDGMENT]**. |
| Brigade-count trend (w156 → w188) | RS | **monotone decreasing** | BB1 p.177: "falling to 155,000 troops by war's end." Post-Storm losses include 2nd Krajina Corps disintegration. Brigade count should decline w156 → w188. |
| Brigade-count trend (w156 → w188) | HRHB | **flat-or-increasing** | HVO conducted Storm/Mistral/Sana through Aug-Oct 1995; OOB stable to expanding. |

---

## Current sim vs proposed bands — delta table

Evidence base: painted-compare files n1597 (40w), n1598 (104w), n1599 (188w), with the apr1995 sub-checkpoint extracted from the same 188w run. **All deltas computed against area-weighted painted percentages.**

### Type 1 bands (faction area-share %)

| Epoch | Faction | Proposed band | Sim (area-weighted) | Delta from band midpoint | Status |
|---|---|---|---|---|---|
| Jan 1993 (w40) | RS | 62-68% | 64.5% | within band | **PASS** (may be over-tight if a wider band were chosen) |
| Jan 1993 (w40) | RBiH | 21-26% | 23.0% | within band | **PASS** |
| Jan 1993 (w40) | HRHB | 9-13% | 12.5% | within band (near upper edge) | **PASS** (marginal) |
| Apr 1994 (w104) | RS | 65-71% | 52.5% | **−15.5 pp** below band floor | **FAIL by >5%** — primary calibration gap |
| Apr 1994 (w104) | RBiH | 19-24% | 36.2% | **+12.2 pp** above band ceiling | **FAIL by >5%** — primary calibration gap |
| Apr 1994 (w104) | HRHB | 8-13% | 11.3% | within band | **PASS** |
| Apr 1995 (w156) | RS | 60-67% | 50.6% | **−13.0 pp** below band floor | **FAIL by >5%** — same gap class as Apr 1994 |
| Apr 1995 (w156) | RBiH | 20-26% | 38.2% | **+15.2 pp** above band ceiling | **FAIL by >5%** — same gap class as Apr 1994 |
| Apr 1995 (w156) | HRHB | 11-17% | 11.2% | within band (lower edge) | **PASS** (marginal — note HRHB is failing to *grow* post-Cincar) |
| Oct 1995 (w188) | RS | 47-51% | 50.6% | within band | **PASS** |
| Oct 1995 (w188) | RBiH | 28-33% | 38.2% | **+8.2 pp** above band ceiling | **FAIL by >5%** |
| Oct 1995 (w188) | HRHB | 18-23% | 11.2% | **−9.4 pp** below band floor | **FAIL by >5%** — HRHB missing the Storm/Mistral/Sana gains |

**Pattern observation:** The sim's RS territorial collapse 1994-1995 (Drina, Herzegovina, parts of Posavina) and its HRHB failure-to-expand in 1995 are the **dominant calibration gaps**. By Oct 1995 RS area-share has converged back to within band (because the historical decline meets the simulated decline), but the *path* to that convergence is wrong — RBiH overshoots and HRHB undershoots throughout 1994-1995.

### Type 5 bands (attrition / exhaustion / displacement)

| Epoch | Metric | Proposed band | Sim value | Status |
|---|---|---|---|---|
| Jan 1993 | RBiH KIA floor (≥25,000) | ≥25k | **not in painted-compare files** | **CAN'T EVALUATE — need fresh run with `final_save.faction_totals.cumulative_kia`** |
| Jan 1993 | RS KIA floor (≥8,000) | ≥8k | **not in painted-compare files** | **CAN'T EVALUATE — same** |
| Jan 1993 | HRHB KIA floor (≥2,000) | ≥2k | **not in painted-compare files** | **CAN'T EVALUATE — same** |
| Jan 1993 | Combined displacement-events floor (≥1.2M) | ≥1.2M | **not in painted-compare files** | **CAN'T EVALUATE — need `cumulative_displaced` summation** |
| Jan 1993 | RBiH exhaustion floor (≥80) | ≥80 | **not in painted-compare files** | **CAN'T EVALUATE — need `war_exhaustion.RBiH`** |
| Jan 1993 | RS exhaustion floor (≥50) | ≥50 | **not in painted-compare files** | **CAN'T EVALUATE — same** |
| Jan 1993 | HRHB exhaustion floor (≥25) | ≥25 | **not in painted-compare files** | **CAN'T EVALUATE — same** |
| Jan 1993 | RBiH brigade-count trend (monotone increasing) | monotone↑ | **not in painted-compare files** | **CAN'T EVALUATE — need `formation_delta.brigades_by_faction` weekly trace** |
| Jan 1993 | RS brigade-count trend (flat-or-increasing) | flat or ↑ | **not in painted-compare files** | **CAN'T EVALUATE — same** |
| Jan 1993 | HRHB brigade-count trend (monotone increasing) | monotone↑ | **not in painted-compare files** | **CAN'T EVALUATE — same** |
| Apr 1994 | (all 10 Type 5 metrics) | as proposed | **not in painted-compare files** | **CAN'T EVALUATE — same data gap** |
| Apr 1995 | (all 10 Type 5 metrics) | as proposed | **not in painted-compare files** | **CAN'T EVALUATE — same** |
| Oct 1995 | (all 10 Type 5 metrics) | as proposed | **not in painted-compare files** | **CAN'T EVALUATE — same** |

**All 40 Type 5 metrics are CAN'T EVALUATE** from the existing painted-compare files because those files report only OSID-level political control, not faction totals (KIA, exhaustion, brigades, displacement). To evaluate them at the current calibration tip (n1931 / `4368f50c00c464ad`), a fresh 188w scenario run is required with an enriched diagnostic that extracts:
- `final_save.faction_totals.cumulative_kia[faction]`
- `final_save.civilian_casualties[faction]`
- `final_save.war_exhaustion[faction]`
- `final_save.osids.{cumulative_displaced}` summed per faction
- `final_save.formations` weekly brigade counts by faction

That diagnostic should be added to `tools/diagnostics/painted_vs_sim_compare.ts` (or a sibling script) before the bands can be sign-off material.

---

## Summary by epoch

| Epoch | Type 1 bands proposed | Type 1 PASS | Type 1 FAIL >5% | Type 5 bands proposed | Type 5 CAN'T EVAL |
|---|---|---|---|---|---|
| Jan 1993 | 3 | 3 (1 marginal) | 0 | 10 | 10 |
| Apr 1994 | 3 | 1 | 2 | 10 | 10 |
| Apr 1995 | 3 | 1 (marginal) | 2 | 10 | 10 |
| Oct 1995 | 3 | 1 | 2 | 10 | 10 |
| **Total** | **12** | **6** | **6** | **40** | **40** |

**6 of 12 Type 1 bands FAIL by >5%** — concentrated in the Apr 1994 / Apr 1995 (RS collapse, RBiH overshoot) and Oct 1995 (HRHB undershoot) lanes. Jan 1993 is fully clean. **All 40 Type 5 bands are unevaluable** until a fresh run with enriched diagnostics is generated.

---

## Caveats and judgment-call flags

1. **Painted-compare data is ~4 weeks stale.** All Type 1 deltas use n1597-n1599. The H1 / strict-null / sector-perf wave at n1900-n1931 claims byte-identical preservation, so deltas should hold approximately, but a fresh painted-compare against `4368f50c00c464ad` is the safe re-validation.
2. **RDC casualty splits by year are [JUDGMENT].** The RDC publishes a final tally but does not officially split by year. The temporal fractions used in Type 5 KIA floors are derived from Tabeau/Bijak demographic analysis cited in ICTY Karadžić IT-95-5/18-T, plus BB1 chronological intensity narrative. They are conservative lower envelopes, not point estimates.
3. **Exhaustion-floor magnitudes are [JUDGMENT] tuning numbers.** The Engine Invariants §8 `war_exhaustion` is a monotonic scalar; no historical source dictates "RBiH exhaustion = X by Apr 1994." The proposed floors assert "non-trivially exhausted, attrition occurred," not point values. They will need a one-time calibration of the magnitudes against current sim output, then locked as floors.
4. **The Apr 1995 painted file is the lowest-confidence target.** The front was actively moving Mar-Apr 1995. Bands are widened to ±3 to ±3.5 accordingly.
5. **HRHB area-share is the metric most likely to reveal a Type 1 anchor working differently from how `historical_anchors.ts` works today.** HRHB Oct 1995 underperforms by ~9pp area-weighted, but the OSID-count delta is only −33. The mismatch is concentrated in western Krajina (Drvar, Glamoč, Kupres, Šipovo, Mrkonjić Grad, Jajce — all painted HRHB, all sim RS per `painted_188w_oct1995.txt`). This is the **Operation Mistral / Operation Sana gap** and is the highest-priority Type 1 finding for follow-up.
6. **No bands tighter than ±1.5pp are proposed.** Only Oct 1995 RS gets ±1.5 because Dayton 51/49 is treaty text. All other bands are ≥±2pp.

---

## Next steps (conceptual, not implementation)

1. **Fresh painted-compare against `4368f50c00c464ad`** to confirm deltas haven't drifted since n1599. Cost: one 188w run + the existing diagnostic.
2. **Enriched diagnostic** writing per-faction cumulative KIA, exhaustion, displacement, and brigade-count trends to the painted-compare output, so Type 5 bands become evaluable.
3. **Lock the Type 1 bands first** as `historical_band_anchors.ts` (sibling of `historical_anchors.ts`), then evaluate Type 5 magnitudes against a reference run and freeze the floors. This sequence avoids the calibration-magnitudes-then-bands trap (Type 5 floors must trail Type 1 because Type 1 controls the territorial state that drives Type 5 dynamics).
4. **Prioritize the RS-collapse / RBiH-overshoot 1994-1995 gap.** Six of the twelve Type 1 bands fail by >5pp and all six are in this cluster. The Drina, Herzegovina, and parts of Posavina are RBiH-overrunning instead of RS-holding — this is the dominant calibration story.
5. **HRHB Operation-Mistral/Sana gap is the second priority.** Western Krajina (Drvar, Glamoč, Kupres) is painted HRHB but sim RS at Oct 1995. The painted target requires those municipalities to flip to HRHB through 1995 ops.

**Handoff candidates:** `/operations-expert` for the Drina / Posavina / Mistral-Sana operation chains; `/historian` for any band-citation gaps flagged as **[JUDGMENT]** above; `/scenario-harness-engineer` for the enriched diagnostic; `/gameplay-programmer` for the Type 5 anchor wiring once magnitudes are locked.
