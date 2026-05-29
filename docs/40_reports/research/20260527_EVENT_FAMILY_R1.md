# Event Family Worksheet — R1: RS Six Strategic Goals Platform

**Family ID:** `rs_strategic_goals`
**Packet row:** v1.3 packet §4.1 R1 (RS families)
**Sensitive ring:** Ring 1/2 borderline — option set must NOT authorize abuse beyond historical record
**Source tier:** A (`icty_icj_un`)
**Date:** 2026-05-27
**Author lane:** Historian (Phase A research worksheet)
**Status:** Phase A — research only. No JSON, code, or canon edits.

---

## 1. Cited Historical Narrative

On 12 May 1992, the Assembly of the Serbian People in Bosnia and Herzegovina, convened at Banja Luka, adopted six strategic goals proposed by the political leadership of the self-declared Republika Srpska. The six goals are recorded verbatim in *Službeni glasnik Republike Srpske* No. 22 (26 November 1993) and quoted at length in the ICTY trial-chamber judgment of *Prosecutor v. Karadžić* (IT-95-5/18-T, 24 March 2016):

1. Separation as a state from the other two ethnic communities.
2. A corridor between Semberija and Krajina (the Posavina corridor).
3. The establishment of a border on the Drina river separating the Serb state from the rest of BiH.
4. The establishment of a border on the rivers Una and Neretva.
5. The division of Sarajevo into Serb and Muslim parts.
6. Access to the sea for the Serb state.

The Karadžić trial chamber found that these goals, together with their geographic implementation, constituted the political-military objective of a Joint Criminal Enterprise (JCE) whose common purpose was the permanent removal of Bosnian Muslims and Bosnian Croats from territory claimed for the Serb state (Karadžić IT-95-5/18-T §§2710–2715, 3447–3526). The chamber held that the implementation of Goals 3 (Drina), 5 (Sarajevo), and to a lesser extent 2 (Posavina) could not be achieved without forcible population transfer, and that Karadžić foresaw and accepted that consequence.

General Ratko Mladić, then-commander of the VRS Main Staff, addressed the same Assembly session and gave the often-quoted warning that the goals as proposed would amount to genocide — a warning recorded in the ICTY *Mladić* trial judgment (IT-09-92-T, 22 November 2017, §§3232–3243) and in the *Karadžić* judgment (§3447). The Assembly adopted all six goals.

The ICJ judgment in *Bosnia and Herzegovina v. Serbia and Montenegro* (26 February 2007) found that the Srebrenica events of July 1995 constituted genocide; the broader 1992 cleansing campaign was found to be a pattern of ethnic cleansing not legally classified as genocide outside Srebrenica, but flowing from the same strategic platform.

Operational context (BB I pp. 132–144, 198–214) documents the immediate Drina/Posavina campaign that followed the 12 May vote: Zvornik (8–9 April 1992 — pre-vote), Bijeljina, Brčko corridor operations, Foča, Višegrad, and the establishment of detention facilities at Omarska, Keraterm, and Trnopolje (Prijedor) by June 1992.

**Citations:**
- ICTY *Karadžić* IT-95-5/18-T (Trial Judgment, 24 March 2016) §§2710–2715, 3447–3526 — Six Goals + JCE findings.
- ICTY *Mladić* IT-09-92-T (Trial Judgment, 22 November 2017) §§3232–3243 — Mladić Assembly warning.
- ICTY *Stakić* IT-97-24 (Trial Judgment, 31 July 2003) — Prijedor implementation.
- ICTY *Brđanin* IT-99-36-T (Trial Judgment, 1 September 2004) — Krajina Crisis Staff implementation.
- ICTY *Krajišnik* IT-00-39-T (Trial Judgment, 27 September 2006) — Assembly leadership.
- ICJ *Bosnia v. Serbia* (26 February 2007) — genocide finding at Srebrenica; ethnic-cleansing pattern.
- UN A/54/549 (15 November 1999) — Srebrenica fall report, contextual.
- BB I pp. 132–144, 198–214 — operational context of 1992 Drina/Posavina campaign.

## 2. Defensible Historical / Default Option

**`historical_default_response_id: "all_six"`** — Historical default.

The Assembly adopted all six goals on 12 May 1992 by clear majority. This is the documented action of the historical actor (Republika Srpska Assembly under Karadžić leadership). Mladić's warning was on the record and was disregarded. The label `Historical default` is defensible under the Foundational packet's label taxonomy because the option matches the actor-specific choice documented by ICTY.

**Framing constraint (per Sensitive-History Gate §1 Ring 1/2 boundary and Foundational packet `rs_strategic_goals` ruling):** the option text and consequences must depict the *platform decision* — political-strategic war aims, command friction with Mladić, aggression posture, patron pressure, international standing — and must NOT frame the genocidal *implementation* as a player-authorized tactic. Atrocity remains a downstream consequence of the existing `paramilitary_sweep`, `enclave_resilience`, and `displacement` engines (Gate §1.1 Ring 1), not a lever within this row.

## 3. Proposed Counterfactual Options

Two counterfactuals, both already authored in the existing `rs_strategic_goals` row at `data/scenarios/events/war_1992.json` lines 66–144. The packet does NOT propose new options; it pins the existing option set as canonical and rules out any expansion.

### 3.1 `selective` — `Counterfactual staff path`

Adopt corridor (Goal 2) and separation (Goal 1) but restrain Drina (Goal 3) and Sarajevo (Goal 5) operations. Design provenance: a plausible alternative path in which the Assembly heeded Mladić's warning and adopted a narrower platform centered on territorial defense rather than maximalist border-drawing. No documented historical Assembly vote took this form; therefore the option is `Counterfactual staff path`, source tier `design_counterfactual`, NOT `Historical default`.

Material effects (existing): negative morale (Assembly demoralized by perceived retreat), negative military credibility, negative internal cohesion, positive territorial legitimacy, `aggression_affinity: -0.5`, `risk_level: 0.3`, `sets_flags: { rs_strategic_goals: "selective" }`.

### 3.2 `aggressive` — `Counterfactual staff path`

Adopt all six goals at maximum tempo, accepting Mladić's genocide warning as the cost of business. Design provenance: a plausible alternative path in which the Assembly chose to compress the implementation timeline (e.g., complete the Drina valley campaign in weeks rather than months). The existing option includes a `humanitarian_impact { war_crimes_delta: 2 }` effect which is the engine's automatic counter, NOT a player-authored cleansing instruction — this is the §3.6 Ring rule line. Source tier `design_counterfactual`.

Material effects (existing): high morale, +25% aggression for 26 turns, automatic war-crimes counter, positive military credibility and internal cohesion, severe international-standing penalty, `aggression_affinity: 1`, `risk_level: 0.9`, `sets_flags: { rs_strategic_goals: "aggressive" }`.

**Hard rule (Gate §1 Ring 3 #1):** Neither counterfactual option, nor any future option added to this row, may frame genocide or systematic cleansing as a *player-selected tactic*. The option labels and descriptions are about platform/posture; downstream atrocity flows from the existing Ring 1 engines.

## 4. Material Effects (Per §3.3 Of v1.3 Packet)

Existing material effects on the three options (already in JSON, see §3 above) satisfy the §2.2 `material_effect_minimum_satisfied` rule: each option carries `effects[]`, `sets_flags`, and `dimension_shifts`. Phase D wiring (out of scope for this worksheet) would additionally attach `enables_events_runtime` and `closes_events_runtime` arrays per §3.3.

Proposed Phase D / Phase C wiring (informational, not authored here):

| Option | `enables_events_runtime` (targets) | `closes_events_runtime` (targets) |
| --- | --- | --- |
| `all_six` | R2 `rs_paramilitary_policy` (gates availability); R3 Drina campaign tempo consequence chain (consequence-only per Foundational packet); R4 Prijedor camp exposure response; X1 London Conference posture | Reintegration counterfactual chain (if and when authored) |
| `selective` | R2 `rs_paramilitary_policy` (gates with attenuated context); narrower X1 / R8 patron-pressure chain | Maximalist Drina extension consequences; full Sarajevo division |
| `aggressive` | R2 `rs_paramilitary_policy`; accelerated R4 camp exposure; accelerated NATO-escalation threshold (X6) | Vance-Owen acceptance window (R6); London Conference compliance posture |

**Note:** R3 (Drina) is Blocked per §3 of the R3 worksheet — `enables_events_runtime` for R3 means enabling consequence/reflection events, NOT a player decision row.

## 5. Sensitive-History Ring And Source Note

**Ring:** Ring 1/2 borderline. The decision *itself* (which platform to adopt) is Ring 2 (narratively represented political decision). The *downstream implementation* of the adopted platform is Ring 1 (engine-modeled: paramilitary sweeps, displacement, enclave fall, rupture at Srebrenica). The boundary is held at: this row sets posture and authorizes nothing beyond what the engine already does for that posture.

**Gate §3 paramilitary surface:** This row does NOT itself authorize paramilitary deployment. Authorization remains routed through `state.military.paramilitary_policy` (Gate §3, R2 worksheet). The `all_six` flag may *enable* the R2 paramilitary-policy decision to fire, but R2 is the only player surface that authorizes the act.

**Source note for the modal (draft, per §5 of v1.3 packet):**

> Six Strategic Goals adopted 12 May 1992 by the Assembly of the Serbian People in BiH, Banja Luka. ICTY *Karadžić* (IT-95-5/18-T) §§2710–2715, 3447–3526 found the Goals constituted the political objective of a Joint Criminal Enterprise. ICTY *Mladić* (IT-09-92-T) §§3232–3243 records the commander's warning to the Assembly that the Goals as proposed would amount to genocide. ICJ *Bosnia v. Serbia* (2007) found genocide at Srebrenica; broader 1992 campaign found as ethnic cleansing.

**Source tier:** `icty_icj_un`.

## 6. Downstream Opens / Closes (Per §3.3)

See §4 table above. Worksheet-level summary:

- **Opens (via flag `rs_strategic_goals`):** R2 (paramilitary policy availability); R4 (Prijedor camp exposure response posture); X1 (London Conference RS posture); R8 (Belgrade embargo response posture, downstream of `aggressive` path); X6 (NATO escalation threshold pulled forward on `aggressive`); R10/X7 (UN safe-area enforcement context).
- **Closes:** Reintegration counterfactual chain on `all_six` and `aggressive`; full Vance-Owen acceptance on `aggressive`.
- **Consequence-only (no player decision):** R3 (Drina campaign tempo — Blocked per Foundational packet); rupture at Srebrenica (Gate §2 — fires on emergent OSID condition, not on this row).

## 7. Open Questions Deferred To Canon Compliance Review

1. The `aggressive` option's `humanitarian_impact { war_crimes_delta: 2 }` effect is an immediate counter increment. Confirm with Canon Compliance that this remains acceptable under §3.6 of the v1.3 packet (which rejects response options whose `effects` "extend, continue, or scale a sensitive-history act"). The current reading is: this is a posture-level *projection* of expected war-crimes exposure, not authorization of new acts — but flag for review.
2. Phase C target confirmation: v1.3 packet §6 Phase C names R1 → R2 as the first executable causal packet. Confirm Game Designer agrees R1 `all_six` should be the only path that opens R2, OR whether R1 `selective` should also open R2 (with a different default response). Recommend: all three R1 options open R2 (since paramilitary policy is a separate decision), but `all_six` and `aggressive` write `paramilitary_policy: 'ask'` as the modal default while `selective` writes `'always_deny'` as the modal default. To be confirmed by Game Designer in Phase C.
3. Whether the `all_six` option's narrative text needs an explicit Mladić-warning citation in the modal source note (already present in the row's narrative on line 5 of `war_1992.json`). Recommend: yes, the modal source note draft in §5 above should pin the citation.
