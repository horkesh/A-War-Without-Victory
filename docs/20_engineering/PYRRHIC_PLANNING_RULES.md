# Pyrrhic Rules for Planning

**Status:** MANDATORY — all implementation plans must comply.
**Enforcement:** Process QA validates compliance. Non-compliant plans are rejected.

---

## 1. Structure

Every implementation plan MUST contain:

### 1.1 Clear Tasks
- Every deliverable broken into discrete, actionable tasks with checkboxes (`- [ ]`)
- Each task specifies: what file(s) to modify/create, what the change does, estimated scope
- No vague tasks like "implement the system" — every task is a concrete code action
- Tasks ordered by dependency (what must come before what)

### 1.2 /simplify Gates
- A `/simplify` pass is REQUIRED between every phase or logical group of tasks
- The plan must explicitly mark where simplify runs occur:
  ```
  Phase 1 → /simplify → commit
  Phase 2 → /simplify → commit
  ```
- Simplify findings are fixed before proceeding to the next phase
- Simplify results documented (PASSED or list of fixes)

### 1.3 Role Assignment
- **Orchestrator** oversees execution of every plan. Stated explicitly.
- **Architect** makes architectural decisions when needed. Decisions are **flagged for user review** — not silently applied.
- Every task or phase has an assigned role (Gameplay Programmer, UI/UX Developer, Systems Programmer, etc.)
- Parallel tasks explicitly marked with which agent handles which stream

### 1.4 Protocol Enforcement
- Plan states that these protocols are followed during execution:
  - **Napkin:** Read at session start, update during work
  - **Ledger:** Append entry after completion (PROJECT_LEDGER.md)
  - **Commit discipline:** One logical change per commit, conventional commit messages, version-aware
  - **Life lessons:** Scan before work, flag relevant lessons, don't violate
  - **Verification:** `tsc --noEmit` + `vitest run` after every phase. Never claim done without evidence.
  - **Version numbering:** Check milestone map, bump package.json when milestone complete, tag

---

## 2. Completion

Every plan MUST end with:

### 2.1 Completion Report
- After all phases are implemented, create a **detailed implementation report** in `docs/40_reports/implemented/`
- Report includes: what was built, files created/modified, tests added, decisions made, issues found
- Format: `YYYYMMDD_<MILESTONE_NAME>_IMPLEMENTATION_REPORT.md`

### 2.2 Propagation
After the report, propagate changes to ALL relevant documents:
- **Canon docs** (`docs/10_canon/`) — if new systems affect Rulebook, Systems Manual, or Engine Invariants
- **Master files** — update `GUI_MASTER.md`, `CALIBRATION_MASTER.md`, `SECTOR_MASTER.md`, `REAL_WAR_MASTER.md`, `WARROOM_MASTER.md` as relevant
- **VERSIONING.md** — mark milestone as completed with date
- **ROADMAP_TO_1_0.md** — update version map table status
- **PROJECT_LEDGER.md** — append completion entry
- **Napkin** — update current state, remove completed backlog items
- **Memory** — update MEMORY.md if significant new systems or patterns

### 2.3 Version Bump
- Update `package.json` version
- Create git tag: `git tag -a v0.X.Y -m "description"`
- Push tag

---

## 3. Plan Template

```markdown
# v0.X.Y — [Milestone Name] — Implementation Plan

**Date:** YYYY-MM-DD
**Status:** PLAN — ready for execution
**Overseer:** Orchestrator
**Architect:** Makes decisions, flags for user review
**Prerequisites:** [list completed milestones]

---

## Deliverables

### Phase 1: [Name] (~N sessions)
**Assigned to:** [Role / Agent]

- [ ] Task 1 — file, change, scope
- [ ] Task 2 — file, change, scope

**Gate:** [what must be true before proceeding]

→ /simplify → commit

### Phase 2: [Name] (~N sessions)
**Assigned to:** [Role / Agent]

- [ ] Task 3
- [ ] Task 4

**Gate:** [verification criteria]

→ /simplify → commit

---

## Protocol Enforcement

- [ ] Orchestrator oversees all phases
- [ ] Architect decisions flagged for user review
- [ ] Napkin read at start, updated during work
- [ ] Ledger entry appended on completion
- [ ] Life lessons scanned, relevant ones flagged
- [ ] tsc + vitest after every phase
- [ ] Version bump + tag on completion

## Completion Checklist

- [ ] Implementation report in docs/40_reports/implemented/
- [ ] Canon docs updated (if applicable)
- [ ] Master files updated (if applicable)
- [ ] VERSIONING.md milestone marked complete
- [ ] ROADMAP_TO_1_0.md status updated
- [ ] PROJECT_LEDGER.md entry appended
- [ ] Napkin updated
- [ ] package.json version bumped
- [ ] Git tag pushed

---

## Success Criteria

- [ ] [specific, testable criterion]
- [ ] [specific, testable criterion]
- [ ] All tests pass, tsc clean
```

---

## 4. Enforcement

- **Before execution:** Orchestrator verifies plan has all required sections
- **During execution:** Each phase ends with /simplify + commit + verification
- **After execution:** Process QA validates completion checklist
- **Non-compliance:** Plan is rejected or execution paused until compliance restored

These rules are non-negotiable. They exist because every shortcut we've ever taken has cost us more time than following the process.
