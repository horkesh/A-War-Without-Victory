# v0.9.0 Victory Conditions And Pyrrhic Scoring

**Date:** 2026-03-31  
**Status:** PLAN - READY FOR EXECUTION WHEN v0.9.0 OPENS  
**Roadmap slot:** v0.9.0  
**Overseer:** Orchestrator  
**Architect:** Product Manager / Game Designer - may define scoring and end-state structure, but must flag high-risk design calls for user review  
**Primary implementer roles:** Game Designer, Gameplay Programmer, Product Manager, QA Engineer  
**Primary reviewer roles:** War-or-Game; Modern Wargame Expert; Code Review; Quality Assurance Process  
**Gate:** Must be resolved before the roadmap can honestly claim `v1.0` is shippable  
**Prerequisites:** consequence system design is active; endgame and negotiation design references available; negative-sum thesis remains the guiding constraint  
**Authoring basis:** `MASTER_ROADMAP.md`, `ENDGAME_AND_NEGOTIATION_DESIGN.md`, current `evaluateVictoryConditions()` stub

**Relevant life lessons to respect while executing:**
- `docs/life_lessons.md`: a negative-sum game still needs a readable ending
- `docs/life_lessons.md`: scoring must reinforce the thesis, not betray it
- `docs/life_lessons.md`: do not hide philosophical indecision behind a stub forever

---

## 0. Purpose

The game cannot ship without a clear answer to:

- what counts as success
- what counts as failure
- what the player is being judged on
- how Pyrrhic success differs from arcade victory

This plan exists to turn that from an open design anxiety into a deliverable.

---

## 1. Deliverables

- explicit victory condition model
- explicit Pyrrhic score or equivalent end-state evaluation model
- scenario-level victory condition contract
- endgame presentation rules aligned with consequence system and Cost Ledger
- QA criteria for testing victory and failure states

---

## 2. Pyrrhic Execution Plan

### Phase 1. Thesis And Outcome Taxonomy (~1 session)
**Assigned to:** Game Designer + Product Manager
- [ ] define what “winning” can mean in a negative-sum Bosnian War game
- [ ] define multiple outcome classes: survival, strategic success, political success, Pyrrhic success, condemnation, failure
- [ ] define what the game must not reward
**Gate:** philosophical basis is explicit
→ `/simplify` → commit

### Phase 2. Mechanical Evaluation Model (~1-2 sessions)
**Assigned to:** Gameplay Programmer + Game Designer
- [ ] define candidate metrics: territory, population preserved, displacement caused, military viability, political legitimacy, negotiated position
- [ ] define how these combine into end-state evaluation
- [ ] define what belongs in score vs what belongs in narrative judgment
**Gate:** evaluation model is mechanically legible
→ `/simplify` → commit

### Phase 3. Scenario Contract And Data Needs (~1 session)
**Assigned to:** Product Manager + Gameplay Programmer
- [ ] define scenario JSON / config contract for victory conditions
- [ ] define fallback behavior for scenarios with no custom conditions
- [ ] define how endgame comparison and Cost Ledger consume the same substrate
**Gate:** implementation has a real data contract
→ `/simplify` → commit

### Phase 4. UX / Narrative Integration (~1 session)
**Assigned to:** UI/UX Developer + Documentation Specialist
- [ ] define how victory/failure/Pyrrhic assessment is shown to the player
- [ ] align it with consequence system, Cost Ledger, and endgame comparison
- [ ] avoid “scoreboard trivialization”
**Gate:** end-state presentation matches the game’s thesis
→ `/simplify` → commit

### Phase 5. QA And Roadmap Integration (~1 session)
**Assigned to:** QA Engineer + Documentation Specialist
- [ ] define test matrix for scenario victory states
- [ ] align roadmap and gold criteria with the final model
- [ ] append ledger/knowledge notes
**Gate:** victory conditions are roadmap-owned, not a future hope
→ `/simplify` → commit

---

## 3. Protocol Enforcement

- [ ] Orchestrator oversees all phases
- [ ] high-risk design calls are flagged for user review
- [ ] `.claude/napkin.md` is read at session start and updated during execution
- [ ] `docs/PROJECT_LEDGER.md` is appended when the scoring/victory contract changes materially
- [ ] `docs/life_lessons.md` is scanned before each phase
- [ ] future execution runs gameplay and endgame QA after each phase
- [ ] `/verification-before-completion` and `/awwv-pre-commit-check` run before completion
- [ ] one logical phase per commit
- [ ] `/create-report` produces a completion report in `docs/40_reports/implemented/`

## 4. Completion Checklist

- [ ] victory model exists
- [ ] Pyrrhic scoring/evaluation model exists
- [ ] scenario data contract exists
- [ ] UX/narrative integration rules exist
- [ ] QA matrix exists
- [ ] `docs/PROJECT_LEDGER.md` appended
- [ ] `.claude/napkin.md` updated
- [ ] implementation report created

---

## 5. Success Criteria

- [ ] `v1.0` no longer depends on a stub victory system
- [ ] the end-state evaluation reinforces the game’s thesis
- [ ] scenario designers have an explicit contract for victory conditions
