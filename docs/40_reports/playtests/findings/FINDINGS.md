# Playtest findings ledger

> Generated from `FINDINGS.jsonl` by `tools/playtest/rollup.ts`. Do not hand-edit —
> edit the JSONL (e.g. to set `status`) and re-run the rollup.

**This is a record-only lane.** Findings here are observations from automated
playthroughs; none of them have been fixed by the harness, and a finding being
listed is not a claim that anyone has triaged it.

## Summary

| | Count |
| --- | --- |
| Runs contributing | 13 |
| Distinct findings | 72 |
| 🔴 Critical | 7 |
| 🟠 High | 13 |
| Bugs | 21 |
| Friction | 33 |
| Anomalies | 0 |
| Open questions | 18 |
| ⚠ Unconfirmed (suspected harness artefact) | 5 |

**Runs:** `HRHB-hist188-calib`, `RBiH-counterfactual-188w`, `RBiH-hist188-calib`, `RBiH-historical-188w`, `RBiH-passive-188w`, `RS-hist188-calib`, `copy-audit-2026-08-27`, `owner-review-20260827`, `owner-review-20260827-og`, `playthrough-20260827`, `ui-HRHB`, `ui-RBiH`, `ui-RS`

## Three worst friction moments

1. 🟠 **Player faces almost no decisions across the campaign** — `design:decision_cadence`, 6× · `07ddb9a5fad8`
2. 🟠 **Opening screen needs a complete redesign to match the game aesthetic** — `ui:case_file_opening`, 1× · `0ac8f0df01a3`
3. 🟠 **Decision Room room-only blockers are unreachable from the screen that refuses the turn** — `ui:decision_room`, 1× · `ae77d671480f`

## Bugs

| Severity | Finding | Surface | Hits | Runs | ID |
| --- | --- | --- | --- | --- | --- |
| 🔴 critical | Turn cannot be advanced after four attempts | `ui:turn_loop` | 25× | ui-RBiH, ui-RS, ui-HRHB | `6cd4fa018f9a` |
| 🔴 critical | ⚠ _(unconfirmed)_ No enabled ADVANCE control on the turn surface | `ui:turn_loop` | 15× | ui-RBiH | `fd61eb5e0970` |
| 🔴 critical | ⚠ _(unconfirmed)_ Campaign shell never becomes ready after Begin | `ui:campaign_start` | 8× | ui-RBiH | `f24f6c4f0c0f` |
| 🔴 critical | ⚠ _(unconfirmed)_ Clicking ADVANCE does not move the date | `ui:turn_loop` | 8× | ui-RBiH | `5cd22877eff8` |
| 🔴 critical | Surface `campaign_start` renders no interactive controls | `ui:campaign_start` | 2× | ui-RBiH | `b81eaea102a2` |
| 🔴 critical | Error shown to the player on campaign_start: "Invalid decisionMode. Use emergent or historical." | `ui:campaign_start` | 1× | ui-RBiH | `0bb0b0c943ba` |
| 🔴 critical | Selecting a faction does not start a campaign | `ui:side_picker` | 1× | ui-RBiH | `a22af3625aa4` |
| 🟠 high | A "front" has both sides in the same municipality | `content:priority_fronts` | 91× | ui-RBiH, ui-RS, ui-HRHB | `072256b5b4e9` |
| 🟠 high | Territory bar counts allied ground as "hostile-held" | `content:territory_bar` | 53× | ui-RBiH, ui-RS, ui-HRHB | `6c6f24ff39fa` |
| 🟠 high | The same sentence is maintained in two files and they disagree: "A thinly held front OG needs staff review." | `copy:duplicate_sources` | 5× | copy-audit-2026-08-27 | `102752f61718` |
| 🟠 high | Uncaught page error: Cannot access 'ir' before initialization | `ui:renderer` | 2× | ui-RBiH | `6502868f6e7d` |
| 🟠 high | Copy says a formation group is "thinly held" — an OG holds ground, it is not held | `ui:operational_sitrep` | 1× | owner-review-20260827-og | `78cd60d64f40` |
| 🟠 high | Two sources for the same sitrep copy disagree: i18n says "OGs", the hardcoded fallback says "sectors" | `ui:operational_sitrep` | 1× | owner-review-20260827-og | `7c85fee759a7` |
| 🟠 high | Priority-front labels pair a settlement with its own municipality under two names | `ui:situation_panel` | 1× | owner-review-20260827 | `d5daa3a10f94` |
| 🟠 high | Territory bar counts allied HVO ground as "hostile-held" | `ui:territory_bar` | 1× | owner-review-20260827 | `ab660671b06e` |
| 🟡 medium | Place names rendered with lower-case words after the first | `content:place_names` | 56× | ui-RBiH, ui-RS, ui-HRHB | `f832cc39d03a` |
| 🟡 medium | Operation directive rejected with a reason the player is never shown | `ui:op_directive_rejection` | 29× | RBiH-counterfactual-188w | `ff048ab927a1` |
| 🟡 medium | Retired term "sector" still in player-visible copy in ui\map\i18n\messages.en.ts | `copy:map/i18n/messages.en.ts` | 1× | copy-audit-2026-08-27 | `ad599a9641f7` |
| 🟡 medium | Retired term "sector" still in player-visible copy in ui\shared\operational_sitrep_views.ts | `copy:shared/operational_sitrep_views.ts` | 1× | copy-audit-2026-08-27 | `764fd700316e` |
| 🟡 medium | The Sector Attack operation type still says "Sector" in player-facing text | `ui:ops_planning` | 1× | owner-review-20260827-og | `2bfd8975d35e` |
| 🟡 medium | Place names are lower-cased after the first word | `ui:place_name_formatting` | 1× | owner-review-20260827 | `919e8513877e` |

## Friction

| Severity | Finding | Surface | Hits | Runs | ID |
| --- | --- | --- | --- | --- | --- |
| 🟠 high | Player faces almost no decisions across the campaign | `design:decision_cadence` | 6× | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w, RBiH-hist188-calib, RS-hist188-calib, HRHB-hist188-calib | `07ddb9a5fad8` |
| 🟠 high | ⚠ _(unconfirmed)_ Command Authority never spent across the whole campaign | `engine:command_authority` | 4× | RBiH-historical-188w, RBiH-hist188-calib, RS-hist188-calib, HRHB-hist188-calib | `ab8f0ac92d5c` |
| 🟠 high | Opening screen needs a complete redesign to match the game aesthetic | `ui:case_file_opening` | 1× | owner-review-20260827 | `0ac8f0df01a3` |
| 🟠 high | Decision Room room-only blockers are unreachable from the screen that refuses the turn | `ui:decision_room` | 1× | playthrough-20260827 | `ae77d671480f` |
| 🟡 medium | Interactive control with no accessible label | `ui:campaign_start` | 4784× | ui-RBiH, ui-RS, ui-HRHB | `56b6bda5d71e` |
| 🟡 medium | Interactive control with no accessible label | `ui:army_hq` | 4483× | ui-RBiH, ui-RS, ui-HRHB | `1bc0a56b95c2` |
| 🟡 medium | Interactive control with no accessible label | `ui:chronicle` | 4483× | ui-RBiH, ui-RS, ui-HRHB | `5ff0afb189d7` |
| 🟡 medium | Interactive control with no accessible label | `ui:codex` | 4475× | ui-RBiH, ui-RS, ui-HRHB | `850a3806cfbc` |
| 🟡 medium | Interactive control with no accessible label | `ui:desk` | 4475× | ui-RBiH, ui-RS, ui-HRHB | `1e2303120fe2` |
| 🟡 medium | Interactive control with no accessible label | `ui:records` | 4475× | ui-RBiH, ui-RS, ui-HRHB | `fc75f83f7348` |
| 🟡 medium | Interactive control with no accessible label | `ui:war_map` | 3553× | ui-RBiH, ui-RS, ui-HRHB | `b615fa723d8f` |
| 🟡 medium | Interactive control with no accessible label | `ui:in_game` | 1501× | ui-RBiH, ui-HRHB | `50b8dda5812e` |
| 🟡 medium | Peace-plan modal offers no historical default and no per-option stakes | `ui:peace_plan_modal` | 26× | ui-RBiH, ui-HRHB | `182e6e7f012e` |
| 🟡 medium | Surface "in_game" renders text in 5 different font families | `content:typography` | 14× | ui-RBiH, ui-HRHB | `35b2632dfcf3` |
| 🟡 medium | Surface "codex" has no reachable control | `ui:codex` | 5× | ui-RBiH | `e4b031f59b77` |
| 🟡 medium | Surface "desk" has no reachable control | `ui:desk` | 5× | ui-RBiH | `81513817311f` |
| 🟡 medium | Surface "records" has no reachable control | `ui:records` | 5× | ui-RBiH | `9a16b34a3a19` |
| 🟡 medium | ⚠ _(unconfirmed)_ Command Authority sitting at cap at end of campaign | `engine:command_authority` | 4× | RBiH-historical-188w, RBiH-hist188-calib, RS-hist188-calib, HRHB-hist188-calib | `45e315b15082` |
| 🟡 medium | Surface "army_hq" has no reachable control | `ui:army_hq` | 4× | ui-RBiH | `72962be702b1` |
| 🟡 medium | Surface "chronicle" has no reachable control | `ui:chronicle` | 4× | ui-RBiH | `a1259f689f15` |
| 🟡 medium | Surface "war_map" has no reachable control | `ui:war_map` | 4× | ui-RBiH | `6f579329b22e` |
| 🟡 medium | Advance is offered and does nothing when a room-only blocker is outstanding | `ui:turn_loop` | 1× | playthrough-20260827 | `582f880d10c1` |
| 🟡 medium | Typography is inconsistent across surfaces | `ui:typography` | 1× | owner-review-20260827 | `50bb59700448` |
| ⚪ low | Lever `replace_co` refused: insufficient_command_authority (#.#/#) | `lever:replace_co` | 705× | RBiH-counterfactual-188w | `adf0fc5fc3d4` |
| ⚪ low | Lever `request_op` refused: insufficient_command_authority (#.#/#) | `lever:request_op` | 685× | RBiH-counterfactual-188w | `410897e96e98` |
| ⚪ low | Lever `replace_co` refused: insufficient_command_authority (#/#) | `lever:replace_co` | 233× | RBiH-counterfactual-188w | `91b00300864a` |
| ⚪ low | Lever `request_op` refused: insufficient_command_authority (#/#) | `lever:request_op` | 225× | RBiH-counterfactual-188w | `ea9d210f3201` |
| ⚪ low | Decision `contact_group_plan_1994` shows no stakes on any option | `event:contact_group_plan_1994` | 4× | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w, RBiH-hist188-calib | `6c2feb3668af` |
| ⚪ low | Decision `owen_stoltenberg_plan_1993` shows no stakes on any option | `event:owen_stoltenberg_plan_1993` | 4× | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w, RBiH-hist188-calib | `a0ccbbe32a3a` |
| ⚪ low | Decision `vance_owen_plan_1993` shows no stakes on any option | `event:vance_owen_plan_1993` | 4× | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w, RBiH-hist188-calib | `78be3027390d` |
| ⚪ low | Lever `replace_co` refused: no_current_co | `lever:replace_co` | 2× | RBiH-counterfactual-188w | `0a33a4fe74ef` |
| ⚪ low | Decision `gornji_vakuf_clashes_1993` shows no stakes on any option | `event:gornji_vakuf_clashes_1993` | 1× | HRHB-hist188-calib | `7269b4bdc6f0` |
| ⚪ low | Decision `hrhb_washington_agreement_1994` shows no stakes on any option | `event:hrhb_washington_agreement_1994` | 1× | HRHB-hist188-calib | `bea6d0522e3e` |

## Anomalies

_None recorded._

## Open questions

| Severity | Finding | Surface | Hits | Runs | ID |
| --- | --- | --- | --- | --- | --- |
| 🟠 high | RS opens with six required presidential decisions; RBiH opens with one | `design:opening_decision_load` | 1× | playthrough-20260827 | `7afde0e4e2d4` |
| 🟡 medium | Decision `address_to_nation_rbih` has no authored historical default | `event:address_to_nation_rbih` | 4× | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w, RBiH-hist188-calib | `071aa478b1c1` |
| 🟡 medium | Decision `decorate_a_unit_rbih` has no authored historical default | `event:decorate_a_unit_rbih` | 4× | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w, RBiH-hist188-calib | `a3d3e77f12f8` |
| 🟡 medium | Decision `strategic_posture_review_rbih` has no authored historical default | `event:strategic_posture_review_rbih` | 4× | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w, RBiH-hist188-calib | `681d5f62ef1f` |
| 🟡 medium | Decision `visit_to_front_rbih` has no authored historical default | `event:visit_to_front_rbih` | 4× | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w, RBiH-hist188-calib | `b9ce83d06de9` |
| 🟡 medium | Decision `address_to_nation_hrhb` has no authored historical default | `event:address_to_nation_hrhb` | 1× | HRHB-hist188-calib | `d4d184df999e` |
| 🟡 medium | Decision `address_to_nation_rs` has no authored historical default | `event:address_to_nation_rs` | 1× | RS-hist188-calib | `a89743c17ab3` |
| 🟡 medium | Decision `csq_third_party_mediation_offered` has no authored historical default | `event:csq_third_party_mediation_offered` | 1× | RBiH-counterfactual-188w | `121de4b137cf` |
| 🟡 medium | Decision `decorate_a_unit_hrhb` has no authored historical default | `event:decorate_a_unit_hrhb` | 1× | HRHB-hist188-calib | `40cebc4589ae` |
| 🟡 medium | Decision `decorate_a_unit_rs` has no authored historical default | `event:decorate_a_unit_rs` | 1× | RS-hist188-calib | `fb548f6d5e27` |
| 🟡 medium | Decision `drina_cleansing_decision_1992` has no authored historical default | `event:drina_cleansing_decision_1992` | 1× | RS-hist188-calib | `82d7f0d636aa` |
| 🟡 medium | Decision `milosevic_drina_warning` has no authored historical default | `event:milosevic_drina_warning` | 1× | RS-hist188-calib | `448a72521b99` |
| 🟡 medium | Decision `milosevic_isolation_warning_aug92` has no authored historical default | `event:milosevic_isolation_warning_aug92` | 1× | RS-hist188-calib | `36f51e543f63` |
| 🟡 medium | Decision `milosevic_owen_stoltenberg_distancing` has no authored historical default | `event:milosevic_owen_stoltenberg_distancing` | 1× | RS-hist188-calib | `ad92ce300e18` |
| 🟡 medium | Decision `milosevic_vopp_pressure` has no authored historical default | `event:milosevic_vopp_pressure` | 1× | RS-hist188-calib | `c019b7857b38` |
| 🟡 medium | Decision `strategic_posture_review_rs` has no authored historical default | `event:strategic_posture_review_rs` | 1× | RS-hist188-calib | `14db02d9277d` |
| 🟡 medium | Decision `visit_to_front_hrhb` has no authored historical default | `event:visit_to_front_hrhb` | 1× | HRHB-hist188-calib | `864769f1dd1d` |
| 🟡 medium | Decision `visit_to_front_rs` has no authored historical default | `event:visit_to_front_rs` | 1× | RS-hist188-calib | `7a0d6330c9bc` |

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
### 🔴 Campaign shell never becomes ready after Begin
| Field | Entry |
| --- | --- |
| Fingerprint | `f24f6c4f0c0f` |
| Kind / severity | bug / critical |
| Surface | `ui:campaign_start` |
| Probe | `ui-campaign-never-ready` |
| Occurrences | 8 across 1 run(s) |
| First seen | run `ui-RBiH`, turn 0 |
| Runs | ui-RBiH |
| Status | unconfirmed |
Begin was clicked and neither a dated turn readout nor the in-game navigation appeared within 120s. The player is left on a screen that never finishes loading. [DRIVER ARTIFACT: fired only while the readiness regex was corrupt (a shell heredoc turned  into a literal backspace), so the predicate could never match. Fixed; re-verify before treating as an app defect.]
```json
{
  "faction": "RBiH"
}
```

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

### 🔴 Clicking ADVANCE does not move the date
| Field | Entry |
| --- | --- |
| Fingerprint | `5cd22877eff8` |
| Kind / severity | bug / critical |
| Surface | `ui:turn_loop` |
| Probe | `ui-advance-noop` |
| Occurrences | 8 across 1 run(s) |
| First seen | run `ui-RBiH`, turn 0 |
| Runs | ui-RBiH |
| Status | unconfirmed |
ADVANCE was clicked at 6 Apr 1992 and the date readout was unchanged 30s later. The turn did not advance. [DRIVER ARTIFACT: the driver had paused the game with a blind Escape, or was looking for ADVANCE from a surface that has none. Both fixed; see tools/playtest/TODO.md. Not an app defect.]
```json
{
  "turn": 1,
  "date": "6 Apr 1992"
}
```

### 🔴 Turn cannot be advanced after four attempts
| Field | Entry |
| --- | --- |
| Fingerprint | `6cd4fa018f9a` |
| Kind / severity | bug / critical |
| Surface | `ui:turn_loop` |
| Probe | `ui-turn-blocked` |
| Occurrences | 25 across 3 run(s) |
| First seen | run `ui-RBiH`, turn 0 |
| Runs | ui-RBiH, ui-RS, ui-HRHB |
| Status | open |
At 1 Jun 1992 the driver cleared every known blocker four times and the date never moved. Either a blocker type is unhandled or ADVANCE is genuinely inert. Screen state attached.
```json
{
  "turn": 9,
  "date": "1 Jun 1992",
  "screen": {
    "date": "1 Jun 1992",
    "modals": [],
    "buttons": [
      "5",
      "2",
      "5",
      "2",
      "2",
      "2",
      "2",
      "2",
      "President's Desk",
      "Command Surface",
      "Diplomacy",
      "Intelligence",
      "Army HQ",
      "Chronicle",
      "Faction",
      "War Map",
      "Advance",
      "SIGNATURE REQUIRED"
    ]
  }
}
```

### 🔴 No enabled ADVANCE control on the turn surface
| Field | Entry |
| --- | --- |
| Fingerprint | `fd61eb5e0970` |
| Kind / severity | bug / critical |
| Surface | `ui:turn_loop` |
| Probe | `ui-no-advance-control` |
| Occurrences | 15 across 1 run(s) |
| First seen | run `ui-RBiH`, turn 0 |
| Runs | ui-RBiH |
| Status | unconfirmed |
At turn 1 (6 APR 1992) there is no clickable ADVANCE. The player cannot move the war forward. [DRIVER ARTIFACT — the surface tour left the app inside Army HQ Main Staff, which has no ADVANCE of its own. Driver now returns to the shell before advancing. Re-verify.]
```json
{
  "turn": 1,
  "date": "6 APR 1992"
}
```

### 🟠 A "front" has both sides in the same municipality
| Field | Entry |
| --- | --- |
| Fingerprint | `072256b5b4e9` |
| Kind / severity | bug / high |
| Surface | `content:priority_fronts` |
| Probe | `ui-front-pair-self-reference` |
| Occurrences | 91 across 3 run(s) |
| First seen | run `ui-RBiH`, turn 0 |
| Runs | ui-RBiH, ui-RS, ui-HRHB |
| Status | open |
On campaign_start, the priority front "Aginci (bosanska dubica) - Kozarska dubica (bosanska dubica)" names two places that resolve to the same municipality ("bosanska dubica") once 1990 and RS names are reconciled. A front between a municipality and itself is not a front. Expected reading: one place — "Aginci in Kozarska dubica".
```json
{
  "pair": "Aginci (bosanska dubica) - Kozarska dubica (bosanska dubica)",
  "resolved_municipality": "bosanska dubica",
  "places": [
    {
      "settlement": "Aginci",
      "municipality": "bosanska dubica"
    },
    {
      "settlement": "Kozarska dubica",
      "municipality": "bosanska dubica"
    }
  ],
  "seen_on": "campaign_start"
}
```

### 🟠 Territory bar counts allied ground as "hostile-held"
| Field | Entry |
| --- | --- |
| Fingerprint | `6c6f24ff39fa` |
| Kind / severity | bug / high |
| Surface | `content:territory_bar` |
| Probe | `ui-alliance-hostile-accounting` |
| Occurrences | 53 across 3 run(s) |
| First seen | run `ui-RBiH`, turn 0 |
| Runs | ui-RBiH, ui-RS, ui-HRHB |
| Status | open |
On campaign_start the bar reads Friendly 31.5% / Hostile-held 68.5% while an alliance is active ("close coordination"). An ally's territory is not hostile. Friendly + hostile sums to 100%, so this is a binary player-vs-everyone-else split that ignores alliance state entirely. The alliance changes over a campaign, so the split has to track the relationship, not a fixed faction list.
```json
{
  "friendly_pct": "31.5",
  "hostile_pct": "68.5",
  "alliance_posture": "close coordination",
  "sums_to_100": true,
  "seen_on": "campaign_start"
}
```

### 🟠 The same sentence is maintained in two files and they disagree: "A thinly held front OG needs staff review."
| Field | Entry |
| --- | --- |
| Fingerprint | `102752f61718` |
| Kind / severity | bug / high |
| Surface | `copy:duplicate_sources` |
| Probe | `copy-divergent-duplicate` |
| Occurrences | 5 across 1 run(s) |
| First seen | run `copy-audit-2026-08-27`, turn 0 |
| Runs | copy-audit-2026-08-27 |
| Status | open |
Two sources render what is structurally the same sentence with different wording, so which words the player sees depends on which code path runs. This is the signature of a rename that updated one copy and missed the other.

Variants:
  - "A thinly held front OG needs staff review."
  - "A thinly held front sector needs staff review."
```json
{
  "shape": "a thinly held front <term> needs staff review.",
  "locations": [
    "src/ui/map/i18n/messages.en.ts:3745 operationalSitrep.headline.frontExposed.one",
    "src/ui/shared/operational_sitrep_views.ts:178 (hardcoded)"
  ],
  "variants": [
    "A thinly held front OG needs staff review.",
    "A thinly held front sector needs staff review."
  ]
}
```

### 🟠 Player faces almost no decisions across the campaign
| Field | Entry |
| --- | --- |
| Fingerprint | `07ddb9a5fad8` |
| Kind / severity | friction / high |
| Surface | `design:decision_cadence` |
| Probe | `decision-cadence` |
| Occurrences | 6 across 6 run(s) |
| First seen | run `RBiH-historical-188w`, turn 188 |
| Runs | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w, RBiH-hist188-calib, RS-hist188-calib, HRHB-hist188-calib |
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

### 🟠 RS opens with six required presidential decisions; RBiH opens with one
| Field | Entry |
| --- | --- |
| Fingerprint | `7afde0e4e2d4` |
| Kind / severity | question / high |
| Surface | `design:opening_decision_load` |
| Probe | `playthrough-observation` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `playthrough-20260827`, turn 1 |
| Runs | playthrough-20260827 |
| Status | open |
Measured on the first turn of each campaign through the real UI. RS shows "Decision 6 items - REQ 6" in the Decision Room at 6 Apr 1992; RBiH shows one required decision ("What Is Bosnia?"). HRHB behaves like RBiH. Compounding it, only TWO of the six surface as Presidential Inbox cards — the other four exist solely inside the Decision Room, so a player who works the inbox and presses Advance is refused with no visible reason on that screen. Recorded as a QUESTION, not a defect: a heavier opening for RS may be deliberate. But the six-to-one asymmetry has never been stated anywhere, and the split between inbox-visible and room-only decisions is a discoverability problem regardless of whether the count is intended.
```json
{
  "RS": "Decision 6 items - REQ 6 at 6 Apr 1992; 2 of 6 visible as inbox cards",
  "RBiH": "1 required decision (What Is Bosnia?)",
  "HRHB": "behaves like RBiH",
  "method": "real Electron UI, DOM clicks, tools/playtest/run_electron.ts"
}
```

### 🟠 Command Authority never spent across the whole campaign
| Field | Entry |
| --- | --- |
| Fingerprint | `ab8f0ac92d5c` |
| Kind / severity | friction / high |
| Surface | `engine:command_authority` |
| Probe | `command-authority` |
| Occurrences | 4 across 4 run(s) |
| First seen | run `RBiH-historical-188w`, turn 188 |
| Runs | RBiH-historical-188w, RBiH-hist188-calib, RS-hist188-calib, HRHB-hist188-calib |
| Status | unconfirmed |
188 turns, 2 lever attempt(s), and lifetime_spent is 0. The policy DID reach for levers and every one of them was gated shut — the presidential surface is unreachable on this path. [HARNESS DEFECT — UNCONFIRMED: the policy never attempted a CA-costing lever, so this measures the policy, not the engine. See tools/playtest/TODO.md item 5.]
```json
{
  "current": 100,
  "max": 100,
  "lifetime_spent": 0
}
```

### 🟠 Opening screen needs a complete redesign to match the game aesthetic
| Field | Entry |
| --- | --- |
| Fingerprint | `0ac8f0df01a3` |
| Kind / severity | friction / high |
| Surface | `ui:case_file_opening` |
| Probe | `owner-review` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `owner-review-20260827`, turn 0 |
| Runs | owner-review-20260827 |
| Status | open |
Owner on the case-file opening, verbatim: it "screams AI slop design with big italic letters for highlight and so on. We need to rework it completely so it has the same aesthetic as the rest of the game." This is a REDESIGN, not a tweak — the current screen is the 2026-08-23 case-file flow that was routed to the desktop launch on 2026-08-27, so it is newly the first thing every player sees. Not to be actioned without a design pass.
```json
{
  "owner_quote": "screams AI slop design with big italic letters for highlight and so on",
  "current_screen": "tools/playtest/evidence/20260827_case_file_landing.png",
  "note": "The opening was made reachable by commit 554e89377; before that players never saw it."
}
```

### 🟠 Decision Room room-only blockers are unreachable from the screen that refuses the turn
| Field | Entry |
| --- | --- |
| Fingerprint | `ae77d671480f` |
| Kind / severity | friction / high |
| Surface | `ui:decision_room` |
| Probe | `playthrough-observation` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `playthrough-20260827`, turn 9 |
| Runs | playthrough-20260827 |
| Status | open |
RBiH and HRHB both stall at turn 9 (1 Jun 1992) and RS at turn 1, on the same shape: a required item that exists ONLY inside the Decision Room while the turn surface shows nothing that leads to it. At the stall the shell offers ADVANCE (which does nothing), a SIGNATURE REQUIRED badge, and no REVIEW BLOCKERS affordance. The ALL tab then lists optional leadership gestures (Visit the front, Address the nation, Decorate a unit) ABOVE the single blocking item, so the first thing a player sees in the room is not what is holding their turn. Two factions reaching the identical state at different turns establishes this as structural rather than faction-specific or event-specific.
**Repro:** Play RBiH or HRHB to turn 9, or RS to turn 1, through the UI.

```json
{
  "RBiH": "stalls turn 9 (1 Jun 1992)",
  "HRHB": "stalls turn 9 (1 Jun 1992) — same state",
  "RS": "stalls turn 1 (6 Apr 1992) — same state, reached sooner via 6 opening decisions",
  "screenshot": "tools/playtest/evidence/20260827_turn9_decision_room_blocker.png",
  "room_state": "ALL 13 items - REQ 1 - REC 3 - MON 4 - RECORD 5; DECISION 1 item - REQ 1"
}
```

### 🟠 Copy says a formation group is "thinly held" — an OG holds ground, it is not held
| Field | Entry |
| --- | --- |
| Fingerprint | `78cd60d64f40` |
| Kind / severity | bug / high |
| Surface | `ui:operational_sitrep` |
| Probe | `owner-review` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `owner-review-20260827-og`, turn 1 |
| Runs | owner-review-20260827-og |
| Status | open |
The Situation panel reads "Widespread thinly held front OGs need staff review." and "Front posture: widespread contact; thinly held OGs: widespread". Owner: an Operational Group is itself a COLLECTION OF FORMATIONS, so it cannot be "thinly held" — you hold ground, not a formation group. The phrasing should describe the group's dispersion, e.g. "OG XXY is spread out" / overextended / dispersed.

MECHANISM: sectors were renamed to OGs as a naming-only change (see the standing note that sectors ARE standing OGs). The rename substituted the NOUN everywhere but left the adjective that only made sense for terrain. "Thinly held sector" was correct English; "thinly held OG" is a category error produced by a find-and-replace.

This is a copy/design fix, NOT a sector-removal refactor — that is explicitly out of bounds.
```json
{
  "strings": [
    "operationalSitrep.headline.frontExposed.widespread",
    "operationalSitrep.headline.frontExposed.many",
    "operationalSitrep.headline.frontExposed.several",
    "operationalSitrep.headline.frontExposed.one",
    "operationalSitrep.headline.frontExposed.none",
    "situation.frontsLine"
  ],
  "file": "src/ui/map/i18n/messages.en.ts:3693,3742-3746",
  "owner_suggestion": "OG XXY is spread out (or similar)"
}
```

### 🟠 Two sources for the same sitrep copy disagree: i18n says "OGs", the hardcoded fallback says "sectors"
| Field | Entry |
| --- | --- |
| Fingerprint | `7c85fee759a7` |
| Kind / severity | bug / high |
| Surface | `ui:operational_sitrep` |
| Probe | `owner-review` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `owner-review-20260827-og`, turn 1 |
| Runs | owner-review-20260827-og |
| Status | open |
The same five sitrep headlines exist twice. `messages.en.ts:3742-3746` says "thinly held front OGs"; the hardcoded English fallback in `operational_sitrep_views.ts:174-179` still says "thinly held front sectors". Whichever path renders the fallback shows the pre-rename term, so the player can see BOTH vocabularies for the same concept depending on code path. The rename updated the i18n table and missed the fallback beside it.
```json
{
  "i18n": "src/ui/map/i18n/messages.en.ts:3742-3746 — \"thinly held front OGs\"",
  "fallback": "src/ui/shared/operational_sitrep_views.ts:174-179 — \"thinly held front sectors\""
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
### 🟠 Priority-front labels pair a settlement with its own municipality under two names
| Field | Entry |
| --- | --- |
| Fingerprint | `d5daa3a10f94` |
| Kind / severity | bug / high |
| Surface | `ui:situation_panel` |
| Probe | `owner-review` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `owner-review-20260827`, turn 1 |
| Runs | owner-review-20260827 |
| Status | open |
The Situation panel reads "Priority fronts: Aginci (bosanska dubica) - Kozarska dubica (bosanska dubica); Arapusa (bosanska krupa) - Donji dubovik (bosanska krupa)". Owner: it should read as one place — Aginci in Kozarska Dubica — not as a front between two. HYPOTHESIS, NOT VERIFIED: Bosanska Dubica was renamed Kozarska Dubica by RS, so both sides of the pair may be resolving to the SAME municipality under its 1990 name and its RS name, producing a front against itself. Needs verification against the front-pair source before anyone acts on that reading.
**Repro:** Start any RBiH campaign; read the Situation panel on the Desk at 6 Apr 1992.

```json
{
  "observed": "Aginci (bosanska dubica) - Kozarska dubica (bosanska dubica)",
  "owner_expectation": "Aginci in Kozarska Dubica",
  "second_instance": "Arapusa (bosanska krupa) - Donji dubovik (bosanska krupa)",
  "screenshot": "tools/playtest/evidence/20260827_owner_review_situation_panel.png"
}
```

### 🟠 Territory bar counts allied HVO ground as "hostile-held"
| Field | Entry |
| --- | --- |
| Fingerprint | `ab660671b06e` |
| Kind / severity | bug / high |
| Surface | `ui:territory_bar` |
| Probe | `owner-review` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `owner-review-20260827`, turn 1 |
| Runs | owner-review-20260827 |
| Status | open |
The status bar reads "Friendly 31.5% | Hostile-held 68.5%" while the same bar shows ALLIED and the Situation panel reports "Bosniak-Croat Coordination — Alliance posture: close coordination". If HVO is an ally, HVO-held territory is not hostile. The split appears to be a binary player-vs-everyone-else computation that ignores alliance state, so the player is shown a strategic picture that is wrong in their own favour-reading. Note the alliance later degrades ("Alliance posture: strained" by 1 Jun 1992), so any fix has to track a CHANGING relationship, not a fixed faction list.
**Repro:** Read the bottom status bar during any RBiH campaign while the HVO alliance holds.

```json
{
  "observed": "Friendly 31.5% | Hostile-held 68.5%, with ALLIED shown on the same bar",
  "alliance_state": "Bosniak-Croat Coordination: close coordination (t1) -> strained (t9)"
}
```

### 🟡 Place names rendered with lower-case words after the first
| Field | Entry |
| --- | --- |
| Fingerprint | `f832cc39d03a` |
| Kind / severity | bug / medium |
| Surface | `content:place_names` |
| Probe | `ui-place-name-casing` |
| Occurrences | 56 across 3 run(s) |
| First seen | run `ui-RBiH`, turn 0 |
| Runs | ui-RBiH, ui-RS, ui-HRHB |
| Status | open |
On campaign_start, 4 place-name fragment(s) capitalise only the first word. Bosnian place names capitalise every word: "Donji Dubovik (Bosanska Krupa)", not "Donji dubovik (bosanska krupa)". Signature of a capitalise-first-letter transform over an id-derived string rather than a display name.
```json
{
  "samples": [
    "(bosanska dubica)",
    "(bosanska krupa)",
    "Kozarska dubica",
    "Donji dubovik"
  ],
  "count": 4,
  "seen_on": "campaign_start"
}
```

### 🟡 Surface "in_game" renders text in 5 different font families
| Field | Entry |
| --- | --- |
| Fingerprint | `35b2632dfcf3` |
| Kind / severity | friction / medium |
| Surface | `content:typography` |
| Probe | `ui-font-family-drift` |
| Occurrences | 14 across 2 run(s) |
| First seen | run `ui-RBiH`, turn 0 |
| Runs | ui-RBiH, ui-HRHB |
| Status | open |
5 distinct primary font families are in use on one surface (budget 3): Helvetica Neue, IBM Plex Mono, IBM Plex Sans Condensed, Courier New, Georgia. Typography inconsistency across surfaces was raised by the owner as a defect rather than deliberate contrast. Once a typographic system is agreed, set the budget to it and this becomes a regression guard.
```json
{
  "families": [
    "Courier New",
    "Georgia",
    "Helvetica Neue",
    "IBM Plex Mono",
    "IBM Plex Sans Condensed"
  ],
  "budget": 3,
  "seen_on": "in_game"
}
```

### 🟡 Retired term "sector" still in player-visible copy in ui\map\i18n\messages.en.ts
| Field | Entry |
| --- | --- |
| Fingerprint | `ad599a9641f7` |
| Kind / severity | bug / medium |
| Surface | `copy:map/i18n/messages.en.ts` |
| Probe | `copy-retired-vocabulary` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `copy-audit-2026-08-27`, turn 0 |
| Runs | copy-audit-2026-08-27 |
| Status | open |
6 display string(s) in src/ui/map/i18n/messages.en.ts still say "sector" after the rename to OG / Operational Group. Placeholders like {sector} are excluded — these are words the player reads. A player who sees both vocabularies for one concept has to work out that they are the same thing.
```json
{
  "count": 6,
  "strings": [
    "119: opsPlanning.param.opType.sector_attack => Sector Attack",
    "133: opsPlanning.param.subtitle.sector_attack => One sector push",
    "3981: opsPlanning.param.label.sectorAttack => Sector Attack",
    "3995: opsPlanning.param.subtitle.sectorAttack => One sector push",
    "4001: opsPlanning.param.title.sectorAttack => Sector Attack — Commits 3-8 brigades to push on a single sector front.",
    "4002: opsPlanning.param.title.generalOffensive => General Offensive — Corps-wide multi-axis assault. High risk, high rew"
  ]
}
```

### 🟡 Retired term "sector" still in player-visible copy in ui\shared\operational_sitrep_views.ts
| Field | Entry |
| --- | --- |
| Fingerprint | `764fd700316e` |
| Kind / severity | bug / medium |
| Surface | `copy:shared/operational_sitrep_views.ts` |
| Probe | `copy-retired-vocabulary` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `copy-audit-2026-08-27`, turn 0 |
| Runs | copy-audit-2026-08-27 |
| Status | open |
6 display string(s) in src/ui/shared/operational_sitrep_views.ts still say "sector" after the rename to OG / Operational Group. Placeholders like {sector} are excluded — these are words the player reads. A player who sees both vocabularies for one concept has to work out that they are the same thing.
```json
{
  "count": 6,
  "strings": [
    "175: (hardcoded) => Widespread thinly held front sectors need staff review.",
    "176: (hardcoded) => Many thinly held front sectors need staff review.",
    "177: (hardcoded) => Several thinly held front sectors need staff review.",
    "178: (hardcoded) => A thinly held front sector needs staff review.",
    "179: (hardcoded) => No thinly held front sectors are currently reported.",
    "356: (hardcoded) => Staff handoff: inspect front sectors in War Summary; no direct preside"
  ]
}
```

### 🟡 Command Authority sitting at cap at end of campaign
| Field | Entry |
| --- | --- |
| Fingerprint | `45e315b15082` |
| Kind / severity | friction / medium |
| Surface | `engine:command_authority` |
| Probe | `command-authority` |
| Occurrences | 4 across 4 run(s) |
| First seen | run `RBiH-historical-188w`, turn 188 |
| Runs | RBiH-historical-188w, RBiH-hist188-calib, RS-hist188-calib, HRHB-hist188-calib |
| Status | unconfirmed |
Ended at 100/100. Income above the cap is wasted; a resource the player cannot spend is not a constraint, it is decoration. [HARNESS DEFECT — UNCONFIRMED: the policy never attempted a CA-costing lever, so this measures the policy, not the engine. See tools/playtest/TODO.md item 5.]
```json
{
  "current": 100,
  "max": 100
}
```

### 🟡 Decision `address_to_nation_hrhb` has no authored historical default
| Field | Entry |
| --- | --- |
| Fingerprint | `d4d184df999e` |
| Kind / severity | question / medium |
| Surface | `event:address_to_nation_hrhb` |
| Probe | `decision-shape` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `HRHB-hist188-calib`, turn 91 |
| Runs | HRHB-hist188-calib |
| Status | open |
No `historical_default_response_id`. The R8 choice policy cannot rank this decision, so a "historical" playthrough is silently guessing here. Needs an authored default or an explicit note that history offers none.
```json
{
  "event_id": "address_to_nation_hrhb",
  "option_ids": [
    "address_defiance_hrhb",
    "address_endurance_hrhb",
    "address_conciliation_hrhb",
    "address_stay_silent_hrhb"
  ]
}
```

### 🟡 Decision `address_to_nation_rbih` has no authored historical default
| Field | Entry |
| --- | --- |
| Fingerprint | `071aa478b1c1` |
| Kind / severity | question / medium |
| Surface | `event:address_to_nation_rbih` |
| Probe | `decision-shape` |
| Occurrences | 4 across 4 run(s) |
| First seen | run `RBiH-historical-188w`, turn 91 |
| Runs | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w, RBiH-hist188-calib |
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

### 🟡 Decision `address_to_nation_rs` has no authored historical default
| Field | Entry |
| --- | --- |
| Fingerprint | `a89743c17ab3` |
| Kind / severity | question / medium |
| Surface | `event:address_to_nation_rs` |
| Probe | `decision-shape` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `RS-hist188-calib`, turn 97 |
| Runs | RS-hist188-calib |
| Status | open |
No `historical_default_response_id`. The R8 choice policy cannot rank this decision, so a "historical" playthrough is silently guessing here. Needs an authored default or an explicit note that history offers none.
```json
{
  "event_id": "address_to_nation_rs",
  "option_ids": [
    "address_defiance_rs",
    "address_endurance_rs",
    "address_reassure_patron_rs",
    "address_stay_silent_rs"
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

### 🟡 Decision `decorate_a_unit_hrhb` has no authored historical default
| Field | Entry |
| --- | --- |
| Fingerprint | `40cebc4589ae` |
| Kind / severity | question / medium |
| Surface | `event:decorate_a_unit_hrhb` |
| Probe | `decision-shape` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `HRHB-hist188-calib`, turn 97 |
| Runs | HRHB-hist188-calib |
| Status | open |
No `historical_default_response_id`. The R8 choice policy cannot rank this decision, so a "historical" playthrough is silently guessing here. Needs an authored default or an explicit note that history offers none.
```json
{
  "event_id": "decorate_a_unit_hrhb",
  "option_ids": [
    "decorate_steadfast_hrhb",
    "decorate_broadly_hrhb",
    "decorate_decline_hrhb"
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
| Occurrences | 4 across 4 run(s) |
| First seen | run `RBiH-historical-188w`, turn 97 |
| Runs | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w, RBiH-hist188-calib |
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

### 🟡 Decision `decorate_a_unit_rs` has no authored historical default
| Field | Entry |
| --- | --- |
| Fingerprint | `fb548f6d5e27` |
| Kind / severity | question / medium |
| Surface | `event:decorate_a_unit_rs` |
| Probe | `decision-shape` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `RS-hist188-calib`, turn 97 |
| Runs | RS-hist188-calib |
| Status | open |
No `historical_default_response_id`. The R8 choice policy cannot rank this decision, so a "historical" playthrough is silently guessing here. Needs an authored default or an explicit note that history offers none.
```json
{
  "event_id": "decorate_a_unit_rs",
  "option_ids": [
    "decorate_steadfast_rs",
    "decorate_broadly_rs",
    "decorate_decline_rs"
  ]
}
```

### 🟡 Decision `drina_cleansing_decision_1992` has no authored historical default
| Field | Entry |
| --- | --- |
| Fingerprint | `82d7f0d636aa` |
| Kind / severity | question / medium |
| Surface | `event:drina_cleansing_decision_1992` |
| Probe | `decision-shape` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `RS-hist188-calib`, turn 13 |
| Runs | RS-hist188-calib |
| Status | open |
No `historical_default_response_id`. The R8 choice policy cannot rank this decision, so a "historical" playthrough is silently guessing here. Needs an authored default or an explicit note that history offers none.
```json
{
  "event_id": "drina_cleansing_decision_1992",
  "option_ids": [
    "systematic",
    "restrained"
  ]
}
```

### 🟡 Decision `milosevic_drina_warning` has no authored historical default
| Field | Entry |
| --- | --- |
| Fingerprint | `448a72521b99` |
| Kind / severity | question / medium |
| Surface | `event:milosevic_drina_warning` |
| Probe | `decision-shape` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `RS-hist188-calib`, turn 111 |
| Runs | RS-hist188-calib |
| Status | open |
No `historical_default_response_id`. The R8 choice policy cannot rank this decision, so a "historical" playthrough is silently guessing here. Needs an authored default or an explicit note that history offers none.
```json
{
  "event_id": "milosevic_drina_warning",
  "option_ids": [
    "acknowledge_pressure",
    "resist_patron"
  ]
}
```

### 🟡 Decision `milosevic_isolation_warning_aug92` has no authored historical default
| Field | Entry |
| --- | --- |
| Fingerprint | `36f51e543f63` |
| Kind / severity | question / medium |
| Surface | `event:milosevic_isolation_warning_aug92` |
| Probe | `decision-shape` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `RS-hist188-calib`, turn 19 |
| Runs | RS-hist188-calib |
| Status | open |
No `historical_default_response_id`. The R8 choice policy cannot rank this decision, so a "historical" playthrough is silently guessing here. Needs an authored default or an explicit note that history offers none.
```json
{
  "event_id": "milosevic_isolation_warning_aug92",
  "option_ids": [
    "acknowledge_pressure",
    "resist_patron"
  ]
}
```

### 🟡 Decision `milosevic_owen_stoltenberg_distancing` has no authored historical default
| Field | Entry |
| --- | --- |
| Fingerprint | `ad92ce300e18` |
| Kind / severity | question / medium |
| Surface | `event:milosevic_owen_stoltenberg_distancing` |
| Probe | `decision-shape` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `RS-hist188-calib`, turn 69 |
| Runs | RS-hist188-calib |
| Status | open |
No `historical_default_response_id`. The R8 choice policy cannot rank this decision, so a "historical" playthrough is silently guessing here. Needs an authored default or an explicit note that history offers none.
```json
{
  "event_id": "milosevic_owen_stoltenberg_distancing",
  "option_ids": [
    "acknowledge_pressure",
    "resist_patron"
  ]
}
```

### 🟡 Decision `milosevic_vopp_pressure` has no authored historical default
| Field | Entry |
| --- | --- |
| Fingerprint | `c019b7857b38` |
| Kind / severity | question / medium |
| Surface | `event:milosevic_vopp_pressure` |
| Probe | `decision-shape` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `RS-hist188-calib`, turn 55 |
| Runs | RS-hist188-calib |
| Status | open |
No `historical_default_response_id`. The R8 choice policy cannot rank this decision, so a "historical" playthrough is silently guessing here. Needs an authored default or an explicit note that history offers none.
```json
{
  "event_id": "milosevic_vopp_pressure",
  "option_ids": [
    "acknowledge_pressure",
    "resist_patron"
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
| Occurrences | 4 across 4 run(s) |
| First seen | run `RBiH-historical-188w`, turn 95 |
| Runs | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w, RBiH-hist188-calib |
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

### 🟡 Decision `strategic_posture_review_rs` has no authored historical default
| Field | Entry |
| --- | --- |
| Fingerprint | `14db02d9277d` |
| Kind / severity | question / medium |
| Surface | `event:strategic_posture_review_rs` |
| Probe | `decision-shape` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `RS-hist188-calib`, turn 95 |
| Runs | RS-hist188-calib |
| Status | open |
No `historical_default_response_id`. The R8 choice policy cannot rank this decision, so a "historical" playthrough is silently guessing here. Needs an authored default or an explicit note that history offers none.
```json
{
  "event_id": "strategic_posture_review_rs",
  "option_ids": [
    "press_gains",
    "consolidate_holdings",
    "negotiate_strength",
    "accept_partition_framework"
  ]
}
```

### 🟡 Decision `visit_to_front_hrhb` has no authored historical default
| Field | Entry |
| --- | --- |
| Fingerprint | `864769f1dd1d` |
| Kind / severity | question / medium |
| Surface | `event:visit_to_front_hrhb` |
| Probe | `decision-shape` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `HRHB-hist188-calib`, turn 91 |
| Runs | HRHB-hist188-calib |
| Status | open |
No `historical_default_response_id`. The R8 choice policy cannot rank this decision, so a "historical" playthrough is silently guessing here. Needs an authored default or an explicit note that history offers none.
```json
{
  "event_id": "visit_to_front_hrhb",
  "option_ids": [
    "visit_mostar_front",
    "visit_central_bosnia",
    "visit_posavina_hrhb",
    "stay_mostar_hrhb",
    "visit_press_hrhb"
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
| Occurrences | 4 across 4 run(s) |
| First seen | run `RBiH-historical-188w`, turn 92 |
| Runs | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w, RBiH-hist188-calib |
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

### 🟡 Decision `visit_to_front_rs` has no authored historical default
| Field | Entry |
| --- | --- |
| Fingerprint | `7a0d6330c9bc` |
| Kind / severity | question / medium |
| Surface | `event:visit_to_front_rs` |
| Probe | `decision-shape` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `RS-hist188-calib`, turn 98 |
| Runs | RS-hist188-calib |
| Status | open |
No `historical_default_response_id`. The R8 choice policy cannot rank this decision, so a "historical" playthrough is silently guessing here. Needs an authored default or an explicit note that history offers none.
```json
{
  "event_id": "visit_to_front_rs",
  "option_ids": [
    "visit_posavina",
    "visit_sarajevo_lines",
    "visit_drina_front",
    "stay_pale_rs",
    "visit_press_rs"
  ]
}
```

### 🟡 Interactive control with no accessible label
| Field | Entry |
| --- | --- |
| Fingerprint | `1bc0a56b95c2` |
| Kind / severity | friction / medium |
| Surface | `ui:army_hq` |
| Probe | `ui-unlabelled-control` |
| Occurrences | 4483 across 3 run(s) |
| First seen | run `ui-RBiH`, turn 0 |
| Runs | ui-RBiH, ui-RS, ui-HRHB |
| Status | open |
A control on army_hq has no text content and no accessible name — unreadable to a screen reader and ambiguous to everyone else.
```json
{
  "size": "43x24"
}
```

### 🟡 Surface "army_hq" has no reachable control
| Field | Entry |
| --- | --- |
| Fingerprint | `72962be702b1` |
| Kind / severity | friction / medium |
| Surface | `ui:army_hq` |
| Probe | `ui-surface-unreachable` |
| Occurrences | 4 across 1 run(s) |
| First seen | run `ui-RBiH`, turn 0 |
| Runs | ui-RBiH |
| Status | open |
The top-level "army_hq" navigation control was absent or disabled during normal play.
### 🟡 Interactive control with no accessible label
| Field | Entry |
| --- | --- |
| Fingerprint | `56b6bda5d71e` |
| Kind / severity | friction / medium |
| Surface | `ui:campaign_start` |
| Probe | `ui-unlabelled-control` |
| Occurrences | 4784 across 3 run(s) |
| First seen | run `ui-RBiH`, turn 0 |
| Runs | ui-RBiH, ui-RS, ui-HRHB |
| Status | open |
A control on campaign_start has no text content and no accessible name — unreadable to a screen reader and ambiguous to everyone else.
```json
{
  "size": "87x318"
}
```

### 🟡 Interactive control with no accessible label
| Field | Entry |
| --- | --- |
| Fingerprint | `5ff0afb189d7` |
| Kind / severity | friction / medium |
| Surface | `ui:chronicle` |
| Probe | `ui-unlabelled-control` |
| Occurrences | 4483 across 3 run(s) |
| First seen | run `ui-RBiH`, turn 0 |
| Runs | ui-RBiH, ui-RS, ui-HRHB |
| Status | open |
A control on chronicle has no text content and no accessible name — unreadable to a screen reader and ambiguous to everyone else.
```json
{
  "size": "43x24"
}
```

### 🟡 Surface "chronicle" has no reachable control
| Field | Entry |
| --- | --- |
| Fingerprint | `a1259f689f15` |
| Kind / severity | friction / medium |
| Surface | `ui:chronicle` |
| Probe | `ui-surface-unreachable` |
| Occurrences | 4 across 1 run(s) |
| First seen | run `ui-RBiH`, turn 0 |
| Runs | ui-RBiH |
| Status | open |
The top-level "chronicle" navigation control was absent or disabled during normal play.
### 🟡 Interactive control with no accessible label
| Field | Entry |
| --- | --- |
| Fingerprint | `850a3806cfbc` |
| Kind / severity | friction / medium |
| Surface | `ui:codex` |
| Probe | `ui-unlabelled-control` |
| Occurrences | 4475 across 3 run(s) |
| First seen | run `ui-RBiH`, turn 0 |
| Runs | ui-RBiH, ui-RS, ui-HRHB |
| Status | open |
A control on codex has no text content and no accessible name — unreadable to a screen reader and ambiguous to everyone else.
```json
{
  "size": "43x24"
}
```

### 🟡 Surface "codex" has no reachable control
| Field | Entry |
| --- | --- |
| Fingerprint | `e4b031f59b77` |
| Kind / severity | friction / medium |
| Surface | `ui:codex` |
| Probe | `ui-surface-unreachable` |
| Occurrences | 5 across 1 run(s) |
| First seen | run `ui-RBiH`, turn 0 |
| Runs | ui-RBiH |
| Status | open |
The top-level "codex" navigation control was absent or disabled during normal play.
### 🟡 Interactive control with no accessible label
| Field | Entry |
| --- | --- |
| Fingerprint | `1e2303120fe2` |
| Kind / severity | friction / medium |
| Surface | `ui:desk` |
| Probe | `ui-unlabelled-control` |
| Occurrences | 4475 across 3 run(s) |
| First seen | run `ui-RBiH`, turn 0 |
| Runs | ui-RBiH, ui-RS, ui-HRHB |
| Status | open |
A control on desk has no text content and no accessible name — unreadable to a screen reader and ambiguous to everyone else.
```json
{
  "size": "43x24"
}
```

### 🟡 Surface "desk" has no reachable control
| Field | Entry |
| --- | --- |
| Fingerprint | `81513817311f` |
| Kind / severity | friction / medium |
| Surface | `ui:desk` |
| Probe | `ui-surface-unreachable` |
| Occurrences | 5 across 1 run(s) |
| First seen | run `ui-RBiH`, turn 0 |
| Runs | ui-RBiH |
| Status | open |
The top-level "desk" navigation control was absent or disabled during normal play.
### 🟡 Interactive control with no accessible label
| Field | Entry |
| --- | --- |
| Fingerprint | `50b8dda5812e` |
| Kind / severity | friction / medium |
| Surface | `ui:in_game` |
| Probe | `ui-unlabelled-control` |
| Occurrences | 1501 across 2 run(s) |
| First seen | run `ui-RBiH`, turn 0 |
| Runs | ui-RBiH, ui-HRHB |
| Status | open |
A control on in_game has no text content and no accessible name — unreadable to a screen reader and ambiguous to everyone else.
```json
{
  "size": "43x24"
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

### 🟡 The Sector Attack operation type still says "Sector" in player-facing text
| Field | Entry |
| --- | --- |
| Fingerprint | `2bfd8975d35e` |
| Kind / severity | bug / medium |
| Surface | `ui:ops_planning` |
| Probe | `owner-review` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `owner-review-20260827-og`, turn 1 |
| Runs | owner-review-20260827-og |
| Status | open |
Measured across `messages.en.ts`: 104 keys have display text already renamed to OG, while 17 display strings still contain "sector". Most of those 17 are `{sector}` interpolation placeholders, which are harmless variable names. FIVE are genuinely player-visible and all belong to one family — the Sector Attack operation type: "Sector Attack", "One sector push", and "Sector Attack — Commits 3-8 brigades to push on a single sector". So the player is offered an operation named for the old concept while every other surface calls it an OG.
```json
{
  "keys": [
    "opsPlanning.param.opType.sector_attack",
    "opsPlanning.param.subtitle.sector_attack",
    "opsPlanning.param.label.sectorAttack",
    "opsPlanning.param.subtitle.sectorAttack",
    "opsPlanning.param.title.sectorAttack"
  ],
  "counts": {
    "display_renamed_to_og": 104,
    "display_still_sector": 17,
    "genuinely_visible": 5
  },
  "note": "The engine identifier `sector_attack` is a separate question and is NOT part of this finding."
}
```

### 🟡 Peace-plan modal offers no historical default and no per-option stakes
| Field | Entry |
| --- | --- |
| Fingerprint | `182e6e7f012e` |
| Kind / severity | friction / medium |
| Surface | `ui:peace_plan_modal` |
| Probe | `ui-peace-plan-unmarked` |
| Occurrences | 26 across 2 run(s) |
| First seen | run `ui-RBiH`, turn 0 |
| Runs | ui-RBiH, ui-HRHB |
| Status | open |
The diplomatic peace-plan modal presents Accept / Review Later / Reject with no HISTORICAL DEFAULT marker and no dimension shifts, unlike event decisions which show both. The player cannot tell what history did or what any choice costs. Driver policy for this run: reject.
```json
{
  "policy": "reject"
}
```

### 🟡 Place names are lower-cased after the first word
| Field | Entry |
| --- | --- |
| Fingerprint | `919e8513877e` |
| Kind / severity | bug / medium |
| Surface | `ui:place_name_formatting` |
| Probe | `owner-review` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `owner-review-20260827`, turn 1 |
| Runs | owner-review-20260827 |
| Status | open |
Labels render "Donji dubovik (bosanska krupa)" where every word of a proper place name should be capitalised: "Donji Dubovik (Bosanska Krupa)". Also seen in "Kozarska dubica", "bosanska dubica", "Arapusa (bosanska krupa)". Looks like a single capitalise-first-letter transform applied to an id-derived string rather than a display name. Affects every multi-word Bosnian place name in the UI, which is most of them.
**Repro:** Any surface listing settlements or municipalities.

```json
{
  "observed": [
    "Donji dubovik (bosanska krupa)",
    "Kozarska dubica",
    "Arapusa (bosanska krupa)"
  ],
  "expected": [
    "Donji Dubovik (Bosanska Krupa)",
    "Kozarska Dubica",
    "Arapuša (Bosanska Krupa)"
  ],
  "note": "Diacritics also worth checking separately — \"Arapusa\" vs \"Arapuša\" was not raised by the owner and is NOT claimed here."
}
```

### 🟡 Surface "records" has no reachable control
| Field | Entry |
| --- | --- |
| Fingerprint | `9a16b34a3a19` |
| Kind / severity | friction / medium |
| Surface | `ui:records` |
| Probe | `ui-surface-unreachable` |
| Occurrences | 5 across 1 run(s) |
| First seen | run `ui-RBiH`, turn 0 |
| Runs | ui-RBiH |
| Status | open |
The top-level "records" navigation control was absent or disabled during normal play.
### 🟡 Interactive control with no accessible label
| Field | Entry |
| --- | --- |
| Fingerprint | `fc75f83f7348` |
| Kind / severity | friction / medium |
| Surface | `ui:records` |
| Probe | `ui-unlabelled-control` |
| Occurrences | 4475 across 3 run(s) |
| First seen | run `ui-RBiH`, turn 0 |
| Runs | ui-RBiH, ui-RS, ui-HRHB |
| Status | open |
A control on records has no text content and no accessible name — unreadable to a screen reader and ambiguous to everyone else.
```json
{
  "size": "43x24"
}
```

### 🟡 Advance is offered and does nothing when a room-only blocker is outstanding
| Field | Entry |
| --- | --- |
| Fingerprint | `582f880d10c1` |
| Kind / severity | friction / medium |
| Surface | `ui:turn_loop` |
| Probe | `playthrough-observation` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `playthrough-20260827`, turn 9 |
| Runs | playthrough-20260827 |
| Status | open |
At every stall the ADVANCE control is present and enabled, clicks register, and the date does not move. No message explains why. The engine is correct to refuse — a required decision is outstanding — but to the player an enabled button that silently does nothing is indistinguishable from a broken one. It cost this harness several hours of misdiagnosis for exactly that reason.
```json
{
  "observed": "ADVANCE TURN -> enabled and clickable; date unchanged after four clicks and ~4 minutes"
}
```

### 🟡 Typography is inconsistent across surfaces
| Field | Entry |
| --- | --- |
| Fingerprint | `50bb59700448` |
| Kind / severity | friction / medium |
| Surface | `ui:typography` |
| Probe | `owner-review` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `owner-review-20260827`, turn 0 |
| Runs | owner-review-20260827 |
| Status | open |
The game mixes font families between surfaces — the case-file opening uses a serif display face and large italics, while the in-game shell uses monospace and condensed sans. Owner raised this as a defect, not a deliberate contrast. Needs a single typographic system decided and applied, rather than per-surface choices.
```json
{
  "surfaces": [
    "case-file opening (serif + large italic)",
    "in-game shell (monospace / condensed sans)"
  ]
}
```

### 🟡 Surface "war_map" has no reachable control
| Field | Entry |
| --- | --- |
| Fingerprint | `6f579329b22e` |
| Kind / severity | friction / medium |
| Surface | `ui:war_map` |
| Probe | `ui-surface-unreachable` |
| Occurrences | 4 across 1 run(s) |
| First seen | run `ui-RBiH`, turn 0 |
| Runs | ui-RBiH |
| Status | open |
The top-level "war_map" navigation control was absent or disabled during normal play.
### 🟡 Interactive control with no accessible label
| Field | Entry |
| --- | --- |
| Fingerprint | `b615fa723d8f` |
| Kind / severity | friction / medium |
| Surface | `ui:war_map` |
| Probe | `ui-unlabelled-control` |
| Occurrences | 3553 across 3 run(s) |
| First seen | run `ui-RBiH`, turn 0 |
| Runs | ui-RBiH, ui-RS, ui-HRHB |
| Status | open |
A control on war_map has no text content and no accessible name — unreadable to a screen reader and ambiguous to everyone else.
```json
{
  "size": "43x24"
}
```

### ⚪ Decision `contact_group_plan_1994` shows no stakes on any option
| Field | Entry |
| --- | --- |
| Fingerprint | `6c2feb3668af` |
| Kind / severity | friction / low |
| Surface | `event:contact_group_plan_1994` |
| Probe | `option-stakes-gap` |
| Occurrences | 4 across 4 run(s) |
| First seen | run `RBiH-historical-188w`, turn 118 |
| Runs | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w, RBiH-hist188-calib |
| Status | open |
No option on "Contact Group Plan Presented" carries `dimension_shifts`, so the modal can quantify nothing. The player chooses blind and learns the cost only afterwards.
```json
{
  "event_id": "contact_group_plan_1994"
}
```

### ⚪ Decision `gornji_vakuf_clashes_1993` shows no stakes on any option
| Field | Entry |
| --- | --- |
| Fingerprint | `7269b4bdc6f0` |
| Kind / severity | friction / low |
| Surface | `event:gornji_vakuf_clashes_1993` |
| Probe | `option-stakes-gap` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `HRHB-hist188-calib`, turn 37 |
| Runs | HRHB-hist188-calib |
| Status | open |
No option on "HVO-ARBiH Fighting Erupts at Gornji Vakuf" carries `dimension_shifts`, so the modal can quantify nothing. The player chooses blind and learns the cost only afterwards.
```json
{
  "event_id": "gornji_vakuf_clashes_1993"
}
```

### ⚪ Decision `hrhb_washington_agreement_1994` shows no stakes on any option
| Field | Entry |
| --- | --- |
| Fingerprint | `bea6d0522e3e` |
| Kind / severity | friction / low |
| Surface | `event:hrhb_washington_agreement_1994` |
| Probe | `option-stakes-gap` |
| Occurrences | 1 across 1 run(s) |
| First seen | run `HRHB-hist188-calib`, turn 103 |
| Runs | HRHB-hist188-calib |
| Status | open |
No option on "Washington Agreement Signed" carries `dimension_shifts`, so the modal can quantify nothing. The player chooses blind and learns the cost only afterwards.
```json
{
  "event_id": "hrhb_washington_agreement_1994"
}
```

### ⚪ Decision `owen_stoltenberg_plan_1993` shows no stakes on any option
| Field | Entry |
| --- | --- |
| Fingerprint | `a0ccbbe32a3a` |
| Kind / severity | friction / low |
| Surface | `event:owen_stoltenberg_plan_1993` |
| Probe | `option-stakes-gap` |
| Occurrences | 4 across 4 run(s) |
| First seen | run `RBiH-historical-188w`, turn 71 |
| Runs | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w, RBiH-hist188-calib |
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
| Occurrences | 4 across 4 run(s) |
| First seen | run `RBiH-historical-188w`, turn 40 |
| Runs | RBiH-historical-188w, RBiH-counterfactual-188w, RBiH-passive-188w, RBiH-hist188-calib |
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
