# Sector Coverage Reachability Map Elision

**Date:** 2026-06-04
**Type:** Deterministic sector/frontline performance optimization
**Lane:** `docs/plans/2026-05-20-sector-performance-next-target-plan.md`
**Pre-change hash floor:** `41c72b13ad2e91b9`
**Post-change 40w final_state_hash:** `41c72b13ad2e91b9` (byte-identical)

## Summary

`ensureMinimumSectorCoverage(...)` no longer answers a boolean reachability
question by allocating a temporary `Map(front_osid -> 0)` and calling
`bfsToNearestSector(...)` for every candidate. The local helper now performs the
same friendly-territory BFS directly against the sector front OSID set and
returns a boolean as soon as a reachable front OSID is found.

This is intentionally narrower than the previously reverted broad front/reserve
view cache candidate. It removes per-check dead allocation while keeping all
sector geometry, candidate ordering, donor gates, movement gates, and assignment
mutation order unchanged.

## Changes

| File | Change |
| --- | --- |
| `src/sim/combat/brigade_assignment.ts` | Replaced the `distanceToSectorFront(...)` wrapper plus per-call `new Map([...sectorFriendly].map(...))` with direct boolean BFS in `canReachSectorFront(...)`; removed the now-unused `bfsToNearestSector` import. |
| `tests/sector_partition_instrumentation.test.ts` | Added a static contract proving the hot reachability helper does not reintroduce `bfsToNearestSector` or the per-check sector-index map allocation. |

## Verification

| Gate | Result |
| --- | --- |
| Focused sector coverage pack | PASS: 6 files, 90 tests |
| UI thread cleanup focused pack | PASS: 2 files, 10 tests |
| Typecheck | PASS: `npm.cmd run typecheck` |
| Profiled 40w | PASS: `totalWallS=87.89`, `rssMB=498.6`, final hash `41c72b13ad2e91b9` |
| Run consistency | PASS: zero unresolved assignments, zero false sector owners, exact war-front faction-side coverage, zero empty contested sectors, zero undefended wide-gap subsegments |
| Baseline regression | PASS: `Baseline regression: all scenarios match.` |
| Diff hygiene | PASS: `git diff --check` |

Profile evidence against the same-machine pre-change profile:

| Metric | Pre-change current-main profile | Post-change profile |
| --- | ---: | ---: |
| Total wall | 91.417s | 87.893s |
| `reconcile-final-sector-truth` | 8747.382ms | 8595.122ms |
| `partition-corps-front-sectors` | 8217.830ms | 8124.964ms |
| Sector partition sidecar total | 20497.846ms | 20387.751ms |

Treat timing as directional, not calibration truth. The binding result is the
byte-identical final hash plus consistency and baseline gates.

## Follow-Up

Continue sector work from the active floor recorded in `docs/40_reports/SECTOR_MASTER.md`;
`41c72b13ad2e91b9` is this report's historical pre-#180 proof hash. Re-profile
before selecting the next target. Do not revive broad sector-front
view caches without new evidence that reverses the 2026-05-27 regression finding.
