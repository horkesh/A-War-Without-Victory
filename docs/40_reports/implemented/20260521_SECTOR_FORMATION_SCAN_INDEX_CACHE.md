# Sector Formation Scan Index Cache

**Date:** 2026-05-21
**Type:** Sector reconstruction performance implementation
**Scope:** `src/sim/combat/sector_building.ts`

## Summary

Implemented one invocation-local cache in `buildMultiSectorsForCorps(...)` after refreshing the current 40-week sector profile. The cache precomputes the active formation facts that `buildSectorFromSubSegments(...)` repeatedly scanned per sector:

- same-faction, same-corps active formation IDs, kept in the existing sorted formation-id order for `assigned_brigade_ids`
- enemy personnel totals by `location_osid` for sector enemy-power lookup

The cache is scoped to one `buildMultiSectorsForCorps(...)` call. It does not persist across turns, invocations, modules, or sector packets.

## Profile Evidence

Pre-change profile refresh on current main:

- Timed 40w run: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1920`
- Final hash: `5c6e7b62fa6670c0`
- Partition-profile wall time: `99.16s`
- Top phase buckets: `reconcile-final-sector-truth` `8946.5ms`, `partition-corps-front-sectors` `8851.0ms`, then displacement/sustainability/bot-order buckets
- Sector child leaders included `buildFactionSectors:RBiH`, `buildFactionSectors:RS`, and their `corps-sector-construction` child work

Post-change evidence:

- Timed 40w run: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1921`
- Final hash: `5c6e7b62fa6670c0`
- Timed run total from `timing.json`: `96384.533ms`
- Post-change partition-profile wall time: `95.23s`
- Top phase buckets: `reconcile-final-sector-truth` `8711.4ms`, `partition-corps-front-sectors` `8680.7ms`

The direction is positive in both the full timed run and the partition profile. The gain is modest enough to treat as a measured improvement, not a new performance floor guarantee.

## Determinism Contract

- No module-level or cross-turn cache.
- No mutation of cached sector packet objects.
- No ordering change for `assigned_brigade_ids`; the candidate list preserves sorted formation-id scan order.
- Enemy power remains a numeric sum over the same active enemy formations, grouped by location before sector lookup.
- No combat outcome math, operation selection, brigade assignment semantics, save schema, or scenario data changed.

## Verification

PASS:

- `npm.cmd run typecheck`
- `npx.cmd vitest run tests/sector_partition_buildCorpsFrontSectors_integration.test.ts --reporter=dot` - 5/5, including 100+ deterministic state variants
- `npx.cmd vitest run tests/sector_partition_instrumentation.test.ts tests/profile_hotspot_report.test.ts --reporter=dot` - 19/19
- `npx.cmd vitest run tests/final_sector_truth_reconciliation_cache.test.ts tests/final_sector_truth_reconciliation.test.ts tests/war_phase_step_order.test.ts --reporter=dot` - 13/13
- `npm.cmd run sim:scenario:run:40w:timed` - final hash `5c6e7b62fa6670c0`
- `npm.cmd run test:baselines` - `Baseline regression: all scenarios match.`

## Next Target

The next sector-performance pass should not extend this cache blindly. Fresh post-change profiling still shows larger remaining owners in:

- `sealMergedSectorTruth:ensure-coverage`
- `recoverDroppedFrontEdges:faction-front-claim-setup`
- `buildFactionSectors:*:corps-sector-construction`

Any follow-up should profile again and pick one of those owners under the same byte-identity stop gates.
