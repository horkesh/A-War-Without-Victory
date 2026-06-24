/**
 * Build a GeoJSON FeatureCollection for density map mode (Phase E.1).
 * Colors front-adjacent OSIDs by their sector's density value:
 * - Red (thin < 0.5)
 * - Amber (normal 0.5–1.0)
 * - Green (dense > 1.0)
 */
import type { FeatureCollection, Feature, Polygon, MultiPolygon } from 'geojson';
import type { CorpsFrontSectorView, FormationView, FrontEdgeView } from '../../data/types';
import { buildSectorFormationAssignment, collectSectorFriendlyOsids } from '../../utils/sectorUtils';
import { isFieldedTacticalFormation } from '../../../shared/playerVisibility';

interface DensityProperties {
  osid: string;
  density: number;
  density_class: 'thin' | 'normal' | 'dense';
  sector_id: string;
  faction: string;
}

/**
 * Build density-colored features from osid-control GeoJSON + sector data.
 * Returns features for OSIDs that are adjacent to fronts (i.e., belong to a sector).
 */
export function buildDensityGeoJSON(
  controlGeoJson: FeatureCollection,
  sectors: CorpsFrontSectorView[],
  frontEdgesOsid: FrontEdgeView[],
  formations: FormationView[] = []
): FeatureCollection<Polygon | MultiPolygon, DensityProperties> {
  // Build OSID → density/sector lookup
  const formationsById = new Map(formations.map((formation) => [formation.id, formation]));
  const osidInfo = new Map<string, { density: number; sector_id: string; faction: string }>();
  for (const sector of sectors) {
    const assignmentLineHoldingIds = buildSectorFormationAssignment(sector, formations, sectors).lineHoldingIds;
    const lineHoldingIds = formations.length > 0
      ? assignmentLineHoldingIds.filter((id) => {
        const formation = formationsById.get(id);
        return formation != null && isFieldedTacticalFormation(formation);
      })
      : assignmentLineHoldingIds;
    if (lineHoldingIds.length === 0) continue;
    const friendlyOsids = collectSectorFriendlyOsids(sector, frontEdgesOsid);
    for (const osid of friendlyOsids) {
      osidInfo.set(osid, { density: sector.density, sector_id: sector.sector_id, faction: sector.faction });
    }
  }

  const features: Feature<Polygon | MultiPolygon, DensityProperties>[] = [];
  for (const feature of controlGeoJson.features) {
    const osid = (feature.properties as Record<string, unknown>)?.osid;
    if (typeof osid !== 'string') continue;
    const info = osidInfo.get(osid);
    if (!info) continue;

    const densityClass = info.density < 0.5 ? 'thin' : info.density > 1.0 ? 'dense' : 'normal';
    features.push({
      type: 'Feature',
      properties: {
        osid,
        density: info.density,
        density_class: densityClass,
        sector_id: info.sector_id,
        faction: info.faction,
      },
      geometry: feature.geometry as Polygon | MultiPolygon,
    });
  }

  return { type: 'FeatureCollection', features };
}
