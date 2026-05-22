# Tactical Map System — Engineering Reference

**Project:** A War Without Victory (AWWV)
**Location:** `src/ui/map/`
**Dev server:** `npm run dev:map` (Vite, port 3002)
**Date:** 2026-02-08 | **Canonical GUI update:** 2026-05-02

---

## 0. Canonical map / GUI (2026-02-28)

The **canonical player-facing map and GUI** is the **React + MapLibre map app** in `src/ui/map/` (Vite, React, Tailwind, Zustand). It is the single source of truth for all new GUI work. Spec: [AWWV_GUI_ARCHITECTURE_REWORK_v2.md](AWWV_GUI_ARCHITECTURE_REWORK_v2.md). Full implementation status and backlog: [20260228_REACT_MAP_APP_COMPREHENSIVE_STATUS.md](../40_reports/20260228_REACT_MAP_APP_COMPREHENSIVE_STATUS.md). Phase 3 expansion (2026-03-02): tooltip fix, sector visualization, brigade↔sector sync, CorpsDetail, density mode — [20260302_GUI_PHASE3_EXPANSION_SECTOR_VISUALIZATION.md](../40_reports/implemented/20260302_GUI_PHASE3_EXPANSION_SECTOR_VISUALIZATION.md). Run: `npm run dev:map`. Storybook for map UI components: `src/ui/map/.storybook/`, `src/ui/map/stories/`.

**Glyphs and offline deployment:** The MapLibre style (`awwv_map_style.json`) references glyphs from `https://demotiles.maplibre.org/...`. Offline or air-gapped deployments will not have map labels unless glyphs are bundled locally and the style updated to point to a local or relative glyph URL.

- **Phase 4/5: Deck.gl hybrid (2026-03-20)**: Deck.gl layers live under `src/ui/map/layers/` and are gated by **`deckLayerCapabilities.ts`**. Default (**`deckFormationCounters: true`**) uses **Deck.gl** formation counters as the primary render path — MapLibre `formation-markers` / `formation-labels` are hidden to prevent double-draw. Deck.gl enrichment layers include: health bar, supply dot, status icons, stack badges, and op/disrupted glow rings. Zoom-dependent sizing targets the same curve (16px @ Z6 to 40px @ Z14) with `zoom` sync. Setting `deckFormationCounters: false` restores MapLibre symbol layers as a fallback.
- **Major-mun labels**: `buildMajorCityLabelGeoJSON.ts` → source `major-city-labels`, symbol layer above fronts; strategic settlement “Points” layer removed.
- **SVG Icon framework**: UI-wide `Icon` component; map label typography detailed in MAP_UI_MASTER / `MapContainer.tsx`.
- **Uniform Front Lines**: Front-line thickness for `front-line-base` and `front-line-stripe` uses uniform zoom-only widths. Vertex-snapping fallback synthesizes boundary lines for OSID pairs lacking shared polygon arcs. Sector highlight layers use `front-lines` source (`lineType=glow` filter) so the white glow trails the front line exactly.
- **Borders toggle (2026-03-20):** **`municipalityBordersVisible`** (`gameStore`) drives **`mun-borders`** (1990 adm3 `bih_adm3_1990.geojson`) and **`osid-control-outline`**; both default **off** in style + store. Toolbar label **Borders**. Detail: [MAP_UI_MASTER.md](MAP_UI_MASTER.md) §3.3, §7.
- **OSID selection highlight (2026-03-20):** On `selectedOsid`, **`osid-selected-fill`** + **`osid-selected-mun-sibling-fill`** (same `mun1990_id`) + **`osid-selected-outline`**; **`mun-borders-selection`** shows that municipality’s adm3 ring even when global Borders is off (`osidPropertiesMap` / `MapContainer.tsx`). Map mode fills insert below `osid-selected-mun-sibling-fill`. Detail: [MAP_UI_MASTER.md](MAP_UI_MASTER.md) §7.

**Operation opportunity footprint highlighting (2026-05-01):** Army HQ opportunity dossiers use `operationTargetOsids` / `setOperationTargetOsids` in `gameStore.ts` to highlight proposal objective and staging OSIDs on the existing `operation-target-*` map layers. The DTO source is `LoadedGameState.operationOpportunityProposals[*].objectives/staging/redirect_variants`; UI must not import sim catalog files or render raw `op:` strings.

**Presidential Decision Room / Strategic Priorities (2026-05-02):** Army HQ BRIEFING now begins with `PresidentialDecisionRoomPanel`, backed by pure `src/ui/map/data/presidentialDecisionRoom.ts`. The read model synthesizes existing player-facing DTOs only: `presidentialReviewQueue`, `operationOpportunityProposals`, `commandBriefing`, `operationalSitrep`, `latestTurnSummary` / `turnSummaries`, Turn Aftermath records, active campaign cost, and Chronicle availability. Card actions route through `src/ui/map/utils/presidentialDecisionRoomNavigation.ts`, which delegates to canonical `shellNavigation` helpers for Army HQ tabs, focused Turn Aftermath records, corps briefings, or Chronicle. The same sorted card archive also derives local priority lenses (`all` plus non-empty source categories), five command-loop lanes (`Urgent`, `Decisions`, `Fronts`, `Inspect`, `Advance`), grouped source handoffs by owning inspection surface, and an `activeDossier` for the selected/top card. The dossier shows full explanation, evidence, source owner, same-surface related card ids, advance-review status, and the selected card's existing action target. Lenses, lanes, handoffs, and dossiers are presentation state only and do not own source truth. The pre-advance packet now takes one item per source category before filling duplicate categories so a second opportunity dossier cannot hide a hard-turn record. It must remain a deterministic UI read model: no sim writes, no combat/catalog imports, no raw hidden enemy truth, no second inbox/cost/history owner, and no `priorityDossierQueue` / `priorityDossierLedger`.

**Pre-advance command review (2026-05-02):** `src/ui/map/components/warroom/AdvanceTurnModal.tsx` now consumes `src/ui/map/data/preAdvanceCommandReview.ts`, a pure projection of the Presidential Decision Room `advanceReadiness` packet. The confirmation shows urgent/pending/opportunity/hard-turn counters plus the top `Review Before Advance` items, and the read model groups those same items into source handoffs for the owning inspection surfaces. Its global `Review Priorities` action opens Army HQ BRIEFING through `openArmyHQTab`, while individual row actions preserve each card's `navigationTarget` and route through `openPresidentialDecisionRoomNavigationTarget(...)` to the exact source owner. It must stay a reminder and handoff surface only: no sim mutation, no new UI-only block, no second queue, and no combat/sensitive-history imports.

**Warroom priority docket (2026-05-02):** `src/ui/map/components/warroom/WarroomStatusBar.tsx` now consumes `src/ui/map/data/warroomPriorityDocket.ts`, a compact projection over `buildPreAdvanceCommandReviewView(...)`, while the Warroom overlay is active. The `PRIORITIES` control still shows Decision Room advance-review and urgent counts, but now opens a small docket tray with top `Review Before Advance` rows and source-handoff buttons. `Open Decision Room` routes through the App-level Army HQ BRIEFING handoff, while individual row and source-handoff actions route through `openPresidentialDecisionRoomNavigationTarget(...)` using preserved source targets. It is a shell summary, not a second Decision Room implementation, queue, or history owner.

**GUI visual audit label discipline (2026-05-22):** Tactical-map player-facing labels must not expose raw OSID slug fragments or implementation sentinels. `SituationTab` formats priority-front labels through the current OSID display-name map when it receives legacy SITREP strings; Local Support surfaces omit phase labels; Army HQ opportunity pulse uses a player phrase for reserve-crisis authorization instead of the internal `T3` term. Regression coverage: `tests/ui/gui_audit_label_discipline.test.ts`.

**Desktop map runtime (2026-03-03):** In Electron, the **same** map app is used as in dev: there is **one** codebase (`src/ui/map/`), no separate "player-facing" map. When you run `npm run dev:map` (Vite on port 3002), the desktop app prefers that URL for the map iframe so the in-app map is identical to the dev map. When the dev server is not running, Electron serves the built bundle from `dist/tactical-map` (local HTTP server on 127.0.0.1). Map assets (PMTiles, style, GeoJSON) and Load run data are served via that server; MapLibre blob workers do not work under the `awwv://` protocol. Rebuild with `npm run desktop:map:build` and restart Electron to refresh the built bundle when not using the dev server. Browser/dev inspection without Electron can render the map and local tutorial/preview controls, but turn advancement is desktop-owned: the Browser Dev path should not claim a canonical `advance-turn`; Electron calls the preload IPC bridge, the main process mutates canonical state, and renderer state refreshes from IPC broadcasts.

**FormationDetail and Officers (Phase E):** When a formation is selected, the right panel (FormationDetail) shows a **Command** block when officer data is present in LoadedGameState: for brigades, officer quality (progress bar/percentage); for corps/army_hq, an `OfficerProfile` card showing archetype, origin badge, pip ratings (●●●○○), descriptive stat labels, combat record, and tenure. Data from `loadedGameState.namedOfficerData` and `namedOfficerStateById`; `formation.officer_quality`. Character display utilities in `src/ui/map/utils/officerCharacter.ts`; shared component in `src/ui/map/components/OfficerProfile.tsx`. All 6 officer-displaying panels (CorpsDetail, OperationDetail, FormationDetail, OrbatPanel, OperationsPanel, ArmyDetail) use `OfficerProfile`. OOBSidebar shows abbreviated name with `formatRank`. When the last turn report includes `officer_succession`, corps formations show **Recent command changes** (replacements for that corps). Operation-owned brigades now override the UI-side `home_defense_active` attack/assault lockout; the panel must respect `operations[].participating_brigade_ids`, not only the brigade flag. See `docs/plans/2026-03-02-officers-phase-e-implementation.md`.

The sections below (§1 onward) describe the **legacy** tactical map (Canvas 2D, MapApp.ts) and HoI 3D map (map_hoi.html, HoIMapRenderer) for reference. Those stacks are archived; new features belong in the React + MapLibre app.

---

## 1. Quick Start (legacy reference)

```bash
# Start the dev server
npm run dev:map

# Open in browser
http://127.0.0.1:3002/tactical_map.html
```

The dev server runs Vite on port 3002 with a custom middleware plugin that serves data files from the project root. No build step is needed during development — Vite handles TypeScript compilation and hot module replacement.

**Prerequisites:** All data files in `data/derived/` must exist. These are generated by the map build pipeline (`npm run map:*` scripts). The two required files are `settlements_a1_viewer.geojson` and `political_control_data.json`. Other files are optional but provide rivers, roads, boundary, edges, ethnicity, and municipality names.

---

## 2. System Overview (legacy reference)

**Legacy:** The following describes the HoI 3D map (`map_hoi.html`) and Canvas 2D tactical map (`tactical_map.html`, MapApp.ts) for reference only. The **canonical** map is the React + MapLibre app (see §0 above). Unit (formation) display on it follows the write-ups in §2.1; implementation status: [ORCHESTRATOR_VISIBLE_FORMATIONS_ON_MAP_2026_02_23.md](../40_reports/convenes/ORCHESTRATOR_VISIBLE_FORMATIONS_ON_MAP_2026_02_23.md). Formation markers are wired via `getWorldPositionForSettlement(osidOrSid)` and `setFormations(markers)`; selection-driven ZoC overlay and corps–brigade lines were implemented in legacy 3D map per [ORCHESTRATOR_HOI_3D_FORMATIONS_ZOC_CONVENE_2026_02_23.md](../40_reports/convenes/ORCHESTRATOR_HOI_3D_FORMATIONS_ZOC_CONVENE_2026_02_23.md). **ZoC overlay: removed — ZoC system deleted 2026-03-02 (zoc.ts, zoc_constrained_movement.ts deleted; no ZoC rendering in canonical React+MapLibre app).** See [20260224_HOI_3D_FORMATIONS_ZOC_IMPLEMENTATION.md](../40_reports/implemented/20260224_HOI_3D_FORMATIONS_ZOC_IMPLEMENTATION.md) (legacy reference only). **Strategic zoom (max zoom out):** When zoom ≥ ZOOM_CORPS_ONLY_THRESHOLD (2.6), only corps and army_hq markers are visible and clickable; brigades are hidden. **Corps HQ placement:** Corps (and army_hq) use `location_osid` when set in state (historical HQ OSID from scenario data); otherwise position is the centroid of subordinates’ positions. Scenario authors should set `location_osid` on corps formations to the historical HQ OSID for correct placement.

### 2.1 How units (formations) should be displayed — doc index

| Doc | Location | What it specifies |
|-----|----------|-------------------|
| **HOI_VISUAL_GUI_OVERHAUL_SPEC** | `docs/30_planning/20260221_settlement remapping and GUI rework/HOI_VISUAL_GUI_OVERHAUL_SPEC.md` §2.4 | **Formation markers (Deck.gl Hybrid):** Precise OSID centering; NATO tactical symbols; visual stacking; **10% status banners (2026-03-15)**. Zoom scaling (16-40px). |
| **TACTICAL_MAP_SYSTEM** (this doc) | §2 map_hoi bullet | Formation **billboard sprites** (zoom scaling), layer F4 “Formations”; same GameStateAdapter/IPC; operational_settlements.geojson. |
| **ORCHESTRATOR_VISIBLE_FORMATIONS_ON_MAP** | `docs/40_reports/convenes/ORCHESTRATOR_VISIBLE_FORMATIONS_ON_MAP_2026_02_23.md` | Implementation: `FormationMarkerInput` (id, position, name, faction, posture?, isCorps?); position from `location_osid` or `hq_sid`; `setFormations(markers)`; determinism (sort by id). Gap: map_hoi does not yet call `setFormations`; renderer needs `getWorldPositionForSettlement(osidOrSid)`. |
| **Napkin** | `.agent/napkin.md` | 3D counters: data-mode read-only, deterministic; fixed mode cycle; corps tint from (faction, corps_id) hash. |

The tactical map is a standalone Canvas 2D application that renders ~5,800 settlement polygons across Bosnia and Herzegovina with:

- **Visual identity** — 1990s NATO C2 ops center: dark navy canvas (`#0d0d1a`), phosphor-green accents, IBM Plex Mono typography. See [GUI_DESIGN_BLUEPRINT.md](GUI_DESIGN_BLUEPRINT.md) §1, §21 and [GUI_VISUAL_OVERHAUL_NATO_OPS_CENTER_2026_02_14.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md).
- **Political control coloring** — each settlement filled by its controlling faction (RS crimson, RBiH green, HRHB blue, or neutral grey); faction colors from `nato_tokens.ts` retuned for dark background
- **Base geography** — national boundary, 1,200 rivers, 17,000 road segments, and 110 municipality borders (subdued for dark canvas)
- **Front lines** — **dual defensive arc** (2026-02-17): paired faction-colored arc symbols on each side of settlement borders. Renderer now prefers canonical `state.front_edges` when present (engine snapshot), and falls back to control+AoR derivation when absent. For canonical edges with no deployed brigade on either side, both-side arcs are still drawn so the strategic line remains visible; fallback mode keeps the prior “defended side(s) only” behavior. Perpendicular barb ticks toward enemy; faction colors from SIDE_RGB (RBiH green, RS crimson, HRHB blue). Replaces previous single white line / defended-undefended system. See [IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md §24, §27](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md). Canonical `front_edges` persisted in GameState as of 2026-02-21.
- **Settlement labels** — URBAN_CENTER and TOWN only at all zoom levels; always on (no layer toggle). See [IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md §22](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md).
- **Formation markers** — horizontal box with army crest + NATO symbol (corps/army_hq: XX/XXX); posture badge (D/P/A/E) when game state loaded; sizes by zoom (strategic 44×30, operational 54×38, tactical 66×46); readiness-colored inner glow; personnel strength (or ×N for corps) below symbol; name labels at tactical zoom only; AABB hit-test (marker dim + 4px margin); non-selected formations dimmed when one selected. Co-located markers stacked vertically. See [IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md §20](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md).
- **3D formation counter modes** — `D` cycles deterministic data modes (`strength`, `cohesion`, `supply proxy`, `posture`, `fatigue`) for 3D counters; corps tinting is deterministic from `(faction, corps_id)` hash and includes a soft-factor status triangle.
- **Order arrows** — attack (red solid), municipality move (dashed faction color), and settlement move (`brigade_movement_orders`, dashed faction color). **Retired order type:** brigade reposition orders are no longer a live player command; old save data may still carry `brigade_reposition_orders`, but desktop rejects new staging and the tactical-map adapter no longer surfaces amber reposition arrows. **Target selection mode:** Attack uses two-step confirmation (candidate + confirm), while Move uses settlement-selection mode with inline Confirm/Cancel and keyboard Enter/Esc shortcuts.
- **Interactive settlement panel** — 5-tab detail view (OVERVIEW, CONTROL, MILITARY, ORDERS/EVENTS, HISTORY). Overview merges identification and admin; no SID/ID/provenance; type in sentence case; includes `Population (1991)` and `Population (Current)` when game state displacement data is available; Military formation rows clickable. See §13.2, [GUI_POLISH_PASS_AND_REFACTOR_2026_02_14.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md).
- **Ops Planning Modal** — corps-level 4-phase flow (`src/ui/map/components/ops_modal/`, 16 files). Launched from CorpsDetail "Plan Operation" or CorpsFrontPanel "Draft New Directive". Phase 1: commander selection (officer cards with personality pips, prep time). Phase 2: plan (map-click objectives, auto-proposed brigades, pill-button parameters for type/tempo/tolerance/artillery). Phase 3: G2 assessment (clipboard with narrative military doc + raw intel tabs, live IPC predictions via `usePrediction`). Phase 4: authorize (formal OPORD with ODOBRENO stamp animation, IPC submission). **3D terrain** (pitch 30, DEM extrusion 2.5x from `terrain.pmtiles`). **Deck.gl animated arrows** (PathLayer with PathStyleExtension marching dashes, PolygonLayer arrowheads, TextLayer labels on `MapboxOverlay`). **Staging/objective selectability constraints** (front-edge adjacency: staging→adjacent enemies only, objective→adjacent friendlies only; non-selectable dimmed 45%). **Terrain-aware camera** (bearing from friendly→enemy centroid). **Terrain tooltip** on hover (elevation, terrain type, defense bonus, river/road warnings, selectable indicator). No checkboxes — all card/pill selection. Intel gate at <40% offers probe alternative.
- **Formation panel** — clicking a formation opens **Army Reserve Panel** (`ArmyReservePanel.tsx`) for `army_hq` formations, **corps panel** (personnel, **combat effectiveness** total + letter grade A-F + weak/disrupted counts, brigades, sectors, equipment aggregate; Sectors tab shows per-sector effectiveness + personnel; Ops tab; ORBAT tab), or **brigade panel** (Chain of Command, Statistics with **combat effectiveness** number + worst-modifier callout, AoR, **Front Assignment**, SET POSTURE, ATTACK/MOVE). **Army panel** shows whole-army combat effectiveness aggregate + grade. Combat effectiveness: `combatEffectiveness.ts` computes `base (personnel × equipment × experience × cohesion × honor) × fatigue × officer × homeDistance × morale × disruption × supply`. Grade: A (≥85% avg modifier), B (≥70%), C (≥55%), D (≥40%), F (<40%). Personnel always visible alongside.
- **Strategic zoom** — at maximum zoom out (zoom ≥ ZOOM_CORPS_ONLY_THRESHOLD, 2.6) only corps, corps_asset, and army_hq markers are shown (NATO XX or XXX symbol) and clickable; brigades are hidden. Small settlements rendered at reduced alpha (watercolor effect); large settlements full opacity. Corps/army_hq placed at `location_osid` when set (historical HQ OSID), else centroid of subordinates.
- **Staff Map (4th zoom)** — press `4` to enter drag-to-define region mode; draw a rectangle (minimum 5 settlements) to open a procedural paper-map overlay at 8× zoom (parchment background, terrain hatching, serif labels, full-detail formation counters, front lines, cartographic decorations). Exit button top-left; single player-faction crest as faded ink stamp (top-left, when player_faction set); faction stripe on counters, barbed-wire front lines, AoR crosshatch, contour lines, river labels, fold creases, contested overlay, coffee stain, margin annotations, irregular vignette. See [IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md §17, §18, §19](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md).
- **Settlement rendering** — main map draws settlement polygon **fills** only; inter-settlement border strokes are not drawn (removed 2026-02-17 per §17).
- **OOB sidebar** — WAR STATUS block (territory %, personnel, flips, pending orders, faction overview, alerts) plus full formation roster grouped by faction
- **Minimap** — overview with viewport rectangle
- **Search** — diacritic-insensitive fuzzy settlement search
- **Dataset switching** — Baseline (Apr 1992), September 1992, or any loaded game state; state is loaded via main menu (New Campaign / Load Save) or desktop IPC (`game-state-updated`). Replay sidecars attach to loaded endgame saves through `replay_save_manifest.json` / `replay_save_sequence.json`; full sequences can be inspected as read-only tactical-map frames from the Verdict replay scrubber, while sparse manifests remain summary-only. The replay scrubber includes read-only Play/Pause and step controls over the selected frame cursor. No standalone load-state controls exist on the map surface (layers are a bottom floating toolbar only).
- **Recruitment UI** — when loaded game state has recruitment and **player_faction** (e.g. after New Campaign): toolbar shows **Recruit** button; **R** hotkey opens a modal that lists only the player's side and only brigades recruitable right now, with cost legend (C = Capital, E = Equipment, M = Manpower); confirm applies recruitment and map shows placement feedback (new formation selected for 4s). See §13.8 and [RECRUITMENT_UI_FROM_MAP_2026_02_14.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md).
- **Desktop (Electron)** — when run as `npm run desktop`: main menu overlay (New Campaign / Load Save), load scenario/state and Advance turn from main process, AAR modal after turn advance when control events occur, Settings/Help modals (pruned: Settings shows "coming soon", Help shows shortcuts), and recruitment catalog/apply via IPC. In browser (no desktop): "New Campaign" appears as "Load Scenario"; Continue dimmed until state loaded. **New Game:** New Campaign opens a side-selection overlay (RBiH, RS, HRHB with flags); choosing a side invokes `start-new-campaign` IPC, loads the fixed April 1992 scenario, sets `meta.player_faction`, and injects recruitment state for the toolbar/Recruit modal (§13.6, [DESKTOP_GUI_IPC_CONTRACT.md](DESKTOP_GUI_IPC_CONTRACT.md), [GUI_DESIGN_BLUEPRINT.md](GUI_DESIGN_BLUEPRINT.md) §19.2). Replay summaries load with endgame saves when a sibling manifest is present.
- **Accessibility & discoverability** — Canvas has `aria-describedby` pointing to a live region that announces selected/hovered settlement. When the map has focus, Arrow keys move selection between settlements (deterministic sorted SID order), Enter opens the settlement panel; in Move settlement-selection mode, Enter confirms the staged selection and Esc cancels. Toolbar buttons, zoom controls, and layer toggles have `title` tooltips (with shortcuts where applicable).
- **Operational 3D map modes** — `F1/F2/F3/F4` switch `operations/supply/displacement/command` overlays in `map_operational_3d.ts`; overlays are fed by read-only IPC queries (`query-supply-paths`, `query-corps-sectors`) and deterministic state projections (`settlement_displacement`).
- **Operational 3D warmap visual & UX (2026-02-21)** — Two-tier formation counters (brigade: 128×72 light background; corps: 256×160 CRT-style with green name, strength/posture colors); stem lines from counters to terrain with radial-gradient dots; enhanced AoR (per-polygon hatch, perpendicular contact-edge segments), polygon-fill movement range, settlement highlight rings (HQ/move/attack); right-side panel stack (Selection with posture/deploy, Orders queue, Battle log, Forces summary); SELECT/ATTACK/MOVE mode toolbar (1/2/3, Escape). See [WARMAP_SANDBOX_VISUAL_UX_PORT_2026_02_21.md](../40_reports/implemented/WARMAP_SANDBOX_VISUAL_UX_PORT_2026_02_21.md).
- **Operational 3D battle replay** — current-turn control/battle events are replayed in stable sorted order using marker pulses; `K` skips replay.
- **Operational 3D command panel** — command mode displays army→corps→brigade hierarchy plus OOB parity warnings (missing corps references, unassigned brigades/corps) with deterministic ID sorting.
- **Loading, error, and empty states** — During initial data load a spinner and "Loading map data…" are shown; on failure a friendly error message and Retry button appear. OOB sidebar shows "No formations deployed" when game state is loaded but has no formations; settlement panel Military tab shows "No formations in this municipality." when applicable. Optional first-time quick tour (Tour button or automatic on first visit) with three steps; completion/dismiss sets `awwv.tacticalMap.tutorialDone` in localStorage.

There are no external map libraries (no Leaflet, Mapbox, Pixi.js). All rendering is done with the native Canvas 2D API.

- **map_hoi (2026-02-21, 2026-02-23, 2026-02-24)** — Parallel HoI-style entrypoint: `map_hoi.html` on same dev server (port 3002). Warm panel palette (§9.2 HOI_VISUAL_GUI_OVERHAUL_SPEC), class-based UI (TopCommandBar, ArmySidebar with CorpsCard/BrigadeRow, BottomStatusStrip), single HoIMapState, IPC (getCurrentGameState, setGameStateUpdatedCallback, advanceTurn). When WebGL is available, the map area uses **HoIMapRenderer** (2.5D Three.js): orthographic camera (tilt 10°–50°, `t`/`T` adjust; yaw ±30° orbit, middle-drag horizontal or Shift+right-drag horizontal), terrain mesh, **political control as texture on terrain** (2048×2048 faction overlay rasterized from operational_settlements.geojson, same geometry as terrain — no floating layer, no gaps at tilt), front ribbons (border-based, polygonOffset), Bézier order arrows, formation billboard sprites (zoom scaling), labels LOD, strategic points, enclave rings. Invisible control mesh retained for settlement hover/click raycasting. **At maximum zoom out** (zoom ≥ 2.6) only corps and army_hq markers are visible and clickable. **Corps/army_hq position:** `location_osid` when set (historical HQ OSID); else centroid of subordinates. Fallback: minimal 2D canvas with operational settlement outlines. Data: same GameStateAdapter and IPC contract; settlement layer from `data/derived/operational/operational_settlements.geojson`. See [20260223_HOI_MAP_3D_TILT_AND_TEXTURE_ON_TERRAIN.md](../40_reports/implemented/20260223_HOI_MAP_3D_TILT_AND_TEXTURE_ON_TERRAIN.md), [20260224_HOI_3D_FORMATIONS_ZOC_IMPLEMENTATION.md](../40_reports/implemented/20260224_HOI_3D_FORMATIONS_ZOC_IMPLEMENTATION.md), `docs/30_planning/20260221_settlement remapping and GUI rework`.
- **map_hoi layout (Phase 1 — Map + GUI layout):** Option C (responsive flex) is in use. The map container (`.hoi-map-wrap` / `#hoi-map-wrap`) is the **only growing flex child** (`flex: 1 1 auto`, `min-width: 0`); `#map-hoi-root` and `.hoi-main` have no scroll and no gap so the map fills available space without side dead space. If dead space remains in practice, Option A (full-bleed with overlaid panels) can be applied; that would require hit-test and focus-order documentation so panels do not block map interaction where intended.
- **Terrain smoothing (HoI + operational 3D):** Shared deterministic heightmap smoothing: `smoothHeightmap(hm, passes, radius)` in `terrain/heightmapSmooth.ts`. HoIMapRenderer applies it in-place (2, 2) after load, before buildTerrainMesh; operational 3D path may use the same helper. In-place contract; no cross-run variance.
- **HoI camera yaw (Phase 3):** Orbit yaw ±30° for left–right inspection. Middle-drag horizontal = yaw; Shift+right-drag horizontal = fallback. Left-drag = pan; right-drag vertical = pitch (tilt). Home resets pan, zoom, tilt, and yaw. Single place for camera state (pan, pitch, yaw); consistent with `t`/`T` tilt keys.
- **HoI label LOD (Phase 4):** When zoom is closer than DEFAULT_ZOOM/1.4 (zoom &lt; LABEL_LOD_ZOOM_THRESHOLD), label sprites use higher-res texture (256×64, 18px font); otherwise 128×32, 14px. Labels rebuild when zoom crosses threshold. Single zoom-band vs texture path; faction-overlay LOD deferred.
- **HoI front line (Phase 5):** Front = **full hostile boundary** (frontEdgesOsid / front_edges); no adapter or renderer filter by "where we have units." Style: single neutral band rgba(80,60,40,0.6), dark center line rgba(40,30,20,0.8), zoom-scaled width; asymmetric band (wider on player-faction side). Unit assignment to fronts is a later iteration.
- **HoI label resolution (Phase 4):** Settlement labels use a single higher-res texture (city 384×60 / 32px font, town 288×48 / 26px font) so they stay crisp when zoomed in; no LOD switch.
- **HoI front line style (Phase 5):** Fronts drawn as HoI4-style neutral band (rgba(80,60,40,0.6)), dark center line (rgba(40,30,20,0.8)), zoom-scaled width, asymmetric (wider on player-faction side). **Front = full hostile boundary** (war_front_edges_osid / front_edges); no filter by "where we have units" so user/bot can assign units to fronts in later iterations.

---

## 3. File Inventory

All source files live under `src/ui/map/` (13 files, ~2,600+ total lines):

| File | Lines | Role |
|------|------:|------|
| `tactical_map.html` | ~200 | HTML entry point — toolbar, canvas, panels, overlays, main menu, AAR/settings/help modals |
| `main.ts` | 17 | Bootstrap — `DOMContentLoaded` → `new MapApp('map-root').init()` |
| `MapApp.ts` | ~2640 | **Main orchestrator** — rendering, interaction, all UI wiring, order arrows, war status, tabs, desktop flow |
| `types.ts` | ~260 | Shared TypeScript interfaces; LoadedGameState includes attackOrders, movementOrders, recentControlEvents |
| `constants.ts` | 112 | Theme tokens, zoom factors, colors; `ZOOM_FORMATION_FILTER` (strategic zoom corps-only); `PANEL_READINESS_COLORS`, `panelReadinessColor()` |
| `vite.config.ts` | 101 | Vite config + custom `serveTacticalMapData` plugin |
| `styles/tactical-map.css` | ~400 | NATO ops center dark theme; IBM Plex Mono; 18 CSS custom properties; CRT scanline overlay; phosphor-green active states |
| `state/MapState.ts` | 164 | Observable state container with pub/sub |
| `geo/MapProjection.ts` | 182 | Data ↔ canvas coordinate transforms |
| `geo/SpatialIndex.ts` | 102 | Uniform-grid spatial index for hit testing |
| `data/DataLoader.ts` | 338 | Parallel data fetch, classification, search index, shared borders |
| `data/ControlLookup.ts` | 57 | SID key normalization (dual format) |
| `data/GameStateAdapter.ts` | ~216 | Parses `final_save.json` into LoadedGameState; extracts attackOrders, movementOrders, recentControlEvents (deterministic sort); corps_command, subordinateIds, corps_id per formation for corps/brigade panels |
| `map_hoi.html` | ~50 | HoI-style entrypoint — top bar, sidebar, map area, status strip |
| `map_hoi.ts` | ~120 | Bootstrap: HoIMapState, components, IPC, WebGL renderer or 2D placeholder |
| `styles_hoi.css` | ~250 | Warm palette (panel/card/section header), IBM Plex Mono + Sans Condensed, component layout |
| `map_hoi/*.ts` | — | BaseComponent, HoIMapState, TopCommandBar, ArmySidebar, CorpsCard, BrigadeRow, BottomStatusStrip, loadedStateToHoIState, MapPlaceholder, TooltipLayer |
| `renderer/HoIMapRenderer.ts` | ~530 | 2.5D Three.js: terrain, political control meshes, front ribbons, order arrows, formation sprites, labels LOD, strategic points, enclave rings |

**External dependency:** `src/map/nato_tokens.ts` — canonical color tokens shared with the warroom system.

---

## 4. Dependency Graph

```
tactical_map.html
  └─ main.ts
       └─ MapApp.ts
            ├─ state/MapState.ts ─────────── types.ts
            ├─ geo/MapProjection.ts ──────── types.ts, constants.ts
            ├─ geo/SpatialIndex.ts ───────── types.ts
            ├─ data/DataLoader.ts ────────── types.ts, ControlLookup.ts, MapProjection.ts
            ├─ data/ControlLookup.ts ─────── (pure, no deps)
            ├─ data/GameStateAdapter.ts ──── types.ts, ControlLookup.ts
            └─ constants.ts ──────────────── src/map/nato_tokens.ts (external)
```

All modules import types from `types.ts`. Data flows are unidirectional: DataLoader fetches → MapApp stores → MapState holds → render reads.

---

## 5. Data Pipeline

### 5.1 Files Loaded at Startup

`DataLoader.loadAllData()` fetches these files in parallel via `Promise.all`:

| File | Path | Required | Size | Contents |
|------|------|:--------:|-----:|----------|
| `settlements_a1_viewer.geojson` | `/data/derived/` | **Yes** | 2.4 MB | 5,823 settlement polygons with `sid`, `name`, `pop`, `nato_class`, `municipality_id`, `majority_ethnicity` |
| `political_control_data.json` | `/data/derived/` | **Yes** | ~500 KB | `by_settlement_id` maps SID → faction, `control_status_by_settlement_id` maps SID → status |
| `A1_BASE_MAP.geojson` | `/data/derived/` | No | 17 MB | 17k roads, 1.2k rivers, 1 national boundary, 110 control regions (municipalities) |
| `settlement_edges.json` | `/data/derived/` | No | ~1 MB | 17,116 adjacency pairs `{ a, b }` (S-prefixed SIDs) |
| `settlement_names.json` | `/data/derived/` | No | ~700 KB | Census ID → name + mun_code |
| `mun1990_names.json` | `/data/derived/` | No | ~23 KB | Municipality numeric ID → display_name + mun1990_id |
| `settlement_ethnicity_data.json` | `/data/derived/` | No | varies | 1991 census ethnicity composition per settlement |

### 5.2 Crest and flag assets

Crest and flag images are loaded from `/assets/sources/crests/` (see `assets/sources/crests/README.md` for required filenames). In **dev** the Vite plugin serves this path from the project root. For **production/Electron**, the Vite build copies `assets/sources/crests/` into `dist/tactical-map/assets/sources/crests/` so the app can serve them when run from that directory (e.g. packaged desktop app).

### 5.3 On-Demand Data

| File | Trigger | Contents |
|------|---------|----------|
| `political_control_data_sep1992.json` | Dataset dropdown → "September 1992" | Alternate control data |
| User-selected `final_save.json` | Main menu → Load Save, or desktop IPC | Game state with formations, militia pools, dynamic control |

### 5.4 Processing Pipeline

After fetching, `DataLoader` performs:

1. **Build settlements map** — `Map<string, SettlementFeature>` keyed by SID
2. **Build control lookups** — via `ControlLookup.buildControlLookup()` and `buildStatusLookup()`
3. **Classify base map features** — splits `A1_BASE_MAP` features by `role` property into `boundary`, `rivers`, `roadsMSR`, `roadsSecondary`, `controlRegions`
4. **Compute data bounds** — from settlement polygons, expanded by boundary
5. **Compute centroids** — settlement centroids (avg of outer ring vertices), municipality centroids (from control_region features)
6. **Build search index** — `SearchIndexEntry[]` with `displayName` (strips "Dio -..." suffix), normalized name (NFD + diacritic removal), bbox, centroid
7. **Compute primary label SIDs** — groups URBAN_CENTERs by municipality, picks the most populous per `displayName` to avoid overlapping labels
8. **Compute shared borders** — for each edge pair, extracts vertices that exist in both settlement polygon outer rings (used for front line rendering)

---

## 6. Coordinate System

The map uses a **custom coordinate space**, not WGS84 latitude/longitude. Data coordinates range approximately:

- **X:** -5 to 931
- **Y:** -9 to 905

These are pre-projected coordinates from the map build pipeline. The `MapProjection` class handles linear transforms between data space and canvas pixels:

```
Canvas pixel = (dataCoord - viewBox.min) * scale + offset
```

Where:
- `viewBox` narrows around `panCenter` as zoom increases
- `scale = min((canvasW - 2*padding) / viewW, (canvasH - 2*padding) / viewH)` (aspect-ratio preserving)
- `offset` centers the map within the canvas
- `padding` is 40px on all sides

### Key Methods

| Method | Signature | Purpose |
|--------|-----------|---------|
| `computeTransform` | `(canvasW, canvasH, zoomFactor, panCenter) → ViewTransform` | Compute full transform for current viewport |
| `project` | `(dataX, dataY, transform) → [canvasX, canvasY]` | Data → canvas pixels |
| `unproject` | `(canvasX, canvasY, transform) → [dataX, dataY]` | Canvas pixels → data |
| `isInViewport` | `(bbox, transform) → boolean` | Viewport culling test |

---

## 7. State Management

### MapState (`state/MapState.ts`)

All mutable application state lives in a single `MapState` instance. Uses an immutable snapshot pattern with pub/sub event emission.

**State shape** (`MapStateSnapshot`):

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `zoomLevel` | `0 \| 1 \| 2 \| 3` | `0` | Discrete zoom level (STRATEGIC / OPERATIONAL / TACTICAL / STAFF MAP when staff map active) |
| `zoomFactor` | `number` | `1` | Continuous zoom [1.0 – 5.0] |
| `panCenter` | `{ x, y }` | `{ 0.5, 0.5 }` | Normalized pan position [0,1] |
| `layers` | `LayerVisibility` | see below | 11 boolean layer toggles |
| `selectedSettlementSid` | `string \| null` | `null` | Currently selected settlement |
| `selectedFormationId` | `string \| null` | `null` | Currently selected formation (opens brigade panel, drives AoR highlight) |
| `hoveredSettlementSid` | `string \| null` | `null` | Currently hovered settlement |
| `settlementFillMode` | `'political_control' \| 'ethnic_majority'` | `'political_control'` | Whether settlement fill uses control or 1991 ethnic majority |
| `controlDatasetKey` | `string` | `'baseline'` | Active dataset identifier |
| `loadedGameState` | `LoadedGameState \| null` | `null` | Loaded game state for OOB/formations |
| `staffMapRegion` | `StaffMapRegion \| null` | `null` | When non-null, Staff Map overlay is active (region SIDs, bbox, selection rect); see §17. |

**Default layer visibility:**

| Layer | Default |
|-------|---------|
| `politicalControl` | on |
| `frontLines` | on |
| `labels` | on |
| `roads` | on |
| `rivers` | on |
| `boundary` | on |
| `munBorders` | off |
| `minimap` | on |
| `formations` | off (enabled when game state loaded) |
| *(brigadeAor removed 2026-02-17)* | AoR highlight now automatic when formation selected; no toggle. §22. |

**Event types emitted:**
`stateChanged`, `zoomChanged`, `panChanged`, `settlementSelected`, `settlementHovered`, `layerToggled`, `controlDatasetChanged`, `gameStateLoaded`

**Pattern:** Every mutation method creates a new snapshot object (`{ ...this._snapshot, ...changes }`) and emits the specific event plus `stateChanged`. The render pipeline subscribes to `stateChanged` and schedules a `requestAnimationFrame`.

---

## 8. Rendering Pipeline

### 8.1 Draw Order

The `render()` method in `MapApp.ts` draws 8 passes in painter's algorithm order (back to front):

```
Pass 1: Clear + Background
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = NATO_TOKENS.paper (#0d0d1a — dark navy)
  ctx.fillRect(0, 0, w, h)

Pass 2: Base Layers (offscreen cached)
  Always drawn. Boundary, municipality borders (if toggled), rivers, roads.
  Rendered to an offscreen <canvas>, reused when zoom/pan unchanged.

Pass 3: Settlement Polygons
  Iterated in sorted SID order for deterministic rendering. Only **fills** are drawn; inter-settlement border strokes are not drawn (removed 2026-02-17; see IMPLEMENTED_WORK_CONSOLIDATED §17).
  Fill with faction color (65% alpha) or neutral grey (or ethnic majority when Ethnic 1991 is on).
  Inter-settlement borders: same-faction (faint grid) or diff-faction (bright boundary) per constants.SETTLEMENT_BORDER.

Pass 4: Front Lines
  Visible at all zoom levels. Two-pass rendering per constants.FRONT_LINE:
  (1) Glow pass: wider amber halo (rgba(255,200,100,0.25), 6px)
  (2) Main pass: bright white dashed line (rgba(255,255,255,0.85), 2.5px, dash [8,4])
  Along shared polygon borders between different-faction settlements.

Pass 5: Formation Markers
  Only when game state loaded and formations layer enabled.
  `corps_asset` and `army_hq` formations are filtered out of `buildFormationsGeoJSON` — they are organizational concepts and do not render as map markers. They may still appear in command hierarchy panels (e.g. OOB sidebar, army HQ panel).
  Horizontal box: dark translucent bg, faction-colored border, drop shadow; army crest + NATO symbol; phosphor-green posture badge (D/P/A/E) when posture present.
  If a formation’s HQ is in enemy-controlled territory, marker is drawn at a fallback position (centroid of first friendly AoR settlement).
  Co-located markers (same HQ settlement) are grouped by quantized screen position (2px grid); groups with >1 marker are offset **vertically** (MARKER_STACK_GAP) so corps/brigade at same HQ stack top-to-bottom (buildFormationPositionGroups); hit-test uses the same grouping. See [TACTICAL_MAP_SEVEN_UI_SIM_FIXES_2026_02_15.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md).
  After Pass 5, when the selected formation is a corps or army_hq, **white** dashed lines (#ffffff, 60% opacity, 2px, 6/4 dash) are drawn from the formation to each subordinate (drawCorpsSubordinateLines); army_hq draws to subordinate corps.

Pass 5a: Order Arrows
  Only when game state loaded. Attack orders (red solid) from `loadedGameState.attackOrders`; municipality movement orders (dashed faction color) from `loadedGameState.movementOrders`; settlement movement orders (dashed faction color) from `loadedGameState.movementOrdersSettlement`. Retired `brigade_reposition_orders` are not surfaced by the player-facing adapter. Drawn in deterministic order (formation/target sorted).

Pass 6: Brigade AoR Highlight
  Only when game state loaded, brigade AoR layer on, and a formation selected.
  SIDs from `loadedGameState.brigadeAorByFormationId[selectedFormationId]`; draw order is deterministic (sorted SIDs). **Rendering:** Single compound path (all AoR polygons as subpaths) with `fill('evenodd')` at faction color; **fill alpha pulsed 0.08–0.22** (same sine wave as boundary glow, ~2s cycle); outer boundary only (internal edges skipped via sharedBorders) stroked at 2.5px; breathing glow (shadowBlur 2–6px sinusoidal). **Crosshatch color (2026-02-17):** diagonal hatch adapts to Control layer — black when Political Control ON (visible on faction fills), white when OFF (visible on dark background). **Crosshatch density (2026-02-17):** spacing 5px, width 1.5px, alpha 0.55. IMPLEMENTED_WORK_CONSOLIDATED §21, §22. Boundary cache invalidated on formation/AoR/zoom change. See [TACTICAL_MAP_SEVEN_UI_SIM_FIXES_2026_02_15.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md), [BRIGADE_AOR_OVERHAUL_CORPS_DIRECTED_2026_02_14.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md) §2.6.

Pass 6a: Targeting Overlay (target-selection mode only)
  When `pendingOrderMode` is active: attack mode dims own-faction settlements (35% black overlay); pulsing red border on hovered target; dashed red outline on candidate target (confirmation step). Municipality move mode keeps faction-colored municipality hover fill. Settlement Move mode highlights selected settlements, shows pulsing hover outlines with validity cues, and supports click-to-remove for selected settlements. Animation via requestAnimationFrame.

Pass 7: Selection Highlight
  Hovered: white semi-transparent outline.
  Selected: white + faction-colored double outline.

Pass 8: Labels
  LOD-filtered by zoom level. IBM Plex Mono. Dark halo on light text; brightness varies by settlement class.

Pass 9: Minimap
  Drawn on a separate 200×150 <canvas> element (constants.MINIMAP).
  Dark background; colored dots at settlement centroids + white viewport rectangle.
```

### 8.2 Offscreen Canvas Caching

Base layers (boundary, municipality borders, rivers, roads) are rendered to an offscreen `<canvas>` and cached. The cache key includes:

```
`${zoomFactor}:${viewBox.minX}:${viewBox.minY}:${canvasW}:${canvasH}:${layers.munBorders}`
```

The cache is invalidated when:
- Zoom or pan changes
- Canvas resizes
- Municipality borders toggle changes
- Control dataset switches

Boundary, rivers, and roads are **always drawn** (not toggleable) — they are base geography. Only municipality borders are conditional within the cached layer.

### 8.3 Render Scheduling

Renders are coalesced via `requestAnimationFrame`:

```typescript
private scheduleRender(): void {
  if (this.pendingRender) return;
  this.pendingRender = true;
  requestAnimationFrame(() => {
    this.pendingRender = false;
    this.render();
  });
}
```

Multiple state changes within the same frame result in a single render.

---

## 9. Settlement Rendering

Settlements are drawn in **sorted SID order** (`Array.from(keys).sort()`) for deterministic visual output. Fill source is controlled by **settlement fill mode** (state `settlementFillMode`; toggle via toolbar **Ethnic 1991** button only):

- **Political control (default):** fill by controlling faction (see below).
- **Ethnic majority (1991):** fill by census majority from `settlement_ethnicity_data.json` (or `feature.properties.majority_ethnicity`). Bosniak → RBiH green, Serb → RS crimson, Croat → HRHB blue, Other/unknown → grey.

Each settlement polygon is:

1. **Filled** (when Political control) with the controlling faction's color from `constants.SIDE_COLORS` (nato_tokens + 65% alpha):
   - RS: `rgba(180, 50, 50, 0.65)` (deep crimson)
   - RBiH: `rgba(55, 140, 75, 0.65)` (forest green)
   - HRHB: `rgba(50, 110, 170, 0.65)` (steel blue)
   - Null/unknown: `rgba(60, 60, 70, 0.35)` (grey)
   - If political control layer is off: `rgba(120, 120, 120, 0.2)`

2. **Inter-settlement borders** — *As of 2026-02-17*, inter-settlement border strokes are **not** drawn on the main map; only polygon fills are rendered. Front visibility is provided by the dedicated front-lines layer (§10). See [IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md §17](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md).

The polygon drawing method (`drawPolygonPath`) handles both `Polygon` and `MultiPolygon` geometries, iterating all rings and closing each path.

---

## 10. Front Lines

Front lines are rendered along the **actual shared border vertices** between adjacent settlements under different faction control. **Dual defensive arc (2026-02-17):** Paired faction-colored arcs on each side of the border; only where brigade AoR covers at least one adjacent settlement; glow + arc stroke + barb ticks (detHash for Bézier and barb wobble). Old single-line and defended/undefended partition removed. See IMPLEMENTED_WORK_CONSOLIDATED §24.

### 10.1 Shared Border Computation

At load time, `DataLoader.computeSharedBorders()` processes each edge from `settlement_edges.json`:

1. For each edge `{ a, b }`, look up both settlement features
2. Build a set of vertex keys (`"x,y"` strings) from settlement B's outer rings
3. Walk settlement A's outer ring, collecting vertices that also exist in B's set
4. If 2+ shared vertices are found, store as a `SharedBorderSegment { a, b, points }`

This works because adjacent settlement polygons share **exact coordinate vertices** in the GeoJSON data (92%+ of edges have 2+ shared points).

### 10.2 Rendering

During `drawFrontLines()` (visible at all zoom levels):

1. For each `SharedBorderSegment`, call `shouldDrawFrontSegment(ca, cb)` (see §10.3)
2. If true, draw two polylines through the shared `points` array:
   - **Glow pass:** `constants.FRONT_LINE.glowColor` (amber `rgba(255,200,100,0.25)`), width 6px, solid
   - **Main pass:** `constants.FRONT_LINE.color` (white `rgba(255,255,255,0.85)`), width 2.5px, dash `[8, 4]`

### 10.3 RBiH–HRHB: no front when allied

There is no front between RBiH and HRHB until they are at war. The map does not draw RBiH–HRHB front segments when:

- No game state is loaded (baseline control), or
- Loaded game state has `turn < rbih_hrhb_war_earliest_turn` (default 40, updated from 26 in 2026-03-17), or
- `war_alliance_rbih_hrhb > 0.2` (allied threshold; same as backend).

`LoadedGameState` includes `rbih_hrhb_war_earliest_turn` and `war_alliance_rbih_hrhb` (from `GameStateAdapter`); `shouldDrawFrontSegment(ca, cb)` uses them so the canvas matches sim front logic.

### 10.4 Front assignment and 2D/3D single source

**Single source of truth:** 2D tactical map and 3D operational map both consume the **same** game state. All live campaign load paths (file picker, desktop IPC `game-state-updated`, advance turn) supply the same raw `GameState` to the map layer. The 2D map uses `GameStateAdapter.parseGameState()` → `LoadedGameState`; the 3D map receives state via `push3DState` → `__awwv3dApplySave` → `toViewerSave()` (ViewerStateAdapter). Both adapters read from the same fields when given the same state. ReplayScrubber consumes the manifest-backed summary path for post-run inspection, can auto-advance its local read-only frame cursor with Play/Pause and step controls, and can hand full sequence frames to `gameStore.startReplayInspection(...)` for read-only map inspection; neither path becomes a live campaign load path.

**Front-related state:** Persisted in `GameState` and used by both views, but not all persisted front-era metadata remains a live player-shell concept:

- **`front_edges`** — Hostile-boundary edges (where two hostile settlements meet); derived each turn in the pipeline and persisted; 2D front-line layer and 3D front mesh use this when present (with identical fallback when absent).
- **`assignable_front_segments`** — Compatibility-era contiguous hostile-boundary segments derived from `front_edges`. They still exist in raw state and still support certain compatibility fallbacks in the engine, but the live tactical-map `LoadedGameState` no longer carries them as a player-shell DTO surface.
- **`brigade_front_assignment`** — Compatibility fallback mapping from brigade → `front_id`/reserve. The modern engine uses corps sectors as frontline authority once they exist; legacy front assignment survives for old-save/repair paths and selected fallback logic only.
- **`theatres`** and **`army_theatre_assignment`** — Still present in raw state for compatibility/sim lineage, but no current tactical-map `LoadedGameState` surface treats them as active player-facing UI ownership.

**Day-only 3D:** The operational 3D map starts in day mode (night mode disabled); no day/night toggle in the default flow.

**Verification:** See §21.3 (test plan) for canonical front-edge and 2D/3D parity checks. Front assignment / theatre naming checks in older reports should now be read as historical implementation context, not as the current live player-shell contract.

---

## 11. Label System

### 11.1 LOD Filtering

Labels are filtered by the current zoom level:

| Zoom Level | Factor | Name | Labels Shown |
|:----------:|:------:|------|-------------|
| 0 | 1.0x | STRATEGIC | URBAN_CENTER only |
| 1 | 2.5x | OPERATIONAL | URBAN_CENTER + TOWN |
| 2 | 5.0x | TACTICAL | URBAN_CENTER + TOWN only (2026-02-17: small settlement labels removed; §22) |

### 11.2 Deduplication

The data contains 5 "Sarajevo Dio - ..." URBAN_CENTER settlements (districts of Sarajevo), plus similar patterns for other cities. Without dedup, these would produce 5 overlapping labels at the same location.

**Solution:**

1. `computeDisplayName(name)` — strips the "Dio - ..." suffix: `"Sarajevo Dio - Centar Sajarevo"` becomes `"Sarajevo"`
2. `computePrimaryLabels(searchIndex)` — groups URBAN_CENTERs by municipality, then by `displayName`, picks the most populous entry per group. Returns `Set<string>` of SIDs that should show labels.
3. At strategic/operational zoom, only URBAN_CENTERs in `primaryLabelSids` are labeled, using `displayName` instead of the full name.
4. At tactical zoom, URBAN_CENTER and TOWN only use the full `name` (small settlement labels no longer shown; §22).

### 11.3 Rendering

Labels use halo text for readability over colored backgrounds:

```
ctx.strokeStyle = 'rgba(235, 225, 205, 0.85)'  // paper-colored halo
ctx.lineWidth = 3
ctx.lineJoin = 'round'
ctx.strokeText(label, sx, sy + 4)
ctx.fillStyle = '#222'
ctx.fillText(label, sx, sy + 4)
```

Font sizes: URBAN_CENTER → bold 12px, TOWN → 10px, others → 8px.

Labels are viewport-culled using `MapProjection.isInViewport()` against each entry's precomputed bbox.

---

## 12. Interaction Model

### 12.1 Zoom

- **Wheel zoom** — continuous adjustment of `zoomFactor` with sensitivity `0.0015 * factor`. Blends `panCenter` toward cursor position (30% blend). After 300ms idle, snaps to the nearest discrete level.
- **Keyboard** — `1`/`2`/`3` jump to STRATEGIC/OPERATIONAL/TACTICAL. `4` toggles Staff Map region selection or enters/exits Staff Map view (4th zoom level, 8× fixed). `+`/`-` step up/down one level.
- **Buttons** — toolbar and on-canvas `+`/`-` buttons.
- **Zoom range** — main map clamped to [1.0, 5.0]; Staff Map uses fixed 8× for the overlay.

### 12.2 Pan

- **Mouse drag** — only when zoomed in (`zoomFactor > 1`). Mousedown starts tracking, mousemove updates `panCenter` (clamped [0,1]), mouseup ends.
- **Click/drag distinction** — a `lastWasDrag` boolean is set in mouseup if `panDragDistance > 5`. Consumed in the click handler to prevent accidental selection.
- **Keyboard** — arrow keys move `panCenter` by ±0.05 per press.
- **Minimap click** — click position maps to normalized pan coordinates.
- **Reset** — `F`/`Home` resets to zoom 1, center (0.5, 0.5).

### 12.3 Hit Testing

1. Canvas mouse coordinates → `unproject()` → data coordinates
2. `SpatialIndex.queryPoint(dataX, dataY)` → bbox candidates
3. `pointInPolygon(x, y, feature)` — ray-casting algorithm on each candidate's outer ring
4. First match becomes `hoveredFeature`

The `SpatialIndex` is a 50x50 uniform grid over the data bounds. For ~6,000 settlements, this averages ~2.5 items per cell, making point queries effectively O(1).

### 12.4 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` / `2` / `3` | Jump to STRATEGIC / OPERATIONAL / TACTICAL |
| `4` | Enter/exit Staff Map region selection or Staff Map view (4th zoom) |
| `+` / `=` | Zoom in one level |
| `-` | Zoom out one level |
| `F` / `Home` | Fit entire map (zoom 1, center) |
| Arrow keys | Pan by 0.05 |
| `/` or `Ctrl+F` | Open search |
| `Escape` | Cancel targeting mode (first priority) → close radial menu → close search → deselect settlement → close overlay/modal (cascade) |
| `O` | Toggle OOB sidebar |
| `Space` | (Desktop) Advance turn |
| `M` | (Desktop) Toggle main menu overlay |
| `R` | (Desktop) Open Recruitment modal when state has recruitment |

### 12.5 Right-Click Radial Context Menu (2026-03-19)

Right-click on any map element opens a `RadialMenu` (animated ring of actions at cursor). Contextmenu handler in `useMapInteractions.ts` queries rendered features with same priority as click: formation > front-edge > OSID > empty.

| Target | Menu items |
|--------|-----------|
| Formation | View Unit, View Corps |
| OSID | Settlement Info, View Sector |
| Front edge | Sector Detail |
| Empty space | Deselect All |

Browser default context menu suppressed on map canvas. Dismissed by click-outside or Escape.

**Component:** `src/ui/map/components/RadialMenu.tsx`

### 12.6 OSID Click Highlight (2026-03-19)

Clicking a settlement highlights its OSID polygon with a gold outline (`osid-selected-outline` layer, `rgba(220, 190, 120, 0.9)`, 2.5px). Cleared on empty-space click.

### 12.7 Hover Priority (2026-03-19)

When cursor is near a front line, both OSID and front-edge hover handlers fire. OSID hover suppresses its tooltip when `queryRenderedFeatures` finds a front-edge hit at the same point — front-line tooltip takes priority.

---

## 13. UI Components

### 13.0 War Status and Replay Artifacts

**War Status** — Block in the OOB sidebar (or dedicated area when OOB closed): territory share by faction, personnel, flip counts, pending orders summary, faction overview, and alerts. Updated on state load and after advance-turn (desktop).

**Replay artifacts** — Scenario harnesses can emit ordered weekly save sequences plus sparse manifests. The canonical desktop/map UI exposes the read-only `VerdictScreen` replay scrubber for loaded endgame saves with sibling replay artifacts. The scrubber can manually scrub, jump to first/last, step one frame at a time, or Play/Pause auto-advance the local cursor without advancing turns or mutating engine state. Full `replay_save_sequence.json` frames can be selected for map inspection, temporarily swapping the UI read model to that parsed frame and restoring the final endgame state through the replay inspection banner. Large saves should use `replay_save_manifest.json` instead of forcing the renderer to parse the full frame array; manifests provide deterministic summaries but not map-state inspection.

**Toolbar date** — Top-right label shows deterministic campaign date derived from `meta.turn` with April 1992 anchor. This replaces turn/capital/army summary text in the toolbar.

### 13.1 Layer toolbar (bottom floating)

A **bottom floating toolbar** (`.tm-layer-toolbar`) centred above the status area provides layer toggles only:

- **Checkboxes:** Political control, Front lines, Municipality borders, Minimap, Formations (OOB). Labels and Brigade AoR toggles removed (2026-02-17): labels always on; AoR highlight automatic when a formation is selected. Same element IDs for remaining layers (`layer-control`, `layer-frontlines`, etc.). IMPLEMENTED_WORK_CONSOLIDATED §22. **React+MapLibre app (canonical GUI, 2026-03-02):** MapModeToolbar layer toggles: Fronts, Formations, Labels, Sectors. Map modes: Political, Ethnic, Supply, Pressure, Density.
- **No standalone load/dataset controls on map:** Load State/Save selection and dataset switching are not on the map surface; loading is via **main menu** (Menu → New Campaign / Load Save) or desktop IPC (`game-state-updated`). Replay sidecars attach to loaded saves and render only through the endgame replay scrubber.

Settlement fill mode (political control vs ethnic majority 1991) is toggled by the **Ethnic 1991** toolbar button only; legend and tooltip reflect the current mode.

Note: Rivers, roads, and boundary are **not** in the layer toolbar — they are always-on base geography. *Implementation note (2026-02-17):* Legacy top-right Layers panel was replaced by this bottom toolbar; load/run/replay UI removed from map surface per IMPLEMENTED_WORK_CONSOLIDATED §15.

### 13.2 Settlement Panel

Right-side sliding panel (e.g. 20rem width) opened on settlement click; closes on Escape or close button. Uses the same horizontal tab style as sector/operations panels (border-b, active tab border-accent-gold). See [20260307_SETTLEMENT_PANEL_RICH_CONTENT_AND_TABS.md](../40_reports/implemented/20260307_SETTLEMENT_PANEL_RICH_CONTENT_AND_TABS.md).

**Header:** Settlement name; strategic/hub/terrain tags when applicable.

**3 Tabs:**

| Tab | Content |
|-----|--------|
| **Overview** | Municipality, political control, status (CONSOLIDATED/CONTESTED/HIGHLY_CONTESTED). Population (1991) and Population (Current) with dramatic change (Out/In/Lost, arrived by faction). “Fled from this settlement” by **nation** (Bosniaks, Serbs, Croats, Others) not faction code. Pre-war ethnic structure (bar chart). **Current ethnic structure** (bar chart when displacement/departures allow computation). Terrain context. |
| **Military** | Front sector (name + faction when OSID is in a corps front sector; "sector" here means front-line OSIDs from `sub_segments.friendly_osids`, not full territory depth). Stationed units: formation rows with readiness badge, cohesion bar, personnel; rows clickable to open Formation detail. Militia pool for the municipality (available/committed/exhausted stacked bar per faction). |
| **Orders & events** | Operations targeting this OSID. Pending attack/move orders affecting this settlement (with brigade names when available). Recent control events from `loadedGameState.recentControlEvents`. |

Tooltip variant (hover) shows a single scroll of key fields without tabs.

### 13.3 Formation Panel (Corps and Brigade)

When the user **clicks a formation marker** on the map (with game state loaded), the right panel opens as a **formation detail panel**. The same 340px right panel is used. **army_hq** formations open **ArmyReservePanel** (`src/ui/map/components/ArmyReservePanel.tsx`): three sections — **Reserve Pool** (all faction elite brigades with READY/ON LOAN/COOLDOWN/DEGRADED status badge, personnel bar, Recall button), **Pending Requests** (unresolved player-faction loan requests with reason chip, priority bar, APPROVE/Dismiss), **Campaign History** (collapsible, per-brigade loan totals + episode log). Width: 26rem. IPC: `approve-reserve-request`, `recall-elite-brigade`. **Army HQ Modal** (keyboard `H`, `armyHQOpen` store flag) is the full-screen nerve center with dark warroom aesthetic — see [MAP_UI_MASTER.md](MAP_UI_MASTER.md) §Army HQ Modal for full description. Key surfaces: Situation Briefing (CRITICAL/WARNING/INFO alerts), Threat Assessment (from `sectorIntel`: active threats, hardened positions, intelligence gaps), Force Readiness (per-corps grade with recommendations), Supply Intelligence (canonical constants, enclave resilience, runway projection), and FlipCard corps cards (readiness border, threat badge, health stripe). **Corps/corps_asset** formations open a **corps panel**; all other kinds open a **brigade panel**. See [GUI_POLISH_PASS_AND_REFACTOR_2026_02_14.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md), [TACTICAL_MAP_SEVEN_UI_SIM_FIXES_2026_02_15.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md).

**Corps panel** — Sections: CORPS COMMAND (stance, exhaustion, command span); STRENGTH (subordinate count, total personnel); OPERATIONAL GROUPS (OG slots, active OGs with names); ORDER OF BATTLE (clickable subordinate formation rows). **ACTIONS:** corps stance dropdown (defensive/balanced/offensive/reorganize) via `stage-corps-stance-order` IPC; bulk subordinate posture (dropdown + "Apply" calls `stagePostureOrder` per brigade). Frontline geometry and sector ownership are no longer staged through corps-front edge commands; the live shell treats sectors and operation-planning flows as the canonical front-facing authority. At strategic zoom only corps/corps_asset/army_hq markers are shown and hit-tested.

**Brigade panel (n717, 2026-03-14)** — 3-tab layout. **Header:** DIG IN quick-action button (when deployed) + close. ATK/MOV buttons intentionally absent — direct brigade attack/move orders bypass CorpsOperation machinery and are not valid player commands. **Tab: Overview** — formation name; corps assignment (clickable → corps panel); sector assignment (clickable → sector panel, shows "Override" badge when `brigade_sector_override` active); posture/readiness; officer info; decorations/honor; TO&E; stats grid (cohesion, morale, fatigue, personnel, entrenchment, disruption, exhaustion); movement status; location; narrative arc. **Tab: Record** — `CombatSummaryPanel`; KIA/WIA estimates; longest win streak; turns under siege; equipment destroyed brag board; recent 8 engagements log. **Tab: Orders** — (1) *Home-distance effectiveness widget*: badge ("Home Turf" / "X% Eff [elite]"), dual power stats (personnel at 100% home vs current effective, hops count); (2) *Sector picker*: same-corps sectors listed with override/current badges; selecting a sector calls `assign-brigade-to-sector` IPC (permanent `brigade_sector_override`, cleared via "Clear Override" button); sector commander then marches brigade to frontline position; (3) *Combat stance* — 8 postures (hold/defend/defend_at_all_costs/elastic_defense/counterattack/dig_in/attack/assault); attack/assault blocked when `home_defense_active` unless operation-owned. **Map desaturation (Layer 4):** formation marker `icon-opacity = home_distance_mult × 0.96` — brigades away from home visibly fade on map. `home_distance_mult` from `home_distance_cache` (pre-computed BFS hops by `buildHomeDistanceCache()`).

**Zoom to selection:** Toolbar zoom-in (or shortcut) pans to the centroid of the selected settlement or formation (formation uses HQ settlement or municipality centroid).

When the Brigade AoR layer is on, the selected formation’s AoR settlements are highlighted on the map (light faction fill + dashed outline). Closing the panel or pressing Escape clears `selectedFormationId` and the brigade AoR highlight. Clicking a settlement still opens the settlement panel (5 tabs) as before.

### 13.4 OOB Sidebar (Command rail)

**Canonical implementation (React map):** Fixed left column **`OOBSidebar.tsx`** (`w-72` = 18rem), not the legacy sliding panel. Accordion sections: Situation, Army, Mobilization, Operations, Sectors; **Army** lists factions with **CorpsCard** per corps. See **`GUI_MASTER.md`** and live reference [20260327_COMMAND_SIDEBAR_LAYOUT_KNOWLEDGE.md](../40_reports/implemented/20260327_COMMAND_SIDEBAR_LAYOUT_KNOWLEDGE.md).

**Toolbar clearance (2026-03-27):** The sidebar’s `top` is **`var(--awwv-toolbar-clearance, 7.5rem)`** ( **`8.5rem`** when `devMode` ), set from **`App.tsx`** together with right-hand detail panels. That value clears the **centered floating army crest** (100px image + label) and the **dev tools strip**, not only the 48px Presidential bar — so the **left** rail starts **much lower** than the thin top bar. **Open UX debt:** split clearance for left rail vs. center/right, or accept crest overlapping the top-left; see knowledge doc §5.

**Legacy note:** Older docs described a 300px sliding OOB toggled with **OOB** / `O` key and often treated `TopToolbar` as the main shell owner; the current product uses **PresidentialToolbar** + this fixed Command rail, while `TopToolbar` survives only as legacy reference material.

Groups formations by faction (RBiH, RS, HRHB). Each faction section shows:
- Header with faction badge, label, count, and average cohesion
- Corps cards and formation rows; reserves and HQ entries as implemented in `OOBSidebar.tsx`
- Total militia pool summary (available/committed/exhausted) where applicable
- Clickable rows — selection opens detail panels / map focus per current behavior

### 13.5 Search Overlay

Centered top overlay with text input and results dropdown. Max 12 results. Diacritic-insensitive via NFD normalization + `\p{Diacritic}` stripping. Selecting a result:
1. Jumps to tactical zoom
2. Centers on settlement centroid
3. Selects the settlement (opens panel)

### 13.6 Main Menu and Modals

**Main menu overlay** — (Desktop) Full-screen overlay with New Campaign / Load Save. Toggle with toolbar "Menu" or `M`. Escape closes. **New Campaign** (desktop only): closes the menu and shows a **side-picker overlay** (three options with faction flags: RBiH, RS, HRHB). Choosing a side calls `start-new-campaign` IPC; the app loads the canon April 1992 scenario (`apr1992_definitive_52w.json`), sets `meta.player_faction`, injects `recruitment_state`, and applies the state to the map. In browser (no desktop IPC), New Campaign falls back to triggering "Load scenario…" (file picker).

**Modals** — **Turn Aftermath** (opens after a successful desktop `advance-turn`; reads `latestTurnSummary` + unified inbox obligations and links to Inbox / War Summary / Army HQ Records; Army HQ Records now also shows active campaign cost-so-far from the full turn archive), AAR (legacy turn report surfaces), **War Summary** (per-faction: formation count, personnel, attack/move order counts, control gained/lost; BATTLES THIS TURN section with settlement-level control changes and faction colors; ALL CONTROL EVENTS total; in player mode includes a compact campaign-cost block when archived turns exist), **Chronicle** (campaign timeline from `turnSummaries`; includes combat/political/humanitarian/military/diplomatic/narrative entries plus `COST` cards for severe or critical player-scoped cost turns; header filters review All, Headlines, Cost, Combat, Political, Humanitarian, Military, Diplomatic, and Narrative entries with the side dossier following the active lens; dossier entries can open their matching Army HQ `TURN AFTERMATH` record), Settings ("Settings coming soon."), Help (title "Help", intro paragraph, KEYBOARD SHORTCUTS subsection). Each modal has a backdrop and close button; Escape closes the topmost. See [TACTICAL_MAP_SEVEN_UI_SIM_FIXES_2026_02_15.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md), [20260501_TURN_AFTERMATH_PRODUCT_SPINE_C1.md](../40_reports/implemented/20260501_TURN_AFTERMATH_PRODUCT_SPINE_C1.md), [20260502_ACTIVE_CAMPAIGN_COST_SPINE.md](../40_reports/implemented/20260502_ACTIVE_CAMPAIGN_COST_SPINE.md), [20260502_CHRONICLE_COST_MEMORY.md](../40_reports/implemented/20260502_CHRONICLE_COST_MEMORY.md), [20260502_CHRONICLE_REVIEW_TOOLS.md](../40_reports/implemented/20260502_CHRONICLE_REVIEW_TOOLS.md), and [20260502_CHRONICLE_TURN_RECORD_DEEP_LINK.md](../40_reports/implemented/20260502_CHRONICLE_TURN_RECORD_DEEP_LINK.md).

### 13.8 Recruitment Modal

When the loaded game state has `recruitment` (from `recruitment_state`) and **player_faction** is set (e.g. after New Campaign side picker), the toolbar shows a **Recruit** button. Clicking it or pressing **R** opens a modal that:

- **Player-side only:** Only brigades of the player's side (`player_faction`) are considered. If `player_faction` is not set, the modal prompts to start a New Campaign and choose a side.
- **Recruitable list only:** The table lists only brigades the player **can recruit right now** (not already recruited, `available_from` ≤ turn, and sufficient Capital, Equipment, and Manpower from the home municipality's militia pool). If none are recruitable, a message explains that more resources are needed.
- **Cost legend:** Costs are shown as **C** = Capital, **E** = Equipment, **M** = Manpower (from militia pool). The resources line shows the player's current Capital and Equipment; the table column "Pool (M)" shows available manpower per brigade home.
- **Catalog:** Loaded via `get-recruitment-catalog` IPC (desktop); in browser, a message explains that the catalog requires the desktop app.
- **Confirm:** In desktop, **Select** chooses a brigade and enables **Activate brigade**; confirm sends `apply-recruitment` IPC; updated state is pushed to the renderer and the new formation is briefly selected (4s) for placement feedback. In browser, confirm shows that apply is desktop-only.

See [RECRUITMENT_UI_FROM_MAP_2026_02_14.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md).

### 13.7 Other

- **Minimap** — 180x120 canvas, bottom-left. Colored dots for settlements, white viewport rectangle. Clickable for navigation.
- **Tooltip** — positioned near cursor on hover. Shows "Name — Controller — pop X".
- **Legend** — bottom-left panel with faction color swatches + front line dash (content depends on fill mode).
- **Zoom pill** — top-left toolbar badge showing STRATEGIC / OPERATIONAL / TACTICAL.

---

## 14. Game State Loading

### 14.1 Flow

```
User loads state via main menu (Load Save) or desktop IPC (e.g. after New Campaign) → file picker or IPC payload
  → Read file text → JSON.parse
  → GameStateAdapter.parseGameState(json)
    → Extract meta.turn, meta.phase → label "Turn X (phase)"
    → Flatten formations record → FormationView[]
      → Parse tags for 'mun:xxx' → municipalityId
    → Flatten militia_pools record → MilitiaPoolView[]
    → Extract political_controllers → buildControlLookup()
    → Extract contested_control → buildStatusLookup()
  → MapState.loadGameState(loaded)
    → Auto-enables formations layer
  → Update active control/status lookups (map re-colors)
  → Update loaded-state label (status/title reflects current dataset)
  → Update OOB sidebar
  → Invalidate base layer cache → re-render
```

### 14.2 GameStateAdapter

`parseGameState(json)` in `data/GameStateAdapter.ts` does defensive parsing with fallback defaults. Formation IDs and militia pool keys are sorted before iteration for deterministic output. Active player-facing order fields in GameState are **Records** (not arrays): `brigade_attack_orders` is `Record<FormationId, SettlementId | null>`, `brigade_mun_orders` is `Record<FormationId, MunicipalityId[] | null>`, and `brigade_movement_orders` is `Record<FormationId, { destination_sids: SettlementId[] }>` (all iterated in sorted order). Legacy `brigade_reposition_orders` may still exist in saves, but they are treated as retired compatibility data rather than a live map-shell order type.

- **attackOrders** — from `state.brigade_attack_orders`; each entry has formationId, targetSid, faction; sorted by formationId then targetSid.
- **movementOrders** — from `state.brigade_mun_orders`; each entry has formationId, fromSid, toSid, faction; sorted by formationId then toSid.
- **movementOrdersSettlement** — from `state.brigade_movement_orders`; each entry has brigadeId + sorted destination settlement IDs.
- **repositionOrders** — retired. Player-facing `LoadedGameState` no longer exposes `state.brigade_reposition_orders`.
- **recentControlEvents** — from `state.control_events` (or replay `control_events`), filtered to the current turn and sorted by settlement id for stable display.
- **recruitment** — when `state.recruitment_state` exists: `capitalByFaction`, `equipmentByFaction` (via `pointsByFaction()` with sorted keys), and `recruitedBrigadeIds` (sorted); used by the Recruitment modal (§13.8).
- **player_faction** — from `state.meta.player_faction` when set (desktop New Game); indicates which side the human plays (RBiH, RS, or HRHB). Used by the Recruitment modal to show only the player's brigades and only those recruitable at the moment (§13.8).

### 14.3 Harness Replay Artifacts

`replay_timeline.json` can still be emitted by `runScenario(..., emitWeeklySavesForVideo: true)` (`--video` in harness CLI) for offline analysis/video workflows. The canonical desktop/map UI now consumes the separate `replay_save_manifest.json` / `replay_save_sequence.json` sidecars for the `VerdictScreen` replay scrubber, not `replay_timeline.json`. The timeline file shape:

- `meta` — optional run metadata (`run_id`, `scenario_id`, `weeks`)
- `frames[]` — sorted by `week_index`; each frame stores a serialized game state
- `control_events[]` — settlement flip events (`turn`, `settlement_id`, `from`, `to`, `mechanism`, `mun_id`)

Playback pipeline:

1. Sort frames by `week_index` (deterministic)
2. Parse frame game state through `parseGameState`
3. Update map control + formations for that week
4. Lookup `control_events` for the frame's turn
5. Apply temporary fire overlays to flipped settlements

This uses existing formation rendering logic, so brigade movement appears as week-to-week marker position changes.

Key field mappings from `final_save.json`:
- `meta.turn` → `turn`
- `meta.phase` → `phase`
- `formations[id].faction` → `faction`
- `formations[id].tags` (array containing `"mun:xxx"`) → `municipalityId`
- `formations[id].ops.fatigue` → `fatigue`
- `formations[id].personnel` → `personnel`
- `formations[id].posture` → `posture` (brigade posture: hold/defend/defend_at_all_costs/elastic_defense/counterattack/dig_in/attack/assault)
- `militia_pools[key].mun_id` → `munId`
- `political_controllers` → `controlBySettlement` (via `buildControlLookup`)
- `contested_control` → `statusBySettlement` (via `buildStatusLookup`)
- `brigade_aor` → reverse index: for each formation ID, the sorted list of settlement IDs in that formation’s AoR is stored in `loadedGameState.brigadeAorByFormationId`; each `FormationView` also gets `aorSettlementIds` (same list for that formation).
- `brigade_attack_orders` → `attackOrders` (AttackOrderView[]); `brigade_mun_orders` → `movementOrders` (MovementOrderView[]); `control_events` → `recentControlEvents` (RecentControlEventView[]), typically filtered to current turn.

The **brigade AoR** data comes from `state.brigade_aor` (Record<SettlementId, FormationId | null>). The adapter inverts this into `brigadeAorByFormationId: Record<FormationId, SettlementId[]>` with settlement IDs sorted for deterministic display and rendering.

---

## 15. Dual SID Key Normalization

The project uses two SID formats in different data sources:

| Format | Example | Used In |
|--------|---------|---------|
| S-prefixed | `S100013` | GeoJSON features (`sid` property), settlement_edges.json |
| mun:census | `10014:100013` | political_control_data.json, game state |

`ControlLookup.ts` bridges this gap:

- **`controlKey(sid)`** — ensures S-prefix: `"100013"` → `"S100013"`, already-prefixed passes through
- **`buildControlLookup(bySettlementId)`** — copies the input, then for every `"mun:census"` key, also creates an `"Scensus"` entry
- **`buildStatusLookup(statusBySettlementId)`** — same dual-key normalization
- **`censusIdFromSid(sid)`** — strips S-prefix: `"S100013"` → `"100013"`

When looking up control, code tries both `controlKey(sid)` and the raw `sid` as fallback.

---

## 16. Vite Configuration

`src/ui/map/vite.config.ts` configures:

- **Root:** `src/ui/map/` (via `__dirname`)
- **Port:** 3002; Electron probes Vite at `127.0.0.1:3002-3005`. For Electron parity during local inspection, run with `-- --host 127.0.0.1` if the dev server is not reachable through the desktop probe.
- **Build output:** `dist/tactical-map/`
- **Entry:** `tactical_map.html` (rollup input)
- **Alias:** `@` → project `src/` directory (resolved via Vite, not tsconfig)

### Custom Plugin: `serveTacticalMapData`

A Vite middleware plugin inserted at the front of the middleware stack. Intercepts GET requests for `/data/*` and `/assets/*` paths:

1. **Skips source files** — `.ts`, `.js`, `.tsx`, `.jsx`, `.mjs`, `.cjs`, `.vue`, `.svelte` are passed to Vite's module system. This prevents the plugin from serving `DataLoader.ts` as a static file.
2. **Resolves file path** — tries both `cwd()` + pathname and config-relative root + pathname
3. **Serves with correct MIME** — `.json`/`.geojson` → `application/json`, `.png` → `image/png`, `.jpg` → `image/jpeg`, default → `application/octet-stream`
4. **Synchronous read** — uses `readFileSync` (simple but blocks the event loop; fine for dev)

---

## 17. Constants and Theming

### 17.1 Color Tokens (`src/map/nato_tokens.ts`)

This is the **canonical color source** shared with the warroom system:

| Token | Value | Purpose |
|-------|-------|---------|
| `paper` | `#ebe1cd` | Canvas background (aged beige) |
| `RS` | `rgb(180, 50, 50)` | Serb faction (crimson) |
| `RBiH` | `rgb(70, 120, 80)` | Bosniak faction (forest green) |
| `HRHB` | `rgb(60, 100, 140)` | Croat faction (steel blue) |
| `hydrography` | `rgb(100, 150, 200)` | Rivers and water (dusty blue) |
| `MSR` | `#A0A0A0` | Major Supply Routes (grey) |
| `secondaryRoad` | `#D0D0D0` | Secondary roads (light grey) |
| `contours` | `rgb(139, 90, 43)` | Elevation contours (burnt umber) |

`factionFill(faction, alpha)` generates `rgba()` strings for map overlays. Default alpha is 0.4; the tactical map uses 0.55.

### 17.2 Local Constants (`constants.ts`)

| Constant | Value | Purpose |
|----------|-------|---------|
| `SIDE_COLORS` | faction → `rgba(r,g,b,0.55)` | Map polygon fills |
| `SIDE_SOLID_COLORS` | faction → `rgb(r,g,b)` | Panel borders, badges |
| `SIDE_LABELS` | `'RBiH (ARBiH)'`, `'RS (VRS)'`, `'HRHB (HVO)'`, `'Neutral'` | Human-readable names |
| `ZOOM_FACTORS` | `[1, 2.5, 5]` | Three discrete zoom levels |
| `ZOOM_LABELS` | `['STRATEGIC', 'OPERATIONAL', 'TACTICAL']` | Zoom level names |
| `BASE_LAYER_COLORS` | boundary `#333`, river `hydrography`, roads `MSR`/`secondaryRoad`, mun fill `rgba(180,170,150,0.03)`, mun stroke `rgba(80,60,40,0.35)` | Base geography colors |
| `BASE_LAYER_WIDTHS` | boundary 2px, river 1.5px, MSR 2px, secondary 0.8px, mun 1px | Base geography line widths |
| `FRONT_LINE` | color `#000`, width 3, dash `[6,4]` | Front line style |
| `MINIMAP` | 180 x 120 | Minimap canvas dimensions |
| `PANEL_WIDTH` | 340 | Settlement panel width in px |
| `MAP_PADDING` | 40 | Canvas edge padding in px |

### 17.3 How to Change Colors

- **Faction colors:** edit `src/map/nato_tokens.ts` (affects both tactical map and warroom)
- **Faction overlay alpha:** edit `SIDE_COLORS` in `constants.ts` (currently 0.55)
- **Road/river colors:** edit `BASE_LAYER_COLORS` in `constants.ts`
- **Front line style:** edit `FRONT_LINE` in `constants.ts`
- **Municipality border visibility:** edit `controlRegionStroke` and `controlRegion` width in `constants.ts`

---

## 18. CSS Theme (`styles/tactical-map.css`)

The entire UI uses a dark wargame theme (316 lines). Key decisions:

- **Background:** `#1a1a2e` (deep navy)
- **Text:** `#e0d8cc` (warm cream)
- **UI chrome:** `#4a4238` / `#5a5248` (brown-tinted)
- **Buttons:** dark backgrounds with light text, subtle hover states
- **Layout:** 3-column flex — OOB sidebar | map canvas | settlement panel
- **Canvas:** fills available space via `flex: 1 1 auto; min-width: 0`
- **Panels:** slide in/out with CSS class toggles (`open`/`closed`)
- **Custom property:** `--faction-color` set dynamically for panel tab accents

---

## 19. Extension Points

### Adding a New Layer

1. Add a boolean field to `LayerVisibility` in `types.ts`
2. Set default value in `DEFAULT_LAYERS` in `state/MapState.ts`
3. Add a checkbox in `tactical_map.html` (layer panel body)
4. Add entry to `layerMap` array in `MapApp.wireUI()`
5. Add rendering logic in `MapApp.render()` at the appropriate draw order position
6. If it's part of base geography, add it to `drawBaseLayersCached()` and update the cache key

### Adding a New Panel Tab

1. Add the tab to the `tabs` array in `MapApp.buildPanelTabs()`
2. Create a `renderXxxTab()` method returning an HTML string
3. Add the rendering call in the `renderTab()` switch

### Adding a New Data Source

1. Add the fetch to `DataLoader.loadAllData()` (use `loadJsonOptional` if not required)
2. Add the type to `types.ts`
3. Add the field to `LoadedData` interface
4. Pass through in the return object

### Adding a New Zoom Level

1. Add a new entry to `ZOOM_FACTORS` and `ZOOM_LABELS` in `constants.ts`
2. Update `ZoomLevel` type in `types.ts` (e.g., `0 | 1 | 2 | 3`)
3. Update keyboard handler for the new key
4. Update LOD filtering in `drawLabels()` and `drawFrontLines()`

---

## 20. Known Limitations

| Issue | Description | Location |
|-------|-------------|----------|
| ADMIN tab municipality names | Some municipalities show as numeric IDs instead of display names due to key format mismatch between `municipality_id` (numeric) and `mun1990_names.by_municipality_id` (string keys) | `MapApp.renderAdminTab()` |
| Stability score placeholder | The CTRL tab shows "Stability score and control strain available in early-war+" — not yet wired to data | `MapApp.renderControlTab()` |
| Municipality-level status | `GameStateAdapter` reads `state.municipalities` control_status but doesn't propagate it to settlement-level status | `GameStateAdapter.ts:98-107` |
| Synchronous file serving | The Vite plugin uses `readFileSync` which blocks the event loop on the 17MB A1_BASE_MAP.geojson | `vite.config.ts` |
| No production build script | `npm run dev:map` only starts dev server; no dedicated `build:map` script exists | `package.json` |
| Formation markers | NATO-style: 1.5:1 rectangular frame, faction fill, readiness inner glow, strength number (or ×N) below symbol, name label at tactical zoom; AABB hit-test (dim + 4px). Sizes by zoom: strategic 44×30, operational 54×38, tactical 66×46. Co-located markers offset vertically; non-selected dimmed when one selected. ResizeObserver on canvas wrapper. IMPLEMENTED_WORK_CONSOLIDATED §20. | `constants.ts`, `MapApp.drawNatoFormationMarker()` |
| OOB filter/sort | The sidebar shows formation rows but has no filter/sort UI | `MapApp.updateOOBSidebar()` |
| Shared border gaps | ~8% of settlement edges produce fewer than 2 shared vertices (coordinate precision mismatch), resulting in no front line segment for those edges | `DataLoader.extractSharedVertices()` |

---

## 21. Desktop (Electron) and IPC

When desktop mode runs in Electron (`npm run desktop`), the app now launches into the **warroom renderer first** (`awwv://warroom/index.html`) with a New Campaign launcher flow. Current live shell authority is: Warroom owns campaign shell, Tactical Map owns battlespace interaction, Army HQ owns command review and deep staff detail, Chronicle owns campaign memory, and Codex owns static reference. The **IPC contract** is in [DESKTOP_GUI_IPC_CONTRACT.md](DESKTOP_GUI_IPC_CONTRACT.md): `start-new-campaign` (side + scenarioKey), `advance-turn` (optional `phase0Directives` payload), `get-current-game-state`, recruitment channels, and live order staging channels such as `stage-attack-order`, `stage-posture-order`, `stage-move-order`, `stage-deploy-order`, `stage-undeploy-order`, `stage-brigade-movement-order`, `assign-brigade-to-sector`, `clear-orders`, and `stage-corps-stance-order`. Retired `stage-brigade-reposition-order`, `assign-brigade-to-front`, `rename-front-segment`, and `rename-theatre` are historical compatibility context, not current live shell affordances. Main process owns canonical state and turn advancement for all phases (`peace`, `war`); renderer state updates are driven by IPC broadcasts. In Browser Dev (`npm run dev:map` without Electron/preload), local UI state can be inspected, but `advance-turn` remains unavailable unless the desktop preload bridge is present.

### 21.1. Embedded mode (iframe in warroom)

As of 2026-02-20, the tactical map opens as a **full-screen iframe layer inside the warroom window** instead of a separate `BrowserWindow`. The iframe URL is `awwv://warroom/tactical-map/map_operational_3d.html?embedded=1` — served under the warroom origin so it is **same-origin** and can access `window.parent.awwv`. The protocol handler in `electron-main.cjs` routes `awwv://warroom/tactical-map/*` to the `dist/tactical-map/` directory, and `awwv://warroom/assets/*` to project assets (crests, flags, scenario images). An inline `<script>` in `map_operational_3d.html` detects `?embedded=1`, copies the parent's IPC bridge into the iframe's `window.awwv` (with `focusWarroom` overridden to use `postMessage`). The warroom listens for `{ type: 'awwv-back-to-hq' }` postMessages to swap back to the desk scene. The standalone window path now defaults to `awwv://app/map_operational_3d.html`.

### 21.2. 3D render path (integration track)

- Tactical 3D viewers under `src/ui/map/` (for example `tactical_sandbox.ts`, `map_operational_3d.ts`) are renderer-only views and must use the same canonical state/IPC ownership model as the 2D map.
- Movement-order UX must visualize reachable destinations using the same deterministic rules as order validation (friendly-only in canonical mode; sandbox-only exceptions are non-canon).
- `map_operational_3d.ts` is the primary tactical entrypoint in desktop mode and includes bridge-driven deploy/undeploy staging plus deterministic reachable-settlement overlays (combat fixed-rate, column composition+terrain weighted). As of 2026-02-21 it also has two-tier formation counters (brigade light / corps CRT), stem lines, polygon movement range and settlement highlight rings, a right-side panel stack (Selection, Orders, Battle log, Forces), and a SELECT/ATTACK/MOVE mode toolbar using `stage-posture-order` and `stage-attack-order` via DesktopBridge; see §2 and [WARMAP_SANDBOX_VISUAL_UX_PORT_2026_02_21.md](../40_reports/implemented/WARMAP_SANDBOX_VISUAL_UX_PORT_2026_02_21.md).
- Sandbox-only deviations are tracked in one place: [TACTICAL_SANDBOX_EXCEPTIONS.md](TACTICAL_SANDBOX_EXCEPTIONS.md).
- Contact visualization for opposing settlement edges in 3D uses contact-edge highlighting (red glow) and does not reintroduce toothed front-line glyphs in the tactical sandbox path.
- Multipolygon rendering must preserve outer/inner ring semantics deterministically (no ring dropping, no nondeterministic winding repair). Any geometry simplification used for 3D performance must be deterministic and auditable.
- Label legibility in 3D must follow tactical-map readability constraints: zoom-aware declutter, deterministic tie-breakers for collisions, and faction-safe contrast against terrain/hillshade backgrounds.

### 21.3 Verification (test plan)

- **Legacy front compatibility:** Load a war-phase save that still carries `assignable_front_segments` / `brigade_front_assignment` and verify the compatibility fallback remains stable where sectors are absent. The live player shell should not expose front-assignment editing as a primary command surface.
- **2D/3D parity:** Load the same save in desktop (2D tactical map and 3D operational map). Confirm both show the same front line (same segments and extent); OOB shows Reserve vs front name per brigade; assignable segments list matches in both.
- **Day default (3D):** Open the 3D operational map; confirm it starts in day mode (no night toggle required for normal use).

---

## 22. Faction Fog-of-War

When `meta.player_faction` is set, the tactical map only renders formations belonging to that faction. Enemy formations are invisible on the canvas and not clickable. Fog-of-war is lifted by `loadedGameState.fogOfWar.visibleEnemyOsids`, which is derived from live `sector_intel` through `GameStateAdapter.ts`; do not use deleted `recon_intelligence` paths as the UI truth source. This is implemented via two filter insertions:

- **`buildFormationPositionGroups()`**: `if (playerFaction && f.faction !== playerFaction) continue;` — gates both canvas rendering and click hit-testing (since `getFormationAtScreenPos` also calls this function)
- **`drawOrderArrows()`**: same faction filter in both the attack-orders loop and movement-orders loop

**Still visible (by design):** enemy defender info in the attack confirmation panel and targeting tooltips (required for gameplay decisions); `defenderBySid` cache remains unfiltered. When `player_faction` is `null` (replay viewer, dev mode, browser-only), all formations are visible — backward compatible. See [WARROOM_RESTYLE_SCENARIO_FIX_EMBEDDED_MAP_FOG_OF_WAR_2026_02_16.md](../40_reports/implemented/WARROOM_RESTYLE_SCENARIO_FIX_EMBEDDED_MAP_FOG_OF_WAR_2026_02_16.md) §4.

---

## Appendix: Type Reference

### Core Types

```typescript
// Geometry
type Position = [number, number] | [number, number, number];
type PolygonCoords = Position[][];

// Feature
interface SettlementFeature {
  properties: { sid, municipality_id?, name?, pop?, nato_class?, majority_ethnicity?, role? };
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: ... };
}

// Edge
interface SettlementEdge { a: string; b: string }

// Shared border (precomputed)
interface SharedBorderSegment { a: string; b: string; points: Position[] }

// Search entry
interface SearchIndexEntry {
  sid, name, displayName, nameNormalized, natoClass: string;
  population: number;
  municipalityId: number | undefined;
  bbox: BBox;
  centroid: [number, number];
}

// Game state (loaded from final_save.json)
interface LoadedGameState {
  label, phase: string;
  turn: number;
  formations: FormationView[];
  militiaPools: MilitiaPoolView[];
  controlBySettlement: Record<string, string | null>;
  statusBySettlement: Record<string, string>;
  /** Formation ID → sorted list of settlement IDs in that formation’s AoR (from state.brigade_aor). */
  brigadeAorByFormationId: Record<string, string[]>;
  /** Attack orders (from state.brigade_attack_orders), sorted by formationId then targetSid. */
  attackOrders: AttackOrderView[];
  /** Movement orders (from state.brigade_mun_orders), sorted by formationId then toSid. */
  movementOrders: MovementOrderView[];
  /** Control events (e.g. current turn), sorted by settlement id. */
  recentControlEvents: RecentControlEventView[];
  /** When state.recruitment_state exists: capital/equipment by faction (sorted keys), recruitedBrigadeIds. */
  recruitment?: RecruitmentView;
  /** When set (desktop New Game): which side the human plays (RBiH, RS, HRHB). From state.meta.player_faction. */
  player_faction?: string | null;
}

interface FormationView {
  id, faction, name, kind, readiness, status: string;
  cohesion, fatigue: number;
  createdTurn: number;
  tags: string[];
  municipalityId?: string;  // from 'mun:xxx' tag
  /** Sorted settlement IDs in this formation’s AoR (when state.brigade_aor present). */
  aorSettlementIds?: string[];
  personnel?: number;
  posture?: string;  // brigade posture: hold | defend | defend_at_all_costs | elastic_defense | counterattack | dig_in | attack | assault
}

interface MilitiaPoolView {
  munId, faction: string;
  available, committed, exhausted: number;
  fatigue: number;
}
```

### Loaded Data Bundle

```typescript
interface LoadedData {
  settlements: Map<string, SettlementFeature>;     // 5,823 entries
  baseFeatures: ClassifiedBaseFeatures;             // boundary, rivers, roads, control regions
  controlData: PoliticalControlData;                // raw control data
  controlLookup: Record<string, string | null>;     // SID → faction (dual-key)
  statusLookup: Record<string, string>;             // SID → status (dual-key)
  edges: SettlementEdge[];                          // 17,116 adjacency pairs
  sharedBorders: SharedBorderSegment[];             // precomputed border vertices
  settlementNames: SettlementNamesData;             // census ID → name
  mun1990Names: Mun1990NamesData;                   // mun ID → display name
  ethnicityData: SettlementEthnicityData | null;    // ethnicity composition
  dataBounds: BBox;                                 // data coordinate extent
  searchIndex: SearchIndexEntry[];                  // sorted by name
  primaryLabelSids: Set<string>;                    // dedup label SIDs
  settlementCentroids: Map<string, [number, number]>;
  municipalityCentroids: Map<string, [number, number]>;
}
```
