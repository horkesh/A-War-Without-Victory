# Sector Friendly-OSIDs Redundant Adjacency Scan Elision

**Date:** 2026-05-30
**Type:** Deterministic sector/frontline performance optimization (byte-identical)
**Plan:** `docs/plans/2026-05-20-sector-performance-next-target-plan.md`
**Pre-change 40w final_state_hash (gold):** `78e231e35b08cf53`
**Post-change 40w final_state_hash:** `78e231e35b08cf53` (byte-identical)

## Summary

Eliminated a pure-redundant `adjacency.keys()` pre-scan inside
`buildFriendlyOsidsFromState(...)` in `src/sim/combat/corps_front_sectors.ts`.

The function builds the set of OSIDs politically controlled by a faction. It
previously ran two loops:

1. iterate `adjacency.keys()` and add `osid` where `pc[osid] === faction`;
2. iterate `Object.entries(pc)` and add `osid` where `controller === faction`.

Every OSID added by loop (1) satisfies `pc[osid] === faction` and is therefore a
key of `pc`, so it is *already* produced by loop (2), which enumerates every key
of `political_controllers`. Loop (1) was strictly redundant work over the large
adjacency map. The returned `Set<string>` is consumed only via `.has(...)`
membership checks (e.g. `buildOneHopReserveBand`, front/reserve/territory claim
lookups) — never iterated for ordering — so dropping the redundant loop yields
the byte-identical membership set.

`buildFriendlyOsidsFromState` is invoked from ~10 call sites across the sector
reconstruction pipeline (`applyFinalSectorOwnerTruthPass` ×4 passes,
`relocateMisassignedBrigadesToTruthfulOwners`, and several geometry/voronoi
passes), each of which previously paid a full `adjacency.keys()` walk per call.

## Why this target

The lane's measured dominant owners remain `reconcile-final-sector-truth` and
`partition-corps-front-sectors`. Within `buildCorpsFrontSectors`, the friendly-
OSID derivation is one of the most repeated adjacency walks (≥10 invocations per
sector reconstruction × 40 turns). Unlike caching derived sector sets (a known
bad candidate per the 2026-05-27 closeout, which regressed
`sealMergedSectorTruth:ensure-coverage`), this slice removes *provably dead*
work rather than introducing any cache, so it carries no cross-pass leakage risk.

## Changes Made

| File | Change |
|------|--------|
| `src/sim/combat/corps_front_sectors.ts` | `buildFriendlyOsidsFromState(...)` drops the redundant `adjacency.keys()` pre-scan; signature unchanged (`adjacency` renamed `_adjacency`, retained for call-site/instrumentation contracts). |

No new cache, no module-level state, no mutable Map/Set leakage, no ordering
change, no save-schema/scenario-data change, no timing/random sources.

## Verification

| Gate | Result |
| --- | --- |
| `tsc --noEmit` (changed file + all non-`ui/map` sources) | PASS (clean; only pre-existing `src/ui/map/*` optional-dep resolution errors in this worktree's junctioned node_modules, unrelated to this change) |
| Focused sector tests (7 files) | PASS — 74 passed, 1 skipped |
| G1.5 cache ON-vs-OFF byte-equality (incl. ≥100 deterministic variants) | PASS |
| Profiled 40w final_state_hash | `78e231e35b08cf53` == gold `78e231e35b08cf53` |

Focused test command:

```powershell
node node_modules/vitest/vitest.mjs run tests/final_sector_truth_reconciliation.test.ts tests/final_sector_truth_reconciliation_cache.test.ts tests/sector_partition_buildCorpsFrontSectors_integration.test.ts tests/sector_partition_instrumentation.test.ts tests/war_phase_step_order.test.ts tests/sector_frontline_truth.test.ts tests/sector_drina_frontline_integrity.test.ts --reporter=dot
```

## Performance Note

This removes one full `adjacency.keys()` iteration per call across ~10 sector-
reconstruction call sites. Per lane policy, the byte-identity gate is the primary
claim; the change is a dead-work elision, so the direction is unambiguously
non-regressive even where wall-clock noise is inconclusive.

## Generated Outputs

Profile/run artifacts under `runs/` and `data/derived/` remain ignored and
unstaged.
