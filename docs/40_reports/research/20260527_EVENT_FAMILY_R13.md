# Event Family Worksheet — R13: RS Deliberate Force Compliance (Sep 1995)

**Family ID:** `rs_deliberate_force_compliance`
**Packet row:** v1.3 packet §4.1 R13 (RS families)
**Sensitive ring:** Ring 1 — the proximate cause (Markale II shelling, 28 Aug 1995) is a war-crime act handled by existing engines; this row models the *posture decision* in response to NATO coercion, not authorization of new atrocity
**Source tier:** A (`icty_icj_un`)
**Date:** 2026-05-27
**Author lane:** Historian (Phase A research worksheet)
**Status:** Phase A — research only. No JSON, code, or canon edits.

---

## 1. Cited Historical Narrative

On 28 August 1995 a mortar shell struck the Markale marketplace in Sarajevo for the second time in 18 months, killing 43 civilians and wounding more than 75. UN crater analysis attributed the fire to a VRS firing position east of the city. Two days later, on 30 August 1995, NATO and UNPROFOR jointly launched **Operation Deliberate Force**, the first sustained Western air campaign of the war, targeting VRS air defense, command-and-control, ammunition depots, and lines of communication around Sarajevo, the Pale area, and key VRS strategic nodes.

Operation Deliberate Force was conducted in two principal phases (30 Aug–1 Sep, then 5 Sep–14 Sep) with a brief pause at the request of UN civilian leadership pending a VRS response. The North Atlantic Council and UNPROFOR set explicit conditions for cessation: (i) cessation of VRS attacks on Sarajevo and the other UN-designated safe areas; (ii) **withdrawal of VRS heavy weapons (artillery, mortars, tanks above 12.7 mm)** from a 20-km Total Exclusion Zone (TEZ) around Sarajevo; (iii) full freedom of movement for UNPROFOR and humanitarian convoys; (iv) reopening of Sarajevo airport.

By 14 September 1995, after sustained NATO Tomahawk strikes (including the 10 September USS Normandy launches against VRS air-defense nodes in the Banja Luka area), the Republika Srpska political and military leadership signed an agreement with US envoy Richard Holbrooke and UNPROFOR commander General Bernard Janvier providing for the **withdrawal of VRS heavy weapons from the Sarajevo TEZ within 144 hours**. Slobodan Milošević signed for the Bosnian Serb side after Karadžić and Mladić authorized his delegated authority (the "Patriarch Paper" of 30 August 1995, in which Milošević was granted full negotiating mandate for the Bosnian Serbs). NATO suspended Deliberate Force on 14 September; VRS heavy weapons began withdrawing on 17 September and the operation was formally concluded on 20 September 1995.

The compliance decision was contested inside the RS leadership. Mladić's preference, expressed in command communications captured in the *Mladić* ICTY judgment, was to absorb the strikes and continue to hold positions on the assumption that NATO would not sustain the air campaign and that Western political will would fracture before VRS combat power did. The decision to withdraw heavy weapons came from the political leadership (Karadžić, via Milošević) over Mladić's tactical resistance — though Mladić ultimately issued the withdrawal orders to VRS Main Staff once the political decision was final.

Operational context in BB II documents the late-summer 1995 VRS crisis: Operation Storm (Krajina, 4–7 August), the loss of Western Slavonia (Operation Flash, May), the collapse of the Serbian Krajina (RSK) refugee column moving east through Bosnia, the joint ARBiH/HVO offensives in western Bosnia (Operations Mistral and Sana), and the Federation push toward Banja Luka. The VRS, already overstretched, could not simultaneously hold the western front, defend the Sarajevo TEZ against renewed NATO escalation, and contest the Federation ground offensive.

**Citations:**
- UN S/1995/444 (5 June 1995) — Secretary-General report on safe-areas regime, prefatory.
- UN S/RES/1004 (12 July 1995) — Srebrenica response, contextual to Aug–Sep escalation.
- UN S/1995/755 (30 August 1995) — Secretary-General report on Markale II crater analysis and decision to authorize air strikes.
- NATO press releases 30 August–20 September 1995 — Deliberate Force chronology, target categories, and cessation conditions.
- ICTY *Mladić* IT-09-92-T (Trial Judgment, 22 November 2017) §§4631–4685 — Markale II shelling attribution to VRS and command knowledge; Mladić preference for absorption.
- ICTY *Karadžić* IT-95-5/18-T (Trial Judgment, 24 March 2016) §§4940–4982 — Sarajevo TEZ compliance decision and command chain (Karadžić → Milošević → withdrawal orders).
- ICTY *Galić* IT-98-29-T (Trial Judgment, 5 December 2003) — Sarajevo siege framework and earlier Markale I, contextual.
- Holbrooke, Richard, *To End a War* (Random House, 1998) chs. 7–9 — first-hand US negotiator account of the 14 September agreement and "Patriarch Paper" delegation. **Corroborated** by the Holbrooke-Christopher cables released to NARA, by the ICTY *Karadžić* judgment §§4940–4982, and by UN S/1995/755.
- BB II — Operation Deliberate Force entries, Markale II shelling, Sarajevo TEZ withdrawal sequence (BB2 page-level cites to be confirmed by extractor on Phase D wiring; current KB extraction confirms BB2 covers 1994 through early-mid 1995 Sarajevo siege context; late-1995 Deliberate Force narrative is corroborated by the primary UN/ICTY/Holbrooke sources above).

## 2. Defensible Historical / Default Option

**`historical_default_response_id: "withdraw_heavy_weapons"`** — Historical default.

The RS political leadership (Karadžić, via Milošević's delegated mandate) signed the 14 September 1995 framework and the VRS Main Staff executed the heavy-weapons withdrawal from the Sarajevo TEZ. NATO suspended Deliberate Force on the same day; the operation was formally closed on 20 September after compliance was verified by UNPROFOR. The label `Historical default` is defensible under the Foundational packet's label taxonomy because the option matches the actor-specific choice documented by ICTY, UN, and the Holbrooke-corroborated memoir record.

**Framing constraint:** The option text and consequences must depict the *posture decision* — accept NATO coercion and trade Sarajevo TEZ leverage for cessation of strikes — and must NOT frame the proximate war crime (Markale II shelling, civilian targeting in Sarajevo siege) as a player-authorized tactic. Atrocity remains a downstream consequence of the existing Sarajevo siege artillery model and `paramilitary_sweep` / `war_crimes_events` accounting (Gate §1 Ring 1), not a lever within this row.

## 3. Proposed Counterfactual Options

### 3.1 `withdraw_heavy_weapons` — `Historical default`

Comply with the NATO ultimatum: withdraw heavy weapons from the 20-km Sarajevo Total Exclusion Zone within 144 hours; cease attacks on safe areas; permit UNPROFOR freedom of movement; accept the implicit framework that further compliance will be required at the diplomatic track Holbrooke is opening. Material posture: reduced Sarajevo offensive capacity, reduced VRS theater equipment effectiveness modifier (heavy weapons relocated and no longer available for siege fires), gain in international standing relative to non-compliance baseline, opens the Holbrooke / Belgrade channel (R14) and Dayton track (R15).

Source provenance: documented historical RS decision per UN S/1995/755, ICTY *Karadžić* §§4940–4982, Holbrooke ch. 8. Source tier `icty_icj_un`.

### 3.2 `absorb_strikes_hold_position` — `Counterfactual staff path`

Refuse the NATO ultimatum: keep heavy weapons in place around Sarajevo; absorb continued NATO strikes on the assumption that Western political will will fracture before VRS combat power does (this was Mladić's documented operational preference per *Mladić* IT-09-92-T §§4631–4685). Material posture: continued Sarajevo siege fires available, severe escalation of NATO bombing, accelerated international-standing collapse, no opening of Holbrooke channel, increased patron pressure from Belgrade (Milošević already wanted Dayton track open by this point — see Holbrooke ch. 7), high risk of Belgrade-imposed leadership change (closing R11 in counterfactual direction).

Design provenance: a plausible alternative path in which the political leadership backed Mladić's tactical preference rather than overriding it. Not documented as the RS Assembly or Presidency's chosen path. Source tier `design_counterfactual`.

**Hard rule (Gate §1 Ring 1):** Neither option authorizes new sensitive-history acts. The proximate cause (Markale II shelling) and Sarajevo siege fires are handled by existing engines; this row sets posture toward NATO coercion only.

## 4. Material Effects (Per §3.3 Of v1.3 Packet)

| Option | `effects[]` | `sets_flags` | `dimension_shifts` |
| --- | --- | --- | --- |
| `withdraw_heavy_weapons` | `equipment_quality_modifier` (RS, Sarajevo-Romanija Corps, -0.15, duration 26 — heavy weapons relocated); `supply_relief` (RS, +0.05 — Sarajevo siege fires costing less ammunition); `bot_priority_shift` (RS, away from Sarajevo offensive operations) | `rs_deliberate_force: 'withdraw_heavy_weapons'`; `sarajevo_tez_compliant: true` | `international_standing: +8` (relative to non-compliance); `internal_cohesion: -5` (perceived political retreat over Mladić's preference); `patron_pressure_easing: +10` (Milošević satisfied) |
| `absorb_strikes_hold_position` | `combat_power_attrition` (RS Main Staff, -0.10, duration 4 turns — continued NATO bombing); `morale_modifier` (RS, -0.08, duration 8 — strikes wear down rear-area cohesion); `equipment_loss` (RS air defense, command nodes — emergent via engine bombing model) | `rs_deliberate_force: 'absorb_strikes_hold_position'`; `holbrooke_channel_blocked: true` | `international_standing: -15`; `internal_cohesion: +3` (short-term hardline rally); `patron_pressure_intensifying: +15` (Milošević furious); `nato_escalation_pulled_forward: true` |

**§3.6 hard rule:** Neither option carries `effects` that "extend, continue, or scale a sensitive-history act already in state at fire-time." The continued Sarajevo siege fires under `absorb_strikes_hold_position` are emergent from the existing siege engine, not authorized by this row. The Markale II shelling that triggered Deliberate Force is in the past at fire-time and is not modified by this row.

## 5. Sensitive-History Ring And Source Note

**Ring:** Ring 1 (proximate cause is a Ring 1 act — Markale II shelling — but this row models the *response posture* to NATO coercion, which is itself Ring 2). The boundary is held at: this row sets compliance posture and authorizes nothing beyond what the engine already does for the Sarajevo siege.

**Source note for the modal (draft, per §5 of v1.3 packet):**

> NATO Operation Deliberate Force, 30 August–20 September 1995, was the first sustained Western air campaign of the war, launched after the 28 August Markale II mortar attack on Sarajevo. NATO and UNPROFOR set heavy-weapons withdrawal from the Sarajevo Total Exclusion Zone as the principal condition for cessation. The RS political leadership (Karadžić, via Milošević's delegated mandate per the 30 August "Patriarch Paper") signed the 14 September framework over General Mladić's tactical preference to absorb the strikes. UN S/1995/755 records the Secretary-General's authorization. ICTY *Karadžić* §§4940–4982 and *Mladić* §§4631–4685 record the command-chain decision. Holbrooke, *To End a War* ch. 8, corroborated.

**Source tier:** `icty_icj_un`.

## 6. Downstream Opens / Closes (Per §3.3)

- **Opens (via flag `rs_deliberate_force`):** R14 (`comply_with_belgrade` path becomes the modal default if `withdraw_heavy_weapons`; `defy_us_framework` becomes the modal default if `absorb_strikes_hold_position`); X8 (Holbrooke 51:49 halt — only reachable on `withdraw_heavy_weapons`); federation_ground_offensive_readiness (engine flag — the western Federation offensive's politico-military window opens on RS compliance).
- **Closes (via foreclosure):** `absorb_strikes_hold_position` forecloses the Dayton track in the modal-default direction (does not strictly close R15 — RS may still be dragged to Dayton by Milošević even after defiance — but the modal default response on R15 flips to `hardline` and the option weights shift); `withdraw_heavy_weapons` forecloses the prolonged-Sarajevo-siege endgame chain.
- **Consequence-only (no player decision):** Markale II shelling itself (pre-event, in state at fire-time); NATO bombing damage on `absorb_strikes_hold_position` (emergent from the engine bombing model, not a player-authored sensitive act).

## 7. Open Questions Deferred To Canon Compliance Review

1. The `absorb_strikes_hold_position` option's `morale_modifier` and `equipment_loss` effects are downstream-engine-driven (NATO bombing model). Confirm with Canon Compliance that the engine can express continued NATO strikes as a state effect rather than as a scripted scene, OR whether a `nato_bombing_intensity` state field is needed in Phase B to support this. Recommend: yes, a `nato_bombing_intensity` integer field gated to RS faction state, incrementing while `rs_deliberate_force: 'absorb_strikes_hold_position'` and decrementing on policy reversal.
2. Phase C wiring: confirm that R13 firing requires the Markale II event to have fired (or its engine equivalent — VRS heavy-weapons fire on Sarajevo causing ≥30 civilian casualties in a single tick within a date window of late Aug 1995). Recommend: yes, `requires_state_condition: { markale_ii_or_equivalent: true }` rather than date-only gating.
3. Whether the `absorb_strikes_hold_position` modal source note should explicitly cite Mladić's preference (his name and *Mladić* IT-09-92-T paragraph numbers). Recommend: yes, to ground the counterfactual in the historical record rather than presenting it as pure invention.
4. Whether R13 and X8 (Holbrooke 51:49 halt) should be merged into a single composite-handled cross-faction row, since both are RS-side responses to US/NATO coercion in the same 30-day window. Recommend: no, keep separate — R13 is the military-coercion response (heavy weapons), X8 is the diplomatic-coercion response (ground offensive halt), and they fire in different state windows.
