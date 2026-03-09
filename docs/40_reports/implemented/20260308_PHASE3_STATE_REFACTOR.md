# Phase 3: Engine & State Refactoring

**Date:** March 8, 2026
**Status:** Completed
**Author:** AI Assistant

## Overview
This phase involved a massive, pervasive refactoring of the monolithic `GameState` structure into a domain-segregated model to improve code maintainability, clarify boundaries between engine subsystems, and reduce the likelihood of accidental side-effects during development.

## What Was Refactored

1. **`GameState` Interface**:
   - The flat `GameState` interface was strictly partitioned into three domain-specific nested objects:
     - `military`: `formations`, `militia_pools`, `front_segments`, `front_posture`, `front_pressure`, `casualty_ledger`, `corps_command`, etc.
     - `political`: `political_controllers`, `municipalities`, `settlements`, `war_exhaustion`, `war_alliance_rbih_hrhb`, `enclave_resilience`, etc.
     - `displacement`: `displacement_state`, `civilian_casualties`, `municipality_displacement`, etc.
   - Preserved `schema_version`, `meta`, and `factions` at the root.

2. **Codebase Adaptation**:
   - Refactored hundreds of call sites across `src/sim/*`, `src/state/*`, `src/ui/*`, and `tests/*` to use the new nested property paths (e.g., `state.formations` -> `state.military.formations`).
   - Built AST-aware `ts-morph` and Node scripts to safely migrate properties across object literals, ensuring type safety and preserving existing domain logic.
   - Refactored the UI adapters (`GameStateAdapter.ts`) to cleanly extract data from the nested state back into flattened UI representations.

3. **State Migration & Serialization**:
   - Updated `GAMESTATE_TOP_LEVEL_KEYS` to reflect the new strict root keys.
   - Upgraded the `migrateState` function to detect flat legacy states and intelligently nest properties into the newly required `military`, `political`, and `displacement` domains at load-time to maintain save compatibility.

## Decisions Made
- **Deep Merging in Tests**: Discovered that shallow spreading `...overrides` in test mock state generators (e.g., `makeState`) wiped out hardcoded domain defaults. Fixed this by adopting a precise injection pattern ensuring deep merging of `overrides.military` and `overrides.political`.
- **UI State vs Engine State**: Maintained UI layer compatibility by keeping `LoadedGameState` mostly flat for the front-end, translating strictly within `GameStateAdapter`.

## Verification Evidence
- `npx tsc --noEmit` executed cleanly with 0 TypeScript errors across the entire codebase.
- `npx vitest run` executed and all 436 tests passed perfectly.
- Confirmed deterministic save behavior by validating that test assertions relying on deterministic string comparisons and outputs passed.
