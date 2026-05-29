# Event Family Worksheet — B13: RBiH Dayton Acceptance (1995)

**Date:** 2026-05-27
**Family ID:** B13
**Faction scope:** RBiH (responding faction; coordinates with H12 HRHB and R15 RS into the X9 Dayton entry composite)
**Source tier:** `agreement_text` (General Framework Agreement for Peace in Bosnia and Herzegovina — Dayton Accords, initialled Dayton 21 Nov 1995, signed Paris 14 Dec 1995; Annexes 1A–11) corroborated by `balkan_battlegrounds` (BB II close-out chapters) and `icty_icj_un` (UN S/1995/999 transmission; UNSCR 1031 endorsement 15 Dec 1995)
**Sensitive-history ring:** None for the acceptance decision. Downstream refugee-return / IEBL / Annex 7 implementation rows are non-sensitive at the decision-row level; eastern-enclave settlement-context rows remain consequence-only per `SENSITIVE_HISTORY_DESIGN_GATE.md`.
**Status:** Draft for Phase A review.
**Existing catalog row reference:** No standalone `rbih_dayton_acceptance` JSON row authored today; `dayton_signed` and adjacent consequence rows already exist. Phase D will author the B13 row.

---

## 1. Cited Historical Narrative

The General Framework Agreement for Peace in Bosnia and Herzegovina (GFAP, "Dayton Accords") was negotiated 1–21 November 1995 at Wright-Patterson Air Force Base, Dayton, Ohio, under Richard Holbrooke's US delegation. The agreement was initialled 21 November 1995 in Dayton and signed in Paris on 14 December 1995. The text and its eleven annexes were transmitted to the UN Security Council by UN S/1995/999 (29 November 1995) and endorsed by UNSCR 1031 (15 December 1995). The RBiH delegation, led by President Alija Izetbegović with Foreign Minister Muhamed Šaćirbey and Prime Minister Haris Silajdžić, signed on behalf of the Republic of Bosnia and Herzegovina.

### RBiH-side context entering Dayton

By autumn 1995, the RBiH delegation's institutional and operational position was constrained by a sequence of mid-1995 events:

- **Srebrenica fell to VRS forces on 11 July 1995**, followed by the documented genocide (Krstić Trial Judgment IT-98-33-T 2 August 2001, upheld on appeal IT-98-33-A 19 April 2004 §§ on the genocidal intent finding; Karadžić IT-95-5/18-T Trial Judgment §§ on the Srebrenica events; ICJ *Bosnia and Herzegovina v. Serbia and Montenegro* judgment 26 February 2007 §§278-297 affirming the genocide finding).
- **Žepa fell to VRS on 25 July 1995.**
- **Goražde survived under NATO Deny Flight / IFOR escort arrangements** but remained encircled.
- **Operations Storm (4-7 August 1995) and Mistral 2 / Sana (8-15 September 1995)** by HV-HVO-ARBiH coalition forces reset the western and central-Bosnia battlefield in favor of the Federation; VRS lost Krajina and significant western RS territory.
- **Holbrooke / Contact Group "51:49 halt" of October 1995** (X8) bound the Federation offensive to the agreed Contact Group territorial framework, blocking continued advance toward Banja Luka.
- **NATO Operation Deliberate Force (30 August – 20 September 1995)** broke the VRS strategic position around Sarajevo.

These conditions framed the RBiH delegation's negotiating position as: (i) acceptance of the 51/49 territorial split as institutionally pre-committed by Contact Group; (ii) the Federation entity as the durable RBiH-side structure inside BiH; (iii) RS as the second constitutive entity, with the IEBL (Inter-Entity Boundary Line) ratifying battlefield outcomes including the eastern enclave losses; (iv) Annex 7 refugee-return commitments as the partial compensation for territorial losses.

### Internal RBiH debate

The RBiH Assembly through 1994-95 had documented currents skeptical of any settlement that ratified RS territorial gains or accepted the eastern-enclave losses as final. The Owen-Stoltenberg precedent (B4) — Presidency narrowly accepted 20 September 1993 Geneva; Assembly rejected outright 29 September 1993 — established that the Assembly was capable of overriding Presidency-level diplomatic acts. By Dayton, however, the post-Srebrenica strategic position and the Holbrooke-mediated 51:49 framework reduced the practical alternative to acceptance. Silajdžić's documented public skepticism of the agreement (he later resigned as Prime Minister in early 1996 partially over Dayton's permanent partition logic) reflects the internal current that would have driven a counterfactual `hardline` posture.

### The acceptance act

The Dayton signature is the canonical RBiH acceptance event. Izetbegović signed both as President of the Republic and (per the Federation channel) on behalf of the Federation of BiH. The signature ratified:

- **Annex 4** — BiH Constitution (RBiH legal continuity preserved; Federation + RS as constitutive entities).
- **Annex 1A** — military aspects (IEBL, withdrawal lines, IFOR deployment).
- **Annex 1B** — regional stabilization.
- **Annex 5** — arbitration.
- **Annex 7** — refugees and displaced persons (right of return).
- **Annex 11** — international police task force.

UNSCR 1031 (15 December 1995) endorsed the agreement, authorized IFOR (NATO-led), and terminated UNPROFOR's mandate.

The acceptance was, in Izetbegović's documented public framing, *under duress* — the alternative to acceptance was continued war without realistic prospect of recovering eastern enclaves or pushing further than the 51:49 framework permitted. UN S/1995/999 and the subsequent UNSCR 1031 record the acceptance as Tier-A documented historical fact.

## 2. Defensible Historical/Default Option

- **Label:** `accept` — RBiH delegation signs the General Framework Agreement and its annexes on 14 December 1995 in Paris, ratifying the Federation/RS dual-entity arrangement, the IEBL including eastern-enclave territorial outcomes, and Annex 7 refugee-return commitments.
- **Rationale:** This is the documented historical action of the RBiH delegation in November/December 1995 under post-Srebrenica strategic conditions and post-Contact-Group institutional constraints. The decision was institutionally pre-committed by the Contact Group 51:49 framework (1994 X4) and operationally constrained by the Holbrooke October 1995 halt (X8). Tier A sources.
- **Citation:** General Framework Agreement for Peace in Bosnia and Herzegovina, initialled 21 Nov 1995 Dayton, signed 14 Dec 1995 Paris; UN S/1995/999 (29 Nov 1995) transmission; UNSCR 1031 (15 Dec 1995) endorsement; Contact Group Plan July 1994 (predicate via X4); Holbrooke 51:49 halt October 1995 (predicate via X8); BB II close-out chapters on the late-1995 settlement environment; Krstić IT-98-33-T (2 Aug 2001) and ICJ *Bosnia v. Serbia* (26 Feb 2007) for Srebrenica context entering Dayton.

## 3. Proposed Counterfactual Options

### Option: `hardline`

- **Label:** `hardline` — RBiH delegation rejects Dayton on the grounds that the IEBL ratifies the eastern-enclave losses and that the dual-entity arrangement entrenches the partition logic of ethnic-cleansing-driven territorial outcomes; delegation walks the Paris signature.
- **Historical analogy:** The RBiH Assembly's 29 September 1993 outright rejection of Owen-Stoltenberg (B4 historical default `reject_via_assembly`) is the institutional precedent — the Assembly was capable of overriding Presidency diplomatic acts on the grounds that externally imposed partition frameworks ratified ethnic-cleansing-driven outcomes. Silajdžić's documented post-Dayton resignation as Prime Minister (early 1996) and his later political positioning against Dayton's partition logic are the participant-record analogue. The counterfactual is: this Assembly + Silajdžić current prevails at Dayton, and RBiH refuses signature.
- **Design provenance:** `design_counterfactual` — no RBiH delegation document at Dayton adopted the outright-rejection line. The branch is a plausible alternative grounded in the documented Owen-Stoltenberg-precedent Assembly posture and the participant-record skepticism (Silajdžić). Per Foundational packet "Counterfactual staff path" tier.
- **Sensitive-history check:** Confirmed — branch authorizes no atrocity, no detention, no cleansing, no civilian targeting. Diplomatic-rejection only. The branch *forecloses* Annex 7 refugee-return commitments and the IFOR deployment, which has humanitarian costs (no ICTY-tracked atrocity Ring 1/2 row is reopened or rewarded; the rupture predicates for Srebrenica/Žepa/Goražde are upstream of Dayton and not affected by this Dayton-window decision). Phase D must verify that no Ring 1/2 row becomes player-rewarded by `hardline`; per SENSITIVE_HISTORY_DESIGN_GATE.md §1.5, rupture predicates bind on emergent satisfaction of discrete game-state conditions, not on this counterfactual's branch tag.
- **Cost floor (Phase D required):** `patron_confidence: -30` reflecting US/Holbrooke documented diplomatic investment in Dayton (rejection would deeply damage RBiH-US relations); `international_standing: -3` (RBiH cited by ICFY as obstructionist to the only remaining diplomatic instrument); `endgame_settlement_credit: -3`. Phase D must specify alliance_lock impact on RBiH-HRHB Federation; the Federation framework was independent of Dayton acceptance (Washington Agreement 1 March 1994 stood independently), so `hardline` should not auto-collapse the Federation but may strain it. Cost floor must be authored, not flagged-and-deferred, per Foundational packet R7 precedent and Game Designer Wave 1 review.

## 4. Material Effects (per packet §3.3)

Per packet §4.2 B13 row: endgame, dimension shifts, opens `dayton_signed`. Field recommendations for Phase D authoring:

- **`sets_flags`** (NEW, Phase D):
  - `accept`: `rbih_dayton_acceptance: 'accept'`
  - `hardline`: `rbih_dayton_acceptance: 'hardline'`
- **`branch_tag`** (NEW, per packet §2.2 vocabulary `rbih_dayton_acceptance`):
  - `accept` → `rbih_dayton_accept`
  - `hardline` → `rbih_dayton_hardline`
- **`effects[]` and `dimension_shifts[]`** (Phase D recommendations):
  - `accept`: `international_standing: +3` (RBiH credit for accepting under duress; Tier-A US/EU recognition); `patron_confidence: +2` (US/Holbrooke investment ratified); `dimension: endgame_settlement_credit: +2`; `dimension: refugee_return_framework: +1` (Annex 7 commitments active); `internal_cohesion: -1` (Assembly + Silajdžić current dissatisfied with partition logic; abstracts the documented post-Dayton political strain).
  - `hardline`: `international_standing: -3`; `patron_confidence: -30`; `dimension: endgame_settlement_credit: -3`; `dimension: refugee_return_framework: -2` (Annex 7 foreclosed); `internal_cohesion: +1` (Assembly + Silajdžić current ratified; modest cohesion gain offsetting nothing of the diplomatic damage).
- **`enables_events_runtime`** (NEW, Phase D):
  - `accept`: opens `dayton_signed` (subject to R15 RS `accept` and H12 HRHB `accept` — the X9 composite gates on all three); opens Annex 7 refugee-return rows; opens IFOR deployment rows; opens BiH Constitution Annex 4 implementation rows.
  - `hardline`: opens `csq_dayton_collapsed_rbih_walkout` (counterfactual consequence row — Phase D author); opens `csq_war_continues_post_dayton` (counterfactual consequence row — Phase D author); does NOT open any Ring 1/2 retroactive row.
- **`closes_events_runtime`** (NEW, Phase D):
  - `accept`: closes `csq_unilateral_continuation` (counterfactual no-Dayton paths foreclosed); closes `csq_us_disengagement_1996` (US engagement ratified).
  - `hardline`: closes `dayton_signed` (via X9 composite — if any of R15/B13/H12 is `hardline`, the composite cannot resolve to `dayton_signed`); closes `annex_7_refugee_return_implementation` (Annex 7 foreclosed by non-signature).

## 5. Downstream Opens/Closes

- **Opens (eligibility) — `accept`:**
  - `dayton_signed` (via X9 composite; coordinates with R15 + H12)
  - Annex 7 refugee-return rows
  - Annex 4 BiH Constitution implementation rows
  - IFOR deployment + UNPROFOR termination rows
- **Opens (eligibility) — `hardline`:**
  - `csq_dayton_collapsed_rbih_walkout` (counterfactual consequence row)
  - `csq_war_continues_post_dayton` (counterfactual consequence row)
- **Closes (eligibility):**
  - `accept` → forecloses counterfactual no-Dayton continuation paths.
  - `hardline` → forecloses Dayton signature through the X9 composite; forecloses Annex 7 refugee-return implementation; forecloses IFOR-mediated international stabilization.
- **Branch-tag vocabulary** (additions to `event_families.ts`): `rbih_dayton_acceptance` family; `rbih_dayton_accept` / `rbih_dayton_hardline` tags.

## 6. Modal Source Notes

> "The General Framework Agreement for Peace in BiH (Dayton, initialled 21 Nov 1995; Paris 14 Dec 1995; UN S/1995/999; UNSCR 1031) was accepted by the RBiH delegation under post-Srebrenica strategic conditions and post-Contact-Group 51:49 framework constraints. Annex 4 (Constitution) preserved RBiH legal continuity; Annex 7 (refugee return) was the partial compensation for the IEBL ratification of eastern-enclave losses (Krstić IT-98-33-T; ICJ *Bosnia v. Serbia* 2007)." (≤2 sentences after compression.)

## 7. Open Questions

1. **Federation framework independence from Dayton.** The Washington Agreement (1 March 1994) established the RBiH-HRHB Federation independently of Dayton. Phase D must specify whether `hardline` strains, ruptures, or leaves intact the Federation framework. Recommend: strains but does not auto-rupture (Federation framework predates Dayton; the alliance_lock floor authored at B10/H9 holds). Defer to Game Designer.
2. **X9 composite causality semantics.** Same open question as H12 worksheet — packet §4.4 X9 maps Dayton entry as composite of R15 + B13 + H12. If B13 is `hardline`, X9 must resolve to a non-`dayton_signed` outcome. Recommend: all-three-accept required; any `hardline` triggers Dayton collapse. Defer to X9 worksheet (Wave 2) and Canon Compliance Reviewer.
3. **Cost floor calibration for `hardline`.** The proposed `patron_confidence: -30` reflects the deep US/Holbrooke diplomatic investment in Dayton (deeper than the H12 `hardline` -25 because Holbrooke's strategy hinged on RBiH acceptance). Phase D must verify cost floor sufficiency per Foundational packet R7 precedent. Defer to Game Designer.
4. **Internal cohesion mechanic for the Assembly-Presidency split.** The historical `accept` was institutionally complicated by the Assembly + Silajdžić current's documented skepticism (parallel to the Owen-Stoltenberg Presidency-Assembly split at B4). Phase D must decide whether to author the split as `internal_cohesion: -1` on `accept` (current proposal) or as a downstream two-step event chain (Presidency signs; Assembly debates; Silajdžić resigns). Recommend single-event abstraction with internal_cohesion shift; full sequence is post-Dayton domestic politics outside the Dayton-window decision row. Defer to Game Designer + Narrative Designer.
5. **Annex 7 refugee-return mechanical surface.** The `accept` opens Annex 7 refugee-return rows; the Annex 7 implementation in historical fact was substantially incomplete through the late-1990s and 2000s. Phase D must decide whether the AWWV endgame implements Annex 7 outcomes (with realistic completion-rate caps reflecting the historical record) or treats Annex 7 as an abstract `refugee_return_framework: +1` dimension shift. Recommend abstract dimension shift; full Annex 7 implementation modelling is out of scope for the foundational decision row. Defer to Scenario Creator + Game Designer.
