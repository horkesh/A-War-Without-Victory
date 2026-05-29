# Event Family Worksheet — R10: UN Safe-Area Enforcement (Engine Consequence)

**Family ID:** `un_safe_area_enforcement`
**Packet row:** v1.3 packet §4.1 R10 (RS families) — *also* §4.4 X7 (cross-faction "UN safe-areas system" composite)
**Sensitive ring:** Ring 1 — engine consequence (NOT a player decision row)
**Source tier:** A (`icty_icj_un`)
**Date:** 2026-05-27
**Author lane:** Historian (Phase A research worksheet)
**Status:** **NO PLAYER DECISION ROW** — follow-on of UNSC 819/824/836/843; effects emerge from existing engine surfaces (`enclave_resilience.ts`, `offensive_ops_suppression`, `equipment_quality_modifier`), not from an authored response option.

---

## 1. Cited Historical Narrative

Between April 1993 and June 1995, the UN Security Council established and progressively reinforced a "safe-areas" regime for six Bosnian municipalities — Srebrenica, Žepa, Goražde, Sarajevo, Tuzla, and Bihać. The regime created the legal framework that the ICTY would later use to ground its Srebrenica genocide and Sarajevo siege convictions. The four core resolutions are:

- **UNSC 819 (16 April 1993)** — Demands "that all parties and others concerned treat Srebrenica and its surroundings as a safe area which should be free from any armed attack or any other hostile act." Adopted under Chapter VII. Cites the situation reported by the Special Rapporteur Tadeusz Mazowiecki (UN E/CN.4/1994/110) and General Philippe Morillon's 11 March 1993 declaration in Srebrenica. (ICTY *Krstić* IT-98-33-T §§16–28 contextual; UN A/54/549 §§57–70.)
- **UNSC 824 (6 May 1993)** — Extends the safe-area regime to Sarajevo, Tuzla, Žepa, Goražde, and Bihać. Reaffirms that these municipalities, their surrounding areas, and the routes connecting them "should be treated as safe areas by all the parties concerned and should be free from armed attacks and from any other hostile act."
- **UNSC 836 (4 June 1993)** — Authorizes UNPROFOR, "acting in self-defence, to take the necessary measures, including the use of force, in reply to bombardments against the safe areas." Authorizes Member States, acting nationally or through regional organizations (i.e., NATO), to take "all necessary measures, through the use of air power, in and around the safe areas… to support UNPROFOR in the performance of its mandate." This is the legal foundation for Operation Deny Flight (no-fly enforcement) and, ultimately, for Operation Deliberate Force in August–September 1995.
- **UNSC 843 (18 June 1993)** — (Note: 843 itself addresses sanctions-committee assistance to neighbouring states; the operative safe-area follow-on is **UNSC 844 (18 June 1993)**, which authorizes the troop reinforcement of UNPROFOR by some 7,600 additional personnel to support the safe-area regime. The v1.3 packet's R10 row cite of 843 should be understood as the 843/844 pair adopted the same day; this worksheet records both.)

Operational consequences documented by ICTY and the UN:

- **Srebrenica demilitarization (April–May 1993)** — Brokered by Morillon and Lt-Gen Lars-Eric Wahlgren under UNSC 819. ARBiH 28th Division was nominally disarmed; in practice, partial compliance only ("hide_weapons", per the B5 Foundational packet ruling). *Krstić* §§24–28; UN A/54/549 §§59–66.
- **VRS shelling of safe areas continued throughout 1993–1995** — Sarajevo (continuous siege, *Galić* IT-98-29-T, *D. Milošević* IT-98-29/1-T), Goražde (April 1994 offensive prompted first NATO air strikes), Tuzla (25 May 1995 "Tuzla Gate" shell, *Mladić* IT-09-92-T §§3119–3145). The ICTY found that the safe-area designation did not, in fact, prevent attack; it created the international legal framework under which subsequent attacks were prosecuted.
- **Operation Deliberate Force (29 August – 14 September 1995)** — Triggered by the Markale II marketplace shelling (28 August 1995). NATO conducted 3,515 sorties under UNSC 836's "all necessary measures" authorization, in coordination with UNPROFOR. *Mladić* IT-09-92-T contextual; the engine row `nato_deliberate_force_1995` already records this in `data/scenarios/events/war_1995.json`.
- **ICTY findings on the safe-area regime** — *Mladić* IT-09-92-T §§4585–4647 (Srebrenica), §§3047–3145 (Sarajevo and other safe areas). *Karadžić* IT-95-5/18-T §§4970–5108 (Srebrenica), §§4396–4566 (Sarajevo siege). Both judgments treated VRS attacks on declared safe areas as part of the JCE pattern, with the resolutions themselves cited as the operative international legal frame.

**Citations:**
- UNSC Resolution 819 (16 April 1993) — S/RES/819 (1993).
- UNSC Resolution 824 (6 May 1993) — S/RES/824 (1993).
- UNSC Resolution 836 (4 June 1993) — S/RES/836 (1993).
- UNSC Resolution 844 (18 June 1993) — S/RES/844 (1993). (Paired with 843 same day.)
- ICTY *Mladić* IT-09-92-T §§3047–3145 (safe-area attacks: Sarajevo, Tuzla, Goražde), §§4585–4647 (Srebrenica).
- ICTY *Karadžić* IT-95-5/18-T §§4396–4566 (Sarajevo siege), §§4970–5108 (Srebrenica).
- ICTY *Krstić* IT-98-33-T §§16–28 (safe-area context for Srebrenica).
- ICTY *Galić* IT-98-29-T; *D. Milošević* IT-98-29/1-T (Sarajevo siege convictions under safe-area regime).
- UN A/54/549 (15 November 1999) — Srebrenica fall report, §§57–98 on the safe-area regime.
- UN S/1994/674 Annex IX.A — Special Rapporteur reporting on safe-area conditions.

## 2. Defensible Historical / Default Option

**NO PLAYER DECISION ROW.** Per v1.3 packet §4.1 R10 cell ("follow-on consequences only — not a player decision row for RS in the current design") and Foundational packet `un_hostage_crisis_1995` adjacency ruling.

The safe-area regime is **not a faction-authored decision**. It is the international response (UN Security Council action under Chapter VII) that creates the operative legal frame which:

1. **Constrains VRS offensive operations** against the six designated municipalities through the `offensive_ops_suppression` channel (existing engine surface in `state.military.offensive_ops_suppressions`). Suppression strength is tuned by the existing R13 `deliberate_force_rs_compliance_1995` row and by NATO escalation events; it is NOT set by an R10 response option.
2. **Modifies VRS equipment quality** during enforced compliance windows (UNSC 836 / NATO Deny Flight no-fly enforcement) via `equipment_quality_modifier` (existing). NATO air power degrades VRS heavy-weapon survivability without re-authoring R10 as a player decision.
3. **Conditions enclave resilience** for Srebrenica, Žepa, Goražde, Bihać, Sarajevo, Tuzla through `src/sim/combat/enclave_resilience.ts` (Gate §1 Ring 1). Demilitarization compliance is the B5 surface, not R10.

This is the §1 Ring 1 separation that the Sensitive-History Gate makes explicit: international legal status is engine consequence, not a player lever. The player faction (RS in this row's nominal framing) does not "decide whether UNSC 836 applies"; the resolution is exogenous to the simulation actor.

**Label:** Per Foundational packet label taxonomy, R10 sits in the **`Blocked` as a player decision row** category — but for a different reason than R3 (which is blocked because the act is Ring 3). R10 is "blocked" because the historical actor with decision agency over the resolution itself is the UN Security Council, not RS / RBiH / HRHB; the AWWV player factions experience the resolution as exogenous constraint. This worksheet records "engine consequence" as the operative classification.

## 3. Proposed Counterfactual Options

**None authored at R10 itself.** The counterfactual surface for "what if UNSC 836 had been enforced more / less aggressively" is the **NATO escalation cascade** (X6 in the packet), which is itself a composite of engine-driven gates, not a faction decision row. The X6 worksheet, when authored, will record that cascade.

What does exist as authored counterfactual material on adjacent rows:

- **R13 `deliberate_force_rs_compliance_1995`** (already in `war_1995.json`) — RS faction-level response to NATO airstrikes triggered by safe-area enforcement. Historical default is `withdraw_heavy_weapons`; counterfactual is `absorb_strikes_hold_position`. This is the R10-adjacent player decision; R10 itself remains an engine consequence.
- **R12 `un_hostage_crisis_1995`** (already in `war_1995.json`) — RS faction-level response to safe-area enforcement escalation (the 377 UN peacekeepers were seized in retaliation for NATO airstrikes on RS positions in late May 1995, per *Karadžić* IT-95-5/18-T Count 11 and UNSCR 998). This is R12's worksheet domain; R10 itself does not author the option set.
- **B5 `srebrenica_demilitarization_1993`** — RBiH/ARBiH 28th Division partial-compliance posture under UNSC 819. Historical default `hide_weapons` per Foundational packet; counterfactuals `comply_fully` / `refuse`. The B5 worksheet authors this row, not R10.

**Hard rule (Gate §1 Ring 3 + v1.3 §3.6):** No future R10 expansion may add a player-selectable "ignore safe-area" option that would functionally re-author shelling of declared safe areas as a player tactic. Safe-area attacks emerge from VRS operational AI plus engine-driven bot priority shifts, and are recorded in displacement/`war_crimes_events` ledgers — not from a player decision at R10.

## 4. Material Effects (Per §3.3 Of v1.3 Packet)

**No effects authored at R10.** R10's material consequences are produced by:

| Source | Channel | Owner row |
| --- | --- | --- |
| UNSC 836 / Deny Flight no-fly zone | `equipment_quality_modifier` (RS, negative) | X6 / NATO escalation (composite) |
| UNSC 836 / NATO ground-attack authorization | `offensive_ops_suppression` (RS, against safe-area OSIDs) | R13 / Deliberate Force compliance |
| UNSC 819/824 / safe-area designation flag | enclave resilience modifier (existing engine) | B5 / Srebrenica demil; engine-driven for the other five enclaves |
| UNSC 844 / UNPROFOR reinforcement | enclave resilience (modest positive on declared safe areas) | engine constant |
| Markale I/II / Tuzla Gate / Sarajevo shelling counters | `humanitarian_impact { war_crimes_delta: +n }` | existing event rows (Markale, Tuzla Gate, Sarajevo siege incidents) |

The §3.6 v1.3 packet rule applies in the negative form here: there is no R10 response option, so there are no `effects` to scrutinize for "extend, continue, or scale a sensitive-history act." The engine surfaces above are Gate §1 Ring 1 by canon.

## 5. Sensitive-History Ring And Source Note

**Ring:** Ring 1 — engine consequence. The safe-area regime is canon-bound to flow from UNSC resolutions through existing engine surfaces, not through an authored response option set.

**Source note (for any future R10-derived Codex / Records / Chronicle entry, NOT for a decision modal):**

> The United Nations Security Council declared six Bosnian municipalities — Srebrenica, Žepa, Goražde, Sarajevo, Tuzla, and Bihać — to be safe areas through Resolutions 819 (16 April 1993), 824 (6 May 1993), 836 (4 June 1993), and 844 (18 June 1993). Resolution 836 authorized UNPROFOR and Member States acting through regional organizations (NATO) to use force, including air power, in and around the safe areas to support the mandate. ICTY *Mladić* (IT-09-92-T) §§3047–3145, 4585–4647 and *Karadžić* (IT-95-5/18-T) §§4396–4566, 4970–5108 found that VRS attacks on the declared safe areas, including the Sarajevo siege and the fall of Srebrenica, were part of the Joint Criminal Enterprise's common purpose. The safe-area regime did not prevent the attacks; it created the legal framework under which they were subsequently prosecuted.

**Source tier:** `icty_icj_un`.

## 6. Downstream Opens / Closes (Per §3.3)

R10 is itself an **engine consequence**, not an event id with `enables_events_runtime` arrays. Its downstream wiring is per-flag, not per-response:

- **Flag set on engine resolution-fire (when authored):** `un_safe_area_regime_active: true` once UNSC 824 fires (turn ≈ 49 in the calibration window). Already implicit in the catalog through trigger turn-ranges on `srebrenica_demilitarization_1993` (B5), `nato_deliberate_force_1995` (X6), and `un_hostage_crisis_1995` (R12).
- **Engine consumers:**
  - `src/sim/combat/enclave_resilience.ts` reads safe-area designation when computing resilience caps for Srebrenica, Žepa, Goražde, Sarajevo, Tuzla, Bihać.
  - `src/sim/combat/bot_corps_directives.ts` may consume safe-area flag to modulate VRS bot operational priorities against designated OSIDs (currently engine-implicit, not flag-gated; Phase B may make this explicit per §3.2 `requires_enabled` if needed).
  - `state.military.offensive_ops_suppressions` populated by R13 and X6, not by R10 directly.

**Downstream events whose triggers reference the safe-area frame (existing catalog):**

- `srebrenica_demilitarization_1993` (B5) — gated by `srebrenica_enclave_formed`, fires within UNSC-819 window.
- `srebrenica_falls_1995` — gated by `srebrenica_enclave_formed AND srebrenica_demilitarized`; the rupture predicate sits downstream of the entire safe-area chain.
- `un_hostage_crisis_1995` (R12) — fires in retaliation for NATO airstrikes that themselves operate under UNSC-836 authorization.
- `nato_deliberate_force_1995` (X6) — operates under UNSC-836 authorization.
- `deliberate_force_rs_compliance_1995` (R13) — RS response to the X6 / 836-authorized strikes.

The chain is already wired through flags and trigger conditions; R10 itself does not need its own `enables_events_runtime` array because it is not a response-option-bearing row.

## 7. Open Questions Deferred To Canon Compliance Review

1. **§3.6 boundary check (this worksheet's only §3.6-relevant question):** Confirm that the absence of an R10 player decision row in `data/scenarios/events/*.json` is the correct canon enforcement. Per the Gate §1 Ring 1 data-not-comment lesson (Stupčanica-95, commit `759a35cd`, 2026-05-07), the foreclosure of "R10 as a player decision" must live in the absence of a row in the JSON catalog, not in a comment claim. Recommend: Phase B static test asserting no event with `family: 'un_safe_area_enforcement'` carries `requires_player_response: true`. **§3.6 concern flag:** Future authoring temptation may exist to add an "RS response to safe-area designation" option that effectively re-frames shelling-of-safe-area as a player choice; this is foreclosed by §3.6 and by Gate §1 Ring 3 #1 and #5. Canon Compliance should verify the foreclosure is data-enforced, not comment-enforced.
2. Whether the UNSC-824 fire moment (~turn 49 in calibration) should set an explicit `un_safe_area_regime_active` flag at the engine level for downstream `requires_enabled` consumption (Phase B), or whether it should remain implicit through the existing safe-area event chain. Recommend: explicit flag at Phase B; the diagnostic taxonomy benefits from being able to render "this event is gated by the safe-area regime."
3. Whether the v1.3 packet's R10 cite of "UNSC 843" should be corrected to "UNSC 844" (the safe-area troop-reinforcement resolution adopted the same day). This worksheet has documented both 843 and 844; recommend corrigendum in the v1.3 packet §4.1 R10 cell. Defer to Canon Compliance / Documentation Specialist.
4. Whether Bihać and Tuzla — the two safe areas whose enclave fate is closest to the AWWV calibration line — need their own per-municipality safe-area resilience constants in `enclave_resilience.ts` distinct from the Srebrenica/Žepa/Goražde cluster. Defer to Gameplay Programmer + Game Designer in Phase C/D; not authored here.
