# Event Family Worksheet — R9: RS Owen-Stoltenberg Engagement

**Family ID:** `rs_owen_stoltenberg`
**Packet row:** v1.3 packet §4.1 R9 (RS families)
**Sensitive ring:** Ring 2 — diplomatic engagement decision
**Source tier:** B (`bb_corroborated`) per v1.3 packet §4.1 R9 row classification ("B"); A (`icty_icj_un`) for the *Karadžić* findings referenced
**Date:** 2026-05-27
**Author lane:** Historian (Phase A research worksheet)
**Status:** Phase A — research only. No JSON, code, or canon edits.

---

## 1. Cited Historical Narrative

The Owen-Stoltenberg Plan (also Invincible Plan, after the HMS Invincible aboard which negotiations were conducted) was tabled in late July 1993 and reworked through August–September 1993 under the joint mediation of David Owen (EC) and Thorvald Stoltenberg (UN). The plan superseded the failed Vance-Owen Peace Plan (rejected by the RS Assembly in May 1993 — see R6 / R7) and proposed a three-republic confederation of Bosnia and Herzegovina: a Bosniak republic, a Serb republic, and a Croat republic, with Sarajevo and Mostar receiving special status. Territorial allocations under the plan gave RS approximately 52% of pre-war BiH territory, HRHB approximately 17%, and RBiH approximately 30% — a configuration that aligned closely with the RS Six Strategic Goals' implied territorial framework (see R1).

The Pale leadership engaged constructively with the Owen-Stoltenberg framework — markedly more so than with VOPP. Karadžić signed the proposal aboard HMS Invincible on 20 September 1993. The Pale Assembly endorsed the framework (with reservations) at its sessions of 28–29 August 1993 and 27–28 September 1993. The plan ultimately collapsed when the Bosnian Assembly (RBiH) rejected it on 29 September 1993, conditional on territorial adjustments that the RS leadership refused (the Neum corridor for RBiH and additional territory along the Sava). The plan's collapse is attributable primarily to RBiH rejection conditional on those adjustments, not to RS rejection — the RS leadership's documented posture was `acknowledge_pressure` and engage.

The *Karadžić* trial chamber records the leadership's calculus in detail (ICTY *Karadžić* IT-95-5/18-T §§4263–4310): Owen-Stoltenberg offered RS a territorial settlement that approximated the Six Strategic Goals' implied map, and the leadership treated this as a major patron-pressure-aligned diplomatic opening. The leadership accepted that the international standing cost of *not* engaging with Owen-Stoltenberg would have triggered a harder UN sanctions regime and an earlier Belgrade rupture (later realized in the August 1994 embargo — see R8); engagement was therefore the path of least resistance for the patron-relations and international-standing portfolios simultaneously.

The plan's text is preserved in UN Document S/26337 (24 August 1993) — Letter dated 24 August 1993 from the Co-Chairmen of the Steering Committee of the International Conference on the Former Yugoslavia, transmitting the Owen-Stoltenberg proposals. UNSC Resolution 859 (24 August 1993) endorsed the framework. The agreement text and supporting maps are reproduced in the ICFY archives.

The counterfactual `resist_patron` posture would have rejected the framework on terms similar to the May 1993 VOPP rejection, treating Owen-Stoltenberg as another Belgrade-Pale wedge. The historical leadership did not take this posture. The counterfactual is plausible because the maximalist faction (Krajišnik, Plavšić, Bosanska Krajina SDS) had argued for it at the August 1993 Assembly sessions; the moderate faction (Karadžić, supported by the Belgrade-channel intermediaries) prevailed.

BB II pp. 248–272 documents the operational context: by late summer 1993 the VRS had consolidated most of the Drina valley (per R3's blocked canonical chain — engine-driven, not a player decision), the Bihać pocket had stabilized, and the Posavina corridor (Goal 2) was secure. The territorial-status quo broadly matched the Owen-Stoltenberg map, making engagement low-cost for the RS leadership in operational terms.

**Citations:**
- ICTY *Karadžić* IT-95-5/18-T (Trial Judgment, 24 March 2016) §§4263–4310 — Owen-Stoltenberg internal calculus.
- UN S/26337 (24 August 1993) — Owen-Stoltenberg proposal text.
- UNSC Resolution 859 (24 August 1993) — endorsement of framework.
- ICFY archives — agreement text, maps, contemporaneous reports.
- ICTY *Krajišnik* IT-00-39-T §§995–1019 — SDS internal-faction dynamics through 1993.
- BB II pp. 248–272 — operational context, late summer 1993.

## 2. Defensible Historical / Default Option

**`historical_default_response_id: "acknowledge_pressure"`** — Historical default.

The Pale leadership engaged constructively with the Owen-Stoltenberg framework. Karadžić signed aboard HMS Invincible on 20 September 1993. The Pale Assembly endorsed the framework with reservations at its August and September 1993 sessions. The plan's collapse is attributable primarily to RBiH rejection, not to RS rejection. The label `Historical default` is defensible under the Foundational packet label taxonomy because the engagement posture matches the actor-specific choice documented by ICTY *Karadžić* §§4263–4310.

## 3. Proposed Counterfactual Options

One counterfactual, `resist_patron`, per the v1.3 packet §4.1 R9 row. The worksheet pins the existing option as canonical.

### 3.1 `resist_patron` — `Counterfactual staff path`

Pale leadership rejects the Owen-Stoltenberg framework outright, treating it as a Belgrade-Pale wedge analogous to VOPP. The leadership refuses to send a delegation to the Invincible discussions, refuses to engage with the September territorial-adjustment counter-proposals, and publicly aligns with the Krajišnik/Plavšić maximalist faction. Design provenance: a plausible alternative path in which the leadership's prior R6 / R7 rejection posture extended into 1993Q3 rather than relaxing. No documented historical path took this form; the option is `Counterfactual staff path`, source tier `design_counterfactual`, NOT `Historical default`.

**Material effects (proposed, per v1.3 packet §4.1 R9 cell "dimension shifts; opens RS partition track"):**
- `international_standing`: −10 to −15 (second Pale rejection in five months hardens international consensus against RS).
- `patron_confidence`: −10 to −15 (Milošević perceives Pale as ungovernable; pulls forward August 1994 embargo conditions).
- `alliance_lock` (with FRY): negative — Belgrade begins distancing earlier than the historical Aug 1994 embargo.
- `internal_cohesion`: +5 to +10 — maximalist faction (Krajišnik, Plavšić, Bosanska Krajina SDS) vindicated.
- `aggression_affinity`: +0.2 — rejection aligns with maximalist posture; consistent with R1 `aggressive` if previously selected.
- `risk_level`: 0.6 — high but not as severe as R1 `aggressive` (0.9) or R7 `override_assembly` (0.7) since R9 is rejection of a single framework, not override of the SDS Assembly mechanism.
- `sets_flags: { rs_owen_stoltenberg: "resist_patron" }`.
- Opens the "RS partition track" per v1.3 packet §4.1 R9 row downstream-opens cell — a downstream consequence/decision chain in which RS commits to unilateral partition rather than confederated settlement. Exact event-id naming and chain scope deferred to Phase D (composite-tag-equivalent posture; see Branch-Tag Vocabulary stub `diplomacy_owen_stoltenberg` composite).

**Composite-tag contribution (per Branch-Tag Vocabulary stub):** The `resist_patron` branch contributes sub-tag `owen_stoltenberg_rejected_by_rs` to the composite `diplomacy_owen_stoltenberg` tag. The corresponding RBiH sub-tag `owen_stoltenberg_rejected_by_rbih_assembly` is authored at B3 (RBiH VOPP / Owen-Stoltenberg worksheet) — the composite resolves at downstream trigger evaluation by reading both faction flags. Note the Branch-Tag Vocabulary stub flags `owen_stoltenberg_implemented` as BLOCKED until Gate §6 sign-off; that sub-tag is irrelevant to R9's authoring lane and is downstream of the multi-faction composite resolution, not of R9 alone.

**Why `resist_patron` is plausible but not historical:** The maximalist faction's posture is documented in *Krajišnik* §§995–1019 and in the Assembly stenographic record of August 1993. A counterfactual in which that faction prevailed is plausible. The historical leadership chose engagement because the Owen-Stoltenberg map approximated the Six Strategic Goals' territorial implications — engagement was low-cost. A counterfactual in which the leadership rejected even this favorable map would carry the dimension-shift costs above without the territorial gain.

## 4. Material Effects (Per §3.3 Of v1.3 Packet)

| Effect | `acknowledge_pressure` (historical) | `resist_patron` (counterfactual) |
| --- | --- | --- |
| `international_standing` | +5 to +10 (engagement rewarded) | −10 to −15 |
| `patron_confidence` | 0 to +5 (Belgrade rewards engagement; embargo pre-conditions softened) | −10 to −15 (embargo pre-conditions accelerated) |
| `alliance_lock` (FRY) | sustained | weakened |
| `internal_cohesion` | 0 to −5 (Krajišnik/Plavšić dissatisfied) | +5 to +10 (maximalist faction vindicated) |
| `aggression_affinity` | 0 (neutral) | +0.2 |
| `risk_level` | 0.2 | 0.6 |

Proposed Phase D / Phase C wiring (informational, not authored here):

| Option | `enables_events_runtime` (targets) | `closes_events_runtime` (targets) |
| --- | --- | --- |
| `acknowledge_pressure` | csq_owen_stoltenberg_rs_engaged (consequence event); R8 `negotiate` softened (the patron-relations capital banked by engagement carries forward); composite `diplomacy_owen_stoltenberg` sub-tag `owen_stoltenberg_rejected_by_rbih_assembly` (the historical collapse is attributable to RBiH rejection, captured at B3) | "RS partition track" gates (sustained-confederation posture maintains the multi-republic framework as the operative endgame template) |
| `resist_patron` | RS partition track (per packet row); accelerated R8 `defiant` pre-conditions (the embargo is pulled forward); composite `diplomacy_owen_stoltenberg` sub-tag `owen_stoltenberg_rejected_by_rs`; csq_belgrade_pale_rupture_accelerated (consequence event; naming deferred to Phase D) | csq_owen_stoltenberg_rs_engaged; the engagement-banked patron-relations capital that softens R8 |

## 5. Sensitive-History Ring And Source Note

**Ring:** Ring 2 — diplomatic engagement decision. R9 has no Ring 1 atrocity dimension and no Ring 3 refused-design dimension. The territorial allocations the framework would have crystallized are downstream of operations already conducted (R3-engine chain) and are not themselves authorized by R9; R9 is a *posture* row, not a territory-grant row.

**Source note for the modal (draft, per §5 of v1.3 packet):**

> Owen-Stoltenberg (Invincible) Plan proposed a three-republic confederation of Bosnia and Herzegovina, tabled July–September 1993. Karadžić signed aboard HMS Invincible on 20 September 1993; the Pale Assembly endorsed the framework with reservations at August and September 1993 sessions. The plan collapsed on RBiH Assembly rejection (29 September 1993) over territorial adjustments. ICTY *Karadžić* IT-95-5/18-T §§4263–4310; UN S/26337; UNSC Resolution 859; BB II pp. 248–272.

**Source tier:** `bb_corroborated` per v1.3 packet §4.1 R9 row classification; `icty_icj_un` for the supporting *Karadžić* findings cited.

## 6. Downstream Opens / Closes (Per §3.3)

See §4 table above. Worksheet-level summary:

- **Opens (via flag `rs_owen_stoltenberg`):** `acknowledge_pressure` opens csq_owen_stoltenberg_rs_engaged and softens R8 `negotiate` (engagement-banked capital). `resist_patron` opens the RS partition track (per packet row), accelerates R8 `defiant` pre-conditions, and triggers an accelerated Belgrade-Pale rupture consequence (naming deferred to Phase D).
- **Closes:** `acknowledge_pressure` closes the partition track's near-term activation gates (the multi-republic confederation framework remains the operative endgame template). `resist_patron` closes csq_owen_stoltenberg_rs_engaged and the engagement-banked patron-relations softening of R8.
- **Composite-tag contribution:** R9 contributes sub-tags to `diplomacy_owen_stoltenberg`: `acknowledge_pressure` → engagement-side input; `resist_patron` → `owen_stoltenberg_rejected_by_rs`. The composite resolves at downstream trigger evaluation by reading the per-faction Owen-Stoltenberg flags together; B3 contributes the RBiH-side input (`owen_stoltenberg_rejected_by_rbih_assembly` is the historical RBiH outcome that produced the plan's collapse).

## 7. Open Questions Deferred To Canon Compliance Review

1. Confirm the source-tier classification. The v1.3 packet §4.1 R9 row lists `B` (BB-corroborated), but the *Karadžić* trial findings cited in §1 are Tier A. Recommend: the row carries Tier B as the dominant tier (the diplomatic narrative is BB-and-UN-document driven), with Tier A citations for the leadership-calculus findings. Defer to Canon Compliance.
2. The "RS partition track" referenced in the packet's downstream-opens cell is named but not scoped. Recommend Phase D scope the partition track as a small chain of 2–3 consequence/decision events covering: (a) unilateral partition declaration, (b) FRY recognition request and refusal, (c) Dayton-precursor sanctions hardening. Defer to Game Designer.
3. The Branch-Tag Vocabulary stub flags `owen_stoltenberg_implemented` as BLOCKED until Gate §6 sign-off. R9 does not author that sub-tag directly (it is a multi-faction composite outcome), but Phase B / Phase D wiring must respect the Gate §6 hold. Defer to Canon Compliance.
4. Whether R9 should additionally close the historical Dayton-precursor track conditionally — i.e., if `resist_patron` is selected *and* R8 `defiant` is selected, does the cumulative path foreclose Dayton more decisively than either event alone? Recommend: yes, the composite (resist + defiant) closes Dayton-precursor more aggressively than either single event; this is a cross-event composite, not an R9-only behavior. Defer to Game Designer for the composite logic in Phase D.
5. Confirm with Canon Compliance that R9 does NOT introduce a new rupture (Gate §2). The `resist_patron` path produces patron-relations and international-standing penalties but no atrocity; remains Ring 2.
