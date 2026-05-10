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
- `Endgame Comparison` is partially implemented: `historicalComparison` already feeds `VerdictScreen`, Chronicle, and Wrapped
- dynamic essay sections / ghost entries / divergence notes are partially implemented in the first Codex slice (`dynamic_sections`, `ghost_when`, ghost essays / entries for paths not taken)
- 2026-05-10 update: the Codex resolver also consumes Cost Ledger findings through deterministic atoms/tokens, and the Srebrenica + Dayton essays render source-labeled prosecutorial finding inserts.
- 2026-05-10 update: authored findings breadth now extends beyond Srebrenica/Dayton. The Ahmici essay consumes HRHB war-crimes findings, and the Operation Storm essay consumes displacement findings through the same deterministic Cost Ledger atoms/tokens.
- 2026-05-10 update: the second findings-breadth wave adds Zepa rupture-finding consumption and Federation Offensive human-cost finding consumption, again using existing Cost Ledger atoms/tokens only.
- 2026-05-10 update: the third authored breadth wave adds Drina, Prijedor camps, HVO camps, Markale shelling, Dayton talks, and Grabovica/Uzdol consumers using existing Cost Ledger and milestone atoms/tokens only.
- 2026-05-10 update: the fourth authored breadth wave adds Tuzla Gate, Second Markale, and Stupni Do consumers using existing human-cost and HRHB war-crimes Cost Ledger atoms/tokens only.
- 2026-05-10 update: the early-peace reader bridge adds a Vance-Owen dynamic section that consumes the `early_peace_implementation_record` duration finding emitted by the Cost Ledger, preserving termination as a record rather than moral credit.
- 2026-05-10 update: the fifth authored breadth wave adds faction-scoped war-crimes finding tokens and four founding-constraint/corridor consumers: RS strategic goals, Herceg-Bosna political project, the arms embargo, and Operation Corridor.
- 2026-05-10 update: the sixth authored breadth wave adds seven diplomatic/siege-continuity consumers using existing Cost Ledger and milestone atoms only: JNA withdrawal, Owen-Stoltenberg, Bosnian Assembly rejection of Owen-Stoltenberg, Contact Group plan, Bihac crisis, Carter cessation of hostilities, and ceasefire expiry.
- 2026-05-10 update: `VerdictScreen` now renders deterministic milestone comparison rows from `historicalComparison.milestone_comparison`, with an older-save `War Duration` fallback derived from `costLedger.war_duration_weeks` and `duration_delta_weeks`.
- 2026-05-10 update: `historical_baseline.json` now authors the first milestone rows for Srebrenica and Dayton; `compareToHistorical(...)` emits them from baseline data and preserved rupture record turns.
- 2026-05-10 update: the Codex resolver now supports deterministic `MILESTONE:<id>[:status]` atoms plus milestone interpolation tokens, and the Srebrenica / Dayton essays consume those rows through authored dynamic sections.

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

1. broaden and stabilize the canonical dynamic essay schema and runtime evaluation path beyond the first live slice
2. deepen ghost-entry / divergence-note rendering in Codex without duplicating already-landed comparison truth
3. keep one authoritative historical baseline data artifact for endgame comparison
4. improve the player-facing endgame comparison experience beyond the first already-live surface set
5. keep roadmap/docs aligned with already-shipped milestone inputs and partial implementations

---

## 2. Pyrrhic Execution Plan

### Phase 1. Dynamic Essay Engine
**Assigned to:** Systems Programmer + Documentation Specialist

- [x] define the canonical dynamic essay schema (`dynamic_sections`, `ghost_when`, dynamic variants)
- [x] add runtime condition evaluation for dynamic sections, including comparison, Cost Ledger finding, and milestone atoms
- [x] support divergence notes, ghost entries, Cost Ledger findings, and milestone rows in dynamic essay output
- [ ] ensure canonical historical text remains immutable substrate

**Gate:** A dynamic essay can render canonical text plus deterministic inserted sections without mutating the base essay.

### Phase 2. Historical Baseline and Comparison Contract
**Assigned to:** Historian + Technical Architect

- [ ] resolve the historical baseline data contract
- [x] create the first `historical_baseline` artifact
- [ ] settle comparison categories:
  - territory
  - casualties
  - displacement
  - duration
  - key event divergence
- [x] define the optional `milestone_comparison` row contract for downstream endgame surfaces
- [x] author first Srebrenica/Dayton milestone rows in `historical_baseline.json`

**Gate:** Endgame comparison has one authoritative baseline format and one authority owner.

### Phase 3. Endgame Comparison Surface
**Assigned to:** UI/UX Developer + Gameplay Programmer

- [x] implement the first player-facing endgame comparison surface
- [x] show player-war vs historical-war side-by-side for milestone timing rows
- [x] include divergence notes and Cost Ledger findings sourced from real endgame state
- [x] preserve rupture record turns so Srebrenica milestone timing can compare player week vs historical week

**Gate:** The player can see a truthful comparison between their war and the historical baseline.

### Phase 4. Verification
**Assigned to:** QA Engineer

- [ ] targeted tests for:
  - dynamic essay condition evaluation
  - ghost entry visibility
  - divergence note rendering
  - Cost Ledger finding atom/token rendering
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
- exact milestone comparison contract and fallback behavior that landed
- exact tests added
- exact verification results
- exact follow-up work, if any, before `v0.9.2`
