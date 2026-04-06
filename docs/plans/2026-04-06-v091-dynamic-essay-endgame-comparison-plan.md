# v0.9.1 Dynamic Essay Content + Endgame Comparison

**Date:** 2026-04-06  
**Status:** PLAN - READY FOR EXECUTION  
**Roadmap slot:** v0.9.1  
**Overseer:** Orchestrator  
**Architect:** Technical Architect - owns milestone reshaping against repo truth  
**Primary implementer roles:** Documentation Specialist, Technical Architect, Systems Programmer, UI/UX Developer, Historian  
**Primary reviewer roles:** Game Designer, QA Engineer, Process QA, Code Review (canon/specs)  
**Sign-off:** Orchestrator, Technical Architect, Documentation Specialist

**Purpose:** Finish the dynamic Codex milestone around what is actually still open. Ghost Map, Exhaustion Clock, and Letter Home are already live; this milestone now covers the remaining dynamic essay engine, divergence notes / ghost entries, and endgame comparison.

**Repo-truth baseline (do not re-invent already shipped work):**
- `Ghost Map` is implemented
- `Exhaustion Clock` is implemented
- `Letter Home` is implemented
- `Endgame Comparison` is not implemented
- dynamic essay sections / ghost entries / divergence notes are not implemented

**Input docs (supporting, not milestone authorities by themselves):**
- `docs/plans/2026-03-23-essay-template-engine-plan.md`
- `docs/plans/2026-03-26-endgame-comparison-data-requirements.md`
- `docs/plans/2026-03-25-letter-home-and-essay-authoring-spec.md`

---

## 0. Scope

### In scope

- dynamic Codex essay schema and renderer support
- divergence notes and ghost entries
- endgame comparison data contract and first playable surface
- historical baseline data ownership and sourcing contract
- integration with already-live Letter Home / Ghost Map only where it materially supports the milestone

### Out of scope

- rebuilding Ghost Map
- rebuilding Exhaustion Clock
- rebuilding Letter Home
- broad Codex UI redesign unrelated to dynamic content

---

## 1. Deliverables

1. one canonical dynamic essay schema and runtime evaluation path
2. one ghost-entry / divergence-note rendering path in the Codex
3. one historical baseline data artifact for endgame comparison
4. one endgame comparison surface using player-war vs historical-war data
5. one roadmap/docs correction pass that marks already-shipped inputs correctly

---

## 2. Pyrrhic Execution Plan

### Phase 1. Dynamic Essay Engine
**Assigned to:** Systems Programmer + Documentation Specialist

- [ ] define the canonical dynamic essay schema
- [ ] add runtime condition evaluation for dynamic sections
- [ ] support divergence notes and ghost entries
- [ ] ensure canonical historical text remains immutable substrate

**Gate:** A dynamic essay can render canonical text plus deterministic inserted sections without mutating the base essay.

### Phase 2. Historical Baseline and Comparison Contract
**Assigned to:** Historian + Technical Architect

- [ ] resolve the historical baseline data contract
- [ ] create the first `historical_baseline` artifact
- [ ] settle comparison categories:
  - territory
  - casualties
  - displacement
  - duration
  - key event divergence

**Gate:** Endgame comparison has one authoritative baseline format and one authority owner.

### Phase 3. Endgame Comparison Surface
**Assigned to:** UI/UX Developer + Gameplay Programmer

- [ ] implement the first player-facing endgame comparison surface
- [ ] show player-war vs historical-war side-by-side
- [ ] include divergence notes sourced from real dynamic/Codex state

**Gate:** The player can see a truthful comparison between their war and the historical baseline.

### Phase 4. Verification
**Assigned to:** QA Engineer

- [ ] targeted tests for:
  - dynamic essay condition evaluation
  - ghost entry visibility
  - divergence note rendering
  - historical baseline loading
  - endgame comparison data integrity
- [ ] full vitest
- [ ] `npx.cmd tsc --noEmit -p tsconfig.json`
- [ ] `npm.cmd run build`

### Phase 5. Documentation and Roadmap Truth
**Assigned to:** Documentation Specialist

- [ ] implementation report in `docs/40_reports/implemented/`
- [ ] update `docs/PROJECT_LEDGER.md`
- [ ] update `.claude/architect_notes.md`
- [ ] ensure `MASTER_ROADMAP.md` reflects that Ghost Map / Exhaustion Clock / Letter Home are already implemented inputs, not open milestone deliverables

---

## 3. Required Outputs

- exact dynamic essay schema that landed
- exact divergence/ghost behavior that landed
- exact endgame comparison surface that landed
- exact tests added
- exact verification results
- exact follow-up work, if any, before `v0.9.2`
