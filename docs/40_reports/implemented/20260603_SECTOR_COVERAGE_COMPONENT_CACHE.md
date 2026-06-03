# Sector Coverage Component Cache

**Date:** 2026-06-03
**Type:** Deterministic sector/frontline performance optimization
**Plan:** `docs/plans/2026-05-20-sector-performance-next-target-plan.md`
**Current 40w final_state_hash:** `e086afbefcef01e6`

## Summary

`ensureMinimumSectorCoverage(...)` now reuses an invocation-local
`Map<CorpsFrontSector, number>` for sector-component lookups. The previous code
called `getSectorComponent(...)` repeatedly in the same coverage pass while
filtering donors and recipients. That helper scans sector territory and
front-subsegment OSIDs to identify the connected component. During a single
`ensureMinimumSectorCoverage(...)` invocation, those sector geometry fields are
not mutated; only brigade assignment arrays and formation locations move.

The cache is scoped to one call frame, keyed by the sector object itself, and
discarded before the next coverage pass. There is no module-level state,
cross-turn cache, or persisted output.

## Why This Target

Fresh current-main profiling showed the old plan hash `5d94adbfdb09bbda` was
stale after later mainline work. The current clean pre-change hash is
`e086afbefcef01e6`.

Pre-change partition profile:

| Bucket | Time |
| --- | ---: |
| `reconcile-final-sector-truth` | 9404.142ms |
| `partition-corps-front-sectors` | 8746.732ms |
| `generate-bot-corps-orders` | 8197.107ms |
| `update-displacement` | 6021.519ms |
| `update-sustainability` | 5811.028ms |
| `reconcile-final-sector-truth-after-ops` | 4616.990ms |

Top sector child labels remained centered on final sector truth and coverage:

| Label | Pre-change |
| --- | ---: |
| `sealMergedSectorTruth:ensure-coverage` | 3278.042ms |
| `buildFactionSectors:RBiH` | 3205.909ms |
| `buildFactionSectors:RS` | 2801.134ms |
| `ensureMinimumSectorCoverage:territory-claim-rescue` | 1616.963ms |
| `ensureMinimumSectorCoverage:territory-claim-rescue:zero-assigned` | 1540.632ms |
| `ensureMinimumSectorCoverage:severe-rescue` | 1479.490ms |

This made repeated component lookup inside coverage a narrow, measurable target.

## Changes Made

| File | Change |
| --- | --- |
| `src/sim/combat/brigade_assignment.ts` | Added an invocation-local `sectorComponentCache` and `componentForSector(...)` helper inside `ensureMinimumSectorCoverage(...)`; replaced repeated donor/recipient `getSectorComponent(...)` calls in that function with the cached helper. |
| `tests/sector_partition_instrumentation.test.ts` | Added a static contract proving the cache remains invocation-local and coverage logic no longer reintroduces repeated raw component scans after the helper. |

## Verification

| Gate | Result |
| --- | --- |
| Focused static/instrumentation test | PASS: `node node_modules\vitest\vitest.mjs run tests\sector_partition_instrumentation.test.ts --reporter=dot` (26/26) |
| Focused sector regression pack | PASS: `tests\final_sector_truth_reconciliation_cache.test.ts`, `tests\final_sector_truth_reconciliation.test.ts`, `tests\sector_partition_buildCorpsFrontSectors_integration.test.ts`, `tests\sector_partition_instrumentation.test.ts`, `tests\war_phase_step_order.test.ts` |
| Profiled 40w after change | PASS: final hash `e086afbefcef01e6` |
| Timed 40w after change | PASS: final hash `e086afbefcef01e6` |
| Baseline regression | PASS: `npm.cmd run test:baselines` reported "Baseline regression: all scenarios match." |
| Typecheck | BLOCKED in this isolated worktree by pre-existing UI optional-package declaration gaps (`maplibre-gl`, `pmtiles`, `@deck.gl/*`, `@vitejs/plugin-react`) and related UI implicit-any errors; no sector/source type error was introduced. |

## Performance Evidence

Comparable clean profile:

| Bucket | Pre | Post |
| --- | ---: | ---: |
| Wall time | 121.43s | 118.82s |
| `reconcile-final-sector-truth` | 9404.142ms | 9118.131ms |
| `partition-corps-front-sectors` | 8746.732ms | 8653.803ms |
| `reconcile-final-sector-truth-after-ops` | 4616.990ms | 4472.872ms |
| `generate-bot-corps-orders` | 8197.107ms | 8035.672ms |

Sector child aggregate dropped from 22930.931ms to 22382.775ms. The largest
child movements were:

| Label | Pre | Post |
| --- | ---: | ---: |
| `sealMergedSectorTruth:ensure-coverage` | 3278.042ms | 3252.954ms |
| `buildFactionSectors:RBiH` | 3205.909ms | 3015.331ms |
| `buildFactionSectors:RS` | 2801.134ms | 2701.192ms |
| `ensureMinimumSectorCoverage:severe-rescue` | 1479.490ms | 1454.586ms |

The normal timed run also moved down directionally:

| Run | Total | Simulation | Serialization |
| --- | ---: | ---: | ---: |
| Pre-change | 122953.071ms | 98527.204ms | 15123.141ms |
| Post-change | 116851.360ms | 94138.556ms | 13841.129ms |

Treat the improvement as a narrow measured reduction, not a new baseline-speed
guarantee; scenario wall-clock still has normal process noise.

## Generated Outputs

Generated run/profile replay sidecars were removed after verification. The
tracked `data/derived/latest_run_final_save.json` was restored after each
scenario run. No generated replay sequence files are owned by this slice.
