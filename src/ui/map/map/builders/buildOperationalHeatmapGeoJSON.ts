/**
 * buildOperationalHeatmapGeoJSON — Phase 5 GUI.
 *
 * Implements Mode 7 operational heatmap.
 * Visualizes supply pressure and combat intensity as Point features.
 */
import type { FeatureCollection, Point, Feature } from 'geojson';
import type { LoadedGameState, RecentControlEventView } from '../../data/types';

export function buildOperationalHeatmapGeoJSON(
    state: LoadedGameState,
    osidCentroids: Map<string, [number, number]>
): FeatureCollection<Point> {
    const features: Feature<Point>[] = [];

    // 1. Supply Pressure (Heat Index)
    if (state.warPhaseSupplyPressure) {
        for (const [osid, pressure] of Object.entries(state.warPhaseSupplyPressure)) {
            const p = pressure as number;
            const centroid = osidCentroids.get(osid);
            if (!centroid) continue;
            if (p <= 0.1) continue;

            features.push({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: centroid },
                properties: {
                    type: 'supply',
                    intensity: p,
                    label: 'Supply Strain'
                }
            });
        }
    }

    // 2. Combat Intensity (Flips)
    if (state.recentControlEvents) {
        const combatEvents = state.recentControlEvents.filter((e: RecentControlEventView) => e.mechanism === 'combat');
        for (const event of combatEvents) {
            const centroid = osidCentroids.get(event.settlementId);
            if (!centroid) continue;

            features.push({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: centroid },
                properties: {
                    type: 'combat',
                    intensity: 1.0, // High intensity for active flips
                    label: 'Combat Flashpoint'
                }
            });
        }
    }

    return { type: 'FeatureCollection', features };
}
