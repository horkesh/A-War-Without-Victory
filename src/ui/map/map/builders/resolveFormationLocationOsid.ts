import type { FormationView } from '../../data/types';
import type { OsidCentroidLookup } from './geojsonLookup';
import { resolveOsidKey } from './geojsonLookup';

export function resolveFormationLocationOsid(
  formation: FormationView | undefined,
  centroidLookup: OsidCentroidLookup,
): string | null {
  if (!formation) return null;

  const direct = resolveOsidKey(formation.location_osid, centroidLookup);
  if (direct) return direct;

  const aorIds = Array.isArray(formation.aorSettlementIds)
    ? [...formation.aorSettlementIds].sort((a, b) => a.localeCompare(b))
    : [];
  for (const id of aorIds) {
    const resolved = resolveOsidKey(id, centroidLookup);
    if (resolved) return resolved;
  }

  return resolveOsidKey(formation.hq_sid, centroidLookup);
}
