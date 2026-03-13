# SECTOR_MASTER — Corps Front Sector System

**Owner:** Gameplay Programmer / Technical Architect
**Updated:** 2026-03-13 (n668, 40w — Layer B sector stances IMPLEMENTED)
**Diagnostic:** `tools/sector_deep_exam.cjs`, `tools/check_sector_split.cjs`, `tools/check_sector_split2.cjs`

---

## Current State (n664)

| Metric | Value |
|---|---|
| Total sectors | 92 |
| Contiguous (strict triple-junction) | 90 |
| Bending front (under review) | 2 |
| Shared territory OSIDs (all factions) | 67 |
| Calibration | 6/6 benchmarks, 88.7% area-weighted |
| Hash | 0ca780c065365530 |

### n664 Changes (Contiguity Fix)

Three changes to ensure sectors are contiguous front **lines**:

1. **`splitNonContiguousSectors` upgraded to triple-junction adjacency** — was shared-OSID (too permissive at triple junctions). Now calls `buildEdgeAdjacency` with faction info. Correctly splits edges facing different directions at the same OSID.
2. **Shared front-edge territory** — front-edge OSIDs can belong to multiple sectors. Rear territory exclusive (BFS first-claim). Fixes single-OSID interruption between adjacent sectors.
3. **Need-based brigade assignment at shared OSIDs** — `frontOsidToSectorIndices` multi-mapping. Brigade at shared front OSID assigned to neediest same-corps sector.

### 2 Residual Bending Front Sectors

Both in Doboj/Maglaj area — friendly polygon borders two non-adjacent hostile polygons:
- `arbih_3rd_corps:1` (13 edges, 2 sub-segments): `kosova_2` faces both `boljanic_2` and `jablanica`
- `vrs_1st_krajina:7` (12 edges, 1 sub-segment): `donja_bocinja_2` faces both `lijesnica` and `cinovici`

Status: under review pending map inspection. Geographically continuous but no triple-junction link.

---

## Architecture

### Pipeline (`corps_front_sectors.ts`)

```
Step 1:  findSubSegments — group front edges by triple-junction connectivity
Step 2:  mergeUndersizedSubSegments — merge segments < MIN_SECTOR_EDGES
Step 3:  splitOversizedSubSegments — split segments > MAX_SECTOR_EDGES at midpoint
Step 3b: buildSectorFromSubSegments — create CorpsFrontSector objects
Step 4:  splitOversized sectors (> MAX_SECTOR_BRIGADES at 4+ edges)
Step 4b: splitNonContiguousSectors — triple-junction connectivity split (n664, was shared-OSID n620)
Step 5:  Filter ghost/orphan sectors (0 front edges)
```

Pre-pipeline (faction-wide in `buildFactionSectors`):
```
Step 2:  mapOsidsToCorps — BFS from brigade home_osids to assign territory to corps
Step 3:  partitionFrontEdges — assign each front edge to its friendly OSID's corps
Step 3b: consolidateCrossCorpsFronts — merge minority-corps edges in connected components
         Protected: brigade presence + osidToCorps mapping (n624)
Step 3c: consolidateIsolatedCorpsPockets — reassign isolated edge pockets to neighbors
```

Post-pipeline (faction-wide in `buildFactionSectors`):
```
Step 5:  assignTerritoryVoronoi — assign territory OSIDs to sectors (respects osidToCorps)
Step 6:  classifyBrigadesByTerritory — assign brigades (Phase 1 front, 2a home-mun, 2b corps pool)
Step 7:  ensureMinimumSectorCoverage — transfer brigades to empty sectors
Step 8:  deduplicateBrigadesAcrossSectors — remove cross-sector duplicates
```

### Key Algorithms

**Triple-junction connectivity** (`buildEdgeAdjacency`): Used for sub-segment construction (Steps 1-3). Two front edges connect iff they meet at a polygon triple junction:
- Case A: same friendly OSID, hostile OSIDs adjacent
- Case B: same hostile OSID, friendly OSIDs adjacent
Uses `sharedBoundaryAdj` when available, falls back to full `osidAdjacency`.

**Triple-junction contiguity** (`splitNonContiguousSectors`, upgraded n664): Used for contiguity enforcement (Step 4b). Now uses the SAME triple-junction adjacency as sub-segment construction (via `buildEdgeAdjacency` with faction info). Previously used shared-OSID connectivity (n620), which was too permissive — connected edges facing different directions at the same polygon triple junction. The upgrade correctly splits disconnected fronts (Zavidovići↔Kakanj) while preserving connected fronts.

**Shared front-edge territory** (`assignTerritoryVoronoi`, n664): Front-edge OSIDs (on `sub_segments.friendly_osids`) can belong to multiple sectors simultaneously. Rear territory remains exclusive (BFS first-claim). This prevents single-OSID sectors interrupting contiguous fronts at sector boundaries. Brigade assignment at shared OSIDs uses need-based tiebreaking (neediest same-corps sector).

**Cross-corps consolidation** (`consolidateCrossCorpsFronts`): Finds connected components of front edges across corps boundaries. Assigns minority-corps edges to majority corps. **Gotcha (n624):** Without osidToCorps protection, a corps with a large front (Herzegovina) absorbs a smaller connected corps's edges (SRK Sarajevo) via majority rule — even when the BFS home-seed mapping correctly assigns territory to the smaller corps. Two protections prevent this: (1) brigade presence at OSID, (2) osidToCorps mapping from home-based BFS.

**Brigade assignment** (`classifyBrigadesByTerritory`):
- Phase 1: Brigades on sector front OSIDs → assigned to that sector
- Phase 2a: Home-municipality affinity — brigades near their home OSID
- Phase 2b: Corps distributes remaining by need (proportional to edges)
- Connected-component reachability guard (n598): brigade must be able to reach sector through friendly territory

### Constants (`corps_front_sectors_constants.ts`)

| Constant | Value | Purpose |
|---|---|---|
| MAX_SECTOR_EDGES | 25 | Split threshold |
| MIN_SECTOR_EDGES | 5 | Merge threshold |
| MAX_SECTOR_BRIGADES | 12 | Brigade-based split |

---

## Sector Defense Model

### Current: Distance-Weighted Reactive Defense + Sector Stances (n668)

**Full plan:** `docs/40_reports/20260313_DISTANCE_WEIGHTED_REACTIVE_DEFENSE_PLAN.md`

**Layer A (IMPLEMENTED, n666-n667):** Per-brigade reserve contribution weighted by BFS hop distance (decay `0.60^hops`, max 5) + home-municipality motivation (1.3×). Casualty distribution proportional to same weights (replaces 50/50 split). Files: `combat_math.ts`, `attack_resolution_osid.ts`, `combat_predictor.ts`.

**Layer B (IMPLEMENTED, n668):** Five independent sector stances with combat modifiers:

| Stance | Reactive Bonus | Entrenchment Rate | Bot Trigger |
|--------|---------------|-------------------|-------------|
| Fortify | 1.30× | 2.0× | threat > 2.0 + few brigades |
| Defend | 1.15× | 1.2× | default, threat > 1.5 |
| Elastic | 1.00× | 0.8× | staging operation |
| Active Defense | 0.85× | 0.6× | threat < 0.5 + offensive targets |
| Screening | 0.50× | 0.0× | cold front, threat < 0.3 + no targets |

Corps stance ceiling: offensive can't fortify, defensive can't active_defense, balanced allows all, reorganize allows fortify/defend/screening. Player overrides persist (`stance_source: 'player'`).

Bot AI (`evaluateSectorStances` in `bot_corps_directives.ts`): evaluates per-sector based on threat_ratio, cold front status, staging operations, offensive targets. Called in pipeline after sector construction, before directive generation.

Combat integration: reactive bonus multiplies Layer A effective reserves; entrenchment rate modifies per-turn growth in `brigade_movement_orders.ts`.

Files: `game_state.ts` (types), `combat_math.ts` (constants), `bot_corps_directives.ts` (bot AI), `sector_stance_orders.ts` (player orders rework), `attack_resolution_osid.ts` + `combat_predictor.ts` (reactive bonus), `brigade_movement_orders.ts` (entrenchment rate).

**Layer C (PENDING):** Player visibility — defense heat map, enhanced battle reports, sector stance controls, home defense indicators.

**Calibration:** n668 — 89.0% area-weighted, 6/6 benchmarks, RS w40 0.519, RS delta −22. Zero regression from Layer B.

---

## Corps Sector Geography (n623 w40)

### RBiH

| Corps | Sectors | Edges | Brigades | Key municipalities |
|---|---|---|---|---|
| 1st Corps | 5 | 73 | 22 | Sarajevo, Gorazde, Visegrad, Pale |
| 2nd Corps | 18 | 142 | 32 | Tuzla corridor, Srebrenica, Zvornik, Doboj |
| 3rd Corps | 6 | 75 | 19 | Zenica, Travnik, Jajce, Tesanj |
| 4th Corps | 2 | 29 | 3 | Konjic, Jablanica, Hadzici |
| 5th Corps | 1 | 13 | 4 | Bihac pocket |

### RS

| Corps | Sectors | Edges | Brigades | Key municipalities |
|---|---|---|---|---|
| 1st Krajina | 12 | 107 | 35 | Doboj, Teslic, Kotor Varos, Glamoc |
| 2nd Krajina | 1 | 13 | 8 | Bihac perimeter, B. Petrovac |
| Drina | 5 | 63 | 8 | Srebrenica encirclement, Vlasenica |
| East Bosnian | 8 | 65 | 10 | Posavina, Bijeljina, Brcko |
| Herzegovina | 5 | 62 | 5 | Konjic, Trebinje, Bileca, Trnovo |
| Sarajevo-Romanija | 7 | 75 | 5 | Sarajevo siege, Pale, Han Pijesak, Ilijas |

### HRHB

| Corps | Sectors | Edges | Brigades | Key municipalities |
|---|---|---|---|---|
| Central Bosnia | 4 | 10 | 2 | Zepce, Vares, Jajce |
| Northwest Bosnia | 4 | 16 | 5 | Posavina (Orasje, B. Brod) |
| SE Herzegovina | 2 | 25 | 14 | Mostar, Capljina, Stolac |
| Tomislavgrad | 1 | 11 | 3 | Livno, Duvno, Prozor |

---

## Open Issues

### P2: 10 empty sectors (front edges, 0 brigades)

| Sector | Edges | Corps | Location |
|---|---|---|---|
| arbih_3rd_corps:3 | 7 | ARBiH 3rd | Jajce / Sipovo |
| arbih_3rd_corps:9 | 7 | ARBiH 3rd | Maglaj / Tesanj |
| arbih_4th_corps:2 | 6 | ARBiH 4th | Konjic |
| arbih_4th_corps:3 | 4 | ARBiH 4th | Mostar |
| hvo_central_bosnia:1 | 3 | HVO CB | Jajce |
| hvo_central_bosnia:2 | 4 | HVO CB | Skender Vakuf |
| hvo_central_bosnia:3 | 2 | HVO CB | Konjic |
| hvo_central_bosnia:4 | 1 | HVO CB | Kresevo |
| hvo_central_bosnia:5 | 1 | HVO CB | Vares |
| vrs_sarajevo_romanija:3 | 1 | VRS SRK | Sokolac |

**Impact:** Undefended frontline positions. A real commander would never leave a sector unmanned.
**Root cause:** `ensureMinimumSectorCoverage` can only transfer brigades from sectors with surplus. If no corps brigade has surplus within reachable territory, sector stays empty.
**Analysis:** HVO Central Bosnia has 5 empty sectors — only 2 brigades for 7 sectors (12 total edges). These are tiny isolated HVO enclaves that can't all be manned. ARBiH 3rd/4th Corps are thin in secondary areas. VRS SRK:3 is a 1-edge fragment. These are structural — factions don't have enough troops to man every sector.

### P2: 12 unassigned brigades with personnel

| Brigade | Corps | Location | Personnel |
|---|---|---|---|
| RS 3rd Banja Luka Light | VRS 1st Krajina | Banja Luka | 2,800 |
| RS 1st Guards Motorized | VRS Main Staff | Bileca | 1,741 |
| RS 1st Gradiska Light | VRS 1st Krajina | Teslic | 1,612 |
| RS 1st Celinac Light | VRS 1st Krajina | Celinac | 1,609 |
| ARBiH 283rd East Bosnian | ARBiH 2nd Corps | Srebrenica | 1,481 |
| RS 1st Prnjavor Light | VRS 1st Krajina | Celinac | 1,382 |
| RS 1st Srbac Light | VRS 1st Krajina | Teslic | 1,227 |
| RS 6th Sanske Infantry | VRS 1st Krajina | Banja Luka | 1,227 |
| RS 65th Protection | VRS Main Staff | Han Pijesak | 1,200 |
| RS 5th Kozara Light | VRS 1st Krajina | Banja Luka | 960 |
| RS 22nd Krajina Infantry | VRS 1st Krajina | Mrkonjic Grad | 954 |
| RS 2nd Teslic Light | VRS 1st Krajina | Teslic | 910 |

**Analysis:**
- **RS Main Staff (2 brigades)**: Army-level assets. Not assigned to corps → no sector. Correct behavior — strategic reserves.
- **VRS 1st Krajina (8 brigades, 11,771 pers)**: Deep rear concentration in Banja Luka/Celinac/Teslic. These OSIDs are far from any front edge → no sector covers them. 1KK already has 36 brigades and 12 sectors — these are genuine reserves.
- **ARBiH 283rd at Srebrenica**: Enclave edge case — possibly a sector assignment reachability issue.

### P3: Density imbalance (33:1 ratio)

**Densest:** ARBiH 3rd Corps sector:6 — 5 brigades / 3 edges = 1.67
**Thinnest manned:** VRS Herzegovina sector:3 — 1 brigade / 19 edges = 0.05

Density range improved from 100:1 (n623) to 33:1 (n624) after Herzegovina/SRK fix redistributed edges. Still significant but much less extreme.

---

## Fixed Issues

### VRS Herzegovina stealing Sarajevo siege perimeter (n624)

**Was:** Herzegovina Corps owned the Sarajevo siege ring (Centar, Stari Grad, Novo Sarajevo, Ilidza, Vogosca) — should be Sarajevo-Romanija Corps (SRK). SRK was pushed to Ilijas/Pale periphery.
**Root cause:** `consolidateCrossCorpsFronts` (Step 3b) finds connected components of front edges across corps boundaries and reassigns minority edges to the majority corps. The Sarajevo siege front connected to Herzegovina's larger southern front through Trnovo, forming one component. Herzegovina had more edges → majority rule gave it all of Sarajevo.
**Gotcha:** `mapOsidsToCorps` BFS correctly assigned Sarajevo OSIDs to SRK (home_osid seeds in Ilidza/Ilijas). But `consolidateCrossCorpsFronts` overrode this by reassigning SRK's minority edges to Herzegovina. The corps-territory BFS was right, the consolidation was wrong.
**Fix:** Added `osidToCorps` protection to `consolidateCrossCorpsFronts`. Edges whose friendly OSID is mapped to the minority corps by the home-based BFS are now protected from consolidation (same as brigade-presence protection). Applied to both the connected-component pass and the hostile-OSID coherence pass.
**Result:** SRK now owns 7 sectors / 75 edges in Sarajevo area (siege ring, Ilijas, Pale). Herzegovina correctly covers only Konjic/Trnovo southern approaches.
**Verification:** 6/6 benchmarks pass, 83.2% area-weighted, 524 tests pass.

### Srebrenica-Cerska disconnected sector (n620)

**Was:** `sector:arbih_2nd_corps:4` spanned 23 edges across both Srebrenica (9 friendly OSIDs in srebrenica/bratunac) and Cerska/Vlasenica (4 friendly OSIDs in vlasenica). These fronts are physically disconnected — connected only through friendly territory behind the front, not through continuous front-line edges.
**Fix:** `splitNonContiguousSectors` changed from triple-junction connectivity to shared-OSID connectivity. Two front edges are adjacent iff they share at least one OSID endpoint.
**Result:** Srebrenica and Cerska correctly in separate sectors. `bukovica_gornja` (Vlasenica municipality, on the Sreb-Cerska boundary) correctly stays in Srebrenica sector because it shares hostile OSID `bostahovine_2` with Srebrenica-area edges.
**Verification:** Contiguity check shows ALL SECTORS CONTIGUOUS (0 violations).

### parseEdges missing type/min_dist (n620)

**Was:** `settlements_parse.ts` `parseEdges()` only copied `{a, b}` — `type` and `min_dist` fields from the operational contact graph were silently dropped.
**Fix:** Added `type` and `min_dist` field copying to `EdgeRecord` interface and `parseEdges()`.
**Impact:** Independent correctness fix. Enables future use of edge metadata in sector algorithms.

---

## Diagnostic Tools

| Tool | Purpose |
|---|---|
| `tools/sector_deep_exam.cjs` | Full sector audit (contiguity, density, assignments, geography) |
| `tools/check_2nd_corps_sectors.cjs` | 2nd Corps sector listing with SREB/CERSKA tags |
| `tools/check_sreb_cerska.cjs` | Srebrenica/Cerska split verification |
| `tools/check_real_unassigned2.cjs` | Unassigned brigades + real cross-corps check |
| `tools/insanity_check_n620.cjs` | War-or-game insanity check |
| `tools/diag_vrs_sarajevo.cjs` | VRS corps Sarajevo sector/brigade diagnostics |
| `tools/diag_bfs_seeds.cjs` | BFS seed tracing for corps territory mapping |

---

## History

| Run | Date | Change | Sectors | Area% |
|---|---|---|---|---|
| n532 | 2026-03-10 | Triple-junction connectivity | 77 | 87.0% |
| n598 | 2026-03-11 | Connected component brigade assignment | ~77 | 86.5% |
| n620 | 2026-03-12 | Shared-OSID sector split | 78 | 82.8% |
| n623 | 2026-03-12 | Fresh run (same code as n620) | 78 | 83.3% |
| n624 | 2026-03-12 | osidToCorps protection in consolidation (Herzegovina/Sarajevo fix) | 85 | 83.2% |
| n653 | 2026-03-12 | Uncontested occupation + Kotor Varos overrides | ~85 | 87.9% |
| n664 | 2026-03-13 | Triple-junction split + shared front-edge territory + need-based assignment | 92 | 88.7% |
| n666 | 2026-03-13 | Layer A: distance-weighted reactive defense | 92 | 89.1% |
| n667 | 2026-03-13 | Layer A tuning: home bonus 1.5→1.3 | 92 | 89.3% |
| n668 | 2026-03-13 | Layer B: independent sector stances (5 stances, bot AI, combat integration) | 92 | 89.0% |
