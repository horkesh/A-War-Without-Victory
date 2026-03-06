import type { FeatureCollection, Geometry } from 'geojson';
import type { FogOfWarView } from '../../data/types';

/**
 * Builds a GeoJSON FeatureCollection of OSID polygons that are under fog of war.
 *
 * Fog covers enemy-controlled OSIDs that are not currently visible via sector intel.
 * Player-controlled OSIDs are always clear. Returns empty collection when no
 * player faction is set (observer mode) or no fog-of-war visibility data is available.
 */
export function buildFogOfWarGeoJSON(
  baseGeoJson: FeatureCollection,
  controlBySettlement: Record<string, string | null>,
  playerFaction: string | null | undefined,
  fogOfWar: FogOfWarView | undefined,
): FeatureCollection {
  const empty: FeatureCollection = { type: 'FeatureCollection', features: [] };
  if (!playerFaction || !fogOfWar) return empty;

  const visibleEnemyOsids = new Set<string>(fogOfWar.visibleEnemyOsids);

  const fogFeatures = baseGeoJson.features
    .filter((feature) => {
      const osid = typeof feature.properties?.osid === 'string' ? feature.properties.osid : '';
      if (!osid) return false;
      const controller = controlBySettlement[osid] ?? null;
      // Only fog enemy-controlled territory (own territory is always visible)
      if (!controller || controller === playerFaction) return false;
      // Lift fog where sector intel currently exposes enemy frontage or visible brigade positions
      return !visibleEnemyOsids.has(osid);
    })
    .map((feature) => ({
      type: 'Feature' as const,
      geometry: feature.geometry as Geometry,
      properties: { osid: feature.properties?.osid ?? '' },
    }));

  return { type: 'FeatureCollection', features: fogFeatures };
}
