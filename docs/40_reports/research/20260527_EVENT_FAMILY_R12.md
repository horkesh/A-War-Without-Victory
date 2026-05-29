# Event Family Worksheet — R12: UN Hostage Crisis (May 1995)

**Family ID:** `rs_hostage_crisis_1995`
**Packet row:** v1.3 packet §4.1 R12 (RS families)
**Sensitive ring:** **Ring 1/2 boundary** — the hostage-taking act is Ring 1 (war crime, ICTY-convicted); the player's response-to-existing-state choice is Ring 2, admissible only under v1.3 packet §3.6 continuation-of-act clause
**Source tier:** A (`icty_icj_un`)
**Date:** 2026-05-27
**Author lane:** Historian (Phase A research worksheet)
**Status:** Phase A — research only. No JSON, code, or canon edits. **Existing row** `un_hostage_crisis_1995` already authored in `data/scenarios/events/war_1995.json` lines 173–318; this worksheet pins that row as canonical, records its sourcing, and **invokes v1.3 packet §3.6 verbatim to justify the admissibility of the `maintain_hostages` counterfactual option**.

---

## 1. Cited Historical Narrative

On **25–26 May 1995**, in retaliation for NATO airstrikes on a VRS ammunition depot at Pale (authorized under UNSC Resolution 836 as enforcement of the safe-area regime — see R10 worksheet), VRS units across Republika Srpska seized **377 UN peacekeepers and military observers** as hostages. Approximately 199 were drawn from UNPROFOR (predominantly French, British, Canadian, Russian, and Ukrainian contingents); the remainder were unarmed UN Military Observers. The hostages were dispersed across more than 30 VRS facilities and forward positions; television footage on 26–27 May 1995 showed peacekeepers chained or handcuffed to potential NATO target sites — ammunition bunkers, command-and-control facilities, communications towers, and the Jahorina radar installation — explicitly intended as human shields against further air strikes.

The hostage-taking and use as human shields are war crimes under Common Article 3 of the Geneva Conventions and Additional Protocol I. The ICTY made conviction findings on both grounds:

- **ICTY *Karadžić* IT-95-5/18-T (Trial Judgment, 24 March 2016) — Count 11 (Taking of Hostages, a violation of the laws or customs of war).** §§5810–5876 records the seizure, dispersal, human-shield use, and Karadžić's command responsibility. The trial chamber found that Karadžić, as Supreme Commander of the VRS, had effective control and either ordered, authorized, or failed to prevent the hostage-taking. §§5828–5847 document the human-shield use. Karadžić was convicted on Count 11. The Appeals Chamber affirmed the conviction (Karadžić Appeal Judgment IT-95-5/18-A, 20 March 2019).
- **ICTY *Mladić* IT-09-92-T (Trial Judgment, 22 November 2017)** — Count 6 (hostage-taking) within the broader indictment. §§5169–5215 record Mladić's command responsibility for the hostage operation, including communications with subordinate corps commanders authorizing dispersal and human-shield placement. Mladić was convicted on Count 6.
- **UN Security Council Resolution 998 (16 June 1995)** authorized the creation of the **Rapid Reaction Force** (RRF) — a heavy brigade-strength reinforcement of UNPROFOR with French, British, and Dutch artillery — in direct response to the hostage crisis. UNSCR 998 PP3 records the Council's "outrage" at the seizure of UN personnel.
- **UN Secretary-General report S/1995/444 (30 May 1995)** documented the hostage situation contemporaneously.

The hostage release was negotiated **gradually** between **2 June and 18 June 1995**. Key dates: 2–4 June (first 121 released through Pale–Belgrade channel); 7–10 June (next tranche); 13–18 June (final group). The releases were brokered primarily through Slobodan Milošević's intervention in Belgrade and through direct French diplomacy (the seizure of two French Mirage 2000 pilots on 30 August 1995 during Operation Deliberate Force is a *later, separate* incident, ICTY *Karadžić* §§5871–5874). The pattern of release was *gradual, exchange-mediated, not a unilateral surrender*: each tranche traded for diplomatic concessions including NATO bombing pauses and a guarantee that the French Mirage pilots seized later in August would be protected.

The historical action of the AWWV-relevant actor — Karadžić as RS President — was to **release the hostages gradually** under combined patron and Western diplomatic pressure, having first extracted the operational benefit of an immediate NATO bombing pause. This is the documented historical path.

**Citations:**
- ICTY *Karadžić* IT-95-5/18-T §§5810–5876 (Count 11 — hostage-taking conviction).
- ICTY *Karadžić* IT-95-5/18-A (Appeal Judgment, 20 March 2019) — affirmed Count 11.
- ICTY *Mladić* IT-09-92-T §§5169–5215 (Count 6 — hostage-taking conviction).
- UNSC Resolution 998 (16 June 1995) — S/RES/998 (1995).
- UN Secretary-General Report S/1995/444 (30 May 1995).
- UN A/54/549 §§198–215 — contextual within the Srebrenica fall report.
- BB II pp. 312–321 — operational chronology, 25 May – 18 June 1995.

## 2. Defensible Historical / Default Option

**`historical_default_response_id: "release_gradually"`** — Historical default.

Per the row currently authored at `data/scenarios/events/war_1995.json:249`:

> *"Release hostages in exchange for concessions. Trade hostages for guarantees. Some diplomatic damage can be contained. NATO may hesitate to strike again."*

This option matches the documented action of the historical actor (Karadžić, mediated through Milošević's Belgrade channel and Western diplomatic intervention). The 2–18 June 1995 gradual release is the canonical event recorded by ICTY *Karadžić* §§5810–5876 and *Mladić* §§5169–5215. The label `Historical default` is defensible under the Foundational packet label taxonomy: the option matches the actor-specific choice documented by ICTY, with date-specific evidence.

**Material effects already authored (existing JSON, lines 253–283):** `patron_pressure: +5`; `international_credibility: -10`; `sets_flags: un_hostage_response = "gradual_release"`; `international_standing: -10`; `negotiating_leverage: +5`; `aggression_affinity: 0`; `risk_level: 0.5`. These represent the historical outcome: modest patron pressure (Milošević's intervention extracted political cost), significant international credibility damage (UN/NATO did not forget the chaining-to-targets imagery), but a measurable negotiating leverage gain from the NATO bombing pause.

## 3. v1.3 Packet §3.6 Verbatim — Continuation-Of-Act Clause

**This worksheet reproduces the v1.3 packet §3.6 last bullet verbatim, as required by the author rules, to ground the admissibility of the `maintain_hostages` counterfactual option below.** The verbatim text from `docs/40_reports/proposals/20260527_EVENT_DATABASE_RUNTIME_SEMANTICS_PACKET.md` §3.6 (line 193 of that file):

> A response option whose `effects` or `sets_flags` extend, continue, or scale a sensitive-history act already in state at fire-time — including hostage detention, paramilitary deployment beyond the canonical `paramilitary_policy` surface, cleansing, civilian targeting, or camp operation. The Gate's player-authorized war-crime surface is `paramilitary_policy`; no other response-option path may authorize new sensitive acts. Existing `un_hostage_crisis_1995 → maintain_hostages` is a response-to-existing-state crisis, not authorization of new hostage-taking, and is permitted under this rule.

The §3.6 ruling is therefore explicit and named-row-specific: **the `un_hostage_crisis_1995` row's `maintain_hostages` option is the canonical example v1.3 §3.6 uses to define the boundary**. The hostages are already seized at fire-time (377 UN personnel, dispersed across VRS facilities, human-shielded — Ring 1 act, ICTY-convicted, in state at fire-time). The player faction's choice is *how to respond to the crisis it inherits*, not whether to commit hostage-taking as a new act. The §3.6 clause admits this configuration explicitly.

## 4. Proposed Counterfactual Options

The current row authors **one** counterfactual: `maintain_hostages` (lines 215–248). No new options proposed by this Phase A worksheet; the option set is pinned at two as canonical, with the §3.6 admissibility argument above as the operative justification.

### 4.1 `maintain_hostages` — `Counterfactual staff path` (admissible per v1.3 §3.6)

*"Hold hostages until NATO guarantees no more strikes. Maximum leverage. NATO stops bombing. But every day the hostages remain deepens the diplomatic catastrophe."*

**Admissibility argument (the load-bearing §3.6 case for this row):**

1. **The Ring-1 act is already in state at fire-time.** The 377 UN personnel were seized on 25–26 May 1995 by VRS units acting under existing command authority. The seizure is a Ring-1 fact when the event fires (`trigger.turn_min: 160`); the engine renders this as `un_hostage_crisis_occurred: true` and the effects array's `humanitarian_impact { war_crimes_delta: 1 }` records the war crime that has *already happened*. This `war_crimes_delta` is the engine's automatic counter increment for the **act-in-state**, not a player-authored new act — analogous to R1's `aggressive` option's `war_crimes_delta: 2` (Foundational packet rules for R1).
2. **The option does not author new seizures.** `maintain_hostages` does NOT add new hostages, expand the hostage population, authorize new seizures elsewhere, or scale the human-shield deployment beyond what is in state. It is a **temporal extension** of the existing detention, not an extension by scope. The §3.6 clause's "extend, continue, or scale" language requires careful reading: a literal-textual reading would foreclose `maintain_hostages` because *holding for longer* is *continuing the act*. The packet's named-row exemption resolves this: the v1.3 packet §3.6 author explicitly classifies *temporal continuation of the inherited detention* as response-to-existing-state, not as new authorization.
3. **The Gate §3 canonical player-authorized war-crime surface remains `paramilitary_policy` only.** No other surface — including `un_hostage_response` — authorizes new sensitive acts. R12 does not add a new authorization surface; it gates the **diplomatic response** to an inherited crisis. The flag set (`un_hostage_response: "maintain"`) is a posture record on a crisis that fired exogenously to R12.
4. **The downstream coupling is diplomatic and patron-pressure-routed, not act-routed.** The option's effects are: `patron_pressure: +10`, `international_credibility: -20`, `international_standing: -20`, `patron_confidence: -15`, `aggression_affinity: 0.8`, `risk_level: 0.9`. None of these effects calls into `paramilitary_sweep.ts`, `displacement.ts`, or any other Ring-1 atrocity-authoring engine. The effects route to the negotiation system and the international-standing dimension — the appropriate surfaces for a diplomatic-fallout decision.
5. **Bounded by the §3.6 last sentence — named row.** Because the v1.3 packet §3.6 specifically names `un_hostage_crisis_1995 → maintain_hostages` as the permitted example, the configuration is canon-bound. Any future variant of R12 (different counter-incrementing pattern, different downstream wiring, different option labels) would need re-verification against §3.6; the *named* configuration is admissible.

**Design provenance:** A plausible alternative path in which Karadžić rejects Milošević's pressure to release and holds the hostages until NATO formally guarantees no further air strikes. The historical record records that Karadžić *did* extract a NATO bombing pause as part of the gradual-release deal; the counterfactual extends that bargain to demand a formal multilateral guarantee. The path is not documented as the historical action; the option is `Counterfactual staff path`, source tier `design_counterfactual`.

**Material effects already authored (existing JSON, lines 215–248):** `patron_pressure: +10`; `international_credibility: -20`; `sets_flags: un_hostage_response = "maintain"`; `international_standing: -20`; `patron_confidence: -15`; `aggression_affinity: 0.8`; `risk_level: 0.9`. These reflect the modeled cost of holding: severe international standing and patron confidence damage (Milošević is the patron whose channel was the historical release vector — refusing his pressure burns the patron relationship), and a high-risk-level / high-aggression-affinity counterfactual posture.

### 4.2 Why no third option is proposed

A "release immediately, unilaterally, without concession-extraction" option is **not** proposed because:

1. It is not in the historical record (no documented Karadžić channel proposed an unconditional immediate release).
2. It would functionally model "the RS faction freely surrenders its leverage in response to a crisis it caused" — design provenance is weak.
3. The two-option set (historical default + one bounded counterfactual) matches the R11 pattern and is the v1.3 packet's intended shape for crisis-response rows.

**Hard rule (Gate §1 Ring 3 + v1.3 §3.6):** No future R12 expansion may add an option that authorizes new hostage-taking, new human-shield deployment, expanding the hostage population, applying detention to new categories of personnel (e.g., journalists, NGO workers, declared protected persons), or extending the detention to any group not in state at fire-time. The §3.6 named-row admissibility is bounded by the *existing seizure*; any expansion of *scope* (rather than *time*) falls outside §3.6 and is foreclosed.

## 5. Material Effects (Per §3.3 Of v1.3 Packet)

| Option | `effects[]` | `sets_flags` | `dimension_shifts` |
| --- | --- | --- | --- |
| `release_gradually` (historical default) | `patron_pressure` (RS, +5); `negotiation_capital` (RS, international_credibility, -10) | `un_hostage_response: "gradual_release"`; `un_hostage_crisis_occurred: true` | `international_standing: -10`; `negotiating_leverage: +5` |
| `maintain_hostages` (counterfactual, §3.6 admissible) | `patron_pressure` (RS, +10); `negotiation_capital` (RS, international_credibility, -20) | `un_hostage_response: "maintain"`; `un_hostage_crisis_occurred: true` | `international_standing: -20`; `patron_confidence: -15` |

**Event-level effects already authored (lines 197–212):** `morale_change` (RBiH, -5) — the RBiH morale impact of seeing NATO bombing paused mid-crisis; `humanitarian_impact` (RS, `war_crimes_delta: 1`) — engine counter increment for the **act in state**, per §3 admissibility argument above; `narrative` — the modal opening text.

**§3.6 boundary check (this is THE row §3.6 was written for):** The `release_gradually` option does NOT extend, continue, or scale the hostage detention — it resolves it. The `maintain_hostages` option extends the detention temporally but does NOT scale by scope (no new seizures, no new categories, no new locations). The v1.3 packet §3.6 last sentence names this configuration as the permitted example. **The named-row admissibility is the canon-binding clause; this worksheet relies on it explicitly.**

**Phase D wiring (informational, not authored here):**

| Option | `enables_events_runtime` (targets) | `closes_events_runtime` (targets) |
| --- | --- | --- |
| `release_gradually` | `nato_deliberate_force_1995` (X6) — historical path proceeds; Holbrooke / Milošević negotiation track | counterfactual NATO-pause-continued cascade |
| `maintain_hostages` | counterfactual NATO-pause-continued cascade (would need Phase D authoring, gated by Game Designer); patron-relationship rupture cascade with Milošević | the historical Deliberate Force August-launch window (or delay it) |

## 6. Sensitive-History Ring And Source Note

**Ring:** Ring 1/2 boundary. The hostage-taking *act* is Ring 1 (war crime, ICTY-convicted on Count 11 *Karadžić* / Count 6 *Mladić*). The *response-to-existing-state decision* is Ring 2, admissible only because v1.3 packet §3.6 explicitly names this row as the permitted example of response-to-existing-state crisis handling.

**Source note for the modal (draft, per §5 of v1.3 packet):**

> Between 25–26 May 1995, VRS units seized 377 United Nations peacekeepers and military observers in retaliation for NATO airstrikes on the Pale ammunition depot. Hostages were dispersed across more than 30 VRS facilities and forward positions; many were chained or handcuffed to potential NATO targets as human shields. ICTY *Karadžić* (IT-95-5/18-T) Count 11 §§5810–5876 and ICTY *Mladić* (IT-09-92-T) Count 6 §§5169–5215 convicted both commanders of hostage-taking. UN Security Council Resolution 998 (16 June 1995) authorized the Rapid Reaction Force in response. Hostages were released gradually between 2 and 18 June 1995 through Milošević's Belgrade channel and Western diplomatic intervention.

**Source tier:** `icty_icj_un`.

**Source note in current row (line 317):** *"ICTY Karadzic Judgment (IT-95-5/18-T), Count 11 (hostage-taking). Mladic Judgment (IT-09-92-T). UNSCR 998 (1995)."* — already correctly tier A; matches this worksheet's recommendation.

## 7. Downstream Opens / Closes (Per §3.3)

R12 fires within `trigger.turn_min: 160, turn_max: 163` with a pressure model (`base_rate: 3.0, threshold: 3`) that accelerates the fire if `operation_flash_occurred = true` (the Croatian Operation Flash, 1–3 May 1995 against Western Slavonia — a separate exogenous Croatian operation). The pressure model reflects the historical sequencing: Western Slavonia → NATO Pale strikes → hostage retaliation.

- **Opens (via flag `un_hostage_response`):** Both options enable downstream consumption of the flag by Cost Ledger / Records / Codex / Chronicle narration. The `gradual_release` value enables the historical Deliberate Force track (X6 / R13). The `maintain` value enables a Phase D counterfactual NATO-pause-continued cascade.
- **Sets `un_hostage_crisis_occurred: true`** regardless of option chosen — this is consumed by `srebrenica_falls_1995` pressure modifier (lines 366–373 of `war_1995.json`: `rate_bonus: 1`) which accelerates the Srebrenica fall pressure when the hostage crisis has occurred. Both R12 options therefore accelerate Srebrenica; this is canonically correct (the historical timeline has both events in May–July 1995, causally linked).
- **Closes:** `release_gradually` closes counterfactual NATO-pause-continued chains. `maintain_hostages` closes (or delays) the Deliberate Force August launch and may close the historical Dayton-track timing.

**Engine consumers downstream of R12 flags:**
- `srebrenica_falls_1995` pressure modifier (existing) — `un_hostage_crisis_occurred` accelerates the rupture.
- `nato_deliberate_force_1995` (X6) — fires August 1995 in the historical path; Phase D may wire `maintain_hostages` to delay or modulate the X6 trigger.

## 8. Open Questions Deferred To Canon Compliance Review

1. **§3.6 boundary review (the load-bearing question for this worksheet):** Confirm with Canon Compliance that the v1.3 packet §3.6 last-sentence named-row admissibility (`un_hostage_crisis_1995 → maintain_hostages` permitted as response-to-existing-state) holds at face value. The §3 admissibility argument in this worksheet rests on the packet author's explicit naming of the row as the canonical example. **§3.6 concern flag:** The boundary between *temporal continuation* and *scope expansion* is the live edge. The current authored option's `aggression_affinity: 0.8` is high; if a Phase D `enables_events_runtime` arrayed `csq_nato_pause_continued` and then chained to a downstream event that authorized *new* hostage-style detentions (e.g., journalists, NGO workers), the chain would breach §3.6 — by *route* rather than by direct authoring. Recommend: Phase B/D loader test asserting that no event downstream-enabled by `un_hostage_response: "maintain"` carries response options that author new hostage-taking, new human-shield use, or detention expansion. This is a forward-looking §3.6 guard.
2. **War-crimes counter at the event level (lines 204–207).** The `humanitarian_impact { war_crimes_delta: 1 }` is at the event level, not the option level — it fires regardless of player choice. This is canonically correct under the §3 argument (the act is in state at fire-time; the counter records the act-in-state, not the option). Confirm that Canon Compliance reads this the same way; recommend documenting the canon interpretation in the row's `source_note` field (currently lines 317) to head off future re-litigation.
3. **`maintain_hostages` `aggression_affinity: 0.8`** is the highest in the row. Confirm that the bot calibration (`bot_response_logic: "historical"` on line 185) resolves to `release_gradually` for the RS historical bot, and that the `0.8` affinity on `maintain_hostages` does not pull the personality-weighted bot calibration off the historical path. Recommend: Phase C presidential-acceptance probe test that pins RS bot resolves to `release_gradually` on the historical-default calibration path.
4. The Foundational packet's `un_hostage_crisis_1995` ruling cell reads: *"May ask the player how to respond to crisis/fallout, never whether to authorize hostage-taking or human shields."* This worksheet is fully consistent with that ruling: the authored row asks for the response, not for the authorization. Defer to Canon Compliance for confirmation.
5. Whether the row should add a citation to the *Karadžić Appeal Judgment* (IT-95-5/18-A, 20 March 2019) which affirmed the Count 11 conviction. Recommend: yes — the appeal affirmation strengthens the source tier and the modal narrative voice (Gate §4 "ICTY case citations where applicable"). Defer to Narrative Designer for modal text edit; not authored here.
