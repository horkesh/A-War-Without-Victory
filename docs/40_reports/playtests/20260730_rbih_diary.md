# D2 Owner Playtest Diary — RBiH Session 1

## Session Metadata

| Field | Entry |
| --- | --- |
| Diary date | 2026-07-30 |
| Operator | Codex operating the build under owner direction |
| Session number | 1 |
| Build / commit | `b8ff530de08fa23cf38103d8da9557da56296130` (`main`, matching `origin/main` at session close) |
| Package version | `0.9.9-beta.1`; Electron `41.0.3`; Chrome `146.0.7680.80` |
| Build command | `npm run desktop -- --remote-debugging-port=9223 --user-data-dir=<isolated-session-profile>` |
| Faction | RBiH |
| Scenario or save | Fresh campaign |
| Start in-game date / turn | 6 Apr 1992 / turn 0 |
| End in-game date / turn | 15 Jun 1992 / turn 10 |

## Session Scope

| Field | Entry |
| --- | --- |
| Turns played | 10 |
| Real minutes played | 18 minutes from launcher to the turn-10 closing desk; save and diagnostics followed |
| Minutes per turn | 1.8 |
| End state saved? | Yes — `saves/quicksave.json`, SHA-256 `413DF74E63D1BF64843631297340E1D67DC27FE9A7A2D6A44D5DC6A03643C603` |
| Evidence folder | `docs/40_reports/playtests/evidence/20260730_session01/` |
| Command Authority this session | Spent: 0; earned: 42 gross recovery, derived from the visible per-turn recovery/bank readouts; turns at current cap: 10; turns ending with the reserve bank also capped: 7; income wasted after both caps: 27. I never lacked CA or forgot the levers; I declined to invent a discretionary military act because the desk supplied no historically grounded staff recommendation. |

### Historical-play doctrine and decision log

The owner selected RBiH and directed the run to play as historically as possible. I used an explicit `HISTORICAL DEFAULT` when the UI supplied one, then repository canon when it did not. I made no discretionary military choice without one of those bases.

| Turn | Decision | Response | Basis | Evidence |
| --- | --- | --- | --- | --- |
| 0 | What Is Bosnia? | Civic multi-ethnic republic | UI-labeled `HISTORICAL DEFAULT` | `08-what-is-bosnia-choice.png` |
| 1 | Cutileiro / Lisbon peace proposal | Reject plan | Normalized historical default in `docs/10_canon/WAR_TERMINATION_SPEC.md` | `11-turn01-cutileiro-proposal.png` |
| 3 | Paramilitary Authorization Policy | Refuse paramilitary deployment | UI-labeled `HISTORICAL DEFAULT` | `14-turn03-paramilitary-historical-default.png` |

No other presidential decision became required through turn 10. Informational historical events were acknowledged without adding policy or military choices.

### Ten-turn player-view record

| Turn / date | Territory | Battles, player / total | Own casualties | Displaced | Required decision |
| --- | ---: | ---: | ---: | ---: | --- |
| 1 / 13 Apr | -10 | 9 / 10 | 6,225 | 0 | Reject Cutileiro plan |
| 2 / 20 Apr | -8 | 11 / 11 | 1,194 | 0 | None |
| 3 / 27 Apr | -16 | 16 / 17 | 967 | 0 | Refuse paramilitary deployment |
| 4 / 4 May | -10 | 10 / 11 | 990 | 12,790 | None |
| 5 / 11 May | -9 | 7 / 9 | 984 | 467,081 | None |
| 6 / 18 May | -6 | 4 / 5 | 99 | 42,507 | None |
| 7 / 25 May | -2 | 0 / 0 | 0 | 57,258 | None; report arithmetic contradicted itself |
| 8 / 1 Jun | -1 | 1 / 3 | 27 | 63,366 | None |
| 9 / 8 Jun | 0 | 0 / 1 | 0 | 52,508 | None |
| 10 / 15 Jun | -2 | 3 / 4 | 359 | 26,013 | None |

## Three Worst Friction Moments

### 1. Opening required decision was buried behind multiple handoffs

| Field | Entry |
| --- | --- |
| Surface | President's Desk → Priorities → Decision Room → decision modal → Advance |
| What I was trying to do | Resolve the single required opening presidential signature and advance the campaign. |
| What happened | The desk correctly said one decision was required, but reaching the actual options required moving through several separately named layers. The route felt like filing through offices rather than receiving a decision packet on the President's desk. |
| Screenshot or evidence path | `05-opening-priorities.png`, `06-opening-decision-room.png`, `07-first-presidential-decision.png`, `08-what-is-bosnia-choice.png` |
| Bug or friction | Friction |
| Severity / impact | High. It is the first mandatory loop and teaches a costly mental model for every later signature. |
| Suspected owner surface | Presidential Desk routing, priority-docket primary action, Decision Room handoff |
| Proposed follow-up packet | `D2-01 — Direct required-signature handoff from Desk to the live decision card` |

### 2. The aftermath demanded an answer but supplied no grounded action

| Field | Entry |
| --- | --- |
| Surface | Turn Aftermath → Command Desk → President's Desk → Advance |
| What I was trying to do | Respond historically to repeated territorial losses and humanitarian shock without inventing an ahistorical operation. |
| What happened | The aftermath repeatedly said command must decide whether to stabilize or answer, while Command Desk showed 0 actionable items, 0 opportunities, 0 reserves, and 0 officers. The President's Desk simultaneously held 100/100 CA plus a full 15/15 reserve but offered no specific staff recommendation or historically grounded target. The only honest historical-play action was passive Advance. |
| Screenshot or evidence path | `17-turn05-aftermath-11may-displacement.png`, `20-turn06-desk-authority-cap.png`, `25-turn10-aftermath-15jun.png`, `27-final-desk-15jun.png` |
| Bug or friction | Friction |
| Severity / impact | High and repeated. The loop names a presidential dilemma but does not turn it into a decision, making passivity feel like missing UI rather than chosen restraint. |
| Suspected owner surface | Turn Aftermath next-action model, President's Desk, Army HQ recommendation handoff |
| Proposed follow-up packet | `D2-02 — Aftermath-to-action staff recommendation with a historically grounded restraint option` |

### 3. Reviewing the aftermath did not settle the priority docket

| Field | Entry |
| --- | --- |
| Surface | Weekly Aftermath → Review Inbox / Priorities → Advance |
| What I was trying to do | Close the weekly report and know whether any urgent work still required presidential attention. |
| What happened | A report already read in the full aftermath remained a separate review obligation in the priority docket. The docket stayed visibly layered behind later aftermath screens and reached `4 / URG 5`; the UI did not explain that reading the report and clearing its priority card were different acknowledgements. |
| Screenshot or evidence path | `12-turn02-aftermath-priority-overlap-20apr.png`, `18-turn06-aftermath-18may.png`, `25-turn10-aftermath-15jun.png` |
| Bug or friction | Friction |
| Severity / impact | Medium-high. It creates attention debt and makes the urgent count less trustworthy exactly where Advance should feel clean. |
| Suspected owner surface | Warroom priority docket, aftermath acknowledgement semantics, overlay ownership |
| Proposed follow-up packet | `D2-03 — Unify aftermath review state with priority-docket acknowledgement` |

## Best Moment

| Field | Entry |
| --- | --- |
| Surface | War Begins identity briefing |
| What worked | The `WHO YOU ARE` block joined identity, strategic situation, and “What you cannot escape” before exposing the force picture. |
| Why it felt presidential | It framed the office as a collision between a civic political commitment, military scarcity, and responsibility for what could actually be held. That gave the later historical defaults moral and strategic meaning instead of presenting them as optimization choices. |
| Screenshot or evidence path | `03-war-begins-briefing.png` |

## Presidential Feel Grade

| Field | Entry |
| --- | --- |
| Did I feel like the President? | 3 / 5 |
| One-sentence reason | The authored identity and three consequential policy calls felt presidential, but most weekly loops reduced a national crisis to reading losses, seeing no grounded action, and pressing Advance. |
| Would I play the next 10 turns tomorrow unprompted? | Yes — the historical framing is compelling enough, but I would want the required-decision route shortened and at least one concrete staff recommendation after major shocks. |

## Bug vs. Friction Split

| Item | Surface | Bug or friction | Blocks play? | Follow-up owner |
| --- | --- | --- | --- | --- |
| Turn 7 says `Net territorial loss: -2 positions` and `0 gained / 0 lost` in the same report | Turn Aftermath territory summary | Bug | No | Turn-summary data/read-model owner; `turnAftermath` territory reconciliation |
| The opening force brief converts unreported enemy personnel/equipment to exact zeroes while its prose says the VRS is professional and heavily armed | War Begins force briefing | Bug | No | `PeaceWarTransition` plus reported/unreported metric semantics |
| Major-loss aftermath says command must answer but produces no actionable or grounded staff option | Aftermath → Desk → Advance | Friction | No | President's Desk / Army HQ interaction owner |

The 467,081 displaced figure on turn 5 is recorded as a plausibility/legibility concern, not classified as a bug: the serialized state agrees with the UI, and this session did not establish that the simulation value is incorrect.

## Desk -> Decision -> Advance Loop Check

| Field | Entry |
| --- | --- |
| Did the top-3 include a new Desk -> Decision -> Advance friction? | Yes |
| If no, is this the second consecutive no-new-loop-friction diary? | No |
| If yes to second consecutive no-new-loop-friction diary | Not applicable |

## Triage Outcome

No follow-up was accepted or implemented during this playtest. These are proposed front-of-backlog items awaiting owner triage; no packet file was created.

| Rank | Accepted follow-up | Packet path or owner | Status |
| --- | --- | --- | --- |
| 1 | Direct required-signature handoff | Presidential Desk / Decision Room owner | Proposed; awaiting owner triage |
| 2 | Aftermath-to-action staff recommendation | Game design + President's Desk / Army HQ owner | Proposed; awaiting owner triage |
| 3 | Unified aftermath / priority acknowledgement | Priority docket + aftermath UI owner | Proposed; awaiting owner triage |

## Diagnostics and Execution Notes

- The packaged Electron session completed 10 turn advances and quick-saved successfully.
- `runtime-diagnostics.json` records 0 runtime exceptions, 0 browser log errors, and 24 normal `gameStore` load messages. The finalized desktop stdout log contains the successful release-check/build, server-start, and normal assignment diagnostics; stderr contains only the DevTools listening endpoint. Neither log contains an error, exception, failed, fatal, or warning pattern.
- The Settings → Diagnostics export is preserved as `local-playtest-evidence.json`. Crash-diagnostics consent remained off; the packet therefore contains 0 breadcrumbs and 0 crash reports.
- `session-metrics.json` preserves the player-view turn table, decision bases, CA accounting, and end-state metadata.
- A stale preflight checkout at `e5f8643` failed to return cleanly from campaign creation. The workspace then moved to current `main`; the actual diary session was restarted from a clean isolated profile at `b8ff530`. Preflight artifacts are isolated under `docs/40_reports/playtests/evidence/20260730_preflight_e5f8643/` and are not counted as a current-build bug or as any of the 10 turns.
- No commit, push, package, branch change, or release-state change was performed.
