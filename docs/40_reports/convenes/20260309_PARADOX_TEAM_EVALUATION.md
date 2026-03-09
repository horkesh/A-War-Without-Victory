# Paradox Team State of the Game Evaluation

**Date:** 2026-03-09
**Convener:** Orchestrator
**Participants:** Technical Architect, Gameplay Programmer, UI/UX Developer, QA Engineer

## Executive Summary
The Paradox team conducted a comprehensive, multi-agent evaluation of the AWWV codebase, grading each system independently and analyzing their interoperability. 

The engine exhibits world-class determinism and strict architectural discipline. The React-based Tactical Map is a gold standard for strategy game interfaces. However, technical debt is accumulating in the form of a monolithic `GameState`, highly complex combat/front algorithms, and a fragmented QA pipeline lacking coverage metrics. The Warroom UI also suffers from incomplete placeholder flows that break immersion.

---

## 1. Architecture & Data Flow
**Grade: A-**  
*Evaluator: Technical Architect*

**What works well:**
- **Pipeline Orchestration:** The separation of the orchestrator (`src/sim/turn_pipeline.ts`) from phase logic creates clear boundaries where execution steps are deterministic and sequentially invoked.
- **Strict Canonical vs. Derived Split:** The engine strictly divides data into Canonical State (player inputs, results) and Derived State (calculated each turn, never persisted).
- **Serialization Engine:** Deep key sorting and strict property checks guarantee byte-for-byte identical output across platforms.

**What needs improvement:**
- **Monolithic State:** The `GameState` interface has grown massively (>100 top-level fields). It creates a very wide surface area for any pipeline phase.
- **Manual Validation:** `deserializeState` and `validateGameState.ts` rely heavily on bespoke, manual type-checking rather than a deterministic schema validator (like Zod), increasing maintenance overhead.
- **Legacy Systems:** While OSID migration is structurally enforced, legacy AoR (Area of Responsibility) and SID ghosts still add conceptual overhead.

---

## 2. Simulation Mechanics & Bot AI
**Grade: A-**  
*Evaluator: Gameplay Programmer*

**What works well:**
- **Command Hierarchy & Supply Agency:** Excellent separation of concerns between Corps Directives and Brigade Execution. The supply network correctly uses graph connectivity, smoothly escalating from 'adequate' to 'strained' to 'critical'.
- **Operational Movement:** Clean differentiation between tactical 1-hop shuffling and strategic column marches from the deep interior.
- **Combat Modifiers:** Highly detailed and integrated modifiers (artillery suppression, urban defense, officer quality). Fog of War realistically underestimates defender power until a retreat lifts the fog.

**What needs improvement:**
- **Algorithmic Complexity (`corps_front_sectors.ts`):** Rebuilding Voronoi front sectors every turn is computationally heavy. Pocket and enclave containment artifacts can occasionally create brittle 0-edge ghost sectors.
- **The Evaluation Loop (`bot_brigade_ai_osid.ts`):** The brigade decision loop evaluates multiple overlapping priorities (Hold vs Attack vs Fill Gaps) in a massive ~1000-line monolithic evaluator, risking priority collisions.
- **Layered Modifier Tuning:** Balancing combat outcomes requires tweaking terrain constraints, equipment ratios, and bombardment multipliers simultaneously, which is mathematically pure but hard to tune.

---

## 3. UI/UX (Tactical Map & Warroom)
**Grade: B+**  
*Evaluator: UI/UX Developer*

**What works well:**
- **React Architecture (Map):** The MapLibre GL JS + PMTiles stack with Zustand state management is breathtaking and highly performant. GeoJSON is deterministically derived from `LoadedGameState`.
- **Panel Choreography:** The `derivePanelRailState` ensures detail panels slide out predictably from the right, eradicating overlapping "z-index wars".

**What needs improvement:**
- **Warroom Placeholders:** The Warroom still relies on P0 placeholders. "Settings" opens a coming soon dialog, "Command Briefing" routes generically to Reports, and "Operational Situation" is missing.
- **Tech Stack Divergence:** The Warroom uses vanilla TypeScript, native Canvas 2D overlays, and raw DOM manipulation. This contrasts sharply with the declarative React map architecture, making component reuse difficult.

---

## 4. QA, Determinism & Baseline Pipelines
**Grade: B+**  
*Evaluator: QA Engineer*

**What works well:**
- **Determinism:** Ban on `Math.random()`, reliance on seeded Mulberry32, static scanning against timestamps, and exclusion of `Map`/`Set` in canonical state.
- **Scenario Baseline Runner:** Highly rigorous SHA-256 artifact hashing and byte-identical enforcement against a committed manifest.
- **Test Volume:** Over 260 test files thoroughly covering core logic, optimized between Node native runner and Vitest.

**What needs improvement:**
- **Zero Coverage Measurement:** There is no code coverage tooling (e.g., `c8`, `@vitest/coverage-v8`) configured, meaning there are no enforced thresholds to prevent regression on untested branches.
- **Fragmented Pipelines:** `package.json` has ballooned to over 150 scripts. Running a full unified test requires stitching together vitest, node tools, map builds, and baseline regressions manually.
- **Baseline Scenario Scope:** The baseline runner defaults to `noop_4w` and `baseline_ops_4w`, lacking a full 52-week war-phase scenario to ensure full-cycle simulation regression.

---

## Recommendations & Next Steps
1. **QA Unification:** Consolidate the 150+ npm scripts into a `qa:all` command and implement V8 coverage reporting to establish measurable regression thresholds.
2. **Warroom Completion:** Prioritize the Command Briefing and Operational Situation modals to close the immersion gaps in the Phase E UI.
3. **Engine Refactoring:** Group the `GameState` into nested sub-domains and modularize the monolithic bot AI evaluator to ensure long-term maintainability.
