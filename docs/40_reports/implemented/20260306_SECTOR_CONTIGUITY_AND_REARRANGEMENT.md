# Sector Contiguity Enforcement + Corps AI Sector Rearrangement

**Date:** 2026-03-06
**Commits:** `e28b71e`..`fef9649` (5 commits)
**Plan:** `docs/plans/2026-03-06-sector-contiguity-and-rearrangement.md`

## Summary

- Implemented post-build contiguity split for corps front sectors — BFS through friendly OSIDs via OSID adjacency, split disconnected components into separate sectors
- Created corps AI sector rearrangement module with two active triggers: thin sector consolidation (merge 0-brigade ≤3-edge sectors into neighbors) and enemy pocket containment (detect surrounded enemy OSIDs, create dedicated containment sectors)
- Wired rearrangement into `generateCorpsDirectives()` so it runs after sector build and before brigade orders each turn

## Problem

Corps front sectors were frequently non-contiguous. Investigation of 1st Krajina Corps showed 18/26 sectors had disconnected friendly territory. Root cause: `findSubSegments()` uses edge adjacency (edges sharing friendly OSID endpoints), but doesn't verify the friendly OSIDs behind those edges are themselves connected through OSID adjacency. Another corps sector's territory can sit between them, creating a sector with two or more disconnected pieces of friendly territory.

## Architecture

Two-layer approach:

1. **Layer 1 — Contiguity split** (post-build, in `corps_front_sectors.ts`): After sectors are built and deduplicated, BFS through each sector's friendly OSIDs. If disconnected components exist, split into one sector per component. Edges partitioned by which component their friendly-side OSID belongs to. Brigades assigned to the largest component (others repopulated by downstream `assignInteriorBrigadesToSectors`).

2. **Layer 2 — Rearrangement** (in `generateCorpsDirectives()`, via `sector_rearrangement.ts`): Three triggers, two active:
   - **Thin consolidation**: 0-brigade ≤3-edge sectors merged into smallest adjacent neighbor. Iterative (repeat until no more thin sectors).
   - **Pocket containment**: Enemy OSIDs where ALL neighbors are friendly to the corps → dedicated containment sector with pocket as `enemy_osids` and surrounding friendly OSIDs as `friendly_osids`.
   - **Operation concentration** (deferred): Merge adjacent small sectors into operation target sector.

## Changes Made

### New Files

| File | Purpose |
|------|---------|
| `src/sim/combat/sector_rearrangement.ts` | Rearrangement module: `rearrangeSectorsForCorps()`, thin consolidation, pocket containment |
| `tests/sector_contiguity_split.test.ts` | 4 tests for `splitNonContiguousSectors` |
| `tests/sector_rearrangement.test.ts` | 3 tests for `rearrangeSectorsForCorps` |

### Modified Files

| File | Change |
|------|--------|
| `src/sim/combat/corps_front_sectors.ts` | Added `splitNonContiguousSectors()` (exported); wired into `buildMultiSectorsForCorps()` pipeline between dedup and interior brigade assignment |
| `src/sim/combat/bot_corps_ai.ts` | Import + call `rearrangeSectorsForCorps()` in `generateCorpsDirectives()`; write rearranged sectors back to state |
| `vitest.config.ts` | Added both test files to include array |

### Pipeline Integration

In `buildMultiSectorsForCorps()`:
```
findSubSegments → mergeUndersized → splitOversized → buildSectors
→ Phase1E split → dedup → **splitNonContiguousSectors** → assignInterior → redistributeReserves
```

In `generateCorpsDirectives()`:
```
collect corpsSectors → **rearrangeSectorsForCorps** → write back to state → generate directives
```

## Test Coverage

| Test File | Tests | Status |
|-----------|-------|--------|
| `tests/sector_contiguity_split.test.ts` | 4 | PASS |
| `tests/sector_rearrangement.test.ts` | 3 | PASS |
| Full Vitest suite | 321 | PASS |

### Contiguity Split Tests
1. Returns sector unchanged when all friendly OSIDs are contiguous
2. Splits sector with two disconnected friendly OSID groups
3. Handles sector with three disconnected groups
4. Preserves already-contiguous sectors in a mixed list

### Rearrangement Tests
1. Merges a 0-brigade ≤3-edge sector into its adjacent neighbor
2. Does not merge a thin sector with no adjacent neighbor
3. Creates a containment sector around an enemy pocket inside corps territory

## Scenario Results

40-week scenario run (n131): 83.4% area-weighted match. **However, a pre-existing regression** (0 battles, 0 attack orders) was identified, traced to the `codex/combat-causality-hardening` merge (`28b5908`→`7ffaaef`) which predates this session. This was confirmed by:
- Bypassing rearrangement entirely → identical results (n132: 83.3%)
- Rolling back to pre-merge sim code (commit `10d29d8`) → identical results (n134: 81.5%)

The sector contiguity + rearrangement changes do not cause any additional regression. The 0-battle issue requires separate investigation of the combat-causality-hardening merge.

## Determinism Compliance

- No `Math.random()` — all BFS traversals use sorted seed iteration
- No `Date.now()` or timestamps
- All Map/Set iteration uses `[...collection].sort(strictCompare)`
- Sector IDs renumbered deterministically after each operation
- Brigade assignment follows sorted formation ID order
- Pocket detection uses sorted OSID iteration

## Commits

| Hash | Message |
|------|---------|
| `e28b71e` | test: add failing tests for sector contiguity split |
| `5bbf1e4` | feat(sim): split non-contiguous sectors by friendly OSID BFS |
| `3781442` | test: add failing tests for sector rearrangement |
| `6eb706d` | feat(sim): corps AI sector rearrangement — thin consolidation + pocket containment |
| `fef9649` | feat(sim): wire sector rearrangement into corps directive generation |

## Next Steps

1. **P0: Fix pre-existing 0-battle regression** from `codex/combat-causality-hardening` merge — separate investigation needed
2. **Operation concentration trigger**: Merge adjacent small sectors into active operation's sector (deferred, data structure ready)
3. **Calibration re-verification**: Once 0-battle bug is fixed, re-run 40w to verify sector changes don't regress from ATH (99.2%)
4. **Player-facing rearrangement**: Currently bot-only; player corps rearrangement UI deferred
