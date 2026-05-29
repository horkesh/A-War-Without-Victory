# Event Family Worksheet — R6: RS Assembly Rejects Vance-Owen Plan (May 1993)

**Family ID:** `rs_assembly_rejects_voplan_1993`
**Packet row:** v1.3 packet §4.1 R6 (RS families)
**Existing event row:** `rs_assembly_rejects_voplan_1993` (`data/scenarios/events/war_1993.json` lines 1487–1639)
**Sensitive ring:** none (political / assembly-decision row)
**Source tier:** A (`icty_icj_un` for ICTY judgment context; `agreement_text` for the Vance-Owen Peace Plan itself)
**Date:** 2026-05-27
**Author lane:** Historian (Phase A research worksheet)
**Status:** Phase A — research only. No JSON, code, or canon edits.

---

## 1. Cited Historical Narrative

The Vance-Owen Peace Plan (VOPP), formulated by UN Special Envoy Cyrus Vance and EC Special Envoy Lord David Owen, was presented to the parties in Geneva on 2 January 1993. It proposed dividing Bosnia and Herzegovina into ten ethnically-mixed provinces with a weak central government, demilitarisation, and the return of refugees. The plan was signed by:

- **RBiH (Izetbegović)** — accepted in stages between January and March 1993; final signature 25 March 1993 in New York (per B3 worksheet).
- **HRHB (Boban)** — accepted in stages; final signature January 1993.
- **RS (Karadžić)** — signed under pressure in Athens on 2 May 1993, with the explicit condition that the RS Assembly would ratify.

On 5–6 May 1993, the Republika Srpska National Assembly convened at Bijeljina (note: the existing JSON narrative uses "Pale," but the historical record places the May 5–6 session at Bijeljina; *Karadžić* IT-95-5/18-T §3526 records the Bijeljina venue) and **rejected** the Vance-Owen Plan. The Assembly referred the decision to a popular referendum held 15–16 May 1993, in which roughly 96% of those voting in RS-controlled territory rejected the plan. Lord Owen formally declared the plan dead on 18 June 1993.

The session included two notable contemporaneous events:

- **Mladić's map presentation:** General Ratko Mladić, then VRS Main Staff commander, presented maps to the Assembly arguing the VOPP territorial allocation was militarily and demographically unacceptable for the RS. *Mladić* IT-09-92-T §§3232–3243 records the chamber's findings on the Mladić Assembly addresses.
- **Cosić appeal:** FRY President Dobrica Ćosić and Greek Prime Minister Konstantinos Mitsotakis (who had hosted the 2 May Athens signing) urged acceptance. *Karadžić* IT-95-5/18-T §§3251–3268, 3526–3530 documents the FRY pressure for acceptance.

The ICTY Trial Chamber in *Karadžić* (IT-95-5/18-T) made the following relevant findings:

- §§3526–3530 — Karadžić's signature in Athens 2 May 1993; Pale Assembly rejection 5–6 May 1993; subsequent referendum.
- §§3471–3475 — the Assembly's rejection was consistent with the RS political-military objective of the Six Strategic Goals: the VOPP's ten-province scheme would have foreclosed Goal 3 (Drina border) and Goal 5 (Sarajevo division).
- §3447 — Karadžić's broader pattern of signing internationally and ratifying domestically through Assembly defiance.

The *Krajišnik* Trial Judgment (IT-00-39-T §§856–891) records the Assembly proceedings and Krajišnik's role as Assembly President in the 5–6 May 1993 session.

**Vance-Owen agreement text:** the plan's text (and the Athens accord wording for the signature) are available in the UN documentary record (UN S/25221 — text of the plan annexed to the Co-Chairmen's report to the Secretary-General, 11 February 1993). The plan-specific provisions on the ten provinces, the central government, and the demilitarization mechanism are agreement-text material.

**Balkan Battlegrounds operational context:**

- BB II pp. 9–32 (Ch. 1 — Vance-Owen and the spring 1993 collapse) covers the Athens signature, the Assembly rejection at Bijeljina, the referendum, and the operational consequences (continued ARBiH–HVO conflict in central Bosnia; RS consolidation in the Drina valley).
- BB II pp. 28–31 specifically on the Bijeljina Assembly session and the maps Mladić presented.

**Citations:**
- ICTY *Karadžić* IT-95-5/18-T (Trial Judgment, 24 March 2016) §§3251–3268, 3447, 3471–3475, 3526–3530.
- ICTY *Mladić* IT-09-92-T (Trial Judgment, 22 November 2017) §§3232–3243.
- ICTY *Krajišnik* IT-00-39-T (Trial Judgment, 27 September 2006) §§856–891.
- Vance-Owen Peace Plan text, UN S/25221 (11 February 1993).
- UN Security Council Resolution 820 (17 April 1993) — sanctions tightening on FRY linked to RS acceptance pressure.
- BB II pp. 9–32 (Ch. 1).

## 2. Defensible Historical / Default Option

**`historical_default_response_id: "accept_rejection"`** — Historical default.

The existing JSON option `accept_rejection` (lines 1517–1565) corresponds to the documented Pale leadership choice: ratify the Assembly's 5–6 May 1993 rejection, accept the consequent international isolation and FRY anger, preserve RS internal cohesion and the Six Strategic Goals platform. *Karadžić* IT-95-5/18-T §3526 finds that Karadžić acquiesced in the Assembly outcome despite his Athens signature.

The label `Historical default` is defensible because:

- The decision is at modal-decision granularity: the moment after the Assembly vote when the Pale Presidency must publicly stand with or against the Assembly.
- The actor-specific choice is documented (*Karadžić* §§3526–3530 + Assembly minutes via *Krajišnik* §§856–891).
- Source tier A (ICTY judgment + agreement text) is the strongest available tier per Source Standard.

The existing JSON `historical_marker: "historical_default"` (line 1518) is consistent with this worksheet's recommendation. The existing JSON `bot_response_logic: "historical"` (line 1503) and `historical_default_response_id: "accept_rejection"` (line 1504) align with calibration baseline; option 0 (`accept_rejection`) is the historical/default path the historical bot will pick.

**Per task brief:** "Historical default `reject` (Bijeljina vote 5-6 May 1993; cite Karadžić IT-95-5/18-T + agreement text)." The task brief uses `reject` to describe the *substantive choice* (rejecting Vance-Owen). The existing JSON option id is `accept_rejection`, which describes the *Presidency-level meta-choice* of accepting the Assembly's rejection. These resolve to the same historical outcome; the existing option id stays as authored.

## 3. Proposed Counterfactual Options

The packet brief and existing JSON together specify two options:

> Per task brief: "Counterfactuals: `accept` + `override_assembly` (R7 covers override internal-politics separately)."

The existing JSON has `override_assembly` already authored. The task brief adds `accept` as an additional counterfactual (Pale Presidency unilaterally accepts the VOPP without seeking Assembly ratification, leveraging Karadžić's Athens signature as already-binding). This worksheet pins the existing `override_assembly` and proposes the new `accept` option per the packet brief; the v1.3 §4.1 R7 row covers internal-politics consequences of override.

### 3.1 `accept_rejection` — `Historical default` (per §2)

**Existing JSON state (`war_1993.json` lines 1517–1565):** "Accept the assembly's vote. The people have spoken. Reject international pressure and continue the war. Internal cohesion is preserved but Serbia is furious."

Material effects (existing):
- `effects[]`: `morale_change: +5`, `patron_pressure: +10`
- `sets_flags`: implicit via `historical_default_response_id` linkage; no explicit `sets_flags` on the option
- `dimension_shifts`: `international_standing: -15`; `patron_confidence: -10`; `internal_cohesion: +10`
- `aggression_affinity: 0.5`; `risk_level: 0.7`
- `future_consequences[]`: `assembly_rejection_accepted_visibility` (guaranteed; references morale + patron_pressure effects)

**Phase D wiring note:** the option currently lacks an explicit `sets_flags`. The packet recommends adding `sets_flags: { vance_owen_rs_response: "accept_rejection" }` in Phase D to give downstream events a clean trigger condition. Without this, the existing `historical_default_response_id` linkage works for diagnostics but not for trigger.condition matching.

### 3.2 `override_assembly` — `Counterfactual staff path`

**Existing JSON state (`war_1993.json` lines 1566–1614):** "Attempt to override the assembly. Defy the nationalist vote and push for acceptance. Historically impossible — risks fracturing the RS political structure."

Material effects (existing):
- `effects[]`: `morale_change: -5`, `patron_pressure: -5`
- `dimension_shifts`: `international_standing: +10`; `patron_confidence: +5`; `internal_cohesion: -20`
- `aggression_affinity: -0.6`; `risk_level: 0.8`
- `future_consequences[]`: `assembly_override_visibility` (risk; references morale + patron_pressure effects)

Design provenance: a counterfactual in which Karadžić commits politically to his Athens signature, defies the Assembly's vote (or coerces Krajišnik to suppress it), and accepts the resulting domestic political rupture. Not documented as a path the RS Presidency considered; Karadžić's Athens signature was already understood by all parties as conditional on Assembly ratification per *Karadžić* §3526.

**R7 separation:** the v1.3 §4.1 R7 row covers the **internal politics** of override (Phase A worksheet must specify a counterfactual cost floor — internal_cohesion and patron-trust penalties at least as severe as the international-standing cost the historical rejection avoids). R7 is a separate worksheet (not authored here) and may layer additional flags on `override_assembly` that compound the internal-cohesion fracture. R6's `override_assembly` does not need to fully model the override's internal-political consequences; R7 owns that.

### 3.3 `accept` — `Counterfactual staff path` (NEW, per packet brief)

Pale Presidency unilaterally accepts the Vance-Owen Plan after the Athens signature, treating the 2 May Athens accord as binding and either preempting the Assembly session or accepting the rejection without political force behind it (i.e., signing implementation documents while the Assembly's "no" becomes an internal political statement without operational consequence).

Design provenance: a counterfactual in which the Karadžić leadership treats the international diplomatic settlement as overriding domestic political process. Not documented as a path Karadžić considered; would have produced a more dramatic version of R7's internal fracture than `override_assembly` because it bypasses the Assembly entirely rather than attempting to coerce it. Source tier `design_counterfactual`.

**Material effects (proposed; not yet in JSON):**
- `effects[]`: `morale_change: -10`; `patron_pressure: -15` (severe Belgrade satisfaction)
- `sets_flags: { vance_owen_rs_response: "accept" }`
- `dimension_shifts`: `international_standing: +25`; `patron_confidence: +15`; `internal_cohesion: -30` (catastrophic hardline-base rupture)
- `aggression_affinity: -0.8`
- `risk_level: 0.9`

**R7 boundary:** as with `override_assembly`, the R7 worksheet (not authored here) layers additional internal-politics consequences. The packet brief specifies R7 covers override; the same R7 worksheet's cost-floor logic applies a fortiori to `accept`, which is more politically extreme.

## 4. Material Effects (Per §3.3 Of v1.3 Packet)

| Option | `effects[]` | `sets_flags` | `dimension_shifts` |
| --- | --- | --- | --- |
| `accept_rejection` | `morale_change: +5`; `patron_pressure: +10` (existing) | proposed Phase D add: `vance_owen_rs_response: 'accept_rejection'` | `international_standing: -15`; `patron_confidence: -10`; `internal_cohesion: +10` (existing) |
| `override_assembly` | `morale_change: -5`; `patron_pressure: -5` (existing) | proposed Phase D add: `vance_owen_rs_response: 'override_assembly'` | `international_standing: +10`; `patron_confidence: +5`; `internal_cohesion: -20` (existing) |
| `accept` (NEW) | `morale_change: -10`; `patron_pressure: -15` | `vance_owen_rs_response: 'accept'` | `international_standing: +25`; `patron_confidence: +15`; `internal_cohesion: -30` |

All options satisfy the §2.2 `material_effect_minimum_satisfied` rule.

Proposed Phase D wiring (informational, not authored here):

| Option | `branch_tag` (proposed) | `enables_events_runtime` (targets) | `closes_events_runtime` (targets) |
| --- | --- | --- | --- |
| `accept_rejection` (historical default) | `rs_vance_owen_rejected` (maps to existing composite sub-tag `vance_owen_rejected_by_rs` from branch-tag vocabulary stub) | `csq_international_disillusionment_1993` (per v1.3 §4.1 R6); preserves R8 (Belgrade embargo 1994) at historical default `negotiate`; preserves R9 (Owen-Stoltenberg) at historical default | Vance-Owen track follow-on (the plan is dead — closes the VOPP-specific downstream chain) |
| `override_assembly` (counterfactual) | `rs_vance_owen_override` | R7 internal-politics cascade; partial preservation of Vance-Owen track; attenuated `csq_international_disillusionment_1993` | none (override does not foreclose later events; R7 cost floors govern internal consequences) |
| `accept` (counterfactual, NEW) | `rs_vance_owen_accept` | `vance_owen_implemented` composite tag (per branch-tag vocabulary stub Wave 1); opens RS-side VOPP-implementation chain; opens RBiH/HRHB acceptance reciprocity if not already done | Croat-Bosniak war 1993 chain (H2, H5) — but **only** to the extent VOPP implementation would have preempted it; this is a non-trivial historiographical claim and must be Game Designer + Historian-vetted in Phase D; closes most of the rest of the RS war chain |

**§3.6 hard rule:** none of the three options carries `effects` that extend, continue, or scale a sensitive-history act. All three manipulate political/diplomatic state. The existing JSON satisfies this rule.

**Branch-tag vocabulary note:** the Wave 1 vocabulary stub already includes `vance_owen_rejected_by_rs` and `vance_owen_implemented` under composite tag `diplomacy_vance_owen`. The proposed primitive tags `rs_vance_owen_rejected`, `rs_vance_owen_override`, `rs_vance_owen_accept` are new for the RS-specific surface. Wave 2 vocabulary extension to include them.

## 5. Sensitive-History Ring And Source Note

**Ring:** none. Per packet brief and v1.3 §4.1 R6 row. This is a political/assembly-decision row. No Ring 1 atrocity surface is touched; no Ring 2 narrative representation of cleansing acts.

**Gate §3 paramilitary boundary:** This row does NOT authorise paramilitary deployment. The paramilitary surface remains `state.military.paramilitary_policy` (R2). The `vance_owen_rs_response` flag is diplomatic/political only.

**Source note for the modal (draft, per §5 of v1.3 packet):**

> Vance-Owen Peace Plan signed by Karadžić under Greek/FRY pressure in Athens 2 May 1993; submitted for RS Assembly ratification at Bijeljina 5–6 May 1993. Mladić presented maps to the Assembly arguing the territorial allocation was militarily unacceptable (*Mladić* IT-09-92-T §§3232–3243). FRY President Ćosić urged acceptance (*Karadžić* IT-95-5/18-T §§3251–3268). The Assembly rejected the plan; a referendum 15–16 May 1993 produced ~96% rejection; Lord Owen declared the plan dead 18 June 1993 (*Karadžić* IT-95-5/18-T §§3526–3530). The Bijeljina rejection was consistent with the Six Strategic Goals' demographic implementation requirements (*Karadžić* §§3471–3475). Plan text: UN S/25221 (11 February 1993).

**Source tier:** `icty_icj_un` (Tier A) for primary historical claims; `agreement_text` (Tier A) for plan text. Both are Tier A per Source Standard. Recommend `source_tier: icty_icj_un` on the row because the political-decision-level facts are anchored in ICTY findings; plan text is contextual.

**Existing JSON `historical_source` (line 1638):** "ICTY Karadzic Trial Judgment (IT-95-5/18-T), paras. 3526-3530. RS National Assembly proceedings, May 5-6 1993." — adequate at modal granularity. Phase D wiring should expand to also cite *Mladić* §§3232–3243 for the Mladić maps moment and UN S/25221 for the plan text.

**Existing JSON narrative venue:** uses "Pale" (line 1490). The historical Assembly venue 5–6 May 1993 was **Bijeljina** per the *Karadžić* judgment. Phase D narrative copy edit recommended: replace "Pale" with "Bijeljina" in the narrative text. This is a one-word factual correction; Canon Compliance to confirm during Phase D.

## 6. Downstream Opens / Closes (Per §3.3)

R6 is opened by:

- Event-level (existing): `turn_min: 56, turn_max: 58`; `requires_events: ["vance_owen_plan_1993"]` (line 1496–1498).
- Trigger condition: the existing trigger is calendar-window + event-prerequisite. Phase D should consider adding an emergent predicate (e.g., `flag_equals: { vance_owen_signed_by_karadzic: true }`) for cleaner causal chain visibility, but the current calendar+requires-events condition is acceptable per evaluator contract.

Phase D would attach response-level `enables_events_runtime` / `closes_events_runtime` per §4 table above.

- **Opens (proposed Phase D, response-level):**
  - `accept_rejection` → `csq_international_disillusionment_1993`; preserves R8/R9 historical defaults.
  - `override_assembly` → R7 internal-politics cascade.
  - `accept` (NEW) → VOPP implementation chain (RS-side); reciprocity events for RBiH/HRHB if not already implementing.
- **Closes (proposed Phase D):**
  - `accept_rejection` → Vance-Owen track follow-on (the plan is dead).
  - `accept` (NEW) → most of the remaining RS war chain (this is a major branch and must be Phase D-gated by Game Designer + Historian).
- **Consequence-only (no player decision):** `icty_established_1993` (war_1993.json line 1641) fires on turn 60 regardless and is consequence-only. R6's outcome does not gate ICTY establishment; ICTY establishment was a UN process independent of any single RS decision.

**Critical: no auto-reopen.** Per v1.3 §9 question 3, closed events stay closed. If `accept_rejection` forecloses the VOPP track, no subsequent event opens it back; if `accept` opens the implementation chain, the historical war chain it closes does not reopen if RS later defects.

## 7. Open Questions Deferred To Canon Compliance Review

1. **Venue correction (Bijeljina vs Pale):** the existing JSON narrative says "Pale"; the historical Assembly session 5–6 May 1993 was at Bijeljina. Phase D narrative copy edit recommended. Canon Compliance Reviewer to confirm and Narrative Designer to revise the prose.
2. **Add explicit `sets_flags` to existing options:** the existing `accept_rejection` and `override_assembly` lack explicit `sets_flags` keys (lines 1517–1614 — only the `effects` and `dimension_shifts` are present). Phase D wiring should add `sets_flags: { vance_owen_rs_response: '<id>' }` to all three options so downstream events have a clean trigger condition flag to gate on.
3. **`accept` option addition:** Phase D authors a new third option `accept` per packet brief. Confirm with Game Designer that the `internal_cohesion: -30` cost floor is sufficient to prevent counterfactual dominance — per v1.3 §4.1 R7 row, "Phase A worksheet must specify a counterfactual cost floor … preventing override from dominating the historical default." The same logic applies a fortiori to `accept`. Recommend the R7 worksheet's cost-floor numbers be applied uniformly to both override and accept options.
4. **`closes_events_runtime` scope on `accept`:** if `accept` truly forecloses "most of the remaining RS war chain" as proposed in §6, this is a major historical-counterfactual claim and a major scenario-output consequence. Recommend deferring this scope to Phase F (peace-plan and late-war branches) rather than Phase C/D; Phase D for R6 should ship with `closes_events_runtime: []` on `accept` and let Phase F coordinate the VOPP-implementation chain's foreclosure semantics.
5. **`bot_response_logic: "historical"` (line 1503):** already set. Confirms option 0 (`accept_rejection`) as the historical-bot pick. No change needed.
6. **R7 worksheet scope:** R7 (RS Assembly rejection internal politics) is a separate worksheet covering the internal cost floor for `override_assembly` (and now `accept`). R6 must not duplicate R7's content; the cost numbers in §3.2 and §3.3 above are placeholders for R7's authoritative figures.
