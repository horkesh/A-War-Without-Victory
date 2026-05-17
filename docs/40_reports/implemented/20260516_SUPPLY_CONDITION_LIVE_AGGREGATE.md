# Supply Condition Live Aggregate - n1842 H4

**Date:** 2026-05-16
**Run evidence:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1842/`; post-fix verification `runs/apr1992_definitive_188w__210e69404d054959__w188_n1844/`
**Source track:** `docs/plans/2026-05-16-engine-health-n1842-plan.md` H4
**Status:** IMPLEMENTED - VERIFIED IN n1844

## Summary

- Added `political.war_supply_condition`, a live normalized faction supply aggregate where higher is better.
- Kept `political.war_supply_pressure` as the cumulative legacy pressure field; saturation at 100 remains expected for old consumers and historical comparison.
- Exhaustion, operation readiness, opportunity predicates, scenario reporting, and tactical supply UI now prefer live condition when available and fall back to legacy pressure only when no live condition exists.

## Changes Made

### Live Aggregate

- `src/sim/combat/supply_condition.ts` derives faction condition from `supply_state_by_osid`, scoring OSIDs as adequate `100`, strained `50`, and critical `0`.
- `src/sim/combat/supply_pressure.ts` writes `state.political.war_supply_condition` alongside the cumulative pressure update whenever OSID supply state is available.
- `getFactionLiveSupplyPressure(...)` converts live condition back into pressure semantics (`100 - condition`) for existing pressure-shaped consumers.

### Consumers

- `src/sim/combat/exhaustion.ts` and `src/sim/combat/corps_operation_readiness.ts` consume the live-pressure adapter, so a saturated legacy `war_supply_pressure=100` no longer forces current readiness/exhaustion inputs to read as fully cut if live condition is adequate.
- 5th Corps, Central Bosnia, and Federation-Western Bosnia opportunity catalogs now read supply pressure through the same live adapter.
- `src/scenario/scenario_reporting.ts` emits `supply_condition` per faction; `src/scenario/scenario_end_report.ts` can print supply condition start/end once reports contain that field.
- `src/ui/map/data/GameStateAdapter.ts`, `src/ui/map/components/SupplyPanel.tsx`, and `src/ui/map/map/builders/buildSupplyGeoJSON.ts` prefer live condition for player-facing supply, while still treating high legacy pressure as bad when condition is absent.

## Scenario Results

Post-fix 188w run `runs/apr1992_definitive_188w__210e69404d054959__w188_n1844` completed with final hash `ccd3f9f770052614`.

`end_report.md` now prints both legacy cumulative pressure and live condition:

- Legacy `Supply pressure`: HRHB `100 -> 100`, RBiH `100 -> 100`, RS `100 -> 100`.
- Live `Supply condition`: HRHB `40 -> 69`, RBiH `59 -> 81`, RS `62 -> 79`.
- Final save `political.war_supply_condition`: HRHB `69`, RBiH `81`, RS `79`.

This verifies H4's intended split: legacy pressure remains saturated cumulative history, while live condition carries current OSID supply variation.

## Verification

Known focused coverage from the implementation wave:

- `tests/combat_supply_pressure.test.ts` asserts live OSID supply derives `war_supply_condition` while preserving saturated `war_supply_pressure`.
- `tests/corps_operation_readiness.test.ts` asserts live adequate supply condition overrides saturated cumulative pressure in readiness inputs.
- `tests/operation_opportunities_federation_western_bosnia_catalog.test.ts` covers catalog use of live condition.
- `tests/ui/supply_fallbacks.test.ts` asserts the UI treats high legacy pressure as cut, and prefers live condition when present.
- Parent reconciliation added regression coverage for stale condition clearing, partial UI fallback, and live-condition exhaustion override.

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/supply_condition.ts` | New live aggregate derivation and live-pressure adapter |
| `src/sim/combat/supply_pressure.ts` | Writes `political.war_supply_condition` from OSID supply state |
| `src/sim/combat/exhaustion.ts` | Uses live pressure adapter |
| `src/sim/combat/corps_operation_readiness.ts` | Uses live pressure adapter for support/reserve readiness |
| `src/sim/combat/operation_opportunity_catalog_*.ts` | Opportunity logistics predicates use live pressure adapter |
| `src/scenario/scenario_reporting.ts` | Emits `supply_condition` |
| `src/scenario/scenario_end_report.ts` | Prints supply condition when present |
| `src/ui/map/data/GameStateAdapter.ts` | Exposes live condition to tactical UI |
| `src/ui/map/components/SupplyPanel.tsx` | Prefers live condition; legacy high pressure remains bad |
| `src/ui/map/map/builders/buildSupplyGeoJSON.ts` | Prefers live condition in supply map fallback |

## Next Steps

- Keep `war_supply_pressure` documented as cumulative legacy pressure rather than a current health KPI.
- Do not invert legacy pressure semantics again; high legacy pressure is bad.
