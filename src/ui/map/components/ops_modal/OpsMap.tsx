/**
 * Full-bleed MapLibre map for the ops planning modal.
 * Renders corps AO with paper-styled territory, front lines,
 * advance arrows, objective markers, and staging markers.
 * Persists across all 4 phases.
 */
import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import type { FeatureCollection, Feature, LineString, Polygon, MultiPolygon } from 'geojson';
import { useGameStore } from '../../store/gameStore';
import { loadOperationalSettlements } from '../../data/DataLoader';
import { buildControlGeoJSON } from '../../map/builders/buildControlGeoJSON';
import { buildOsidCentroidLookup } from '../../map/builders/geojsonLookup';
import { buildCorpsFrontLinesGeoJSON } from '../../map/builders/buildCorpsFrontLinesGeoJSON';
import { buildBezierCurve, buildArrowheadTriangle, buildTaperedArrowBody } from '../../map/builders/arrowGeometry';
import { rewritePmtilesUrls } from '../../map/rewritePmtilesUrls';
import styleJson from '../../map/awwv_map_style.json';
import type { AxisState } from './types';

// Faction-colored axis palettes
const AXIS_PALETTES: Record<string, string[]> = {
    RS: ['rgba(220,70,70,0.95)', 'rgba(255,140,100,0.90)', 'rgba(200,160,80,0.85)', 'rgba(180,100,100,0.80)'],
    RBiH: ['rgba(80,190,100,0.95)', 'rgba(100,200,180,0.90)', 'rgba(150,220,100,0.85)', 'rgba(80,160,120,0.80)'],
    HRHB: ['rgba(80,140,220,0.95)', 'rgba(120,180,255,0.90)', 'rgba(100,160,200,0.85)', 'rgba(80,120,180,0.80)'],
};
const DEFAULT_AXIS_COLORS = ['rgba(255,255,255,0.95)', 'rgba(100,200,255,0.90)', 'rgba(255,180,60,0.85)', 'rgba(200,120,255,0.80)'];

const ARROW_SOURCE_ID = 'ops-advance-arrows';
const EMPTY_FC: FeatureCollection = { type: 'FeatureCollection', features: [] };

interface OpsMapProps {
    corpsId: string;
    onOsidClick: (osid: string, isFriendly: boolean) => void;
    objectives: string[];
    stagingOsid: string | undefined;
    schwerpunktOsid: string;
    axes: AxisState[];
    faction: string;
    enabled: boolean;
    onCentroidLookupReady?: (lookup: Map<string, [number, number]>) => void;
}

export function OpsMap({
    corpsId,
    onOsidClick,
    objectives,
    stagingOsid,
    schwerpunktOsid,
    axes,
    faction,
    enabled,
    onCentroidLookupReady,
}: OpsMapProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const centroidLookupRef = useRef<Map<string, [number, number]>>(new Map());
    const controlDataRef = useRef<Record<string, string | null>>({});
    const geoJsonRef = useRef<FeatureCollection | null>(null);
    const loadedGameState = useGameStore((s) => s.loadedGameState);

    // Use ref for click handler to avoid stale closures (life lesson: never set handlers in separate effect)
    const clickStateRef = useRef({ onOsidClick, enabled });
    clickStateRef.current = { onOsidClick, enabled };

    // Initialize map once
    useEffect(() => {
        if (!mapContainerRef.current || !loadedGameState) return;

        const pmtilesProtocol = new Protocol();
        const origin = window.location.origin;
        try { maplibregl.addProtocol('pmtiles', pmtilesProtocol.tile); } catch { /* already registered */ }
        const style = rewritePmtilesUrls(styleJson as Record<string, unknown>, origin) as maplibregl.StyleSpecification;

        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style,
            center: [17.7, 43.87],
            zoom: 8,
            interactive: true,
            attributionControl: false,
        });
        mapRef.current = map;
        map.addControl(new maplibregl.NavigationControl(), 'top-right');

        const init = async () => {
            try {
                const geojson = await loadOperationalSettlements();
                geoJsonRef.current = geojson;
                const byOsid = loadedGameState.controlBySettlement ?? {};
                controlDataRef.current = byOsid;

                const centroidLookup = buildOsidCentroidLookup(geojson);
                centroidLookupRef.current = centroidLookup;
                onCentroidLookupReady?.(centroidLookup);

                // Fit bounds to corps sectors
                const sectors = (loadedGameState.corpsFrontSectors ?? []).filter((s) => s.corps_id === corpsId);
                const friendlyOsids = new Set<string>();
                for (const sec of sectors) {
                    for (const sub of (sec.sub_segments ?? [])) {
                        for (const osid of sub.friendly_osids) friendlyOsids.add(osid);
                    }
                }
                if (friendlyOsids.size > 0) {
                    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
                    for (const osid of friendlyOsids) {
                        const pt = centroidLookup.get(osid);
                        if (pt) {
                            if (pt[0] < minLng) minLng = pt[0];
                            if (pt[1] < minLat) minLat = pt[1];
                            if (pt[0] > maxLng) maxLng = pt[0];
                            if (pt[1] > maxLat) maxLat = pt[1];
                        }
                    }
                    if (minLng !== Infinity) {
                        map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 80, maxZoom: 10, animate: false });
                    }
                }

                // Territory fill
                const controlledGeoJson = buildControlGeoJSON(geojson, byOsid);
                const src = map.getSource('osid-control') as maplibregl.GeoJSONSource | undefined;
                if (src) {
                    src.setData(controlledGeoJson);
                }
                if (map.getLayer('osid-control-fill')) {
                    map.setPaintProperty('osid-control-fill', 'fill-opacity', 0.55);
                }

                // Corps AO highlight — territory belonging to this corps
                const corpsOsids = new Set<string>();
                for (const sec of sectors) {
                    for (const sub of (sec.sub_segments ?? [])) {
                        for (const osid of sub.friendly_osids) corpsOsids.add(osid);
                    }
                }
                const corpsTerritory: FeatureCollection = {
                    type: 'FeatureCollection',
                    features: geojson.features.filter((f) =>
                        corpsOsids.has((f.properties as Record<string, unknown>)?.osid as string ?? '')
                    ),
                };
                map.addSource('ops-corps-territory', { type: 'geojson', data: corpsTerritory });
                map.addLayer({
                    id: 'ops-corps-territory-fill', type: 'fill', source: 'ops-corps-territory',
                    paint: { 'fill-color': 'rgba(255,255,255,0.08)' },
                });
                map.addLayer({
                    id: 'ops-corps-territory-border', type: 'line', source: 'ops-corps-territory',
                    paint: { 'line-color': 'rgba(255,255,255,0.25)', 'line-width': 1 },
                });

                // Front lines
                const frontLineGeo = buildCorpsFrontLinesGeoJSON(
                    geojson,
                    loadedGameState.corpsFrontSectors ?? [],
                    false,
                    centroidLookup,
                    undefined,
                    loadedGameState.frontEdgesOsid,
                );
                map.addSource('ops-front-lines', { type: 'geojson', data: frontLineGeo });
                map.addLayer({
                    id: 'ops-front-glow', type: 'line', source: 'ops-front-lines',
                    filter: ['==', ['get', 'lineType'], 'glow'],
                    paint: {
                        'line-color': ['match', ['get', 'faction'],
                            'RS', 'rgba(255,100,100,0.4)',
                            'RBiH', 'rgba(100,255,100,0.4)',
                            'HRHB', 'rgba(100,100,255,0.4)',
                            'rgba(200,200,200,0.2)'],
                        'line-width': 12, 'line-blur': 15,
                    },
                });
                map.addLayer({
                    id: 'ops-front-line', type: 'line', source: 'ops-front-lines',
                    filter: ['==', ['get', 'lineType'], 'front'],
                    paint: { 'line-color': 'rgba(0,0,0,0.65)', 'line-width': 1.5 },
                });
                // Bright highlight on THIS corps' front lines
                map.addLayer({
                    id: 'ops-corps-front-glow', type: 'line', source: 'ops-front-lines',
                    filter: ['all',
                        ['==', ['get', 'lineType'], 'glow'],
                        ['==', ['get', 'corps_id'], corpsId],
                    ],
                    paint: { 'line-color': 'rgba(255,220,120,0.5)', 'line-width': 16, 'line-blur': 10 },
                });
                map.addLayer({
                    id: 'ops-corps-front-line', type: 'line', source: 'ops-front-lines',
                    filter: ['all',
                        ['==', ['get', 'lineType'], 'front'],
                        ['==', ['get', 'corps_id'], corpsId],
                    ],
                    paint: { 'line-color': 'rgba(255,220,120,0.8)', 'line-width': 2.5 },
                });

                // Objective highlight (dark red fill)
                map.addSource('ops-highlight-objectives', { type: 'geojson', data: EMPTY_FC });
                map.addLayer({ id: 'ops-highlight-objectives-fill', type: 'fill', source: 'ops-highlight-objectives',
                    paint: { 'fill-color': '#8b0000', 'fill-opacity': 0.25 } });
                map.addLayer({ id: 'ops-highlight-objectives-border', type: 'line', source: 'ops-highlight-objectives',
                    paint: { 'line-color': '#1a1a1a', 'line-width': 2, 'line-dasharray': [4, 2] } });

                // Staging highlight (green fill)
                map.addSource('ops-highlight-staging', { type: 'geojson', data: EMPTY_FC });
                map.addLayer({ id: 'ops-highlight-staging-fill', type: 'fill', source: 'ops-highlight-staging',
                    paint: { 'fill-color': '#2d6a4f', 'fill-opacity': 0.20 } });
                map.addLayer({ id: 'ops-highlight-staging-border', type: 'line', source: 'ops-highlight-staging',
                    paint: { 'line-color': '#40916c', 'line-width': 2 } });

                // Arrow layers
                addArrowLayers(map);

                // Click handler (via ref to avoid stale closures)
                const handleClick = (event: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
                    if (!clickStateRef.current.enabled) return;
                    const osid = event.features?.[0]?.properties?.osid;
                    if (typeof osid !== 'string' || osid.length === 0) return;
                    const controller = controlDataRef.current[osid] ?? null;
                    const corpsFormation = loadedGameState.formations.find((f) => f.id === corpsId);
                    const isFriendly = controller === corpsFormation?.faction;
                    clickStateRef.current.onOsidClick(osid, isFriendly);
                };

                for (const layerId of ['osid-control-fill', 'ops-highlight-objectives-fill', 'ops-highlight-staging-fill']) {
                    if (map.getLayer(layerId)) {
                        map.on('click', layerId, handleClick);
                        map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
                        map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
                    }
                }
            } catch (e) {
                console.warn('Failed to initialize ops map:', e);
            }
        };

        map.on('load', init);

        return () => {
            mapRef.current = null;
            map.remove();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [corpsId]); // Only reinit on corps change, not on every state change

    // Update overlays when objectives/staging/axes change
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !geoJsonRef.current) return;

        // Objective territories
        const objFeatures = geoJsonRef.current.features.filter(
            (f) => objectives.includes((f.properties as Record<string, unknown>)?.osid as string ?? '')
        );
        const objSrc = map.getSource('ops-highlight-objectives') as maplibregl.GeoJSONSource | undefined;
        if (objSrc) objSrc.setData({ type: 'FeatureCollection', features: objFeatures });

        // Staging territory
        const stagingSrc = map.getSource('ops-highlight-staging') as maplibregl.GeoJSONSource | undefined;
        if (stagingSrc) {
            const stgFeatures = stagingOsid
                ? geoJsonRef.current.features.filter(
                    (f) => (f.properties as Record<string, unknown>)?.osid === stagingOsid
                )
                : [];
            stagingSrc.setData({ type: 'FeatureCollection', features: stgFeatures });
        }

        // Arrows — build per-axis advance arrows
        updateArrows(map, axes, centroidLookupRef.current, faction);
    }, [objectives, stagingOsid, schwerpunktOsid, axes, faction]);

    return (
        <div
            ref={mapContainerRef}
            className="absolute inset-0"
            style={{ background: '#d6ccb7' }}
        />
    );
}

// --- Arrow source/layer management ---

function addArrowLayers(map: maplibregl.Map) {
    map.addSource(ARROW_SOURCE_ID, { type: 'geojson', data: EMPTY_FC });

    map.addLayer({
        id: 'ops-advance-glow', type: 'line', source: ARROW_SOURCE_ID,
        filter: ['==', ['get', 'type'], 'advance-glow'],
        paint: { 'line-color': ['get', 'color'], 'line-width': 18, 'line-blur': 8, 'line-opacity': 1.0 },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
    });
    map.addLayer({
        id: 'ops-advance-body', type: 'fill', source: ARROW_SOURCE_ID,
        filter: ['==', ['get', 'type'], 'advance-body'],
        paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 1 },
    });
    map.addLayer({
        id: 'ops-advance-body-outline', type: 'line', source: ARROW_SOURCE_ID,
        filter: ['==', ['get', 'type'], 'advance-body'],
        paint: { 'line-color': ['get', 'color'], 'line-width': 1.5, 'line-opacity': 0.8 },
    });
    map.addLayer({
        id: 'ops-advance-heads', type: 'fill', source: ARROW_SOURCE_ID,
        filter: ['==', ['get', 'type'], 'advance-head'],
        paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 1 },
    });
    map.addLayer({
        id: 'ops-advance-head-outline', type: 'line', source: ARROW_SOURCE_ID,
        filter: ['==', ['get', 'type'], 'advance-head'],
        paint: { 'line-color': ['get', 'color'], 'line-width': 2, 'line-opacity': 1 },
    });
    map.addLayer({
        id: 'ops-obj-labels', type: 'symbol', source: ARROW_SOURCE_ID,
        filter: ['==', ['get', 'type'], 'obj-label'],
        layout: {
            'text-field': ['get', 'label'], 'text-size': 14,
            'text-font': ['Open Sans Regular'], 'text-allow-overlap': true, 'text-offset': [0, -1.2],
        },
        paint: { 'text-color': ['get', 'color'], 'text-halo-color': 'rgba(0,0,0,0.8)', 'text-halo-width': 2 },
    });
}

function updateArrows(
    map: maplibregl.Map,
    axes: AxisState[],
    centroidLookup: Map<string, [number, number]>,
    faction: string,
) {
    const features: Feature[] = [];
    const palette = AXIS_PALETTES[faction] ?? DEFAULT_AXIS_COLORS;

    axes.forEach((axis, axisIdx) => {
        const color = palette[axisIdx % palette.length];
        const staging = axis.stagingOsid ? centroidLookup.get(axis.stagingOsid) : null;

        axis.objectives.forEach((obj, objIdx) => {
            const objPt = centroidLookup.get(obj);
            if (!objPt) return;

            // Arrow from staging/previous objective to this objective
            const fromPt = objIdx === 0
                ? (staging ?? (centroidLookup.get(axis.objectives[0]) ?? null))
                : centroidLookup.get(axis.objectives[objIdx - 1]);

            if (fromPt && (fromPt[0] !== objPt[0] || fromPt[1] !== objPt[1])) {
                // Build bezier curve from source to target
                const curve = buildBezierCurve(fromPt, objPt, 0.02);

                // Glow line
                features.push({
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: curve },
                    properties: { type: 'advance-glow', color: color.replace(/[\d.]+\)$/, '0.25)') },
                });

                // Arrow body (tapered polygon)
                const bodyCoords = buildTaperedArrowBody(curve, 0.008, 0.004);
                if (bodyCoords) {
                    features.push({
                        type: 'Feature',
                        geometry: { type: 'Polygon', coordinates: [bodyCoords] },
                        properties: { type: 'advance-body', color },
                    });
                }

                // Arrow head
                const headCoords = buildArrowheadTriangle(curve);
                if (headCoords) {
                    features.push({
                        type: 'Feature',
                        geometry: { type: 'Polygon', coordinates: [headCoords] },
                        properties: { type: 'advance-head', color },
                    });
                }
            }

            // Objective label
            features.push({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: objPt },
                properties: { type: 'obj-label', label: `${axisIdx + 1}.${objIdx + 1}`, color },
            });
        });
    });

    const src = map.getSource(ARROW_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (src) {
        src.setData({ type: 'FeatureCollection', features });
    }
}

