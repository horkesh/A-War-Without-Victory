# Corps Sector System Overhaul

**Date:** 2026-03-08
**Baseline:** n401 (pre-overhaul)
**Result:** n403 (all 6 steps applied)

## Summary
- Major overhaul of `src/sim/combat/corps_front_sectors.ts` addressing 6 root causes of sector anomalies identified in the n401 sector investigation.
- Eliminated mega-sectors (84-OSID 1st Krajina), non-contiguous fronts, empty sectors from exempt corps, and deep-rear brigade concentration imbalance.
- Net result: healthier sector topology (73 sectors, 17 zero-brigade down from 24), improved troop strength alignment, slight ATH trade-off (-0.1% from baseline).

## Changes Made

### Step 1: Remove Hostile-Side Edge Adjacency Bridging (RC1)
- **File**: `corps_front_sectors.ts`, `buildEdgeAdjacency` function
- **Problem**: `buildEdgeAdjacency` connected edges via shared/adjacent enemy OSIDs, creating false connectivity across enemy territory. This was the root cause of mega-sectors (84-OSID 1st Krajina) and non-contiguous fronts (sector:6 wrapping around Breza).
- **Fix**: Removed hostile-side adjacency block (lines 1984-1999). Sub-segments now connect only through friendly-side OSID adjacency.
- **Impact**: Sector count increased from ~65 to 88 (n402). Breza contiguity fixed. 1st Krajina max territory dropped from 84 to 53.

### Step 2: Territory Size Cap (RC2)
- **File**: `corps_front_sectors.ts`, `assignTerritoryVoronoi`
- **Problem**: No upper bound on territory per sector. Multi-source BFS let large sectors gobble 84+ OSIDs.
- **Fix**: Added `MAX_TERRITORY_OSIDS = 40` constant. BFS stops claiming for a sector once it reaches the cap.
- **Impact**: 1st Krajina max territory capped at 40 (was 53 after Step 1).

### Step 3: Density-Aware Brigade Equalization (RC4)
- **File**: `corps_front_sectors.ts`, new `equalizeSectorDensity` function
- **Problem**: Deep-rear brigades (Priority 5 BFS) all landed on the nearest sector, creating concentration (Drina 6/8 in one sector).
- **Fix**: After initial classification, redistribute non-front-line brigades across own-corps sectors proportional to `length_edges`. Front-line brigades stay put.

### Step 4: Enhanced Minimum Coverage (RC3)
- **File**: `corps_front_sectors.ts`, `ensureMinimumSectorCoverage`
- **Problem**: Only promoted 1 reserve per empty sector. No cross-sector transfers.
- **Fix**: Added Step 2 transfer: take a non-front-line brigade from the surplus corps sector with the highest assigned count.

### Step 5: Skip Exempt Corps (RC5)
- **File**: `corps_front_sectors.ts`, `buildFactionSectors`
- **Problem**: HVO Central Bosnia (exempt) created 5 empty sectors.
- **Fix**: Skip corps in `EXEMPT_CORPS_IDS` before sector creation.

### Step 6: Filter Ghost Sectors (RC6)
- **File**: `corps_front_sectors.ts`, end of `buildMultiSectorsForCorps`
- **Problem**: Splits produced degenerate 0-1 edge sectors with no territory.
- **Fix**: Filter out sectors with ≤1 edge and 0 territory.

## Code Quality Pass
- Extracted `getSectorFrontOsids()` helper (3 duplicate pattern instances reduced to 1 function)
- Removed unused `adjacency`/`friendlyOsids` params from `equalizeSectorDensity`
- Removed duplicate JSDoc on `isSegmentAdjacent`
- Replaced `.filter()` with `.splice()` in brigade moves (avoid array allocation)

## Scenario Results

### OSID Match Rate

| Metric | n401 (baseline) | n402 (Step 1) | n403 (Steps 1-6) |
|---|---|---|---|
| ATH (area-weighted) | ~87.0% | 87.5% | 86.9% |
| Total sectors | ~65 | 88 | 73 |
| Zero-brigade sectors | 24 | 34 | 17 |
| 1st Krajina max territory | 84 | 53 | 40 |

### Regional Breakdown (n403)

| Region | n403 | Delta from n402 |
|---|---|---|
| Krajina | 94.7% | -2.9% |
| Posavina NE | 94.8% | +10.0% |
| Central Bosnia | 84.1% | +3.0% |
| Corridor | 90.8% | — |
| Sarajevo | 79.3% | -6.0% |
| Herzegovina | 90.3% | — |
| Drina | 64.0% | — |

### Troop Strengths (n403)

| Faction | Actual | Target | Delta |
|---|---|---|---|
| RBiH | 120.5k | 120k | +0.5k |
| RS | 106.0k | 102.6k | +3.4k |
| HRHB | 44.2k | 41.5k | +2.7k |

RBiH improved significantly from 126.5k (previous runs) to 120.5k, nearly matching the 120k target.

## Lessons Learned
- Hostile-side edge adjacency was the single biggest source of sector pathology — removing it immediately fixed contiguity and mega-sector issues, but increased total sector count (some splits are degenerate).
- Territory caps and ghost sector filtering are complementary: caps prevent runaway BFS, filters clean up degenerate splits.
- Brigade equalization across sectors is critical for combat dynamics — concentration in a single sector distorts both offense and defense.
- Sarajevo regression (-6%) is a downstream combat dynamics effect from changed brigade distribution, not a direct sector bug.

## Files Changed

| File | Change |
|------|--------|
| `src/sim/combat/corps_front_sectors.ts` | All 6 root-cause fixes, code quality pass |

## Tests
- All 378 vitest tests pass
- No new type errors (pre-existing `turn_pipeline_types.ts` duplicate unrelated)

## Remaining Issues
- **Drina**: 6 zero-brigade sectors — structural problem, only 8 brigades for 116 edges
- **Sarajevo**: Dropped -6% from n402 — combat dynamics shift from changed brigade distribution
- **Net ATH**: -0.1% from n401 baseline — regional winners (Posavina +10%, Central Bosnia +3%) offset by dynamic changes elsewhere

## Next Steps
- Investigate Sarajevo regression — may need targeted brigade placement or sector tuning
- Drina zero-brigade sectors may benefit from strategic reserve draw-rate adjustment
- Consider whether `MAX_TERRITORY_OSIDS = 40` is the right cap or needs per-corps tuning
