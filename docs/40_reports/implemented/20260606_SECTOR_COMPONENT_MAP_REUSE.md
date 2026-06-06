# Sector Component Map Reuse

**Date:** 2026-06-06
**Lane:** Sector/frontline performance
**Status:** Implemented, byte-identical

## Summary

`buildFactionSectors(...)` now reuses the friendly territory component map that it already builds during pre-component setup when it classifies brigades. The previous path could rebuild the same `buildFriendlyComponents(adjacency, friendlyOsids)` map later in the same invocation when no `SpatialContext` component map was present.

This is a bounded same-call-frame reuse only. It does not add module-level state, cross-turn cache, mutable sector packet reuse, save fields, migrations, scenario data, combat math, or sector truth changes.

## Determinism

The reused map is derived from the same inputs as before:

- existing `spatial?.componentsByFaction.get(faction)` when available
- otherwise `buildFriendlyComponents(adjacency, friendlyOsids)`

The map is created before sector packet construction and reused read-only for brigade classification. There is no new iteration order, timestamp, randomness, serialization path, or persisted diagnostic output.

## Evidence

Pre-change evidence on current `main`:

- 40-week timed run final hash: `d1ace172a29b2353`
- Partition profile: `totalWallS=85.5309106`
- `partition-corps-front-sectors`: `7114.2066ms`
- `generate-bot-corps-orders`: `7253.1478ms`
- `reconcile-final-sector-truth`: `7356.5169ms`

Changed branch evidence:

- 40-week timed run final hash: `d1ace172a29b2353`
- Partition profile: `totalWallS=85.3635816`
- `partition-corps-front-sectors`: `7022.637ms`
- `generate-bot-corps-orders`: `7150.147ms`
- `reconcile-final-sector-truth`: `7196.952ms`
- Baseline regression: all scenarios match

The wall-clock movement is small, so this should be treated as a byte-identical cleanup of repeated local computation with positive local profile direction, not as a major scenario-speed claim.

## Validation

```powershell
npx.cmd vitest run tests\sector_partition_instrumentation.test.ts tests\sector_partition_buildCorpsFrontSectors_integration.test.ts --reporter=dot
npx.cmd vitest run tests\final_sector_truth_reconciliation_cache.test.ts tests\final_sector_truth_reconciliation.test.ts tests\war_phase_step_order.test.ts --reporter=dot
npx.cmd vitest run tests\profile_hotspot_report.test.ts --reporter=dot
npm.cmd run typecheck -- --pretty false
npm.cmd run sim:scenario:run:40w:timed
$env:PERF_PROFILE_SECTOR_PARTITION='true'; npx.cmd tsx tools\perf\profile_scenario.ts --scenario data\scenarios\apr1992_definitive_40w.json --out runs_perf\sector_component_reuse_partition_profile --report data\derived\_debug\sector_component_reuse_partition_profile_40w.json
npm.cmd run test:baselines
```

## Files

- `src/sim/combat/corps_front_sectors.ts`
- `tests/sector_partition_instrumentation.test.ts`
- `docs/40_reports/implemented/20260606_SECTOR_COMPONENT_MAP_REUSE.md`

## Next Work

Re-profile before the next sector slice. Remaining measured owners still include broader `buildFactionSectors:RS/RBiH`, final-sector truth/recovery labels, and any newly measured hot child.
