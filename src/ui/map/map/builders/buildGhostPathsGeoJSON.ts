import type { Feature, FeatureCollection, LineString } from 'geojson';
import type { LoadedGameState } from '../../data/types';
import type { StagedOrder } from '../../store/gameStore';
import { buildOsidCentroidLookup, resolveOsidKey } from './geojsonLookup';
import { resolveFormationLocationOsid } from './resolveFormationLocationOsid';
import { hashString, buildBezierCurve } from './arrowGeometry';
import { resolveSectorOrderTargetOsid } from './resolveSectorOrderTarget';

interface GhostPathProperties {
    type: 'ghost-path';
    formationId: string;
}

/**
 * Builds Ghost Paths (dashed lines) for units with staged sector assignments.
 */
export function buildGhostPathsGeoJSON(
    state: LoadedGameState,
    stagedOrders: StagedOrder[],
    controlledOsidGeoJson: FeatureCollection,
    selectedFormationId: string | null
): FeatureCollection<LineString, GhostPathProperties> {
    if (!selectedFormationId) {
        return { type: 'FeatureCollection', features: [] };
    }

    const centroidLookup = buildOsidCentroidLookup(controlledOsidGeoJson);
    const formationById = new Map(state.formations.map((f) => [f.id, f] as const));

    const features: Feature<LineString, GhostPathProperties>[] = [];

    // Filter to only the selected formation's staged orders
    const relevantOrders = stagedOrders.filter(o => o.formationId === selectedFormationId);

    for (const order of relevantOrders) {
        if (order.type !== 'sector') continue;

        const formation = formationById.get(order.formationId);
        if (!formation) continue;

        const sourceOsid = resolveFormationLocationOsid(formation, centroidLookup);
        if (!sourceOsid) continue;

        const targetOsid = resolveSectorOrderTargetOsid(order, state, centroidLookup, sourceOsid)
            ?? resolveOsidKey(order.targetOsid, centroidLookup);
        if (!targetOsid || targetOsid === sourceOsid) continue;

        const fromPoint = centroidLookup.get(sourceOsid);
        const toPoint = centroidLookup.get(targetOsid);
        if (!fromPoint || !toPoint) continue;

        const dx = toPoint[0] - fromPoint[0];
        const dy = toPoint[1] - fromPoint[1];
        const len = Math.sqrt(dx * dx + dy * dy);

        // Use a subtle curve to avoid overlapping with direct arrows if they exist
        const hash = hashString(order.formationId);
        const offsetMagnitude = len * 0.08 * ((hash % 2 === 0) ? 1 : -1);
        const curvePoints = buildBezierCurve(fromPoint, toPoint, offsetMagnitude);

        features.push({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: curvePoints },
            properties: {
                type: 'ghost-path',
                formationId: order.formationId,
            },
        });
    }

    return {
        type: 'FeatureCollection',
        features,
    };
}
