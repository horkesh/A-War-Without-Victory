# Event Family Worksheet — R2: RS Paramilitary Policy In War

**Family ID:** `rs_paramilitary_policy`
**Packet row:** v1.3 packet §4.1 R2 (RS families)
**Sensitive ring:** Ring 1 — Sensitive-History Gate §3 canonical player-authorized war-crime surface
**Source tier:** A (`icty_icj_un`)
**Date:** 2026-05-27
**Author lane:** Historian (Phase A research worksheet)
**Status:** Phase A — research only. No JSON, code, or canon edits.

---

## 1. Cited Historical Narrative

Throughout the 1992 cleansing campaign in the Krajina, Posavina, and Drina valley, paramilitary formations operated alongside, and frequently in advance of, regular VRS units and Republika Srpska Ministry of Interior (MUP) forces. The principal formations whose conduct entered the ICTY record are:

- **Serbian Volunteer Guard** ("Arkan's Tigers"), under Željko Ražnatović — Bijeljina (1–2 April 1992), Zvornik (8–9 April 1992), Sanski Most (1995). *Karadžić* IT-95-5/18-T §§2470–2509, 3469–3471; UN A/54/549 §35.
- **Serbian Radical Party "White Eagles" / Šešeljevci**, under Vojislav Šešelj — Zvornik, Foča, Višegrad. *Šešelj* IT-03-67 (acquittal at trial, partly reversed on appeal 11 April 2018, IT-03-67-A).
- **"Yellow Wasps"** (Žute Ose), under the Vučković brothers — Zvornik area.
- **Republika Srpska MUP Special Police Brigade** ("Red Berets" of RS MUP) — present throughout 1992; documented in *Stakić* IT-97-24 §§88–98 (Prijedor) and *Brđanin* IT-99-36-T §§108–123 (Krajina Crisis Staff coordination).

The ICTY trial chambers consistently found that the RS political and military leadership knew of, tolerated, and in many specific instances directed or coordinated paramilitary operations:

- *Stakić* IT-97-24 §§490–518 — Prijedor Crisis Staff coordinated paramilitary, MUP, and military takeover; civilian population centers cleared.
- *Brđanin* IT-99-36-T §§1051–1149 — ARK (Autonomous Region of Krajina) Crisis Staff under Brđanin's leadership directed and resourced paramilitary operations across Krajina.
- *Tadić* IT-94-1-T (7 May 1997) — Prijedor (Kozarac, Omarska, Keraterm) — first ICTY conviction; established the pattern of paramilitary involvement in detention and civilian targeting.
- *Karadžić* IT-95-5/18-T §§3469–3475, 3505–3524 — JCE common purpose included use of paramilitary formations to achieve the Six Strategic Goals' demographic implementation.
- *Krajišnik* IT-00-39-T §§856–891 — Assembly leadership knew of and accepted paramilitary methods.

UN reporting (A/54/549; UN Commission of Experts Final Report S/1994/674) documented the pattern contemporaneously: paramilitary formations were the operational instrument of the cleansing component of the war, with the political leadership in Pale and the military command tolerating their methods even when nominally subordinating them to VRS/MUP chains of command.

**The historical RS posture was de-facto tolerance.** Karadžić and the RS Presidency neither systematically prosecuted paramilitary commanders for their conduct against civilians, nor consistently denied them deployment authority; selective denials did occur (notably the Vučković brothers' eventual arrest by RS MUP, see BB I pp. 224–229) but did not represent a policy shift.

**Citations:**
- ICTY *Karadžić* IT-95-5/18-T §§2470–2509, 3469–3475, 3505–3524.
- ICTY *Stakić* IT-97-24 §§88–98, 490–518.
- ICTY *Brđanin* IT-99-36-T §§108–123, 1051–1149.
- ICTY *Tadić* IT-94-1-T (7 May 1997).
- ICTY *Krajišnik* IT-00-39-T §§856–891.
- ICTY *Šešelj* IT-03-67-A (Appeal Judgment, 11 April 2018).
- UN A/54/549 §35; UN S/1994/674 (Commission of Experts Final Report, Annex III.A — Special Forces).
- BB I pp. 132–144, 198–229.

## 2. Defensible Historical / Default Option

**`historical_default_response_id: "always_allow"`** — Historical default.

Per Sensitive-History Gate §3 (Player-Authorized War Crime Surface, canon-binding):

> `always_allow` — the player is endorsing every paramilitary capture's civilian cost. The game does not hide or sugar-coat this. Every approved sweep records civilian casualties and increments `war_crimes_events`.

This is the option that mirrors the historical RS leadership's documented posture of tolerance. The label `Historical default` is defensible because it matches the actor-specific choice documented by ICTY. The Foundational packet (`rs_strategic_goals` ruling) and the Sensitive-History Gate (§3) jointly fix this option set as the *only* player-facing surface that authorizes war crimes in AWWV.

**Canonical engine surface:** `state.military.paramilitary_policy: 'always_allow' | 'always_deny' | 'ask'` — defined in `src/state/game_state.ts`. This row's response options write the corresponding string value; no other state field is touched.

## 3. Proposed Counterfactual Options

The option set is **canon-bound** by Sensitive-History Gate §3 to exactly three options. No expansion is permitted. From the v1.3 packet §4.1 R2 row: "Ring 1 — already authored; do not expand option set."

### 3.1 `ask` — `Counterfactual staff path` (also the engine default)

Per Gate §3: "the player sees each pending request with civilian casualty projection and decides one at a time. This is the default."

Design provenance: a posture in which the RS Presidency reviews each proposed deployment individually rather than granting blanket authorization. Not documented as RS historical posture. Source tier `design_counterfactual`.

Material effects: `paramilitary_policy: 'ask'`; each pending request will be modal-rendered with full casualty projection per Gate §3 UI rule.

### 3.2 `always_deny` — `Counterfactual staff path`

Per Gate §3: "paramilitaries do not spawn for the player faction. Bot factions continue to use them historically."

Design provenance: a posture in which the RS Presidency refuses paramilitary deployment entirely. Not documented as RS historical posture; the closest historical analogue is RBiH (ARBiH), which on the record did not authorize systematic paramilitary deployment against civilian populations (per Gate §3 design intent and *Orić* IT-03-68 acquittal context for the ARBiH leadership case). Source tier `design_counterfactual` when applied to RS.

Material effects: `paramilitary_policy: 'always_deny'`; downstream consequence chain enables `csq_paramilitary_authorization_refused` per v1.3 packet §4.1 R2 row.

## 4. Material Effects (Per §3.3 Of v1.3 Packet)

| Option | `effects[]` | `sets_flags` | `dimension_shifts` |
| --- | --- | --- | --- |
| `always_allow` | `aggression_modifier` (RS, +0.10, duration 52); `bot_priority_shift` (toward paramilitary sweeps where available) | `paramilitary_policy: 'always_allow'`; `rs_paramilitary_authorized: true` | `international_standing: -10`; `internal_cohesion: +5` (hardline base) |
| `ask` | none immediate; per-decision casualty projection at fire-time | `paramilitary_policy: 'ask'` | `international_standing: -3` (posture-only signal) |
| `always_deny` | `bot_priority_shift` (away from paramilitary sweeps); `recruitment_modifier` (RS, -0.05, internal-cohesion cost) | `paramilitary_policy: 'always_deny'`; `rs_paramilitary_refused: true` | `international_standing: +8`; `internal_cohesion: -10` |

**§3.6 hard rule (v1.3 packet):** None of these options may carry `effects` that "extend, continue, or scale a sensitive-history act already in state at fire-time." The `aggression_modifier` and `bot_priority_shift` are posture-level levers; the *act* of paramilitary capture and its civilian casualties is recorded by the existing `paramilitary_sweep.ts` engine, NOT by this response option. The Gate's player-authorized war-crime surface is, by canon, only `paramilitary_policy`; no other path may authorize new sensitive acts (Gate §3 + v1.3 §3.6).

**Counter increment routing:** `war_crimes_events` (on `FactionCapital`) is incremented automatically by `paramilitary_sweep.ts` on each approved sweep, NOT by this response option. This is the §1 Ring 1 separation that keeps atrocity-as-consequence rather than atrocity-as-lever.

## 5. Sensitive-History Ring And Source Note

**Ring:** Ring 1. This row is the canonical Gate §3 player-authorized war-crime surface. The option set is canon-bound. The behavior is canon-bound.

**Source note for the modal (draft, per §5 of v1.3 packet):**

> Paramilitary formations (Arkan's Serbian Volunteer Guard, Šešelj's White Eagles/SRS, Yellow Wasps, RS MUP Special Police) operated throughout the 1992–1995 war alongside RS regular forces. ICTY *Karadžić* (IT-95-5/18-T) §§3469–3475 found the political leadership knew of and accepted paramilitary methods as a component of the Joint Criminal Enterprise's common purpose. *Stakić* (IT-97-24) and *Brđanin* (IT-99-36-T) found Prijedor and Krajina Crisis Staffs coordinated paramilitary operations. UN A/54/549 §35 and the UN Commission of Experts Final Report (S/1994/674, Annex III.A) document the pattern contemporaneously. The historical RS posture was de-facto tolerance.

**Source tier:** `icty_icj_un`.

## 6. Downstream Opens / Closes (Per §3.3)

R2 is itself opened by R1's `rs_strategic_goals` flag being set (any value — `all_six`, `selective`, `aggressive`). The R1 platform decision is the gate; R2 is the *paramilitary surface decision* downstream of platform.

- **Opens (via flag `paramilitary_policy`):** existing engine `paramilitary_sweep.ts` reads the flag at sweep-decision time. No event chain wired *outward* from R2 except `csq_paramilitary_authorization_refused` (already in `consequences.json`, Counterfactual staff path) on `always_deny`.
- **Closes (via foreclosure):** `always_deny` forecloses `csq_paramilitary_authorization_granted` (counterfactual mirror, if and when authored). `always_allow` forecloses `csq_paramilitary_authorization_refused`. `ask` forecloses neither — both csq events remain reachable depending on per-decision answers.
- **Engine consumer:** `src/sim/combat/paramilitary_sweep.ts` (rear pocket cleanup + adjacent-offensive modes; civilian-casualty accounting; `war_crimes_events` counter increment). This is the Gate §1 Ring 1 engine surface; R2 sets the policy field that surface reads.

## 7. Open Questions Deferred To Canon Compliance Review

1. The `always_allow` option's `aggression_modifier (+0.10)` is more modest than R1 `all_six` (+0.15). Confirm that downstream stacking (R1 + R2) is acceptable in Phase D, or whether R2 should be effects-neutral and rely solely on `bot_priority_shift` to avoid double-counting aggression with R1.
2. Phase C wiring (per v1.3 packet §6): confirm that R1 firing must precede R2 for R2 to be eligible. The v1.3 packet implies `requires_enabled: true` on R2 with R1's `enables_events_runtime` targeting R2. Recommend: yes, R2 has `requires_enabled: true` and all three R1 options enable R2 with different modal default presets (per R1 worksheet §7 Q2).
3. Whether `bot_response_logic: 'historical'` on R2 should resolve to `always_allow` for RS specifically and `always_deny` for RBiH (parallel B2 row). Recommend: yes — per-faction historical defaults; this is the existing pattern.
4. Whether `csq_paramilitary_authorization_refused` is currently labeled `Counterfactual staff path` in `consequences.json`. To be verified by Canon Compliance during Phase D wiring; not authored here.
