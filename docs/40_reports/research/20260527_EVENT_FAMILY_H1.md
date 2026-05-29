# Event Family Worksheet — H1: HRHB Political Goal (1992)

**Date:** 2026-05-27
**Family ID:** H1
**Faction scope:** HRHB (responding faction)
**Source tier:** `icty_icj_un` (Prlić et al. IT-04-74 JCE findings; Kordić IT-95-14/2-T; Blaškić IT-95-14-T) corroborated by `corroborated_participant` (Tudjman Presidential Transcripts) and `balkan_battlegrounds` (BB I-II operational context)
**Sensitive-history ring:** none for the political-goal decision itself; downstream chains (H2, H5, H6, H8) are Ring 1/2 and remain consequence-only per `SENSITIVE_HISTORY_DESIGN_GATE.md` §3 and packet §3.6
**Status:** Draft for Phase A review.

## 1. Cited Historical Narrative

The political project of Herceg-Bosna ("HRHB" in AWWV canon) was constituted in two formal acts, both invoked by the ICTY in *Prosecutor v. Prlić et al.* (IT-04-74-T, Trial Judgment 29 May 2013, Vols. 1-6; Appeals Judgment 29 November 2017) as the institutional spine of the Joint Criminal Enterprise (JCE):

- **18 November 1991** — proclamation of the **Croatian Community of Herzeg-Bosnia** (*Hrvatska zajednica Herceg-Bosna*, HZ HB) by Mate Boban and the HDZ-BiH leadership in Grude, defining a Croat political-territorial unit within Bosnia-Herzegovina along the borders of the 1939 Banovina. Prlić Trial Judgment Vol. 1 §§423-461 reconstructs the founding decision, the Grude declaration text, and the Zagreb-Boban coordination preceding it.
- **28 August 1993** — proclamation of the **Croatian Republic of Herzeg-Bosna** (*Hrvatska Republika Herceg-Bosna*, HR HB), upgrading the Community to a Republic with constitutive-state ambitions. Prlić Trial Judgment Vol. 1 §§556-590 details the proclamation, the Mostar capital, and the institutional architecture (Presidency, Government, HVO armed forces) that followed.

The ICTY found that "the ultimate purpose of the JCE was to establish a Croatian territorial entity that would either be part of, or annexed to, Croatia, restoring the borders of the 1939 Banovina" (Prlić Trial Judgment Vol. 4 §§44-67, summary of JCE common criminal purpose). This finding was upheld on appeal (Prlić Appeals Judgment §§601-650).

The pre-1992 Zagreb axis is documented in two complementary record sets:

- The **Karadžić-Tuđman meetings** of March-May 1991 (Karađorđevo, 25 March 1991; later contacts) where partition of BiH between Croatia and Serbia was discussed. Cited in Prlić Trial Judgment Vol. 1 §§318-356 and in Kordić Trial Judgment (IT-95-14/2-T, 26 February 2001) §§465-475.
- The **Presidential Transcripts** of Franjo Tuđman, admitted in evidence at Prlić (Trial Judgment Vol. 1 §§357-389), in Kordić (paras 491-510), and in Blaškić (IT-95-14-T, 3 March 2000, §§99-120). Transcripts record Tuđman directing the HZ HB project as "a Croatian state-building enterprise inside BiH" (Prlić Trial Judgment Vol. 1 §378), instructing Boban on territorial scope, and treating HVO leadership selection as a Zagreb matter.

The **removal of Stjepan Kljujić** as HDZ-BiH president in February 1992 — replaced by Boban's harder-line faction — completed the political reorientation. Kljujić had supported a unified BiH inside its republican borders; his removal under Zagreb pressure cleared the path for the separatist project (Prlić Trial Judgment Vol. 1 §§462-489; Kordić Trial Judgment §§479-490).

The historical actor — the HZ HB Presidency under Boban, in the April-July 1992 window when this AWWV row fires — pursued the **Croat-republic line** under Zagreb's direction. This is the documented historical fact, not an inferred default. United-front cooperation with the RBiH leadership existed tactically against the VRS (Mostar 1992, Posavina) but was never the political project of the HZ HB leadership.

## 2. Defensible Historical/Default Option

- **Label:** `croat_republic` — Follow Zagreb, organize HZ HB as a Croat political-territorial entity along Banovina borders, accept the strain on the RBiH alliance.
- **Rationale:** This is the documented historical choice of the HZ HB Presidency in 1992. Prlić IT-04-74 Trial Judgment Vol. 1 §§423-590 and Appeals Judgment §§601-650 are the binding legal record. Subsequent escalation (Gornji Vakuf Jan 1993, Ahmići April 1993, central-Bosnia war, HR HB proclamation Aug 1993) flows from this political-goal decision, not from a counterfactual.
- **Citation:** Prlić et al. IT-04-74-T Trial Judgment (29 May 2013) Vols. 1 §§423-590, Vol. 4 §§44-67; Prlić Appeals Judgment (29 Nov 2017) §§601-650; Kordić IT-95-14/2-T Trial Judgment (26 Feb 2001) §§465-510; Blaškić IT-95-14-T Trial Judgment (3 March 2000) §§99-120; HZ HB founding declaration 18 Nov 1991 (Grude); HR HB proclamation 28 Aug 1993 (Mostar).

## 3. Proposed Counterfactual Options

### Option: `united_front`
- **Label:** `united_front` — Public alignment with the RBiH against the VRS; accept Zagreb's displeasure and the patron-support cost.
- **Historical analogy:** The Mostar 1992 anti-JNA defense (June-July 1992, HVO and ARBiH jointly resisting the JNA/VRS) and the Posavina 1992 cooperation are the operational analogues. They were tactical, not strategic — but they document that HVO-ARBiH joint operations against the VRS were feasible when local commanders prioritized them. Kljujić's pre-removal line (unified BiH inside its republican borders) is the political analogue. Counterfactual reading: had Kljujić retained party leadership, or had Boban subordinated the HZ HB project to the wider anti-VRS war, this branch is the institutional shape of that path.
- **Design provenance:** `design_counterfactual` — no faction document at the HZ HB Presidency level adopted this line in 1992. The branch is a plausible alternative grounded in Kljujić's pre-removal posture and the operational record of localized HVO-ARBiH cooperation.
- **Sensitive-history check:** Confirmed — option authorizes no atrocity, no detention, no cleansing. Diplomatic/strategic reorientation only. Foreclosing the central-Bosnia war chain (H2, H5, H6, H8) is the consequence; foreclosure is achieved by `closes_events_runtime` plus flag-gated downstream triggers, not by any sensitive-history authoring.
- **Cost floor (Phase D required):** `patron_confidence: -25` (Zagreb withdraws backing for unified-state HVO), `equipment_quality_modifier` reduction reflecting HV secondments / fuel / ammo withdrawn per Prlić Vol. 2 §§220-260. Per Game Designer Wave 1 review: cost floor must be authored, not flagged-and-deferred.

### Option: `strategic_ambiguity`
- **Label:** `strategic_ambiguity` — Cooperate publicly with RBiH while building Croat institutions in parallel; defer the open break.
- **Historical analogy:** The **April 1992 - November 1992 transitional window** approximates this posture in operational fact: HVO and ARBiH shared anti-JNA/VRS fronts in Mostar, Posavina, and central Bosnia while HZ HB institutions hardened in Grude/Mostar in parallel. Prlić Trial Judgment Vol. 1 §§490-555 reconstructs this dual-track period (institution-building documents drafted while HVO units fought alongside ARBiH). The historical actor exited this posture into open `croat_republic` execution by late 1992 / early 1993 (Prozor October 1992, Gornji Vakuf January 1993).
- **Design provenance:** `design_counterfactual` — the historical record shows the dual-track posture as a phase that was abandoned, not as a sustained strategy. The branch counterfactually models the HZ HB Presidency holding the dual track indefinitely.
- **Sensitive-history check:** Confirmed — no atrocity authorization. The branch defers the rupture; it does not authorize anything that the historical default does not already imply at the structural level. Downstream sensitive-history rows (H5, H6, H8) remain Ring 1/2 consequence-only.
- **Cost floor (Phase D required):** specification still pending. Per Game Designer Wave 1 review: "currently deferred without specification." Recommend Phase D worksheet refinement: alliance instability (RBiH-HRHB alliance ceiling reduction) plus delayed-decision political cost (internal_cohesion drift over N turns). Final calibration deferred to Phase D scenario testing.

## 4. Material Effects (per packet §3.3)

Per packet §4 H1 row: alliance changes, dimension shifts. The row is already authored in `data/scenarios/events/war_1992.json` (id `hrhb_political_goal`); Phase D will add runtime-causality fields on top of the existing authoring. Field recommendations:

- **`sets_flags`** (already authored, retain):
  - `croat_republic`: `hrhb_political_goal: 'croat_republic'`
  - `united_front`: `hrhb_political_goal: 'united_front'`
  - `strategic_ambiguity`: `hrhb_political_goal: 'strategic_ambiguity'`
- **`effects[]` and `dimension_shifts[]`** (already authored, retain ranges).
- **`enables_events_runtime`** (NEW, Phase D):
  - `croat_republic`: opens H1a `hrhb_arbih_1992_cooperation_collapse` (per H1a worksheet), H2 `gornji_vakuf_clashes_1993` (already loader-gated by `alliance_below 0.45`; runtime open documents the causal link), and the central-Bosnia war chain (H5 incidents already authored via `csq_hvo_central_bosnia_offensive_1993` in existing `future_consequences`).
  - `united_front`: opens H9 `washington_agreement_acceptance_1994` (early-federation framing — historical Washington came later but is a coherent downstream of sustained cooperation); opens `csq_joint_operations_agreement_1992`, `csq_joint_offensive_1994`, `csq_federation_early_1994` per existing `future_consequences`.
  - `strategic_ambiguity`: opens no atrocity events. Makes both H2 and H9 conditionally visible; defers commitment until a later event resolves the dual-track. No runtime open required at H1 fire-time; downstream rows trigger on the deferred resolution.
- **`closes_events_runtime`** (NEW, Phase D):
  - `croat_republic`: closes `csq_federation_early_1994` (early federation foreclosed), `csq_joint_operations_agreement_1992` (joint operations foreclosed).
  - `united_front`: closes `csq_hvo_central_bosnia_offensive_1993` (Ring 1/2 chain foreclosed by counterfactual choice). NOTE: Foreclosure of Ahmići / Stupni Do / Mostar bridge incidents (H5/H8) is downstream of H2 not firing, not direct H1 foreclosure — this respects the Sensitive History Gate §1.5 #11 (mechanical-condition-driven rupture, not calendar-driven).
  - `strategic_ambiguity`: closes none at fire-time; defers.
- **`branch_tag`** (NEW, per packet §2.2 vocabulary `hrhb_political_goal`):
  - `croat_republic` → `hrhb_croat_republic`
  - `united_front` → `hrhb_united_front`
  - `strategic_ambiguity` → `hrhb_strategic_ambiguity`

## 5. Downstream Opens/Closes

- **Opens (eligibility) — `croat_republic`:**
  - `hrhb_arbih_1992_cooperation_collapse` (H1a, pending — see H1a worksheet)
  - `gornji_vakuf_clashes_1993` (H2 — already in catalog)
  - `csq_hvo_central_bosnia_offensive_1993` (already in catalog)
- **Opens (eligibility) — `united_front`:**
  - `csq_joint_operations_agreement_1992`, `csq_joint_offensive_1994`, `csq_federation_early_1994` (already in catalog as future-consequence opens)
  - Earlier-window Washington/federation path (H9, X5)
- **Closes (eligibility):**
  - `croat_republic` → forecloses early-federation, joint-operations counterfactuals.
  - `united_front` → forecloses central-Bosnia war counterfactual chain at the H2 gate (not at downstream sensitive rows directly).
- **Branch-tag vocabulary** (additions to `event_families.ts`): `hrhb_political_goal` family; `hrhb_croat_republic` / `hrhb_united_front` / `hrhb_strategic_ambiguity` tags.

## 6. Modal Source Notes

> "HZ HB was proclaimed at Grude 18 Nov 1991 and upgraded to HR HB at Mostar 28 Aug 1993. ICTY Prlić et al. IT-04-74 (Trial Judgment 2013; Appeals 2017) found the leadership pursued a Croat territorial entity along 1939 Banovina lines as part of a Joint Criminal Enterprise, coordinated with Zagreb (Tuđman Presidential Transcripts; Karadžić-Tuđman 1991 meetings)." (≤2 sentences after compression.)

## 7. Open Questions

1. **Branch-tag granularity for `strategic_ambiguity`.** The branch defers commitment but does not foreclose. Phase D may need a follow-up event (Q4 1992 or early 1993) that resolves the dual-track posture toward either Croat-republic or united-front. Defer to Game Designer — current packet treats H1 as a one-shot decision; resolution-of-ambiguity events would be a new family slot.
2. **Cost floor for `united_front`.** Per packet §3.6 (no calendar-only foreclosure) and the precedent set by R7 (counterfactual cost floor preventing override from dominating historical default), Phase D should specify a `patron_confidence: -25` minimum (already in current `dimension_shifts`) plus alliance_lock or equipment_quality_modifier cost reflecting Zagreb's documented withdrawal of officer secondments, fuel, and ammunition support to HVO units that resisted the HZ HB line (Prlić Trial Judgment Vol. 2 §§220-260 on HV-HVO logistics dependency). Defer to Game Designer.
3. **Interaction with X1 (London Conference).** London Aug 1992 sits in the H1 trigger window (turn 3-7). If `accept_principles` at X1 includes a non-recognition-by-force clause, does that mechanically conflict with `croat_republic`? Recommend: no — London bound parties to a principle, not to dissolution of pre-existing political entities; HZ HB had already been declared 18 Nov 1991, predating London. Defer to Canon Compliance Reviewer.
