import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import type { GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import { useMapInteractions } from './useMapInteractions';
import { useGameStore } from '../store/gameStore';
import { buildOsidDisplayNameMap } from '../utils/osidDisplayName';
import { loadOperationalPoliticalControl, loadOperationalSettlements } from '../data/DataLoader';
import { buildControlGeoJSON } from './builders/buildControlGeoJSON';
import { buildEthnicGeoJSON } from './builders/buildEthnicGeoJSON';
import { buildFrontLinesGeoJSON } from './builders/buildFrontLinesGeoJSON';
import { buildFrontEdgesHoverGeoJSON } from './builders/buildFrontEdgesHoverGeoJSON';
import { buildFormationsGeoJSON } from './builders/buildFormationsGeoJSON';
import { buildOrderArrowsGeoJSON } from './builders/buildOrderArrowsGeoJSON';
import { buildOsidCentroidLookup } from './builders/geojsonLookup';
import { resolveFormationLocationOsid } from './builders/resolveFormationLocationOsid';
import { ensureFormationIcons } from './formationIcons';
import styleJson from './awwv_map_style.json';

const BOSNIA_CENTER: [number, number] = [17.7, 43.87];
const DEFAULT_ZOOM = 8;
const SIDEBAR_HOVER_LAYER_ID = 'sidebar-hover-outline';

/** Layer IDs for front lines (visibility driven by store frontsVisible). */
const FRONT_LAYER_IDS = ['faction-border-glow', 'front-line-base', 'front-line-dash'];
/** Fill layer for ethnic map mode (majority_ethnic); toggled with osid-control-fill by mapMode. */
const OSID_ETHNIC_FILL_LAYER_ID = 'osid-ethnic-fill';
const OSID_ETHNIC_SOURCE_ID = 'osid-ethnic';
/** Layer ID for formation markers (formationsVisible). */
const FORMATION_MARKERS_LAYER_ID = 'formation-markers';
/** Layer ID for formation labels (labelsVisible). */
const FORMATION_LABELS_LAYER_ID = 'formation-labels';
const FRONT_EDGES_HOVER_LAYER_ID = 'front-edges-hover';
const FRONT_EDGES_HOVER_SOURCE_ID = 'front-edges-hover';

function rewritePmtilesUrls(style: Record<string, unknown>, origin: string): Record<string, unknown> {
  const base = `pmtiles://${origin}/`;
  const str = JSON.stringify(style);
  const rewritten = str.replace(/pmtiles:\/\/\//g, base);
  return JSON.parse(rewritten) as Record<string, unknown>;
}

export function MapContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const osidBaseRef = useRef<FeatureCollection | null>(null);
  const osidCentroidsRef = useRef<Map<string, [number, number]>>(new Map());
  const lastPanTargetRef = useRef<string | null>(null);
  const sourceUpdatePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const setSelectedOsid = useGameStore((s) => s.setSelectedOsid);
  const setSelectedFormationId = useGameStore((s) => s.setSelectedFormationId);
  const setPendingAttackConfirmation = useGameStore((s) => s.setPendingAttackConfirmation);
  const setOrderModeForFormation = useGameStore((s) => s.setOrderModeForFormation);
  const orderModeForFormation = useGameStore((s) => s.orderModeForFormation);
  const setOsidDisplayNames = useGameStore((s) => s.setOsidDisplayNames);
  const setOsidPropertiesMap = useGameStore((s) => s.setOsidPropertiesMap);
  const selectedOsid = useGameStore((s) => s.selectedOsid);
  const selectedFormationId = useGameStore((s) => s.selectedFormationId);
  const hoveredOsids = useGameStore((s) => s.hoveredOsids);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const setTooltipTargetWithPosition = useGameStore((s) => s.setTooltipTargetWithPosition);
  const clearTooltipTarget = useGameStore((s) => s.clearTooltipTarget);
  const frontsVisible = useGameStore((s) => s.frontsVisible);
  const formationsVisible = useGameStore((s) => s.formationsVisible);
  const labelsVisible = useGameStore((s) => s.labelsVisible);
  const mapMode = useGameStore((s) => s.mapMode);
  const osidPropertiesMap = useGameStore((s) => s.osidPropertiesMap);

  useEffect(() => {
    if (!containerRef.current) return;

    maplibregl.addProtocol('pmtiles', new Protocol().tile);

    const origin = window.location.origin;
    const style = rewritePmtilesUrls(styleJson as Record<string, unknown>, origin) as maplibregl.StyleSpecification;

    const init = async () => {
      try {
        const [geojson, byOsid] = await Promise.all([
          loadOperationalSettlements(),
          loadOperationalPoliticalControl(),
        ]);

        osidBaseRef.current = geojson;
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
        const emptyGeoJson: FeatureCollection = { type: 'FeatureCollection', features: [] };

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
          sources['formations'].data = emptyGeoJson;
        }
        if (sources['order-arrows']) {
          sources['order-arrows'].data = emptyGeoJson;
        }
      } catch (e) {
        console.warn('Failed to pre-load OSID data:', e);
      }

      if (!containerRef.current) return;
      const map = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: BOSNIA_CENTER,
        zoom: DEFAULT_ZOOM,
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl(), 'top-right');
      setMapReady(true);
    };

    init();

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
      maplibregl.removeProtocol('pmtiles');
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const cleanup = useMapInteractions(map, {
      onOsidClick: (osid) => {
        if (orderModeForFormation === 'attack' && selectedFormationId) {
          setPendingAttackConfirmation({ attackerFormationId: selectedFormationId, targetOsid: osid });
          setOrderModeForFormation(null);
        } else {
          setSelectedOsid(osid);
        }
      },
      onFormationClick: (id) => setSelectedFormationId(id),
      onOsidHover: (osid, point) => {
        if (osid) setTooltipTargetWithPosition({ type: 'osid', id: osid }, point ?? undefined);
        else clearTooltipTarget();
      },
      onFormationHover: (id, point) => {
        if (id) setTooltipTargetWithPosition({ type: 'formation', id }, point ?? undefined);
        else clearTooltipTarget();
      },
      onFrontEdgeHover: (edgeId, point) => {
        if (edgeId) setTooltipTargetWithPosition({ type: 'front', id: edgeId }, point ?? undefined);
        else clearTooltipTarget();
      },
      onMapMouseLeave: clearTooltipTarget,
    });
    return () => cleanup?.();
  }, [mapReady, setSelectedOsid, setSelectedFormationId, setTooltipTargetWithPosition, clearTooltipTarget, orderModeForFormation, selectedFormationId, setPendingAttackConfirmation, setOrderModeForFormation]);

  useEffect(() => {
    const map = mapRef.current;
    const baseGeoJson = osidBaseRef.current;
    if (!mapReady || !map || !baseGeoJson || !loadedGameState) return;

    let cancelled = false;

    const runUpdate = () => {
      if (cancelled || !mapRef.current || !loadedGameState) return;
      const m = mapRef.current;
      const controlledGeoJson = buildControlGeoJSON(baseGeoJson, loadedGameState.controlBySettlement);
      const frontLinesGeoJson = buildFrontLinesGeoJSON(
        controlledGeoJson,
        loadedGameState.phase_i_alliance_rbih_hrhb
      );

      const osidSource = m.getSource('osid-control') as GeoJSONSource | undefined;
      const frontSource = m.getSource('front-lines') as GeoJSONSource | undefined;
      const formationsSource = m.getSource('formations') as GeoJSONSource | undefined;
      const orderArrowsSource = m.getSource('order-arrows') as GeoJSONSource | undefined;
      if (!osidSource || !frontSource || !formationsSource || !orderArrowsSource) {
        if (!cancelled && !sourceUpdatePollRef.current) {
          sourceUpdatePollRef.current = setInterval(() => {
            if (cancelled) return;
            runUpdate();
          }, 500);
        }
        return;
      }

      osidSource.setData(controlledGeoJson);
      frontSource.setData(frontLinesGeoJson);
      if (sourceUpdatePollRef.current) {
        clearInterval(sourceUpdatePollRef.current);
        sourceUpdatePollRef.current = null;
      }

      const frontEdgesOsid = loadedGameState.frontEdgesOsid;
      if (frontEdgesOsid && frontEdgesOsid.length > 0) {
        const frontEdgesHoverData = buildFrontEdgesHoverGeoJSON(controlledGeoJson, frontEdgesOsid);
        if (!m.getSource(FRONT_EDGES_HOVER_SOURCE_ID)) {
          m.addSource(FRONT_EDGES_HOVER_SOURCE_ID, { type: 'geojson', data: frontEdgesHoverData });
          m.addLayer(
            {
              id: FRONT_EDGES_HOVER_LAYER_ID,
              type: 'line',
              source: FRONT_EDGES_HOVER_SOURCE_ID,
              paint: {
                'line-width': ['interpolate', ['linear'], ['zoom'], 6, 6, 10, 12, 14, 18],
                'line-opacity': 0,
                'line-color': 'transparent',
              },
            },
            'formation-markers'
          );
        } else {
          (m.getSource(FRONT_EDGES_HOVER_SOURCE_ID) as GeoJSONSource).setData(frontEdgesHoverData);
        }
      }

      requestAnimationFrame(() => {
        if (cancelled || !mapRef.current || !loadedGameState) return;
        const m2 = mapRef.current;
        const formationsGeoJson = buildFormationsGeoJSON(loadedGameState, controlledGeoJson);
        const orderArrowsGeoJson = buildOrderArrowsGeoJSON(loadedGameState, controlledGeoJson);
        const iconIds = formationsGeoJson.features
          .map((f) => (typeof f.properties?.icon_id === 'string' ? f.properties.icon_id : ''))
          .filter((id) => id.length > 0);
        ensureFormationIcons(m2, iconIds);
        (m2.getSource('formations') as GeoJSONSource)?.setData(formationsGeoJson);
        (m2.getSource('order-arrows') as GeoJSONSource)?.setData(orderArrowsGeoJson);
      });
    };

    const rafId = requestAnimationFrame(() => runUpdate());

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (sourceUpdatePollRef.current) {
        clearInterval(sourceUpdatePollRef.current);
        sourceUpdatePollRef.current = null;
      }
    };
  }, [loadedGameState, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    const applyHoverFilter = () => {
      if (!map.getSource('osid-control')) return false;
      if (!map.getLayer(SIDEBAR_HOVER_LAYER_ID)) {
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
      const filter =
        hoveredOsids.length === 0
          ? (['==', ['get', 'osid'], '__none__'] as maplibregl.FilterSpecification)
          : (['in', ['get', 'osid'], ['literal', hoveredOsids]] as maplibregl.FilterSpecification);
      map.setFilter(SIDEBAR_HOVER_LAYER_ID, filter);
      return true;
    };

    if (applyHoverFilter()) return;
    const poll = setInterval(() => {
      if (applyHoverFilter()) clearInterval(poll);
    }, 250);
    return () => clearInterval(poll);
  }, [hoveredOsids, mapReady]);

  // Ethnic map mode: add osid-ethnic source and fill layer when we have base + osidPropertiesMap
  useEffect(() => {
    const map = mapRef.current;
    const baseGeoJson = osidBaseRef.current;
    if (!mapReady || !map || !baseGeoJson || !osidPropertiesMap || Object.keys(osidPropertiesMap).length === 0) return;

    const displacementByMun = loadedGameState?.displacementByMun ?? undefined;
    const ethnicGeoJson = buildEthnicGeoJSON(baseGeoJson, osidPropertiesMap, displacementByMun);

    const applyEthnic = () => {
      if (!mapRef.current) return;
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
          'faction-border-glow'
        );
      } else {
        (m.getSource(OSID_ETHNIC_SOURCE_ID) as GeoJSONSource).setData(ethnicGeoJson);
      }
      const showPolitical = mapMode === 'political' || mapMode === 'supply' || mapMode === 'pressure';
      if (m.getLayer('osid-control-fill')) m.setLayoutProperty('osid-control-fill', 'visibility', showPolitical ? 'visible' : 'none');
      if (m.getLayer(OSID_ETHNIC_FILL_LAYER_ID)) m.setLayoutProperty(OSID_ETHNIC_FILL_LAYER_ID, 'visibility', mapMode === 'ethnic' ? 'visible' : 'none');
    };

    let cancelled = false;
    const rafId = requestAnimationFrame(() => {
      if (!cancelled) applyEthnic();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [mapReady, osidPropertiesMap, mapMode, loadedGameState]);

  // Phase C2: apply layer visibility from store (after style loaded; re-apply when toggles change)
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    const applyVisibility = () => {
      const setVisibility = (layerId: string, visible: boolean) => {
        if (!map.getLayer(layerId)) return false;
        map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
        return true;
      };
      let allExist = true;
      FRONT_LAYER_IDS.forEach((id) => {
        if (!setVisibility(id, frontsVisible)) allExist = false;
      });
      if (!setVisibility(FORMATION_MARKERS_LAYER_ID, formationsVisible)) allExist = false;
      if (!setVisibility(FORMATION_LABELS_LAYER_ID, labelsVisible)) allExist = false;
      // Map mode: political/supply/pressure show control fill; ethnic shows ethnic fill
      const showPolitical = mapMode === 'political' || mapMode === 'supply' || mapMode === 'pressure';
      if (!setVisibility('osid-control-fill', showPolitical)) allExist = false;
      if (map.getLayer(OSID_ETHNIC_FILL_LAYER_ID) && !setVisibility(OSID_ETHNIC_FILL_LAYER_ID, mapMode === 'ethnic')) allExist = false;
      return allExist;
    };

    if (!applyVisibility()) {
      const onLoad = () => {
        applyVisibility();
        map.off('load', onLoad);
      };
      map.once('load', onLoad);
      return () => {
        map.off('load', onLoad);
      };
    }
  }, [mapReady, frontsVisible, formationsVisible, labelsVisible, mapMode]);

  // Phase C2: mapMode (political | ethnic | supply | pressure) — ethnic/supply/pressure
  // currently show same as political; add mode-specific layers/sources when data is ready.

  useEffect(() => {
    const map = mapRef.current;
    const lookup = osidCentroidsRef.current;
    if (!mapReady || !map || lookup.size === 0) return;

    let targetOsid: string | null = null;
    if (selectedFormationId && loadedGameState) {
      const formation = loadedGameState.formations.find((f) => f.id === selectedFormationId);
      if (formation) {
        targetOsid = resolveFormationLocationOsid(formation, lookup) ?? null;
      }
    }
    if (!targetOsid && selectedOsid) targetOsid = selectedOsid;
    if (!targetOsid) {
      lastPanTargetRef.current = null;
      return;
    }
    const center = lookup.get(targetOsid);
    if (!center) return;
    if (lastPanTargetRef.current === targetOsid) return;

    map.easeTo({ center, duration: 450, essential: true });
    lastPanTargetRef.current = targetOsid;
  }, [loadedGameState, mapReady, selectedFormationId, selectedOsid]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
