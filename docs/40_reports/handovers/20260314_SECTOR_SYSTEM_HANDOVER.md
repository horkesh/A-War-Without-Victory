# Sector System Handover — Fix Corps Front Sectors Once and For All

**Date:** 2026-03-14
**Status:** Handover for outside expert
**File:** `src/sim/combat/corps_front_sectors.ts` (3176 lines, single file)
**Latest committed state:** n693 (2 commits: n692 threshold + n693 brigade proximity)

---

## Executive Summary

The sector system partitions each faction's hostile boundary into per-corps **sectors** — contiguous slices of the front line. It works well for ~80% of the map but has a fundamental unsolved problem: **sectors can wrap around enemy pockets through genuine triple-junction connections**, creating sectors whose front edges are on physically opposite sides of enemy territory.

The core difficulty: the algorithm uses **polygon adjacency** to determine front-line connectivity, but polygon adjacency doesn't distinguish between "adjacent along the front" and "adjacent because you share a corner with an enemy polygon that wraps around you." No distance threshold can fix this — the problematic connections are at 0.0m (true shared vertices).

---

## What the System Does

### The Job

Every turn, the simulation needs to know:
1. Which corps defends which segment of the front line
2. Which brigades defend each segment
3. What territory sits behind each segment

A **sector** is: a set of front edges (the hostile boundary), assigned to one corps, with a block of territory behind it and brigades manning it.

### The Domain

- **744 OSIDs** (operational sub-ID polygons) tile the map of Bosnia
- **~400 front edges** where friendly and hostile OSIDs meet
- **3 factions** (RBiH/RS/HRHB), each with 3-6 corps
- Front edges are identified as `osidA__osidB` where one side is friendly, one hostile
- **Triple junction**: where 3 polygon corners meet — the only place a front line can "turn"

### The Pipeline (9 steps)

```
PRE-PIPELINE (faction-wide):
  Step 1:  mapOsidsToCorps        — BFS from brigade home_osids to assign territory
  Step 3:  partitionFrontEdges     — each front edge → its friendly OSID's corps
  Step 3b: consolidateCrossCorpsFronts — merge minority-corps edges in components
  Step 3c: consolidateIsolatedCorpsPockets — reassign isolated pockets to neighbors

PER-CORPS PIPELINE:
  Step 4:  buildMultiSectorsForCorps → findSubSegments → merge/split sub-segments
  Step 4b: splitNonContiguousSectors — break sectors spanning disconnected fronts
  Step 4c: mergeUndersizedSectors    — rejoin tiny fragments

POST-PIPELINE (faction-wide):
  Step 5:  assignTerritoryVoronoi   — BFS from sector fronts → assign rear territory
  Step 6:  classifyBrigadesByTerritory — assign brigades (Phase 1/2a/2b)
  Step 7:  ensureMinimumSectorCoverage — transfer brigades to empty sectors
  Step 8:  deduplicateBrigadesAcrossSectors
```

### Key Algorithms

#### Edge Adjacency: Case A and Case B

Two front edges are considered "adjacent on the front line" if they meet at a polygon triple junction:

- **Case A** (always valid): Same friendly OSID `F`, hostile OSIDs `H₁` and `H₂` are adjacent. The front turns along the friendly polygon boundary. Example: `F-H₁` and `F-H₂` where `H₁` borders `H₂`.

- **Case B** (problematic): Same hostile OSID `H`, friendly OSIDs `F₁` and `F₂` are adjacent. The front turns along the hostile polygon boundary. Example: `F₁-H` and `F₂-H` where `F₁` borders `F₂`.

**Case A is always safe.** If two edges share the same friendly polygon, they're on the same part of the front. A soldier can walk from one to the other without leaving friendly territory.

**Case B is the root of all problems.** If two edges share the same hostile polygon, they might be on the same part of the front — OR they might be on opposite sides of an enemy pocket. The hostile polygon wraps around and touches friendly polygons on both sides.

```
           H (hostile polygon)
          / \
    F₁ --+   +-- F₂
         |   |
    (north   (south
     front)   front)
```

Here F₁-H and F₂-H are "Case B adjacent" even though the fronts face in opposite directions, separated by the hostile polygon H.

#### Four Adjacency Thresholds

The system builds 4 adjacency maps at different distance thresholds:

| Name | Threshold | Use |
|------|-----------|-----|
| `adjacency` | All edges | Full OSID graph (BFS, territory) |
| `frontEdgeAdj` | ≤33m (`FRONT_EDGE_MAX_GAP`) | Sub-segment construction, Case A/B |
| `caseBSplitAdj` | ≤16.6m (`CASE_B_SPLIT_THRESHOLD`) | Case B filter in split step |
| `strictAdj` | ≤5.5m (`SHARED_BOUNDARY_THRESHOLD`) | True shared polygon boundaries |

The split step (4b) uses `caseBSplitAdj` to decide which Case B connections are legitimate: if `F₁-H` distance AND `F₂-H` distance are both ≤16.6m, the Case B is allowed. Otherwise, it's severed.

---

## What's Been Tried and Why It Failed

### Attempt 1: Shared-OSID Connectivity (n620)

**Idea:** Two edges are adjacent iff they share an OSID endpoint.

**What happened:** Worked for Srebrenica-Cerska split (the target case). But too permissive at triple junctions — edges that share a hostile OSID at a branching point get merged even when they face different directions. Over-merged: sectors spanning disconnected fronts.

**Why it failed:** Doesn't distinguish between "front continues" and "front branches." At a triple junction (F, H₁, H₂), edges F-H₁ and F-H₂ share friendly OSID F — correct. But edges F₁-H and F₂-H share hostile H — no directional information.

### Attempt 2: Triple-Junction Connectivity (n532, n664)

**Idea:** Two edges adjacent iff they share a polygon triple junction. Case A: same F, H₁ adj H₂. Case B: same H, F₁ adj F₂.

**What happened:** Mostly correct. Sectors went from 77→92. But Case B bridges front edges on opposite sides of enemy pockets. Specifically: 3rd Corps had a mega-sector spanning Zavidovici (north of RS Ozren pocket) and Ilijas/Breza (south of it). Sector was physically split by enemy territory.

**Why it failed:** Case B with the 33m threshold allows connections like `dragoradi_2` (Ilijas, south) ↔ `krivajevici` (hostile, RS pocket) ↔ `olovo_2` (Olovo, north). The 33m gap allows `olovo_2` to be "adjacent" to `krivajevici` even though it's a GIS near-miss, not a true shared boundary.

### Attempt 3: Strict Case B at 5.5m (n682)

**Idea:** Only allow Case B when BOTH friendly-hostile distances are ≤5.5m (true shared polygon boundaries). This catches GIS near-misses like the 16.9m olovo_2↔krivajevici gap.

**What happened:** Fixed the Zavidovici-Ilijas bridge. But over-fragmented: 92→144 sectors. 34 legitimate Case B connections in the 6-15m range were cut. Too many tiny sectors, every sector had only 1 brigade.

**Why it failed:** 5.5m is the true polygon shared-boundary threshold, but many legitimate triple junctions have distances of 6-15m due to GIS precision issues. These are real contacts — polygons that genuinely share a vertex but the minimum centroid distance is slightly above 5.5m.

### Attempt 4: Case B Split Threshold at 16.6m (n692) ← CURRENT

**Idea:** Analysis of ALL Case B connections revealed a natural gap in the distance distribution: zero connections between 15.5m and 24.6m. The 16.6m threshold sits in this gap.

**What happened:** 144→131 sectors, 0 disconnected, 5/6 benchmarks, 88.2% area match. Fixed most GIS near-miss bridges. But...

**What it can't fix:** The gornja_borovica_2 problem. This is a genuine triple junction at **0.0m** distance. It's a real polygon vertex where three polygons meet: `hajderovici_2` (RBiH, Zavidovici municipality), `gornja_borovica_2` (RS, Vares municipality), and `kamensko_2` (RBiH, Olovo municipality). Via Case B, front edges at hajderovici_2 (north) and kamensko_2 (south) are connected through the hostile gornja_borovica_2 — even though they're on opposite sides of the RS Vares pocket.

**No distance threshold can catch this.** The connection is at 0.0m. It's a genuine polygon triple junction.

### Attempt 5: Phase 2b Brigade Proximity (n693) ← CURRENT

**Idea:** While the sector geometry problem persisted, brigades were being sent across the map. Added BFS distance-weighted scoring to Phase 2b: `score = need / (1 + distance)`, hard cap at `MAX_ASSIGNMENT_HOPS = 8`.

**What happened:** Fixed brigade displacement (Gračanica→Zvornik, Hadžići→Višegrad gone). 6/6 benchmarks, 87.8% area. But doesn't fix the underlying sector geometry — just prevents brigades from traveling far to reach a weirdly-shaped sector.

### What Went Wrong with consolidateIsolatedCorpsPockets (Step 3c)

A separate issue compounding the sector geometry problem: Step 3c unconditionally reassigns non-largest corps components to neighboring majority corps. When 3rd Corps's Zavidovici pocket is disconnected from the 3rd Corps main body (by RS Ozren territory), Step 3c absorbs it into 1st Corps (which has more edges nearby). This is wrong — 3rd Corps brigades are FROM Zavidovici.

A WIP fix (home-brigade protection: skip reassignment if the pocket's corps has home-seeded brigades there) was started but reverted before commit. The user decided this needs a holistic architectural fix, not more patches.

---

## The Unsolved Problem

### The Fundamental Issue

The sector system uses polygon adjacency as a proxy for "front-line connectivity." This proxy breaks when:

1. An enemy pocket (a hostile polygon or cluster) is **surrounded** by friendly territory
2. Friendly polygons on opposite sides of the pocket share genuine polygon vertices (triple junctions) with the hostile polygon
3. Case B connects front edges through these shared vertices, creating sectors that wrap around the pocket

The user's key insight: **"A sector CANNOT be physically split."** If a soldier on the front line cannot walk continuously from one part of the sector's front to another without crossing enemy territory, the sector is invalid — regardless of what the polygon adjacency says.

### The Specific Failing Case: gornja_borovica_2

```
                    ZAVIDOVICI (3rd Corps territory)
                     hajderovici_2 (RBiH)
                          |
                          | <-- front edge (RBiH vs RS)
                          |
                    gornja_borovica_2 (RS) ← hostile OSID
                          |
                          | <-- front edge (RBiH vs RS)
                          |
                     kamensko_2 (RBiH)
                    OLOVO (should be 3rd Corps)

    Current: 1st Corps sector wraps from Olovo through this pinch point
    to Zavidovici. The front edges face in opposite directions but are
    "Case B adjacent" through gornja_borovica_2 at 0.0m distance.
```

### Why This is Hard

- gornja_borovica_2 at 0.0m is a **true polygon triple junction** — not a GIS artifact
- No distance threshold catches it (it's literally 0)
- Case A doesn't connect it (different friendly OSIDs, different hostile OSIDs)
- Case B connects it because both edges share the hostile polygon AND their friendly polygons are adjacent (they touch at the vertex)
- You can't just remove Case B entirely — it's needed for front-line turns where the front follows along a hostile polygon boundary

### What Would Fix It

The expert should consider approaches that go beyond distance thresholds:

1. **Directional check**: Two Case B-connected edges should face roughly the same direction. If `hajderovici_2→gornja_borovica_2` faces south and `kamensko_2→gornja_borovica_2` faces north, they shouldn't be connected. Requires computing front-edge bearing from polygon centroids or boundaries.

2. **Hostile interior test**: If the path from F₁ to F₂ through friendly territory must circumnavigate the hostile polygon H, the Case B connection is wrapping around a pocket. BFS from F₁ to F₂ through friendly-only OSIDs — if the path goes significantly around H rather than through it, the connection is invalid.

3. **Front-edge angle**: At each triple junction, check if the front edges continue in compatible directions (within ~120° of each other) vs. facing opposite directions (>150° apart).

4. **Friendly BFS contiguity of front OSIDs**: After building a sector, BFS from each friendly OSID on the sector's front through only friendly territory. If some front OSIDs are unreachable from others through friendly territory, the sector wraps around an enemy pocket. This is already used in diagnostic scripts (`check_sector_contiguity_all.cjs`) but not in the construction pipeline.

5. **Rethinking consolidateIsolatedCorpsPockets**: Step 3c needs to respect home-brigade presence. When a pocket's corps has brigades FROM that municipality, the pocket should stay with that corps even if disconnected. The current unconditional reassignment to the majority neighbor is the root cause of "1st Corps defending Zavidovici" when it should be 3rd Corps.

---

## Architecture Reference

### Key Functions (with line numbers, may drift)

| Function | Line | Purpose |
|----------|------|---------|
| `buildCorpsFrontSectors` | 53 | Main entry point. Builds 4 adjacency maps. |
| `buildFactionSectors` | 126 | Per-faction pipeline orchestrator (Steps 1-8) |
| `mapOsidsToCorps` | 951 | BFS from brigade home_osids to assign territory to corps |
| `partitionFrontEdges` | ~1120 | Assigns each front edge to its friendly OSID's corps |
| `consolidateCrossCorpsFronts` | ~1253 | Step 3b: majority-corps merge with brigade protection |
| `isEdgeProtectedFromReassignment` | ~1233 | Guards: brigade presence + osidToCorps mapping |
| `consolidateIsolatedCorpsPockets` | 1451 | Step 3c: **ROOT CAUSE** — unconditional pocket reassignment |
| `findSubSegments` | 1567 | BFS through edge adjacency to find connected sub-segments |
| `buildMultiSectorsForCorps` | ~1593 | Per-corps sector construction (sub-seg → sector) |
| `splitNonContiguousSectors` | 2244 | Step 4b: split by strict Case B at 16.6m |
| `mergeUndersizedSectors` | 2663 | Step 4c: merge small sectors using 16.6m edge adjacency |
| `buildEdgeAdjacency` | 2893 | Triple-junction Case A + Case B (standard) |
| `buildEdgeAdjacencyStrictCaseB` | 3013 | Case A always + Case B with threshold |
| `classifyBrigadesByTerritory` | ~586 | Brigade assignment (Phase 1 front, 2a home, 2b proximity) |
| `assignTerritoryVoronoi` | ~Step 5 | BFS from sector fronts → assign rear territory |
| `areSectorsEdgeAdjacent` | ~2740 | Merge eligibility: Case A/B at 16.6m |
| `isSegmentAdjacent` | 2512 | Sub-segment merge: triple junction check |

### Key Types

```typescript
interface CorpsFrontSector {
    sector_id: string;           // "sector:arbih_3rd_corps:5"
    corps_id: FormationId;       // "arbih_3rd_corps"
    faction: FactionId;          // "RBiH"
    opposing_factions: string[];
    edge_ids: string[];          // ["op:zavidovici:hajderovici_2__op:vares:gornja_borovica_2", ...]
    sub_segments: CorpsFrontSubSegment[];
    length_edges: number;
    territory_osids: string[];   // Rear territory assigned by Voronoi BFS
    assigned_brigade_ids: FormationId[];
    reserve_brigade_ids: FormationId[];
    density: number;
    threat_ratio: number;
    defensive_power: number;
    sector_stance: SectorStance; // 'fortify'|'defend'|'elastic'|'active_defense'|'screening'
    stance_source: 'bot' | 'player';
}

interface CorpsFrontSubSegment {
    sub_segment_id: string;
    edge_ids: string[];
    friendly_osids: string[];    // Front-edge friendly OSIDs (can be shared between sectors)
    enemy_osids: string[];
    length_edges: number;
}
```

### Key Constants

```typescript
// In corps_front_sectors_constants.ts:
MAX_SECTOR_EDGES = 25;
MIN_SECTOR_EDGES = 5;
MAX_SECTOR_BRIGADES = 12;

// In corps_front_sectors.ts:
CASE_B_SPLIT_THRESHOLD = 0.00015; // ~16.6m

// In osid_adjacency.ts:
SHARED_BOUNDARY_THRESHOLD = 0.00005; // ~5.5m

// In front_edges.ts:
FRONT_EDGE_MAX_GAP = 0.0003; // ~33m

// In classifyBrigadesByTerritory:
MAX_ASSIGNMENT_HOPS = 8;
```

### Data Files

| File | Purpose |
|------|---------|
| `data/derived/operational/operational_contact_graph.json` | OSID adjacency graph with distances |
| `data/derived/latest_run_final_save.json` | Latest simulation state (has sectors, formations, control) |
| `data/derived/operational/osid_areas.json` | OSID polygon areas |

### Diagnostic Scripts

| Script | Purpose |
|--------|---------|
| `tools/check_sector_contiguity_all.cjs` | BFS through friendly territory per sector — finds disconnected |
| `tools/check_caseb_gaps.cjs` | Distance distribution of all Case B connections |
| `tools/check_brigade_displacement_n693.cjs` | BFS distance from brigade to sector front |
| `tools/check_1st_corps_olovo.cjs` | 1st Corps Olovo/Zavidovici investigation |
| `tools/check_corps_mapping_olovo.cjs` | Corps mapping, brigade locations, BFS connectivity |
| `tools/check_hajderovici_kamensko.cjs` | gornja_borovica_2 bridge analysis |
| `tools/check_gornja_borovica_bridge.cjs` | Detailed bridge distances and control |
| `tools/check_osid_to_corps.cjs` | Front-edge OSID → corps assignments |
| `tools/sector_deep_exam.cjs` | Full sector audit |
| `tools/check_sector_split.cjs` / `check_sector_split2.cjs` | Split verification |

### Test Files

```bash
# Run all tests (585 pass):
npm run test:vitest

# Key sector tests:
tests/sector_contiguity_split.test.ts
tests/sector_rearrangement.test.ts
tests/sector_stance_orders.test.ts
tests/sector_stances.test.ts
tests/sector_coverage_defense.test.ts
tests/sector_offensive_idle_recovery.test.ts
tests/sector_intel.test.ts
tests/distance_weighted_defense.test.ts
tests/bot_corps_ai_sector_contract.test.ts

# Run scenario (40 weeks):
npm run sim:scenario:run:40w
```

---

## Constraints

1. **Determinism is sacred**: No `Math.random()`, no timestamps. All iteration sorted via `strictCompare`. Same input → same output every time.
2. **NEVER override initial OSIDs**: Initial OSID control from census/referendum is sacrosanct.
3. **Pipeline runs every turn**: Sectors are derived state (Engine Invariants §13), never serialized. Must be fast enough to compute every game turn.
4. **585 tests must pass**: `npm run test:vitest`. No regressions.
5. **6/6 benchmarks should pass**: `npm run sim:scenario:run:40w`, then compare vs historical. Current: 5/6 (RBiH w40 failed by 0.9pp at n692).
6. **Existing sector consumers**: `attack_resolution_osid.ts`, `combat_predictor.ts`, `bot_corps_ai.ts`, `bot_corps_directives.ts`, `sector_stance_orders.ts`, `brigade_movement_orders.ts`, `sector_rearrangement.ts`, `sector_intel.ts`, `local_front_defense.ts`, the GUI (`CorpsFrontPanel.tsx`, `MapContainer.tsx`).

---

## What's Working (Don't Break)

- Case A adjacency: always correct, no changes needed
- Phase 2b brigade proximity (n693): distance-weighted scoring works well
- mapOsidsToCorps (Step 1): home-seed BFS + municipality guard is solid
- consolidateCrossCorpsFronts (Step 3b): brigade + osidToCorps protection works for Herzegovina/Sarajevo
- Territory Voronoi (Step 5): clean BFS assignment
- Sub-segment merge/split for oversized/undersized: mechanical, works fine
- Sector defense model (Layers A+B): reactive defense, stances — all good

---

## What Needs Fixing (Priority Order)

### P0: Sectors wrapping around enemy pockets

The gornja_borovica_2 case is the exemplar, but any Case B connection at a genuine 0m triple junction where the front wraps around a pocket will have this problem. The fix must detect and sever Case B connections that wrap around enemy territory, not just those with large distances.

### P1: consolidateIsolatedCorpsPockets (Step 3c) swallowing corps pockets

3rd Corps Zavidovici pocket (disconnected from 3rd Corps main body by RS Ozren) gets absorbed by 1st Corps. Should stay 3rd Corps because 3rd Corps brigades are FROM there. Fix: respect home-brigade presence.

### P2: Empty sectors (10 sectors with front edges but 0 brigades)

Structural — factions don't have enough troops. But HVO Central Bosnia has 5 empty sectors with 2 brigades for 7 sectors. May need small-sector merging tuned differently per corps.

---

## Calibration History

| Run | Sectors | Area% | Benchmarks | Key Change |
|-----|---------|-------|------------|------------|
| n532 | 77 | 87.0% | 5/6 | Triple-junction connectivity |
| n620 | 78 | 82.8% | - | Shared-OSID split |
| n624 | 85 | 83.2% | 6/6 | osidToCorps protection |
| n664 | 92 | 88.7% | - | Triple-junction split + shared territory |
| n668 | 92 | 89.0% | 6/6 | Sector stances (Layer B) |
| n682 | 144 | 87.1% | 6/6 | Strict Case B at 5.5m |
| n692 | 131 | 88.2% | 5/6 | Case B threshold 16.6m |
| n693 | 131 | 87.8% | 6/6 | Phase 2b proximity fix |
| ATH  | ~92 | 93.8% | - | n304 (before sector overhaul) |

---

## Running the Code

```bash
# Install
npm install

# TypeScript check
npm run typecheck

# All tests
npm run test:vitest

# 40-week scenario run (produces latest_run_final_save.json)
npm run sim:scenario:run:40w

# Diagnostic: check sector contiguity
node tools/check_sector_contiguity_all.cjs

# Diagnostic: Case B gap analysis
node tools/check_caseb_gaps.cjs

# Diagnostic: brigade displacement
node tools/check_brigade_displacement_n693.cjs

# Diagnostic: 1st Corps Olovo issue
node tools/check_1st_corps_olovo.cjs
```

---

## Summary for the Expert

You're inheriting a system that works mechanically (pipeline runs, tests pass, simulation produces results) but has a geometric reasoning gap: **Case B edge adjacency can wrap around enemy pockets through genuine triple junctions**. The four-threshold approach catches GIS artifacts but not real triple junctions at 0m. The fix needs to add a directional or topological check to Case B — not another distance threshold. Additionally, Step 3c (`consolidateIsolatedCorpsPockets`) needs home-brigade awareness to stop swallowing legitimate corps pockets.

The codebase is well-tested (585 tests, 6 benchmarks), deterministic, and has extensive diagnostic tooling. Good luck.
