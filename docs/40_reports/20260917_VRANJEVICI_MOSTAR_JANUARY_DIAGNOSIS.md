# Vranjevići / Kružanj (Mostar) — historical and geographic verification, and the smallest justified correction

**Date:** 2026-09-17
**Target:** `op:mostar:vranjevici_2` (January 1993 reference **RBiH**; candidate reads **RS** at t39) and the
comparison cell `op:mostar:kruzanj_2` (reference RBiH; candidate reads RBiH).
**Status:** **read-only analysis.** No production edit, reference edit, OOB/geometry/combat change, or
campaign run was made. The earlier proposal to delete the objectives is **not** implemented and is
**withdrawn** (§9).

**Evidence base.** The preserved n401 candidate (`preserve/january-candidate-n401`, commit `41a148bf9`)
and its independent repeats n402/n403, byte-identical (final-save SHA-256
`e3b6b2d34dd1101c601b11abd30c2c060717995a0fe748f662214d4ebecf6899`). Scenario
`apr1992_definitive_188w.json`, `--weeks 39`, Node v22.23.2, input digest
`f8ace65496620fad1c8219a9dcaa8e2c5cdba2f3f541b156c7ba112b4748caaf`. Sources: `docs/Balkan_BattlegroundsI.pdf`
(BB1), `docs/Balkan_BattlegroundsII.pdf` (BB2); KB page JSONs
`data/derived/knowledge_base/balkan_battlegrounds/pages/`; operational geometry
`data/derived/operational/operational_settlements.geojson`, `data/derived/settlements_wgs84_1990.geojson`,
`data/derived/settlement_attributes_wgs84.json`.

This note separates **[SIM]** observed simulation history, **[HIST]** sourced historical findings,
**[OPEN]** unresolved interpretation, and **[PROPOSED]** proposed change.

---

## 1. The historical citation, corrected

The operation's comments cite a Mostar-hills passage. **Neither the page number nor the actor is
correct as written.**

**Printed vs PDF numbering (verified).** The repo's KB `page_number` is the **PDF index**; the printed
folio is on the page. Confirmed from the folios in the OCR:

| volume | relation | verified examples |
|---|---|---|
| BB1 | **printed = PDF − 36** | PDF 191→155, **PDF 192→156**, 193→157, 194→158 |
| BB2 | **printed = PDF − 19** | PDF 377→358, **379→360**, **380→361**, 386→367, 401→382, 560→541 |

The supplied "Volume I image numbered **193**" carries content whose printed folio is **p.156**. In the
repo PDF that content is at **PDF page 192** (`BB1_p0192.json`). The user-supplied image index therefore
runs one ahead of the repo PDF index for BB1; it must not be written as "PDF 193 = printed 156" —
**PDF 193 is printed 157**. Cite the **printed folio**.

| printed folio | repo KB file (PDF index) | content |
|---|---|---|
| 156 | `BB1_p0192.json` | JNA/Serbs occupy high ground; **Croats capture Mt. Hum 23 May**; HVO advances 11–12 June |
| 157 | `BB1_p0193.json` | Operation Čagalj; bridges 13 June; by 21 June VRS pushed out of Mostar |
| 359–361 | PDF 378–380, not in KB | boxed section "Operation 'Jackal' and the Liberation of Mostar, June 1992" |

BB2's chapter endnotes are headed **"Endnotes, Annex 32"** (printed p.367, PDF 386), consistent with the
supplied "Annex 32" label for this material.

**Actor correction [HIST].** BB1 printed p.156 reads: *"JNA and Bosnian Serb forces occupied positions on
three sides of the city: the high hills overlooking the city from the east, Mt. Hum and some of the
suburbs to the south, and some of the high ground to the north."* and then *"At the end of May, the
Bosnian Croats began a series of attacks aimed at progressively improving their tactical position around
Mostar and relieving Serb pressure on the city. These began with the capture of Mt. Hum to the south on
23 May."* The **Croats captured Hum on 23 May**; the JNA/Serbs had **occupied** it beforehand. The
operation comment (`pre_planned_operations.ts:689-690`) says the opposite — *"JNA garrison seizes
Podveležje/Hum positions"* — and cites "BB1 p.193" (printed 157), a page that does not contain this.
"Podveležje" appears in BB only in a **1994** context, *"northwest of Nevesinje"*
(`BB2_p0515`, printed p.496), not as a 1992 Mostar position.

**"Held through the war" is not supported [HIST].** `triggered_operations.ts:223-225` asserts the Mostar
hills were *"Historically held throughout war (BB1 p.193 …)"*. BB1 printed p.157 and BB2 printed
pp.360–361 record the opposite: HVO/ARBiH **took Mt. Velež on 16 June 1992** (overrunning the VRS 10th
Motorized Brigade command post and killing its commander), the VRS **retook Velež on 24 June 1992**, and
*"Battles continued on and around Mt. Velez, between Mostar and Serb-held Nevesinje, through the rest of
the summer and again in early November, but neither side was able to make any significant advances."*
The Velež axis was **contested**, not cleanly held by either side.

## 2. The Mostar sequence as sourced [HIST]

- **7–8 April:** countrywide war begins; JNA artillery shells Mostar; JNA ejects Croats from Stolac 11 April.
- **Early May:** Boban–Karadžić Graz statement (7 May) agrees a cease-fire; the Neretva is claimed as the
  division line, the eastern-bank Mostar claimed Serb, all Mostar claimed Croat; Muslims unmentioned.
- **Before 23 May:** JNA/Bosnian Serb forces occupy the eastern high hills, Mt. Hum to the south, and
  high ground to the north; Croats hold a narrow eastern-bank band and **Bijelo Polje** to the NE
  (BB1 printed p.156).
- **23 May:** Croats **capture Mt. Hum** (BB1 printed p.156).
- **7 June:** Operation **Čagalj/Jackal** launched from Čapljina; **Tasovici** taken (BB2 printed p.360;
  BB1 printed p.157).
- **11–12 June:** HVO takes Mt. **Orlovac**, Varda, Cule, Kruševo (SW), Jasenica and Slipčići (S)
  (BB1 printed p.156).
- **13 June:** Serbs destroy two Mostar bridges; HVO takes **Rečice**, **Bivolje Brdo**, **Lovke**, and
  advances up the east bank through Pijesci/Gubavica to **Buna** by 14 June; Stolac by 15 June
  (BB1 printed p.157; BB2 printed p.360).
- **16 June:** HVO/ARBiH **take Mt. Velež** (VRS 10th Motorized command post destroyed).
- **17 June:** the two Croat columns link up at **Mostar–Soko airfield**, reaching the airport from the
  south through **Buna and Blagaj** (BB2 printed p.360).
- **By 21 June:** VRS pushed completely out of Mostar; Croats mop up **Bijelo Polje** (BB1 printed p.157).
- **24 June:** VRS **retakes Velež**; indecisive fighting on the Velež–Nevesinje axis through summer and
  early November (BB2 printed pp.360–361).
- **Command note:** the operation was **HV/HVO-led**; *"the Bosnian Army was not included in any of the
  planning … ARBiH troops appear to have played at most a secondary role"* (BB1 printed p.157).

## 3. The operational cells: constituents and extent

From `operational_settlements.geojson` and `settlements_wgs84_1990.geojson`:

**`op:mostar:vranjevici_2`** — **76.5 km²**, pop 2,345, cell centroid ≈ 43.254 N, 17.945 E
(SE of Mostar, east of Blagaj, toward the Nevesinje plateau).

| constituent | pop | B/C/S | centroid (lat, lng) | terrain |
|---|---|---|---|---|
| Vranjevići | 796 | 716/66/0 | 43.2645, 17.9187 | Blagaj–upper-Buna corridor |
| Kamena | 399 | 242/155/0 | 43.2211, 17.9209 | south, Buna approaches |
| Kokorina | 648 | 642/4/0 | 43.2964, 17.9345 | upper plateau |
| Rabina | 209 | 188/0/20 | 43.3014, 17.9892 | upper plateau, E |
| Žulja | 293 | 291/0/0 | 43.2468, 17.9667 | SE plateau |

**`op:mostar:kruzanj_2`** — **207.4 km²**, pop 2,002, cell centroid ≈ 43.411 N, 17.997 E
(E/NE of Mostar, from the eastern city fringe to the high Nevesinje-side plateau; ~20 km N–S span).

| constituent | pop | B/C/S | centroid (lat, lng) | terrain |
|---|---|---|---|---|
| Banjdol | 317 | 311/0/0 | 43.3510, 17.9153 | **immediately E of Mostar**, across the Neretva |
| Kružanj | 840 | 835/0/0 | 43.3318, 17.9554 | eastern hinterland |
| Podvelež | 692 | 690/0/0 | 43.3815, 17.8738 | N/NE of city |
| Hrušta | 0 | 0/0/0 | 43.3844, 18.0150 | far E plateau |
| Zijemlje | 153 | 57/0/**95** | 43.4626, 18.0023 | far NE high plateau, **Serb-majority** |

## 4. Settlement-level evidence table

**There is no settlement-level source.** BB names no "Vranjevići", "Kružanj", "Banjdol", "Kokorina",
"Rabina", "Žulja", "Kamena", "Podvelež" or "Hrušta" anywhere in either volume (both spellings and OCR
variants searched). Every row below therefore rests on **area-level** evidence; control is **not**
inferred from ethnicity, and the ethnic column is context only.

| constituent | relevant period | supported status (area level) | source, printed page | uncertainty |
|---|---|---|---|---|
| Vranjevići | May–Jun 1992 | area east/SE of Mostar in the contested/front zone; HVO advanced through adjacent Buna–Blagaj 14–17 Jun | BB1 156–157; BB2 360 | **high** — village not named; sits between the Blagaj corridor and the plateau, could be either side |
| Kamena | May–Jun 1992 | same corridor; no independent mention | BB1 156–157; BB2 360 | high |
| Kokorina | May–Jun 1992 | upper plateau NE of Blagaj; no independent mention | as above | high |
| Rabina | May–Jun 1992 | upper plateau E, toward Nevesinje; no independent mention | as above | high |
| Žulja | May–Jun 1992 | SE plateau; no independent mention | as above | high |
| Banjdol | May–Jun 1992 | **on the eastern bank** — the Serb-occupied eastern hills / Croat-held narrow band; HVO/ARBiH cleared the east side by 21 Jun | BB1 156–157; BB2 360–361 | medium — the city fringe is the one zone the sources describe in detail |
| Kružanj | May–Jun 1992 | eastern hinterland; direction of the HVO/ARBiH Velež advance | BB1 157; BB2 361 | high |
| Podvelež | May–Jun 1992 | name associates with Velež foot, but BB's only "Podveležje" is **1994, NW of Nevesinje** | BB2 496 (1994) | **very high** — likely name confusion |
| Hrušta | 1992 | far E plateau; no population in 1991; no mention | — | very high |
| Zijemlje | 1992–1995 | far NE high plateau toward VRS-held Nevesinje; **Serb-majority** (95/153) | area-level only | high — plausibly VRS-held, but not sourced |

## 5. Do the aggregates span territory held by different forces? [OPEN]

**Yes — this is a real confound, and it is the strongest single finding of the check.**

- `op:mostar:kruzanj_2` (207 km²) joins the **immediate eastern-bank fringe** (`Banjdol`, 43.35 N) with
  the **remote Nevesinje-side plateau** (`Zijemlje` 43.46 N; `Hrušta` 43.38 N) across ~20 km of the
  terrain BB describes as the contested Velež–Nevesinje axis. Its western constituents lay on the side
  the HVO/ARBiH cleared in June 1992; its eastern, Serb-majority constituents lay toward VRS-held
  Nevesinje. A single painted controller for this aggregate is an oversimplification **whatever** colour
  is chosen.
- `op:mostar:vranjevici_2` (76 km²) joins the low **Blagaj/Buna corridor** (`Vranjevići`, `Kamena`) with
  the **upper plateau** (`Kokorina`, `Rabina`, `Žulja`). The same concern applies, less sharply.

This is consistent with `CALIBRATION_MASTER.md:3933-3939`, which records these cells as part of a
"mispainted repeatedly" cluster with "root cause unknown".

## 6. Observed simulation history [SIM]

- `op:mostar:vranjevici_2`: **initial RBiH** (matching the reference); **t2 combat RBiH→RS** by
  `jna_nevesinje_garrison` (pre-planned `Operation Herzegovina`, axis `mostar_heights`, staging
  `op:nevesinje:sopilja`), battle `2:…`, `decisive_victory` ratio 3.27. **No recovery** through t39.
- `op:mostar:kruzanj_2`: initial RBiH, attacked by the same axis to a `costly_victory` (ratio 1.36) that
  was **absorbed** (no control event); stays RBiH.
- The pre-planned JNA op captures the cells in **early May 1992**; the triggered
  `Operation Herzegovina Consolidation` (`vrs_herzegovina`) fires at t16 but records 0 attacks.

## 7. Competing explanations — evidence status

| explanation | status after the check |
|---|---|
| **Initial attack mapped to the wrong geography** | **Weakened but not excluded.** BB confirms JNA/RS forces held the high ground east and north of Mostar in May 1992, so an RS attack on eastern cells is geographically plausible. But the attack is launched on the **whole aggregate**, including constituents that were not on the RS-held line. |
| **Early loss plausible, later 1992 recovery missing** | **Supported at area level.** BB documents the June 1992 HVO/ARBiH offensive retaking the eastern bank, Buna/Blagaj, the airport (17 Jun) and Velež (16 Jun), and clearing the VRS from Mostar by 21 Jun. The sim models the May seizure and no recovery. **Caveat:** the recovery was **HVO/HV-led** (ARBiH "secondary") and its post-recovery controller was HRHB, not RBiH — so a 1992 recovery alone would not produce the RBiH reference. |
| **Aggregate combines historically different control areas** | **Confirmed** (§5). |
| **New evidence warrants review of the existing reference** | **Partly.** The owner's 2026-08-24 RBiH determination (`51e2862ea`) is not contradicted for the western constituents, but the eastern constituents were plausibly not RBiH. The single-cell paint is questionable for both. |
| **Evidence insufficient** | **Applies to every constituent** (§4): the sources are area-level and name none of the ten settlements. |

Because the documented 1992 recovery was HVO-led, and the reference is RBiH, the user's instruction
applies directly: *the forces participating in combat* (HVO/HV, with ARBiH secondary) are not the
*faction exercising control afterward* that the reference asserts (RBiH).

## 8. Unresolved interpretation [OPEN]

The check **does not** distinguish between "missing recovery" and "reference/aggregate oversimplification"
for the RBiH value, because (a) no source assigns control to any of the ten constituent settlements, and
(b) the aggregates demonstrably straddle the Mostar front. RBiH at initialization and RBiH at January
does **not** establish continuous RBiH control, and the absence of a modelled recovery does **not**
establish that no recovery should be modelled.

## 9. Recommendation and smallest justified correction [PROPOSED]

**The earlier deletion proposal is withdrawn and must not be implemented.** Removing the objectives would
delete a plausible early RS phase (the May 1992 seizure the sources support at area level) without
creating the missing RBiH ownership, and would not address the aggregate-span problem. Retaining Kružanj
to keep the axis non-empty, retiring the JNA Mostar role, or appending the cells to HRHB/Jackal are all
rejected for the same reason.

**Which explanation the check supports:** the combination of **"early loss plausible + later 1992
recovery missing"** (area level) and **"the operational aggregates span historically different control
areas"** (confirmed). It does **not** support a mis-mapped initial attack, and it does **not** establish
that the reference is simply wrong.

**Smallest justified correction: none is ready.** The check is unresolved at settlement level, and the
exact missing fact is:

> **A settlement-level, sourced January 1993 control determination for each of the ten constituent
> settlements** (Vranjevići, Kamena, Kokorina, Rabina, Žulja, Banjdol, Kružanj, Podvelež, Hrušta,
> Zijemlje) — together with an explicit decision on whether an operational cell may legitimately bundle
> settlements that were under different controllers (i.e. whether the cells should be **split** or
> **retargeted** rather than deleted).

Until that exists, any edit — deletion or reference flip — would trade one unsupported paint for another.
No combat value, reference, initial control, geometry, OOB or objective should change on this evidence.

## 10. Prusac

`op:donji_vakuf:prusac_2`: **Open January non-capture; earlier comparative timing explanation requires
independent verification.** Zero control events do not refute a delay in the preceding operation. No
separate Prusac investigation in this task.

## 11. What was not done

No production edit, no objective removal, no reference change, no geometry/OOB/combat change, no new
simulation, no full-suite run, no baseline change, merge, push or publication. The correction of the
citation and the four-way distinction above are documentation only; the stale source comments remain
untouched and are reported, not edited, per the read-only scope.
