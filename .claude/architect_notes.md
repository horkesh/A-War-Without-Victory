# Architect Notes

Purpose: repo-local architect board for active findings, accepted direction, and outstanding infrastructure. This is not a session log. Keep it current enough that prompt generation and review do not depend on chat memory.

## Current Product Direction

- The player is the faction president.
- Default play is presidential:
  - strategic guidance
  - reserve allocation
  - plan approval / denial
  - directives to Army HQ / corps
  - selective intervention
- Direct brigade-level control is exceptional override, not baseline fantasy.
- Operations are the spikes of excitement.
- Events, delegation, reserve decisions, and command review are the tension between spikes.

## Accepted Findings

### Wrong Now

- **Command abstraction largely resolved.** Command review is coherent across live ops, history, and standing state (outcome badge, trend summary, three-tier category). Explanation surfaces propagated: standing (CorpsSituationSection) + decision-time (OperationConstraintContext + RecommendationDriver + ReadinessTrend). Temporal legibility added via Wave 6 (readiness direction + timeline urgency). **Delegation visibility landed (Wave 1):** pre-decision delegation path (DelegationPathIndicator) + standing delegation summary (CommandRelationshipSection). What remains: full order interpretation *system* (commander personality filter, delay/refusal logic, political capital for overrides — v0.8.3).
- **Sector semantics still need finishing:** sectors must remain frontlines, not slide back into territory buckets. Command chain truth waves hardened the adapter and demotion paths, but the underlying sector-as-territory drift risk persists.
- **Reporting/activity truth partially resolved.** Command chain truth waves 1-4 hardened sub-segment derivation, displacement trigger proxy-fork is now observable (console.warn), activity zero-fill landed. Remaining: any surface still reading formation.assigned_sub_segment_id as primary truth instead of corps_front_sectors canonical path.
- **Warroom ownership resolved.** React migration complete (2026-04-04). `src/ui/map/components/warroom/` is sole owner of live room rendering. `warroom.ts` retains launch/picker/iframe/bridge. Army HQ has clear command-review ownership. Command relationship surface consolidated (friction + management + standing → single section). Remaining shell work: UI density/cohesion pass (v0.8-to-v0.9).

### Strong Systems To Push Harder

- Operation preparation is one of the game's signature mechanics and should remain central.
- Army-level reserve loans create real scarcity and presidential decision weight.
- Constrained institutional command is the game's core identity and should shape future UX/mechanics.
- Best 10x direction: make operations + sectors + command review the center of play.

## Active / Recent Accepted Lanes

- **Elite Formation Utilization** — VALIDATED 2026-04-05, ALL FOLLOW-UPS CLOSED. Fix A: ACCEPTED (reachability-aware plan, n1315 +0.6pp +2 anchors). Fix B: NOW OPERATIONAL (pipeline priority lane closed). Cross-corps Banja Luka LI rehoming: FIXED. Reports: `docs/40_reports/implemented/20260405_ELITE_FORMATION_UTILIZATION_FIX.md`, `docs/40_reports/implemented/20260405_ELITE_FORMATION_FOLLOWUP_MARCH_CROSSCORPS.md`.

- **Prepositioning Pipeline Priority** — CLOSED 2026-04-05. Two bugs: (1) `correctMarchOrders` stripped `stance:'column'`, (2) Fix B guard pre-empted. Both fixed. 4 targeted tests. Report: `docs/40_reports/implemented/20260405_PREPOSITIONING_PIPELINE_PRIORITY.md`.

- **Home-Return vs Prepositioning Tug-of-War** — CLOSED 2026-04-05. `recallDriftedBrigades` sector-assignment check. n1317: 94.3%, 27/27, 64 battles. 7 targeted tests. Report: `docs/40_reports/implemented/20260405_HOME_RETURN_VS_PREPOSITIONING.md`.

- **Residual ZEA Attribution** — CLOSED 2026-04-05. Commander operations (`buildProbeOperation`, `buildCommanderOperation`) had no `axes` — probes immediately "completed" (0 objectives = done), cmd ops got null objective from brigade AI. Fix: create single OperationAxis in both factories + derive probe objectives from sector front. n1318: 94.0% (-0.3pp), 26/27 (-1: kopcic_2), 6/6, 71 battles (+7). **Invalid ops 370→137 (63% reduction), recovery-without-attempt 188→45 (76%), movement-only 19→0.** kopcic_2 anchor loss is calibration sensitivity from enabling previously-inert RS commander attacks. 4 targeted tests. Report: `docs/40_reports/implemented/20260405_RESIDUAL_ZEA_ATTRIBUTION.md`.

- **VRS East Bosnian ZEA Fix (Anti-Paralysis Supply Gate)** — CLOSED 2026-04-05. Supply floor added to anti-paralysis override in `operation_preparation.ts` (line 423): `aggressiveness >= 3 && supplyReadiness >= 0.3`. Operations at critical supply now abort instead of force-launching into guaranteed ZEA. vrs_east_bosnian ZEA eliminated. n1321: 94.0%, 27/27, 6/6, 69 battles. 3 targeted tests. Report: `docs/40_reports/implemented/20260405_VRS_EAST_BOSNIAN_ZEA_FIX.md`.

- **Empty-Objective Probe Guard** — CLOSED 2026-04-05. Guard added in `emit.ts` (line 772) to skip probe creation when `probeObjectives.length === 0`. Eliminates dominant remaining family of recovery-without-attempt: probes with no enemy-adjacent OSID targets that immediately "completed" with zero attacks. Commander ops already had this guard (emit.ts:685). n1319: 94.3% (+0.3pp), **27/27 anchors** (kopcic_2 recovered), 6/6, 76 battles (+5), 97 attack orders (+6). Residual: 6 probes with real objectives but unreachable brigades (different family). 3 targeted tests. Report: `docs/40_reports/implemented/20260405_PROBE_TARGET_STALENESS_FIX.md`.

- **Probe Brigade Reachability Guard** — CLOSED 2026-04-05. BFS reachability check added in `emit.ts` (lines 773-786). Structural safety net — zero behavioral delta (hash identical to n1319: `a6a231f68172c085`). All 6 residual probes were reachable at creation time. Root cause reclassified from "creation-time unreachable" to "execution-time staleness" (4 executing-zero-attack + 2 false-completion). 2 targeted tests. Report: `docs/40_reports/implemented/20260405_PROBE_BRIGADE_REACHABILITY.md`.

- **Army HQ Stability Package** — CLOSED 2026-04-04. `ChiefOfStaffBriefing.buildStrainParagraphs` had unsafe `as unknown as GameState` cast — crashed reading `state.military.corps_command` from `LoadedGameState`. Fix: use adapter-derived `FormationView.commandStrainLabel`. Integration test added. Brigade investigation: all 3 named RS brigades are active and sector-assigned (rs_1st_armored correct; rs_2nd/rs_4th cross-corps misassigned to vrs_2nd_krajina — pre-existing P1). None idle. Report: `docs/40_reports/implemented/20260404_ARMY_HQ_STABILITY_REAR_BRIGADE_INVESTIGATION.md`.

- **Order Interpretation System Wave 3** — CLOSED 2026-04-04. `deriveInterventionRisk(category, commanderAssessment, severity): string | null` added to `command_strain.ts`. `DirectInterventionSection` gains `interventionRisk?: string | null` prop; explanation is now `interventionRisk ?? generic_fallback`. Modal-level useMemo derives category from `deriveOrderInterpretation` then calls `deriveInterventionRisk`. 9 focused Wave 3 tests; 56 total in interpretation suite; full suite 2300/2300. Report: `docs/40_reports/implemented/20260404_ORDER_INTERPRETATION_SYSTEM_WAVE3.md`.
- **Order Interpretation System Wave 2** — CLOSED 2026-04-04. DragFactor model: DragSource + DragFactor interface + dragFactors: DragFactor[] on OrderInterpretation. `deriveOrderInterpretation` extended with `postponementCount?` param. Bullet list replaces prose in `OrderInterpretationSection` with dominant and supporting drag factors plus intensity labels. `postponementCount={postponements}` at call site. `cautionNotice` kept as fallback for backward compat. 14 focused Wave 21 drag-factor tests; targeted interpretation coverage 337/337; full suite 2291/2291. Report: `docs/40_reports/implemented/20260404_ORDER_INTERPRETATION_SYSTEM_WAVE2.md`.
- **Order Interpretation System Wave 1** — CLOSED 2026-04-04 (Wave 1 of 2). Interpretation category system: `OrderInterpretationCategory` classifies institutional drag as strain_shaped / caution_driven / feasibility_constrained / tempo_resistant. `deriveOrderInterpretation` extended with `primaryConstraint?` + `trendDirection?` params. `OrderInterpretationSection` now fires for ALL reluctant assessments (not just strain>0), showing category label badge. No engine changes, no new persistence. 33 focused tests (Wave 20) plus updated command_authority coverage. Full suite: 2277/2277. Report: `docs/40_reports/implemented/20260404_ORDER_INTERPRETATION_SYSTEM_WAVE1.md`.
- **Delegation Visibility Wave 1** — CLOSED 2026-04-04. Pre-decision delegation path: `deriveDelegationContext()` classifies normal_delegation / strained_delegation / presidential_direction from commander_assessment + strain. `DelegationPathIndicator` in OperationBriefingModal between assessment badge and readiness trend. Standing delegation summary: `deriveCorpsDelegationSummary()` aggregates active ops into delegated/directed/overridden counts, rendered in CommandRelationshipSection. No engine changes, no new persisted fields. 12 tests (Wave 19). Full suite: 2244/2244. Report: `docs/40_reports/implemented/20260404_DELEGATION_VISIBILITY_WAVE1.md`. 4 parallel audit subagents + central implementation.
- **Presidential Command Friction Wave 6 (Exhaustion Strain)** — CLOSED 2026-04-04. Corps exhaustion ≥50 → +1 strain, ≥75 → +2 strain. First condition-based (non-decaying) strain source. Stabilization doesn't resolve it (no friction to clear). Exhaustion pressure note in CommandRelationshipSection. Compromised stance guidance now distinguishes friction-only vs exhaustion-only vs mixed recovery paths. Stabilize button hidden when no friction events. 14 tests (Wave 18). Full suite: 2231/2231. Report: `docs/40_reports/implemented/20260404_PRESIDENTIAL_COMMAND_FRICTION_WAVE6.md`.
- **Army HQ Command Relationship Surface Consolidation** — CLOSED 2026-04-04. Merged inline friction panel + CommandManagementSection + CommandRelationshipSection into single "Command Relationship" section. CommandManagementSection.tsx deleted. Reading order: strain status → recovery forecast → stance constraint → friction events with Acknowledge → Stabilize button. Silence=healthy when strain=0 AND no friction. CorpsSituationSection stays separate (disjoint derivation). 11 tests (Wave 17). Full suite: 2217/2217. Report: `docs/40_reports/implemented/20260404_ARMY_HQ_COMMAND_RELATIONSHIP_CONSOLIDATION.md`.
- **Commander Explanation Surfaces Wave 6** — CLOSED 2026-04-04. Readiness trend: `deriveReadinessTrend()` — derivation-only from existing persisted fields (postponement_count + commander_assessment + preparation timeline). `ReadinessTrendIndicator` in OperationBriefingModal between assessment badge and recommendation driver. Six directions: nearing_launch (silence), improving, building, stagnating, deteriorating, not_viable. Timeline urgency bar. No engine changes, no new persisted fields. 15 tests (Wave 16). Full suite: 2206/2206. Report: `docs/40_reports/implemented/20260404_COMMANDER_EXPLANATION_SURFACES_WAVE6.md`.
- **Commander Explanation Surfaces Wave 5** — CLOSED 2026-04-04. Recommendation driver: `deriveRecommendationExplanation()` mirrors engine's 3-factor assessment formula on UI side (intel 40%, force ratio 30%, supply 30%). `RecommendationDriverSection` in OperationBriefingModal shows main blocker + improvement path for postpone/abort. No engine changes. 10 tests (Wave 15). Full suite: 2192/2192. Report: `docs/40_reports/implemented/20260404_COMMANDER_EXPLANATION_SURFACES_WAVE5.md`.
- **Acceptance Suite Stabilization Wave 1** — CLOSED 2026-04-04. 20→0 failures. All 6 files fixed: brigade_posture (12, missing sector fixture), commander_override (4, stale component/anchor data), corps_ownership (1, wrong-territory location), step_order (1, count drift), pmtiles (1, warroom origin), legacy_contracts (1, comment text). Full suite: 2182/2182. Report: `docs/40_reports/implemented/20260404_ACCEPTANCE_SUITE_STABILIZATION_WAVE1.md`.
- **Commander Explanation Surfaces Wave 4** — CLOSED 2026-04-04. Operation constraint context: `OperationConstraintContext` in OperationBriefingModal — compact corps constraint summary at decision time (badge + reason + relief). Wires existing `situationAssessment` from corps formation — no new derivation. Provenance audit confirmed commander_assessment and classifyPrimaryConstraint read disjoint state (correct). 9 tests (Wave 14). 2 parallel audit subagents + central implementation. Report: `docs/40_reports/implemented/20260404_COMMANDER_EXPLANATION_SURFACES_WAVE4.md`.
- **Commander Explanation Surfaces Wave 3** — CLOSED 2026-04-04. Relief path: `reliefPath` on `classifyPrimaryConstraint()` return — grounded "what would need to change" per constraint (deficit counts, exhaustion %, stance change, stabilization). Arrow subtitle in CorpsSituationSection. 9 tests. Orchestrated with 4 parallel subagents. Report: `docs/40_reports/implemented/20260404_COMMANDER_EXPLANATION_SURFACES_WAVE3.md`.
- **Commander Explanation Surfaces Wave 2** — CLOSED 2026-04-04. Decision-useful constraint classification. 18 tests.
- **Commander Explanation Surfaces Wave 1** — CLOSED 2026-04-04. Corps situation assessment derived on-read from CommanderState. Canonical surface: `CorpsSituationSection` in Army HQ corps card. Plan reasons now persisted via `last_plan_action`/`last_plan_reason`. 13 tests. Report: `docs/40_reports/implemented/20260404_COMMANDER_EXPLANATION_SURFACES_WAVE1.md`.
- **Command Review Consolidation Wave 2 (Wave 9)** — CLOSED 2026-04-04. Trend summary + three-tier outcome badge on history ops. Report: `docs/40_reports/implemented/20260404_COMMAND_REVIEW_CONSOLIDATION_WAVE2.md`.
- **Command Review Consolidation Wave 1 (Wave 8)** — CLOSED 2026-04-04. Outcome badge on live ops + modal entry point. Report: `docs/40_reports/implemented/20260404_COMMAND_REVIEW_CONSOLIDATION_WAVE8.md`.
- **Command Friction Wave 5 / Wave 10 (Standing + CA Consequence)** — CLOSED 2026-04-04. Recovery forecast, standing indicator, CA recovery penalty. 10 tests.
- **Command Chain Truth Waves 1-4** — CLOSED 2026-04-04. All 6 plan phases landed. 29 regression tests. Plan: `docs/plans/2026-04-03-v080x-sector-frontline-truth-plan.md`.
- **Warroom React Migration** — CLOSED 2026-04-04. 4 waves + final canvas deletion. Report: `docs/40_reports/implemented/20260404_WARROOM_LEGACY_CANVAS_DELETION.md`.

## Closed Lanes

**Closed: Commander Explanation Surfaces Waves 1–6**
Wave 1: Corps situation assessment via `deriveCorpsSituationAssessment()`. Persists `last_plan_action`/`last_plan_reason`. Canonical surface: `CorpsSituationSection`. 13 tests (Wave 11).
Wave 2: `classifyPrimaryConstraint()` with priority ordering. `dominantReason` banner + constraint badge. 18 tests (Wave 12).
Wave 3: `reliefPath` — grounded "what would need to change" per constraint (deficit counts, exhaustion %, stance, stabilization). Arrow subtitle in UI. 9 tests (Wave 13). 4 parallel subagents used (architect, UI/UX, gameplay, QA).
Wave 4: Operation constraint context — `OperationConstraintContext` in OperationBriefingModal. Compact badge+reason+relief at decision time. Wires existing situationAssessment. Provenance: assessment and constraint read disjoint state (correct). 9 tests (Wave 14). 2 audit subagents + central implementation.
Wave 5: Recommendation driver — `deriveRecommendationExplanation()` mirrors engine 3-factor assessment on UI side. `RecommendationDriverSection` shows main blocker (intel/force_ratio/supply) + improvement path. No engine changes. 10 tests (Wave 15). 2 audit subagents + central implementation.
Wave 6: Readiness trend — `deriveReadinessTrend()` derives direction from existing fields (postponement_count + commander_assessment + preparation timeline). `ReadinessTrendIndicator` between assessment badge and recommendation driver. Six directions with timeline urgency bar. No engine changes, no new persistence. 15 tests (Wave 16). 3 audit subagents + central implementation.
Total: 74 explanation surface tests across 6 waves. Hierarchy: badge → **readiness trend** → recommendation driver (tactical) → constraint context (strategic) → order interpretation → direct intervention. Silence=healthy.

**Closed: Presidential Command Friction (Waves 1-5) + Order Interpretation Preview (Waves 5-7)**
Wave 1 surfaced command strain and warlord friction in ops review. Wave 2 added strain-shaped CoS briefing and compound warnings. Wave 3 closed the friction resolution loop (per-event acknowledge buttons, IPC handler). Wave 4 added Stabilize Command Relationship action (pay CA, resolve all friction, 3-turn cooldown) and strain-gated stance (offensive blocked when compromised). Wave 5/10 added standing indicator with recovery forecast and CA recovery penalty. Order interpretation preview loop added pre-launch context (deriveOrderInterpretation), stance-change preview (deriveStanceInterpretation), and three-tier operation outcome category (ordinary/reluctant/direct intervention). Reports in `docs/40_reports/implemented/20260404_PRESIDENTIAL_COMMAND_FRICTION_WAVE4.md` and `docs/40_reports/implemented/20260404_ORDER_INTERPRETATION_PREVIEW_LOOP.md`.
Order Interpretation System Wave 1 (2026-04-04): Systematic category extension. `OrderInterpretationCategory` classifies drag type. Section fires for all reluctant assessments. Category badge in header.
Order Interpretation System Wave 2 (2026-04-04): DragFactor model. `DragSource` + `DragFactor` interface + `dragFactors: DragFactor[]` on `OrderInterpretation`. `postponementCount?` fifth param. Bullet list replaces prose in `OrderInterpretationSection`, with dominant and supporting drag factors plus intensity labels. `cautionNotice` kept as fallback. 14 focused Wave 21 drag-factor tests; full suite 2291/2291. Report: `docs/40_reports/implemented/20260404_ORDER_INTERPRETATION_SYSTEM_WAVE2.md`.
Order Interpretation System Wave 3 (2026-04-04): Consequence layer. `deriveInterventionRisk(category, commanderAssessment, severity): string | null` — category-differentiated copy for `DirectInterventionSection`. Modal-level useMemo derives category+severity, passes `interventionRisk` prop. Generic fallback preserved. 9 Wave 3 tests; 56 total; full suite 2300/2300. Report: `docs/40_reports/implemented/20260404_ORDER_INTERPRETATION_SYSTEM_WAVE3.md`.

**Closed: Command Review Consolidation (Waves 8-9)**
Wave 8 added OutcomeCategoryBadge on executing/recovery op cards with modal entry point for command decision review. Wave 9 added trend summary and three-tier badge on completed ops in history panel. Canonical owner: OperationBriefingModal (full review via CommandRecord); OperationsSection = summary surface.

**Closed: Command Chain Truth (Waves 1-4)**
Phase 1.5 front-adjacency guard (BFS ≤30 hops), assertBrigadeReachability actionable return, assigned_sub_segment_id cleared on demotion, adapter canonical-first sub-segment derivation, displacement trigger proxy-fork observable, activity zero-fill, activity summary fidelity. 29 regression tests across 4 wave files.

**Closed: Warroom React Migration + Asset Canonicalization**
4 React waves (shell foundation, runtime wiring, hotspot groups, status bar) + final canvas deletion (483 lines, 15 methods, 13 fields removed). Runtime assets canonicalized to webp (11 dead PNG twins deleted, vite MIME map updated). `warroom.ts` retains only launch/picker/iframe/bridge.

**Closed: Player Knowledge + Between-Ops Events + Command Authority**
Player knowledge wave 2: RawIntelTab removed, threat assessment uses uncertainty-qualified language and bucketed confidence. Between-ops events: Strategic Posture Review + Visit to the Front shipped for all 3 factions. Command authority vertical slice + presidential review loop: CommandRecord as canonical four-part surface, commander_assessment_at_launch snapshot, ForceLaunchBadge demoted to legacy. Presidential shell language + doctrine codification. Map-first usability restoration.

**Closed: Desktop Notification Contract**
notify.ps1 rewritten (WScript.Shell Popup canonical method). Notification delivery moved from on_stop.ps1 to run_handoff.ps1 end. Lane closed.

## Active / Open Lanes (Engine)

### Lane A — CLOSED 2026-04-04: Cross-corps drifted brigade assignment
- **Fix:** `assignCrossCorpsEnclaveDefenders` in `src/sim/combat/brigade_assignment.ts` now gates on `home_osid` coverage before assigning a brigade to a foreign-corps sector. If the brigade's `home_osid` is still in an own-corps sector's `territory_osids`, it is drifted — skip it. Only brigades with no own-corps home coverage are genuine enclave defenders.
- **Verified:** tsc PASS, build PASS, governance PASS, full suite 2300/2300, plus explicit drifted-vs-genuine-enclave regression coverage in `tests/brigade_territory_reconciliation.test.ts`.
- **Done means:** cross-corps assignment warning in next 40w end_report drops from 6 to ≤1.
- **Report:** `docs/40_reports/implemented/20260404_SECTOR_OWNERSHIP_ZERO_ATTACK_TRIAGE.md`

### Lane B — CLOSED 2026-04-04: Empty child sectors after contiguity split
- **Fix:** Territory-membership pre-pass added to `ensureMinimumSectorCoverage` in `src/sim/combat/brigade_assignment.ts`. For zero-brigade sectors with front edges, finds brigades in sibling same-corps sectors whose `location_osid` is in the zero-sector's `territory_osids`, not on the donor's frontline, and whose donor retains ≥ 1 after transfer. Moves one brigade. No BFS — territory membership is authoritative. Rejected: Option A (splitter refusal breaks geographic split contract); Option B1 (cross-component filter blocks regardless of `> 1` guard).
- **Tests:** `tests/sector_split_brigade_assignment.test.ts` — 6 regression tests (fill, move-not-copy, donor floor, skip-if-already-assigned, skip-if-no-front-edges, non-split zero-brigade left for Step 1/2).
- **Verified:** tsc PASS, build PASS, governance PASS, 2307/2307.
- **Done means:** empty_contested_sector count from splitN child sectors drops to 0 in next 40w run; undefended_front_subsegments anomaly count reduces from 6.
- **Report:** `docs/40_reports/implemented/20260404_LANE_B_EMPTY_CHILD_SECTORS_FIX.md`

### AAR Provenance Lane - OPEN
- **Symptom:** `Operation Prijedor` and `Operation Visegrad` in `n1312` finalize as `success` with `total_attacks = 0`.
- **Finding:** not a clean "not a bug." `operation_aar.ts` attributes objective-control changes to the active operation without tracking whether the capture came from combat, consolidation, or another control event.
- **Scope:** AAR/export truth, not necessarily combat-logic truth.
- **Owner:** `src/sim/combat/operation_aar.ts`
- **Priority:** below Lane B, but explicitly tracked â€” do not dismiss these cases as rear-pocket consolidation by default.

## Next Priority Lanes

1. **Execution-time probe staleness:** 6 probes with valid objectives and reachable brigades at creation time still end with 0 attacks. Root cause: execution-time staleness (4 executing-zero-attack, 2 false-completion from objective captured by other ops). 5-turn `MAX_EXECUTION_TURNS_ZERO_ATTACKS` backstop limits damage. Bounded friction, not P0. Owner: Gameplay Programmer.
2. **Residual ZEA (remaining after probe guard + supply gate):** Recovery-without-attempt reduced to 4 at final turn (execution-time staleness). vrs_east_bosnian zero-eligible anomalies eliminated by anti-paralysis supply gate (n1321).
3. **estimateForceRatio supply awareness — RE-DEMOTED 2026-04-05.** Investigated with meaningful supply differentiation (n1323). Supply blindness is real (25% overestimate for strained corps) but practically inert — defense-in-depth (supply_check gate + 30% supply assessment weight + anti-paralysis floor) already compensates. Strained-corps failures are from ZEA/staging, not estimator optimism. Revisit when estimator is upgraded to full combat power estimate (COMBAT-P14). Report: `docs/40_reports/implemented/20260405_ESTIMATE_FORCE_RATIO_SUPPLY_AWARENESS_DEMOTION.md`.
4. **P9 supply recalibration — CLOSED 2026-04-05.** Graduated scoring in `computeSupplyReadiness` + BFS corridor reachability fix. n1322: graduated scoring (adequate=1.0, strained=0.5, critical=0.0). n1323: bridge detection on full subgraph (was operating on BFS spanning tree — 100% trivially brittle). Supply readiness now: 13/21 ops at 1.0, 8/21 at 0.5 (VRS heartland adequate, ARBiH/VRS-Drina strained). Reports: `docs/40_reports/implemented/20260405_P9_SUPPLY_READINESS_GRADUATED_SCORING.md`, `docs/40_reports/implemented/20260405_BFS_CORRIDOR_REACHABILITY_FIX.md`.
5. **Formation Expert deferred recommendations:** Expand prepositioning tier to `active_defense`; relax `can_launch_ops` gate; exclude `is_home_defense`. Owner: Gameplay Programmer. File: `src/sim/combat/commander/emit.ts`.
6. **AAR provenance follow-up:** zero-attack-success operations must distinguish combat capture from passive/external control changes. Owner: `src/sim/combat/operation_aar.ts`.
7. **gradacac_2 P0 investigation:** roadmap item 1 once current engine-truth defects are no longer masking front behavior.
8. **v0.8.1 Commander Maturity gate check:** full two-tier post-run panel go/no-go on commander system.

## Validation Gate Note

- **Roadmap Validation Gate 1 — CLOSED 2026-04-04.** Command-system package validated enough to resume roadmap work. The stale `n941` comparison was resolved from repo evidence: `n941` is an older run artifact, not the current HEAD baseline. `n1302` remains the calibration ATH reference for this phase. Report: `docs/40_reports/implemented/20260404_ROADMAP_VALIDATION_GATE_1_COMMAND_SYSTEM_REALITY_CHECK.md`.

## Open Questions

- Which remaining player-facing surfaces still leak staff certainty or internal jargon?
- What is the right scope for strain sources beyond force-launch and warlord friction?
- Which Warroom overlays should expand (StatusBar towards campaign pulse) vs remain pure handoffs?

## Infrastructure / Process Watchlist

- `tools/architect/` is now landed and usable as the canonical repo-local architect-to-executor handoff system. Future cleanup should focus on ergonomics and reliability, not whether the system exists.
- Do not rely on chat memory for accepted findings or next lanes; update this file when major architect decisions change.
- Bundle roadmap-memory follow-ups into Claude prompts when they are part of the same lane.
- Explorer findings should be summarized here after review instead of staying only in chat.
