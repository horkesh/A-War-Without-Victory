# HoI Visual & GUI Overhaul — Orchestrator-Delegated Implementation Plan

**Orchestrator directive:** All 18 remaining spec items, 6 gated rounds, full Paradox team.
**Architect authority:** Architect makes all design decisions autonomously; flags them for user review at round boundaries.
**Companion:** [Gap analysis](file:///C:/Users/User/.gemini/antigravity/brain/e2848689-af2e-494a-859c-b49c2293cbf0/hoi_spec_gap_analysis.md) | [Spec](file:///f:/A-War-Without-Victory/docs/30_planning/20260221_settlement%20remapping%20and%20GUI%20rework/HOI_VISUAL_GUI_OVERHAUL_SPEC.md)

---

## Paradox Team Assignment

| Role | Owner | Responsibility |
|------|-------|----------------|
| **Orchestrator** | Session lead | Priority, sequencing, cross-role alignment |
| **Architect** ⭐ | Decision authority | All design decisions — font loading, mesh vs sprite, component architecture, cross-system integration. Flags decisions for later user review. |
| **Product Manager** | Deputy | Round gating, scope control, risk flags |
| **Graphics Programmer** | Renderer work | [HoIMapRenderer.ts](file:///f:/A-War-Without-Victory/src/ui/map/renderer/HoIMapRenderer.ts): municipality borders, order arrows, strategic points, enclave rings, minimap canvas |
| **Frontend Design** | CSS + typography | [styles_hoi.css](file:///f:/A-War-Without-Victory/src/ui/map/styles_hoi.css): typography, panel polish, minimap styling, hover/active states |
| **UI/UX Developer** | Sidebar components | `map_hoi/` components: War Status, Diplomacy, Logistics tabs, brigade click→pan, status strip |
| **Modern Wargame Expert** | Advisory | HoI-like UX patterns: tooltip density, panel hierarchy, information architecture |
| **QA Engineer** | Round verification | tsc gate, browser inspection checklist, Puppeteer smoke test |

---

## Round Structure

Each round follows this gate sequence:
```
1. Implement changes
2. cmd.exe /c "npx tsc --noEmit"     → must exit 0
3. Visual inspection in browser       → checklist per round
4. /refactor-pass                     → dead code, simplification
5. Architect flags decisions for review
```

---

## Round 1 — Map Visual Finish (Municipality Borders)

**Owner:** Graphics Programmer | **Spec:** §2.2 item 6

#### [MODIFY] [HoIMapRenderer.ts](file:///f:/A-War-Without-Victory/src/ui/map/renderer/HoIMapRenderer.ts)
- Add `buildMunicipalityBorders()`: for adjacent OSIDs in the same municipality with same-faction control, draw thin dashed `LineSegments` at `rgba(0,0,0,0.25)` along shared borders using existing `sharedBorders` data.
- Call from [init()](file:///f:/A-War-Without-Victory/src/ui/map/map_hoi.ts#90-454) after [computeSharedBorders](file:///f:/A-War-Without-Victory/src/ui/map/renderer/HoIMapRenderer.ts#1134-1193).
- Gate on `control` layer visibility in [applyLayerVisibility()](file:///f:/A-War-Without-Victory/src/ui/map/renderer/HoIMapRenderer.ts#1428-1443).

**Architect decision:** Municipality borders share the `control` layer toggle (not a separate layer) — minimal UI complexity.

**Browser check:** Zoom in to a municipality with multiple same-faction OSIDs. Thin dashed lines should be visible.

---

## Round 2 — Formation Display (Front Placement + Order Arrows)

**Owner:** Graphics Programmer + UI/UX Developer | **Spec:** §2.4 item 7, §2.5 item 11

#### [MODIFY] [FormationOverlayLayer.ts](file:///f:/A-War-Without-Victory/src/ui/map/map_hoi/FormationOverlayLayer.ts)
- `setFrontData(frontEdges, controlBySettlement, adjacency)` → stores data for front-active detection.
- [syncPositions()](file:///f:/A-War-Without-Victory/src/ui/map/map_hoi/FormationOverlayLayer.ts#128-256): for each brigade, find its OSID's front-active neighbors (opposing control). If ≥1, compute centroid of front-active OSIDs. Else, fall back to OSID centroid.

#### [MODIFY] [map_hoi.ts](file:///f:/A-War-Without-Victory/src/ui/map/map_hoi.ts)
- Pass front edges, control map, and adjacency to `overlayLayer.setFrontData(...)` after state load.

#### [MODIFY] [HoIMapRenderer.ts](file:///f:/A-War-Without-Victory/src/ui/map/renderer/HoIMapRenderer.ts)
- [setOrderArrows(arrows: OrderArrowInput[])](file:///f:/A-War-Without-Victory/src/ui/map/renderer/HoIMapRenderer.ts#1978-2014): quadratic Bézier `TubeGeometry` in faction color. Attack: 6px solid. Movement: 4px dashed. Arrowhead cone at tip.
- Pending arrows pulse opacity in `animate()`.
- Gate on `formations` layer.

#### [MODIFY] [map_hoi.ts](file:///f:/A-War-Without-Victory/src/ui/map/map_hoi.ts)
- Derive `OrderArrowInput[]` from `loaded.attackOrders` + `loaded.movementOrders` by resolving brigade location and target settlement to world positions.

**Architect decision:** Bézier control point offset = 20% of arrow length perpendicular to the line. Arrowhead = `ConeGeometry(0.02, 0.06, 8)`.

**Browser check:** Load save with brigades. Markers should cluster at front edges, not at geometric centroids. Load save with attack orders — curved arrows should appear.

---

## Round 3 — Sidebar Interactivity + Tab Content

**Owner:** UI/UX Developer + Frontend Design | **Spec:** §3.3–3.6, items 12–16

#### [MODIFY] [BrigadeRowComponent.ts](file:///f:/A-War-Without-Victory/src/ui/map/map_hoi/BrigadeRowComponent.ts)
- Add `onBrigadeClick` callback. Click row → fires callback.
- Add `cursor: pointer`, hover highlight `#332e2a`.

#### [MODIFY] [CorpsCardComponent.ts](file:///f:/A-War-Without-Victory/src/ui/map/map_hoi/CorpsCardComponent.ts)
- Add `onCorpsClick` callback on header click.
- Stance `<select>` already exists — verify it fires `onStanceChange`, log to console.

#### [MODIFY] [ArmySidebarComponent.ts](file:///f:/A-War-Without-Victory/src/ui/map/map_hoi/ArmySidebarComponent.ts)
- Wire `onBrigadeClick` and `onCorpsClick` callbacks through to [map_hoi.ts](file:///f:/A-War-Without-Victory/src/ui/map/map_hoi.ts).
- Instantiate tab content components (below) when their tab is active.

#### [NEW] [WarStatusTabComponent.ts](file:///f:/A-War-Without-Victory/src/ui/map/map_hoi/WarStatusTabComponent.ts)
- Territory % per faction (horizontal bar chart, DOM).
- Total personnel per faction.
- Front stability: count static/fluid/oscillating from front edges.

#### [NEW] [DiplomacyTabComponent.ts](file:///f:/A-War-Without-Victory/src/ui/map/map_hoi/DiplomacyTabComponent.ts)
- RBiH-HRHB alliance gauge (-1.0 to +1.0 visual bar) from `phase_i_alliance_rbih_hrhb`.
- War earliest turn, patron commitment placeholders.

#### [NEW] [LogisticsTabComponent.ts](file:///f:/A-War-Without-Victory/src/ui/map/map_hoi/LogisticsTabComponent.ts)
- Recruitment capital display from `loaded.recruitment`.
- Corridor/equipment placeholders.

#### [MODIFY] [types.ts](file:///f:/A-War-Without-Victory/src/ui/map/map_hoi/types.ts)
- Add `HoIWarStatusData`, `HoIDiplomacyData`, `HoILogisticsData`.
- Add fields to [HoIMapStateData](file:///f:/A-War-Without-Victory/src/ui/map/map_hoi/types.ts#51-57).

#### [MODIFY] [loadedStateToHoIState.ts](file:///f:/A-War-Without-Victory/src/ui/map/map_hoi/loadedStateToHoIState.ts)
- Derive `warStatus`, `diplomacy`, `logistics` from [LoadedGameState](file:///f:/A-War-Without-Victory/src/ui/map/types.ts#270-329).

#### [MODIFY] [map_hoi.ts](file:///f:/A-War-Without-Victory/src/ui/map/map_hoi.ts)
- `onBrigadeClick` → `renderer.centerOnSid()` + select formation in overlay + highlight ZoC.
- `onCorpsClick` → pan to corps centroid + show corps-to-brigade lines.
- Pass new state slices to sidebar.

#### [MODIFY] [styles_hoi.css](file:///f:/A-War-Without-Victory/src/ui/map/styles_hoi.css)
- Brigade row hover, alliance gauge bar, territory bar chart styles.

**Architect decision:** IPC stub — stance changes and Plan Operation buttons log to `console.info('[IPC STUB]', action)` until bridge methods exist.

**Browser check:** Click brigade in sidebar → map pans. Click corps → lines appear. Switch to each tab → content renders.

---

## Round 4 — Typography + Panel Polish + Status Strip

**Owner:** Frontend Design | **Spec:** §3.1, §9.3, items 17–18, 21

#### [MODIFY] [styles_hoi.css](file:///f:/A-War-Without-Victory/src/ui/map/styles_hoi.css)
- Add `@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Condensed:wght@400;600;700&display=swap')`.
- Set `--hoi-font-sans: 'IBM Plex Sans Condensed', sans-serif`.
- Apply per spec §9.3: panel titles → sans-condensed 600 14px UPPERCASE, body text → sans-condensed 400 13px, tooltips → sans-condensed 400 11px, data/labels → keep IBM Plex Mono.
- Sidebar brigade rows: faction color left border, OG dashed border, degraded amber border.

#### [MODIFY] [BottomStatusStripComponent.ts](file:///f:/A-War-Without-Victory/src/ui/map/map_hoi/BottomStatusStripComponent.ts)
- Three-zone layout: left ticker | center alert badges (fade-in/out) | right quick-stats.

#### [MODIFY] [loadedStateToHoIState.ts](file:///f:/A-War-Without-Victory/src/ui/map/map_hoi/loadedStateToHoIState.ts)
- Derive alerts: enclave integrity < 30% → red alert, corridor strained → yellow, operation complete → green.

**Architect decision:** Google Fonts CDN for IBM Plex Sans Condensed (SIL OFL licensed, no bundling needed). Fallback: system sans-serif.

**Browser check:** Panel titles should be sans-condensed uppercase. Brigade rows should have faction-colored left borders. Status strip should show three zones.

---

## Round 5 — Map Polish (Strategic Points + Enclaves + Minimap)

**Owner:** Graphics Programmer + UI/UX Developer | **Spec:** §2.6, §2.7, §6, items 22–24

#### [MODIFY] [HoIMapRenderer.ts](file:///f:/A-War-Without-Victory/src/ui/map/renderer/HoIMapRenderer.ts)
- `buildStrategicPoints()`: gold diamond/star sprites sized by population. Municipal seats → 3px, pop ≥ 5k → 5px, major cities → 8px. Gate on `labels` layer.
- [setEnclaveRings(rings: EnclaveRingInput[])](file:///f:/A-War-Without-Victory/src/ui/map/renderer/HoIMapRenderer.ts#2075-2100): thick dashed `LineLoop` in faction color. Text sprite for label + integrity %. Pulse red at integrity < 30%. Gate on `control` layer.

#### [NEW] [MinimapComponent.ts](file:///f:/A-War-Without-Victory/src/ui/map/map_hoi/MinimapComponent.ts)
- 250×180px `<canvas>`, bottom-left of `.hoi-map-wrap`.
- Draws: scaled terrain texture + municipality-level faction fill + front strokes.
- White viewport rectangle (draggable). Click/drag → updates `renderer.pan`/`renderer.zoom`.
- Syncs via `renderer.onRenderSync`.

#### [MODIFY] [styles_hoi.css](file:///f:/A-War-Without-Victory/src/ui/map/styles_hoi.css)
- Minimap positioning, border `rgba(180,160,130,0.3)`, z-index above terrain.

#### [MODIFY] [map_hoi.ts](file:///f:/A-War-Without-Victory/src/ui/map/map_hoi.ts)
- Instantiate minimap after renderer init. Pass control data + front edges on state update.
- Derive enclave rings from state (if data exists), pass to renderer.

**Architect decision:** Minimap renders to its own 2D canvas (no Three.js overhead). Terrain texture is drawn scaled-down via `drawImage`. Viewport rectangle math uses inverse of `HoIMapRenderer.updateCamera` projection.

**Browser check:** Gold markers at major cities. Enclave dashed rings (if data present). Minimap bottom-left with click-to-pan.

---

## Round 6 — Puppeteer Smoke Test + Final Gate

**Owner:** QA Engineer | **Spec:** not in original spec, user request

#### [NEW] [tools/smoke_test_hoi_map.ts](file:///f:/A-War-Without-Victory/tools/smoke_test_hoi_map.ts)
Headless Puppeteer smoke test:
1. Launch dev server (`npm run dev:map`).
2. Navigate to [map_hoi.html](file:///f:/A-War-Without-Victory/src/ui/map/map_hoi.html).
3. Assert: WebGL canvas appears (`.hoi-map-placeholder` hidden or removed).
4. Assert: sidebar renders (`.hoi-sidebar` exists with child elements).
5. Assert: at least one formation marker visible (`.hoi-formation-marker`).
6. Click a formation marker → assert `selectedFormationId` changes (marker gets `.selected` class).
7. Exit with code 0 on success, 1 on failure.

**Run:** `MAP_URL=http://localhost:3002/map_hoi.html npx tsx tools/smoke_test_hoi_map.ts`

**Final gate:** tsc + vitest + smoke test + `/refactor-pass` + napkin/ledger update.

---

## Risk Register

| Risk | Mitigation |
|------|------------|
| **No IPC for stance changes** | Console.log stubs; bridge methods added when Electron-side is ready |
| **Minimap performance** | 2D canvas, not Three.js; draws once per camera move, not per frame |
| **Google Fonts CDN offline** | Fallback to system sans-serif in CSS |
| **Enclave data may not exist in saves** | Enclave ring rendering is no-op when data absent |
| **TubeGeometry for arrows may be heavyweight** | Architect can downgrade to `Line2` (fat line) if perf is poor |

---

## Architect Decisions (Flagged for User Review)

These will be flagged at each round boundary for the user to review:

1. **Round 1:** Municipality borders share `control` layer toggle (no new toggle)
2. **Round 2:** Bézier offset = 20% of arrow length; arrowhead = ConeGeometry
3. **Round 3:** IPC stubs for stance/operation (console.info)
4. **Round 4:** Google Fonts CDN for IBM Plex Sans Condensed
5. **Round 5:** Minimap is 2D canvas, not Three.js; viewport rect tracks camera inverse projection
