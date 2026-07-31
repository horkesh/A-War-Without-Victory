# RBiH 80-Turn Electron Owner Playtest Diary

## Session Metadata

| Field | Entry |
| --- | --- |
| Diary date | 2026-07-30 |
| Operator | Codex, acting as owner proxy under the owner's historical-default instruction |
| Session number | 05 |
| Build / commit | Current dirty `main` at `b8ff530de08fa23cf38103d8da9557da56296130`; segment-B working-tree content fingerprint `f5489960cd8480c44c92690bd4080ed1038649ee757eeb8090469bf9ad5452a3` |
| Package version | `0.9.9-beta.1` |
| Build command | `npm.cmd run desktop:map:build`; `npm.cmd run desktop:sim:build`; launched the production Electron entry against those fresh unpackaged outputs. No package or installer was produced because packaging and release-state changes were explicitly prohibited. |
| Faction | RBiH |
| Scenario or save | Fresh campaign, continued after a hash-verified technical resume at turn 44 through Electron's production native-load path |
| Start in-game date / turn | 6 Apr 1992 / turn 0 |
| End in-game date / turn | 18 Oct 1993 / exact turn 80 |

## Session Scope

| Field | Entry |
| --- | --- |
| Turns played | 80 |
| Real minutes played | Approximately 39 minutes of accepted campaign play, excluding aborted preflight and selector-validation attempts |
| Minutes per turn | Approximately 0.49 |
| End state saved? | Yes — `turn80-autosave.json`, 5,067,871 bytes, SHA-256 `0241584e3a5a4e8eccab7265871304749c67dfa55e35448cb9b252032b07402f` |
| Evidence folder | [`20260730_session14_rbih_80turn_complete`](evidence/20260730_session14_rbih_80turn_complete/) |
| Command Authority this session | Spent: `0`; recovery continued and the last recovery was `5.25` from international standing; turns at cap / income wasted: `80/80` observed turns at `100/100`. I could always afford a lever, but the historical lane supplied no grounded reason to use one, so the Authority system disappeared from actual play. |

This was one continuous campaign in two Electron processes. Segment A ran from a clean campaign to exact turn 44. When `Open personnel` led to a page with no historical-successor action, the automation stopped rather than inventing a click. The turn-44 autosave was copied and verified at SHA-256 `4caf95409e33c2c00feeb6f75ac135a9b740eecd7eec2f3af679d029e9039d25`; segment B loaded that exact save through the production Electron handler and completed turn 80.

Only authored historical defaults or locally sourced historical dispositions were used. No player operation, direct unit order, reserve move, convoy response, paramilitary deployment, counter-offer, or proposal was invented. Arrival notices were filed without appointing their officers; historical successors were appointed only where the game exposed a named succession.

## Three Worst Desk -> Decision -> Advance Findings

### 1. Owen-Stoltenberg had two owners and contradictory same-turn receipts

| Field | Entry |
| --- | --- |
| Surface | President's Desk -> event decision -> peace-plan gate -> Advance |
| What I was trying to do | Follow the historical two-stage RBiH line: conditional Presidency acceptance, followed by Assembly rejection. |
| What happened | At turn 70 the event ledger recorded `owen_stoltenberg_plan_1993 -> accept`, while a separate required peace-plan surface recorded RBiH `owen_stoltenberg -> rejected` on the same turn. Turn 72 then correctly offered and recorded `reject_via_assembly`. The final historical outcome is intelligible, but the player had to make two immediately contradictory signatures before reaching the later Assembly stage. |
| Screenshot or evidence path | [`peace-plan response`](evidence/20260730_session14_rbih_80turn_complete/screenshots/20260730_session13_rbih_80turn_resume44-rbih-092-peace-plan-before-response.png), [`Presidency event`](evidence/20260730_session14_rbih_80turn_complete/screenshots/20260730_session13_rbih_80turn_resume44-rbih-094-strategic-pending-event-before-response.png), [`Assembly stage`](evidence/20260730_session14_rbih_80turn_complete/screenshots/20260730_session13_rbih_80turn_resume44-rbih-098-strategic-pending-event-before-response.png) |
| Bug or friction | **Bug** |
| Severity / impact | High. Both surfaces gate Advance, duplicate ownership, and leave contradictory durable records. |
| Suspected owner surface | Historical event resolver plus negotiation/peace-plan ownership |
| Proposed follow-up packet | Give the plan one canonical owner and model conditional Presidency acceptance plus later Assembly rejection as explicit stages with one coherent ledger. |

### 2. `Open personnel` routed away from the action it promised

| Field | Entry |
| --- | --- |
| Surface | Officer matter -> Personnel -> Briefing -> Advance |
| What I was trying to do | Review and appoint the explicitly named historical successor without guessing. |
| What happened | `Open personnel` opened the Personnel tab, but that page contained no `Appoint Historical Successor` action. The action actually lived on the Briefing tab in Presidential Attention. This first stopped the exact-response run at turn 44 and repeated for later Knez-Sadic, Halilovic-Delic, Talijan-Ajnadzic, and Drekovic-Dudakovic handoffs. |
| Screenshot or evidence path | [`wrong destination`](evidence/20260730_session14_rbih_80turn_complete/screenshots/20260730_session13_rbih_80turn_resume44-rbih-004-officer-historical-replacement-personnel.png), [`actual action`](evidence/20260730_session14_rbih_80turn_complete/screenshots/20260730_session13_rbih_80turn_resume44-rbih-005-officer-historical-replacement-briefing.png), [`receipt`](evidence/20260730_session14_rbih_80turn_complete/screenshots/20260730_session13_rbih_80turn_resume44-rbih-006-officer-event-after-acknowledge.png) |
| Bug or friction | **Bug** |
| Severity / impact | High for the guided loop. The campaign remains recoverable, but the promised handoff terminates on the wrong surface. |
| Suspected owner surface | Officer modal routing / Army HQ tab ownership |
| Proposed follow-up packet | Route the CTA directly to the Presidential Attention action, or place the action on Personnel and test the full CTA-to-receipt journey. |

### 3. The 19-turn London-to-pressure span still contained no presidential decision

| Field | Entry |
| --- | --- |
| Surface | President's Desk -> Advance |
| What I was trying to do | Continue historical RBiH policy while waiting for the next grounded presidential judgment. |
| What happened | London resolved at turn 20; the next required judgment was international pressure at turn 38. That is a 19-turn span when counted inclusively, with 17 intervening advances and no required decision. The new turn-24 Army reorganization brief usefully breaks information silence, but it offers no lever, recommendation, or choice and therefore does not resolve the agency drought. |
| Screenshot or evidence path | [`turn-20 Decision Room`](evidence/20260730_session14_rbih_80turn_complete/screenshots/20260730_session07_rbih_80turn-rbih-105-light-turn-20-decision-room.png), [`turn-24 brief`](evidence/20260730_session14_rbih_80turn_complete/screenshots/20260730_session07_rbih_80turn-rbih-114-turn-loop-47.png), [`turn-38 pressure`](evidence/20260730_session14_rbih_80turn_complete/screenshots/20260730_session07_rbih_80turn-rbih-141-strategic-pending-event-before-response.png) |
| Bug or friction | **Friction** |
| Severity / impact | High. Nothing is malfunctioning, but Advance becomes the dominant interaction and Command Authority has no historical outlet. |
| Suspected owner surface | Historical staff-packet cadence / President's Desk agency |
| Proposed follow-up packet | Add a sourced staff recommendation or positive restraint/priority expression in the Aug-Dec 1992 lane. Do not fabricate a binary historical choice merely to fill turns. |

## Best Moment

| Field | Entry |
| --- | --- |
| Surface | Turn 70-77 autumn 1993 presidential sequence |
| What worked | Once past the duplicate Owen-Stoltenberg surface, the campaign connected the Presidency's conditional posture, the Assembly rejection, lift-and-strike advocacy, the September Neretva/Grabovica-Uzdol consequences, and the decision to suppress Abdić's APWB. |
| Why it felt presidential | Diplomacy, institutional legitimacy, international advocacy, battlefield consequences, and internal state authority arrived as one historically coherent sequence. The player was setting state policy rather than moving counters. |
| Screenshot or evidence path | [`Assembly rejection`](evidence/20260730_session14_rbih_80turn_complete/screenshots/20260730_session13_rbih_80turn_resume44-rbih-098-strategic-pending-event-before-response.png), [`lift-and-strike`](evidence/20260730_session14_rbih_80turn_complete/screenshots/20260730_session13_rbih_80turn_resume44-rbih-101-strategic-pending-event-before-response.png), [`Neretva`](evidence/20260730_session14_rbih_80turn_complete/screenshots/20260730_session13_rbih_80turn_resume44-rbih-104-handled-event-notice.png), [`Grabovica/Uzdol`](evidence/20260730_session14_rbih_80turn_complete/screenshots/20260730_session13_rbih_80turn_resume44-rbih-106-handled-event-notice.png), [`Abdić`](evidence/20260730_session14_rbih_80turn_complete/screenshots/20260730_session13_rbih_80turn_resume44-rbih-109-strategic-pending-event-before-response.png) |

## Presidential Feel Grade

| Field | Entry |
| --- | --- |
| Did I feel like the President? | **4 / 5** |
| One-sentence reason | The historical succession and autumn-1993 policy chain now feel genuinely presidential, but a contradictory diplomatic double-signature, a broken personnel handoff, and the long decision drought keep the campaign below 5/5. |
| Would I play the next 10 turns tomorrow unprompted? | **Yes.** The turn-70 onward cadence finally connects choices to political and military consequences strongly enough to pull the campaign forward. |

To reach `5/5`, the next pass needs one canonical Owen-Stoltenberg workflow, a personnel CTA that lands on the actual decision, readable small-text labels, and at least one sourced expression of presidential intent in the turn-20-to-38 lane. Command Authority also needs a historically credible positive-use case; ending at `100/100` with zero lifetime spend is not yet a functioning presidential economy.

## Confirmed Bugs

### B1. Owen-Stoltenberg dual ownership and contradictory ledger semantics

Turn 70 recorded both Presidency-stage acceptance and peace-plan rejection before turn 72 supplied the Assembly rejection stage. The historical sequence should be conditional Presidency acceptance followed by Assembly rejection; the same-turn second owner is the defect.

- Classification: **Bug; blocks Advance while either required surface is unresolved.**
- Evidence: event and peace-plan rows in [`final-state-analysis.json`](evidence/20260730_session14_rbih_80turn_complete/final-state-analysis.json), plus screenshots 092-099.

### B2. Historical-successor handoff routes to the wrong tab

The officer CTA promises Personnel, but the action exists only under Briefing -> Presidential Attention. This is reproducible across four historical replacements.

- Classification: **Bug; non-blocking to the campaign but breaks the promised guided action.**
- Evidence: screenshots 004-006, 064-066, and 124-126.

### B3. `Personnel Directives` fails the readability gate

The post-run diagnostic measured the 12px label at `3.67:1` contrast in four historical-replacement briefing captures.

- Classification: **Bug; non-blocking accessibility/readability failure.**
- Evidence: [`runtime-diagnostics.json`](evidence/20260730_session14_rbih_80turn_complete/runtime-diagnostics.json) and [`segment-b-final-gate-error.txt`](evidence/20260730_session14_rbih_80turn_complete/segment-b-final-gate-error.txt).

## Friction, Not Bugs

| Item | Surface | Why this is friction rather than a defect | Blocks play? | Follow-up owner |
| --- | --- | --- | --- | --- |
| 19-turn London-to-pressure span | President's Desk cadence | The calendar and event prerequisites are working; the historical lane simply provides no actionable presidential work for 17 intervening advances. | No | Historian + game design |
| Command Authority never enters play | Presidential economy | Authority correctly recovers and caps, but the historical lane never supplies a credible reason to spend it. | No | Game design + Desk |
| Critical HQ assessment has no responsible command | Army HQ -> Desk | The information is visible and internally consistent, but `Responsible command: Unreported` and generic `Review` text do not complete the staff-to-president handoff. | No | Army HQ + Desk |

## Historical Decision Record

| Turn / date | Surface | Historical disposition used | Durable result |
| --- | --- | --- | --- |
| 0 / 6 Apr 1992 | State identity | Civic, multi-ethnic republic | `civic` |
| 1 / 13 Apr 1992 | Cutileiro plan | Reject | RBiH `cutileiro` rejected |
| 3 / 27 Apr 1992 | Paramilitary policy | Refuse deployment | `always_deny` |
| 12 / 29 Jun 1992 | Minority officer retention | Retain minorities | `retain_minorities` |
| 20 / 24 Aug 1992 | London Conference | Accept principles | `accept_principles` |
| 38 / 28 Dec 1992 | International Vance-Owen pressure | Acknowledge pressure | `acknowledge_pressure` |
| 39 / 4 Jan 1993 | Vance-Owen | Accept | Event `accept`; plan accepted |
| 54 / 19 Apr 1993 | Srebrenica demilitarization | Comply in appearance, hide weapons | `hide_weapons` |
| 70 / 9 Aug 1993 | Owen-Stoltenberg Presidency stage | Conditional acceptance | Event `accept`; separate plan ledger incorrectly says rejected |
| 72 / 23 Aug 1993 | Owen-Stoltenberg Assembly stage | Reject via Assembly | `reject_via_assembly` |
| 73 / 30 Aug 1993 | Arms embargo advocacy | Lobby for lift and strike | `lobby_for_lift_and_strike` |
| 77 / 27 Sep 1993 | Abdić / APWB | Suppress the APWB | `suppress_apwb` |

The early civic-state and multi-ethnic officer posture is grounded in the campaign's local RBiH source packet and *Balkan Battlegrounds*, vol. I, pp. 166-179. The Owen-Stoltenberg staging uses the authored UN S/26486 and S/26922 dossier plus the local volume-II context. No unmarked alternative was selected except the authored Presidency-stage Owen-Stoltenberg first response, whose missing historical marker is part of the ownership/copy problem described above.

## Historical Officer Record

| Turn | Matter | Action |
| --- | --- | --- |
| 22 | Enver Hadžihasanović arrival | Filed; no appointment invented |
| 24 | Zaim Pašalić arrival | Filed; no appointment invented |
| 44 | Željko Knez -> Hazim Šadić | Appointed historical successor |
| 60 | Sefer Halilović -> Rasim Delić | Appointed historical successor |
| 68 | Vahid Karavelić arrival | Filed; no appointment invented |
| 68 | Mustafa Hajrulahović “Talijan” -> Nedžad Ajnadžić | Appointed historical successor |
| 80 | Mehmed Alagić and Sakib Budaković arrivals | Filed; no appointments invented |
| 80 | Ramiz Dreković -> Atif Dudaković | Appointed historical successor |

## 1993 Chronology Recheck

The specific chronology concern from the prior diary is resolved in this 80-turn horizon:

| Event | Fired | Assessment |
| --- | --- | --- |
| Trusina killings | Turn 55 / 26 Apr 1993 | In the April 1993 lane |
| UN safe areas declared | Turn 57 / 10 May 1993 | After the April resolutions, not in 1992 |
| East Mostar siege | Turn 57 / 10 May 1993 | In the May 1993 lane |
| UNSCR 836 / accelerated safe areas | Turn 61 / 7 Jun 1993 | In the June 1993 lane |
| Operation Neretva '93 | Turn 74 / 6 Sep 1993 | Correct September lane |
| Grabovica and Uzdol | Turn 75 / 13 Sep 1993 | Correct September lane |

The local Neretva/Grabovica-Uzdol packet cites *Balkan Battlegrounds*, vol. II, pp. 434-435. Evidence is in screenshots 104 and 106.

## Campaign Outcome at Turn 80

| Measure | Result |
| --- | --- |
| In-game date | 18 Oct 1993 |
| Player-visible RBiH control | 23.5% |
| Saved RBiH control snapshot | 23.47% |
| RBiH casualties | 13,032 killed / 52,626 wounded / 7,147 missing or captured |
| RBiH personnel at arms | 170,000 |
| Owned formations | 96; 90 located |
| Command Authority | 100/100; reserve 15/15; 0 lifetime spent |
| Player operations launched | 0 |
| Pending required event / peace / convoy / reserve / paramilitary decisions | 0 / 0 / 0 / 0 / 0 |
| Non-blocking officer matters at save boundary | 3 turn-80 matters, with their actions already receipted |

Final views: [`map`](evidence/20260730_session14_rbih_80turn_complete/screenshots/20260730_session13_rbih_80turn_resume44-rbih-128-light-turn-80-map.png), [`Decision Room`](evidence/20260730_session14_rbih_80turn_complete/screenshots/20260730_session13_rbih_80turn_resume44-rbih-130-light-turn-80-decision-room.png), [`Army HQ`](evidence/20260730_session14_rbih_80turn_complete/screenshots/20260730_session13_rbih_80turn_resume44-rbih-131-light-turn-80-army-hq.png), [`Records`](evidence/20260730_session14_rbih_80turn_complete/screenshots/20260730_session13_rbih_80turn_resume44-rbih-207-records.png), and [`Chronicle`](evidence/20260730_session14_rbih_80turn_complete/screenshots/20260730_session13_rbih_80turn_resume44-rbih-208-chronicle.png).

## Bug vs. Friction Split

| Item | Surface | Bug or friction | Blocks play? | Follow-up owner |
| --- | --- | --- | --- | --- |
| Owen-Stoltenberg double owner / contradictory same-turn receipts | Diplomacy -> Advance | Bug | Yes, until both surfaces are answered | Events + negotiation |
| `Open personnel` misses the actual historical-successor action | Officer handoff | Bug | No | Officer UX + Army HQ |
| `Personnel Directives` contrast 3.67:1 | Briefing readability | Bug | No | UI/accessibility |
| Turn-20-to-38 required-decision drought | Desk cadence | Friction | No | Historian + game design |
| Authority capped and never spent | Presidential economy | Friction | No | Game design |
| Critical HQ objectives end at `Unreported` / generic review | HQ-to-Desk handoff | Friction | No | Army HQ + Desk |

## Desk -> Decision -> Advance Loop Check

| Field | Entry |
| --- | --- |
| Did the top-3 include a new Desk -> Decision -> Advance friction? | Yes |
| If no, is this the second consecutive no-new-loop-friction diary? | No |
| If yes to second consecutive no-new-loop-friction diary | Not applicable |

## Diagnostics and Evidence Integrity

- The accepted campaign evidence contains 59 screenshots, two immutable autosaves, two live-event logs, the segment-B progress record, and the final readability-gate error.
- The turn-44 and turn-80 saves hash to `4caf95409e33c2c00feeb6f75ac135a9b740eecd7eec2f3af679d029e9039d25` and `0241584e3a5a4e8eccab7265871304749c67dfa55e35448cb9b252032b07402f`.
- Both accepted segments recorded zero console messages, page errors, network failures, and main-process stderr.
- Segment A stopped at turn 44 because the exact historical action was not present on the routed Personnel surface; the campaign state itself remained valid.
- Segment B reached and captured exact turn 80 before the post-run readability gate reported the 3.67:1 `Personnel Directives` label.
- Earlier aborted preflight and selector-validation attempts were excluded. In particular, a stock selector that attempted to accept Cutileiro was caught at turn 2 and its state was not used.
- This is live-run evidence, not a deterministic replay comparison.

Primary machine-readable evidence:

- [`runtime-diagnostics.json`](evidence/20260730_session14_rbih_80turn_complete/runtime-diagnostics.json)
- [`final-state-analysis.json`](evidence/20260730_session14_rbih_80turn_complete/final-state-analysis.json)
- [`evidence-manifest.json`](evidence/20260730_session14_rbih_80turn_complete/evidence-manifest.json)
- [`turn80-autosave.json`](evidence/20260730_session14_rbih_80turn_complete/turn80-autosave.json)

## Triage Outcome

Bugs remain ahead of friction.

| Rank | Accepted follow-up | Packet path or owner | Status |
| --- | --- | --- | --- |
| 1 | Canonicalize the staged Owen-Stoltenberg workflow and ledger | Events + negotiation | Open |
| 2 | Route historical-successor CTA to the actual action | Officer UX + Army HQ | Open |
| 3 | Raise `Personnel Directives` small-text contrast | UI/accessibility | Open |
| 4 | Turn the turn-24 staff brief into a sourced recommendation or positive restraint expression | Historian + game design | Open |
| 5 | Give Command Authority a historically credible positive use | Presidential economy | Open |
| 6 | Complete the critical Army HQ assessment-to-Desk handoff | Army HQ + Desk | Open |

## Scope / Safety

This run added diary and evidence artifacts only. It did not stage, commit, push, create or switch branches, package, install, tag, publish, refresh baselines, write startup snapshots, or change release state.

## Remediation Appendix — 2026-07-30

The findings were repaired in the requested order: confirmed bugs first, then friction. This appendix records implementation and automated verification only; it does not rewrite the owner-run observations above or award a new President-feel score.

### Bugs fixed

| Finding | Resolution |
| --- | --- |
| Owen-Stoltenberg double owner / contradictory receipts | The turn-70 RBiH Presidency event now owns conditional acceptance or early rejection. Conditional acceptance clears the legacy plan surface without writing a final peace-plan row; the turn-72 Assembly event owns the final disposition and writes exactly one row. The legacy modal and Desk item are suppressed while either canonical event is pending. |
| `Open personnel` misses the successor action | Replacement matters now open Army HQ Briefing, where `Appoint Historical Successor` lives. Informational arrival matters still open Personnel. |
| `Personnel Directives` contrast 3.67:1 | The 12px section headings now use the full secondary-text token rather than its 70%-opacity variant. |

### Friction addressed without inventing decisions

| Finding | Resolution |
| --- | --- |
| Turn-20-to-38 required-decision drought | The existing turn-24 ARBiH corps-reorganization packet now carries a sourced staff recommendation: preserve the unified, multi-ethnic Army command, hold present policy, and keep Authority in reserve unless staff files a specific exception. It routes to Army HQ Briefing for review but remains informational, requires no signature, and does not increase the actionable count. |
| Authority remains 100/100 and unused | At capacity, the Desk explains that Authority is reserve power rather than a weekly quota, that overflow recovery banks only to the displayed reserve limit, and that restraint is legitimate until a deliberate directive is warranted. No artificial spending opportunity was added. |
| HQ objectives say `Unreported` and offer generic review buttons | Strategic objectives now name the Presidency or the faction's Army HQ as responsible owner. With no filed political decision, operation, or reserve request, the next-lever line is a non-interactive hold-present-policy status rather than a misleading button. |

### Verification and score

- Owen-Stoltenberg resolution, duplicate-surface suppression, personnel routing, contrast, turn-24 staff contact, Authority-cap guidance, and HQ objective actionability were each covered by focused regressions.
- The complete player-journey gate passed 44 files / 764 tests.
- Tactical-map and desktop-simulation compile targets passed without packaging.
- The staged Presidency default is sourced to UN S/26486; the Assembly rejection is sourced to UN S/26922. The turn-24 staff recommendation remains grounded in *Balkan Battlegrounds*, vol. I, pp. 168-179.
- A fresh isolated Electron smoke loaded the immutable turn-80 save and verified the capped-Authority guidance plus named/non-interactive strategic-objective handoffs. The captured window reported zero console errors, warnings, page errors, or failed requests; the source save remained at SHA-256 `0241584e...402f`. Evidence: [`findings-remediation-smoke.json`](evidence/20260730_session14_rbih_80turn_complete/findings-remediation-smoke.json) and screenshots [`HQ objectives`](evidence/20260730_session14_rbih_80turn_complete/screenshots/20260730-findings-fix-smoke-01-hq-objectives.png) / [`Authority cap`](evidence/20260730_session14_rbih_80turn_complete/screenshots/20260730-findings-fix-smoke-02-authority-cap.png).
- The diary's `4/5` President-feel score remains the owner score. A fresh Electron owner run is required before considering `5/5`.

### Remediation scope

Local event ownership, scenario authoring, UI/read models, EN/BCS copy, tests, living canon/engineering documentation, this appendix, and the append-only project ledger were changed in the existing dirty workspace. No staging, commit, push, PR, branch change, package, installer, tag, publication, baseline refresh, or release-state change was performed.
