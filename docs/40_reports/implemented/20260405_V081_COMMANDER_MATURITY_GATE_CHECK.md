# v0.8.1 Commander Maturity Gate Check

**Date:** 2026-04-05
**Type:** Validation / Synthesis Gate
**Baseline:** n1323 — 94.0% area-weighted, 27/27 anchors, 6/6 benchmarks, 74 battles, 2353 tests
**Verdict:** **GO**

---

## Purpose

Determine whether the v0.8.0 commander system is mature enough to be treated as roadmap-stable for v0.8.1, or whether blockers still prevent that. This is a go/no-go gate, not a bug hunt or polish lane.

## Gate Criteria

Per `docs/plans/2026-03-31-v081-commander-maturity-plan.md`, v0.8.1 requires:

1. Belief state exists separately from raw world state
2. Candidate intents compete
3. Memory affects future scoring
4. Constraints and preferences are structurally distinct
5. Reasoning traces exist
6. Relationship model exists

The gate question: Is the v0.8.0 foundation solid enough that these 6 deliverables can be implemented without restructuring?

## Specialist Panel

Seven Pyrrhic specialists were dispatched in parallel:

| Specialist | Domain | Verdict |
|---|---|---|
| Technical Architect | Gate criteria + go/no-go synthesis | **GO** |
| Gameplay Programmer | Commander mechanical coherence | **CONDITIONAL READY** |
| Systems Programmer | Command chain truth + invariants | **READY** |
| Scenario Creator/Runner/Tester | Run behavior credibility | **CREDIBLE** |
| UI/UX Developer | Player comprehension surfaces | **SUFFICIENT** |
| QA Engineer | Regression coverage + confidence | **CONFIDENT** |
| Documentation Specialist | Doc propagation readiness | **CONDITIONAL** |

No contradictions between specialists. All converge on: foundation is solid, no hard blockers.

---

## Per-Deliverable Foundation Assessment

### 1. Belief State

**Foundation:** `IntelPicture` with `zone_confidence`, `offensive_signs`, `concentration_detected`. `ThreatAssessment` persists threat levels. `CommanderBriefing` assembles structured inputs (not raw GameState). `decide.ts` has confidence update logic.

**Blocker:** None structural. Scope bounded (~200-300 lines new types + ~100-200 lines update logic).

### 2. Candidate Intent Competition

**Foundation:** `plan.ts` already evaluates multiple offensive targets via `selectBestPlanTarget()` with multi-factor scoring (threat pressure, population value, strategic value, concentration feasibility, enemy equipment, fatigue, campaign role).

**Blocker:** None structural. Broadening from "which target" to "which intent type" is a generalization, not a rewrite (~300-500 lines).

### 3. Memory Affects Future Scoring

**Foundation:** `OperationHistoryEntry` tracks outcomes. `SectorActivityEntry` logs activity. `CATASTROPHIC_OSID_COOLDOWN_TURNS = 4` is an early form of lesson memory. History capped at 20 entries.

**Blocker:** None structural. Additive work (~150-200 lines lesson extraction + decay).

### 4. Constraints vs Preferences

**Foundation:** `getFatigueBlockReason()`, `getCampaignRoleBlockReason()`, `getSyncRoleBlockReason()` are explicit hard gates. `POSTURE_MIN_OUTCOME` is a hard floor. `allocate.ts` has garrison budget floors vs surplus.

**Blocker:** None structural. UI-side `classifyPrimaryConstraint()` and `reliefPath` (shipped in explanation surfaces waves) provide a template (~200-300 lines to port to engine).

### 5. Reasoning Traces

**Foundation:** `last_plan_action` and `last_plan_reason` persist in `CommanderState`. UI explanation surfaces (6 waves, 74 tests) derive and display structured explanations.

**Blocker:** None structural. Trace assembly in emit.ts, persist in CommanderState (~150-250 lines).

### 6. Relationship Model

**Foundation:** `OfficerPersonality` with aggression, caution, initiative, competence. Presidential command friction (6 waves) tracks strain, friction events, acknowledge loops, stabilize actions, exhaustion strain. Command authority system with CA resource.

**Blocker:** None structural. Add `CommanderRelationships` to `CommanderState`, wire into scoring (~100-150 lines types + ~100-150 lines integration).

---

## Cross-Cutting Prerequisites

| Prerequisite | Status |
|---|---|
| v0.8.0 P0s resolved | PASS — gradacac_2, brcko, combat drought all resolved |
| Operations singularity credible | PASS — CorpsOperation sole command object, ZEA 370→2 bounded |
| generateCorpsDirectives removed | PASS — commander loop is sole authority |
| Command/operations authority cleanup | PASS — 17 engine-truth fixes on April 5 |
| Calibration stability | PASS — 94.0%/27-27/6-6 stable across 8+ runs |
| Test baseline clean | PASS — 2360/2360, 0 failures |

---

## System Stability Assessment

| Domain | Rating | Details |
|---|---|---|
| Pipeline coherence | **PASS** | Clean 5-stage flow, no silent re-scoring |
| State persistence | **PASS** | Additive-friendly, JSON-serializable, optional fields |
| Emit bridge | **PASS (minor concern)** | Faithful translation; sector reassignment is best-effort |
| Command chain truth | **STABLE** | 4 waves of hardening, 29 regression tests |
| Sector truth | **STABLE** | One minor residual (vrs_1st_krajina:8), non-cascading |
| Determinism | **LOW RISK** | No Math.random, strictCompare throughout, sorted iteration |
| Serialization | **READY** | No migration needed for new optional fields |
| Regression coverage | **HIGH** | 155 pipeline + 425 surface tests |
| Player surfaces | **SUFFICIENT** | 11-layer decision hierarchy, silence=healthy |

---

## Soft Conditions (not blockers — address early in v0.8.1)

| # | Condition | Source | Effort |
|---|---|---|---|
| 1 | Fix `estimateTurnsActive` suspend counter (plan.ts) | Gameplay Programmer | ~30 lines |
| 2 | Tighten `supply_by_osid`/`intel_data` from `unknown` | Gameplay Programmer, Tech Architect | ~20 lines |
| 3 | Wire sector reassignment in emit.ts | Gameplay Programmer | ~50 lines |
| 4 | Update MASTER_ROADMAP v0.8.0 status block | Doc Specialist | ~15 min |
| 5 | Systems Manual v0.7.0 → v0.8.0 bump | Doc Specialist | ~1-2 hours |
| 6 | Add multi-turn commander state continuity test | QA Engineer | ~100 lines |

---

## Verdict

### **GO for v0.8.1**

The v0.8.0 commander system is mature, stable, and structurally ready for v0.8.1 Commander Maturity implementation.

- Zero hard blockers identified by any of 7 specialists
- All 6 deliverables have existing scaffolding in v0.8.0
- All scope is bounded (100-500 lines per deliverable)
- Calibration is stable at historic highs
- Test coverage is comprehensive
- Player surfaces are comprehensive

### Recommended Next Lane

**v0.8.1 Phase 1: State and Type Foundation** — add `CommanderBeliefState`, `CommanderRelationships`, `CommanderLesson`, `CommanderIntentCandidate`, `CommanderDecisionTrace` to `commander_state.ts` with sensible defaults wired into `commander_loop.ts`. Estimated: 1 session.

### Recommended Parallel Work

Soft conditions 1, 4, 5, 6 can be addressed alongside or as first sub-tasks of Phase 1.

---

## Files Referenced

- Plan: `docs/plans/2026-03-31-v081-commander-maturity-plan.md`
- Architect notes: `.claude/architect_notes.md`
- Commander source: `src/sim/combat/commander/` (10 files, 5,265 lines)
- Commander tests: `tests/commander/` (5 files, 4,390 lines)
- Command surface tests: `tests/command_authority.test.ts` (291 tests), `tests/ui/command_strain_interpretation.test.ts` (57 tests)
- Roadmap: `docs/plans/MASTER_ROADMAP.md`
