# v0.8.3 Player Command Review UX

**Date:** 2026-03-31  
**Status:** PLAN - READY FOR EXECUTION ONCE GATE OPENS  
**Roadmap slot:** v0.8.3  
**Overseer:** Orchestrator  
**Architect:** Architect / Technical Architect - may define interaction flow and data contract, but must flag architectural calls for user review  
**Primary implementer roles:** UI/UX Developer, Gameplay Programmer, Product Manager, QA Engineer  
**Primary reviewer roles:** Code Simplifier (`/simplify`) minimum every phase; UI Truth Keeper; Modern Wargame Expert; War-or-Game  
**Gate:** Starts only after `v0.8.2` and only when command review is grounded in real order interpretation and real explanation traces rather than assumed coherence  
**Prerequisites:** `docs/plans/2026-03-24-v081-order-interpretation-plan.md`; `docs/plans/2026-03-31-v08to09-army-corps-authority-coherence-plan.md`; `docs/plans/2026-03-31-v08to09-commander-explanation-surfaces-plan.md`  
**Authoring basis:** `MASTER_ROADMAP.md`, `20260330_REPO_HEALTH_CONSOLIDATED.md`, current Army HQ / OOB / notification surfaces

**Relevant life lessons to respect while executing:**
- `docs/life_lessons.md`: Frustration is acceptable only when legible
- `docs/life_lessons.md`: UI truth must match backend truth
- `docs/life_lessons.md`: Do not solve ambiguity with more widgets

---

## 0. Purpose

If commanders reinterpret, delay, or refuse orders, the player needs a truthful place to review that friction.

This plan owns the minimum viable UX where the player can:

- see what order they issued
- see how it was interpreted
- see why it changed
- decide whether to accept, override, or escalate

Without this, `v0.8.3` becomes input mystery instead of command friction.

---

## 1. Deliverables

- command review flow for preview / understand / accept / override
- order-diff presentation contract (issued vs interpreted vs accepted)
- override-cost presentation rules
- review-surface placement in Army HQ / notifications / command panels
- QA rubric for legibility and truthfulness

---

## 2. Pyrrhic Execution Plan

### Phase 1. Review Flow Definition (~1 session)

**Assigned to:** UI/UX Developer + Product Manager

- [ ] define the full review loop from issued order to interpreted result
- [ ] define when the player is interrupted vs informed passively
- [ ] define which decisions are eligible for override and what friction is attached

**Gate:**
- one clear review flow exists instead of scattered ad hoc prompts

→ `/simplify` → commit

### Phase 2. Order Diff Contract (~1 session)

**Assigned to:** Gameplay Programmer + UI/UX Developer

- [ ] define the data needed to compare player order, commander interpretation, and final applied outcome
- [ ] define wording and structure for reasons, confidence, and costs
- [ ] align order diff with explanation-surface payload contract

**Gate:**
- UI can show truthful “what changed” without guessing

→ `/simplify` → commit

### Phase 3. Surface Placement Spec (~1-2 sessions)

**Assigned to:** UI/UX Developer + Modern Wargame Expert

- [ ] specify where review appears: notifications, Army HQ, command panel, modal if needed
- [ ] avoid hiding critical friction in secondary panels
- [ ] define escalation path for repeated disobedience / relief / political capital use

**Gate:**
- command review is discoverable, understandable, and not spammy

→ `/simplify` → commit

### Phase 4. Override UX Rules (~1 session)

**Assigned to:** Product Manager + UI/UX Developer

- [ ] define what the player sees before overriding
- [ ] define how costs and consequences are shown
- [ ] define what immediate feedback confirms the override was accepted

**Gate:**
- override feels like a deliberate command decision, not a hidden force toggle

→ `/simplify` → commit

### Phase 5. Legibility QA (~1 session)

**Assigned to:** QA Engineer + UI Truth Keeper

- [ ] define test scenarios for delay, modification, refusal, and relief
- [ ] define checks for “player understands why this happened”
- [ ] define checks for “UI does not imply powers the backend does not have”

**Gate:**
- command friction can be judged for clarity before implementation closes

→ `/simplify` → commit

---

## 3. Protocol Enforcement

- [ ] Orchestrator oversees all phases
- [ ] Architect decisions changing review/data flow are flagged for user review
- [ ] `.claude/napkin.md` is read at session start and updated during execution
- [ ] `docs/PROJECT_LEDGER.md` is appended when command-review workflow changes materially
- [ ] `docs/life_lessons.md` is scanned before each phase
- [ ] future engine/UI execution runs smoke-test triad after each phase
- [ ] `/verification-before-completion` and `/awwv-pre-commit-check` run before completion
- [ ] one logical phase per commit
- [ ] `/create-report` produces a completion report in `docs/40_reports/implemented/`

## 4. Completion Checklist

- [ ] review flow exists
- [ ] order diff contract exists
- [ ] surface placement spec exists
- [ ] override UX rules exist
- [ ] legibility QA rubric exists
- [ ] roadmap and order-interpretation plan align
- [ ] `docs/PROJECT_LEDGER.md` appended
- [ ] `.claude/napkin.md` updated
- [ ] implementation report created

---

## 5. Success Criteria

- [ ] A player can tell what they asked for, what changed, and why
- [ ] Override decisions are legible before and after the click
- [ ] Command friction feels intentional rather than buggy
