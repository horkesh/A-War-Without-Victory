# Playtest findings ledger

> Generated from `FINDINGS.jsonl` by `tools/playtest/rollup.ts`. Do not hand-edit —
> edit the JSONL (e.g. to set `status`) and re-run the rollup.

**This is a record-only lane.** Findings here are observations from automated
playthroughs; none of them have been fixed by the harness, and a finding being
listed is not a claim that anyone has triaged it.

## Summary

| | Count |
| --- | --- |
| Runs contributing | 4 |
| Distinct findings | 22 |
| 🔴 Critical | 3 |
| 🟠 High | 3 |
| Bugs | 5 |
| Friction | 12 |
| Anomalies | 0 |
| Open questions | 5 |
| ⚠ Unconfirmed (suspected harness artefact) | 2 |

**Runs:** `RBiH-counterfactual-188w`, `RBiH-historical-188w`, `RBiH-passive-188w`, `ui-RBiH`

## Three worst friction moments

1. 🟠 **Player faces almost no decisions across the campaign** — `design:decision_cadence`, 3× · `07ddb9a5fad8`
2. 🟡 **Interactive control with no accessible label** — `ui:campaign_start`, 8× · `56b6bda5d71e`
3. ⚪ **Lever `replace_co` refused: insufficient_command_authority (#.#/#)** — `lever:replace_co`, 705× · `adf0fc5fc3d4`

## Bugs

| Severity | Finding | Surface | Hits | Runs | ID |
| --- | --- | --- | --- | --- | --- |
| 🔴 critical | Surface `campaign_start` renders no interactive controls | `ui:campaign_start` | 2× | ui-RBiH | `b81eaea102a2` |
| 🔴 critical | Error shown to the player on campaign_start: "Invalid decisionMode. Use emergent or historical." | `ui:campaign_start` | 1× | ui-RBiH | `0bb0b0c943ba` |
| 🔴 critical | Selecting a faction does not start a campaign | `ui:side_picker` | 1× | ui-RBiH | `a22af3625aa4` |
| 🟠 high | Uncaught page error: Cannot access 'ir' before initialization | `ui:renderer` | 2× | ui-RBiH | `6502868f6e7d` |
| 🟡 medium | Operation directive rejected with a reason the player is never shown | `ui:op_directive_rejection` | 29× | RBiH-counterfactual-188w | `ff048ab927a1` |

## Friction

| Severity | Finding | Surface | Hits | Runs | ID |
| --- | --- | --- | --- | --- | --- |
| 🟠 high | Player faces almost no decisions across the campaign | `design:decision_cadence` | 3× | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w | `07ddb9a5fad8` |
| 🟠 high | ⚠ _(unconfirmed)_ Command Authority never spent across the whole campaign | `engine:command_authority` | 1× | RBiH-historical-188w | `ab8f0ac92d5c` |
| 🟡 medium | Interactive control with no accessible label | `ui:campaign_start` | 8× | ui-RBiH | `56b6bda5d71e` |
| 🟡 medium | ⚠ _(unconfirmed)_ Command Authority sitting at cap at end of campaign | `engine:command_authority` | 1× | RBiH-historical-188w | `45e315b15082` |
| ⚪ low | Lever `replace_co` refused: insufficient_command_authority (#.#/#) | `lever:replace_co` | 705× | RBiH-counterfactual-188w | `adf0fc5fc3d4` |
| ⚪ low | Lever `request_op` refused: insufficient_command_authority (#.#/#) | `lever:request_op` | 685× | RBiH-counterfactual-188w | `410897e96e98` |
| ⚪ low | Lever `replace_co` refused: insufficient_command_authority (#/#) | `lever:replace_co` | 233× | RBiH-counterfactual-188w | `91b00300864a` |
| ⚪ low | Lever `request_op` refused: insufficient_command_authority (#/#) | `lever:request_op` | 225× | RBiH-counterfactual-188w | `ea9d210f3201` |
| ⚪ low | Decision `contact_group_plan_1994` shows no stakes on any option | `event:contact_group_plan_1994` | 3× | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w | `6c2feb3668af` |
| ⚪ low | Decision `owen_stoltenberg_plan_1993` shows no stakes on any option | `event:owen_stoltenberg_plan_1993` | 3× | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w | `a0ccbbe32a3a` |
| ⚪ low | Decision `vance_owen_plan_1993` shows no stakes on any option | `event:vance_owen_plan_1993` | 3× | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w | `78be3027390d` |
| ⚪ low | Lever `replace_co` refused: no_current_co | `lever:replace_co` | 2× | RBiH-counterfactual-188w | `0a33a4fe74ef` |

## Anomalies

_None recorded._

## Open questions

| Severity | Finding | Surface | Hits | Runs | ID |
| --- | --- | --- | --- | --- | --- |
| 🟡 medium | Decision `address_to_nation_rbih` has no authored historical default | `event:address_to_nation_rbih` | 3× | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w | `071aa478b1c1` |
| 🟡 medium | Decision `decorate_a_unit_rbih` has no authored historical default | `event:decorate_a_unit_rbih` | 3× | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w | `a3d3e77f12f8` |
| 🟡 medium | Decision `strategic_posture_review_rbih` has no authored historical default | `event:strategic_posture_review_rbih` | 3× | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w | `681d5f62ef1f` |
| 🟡 medium | Decision `visit_to_front_rbih` has no authored historical default | `event:visit_to_front_rbih` | 3× | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w | `b9ce83d06de9` |
| 🟡 medium | Decision `csq_third_party_mediation_offered` has no authored historical default | `event:csq_third_party_mediation_offered` | 1× | RBiH-counterfactual-188w | `121de4b137cf` |

---

## Detail

### 🔴 Error shown to the player on campaign_start: "Invalid decisionMode. Use emergent or historical."
| Field | Entry |
| --- | --- |
| Fingerprint | `0bb0b0c943ba` |
| Kind / severity | bug / critical |
| Surface | `ui:campaign_start` |
| Probe | `ui-error-banner` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `ui-RBiH`, turn 0 |
| Runs | ui-RBiH |
| Status | fixed |
After a normal interaction on campaign_start, the app displayed an error to the player: "Invalid decisionMode. Use emergent or historical.". The action the player attempted did not complete. [FIXED 2026-08-27: decisionMode IPC validator now tolerates undefined (electron-main.cjs); army_hq chunk cycle collapsed to one chunk (vite.config.ts).]
```json
{
  "element_id": "sp-error",
  "message": "Invalid decisionMode. Use emergent or historical."
}
```

### 🔴 Surface `campaign_start` renders no interactive controls
| Field | Entry |
| --- | --- |
| Fingerprint | `b81eaea102a2` |
| Kind / severity | bug / critical |
| Surface | `ui:campaign_start` |
| Probe | `ui-empty-surface` |
| Occurrences | 2 across 1 run(s) |
| First seen | run `ui-RBiH`, turn 0 |
| Runs | ui-RBiH |
| Status | fixed |
The campaign_start screen mounted but exposes nothing clickable. A player reaching this screen cannot proceed. [FIXED 2026-08-27: decisionMode IPC validator now tolerates undefined (electron-main.cjs); army_hq chunk cycle collapsed to one chunk (vite.config.ts).]
### 🔴 Selecting a faction does not start a campaign
| Field | Entry |
| --- | --- |
| Fingerprint | `a22af3625aa4` |
| Kind / severity | bug / critical |
| Surface | `ui:side_picker` |
| Probe | `ui-campaign-start-blocked` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `ui-RBiH`, turn 0 |
| Runs | ui-RBiH |
| Status | fixed |
The faction was clicked on the side picker and the picker is still on screen afterwards. The player cannot begin a game from the desktop UI. [FIXED 2026-08-27: decisionMode IPC validator now tolerates undefined (electron-main.cjs); army_hq chunk cycle collapsed to one chunk (vite.config.ts).]
```json
{
  "faction": "RBiH"
}
```

### 🟠 Player faces almost no decisions across the campaign
| Field | Entry |
| --- | --- |
| Fingerprint | `07ddb9a5fad8` |
| Kind / severity | friction / high |
| Surface | `design:decision_cadence` |
| Probe | `decision-cadence` |
| Occurrences | 3 across 3 run(s) |
| First seen | run `RBiH-historical-188w`, turn 188 |
| Runs | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w |
| Status | open |
26 decision(s) in 188 turns — 1.4 per 10 turns, against a 2 floor. The president spends most of the war pressing Advance with nothing to weigh, which is the opposite of the surface's stated premise.
```json
{
  "decisions": 26,
  "turns": 188,
  "per_ten_turns": 1.38,
  "floor": 2
}
```

### 🟠 Command Authority never spent across the whole campaign
| Field | Entry |
| --- | --- |
| Fingerprint | `ab8f0ac92d5c` |
| Kind / severity | friction / high |
| Surface | `engine:command_authority` |
| Probe | `command-authority` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `RBiH-historical-188w`, turn 188 |
| Runs | RBiH-historical-188w |
| Status | unconfirmed |
188 turns, 2 lever attempt(s), and lifetime_spent is 0. The policy DID reach for levers and every one of them was gated shut — the presidential surface is unreachable on this path. [HARNESS DEFECT — UNCONFIRMED: the policy never attempted a CA-costing lever, so this measures the policy, not the engine. See tools/playtest/TODO.md item 5.]
```json
{
  "current": 100,
  "max": 100,
  "lifetime_spent": 0
}
```

### 🟠 Uncaught page error: Cannot access 'ir' before initialization
| Field | Entry |
| --- | --- |
| Fingerprint | `6502868f6e7d` |
| Kind / severity | bug / high |
| Surface | `ui:renderer` |
| Probe | `ui-page-error` |
| Occurrences | 2 across 1 run(s) |
| First seen | run `ui-RBiH`, turn 0 |
| Runs | ui-RBiH |
| Status | fixed |
The renderer threw during normal play: Cannot access 'ir' before initialization [FIXED 2026-08-27: decisionMode IPC validator now tolerates undefined (electron-main.cjs); army_hq chunk cycle collapsed to one chunk (vite.config.ts).]
### 🟡 Command Authority sitting at cap at end of campaign
| Field | Entry |
| --- | --- |
| Fingerprint | `45e315b15082` |
| Kind / severity | friction / medium |
| Surface | `engine:command_authority` |
| Probe | `command-authority` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `RBiH-historical-188w`, turn 188 |
| Runs | RBiH-historical-188w |
| Status | unconfirmed |
Ended at 100/100. Income above the cap is wasted; a resource the player cannot spend is not a constraint, it is decoration. [HARNESS DEFECT — UNCONFIRMED: the policy never attempted a CA-costing lever, so this measures the policy, not the engine. See tools/playtest/TODO.md item 5.]
```json
{
  "current": 100,
  "max": 100
}
```

### 🟡 Decision `address_to_nation_rbih` has no authored historical default
| Field | Entry |
| --- | --- |
| Fingerprint | `071aa478b1c1` |
| Kind / severity | question / medium |
| Surface | `event:address_to_nation_rbih` |
| Probe | `decision-shape` |
| Occurrences | 3 across 3 run(s) |
| First seen | run `RBiH-historical-188w`, turn 91 |
| Runs | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w |
| Status | open |
No `historical_default_response_id`. The R8 choice policy cannot rank this decision, so a "historical" playthrough is silently guessing here. Needs an authored default or an explicit note that history offers none.
```json
{
  "event_id": "address_to_nation_rbih",
  "option_ids": [
    "address_defiance_rbih",
    "address_endurance_rbih",
    "address_appeal_world_rbih",
    "address_stay_silent_rbih"
  ]
}
```

### 🟡 Decision `csq_third_party_mediation_offered` has no authored historical default
| Field | Entry |
| --- | --- |
| Fingerprint | `121de4b137cf` |
| Kind / severity | question / medium |
| Surface | `event:csq_third_party_mediation_offered` |
| Probe | `decision-shape` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `RBiH-counterfactual-188w`, turn 75 |
| Runs | RBiH-counterfactual-188w |
| Status | open |
No `historical_default_response_id`. The R8 choice policy cannot rank this decision, so a "historical" playthrough is silently guessing here. Needs an authored default or an explicit note that history offers none.
```json
{
  "event_id": "csq_third_party_mediation_offered",
  "option_ids": [
    "engage_mediator",
    "decline_mediator"
  ]
}
```

### 🟡 Decision `decorate_a_unit_rbih` has no authored historical default
| Field | Entry |
| --- | --- |
| Fingerprint | `a3d3e77f12f8` |
| Kind / severity | question / medium |
| Surface | `event:decorate_a_unit_rbih` |
| Probe | `decision-shape` |
| Occurrences | 3 across 3 run(s) |
| First seen | run `RBiH-historical-188w`, turn 97 |
| Runs | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w |
| Status | open |
No `historical_default_response_id`. The R8 choice policy cannot rank this decision, so a "historical" playthrough is silently guessing here. Needs an authored default or an explicit note that history offers none.
```json
{
  "event_id": "decorate_a_unit_rbih",
  "option_ids": [
    "decorate_steadfast_rbih",
    "decorate_broadly_rbih",
    "decorate_decline_rbih"
  ]
}
```

### 🟡 Decision `strategic_posture_review_rbih` has no authored historical default
| Field | Entry |
| --- | --- |
| Fingerprint | `681d5f62ef1f` |
| Kind / severity | question / medium |
| Surface | `event:strategic_posture_review_rbih` |
| Probe | `decision-shape` |
| Occurrences | 3 across 3 run(s) |
| First seen | run `RBiH-historical-188w`, turn 95 |
| Runs | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w |
| Status | open |
No `historical_default_response_id`. The R8 choice policy cannot rank this decision, so a "historical" playthrough is silently guessing here. Needs an authored default or an explicit note that history offers none.
```json
{
  "event_id": "strategic_posture_review_rbih",
  "option_ids": [
    "press_offensive",
    "consolidate_defend",
    "seek_negotiation",
    "accept_ceasefire_terms"
  ]
}
```

### 🟡 Decision `visit_to_front_rbih` has no authored historical default
| Field | Entry |
| --- | --- |
| Fingerprint | `b9ce83d06de9` |
| Kind / severity | question / medium |
| Surface | `event:visit_to_front_rbih` |
| Probe | `decision-shape` |
| Occurrences | 3 across 3 run(s) |
| First seen | run `RBiH-historical-188w`, turn 92 |
| Runs | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w |
| Status | open |
No `historical_default_response_id`. The R8 choice policy cannot rank this decision, so a "historical" playthrough is silently guessing here. Needs an authored default or an explicit note that history offers none.
```json
{
  "event_id": "visit_to_front_rbih",
  "option_ids": [
    "visit_sarajevo",
    "visit_eastern_front",
    "visit_bihac",
    "stay_capital_rbih",
    "visit_press_rbih"
  ]
}
```

### 🟡 Interactive control with no accessible label
| Field | Entry |
| --- | --- |
| Fingerprint | `56b6bda5d71e` |
| Kind / severity | friction / medium |
| Surface | `ui:campaign_start` |
| Probe | `ui-unlabelled-control` |
| Occurrences | 8 across 1 run(s) |
| First seen | run `ui-RBiH`, turn 0 |
| Runs | ui-RBiH |
| Status | open |
A control on campaign_start has no text content and no accessible name — unreadable to a screen reader and ambiguous to everyone else.
```json
{
  "size": "87x318"
}
```

### 🟡 Operation directive rejected with a reason the player is never shown
| Field | Entry |
| --- | --- |
| Fingerprint | `ff048ab927a1` |
| Kind / severity | bug / medium |
| Surface | `ui:op_directive_rejection` |
| Probe | `discarded-explanation` |
| Occurrences | 29 across 1 run(s) |
| First seen | run `RBiH-counterfactual-188w`, turn 1 |
| Runs | RBiH-counterfactual-188w |
| Status | open |
Corps arbih_1st_corps rejected a directive toward op:banja_luka:banja_luka_2 for reason "objective_unreachable". The engine computed, stored and projected this — no surface under src/ui/ reads `op_directive_rejection`, so the player spends Command Authority, gets nothing, and is told nothing.
```json
{
  "corps": "arbih_1st_corps",
  "target_osid": "op:banja_luka:banja_luka_2",
  "reason": "objective_unreachable",
  "turn": 1
}
```

### ⚪ Decision `contact_group_plan_1994` shows no stakes on any option
| Field | Entry |
| --- | --- |
| Fingerprint | `6c2feb3668af` |
| Kind / severity | friction / low |
| Surface | `event:contact_group_plan_1994` |
| Probe | `option-stakes-gap` |
| Occurrences | 3 across 3 run(s) |
| First seen | run `RBiH-historical-188w`, turn 118 |
| Runs | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w |
| Status | open |
No option on "Contact Group Plan Presented" carries `dimension_shifts`, so the modal can quantify nothing. The player chooses blind and learns the cost only afterwards.
```json
{
  "event_id": "contact_group_plan_1994"
}
```

### ⚪ Decision `owen_stoltenberg_plan_1993` shows no stakes on any option
| Field | Entry |
| --- | --- |
| Fingerprint | `a0ccbbe32a3a` |
| Kind / severity | friction / low |
| Surface | `event:owen_stoltenberg_plan_1993` |
| Probe | `option-stakes-gap` |
| Occurrences | 3 across 3 run(s) |
| First seen | run `RBiH-historical-188w`, turn 71 |
| Runs | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w |
| Status | open |
No option on "Owen-Stoltenberg: Presidency Review" carries `dimension_shifts`, so the modal can quantify nothing. The player chooses blind and learns the cost only afterwards.
```json
{
  "event_id": "owen_stoltenberg_plan_1993"
}
```

### ⚪ Decision `vance_owen_plan_1993` shows no stakes on any option
| Field | Entry |
| --- | --- |
| Fingerprint | `78be3027390d` |
| Kind / severity | friction / low |
| Surface | `event:vance_owen_plan_1993` |
| Probe | `option-stakes-gap` |
| Occurrences | 3 across 3 run(s) |
| First seen | run `RBiH-historical-188w`, turn 40 |
| Runs | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w |
| Status | open |
No option on "Vance-Owen Peace Plan Presented" carries `dimension_shifts`, so the modal can quantify nothing. The player chooses blind and learns the cost only afterwards.
```json
{
  "event_id": "vance_owen_plan_1993"
}
```

### ⚪ Lever `replace_co` refused: no_current_co
| Field | Entry |
| --- | --- |
| Fingerprint | `0a33a4fe74ef` |
| Kind / severity | friction / low |
| Surface | `lever:replace_co` |
| Probe | `lever-refusal` |
| Occurrences | 2 across 1 run(s) |
| First seen | run `RBiH-counterfactual-188w`, turn 0 |
| Runs | RBiH-counterfactual-188w |
| Status | open |
`replace_co` was refused with "no_current_co". Recorded to measure how often the president reaches for a lever and is turned away, and whether the reason is one the UI ever shows.
```json
{
  "lever": "replace_co",
  "payload": {
    "corpsId": "arbih_3rd_corps"
  },
  "error": "no_current_co"
}
```

### ⚪ Lever `replace_co` refused: insufficient_command_authority (#/#)
| Field | Entry |
| --- | --- |
| Fingerprint | `91b00300864a` |
| Kind / severity | friction / low |
| Surface | `lever:replace_co` |
| Probe | `lever-refusal` |
| Occurrences | 233 across 1 run(s) |
| First seen | run `RBiH-counterfactual-188w`, turn 0 |
| Runs | RBiH-counterfactual-188w |
| Status | open |
`replace_co` was refused with "insufficient_command_authority (0/25)". Recorded to measure how often the president reaches for a lever and is turned away, and whether the reason is one the UI ever shows.
```json
{
  "lever": "replace_co",
  "payload": {
    "corpsId": "arbih_1st_corps"
  },
  "error": "insufficient_command_authority (0/25)"
}
```

### ⚪ Lever `replace_co` refused: insufficient_command_authority (#.#/#)
| Field | Entry |
| --- | --- |
| Fingerprint | `adf0fc5fc3d4` |
| Kind / severity | friction / low |
| Surface | `lever:replace_co` |
| Probe | `lever-refusal` |
| Occurrences | 705 across 1 run(s) |
| First seen | run `RBiH-counterfactual-188w`, turn 1 |
| Runs | RBiH-counterfactual-188w |
| Status | open |
`replace_co` was refused with "insufficient_command_authority (5.25/25)". Recorded to measure how often the president reaches for a lever and is turned away, and whether the reason is one the UI ever shows.
```json
{
  "lever": "replace_co",
  "payload": {
    "corpsId": "arbih_1st_corps"
  },
  "error": "insufficient_command_authority (5.25/25)"
}
```

### ⚪ Lever `request_op` refused: insufficient_command_authority (#.#/#)
| Field | Entry |
| --- | --- |
| Fingerprint | `410897e96e98` |
| Kind / severity | friction / low |
| Surface | `lever:request_op` |
| Probe | `lever-refusal` |
| Occurrences | 685 across 1 run(s) |
| First seen | run `RBiH-counterfactual-188w`, turn 1 |
| Runs | RBiH-counterfactual-188w |
| Status | open |
`request_op` was refused with "insufficient_command_authority (5.25/25)". Recorded to measure how often the president reaches for a lever and is turned away, and whether the reason is one the UI ever shows.
```json
{
  "lever": "request_op",
  "payload": {
    "corpsId": "arbih_1st_corps",
    "targetOsid": "op:banja_luka:banja_luka_2"
  },
  "error": "insufficient_command_authority (5.25/25)"
}
```

### ⚪ Lever `request_op` refused: insufficient_command_authority (#/#)
| Field | Entry |
| --- | --- |
| Fingerprint | `ea9d210f3201` |
| Kind / severity | friction / low |
| Surface | `lever:request_op` |
| Probe | `lever-refusal` |
| Occurrences | 225 across 1 run(s) |
| First seen | run `RBiH-counterfactual-188w`, turn 0 |
| Runs | RBiH-counterfactual-188w |
| Status | open |
`request_op` was refused with "insufficient_command_authority (0/25)". Recorded to measure how often the president reaches for a lever and is turned away, and whether the reason is one the UI ever shows.
```json
{
  "lever": "request_op",
  "payload": {
    "corpsId": "arbih_5th_corps",
    "targetOsid": "op:banja_luka:motike"
  },
  "error": "insufficient_command_authority (0/25)"
}
```
