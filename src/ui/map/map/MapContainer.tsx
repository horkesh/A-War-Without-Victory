import { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import type { GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import type { LoadedGameState } from '../data/types';
import { useMapInteractions } from './useMapInteractions';
import { useGameStore } from '../store/gameStore';
import { collectSectorFriendlyOsids, buildOsidToSectorMap, getSectorIdForFormation } from '../utils/sectorUtils';
import { buildCorpsColorMap } from './builders/buildCorpsFrontLinesGeoJSON';
import { buildOsidDisplayNameMap } from '../utils/osidDisplayName';
import { loadOperationalPoliticalControl, loadOperationalSettlements, loadOsidAdjacency } from '../data/DataLoader';
import { buildControlGeoJSON } from './builders/buildControlGeoJSON';
import { buildMoraleGeoJSON } from './builders/buildMoraleGeoJSON';
import { buildCasualtiesGeoJSON } from './builders/buildCasualtiesGeoJSON';
import { buildDefenseStrengthGeoJSON } from './builders/buildDefenseStrengthGeoJSON';
import { buildEthnicGeoJSON } from './builders/buildEthnicGeoJSON';
import { buildSupplyGeoJSON } from './builders/buildSupplyGeoJSON';
import { buildOperationalWeightGeoJSON } from './builders/buildOperationalWeightGeoJSON';
import { buildFrontLinesGeoJSON } from './builders/buildFrontLinesGeoJSON';
import { buildFrontEdgesHoverGeoJSON } from './builders/buildFrontEdgesHoverGeoJSON';
import { buildCorpsFrontLinesGeoJSON, buildCorpsColorExpression } from './builders/buildCorpsFrontLinesGeoJSON';
import { buildSectorDemarcationGeoJSON } from './builders/buildSectorDemarcationGeoJSON';
import { buildOperationTargetPointsGeoJSON, buildOperationTargetCrosshairsGeoJSON } from './builders/buildOperationTargetIconsGeoJSON';
import { buildOperationArrowsGeoJSON } from './builders/buildOperationArrowsGeoJSON';
import { buildFormationsGeoJSON } from './builders/buildFormationsGeoJSON';
import { buildOrderArrowsGeoJSON } from './builders/buildOrderArrowsGeoJSON';
import { buildOsidCentroidLookup } from './builders/geojsonLookup';
import { resolveFormationLocationOsid } from './builders/resolveFormationLocationOsid';
import { ensureFormationIcons, ensureTacticalIcons } from './formationIcons';
import { buildFogOfWarGeoJSON } from './builders/buildFogOfWarGeoJSON';
import { buildEnclaveGeoJSON } from './builders/buildEnclaveGeoJSON';
import { buildBattleMarkersGeoJSON } from './builders/buildBattleMarkersGeoJSON';
import { buildStrategicPointGeoJSON } from './builders/buildStrategicPointGeoJSON';
import { StackExpansionOverlay } from '../components/StackExpansionOverlay';
import { rewritePmtilesUrls } from './rewritePmtilesUrls';
import { useIPC } from '../desktop/useIPC';
import { stageMoveOrderFromOsid, stageAssignBrigadeToSectorAction } from '../desktop/orderActions';
import styleJson from './awwv_map_style.json';

const BOSNIA_CENTER: [number, number] = [17.7, 43.87];
const DEFAULT_ZOOM = 8;
const SIDEBAR_HOVER_LAYER_ID = 'sidebar-hover-outline';
const EMPTY_GEOJSON: FeatureCollection = { type: 'FeatureCollection', features: [] };

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
  spec: any
) {
  if (!map.getSource(id)) {
    map.addSource(id, spec);
  }
}

function safeEnsureLayer(
  map: maplibregl.Map,
  spec: any,
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
const OSID_OPERATIONS_FILL_LAYER_ID = 'osid-operations-fill';
const OSID_OPERATIONS_SOURCE_ID = 'osid-operations';
const OSID_DEFENSE_FILL_LAYER_ID = 'osid-defense-fill';
const OSID_DEFENSE_SOURCE_ID = 'osid-defense';
/** Layer ID for formation markers (formationsVisible). */
const FORMATION_MARKERS_LAYER_ID = 'formation-markers';
const FORMATION_WHITE_OVERLAY_LAYER_ID = 'formation-white-pulse-overlay';
/** Layer ID for formation labels (labelsVisible). */
const FORMATION_LABELS_LAYER_ID = 'formation-labels';
/** Layer ID for home-defense badge on formations at their home municipality. */
const FORMATION_HOME_BADGE_LAYER_ID = 'formation-home-badge';
import { buildOperationalHeatmapGeoJSON } from './builders/buildOperationalHeatmapGeoJSON';
const FRONT_EDGES_HOVER_SOURCE_ID = 'front-edges-hover';
const FRONT_EDGES_HOVER_POS_LAYER_ID = 'front-edges-hover-pos';
const FRONT_EDGES_HOVER_NEG_LAYER_ID = 'front-edges-hover-neg';
const FRONT_EDGES_HIGHLIGHT_POS_LAYER_ID = 'front-edges-highlight-pos';
const FRONT_EDGES_HIGHLIGHT_NEG_LAYER_ID = 'front-edges-highlight-neg';
const MOVE_PREVIEW_LAYER_ID = 'move-preview-fill';
const SECTOR_FILL_LAYER_ID = 'sector-fill';
const SECTOR_EDGE_GLOW_POS_LAYER_ID = 'sector-edge-glow-pos';
const SECTOR_EDGE_GLOW_NEG_LAYER_ID = 'sector-edge-glow-neg';
const SECTOR_BRIGADE_RINGS_LAYER_ID = 'sector-brigade-rings';
const SECTOR_UNIT_PULSE_LAYER_ID = 'sector-unit-pulse';
const SECTOR_DEMARCATION_SOURCE_ID = 'sector-demarcation';
const SECTOR_DEMARCATION_LAYER_ID = 'sector-demarcation-lines';
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
const STRATEGIC_POINTS_SOURCE_ID = 'strategic-points';
const STRATEGIC_POINTS_LAYER_ID = 'strategic-points-circles';
const ENCLAVE_SOURCE_ID = 'enclave-osids';
const ENCLAVE_LABEL_SOURCE_ID = 'enclave-labels';
const ENCLAVE_OUTLINE_LAYER_ID = 'enclave-outline';
const ENCLAVE_FILL_LAYER_ID = 'enclave-fill';
const GHOST_PATH_SOURCE_ID = 'ghost-paths';
const GHOST_PATH_LAYER_ID = 'ghost-paths-line';
import { buildGhostPathsGeoJSON } from './builders/buildGhostPathsGeoJSON';
const ENCLAVE_LABEL_LAYER_ID = 'enclave-label';


export function MapContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const osidBaseRef = useRef<FeatureCollection | null>(null);
  const osidAdjacencyRef = useRef<Map<string, string[]> | null>(null);
  const osidCentroidsRef = useRef<Map<string, [number, number]>>(new Map());
  const lastPanTargetRef = useRef<string | null>(null);
  const prevSectorIdRef = useRef<string | null>(null);
  /** When true, sector selection came from a map click — skip zoom. Cleared after the pan/zoom effect reads it. */
  const sectorSelectedFromMapRef = useRef(false);
  const sourceUpdatePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Guard: only run heavy overlay build once per loadedGameState; poll must not run build (napkin). */
  const appliedStateRef = useRef<LoadedGameState | null>(null);
  /** Idle/timeout handle for deferred formation icons + setData; cleared on effect cleanup. */
  const deferredOverlayHandleRef = useRef<ReturnType<typeof requestIdleCallback> | ReturnType<typeof setTimeout> | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const setSelectedOsid = useGameStore((s) => s.setSelectedOsid);
  const setSelectedFormationId = useGameStore((s) => s.setSelectedFormationId);
  const setSelectedCorpsFrontSectorId = useGameStore((s) => s.setSelectedCorpsFrontSectorId);
  const setPendingAttackConfirmation = useGameStore((s) => s.setPendingAttackConfirmation);
  const setOrderModeForFormation = useGameStore((s) => s.setOrderModeForFormation);
  const orderModeForFormation = useGameStore((s) => s.orderModeForFormation);
  const ipc = useIPC();
  const setLoadError = useGameStore((s) => s.setLoadError);
  const setOsidDisplayNames = useGameStore((s) => s.setOsidDisplayNames);
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
  const operationTargetOsidsRef = useRef(operationTargetOsids);
  const [overlayAnchor, setOverlayAnchor] = useState<{ x: number; y: number } | null>(null);

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
  const strategicVisible = useGameStore((s) => s.strategicVisible);
  const selectedCorpsFrontSectorId = useGameStore((s) => s.selectedCorpsFrontSectorId);
  const hoveredSectorId = useGameStore((s) => s.hoveredSectorId);
  const hoveredCorpsId = useGameStore((s) => s.hoveredCorpsId);
  const setHoveredSectorId = useGameStore((s) => s.setHoveredSectorId);
  const osidPropertiesMap = useGameStore((s) => s.osidPropertiesMap);
  const setExpandedStackOsid = useGameStore((s) => s.setExpandedStackOsid);
  const ghostLinePoint = useGameStore((s) => s.ghostLinePoint);
  const setGhostLinePoint = useGameStore((s) => s.setGhostLinePoint);

  const osidToSector = useMemo(() => {
    if (!loadedGameState?.corpsFrontSectors || !loadedGameState?.frontEdgesOsid) return new Map<string, string>();
    return buildOsidToSectorMap(loadedGameState.corpsFrontSectors, loadedGameState.frontEdgesOsid);
  }, [loadedGameState?.corpsFrontSectors, loadedGameState?.frontEdgesOsid]);

  useEffect(() => {
    if (!containerRef.current) return;

    const pmtilesProtocol = new Protocol();
    const origin = window.location.origin;
    console.log('[PMTiles] registering protocol, origin:', origin);
    // Use tilev4 (native MapLibre v4 async handler) and surface errors
    const tileHandler = async (params: { url: string; type?: string }, abortController: AbortController) => {
      if (params.type === 'json') console.log('[PMTiles] source metadata request:', params.url);
      try {
        return await (pmtilesProtocol as any).tilev4(params, abortController);
      } catch (e) {
        console.error('[PMTiles] tile error', params.url, e);
        throw e;
      }
    };
    maplibregl.addProtocol('pmtiles', tileHandler as any);

    const style = rewritePmtilesUrls(styleJson as Record<string, unknown>, origin) as maplibregl.StyleSpecification;

    let initCancelled = false;
    const init = async () => {
      try {
        const [geojson, byOsid, adjacency] = await Promise.all([
          loadOperationalSettlements(),
          loadOperationalPoliticalControl(),
          loadOsidAdjacency(),
        ]);

        osidBaseRef.current = geojson;
        osidAdjacencyRef.current = adjacency;
        osidCentroidsRef.current = buildOsidCentroidLookup(geojson);
        setOsidDisplayNames(buildOsidDisplayNameMap(geojson));
        const osidProps: Record<string, Record<string, unknown>> = {};
        for (const f of geojson.features) {
          const props = (f.properties ?? {}) as Record<string, unknown>;
          const osid = typeof props.osid === 'string' ? props.osid : '';
          if (osid) osidProps[osid] = { ...props };
        }
        setOsidPropertiesMap(osidProps);

        const controlledGeoJson = buildControlGeoJSON(geojson, byOsid);
        const frontLinesGeoJson = buildFrontLinesGeoJSON(controlledGeoJson);
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
        (sources as Record<string, { type?: string; data?: FeatureCollection }>)[STRATEGIC_POINTS_SOURCE_ID] = { type: 'geojson', data: EMPTY_GEOJSON };
        (sources as Record<string, { type?: string; data?: FeatureCollection }>)[GHOST_PATH_SOURCE_ID] = { type: 'geojson', data: EMPTY_GEOJSON };
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
      });
      map.on('error', (e) => console.error('[MapLibre] map error:', e.error));
      mapRef.current = map;
      ensureTacticalIcons(map);
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
    // Re-register interactions when layers may have been added (e.g. front-edges, ethnic, density after loadedGameState).
    const t = setTimeout(() => {
      if (!mapRef.current) return;
      cleanup = useMapInteractions(mapRef.current, {
        onOsidClick: (osid) => {
          if (orderModeForFormation === 'attack' && selectedFormationId) {
            setPendingAttackConfirmation({ attackerFormationId: selectedFormationId, targetOsid: osid });
            setOrderModeForFormation(null);
          } else if (orderModeForFormation === 'move' && selectedFormationId) {
            void stageMoveOrderFromOsid(
              { ipc, addStagedOrder: useGameStore.getState().addStagedOrder, setLoadError },
              selectedFormationId,
              osid
            );
            setOrderModeForFormation(null);
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
            setSelectedOsid(osid);
            setExpandedStackOsid(null);
            setOverlayAnchor(null);
            // If this settlement belongs to a front sector, select that sector so it's visible on the map.
            const sectorId = osidToSector.get(osid);
            if (sectorId) {
              sectorSelectedFromMapRef.current = true;
              setSelectedCorpsFrontSectorId(sectorId);
            }
          }
        },
        onFormationClick: (id, props, point) => {
          setSelectedFormationId(id);
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
          if (sectorId) {
            sectorSelectedFromMapRef.current = true;
            setSelectedCorpsFrontSectorId(sectorId);
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
            setTooltipTargetWithPosition({ type: 'formation', id }, point ?? undefined);
            setHoveredSectorId(getSectorIdForFormation(id, loadedGameState?.corpsFrontSectors));
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
      });
    }, 400);
    return () => {
      clearTimeout(t);
      if (cleanup) cleanup();
    };
  }, [mapReady, loadedGameState, setSelectedOsid, setSelectedFormationId, setSelectedCorpsFrontSectorId, setTooltipTargetWithPosition, clearTooltipTarget, orderModeForFormation, selectedFormationId, setPendingAttackConfirmation, setOrderModeForFormation, ipc, setLoadError, osidToSector]);

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
        appliedStagedOrdersRef.current = currentStagedOrders;
        appliedExpandedStackOsidRef.current = stack;
        appliedSelectedFormationIdRef.current = selectedFormationId;

        let controlledGeoJson: FeatureCollection;
        try {
          if (devMode) console.time('[MapContainer] overlay control');
          const m1 = mapRef.current;
          controlledGeoJson = buildControlGeoJSON(base, state.controlBySettlement);
          (m1.getSource('osid-control') as GeoJSONSource)?.setData(controlledGeoJson);
          if (devMode) console.timeEnd('[MapContainer] overlay control');
        } catch (e) {
          console.error('[MapContainer] overlay control failed:', e);
          appliedStateRef.current = null;
          return;
        }

        requestAnimationFrame(() => {
          if (cancelled || !mapRef.current || !state) return;
          try {
            if (devMode) console.time('[MapContainer] overlay front+formations');
            const m2 = mapRef.current;
            // Corps-colored fronts when sector data is available; else faction borders
            let frontLinesGeoJson;
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
            (m2.getSource('front-lines') as GeoJSONSource)?.setData(frontLinesGeoJson);

            // Operational Heatmap (Mode 7) update
            if (Number(mapMode) === 7 && osidCentroidsRef.current.size > 0) {
              const heatmapData = buildOperationalHeatmapGeoJSON(state, osidCentroidsRef.current);
              (m2.getSource('operational-heatmap') as GeoJSONSource)?.setData(heatmapData);
            }

            const frontEdgesOsid = state.frontEdgesOsid;
            if (frontEdgesOsid && frontEdgesOsid.length > 0) {
              const centroidsForHover = osidCentroidsRef.current.size > 0 ? osidCentroidsRef.current : undefined;
              const frontEdgesHoverData = buildFrontEdgesHoverGeoJSON(controlledGeoJson, frontEdgesOsid, state.corpsFrontSectors, centroidsForHover);
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
                      'line-width': ['interpolate', ['linear'], ['zoom'], 6, 14, 10, 24, 14, 36],
                      'line-opacity': 0.01,
                      'line-color': '#ffffff',
                    },
                  },
                  'formation-markers'
                );

                // Serrated front line teeth layer
                m2.addLayer({
                  id: 'front-line-teeth',
                  type: 'symbol',
                  source: 'front-lines',
                  filter: ['==', ['get', 'lineType'], 'front'],
                  layout: {
                    'icon-image': 'front-line-tooth',
                    'symbol-placement': 'line',
                    'symbol-spacing': 25,
                    'icon-rotate': ['get', 'tooth_rotation'],
                    'icon-rotation-alignment': 'map',
                    'icon-size': ['interpolate', ['linear'], ['zoom'], 6, 0.2, 10, 0.4, 14, 0.6],
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true,
                  },
                  paint: {
                    'icon-opacity': 0.85,
                  }
                }, 'formation-markers');

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
                  // No offset — glow replaces the front line for the selected sector.
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
                      'line-width': ['interpolate', ['linear'], ['zoom'], 6, 14, 10, 24, 14, 36],
                      'line-opacity': 0.01,
                      'line-color': '#ffffff',
                    },
                  },
                  'formation-markers'
                );
              } else {
                (m2.getSource(FRONT_EDGES_HOVER_SOURCE_ID) as GeoJSONSource).setData(frontEdgesHoverData);
              }

              // Sector demarcation lines: clean solid lines between adjacent same-faction sectors
              if (state.corpsFrontSectors && state.corpsFrontSectors.length > 0) {
                const demarcData = buildSectorDemarcationGeoJSON(controlledGeoJson, state.corpsFrontSectors, frontEdgesOsid);
                if (!m2.getSource(SECTOR_DEMARCATION_SOURCE_ID)) {
                  m2.addSource(SECTOR_DEMARCATION_SOURCE_ID, { type: 'geojson', data: demarcData });
                  // Dark base line (like front-line pattern: dark base + lighter dash on top)
                  m2.addLayer(
                    {
                      id: SECTOR_DEMARCATION_LAYER_ID,
                      type: 'line',
                      source: SECTOR_DEMARCATION_SOURCE_ID,
                      paint: {
                        'line-color': [
                          'match', ['get', 'faction'],
                          'RS', 'rgba(100, 30,  30,  0.7)',
                          'RBiH', 'rgba(30,  80,  40,  0.7)',
                          'HRHB', 'rgba(30,  60,  110, 0.7)',
                          'rgba(60, 60, 70, 0.5)',
                        ],
                        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1.2, 10, 2.0, 14, 3.0],
                        'line-opacity': 0.6,
                      },
                      layout: { 'line-cap': 'round', 'line-join': 'round' },
                    },
                    'faction-border-glow-pos'
                  );
                  // Lighter dash stripe on top
                  m2.addLayer(
                    {
                      id: SECTOR_DEMARCATION_LAYER_ID + '-stripe',
                      type: 'line',
                      source: SECTOR_DEMARCATION_SOURCE_ID,
                      paint: {
                        'line-color': [
                          'match', ['get', 'faction'],
                          'RS', 'rgba(200, 120, 120, 0.8)',
                          'RBiH', 'rgba(120, 200, 130, 0.8)',
                          'HRHB', 'rgba(120, 160, 220, 0.8)',
                          'rgba(160, 160, 170, 0.6)',
                        ],
                        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.5, 10, 0.8, 14, 1.2],
                        'line-dasharray': [4, 3],
                        'line-opacity': 0.7,
                      },
                      layout: { 'line-cap': 'butt', 'line-join': 'round' },
                    },
                    'faction-border-glow-pos'
                  );
                } else {
                  (m2.getSource(SECTOR_DEMARCATION_SOURCE_ID) as GeoJSONSource).setData(demarcData);
                }
              }
            }

            requestAnimationFrame(() => {
              if (cancelled || !mapRef.current || !state) return;
              try {
                // Only hide map-level icons if the overlay anchor is ready, ensuring no "flicker/disappearance"
                const activeOverlayOsid = (expandedStackOsid && overlayAnchor) ? expandedStackOsid : null;
                const formationsGeoJson = buildFormationsGeoJSON(state, controlledGeoJson, activeOverlayOsid);
                const orderArrowsGeoJson = buildOrderArrowsGeoJSON(state, currentStagedOrders, controlledGeoJson);
                const iconIds = Array.from(new Set(formationsGeoJson.features.flatMap(f => [f.properties.icon_id, f.properties.white_icon_id])));

                // Defer icon registration + setData to idle/next tick so this rAF doesn't block the main thread (freeze fix).
                const runDeferred = () => {
                  if (cancelled || !mapRef.current || !state) return;
                  const initialMap = mapRef.current;
                  try {
                    try {
                      ensureFormationIcons(initialMap, iconIds);
                    } catch (iconErr) {
                      console.warn('[MapContainer] Formation icon registration failed (labels may still show):', iconErr);
                    }
                    if (cancelled || !mapRef.current || mapRef.current !== initialMap) return;
                    if (m.getSource('formations')) (m.getSource('formations') as GeoJSONSource).setData(formationsGeoJson);
                    if (m.getSource('order-arrows')) (m.getSource('order-arrows') as GeoJSONSource).setData(orderArrowsGeoJson);

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
                      layout: { 'line-cap': 'round', 'line-join': 'round' },
                    }, 'formation-markers');
                    // Tapered body fill
                    safeEnsureLayer(m, {
                      id: OP_ARROWS_LINE_LAYER_ID, type: 'fill', source: OP_ARROWS_SOURCE_ID,
                      filter: ['==', ['get', 'type'], 'op-arrow-body'],
                      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 1.0 },
                    }, 'formation-markers');
                    // Arrowheads
                    safeEnsureLayer(m, {
                      id: OP_ARROWS_HEAD_LAYER_ID, type: 'fill', source: OP_ARROWS_SOURCE_ID,
                      filter: ['==', ['get', 'type'], 'op-arrow-head'],
                      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 1.0 },
                    }, 'formation-markers');
                    // Origin dots
                    safeEnsureLayer(m, {
                      id: OP_ARROWS_ORIGIN_LAYER_ID, type: 'circle', source: OP_ARROWS_SOURCE_ID,
                      filter: ['==', ['get', 'type'], 'op-arrow-origin'],
                      paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2, 10, 3, 14, 4.5], 'circle-color': ['get', 'color'], 'circle-opacity': 0.8 },
                    }, 'formation-markers');
                    (m.getSource(OP_ARROWS_SOURCE_ID) as GeoJSONSource)?.setData(opArrowsGeoJson);

                    // Phase 3: Serrated front line teeth layer
                    if (!m.hasImage('front-line-tooth')) {
                      const toothIcon = generateFrontLineToothIcon();
                      m.addImage('front-line-tooth', toothIcon as any);
                    }
                    safeEnsureLayer(m, {
                      id: 'front-line-teeth',
                      type: 'symbol',
                      source: 'front-lines',
                      filter: ['==', ['get', 'lineType'], 'front'],
                      layout: {
                        'icon-image': 'front-line-tooth',
                        'symbol-placement': 'line',
                        'symbol-spacing': 45,
                        'icon-rotate': ['coalesce', ['get', 'tooth_rotation'], 0],
                        'icon-rotation-alignment': 'map',
                        'icon-size': ['interpolate', ['linear'], ['zoom'], 6, 0.12, 10, 0.28, 14, 0.42],
                        'icon-allow-overlap': true,
                        'icon-ignore-placement': true,
                      },
                      paint: {
                        'icon-opacity': 0.85,
                      }
                    }, 'formation-markers');

                    // Fog of war: cover enemy OSIDs not confirmed empty by player recon
                    const fogGeoJson = buildFogOfWarGeoJSON(base, state.controlBySettlement, state.player_faction, state.fogOfWar);
                    safeEnsureLayer(m, { id: FOG_FILL_LAYER_ID, type: 'fill', source: FOG_OVERLAY_SOURCE_ID, paint: { 'fill-color': 'rgba(0, 0, 0, 0.42)' } }, 'formation-markers');
                    if (m.getSource(FOG_OVERLAY_SOURCE_ID)) (m.getSource(FOG_OVERLAY_SOURCE_ID) as GeoJSONSource).setData(fogGeoJson);
                    const { fogVisible: fogVis } = useGameStore.getState();
                    safeSetLayoutVisibility(m, FOG_FILL_LAYER_ID, fogVis && !!state.player_faction && !!state.fogOfWar);

                    // Enclave visualization: dashed faction-colored outline + faint fill + text label
                    const { polygons: enclavePolygons, labels: enclaveLabels } = buildEnclaveGeoJSON(
                      base, state.controlBySettlement, state.enclaveResilience,
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
                        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
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
                    );
                    safeEnsureLayer(m, {
                      id: BATTLE_MARKERS_LAYER_ID,
                      type: 'circle',
                      source: BATTLE_MARKERS_SOURCE_ID,
                      paint: {
                        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 4, 10, 7, 14, 10],
                        'circle-color': '#ffffff',
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

                    // Strategic points: gold circles for major cities and municipal seats
                    const strategicGeoJson = buildStrategicPointGeoJSON(base);
                    safeEnsureLayer(m, {
                      id: STRATEGIC_POINTS_LAYER_ID,
                      type: 'circle',
                      source: STRATEGIC_POINTS_SOURCE_ID,
                      minzoom: 5,
                      paint: {
                        'circle-radius': ['match', ['get', 'tier'], 'city', 8, 5],
                        'circle-color': 'rgba(255, 255, 255, 0.75)', // will be animated by pulse loop
                        'circle-opacity': 0.85,
                        'circle-stroke-color': 'rgba(0,0,0,0.5)',
                        'circle-stroke-width': 1,
                      },
                    }, 'formation-markers');
                    if (m.getSource(STRATEGIC_POINTS_SOURCE_ID)) (m.getSource(STRATEGIC_POINTS_SOURCE_ID) as GeoJSONSource).setData(strategicGeoJson);
                    const { strategicVisible: stratVis, selectedFormationId: selBid } = useGameStore.getState();
                    safeSetLayoutVisibility(m, STRATEGIC_POINTS_LAYER_ID, stratVis);

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

                    const { formationsVisible: fVis, labelsVisible: lVis } = useGameStore.getState();
                    safeSetLayoutVisibility(m, FORMATION_MARKERS_LAYER_ID, fVis);
                    safeSetLayoutVisibility(m, FORMATION_LABELS_LAYER_ID, lVis);
                    if (devMode) console.timeEnd('[MapContainer] overlay front+formations');
                  } catch (deferredErr) {
                    console.error('[MapContainer] deferred overlay failed:', deferredErr);
                    appliedStateRef.current = null;
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
        deferredOverlayHandleRef.current = null;
      }
      if (sourceUpdatePollRef.current) {
        clearInterval(sourceUpdatePollRef.current);
        sourceUpdatePollRef.current = null;
      }
    };
  }, [loadedGameState, mapReady, stagedOrders, expandedStackOsid]);



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
      // Sector edge glow layers (on front-edges-hover source)
      // If source doesn't exist yet (created in runUpdate via double-RAF), return false to keep polling.
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
        // Clear sector-specific layers
        try {
          map.setFilter(SECTOR_FILL_LAYER_ID, ['==', ['get', 'osid'], '__none__'] as maplibregl.FilterSpecification);
          if (safeHasLayer(map, SECTOR_BRIGADE_RINGS_LAYER_ID)) {
            map.setFilter(SECTOR_BRIGADE_RINGS_LAYER_ID, ['==', ['get', 'id'], '__none__'] as maplibregl.FilterSpecification);
          }
        } catch (e) {
          console.warn('[MapContainer] sector clear failed:', e);
        }

        // Brigade-level highlight: white icon + AoR sub-segment line
        if (selectedFormationId && loadedGameState) {
          const fm = loadedGameState.formations.find((f) => f.id === selectedFormationId);
          const subSegId = fm?.assigned_sub_segment_id;
          try {
            if (safeHasLayer(map, FORMATION_WHITE_OVERLAY_LAYER_ID)) {
              map.setFilter(FORMATION_WHITE_OVERLAY_LAYER_ID, ['==', ['get', 'id'], selectedFormationId] as maplibregl.FilterSpecification);
              map.setPaintProperty(FORMATION_WHITE_OVERLAY_LAYER_ID, 'icon-opacity', 0.98);
            }
            if (safeHasLayer(map, SECTOR_UNIT_PULSE_LAYER_ID)) {
              map.setFilter(SECTOR_UNIT_PULSE_LAYER_ID, ['==', ['get', 'id'], selectedFormationId] as maplibregl.FilterSpecification);
              map.setPaintProperty(SECTOR_UNIT_PULSE_LAYER_ID, 'circle-opacity', 0.6);
              map.setPaintProperty(SECTOR_UNIT_PULSE_LAYER_ID, 'circle-radius', ['interpolate', ['linear'], ['zoom'], 6, 12, 10, 16, 14, 22]);
            }
            // AoR line: filter front edge layers by sub_segment_id
            const edgeFilter = subSegId
              ? ['==', ['get', 'sub_segment_id'], subSegId]
              : ['==', ['get', 'sector_id'], '__none__'];
            for (const layerId of [SECTOR_EDGE_GLOW_POS_LAYER_ID, SECTOR_EDGE_GLOW_NEG_LAYER_ID, FRONT_EDGES_HIGHLIGHT_POS_LAYER_ID, FRONT_EDGES_HIGHLIGHT_NEG_LAYER_ID]) {
              if (safeHasLayer(map, layerId)) {
                const side = layerId.includes('-pos') ? 1 : -1;
                map.setFilter(layerId, ['all', ['==', ['get', 'offset_side'], side], edgeFilter] as any);
                if (subSegId && layerId.includes('glow')) {
                  map.setPaintProperty(layerId, 'line-opacity', 0.95);
                }
              }
            }
          } catch (e) {
            console.warn('[MapContainer] brigade highlight failed:', e);
          }
        } else {
          // Nothing selected — clear everything
          try {
            for (const layerId of [SECTOR_EDGE_GLOW_POS_LAYER_ID, SECTOR_EDGE_GLOW_NEG_LAYER_ID, FRONT_EDGES_HIGHLIGHT_POS_LAYER_ID, FRONT_EDGES_HIGHLIGHT_NEG_LAYER_ID]) {
              if (safeHasLayer(map, layerId)) {
                const side = layerId.includes('-pos') ? 1 : -1;
                map.setFilter(layerId, ['all', ['==', ['get', 'offset_side'], side], ['==', ['get', 'sector_id'], '__none__']] as maplibregl.FilterSpecification);
              }
            }
            if (safeHasLayer(map, FORMATION_WHITE_OVERLAY_LAYER_ID)) {
              map.setFilter(FORMATION_WHITE_OVERLAY_LAYER_ID, ['==', ['get', 'id'], '__none__'] as maplibregl.FilterSpecification);
              map.setPaintProperty(FORMATION_WHITE_OVERLAY_LAYER_ID, 'icon-opacity', 0);
            }
            if (safeHasLayer(map, SECTOR_UNIT_PULSE_LAYER_ID)) {
              map.setFilter(SECTOR_UNIT_PULSE_LAYER_ID, ['==', ['get', 'id'], '__none__'] as maplibregl.FilterSpecification);
            }
          } catch (e) {
            console.warn('[MapContainer] full clear failed:', e);
          }
        }
        return true;
      }

      const state = loadedGameState;
      const ids = Array.from(activeSectorIds);
      const isMulti = ids.length > 1;
      const selectedSector = state?.corpsFrontSectors?.find(s => s.sector_id === selectedCorpsFrontSectorId);

      // For fill, we can highlight all OSIDs in all active sectors
      const allActiveSectors = state?.corpsFrontSectors?.filter(s => activeSectorIds.has(s.sector_id)) ?? [];
      const allOsids = allActiveSectors.flatMap(s => collectSectorFriendlyOsids(s, state!.frontEdgesOsid!));

      if (!state?.frontEdgesOsid) return true;

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
      const filterExpr = ['in', ['get', 'sector_id'], ['literal', ids]] as any;
      try {
        if (safeHasLayer(map, SECTOR_EDGE_GLOW_POS_LAYER_ID)) {
          map.setFilter(SECTOR_EDGE_GLOW_POS_LAYER_ID, ['all', ['==', ['get', 'offset_side'], 1], filterExpr] as any);
        }
        if (safeHasLayer(map, SECTOR_EDGE_GLOW_NEG_LAYER_ID)) {
          map.setFilter(SECTOR_EDGE_GLOW_NEG_LAYER_ID, ['all', ['==', ['get', 'offset_side'], -1], filterExpr] as any);
        }
        if (safeHasLayer(map, FRONT_EDGES_HIGHLIGHT_POS_LAYER_ID)) {
          map.setFilter(FRONT_EDGES_HIGHLIGHT_POS_LAYER_ID, ['all', ['==', ['get', 'offset_side'], 1], filterExpr] as any);
        }
        if (safeHasLayer(map, FRONT_EDGES_HIGHLIGHT_NEG_LAYER_ID)) {
          map.setFilter(FRONT_EDGES_HIGHLIGHT_NEG_LAYER_ID, ['all', ['==', ['get', 'offset_side'], -1], filterExpr] as any);
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
          // Collect brigade IDs from whichever source is active
          const ringSectors = selectedCorpsId ? allActiveSectors : selectedSector ? [selectedSector] : [];
          const ringBrigadeIds = ringSectors.flatMap(s => [...s.assigned_brigade_ids, ...s.reserve_brigade_ids]);
          if (ringBrigadeIds.length > 0) {
            map.setFilter(SECTOR_BRIGADE_RINGS_LAYER_ID, ['in', ['get', 'id'], ['literal', ringBrigadeIds]] as any);
            map.setPaintProperty(SECTOR_BRIGADE_RINGS_LAYER_ID, 'circle-stroke-color', highlightCorpsHex);
          } else {
            map.setFilter(SECTOR_BRIGADE_RINGS_LAYER_ID, ['==', ['get', 'id'], '__none__'] as any);
          }
        }
      } catch (e) {
        console.warn('[MapContainer] sector brigade rings focus failed:', e);
      }

      // C.3b + C.3c: Unit white glow + white icon overlay — sector or corps selection
      const unitHighlightActive = !!(selectedCorpsId || selectedCorpsFrontSectorId);
      const unitFilter: any = selectedCorpsId
        ? ['in', ['get', 'sector_id'], ['literal', ids]]
        : selectedCorpsFrontSectorId
          ? ['==', ['get', 'sector_id'], selectedCorpsFrontSectorId]
          : ['==', ['get', 'sector_id'], '__none__'];

      try {
        if (safeHasLayer(map, SECTOR_UNIT_PULSE_LAYER_ID)) {
          map.setFilter(SECTOR_UNIT_PULSE_LAYER_ID, unitFilter);
          if (unitHighlightActive) {
            map.setPaintProperty(SECTOR_UNIT_PULSE_LAYER_ID, 'circle-opacity', 0.6);
            map.setPaintProperty(SECTOR_UNIT_PULSE_LAYER_ID, 'circle-radius', [
              'interpolate', ['linear'], ['zoom'],
              6, 12, 10, 16, 14, 22
            ]);
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

  // Movement preview: highlight same-faction-controlled OSIDs when move mode is active.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    const ensureMoveLayer = () => {
      if (!map.getSource('osid-control') || !safeHasLayer(map, 'osid-control-fill')) return false;
      if (!safeHasLayer(map, MOVE_PREVIEW_LAYER_ID)) {
        map.addLayer(
          {
            id: MOVE_PREVIEW_LAYER_ID,
            type: 'fill',
            source: 'osid-control',
            filter: ['==', ['get', 'osid'], '__none__'],
            paint: {
              'fill-color': 'rgba(100, 200, 120, 0.20)',
              'fill-outline-color': 'rgba(100, 200, 120, 0.50)',
            },
          },
          'faction-border-glow-pos'
        );
      }
      return true;
    };

    const applyMovePreview = () => {
      if (!ensureMoveLayer()) return false;

      if (orderModeForFormation !== 'move' || !selectedFormationId || !loadedGameState) {
        // Clear: hide move preview
        try {
          map.setFilter(MOVE_PREVIEW_LAYER_ID, ['==', ['get', 'osid'], '__none__'] as maplibregl.FilterSpecification);
        } catch (e) {
          console.warn('[MapContainer] move preview clear failed:', e);
        }
        return true;
      }

      // Find formation's faction, highlight all same-faction OSIDs
      const formation = loadedGameState.formations.find((f) => f.id === selectedFormationId);
      if (!formation) return true;

      const faction = formation.faction;
      try {
        map.setFilter(MOVE_PREVIEW_LAYER_ID,
          ['==', ['get', 'controller'], faction] as maplibregl.FilterSpecification
        );
      } catch (e) {
        console.warn('[MapContainer] move preview filter failed:', e);
      }
      return true;
    };

    if (applyMovePreview()) return;
    const poll = setInterval(() => {
      if (applyMovePreview()) clearInterval(poll);
    }, 250);
    return () => clearInterval(poll);
  }, [mapReady, orderModeForFormation, selectedFormationId, loadedGameState]);

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
          'faction-border-glow-pos'
        );
      } else {
        (m.getSource(OSID_ETHNIC_SOURCE_ID) as GeoJSONSource).setData(ethnicGeoJson);
      }
      const showPolitical = mapMode === 'political';
      safeSetLayoutVisibility(m, 'osid-control-fill', showPolitical);
      if (safeHasLayer(m, OSID_ETHNIC_FILL_LAYER_ID)) {
        safeSetLayoutVisibility(m, OSID_ETHNIC_FILL_LAYER_ID, mapMode === 'ethnic');
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
                0,   'rgba(204, 34, 34, 0.45)',
                25,  'rgba(204, 102, 34, 0.40)',
                45,  'rgba(204, 170, 34, 0.35)',
                65,  'rgba(136, 170, 34, 0.35)',
                85,  'rgba(34, 136, 68, 0.35)',
              ],
            },
          },
          'faction-border-glow-pos'
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
          'faction-border-glow-pos'
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
          'faction-border-glow-pos'
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
      const casualtiesGeoJson = buildCasualtiesGeoJSON(controlGeoJson, loadedGameState.formations);
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
                0,   'rgba(60, 60, 70, 0.05)',
                0.15, 'rgba(204, 170, 34, 0.25)',
                0.4,  'rgba(220, 130, 40, 0.35)',
                0.7,  'rgba(220, 60, 60, 0.45)',
                1.0,  'rgba(140, 20, 20, 0.55)',
              ],
            },
          },
          'faction-border-glow-pos'
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
        loadedGameState.warPhaseSupplyPressure
      );
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
          'faction-border-glow-pos'
        );
      } else {
        (m.getSource(OSID_SUPPLY_SOURCE_ID) as GeoJSONSource).setData(supplyGeoJson);
      }
      safeSetLayoutVisibility(m, OSID_SUPPLY_FILL_LAYER_ID, mapMode === 'supply');
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
      // In live mode, hide lateral sector demarcation lines (front lines ARE the sectors).
      if (safeHasLayer(map, SECTOR_DEMARCATION_LAYER_ID)) {
        safeSetLayoutVisibility(map, SECTOR_DEMARCATION_LAYER_ID, devMode && sectorsVisible);
      }
      if (safeHasLayer(map, SECTOR_DEMARCATION_LAYER_ID + '-stripe')) {
        safeSetLayoutVisibility(map, SECTOR_DEMARCATION_LAYER_ID + '-stripe', devMode && sectorsVisible);
      }
      if (!safeSetLayoutVisibility(map, FORMATION_MARKERS_LAYER_ID, formationsVisible)) allExist = false;
      if (!safeSetLayoutVisibility(map, FORMATION_LABELS_LAYER_ID, labelsVisible)) allExist = false;
      if (safeHasLayer(map, FORMATION_HOME_BADGE_LAYER_ID)) {
        safeSetLayoutVisibility(map, FORMATION_HOME_BADGE_LAYER_ID, formationsVisible);
      }
      // Map mode visibility: dedicated overlay per mode.
      const showPolitical = mapMode === 'political';
      if (!safeSetLayoutVisibility(map, 'osid-control-fill', showPolitical)) allExist = false;
      if (safeHasLayer(map, OSID_ETHNIC_FILL_LAYER_ID) && !safeSetLayoutVisibility(map, OSID_ETHNIC_FILL_LAYER_ID, mapMode === 'ethnic')) allExist = false;
      if (safeHasLayer(map, OSID_MORALE_FILL_LAYER_ID) && !safeSetLayoutVisibility(map, OSID_MORALE_FILL_LAYER_ID, mapMode === 'morale')) allExist = false;
      if (safeHasLayer(map, OSID_CASUALTIES_FILL_LAYER_ID) && !safeSetLayoutVisibility(map, OSID_CASUALTIES_FILL_LAYER_ID, mapMode === 'casualties')) allExist = false;
      if (safeHasLayer(map, OSID_SUPPLY_FILL_LAYER_ID) && !safeSetLayoutVisibility(map, OSID_SUPPLY_FILL_LAYER_ID, mapMode === 'supply')) allExist = false;
      if (safeHasLayer(map, OSID_OPERATIONS_FILL_LAYER_ID) && !safeSetLayoutVisibility(map, OSID_OPERATIONS_FILL_LAYER_ID, mapMode === 'operations')) allExist = false;
      return allExist;
    };

    if (applyVisibility()) return;

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
      map.off('load', onLoad);
      clearTimeout(retryId);
    };
  }, [mapReady, frontsVisible, effectiveFrontsVisible, formationsVisible, labelsVisible, mapMode, devMode, sectorsVisible]);

  // Phase 5 toggles: fog / battles / strategic points — reactive visibility when store changes.
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
    if (safeHasLayer(map, STRATEGIC_POINTS_LAYER_ID)) {
      safeSetLayoutVisibility(map, STRATEGIC_POINTS_LAYER_ID, strategicVisible);
    }
  }, [mapReady, fogVisible, battlesVisible, strategicVisible]);

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

  // Sync refs for animation
  useEffect(() => {
    operationTargetOsidsRef.current = operationTargetOsids;
  }, [operationTargetOsids]);

  // Pulse animation for staged orders and strategic objectives
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
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
          if (map.getLayer(STRATEGIC_POINTS_LAYER_ID)) {
            const targets = operationTargetOsidsRef.current;
            if (targets.length > 0) {
              const goldPulse = Math.sin(time / 200) * 0.4 + 0.6;
              map.setPaintProperty(STRATEGIC_POINTS_LAYER_ID, 'circle-color', [
                'case',
                ['in', ['get', 'osid'], ['literal', targets]],
                `rgba(255, 215, 0, ${goldPulse})`,
                'rgba(255, 255, 255, 0.75)'
              ]);
            } else {
              map.setPaintProperty(STRATEGIC_POINTS_LAYER_ID, 'circle-color', 'rgba(255, 255, 255, 0.75)');
            }
          }
        } catch (e) {
          // ignore if style not loaded yet
        }
      }
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [mapReady]);

  return (
    <>
      <div ref={containerRef} className="absolute inset-0" />

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
            setSelectedFormationId(id);
            setExpandedStackOsid(null);
            setOverlayAnchor(null);
          }}
        />
      )}
    </>
  );
}

function generateFrontLineToothIcon(): HTMLCanvasElement {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Sharp isosceles triangle (tooth)
  // Points toward 0 degrees (Up in Canvas/MapLibre screen space if not rotated)
  ctx.beginPath();
  ctx.moveTo(size / 2, 4);          // Tip
  ctx.lineTo(size / 1.4, size - 4); // Bottom right
  ctx.lineTo(size / 3.5, size - 4); // Bottom left
  ctx.closePath();

  ctx.fillStyle = '#101010';        // Match dark front line base
  ctx.fill();
  ctx.strokeStyle = '#e0e0e0';      // Soft highlight
  ctx.lineWidth = 1;
  ctx.stroke();

  return canvas;
}

