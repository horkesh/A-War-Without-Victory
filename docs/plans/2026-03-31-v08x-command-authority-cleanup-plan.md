# v0.8.x-final Command Authority Cleanup

**Date:** 2026-03-31  
**Status:** PLAN - READY FOR EXECUTION  
**Roadmap slot:** v0.8.x-final  
**Overseer:** Orchestrator  
**Architect:** Technical Architect / Architect - owns architectural calls, flags decisions for user review  
**Primary implementer roles:** Technical Architect, Gameplay Programmer, Systems Programmer, UI/UX Developer  
**Primary reviewer roles:** Authority Auditor, UI Truth Keeper, Code Simplifier, Code Review  
**Sign-off:** Orchestrator, Architect, War-or-Game

**Purpose:** Make ownership singular across the command stack so the repo stops lying about who decides movement, operations, and command execution.

**Prerequisites:** `v0.8.0` stabilization credible enough that cleanup is not masking an active live-fire bug; operations singularity plan can proceed as the first sublane; roadmap governance and command authority gates remain in force

**Relevant life lessons to respect while executing:**
- `docs/life_lessons.md`: Fix the symptom in ALL callers - verify the actual code path uses the change
- `docs/life_lessons.md`: Gap finder asks the questions nobody else thinks to ask - use before architectural work
- `docs/life_lessons.md`: Parallel agent dispatch needs exclusive file ownership
- `docs/life_lessons.md`: Decisions without traces are undebuggable - instrument before investigating
- `docs/life_lessons.md`: Build diagnostic tools, not one-off scripts

---

## 0. Scope

This milestone is broader than operations singularity.
It includes the repo-wide command authority cleanup that later commander maturity, order interpretation, and ops UX work depend on.

Primary sublanes:
- operations singularity
- movement ownership cleanup
- legacy command path removal
- hotspot ownership annotation
- entrypoint / adapter truth cleanup where it affects command authority

The five mandatory cleanup questions remain binding for every task:
1. canonical owner after the change
2. competing path removed or demoted
3. test or observable proof
4. UI or report surface that reflects the truth
5. future milestone unblocked

---

## 1. Existing Scaffolding

The repo already has strong inputs for this cleanup:
- `docs/40_reports/audits/20260330_REPO_HEALTH_CONSOLIDATED.md`
- `docs/40_reports/20260330_RAILROAD_HUNTER_REPORT.md`
- `docs/plans/2026-03-31-v08x-operations-singularity-plan.md`
- movement authority findings already folded into the consolidated audit
- governance docs:
  - `docs/20_engineering/ROADMAP_GOVERNANCE.md`
  - `docs/20_engineering/COMMAND_AUTHORITY_GATES.md`

This means the work is not discovery from zero.
It is a controlled cleanup with known hotspots.

---

## 2. Pyrrhic Execution Plan

### Phase 1. Operations Singularity (~multi-session sublane)

**Assigned to:** Technical Architect + Gameplay Programmer  
**Reviewer:** Authority Auditor, UI Truth Keeper  
**Sign-off:** Orchestrator, Architect, War-or-Game

Tasks:
- [ ] execute `docs/plans/2026-03-31-v08x-operations-singularity-plan.md`
- [ ] record canonical operation owner and demoted path in code and docs
- [ ] ensure UI and diagnostics speak about the same operation object

**Deliverables:**
- singular operation object
- singular lifecycle
- singular create / launch / update path

**Done gate:**
- roadmap’s operations-singularity gate is satisfied

→ `/simplify` → smoke-test triad → verification-before-completion → pre-commit-check → commit

### Phase 2. Movement Ownership Cleanup (~1-2 sessions)

**Assigned to:** Gameplay Programmer + Technical Architect  
**Reviewer:** Authority Auditor, Code Review  
**Sign-off:** Orchestrator, Architect, War-or-Game

Tasks:
- [ ] inventory every system that can write or materially redirect brigade movement intent
- [ ] declare one intent owner and a small execution stack
- [ ] demote or remove competing movement writers that act as peer strategists
- [ ] add ownership comments in hotspot movement files naming canonical vs transitional behavior

**Deliverables:**
- movement authority map grounded in code
- one authoritative movement-intent owner
- demoted legacy movement writers

**Done gate:**
- maintainers can answer who is allowed to decide brigade movement and who only executes it

→ `/simplify` → smoke-test triad → verification-before-completion → pre-commit-check → commit

### Phase 3. Legacy Command Path Removal (~1-2 sessions)

**Assigned to:** Systems Programmer + Gameplay Programmer  
**Reviewer:** Authority Auditor, Code Review  
**Sign-off:** Orchestrator, Architect, War-or-Game

Tasks:
- [ ] remove `generateCorpsDirectives` as a live authority path
- [ ] make `USE_COMMANDER_LOOP` permanent if stabilization gates are satisfied
- [ ] delete dead ballast such as clearly superseded reposition / directive bridges where validated safe
- [ ] verify no hidden fallback path silently restores the removed authority model

**Deliverables:**
- one live corps-command path
- deleted or explicitly dead legacy directive path

**Done gate:**
- there is no ambiguity about whether old corps-directive generation is still live

→ `/simplify` → smoke-test triad → verification-before-completion → pre-commit-check → commit

### Phase 4. Hotspot Ownership Annotation (~1 session)

**Assigned to:** Technical Architect + Documentation Specialist  
**Reviewer:** Authority Auditor  
**Sign-off:** Orchestrator, Architect

Tasks:
- [ ] add top-of-file ownership comments to all command hotspots
- [ ] name what is canonical, what is transitional, and what must not decide here
- [ ] update engineering docs if code comments reveal doc drift

**Deliverables:**
- ownership annotations in hotspot files
- docs aligned with ownership truth

**Done gate:**
- a new maintainer can open a hotspot file and immediately know whether it is owner, bridge, or legacy

→ `/simplify` → documentation verification → commit

### Phase 5. UI / Adapter / Entrypoint Truth Cleanup (~1-2 sessions)

**Assigned to:** UI/UX Developer + Technical Architect  
**Reviewer:** UI Truth Keeper, Modern Wargame Expert  
**Sign-off:** Orchestrator, Architect

Tasks:
- [ ] identify command-related UI or adapter layers that imply cleaner ownership than the backend actually guarantees
- [ ] align those surfaces with the cleaned backend truth
- [ ] mark any still-noncanonical entrypoints as such until repo-wide simplification handles them fully
- [ ] verify key command surfaces show the same command object / lifecycle truth as the engine

**Deliverables:**
- UI truth aligned with authority cleanup
- adapter / entrypoint notes where needed

**Done gate:**
- major command surfaces no longer present a fake-clean command story

→ `/simplify` → smoke-test triad → verification-before-completion → pre-commit-check → commit

---

## 3. Protocol Enforcement

- [ ] Orchestrator oversees the milestone
- [ ] Architect flags architectural decisions for user review
- [ ] `.claude/napkin.md` read at session start and updated during execution
- [ ] `docs/PROJECT_LEDGER.md` updated for major cleanup milestones
- [ ] `docs/life_lessons.md` scanned before each phase
- [ ] every task answers the five cleanup questions before work starts
- [ ] engine and UI changes remain in separate commits unless explicitly justified
- [ ] `/create-report` writes a completion report to `docs/40_reports/implemented/` when the milestone closes

---

## 4. Completion Checklist

- [ ] operations singularity complete
- [ ] movement authority singular enough to name one intent owner
- [ ] old corps-directive authority path removed or explicitly dead
- [ ] hotspot ownership comments added
- [ ] key UI command surfaces aligned with cleaned backend truth
- [ ] `docs/PROJECT_LEDGER.md` appended
- [ ] `.claude/napkin.md` updated if new recurring authority-cleanup lessons emerged
- [ ] roadmap and audit docs updated if scope/status changed materially
- [ ] completion report written in `docs/40_reports/implemented/`

---

## 5. What This Unblocks

- `v0.8.1` Commander Maturity on top of honest command ownership
- `v0.8.3` Order Interpretation on top of real authority boundaries
- `v0.9.1` ops UX overhaul on top of one real command object
- `v0.8-to-v0.9` repo simplification with less ambiguity about what should survive

---

## 6. Summary For Implementers

This milestone is where the repo stops pretending overlap is flexibility.

The shortest execution brief is:
- make operations singular
- make movement ownership singular
- kill the old corps-directive peer path
- annotate hotspot ownership
- align UI truth with cleaned backend authority

If the repo still has multiple peers deciding the same thing when this closes, the milestone failed.
