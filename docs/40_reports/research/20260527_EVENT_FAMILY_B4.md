# Event Family Worksheet — B4: RBiH Owen-Stoltenberg Posture (1993)

**Date:** 2026-05-27
**Status:** Phase A research worksheet (docs-only). Not a JSON authoring slice. Not a runtime change.
**Family ID:** `rbih_owen_stoltenberg_response` (matches §4.2 row B4 of `docs/40_reports/proposals/20260527_EVENT_DATABASE_RUNTIME_SEMANTICS_PACKET.md`).
**Source tier (per §5 / Source Standards):** Tier A required — `agreement_text` (Union of Three Republics / HMS *Invincible* package) plus `icty_icj_un` / UN-record corroboration.
**Sensitive ring:** None at the option level. Counterfactual `accept_sincerely` would interact with the Drina-enclaves treaty-cession scenario already flagged in X3 §3 sensitive-history check; B4 itself does not author atrocity.
**Existing catalog row:** referenced by X3 composite; per-faction row currently un-authored in `data/scenarios/events/war_1993.json` (see §8 Open Question 1).

---

## 1. Historical Narrative

The Owen-Stoltenberg Plan ("Constitutional Agreement of the Union of Republics of Bosnia and Herzegovina", also called the *Invincible* package after the HMS *Invincible* shipboard negotiation site) was tabled by the ICFY Co-Chairmen David Owen (EC) and Thorvald Stoltenberg (UN, who had succeeded Cyrus Vance in May 1993) over the summer of 1993, replacing the VOPP ten-province framework with three loosely-federated ethnic republics within a "Union of Republics". The package thus accepted the partition logic the Bosnian Serb leadership had pushed against VOPP. The agreement text and ICFY transmission are captured in **UN S/26486 (23 September 1993)**.

For RBiH the Owen-Stoltenberg decision was not a single vote but a **two-step sequence**:

- **20 September 1993, Geneva:** the RBiH Presidency under Izetbegović narrowly **accepted** the Invincible package, conditional on territorial concessions in eastern Bosnia (Drina enclaves — Srebrenica, Žepa, Goražde — and the Posavina corridor). Documented in UN S/26486.
- **29 September 1993, Sarajevo:** the RBiH Assembly **rejected** the package outright, citing the unrecoverable Drina enclaves and the Posavina corridor cession as unacceptable. The Assembly rejection withdrew the second of three required signatures and collapsed the plan. Documented in the ICFY Steering Committee Report **UN S/26922 (21 December 1993)** and narrated in *Prosecutor v. Karadžić* IT-95-5/18-T Trial Judgement vol. III §§4263-4310 (esp. §§4280-4310 on the September 1993 outcomes).

The historical posture for RBiH on Owen-Stoltenberg is therefore the Assembly-led rejection of a Presidency-conditional acceptance. This is the documented joint outcome that fed the diplomatic-track pivot to the EU Action Plan (November 1993), the Washington Agreement (March 1994, B10/X5), and the Contact Group Plan (July 1994, X4).

**Historical outcome (RBiH):** `reject_via_assembly` — Presidency-narrow-accept-then-Assembly-reject sequence.

---

## 2. Defensible Historical Default

**Label:** `Historical default` (per Foundational packet §"Approved Label Taxonomy").
**Option id (proposed):** `reject_via_assembly`.
**Defensibility:** Tier A. Agreement text (UN S/26486), UN-record corroboration (UN S/26922), ICTY narrative cross-reference (Karadžić TJ vol. III §§4263-4310). The 29 September 1993 Assembly vote is the canonical evidentiary anchor.

`Blocked` does not apply at the historical-default level.

Per Historian Wave 1 X3 review: the must-fix correction replaced the prior `accept_for_optics` default with `reject_via_assembly`. This worksheet treats that correction as binding.

---

## 3. Counterfactual Options

Two counterfactual options, both `design_counterfactual` at the option-design level. Each has a documented historical current to draw on; neither authorizes any sensitive act.

| Option id | Label | Provenance | Tier |
| --- | --- | --- | --- |
| `accept_for_optics` | Presidency wins Assembly ratification — sign for diplomatic credit while planning to reverse later | Historically near. The 29 September 1993 Assembly vote was contested; a different parliamentary majority could have ratified what the Presidency had accepted on 20 September. This counterfactual treats the ratification as the optics-driven choice, with no sincere intent to cede the Drina enclaves. **DEFAULT BLOCKED per X3 §3 sensitive-history check** — treaty-ceded Drina enclaves interact with the `srebrenica_genocide_1995` rupture predicate; Phase D authoring requires Sensitive-History Gate §6 sign-off (Game Designer + Historian + user). | C (design counterfactual with Tier A analogy) |
| `accept_sincerely` | Presidency wins Assembly ratification — accept the Union framework as the genuine endpoint | Historical analogy is thinner: the documented Sarajevo public stance through 1993 framed the civic-Republic platform as non-negotiable; sincere acceptance of partition is internally counterfactual. Same Drina-enclaves interaction as `accept_for_optics`; **same Sensitive-History Gate §6 sign-off required**. | C |

Both counterfactual options abstract the Presidency-Assembly relationship into a single response. Phase D may instead decompose B4 into a two-step event chain (§8 Open Question 2).

### 3.1 Cost-floor (Phase D required)

Both counterfactuals must carry a Phase D cost floor reflecting the historical Sarajevo posture's resistance to the partition framework. Recommended starting calibrations (final values gated by Phase D scenario testing):

- `accept_for_optics`: `internal_cohesion: -10` (Presidency/Assembly procedural rupture amplified by knowingly insincere signature), `negotiating_leverage: -5` (ICFY Co-Chairmen read the optics gambit as bad faith).
- `accept_sincerely`: `recruitment_modifier(RBiH): 0.85x` (avowed partition acceptance damages the civic-state platform that underpins ARBiH multi-ethnic recruitment), `internal_cohesion: -5` (Bosniak hawks repudiate).

These cost floors are advisory; the structural cost — closing Washington X5 and Contact Group X4 reachability — is more decisive than the dimension shifts. See §5.

---

## 4. Material Effects (per §3.3 of the Runtime Semantics Packet)

B4 is currently un-authored at the per-faction row level. This worksheet inventories the proposed Phase D shape.

### 4.1 Proposed Phase D authoring

| Option | `effects[]` (proposed) | `sets_flags` (proposed) | `dimension_shifts` (proposed) | `future_consequences[]` (proposed) |
| --- | --- | --- | --- | --- |
| `reject_via_assembly` | `negotiation_capital(RBiH, international_credibility, -2)` | `rbih_owen_stoltenberg_response: 'reject_via_assembly'` | int'l standing -1, internal cohesion -1, negotiating leverage -1, diplomatic capital -1 | opens Washington track visibility (B10/X5) and EU Action Plan; closes nothing |
| `accept_for_optics` | (Phase D-gated; do not author until Sensitive-History Gate §6 sign-off) | `rbih_owen_stoltenberg_response: 'accept_for_optics'` | per §3.1 cost floor | forecloses Washington X5 + Contact Group X4 (partition framework already in implementation); opens Drina-cession follow-on chain |
| `accept_sincerely` | (Phase D-gated; same gate) | `rbih_owen_stoltenberg_response: 'accept_sincerely'` | per §3.1 cost floor | same closures as `accept_for_optics`; opens csq_minority_defections_1993 (sincere partition repudiates civic platform) |

### 4.2 Branch substrate

- `branch_tag` per `event_families.ts` vocabulary stub: `owen_stoltenberg_rejected_by_rbih_assembly` (composite via X3 §3 matrix) is the X3-level tag; the B4 row's primitive flag substrate is `rbih_owen_stoltenberg_response` valued by the option id.

---

## 5. Runtime Causality Targets (per §3.3)

This worksheet *proposes* the following Phase D wiring; it does not author it.

| Option | Proposed `enables_events_runtime[]` | Proposed `closes_events_runtime[]` | Branch flag substrate |
| --- | --- | --- | --- |
| `reject_via_assembly` | `washington_agreement_engagement_1994` (B10/X5), `eu_action_plan_1993` (consequences family) | (none) | `event_flags.rbih_owen_stoltenberg_response = 'reject_via_assembly'` |
| `accept_for_optics` | Drina-cession follow-on chain (Phase D-gated; depends on Sensitive-History Gate §6 sign-off) | `washington_agreement_engagement_1994`, `contact_group_plan_1994` | `event_flags.rbih_owen_stoltenberg_response = 'accept_for_optics'` |
| `accept_sincerely` | `csq_minority_defections_1993` + Drina-cession follow-on chain (Phase D-gated) | `washington_agreement_engagement_1994`, `contact_group_plan_1994` | `event_flags.rbih_owen_stoltenberg_response = 'accept_sincerely'` |

Phase D author must verify each downstream row's `trigger.condition` uses `flag_equals` against `rbih_owen_stoltenberg_response` per §3.3 alignment rule.

---

## 6. Sensitive-History Ring (per Gate §1)

- **Option-level ring:** None for `reject_via_assembly`. Both `accept_*` counterfactuals are Ring-2 adjacent because of their interaction with the Drina enclaves and the downstream `srebrenica_genocide_1995` rupture predicate (Gate §1 Ring 3 #10, Gate §6 row "Change to rupture trigger"). Paper cession of Drina enclaves under a peace agreement is not equivalent to authoring fall-by-force; the counterfactual transfer would in principle be under ICFY supervision with population-protection arrangements. Even so, Phase D authoring is gated.
- **Atrocity-authorization surface:** Not engaged. B4 does not place an atrocity decision in front of the player.
- **Counterfactual-register narration (Gate §5):** If `accept_*` is ever authored, narration must be historical-voice recording (not celebratory or minimizing) of an ahistorical diplomatic move.
- **Rupture-foreclosure caution:** Per X3 §3 sensitive-history check, if the branch transfers Srebrenica to RS by treaty in Sep-Oct 1993 such that the enclave is never "formed" in the rupture sense, the rupture is unreachable through this branch. That is canonically correct per §2 criterion-3 — but it must not be framed as a "prevent-genocide" reward (Gate §1 Ring 3 #10, no gamified prevent-genocide mechanic).

---

## 7. Citations and Sources

### Tier A (`icty_icj_un` / `agreement_text`)
- **UN S/26486** (23 September 1993) — ICFY transmission of the Invincible package; records RBiH Presidency conditional acceptance of 20 Sep 1993 at Geneva.
- **UN S/26922** (21 December 1993) — ICFY Steering Committee Report covering the late-1993 negotiating round; documents the RBiH Assembly rejection of 29 September 1993.
- ***Prosecutor v. Karadžić*** (ICTY IT-95-5/18-T) Trial Judgement vol. III §§4263-4310 (esp. §§4280-4310) — narrative of the September 1993 Owen-Stoltenberg outcomes; fixes RBiH Assembly rejection as the operative outcome.

### Tier B (BB)
- **Balkan Battlegrounds Vol. II** — operational context for the Drina enclaves and Posavina corridor situation that drove the Assembly's rejection (specific pages to be confirmed by Balkan Battlegrounds extractor before Phase D authoring).

### Forbidden
- Wikipedia is not cited as a primary source per Gate §6 and Foundational packet §5.

---

## 8. Open Questions for Canon Compliance / Game Designer Review

1. **Per-faction row authoring vs. X3 composite.** X3 §7 Open Question 1 has already decided: three separate per-faction events (R9 + B4 + H4), composite tag computed at downstream-trigger evaluation. B4 should be authored as an independent row in `data/scenarios/events/war_1993.json`. Confirm Phase D scheduling alongside R9 and H4 (cross-faction same-turn modal coordination per v1.3 §3.5).
2. **Single-event-with-abstracted-label vs. two-step event chain.** Phase A recommendation: single event with `reject_via_assembly` label that abstracts the Presidency-Assembly sequence; `internal_cohesion: -1` captures the procedural split. Alternative: two-step chain (Presidency decision → Assembly ratification decision). Game Designer to rule.
3. **`accept_*` counterfactuals authoring posture.** Phase A recommendation: keep both `accept_for_optics` and `accept_sincerely` documented in this worksheet but **do not author in Phase D** until Sensitive-History Gate §6 sign-off is recorded. Default conservative posture: omit both counterfactuals from the Phase D authoring slice; reopen authoring after Gate sign-off.
4. **§3.6 boundary concerns (Canon Compliance review).** B4 does not place an atrocity decision in front of the player. However the `accept_*` counterfactuals' rupture-foreclosure interaction is exactly the kind of cross-row design pattern that §3.6 of the Runtime Semantics Packet warns about (no row may extend, scale, or reward sensitive-history acts in state). Canon Compliance should confirm that flag-driven foreclosure of `srebrenica_genocide_1995` reachability, *without* a "prevent-genocide" narrative reward, is acceptable. Phase A reading: yes, structurally, per Gate §2 criterion-3 (rupture binds on emergent satisfaction of the discrete game-state condition, not calendar); but Canon Compliance has final say.

---

## 9. Phase A Closeout Checklist

- [x] Family classified per §4.2 row B4 of the runtime-semantics packet.
- [x] Historical default identified with Tier A citations (UN S/26486, UN S/26922, Karadžić TJ vol. III §§4263-4310).
- [x] Counterfactual options inventoried with provenance and cost-floor recommendations (§3.1).
- [x] Material effects mapped to §3.3 (proposed, Phase D-gated for `accept_*`).
- [x] Runtime causality targets proposed (Phase D-deferred; `accept_*` gated on Sensitive-History Gate §6).
- [x] Sensitive ring classified at option and downstream levels.
- [x] Open questions surfaced for Canon Compliance / Game Designer.
- [x] No JSON edited, no runtime code touched, no FORAWWV edit.
