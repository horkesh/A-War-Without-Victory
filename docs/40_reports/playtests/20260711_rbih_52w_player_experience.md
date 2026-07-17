# RBiH 52-Week Desktop Campaign Player-Experience Review - 2026-07-11

Local-only review. No staging, commits, pushes, PRs, installer work, or release tagging.

> **Post-remediation status, 2026-07-12:** This report is preserved as the historical pre-remediation NO-GO and defect source. The agent-actionable local remediation result is now **PASS on the fresh `rbih-52w-remediation-final-v47` run**; see [20260712_rbih_52w_remediation_replay.md](20260712_rbih_52w_remediation_replay.md). That replay reached exact turn/max 52 with 334 screenshots, zero runtime diagnostics or unresolved required blockers, no unlocated active combat formations, and live proof of recruitment, Assisted autonomy, two Command Authority actions, exact counter/stack selection, explicit category-filter state, and all major routes. All 42 contact sheets were manually inspected. D2 owner play, packaging, release, commit, and push remain open or out of scope.

## Executive Verdict

**D2 / release verdict: NO-GO.** The simulation can carry an RBiH campaign through a coherent first year, but the current desktop product cannot complete that campaign without a runtime intervention. It also does not give the player a reliable strategic decision loop: recruitment and autonomy are unreachable, recruitment rejects every catalog entry when exercised through IPC, presidential actions are not proven durable across reload, and the official command surfaces disagree about operations and campaign history.

The strongest part of the product is the underlying war-state presentation. The map is information-rich, the historical event sequence is recognizable, staff operations produce battlefield activity, and the eastern enclaves survive the year in this run. The weakest part is the presidential game around that simulation. Too much of the experience is advancing, dismissing, and reading while the levers that should create agency are absent, hidden, or too weakly surfaced.

Presidential feel: **2 / 5**. I would continue for QA, but not yet for pleasure.

## Session And Method

| Field | Entry |
| --- | --- |
| Operator | Codex with QA, UI/UX, game-design, history/scenario, modern-wargame, and product-architecture review |
| Workspace | Local dirty workspace; not a release commit |
| Package version | `0.9.9-beta.1` |
| Faction | RBiH |
| Scenario | `apr1992_definitive_52w` |
| Start | 6 Apr 1992 / turn 0 |
| End | 5 Apr 1993 / exact turn 52 |
| Player policy | Level 1, historical event choices, standing paramilitary denial, staff proposals accepted where available |
| Campaign evidence | 601 screenshots through turn 40 plus 60 continuation screenshots through turn 52 |
| Comparator | Fresh deterministic 52-week headless scenario run |

This was an assisted UI playthrough, not a claim of unassisted human play. The harness exercised the real Electron renderer and IPC surfaces, selected historical RBiH decisions, attempted recruitment, reviewed command surfaces, advanced exact turns, and saved state. Every contact sheet was then manually inspected. An exact-selector probe separately verified Army HQ tabs and Chronicle so broad-selector harness artifacts were not promoted as product bugs.

## Primary Evidence

- Weeks 0-40 player log: `tmp-paradox-qa-20260710/paradox-local-qa-rbih-52w-assisted-strategic-v4.json`
- Weeks 40-52 continuation log: `tmp-paradox-qa-20260710/paradox-local-qa-rbih-52w-assisted-strategic-v10-continuation.json`
- Exact Army HQ / Chronicle probe: `tmp-paradox-qa-20260710/rbih-52w-exact-ui-probe.json`
- Exact peace-plan IPC failure: `tmp-paradox-qa-20260710/paradox-local-qa-live-events-rbih-52w-assisted-strategic-v9-continuation.json`
- Contact sheets: `tmp-paradox-qa-20260710/contact-sheets/rbih-52w-v4-v10/`
- Final save: `saves/autosave.json`
- Headless comparator: `tmp-paradox-qa-20260710/headless-rbih-52w/apr1992_definitive_52w__52732e7dcc229a04__w52_n0/`

The primary run reached turn 40 and remained there for 80 handling attempts. A temporary local runtime bridge was used only to diagnose and pass the broken peace-plan IPC boundary; the bridge was removed after the continuation reached exact turn 52. The production defect therefore remains open and reproducible.

## What Worked

1. **The year has a recognizable historical spine.** The state-identity decision, RBiH paramilitary policy, London Conference, minority-officer retention, Vance-Owen pressure, enclave events, no-fly-zone context, and RBiH-HRHB escalation occur in plausible order.
2. **The territorial simulation remains legible and historically close.** Control, casualties, fronts, displacement, alliance state, and pressure visibly change. The final player control split `247 / 382 / 83` is very close to the painted January 1993 target `247 / 385 / 80`. Sarajevo, Tuzla, Zenica, Bihac, Gorazde, Srebrenica, Zepa, Sapna, and Teocak remained represented in RBiH-held space at the end of the run.
3. **The map has formation data.** At turn 0 all 78 located RBiH formation IDs were present in the map DOM. At turn 52 all 118 located RBiH formation IDs were present. The earlier impression of empty regions is primarily counter stacking and interaction ambiguity, not missing formation state.
4. **Staff operations eventually create combat.** Accepted proposals lead to operations and battlefield consequences. The final raw state contains 13 operation-history records.
5. **The major archival surfaces are individually substantial.** Army HQ tabs work with exact selectors, and Chronicle exposes 441 events, 191 headlines, 13 chapters, and functional category filtering.
6. **The Command Surface taxonomy is strong.** Situation, command, memory, and advance sensitivity provide a promising information hierarchy when the surfaces are not stacked or contradictory.
7. **The continuation was technically stable after the diagnostic bridge.** It reached exact turn 52 with zero console messages and no turn overrun. The recorded request failures were aborted local asset/navigation requests, not simulation failures.

## Release Blockers

### P0-01: Vance-Owen Hard-Blocks The Campaign

At turn 39/40 the player receives three overlapping representations of substantially the same diplomatic moment:

1. International pressure to engage with Vance-Owen.
2. The historical event decision to accept the Vance-Owen Plan.
3. A separate mandatory peace-plan modal with Accept, Review Later, and Reject.

The third modal never resolves in the shipped desktop boundary. Its button dismisses optimistically, then the modal returns and prevents all map, Army HQ, Decision Room, and advance interaction. The IPC handler in `src/desktop/electron-main.cjs` directly requires a TypeScript-source-relative module that is not available from the Electron main-process runtime.

This is also a family-level release risk. Counter-offer, Dayton, event-notification, order-interpretation, and AI-advisor handlers use similar direct `.js` source-module requires whose deployed targets need explicit verification. They were not all exercised by this campaign and are risks, not yet confirmed failures.

Acceptance gate:

- Accept and reject both resolve on the first click through packaged Electron.
- The choice persists through save/reload, files one receipt, clears all matching blockers, and permits the next turn.
- Only one Vance-Owen decision surface owns the choice. Pressure and event context should feed that dossier rather than ask for duplicate decisions.
- A build-time/runtime contract rejects every Electron main-process import whose deployed target is absent, and integration tests exercise each negotiation/advisor handler through real Electron.
- A fresh RBiH campaign reaches exact turn 52 without source edits, runtime bridges, state editing, or harness-only IPC calls.

### P0-02: Recruitment And Autonomy Are Not Player Systems

`openRecruitmentModal` exists in `src/ui/map/App.tsx` but has no caller. `AutonomyPanel` exists but is not mounted by the application. The recruitment IPC smoke attempted all 126 catalog entries: 78 were already recruited, 42 failed `no_control`, and 6 failed `no_manpower`; none succeeded.

The turn phase converts OSID-keyed political control to municipality control before recruitment. `applyPlayerRecruitment` does not share that conversion and calls the recruitment resolver with an incomplete location/control mapping. Even a newly exposed button would therefore remain unreliable.

Acceptance gate:

- Recruitment and autonomy have discoverable entry points in the presidential/Army HQ loop.
- The catalog shows only eligible formations by default and provides a specific, truthful reason for every ineligible row.
- Desktop recruitment uses the same canonical OSID-to-municipality/control projection as the turn phase.
- At least one valid fresh-campaign recruitment succeeds, changes manpower/equipment/formation state, appears on the map, and survives save/reload.
- Autonomy changes persist, clearly state what the player delegates, and have visible consequences in the next-turn briefing.

### P0-03: Official Records Contradict The Live War

At turn 52:

- Summary says 3 active operations.
- Briefing says 0 executing operations.
- Raw state has 13 operation-history rows.
- Records says 0 completed AARs and 0 operation history.
- Records describes a quiet archive while Chronicle contains 441 events and 191 headlines.
- Chronicle reports 0 personnel events despite populated officer, vacancy, visit, loyalty, and reserve-officer systems.
- RBiH metrics report 75 operations launched, but none of the 13 raw archive rows belong to RBiH.
- `Operation Prijedor` is filed as a failure with four captured objectives, while the visible AAR reports zero attacks and a five-star brilliant victory.
- The casualty ledger totals 66,787 RBiH killed, wounded, and missing, while Summary shows `Friendly casualties 29k` without a period or definition.
- The map/briefing evidence reports collapsed sustainment, while Summary exposes only `0 critical / 0 strained` and omits the collapsed class.

Different filters can legitimately produce different counts, but the UI does not define those filters and some empty-state copy is plainly false. This breaks player trust in the archive and makes it impossible to learn why the campaign developed as it did.

Acceptance gate:

- Summary, Briefing, Records, and Chronicle consume a shared, tested operation projection.
- Counts are labelled by phase: proposed, planning, executing, recovery, completed, and archived.
- Every raw operation-history row has a visible archive representation or an explicit documented exclusion reason.
- Empty/quiet copy appears only when the defined filtered collection is empty.
- A fixture with 3 active operations, 13 history rows, and personnel activity reconciles across every surface.
- Every displayed metric has a stable metric ID, time period, denominator, and player-facing definition.

### P0-04: Presidential Actions Are Not Reliably Durable

The v4 in-memory endpoint records `PROP_40_ops_0` accepted and resolved. The continuation loads the week-40 autosave with the same proposal unresolved. During turns 40-52, unresolved proposals can be replaced by a later turn's proposal without an approve, decline, defer, or expiry receipt. This may be autosave timing rather than serializer corruption, but the player-visible result is the same: a decision can disappear or be undone after restart.

Acceptance gate:

- Every mutating presidential action persists immediately or visibly marks the campaign dirty and requires a save before exit.
- Terminate/reload tests cover all five Command Authority levers, proposal dispositions, event decisions, peace decisions, recruitment, and autonomy.
- No proposal disappears without approve, decline, explicit defer, or expiry receipts.
- Required work blocks advance; advisory work exposes its deadline and consequence without pretending to be required.
- An uninterrupted run and a turn-40 save/resume run with the same decision transcript produce the same canonical turn-52 hash.

## High-Priority Player-Experience Findings

| ID | Finding | Impact | Required change |
| --- | --- | --- | --- |
| P1-01 | The first meaningful staff operation proposal does not arrive until turn 17; RBiH has no authored first-year operational arc. | The first third of the campaign feels watched rather than led. | Add an early RBiH staff-planning arc with at least one defensible strategic choice, a clear objective, forces, commander, risks, expected benefit, and aftermath. |
| P1-02 | Command Authority ends at 100 with lifetime spent 0 despite a full campaign. | The headline strategic currency does not participate in ordinary play. | Put one or more recurring, valuable decisions on the normal path, teach their costs, and report prevented/created outcomes. |
| P1-03 | Shells and overlays stack. Briefing, advance blockers, map panels, Intelligence/Faction surfaces, and Decision Room can coexist. | Actions target the wrong surface and the map becomes background decoration. | Enforce one blocking owner and one major shell; suspend or close incompatible surfaces and restore the previous context on exit. |
| P1-04 | Essential text is too small and frequently clipped. Every one of 601 primary screenshots contained sub-10px text; automated diagnostics flagged clipping in 382. | Briefings and evidence cannot be read reliably at normal scale. | Use 12px minimum for essential text, 10px for secondary metadata, opaque/contrast-safe reading surfaces, and zero essential clipping at target viewports. |
| P1-05 | Decision Room has nested scrolling; some event/authorization actions sit below the fold. | Required actions are discoverability tests. | Give the surface one scroll owner and sticky action controls; never require an inner-scroll hunt to advance. |
| P1-06 | Counter stacks have no legend or member picker, and a clicked counter can open another unit in the stack. | Formations appear absent and player intent is violated. | Add stack badges, deterministic stack expansion/member selection, exact click-to-formation identity, and a counter-symbol/status legend. |
| P1-07 | Takeover timers grow from 14 to 974 by turn 5 and end at 621. | A mechanically real pairwise count reads like hundreds of emergencies and crowds out priorities. | Aggregate by threatened municipality/front, show the top actionable threats, and move raw pair counts to drilldown. |
| P1-08 | Command priority is incoherent. Turn 5 shows 35 critical sustainment failures and no operations while the briefing foregrounds low cohesion and Inbox can say no orders are waiting. | The game reports crisis without telling the player what can be done. | Rank briefings by actionable consequence, route each critical condition to a real lever, and explicitly state when no intervention exists. |
| P1-09 | Proposal copy is inconsistent and optional proposals are easy to miss. | The main source of player military agency looks like low-priority paperwork. | Standardize dossier fields and give expiring, strategically material proposals a distinct notification and deadline. |
| P1-10 | Reserve requests state only offensive/defensive support. | The choice lacks force, benefit, opportunity cost, and consequence. | Name the requesting command, recipient sector, candidate force, readiness, travel time, expected effect, and what becomes uncovered. |
| P1-11 | Four active generated RBiH brigades have no map location at turn 52. | Combat strength exists outside the spatial war and cannot be inspected or threatened. | Require every active non-HQ formation to have a valid OSID; quarantine or fail invalid spawns before they affect manpower and combat totals. |
| P1-12 | `181,272` personnel is presented alongside active-brigade strength without separating maneuver, local-defense, reserve, and unarmed manpower. | The force appears overmobilized and more combat-effective than the calibrated `110-130k` band. | Split mobilized total from combat-effective field strength and explain each category in Summary and Personnel. |
| P1-13 | No surface connects RBiH objectives, current plan, presidential choice, and changed outcome. | The player sees losses and activity but cannot explain whether their strategy worked. | Show 2-4 faction objectives with status, trend, responsible command, current commitment, next lever, and an annual verdict against historical/feasible alternatives. |
| P1-14 | Inbox, Decision Room, Records, Chronicle, and Codex overlap without stable ownership. | The same concern can look like several tasks, while real tasks can disappear between surfaces. | Give every actionable item one canonical owner and stable ID; all other surfaces link to it and share its disposition. |

## Secondary Findings

- Intelligence and Faction surfaces use translucent layers over bright imagery; body text can become unreadable.
- The persistent Command Briefing can cover roughly two-fifths of the tactical map and repeatedly returns as inspection begins.
- A horizontal page scrollbar appears on the map and Army HQ.
- There is no clear distinction between Records and Chronicle. One should be the authoritative operational ledger; the other should be the narrative campaign history.
- RBiH starts with 78 located formations and mature corps structures, which conflicts with a player-facing TO-to-brigade formation narrative unless explicitly framed as scenario abstraction.
- RBiH has no patron, but a top-level diplomacy route still implies a system the faction can meaningfully operate.
- Launch copy says `Pre-Alpha - War phase` while the package identifies as `0.9.9-beta.1`.
- Army HQ reports 122 active brigades while raw state has 128 RBiH formations and 118 located formations. These may be valid categories, but the definitions are absent.
- Personnel supply reserve displays `Unreported` despite extensive readiness and manpower reporting elsewhere.

## Campaign Trajectory

| Turn | RBiH control | Located RBiH formations | RBiH casualties K/W/M | Player-facing condition |
| ---: | ---: | ---: | ---: | --- |
| 0 | 319 | 78 | 0 / 0 / 0 | Foundational decision; first-turn overload |
| 1 | 311 | 78 | 490 / 1,797 / 115 | Immediate territorial and casualty shock |
| 5 | 261 | 81 | 1,311 / 5,110 / 489 | 35 collapsed sustainment areas, 0 operations, 974 takeover timers |
| 10 | 245 | 85 | 1,773 / 7,144 / 889 | 38 collapsed sustainment areas, still 0 operations |
| 20 | 239 | 95 | 3,698 / 14,849 / 1,900 | Staff-proposal agency has only recently appeared |
| 30 | 240 | 102 | 6,526 / 25,862 / 3,107 | 1 active operation; command-surface overload |
| 40 | 246 | 112 | 8,727 / 34,941 / 4,397 | Vance-Owen hard block |
| 52 | 247 | 118 | 12,191 / 48,565 / 6,031 | 3 active operations reported; archive contradictions |

The campaign stabilizes territorially after the opening collapse, but it does not communicate a strong causal link between presidential choices and that stabilization. The player mostly observes institutional and staff behavior, then approves occasional proposals.

## Calibration Comparison

| Metric at turn 52 | Player Electron run | Headless historical run | Difference |
| --- | ---: | ---: | ---: |
| RBiH control | 247 | 259 | -12 |
| RS control | 382 | 367 | +15 |
| HRHB control | 83 | 86 | -3 |
| RBiH personnel | 181,272 | 183,079 | -1,807 |
| RBiH killed | 12,191 | 13,835 | -1,644 |
| RBiH wounded | 48,565 | 54,866 | -6,301 |
| RBiH formations / located | 128 / 118 | 129 / 116 | -1 / +2 |
| Raw operation-history rows | 13 | 13 | 0 |
| Hostile takeover timers | 621 | 603 | +18 |
| Event decisions | 19 | 20 | -1 |

The runs match on 687 of 712 OSIDs (`96.49%`). The remaining difference is deterministic player-surface policy divergence, not evidence of nondeterminism. `meta.player_faction` removes RBiH from bot order generation, player staff proposals and deferred policies follow another path, and the headless runner does not resolve the separate negotiation subsystem into `peace_history`.

The headless result is not a clean gold player target. It passed 6/6 bot benchmarks but only 28/30 anchors, lost Zepa to RS despite the year-one enclave-survival requirement, reported critical disconnected-sector anomalies and invalid operations, placed one formation in enemy territory, and retained provisional RS brigade assignments. Its run summary marks combat calibration invalid. Use it as a corridor and event/anchor comparator, not a byte-equality oracle.

## Actionable Remediation Plan

### Packet A: Restore Campaign Completion - P0

Owner: Desktop/platform + gameplay + UI/UX.

1. Move peace-plan resolution behind the built desktop simulation export boundary.
2. Audit every Electron main-process source-relative runtime require and route it through a built/deployed boundary.
3. Collapse duplicate Vance-Owen decisions into one authoritative dossier and one receipt.
4. Add accept/reject/save-reload/advance Electron integration coverage.
5. Stop gate: fresh RBiH exact-52 packaged run without intervention.

### Packet B: Restore Player Agency - P0

Owner: Gameplay + formation + UI/UX + game design.

1. Mount autonomy and recruitment in the normal command loop.
2. Share canonical OSID/municipality/control conversion between turn phase and desktop IPC.
3. Replace the full raw OOB catalog with eligible-first rows and truthful failure reasons.
4. Add an early RBiH operational-planning choice and make Command Authority relevant before turn 10.
5. Add a compact strategy-to-outcome view for RBiH survival, territorial, institutional, and diplomatic objectives.
6. Stop gate: a new player can recruit, change autonomy, commission or approve an operation, and identify each consequence without external instructions.

### Packet C: Establish One Campaign Truth - P0

Owner: Technical architecture + UI data adapters + QA.

1. Define canonical operation lifecycle and archival projections.
2. Generate outcome, captures, verdict, rating, and AAR prose from the same battle receipts so contradictory combinations are impossible.
3. Reconcile Briefing, Summary, Records, Chronicle, Inbox, and Decision Room counts, including generated player operations.
4. Define Records as authoritative ledger and Chronicle as narrative synthesis, with explicit cross-links.
5. Give every actionable item one stable identity and canonical owner across Inbox, Decision Room, Army HQ, Records, and Chronicle.
6. Stop gate: seeded and live-state consistency tests show no contradictory counts, missing player operations, duplicate unresolved items, or false quiet states.

### Packet D: Rebuild Surface Ownership And Readability - P1

Owner: UI/UX + frontend + accessibility QA.

1. Enforce shell/modal exclusivity and a single scroll owner.
2. Make required actions sticky and immediately visible.
3. Remove essential sub-10px text, correct contrast, clipping, and horizontal overflow.
4. Add responsive proof at 1366x768, 1920x1080, and 2560x1440, plus 125% OS scale.
5. Stop gate: zero essential clipping, no obscured primary action, and no incompatible surface stack in automated and manual screenshot review.

### Packet E: Make The War Map Inspectable - P1

Owner: Graphics/map + UI/UX.

1. Add a formation-counter legend and stack-count semantics.
2. Add deterministic stack expansion and exact member selection.
3. Preserve camera and selected formation through shell handoffs.
4. Aggregate takeover timers and crisis alerts into strategic objects.
5. Stop gate: every located formation is discoverable in at most two actions, and clicked identity always matches opened identity.

### Packet F: Improve The First-Year RBiH Game - P1/P2

Owner: Game design + historian + scenario + product management.

1. Reconcile the mature opening OOB with the intended formation narrative.
2. Give RBiH a historically bounded early operational agenda without scripting guaranteed success.
3. Improve 3rd/4th Corps defensive monotony and make the RBiH-HRHB escalation legible.
4. Separate mobilized, local-defense, reserve, unarmed, and combat-effective manpower while preserving historically credible totals.
5. Connect East Mostar and enclave events to mechanics and command decisions, not only prose.
6. Stop gate: a blind first-time player can state their top three strategic problems, available interventions, and observed consequences at turns 1, 5, 10, and 20.

## Required Regression Gates

1. Packaged Electron fresh-campaign RBiH runs to exact turn 52 with no failed mandatory action and no unresolved required blocker.
2. Build/runtime import validation and live Electron probes cover every main-process IPC dependency; peace-plan accept and reject work on first click and through save/reload.
3. Recruitment and autonomy are reachable and produce state-changing receipts.
4. All located RBiH formation IDs are present and individually discoverable at turns 0, 10, 20, 40, and 52.
5. Cross-surface operation and archive counts reconcile against raw state.
6. No essential text below 12px, no essential clipping, WCAG AA contrast, and no horizontal page overflow at target viewports.
7. One blocking modal and one major shell maximum; keyboard focus remains in the owner surface.
8. The first 20 turns contain a visible player military decision with explicit objective, forces, commander, cost, risk, and result.
9. Player and headless runs remain inside approved territorial, force, casualty, enclave, event, and operation corridors; divergence is attributed rather than silently accepted.
10. Manual screenshot review covers every distinct surface state, not only automated selector assertions.
11. Every active non-HQ formation has a valid map location, and every operation outcome/rating is derivable from its combat receipts.
12. Every mutating action survives immediate terminate/reload; a proposal cannot be orphaned or silently replaced.
13. Screenshot proof checks pixel/hash change after tab or route selection, in addition to DOM selection and text assertions.

## QA Corrections And Limitations

- The broad-selector tour appeared to show all Army HQ tabs rendering Summary. The exact-selector probe proved Briefing, Summary, Records, and Personnel tabs work. This is a harness false positive and is not a product finding.
- Counter DOM presence proves the formation has a rendered counter identity, not that a player can visually distinguish it inside a dense stack. The report therefore classifies the map issue as discoverability/stack interaction, not missing formation data.
- The continuation depended on a diagnostic runtime bridge. All post-turn-40 simulation observations are valid for the saved campaign, but normal product completion is not.
- The turn-40 continuation loaded the autosave rather than the v4 process's final in-memory state. That qualifies the exact root cause of the reverted proposal, but does not make the player-visible durability failure acceptable.
- The v4 harness wrote a normal completed artifact after stopping at turn 40. Future harness runs must hard-fail unless `finalTurn === targetTurn`; process exit and zero console messages are insufficient.
- Renderer console capture did not include `pageerror`, main-process exceptions returned as `{ok:false}`, or failed IPC responses. Future gates must capture all three.
- The player and headless paths matched 687/712 OSIDs, but the headless run was itself invalid for combat calibration. It is supporting diagnostic evidence only.
- The run used historical choices and staff-assisted proposal acceptance. It does not establish that every alternate branch works.

## Final Priority

**Repair the player decision spine before balance or polish:** campaign-completing peace decisions, reachable recruitment/autonomy, and one consistent operation/archive truth. Until those three are complete, another full-campaign playtest will mostly re-measure known failure rather than validate a playable strategy game.
