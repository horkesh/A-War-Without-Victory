# Map UI Master Reference

**Project:** A War Without Victory (AWWV)
**Source tree:** `src/ui/map/`
**Dev server:** `npm run dev:map` (Vite, port 3002)
**Build:** `npm run build` → `dist/tactical-map/`
**Last updated:** 2026-03-06

> **See also:** [TACTICAL_MAP_SYSTEM.md](TACTICAL_MAP_SYSTEM.md) — original engineering reference.
> This document is the **component-level master reference** covering current panel layout,
> store contract, layer system, builders, data types, and interaction model.
> **GUI polish phases (2026-03-05):** Authoritative checklist **A–F** (Arrow overhaul, Ops Planning modal, Map mode toolbar/pressure, Battle marker pulse, Bottom status strip, General polish) is in [20260305_GUI_POLISH_ORCHESTRATED_EXECUTION.md](../40_reports/implemented/20260305_GUI_POLISH_ORCHESTRATED_EXECUTION.md) §Consolidated Phase List.

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
│   ├── orderActions.ts            advanceTurnAndSync(), stageMoveOrderFromOsid(), stagePostureOrderAction()
│   └── campaignRecruitmentActions.ts  startCampaignFromSidePicker(), fetchRecruitmentCatalog(), applyRecruitmentAndSync()
│
├── map/
│   ├── MapContainer.tsx           Master map: MapLibre init, all sources/layers, GeoJSON updates
│   ├── useMapInteractions.ts      Click/hover event wiring → store callbacks (300ms hover delay)
│   ├── formationIcons.ts          HoI-style rectangular brigade counters (160×80 canvas, pixelRatio 2 → 80×40 CSS px/unit; faction-colored fill; white kind abbreviation)
│   ├── frontLineIcons.ts          Front-line SVG icon helpers (stub)
│   ├── pmtilesRoute.ts            PMTiles URL routing helper (stub)
│   ├── rewritePmtilesUrls.ts      Shared PMTiles style URL rewriter (pmtiles:/// → pmtiles://origin/); used by MapContainer and OpsPlanningModal
│   ├── awwv_map_style.json        MapLibre base style (terrain, glyphs, base layers)
│   └── builders/
│       ├── buildControlGeoJSON.ts              OSID polygons + faction controller property
│       ├── buildFrontLinesGeoJSON.ts           Faction border LineStrings (shared OSID edges)
│       ├── buildEthnicGeoJSON.ts               OSID majority ethnic (Bosniak/Serb/Croat/Other)
│       ├── buildSupplyGeoJSON.ts               OSID supply state coloring (adequate/strained/critical)
│       ├── buildDensityGeoJSON.ts              Front OSID density coloring (thin/normal/dense)
│       ├── buildFormationsGeoJSON.ts           Formation Point markers at OSID centroids
│       ├── buildOrderArrowsGeoJSON.ts          Attack/move arrow LineStrings
│       ├── buildCorpsFrontLinesGeoJSON.ts      Corps-colored front lines (glow + tooth edge)
│       ├── buildSectorDemarcationGeoJSON.ts    Lateral boundaries between same-faction sectors
│       ├── buildFrontEdgesHoverGeoJSON.ts      Per-segment offset features for asymmetric hover/click
│       ├── buildOperationTargetIconsGeoJSON.ts Op objective markers: points + crosshairs
│       ├── formationIconId.ts                  Icon ID string from kind + faction
│       ├── geojsonLookup.ts                    buildOsidCentroidLookup() helper
│       ├── resolveFormationLocationOsid.ts     location_osid or first AoR fallback
│       ├── generateFactionBorders.ts           Shared-edge faction boundary computation
│       ├── buildFogOfWarGeoJSON.ts             Enemy-territory fog-of-war polygon fill from `LoadedGameState.fogOfWar`
│       ├── buildBattleMarkersGeoJSON.ts        Combat flip events → Point features (last 3 turns, age-based opacity)
│       └── buildStrategicPointGeoJSON.ts       City/seat classification from OSID `{mun}_2` slug → Point features
│
├── components/
│   ├── Entity slide-out panels (left: 19rem — see §2 for layout)
│   │   ├── FormationDetail.tsx    Brigade/corps/army detail (highest priority)
│   │   ├── CorpsFrontPanel.tsx    Sector detail (sector selected, no formation)
│   │   ├── CorpsDetail.tsx        Corps detail (corps selected)
│   │   ├── ArmyDetail.tsx         Faction summary (faction header clicked)
│   │   └── OperationsPanel.tsx    Operations master-detail panel (open via op card or store)
│   │
│   ├── SelectionPanel.tsx         OSID detail (right: 1rem — separate from entity panels)
│   ├── OOBSidebar.tsx             Left accordion sidebar (Situation/Army/Ops/Sectors)
│   ├── TopToolbar.tsx             Top bar: file/run load UI, faction gradient banner
│   ├── MapModeToolbar.tsx         Bottom-center: map mode buttons + layer toggles
│   ├── BottomStatusStrip.tsx      Bottom-left 1-line strip: OSID name, controller, formation count
│   ├── Minimap.tsx                Bottom-left 250×180px secondary map
│   ├── Tooltip.tsx                Mouse-follow tooltip (300ms delay): OSID/formation/front
│   ├── SupplyPanel.tsx            Reserve bars when supply map mode active
│   ├── OrderQueue.tsx             Phase C5 staged order queue
│   ├── AttackConfirmation.tsx     Attack confirmation modal
│   ├── CombatSummaryPanel.tsx     Reusable combat record display (battles/casualties/territory)
│   ├── SituationTab.tsx           Situation accordion content in OOBSidebar
│   ├── BrigadeRow.tsx             Compact brigade list item in OOBSidebar
│   ├── CorpsCard.tsx              Corps card in OOBSidebar accordion
│   ├── SettlementDetailContent.tsx Reusable settlement info (used in SelectionPanel + Tooltip)
│   ├── SidePickerOverlay.tsx      Faction selection overlay shown before game load (Phase 4)
│   ├── RecruitmentModal.tsx       Brigade recruitment modal: catalog, eligibility, recruit action (Phase 4)
│   ├── WarSummaryModal.tsx        War Summary modal: area-weighted territory, military strength, displacement (Phase 5)
│   └── panelRail.ts               Shared panel positioning constants (DETAIL_PANEL_STYLE, SECONDARY_PANEL_STYLE)
│
├── store/
│   └── gameStore.ts               Zustand store — all UI state (see §4)
│
├── data/
│   ├── types.ts                   LoadedGameState + all sub-interfaces (see §5)
│   ├── GameStateAdapter.ts        parseGameState(): raw JSON → LoadedGameState
│   ├── DataLoader.ts              Async loaders: operational_settlements, control, runs
│   └── ControlLookup.ts           Control/status lookup builders
│
├── hooks/
│   ├── useKeyboardShortcuts.ts    Enter/Escape/1–5 global key handler (map modes 1–5)
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
    └── formatters.ts              turnToDateString, formatTurnLabel, formatOperationType, formatCombatOutcome, formatPosture
```

---

## 2. Screen Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TopToolbar (z:50, top:0, full width)                │
│             Load file / Load latest / Load run ID | faction gradient        │
├─────────────┬───────────────────────────────────────────┬────────────────────┤
│             │                                           │                    │
│ OOBSidebar  │            MapContainer                   │  Entity panels     │
│ (z:40,      │         MapLibre GL, z:30                 │  (DETAIL_PANEL_STYLE):
│  left:0,    │                                           │                    │
│  position:  │                                           │  FormationDetail   │
│  fixed)     │                                           │  CorpsFrontPanel   │
│             │                                           │  CorpsDetail       │
│  Accordion: │                                           │  ArmyDetail        │
│  Situation  │                                           │  OperationsPanel   │
│  Army       │                                           │  (left:19rem,      │
│  Operations │                                           │   top:3.5rem,      │
│  Sectors    │                                           │   bottom:2rem,     │
│             │                                           │   z:50)            │
│             │                                           │                    │
│             │                                           │  SelectionPanel    │
│             │                                           │  (OSID info only,  │
│             │                                           │   right:1rem,      │
│             │                                           │   top:3.5rem,      │
│             │                                           │   bottom:1rem,     │
│             │                                           │   width:20rem)     │
│             ├───────────────────────────────────────────┘                    │
│             │  MapModeToolbar (bottom:32px, centered)                        │
│ Minimap     ├─────────────────────────────────────────────────────────────── │
│ (250×180,   │  BottomStatusStrip (bottom:0, left:0, right:0)                 │
│  bottom-left│  selected OSID name · controller · N formations                │
│  z:40)      │                                                                 │
└─────────────┴─────────────────────────────────────────────────────────────── ┘
```

**SupplyPanel:** bottom:36px, left:12px, z:20 — appears only when `mapMode === 'supply'`
**Tooltip:** z:100+, pointer-events:none, follows mouse
**AttackConfirmation modal:** z:60, centered, appears when `pendingAttackConfirmation` set

### Entity Panel Priority (only one shows at a time)

| Priority | Panel | Condition |
|----------|-------|-----------|
| 1 (highest) | FormationDetail | `selectedFormationId` set |
| 2 | CorpsFrontPanel | `selectedCorpsFrontSectorId` set, no formation |
| 3 | CorpsDetail | `selectedCorpsId` set, no formation/sector |
| 4 | ArmyDetail | `selectedArmyId` set, no formation/sector/corps |
| 5 (lowest) | OperationsPanel | `isOperationsPanelOpen` true, nothing else selected |

SelectionPanel (OSID) is independent and on the right edge; it is suppressed when a sector or
formation is selected (since those panels overlap the same screen area).

### panelRail.ts

All entity panels share positioning via `DETAIL_PANEL_STYLE` from `components/panelRail.ts`:

```ts
export const DETAIL_PANEL_STYLE: CSSProperties = {
  position: 'absolute',
  left: '19rem',
  top: '3.5rem',
  bottom: '2rem',
  zIndex: 50,
  overflow: 'hidden',
};
```

Usage: `style={{ ...DETAIL_PANEL_STYLE, width: '24rem' }}`. Width is panel-specific.
`SECONDARY_PANEL_STYLE` offsets to `left: '43rem'` for nested/detail-within-detail panels.

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
- **Shows:** `selectedArmyId` set, no formation/sector/corps selected
- **Data:** faction name + full display name, stance, exhaustion, total personnel, brigade/corps/sector counts,
  militia pools (available/committed/exhausted), casualties (KIA/WIA), army HQ combat summary,
  corps list (clickable with subordinate count + personnel + combat summary line)
- **Interactions:** Corps click → setSelectedCorpsId; hover corps → setHoveredOsids (brigade locations);
  close → setSelectedArmyId(null)

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

Five map modes (bottom bar, centered):

| Button | Key | Store value | Layers activated |
|--------|-----|-------------|-----------------|
| Political | 1 | `'political'` | osid-control fill |
| Ethnic | 2 | `'ethnic'` | osid-ethnic fill |
| Supply | 3 | `'supply'` | osid-supply fill + SupplyPanel |
| Pressure | 4 | `'pressure'` | osid-pressure fill (front pressure heatmap) |
| Density | 5 | `'density'` | osid-density fill |

Layer toggles (no keys):

| Toggle | Store field | Layers |
|--------|-------------|--------|
| Fronts | `frontsVisible` | faction-border-glow-pos/neg, front-line-base, front-line-stripe |
| Units | `formationsVisible` | formation-markers |
| Labels | `labelsVisible` | formation-labels (requires formationsVisible) |
| Sectors | `sectorsVisible` | sector-fill, sector-demarcation, sector-glow-pos/neg, brigade-rings |
| Minimap | `minimapVisible` | Minimap component visibility |
| Fog | `fogVisible` | fog-fill (AND-gated with player_faction + reconIntelligence; no-op in observer mode) |
| Battles | `battlesVisible` | battle-markers-pulse (white circles at recent combat flip OSIDs; opacity by age) |
| Points | `strategicVisible` | strategic-points-circles (gold circles — tier city r8, seat r5; derived from `_2` OSID slug) |

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
orderModeForFormation: 'attack' | 'move' | null
pendingAttackConfirmation: { attackerFormationId: string; targetOsid: string } | null
confirmPrimaryAction: (() => void) | null   // Enter key callback
stagedOrders: StagedOrder[]                 // { id, type, formationId, targetOsid?, postureName? }
```

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
  phaseIiExhaustion?: Record<string, number>;         // faction → exhaustion
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
  departedByOsid?: Record<string, Record<string, number>>;
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
| `buildSectorDemarcationGeoJSON` | controlledGeoJson, sectors, frontEdgesOsid | LineString boundaries | Sector lateral boundaries |
| `buildFrontEdgesHoverGeoJSON` | controlledGeoJson, frontEdgesOsid, sectors, centroids | 2× LineString per polygon boundary segment (per-segment offset) | Asymmetric click/hover hitboxes; each feature carries sector_id for filter-based highlighting |
| `buildOperationTargetPointsGeoJSON` | centroidLookup, osids | Point features at OSID centroids | Op target ring + dot layers |
| `buildOperationTargetCrosshairsGeoJSON` | centroidLookup, osids | LineString ± pairs per OSID | Op target crosshair layer |

### buildOperationTargetIconsGeoJSON Detail

`buildOperationTargetPointsGeoJSON(centroidLookup, osids)` — one Point feature per OSID, at
`osidCentroidsRef.current.get(osid)`. Used by circle ring and dot layers.

`buildOperationTargetCrosshairsGeoJSON(centroidLookup, osids)` — two LineString features per OSID
(horizontal + vertical arms, ARM=0.038°), drawn around the centroid. Used by crosshair line layer.

Both return `FeatureCollection` with `properties.osid` for debugging.

### Sector Demarcation Detail

`buildSectorDemarcationGeoJSON` finds lateral boundaries (lines between adjacent sectors of the
**same faction** along the rear/lateral edge). It:

1. Collects shared polygon edges from the controlled GeoJSON
2. For each edge with exactly 2 OSID owners, looks up which sector each OSID belongs to
3. Skips edges where the two sectors are from different factions (those are front lines)
4. Groups segments by `(sector_a, sector_b)` pair
5. Chains adjacent 2-point segments into continuous LineStrings using `chainSegments()`
6. Emits one feature per chain with `{ faction, sector_a, sector_b }`

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
| `sector-demarcation-lines` | Lateral sector boundary lines |
| `sector-glow-pos` / `sector-glow-neg` | Sector boundary glows |
| `sector-brigade-rings` | Brigade position rings |

### Formation Layers

| Layer ID | Purpose |
|----------|---------|
| `formation-markers` | Unit icon symbols (icon_id → sprite) |
| `formation-labels` | Formation name text labels |

### Front Edge Hover Layers

| Layer ID | Purpose |
|----------|---------|
| `front-edges-hover-pos` / `front-edges-hover-neg` | Invisible click hitboxes (offset per side) |
| `front-edges-highlight-pos` / `front-edges-highlight-neg` | Sector highlight on hover (filter by sector_id, not feature-state) |

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

### Map Mode Fill Layers

| Layer ID | Active when |
|----------|-------------|
| `osid-control` | `mapMode === 'political'` |
| `osid-ethnic-fill` | `mapMode === 'ethnic'` |
| `osid-supply-fill` | `mapMode === 'supply'` |
| `osid-density-fill` | `mapMode === 'density'` |

Pressure mode reuses the political fill with a separate coloring pass.

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
| `4` | setMapMode('pressure') |
| `5` | setMapMode('density') |

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
Legacy fallback: `phaseIiSupplyPressure` (0–1 scale) when reserves unavailable.

`SupplyPanel` shows reserve bars per faction (appears only when `mapMode === 'supply'`).

---

## 12. Officers Phase E Integration

When `loadedGameState.namedOfficerData` is present:

- `FormationDetail` shows **Command** section:
  - Officer quality bar (for brigades) — officer_quality × 100%
  - Corps commander name (from `namedOfficerStateById`, assigned_corps_id match)

---

## 13. Data Humanization Standards

To improve immersion and readability, all raw simulation data must be processed through `utils/formatters.ts` before rendering.

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

  - Army commander name (for army_hq formations)
  - Acting commander badge `(Acting)`
- `FormationDetail` shows **Recent command changes** for corps:
  - Reads `lastTurnReport.details.officer_succession.replacements`
  - Filters to current corps, shows new officer name

Officer state lookup: `namedOfficerStateById[officer.id].status === 'active'`

---

## 13. Known Constraints & Standing Directives

| Constraint | Rule |
|-----------|------|
| Front line style | Black-white stripe only. No chevrons, no HoI4 barbed-wire. |
| Sector density modifiers | Use faction-level aggregation only. Never per-corps density for THIN/DENSE modifier. |
| AoR legacy | AoR/ZoC cleanup R1–R5 complete (2026-03-04). `getLegacyAoR()` + all consumer dead branches removed. ZoC fully removed (2026-03-02). See `AOR_ZOC_LEGACY_AUDIT.md`. |
| OSID vs SID | `political_controllers` keyed by OSID. Never use getEffectiveSettlementSide() for control. |
| Supply gating | Only gate on supply when `supply_reserves_enabled=true`. OSID reachability runs regardless. |
| MapLibre blob workers | Map assets served over HTTP (`http://127.0.0.1:<port>`). Blob workers fail under `awwv://`. |
| Panel positioning | Use `panelRail.ts` DETAIL_PANEL_STYLE + inline styles (not Tailwind position classes). |
| saved/ directory | Excluded from tsconfig compilation. Reference snapshots from old codebase only — do not import from `saved/`. |
| Operations modal | OperationsPanel = slide-out (left:19rem). Ops planning = separate centered modal (future). |
| Two highlight systems | `hoveredOsids` → `sidebar-hover-outline` (gold border). `operationTargetOsids` → op-target crosshair/ring/fill layers. Set together in OperationsPanel. |
