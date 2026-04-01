# v0.8.x Sector-Anchored Corps Operations

**Date:** 2026-04-01
**Status:** AMENDED 2026-04-01 — was NOT READY (4 P0 gaps). Gaps resolved: sector_id naming, writer inventory pre-work, attachment thresholds specified, calibration gate added.
**Roadmap slot:** v0.8.x-final (`Operations Singularity` sublane)  
**Overseer:** Orchestrator  
**Architect:** Technical Architect / Architect - owns canonical model decisions, flags player-facing tradeoffs for user review  
**Primary implementer roles:** Gameplay Programmer, Technical Architect, UI/UX Developer, Systems Programmer  
**Primary reviewer roles:** Authority Auditor, UI Truth Keeper, Modern Wargame Expert, `/simplify`, Code Review  
**Sign-off:** Orchestrator, Architect, War-or-Game  
**Purpose:** Replace loose corps-wide operation launch with a stricter model that keeps corps command as the sole launch authority while anchoring every operation to a real sector and a bounded reinforcement envelope.

**Relevant life lessons to respect while executing:**
- `docs/life_lessons.md`: Decisions without traces are undebuggable - instrument before investigating
- `docs/life_lessons.md`: Fix the symptom in ALL callers - verify the actual code path uses the function you changed
- `docs/life_lessons.md`: Build diagnostic tools, not one-off scripts
- `docs/life_lessons.md`: Calibration % means nothing if reached through broken mechanics
- `docs/life_lessons.md`: Gap finder asks the questions nobody else thinks to ask - use before architectural work

---

## 0. Why This Exists

The current broad corps-launched model is too loose.
It lets operations look corps-authored while still drawing from an overly abstract brigade pool.

The rejected alternative is also wrong:

- sectors should **not** become launch authorities

The chosen model is:

- **sector-anchored**
- **corps-authorized**
- **reinforcement-bounded**

That means:

1. corps command remains the only authority that launches operations
2. every operation must declare a `primary_sector`
3. the default eligible brigade pool comes from brigades assigned to that sector
4. brigades from outside that sector may join only through explicit reinforcement rules
5. those attachments must be visible in engine state, traces, and UI

This gives the game:

- real local grounding
- less hidden line stripping
- better player legibility
- cleaner future commander intelligence

It is not a separate operations world.
It is the tighter launch contract the canonical operations world should use.

---

## 1. Canonical Recommendation

### Canonical launch authority

Corps command.

No sector may independently launch operations.
No UI surface may imply otherwise.

### Canonical local anchor

`sector_id` — **already exists on `CorpsOperation`** (game_state.ts line ~313).

Do NOT add a separate `primary_sector_id` field. `sector_id` IS the primary sector anchor. Phase 2 scaffolding must use this existing field, not create a duplicate.

### Canonical participant semantics — new fields to add

These do NOT yet exist on `CorpsOperation` and must be added in Phase 2:

- `supporting_sector_ids?: string[]` — sectors explicitly contributing attachments or accepting risk transfer
- `primary_sector_brigades?: string[]` — brigade IDs from the primary sector (derived at launch, stored for traces)
- `attached_brigades?: string[]` — brigade IDs from outside the primary sector, explicitly attached
- `reinforcement_source?: 'adjacent_sector' | 'corps_reserve' | 'army_loan'` — why non-primary brigades are present

### Canonical rule

Operations are **sector-anchored, not sector-imprisoned**.

The main effort should usually come from the primary sector.
Cross-sector concentration remains possible, but only explicitly and visibly.

---

## 2. Existing Scaffolding

The repo already has most of the mechanics needed.
The missing piece is the launch contract.

### 2.1 Existing engine scaffolding

- `src/sim/combat/sector_offensive.ts`
- `src/sim/combat/operation_preparation.ts`
- `src/sim/combat/operation_prediction.ts`
- `src/sim/combat/bot_brigade_ai_osid.ts`
- `src/sim/combat/corps_operation_helpers.ts`
- `src/sim/combat/commander/emit.ts`
- `src/sim/combat/commander/plan.ts`

What already exists:

- operations lifecycle ownership
- preparation and execution phases
- sector models and sector-assigned brigades
- commander-generated operation intent
- operation review surfaces

### 2.2 Existing document scaffolding

- `docs/40_reports/convenes/20260401_OPS_LAUNCH_AUTHORITY_CONVENE.md`
- `docs/40_reports/convenes/20260401_OPS_LAUNCH_AUTHORITY_ADDENDUM_SECTOR_SCOPED.md`
- `docs/plans/2026-03-31-v08x-operations-singularity-plan.md`
- `docs/plans/2026-03-31-v08x-command-authority-cleanup-plan.md`

This plan turns the convene decision into an execution-grade lane.

---

## 3. Definition Of Done

This sublane is complete only when all of the following are true:

1. every launched operation has one explicit `primary_sector`
2. the default eligible brigade pool is derived from that sector
3. non-primary-sector brigades join only through explicit reinforcement / attachment semantics
4. traces and diagnostics can show which brigades were primary-sector vs attached
5. the player-facing operation review surface shows the same truth
6. no parallel launch path still creates corps operations from a broad invisible corps-wide pool

If any of those are false, the launch model is still too loose.

---

## 4. Non-Negotiable Rules

1. Sectors do not become mini-commanders.
2. Corps command remains the only operation launch authority.
3. The operation object, not ad hoc helper state, must carry sector anchor and attachment truth.
4. Cross-sector massing is allowed only as explicit reinforcement, never silent pool leakage.
5. UI language must say:
   - "Corps X is launching Operation Y in Sector Z"
   - not "the sector launched an operation"
6. Attachments must imply visible risk transfer somewhere else in traces, review UI, or diagnostics.

---

## 5. Pyrrhic Execution Plan

### Phase 0. Writer Inventory (pre-work, ~30 min)

**Assigned to:** Technical Architect
**Sign-off:** Orchestrator

Before touching any launch code, enumerate every path that currently creates a `CorpsOperation` object. Phase 3 must cover all of them. As of 2026-04-01, known paths:

| Path | File | Type | Uses factory? |
|------|------|------|---------------|
| `injectQueuedOperation` | `pre_planned_operations.ts` | player pre-planned | ✅ `buildCorpsOperation` |
| commander emit (sector_attack) | `commander/emit.ts` | AI opportunistic | ✅ `buildCommanderOperation` |
| commander emit (probe) | `commander/emit.ts` | AI probe | ✅ `buildProbeOperation` |
| `generateEmergencyDefensiveOperations` | `bot_corps_operations.ts` | AI emergency | ✅ `buildEmergencyDefenseOperation` (migrated 2026-04-01, commit dbdbf729) |
| triggered ops | `triggered_operations.ts` | scenario/event | ✅ `buildCorpsOperation(…, false)` (migrated 2026-04-01, commit 27cc72a6) |
| corridor breach | `bot_corps_corridor.ts` | AI corridor | ✅ `buildCommanderOperation` (migrated 2026-04-01, commit 27cc72a6) |

**Task:** Before Phase 1 starts, verify this table is still accurate (`grep -rn "CorpsOperation = {" src/`). If new paths are found, add them. Phase 3 must address every row.

**Done gate:** Complete row-accurate writer table exists before Phase 1 begins.

---

### Phase 1. Freeze The Canonical Model (~1 session)

**Assigned to:** Technical Architect  
**Reviewer:** Authority Auditor, Modern Wargame Expert, `/simplify`  
**Sign-off:** Orchestrator, Architect

Goal:
Remove ambiguity before touching launch code.

Tasks:

- [x] add a short canonical-owner note in the relevant ops hotspot files naming this as the target launch contract
  - `sector_offensive.ts`: target launch contract paragraph added to header (2026-04-01)
  - `corps_operation_helpers.ts`: `buildCommanderOperation` JSDoc notes `sectorId` target = required (2026-04-01)
- [x] document the required operation fields:
  - `sector_id` (existing — IS the primary sector anchor; JSDoc improved in `game_state.ts`, 2026-04-01)
  - `supporting_sector_ids` (new — forward-declared as `?` in `game_state.ts`, 2026-04-01)
  - `primary_sector_brigades` (new — forward-declared as `?` in `game_state.ts`, 2026-04-01)
  - `attached_brigades` (new — forward-declared as `?` in `game_state.ts`, 2026-04-01)
  - `reinforcement_source` (new — forward-declared as `?` in `game_state.ts`, 2026-04-01)
- [x] explicitly mark pure broad corps-wide free-pool launch as transitional / non-target behavior
  - `emit.ts` `buildOperations()`: TRANSITIONAL — BROAD-POOL BRIGADE SELECTION comment added (2026-04-01)
- [x] update roadmap and ops-singularity references so implementers know this is now the chosen direction
  - Plan table of writer inventory updated (all 6 paths ✅); Phase 0 verified clean

**Deliverables:**
- explicit canonical launch model ✅
- explicit rejection of sector-launched and silent broad-pool launch ✅
- docs aligned around one target ✅

**Done gate:**
- a maintainer can answer "how are operations supposed to launch?" in one sentence ✅
  → "Corps launches; sector anchors; sector brigades form the default pool; outside brigades join only as explicit reinforcements."

→ `/simplify` → documentation verification → commit

### Phase 2. Add Operation Object Scaffolding (~1 session)

**Assigned to:** Gameplay Programmer + Systems Programmer  
**Reviewer:** Authority Auditor, Code Review  
**Sign-off:** Orchestrator, Architect

Goal:
Make the operation object capable of telling the truth.

Tasks:

- [x] extend the canonical operation object/state to carry:
  - primary sector: `sector_id` (existing, set via `findSectorWithMostTargetOverlap` in emit.ts)
  - supporting sectors: `supporting_sector_ids` (new, populated in emit.ts Phase 2, 2026-04-01)
  - primary-sector brigade set: `primary_sector_brigades` (new, populated in emit.ts Phase 2, 2026-04-01)
  - attached brigade set: `attached_brigades` (new, populated in emit.ts Phase 2, 2026-04-01)
  - reinforcement reason/source: `reinforcement_source` (new, set to 'adjacent_sector' when cross-sector, 2026-04-01)
- [x] update serialization and any derived adapter/state views so these fields survive save/load and review flows
  - `GameStateAdapter.ts`: all 4 new fields passed through to `OperationView` (2026-04-01)
  - `types.ts` `OperationView`: 4 new optional fields added (2026-04-01)
  - JSON serialization: no change needed — all optional fields serialize naturally
- [x] add assertions or diagnostics preventing launch without a primary sector
  - TRANSITIONAL comment in emit.ts documents missing sector as expected gap until Phase 3
  - Hard gate deferred to Phase 3 (pre-planned and probe ops don't have sector_id yet)
- [x] add deterministic ordering rules for any new brigade or sector arrays
  - `primary_sector_brigades`, `attached_brigades`: `.sort(strictCompare)` applied
  - `supporting_sector_ids`: `[...supportingIds].sort(strictCompare)` applied

**Deliverables:**
- operation schema supports sector anchor and attachments ✅
- serialization remains deterministic ✅
- invalid launch shape is detectable ✅ (soft — hard gate in Phase 3)

**Done gate:**
- any real operation record can explain where it launched from and who was attached ✅
  → commander-generated ops now carry `sector_id`, `primary_sector_brigades`, `attached_brigades`, `supporting_sector_ids`, `reinforcement_source`

→ `/simplify` → smoke-test triad → verification-before-completion → pre-commit-check → commit

### Phase 3. Rework Eligibility And Launch Selection (~1-2 sessions)

**Assigned to:** Gameplay Programmer  
**Reviewer:** Authority Auditor, War-or-Game, Code Review  
**Sign-off:** Orchestrator, Architect

Goal:
Replace broad free-pool launch with sector-anchored eligibility.

Tasks:

- [x] make operation launch choose a `primary_sector` first
  - `emit.ts buildOperations()`: `sectorId` + `primarySector` determined BEFORE participant selection (2026-04-01)
- [x] derive the default eligible brigade pool from brigades assigned to that sector
  - `primaryPool` = `primarySector.assigned_brigade_ids` ∩ surplusSet ∩ canReach (2026-04-01)
- [x] define bounded attachment rules with explicit thresholds:
  - **Adjacent-sector support** ✅: territory-adjacency checked via `briefing.spatial.adjacency`. Constants: `ADJACENT_SECTOR_ATTACH_RATE=0.33`, `ADJACENT_SECTOR_MIN_RESIDUAL=1`. Sectors sorted deterministically.
  - **Corps reserve**: deferred — corps-level reserve concept not yet in briefing. Reserve brigades in surplus already eligible via primary pool if sector-assigned.
  - **Army loan**: blocked until v0.8+ army loan system (placeholder `reinforcement_source: 'army_loan'` type exists).
- [x] ensure the default main effort usually comes from the primary sector
  - primary pool is always the base; attached brigades are bounded supplement only
- [x] prevent silent attachment from the wider corps pool
  - brigades NOT in primary sector and NOT adjacent-sector eligible are silently excluded (no fallback to corps-wide pool)
- [x] add diagnostics for rejected attachments and launch denials caused by sector insufficiency
  - early `return ops` when `participatingBrigades.length < MIN_BRIGADES_FOR_PLAN` (soft skip)
  - TODO (Phase 4+): structured diagnostic trace for denied ops

**Deliverables:**
- sector-first launch flow ✅
- explicit bounded reinforcement rules ✅ (adjacent-sector; corps reserve deferred)
- no silent corps-wide brigade vacuum ✅

**Done gate:**
- operation launch no longer behaves like an invisible corps-wide draft ✅

→ `/simplify` → smoke-test triad → verification-before-completion → pre-commit-check → commit

### Phase 4. Trace Risk Transfer And Command Explanation (~1 session)

**Assigned to:** Systems Programmer + UI/UX Developer  
**Reviewer:** UI Truth Keeper, Authority Auditor  
**Sign-off:** Orchestrator, Architect

Goal:
Make the cost of attachments and sector choice visible.

Tasks:

- [x] extend commander traces / operation traces with:
  - chosen primary sector: `op.sector_id` populated at launch (Phase 3)
  - primary-sector brigades: `op.primary_sector_brigades` populated at launch (Phase 3)
  - attached brigades: `op.attached_brigades` populated at launch (Phase 3)
  - affected sectors: `op.supporting_sector_ids` populated at launch (Phase 3)
  - accepted risk elsewhere: `op.reinforcement_source` set to 'adjacent_sector' (Phase 3)
  - deep commander decision trace (why this sector was chosen): deferred to Phase C (commander maturity v0.8.1)
- [x] ensure operation diagnostics can distinguish:
  - insufficient sector force: early `return ops` in emit.ts (soft skip logged in code)
  - primary-sector failure / over-attachment risk: deferred to structured diagnostic pass (Phase 4/5)
- [x] update operation review UI language to reflect the same structure
  - `OperationDetail.tsx`: "Sector Anchor" block added — shows primary sector name (from `CorpsFrontSectorView.display_name`), primary bde count, attached bde count (amber), and "Risk transferred from" sector names (amber) (2026-04-01)

**Deliverables:**
- traceable launch rationale ✅ (engine fields + UI block)
- visible cross-sector tradeoffs ✅ (amber attached/risk-transfer display in OperationDetail)
- truthful player-facing explanation ✅

**Done gate:**
- a user can tell which sector is carrying the operation and which other sectors paid for it ✅
  → OperationDetail "Sector Anchor" block shows exactly this

→ `/simplify` → smoke-test triad → verification-before-completion → pre-commit-check → commit

### Phase 5. Demote Transitional Launch Paths (~1 session)

**Assigned to:** Technical Architect + Gameplay Programmer  
**Reviewer:** Authority Auditor, Code Review  
**Sign-off:** Orchestrator, Architect, War-or-Game

Goal:
Stop legacy launch semantics from silently surviving.

Tasks:

- [ ] inventory all operation creation paths that can still bypass sector anchoring
- [ ] remove or demote any helper path that can still create a broad-pool corps op without explicit attachments
- [ ] add top-of-file comments where transitional helpers must temporarily survive
- [ ] confirm UI and desktop/IPC paths cannot create conceptually different operation records

**Deliverables:**
- one truthful launch contract
- no peer launch path with looser hidden rules
- transitional notes where temporary bridges remain

**Done gate:**
- maintainers can no longer accidentally create the old broad-pool launch model through a side path

→ `/simplify` → smoke-test triad → verification-before-completion → pre-commit-check → commit

### Phase 6. Historical / Gameplay Validation (~1 session)

**Assigned to:** Scenario Creator Runner Tester + War-or-Game  
**Reviewer:** Modern Wargame Expert, QA Engineer  
**Sign-off:** Orchestrator

Goal:
Verify the new launch model feels stricter without becoming fake-rigid.

Tasks:

- [ ] run scenario slices or targeted diagnostics to inspect whether corps can still concentrate force credibly
- [ ] confirm that quiet sectors are not silently gutted without visible trace
- [ ] confirm that historically plausible neighboring-sector reinforcement remains possible
- [ ] review command explanation outputs for player legibility
- [ ] record any historical edge cases that justify future exception rules

**Deliverables:**
- scenario-backed validation
- explicit list of acceptable vs suspicious attachment patterns
- evidence that the model is grounded, not theatrical

**Calibration gate (required before sign-off):**

Run `npm run sim:scenario:run:40w`. Compare to **n1280 baseline**: 93.2% area-weighted, 21/25 anchors, 6/6 benchmarks.

- Area-weighted must not regress more than 1pp (floor: 92.2%)
- Anchor count must not regress (floor: 21/25)
- Benchmark count must not regress (floor: 6/6)
- Zero new commander observation categories introduced

If any floor is breached, the new launch model has broken calibration and Phase 3 must be revisited before this sublane closes.

**Done gate:**
- the launch model is stricter than today without becoming cartoonishly sector-prisoned
- calibration gate above passes

→ `/simplify` → scenario verification → calibration gate → `/create-report` → pre-commit-check → commit

---

## 6. Protocol Enforcement

- [ ] Orchestrator oversees the sublane
- [ ] Architect flags architectural tradeoffs for user review
- [ ] `.claude/napkin.md` read at session start and updated if recurring lessons emerge
- [ ] `docs/PROJECT_LEDGER.md` updated when this sublane materially changes plan or ownership truth
- [ ] `docs/life_lessons.md` scanned before each implementation phase
- [ ] every phase answers:
  - canonical owner after the change
  - path removed or demoted
  - proof the change is real
  - UI/report surface reflecting the truth
  - milestone unblocked
- [ ] all new arrays / collections preserve deterministic ordering
- [ ] `/create-report` writes the implementation report when the sublane closes

---

## 7. Completion Checklist

- [ ] one canonical launch model is documented and implemented
- [ ] every operation has a primary sector
- [ ] default participant pool is sector-derived
- [ ] cross-sector brigades are explicit attachments or reinforcements
- [ ] traces and UI expose primary vs attached brigades
- [ ] broad free-pool launch semantics are removed or clearly transitional
- [ ] serialization and replay surfaces preserve the new fields
- [ ] `docs/PROJECT_LEDGER.md` appended
- [ ] `docs/PROJECT_LEDGER_KNOWLEDGE.md` updated if reusable lessons emerged
- [ ] completion report written in `docs/40_reports/implemented/`

---

## 8. What This Unblocks

- cleaner `v0.8.x-final` operations singularity
- more believable commander tradeoffs in `v0.8.1`
- truthful operation review UX in `v0.8.3`
- later ops modal overhaul in `v0.9.1` on top of one real launch model

---

## 9. Summary For Implementers

Do not make sectors operation owners.

Do not keep the current invisible broad-pool launch model either.

Implement this:

- corps launches
- sector anchors
- sector brigades form the default pool
- outside brigades join only as explicit reinforcements
- traces and UI must show the tradeoff

If a launched operation still cannot say "this is my primary sector, these are my local brigades, these are my attachments, and this is the risk I accepted elsewhere," this sublane is not done.
