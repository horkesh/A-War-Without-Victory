# Studio Health / Repo Truth

**Date:** 2026-04-06  
**Status:** PLAN - READY FOR EXECUTION  
**Lane:** Permanent side lane  
**Overseer:** Orchestrator  
**Architect:** Technical Architect - keeps repo truth, roadmap truth, and report truth aligned  
**Primary implementer roles:** Documentation Specialist, Technical Architect, QA Engineer, Build Engineer  
**Primary reviewer roles:** Orchestrator, Code Review, Process QA  

**Purpose:** Define a permanent maintenance lane for keeping AWWV's docs, reports, calibration evidence, and branch hygiene honest. This lane exists so the repo can detect when its own plans, artifacts, and closeout claims drift away from current reality.

---

## 0. Scope

### In scope

- repo-truth gate at lane or milestone close
- roadmap sync pass
- architect board sync pass
- blindspot review
- build-warning disposition
- generated artifact policy
- calibration evidence retention / observatory hooks
- report consolidation / authority rules
- branch / worktree hygiene expectations

### Out of scope

- gameplay changes
- UI feature work
- calibration tuning
- new scenario content
- one-off cleanup that does not affect repo truth or closeout discipline

---

## 1. Purpose

This lane exists to stop the repo from telling three different stories at once:

1. what is actually implemented
2. what the roadmap says is implemented
3. what reports and generated artifacts imply is implemented

The lane is permanent because repo truth is a maintenance problem, not a one-time feature.

---

## 2. Pyrrhic Standards

The lane is considered healthy only when all of the following remain true:

- every milestone close runs through a repo-truth gate before it is declared done
- roadmap language stays aligned with current implementation and no longer advertises dead work as future work
- architect-facing boards stay synced with the current ownership model and no longer describe split truth as if it were stable
- blindspots are captured explicitly instead of being left as implied assumptions
- build warnings are triaged into one of three states: fix now, consciously defer, or document as accepted
- generated artifacts are either retained as authoritative evidence or rejected as disposable output
- calibration evidence is stored with a clear retention rule and a clear retrieval hook
- report consolidation chooses one authority path and labels every other source as supporting or legacy
- branch and worktree practice stays clean enough that stale truth cannot hide inside a long-lived scratch lane

---

## 3. Deliverables

1. one repo-truth closeout gate
2. one roadmap sync checklist
3. one architect board sync checklist
4. one blindspot review checklist
5. one build-warning disposition rule set
6. one generated-artifact retention policy
7. one calibration evidence retention policy with observatory hooks
8. one report consolidation and authority policy
9. one branch / worktree hygiene policy

---

## 4. Pyrrhic Execution Plan

### Phase 1. Repo-Truth Gate
**Assigned to:** Orchestrator + Technical Architect

- [ ] define the closeout rule for any lane or milestone
- [ ] require a final truth check before "complete" is claimed
- [ ] require a mismatch note whenever delivered work and roadmap wording diverge
- [ ] define the minimum evidence needed to pass the gate

**Gate:** a lane or milestone cannot close if the repo still contains unresolved truth drift.

**Outputs:**

- closeout checklist
- truth-drift note format
- gate sign-off rule

### Phase 2. Roadmap Sync Pass
**Assigned to:** Documentation Specialist + Technical Architect

- [ ] align active plans with current implementation state
- [ ] demote already-shipped items out of future-lane language
- [ ] mark temporary carry-ins as carry-ins, not milestone promises
- [ ] keep master roadmap language consistent with the latest accepted lane outcomes

**Gate:** roadmap text never claims future work that has already shipped or been explicitly retired.

**Outputs:**

- roadmap discrepancy list
- updated milestone wording requirements
- carry-in / shipped / retired classification rules

### Phase 3. Architect Board Sync
**Assigned to:** Technical Architect + Orchestrator

- [ ] sync board-level assumptions with the current repo truth model
- [ ] separate durable ownership from temporary execution detail
- [ ] mark any ambiguous cross-system responsibility as an explicit review item
- [ ] keep architecture-facing summaries from drifting into marketing language

**Gate:** architect board content must not contradict the repo's live ownership model.

**Outputs:**

- architect board truth checklist
- explicit ownership-risk notes
- ambiguity escalation rule

### Phase 4. Blindspot Review
**Assigned to:** QA Engineer + Documentation Specialist

- [ ] review the lane for missing checks, missing evidence, and missing negative cases
- [ ] capture assumptions that are not written down anywhere else
- [ ] identify places where generated output could be mistaken for authoritative truth
- [ ] flag any area where the repo can still overclaim progress

**Gate:** blindspots must be named before they are allowed to persist.

**Outputs:**

- blindspot register
- missed-assumption list
- follow-up queue for unresolved truth gaps

### Phase 5. Build-Warning Disposition
**Assigned to:** Build Engineer + QA Engineer

- [ ] classify warnings into actionable, documented, or accepted
- [ ] distinguish true regressions from benign noise
- [ ] require a written reason for every accepted warning
- [ ] keep warning backlog from being silently normalized

**Gate:** no warning may remain in a "maybe later" state without an owner and a reason.

**Outputs:**

- warning disposition policy
- warning owner list
- accepted-warning rationale log

### Phase 6. Generated Artifact Policy
**Assigned to:** Documentation Specialist + Technical Architect

- [ ] define which generated artifacts are authoritative evidence
- [ ] define which generated artifacts are disposable scratch output
- [ ] require deterministic naming and placement for retained artifacts
- [ ] prevent generated files from becoming the only copy of repo truth

**Gate:** generated artifacts must either be intentionally retained or intentionally ignored.

**Outputs:**

- retained-artifact list
- disposable-artifact rule
- naming and storage convention

### Phase 7. Calibration Evidence Retention / Observatory Hooks
**Assigned to:** QA Engineer + Orchestrator

- [ ] define what calibration evidence must be preserved
- [ ] define where the evidence lives
- [ ] define how observatory hooks point back to the evidence
- [ ] define the minimum trail needed to reproduce a historical judgment

**Gate:** calibration claims are not valid unless the evidence trail is recoverable.

**Outputs:**

- evidence-retention policy
- observatory-hook convention
- reproduction trail checklist

### Phase 8. Report Consolidation / Authority Rules
**Assigned to:** Documentation Specialist + Orchestrator

- [ ] choose one authority path per subject area
- [ ] mark supporting reports as supporting, not competing
- [ ] collapse duplicate summaries into a single canonical reference
- [ ] preserve older reports only when they still add factual value

**Gate:** the repo must not present multiple competing authorities for the same truth domain.

**Outputs:**

- authority-map rule
- report consolidation checklist
- duplicate-report handling rule

### Phase 9. Branch / Worktree Hygiene
**Assigned to:** Technical Architect + Build Engineer

- [ ] keep branch names short, descriptive, and lane-aligned
- [ ] keep worktrees isolated by purpose
- [ ] avoid long-lived scratch branches that accumulate stale assumptions
- [ ] require explicit cleanup or handoff when a worktree is no longer active

**Gate:** stale worktrees and ambiguous branch purpose are treated as repo-health risks.

**Outputs:**

- branch naming convention
- worktree lifecycle rule
- cleanup / handoff checklist

---

## 5. Non-Goals

- re-litigating canon
- changing simulation behavior
- adding new reporting systems
- rewriting all old docs at once
- forcing every historical artifact into the same format
- turning repo hygiene into a bureaucracy layer that blocks normal delivery

---

## 6. Done Means

This lane is never "finished" in the usual sense. It is healthy when:

- closeout gates are consistently used
- roadmap wording matches what is actually shipped
- architect-facing summaries stay in sync with repo truth
- blindspots are surfaced instead of buried
- warnings have an owner and a reason
- generated artifacts have a clear policy
- calibration evidence can be recovered later
- reports resolve to one authority path per subject
- branches and worktrees stay clean enough to support trust

