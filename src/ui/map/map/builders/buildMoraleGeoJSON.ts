/**
 * Build a GeoJSON FeatureCollection for morale map mode.
 * Colors front-adjacent OSIDs by their sector's average morale,
 * using a continuous gradient: red (critical) → yellow → green (healthy).
 */
import type { FeatureCollection, Feature, Polygon, MultiPolygon } from 'geojson';
import type { CorpsFrontSectorView, FrontEdgeView } from '../../data/types';
import { collectSectorFriendlyOsids } from '../../utils/sectorUtils';

interface MoraleProperties {
  osid: string;
  morale: number;
  sector_id: string;
  faction: string;
}

export function buildMoraleGeoJSON(
  controlGeoJson: FeatureCollection,
  sectors: CorpsFrontSectorView[],
  frontEdgesOsid: FrontEdgeView[],
): FeatureCollection<Polygon | MultiPolygon, MoraleProperties> {
  // Build OSID → morale/sector lookup
  const osidInfo = new Map<string, { morale: number; sector_id: string; faction: string }>();
  for (const sector of sectors) {
    const morale = sector.combat_morale_avg ?? 50;
    const friendlyOsids = collectSectorFriendlyOsids(sector, frontEdgesOsid);
    for (const osid of friendlyOsids) {
      osidInfo.set(osid, { morale, sector_id: sector.sector_id, faction: sector.faction });
    }
  }

  const features: Feature<Polygon | MultiPolygon, MoraleProperties>[] = [];
  for (const feature of controlGeoJson.features) {
    const osid = (feature.properties as Record<string, unknown>)?.osid;
    if (typeof osid !== 'string') continue;
    const info = osidInfo.get(osid);
    if (!info) continue;

    features.push({
      type: 'Feature',
      properties: {
        osid,
        morale: Math.round(info.morale),
        sector_id: info.sector_id,
        faction: info.faction,
      },
      geometry: feature.geometry as Polygon | MultiPolygon,
    });
  }

  return { type: 'FeatureCollection', features };
}
