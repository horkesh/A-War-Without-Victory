import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { CorpsFrontSectorView, FrontEdgeView, OperationView } from '../../data/types';
import { collectSectorFriendlyOsids } from '../../utils/sectorUtils';

type EffortClass = 'holding' | 'supporting' | 'main';

interface OperationalWeightProperties {
  osid: string;
  sector_id: string;
  faction: string;
  effort: number;
  effort_class: EffortClass;
  has_active_operation: boolean;
  objective_count: number;
}

function classifyEffort(effort: number): EffortClass {
  if (effort >= 0.75) return 'main';
  if (effort >= 0.35) return 'supporting';
  return 'holding';
}

export function buildOperationalWeightGeoJSON(
  controlGeoJson: FeatureCollection,
  sectors: CorpsFrontSectorView[],
  frontEdgesOsid: FrontEdgeView[],
  operations: OperationView[] | undefined,
): FeatureCollection<Polygon | MultiPolygon, OperationalWeightProperties> {
  const operationsBySector = new Map<string, OperationView[]>();
  for (const operation of operations ?? []) {
    if (!operation.sector_id) continue;
    const existing = operationsBySector.get(operation.sector_id) ?? [];
    existing.push(operation);
    operationsBySector.set(operation.sector_id, existing);
  }

  const osidInfo = new Map<string, OperationalWeightProperties>();
  for (const sector of sectors) {
    const activeOperations = operationsBySector.get(sector.sector_id) ?? [];
    const activeOperation = activeOperations.find((operation) => operation.phase !== 'recovery');
    const aggressionModifier = activeOperation?.tempo === 'all_out' ? 0.1 : activeOperation?.tempo === 'methodical' ? -0.05 : 0;
    const sectorBrigadeShare = Math.max(0, sector.assigned_brigade_ids.length / Math.max(1, sector.assigned_brigade_ids.length + sector.reserve_brigade_ids.length));
    const effort = Math.max(0, Math.min(1, sectorBrigadeShare * (1 + aggressionModifier)));
    const properties: OperationalWeightProperties = {
      osid: '',
      sector_id: sector.sector_id,
      faction: sector.faction,
      effort,
      effort_class: classifyEffort(effort),
      has_active_operation: Boolean(activeOperation),
      objective_count: activeOperation?.objectives?.length ?? 0,
    };
    for (const osid of collectSectorFriendlyOsids(sector, frontEdgesOsid)) {
      osidInfo.set(osid, { ...properties, osid });
    }
  }

  const features: Feature<Polygon | MultiPolygon, OperationalWeightProperties>[] = [];
  for (const feature of controlGeoJson.features) {
    const osid = (feature.properties as Record<string, unknown>)?.osid;
    if (typeof osid !== 'string') continue;
    const properties = osidInfo.get(osid);
    if (!properties) continue;
    features.push({
      type: 'Feature',
      geometry: feature.geometry as Polygon | MultiPolygon,
      properties,
    });
  }

  return { type: 'FeatureCollection', features };
}
