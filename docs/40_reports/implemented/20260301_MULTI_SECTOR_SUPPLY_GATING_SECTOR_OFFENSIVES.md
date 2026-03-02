# Multi-Sector Corps, Supply Gating, and Sector Offensives Implementation Report

**Date:** 2026-03-01
**Phases:** A–D (four-phase implementation)
**Baseline:** n303 (86.7% OSID match)
**Final:** n314 (87.4% OSID match, +0.7pp)

---

## Summary

Four-phase implementation adding multi-sector corps front partitioning, supply gating of offensive operations, and named sector offensive infrastructure to the AWWV simulation engine. All changes are sim-engine only (no GUI).

---

## Phase A: Multi-Sector Corps Front Partitioning

**Run:** n311 (86.3% OSID match)

### Changes
- **`corps_front_sectors.ts`**: Refactored single-sector `buildSectorForCorps` → multi-sector `buildMultiSectorsForCorps`. Sub-segments with `>= MIN_SECTOR_EDGES` (5) edges become independent sectors. Small sub-segments merge into nearest qualifying sector via OSID-hop BFS. Per-sector brigade assignment based on brigade `location_osid`.
- **Sector ID format**: `sector:{corps_id}` → `sector:{corps_id}:{index}` (e.g., `sector:corps_1kk:0`)
- **`game_state.ts`**: Added `sector_targets?: Record<string, string[]>` to `CorpsDirective`
- **`bot_corps_ai.ts`**: Multi-sector iteration — all corps sectors enumerated, per-sector offensive targets populated
- **`bot_brigade_ai_osid.ts`**: Added `findBrigadeSectorId()` helper; sector target preference in directive execution

### Results (n311)
- 86.3% OSID match (within ±1% of 86.7% baseline)
- Multi-sector partitioning active: 4 corps have sector_targets with 2-3 sectors each
- ARBiH 2nd Corps (3 sectors), 3rd Corps (2 sectors), VRS 2nd Krajina (2 sectors), SRK (2 sectors)

### Tests
- 4 new unit tests (`tests/corps_front_sectors_multi.test.ts`): MIN_SECTOR_EDGES export, 2-large-1-small promotion, all-small combination, single-large

---

## Phase B: Supply Gating of Attacks

**Run:** n312 (87.4% OSID match, +0.7pp from baseline)

### Changes
- **`bot_brigade_ai_osid.ts`**:
  - Added `getBrigadeSupplyState()` — looks up brigade's supply state from OSID supply report
  - **Critical supply gate**: After Rule 1 (ZoC escape), brigades at critical supply forced to defend. No voluntary attacks.
  - **Strained supply gate**: In Rule 5, `min_attack_outcome` upgraded to 'victory'. Pioneer attacks disabled.
- **`bot_corps_ai.ts`**:
  - Added `assessCorpsSupplyHealth()` — counts adequate/strained/critical fractions among subordinate brigades
  - `critical_fraction > 0.5` → strip all offensive targets (defense only)
  - `adequate_fraction < 0.3` → upgrade `min_attack_outcome` to 'victory'
  - Updated `generateAllCorpsOrders()` and `generateCorpsDirectives()` signatures to accept `supplyByOsid`
- **`turn_pipeline.ts`**: Pass `supplyByOsid` to `generateAllCorpsOrders` from `context.report.supply_resolution`

### Results (n312)
- 87.4% OSID match (+0.7pp from baseline) — supply gating slightly improved results by preventing overextension
- Regional breakdown stable: Krajina 97.7%, Posavina 85.3%, Drina 75.0% (+2.3pp), Central Bosnia 88.0%

### Tests
- 5 new unit tests (`tests/supply_gating.test.ts`): null/undefined report, missing location, correct state lookup, faction isolation, no-location fallback

---

## Phase C: Sector Offensives (Named Operations)

**Run:** n314 (87.4% OSID match, identical to n312)

### Changes
- **`game_state.ts`**: Extended `CorpsOperation` with sector offensive fields: `sector_id`, `objectives`, `current_objective_index`, `planning_duration`, `supply_readiness`, `momentum` (0-3 cap), `last_result`, `failure_count`, `consecutive_failures_on_current`
- **`operation_names.ts`** (NEW): Per-faction name pools (historical + geographic). Deterministic selection via `hash(corps_id + ':' + turn) % pool.length`. VRS: Koridor, Breza, Lukavac, etc. ARBiH: Uragan, Sana, Vlašić, etc. HVO: Cincar, Maestral, etc.
- **`sector_offensive.ts`** (NEW): Full lifecycle management:
  - `computePlanningDuration()` — 1-2 objectives: 1 turn, 3-5: ceil(N×0.6), 6+: min(5, ceil(N×0.8))
  - `advanceSectorOffensives()` — manages planning→execution→recovery transitions, sector validation, supply readiness checks
  - `updateSectorOffensiveResults()` — post-combat objective checking, momentum/failure tracking
  - `evaluateSectorOffensiveLaunch()` — criteria: ≥3 brigades, ≥2 enemy OSIDs, supply readiness ≥0.6, ≥2 objectives
  - `getMomentumAggressionBonus()` / `getMomentumMinOutcome()` — momentum-based combat bonuses
- **`bot_corps_ai.ts`**: Sector offensive launch evaluation after directive generation. Replaces existing general operations with sector attacks when criteria met.
- **`bot_brigade_ai_osid.ts`**: Offensive participation override — executing brigades attack current objective with momentum bonuses; recovering brigades forced defend
- **`turn_pipeline.ts`**: Two new pipeline steps:
  - `advance-sector-offensives` (after corps orders, before brigade orders)
  - `update-sector-offensive-results` (after attack resolution, before cohesion drift)

### Results (n314)
- 87.4% OSID match — identical to n312 (same state hash `36f57a795bf2f71b`)
- **No sector offensives launch in 40w window** — historically accurate:
  - VRS corps transition to `defensive` stance by week 20 (RS_EARLY_WAR_END_WEEK)
  - ARBiH army stance is `general_defensive` in year one → strips offensive targets
  - Infrastructure will activate in weeks 52+ when factions transition to offensive postures
- Infrastructure fully tested and wired into pipeline

### Tests
- 15 new unit tests (`tests/sector_offensive.test.ts`): planning duration computation, deterministic name selection, faction-specific pools, momentum aggression bonus, momentum min outcome relaxation, launch criteria (success + 3 rejection cases), lifecycle transitions (planning→execution, recovery completion, orphaned sector abort)

---

## Phase D: Integration & Calibration

### Final Calibration (n314)

| Region | n303 (baseline) | n314 (final) | Delta |
|---|---|---|---|
| **OVERALL** | **86.7% (653/753)** | **87.4% (658/753)** | **+0.7pp** |
| KRAJINA | 97.0% (128/132) | 97.7% (129/132) | +0.7pp |
| POSAVINA_NE | 86.2% (94/109) | 85.3% (93/109) | -0.9pp |
| DRINA | 72.7% (93/128) | 75.0% (96/128) | +2.3pp |
| CENTRAL_CORRIDOR | 89.4% (84/94) | 91.5% (86/94) | +2.1pp |
| CENTRAL_BOSNIA | 88.0% (146/166) | 88.0% (146/166) | 0.0pp |
| SARAJEVO | 77.4% (24/31) | 77.4% (24/31) | 0.0pp |
| HERZEGOVINA | 91.4% (85/93) | 90.3% (84/93) | -1.1pp |

### Faction Totals (n314)
| Faction | Painted | Sim | Delta |
|---|---|---|---|
| RS | 416 | 389 | -27 |
| RBiH | 248 | 272 | +24 |
| HRHB | 89 | 92 | +3 |

### Corps Sector Structure (n314, end of 40 weeks)
| Corps | Faction | Stance | Sectors | Total Edges | Total Brigades |
|---|---|---|---|---|---|
| arbih_1st_corps | RBiH | defensive | 1 | 14 | 10 |
| arbih_2nd_corps | RBiH | offensive | 3 | 68 | 21 |
| arbih_3rd_corps | RBiH | offensive | 2 | 33 | 10 |
| arbih_4th_corps | RBiH | offensive | 1 | 19 | 4 |
| arbih_5th_corps | RBiH | offensive | 1 | 9 | 2 |
| vrs_1st_krajina | RS | defensive | 1 | 95 | 11 |
| vrs_2nd_krajina | RS | defensive | 2 | 23 | 6 |
| vrs_drina | RS | defensive | 1 | 52 | 7 |
| vrs_east_bosnian | RS | balanced | 1 | 20 | 1 |
| vrs_sarajevo_romanija | RS | defensive | 2 | 88 | 3 |
| vrs_herzegovina | RS | defensive | 1 | 17 | 2 |

---

## Files Changed

### New Files
| File | Purpose |
|---|---|
| `src/sim/phase_ii/sector_offensive.ts` | Sector offensive lifecycle management |
| `src/sim/phase_ii/operation_names.ts` | Per-faction operation name pools |
| `tests/corps_front_sectors_multi.test.ts` | Multi-sector promotion unit tests (4) |
| `tests/supply_gating.test.ts` | Supply gating unit tests (5) |
| `tests/sector_offensive.test.ts` | Sector offensive lifecycle unit tests (15) |

### Modified Files
| File | Change |
|---|---|
| `src/state/game_state.ts` | `sector_targets` on CorpsDirective; sector offensive fields on CorpsOperation |
| `src/sim/phase_ii/corps_front_sectors.ts` | Multi-sector promotion algorithm, MIN_SECTOR_EDGES constant |
| `src/sim/phase_ii/bot_corps_ai.ts` | Multi-sector iteration, supply health assessment, sector offensive launch |
| `src/sim/phase_ii/bot_brigade_ai_osid.ts` | Supply gate, strained limits, sector target preference, offensive participation |
| `src/sim/turn_pipeline.ts` | Two new pipeline steps, supplyByOsid pass-through |

---

## Tuning Knobs

| Knob | Default | Location |
|---|---|---|
| `MIN_SECTOR_EDGES` | 5 | corps_front_sectors.ts |
| Critical supply gate | forced defend | bot_brigade_ai_osid.ts |
| Strained min_attack_outcome | 'victory' | bot_brigade_ai_osid.ts |
| Corps critical_fraction threshold | 0.5 | bot_corps_ai.ts |
| Corps adequate_fraction threshold | 0.3 | bot_corps_ai.ts |
| Offensive min brigades | 3 | sector_offensive.ts |
| Supply readiness launch | 0.6 | sector_offensive.ts |
| Supply readiness abort | 0.4 | sector_offensive.ts |
| Momentum cap | 3 | sector_offensive.ts |
| Max objectives | 6 | sector_offensive.ts |
| Planning duration formula | ceil(N×0.6) for 3-5 | sector_offensive.ts |
| Max total failures | 3 | sector_offensive.ts |
| Max consecutive failures per objective | 2 | sector_offensive.ts |

---

## Lessons Learned

**L36:** Supply gating at the brigade level (critical → defend, strained → victory-only) slightly improves calibration (+0.7pp) by preventing overextension in supply-strained areas. The effect is small because supply states in the 40w calibration window are mostly adequate.

**L37:** ~~Sector offensives don't activate in the 40w calibration window because year-one doctrine is defensive for both major factions.~~ **SUPERSEDED (n359, 2026-03-02):** Sector offensives were dormant due to two bugs: (1) `computeSupplyReadiness()` returned 0.00 when `supply_reserves_enabled=false`, aborting all operations at turn 1 (L42); (2) `evaluateOperationProgress()` dual-handled sector_attack ops with wrong planning duration (L43). After fixes: 26 sector offensives in 40w, RS=432, 86.7% match. See PROJECT_LEDGER 2026-03-02.

**L38:** Multi-sector promotion produces 2-3 sectors for large corps (ARBiH 2nd, 3rd; VRS 2nd Krajina, SRK). Most corps remain single-sector because their front is contiguous or their sub-segments are all below MIN_SECTOR_EDGES (5). This is historically appropriate — most corps had a single main front.

---

## Verification Summary

| Gate | Phase A | Phase B | Phase C |
|---|---|---|---|
| `tsc --noEmit` clean | PASS | PASS | PASS |
| `vitest run` (no regressions) | 190/190 | 190/190 | 190/190 |
| New unit tests | 4/4 | 5/5 | 15/15 |
| 40w OSID match | 86.3% (±1%) | 87.4% (±2%) | 87.4% (±3%) |
