import type { FeatureCollection, Geometry } from 'geojson';
import type { ReconIntelligenceView } from '../../data/types';

/**
 * Builds a GeoJSON FeatureCollection of OSID polygons that are under fog of war.
 *
 * Fog covers enemy-controlled OSIDs that the player has NOT confirmed empty.
 * Player-controlled OSIDs are always clear. Returns empty collection when no
 * player faction is set (observer mode) or no recon data is available.
 */
export function buildFogOfWarGeoJSON(
  baseGeoJson: FeatureCollection,
  controlBySettlement: Record<string, string | null>,
  playerFaction: string | null | undefined,
  reconIntelligence: ReconIntelligenceView | undefined,
): FeatureCollection {
  const empty: FeatureCollection = { type: 'FeatureCollection', features: [] };
  if (!playerFaction || !reconIntelligence) return empty;

  const confirmedVisible = new Set<string>(reconIntelligence.confirmed_empty);

  const fogFeatures = baseGeoJson.features
    .filter((feature) => {
      const osid = typeof feature.properties?.osid === 'string' ? feature.properties.osid : '';
      if (!osid) return false;
      const controller = controlBySettlement[osid] ?? null;
      // Only fog enemy-controlled territory (own territory is always visible)
      if (!controller || controller === playerFaction) return false;
      // Lift fog where player has confirmed the OSID is empty
      return !confirmedVisible.has(osid);
    })
    .map((feature) => ({
      type: 'Feature' as const,
      geometry: feature.geometry as Geometry,
      properties: { osid: feature.properties?.osid ?? '' },
    }));

  return { type: 'FeatureCollection', features: fogFeatures };
}
