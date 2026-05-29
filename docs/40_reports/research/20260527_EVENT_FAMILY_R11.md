# Event Family Worksheet — R11: Karadžić / Mladić Split (1995)

**Family ID:** `rs_karadzic_mladic_split`
**Packet row:** v1.3 packet §4.1 R11 (RS families)
**Sensitive ring:** Ring 2 — internal RS command politics, no Ring-1 atrocity surface in the decision row itself
**Source tier:** A (`icty_icj_un`)
**Date:** 2026-05-27
**Author lane:** Historian (Phase A research worksheet)
**Status:** Phase A — research only. No JSON, code, or canon edits. **Existing row** `karadzic_mladic_split_1995` already authored in `data/scenarios/events/war_1995.json` lines 755–882; this worksheet pins that row as canonical and records its sourcing.

---

## 1. Cited Historical Narrative

On 4 August 1995 — the day Croatian forces launched Operation Storm against the Republic of Serbian Krajina — Radovan Karadžić, as President of Republika Srpska, issued a decree purporting to remove General Ratko Mladić from command of the VRS Main Staff and assume personal command authority. Karadžić attributed the dismissal to operational failures at Grahovo and Glamoč (which had fallen to HV/HVO forces in Operation Summer '95, 25–29 July 1995, opening the western approaches that Operation Storm subsequently exploited).

The dismissal triggered an immediate revolt by the VRS officer corps. Eighteen senior VRS officers, including all five corps commanders, signed an open letter declaring loyalty to Mladić and refusing to recognize the dismissal. Karadžić's order was not implemented in the field; for seven days, command authority within Republika Srpska was contested between Pale (political) and Han Pijesak (Main Staff). On **11 August 1995**, Karadžić formally rescinded the order. Mladić remained in command for the remainder of the war.

The crisis is documented in the ICTY record:

- **ICTY *Karadžić* IT-95-5/18-T (Trial Judgment, 24 March 2016)** §§5648–5703 records the dismissal attempt, the officer revolt, the seven-day standoff, and the 11 August rescission. The trial chamber treated the episode as evidence of the ongoing operational unity-of-purpose between Karadžić and Mladić under the Joint Criminal Enterprise — the dismissal was a political-management dispute, not a substantive disagreement over the JCE's common purpose. The chamber further noted that the dismissal attempt followed Karadžić's own deep involvement in the Srebrenica directive (Directive 7, 8 March 1995) and the Krivaja-95 planning chain, undercutting any later defense theory that Karadžić sought to distance himself from Mladić's conduct.
- **ICTY *Mladić* IT-09-92-T (Trial Judgment, 22 November 2017)** §§4762–4778 contextualizes the dismissal within the broader VRS command structure. The chamber found Mladić's continued exercise of command authority during and after the contested period, including command responsibility for ongoing operations against Goražde, Sarajevo, and Bihać.
- **Witness testimony at *Karadžić*** (notably testimony of Milan Gvero, Manojlo Milovanović, and Zdravko Tolimir) confirmed the officer-corps response and the 11 August rescission timeline.
- **UN A/54/549 (15 November 1999)** §§270–280 contextual reference within the Srebrenica fall report.

Operationally: the dismissal attempt did not interrupt VRS field operations in the Bihać sector or the consolidation operations following the fall of Srebrenica and Žepa. The VRS chain of command continued functioning under Mladić throughout the seven-day political crisis. (BB II pp. 358–366 operational chronology.)

The historical action of the AWWV-relevant actor — Karadžić as RS President — was to **back down**: rescind the order, accept that the army's loyalty lay with Mladić, and proceed to Dayton with the political-military relationship visibly strained but functionally intact.

**Citations:**
- ICTY *Karadžić* IT-95-5/18-T §§5648–5703 (dismissal attempt, officer revolt, rescission).
- ICTY *Mladić* IT-09-92-T §§4762–4778 (command-continuity contextual).
- ICTY *Karadžić* witness testimony: Gvero, Milovanović, Tolimir (publicly available trial transcripts, 2013–2014 testimony windows).
- UN A/54/549 §§270–280 — contextual.
- BB II pp. 358–366 — operational chronology, 25 July – 14 August 1995.

## 2. Defensible Historical / Default Option

**`historical_default_response_id: "back_down"`** — Historical default.

Per the row currently authored at `data/scenarios/events/war_1995.json:820`:

> *"Rescind the order -- Mladic stays. Admit defeat. Mladic remains in command. Your authority is diminished, but the army's command structure is preserved at a critical moment."*

This option matches the documented action of the historical actor (Karadžić as RS President). The 11 August 1995 rescission is the canonical event recorded by ICTY *Karadžić* §§5648–5703. The label `Historical default` is defensible under the Foundational packet label taxonomy: the option matches the actor-specific choice documented by the tribunal, with date-specific evidence.

**Material effects already authored (existing JSON, lines 820–847):** `morale_change: +3`; `internal_cohesion: -5`; `military_credibility: +5`; `sets_flags: karadzic_mladic_crisis = "backed_down"`; `aggression_affinity: 0`; `risk_level: 0.3`. These represent the historical outcome: the army's command structure is preserved (positive military credibility, modest morale recovery from immediate crisis ebb), at the cost of visible political-military friction (negative internal cohesion).

**Source note in current row (line 881):** *"ICTY Karadzic Judgment (IT-95-5/18-T). Mladic Judgment (IT-09-92-T). ICTY witness testimony."* — already correctly tier A.

## 3. Proposed Counterfactual Options

The current row authors **one** counterfactual: `remove_mladic` (lines 786–818). No new options proposed by this Phase A worksheet; the option set is pinned at two as canonical.

### 3.1 `remove_mladic` — `Counterfactual staff path`

*"Press the dismissal -- assert political control. Force Mladic out. You may lose the army's loyalty, but civilian authority over the military must be established. The officer corps will resist."*

**Design provenance:** A plausible alternative path in which Karadžić holds the dismissal through the officer revolt, accepting the operational cost of a command-replacement crisis at the worst possible moment (Operation Storm aftermath, NATO Deliberate Force imminent, Srebrenica and Žepa just fallen). The counterfactual rests on the documented existence of the officer revolt — *if* Karadžić had not rescinded, the recorded officer-corps loyalty to Mladić would have produced either a substantive command-paralysis crisis or a forced reorganization that bypassed the political leadership. Neither outcome is in the historical record; the option is `Counterfactual staff path`, source tier `design_counterfactual`.

**Material effects already authored (existing JSON, lines 789–817):** `cohesion_change: -10`; `morale_change: -5`; `internal_cohesion: -20`; `military_credibility: -15`; `sets_flags: karadzic_mladic_crisis = "mladic_removed"`; `aggression_affinity: -0.3`; `risk_level: 0.9`. These reflect the modeled cost of holding the dismissal: severe internal cohesion damage, military credibility collapse (the army's chain of command is in revolt), and a defensive posture shift (negative aggression affinity, high risk level).

**Hard rule (Gate §1 Ring 3 + v1.3 §3.6):** Neither option authorizes any new sensitive-history act. The command dispute is an internal RS political-military matter; downstream atrocity at Srebrenica (already fallen by the time R11 fires at turn 174–175) and ongoing Sarajevo siege casualties flow from existing Ring 1 engines (rupture predicate already satisfied at turn ≥140; engine combat resolution for siege incidents), not from R11. The R11 worksheet does NOT propose adding a third option that would lever atrocity (e.g., "use the crisis to authorize wider paramilitary action") — that would fall under §3.6 continuation-of-act and is rejected.

## 4. Material Effects (Per §3.3 Of v1.3 Packet)

| Option | `effects[]` | `sets_flags` | `dimension_shifts` |
| --- | --- | --- | --- |
| `back_down` (historical default) | `morale_change` (RS, +3) | `karadzic_mladic_crisis: "backed_down"`; `karadzic_mladic_crisis_occurred: true` | `internal_cohesion: -5`; `military_credibility: +5` |
| `remove_mladic` (counterfactual) | `cohesion_change` (RS, -10); `morale_change` (RS, -5) | `karadzic_mladic_crisis: "mladic_removed"`; `karadzic_mladic_crisis_occurred: true` | `internal_cohesion: -20`; `military_credibility: -15` |

**§3.6 hard rule (v1.3 packet):** Neither option's `effects` or `sets_flags` extends, continues, or scales any sensitive-history act in state at fire-time. The `morale_change` and `cohesion_change` effects are internal RS political-military adjustments; they do not authorize new hostage-taking, paramilitary deployment beyond `paramilitary_policy` (which is R2's surface, not R11's), or any other Ring-3 act. The downstream `karadzic_mladic_crisis` flag is a posture record, not an authorization. **No §3.6 boundary concern at R11.**

**Phase D wiring (informational, not authored here):**

| Option | `enables_events_runtime` (targets) | `closes_events_runtime` (targets) |
| --- | --- | --- |
| `back_down` | none — historical path proceeds to Dayton via R14/R15 | none |
| `remove_mladic` | `csq_vrs_command_paralysis` (counterfactual cascade event — would need Phase D authoring, gated by Game Designer); potentially modulate `nato_deliberate_force_1995` (X6) intensity downward if VRS is in command paralysis; potentially close late-1995 VRS offensive options on the Bihać front | `csq_political_split_temporary` (already named in v1.3 packet §4.1 R11 row downstream-opens cell) — if `back_down` fires, this csq is closed because the split was resolved within seven days; `remove_mladic` keeps it open |

## 5. Sensitive-History Ring And Source Note

**Ring:** Ring 2 — narrative representation of an internal RS political-military command dispute. The decision row itself does not author atrocity; it records a historically attested political-leadership choice with cited ICTY tribunal context.

Ring 1 surfaces remain owned by their canonical sites (`paramilitary_sweep.ts`, `enclave_resilience.ts`, `displacement.ts`, `rupture_consequences.ts`); none is touched by R11.

**Source note for the modal (draft, per §5 of v1.3 packet):**

> On 4 August 1995 — the day Operation Storm began — Radovan Karadžić issued a decree dismissing General Ratko Mladić from command of the VRS Main Staff. Eighteen senior VRS officers, including all five corps commanders, refused to recognize the dismissal and declared loyalty to Mladić. After seven days of contested authority, Karadžić rescinded the order on 11 August 1995. ICTY *Karadžić* (IT-95-5/18-T) §§5648–5703 records the episode within the JCE narrative; ICTY *Mladić* (IT-09-92-T) §§4762–4778 contextualizes the command continuity. The historical action of the RS Presidency was to back down.

**Source tier:** `icty_icj_un`.

## 6. Downstream Opens / Closes (Per §3.3)

R11 fires within `trigger.turn_min: 174, turn_max: 175` (already authored). It is not gated by R1 / R2; it is gated by calendar position because the Operation Storm trigger (Croatian operation, exogenous to RS faction choice) is the operative driver.

- **Opens (via flag `karadzic_mladic_crisis`):** Both options enable downstream consumption of the flag by Cost Ledger / Records / Codex / Chronicle narration. The `back_down` value enables the historical-default Dayton track; the `mladic_removed` value enables a Phase D counterfactual cascade.
- **Closes:** `back_down` closes `csq_political_split_temporary` (the split was resolved within seven days). `remove_mladic` closes the historical Dayton-with-Mladić-present-as-COS track and enables a counterfactual command-paralysis cascade.
- **No engine consumer beyond flag-read:** Unlike R2 (paramilitary policy → `paramilitary_sweep.ts`), R11 does not currently route into a Ring-1 engine consumer. The Phase D wiring discussion above is informational only.

## 7. Open Questions Deferred To Canon Compliance Review

1. **§3.6 boundary check (this worksheet's only §3.6-relevant flag):** Confirm that R11's `remove_mladic` counterfactual option, as currently authored with `aggression_affinity: -0.3` and `risk_level: 0.9`, does not inadvertently create a Ring-1 atrocity-as-lever surface through downstream `bot_priority_shift` effects in a future Phase D wiring. Recommend: explicit Phase D rule that any downstream `csq_vrs_command_paralysis` event authored to consume `karadzic_mladic_crisis: "mladic_removed"` must NOT carry response options that re-author paramilitary deployment, cleansing, or hostage-taking. This is a forward-looking §3.6 guard, not a present concern with the authored row.
2. The current row's `bot_response_logic: "personality_weighted"` (line 767) is different from R10/R12/R13 which use `"historical"`. The v1.3 packet's `bot_response_logic: 'historical'` convention applies broadly; `"personality_weighted"` was an earlier-era setting. Recommend: change to `"historical"` so the bot calibration resolves to `back_down` per the documented historical action, with personality-weighted variance off the historical bot calibration path. Defer to Game Designer Phase C; not authored here.
3. Whether the row's `pressure: { base_rate: 3.0, threshold: 3, ... }` (line 187 of the un_hostage_crisis row, but R11 at line 759 onward does NOT use pressure — confirm via re-read) should be added to R11 to allow the event to fire earlier if Bihać sector pressure is high. Recommend: no — the historical crisis was triggered by Operation Storm specifically (calendar-position event), not by accumulated RS internal pressure. Keep the trigger as a turn-window, consistent with the historical record.
4. Whether the row's source citation should be strengthened to include the specific witness names (Gvero, Milovanović, Tolimir) and the 11 August 1995 rescission date in the modal source note draft. Recommend: yes for the date, no for individual witnesses (modal source notes per Foundational packet "Source Standards" should be compact; deeper citations route to Codex/Records). Defer to Narrative Designer.
