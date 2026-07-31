# D2 Owner Playtest Diary — RBiH Session 3 (60 Turns)

## Session Metadata

| Field | Entry |
| --- | --- |
| Diary date | 2026-07-30 |
| Operator | Owner-guided Codex run; choices limited to UI historical defaults or repository-normalized historical dispositions |
| Session number | 3 |
| Build / commit | `main` at `b8ff530de08fa23cf38103d8da9557da56296130`, plus the existing local bug/friction-remediation diff; tracked-diff fingerprint at session close `cb43b21e85a8f3124d85179acb08f72b95c8d6da6cfd1daae7d5b1cf817bc847` |
| Package version | `0.9.9-beta.1`; Electron `41.0.3`; Chrome `146.0.7680.80` |
| Build command | `npm.cmd run desktop:release:check` (passed), followed by direct Electron launch against the freshly built local desktop outputs. No package or installer was created. |
| Faction | RBiH |
| Scenario or save | Fresh campaign in a clean isolated Electron user-data profile |
| Start in-game date / turn | 6 April 1992 / turn 0 |
| End in-game date / turn | 31 May 1993 / turn 60 |

## Session Scope

| Field | Entry |
| --- | --- |
| Turns played | 60 exactly; the campaign was frozen before turn 61 |
| Real minutes played | 19.4 |
| Minutes per turn | 0.32 |
| End state saved? | Yes. Quicksave and autosave are byte-identical, 4,784,598 bytes each, SHA-256 `D83DFAAC2027900C149E5A64D48201F834FCA0E6E18B83BB0491CC7F1DC3BB93`. |
| Evidence folder | [`evidence/20260730_session03_rbih_60turn/`](evidence/20260730_session03_rbih_60turn/) |
| Command Authority this session | Spent: `0`; exact cumulative earned/overflow: not serialized and therefore not claimed; bank was `5.25` after turn 1 and `100/100` at the end, with reserve `15/15`. No grounded RBiH operation, reserve, or presidential military-order opportunity appeared, so the issue was not affordability but the absence of a historically defensible lever. |

This was the release-built Electron desktop shell, not a loose browser session. It was not a packaged installer run: creating a package would have violated the explicit no-package/no-release-state constraint. Desktop New Campaign intentionally created an `emergent` decision-mode save. The player's RBiH decisions were historical; non-player choices and the simulated campaign remained emergent and are not claimed as a fully historical replay.

## Historical Decision Discipline

| Turn | Desk decision | Historical choice used | Basis |
| ---: | --- | --- | --- |
| 0 | What Is Bosnia? | Civic multi-ethnic republic | UI-labeled historical default |
| 1 | Cutileiro / Lisbon proposal | Reject Plan | Normalized RBiH disposition in `WAR_TERMINATION_SPEC.md` |
| 3 | Paramilitary Authorization Policy | Refuse paramilitary deployment | UI-labeled historical default |
| 22 | Sarajevo officer corps posture | Retain multi-ethnic officer corps | UI-labeled historical default |
| 25 | London Conference | Subscribe to London Principles | UI-labeled historical default |
| 38 | Western pressure to engage with Vance-Owen | Acknowledge the message | UI-labeled historical default |
| 39 | Vance-Owen Peace Plan Presented | Accept the Vance-Owen Plan | UI-labeled historical default |
| 40 | Separate peace-plan system asked Vance-Owen again | Accept Plan | Repeated the already-recorded historical answer; the second prompt is a bug, not a new choice |
| 54 | Srebrenica Demilitarization Agreement | Comply in appearance, hide weapons | UI-labeled historical default |

The Hadžihasanović, Pašalić, and Šadić arrivals were acknowledged as information only. No commander replacement, reserve transfer, leadership gesture, authored operation, forced launch, or convoy choice was invented. At turn 60 the Avdo Palić and Rasim Delić personnel recommendations were deliberately left pending because the UI offered no historical-default disposition. The Palić-to-2nd-Corps recommendation was especially unsuitable for an unguided “historical” click.

## Campaign Milestones

| Turn / date | RBiH / RS / HRHB control | What mattered to the player |
| --- | --- | --- |
| 0 / 6 Apr 1992 | 31.50% / 53.63% / 14.87% | Civic platform selected; no military invention |
| 10 / 15 Jun 1992 | 24.29% / 63.49% / 12.22% | Opening territorial collapse had largely stabilized; 4 battles that week |
| 20 / 24 Aug 1992 | 23.21% / 64.35% / 12.44% | Desk showed staff review but no required presidential act; Army HQ simultaneously claimed strained command relations |
| 30 / 2 Nov 1992 | 23.43% / 64.12% / 12.44% | Civic platform persisted; very little presidential work between weekly advances |
| 39 / 4 Jan 1993 | 23.43% / 64.12% / 12.44% | Vance-Owen event presented and accepted |
| 40 / 11 Jan 1993 | 23.43% / 64.12% / 12.44% | Separate peace-plan system immediately demanded the same Vance-Owen answer |
| 50 / 22 Mar 1993 | 23.47% / 64.12% / 12.40% | RBiH–HRHB relation entered open war; no new grounded presidential military packet appeared |
| 54 / 19 Apr 1993 | 23.47% / 64.12% / 12.40% | Srebrenica demilitarization landed on the correct historical week and produced the session's best decision |
| 60 / 31 May 1993 | 23.47% / 64.12% / 12.40% | Exact stop point; `Operation Neretva '93` fired months too early |

Full weekly metrics are in [`turn-metrics.csv`](evidence/20260730_session03_rbih_60turn/turn-metrics.csv).

## Three Worst Friction Moments

### 1. Vance-Owen Was Decided Twice

| Field | Entry |
| --- | --- |
| Surface | President's Desk → event decision → separate peace-plan decision → Advance |
| What I was trying to do | Record RBiH's historical acceptance once and continue the campaign |
| What happened | The turn-39 event recorded acceptance, but turn 40 immediately blocked Advance with a second Vance-Owen acceptance prompt owned by another system. The second click added no judgment; it made the diplomatic record feel mechanically divided. |
| Screenshot or evidence path | [`29-turn39-vance-owen-plan-decision.png`](evidence/20260730_session03_rbih_60turn/29-turn39-vance-owen-plan-decision.png), [`30-turn39-vance-owen-plan-accepted.png`](evidence/20260730_session03_rbih_60turn/30-turn39-vance-owen-plan-accepted.png), [`31-turn40-milestone.png`](evidence/20260730_session03_rbih_60turn/31-turn40-milestone.png), [`32-turn40-duplicate-vance-owen-accepted.png`](evidence/20260730_session03_rbih_60turn/32-turn40-duplicate-vance-owen-accepted.png) |
| Bug or friction | **Bug** — current canon requires one player decision owner and consumption of the duplicate pending event |
| Severity / impact | High. It breaks trust in the campaign's most important diplomatic choice and directly interrupts Advance. |
| Suspected owner surface | Event decision queue / peace-plan resolver ownership and pending-decision cleanup |
| Proposed follow-up packet | `D2-RBIH-60-01 — Enforce single Vance-Owen decision ownership end-to-end` |

### 2. Historical Restraint Became an Empty Advance Loop

| Field | Entry |
| --- | --- |
| Surface | President's Desk → Army HQ review → Advance |
| What I was trying to do | Govern historically without inventing operational or personnel decisions |
| What happened | After turn 3 there was a 19-turn gap before the next required historical decision. Across all 60 turns, no player-visible RBiH operation history, operation opportunity, reserve request, or grounded military directive appeared. Command Authority remained unspent and eventually sat at `100/100`. On turn 20 the Desk said staff review was recommended, while Army HQ showed critical siege contexts but no review or decision the president could actually own. The honest historical action was repeated Advance. |
| Screenshot or evidence path | [`16-turn20-milestone.png`](evidence/20260730_session03_rbih_60turn/16-turn20-milestone.png), [`17-turn20-presidents-desk.png`](evidence/20260730_session03_rbih_60turn/17-turn20-presidents-desk.png), [`18-turn20-desk-empty-staff-review.png`](evidence/20260730_session03_rbih_60turn/18-turn20-desk-empty-staff-review.png), [`19-turn20-army-hq-briefing.png`](evidence/20260730_session03_rbih_60turn/19-turn20-army-hq-briefing.png) |
| Bug or friction | **Friction** — the state can legitimately have no order, but the campaign lacks a positive historical hold/doctrine packet and meaningful staff cadence |
| Severity / impact | Critical to President feel. Most of the 13-month session became calendar advancement rather than judgment. |
| Suspected owner surface | RBiH historical staff packet cadence, presidential doctrine/hold actions, and Army HQ synthesis |
| Proposed follow-up packet | `D2-RBIH-60-02 — Historical restraint and staff-packet cadence for RBiH` |

### 3. The Officer Queue Offered Personnel Work Without Historical Grounding

| Field | Entry |
| --- | --- |
| Surface | President's Desk personnel matters → Advance |
| What I was trying to do | Review the late-session command transition without inventing appointments |
| What happened | The final Desk held three cards: Avdo Palić as a proposed 2nd Corps replacement, Rasim Delić's arrival, and Delić as a Main Staff replacement for Halilović. None carried a historical-default action. The two Delić cards split one transition into duplicate administrative review, while the Palić recommendation looked historically suspect. Leaving all three unresolved was the only disciplined choice. |
| Screenshot or evidence path | [`34-turn50-avdo-palic-personnel-matter.png`](evidence/20260730_session03_rbih_60turn/34-turn50-avdo-palic-personnel-matter.png), [`39-turn60-final-presidents-desk.png`](evidence/20260730_session03_rbih_60turn/39-turn60-final-presidents-desk.png) |
| Bug or friction | **Friction** — the queue is actionable as implemented, but its grouping, provenance, and historical guidance are inadequate |
| Severity / impact | High. It asks the owner to manufacture personnel history or carry unexplained unresolved cards. |
| Suspected owner surface | Officer arrival/replacement Desk read model and historical-default metadata |
| Proposed follow-up packet | `D2-RBIH-60-03 — Ground and consolidate historical RBiH officer succession` |

## Best Moment

| Field | Entry |
| --- | --- |
| Surface | President's Desk event decision — Srebrenica Demilitarization Agreement |
| What worked | On 19 April 1993, the decision explained the enclave's survival problem, UN pressure, compliance risk, and hidden-weapons tradeoff, then clearly marked `Comply in appearance, hide weapons` as the historical default. The consequence receipt persisted immediately. |
| Why it felt presidential | It connected military survival, diplomacy, credibility, and moral hazard in one consequential choice without asking the player to micromanage a brigade. |
| Screenshot or evidence path | [`36-turn54-srebrenica-demilitarization-decision.png`](evidence/20260730_session03_rbih_60turn/36-turn54-srebrenica-demilitarization-decision.png), [`37-turn54-srebrenica-historical-default-recorded.png`](evidence/20260730_session03_rbih_60turn/37-turn54-srebrenica-historical-default-recorded.png) |

## Presidential Feel Grade

| Field | Entry |
| --- | --- |
| Did I feel like the President? | **3 / 5** |
| One-sentence reason | The seven authored historical event decisions were often strong, but most weeks offered no grounded presidential lever, while duplicate diplomacy and ungrounded officer work weakened trust in the Desk. |
| Would I play the next 10 turns tomorrow unprompted? | **No.** First fix duplicated diplomatic ownership and historical event timing, then give RBiH a truthful positive-restraint/staff packet cadence so historical play is more than repeated Advance. |

To reach **5 / 5**, the loop needs five things together: one canonical owner for each diplomatic choice; event dates tight enough that historical labels arrive in their historical season; positive `hold present policy` or doctrine packets that make restraint an authored presidential act; historically grounded, consolidated officer succession; and command narrative that never invents interventions or hides the incumbent.

## Bug vs. Friction Split

### Confirmed Bugs

| Item | Surface | Why this is a bug | Blocks play? | Follow-up owner |
| --- | --- | --- | --- | --- |
| Vance-Owen prompted twice | Event decision + peace-plan gate | The turn-39 event acceptance did not consume the turn-40 peace-plan prompt, contrary to the one-owner invariant. | Yes, until the same answer is given again | Event/peace-plan decision ownership |
| `Operation Neretva '93` fired on 31 May 1993 | Event timing / Chronicle | Repository research dates Operation Neretva '93 to September 1993; the event's broad `turn_min: 60` allows a historical title to fire months early. | No | 1993 event trigger data and timing tests |
| Army HQ invented intervention strain | Commander-friction read model | Turn 20 said 2nd Corps relations were strained “following recent presidential interventions,” but the save records `0` lifetime Command Authority spent and no player military directive; `ignored_stance` friction then repeated at turns 20, 40, and 60. | No | Commander-friction provenance/read model |
| Army HQ hid the active incumbent | Officer succession read model | The turn-60 save still has Sefer Halilović active, but the Army HQ header omitted the incumbent CO while the Delić replacement prompt was merely pending. | No | Officer replacement projection/UI |

### Friction, Not Bugs

| Item | Surface | Why this is friction rather than a correctness defect | Blocks play? | Follow-up owner |
| --- | --- | --- | --- | --- |
| 60-turn presidential/operational vacuum | Desk / Army HQ / Advance | A week may validly require no presidential act, but the aggregate cadence provides too little authored judgment and no positive historical-restraint expression. | No | Game design + RBiH staff packets |
| Three-card final personnel queue | Desk personnel matters | The cards resolve through existing actions, but their provenance, grouping, and historical defaults do not support disciplined owner play. | No | Officer UX/content |
| Archive count scope is opaque | Records / Chronicle | The final Records window showed `DECISIONS 3` and `DECISION LOG 3`, while the full save held seven RBiH event decisions plus two peace-plan responses. This may be an intentional window, but the label does not explain the scope. | No | Records information architecture |
| Two operation-validation skips in stdout | Desktop log | Jajce and Bosanski Novi were skipped because RS already controlled every objective. These were explicit safe validation outcomes, not runtime failures. | No | No bug; retain diagnostics |

## Historical Plausibility Notes

- RBiH rejected Cutileiro and accepted Vance-Owen in accordance with the repository's normalized peace-plan dispositions.
- The Srebrenica agreement fired on 19 April 1993, matching the documented 17–18 April timing closely.
- Vance-Owen appeared on 4 January 1993, close to its documented early-January presentation; the defect was duplicate ownership, not the first prompt's timing.
- RBiH–HRHB open war appeared on 22 March 1993. The local historical sources support escalation in early 1993, while scenario notes cite full-scale fighting from mid-January. This run's later transition is emergent drift, not classified here as a confirmed defect.
- `Operation Neretva '93` on 31 May is a confirmed timing defect because the repository's own 1993 research places it in September.

## Diagnostics and Evidence Integrity

- 43 PNG screenshots cover campaign creation, every player decision, turns 10/20/30/40/50/60, final Desk/Army HQ/Records/Chronicle, and the final war map.
- Browser diagnostics: 133 console messages, zero console errors, zero console warnings, zero page errors, zero failed requests, and no unexpected navigation.
- Desktop diagnostics: zero error/fatal/exception patterns. Two non-fatal operation-validation warnings were retained verbatim in [`runtime-diagnostics.json`](evidence/20260730_session03_rbih_60turn/runtime-diagnostics.json).
- The final state contains 60 turn summaries and the derived metrics contain all turns 0–60 with no gaps.
- All 90 player combat formations had a location; 12 were ungrouped reserves.
- Quicksave and autosave hashes are identical. This proves close-of-session internal consistency only. A single owner run is not replay-determinism proof.
- Final state and per-session counts are in [`runtime-diagnostics.json`](evidence/20260730_session03_rbih_60turn/runtime-diagnostics.json) and [`session-metrics.json`](evidence/20260730_session03_rbih_60turn/session-metrics.json).

## Desk -> Decision -> Advance Loop Check

| Field | Entry |
| --- | --- |
| Did the top-3 include a new Desk -> Decision -> Advance friction? | **Yes.** The duplicate Vance-Owen owner, empty historical-restraint cadence, and ungrounded officer queue all touched the core loop. |
| If no, is this the second consecutive no-new-loop-friction diary? | No |
| If yes to second consecutive no-new-loop-friction diary | Not applicable |

## Triage Outcome

Bug fixes remain ahead of friction work, consistent with the owner's direction.

| Rank | Accepted follow-up | Packet path or owner | Status |
| --- | --- | --- | --- |
| 1 | Enforce single Vance-Owen decision ownership and consume duplicate pending work | Event decision queue + peace-plan resolver | Confirmed bug; ready to specify/test |
| 2 | Correct historically named 1993 event timing, starting with Operation Neretva '93 | Scenario event data + historical timing regressions | Confirmed bug; ready to specify/test |
| 3 | Add a grounded RBiH historical-restraint/staff packet cadence, then consolidate officer succession | Game design + Desk/Army HQ + officer content | Friction packet after bug fixes |

## Scope and Release Safety

This diary adds evidence and documentation only. It did not change simulation or scenario behavior, save schema, startup snapshots, baselines, package output, installer, branch, tag, release state, staging, commit, push, pull request, or publication. The pre-existing local implementation diff was preserved.

## Post-session remediation appendix — 30 July 2026

This appendix records the bug-first implementation and deterministic desktop-simulation replay requested after the diary. It does not rewrite the observations or the `3/5` grade above: those remain the result of the packaged Electron owner session. A fresh Electron diary is required before awarding a new subjective President-feel score.

### Bugs fixed

| Confirmed bug | Disposition | Regression evidence |
| --- | --- | --- |
| Vance-Owen required two player responses | Event resolution now hands the Vance-Owen response to the canonical peace-plan resolver. The synchronization path writes one event receipt, one peace-plan history row, and consumes the duplicate pending work without a second player decision. | `tests/peace_plans.test.ts` |
| `Operation Neretva '93` could fire on 31 May 1993 | The event window is now turns 74–76, placing it in September 1993 instead of the former turn-60 opening. Its Grabovica/Uzdol dependent now begins at turn 74 as well, preserving September chronology. | `tests/events_evaluate.test.ts`, `tests/event_timeline_integrity.test.ts` |
| Army HQ attributed commander strain to nonexistent presidential interventions | The read model now carries the actual strain source: presidential intervention, commander friction, exhaustion, mixed, or none. Briefing and corps-card language use that provenance rather than assuming the president caused every strained relationship. | `tests/command_authority_strain_signals.test.ts`, `tests/ui/chief_of_staff_briefing_i18n.test.ts` |
| Pending Delić succession hid active incumbent Halilović | Army HQ continues to show a persisted active commander until the replacement decision is actually resolved. | `tests/ui/opening_corps_commander_display.test.ts` |
| Avdo Palić could be proposed for mainland 2nd Corps despite his Žepa enclave lock | Historical-successor and automatic-replacement selection now enforce enclave compatibility. | `tests/officer_system.test.ts` |
| Delić's arrival and succession produced two same-turn Desk cards | An unacknowledged informational arrival is consolidated when the same officer already has the actionable replacement matter. The roster arrival remains durable; only redundant Desk work is removed. | `tests/army_co_emergent_lifecycle.test.ts` |

The last two items were initially observed as personnel-queue friction. Root-cause work established that they violated authored assignment/queue truth, so they are recorded here as bugs rather than disguised as UX complaints.

### Friction changed

The original 19-turn required-decision drought ran from the turn-3 paramilitary posture to the turn-22 minority-retention posture. The repair reuses two already-authored, historically grounded RBiH decisions:

- Minority retention now enters its documented early-summer window at turns 12–16. This reflects the April integration of the Patriotic League into the government Territorial Defence, the late-April district reorganization, and the already-authored Divjak/Šiber multi-ethnic command posture.
- The London Conference now enters at turn 20 through a bounded three-week chain from the 6 August 1992 concentration-camp reporting to the 26–27 August conference. Its former accumulated-pressure route remains valid.

A fresh single-branch 60-turn replay produced this RBiH decision cadence:

| Turn | Historical owner decision |
| ---: | --- |
| 0 | State identity |
| 3 | Paramilitary posture |
| 12 | Minority retention |
| 20 | London Conference principles |
| 38 | Vance-Owen engagement posture |
| 39 | Vance-Owen response |
| 54 | Srebrenica demilitarization response |

The specific opening drought therefore falls from **19 turns to 9 turns**. No decision, option, military lever, or counterfactual was invented to achieve that result.

There is still an **18-turn quiet interval from turn 20 to turn 38**. The catalog contains no additional authored RBiH presidential decision in that interval that can be moved honestly without distorting chronology. The UI's existing `Advance while holding present policy` treatment makes restraint explicit, but it is not counted here as a decision. This remaining cadence is friction, not a correctness bug, and needs new researched content or a staff-packet design before it can be closed.

Records labels now state their scope: `DESK DECISIONS` / `Desk Decisions` count Desk-filed records, while `Chronicle Decisions` identifies authored event decisions recorded in the Chronicle. This removes the impression that the smaller Desk count is the complete campaign decision history.

### Remediation verification and scope

- Focused behavior gate: 8 files / 213 tests passed.
- Broader event catalog/runtime gate: 15 files / 326 tests passed, with 5 pre-existing skips.
- Player-journey gate: 44 files / 761 tests passed.
- TypeScript, tactical-map build, desktop simulation bundle, and Warroom build passed. These were unpackaged compile checks only.
- Canon determinism static scan passed. The `apr1992_52w` golden baseline comparison reported the expected `activity_summary.json` drift after the intentional 1992 event retiming; the baseline was not overwritten.
- Deterministic 60-turn RBiH replay reached turn 60 with decisions at turns `0, 3, 12, 20, 38, 39, 54`.
- The player-facing turn-60 officer queue contained only the authored Delić-for-Halilović replacement matter: no Palić mainland proposal and no duplicate Delić arrival card.
- The replay used the desktop simulation surface, not the packaged Electron UI. It produced no replacement screenshots and does not supersede the live evidence above.
- Scenario timing changes intentionally alter the relevant historical baseline; it was not regenerated.
- No staging, commit, push, package, installer, tag, branch, publication, or release-state action was performed.
