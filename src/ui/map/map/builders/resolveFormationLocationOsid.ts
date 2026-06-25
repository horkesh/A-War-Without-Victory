import type { FormationView } from '../../data/types';
import type { OsidCentroidLookup } from './geojsonLookup';
import { resolveOsidKey } from './geojsonLookup';

export type FormationNavigationAnchorSource = 'location' | 'aor' | 'hq';

export interface FormationNavigationAnchor {
  osid: string;
  source: FormationNavigationAnchorSource;
}

export function resolveFormationLocationOsid(
  formation: FormationView | undefined,
  centroidLookup: OsidCentroidLookup,
): string | null {
  return resolveFormationNavigationAnchor(formation, centroidLookup)?.osid ?? null;
}

export function resolveFormationNavigationAnchor(
  formation: FormationView | undefined,
  centroidLookup: OsidCentroidLookup,
): FormationNavigationAnchor | null {
  if (!formation) return null;

  const direct = resolveFormationPhysicalLocationOsid(formation, centroidLookup);
  if (direct) return { osid: direct, source: 'location' };

  const aorIds = Array.isArray(formation.aorSettlementIds)
    ? [...formation.aorSettlementIds].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    : [];
  for (const id of aorIds) {
    const resolved = resolveOsidKey(id, centroidLookup);
    if (resolved) return { osid: resolved, source: 'aor' };
  }

  const hqOsid = resolveOsidKey(formation.hq_osid, centroidLookup)
    ?? resolveOsidKey(formation.hq_sid, centroidLookup);
  return hqOsid ? { osid: hqOsid, source: 'hq' } : null;
}

export function resolveFormationPhysicalLocationOsid(
  formation: FormationView | undefined,
  centroidLookup: OsidCentroidLookup,
): string | null {
  if (!formation) return null;
  return resolveOsidKey(formation.location_osid, centroidLookup);
}
