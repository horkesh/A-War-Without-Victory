# Visible Formations on Map — Orchestrator Answer

**Date:** 2026-02-23  
**Goal:** Concise, actionable answer for “How do we add visible formations to the map?”

---

## 1. Which map(s) and what “visible formations” means

| Map | Entrypoint | What “visible formations” means |
|-----|------------|---------------------------------|
| **HoI 3D** | `map_hoi.html` | Brigade/corps **counters (sprites)** at OSID locations on the 2.5D terrain; layer toggle F4 “Formations”. |
| **2D tactical** | `tactical_map.html` (MapApp) | **NATO-style markers** (crest + symbol, posture, strength) at formation positions; Staff Map (zoom 4) shows full-detail counters. |
| **3D operational (sandbox)** | `map_operational_3d.html` | **Two-tier counters** (brigade light / corps CRT) at formation locations via `FormationSpriteLayer`; D-key data modes. |

**Scope:** “Visible formations” = counters/sprites at **brigade/corps locations** (one location per formation: `location_osid` or fallback `hq_sid` / municipality). Both HoI 3D and 2D tactical are in scope; 3D operational already shows formations.

---

## 2. Current state

### Data

- **Formation position:** `FormationView` / adapter records have `location_osid` (Phase II). Parsed in `GameStateAdapter` from `state.formations`; `location_osid` set when present (`src/ui/map/data/GameStateAdapter.ts` ~136–160).
- **Position resolution:**
  - **2D MapApp:** `getFormationPosition(f)` uses `f.location_osid` first → `this.data.settlementCentroids.get(f.location_osid)`; else `hq_sid` or municipality. Phase II: no AoR fallback (`MapApp.ts` 1427–1468).
  - **3D operational:** `FormationSpriteLayer.buildFormationLODLayer` uses `centroids.get(formation.location_osid)` then `formation.hq_sid` (`FormationSpriteLayer.ts` 534–561). Centroids come from the 3D map’s loaded settlements (canonical or operational).
  - **HoI 3D:** `HoIMapRenderer` has `centroidBySid` (populated from `operational_settlements.geojson`), keyed by **osid** and **sid** (`HoIMapRenderer.ts` 884–912), and `wgsToWorld` for world position. It does **not** expose a way to resolve OSID → world position to callers.

### Where formations already appear

- **2D tactical (MapApp):** Formations are drawn as NATO markers when a game state is loaded. Position from `getFormationPosition`; drawing in `drawFormationMarkers` and in Staff Map. Layer “formations” is toggled (default on when state loaded). See `TACTICAL_MAP_SYSTEM.md` §2 (formation markers), §8.
- **3D operational:** Formations are visible via `buildFormationLODLayer` (brigade/corps counters, LOD, stem lines). Uses `centroidWorld` and `centroids` keyed by SID/OSID from the 3D map’s geography.
- **HoI 3D:** The **layer and API exist** (`formationSprites`, `setFormations(markers)`, `layerVisibility.formations`, F4 in `MapModeToolbar`), but **no code path ever calls `setFormations`**. So no formations are shown on the HoI map today.

### Relevant types and renderer

- **HoIMapRenderer** (`src/ui/map/renderer/HoIMapRenderer.ts`):
  - `FormationMarkerInput`: `{ id, position: [x,y,z], name, faction, posture?, isCorps? }` (177–183).
  - `setFormations(markers)` (1773–1801): builds billboard sprites from markers; position in world coords.
  - Formation sprite visibility tied to `layerVisibility.formations` (1191).
- **map_hoi.ts:** Applies control, front edges, ZoC, assignable segments on state load; **does not** build or pass formation markers to the renderer.

---

## 3. Gaps

1. **HoI 3D (map_hoi.html)**  
   - Formations layer is never populated: **map_hoi never calls `renderer.setFormations(...)`**.  
   - To do that we need **formation list → world position**. The renderer has `centroidBySid` (osid/sid) and heightmap for `wgsToWorld` but does not expose “OSID → world position.” So either:
     - **Option A:** Add on the renderer something like `getWorldPositionForSettlement(osidOrSid: string): [number, number, number] | null` (using existing centroid + sampleHeight + wgsToWorld), and in map_hoi build `FormationMarkerInput[]` and call `setFormations`, or  
     - **Option B:** map_hoi loads operational_settlements + heightmap and duplicates centroid/height logic (not preferred).

2. **2D tactical (optional)**  
   - `settlementCentroids` in DataLoader are keyed by **canonical SID** only (`DataLoader.ts` 183–186). If `location_osid` is a **merged OSID** not present as a key in that map, `getFormationPosition` returns null and the formation is not drawn. So for merged operational settlements, 2D may need centroids keyed by OSID as well (or an OSID→SID mapping and use existing SID centroids).

---

## 4. Recommended approach

### HoI 3D: add formation markers (main work)

- **Owners:** Graphics Programmer (renderer position API + sprite pipeline); UI/UX or Gameplay (wire state → markers in map_hoi).
- **Steps:**
  1. **Renderer:** Add `getWorldPositionForSettlement(osidOrSid: string): [number, number, number] | null` to `HoIMapRenderer`, using `centroidBySid`, heightmap `sampleHeight`, and `wgsToWorld` (same pattern as labels/other overlays). Keep ordering deterministic (e.g. formation list sorted by id).
  2. **map_hoi:** In `applyStateJson` (or after state load when renderer is ready), build a formation list from `loaded.formations`. For each formation, resolve position: `location_osid` or `hq_sid` → `renderer.getWorldPositionForSettlement(...)`. Build `FormationMarkerInput[]` (id, position, name, faction, isCorps from kind). Call `renderer.setFormations(markers)`.
  3. Ensure the “Formations” layer (F4) is visible by default when the loaded state has formations (or leave as-is; current default is on for formations in toolbar).
  4. **Determinism:** Sort formations by id before building markers; no timestamps or random in position resolution (per napkin and determinism rules).

- **Doc/spec refs:**  
  - `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` §2 (map_hoi, formation billboard sprites, layer F4).  
  - `src/ui/map/renderer/HoIMapRenderer.ts`: `FormationMarkerInput`, `setFormations`, `centroidBySid`, `wgsToWorld`.  
  - `.agent/napkin.md` (map_hoi patterns, 3D counters determinism).

### 2D tactical

- Formations are already visible. If we want merged OSIDs to resolve on 2D, **DataLoader** (or a small adapter) should provide OSID→centroid (e.g. from operational_settlements when used, or OSID→SID and reuse SID centroids). Owner: UI/UX or Technical Architect depending on data path.

### 3D operational

- No change needed for “visible formations”; they are already shown via `FormationSpriteLayer` and `location_osid` / `hq_sid`.

---

## 5. Next single priority and handoff

- **Next single priority:** Implement **visible formation markers on the HoI 3D map**: add `getWorldPositionForSettlement` (or equivalent) on `HoIMapRenderer`, and in map_hoi build `FormationMarkerInput[]` from loaded state and call `setFormations(markers)` when state is applied.
- **Handoff:** **Graphics Programmer** for renderer position API and sprite path; **UI/UX Developer** or **Gameplay Programmer** for map_hoi state → formation markers wiring. One small convene or ticket can cover both (renderer first, then map_hoi wiring).

---

*Convene produced by Orchestrator; no canon or FORAWWV edits.*
