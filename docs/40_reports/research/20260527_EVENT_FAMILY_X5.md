# Event Family Worksheet — X5: Washington Agreement (March 1994)

**Date:** 2026-05-27
**Family ID:** X5
**Faction scope:** cross-faction (composite of B10 RBiH + H9 HRHB; RS not a signatory)
**Source tier:** `agreement_text` (Washington Framework Agreement signed 1 March 1994 in Washington D.C.; Constitutional Agreement of the Federation of Bosnia and Herzegovina signed 18 March 1994 in Washington D.C.; Preliminary Agreement Concerning the Establishment of a Confederation between the Republic of Croatia and the Federation of Bosnia and Herzegovina signed same day) corroborated by `icty_icj_un` (Prlić et al. IT-04-74 Trial Judgment vol. I on the HVO/HRHB acceptance track; ICTY trial record references) and by `balkan_battlegrounds` (BB1 p.532 index entry "peace treaty (Washington Agreement)" at BB1 pp. 227-228; BB2 cross-references on the Federation formation)
**Sensitive-history ring:** none (peace-agreement composite; Croat-Bosniak war atrocity exposure rows H5/H6/H8 stay Ring 1/2 on their own worksheets)
**Status:** Draft for Phase A review. Authored per Game Designer Wave 1 review as two separate per-faction events (RS is not a signatory party) coordinated by runtime causality, not as one composite runtime event.

## 1. Cited Historical Narrative

The Washington Agreement was the two-step diplomatic instrument that ended the Croat-Bosniak war in central Bosnia and created the **Federation of Bosnia and Herzegovina** as a constitutional union of the RBiH government and the HRHB ("Croatian Republic of Herzeg-Bosnia"), with a parallel Preliminary Agreement establishing a confederation framework between the Federation and the Republic of Croatia. The Agreement was the product of intensive US shuttle diplomacy by Charles Redman and Peter Galbraith between Sarajevo, Zagreb, and Mostar in February 1994, against the backdrop of the **5 February 1994 Markale market massacre in Sarajevo** (68 killed) and the resulting NATO ultimatum demanding heavy-weapons withdrawal from the Sarajevo Heavy Weapons Exclusion Zone (HWEZ; per the existing `nato_ultimatum_sarajevo_1994` event row).

**Step 1 — Framework Agreement, 1 March 1994 in Washington D.C.:** Signed by RBiH Prime Minister Haris Silajdžić and HRHB representative Krešimir Zubak (with Croatian Foreign Minister Mate Granić as witness for the confederation framework). Established the political agreement to form a federation, cease all hostilities between ARBiH and HVO, and integrate the two armed forces under a joint command structure over time.

**Step 2 — Constitutional Agreement, 18 March 1994 in Washington D.C.:** Signed by RBiH President Alija Izetbegović, HRHB representative Krešimir Zubak, and Croatian President Franjo Tuđman (witnessing the confederation framework). Established the cantonal constitution of the Federation, with ten cantons distributed by ethnic majority within the Federation's territorial footprint, the Federation Constitutional Court, and the joint Federation Army framework. The Preliminary Agreement on Confederation between Croatia and the Federation was signed by Tuđman and Izetbegović on the same day, 18 March 1994.

The Bosnian Serb leadership (Karadžić, Pale) was not a signatory and was not invited as a negotiating party; the Washington track was explicitly a Federation-formation instrument, not a comprehensive peace settlement. Karadžić IT-95-5/18-T Trial Judgment notes the Bosnian Serb side's reaction as hostile but ineffectual; the RS could not undo the Federation formation, which then conditioned the late-1994 Contact Group Plan (X4) and ultimately Dayton (X9). Prlić et al. IT-04-74 Trial Judgment vol. I §§452-470 covers the HRHB acceptance track, including the Tuđman / Boban / Zubak shift from the Croat-Bosniak war posture (1993) to Federation acceptance under Zagreb pressure (Feb-Mar 1994); the trial record documents Zubak's role as Boban's replacement at the Federation table after Boban was sidelined by Tuđman in early 1994. BB1 p.532 index references the Washington Agreement at BB1 pp. 227-228 in the context of the Croat-Bosniak war chronology and its peace-treaty terminus.

The X5 composite framing is therefore: **RBiH accept (Sarajevo signed both 1 March and 18 March Washington instruments under Silajdžić and Izetbegović); HRHB accept (Zubak signed both, with Zagreb under Tuđman as confederation witness)**. RS is not a party. The composite produces the Federation formation and unlocks the joint Federation military integration chain (B11, H10) plus the late-war Federation offensive coordination (Storm + Mistral coordinating HV-HVO-ARBiH in 1995; H11).

## 2. Defensible Historical/Default Option (Composite Framing)

X5 is a **composite of two per-faction rows** (RS is not a signatory), authored independently per Game Designer Wave 1 review:

- **RBiH (B10) historical default:** `accept`. Citation: Washington Framework Agreement 1 March 1994 + Constitutional Agreement 18 March 1994; signed by Silajdžić and Izetbegović. Foundational packet `20260527_EVENT_FOUNDATIONAL_DECISIONS_PACKET.md` characterizes the RBiH acceptance as historically firm despite "reluctant" framing in the inventory; the worksheet preserves `accept` as the historical default with `reluctant` available as a counterfactual gradient option.
- **HRHB (H9) historical default:** `accept`. Citation: Washington Framework Agreement 1 March 1994 + Constitutional Agreement 18 March 1994; signed by Zubak (Boban replaced under Tuđman pressure). Same `reluctant` gradient available as counterfactual.

- **Combined citation:** Washington Framework Agreement text (1 Mar 1994) + Constitutional Agreement text (18 Mar 1994) + Preliminary Agreement on Confederation (18 Mar 1994); Prlić et al. IT-04-74 Trial Judgment vol. I §§452-470; Karadžić IT-95-5/18-T Trial Judgment vol. I references to Bosnian Serb side reaction; BB1 p.532 index → BB1 pp. 227-228 on the Croat-Bosniak war terminus and the Washington Agreement entry; BB2 references on the Federation formation impact.

## 3. Proposed Counterfactual Options (Composite Branch Flow)

Per Game Designer Wave 1 review, X5 is not authored as one composite runtime event. The two per-faction events (B10 RBiH, H9 HRHB) each author their own option set with `responding_faction` keyed. The composite branch tag is **computed** at downstream trigger evaluation by reading both flags together. This worksheet specifies the composite outcome matrix.

### Composite outcome matrix

| RBiH (B10) | HRHB (H9) | Composite branch | Branch sub-tag |
|---|---|---|---|
| `accept` | `accept` | **Historical**: Federation formed; ARBiH-HVO hostilities cease; joint Federation military integration begins; alliance_lock locks in alliance floor; Contact Group X4 and Dayton X9 tracks pre-positioned. | `washington_agreement_signed` |
| `reluctant` | `accept` | **Counterfactual A**: Same outcome (Federation formed) but RBiH acceptance is rhetorically guarded; modest internal_cohesion damage on RBiH side; alliance_lock floor still set but with weaker `dimension_shifts` upgrade. Historically near — Sarajevo's acceptance posture was internally contested even though the signature held. | `washington_agreement_signed_reluctant_rbih` |
| `accept` | `reluctant` | **Counterfactual B**: Same outcome; HRHB acceptance is patron-pressured rather than embraced; internal_cohesion damage on HRHB side; weaker alliance_lock upgrade. Historically near — Tuđman replaced Boban with Zubak precisely to push acceptance over Boban's reluctance. | `washington_agreement_signed_reluctant_hrhb` |
| `reluctant` | `reluctant` | **Counterfactual C**: Federation forms but as a paper instrument both sides resent; alliance_lock floor at lower value; downstream Federation military integration (B11/H10) and 1995 joint offensives (H11) slower or partial. | `washington_agreement_signed_reluctant_both` |
| `reject` | `accept` | **Counterfactual D**: RBiH rejects the Washington instrument despite Zagreb compliance. Croat-Bosniak war continues into 1994; Contact Group X4 fails to land a Federation side; Dayton X9 reachable only through a different track. **DEFAULT BLOCKED for Phase A** — this branch foregoes the historical 1994 ceasefire and may interact with the 1995 enclave rupture predicates by depriving the Federation of the joint command that historically positioned ARBiH for the 1995 campaigns. Phase D authoring requires Sensitive-History Gate §6 sign-off before wiring `closes_events_runtime` on downstream rows. | `washington_agreement_rbih_rejects` |
| `accept` | `reject` | **Counterfactual E**: HRHB defies Zagreb and rejects despite Tuđman pressure. Croat-Bosniak war continues into 1994 on HRHB choice. **DEFAULT BLOCKED for Phase A** — same rationale as counterfactual D; requires Sensitive-History Gate §6 sign-off. Phase D author must constrain this counterfactual on prior H1 / H7 trajectory (e.g., requires H7 `resist_patron`). | `washington_agreement_hrhb_rejects` |

- **Historical analogy (counterfactuals A and B — reluctant gradients):** Both within the historical envelope. Sarajevo's acceptance was internally contested (Silajdžić more forward-leaning than the Assembly hardliners); Boban's replacement by Zubak documents the HRHB-side reluctance. Per Foundational packet: `reluctant` is a defensible gradient option that produces the same composite outcome with smaller dimension-shift upgrades.
- **Historical analogy (counterfactual C — both reluctant):** Combines both gradients; produces the Federation but with a weaker integration trajectory. Defensible as a counterfactual capturing the documented internal-skepticism on both sides.
- **Historical analogy (counterfactual D — RBiH rejects):** Implausible given the Markale-context pressure on Sarajevo and Silajdžić's commitment. Plausible only if upstream B1 / B3 / B4 trajectory had shifted RBiH toward a unilateral defensive posture incompatible with Federation formation.
- **Historical analogy (counterfactual E — HRHB rejects):** Implausible given Tuđman's commitment under US pressure (Galbraith, Redman). Plausible only if H7 (Zagreb orders ceasefire 1994) has fired with `resist_patron`, which itself is a counterfactual.
- **Design provenance:** All counterfactuals defensible as hypotheses. Historical bot calibration follows `accept` / `accept`. Per packet §3.5, no staff-recommendation option carries `enables_events_runtime` / `closes_events_runtime`.
- **Sensitive-history check:** Counterfactuals A, B, C — confirmed clear of Ring 1/2/3 violations. Counterfactuals D and E — DEFAULT BLOCKED pending Sensitive-History Gate §6 sign-off because their downstream interaction with 1995 enclave rupture predicates (`srebrenica_falls_1995`, `srebrenica_genocide_1995`) requires explicit Game Designer + Historian + user review per packet §3.6 (rupture predicates bind on emergent satisfaction, not on calendar; counterfactual closure must not author rupture or its absence by player choice).

## 4. Material Effects (per packet §3.3)

Effects flow through two separate decision rows (B10, H9). X5 itself does not author effects directly. The composite branch tag (read from both per-faction flags) is the discriminator for downstream gating.

### Per-faction row effects (authored independently in Phase D)

- **B10 `accept` (historical):**
  - `sets_flags`: `rbih_washington_response: 'accept'`
  - `dimension_shifts`: `international_standing: +2` (Federation formation under US auspices), `alliance_lock: +2` on RBiH-HRHB (floor set to alliance-positive — historically firm post-March 1994), `internal_cohesion: -1` (Assembly hardline faction objects), `diplomatic_capital: +1`
  - `effects[]`: `alliance_lock_set` (positive floor, alliance value with HRHB) — uses the existing `alliance_locks` substrate in `state.military` per packet §1 baseline.
  - `enables_events_runtime`: `washington_agreement_1994` (existing event id in `war_1994.json`); `federation_military_integration_1994` (pending — B11 worksheet); `contact_group_plan_1994` (existing id; X4 follow-on opens via historical X5 composite); `nato_ultimatum_sarajevo_1994` follow-on response window already opens via existing engine path — listed here for cross-reference.
  - `closes_events_runtime`: `croat_bosniak_war_continues_1994` (pending — would-be counterfactual row, only authored if counterfactuals D or E are unblocked).

- **B10 `reluctant` (counterfactual gradient):**
  - `sets_flags`: `rbih_washington_response: 'reluctant'`
  - `dimension_shifts`: `international_standing: +1`, `alliance_lock: +1` on RBiH-HRHB (lower floor than historical), `internal_cohesion: -2` (deeper internal split because acceptance is grudging)
  - `enables_events_runtime`: same `washington_agreement_1994` opens (Federation still forms); downstream B11 integration opens but with weaker chain (Phase D wiring decision: same opens, smaller `dimension_shifts` deltas).
  - `closes_events_runtime`: same as `accept`.

- **H9 `accept` (historical):**
  - `sets_flags`: `hrhb_washington_response: 'accept'`
  - `dimension_shifts`: `international_standing: +1`, `patron_pressure: -2` (Zagreb-Tuđman compliance rewarded), `alliance_lock: +2` on RBiH-HRHB (mirrors B10), `internal_cohesion: -1` on HRHB (Boban-faction sidelined)
  - `effects[]`: `alliance_lock_set` (positive floor, alliance value with RBiH) — symmetrical to B10.
  - `enables_events_runtime`: `washington_agreement_1994` (existing id); `federation_military_integration_1994` (pending — H10 worksheet); `contact_group_plan_1994` (existing id); H11 HV expeditionary support (pending — opens late-war HV-HVO-ARBiH coordination).
  - `closes_events_runtime`: `croat_bosniak_war_continues_1994` (pending counterfactual; only authored if counterfactuals D or E unblocked).

- **H9 `reluctant` (counterfactual gradient):**
  - `sets_flags`: `hrhb_washington_response: 'reluctant'`
  - `dimension_shifts`: `international_standing: 0`, `patron_pressure: -1` (compliance less rewarded), `alliance_lock: +1` on RBiH-HRHB (lower floor), `internal_cohesion: -2` (Boban-faction grievance louder)
  - `enables_events_runtime`: same opens as `accept`; smaller deltas.
  - `closes_events_runtime`: same as `accept`.

### Composite alliance_lock interaction

When `rbih_washington_response: 'accept'` AND `hrhb_washington_response: 'accept'` (historical row), the composite tag `washington_agreement_signed` is the discriminator for downstream Federation military integration (B11, H10), HV expeditionary support (H11), Contact Group acceptance (X4-RBiH + X4-HRHB), and Dayton X9 entry. Downstream events gate on the composite via `trigger.condition` reading both per-faction flags (multi-flag AND predicate, per X2/X3/X4 Open Question 2 — pending Technical Architect confirmation).

Reluctant gradients (A/B/C) produce the same composite tag for trigger purposes but with smaller `dimension_shifts` deltas; downstream events that read `alliance_lock` value (not just presence) will see weaker integration. Phase D wiring decision: whether to keep one composite tag with magnitude variation, or to author distinct sub-tags `washington_agreement_signed_full` vs. `washington_agreement_signed_reluctant`. Recommend single tag with magnitude variation in `alliance_lock` to keep the downstream `flag_equals` predicate simple.

## 5. Downstream Opens/Closes

- **Opens (eligibility):**
  - `washington_agreement_1994` (existing event id in `war_1994.json`; X5 composite is the analytical row pointing at it, not a duplicate event)
  - `contact_group_plan_1994` (existing id; X4 historical composite opens via X5 composite acceptance)
  - `federation_military_integration_1994` (pending — B11 / H10 worksheets)
  - HV expeditionary support / late-war Federation offensive readiness (pending — H11 worksheet)
  - Dayton entry conditions / `dayton_signed` (X9 — Federation formation is a Dayton precondition)
- **Closes (eligibility):**
  - Historical composite: forecloses the Croat-Bosniak war continuation chain (pending counterfactual row).
  - Counterfactuals D and E (BLOCKED) would foreclose Federation-track downstream rows; defer authoring to Sensitive-History Gate §6 sign-off.
- **Branch-tag:** `diplomacy_washington` (per packet §2.2 vocabulary slot). The composite resolution produces sub-tags `washington_agreement_signed` (historical), `washington_agreement_signed_reluctant_rbih` (A), `washington_agreement_signed_reluctant_hrhb` (B), `washington_agreement_signed_reluctant_both` (C), `washington_agreement_rbih_rejects` (D — BLOCKED), `washington_agreement_hrhb_rejects` (E — BLOCKED).

## 6. Modal Source Notes

> "The Washington Agreement (Framework 1 March 1994 + Constitutional Agreement 18 March 1994, both signed in Washington D.C.) created the Federation of Bosnia and Herzegovina as a constitutional union of RBiH and HRHB, ending the Croat-Bosniak war in central Bosnia and establishing a confederation framework with the Republic of Croatia (Preliminary Agreement, 18 March 1994). Silajdžić and Izetbegović signed for RBiH; Zubak signed for HRHB after Tuđman replaced Boban under US pressure (Prlić et al. IT-04-74 vol. I §§452-470; BB1 pp. 227-228; BB1 p.532 index)." (Compressed to ≤2 sentences for modal display; expanded here for review.)

## 7. Open Questions

1. **Authoring shape: composite event vs. two separate events.** Resolved per Game Designer Wave 1 review: two separate per-faction events (B10 RBiH, H9 HRHB), each authored independently with `responding_faction` set and faction-specific signature dates (1 March / 18 March 1994). Composite is an analytical row, not a runtime row. RS is not a signatory and is not authored as part of X5.
2. **Reluctant gradient: composite tag granularity.** Whether reluctant gradients (A/B/C) produce distinct composite sub-tags or share one tag with smaller dimension-shift magnitudes. Recommend single tag with magnitude variation in `alliance_lock` value; defer Phase D wiring decision to Game Designer + Technical Architect.
3. **Sensitive-history sign-off for counterfactuals D and E.** RBiH-rejects (D) and HRHB-rejects (E) branches interact with 1995 enclave rupture predicates by depriving the Federation of the joint command that historically pre-positioned ARBiH for the 1995 campaigns. Phase D authoring requires Sensitive-History Gate §6 sign-off (Game Designer + Historian + user). Default authoring posture is conservative: omit counterfactuals D and E until reviewed.
4. **Interaction with existing `washington_agreement_1994` event.** The catalog already contains `washington_agreement_1994` in `war_1994.json`. X5 worksheet treats the existing event as the runtime instrument and the composite (B10 + H9) as the analytical framing. Phase D must decide: (a) repurpose the existing event into the B10/H9 two-row split, or (b) keep `washington_agreement_1994` as a singleton firing-event and use B10/H9 as the upstream decision rows that set the flags the existing event reads. Recommend (b) — existing event stays the firing-anchor, B10 and H9 are the upstream decisions whose composite flag-state triggers the existing event. Defer to Technical Architect.
5. **Confederation framework with Croatia.** The 18 March 1994 Preliminary Agreement on Confederation between Croatia and the Federation is signed by Tuđman and Izetbegović. Phase D may need to author a separate `confederation_with_croatia_1994` event or fold it into H9's downstream chain. Recommend folding into H9's `enables_events_runtime` chain to preserve the two-row authoring shape and avoid a third Federation-side row. Defer to Game Designer. **Decision: fold into H9 chain via `enables_events_runtime` on H9 `accept`. Do not author a separate `confederation_with_croatia_1994` row.** The Preliminary Agreement was a same-day Tudjman-Izetbegović instrument structurally inseparable from the Washington framework; a separate row would author no new decision and clutter the 51-row inventory. Per Game Designer Wave 2 review.
6. **Markale → NATO ultimatum precondition.** The Washington track was conditioned in part by the 5 Feb 1994 Markale massacre and the subsequent NATO ultimatum (existing `nato_ultimatum_sarajevo_1994` event). Phase D should confirm whether X5 / B10 / H9 require `nato_ultimatum_sarajevo_1994` as an upstream precondition via `requires_enabled`, or whether the Washington track stays independently triggered. Recommend independent triggering: the Markale context is narrative pressure, not a hard runtime prerequisite. Defer to Game Designer.
