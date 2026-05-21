# BB1/BB2 Anchor Extraction — Bosnian Krajina Collapse, Aug–Oct 1995

**Author:** balkan-battlegrounds-historical-extractor
**Date:** 2026-05-21
**Scope:** Read-only deep extract of municipal flips from VRS to ARBiH/HVO between Operation Storm spillover (~w172, 4 Aug 1995) and the 5 Oct 1995 ceasefire (~w184), restricted to the Bosnian Krajina theatre as it played in Bosnia (NOT RSK/Croatia proper).
**Primary sources:** BB1 Chapters 91–93 (pp. 416–428, Maestral / Sana 95 / Juzni Potez / End Game), BB1 Chapter 87 (pp. 401–403, Ljeto 95), BB2 Annex 50 (pp. 484–486, Donji Vakuf 1994).
**Purpose:** Propose new historical anchors for `data/source/calibration/painted_control_oct1995.json`; current sim shows RS at 50% area vs painted 49%, but with RBiH +37 / HRHB −33 OSID miscount in joint-ops geometry. This memo provides the source-of-record for the western Bosnia segment of that anchor set.
**Out of scope:** Source/scenario/anchor edits; FORAWWV.md edits; any `src/sim/combat/*` modifications (Codex is editing in parallel).

---

## Master Timeline (BB1 pp. 416–428)

| Date 1995 | Approx week | Event | Operation | BB cite |
|---|---|---|---|---|
| 25–29 Jul | w171 | HV/HVO capture Bosansko Grahovo (28 Jul) + Glamoč (29 Jul) | Ljeto 95 | BB1 pp.401–403 |
| 4 Aug | w172 | Oluja begins (Croatian Krajina, NOT Bosnia proper) | Oluja | BB1 p.407 |
| 11–12 Aug | w173 | VRS 2nd Krajina counterattack at Bosansko Grahovo repulsed | — | BB1 p.416 |
| 8 Sep | w177 | Maestral phase 1 opens: OG North breaks VRS line at Mliniste/Vitorog | Maestral | BB1 pp.417–418 |
| 9–10 Sep | w177 | Pribelja, Jastrebnjak captured; HV 4th Guards advances 5 km | Maestral | BB1 p.418 |
| 10 Sep | w177 | ARBiH 7th Corps opens Donji Vakuf offensive (Mt. Komar) | (Sana 95 supporting) | BB1 p.419 |
| 12 Sep | w178 | HV/HVO 1st HVO Guards Brigade enters Šipovo | Maestral phase 2 | BB1 p.418 |
| 13 Sep | w178 | **Jajce restored to HVO** (2nd HVO Guards Brigade) | Maestral | BB1 p.418 |
| 13 Sep | w178 | **Donji Vakuf falls** (VRS 30th Div pulls back to avoid envelopment); ARBiH Sana 95 opens — Grabež breakthrough | Sana 95 / Maestral | BB1 p.419 |
| 14 Sep | w178 | **Drvar falls** to HV OG South/West (Maestral phase 3); Kulen Vakuf falls | Maestral | BB1 pp.418–419 |
| 15 Sep | w178 | **Bosanski Petrovac falls** (ARBiH 502nd Mountain Brigade); 5th Corps links HV at Ostrelj pass | Sana 95 | BB1 p.419 |
| 17 Sep | w178 | **Ključ falls** (ARBiH 501st + 510th Brigades); OG North takes **Bosanska Krupa** | Sana 95 | BB1 p.419 |
| 18 Sep | w179 | HV Una 95 fails at Una River (Bosanska Dubica, Bosanska Kostajnica) | Una 95 | BB1 p.420 |
| 20–22 Sep | w179 | VRS Prijedor OG counterstroke recaptures ground SE of Sanski Most, ARBiH OG Center pushed back ~6 km | VRS counteroffensive | BB1 p.420 |
| 23 Sep – 6 Oct | w179–w181 | Arkan + 65th Protection + 16th Krajina Mtz counterattack toward Bosanska Krupa/Otoka; OG North pushed back up to 15 km, then halted as VRS shifts reserves to Mrkonjić | VRS counteroffensive | BB1 p.426 |
| 1 Oct | w180 | ARBiH OG South within 3 km of Mrkonjić Grad (Manjača foothills) | Sana 95 follow-on | BB1 p.426 |
| 8 Oct | w181 | Juzni Potez opens: HV/HVO 1st HGZ + 4th + 7th Guards attack Mrkonjić Grad | Juzni Potez (Southern Move) | BB1 p.427 |
| 9–10 Oct | w182 | **Mrkonjić Grad falls** to HV/HVO 4th Guards (3rd Serbian Bgde defenses cracked); Podrasnica + Cadjavica taken | Juzni Potez | BB1 p.427 |
| 10 Oct | w182 | **Sanski Most falls** to ARBiH 5th Corps OG Center (502nd + 510th Brigades over 15th Bihać + 17th Ključ) | Sana 95 final | BB1 p.428 |
| 11 Oct | w182 | HV withdraws, HVO Guards push to S. Manjača (25 km from Banja Luka) | Juzni Potez | BB1 p.428 |
| 12 Oct | w182 | National ceasefire scheduled morning of 12 Oct; Dudakovic continues offensive | — | BB1 p.428 |
| 12–20 Oct | w182–w184 | Seesaw fighting NE of Sanski Most; 43rd Mtz Brigade rallies; "fighting faded to a fruitless finish on 20 October" | — | BB1 p.428 |

---

## Section 1 — Anchor Proposals (Aug–Oct 1995 Krajina flips)

Per painted_control_apr1995.json vs painted_control_oct1995.json deltas, restricted to municipalities BB explicitly covers in the Maestral/Sana 95/Juzni Potez narrative.

| # | Municipality | OSID(s) | Flip from | Flip to | Approx week | Operation | BB page | Confidence |
|---|---|---|---|---|---|---|---|---|
| 1 | Glamoč | op:glamoc:halapic, op:glamoc:stekerovci_2 | RS | HRHB | w171 (29 Jul) | Ljeto 95 | BB1 pp.402–403 | HIGH — "HVO troops entered Glamoc the next day" (i.e. 29 Jul, after 28 Jul fall of Grahovo). Glamoc_2/kovacevci/pribelja/vidimlije already HRHB in painted_apr1995 (set during Ljeto 95 phase 1). The two remaining (halapic + stekerovci) likely consolidated during the post-Maestral mop-up since both lie on the Glamoc-Mliniste axis touched by Maestral OG North. |
| 2 | Šipovo | op:sipovo:brdjani, op:sipovo:gornji_mujdzici_2, op:sipovo:pribeljci_2, op:sipovo:sipovo_2, op:sipovo:volari_2 | RS | HRHB | w178 (12 Sep) | Maestral (phase 2) | BB1 p.418 | HIGH — "the reinforced 1st HVO Guards Brigade then broke into Sipovo, supported on the right by 1st HGZ" (12 Sep). Pribelja village explicitly named as 1st HGZ seizure on Maestral day-1 (9 Sep) — note: BB-Pribelja is in Glamoč municipality (op:glamoc:pribelja); painted shows that as HRHB in apr1995 already. op:sipovo:pribeljci_2 is the separate Sipovo settlement. |
| 3 | Jajce | op:jajce:jajce_3, op:jajce:barevo_2, op:jajce:bravnice, op:jajce:grdovo, op:jajce:jezero_2, op:jajce:lupnica, op:jajce:prisoje, op:jajce:vinac_2 | RS | HRHB (grdovo→RBiH) | w178 (13 Sep) | Maestral | BB1 p.418 | HIGH — "On 13 September, Jajce — the jewel of the operation — was restored to Croat hands, avenging its loss to the VRS in 1992." 2nd HVO Guards Brigade. Note painted_oct1995 retains divicani_2 + kruscica as RS (residual VRS pockets near Vrbas) and grdovo as RBiH (ARBiH 7th Corps eastern-flank touchpoint via Vlašić ridge) — both consistent with the BB account of the salient being "pinched out" north of Jajce. |
| 4 | Drvar (Titov Drvar) | op:titov_drvar:drvar_2, op:titov_drvar:prekaja_2, op:titov_drvar:sipovljani_2 | RS | HRHB | w178 (14 Sep) | Maestral (phase 3) | BB1 pp.418–419 | HIGH — "the VRS decided to call it quits and pulled out of the town" on 14 Sep. HV OG South + 7th Guards battle group + OG West convergent; ARBiH 5th Corps threatened from north toward Bos. Petrovac. Captured by HV (HRHB in painted = HV-as-HVO collapse). |
| 5 | Donji Vakuf | op:donji_vakuf:donji_vakuf_2, op:donji_vakuf:babin_potok_2, op:donji_vakuf:jemanlici, op:donji_vakuf:komar_2, op:donji_vakuf:korenici, op:donji_vakuf:kutanja, op:donji_vakuf:oborci_2, op:donji_vakuf:pribraca_2, op:donji_vakuf:prusac_2, op:donji_vakuf:torlakovac_2 | RS | RBiH | w178 (13 Sep) | ARBiH 7th Corps (Sana 95 northern flank) | BB1 p.419 | HIGH — "General Zec at last had to give up Donji Vakuf and swing his right flank back toward Jajce on 13 September to avoid envelopment." Captured by 7th Corps (Brigadier Alagic, 77th Division spearhead; 17th Krajina, 707th Mountain, 727th/705th/706th supporting). Direct cite of "give up Donji Vakuf… 13 September". |
| 6 | Bosanski Petrovac | op:bosanski_petrovac:bosanski_petrovac_2, op:bosanski_petrovac:dobro_selo_2, op:bosanski_petrovac:jasenovac_2, op:bosanski_petrovac:kolonic_2, op:bosanski_petrovac:krnjeusa, op:bosanski_petrovac:prkosi, op:bosanski_petrovac:vodjenica, op:bosanski_petrovac:vrtoce | RS | RBiH | w178 (15 Sep) | Sana 95 (5th Corps OG South) | BB1 p.419 | HIGH — "the 502nd Brigade marched into Petrovac on 15 September. The 5th Corps then linked up to HV forces at the Ostrelj pass". General Dudakovic (5th Corps), 502nd Mountain Brigade. |
| 7 | Ključ | op:kljuc:kljuc_2, op:kljuc:hadzici, op:kljuc:krasulje_2, op:kljuc:sanica_2 | RS | RBiH | w178 (17 Sep) | Sana 95 (5th Corps OG South) | BB1 p.419 | HIGH — "From Petrovac, the 501st and 510th Brigades took over the pursuit, driving on toward Kljuc, which they entered two days later" (i.e. 17 Sep). Note painted retains cadjavica + donje_ratkovo_2 as RS (Mrkonjic-side Ključ municipality settlements — consistent with BB Juzni Potez moving on cadjavica via Mrkonjić, not Ključ town axis). donji_vrbljani_2 in painted = HRHB; this is the southwestern Ključ slice nearer the Maestral axis (plausible HV/HVO crossover via OG South Drvar→Ključ-southwest push). |
| 8 | Bosanska Krupa | op:bosanska_krupa:arapusa_2, op:bosanska_krupa:donji_dubovik_2, op:bosanska_krupa:gornja_suvaja, op:bosanska_krupa:ivanjska_2, op:bosanska_krupa:jasenica_2, op:bosanska_krupa:veliki_badic, op:bosanska_krupa:vranjska_2 (jezerski_2 + otoka_2 already RBiH in apr1995) | RS | RBiH | w178 (~17 Sep) | Sana 95 (5th Corps OG North) | BB1 p.419 | HIGH — "yielded Krupa to the combined weight of the 5th Corps' 503rd, 505th, and 511th Brigades" — OG North attack widened on 15 Sep, Tomanic's two brigades around Krupa+Otoka contained for two days then collapsed. |
| 9 | Sanski Most | op:sanski_most:sanski_most_2, op:sanski_most:budimlic_japra_2, op:sanski_most:ilidza_2, op:sanski_most:jelasinovci, op:sanski_most:kljevci, op:sanski_most:lusci_palanka_2, op:sanski_most:ostra_luka, op:sanski_most:skucani_vakuf_2, op:sanski_most:stari_majdan | RS | RBiH | w182 (10 Oct) | Sana 95 final (OG Center) | BB1 p.428 | HIGH — "the Bosnians seized the town" on 10 October; 502nd + 510th Brigades crushed 15th Bihac + 17th Ključ Brigades; 43rd Mtz + 11th Dubica tried and failed to halt them at the outskirts. Note donja_kozica retained as RS in painted_oct1995 — consistent with BB "OG Center suddenly took a sharp check, however, when the undaunted 43rd Motorized Brigade rallied northeast of Sanski Most" (pocket NE of town never cleared before 20 Oct stall). |
| 10 | Mrkonjić Grad | op:mrkonjic_grad:mrkonjic_grad_2, op:mrkonjic_grad:baljvine_2, op:mrkonjic_grad:bjelajce_2, op:mrkonjic_grad:gerzovo_2, op:mrkonjic_grad:majdan_2, op:mrkonjic_grad:podrasnica_2 | RS | HRHB | w182 (10 Oct) | Juzni Potez (Southern Move) | BB1 p.427 | HIGH — "Mrkonjic Grad fell after the 4th Guards Brigade apparently broke through the 3rd Serbian Brigade's defenses southwest of town"; HV OG East under HVO Brig. Glasnović; 4th + 7th Guards + 1st HGZ + 3 HVO Guards. Podrasnica + Cadjavica explicitly named as next-day captures. Note Cadjavica in painted_oct1995 = RS under op:kljuc:cadjavica — this is BB's "road junction of Cadjavica" but the painter places that exonym-shared OSID in Ključ municipality, NOT Mrkonjic; conflict flagged below in §2. gerzovo_2 (north of town toward Mliniste) is also explicit Maestral-then-Juzni-Potez approach axis. |
| 11 | Bosanski Novi | op:bosanski_novi:krslje_2, op:bosanski_novi:matavazi_2 | RS | RBiH | w179 (~21 Sep, then partial retention) | Sana 95 OG North (503rd, 505th) | BB1 p.420 | MEDIUM — "The 503rd and 505th Brigades of OG 'North' had more success, grinding forward against stiff resistance around Bosanski Novi and in the Majdan Mountains toward Ljubija and Prijedor." Note majority of Bosanski Novi (blagaj_japra, dobrljin_2, novi_grad_3, poljavnice, suhaca_4, svodna_2) remained RS in painted_oct1995 — consistent with the VRS counterattack of 23 Sep–6 Oct rolling back OG North up to 15 km. The two flipped OSIDs (krslje_2, matavazi_2) sit on the southern margin near the Una/Majdan axis, plausibly the residual ARBiH foothold after the counterstroke. |

---

## Section 2 — Secondary candidates (painted-control shows flip, BB does not cover precisely)

These OSIDs appear in `painted_control_oct1995.json` as RS → non-RS but BB1/BB2 narrative doesn't pinpoint settlement-level capture. Mostly small villages on the periphery of operations covered above.

| Municipality | OSID(s) | Painted Oct 1995 | BB coverage gap | Confidence |
|---|---|---|---|---|
| Kupres | op:kupres:bucovaca, donji_malovan, goravci, kupres_2, novo_selo_2 | HRHB | Already HRHB in apr1994/apr1995 painted — BB2 p.486 confirms HVO took Kupres in November 1994 ("the Croats apparently took over Kupres without fully informing their Bosnian Army counterparts"). **NOT an Aug–Oct 1995 flip — exclude from Krajina-collapse anchor set.** | HIGH (exclusion) |
| Ključ — Cadjavica | op:kljuc:cadjavica | RS | BB1 p.427 names "road junction of Cadjavica" as HV 1st HGZ/4th Guards target on 10 Oct after Mrkonjic Grad fell. Painter retains it as RS — possibly municipality vs settlement OSID conflation (BB-Cadjavica is on the Mrkonjic-Manjaca road). Flag for review: either (a) painter is correct and HV halted short of cadjavica, or (b) op:kljuc:cadjavica is mis-municipalitied and should be op:mrkonjic_grad: namespace. | LOW — review |
| Ključ — Donji Vrbljani | op:kljuc:donji_vrbljani_2 | HRHB | BB doesn't cite this hamlet. Sits SW of Ključ town, plausible touch-point for HV OG South Drvar→Ključ axis but no settlement-level cite. | LOW |
| Ključ — Donje Ratkovo | op:kljuc:donje_ratkovo_2 | RS | NE Ključ, on Mrkonjic side — falls within the area where VRS held against ARBiH OG Center per BB1 p.420. | MEDIUM (matches BB) |
| Jajce — Divičani, Kruščica | op:jajce:divicani_2, op:jajce:kruscica | RS | These are upper-Vrbas Jajce hamlets toward Mrkonjic. Painted retention as RS is consistent with BB's "salient pinched out" language for the eastern Jajce shoulder, but BB doesn't name these settlements. | MEDIUM |
| Jajce — Grdovo | op:jajce:grdovo | RBiH | RBiH-only enclave inside otherwise-HRHB Jajce municipality — likely an ARBiH 7th Corps touch-point post-Donji Vakuf. BB doesn't pin this settlement. | LOW |
| Sanski Most — Donja Kozica | op:sanski_most:donja_kozica | RS | Sits NE of Sanski Most town. BB1 p.428 explicitly notes "the undaunted 43rd Motorized Brigade rallied northeast of Sanski Most" and "battles seesawed for most of a week… without either being able to force significant changes" before fading on 20 Oct — fully consistent with the painter keeping donja_kozica as RS. | HIGH (matches BB) |
| Bosanski Petrovac — kulen vakuf | not in OSID list but mentioned in BB | n/a | BB1 p.419: "Kulen Vakuf… fell the next day" (15 Sep, with Petrovac). If Kulen Vakuf has a Bihać or Bosanski Petrovac OSID it should flip; not surfaced in our grep. | n/a |
| Novi Travnik (RS→RBiH/HRHB) | op:novi_travnik:* | mixed | Already mixed RBiH/HRHB in apr1994 baseline (HRHB-RBiH war zone), unrelated to Krajina collapse. | n/a — exclude |
| Donji Vakuf approach municipalities (Travnik, Vlašić, Skender Vakuf, Kotor Varoš) | various | mostly unchanged | BB1 p.419: "General Delic and the ARBiH General Staff decided that, rather than press 7th Corps operations on a limited front toward Kotor Varos, they would transfer most of its troops to western Bosnia" — explicit cite that 7th Corps offensive eastward was *aborted*, NOT cleared. Painter retention as RS is correct. | HIGH (matches BB) |

---

## Section 3 — Cross-references in current code (read-only inventory)

Grep results for operation entry points relevant to the Aug–Oct 1995 Krajina collapse. **Inventory only — no edits performed.**

### Existing opportunity catalog entries (single-owner per LANE B Phase 3, 2026-05-01)

| `opportunity_id` | Catalog file | BB cite in source | Maps to BB op | Covers OSIDs |
|---|---|---|---|---|
| `sana_95` | `src/sim/combat/operation_opportunity_catalog_5th_corps.ts:291` | "BB1 pp.417, 419-420 — Sana 95 mission, operational groups, rapid Petrovac/Kljuc/Krupa gains" | Sana 95 (ARBiH 5th Corps primary mission) | op:bosanska_krupa:* (7), op:bosanski_petrovac:* (8), op:sanski_most:* (9), op:kljuc:* (4) — see lines 53–95 |
| `sana_95_follow_on` | `src/sim/combat/operation_opportunity_catalog_5th_corps.ts:335` | "BB1 pp.417, 419-420 - Sana 95 follow-on toward Sanski Most and Kljuc" | Sana 95 second-phase pursuit | op:bosanska_krupa:bosanska_krupa_2, op:bosanski_petrovac:*, op:sanski_most:sanski_most_2, op:kljuc:kljuc_2 — see lines 104–113 |
| `mistral_2_95` | `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts:232` | (no inline page cite in source, but objective set matches BB1 pp.417–418 Maestral OG North) | Operation Maestral (HV/HVO) | op:glamoc:halapic, stekerovci_2; op:titov_drvar:* (3); op:sipovo:* (5); op:mrkonjic_grad:* (6) — see lines 36–62 |
| `tigar_sloboda_94` | `src/sim/combat/operation_opportunity_catalog_5th_corps.ts:548` | — | Tigar-Sloboda 94 (predecessor) | Bosanska Krupa, Petrovac approach |
| `una_94` | `src/sim/combat/operation_opportunity_catalog_5th_corps.ts:1096` | — | Una 94 (NOT the 1995 Una 95 HV fiasco) | — |
| `grmec_94` | `src/sim/combat/operation_opportunity_catalog_5th_corps.ts:1541` | — | Grmeč 94 | Petrovac/Krupa flank |
| `kupres_cincar_94` | `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts:354` | — | Operation Cincar (Nov 1994) | op:kupres:* (HVO 1994, NOT 1995) |
| `vlasic_ridge_95` | `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts:413` | — | ARBiH 7th Corps Vlašić ridge | Travnik/Skender Vakuf ridge, NOT Donji Vakuf |

### Legacy triggered_operations.ts

`src/sim/combat/triggered_operations.ts:505` still defines "Operation Mistral 2" with full axis lists but is filtered out at line 573–575 (`TRIGGERED_OPS_RAW.filter(def => def.name !== 'Operation Mistral 2')`) — historical footprint only, NOT live. Same file line 560–567: comment confirms Sana 95 was migrated to opportunity catalog.

### Coverage gaps (no `op_id` / `opportunity_id` found)

| BB-cited operation | Status in code | OSIDs left orphaned |
|---|---|---|
| **Operation Ljeto 95** (HV/HVO, 25–29 Jul, Grahovo + Glamoč) | **NO MATCH** — no `ljeto_95`, no `grahovo_95` entry | op:bosansko_grahovo:* (referenced only in inert triggered_ops.ts Mistral 2 def line 526–529); op:glamoc:halapic + stekerovci_2 (left to mistral_2_95 which is logically a later operation) |
| **Donji Vakuf 1995 finale** (ARBiH 7th Corps, 10–13 Sep) | **NO MATCH** — `vlasic_ridge_95` is Travnik-area, not Donji Vakuf town | op:donji_vakuf:* (10 OSIDs) — Sana 95 catalog covers 5th Corps OSIDs only, 7th Corps Donji Vakuf push is unrepresented |
| **Jajce 1995 recapture** (HV/HVO Maestral phase 2, 13 Sep) | **PARTIAL** — `mistral_2_95` covers Sipovo/Mrkonjic and Drvar/Grahovo but NO explicit Jajce objective list in the federation catalog (lines 36–62) | op:jajce:* (8 OSIDs flipping to HRHB) — appears orphaned between mistral_2_95 and the inert Mistral 2 triggered def |
| **Operation Una 95** (HV, 18–20 Sep, river fiasco) | **NO MATCH** | Correctly absent — Una 95 was a *failed* op that produced no Bosnian flips (operation occurred on Croatian side of Una river); no anchor impact. **Code correctly does not model.** |
| **Operation Juzni Potez** (HV/HVO, 8–11 Oct, Mrkonjić Grad) | **PARTIAL** — `mistral_2_95` includes Mrkonjić Grad objectives but historically Maestral (Sep) was halted *short* of Mrkonjić; Juzni Potez (Oct) is the operation that actually took the town. Conflation of two operations into one opportunity. | op:mrkonjic_grad:* (6 OSIDs) — currently attributed to mistral_2_95 with timing window mismatch (BB has Mrkonjic falling 10 Oct, not in Maestral 8–15 Sep phase 1–3). |

---

## Faction attribution summary (for painted-map calibration)

Per BB, the joint-ops geometry is:

- **ARBiH 5th Corps** (Sana 95): Bosanska Krupa + Bosanski Petrovac + Ključ + Sanski Most → **RBiH**
- **ARBiH 7th Corps** (Sana 95 northern flank): Donji Vakuf → **RBiH**
- **HV/HVO** (Maestral): Drvar + Jajce + Šipovo → **HRHB**
- **HV/HVO** (Juzni Potez): Mrkonjić Grad + Cadjavica/Podrasnica corridor → **HRHB**
- **HV/HVO** (Ljeto 95): Bosansko Grahovo + Glamoč → **HRHB**
- **Bosanski Novi**: partial **RBiH** foothold in south, majority **RS** retained (Sep 23–6 Oct VRS counterstroke)
- **Cadjavica + donje_ratkovo_2 (Ključ municipality)**: **RS retained** matches BB seesaw / Mrkonjic-side fall-back

Joint-ops geometry implication: any sim run that delivers Sanski Most/Petrovac/Ključ/Krupa as HRHB instead of RBiH (or Drvar/Jajce/Šipovo/Mrkonjić as RBiH instead of HRHB) is mis-attributing the joint advance. The sim's current RBiH +37 / HRHB −33 miscount strongly suggests **mistral_2_95 is under-firing while sana_95 is over-firing the Maestral-axis OSIDs**, or the HVO axes in mistral_2_95 are losing their objective set to the 5th Corps OG North/Center.

---

## Confidence rollup

- **HIGH** rows: 9 (Glamoč, Šipovo, Jajce, Drvar, Donji Vakuf, Bos. Petrovac, Ključ town-axis, Bos. Krupa, Sanski Most, Mrkonjić Grad — 10 if counting Glamoč; matching painted_oct1995 deltas and BB1 explicit dates/units)
- **MEDIUM** rows: 1 (Bosanski Novi — BB1 p.420 cites OG North "grinding forward against stiff resistance" but no settlement-level capture)
- **LOW** rows: 0 (no Wikipedia-only fallbacks needed — BB1 Chapters 91–93 cover the entire Krajina collapse densely)

## Cross-referenced triggered operations: 8

`sana_95`, `sana_95_follow_on`, `mistral_2_95`, `tigar_sloboda_94`, `una_94`, `grmec_94`, `kupres_cincar_94`, `vlasic_ridge_95` — plus inert legacy `Operation Mistral 2` in triggered_operations.ts (filtered out).

## Identified coverage gaps: 4

1. **No `ljeto_95` opportunity** → Glamoč halapic/stekerovci + Bos. Grahovo unanchored to a Jul-1995 trigger.
2. **No Donji Vakuf 1995 opportunity** → ARBiH 7th Corps's 10–13 Sep push is unrepresented; `vlasic_ridge_95` is Travnik-area, not Donji Vakuf town. All 10 op:donji_vakuf:* OSIDs orphaned.
3. **No explicit Jajce arm in `mistral_2_95`** → Jajce 13 Sep recapture (8 OSIDs to HRHB) not surfaced in federation catalog objective set (lines 36–62 cover Drvar/Glamoč/Šipovo/Mrkonjić only).
4. **Maestral vs Juzni Potez conflation** → mistral_2_95 includes Mrkonjić Grad objectives, but historically Maestral (8–15 Sep) was halted *short* of Mrkonjić; Juzni Potez (8–11 Oct) is the actual capture op. Timing window in code may not match the late-Oct execution.

---

## Summary

Ten HIGH-confidence and one MEDIUM-confidence municipal flips between 4 Aug and 12 Oct 1995, all citation-backed to BB1 Chapters 91–93 (pp. 416–428) and BB1 Chapter 87 (pp. 401–403, Ljeto 95); zero LOW-confidence rows needed (Wikipedia/tertiary not required for this slice). The Sana 95 axis delivers Krupa/Petrovac/Ključ/Sanski Most to **RBiH**, the Maestral axis delivers Drvar/Jajce/Šipovo to **HRHB**, the 7th Corps Donji Vakuf push delivers Donji Vakuf to **RBiH**, and the Juzni Potez axis delivers Mrkonjić Grad to **HRHB**. Eight existing opportunity/operation entries cover most of the geometry, with four identified coverage gaps (Ljeto 95 missing, Donji Vakuf 95 missing, Jajce explicit arm missing in mistral_2_95, and Maestral vs Juzni Potez timing-window conflation around Mrkonjić Grad).
