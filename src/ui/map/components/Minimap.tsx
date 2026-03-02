/**
 * Minimap component (Phase 3 remainder, HOI spec §6.2).
 * Second MapLibre instance showing simplified faction control + front lines
 * with a viewport rectangle synced to the main map.
 *
 * Position: bottom-left, 250x180px. Click → pan main map.
 */
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection, Feature, Polygon } from 'geojson';
import { useGameStore } from '../store/gameStore';

const MINIMAP_WIDTH = 250;
const MINIMAP_HEIGHT = 180;
const BOSNIA_CENTER: [number, number] = [17.7, 43.87];

/**
 * Build a GeoJSON rectangle feature from main map bounds for the viewport overlay.
 */
function buildViewportRectangle(bounds: [number, number, number, number]): FeatureCollection {
  const [west, south, east, north] = bounds;
  const feature: Feature<Polygon> = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ]],
    },
  };
  return { type: 'FeatureCollection', features: [feature] };
}

/** Minimal inline style for minimap — no PMTiles, just GeoJSON layers. */
function buildMinimapStyle(): maplibregl.StyleSpecification {
  return {
    version: 8,
    sources: {
      'minimap-control': {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      },
      'minimap-fronts': {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      },
      'minimap-viewport': {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      },
    },
    layers: [
      {
        id: 'minimap-bg',
        type: 'background',
        paint: { 'background-color': '#1c1a17' },
      },
      {
        id: 'minimap-control-fill',
        type: 'fill',
        source: 'minimap-control',
        paint: {
          'fill-color': [
            'match',
            ['get', 'controller'],
            'RS', 'rgba(176, 50, 50, 0.45)',
            'RBiH', 'rgba(55, 140, 75, 0.45)',
            'HRHB', 'rgba(50, 110, 170, 0.45)',
            'rgba(80, 80, 80, 0.2)',
          ] as maplibregl.ExpressionSpecification,
          'fill-outline-color': 'rgba(100, 90, 70, 0.3)',
        },
      },
      {
        id: 'minimap-front-lines',
        type: 'line',
        source: 'minimap-fronts',
        paint: {
          'line-color': '#ddd5c8',
          'line-width': 1.5,
          'line-opacity': 0.7,
        },
      },
      {
        id: 'minimap-viewport-outline',
        type: 'line',
        source: 'minimap-viewport',
        paint: {
          'line-color': '#ffffff',
          'line-width': 1.5,
          'line-opacity': 0.9,
        },
      },
      {
        id: 'minimap-viewport-fill',
        type: 'fill',
        source: 'minimap-viewport',
        paint: {
          'fill-color': 'rgba(255, 255, 255, 0.08)',
        },
      },
    ],
  };
}

export function Minimap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const minimapVisible = useGameStore((s) => s.minimapVisible);
  const mapViewport = useGameStore((s) => s.mapViewport);
  const loadedGameState = useGameStore((s) => s.loadedGameState);

  // Initialize minimap
  useEffect(() => {
    if (!containerRef.current || !minimapVisible) return;

    const style = buildMinimapStyle();
    const map = new maplibregl.Map({
      container: containerRef.current,
      style,
      center: BOSNIA_CENTER,
      zoom: 6.2,
      interactive: false,
      attributionControl: false,
    });
    mapRef.current = map;

    // Click to pan main map
    map.on('click', (e) => {
      const fn = useGameStore.getState().panToCenter;
      if (fn) fn([e.lngLat.lng, e.lngLat.lat]);
    });

    // Make minimap clickable (cursor)
    map.getCanvas().style.cursor = 'pointer';

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [minimapVisible]);

  // Update control + front data when game state changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedGameState) return;

    const waitForLoad = () => {
      // Update control source from main map's data
      const controlSource = map.getSource('minimap-control') as GeoJSONSource | undefined;
      const frontSource = map.getSource('minimap-fronts') as GeoJSONSource | undefined;
      if (!controlSource || !frontSource) return;

      // Re-use the osid-control data from the main map store
      // We access the base GeoJSON from the loaded state's controlBySettlement
      // For minimap we just need simple polygons — re-fetch from window or compute
      // Actually we import the builders inline to avoid circular deps
      import('../data/DataLoader').then(async ({ loadOperationalSettlements }) => {
        try {
          const geojson = await loadOperationalSettlements();
          const { buildControlGeoJSON } = await import('../map/builders/buildControlGeoJSON');
          const { buildFrontLinesGeoJSON } = await import('../map/builders/buildFrontLinesGeoJSON');

          const controlGeo = buildControlGeoJSON(geojson, loadedGameState.controlBySettlement);
          controlSource.setData(controlGeo);

          const frontGeo = buildFrontLinesGeoJSON(controlGeo, loadedGameState.war_alliance_rbih_hrhb);
          frontSource.setData(frontGeo);
        } catch (e) {
          console.warn('[Minimap] Failed to update data:', e);
        }
      });
    };

    if (map.loaded()) {
      waitForLoad();
    } else {
      map.on('load', waitForLoad);
    }
  }, [loadedGameState]);

  // Update viewport rectangle when main map moves
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapViewport) return;

    const viewportSource = map.getSource('minimap-viewport') as GeoJSONSource | undefined;
    if (!viewportSource) return;

    viewportSource.setData(buildViewportRectangle(mapViewport.bounds));
  }, [mapViewport]);

  if (!minimapVisible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: '1rem',
        bottom: '2.5rem',
        width: MINIMAP_WIDTH,
        height: MINIMAP_HEIGHT,
        zIndex: 10,
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid rgba(180, 160, 130, 0.25)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
