# Event Family Worksheet — X4: Contact Group 51/49 Plan (July 1994)

**Date:** 2026-05-27
**Family ID:** X4
**Faction scope:** cross-faction (composite of R6-style RS reject + B10-style RBiH accept + H9-style HRHB accept)
**Source tier:** `agreement_text` (Contact Group Plan map and political principles, transmitted to the parties at Geneva, 5-6 July 1994) corroborated by `icty_icj_un` (UN S/1994/1124 of 4 Oct 1994; Karadžić IT-95-5/18-T Trial Judgment vol. III on the Bosnian Serb Assembly rejection)
**Sensitive-history ring:** none (peace-plan composite; sensitive-history rows live in per-faction follow-ons)
**Status:** Draft for Phase A review. Authored per Game Designer Wave 1 review as three separate per-faction events coordinated by runtime causality, not as one composite runtime event.

## 1. Cited Historical Narrative

The Contact Group Plan was the diplomatic instrument produced by the five-power Contact Group (United States, Russia, United Kingdom, France, and Germany) constituted in April 1994 to replace the stalled ICFY co-chair track after the Owen-Stoltenberg collapse (Sep 1993) and to consolidate the Washington Agreement framework (Mar 1994) into an overall settlement. The Plan's central instrument was a **territorial map allocating 51% of pre-war Bosnia and Herzegovina to the Federation of Bosnia and Herzegovina (the RBiH-HRHB federation produced by the Washington Agreement) and 49% to the Bosnian Serb side**, accompanied by constitutional principles for a single sovereign Bosnia within recognized international borders. The map was tabled to the parties at Geneva on **5-6 July 1994**, with formal transmission to the UN Security Council in subsequent Contact Group communiqués culminating in UN S/1994/1124 of 4 October 1994 (UN Secretariat). The plan structure preserved Bosnia's international personality (rejecting partition into sovereign successor states) while accepting the principle of internal ethnic-territorial allocation that Owen-Stoltenberg had pioneered.

The Federation side (RBiH + HRHB, now allied under Washington) **accepted** the plan in July 1994 at Geneva. The Bosnian Serb side rejected it. Karadžić initially equivocated; the Bosnian Serb Assembly at Pale, on **3 August 1994**, voted to put the plan to a **referendum 27-28 August 1994**, which returned an overwhelming rejection. The Bosnian Serb Assembly on **29 August 1994** formally ratified the referendum result and rejected the Plan, despite open public pressure from Milošević and the FRY government (Karadžić IT-95-5/18-T Trial Judgment vol. III §§4311-4360 on the Bosnian Serb rejection process and Milošević's pressure track; UN S/1994/1124).

In response to the RS rejection, the FRY (Milošević's government) on **4 August 1994** announced the **Serbia-Montenegro economic blockade of Republika Srpska** — closing the Drina border to all goods except food, medicine, and humanitarian shipments. This is the proximate event that feeds the R8 family (Belgrade embargo on RS, Aug 1994). The Contact Group track itself then went dormant on the RS side and was reactivated only after the Krajina/Bosnia summer 1995 campaigns and the Holbrooke shuttle. The 51/49 territorial framework, however, **survived as the territorial baseline for Dayton** in November 1995 (Karadžić IT-95-5/18-T vol. III §§4360-4400; Dayton Annex 2 territorial map). BB II also references the 51/49 framework as the bridge between Washington 1994 and Dayton 1995 (BB1 p.532 index; BB2 references at the cross-reference points).

The X4 composite framing is therefore: **RS reject (Assembly + referendum); RBiH accept (Federation already cohered under Washington); HRHB accept (Federation already cohered under Washington)**. This produces the historically documented joint outcome that triggered the FRY-RS embargo (R8) and pre-positioned the 51/49 map for Dayton (X9).

## 2. Defensible Historical/Default Option (Composite Framing)

X4 is a **composite**, not a single-decision row. The historical default is the **joint outcome** produced by three separate faction-keyed decisions, each authored as its own event in the catalog with `responding_faction` set:

- **RS (X4-RS, R6-style reject row):** historical default `reject`. Citation: Karadžić IT-95-5/18-T Trial Judgment vol. III §§4311-4360; Bosnian Serb Assembly votes of 3 Aug 1994 and 29 Aug 1994; RS referendum 27-28 Aug 1994.
- **RBiH (X4-RBiH, B10-style accept row):** historical default `accept`. Citation: agreement text; Federation already cohered under Washington Agreement (X5 / B10); UN S/1994/1124.
- **HRHB (X4-HRHB, H9-style accept row):** historical default `accept`. Citation: agreement text; Federation cohered under Washington (X5 / H9); HRHB-Zagreb compliance posture.

- **Combined citation:** UN S/1994/1124 (4 Oct 1994 Contact Group transmission); Karadžić IT-95-5/18-T Trial Judgment vol. III §§4311-4360; BB1 p.532 index reference to the Washington-to-Dayton bridge; BB2 p.470 Contact Group reference.

## 3. Proposed Counterfactual Options (Composite Branch Flow)

Per Game Designer Wave 1 review, X4 is not authored as one composite runtime event. The three per-faction events each author their own option set with `responding_faction` keyed. The composite branch tag is **computed** at downstream trigger evaluation by reading the three per-faction flags together. This worksheet specifies the composite outcome matrix.

### Composite outcome matrix

| RS (X4-RS) | RBiH (X4-RBiH) | HRHB (X4-HRHB) | Composite branch | Branch sub-tag |
|---|---|---|---|---|
| `reject` | `accept` | `accept` | **Historical**: Plan rejected by RS; FRY embargo on RS follows (4 Aug 1994 announcement); 51/49 map survives as Dayton baseline. | `contact_group_rejected_by_rs` |
| `accept` | `accept` | `accept` | **Counterfactual A**: Plan accepted by all three sides; 51/49 framework enters implementation in 1994 rather than waiting for Dayton (Nov 1995). Forecloses summer-1995 offensive cycle pathways that depend on the unimplemented status. | `contact_group_implemented` |
| `reject` | `reject` | `accept` | **Counterfactual B**: RBiH defies the Federation track and rejects (hypothetical: Sarajevo Assembly hawks override the Washington commitment). Federation cohesion damaged; HRHB-RBiH alliance_lock degrades. | `contact_group_rbih_defects` |
| `reject` | `accept` | `reject` | **Counterfactual C**: HRHB defies Zagreb on Contact Group (already-implausible given Federation cohesion under Washington); requires upstream HRHB branch shift (H7 `resist_patron`). | `contact_group_hrhb_defects` |
| `reject` | `accept` | `accept` (BUT R7 `override_assembly`-style upstream had fired) | Counterfactual edge case — Pale Presidency overrides the Assembly. Historical record shows this did not happen; Karadžić deferred to the Assembly vote. | `contact_group_rs_override` |

- **Historical analogy (counterfactual A — implemented):** Plausible if Milošević's pressure on Pale, combined with the FRY embargo threat, had succeeded in flipping the Assembly. Karadžić IT-95-5/18-T vol. III documents the Milošević pressure track as substantial but ultimately overridden by Assembly hardliners (Krajišnik, Mladić-aligned faction). Counterfactual A is closer than the VOPP/X2 implemented branch because the Federation side was already aligned.
- **Historical analogy (counterfactual B — RBiH defects):** Less plausible because RBiH had committed to the Federation under Washington and gained both military and diplomatic leverage. Plausible only under a different upstream B10 / X5 trajectory.
- **Historical analogy (counterfactual C — HRHB defects):** Implausible without upstream H7 / H9 divergence. Conditional on prior HRHB branching.
- **Design provenance:** All counterfactuals are defensible hypotheses, not likelihood claims. Historical bot calibration follows the historical row (`reject` / `accept` / `accept`). Per packet §3.5 staff-recommendation guard, no counterfactual option carries `enables_events_runtime` / `closes_events_runtime` unless its host row's modal-ready path is `historical_default_response_id`.
- **Sensitive-history check:** Confirmed — no option in the composite matrix authorizes new atrocity, camp, cleansing, hostage, or civilian-targeting acts. Counterfactual A (`contact_group_implemented`) would shift the 1995 trajectory; per packet §3.6 it cannot author rupture eligibility or foreclose `srebrenica_falls_1995` / `srebrenica_genocide_1995` rupture predicates through player choice, because those bind on emergent satisfaction of state conditions, not on calendar.

## 4. Material Effects (per packet §3.3)

Effects flow through three separate decision rows (X4-RS, X4-RBiH, X4-HRHB). X4 itself does not author effects directly; it is a composite analytical row. The composite branch tag (read from the three per-faction flags) is the discriminator for downstream gating.

### Per-faction row effects (authored independently in Phase D)

- **X4-RS `reject` (historical):**
  - `sets_flags`: `rs_contact_group_response: 'reject'`
  - `dimension_shifts`: `international_standing: -2` (RS isolated again after VOPP-style rejection), `patron_pressure: +2` (Belgrade pressure on Pale intensifies; feeds the Aug 1994 embargo as the direct material consequence)
  - `enables_events_runtime`: `belgrade_embargo_rs_1994` (R8 — proximate consequence; per packet §3.6 the runtime arrays must also appear in `future_consequences.opens_events` on the same option). Also references `csq_international_disillusionment_1994` (pending consequences-family row, parallel to the 1993 row produced by X2).
  - `closes_events_runtime`: none — Dayton track (X9) remains reachable because the 51/49 framework survives the rejection as the eventual settlement baseline.

- **X4-RS `accept` (counterfactual A driver from RS side):**
  - `sets_flags`: `rs_contact_group_response: 'accept'`
  - `dimension_shifts`: `international_standing: +2`, `patron_pressure: -2` (Belgrade rewarded by RS compliance), `internal_cohesion: -2` (Assembly hardliners — Krajišnik-aligned faction, Mladić — opposed; acceptance fractures RS internal politics)
  - `enables_events_runtime`: `contact_group_implementation_phase_1994` (pending — new consequences-family row to author in Phase D under counterfactual A)
  - `closes_events_runtime`: `belgrade_embargo_rs_1994` (R8 foreclosed — historical embargo predicate gone; Phase D authoring decision per packet §3.6 disjointness rule)

- **X4-RBiH `accept` (historical):**
  - `sets_flags`: `rbih_contact_group_response: 'accept'`
  - `dimension_shifts`: `international_standing: +1` (Federation side cooperative), `alliance_lock: +1` on RBiH-HRHB (Federation cohesion reinforced through joint plan acceptance), `diplomatic_capital: +1`
  - `enables_events_runtime`: pending — refers to Dayton entry conditions (X9) and the late-war Holbrooke shuttle (X8). Per packet §3.6, runtime arrays must appear in `future_consequences.opens_events`.
  - `closes_events_runtime`: none.

- **X4-HRHB `accept` (historical):**
  - `sets_flags`: `hrhb_contact_group_response: 'accept'`
  - `dimension_shifts`: `patron_pressure: -1` (Zagreb rewarded by HRHB compliance with Federation track), `alliance_lock: +1` on RBiH-HRHB
  - `enables_events_runtime`: pending — refers to Dayton entry conditions (X9), late-war HV expeditionary support (H11).
  - `closes_events_runtime`: none.

### Composite alliance_lock and embargo interaction

When `rs_contact_group_response: 'reject'` AND `rbih_contact_group_response: 'accept'` AND `hrhb_contact_group_response: 'accept'` (historical row), the composite tag `contact_group_rejected_by_rs` is the discriminator for the Aug 1994 RS embargo (R8) and for the late-war pivot toward Dayton via the unchanged 51/49 baseline. Downstream events that gate on the composite use `trigger.condition` reading all three per-faction flags (see X2/X3 Open Question 2 — multi-flag AND predicate confirmation with Technical Architect).

When the composite resolves to `contact_group_implemented` (counterfactual A), the R8 embargo is foreclosed and the 1995 offensive cycle pathways must be re-evaluated through downstream consequences-family rows. Phase D must wire counterfactual A's `closes_events_runtime` carefully, deferring any sensitive interaction with the 1995 rupture predicates (see §3 sensitive-history check above and packet §3.6).

## 5. Downstream Opens/Closes

- **Opens (eligibility):**
  - `belgrade_embargo_rs_1994` (R8 — opened by historical X4-RS `reject`; closed by counterfactual X4-RS `accept`)
  - `contact_group_implementation_phase_1994` (pending consequences-family row; opened only by counterfactual A composite)
  - Dayton entry conditions / `dayton_signed` (X9 — the 51/49 territorial baseline survives RS rejection and becomes the Dayton map)
  - `csq_international_disillusionment_1994` (pending consequences-family row parallel to the 1993 csq row produced by X2 historical)
- **Closes (eligibility):**
  - Historical composite: none directly. Counterfactual A would close the R8 embargo path; defer authoring decision to Game Designer + Sensitive-History Gate review where 1995 rupture interaction is implicated.
- **Branch-tag:** `diplomacy_contact_group` (per packet §2.2 vocabulary slot `diplomacy_contact_group`). The composite resolution produces sub-tags `contact_group_rejected_by_rs` (historical), `contact_group_implemented` (counterfactual A), `contact_group_rbih_defects` (counterfactual B), `contact_group_hrhb_defects` (counterfactual C), `contact_group_rs_override` (edge case).

## 6. Modal Source Notes

> "The Contact Group Plan (United States, Russia, UK, France, Germany; UN S/1994/1124 of 4 Oct 1994) tabled a 51%-Federation / 49%-Bosnian Serb territorial map at Geneva 5-6 July 1994. The Federation side accepted; the Bosnian Serb Assembly voted on 3 Aug 1994 to put the plan to a referendum 27-28 Aug 1994, which rejected it, and the Assembly ratified the rejection on 29 Aug 1994 — triggering the FRY economic blockade of RS on 4 Aug 1994 (Karadžić IT-95-5/18-T Trial Judgment vol. III §§4311-4360). The 51/49 territorial framework survived as the Dayton baseline (Dayton Annex 2)." (Compressed to ≤2 sentences for modal display; expanded here for review.)

## 7. Open Questions

1. **Authoring shape: composite event vs. three separate events.** Resolved per Game Designer Wave 1 review: three separate per-faction events (X4-RS, X4-RBiH, X4-HRHB), each with its own `responding_faction`, faction-specific historical date in `trigger.turn_min` (RS Assembly 29 Aug 1994; Federation Geneva acceptance July 1994), and independent bot calibration. Composite tag is computed at downstream trigger evaluation. Composite remains an analytical row in this worksheet, not a runtime row.
2. **Composite tag derivation.** Downstream events that gate on the composite (notably `belgrade_embargo_rs_1994` R8 and Dayton entry X9 conditions) need a `trigger.condition` that reads three separate flags. Carry forward from X2 Open Question 2 — confirm with Technical Architect that `flag_equals` supports multi-flag AND predicates, or whether a composite-tag flag must be written by a meta-evaluator step in Phase B/C wiring.
3. **R7 (`override_assembly`) interaction with X4-RS.** If the player has fired R7 with `override_assembly` at the VOPP stage (X2), does that propagate into Contact Group such that Pale Presidency overrides the 29 Aug 1994 Assembly vote? Recommend treating X4-RS as independently resolvable (consistent with X3 Open Question 5), but flag for Historian + Game Designer alignment. The historical record shows Karadžić deferred to the Assembly on Contact Group; an override here is a separate counterfactual from the VOPP-stage override.
4. **R8 embargo as a downstream consequence vs. authored row.** R8 (Belgrade embargo on RS, Aug 1994) is already on the inventory backlog. X4-RS `reject` must wire `enables_events_runtime: ['belgrade_embargo_rs_1994']` consistent with R8's worksheet (when authored). Confirm Phase D ordering: R8 must be authored after X4-RS or in the same commit.
5. **Sensitive-history sign-off for counterfactual A.** Counterfactual A (`contact_group_implemented`) would shift the entire 1995 trajectory. Per packet §3.6, it cannot author rupture eligibility or foreclose `srebrenica_falls_1995` / `srebrenica_genocide_1995` rupture predicates through player choice. Phase D authoring of counterfactual A's `closes_events_runtime` must be reviewed by Sensitive-History Gate §6 (Game Designer + Historian + user) before wiring any closure that interacts with 1995 enclave rupture predicates. Recommend conservative default: omit counterfactual A's rupture-adjacent closures pending Gate sign-off.
