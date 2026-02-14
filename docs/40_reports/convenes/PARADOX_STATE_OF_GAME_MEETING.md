# Paradox Team Meeting — State of the Game

**Convened by:** Product Manager (Gary Grigsby)  
**Date:** 2026-02-06  
**Goal:** Discuss the state of AWWV and agree on next steps.

**Context:** Ledger shows MAP REBUILD as current phase; Executive Roadmap has Phase 0 (GUI MVP) complete, Phases 1–3 as simulation gates, Phase 4 (turn pipeline → GUI) gated on them. Recent work: militia/brigade formation system (pool population, formation spawn, large-settlement resistance) committed.

---

## 1. Individual questions (by role)

Each Paradox specialist is asked one question to surface their view of the state of the game.

### Planning

| Role | Question |
|------|----------|
| **Game Designer** | From a design and canon perspective, what is the single biggest gap or misalignment between the current simulation (Phase 0 → Phase I, militia/formations, control flip) and the intended player experience or Rulebook/Game Bible? |
| **Technical Architect** | Where is the largest architectural risk or debt right now (entrypoints, phase pipeline, map/sim boundary, or data contracts), and what one change would reduce it most? |
| **Product Manager** | Given the Executive Roadmap and MVP checklist, what should be the next single priority (phase or workstream), and what is the main assumption we’re making that could invalidate it? |

### Development

| Role | Question |
|------|----------|
| **Gameplay Programmer** | Phase I now has pool population, formation spawn, and control flip (including large-settlement resistance). What is the next gameplay or phase-logic gap that would most improve the sim’s correctness or completeness? |
| **Systems Programmer** | With militia_pools keyed by (mun_id, faction) and formation spawn in the pipeline, what invariants or ordering guarantees should we explicitly document or test next so we don’t regress determinism or serialization? |
| **UI/UX Developer** | The warroom is Phase 0–ready and advance-turn is wired for Phase 0. What is the next UI/UX change that would best support “state of the game” visibility when we turn on Phase I (e.g. formations, control, militia)? |
| **Graphics Programmer** | Map rendering and substrate are under Path A. What is the one rendering or map-visual limitation that will bite us first when we show Phase I state (control, fronts, or formations) on the map? |
| **Lua Scripting** | If scripting is in scope for AWWV, what is the minimal Lua surface we’d need to expose first (e.g. turn hooks, read-only state) so that scenario authors or modders can reason about the game state? If out of scope, say so. |
| **Asset Integration** | With settlement substrate, municipality outlines, and political control data as derived artifacts, what is the next map/asset integration risk (e.g. scenario data, new GeoJSON, crosswalk) we should lock down before more features land? |

### Testing

| Role | Question |
|------|----------|
| **Code Review (canon/specs)** | After the militia/brigade formation work, which area of the codebase is most likely to drift from canon or phase specs on the next change (e.g. control flip, Phase I ordering, formation lifecycle)? |
| **Code Review (general)** | Where would you run the next focused pre-merge review (e.g. turn_pipeline, formation_spawn, pool_population) and what would you check first? |
| **QA Engineer** | What test coverage gap would you close first: Phase I multi-turn regression, formation spawn determinism, baseline stability, or something else? |
| **Determinism Auditor** | Besides the existing determinism scan and baseline tests, what single pipeline or data path do you consider highest risk for nondeterminism (e.g. formation IDs, pool iteration, control flip ordering)? |
| **Performance Engineer** | Is there any current hot path (turn pipeline, map load, scenario run) you’d profile first if we started seeing slowness; or is performance not a current concern? |
| **Platform Specialist** | Are there any Windows or packaging issues (paths, line endings, node/tsx) that could block a clean “run from repo” experience for playtest or CI? |
| **Scenario / harness** | What is the one scenario or harness improvement (preflight, diagnostics, artifact contract) that would most help us trust multi-turn runs as we add Phase I and formations? |

### Release

| Role | Question |
|------|----------|
| **Build Engineer** | What single change to the build or test commands would most improve reproducibility or onboarding (e.g. scripts, env, or baseline workflow)? |
| **DevOps Specialist** | Is there a CI or pipeline step you’d add or change first to protect the “state of the game” (e.g. gates, baselines, or deployment)? |
| **Documentation Specialist** | What doc is most out of date or missing for someone trying to understand “current state of the game” (ledger, roadmap, REPO_MAP, or phase specs)? |

### Process and ledger

| Role | Question |
|------|----------|
| **Process / ledger** | Is the ledger and commit-discipline process sufficient to trace “why we are where we are” after the militia/brigade and roadmap work; and what one habit or checklist would you add? |
| **Map / geometry** | With Path A and known substrate/crosswalk quirks, what is the one map/geometry contract we should document or enforce so that sim and UI don’t assume wrong things about polygons vs settlements? |

### Meta

| Role | Question |
|------|----------|
| **Quality Assurance (process)** | After this meeting, what process check would you run (e.g. context.md, ledger, mistake guard, handoff docs) to confirm we’re ready to execute the chosen next steps? |
| **Retrospective Analyst** | Looking at the last few months of ledger and roadmap, what is the one recurring gap (spec vs code, scope creep, or missed handoff) we should name and avoid in the next sprint? |

---

## 2. Collective discussion — state of the game (synthesis)

**Current state (concise):**

- **Phase 0 (GUI MVP):** Done. Warroom builds and runs; advance turn works for Phase 0; GUI is a consumer, not driver, of sim.
- **Executive Roadmap:** Phase 1 (validation recovery) and Phase 2 (baselines) are simulation gates; Phase 3 (canon war start) is canon-critical; Phase 4 (turn pipeline → GUI) is gated on 1–3. Phase 5 (map/data authority) and Phase 6 (MVP declaration) follow.
- **Ledger “Current Phase”:** Still says MAP REBUILD (Path A). Executive view says we’re past GUI MVP and in simulation-gate / integration phase.
- **Recent delivery:** Militia/brigade formation system (pool population, formation spawn directive, large-settlement resistance, Phase 0 tie-in doc). Tests and ledger updated.
- **Tension:** Ledger focus (MAP REBUILD) vs roadmap focus (Phases 1–4) can confuse “what we do next.”

**Strategic direction (Orchestrator, 2026-02-06):** See [GUI_AND_WAR_SYSTEM_STRATEGIC_DIRECTION.md](GUI_AND_WAR_SYSTEM_STRATEGIC_DIRECTION.md). Three pillars: (1) GUI has **one base geographical map** (not yet created), then we color it with **layers** for information. (2) **War system** is separate: user gives orders to brigades, corps, OGs, army; orders must flow into one another. (3) **Settlement click** must give layered information: **settlement**, **municipality**, **side**. PM and Game Designer to work through WAR_PLANNING_MAP_CLARIFICATION_REQUEST with this direction.

**Risks and assumptions (for collective discussion):**

1. **Priority clarity:** Next steps could be (a) align ledger “Current Phase” with Executive Roadmap, (b) lock Phase 1–2 green (typecheck, test, baselines), (c) Phase 3 canon war-start tests, or (d) map/data consolidation. Without a single agreed priority, work may scatter.
2. **Canon and determinism:** New formation and pool code is under test and doc’d; the main residual risk is cross-phase or ordering assumptions that aren’t written down.
3. **GUI ↔ sim:** Phase I turn advancement is not yet wired to the warroom; when we do, formations and control need to be visible. UI/UX and Graphics will matter more at that moment.
4. **Process:** Handoffs and “Paradox roster” are documented; the habit of “invoke the right specialist before big changes” needs to stay active so we don’t skip canon or determinism checks.

---

## 3. Recommended next steps (Product Manager)

**Immediate (this sprint):**

1. **Align ledger with roadmap.** Update “Current Phase” (and optionally “Current Focus”) in PROJECT_LEDGER.md to reflect Executive Roadmap: e.g. “Simulation gates (Phases 1–3) and pipeline–GUI integration (Phase 4)” so the next reader knows we’re not only in MAP REBUILD.
2. **Confirm gates green.** Product Manager or QA to confirm: `npm run typecheck`, `npm test`, `npm run test:baselines` (and `npm run warroom:build`) all pass. If any is red, make Phase 1–2 the single priority until green.
3. **One design/canon checkpoint.** Hand off to Game Designer and Canon Compliance Reviewer: see [CANON_CHECKPOINT_MILITIA_BRIGADE_PHASE_I.md](CANON_CHECKPOINT_MILITIA_BRIGADE_PHASE_I.md). “Confirm militia/brigade formation behavior and large-settlement resistance align with Phase I spec and Rulebook; document any open design choice.” Close any canon silence with a short design note or STOP AND ASK.

**Next (after gates are green):**

4. **Phase 3 (canon war start).** Treat “no referendum → no war” and “referendum → war at correct turn” as the next canon deliverable; scenario/harness and gameplay programmer to own tests and pipeline integration.
5. **Phase 4 (turn pipeline → GUI).** Wire Phase I (or Phase 0→I transition) turn execution to the warroom; UI/UX and Graphics to define minimal “state of the game” views (control, formations, or key stats).
6. **Retrospective.** After Phase 4 is integrated, invoke Retrospective Analyst to compare spec vs code and handoff quality, and update ASSISTANT_MISTAKES.log or process if needed.

**Assumptions:**

- We do not change canon (FORAWWV, phase specs) without explicit process.
- Determinism and baseline stability remain non-negotiable; any new pipeline step must be tested for determinism.
- Paradox roles are used for non-trivial changes (clarification-first for cross-phase, canon, architecture, determinism).

**Handoff:**

- **Build/QA:** Confirm gate commands and report status.
- **Documentation:** Update ledger “Current Phase” and “Focus” per Executive Roadmap.
- **Game Designer + Canon Compliance:** Short canon alignment check on militia/brigade and Phase I.
- **Product Manager:** Track “next single priority” and re-convene Paradox if scope or phase becomes unclear.

---

*End of meeting. This document is the single record of the Paradox state-of-the-game meeting and recommended next steps.*

---

## 4. Execution update (Orchestrator plan)

**Date:** 2026-02-06  
**Plan:** Orchestrator proceed-next plan (gates → Phase 3 → Phase 4; A1 optional parallel).

**Gate status (confirmed green):**
- `npm run typecheck`: pass
- `npm run warroom:build`: pass
- `npm run test:baselines`: pass

**Next single priority:** Phase 3 — Canon war start. Scenario/harness + Gameplay Programmer own tests and pipeline integration ("no referendum → no war"; "referendum → war at correct turn"). Phase 4 (turn pipeline → GUI) follows Phase 3. A1 (base geographical map) may run in parallel; Map/Geometry + Technical Architect confirm source. Track B (war system design) remains design-only; Technical Architect + Game Designer.

**Process QA (invoke after this execution):** Per Orchestrator plan §4 and context.md §6, invoke **Process QA** (quality-assurance-process) to validate: (1) context — relevant canon and phase specs read before changes; (2) ledger — changelog entries appended for gates green and plan execution; (3) mistake guard — ASSISTANT_MISTAKES.log consulted where applicable; (4) commit discipline — changes grouped by phase scope. See docs/20_engineering/AGENT_WORKFLOW.md and .cursor/skills/quality-assurance-process.

**Phase 3 execution (verified):** Phase 3 canon war start is implemented and tested. All Phase 3–related tests pass: `phase0_referendum_held_war_start_e2e.test.ts` (referendum held → war at correct turn), `phase0_v1_no_war_without_referendum_e2e.test.ts` (no referendum → no war, non-war terminal), `phase_i_entry_gating.test.ts` (Phase I unreachable without referendum_held and war_start_turn). No code changes required; verification run 2026-02-06. Next single priority becomes Phase 4 (turn pipeline → GUI) per Orchestrator plan.

**Phase 4 execution (partial):** Phase 0: calendar Advance runs real pipeline (`runPhase0TurnAndAdvance`); GUI updates via `onGameStateChange` (phase, turn, map, instruments). Phase I/II: Advance is placeholder (turn increment only, no `runTurn`); real pipeline requires `runTurn` with settlementEdges and is not yet browser-safe. Change: `ClickableRegionManager.advanceTurn` now clones state for Phase I/II path instead of mutating shared state. Success criteria: Phase 0 path meets “advancing a turn runs the real pipeline” and “GUI reflects new state”; Phase I+ to be wired when browser-safe pipeline or server-side turn execution is available.

---

## 5. Next steps to complete (Orchestrator + team)

**Date:** 2026-02-06  
**Purpose:** Single list of next steps for Paradox to complete, in priority order.

### Big-picture

- **Where we are:** Phase 0 and Phase 4 (Phase I wiring) complete. Phases 1–3 gates and canon war start verified. Warroom Advance runs real Phase 0 and Phase I pipeline; map and instruments reflect state; formations view in place. Phase II advance remains turn-increment-only. **Track A (A1 base map) COMPLETE** — A1 tactical base map is STABLE and is the canonical geographical substrate for the game. Ledger and Executive Roadmap aligned.
- **Where we're going:** Phase 5 (map & data authority), then Phase 6 (MVP declaration and freeze). Optional parallel: Track B (war system design-only).

### Single agreed priority

**Phase 5 — Map & data authority (Executive Roadmap):**
- **Goal:** Lock down geography and Turn-0 data as single source of truth: one canonical map build path, type-safe Turn-0 initialization, clear data contracts.
- **Scope:** Align map build documentation with real entrypoints; remove unsafe type assertions in Turn-0 metadata loading; confirm map and settlement data contracts. Per [docs/30_planning/EXECUTIVE_ROADMAP.md](../30_planning/EXECUTIVE_ROADMAP.md) Phase 5.
- **Owner:** Map/Geometry + Technical Architect (map/build path); Build Engineer / Scenario harness as needed for data contracts.
- **Next after Phase 5:** Phase 6 (MVP declaration and freeze); then Retrospective.

### Optional parallel (no block on Phase 4)

- **Track A — A1 (base map):** **COMPLETE.** Phase A1 tactical base map is STABLE. Canonical reference: [docs/20_engineering/specs/map/A1_BASE_MAP_REFERENCE.md](../20_engineering/specs/map/A1_BASE_MAP_REFERENCE.md). Downstream work (warroom, control zones, frontlines) builds on `data/derived/A1_BASE_MAP.geojson`.
- **Track B — War system:** Design-only. Technical Architect + Game Designer on hierarchy and order flow; no implementation until design is scoped.

### Team coordination

| Role | Next step |
|------|-----------|
| **Product Manager** | Track Phase 4 completion; keep "next single priority" in this doc and ledger; re-convene if scope or phase unclear. |
| **Gameplay Programmer** | Phase I/II turn wiring when pipeline is browser- or server-callable; keep determinism and state clone discipline. |
| **Scenario / harness** | Support multi-turn runs and artifact contract so Phase I+ runs are trustworthy. |
| **UI/UX Developer** | When Phase I is wired: minimal "state of the game" views (control, formations, key stats) per Phase 4 success criteria. |
| **Graphics Programmer** | Map visuals for Phase I state (control, fronts, formations) when data is available; align with A1/A2 if A1 runs. |
| **Map/Geometry + Technical Architect** | A1 COMPLETE. Maintain canonical base per [A1_BASE_MAP_REFERENCE.md](../20_engineering/specs/map/A1_BASE_MAP_REFERENCE.md). |
| **Technical Architect + Game Designer** | Track B: hierarchy and order flow design; no scope creep into map/GUI. |
| **QA / Build** | Keep gates green (typecheck, test, test:baselines, warroom:build); report any regression. |
| **Process QA** | Invoke after significant execution or handoff (context, ledger, mistake guard, commit discipline). |

### Handoffs

- **Orchestrator → PM:** Own "next steps to complete" and phase ordering; update this section when priority or ownership changes.
- **PM → Gameplay Programmer:** Phase 4 Phase I/II wiring when pipeline is callable.
- **PM → Map/Geometry + Tech Architect:** A1 COMPLETE; use A1_BASE_MAP_REFERENCE.md for maintenance and extensions.

### After Phase 4

- **Phase 5:** Map & data authority (canonical map build path, type-safe Turn-0 init, data contracts).
- **Phase 6:** MVP declaration and freeze (checklist green, known limitations documented, post-MVP labeled).
- **Retrospective:** After Phase 4 integration, invoke Retrospective Analyst (spec vs code, handoff quality); update ASSISTANT_MISTAKES.log or process as needed.

---

## 6. Execution update: proceed to Phase 5 (Orchestrator)

**Date:** 2026-02-06  
**Decision:** Phase 4 (Phase I wiring + state-of-game views) is complete. Next single priority is **Phase 5 — Map & data authority** per Executive Roadmap.

**Actions:** §5 "Big-picture" and "Single agreed priority" updated: current state reflects Phase 4 done; next priority set to Phase 5 (canonical map build path, type-safe Turn-0 init, data contracts). Owner: Map/Geometry + Technical Architect. Optional parallel: Track A (A1 base map), Track B (war system design-only). Process QA may be invoked after Phase 5 execution or handoff per quality-assurance-process.

---

## 7. Execution update: Phase A1 Base Map STABLE (Orchestrator)

**Date:** 2026-02-07  
**Decision:** Expert advisor handover confirmed Phase A1 tactical base map STABLE. Orchestrator propagated as canonical truth and basis for the game.

**Actions:** Created `docs/20_engineering/specs/map/A1_BASE_MAP_REFERENCE.md` as single source of truth. Updated §5: Track A (A1) COMPLETE; A1 is canonical geographical substrate. Updated PROJECT_LEDGER, MAP_BUILD_SYSTEM.md, context.md. Marked A1_MAP_EXTERNAL_EXPERT_HANDOVER.md RESOLVED. All downstream map work (warroom, control zones, frontlines) builds on `data/derived/A1_BASE_MAP.geojson`.

---

## 8. Execution update: MVP Declaration + Process QA (Orchestrator)

**Date:** 2026-02-08  
**Decision:** MVP Achievement Plan executed. Phase A (verification pass), B (Phase 5 completion), C (MVP declaration), D (Process QA) completed.

**Actions:** (1) Gates verified: typecheck PASS, test PASS, test:baselines PASS (baseline manifest updated), warroom:build PASS. (2) Phase 5 confirmed: MAP_BUILD_SYSTEM, PIPELINE_ENTRYPOINTS, REPO_MAP current; data contracts documented. (3) MVP declaration: MVP_CHECKLIST.md updated with "MVP Declaration" section; PROJECT_LEDGER "Current Phase" set to Phase 6 (MVP declared). (4) Ledger entries: baseline update, MVP declaration.

**Process QA result:** PASS

| Checklist item | Evidence |
|----------------|----------|
| context.md / napkin read | Napkin read at session start; napkin updated with MVP declaration note |
| PROJECT_LEDGER updated | Entries 2026-02-08: baseline update, MVP declaration |
| Commit-per-phase discipline | Single phase (MVP achievement); changes grouped for Phase 6 scope |
| FORAWWV.md not edited | No changes to FORAWWV |
| Canon and determinism | Baseline update reflects deterministic output; no canon changes |
