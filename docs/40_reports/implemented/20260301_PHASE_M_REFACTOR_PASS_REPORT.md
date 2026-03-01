# Phase M Full Migration Execution Report

Date: 2026-03-01  
Scope: Full execution summary for the Peace/War lifecycle migration plan (including follow-up stabilization and refactor-pass)

## Objective

Execute the migration plan to remove legacy three-phase framing and fully adopt the two-phase lifecycle (`peace`, `war`) across canon docs, runtime, scenarios, tooling, and tests, then stabilize verification.

## Plan To-Do Completion Status

All plan to-dos were completed:

1. `canon-rewrite` - Completed  
2. `state-schema-break` - Completed  
3. `pipeline-transition-removal` - Completed  
4. `scenario-apr1992-migration` - Completed  
5. `runtime-consumer-update` - Completed  
6. `inventory-guard-tool` - Completed  
7. `verification-baselines` - Completed  
8. `docs-global-replacement` - Completed  
9. `ledger-entry` - Completed

## What Was Implemented

### 1) Canon v0.6 rollout and archival

- Created new canonical v0.6 set in `docs/10_canon/`:
  - `Phase_Specifications_v0_6_0.md`
  - `Peace_Specification_v0_6_0.md`
  - `War_Specification_v0_6_0.md`
  - `Engine_Invariants_v0_6_0.md`
  - `Systems_Manual_v0_6_0.md`
  - `Rulebook_v0_6_0.md`
  - `Game_Bible_v0_6_0.md`
- Rewrote `docs/10_canon/CANON.md` to v0.6 precedence.
- Updated `docs/10_canon/context.md` for two-phase lifecycle references.
- Deprecated/moved old canon versions to `docs/_old/10_canon/` and documented archive status.

### 2) Core schema and serialization hard-break to two-phase lifecycle

- Updated `PhaseName` and lifecycle fields in `src/state/game_state.ts` from legacy phase labels to `peace`/`war`.
- Updated state validation and serialization allowlists:
  - `src/state/validateGameState.ts`
  - `src/state/serializeGameState.ts`
  - `src/state/serialize.ts`
- Migrated field names from `phase_0_*`, `phase_i_*`, `phase_ii_*` to `peace_*`/`war_*` equivalents.

### 3) Pipeline refactor and legacy transition removal

- Simplified state runner in `src/state/turn_pipeline.ts`:
  - peace-turn path remains in state pipeline.
- Refactored war runner in `src/sim/turn_pipeline.ts`:
  - explicit war-only runner behavior.
  - rejects peace path with directive to use state pipeline.
- Removed obsolete `Phase I -> Phase II` transition module:
  - deleted `src/sim/phase_transitions/phase_i_to_phase_ii.ts`.
- Updated browser-safe runner references in `src/sim/run_phase_i_browser.ts`.

### 4) Scenario schema/data migration

- Migrated scenario type/loader/runner to lifecycle schema:
  - `src/scenario/scenario_types.ts`
  - `src/scenario/scenario_loader.ts`
  - `src/scenario/scenario_runner.ts`
- Replaced legacy scenario fields with lifecycle equivalents (`start_lifecycle_phase`, `peace_*`, `war_*`).
- Ensured April 1992 war-start behavior aligns with new model.

### 5) Runtime consumer and reporting contract updates

- Updated desktop simulation handoff logic in `src/desktop/desktop_sim.ts`.
- Updated event typing and report terminology/contracts:
  - `src/sim/events/event_types.ts`
  - `src/scenario/scenario_reporting.ts`
  - `src/scenario/scenario_end_report.ts`
  - `tools/scenario_runner/run_scenario_sweep_h2_4.ts`

### 6) Repo-wide detection guard for legacy lifecycle terms

- Added `tools/engineering/check_lifecycle_legacy_terms.ts`.
- Added package script:
  - `package.json` -> `lifecycle:check`.

### 7) Docs and skills global canonization updates

- Updated v0.6 references across docs and skills, including:
  - `docs/00_start_here/docs_index.md`
  - `docs/20_engineering/CODE_CANON.md`
  - `docs/20_engineering/REPO_MAP.md`
  - `docs/PROJECT_LEDGER_KNOWLEDGE.md`
  - multiple `.cursor/skills/*/SKILL.md` files

### 8) Ledger update

- Added migration entry to `docs/PROJECT_LEDGER.md` with:
  - behavior/schema migration summary,
  - verification evidence,
  - representative artifact list.

## Post-Plan Stabilization Performed

After main plan completion, remaining node-test failures were resolved by aligning stale test contracts to the new lifecycle model.

Key post-plan updates included:

- migration of legacy phase assumptions in many `tests/phase_*` files,
- fixture metadata hardening for lifecycle completeness,
- scenario smoke/baseline test expectation alignment,
- deterministic assertion updates where model outputs changed but contract remained valid,
- final baseline manifest refresh in `data/derived/scenario/baselines/manifest.json`.

## Refactor-Pass Results

Applied simplification-focused cleanup on recent-session files:

- Removed dead code helper in `tests/scenario_init_control_apr1992.test.ts`.
- Removed unnecessary cast in `tests/state.test.ts`.
- Simplified stale comments/assertion framing in `tests/sim_scenario.test.ts`.

No additional safe dedup/helper extraction opportunities were found in the immediate touched scope without altering intended behavior.

## Verification Evidence

### Core migration verification

- `npm run typecheck` -> PASS
- `npm run test:vitest` -> PASS
- `npm run test:baselines` -> PASS (after required refresh)

### Full suite stabilization

- `npm test` -> PASS (`run_node_tests: all chunks passed`)

### Refactor-pass verification

- `npx tsc --noEmit` -> PASS
- `npx vitest run` -> PASS

## Outcome

The migration plan was fully executed and canonized across documentation and runtime contracts.  
The lifecycle hard-break to `peace`/`war` is in place, legacy transition logic was removed, scenarios and consumers were updated, ledger and canon references were aligned, and verification is green with refreshed deterministic baselines.
