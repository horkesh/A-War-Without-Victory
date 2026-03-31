# v0.9.0 Sensitive History Design Gate

**Date:** 2026-03-31  
**Status:** PLAN - REQUIRED PRE-GOLD DESIGN GATE  
**Roadmap slot:** v0.9.0  
**Overseer:** Orchestrator  
**Architect:** Game Designer / Product Manager - may define the gate and review structure, but must flag sensitive design calls for user review  
**Primary implementer roles:** Game Designer, Historian, Documentation Specialist, Product Manager  
**Primary reviewer roles:** War-or-Game; Historian; Quality Assurance Process; Modern Wargame Expert if UI/narrative surface implications are involved  
**Gate:** Must be resolved before the roadmap can honestly claim gold readiness for consequence system, Cost Ledger, or full campaign ship posture  
**Prerequisites:** current canon on Srebrenica, enclaves, atrocity visibility, Cost Ledger design references, and event system consequences are available  
**Authoring basis:** `MASTER_ROADMAP.md`, relevant canon docs, ICTY-informed narrative references already in repo

**Relevant life lessons to respect while executing:**
- `docs/life_lessons.md`: the most sensitive subject must never be left to accidental design
- `docs/life_lessons.md`: respectful restraint is a design decision, not avoidance
- `docs/life_lessons.md`: a game can fail morally even if it works mechanically

---

## 0. Purpose

Some topics cannot stay in “open questions” until the end.

This plan exists to force explicit resolution of how the project handles:

- Srebrenica
- genocide / mass atrocity representation
- what is simulated mechanically
- what is represented narratively
- what is deliberately *not* turned into a toy system

This is not a feature lane.
It is a pre-gold moral and design gate.

---

## 1. Deliverables

- explicit design position on sensitive-history handling
- boundary between simulation, narrative consequence, and non-gamified representation
- implementation constraints for consequence system, Cost Ledger, and endgame surfaces
- review/sign-off structure for future implementation work

---

## 2. Pyrrhic Execution Plan

### Phase 1. Inventory Current Representation (~1 session)
**Assigned to:** Historian + Documentation Specialist
- [ ] inventory current mechanical and narrative representations of enclaves, atrocities, and Srebrenica-related content
- [ ] identify where the current implementation is explicit, implicit, or absent
- [ ] identify areas where the current project risks trivialization or accidental abstraction
**Gate:** one truthful inventory exists
→ `/simplify` → commit

### Phase 2. Boundary Decisions (~1-2 sessions)
**Assigned to:** Game Designer + Historian
- [ ] define what the game will model mechanically
- [ ] define what the game will represent narratively
- [ ] define what the game will refuse to present as a manipulable optimization problem
**Gate:** sensitive content boundaries are explicit
→ `/simplify` → commit

### Phase 3. Consequence / Cost Ledger Constraints (~1 session)
**Assigned to:** Product Manager + Documentation Specialist
- [ ] define constraints for consequence system implementation
- [ ] define constraints for Cost Ledger wording and endgame presentation
- [ ] define what supporting UI/content must avoid
**Gate:** later implementation lanes have hard guardrails
→ `/simplify` → commit

### Phase 4. Review Structure And Sign-Off (~1 session)
**Assigned to:** Orchestrator + Documentation Specialist
- [ ] define who must sign off before implementation closes
- [ ] define what evidence/review notes are required
- [ ] align roadmap and related plans with this gate
**Gate:** this is a real gate, not a paragraph
→ `/simplify` → commit

---

## 3. Protocol Enforcement

- [ ] Orchestrator oversees all phases
- [ ] sensitive design calls are flagged for user review
- [ ] `.claude/napkin.md` is read at session start and updated during execution
- [ ] `docs/PROJECT_LEDGER.md` is appended when the design gate changes materially
- [ ] relevant canon and history docs are reviewed before each phase
- [ ] `/verification-before-completion` and process QA run before closure
- [ ] one logical phase per commit
- [ ] `/create-report` produces a completion report in `docs/40_reports/implemented/`

## 4. Completion Checklist

- [ ] current representation inventory exists
- [ ] boundary decisions exist
- [ ] implementation constraints exist
- [ ] sign-off structure exists
- [ ] roadmap and related plans aligned
- [ ] `docs/PROJECT_LEDGER.md` appended
- [ ] `.claude/napkin.md` updated
- [ ] implementation report created

---

## 5. Success Criteria

- [ ] Srebrenica / atrocity handling is no longer an unslotted open question
- [ ] future implementation work has explicit moral/design guardrails
- [ ] the project can approach gold without pretending this problem will solve itself
