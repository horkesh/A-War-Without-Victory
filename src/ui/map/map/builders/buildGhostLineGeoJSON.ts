import type { FeatureCollection } from 'geojson';
import type { LoadedGameState } from '../../data/types';
import type { OsidCentroidLookup } from './geojsonLookup';
import { resolveFormationLocationOsid } from './resolveFormationLocationOsid';

const EMPTY_GEOJSON: FeatureCollection = { type: 'FeatureCollection', features: [] };

/**
 * Build GeoJSON for the "Ghost Line" interactive preview.
 * This connects the selected formation's origin to the current cursor position.
 */
export function buildGhostLineGeoJSON(
    state: LoadedGameState,
    selectedFormationId: string | null,
    orderModeForFormation: 'attack' | 'move' | 'sector' | null,
    ghostLinePoint: [number, number] | null,
    centroidLookup: OsidCentroidLookup,
): FeatureCollection {
    return EMPTY_GEOJSON;
}
