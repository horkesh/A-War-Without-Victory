# Post-1.0 Content Execution Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Provide execution-grade planning coverage for the Master Roadmap post-1.0 updates without letting old post-launch tables conflict with the current roadmap.

**Architecture:** Each post-1.0 update is treated as an expansion with its own scenario/content contract, compatibility rule, and proof bar. This plan is a coverage plan; individual updates should receive deeper child plans when they are promoted into active development.

**Tech Stack:** Scenario JSON, event system, essays/Codex, tactical map UI, Electron packaging, optional future API systems.

---

## Authoritative Post-1.0 Order

The authoritative order is the Master Roadmap:

1. `1.0.x` Day-one patch
2. `1.1.0` Mother Tongue
3. `1.2.0` Autumn Leaves
4. `1.3.0` The Silence
5. `1.4.0` The Other Side's Briefing
6. `1.5.0` Operation Corridor
7. `1.6.0` Deliberate Force
8. `1.7.0` The War Room
9. `2.0.0` Claude API at corps level

`docs/plans/2026-03-16-v1.0.0-gold.md` has an older post-1.0 table and is superseded for post-launch ordering.

## Update Plan Coverage

| Update | Existing Coverage | Gap |
|---|---|---|
| 1.0.x Day-one patch | v1 gold / final QA plans | Needs release triage procedure at launch time |
| 1.1 Mother Tongue | `2026-03-16-v0.7.2-localization.md` | Plan exists but must be retargeted from v0.7.2 to post-1.0 |
| 1.2 Autumn Leaves | Event research and emergent event design | Needs start-date scenario plan when active |
| 1.3 The Silence | `_completed/2026-03-16-v0.5.3-audio.md`, Legendary Features | Needs post-1.0 audio degradation child plan |
| 1.4 Other Side's Briefing | Legendary Features brainstorm only | Needs new child plan when active |
| 1.5 Operation Corridor | Calibration reports, Operation Corridor evidence | Needs Posavina expansion child plan when active |
| 1.6 Deliberate Force | Emergent event design, COMBAT_MASTER air-support note | Needs NATO mechanics child plan when active |
| 1.7 The War Room | AI commander design / business model only | Needs scenario-editor and streaming narrator child plans |
| 2.0 Claude API at corps level | Claude AI commander design | Needs save-breaking v2 architecture plan |

## Task 1: Retarget Localization For 1.1

**Files:**
- Modify: `docs/plans/2026-03-16-v0.7.2-localization.md`
- Modify: `docs/plans/MASTER_ROADMAP.md` if status language drifts

**Steps:**
1. Add a note that the plan is supporting input for `v1.1.0 Mother Tongue`, not an active v0.7.2 milestone.
2. Keep the implementation phases, but require post-1.0 string freeze before execution.
3. Verification: Master Roadmap and localization plan do not disagree on timing.

## Task 2: Child Plan Trigger For 1.2 Historical Starts

**Files:**
- Reference: `docs/40_reports/1993_EVENT_RESEARCH.md`
- Reference: `docs/40_reports/BOSNIAK_CROAT_CONFLICT_MASTER.md`
- Reference: `data/scenarios/*.json`

**Steps:**
1. When `v1.2` opens, create `docs/plans/YYYY-MM-DD-v12-autumn-leaves-historical-starts-plan.md`.
2. Include April 1993, April 1994, and January 1995 scenario manifests, events, OOB/state snapshots, calibration targets, and tutorial deltas.
3. Verification: each new start has anchor checks, baseline expectations, and content deltas.

## Task 3: Child Plan Trigger For The Silence

**Files:**
- Reference: `docs/plans/_completed/2026-03-16-v0.5.3-audio.md`
- Reference: `docs/30_planning/design/LEGENDARY_FEATURES_BRAINSTORM.md`

**Steps:**
1. When `v1.3` opens, create `docs/plans/YYYY-MM-DD-v13-the-silence-audio-degradation-plan.md`.
2. Reuse the audio-engine plan only as implementation substrate.
3. Add degradation rules keyed to war week, displacement, casualties, shelling, and ceasefire.
4. Verification: audio never glamorizes violence and remains optional/accessibility-safe.

## Task 4: Child Plan Trigger For Other Side's Briefing

**Files:**
- Reference: `src/sim/combat/commander/briefing.ts`
- Reference: `src/ui/map/components/army_hq/*`
- Reference: `docs/30_planning/design/LEGENDARY_FEATURES_BRAINSTORM.md`

**Steps:**
1. When `v1.4` opens, create `docs/plans/YYYY-MM-DD-v14-other-sides-briefing-plan.md`.
2. Define information limits: what the enemy briefing may reveal and what remains fogged.
3. Add consent/trigger rules for when the player can view enemy perspective.
4. Verification: briefing humanizes enemy command without becoming an omniscient debug panel.

## Task 5: Child Plan Trigger For Operation Corridor

**Files:**
- Reference: `docs/40_reports/CALIBRATION_MASTER.md`
- Reference: `docs/30_planning/OPERATION_REEVALUATION_DESIGN_SPEC.md`
- Reference: `data/scenarios/*`

**Steps:**
1. When `v1.5` opens, create `docs/plans/YYYY-MM-DD-v15-operation-corridor-posavina-expansion-plan.md`.
2. Scope expanded Brcko/Orasje scenarios, VRS 1KK operations, HVO Posavina defense, and calibration proof.
3. Verification: expansion does not destabilize canonical April 1992 campaign baselines.

## Task 6: Child Plan Trigger For Deliberate Force

**Files:**
- Reference: `docs/20_engineering/EMERGENT_CASCADE_ARCHITECTURE.md`
- Reference: `docs/40_reports/COMBAT_MASTER.md`
- Reference: `data/scenarios/events/*`

**Steps:**
1. When `v1.6` opens, create `docs/plans/YYYY-MM-DD-v16-deliberate-force-nato-intervention-plan.md`.
2. Decide whether NATO is event-only, combat modifier, or multi-turn campaign before coding.
3. Require sensitive-history review for intervention triggers tied to atrocity events.
4. Verification: Deliberate Force has military effect, political consequence, and no calendar railroad.

## Task 7: Child Plan Trigger For v1.7 And v2.0 AI Work

**Files:**
- Reference: `docs/30_planning/design/CLAUDE_AI_COMMANDER_DESIGN.md`
- Reference: `src/sim/combat/commander/*`

**Steps:**
1. For `v1.7`, split scenario-editor assistant and streaming narrator into separate child plans.
2. For `v2.0`, create a save-breaking architecture plan before any implementation.
3. Verification: AI features do not enter v1.x as hidden deterministic-state dependencies.

## Done Means

- Every post-1.0 roadmap update has either an existing plan, a supporting plan, or an explicit child-plan trigger.
- Current Master Roadmap ordering wins over old launch-plan tables.
- No post-1.0 feature can start without a scoped child plan.
