# v0.8.4 Autonomy Determinism And Review

**Date:** 2026-03-31  
**Status:** PLAN - READY FOR EXECUTION ONCE GATE OPENS  
**Roadmap slot:** v0.8.4  
**Overseer:** Orchestrator  
**Architect:** Systems Programmer / Technical Architect - may define save/log/replay contracts and fallback paths, but must flag architectural calls for user review  
**Primary implementer roles:** Systems Programmer, Platform Specialist, UI/UX Developer, QA Engineer  
**Primary reviewer roles:** Code Simplifier (`/simplify`) minimum every phase; Determinism Auditor; UI Truth Keeper; Code Review  
**Gate:** Starts only after `v0.8.3` command review UX is explicit and the command chain has one truthful ownership model to sit on top of  
**Prerequisites:** `docs/plans/2026-03-24-v082-autonomy-api-plan.md`; `docs/plans/2026-03-31-v083-player-command-review-ux-plan.md`; `docs/plans/2026-03-31-v08to09-commander-explanation-surfaces-plan.md`  
**Authoring basis:** `MASTER_ROADMAP.md`, `20260330_REPO_HEALTH_CONSOLIDATED.md`, existing AI commander / decision log infrastructure

**Relevant life lessons to respect while executing:**
- `docs/life_lessons.md`: Determinism is sacred - replay/log truth beats live model calls
- `docs/life_lessons.md`: Verify fallback paths, not just happy-path API success
- `docs/life_lessons.md`: A review surface is required before autonomy can be trusted

---

## 0. Purpose

`v0.8.4` should not mean “we called the API.”

It should mean:

- assisted autonomy is replayable
- assisted autonomy is reviewable
- assisted autonomy has a clear fallback path
- the player can understand and reject important assisted decisions

This plan turns those requirements into explicit work.

---

## 1. Deliverables

- save/log/replay contract for assisted autonomy
- fallback behavior contract for API absence/error/rate limit
- player review rules for assisted decisions
- QA determinism harness for autonomy modes
- roadmap-safe definition of when assisted autonomy is “ready”

---

## 2. Pyrrhic Execution Plan

### Phase 1. Decision Logging Contract (~1 session)

**Assigned to:** Systems Programmer + Determinism Auditor

- [ ] inventory current decision-log coverage and gaps
- [ ] define required logged payload for all assisted political/autonomy decisions
- [ ] define replay contract: what is replayed from log vs recomputed

**Gate:**
- assisted autonomy has a written deterministic source of truth

→ `/simplify` → commit

### Phase 2. Fallback Contract (~1 session)

**Assigned to:** Platform Specialist + Systems Programmer

- [ ] define behavior for missing API key, transient API failure, timeout, offline mode, and rate limit
- [ ] define what the player sees in each failure mode
- [ ] define when formula fallback is allowed and how it is disclosed

**Gate:**
- no autonomy path depends on silent API success

→ `/simplify` → commit

### Phase 3. Assisted Decision Review Rules (~1 session)

**Assigned to:** UI/UX Developer + Product Manager

- [ ] define which assisted decisions must be surfaced for review
- [ ] define which can auto-apply and why
- [ ] define reject / accept / inspect flow for high-impact decisions

**Gate:**
- assisted autonomy has review rules proportional to risk

→ `/simplify` → commit

### Phase 4. Determinism QA Harness (~1-2 sessions)

**Assigned to:** QA Engineer + Determinism Auditor

- [ ] define replay tests for assisted sessions
- [ ] define hash/state equivalence checks across reload/replay
- [ ] define failure-mode tests for fallback behavior

**Gate:**
- determinism and fallback can be proven rather than asserted

→ `/simplify` → commit

### Phase 5. Roadmap / Plan Integration (~1 session)

**Assigned to:** Documentation Specialist + Product Manager

- [ ] keep roadmap and autonomy plan language aligned with the hardened contract
- [ ] ensure `v0.8.4` is not described as ready without determinism/review proof
- [ ] append ledger/knowledge notes for recurring autonomy guardrails

**Gate:**
- `v0.8.4` means a disciplined autonomy layer, not API enthusiasm

→ `/simplify` → commit

---

## 3. Protocol Enforcement

- [ ] Orchestrator oversees all phases
- [ ] Architect decisions changing save/log/replay contracts are flagged for user review
- [ ] `.claude/napkin.md` is read at session start and updated during execution
- [ ] `docs/PROJECT_LEDGER.md` is appended when autonomy contracts materially change
- [ ] `docs/life_lessons.md` is scanned before each phase
- [ ] future engine execution runs smoke-test triad after each phase
- [ ] `/verification-before-completion` and `/awwv-pre-commit-check` run before completion
- [ ] one logical phase per commit
- [ ] `/create-report` produces a completion report in `docs/40_reports/implemented/`

## 4. Completion Checklist

- [ ] decision logging contract exists
- [ ] fallback contract exists
- [ ] assisted decision review rules exist
- [ ] determinism QA harness exists
- [ ] roadmap and autonomy plan align
- [ ] `docs/PROJECT_LEDGER.md` appended
- [ ] `.claude/napkin.md` updated
- [ ] implementation report created

---

## 5. Success Criteria

- [ ] A replayed assisted session does not need live API calls to remain truthful
- [ ] A player can tell when the API helped, failed, or fell back
- [ ] High-impact assisted decisions are reviewable
- [ ] `v0.8.4` has hard gates instead of hopeful prose
