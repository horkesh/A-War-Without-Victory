# Direct Brigade Move Affordance Retirement

**Date:** 2026-06-19

**Type:** UI/read-model route ownership and dead-control removal.

## Summary

Retired the live tactical-map path that let a player enter a direct brigade move mode and click an OSID to stage `brigade_mun_orders`. That state path is compatibility-era residue and is not consumed by the current president-through-generals command model. The player-facing map now keeps direct click orders limited to active attack confirmation and brigade-to-sector assignment; operational movement remains owned by Army HQ opportunities, corps operations, sector assignment, and validated movement/order channels outside the live direct map-click affordance.

## Changes

- Removed `stageMoveOrderFromOsid(...)` from `src/ui/map/desktop/orderActions.ts`.
- Removed the `move` branch from `MapContainer` OSID click handling.
- Removed the `move-preview-fill` layer/effect from the live map.
- Tightened `gameStore.orderModeForFormation` to `'attack' | 'sector' | null`.
- Tightened `StagedOrder.type` to `'attack' | 'posture' | 'sector'`.
- Added `tests/ui/direct_brigade_move_affordance_retired.test.ts` so the dead direct-move affordance cannot be rewired into the live tactical map silently.

## Verification

- Red/green proof: `npx.cmd vitest run tests/ui/direct_brigade_move_affordance_retired.test.ts` failed before the code change, then passed after removal.
- Focused regression: `npx.cmd vitest run tests/ui/direct_brigade_move_affordance_retired.test.ts tests/ui/pause_escape_shortcuts.test.ts tests/ui/gamestore_load_reset.test.ts` passed 23/23.

## Scope

UI route/read-model cleanup only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed. Legacy desktop IPC compatibility channels remain documented as compatibility, not player-facing command UI.
