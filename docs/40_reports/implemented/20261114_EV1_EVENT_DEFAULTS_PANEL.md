# EV1 — ranked answers for required events, and the §6 Drina ruling (2026-11-14)

**Lane:** EV1 (register: `out_of_scope_findings.md` EV1). **Branch:** `claude/ev1-event-defaults-c8b552`. **Base:** main `e07847268`.
**Owner policy (2026-11-14, approved via the orchestrator):** source-backed events get a historian-authored historical default; design counterfactuals get a "stay the course / decline" answer for history mode; `drina_cleansing_decision_1992` goes to the §6 panel and may be held.

## Problem

The R8 dry run audited 301 events. Nine are `requires_player_response` with neither `historical_default_response_id` nor `staff_recommended_response_id`. A "let history run" player and the R8 `--historical-choice` harness (`tools/ui/paradox_local_qa.cjs`, `selectHistoricalEventChoice`) cannot answer them unattended.

## Which field, and why it matters for calibration

- `historical_default_response_id` claims the option is the historically attested choice (gold chip) **and** becomes the headless/Observer bot pick (`selectBotEventResponse`, `src/sim/events/evaluate_events.ts`). On any event the headless bot resolves with the political scorer, it changes the 188w run.
- `staff_recommended_response_id` shows a "Staff recommendation" chip. The bot never reads it; the R8 harness uses it as a ranked fallback (`basis: staff_recommendation`).

**Measured:** a historical default on `nato_ultimatum_sarajevo_1994` (`comply_withdraw_hwez`) moved the 188w final hash `53ffe8e9545686ad → 1705efb6fb7f40cf`. Checkpoints unchanged (712/709/710/705), all guards intact, `control_delta.json` byte-identical. Today the headless VRS **defies** the ultimatum (`bot_political`, t97), which is ahistorical. The lane stopped and reported it to the orchestrator; it ships a staff recommendation instead (zero drift). The true historical default is filed as a one-change calibration item.

## What shipped

| Event | Field | Answer | Basis |
|---|---|---|---|
| `us_halts_federation_advance_1995` | historical default | `comply` | BB Vol. I KB p.429 [printed p.392]: Izetbegović bowed to US pressure to halt, adding conditions to buy the ARBiH time; ceasefire 12 Oct 1995. KB p.462 [p.425] nn.821, 823 (already cited in the event). Zagreb went on with Južni Potez regardless. `accept_first` already picked `comply`, so the hash is unchanged. |
| `nato_ultimatum_sarajevo_1994` | staff recommendation (interim) | `comply_withdraw_hwez` | NAC decision 9 Feb 1994 (UN S/1994/154); BB Vol. II KB p.474 [p.455]: after first refusing, the VRS had mostly withdrawn or placed weapons in UN-monitored sites by the 20 Feb deadline; BB Vol. I KB p.53 [p.17]: UN/NATO judged the Serbs effectively complied. Compliance was coerced and partial; Aug–Sep 1994 breaches and NATO strikes (BB I KB pp.59-62). |
| `strategic_posture_review_rbih` | staff recommendation | `press_offensive` | Design counterfactual. ARBiH took the strategic offensive from March 1994 (BB II KB p.474 [p.455]); 1994 offensives (BB I KB pp.419, 422); in Oct 1995 Sarajevo still wanted to fight on (KB p.429). |
| `strategic_posture_review_rs` | staff recommendation | `press_gains` | Design counterfactual. Goražde April 1994 (BB II KB p.474); Bihać Nov 1994 (BB II KB p.552 [p.533]); RS rejected the Contact Group plan Aug 1994 and Feb 1995 (BB I KB pp.61, 67); 1995 enclave operations (ICTY Karadžić IT-95-5/18-T). `consolidate_holdings` was the close second. |
| `csq_separate_peace_overture` | staff recommendation | `decline_overture` | Design counterfactual. RBiH concluded no bilateral separate peace; its track ran through ICFY, the Contact Group and the US-brokered Federation (BB II KB p.470 [p.451]). |
| `csq_tripartite_federation_overture` | staff recommendation | `decline_proposal` | Design counterfactual (analogue: Owen-Stoltenberg Union of Three Republics, 1993). RBiH stayed in the talks but did not accept the tripartite frame (BB I KB p.223). |
| `csq_partition_referendum_proposal` | staff recommendation | `refuse_referendum` | Design counterfactual. RBiH refused partition by plebiscite; the 1994 referendum was RS's own (BB I KB p.61). |
| `csq_third_party_mediation_offered` | staff recommendation | `engage_mediator` | Design counterfactual. **Departs from "decline" on the Historian's ruling:** Sarajevo sought more international involvement (US Federation framework, Carter mission Dec 1994; BB II KB p.470, BB I KB p.64), so "decline" would invert the record. "Stay the course" for RBiH here means engaging. |
| `drina_cleansing_decision_1992` | **none (held unauthored)** | — | §6 panel below. |

Historian caveats: ICTY references are at judgment level (texts not in the repo; paragraph pinpoints unverified). The posture reviews refire up to 8 times through 1995; one static recommendation drifts late in the war (RBiH winter 1994-95 truce; RS after August 1995).

## §6 panel — `drina_cleansing_decision_1992`

**Seats (standard §6 panel, AGENT_WORKFLOW.md):** Historian, scenario-tester/calibration, Engine/systems, Red-team. Independent, one round, implementer (lane lead) excluded and integrating without a vote. Packet: `side-session-notes/.../ev1_drina_panel_packet.md` (choices A–E).

**Verdict: UNANIMOUS GO-with-conditions on D — leave the event unauthored.** All four seats BLOCK A and B; none supports C; E is out of lane (188w drift, needs its own panel).

| Seat | Verdict | Core reason |
|---|---|---|
| Historian | GO-w/c on D; BLOCK A, B; would not sign C | Neither option is what happened. The leadership issued written orders for the record (Karadžić, 13 June 1992) while the campaign went on; the Trial Chamber found knowledge and failure to prevent or punish (Karadžić IT-95-5/18-T TJ 24 Mar 2016; MICT-13-55-A 20 Mar 2019; Krajišnik IT-00-39; Mladić IT-09-92-T). Pionirska Street fire 14 June 1992 and Bikavac ~27 June (Lukić & Lukić IT-98-32/1-T); Drina killings 7 June (Vasiljević IT-98-32-T); Foča, BB1 KB p.196 [p.160], p.201 [p.165]. A states the opposite of the judicial finding; B (binding restraint) is also false. |
| Scenario-tester/calibration | GO-w/c on D; BLOCK A, B, E in lane | A moves `final_save.json` (`bot_v1 → bot_ai_default`) and would publish a false `authored_historical_default` basis in an R8 RS transcript. C breaks `--rs-drina-policy` and auto-plays an editorial nudge. D keeps the baseline and an honest operator-named counterfactual. |
| Engine/systems | GO-w/c on D | Positional pick is deterministic and pinned by the option-order test. A changes Observer behaviour, not just labels. Corrected the packet: on the desktop (`decision_mode: emergent`) Observer sends drina to the political scorer, not to array position. A single, self-expiring exception is sound. |
| Red-team | GO-w/c on D; BLOCK A, B, C | A puts "the historically attested choice" (BCS "historijski potvrđen izbor") beside an ICTY citation on "Open command-accountability proceedings" — a denialist screenshot. C makes the VRS staff the source of a recommendation on an atrocity event. D claims nothing false. |

### Conditions and where each is met

1. **Exactly one named exception, exact id, self-expiring; drina carries no historical default, no staff recommendation, no `historical_marker`; cites this record and the 2026-08-31 packet.** Met: `tests/events_required_response_has_default.test.ts`.
2. **Engine test pins drina's bot resolution** (historical → `systematic`/`bot_v1`; emergent + Observer → `bot_political`). Met: `tests/ev1_history_mode_resolution.test.ts`.
3. **Correct the packet's Observer row; comment-only correction at `evaluate_events.ts` ~L840.** Met (this record; comment added).
4. **The positional pick is stated as not a historical claim.** Met in the guard-test comment and here. No report, Chronicle or Codex text may call it historical.
5. **188w baseline byte-identical; no change in the drina row; harness unchanged.** See verification below.
6. **R8 preconditions (red-team 2 and 3, historian 2), before any RS campaign is published in R8:** (a) for drina, the generic "Historical default source review required" banner is replaced by a Historian-signed record-register line (EN and BCS) saying neither response describes what happened; display-only, UI-test pinned; (b) the published transcript shows the counterfactual / no-historicity claim in readable text beside the pick, and its summary never calls the pick historical. **Not built in this lane** (lane scope); registered for the orchestrator as R8 gates.
7. **Follow-ups registered (not fixed here):** the 2026-08-31 packet stays open and needs a named owner, its own panel (a "paper orders while operations continue" option raises a Ring 3 #1 question) and a calibration slot; bot-RS campaigns send RBiH/HRHB the ahistorical notification "RS opens a Drina command review" (positional pick); emergent Observer improvises drina via the political scorer.

## §4 copy review (player-visible change)

The data adds no prose; it makes existing chips appear on more options. One independent Narrative Designer seat reviewed it: **GO-with-changes**. The staff-recommendation line was written for the abstract presidential cards ("Staff recommendation for this abstract command decision. This is not a historical default and does not control bot calibration."). That is the wrong noun for the NATO ultimatum and the diplomatic overtures, and "bot calibration" is developer language on a player surface. Replaced for all 16 events that use the key:

- EN `eventDecision.staffRecommendationDescription`: "Your staff recommends this option. It is not the historical default; you may choose any option."
- BCS: "Vaš štab preporučuje ovu opciju. To nije historijski zadani izbor; slobodno možete izabrati bilo koju opciju."

The two UI tests that pinned the old text now pin the new text. The reviewer also noted that calling NATO compliance "not the historical default" is only an interim truth; the calibration item that authors the historical default resolves it. Out of scope, registered: `press_gains` says "tighten the enclaves", which softens the siege of civilian enclaves (Ring-2 copy pass).

## Verification

- Guard and resolution tests: `tests/events_required_response_has_default.test.ts`, `tests/ev1_history_mode_resolution.test.ts`, plus `tests/sensitive_history_player_choice_content.test.ts` — green.
- 188w with all EV1 data: see the PR body for the final hash against main `53ffe8e9545686ad` and the baseline-regression result.
