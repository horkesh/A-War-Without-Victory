/**
 * Standalone Tactical Map — shared type definitions.
 * All modules import types from this file.
 */

// ─── Geometry Primitives ─────────────────────────────
export type Position = [number, number] | [number, number, number];
export type Ring = Position[];
export type PolygonCoords = Ring[];
export type MultiPolygonCoords = PolygonCoords[];

export type GeoGeometry =
  | { type: 'Polygon'; coordinates: PolygonCoords }
  | { type: 'MultiPolygon'; coordinates: MultiPolygonCoords }
  | { type: 'LineString'; coordinates: Position[] }
  | { type: 'MultiLineString'; coordinates: Position[][] };

// ─── GeoJSON Feature Types ──────────────────────────
export interface SettlementFeature {
  properties: {
    sid: string;
    municipality_id?: number;
    name?: string;
    pop?: number;
    nato_class?: string;
    majority_ethnicity?: string;
    role?: string;
  };
  geometry: { type: 'Polygon'; coordinates: PolygonCoords }
          | { type: 'MultiPolygon'; coordinates: MultiPolygonCoords };
}

export type BaseMapRole = 'boundary' | 'river' | 'road' | 'settlement' | 'control_region';

export interface BaseMapFeature {
  properties: {
    role: BaseMapRole;
    name?: string;
    nato_class?: string;
    controller?: string;
    [key: string]: unknown;
  };
  geometry: GeoGeometry;
}

export interface SettlementEdge {
  a: string;
  b: string;
}

// ─── Data Containers ────────────────────────────────
export interface PoliticalControlData {
  meta?: { total_settlements: number; counts: Record<string, number> };
  by_settlement_id: Record<string, string | null>;
  control_status_by_settlement_id?: Record<string, string>;
}

export interface SettlementNamesData {
  by_census_id: Record<string, { name: string; mun_code: string; source?: string }>;
}

export interface Mun1990NamesData {
  by_municipality_id: Record<string, { display_name: string; mun1990_id: string }>;
  /** Slug (mun1990_id) → display name; used when settlement has mun1990_id but not municipality_id. */
  by_mun1990_id?: Record<string, { display_name: string }>;
}

export interface EthnicityEntry {
  majority?: string;
  composition?: Record<string, number>;
  provenance?: string;
}

export interface SettlementEthnicityData {
  by_settlement_id: Record<string, EthnicityEntry>;
}

// ─── Bounds & Projection ────────────────────────────
export interface BBox {
  minX: number; minY: number; maxX: number; maxY: number;
}

export interface ViewTransform {
  viewBox: BBox;
  scale: number;
  offsetX: number;
  offsetY: number;
  canvasW: number;
  canvasH: number;
}

// ─── Map State ──────────────────────────────────────
export type ZoomLevel = 0 | 1 | 2;

export interface LayerVisibility {
  politicalControl: boolean;
  frontLines: boolean;
  labels: boolean;
  roads: boolean;
  rivers: boolean;
  boundary: boolean;
  munBorders: boolean;
  minimap: boolean;
  formations: boolean;
  /** When on, selected formation's AoR settlements are highlighted; requires game state loaded. */
  brigadeAor: boolean;
}

/** Controls whether settlement polygons are colored by political control or by ethnic majority (1991). */
export type SettlementFillMode = 'political_control' | 'ethnic_majority';

export interface MapStateSnapshot {
  zoomLevel: ZoomLevel;
  zoomFactor: number;
  panCenter: { x: number; y: number };
  layers: LayerVisibility;
  /** When 'ethnic_majority', settlement fill uses majority ethnicity; otherwise political control. */
  settlementFillMode: SettlementFillMode;
  selectedSettlementSid: string | null;
  hoveredSettlementSid: string | null;
  /** When set, brigade panel shows this formation and its AoR is highlighted (if layer on). */
  selectedFormationId: string | null;
  controlDatasetKey: string;
  loadedGameState: LoadedGameState | null;
}

// ─── Loaded Game State ──────────────────────────────
export interface LoadedGameState {
  label: string;
  turn: number;
  phase: string;
  formations: FormationView[];
  militiaPools: MilitiaPoolView[];
  controlBySettlement: Record<string, string | null>;
  statusBySettlement: Record<string, string>;
  /** Per formation id: sorted list of settlement IDs in that formation's AoR (from state.brigade_aor). */
  brigadeAorByFormationId: Record<string, string[]>;
  /** Sorted pending attack orders for map overlays and ORDERS tab. */
  attackOrders: AttackOrderView[];
  /** Sorted pending municipality movement orders for map overlays and ORDERS tab. */
  movementOrders: MovementOrderView[];
  /** Sorted control events for EVENTS tab and lightweight AAR rendering. */
  recentControlEvents: RecentControlEventView[];
  /** Recruitment capital and equipment by faction (when state.recruitment_state exists). Keys in deterministic order. */
  recruitment?: RecruitmentView;
  /** Which side the human plays (desktop New Game). RBiH, RS, or HRHB when set. */
  player_faction?: string | null;
  /** Earliest turn when RBiH–HRHB war can start (for front line display). */
  rbih_hrhb_war_earliest_turn?: number | null;
  /** RBiH–HRHB alliance value; when > ALLIED_THRESHOLD no front between them. */
  phase_i_alliance_rbih_hrhb?: number | null;
}

export interface RecruitmentView {
  capitalByFaction: Record<string, number>;
  equipmentByFaction?: Record<string, number>;
  /** Brigade IDs already recruited (for eligibility). */
  recruitedBrigadeIds: string[];
}

export interface AttackOrderView {
  brigadeId: string;
  targetSettlementId: string;
}

export interface MovementOrderView {
  brigadeId: string;
  targetMunicipalityId: string;
}

export interface RecentControlEventView {
  turn: number;
  settlementId: string;
  from: string | null;
  to: string | null;
  mechanism: string;
  municipalityId: string | null;
}

export interface ReplayControlEvent {
  turn: number;
  settlement_id: string;
  from: string | null;
  to: string | null;
  mechanism: string;
  mun_id: string | null;
}

export interface ReplayFrame {
  week_index: number;
  game_state: unknown;
}

export interface ReplayTimelineData {
  meta?: {
    run_id?: string;
    scenario_id?: string;
    weeks?: number;
  };
  frames: ReplayFrame[];
  control_events?: ReplayControlEvent[];
}

export interface FormationView {
  id: string;
  faction: string;
  name: string;
  kind: string;
  readiness: string;
  cohesion: number;
  fatigue: number;
  status: string;
  createdTurn: number;
  tags: string[];
  municipalityId?: string;
  /** When set, map draws formation icon at this settlement; else uses municipality centroid. */
  hq_sid?: string;
  /** Settlement IDs in this formation's AoR (front-active assignments). Sorted for determinism. */
  aorSettlementIds?: string[];
  personnel?: number;
  /** Brigade posture: defend | probe | attack | elastic_defense. */
  posture?: string;
}

export interface MilitiaPoolView {
  munId: string;
  faction: string;
  available: number;
  committed: number;
  exhausted: number;
  fatigue: number;
}

// ─── Render Context ─────────────────────────────────
export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
  viewTransform: ViewTransform;
  project: (dataX: number, dataY: number) => [number, number];
  unproject: (canvasX: number, canvasY: number) => [number, number];
  zoomLevel: ZoomLevel;
  zoomFactor: number;
  layers: LayerVisibility;
}

// ─── Search Index ───────────────────────────────────
export interface SearchIndexEntry {
  sid: string;
  name: string;
  /** Short display name for map labels (e.g. "Sarajevo" instead of "Sarajevo Dio - Centar Sajarevo"). */
  displayName: string;
  nameNormalized: string;
  natoClass: string;
  population: number;
  municipalityId: number | undefined;
  bbox: BBox;
  centroid: [number, number];
}

/** Pre-computed shared border segments between adjacent settlements for front line rendering. */
export interface SharedBorderSegment {
  a: string;  // SID of settlement A
  b: string;  // SID of settlement B
  points: Position[];  // Ordered shared vertices along the contact line
}

// ─── Settlement Panel ───────────────────────────────
export type PanelTabId = 'overview' | 'admin' | 'control' | 'intel' | 'orders' | 'aar' | 'events';

export interface SettlementPanelData {
  sid: string;
  name: string;
  natoClass: string;
  population: number | null;
  controller: string;
  controlStatus: string;
  factionColor: string;
  municipalityName: string;
  mun1990Id: string;
  munSettlementCount: number;
  ethnicity: EthnicityEntry | null;
  formations: FormationView[];
  militiaPool: MilitiaPoolView | null;
}

// ─── Event Types ────────────────────────────────────
export type MapEventType =
  | 'stateChanged'
  | 'settlementSelected'
  | 'settlementHovered'
  | 'zoomChanged'
  | 'layerToggled'
  | 'panChanged'
  | 'gameStateLoaded'
  | 'controlDatasetChanged';

export interface MapEvent {
  type: MapEventType;
  payload?: unknown;
}

export type MapEventListener = (event: MapEvent) => void;

// ─── Loaded Data Bundle ─────────────────────────────
export interface ClassifiedBaseFeatures {
  boundary: BaseMapFeature[];
  rivers: BaseMapFeature[];
  roadsMSR: BaseMapFeature[];
  roadsSecondary: BaseMapFeature[];
  controlRegions: BaseMapFeature[];
}

export interface LoadedData {
  settlements: Map<string, SettlementFeature>;
  baseFeatures: ClassifiedBaseFeatures;
  controlData: PoliticalControlData;
  controlLookup: Record<string, string | null>;
  statusLookup: Record<string, string>;
  edges: SettlementEdge[];
  sharedBorders: SharedBorderSegment[];
  settlementNames: SettlementNamesData;
  mun1990Names: Mun1990NamesData;
  ethnicityData: SettlementEthnicityData | null;
  dataBounds: BBox;
  searchIndex: SearchIndexEntry[];
  /** Per-municipality, the SID of the most populous URBAN_CENTER (for label dedup). */
  primaryLabelSids: Set<string>;
  settlementCentroids: Map<string, [number, number]>;
  municipalityCentroids: Map<string, [number, number]>;
}
