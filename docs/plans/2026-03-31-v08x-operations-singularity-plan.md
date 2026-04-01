# v0.8.x Operations Singularity

**Date:** 2026-03-31  
**Status:** PLAN - READY FOR EXECUTION  
**Roadmap slot:** v0.8.x-final, with direct gating impact on v0.8.1 and later milestones  
**Overseer:** Orchestrator  
**Architect:** Technical Architect / Architect - may make ownership decisions but must flag them for user review  
**Primary implementer roles:** Technical Architect, Gameplay Programmer, UI/UX Developer, Systems Programmer  
**Primary reviewer roles:** Authority Auditor, UI Truth Keeper, `/simplify`, Code Review  
**Sign-off:** Orchestrator, Architect, War-or-Game, Modern Wargame Expert for UI-truth-facing phases  
**Purpose:** Make operations the first truly singular command object in the game

**Relevant life lessons to respect while executing:**
- `docs/life_lessons.md`: Decisions without traces are undebuggable - instrument before investigating
- `docs/life_lessons.md`: Fix the symptom in ALL callers - verify the actual code path uses the function you changed
- `docs/life_lessons.md`: Build diagnostic tools, not one-off scripts
- `docs/life_lessons.md`: Gap finder asks the questions nobody else thinks to ask - use before architectural work
- `docs/life_lessons.md`: Calibration % means nothing if reached through broken mechanics

---

## 0. Why This Exists

The roadmap already says operations are the first command object that must become singular and authoritative.

The problem is that this truth was stronger in prose than in milestone structure.
This plan makes it actionable.

Operations are the right proving ground because they sit at the intersection of:

- commander intent
- player authorization
- brigade commitment
- preparation and execution
- diagnostics and AAR
- map/UI explanation

If operations are still split, no later commander-maturity, political-bot, or LLM milestone is standing on solid ground.

---

## 1. Existing Scaffolding

The repo already has real operations scaffolding.
That is the good news.

### 1.1 Existing engine spine

The strongest current operations spine is:

- `src/sim/combat/sector_offensive.ts`
- `src/sim/combat/operation_preparation.ts`
- `src/sim/combat/operation_prediction.ts`
- `src/sim/combat/bot_brigade_ai_osid.ts`
- `src/scenario/combat_causality.ts`

What already exists there:

- lifecycle ownership
- preparation sub-phases
- execution/recovery logic
- brigade execution focus
- diagnostics around stalled/invalid operations

### 1.2 Existing state and helper scaffolding

The repo already has supporting scaffolding for operations:

- `corps_operation_helpers.ts`
- active operations on corps command state
- operation history fields in commander state
- AAR handling
- preparation event flow
- reinforcement/loan helpers

This means the plan does not need to invent operations from zero.

### 1.3 Existing design/spec docs

There is already meaningful planning material to build on:

- `docs/plans/2026-03-29-concurrent-corps-operations.md`
- `docs/30_planning/MULTI_BRIGADE_OPERATION_DESIGN_SPEC.md`
- `docs/30_planning/OPERATION_REEVALUATION_DESIGN_SPEC.md`
- `docs/plans/2026-03-22-operation-detail-redesign.md`

These are useful, but they are not yet one singular ops-consolidation plan.

### 1.4 Existing UI surfaces

The UI already has real operations surfaces:

- `OpsPlanningModal.tsx`
- `OperationBriefingModal.tsx`
- `OperationsPanel.tsx`
- `CorpsFrontPanel.tsx`
- `OperationsSection.tsx`

This is good scaffolding, but it currently supports a more unified fantasy than the backend fully guarantees.

---

## 2. Current Architectural Problem

Operations are serious, but not singular.

Today the repo still presents more than one partially authoritative operations world:

### Canonical-looking path

- `sector_offensive.ts`
- `operation_preparation.ts`
- `operation_prediction.ts`

### Legacy / parallel path

- `bot_corps_operations.ts`

### UI / IPC path that can bypass discipline

- `electron-main.cjs`
- UI components that stage operation objects more directly than they should

This creates three risks:

1. maintainers cannot say with confidence which lifecycle is authoritative
2. the player can experience a cleaner operations story than the backend actually supports
3. later AI work can accidentally build on split truth

---

## 3. Definition Of Done

Operations singularity is complete only when all of the following are true:

1. one canonical operation object exists
2. one canonical lifecycle exists
3. one canonical creation / launch / update path exists
4. old operation catalogs or parallel lifecycles are removed, demoted, or explicitly non-authoritative
5. UI surfaces read as scoped views of the same underlying object
6. diagnostics and player-facing SITREP language are derived from the same underlying truth

If any of those are false, operations are not yet singular.

---

## 4. Canonical Owner Recommendation

### Canonical lifecycle owner

`sector_offensive.ts`

Reason:

- it already states the lifecycle clearly
- it already owns execution/recovery semantics
- it already integrates with preparation and brigades

### Canonical preparation owner

`operation_preparation.ts`

### Canonical predictive / advisory owner

`operation_prediction.ts`

### Canonical brigade execution consumer

`bot_brigade_ai_osid.ts`

### Canonical launch-model direction

`docs/plans/2026-04-01-v08x-sector-anchored-corps-operations-plan.md`

Operations should launch as:

- sector-anchored
- corps-authorized
- reinforcement-bounded

This is the target launch contract inside the canonical operations world.
It does not create a second ops architecture.

### Demoted / transitional path

`bot_corps_operations.ts`

This file should not remain a peer operation world.
It should either:

- be reduced to thin compatibility helpers
- be folded into the canonical operations path
- or be removed

---

## 5. Pyrrhic Execution Plan

### Phase 1. Declare Canonical Ownership (~1 session)

**Assigned to:** Technical Architect  
**Reviewer:** Authority Auditor, `/simplify`, Code Review  
**Sign-off:** Orchestrator, Architect

Goal:
Stop ambiguity before deeper cleanup.

Tasks:

- [ ] `src/sim/combat/sector_offensive.ts` - add top-of-file ownership comment naming it canonical lifecycle owner
- [ ] `src/sim/combat/operation_preparation.ts` and `operation_prediction.ts` - add ownership comments naming their bounded role
- [ ] `src/sim/combat/bot_corps_operations.ts` - mark as transitional / legacy / non-authoritative if that remains true after the audit
- [ ] Engineering docs - update the relevant roadmap / audit / engineering docs so the canonical operation path is named directly

**Deliverables:**
- explicit canonical-owner declaration in code
- explicit demoted-path declaration for legacy ops path
- docs aligned with ownership truth

**Done gate:**
- a maintainer can answer "what owns operations?" without hesitation

→ `/simplify` → smoke-test triad → verification-before-completion → pre-commit-check → commit

### Phase 2. Collapse Runtime Lifecycle Split (~1-2 sessions)

**Assigned to:** Gameplay Programmer + Systems Programmer  
**Reviewer:** Authority Auditor, `/simplify`, Code Review  
**Sign-off:** Orchestrator, Architect, War-or-Game

Goal:
Ensure there is one true lifecycle.

Tasks:

- [ ] Audit all create / advance / reevaluate / recovery paths and inventory every live lifecycle owner
- [ ] Remove or demote duplicate lifecycle ownership so `bot_corps_operations.ts` no longer acts as a peer manager
- [ ] Ensure all live operations that matter flow through the canonical lifecycle owner
- [ ] Add a deterministic diagnostic or assertion proving no parallel lifecycle path remains live

**Deliverables:**
- one live lifecycle owner
- removed or demoted peer lifecycle path
- diagnostic proof that lifecycle truth is singular

**Done gate:**
- there is one place to look for planning -> execution -> recovery truth

→ `/simplify` → smoke-test triad → verification-before-completion → pre-commit-check → commit

### Phase 3. Unify Creation / Launch / Update Path (~1-2 sessions)

**Assigned to:** Gameplay Programmer + Technical Architect  
**Reviewer:** Authority Auditor, `/simplify`, Code Review  
**Sign-off:** Orchestrator, Architect, War-or-Game

Goal:
Stop operation objects from being born in inconsistent ways.

Tasks:

- [ ] Identify the single canonical creation path for player and AI operations
- [ ] align launch semantics with `docs/plans/2026-04-01-v08x-sector-anchored-corps-operations-plan.md`
- [ ] Reduce or remove direct raw operation-object staging through desktop IPC where it bypasses the command model
- [ ] Ensure launch / postpone / halt / probe updates go through the same command path
- [ ] Add boundary comments naming which layers may create or mutate operation records

**Deliverables:**
- one creation path
- one mutation path
- explicit mutation boundaries

**Done gate:**
- player and AI are no longer creating conceptually different operation records

→ `/simplify` → smoke-test triad → verification-before-completion → pre-commit-check → commit

### Phase 4. Align UI Truth With Engine Truth (~1-2 sessions)

**Assigned to:** UI/UX Developer + Technical Architect  
**Reviewer:** UI Truth Keeper, Modern Wargame Expert, `/simplify`  
**Sign-off:** Orchestrator, Architect

Goal:
Make the UI reflect the real model instead of a cleaner imagined one.

Tasks:

- [ ] Define one canonical operation card/state model shared by all operations surfaces
- [ ] Fix identity mismatches such as incorrect commander labeling
- [ ] Make blockers, pending decisions, and last-change reasons visible
- [ ] Ensure `OpsPlanningModal.tsx`, `OperationBriefingModal.tsx`, `OperationsPanel.tsx`, and sibling surfaces describe the same lifecycle and same object identity

**Deliverables:**
- shared UI-facing operation model
- consistent commander / lifecycle labeling
- visible blockers and pending state

**Done gate:**
- the player can tell what an operation is, what phase it is in, and why it is stalled or launching

→ `/simplify` → smoke-test triad → verification-before-completion → pre-commit-check → commit

### Phase 5. Align Diagnostics And Player Explanation (~1 session)

**Assigned to:** Gameplay Programmer + QA Engineer  
**Reviewer:** Operations Reality Checker, UI Truth Keeper, `/simplify`  
**Sign-off:** Orchestrator, Architect, War-or-Game

Goal:
Reuse engineering truth for player meaning.

Tasks:

- [ ] Use the same underlying facts for both causality diagnostics and player-facing operational explanation
- [ ] Translate internal facts like zero-eligible-attackers or movement-only execution into commander-readable status
- [ ] Define the minimum operation history log format and ensure it is shared between diagnostics and UI-facing explanation
- [ ] Add at least one regression check proving the UI/reporting story matches the engine’s operation state

**Deliverables:**
- unified ops explanation vocabulary
- minimum operation history schema
- regression proof that diagnostics and UI tell the same story

**Done gate:**
- diagnostics and player SITREP stop telling different stories about the same operation

→ `/simplify` → smoke-test triad → verification-before-completion → pre-commit-check → commit

---

## 6. Recommended Acceptance Checks

The following checks should exist before calling this complete:

### Ownership checks

- one documented canonical owner
- one documented demoted path

### Lifecycle checks

- operation creation path is singular
- launch/update/recovery path is singular

### UI truth checks

- all main ops surfaces show the same commander identity
- all main ops surfaces use the same phase language
- blockers and pending decisions are visible

### Diagnostic truth checks

- the same underlying operation facts drive engineering diagnostics and player-facing explanation

---

## 7. Protocol Enforcement

- [ ] Orchestrator oversees all phases
- [ ] Architect flags ownership / data-flow decisions for user review
- [ ] `.claude/napkin.md` is read at session start and updated during execution
- [ ] `docs/PROJECT_LEDGER.md` is updated for major ownership / lifecycle / UI-truth changes
- [ ] `docs/life_lessons.md` is scanned before each phase and relevant lessons are named in the phase kickoff
- [ ] `npx tsc --noEmit`, `npm run test:vitest`, and `npm run desktop:map:build` run after every phase
- [ ] `/verification-before-completion` and `/awwv-pre-commit-check` run before phase closeout
- [ ] engine and UI changes remain in separate commits unless a shared commit is explicitly justified
- [ ] `/create-report` writes a completion report to `docs/40_reports/implemented/` when this milestone closes

## 8. Completion Checklist

- [ ] Completion report created in `docs/40_reports/implemented/`
- [ ] `docs/plans/MASTER_ROADMAP.md` updated if gating language or status changed during execution
- [ ] `docs/40_reports/audits/20260330_REPO_HEALTH_CONSOLIDATED.md` updated if canonical-owner recommendations changed materially
- [ ] `docs/PROJECT_LEDGER.md` appended with major completion notes
- [ ] `.claude/napkin.md` updated with recurring operations-authority lessons
- [ ] relevant engineering / canon docs updated if operation lifecycle or UI contract changed
- [ ] `package.json` version bumped when the milestone completes
- [ ] version tag created and pushed when the milestone completes

## 9. What This Unblocks

This plan is the gate before:

- `v0.8.1` Commander Maturity
- `v0.8.2` Political Leader Bot
- `v0.8.3` Order Interpretation
- `v0.9.1` Ops modal overhaul

Those milestones can add cognition, politics, or polish.
This plan makes sure they are all building on one real command object.

---

## 10. Summary For Implementers

The repo already has a real operations engine hiding inside it.
The work is not to invent operations.
The work is to make the repo admit which operations system is real.

The shortest implementation brief is:

- declare the canonical owner
- demote the peer lifecycle
- unify creation and mutation paths
- align UI truth with engine truth
- align diagnostics with player explanation

If this work ends with “operations still mostly work, but in several ways,” it failed.
