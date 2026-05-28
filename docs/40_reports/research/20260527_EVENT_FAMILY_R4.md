# Event Family Worksheet — R4: RS Prijedor / Camp Exposure Response (1992)

**Family ID:** `rs_camp_exposure_response`
**Packet row:** v1.3 packet §4.1 R4 (RS families)
**Existing event row:** `concentration_camps_revealed_1992` (`data/scenarios/events/war_1992.json` lines 1508-1710)
**Sensitive ring:** Ring 1 — already authored; option set canon-bound by Foundational packet `concentration_camps_revealed_1992` ruling
**Source tier:** A (`icty_icj_un`)
**Date:** 2026-05-27
**Author lane:** Historian (Phase A research worksheet)
**Status:** Phase A — research only. No JSON, code, or canon edits.

---

## 1. Cited Historical Narrative

In late July and early August 1992, ITN journalists Penny Marshall and Ian Williams, accompanied by *Guardian* reporter Ed Vulliamy, reached the Prijedor area in north-western Bosnia and entered the Omarska, Keraterm, and Trnopolje camps run by Republika Srpska (RS) civilian and military authorities. The footage broadcast on 6 August 1992 — emaciated men behind barbed wire at Trnopolje, the interior of Omarska, witness testimony of beatings, killings, and sexual violence — produced the defining international image of the early Bosnian war and triggered the diplomatic sequence that culminated in the establishment of the International Criminal Tribunal for the former Yugoslavia (ICTY) by UN Security Council Resolution 827 on 25 May 1993.

The ICTY trial chambers established the following facts about the camp system and the RS political/military response to exposure:

- **Camp operation:** Omarska, Keraterm, and Trnopolje were operational by late May 1992 and were established and administered by the Prijedor Crisis Staff in coordination with RS Ministry of Interior (MUP) and VRS 1st Krajina Corps elements. The Prijedor Crisis Staff was chaired by Milomir Stakić (President of the Prijedor Municipal Assembly). *Stakić* IT-97-24-T §§88–168, 480–518, 671–712.
- **Camp conditions:** detainees were Bosnian Muslims and Bosnian Croats. The chambers found systematic beatings, killings (including the Room 3 / "white house" killings at Omarska), sexual violence, starvation rations, and absence of medical care. *Tadić* IT-94-1-T (7 May 1997) §§154–237. The Trial Chamber in *Tadić* convicted on counts arising from Omarska, Keraterm, and Trnopolje, establishing the first ICTY conviction.
- **Strategic context:** the Krajina cleansing campaign was directed by the Autonomous Region of Krajina (ARK) Crisis Staff under Radoslav Brđanin, implementing the Six Strategic Goals (Decision 02-130/92 of the RS Assembly, 12 May 1992) by removing the non-Serb population from Krajina municipalities. *Brđanin* IT-99-36-T §§108–123, 1051–1149.
- **Karadžić knowledge and JCE finding:** the Trial Chamber found that Karadžić knew of the camps and their conditions and that the camp system was an essential instrument of the Joint Criminal Enterprise's common purpose. *Karadžić* IT-95-5/18-T §§2470–2509, 3469–3475, 3505–3524.

The historical RS political response to the August 1992 exposure was **denial**:

- RS officials, including Karadžić personally, publicly characterised the camps as "transit centres" or "investigation centres" for combatants and refused independent inspection access in the immediate aftermath of the ITN broadcast. *Karadžić* IT-95-5/18-T §§3473–3475 records the Trial Chamber's finding on Karadžić's contemporaneous public posture.
- Limited and managed International Committee of the Red Cross (ICRC) access was granted only under sustained pressure in subsequent weeks; the worst-conditions facilities (notably Keraterm and the Omarska "white house") had been substantially modified or evacuated before any external inspection. *Brđanin* IT-99-36-T §§540–558.
- The UN Special Rapporteur on Human Rights for the former Yugoslavia, Tadeusz Mazowiecki, was appointed 14 August 1992; his initial report (28 August 1992, E/CN.4/1992/S-1/9) documented the camp system based on detainee and survivor testimony. The UN General Assembly noted his work in resolution A/RES/47/147; the Commission of Experts established under UNSC Resolution 780 (6 October 1992) produced the Final Report (S/1994/674) with Annex VIII specifically on detention facilities and Annex VIII.A on Omarska, Keraterm, and Trnopolje.
- UN A/54/549 (15 November 1999, Srebrenica report) records contextually that the 1992 camp exposure "fundamentally altered the international community's perception of the conflict" and was a precipitating factor for ICTY establishment.

**Operational context** (BB I pp. 198–229, Ch. 9 "Prijedor and the Krajina"): the Prijedor takeover of 30 April 1992 was executed by the SDS-led Crisis Staff with VRS 1st Krajina Corps and RS MUP cooperation. The Kozarac attack (24–25 May 1992) and the subsequent rounding-up of the male non-Serb population produced the prisoner populations of Omarska, Keraterm, and Trnopolje.

**Citations:**
- ICTY *Karadžić* IT-95-5/18-T (Trial Judgment, 24 March 2016) §§2470–2509, 3469–3475, 3473–3475, 3505–3524.
- ICTY *Stakić* IT-97-24-T (Trial Judgment, 31 July 2003) §§88–168, 480–518, 671–712.
- ICTY *Tadić* IT-94-1-T (Trial Judgment, 7 May 1997) §§154–237.
- ICTY *Brđanin* IT-99-36-T (Trial Judgment, 1 September 2004) §§108–123, 540–558, 1051–1149.
- UN A/54/549 (15 November 1999) — Srebrenica report, contextual paragraphs on 1992 exposure.
- UN S/1994/674 (Commission of Experts Final Report, 27 May 1994), Annex VIII and Annex VIII.A.
- UN E/CN.4/1992/S-1/9 (Mazowiecki, 28 August 1992).
- UN Security Council Resolution 780 (6 October 1992) and Resolution 827 (25 May 1993).
- BB I pp. 198–229 (Ch. 9 — Prijedor and the Krajina).

## 2. Defensible Historical / Default Option

**`historical_default_response_id: "deny"`** — Historical default.

The option matches the RS political leadership's documented public response to the August 1992 exposure: characterise the camps as legitimate detention facilities, refuse independent access, treat the footage as Western propaganda. The label `Historical default` (per the Foundational packet's label taxonomy) is the correct label here, not `Historical response`, because this is the **actor-specific documented choice** — the response is at modal-decision granularity, not a general posture toward a recurring event. *Karadžić* IT-95-5/18-T §§3473–3475 records the chamber's finding on Karadžić's denial posture at the time of exposure.

**Existing JSON state (`war_1992.json` lines 1578–1612):** the `deny` option is already authored. It writes `sets_flags: { camps_response: "deny" }`, applies `patron_pressure` and `international_standing` deltas, and bumps `internal_cohesion` to reflect the hardline base. This worksheet **pins** the existing option as the historical default per the Foundational packet ruling.

**Foundational packet binding (canonical, per Sensitive-History Rulings table):**

> `concentration_camps_revealed_1992`: May be a response-to-exposure row. `deny` can be `Historical response` if sourced to ICTY-backed findings. Do not make camp operation or concealment an efficiency path.

Note: the Foundational packet uses `Historical response` in this table cell; the v1.3 packet §4.1 R4 row classifies the historical default as `deny` with the standard `Historical default` label. Both readings resolve to the same option choice; the label distinction (`Historical default` vs `Historical response`) is a downstream Game Designer / Canon Compliance question and is **not** authored here. The Historian recommendation per the actor-specific decision-event test is `Historical default`; if Canon Compliance reads the row as a response-to-exposure rather than an actor-specific decision, the label becomes `Historical response`. The Foundational packet ruling allows either.

**Hard rule (Foundational packet + Sensitive-History Gate §1 Ring 1 + v1.3 §3.6):** "Do not make camp operation or concealment an efficiency path." The `deny`, `obstruct`, and `cooperate` options manage the *response to exposure*; no option may carry `effects` that scale, extend, or operate the camp system as a player tactic. The existing JSON option set is faithful to this constraint: none of the three options authorises new camp operations, expands existing camps, or improves their concealment as a mechanical lever.

## 3. Proposed Counterfactual Options

The option set is **canon-bound by the Foundational packet** to exactly the three already-authored options:

> Per task brief: "Ring 1 (per Foundational packet `concentration_camps_revealed_1992`: option set is `deny`/`obstruct`/`cooperate`; do not expand)."

No new options are proposed. This worksheet pins the existing set as canonical and rules out any expansion. The v1.3 packet §4.1 R4 row likewise states "Ring 1 — already authored; do not expand option set."

### 3.1 `obstruct` — `Counterfactual staff path`

**Existing JSON state (`war_1992.json` lines 1613–1641):** "Controlled access. Allow limited Red Cross visits. Move the worst cases. Clean up what you can. Buy time."

Design provenance: a partially-historical posture (limited ICRC access *did* occur under sustained international pressure in subsequent weeks per *Brđanin* §§540–558), but as a player-selectable response to the *initial* exposure decision, it is not the documented public choice — it is the path the RS leadership was driven onto by patron pressure and ICRC negotiation, not what was selected at the moment of exposure. Therefore source tier `design_counterfactual` for this option **as an initial decision**; the underlying behaviour (controlled access) is itself well-sourced.

**Hard rule (Foundational packet ruling):** "Move the worst cases. Clean up what you can." in the existing narrative text describes a *temporal contemporaneous* fact (the historical evacuation/concealment of the worst Omarska conditions before ICRC visits, per *Brđanin* §§540–558) — it is **not** a player instruction to conceal evidence as a tactical efficiency lever. The effects array carries no concealment-as-efficiency `effects[]`; it carries only `patron_pressure +5`, modest dimension shifts, and `risk_level: 0.5`. This is on the right side of the §3.6 line. Phase D wiring must not add any `effects[]` that mechanically improve concealment or evidence-suppression efficiency.

### 3.2 `cooperate` — `Counterfactual staff path`

**Existing JSON state (`war_1992.json` lines 1642–1675):** "Full cooperation. Open all facilities. Release detainees. Cooperate with investigators."

Design provenance: not documented as an RS posture at any point during the war. The internal-cohesion (-5), military-credibility (-10), and `aggression_affinity: -0.8` costs in the existing JSON reflect the design intuition that this option would have produced a hardline rupture inside RS politics, possibly a leadership crisis. Source tier `design_counterfactual`.

**No expansion** beyond what is already authored. The option must not carry effects that resolve the camp-system humanitarian harm as a free political win; the existing modest `international_standing: -3` reflects that even a cooperate posture does not erase the underlying record.

## 4. Material Effects (Per §3.3 Of v1.3 Packet)

The existing JSON option set already satisfies the §2.2 `material_effect_minimum_satisfied` rule: each option carries `effects[]`, `sets_flags`, and `dimension_shifts`. Phase D wiring (out of scope here) would attach `enables_events_runtime` / `closes_events_runtime` arrays per §3.3.

| Option | `effects[]` (existing) | `sets_flags` (existing) | `dimension_shifts` (existing) |
| --- | --- | --- | --- |
| `deny` | `patron_pressure: +10` (additive to event-level `+15`) | `camps_response: 'deny'` | `international_standing: -15`; `internal_cohesion: +5`; `patron_confidence: -10` |
| `obstruct` | `patron_pressure: +5` | `camps_response: 'obstruct'` | `international_standing: -10`; `patron_confidence: -5` |
| `cooperate` | `patron_pressure: +2` | `camps_response: 'cooperate'` | `international_standing: -3`; `military_credibility: -10`; `internal_cohesion: -5` |

Proposed Phase D wiring (informational, not authored here):

| Option | `branch_tag` (proposed; not in branch-tag vocabulary stub Wave 1) | `enables_events_runtime` (targets) | `closes_events_runtime` (targets) |
| --- | --- | --- | --- |
| `deny` | `rs_camp_response_deny` | `csq_accelerated_camps_discovery_1992` (per v1.3 §4.1 R4); `london_conference_1992` (already wired via event-level `enables_events`); contributes to early NATO escalation threshold (X6) | none |
| `obstruct` | `rs_camp_response_obstruct` | `london_conference_1992`; attenuated NATO threshold | `csq_accelerated_camps_discovery_1992` (if foreclosure is the right semantics — Canon Compliance question) |
| `cooperate` | `rs_camp_response_cooperate` | `london_conference_1992` (with improved international-standing context); ICTY-establishment tempo branch | maximalist patron-pressure follow-on; `csq_accelerated_camps_discovery_1992` |

**Note on branch-tag vocabulary:** the Wave 1 vocabulary stub (`20260527_EVENT_FAMILY_BRANCH_TAG_VOCABULARY.md`) does not yet include `rs_camp_response_*` tags. This worksheet proposes three new primitive tags under the "RS Family" section; the Wave 2 vocabulary extension must include them before Phase B locks the TypeScript file.

**§3.6 hard rule (v1.3 packet):** none of the three options may carry `effects` that extend, continue, or scale the camp system as a player-authored act. The existing JSON satisfies this rule. Phase D must not weaken it by adding (for example) a `dimension_shifts` improvement that would only be physically explicable through camp-evidence concealment.

## 5. Sensitive-History Ring And Source Note

**Ring:** Ring 1. This row is a response-to-exposure event for a Ring 1 / Gate §1 atrocity already in state. The option set is canon-bound by the Foundational packet ruling; the engine atrocity machinery (paramilitary_sweep, displacement, war_crimes_events) is the Ring 1 surface that already produced the camp system before this row fires. This row asks the player how to respond to international exposure of that surface, not whether to authorise it.

**Gate §3 paramilitary boundary:** This row does NOT authorise paramilitary deployment. The Gate §3 player-authorized war-crime surface remains `state.military.paramilitary_policy` (R2). The `camps_response` flag is a *political/diplomatic* posture flag, not a war-crime authorisation surface. Phase D wiring must not let any of the three options' `enables_events_runtime` open a downstream event whose own trigger condition is satisfied by author-selected escalation rather than by emergent state.

**Source note for the modal (draft, per §5 of v1.3 packet):**

> ITN footage from Omarska and Trnopolje broadcast 6 August 1992 (Penny Marshall, Ian Williams, Ed Vulliamy). ICTY *Karadžić* (IT-95-5/18-T) §§2470–2509, 3469–3475, 3505–3524 found that Karadžić knew of the camps and that the camp system was an instrument of the Joint Criminal Enterprise's common purpose. *Stakić* (IT-97-24) §§480–518, 671–712 and *Tadić* (IT-94-1-T, 7 May 1997) §§154–237 established the camp system's conditions and command structure. *Brđanin* (IT-99-36-T) §§540–558, 1051–1149 documented the ARK Crisis Staff's role and the limited/managed nature of subsequent ICRC access. UN E/CN.4/1992/S-1/9 (Mazowiecki, 28 August 1992) and UN S/1994/674 Annex VIII document the camp system contemporaneously. UN Security Council Resolution 780 (6 October 1992) established the Commission of Experts whose work led to ICTY establishment by Resolution 827 (25 May 1993).

**Source tier:** `icty_icj_un`.

**Existing JSON `historical_source` (line 1709):** "ITN footage August 1992. ICTY Karadzic Judgment. BB Vol. I Ch. 9." — adequate at modal granularity; deeper citations live in Codex/Records.

## 6. Downstream Opens / Closes (Per §3.3)

R4 is opened by R1 `rs_strategic_goals` flag being set (any value) AND the existing trigger condition: `faction_controls_municipality(RS, prijedor, 0.5) AND war_crimes_above(RS, 3)`. The trigger condition is **emergent**: it reads engine state (control + war-crimes counter from the existing paramilitary_sweep engine) rather than calendar-railroading. This satisfies the v1.3 §3.6 rule against atrocity-as-lever gating.

Existing event-level `enables_events: ["london_conference_1992"]` (line 1565–1567) already wires the diplomatic downstream. Phase D would add response-option-level `enables_events_runtime` / `closes_events_runtime` per §4 table above.

- **Opens (existing, event-level):** `london_conference_1992` regardless of response option chosen — the conference happens because the exposure happens.
- **Opens (proposed Phase D, response-level):** per §4 table — accelerated camps discovery (csq_*) on `deny`; ICTY-tempo branch on `cooperate`; early NATO escalation threshold (X6) on `deny`.
- **Closes (proposed Phase D):** maximalist patron-pressure follow-on on `cooperate`; full international-isolation cascade on `cooperate`.
- **Consequence-only (no player decision):** ICTY establishment (`icty_established_1993`, war_1993.json line 1641) — this fires on turn 60 regardless and is consequence-only, NOT a player decision row.

## 7. Open Questions Deferred To Canon Compliance Review

1. **Label resolution:** the Foundational packet table cell for `concentration_camps_revealed_1992` reads `Historical response`; v1.3 §4.1 R4 reads `Historical default`. Canon Compliance Reviewer to resolve. Historian recommendation: `Historical default` because the decision is actor-specific at modal granularity, not a recurring posture. If resolved as `Historical response`, the modal label string changes but the option choice does not.
2. **`obstruct` provenance:** the option mixes historical fact (ICRC negotiation occurred under pressure) and counterfactual framing (selected at modal-decision moment). Recommend Canon Compliance pin this as `design_counterfactual` for the *decision*, not for the underlying behaviour. The `historical_marker` field on the option (per Foundational packet) should be `counterfactual`.
3. **`bot_response_logic: "strategic_weighted"` (line 1564):** the existing JSON uses `strategic_weighted`, not `historical`. The Foundational packet calibration baseline requires `historical` for the historical bot path. Phase D wiring must switch to `historical` and pin option 0 (`deny`) as the historical default; otherwise the historical-bot calibration probe will not exercise the canonical RS response.
4. **`csq_accelerated_camps_discovery_1992`:** target referenced in v1.3 §4.1 R4 but not yet authored in `consequences.json`. Canon Compliance to confirm whether this is a pending csq_* row or whether the §3.6 dangling-reference rule rejects Phase D wiring until it is authored.
5. **NATO threshold (X6):** the v1.3 §4.1 R4 row mentions "early NATO threshold" as a downstream. NATO escalation gates are composite / engine-driven per v1.3 §4.4 X6, not a single event row. Phase F (peace-plan and late-war branches) coordinates X6; R4 Phase D wiring may need to defer the X6 connection until Phase F.
