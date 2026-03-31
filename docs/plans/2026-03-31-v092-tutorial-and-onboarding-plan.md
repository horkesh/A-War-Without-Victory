# v0.9.2 Tutorial And Onboarding

**Date:** 2026-03-31  
**Status:** PLAN - READY FOR EXECUTION WHEN v0.9.2 OPENS  
**Roadmap slot:** v0.9.2  
**Overseer:** Orchestrator  
**Architect:** Product Manager / UI/UX Developer - may define onboarding flow, but must flag scope decisions for user review  
**Primary implementer roles:** UI/UX Developer, Product Manager, Gameplay Programmer, QA Engineer  
**Primary reviewer roles:** Code Simplifier (`/simplify`) minimum every phase; Modern Wargame Expert; UI Truth Keeper; Code Review  
**Gate:** Starts only after command review, explanation surfaces, and major command-chain concepts are stable enough to teach honestly  
**Prerequisites:** `v0.8.3` command review UX explicit, `v0.8-to-v0.9` UI surface ownership explicit, playtesting lane open  
**Authoring basis:** `MASTER_ROADMAP.md`, prior tutorial history in ledger, current command-chain and Army HQ surfaces

**Relevant life lessons to respect while executing:**
- `docs/life_lessons.md`: onboarding should teach the real game, not a simplified lie
- `docs/life_lessons.md`: tutorial timing belongs with playtesting, not as a last-minute patch
- `docs/life_lessons.md`: command friction must be taught explicitly or players will read bugs as intent

---

## 0. Purpose

The roadmap still promised a tutorial at gold while giving it no serious home.

This plan fixes that.

Tutorial and onboarding belong with external playtesting because that is when:
- confusion becomes visible
- command-chain literacy is tested on real players
- friction, override, and explanation surfaces can be taught honestly

---

## 1. Deliverables

- tutorial scope definition
- onboarding flow for first session and first turns
- command-chain literacy surfaces: who decides what, how review works, how overrides work
- playtest-informed iteration loop for onboarding

---

## 2. Pyrrhic Execution Plan

### Phase 1. Inventory Existing Tutorial Scaffolding (~1 session)
**Assigned to:** Product Manager + Documentation Specialist
- [ ] inventory legacy tutorial/onboarding work already in repo and ledger
- [ ] identify what is reusable vs obsolete under the command-chain roadmap
- [ ] define onboarding goals for a first-time player
**Gate:** existing scaffolding is understood, not ignored
→ `/simplify` → commit

### Phase 2. Onboarding Scope Definition (~1 session)
**Assigned to:** Product Manager + UI/UX Developer
- [ ] define what the player must understand in first 10 minutes
- [ ] define what tutorial should not try to teach
- [ ] define which concepts need progressive reveal
**Gate:** onboarding scope is bounded and honest
→ `/simplify` → commit

### Phase 3. Command-Chain Literacy Flow (~1-2 sessions)
**Assigned to:** UI/UX Developer + Gameplay Programmer
- [ ] define how tutorial explains command hierarchy, friction, review, and consequences
- [ ] define first-session guidance for Army HQ / Warroom / order panels
- [ ] define tooltip, helper, and scenario teaching aids
**Gate:** tutorial teaches the real command game
→ `/simplify` → commit

### Phase 4. Playtest Loop (~1 session)
**Assigned to:** QA Engineer + Product Manager
- [ ] define onboarding-specific playtest questions
- [ ] define success/failure signals for first-session comprehension
- [ ] define iteration loop from tester confusion back into onboarding fixes
**Gate:** tutorial quality is judged by player understanding, not internal optimism
→ `/simplify` → commit

### Phase 5. Roadmap Integration (~1 session)
**Assigned to:** Documentation Specialist + Product Manager
- [ ] align `v0.9.2` wording and status table with the real onboarding lane
- [ ] append ledger/knowledge notes for onboarding lessons
**Gate:** tutorial is no longer a floating promise
→ `/simplify` → commit

---

## 3. Protocol Enforcement

- [ ] Orchestrator oversees all phases
- [ ] scope changes are flagged for user review
- [ ] `.claude/napkin.md` is read at session start and updated during execution
- [ ] `docs/PROJECT_LEDGER.md` is appended when onboarding strategy materially changes
- [ ] `docs/life_lessons.md` is scanned before each phase
- [ ] future execution runs UI/playtest validation after each phase
- [ ] `/verification-before-completion` and `/awwv-pre-commit-check` run before completion
- [ ] one logical phase per commit
- [ ] `/create-report` produces a completion report in `docs/40_reports/implemented/`

## 4. Completion Checklist

- [ ] tutorial inventory exists
- [ ] onboarding scope exists
- [ ] command-chain literacy flow exists
- [ ] playtest loop exists
- [ ] roadmap/status table aligned
- [ ] `docs/PROJECT_LEDGER.md` appended
- [ ] `.claude/napkin.md` updated
- [ ] implementation report created

---

## 5. Success Criteria

- [ ] tutorial/onboarding has a real roadmap home
- [ ] the game can teach command friction and review systems honestly
- [ ] external playtesting has an explicit onboarding target
