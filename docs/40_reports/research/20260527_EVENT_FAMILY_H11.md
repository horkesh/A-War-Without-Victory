# Event Family Worksheet — H11: HV Expeditionary Support (Post-Storm)

**Date:** 2026-05-27
**Family ID:** H11
**Faction scope:** HRHB (responding faction, as the receiving force); cross-faction visibility to RBiH (Federation partner) and Zagreb patron (as the deploying force)
**Source tier:** `balkan_battlegrounds` (BB Vol. II Chapter "HV expeditionary operations August-October 1995", pp. ~496-540 covering Storm, Maestral / Maestral 2, Sana, Mistral, Una, Southern Move) corroborated by `icty_icj_un` (Gotovina et al. IT-06-90, Trial Judgment 15 April 2011, Appeals Judgment 16 November 2012) and `agreement_text` (Split Agreement 22 July 1995 establishing the mutual-defense framework)
**Sensitive-history ring:** **Ring 1/2 — narrative boundary.** Operation Storm (4-7 August 1995) was the subject of the Gotovina et al. ICTY trial; the Appeals Chamber acquitted Gotovina and Markač on JCE charges (16 November 2012), overturning the Trial Chamber's JCE finding. Operations Maestral / Maestral 2 / Sana / Mistral / Una / Southern Move (August-October 1995) included documented displacement of Bosnian Serb civilians from VRS-controlled territory. **H11 authors the operational decision to receive HV expeditionary support**, not the displacement outcomes. Per packet §3.6, the option set must not authorize atrocity; displacement consequences emerge from existing engine systems (combat outcome, displacement triggers, paramilitary sweep), not from author intent on this row.
**Status:** Draft for Phase A review. Follow-on of Operation Storm (4-7 August 1995) and Operation Mistral 2 (8-15 September 1995); design substrate (HV attached to HRHB per project canon) already wired via `equipment_quality_modifier`.

## 1. Cited Historical Narrative

Between **August and October 1995**, the **Croatian Army (Hrvatska Vojska, HV)** conducted a series of **expeditionary operations into the territory of Bosnia and Herzegovina** in direct support of HVO (HRHB) and ARBiH (RBiH) ground operations against the VRS. These operations are the late-war operational watershed of the Bosnian theater: the VRS lost approximately one-third of its territorial control in 8-10 weeks, the Bihać pocket was relieved, and the strategic conditions for the Dayton negotiations were created.

**Operational chronology (BB Vol. II Chapter on HV expeditionary operations, pp. ~496-540):**

- **4-7 August 1995 — Operation Storm (*Oluja*)**: HV operation against the Republic of Serbian Krajina (RSK), executed primarily on Croatian sovereign territory. **Boundary clarification**: Operation Storm itself was an HV operation on Croatian sovereign territory targeting the RSK. Its **operational extension into Bosnia** (specifically: HV 4th Guards Brigade and HV 7th Guards Brigade operating across the Una river into Bosanski Petrovac / Drvar / Bosansko Grahovo axis in coordination with HVO 1st Guards Brigade) is the H11-relevant component. BB Vol. II places this extension at pp. ~498-505. ICTY Gotovina IT-06-90 Trial Judgment (15 April 2011) §§ on operational tempo documents the cross-border component.
- **25 July - 12 August 1995 — Operation Summer-95 (*Ljeto-95*)**: HV operation jointly with HVO into the Bosansko Grahovo / Glamoč axis, predating Storm by approximately ten days and providing the western Bosnia operational base for the subsequent Storm extension. BB Vol. II pp. ~496-498. This is the **first major HV cross-border expeditionary operation** of the Bosnian war.
- **8-15 September 1995 — Operation Mistral 2 (*Maestral 2*)**: HV-HVO joint operation against VRS-held territory in western Bosnia. Jajce, Drvar, Šipovo recaptured. BB Vol. II pp. ~506-515. ICTY Gotovina chronology context.
- **13-15 September 1995 — Operation Una (*Una-95*)**: HV operation across the Una river into RS-held Bosanski Novi / Dvor axis. Operationally unsuccessful at the river crossing, but documented as part of the HV expeditionary push. BB Vol. II pp. ~516-520.
- **13 September - 11 October 1995 — Operation Sana (*Operacija Sana-95*)**: HV-HVO-ARBiH joint operation. Western Bosnia ground push targeting Ključ / Sanski Most / Bosanski Petrovac axis. BB Vol. II pp. ~520-535.
- **8-11 October 1995 — Operation Southern Move (*Južni Potez*)**: Joint HV-HVO-ARBiH operation in southwestern Bosnia. Final coordinated operation before the Holbrooke-mediated ceasefire of 12 October 1995. BB Vol. II pp. ~535-540.

**Institutional framework — the Split Agreement (22 July 1995):**

The expeditionary support was formalized in the **Split Agreement** of 22 July 1995, signed by Tuđman (Croatia), Izetbegović (RBiH), and Zubak (HRHB). The agreement established mutual-defense cooperation, codified HV operational involvement on Bosnian sovereign territory at the request of the Federation, and was the diplomatic framework that distinguished the HV expeditionary operations from a Croatian invasion of Bosnia. Split formalized the operational coordination that had existed ad hoc since the Washington Agreement.

**ICTY findings (Gotovina et al. IT-06-90):**

- The Trial Chamber (15 April 2011) found Gotovina and Markač guilty of JCE for the displacement consequences of Operation Storm against the Krajina Serb civilian population.
- The **Appeals Chamber (16 November 2012) overturned the JCE finding** and acquitted Gotovina and Markač. The Appeals Chamber found that the Trial Chamber's "200-meter standard" for distinguishing legitimate military targeting from unlawful indiscriminate shelling was unsupported, that the JCE finding could not stand absent that standard, and that command-responsibility liability for displacement consequences likewise did not survive.
- **Canon implication**: the Appeals acquittal is the binding ICTY record. Operation Storm — and by extension the HV expeditionary support framework — is **not under standing ICTY adverse judgment** for JCE / displacement liability. This distinguishes H11 from H5 / H6 (which carry standing Prlić convictions) and informs the Ring 1/2 boundary call.
- Displacement of Bosnian Serb civilians from VRS-controlled territory during Storm / Mistral 2 / Sana / Una / Southern Move **did occur** as a matter of operational fact (BB Vol. II documents the displacement numbers and routes), but the **legal characterization** is that the Appeals Chamber did not affirm a JCE atrocity finding.

**Project canon — design substrate already wired:**

Per packet §4 H11 row ("HV expeditionary support (post-Storm) — BB II; design substrate (HV attached to HRHB per canon) — follow-on of Storm + Mistral 2 — n/a — equipment_quality_modifier (already wired), supply — opens late-war HRHB offensive readiness — none — A/B"), the HV expeditionary support is already operationally wired in the AWWV engine via the `equipment_quality_modifier` system. Per MEMORY.md Trip session 2 (2026-05-03): "R2 six-lane parallel (must_hold variable multiplier + 6 divergence events + tutorial onboarding skeleton + perf baseline audit + OSID damage seed + Srebrenica rupture diagnostic)" did not touch H11; the wired modifier predates the v0.9.x band and is the substrate H11's event-level decision sits on top of.

The **historical actor** — the HR HB Presidency, the HVO Main Staff, and the joint Federation operational command — **accepted** HV expeditionary support. This is the documented historical fact: HV operated on Bosnian sovereign territory under the Split Agreement framework, in coordination with HVO and ARBiH, between July and October 1995. **Acceptance was not seriously contested**: the Federation needed the HV combat power for the western Bosnia campaign, and Zagreb needed the operational success for diplomatic positioning at the Holbrooke / Dayton table.

**Status as follow-on:** H11 fires only after Operation Storm (4-7 August 1995, turn ~145 in a default scenario) and the Split Agreement (22 July 1995, turn ~141). Per packet §4 H11 row, the counterfactual column is `n/a` — H11 is classified as a **follow-on event with engine-driven primary effects**, not as an independent decision row with a full counterfactual option set.

## 2. Defensible Historical/Default Option

H11 is authored as a **follow-on / acknowledgement decision** on the operational tempo of HV expeditionary support, not as a fresh strategic-decision row. The decision was made historically at the Split Agreement (which is upstream and historically determined); H11 represents the HR HB Presidency's operational consent and command-coordination posture during the actual HV deployment.

- **Label:** `accept_full_coordination` — Accept HV expeditionary support; coordinate HV-HVO operational planning at the General Staff level; share intelligence; deconflict operations with ARBiH; treat HV operations on Bosnian territory as fully sanctioned under the Split Agreement framework.
- **Rationale:** This describes the documented historical posture of HRHB / HVO command between July and October 1995. HV-HVO joint planning at the General Staff level is documented in Prlić Trial Judgment Vol. 3 §§280-340 (background-only material, as it postdates the H1-H6 indictment window but is reconstructed for institutional-continuity purposes) and in BB Vol. II Chapter pp. ~496-540. The Split Agreement framework was honored; HV operations on Bosnian territory were treated as fully sanctioned; the resulting joint operations (Maestral 2, Sana, Southern Move) were the most effective coordinated operations of the war.
- **Citation:** Split Agreement (22 July 1995); BB Vol. II Chapter on HV expeditionary operations pp. ~496-540; ICTY Gotovina et al. IT-06-90 Trial Judgment (15 April 2011); ICTY Gotovina Appeals Judgment (16 November 2012); Prlić et al. IT-04-74-T Trial Judgment Vol. 3 §§280-340 (institutional-continuity background).

## 3. Proposed Counterfactual Options

### Option: `accept_limited_coordination`

- **Label:** `accept_limited_coordination` — Accept HV operations on Bosnian territory under the Split framework, but limit operational coordination to deconfliction; preserve HVO operational autonomy in HRHB-claimed zones; refuse joint General Staff planning; treat HV as a parallel rather than integrated force.
- **Historical analogy:** This branch counterfactually models what happens if the HVO Main Staff (or the HR HB Presidency under Zubak) chose to use the Split Agreement as cover for HV operations *without* integrating Croat-Bosniak command. Approximated in operational fact by isolated friction points between HV and HVO commands in early August 1995 (BB Vol. II p. ~503 notes initial HV-HVO coordination gaps in the Bosansko Grahovo / Drvar push), but the historical actor reconciled those gaps quickly. The branch models the gaps persisting.
- **Design provenance:** `design_counterfactual` — the historical record shows rapid resolution of coordination friction. The branch counterfactually models the friction persisting throughout the August-October campaign.
- **Sensitive-history check:** Confirmed — `accept_limited_coordination` authorizes no atrocity. The branch is an operational-coordination posture choice. Displacement consequences during the campaign emerge from combat-outcome mechanics, not from author intent on this row. Per packet §3.6, the option does not encroach on `paramilitary_policy`, does not write `displacement_*` directly, does not author `control_change`.
- **Cost floor (Phase D required):** `military_credibility: -8` HRHB (coordination friction reduces operational effectiveness), `alliance_change: -0.1` (RBiH reads the limited coordination as Federation defection), reduction in the joint-operations efficiency modifier (Phase D may need a new `joint_operations_efficiency_modifier` carrier — defer to Technical Architect). The cost floor should make `accept_full_coordination` the dominant choice under historical-bot calibration without trivializing the counterfactual.

### Option: `decline_hv_deployment`

- **Label:** `decline_hv_deployment` — Refuse HV operations on Bosnian sovereign territory; treat the Split Agreement framework as paper-only; rely on HVO and ARBiH organic forces for the western Bosnia campaign.
- **Historical analogy:** No historical record exists of the HR HB Presidency or HVO Main Staff considering this option. It is **strongly counterfactual** — the entire Split Agreement framework was built around HV expeditionary support, and refusing it would have been a near-complete repudiation of the Zagreb patron relationship. The historical analogue is the Mostar 1992 hypothetical (R/B/H factions reject Zagreb intervention in 1992): no such rejection occurred, the counterfactual is constructed from the absence rather than from a documented near-miss.
- **Design provenance:** `design_counterfactual` — no faction document at the HR HB Presidency or HV General Staff level adopted this posture in 1995. The branch counterfactually models a complete Zagreb-HRHB rupture at the operational level.
- **Sensitive-history check:** Confirmed — `decline_hv_deployment` authorizes no atrocity. By foreclosing HV expeditionary operations on Bosnian territory, the branch indirectly suppresses the displacement outcomes that occurred during Maestral 2 / Sana / Southern Move — those consequences mechanically do not happen because the underlying operations do not occur. Per Gate §1.5 #11, this is canonically clean: emergent suppression via mechanical predicate, not authorial direct-close.
- **Cost floor (Phase D required):** `patron_confidence: -40` (Zagreb relationship effectively ruptured), `equipment_quality_modifier: -20%` HRHB (HV logistical support attenuated proportionally), `military_credibility: -25` HRHB (western Bosnia campaign loses HV combat power, operational momentum collapses), `alliance_change: -0.3` (RBiH reads as Federation defection), `territorial_legitimacy: -10` HRHB (failure to recapture western Bosnia). The cost floor should make this option dominated under historical-bot calibration except in scenarios where the player has actively reoriented HRHB away from Zagreb throughout the run.

## 4. Material Effects (per packet §3.3)

The H11 row is **not yet authored as a discrete event** in `data/scenarios/events/*.json`. The HV expeditionary support is currently wired via the `equipment_quality_modifier` system (per project canon). Phase D will author H11 as a discrete decision event sitting on top of that engine wiring. Field recommendations:

- **`sets_flags`** (NEW, Phase D):
  - `accept_full_coordination`: `hrhb_hv_expeditionary_support: 'full'`, `joint_general_staff_planning_active: true`, `hrhb_zagreb_alliance_strength: 'reinforced'`
  - `accept_limited_coordination`: `hrhb_hv_expeditionary_support: 'limited'`, `joint_general_staff_planning_active: false`, `hrhb_zagreb_alliance_strength: 'maintained'`
  - `decline_hv_deployment`: `hrhb_hv_expeditionary_support: 'declined'`, `joint_general_staff_planning_active: false`, `hrhb_zagreb_alliance_strength: 'ruptured'`
- **`effects[]`** (Phase D author):
  - `accept_full_coordination`: `morale_change HRHB: +10`, `cohesion_change HRHB: +10`, `supply_delta HRHB: +15` (Croatian logistical pipeline fully open).
  - `accept_limited_coordination`: `morale_change HRHB: +3`, `cohesion_change HRHB: +5`, `supply_delta HRHB: +8`.
  - `decline_hv_deployment`: `morale_change HRHB: -15`, `cohesion_change HRHB: -10`, `supply_delta HRHB: -10`.
- **`dimension_shifts[]`** (Phase D author):
  - `accept_full_coordination` HRHB: `military_credibility: +25`, `territorial_legitimacy: +15`, `patron_confidence: +20`, `internal_cohesion: 0`. RBiH (cross-faction effects): `military_credibility: +10`, `alliance_with_hrhb: +0.2`.
  - `accept_limited_coordination` HRHB: `military_credibility: +10`, `territorial_legitimacy: +5`, `patron_confidence: +10`, `internal_cohesion: 0`. RBiH: `alliance_with_hrhb: 0`.
  - `decline_hv_deployment` HRHB: `military_credibility: -25`, `territorial_legitimacy: -10`, `patron_confidence: -40`, `internal_cohesion: -10`. RBiH: `alliance_with_hrhb: -0.3`.
- **`equipment_quality_modifier`** (already engine-wired; H11 sets the carrier value):
  - `accept_full_coordination`: HRHB `equipment_quality_modifier: +25%` for the August-October 1995 operational window (carrier-bound to the joint operations turns).
  - `accept_limited_coordination`: HRHB `equipment_quality_modifier: +15%`.
  - `decline_hv_deployment`: HRHB `equipment_quality_modifier: -20%` (existing HV logistical support attenuated).
- **`enables_events_runtime`** (NEW, Phase D):
  - `accept_full_coordination`: opens `csq_western_bosnia_recapture` (Wave 2 placeholder — late-war territorial outcomes), opens H12 historical-default path `accept` for the Dayton acceptance row (joint-operations success makes Dayton acceptance the dominant choice for HRHB).
  - `accept_limited_coordination`: opens the same downstreams but at attenuated effect (Wave 2 placeholder for the attenuated path).
  - `decline_hv_deployment`: opens H13 reachability `hrhb_third_entity_push` (Zagreb-HRHB rupture is the structural precondition), opens `csq_hrhb_late_war_isolation` (Wave 2 placeholder).
- **`closes_events_runtime`** (NEW, Phase D):
  - `accept_full_coordination`: closes none directly.
  - `accept_limited_coordination`: closes none directly.
  - `decline_hv_deployment`: closes `csq_federation_joint_offensive_1994` continuation into 1995 (Federation joint-operations framework breaks), closes `csq_western_bosnia_recapture` (HRHB cannot recapture western Bosnia organically without HV support).
- **`branch_tag`** (per packet §2.2 vocabulary; new tags required):
  - `accept_full_coordination` → `hrhb_hv_support_full`
  - `accept_limited_coordination` → `hrhb_hv_support_limited`
  - `decline_hv_deployment` → `hrhb_hv_support_declined`
- **`trigger.condition`** (Phase D author): `turn_min: 145, turn_max: 150` (after Operation Storm at turn ~145 and before Mistral 2 at turn ~152, so the H11 outcome flags can carrier the modifier into the Mistral 2 / Sana / Southern Move operations); `requires_events: ['operation_storm_1995', 'split_agreement_1995']` (split agreement row is Wave 2 to-be-authored); `requires_enabled: true` keyed off H9 having resolved (per packet §3.2); `requires_player_response: true`, `responding_faction: 'HRHB'`, `bot_response_logic: 'historical'`, `historical_default_response_id: 'accept_full_coordination'`.

### R13 ↔ H11 carrier-flag coordination

Per Game Designer Wave 2 ruling Q7, this family carries a shared carrier flag `hrhb_hv_support_carrier: 'normal' | 'unified' | 'constrained' | 'attenuated_post_r13_defiance'`. The H11 outcome flag and R13's flag are both read at effect-resolution: if R13 = `absorb_strikes_hold_position`, H11 `equipment_quality_modifier` ceiling attenuates ~30%. Implemented via conditional `material_effect_refs`, NOT via `closes_events_runtime` (R13 is upstream from H11's firing window in the historical scenario timeline). Add `hrhb_hv_support_carrier` and its four values to the vocabulary stub.

## 5. Downstream Opens/Closes

- **Opens (eligibility) — `accept_full_coordination`:**
  - `csq_western_bosnia_recapture` (Wave 2 placeholder)
  - H12 `accept` historical-default path reinforcement
  - Carrier flag for Maestral 2 / Sana / Southern Move operational outcomes
- **Opens (eligibility) — `accept_limited_coordination`:**
  - `csq_western_bosnia_recapture` at attenuated effect (Wave 2 placeholder)
  - H12 `accept` path (less reinforced)
- **Opens (eligibility) — `decline_hv_deployment`:**
  - H13 reachability (`hrhb_third_entity_push` becomes more reachable via Zagreb-rupture)
  - `csq_hrhb_late_war_isolation` (Wave 2 placeholder)
- **Closes (eligibility):**
  - `decline_hv_deployment` → closes `csq_federation_joint_offensive_1994` continuation, closes `csq_western_bosnia_recapture`
- **Branch-tag vocabulary** (additions to `event_families.ts`): new `hrhb_hv_support` family (or extend `hrhb_alliance`); `hrhb_hv_support_full` / `hrhb_hv_support_limited` / `hrhb_hv_support_declined` tags.

## 6. Modal Source Notes

> "Between July and October 1995 the Croatian Army conducted expeditionary operations on Bosnian sovereign territory (Summer-95, Storm extension, Mistral 2, Una, Sana, Southern Move) under the Split Agreement framework of 22 July 1995, in coordination with HVO and ARBiH; the joint operations relieved Bihać, recaptured ~one-third of VRS-held territory, and set the conditions for Dayton. ICTY Gotovina et al. IT-06-90 Appeals Judgment (16 November 2012) overturned the Trial Chamber's JCE finding for Operation Storm; BB Vol. II Chapter on HV expeditionary operations pp. ~496-540 documents the operational chronology and the HV-HVO-ARBiH coordination tempo." (compress to ≤2-sentence modal length in Phase D.)

## 7. Open Questions

1. **Follow-on vs. independent decision classification.** Per packet §4 H11 row the counterfactual column is `n/a`. This worksheet proposes a **three-option** structure (`accept_full_coordination` historical default + `accept_limited_coordination` and `decline_hv_deployment` counterfactuals). The historical decision was made at the Split Agreement, which is structurally upstream of the H11 firing window. Phase A defers to Game Designer + Product Manager: is H11 a follow-on of Storm + Split (auto-resolves) or a fresh player-decision row that models the operational-coordination posture during the August-October campaign? Recommend the latter as authored above. Defer to Game Designer.
2. **Carrier-binding to operational window.** The `equipment_quality_modifier` for HRHB is already engine-wired. H11's role is to set the carrier value for the August-October 1995 operational window (i.e., Maestral 2 / Sana / Southern Move turns). Phase D must verify the carrier-binding mechanism: how does the H11 outcome flag set the modifier, and how does the modifier expire at end-of-Storm or at Dayton signing? Defer to Technical Architect.
3. **Sensitive-history Ring boundary verification.** The Gotovina Appeals acquittal places Operation Storm and the HV expeditionary operations outside standing ICTY JCE adverse judgment. Displacement consequences during the operations did occur. Per packet §3.6, this row authorizes no atrocity; displacement emerges from combat-outcome / displacement-trigger / paramilitary-sweep systems. Phase D loader test must verify the option set contains no `displacement_*` write, no `control_change` of specific OSIDs, no `war_crimes_events` increment. Defer to Canon Compliance Reviewer.
4. **Cost floor for `decline_hv_deployment`.** Per packet §3.6 and the H1 / H9 / H10 precedent: Phase D should specify the cost floors above to prevent the counterfactual from being trivially chosen by ahistorical play that has not built up the prerequisite Zagreb-HRHB rupture state through earlier rows. Phase D scenario testing must verify the option is dominated under historical-bot calibration. Defer to Game Designer.
5. **Interaction with R12 (RS hostage crisis) and R13 (Deliberate Force compliance).** The HV expeditionary operations of August-October 1995 followed Deliberate Force (30 August - 14 September 1995) and the resulting VRS weakening. Phase D may need explicit gating: H11 historical-default path assumes R13 `withdraw_heavy_weapons` (VRS compliance with Deliberate Force, opening the federation_ground_offensive readiness). If R13 player counterfactually `absorb_strikes_hold_position`, H11's August-October campaign effectiveness should be reduced. Defer to Game Designer in Wave 2.
6. **Wave 2 downstream placeholders.** Multiple downstream events referenced in this worksheet (`csq_western_bosnia_recapture`, `csq_hrhb_late_war_isolation`, `split_agreement_1995`) are Wave 2 to-be-authored. Phase A locks the H11 inventory entry; Phase D will need the Wave 2 worksheets and Phase F authoring before H11 can be wired in JSON. Defer sequencing to Product Manager.
