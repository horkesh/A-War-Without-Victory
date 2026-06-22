import { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import type {
  AddLayerObject,
  AddProtocolAction,
  CanvasSourceSpecification,
  FilterSpecification,
  GeoJSONSource,
  SourceSpecification,
} from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import type { PickingInfo } from '@deck.gl/core';
import type { LoadedGameState } from '../data/types';
import { t, useLocale } from '../i18n';
import {
  useMapInteractions,
  queryPreferredFrontFeatureNearPoint,
} from './useMapInteractions';
import { useGameStore } from '../store/gameStore';
import { collectSectorFriendlyOsids, buildOsidToSectorMap, resolveCurrentSectorForFormation } from '../utils/sectorUtils';
import { buildCorpsColorMap } from './builders/buildCorpsFrontLinesGeoJSON';
import { buildOsidDisplayNameMap, getOsidDisplayName } from '../utils/osidDisplayName';
import { loadOperationalPoliticalControl, loadOperationalSettlements, loadOsidAdjacency, loadSidToOsidMapping, loadTerrainScalars, loadCensusSettlements } from '../data/DataLoader';
import { buildControlGeoJSON } from './builders/buildControlGeoJSON';
import { buildMoraleGeoJSON } from './builders/buildMoraleGeoJSON';
import { buildCasualtiesGeoJSON } from './builders/buildCasualtiesGeoJSON';
import { buildDefenseStrengthGeoJSON } from './builders/buildDefenseStrengthGeoJSON';
import { buildEthnicGeoJSON } from './builders/buildEthnicGeoJSON';
import { buildSupplyGeoJSON } from './builders/buildSupplyGeoJSON';
import { buildSupplyReachGeoJSON } from './builders/buildSupplyReachGeoJSON';
import { buildOperationalWeightGeoJSON } from './builders/buildOperationalWeightGeoJSON';
import { buildFrontLinesGeoJSON } from './builders/buildFrontLinesGeoJSON';
import { buildContestedBandsGeoJSON } from './builders/buildContestedBandsGeoJSON';
import { buildFrontStabilityGeoJSON } from './builders/buildFrontStabilityGeoJSON';
import { buildPoliticalMetricGeoJSON } from './builders/buildPoliticalMetricGeoJSON';
import { buildFrontEdgesHoverGeoJSON } from './builders/buildFrontEdgesHoverGeoJSON';
import { buildCorpsFrontLinesGeoJSON, buildCorpsColorExpression } from './builders/buildCorpsFrontLinesGeoJSON';
import { buildOperationTargetPointsGeoJSON, buildOperationTargetCrosshairsGeoJSON } from './builders/buildOperationTargetIconsGeoJSON';
import { buildOperationArrowsGeoJSON } from './builders/buildOperationArrowsGeoJSON';
import { buildFormationsGeoJSON } from './builders/buildFormationsGeoJSON';
import { buildOsidCentroidLookup } from './builders/geojsonLookup';
import { resolveFormationLocationOsid } from './builders/resolveFormationLocationOsid';
import { ensureFormationIcons, ensureTacticalIcons } from './formationIcons';
import { buildFogOfWarGeoJSON } from './builders/buildFogOfWarGeoJSON';
import { buildEnclaveGeoJSON } from './builders/buildEnclaveGeoJSON';
import { buildBattleMarkersGeoJSON } from './builders/buildBattleMarkersGeoJSON';
import { buildMajorCityLabelGeoJSON } from './builders/buildMajorCityLabelGeoJSON';
import { StackExpansionOverlay } from '../components/StackExpansionOverlay';
import { RadialMenu } from '../components/RadialMenu';
import type { RadialMenuItem } from '../components/RadialMenu';
import { rewritePmtilesUrls } from './rewritePmtilesUrls';
import { useIPC } from '../desktop/useIPC';
import { stageAssignBrigadeToSectorAction } from '../desktop/orderActions';
import { collectEmphasizedFormationIds, collectHighlightedFormationIds } from './highlightSelection';
import styleJson from './awwv_map_style.json';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { composeTacticalDeckLayers, DEFAULT_DECK_LAYER_CAPABILITIES } from '../layers/composeTacticalDeckLayers';
import { setSettlementLabelData } from '../layers/buildTacticalDeckLayers';
import { buildGhostMapData, type GhostMapDatum } from '../layers/buildGhostMapLayer';
import { buildOsidDamageData, type OsidDamageDatum, type OsidDamageSeed } from '../layers/buildOsidDamageOverlay';
import { buildForceQualityData, type ForceQualityDatum } from '../layers/buildForceQualityOverlay';
import { buildRefugeeColumnData, type RefugeeColumnDatum } from '../layers/buildRefugeeColumnOverlay';
import {
  buildCorridorHeartbeatData,
  type CorridorHeartbeatDatum,
  type FrontEdgeRecord as CorridorFrontEdgeRecord,
  type FrontPressureRecord as CorridorFrontPressureRecord,
} from '../layers/buildCorridorHeartbeatOverlay';
import { createDevTimer } from './overlayTiming';

/**
 * Feature flag: Map That Scars per-OSID damage overlay.
 *
 * Default ON as of LANE-NIGHTSHIFT-MAP-THAT-SCARS-VALIDATION
 * (docs/40_reports/implemented/20260504_MAP_THAT_SCARS_VALIDATION.md).
 *
 * Validation evidence:
 *   - tests/osid_damage_overlay_builder.test.ts T5..T8 (8/8 GREEN) confirm
 *     the deck.gl PolygonLayer descriptor is well-formed: faction-neutral
 *     RGB [20,20,24], per-tier alpha (0.05 / 0.15 / 0.30), no faction
 *     coupling, empty-seed safe, and zero-score OSIDs skipped so territory
 *     fill is preserved.
 *   - Capability gate in composeTacticalDeckLayers still requires
 *     `mapScarsData.length > 0`; the layer is not added when the seed
 *     fetch fails.
 *
 * Flip back to false only if a regression is detected on the live map.
 */
const MAP_SCARS_FEATURE_FLAG = true;

/**
 * Feature flag: Force-Quality Glow per-OSID per-faction officer-quality overlay.
 *
 * Default ON as of LANE-NIGHTSHIFT-FORCE-QUALITY-GLOW
 * (docs/40_reports/implemented/20260505_FORCE_QUALITY_GLOW_VALIDATION.md).
 * Closes the second v0.9.4 (Visual Layer) feature.
 *
 * Validation evidence:
 *   - tests/force_quality_overlay_builder.test.ts T1..T8 (8/8 GREEN) confirm
 *     the deck.gl PolygonLayer descriptor is well-formed: faction-symmetric
 *     palette lookup (RBiH/RS/HRHB → existing per-faction RGB tints), per-tier
 *     alpha (0.05 / 0.15 / 0.30), zero-quality skip, capability-gated by
 *     forceQualityData.length > 0, deterministic builder output.
 *   - Capability gate in composeTacticalDeckLayers requires
 *     `forceQualityData.length > 0`; the layer is not added when no active
 *     brigade has officer_quality data.
 *
 * Sensitive-history: Ring 1, UI-only, faction-symmetric mechanism (palette
 * lookup is data, not branching logic). Builder reads existing
 * `LoadedGameState.formations[*].officer_quality`; no engine plumbing.
 *
 * Flip back to false only if a regression is detected on the live map.
 */
const FORCE_QUALITY_FEATURE_FLAG = true;

/**
 * Feature flag: Refugee Column per-displacement-event PathLayer overlay.
 *
 * Default ON as of LANE-NIGHTSHIFT-V094-THIRD-VISUAL-FEATURE
 * (docs/40_reports/implemented/20260505_REFUGEE_COLUMN_VALIDATION.md).
 * Closes the third v0.9.4 (Visual Layer) feature.
 *
 * Validation evidence:
 *   - tests/refugee_column_overlay_builder.test.ts T1..T8 (8/8 GREEN) confirm
 *     the deck.gl PathLayer descriptor is well-formed: faction-symmetric
 *     palette lookup (`FACTION_GLOW_RGB` shared with Force-Quality Glow), per-
 *     tier width scaling (300 / 600 / 1200 / 2000m capped), zero-displacement
 *     skip, missing-origin-or-dest skip, self-loop skip, per-route aggregation
 *     by (origin, dest, turn, faction), deterministic output sorted by
 *     (from_osid, to_osid, week_index, faction_origin) strictCompare.
 *   - Capability gate in composeTacticalDeckLayers requires
 *     `refugeeColumnData.length > 0`; the layer is not added when no
 *     displacement event in the log has both an origin and a destination.
 *
 * Sensitive-history: Ring 1, UI-only, faction-symmetric mechanism (palette
 * lookup is data, not branching logic). Builder reads existing
 * `LoadedGameState.displacementEventLog`; no engine plumbing, no save embed.
 * Width cap (2000m at ≥10k displaced) prevents a single mass-displacement
 * event from visually dominating the map.
 *
 * Flip back to false only if a regression is detected on the live map.
 */
const REFUGEE_COLUMN_FEATURE_FLAG = true;

/**
 * Feature flag: Corridor Heartbeat per-strategic-corridor PathLayer overlay.
 *
 * Default ON as of LANE-NIGHTSHIFT-V094-CORRIDOR-HEARTBEAT
 * (docs/40_reports/implemented/20260505_CORRIDOR_HEARTBEAT_VALIDATION.md).
 * Closes the fourth v0.9.4 (Visual Layer) feature.
 *
 * Validation evidence:
 *   - tests/corridor_heartbeat_overlay_builder.test.ts T1..T8 (8/8 GREEN)
 *     confirm the deck.gl PathLayer descriptor is well-formed: faction-
 *     symmetric palette lookup (`FACTION_GLOW_RGB` shared with Force-
 *     Quality Glow + Refugee Column), per-tier width scaling
 *     (240/480/900/1500m capped), zero-intensity skip, missing-side /
 *     same-side edge skip, self-loop skip, missing-centroid skip, MAX-
 *     intensity per-corridor aggregation by (friendly, hostile, faction),
 *     deterministic output sorted by (from_osid, to_osid, faction)
 *     strictCompare.
 *   - Capability gate in composeTacticalDeckLayers requires
 *     `corridorHeartbeatData.length > 0`; the layer is not added when no
 *     contested front edge is present (early-war pre-front-formation).
 *
 * Sensitive-history: Ring 1, UI-only, faction-symmetric mechanism (palette
 * lookup is data, not branching logic). Builder reads existing
 * `LoadedGameState.frontEdgesOsid` + optional
 * `LoadedGameState.frontPressureByEdge`; no engine plumbing, no save embed.
 * Width cap (1500m at intensity ≥0.9) prevents a single critical lifeline
 * from visually dominating the map.
 *
 * Animation status: STATIC. deck.gl `PathLayer` does not natively support
 * time-keyed pulses; `period_ms` is retained on each datum for a future
 * TripsLayer / shader follow-on.
 *
 * Disabled after live UI review: the red/green path network added visual
 * noise and was too easy to mistake for player-issued orders.
 */
const CORRIDOR_HEARTBEAT_FEATURE_FLAG = false;
import { findPlayerFacingSectorById, resolvePlayerFacingFaction } from '../../shared/playerVisibility';
import {
  FRONT_SURFACE_HITBOX_WIDTHS,
  INTERACTION_HITBOX_OPACITY,
  toZoomWidthExpression,
} from './interactionLayerConfig';
import { getDynamicInteractionLayerSignature, shouldScheduleInteractionRetry } from './dynamicInteractionLayers';
import { pickNearestFormationAtPoint, resolveDeckFormationClickTarget } from './clickSelectionPriority';
import {
  resolveMapFormationInspectionTarget,
  resolveMapSectorInspectionTarget,
  resolveMapSettlementInspectionTarget,
} from './mapSelectionRouting';
import {
  deckLayerRenderInputsChanged,
  shouldRunPulseAnimation,
  type DeckLayerRenderInputs,
} from './renderChurnGuards';
import { inspectOnField } from '../utils/shellNavigation';

const BOSNIA_CENTER: [number, number] = [17.7, 43.87];
// Bounds widened both west and east so the camera can recenter on Bihać
// (≈15.87°E, 44.82°N) AND on the Drina-valley settlements (~19.55°E in the
// Bijeljina / Brčko / east Foča area) without those cities sliding off-screen.
// Originally 15.7243→19.62278; widened to 15.45→19.92 (~30 km margin each side).
const BOSNIA_MAX_BOUNDS: [[number, number], [number, number]] = [
  [15.45, 42.55719],
  [19.92, 45.270542],
];
const TACTICAL_MAP_PITCH_DEGREES = 30;
const DEFAULT_ZOOM = 8;
const SIDEBAR_HOVER_LAYER_ID = 'sidebar-hover-outline';
const EMPTY_GEOJSON: FeatureCollection = { type: 'FeatureCollection', features: [] };
type MapSourceSpecification = SourceSpecification | CanvasSourceSpecification;
type TacticalDeckPickObject = { properties?: Record<string, unknown> };
type TacticalDeckPickingInfo = PickingInfo<TacticalDeckPickObject>;

function inspectFormationFromMap(formationId: string, properties?: Record<string, unknown> | null) {
  const store = useGameStore.getState();
  inspectOnField(store, resolveMapFormationInspectionTarget(formationId, properties, store.loadedGameState));
}

function inspectSectorFromMap(sectorId: string, properties?: Record<string, unknown> | null) {
  const store = useGameStore.getState();
  inspectOnField(store, resolveMapSectorInspectionTarget(sectorId, store.loadedGameState, properties));
}

function inspectSettlementFromMap(osid: string, sectorId?: string | null) {
  const store = useGameStore.getState();
  inspectOnField(store, resolveMapSettlementInspectionTarget(osid, store.loadedGameState, sectorId));
}

/** Layer IDs for front lines (visibility driven by store frontsVisible). */
const FRONT_LAYER_IDS = ['faction-border-glow-pos', 'faction-border-glow-neg', 'front-line-base', 'front-line-stripe'];
/** Fill layer for ethnic map mode (majority_ethnic); toggled with osid-control-fill by mapMode. */
const OSID_ETHNIC_FILL_LAYER_ID = 'osid-ethnic-fill';

function safeSetLayoutVisibility(
  map: maplibregl.Map,
  layerId: string,
  visible: boolean,
): boolean {
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
    return true;
  }
  return false;
}

function safeEnsureSource(
  map: maplibregl.Map,
  id: string,
  spec: MapSourceSpecification
) {
  if (!map.getSource(id)) {
    map.addSource(id, spec);
  }
}

function safeEnsureLayer(
  map: maplibregl.Map,
  spec: AddLayerObject,
  beforeId?: string
) {
  if (!map.getLayer(spec.id)) {
    map.addLayer(spec, beforeId);
  }
}

function safeHasLayer(
  map: maplibregl.Map,
  layerId: string,
): boolean {
  try {
    return Boolean(map.getLayer(layerId));
  } catch (e) {
    console.error('[MapContainer] safeHasLayer failed', { layerId, error: e });
    return false;
  }
}
const OSID_ETHNIC_SOURCE_ID = 'osid-ethnic';
const OSID_MORALE_FILL_LAYER_ID = 'osid-morale-fill';
const OSID_MORALE_SOURCE_ID = 'osid-morale';
const OSID_CASUALTIES_FILL_LAYER_ID = 'osid-casualties-fill';
const OSID_CASUALTIES_SOURCE_ID = 'osid-casualties';
const OSID_SUPPLY_FILL_LAYER_ID = 'osid-supply-fill';
const OSID_SUPPLY_SOURCE_ID = 'osid-supply';
const SUPPLY_REACH_SOURCE_ID = 'supply-reach';
const SUPPLY_REACH_FILL_LAYER_ID = 'supply-reach-fill';
const SUPPLY_REACH_OUTLINE_LAYER_ID = 'supply-reach-outline';
const SUPPLY_REACH_ISOLATED_OUTLINE_LAYER_ID = 'supply-reach-isolated-outline';
const POLITICAL_METRIC_SOURCE_ID = 'political-metric';
const POLITICAL_METRIC_FILL_LAYER_ID = 'political-metric-fill';
const OSID_OPERATIONS_FILL_LAYER_ID = 'osid-operations-fill';
const OSID_OPERATIONS_SOURCE_ID = 'osid-operations';
const OSID_DEFENSE_FILL_LAYER_ID = 'osid-defense-fill';
const OSID_DEFENSE_SOURCE_ID = 'osid-defense';
const CONTESTED_BANDS_SOURCE_ID = 'contested-bands';
const CONTESTED_BANDS_FILL_LAYER_ID = 'contested-bands-fill';
const CONTESTED_BANDS_OUTLINE_LAYER_ID = 'contested-bands-outline';
/** Layer ID for formation markers (formationsVisible). */
const FORMATION_MARKERS_LAYER_ID = 'formation-markers';
const FORMATION_WHITE_OVERLAY_LAYER_ID = 'formation-white-pulse-overlay';
/** Layer ID for formation labels (labelsVisible). */
const FORMATION_LABELS_LAYER_ID = 'formation-labels';
/** Keep in sync with `formation-labels`.minzoom in awwv_map_style.json — tactical zoom only. */
const FORMATION_LABELS_MIN_ZOOM = 9;
/** Layer ID for home-defense badge on formations at their home municipality. */
const FORMATION_HOME_BADGE_LAYER_ID = 'formation-home-badge';
import { buildOperationalHeatmapGeoJSON } from './builders/buildOperationalHeatmapGeoJSON';
// Brigade AoR highlight: dedicated layers that never interfere with sector/corps highlight
const BRIGADE_AOR_POS_LAYER_ID = 'brigade-aor-pos';
const BRIGADE_AOR_NEG_LAYER_ID = 'brigade-aor-neg';
const FRONT_EDGES_HOVER_SOURCE_ID = 'front-edges-hover';
const FRONT_EDGES_HOVER_POS_LAYER_ID = 'front-edges-hover-pos';
const FRONT_EDGES_HOVER_NEG_LAYER_ID = 'front-edges-hover-neg';
const SECTOR_EDGE_HIT_POS_LAYER_ID = 'sector-edge-hit-pos';
const SECTOR_EDGE_HIT_NEG_LAYER_ID = 'sector-edge-hit-neg';
const FRONT_EDGES_HIGHLIGHT_POS_LAYER_ID = 'front-edges-highlight-pos';
const FRONT_EDGES_HIGHLIGHT_NEG_LAYER_ID = 'front-edges-highlight-neg';
const SECTOR_FILL_LAYER_ID = 'sector-fill';
const SECTOR_EDGE_GLOW_POS_LAYER_ID = 'sector-edge-glow-pos';
const SECTOR_EDGE_GLOW_NEG_LAYER_ID = 'sector-edge-glow-neg';
const SECTOR_BRIGADE_RINGS_LAYER_ID = 'sector-brigade-rings';
const SECTOR_UNIT_PULSE_LAYER_ID = 'sector-unit-pulse';
const OP_TARGET_POLYGON_SOURCE_ID = 'operation-target-polygons';
const OP_TARGET_POINT_SOURCE_ID = 'operation-target-points';
const OP_TARGET_CROSSHAIR_SOURCE_ID = 'operation-target-crosshairs';
const OP_TARGET_FILL_LAYER_ID = 'operation-target-fill';
const OP_TARGET_OUTLINE_LAYER_ID = 'operation-target-outline';
const OP_TARGET_ICON_RING_LAYER_ID = 'operation-target-icon-ring';
const OP_TARGET_ICON_INNER_RING_LAYER_ID = 'operation-target-icon-inner-ring';
const OP_TARGET_ICON_DOT_LAYER_ID = 'operation-target-icon-dot';
const OP_TARGET_ICON_CROSSHAIR_LAYER_ID = 'operation-target-icon-crosshair';
const OP_ARROWS_SOURCE_ID = 'operation-arrows';
const OP_ARROWS_GLOW_LAYER_ID = 'operation-arrows-glow';
const OP_ARROWS_LINE_LAYER_ID = 'operation-arrows-line';
const OP_ARROWS_HEAD_LAYER_ID = 'operation-arrows-head';
const OP_ARROWS_ORIGIN_LAYER_ID = 'operation-arrows-origin';
const FOG_OVERLAY_SOURCE_ID = 'fog-overlay';
const FOG_FILL_LAYER_ID = 'fog-fill';
const BATTLE_MARKERS_SOURCE_ID = 'battle-markers';
const BATTLE_MARKERS_LAYER_ID = 'battle-markers-pulse';
const MAJOR_CITY_LABELS_SOURCE_ID = 'major-city-labels';
const MAJOR_CITY_LABELS_LAYER_ID = 'major-city-labels-symbols';
/** OSID polygon outlines (settlement boundaries); toggled — default off in style + store. */
const OSID_CONTROL_OUTLINE_LAYER_ID = 'osid-control-outline';
/** 1990 adm3 municipality boundaries (`bih_adm3_1990.geojson`); same toggle as OSID outlines. */
const MUN_BORDERS_LAYER_ID = 'mun-borders';
/** Stronger adm3 outline for the municipality of the selected OSID (independent of Borders toggle). */
const MUN_BORDERS_SELECTION_LAYER_ID = 'mun-borders-selection';
/** Map mode fills insert below this anchor so selection tints stay visible on top. */
const OSID_SELECTED_MUN_SIBLING_FILL_LAYER_ID = 'osid-selected-mun-sibling-fill';
const OSID_SELECTED_FILL_LAYER_ID = 'osid-selected-fill';
/** Sentinel for `mun-borders-selection` filter when nothing selected (no real mun uses this id). */
const MUN_BORDER_SELECTION_FILTER_NONE = '__mun_sel_none__';
const ENCLAVE_SOURCE_ID = 'enclave-osids';
const ENCLAVE_LABEL_SOURCE_ID = 'enclave-labels';
const ENCLAVE_OUTLINE_LAYER_ID = 'enclave-outline';
const ENCLAVE_FILL_LAYER_ID = 'enclave-fill';
const GHOST_PATH_SOURCE_ID = 'ghost-paths';
const GHOST_PATH_LAYER_ID = 'ghost-paths-line';
import { buildGhostPathsGeoJSON } from './builders/buildGhostPathsGeoJSON';
const ENCLAVE_LABEL_LAYER_ID = 'enclave-label';

function composeDeckLayersForCurrentSelection(args: {
  formationsGeoJson: FeatureCollection;
  labelsVisible: boolean;
  formationsVisible: boolean;
  zoom: number;
  loadedGameState: LoadedGameState | null;
  centroidLookup: Map<string, [number, number]>;
  ghostMapVisible: boolean;
  ghostMapData?: GhostMapDatum[];
  /** Map That Scars: gated by MAP_SCARS_FEATURE_FLAG; data only present when flag enabled. */
  mapScarsData?: OsidDamageDatum[];
  /** Force-Quality Glow: gated by FORCE_QUALITY_FEATURE_FLAG; data recomputed each render from formations. */
  forceQualityData?: ForceQualityDatum[];
  /** Refugee Column: gated by REFUGEE_COLUMN_FEATURE_FLAG; data recomputed each render from displacementEventLog. */
  refugeeColumnData?: RefugeeColumnDatum[];
  /** Corridor Heartbeat: gated by CORRIDOR_HEARTBEAT_FEATURE_FLAG; data recomputed each render from frontEdgesOsid. */
  corridorHeartbeatData?: CorridorHeartbeatDatum[];
  selectedFormationId: string | null;
  selectedCorpsId: string | null;
  selectedCorpsFrontSectorId: string | null;
  hoveredSectorId: string | null;
  hoveredCorpsId: string | null;
}) {
  return composeTacticalDeckLayers({
    formationsGeoJson: args.formationsGeoJson,
    labelsVisible: args.labelsVisible,
    formationsVisible: args.formationsVisible,
    zoom: args.zoom,
    loadedGameState: args.loadedGameState,
    centroidLookup: args.centroidLookup,
    capabilities: {
      ...DEFAULT_DECK_LAYER_CAPABILITIES,
      ghostMapVisible: args.ghostMapVisible,
      mapScarsVisible: MAP_SCARS_FEATURE_FLAG && Boolean(args.mapScarsData && args.mapScarsData.length > 0),
      forceQualityVisible: FORCE_QUALITY_FEATURE_FLAG && Boolean(args.forceQualityData && args.forceQualityData.length > 0),
      refugeeColumnVisible: REFUGEE_COLUMN_FEATURE_FLAG && Boolean(args.refugeeColumnData && args.refugeeColumnData.length > 0),
      corridorHeartbeatVisible: CORRIDOR_HEARTBEAT_FEATURE_FLAG && Boolean(args.corridorHeartbeatData && args.corridorHeartbeatData.length > 0),
    },
    ghostMapData: args.ghostMapData,
    mapScarsData: args.mapScarsData,
    forceQualityData: args.forceQualityData,
    refugeeColumnData: args.refugeeColumnData,
    corridorHeartbeatData: args.corridorHeartbeatData,
    highlightedFormationIds: collectHighlightedFormationIds({
      formationsGeoJson: args.formationsGeoJson,
      loadedGameState: args.loadedGameState,
      selectedFormationId: args.selectedFormationId,
      selectedCorpsId: args.selectedCorpsId,
      selectedCorpsFrontSectorId: args.selectedCorpsFrontSectorId,
    }),
  });
}

export function MapContainer() {
  const [locale] = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const deckOverlayRef = useRef<MapboxOverlay | null>(null);
  const osidBaseRef = useRef<FeatureCollection | null>(null);
  const osidAdjacencyRef = useRef<Map<string, string[]> | null>(null);
  const osidCentroidsRef = useRef<Map<string, [number, number]>>(new Map());
  const lastFormationsGeoJsonRef = useRef<FeatureCollection | null>(null);
  const lastDeckLayerInputsRef = useRef<DeckLayerRenderInputs | null>(null);
  const ghostMapDataRef = useRef<GhostMapDatum[] | null>(null);
  // Map That Scars: pre-computed per-OSID damage data; only populated when MAP_SCARS_FEATURE_FLAG is true.
  const osidDamageDataRef = useRef<OsidDamageDatum[] | null>(null);
  const lastPanTargetRef = useRef<string | null>(null);
  const prevSectorIdRef = useRef<string | null>(null);
  /** When true, sector selection came from a map click — skip zoom. Cleared after the pan/zoom effect reads it. */
  const sectorSelectedFromMapRef = useRef(false);
  /** Guard: Deck.gl onClick sets this when it handles a formation click, so MapLibre's handleMapClick skips front-edge fallthrough. */
  const deckHandledFormationClickRef = useRef(false);
  const sourceUpdatePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Guard: only run heavy overlay build once per loadedGameState; poll must not run build (napkin). */
  const appliedStateRef = useRef<LoadedGameState | null>(null);
  const appliedLocaleRef = useRef(locale);
  /** Idle/timeout handle for deferred formation icons + setData; cleared on effect cleanup. */
  const deferredOverlayHandleRef = useRef<ReturnType<typeof requestIdleCallback> | ReturnType<typeof setTimeout> | null>(null);
  const interactionLayerSignatureRef = useRef('');
  const [mapReady, setMapReady] = useState(false);
  const [interactionBindingRevision, setInteractionBindingRevision] = useState(0);
  const setSelectedOsid = useGameStore((s) => s.setSelectedOsid);
  const setSelectedOsidInSector = useGameStore((s) => s.setSelectedOsidInSector);
  const setPendingAttackConfirmation = useGameStore((s) => s.setPendingAttackConfirmation);
  const setOrderModeForFormation = useGameStore((s) => s.setOrderModeForFormation);
  const orderModeForFormation = useGameStore((s) => s.orderModeForFormation);
  const ipc = useIPC();
  const setLoadError = useGameStore((s) => s.setLoadError);
  const setOsidDisplayNames = useGameStore((s) => s.setOsidDisplayNames);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
  const setOsidPropertiesMap = useGameStore((s) => s.setOsidPropertiesMap);
  const selectedOsid = useGameStore((s) => s.selectedOsid);
  const selectedFormationId = useGameStore((s) => s.selectedFormationId);
  const hoveredOsids = useGameStore((s) => s.hoveredOsids);
  const selectedCorpsId = useGameStore((s) => s.selectedCorpsId);
  const operationTargetOsids = useGameStore((s) => s.operationTargetOsids);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const stagedOrders = useGameStore((s) => s.stagedOrders);
  const appliedStagedOrdersRef = useRef(stagedOrders);
  const expandedStackOsid = useGameStore((s) => s.expandedStackOsid);
  const appliedExpandedStackOsidRef = useRef(expandedStackOsid);
  const appliedSelectedFormationIdRef = useRef(selectedFormationId);
  const [overlayAnchor, setOverlayAnchor] = useState<{ x: number; y: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    type: 'formation' | 'front' | 'osid' | 'empty';
    properties: Record<string, unknown> | null;
    position: { x: number; y: number };
  } | null>(null);
  const [battleMarkerProbe, setBattleMarkerProbe] = useState({ count: 0, osids: '' });

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const win = window as Window & {
      __awwvLiveSurfaceOpenMapContextMenu?: (position?: { x: number; y: number }) => void;
    };
    win.__awwvLiveSurfaceOpenMapContextMenu = (position) => {
      setContextMenu({
        type: 'empty',
        properties: null,
        position: position ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      });
    };
    return () => {
      delete win.__awwvLiveSurfaceOpenMapContextMenu;
    };
  }, []);

  useEffect(() => {
    const handleDocumentContextMenu = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      const mapEl = document.querySelector('[data-testid="tactical-map"]');
      if (!(mapEl instanceof HTMLElement)) return;
      const rect = mapEl.getBoundingClientRect();
      const insideTacticalMap = event.clientX >= rect.left
        && event.clientX <= rect.right
        && event.clientY >= rect.top
        && event.clientY <= rect.bottom;
      if (!insideTacticalMap) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('button, a, input, textarea, select, [role="button"], [role="dialog"]')) return;
      event.preventDefault();
      setContextMenu({
        type: 'empty',
        properties: null,
        position: { x: event.clientX, y: event.clientY },
      });
    };
    document.addEventListener('contextmenu', handleDocumentContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleDocumentContextMenu);
    };
  }, []);

  // Robust anchor synchronization: if expandedStackOsid is set but we have no anchor (e.g. from sidebar),
  // calculate it from the OSID centroid.
  useEffect(() => {
    if (expandedStackOsid && !overlayAnchor && mapRef.current && loadedGameState) {
      const centroid = osidCentroidsRef.current?.get(expandedStackOsid);
      if (centroid) {
        const point = mapRef.current.project(centroid as [number, number]);
        setOverlayAnchor(point);
      }
    } else if (!expandedStackOsid && overlayAnchor) {
      setOverlayAnchor(null);
    }
  }, [expandedStackOsid, overlayAnchor, mapReady, loadedGameState]);

  const setTooltipTargetWithPosition = useGameStore((s) => s.setTooltipTargetWithPosition);
  const clearTooltipTarget = useGameStore((s) => s.clearTooltipTarget);
  const devMode = useGameStore((s) => s.devMode);
  const frontsVisible = useGameStore((s) => s.frontsVisible);
  const formationsVisible = useGameStore((s) => s.formationsVisible);
  const labelsVisible = useGameStore((s) => s.labelsVisible);
  const mapMode = useGameStore((s) => s.mapMode);
  const sectorsVisible = useGameStore((s) => s.sectorsVisible);
  // In live mode, front line visibility follows sectorsVisible (fronts ARE sectors).
  const effectiveFrontsVisible = devMode ? frontsVisible : sectorsVisible;
  const fogVisible = useGameStore((s) => s.fogVisible);
  const battlesVisible = useGameStore((s) => s.battlesVisible);
  const municipalityBordersVisible = useGameStore((s) => s.municipalityBordersVisible);
  const selectedCorpsFrontSectorId = useGameStore((s) => s.selectedCorpsFrontSectorId);
  const hoveredSectorId = useGameStore((s) => s.hoveredSectorId);
  const hoveredCorpsId = useGameStore((s) => s.hoveredCorpsId);
  const setHoveredSectorId = useGameStore((s) => s.setHoveredSectorId);
  const osidPropertiesMap = useGameStore((s) => s.osidPropertiesMap);
  const setExpandedStackOsid = useGameStore((s) => s.setExpandedStackOsid);
  const ghostLinePoint = useGameStore((s) => s.ghostLinePoint);
  const setGhostLinePoint = useGameStore((s) => s.setGhostLinePoint);
  const recentCombatEventCount = useMemo(() => {
    if (!loadedGameState?.recentControlEvents || typeof loadedGameState.turn !== 'number') return 0;
    return loadedGameState.recentControlEvents.filter(
      (event) => event.mechanism === 'combat' && event.turn >= loadedGameState.turn - 2,
    ).length;
  }, [loadedGameState?.recentControlEvents, loadedGameState?.turn]);
  const currentTurnBattleCount = loadedGameState?.latestTurnSummary?.battles?.length ?? 0;
  const shouldAnimateMapPulse = useMemo(
    () => shouldRunPulseAnimation({
      mapReady,
      stagedOrderCount: stagedOrders.length,
      ghostLineActive: Boolean(ghostLinePoint),
      battlesVisible,
      recentCombatEventCount,
      currentTurnBattleCount,
    }),
    [mapReady, stagedOrders.length, ghostLinePoint, battlesVisible, recentCombatEventCount, currentTurnBattleCount],
  );

  const osidToSector = useMemo(() => {
    if (!loadedGameState?.corpsFrontSectors || !loadedGameState?.frontEdgesOsid) return new Map<string, string>();
    return buildOsidToSectorMap(loadedGameState.corpsFrontSectors, loadedGameState.frontEdgesOsid);
  }, [loadedGameState?.corpsFrontSectors, loadedGameState?.frontEdgesOsid]);
  const playerFaction = useMemo(() => resolvePlayerFacingFaction(loadedGameState), [loadedGameState]);

  const applyDeckLayerSelection = (args: Omit<DeckLayerRenderInputs, 'centroidLookup'> & { centroidLookup?: DeckLayerRenderInputs['centroidLookup'] }) => {
    const overlay = deckOverlayRef.current;
    const centroidLookup = args.centroidLookup ?? osidCentroidsRef.current;
    if (!overlay) return;

    const nextInputs: DeckLayerRenderInputs = {
      ...args,
      centroidLookup,
    };
    if (!deckLayerRenderInputsChanged(lastDeckLayerInputsRef.current, nextInputs)) {
      return;
    }

    overlay.setProps({
      layers: composeDeckLayersForCurrentSelection({
        formationsGeoJson: nextInputs.formationsGeoJson ?? EMPTY_GEOJSON,
        labelsVisible: nextInputs.labelsVisible,
        formationsVisible: nextInputs.formationsVisible,
        zoom: nextInputs.zoom,
        loadedGameState: nextInputs.loadedGameState,
        centroidLookup: nextInputs.centroidLookup,
        ghostMapVisible: nextInputs.ghostMapVisible,
        ghostMapData: nextInputs.ghostMapData,
        // Map That Scars: ref is null unless MAP_SCARS_FEATURE_FLAG was true at init.
        // Off by default → undefined → byte-stable (capabilities gate also blocks layer creation).
        mapScarsData: osidDamageDataRef.current ?? undefined,
        // Force-Quality Glow: rebuilt each render from loadedGameState.formations
        // (cheap O(N) sort + aggregation; ~213 brigades typical). Capability gate
        // in composeDeckLayersForCurrentSelection requires data.length > 0.
        forceQualityData: (FORCE_QUALITY_FEATURE_FLAG && nextInputs.loadedGameState && osidBaseRef.current)
          ? buildForceQualityData(nextInputs.loadedGameState.formations, osidBaseRef.current)
          : undefined,
        // Refugee Column: rebuilt each render from
        // loadedGameState.displacementEventLog (cheap O(N) aggregation; ~100s
        // of events typical, capped routes after de-duplication). Capability
        // gate in composeDeckLayersForCurrentSelection requires data.length > 0.
        refugeeColumnData: (REFUGEE_COLUMN_FEATURE_FLAG && nextInputs.loadedGameState)
          ? buildRefugeeColumnData(
              nextInputs.loadedGameState.displacementEventLog ?? [],
              nextInputs.centroidLookup,
            )
          : undefined,
        // Corridor Heartbeat: rebuilt each render from
        // loadedGameState.frontEdgesOsid + optional frontPressureByEdge
        // (cheap O(E) aggregation; ~hundreds of front edges typical).
        // Capability gate in composeDeckLayersForCurrentSelection requires
        // data.length > 0; pre-front-formation early-war saves degrade
        // gracefully (no contested edges → no layer).
        corridorHeartbeatData: (CORRIDOR_HEARTBEAT_FEATURE_FLAG && nextInputs.loadedGameState)
          ? (() => {
              const loadedGameState = nextInputs.loadedGameState;
              if (!loadedGameState) return undefined;
              const edgesRaw = loadedGameState.frontEdgesOsid ?? [];
              const edges: CorridorFrontEdgeRecord[] = edgesRaw.map((e) => ({
                edge_id: e.edge_id,
                a: e.a,
                b: e.b,
                side_a: e.side_a,
                side_b: e.side_b,
              }));
              const pressureMap = loadedGameState.frontPressureByEdge;
              let pressureLookup: Map<string, CorridorFrontPressureRecord> | null = null;
              if (pressureMap) {
                pressureLookup = new Map<string, CorridorFrontPressureRecord>();
                for (const [edgeId, pr] of Object.entries(pressureMap)) {
                  pressureLookup.set(edgeId, { value: pr.value, max_abs: pr.max_abs });
                }
              }
              return buildCorridorHeartbeatData(edges, pressureLookup, nextInputs.centroidLookup);
            })()
          : undefined,
        selectedFormationId: nextInputs.selectedFormationId,
        selectedCorpsId: nextInputs.selectedCorpsId,
        selectedCorpsFrontSectorId: nextInputs.selectedCorpsFrontSectorId,
        hoveredSectorId: nextInputs.hoveredSectorId,
        hoveredCorpsId: nextInputs.hoveredCorpsId,
      }),
    });
    lastDeckLayerInputsRef.current = nextInputs;
  };

  const contextMenuItems: RadialMenuItem[] = useMemo(() => {
    if (!contextMenu) return [];
    const { type, properties } = contextMenu;
    switch (type) {
      case 'formation': return [
        {
          id: 'view', label: t('map.context.viewUnit'), icon: '\u{1F441}', action: () => {
            const id = properties?.id as string;
            if (id) inspectFormationFromMap(id, properties);
          }
        },
        {
          id: 'corps', label: t('map.context.viewCorps'), icon: '\u2694', action: () => {
            const corpsId = properties?.corps_id as string;
            if (corpsId) useGameStore.getState().setSelectedCorpsId(corpsId);
          }
        },
      ];
      case 'osid': return [
        {
          id: 'info', label: t('map.context.settlement'), icon: '\u{1F3D8}', action: () => {
            const osid = properties?.osid as string;
            if (osid) inspectSettlementFromMap(osid, osidToSector.get(osid));
          }
        },
        {
          id: 'sector', label: t('map.context.viewSector'), icon: '\u{1F5FA}', action: () => {
            const osid = properties?.osid as string;
            const sectorId = osidToSector.get(osid ?? '');
            if (sectorId && findPlayerFacingSectorById(useGameStore.getState().loadedGameState, sectorId)) {
              inspectSectorFromMap(sectorId);
            }
          }
        },
      ];
      case 'front': return [
        {
          id: 'sector', label: t('map.context.sectorDetail'), icon: '\u{1F5FA}', action: () => {
            const sectorId = properties?.sector_id as string;
            if (sectorId && findPlayerFacingSectorById(useGameStore.getState().loadedGameState, sectorId)) {
              inspectSectorFromMap(sectorId, properties);
            }
          }
        },
      ];
      case 'empty': return [
        {
          id: 'deselect', label: t('map.context.deselect'), icon: '\u2715', action: () => {
            useGameStore.getState().setSelectedFormationId(null);
            useGameStore.getState().setSelectedOsid('');
          }
        },
      ];
      default: return [];
    }
  }, [contextMenu, osidToSector]);

  useEffect(() => {
    if (!containerRef.current) return;

    const pmtilesProtocol = new Protocol();
    const origin = window.location.origin;
    console.log('[PMTiles] registering protocol, origin:', origin);
    // Use tilev4 (native MapLibre v4 async handler) and surface errors
    const tileHandler: AddProtocolAction = async (params, abortController) => {
      if (params.type === 'json') console.log('[PMTiles] source metadata request:', params.url);
      try {
        return await pmtilesProtocol.tilev4(params, abortController);
      } catch (e) {
        // Suppress AbortError (normal during pan/zoom — tiles get cancelled)
        if (e instanceof Error && e.name === 'AbortError') throw e;
        console.error('[PMTiles] tile error', params.url, e);
        throw e;
      }
    };
    try { maplibregl.removeProtocol('pmtiles'); } catch { /* not registered yet */ }
    maplibregl.addProtocol('pmtiles', tileHandler);

    const style = rewritePmtilesUrls(styleJson as Record<string, unknown>, origin) as maplibregl.StyleSpecification;

    let initCancelled = false;
    const init = async () => {
      try {
        const [geojson, byOsid, adjacency, sidToOsid, terrainScalars, censusGeoJson] = await Promise.all([
          loadOperationalSettlements(),
          loadOperationalPoliticalControl(),
          loadOsidAdjacency(),
          loadSidToOsidMapping(),
          loadTerrainScalars(),
          loadCensusSettlements().catch(() => null),
        ]);

        // Pre-compute ghost map data from census (never changes)
        if (censusGeoJson) {
          ghostMapDataRef.current = buildGhostMapData(censusGeoJson);
        }

        // Map That Scars: load damage seed once when feature flag is enabled.
        // Faction-agnostic, deterministic. When flag is false (default) this branch is dead → byte-stable.
        if (MAP_SCARS_FEATURE_FLAG) {
          try {
            const dmgRes = await fetch('/data/derived/osid_damage_seed.json');
            if (dmgRes.ok) {
              const dmgSeed = (await dmgRes.json()) as OsidDamageSeed;
              osidDamageDataRef.current = buildOsidDamageData(dmgSeed, geojson);
            }
          } catch (err) {
            console.warn('[MapContainer] Failed to load osid_damage_seed.json:', err);
          }
        }

        osidBaseRef.current = geojson;
        osidAdjacencyRef.current = adjacency;
        // Enriched centroid lookup: OSID keys + SID aliases from mapping.
        // Eliminates silent failures when legacy SID-keyed data hits the lookup.
        osidCentroidsRef.current = buildOsidCentroidLookup(geojson, sidToOsid);
        setOsidDisplayNames(buildOsidDisplayNameMap(geojson));
        const osidProps: Record<string, Record<string, unknown>> = {};
        for (const f of geojson.features) {
          const props = (f.properties ?? {}) as Record<string, unknown>;
          const osid = typeof props.osid === 'string' ? props.osid : '';
          if (!osid) continue;
          const merged = { ...props };
          // Enrich with terrain scalars (keyed by SID)
          const sid = typeof props.sid === 'string' ? props.sid : '';
          const terrain = sid ? terrainScalars.get(sid) : undefined;
          if (terrain) {
            merged.elevation_mean_m = terrain.elevation_mean_m;
            merged.slope_index = terrain.slope_index;
            merged.terrain_friction_index = terrain.terrain_friction_index;
            merged.road_access_index = terrain.road_access_index;
            merged.river_crossing_penalty = terrain.river_crossing_penalty;
            // Derive human-readable terrain type for settlement panel
            const f = terrain.terrain_friction_index;
            merged.terrain = f > 0.5 ? 'Mountain' : f > 0.3 ? 'Hilly' : f > 0.15 ? 'Forest' : 'Flat';
          }
          osidProps[osid] = merged;
        }
        setOsidPropertiesMap(osidProps);

        const controlledGeoJson = buildControlGeoJSON(geojson, byOsid);
        const majorCityLabels = buildMajorCityLabelGeoJSON(controlledGeoJson);
        setSettlementLabelData(majorCityLabels.features);
        const frontLinesGeoJson = buildFrontStabilityGeoJSON(buildFrontLinesGeoJSON(controlledGeoJson));
        const sources = style.sources as Record<
          string,
          { type?: string; data?: FeatureCollection }
        >;
        if (sources['osid-control']) {
          sources['osid-control'].data = controlledGeoJson;
        }
        if (sources['front-lines']) {
          sources['front-lines'].data = frontLinesGeoJson;
        }
        if (sources['formations']) {
          sources['formations'].data = EMPTY_GEOJSON;
        }
        if (sources['order-arrows']) {
          sources['order-arrows'].data = EMPTY_GEOJSON;
        }
        (sources as Record<string, { type?: string; data?: FeatureCollection }>)['fog-overlay'] = { type: 'geojson', data: EMPTY_GEOJSON };
        (sources as Record<string, { type?: string; data?: FeatureCollection }>)[BATTLE_MARKERS_SOURCE_ID] = { type: 'geojson', data: EMPTY_GEOJSON };
        (sources as Record<string, { type?: string; data?: FeatureCollection }>)[MAJOR_CITY_LABELS_SOURCE_ID] = { type: 'geojson', data: majorCityLabels };
        (sources as Record<string, { type?: string; data?: FeatureCollection }>)[GHOST_PATH_SOURCE_ID] = { type: 'geojson', data: EMPTY_GEOJSON };
        (sources as Record<string, { type?: string; data?: FeatureCollection }>)[CONTESTED_BANDS_SOURCE_ID] = { type: 'geojson', data: EMPTY_GEOJSON };
        (sources as Record<string, { type?: string; data?: FeatureCollection }>)[SUPPLY_REACH_SOURCE_ID] = { type: 'geojson', data: EMPTY_GEOJSON };
        (sources as Record<string, { type?: string; data?: FeatureCollection }>)[POLITICAL_METRIC_SOURCE_ID] = { type: 'geojson', data: EMPTY_GEOJSON };
        // NOTE: front-edges-hover source is NOT pre-registered here — it's created via addSource
        // in runUpdate so that addLayer calls in the same block also execute.
      } catch (e) {
        console.warn('Failed to pre-load OSID data:', e);
      }

      if (initCancelled || !containerRef.current) return;
      const map = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: BOSNIA_CENTER,
        zoom: DEFAULT_ZOOM,
        pitch: TACTICAL_MAP_PITCH_DEGREES,
        minPitch: TACTICAL_MAP_PITCH_DEGREES,
        maxPitch: TACTICAL_MAP_PITCH_DEGREES,
        maxBounds: BOSNIA_MAX_BOUNDS,
        minZoom: 7.8,
        dragRotate: false,
        touchPitch: false,
        attributionControl: false,
      });
      map.on('error', (e) => {
        // Suppress noisy PMTiles "Unimplemented type: 4" errors (MVT geometry type unsupported by MapLibre)
        if (e.error?.message?.includes('Unimplemented type')) return;
        console.error('[MapLibre] map error:', e.error);
      });
      mapRef.current = map;
      ensureTacticalIcons(map);

      const deckOverlay = new MapboxOverlay({
        interleaved: true,
        layers: [],
        onClick: (info: TacticalDeckPickingInfo) => {
          const store = useGameStore.getState();
          const mapAtClick = mapRef.current;
          const formationFallback =
            mapAtClick
            && lastFormationsGeoJsonRef.current
            && typeof info?.x === 'number'
            && typeof info?.y === 'number'
              ? pickNearestFormationAtPoint({
                formations: lastFormationsGeoJsonRef.current.features,
                point: { x: info.x, y: info.y },
                zoom: mapAtClick.getZoom(),
                project: (coordinates) => mapAtClick.project(coordinates),
              })
              : null;
          const frontFeature =
            mapAtClick && typeof info?.x === 'number' && typeof info?.y === 'number'
              ? queryPreferredFrontFeatureNearPoint(mapAtClick, { x: info.x, y: info.y }, true)
              : undefined;
          const clickTarget = resolveDeckFormationClickTarget({
            deckObjectProperties: info?.object?.properties ?? formationFallback?.properties ?? null,
            nearbyFrontFeature: frontFeature,
          });

          if (clickTarget.kind === 'sector') {
            if (findPlayerFacingSectorById(store.loadedGameState, clickTarget.sectorId)) {
              store.setExpandedStackOsid(null);
              sectorSelectedFromMapRef.current = true;
              inspectSectorFromMap(clickTarget.sectorId, frontFeature?.properties);
            }
            return;
          }

          if (clickTarget.kind !== 'formation') return;

          // Signal MapLibre's handleMapClick to skip front-edge fallthrough —
          // without this, the hidden formation-markers layer means MapLibre falls
          // through to the front edge and setSelectedCorpsFrontSectorId clears
          // the formation selection we're about to set.
          deckHandledFormationClickRef.current = true;

          const props = info?.object?.properties ?? formationFallback?.properties;
          if (!props) return;
          inspectFormationFromMap(clickTarget.formationId, props);
          // Use pre-computed stack_count from GeoJSON feature properties
          const osid = props.location_osid as string | undefined;
          const stackCount = typeof props.stack_count === 'number' ? props.stack_count : 1;
          if (osid && stackCount > 1) {
            store.setExpandedStackOsid(osid);
            // overlayAnchor is derived by useEffect from expandedStackOsid
          } else {
            store.setExpandedStackOsid(null);
          }
        },
      });
      map.addControl(deckOverlay);
      deckOverlayRef.current = deckOverlay;

      map.addControl(new maplibregl.NavigationControl(), 'top-right');
      // Minimap sync: report viewport bounds on move
      const reportViewport = () => {
        const bounds = map.getBounds();
        useGameStore.getState().setMapViewport({
          bounds: [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
          center: [map.getCenter().lng, map.getCenter().lat],
          zoom: map.getZoom(),
        });
      };
      map.on('moveend', reportViewport);
      map.on('load', reportViewport);

      // Note: 3D terrain (terrain-dem) is intentionally NOT enabled on the main map.
      // Only the ops planning modal uses 3D terrain for tactical planning context.

      // Deck.gl zoom sync: trigger layer update on zoom to handle dynamic scaling
      // Throttled to ~20fps (50ms) to avoid rebuilding deck layers every frame during zoom animations
      let zoomThrottleTimer: ReturnType<typeof setTimeout> | null = null;
      map.on('zoom', () => {
        if (zoomThrottleTimer) return;
        zoomThrottleTimer = setTimeout(() => {
          zoomThrottleTimer = null;
          if (deckOverlayRef.current && lastFormationsGeoJsonRef.current) {
            const {
              formationsVisible: fVis,
              labelsVisible: lVis,
              loadedGameState,
              ghostMapVisible: gmVis,
              selectedFormationId: deckSelectedFormationId,
              selectedCorpsId: deckSelectedCorpsId,
              selectedCorpsFrontSectorId: deckSelectedSectorId,
              hoveredSectorId: deckHoveredSectorId,
              hoveredCorpsId: deckHoveredCorpsId,
            } = useGameStore.getState();
            applyDeckLayerSelection({
              formationsGeoJson: lastFormationsGeoJsonRef.current,
              labelsVisible: lVis,
              formationsVisible: fVis,
              zoom: map.getZoom(),
              loadedGameState,
              ghostMapVisible: gmVis,
              ghostMapData: ghostMapDataRef.current ?? undefined,
              selectedFormationId: deckSelectedFormationId,
              selectedCorpsId: deckSelectedCorpsId,
              selectedCorpsFrontSectorId: deckSelectedSectorId,
              hoveredSectorId: deckHoveredSectorId,
              hoveredCorpsId: deckHoveredCorpsId,
            });
          }
        }, 50);
      });

      // Minimap: register panToCenter callback
      useGameStore.getState().setPanToCenter((center: [number, number]) => {
        map.easeTo({ center, duration: 400, essential: true });
      });

      // Operations panel: register panToOsid callback
      useGameStore.getState().setPanToOsid((osid: string) => {
        const center = osidCentroidsRef.current.get(osid);
        if (!center) return;
        map.easeTo({ center, duration: 420, essential: true });
      });

      setMapReady(true);
    };

    init();

    return () => {
      initCancelled = true;
      deckOverlayRef.current?.finalize();
      deckOverlayRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      useGameStore.getState().setPanToCenter(null);
      useGameStore.getState().setPanToOsid(null);
      setMapReady(false);
      maplibregl.removeProtocol('pmtiles');
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    let cleanup: (() => void) | undefined;
    let attempts = 0;
    let cancelled = false;
    const registerInteractions = () => {
      if (cancelled || !mapRef.current) return;
      cleanup?.();
      if (!mapRef.current) return;
      cleanup = useMapInteractions(mapRef.current, {
        getFormationClickFallback: (point) => {
          const map = mapRef.current;
          const formationsGeoJson = lastFormationsGeoJsonRef.current;
          if (!map || !formationsGeoJson) return null;
          return pickNearestFormationAtPoint({
            formations: formationsGeoJson.features,
            point,
            zoom: map.getZoom(),
            project: (coordinates) => map.project(coordinates),
          });
        },
        onOsidClick: (osid) => {
          if (orderModeForFormation === 'attack' && selectedFormationId) {
            setPendingAttackConfirmation({ attackerFormationId: selectedFormationId, targetOsid: osid });
            setOrderModeForFormation(null);
          } else if (orderModeForFormation === 'sector' && selectedFormationId) {
            const sectorId = osidToSector.get(osid);
            if (sectorId) {
              void stageAssignBrigadeToSectorAction(
                { ipc, addStagedOrder: useGameStore.getState().addStagedOrder, setLoadError },
                selectedFormationId,
                sectorId
              );
            } else {
              setLoadError('Selected settlement is not part of a frontline sector.');
            }
            setOrderModeForFormation(null);
          } else {
            setExpandedStackOsid(null);
            setOverlayAnchor(null);
            // If this settlement belongs to a front sector, select that sector so it's visible on the map.
            const sectorId = osidToSector.get(osid);
            if (sectorId && findPlayerFacingSectorById(useGameStore.getState().loadedGameState, sectorId)) {
              sectorSelectedFromMapRef.current = true;
              inspectSettlementFromMap(osid, sectorId);
            } else {
              inspectSettlementFromMap(osid);
            }
          }
        },
        onFormationClick: (id, props, point) => {
          inspectFormationFromMap(id, props);
          // If clicking a formation, also expand its stack if it's not already expanded
          const osid = props.location_osid as string | undefined;
          if (osid && loadedGameState) {
            // Only trigger high-end radial expansion if there's actually a stack of selectable units (> 1)
            const stackSize = loadedGameState.formations.filter(f =>
              f.kind !== 'corps' && f.kind !== 'corps_asset' && f.kind !== 'army_hq' &&
              resolveFormationLocationOsid(f, osidCentroidsRef.current) === osid
            ).length;

            if (stackSize > 1) {
              setExpandedStackOsid(osid);
              setOverlayAnchor(point);
            } else {
              setExpandedStackOsid(null);
              setOverlayAnchor(null);
            }
          }
        },
        onFrontEdgeClick: (_edgeId, props) => {
          setExpandedStackOsid(null);
          setOverlayAnchor(null);
          const sectorId = props.sector_id as string | undefined;
          if (sectorId && findPlayerFacingSectorById(useGameStore.getState().loadedGameState, sectorId)) {
            sectorSelectedFromMapRef.current = true;
            inspectSectorFromMap(sectorId, props);
          }
        },
        onOsidHover: (osid, point) => {
          if (osid) {
            setTooltipTargetWithPosition({ type: 'osid', id: osid }, point ?? undefined);
            setHoveredSectorId(osidToSector.get(osid) ?? null);
          } else {
            clearTooltipTarget();
            setHoveredSectorId(null);
          }
        },
        onFormationHover: (id, point) => {
          if (id) {
            const formation = loadedGameState?.formations.find((candidate) => candidate.id === id);
            setTooltipTargetWithPosition({ type: 'formation', id }, point ?? undefined);
            setHoveredSectorId(resolveCurrentSectorForFormation(formation, loadedGameState?.corpsFrontSectors)?.sector_id ?? null);
          } else {
            clearTooltipTarget();
            setHoveredSectorId(null);
          }
        },
        onFrontEdgeHover: (edgeId, point) => {
          if (edgeId) {
            setTooltipTargetWithPosition({ type: 'front', id: edgeId }, point ?? undefined);
          } else {
            clearTooltipTarget();
          }
        },
        onBattleHover: (osid, point) => {
          if (osid) {
            setTooltipTargetWithPosition({ type: 'battle', id: osid }, point ?? undefined);
          } else {
            clearTooltipTarget();
          }
        },
        onBattleClick: (osid) => {
          // Battle flyover: fly to the battle OSID with terrain pitch and select it
          const center = osidCentroidsRef.current.get(osid);
          if (center && mapRef.current) {
            mapRef.current.flyTo({
              center,
              zoom: Math.max(mapRef.current.getZoom(), 11),
              pitch: TACTICAL_MAP_PITCH_DEGREES,
              bearing: 0,
              duration: 1200,
              essential: true,
            });
          }
          // Select the OSID to show settlement panel with battle context
          inspectSettlementFromMap(osid, osidToSector.get(osid));
        },
        onSectorHover: (id) => {
          setHoveredSectorId(id);
        },
        onMouseMove: (lngLat) => {
          if (orderModeForFormation) setGhostLinePoint(lngLat);
          else if (ghostLinePoint) setGhostLinePoint(null);
        },
        onMapMouseLeave: () => {
          clearTooltipTarget();
          setHoveredSectorId(null);
        },
        onContextMenu: (type, properties, position) => {
          setContextMenu({ type, properties, position });
        },
        deckHandledFormationClick: deckHandledFormationClickRef,
      });
      if (mapRef.current && shouldScheduleInteractionRetry(mapRef.current, attempts)) {
        attempts += 1;
        window.setTimeout(registerInteractions, 100);
      }
    };
    registerInteractions();
    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  }, [mapReady, loadedGameState, setSelectedOsid, setSelectedOsidInSector, setTooltipTargetWithPosition, clearTooltipTarget, orderModeForFormation, selectedFormationId, setPendingAttackConfirmation, setOrderModeForFormation, ipc, setLoadError, osidToSector, interactionBindingRevision]);

  useEffect(() => {
    const map = mapRef.current;
    const baseGeoJson = osidBaseRef.current;
    if (!mapReady || !map || !baseGeoJson || !loadedGameState) {
      appliedStateRef.current = null;
      return;
    }

    let cancelled = false;

    const runUpdate = () => {
      if (cancelled || !mapRef.current || !loadedGameState) return;
      const m = mapRef.current;
      const osidSource = m.getSource('osid-control') as GeoJSONSource | undefined;
      const frontSource = m.getSource('front-lines') as GeoJSONSource | undefined;
      const formationsSource = m.getSource('formations') as GeoJSONSource | undefined;
      const orderArrowsSource = m.getSource('order-arrows') as GeoJSONSource | undefined;
      const ghostPathSource = m.getSource(GHOST_PATH_SOURCE_ID) as GeoJSONSource | undefined;
      if (!osidSource || !frontSource || !formationsSource || !orderArrowsSource || !ghostPathSource) {
        if (!cancelled && !sourceUpdatePollRef.current) {
          sourceUpdatePollRef.current = setInterval(() => {
            if (cancelled) return;
            runUpdate();
          }, 500);
        }
        return;
      }
      if (sourceUpdatePollRef.current) {
        clearInterval(sourceUpdatePollRef.current);
        sourceUpdatePollRef.current = null;
      }
      // Only run heavy build once per state; poll must not run build (napkin).
      const needsUpdate = appliedStateRef.current !== loadedGameState ||
        appliedStagedOrdersRef.current !== stagedOrders ||
        appliedExpandedStackOsidRef.current !== expandedStackOsid ||
        appliedLocaleRef.current !== locale ||
        // selectedFormationId change should also trigger update for chain-of-command
        appliedSelectedFormationIdRef.current !== selectedFormationId;
      if (!needsUpdate) return;

      const state = loadedGameState;
      const currentStagedOrders = stagedOrders;
      const base = baseGeoJson;
      const stack = expandedStackOsid;
      requestAnimationFrame(() => {
        if (cancelled || !mapRef.current || !state) return;
        appliedStateRef.current = state;
        appliedLocaleRef.current = locale;
        appliedStagedOrdersRef.current = currentStagedOrders;
        appliedExpandedStackOsidRef.current = stack;
        appliedSelectedFormationIdRef.current = selectedFormationId;

        let controlledGeoJson: FeatureCollection;
        try {
          const controlTimer = createDevTimer('[MapContainer] overlay control', devMode);
          const m1 = mapRef.current;
          try {
            controlledGeoJson = buildControlGeoJSON(base, state.controlBySettlement, useGameStore.getState().osidPropertiesMap);
            (m1.getSource('osid-control') as GeoJSONSource)?.setData(controlledGeoJson);
            const contestedBandsGeoJson = buildContestedBandsGeoJSON({
              controlGeoJson: controlledGeoJson,
              currentTurn: state.turn,
              recentControlEvents: state.allControlEvents ?? state.recentControlEvents ?? [],
              frontEdgesOsid: state.frontEdgesOsid ?? [],
              formations: state.formations,
            });
            safeEnsureSource(m1, CONTESTED_BANDS_SOURCE_ID, { type: 'geojson', data: contestedBandsGeoJson });
            const contestedSource = m1.getSource(CONTESTED_BANDS_SOURCE_ID) as GeoJSONSource | undefined;
            if (contestedSource) contestedSource.setData(contestedBandsGeoJson);
            if (!safeHasLayer(m1, CONTESTED_BANDS_FILL_LAYER_ID)) {
              m1.addLayer(
                {
                  id: CONTESTED_BANDS_FILL_LAYER_ID,
                  type: 'fill',
                  source: CONTESTED_BANDS_SOURCE_ID,
                  paint: {
                    'fill-color': [
                      'match',
                      ['get', 'contested_reason'],
                      'recent_change', 'rgba(230, 178, 80, 0.30)',
                      'adjacent_pressure', 'rgba(220, 80, 70, 0.24)',
                      'rgba(210, 210, 210, 0.16)',
                    ],
                    'fill-opacity': [
                      'interpolate',
                      ['linear'],
                      ['get', 'contested_score'],
                      0.5, 0.20,
                      1.0, 0.42,
                    ],
                  },
                },
                OSID_SELECTED_MUN_SIBLING_FILL_LAYER_ID,
              );
            }
            if (!safeHasLayer(m1, CONTESTED_BANDS_OUTLINE_LAYER_ID)) {
              m1.addLayer(
                {
                  id: CONTESTED_BANDS_OUTLINE_LAYER_ID,
                  type: 'line',
                  source: CONTESTED_BANDS_SOURCE_ID,
                  paint: {
                    'line-color': [
                      'match',
                      ['get', 'contested_reason'],
                      'recent_change', 'rgba(245, 196, 96, 0.78)',
                      'adjacent_pressure', 'rgba(238, 103, 88, 0.70)',
                      'rgba(230, 230, 230, 0.45)',
                    ],
                    'line-width': [
                      'interpolate',
                      ['linear'],
                      ['zoom'],
                      7, 0.6,
                      10, 1.1,
                      13, 1.8,
                    ],
                    'line-dasharray': [2, 2],
                  },
                },
                'front-line-base',
              );
            }
            const showContestedBands = mapMode === 'political' || mapMode === 'ethnic';
            safeSetLayoutVisibility(m1, CONTESTED_BANDS_FILL_LAYER_ID, showContestedBands);
            safeSetLayoutVisibility(m1, CONTESTED_BANDS_OUTLINE_LAYER_ID, showContestedBands);
            try {
              const majorLabels = buildMajorCityLabelGeoJSON(controlledGeoJson);
              setSettlementLabelData(majorLabels.features);
              safeEnsureSource(m1, MAJOR_CITY_LABELS_SOURCE_ID, { type: 'geojson', data: majorLabels });
              const lblSrc = m1.getSource(MAJOR_CITY_LABELS_SOURCE_ID) as GeoJSONSource | undefined;
              if (lblSrc) lblSrc.setData(majorLabels);
            } catch (labelErr) {
              console.warn('[MapContainer] major-city-labels setData failed:', labelErr);
            }
          } finally {
            controlTimer.end();
          }
        } catch (e) {
          console.error('[MapContainer] overlay control failed:', e);
          appliedStateRef.current = null;
          return;
        }

        requestAnimationFrame(() => {
          if (cancelled || !mapRef.current || !state) return;
          try {
            const frontTimer = createDevTimer('[MapContainer] overlay front', devMode);
            const m2 = mapRef.current;
            // Corps-colored fronts when sector data is available; else faction borders
            let frontLinesGeoJson;
            try {
              if (state.corpsFrontSectors && state.corpsFrontSectors.length > 0) {
                const rbihHrhbAllied = state.war_alliance_rbih_hrhb != null
                  ? state.war_alliance_rbih_hrhb > 0.2 : undefined;
                frontLinesGeoJson = buildCorpsFrontLinesGeoJSON(
                  controlledGeoJson, state.corpsFrontSectors, rbihHrhbAllied,
                  osidCentroidsRef.current.size > 0 ? osidCentroidsRef.current : undefined,
                  state.frontPressureByEdge,
                  state.frontEdgesOsid,
                  Object.fromEntries(state.formations.map((formation) => [formation.id, { entrenchment_turns: formation.entrenchment_turns }]))
                );
                // Corps colors on glow layers only; front-line-base/stripe stay black-white stripe.
                try {
                  const corpsColorExpr = buildCorpsColorExpression(state.corpsFrontSectors);
                  m2.setPaintProperty('faction-border-glow-pos', 'line-color', corpsColorExpr as maplibregl.ExpressionSpecification);
                  m2.setPaintProperty('faction-border-glow-neg', 'line-color', corpsColorExpr as maplibregl.ExpressionSpecification);
                } catch (e) {
                  console.warn('[MapContainer] Failed to set corps glow colors:', e);
                }
              } else {
                frontLinesGeoJson = buildFrontLinesGeoJSON(
                  controlledGeoJson,
                  state.war_alliance_rbih_hrhb,
                  osidCentroidsRef.current.size > 0 ? osidCentroidsRef.current : undefined
                );
              }
              const stableFrontLinesGeoJson = buildFrontStabilityGeoJSON(frontLinesGeoJson);
              (m2.getSource('front-lines') as GeoJSONSource)?.setData(stableFrontLinesGeoJson);

              // Operational Heatmap (Mode 7) update
              if (Number(mapMode) === 7 && osidCentroidsRef.current.size > 0) {
                const heatmapData = buildOperationalHeatmapGeoJSON(state, osidCentroidsRef.current);
                (m2.getSource('operational-heatmap') as GeoJSONSource)?.setData(heatmapData);
              }

              const frontEdgesOsid = state.frontEdgesOsid;
              if (frontEdgesOsid && frontEdgesOsid.length > 0) {
              const centroidsForHover = osidCentroidsRef.current.size > 0 ? osidCentroidsRef.current : undefined;
              const frontEdgesHoverData = buildFrontEdgesHoverGeoJSON(
                controlledGeoJson,
                frontEdgesOsid,
                state.corpsFrontSectors,
                centroidsForHover,
                playerFaction,
              );
              if (!m2.getSource(FRONT_EDGES_HOVER_SOURCE_ID)) {
                m2.addSource(FRONT_EDGES_HOVER_SOURCE_ID, { type: 'geojson', data: frontEdgesHoverData });
                // Hitbox layers: NO line-offset (MapLibre v4 doesn't index offset lines for queryRenderedFeatures).
                // Wide centered line covers both faction sides; offset_side filter still separates them for highlight.
                m2.addLayer(
                  {
                    id: FRONT_EDGES_HOVER_POS_LAYER_ID,
                    type: 'line',
                    source: FRONT_EDGES_HOVER_SOURCE_ID,
                    filter: ['==', ['get', 'offset_side'], 1],
                    paint: {
                      'line-width': toZoomWidthExpression(FRONT_SURFACE_HITBOX_WIDTHS),
                      'line-opacity': INTERACTION_HITBOX_OPACITY,
                      'line-color': '#ffffff',
                    },
                  },
                  'formation-markers'
                );

                if (devMode) {
                  // Dev mode: offset highlight layers (one per faction side)
                  m2.addLayer(
                    {
                      id: FRONT_EDGES_HIGHLIGHT_POS_LAYER_ID,
                      type: 'line',
                      source: FRONT_EDGES_HOVER_SOURCE_ID,
                      filter: ['all', ['==', ['get', 'offset_side'], 1], ['==', ['get', 'sector_id'], '__none__']],
                      paint: {
                        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 4, 10, 8, 14, 12],
                        'line-offset': ['interpolate', ['linear'], ['zoom'], 6, 4, 10, 8, 14, 12],
                        'line-opacity': 0.8,
                        'line-color': '#ffffff',
                      },
                      layout: { 'line-cap': 'round', 'line-join': 'round' },
                    },
                    'formation-markers'
                  );
                  m2.addLayer(
                    {
                      id: FRONT_EDGES_HIGHLIGHT_NEG_LAYER_ID,
                      type: 'line',
                      source: FRONT_EDGES_HOVER_SOURCE_ID,
                      filter: ['all', ['==', ['get', 'offset_side'], -1], ['==', ['get', 'sector_id'], '__none__']],
                      paint: {
                        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 4, 10, 8, 14, 12],
                        'line-offset': ['interpolate', ['linear'], ['zoom'], 6, -4, 10, -8, 14, -12],
                        'line-opacity': 0.8,
                        'line-color': '#ffffff',
                      },
                      layout: { 'line-cap': 'round', 'line-join': 'round' },
                    },
                    'formation-markers'
                  );
                } else {
                  // Live mode: single centered highlight ON TOP of front lines.
                  // Uses sector-owned front-edge source so selection has sector_id metadata.
                  m2.addLayer(
                    {
                      id: FRONT_EDGES_HIGHLIGHT_POS_LAYER_ID,
                      type: 'line',
                      source: FRONT_EDGES_HOVER_SOURCE_ID,
                      filter: ['all', ['==', ['get', 'offset_side'], 1], ['==', ['get', 'sector_id'], '__none__']],
                      paint: {
                        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 5, 10, 9, 14, 14],
                        'line-opacity': 0.95,
                        'line-color': '#ffffff',
                        'line-blur': ['interpolate', ['linear'], ['zoom'], 6, 1, 10, 2, 14, 3],
                      },
                      layout: { 'line-cap': 'round', 'line-join': 'round' },
                    },
                    'formation-markers'
                  );
                  // Second highlight layer not needed in live (single centered glow),
                  // but create it hidden so filter updates don't error.
                  m2.addLayer(
                    {
                      id: FRONT_EDGES_HIGHLIGHT_NEG_LAYER_ID,
                      type: 'line',
                      source: FRONT_EDGES_HOVER_SOURCE_ID,
                      filter: ['all', ['==', ['get', 'offset_side'], -1], ['==', ['get', 'sector_id'], '__none__']],
                      paint: {
                        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 5, 10, 9, 14, 14],
                        'line-opacity': 0.95,
                        'line-color': '#ffffff',
                        'line-blur': ['interpolate', ['linear'], ['zoom'], 6, 1, 10, 2, 14, 3],
                      },
                      layout: { 'line-cap': 'round', 'line-join': 'round' },
                    },
                    'formation-markers'
                  );
                }
                // Hitbox layers (invisible, always present for click detection)
                m2.addLayer(
                  {
                    id: FRONT_EDGES_HOVER_NEG_LAYER_ID,
                    type: 'line',
                    source: FRONT_EDGES_HOVER_SOURCE_ID,
                    filter: ['==', ['get', 'offset_side'], -1],
                    paint: {
                      'line-width': toZoomWidthExpression(FRONT_SURFACE_HITBOX_WIDTHS),
                      'line-opacity': INTERACTION_HITBOX_OPACITY,
                      'line-color': '#ffffff',
                    },
                  },
                  'formation-markers'
                );
                m2.addLayer(
                  {
                    id: SECTOR_EDGE_HIT_POS_LAYER_ID,
                    type: 'line',
                    source: FRONT_EDGES_HOVER_SOURCE_ID,
                    filter: ['==', ['get', 'offset_side'], 1],
                    paint: {
                      'line-width': toZoomWidthExpression(FRONT_SURFACE_HITBOX_WIDTHS),
                      'line-opacity': INTERACTION_HITBOX_OPACITY,
                      'line-color': '#ffffff',
                    },
                  },
                  'formation-markers'
                );
                m2.addLayer(
                  {
                    id: SECTOR_EDGE_HIT_NEG_LAYER_ID,
                    type: 'line',
                    source: FRONT_EDGES_HOVER_SOURCE_ID,
                    filter: ['==', ['get', 'offset_side'], -1],
                    paint: {
                      'line-width': toZoomWidthExpression(FRONT_SURFACE_HITBOX_WIDTHS),
                      'line-opacity': INTERACTION_HITBOX_OPACITY,
                      'line-color': '#ffffff',
                    },
                  },
                  'formation-markers'
                );
              } else {
                (m2.getSource(FRONT_EDGES_HOVER_SOURCE_ID) as GeoJSONSource).setData(frontEdgesHoverData);
              }

              const nextInteractionSignature = getDynamicInteractionLayerSignature(m2);
              if (nextInteractionSignature !== interactionLayerSignatureRef.current) {
                interactionLayerSignatureRef.current = nextInteractionSignature;
                if (nextInteractionSignature.length > 0) {
                  setInteractionBindingRevision((revision) => revision + 1);
                }
              }
            }

            } finally {
              frontTimer.end();
            }

            requestAnimationFrame(() => {
              if (cancelled || !mapRef.current || !state) return;
              try {
                // Only hide map-level icons if the overlay anchor is ready, ensuring no "flicker/disappearance"
                const activeOverlayOsid = (expandedStackOsid && overlayAnchor) ? expandedStackOsid : null;
                const formationsGeoJson = buildFormationsGeoJSON(state, controlledGeoJson, activeOverlayOsid, locale);
                // Order arrows removed — player is political leader, not military commander.
                // The source stays empty; layers in awwv_map_style.json are inert.
                const iconIds = Array.from(new Set(formationsGeoJson.features.flatMap(f => [f.properties.icon_id, f.properties.white_icon_id])));

                // Defer icon registration + setData to idle/next tick so this rAF doesn't block the main thread (freeze fix).
                const runDeferred = () => {
                  if (cancelled || !mapRef.current || !state) return;
                  const initialMap = mapRef.current;
                  const deferredTimer = createDevTimer('[MapContainer] overlay deferred formations', devMode);
                  try {
                    try {
                      ensureFormationIcons(initialMap, iconIds);
                    } catch (iconErr) {
                      console.warn('[MapContainer] Formation icon registration failed (labels may still show):', iconErr);
                    }
                    if (cancelled || !mapRef.current || mapRef.current !== initialMap) return;

                    const { formationsVisible: fVis, labelsVisible: lVis } = useGameStore.getState();
                    lastFormationsGeoJsonRef.current = formationsGeoJson;

                    // Update Deck.gl layers
                    if (deckOverlayRef.current) {
                      const {
                        ghostMapVisible: gmVis,
                        selectedFormationId: deckSelectedFormationId,
                        selectedCorpsId: deckSelectedCorpsId,
                        selectedCorpsFrontSectorId: deckSelectedSectorId,
                        hoveredSectorId: deckHoveredSectorId,
                        hoveredCorpsId: deckHoveredCorpsId,
                      } = useGameStore.getState();
                      applyDeckLayerSelection({
                        formationsGeoJson,
                        labelsVisible: lVis,
                        formationsVisible: fVis,
                        zoom: initialMap.getZoom(),
                        loadedGameState: state,
                        ghostMapVisible: gmVis,
                        ghostMapData: ghostMapDataRef.current ?? undefined,
                        selectedFormationId: deckSelectedFormationId,
                        selectedCorpsId: deckSelectedCorpsId,
                        selectedCorpsFrontSectorId: deckSelectedSectorId,
                        hoveredSectorId: deckHoveredSectorId,
                        hoveredCorpsId: deckHoveredCorpsId,
                      });
                    }

                    // Keep empty source for sector highlight rings if needed, but disable MapLibre native formation symbols
                    if (m.getSource('formations')) (m.getSource('formations') as GeoJSONSource).setData(formationsGeoJson);
                    // order-arrows source stays empty (arrows removed)

                    // Heatmap: Supply and Combat intensity
                    safeEnsureSource(m, 'operational-heatmap', { type: 'geojson', data: EMPTY_GEOJSON });
                    safeEnsureLayer(m, {
                      id: 'heatmap-layer',
                      type: 'heatmap',
                      source: 'operational-heatmap',
                      maxzoom: 14,
                      paint: {
                        'heatmap-weight': ['interpolate', ['linear'], ['get', 'intensity'], 0, 0, 1, 1],
                        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 6, 1, 14, 3],
                        'heatmap-color': [
                          'interpolate', ['linear'], ['heatmap-density'],
                          0, 'rgba(0, 0, 0, 0)',
                          0.2, 'rgba(0, 255, 255, 0.1)',
                          0.4, 'rgba(0, 255, 0, 0.3)',
                          0.6, 'rgba(255, 255, 0, 0.5)',
                          0.8, 'rgba(255, 0, 0, 0.7)',
                          1, 'rgba(255, 255, 255, 0.9)'
                        ],
                        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 6, 10, 14, 40],
                        'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0.8, 14, 0],
                      }
                    }, 'formation-markers');

                    // Operation arrows: sweeping military-style arrows for active operations
                    const opArrowsGeoJson = buildOperationArrowsGeoJSON(state, osidCentroidsRef.current);
                    safeEnsureSource(m, OP_ARROWS_SOURCE_ID, { type: 'geojson', data: opArrowsGeoJson });
                    // Glow — wide, blurred, behind everything else
                    safeEnsureLayer(m, {
                      id: OP_ARROWS_GLOW_LAYER_ID, type: 'line', source: OP_ARROWS_SOURCE_ID,
                      filter: ['==', ['get', 'type'], 'op-arrow-glow'],
                      paint: { 'line-color': ['get', 'color'], 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 10, 10, 16, 14, 22], 'line-blur': ['interpolate', ['linear'], ['zoom'], 6, 6, 10, 10, 14, 14], 'line-opacity': 1.0 },
                      layout: { 'line-cap': 'round', 'line-join': 'round', visibility: 'none' },
                    }, 'formation-markers');
                    // Tapered body fill
                    safeEnsureLayer(m, {
                      id: OP_ARROWS_LINE_LAYER_ID, type: 'fill', source: OP_ARROWS_SOURCE_ID,
                      filter: ['==', ['get', 'type'], 'op-arrow-body'],
                      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 1.0 },
                      layout: { visibility: 'none' },
                    }, 'formation-markers');
                    // Arrowheads
                    safeEnsureLayer(m, {
                      id: OP_ARROWS_HEAD_LAYER_ID, type: 'fill', source: OP_ARROWS_SOURCE_ID,
                      filter: ['==', ['get', 'type'], 'op-arrow-head'],
                      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 1.0 },
                      layout: { visibility: 'none' },
                    }, 'formation-markers');
                    // Origin dots
                    safeEnsureLayer(m, {
                      id: OP_ARROWS_ORIGIN_LAYER_ID, type: 'circle', source: OP_ARROWS_SOURCE_ID,
                      filter: ['==', ['get', 'type'], 'op-arrow-origin'],
                      paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2, 10, 3, 14, 4.5], 'circle-color': ['get', 'color'], 'circle-opacity': 0.8 },
                      layout: { visibility: 'none' },
                    }, 'formation-markers');
                    (m.getSource(OP_ARROWS_SOURCE_ID) as GeoJSONSource)?.setData(opArrowsGeoJson);

                    // Fog of war: cover enemy OSIDs not confirmed empty by player recon
                    const fogGeoJson = buildFogOfWarGeoJSON(
                      base,
                      state.controlBySettlement,
                      state.player_faction,
                      state.fogOfWar,
                      state.frontEdgesOsid,
                    );
                    const fogBeforeId = FRONT_LAYER_IDS.find((layerId) => safeHasLayer(m, layerId))
                      ?? (safeHasLayer(m, 'formation-markers') ? 'formation-markers' : undefined);
                    safeEnsureLayer(
                      m,
                      { id: FOG_FILL_LAYER_ID, type: 'fill', source: FOG_OVERLAY_SOURCE_ID, paint: { 'fill-color': 'rgba(0, 0, 0, 0.42)' } },
                      fogBeforeId,
                    );
                    if (m.getSource(FOG_OVERLAY_SOURCE_ID)) (m.getSource(FOG_OVERLAY_SOURCE_ID) as GeoJSONSource).setData(fogGeoJson);
                    const { fogVisible: fogVis } = useGameStore.getState();
                    safeSetLayoutVisibility(m, FOG_FILL_LAYER_ID, fogVis && !!state.player_faction && !!state.fogOfWar);

                    // Enclave visualization: dashed faction-colored outline + faint fill + text label
                    const { polygons: enclavePolygons, labels: enclaveLabels } = buildEnclaveGeoJSON(
                      base, state.controlBySettlement, state.enclaveResilience, state.player_faction,
                    );
                    safeEnsureSource(m, ENCLAVE_SOURCE_ID, { type: 'geojson', data: enclavePolygons });
                    safeEnsureLayer(m, {
                      id: ENCLAVE_FILL_LAYER_ID,
                      type: 'fill',
                      source: ENCLAVE_SOURCE_ID,
                      paint: {
                        'fill-color': ['match', ['get', 'faction'],
                          'RS', 'rgba(178,60,60,1)',
                          'RBiH', 'rgba(55,135,70,1)',
                          'HRHB', 'rgba(50,108,168,1)',
                          'rgba(90,90,100,1)',
                        ],
                        'fill-opacity': 0.08,
                      },
                    }, 'formation-markers');
                    safeEnsureLayer(m, {
                      id: ENCLAVE_OUTLINE_LAYER_ID,
                      type: 'line',
                      source: ENCLAVE_SOURCE_ID,
                      paint: {
                        'line-color': ['match', ['get', 'faction'],
                          'RS', 'rgba(160,50,50,0.85)',
                          'RBiH', 'rgba(40,120,55,0.85)',
                          'HRHB', 'rgba(35,90,145,0.85)',
                          'rgba(80,80,90,0.75)',
                        ],
                        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1.2, 10, 2.0, 14, 3.0],
                        'line-dasharray': [4, 3],
                        'line-opacity': 0.85,
                      },
                      layout: { 'line-cap': 'butt', 'line-join': 'round' },
                    }, 'formation-markers');
                    if (m.getSource(ENCLAVE_SOURCE_ID)) (m.getSource(ENCLAVE_SOURCE_ID) as GeoJSONSource).setData(enclavePolygons);

                    safeEnsureSource(m, ENCLAVE_LABEL_SOURCE_ID, { type: 'geojson', data: enclaveLabels });
                    safeEnsureLayer(m, {
                      id: ENCLAVE_LABEL_LAYER_ID,
                      type: 'symbol',
                      source: ENCLAVE_LABEL_SOURCE_ID,
                      layout: {
                        'text-field': ['get', 'label'],
                        'text-font': ['Open Sans Bold'],
                        'text-size': ['interpolate', ['linear'], ['zoom'], 6, 8, 10, 11, 14, 15],
                        'text-anchor': 'center',
                        'text-allow-overlap': false,
                        'text-letter-spacing': 0.08,
                      },
                      paint: {
                        'text-color': ['match', ['get', 'faction'],
                          'RS', 'rgba(130,35,35,0.92)',
                          'RBiH', 'rgba(28,95,42,0.92)',
                          'HRHB', 'rgba(22,65,115,0.92)',
                          'rgba(55,55,65,0.85)',
                        ],
                        'text-halo-color': 'rgba(255,255,255,0.88)',
                        'text-halo-width': 1.5,
                        'text-opacity': 0.9,
                      },
                    });
                    if (m.getSource(ENCLAVE_LABEL_SOURCE_ID)) (m.getSource(ENCLAVE_LABEL_SOURCE_ID) as GeoJSONSource).setData(enclaveLabels);

                    // Battle markers: pulsing circles on OSIDs that flipped in last 3 turns
                    const battleMarkersGeoJson = buildBattleMarkersGeoJSON(
                      state.recentControlEvents ?? [],
                      base,
                      state.turn ?? 0,
                      state.latestTurnSummary?.battles,
                      state.latestTurnSummary?.turn ?? null,
                    );
                    const nextBattleMarkerProbe = {
                      count: battleMarkersGeoJson.features.length,
                      osids: battleMarkersGeoJson.features
                        .map((feature) => {
                          const osid = feature.properties?.osid;
                          return typeof osid === 'string' ? osid : '';
                        })
                        .filter(Boolean)
                        .sort()
                        .join(','),
                    };
                    setBattleMarkerProbe((previous) => (
                      previous.count === nextBattleMarkerProbe.count
                        && previous.osids === nextBattleMarkerProbe.osids
                        ? previous
                        : nextBattleMarkerProbe
                    ));
                    safeEnsureLayer(m, {
                      id: BATTLE_MARKERS_LAYER_ID,
                      type: 'circle',
                      source: BATTLE_MARKERS_SOURCE_ID,
                      paint: {
                        // Scale by casualties: base 4-10 + up to 6 more from total_casualties
                        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6,
                          ['+', 4, ['min', 6, ['/', ['get', 'total_casualties'], 200]]],
                          10,
                          ['+', 7, ['min', 8, ['/', ['get', 'total_casualties'], 150]]],
                          14,
                          ['+', 10, ['min', 10, ['/', ['get', 'total_casualties'], 100]]],
                        ],
                        // Color by outcome: green=attacker won, red=attacker lost, amber=stalemate, white=no data
                        'circle-color': ['match', ['get', 'outcome'],
                          'decisive_victory', 'rgba(86,211,100,0.9)',
                          'victory', 'rgba(86,211,100,0.7)',
                          'costly_victory', 'rgba(232,168,56,0.8)',
                          'stalemate', 'rgba(200,200,200,0.7)',
                          'repulsed', 'rgba(244,112,104,0.7)',
                          'catastrophic', 'rgba(244,80,80,0.9)',
                          '#ffffff',
                        ],
                        'circle-opacity': ['interpolate', ['linear'], ['get', 'age'], 0, 0.90, 1, 0.60, 2, 0.30],
                        'circle-stroke-color': ['match', ['get', 'to'],
                          'RS', 'rgba(160,50,50,0.9)',
                          'RBiH', 'rgba(40,120,55,0.9)',
                          'HRHB', 'rgba(35,90,145,0.9)',
                          'rgba(90,90,100,0.8)',
                        ],
                        'circle-stroke-width': 2,
                      },
                    }, 'formation-markers');
                    if (m.getSource(BATTLE_MARKERS_SOURCE_ID)) (m.getSource(BATTLE_MARKERS_SOURCE_ID) as GeoJSONSource).setData(battleMarkersGeoJson);
                    const { battlesVisible: battlesVis } = useGameStore.getState();
                    safeSetLayoutVisibility(m, BATTLE_MARKERS_LAYER_ID, battlesVis);
                    const { municipalityBordersVisible: munBordersVis } = useGameStore.getState();
                    if (safeHasLayer(m, OSID_CONTROL_OUTLINE_LAYER_ID)) {
                      safeSetLayoutVisibility(m, OSID_CONTROL_OUTLINE_LAYER_ID, munBordersVis);
                    }
                    if (safeHasLayer(m, MUN_BORDERS_LAYER_ID)) {
                      safeSetLayoutVisibility(m, MUN_BORDERS_LAYER_ID, munBordersVis);
                    }

                    const { selectedFormationId: selBid } = useGameStore.getState();

                    // Ghost Paths: selection-driven dashed lines for staged sector/move orders
                    const ghostGeoJson = buildGhostPathsGeoJSON(
                      state,
                      stagedOrders,
                      osidBaseRef.current!, // safe as we are in runDeferred
                      selBid
                    );
                    safeEnsureSource(m, GHOST_PATH_SOURCE_ID, { type: 'geojson', data: ghostGeoJson });
                    safeEnsureLayer(m, {
                      id: GHOST_PATH_LAYER_ID,
                      type: 'line',
                      source: GHOST_PATH_SOURCE_ID,
                      paint: {
                        'line-color': 'rgba(255, 255, 255, 0.45)',
                        'line-width': 2.5,
                        'line-dasharray': [2, 2],
                      },
                      layout: {
                        'line-cap': 'round',
                        'line-join': 'round',
                        visibility: selBid ? 'visible' : 'none'
                      }
                    }, 'formation-markers');
                    if (m.getSource(GHOST_PATH_SOURCE_ID)) (m.getSource(GHOST_PATH_SOURCE_ID) as GeoJSONSource).setData(ghostGeoJson);
                    safeSetLayoutVisibility(m, GHOST_PATH_LAYER_ID, !!selBid);

                    // Only hide MapLibre formation layers when Deck draws counters (avoids double draw + restores picks when false).
                    if (DEFAULT_DECK_LAYER_CAPABILITIES.deckFormationCounters) {
                      safeSetLayoutVisibility(m, FORMATION_MARKERS_LAYER_ID, false);
                      safeSetLayoutVisibility(m, FORMATION_LABELS_LAYER_ID, false);
                    }
                    // Force render frame to process newly-added GeoJSON sources
                    // Without this, sources like operational-heatmap/enclave-* may never tile,
                    // blocking isStyleLoaded() and leaving the map blank.
                    m.triggerRepaint();
                  } catch (deferredErr) {
                    console.error('[MapContainer] deferred overlay failed:', deferredErr);
                    appliedStateRef.current = null;
                  } finally {
                    deferredTimer.end();
                  }
                };

                const schedule = typeof requestIdleCallback !== 'undefined'
                  ? (fn: () => void) => requestIdleCallback(fn, { timeout: 400 })
                  : (fn: () => void) => setTimeout(fn, 0);
                const handle = schedule(runDeferred);
                deferredOverlayHandleRef.current = handle;
              } catch (e) {
                console.error('[MapContainer] overlay formations/orders failed:', e);
                appliedStateRef.current = null;
              }
            });
          } catch (e) {
            console.error('[MapContainer] overlay front failed:', e);
            appliedStateRef.current = null;
          }
        });
      });
    };

    const rafId = requestAnimationFrame(() => runUpdate());

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (deferredOverlayHandleRef.current != null) {
        if (typeof cancelIdleCallback !== 'undefined') cancelIdleCallback(deferredOverlayHandleRef.current as ReturnType<typeof requestIdleCallback>);
        clearTimeout(deferredOverlayHandleRef.current as ReturnType<typeof setTimeout>);
        appliedStateRef.current = null;
        deferredOverlayHandleRef.current = null;
      }
      if (sourceUpdatePollRef.current) {
        clearInterval(sourceUpdatePollRef.current);
        sourceUpdatePollRef.current = null;
      }
    };
  }, [loadedGameState, mapReady, stagedOrders, expandedStackOsid, locale]);

  // Major-mun names (game data): glyphs need local font stack; layer on top so not buried under lines.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    const ensureMajorCityLabelLayer = () => {
      if (!map.getSource('osid-control') || !safeHasLayer(map, 'osid-control-fill')) return false;

      safeEnsureSource(map, MAJOR_CITY_LABELS_SOURCE_ID, { type: 'geojson', data: EMPTY_GEOJSON });
      if (!safeHasLayer(map, MAJOR_CITY_LABELS_LAYER_ID)) {
        map.addLayer({
          id: MAJOR_CITY_LABELS_LAYER_ID,
          type: 'symbol',
          source: MAJOR_CITY_LABELS_SOURCE_ID,
          minzoom: 7,
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['Open Sans Bold'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 7, 10, 9, 12, 11, 15, 14, 20],
            'text-anchor': 'center',
            'text-allow-overlap': true,
            'text-ignore-placement': true,
            'text-transform': 'uppercase',
            'text-letter-spacing': 0.1,
          },
          paint: {
            'text-color': 'rgba(235, 225, 205, 0.95)',
            'text-halo-color': 'rgba(10, 8, 6, 0.9)',
            'text-halo-width': 2.0,
          },
        });
      }
      return true;
    };

    if (ensureMajorCityLabelLayer()) return;
    const poll = setInterval(() => {
      if (ensureMajorCityLabelLayer()) clearInterval(poll);
    }, 200);
    return () => clearInterval(poll);
  }, [mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    const applyHoverFilter = () => {
      if (!map.getSource('osid-control')) return false;
      if (!safeHasLayer(map, SIDEBAR_HOVER_LAYER_ID)) {
        map.addLayer(
          {
            id: SIDEBAR_HOVER_LAYER_ID,
            type: 'line',
            source: 'osid-control',
            paint: {
              'line-color': 'rgba(196, 163, 90, 0.95)',
              'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1.4, 10, 2.4, 14, 3.6],
              'line-opacity': 0.9,
            },
            filter: ['==', ['get', 'osid'], '__none__'],
          },
          'formation-markers'
        );
      }
      // Merge hovered OSIDs with selected corps brigade locations for persistent highlight
      let effectiveOsids = hoveredOsids;
      if (selectedCorpsId && loadedGameState?.formations) {
        const corpsOsids = loadedGameState.formations
          .filter(f => f.corps_id === selectedCorpsId && f.location_osid)
          .map(f => f.location_osid!);
        if (corpsOsids.length > 0) {
          const merged = new Set([...hoveredOsids, ...corpsOsids]);
          effectiveOsids = [...merged];
        }
      }
      const filter =
        effectiveOsids.length === 0
          ? (['==', ['get', 'osid'], '__none__'] as maplibregl.FilterSpecification)
          : (['in', ['get', 'osid'], ['literal', effectiveOsids]] as maplibregl.FilterSpecification);
      try {
        map.setFilter(SIDEBAR_HOVER_LAYER_ID, filter);
      } catch (e) {
        console.error('[MapContainer] applyHoverFilter setFilter failed', e);
        return false;
      }
      return true;
    };

    if (applyHoverFilter()) return;
    const poll = setInterval(() => {
      if (applyHoverFilter()) clearInterval(poll);
    }, 250);
    return () => clearInterval(poll);
  }, [hoveredOsids, selectedCorpsId, loadedGameState, mapReady]);

  // Operation target visualization: crosshair + ring + dot + fill on objective OSIDs
  useEffect(() => {
    const map = mapRef.current;
    const centroidLookup = osidCentroidsRef.current;
    const baseGeoJson = osidBaseRef.current;
    if (!mapReady || !map || !baseGeoJson) return;

    const emptyGeoJson: FeatureCollection = { type: 'FeatureCollection', features: [] };
    const targetSet = new Set(operationTargetOsids.filter((osid) => osid.length > 0));
    const targetPolygons: FeatureCollection = targetSet.size
      ? {
        type: 'FeatureCollection',
        features: baseGeoJson.features.filter((feature) => {
          const osid = typeof feature.properties?.osid === 'string' ? feature.properties.osid : '';
          return osid.length > 0 && targetSet.has(osid);
        }),
      }
      : emptyGeoJson;
    const targetPoints = targetSet.size
      ? buildOperationTargetPointsGeoJSON(centroidLookup, operationTargetOsids)
      : emptyGeoJson;
    const targetCrosshairs = targetSet.size
      ? buildOperationTargetCrosshairsGeoJSON(centroidLookup, operationTargetOsids)
      : emptyGeoJson;

    const applyOperationTargets = () => {
      if (!map.getSource('osid-control')) return false;

      safeEnsureSource(map, OP_TARGET_POLYGON_SOURCE_ID, { type: 'geojson', data: emptyGeoJson });
      safeEnsureSource(map, OP_TARGET_POINT_SOURCE_ID, { type: 'geojson', data: emptyGeoJson });
      safeEnsureSource(map, OP_TARGET_CROSSHAIR_SOURCE_ID, { type: 'geojson', data: emptyGeoJson });

      const beforeId = safeHasLayer(map, 'formation-markers') ? 'formation-markers' : undefined;

      safeEnsureLayer(map, {
        id: OP_TARGET_FILL_LAYER_ID,
        type: 'fill',
        source: OP_TARGET_POLYGON_SOURCE_ID,
        paint: { 'fill-color': 'rgba(8, 8, 8, 0.28)' },
        layout: { visibility: 'none' }
      }, beforeId);

      safeEnsureLayer(map, {
        id: OP_TARGET_OUTLINE_LAYER_ID,
        type: 'line',
        source: OP_TARGET_POLYGON_SOURCE_ID,
        paint: {
          'line-color': 'rgba(5, 5, 5, 0.95)',
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.9, 10, 1.35, 14, 1.8],
          'line-opacity': 0.95
        },
        layout: { visibility: 'none' }
      }, beforeId);

      safeEnsureLayer(map, {
        id: OP_TARGET_ICON_RING_LAYER_ID,
        type: 'circle',
        source: OP_TARGET_POINT_SOURCE_ID,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 7, 10, 10, 14, 14],
          'circle-color': 'rgba(0,0,0,0)',
          'circle-stroke-color': 'rgba(5,5,5,0.95)',
          'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 6, 1, 10, 1.5, 14, 2],
          'circle-opacity': 1
        },
        layout: { visibility: 'none' }
      }, beforeId);

      safeEnsureLayer(map, {
        id: OP_TARGET_ICON_INNER_RING_LAYER_ID,
        type: 'circle',
        source: OP_TARGET_POINT_SOURCE_ID,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 3.5, 10, 5, 14, 7],
          'circle-color': 'rgba(0,0,0,0)',
          'circle-stroke-color': 'rgba(5,5,5,0.85)',
          'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 6, 0.8, 10, 1.1, 14, 1.5],
          'circle-opacity': 1
        },
        layout: { visibility: 'none' }
      }, beforeId);

      safeEnsureLayer(map, {
        id: OP_TARGET_ICON_DOT_LAYER_ID,
        type: 'circle',
        source: OP_TARGET_POINT_SOURCE_ID,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 1.2, 10, 1.8, 14, 2.6],
          'circle-color': 'rgba(5,5,5,0.95)',
          'circle-opacity': 1
        },
        layout: { visibility: 'none' }
      }, beforeId);

      safeEnsureLayer(map, {
        id: OP_TARGET_ICON_CROSSHAIR_LAYER_ID,
        type: 'line',
        source: OP_TARGET_CROSSHAIR_SOURCE_ID,
        layout: { 'line-cap': 'round', 'line-join': 'round', visibility: 'none' },
        paint: {
          'line-color': 'rgba(5,5,5,0.95)',
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1, 10, 1.4, 14, 1.9],
          'line-opacity': 0.95
        }
      }, beforeId);

      const targetSource = map.getSource(OP_TARGET_POLYGON_SOURCE_ID) as GeoJSONSource | undefined;
      const pointSource = map.getSource(OP_TARGET_POINT_SOURCE_ID) as GeoJSONSource | undefined;
      const crosshairSource = map.getSource(OP_TARGET_CROSSHAIR_SOURCE_ID) as GeoJSONSource | undefined;
      if (!targetSource || !pointSource || !crosshairSource) return false;

      targetSource.setData(targetPolygons);
      pointSource.setData(targetPoints);
      crosshairSource.setData(targetCrosshairs);

      const hasTargets = targetSet.size > 0;
      safeSetLayoutVisibility(map, OP_TARGET_FILL_LAYER_ID, hasTargets);
      safeSetLayoutVisibility(map, OP_TARGET_OUTLINE_LAYER_ID, hasTargets);
      safeSetLayoutVisibility(map, OP_TARGET_ICON_RING_LAYER_ID, hasTargets);
      safeSetLayoutVisibility(map, OP_TARGET_ICON_INNER_RING_LAYER_ID, hasTargets);
      safeSetLayoutVisibility(map, OP_TARGET_ICON_DOT_LAYER_ID, hasTargets);
      safeSetLayoutVisibility(map, OP_TARGET_ICON_CROSSHAIR_LAYER_ID, hasTargets);

      return true;
    };

    if (applyOperationTargets()) return;
    const poll = setInterval(() => {
      if (applyOperationTargets()) clearInterval(poll);
    }, 250);
    return () => clearInterval(poll);
  }, [mapReady, operationTargetOsids]);

  // Phase B: Sector visualization — fill territory + glow edges when a sector is selected.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    const ensureSectorLayers = () => {
      if (!map.getSource('osid-control') || !safeHasLayer(map, 'osid-control-fill')) return false;
      // Sector fill layer (on osid-control source, inserted before front lines)
      if (!safeHasLayer(map, SECTOR_FILL_LAYER_ID)) {
        map.addLayer(
          {
            id: SECTOR_FILL_LAYER_ID,
            type: 'fill',
            source: 'osid-control',
            filter: ['==', ['get', 'osid'], '__none__'],
            paint: {
              'fill-color': [
                'interpolate', ['linear'], ['get', 'threat_ratio'],
                0, 'rgba(0,0,0,0)',
                0.5, 'rgba(120, 0, 0, 0.12)',
                1, 'rgba(180, 0, 0, 0.35)',
                2, 'rgba(255, 0, 0, 0.65)'
              ],
              'fill-outline-color': 'rgba(196, 163, 90, 0.4)',
              'fill-opacity': [
                'case', ['literal', devMode], 0.15, 0.35
              ],
            },
          },
          'faction-border-glow-pos'
        );
      }
      // Sector edge glow layers — use front-lines source (same geometry as front line rendering)
      // so the highlight trails the front line exactly. Filter for lineType=glow which carries
      // sector_id, corps_id, offset_side metadata.
      if (!map.getSource(FRONT_EDGES_HOVER_SOURCE_ID)) {
        return false;
      }
      if (!safeHasLayer(map, SECTOR_EDGE_GLOW_POS_LAYER_ID)) {
        map.addLayer(
          {
            id: SECTOR_EDGE_GLOW_POS_LAYER_ID,
            type: 'line',
            source: FRONT_EDGES_HOVER_SOURCE_ID,
            filter: ['all', ['==', ['get', 'offset_side'], 1], ['==', ['get', 'sector_id'], '__none__']],
            paint: devMode ? {
              'line-width': ['interpolate', ['linear'], ['zoom'], 6, 3, 10, 5, 14, 8],
              'line-offset': ['interpolate', ['linear'], ['zoom'], 6, 4, 10, 8, 14, 12],
              'line-opacity': 0.85,
              'line-color': '#ffffff',
            } : {
              // Live mode: centered glow on the front line, no offset
              'line-width': ['interpolate', ['linear'], ['zoom'], 6, 6, 10, 10, 14, 16],
              'line-opacity': 0.95,
              'line-color': '#ffffff',
              'line-blur': ['interpolate', ['linear'], ['zoom'], 6, 1, 10, 2, 14, 3],
            },
            layout: { 'line-cap': 'round', 'line-join': 'round' },
          },
          'formation-markers'
        );
      }
      if (!safeHasLayer(map, SECTOR_EDGE_GLOW_NEG_LAYER_ID)) {
        map.addLayer(
          {
            id: SECTOR_EDGE_GLOW_NEG_LAYER_ID,
            type: 'line',
            source: FRONT_EDGES_HOVER_SOURCE_ID,
            filter: ['all', ['==', ['get', 'offset_side'], -1], ['==', ['get', 'sector_id'], '__none__']],
            paint: devMode ? {
              'line-width': ['interpolate', ['linear'], ['zoom'], 6, 3, 10, 5, 14, 8],
              'line-offset': ['interpolate', ['linear'], ['zoom'], 6, -4, 10, -8, 14, -12],
              'line-opacity': 0.85,
              'line-color': '#ffffff',
            } : {
              // Live mode: centered glow (mirrors pos layer)
              'line-width': ['interpolate', ['linear'], ['zoom'], 6, 6, 10, 10, 14, 16],
              'line-opacity': 0.95,
              'line-color': '#ffffff',
              'line-blur': ['interpolate', ['linear'], ['zoom'], 6, 1, 10, 2, 14, 3],
            },
            layout: { 'line-cap': 'round', 'line-join': 'round' },
          },
          'formation-markers'
        );
      }
      // C.3: Brigade selection rings (on formations source)
      if (map.getSource('formations') && !safeHasLayer(map, SECTOR_BRIGADE_RINGS_LAYER_ID)) {
        map.addLayer({
          id: SECTOR_BRIGADE_RINGS_LAYER_ID,
          type: 'circle',
          source: 'formations',
          filter: ['==', ['get', 'id'], '__none__'],
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 6, 10, 10, 14, 16],
            'circle-color': 'transparent',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#c4a35a',
            'circle-stroke-opacity': 0.8,
          },
        });
      }
      // C.3c: Unit marker color pulse overlay (on formations source)
      if (map.getSource('formations') && !safeHasLayer(map, FORMATION_WHITE_OVERLAY_LAYER_ID)) {
        map.addLayer({
          id: FORMATION_WHITE_OVERLAY_LAYER_ID,
          type: 'symbol',
          source: 'formations',
          filter: ['==', ['get', 'sector_id'], '__none__'],
          layout: {
            'icon-image': ['get', 'white_icon_id'],
            'icon-size': ['interpolate', ['linear'], ['zoom'], 6, 0.45, 10, 0.7, 14, 0.9],
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
          },
          paint: {
            'icon-opacity': 0,
          },
        });
      }
      // C.3b: Sector Unit Pulse (Audit recommendation: units turn white and pulse)
      if (map.getSource('formations') && !safeHasLayer(map, SECTOR_UNIT_PULSE_LAYER_ID)) {
        map.addLayer({
          id: SECTOR_UNIT_PULSE_LAYER_ID,
          type: 'circle',
          source: 'formations',
          filter: ['==', ['get', 'sector_id'], '__none__'],
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 8, 10, 12, 14, 18],
            'circle-color': '#ffffff',
            'circle-opacity': 0.6,
            'circle-blur': 0.8,
          },
        }, 'formation-markers'); // Place behind icons
      }
      // C4: Home defense badge — small glow ring on brigades at their home municipality
      if (map.getSource('formations') && !safeHasLayer(map, FORMATION_HOME_BADGE_LAYER_ID)) {
        map.addLayer(
          {
            id: FORMATION_HOME_BADGE_LAYER_ID,
            type: 'circle',
            source: 'formations',
            filter: ['==', ['get', 'is_home'], true],
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 4, 10, 7, 14, 11],
              'circle-color': 'transparent',
              'circle-stroke-width': 1.5,
              'circle-stroke-color': '#88cc44',
              'circle-stroke-opacity': 0.7,
            },
          },
          'formation-markers'
        );
      }
      return true;
    };

    const hexToRgba = (hex: string, alpha: number): string => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const applySectorHighlight = () => {
      if (!ensureSectorLayers()) return false;

      const activeSectorIds = new Set<string>();
      if (hoveredSectorId) activeSectorIds.add(hoveredSectorId);
      if (selectedCorpsFrontSectorId) activeSectorIds.add(selectedCorpsFrontSectorId);

      // If a corps is hovered or selected, highlight all its sectors
      const activeCorpsId = selectedCorpsId || hoveredCorpsId;
      if (activeCorpsId && loadedGameState?.corpsFrontSectors) {
        loadedGameState.corpsFrontSectors
          .filter((s) => s.corps_id === activeCorpsId)
          .forEach((s) => activeSectorIds.add(s.sector_id));
      }

      if (activeSectorIds.size === 0 || !sectorsVisible) {
        // Clear: hide sector fill + edge glow + brigade rings + highlight lines
        try {
          map.setFilter(SECTOR_FILL_LAYER_ID, ['==', ['get', 'osid'], '__none__'] as maplibregl.FilterSpecification);
          if (safeHasLayer(map, SECTOR_EDGE_GLOW_POS_LAYER_ID)) {
            map.setFilter(SECTOR_EDGE_GLOW_POS_LAYER_ID, ['all', ['==', ['get', 'offset_side'], 1], ['==', ['get', 'sector_id'], '__none__']] as maplibregl.FilterSpecification);
          }
          if (safeHasLayer(map, SECTOR_EDGE_GLOW_NEG_LAYER_ID)) {
            map.setFilter(SECTOR_EDGE_GLOW_NEG_LAYER_ID, ['all', ['==', ['get', 'offset_side'], -1], ['==', ['get', 'sector_id'], '__none__']] as maplibregl.FilterSpecification);
          }
          if (safeHasLayer(map, FRONT_EDGES_HIGHLIGHT_POS_LAYER_ID)) {
            map.setFilter(FRONT_EDGES_HIGHLIGHT_POS_LAYER_ID, ['all', ['==', ['get', 'offset_side'], 1], ['==', ['get', 'sector_id'], '__none__']] as maplibregl.FilterSpecification);
          }
          if (safeHasLayer(map, FRONT_EDGES_HIGHLIGHT_NEG_LAYER_ID)) {
            map.setFilter(FRONT_EDGES_HIGHLIGHT_NEG_LAYER_ID, ['all', ['==', ['get', 'offset_side'], -1], ['==', ['get', 'sector_id'], '__none__']] as maplibregl.FilterSpecification);
          }
          if (safeHasLayer(map, SECTOR_BRIGADE_RINGS_LAYER_ID)) {
            map.setFilter(SECTOR_BRIGADE_RINGS_LAYER_ID, ['==', ['get', 'id'], '__none__'] as maplibregl.FilterSpecification);
          }
        } catch (e) {
          console.warn('[MapContainer] sector clear filter failed:', e);
        }
        return true;
      }

      const state = loadedGameState;
      const ids = Array.from(activeSectorIds);
      const isMulti = ids.length > 1;
      const selectedSector = state?.corpsFrontSectors?.find(s => s.sector_id === selectedCorpsFrontSectorId);
      const frontEdgesOsid = state?.frontEdgesOsid;
      if (!frontEdgesOsid) return true;

      // For fill, we can highlight all OSIDs in all active sectors
      const allActiveSectors = state?.corpsFrontSectors?.filter(s => activeSectorIds.has(s.sector_id)) ?? [];
      const allOsids = allActiveSectors.flatMap(s =>
        s.territory_osids && s.territory_osids.length > 0
          ? s.territory_osids
          : collectSectorFriendlyOsids(s, frontEdgesOsid)
      );

      // Compute corps color map once for all branches
      const corpsColorMap = state?.corpsFrontSectors ? buildCorpsColorMap(state.corpsFrontSectors) : {};

      // Resolve highlight corps ID: explicit corps selection, or derived from selected sector
      const highlightCorpsId = selectedCorpsId ?? selectedSector?.corps_id ?? null;
      const highlightCorpsHex = highlightCorpsId ? (corpsColorMap[highlightCorpsId] ?? '#c4a35a') : '#c4a35a';

      try {
        map.setFilter(SECTOR_FILL_LAYER_ID,
          allOsids.length > 0
            ? ['in', ['get', 'osid'], ['literal', allOsids]] as maplibregl.FilterSpecification
            : ['==', ['get', 'osid'], '__none__'] as maplibregl.FilterSpecification
        );
        // Use corps color for corps/sector selection, generic gold for hover-only
        if (selectedCorpsId || (!isMulti && selectedCorpsFrontSectorId)) {
          map.setPaintProperty(SECTOR_FILL_LAYER_ID, 'fill-color', hexToRgba(highlightCorpsHex, 0.18));
        } else {
          map.setPaintProperty(SECTOR_FILL_LAYER_ID, 'fill-color', 'rgba(196, 163, 90, 0.20)');
        }
      } catch (e) {
        console.warn('[MapContainer] sector fill filter failed:', e);
      }

      // 2. Highlight front edges in the sector
      const filterExpr = ['in', ['get', 'sector_id'], ['literal', ids]] as FilterSpecification;
      try {
        if (safeHasLayer(map, SECTOR_EDGE_GLOW_POS_LAYER_ID)) {
          map.setFilter(SECTOR_EDGE_GLOW_POS_LAYER_ID, ['all', ['==', ['get', 'offset_side'], 1], filterExpr] as FilterSpecification);
        }
        if (safeHasLayer(map, SECTOR_EDGE_GLOW_NEG_LAYER_ID)) {
          map.setFilter(SECTOR_EDGE_GLOW_NEG_LAYER_ID, ['all', ['==', ['get', 'offset_side'], -1], filterExpr] as FilterSpecification);
        }
        if (safeHasLayer(map, FRONT_EDGES_HIGHLIGHT_POS_LAYER_ID)) {
          map.setFilter(FRONT_EDGES_HIGHLIGHT_POS_LAYER_ID, ['all', ['==', ['get', 'offset_side'], 1], filterExpr] as FilterSpecification);
        }
        if (safeHasLayer(map, FRONT_EDGES_HIGHLIGHT_NEG_LAYER_ID)) {
          map.setFilter(FRONT_EDGES_HIGHLIGHT_NEG_LAYER_ID, ['all', ['==', ['get', 'offset_side'], -1], filterExpr] as FilterSpecification);
        }

        // Apply static highlight opacity
        [SECTOR_EDGE_GLOW_POS_LAYER_ID, SECTOR_EDGE_GLOW_NEG_LAYER_ID].forEach(layerId => {
          if (safeHasLayer(map, layerId)) map.setPaintProperty(layerId, 'line-opacity', 0.95);
        });
      } catch (e) {
        console.warn('[MapContainer] sector edge glow highlight failed:', e);
      }

      // C.3: Brigade rings — highlight assigned + reserve brigades for selected sector or corps
        try {
          if (safeHasLayer(map, SECTOR_BRIGADE_RINGS_LAYER_ID)) {
          const ringBrigadeIds = collectEmphasizedFormationIds({
            formationsGeoJson: lastFormationsGeoJsonRef.current,
            loadedGameState,
            selectedCorpsId,
            selectedCorpsFrontSectorId,
          });
          if (ringBrigadeIds.length > 0) {
            map.setFilter(SECTOR_BRIGADE_RINGS_LAYER_ID, ['in', ['get', 'id'], ['literal', ringBrigadeIds]] as FilterSpecification);
            map.setPaintProperty(SECTOR_BRIGADE_RINGS_LAYER_ID, 'circle-stroke-color', highlightCorpsHex);
          } else {
            map.setFilter(SECTOR_BRIGADE_RINGS_LAYER_ID, ['==', ['get', 'id'], '__none__'] as FilterSpecification);
          }
        }
      } catch (e) {
        console.warn('[MapContainer] sector brigade rings focus failed:', e);
      }

      // C.3b + C.3c: Unit white glow + white icon overlay — sector or corps selection.
      // When only a formation is selected (no corps/sector), the brigade AoR effect owns white overlay;
      // skip here so hover polling / delayed applySectorHighlight does not reset icon-opacity to 0.
      const unitHighlightActive = !!(selectedCorpsId || selectedCorpsFrontSectorId);
      const formationOnlySelected =
        !!selectedFormationId && !selectedCorpsId && !selectedCorpsFrontSectorId;
      // Use sector_id IN filter for corps (covers all brigades assigned to corps sectors)
      const unitFilter = (selectedCorpsId
        ? ['==', ['get', 'corps_id'], selectedCorpsId]
        : selectedCorpsFrontSectorId
          ? ['==', ['get', 'sector_id'], selectedCorpsFrontSectorId]
          : ['==', ['get', 'sector_id'], '__none__']) as FilterSpecification;

      if (!formationOnlySelected) {
        try {
          if (safeHasLayer(map, SECTOR_UNIT_PULSE_LAYER_ID)) {
            map.setFilter(SECTOR_UNIT_PULSE_LAYER_ID, unitFilter);
            if (unitHighlightActive) {
              map.setPaintProperty(SECTOR_UNIT_PULSE_LAYER_ID, 'circle-opacity', 0.6);
              map.setPaintProperty(SECTOR_UNIT_PULSE_LAYER_ID, 'circle-radius', [
                'interpolate', ['linear'], ['zoom'],
                6, 12, 10, 16, 14, 22
              ]);
            } else {
              map.setPaintProperty(SECTOR_UNIT_PULSE_LAYER_ID, 'circle-opacity', 0);
            }
          }
        } catch (e) {
          console.warn('[MapContainer] sector unit highlight failed:', e);
        }

        try {
          if (safeHasLayer(map, FORMATION_WHITE_OVERLAY_LAYER_ID)) {
            map.setFilter(FORMATION_WHITE_OVERLAY_LAYER_ID, unitFilter);
            map.setPaintProperty(FORMATION_WHITE_OVERLAY_LAYER_ID, 'icon-opacity', unitHighlightActive ? 0.98 : 0);
          }
        } catch (e) {
          console.warn('[MapContainer] unit marker white highlight failed:', e);
        }
      }

      return true;
    };

    if (applySectorHighlight()) {
      // Only loop for transient hover states; static selections (corps/sector) are stable after one apply.
      const hasTransientHover = !!(hoveredSectorId || hoveredCorpsId);
      if (hasTransientHover) {
        const handle = setTimeout(() => applySectorHighlight(), 50);
        return () => clearTimeout(handle);
      }
      return;
    }
    const poll = setInterval(() => {
      if (applySectorHighlight()) clearInterval(poll);
    }, 250);
    return () => clearInterval(poll);
  }, [mapReady, selectedCorpsFrontSectorId, selectedCorpsId, selectedFormationId, sectorsVisible, loadedGameState, hoveredSectorId, hoveredCorpsId]);

  // Brigade AoR highlight: white icon + sub-segment front line.
  // Uses DEDICATED layers (brigade-aor-pos/neg) that never touch sector highlight layers.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    if (!map.getSource(FRONT_EDGES_HOVER_SOURCE_ID)) return;

    // Create dedicated AoR glow layers once (on top of sector glow, under formations)
    if (!safeHasLayer(map, BRIGADE_AOR_POS_LAYER_ID)) {
      map.addLayer({
        id: BRIGADE_AOR_POS_LAYER_ID,
        type: 'line',
        source: FRONT_EDGES_HOVER_SOURCE_ID,
        filter: ['all', ['==', ['get', 'offset_side'], 1], ['==', ['get', 'sub_segment_id'], '__none__']],
        paint: {
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 4, 10, 7, 14, 10],
          'line-offset': ['interpolate', ['linear'], ['zoom'], 6, 4, 10, 8, 14, 12],
          'line-opacity': 0,
          'line-color': '#ffffff',
          'line-blur': 2,
        },
      }, 'formation-markers');
    }
    if (!safeHasLayer(map, BRIGADE_AOR_NEG_LAYER_ID)) {
      map.addLayer({
        id: BRIGADE_AOR_NEG_LAYER_ID,
        type: 'line',
        source: FRONT_EDGES_HOVER_SOURCE_ID,
        filter: ['all', ['==', ['get', 'offset_side'], -1], ['==', ['get', 'sub_segment_id'], '__none__']],
        paint: {
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 4, 10, 7, 14, 10],
          'line-offset': ['interpolate', ['linear'], ['zoom'], 6, -4, 10, -8, 14, -12],
          'line-opacity': 0,
          'line-color': '#ffffff',
          'line-blur': 2,
        },
      }, 'formation-markers');
    }

    if (!selectedFormationId || !loadedGameState) {
      // Hide AoR layers + white overlay
      if (safeHasLayer(map, BRIGADE_AOR_POS_LAYER_ID)) {
        map.setPaintProperty(BRIGADE_AOR_POS_LAYER_ID, 'line-opacity', 0);
      }
      if (safeHasLayer(map, BRIGADE_AOR_NEG_LAYER_ID)) {
        map.setPaintProperty(BRIGADE_AOR_NEG_LAYER_ID, 'line-opacity', 0);
      }
      // Only clear white overlay if no sector/corps is also selected (they control it)
      if (!selectedCorpsId && !selectedCorpsFrontSectorId) {
        if (safeHasLayer(map, FORMATION_WHITE_OVERLAY_LAYER_ID)) {
          map.setFilter(FORMATION_WHITE_OVERLAY_LAYER_ID, ['==', ['get', 'id'], '__none__'] as maplibregl.FilterSpecification);
          map.setPaintProperty(FORMATION_WHITE_OVERLAY_LAYER_ID, 'icon-opacity', 0);
        }
        if (safeHasLayer(map, SECTOR_UNIT_PULSE_LAYER_ID)) {
          map.setFilter(SECTOR_UNIT_PULSE_LAYER_ID, ['==', ['get', 'id'], '__none__'] as maplibregl.FilterSpecification);
          map.setPaintProperty(SECTOR_UNIT_PULSE_LAYER_ID, 'circle-opacity', 0);
        }
      }
      return;
    }

    const fm = loadedGameState.formations.find(f => f.id === selectedFormationId);
    const subSegId = fm?.assigned_sub_segment_id;

    // White icon on selected brigade
    if (safeHasLayer(map, FORMATION_WHITE_OVERLAY_LAYER_ID)) {
      map.setFilter(FORMATION_WHITE_OVERLAY_LAYER_ID, ['==', ['get', 'id'], selectedFormationId] as maplibregl.FilterSpecification);
      map.setPaintProperty(FORMATION_WHITE_OVERLAY_LAYER_ID, 'icon-opacity', 0.98);
    }
    if (safeHasLayer(map, SECTOR_UNIT_PULSE_LAYER_ID)) {
      map.setFilter(SECTOR_UNIT_PULSE_LAYER_ID, ['==', ['get', 'id'], selectedFormationId] as maplibregl.FilterSpecification);
      map.setPaintProperty(SECTOR_UNIT_PULSE_LAYER_ID, 'circle-opacity', 0.6);
      map.setPaintProperty(SECTOR_UNIT_PULSE_LAYER_ID, 'circle-radius', ['interpolate', ['linear'], ['zoom'], 6, 12, 10, 16, 14, 22]);
    }

    // AoR sub-segment line on dedicated layers
    if (subSegId) {
      const ssFilter = ['==', ['get', 'sub_segment_id'], subSegId] as FilterSpecification;
      map.setFilter(BRIGADE_AOR_POS_LAYER_ID, ['all', ['==', ['get', 'offset_side'], 1], ssFilter] as FilterSpecification);
      map.setFilter(BRIGADE_AOR_NEG_LAYER_ID, ['all', ['==', ['get', 'offset_side'], -1], ssFilter] as FilterSpecification);
      map.setPaintProperty(BRIGADE_AOR_POS_LAYER_ID, 'line-opacity', 0.9);
      map.setPaintProperty(BRIGADE_AOR_NEG_LAYER_ID, 'line-opacity', 0.9);
    } else {
      map.setPaintProperty(BRIGADE_AOR_POS_LAYER_ID, 'line-opacity', 0);
      map.setPaintProperty(BRIGADE_AOR_NEG_LAYER_ID, 'line-opacity', 0);
    }
  }, [mapReady, selectedFormationId, selectedCorpsId, selectedCorpsFrontSectorId, loadedGameState]);

  // Ethnic map mode: add osid-ethnic source and fill layer when we have base + osidPropertiesMap.
  // Defer buildEthnicGeoJSON to rAF so it doesn't block when loadedGameState is set.
  useEffect(() => {
    const map = mapRef.current;
    const baseGeoJson = osidBaseRef.current;
    if (!mapReady || !map || !baseGeoJson || !osidPropertiesMap || Object.keys(osidPropertiesMap).length === 0) return;

    const displacementByMun = loadedGameState?.displacementByMun ?? undefined;
    const departedByOsid = loadedGameState?.departedByOsid ?? undefined;

    let cancelled = false;
    const rafId = requestAnimationFrame(() => {
      if (cancelled || !mapRef.current) return;
      const ethnicGeoJson = buildEthnicGeoJSON(baseGeoJson, osidPropertiesMap, displacementByMun, departedByOsid);
      if (cancelled || !mapRef.current) return;
      const m = mapRef.current;
      if (!m.getSource(OSID_ETHNIC_SOURCE_ID)) {
        m.addSource(OSID_ETHNIC_SOURCE_ID, { type: 'geojson', data: ethnicGeoJson });
        m.addLayer(
          {
            id: OSID_ETHNIC_FILL_LAYER_ID,
            type: 'fill',
            source: OSID_ETHNIC_SOURCE_ID,
            paint: {
              'fill-color': [
                'match',
                ['get', 'majority_ethnic'],
                'Bosniak',
                'rgba(55, 140, 75, 0.35)',
                'Serb',
                'rgba(180, 50, 50, 0.35)',
                'Croat',
                'rgba(50, 110, 170, 0.35)',
                'Other',
                'rgba(100, 100, 100, 0.25)',
                'rgba(60, 60, 70, 0.12)',
              ],
            },
          },
          OSID_SELECTED_MUN_SIBLING_FILL_LAYER_ID
        );
      } else {
        (m.getSource(OSID_ETHNIC_SOURCE_ID) as GeoJSONSource).setData(ethnicGeoJson);
      }
      const showPolitical = mapMode === 'political';
      safeSetLayoutVisibility(m, 'osid-control-fill', showPolitical);
      if (safeHasLayer(m, OSID_ETHNIC_FILL_LAYER_ID)) {
        safeSetLayoutVisibility(m, OSID_ETHNIC_FILL_LAYER_ID, mapMode === 'ethnic');
      }
      if (safeHasLayer(m, CONTESTED_BANDS_FILL_LAYER_ID)) {
        safeSetLayoutVisibility(m, CONTESTED_BANDS_FILL_LAYER_ID, mapMode === 'political' || mapMode === 'ethnic');
      }
      if (safeHasLayer(m, CONTESTED_BANDS_OUTLINE_LAYER_ID)) {
        safeSetLayoutVisibility(m, CONTESTED_BANDS_OUTLINE_LAYER_ID, mapMode === 'political' || mapMode === 'ethnic');
      }
      if (safeHasLayer(m, OSID_MORALE_FILL_LAYER_ID)) {
        safeSetLayoutVisibility(m, OSID_MORALE_FILL_LAYER_ID, mapMode === 'morale');
      }
      if (safeHasLayer(m, OSID_CASUALTIES_FILL_LAYER_ID)) {
        safeSetLayoutVisibility(m, OSID_CASUALTIES_FILL_LAYER_ID, mapMode === 'casualties');
      }
      if (safeHasLayer(m, OSID_SUPPLY_FILL_LAYER_ID)) {
        safeSetLayoutVisibility(m, OSID_SUPPLY_FILL_LAYER_ID, mapMode === 'supply');
      }
      if (safeHasLayer(m, POLITICAL_METRIC_FILL_LAYER_ID)) {
        safeSetLayoutVisibility(m, POLITICAL_METRIC_FILL_LAYER_ID, mapMode === 'authority' || mapMode === 'legitimacy');
      }
      if (safeHasLayer(m, SUPPLY_REACH_FILL_LAYER_ID)) {
        safeSetLayoutVisibility(m, SUPPLY_REACH_FILL_LAYER_ID, mapMode === 'supply');
      }
      if (safeHasLayer(m, SUPPLY_REACH_OUTLINE_LAYER_ID)) {
        safeSetLayoutVisibility(m, SUPPLY_REACH_OUTLINE_LAYER_ID, mapMode === 'supply');
      }
      if (safeHasLayer(m, OSID_OPERATIONS_FILL_LAYER_ID)) {
        safeSetLayoutVisibility(m, OSID_OPERATIONS_FILL_LAYER_ID, mapMode === 'operations');
      }
      if (safeHasLayer(m, OSID_DEFENSE_FILL_LAYER_ID)) {
        safeSetLayoutVisibility(m, OSID_DEFENSE_FILL_LAYER_ID, mapMode === 'defense');
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [mapReady, osidPropertiesMap, mapMode, loadedGameState]);

  // Authority / legitimacy map modes: separate political metrics over the same control polygons.
  useEffect(() => {
    const map = mapRef.current;
    const baseGeoJson = osidBaseRef.current;
    if (!mapReady || !map || !baseGeoJson || !loadedGameState) return;

    let cancelled = false;
    const rafId = requestAnimationFrame(() => {
      if (cancelled || !mapRef.current || !loadedGameState) return;
      const metric = mapMode === 'legitimacy' ? 'legitimacy' : 'authority';
      const controlGeoJson = buildControlGeoJSON(baseGeoJson, loadedGameState.controlBySettlement);
      const metricGeoJson = buildPoliticalMetricGeoJSON({
        controlGeoJson,
        metric,
        politicalMetricsByOsid: loadedGameState.politicalMetricsByOsid,
      });
      if (cancelled || !mapRef.current) return;
      const m = mapRef.current;
      safeEnsureSource(m, POLITICAL_METRIC_SOURCE_ID, { type: 'geojson', data: metricGeoJson });
      const source = m.getSource(POLITICAL_METRIC_SOURCE_ID) as GeoJSONSource | undefined;
      if (source) source.setData(metricGeoJson);
      if (!safeHasLayer(m, POLITICAL_METRIC_FILL_LAYER_ID)) {
        m.addLayer(
          {
            id: POLITICAL_METRIC_FILL_LAYER_ID,
            type: 'fill',
            source: POLITICAL_METRIC_SOURCE_ID,
            paint: {
              'fill-color': [
                'interpolate',
                ['linear'],
                ['get', 'metric_value'],
                0, 'rgba(127, 29, 29, 0.62)',
                50, 'rgba(161, 98, 7, 0.46)',
                100, 'rgba(22, 101, 52, 0.52)',
              ],
              'fill-opacity': 1,
            },
            layout: { visibility: mapMode === 'authority' || mapMode === 'legitimacy' ? 'visible' : 'none' },
          },
          OSID_SELECTED_MUN_SIBLING_FILL_LAYER_ID,
        );
      }
      safeSetLayoutVisibility(m, POLITICAL_METRIC_FILL_LAYER_ID, mapMode === 'authority' || mapMode === 'legitimacy');
      safeSetLayoutVisibility(m, 'osid-control-fill', mapMode === 'political');
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [mapReady, mapMode, loadedGameState]);

  // Morale map mode — color front-adjacent OSIDs by sector average morale (continuous gradient).
  useEffect(() => {
    const map = mapRef.current;
    const baseGeoJson = osidBaseRef.current;
    if (!mapReady || !map || !baseGeoJson || !loadedGameState?.corpsFrontSectors || !loadedGameState?.frontEdgesOsid) return;

    let cancelled = false;
    const rafId = requestAnimationFrame(() => {
      if (cancelled || !mapRef.current || !loadedGameState) return;
      const controlGeoJson = buildControlGeoJSON(baseGeoJson, loadedGameState.controlBySettlement);
      const moraleGeoJson = buildMoraleGeoJSON(controlGeoJson, loadedGameState.corpsFrontSectors!, loadedGameState.frontEdgesOsid!);
      if (cancelled || !mapRef.current) return;
      const m = mapRef.current;
      if (!m.getSource(OSID_MORALE_SOURCE_ID)) {
        m.addSource(OSID_MORALE_SOURCE_ID, { type: 'geojson', data: moraleGeoJson });
        m.addLayer(
          {
            id: OSID_MORALE_FILL_LAYER_ID,
            type: 'fill',
            source: OSID_MORALE_SOURCE_ID,
            paint: {
              'fill-color': [
                'interpolate', ['linear'], ['get', 'morale'],
                0, 'rgba(204, 34, 34, 0.45)',
                25, 'rgba(204, 102, 34, 0.40)',
                45, 'rgba(204, 170, 34, 0.35)',
                65, 'rgba(136, 170, 34, 0.35)',
                85, 'rgba(34, 136, 68, 0.35)',
              ],
            },
          },
          OSID_SELECTED_MUN_SIBLING_FILL_LAYER_ID
        );
      } else {
        (m.getSource(OSID_MORALE_SOURCE_ID) as GeoJSONSource).setData(moraleGeoJson);
      }
      safeSetLayoutVisibility(m, OSID_MORALE_FILL_LAYER_ID, mapMode === 'morale');
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [mapReady, mapMode, loadedGameState]);

  // Defense map mode — per-OSID defense strength via Layer A distance-weighted reactive defense.
  useEffect(() => {
    const map = mapRef.current;
    const baseGeoJson = osidBaseRef.current;
    const adjacency = osidAdjacencyRef.current;
    if (!mapReady || !map || !baseGeoJson || !adjacency
      || !loadedGameState?.corpsFrontSectors || !loadedGameState?.frontEdgesOsid
      || !loadedGameState?.formations) return;

    let cancelled = false;
    const rafId = requestAnimationFrame(() => {
      if (cancelled || !mapRef.current || !loadedGameState) return;
      const controlGeoJson = buildControlGeoJSON(baseGeoJson, loadedGameState.controlBySettlement);
      const defenseGeoJson = buildDefenseStrengthGeoJSON(
        controlGeoJson,
        loadedGameState.corpsFrontSectors!,
        loadedGameState.frontEdgesOsid!,
        loadedGameState.formations,
        loadedGameState.controlBySettlement,
        adjacency!,
      );
      if (cancelled || !mapRef.current) return;
      const m = mapRef.current;
      if (!m.getSource(OSID_DEFENSE_SOURCE_ID)) {
        m.addSource(OSID_DEFENSE_SOURCE_ID, { type: 'geojson', data: defenseGeoJson });
        m.addLayer(
          {
            id: OSID_DEFENSE_FILL_LAYER_ID,
            type: 'fill',
            source: OSID_DEFENSE_SOURCE_ID,
            paint: {
              'fill-color': [
                'interpolate',
                ['linear'],
                ['get', 'defense_strength'],
                0.0, 'rgba(204, 34, 34, 0.40)',
                0.3, 'rgba(204, 102, 34, 0.38)',
                0.7, 'rgba(204, 170, 34, 0.35)',
                1.0, 'rgba(136, 170, 34, 0.35)',
                1.5, 'rgba(68, 170, 68, 0.35)',
                2.0, 'rgba(34, 136, 68, 0.35)',
              ],
              'fill-opacity': 1,
            },
          },
          OSID_SELECTED_MUN_SIBLING_FILL_LAYER_ID
        );
      } else {
        (m.getSource(OSID_DEFENSE_SOURCE_ID) as GeoJSONSource).setData(defenseGeoJson);
      }
      safeSetLayoutVisibility(m, OSID_DEFENSE_FILL_LAYER_ID, mapMode === 'defense');
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [mapReady, mapMode, loadedGameState]);

  // Operations map mode - show current weight of effort by sector frontage.
  useEffect(() => {
    const map = mapRef.current;
    const baseGeoJson = osidBaseRef.current;
    if (!mapReady || !map || !baseGeoJson || !loadedGameState?.corpsFrontSectors || !loadedGameState?.frontEdgesOsid) return;

    let cancelled = false;
    const rafId = requestAnimationFrame(() => {
      if (cancelled || !mapRef.current || !loadedGameState) return;
      const controlGeoJson = buildControlGeoJSON(baseGeoJson, loadedGameState.controlBySettlement);
      const operationsGeoJson = buildOperationalWeightGeoJSON(
        controlGeoJson,
        loadedGameState.corpsFrontSectors ?? [],
        loadedGameState.frontEdgesOsid ?? [],
        loadedGameState.operations
      );
      if (cancelled || !mapRef.current) return;
      const m = mapRef.current;
      if (!m.getSource(OSID_OPERATIONS_SOURCE_ID)) {
        m.addSource(OSID_OPERATIONS_SOURCE_ID, { type: 'geojson', data: operationsGeoJson });
        m.addLayer(
          {
            id: OSID_OPERATIONS_FILL_LAYER_ID,
            type: 'fill',
            source: OSID_OPERATIONS_SOURCE_ID,
            paint: {
              'fill-color': [
                'match',
                ['get', 'effort_class'],
                'holding', 'rgba(80, 124, 173, 0.30)',
                'supporting', 'rgba(209, 139, 53, 0.34)',
                'main', 'rgba(191, 57, 43, 0.40)',
                'rgba(80, 80, 80, 0.10)',
              ],
              'fill-opacity': 1,
            },
          },
          OSID_SELECTED_MUN_SIBLING_FILL_LAYER_ID
        );
      } else {
        (m.getSource(OSID_OPERATIONS_SOURCE_ID) as GeoJSONSource).setData(operationsGeoJson);
      }
      safeSetLayoutVisibility(m, OSID_OPERATIONS_FILL_LAYER_ID, mapMode === 'operations');
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [mapReady, mapMode, loadedGameState]);

  // Casualties map mode — color OSIDs by cumulative recent battle casualties (continuous gradient).
  useEffect(() => {
    const map = mapRef.current;
    const baseGeoJson = osidBaseRef.current;
    if (!mapReady || !map || !baseGeoJson || !loadedGameState?.formations) return;

    let cancelled = false;
    const rafId = requestAnimationFrame(() => {
      if (cancelled || !mapRef.current || !loadedGameState) return;
      const controlGeoJson = buildControlGeoJSON(baseGeoJson, loadedGameState.controlBySettlement);
      const casualtiesGeoJson = buildCasualtiesGeoJSON(controlGeoJson, loadedGameState.formations, loadedGameState.turn ?? 0);
      if (cancelled || !mapRef.current) return;
      const m = mapRef.current;
      if (!m.getSource(OSID_CASUALTIES_SOURCE_ID)) {
        m.addSource(OSID_CASUALTIES_SOURCE_ID, { type: 'geojson', data: casualtiesGeoJson });
        m.addLayer(
          {
            id: OSID_CASUALTIES_FILL_LAYER_ID,
            type: 'fill',
            source: OSID_CASUALTIES_SOURCE_ID,
            paint: {
              'fill-color': [
                'interpolate', ['linear'], ['get', 'casualties_normalized'],
                0, 'rgba(60, 60, 70, 0.05)',
                0.15, 'rgba(204, 170, 34, 0.25)',
                0.4, 'rgba(220, 130, 40, 0.35)',
                0.7, 'rgba(220, 60, 60, 0.45)',
                1.0, 'rgba(140, 20, 20, 0.55)',
              ],
            },
          },
          OSID_SELECTED_MUN_SIBLING_FILL_LAYER_ID
        );
      } else {
        (m.getSource(OSID_CASUALTIES_SOURCE_ID) as GeoJSONSource).setData(casualtiesGeoJson);
      }
      safeSetLayoutVisibility(m, OSID_CASUALTIES_FILL_LAYER_ID, mapMode === 'casualties');
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [mapReady, mapMode, loadedGameState]);

  // Supply map mode — color OSIDs by faction supply pressure (adequate/strained/critical).
  useEffect(() => {
    const map = mapRef.current;
    const baseGeoJson = osidBaseRef.current;
    if (!mapReady || !map || !baseGeoJson || !loadedGameState) return;

    let cancelled = false;
    const rafId = requestAnimationFrame(() => {
      if (cancelled || !mapRef.current || !loadedGameState) return;
      const controlGeoJson = buildControlGeoJSON(baseGeoJson, loadedGameState.controlBySettlement);
      const supplyGeoJson = buildSupplyGeoJSON(
        controlGeoJson,
        loadedGameState.controlBySettlement,
        loadedGameState.factionReserves,
        loadedGameState.warPhaseSupplyPressure,
        loadedGameState.warPhaseSupplyCondition
      );
      const supplyReachGeoJson = buildSupplyReachGeoJSON({
        controlGeoJson,
        supplyStateByOsid: loadedGameState.supplyStateByOsid,
      });
      if (cancelled || !mapRef.current) return;
      const m = mapRef.current;
      if (!m.getSource(OSID_SUPPLY_SOURCE_ID)) {
        m.addSource(OSID_SUPPLY_SOURCE_ID, { type: 'geojson', data: supplyGeoJson });
        m.addLayer(
          {
            id: OSID_SUPPLY_FILL_LAYER_ID,
            type: 'fill',
            source: OSID_SUPPLY_SOURCE_ID,
            paint: {
              'fill-color': [
                'match',
                ['get', 'supply_class'],
                'adequate', 'rgba(74, 222, 128, 0.45)',
                'strained', 'rgba(251, 191, 36, 0.50)',
                'critical', 'rgba(248, 113, 113, 0.60)',
                'rgba(156, 163, 175, 0.35)',
              ],
              'fill-opacity': 1,
            },
          },
          OSID_SELECTED_MUN_SIBLING_FILL_LAYER_ID
        );
      } else {
        (m.getSource(OSID_SUPPLY_SOURCE_ID) as GeoJSONSource).setData(supplyGeoJson);
      }
      safeEnsureSource(m, SUPPLY_REACH_SOURCE_ID, { type: 'geojson', data: supplyReachGeoJson });
      const reachSource = m.getSource(SUPPLY_REACH_SOURCE_ID) as GeoJSONSource | undefined;
      if (reachSource) reachSource.setData(supplyReachGeoJson);
      if (!safeHasLayer(m, SUPPLY_REACH_FILL_LAYER_ID)) {
        m.addLayer(
          {
            id: SUPPLY_REACH_FILL_LAYER_ID,
            type: 'fill',
            source: SUPPLY_REACH_SOURCE_ID,
            paint: {
              'fill-color': [
                'match',
                ['get', 'supply_reach_class'],
                'adequate', 'rgba(42, 154, 96, 0.12)',
                'strained', 'rgba(245, 158, 11, 0.28)',
                'critical', 'rgba(220, 38, 38, 0.40)',
                'rgba(156, 163, 175, 0.10)',
              ],
              'fill-opacity': [
                'interpolate',
                ['linear'],
                ['get', 'supply_reach_score'],
                0.15, 0.75,
                1.0, 0.35,
              ],
            },
            layout: { visibility: mapMode === 'supply' ? 'visible' : 'none' },
          },
          OSID_SELECTED_MUN_SIBLING_FILL_LAYER_ID
        );
      }
      if (!safeHasLayer(m, SUPPLY_REACH_OUTLINE_LAYER_ID)) {
        m.addLayer(
          {
            id: SUPPLY_REACH_OUTLINE_LAYER_ID,
            type: 'line',
            source: SUPPLY_REACH_SOURCE_ID,
            filter: ['!=', ['get', 'isolated'], true],
            paint: {
              'line-color': [
                'match',
                ['get', 'supply_reach_class'],
                'adequate', 'rgba(74, 222, 128, 0.35)',
                'strained', 'rgba(251, 191, 36, 0.70)',
                'critical', 'rgba(248, 113, 113, 0.88)',
                'rgba(156, 163, 175, 0.25)',
              ],
              'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                7, 0.3,
                10, 0.8,
                13, 1.7,
              ],
              'line-dasharray': [6, 3],
            },
            layout: { visibility: mapMode === 'supply' ? 'visible' : 'none' },
          },
          OSID_SELECTED_MUN_SIBLING_FILL_LAYER_ID
        );
      }
      if (!safeHasLayer(m, SUPPLY_REACH_ISOLATED_OUTLINE_LAYER_ID)) {
        m.addLayer(
          {
            id: SUPPLY_REACH_ISOLATED_OUTLINE_LAYER_ID,
            type: 'line',
            source: SUPPLY_REACH_SOURCE_ID,
            filter: ['==', ['get', 'isolated'], true],
            paint: {
              'line-color': 'rgba(248, 113, 113, 0.88)',
              'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                7, 0.4,
                10, 1.0,
                13, 2.0,
              ],
              'line-dasharray': [1.5, 1.5],
            },
            layout: { visibility: mapMode === 'supply' ? 'visible' : 'none' },
          },
          OSID_SELECTED_MUN_SIBLING_FILL_LAYER_ID
        );
      }
      safeSetLayoutVisibility(m, OSID_SUPPLY_FILL_LAYER_ID, mapMode === 'supply');
      safeSetLayoutVisibility(m, SUPPLY_REACH_FILL_LAYER_ID, mapMode === 'supply');
      safeSetLayoutVisibility(m, SUPPLY_REACH_OUTLINE_LAYER_ID, mapMode === 'supply');
      safeSetLayoutVisibility(m, SUPPLY_REACH_ISOLATED_OUTLINE_LAYER_ID, mapMode === 'supply');
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [mapReady, mapMode, loadedGameState]);

  // Phase C2: apply layer visibility from store (after style loaded; re-apply when toggles change)
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    const applyVisibility = () => {
      let allExist = true;
      FRONT_LAYER_IDS.forEach((id) => {
        if (!safeSetLayoutVisibility(map, id, effectiveFrontsVisible)) allExist = false;
      });
      if (!safeSetLayoutVisibility(
        map,
        FORMATION_MARKERS_LAYER_ID,
        DEFAULT_DECK_LAYER_CAPABILITIES.deckFormationCounters ? false : formationsVisible,
      )) allExist = false;
      const zoom = map.getZoom();
      const showFormationLabels =
        !DEFAULT_DECK_LAYER_CAPABILITIES.deckFormationCounters &&
        labelsVisible &&
        formationsVisible &&
        zoom >= FORMATION_LABELS_MIN_ZOOM;
      if (!safeSetLayoutVisibility(map, FORMATION_LABELS_LAYER_ID, showFormationLabels)) allExist = false;
      if (safeHasLayer(map, FORMATION_HOME_BADGE_LAYER_ID)) {
        safeSetLayoutVisibility(map, FORMATION_HOME_BADGE_LAYER_ID, formationsVisible);
      }
      // Map mode visibility: dedicated overlay per mode.
      const showPolitical = mapMode === 'political';
      if (!safeSetLayoutVisibility(map, 'osid-control-fill', showPolitical)) allExist = false;
      if (safeHasLayer(map, OSID_ETHNIC_FILL_LAYER_ID) && !safeSetLayoutVisibility(map, OSID_ETHNIC_FILL_LAYER_ID, mapMode === 'ethnic')) allExist = false;
      if (safeHasLayer(map, CONTESTED_BANDS_FILL_LAYER_ID) && !safeSetLayoutVisibility(map, CONTESTED_BANDS_FILL_LAYER_ID, showPolitical || mapMode === 'ethnic')) allExist = false;
      if (safeHasLayer(map, CONTESTED_BANDS_OUTLINE_LAYER_ID) && !safeSetLayoutVisibility(map, CONTESTED_BANDS_OUTLINE_LAYER_ID, showPolitical || mapMode === 'ethnic')) allExist = false;
      if (safeHasLayer(map, OSID_MORALE_FILL_LAYER_ID) && !safeSetLayoutVisibility(map, OSID_MORALE_FILL_LAYER_ID, mapMode === 'morale')) allExist = false;
      if (safeHasLayer(map, OSID_CASUALTIES_FILL_LAYER_ID) && !safeSetLayoutVisibility(map, OSID_CASUALTIES_FILL_LAYER_ID, mapMode === 'casualties')) allExist = false;
      if (safeHasLayer(map, OSID_SUPPLY_FILL_LAYER_ID) && !safeSetLayoutVisibility(map, OSID_SUPPLY_FILL_LAYER_ID, mapMode === 'supply')) allExist = false;
      if (safeHasLayer(map, POLITICAL_METRIC_FILL_LAYER_ID) && !safeSetLayoutVisibility(map, POLITICAL_METRIC_FILL_LAYER_ID, mapMode === 'authority' || mapMode === 'legitimacy')) allExist = false;
      if (safeHasLayer(map, SUPPLY_REACH_FILL_LAYER_ID) && !safeSetLayoutVisibility(map, SUPPLY_REACH_FILL_LAYER_ID, mapMode === 'supply')) allExist = false;
      if (safeHasLayer(map, SUPPLY_REACH_OUTLINE_LAYER_ID) && !safeSetLayoutVisibility(map, SUPPLY_REACH_OUTLINE_LAYER_ID, mapMode === 'supply')) allExist = false;
      if (safeHasLayer(map, SUPPLY_REACH_ISOLATED_OUTLINE_LAYER_ID) && !safeSetLayoutVisibility(map, SUPPLY_REACH_ISOLATED_OUTLINE_LAYER_ID, mapMode === 'supply')) allExist = false;
      if (safeHasLayer(map, OSID_OPERATIONS_FILL_LAYER_ID) && !safeSetLayoutVisibility(map, OSID_OPERATIONS_FILL_LAYER_ID, mapMode === 'operations')) allExist = false;
      // Operation arrows: only visible in operations map mode
      const showOps = mapMode === 'operations';
      [OP_ARROWS_GLOW_LAYER_ID, OP_ARROWS_LINE_LAYER_ID, OP_ARROWS_HEAD_LAYER_ID, OP_ARROWS_ORIGIN_LAYER_ID].forEach(id => {
        if (safeHasLayer(map, id)) safeSetLayoutVisibility(map, id, showOps);
      });
      return allExist;
    };

    map.on('zoomend', applyVisibility);

    if (applyVisibility()) {
      return () => {
        map.off('zoomend', applyVisibility);
      };
    }

    // Style may not be loaded yet; wait for load and retry once after a short delay (in case load already fired)
    const onLoad = () => {
      applyVisibility();
      map.off('load', onLoad);
    };
    map.once('load', onLoad);
    const retryId = setTimeout(() => {
      if (applyVisibility()) map.off('load', onLoad);
    }, 150);

    return () => {
      map.off('zoomend', applyVisibility);
      map.off('load', onLoad);
      clearTimeout(retryId);
    };
  }, [mapReady, frontsVisible, effectiveFrontsVisible, formationsVisible, labelsVisible, mapMode, devMode, sectorsVisible]);

  // Phase 5 toggles: fog / battles / OSID outline — reactive visibility when store changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const { player_faction, fogOfWar } = useGameStore.getState().loadedGameState ?? {};
    if (safeHasLayer(map, FOG_FILL_LAYER_ID)) {
      safeSetLayoutVisibility(map, FOG_FILL_LAYER_ID, fogVisible && !!player_faction && !!fogOfWar);
    }
    if (safeHasLayer(map, BATTLE_MARKERS_LAYER_ID)) {
      safeSetLayoutVisibility(map, BATTLE_MARKERS_LAYER_ID, battlesVisible);
    }
    if (safeHasLayer(map, OSID_CONTROL_OUTLINE_LAYER_ID)) {
      safeSetLayoutVisibility(map, OSID_CONTROL_OUTLINE_LAYER_ID, municipalityBordersVisible);
    }
    if (safeHasLayer(map, MUN_BORDERS_LAYER_ID)) {
      safeSetLayoutVisibility(map, MUN_BORDERS_LAYER_ID, municipalityBordersVisible);
    }
  }, [mapReady, fogVisible, battlesVisible, municipalityBordersVisible]);

  useEffect(() => {
    const map = mapRef.current;
    const base = osidBaseRef.current;
    if (!mapReady || !map || !base) return;
    const state = useGameStore.getState().loadedGameState;
    if (!state?.player_faction || !state?.fogOfWar) return;
    const fogSource = map.getSource(FOG_OVERLAY_SOURCE_ID) as GeoJSONSource | undefined;
    if (!fogSource) return;
    fogSource.setData(
      buildFogOfWarGeoJSON(
        base,
        state.controlBySettlement,
        state.player_faction,
        state.fogOfWar,
        state.frontEdgesOsid,
      ),
    );
  }, [
    mapReady,
    loadedGameState?.player_faction,
    loadedGameState?.fogOfWar,
    loadedGameState?.frontEdgesOsid,
    loadedGameState?.controlBySettlement,
  ]);

  // Ghost Map toggle: rebuild Deck.gl layers when ghostMapVisible changes
  const ghostMapVisible = useGameStore((s) => s.ghostMapVisible);
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !deckOverlayRef.current || !lastFormationsGeoJsonRef.current) return;
    const { formationsVisible: fVis, labelsVisible: lVis, loadedGameState: gs } = useGameStore.getState();
    applyDeckLayerSelection({
      formationsGeoJson: lastFormationsGeoJsonRef.current,
      labelsVisible: lVis,
      formationsVisible: fVis,
      zoom: map.getZoom(),
      loadedGameState: gs,
      ghostMapVisible,
      ghostMapData: ghostMapDataRef.current ?? undefined,
      selectedFormationId,
      selectedCorpsId,
      selectedCorpsFrontSectorId,
      hoveredSectorId,
      hoveredCorpsId,
    });
  }, [mapReady, ghostMapVisible, selectedFormationId, selectedCorpsId, selectedCorpsFrontSectorId, hoveredSectorId, hoveredCorpsId]);

  useEffect(() => {
    const map = mapRef.current;
    const lookup = osidCentroidsRef.current;
    if (!mapReady || !map || lookup.size === 0) return;

    // When corps is selected from sidebar, zoom to fit all corps sectors.
    if (selectedCorpsId && loadedGameState?.corpsFrontSectors && loadedGameState?.frontEdgesOsid) {
      const corpsPanKey = `corps:${selectedCorpsId}`;
      if (lastPanTargetRef.current !== corpsPanKey) {
        const corpsSectors = loadedGameState.corpsFrontSectors.filter(s => s.corps_id === selectedCorpsId);
        const coords: [number, number][] = [];
        for (const sector of corpsSectors) {
          for (const osid of collectSectorFriendlyOsids(sector, loadedGameState.frontEdgesOsid)) {
            const c = lookup.get(osid);
            if (c) coords.push(c);
          }
        }
        if (coords.length > 0) {
          lastPanTargetRef.current = corpsPanKey;
          const lngs = coords.map(c => c[0]);
          const lats = coords.map(c => c[1]);
          map.fitBounds(
            [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
            { padding: 80, maxZoom: 9, duration: 450 }
          );
        }
      }
      return;
    }

    const sectorJustChanged = selectedCorpsFrontSectorId !== prevSectorIdRef.current;
    prevSectorIdRef.current = selectedCorpsFrontSectorId;

    // When sector just changed from Command/sidebar (not from map click), zoom to fit sector.
    const fromMap = sectorSelectedFromMapRef.current;
    sectorSelectedFromMapRef.current = false;
    if (sectorJustChanged && !fromMap && selectedCorpsFrontSectorId && loadedGameState?.corpsFrontSectors && loadedGameState?.frontEdgesOsid) {
      const sector = loadedGameState.corpsFrontSectors.find(s => s.sector_id === selectedCorpsFrontSectorId);
      if (sector) {
        const friendlyOsids = collectSectorFriendlyOsids(sector, loadedGameState.frontEdgesOsid);
        const coords: [number, number][] = [];
        for (const osid of friendlyOsids) {
          const c = lookup.get(osid);
          if (c) coords.push(c);
        }
        if (coords.length > 0) {
          const sectorPanKey = `sector:${selectedCorpsFrontSectorId}`;
          if (lastPanTargetRef.current !== sectorPanKey) {
            lastPanTargetRef.current = sectorPanKey;
            const lngs = coords.map(c => c[0]);
            const lats = coords.map(c => c[1]);
            const minLng = Math.min(...lngs);
            const maxLng = Math.max(...lngs);
            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);
            map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 80, maxZoom: 10, duration: 450 });
          }
        }
      }
      return;
    }

    // Prefer pan to formation or settlement when one is selected.
    let targetOsid: string | null = null;
    if (selectedFormationId && loadedGameState) {
      const formation = loadedGameState.formations.find((f) => f.id === selectedFormationId);
      if (formation) {
        targetOsid = resolveFormationLocationOsid(formation, lookup) ?? null;
      }
    }
    if (!targetOsid && selectedOsid) targetOsid = selectedOsid;

    if (targetOsid) {
      const center = lookup.get(targetOsid);
      if (center && lastPanTargetRef.current !== targetOsid) {
        lastPanTargetRef.current = targetOsid;
        map.easeTo({ center, duration: 450, essential: true });
      }
      return;
    }

    lastPanTargetRef.current = null;
  }, [loadedGameState, mapReady, selectedFormationId, selectedOsid, selectedCorpsFrontSectorId, selectedCorpsId]);

  // OSID selection: dark fill on picked settlement, faint fill on same-mun siblings, adm3 outline, bright rim
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const noOsid: maplibregl.FilterSpecification = ['==', ['get', 'osid'], '__none__'];
    const noMun: maplibregl.FilterSpecification = ['==', ['get', 'mun1990_id'], MUN_BORDER_SELECTION_FILTER_NONE];

    const apply = (): boolean => {
      if (!safeHasLayer(map, 'osid-selected-outline')) return false;

      const clearAll = () => {
        map.setFilter('osid-selected-outline', noOsid);
        if (safeHasLayer(map, OSID_SELECTED_FILL_LAYER_ID)) map.setFilter(OSID_SELECTED_FILL_LAYER_ID, noOsid);
        if (safeHasLayer(map, OSID_SELECTED_MUN_SIBLING_FILL_LAYER_ID)) {
          map.setFilter(OSID_SELECTED_MUN_SIBLING_FILL_LAYER_ID, noOsid);
        }
        if (safeHasLayer(map, MUN_BORDERS_SELECTION_LAYER_ID)) {
          map.setFilter(MUN_BORDERS_SELECTION_LAYER_ID, noMun);
          safeSetLayoutVisibility(map, MUN_BORDERS_SELECTION_LAYER_ID, false);
        }
      };

      if (!selectedOsid) {
        try {
          clearAll();
        } catch (e) {
          console.error('[MapContainer] selection highlight clear failed', e);
        }
        return true;
      }

      const munId =
        osidPropertiesMap && typeof osidPropertiesMap[selectedOsid]?.mun1990_id === 'string'
          ? (osidPropertiesMap[selectedOsid].mun1990_id as string)
          : '';

      try {
        map.setFilter('osid-selected-outline', ['==', ['get', 'osid'], selectedOsid]);
        if (safeHasLayer(map, OSID_SELECTED_FILL_LAYER_ID)) {
          map.setFilter(OSID_SELECTED_FILL_LAYER_ID, ['==', ['get', 'osid'], selectedOsid]);
        }
        if (safeHasLayer(map, OSID_SELECTED_MUN_SIBLING_FILL_LAYER_ID)) {
          if (munId) {
            map.setFilter(OSID_SELECTED_MUN_SIBLING_FILL_LAYER_ID, [
              'all',
              ['==', ['get', 'mun1990_id'], munId],
              ['!=', ['get', 'osid'], selectedOsid],
            ] as maplibregl.FilterSpecification);
          } else {
            map.setFilter(OSID_SELECTED_MUN_SIBLING_FILL_LAYER_ID, noOsid);
          }
        }
        if (safeHasLayer(map, MUN_BORDERS_SELECTION_LAYER_ID)) {
          if (munId) {
            map.setFilter(MUN_BORDERS_SELECTION_LAYER_ID, ['==', ['get', 'mun1990_id'], munId]);
            safeSetLayoutVisibility(map, MUN_BORDERS_SELECTION_LAYER_ID, true);
          } else {
            map.setFilter(MUN_BORDERS_SELECTION_LAYER_ID, noMun);
            safeSetLayoutVisibility(map, MUN_BORDERS_SELECTION_LAYER_ID, false);
          }
        }
      } catch (e) {
        console.error('[MapContainer] OSID selection highlight failed', e);
      }
      return true;
    };

    if (apply()) return;
    const onLoad = () => {
      apply();
      map.off('load', onLoad);
    };
    map.once('load', onLoad);
    const retryId = setTimeout(() => {
      apply();
      map.off('load', onLoad);
    }, 200);
    return () => {
      map.off('load', onLoad);
      clearTimeout(retryId);
    };
  }, [selectedOsid, mapReady, osidPropertiesMap]);

  // R12: ORBAT-map sync — flash an OSID polygon briefly when flashOsid is set
  const flashOsid = useGameStore((s) => s.flashOsid);
  const setFlashOsid = useGameStore((s) => s.setFlashOsid);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !flashOsid) return;

    // Use the existing osid-selected-outline layer to flash the OSID
    const FLASH_LAYER = 'osid-flash-highlight';
    try {
      // Create a transient fill layer for the flash if it doesn't exist
      if (!map.getLayer(FLASH_LAYER)) {
        map.addLayer({
          id: FLASH_LAYER,
          type: 'fill',
          source: 'osid-control',
          paint: {
            'fill-color': '#fbbf24',
            'fill-opacity': 0,
          },
          filter: ['==', ['get', 'osid'], '__none__'],
        });
      }
      // Set filter to target the flash OSID
      map.setFilter(FLASH_LAYER, ['==', ['get', 'osid'], flashOsid]);
      // Animate: fade in then out
      map.setPaintProperty(FLASH_LAYER, 'fill-opacity', 0.5);
      const fadeOut = setTimeout(() => {
        try {
          if (map.getLayer(FLASH_LAYER)) {
            map.setPaintProperty(FLASH_LAYER, 'fill-opacity', 0.25);
          }
        } catch { /* layer may be gone */ }
      }, 200);
      const clear = setTimeout(() => {
        try {
          if (map.getLayer(FLASH_LAYER)) {
            map.setPaintProperty(FLASH_LAYER, 'fill-opacity', 0);
            map.setFilter(FLASH_LAYER, ['==', ['get', 'osid'], '__none__']);
          }
        } catch { /* layer may be gone */ }
        setFlashOsid(null);
      }, 600);

      return () => {
        clearTimeout(fadeOut);
        clearTimeout(clear);
      };
    } catch { /* style not ready */ }
  }, [flashOsid, mapReady, setFlashOsid]);

  // Pulse animation for staged orders and battle markers
  useEffect(() => {
    if (!shouldAnimateMapPulse || !mapRef.current) return;
    const map = mapRef.current;
    let frameId: number;
    let lastTime = 0;
    const animate = (time: number) => {
      // Throttle to save CPU, ~15fps is fine for pulsing
      if (time - lastTime > 64) {
        lastTime = time;
        const opacity = Math.sin(time / 200) * 0.3 + 0.6;
        try {
          if (map.getLayer('attack-arrows-staged')) {
            map.setPaintProperty('attack-arrows-staged', 'line-opacity', opacity);
            if (map.getLayer('attack-arrows-glow-staged')) {
              map.setPaintProperty('attack-arrows-glow-staged', 'line-opacity', opacity * 0.6);
            }
            if (map.getLayer('attack-arrows-heads-staged')) {
              map.setPaintProperty('attack-arrows-heads-staged', 'fill-opacity', opacity);
            }
          }
          if (map.getLayer('movement-arrows-staged')) {
            map.setPaintProperty('movement-arrows-staged', 'line-opacity', opacity);
            if (map.getLayer('movement-arrows-heads-staged')) {
              map.setPaintProperty('movement-arrows-heads-staged', 'fill-opacity', opacity);
            }
          }
          if (map.getLayer(GHOST_PATH_LAYER_ID)) {
            map.setPaintProperty(GHOST_PATH_LAYER_ID, 'line-opacity', (Math.sin(time / 250) * 0.2 + 0.4));
          }
          if (map.getLayer(BATTLE_MARKERS_LAYER_ID)) {
            const pulse = Math.sin(time / 300) * 0.15 + 0.85;
            map.setPaintProperty(
              BATTLE_MARKERS_LAYER_ID,
              'circle-opacity',
              [
                'interpolate',
                ['linear'],
                ['get', 'age'],
                0, pulse,
                1, pulse * 0.7,
                2, pulse * 0.4,
              ]
            );
          }
        } catch (e) {
          // ignore if style not loaded yet
        }
      }
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [shouldAnimateMapPulse]);

  // LANE-NIGHTSHIFT-V093-A11Y-LANE-B: keyboard pan/zoom handler for the
  // tactical map canvas. Arrow keys pan, +/- zoom, Home/End reset to the
  // canonical Bosnia view. Pure DOM event → MapLibre method dispatch; no
  // store touch, no sim path. Faction-agnostic.
  //
  // Pan amount is a fixed-pixel offset (deterministic; no per-frame timing).
  // MapLibre's panBy / zoomIn / zoomOut / jumpTo are deterministic for given
  // inputs. Keyboard events only fire when the <main> wrapper has focus
  // (tabIndex={0}), so they do not collide with global shortcuts when
  // focus is elsewhere (Army HQ tabs, modals, sidebar).
  const handleFallbackContextMenu = (e: React.MouseEvent<HTMLElement>) => {
    if (e.defaultPrevented) return;
    const target = e.target instanceof Element ? e.target : null;
    if (target?.closest('button, a, input, textarea, select, [role="button"], [role="dialog"]')) return;
    e.preventDefault();
    setContextMenu({
      type: 'empty',
      properties: null,
      position: { x: e.clientX, y: e.clientY },
    });
  };

  const handleMapKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    const map = mapRef.current;
    if (!map) return;
    const PAN_PX = 100;
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        map.panBy([0, -PAN_PX]);
        break;
      case 'ArrowDown':
        e.preventDefault();
        map.panBy([0, PAN_PX]);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        map.panBy([-PAN_PX, 0]);
        break;
      case 'ArrowRight':
        e.preventDefault();
        map.panBy([PAN_PX, 0]);
        break;
      case '+':
      case '=':
        e.preventDefault();
        map.zoomIn();
        break;
      case '-':
      case '_':
        e.preventDefault();
        map.zoomOut();
        break;
      case 'Home':
      case 'End':
        e.preventDefault();
        map.jumpTo({ center: BOSNIA_CENTER, zoom: DEFAULT_ZOOM, pitch: TACTICAL_MAP_PITCH_DEGREES });
        break;
      default:
        break;
    }
  };

  return (
    // LANE-NIGHTSHIFT-V093-A11Y-LANE-B: <main> landmark + tutorial spotlight
    // anchor on the same outer wrapper. The element receives keyboard focus
    // (tabIndex={0}) and routes pan/zoom keys to the MapLibre instance via
    // handleMapKeyDown above. id="main-content" reserves the skip-link target
    // for the sibling A11y skip-link lane. Faction-agnostic; UI-only.
    <main
      role="main"
      id="main-content"
      data-testid="tactical-map"
      data-battle-marker-count={battleMarkerProbe.count}
      data-battle-marker-osids={battleMarkerProbe.osids}
      data-tutorial-step="map-container"
      aria-label={t('map.aria.tacticalMap')}
      tabIndex={0}
      onContextMenu={handleFallbackContextMenu}
      onKeyDown={handleMapKeyDown}
      className="absolute inset-0 outline-none"
    >
      <div ref={containerRef} className="absolute inset-0" style={{ filter: 'sepia(0.08) saturate(0.95)' }} />

      {expandedStackOsid && overlayAnchor && loadedGameState && (
        <StackExpansionOverlay
          osid={expandedStackOsid}
          anchorX={overlayAnchor.x}
          anchorY={overlayAnchor.y}
          formations={loadedGameState.formations.filter(f =>
            f.kind !== 'corps' && f.kind !== 'corps_asset' && f.kind !== 'army_hq' &&
            resolveFormationLocationOsid(f, osidCentroidsRef.current) === expandedStackOsid
          )}
          onClose={() => {
            setExpandedStackOsid(null);
            setOverlayAnchor(null);
          }}
          onSelect={(id) => {
            inspectFormationFromMap(id);
            setExpandedStackOsid(null);
            setOverlayAnchor(null);
          }}
        />
      )}

      {contextMenu && contextMenuItems.length > 0 && (
        <RadialMenu
          items={contextMenuItems}
          position={contextMenu.position}
          targetLabel={
            contextMenu.type === 'formation' ? (contextMenu.properties?.name as string)?.split(' ').pop() :
              contextMenu.type === 'osid' ? getOsidDisplayName(contextMenu.properties?.osid as string, osidDisplayNames) :
                contextMenu.type === 'front' ? t('map.context.front') : ''
          }
          onClose={() => setContextMenu(null)}
        />
      )}
    </main>
  );
}
