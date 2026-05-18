# Sector Reconstruction Attribution Task 3

**Date:** 2026-05-18
**Plan:** `docs/plans/2026-05-18-sector-reconstruction-performance-plan.md`
**Lane:** Batch 8 sector performance instrumentation
**Result:** Implemented opt-in child attribution inside `recoverDroppedFrontEdges(...)`

## Summary
- Added deeper sidecar-only attribution under the existing `PERF_PROFILE_SECTOR_PARTITION=true` profiler path.
- Preserved sector behavior and ordering by wrapping existing blocks with `_perfTime(...)` only; no optimization or cache semantics changed.
- Fresh 40w opt-in profile identified `recoverDroppedFrontEdges:faction-front-claim-setup` as the concrete Task 4 candidate.

## Changes Made

### `recoverDroppedFrontEdges(...)` Attribution
- Added deterministic child labels for faction claim setup, missing-edge scan, corps brigade component indexing, subsegment search, sector build and staff check, recipient merge attempt, post-recovery truth passes, and post-recovery reassignment.
- Labels write only through the existing `data/derived/_debug/sector_partition_perf.jsonl` JSONL sidecar when `PERF_PROFILE_SECTOR_PARTITION=true`.
- No timing data is written to saves, run summaries, weekly reports, game state, scenario truth artifacts, or player-visible outputs.

### Instrumentation Tests
- Extended `tests/sector_partition_instrumentation.test.ts` with a static contract for the new labels.
- The test verifies deterministic sorted label literals and rejects timestamp-shaped/time API usage inside the recovery function body.

## Labels Added
| Label | Scope |
|---|---|
| `recoverDroppedFrontEdges:corps-brigade-component-index` | Per-corps active brigade location/component collection |
| `recoverDroppedFrontEdges:corps-missing-edge-scan` | Expected/current edge comparison per corps |
| `recoverDroppedFrontEdges:faction-front-claim-setup` | Per-faction OSID-to-corps mapping, partitioning, consolidation, friendly/component setup, faction brigade component collection |
| `recoverDroppedFrontEdges:post-recovery-reassignment` | Post-recovery territory, brigade, and power reclassification pass |
| `recoverDroppedFrontEdges:post-recovery-truth-passes` | Post-recovery sibling canonicalization, merge, and geometry invariant passes |
| `recoverDroppedFrontEdges:recipient-merge-attempt` | Recipient selection and merge-contiguity trial |
| `recoverDroppedFrontEdges:sector-build-staff-check` | Recovered sector construction and staffing predicate |
| `recoverDroppedFrontEdges:subsegment-search` | Missing-edge subsegment reconstruction |

## Profile Evidence
Command:
`PERF_PROFILE_SECTOR_PARTITION=true npx.cmd tsx tools/perf/profile_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out runs_perf/sector_reconstruction_partition_profile_task3 --report data/derived/_debug/sector_reconstruction_partition_profile_task3_40w.json`

Evidence files:
- `data/derived/_debug/sector_reconstruction_partition_profile_task3_40w.json`
- `data/derived/_debug/sector_partition_perf.jsonl`

Aggregate from fresh sidecar:
| Metric | Value |
|---|---:|
| Invocations | 95 |
| Combined `recoverDroppedFrontEdges:1+2` | 2881.824 ms |
| `recoverDroppedFrontEdges:faction-front-claim-setup` | 2491.228 ms |
| Share of `recoverDroppedFrontEdges:1+2` | 86.446% |
| Next largest child, `post-recovery-reassignment` | 164.128 ms / 5.695% |

The concrete Task 4 candidate is `recoverDroppedFrontEdges:faction-front-claim-setup`, specifically repeated per-faction setup work across the two recovery passes.

## Verification
| Command | Result |
|---|---|
| `npx.cmd vitest run tests/sector_partition_instrumentation.test.ts --reporter=dot` before implementation | Failed for missing child labels |
| `npx.cmd vitest run tests/sector_partition_instrumentation.test.ts --reporter=dot` after implementation | 8 tests passed |
| `npx.cmd vitest run tests/sector_partition_instrumentation.test.ts tests/profile_hotspot_report.test.ts --reporter=dot` | 10 tests passed |
| `npm.cmd run typecheck` | Passed |
| Fresh opt-in 40w profile command above | Completed; profile report written |

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/corps_front_sectors.ts` | Added nested `_perfTime(...)` child attribution inside `recoverDroppedFrontEdges(...)` |
| `tests/sector_partition_instrumentation.test.ts` | Added static contract for deterministic labels and timestamp-free recovery instrumentation |
| `docs/40_reports/implemented/20260518_SECTOR_RECONSTRUCTION_ATTRIBUTION_TASK3.md` | This implementation report |

## Next Steps
- Task 4 should target `recoverDroppedFrontEdges:faction-front-claim-setup` with a bounded per-invocation reuse/precompute strategy.
- Any optimization must prove byte identity across sector snapshots and preserve ordering, cache scope, and final truth passes.
