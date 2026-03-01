# Simulation Codebase Refactoring Plan (R2–R9)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan slice-by-slice. Each R-slice is one execution unit. Run `/awwv-pre-commit-check` before each commit.

**Date:** 2026-03-01
**Author:** Orchestrator (Technical Architect lead, Systems Programmer assist)
**Phase:** Post-MVP — code health and maintenance debt reduction
**Predecessor:** R1 (combat_math.ts extraction) — committed `ddc462d`, verified deterministic

**Goal:** Reduce maintenance debt across the simulation codebase — eliminate duplication, consolidate modules, remove dead code, and replace legacy naming with domain-descriptive names.

**Architecture:** Pure structural refactoring. No behavioral changes. Each slice extracts, consolidates, or renames code while preserving identical simulation output. Verification via state hash comparison on the 40w calibration scenario.

**Tech Stack:** TypeScript, Vitest, node:test, Vite (map UI build)

---

## 0. Required reading (per awwv-read-first)

Before executing any slice, the implementer MUST read:

| Document | Reason |
|----------|--------|
| `docs/10_canon/context.md` | Canon hierarchy, ledger rules, determinism invariants |
| `docs/10_canon/Systems_Manual_v0_6_0.md` | Authoritative system descriptions — verify extracted code matches spec |
| `docs/20_engineering/PIPELINE_ENTRYPOINTS.md` | Entrypoint contracts — ensure no entrypoint breaks |
| `docs/40_reports/CONSOLIDATED_IMPLEMENTED.md` | Implementation status — verify which systems are live vs legacy |
| `docs/PROJECT_LEDGER.md` (tail) | Recent changes — avoid conflicts with in-flight work |
| This plan (in full) | Understand sequencing dependencies between slices |

---

## 1. Assessment: Current State

### 1.1 Maintenance debt identified

| # | Issue | Files | Lines affected | Impact |
|---|-------|-------|---------------|--------|
| R2 | Supply reachability: parallel SID + OSID implementations (~80% identical BFS) | `supply_reachability.ts`, `supply_reachability_osid.ts` | ~340 | Med |
| R3 | Bot constants scattered across `bot_corps_ai.ts` (46 thresholds) and `bot_strategy.ts` (doctrine tables) | `bot_corps_ai.ts`, `bot_strategy.ts` | ~100 | Med |
| R4 | Adjacency graph builders: 4 similar implementations | `zoc.ts`, `phase_ii_adjacency.ts`, `brigade_aor.ts`, `adjacency_map.ts` | ~150 | Med |
| R5 | `brigade_aor.ts`: 1370-line legacy module, superseded by OSID/ZoC (§33) | `brigade_aor.ts` | 1370 | High |
| R6 | Serialization triple layer: `serialize.ts` + `serializeGameState.ts` + manual JSON in `scenario_runner.ts` | 3 files | ~800 | Med |
| R7 | `turn_pipeline.ts`: 2152-line god module, 150+ imports | `turn_pipeline.ts` | 2152 | High |
| R8 | Displacement engine split across 3 files with duplicated ethnicity/control checks | `displacement.ts`, `displacement_takeover.ts`, `minority_flight.ts` | ~1978 | High |
| R9 | Legacy `phase_i`/`phase_ii` directory and file naming throughout codebase | 6 directories, 68 source files, 19 test files, 165+ imports | ~165 import rewrites | High |

### 1.2 What R1 established

- Pattern: extract shared pure functions into dedicated module, import from both consumers
- Backward-compat re-exports for type aliases during transition
- Verification gate: tsc + vitest + scenario hash determinism
- Zero behavioral change confirmed via state hash comparison

### 1.3 Constraints

- **Determinism is sacred**: every refactoring must produce identical state hashes
- **No behavioral changes**: pure structural extraction only
- **Sorted iteration preserved**: all `strictCompare` patterns must survive
- **Tests must pass**: vitest 190+, node:test suites, map UI build

---

## 2. Priority sequencing and rationale

**Sequence:** R2 → R3 → R4 → R5 → R6 → R7 → R8 → R9

**Rationale:**
- R2–R4 are quick wins (small effort, clear scope, independent). Build momentum and reduce noise before larger refactors.
- R5 (brigade_aor deletion) removes 1370 lines of dead code, simplifying R4 (one fewer adjacency builder) and reducing test confusion. Do after R4 so adjacency consolidation is done first.
- R6 (serialization) is medium effort and prerequisite cleanup for R7 (turn_pipeline), which has the widest import surface.
- R7 (turn_pipeline split) is the largest single refactor. Do late so earlier refactors have already reduced import noise.
- R8 (displacement consolidation) is the most complex domain logic. Benefits from all prior cleanup.
- R9 (phase naming phaseout) is absolute last — it's a mechanical mass-rename touching 100+ files. All prior refactors must complete first so we rename stable, final file paths (not files that are about to move/merge/delete in R2–R8).

**Deferred:** GUI refactoring (separate concern; tracked in GUI Phase 3 remainder plan).

---

## 3. Execution plan

### R2: Unify Supply Reachability — DONE ✓ (`aace4d1`)

**Owner:** Systems Programmer
**Effort:** Small (~1 hour)

**Scope:**
1. Read `src/state/supply_reachability.ts` and `src/state/supply_reachability_osid.ts` — identify shared BFS logic.
2. Create single parameterized function (or refactor one file to call the other) that handles both SID-keyed and OSID-keyed graphs.
3. Delete the redundant file; redirect imports.
4. Update any tests importing from the deleted file.

**Acceptance:**
- Single supply reachability module (or one delegates to other)
- tsc clean, vitest pass, 40w scenario hash unchanged
- ~120 lines eliminated

**Result:** Extracted shared `runSupplyBfs()` function with `SupplyBfsParams`/`SupplyBfsResult` interfaces into `supply_reachability.ts`. OSID variant calls it via imports. Both files kept (different graph types, different control checks, corridor support only in SID variant). Net savings ~30 lines. Assessment corrected: not 80% identical — only BFS core (~35 lines) was shared.

---

### R3: Centralize Bot Constants — DONE ✓ (`70317c6`)

**Owner:** Systems Programmer
**Effort:** Small (~45 min)

**Scope:**
1. Create `src/sim/phase_ii/bot_constants.ts`.
2. Move the 46 threshold constants from `bot_corps_ai.ts` lines 47–97 into it.
3. Move doctrine-related constants from `bot_strategy.ts` that are pure tuning knobs (not faction-specific strategy tables).
4. Both files import from `bot_constants.ts`.
5. Add brief JSDoc per constant grouping (threat thresholds, reserve fractions, cohesion gates).

**Acceptance:**
- All bot tuning constants in one file for calibration visibility
- No behavioral change — same values, same usage
- tsc clean, vitest pass

**Result:** Created `bot_constants.ts` (~95 lines) with 23 constants grouped by category. 19 from `bot_corps_ai.ts`, 4 from `bot_strategy.ts`. Backward-compat re-exports in `bot_strategy.ts`. Note: `control_flip.ts` has its own `RS_EARLY_WAR_END_WEEK = 26` — different value/purpose, intentionally left separate.

---

### R4: Consolidate Adjacency Builders — DONE ✓ (uncommitted)

**Owner:** Technical Architect
**Effort:** Medium (~2 hours)

**Scope:**
1. Audit all 4 adjacency builders:
   - `buildOsidAdjacency` in `zoc.ts` (OSID graph from edges)
   - `buildAdjacencyFromEdges` in `phase_ii_adjacency.ts` (same or similar)
   - `buildMunicipalityAdjacency` in `brigade_aor.ts` (settlement-level, legacy)
   - `buildAdjacencyMap` in `map/adjacency_map.ts` (canonical settlement graph)
2. Determine which are truly distinct (different input types/scopes) vs duplicated.
3. For duplicates: consolidate into single canonical implementation; have others delegate.
4. For distinct scopes: document why they differ; standardize naming (`buildXAdjacency`).
5. `phase_ii_adjacency.ts` likely becomes a thin re-export or is deleted.

**Acceptance:**
- No more than 2 distinct adjacency builders (OSID-level + settlement-level)
- Consistent naming
- tsc clean, vitest pass, scenario hash unchanged

**Result:** Eliminated 2 local OSID adjacency duplicates (`supply_reachability_osid.ts`, `supply_state_derivation.ts`) — both now import canonical `buildOsidAdjacency` from `zoc.ts`. Assessment corrected: 3 genuinely distinct builders (OSID sorted-array, settlement Set-based, settlement sorted-Record) serve different graph levels and must remain. `phase_ii_adjacency.ts` contains contiguity checks + faction helpers beyond adjacency — stays. Also removed dead `deriveEnclaveResilience` stub.

---

### R5: Remove Legacy brigade_aor.ts

**Owner:** Systems Programmer
**Effort:** Medium (~2 hours)

**Scope:**
1. Grep all imports of `brigade_aor.ts` across codebase and tests.
2. For each consumer:
   - If it uses adjacency functions → redirect to consolidated adjacency (from R4).
   - If it uses AoR-specific logic → verify it's dead code (superseded by OSID/ZoC per §33). Remove the import.
   - If tests use AoR fixtures → mark as legacy or delete if they test removed functionality.
3. Delete `src/sim/phase_ii/brigade_aor.ts`.
4. Clean up any `brigade_aor.test.ts` tests that only test deleted code. Keep any tests that were migrated to OSID patterns.
5. Update `CONSOLIDATED_IMPLEMENTED.md` §33 to note file deletion.

**Acceptance:**
- `brigade_aor.ts` deleted
- No remaining imports of it
- All vitest + node:test suites pass (some skipped AoR tests may be deleted)
- ~1370 lines removed

---

### R6: Unify Serialization Layer

**Owner:** Technical Architect
**Effort:** Medium (~3 hours)

**Scope:**
1. Read all three serialization touchpoints:
   - `src/state/serialize.ts` (588 lines — `serializeState`/`deserializeState`)
   - `src/state/serializeGameState.ts` (204 lines — wrapper layer)
   - `src/scenario/scenario_runner.ts` lines 1500+ (manual JSON building for save files)
2. Determine the authoritative serialization path. `serialize.ts` is likely canonical.
3. If `serializeGameState.ts` is a thin wrapper, inline it into `serialize.ts` and delete.
4. Replace manual JSON building in `scenario_runner.ts` with calls to the canonical serializer.
5. Verify round-trip: serialize → deserialize produces identical GameState.

**Acceptance:**
- Single serialization entry point (1 file, not 3)
- Scenario runner uses canonical serializer
- tsc clean, vitest pass, scenario saves still loadable by map GUI
- ~200 lines eliminated

---

### R7: Split turn_pipeline.ts

**Owner:** Technical Architect (Systems Programmer assist)
**Effort:** Large (~4 hours)

**Scope:**
1. Read `src/sim/turn_pipeline.ts` (2152 lines). Identify logical phase boundaries.
2. Create `src/sim/turn_phases/` directory.
3. Extract each phase's orchestration into its own file:
   - `turn_phases/recruitment_phase.ts` — recruitment engine calls
   - `turn_phases/combat_phase.ts` — attack order resolution, bot AI dispatch
   - `turn_phases/movement_phase.ts` — column movement, deployment
   - `turn_phases/supply_phase.ts` — supply derivation, reachability
   - `turn_phases/displacement_phase.ts` — displacement pipeline calls
   - `turn_phases/maintenance_phase.ts` — cohesion drift, entrenchment, morale
4. `turn_pipeline.ts` becomes a slim orchestrator (~200 lines) that imports and sequences phase runners.
5. Each phase file exports a single `run(state, context) → report` function.
6. Move step definitions (`{ name, run }`) into phase files.

**Acceptance:**
- `turn_pipeline.ts` < 300 lines
- Phase files independently readable
- Same step names, same execution order
- tsc clean, vitest pass, scenario hash unchanged

---

### R8: Consolidate Displacement Engine

**Owner:** Systems Programmer (Game Designer review)
**Effort:** Large (~4 hours)

**Scope:**
1. Read all three displacement files:
   - `src/state/displacement.ts` (854 lines) — core accumulation, routing
   - `src/state/displacement_takeover.ts` (764 lines) — hostile takeover timers
   - `src/state/minority_flight.ts` (360 lines) — non-takeover flight
2. Identify shared logic: ethnicity lookups, control checks, population routing, camp mechanics.
3. Extract shared helpers into `displacement_helpers.ts` (or inline into a unified module).
4. Options (choose during implementation):
   - **Option A**: Keep 3 files but extract shared helpers (~200 lines saved).
   - **Option B**: Merge into single `displacement_engine.ts` with internal phases.
5. Ensure all displacement pipeline steps in `turn_pipeline.ts` still resolve.
6. Game Designer reviews: no mechanical changes, same displacement amounts.

**Acceptance:**
- Shared ethnicity/control/routing logic exists in exactly one place
- tsc clean, vitest pass, scenario hash unchanged
- Displacement totals in 40w run identical (verify via `displacement_event_log`)

---

### R9: Phase Out `phase_i`/`phase_ii` Naming

**Owner:** Technical Architect (Systems Programmer assist)
**Effort:** Large (~5 hours — mechanical but wide blast radius)

**Context:**
The `phase_i`/`phase_ii` directory and file naming is a legacy artifact of the original phased development plan. Now that the simulation is post-MVP with all phases live, these names are confusing — they describe *when code was written*, not *what it does*. New contributors cannot infer module purpose from the name.

**Inventory (post R2–R8; counts will shrink as earlier slices delete/merge files):**

| Category | Count | Details |
|----------|-------|---------|
| Directories | 6 | `src/sim/phase_i/`, `src/sim/phase_ii/`, `src/sim/phase_e/`, `src/sim/phase_f/`, `src/sim/phase_transitions/`, `tests/` (files within) |
| Source files in `phase_i/` | 18 | militia emergence, JNA transition, authority degradation, control strain, pool population, etc. |
| Source files in `phase_ii/` | ~50 | combat resolution, bot AI, brigade movement, ZoC, fronts, morale, cohesion, etc. (minus files deleted by R4/R5) |
| Source files in `phase_e/` | 5 | front emergence, pressure diffusion, AoR instantiation |
| Source files in `phase_f/` | 4 | displacement triggers, accumulation, capacity hooks |
| Root-level phase files | 2 | `run_phase_i_browser.ts`, `run_phase_ii_browser.ts` |
| Test files with phase naming | 19 | `phase_i_*.test.ts` (12), `phase_ii_*.test.ts` (7) |
| Scenario files | 3 | `apr1992_phase_i_to_apr1993_52w.json`, `apr1992_phase_ii_4w.json`, `historical_mvp_apr1992_phase_ii_20w.json` |
| Import statements | 165+ | Across 60+ source files + 40+ test files |
| String references | 400+ | Import paths, comments, step names in turn_pipeline |

**Rename mapping:**

| Old | New | Rationale |
|-----|-----|-----------|
| `src/sim/phase_i/` | `src/sim/early_war/` | Contents: JNA dissolution, militia emergence, authority degradation, control strain — all early-war mobilization mechanics |
| `src/sim/phase_ii/` | `src/sim/combat/` | Contents: attack resolution, bot AI, brigade movement, ZoC, fronts, morale, cohesion — wartime operational mechanics |
| `src/sim/phase_e/` | `src/sim/emergence/` | Contents: front emergence, pressure diffusion, AoR instantiation — front-line emergence mechanics |
| `src/sim/phase_f/` | `src/sim/displacement_pipeline/` | Contents: displacement triggers, accumulation — displacement sub-pipeline (distinct from `src/state/displacement*.ts` core logic) |
| `src/sim/phase_transitions/` | `src/sim/transitions/` | Already descriptive; just drop the `phase_` prefix |
| `src/sim/run_phase_i_browser.ts` | `src/sim/run_early_war_browser.ts` | Match new directory name |
| `src/sim/run_phase_ii_browser.ts` | `src/sim/run_combat_browser.ts` | Match new directory name |
| `src/scenario/oob_phase_i_entry.ts` | `src/scenario/oob_early_war_entry.ts` | Match new convention |

**Test file renames (19 files):**
- `phase_i_*.test.ts` → `early_war_*.test.ts` (12 files)
- `phase_ii_*.test.ts` → `combat_*.test.ts` (7 files)
- `phase0_to_phasei_*.test.ts` → `prewar_to_early_war_*.test.ts` (1 file)
- `oob_phase_i_entry.test.ts` → `oob_early_war_entry.test.ts` (1 file)

**Scenario file renames (3 files):**
- `apr1992_phase_i_to_apr1993_52w.json` → `apr1992_early_war_52w.json`
- `apr1992_phase_ii_4w.json` → `apr1992_combat_4w.json`
- `historical_mvp_apr1992_phase_ii_20w.json` → `historical_mvp_apr1992_combat_20w.json`

**Execution sub-steps:**

1. **R9a: Rename directories** — `git mv` each directory. This breaks all imports immediately.
2. **R9b: Rename standalone files** — `git mv` browser runners, oob_phase_i_entry, test files, scenario files.
3. **R9c: Fix all import paths** — Bulk find-and-replace across all source + test files:
   - `phase_i/` → `early_war/`
   - `phase_ii/` → `combat/`
   - `phase_e/` → `emergence/`
   - `phase_f/` → `displacement_pipeline/`
   - `phase_transitions/` → `transitions/`
   - Individual file renames (browser runners, oob entry)
4. **R9d: Update turn_pipeline step names** — Step names like `'phase-i-militia-emergence'` in `turn_pipeline.ts` should be reviewed. If they appear in save files or serialized state, keep as-is to avoid breaking save compatibility; otherwise rename to match new convention.
5. **R9e: Update scenario JSON internals** — Check for `phase_i`/`phase_ii` string references inside scenario JSON files (step names, phase identifiers). Update if safe.
6. **R9f: Update comments and docs** — Grep for remaining `phase_i`/`phase_ii` references in comments, doc strings, and markdown. Update to new names.
7. **R9g: Verify npm scripts** — Check `package.json` for any scripts referencing old paths. Update.
8. **R9h: Smoke-test triad** — Full build + test + scenario run.

**Save compatibility warning:** If `turn_pipeline.ts` step names (e.g., `'phase-i-militia-emergence'`) are persisted in save files via `TurnReport`, renaming them would break save loading. In that case, keep the serialized step names unchanged and only rename internal code references. Document the legacy step names in a comment.

**Acceptance:**
- Zero source files or directories with `phase_i`/`phase_ii` in their path
- All imports resolve to new paths
- tsc clean, vitest pass, scenario hash unchanged
- Save files remain loadable by map GUI
- No behavioral change — pure rename

---

## 4. Gates (all slices)

| Gate | Requirement |
|------|-------------|
| **Validation-first** | Read target files fully before any edits |
| **Determinism** | No `Math.random()`, `Date.now()`, unsorted iteration introduced |
| **Smoke-test triad** | `npx tsc --noEmit` + `npm run test:vitest` + `cd src/ui/map && npm run build` after each slice |
| **Scenario verification** | `npm run sim:scenario:run:40w` — state hash must match baseline (`2f332a630a820fba`) for R2–R4. After R5+ hash may change if dead code removal changes import graph; verify OSID match rate stable. |
| **Refactor-pass** | After each slice: check for unused imports, dead re-exports, stale comments |
| **Ledger** | Append entry to `docs/PROJECT_LEDGER.md` per slice |
| **Commit** | One commit per R-slice. Message format: `refactor(sim): <description> (R<N>)` |
| **Pre-commit check** | Run `/awwv-pre-commit-check` before each commit |

---

## 4b. Determinism safeguards (per awwv-plan-change)

Every slice MUST pass this checklist before commit:

- [ ] **No `Math.random()`** introduced anywhere
- [ ] **No `Date.now()` or `new Date()`** introduced in simulation code
- [ ] **No `Object.keys()`/`Object.values()`/`Object.entries()`** without `strictCompare` sort on Maps or objects that feed simulation logic
- [ ] **No `Set` iteration** without deterministic ordering
- [ ] **No `Map` iteration** without sorted key extraction
- [ ] **No `for...in`** on objects that feed simulation state
- [ ] **No `Promise.all()` with side effects** that depend on resolution order
- [ ] **Import reordering** does not change module initialization side effects (verify: no top-level mutable state in moved modules)
- [ ] **Re-export aliases** preserved for any type/function consumed by external code (map GUI, desktop, tests)
- [ ] **`strictCompare`** patterns in moved code are intact — not accidentally simplified or removed
- [ ] **State hash unchanged**: `npm run sim:scenario:run:40w` produces identical hash to baseline (`2f332a630a820fba`)

---

## 5. Handoff

- **Orchestrator → Technical Architect**: Owns R4, R6, R7, R9 (architectural decisions on module boundaries and naming).
- **Orchestrator → Systems Programmer**: Owns R2, R3, R5, R8 (mechanical extraction + deletion). Assists on R9 (bulk rename execution).
- **Game Designer**: Review-only on R8 (displacement) — confirm no mechanical change.
- **QA Engineer**: Run full test suite after R5 (AoR deletion), R7 (pipeline split), and R9 (mass rename) — highest-risk slices.

---

## 6. Doc updates (per slice)

| Slice | Doc updates |
|-------|-------------|
| Each R-slice | `docs/PROJECT_LEDGER.md` — append entry |
| R5 | `docs/40_reports/CONSOLIDATED_IMPLEMENTED.md` §33 — note brigade_aor.ts deleted |
| R7 | `docs/20_engineering/` — add `TURN_PIPELINE_ARCHITECTURE.md` if phase split is nontrivial |
| R8 | `docs/20_engineering/DISPLACEMENT_MASTER.md` — update file references |
| R9 | All docs referencing `phase_i`/`phase_ii` paths — bulk update. `MEMORY.md`, `CONSOLIDATED_IMPLEMENTED.md`, engineering docs. |

---

## 7. Success criteria

- **Lines eliminated**: ~2500+ (primarily R5 brigade_aor deletion + consolidations)
- **Files reduced**: net -3 to -5 files (R2–R8); R9 is net-zero files (pure rename)
- **No behavioral change**: all scenario hashes stable, OSID match rate unchanged
- **Tuning visibility**: all bot constants in one file (R3)
- **Navigability**: turn_pipeline.ts < 300 lines, displacement shared helpers deduplicated
- **Clean naming**: zero `phase_i`/`phase_ii` in directory or file names; module names reflect domain purpose (`early_war`, `combat`, `emergence`, `displacement_pipeline`, `transitions`)

---

## 8. Execution handoff

**Execution options:**

1. **Subagent-Driven (this session)** — Dispatch fresh subagent per R-slice via `subagent-driven-development`. Code review between slices. Fast iteration, immediate feedback.

2. **Parallel Session (separate)** — Open new session per R-slice with `executing-plans`. Batch execution with checkpoints. Better for large slices (R7, R8, R9).

3. **Hybrid** — R2–R5 via subagent-driven (small/medium, fast). R6–R9 via parallel sessions (large, need full context).

**Recommended:** Option 3 (Hybrid). Quick wins first in-session, then dedicated sessions for heavy lifts.

**Per-slice execution protocol:**
1. Read target files fully (validation-first gate)
2. Implement changes
3. Run smoke-test triad: `npx tsc --noEmit` → `npm run test:vitest` → `cd src/ui/map && npm run build`
4. Run scenario: `npm run sim:scenario:run:40w` — verify state hash
5. Run determinism checklist (§4b)
6. Run `/awwv-pre-commit-check`
7. Commit: `refactor(sim): <description> (R<N>)`
8. Append ledger entry to `docs/PROJECT_LEDGER.md`

---

*End of plan.*
