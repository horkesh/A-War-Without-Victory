# OOB / Officer Source-Attribution & Roster Citation Packet

**Date:** 2026-06-04
**Author lane:** P2 Officer/OOB/source attribution and essay rosters (command-board row, GATED)
**Source plan:** `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 3; `docs/plans/2026-05-17-officer-character-mini-bio-plan.md`
**Status:** READ-ONLY research packet. No data file was edited. This packet only inventories, cross-checks, and classifies — it proposes nothing for direct application. Every item below that would require a data edit is GATED on a citation or historian confirmation.

---

## 0. Scope & method

Files read (none edited):

- `data/source/oob_brigades.json` (249 brigade entries), `data/source/oob_corps.json` (19 corps/HQ entries)
- `data/scenarios/officers/apr1992_officers.json` (98 officer entries), `data/scenarios/army_co_roster.json` (CO tenure/replacement schedule)
- `docs/knowledge/{ARBIH,VRS,HVO}_ORDER_OF_BATTLE_MASTER.md`
- `docs/knowledge/{ARBIH_APPENDIX_H,VRS_APPENDIX_G}_FULL_BRIGADE_LIST.md`, `docs/knowledge/HVO_FULL_BRIGADE_LIST.md`
- `docs/knowledge/WIKIPEDIA_OOB_CROSS_REFERENCE.md`

**Method:** programmatic key/field inventory of the JSON; verbatim name/ordinal cross-search of the live OOB against the master/appendix corpus; manual reconciliation of corps assignment and commander identity against the master docs and officer roster. Coverage figures below are honest estimates, not precise audit counts — see the caveat in §9.

### Source hierarchy (project canon, applied throughout)

1. **ICTY verdicts** (FIRST — strongest)
2. **Balkan Battlegrounds** (CIA, 2002) — BB Vol. I Appendix G (VRS skeleton OOB, pp. 459–464) and Appendix H (ARBiH skeleton OOB, Oct 1995); BB narrative
3. **OOB master docs** (`docs/knowledge/*_ORDER_OF_BATTLE_MASTER.md`) — secondary compilations citing BB/CIA
4. **Museum / B-C-S primary sources**
5. **Wikipedia** (LAST — lowest confidence; flag explicitly)

---

## 1. Summary — citation & attribution coverage

### Live OOB brigades (`oob_brigades.json`)

| Metric | RBiH | RS | HRHB | **Total** |
|---|---|---|---|---|
| Brigade formations | 126 | 83 | 40 | **249** |
| Carry a named commander (`elite_commander.name`) | 2 | 2 | 4 | **8** |
| Carry a per-formation `source`/citation field | 0 | 0 | 0 | **0** |

- **Commander attribution on the live OOB: 8 / 249 ≈ 3.2%.** The only commander field present is `elite_commander.name` on the 8 elite/guard brigades. The other 241 brigades carry **no** officer attribution by design (the OOB models formations, not personalities; command personalities live in a separate roster — see §2).
- **Per-formation citation field on the live OOB: 0 / 249 (0%).** The brigade file is a flat JSON array with **no** `awwv_meta`, `source`, `citation`, `note`, or `provenance` field at file level or per entry. There is no machine-readable provenance on any brigade.
- **Live corps file (`oob_corps.json`)** *does* carry a single file-level `awwv_meta.source`: *"Balkan Battlegrounds Vol. I Appendices G & H; VRS/ARBiH/HVO ORDER_OF_BATTLE_MASTER."* That is the only structured citation anywhere in `data/source/`.

### Unit-designation citation coverage (overall estimate)

Crude verbatim cross-search of each brigade's ordinal designation (e.g. "17th", "120th") against the cited master + appendix + Wikipedia-cross-ref corpus:

- **~213 / 249 ≈ 86%** of brigade designations appear verbatim somewhere in the cited source corpus.
- Unmatched (designation not found verbatim, by heuristic): RBiH 2, RS 11, **HRHB 23**. HVO is weakest — expected, because **BB Vol. I has no dedicated HVO appendix**; HVO brigade detail is BB-narrative + Wikipedia/vojska.net only.
- **Honest caveat:** this measures whether a *unit name* is attestable in a cited document. It does **not** measure officer-identity confidence, nor does it confirm the source agrees on that unit's corps/strength. Treat 86% as an upper-bound "unit is real and cited somewhere" figure, not a quality score.

### Officer roster (`apr1992_officers.json`) — the real attribution layer

The OOB brigades file is deliberately thin on people. The genuine officer-attribution corpus is the **separate** officer roster: **98 officers** (RBiH 38, RS 32, HRHB 28; pool tiers starter 23 / A 38 / B 26 / C 11). Of these:

- **18 are `is_historical_start` = true** — real, named historical corps/army commanders seeded at turn 0/start.
- **29 carry a `war_crimes_record`** object (`court` / `verdict` / `sentence` / `charges` / `summary`), of which **25 cite `court: "ICTY"`** and the rest cite "BiH State Court." This is the strongest, most canon-aligned attribution data in the repo (ICTY-FIRST).
- **0 carry a per-record `source`/`citation` string.** The ICTY grounding is implicit in the `war_crimes_record.court` field, not an explicit citation. So even here, provenance is structural-but-uncited.

---

## 2. Two attribution layers (do not conflate)

| Layer | File | People named | Provenance present? |
|---|---|---|---|
| **Formation OOB** | `data/source/oob_brigades.json` | 8 elite-brigade commanders only | None (no source field) |
| **Officer roster** | `data/scenarios/officers/apr1992_officers.json` | 47 real named officers (18 historical-start + 29 with war-crimes records, overlap) | ICTY/court structural only; no citation string |
| **CO tenure schedule** | `data/scenarios/army_co_roster.json` | references officer_ids (e.g. `vrs_mladic`→`vrs_krstic`) | none; references roster |

The corps→commander mapping the *game* uses comes from the **officer roster's `historical_corps_id`**, not from the OOB brigade file. The 8 OOB `elite_commander` names are a **third, smaller, and least-cited** set that is NOT reconciled against the officer roster for the RBiH/RS entries (see §5).

---

## 3. Gaps table — the 8 live-OOB commander attributions

formation_id | faction | commander (OOB) | has source field? | best available source per hierarchy | identity-match confidence | note
---|---|---|---|---|---|---
`arbih_guards_brigade` | RBiH | Dževad Rađo | no | unit name in BB/Appendix-H corpus; **commander name in NO readable repo source** | **low/unknown** | Unit ("Guards Brigade", Visoko) is attestable; the personal name is uncited and absent from the officer roster. NEEDS-CITATION.
`arbih_120th_liberation_black_swans` | RBiH | Hase Tirić | no | unit confirmed (Wikipedia cross-ref line 41 "120th Liberation Black Swans … Confirmed"); commander name uncited | **low** | Hase Tirić is a real historical Black Swans commander but no repo source attributes him here; treat as Wikipedia-tier at best. NEEDS-CITATION.
`rs_1st_guards_motorized` | RS | Zdravko Samardžić | no | unit-type plausible in VRS corpus; commander name in NO readable repo source | **unknown** | No repo source for the personal name. NEEDS-CITATION + identity check.
`rs_65th_protection_motorized_regiment` | RS | Milomir Savčić | no | **unit** strongly cited (65th Protection Regt, BB/Appendix-G/Wiki line 580); commander name uncited in repo | **med (unit) / low (name)** | Milomir Savčić is the historically attested 65th Protection commander (ICTY Mladić/Srebrenica record), so the name is plausibly correct — but it is **not cited in any repo source**, so still GATED. Cross-check against ICTY before trusting.
`hvo_1st_guard_abb` | HRHB | Željko Glasnović | no | Wikipedia cross-ref + officer roster `hvo_glasnovic` (origin "foreign") | **med** | Matches a named officer-roster entry; underlying source is Wikipedia-tier → med at best.
`hvo_2nd_guard_mechanized` | HRHB | Stanko Sopta | no | Wikipedia cross-ref + officer roster `hvo_sopta` | **med** | Matches roster `hvo_sopta`. Wikipedia-tier source.
`hvo_3rd_guard_jastrebovi` | HRHB | Ilija Nakić | no | Wikipedia cross-ref + officer roster `hvo_i_nakic` | **low/med** | **NAME-COLLISION RISK:** roster has BOTH `hvo_nakic` (**Franjo** Nakić) and `hvo_i_nakic` (**Ilija** Nakić). Confirm which Nakić commanded 3rd Guard before any edit.
`hvo_4th_guard_sinovi_posavine` | HRHB | Mato Bilonjić | no | officer roster `hvo_bilonjic` + Wikipedia cross-ref ("Posavine") | **med** | Matches roster `hvo_bilonjic`. Wikipedia-tier source.

**Net:** of 8 OOB commander names, 4 (the HVO guards) at least reconcile to a named officer-roster entry (med confidence, Wikipedia-sourced); 4 (2 ARBiH + 2 RS) appear in **no readable repo source at all** and are absent from the officer roster → low/unknown.

---

## 4. Officer-roster attribution (the well-grounded layer)

The 18 historical-start corps/army COs and the ICTY-recorded pool officers are the **high-confidence** attribution set. Representative (not exhaustive):

| officer_id | faction | name | role | war_crimes_record | confidence |
|---|---|---|---|---|---|
| `vrs_mladic` | RS | Ratko Mladić | VRS Main Staff cmdr | ICTY / convicted (genocide) | **high** |
| `vrs_talic` | RS | Momir Talić | 1st Krajina Corps | ICTY / died before trial | **high** |
| `vrs_zivanovic` | RS | Milenko Živanović | Drina Corps | ICTY / indicted | **high** |
| `vrs_krstic` | RS | Radislav Krstić | Drina Corps (succ.) | ICTY / convicted | **high** |
| `vrs_galic` / `vrs_d_milosevic` | RS | Galić / D. Milošević | Sarajevo-Romanija | ICTY / convicted | **high** |
| `arbih_halilovic` | RBiH | Sefer Halilović | Army cmdr | ICTY / acquitted | **high** |
| `arbih_hadzihasanovic` | RBiH | Enver Hadžihasanović | 3rd Corps | ICTY / convicted | **high** |
| `arbih_oric` | RBiH | Naser Orić | (Srebrenica) | ICTY / acquitted | **high** |
| `hvo_blaskic` | HRHB | Tihomir Blaškić | Central Bosnia OZ | ICTY / convicted | **high** |
| `hvo_petkovic` | HRHB | Milivoj Petković | HVO cmdr | ICTY / convicted | **high** |
| `hvo_praljak` | HRHB | Slobodan Praljak | Army cmdr | ICTY / convicted | **high** |

These are ICTY-FIRST and align with both the master docs and BB. They are **not** the subject of any needs-citation gate (the war-crimes facts are court-grounded); the only weakness is the absence of an explicit `source` string, which is cosmetic for the convicted/indicted set.

---

## 5. Cross-check notes — live OOB vs master docs (FLAG, do not resolve)

1. **Corps count: 5 ARBiH corps (live) vs 7 (master).** `oob_corps.json` has 5 ARBiH field corps + General Staff; the ARBiH master lists 7 corps + enclaves. **This is INTENTIONAL design, not an error** — `WIKIPEDIA_OOB_CROSS_REFERENCE.md` documents the simplification: 6th Corps→4th, 7th Corps→3rd, 28th Div→2nd, 81st Div→1st. No action; documented divergence.

2. **4th Corps HQ: `jablanica` (live) vs Mostar (master).** `oob_corps.json` places `arbih_4th_corps` HQ at Jablanica (`op:jablanica:jablanica_2`); the ARBiH master says 4th Corps HQ Mostar. Likely a deliberate playable-territory placement (Mostar contested/HVO-held early), but **flag** — the master and live OOB disagree on HQ municipality.

3. **2nd Krajina Corps CO: roster `vrs_tomanic` (Radivoje Tomanić) vs master "Grujo Borić."** The officer roster's historical-start 2nd Krajina CO is Tomanić; the VRS master names Grujo Borić (1992–1995). These disagree on the *person*. Most external sources favor Borić as 2nd Krajina CO. **Flag — identity conflict between roster and master.**

4. **Sarajevo-Romanija CO: roster `vrs_sipcic` (Tomislav Šipčić) vs master "Galić (1992–94)."** Both are historically valid at *different times* (Šipčić was the first SRK commander Apr–Sep 1992; Galić succeeded him). The roster snapshots the April-1992 start (Šipčić); the master snapshots the better-known Galić period. **Time-snapshot divergence, not an error** — but note it so nobody "corrects" the roster to Galić.

5. **1st Corps CO: roster `arbih_talijan` (Mustafa Hajrulahović "Talijan") vs master "Vahid Karavelić."** Same time-snapshot pattern: Talijan = first 1st Corps CO (1992); Karavelić took over 1993. Roster (Apr-1992 start) is internally consistent. **Flag as snapshot divergence.**

6. **HVO citation weakness is systemic.** BB Vol. I has **no** HVO appendix (confirmed in `HVO_ORDER_OF_BATTLE_MASTER.md` lines 134/556). HVO brigade names + the 4 HVO guard commanders therefore rest on BB-narrative + Wikipedia/vojska.net. This is the single largest provenance gap in the OOB and explains the 23 unmatched HVO designations in §1.

---

## 6. NEEDS-CITATION shortlist (GATED — require a source before any data edit)

These have a **unit** that is attestable but a **commander/personal attribution** (or HQ choice) that is uncited in any readable repo source:

1. `arbih_guards_brigade` → commander **Dževad Rađo** — no repo source, not in officer roster. *(Find ICTY/BB/B-C-S source or mark unknown.)*
2. `arbih_120th_liberation_black_swans` → commander **Hase Tirić** — uncited; Wikipedia-tier at best.
3. `rs_1st_guards_motorized` → commander **Zdravko Samardžić** — no repo source, not in roster.
4. `rs_65th_protection_motorized_regiment` → commander **Milomir Savčić** — unit strongly cited; personal name uncited in repo (verify vs ICTY Srebrenica record).
5. **HVO 4 guard brigades** (`hvo_1st_guard_abb`, `hvo_2nd_guard_mechanized`, `hvo_3rd_guard_jastrebovi`, `hvo_4th_guard_sinovi_posavine`) — commanders sourced only to Wikipedia; upgrade to BB/ICTY/B-C-S or label low-confidence.
6. **All 249 brigades** — none carry a per-formation `source` field. If structured provenance is ever wanted, that is a schema addition gated on Codex (who owns this file) — **do not add it here.**

## 7. UNCERTAIN-IDENTITY shortlist (GATED — require historian confirmation)

1. **`hvo_3rd_guard_jastrebovi` / "Ilija Nakić"** — collides with `hvo_nakic` (**Franjo** Nakić) in the roster. Confirm which Nakić before trusting the OOB attribution.
2. **2nd Krajina Corps CO** — roster `vrs_tomanic` (Tomanić) vs master Borić. Conflicting persons; resolve identity.
3. **`rs_1st_guards_motorized` / "Zdravko Samardžić"** — no corroborating source anywhere in repo; identity unverified.
4. **`arbih_guards_brigade` / "Dževad Rađo"** — identity unverified (uncited, not in roster).
5. **Šipčić-vs-Galić (SRK) and Talijan-vs-Karavelić (1st Corps)** — *not* identity errors but time-snapshot divergences; included here only so they are not mistakenly "fixed."

---

## 8. Methodology + source-hierarchy reminder

- Inventory was field-level over the live JSON; coverage % are heuristic verbatim-match estimates, deliberately conservative.
- Confidence labels: **high** = ICTY-grounded or BB-appendix-confirmed; **med** = matches officer roster but underlying source is Wikipedia-tier; **low** = present but uncited / Wikipedia-only; **unknown** = no readable repo source for the personal attribution.
- Apply the canon hierarchy when sourcing any gated item: **ICTY verdicts → Balkan Battlegrounds (CIA) → OOB masters → museum B/C/S → Wikipedia (last)**. Any attribution resting only on Wikipedia is low-confidence by definition and must be flagged as such.

## 9. Honest-confidence caveat

- The strongest attribution data is the **officer roster's `war_crimes_record` (25 ICTY + 4 BiH-State-Court)** — high confidence on the *facts*, but with **no explicit citation string** (provenance is structural via the `court` field).
- The **live OOB brigade file has effectively zero machine-readable provenance** (1 file-level corps-meta source; 0 brigade-level sources; 8/249 commander names). Its 86% "unit attestable somewhere" figure is an upper bound and must not be read as 86% quality.
- The **HVO layer is systematically the weakest** (no BB appendix; Wikipedia/vojska.net dependence).
- **Nothing in this packet should be applied to data without first clearing the §6/§7 gates.** No commander or citation was invented; where a personal attribution lacks a readable repo source it is labeled unknown/low rather than guessed. `data/source/` files are owned by Codex and were not touched.

---

*This packet is the deliverable for the GATED command-board row "Officer/OOB/source attribution and essay rosters." It is research-only; it makes no data change and recommends none without a source or historian sign-off.*
