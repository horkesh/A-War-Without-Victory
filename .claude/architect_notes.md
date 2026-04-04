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

- **Order Interpretation System Wave 2** — CLOSED 2026-04-04. DragFactor model: DragSource + DragFactor interface + dragFactors: DragFactor[] on OrderInterpretation. deriveOrderInterpretation extended with postponementCount? param. Bullet list replaces prose in OrderInterpretationSection (● primary, ○ secondary). postponementCount={postponements} at call site. cautionNotice kept as fallback for backward compat. ~15 tests (Wave 21). Full suite: [QA to confirm]. Report: `docs/40_reports/implemented/20260404_ORDER_INTERPRETATION_SYSTEM_WAVE2.md`.
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
Order Interpretation System Wave 2 (2026-04-04): DragFactor model. `DragSource` + `DragFactor` interface + `dragFactors: DragFactor[]` on `OrderInterpretation`. `postponementCount?` fifth param. Bullet list (● primary, ○ secondary) replaces prose in `OrderInterpretationSection`. `cautionNotice` kept as fallback. ~15 tests (Wave 21). Report: `docs/40_reports/implemented/20260404_ORDER_INTERPRETATION_SYSTEM_WAVE2.md`.

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

## Next Priority Lanes

1. ~~**Expand strain sources:**~~ DONE (Wave 6). Corps exhaustion ≥50/≥75 now contributes to strain.
2. ~~**Order Interpretation System Wave 1:**~~ DONE (2026-04-04). ~~**Order Interpretation System Wave 2:**~~ DONE (2026-04-04). DragFactor model + bullet list UI. Next: **Order Interpretation Wave 3** — category-driven consequences (e.g. feasibility_constrained blocks Direct Intervention option); OR commander competence penalty from strain (needs a real competence field to write to cleanly).
3. **gradacac_2 P0 investigation:** RS overperforming on newly-covered fronts — pre-existing
4. **vrs_east_bosnian zero-attack ops:** all non-Koridor total_attacks=0 — BFS reachability or stale objective filter (part of 39% ZEA anomaly)
5. **v0.8.1 Commander Maturity gate check:** full two-tier post-run panel go/no-go on commander system

## Open Questions

- Which remaining player-facing surfaces still leak staff certainty or internal jargon?
- What is the right scope for strain sources beyond force-launch and warlord friction?
- Which Warroom overlays should expand (StatusBar towards campaign pulse) vs remain pure handoffs?

## Infrastructure / Process Watchlist

- `tools/architect/` is now landed and usable as the canonical repo-local architect-to-executor handoff system. Future cleanup should focus on ergonomics and reliability, not whether the system exists.
- Do not rely on chat memory for accepted findings or next lanes; update this file when major architect decisions change.
- Bundle roadmap-memory follow-ups into Claude prompts when they are part of the same lane.
- Explorer findings should be summarized here after review instead of staying only in chat.
