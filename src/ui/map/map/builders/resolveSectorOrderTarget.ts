import type { CorpsFrontSectorView, LoadedGameState } from '../../data/types';
import type { StagedOrder } from '../../store/gameStore';
import { resolveOsidKey, type OsidCentroidLookup } from './geojsonLookup';

function compareStable(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sectorTargetId(order: StagedOrder): string | null {
  const explicit = order.targetSectorId?.trim();
  if (explicit) return explicit;
  const legacy = order.targetOsid?.trim();
  return legacy?.startsWith('sector') ? legacy : null;
}

function collectSectorCandidateOsids(sector: CorpsFrontSectorView): string[] {
  const candidates = new Set<string>();
  for (const osid of sector.territory_osids ?? []) candidates.add(osid);
  for (const segment of sector.sub_segments ?? []) {
    for (const osid of segment.friendly_osids ?? []) candidates.add(osid);
  }
  return [...candidates].sort(compareStable);
}

function distanceSquared(a: [number, number], b: [number, number]): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

export function resolveSectorOrderTargetOsid(
  order: StagedOrder,
  state: LoadedGameState,
  centroidLookup: OsidCentroidLookup,
  sourceOsid: string | null,
): string | null {
  const targetSectorId = sectorTargetId(order);
  if (!targetSectorId) return null;

  const sector = (state.corpsFrontSectors ?? []).find(s => s.sector_id === targetSectorId);
  if (!sector) return null;

  const sourcePoint = sourceOsid ? centroidLookup.get(sourceOsid) : undefined;
  const resolvedCandidates = collectSectorCandidateOsids(sector)
    .map(osid => resolveOsidKey(osid, centroidLookup))
    .filter((osid): osid is string => Boolean(osid));

  if (resolvedCandidates.length === 0) return null;
  if (!sourcePoint) return resolvedCandidates[0] ?? null;

  return resolvedCandidates
    .map(osid => ({ osid, point: centroidLookup.get(osid)! }))
    .sort((a, b) => {
      const byDistance = distanceSquared(a.point, sourcePoint) - distanceSquared(b.point, sourcePoint);
      return byDistance || compareStable(a.osid, b.osid);
    })[0]?.osid ?? null;
}
