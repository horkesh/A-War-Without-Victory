# GUI Phase 3 Expansion: Sector Visualization, Bidirectional Sync, and Density Mode

**Date:** 2026-03-02
**Author:** Orchestrator + UI/UX Developer
**Reference Plan:** [GUI Phase 3 Remainder Plan](../20260301_GUI_PHASE3_REMAINDER_PLAN.md)
**Reference Spec:** [AWWV_GUI_ARCHITECTURE_REWORK_v2.md](../../20_engineering/AWWV_GUI_ARCHITECTURE_REWORK_v2.md) §5.2, §8

---

## Summary

- Implemented 5 phases (A–E) of the GUI Phase 3 expansion plan, making the map the primary command interface for corps sector management.
- Fixed the broken "FRONT: ? — ?" tooltip, added sector territory visualization on the map, wired bidirectional brigade ↔ sector selection, created a CorpsDetail panel, and added a density map mode.
- **10 files total**: 7 modified, 3 created. **+711 lines** (+396 in modified files, +315 in new files). All typechecks pass.

---

## Phase A — Tooltip Fix + Enriched Front Data

**Problem:** Front edge tooltips displayed "FRONT: ? — ?" because hover feature edge IDs include a faction suffix (e.g. `op:a:b__op:c:d:RS`) but canonical `frontEdgesOsid` entries use bare IDs (`op:a:b__op:c:d`). Every lookup failed.

**Fix:** Created shared utility `stripFactionSuffix()` in `sectorUtils.ts`. Applied to all edge lookups in `Tooltip.tsx`: `frontEdgesOsid.find()`, `frontPressureByEdge[]`, and `assignableFrontSegments.find()`.

**Enrichments added to front tooltip:**
- Sector name line (e.g. "Sector: 2nd Krajina Corps – Banja Luka, Prijedor")
- Color-coded density badge: red "THIN" (< 0.5), amber "NORMAL" (0.5–1.0), green "DENSE" (> 1.0)
- Color-coded threat ratio: green (< 0.8), amber (0.8–1.5), red (> 1.5)

**Files:**
| File | Lines | Change |
|------|-------|--------|
| `src/ui/map/utils/sectorUtils.ts` | +65 (new) | `stripFactionSuffix()`, `extractFactionFromEdgeId()`, `collectSectorFriendlyOsids()` |
| `src/ui/map/components/Tooltip.tsx` | +60 | Strip suffix before lookup; sector name, density badge, threat badge in tooltip |

---

## Phase B — Sector Visualization on Map

**Core feature:** When a sector is selected, its territory fills on the map and its front edges glow.

**Technical approach:** No new GeoJSON source needed — reuses existing `osid-control` source with dynamic `setFilter()` for territory fill, and filters `front-edges-hover` features by `sector_id` property for edge glow.

**Implementation:**
1. **`sector-fill` layer** (type `fill`) on `osid-control` source. Default filter: `['==', ['get', 'osid'], '__none__']` (hidden). On sector select: `setFilter('sector-fill', ['in', ['get', 'osid'], ['literal', friendlyOsids]])`. Paint: semi-transparent corps color (~15% opacity).
2. **`sector-edge-glow-pos` / `sector-edge-glow-neg`** (type `line`) on `front-edges-hover-pos/neg` sources. Filtered by `['==', ['get', 'sector_id'], selectedSectorId]`. Paint: gold/white glow, line-width 5.
3. **`sectorsVisible` toggle** added to store and MapModeToolbar.

**Files:**
| File | Lines | Change |
|------|-------|--------|
| `src/ui/map/store/gameStore.ts` | +5 | `sectorsVisible` boolean + setter |
| `src/ui/map/components/MapModeToolbar.tsx` | +8 | "Sectors" checkbox in layer toggles |
| `src/ui/map/map/MapContainer.tsx` | +170 | `ensureSectorLayers()`, `getSectorFillColor()`, `applySectorHighlight()` useEffect |

---

## Phase C — Brigade ↔ Sector Bidirectional Sync

**The interaction loop:** Click brigade → see its sector on map + sector panel. Click sector → see brigade rings. Click brigade in sector panel → formation detail.

### C.1 — Brigade click → sector on map
In `OOBSidebar`, `selectBrigadeWithSector(brigadeId)` searches `corpsFrontSectors` for the sector containing that brigade, then uses `useGameStore.setState()` to atomically set both `selectedFormationId` + `selectedCorpsFrontSectorId`. This bypasses the normal mutual exclusion (where `setSelectedCorpsFrontSectorId` clears `selectedFormationId`).

### C.2 — Sector select → sidebar sync
A `useEffect` watching `selectedCorpsFrontSectorId` auto-expands the "Sectors" accordion section and scrolls to the matching `[data-sector-id]` element using `scrollIntoView({ block: 'nearest' })`.

### C.3 — Brigade markers highlight in sector
A `sector-brigade-rings` circle layer on the `formations` source, filtered to formation IDs in the selected sector's `assigned_brigade_ids ∪ reserve_brigade_ids`. Paint: corps-colored ring (circle-stroke-width 3).

### C.5 — CorpsFrontPanel brigade interaction
- Brigade names become clickable `<button>` elements: `onClick → setSelectedFormationId`, `onMouseEnter → setHoveredOsids([f.location_osid])`
- `DensityBadge` component: red (< 0.5), amber (0.5–1.0), green (> 1.0)
- `ThreatBadge` component: green (< 0.8), amber (0.8–1.5), red (> 1.5)
- Panel self-hides when `selectedFormationId` is set (formation detail takes priority)

**Files:**
| File | Lines | Change |
|------|-------|--------|
| `src/ui/map/components/OOBSidebar.tsx` | +49 | `selectBrigadeWithSector()`, auto-expand useEffect, sector scroll, corps header click |
| `src/ui/map/components/CorpsFrontPanel.tsx` | +46 | Clickable brigades, hover OSID highlight, DensityBadge, ThreatBadge, panel priority |
| `src/ui/map/map/MapContainer.tsx` | (included in Phase B total) | `sector-brigade-rings` layer creation and filtering |

---

## Phase D — CorpsDetail Panel

New component showing corps-level information when a corps header is clicked in the OOB sidebar.

**Content:**
- Corps identity: name, faction (colored), stance, exhaustion
- Metrics: personnel total, brigade count, sector count, OG slots
- Sectors list (clickable → sector highlight on map)
- Active operations with phase badges (execution/planning/recovery)
- Subordinate brigades list (clickable → formation detail, hover → OSID highlight)

**Selection hierarchy:** Formation > Sector > Corps. CorpsDetail self-hides when a formation or sector is selected (higher-priority panels take precedence).

**Store addition:** `selectedCorpsId: string | null` with `setSelectedCorpsId()` that clears `selectedOsid`, `selectedFormationId`, and `selectedCorpsFrontSectorId` (mutual exclusion).

**Skipped from plan:** ArmyDetail (low priority — OOB sidebar doesn't group by army currently), Minimap (deferred to Phase 4), MovementPreview (deferred to Phase 4).

**Files:**
| File | Lines | Change |
|------|-------|--------|
| `src/ui/map/components/CorpsDetail.tsx` | +190 (new) | Full corps detail panel |
| `src/ui/map/store/gameStore.ts` | +10 | `selectedCorpsId`, setter, mutual exclusion |
| `src/ui/map/App.tsx` | +2 | Import + render CorpsDetail in panel stack |

---

## Phase E — Density Map Mode

Added `'density'` to the `MapMode` union. When active, front-adjacent OSIDs are colored by their sector's density value:
- **Red** (thin, density < 0.5)
- **Amber** (normal, 0.5–1.0)
- **Green** (dense, > 1.0)

**Implementation:** `buildDensityGeoJSON()` uses `collectSectorFriendlyOsids()` to map each OSID to its sector's density value. The builder produces a FeatureCollection with `density_class` property. A dedicated `osid-density` source + `osid-density-fill` layer renders the colors with a `match` expression.

**Files:**
| File | Lines | Change |
|------|-------|--------|
| `src/ui/map/map/builders/buildDensityGeoJSON.ts` | +60 (new) | Density GeoJSON builder |
| `src/ui/map/map/MapContainer.tsx` | (included in Phase B total) | Density source/layer creation, visibility toggling |
| `src/ui/map/components/MapModeToolbar.tsx` | +4 | "Density" button in map mode list |

---

## Complete File Inventory

### New Files (3)
| File | Lines | Purpose |
|------|-------|---------|
| `src/ui/map/utils/sectorUtils.ts` | 65 | Shared sector utilities: `stripFactionSuffix`, `extractFactionFromEdgeId`, `collectSectorFriendlyOsids` |
| `src/ui/map/components/CorpsDetail.tsx` | 190 | Corps detail panel (Phase D) |
| `src/ui/map/map/builders/buildDensityGeoJSON.ts` | 60 | Density map mode GeoJSON builder (Phase E) |

### Modified Files (7)
| File | Delta | Phases |
|------|-------|--------|
| `src/ui/map/map/MapContainer.tsx` | +236 | B, C, E — sector layers, brigade rings, density source/layer |
| `src/ui/map/components/Tooltip.tsx` | +60 | A — strip suffix, sector name, density/threat badges |
| `src/ui/map/components/OOBSidebar.tsx` | +49 | C — brigade→sector selection, auto-expand, corps header click |
| `src/ui/map/components/CorpsFrontPanel.tsx` | +46 | C — clickable brigades, badges, panel priority |
| `src/ui/map/store/gameStore.ts` | +15 | B, D, E — sectorsVisible, selectedCorpsId, density MapMode |
| `src/ui/map/components/MapModeToolbar.tsx` | +12 | B, E — sectors toggle, density button |
| `src/ui/map/App.tsx` | +2 | D — render CorpsDetail |

**Total:** +396 lines modified, +315 lines new = **+711 lines**

---

## Technical Decisions

1. **No new GeoJSON source for sector fill.** Reusing `osid-control` with dynamic `setFilter()` avoids duplicating geometry and keeps memory usage flat. The `osid` property on control features is the join key.

2. **`sector_id` property on front-edges-hover features for edge glow.** The front-edges-hover GeoJSON builder already includes `sector_id` per feature — filtering by this property is simpler and more reliable than `setFeatureState()` or matching faction-suffixed edge IDs.

3. **Atomic `useGameStore.setState()` for brigade+sector selection.** The store's individual setters have mutual exclusion (e.g. `setSelectedCorpsFrontSectorId` clears `selectedFormationId`). When clicking a brigade should show both the formation and its sector, we bypass this with a single `setState()` call setting both values atomically.

4. **Panel self-hiding via priority chain.** Each panel component checks for higher-priority selections and returns `null`. This avoids centralized panel-switching logic: `FormationDetail` > `CorpsFrontPanel` > `CorpsDetail` > `SelectionPanel`.

5. **`collectSectorFriendlyOsids()` as shared utility.** Used by Phase A (tooltip sector lookup), Phase B (sector fill), Phase C (brigade rings), and Phase E (density mode). Single source of truth for "which OSIDs belong to this sector's faction side."

---

## Wargame Patterns Applied

| Source | Pattern | Application |
|--------|---------|-------------|
| HoI4 | Click division → see assignment area | Brigade click → sector fill on map |
| AGEOD | Military district fills + bidirectional sidebar sync | Sector territory fill + auto-scroll sidebar |
| Grigsby WitE2 | Hierarchical click-through tree | Brigade → Sector → Corps chain |
| Unity of Command | Clean density/threat indicators on sectors | Color-coded badges in CorpsFrontPanel |

---

## Layer Ordering (updated)

```
osid-control-fill → sector-fill → osid-density-fill → faction-border-glow →
front-line-base → front-line-teeth →
sector-edge-glow-pos/neg → sector-brigade-rings →
formation-markers → formation-labels →
front-edges-hover → front-edges-highlight →
sidebar-hover-outline → order-arrows
```

---

## Known Issues

1. **~~Geography layer missing.~~** **RESOLVED (2026-03-02):** `git lfs pull` restored real tile data. Style reordered + 3 new layers added. See [20260302_GEOGRAPHY_LAYER_REINTRODUCTION_PMTILES.md](20260302_GEOGRAPHY_LAYER_REINTRODUCTION_PMTILES.md).

2. **Phase D partial.** ArmyDetail, Minimap, and MovementPreview were deferred (lower priority items from the plan). These remain in the backlog per [20260301_GUI_PHASE3_REMAINDER_PLAN.md](../20260301_GUI_PHASE3_REMAINDER_PLAN.md).

3. **No runtime verification.** All changes typecheck clean, but visual verification requires `npm run dev:map` with a loaded save file. Recommend manual QA pass.

---

## Verification

- `npx tsc --noEmit` (map tsconfig): **PASS** — verified after each phase and final
- `npx tsc --noEmit` (project root): **PASS** — verified at end
- No new dependencies added
- No simulation code touched (GUI-only changes)

---

## Next Steps

1. **Manual QA pass**: `npm run dev:map`, load `final_save.json`, verify all interactions
2. **Geography layer**: Investigate tile pipeline (Phase 0) to populate PMTiles with real terrain/road data
3. **Phase D remainder**: ArmyDetail panel, Minimap (second MapLibre instance), MovementPreview (dashed arrow on hover)
4. **Phase 4 (IPC)**: Wire staged orders to Electron backend for turn execution
5. **Commit**: Stage all 10 files and commit GUI Phase 3 expansion work
