# OOB Citation-Enrichment Proposal — GATED Attribution Items

**Date:** 2026-06-04
**Author lane:** P2 Officer/OOB/source attribution (citation-enrichment follow-up)
**Predecessor:** `docs/40_reports/20260604_OOB_OFFICER_ATTRIBUTION_PACKET.md` (the attribution inventory that defined the gates)
**Status:** READ-ONLY research proposal. **No data file was edited.** This packet proposes source strings + confidence for the predecessor's GATED items. Nothing here is applied; every item is for owner / historian sign-off. `data/source/*` and `data/scenarios/officers/*` are owned by Codex and were not touched.

---

## 0. Method & corpus

Targeted the predecessor's §6 (NEEDS-CITATION) and §7 (UNCERTAIN-IDENTITY) gates. For each, did a verbatim + diacritic-tolerant name/unit search against the project's CITED corpus, applying the canon source hierarchy strictly:

1. **ICTY verdicts** (strongest)
2. **Balkan Battlegrounds** (CIA, 2002) — extracted from `data/derived/knowledge_base/balkan_battlegrounds/pages/BB{1,2}_pNNNN.json` (`raw_text` OCR field), incl. BB Vol. I Appendix G (VRS OOB) and Appendix H (ARBiH OOB), plus narrative + footnote pages
3. **OOB master docs** — `docs/knowledge/{ARBIH,VRS,HVO}_ORDER_OF_BATTLE_MASTER.md`, `*_APPENDIX_*_FULL_BRIGADE_LIST.md`
4. **Museum / B-C-S primary** (via BB footnote citations)
5. **Wikipedia** (LAST) — `docs/knowledge/WIKIPEDIA_OOB_CROSS_REFERENCE.md`

**Honesty rule:** where the cited corpus does **not** support a confident attribution, this packet says so explicitly and labels it `unsourced` / `needs-historian`. No commander name or citation was invented. Where BB gives a real page locator, that locator is quoted verbatim below so the owner can re-verify.

---

## 1. Per-item proposal table — NEEDS-CITATION (predecessor §6)

| # | Formation / officer (OOB attribution) | Proposed source (exact doc + locator) | Proposed citation string | Confidence | Resolves which gap |
|---|---|---|---|---|---|
| 1 | `rs_65th_protection_motorized_regiment` → **Milomir Savčić** | **BB Vol. I p.442 footnote 224** ("The 65th, under the command of Colonel Milomir Savcic, received a commendation from General Mladic…") **+ BB Vol. II p.406** ("On 10 February, Lieutenant Colonel Milomir Savcic's soldiers from the 65th Protection Regiment…") | `Balkan Battlegrounds Vol. I p.442 n.224 & Vol. II p.406 (Col./LtCol Milomir Savčić, cdr 65th Protection Mtzd Regt); cross-ref ICTY Srebrenica record` | **HIGH** | §6.4 — commander name was uncited; now BB-confirmed twice, both Vols. Net-new: Savčić is **not** in `apr1992_officers.json`. |
| 2 | `arbih_guards_brigade` → **Dževad Rađo** | **NONE.** Unit "Guards Brigade" cited (BB App-H; `ARBIH_ORDER_OF_BATTLE_MASTER.md` L34/L351 — HQ **Sarajevo**, *not* Visoko). Zero BB hits for "Rađo"/"Rado" as a Guards-Bde commander (only Gordan Radošević, an unrelated HV officer). Not in officer roster. | *(no citation — do not apply)* | **UNSOURCED** | §6.1 — unit attestable; **personal name unsupported by any cited source.** Leave as-is or mark unknown. Note: OOB HQ "Visoko" also disagrees with master's "Sarajevo." |
| 3 | `arbih_120th_liberation_black_swans` → **Hase Tirić** | **NONE in primary.** Unit cited (BB App-H; `ARBIH_ORDER_OF_BATTLE_MASTER.md` L35/L351 — HQ **Kakanj**; BB Vol. I p.211 "120th Liberation Brigade 'Black Swans'"). Zero BB hits for "Tirić". Only `WIKIPEDIA_OOB_CROSS_REFERENCE.md` L41 ("Confirmed") attests the *unit*, not the commander. | *(no primary citation — Wikipedia-tier at best for the unit; commander uncited)* | **UNSOURCED (commander)** / LOW (unit) | §6.2 — unit confirmed Wikipedia-tier; **commander Hase Tirić has no cited source.** Do not apply commander name. |
| 4 | `rs_1st_guards_motorized` → **Zdravko Samardžić** | **NONE — and identity-suspect.** BB names the 1st Guards Motorized Bde (Vol. I p.210, p.461 n.9 "had previously commanded the VRS 1st Guards Motorized Brigade before taking over as 30th Division chief of staff") but the officer is **unnamed** in the readable text. The only "Samardž-" in BB is **Drago Samardžija**, cdr **7th Kupres-Šipovo Mtzd Bde** (BB Vol. II p.530 App-G) — a *different unit and different person*. Roster has `vrs_samardzija` = Drago Samardžija. | *(no citation — likely a name confusion; do not apply)* | **UNSOURCED / IDENTITY-SUSPECT** | §6.3 + §7.3 — "Zdravko Samardžić" appears in **no** cited source; probable conflation with Drago Samardžija (different brigade). **Needs-historian.** |
| 5 | `hvo_1st_guard_abb` → **Željko Glasnović** | Officer roster `hvo_glasnovic` (origin "foreign") + `WIKIPEDIA_OOB_CROSS_REFERENCE.md`. No BB appendix for HVO. | `Wikipedia/vojska.net via WIKIPEDIA_OOB_CROSS_REFERENCE.md; matches roster hvo_glasnovic` | **MED** | §6.5 — reconciles to roster; underlying source Wikipedia-tier. |
| 6 | `hvo_2nd_guard_mechanized` → **Stanko Sopta** | Officer roster `hvo_sopta` + `WIKIPEDIA_OOB_CROSS_REFERENCE.md`. No BB appendix for HVO. | `Wikipedia/vojska.net via WIKIPEDIA_OOB_CROSS_REFERENCE.md; matches roster hvo_sopta` | **MED** | §6.5 — reconciles to roster; Wikipedia-tier. |
| 7 | `hvo_3rd_guard_jastrebovi` → **Ilija Nakić** | `WIKIPEDIA_OOB_CROSS_REFERENCE.md` L455 ("3rd Guard Motorized 'Jastrebovi'… Cmd: Ilija Nakić") + roster `hvo_i_nakic`. No BB appendix for HVO. | `Wikipedia (hr.wiki) via WIKIPEDIA_OOB_CROSS_REFERENCE.md L455; matches roster hvo_i_nakic (Ilija, NOT Franjo)` | **MED** (after collision resolved — see §2.1) | §6.5 + §7.1 — identity resolved (Ilija); source Wikipedia-tier. |
| 8 | `hvo_4th_guard_sinovi_posavine` → **Mato Bilonjić** | Officer roster `hvo_bilonjic` + `WIKIPEDIA_OOB_CROSS_REFERENCE.md`. No BB appendix for HVO. (BB narrative p.193/p.198 attests an HV "4th Guards Brigade" at Mostar/Herzegovina but that is the **Croatian Army** 4th Guards, a different formation — do **not** cite it for the HVO unit.) | `Wikipedia/vojska.net via WIKIPEDIA_OOB_CROSS_REFERENCE.md; matches roster hvo_bilonjic` | **MED** | §6.5 — reconciles to roster; Wikipedia-tier. **Caveat:** avoid conflating HVO 4th Guard with HV 4th Guards Bde. |

---

## 2. Per-item proposal — UNCERTAIN-IDENTITY (predecessor §7)

### 2.1 — `hvo_3rd_guard_jastrebovi` "Ilija Nakić" vs `hvo_nakic` Franjo Nakić — **RESOLVED (med confidence)**

- **Franjo Nakić** (`hvo_nakic`): historically the HVO **Central Bosnia OZ / HVO Main Staff** chief-of-staff figure (Blaškić's deputy); *not* a guard-brigade field commander.
- **Ilija Nakić** (`hvo_i_nakic`): `WIKIPEDIA_OOB_CROSS_REFERENCE.md` attributes **Ilija** Nakić to BOTH the **Frankopan Brigade (91st)** (L416, formed 1 Apr 1993) AND the **3rd Guard Motorized "Jastrebovi"** (L455, formed 18 Jan 1994). Both attributions are internally consistent (he moved up from the Frankopan/Travnik brigade to the 3rd Guard).
- **Recommended resolution:** the OOB's "Ilija Nakić" for `hvo_3rd_guard_jastrebovi` is **correct**; it is *not* a Franjo collision. Confidence **MED** (source is hr.wiki only; no BB/ICTY for HVO). No historian needed unless a primary B-C-S source is required to lift above MED.

### 2.2 — 2nd Krajina Corps CO: roster `vrs_tomanic` (Tomanić) vs master "Grujo Borić" — **RESOLVED as TIME-SNAPSHOT (high confidence)**

- BB attests **BOTH**, at different dates:
  - **Grujo Borić** — BB Vol. I **p.186** ("6,000 to 7,500 troops of Colonel (later Major General) **Grujo Boric's** 2nd Krajina Corps") and BB Vol. II **p.530** App-G OOB snapshot ("**Major General Grujo Boric, commander**, … 2nd Krajina Corps"). Also `VRS_ORDER_OF_BATTLE_MASTER.md` L130 ("Major General Grujo Borić (1992-1995)") and `SCENARIO_01_APRIL_1992.md` L635.
  - **Radivoje Tomanić** — BB Vol. I **p.402** ("Major General **Radivoje Tomanic's** 2nd Krajina Corps fielded some 5,500") in the 1995 Operation Storm / Glamoč narrative.
- **Recommended resolution:** **No conflict — a time-snapshot.** Borić is the dominant/long-tenure 2nd Krajina CO (1992–95 per master & App-G); Tomanić appears as the 2nd Krajina CO during the **1995 endgame** (Grahovo/Glamoč). For an **April-1992 start**, the canonically-correct CO is **Grujo Borić** (BB App-G + master). The roster currently seeds `vrs_tomanic` for `vrs_2nd_krajina`; `vrs_boric` exists in the roster but is **unassigned** (`historical_corps_id: null`).
  - **Proposal (gated, not applied):** for an Apr-1992 historical-start the 2nd Krajina CO should be **Borić** (`vrs_boric`), with Tomanić as the late-war successor — mirroring the existing Šipčić→Galić and Talijan→Karavelić snapshot handling. Confidence **HIGH** on the history; the *which-to-seed* decision is an owner/historian call because it changes a turn-0 seed. **Flag for owner ruling.**

### 2.3 — `rs_1st_guards_motorized` "Zdravko Samardžić" — **NEEDS-HISTORIAN (identity unverified)**

- No cited source names "Zdravko Samardžić" anywhere (BB, masters, roster, even Wikipedia cross-ref). BB's 1st Guards Motorized commander is referenced but **unnamed** (Vol. I p.461 n.9). The only near-name is **Drago Samardžija** (7th Kupres-Šipovo Bde, BB Vol. II p.530) — a different person and unit.
- **Recommended resolution:** treat "Zdravko Samardžić" as **unverified / probable conflation**. Do not cite. **Needs-historian** to either supply a primary B-C-S source or confirm removal of the unsourced personal name.

### 2.4 — `arbih_guards_brigade` "Dževad Rađo" — **NEEDS-HISTORIAN (identity unverified)**

- Zero cited-corpus support for the personal name (see §1 #2). Unit is real (HQ Sarajevo per master). **Needs-historian** or mark commander unknown.

### 2.5 — Šipčić-vs-Galić (SRK) and Talijan-vs-Karavelić (1st Corps) — **NOT errors (time-snapshots)**

- Confirmed by the predecessor packet as April-1992 vs later-war snapshots. No citation gate; included only so nobody "corrects" the Apr-1992 roster to the better-known later commander. No action.

### 2.6 — 4th Corps HQ: live OOB `jablanica` vs master narrative "Mostar" — **RESOLVED (high confidence)**

- `ARBIH_ORDER_OF_BATTLE_MASTER.md` L338 itself states: **"4th Corps | Jablanica | Herzegovina (BB: HQ Jablanica; narrative also 4th Mostar)."** I.e. **BB Appendix-H places 4th Corps HQ at Jablanica**; only BB *narrative* (and master L154/L156) uses Mostar (the corps' operational/area seat, contested/HVO-pressured early-war).
- **Recommended resolution:** the live OOB's `jablanica` HQ **matches BB Appendix-H** and is the better-sourced choice. **No change needed**; the master's narrative "Mostar" is an area label, not a contradiction. Confidence **HIGH**. (Citable as `Balkan Battlegrounds Vol. I Appendix H (4th Corps HQ Jablanica)`.)

---

## 3. READY-TO-APPLY shortlist (high-confidence — owner sign-off only)

These need no historian; the cited source is primary (BB/App-G/App-H) and unambiguous. They are still **gated on owner approval** because `data/source/*` is Codex-owned:

| Item | Proposed citation (apply as provenance note, not a data-shape change) | Why ready |
|---|---|---|
| `rs_65th_protection_motorized_regiment` cdr **Milomir Savčić** | `Balkan Battlegrounds Vol. I p.442 n.224 & Vol. II p.406` | BB-confirmed twice; ICTY-Srebrenica cross-link. HIGH. |
| `arbih_4th_corps` HQ **Jablanica** | `Balkan Battlegrounds Vol. I Appendix H` (per ARBIH master L338) | App-H matches live OOB. HIGH. No data change — confirms current value. |
| 2nd Krajina Corps long-tenure CO **Grujo Borić** (Apr-1992 seed) | `Balkan Battlegrounds Vol. I p.186 & Vol. II p.530 App-G; VRS master L130` | BB App-G + narrative + master agree. HIGH on history. *(Seed-change is owner call — see §2.2.)* |

**Note on mechanism:** the predecessor established the OOB brigade file has **no per-formation `source` field** and adding one is a schema change gated on Codex. So "ready-to-apply" here means *the citation is sound and could back a provenance note or a roster/essay reference* — it does **not** authorize a schema edit to `oob_brigades.json`.

---

## 4. NEEDS-HISTORIAN shortlist (cannot be sourced from the cited corpus)

| Item | Why blocked |
|---|---|
| `arbih_guards_brigade` cdr **Dževad Rađo** | No cited source for the personal name; not in roster; BB silent. |
| `arbih_120th_liberation_black_swans` cdr **Hase Tirić** | No primary source; unit Wikipedia-confirmed only; commander uncited. |
| `rs_1st_guards_motorized` cdr **Zdravko Samardžić** | Name in **no** source; probable conflation with Drago Samardžija (different unit). Identity unverified. |
| 2nd Krajina Apr-1992 **seed choice** (Borić vs Tomanić) | History is clear (Borić early, Tomanić 1995); the turn-0 seed decision is an owner/design ruling. |
| HVO 4 guard COs (Glasnović/Sopta/Ilija Nakić/Bilonjić) | Sourced only to Wikipedia/vojska.net (no BB HVO appendix). MED ceiling unless a B-C-S primary is found. Not *blocked*, but cannot rise above MED without a historian/primary source. |

---

## 5. Source-hierarchy & honesty caveat

- Hierarchy applied strictly: **ICTY → Balkan Battlegrounds → OOB masters → museum B-C-S → Wikipedia (last)**. Any MED label means the only support is Wikipedia/vojska.net-tier.
- **1 of the 8 §6 NEEDS-CITATION commander names was upgradeable to HIGH from primary BB**: Savčić (#1). The 4th-Corps-HQ and Borić items are HIGH but are *confirmations / seed-rulings on existing values*, not new commander attributions.
- **4 HVO guard COs sit at MED** (Wikipedia-tier, no BB HVO appendix — the systemic HVO provenance gap the predecessor flagged).
- **3 personal attributions remain UNSOURCED** (Rađo, Tirić, Zdravko Samardžić) — explicitly **not invented**; flagged needs-historian.
- **1 identity collision RESOLVED** (Ilija vs Franjo Nakić → Ilija, MED).
- **2 apparent conflicts RESOLVED as time-snapshots** (Borić/Tomanić; and the SRK/1st-Corps snapshots) — and **1 apparent HQ conflict RESOLVED** (4th Corps Jablanica = BB App-H).
- **No data file was edited.** Determinism, OSIDs, and Codex-owned `data/source/*` untouched. This is a proposal only; nothing is applied without the §3 owner sign-off or §4 historian ruling.

---

*Deliverable for the citation-enrichment follow-up to the GATED command-board attribution row. Research-only; no data change made or authorized.*
