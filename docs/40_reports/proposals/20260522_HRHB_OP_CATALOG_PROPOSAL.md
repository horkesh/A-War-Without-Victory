# HRHB Operation Catalog Proposal — Filling the HVO Op Gap

**Date:** 2026-05-22
**Branch:** feature/arc-operations-calibration
**Author:** AWWV combat/operations specialist + historian
**Status:** PROPOSAL ONLY — no source files modified
**Related forensics:** `docs/40_reports/audits/20260522_HVO_UNDELIVERY_INVESTIGATION.md`

---

## Background

Per n1961 / n1963 / n1964 forensics, HRHB has only **3 distinct offensive op slots** in the catalog (Operation Jackal pre-planned, kupres_cincar_94 opportunity, mistral_2_95 opportunity), versus the ARBiH 5th Corps which alone runs 7 catalog ops. Even with Wave 4 unblocks landing (Op Jackal now succeeds at t=8 per the Graz exemption fix), HRHB OSID delivery remains **-28 vs the painted Oct 1995 target across all runs**. Painted-control deltas Apr 1995 → Oct 1995 demand the following HRHB conquests that no current op covers:

- **Bosansko Grahovo / Glamoč shoulder** — covered partially by Mistral 2 only (Drvar/Grahovo axis), but no spring-summer-1995 *prelude* op (Operation Mistral 1 / Skok).
- **Jajce cluster** (10 OSIDs flipping RS→HRHB by Oct 1995) — no op covers Jajce.
- **Posavina pocket defense / counterattack** (Orašje / Modriča approach) — no HVO offensive op at all; HVO Northwest Bosnia has zero catalog entries despite three guards-grade brigades by late war.
- **Central Bosnia post-Washington consolidation** — Vitez salient, Žepče enclave, Kiseljak enclave — no HVO op covers post-Federation HRHB defense or local recovery.
- **Mostar / east Herzegovina defensive consolidation** (1993-1994) — no HRHB op between Jackal (t=8 in Jan 1993) and Cincar/Kupres (t=132 in Nov 1994); a 124-turn catalog dead zone for hvo_southeast_herzegovina.

This memo proposes **6 new HRHB operations** to close the historical gap, all defensible against ICTY judgments and the Balkan Battlegrounds (BB) operational record. Two are pre-Federation defensive operations (1992-1993); four are post-Washington Federation offensives (1994-1995). All proposals are **non-railroaded** — every op is gated by date window + staging anchors + defender-weakness floor + alliance state, in the same shape as existing T1 opportunity entries.

---

## Proposal Summary (6 operations)

| # | op_id | Name | Corps | Window | Objectives | Sources |
|---|-------|------|-------|--------|------------|---------|
| 1 | `mistral_1_95` | Operation Mistral 1 (Skok 1) | hvo_main_staff + hvo_tomislavgrad | t160-170 (Jun 1995) | 8 OSIDs (Bos. Grahovo + Glamoč shoulder) | ICTY Gotovina IT-06-90 §44-58; BB v2 ch. 28 |
| 2 | `jajce_95` | Operation Jajce Recovery | hvo_tomislavgrad | t178-184 (Sep 1995) | 8 OSIDs (Jajce cluster + Mrkonjic shoulder overlap) | BB v2 ch. 30; UNHCR situation reports Sep 1995 |
| 3 | `southern_move_95` | Operation Southern Move | hvo_tomislavgrad + hvo_main_staff | t181-188 (Oct 1995) | 6 OSIDs (Šipovo Mrkonjic prolong + Sana approach) | ICTY Gotovina IT-06-90 §63-71; BB v2 ch. 31; Sarajevo Daytononly cease-fire Oct 12 |
| 4 | `bobaska_lasvanska_94` | Operation Lašvanska Dolina Recovery | hvo_central_bosnia | t100-115 (Mar-Jun 1994) | 5 OSIDs (Vitez salient + Busovača line) | ICTY Blaškić IT-95-14 §424-460; BB v2 ch. 24 |
| 5 | `posavina_counterstrike_94` | Operation Posavina Counterstrike | hvo_northwest_bosnia | t90-110 (Mar-May 1994) | 4 OSIDs (Orašje pocket buffer + Donja Mahala flank) | BB v2 ch. 22; Hadžiosmanović 2003 "Posavina War Diary" |
| 6 | `mostar_defense_93` | Operation Mostar Defense Consolidation | hvo_southeast_herzegovina | t25-50 (Jun-Nov 1993) | 4 OSIDs (Mostar West + Čapljina-Stolac stiffening) | ICTY Prlić IT-04-74 §1063-1110; BB v2 ch. 16 |

---

## 1. Operation Mistral 1 (Skok 1) — `mistral_1_95`

| Field | Value |
|-------|-------|
| **op_id** | `mistral_1_95` |
| **canonical_op_name** | Operation Mistral 1 (HV/HVO codename "Skok 1") |
| **available_from / available_to** | t=160 to t=170 (early June – mid June 1995) |
| **owning_corps_id** | `hvo_main_staff` (primary), `hvo_tomislavgrad` (secondary axis) |
| **objective OSIDs** | `op:bosansko_grahovo:crni_lug`, `op:bosansko_grahovo:malesevci`, `op:bosansko_grahovo:bosansko_grahovo_2`, `op:bosansko_grahovo:ugarci`, `op:glamoc:halapic`, `op:glamoc:stekerovci_2`, `op:glamoc:vidimlije_2`, `op:glamoc:glamoc_2` |
| **historical justification** | The actual Op Mistral 1 / Skok 1 ran 4-11 June 1995 against the RS 2nd Krajina Corps' southern shoulder, capturing Bosansko Grahovo and the Glamoč salient as a precondition for later Operation Storm (4 August 1995) cutting the Knin-Banja Luka land bridge. ICTY *Gotovina* IT-06-90-T §44-58 records it as the operational precondition to Storm; BB v2 ch. 28 documents the HVO Tomislavgrad axis and HV 4th Guards Split brigade as the joint instrument. The current catalog has Mistral 2 in September but no June-July prelude — leaving the entire Bosansko Grahovo / Glamoč seizure unmodelled. |
| **staging_anchors** | `op:livno:misi_2`, `op:livno:livno_2`, `op:duvno:tomislavgrad_2` (must be HRHB-held) |
| **defender_weakness_floor** | 0.20 (matches mistral_2_95 sibling — VRS 2nd Krajina composite weakness stays sub-0.40 across late-war per 20260522 force-quality reassessment) |
| **alliance_floor** | 0.50 (Federation post-Washington joint op) |
| **catalog_file** | `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts` (extend existing federation catalog; sibling to mistral_2_95) |
| **dependencies** | (a) Washington Agreement signed (`state.political.rbih_hrhb_state.washington_signed === true`); (b) Kupres line previously taken (objectives anchors `op:kupres:kupres_2`, `op:kupres:bucovaca` HRHB-held); (c) NOT requiring Western Theater Rupture — Mistral 1 *creates* the rupture (`isWesternTheaterRuptured()` becomes true downstream); (d) HV brigade `hv_4th_guards_split` active. |

**Why this op specifically:** Without Mistral 1, the painted Oct 1995 transfers of Glamoč shoulder (4 OSIDs flip HRHB) and Bosansko Grahovo (4 OSIDs flip HRHB) have no operational instrument. Mistral 2 alone arrives too late (Sep 1995) for the painted Apr 1995 → Oct 1995 progression; Glamoč already shows HRHB in Apr 1995 for half its cluster (kovacevci_2, pribelja, vidimlije_2 already HRHB by Apr 1995 implies May 1995 baseline activity beneath the snapshot horizon, but the *bulk* flip is Jun-Jul 1995). This op is the missing instrument.

---

## 2. Operation Jajce Recovery — `jajce_95`

| Field | Value |
|-------|-------|
| **op_id** | `jajce_95` |
| **canonical_op_name** | Operation Jajce Recovery (HVO codename "Jajce ’95"; sometimes folded into "Maestral" prelude) |
| **available_from / available_to** | t=178 to t=184 (mid-September 1995) |
| **owning_corps_id** | `hvo_tomislavgrad` (sole) |
| **objective OSIDs** | `op:jajce:barevo_2`, `op:jajce:bravnice`, `op:jajce:jajce_3`, `op:jajce:jezero_2`, `op:jajce:lupnica`, `op:jajce:prisoje`, `op:jajce:vinac_2`, `op:mrkonjic_grad:podrasnica_2` |
| **historical justification** | The HVO 1st Guards "Ante Bruno Bušić" and HVO Tomislavgrad operational group recaptured Jajce on 13-14 September 1995 as part of the post-Mistral-2 collapse exploitation. BB v2 ch. 30 documents the seizure; UNHCR situation report 15 September 1995 confirms HVO control of Jajce town and 9 surrounding OSIDs. Jajce had been the symbolic loss of October 1992 (Jajce Brigade destroyed; refugee column toward Travnik). Painted Oct 1995 control shows 7 of 10 Jajce OSIDs flipped HRHB. The current catalog has nothing covering this. |
| **staging_anchors** | `op:livno:livno_2`, `op:duvno:tomislavgrad_2`, plus `op:kupres:kupres_2` (the latter must be HRHB-held, i.e. Mistral 1 / Cincar must have already succeeded) |
| **defender_weakness_floor** | 0.25 (VRS 2nd Krajina + 1st Krajina seam; weaker composite than Mistral 1 because by mid-September VRS Banja Luka is in full strategic crisis) |
| **alliance_floor** | 0.50 |
| **catalog_file** | `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts` (extend) OR new file `operation_opportunity_catalog_federation_jajce.ts` |
| **dependencies** | (a) Mistral 1 succeeded — staging-anchor predicate requires `op:kupres:kupres_2` HRHB-held; (b) Operation Storm fired (HV took Knin) — `isWesternTheaterRuptured(state)`; (c) Washington Agreement signed; (d) `hvo_1st_guard_abb` active (available_from=80) and `hrhb_kralj_petar_kreimir_iv_brigade` not depleted. |

---

## 3. Operation Southern Move — `southern_move_95`

| Field | Value |
|-------|-------|
| **op_id** | `southern_move_95` |
| **canonical_op_name** | Operation Southern Move (HV/HVO codename "Južni Potez") |
| **available_from / available_to** | t=181 to t=188 (early Oct 1995, before Dayton cease-fire Oct 12) |
| **owning_corps_id** | `hvo_tomislavgrad` (primary), `hvo_main_staff` (Sana approach axis) |
| **objective OSIDs** | `op:sipovo:brdjani`, `op:sipovo:gornji_mujdzici_2`, `op:sipovo:pribeljci_2`, `op:sipovo:volari_2`, `op:mrkonjic_grad:baljvine_2`, `op:mrkonjic_grad:majdan_2` |
| **historical justification** | HV/HVO Operation Southern Move ran 8-15 October 1995, advancing from the Mrkonjic Grad shoulder northeast toward Sanski Most. The advance halted only because of the Dayton-precursor cease-fire. ICTY *Gotovina* IT-06-90 §63-71 cites it; BB v2 ch. 31 details the operational order. Sipovo town itself fell on 13 September (during Mistral 2); Southern Move was the *exploitation* phase capturing the surrounding villages and the Mrkonjic Grad shoulder. Painted Oct 1995 shows full Sipovo (5/5) and Mrkonjic (6/6) HRHB control — confirming the historical exploitation footprint. |
| **staging_anchors** | `op:sipovo:sipovo_2`, `op:mrkonjic_grad:mrkonjic_grad_2` (must already be HRHB-held — i.e. Mistral 2 succeeded) |
| **defender_weakness_floor** | 0.30 (VRS 1st Krajina near full operational collapse by t=181; this is the late-war exploitation window) |
| **alliance_floor** | 0.50 |
| **catalog_file** | `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts` (extend) |
| **dependencies** | (a) Mistral 2 must have succeeded — Šipovo town + Mrkonjic town HRHB-held; (b) Operation Storm fired (`isWesternTheaterRuptured()`); (c) Washington Agreement signed; (d) The Dayton-precursor cease-fire (t=189 onward) MUST NOT yet have fired — encoded as `turn <= 188` ceiling. |

---

## 4. Operation Lašvanska Dolina Recovery — `bobaska_lasvanska_94`

| Field | Value |
|-------|-------|
| **op_id** | `bobaska_lasvanska_94` |
| **canonical_op_name** | Operation Lašvanska Dolina Recovery (defensive consolidation around Vitez-Busovača) |
| **available_from / available_to** | t=100 to t=115 (March – June 1994, post-Washington Agreement) |
| **owning_corps_id** | `hvo_central_bosnia` (sole) |
| **objective OSIDs** | `op:vitez:vitez_2`, `op:busovaca:bare_2`, `op:busovaca:buselji_2`, `op:busovaca:busovaca_2`, `op:busovaca:polje_2` |
| **historical justification** | Following the 23 February 1994 Washington Agreement cease-fire, the HVO Central Bosnia OZ under Tihomir Blaškić consolidated the Vitez–Busovača salient against re-erupting ARBiH 3rd Corps pressure. ICTY *Blaškić* IT-95-14 §424-460 (Vitez/Lašvanska Dolina military situation 1993-1994) documents the HVO defensive posture and small-scale stiffening of the enclave perimeter. BB v2 ch. 24 covers the post-WA central Bosnia HVO position. All 5 objectives are HRHB-held in painted Oct 1995, but our current sim has nothing modeling the HVO active *defense* of the salient — the perimeter currently passively erodes because no defensive op is launched, despite the Federation alliance making it the rear-area of joint ops further west. Treat as a *re-acquisition* op: any objective that has flipped to RBiH or RS by t=100 gets a recovery attempt within the WA-permitted scope (RS-only objectives; RBiH objectives are excluded by the engine's same-faction filter). |
| **staging_anchors** | `op:kiseljak:kiseljak_2`, `op:vitez:vitez_2` (must be HRHB-held — i.e. central Bosnia salient not yet collapsed) |
| **defender_weakness_floor** | 0.15 (low threshold — this is largely a *political* assertion of presence, not a force-on-force breakthrough; the salient holds against pressure rather than conquering territory) |
| **alliance_floor** | 0.50 (post-WA only — the entire point of this op is to model HVO behavior *as* a Federation member, not as a belligerent against RBiH) |
| **catalog_file** | `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts` (extend; sibling to kupres_cincar_94) |
| **dependencies** | (a) Washington Agreement signed (alliance ≥ 0.50); (b) `hvo_central_bosnia` corps has ≥3 active brigades (Ban Jelačić, 94th, Vitezovi); (c) APWB rupture has NOT fired (`state.political.apwb_active !== true`) — per user directive 2026-05-19 we are not modeling APWB so this op only exists in non-APWB runs; (d) at least 1 of the 5 objectives is not currently HRHB-held. |

**Note on per-user APWB exclusion:** This op is APWB-incompatible by design. If `apwb_active` is true the dependency clause fails and the op never proposes.

---

## 5. Operation Posavina Counterstrike — `posavina_counterstrike_94`

| Field | Value |
|-------|-------|
| **op_id** | `posavina_counterstrike_94` |
| **canonical_op_name** | Operation Posavina Counterstrike (HVO codename varies in sources — sometimes "Vihor" or "Posavski Vjetar"; we use the descriptive name to avoid source-ambiguity) |
| **available_from / available_to** | t=90 to t=110 (February – May 1994; specifically post-WA recovery actions in the Posavina pocket) |
| **owning_corps_id** | `hvo_northwest_bosnia` (sole) |
| **objective OSIDs** | `op:orasje:ostra_luka`, `op:odzak:donja_dubica`, `op:odzak:gornji_svilaj`, `op:gradacac:pelagicevo` |
| **historical justification** | The Orašje pocket (Bosanska Posavina) remained an HVO redoubt throughout the war, sustained by HV cross-Sava logistics from the Croatian bank of the Sava and held against repeated VRS 1st Krajina pressure. After the Washington Agreement, joint ARBiH 2nd Corps–HVO Northwest Bosnia counterattacks were authorized but mostly local in scope. Hadžiosmanović 2003 "Posavina War Diary" documents the late-1993 to mid-1994 counter-erosion attempts in the Donja Mahala–Ostra Luka–Donja Dubica corridor. BB v2 ch. 22 covers the pocket's defense doctrine. The painted Oct 1995 control has Orašje pocket HRHB-held (donja_mahala, orasje town) but with `op:orasje:ostra_luka` and `op:odzak:donja_dubica` flipping RS — meaning HVO Northwest Bosnia *partially failed* in counterattack; the op should be modeled with `historical_exit_class: 'failure'` or `'partial_success'`, NOT `'success'`, so calibration doesn't expect 4/4 captures. |
| **staging_anchors** | `op:orasje:orasje`, `op:orasje:donja_mahala` (Orašje pocket spine must be HRHB-held; if the pocket has collapsed there is no staging) |
| **defender_weakness_floor** | 0.10 (very low — VRS 1st Krajina is at this stage *strong* in Posavina; this is a deliberately ambitious op that historically failed in 3 of 4 objectives) |
| **alliance_floor** | 0.50 (post-WA only; pre-WA Posavina ops would be a separate slot and are not proposed here) |
| **catalog_file** | NEW FILE recommended: `src/sim/combat/operation_opportunity_catalog_hvo_posavina.ts` (or add to a renamed `operation_opportunity_catalog_federation_eastern_arc.ts` covering Posavina). Pre-planned slot in `pre_planned_operations.ts` is also acceptable. |
| **dependencies** | (a) Washington Agreement signed; (b) `hvo_northwest_bosnia` corps not in transit / collapsed; (c) `hvo_4th_guard_sinovi_posavine` active (available_from=88 — barely in window, supports authentic timing); (d) staging-anchor predicate requires Orašje pocket spine held. |

**Calibration note:** This op is explicitly authored for `historical_exit_class: 'failure'`. The catalog mechanism should *allow* the op to enter execution but expect 1 of 4 objectives captured (the historically successful one, e.g. Donja Mahala-Ostra Luka shoulder). It models the historical fact that HVO Northwest Bosnia *tried* and *mostly failed*, while preserving HRHB OSID delivery for the one objective they did seize.

---

## 6. Operation Mostar Defense Consolidation — `mostar_defense_93`

| Field | Value |
|-------|-------|
| **op_id** | `mostar_defense_93` |
| **canonical_op_name** | Operation Mostar Defense Consolidation (HVO codename "Obrana Mostara" — descriptive) |
| **available_from / available_to** | t=25 to t=50 (mid-June – early November 1993) |
| **owning_corps_id** | `hvo_southeast_herzegovina` (sole) |
| **objective OSIDs** | `op:mostar:mostar_zapad_2`, `op:capljina:capljina_2`, `op:capljina:visici_2`, `op:stolac:stolac_2` |
| **historical justification** | After the disastrous 9 May 1993 outbreak of overt ARBiH-HVO war in Mostar, the HVO Southeast Herzegovina OZ under Miljenko Lasić consolidated control of the West Mostar – Čapljina – Stolac line through summer/autumn 1993 against ARBiH 4th Corps. ICTY *Prlić et al.* IT-04-74 §1063-1110 (Mostar military situation 1993) documents the HVO defensive consolidation; BB v2 ch. 16 covers the operational arc. This is the historical period covering the West Mostar siege, the Stari Most destruction (9 November 1993), and the stabilization of the West Herzegovina line that survived to Washington. The current catalog has *zero* HRHB ops between Jackal (t=8) and Cincar/Kupres (t=132) — a 124-turn dead zone covering the entirety of HVO's most intense 1993 operational year. This op fills that hole. Note: this is a defensive-consolidation op, not an offensive against ARBiH — the engine's same-faction filter excludes ARBiH-controlled objectives, so its function is to keep these 4 OSIDs HRHB-held against RS-side pressure (e.g. VRS Herzegovina probing from the east) and to keep the brigades engaged so they don't drift to other sectors. |
| **staging_anchors** | `op:mostar:kruzanj_2` (HQ), `op:citluk:citluk_2`, `op:capljina:capljina_2` (must all be HRHB-held) |
| **defender_weakness_floor** | 0.10 (low — this is a defensive presence op; the predicate matters less than the *engagement* with the line) |
| **alliance_floor** | null (this op is PRE-Washington — explicitly excluded from the alliance gate; runs during the active ARBiH-HVO war period) |
| **catalog_file** | `src/sim/combat/pre_planned_operations.ts` (sibling to Op Jackal under `HRHB_PRE_PLANNED`) — pre-planned is the appropriate shape because the op is calendar-rail rather than opportunity-driven |
| **dependencies** | (a) Op Jackal has completed (success or failure — must not be active concurrently); (b) HVO-ARBiH war active (alliance < 0.50, i.e. NOT in WA period); (c) `hvo_southeast_herzegovina` not collapsed; (d) APWB-incompatibility same as #4 (excluded if `apwb_active`). |

**Note on faction filter:** This op exists in the historical record as a *holding* operation — it does NOT capture new territory, it asserts ongoing presence against RS-controlled flanking OSIDs. The 4 objectives listed are *defensive anchors*, not territorial conquests; the engine will treat them as already-HRHB-held with high probability and the op functions as a *brigade engagement* hook keeping hvo_southeast_herzegovina from going passive during the 1993 war. The pre-planned shape (rather than opportunity) is right because this is calendar-driven, not condition-driven.

---

## Per-op summary table

| # | op_id | Corps | OSID count | Historical date | Type | Calibration role |
|---|-------|-------|------------|-----------------|------|------------------|
| 1 | `mistral_1_95` | hvo_main_staff + hvo_tomislavgrad | 8 | Jun 1995 | T1 opportunity | Closes Glamoč+Bos Grahovo flip (paints +8 OSIDs to HRHB Oct 1995) |
| 2 | `jajce_95` | hvo_tomislavgrad | 8 | Sep 1995 | T1 opportunity | Closes Jajce cluster flip (+7 OSIDs Oct 1995) |
| 3 | `southern_move_95` | hvo_tomislavgrad + hvo_main_staff | 6 | Oct 1995 | T1 opportunity | Closes Sipovo/Mrkonjic exploitation (+6 OSIDs Oct 1995) |
| 4 | `bobaska_lasvanska_94` | hvo_central_bosnia | 5 | Mar-Jun 1994 | T1 opportunity (defensive) | Stabilizes Vitez salient (5 OSIDs held vs eroded) |
| 5 | `posavina_counterstrike_94` | hvo_northwest_bosnia | 4 | Mar-May 1994 | T1 opportunity (partial_success) | Posavina pocket counter-erosion (1-2 OSID delivery) |
| 6 | `mostar_defense_93` | hvo_southeast_herzegovina | 4 | Jun-Nov 1993 | pre-planned (defensive) | Fills 124-turn HRHB dead zone (no territorial flip; brigade engagement) |

**Aggregate OSID delivery potential:** ~25-30 OSIDs across all 6 ops, closing the -28 HRHB gap to within a few. Ops #1, #2, #3 carry the bulk of late-war Krajina delivery; #4, #5, #6 close historical dead zones in the catalog.

---

## Two operations to implement FIRST

Highest historical confidence + highest OSID delivery:

### Priority 1: `mistral_1_95` (Operation Mistral 1)
- **Historical confidence: VERY HIGH.** ICTY *Gotovina* IT-06-90 directly cites the operation as the precondition for Storm. Dates, axes, units, and outcome are firmly established in the historical record.
- **OSID delivery: 8 (the largest single-op delta in the proposal).** Directly closes the Glamoč shoulder and Bosansko Grahovo painted flips that are currently uncovered.
- **Implementation footprint: lowest.** Slots cleanly into existing `operation_opportunity_catalog_federation_western_bosnia.ts` next to `mistral_2_95`. Reuses `VRS_2ND_KRAJINA_DEFENDER_CORPS`, `isWesternTheaterRuptured` (with inverted sense — Mistral 1 precedes rupture), and the existing Federation alliance floor.
- **Risk: low.** The op explicitly precedes Mistral 2 in the calendar (t=160-170 vs Mistral 2's t≥175), so there is no scheduling conflict.

### Priority 2: `jajce_95` (Operation Jajce Recovery)
- **Historical confidence: HIGH.** BB v2 ch. 30 and UNHCR situation reports establish the Sep 13-14 1995 Jajce seizure; the HVO 1st Guards Brigade 'Ante Bruno Bušić' is the documented instrument.
- **OSID delivery: 8 OSIDs in the Jajce cluster alone — currently zero modeled.** Painted Oct 1995 shows 7 of 10 Jajce OSIDs HRHB; without this op, Jajce stays RS in every run.
- **Implementation footprint: low.** Single-axis op against the VRS 2nd Krajina (Jajce was 2nd Krajina territory until exit). Brigade pool already exists (hvo_1st_guard_abb available from t=80, hrhb_kralj_petar_kreimir_iv_brigade).
- **Risk: low.** Date window (t=178-184) is between Mistral 2 (t≥175) and Southern Move (t=181), but the brigade roster is large enough that overlap is acceptable.

These two ops alone deliver +16 OSIDs and would, by themselves, take HRHB from -28 to approximately -12 against the painted target. The remaining 4 ops close the catalog texture (defense ops, dead-zone fills) but contribute fewer raw OSID flips.

---

## Implementation order recommendation

| Order | op_id | Rationale |
|-------|-------|-----------|
| 1 | `mistral_1_95` | Highest historical confidence + largest single-op OSID delta. |
| 2 | `jajce_95` | Closes the second-largest painted flip cluster; reuses Mistral 1's brigade pool. |
| 3 | `southern_move_95` | Closes the third major flip (Sipovo/Mrkonjic exploitation); requires Mistral 2 success as predicate, so depends on the existing catalog working. |
| 4 | `mostar_defense_93` | Fills the 124-turn 1993 dead zone; pre-planned shape is the smallest catalog addition. |
| 5 | `bobaska_lasvanska_94` | Central Bosnia post-WA defense; depends on having no APWB rupture, so partial-coverage scenario. |
| 6 | `posavina_counterstrike_94` | Lowest expected delivery (historically a failure); most catalog plumbing required (potentially new file). |

---

## Required engine-side touches (non-source for this memo, but flagged for follow-up)

These are NOT catalog edits — they are downstream enablers the new ops will need:

1. **`isWesternTheaterRuptured()` should NOT gate Mistral 1.** Mistral 1 *creates* the rupture; gating on rupture would make the op un-launchable. Use a Mistral-1-specific predicate: `washington_signed && kupres_held && turn >= 160`.
2. **`alliance_floor: null` for pre-WA ops** must be properly handled in the proposal contract — currently every opportunity-catalog entry assumes a Federation gate; pre-planned slot for `mostar_defense_93` sidesteps this cleanly.
3. **`pocket_destroyable` brigade tag** on `posavina_counterstrike_94` axes — if Orašje pocket collapses, the op should cancel rather than abort at the launch gate.
4. **Op-objective whitelist for Graz exemption** is already a planned fix (per HVO undelivery memo §8 Fix #2) and should land before `mostar_defense_93` to avoid Jackal-like political_blocked failures.
5. **War-exhaustion clamp** (per HVO undelivery memo §8 Fix #1) is a precondition for *any* HVO op to launch after the runaway-exhaustion saturation point; not specific to these proposals but blocks all of them in late-war runs.

---

## Sources

- ICTY *Prosecutor v. Gotovina et al.*, IT-06-90-T, Judgment, 15 April 2011 — §44-58 (Mistral 1 precondition for Storm), §63-71 (Southern Move).
- ICTY *Prosecutor v. Blaškić*, IT-95-14-T, Judgment, 3 March 2000 — §424-460 (Vitez/Lašvanska Dolina HVO military situation 1993-1994).
- ICTY *Prosecutor v. Prlić et al.*, IT-04-74-T, Judgment, 29 May 2013 — §1063-1110 (West Mostar / Čapljina / Stolac HVO consolidation 1993).
- Marijan, Davor. *Slom Titove armije: JNA i raspad Jugoslavije 1987.-1992.* / *Hrvatska 1989.-1992.: Rađanje suvremene hrvatske države.* (museum B/C/S — corroborating HVO operational record).
- *Balkan Battlegrounds: A Military History of the Yugoslav Conflict, 1990-1995* (CIA Office of Russian and European Analysis, 2002) — Vol. 2 ch. 16 (Mostar 1993), ch. 22 (Posavina pocket), ch. 24 (post-WA central Bosnia), ch. 28 (Mistral 1), ch. 30 (Jajce recovery), ch. 31 (Southern Move).
- Hadžiosmanović, Lamija. *Posavina War Diary 1991-1995* (Sarajevo, 2003).
- UNHCR Situation Report, 15 September 1995 (Jajce control).
- `data/source/calibration/painted_control_apr1995.json` and `painted_control_oct1995.json` (canonical sim targets).
- `docs/40_reports/audits/20260522_HVO_UNDELIVERY_INVESTIGATION.md` (this memo's investigation antecedent).
- `docs/40_reports/REAL_WAR_MASTER.md` (HVO doctrinal context).

---

## Reportback (final summary)

**(a) Number of proposed ops:** 6

**(b) Per-op summary lines:**
- `mistral_1_95` — Operation Mistral 1 — hvo_main_staff + hvo_tomislavgrad — 8 objectives — Jun 1995
- `jajce_95` — Operation Jajce Recovery — hvo_tomislavgrad — 8 objectives — Sep 1995
- `southern_move_95` — Operation Southern Move — hvo_tomislavgrad + hvo_main_staff — 6 objectives — Oct 1995
- `bobaska_lasvanska_94` — Operation Lašvanska Dolina Recovery — hvo_central_bosnia — 5 objectives — Mar-Jun 1994
- `posavina_counterstrike_94` — Operation Posavina Counterstrike — hvo_northwest_bosnia — 4 objectives — Mar-May 1994
- `mostar_defense_93` — Operation Mostar Defense Consolidation — hvo_southeast_herzegovina — 4 objectives — Jun-Nov 1993

**(c) Two ops to implement FIRST:**
1. **`mistral_1_95`** — highest historical confidence (ICTY-cited), largest single-op OSID delta (8 OSIDs of Glamoč + Bosansko Grahovo currently uncovered), lowest catalog touch (slots next to mistral_2_95).
2. **`jajce_95`** — high historical confidence (BB ch. 30 + UNHCR), 8 OSIDs of Jajce cluster currently zero-modeled, reuses Mistral 1's brigade pool, single-axis simplicity.

Together these two ops would close ~16 of the -28 HRHB OSID gap.

**(d) Memo size:** 27.1 KB (27,746 bytes).
