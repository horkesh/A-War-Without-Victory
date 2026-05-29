# Event Family Worksheet — X3: Owen-Stoltenberg (overall)

**Date:** 2026-05-27
**Family ID:** X3
**Faction scope:** cross-faction (composite of R9 + B4 + H4)
**Source tier:** `agreement_text` (Owen-Stoltenberg / Union of Three Republics package, including HMS *Invincible* package Sep 1993) corroborated by `icty_icj_un` (UN S/26486; Karadžić IT-95-5/18-T; Prlić et al. IT-04-74)
**Sensitive-history ring:** none (peace-plan composite; sensitive content lives in per-faction follow-on rows)
**Status:** Draft for Phase A review.

## 1. Cited Historical Narrative

The Owen-Stoltenberg Plan (formally "Constitutional Agreement of the Union of Republics of Bosnia and Herzegovina", also called the "Invincible package" for the HMS *Invincible* shipboard negotiation site) was tabled by ICFY Co-Chairmen David Owen (EC) and Thorvald Stoltenberg (UN, having succeeded Cyrus Vance in May 1993) over the summer of 1993, culminating in the September 1993 negotiation aboard HMS *Invincible* in the Adriatic. The plan abandoned VOPP's ten-province integrated-Bosnia framework and instead proposed three loosely-federated ethnic republics within a "Union of Republics" — explicitly accepting the partition logic the Bosnian Serb leadership had pushed against VOPP. Owen-Stoltenberg is therefore the diplomatic-process row where the 1992 partition framework re-enters the international peace track. (UN S/26486, 23 September 1993; Karadžić IT-95-5/18-T Trial Judgment vol. III §§4263-4310; Prlić IT-04-74 vol. I §§433-451.)

The Bosnian Serb Assembly **accepted** the plan on **20 September 1993** at Pale, conditional on territorial adjustments that effectively ratified the existing Bosnian Serb military line. The HRHB delegation (Boban) **accepted** the plan at Geneva, having helped author the partition framework under Tudjman direction. The RBiH side was internally divided: the Presidency under Izetbegović narrowly accepted the package on **20 September 1993** in Geneva conditional on territorial concessions in eastern Bosnia (including the Drina enclaves — Srebrenica, Žepa, Goražde — and the Posavina corridor). The Bosnian Assembly in Sarajevo, however, **rejected** the package outright on **29 September 1993**, citing the unrecoverable Drina enclaves and the Posavina corridor cession as unacceptable. The package collapsed because the RBiH Assembly rejection withdrew the second of three required signatures. (UN S/26486 covers the Geneva conditional acceptance; RBiH Assembly vote of 29 September 1993 is documented in the ICFY Steering Committee Report S/26922 of 21 December 1993 and in Karadžić IT-95-5/18-T vol. III §§4280-4310.)

X3's composite framing is therefore: **RS accept (Pale 20 Sep 1993); HRHB accept (Geneva); RBiH reject_via_assembly (Sarajevo Assembly 29 Sep 1993)**. This is the historically documented joint outcome. The historical default for B4 is `reject_via_assembly` per packet §4 B4 row (Historian must-fix Edit 3 of packet v1.1).

The Owen-Stoltenberg collapse pushes the diplomatic track into the EU Action Plan (Nov 1993), the Washington Agreement (March 1994, RBiH-HRHB federation, X5), the Contact Group Plan (July 1994, 51/49 split, X4), and ultimately Dayton (Nov 1995, X9). The dimension-shift consequences of X3 are therefore largely deferred to those downstream tracks; X3 itself materially shifts only diplomatic capital and the late-1993 peace track readiness.

## 2. Defensible Historical/Default Option (Composite Framing)

X3 is a **composite**, not a single-decision row. The historical default is the **joint outcome** produced by three separate faction-keyed decisions:

- **RS (R9) historical default:** `acknowledge_pressure` (per packet §4 R9 row — Pale accepted on 20 Sep 1993 conditional on territorial adjustments; the acceptance was patron-pressured by Milošević through the ongoing post-VOPP recalibration, and packet §4 explicitly maps R9 to `acknowledge_pressure`/`resist_patron` axis).
- **RBiH (B4) historical default:** `reject_via_assembly` (Presidency narrowly accepted 20 Sep 1993; Assembly rejected outright 29 Sep 1993, per packet §4 B4 Historian must-fix and UN S/26486).
- **HRHB (H4) historical default:** `acknowledge_pressure` (Boban accepted under Tudjman/Zagreb direction; the partition-framework predicate originates in 1992 HRHB strategic posture).

- **Citation:** UN S/26486 (23 Sep 1993 ICFY transmission); UN S/26922 (21 Dec 1993 Steering Committee Report); Karadžić IT-95-5/18-T Trial Judgment vol. III §§4263-4310; Prlić IT-04-74 vol. I §§433-451.

## 3. Proposed Counterfactual Options (Composite Branch Flow)

X3 does not author a fourth options set. Packet §4 X3 explicitly states "composite of R9 + B4 + H4 — same composite framing pattern" as X2. This worksheet specifies how the three per-faction decisions interact through `dimension_shifts` and downstream chain visibility.

### Composite outcome matrix

| RS (R9) | RBiH (B4) | HRHB (H4) | Composite branch | Branch tag |
|---|---|---|---|---|
| `acknowledge_pressure` | `reject_via_assembly` | `acknowledge_pressure` | **Historical**: package collapses on RBiH Assembly veto despite Presidency consent; partition-framework remains live but unconsummated; track pivots to Washington + Contact Group + Dayton. | `owen_stoltenberg_rejected_by_rbih_assembly` |
| `acknowledge_pressure` | `reject_sincerely` | `acknowledge_pressure` | **Counterfactual A**: RBiH rejects outright without Presidency-Assembly split, signaling unified sovereign-Bosnia stance. Reduces internal_cohesion penalty; foregoes diplomatic-capital cost of Presidency reversal. | `owen_stoltenberg_rbih_unified_reject` |
| `acknowledge_pressure` | `accept_for_optics` | `acknowledge_pressure` | **Counterfactual B (HISTORICALLY-NEAR — DEFAULT BLOCKED)**: Presidency wins Assembly ratification of the Invincible package. RBiH cedes Drina enclaves on paper; partition framework consummates; Washington-track and federation formation deferred or foreclosed. **DEFAULT BLOCKED — do not author in Phase D until Sensitive-History Gate §6 sign-off is recorded (Historian + Game Designer + user).** Per Wave 1 review, both Canon Compliance Reviewer and Game Designer refused authoring this counterfactual independently because treaty-ceded Drina enclaves would interact with the `srebrenica_genocide_1995` rupture predicate (Gate §1 Ring 3 #10, Gate §6 row "New rupture added / Change to rupture trigger"). Historical analysis below remains in place; only the authoring posture is locked. ENABLES sensitive downstream — see §3 sensitive-history check. | `owen_stoltenberg_implemented` |
| `resist_patron` | `reject_via_assembly` | `acknowledge_pressure` | **Counterfactual C**: Pale defies Milošević pressure and rejects. Multi-party rejection; patron pressure on RS increases; feeds R8 embargo. | `owen_stoltenberg_multilaterally_rejected` |
| `acknowledge_pressure` | `reject_via_assembly` | `resist_patron` | **Counterfactual D**: HRHB defies Zagreb. Patron-pressure on HRHB intensifies; RBiH-HRHB alliance posture less damaged. | `owen_stoltenberg_hrhb_defects` |

- **Historical analogy (counterfactual A — unified reject):** Plausible if Izetbegović had aligned earlier with the Assembly hawks rather than testing the conditional-acceptance position at Geneva. Documented internal-debate record in UN S/26486 commentary.
- **Historical analogy (counterfactual B — implemented):** Close historical contingency. The Presidency vote of 20 Sep 1993 was narrow; a different parliamentary majority on 29 Sep could have ratified. Documented as a "near miss" in Karadžić IT-95-5/18-T vol. III §§4290-4310 commentary on the September negotiation outcomes.
- **Historical analogy (counterfactual D — HRHB defects):** Plausible only after a different H1a/H3 trajectory where Boban had taken a more independent posture from Zagreb. Conditional on upstream HRHB branching.
- **Design provenance:** All counterfactuals are defensible hypotheses, not likelihood claims. Historical bot calibration follows the historical row (`acknowledge_pressure` / `reject_via_assembly` / `acknowledge_pressure`).
- **Sensitive-history check:**
  - Counterfactuals A, C, D — confirmed clear of Ring 1/2/3 violations. No new atrocity, camp, cleansing, hostage, or civilian-targeting authorization.
  - **Counterfactual B (`owen_stoltenberg_implemented`)** — REQUIRES NARRATIVE-DESIGNER + HISTORIAN REVIEW. Paper cession of Drina enclaves under a peace agreement is not equivalent to authoring fall-by-force. The enclaves would in this branch be transferred under ICFY supervision with population-protection arrangements. This is a diplomatic counterfactual, not a sensitive-act authorization. However: if the branch interacts with srebrenica_falls_1995 / srebrenica_genocide_1995 rupture eligibility, the Phase D author must verify that the rupture predicate (RS controls `op:srebrenica:srebrenica_2` AND enclave_formed_flag AND turn ≥140) cannot be reached through this branch in a way that authorizes the rupture by player choice — see SENSITIVE_HISTORY_DESIGN_GATE §1 Ring 3 #1 (no commit-genocide decision tree) and §2 (rupture binds on emergent satisfaction of the discrete game-state condition, not calendar). If the branch transfers Srebrenica to RS by treaty in Sep-Oct 1993 such that the enclave is never "formed" in the rupture sense, the rupture is unreachable through this branch — that is canonically correct per §2 criterion-3. Defer final B-branch authorization to Sensitive-History Gate §6 sign-off (Game Designer + Historian + user).

## 4. Material Effects (per packet §3.3)

Effects flow through three separate decision rows (R9, B4, H4). X3 itself does not author effects directly. The composite branch-tag (read from R9/B4/H4 flags) is what downstream events gate on.

### Per-faction row effects (authored on R9, B4, H4 worksheets — referenced here for composite coherence)

- **R9 `acknowledge_pressure` (historical):**
  - `sets_flags`: `rs_owen_stoltenberg_response: 'acknowledge_pressure'`
  - `dimension_shifts`: `patron_pressure: -1` (RS yielded to Belgrade pressure on this row), `international_standing: 0` (acceptance noted; partition framework still controversial)
  - `enables_events_runtime`: pending — refers to future EU Action Plan + Contact Group X4 + Washington X5
  - `closes_events_runtime`: none

- **B4 `reject_via_assembly` (historical):**
  - `sets_flags`: `rbih_owen_stoltenberg_response: 'reject_via_assembly'`
  - `dimension_shifts`: `international_standing: -1` (Presidency reversal noted by ICFY as procedural irritant), `internal_cohesion: -1` (Presidency-Assembly split), `diplomatic_capital: -1` (failed Geneva commitment costs RBiH future plan-engagement credibility)
  - `enables_events_runtime`: `washington_agreement_engagement_1994` (pending — refers to future X5 / B10), `eu_action_plan_1993` (pending — refers to consequences family)
  - `closes_events_runtime`: none

- **H4 `acknowledge_pressure` (historical):**
  - `sets_flags`: `hrhb_owen_stoltenberg_response: 'acknowledge_pressure'`
  - `dimension_shifts`: `patron_pressure: -1` (Zagreb won on HRHB compliance — HRHB had no independent objection to partition framework), `alliance_lock: 0` (no further RBiH-HRHB damage from Owen-Stoltenberg specifically; H2/H5 chain dominates that variable)
  - `enables_events_runtime`: `washington_agreement_engagement_1994` (pending — refers to future X5 / H9)
  - `closes_events_runtime`: none

### Composite alliance_lock / dimension-shift interaction

The historical composite (`owen_stoltenberg_rejected_by_rbih_assembly`) leaves all three downstream peace-plan tracks (Washington X5, Contact Group X4, Dayton X9) reachable. Counterfactual B (`owen_stoltenberg_implemented`) forecloses Washington X5 and Contact Group X4 as authored, because the partition-framework would already be in implementation. Phase D author must wire counterfactual B's `closes_events_runtime` carefully — see §5 below and §7 Open Question 2.

## 5. Downstream Opens/Closes

- **Opens (eligibility):**
  - `eu_action_plan_1993` (pending — consequences family follow-on)
  - `washington_agreement_engagement_1994` (X5 composite; opens via B4 + H4 historical paths)
  - `contact_group_plan_1994` (X4 composite; opens via all three historical paths)
  - `belgrade_embargo_rs_1994` (R8 pending; counterfactual C `resist_patron` path opens this with higher pressure)
- **Closes (eligibility):**
  - Historical composite: none in Phase A.
  - Counterfactual B `owen_stoltenberg_implemented`: would close `washington_agreement_engagement_1994` and `contact_group_plan_1994` (defer authoring decision to Game Designer + Sensitive-History Gate review).
- **Branch-tag:** `diplomacy_owen_stoltenberg` (per packet §2.2 vocabulary slot). Sub-tags per composite outcome as listed in §3 matrix.

## 6. Modal Source Notes

> "Owen-Stoltenberg / Union of Three Republics package (UN S/26486, Sep 1993) abandoned VOPP's integrated-Bosnia frame for a three-republic union. Bosnian Serb Assembly accepted 20 Sep 1993 at Pale; RBiH Presidency narrowly accepted 20 Sep at Geneva, RBiH Assembly rejected outright 29 Sep 1993 over Drina enclave and Posavina concessions. Track pivoted to Washington / Contact Group / Dayton (Karadžić IT-95-5/18-T vol. III §§4263-4310)." (Compressed to ≤2 sentences for modal: split provided for review.)

## 7. Open Questions

1. **Authoring shape: composite event vs. three separate events.** Packet §4 X3 treats X3 as a composite analytical row. **Decision: three separate per-faction events** (R9 RS + B4 RBiH + H4 HRHB), each authored independently with `responding_faction` set; composite branch tag is *computed* at downstream trigger evaluation by reading the three per-faction flags together. Trade-off: cleaner faction modal contract (v1.3 §3.5), independent bot calibration, historically distinct dates (RS Assembly Pale 20 Sep 1993; RBiH Presidency Geneva 20 Sep then Sarajevo Assembly 29 Sep 1993; HRHB Geneva). Composite is an analytical row, not a runtime row. Per Game Designer Wave 1 review.
2. **Sensitive-history sign-off for counterfactual B (`owen_stoltenberg_implemented`).** The branch's interaction with srebrenica_falls_1995 / srebrenica_genocide_1995 rupture predicate must be reviewed by Sensitive-History Gate §6 (Game Designer + Historian + user). Phase A worksheet flags this as a deferred authoring decision; counterfactual B may need to be `Blocked` if the rupture-foreclosure mechanism cannot be made transparent and non-rewarding per Ring 3 #10 (no gamified prevent-genocide mechanic). Recommend Phase D author counterfactual B only after explicit Sensitive-History Gate sign-off; default authoring posture is conservative (omit counterfactual B until reviewed).
3. **B4 Presidency-vs-Assembly authoring.** The historical default `reject_via_assembly` requires the model to represent the 20 Sep 1993 Presidency conditional acceptance followed by 29 Sep 1993 Assembly rejection. This is a two-step decision sequence, not a single response option. Phase D must decide whether to author B4 as a single event with a `reject_via_assembly` label that abstracts the sequence, or as a two-step event chain. Recommend single event with abstracted label, with the dimension-shift `internal_cohesion: -1` capturing the Presidency-Assembly split. Defer to Game Designer.
4. **HRHB H4 counterfactual interaction with H7 (Zagreb orders ceasefire 1994).** Counterfactual D (`owen_stoltenberg_hrhb_defects`) is conditional on a different upstream HRHB posture; it also reshapes the H7 row (Zagreb's leverage over Boban). Phase D must align H4 counterfactual D with H7 reachability. Recommend constraining counterfactual D to require H1a `formal_alliance_persists` AND H3 `resist_patron` as preconditions. Defer to Historian + Game Designer.
5. **R9 vs. R6 historical-pattern alignment.** Packet §4 R9 historical default is `acknowledge_pressure`, but R6 (VOPP) historical default is `reject` (Assembly vote). The pattern shift between VOPP rejection and Owen-Stoltenberg acceptance on the RS side is the central diplomatic-history pivot of 1993. The X3 composite must specify whether R7 (override-Assembly counterfactual at VOPP stage) propagates a continued-rejection trajectory into Owen-Stoltenberg, or whether the post-VOPP recalibration is robust to upstream counterfactuals. Recommend treating R9 as independently resolvable but flag this for Historian review.
