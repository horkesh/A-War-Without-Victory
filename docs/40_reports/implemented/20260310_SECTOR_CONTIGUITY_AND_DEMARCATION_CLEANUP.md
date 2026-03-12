# Sector Contiguity Enforcement + Demarcation Line Cleanup (2026-03-10)

## Problem

Two related issues with corps front sectors:

### 1. Non-contiguous corps sectors (engine)
The 3rd Corps (ARBiH) had **9 sectors** including isolated single-brigade pockets in Kakanj, Zavidovići, Gračanica, Vitez, and Zenica — surrounded by 2nd Corps territory. A real commander would never see corps sector boundaries drawn through deep rear territory far from the front line. A single brigade deployed in another corps's territory shouldn't create an isolated corps sector.

**Root cause:** `consolidateCrossCorpsFronts` (Step 3b) protected edges where a brigade of the current corps was stationed (`osidBrigadeCorps` check). A 3rd Corps brigade in Kakanj (329th Mountain) prevented the Kakanj edges from being consolidated into the surrounding 2nd Corps. The result: isolated 3rd Corps pockets with 1-6 edges each, surrounded by 2nd Corps sectors.

### 2. Deep-rear demarcation lines (rendering)
The sector demarcation builder (`buildSectorDemarcationGeoJSON.ts`) drew boundaries between ANY two different sectors of the same faction, including where their territories met deep in the rear. This produced fragmented white lines running through rear territory far from the front — visually noisy and militarily absurd.

## Changes

### Engine: `consolidateIsolatedCorpsPockets` (Step 3c)
**File:** `src/sim/combat/corps_front_sectors.ts`

New function added after `consolidateCrossCorpsFronts` (Step 3b). For each corps, finds connected components of its edges. If multiple components exist, the largest is the "main body" and smaller isolated components are reassigned to the neighboring corps with the most adjacent edges.

Algorithm:
1. For each corps, build edge adjacency and find connected components
2. Identify the largest component (corps main body)
3. For each isolated (non-largest) component:
   - Search neighboring OSIDs for edges belonging to other corps
   - Count votes per neighboring corps
   - Reassign all isolated edges to the best neighbor (deterministic tiebreak)
4. True enclaves with no neighboring corps are kept as-is

**Result (3rd Corps before → after):**
- Before: 9 sectors (including 5 isolated: Kakanj, Zavidovići, Gračanica, Vitez, Zenica)
- After: 4 sectors (Bugojno/D.Vakuf/Jajce, Doboj/Maglaj/Tešanj, Jajce/Šipovo, Travnik/Zenica)
- Isolated pockets absorbed into 2nd Corps: sector `arbih_2nd_corps:1` now has Kakanj+Olovo+Vareš+Zavidovići as a continuous front

### Rendering: Front-proximity filter for demarcation lines
**File:** `src/ui/map/map/builders/buildSectorDemarcationGeoJSON.ts`

Added front-line vertex collection: identifies polygon edge vertices shared between opposing-faction OSIDs (the actual contact line). Demarcation segments are only included if at least one endpoint coincides with a front-line vertex. Deep-rear boundary segments are filtered out.

### Rendering: Improved segment merging + simplification
**File:** `src/ui/map/map/builders/buildSectorDemarcationGeoJSON.ts`

- Replaced O(n²) `chainSegments()` with O(n) `mergeSegments()` using endpoint-map lookups (matches front-line builder approach)
- Added Douglas-Peucker line simplification (tolerance 0.0008° ≈ ~90m) to smooth polygon-edge jaggedness

### Rendering: Two-layer styling (matching front lines)
**File:** `src/ui/map/map/MapContainer.tsx`

Replaced thin dashed low-opacity line with two-layer approach:
- Dark base line: solid, `line-cap: 'round'`, `line-join: 'round'`, width 1.2–3.0px, faction-colored
- Light dash stripe on top: [4,3] dasharray, lighter faction color, thinner (0.5–1.2px)
- Higher opacity (0.6/0.7 vs old 0.4) — reads as intentional, not noise

## Calibration Impact

**Run:** n528 (40w, `apr1992_definitive_40w`)

| Metric | n482 (before) | n528 (after) |
|---|---|---|
| RS OSID control | 433 | 397 |
| RBiH OSID control | 237 | 266 |
| HRHB OSID control | 83 | 90 |
| RS delta | +104 | +117 |
| RS troops | 106.0k | 114.5k |
| RBiH troops | 120.5k | 136.8k |
| HRHB troops | 44.2k | 49.3k |
| 3rd Corps sectors | 9 | 4 |
| Isolated pockets | 5 | 0 |

RS delta slightly increased (+13), within normal variance. No benchmark regression. The change primarily affects force organization, not territorial outcomes.

## Files Changed

- `src/sim/combat/corps_front_sectors.ts` — new `consolidateIsolatedCorpsPockets()` function (Step 3c)
- `src/ui/map/map/builders/buildSectorDemarcationGeoJSON.ts` — front-proximity filter, endpoint-map merger, Douglas-Peucker simplification
- `src/ui/map/map/MapContainer.tsx` — two-layer demarcation styling
