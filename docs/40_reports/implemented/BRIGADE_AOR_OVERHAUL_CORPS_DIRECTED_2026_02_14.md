# Brigade AoR Overhaul: Corps-Directed Assignment + Smooth Visualization

**Date:** 2026-02-14
**Type:** Feature implementation + system refactor
**Scope:** Replace Voronoi BFS AoR assignment with corps-directed contiguous allocation; replace per-polygon map display with smooth compound fill + breathing glow

---

## 1. Objective

Brigade AoR assignment was broken in two ways:

1. **Assignment logic:** The Voronoi BFS from brigade HQs produced non-contiguous settlement clusters. The 250-line `ensureBrigadeMunicipalityAssignment()` was a cascade of 7 fallbacks that produced "valid" assignments but not logical ones. Corps had zero say in how brigades deployed along the frontline. Rebalancing could further break contiguity — no contiguity invariant existed.

2. **Map display:** `drawBrigadeAoRHighlight()` drew each settlement polygon individually with dashed outlines and gray fill, producing a rough fragmented appearance.

**Design constraints:**
- Brigades cannot cover non-contiguous settlements (hard invariant)
- Max 3 municipalities per brigade (existing cap)
- Corps decides brigade deployment along the frontline
- Sparse coverage at war start — not every settlement covered; gaps are intentional
- Each recruited brigade is tied to a home municipality from OOB data
- Disconnected territories (enclaves) get separate command
- AoR highlight gets a subtle breathing glow animation

---

## 2. Changes Implemented

### 2.1 Contiguity Foundation — `aor_contiguity.ts` (NEW, 174 lines)

Reusable contiguity utilities for both the new AoR algorithm and the rebalancer.

| Function | Purpose | Algorithm |
|---|---|---|
| `checkBrigadeContiguity(settlements, adj)` | Detect whether a brigade's settlements form a connected graph | BFS component detection; components sorted largest-first, then by min SID |
| `wouldRemainContiguous(settlements, sidToRemove, adj)` | Guard: would removing a settlement break contiguity? | Single BFS from first remaining settlement; O(n) |
| `repairContiguity(brigadeId, settlements, hqSid, frontActive, adj)` | Keep best component, return orphans for reassignment | Score: HQ presence (1M) > front-active count (x1000) > size |

### 2.2 Corps Sector Partitioning — `corps_sector_partition.ts` (NEW, 318 lines)

Partitions faction territory and frontline into corps sectors.

| Function | Purpose | Algorithm |
|---|---|---|
| `getFormationCorpsId(formation)` | Extract corps ID from `corps_id` field or `corps:` tag | Tag parsing |
| `detectDisconnectedTerritories(faction, pc, edges)` | Find main territory vs. enclaves | Multi-component BFS on faction-restricted adjacency |
| `partitionFrontIntoCorpsSectors(state, faction, territory, edges)` | Assign settlements to corps sectors | Multi-source BFS from corps HQ seeds |
| `orderFrontMunicipalitiesForCorps(sectorSettlements, frontActive, adj, sidToMun)` | Walk frontline in encounter order | BFS within sector front-active settlements; handles disjoint segments |

### 2.3 Corps-Directed AoR Algorithm — `corps_directed_aor.ts` (NEW, 617 lines)

Top-level replacement for Voronoi BFS. Main function: `assignCorpsDirectedAoR(state, edges, settlements?)`.

**Pipeline:**
1. Identify front-active settlements (reuses `identifyFrontActiveSettlements` + `expandFrontActiveWithDepth`)
2. Detect disconnected territories (main territory + enclaves)
3. Partition main territory into corps sectors
4. Per-corps: walk front municipalities, allocate brigades sequentially
5. Each brigade starts at home municipality, extends up to 2 contiguous neighbors
6. Derive settlement-level AoR from municipality assignment
7. Validate and repair contiguity (hard invariant)

**Key sub-functions:**
- `allocateBrigadesToFrontMunicipalities()` — Phase 1: assign home mun; Phase 2: extend up to 2 neighbors preferring largest uncovered gaps
- `deriveSettlementAoR()` — Group settlements by (faction, municipality); assign brigades via BFS from HQs
- `enforceContiguity()` — Post-processing: repair discontiguous brigades, reassign orphans to nearest adjacent brigade
- `findNearestCorpsForBrigade()` — BFS fallback for unattached brigades

**Sparse coverage:** Gaps are expected at war start. Uncovered settlements remain null (militia/TO defense only). Player fills gaps by recruiting brigades tied to specific municipalities.

### 2.4 Dispatcher Refactor — `brigade_aor.ts` (MODIFIED)

`ensureBrigadeMunicipalityAssignment` refactored to thin dispatcher:
- If `state.corps_command` exists and is non-empty → `assignCorpsDirectedAoR` (Phase II normal flow)
- Else → `legacyVoronoiMunicipalityAssignment` (Phase I / tests / backward compat)

Old 250-line cascade renamed to `legacyVoronoiMunicipalityAssignment` — preserved, not deleted.

### 2.5 Contiguity Guard in Rebalance — `brigade_aor.ts` (MODIFIED)

Added `wouldRemainContiguous()` check in `rebalanceBrigadeAoR` shed phase. Before transferring a settlement from an oversized brigade, the guard verifies the donor would remain contiguous. Skips transfer if it would fragment.

### 2.6 Smooth AoR Visualization — `MapApp.ts` (MODIFIED)

Replaced per-polygon dashed-outline rendering with:

1. **Compound fill:** Single `beginPath()` with all AoR settlement polygons as subpaths, then single `fill('evenodd')` with faction color at 15% opacity. Merges adjacent polygons into one visual region.

2. **Outer boundary only:** Uses `sharedBorders` data to identify internal edges (both endpoints in AoR set). Walks each settlement's outer ring, skips internal vertices. Strokes only outer perimeter at 2.5px.

3. **Breathing glow animation:** `requestAnimationFrame` loop with sinusoidal `shadowBlur` oscillation (2–6px range, 2-second cycle). Starts when formation selected, stops when deselected.

**New helpers:** `addPolygonSubpath`, `computeAoROuterBoundary`, `getOuterRings`, `hexToRgba`, `startAoRAnimation`, `stopAoRAnimation`.

**Boundary cache:** Invalidated on formation change, AoR change, or zoom change.

### 2.7 Style Constants — `constants.ts` (MODIFIED)

Added `AOR_HIGHLIGHT` constant with fill alpha, stroke width, glow parameters, and animation cycle duration.

---

## 3. Files Modified

| File | Action | Description |
|---|---|---|
| `src/sim/phase_ii/aor_contiguity.ts` | **New** | Contiguity check, repair, wouldRemainContiguous |
| `src/sim/phase_ii/corps_sector_partition.ts` | **New** | Corps sector partitioning, enclave detection, front walk ordering |
| `src/sim/phase_ii/corps_directed_aor.ts` | **New** | Corps-directed AoR assignment pipeline |
| `src/sim/phase_ii/brigade_aor.ts` | **Modified** | Thin dispatcher + contiguity guard in rebalance |
| `src/ui/map/MapApp.ts` | **Modified** | Smooth AoR display: compound fill, outer boundary, breathing glow |
| `src/ui/map/constants.ts` | **Modified** | Added AOR_HIGHLIGHT style constants |
| `data/derived/scenario/baselines/manifest.json` | **Updated** | Baseline hashes updated for contiguity guard behavior change |

---

## 4. Design Decisions

### Corps-directed vs. Voronoi
The Voronoi BFS approach assigned AoR by proximity to brigade HQ — geographically logical but operationally meaningless. The corps-directed approach partitions the front into corps sectors, then allocates brigades sequentially along each sector's frontline. This models actual military doctrine: a corps commander assigns subordinate brigades to cover specific frontline segments.

### Sparse coverage at war start
At the start of the war, there are far fewer brigades than needed to cover the entire frontline. Not every front-active settlement will have brigade coverage — this is by design. Uncovered settlements rely on militia/TO defense (defender-absent battles in battle resolution). This creates natural recruitment urgency: the player must decide which brigades to recruit and where.

### Contiguity as hard invariant
Every brigade's settlement set must be contiguous in the adjacency graph. This is enforced at three points:
1. Initial allocation (home mun + contiguous neighbors only)
2. Settlement-level derivation (BFS from HQ within assigned municipalities)
3. Post-processing contiguity repair (orphan reassignment)

### Enclave handling
When `detectDisconnectedTerritories` finds isolated components, enclave brigades get independent local AoR assignment (same contiguous algorithm, scoped to the enclave's settlement set). Enclave brigades are excluded from main-territory corps partitioning.

### Backward compatibility
The dispatcher pattern preserves all existing behavior: tests without `corps_command` hit the legacy Voronoi path unchanged. No pipeline interface changes.

---

## 5. Verification

| Gate | Result |
|---|---|
| `npm run typecheck` | Clean |
| `npm run test:vitest` | 8 suites, 119 tests, all pass |
| `npm run canon:check` — determinism scan | Pass |
| `npm run canon:check` — baseline regression | Pass (baselines updated for contiguity guard behavior change) |

### Baseline update
The contiguity guard in `rebalanceBrigadeAoR` is an intentional behavior change — it prevents some settlement transfers that would have broken contiguity. The `baseline_ops_4w/activity_summary.json` hash changed accordingly. Baselines regenerated via `UPDATE_BASELINES=1 npx tsx tools/scenario_runner/run_baseline_regression.ts`.

---

## 6. Determinism

All new modules use `strictCompare()` for sorted iteration. No `Math.random()`, no timestamps, no non-deterministic data structures. BFS tie-breaking is canonical: earliest formation/settlement in sorted order wins. Canon determinism scan confirms no violations.

---

## 7. Architecture Summary

```
Turn Pipeline
  validate-brigade-aor step
    ensureBrigadeMunicipalityAssignment()
      ├── corps_command exists? → assignCorpsDirectedAoR()
      │     ├── detectDisconnectedTerritories()
      │     ├── partitionFrontIntoCorpsSectors()
      │     ├── allocateBrigadesToFrontMunicipalities() [per corps]
      │     ├── deriveSettlementAoR()
      │     └── enforceContiguity()
      │           ├── checkBrigadeContiguity()
      │           └── repairContiguity()
      └── else → legacyVoronoiMunicipalityAssignment()

  rebalance-brigade-aor step
    rebalanceBrigadeAoR()
      └── wouldRemainContiguous() [contiguity guard on shed]

Map Rendering
  drawBrigadeAoRHighlight()
    ├── addPolygonSubpath() [compound fill]
    ├── computeAoROuterBoundary() [cached, outer-only stroke]
    └── breathing glow animation [RAF loop, sinusoidal shadowBlur]
```
