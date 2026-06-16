# Pyrrhic UI and Soul Systems Execution Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` when implementing this plan. Keep packaging out of scope unless the owner explicitly reopens installer work.

## Goal

Make the current game playable for a serious D2-style campaign pass by fixing the player-facing command spine and verifying that the listed soul-system priorities are truly closed on current `main`.

This is not a packaging plan. The package build is paused until the live browser flow is coherent.

## 2026-06-16 Landing Status

Phases 1-3 have shipped through the 2026-06-16 player-polish waves and follow-up branches: Presidential Inbox/desk routing, first-turn blocker layering, foundational-decision exposure, browser fallback parity, DeckGL overlay hardening, stale selection cleanup, replay sidecar hydration, Army HQ readiness legibility, turn-0 impossible control/combat/casualty suppression, and the `qa:player-journeys` gate. The current first-hour contract is stricter than the original Phase 2 wording: faction start -> war-start briefing -> President's Desk opening brief -> foundational decision -> command map/tutorial.

Remaining active polish work is Phase 4+ plus follow-up defects from the Pyrrhic sweep. The first supply/enclave truth leak is addressed by the 2026-06-16 player-safe enclave/supply branch: player campaigns scope enclave resilience, enclave map overlays, and supply summaries to the loaded faction, while null-player diagnostics keep all-faction rows. The follow-up selection/raw-ID branch closes stale standalone-brigade parent context plus request-operation/Corps-front objective raw-ID copy. The operation/plan-id copy branch closes Back-the-Officer TG cards, operation proposal cards, and proactive force-launch ready-plan cards so raw plan/op ids stay internal. The Codex/Chronicle safe-label branch closes Distance from History, Dilemma Spine, consequence receipt, and Chronicle Wrapped response/consequence-id fallbacks. The UI-copy fallback branch closes command planning, Chief of Staff prose, Warroom hotspot title, and autonomy value slug fallbacks. The first GitHub comment-sweep branch closes Verdict faction-tab badge scoping and refugee surge prior-week truth. Still-active follow-ups: mobile policy, issue #170 engine/cache triage, and remaining GitHub comment/PR sweeps. Packaging remains paused until the owner accepts the live command-map/warroom/Army HQ experience.

## Current Truth

The pasted Phase 3 priority list is partly stale against current `main`.

| Finding | Current repo evidence | Plan treatment |
| --- | --- | --- |
| SRK strangle default-on | `COMMAND_BOARD.md`, `CALIBRATION_MASTER.md`, and `PROJECT_LEDGER.md` record it as shipped: default-on, 658 floor, anchors 30/30, Section 6 intact, engine-health required. | Verify-only guard. Do not reopen unless a fresh test contradicts the ledger. |
| HRHB Jul-Sep 1992 decision events | Ledger records `war_1992_hrhb_summer.json` loaded and re-blessed through golden baselines. | Verify registry/UI surfacing only. Do not re-author content unless missing in live flow. |
| Owner-gate language strip | `CLAUDE.md` and `docs/10_canon/FORAWWV.md` use Pyrrhic-panel sign-off language. `COMMAND_BOARD.md` says the residual live context strip shipped. | Governance grep audit only. Historical backups can stay historical unless they are still read by agents. |
| Warroom convoy/patron art + i18n | Activity art is present and tests reference `act_patron_relations` and `act_convoy`. The older "Car 4" label may conflate activity-art i18n with the separate `EventDecisionModal` effect vocabulary lane. | Audit split: verify art renders; separately inspect whether `EventDecisionModal` effect grammar is still hardcoded. |
| RS Six Strategic Goals skeleton | `rs_strategic_goals` is wired as the RS foundational decision, and guard tests exist. Browser ledger says new campaign shows "The Assembly Speaks". | Treat content as closed; fix first-turn choreography so the player understands it. |

## Canonical Product Rule

Presidential decisions belong to the Presidential Desk / Decision Room. Army HQ belongs to military staff detail, corps dossiers, operation preparation, and supporting evidence. The tactical map is the spatial record and selection surface, not the owner of presidential decisions.

Demoted path: Army HQ as the catch-all target for inbox, opening brief, and presidential actions.

## Pyrrhic Team

- Orchestrator: owns sequencing, stop gates, and board reconciliation.
- Product Manager / War-or-Game: owns player-authorship priority and D2 acceptance.
- Technical Architect: owns shell boundaries and route ownership.
- UI/UX Developer: owns Presidential Desk, Army HQ, sidebar, settlement focus, and mobile policy.
- Graphics Programmer + Map Geometry Integrity Reviewer: own DeckGL overlay failures.
- Historian + Narrative Designer + Canon Section 6 Reviewer: re-open content only if verification disproves shipped state.
- QA Engineer + Determinism Auditor + Scenario Tester: own browser smoke, route tests, and calibration gates.
- Documentation Specialist + Process QA: own board/docs updates and stale governance cleanup.

## Work Order

### Phase 0 - Reconcile and Lock Scope

1. Run focused grep/tests proving the five pasted soul-system findings are closed or still open.
2. Update `COMMAND_BOARD.md` only if the live evidence contradicts the current status.
3. Record a short verification note in the ledger or report folder.

Done means: no implementation starts from stale assumptions; packaging remains out of scope.

### Phase 1 - Presidential Command Spine P0

Fix the route ownership bug found in the live UI sweep.

1. Change `PresidentialInbox` and opening-brief actions so "Open desk" routes to Presidential Desk / Decision Room, not Army HQ briefing.
2. Audit `decisionSurfaceRegistry` for Army-HQ-owned classifications that are actually presidential.
3. Remove or demote `PresidentialDecisionRoomPanel` inside Army HQ; Army HQ may show a read-only staff handoff, not issue the same presidential directives.
4. Make action language exact: "Open Desk", "Open Decision Room", "Call Army HQ", and "Open Records" must each have one route.

Tests: route-unit tests, focused UI tests for inbox/opening brief, browser smoke from a real RS new campaign.

### Phase 2 - First-Turn Choreography P0

Make campaign start feel authored instead of stacked.

1. Establish the sequence: war-start splash -> President's Desk opening brief -> foundational decision -> command map / optional contextual tutorial.
2. Hide or defer left/right command panels while a blocking presidential modal is active.
3. Ensure RS starts with "The Assembly Speaks", RBiH with its state-identity decision, and HRHB with its political-goal decision.
4. Add a browser test that clicks through the whole sequence and fails on competing overlays.

Done means: the player is exposed to foundational decisions, but in a deliberate order.

### Phase 3 - Tactical Map Rendering Health P0

Fix the DeckGL failures from the live sweep.

1. Inspect `buildOsidDamageOverlay` and `buildForceQualityOverlay` data shape and coordinates.
2. Filter invalid polygons deterministically or fix the producer.
3. Add a browser smoke guard that fails on DeckGL initialization errors for loaded map modes.

Done means: no repeated `SolidPolygonLayer` assertion errors in desktop browser smoke.

### Phase 4 - Army HQ and Command Sidebar P1

Make Army HQ useful as Army HQ.

1. Reduce the Briefing tab to staff summary, corps readiness, current operations, and military records handoffs.
2. Move "what should I do" and priority-lane decision cards to Presidential Desk / Decision Room.
3. Replace the 69-sector dump with grouped priority filters and a top-five default.
4. Collapse or dim the OOB/source list when a sector, operation, or settlement detail rail opens.

Tests: focused Army HQ tests, accessibility checks for duplicate names, browser screenshots at 1440x920.

### Phase 5 - Warroom Dev Bridge and Art/i18n Audit P1/P2

1. Replace cross-origin iframe document injection with `postMessage` or serve the dev parent/map under one origin.
2. Decode `%20` paths in Warroom dev static middleware so `game start.webp` resolves.
3. Verify `act_convoy` and `act_patron_relations` render in `DirectiveCard` for all factions.
4. Separately audit `EventDecisionModal` effect/dimension vocabulary. If still hardcoded, schedule the real i18n Car 4 migration with EN-key tests only; BCS remains owner-native.

Done means: Warroom parent-to-map flow is browser-verifiable and no shipped activity art is invisible.

### Phase 6 - Mobile Policy P1

Decide, then implement one policy.

1. If mobile is not supported for 1.0, add a minimum-width gate with a clear desktop requirement.
2. If mobile is supported, build a real mobile shell: compact nav, full-screen Army HQ route, one active detail surface at a time.

Done means: the current broken 390px layout is no longer presented as usable.

### Phase 7 - Content Regression Sweep

Run this after the UI shell is stable.

1. Verify SRK strangle visibility still works in Situation/Chronicle surfaces.
2. Verify HRHB summer decisions appear in registry, Codex/dilemma spine, and authored-choice records.
3. Verify RS Six Strategic Goals remains Section 6-safe and first-turn visible.
4. Run the appropriate focused tests, then `tsc`, UI suite subset, browser smoke, and only calibration gates for sim/content-touching changes.

Do not author new HRHB/RS/SRK content unless this sweep proves the shipped data is missing or unreachable.

## Stop Gates

- Stop if a UI change touches sim state, scenario data, or baselines unexpectedly.
- Stop if Section 6-sensitive content is reopened without Historian + Canon + Red-team review.
- Stop if browser smoke cannot prove the first-turn flow.
- Stop if any route still sends a presidential decision into Army HQ as the primary action surface.

## Immediate Next Implementation Batch

Start with Phase 1 and Phase 2 together: Presidential Inbox route ownership plus first-turn choreography. They explain the user's current frustration and unblock meaningful live playtesting. DeckGL rendering health follows immediately because it affects map reliability during every test pass.
