/**
 * ModalMapSource — safe GeoJSON source management for MapLibre modals.
 *
 * In modal/secondary MapLibre instances, `source.setData()` on dynamically-added
 * GeoJSON sources silently fails on updates (works for initial render only).
 * This utility enforces the remove+re-add pattern structurally, making setData()
 * impossible to call accidentally.
 *
 * Usage:
 *   const src = new ModalMapSource(map, 'my-source', [
 *     { id: 'my-fill', type: 'fill', paint: { 'fill-color': '#f00' } },
 *   ]);
 *   src.setData(geojson);   // safe: removes layers+source, re-adds with new data
 *   src.destroy();          // cleanup
 *
 * Life lesson: [MapLibre] Never use setData() on dynamic sources in modal maps
 * — VIOLATED 3 times (2026-03-11, 2026-03-19, 2026-03-19). This class eliminates
 * the violation structurally.
 */
import type maplibregl from 'maplibre-gl';
import type { GeoJSON } from 'geojson';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ModalLayerSpec {
    id: string;
    type: string;
    filter?: unknown;
    paint?: Record<string, unknown>;
    layout?: Record<string, unknown>;
    minzoom?: number;
    maxzoom?: number;
}

const EMPTY_FC: GeoJSON = { type: 'FeatureCollection', features: [] };

export class ModalMapSource {
    private map: maplibregl.Map;
    private sourceId: string;
    private layerSpecs: ModalLayerSpec[];
    constructor(
        map: maplibregl.Map,
        sourceId: string,
        layerSpecs: ModalLayerSpec[] = [],
    ) {
        this.map = map;
        this.sourceId = sourceId;
        this.layerSpecs = layerSpecs;
    }

    /**
     * Update the source data. Uses remove+re-add pattern internally.
     * Safe to call at any time — handles both first init and subsequent updates.
     */
    setData(data: GeoJSON): void {
        this.removeAll();

        this.map.addSource(this.sourceId, { type: 'geojson', data });
        for (const spec of this.layerSpecs) {
            this.map.addLayer({ ...spec, source: this.sourceId } as maplibregl.LayerSpecification);
        }
    }

    /**
     * Initialize with empty data. Use during map.on('load') when you need
     * the source to exist but don't have data yet.
     */
    init(): void {
        this.setData(EMPTY_FC);
    }

    /** Remove all layers and the source from the map. */
    destroy(): void {
        this.removeAll();
    }

    get id(): string {
        return this.sourceId;
    }

    private removeAll(): void {
        for (const spec of this.layerSpecs) {
            if (this.map.getLayer(spec.id)) {
                this.map.removeLayer(spec.id);
            }
        }
        if (this.map.getSource(this.sourceId)) {
            this.map.removeSource(this.sourceId);
        }
    }
}
