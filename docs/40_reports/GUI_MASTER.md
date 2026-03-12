# AWWV GUI Master Reference

**Purpose:** Single living reference for GUI (map + warroom) status. Read first when starting GUI work; update during the session when completing GUI changes.

**Updated:** 2026-03-10

**Relationship to calibration:** Calibration has [CALIBRATION_MASTER.md](CALIBRATION_MASTER.md) as its control file. This document is the GUI analogue — one place to see current status, gates, and where to record changes.

---

## Where to look

| Need | Go to |
|------|--------|
| **Implementation spec + §0 status table** | [AWWV_GUI_ARCHITECTURE_REWORK_v2.md](../20_engineering/AWWV_GUI_ARCHITECTURE_REWORK_v2.md) — Phases 1–5, component inventory, done/not yet |
| **Warroom (scene, modals, hotspots)** | [WARROOM_MASTER.md](WARROOM_MASTER.md) — warroom living reference; modals implemented vs proposed, commander assignment, nano banana brief |
| **Warroom external handover (single file)** | [handovers/20260311_WARROOM_EXTERNAL_MASTER_HANDOVER.md](handovers/20260311_WARROOM_EXTERNAL_MASTER_HANDOVER.md) — consolidated external-facing brief: modals, prompts, overlay contracts, assets, code entrypoints |
| **Comprehensive status (external review)** | [20260228_REACT_MAP_APP_COMPREHENSIVE_STATUS.md](20260228_REACT_MAP_APP_COMPREHENSIVE_STATUS.md) — full done/remaining vs v2, file inventory, verification checklist |
| **Tactical map system (panels, layers, settlement)** | [TACTICAL_MAP_SYSTEM.md](../20_engineering/TACTICAL_MAP_SYSTEM.md) — §13.2 Settlement Panel, map modes, panel rail |
| **Aesthetic / design authority** | [HOI_VISUAL_GUI_OVERHAUL_SPEC.md](../30_planning/20260221_settlement%20remapping%20and%20GUI%20rework/HOI_VISUAL_GUI_OVERHAUL_SPEC.md) — look-and-feel, sidebar structure, panel patterns |
| **Latest comprehensive GUI review** | [convenes/20260307_GUI_COMPREHENSIVE_REVIEW_PLAYER_PERSPECTIVE.md](convenes/20260307_GUI_COMPREHENSIVE_REVIEW_PLAYER_PERSPECTIVE.md) — player perspective, panel choreography, recommendations |

---

## Current status (summary)

- **Canonical GUI:** React + MapLibre map app in `src/ui/map/`; warroom in `src/ui/warroom/`. Run map via `npm run dev:map`, desktop via `npm run desktop:map:build` (or Electron).
- **Panel rail:** One right-side rail (`panelRail.ts`); App mounts primary/secondary detail (settlement, army, corps, sector, formation, operation). Settlement panel: 3 horizontal tabs (Overview | Military | Orders & events); see [20260307_SETTLEMENT_PANEL_RICH_CONTENT_AND_TABS.md](implemented/20260307_SETTLEMENT_PANEL_RICH_CONTENT_AND_TABS.md).
- **Command experience:** Command briefing in `App.tsx`; routing to IVP, convoys, support, OPSEC, operations. Warroom: scene-plate contract, physical hotspot anchors, faction identity. Reports: [20260307_GUI_COMMAND_EXPERIENCE_EXECUTION.md](implemented/20260307_GUI_COMMAND_EXPERIENCE_EXECUTION.md), [convenes/20260307_GUI_COMPREHENSIVE_REVIEW_PLAYER_PERSPECTIVE.md](convenes/20260307_GUI_COMPREHENSIVE_REVIEW_PLAYER_PERSPECTIVE.md).
- **Fog of war:** Live from `sector_intel` via `GameStateAdapter` → `LoadedGameState.fogOfWar`; no legacy `recon_intelligence`.

---

## When working GUI

1. **Read this file first** before starting GUI changes (map or warroom). **For warroom-only work**, read [WARROOM_MASTER.md](WARROOM_MASTER.md) first instead (it defers to this file for overall GUI).
2. **Update this file during the session** when you complete a GUI slice (e.g. add a line under "Recent GUI changes" and refresh "Current status" if the summary is affected).
3. **Link implementation reports** from CONSOLIDATED_IMPLEMENTED and 40_reports README; add a row here under "Recent GUI changes" with date and report path.
4. **Propagate to** TACTICAL_MAP_SYSTEM (§13 for panels), AWWV_GUI_ARCHITECTURE_REWORK_v2.md §0, and optionally 20260228_REACT_MAP_APP_COMPREHENSIVE_STATUS.md when doing a larger refresh.

---

## Recent GUI changes

| Date | Change | Report / spec |
|------|--------|----------------|
| 2026-03-11 | **Ops modal: control display fixed + arrow geometry refactored (arrows still broken)** — Ops modal now shows current game-state control (was scenario-start). Shared `arrowGeometry.ts` extracts Bezier/arrowhead/tapered-body helpers from 3 files. `ensureCCW()` fixes polygon winding for MapLibre fill layers. Main map operation arrows: staging origin edge-shifted toward first objective. **Ops modal arrows remain broken** — `setData` on dynamic GeoJSON sources doesn't re-render in modal context. Parked as backlog bug. | GUI_MASTER §3.3 |
| 2026-03-10 | **Dev/live map split + front lines as sectors** — Single codebase `devMode` flag (`gameStore.ts`): auto-ON in Vite dev, `?dev=1` opt-in, `?live=1` forces live. Live mode: auto-loads `latest_run_final_save.json` as RBiH; front line segments carry `sector_id` and merge by sector (natural visual breaks at sector boundaries); "Front" toggle controls `sectorsVisible`; sector glow renders centered on front line (no offset, wider, blur) replacing front-line visually; lateral demarcation hidden. Dev mode: full load/run tools, DEV badge, separate Fronts/Sectors toggles, offset glow. | [20260310_SECTOR_CONTIGUITY_FIX_AND_DEV_LIVE_MAP_SPLIT.md](implemented/20260310_SECTOR_CONTIGUITY_FIX_AND_DEV_LIVE_MAP_SPLIT.md) |
| 2026-03-10 | **Sector demarcation line cleanup** — Replaced O(n²) chainSegments with endpoint-map merger + Douglas-Peucker simplification. Front-proximity filter: only show demarcation segments near actual contact line (deep-rear noise eliminated). Two-layer styling (dark base + light dash) matching front-line visual language. | `buildSectorDemarcationGeoJSON.ts`, `MapContainer.tsx` |
| 2026-03-10 | **IVP breakdown (Diplomatic Press Briefing)** — Engine weights exported from `patron_pressure.ts` (`IVP_WEIGHT_*`, `getIvpComponentContributions`). Map SituationTab: `data-summary-section="ivp"` fixed on International Pressure block (was on Alliance); full four-component weighted breakdown + thresholds + consequence labels. Warroom: `IvpBreakdownModal` opened from Diplomacy telephone footer and from Command Briefing when IVP elevated. No new mechanics. | WARROOM_MASTER, `src/ui/warroom/components/IvpBreakdownModal.ts`, `SituationTab.tsx` |
| 2026-03-09 | **Sector click + zoom** — Sectors clickable on map: clicking a settlement that belongs to a front sector also selects that sector (osidToSector in onOsidClick). Selecting a sector from Command menu or sidebar zooms map to fit that sector's territory (fitBounds over sector friendly OSIDs). Pan/zoom priority: formation or settlement when selected, else sector fitBounds. | MapContainer.tsx |
| 2026-03-08 | **GUI state-of-game audit refresh** — current-state evaluation rewritten to replace a stale same-day draft. Tactical map assessed as strong and increasingly mature; main GUI gaps are hierarchy/urgency polish, warroom runtime maturity, and thin render-level / warroom testing. | [convenes/20260308_PARADOX_TEAM_STATE_OF_THE_GAME_EVALUATION.md](convenes/20260308_PARADOX_TEAM_STATE_OF_THE_GAME_EVALUATION.md), `docs/60_visualisations/state_of_the_game_report.html` |
| 2026-03-08 | **Brigade profile aligned with corps Combat Record** — Brigade formation detail now uses the same `CombatSummaryPanel` as corps: "Men lost", "Casualties inflicted", battles, win rate, exchange ratio, territory. Labels unified in `CombatSummaryPanel`. Brigade-only extras (KIA/WIA est., win streak, turns under siege, equipment destroyed, recent engagements) retained below. | FormationDetail.tsx, CombatSummaryPanel.tsx |
| 2026-03-08 | **Turn AAR Panel** — `AARPanel.tsx` (new): collapsible 7-section overlay (Combat, Territory, Unit Events, Faction Pulse, Displacement, Notable Events) wired to `LoadedGameState.latestTurnSummary`. "AAR" button added to `TopToolbar`. Persistent across save/load (last 3 turns). Simplify pass: fixed wrong `rbih_hrhb_state?.washington_turn` cast, non-brigade spawn/destruction detection, OSID regex duplication, unstable React key, hardcoded faction literal. | [20260308_TURN_AAR_SYSTEM.md](implemented/20260308_TURN_AAR_SYSTEM.md) |
| 2026-03-08 | **Warroom: non-fatal initial region loading** — Startup now tolerates a missing shared `hq_clickable_regions.json` and tries override/shared/faction candidates instead of aborting `init()`. This prevents black-screen startup when only faction-specific region files are present. | WARROOM_MASTER, warroom.ts |
| 2026-03-08 | **Warroom: early Electron bridge init** — `window.awwv` is assigned to the warroom bridge at the start of `init()` so `New Campaign` cannot race ahead of later async loading and trip `Desktop bridge unavailable.` | WARROOM_MASTER, warroom.ts |
| 2026-03-08 | **Warroom: configurable regions + no duplicate calendar** — Region file can be overridden via `window.__awwvWarroomRegionsUrl` for new room layout; `options.calendar_baked_in_art: true` in region JSON skips calendar overlay so no duplicate/mismatch when art has calendar baked. Default region file updated. | WARROOM_MASTER, warroom, ClickableRegionManager |
| 2026-03-08 | **Warroom: flag overlay removed** — Flag is baked into room art per clean-room handover; runtime no longer draws flag sprite. Prevents overlay from obscuring corkboard/whiteboard. Only calendar (and future map/date board) remain as runtime overlays. | WARROOM_MASTER, warroom.ts |
| 2026-03-08 | **Ops modal cosmetic fixes** — stale closure fix (activeAxisIdRef for map click handlers), removed defensive ops (strategic_defense/reorganization), MapLibre attribution hidden, faction control opacity 0.25→0.55, faction-flavored operation name pre-generation via `simpleHash()`, removed hoveredOpType re-render. | [20260308_OPS_PLANNING_MODAL_PHASE2_MULTI_AXIS_STAGING_FORCEPREVIEW.md](implemented/20260308_OPS_PLANNING_MODAL_PHASE2_MULTI_AXIS_STAGING_FORCEPREVIEW.md) |
| 2026-03-08 | **Ops Planning Modal rewrite** — multi-axis operations (per-axis brigades, objective chains, color-coded arrows), per-axis staging areas (map click mode toggle, diamond markers), force-ratio preview (enemy strength per objective, color-coded), post-submit confirmation overlay. `OpsPlanningModal.tsx` full rewrite; `useIPC.ts` extended with axes array + staging_osid. Simplify pass: removed 6× double-refresh setTimeout, hoisted friendlyPersonnel, simplified playerFaction. | [20260308_OPS_PLANNING_MODAL_PHASE2_MULTI_AXIS_STAGING_FORCEPREVIEW.md](implemented/20260308_OPS_PLANNING_MODAL_PHASE2_MULTI_AXIS_STAGING_FORCEPREVIEW.md) |
| 2026-03-08 | Warroom direction updated again: `prewar/year1/year2/year3/year4` per faction with **archival-photo realism**; **flag baked into art**; **desk map projected at runtime**; **date / next-turn board projected at runtime**; Gemini prompts added for per-image measurement and geometry verification | [handovers/20260308_WARROOM_UNIFIED_ROOM_PROMPT_AND_MILITARY_FEEL.md](handovers/20260308_WARROOM_UNIFIED_ROOM_PROMPT_AND_MILITARY_FEEL.md), [handovers/20260308_WARROOM_CLEAN_ROOM_PLUS_SPRITE.md](handovers/20260308_WARROOM_CLEAN_ROOM_PLUS_SPRITE.md), WARROOM_MASTER |
| 2026-03-12 | **Operation Preparation UI** — Two new modals: **CommanderSelectionModal** (officer roster with competence/aggressiveness pips, archetype labels, regional fit scoring — home/compatible/out-of-region, preparation time estimates, availability status — KIA/captured/enclave-locked/assigned, casualty vulnerability warning) and **OperationBriefingModal** (readiness gauges for intelligence/supply/force cohesion, force ratio estimate with interpretive labels, commander assessment badge — launch/postpone/abort, action buttons: Launch Operation, Order Probe, Postpone max 2×, Abort). Store contexts: `commanderSelectionContext` + `operationBriefingContext` in `gameStore.ts`. Adapter: `GameStateAdapter.ts` maps `preparation_sub_phase`, `preparation_turns_elapsed`, `preparation_max_turns`, `commander_assessment` to `OperationView`. `App.tsx` renders both modals. Officer display via `officerCharacter.ts` utilities. | Systems Manual §7.6, `CommanderSelectionModal.tsx`, `OperationBriefingModal.tsx` |
| 2026-03-07 | Officer profile redesign: shared `OfficerProfile` component with archetype, origin badge, pip ratings, combat record, tenure. Replaces raw numeric display across 6 panels. `officerCharacter.ts` utilities. | MAP_UI_MASTER §12, §13.4, TACTICAL_MAP_SYSTEM §0 |
| 2026-03-07 | Settlement panel: 3 tabs, nation labels, current ethnic structure, formation click-through; Control tab removed | [20260307_SETTLEMENT_PANEL_RICH_CONTENT_AND_TABS.md](implemented/20260307_SETTLEMENT_PANEL_RICH_CONTENT_AND_TABS.md), TACTICAL_MAP_SYSTEM §13.2 |
| 2026-03-07 | Settlement panel population: **settlement-level** (OSID) Pre-war/Now/Out/In/Lost from mun share; formula line; net change matches settlement | (this session) |
| 2026-03-07 | Settlement panel "Fled from this settlement": scaled to match Out+Lost when event-log total ≠ formula total so math checks | (this session) |
| 2026-03-07 | Settlement panel population: Arrived uses **nation labels** (Bosniaks/Serbs/Croats); "Arrived at this settlement" shown whenever arrivals data exists; both Fled and Arrived show who left/arrived by nation | (this session) |
| 2026-03-07 | Settlement panel Military tab: **Front sector** row clickable → opens sector (CorpsFrontPanel); Orders & events tab: **Operation target** rows clickable → open operation detail | (this session) |
| 2026-03-07 | **Displacement event log:** All sources now write to `displacement_event_log`: takeover, minority flight, control-flip displacement (`applyDisplacementFromFlips`), and pressure/encirclement/breach (`updateDisplacement`). Events distributed by OSID so "Fled from this settlement" shows nation breakdown for every source. | (this session) |
| 2026-03-07 | Settlement panel "Left this settlement": when no per-OSID events (e.g. Kamičani), use **mun-level fallback** — `departedByMun` from adapter, scaled to settlement's Out+Lost so "Fled from this settlement" shows nation breakdown. | (this session) |
| 2026-03-11 | **Displacement event log path fix**: adapter read `state.displacement_event_log` (wrong) instead of `state.displacement.displacement_event_log`. All per-OSID/per-mun departure tracking was silently empty. Fixed path + `departedByOsid` now accumulates `displaced+killed+fled_abroad` (not just `displaced`) so killed/fled people are correctly removed from ethnic computation. | GameStateAdapter.ts, GUI_MASTER §Debugging #2 |
| 2026-03-07 | Settlement panel ethnic structure charts: Pre-war and Current use **ethnic bar colors** — green (Bosniaks), red (Serbs), blue (Croats), neutral (Other). `ethnicBarColor()` + `bg-faction-rbih` / `bg-faction-rs` / `bg-faction-hrhb`. | (this session) |
| 2026-03-07 | Command experience: panel rail, right-drill flow, warroom scene-plate, hotspot anchors, faction identity, briefing routing | [20260307_GUI_COMMAND_EXPERIENCE_EXECUTION.md](implemented/20260307_GUI_COMMAND_EXPERIENCE_EXECUTION.md) |
| 2026-03-07 | Comprehensive GUI review (player perspective) — convene, not implementation | [convenes/20260307_GUI_COMPREHENSIVE_REVIEW_PLAYER_PERSPECTIVE.md](convenes/20260307_GUI_COMPREHENSIVE_REVIEW_PLAYER_PERSPECTIVE.md) |
| 2026-03-06 | Panel rework: CorpsFrontPanel accordions, numeric shortcuts 1–5, loading shimmer, TopToolbar glow | [20260306_GUI_PANEL_REWORK_AND_GENERAL_POLISH.md](implemented/20260306_GUI_PANEL_REWORK_AND_GENERAL_POLISH.md) |

---

## Gates / discipline

- **No new GUI in legacy stacks:** All new work goes to `src/ui/map/` (React map) or `src/ui/warroom/` (warroom). Do not add features to archived HoI/tactical_map paths.
- **Panel choreography:** Use the single rail and App-owned mounting; do not stack competing overlays or drift SelectionPanel to its own overlay rules (see napkin "GUI / HoI Map").
- **Fog contract:** Consume `LoadedGameState.fogOfWar` (derived from sector intel); do not wire map layers directly to raw engine intel.

## Known GUI debugging patterns

These patterns emerged from multi-hour debugging sessions and should be checked first when diagnosing GUI issues.

### 1. GameStateAdapter field paths (`state.military.*` not `state.*`)

After the Phase 3 state domain segregation, military fields live under `state.military.*` in the save JSON. `GameStateAdapter.ts` must read from the correct namespace. A wrong path (e.g. `(state as any).war_front_edges_osid` instead of `state.military.war_front_edges_osid`) silently returns `undefined`, causing the entire downstream chain (source → layers → interactions → highlights) to never initialize. **When a GUI feature "stops working," log the adapter field value before any layer/interaction debugging.** Reference pattern: `state.military.front_edges` (line 1185).

### 2. Displacement event log: `state.displacement.displacement_event_log` not `state.displacement_event_log`

The displacement event log lives at `state.displacement.displacement_event_log` (nested inside the displacement object), NOT at `state.displacement_event_log`. The adapter was reading the wrong path, silently returning `undefined`, which caused: (a) "breakdown by nation not recorded" for all settlements, (b) current ethnic structure frozen at pre-war percentages, (c) ethnic map mode showing pre-war demographics regardless of displacement. **Same debugging pattern as §1 — wrong path returns `undefined`, entire downstream chain fails silently.**

Additionally, `departedByOsid` must accumulate `displaced + killed + fled_abroad` (the full removal count), not just `displaced`. People who were killed or fled abroad during displacement are no longer present at the settlement — counting only `displaced` leaves "ghost residents" in the ethnic computation. Example: Kamičani (Prijedor) showed 48% Bosniak / 51% Serb (pre-war ~90% Bosniak) because 688 killed/fled Bosniaks were still counted as living there.

**Reference:** `GameStateAdapter.ts` line ~1149 (event log path) and line ~1170 (totalRemoved accumulation).

### 3. MapLibre `line-offset` breaks `queryRenderedFeatures`

In MapLibre GL JS v4, `line-offset` shifts visual rendering but does NOT update the spatial index. Features with `line-offset` cannot be found by `queryRenderedFeatures` — even a 40px bbox query returns 0 results. **Clickable hitbox layers must use NO `line-offset`** — use wider centered lines instead. Visual-only layers (highlights, glows) can use `line-offset` since they don't need to be queryable.

### 4. OpsPlanningModal: `setData` on dynamic GeoJSON sources doesn't re-render

**Status: OPEN BUG (2026-03-11) — parked for fresh investigation.**

The OpsPlanningModal creates its own MapLibre map instance. GeoJSON sources defined in the base style (e.g. `osid-control`) respond to `setData()` and re-render correctly. However, sources added dynamically via `map.addSource()` accept `setData()` without error but do NOT visually update. This affects the HoI-style tapered operation arrows (`ops-advance-arrows` source).

**Workaround attempted:** Remove all layers + remove source + re-add source with new data + re-add layers (`replaceArrowSourceData()` in `OpsPlanningModal.tsx`). Partially works — arrows occasionally visible but inconsistent.

**Also fixed during investigation (working):**
- Control display: now uses `loadedGameState.controlBySettlement` instead of static scenario-start file
- `ensureCCW()` added to `arrowGeometry.ts` — fixes polygon winding for all arrow builders (main map + ops modal)
- Faction color detection from sector brigades when `player_faction` not set
- React setState-during-render: `setOperationTargetOsids` deferred via `queueMicrotask`
- Code reuse: shared `arrowGeometry.ts` (Bezier, arrowhead, tapered body, hash) used by 3 consumers
- Main map operation arrow origin shifted toward first objective when staging OSID is set

**Files:** `OpsPlanningModal.tsx` (arrow builder + source management), `arrowGeometry.ts` (shared geometry), `buildOperationArrowsGeoJSON.ts` (main map arrows).

**Next steps:** Fresh investigation needed. Consider: (a) rendering arrows as an HTML overlay (Canvas/SVG) instead of MapLibre layers, (b) injecting arrow source into base style JSON before map creation, (c) testing with MapLibre v5, (d) checking if the modal's map canvas has correct dimensions when layers are first added.

### 5. Layer creation race conditions (`ensureSectorLayers` polling)

Map overlay sources are created in `runUpdate` inside nested `requestAnimationFrame` calls (~32ms). Effects that depend on those sources (e.g. `ensureSectorLayers`) run synchronously and may poll. The poll guard function must return `false` (keep polling) when required sources don't exist yet. Returning `true` too early stops the poll permanently, and dependent layers are never created. The fix: gate return on `!map.getSource(FRONT_EDGES_HOVER_SOURCE_ID)` → `return false`.

---

*For calibration status and gates, use [CALIBRATION_MASTER.md](CALIBRATION_MASTER.md). For thematic GUI decisions and patterns, see docs/PROJECT_LEDGER_KNOWLEDGE.md and .claude/napkin.md § GUI / HoI Map.*
