/**
 * Full-bleed MapLibre map for the ops planning modal.
 * Renders corps AO with paper-styled territory, front lines,
 * advance arrows, objective markers, and staging markers.
 * Persists across all 4 phases.
 */
import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { PathLayer, PolygonLayer, TextLayer } from '@deck.gl/layers';
import { PathStyleExtension } from '@deck.gl/extensions';
import type { FeatureCollection } from 'geojson';
import { useGameStore } from '../../store/gameStore';
import { loadOperationalSettlements, loadTerrainScalars, type TerrainScalars } from '../../data/DataLoader';
import { buildControlGeoJSON } from '../../map/builders/buildControlGeoJSON';
import { buildOsidCentroidLookup } from '../../map/builders/geojsonLookup';
import { buildCorpsFrontLinesGeoJSON } from '../../map/builders/buildCorpsFrontLinesGeoJSON';
import { buildBezierCurve, buildArrowheadTriangle } from '../../map/builders/arrowGeometry';
import { rewritePmtilesUrls } from '../../map/rewritePmtilesUrls';
import styleJson from '../../map/awwv_map_style.json';
import { ModalMapSource } from '../../utils/ModalMapSource';
import type { AxisState } from './types';

// Faction-colored axis palettes
const AXIS_PALETTES: Record<string, string[]> = {
    RS: ['rgba(220,70,70,0.95)', 'rgba(255,140,100,0.90)', 'rgba(200,160,80,0.85)', 'rgba(180,100,100,0.80)'],
    RBiH: ['rgba(80,190,100,0.95)', 'rgba(100,200,180,0.90)', 'rgba(150,220,100,0.85)', 'rgba(80,160,120,0.80)'],
    HRHB: ['rgba(80,140,220,0.95)', 'rgba(120,180,255,0.90)', 'rgba(100,160,200,0.85)', 'rgba(80,120,180,0.80)'],
};
const DEFAULT_AXIS_COLORS = ['rgba(255,255,255,0.95)', 'rgba(100,200,255,0.90)', 'rgba(255,180,60,0.85)', 'rgba(200,120,255,0.80)'];

interface OpsMapProps {
    corpsId: string;
    onOsidClick: (osid: string, isFriendly: boolean) => void;
    objectives: string[];
    validTargetOsids: Set<string>;
    selectableOsids: Set<string>;
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
    validTargetOsids,
    selectableOsids,
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
    const [mapReady, setMapReady] = useState(false);
    const loadedGameState = useGameStore((s) => s.loadedGameState);

    // ModalMapSource refs — safe remove+re-add pattern for modal map sources
    const objectivesSourceRef = useRef<ModalMapSource | null>(null);
    const stagingSourceRef = useRef<ModalMapSource | null>(null);
    const dimmedSourceRef = useRef<ModalMapSource | null>(null);

    // Deck.gl overlay for animated arrows
    const deckOverlayRef = useRef<MapboxOverlay | null>(null);
    const animFrameRef = useRef<number>(0);
    const dashOffsetRef = useRef(0);

    // Terrain data for hover tooltip
    const terrainDataRef = useRef<Map<string, TerrainScalars>>(new Map());
    const popupRef = useRef<maplibregl.Popup | null>(null);

    // Use ref for click handler to avoid stale closures (life lesson: never set handlers in separate effect)
    const clickStateRef = useRef({ onOsidClick, enabled, validTargetOsids, selectableOsids });
    clickStateRef.current = { onOsidClick, enabled, validTargetOsids, selectableOsids };

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
            pitch: 30,
            interactive: true,
            attributionControl: false,
        });
        mapRef.current = map;
        map.addControl(new maplibregl.NavigationControl(), 'top-right');

        const init = async () => {
            try {
                const [geojson, terrainScalars] = await Promise.all([
                    loadOperationalSettlements(),
                    loadTerrainScalars(),
                ]);
                geoJsonRef.current = geojson;
                terrainDataRef.current = terrainScalars;
                const byOsid = loadedGameState.controlBySettlement ?? {};
                controlDataRef.current = byOsid;

                const centroidLookup = buildOsidCentroidLookup(geojson);
                centroidLookupRef.current = centroidLookup;
                onCentroidLookupReady?.(centroidLookup);

                // Fit bounds to corps sectors with terrain-aware camera bearing
                const sectors = (loadedGameState.corpsFrontSectors ?? []).filter((s) => s.corps_id === corpsId);
                const aoFriendlyOsids = new Set<string>();
                const aoEnemyOsids = new Set<string>();
                for (const sec of sectors) {
                    for (const sub of (sec.sub_segments ?? [])) {
                        for (const osid of sub.friendly_osids) aoFriendlyOsids.add(osid);
                        for (const osid of sub.enemy_osids) aoEnemyOsids.add(osid);
                    }
                }
                if (aoFriendlyOsids.size > 0) {
                    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
                    for (const osid of [...aoFriendlyOsids, ...aoEnemyOsids]) {
                        const pt = centroidLookup.get(osid);
                        if (pt) {
                            if (pt[0] < minLng) minLng = pt[0];
                            if (pt[1] < minLat) minLat = pt[1];
                            if (pt[0] > maxLng) maxLng = pt[0];
                            if (pt[1] > maxLat) maxLat = pt[1];
                        }
                    }
                    if (minLng !== Infinity) {
                        map.fitBounds([[minLng, minLat], [maxLng, maxLat]], {
                            padding: 80, maxZoom: 10, animate: false,
                            bearing: 0,
                            pitch: 30,
                        });
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

                // Valid enemy targets — front-adjacent OSIDs highlighted with subtle red tint
                const enemyOsids = new Set<string>();
                for (const sec of sectors) {
                    for (const sub of (sec.sub_segments ?? [])) {
                        for (const osid of sub.enemy_osids) enemyOsids.add(osid);
                    }
                }
                const targetableFeatures: FeatureCollection = {
                    type: 'FeatureCollection',
                    features: geojson.features.filter((f) =>
                        enemyOsids.has((f.properties as Record<string, unknown>)?.osid as string ?? '')
                    ),
                };
                map.addSource('ops-valid-targets', { type: 'geojson', data: targetableFeatures });
                map.addLayer({
                    id: 'ops-valid-targets-fill', type: 'fill', source: 'ops-valid-targets',
                    paint: { 'fill-color': 'rgba(200,60,60,0.12)' },
                });
                map.addLayer({
                    id: 'ops-valid-targets-border', type: 'line', source: 'ops-valid-targets',
                    paint: { 'line-color': 'rgba(200,60,60,0.3)', 'line-width': 1, 'line-dasharray': [3, 2] },
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

                // Objective highlight (dark red fill) — ModalMapSource for safe updates
                objectivesSourceRef.current = new ModalMapSource(map, 'ops-highlight-objectives', [
                    { id: 'ops-highlight-objectives-fill', type: 'fill',
                        paint: { 'fill-color': '#8b0000', 'fill-opacity': 0.25 } },
                    { id: 'ops-highlight-objectives-border', type: 'line',
                        paint: { 'line-color': '#1a1a1a', 'line-width': 2, 'line-dasharray': [4, 2] } },
                ]);
                objectivesSourceRef.current.init();

                // Staging highlight (green fill) — ModalMapSource for safe updates
                stagingSourceRef.current = new ModalMapSource(map, 'ops-highlight-staging', [
                    { id: 'ops-highlight-staging-fill', type: 'fill',
                        paint: { 'fill-color': '#2d6a4f', 'fill-opacity': 0.20 } },
                    { id: 'ops-highlight-staging-border', type: 'line',
                        paint: { 'line-color': '#40916c', 'line-width': 2 } },
                ]);
                stagingSourceRef.current.init();

                // Dimmed overlay for non-selectable OSIDs
                dimmedSourceRef.current = new ModalMapSource(map, 'ops-dimmed-osids', [
                    { id: 'ops-dimmed-fill', type: 'fill',
                        paint: { 'fill-color': '#000000', 'fill-opacity': 0.45 } },
                ]);
                dimmedSourceRef.current.init();

                // Deck.gl overlay for animated advance arrows
                const deckOverlay = new MapboxOverlay({ interleaved: true, layers: [] });
                map.addControl(deckOverlay as any);
                deckOverlayRef.current = deckOverlay;

                // Single map-level click handler — query features at click point
                // Using per-layer handlers causes double-fire when layers overlap
                const corpsFormation = loadedGameState.formations.find((f) => f.id === corpsId);
                const playerFaction = corpsFormation?.faction ?? '';

                map.on('click', (event) => {
                    if (!clickStateRef.current.enabled) return;
                    // Query all polygon fill layers at click point
                    const queryLayers = ['osid-control-fill', 'ops-corps-territory-fill',
                        'ops-highlight-objectives-fill', 'ops-highlight-staging-fill']
                        .filter((id) => map.getLayer(id));
                    const features = map.queryRenderedFeatures(event.point, { layers: queryLayers });
                    if (features.length === 0) return;
                    // Use the first feature's OSID (topmost layer)
                    const osid = features[0]?.properties?.osid;
                    if (typeof osid !== 'string' || osid.length === 0) return;
                    const controller = controlDataRef.current[osid] ?? null;
                    const isFriendly = controller === playerFaction;
                    // Enemy targets must be front-adjacent (contiguity rule)
                    if (!isFriendly && !clickStateRef.current.validTargetOsids.has(osid)) return;
                    // Enforce selectability constraints (staging↔objective adjacency)
                    if (!clickStateRef.current.selectableOsids.has(osid)) return;
                    clickStateRef.current.onOsidClick(osid, isFriendly);
                });

                // Cursor + terrain tooltip on hover
                const popup = new maplibregl.Popup({
                    closeButton: false, closeOnClick: false,
                    className: 'ops-terrain-tooltip',
                    maxWidth: '240px',
                    offset: [0, -12],
                });
                popupRef.current = popup;

                map.on('mousemove', (event) => {
                    if (!clickStateRef.current.enabled) {
                        map.getCanvas().style.cursor = '';
                        popup.remove();
                        return;
                    }
                    const queryLayers = ['osid-control-fill', 'ops-corps-territory-fill']
                        .filter((id) => map.getLayer(id));
                    const features = map.queryRenderedFeatures(event.point, { layers: queryLayers });
                    const props = features[0]?.properties as Record<string, unknown> | undefined;
                    const hoveredOsid = props?.osid as string | undefined;
                    const isSelectable = hoveredOsid ? clickStateRef.current.selectableOsids.has(hoveredOsid) : false;
                    map.getCanvas().style.cursor = (features.length > 0 && isSelectable) ? 'pointer' : '';

                    if (!hoveredOsid || !props) { popup.remove(); return; }

                    // Build terrain tooltip content
                    const sid = props.sid as string | undefined;
                    const name = props.settlement_name as string ?? hoveredOsid;
                    const terrain = sid ? terrainDataRef.current.get(sid) : undefined;
                    const controller = controlDataRef.current[hoveredOsid] ?? '—';
                    const selLabel = isSelectable
                        ? '<span style="color:#56d364">selectable</span>'
                        : '<span style="color:#f47068">out of range</span>';

                    let html = `<div style="font-size:12px;line-height:1.5;">`;
                    html += `<strong>${name}</strong> ${selLabel}<br>`;
                    html += `<span style="color:#8b9bb0">Held by: </span>${controller}<br>`;
                    if (terrain) {
                        const elev = Math.round(terrain.elevation_mean_m);
                        const slope = Math.round(terrain.slope_index * 100);
                        const friction = terrain.terrain_friction_index;
                        const terrainType = friction > 0.5 ? 'Mountain' : friction > 0.3 ? 'Hilly' : friction > 0.15 ? 'Rolling' : 'Flat';
                        const defBonus = friction > 0.5 ? '+50%' : friction > 0.3 ? '+30%' : friction > 0.15 ? '+15%' : '—';
                        html += `<span style="color:#8b9bb0">Elevation: </span>${elev}m`;
                        html += ` <span style="color:#6b7d93">(${terrainType})</span><br>`;
                        html += `<span style="color:#8b9bb0">Slope: </span>${slope}%`;
                        html += ` <span style="color:#8b9bb0">Def bonus: </span>${defBonus}<br>`;
                        if (terrain.river_crossing_penalty > 0) {
                            html += `<span style="color:#58a6ff">River crossing penalty</span><br>`;
                        }
                        if (terrain.road_access_index < 0.5) {
                            html += `<span style="color:#e8a838">Poor road access</span><br>`;
                        }
                    }
                    html += `</div>`;

                    popup.setLngLat(event.lngLat).setHTML(html).addTo(map);
                });

                // Enable 3D terrain — source defined in style JSON, just activate extrusion
                map.setTerrain({ source: 'terrain-dem', exaggeration: 2.5 });

                setMapReady(true);
            } catch (e) {
                console.warn('Failed to initialize ops map:', e);
            }
        };

        map.on('load', init);

        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            popupRef.current?.remove();
            objectivesSourceRef.current?.destroy();
            stagingSourceRef.current?.destroy();
            dimmedSourceRef.current?.destroy();
            popupRef.current = null;
            objectivesSourceRef.current = null;
            stagingSourceRef.current = null;
            dimmedSourceRef.current = null;
            deckOverlayRef.current = null;
            mapRef.current = null;
            setMapReady(false);
            map.remove();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [corpsId, !!loadedGameState]); // Reinit on corps change or when game state first loads

    // Update overlays when objectives/staging/axes change, or map finishes loading
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !geoJsonRef.current || !mapReady) return;

        // Objective territories — safe remove+re-add via ModalMapSource
        const objFeatures = geoJsonRef.current.features.filter(
            (f) => objectives.includes((f.properties as Record<string, unknown>)?.osid as string ?? '')
        );
        objectivesSourceRef.current?.setData({ type: 'FeatureCollection', features: objFeatures });

        // Staging territory — safe remove+re-add via ModalMapSource
        const stgFeatures = stagingOsid
            ? geoJsonRef.current.features.filter(
                (f) => (f.properties as Record<string, unknown>)?.osid === stagingOsid
            )
            : [];
        stagingSourceRef.current?.setData({ type: 'FeatureCollection', features: stgFeatures });

        // Dim non-selectable OSIDs — dark overlay on everything NOT in selectableOsids
        if (enabled && selectableOsids.size > 0) {
            const dimmedFeatures = geoJsonRef.current.features.filter((f) => {
                const osid = (f.properties as Record<string, unknown>)?.osid as string ?? '';
                return osid.length > 0 && !selectableOsids.has(osid);
            });
            dimmedSourceRef.current?.setData({ type: 'FeatureCollection', features: dimmedFeatures });
        } else {
            dimmedSourceRef.current?.setData({ type: 'FeatureCollection', features: [] });
        }

        // Arrows — build Deck.gl animated advance arrows
        const arrowData = buildArrowData(axes, centroidLookupRef.current, faction, stagingOsid, controlDataRef.current);
        updateDeckArrows(deckOverlayRef.current, arrowData, dashOffsetRef);

        // Start animation loop if we have arrows
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (arrowData.paths.length > 0 && deckOverlayRef.current) {
            const animate = () => {
                dashOffsetRef.current = (dashOffsetRef.current + 0.3) % 1000;
                updateDeckArrows(deckOverlayRef.current, arrowData, dashOffsetRef);
                animFrameRef.current = requestAnimationFrame(animate);
            };
            animFrameRef.current = requestAnimationFrame(animate);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [objectives, stagingOsid, axes, faction, mapReady, selectableOsids, enabled]);

    // WP4a FIX: When map interaction is disabled (non-plan phases), set pointer-events-none
    // on the entire map container. This prevents MapLibre canvas from intercepting clicks
    // that should reach the phase overlay panels (CommanderPhase, G2Phase, AuthorizePhase).
    // The phase panels have pointer-events-auto on their interactive children, which works
    // correctly when the MapLibre canvas beneath cannot steal clicks.
    return (
        <>
            <div
                ref={mapContainerRef}
                className={`absolute inset-0 ${enabled ? '' : 'pointer-events-none'}`}
                style={{ background: '#d6ccb7' }}
            />
            {/* WP4j: Compact map legend — Plan phase only */}
            {enabled && (
                <div className="absolute bottom-4 left-4 z-20 pointer-events-auto
                                bg-[rgba(20,18,15,0.85)] backdrop-blur-sm rounded-md
                                border border-[rgba(180,160,130,0.15)] px-3 py-2 text-[8px]">
                    <div className="text-accent-gold font-bold uppercase tracking-wider mb-1">Legend</div>
                    <div className="space-y-0.5 text-text-secondary">
                        <div><span className="inline-block w-2 h-2 rounded-full bg-red-800 mr-1" /> Objective &middot; <span className="text-accent-gold">&#9733;</span> Schwerpunkt &middot; <span className="inline-block w-2 h-2 rounded-full bg-[#2d6a4f] mr-1" /> Staging</div>
                        <div><span className="inline-block w-3 h-0.5 bg-[rgba(255,220,120,0.8)] mr-1" /> Corps front &middot; Bright = selectable &middot; Dim = out of range</div>
                    </div>
                </div>
            )}
        </>
    );
}

// --- Deck.gl animated arrow data structures ---

interface ArrowPathData {
    path: [number, number][];
    color: [number, number, number, number];
    width: number;
}

interface ArrowHeadData {
    polygon: [number, number][];
    color: [number, number, number, number];
}

interface ArrowLabelData {
    position: [number, number];
    text: string;
    color: [number, number, number, number];
}

interface ArrowBuildResult {
    paths: ArrowPathData[];
    heads: ArrowHeadData[];
    labels: ArrowLabelData[];
}

/** Parse "rgba(r,g,b,a)" to [r,g,b,a*255] for Deck.gl */
function parseRgba(rgba: string): [number, number, number, number] {
    const m = rgba.match(/[\d.]+/g);
    if (!m || m.length < 4) return [255, 255, 255, 200];
    return [+m[0], +m[1], +m[2], Math.round(+m[3] * 255)];
}

function findNearestCentroid(
    target: [number, number],
    candidates: Map<string, [number, number]>,
    controlData: Record<string, string | null>,
    faction: string,
): [number, number] | null {
    let best: [number, number] | null = null;
    let bestDist = Infinity;
    for (const [osid, pt] of candidates) {
        if (controlData[osid] !== faction) continue;
        const d = (pt[0] - target[0]) ** 2 + (pt[1] - target[1]) ** 2;
        if (d < bestDist) { bestDist = d; best = pt; }
    }
    return best;
}

/** Build arrow geometry data for Deck.gl layers (no GeoJSON intermediate). */
function buildArrowData(
    axes: AxisState[],
    centroidLookup: Map<string, [number, number]>,
    faction: string,
    defaultStagingOsid?: string,
    controlData?: Record<string, string | null>,
): ArrowBuildResult {
    const result: ArrowBuildResult = { paths: [], heads: [], labels: [] };
    if (centroidLookup.size === 0) return result;
    const palette = AXIS_PALETTES[faction] ?? DEFAULT_AXIS_COLORS;

    axes.forEach((axis, axisIdx) => {
        const colorStr = palette[axisIdx % palette.length];
        const color = parseRgba(colorStr);
        const effectiveStaging = axis.stagingOsid ?? defaultStagingOsid;
        let stagingPt = effectiveStaging ? centroidLookup.get(effectiveStaging) : null;
        if (!stagingPt && axis.objectives.length > 0 && controlData) {
            const firstObjPt = centroidLookup.get(axis.objectives[0]);
            if (firstObjPt) {
                stagingPt = findNearestCentroid(firstObjPt, centroidLookup, controlData, faction);
            }
        }

        axis.objectives.forEach((obj, objIdx) => {
            const objPt = centroidLookup.get(obj);
            if (!objPt) return;

            const fromPt = objIdx === 0
                ? stagingPt
                : centroidLookup.get(axis.objectives[objIdx - 1]);

            if (fromPt && (fromPt[0] !== objPt[0] || fromPt[1] !== objPt[1])) {
                const dx = objPt[0] - fromPt[0];
                const dy = objPt[1] - fromPt[1];
                const len = Math.sqrt(dx * dx + dy * dy);
                if (len < 0.001) return;

                const offsetMag = len * 0.10;
                const headLength = Math.max(0.009, len * 0.035) * 1.8;
                const headWidth = Math.max(0.009, len * 0.035);
                const curve = buildBezierCurve(fromPt, objPt, offsetMag);

                // Path for the body
                result.paths.push({ path: curve, color, width: 8 });

                // Arrowhead triangle
                const headCoords = buildArrowheadTriangle(curve, headLength, headWidth);
                if (headCoords) {
                    result.heads.push({ polygon: headCoords, color });
                }
            }

            // Label
            result.labels.push({
                position: objPt,
                text: `${axisIdx + 1}.${objIdx + 1}`,
                color,
            });
        });
    });

    return result;
}

/** Update the Deck.gl overlay with animated arrow layers. */
function updateDeckArrows(
    overlay: MapboxOverlay | null,
    data: ArrowBuildResult,
    dashOffsetRef: React.MutableRefObject<number>,
) {
    if (!overlay) return;

    const layers = [];

    if (data.paths.length > 0) {
        // Glow layer — wide, semi-transparent, no dash
        layers.push(new PathLayer({
            id: 'ops-arrow-glow',
            data: data.paths,
            getPath: (d: ArrowPathData) => d.path,
            getColor: (d: ArrowPathData) => [d.color[0], d.color[1], d.color[2], 60],
            getWidth: 22,
            widthUnits: 'pixels',
            capRounded: true,
            jointRounded: true,
            parameters: { depthTest: false },
        }));

        // Body — faction-colored with animated marching dashes
        layers.push(new PathLayer({
            id: 'ops-arrow-body',
            data: data.paths,
            getPath: (d: ArrowPathData) => d.path,
            getColor: (d: ArrowPathData) => d.color,
            getWidth: (d: ArrowPathData) => d.width,
            widthUnits: 'pixels',
            capRounded: true,
            jointRounded: true,
            getDashArray: [8, 4],
            dashGapPickable: true,
            dashJustified: true,
            extensions: [new PathStyleExtension({ dash: true, offset: true })],
            getOffset: 0,
            parameters: { depthTest: false },
            updateTriggers: { getOffset: dashOffsetRef.current },
        } as any));

        // Solid outline beneath the dashes
        layers.push(new PathLayer({
            id: 'ops-arrow-outline',
            data: data.paths,
            getPath: (d: ArrowPathData) => d.path,
            getColor: (d: ArrowPathData) => [d.color[0], d.color[1], d.color[2], 180],
            getWidth: (d: ArrowPathData) => d.width + 2,
            widthUnits: 'pixels',
            capRounded: true,
            jointRounded: true,
            parameters: { depthTest: false },
        }));
    }

    if (data.heads.length > 0) {
        layers.push(new PolygonLayer({
            id: 'ops-arrow-heads',
            data: data.heads,
            getPolygon: (d: ArrowHeadData) => d.polygon,
            getFillColor: (d: ArrowHeadData) => d.color,
            getLineColor: (d: ArrowHeadData) => [d.color[0], d.color[1], d.color[2], 255],
            getLineWidth: 2,
            lineWidthUnits: 'pixels',
            filled: true,
            stroked: true,
            parameters: { depthTest: false },
        }));
    }

    if (data.labels.length > 0) {
        layers.push(new TextLayer({
            id: 'ops-arrow-labels',
            data: data.labels,
            getPosition: (d: ArrowLabelData) => d.position,
            getText: (d: ArrowLabelData) => d.text,
            getColor: (d: ArrowLabelData) => d.color,
            getSize: 14,
            getTextAnchor: 'middle',
            getAlignmentBaseline: 'bottom',
            getPixelOffset: [0, -16],
            outlineColor: [0, 0, 0, 200],
            outlineWidth: 2,
            fontFamily: 'sans-serif',
            fontWeight: 700,
            parameters: { depthTest: false },
        }));
    }

    overlay.setProps({ layers });
}


