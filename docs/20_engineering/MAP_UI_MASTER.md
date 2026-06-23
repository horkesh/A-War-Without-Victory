# Map UI Master Reference

**Project:** A War Without Victory (AWWV)
**Source tree:** `src/ui/map/`
**Dev server:** `npm run dev:map` (Vite, port 3002)
**Build:** `npm run build` → `dist/tactical-map/`
**Last updated:** 2026-05-16
**Dev/live mode (2026-03-10; demarcation removal 2026-05-16):** Single codebase with `devMode` boolean in `gameStore.ts`. `isDevMode()`: auto-ON in Vite dev, `?dev=1` in production, `?live=1` forces live. Dev mode shows full load/run toolbar + DEV badge; separate Fronts/Sectors toggles; offset sector glow. Live mode auto-loads `latest_run_final_save.json` as RBiH; merged "Front" toggle (controls `sectorsVisible`); sector glow centered on front line (no offset, wider, `line-blur`). Lateral same-faction sector demarcation lines are removed from the tactical map entirely; sector readability is carried by front edges, selected-sector fill/glow, and brigade rings. Front line features carry `sector_id`; merge key by sector creates natural visual breaks at sector boundaries.

> **See also:** [TACTICAL_MAP_SYSTEM.md](TACTICAL_MAP_SYSTEM.md) — original engineering reference.
> This document is the **component-level master reference** covering current panel layout,
> store contract, layer system, builders, data types, and interaction model.
> **GUI polish phases (2026-03-05):** Authoritative checklist **A–F** (Arrow overhaul, Ops Planning modal, Map mode toolbar/pressure, Battle marker pulse, Bottom status strip, General polish) is in [20260305_GUI_POLISH_ORCHESTRATED_EXECUTION.md](../40_reports/implemented/20260305_GUI_POLISH_ORCHESTRATED_EXECUTION.md) §Consolidated Phase List.

> **2026-04-03 shell authority note:** This file is now a component/reference map, not the canonical owner of live shell hierarchy. Use [PRODUCT_SHELL_HIERARCHY.md](PRODUCT_SHELL_HIERARCHY.md) and [UI_OWNERSHIP_MATRIX.md](UI_OWNERSHIP_MATRIX.md) for current top-level ownership. In live runtime, `PresidentialToolbar.tsx` is the mounted tactical-map top shell; `TopToolbar.tsx` is legacy/reference only.

---

## 1. Directory Layout

```
src/ui/map/
├── App.tsx                        Entry point — bootstraps desktop bridge, keyboard shortcuts, modals
├── main.tsx                       React DOM render
│
├── desktop/                       Electron IPC bridge (Phase 4)
│   ├── useIPC.ts                  React hook wrapping window.awwv; stable useMemo([]); safe no-ops in browser
│   ├── types.ts                   RecruitmentCatalogBrigade, StartNewCampaignPayload
│   ├── orderActions.ts            advanceTurnAndSync(), stagePostureOrderAction(), stageAssignBrigadeToSectorAction()
│   └── campaignRecruitmentActions.ts  startCampaignFromSidePicker(), fetchRecruitmentCatalog(), applyRecruitmentAndSync()
│
├── map/
│   ├── MapContainer.tsx           Master map: MapLibre init, all sources/layers, GeoJSON updates
│   ├── useMapInteractions.ts      Click/hover event wiring → store callbacks (300ms hover delay)
│   ├── formationIcons.ts          Programmatic NATO counter sprites — MapLibre `formation-markers` by default; same bitmaps feed Deck `IconLayer` when `deckFormationCounters` is true
│   ├── Icon.ts                    (DEPRECATED) Old icon mapping
│   ├── frontLineIcons.ts          Front-line SVG icon helpers
│   ├── pmtilesRoute.ts            PMTiles URL routing helper (stub)
│   ├── rewritePmtilesUrls.ts      Shared PMTiles style URL rewriter (pmtiles:/// → pmtiles://origin/); used by MapContainer and ops_modal/OpsMap
│   ├── awwv_map_style.json        MapLibre base style (terrain, glyphs, base layers)
│   └── builders/
│       ├── buildControlGeoJSON.ts              OSID polygons + faction controller property
│       ├── buildFrontLinesGeoJSON.ts           Faction border LineStrings (shared OSID edges)
│       ├── buildEthnicGeoJSON.ts               OSID majority ethnic (Bosniak/Serb/Croat/Other)
│       ├── buildSupplyGeoJSON.ts               OSID supply state coloring (adequate/strained/critical)
│       ├── buildMajorCityLabelGeoJSON.ts       One label point per major municipality (`MAJOR_MUN_IDS`); max-pop OSID centroid
│       ├── urbanSettlementTiers.ts             Tier constants / major-mun ID set for labeling (no urban wash on control fill)
│       ├── buildFormationsGeoJSON.ts           Formation Point markers at OSID centroids
│       ├── buildOrderArrowsGeoJSON.ts          Attack/move arrow LineStrings
│       ├── buildCorpsFrontLinesGeoJSON.ts      Corps-colored front lines (glow + tooth edge)
│       ├── buildFrontEdgesHoverGeoJSON.ts      Per-segment offset features for asymmetric hover/click
│       ├── buildOperationTargetIconsGeoJSON.ts Op objective markers: points + crosshairs
│       ├── formationIconId.ts                  Icon ID string from kind + faction
│       ├── geojsonLookup.ts                    buildOsidCentroidLookup() helper
│       ├── resolveFormationLocationOsid.ts     `location_osid`, then sorted `aorSettlementIds`, then `hq_sid`
│       ├── generateFactionBorders.ts           Shared-edge faction boundary computation
│       ├── buildFogOfWarGeoJSON.ts             Enemy-territory fog-of-war polygon fill from `LoadedGameState.fogOfWar`
│       └── buildBattleMarkersGeoJSON.ts        Combat flip events → Point features (last 3 turns, age-based opacity)
│
├── components/
│   ├── icons/
│   │   └── Icon.tsx               New SVG Icon framework (Lucide-based + custom path overrides) for UI-wide consistency
│   ├── Entity slide-out panels (left: 19rem — see §2 for layout)
│   │   ├── FormationDetail.tsx    Brigade/corps/army detail (highest priority; army_hq → ArmyReservePanel)
│   │   ├── ArmyReservePanel.tsx   Army HQ panel: Reserve Pool + Pending Requests + Campaign History (rendered instead of FormationDetail when kind === 'army_hq')
│   │   ├── CorpsFrontPanel.tsx    Sector detail (sector selected, no formation)
│   │   ├── CorpsDetail.tsx        Corps detail (corps selected)
│   │   ├── ArmyDetail.tsx         Faction summary (faction header clicked)
│   │   └── OperationsPanel.tsx    Operations master-detail panel (open via op card or store)
│   │
│   ├── SelectionPanel.tsx         OSID detail (right: 1rem — separate from entity panels)
│   ├── OOBSidebar.tsx             Left accordion sidebar (Situation/Army/Ops/Sectors)
│   ├── TopToolbar.tsx             Legacy top bar prototype (not the mounted tactical shell)
│   ├── MapModeToolbar.tsx         Bottom-center: map mode buttons + layer toggles
│   ├── BottomStatusStrip.tsx      Bottom-left 1-line strip: 'FRONTLINE CONTROL' telemetry + OSID/formation details (spaced wide-kerning typography)
│   ├── Minimap.tsx                Bottom-left 250×180px secondary map
│   ├── Tooltip.tsx                Mouse-follow tooltip (300ms delay): OSID/formation/front
│   ├── SupplyPanel.tsx            Reserve bars when supply map mode active
│   ├── OrderQueue.tsx             Phase C5 staged order queue
│   ├── AttackConfirmation.tsx     Attack confirmation modal
│   ├── OfficerProfile.tsx         Shared officer profile card (archetype, origin badge, pip ratings, combat record, tenure)
    │   ├── CombatSummaryPanel.tsx     Reusable combat record display (battles/casualties/territory)
│   ├── SituationTab.tsx           Situation accordion content in OOBSidebar
│   ├── BrigadeRow.tsx             Compact brigade list item in OOBSidebar
│   ├── CorpsCard.tsx              Corps card in OOBSidebar accordion
│   ├── SettlementDetailContent.tsx Reusable settlement info (used in SelectionPanel + Tooltip)
│   ├── SidePickerOverlay.tsx      Faction selection overlay shown before game load (Phase 4)
│   ├── RecruitmentModal.tsx       Brigade recruitment modal: catalog, eligibility, recruit action (Phase 4)
│   ├── WarSummaryModal.tsx        War Summary modal: area-weighted territory, military strength, displacement (Phase 5)
│   ├── panelRail.ts               Shared panel positioning constants (DETAIL_PANEL_STYLE, SECONDARY_PANEL_STYLE)
│   └── army_hq/                   Army HQ Nerve Center (full-screen command modal)
│       ├── ArmyHQModal.tsx          Main modal: wires 3 intel panels, date display, pre-indexed corps lookups
│       ├── ArmyHQCorpsCard.tsx      Corps card: readiness border color, threat badge, health stripe (cohesion + fatigue)
│       ├── FlipCard.tsx             CSS 3D flip animation wrapper
│       ├── SituationBriefing.tsx    Prioritized CRITICAL/WARNING/INFO alerts from game state scan
│       ├── ThreatAssessment.tsx     Active threats, hardened positions, intelligence gaps from sectorIntel
│       ├── ForceReadiness.tsx       Per-corps readiness grade (COMBAT READY → INEFFECTIVE) + recommendations
│       ├── SupplyIntelligence.tsx   Supply breakdown, enclave resilience, mobilization, runway projection
│       ├── CollapsibleSection.tsx   Reusable expand/collapse wrapper
│       ├── CommanderSection.tsx     Corps commander profile on card back
│       ├── SectorsSection.tsx       Sector listing on card back
│       ├── OperationsSection.tsx    Active operations on card back
│       ├── OrbatSection.tsx         Brigade ORBAT on card back
│       └── CombatRecordSection.tsx  Combat record on card back
│
├── store/
│   └── gameStore.ts               Zustand store — all UI state (see §4)
│
├── layers/
│   ├── deckLayerCapabilities.ts   Capability flags; **`deckFormationCounters` default true** → Deck.gl formations with enrichments (health bar, supply dot, status icons, stack badges, op/disrupted glow rings); MapLibre `formation-markers`/`formation-labels` hidden
│   ├── composeTacticalDeckLayers.ts Merges tactical + experimental Deck layers for `MapboxOverlay`
│   ├── buildTacticalDeckLayers.ts   IconLayer / TextLayer / enrichments when Deck formations enabled
│   └── buildExperimentalDeckLayers.ts Optional arcs, Deck front paths, scatter dots (all default off)
│
├── data/
│   ├── types.ts                   LoadedGameState + all sub-interfaces (see §5)
│   ├── GameStateAdapter.ts        parseGameState(): raw JSON → LoadedGameState
│   ├── DataLoader.ts              Async loaders: operational_settlements, control, runs
│   └── ControlLookup.ts           Control/status lookup builders
│
├── hooks/
│   ├── useKeyboardShortcuts.ts    Enter/Escape/1-9 global key handler (map modes 1-9 from MAP_MODES)
│   └── useDesktopSession.ts       Bootstrap + game-state-updated/turn-report-updated IPC subscriptions (Phase 4)
│
├── saved/                         Phase 4 staging area — promoted to live files; kept for reference (excluded from tsconfig)
│
└── utils/
    ├── theme.ts                   FACTION_COLORS, FACTION_COLORS_SUBTLE, FACTION_BG_SUBTLE
    ├── osidDisplayName.ts         getOsidDisplayName(osid, map) → human name
    ├── osidLookup.ts              getByOsid() helper
    ├── formationAtOsid.ts         getFormationsAtOsid(formations, osid)
    ├── sectorUtils.ts             stripFactionSuffix, extractFactionFromEdgeId, collectSectorFriendlyOsids
    ├── operations.ts              getOperationId, getOperationPhaseBadgeClass/Tone, OPERATION_PHASE_TIMELINE
    ├── officerUtils.ts            getFormationCommander, getFactionArmyCommander — officer lookup from formation/faction
    ├── officerCharacter.ts        Officer character display: archetype, pip ratings, stat labels, origin badge, combat record, tenure, rank formatting
    ├── combatEffectiveness.ts     Combat effectiveness: computeBrigadeEffectiveness(), aggregateEffectiveness() — composite power number for display at brigade/sector/corps/army levels
    ├── ModalMapSource.ts          Safe GeoJSON source management for modal MapLibre instances — enforces remove+re-add pattern, eliminates setData() bug
    └── formatters.ts              turnToDateString, formatTurnLabel, formatOperationType, formatCombatOutcome, formatPosture
```

---

## 2. Screen Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TopToolbar (z:50, top:0, full width)                │
│             Load file / Load latest / Load run ID | faction gradient        │
├─────────────┬──────────────────────────────────────────────────┬─────────────┤
│             │                                                  │             │
│ OOBSidebar  │            MapContainer                          │ Entity Rail │
│ (z:40,      │         MapLibre GL, z:30                        │ (z:100-90)  │
│  left:0,    │                                                  │             │
│  position:  │                                                  │ Primary Slot│
│  fixed)     │                                                  │ (right:1rem)│
│             │                                                  │             │
│  Accordion: │                                                  │ Secondary   │
│  Situation  │                                                  │ Slot        │
│  Army       │                                                  │ (right:     │
│  Operations │                                                  │  25.5rem)   │
│  Sectors    │                                                  │             │
│             │                                                  │             │
│             ├──────────────────────────────────────────────────┘             │
│             │  MapModeToolbar (bottom:32px, centered)                        │
│ Minimap     ├────────────────────────────────────────────────────────────────┤
│ (250×180,   │  BottomStatusStrip (bottom:0, left:0, right:0)                 │
│  bottom-left│  selected OSID name · controller · N formations                │
│  z:40)      │                                                                │
└─────────────┴────────────────────────────────────────────────────────────────┘
```

**SupplyPanel:** bottom:36px, left:12px, z:20 — appears only when `mapMode === 'supply'`
**Tooltip:** z:100+, pointer-events:none, follows mouse
**AttackConfirmation modal:** z:60, centered, appears when `pendingAttackConfirmation` set

### Entity Rail & Slot Priority (Nested Rail)

 AWVV uses a **Nested Rail** system anchored to the **right** edge. 
 Parents (e.g. Army, Corps) take precedence in the **Primary** slot. 
 Children (e.g. Formation, Sector) slide out to the **Secondary** slot.

| Priority | Entity | Slot Assignment |
|----------|--------|-----------------|
| 1 | **Parent** (Army > Corps > Sector) | Primary (right: 1rem) |
| 2 | **Child** (Formation) | Secondary (right: 25.5rem) |
| 3 | **Standalone** (OSID / Settlement) | Primary (right: 1rem) |

SelectionPanel (OSID) is shared on the Primary rail and is suppressed when a tactical entity (Formation/Sector) and its parent are both visible.

### panelRail.ts

All entity panels share positioning via `DETAIL_PANEL_STYLE` from `components/panelRail.ts`. 
Anchoring is to the **right edge**:

```ts
export const DETAIL_PANEL_STYLE: CSSProperties = {
  position: 'absolute',
  right: '1rem',
  top: '3.5rem',
  bottom: '2rem',
  zIndex: 100,
  overflow: 'hidden',
};

export const SECONDARY_PANEL_STYLE: CSSProperties = {
  position: 'absolute',
  right: '25.5rem', // Offset by Primary width + gap
  top: '3.5rem',
  bottom: '2rem',
  zIndex: 90,
  overflow: 'hidden',
};
```

Usage: `style={getPanelRailStyle(railSlot, '24rem')}`.

---

## 3. Components Reference

### 3.1 Entity Panels (left: 19rem)

#### FormationDetail
- **Shows:** `selectedFormationId` set
- **Data:** name, kind, faction, cohesion, fatigue, personnel, status, readiness, location OSID,
  officer quality + corps commander (Phase E), narrative arc + war story, combat summary,
  sector link (brigade: own sector; corps: all its sectors), attack order, order buttons
- **Interactions:** Close → clears formationId; order mode buttons (Attack/Move) → setOrderModeForFormation;
  sector link → setSelectedCorpsFrontSectorId

#### CorpsFrontPanel
- **Shows:** `selectedCorpsFrontSectorId` set, no formation selected
- **Data:** sector identity, corps color swatch, density badge (THIN/Normal/DENSE), threat ratio,
  front length (edges + sub-segments), defensive power, opposing factions,
  assigned brigades list (clickable), reserve brigades list (clickable)
- **Interactions:** Brigade click → setSelectedFormationId; hover brigade → setHoveredOsids;
  close → setSelectedCorpsFrontSectorId(null)

#### CorpsDetail
- **Shows:** `selectedCorpsId` set, no formation or sector selected
- **Data:** corps name, faction, corps color swatch, stance, exhaustion, personnel, brigade count,
  sector count, OG slots, combat summary, sector list (clickable), active operations, subordinate brigades
- **Interactions:** Formation click → setSelectedFormationId; sector click → setSelectedCorpsFrontSectorId;
  hover brigade → setHoveredOsids; close → setSelectedCorpsId(null)

#### ArmyDetail
- **Shows:** `selectedArmyId` set, no formation/sector/corps selected (faction header clicked in OOBSidebar)
- **Data:** faction name + full display name, stance, exhaustion, total personnel, brigade/corps/sector counts,
  militia pools (available/committed/exhausted), casualties (KIA/WIA), army HQ combat summary,
  corps list (clickable with subordinate count + personnel + combat summary line)
- **Interactions:** Corps click → setSelectedCorpsId; hover corps → setHoveredOsids (brigade locations);
  close → setSelectedArmyId(null)
- **Note:** Distinct from ArmyReservePanel — ArmyDetail is the faction overview opened from the sidebar; ArmyReservePanel is the Army HQ formation panel opened when clicking the army_hq formation directly (shows Reserve Pool, Pending Requests, Campaign History)

#### ArmyReservePanel
- **Shows:** when `selectedFormationId` resolves to `kind === 'army_hq'` (rendered in App.tsx instead of FormationDetail)
- **Width:** 26rem, left-positioned on primary/secondary rail
- **Sections:**
  - **Reserve Pool** — all faction elite brigades (status badge: READY/ON LOAN/COOLDOWN/DEGRADED; personnel bar; Recall button when on loan)
  - **Pending Requests** — unresolved player-faction reserve requests (reason chip, priority bar, APPROVE / Dismiss)
  - **Campaign History** (collapsible) — per-brigade totals (loans, weeks deployed, KIA) + episode log
- **IPC:** APPROVE → `approve-reserve-request`; Recall → `recall-elite-brigade`
- **Data:** `loadedGameState.pendingReserveRequests`, `loadedGameState.eliteBrigadeTracker`, formation `eliteLoanState`

#### Army HQ Modal (`army_hq/`)
- **Opens:** `armyHQOpen` store flag, keyboard shortcut `H`
- **Full-screen** command center modal with dark warroom aesthetic
- **Top row:** Commander card, Chief of Staff briefing, faction crest, Exhaustion Clock, Strategic Position
- **Situation Briefing** (`SituationBriefing.tsx`) — presentation-only renderer over `loadedGameState.commandBriefing.items`. Canonical command briefing owner is sim-side `state.military.last_briefing` (`collect_briefing.ts` -> `war_phases.ts` -> `GameStateAdapter`).
- **Operational SITREP / Summary truth:** `extractWarData(...)` is the canonical raw operational snapshot owner; `getOperationalSitrepView(...)` in `src/ui/shared/operational_sitrep_views.ts` is the canonical mapped packet read path; `GameStateAdapter` maps that packet into `LoadedGameState`, and Army HQ SUMMARY / `SituationTab` render it rather than rebuilding separate front-supply-ops summaries locally. Warroom `ReportsModal` consumes that same packet for staff reporting and only reads extra contact lines from the raw snapshot. Warroom `FactionOverviewPanel` now renders its warning band from `operationalSitrep.alerts`, while its `COMMAND SHELL` block remains a shell-only handoff back to Army HQ rather than a second command analysis surface.
- **Legacy Army HQ reporting helpers still present in repo:** `ThreatAssessment.tsx`, `ForceReadiness.tsx`, and `SupplyIntelligence.tsx` remain implementation files but are not the live top-row Army HQ owners as of the v0.8-to-v0.9 hardening pass.
- **Corps cards** (`ArmyHQCorpsCard.tsx`) — FlipCard animation. Front: summary with equipment icons, readiness-driven left border color, incoming threat badge from sectorIntel, health stripe (cohesion + fatigue dual bar). Back: 5 collapsible sections (Commander, Sectors, Operations, ORBAT, Combat Record).
- **Data:** `loadedGameState.commandBriefing`, `loadedGameState.operationalSitrep`, `loadedGameState.formations`, `loadedGameState.operations`, `loadedGameState.factionReserves`, `loadedGameState.corpsFrontSectors`
- **Store:** `armyHQOpen`, `armyHQExpandedCorpsId`, `armyHQExpandedSections`, `armyHQOfficerSelectionCorpsId`

#### OperationsPanel
- **Shows:** `isOperationsPanelOpen` true (opened by clicking op card in OOBSidebar, or via `setSelectedOperationKey`)
- **Width:** 24rem (`{ ...DETAIL_PANEL_STYLE, width: '24rem' }`)
- **Layout:** 12-column grid — col-span-5 left (op list), col-span-7 right (detail)
- **Left column — operation list:**
  - Sorted by faction → corps → name
  - Each card: op name (faction-colored), corps name, phase badge pill (yellow=planning, red=execution, grey=recovery)
  - Selected card: `border-accent-gold bg-panel-active`
  - Arrow/Home/End keyboard navigation between cards
- **Right column — operation detail:**
  - Name (faction-colored), corps name + faction
  - Phase timeline strip: planning / execution / recovery badges (active one has gold ring)
  - Metrics grid: type, phase, brigade count, started turn, momentum, supply%
  - AAR Strip box: objective progress bar + momentum/supply cells
  - Objectives list: each OSID as button with ✓/▶/○ icon, display name, raw OSID
    - Current objective: `border-accent-gold/70 bg-panel-active/60`
    - Done objectives: dimmed 60% opacity
    - Click → `panToOsid(osid)` (pans map)
    - Hover/focus → `objectiveHoverOsid` → highlights just that OSID on map
    - Arrow/Home/End keyboard navigation
  - "Open Corps Orders" button → closes panel, opens CorpsDetail for the op's corps
- **Map effects:**
  - All objectives → `hoveredOsids` + `operationTargetOsids` (crosshair/ring/dot layers)
  - Hover single objective → `objectiveHoverOsid` → only that OSID highlighted
  - On selection change: auto-pans to `objectives[current_objective_index]` or `staging_osid`
- **Key helpers:** `getOperationId(op)` → `${corps_id}|${name}` (matches `selectedOperationKey` format)

### 3.2 OOBSidebar

Collapsible accordion, left edge, position:fixed.
**Sections:**
- **Situation** — territory percentages (area-weighted km², count fallback), front classification,
  casualties, displacement totals
- **Army** — per-faction → per-corps accordion → brigade rows. Faction header click → setSelectedArmyId.
  Corps name click → setSelectedCorpsId. Brigade row click → setSelectedFormationId.
  Corps name uses `corpsFormationById.get(corpsId)?.name ?? corpsId` (not raw corps ID).
- **Operations** — per-faction operation cards. Card click → `setSelectedOperationKey(`${op.corps_id}|${op.name}`)`.
  `setSelectedOperationKey` auto-opens OperationsPanel when key is non-null.
  Selected card highlighted with `border-accent-gold bg-panel-active`.
- **Sectors** — corps sector cards with density/threat indicators

### 3.3 MapModeToolbar

Nine map modes (bottom bar, centered; primary row + `+MORE` overflow) — see `src/ui/map/utils/mapModes.ts`:

| Button | Key | Store value | Layers activated |
|--------|-----|-------------|-----------------|
| Political | 1 | `'political'` | `osid-control-fill` |
| Ethnic | 2 | `'ethnic'` | `osid-ethnic-fill` |
| Supply | 3 | `'supply'` | `osid-supply-fill` + SupplyPanel |
| Casualties | 4 | `'casualties'` | `osid-casualties-fill` |
| Morale | 5 | `'morale'` | `osid-morale-fill` |
| Operations | 6 | `'operations'` | `osid-operations-fill` (+ operation arrows when applicable) |
| Defense | 7 | `'defense'` | `osid-defense-fill` |
| Authority | 8 | `'authority'` | `political-metric-fill` (`authority`) |
| Legitimacy | 9 | `'legitimacy'` | `political-metric-fill` (`legitimacy`) |

Layer toggles (no keys):

| Toggle | Store field | Layers |
|--------|-------------|--------|
| Fronts | `frontsVisible` | faction-border-glow-pos/neg, front-line-base, front-line-stripe |
| Units | `formationsVisible` | formation-markers |
| Labels | `labelsVisible` | formation-labels (requires formationsVisible) |
| Sectors | `sectorsVisible` | sector-fill, sector-glow-pos/neg, brigade-rings |
| Minimap | `minimapVisible` | Minimap component visibility |
| Fog | `fogVisible` | fog-fill (AND-gated with player_faction + fogOfWar; no-op in observer mode) |
| Battles | `battlesVisible` | battle-markers-pulse (white circles at recent combat flip OSIDs; opacity by age) |
| Borders | `municipalityBordersVisible` | **`mun-borders`** (1990 adm3 lines, `bih_adm3_1990.geojson`) + **`osid-control-outline`** (OSID polygon edges); **default off** |

### 3.4 SelectionPanel

OSID detail panel at `right:1rem`. Shows when `selectedOsid` is set and no sector or formation
is selected (those panels overlap the same area). Content: settlement name, controller (faction-colored),
terrain/zone type, population breakdown (by ethnicity), displacement (in/out), formations present
(clickable list → setSelectedFormationId).

### 3.5 Tooltip

300ms hover delay, follows mouse (pointer-events:none, z:100+).

| `tooltipTarget.type` | Content |
|---------------------|---------|
| `'osid'` | Settlement name, controller, formation count, terrain |
| `'formation'` | Formation name, faction, kind, personnel, cohesion, corps name, order if any |
| `'front'` | Edge ID, adjacent factions, sector assignment, corps |

---

## 4. Store (gameStore.ts)

### 4.1 Selection State

All setters enforce mutual exclusion — setting one clears the others.

| Field | Type | Cleared by other setters |
|-------|------|--------------------------|
| `selectedOsid` | `string \| null` | setSelectedFormationId, setSelectedCorpsFrontSectorId, setSelectedCorpsId, setSelectedArmyId, setSelectedOperationKey |
| `selectedFormationId` | `string \| null` | setSelectedOsid, setSelectedOperationKey |
| `selectedCorpsFrontSectorId` | `string \| null` | setSelectedOsid, setSelectedFormationId, setSelectedCorpsId, setSelectedArmyId, setSelectedOperationKey |
| `selectedCorpsId` | `string \| null` | setSelectedOsid, setSelectedFormationId, setSelectedCorpsFrontSectorId, setSelectedArmyId, setSelectedOperationKey |
| `selectedArmyId` | `string \| null` | setSelectedOsid, setSelectedFormationId, setSelectedCorpsFrontSectorId, setSelectedCorpsId, setSelectedOperationKey |
| `selectedOperationKey` | `string \| null` | setSelectedOsid, setSelectedFormationId, setSelectedCorpsFrontSectorId, setSelectedCorpsId, setSelectedArmyId |

Operation key format: `` `${corps_id}|${operation_name}` ``

`setSelectedOperationKey(key)` auto-sets `isOperationsPanelOpen = true` when `key != null`.

### 4.2 Operations Panel State

```ts
isOperationsPanelOpen: boolean           // OperationsPanel visibility
setIsOperationsPanelOpen: (v: boolean) => void
selectedOperationKey: string | null      // `${corps_id}|${name}` — drives list selection
setSelectedOperationKey: (key: string | null) => void  // auto-opens panel when non-null
```

### 4.3 Hover & Tooltip

```ts
hoveredOsids: string[]           // deduped + sorted; drives sidebar-hover-outline MapLibre layer
operationTargetOsids: string[]   // deduped; drives op-target crosshair/ring/dot/fill layers
tooltipTarget: { type: 'osid' | 'formation' | 'front'; id: string } | null
tooltipPosition: { x: number; y: number } | null
```

`setHoveredOsids` and `setOperationTargetOsids` are set together by OperationsPanel:
- All op objectives → both arrays
- Single objective hover → `objectiveHoverOsid` → both arrays set to `[objectiveOsid]`

### 4.4 Map State

```ts
mapMode: 'political' | 'ethnic' | 'supply' | 'pressure' | 'density'
frontsVisible: boolean           // default true
formationsVisible: boolean       // default true
labelsVisible: boolean           // default true
sectorsVisible: boolean          // default true
minimapVisible: boolean          // default true
mapViewport: { bounds, center, zoom } | null   // reported by MapContainer on moveend/load
panToCenter: ((center: [lng,lat]) => void) | null  // registered by MapContainer (minimap pan)
panToOsid: ((osid: string) => void) | null         // registered by MapContainer (op objective pan)
```

`panToOsid` looks up `osidCentroidsRef.current.get(osid)` and calls `map.easeTo({ center, duration: 420 })`.
Both callbacks are unregistered (`null`) in MapContainer cleanup.

### 4.5 Order Staging

```ts
orderModeForFormation: 'attack' | 'sector' | null
pendingAttackConfirmation: { attackerFormationId: string; targetOsid: string } | null
confirmPrimaryAction: (() => void) | null   // Enter key callback
stagedOrders: StagedOrder[]                 // { id, type, formationId, targetOsid?, targetSectorId?, postureName? }
```

`targetOsid` is reserved for settlement/attack targets. Brigade-to-sector override feedback uses
`targetSectorId` and resolves that sector to a deterministic friendly OSID only at the map feedback
builder boundary.

### 4.6 Data

```ts
loadedGameState: LoadedGameState | null
osidDisplayNames: Record<string, string> | null   // OSID → human name
osidPropertiesMap: Record<string, Record<string, unknown>> | null
lastTurnReport: LastTurnReport | null             // officer succession from desktop bridge
loadError: string | null
loadSave(jsonOrText): Promise<void>               // deferred parse (requestIdleCallback)
```

---

## 5. Data Types (types.ts)

### LoadedGameState (key fields)

`LoadedGameState` is a player-facing adapter contract. As of 2026-03-06, fog-of-war should be consumed from `loadedGameState.fogOfWar`, projected by `GameStateAdapter.ts` from live `sector_intel`, rather than from any legacy recon structure.

```ts
interface LoadedGameState {
  label: string;                                      // "Turn N (phase)"
  turn: number;
  phase: string;
  formations: FormationView[];
  militiaPools: MilitiaPoolView[];
  controlBySettlement: Record<string, string | null>; // OSID → faction
  statusBySettlement: Record<string, string>;
  attackOrders: AttackOrderView[];
  recentControlEvents: RecentControlEventView[];
  armyStance?: Record<string, string>;                // faction → stance
  casualtyLedger?: Record<string, CasualtyLedgerEntryView>;
  warExhaustion?: Record<string, number>;              // faction → exhaustion
  corpsFrontSectors?: CorpsFrontSectorView[];
  operations?: OperationView[];
  fogOfWar?: {
    visibleEnemyOsids: string[];
    visibleEnemySectorIds: string[];
  };
  namedOfficerData?: NamedOfficerView[];
  namedOfficerStateById?: Record<string, NamedOfficerStateView>;
  factionReserves?: Record<string, { generalSupply: number; heavyMunitions: number }>;
  frontEdgesOsid?: FrontEdgeView[];
  frontPressureByEdge?: Record<string, FrontPressureView>;
  displacementByMun?: Record<string, { ... }>;
  departedByOsid?: Record<string, Record<string, number>>;  // Per-OSID per-faction TOTAL removed (displaced+killed+fled_abroad)
  sectorIntel?: SectorIntelRecordView[];                    // Enemy sector intel (11 fields: sector, faction, corps, strength, posture, offensive_signs, confidence, visible brigades)
  militiaPools: MilitiaPoolView[];
}
```

### FormationView (key fields)

```ts
interface FormationView {
  id: string;
  faction: 'RS' | 'RBiH' | 'HRHB';
  name: string;
  kind: 'brigade' | 'corps' | 'corps_asset' | 'army_hq' | 'operational_group';
  cohesion: number;
  fatigue: number;
  personnel?: number;
  status: string;
  readiness: string;
  location_osid?: string;
  corps_id?: string;
  corpsStance?: string;
  corpsExhaustion?: number;
  corpsOgSlots?: number;
  corpsActiveOgIds?: string[];
  officer_quality?: number;         // [0.05, 0.90] when namedOfficerData present
  narrativeArc?: string;            // veteran/bloodied/shattered/risen/destroyed/garrison
  warNarrative?: string;
  notableMoments?: Array<{ turn: number; description: string }>;
  combatSummary?: CombatSummaryView;
}
```

### CorpsFrontSectorView

```ts
interface CorpsFrontSectorView {
  sector_id: string;              // 'sector:{corps_id}:{index}'
  corps_id: string;
  corps_name: string;
  display_name: string;           // e.g. "2nd Krajina, Sector 1"
  faction: string;
  opposing_factions: string[];
  edge_ids: string[];
  sub_segment_count: number;
  length_edges: number;
  assigned_brigade_ids: string[];
  reserve_brigade_ids: string[];
  density: number;                // brigades / edges
  threat_ratio: number;
  defensive_power: number;
}
```

### OperationView

`OperationView` is also a UI-truth contract. If a brigade appears in `participating_brigade_ids`, panel logic should treat operation ownership as stronger than `home_defense_active`.

```ts
interface OperationView {
  corps_id: string;
  corps_name: string;
  faction: string;
  name: string;
  type: string;                   // 'sector_attack'
  phase: 'planning' | 'execution' | 'recovery';
  sector_id?: string;
  staging_osid?: string;
  objectives?: string[];          // ordered OSID targets
  current_objective_index?: number;
  momentum?: number;              // 0–3
  participating_brigade_count: number;
  participating_brigade_ids?: string[];
  started_turn: number;
  supply_readiness?: number;      // 0–1
}
```

### MilitiaPoolView

### Player Agency Integration

The map UI now carries the live player-agency A-H surface through these components:

- `CorpsFrontPanel.tsx` - sector defensive intent, logistics priority, and **Sector Assignment bridge**
- `OpsPlanningModal.tsx` - fullscreen ops planning with game map (PMTiles), live G-2 briefing panel via `query-operation-prediction` IPC (300ms debounced), faction identity (army crest + corps name). Sub-components in `plan_ui/`: `G2BriefingPanel` (readiness bars + axis cards + assessment doc), `CommanderAssessmentDoc` (paper-styled military document), `AxisAssessmentCard` (collapsible), `ReadinessBar`, `OpsMapRenderer` (game map instance), `CommandTopBar`, `PlaybookSelector`, `TempoSelector`, `RiskToleranceSelector`, `AxisDrilldown`. Shared constants: `opsConstants.ts`.
- `OperationsPanel.tsx` - operation list/detail, readiness surfacing, and objective focus
- **NOTE (2026-03-15):** `CorpsDetail.tsx` and `ArmyDetail.tsx` now represent organizational abstractions. Functional tactical map interaction is primarily via `FormationDetail` and `CorpsFrontPanel`.
- `SelectionPanel.tsx` - municipality support staging for the current player faction on selected municipalities
- `EnclaveDashboard.tsx` - enclave status plus player airdrop allocation
- `SituationTab.tsx` and `TopToolbar.tsx` - convoy decisions, IVP/consequence surfacing, and tunnel status
- `GameStateAdapter.ts` - adapter contract for `fogOfWar`, `composite_ivp`, operation readiness, airdrop state, convoy state, municipality support state, and OPSEC-visible sectors

```ts
interface MilitiaPoolView {
  faction: string;
  available: number;
  committed: number;
  exhausted: number;
}
```

---

## 6. GeoJSON Builders

| Builder | Input | Output | Purpose |
|---------|-------|--------|---------|
| `buildControlGeoJSON` | baseGeoJson, controlBySettlement | Polygon features with `controller` property | Political fill layer |
| `buildFrontLinesGeoJSON` | controlledGeoJson, allianceFlag | LineString border edges | Faction boundary lines |
| `buildEthnicGeoJSON` | baseGeoJson, properties, displacement | Polygon features with `majority_ethnic` | Ethnic composition fill |
| `buildSupplyGeoJSON` | controlGeoJson, controlBySettlement, reserves, legacyPressure | Polygon features with `supply_class` | Supply reserve visualization |
| `buildDensityGeoJSON` | controlGeoJson, sectors, frontEdgesOsid | Polygon features with `density_class` | Front density visualization |
| `buildFormationsGeoJSON` | state, controlledGeoJson | Point markers with `icon_id` | Unit symbols on map |
| `buildOrderArrowsGeoJSON` | state, controlledGeoJson | LineString arrows | Attack/move orders |
| `buildCorpsFrontLinesGeoJSON` | sectors, frontEdgesOsid | LineString front lines | Corps-colored front display |
| `buildFrontEdgesHoverGeoJSON` | controlledGeoJson, frontEdgesOsid, sectors, centroids | 2× LineString per polygon boundary segment (per-segment offset) | Asymmetric click/hover hitboxes; each feature carries sector_id for filter-based highlighting |
| `buildOperationTargetPointsGeoJSON` | centroidLookup, osids | Point features at OSID centroids | Op target ring + dot layers |
| `buildOperationTargetCrosshairsGeoJSON` | centroidLookup, osids | LineString ± pairs per OSID | Op target crosshair layer |

### buildOperationTargetIconsGeoJSON Detail

`buildOperationTargetPointsGeoJSON(centroidLookup, osids)` — one Point feature per OSID, at
`osidCentroidsRef.current.get(osid)`. Used by circle ring and dot layers.

`buildOperationTargetCrosshairsGeoJSON(centroidLookup, osids)` — two LineString features per OSID
(horizontal + vertical arms, ARM=0.038°), drawn around the centroid. Used by crosshair line layer.

Both return `FeatureCollection` with `properties.osid` for debugging.

### Corps Front Lines Detail

`buildCorpsFrontLinesGeoJSON` produces two feature types per front edge:
- `lineType: 'glow'` — rendered with `line-offset` for positional glow (offset_side driven by
  cross-product sign of centroid vs directed edge)
- `lineType: 'front'` — main line with corps color from FACTION_CORPS_PALETTES

Exports:
- `buildCorpsColorMap(sectors)` → `Record<corps_id, hex>` (used by CorpsFrontPanel, CorpsDetail)
- `buildCorpsColorExpression(sectors, fallback)` → MapLibre match expression

---

## 7. Map Layer IDs

### Front Lines

| Layer ID | Source | Purpose |
|----------|--------|---------|
| `faction-border-glow-pos` | front-lines | Positive-side glow (blur effect) |
| `faction-border-glow-neg` | front-lines | Negative-side glow |
| `front-line-base` | front-lines | Dark base stripe |
| `front-line-stripe` | front-lines | White dashed stripe |

Style: black-white alternating stripe. **No chevrons** (standing directive — do not change).

### Corps Front Layers

| Layer ID | Source | Purpose |
|----------|--------|---------|
| `corps-front-glow-pos` / `corps-front-glow-neg` | corps-front-lines | Corps-colored glow |
| `corps-front-main` | corps-front-lines | Corps-colored main line |

### Sector Layers

| Layer ID | Purpose |
|----------|---------|
| `sector-fill` | Per-sector translucent fill |
| `sector-glow-pos` / `sector-glow-neg` | Sector boundary glows |
| `sector-brigade-rings` | Brigade position rings |

### Formation layers (MapLibre default; optional Deck.gl)

**Default:** Deck.gl formation counters via `buildTacticalDeckLayers.ts`. **`deckFormationCounters`** in `deckLayerCapabilities.ts` is **`true`** by default — MapLibre `formation-markers` and `formation-labels` are hidden to prevent double-draw. Deck.gl enrichment layers include: health bar, supply dot, status icons, stack badges, and op/disrupted glow rings.

When **`deckFormationCounters`** is **true** (the default), MapLibre formation symbol layers are hidden and Deck supplies:

| Layer ID | Source | Purpose |
|----------|--------|---------|
| `deck-formations-icons` | Deck.gl | Unit counters with zoom-dependent scaling (16px @ Z6 to 40px @ Z14) |
| `deck-formations-labels` | Deck.gl | Formation name labels |
| `deck-formations-orders` | Deck.gl | Posture / order glyphs |
| `deck-formations-supply-dot` | Deck.gl | Supply status indicator dot |
| `deck-formations-stack-circle` | Deck.gl | Background circle for stack count badge |
| `deck-formations-stack-text` | Deck.gl | Text badge for stack counts |

### Major-municipality label layer

| Layer ID | Source | Purpose |
|----------|--------|---------|
| `major-city-labels-symbols` | `major-city-labels` | One symbol per major mun (`buildMajorCityLabelGeoJSON.ts`, `MAJOR_MUN_IDS`); Open Sans Bold via local `/font/` glyphs; minzoom ~6; painted above front lines |

Strategic settlement “Points” / `strategic-points-circles` was **removed** (2026-03-20); op-target rings and crosshairs are unchanged.

### Front Edge Hover Layers

| Layer ID | Purpose |
|----------|---------|
| `front-edges-hover-pos` / `front-edges-hover-neg` | Invisible click hitboxes — NO `line-offset` (wide centered line, opacity 0.01) |
| `front-edges-highlight-pos` / `front-edges-highlight-neg` | Sector highlight on hover (filter by sector_id, not feature-state); uses `line-offset` (visual only) |

### Sidebar Hover Layer

| Layer ID | Source | Purpose |
|----------|--------|---------|
| `sidebar-hover-outline` | osid-control | Gold outline on `hoveredOsids` OSIDs |

Set via `setFilter`: `['in', ['get', 'osid'], ['literal', hoveredOsids]]`. Opacity is static 0.9.

### Operation Target Layers

All added dynamically by MapContainer when `operationTargetOsids` is non-empty. Inserted before
`formation-markers`. Each source has lazy-add guard (`safeHasLayer`).

| Layer ID | Source | Purpose |
|----------|--------|---------|
| `operation-target-fill` | operation-target-polygons | Dark fill on target OSID polygons |
| `operation-target-outline` | operation-target-polygons | Dark border on target OSID polygons |
| `operation-target-icon-ring` | operation-target-points | Outer circle ring at centroid |
| `operation-target-icon-inner-ring` | operation-target-points | Inner circle ring |
| `operation-target-icon-dot` | operation-target-points | Center dot |
| `operation-target-icon-crosshair` | operation-target-crosshairs | + crosshair lines |

All 6 layers are hidden (`visibility: 'none'`) when `operationTargetOsids` is empty, shown when non-empty.
`safeSetLayoutVisibility(map, layerId, targetSet.size > 0)` drives visibility each effect run.

### Map mode fill layers

| Layer ID | Active when |
|----------|-------------|
| `osid-control-fill` | `mapMode === 'political'` |
| `osid-ethnic-fill` | `mapMode === 'ethnic'` |
| `osid-supply-fill` | `mapMode === 'supply'` |
| `osid-casualties-fill` | `mapMode === 'casualties'` |
| `osid-morale-fill` | `mapMode === 'morale'` |
| `osid-operations-fill` | `mapMode === 'operations'` |
| `osid-defense-fill` | `mapMode === 'defense'` |
| `political-metric-fill` | `mapMode === 'authority' || mapMode === 'legitimacy'` |

### Municipality / OSID outline toggle

| Layer ID | Source | Active when |
|----------|--------|-------------|
| `mun-borders` | `mun-borders` (`/data/source/boundaries/bih_adm3_1990.geojson`) | Same store flag; dashed brown adm3 boundaries |
| `osid-control-outline` | `osid-control` | OSID polygon edges (subtle line layer) |

### Settlement selection highlight (`selectedOsid`)

When `selectedOsid` is set, `MapContainer` updates filters on `osid-control` + `mun-borders` layers (from `osidPropertiesMap[osid].mun1990_id`):

| Layer ID | Effect |
|----------|--------|
| `osid-selected-fill` | Strong burnt-orange **fill** on the selected OSID (`fill-antialias: false`) |
| `osid-selected-mun-sibling-fill` | Fainter warm tint on **other OSIDs in the same municipality** (`mun1990_id` match, `osid` ≠ selected) |
| `osid-selected-outline` | Bright amber **rim** line on the selected polygon only |
| `mun-borders-selection` | Solid **adm3 boundary** for that municipality only (`layout.visibility` on when `mun1990_id` known); independent of the **Borders** toggle |

Map mode fill layers (ethnic, supply, …) are inserted **below** `osid-selected-mun-sibling-fill` so this stack stays visible on top of mode coloring.

---

## 8. Interaction Model

### Click Handlers (via useMapInteractions)

| Layer clicked | Action |
|---------------|--------|
| OSID polygon | `setSelectedOsid(osid)` |
| Formation marker | `setSelectedFormationId(formation.id)` |
| Front edge hover layer | `setSelectedCorpsFrontSectorId(sector_id)` if sector present |
| OOBSidebar: brigade row | `setSelectedFormationId(id)` |
| OOBSidebar: corps name | `setSelectedCorpsId(id)` |
| OOBSidebar: faction header | `setSelectedArmyId(faction)` |
| OOBSidebar: operation card | `setSelectedOperationKey(`${corps_id}|${name}`)` → also opens OperationsPanel |
| OperationsPanel objective | `panToOsid(osid)` — pans map to centroid |
| OperationsPanel "Open Corps Orders" | `setIsOpen(false)` + `setSelectedCorpsId(op.corps_id)` |

### Keyboard Shortcuts (useKeyboardShortcuts)

| Key | Action |
|-----|--------|
| `Escape` | Clear all selections, tooltip, order mode, pending confirmation |
| `Enter` | Call `confirmPrimaryAction` if set |
| `1` | setMapMode('political') |
| `2` | setMapMode('ethnic') |
| `3` | setMapMode('supply') |
| `4` | setMapMode('casualties') |
| `5` | setMapMode('morale') |
| `6` | setMapMode('operations') |
| `7` | setMapMode('defense') |
| `8` | setMapMode('authority') |
| `9` | setMapMode('legitimacy') |

(Keys skipped when focus is in INPUT/TEXTAREA.)

### OperationsPanel Keyboard Navigation

| Context | Keys | Action |
|---------|------|--------|
| Operation list | Arrow Up/Down | Move selection + focus to prev/next op card |
| Operation list | Home/End | Jump to first/last op card |
| Objective list | Arrow Up/Down | Move focus + objectiveHoverOsid to prev/next objective |
| Objective list | Home/End | Jump to first/last objective |

### Hover System

- `useMapInteractions` sets `tooltipTarget` on `mousemove` with 300ms delay
- `Tooltip.tsx` renders at `tooltipPosition` (pointer-events:none)
- OOBSidebar brigade/corps hover calls `setHoveredOsids([...])` → `sidebar-hover-outline` layer filter
- OperationsPanel objective hover: `objectiveHoverOsid` → both `hoveredOsids` + `operationTargetOsids` set to `[osid]`

---

## 9. Data Flow

```
User loads save → TopToolbar.handleFileChange
  → gameStore.loadSave(jsonOrText)
    → requestIdleCallback: parseGameState(json) → LoadedGameState
    → set({ loadedGameState })
      → MapContainer useEffect fires: rebuilds all GeoJSON sources
      → All panels re-render with new data

User clicks map OSID → MapContainer click handler
  → setSelectedOsid(osid)
    → SelectionPanel renders with settlement detail

User clicks op card in OOBSidebar
  → setSelectedOperationKey(`${corps_id}|${name}`)
    → auto-sets isOperationsPanelOpen = true
    → OperationsPanel renders + auto-pans to primary objective
    → operationTargetOsids set to all objectives → op-target layers shown on map

User hovers objective in OperationsPanel
  → objectiveHoverOsid set → hoveredOsids + operationTargetOsids → [objectiveOsid]
  → sidebar-hover-outline + op-target layers both update to single OSID

User clicks objective in OperationsPanel
  → panToOsid(osid) → map.easeTo({ center: osidCentroid, duration: 420 })

User clicks "Open Corps Orders"
  → OperationsPanel closes (isOperationsPanelOpen = false)
  → setSelectedCorpsId(op.corps_id) → CorpsDetail opens

User changes map mode → MapModeToolbar → setMapMode(mode)
  → MapContainer useEffect: toggles layer visibility + rebuilds relevant GeoJSON source

Desktop advance-turn → awwv bridge callback → loadSave(stateJson)
  → full state reload (same as file load)
  → officer succession → setLastTurnReport → FormationDetail shows recent command changes
```

---

## 10. Theme & Styling

**Faction colors (Tailwind classes):**
```ts
FACTION_COLORS = {
  RS: 'text-red-400',
  RBiH: 'text-blue-400',
  HRHB: 'text-amber-400',
}
FACTION_COLORS_SUBTLE = { RS: 'text-red-300', ... }
```

**Custom Tailwind tokens (tailwind.config):**
- `bg-panel-bg` — panel background (dark)
- `bg-panel-card` — card/header background
- `bg-panel-border` — border color
- `bg-panel-hover` / `bg-panel-active` — interaction states
- `text-text-primary` / `text-text-secondary` — typography
- `text-interactive` — clickable items
- `text-accent-gold` — section labels, highlights

**Panel positioning (use panelRail.ts, not ad-hoc inline styles):**
```tsx
import { DETAIL_PANEL_STYLE } from './panelRail';
// ...
style={{ ...DETAIL_PANEL_STYLE, width: '24rem' }}
```

All entity panels use `DETAIL_PANEL_STYLE`. Never use Tailwind position classes for panel
placement — RTL handling and class purging can override them. Use `overflow: 'hidden'` to clip
content within the panel bounds.

**Operations utility helpers (`utils/operations.ts`):**

```ts
getOperationId(op: OperationView): string
  // Returns `${op.corps_id}|${op.name}` — matches selectedOperationKey format

getOperationPhaseBadgeClass(phase: string): string
  // Returns Tailwind bg class: planning=yellow-700/80, execution=red-800/80, recovery=neutral-600/80

getOperationPhaseTone(phase: string): string
  // Returns full bg+border+text class set for the phase timeline strip

OPERATION_PHASE_TIMELINE = ['planning', 'execution', 'recovery']
```

---

## 11. Supply System Integration

Supply reserves (Phase A–E) are present in `LoadedGameState.factionReserves` when
`supply_reserves_enabled` is true in the scenario.

| Reserve field | Range | Thresholds |
|---------------|-------|------------|
| `generalSupply` | 0–100 | adequate ≥50, strained 20–49, critical <20 |
| `heavyMunitions` | 0–100 | adequate ≥50, strained 20–49, critical <20 |

`buildSupplyGeoJSON` colors OSIDs by the controlling faction's supply state.
Legacy fallback: `warSupplyPressure` (0–1 scale) when reserves unavailable.

`SupplyPanel` shows reserve bars per faction (appears only when `mapMode === 'supply'`).

---

## 12. Officers Phase E Integration

When `loadedGameState.namedOfficerData` is present:

- **Shared component:** `OfficerProfile.tsx` renders all officer displays consistently across 6+ panels. Props: `officer` (NamedOfficerView), `label` (context string), optional `compact` (show 2 stats instead of 3), `emphasis` (which stat in compact mode), `className`.
- **Character utilities:** `utils/officerCharacter.ts` provides:
  - Missing/non-finite officer ratings are display-unreported: helpers render `Unreported` / neutral color and `getArchetype(...)` renders `Profile Unreported` instead of converting absent source data into poor-trait labels.
  - `getArchetype(officer)` — derived character label from stat profile (e.g., "Master Strategist", "Reckless Attacker", "Paper Commander")
  - `getCompetenceLabel/getAggressionLabel/getDefenseLabel(1-5)` — descriptive stat labels (Inept → Exceptional, Passive → Relentless, Exposed → Ironclad)
  - `getOriginDisplay(origin)` — origin badge with faction-appropriate color (JNA=blue, Militia=orange, etc.)
  - `formatRank(rank)` — abbreviation (army_commander → "Gen.", deputy → "Dep.")
  - `formatPips(value, max)` — visual pip display (●●●●○)
  - `getRatingColor(value)` — color class by rating (red→orange→white→green→gold)
  - `formatCombatRecord(battles, victories)` — "3W/1L (75%)"
  - `formatTenure(turnsInCommand)` — "6mo in command" or "Newly assigned"
- **Officer lookup:** `utils/officerUtils.ts` — `getFormationCommander()`, `getFactionArmyCommander()`
- **Consumers:** CorpsDetail, OperationDetail, FormationDetail, OrbatPanel, OperationsPanel, ArmyDetail, OOBSidebar (name-only with formatRank)
- **NamedOfficerView fields:** id, name, faction, rank, competence, aggressiveness, defensive_skill, political_reliability, origin, home_corps_id, status, assigned_corps_id, acting_commander, turns_in_command, battles, victories
- `FormationDetail` shows **Command** section:
  - Officer quality bar (for brigades) — officer_quality × 100%
  - OfficerProfile card (for corps/army_hq) — compact with context-appropriate emphasis
  - Army commander name (for army_hq formations)
  - Acting commander badge `(Acting)`
- `FormationDetail` shows **Recent command changes** for corps:
  - Reads `lastTurnReport.details.officer_succession.replacements`
  - Filters to current corps, shows new officer name

Officer state lookup: `namedOfficerStateById[officer.id].status === 'active'`

---

## 13. Data Humanization Standards

To improve immersion and readability, all raw simulation data must be processed through `utils/formatters.ts` and `utils/officerCharacter.ts` before rendering.

### 13.1 Time and Dates
- **Policy:** Never show raw turn numbers (e.g., "T32") as the primary identifier.
- **Formatter:** `turnToDateString(turn)` (e.g., "12 Nov 1992") or `formatTurnLabel(label)` (e.g., "12 Nov 1992 · Turn 32").
- **Usage:** Applied to top toolbar, operation start dates, battle history, and modal headers.

### 13.2 Technical Strings (Enums)
- **Policy:** Snake_case internal identifiers must be converted to Title Case for the UI.
- **Formatters:**
  - `formatOperationType(type)`: "sector_attack" → "Sector Attack".
  - `formatPosture(posture)`: "defensive" → "Defensive".
  - `formatCombatOutcome(outcome)`: "attacker_victory" → "Attacker Victory".

### 13.3 Unit Metrics and Counts
- **Personnel:** Use "men" suffix and locale stringing (e.g., "3,200 men").
- **Brigade Assignment:** Expand `(assigned+reserve)` notation to clear labels: `(3 Frontline / 2 Reserve)`.
- **Map Metrics:**
  - "Edges" (mesh geometry counts) → "~X km" (approximate real-world distance).
  - "Segments" → "Contiguous" or "X Disconnected Fronts".
  - "d=" → "Density: ".
  - "Threat ratio" → "Risk ratio".

### 13.4 Officer Stats
- **Policy:** Never show raw 1-5 integers or multiplied values (e.g., "300", "500") for officer attributes.
- **Display:** Use `OfficerProfile` component which renders pip ratings (●●●○○), descriptive labels ("Skilled", "Relentless"), archetype ("Assault Commander"), and origin badge ("JNA").
- **Formatters:** `officerCharacter.ts` — `getCompetenceLabel`, `getAggressionLabel`, `getDefenseLabel`, `getArchetype`, `formatPips`, `getRatingColor`, `getOriginDisplay`, `formatRank`, `formatCombatRecord`, `formatTenure`.

---

---

## 14. GUI Debugging Patterns

These patterns emerged from multi-hour debugging sessions (2026-03-10). Check them first when diagnosing map GUI issues.

### 14.1 GameStateAdapter field paths

After Phase 3 state domain segregation, military fields live under `state.military.*`. `GameStateAdapter.ts` must read from the correct namespace. A wrong path (`(state as any).field` instead of `state.military.field`) silently returns `undefined`, causing source → layer → interaction chains to never initialize. **First diagnostic step**: log the adapter field value in `runUpdate` before debugging layers or interactions. Reference: `state.military.front_edges` (line 1185).

### 14.2 MapLibre `line-offset` and `queryRenderedFeatures`

In MapLibre GL JS v4, `line-offset` shifts visual rendering but does NOT update the spatial index. Clickable hitbox layers must use NO `line-offset` — use wider centered lines instead. Visual-only layers (highlights, glows) can safely use `line-offset`.

### 14.3 Layer creation timing

Map overlay sources are created in `runUpdate` inside nested `requestAnimationFrame` calls. Effects that poll for those sources (e.g. `ensureSectorLayers`) must return `false` (keep polling) when sources don't exist yet. Returning `true` too early stops the poll permanently — dependent layers are never created.

### 14.4 Sector zoom vs map click

Selecting a sector from the map (clicking a front edge) should NOT zoom — the user is already looking at it. Selecting from Command/sidebar should zoom to fit. `sectorSelectedFromMapRef` flag distinguishes the two cases. The pan/zoom effect uses `prevSectorIdRef` to detect sector changes.

---

## 15. Paradox Team & Protocol Roles

The Map UI is maintained according to the **Paradox Team Protocols**.

| Role | Agent | Primary Responsibility |
|------|-------|------------------------|
| **Orchestrator** | `orchestrator.md` | Big-picture lead, delegation, "State of the Game". |
| **UI/UX Developer** | `ui-ux-developer.md` | Component implementation, theme adherence, Nested Rail logic. |
| **Technical Architect** | `technical-architect.md` | ADR, IPC bridge stability, store contract. |
| **Product Manager** | `product-manager.md` | Scope, priority, roadmap tracking. |
| **QA Engineer** | `qa-engineer.md` | Browser verification, layout regression testing. |

**Current Protocol:** Orchestrator-First. Documentation changes must be reviewed by the UI Expert (UI/UX Developer) for alignment with established visual patterns.
