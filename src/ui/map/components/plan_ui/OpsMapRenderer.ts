import maplibregl from 'maplibre-gl';
import bezier from '@turf/bezier-spline';
import { lineString } from '@turf/helpers';
import { rewritePmtilesUrls } from '../../map/rewritePmtilesUrls';
import { ensurePmtilesProtocol } from '../../map/pmtilesProtocol';
import { loadOperationalSettlements } from '../../data/DataLoader';
import { buildControlGeoJSON } from '../../map/builders/buildControlGeoJSON';
import { buildFrontLinesGeoJSON } from '../../map/builders/buildFrontLinesGeoJSON';
import { ModalMapSource } from '../../utils/ModalMapSource';
import styleJson from '../../map/awwv_map_style.json';
import type { Feature, FeatureCollection, LineString } from 'geojson';

export type OpType = 'offensive' | 'feint' | 'recon';

export interface AxisRenderingData {
    id: string;
    stagingCoords: [number, number] | null;
    objectiveCoords: [number, number][];
    color: string;
}

interface AxisFeatureProperties {
    id: string;
    color: string;
    isFeint: boolean;
}

const BOSNIA_CENTER: [number, number] = [17.7, 43.87];
const DEFAULT_ZOOM = 8;
const EMPTY_GEOJSON: FeatureCollection = { type: 'FeatureCollection', features: [] };
const OPS_MAP_DEBUG = false;

function debugOpsMap(...args: unknown[]): void {
    if (OPS_MAP_DEBUG) console.debug('[OpsMap]', ...args);
}

export class OpsMapRenderer {
    private map!: maplibregl.Map;
    private mapReady: Promise<void>;
    private resolveMapReady!: () => void;
    private opType: OpType = 'offensive';
    private ready = false;
    private playerFaction: string | null = null;
    private osidDataSource: ModalMapSource | null = null;
    private arrowsSource: ModalMapSource | null = null;
    private markersSource: ModalMapSource | null = null;
    public onOsidClick?: (osid: string) => void;

    constructor(container: HTMLElement, controlBySettlement?: Record<string, string | null>, playerFaction?: string) {
        this.playerFaction = playerFaction ?? null;
        this.mapReady = new Promise(resolve => { this.resolveMapReady = resolve; });
        const origin = window.location.origin;
        ensurePmtilesProtocol();

        const style = rewritePmtilesUrls(
            JSON.parse(JSON.stringify(styleJson)) as Record<string, unknown>,
            origin
        ) as maplibregl.StyleSpecification;

        // Pre-populate game data into the style before map init
        this.initWithGameData(style, container, controlBySettlement);
    }

    private async initWithGameData(
        style: maplibregl.StyleSpecification,
        container: HTMLElement,
        controlBySettlement?: Record<string, string | null>,
    ) {
        try {
            const geojson = await loadOperationalSettlements();
            // Use live game-state control if provided, otherwise geojson has no faction color
            const byOsid = controlBySettlement ?? {};

            const controlledGeoJson = buildControlGeoJSON(geojson, byOsid);
            const frontLinesGeoJson = buildFrontLinesGeoJSON(controlledGeoJson);

            const sources = style.sources as Record<string, { type?: string; data?: FeatureCollection }>;
            if (sources['osid-control']) sources['osid-control'].data = controlledGeoJson;
            if (sources['front-lines']) sources['front-lines'].data = frontLinesGeoJson;
            if (sources['formations']) sources['formations'].data = EMPTY_GEOJSON;
            if (sources['order-arrows']) sources['order-arrows'].data = EMPTY_GEOJSON;
        } catch (e) {
            console.warn('[OpsMap] Failed to pre-load game data:', e);
        }

        this.map = new maplibregl.Map({
            container,
            style,
            center: BOSNIA_CENTER,
            zoom: DEFAULT_ZOOM,
            attributionControl: false,
        });
        this.map.on('error', (e) => console.error('[OpsMap] map error:', e.error));

        this.map.on('load', () => {
            this.ready = true;
            this.setupOpsLayers();
            this.setupInteractions();
            this.resolveMapReady();
        });
    }

    /** Zoom to a bounding box defined by an array of [lng, lat] coordinates. */
    public zoomToBounds(coords: [number, number][]) {
        if (coords.length === 0) return;

        this.mapReady.then(() => {
            const bounds = new maplibregl.LngLatBounds(coords[0], coords[0]);
            for (const c of coords) bounds.extend(c);
            this.map.fitBounds(bounds, { padding: 60, maxZoom: 12 });
        });
    }

    public setOsidData(geojson: any) {
        this.mapReady.then(() => {
            this.osidDataSource?.setData(geojson);
        });
    }

    public dispose() {
        this.onOsidClick = undefined;
        this.osidDataSource?.destroy();
        this.arrowsSource?.destroy();
        this.markersSource?.destroy();
        this.osidDataSource = null;
        this.arrowsSource = null;
        this.markersSource = null;
        if (this.map) this.map.remove();
    }

    public updateOpType(type: OpType) {
        this.opType = type;
        if (this.ready) {
            this.updateLayerStyles();
        }
    }

    public updateAxes(axes: AxisRenderingData[]) {
        if (!this.ready) return;

        const features = axes.flatMap(axis => {
            const feature = this.buildAxisFeature(axis);
            return feature ? [feature] : [];
        });
        this.arrowsSource?.setData({
            type: 'FeatureCollection',
            features
        });
    }

    public updateMarkers(objectives: string[], staging: string | null, osidCoords: Map<string, [number, number]>) {
        this.mapReady.then(() => {
            const features: any[] = [];
            for (const osid of objectives) {
                const coords = osidCoords.get(osid);
                if (coords) {
                    features.push({
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: coords },
                        properties: { type: 'objective', osid }
                    });
                }
            }
            if (staging) {
                const coords = osidCoords.get(staging);
                if (coords) {
                    features.push({
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: coords },
                        properties: { type: 'staging', osid: staging }
                    });
                }
            }
            this.markersSource?.setData({ type: 'FeatureCollection', features });
        });
    }

    private buildAxisFeature(axis: AxisRenderingData): Feature<LineString, AxisFeatureProperties> | null {
        if (!axis.stagingCoords || axis.objectiveCoords.length === 0) return null;

        const points = [axis.stagingCoords, ...axis.objectiveCoords];
        if (points.length < 2) return null;

        try {
            const line = lineString(points);
            const curved = bezier(line, { resolution: 500, sharpness: 0.85 });

            return {
                type: 'Feature',
                properties: {
                    id: axis.id,
                    color: axis.color,
                    isFeint: this.opType === 'feint'
                },
                geometry: curved.geometry
            };
        } catch (e) {
            console.error('Failed to build bezier for axis', axis.id, e);
            return null;
        }
    }

    private updateLayerStyles() {
        if (!this.map.getLayer('ops-planning-arrows-line')) return;

        const isFeint = this.opType === 'feint';
        this.map.setPaintProperty('ops-planning-arrows-line', 'line-dasharray', isFeint ? [2, 2] : [1]);
        this.map.setPaintProperty('ops-planning-arrows-line', 'line-opacity', isFeint ? 0.4 : 0.8);
        this.map.setPaintProperty('ops-planning-arrows-line', 'line-width', isFeint ? 3 : 5);
    }

    private setupOpsLayers() {
        // Darken non-faction territory for contrast — non-interactive so clicks pass through
        if (this.playerFaction) {
            this.map.addLayer({
                id: 'ops-enemy-darken',
                type: 'fill',
                source: 'osid-control',
                paint: {
                    'fill-color': '#000000',
                    'fill-opacity': ['case',
                        ['==', ['get', 'controller'], this.playerFaction], 0,
                        0.35
                    ]
                }
            });
        }

        // Arrow source for operation axes — ModalMapSource for safe updates
        this.arrowsSource = new ModalMapSource(this.map, 'ops-planning-arrows', [
            {
                id: 'ops-planning-arrows-glow', type: 'line',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 'line-color': ['get', 'color'], 'line-width': 14, 'line-blur': 10, 'line-opacity': 0.25 },
            },
            {
                id: 'ops-planning-arrows-line', type: 'line',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 'line-color': ['get', 'color'], 'line-width': 5, 'line-opacity': 0.8 },
            },
            {
                id: 'ops-planning-arrows-flow', type: 'line',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 'line-color': '#fff', 'line-width': 2, 'line-opacity': 0.3, 'line-dasharray': [2, 4] },
            },
        ]);
        this.arrowsSource.init();

        // OSID click target layer — ModalMapSource for safe updates
        this.osidDataSource = new ModalMapSource(this.map, 'ops-osid-data', [
            {
                id: 'ops-osid-points', type: 'circle',
                paint: {
                    'circle-radius': 4, 'circle-color': '#c4a35a', 'circle-opacity': 0.5,
                    'circle-stroke-width': 1, 'circle-stroke-color': '#c4a35a', 'circle-stroke-opacity': 0.3,
                },
            },
        ]);
        this.osidDataSource.init();

        // Objective/staging markers — ModalMapSource for safe updates
        this.markersSource = new ModalMapSource(this.map, 'ops-markers', [
            {
                id: 'ops-objective-markers', type: 'circle',
                filter: ['==', ['get', 'type'], 'objective'],
                paint: { 'circle-radius': 8, 'circle-color': '#e05050', 'circle-stroke-width': 2, 'circle-stroke-color': '#ff8080', 'circle-opacity': 0.9 },
            },
            {
                id: 'ops-staging-marker', type: 'circle',
                filter: ['==', ['get', 'type'], 'staging'],
                paint: { 'circle-radius': 10, 'circle-color': '#4a9a55', 'circle-stroke-width': 2, 'circle-stroke-color': '#80ff80', 'circle-opacity': 0.9 },
            },
        ]);
        this.markersSource.init();
    }

    private setupInteractions() {
        debugOpsMap('setupInteractions called, map exists:', !!this.map);

        // Raw DOM click on canvas — bypasses all MapLibre layer logic
        this.map.getCanvas().addEventListener('click', (e) => {
            debugOpsMap('CANVAS DOM click at', e.clientX, e.clientY);
        });

        // MapLibre click event
        this.map.on('click', (e) => {
            debugOpsMap('MAP click at', e.point, 'onOsidClick?', !!this.onOsidClick);
            const features = this.map.queryRenderedFeatures(e.point, { layers: ['osid-control-fill'] });
            debugOpsMap('osid-control-fill features:', features.length);
            if (!this.onOsidClick) return;
            if (features.length > 0) {
                const osid = features[0].properties?.osid;
                debugOpsMap('OSID:', osid);
                if (typeof osid === 'string' && osid) this.onOsidClick(osid);
            }
        });

        // Crosshair cursor everywhere on the map (always in planning mode)
        this.map.getCanvas().style.cursor = 'crosshair';
        debugOpsMap('cursor set, canvas size:', this.map.getCanvas().width, 'x', this.map.getCanvas().height);
    }
}
