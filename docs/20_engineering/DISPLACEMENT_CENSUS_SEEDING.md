# Displacement census seeding (data contract and init order)

**Status:** Accepted (2026-02-18)  
**Source:** Run Problems implementation plan Phase 1; FULL_RUN_ANALYSIS_52W_APR1992_2026_02_18.md §5.

## Data contract

- **Census source:** `data/derived/municipality_population_1991.json`. Loaded in scenario runner as `municipalityPopulation1991` (type `MunicipalityPopulation1991`). Supports both `by_mun1990_id` and `by_municipality_id` (with `mun1990_id` field); runner flattens to keys = mun1990_id (kebab-case).
- **Key:** Same municipality ID used elsewhere: `mun1990_id` (e.g. `banja_luka`, `centar_sarajevo`). Displacement state is keyed by this id in `state.displacement_state[munId]`.
- **Init order:** After `createInitialGameState`, after phase is set (phase_i or phase_ii), before first turn run. Seeding runs in scenario_runner once state and graph exist.
- **Scope:** Seed only when (a) census is available (`municipalityPopulation1991` present) and (b) scenario uses Phase I or Phase II (`scenario.start_phase === 'phase_i' || scenario.start_phase === 'phase_ii'`). Phase 0 has no displacement; phase_i/phase_ii do.
- **Determinism:** Iterate census keys in sorted order (`Object.keys(municipalityPopulation1991).sort(strictCompare)`) so identical scenario + baseDir produces identical `displacement_state` and hashes remain stable.

## Behaviour

- Each municipality in the census gets one `DisplacementState` row: `original_population = entry.total`, `displaced_out` / `displaced_in` / `lost_population` = 0, `last_updated_turn` = state.meta.turn.
- Municipalities not in the census (e.g. future data gap) are unchanged: when first touched by displacement logic, `getOrInitDisplacementState(state, munId, state.displacement_state?.[munId]?.original_population ?? 10000)` still creates a row with default 10,000.
- Receiving capacity in hostile takeover uses getReceivingCapacityFraction(munId): normal receivers cap at pre-war × 1.5 (DISPLACEMENT_RECEIVING_CAPACITY_FRACTION), Sarajevo area × 1.1 (SARAJEVO_SIEGE_RECEIVING_CAPACITY_FRACTION). Overflow beyond cap is routed to next-closest urban centers. Only the baseline original_population becomes census-driven so capacity and map “Population (Current)” scale by real mun size.

## References

- Implementation: `src/scenario/scenario_runner.ts` (block after phase_ii init, conditional on census + phase_i/phase_ii).
- State shape: `src/state/game_state.ts` (`DisplacementState`), `src/state/displacement_state_utils.ts` (`getOrInitDisplacementState`).
- Determinism: `docs/20_engineering/DETERMINISM_TEST_MATRIX.md`, `docs/20_engineering/DETERMINISM_AUDIT.md`.
