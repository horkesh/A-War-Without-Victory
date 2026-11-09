import { useEffect, useState } from 'react';
import type { FeatureCollection, Position } from 'geojson';
import { loadOperationalSettlements } from '../data/DataLoader';
import { buildOsidDisplayNameMap } from '../utils/osidDisplayName';

/**
 * Settlement polygons projected for the Dayton maps (settlement viewer, wall board, Boundary
 * Map). One projection owner: a local equirectangular projection, x = lon × cos 44°, y = −lat,
 * padded 0.04 projected units. Codex's registered base map and board paper use exactly this
 * frame (assets/registration/bih_registration.json), so overlays need no reprojection.
 */
export interface SettlementGeometry {
    paths: Array<{ id: string; d: string }>;
    ids: Set<string>;
    names: ReturnType<typeof buildOsidDisplayNameMap>;
    viewBox: string;
}

export const GEOMETRY_PADDING = 0.04;

export function mapPaths(collection: FeatureCollection): SettlementGeometry {
    let west = Infinity, north = -Infinity, east = -Infinity, south = Infinity;
    const longitudeScale = Math.cos(44 * Math.PI / 180);
    function point([lon, lat]: Position): string {
        const x = lon * longitudeScale;
        west = Math.min(west, x);
        east = Math.max(east, x);
        north = Math.max(north, lat);
        south = Math.min(south, lat);
        return x.toFixed(5) + ' ' + (-lat).toFixed(5);
    }
    const paths = collection.features.flatMap(feature => {
        const geometry = feature.geometry;
        const id = feature.properties?.osid;
        if (typeof id !== 'string' || !geometry) return [];
        const polygons = geometry.type === 'Polygon' ? [geometry.coordinates]
            : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
        if (!polygons.length) return [];
        const d = polygons.flatMap(polygon => polygon.filter(ring => ring.length > 2)
            .map(ring => 'M' + ring.map(point).join('L') + 'Z')).join('');
        return d ? [{ id, d }] : [];
    });
    if (!paths.length) throw new Error('No settlement polygons');
    const p = GEOMETRY_PADDING;
    return {
        paths,
        ids: new Set(paths.map(path => path.id)),
        names: buildOsidDisplayNameMap(collection),
        viewBox: [west - p, -north - p, east - west + 2 * p, north - south + 2 * p].join(' '),
    };
}

/** Loads (the data loader caches the fetch) and projects the settlement polygons. */
export function useSettlementGeometry(): { geometry: SettlementGeometry | null; failed: boolean } {
    const [geometry, setGeometry] = useState<SettlementGeometry | null>(null);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        let active = true;
        void loadOperationalSettlements().then(mapPaths).then(data => { if (active) setGeometry(data); }).catch(() => { if (active) setFailed(true); });
        return () => { active = false; };
    }, []);
    return { geometry, failed };
}
