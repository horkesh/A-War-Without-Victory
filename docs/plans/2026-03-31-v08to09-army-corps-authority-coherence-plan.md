# v0.8-to-v0.9 Army-Corps Authority Coherence

**Date:** 2026-03-31  
**Status:** PLAN - READY FOR EXECUTION WHEN SIMPLIFICATION BAND OPENS  
**Roadmap slot:** v0.8-to-v0.9  
**Overseer:** Orchestrator  
**Architect:** Technical Architect / Architect - may define authority boundaries, comments, and ownership contracts, but must flag architectural calls for user review  
**Primary implementer roles:** Technical Architect, Gameplay Programmer, Documentation Specialist, QA Engineer  
**Primary reviewer roles:** Code Simplifier (`/simplify`) minimum every phase; Code Review; War-or-Game; Quality Assurance Process  
**Gate:** Starts after command-authority cleanup has made corps and ops ownership visible enough to map the remaining army ↔ corps seam without guessing  
**Prerequisites:** `docs/plans/2026-03-31-v08x-command-authority-cleanup-plan.md`; `docs/plans/2026-03-31-v08x-operations-singularity-plan.md`; `docs/plans/2026-03-31-v08to09-army-command-maturity-plan.md`  
**Authoring basis:** `MASTER_ROADMAP.md`, `20260330_REPO_HEALTH_CONSOLIDATED.md`, current command-chain plans

**Relevant life lessons to respect while executing:**
- `docs/life_lessons.md`: Overlapping ownership is worse than weak intelligence
- `docs/life_lessons.md`: Comments should name what owns this, what is legacy, and what must not also decide here
- `docs/life_lessons.md`: UI truth must match backend truth

---

## 0. Purpose

This plan exists to kill the phrase “the army/corps systems are probably coherent enough.”

That phrase is how fake flexibility survives.

The goal is to define, document, and eventually implement the real handshake between army and corps command so:

- both layers do not decide the same thing
- both layers do not silently reinterpret each other
- later refusal / review / autonomy work has a truthful hierarchy

---

## 1. Deliverables

- army ↔ corps authority matrix
- named handshake rules for request, approval, intervention, escalation, and reporting
- top-of-file ownership comments for hotspot modules
- QA checklist for detecting renewed overlap
- roadmap alignment so later milestones stop assuming coherence

---

## 2. Pyrrhic Execution Plan

### Phase 1. Authority Matrix (~1 session)

**Assigned to:** Technical Architect + Documentation Specialist

- [ ] enumerate decision categories: stance, operation initiation, support request, reserve release, brigade reassignment, halt, escalation, review
- [ ] assign a canonical owner for each category
- [ ] identify demoted or transitional parallel owners
- [ ] define “must not also decide here” statements for each hotspot area

**Gate:**
- one authority matrix exists with no unresolved “shared by everyone” cells

→ `/simplify` → commit

### Phase 2. Handshake Rules (~1-2 sessions)

**Assigned to:** Gameplay Programmer + Technical Architect

- [ ] define corps → army request flow
- [ ] define army → corps directive / advisory / denial flow
- [ ] define how requests are acknowledged, delayed, denied, or escalated
- [ ] define what gets persisted and traced at each handoff

**Gate:**
- army/corps interactions are defined as explicit transactions rather than vibes

→ `/simplify` → commit

### Phase 3. Hotspot Ownership Annotation Plan (~1 session)

**Assigned to:** Documentation Specialist + Technical Architect

- [ ] identify hotspot files that need ownership comments
- [ ] draft comment templates for canonical owner / transitional path / forbidden duplicate ownership
- [ ] map comment insertions to later implementation tasks

**Gate:**
- ownership comments are planned with exact targets, not left as “remember to comment things”

→ `/simplify` → commit

### Phase 4. Coherence QA Harness (~1 session)

**Assigned to:** QA Engineer

- [ ] define review questions and tests for detecting overlap reintroduced by future work
- [ ] define what evidence proves army/corps coherence is real
- [ ] align this checklist with roadmap gates for `v0.8.3` and `v0.8.4`

**Gate:**
- coherence can be reviewed systematically, not by intuition

→ `/simplify` → commit

### Phase 5. Plan/Roadmap Integration (~1 session)

**Assigned to:** Product Manager + Documentation Specialist

- [ ] keep roadmap wording, authority matrix, and dependent plans aligned
- [ ] replace umbrella references with exact plan references where needed
- [ ] append ledger/knowledge notes for the explicit coherence contract

**Gate:**
- roadmap no longer hides this work behind assumptions

→ `/simplify` → commit

---

## 3. Protocol Enforcement

- [ ] Orchestrator oversees all phases
- [ ] Architect decisions changing ownership boundaries are flagged for user review
- [ ] `.claude/napkin.md` is read at session start and updated during execution
- [ ] `docs/PROJECT_LEDGER.md` is appended when coherence rules materially change
- [ ] `docs/life_lessons.md` is scanned before each phase
- [ ] future engine execution runs smoke-test triad after every phase
- [ ] `/verification-before-completion` and `/awwv-pre-commit-check` run before claiming completion
- [ ] one logical phase per commit
- [ ] `/create-report` produces a completion report in `docs/40_reports/implemented/` when this plan closes

## 4. Completion Checklist

- [ ] authority matrix exists
- [ ] handshake rules exist
- [ ] hotspot comment plan exists
- [ ] QA coherence checklist exists
- [ ] roadmap and dependent plans reference the explicit coherence work
- [ ] `docs/PROJECT_LEDGER.md` appended
- [ ] `.claude/napkin.md` updated
- [ ] implementation report created

---

## 5. Success Criteria

- [ ] No later milestone needs to say “assumes army and corps are coherent” without pointing at concrete work
- [ ] Implementers can identify the canonical owner of every major command interaction
- [ ] Reviewers can detect overlap drift quickly
