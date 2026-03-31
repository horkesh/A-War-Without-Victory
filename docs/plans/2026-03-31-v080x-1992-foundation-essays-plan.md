# v0.8.0.x 1992 Foundation Essays

**Date:** 2026-03-31  
**Status:** PLAN - READY FOR EXECUTION  
**Roadmap slot:** v0.8.0.x parallel content track  
**Overseer:** Orchestrator  
**Architect:** Documentation Specialist / Architect - may decide structure and placement, but flags canon-sensitive issues for user review  
**Primary implementer roles:** Historian, Documentation Specialist  
**Primary reviewer roles:** Historian, Documentation Specialist, QA for consistency pass  
**Sign-off:** Orchestrator, Historian  
**Purpose:** Deliver the 13 missing 1992 foundation essays as a clean parallel track with no engine risk

**Prerequisites:** Dynamic Codex pipeline operational; essay templates and Codex placement conventions understood; no gameplay or canon changes required beyond essay content itself

**Relevant life lessons to respect while executing:**
- `docs/life_lessons.md`: NEVER fabricate historical claims - dispatch /historian, don't speculate
- `docs/life_lessons.md`: Primary sources in local language override English Wikipedia
- `docs/life_lessons.md`: Verify corrected content after first-pass fixes

---

## 0. Scope

This is a pure content lane. It must not drag engine work, UI work, or roadmap-critical command work into the same stream.

Target output:
- 13 finished 1992 foundation essays
- each essay canon-consistent and historically sourced
- Codex placement / metadata consistent with existing essay system
- no gameplay logic touched

---

## 1. Candidate Deliverables

The exact essay list should be confirmed against the current missing-essay tracker, but this track is expected to cover the missing April-December 1992 foundational essays already referenced in roadmap notes and authoring specs.

Expected deliverables:
- 13 essay markdown files in the correct Codex location
- source notes / research backing sufficient for internal trust
- consistency pass against existing essay voice and structure

---

## 2. Pyrrhic Execution Plan

### Phase 1. Lock The Essay Roster (~1 session)

**Assigned to:** Historian  
**Reviewer:** Documentation Specialist  
**Sign-off:** Orchestrator, Historian

Tasks:
- [ ] inventory the exact 13 missing 1992 essays from current project references and Codex coverage
- [ ] map each essay to the correct date / trigger / Codex category
- [ ] identify which essays need strongest sourcing because they are politically or legally sensitive
- [ ] produce the final roster inside this plan or a linked checklist file

**Deliverables:**
- locked essay roster
- target locations / categories
- sourcing priority list

**Done gate:**
- the project can name all 13 essays unambiguously
- no duplicate or phantom essay work remains in the queue

→ `/simplify` → verification of roster against existing Codex coverage → commit

### Phase 2. Research Packets (~1-2 sessions)

**Assigned to:** Historian  
**Reviewer:** Historian  
**Sign-off:** Orchestrator, Historian

Tasks:
- [ ] gather source-backed notes for each essay
- [ ] separate confirmed facts from inference
- [ ] flag any disputes or ambiguities for later user review rather than smoothing them over
- [ ] prepare concise source packets so essay writing does not drift into speculation

**Deliverables:**
- source packets for all 13 essays
- ambiguity flags where needed

**Done gate:**
- every essay has enough source-backed material to draft without invention

→ `/simplify` → source sanity pass → commit

### Phase 3. Draft Essays In Batches (~2-4 sessions)

**Assigned to:** Historian + Documentation Specialist  
**Reviewer:** Documentation Specialist  
**Sign-off:** Orchestrator, Historian

Tasks:
- [ ] draft essays in small batches (3-5 at a time)
- [ ] keep essay structure and voice aligned with the existing certified Codex corpus
- [ ] avoid scope creep into template-engine or dynamic-essay work
- [ ] place each essay in its intended location as soon as the draft is stable

**Deliverables:**
- 13 drafted essays in repo

**Done gate:**
- all 13 essays exist on disk in the correct location
- structure and tone are consistent with the surrounding Codex material

→ `/simplify` → consistency pass → commit

### Phase 4. Quality And Canon Review (~1-2 sessions)

**Assigned to:** Documentation Specialist + Historian  
**Reviewer:** Historian, QA consistency pass  
**Sign-off:** Orchestrator, Historian

Tasks:
- [ ] verify names, dates, places, and claims against source packets
- [ ] check for repeated boilerplate, weak transitions, or unsourced assertions
- [ ] verify metadata / placement / discoverability in the Codex system
- [ ] correct any voice or quality drift across the 13 essays

**Deliverables:**
- reviewed essay set
- corrections pass complete

**Done gate:**
- no unsourced historical claims remain
- essays are ready for inclusion as certified content

→ `/simplify` → verification-before-completion → pre-commit-check → commit

---

## 3. Protocol Enforcement

- [ ] Orchestrator oversees the track
- [ ] No gameplay or engine files are modified in this content lane
- [ ] `.claude/napkin.md` read at session start and updated for recurring essay-authoring lessons
- [ ] `docs/PROJECT_LEDGER.md` updated when the content lane materially advances or closes
- [ ] `docs/life_lessons.md` scanned before each phase
- [ ] historical claims are source-backed, not inferred from intuition
- [ ] if canon conflict is found, stop and flag it rather than quietly resolving it

---

## 4. Completion Checklist

- [ ] all 13 essays exist in the correct Codex location
- [ ] project references to the missing-essay debt are updated
- [ ] `docs/PROJECT_LEDGER.md` appended
- [ ] `.claude/napkin.md` updated if new recurring content-authoring lessons emerged
- [ ] completion report written to `docs/40_reports/implemented/` if this lane closes as a distinct milestone deliverable

---

## 5. What This Unblocks

- removes the lingering `v0.7.0.1` content debt from the active roadmap
- clears the historical essay corpus before dynamic essay/template work in `v0.8-to-v0.9`
- reduces the chance that later Codex work gets dragged backward into missing core content

---

## 6. Summary For Implementers

This is a clean parallel lane.
Do not let it become a stealth engine project.

The shortest execution brief is:
- lock the 13-essay roster
- research each one properly
- draft in batches
- run a hard historical consistency pass
- close the debt without touching sim behavior
