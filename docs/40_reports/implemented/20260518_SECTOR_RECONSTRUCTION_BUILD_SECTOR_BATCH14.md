# Sector Reconstruction Build-Sector Batch 14

**Date:** 2026-05-18
**Run ID:** `runs_perf/sector_reconstruction_build_sector_batch14_after/apr1992_definitive_40w__3649b3861a87e6ea__w40_n0`
**Baseline:** 40w n1889 `248202ee4fd13027`
**Result:** 40w final-save hash remained `248202ee4fd13027`

## Summary
- Used the Batch 13 `buildSectorFromSubSegments:${corpsId}:${sectorIndex}:*` sidecar labels to identify repeated sector-object formation scans as the bounded target.
- Implemented per-corps active combat formation scan-list reuse inside `buildMultiSectorsForCorps(...)`, with no module-level cache and no persisted state change.
- Verified focused sector tests and a fresh profiled 40w run; output hash stayed byte-identical to n1889.

## Baseline Resolution
- `docs/plans/MASTER_ROADMAP.md` names the active integrated-context 40w proof as n1889 `248202ee4fd13027`, byte-identical to n1888.
- This lane used that hash as the byte-identity target, not older performance-plan hashes.

## Profile Evidence

### Pre-change Batch 14 Probe
Command:

```powershell
Remove-Item -LiteralPath data\derived\_debug\sector_partition_perf.jsonl -ErrorAction SilentlyContinue; $env:PERF_PROFILE_SECTOR_PARTITION='true'; npx.cmd tsx tools\perf\profile_scenario.ts --scenario data\scenarios\apr1992_definitive_40w.json --out runs_perf\sector_reconstruction_build_sector_batch14 --report data\derived\_debug\sector_reconstruction_build_sector_batch14_40w.json
```

Result:
- Exit code 0.
- `totalWallS=102.19`, `partition-corps-front-sectors=10496.239ms`.
- Sector sidecar: 94 invocations, `25199.186ms`.
- `buildSectorFromSubSegments:*` child totals:

| child suffix | total ms | count |
|---|---:|---:|
| `assigned-brigade-scan` | 579.806 | 7905 |
| `enemy-power-scan` | 352.412 | 7905 |
| `input-aggregation` | 54.395 | 7905 |
| `defensive-power` | 30.611 | 7905 |
| `sector-record-assembly` | 15.064 | 7905 |
| `sorted-edge-list` | 10.252 | 7905 |

### Post-change Batch 14 Profile
Command:

```powershell
Remove-Item -LiteralPath data\derived\_debug\sector_partition_perf.jsonl -ErrorAction SilentlyContinue; $env:PERF_PROFILE_SECTOR_PARTITION='true'; npx.cmd tsx tools\perf\profile_scenario.ts --scenario data\scenarios\apr1992_definitive_40w.json --out runs_perf\sector_reconstruction_build_sector_batch14_after --report data\derived\_debug\sector_reconstruction_build_sector_batch14_after_40w.json
```

Result:
- Exit code 0.
- `totalWallS=96.89`, `partition-corps-front-sectors=9897.138ms`.
- Sector sidecar: 94 invocations, `24216.830ms`.
- Final-save hash command returned `248202ee4fd13027`:

```powershell
$path='runs_perf\sector_reconstruction_build_sector_batch14_after\apr1992_definitive_40w__3649b3861a87e6ea__w40_n0\final_save.json'; (Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLower().Substring(0,16)
```

Post-change `buildSectorFromSubSegments:*` child totals:

| child suffix | total ms | count |
|---|---:|---:|
| `enemy-power-scan` | 191.543 | 7905 |
| `assigned-brigade-scan` | 178.489 | 7905 |
| `input-aggregation` | 54.118 | 7905 |
| `defensive-power` | 26.906 | 7905 |
| `sector-record-assembly` | 13.709 | 7905 |
| `sorted-edge-list` | 9.926 | 7905 |

## Changes Made
- `src/sim/combat/sector_building.ts`
  - Added a local active combat formation scan-list builder using existing `strictCompare` ordering.
  - Builds the scan list once per `buildMultiSectorsForCorps(...)` call and passes it to `buildSectorFromSubSegments(...)` sector creation and brigade-cap split rebuilds.
  - Keeps direct `buildSectorFromSubSegments(...)` callers on the old local-build fallback path.
- `tests/sector_partition_instrumentation.test.ts`
  - Added a static instrumentation contract for `buildMultiSectorsForCorps:${corpsId}:active-combat-formation-scan-ids`.

## TDD And Verification
Commands:

```powershell
npx.cmd vitest run tests\sector_partition_instrumentation.test.ts --reporter=dot
```

RED result before implementation:
- Exit code 1.
- 11 passed, 1 failed.
- Failure: missing `buildMultiSectorsForCorps:${corpsId}:active-combat-formation-scan-ids` label.

GREEN result after implementation:
- Exit code 0.
- 12 passed.

Required focused sector tests:

```powershell
npx.cmd vitest run tests/sector_partition_instrumentation.test.ts tests/sector_partition_buildCorpsFrontSectors_integration.test.ts tests/sector_frontline_truth.test.ts --reporter=dot
```

Result:
- Exit code 0.
- 3 files passed, 48 tests passed.
- Expected sector invariant fixture stderr was emitted by `sector_frontline_truth` / G1.5 cases, but no test failed.

## Determinism And Output Impact
- Runtime code changed, but serialized 40w output stayed byte-identical: `248202ee4fd13027`.
- Parent 40w proof: n1890 `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1890`, final hash `248202ee4fd13027`, 27/27 anchors, 6/6 bot benchmarks, consistency validation PASS.
- No module-level or cross-turn cache was added.
- The scan list is built inside one `buildMultiSectorsForCorps(...)` invocation from the current `formations` object and preserves deterministic `strictCompare` ID order.
- Profile data remains sidecar-only under `PERF_PROFILE_SECTOR_PARTITION=true`.

## Next Measured Target
Batch 14 reduces the specific `buildSectorFromSubSegments(...)` scan child cost. The next measured sector target should move back to the larger remaining sector buckets:

1. `buildFactionSectors:RS` / `buildFactionSectors:RBiH`.
2. Their remaining `corps-sector-construction` children, after excluding the now-reduced formation scan cost.
3. `recoverDroppedFrontEdges:1` / `recoverDroppedFrontEdges:faction-front-claim-setup` if they remain stable leaders in the next profile.

Avoid claiming a full-harness speed win from this single paired profile; wall-clock noise and concurrent machine load still require repeated runs before broad performance claims.

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/sector_building.ts` | Per-corps active combat formation scan-list reuse for sector object construction. |
| `tests/sector_partition_instrumentation.test.ts` | Static contract for the new perf label. |
| `docs/40_reports/implemented/20260518_SECTOR_RECONSTRUCTION_BUILD_SECTOR_BATCH14.md` | Evidence and closeout report. |
