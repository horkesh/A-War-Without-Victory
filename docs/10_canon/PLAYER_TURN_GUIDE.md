# Player Turn Guide

**Status:** Derived player canon guide, v0.9.x support document
**Date:** 2026-05-17
**Authority:** Below Rulebook_v0_9_0.md; derived from Phase_Specifications_v0_9_0.md, Systems_Manual_v0_9_0.md, Engine_Invariants_v0_9_0.md, and the pipeline step literals in src/sim/turn_phases/.

This guide explains what a player sees during a turn, what the player may decide, and what the engine resolves automatically. It does not add mechanics, UI surfaces, phase order, state fields, or tactical levers.

Canon hierarchy for this guide: Engine Invariants > Phase Specifications > Systems Manual > Rulebook > this guide.

## 1. Turn Contract

One game turn equals one week. The player commands through the Army, Corps, and Sector command chain; brigades are physical formations, not independent player attack pieces. The player influences operations, logistics, political authority, and diplomacy through existing command surfaces, while the engine resolves battle, movement, control, displacement, attrition, recruitment, negotiation pressure, and verdict state deterministically.

The shipped player loop is:

1. Read the Decision Room heartbeat: Brief -> Inspect -> Decide -> Execute -> Report -> Cost -> Judge -> Next.
2. Scan Command Loop lanes: Urgent, Decisions, Fronts, Inspect, Advance.
3. Follow priority lenses, source handoffs, and the active priority dossier to the existing owning surface.
4. Use valid tactical levers only.
5. Review the pre-advance command review rows before advancing the week.
6. Inspect Turn Aftermath, Army HQ records, Chronicle, and Warroom priority pulse after resolution.

Existing shipped sources: src/ui/map/data/presidentialDecisionRoom.ts, src/ui/map/data/preAdvanceCommandReview.ts, src/ui/map/data/warroomPriorityDocket.ts, and reports 20260502_PRESIDENTIAL_DECISION_ROOM_STRATEGIC_PRIORITIES.md, 20260502_DECISION_ROOM_COMMAND_LOOP_LANES.md, 20260515_DECISION_ROOM_PRODUCT_LOOP_HEARTBEAT.md, 20260502_DECISION_ROOM_PRIORITY_LENSES.md, 20260502_DECISION_ROOM_SOURCE_HANDOFFS.md, 20260502_DECISION_ROOM_PRIORITY_DOSSIER.md, 20260502_PRE_ADVANCE_COMMAND_REVIEW.md, 20260502_WARROOM_PRIORITY_PULSE.md, and 20260502_WARROOM_PRIORITY_DOCKET.md.

## 2. Canonical Pipeline Inventory

The following table lists every `name:` literal from early_war_phases.ts, war_phases.ts, war_phase_briefing_steps.ts, war_phase_negotiation_steps.ts, and war_phase_reconciliation_steps.ts as inspected on 2026-05-17. Duplicate literal strings that appear in both early-war and war files are listed once per source occurrence because they are separate phase entries.

| Phase Band | Canonical Pipeline Step | Player-Visible? | Notes |
|---|---|---|---|
| Peace / Early War | `evaluate-events` | Indirect | early_war_phases.ts:66 |
| Peace / Early War | `militia-emergence` | No | early_war_phases.ts:74 |
| Peace / Early War | `compute-siege-state` | No | early_war_phases.ts:80 |
| Peace / Early War | `pool-population` | No | early_war_phases.ts:108 |
| Peace / Early War | `minority-militia-decay` | No | early_war_phases.ts:120 |
| Peace / Early War | `early-brigade-reinforcement` | No | early_war_phases.ts:131 |
| Peace / Early War | `formation-spawn` | No | early_war_phases.ts:138 |
| Peace / Early War | `activate-corps` | No | early_war_phases.ts:168 |
| Peace / Early War | `promote-formations` | No | early_war_phases.ts:186 |
| Peace / Early War | `early-war-bot-posture` | No | early_war_phases.ts:198 |
| Peace / Early War | `early-alliance-update` | No | early_war_phases.ts:216 |
| Peace / Early War | `early-ceasefire-check` | No | early_war_phases.ts:229 |
| Peace / Early War | `early-washington-check` | No | early_war_phases.ts:236 |
| Peace / Early War | `capability-update` | No | early_war_phases.ts:243 |
| Peace / Early War | `early-control-flip` | No | early_war_phases.ts:250 |
| Peace / Early War | `bilateral-flip-count` | No | early_war_phases.ts:263 |
| Peace / Early War | `displacement-hooks` | No | early_war_phases.ts:271 |
| Peace / Early War | `displacement-apply` | No | early_war_phases.ts:287 |
| Peace / Early War | `control-strain` | No | early_war_phases.ts:308 |
| Peace / Early War | `authority-update` | No | early_war_phases.ts:316 |
| Peace / Early War | `jna-transition` | No | early_war_phases.ts:322 |
| Peace / Early War | `minority-erosion` | No | early_war_phases.ts:328 |
| War - Start of Turn | `initialize` | No | war_phases.ts:223 |
| War - Start of Turn | `capture-aar-snapshot` | No | war_phases.ts:229 |
| War - Start of Turn | `snapshot-political-controllers` | No | war_phases.ts:238 |
| War - Start of Turn | `snapshot-alliance-at-turn-start` | No | war_phases.ts:252 |
| War - Start of Turn | `migrate-political-control-osid` | No | war_phases.ts:259 |
| War - Start of Turn | `cleanup-expired-event-modifiers` | No | war_phases.ts:278 |
| War - Start of Turn | `update-event-readiness` | Indirect | war_phases.ts:284 |
| War - Start of Turn | `evaluate-events` | Indirect | war_phases.ts:292 |
| War - Operational Setup | `compute-dimension-bases` | No | war_phases.ts:305 |
| War - Operational Setup | `sync-front-segments` | No | war_phases.ts:315 |
| War - Operational Setup | `normalize-front-posture` | No | war_phases.ts:327 |
| War - Operational Setup | `expand-region-posture` | No | war_phases.ts:333 |
| War - Operational Setup | `update-formation-fatigue` | No | war_phases.ts:343 |
| War - Operational Setup | `apply-guerrilla-attrition` | No | war_phases.ts:360 |
| War - Operational Setup | `supply-resolution` | Indirect | war_phases.ts:366 |
| War - Operational Setup | `update-formation-lifecycle` | No | war_phases.ts:388 |
| War - Operational Setup | `check-brigade-dissolution` | No | war_phases.ts:413 |
| War - Operational Setup | `reconstitute-brigades` | No | war_phases.ts:425 |
| War - Operational Setup | `formation-hq-relocation` | No | war_phases.ts:437 |
| War - Operational Setup | `location-osid-backfill` | No | war_phases.ts:448 |
| War - Operational Setup | `init-brigade-history` | No | war_phases.ts:462 |
| War - Operational Setup | `activate-corps` | No | war_phases.ts:474 |
| War - Operational Setup | `load-operational-data` | No | war_phases.ts:494 |
| War - Operational Setup | `supply-osid` | Indirect | war_phases.ts:513 |
| War - Operational Setup | `compute-spatial-context-pre-combat` | No | war_phases.ts:542 |
| War - Operational Setup | `update-siege-counters` | No | war_phases.ts:573 |
| War - Operational Setup | `compute-supply-reserves` | Indirect | war_phases.ts:584 |
| War - Operational Setup | `update-smuggling-routes` | No | war_phases.ts:593 |
| War - Operational Setup | `enclave-resilience` | No | war_phases.ts:614 |
| War - Operational Setup | `compute-home-defense-active` | No | war_phases.ts:623 |
| War - Operational Setup | `osid-column-movement` | No | war_phases.ts:630 |
| War - Operational Setup | `apply-brigade-movement` | No | war_phases.ts:653 |
| War - Operational Setup | `derive-osid-front-segments` | No | war_phases.ts:664 |
| War - Operational Setup | `partition-corps-front-sectors` | No | war_phases.ts:677 |
| War - Operational Setup | `assign-brigades-to-subsegments` | No | war_phases.ts:693 |
| War - Operational Setup | `distribute-brigades-to-front` | No | war_phases.ts:732 |
| War - Operational Setup | `return-displaced-brigades` | No | war_phases.ts:745 |
| War - Operational Setup | `compute-sector-combat-ratings` | No | war_phases.ts:756 |
| War - Operational Setup | `paramilitary-detect` | No | war_phases.ts:769 |
| War - Operational Setup | `offensive-paramilitary-detect` | No | war_phases.ts:785 |
| War - Operational Setup | `consolidate-rear-pockets` | No | war_phases.ts:807 |
| War - Operational Setup | `paramilitary-advance` | No | war_phases.ts:821 |
| War - Operational Setup | `process-brigade-movement` | No | war_phases.ts:841 |
| War - Operational Setup | `jna-phantom-withdrawals` | No | war_phases.ts:856 |
| War - Operational Setup | `reconcile-live-operation-truth` | No | war_phases.ts:867 |
| War - Operational Setup | `update-stranded-brigade-lifecycle` | No | war_phases.ts:874 |
| War - Operational Setup | `advance-sector-offensives` | Indirect | war_phases.ts:887 |
| War - Operational Setup | `reevaluate-weakened-operations` | No | war_phases.ts:913 |
| War - Operational Setup | `assert-operation-lifecycle` | No | war_phases.ts:920 |
| War - Operational Setup | `decay-officer-interpretation-state` | No | war_phases.ts:927 |
| War - Operational Setup | `inject-queued-operations` | No | war_phases.ts:958 |
| War - Operational Setup | `check-triggered-operations` | No | war_phases.ts:976 |
| War - Operational Setup | `compute-home-distance-cache` | No | war_phases.ts:983 |
| War - Operational Setup | `apply-resolved-opportunity-decisions` | No | war_phases.ts:1003 |
| War - Operational Setup | `apply-autonomy-transition` | No | war_phases.ts:1010 |
| War - Decisions | `ai-army-decisions` | No | war_phases.ts:1040 |
| War - Decisions | `ai-corps-decisions` | No | war_phases.ts:1078 |
| War - Decisions | `ai-corps-dialogue` | No | war_phases.ts:1107 |
| War - Decisions | `ai-war-dispatches` | No | war_phases.ts:1126 |
| War - Decisions | `evaluate-army-hq-gathering` | No | war_phases.ts:1149 |
| War - Decisions | `generate-bot-corps-orders` | No | war_phases.ts:1238 |
| War - Decisions | `generate-player-stance-recommendations` | Yes | war_phases.ts:1289 |
| War - Decisions | `generate-level1-proposals` | Yes | war_phases.ts:1312 |
| War - Decisions | `evaluate-operation-opportunities` | Yes | war_phases.ts:1342 |
| War - Decisions | `apply-bot-opportunity-decisions` | No | war_phases.ts:1353 |
| War - Decisions | `generate-level1-opportunity-proposals` | Yes | war_phases.ts:1366 |
| War - Decisions | `generate-level1-op-proposals` | Yes | war_phases.ts:1383 |
| War - Decisions | `commander-correct-march-orders` | No | war_phases.ts:1398 |
| War - Decisions | `recompute-sector-combat-ratings` | No | war_phases.ts:1413 |
| War - Decisions | `generate-army-reserve-requests` | No | war_phases.ts:1422 |
| War - Decisions | `generate-bot-brigade-orders` | No | war_phases.ts:1433 |
| War - Resolution | `apply-brigade-posture` | Indirect | war_phases.ts:1482 |
| War - Resolution | `apply-sector-stance-orders` | Indirect | war_phases.ts:1489 |
| War - Resolution | `recover-command-authority` | No | war_phases.ts:1496 |
| War - Resolution | `update-corps-effects` | No | war_phases.ts:1530 |
| War - Resolution | `advance-corps-operations` | Indirect | war_phases.ts:1538 |
| War - Resolution | `activate-operational-groups` | No | war_phases.ts:1546 |
| War - Resolution | `equipment-degradation` | No | war_phases.ts:1554 |
| War - Resolution | `equipment-progression` | No | war_phases.ts:1575 |
| War - Resolution | `apply-posture-costs` | Indirect | war_phases.ts:1585 |
| War - Resolution | `check-truce-break` | No | war_phases.ts:1592 |
| War - Resolution | `resolve-attack-orders` | Indirect | war_phases.ts:1614 |
| War - Resolution | `compute-spatial-context-post-combat` | No | war_phases.ts:1685 |
| War - Resolution | `attribute-operation-casualties` | Indirect | war_phases.ts:1717 |
| War - Resolution | `update-sector-offensive-results` | Indirect | war_phases.ts:1726 |
| War - Resolution | `record-operation-weekly-entry` | Indirect | war_phases.ts:1735 |
| War - Resolution | `displace-enemy-territory` | Indirect | war_phases.ts:1744 |
| War - Resolution | `update-officer-quality` | No | war_phases.ts:1755 |
| War - Resolution | `evaluate-brigade-decorations` | No | war_phases.ts:1767 |
| War - Resolution | `apply-casualty-pool-exhaustion` | No | war_phases.ts:1775 |
| War - Resolution | `cohesion-drift` | No | war_phases.ts:1826 |
| War - Resolution | `morale-drift` | No | war_phases.ts:1834 |
| War - Resolution | `apply-siege-morale-drain` | No | war_phases.ts:1853 |
| War - Resolution | `check-brigade-dissolution-post-combat` | No | war_phases.ts:1865 |
| War - Resolution | `apply-frontline-attrition` | No | war_phases.ts:1885 |
| War - Resolution | `apply-siege-bombardment-attrition` | No | war_phases.ts:1895 |
| War - Resolution | `hostile-takeover-displacement` | Indirect | war_phases.ts:1904 |
| War - Aftermath | `alliance-update` | Indirect | war_phases.ts:1961 |
| War - Aftermath | `bilateral-flip-count-war` | No | war_phases.ts:1974 |
| War - Aftermath | `ceasefire-check` | Indirect | war_phases.ts:2000 |
| War - Aftermath | `washington-check` | Indirect | war_phases.ts:2007 |
| War - Aftermath | `operation-storm-check` | Indirect | war_phases.ts:2014 |
| War - Aftermath | `hv-integration` | Indirect | war_phases.ts:2021 |
| War - Aftermath | `process-lifecycle-events` | No | war_phases.ts:2028 |
| War - Aftermath | `recruitment` | Indirect | war_phases.ts:2037 |
| War - Aftermath | `ongoing-mobilization` | Indirect | war_phases.ts:2115 |
| War - Aftermath | `pool-war-weariness-decay` | No | war_phases.ts:2127 |
| War - Aftermath | `reroute-pool-surplus` | No | war_phases.ts:2134 |
| War - Aftermath | `brigade-reinforcement` | No | war_phases.ts:2154 |
| War - Aftermath | `recall-drifted-brigades` | No | war_phases.ts:2161 |
| War - Aftermath | `strategic-reserve-collection` | No | war_phases.ts:2170 |
| War - Aftermath | `strategic-reserve-reinforcement` | No | war_phases.ts:2177 |
| War - Aftermath | `sanitize-ghost-sector-power` | No | war_phases.ts:2184 |
| War - Aftermath | `apply-vrs-equipment-decay` | No | war_phases.ts:2211 |
| War - Aftermath | `tick-elite-loans` | No | war_phases.ts:2230 |
| War - Aftermath | `officer-succession` | No | war_phases.ts:2238 |
| War - Aftermath | `check-heroic-stand` | No | war_phases.ts:2263 |
| War - Aftermath | `check-warlord-friction` | No | war_phases.ts:2290 |
| War - Aftermath | `update-faction-officer-maturity` | No | war_phases.ts:2302 |
| War - Aftermath | `generate-war-stories` | Indirect | war_phases.ts:2311 |
| War - Aftermath | `compute-combat-summaries` | Indirect | war_phases.ts:2324 |
| War - Aftermath | `wia-trickleback` | No | war_phases.ts:2332 |
| War - Aftermath | `update-og-lifecycle` | No | war_phases.ts:2339 |
| War - Aftermath | `supply-pressure-exhaustion` | Indirect | war_phases.ts:2347 |
| War - Aftermath | `phase-e-pressure-update` | No | war_phases.ts:2366 |
| War - Aftermath | `front-emergence` | No | war_phases.ts:2380 |
| War - Aftermath | `derive-sector-intel` | Indirect | war_phases.ts:2393 |
| War - Aftermath | `phase-f-displacement` | No | war_phases.ts:2400 |
| War - Aftermath | `update-capability-profiles` | No | war_phases.ts:2428 |
| War - Aftermath | `update-embargo-profiles` | No | war_phases.ts:2436 |
| War - Aftermath | `update-enclave-integrity` | No | war_phases.ts:2446 |
| War - Aftermath | `update-sarajevo-exception` | No | war_phases.ts:2469 |
| War - Aftermath | `update-patron-ivp` | Indirect | war_phases.ts:2482 |
| War - Aftermath | `evaluate-humanitarian-convoys` | No | war_phases.ts:2510 |
| War - Aftermath | `update-legitimacy` | No | war_phases.ts:2524 |
| War - Aftermath | `apply-formation-commitment` | No | war_phases.ts:2533 |
| War - Aftermath | `update-doctrine-eligibility` | No | war_phases.ts:2552 |
| War - Aftermath | `update-heavy-equipment` | No | war_phases.ts:2560 |
| War - Aftermath | `expose-effective-posture` | No | war_phases.ts:2572 |
| War - Aftermath | `accumulate-front-pressure` | No | war_phases.ts:2630 |
| War - Aftermath | `accumulate-exhaustion` | No | war_phases.ts:2641 |
| War - Aftermath | `phase3a-pressure-eligibility` | No | war_phases.ts:2658 |
| War - Aftermath | `phase3a-pressure-diffusion` | No | war_phases.ts:2692 |
| War - Aftermath | `phase3b-pressure-exhaustion` | No | war_phases.ts:2701 |
| War - Aftermath | `phase3c-exhaustion-collapse-gating` | No | war_phases.ts:2716 |
| War - Aftermath | `phase3d-collapse-resolution` | No | war_phases.ts:2730 |
| War - Aftermath | `phase5d-loss-of-control-trends` | No | war_phases.ts:2737 |
| War - Aftermath | `update-militia-fatigue` | No | war_phases.ts:2746 |
| War - Aftermath | `update-displacement` | No | war_phases.ts:2767 |
| War - Aftermath | `update-sustainability` | No | war_phases.ts:2783 |
| War - Aftermath | `update-negotiation-pressure` | Indirect | war_phases.ts:2794 |
| War - Aftermath | `update-negotiation-capital` | Indirect | war_phases.ts:2810 |
| War - Aftermath | `expire-ceasefire` | No | war_phases.ts:2821 |
| War - Aftermath | `update-negotiation-offers` | Indirect | war_phases.ts:2827 |
| War - Aftermath | `clear-displacement-event-log` | Indirect | war_phases.ts:2907 |
| War - Briefing and Report | `assemble-command-briefing` | Yes | war_phase_briefing_steps.ts:5 |
| War - Briefing and Report | `compile-turn-summary` | Yes | war_phase_briefing_steps.ts:16 |
| War - Briefing and Report | `resolve-noop` | No | war_phase_briefing_steps.ts:30 |
| War - Negotiation and Termination | `evaluate-peace-plans` | Yes | war_phase_negotiation_steps.ts:12 |
| War - Negotiation and Termination | `check-victory-conditions` | Yes | war_phase_negotiation_steps.ts:19 |
| War - Negotiation and Termination | `update-patron-pressure` | Indirect | war_phase_negotiation_steps.ts:34 |
| War - Negotiation and Termination | `evaluate-rupture-consequences` | Indirect | war_phase_negotiation_steps.ts:42 |
| War - Negotiation and Termination | `compute-negotiation-capital` | Indirect | war_phase_negotiation_steps.ts:49 |
| War - Negotiation and Termination | `evaluate-dayton-trigger` | Yes | war_phase_negotiation_steps.ts:56 |
| War - Final Reconciliation | `rederive-osid-front-segments` | No | war_phase_reconciliation_steps.ts:22 |
| War - Final Reconciliation | `reconcile-final-sector-truth` | No | war_phase_reconciliation_steps.ts:35 |
| War - Final Reconciliation | `reconcile-final-operation-truth` | No | war_phase_reconciliation_steps.ts:73 |
| War - Final Reconciliation | `reconcile-final-sector-truth-after-ops` | No | war_phase_reconciliation_steps.ts:80 |
| War - Final Reconciliation | `final-distribute-brigades-to-front` | No | war_phase_reconciliation_steps.ts:98 |
| War - Final Reconciliation | `assert-final-operation-lifecycle` | No | war_phase_reconciliation_steps.ts:110 |
| War - Final Reconciliation | `assert-formations-in-friendly-territory` | No | war_phase_reconciliation_steps.ts:117 |
| War - Final Reconciliation | `assert-control-event-consistency` | No | war_phase_reconciliation_steps.ts:124 |
| War - Final Reconciliation | `compute-combat-effective-brigades` | No | war_phase_reconciliation_steps.ts:132 |

## 3. Per-Phase Player Surface

| Phase band | What the player sees | What the player can decide | What the engine resolves automatically |
|---|---|---|---|
| Peace / Early War | Warroom, events, Chronicle, and Turn Aftermath may expose event and control consequences indirectly. | None - observation only unless an event decision is separately surfaced by the decision manifest. | evaluate-events, militia-emergence, formation-spawn, activate-corps, early-control-flip, displacement-apply, authority-update, jna-transition. |
| War - Start of Turn | Decision Room starts from current loaded state; Warroom priority pulse can summarize outstanding review pressure. | None - observation only. | initialize, capture-aar-snapshot, snapshot-political-controllers, cleanup-expired-event-modifiers, update-event-readiness, evaluate-events. |
| War - Operational Setup | Army HQ BRIEFING, Decision Room Fronts and Inspect lanes, priority lenses, source handoffs, and tactical map overlays summarize readiness and risk. | Corps stance, sector stance, logistics priority, OPSEC, sector override when surfaced by the owning panel. | sync-front-segments, supply-resolution, supply-osid, compute-spatial-context-pre-combat, partition-corps-front-sectors, assign-brigades-to-subsegments, compute-sector-combat-ratings, derive-sector-intel. |
| War - Decisions | Decision Room lanes, active priority dossier, Army HQ BRIEFING, operation opportunity proposals, and pre-advance review rows. | Corps stance, sector stance, ops planning, logistics priority, OPSEC, sector override. | ai-army-decisions, ai-corps-decisions, ai-war-dispatches, generate-bot-corps-orders, generate-player-stance-recommendations, evaluate-operation-opportunities, apply-resolved-opportunity-decisions, apply-bot-opportunity-decisions. |
| War - Resolution | Mostly indirect: Turn Aftermath, Chronicle, operation records, battle summaries, and cost surfaces after the turn resolves. | None - observation only after advance. | apply-sector-stance-orders, advance-corps-operations, apply-posture-costs, resolve-attack-orders, displace-enemy-territory, cohesion-drift, morale-drift, hostile-takeover-displacement. |
| War - Aftermath | Turn Aftermath, Army HQ records, Chronicle, Warroom priority docket/pulse, Decision Room Report, Cost, Judge, and Next loop steps. | Corps stance, sector stance, ops planning, logistics priority, OPSEC, sector override for the next turn only; no retroactive changes to the resolved turn. | alliance-update, ceasefire-check, washington-check, operation-storm-check, recruitment, ongoing-mobilization, generate-war-stories, update-negotiation-pressure, update-negotiation-capital, clear-displacement-event-log. |
| War - Briefing and Report | Army HQ BRIEFING, Turn Aftermath, and Decision Room source handoffs. | None - observation only until the player enters a command surface. | assemble-command-briefing, compile-turn-summary, resolve-noop. |
| War - Negotiation and Termination | Negotiation, peace-plan, verdict, and cost surfaces when exposed by existing systems; otherwise indirect through events and end state. | Event/peace-plan response only when surfaced by the decision manifest; otherwise none. | evaluate-peace-plans, check-victory-conditions, update-patron-pressure, evaluate-rupture-consequences, compute-negotiation-capital, evaluate-dayton-trigger. |
| War - Final Reconciliation | No primary player input surface; results are visible through records and aftermath. | None - observation only. | rederive-osid-front-segments, reconcile-final-sector-truth, reconcile-final-operation-truth, assert-formations-in-friendly-territory, compute-combat-effective-brigades. |

## 4. Six Valid Tactical Levers

Brigades never attack independently. All attacks flow through CorpsOperation. Initial OSID political control is sacrosanct and is not a player lever; Rulebook Section 4 and Engine Invariants Section 9 make political control initialized state, not a command target.

| Lever | Where set or inspected | Consumed by | Effect resolved by | Canon authority |
|---|---|---|---|---|
| Corps stance | Army HQ BRIEFING / corps command review / Decision Room Fronts or Decisions handoff. | generate-bot-corps-orders, generate-player-stance-recommendations, advance-corps-operations. | apply-posture-costs, resolve-attack-orders, compute-combat-summaries. | Rulebook Sections 2, 5; Systems Manual Sections 6, 7, 21; Engine Invariants Section 6.3. |
| Sector stance | Sector detail / corps sector review / Decision Room source handoff. | apply-sector-stance-orders. | compute-sector-combat-ratings, resolve-attack-orders, update-sector-offensive-results. | Rulebook posture rules; Systems Manual Sections 6.7, 8; Engine Invariants Sections 6.5 and 14. |
| Ops planning | Operation opportunity and planning surfaces; corps-authorized only. | evaluate-operation-opportunities, apply-resolved-opportunity-decisions, inject-queued-operations, check-triggered-operations. | advance-corps-operations, resolve-attack-orders, record-operation-weekly-entry. | Rulebook command hierarchy; Systems Manual Sections 6.8 and 7; Engine Invariants Section 6.3. |
| Logistics priority | Army HQ / logistics source surface, surfaced through Decision Room priority handoffs when relevant. | supply-resolution, supply-osid, compute-supply-reserves. | supply-pressure-exhaustion, apply-posture-costs, update-negotiation-pressure. | Systems Manual Sections 4, 14, 15, 21; Engine Invariants Section 4. |
| OPSEC | Sector intelligence / operation planning source surface, surfaced through Decision Room handoffs when relevant. | derive-sector-intel, evaluate-operation-opportunities, generate-bot-corps-orders. | ai-corps-decisions, resolve-attack-orders, compute-combat-summaries. | Systems Manual System 8a and player action constraints. |
| Sector override | Corps sector detail / command review source surface, surfaced through Decision Room when a sector needs inspection. | partition-corps-front-sectors, assign-brigades-to-subsegments, apply-sector-stance-orders. | compute-sector-combat-ratings, resolve-attack-orders, reconcile-final-sector-truth. | Systems Manual Sections 8 and 21; Engine Invariants Sections 6.5, 14.9. |

No seventh tactical lever is canonized here. Do not use avoided_osids_by_faction or any banned override as player guidance.

**Presidential Command Model (additive note — LOCKED design 2026-06-01):** Canonically the player is the **president and commands through generals (strategic directives), not as a general; brigade-level operation planning is post-1.0 / DLC.** Distinct from the six tactical levers above (the shipped corps/sector/ops/logistics/OPSEC command surface), the presidential command model defines five president-level levers: (1) **Authorize op — SHIPPED** (the existing back-the-officer / proposal-approval path that "Ops planning" surfaces); (2) Request op; (3) Stop op; (4) Authorize elite deployment; (5) Replace a corps CO at cost. **Levers 2–5 are locked-design/forthcoming, not yet built — do not treat them as available player guidance.** Refusing a patron demand is the event layer, not a lever. Authoritative design: `docs/plans/2026-06-01-presidential-command-model-design.md`. *(Additive note; does not add a tactical lever and does not supersede §4. As each lever ships it must be reconciled with this table under Rulebook/Systems Manual authority.)*

## 5. Playing RBiH

RBiH reads the same phase table through scarcity and continuity: supply strain, mobilization, enclave officer locks, and international standing are usually the first scan. Start with Decision Room Urgent, Fronts, and Inspect; then check Army HQ BRIEFING for corps readiness, enclave officer constraints such as Oric and Dudakovic, and ongoing-mobilization / recruitment consequences. This is framing only, not a new RBiH mechanic.

## 6. Playing RS

RS reads the same phase table through tempo, patron pressure, embargo profile, exhaustion, and eastern readiness. Start with Decision Room Fronts, Decisions, and the active dossier; then inspect Drina / East Bosnia operational readiness, patron IVP pressure, and exhaustion signals. The guide does not turn independence or autonomy into a player slider; those are political identity and scoring context.

## 7. Playing HRHB

HRHB reads the same phase table through HV integration, HVO patron pressure, alliance consequences, and the HRHB-RBiH conflict transition. Start with Decision Room Decisions, Urgent, and Inspect; then follow source handoffs for alliance-update, washington-check, hv-integration, and mobilization-window signals. For canon framing, see docs/40_reports/BOSNIAK_CROAT_CONFLICT_MASTER.md.

## 8. Review Footer

| Reviewer | Date | Result | Follow-ups |
|---|---|---|---|
| Game Designer | 2026-05-17 | Pass: six levers only; no brigade independent attacks; no new mechanics. | Keep future guide amendments below Rulebook authority. |
| UI/UX Developer | 2026-05-17 | Pass: see cells reference shipped Decision Room, Warroom, pre-advance, Army HQ, Chronicle, and Turn Aftermath surfaces only. | UI implementation remains out of scope. |
| Historian | 2026-05-17 | Pass: faction IDs and corps/brigade terminology are canon-consistent; historical framing is limited and non-inevitable. | Any future historical assertions need ICTY/BB-backed citations. |
| Canon Compliance Reviewer | 2026-05-17 | Pass: guide is derived from Engine Invariants, Phase Specs, Systems Manual, and Rulebook. | No changes to FORAWWV or core canon files in this lane. |

## 9. Determinism Note

This guide is Markdown only. It introduces no runtime randomness, timestamp reads, code examples, runtime state, save migration, scenario data, or pipeline ordering changes.
