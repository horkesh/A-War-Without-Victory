# Supply & Ammunition System — Phase A Implementation

**Date:** 2026-03-01
**Baseline:** n303 (86.7% OSID match, no supply reserves)
**Result:** n338 (86.9% OSID match, 654/753, supply reserves implemented but gated off by default)

## Summary

- Implemented Phase A of the Supply & Ammunition System Plan: faction-level supply reserves (general supply + heavy munitions), per-turn maintenance drain, per-battle combat expenditure, and effective supply state combining BFS reachability with reserve levels.
- All behavior gated behind `supply_reserves_enabled` scenario flag (default `false`) — zero behavioral change when disabled, preserving backward compatibility with all existing scenarios and calibration baselines.
- Refactor pass cleaned up premature Phase C constants, extracted magic numbers, and simplified type casts.

## Architecture

### Two-Category Reserve Model
Each faction maintains two independent reserves on `[0, 100]`:
- **`general_supply_reserve`**: Consumed by maintenance (per-formation per-turn) and combat (secondary). Replenished by production income (60% split).
- **`heavy_munitions_reserve`**: Consumed by combat (primary, scaled by battle intensity). Replenished by production income (40% split).

### Three Consumption Channels
| Channel | Pool | Rate | Trigger |
|---------|------|------|---------|
| Maintenance | General | 0.15 per formation per turn | Pipeline step (every turn) |
| Combat (attacker) | Both | `count × intensity × RATE / 100` | Per battle (attack_resolution_osid) |
| Combat (defender) | Both | `1 × intensity × 0.5 × RATE / 100` | Per battle (attack_resolution_osid) |
| Siege | General | 0.3 base + escalation | Phase B (not yet implemented) |

### Effective Supply State
Combines OSID BFS reachability with faction reserve level via interaction table:

| Reachability \ Reserve | ≥50 (adequate) | 20–49 (strained) | <20 (critical) |
|------------------------|----------------|-------------------|-----------------|
| adequate | adequate | strained | critical |
| strained | strained | strained | critical |
| critical | critical | critical | critical |

Integration point: `getSupplyMult()` in `combat_math.ts` — already used by both resolver and predictor.

## Changes Made

### New Files
| File | Lines | Purpose |
|------|-------|---------|
| `src/state/supply_reserve_constants.ts` | 52 | 14 calibration constants (drain rates, thresholds, production split, init values) |
| `src/state/supply_reserves.ts` | 193 | Core module: init, per-turn update, combat expenditure, effective supply state |
| `tests/supply_reserves.test.ts` | ~130 | 13 unit tests covering all exported functions |
| `docs/30_planning/SUPPLY_AMMO_SYSTEM_PLAN.md` | ~400 | Master plan with 4-phase roadmap and phase_i/phase_ii audit appendix |

### Modified Files
| File | Change |
|------|--------|
| `src/state/game_state.ts` | Added `general_supply_reserve`, `heavy_munitions_reserve` to GameState; `supply_reserves_enabled` to StateMeta |
| `src/state/serializeGameState.ts` | Added 2 keys to GAMESTATE_TOP_LEVEL_KEYS allowlist |
| `src/scenario/scenario_types.ts` | Added `supply_reserves_enabled` optional field to Scenario interface |
| `src/scenario/scenario_runner.ts` | Wires `supply_reserves_enabled` flag from scenario to `state.meta` |
| `src/sim/turn_phases/war_phases.ts` | Added `compute-supply-reserves` pipeline step (after `phase-ii-supply-osid`, before `phase-ii-enclave-resilience`) |
| `src/sim/turn_pipeline_types.ts` | Added `supply_reserves?: SupplyReservesReport` to TurnReport |
| `src/sim/combat/combat_math.ts` | Modified `getSupplyMult()` to combine reachability + reserves when enabled |
| `src/sim/combat/attack_resolution_osid.ts` | Added combat expenditure deduction after snap events |
| `vitest.config.ts` | Added test to include list |

## Verification

### Type Check
- `npx tsc --noEmit`: 1 pre-existing error in `corps_front_sectors.ts` (unrelated). No new errors.

### Unit Tests
- **vitest**: 19 suites, 202 tests pass, 1 skip
- **13 new supply tests**: ensureSupplyReserves (init, idempotent), updateSupplyReserves (drain, production, clamping), deductCombatExpenditure (deduction, floor), getEffectiveSupplyState (all 6 interaction table cells)

### 40-Week Calibration (n338)
- **OSID match**: 654/753 (86.9%) — identical to baseline within noise
- **Reserve fields in save**: 0 when `supply_reserves_enabled=false` (confirmed gating works)
- **Determinism**: No new RNG, timestamps, or unsorted iteration

## Refactor Pass Results

5 issues found and fixed:
1. **Premature Phase C constants** removed from `supply_reserve_constants.ts` (enclave-specific constants belong in Phase C)
2. **Magic numbers 0.6/0.4** extracted as `PRODUCTION_GENERAL_FRACTION` / `PRODUCTION_HEAVY_FRACTION`
3. **Ugly `keyof typeof` cast** in `getSupplyMult` simplified to `Record<string, number>` cast
4. **Redundant `as string` casts** removed in `attack_resolution_osid.ts`
5. **Stale multi-line comment** replaced with concise one-liner

## Constants Reference

| Constant | Value | Purpose |
|----------|-------|---------|
| `MAINTENANCE_DRAIN_PER_FORMATION` | 0.15 | General supply drain per formation per turn |
| `COMBAT_HEAVY_MUNITIONS_RATE` | 2.0 | Heavy munitions drain per battle (×count×intensity/100) |
| `COMBAT_GENERAL_SUPPLY_RATE` | 0.5 | General supply drain per battle (×count×intensity/100) |
| `SIEGE_BASE_RATE` | 0.3 | Per-turn siege drain (Phase B) |
| `SIEGE_ESCALATION_RATE` | 0.1 | Siege escalation multiplier (Phase B) |
| `MAX_SIEGE_PRESSURE_RATE` | 2.0 | Siege drain cap (Phase B) |
| `PRODUCTION_SCALE` | 1.0 | Global production multiplier |
| `PATRON_AID_SCALE` | 1.0 | Global patron aid multiplier (Phase B) |
| `RESERVE_ADEQUATE_THRESHOLD` | 50 | Reserve ≥ 50 → adequate (if reachable) |
| `RESERVE_STRAINED_THRESHOLD` | 20 | Reserve < 20 → critical |
| `PRODUCTION_GENERAL_FRACTION` | 0.6 | 60% of production → general supply |
| `PRODUCTION_HEAVY_FRACTION` | 0.4 | 40% of production → heavy munitions |
| `INIT_GENERAL_SUPPLY_RESERVE` | 80 | Starting general supply per faction |
| `INIT_HEAVY_MUNITIONS_RESERVE` | 60 | Starting heavy munitions per faction |

## Next Steps

| Phase | Scope | Status | Dependencies |
|-------|-------|--------|--------------|
| **A** | Reserves + consumption | **COMPLETE** | — |
| **B** | Siege curve + replenishment wiring | Pending | Phase A |
| **C** | Enclave resilience + hardening | Pending | Phase A |
| **D** | Supply UX + bot enhancement | Pending | Phase A |

- Enable `supply_reserves_enabled=true` in calibration scenario once Phase B production income is wired
- Cascade to Engine Invariants §4 and Systems Manual §14 (deferred to canon update pass)
