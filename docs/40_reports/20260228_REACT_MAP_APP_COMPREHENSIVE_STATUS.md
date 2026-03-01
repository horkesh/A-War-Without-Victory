# React Map App — Comprehensive Status Report for External Review

**Date:** 28 February 2026  
**Purpose:** Single reference for an outside expert to verify what has been implemented and what remains for the canonical AWWV GUI (React + MapLibre map app).  
**Audience:** External reviewer, product owner, or integration lead  
**Reference specification:** [AWWV_GUI_ARCHITECTURE_REWORK_v2.md](../20_engineering/AWWV_GUI_ARCHITECTURE_REWORK_v2.md) (hereafter “the v2 doc”)  
**Source of truth:** The React + MapLibre map application in `src/ui/map/` is the **canonical GUI**. All new GUI work is to be applied there. Legacy HoI 3D and other archived renderers are out of scope.

---

## 1. Executive summary

The v2 doc defines a new GUI architecture: one map renderer (MapLibre GL JS), React + Tailwind + Zustand, and a migration plan in five phases (Phase 0: tile pipeline; Phase 1: scaffold + map; Phase 2: game state; Phase 3: UI panels; Phase 4: desktop integration; Phase 5: polish).  

**Implemented:** Phases 1 and 2 are complete. A substantial part of Phase 3 is complete (layout, settlement panel, formation panel, OOB sidebar, status strip, OSID humanization, load save, map interactions).  
**Not implemented:** Phase 0 (tile generation automation), remainder of Phase 3 (map overlays, corps/army detail panels, orders UI, keyboard shortcuts), Phase 4 (IPC/Electron), Phase 5 (polish, ZoC, modals, replay).

---

## 2. PART A — What has been implemented

### 2.1 Phase 1 — Scaffold and map

| v2 doc requirement | Status | Implementation notes |
|-------------------|--------|----------------------|
| Vite + React + TypeScript in `src/ui/map/` | Done | `vite.config.ts`, `main.tsx`, `App.tsx`, `tsconfig.json` |
| Dependencies: react, react-dom, maplibre-gl, pmtiles, zustand, tailwindcss | Done | `package.json`; Tailwind via `tailwind.config.ts`, `postcss.config.ts`, `styles/globals.css` |
| `awwv_map_style.json` with base layers | Done | `map/awwv_map_style.json` — sources/layers for base map, OSID control, front lines, formations, order arrows |
| `MapContainer.tsx` wrapping MapLibre | Done | `map/MapContainer.tsx` — creates map, registers PMTiles protocol, loads operational settlements + political control, builds and sets GeoJSON for control, front lines, formations, order arrows when state is available |
| OSID WGS84 GeoJSON as source, faction colors | Done | `operational_settlements.geojson` loaded via `DataLoader.loadOperationalSettlements()`; control fill from `buildControlGeoJSON()`; style drives fill-color by controller |
| Serve PMTiles locally | Done | `pmtiles` protocol handler; style URLs rewritten to `pmtiles://${origin}/` for base tiles |
| Verify: terrain, roads, OSID polygons, smooth zoom | Done | Map shows Bosnia; OSID polygons; navigation (pan/zoom). Base map content depends on style/tile assets. |
| OSM tile schema | Note | OSM tiles use Protomaps basemap v4 schema, NOT OpenMapTiles. Key differences: property is `kind` (not `pmap:kind`); road kind values are `highway`, `major_road`, `medium_road`, `minor_road`, `other`; water source-layer contains both polygons and lines (must filter by geometry-type); layer names are `roads`, `water`, `landuse`, `boundaries`, `places`. Anyone editing `awwv_map_style.json` must use v4 property names. Reference: https://docs.protomaps.com/basemaps/layers |

**Acceptance (v2 §8 Phase 1):** The app runs with `npm run dev:map`; MapLibre renders the map with OSID control layer; user can pan and zoom.

---

### 2.2 Phase 2 — Game state integration

| v2 doc requirement | Status | Implementation notes |
|-------------------|--------|----------------------|
| Migrate `GameStateAdapter.ts` and `DataLoader.ts` | Done | `data/GameStateAdapter.ts` (parseGameState), `data/DataLoader.ts` (loadOperationalSettlements, loadOperationalPoliticalControl, loadLatestRunSave) |
| Zustand store with game state slice | Done | `store/gameStore.ts`: `loadedGameState`, `loadSave(json)`, `selectedOsid`, `selectedFormationId`, `osidDisplayNames`, `setOsidDisplayNames`; selection clears the other (OSID vs formation) |
| Update GeoJSON sources when state changes | Done | In `MapContainer.tsx`, a `useEffect` depends on `loadedGameState` and `mapReady`; (re)builds control, front lines, formations, order arrows and calls `setData()` on the MapLibre sources; polls until sources exist if needed |
| Build GeoJSON builders (control, front lines, formations, orders) | Done | `map/builders/buildControlGeoJSON.ts`, `buildFrontLinesGeoJSON.ts`, `buildFormationsGeoJSON.ts`, `buildOrderArrowsGeoJSON.ts`; helpers: `geojsonLookup.ts`, `formationIconId.ts`, `resolveFormationLocationOsid.ts`, `generateFactionBorders.ts` |
| Generate NATO sprite atlas | Done | `map/formationIcons.ts` (ensureFormationIcons); formation icons registered and used in formations layer |
| Wire "Load Save" → parse → display | Done | TopToolbar: "Load Save" (file picker) and "Load Latest" (fetch); `loadSave` parses via GameStateAdapter and updates store; map reacts to `loadedGameState` |

**Acceptance (v2 §8 Phase 2):** Loading a save file (or "Load Latest") shows formations, front lines, and order arrows on the map at correct positions.

---

### 2.3 Phase 3 (partial) — UI panels and layout

| v2 doc requirement | Status | Implementation notes |
|-------------------|--------|----------------------|
| AppShell | Done | `App.tsx` composes full-screen layout: MapContainer, TopToolbar, OOBSidebar, SelectionPanel, FormationDetail, BottomStatusStrip (no separate AppShell component; layout is in App) |
| TopToolbar | Done | `components/TopToolbar.tsx` — AWWV label, Load Save (file), Load Latest, loaded state label (save name + formation count) |
| BottomStatusStrip | Done | `components/BottomStatusStrip.tsx` — one-line summary: selected OSID (humanized), controller, formation count; or "No selection" / "load a save" message |
| SelectionPanel (click OSID → settlement details) | Done | `components/SelectionPanel.tsx` — title "Settlement Info"; shows humanized OSID name (with raw in `title`); controller, status; list of formations at OSID (up to 8 + "N more"); close button; only visible when `selectedOsid` is set |
| OOBSidebar with CorpsCard / BrigadeRow | Done | `components/OOBSidebar.tsx` — left sidebar; groups formations by faction then by `corps_id`; uses `CorpsCard` and `BrigadeRow`; "Order of battle" header; "Load a save to see order of battle" when no state; collapse per faction. `CorpsCard.tsx`, `BrigadeRow.tsx` — corps header + list of brigade rows (name, strength bar, fatigue, status). Data from `loadedGameState.formations` (real data, not mock in app; mock only in Storybook). |
| FormationDetail panel | Done | `components/FormationDetail.tsx` — right panel when a formation is selected; name, kind, faction, cohesion, fatigue, personnel, status, readiness, location (OSID humanized), attack order target (OSID humanized); close button; cross-clear with OSID selection |
| Click OSID / formation → panels | Done | `map/useMapInteractions.ts` — click on `osid-control-fill` → `setSelectedOsid`; click on `formation-markers` or `formation-labels` → `setSelectedFormationId`. MapContainer wires these to the store. |
| OSID display names humanized | Done | `utils/osidDisplayName.ts`: `humanizeOsid()`, `buildOsidDisplayNameMap()`, `getOsidDisplayName()`; display names from operational_settlements (settlement_name, municipality in brackets; "+N" removed). Store: `osidDisplayNames` populated when map loads settlements; used in SelectionPanel, FormationDetail, BottomStatusStrip. |
| Storybook for components | Done | `.storybook/main.ts`, `preview.ts`; stories: `BrigadeRow.stories.tsx`, `CorpsCard.stories.tsx`, `FormationDetail.stories.tsx`, `BottomStatusStrip.stories.tsx`, `SelectionPanel.stories.tsx`, `TopToolbar.stories.tsx`; mocks: `__mocks__/oobMock.ts`, `__mocks__/loadedGameState.ts` |

**Not done in Phase 3:** MapModeToolbar, MapLayerToggles, Minimap, ZoomControls (MapLibre NavigationControl is present in MapContainer; no separate ZoomControls component). CorpsDetail, ArmyDetail. OrderQueue, AttackConfirmation, MovementPreview. useKeyboardShortcuts / global keyboard bindings. SettlementDetail is not a separate component — SelectionPanel serves as the settlement/OSID detail view.

---

### 2.4 Data and types

| Item | Status | Location / notes |
|------|--------|------------------|
| LoadedGameState and view types | Done | `data/types.ts`: FormationView, FrontEdgeView, AttackOrderView, MovementOrderSettlementView, RecruitmentView, etc.; LoadedGameState with controlBySettlement, formations, frontEdges, attackOrders, etc. |
| GameStateAdapter (parse save → view model) | Done | `data/GameStateAdapter.ts`: parseGameState(json) → LoadedGameState |
| ControlLookup / SID normalization | Done | `data/ControlLookup.ts` (used where needed for key normalization) |
| OSID lookups | Done | `utils/osidLookup.ts` (getByOsid for control/status); `utils/formationAtOsid.ts` (getFormationsAtOsid) |
| Theme / faction colors | Done | `utils/theme.ts`: FACTION_COLORS_SUBTLE, FACTION_BG_SUBTLE; used in panels and OOB |

---

### 2.5 Map layer (MapLibre) — implemented

| Layer / feature | Status | Notes |
|-----------------|--------|--------|
| Base map (style-driven) | Done | Style JSON references PMTiles/base layers |
| OSID control fill | Done | GeoJSON source `osid-control`; data from buildControlGeoJSON(geojson, controlBySettlement) |
| Front lines | Done | GeoJSON source `front-lines`; buildFrontLinesGeoJSON(controlledGeoJson) |
| Formation markers + labels | Done | GeoJSON source `formations`; buildFormationsGeoJSON; formation icons; markers and labels clickable |
| Order arrows | Done | GeoJSON source `order-arrows`; buildOrderArrowsGeoJSON(loadedGameState, …) |
| Click / hover on OSID and formations | Done | useMapInteractions in MapContainer; pointer cursor on OSID hover |
| NavigationControl (zoom) | Done | MapContainer adds `new maplibregl.NavigationControl()` |

**Not implemented on map:** ZoC overlay (buildZocGeoJSON not present). Dynamic layer visibility toggles (no useMapLayers or MapLayerToggles yet). Municipality borders as in v2 doc (if defined in style, present; no separate builder listed in current code). Labels layer (if in style, present).

---

### 2.6 Actual file and directory layout

Current layout under `src/ui/map/` (source files only; excludes node_modules, dist, cache):

```
src/ui/map/
├── index.html
├── main.tsx
├── App.tsx
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── styles/globals.css
├── store/
│   └── gameStore.ts
├── map/
│   ├── MapContainer.tsx
│   ├── awwv_map_style.json
│   ├── useMapInteractions.ts
│   ├── formationIcons.ts
│   └── builders/
│       ├── buildControlGeoJSON.ts
│       ├── buildFrontLinesGeoJSON.ts
│       ├── buildFormationsGeoJSON.ts
│       ├── buildOrderArrowsGeoJSON.ts
│       ├── geojsonLookup.ts
│       ├── formationIconId.ts
│       ├── resolveFormationLocationOsid.ts
│       └── generateFactionBorders.ts
├── components/
│   ├── TopToolbar.tsx
│   ├── BottomStatusStrip.tsx
│   ├── SelectionPanel.tsx
│   ├── FormationDetail.tsx
│   ├── OOBSidebar.tsx
│   ├── CorpsCard.tsx
│   └── BrigadeRow.tsx
├── data/
│   ├── DataLoader.ts
│   ├── GameStateAdapter.ts
│   ├── ControlLookup.ts
│   └── types.ts
├── utils/
│   ├── osidLookup.ts
│   ├── formationAtOsid.ts
│   ├── theme.ts
│   └── osidDisplayName.ts
├── stories/
│   ├── TopToolbar.stories.tsx
│   ├── BottomStatusStrip.stories.tsx
│   ├── SelectionPanel.stories.tsx
│   ├── FormationDetail.stories.tsx
│   ├── CorpsCard.stories.tsx
│   └── BrigadeRow.stories.tsx
├── __mocks__/
│   ├── oobMock.ts
│   └── loadedGameState.ts
└── .storybook/
    ├── main.ts
    └── preview.ts
```

**Not present (per v2 §7):** `store/selectors.ts`; `map/useMapSources.ts` (logic lives in MapContainer); `map/useMapLayers.ts`; `map/builders/buildZocGeoJSON.ts`; `hooks/useIPC.ts`, `useGameState.ts`, `useKeyboardShortcuts.ts`; subfolders under components (layout/, panels/, sidebar/, orders/, modals/, replay/) — components are flat in `components/`. No `AppShell.tsx`, `SettlementDetail.tsx`, `CorpsDetail.tsx`, `ArmyDetail.tsx`, `OrderQueue`, `AttackConfirmation`, `MovementPreview`, `WarSummaryModal`, `RecruitmentModal`, `MainMenu`, `SidePickerOverlay`, `ReplayScrubber`, `MapModeToolbar`, `MapLayerToggles`, `Minimap`, `ZoomControls` (beyond MapLibre’s built-in).

---

### 2.7 Dev and verification

- **Run dev server:** `npm run dev:map` (from repo root; Vite serves the map app; port may vary, e.g. 3007).
- **Build:** `npm run build` from `src/ui/map` or as configured in root.
- **Typecheck:** `npx tsc --noEmit` at repo root (or in `src/ui/map` if isolated).
- **Unit tests:** `npx vitest run` at repo root (map app may have no vitest tests in-tree; engine tests exist).
- **Storybook:** Run from `src/ui/map` (e.g. `npx storybook dev`) to review components in isolation.
- **Dev UX:** `?showPanel=1` in dev opens SelectionPanel with a placeholder OSID for layout check (see App.tsx).

---

## 3. PART B — What remains to be implemented

### 3.1 v2 doc component inventory (§5.2) — gap

| Component | v2 doc | Current status |
|-----------|--------|----------------|
| AppShell | Layout wrapper | Not a separate component; App does layout |
| TopToolbar | Layout | Implemented |
| BottomStatusStrip | Layout | Implemented |
| MapModeToolbar | Map overlays | **Not implemented** |
| MapLayerToggles | Map overlays | **Not implemented** |
| Minimap | Map overlays | **Not implemented** |
| ZoomControls | Map overlays | Only MapLibre NavigationControl; no separate component |
| SelectionPanel | Right panel | Implemented (as "Settlement Info") |
| SettlementDetail | Right panel | **Not implemented** (SelectionPanel covers OSID detail) |
| FormationDetail | Right panel | Implemented |
| CorpsDetail | Right panel | **Not implemented** |
| ArmyDetail | Right panel | **Not implemented** |
| OOBSidebar | Left sidebar | Implemented |
| CorpsCard | Left sidebar | Implemented |
| BrigadeRow | Left sidebar | Implemented |
| OrderQueue | Orders | **Not implemented** |
| AttackConfirmation | Orders | **Not implemented** |
| MovementPreview | Orders | **Not implemented** |
| WarSummaryModal | Modals | **Not implemented** |
| RecruitmentModal | Modals | **Not implemented** |
| MainMenu | Modals | **Not implemented** |
| SidePickerOverlay | Modals | **Not implemented** |
| ReplayScrubber | Replay | **Not implemented** |

---

### 3.2 Phase 0 — Tile pipeline (v2 §8)

| Item | Status |
|------|--------|
| Install tile generation tools (tilemaker, gdal, pmtiles CLI) | Done (manually installed; tilemaker at C:\Tools\Tilemaker\, GDAL at C:\Program Files\GDAL\, pmtiles CLI in PATH) |
| Generate hillshade PMTiles from DEM | Done (manual pipeline: gdaldem hillshade → 4× upscale → MBTiles → pmtiles convert). Output: data/derived/tiles/hillshade.pmtiles, zoom 6-12, 3,345 tiles, ~70 MB |
| Generate OSM vector PMTiles from PBF | Done (Protomaps daily build extract, not local tilemaker — tilemaker Windows binary was broken). Output: data/derived/tiles/osm.pmtiles, zoom 0-15, 173,244 tiles, ~459 MB. Uses Protomaps basemap v4 schema. |
| Verify OSID GeoJSON (753 features WGS84) | Done — confirmed present at data/derived/operational/operational_settlements.geojson |
| Verify municipality boundaries GeoJSON | Done — confirmed present at data/source/boundaries/bih_adm3_1990.geojson, 110 features, WGS84 |
| scripts/map/generate_tiles.sh (or equivalent) | Not present — tile generation is manual. See docs/40_reports/AWWV_GUI_REWORK_PROGRESS_20260228.md for exact commands. |

Tile generation was completed manually on 2026-02-28. Full pipeline commands and parameters are documented in [docs/40_reports/AWWV_GUI_REWORK_PROGRESS_20260228.md](AWWV_GUI_REWORK_PROGRESS_20260228.md). Automation script for reproducible tile generation is a backlog item.

---

### 3.3 Phase 3 — Remaining UI (v2 §8)

| Item | Description |
|------|-------------|
| MapModeToolbar | Floating toolbar: SELECT / ATTACK / MOVE (or similar) mode; can start as UI state only. |
| MapLayerToggles | Checkboxes to show/hide layers (e.g. control, front lines, formations, labels); wire to MapLibre layer visibility. |
| Minimap | Small overview with viewport rectangle; optional. |
| ZoomControls | Optional separate component if more than MapLibre’s NavigationControl is required. |
| CorpsDetail | Right panel when a corps is selected (e.g. from OOB); show corps-level info. |
| ArmyDetail | Right panel when an army is selected, if applicable. |
| OrderQueue | Panel listing staged orders for the current turn before commit. |
| AttackConfirmation | Modal for confirming an attack (attacker, target, defender, confirm/cancel). |
| MovementPreview | Highlight reachable OSIDs when in move mode; requires game logic for reachability. |
| useKeyboardShortcuts | Global shortcuts (e.g. Escape to clear selection, Enter to advance turn when IPC exists). |
| SettlementDetail | Only if a richer OSID-only view is needed beyond SelectionPanel (e.g. population breakdown, supply, stability, adjacent OSIDs per v2 §6.1). |

---

### 3.4 Phase 4 — Desktop integration (v2 §8)

| Item | Description |
|------|-------------|
| useIPC | Hook wrapping all IPC channels from DESKTOP_GUI_IPC_CONTRACT.md. |
| advance-turn | Wire to UI (e.g. TopToolbar or keyboard). |
| Order staging | Attack, move, posture order staging via IPC. |
| Recruitment modal | Wire to recruitment flow and IPC. |
| SidePickerOverlay | "Start new campaign" / side picker; wire to start-new-campaign. |
| Fog-of-war | Filter formations (and possibly other state) by player_faction. |
| PMTiles in Electron | Serve tiles via local protocol (e.g. awwv://) in Electron. |
| Full gameplay loop | Pick side → advance turns → stage orders → see results in desktop build. |

---

### 3.5 Phase 5 — Polish (v2 §8)

| Item | Description |
|------|-------------|
| Hillshade / OSM tuning | Fine-tune style and tile usage. |
| Label styling | Font sizes, halos, zoom-based visibility. |
| Front line styling | Glow, dash pattern. |
| ZoC overlay | buildZocGeoJSON + layer for selected formation ZoC. |
| Battle replay markers | Pulsing control-change indicators. |
| War Summary modal | End-of-turn summary. |
| Replay scrubber | Timeline and playback for past turns. |
| Attack confirmation with odds | Odds preview in AttackConfirmation. |
| Movement preview | Reachable OSIDs highlight (may overlap with Phase 3 MovementPreview). |
| CRT / scanline overlay | Optional. |
| Visual sign-off | Subjective quality sign-off. |

---

## 4. Verification checklist for external expert

- [ ] **Spec alignment:** Confirm that PART A matches the v2 doc’s Phases 1–2 and the described Phase 3 scope (layout, SelectionPanel, FormationDetail, OOB, status strip, OSID humanization, load save, interactions).
- [ ] **Codebase:** Confirm presence of the files listed in §2.6 under `src/ui/map/` and that there are no critical omissions.
- [ ] **Run:** `npm run dev:map` (or equivalent) runs the React map app; map renders; "Load Save" / "Load Latest" load a save; formations, front lines, and order arrows appear.
- [ ] **Interaction:** Clicking an OSID opens the right panel with "Settlement Info" and humanized name; clicking a formation opens FormationDetail; OOB shows formations from loaded state.
- [ ] **Backlog:** Confirm PART B accurately reflects remaining work from the v2 doc (Phases 0, 3 remainder, 4, 5 and component list).
- [ ] **Source of truth:** Confirm that the React map app is stated as the single canonical GUI and that legacy/archived UIs are out of scope for new work.

---

## 5. Document references

- **Architecture (authoritative):** [AWWV_GUI_ARCHITECTURE_REWORK_v2.md](../20_engineering/AWWV_GUI_ARCHITECTURE_REWORK_v2.md)
- **Implementation status in v2:** Section "0. Implementation Status" in that document.
- **Reports index:** [docs/40_reports/README.md](README.md); [CONSOLIDATED_IMPLEMENTED.md](CONSOLIDATED_IMPLEMENTED.md) for other implemented work.
- **Tile pipeline and visual tuning session log:** [docs/40_reports/AWWV_GUI_REWORK_PROGRESS_20260228.md](AWWV_GUI_REWORK_PROGRESS_20260228.md) — detailed record of tile generation commands, Vite Range Request fix, Protomaps v4 schema discovery, front line generation, and map visual tuning (2026-02-28 session).

---

*This report is intended for external review. If you find gaps or errors, please flag them against the v2 doc and this report so the project can update the implementation or the document accordingly.*
