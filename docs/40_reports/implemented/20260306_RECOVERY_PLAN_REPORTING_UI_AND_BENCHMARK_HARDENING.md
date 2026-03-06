# Recovery Plan Reporting, UI, and Benchmark Hardening

**Date:** 2026-03-06
**Run ID:** `apr1992_definitive_40w__7c821fa7d934716d__w40_n130`
**Baseline:** `n128` (`a53e4b93a0b8a94e`) combat-causality restored, but reporting/UI cleanup still incomplete
**Result:** `n130` (`a53e4b93a0b8a94e`) same deterministic scenario state with split reporting, live fog contract, and benchmark-share serialization fixed

## Summary
- Completed the next recovery-plan slice after combat-causality restoration: protected the passing state, split scenario outputs into behavioral vs historical families, and removed one more UI/runtime truth mismatch.
- Moved tactical fog-of-war onto a stable adapter contract derived from live `sector_intel`, rather than the deleted `recon_intelligence` path.
- Fixed a real reporting defect where `run_summary.json` integerization was corrupting benchmark fractions and hiding historical-fit truth behind rounded zeros and ones.

## Changes Made

### 1. Reporting split and benchmark contract hardening
- `src/scenario/scenario_runner.ts`
  - Added top-level `behavioral_health` and `historical_fit` objects to `run_summary.json`.
  - Preserved legacy top-level fields (`combat_causality`, `control_change_attribution`, `historical_alignment`, `bot_benchmark_evaluation`) for compatibility.
  - Added `historical_fit.override_inventory` with initial classification:
    - `osid_control_overrides` -> `initial_state_correction`
    - `avoided_osids_by_faction` -> `bot_compensation`
  - Fixed `integerizeRunSummaryCounts` so ratio/share/tolerance/deviation fields remain fractional instead of being rounded to integers.
- `src/scenario/scenario_reporting.ts`
  - Added weekly `behavioral_health` grouping that mirrors combat-causality plus control-change attribution.
  - Kept top-level weekly compatibility fields so existing tooling does not break.
- `src/scenario/scenario_end_report.ts`
  - Added `validateBotBenchmarkSummary()` and `BotBenchmarkContractStatus`.
  - Benchmark summaries now fail visibly when evaluated/not-reached rows are internally inconsistent.

### 2. Tactical map fog-of-war now reflects live sim truth
- `src/ui/map/data/types.ts`
  - Added `FogOfWarView` to `LoadedGameState`.
  - Extended `OperationView` with `participating_brigade_ids`.
- `src/ui/map/data/GameStateAdapter.ts`
  - Derives `fogOfWar` from `sector_intel`, `corps_front_sectors`, and friendly brigade locations.
  - Populates `operations[].participating_brigade_ids` so UI can reason about operation ownership directly.
  - Keeps legacy `reconIntelligence` parsing only for backward compatibility; live fog no longer depends on it.
- `src/ui/map/map/builders/buildFogOfWarGeoJSON.ts`
  - Switched fog generation from `recon_intelligence.confirmed_empty` to `fogOfWar.visibleEnemyOsids`.
- `src/ui/map/map/MapContainer.tsx`
  - Fog visibility and source updates now consume `state.fogOfWar`.

### 3. Operation ownership is now visible in the command panel
- `src/ui/map/components/FormationDetail.tsx`
  - Attack/assault posture buttons no longer hard-block on `home_defense_active` when the brigade is assigned to an active operation.
  - Tooltip text now explains the operation-ownership exception instead of implying the brigade is immovably stuck in home defense.

### 4. Sector contiguity regression fixed during verification
- `src/sim/combat/corps_front_sectors.ts`
  - Patched the exported `splitNonContiguousSectors()` implementation so disconnected friendly OSID groups are actually split before sector BFS proceeds.
- `tests/sector_contiguity_split.test.ts`
  - Added explicit callback typing and now verifies the repaired contiguity behavior cleanly under `tsc` and Vitest.

## Scenario Results

### Behavioral Health
- `valid_for_combat_calibration = true`
- `total_attack_orders = 91`
- `total_battles = 81`
- `total_objective_attempts = 66`
- `total_objective_captures = 66`
- `invalid_operation_count = 0`
- `zero_eligible_attacker_operation_count = 0`

### Control Change Attribution
- `combat = 26`
- `consolidation = 0`
- `abandoned = 0`
- `init_overrides = 0`
- `other = 0`

### Historical Fit
- Deterministic final state unchanged from `n128`: `final_state_hash = a53e4b93a0b8a94e`
- Benchmark fractions now serialize correctly, for example:
  - HRHB t20 actual `0.156707` vs expected `0.12`
  - RBiH t20 actual `0.440903` vs expected `0.35`
  - RS t20 actual `0.40239` vs expected `0.55`
- `historical_fit.override_inventory` now makes scenario-shaping debt visible instead of implicit

## Lessons Learned
- A passing combat-causality gate is not enough if reporting still rounds away the evidence. Serializer stability must preserve semantic types, not just key order.
- The UI should consume stable player-facing adapter contracts, not raw engine internals. `fogOfWar` is the correct contract boundary; raw `sector_intel` is not.
- `home_defense_active` is no longer a sufficient UI-side truth for brigade command availability once operations own brigades end-to-end.

## Files Changed
| File | Change |
|------|--------|
| `src/scenario/scenario_runner.ts` | Added `behavioral_health`, `historical_fit`, override inventory, and ratio-preserving summary serialization |
| `src/scenario/scenario_reporting.ts` | Added weekly `behavioral_health` family |
| `src/scenario/scenario_end_report.ts` | Added benchmark contract validation |
| `src/ui/map/data/types.ts` | Added `FogOfWarView` and operation brigade roster support |
| `src/ui/map/data/GameStateAdapter.ts` | Derived `fogOfWar` from live sector data; exposed operation brigade IDs |
| `src/ui/map/map/builders/buildFogOfWarGeoJSON.ts` | Switched fog builder to `fogOfWar.visibleEnemyOsids` |
| `src/ui/map/map/MapContainer.tsx` | Bound fog rendering to `loadedGameState.fogOfWar` |
| `src/ui/map/components/FormationDetail.tsx` | Let operation-owned brigades bypass UI home-defense attack lockout |
| `src/sim/combat/corps_front_sectors.ts` | Fixed exported non-contiguous sector splitting behavior |
| `tests/scenario_reporting_contracts.test.ts` | Added benchmark contract validation coverage |
| `tests/ui_map_fog_and_operation_contracts.test.ts` | Added fog/operation ownership adapter tests |
| `tests/scenario_control_change_attribution_contract.test.ts` | Asserted reporting split and override inventory |
| `tests/scenario_operation_diagnostics.test.ts` | Asserted weekly `behavioral_health` contract |
| `tests/scenario_bots_determinism_h2_4.test.ts` | Guarded benchmark fraction serialization |
| `tests/sector_contiguity_split.test.ts` | Regression for repaired contiguity split behavior |

## Verification
- `cmd /c node_modules\.bin\tsx.cmd --test tests\scenario_operation_diagnostics.test.ts`
- `cmd /c node_modules\.bin\tsx.cmd --test tests\scenario_reporting_contracts.test.ts`
- `cmd /c node_modules\.bin\tsx.cmd --test tests\ui_map_fog_and_operation_contracts.test.ts`
- `cmd /c node_modules\.bin\tsx.cmd --test tests\scenario_control_change_attribution_contract.test.ts`
- `cmd /c node_modules\.bin\tsx.cmd --test tests\ui_map_game_state_adapter.test.ts`
- `cmd /c node_modules\.bin\tsx.cmd --test tests\scenario_vrs_operation_proof.test.ts`
- `cmd /c node_modules\.bin\tsx.cmd --test tests\scenario_bots_determinism_h2_4.test.ts`
- `cmd /c node_modules\.bin\vitest.cmd run tests\sector_contiguity_split.test.ts`
- `cmd /c npm run typecheck`
- `cmd /c npm run desktop:map:build`
- `cmd /c npm run sim:scenario:run:40w -- --scenario data/scenarios/apr1992_definitive_40w.json --unique --out runs`

## Next Steps
- Promote the remaining invariant checks into the same explicit contract style used for benchmark validation.
- Expand override inventory beyond the initial two scenario-shaping categories.
- Resume calibration only by citing both `behavioral_health` and `historical_fit`, never aggregate control alone.
