# Event Family Worksheet — H4: Boban / Zagreb Restraint on VOPP

**Date:** 2026-05-27
**Family ID:** H4
**Faction scope:** HRHB (responding faction); patron-axis read from Zagreb (HV / Croatian state)
**Source tier:** `icty_icj_un` (Prlić et al. IT-04-74; Tuđman Presidential Transcripts admitted at Prlić; Blaškić IT-95-14-T) corroborated by `balkan_battlegrounds` (BB Vol. II diplomatic and operational chronology January-May 1993)
**Sensitive-history ring:** none for the H4 patron-restraint decision itself; H4 is a Zagreb→Boban command-restraint order that, when historically obeyed, **suppressed** the operational tempo during the VOPP acceptance window. Foreclosing or defying the restraint is a posture decision, not an atrocity authorization.
**Status:** Draft for Phase A review.

## 1. Cited Historical Narrative

In the **January-May 1993 Vance-Owen acceptance window**, Tuđman issued direct restraint instructions to Boban requiring HVO operational restraint while VOPP signature was being consolidated. The restraint order is documented in the Tuđman Presidential Transcripts admitted at Prlić Vol. 3 §§460-498 — Tuđman directed Boban that "the [Vance-Owen] provincial map is favorable; do not derail it by giving the international community an operational pretext to revise the territorial framework against us." (Substance quoted in Prlić Vol. 3 §§475-485; transcript citations admitted as exhibits at Prlić; analytic treatment in BB Vol. II, January-May 1993 diplomatic-operational chronology.)

The historical record shows the restraint order was **selectively obeyed**:

- **Gornji Vakuf (11-25 January 1993; see H2)** — the HVO ultimatum and offensive operations **predated** the formal restraint instruction (Boban signed VOPP on 2 January; the restraint instruction crystallized over January-February per Tuđman transcripts §§475-485). The Gornji Vakuf operations therefore reflect the pre-restraint phase rather than defiance of the restraint.
- **The interregnum February-March 1993** — operational tempo on the central-Bosnia front was demonstrably reduced relative to the December 1992 / early-January 1993 escalation curve. (BB Vol. II January-March 1993 chronology; Prlić Vol. 2 §§310-330 records the local de-escalation.)
- **The Lašva-valley cascade (April 1993; H5 incidents — Ahmići 16 April, Vitez, Busovača)** — operations resumed **after the VOPP collapse track became clear** through the RS Assembly Pale rejection trajectory (the formal rejection landed 6 May 1993). Prlić Vol. 2 §§311-450 dates the operational tempo resumption to the early-April window when Pale's likely rejection was already apparent in Zagreb intelligence channels. (Tuđman transcripts §§485-498 record Zagreb's read that VOPP was collapsing; restraint instructions softened correspondingly.)

The existing AWWV event `zagreb_restrains_boban_vopp` (`data/scenarios/events/war_1993.json:758`) authors the H4 row with narrative text: *"Tuđman quietly orders Boban to restrain HVO offensive operations. The Vance-Owen provincial map is favorable to Croat Herzegovina — Zagreb needs HRHB to accept the plan, not derail it through military escalation."* The text is faithful to Prlić Vol. 3 §§460-498 and the BB II diplomatic chronology. The current authoring uses `acknowledge_pressure` as the historical-default option label — consistent with packet §4 H4 row.

The historical actor — Boban as HZ HB Presidency head, in the H4 January-April 1993 window — obeyed the restraint instruction during the active VOPP signature window (February-March 1993) and relaxed obedience as the plan visibly collapsed (April-May 1993). The historical default for H4 is therefore `acknowledge_pressure`: the restraint instruction was received and operative across the active window.

## 2. Defensible Historical/Default Option

- **Label:** `acknowledge_pressure` — Boban accepts Tuđman's restraint instruction; HVO operational tempo on the central-Bosnia front is reduced during the active VOPP signature consolidation window; the HZ HB Presidency treats the provincial-map acceptance as the priority objective.
- **Rationale:** This is the documented historical posture of the HZ HB Presidency during the active VOPP signature window (February-March 1993). The restraint instruction is in the Tuđman Presidential Transcripts admitted at Prlić Vol. 3 §§460-498, and the operational tempo reduction is in BB Vol. II's January-March 1993 chronology and Prlić Vol. 2 §§310-330.
- **Citation:** Prlić et al. IT-04-74-T Trial Judgment (29 May 2013) Vol. 2 §§310-330; Vol. 3 §§460-498; Prlić Appeals Judgment (29 Nov 2017) §§612-650; Tuđman Presidential Transcripts admitted at Prlić as exhibits (referenced Vol. 3 §§475-485); Blaškić IT-95-14-T Trial Judgment (3 March 2000) §§220-260; BB Vol. II January-May 1993 chronology.

## 3. Proposed Counterfactual Options

### Option: `resist_patron`

- **Label:** `resist_patron` — Boban defies Tuđman's restraint instruction; HVO command continues operational tempo on the central-Bosnia front during the VOPP signature window; HZ HB Presidency prioritizes operational facts-on-ground over diplomatic acceptance theater.
- **Historical analogy:** No HZ HB Presidency-level defiance of Tuđman is documented in the active VOPP window. The structural analogues are:
  - **The April-May 1993 operational tempo resumption** (Lašva valley) — historically dated to the moment Zagreb relaxed restraint as VOPP collapsed. Counterfactually, the `resist_patron` branch models the HVO command refusing to wait for Zagreb's read on plan viability and pressing tempo throughout the February-March window.
  - **Local HVO command frictions with Mostar** — Prlić Vol. 2 §§280-320 records local-commander pressure for more aggressive operational posture during the restraint window; the counterfactual elevates this local pressure to the Presidency level.
  - **The Karadžić-led RS Assembly defiance of Milošević** (R5 / R6 precedent) — same structural shape (faction-level Presidency defying a patron's diplomatic preference), borrowed across the RS-HRHB analogy.
- **Design provenance:** `design_counterfactual` — no HZ HB Presidency document defies the Tuđman restraint instruction in the historical record. Branch is grounded in (a) the operational record of local-commander pressure, (b) the structural existence of patron-defiance options within the wider Bosnian War, and (c) the operational fact that the April 1993 Lašva tempo resumption shows the HZ HB Presidency was capable of operating without Zagreb's veto when it chose.
- **Sensitive-history check:** Confirmed — option authorizes no atrocity. `resist_patron` is a patron-restraint refusal; the operational tempo it enables emerges from the existing combat / paramilitary / displacement engines per Gate §1.5 #11. **The option must not, per §3.6, carry effects that scale or authorize the Ring 1/2 incidents (Ahmići, Stupni Do, etc.) directly.** Phase D loader test required (§7 below).
- **Cost floor (Phase D required):** Per the R7 / H1 / H3 precedent: `patron_confidence: -25` minimum (Tuđman read of insubordination), `equipment_quality_modifier` reduction reflecting selective HV-secondment / fuel / ammo throttling (Prlić Vol. 2 §§220-260 documents HV-HVO logistics dependency; Zagreb retains the throttle), plus `international_standing: -10` reflecting the patron-axis breakdown's visibility. Final calibration deferred to Phase D scenario testing.

## 4. Material Effects (per packet §3.3)

The row is already authored at `data/scenarios/events/war_1993.json:758` (`zagreb_restrains_boban_vopp`) — Phase D adds runtime-causality fields on top of existing authoring. Field recommendations:

- **`sets_flags`** (additive to existing authoring):
  - `acknowledge_pressure`: `hrhb_zagreb_restraint: 'accepted'`, `hvo_central_bosnia_tempo: 'restrained'`
  - `resist_patron`: `hrhb_zagreb_restraint: 'rejected'`, `hvo_central_bosnia_tempo: 'unrestrained'`
- **`effects[]`** (retain existing authoring; Phase D field-pass should retain narrative effects):
  - `acknowledge_pressure`: morale/alliance effects per existing row text ("Zagreb quietly orders Boban to hold back HVO offensive operations during the Vance-Owen window") — Phase D should add structured `dimension_shifts` per below.
  - `resist_patron`: NEW Phase D authoring.
- **`dimension_shifts[]`** (NEW, Phase D additions):
  - `acknowledge_pressure` HRHB: `patron_confidence: +10` (Zagreb satisfaction), `international_standing: +5` (visible restraint reads as good-faith VOPP signing), `military_credibility: -3` (operational tempo throttle visible to local commanders), `internal_cohesion: -2` (local-commander frustration per Prlić Vol. 2 §§280-320).
  - `resist_patron` HRHB: `patron_confidence: -25` (cost floor — see §3), `international_standing: -10` (visibility of HZ HB insubordination), `military_credibility: +5` (operational decisiveness), `internal_cohesion: +3` (local-commander alignment).
- **`enables_events_runtime`** (NEW, Phase D):
  - `acknowledge_pressure`: opens documentary causal-chain entry into X2 `vance_owen_overall` composite (records that the HRHB acceptance posture remained intact through the active signing window). Does **not** directly open Ring 1/2 incident rows.
  - `resist_patron`: opens H7 `zagreb_orders_hrhb_ceasefire_1994` ancestor reachability earlier (counterfactual — sustained patron-defiance from 1993 conditions the 1994 Washington track's preconditions; documented at Prlić Vol. 3 §§540-590). Does **not** open any Ring 1/2 atrocity rows — the central-Bosnia war chain is already conditioned by H1 / H2 / H3, and H4's restraint-decision foreclosure or non-foreclosure does not directly author the Lašva cascade.
- **`closes_events_runtime`** (NEW, Phase D):
  - `acknowledge_pressure`: closes none directly. The restraint window is observational; downstream operational tempo on the central-Bosnia front is conditioned by H1 / H2 / H3 flags, not directly by H4 outcomes.
  - `resist_patron`: closes the documentary VOPP-acceptance-coherence chain — specifically, the X2 composite-tag read should be sensitive to `hrhb_zagreb_restraint: 'rejected'` as an HRHB-defection signal even within an `acknowledge_pressure` H3 posture. Does **not** directly close Ring 1/2 incidents per Gate §1.5 #11.
- **`branch_tag`** (per packet §2.2 vocabulary; can reuse `hrhb_vance_owen` family from H3 worksheet or create dedicated `hrhb_zagreb_restraint` family — recommend dedicated for clarity):
  - `acknowledge_pressure` → `hrhb_restraint_accepted`
  - `resist_patron` → `hrhb_restraint_rejected`
- **`trigger.condition`** (existing): turn range matching February-April 1993 (approximately turn 30-40 in a 188w calendar); `event_fired: hrhb_vance_owen_pressure_1993` (H3) with `hrhb_vance_owen_posture: 'accept'` (Zagreb only issues restraint to a Boban who has signed); alliance state below threshold not required — the H4 row fires when Zagreb perceives operational tempo as threatening to VOPP signature. Retain.

## 5. Downstream Opens/Closes

- **Opens (eligibility) — `acknowledge_pressure`:**
  - Documentary causal-chain entries for X2 `vance_owen_overall` composite (HRHB-faction-signal coherence)
  - No new opens for Ring 1/2 incident rows
- **Opens (eligibility) — `resist_patron`:**
  - H7 `zagreb_orders_hrhb_ceasefire_1994` reachability earlier (counterfactual — sustained defiance reshapes 1994 patron politics)
  - No new atrocity opens
- **Closes (eligibility):**
  - `acknowledge_pressure`: none directly
  - `resist_patron`: documentary X2 composite-tag coherence; no direct atrocity closure
- **Branch-tag vocabulary** (additions to `event_families.ts`): new `hrhb_zagreb_restraint` family; `hrhb_restraint_accepted` / `hrhb_restraint_rejected` tags.

## 6. Modal Source Notes

> "During the active Vance-Owen signature window (January-March 1993) Tuđman ordered Boban to restrain HVO operational tempo on the central-Bosnia front so as not to derail the provincial-map acceptance — documented in the Tuđman Presidential Transcripts admitted at Prlić et al. IT-04-74 (Trial Judgment Vol. 3 §§460-498) and in BB Vol. II's January-May 1993 chronology, with the historical record showing selective obedience that crumbled in the April 1993 Lašva-valley resumption." (Compress to ≤2-sentence modal length in Phase D.)

## 7. Open Questions

1. **§3.6 continuation-of-act loader test.** Phase D loader test must verify that `resist_patron`'s effects do **not** include `displacement_*` writes, `control_change` of central-Bosnia OSIDs, `war_crimes_events` increments bypassing engine systems, or any `paramilitary_policy` write. The boundary is critical because `resist_patron`'s narrative ("Boban defies restraint; HVO operations continue") is structurally close to the continuation-of-act rejection rule (a response option that scales an existing sensitive-history act in state). Phase B/D loader test required.
2. **X2 composite-tag schema interaction.** H4 outcome is one of three HRHB-faction signals into X2 (H3 = signature posture, H4 = restraint posture, B3 = ARBiH acceptance, R6 = RS Assembly). Phase B `event_families.ts` composite-tag schema must reserve slots for the H3-vs-H4 internal coherence read (e.g., `acknowledge_pressure` at H3 + `resist_patron` at H4 should generate a distinct composite signal from `acknowledge_pressure` at both). Defer to Game Designer + Technical Architect.
3. **Cost floor calibration.** Per R7 / H1 / H3 precedent: `patron_confidence: -25` recommended; Phase D scenario testing must verify that `resist_patron` does not trivially dominate in counterfactual play given that the historical record shows the restraint instruction was selectively obeyed (i.e., the operational benefit of defiance was historically positive in the local sense). Defer to Game Designer.
4. **Calendar-trigger timing window.** H4 historically fires during a relatively narrow window (February-April 1993). Phase D should specify the trigger window precisely (recommend turn 30-40) and verify that H4 does not fire if H3 has not fired with `acknowledge_pressure` (Zagreb does not issue restraint to a faction that has rejected the underlying VOPP signature). Defer to Game Designer + Technical Architect.
