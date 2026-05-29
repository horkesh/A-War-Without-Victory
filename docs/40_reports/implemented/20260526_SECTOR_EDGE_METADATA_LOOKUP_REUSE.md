# Sector Edge Metadata Lookup Reuse

**Date:** 2026-05-26
**Baseline:** `data/derived/_debug/sector_next_target_profile_40w.json`
**Result:** `data/derived/_debug/sector_edge_lookup_post_profile_40w.json`

## Summary
- Reused the pass-local `globalEdgeMeta` map when building per-corps sectors.
- Preserved per-corps `edgeIds` writer order and retained the old lazy lookup fallback for missing or absent shared metadata.
- Reduced the comparable 40-week profile wall time from 103.310s to 91.556s with final hash `f219401f4a17f311`.

## Changes Made
### Sector Construction
- `buildMultiSectorsForCorps(...)` now accepts optional read-only shared front-edge metadata.
- `buildFactionSectors(...)` passes the invocation-local `edgeMeta` built by `buildCorpsFrontSectors(...)`.
- The function still copies each selected edge into a fresh per-corps `edgeMeta` map before downstream construction.

### Test Coverage
- Strengthened sector instrumentation contracts so tests assert the call site passes `_perfTime, edgeMeta`.
- Added static checks that `sharedFrontEdgeMeta` is optional, preferred first, and that local `osidFrontEdges` lookup construction remains lazy fallback-only.

## Scenario Results
- Baseline regression: all scenarios match.
- 40-week profile final state hash: `f219401f4a17f311`.
- Comparable profile wall time: 103.310s -> 91.556s.
- `partition-corps-front-sectors`: 7122.405ms -> 6503.316ms.

## Lessons Learned
- Reusing already-built read-only metadata at the pass boundary is safer than changing sector truth passes.
- Keep fallback paths for direct tests and synthetic fixtures; optimize the live path without removing standalone behavior.
- Measure after narrow performance patches; the direct bucket win was modest, but the wall-clock profile improved enough to keep the change.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/sector_building.ts` | Optional shared front-edge metadata lookup with lazy local fallback |
| `src/sim/combat/corps_front_sectors.ts` | Passes `edgeMeta` into `buildMultiSectorsForCorps(...)` |
| `tests/sector_partition_instrumentation.test.ts` | Static contracts for shared lookup call site and fallback shape |

## Verification
- `npx.cmd vitest run tests\sector_partition_instrumentation.test.ts tests\sector_partition_buildCorpsFrontSectors_integration.test.ts --reporter=dot` - PASS; 27/27 tests.
- `npm.cmd run test:baselines` - PASS; baseline regression all scenarios match.
- `git diff --check` - PASS.
- `npx.cmd tsx tools/perf/profile_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out runs_perf/sector_edge_lookup_post_profile --report data/derived/_debug/sector_edge_lookup_post_profile_40w.json` - PASS; totalWallS=91.56, final hash `f219401f4a17f311`.

## Next Steps
- Keep the heavier `sealMergedSectorTruth` and `ensureMinimumSectorCoverage` optimization behind a separate design/review gate.
- Any future sector context cache must prove no mutable Set/Map leaks and must pass byte-identity scenario gates.
