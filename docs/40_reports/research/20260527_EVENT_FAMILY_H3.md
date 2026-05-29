# Event Family Worksheet — H3: HRHB Vance-Owen Pressure

**Date:** 2026-05-27
**Family ID:** H3
**Faction scope:** HRHB (responding faction); cross-faction visibility to RBiH and the international mediators
**Source tier:** `icty_icj_un` (Prlić et al. IT-04-74; Vance-Owen Plan agreement text — UN S/25221, UN S/25403) corroborated by `corroborated_participant` (Tuđman Presidential Transcripts admitted at Prlić) and `balkan_battlegrounds` (BB Vol. II diplomatic chronology)
**Sensitive-history ring:** none for the H3 patron-pressure decision itself; H3 sits in a Ring-1/2-adjacent cascade (its outcomes condition the central-Bosnia war state) but the H3 row itself authorizes no atrocity and is a diplomatic-acceptance decision, not an operational order.
**Status:** Draft for Phase A review.

## 1. Cited Historical Narrative

The Vance-Owen Peace Plan (VOPP), tabled by UN/EC mediators Cyrus Vance and Lord David Owen on 2 January 1993, proposed a ten-province decentralized Bosnia-Herzegovina under a single sovereign state. **Provinces 3, 8, and 10 mapped to Croat-majority territories** in northern Bosnia (Province 3), western Herzegovina (Province 8), and central Bosnia (Province 10) — a territorial framework that **broadly favored the HZ HB project** by giving HVO command authority in three of ten provinces, including the Banovina-aligned core areas. (Vance-Owen Plan agreement text reproduced in UN S/25221 Annex VII and S/25403 Annex II; analytic treatment in Prlić et al. IT-04-74-T Trial Judgment Vol. 3 §§412-498.)

Mate Boban signed the VOPP on **2 January 1993** in Geneva on behalf of HZ HB — making HRHB the first of the three parties to accept the full plan, well ahead of the RBiH Presidency (which accepted in late March 1993 under U.S. pressure) and the RS Assembly (which rejected the plan on 6 May 1993 at Pale). Prlić Trial Judgment Vol. 3 §§445-498 reconstructs the Boban-Owen-Vance signature event and the Zagreb coordination that preceded it. The Tuđman Presidential Transcripts admitted at Prlić (Vol. 3 §§460-485) record Tuđman directing Boban to sign and to read the provincial map as the **legal foundation for HVO command-subordination claims** over ARBiH units in the designated Croat provinces.

The historical posture of the HZ HB Presidency in the H3 window (January-May 1993) was therefore an **`acknowledge_pressure` of patron Zagreb plus active embrace of the plan** — accepting the VOPP, signing the agreement, and treating the provincial map as the operative territorial framework. This posture had three operational consequences documented in Prlić and BB II:

1. **The HVO ultimatum at Gornji Vakuf (11-25 January 1993; see H2)** — Boban's command read Province 10 as authorizing HVO command subordination of ARBiH 4th Corps units, generating the operational pretext for the H2 escalation chain. (Prlić Vol. 2 §§221-310; BB II pp. 448, 452.)
2. **The Lašva-valley cascade (April 1993; H5 incidents — Ahmići, Vitez, Busovača)** — same provincial-framework pretext applied at the central-Bosnia operational scale. (Prlić Vol. 2 §§311-450; Blaškić IT-95-14-T §§221-300; Kordić IT-95-14/2-T §§560-720.)
3. **Diplomatic consolidation of the patron axis** — Zagreb's investment in VOPP raised the political cost of HRHB defection, locking the HZ HB Presidency into the Croat-republic line (H1) at the moment the plan collapsed in May 1993. (Prlić Vol. 3 §§485-498; Tuđman transcripts §§475-490.)

The plan **collapsed on 6 May 1993** when the RS Assembly at Pale rejected it (see R6 worksheet), but the HZ HB Presidency's signature of the plan is the canonical historical fact for H3.

The existing event `zagreb_restrains_boban_vopp` (`data/scenarios/events/war_1993.json:758`) handles the **distinct but related H4 row** — Zagreb's restraint order on HVO operations during the VOPP acceptance window. H3 (this worksheet) is the **HRHB acceptance posture** itself; H4 is the **Zagreb restraint order** Boban received during the acceptance window. The two rows are paired but separate.

## 2. Defensible Historical/Default Option

- **Label:** `acknowledge_pressure` — Boban signs the Vance-Owen Plan in Geneva on Zagreb's direction; HZ HB Presidency adopts the provincial-map framework as the operative territorial basis; the HVO command treats Provinces 3 / 8 / 10 as legitimating command-subordination claims over co-located ARBiH units.
- **Rationale:** This is the documented historical choice of the HZ HB Presidency on 2 January 1993. The signature event is in the binding legal record (Prlić Trial Judgment Vol. 3 §§445-498 and Appeals Judgment §§612-650), and the Tuđman transcripts record the patron coordination that produced it.
- **Citation:** Prlić et al. IT-04-74-T Trial Judgment (29 May 2013) Vol. 3 §§412-498; Prlić Appeals Judgment (29 Nov 2017) §§612-650; Vance-Owen Plan agreement text UN S/25221 Annex VII and UN S/25403 Annex II; Tuđman Presidential Transcripts admitted at Prlić Vol. 3 §§460-485; BB Vol. II diplomatic chronology January-May 1993.

## 3. Proposed Counterfactual Options

### Option: `resist_patron`

- **Label:** `resist_patron` — Refuse Zagreb's instruction to sign; reject the provincial-map framework; preserve HRHB freedom of operational action outside the VOPP territorial framework.
- **Historical analogy:** The Karadžić-led RS Assembly rejection of VOPP at Pale (6 May 1993; see R6 worksheet) is the analogous patron-resistance precedent within the Bosnian War. For HRHB, no faction-level resistance to Zagreb on VOPP is documented in the historical record — the analogy is structurally borrowed from R6 rather than from any HRHB decision point. Pre-1992 Kljujić's posture (unified-BiH line within republican borders; see H1 worksheet) is the closest internal-HDZ-BiH precedent for resisting the Zagreb axis, but the Kljujić line was already foreclosed by his February 1992 removal and is not a 1993 counterfactual.
- **Design provenance:** `design_counterfactual` — no HZ HB Presidency document opposes signature in the historical record. Branch is a plausible alternative grounded in the structural existence of patron-resistance options within the wider Bosnian War (R6) and in the operational fact that VOPP signature was reversible (Boban could have withdrawn signature when the plan collapsed in May 1993; he did not).
- **Sensitive-history check:** Confirmed — option authorizes no atrocity. `resist_patron` is a diplomatic-acceptance reversal, not an operational order. Foreclosing the patron-locked Province-10 pretext for the Gornji Vakuf / Lašva-valley operational tempo is a structural downstream effect, achieved via `closes_events_runtime` and flag-gated downstream triggers — never through any sensitive-history authoring.
- **Cost floor (Phase D required):** Per the R7 / H1 precedent (counterfactual cost floor preventing override from dominating historical default), Phase D must specify a `patron_confidence: -30` minimum (Zagreb withdraws backing for the HZ HB territorial project), `equipment_quality_modifier` reduction reflecting HV officer-secondment / fuel / ammo withdrawal documented at Prlić Vol. 2 §§220-260 and Vol. 3 §§485-498, plus `alliance_lock` cost reflecting that the HZ HB Presidency was structurally dependent on Zagreb for cohesion. Final calibration deferred to Phase D scenario testing.

## 4. Material Effects (per packet §3.3)

Per packet §4 H3 row: patron pressure, dimension shifts; opens VOPP HRHB track. Field recommendations for Phase D authoring (no existing `hrhb_vance_owen_pressure_1993` row in catalog — Phase D authoring needed):

- **`sets_flags`** (NEW, Phase D):
  - `acknowledge_pressure`: `hrhb_vance_owen_posture: 'accept'`, `vopp_hrhb_signed: true`
  - `resist_patron`: `hrhb_vance_owen_posture: 'reject'`, `vopp_hrhb_signed: false`
- **`effects[]`** and **`dimension_shifts[]`** (NEW, Phase D):
  - `acknowledge_pressure` HRHB: `patron_confidence: +15` (Zagreb satisfaction), `international_standing: +5` (signing posture), `military_credibility: +3` (provincial-map authority claim), `internal_cohesion: 0`. RBiH: `alliance_change: -0.10` (HRHB signing under Zagreb direction signals patron-axis primacy over RBiH alliance).
  - `resist_patron` HRHB: `patron_confidence: -30` (Zagreb withdrawal — cost floor; see §3 above), `international_standing: -5` (diplomatic breakage), `military_credibility: -3`, `internal_cohesion: -5`. RBiH: `alliance_change: +0.10` (resistance to patron read as alignment with broader BiH framework).
- **`enables_events_runtime`** (NEW, Phase D):
  - `acknowledge_pressure`: opens H4 `zagreb_restrains_boban_vopp` (already in catalog) — the Zagreb restraint order is a follow-on of HZ HB's signature acceptance and the VOPP acceptance window; documents the causal link. Documentary only, not a hard gate (H4 will retain its own trigger predicate per Gate §1.5 #11; runtime-open records the causality in `event_causality_log`).
  - `resist_patron`: opens X3 `owen_stoltenberg_overall` reachability earlier (counterfactual: collapse of VOPP HRHB signature shifts the diplomatic gravity toward Owen-Stoltenberg; documented at Prlić Vol. 3 §§498-540). Opens no atrocity events.
- **`closes_events_runtime`** (NEW, Phase D):
  - `acknowledge_pressure`: closes none directly. The Province-10 framework pretext that conditions the H2 / H5 operational tempo is **flag-set rather than runtime-opened** — the pretext is read by downstream operational systems on the `vopp_hrhb_signed: true` flag and the alliance state; per Gate §1.5 #11 the central-Bosnia war chain (H2, H5) fires only on mechanical condition satisfaction. H3 itself authorizes no atrocity event.
  - `resist_patron`: closes the documentary causal chain from H3 → H4 (H4 becomes unreachable via the H3 ancestor path; H4's own historical-default ancestor reachability per §3.6 must remain satisfied via the alternate ancestor — Phase D loader test required, see §7 below). Does **not** directly close Ahmići / Stupni Do / Mostar-bridge — those Ring 1/2 incidents are emergent on the war chain that mechanically foreclosure of H3-pretext makes structurally less likely but does not authorially close.
- **`branch_tag`** (per packet §2.2 vocabulary; new HRHB sub-family `hrhb_vance_owen`):
  - `acknowledge_pressure` → `hrhb_vopp_accept`
  - `resist_patron` → `hrhb_vopp_reject`
- **`trigger.condition`** (NEW, Phase D): turn range matching the historical 2 January 1993 signature window (approximately turn 26-32 in a 188w calendar) plus `event_fired: hrhb_political_goal` to ensure H1 has fired and a Croat-republic / dual-track posture is in state. No `requires_enabled: true` gate — the trigger should fire emergently on the calendar+flag predicate.

## 5. Downstream Opens/Closes

- **Opens (eligibility) — `acknowledge_pressure`:**
  - `zagreb_restrains_boban_vopp` (H4 — already in catalog at `data/scenarios/events/war_1993.json:758`)
  - Documentary opens via the patron-axis state into the X2 `vance_owen_overall` composite gate
- **Opens (eligibility) — `resist_patron`:**
  - X3 `owen_stoltenberg_overall` reachability earlier (counterfactual — see §4)
  - No new atrocity opens
- **Closes (eligibility) — `acknowledge_pressure`:**
  - None directly. Downstream operational tempo conditioning is flag-mediated per Gate §1.5 #11.
- **Closes (eligibility) — `resist_patron`:**
  - H3 → H4 documentary ancestor chain; H4 must retain alternate historical-default ancestor reachability per §3.6 (see §7).
  - Indirect mechanical foreclosure of Province-10 pretext in H2 / H5 — flag-mediated, not authorial.
- **Branch-tag vocabulary** (additions to `event_families.ts` per branch-tag vocabulary stub): new `hrhb_vance_owen` family; `hrhb_vopp_accept` / `hrhb_vopp_reject` tags.

## 6. Modal Source Notes

> "On 2 January 1993 Mate Boban signed the Vance-Owen Plan in Geneva on Tuđman's direction, making HZ HB the first party to accept the ten-province framework; ICTY Prlić IT-04-74 (Trial Judgment Vol. 3 §§412-498; Appeals §§612-650) finds the patron-coordinated acceptance produced the Province-10 territorial pretext that conditioned the January 1993 Gornji Vakuf operations and the April 1993 Lašva-valley cascade." (Compress to ≤2-sentence modal length in Phase D.)

## 7. Open Questions

1. **H4 ancestor reachability under `resist_patron`.** Per §3.6, an event with `requires_enabled: true` must have at least one historical-default-ancestor-reachable opener. If H3 = `acknowledge_pressure` is the only opener of H4 `zagreb_restrains_boban_vopp`, then H3 = `resist_patron` does not break reachability because the historical-default path through H3 = `acknowledge_pressure` remains. Phase D loader test must verify H4's reachability under the historical-default chain. Defer to Technical Architect + Game Designer.
2. **Province-10 pretext flag mediation.** H3 sets `vopp_hrhb_signed: true` which conditions downstream operational systems but does not directly open H2 / H5 atrocity rows. Phase D must verify that no Ring 1/2 row reads `vopp_hrhb_signed` as a direct trigger — the read must be mediated through alliance state, command-subordination flags, and the existing mechanical predicates per Gate §1.5 #11. Defer to Canon Compliance Reviewer.
3. **Cost floor calibration for `resist_patron`.** Per the R7 / H1 / H1a precedent: Phase D must specify the patron-confidence withdrawal at a level severe enough that `resist_patron` does not trivially dominate `acknowledge_pressure` in counterfactual play. Recommend `patron_confidence: -30` minimum plus `equipment_quality_modifier` reduction tied to HV-secondment withdrawal. Defer to Game Designer.
4. **Interaction with X2 composite (Vance-Owen overall).** X2 is documented in packet §4 X2 as a composite of R6 + B3 + H3. Phase D must wire X2's composite read of `hrhb_vance_owen_posture` together with `rs_assembly_vance_owen_posture` (R6) and `rbih_vance_owen_posture` (B3). Defer to Game Designer for the composite-tag schema design.
