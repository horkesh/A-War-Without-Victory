# Event Family Worksheet — H12: HRHB Dayton Acceptance (1995)

**Date:** 2026-05-27
**Family ID:** H12
**Faction scope:** HRHB (responding faction; coordinates with B13 RBiH and R15 RS into the X9 Dayton entry composite)
**Source tier:** `agreement_text` (General Framework Agreement for Peace in Bosnia and Herzegovina — Dayton Accords, initialled Dayton 21 Nov 1995, signed Paris 14 Dec 1995; Annexes 1A–11) corroborated by `balkan_battlegrounds` (BB II operational close-out chapters) and `icty_icj_un` (UN S/1995/999 transmission of the GFAP text; Prlić et al. IT-04-74 vol. I §§591-640 on the HR HB → Federation transition)
**Sensitive-history ring:** None for the acceptance decision. Downstream Federation-integration / minority-return rows are non-sensitive; ICTY-tracked HR HB JCE findings reside in H1–H8 and remain consequence-only per `SENSITIVE_HISTORY_DESIGN_GATE.md`.
**Status:** Draft for Phase A review.
**Existing catalog row reference:** No standalone `hrhb_dayton_acceptance` JSON row authored today; downstream `dayton_signed` and consequence rows already exist. Phase D will author the H12 row.

---

## 1. Cited Historical Narrative

The General Framework Agreement for Peace in Bosnia and Herzegovina (GFAP, "Dayton Accords") was negotiated 1–21 November 1995 at Wright-Patterson Air Force Base, Dayton, Ohio, under Richard Holbrooke's US delegation, initialled 21 November 1995, and signed in Paris on 14 December 1995. The agreement text and its eleven annexes were transmitted to the UN Security Council by UN S/1995/999 and endorsed by UNSCR 1031 (15 December 1995). The HRHB delegation was a constituent component of the Federation delegation; HR HB was not a sovereign signatory in its own right but acted through the Federation channel established by the Washington Agreement (1 March 1994).

By November 1995 the institutional posture of HR HB toward Dayton was already constrained by the Washington framework:

- The **Washington Agreement** of 1 March 1994 (and the implementing Vienna and Bonn agreements through 1994-95) committed HR HB to dissolve as a parallel state and integrate into the Federation of Bosnia and Herzegovina (Prlić Trial Judgment vol. I §§591-620; Washington Agreement text Article I).
- The **HV-HVO joint offensives** of summer 1995 (Operation Storm 4-7 August 1995; Operation Mistral 2 / Sana 1995 8-15 September 1995) had reset the Croatian-side strategic position: Krajina collapsed, the western and central-Bosnia battlefield was favorable to the HV-HVO-ARBiH coalition, and Zagreb's leverage over Boban's successor leadership (Krešimir Zubak, elected HR HB President 5 August 1994 under Federation reform) was at its peak.
- **Tudjman's diplomatic posture** at Dayton was that HR HB delivered acceptance as part of the Croatian delegation's bargain: the Federation entity within Bosnia-Herzegovina would constitutionally protect Croat constitutive-nation status; HR HB would dissolve formally; in exchange Croatia accepted the Federation as the durable Croat-political vehicle inside BiH rather than the abandoned 1939-Banovina maximalist project (Prlić Trial Judgment vol. I §§621-640; Holbrooke "To End a War" published 1998 corroborated by ICTY testimony record).

The HR HB acceptance at Dayton is therefore documented historical fact: the HR HB delegation, acting through the Federation channel, accepted the GFAP and its annexes including Annex 4 (the BiH Constitution), Annex 5 (Arbitration), Annex 7 (Refugees and Displaced Persons), and Annex 1B (Regional Stabilization). The dissolution of HR HB as a parallel state was formally completed by 1996 implementation acts.

There is no documented HR HB internal motion for outright rejection of the GFAP at Dayton. Internal Croat-political dissatisfaction with specific provisions (particularly the Federation entity rather than a third entity for Croats) existed and surfaces below as the H13 third-entity counterfactual (separate family). H12 itself frames the binary `accept` (historical) vs. `hardline` (refuse Dayton in the HR HB delegation channel) decision.

The 1939 Banovina Hrvatska borders referenced in HR HB's founding ideology (HZ HB 18 Nov 1991, HR HB 28 Aug 1993, per H1) had been definitively abandoned as a maximalist project by the Washington Agreement; Dayton ratified that abandonment into the international peace settlement.

## 2. Defensible Historical/Default Option

- **Label:** `accept` — HR HB delegation, acting through the Federation channel, accepts the GFAP and its annexes; HR HB dissolves as a parallel state into the Federation of BiH per Washington Agreement implementation.
- **Rationale:** This is the documented historical action of the HR HB leadership in November 1995 under post-Washington Federation constraints and post-Storm strategic conditions. The decision was institutionally pre-committed by the Washington Agreement (1 March 1994) and operationally pre-committed by the summer 1995 HV-HVO offensive partnership with ARBiH; Dayton ratified rather than initiated the institutional path. Tier A sources.
- **Citation:** General Framework Agreement for Peace in Bosnia and Herzegovina, initialled 21 Nov 1995 Dayton, signed 14 Dec 1995 Paris; UN S/1995/999 transmission; UNSCR 1031 (15 Dec 1995) endorsement; Washington Agreement 1 March 1994 (predicate); Prlić et al. IT-04-74 Trial Judgment (29 May 2013) vol. I §§591-640 (HR HB → Federation transition); BB II close-out chapters on the Federation military integration through autumn 1995.

## 3. Proposed Counterfactual Options

### Option: `hardline`

- **Label:** `hardline` — HR HB delegation rejects the Federation-entity framework at Dayton, refuses to dissolve as a parallel state, and walks the Croat delegation back from Federation acceptance.
- **Historical analogy:** The HR HB Presidency contained a documented "hardline" current through 1994-95 (including elements of the pre-Zubak leadership) that opposed full Federation integration on the grounds that the Croat constitutive-nation status inside a Federation entity was inferior to a separate Croat political-territorial entity. Prlić Trial Judgment vol. I §§556-590 and §§621-640 document the post-HR HB-proclamation dissatisfaction inside the HR HB Presidency with the Washington-imposed Federation integration. The counterfactual is: this internal hardline current prevails at Dayton, capturing the HR HB delegation position, and HR HB refuses to dissolve.
- **Design provenance:** `design_counterfactual` — no HR HB delegation document at Dayton adopted the hardline-rejection line. The branch is a plausible alternative grounded in documented intra-HR HB opposition to Federation integration (1994-95), specifically the dissatisfaction record reconstructed by Prlić Trial Judgment.
- **Sensitive-history check:** Confirmed — branch authorizes no atrocity, no detention, no cleansing, no civilian targeting. Diplomatic-rejection only. Downstream sensitive-history rows (H5 incidents, H6 detention exposure) are not re-opened by H12 `hardline`; those rings closed by 1994 Federation integration and ICTY tribunal-tracked record. Phase D must verify the `hardline` branch does not propagate any retroactive opening of Ring 1/2 rows; per SENSITIVE_HISTORY_DESIGN_GATE.md §1.5, rupture predicates bind on emergent satisfaction of discrete game-state conditions, not on this counterfactual's branch tag.
- **Cost floor (Phase D required):** `patron_confidence: -25` reflecting Zagreb's documented commitment to Federation framework by 1995 (Tudjman would withdraw HV expeditionary support — H11 — and HV-HVO joint operations posture); `alliance_lock` reflecting Federation framework rupture with RBiH (B10/B13/X5 chain). Cost floor must be authored, not flagged-and-deferred, per Foundational packet "Counterfactual staff path" tier and Game Designer Wave 1 review (parallel to H1 united_front cost floor).

## 4. Material Effects (per packet §3.3)

Per packet §4 H12 row: endgame, dimension shifts, opens `dayton_signed`. Field recommendations for Phase D authoring:

- **`sets_flags`** (NEW, Phase D):
  - `accept`: `hrhb_dayton_acceptance: 'accept'`
  - `hardline`: `hrhb_dayton_acceptance: 'hardline'`
- **`branch_tag`** (NEW, per packet §2.2 vocabulary `hrhb_dayton_acceptance`):
  - `accept` → `hrhb_dayton_accept`
  - `hardline` → `hrhb_dayton_hardline`
- **`effects[]` and `dimension_shifts[]`** (Phase D recommendations):
  - `accept`: `international_standing: +2` (HR HB credit for Federation cooperation at Dayton); `patron_confidence: +1` (Zagreb objective satisfied); `alliance_lock: 0` (Federation already locked by B10/H9); `dimension: endgame_settlement_credit: +1`.
  - `hardline`: `international_standing: -3` (HR HB cited by ICFY as obstructionist); `patron_confidence: -25` (Zagreb withdrawal of HV support; HR HB isolated diplomatically); `alliance_lock: -2` (Federation framework ruptured); `dimension: endgame_settlement_credit: -2`.
- **`enables_events_runtime`** (NEW, Phase D):
  - `accept`: opens `dayton_signed` (subject to R15 RS `accept` and B13 RBiH `accept` — the X9 composite gates on all three); opens Federation-implementation rows (refugee return, joint-institution build-out).
  - `hardline`: opens `csq_dayton_collapsed_hrhb_walkout` (counterfactual consequence row — Phase D author); opens `csq_third_entity_pressure_resumed` (feeds into the H13 third-entity counterfactual track IF H13 is canon-approved per §9 Q1; otherwise leaves the path stub-blocked).
- **`closes_events_runtime`** (NEW, Phase D):
  - `accept`: closes `csq_third_entity_pressure_resumed` (Federation integration ratified at Dayton forecloses the third-entity counterfactual at the diplomatic gate).
  - `hardline`: closes `dayton_signed` (via X9 composite — if any of R15/B13/H12 is `hardline`, the composite cannot resolve to `dayton_signed`).

## 5. Downstream Opens/Closes

- **Opens (eligibility) — `accept`:**
  - `dayton_signed` (via X9 composite; coordinates with R15 + B13)
  - Federation refugee-return rows (Annex 7 implementation)
  - Joint-institution build-out rows (Annex 4 BiH Constitution)
- **Opens (eligibility) — `hardline`:**
  - `csq_dayton_collapsed_hrhb_walkout` (counterfactual consequence row)
  - `csq_third_entity_pressure_resumed` (gated by §9 Q1 H13 canon approval; if H13 stays BLOCKED, this stub closes with it)
- **Closes (eligibility):**
  - `accept` → forecloses third-entity counterfactual track at the diplomatic gate.
  - `hardline` → forecloses Dayton signature through the X9 composite.
- **Branch-tag vocabulary** (additions to `event_families.ts`): `hrhb_dayton_acceptance` family; `hrhb_dayton_accept` / `hrhb_dayton_hardline` tags.

## 6. Modal Source Notes

> "The General Framework Agreement for Peace in BiH (Dayton, initialled 21 Nov 1995; Paris 14 Dec 1995; UN S/1995/999; UNSCR 1031) was accepted by the HR HB delegation through the Federation channel established by the Washington Agreement (1 March 1994). HR HB dissolved as a parallel state into the Federation of BiH per ICTY Prlić IT-04-74 Trial Judgment vol. I §§591-640." (≤2 sentences after compression.)

## 7. Open Questions

1. **Independent HR HB seat vs. Federation channel.** Dayton was institutionally structured with the BiH delegation (Federation + RS) as the BiH-side signatory. HR HB acted through the Federation delegation, not as a sovereign signatory. Phase D must decide whether the H12 row models a Federation-channel posture decision (the historical case) or an independent HR HB seat counterfactual (which Dayton did not provide). Recommend: model Federation-channel posture; `hardline` represents HR HB capturing the Federation delegation position toward rejection, not an independent HR HB walkout. Defer to Game Designer.
2. **Interaction with H13 third-entity counterfactual.** If H13 remains BLOCKED per §9 Q1 of the v1.3 packet, the `csq_third_entity_pressure_resumed` open from H12 `hardline` must be stub-blocked accordingly. If H13 is canon-approved as `design_counterfactual` later, the H12 `hardline` branch becomes the upstream gate that opens H13 visibility. Defer to Product / Canon owners (mirrors §9 Q1 gating).
3. **X9 composite causality semantics.** Packet §4.4 X9 maps Dayton entry as composite of R15 + B13 + H12. If H12 is `hardline`, X9 must resolve to a non-`dayton_signed` outcome — but X9's exact composite logic (all-three-accept-required vs. majority vs. veto-by-RS-only) is not yet authored. Recommend: all-three-accept required; any `hardline` triggers Dayton collapse. Defer to X9 worksheet (Wave 2) and Canon Compliance Reviewer.
4. **Cost floor calibration for `hardline`.** The proposed `patron_confidence: -25` mirrors H1 `united_front`. Phase D must verify that the cost floor is sufficient to prevent `hardline` from becoming a trivially-dominating choice (per Foundational packet R7 precedent: counterfactual cost floor must prevent override from dominating historical default). Defer to Game Designer.
