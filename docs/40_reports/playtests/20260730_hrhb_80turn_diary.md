# AWWV Owner Playtest Diary — HRHB, 80 Turns

## Session Metadata

| Field | Entry |
| --- | --- |
| Diary date | 2026-07-30 |
| Operator | Codex owner-play proxy, using authored historical defaults and cited research |
| Session number | 15 |
| Build / commit | Dirty current `main`; HEAD `b8ff530de08fa23cf38103d8da9557da56296130`; captured working-tree content hash `f2462d6e98fd573773fb6521d284d51a5698a6d89f639e6be6d78556d0941151` |
| Package version | `0.9.9-beta.1` |
| Build command | None. Per owner restriction, no build, package, installer, baseline, or release-state action was run. The QA harness launched the production Electron entry against the existing compiled desktop, War Room, and tactical-map outputs. This was not a newly packaged installer. |
| Faction | HRHB / HVO |
| Scenario or save | Fresh campaign at turn 0, then the same canonical autosave continued across five technical resumptions caused by captured QA defects; a final non-mutating turn-80 reload emitted the manifest |
| Start in-game date / turn | 6 Apr 1992 / turn 0 |
| End in-game date / turn | 18 Oct 1993 / turn 80 |

## Session Scope

| Field | Entry |
| --- | --- |
| Turns played | Exactly 80; maximum observed turn 80; no overrun |
| Real minutes played | About 45 minutes for the definitive campaign and resumptions; about 62 minutes including two discarded preflight reproductions |
| Minutes per turn | About 0.56 for the definitive campaign |
| End state saved? | Yes. Final autosave SHA-256 `df5fcc3d43d86dc231a55659c98a5628774634a33759586dcdf95f5cf3cf1084`; final projected-state SHA-256 `604f44535f437871f3455ddcb89b68317b68b16574891f5609ebeec7a39f551c` |
| Evidence folder | [`evidence/20260730_session15_hrhb_80turn/`](evidence/20260730_session15_hrhb_80turn/) — 76 files, 49 selected screenshots, 110.86 MiB |
| Command Authority this session | Spent: 300 lifetime, all on 12 accepted elite-reserve releases at 25 CA each. Earned: no lifetime-earned field is exposed; final recovery was 5.5 from patron confidence. Turns at cap / income wasted: not exposed. Final balance: 75/100 plus 15/15 banked. I was never blocked by price, but the recurring Vitezovi packet made Command Authority feel like a periodic tax and crowded out deliberate use of the other levers. |

## Run Method and Historical Guardrails

This was one fresh HRHB campaign with canonical autosave continuity. Technical resumptions occurred at turns 12, 51, 65, and 75; a second turn-51 reload was needed solely because the HRHB counter-coverage gate failed after the first turn-51 response had already been saved. The final turn-80 reload made no decision and advanced no turn.

The normal runner would keep incumbent commanders and could act on generic proposals. For this owner run, process-only behavior was constrained without editing repository files:

- only proposals whose action began with `HISTORICAL_OP:` were approved;
- replacement matters used the visible **Open personnel → Appoint Historical Successor** route;
- required authored events were given priority over reserve packets;
- the counter interaction sample was reduced from the RS/RBiH-oriented fixed floor to the HRHB counters actually reachable in the current viewport;
- the final manifest-only reload retained the contrast diagnostic but did not make that already-captured failure fatal a second time.

These process-only changes are disclosed because the harness snapshot hash describes the on-disk script, not the in-memory policy. No save field was injected or edited.

### Authored HRHB decisions

All 12 required authored HRHB responses used the event's marked historical default:

| Turn | Event | Recorded response |
| --- | --- | --- |
| 0 | HRHB political goal | `croat_republic` |
| 4 | Graz cooperation collapses | `local_friction_emerges` |
| 13 | Herceg-Bosna consolidation | `formalize_institutions` |
| 14 | Summer alliance strain | `accept_local_consolidation` |
| 16 | Zagreb supply channel | `deepen_patron_channel` |
| 36 | Gornji Vakuf clashes | `escalate` |
| 51 | Vance–Owen acceptance | `accept_vance_owen_plan` |
| 51 | Zagreb restrains Boban | `acknowledge_pressure` |
| 52 | Central Bosnia defense | `defend_pocket` |
| 65 | Territorial scope | `pragmatic_maximum` |
| 75 | Owen–Stoltenberg response | `accept_union_three_republics` |
| 79 | Camp-exposure response | `deny` |

The historical basis is the authored source packet plus the local research set: the HVO/HZ HB political-military structure and commander sequence in the [HVO order-of-battle master](../../knowledge/HVO_ORDER_OF_BATTLE_MASTER.md); the 1992 alliance ambiguity and 1993 open-war gate in [ARBiH–HVO hostilities timing](../../../data/derived/knowledge_base/balkan_battlegrounds/extractions/ARBIH_HVO_HOSTILITIES_TIMING.md); and the early-war territorial chronology in [Balkan Battlegrounds extraction notes](../../../data/derived/knowledge_base/balkan_battlegrounds/extractions/EARLY_WAR_TERRITORIAL_PROGRESSION_APR_JAN1993.md). The relevant local notes cite *Balkan Battlegrounds* Vol. I pp. 180–183 and 194 for Herceg-Bosna/HVO formation, Posavina/Jajce, and early local Croat–Bosniak friction. The Vance–Owen event source note additionally cites UN S/25221 Annex VII, UN S/25403 Annex II, and the *Prlić et al.* judgments.

Three named personnel successions were completed through visible controls and have `replacement_accepted` receipts:

- turn 44: Žarko Tole → Željko Šiljeg;
- turn 64: Milivoj Petković → Slobodan Praljak;
- turn 80: Slobodan Praljak → Ante Roso.

### Forced test counterfactuals

The generic peace-plan system immediately ended the preliminary campaign when HRHB historically accepted Cutileiro at turn 0/1. Exact 80-turn play was therefore impossible while preserving those terminal choices. The definitive run rejected the three generic plan gates solely to continue:

| Turn | Generic plan | Test response | Historical status |
| --- | --- | --- | --- |
| 0 | Cutileiro | Reject | Forced counterfactual; preliminary acceptance ended the campaign at turn 1 |
| 40 | Vance–Owen | Reject | Forced counterfactual; the separate authored HRHB event was still accepted historically at turn 51 |
| 70 | Owen–Stoltenberg | Reject | Forced counterfactual; the separate authored HRHB event was still accepted historically at turn 75 |

The reserve packets were simulation-generated operational requests, not historical claims. Each visible suggested Vitezovi deployment was accepted to follow the staff recommendation consistently. Operation Jackal was approved because it was explicitly tagged as a historical preplanned operation. No ordinary proposal was auto-approved.

## Three Worst Friction Moments

### 1. Historical peace ends the long-form historical playtest

| Field | Entry |
| --- | --- |
| Surface | President's Desk → International Peace Proposal → Advance/terminal verdict |
| What I was trying to do | Follow HRHB's historical peace-plan disposition and continue the requested 80-turn historical campaign |
| What happened | Accepting Cutileiro immediately produced a turn-1 negotiated-peace verdict. To exercise the remaining 79 turns, the definitive run had to reject Cutileiro, Vance–Owen, and Owen–Stoltenberg at the generic peace gate, even though later authored HRHB events correctly model acceptance. The game currently forces a choice between historical diplomatic behavior and long-form owner testing. |
| Screenshot or evidence path | [`preflight-counterfactual/...068-peace-plan-after-response.png`](evidence/20260730_session15_hrhb_80turn/preflight-counterfactual/20260730_session15_hrhb_80turn_definitive-hrhb-068-peace-plan-after-response.png); definitive rejection receipt in [`run-data/...manifest.json`](evidence/20260730_session15_hrhb_80turn/run-data/paradox-local-qa-20260730_session15_hrhb_80turn_manifest.json) |
| Bug or friction | Friction — the terminal result is working as designed, but the design cannot support a historically faithful 80-turn diary |
| Severity / impact | Critical for historical long-run play; it invalidates the core test premise unless disclosed counterfactuals are introduced |
| Suspected owner surface | Product/game design, negotiation terminal-state contract, owner-playtest harness policy |
| Proposed follow-up packet | `D2-HRHB-01`: distinguish plan endorsement from all-party settlement/terminal peace, or add an explicit non-canonical continuation mode whose saves and diary are visibly marked |

### 2. Nineteen-turn authored-decision drought

| Field | Entry |
| --- | --- |
| Surface | President's Desk → Decision Room → Advance, turns 17–35 |
| What I was trying to do | Maintain a presidential political rhythm after deepening the Zagreb supply channel at turn 16 |
| What happened | The next authored HRHB presidential response did not occur until Gornji Vakuf at turn 36: 19 complete intervening turns without an authored political decision. The Desk remained active mostly through recurring reserve releases and informational staff reviews, so the middle of the campaign felt administratively busy but politically empty. A second 14-turn authored gap followed between turns 36 and 51. |
| Screenshot or evidence path | Turn-30 Decision Room: [`screenshots/...072-light-turn-30-decision-room.png`](evidence/20260730_session15_hrhb_80turn/screenshots/20260730_session15_hrhb_80turn_resume2-hrhb-072-light-turn-30-decision-room.png); exact receipt turns in the final manifest |
| Bug or friction | Friction — event cadence/content distribution, not a runtime defect |
| Severity / impact | High; the President fantasy weakens for roughly five in-game months despite a live war and major historical developments |
| Suspected owner surface | Event scheduler/content cadence, faction-specific Desk agenda |
| Proposed follow-up packet | `D2-HRHB-02`: add two historically sourced HRHB decision beats or consequential follow-ups inside turns 17–35; target no more than 8–10 turns between authored presidential choices |

### 3. Repeated Vitezovi reserve cycle dominates the Desk and authority economy

| Field | Entry |
| --- | --- |
| Surface | President's Desk reserve packet → Decision Room elite release → Advance |
| What I was trying to do | Respond consistently to Central Bosnia's defensive-gap request without inventing a new operational policy |
| What happened | The same corps, defensive-gap reason, and Vitezovi Brigade returned 12 times at turns 1, 11, 23, 35, 40, 45, 50, 55, 65, 70, 75, and 80. Every approval cost 25 CA, producing exactly 300 lifetime spend. The engine's 6/12-turn loan lifecycle and 4-turn cooldown make repeated loans legal, so this is not presently a confirmed bug; in play, however, the cycle reads like approving the same order over and over and competes directly with authored decisions at turns 65 and 75. |
| Screenshot or evidence path | First packet: [`screenshots/...023-reserve-request-modal.png`](evidence/20260730_session15_hrhb_80turn/screenshots/20260730_session15_hrhb_80turn_definitive2-hrhb-023-reserve-request-modal.png); all 12 exact receipts in the final manifest |
| Bug or friction | Friction — verified intentional lifecycle, but poor recurrence/context communication |
| Severity / impact | High; consumes all recorded CA spending and makes the Desk feel repetitive rather than strategic |
| Suspected owner surface | Army reserve lifecycle presentation, repeat-request suppression/summary, Command Authority UX |
| Proposed follow-up packet | `D2-HRHB-03`: convert repeat loans into a continuing commitment/renewal dossier showing prior episode, reason for recall, delta in threat, cumulative CA, and a standing-policy option |

## Additional Friction Worth Keeping

Operation Jackal was one of the run's best historical dossiers, with named command, commander, assigned force, route, and purpose. It was nevertheless filed as **Recommended before advance**, explicitly said it would not block the turn, and remained unresolved from turn 8 until the technical intervention at turn 12. A historically important operation should not be as easy to advance past as a generic staff note. Evidence: [`screenshots/...005-strategic-proposal-dossier-open.png`](evidence/20260730_session15_hrhb_80turn/screenshots/20260730_session15_hrhb_80turn_resume2-hrhb-005-strategic-proposal-dossier-open.png).

## Best Moment

| Field | Entry |
| --- | --- |
| Surface | President's Desk personnel matter → Army HQ personnel |
| What worked | The Tole → Šiljeg packet named both officers, explicitly labeled the successor as the historical staff recommendation, explained that no change would occur until I acted, and routed to a visible **Appoint Historical Successor** control. The same flow later worked for Petković → Praljak and Praljak → Roso, each with an exact receipt. |
| Why it felt presidential | It was a concrete appointment with historical guidance, institutional routing, a real incumbent, and durable consequences—not a stat-picker or an unexplained modal acknowledgement. |
| Screenshot or evidence path | [`screenshots/...109-officer-event-before-acknowledge.png`](evidence/20260730_session15_hrhb_80turn/screenshots/20260730_session15_hrhb_80turn_resume2-hrhb-109-officer-event-before-acknowledge.png) and [`...110-officer-event-after-acknowledge.png`](evidence/20260730_session15_hrhb_80turn/screenshots/20260730_session15_hrhb_80turn_resume2-hrhb-110-officer-event-after-acknowledge.png) |

## Presidential Feel Grade

| Field | Entry |
| --- | --- |
| Did I feel like the President? | 3 / 5 |
| One-sentence reason | Named diplomatic choices, patron pressure, Operation Jackal, and historical appointments delivered strong peaks, but forced peace counterfactuals, the 19-turn authored drought, and 12 near-identical reserve renewals prevented a sustained presidential rhythm. |
| Would I play the next 10 turns tomorrow unprompted? | No—not until the peace-continuation contract and repeat-reserve presentation are addressed; I would return specifically to test those fixes because the appointment and historical-dossier model is already compelling. |

## Bug vs. Friction Split

### Confirmed bugs

| Item | Surface | Bug or friction | Blocks play? | Follow-up owner |
| --- | --- | --- | --- | --- |
| HRHB blue fails contrast | HRHB label/date and HVO text across Desk/map surfaces measured 3.76–4.13:1; the completion gate correctly failed against the 4.5:1 target | Bug — player-facing accessibility | No for mouse play; yes for the QA completion gate | UI/UX + frontend |
| Simultaneous event identity mismatch | At turn 51, the UI recorded `hrhb_vance_owen_acceptance_1993`, while the runner asserted against the first state item, `zagreb_restrains_boban_vopp`, and stopped | Bug — QA tooling identity/order | Yes for automated diary continuation | QA harness |
| Event/reserve priority inversion | At turns 65 and 75, the runner entered reserve handling while a required event was mounted; `clearOpenSurfaces` correctly raised `required-event-decision` | Bug — QA tooling queue priority | Yes for automated diary continuation | QA harness |
| Fixed formation-counter quota | The stock HRHB opening tour required 12 exact counters but verified 5; at turn 51 even a temporary five-counter floor found only 3 as viewport availability changed | Bug — QA tooling/faction coverage assumption | Yes for stock HRHB harness run | QA harness + map test design |

Contrast evidence is in [`diagnostics/paradox-local-qa-readability-20260730_session15_hrhb_80turn_resume6.json`](evidence/20260730_session15_hrhb_80turn/diagnostics/paradox-local-qa-readability-20260730_session15_hrhb_80turn_resume6.json). Queue and counter failures are preserved as exact error files under [`run-data/`](evidence/20260730_session15_hrhb_80turn/run-data/) and [`diagnostics/`](evidence/20260730_session15_hrhb_80turn/diagnostics/).

### Friction, not bugs

| Item | Surface | Bug or friction | Blocks play? | Follow-up owner |
| --- | --- | --- | --- | --- |
| Generic peace terminal conflicts with long historical play | Diplomacy/terminal verdict | Friction/design contract | Yes for a historical 80-turn run | Product + game design |
| Nineteen intervening turns without an authored choice | Desk/Advance cadence | Friction/content cadence | No | Game design + historian |
| Twelve Vitezovi reserve renewals | Desk/Decision Room/CA | Friction; engine lifecycle is internally consistent | No | Gameplay + UI/UX |
| Historical Operation Jackal remains advisory | Staff Review/Decision Room | Friction/priority communication | No, which is the problem | Game design + UI/UX |

## Desk → Decision → Advance Loop Check

| Field | Entry |
| --- | --- |
| Did the top-3 include a new Desk → Decision → Advance friction? | Yes — all three are new HRHB loop findings |
| If no, is this the second consecutive no-new-loop-friction diary? | No / not applicable |
| If yes to second consecutive no-new-loop-friction diary | Not applicable |

## Final-State and Diagnostic Proof

- Final phase: war; player faction: HRHB; turn: exactly 80.
- All blocker counts: zero.
- Authored HRHB decision receipts: 12/12 expected for this run.
- Officer replacement receipts: 3.
- Historical proposal records: Operation Jackal accepted, resolved turn 12.
- Generic peace receipts: three forced rejections, disclosed above.
- HRHB reserve receipts: 12, all Central Bosnia/Vitezovi defensive-gap approvals.
- HRHB formations: 37 owned, 32 located/fielded; no unlocated active combat formations for any faction.
- Final control counts: HRHB 77, RBiH 266, RS 369; control-map hash `b78078c431525046149ed809ab20529a0dabf3957d80c17fb7eac8d6f43748bb`.
- Final tour visited Desk, Command Surface, Diplomacy, Intelligence, Faction, Chronicle, War Map, all four Army HQ corps, personnel/records, and the stack picker. Before/after state and autosave hashes were identical.
- Final manifest SHA-256: `86b371f8d9593059d2014ef4501e2d3ae238c7a82f921f9004d266bb83e813c8`.
- Final manifest reload recorded zero console messages, page errors, and network failures.
- This single live run supports a state-integrity and exact-receipt claim for this session only; it is not a cross-run determinism claim.

Representative final screenshots:

- [Turn-80 President's Desk](evidence/20260730_session15_hrhb_80turn/screenshots/20260730_session15_hrhb_80turn_resume6-hrhb-063-presidents-desk.png)
- [Turn-80 War Map](evidence/20260730_session15_hrhb_80turn/screenshots/20260730_session15_hrhb_80turn_resume6-hrhb-037-light-turn-80-map.png)
- [Turn-80 Decision Room](evidence/20260730_session15_hrhb_80turn/screenshots/20260730_session15_hrhb_80turn_resume6-hrhb-039-light-turn-80-decision-room.png)
- [Turn-80 Army HQ](evidence/20260730_session15_hrhb_80turn/screenshots/20260730_session15_hrhb_80turn_resume6-hrhb-040-light-turn-80-army-hq.png)
- [Full-tour completion](evidence/20260730_session15_hrhb_80turn/screenshots/20260730_session15_hrhb_80turn_resume6-hrhb-108-final-turn-80-full-tour-complete.png)

## Triage Outcome

The top three friction items become the front of the HRHB player-experience backlog. Confirmed QA and accessibility bugs should be fixed before interpreting a follow-up diary as a clean UX comparison.

| Rank | Accepted follow-up | Packet path or owner | Status |
| --- | --- | --- | --- |
| 1 | Fix HRHB counter/queue automation and the player-facing HRHB contrast defect, then rerun the exact evidence gates | QA harness + UI/UX owners | Proposed from this diary |
| 2 | Define a peace-plan endorsement/settlement continuation contract that permits an explicitly marked long-form historical test | Product + negotiation design | Proposed from this diary |
| 3 | Redesign recurring elite-loan renewals and fill the turns 17–35 HRHB authored-decision gap | Gameplay + game design + historian | Proposed from this diary |

## Findings Remediation — 2026-07-31

All confirmed bugs and all four material friction findings from this diary were addressed locally on the same dirty `main` worktree. This is a remediation record, not a replacement owner diary: the original session's `3/5` President-feel grade remains authoritative until a fresh full-length HRHB owner run.

### Bugs fixed

| Original or investigation-confirmed bug | Resolution |
| --- | --- |
| HRHB blue below the 4.5:1 text target | The primary HRHB text token now uses an audited lighter blue; the contrast regression covers that token. |
| Simultaneous event identity mismatch | Event response controls expose the mounted event id. The runner mirrors UI priority—required first, earlier fire turn, then strict ASCII id—and binds the response and receipt to that visible identity. |
| Event/reserve priority inversion | Required authored events are drained before reserve work in every runner mode. |
| Fixed HRHB counter quota | Counter proof adapts to exact formations that remain reachable after viewport/detail churn while still requiring at least one verified formation when formations exist. |
| Healthy reserve loan recalled solely at twelve turns | The non-canonical elapsed-turn recall was removed. Active, healthy, operation-needed loans now continue until the operation ends, the brigade becomes unfit, the target corps disappears, or the President recalls it. |
| Historical HRHB Cutileiro acceptance ended the war at turn one | A documented player response now normalizes all Cutileiro delegations to the documented pre-war outcome—RBiH rejected; RS and HRHB accepted—so historical HRHB acceptance is not misread as unanimous peace. Counterfactual player responses and later plans remain emergent. |

### Friction and polish resolved

| Original friction | Resolution |
| --- | --- |
| Nineteen-turn authored-choice drought after turn 16 | Two sourced, calibration-inert 1992 HRHB decisions now arrive at turns 26 and 29: Posavina/Orašje posture and joint defence of Jajce. Historical defaults are `hold_orasje_bridgehead` and `maintain_joint_defense`. The new maximum interval in this portion of the campaign is ten turns, not nineteen. The material is drawn from *Balkan Battlegrounds* Vol. I pp. 181–184; Neretva and Grabovica/Uzdol were deliberately excluded because they belong to 1993. |
| Repeated Vitezovi releases lacked memory | Repeat dossiers show prior approvals for the same brigade/corps, cumulative Authority committed, and the latest recall reason when one exists. |
| Operation Jackal was advisory | Every unresolved `HISTORICAL_OP:` authorization is now a signature-required blocker before advance, with explicit authorize/withhold copy and an Army HQ source handoff. It counts and deep-links under War Direction; ordinary staff proposals remain advisory under Command & Personnel. |
| Historical QA runs could invent ordinary proposal decisions | Non-strategic historical runs select tagged historical authorizations only. Ordinary proposals remain untouched unless the run explicitly enables strategic proposal play. |

### Remediation verification

- Focused regression: 13 files / 348 tests passed.
- Player journeys: 44 files / 766 tests passed.
- TypeScript, map build (1,341 modules), simulation build, War Room build (659 modules), harness syntax, and diff integrity passed.
- Canon determinism static scan passed. The approved `apr1992_52w` baseline was not overwritten; the two intentional events produce the recorded `activity_summary.json` mismatch.
- A clean unpackaged Electron HRHB run reached exact turn 32. Cutileiro was accepted without a turn-one verdict; Operation Jackal was signed and resolved at turn 8; repeat Vitezovi decisions were exercised at turns 11 and 23; the new historical responses were recorded at turns 26 and 29; the turn-32 checkpoint had zero blockers.
- The run also exposed two QA-driver integration gaps introduced by the stronger gate: the historical signature had to route through War Direction, and the final stack-detail close needed a bounded exact UI click. Both now have regressions. A focused Electron smoke subsequently completed the full final-state tour with unchanged before/after state and autosave hashes and zero console, page, network, or main-process stderr errors. Its overall harness result remained red only because the readability classifier flagged intentional peace-modal and map-legend overlap.
- The broad `npm test` fast slice remains incomplete rather than green: two attempts exceeded the 5-minute and 10-minute command ceilings, with no captured assertion failure.
- The original repository autosave was restored byte-for-byte after every Electron attempt: SHA-256 `df5fcc3d43d86dc231a55659c98a5628774634a33759586dcdf95f5cf3cf1084`.

Machine-readable evidence and exact screenshot paths are recorded in [`findings-remediation-20260731.json`](evidence/20260730_session15_hrhb_80turn/findings-remediation-20260731.json).
