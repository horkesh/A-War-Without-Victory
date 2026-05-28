# Event Family Worksheet — X2: Vance-Owen Plan (overall)

**Date:** 2026-05-27
**Family ID:** X2
**Faction scope:** cross-faction (composite of R6 + B3 + H3)
**Source tier:** `agreement_text` (Vance-Owen Peace Plan final draft, Jan 1993) corroborated by `icty_icj_un` (Karadžić IT-95-5/18-T; Prlić et al. IT-04-74)
**Sensitive-history ring:** none (peace-plan composite; sensitive content lives in per-faction follow-on rows)
**Status:** Draft for Phase A review.

## 1. Cited Historical Narrative

The Vance-Owen Peace Plan (VOPP) was tabled by the Co-Chairmen of the Steering Committee of the International Conference on the Former Yugoslavia (ICFY) — Cyrus Vance (UN) and David Owen (EC) — in Geneva on 2 January 1993, with the final integrated text presented in late January and the maps refined into late March 1993. The plan proposed a single sovereign Bosnia and Herzegovina decentralized into ten provinces drawn along mixed ethnic-and-geographic lines, with each province governed primarily by the ethnic majority of its area but constitutionally Bosnian. It comprised three documents: Constitutional Principles, Map of the Ten Provinces, and Cessation of Hostilities arrangements (UN S/25221, 11 February 1993, and successor ICFY communiqués).

The HRHB delegation (Mate Boban) signed all three documents 2 January 1993 in Geneva, accepting both the principles and the map. The RBiH delegation (Alija Izetbegović) signed the Constitutional Principles 3 January 1993 and signed the full plan including the map on **25 March 1993** in New York. The Bosnian Serb delegation (Karadžić) signed the principles and the cessation arrangements but refused the map; on **6 May 1993** in Athens, Karadžić signed the full plan subject to ratification by the Bosnian Serb Assembly. On **5-6 May 1993** at Pale (and reaffirmed at the **15-16 May 1993 referendum**), the Bosnian Serb Assembly rejected ratification of the plan by overwhelming margin, despite open pressure from Milošević, Cosić, and the Greek government. (Karadžić IT-95-5/18-T Trial Judgment vol. III §§4180-4262 on the Bosnian Serb VOPP rejection; Prlić et al. IT-04-74 Trial Judgment vol. I §§415-432 on HRHB acceptance and the subsequent Croat-Bosniak war framing.)

The composite X2 family captures three per-faction responses (R6 RS, B3 RBiH, H3 HRHB) plus their interaction through `alliance_lock` and `dimension_shifts`. The plan's failure was determined by Assembly rejection on the RS side, not by RBiH or HRHB conduct; therefore X2's composite framing must coordinate three response chains rather than authoring a fourth, freestanding "X2 plan-level option."

The collapse of VOPP, combined with HRHB's full acceptance and RBiH's eventual acceptance, is one of the precipitating contexts for the intensification of the Croat-Bosniak war in central Bosnia (April 1993 onward — Gornji Vakuf escalation H2, Ahmići 16 April 1993 H5), because HRHB read VOPP cantonization as legitimating Croat-majority province boundaries it then sought to consolidate by force. (Prlić et al. IT-04-74 Trial Judgment vol. III on the link between VOPP maps and HVO operational tempo April-October 1993.)

## 2. Defensible Historical/Default Option (Composite Framing)

X2 is a **composite**, not a single-decision row. The historical default is the **joint outcome** produced by three separate faction-keyed decisions:

- **RS (R6) historical default:** `reject` (Assembly vote 5-6 May 1993, referendum 15-16 May 1993).
- **RBiH (B3) historical default:** `accept` (full signature 25 March 1993).
- **HRHB (H3) historical default:** `acknowledge_pressure` (Boban signed all three documents 2 January 1993; the plan was patron-pressured by Zagreb/Tudjman).

- **Citation:** UN S/25221 (VOPP final draft, 11 Feb 1993) + Karadžić IT-95-5/18-T Trial Judgment vol. III §§4180-4262 + Prlić et al. IT-04-74 Trial Judgment vol. I §§415-432.

## 3. Proposed Counterfactual Options (Composite Branch Flow)

X2 does not author a fourth options set. The packet §4 X2 row explicitly states the X2 family is "composite of R6 + B3 + H3 — describe the composite framing rather than authoring a 4th set of options." Instead, this worksheet specifies **how the three per-faction decisions interact** through `alliance_lock` and `dimension_shifts`.

### Composite outcome matrix

| RS (R6) | RBiH (B3) | HRHB (H3) | Composite branch | Branch tag |
|---|---|---|---|---|
| `reject` | `accept` | `acknowledge_pressure` | **Historical**: VOPP collapses on RS Assembly rejection; HRHB-ARBiH alliance ruptures over cantonization; Croat-Bosniak war intensifies. | `vance_owen_rejected_by_rs` |
| `accept` | `accept` | `acknowledge_pressure` | **Counterfactual A**: VOPP enters implementation; ten-province framework supplants partitionist trajectories. Forecloses RS Strategic Goals consolidation. | `vance_owen_implemented` |
| `reject` | `reject` | `acknowledge_pressure` | **Counterfactual B**: VOPP collapses on multiple-party rejection (less RS-isolating). Diplomatic capital expended without RS-isolation diplomatic dividend. | `vance_owen_multilaterally_rejected` |
| `reject` | `accept` | `resist_patron` | **Counterfactual C**: HRHB defies Zagreb on VOPP. Patron pressure on HRHB increases; HRHB-Zagreb friction; alliance_lock RBiH-HRHB does not deteriorate as severely. | `vance_owen_hrhb_defects` |

- **Historical analogy (counterfactual A):** Plausible alternate history if the Bosnian Serb Assembly had ratified under Milošević pressure (close historical contingency — Milošević personally lobbied at Pale; Cosić, Mitsotakis pressed). Documented as a "near miss" in Karadžić IT-95-5/18-T trial record.
- **Design provenance:** All counterfactuals are defensible hypotheses, not likelihood claims. They are entry points for player-driven divergence, not bot-default targets. Historical bot calibration follows the historical row above (`reject` / `accept` / `acknowledge_pressure`).
- **Sensitive-history check:** Confirmed — no option in the composite matrix authorizes new atrocity, camp, cleansing, hostage, or civilian-targeting acts. Counterfactual A (`vance_owen_implemented`) reduces follow-on atrocity exposure (Ahmići, Stupni Do, Heliodrom-Dretelj-Gabela) but does not retroactively erase 1992 atrocities, which remain Ring 2 essays.

## 4. Material Effects (per packet §3.3)

Effects flow through three separate decision rows (R6, B3, H3). X2 itself does not author effects directly — it is a composite analytical row in §4 of the packet. However, the **composite branch-tag** (set by reading R6/B3/H3 flags together) is what downstream events gate on.

### Per-faction row effects (authored on R6, B3, H3 worksheets — referenced here for composite coherence)

- **R6 `reject` (historical):**
  - `sets_flags`: `rs_voplan_response: 'reject'`
  - `dimension_shifts`: `international_standing: -2` (RS rejection isolates internationally), `patron_pressure: +2` (Belgrade pressure on Pale intensifies — feeds R8 embargo 1994)
  - `enables_events_runtime`: `csq_international_disillusionment_1993` (pending — refers to consequences family), `belgrade_embargo_rs_1994` (R8 pending)
  - `closes_events_runtime`: none — VOPP collapse stays in the diplomatic-process trail, downstream peace-plan rows (Owen-Stoltenberg X3) remain reachable.

- **B3 `accept` (historical):**
  - `sets_flags`: `rbih_voplan_response: 'accept'`
  - `dimension_shifts`: `international_standing: +1`, `internal_cohesion: -1` (Sarajevo accepted reluctantly given cantonization implications)
  - `enables_events_runtime`: `owen_stoltenberg_engagement_1993` (pending — refers to future X3 / B4)
  - `closes_events_runtime`: none.

- **H3 `acknowledge_pressure` (historical):**
  - `sets_flags`: `hrhb_voplan_response: 'acknowledge_pressure'`
  - `dimension_shifts`: `patron_pressure: +1` (Zagreb wins on HRHB compliance), `alliance_lock: -1` on RBiH-HRHB (HRHB read cantonization as legitimating Croat-majority province consolidation by force; downstream rupture intensifies through H2/H5)
  - `enables_events_runtime`: `gornji_vakuf_clashes_1993` (pending — refers to H2)
  - `closes_events_runtime`: none.

### Composite alliance_lock interaction

When `rs_voplan_response: 'reject'` AND `rbih_voplan_response: 'accept'` AND `hrhb_voplan_response: 'acknowledge_pressure'` (historical row), the resulting composite tag `vance_owen_rejected_by_rs` is the discriminator for RBiH-HRHB war intensification (April-October 1993). Downstream events (H2 Gornji Vakuf, H5 Ahmići-tier incidents) gate on this composite flag via `trigger.condition.flag_equals: { rs_voplan_response: 'reject', hrhb_voplan_response: 'acknowledge_pressure' }`.

When the composite tag instead resolves to `vance_owen_implemented` (counterfactual A), the H2/H5 chain is **foreclosed**: implementation under ICFY supervision suppresses the central-Bosnia escalation predicate.

## 5. Downstream Opens/Closes

- **Opens (eligibility):**
  - `csq_international_disillusionment_1993` (consequences family; pending refers to consequences.json csq_* row)
  - `owen_stoltenberg_engagement_1993` (pending — refers to future X3)
  - `belgrade_embargo_rs_1994` (pending — refers to R8 worksheet)
  - `gornji_vakuf_clashes_1993` (pending — refers to H2 worksheet; gated on composite tag)
  - `ahmici_massacre_1993` (already authored event row; gated on H2 chain, not directly on X2)
- **Closes (eligibility):** none directly. Counterfactual A would close several downstream rows but those closures live on the counterfactual-tagged composite, not on X2 as a standalone event.
- **Branch-tag:** `diplomacy_vance_owen` (per packet §2.2 vocabulary slot `diplomacy_vance_owen`). The composite resolution produces sub-tags `vance_owen_rejected_by_rs` (historical), `vance_owen_implemented` (counterfactual A), `vance_owen_multilaterally_rejected` (counterfactual B), `vance_owen_hrhb_defects` (counterfactual C).

## 6. Modal Source Notes

> "The Vance-Owen Plan (UN S/25221, Jan-March 1993) proposed ten-province decentralized Bosnia. HRHB signed Jan 1993; RBiH signed in full 25 March 1993; the Bosnian Serb Assembly rejected ratification 5-6 May 1993 (reaffirmed 15-16 May 1993 referendum). The Croat-Bosniak war intensified in part on HRHB reading of cantonization (Prlić IT-04-74; Karadžić IT-95-5/18-T vol. III §§4180-4262)." (≤2 sentences after compression — split for clarity.)

## 7. Open Questions

1. **Authoring shape: composite event vs. three separate events.** Packet §4 X2 treats X2 as a composite analytical row. **Decision: three separate per-faction events** (R6 RS + B3 RBiH + H3 HRHB), each authored independently with `responding_faction` set; composite branch tag is *computed* at downstream trigger evaluation by reading the three per-faction flags together. Trade-off: cleaner faction modal contract (v1.3 §3.5), independent bot calibration, historically distinct dates (Boban Jan 2; Izetbegović March 25; Karadžić May 6; Assembly May 5-6/15-16). Composite is an analytical row, not a runtime row. Per Game Designer Wave 1 review.
2. **Composite tag derivation.** Downstream events that gate on the composite (e.g., H2 Gornji Vakuf gate) need a `trigger.condition` that reads three separate flags. Confirm with Technical Architect that `flag_equals` supports multi-flag AND predicates, or whether a composite-tag flag must be written by a meta-evaluator step.
3. **R7 override-Assembly counterfactual interaction.** R6 historical default is `reject` (Assembly vote). R7 worksheet covers the `override_assembly` counterfactual where Pale rules over the Assembly. X2 worksheet must align with R7: if R7 fires with `override_assembly`, R6 resolves to `accept` and the X2 composite tag becomes `vance_owen_implemented` even though the Assembly historically rejected. Confirm Phase D ordering of R6 vs. R7.
4. **HRHB H3 vs. H1a interaction.** The 6 May 1992 Graz meeting (H1a) precedes VOPP by 8 months but establishes the partition predicate that conditions HRHB's reading of VOPP cantonization. H3 worksheet must specify whether `vance_owen_hrhb_defects` (counterfactual C) requires H1a `formal_alliance_persists` as a precondition, or whether H3 can defy patron independently of the 1992 alliance posture. Recommend requiring H1a `formal_alliance_persists` for counterfactual C reachability. Defer to Historian + Game Designer.
