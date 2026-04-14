import type { CorpsFrontSectorView } from '../../data/types';
import { strictCompare } from '../../../../state/validateGameState.js';

type FrontEdgeRecord = {
  edge_id: string;
  a: string;
  b: string;
  side_a: string | null;
  side_b: string | null;
};

type ControllerMap = Map<string, string | null>;

interface DisplayFrontEdgeCandidate {
  sector: CorpsFrontSectorView;
  frontOwns: number;
  territoryOwns: number;
  incidentEdges: number;
}

interface DisplayFrontEdgeCandidateWithDistance extends DisplayFrontEdgeCandidate {
  distance: number;
  traversalMode: 0 | 1;
}

export interface DisplayFrontEdgeOwnership {
  corpsByEdgeAndFaction: Map<string, string>;
  sectorByEdgeAndFaction: Map<string, CorpsFrontSectorView>;
  subSegmentByEdgeAndFaction: Map<string, string>;
}

export function buildDisplayOsidAdjacency(
  edgeMap: Map<string, Set<string>>,
): Map<string, string[]> {
  const adjacency = new Map<string, Set<string>>();
  for (const osids of edgeMap.values()) {
    if (osids.size !== 2) continue;
    const [a, b] = [...osids].sort(strictCompare);
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a)!.add(b);
    adjacency.get(b)!.add(a);
  }

  const normalized = new Map<string, string[]>();
  for (const [osid, neighbors] of adjacency.entries()) {
    normalized.set(osid, [...neighbors].sort(strictCompare));
  }
  return normalized;
}

export function buildDisplayOsidSectorOwnership(
  corpsFrontSectors: CorpsFrontSectorView[] | undefined,
  controllerMap: ControllerMap,
  adjacency: Map<string, string[]>,
): Map<string, CorpsFrontSectorView> {
  const sectors = [...(corpsFrontSectors ?? [])].sort((a, b) => strictCompare(a.sector_id, b.sector_id));
  const ownership = new Map<string, CorpsFrontSectorView>();
  const claimIndexByFaction = new Map<string, Map<string, DisplayFrontEdgeCandidate[]>>();
  const friendlyOsidsByFaction = new Map<string, Set<string>>();

  for (const sector of sectors) {
    if (!friendlyOsidsByFaction.has(sector.faction)) {
      friendlyOsidsByFaction.set(sector.faction, buildFriendlyOsidsForDisplay(controllerMap, sector.faction));
    }
  }

  for (const [faction] of [...friendlyOsidsByFaction.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
    claimIndexByFaction.set(
      faction,
      buildDisplayFrontEdgeClaimIndex(
        sectors.filter((sector) => sector.faction === faction),
      ),
    );
  }

  for (const [faction, friendlyOsids] of [...friendlyOsidsByFaction.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
    const claimIndex = claimIndexByFaction.get(faction) ?? new Map<string, DisplayFrontEdgeCandidate[]>();
    for (const osid of [...friendlyOsids].sort(strictCompare)) {
      const winner = pickDisplaySectorForMissingFrontEdge(
        osid,
        claimIndex,
        adjacency,
        friendlyOsids,
      )?.sector;
      if (winner) ownership.set(osid, winner);
    }
  }

  return ownership;
}

export function buildDisplayFrontEdgeOwnership(
  corpsFrontSectors: CorpsFrontSectorView[] | undefined,
  frontEdgesOsid: FrontEdgeRecord[] | undefined,
  controllerMap: ControllerMap,
  adjacency: Map<string, string[]>,
): DisplayFrontEdgeOwnership {
  const sectors = [...(corpsFrontSectors ?? [])].sort((a, b) => strictCompare(a.sector_id, b.sector_id));
  const corpsByEdgeAndFaction = new Map<string, string>();
  const sectorByEdgeAndFaction = new Map<string, CorpsFrontSectorView>();
  const subSegmentByEdgeAndFaction = new Map<string, string>();
  const claimIndexByFaction = new Map<string, Map<string, DisplayFrontEdgeCandidate[]>>();
  const friendlyOsidsByFaction = new Map<string, Set<string>>();

  for (const sector of sectors) {
    if (!friendlyOsidsByFaction.has(sector.faction)) {
      friendlyOsidsByFaction.set(sector.faction, buildFriendlyOsidsForDisplay(controllerMap, sector.faction));
    }
  }

  for (const [faction] of [...friendlyOsidsByFaction.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
    claimIndexByFaction.set(
      faction,
      buildDisplayFrontEdgeClaimIndex(
        sectors.filter((sector) => sector.faction === faction),
      ),
    );
  }

  for (const edge of [...(frontEdgesOsid ?? [])].sort((a, b) => strictCompare(a.edge_id, b.edge_id))) {
    const sides: Array<{ faction: string; friendlyOsid: string }> = [];
    if (edge.side_a) sides.push({ faction: edge.side_a, friendlyOsid: edge.a });
    if (edge.side_b) sides.push({ faction: edge.side_b, friendlyOsid: edge.b });

    for (const side of sides) {
      const key = `${edge.edge_id}\0${side.faction}`;
      const explicitWinner = pickExplicitDisplaySectorForEdge(
        sectors,
        edge.edge_id,
        side.faction,
        side.friendlyOsid,
      );
      const projectedWinner = pickDisplaySectorForMissingFrontEdge(
        side.friendlyOsid,
        claimIndexByFaction.get(side.faction) ?? new Map<string, DisplayFrontEdgeCandidate[]>(),
        adjacency,
        friendlyOsidsByFaction.get(side.faction) ?? new Set<string>(),
      );
      const winner = pickPreferredDisplayOwner(explicitWinner, projectedWinner)?.sector;
      if (!winner) continue;
      sectorByEdgeAndFaction.set(key, winner);
      corpsByEdgeAndFaction.set(key, winner.corps_id);
      const subSegmentId = findDisplaySubSegmentIdForEdge(winner, edge.edge_id);
      if (subSegmentId) subSegmentByEdgeAndFaction.set(key, subSegmentId);
      registerDisplayClaim(
        claimIndexByFaction.get(side.faction) ?? new Map<string, DisplayFrontEdgeCandidate[]>(),
        side.friendlyOsid,
        winner,
      );
    }
  }

  return {
    corpsByEdgeAndFaction,
    sectorByEdgeAndFaction,
    subSegmentByEdgeAndFaction,
  };
}

function buildFriendlyOsidsForDisplay(
  controllerMap: ControllerMap,
  faction: string,
): Set<string> {
  const friendly = new Set<string>();
  for (const [osid, controller] of controllerMap.entries()) {
    if (controller === faction) friendly.add(osid);
  }
  return friendly;
}

function buildDisplayFrontEdgeClaimIndex(
  sectors: CorpsFrontSectorView[],
): Map<string, DisplayFrontEdgeCandidate[]> {
  const claimIndex = new Map<string, DisplayFrontEdgeCandidate[]>();
  for (const sector of sectors) {
    const frontOsids = getDisplaySectorFrontOsids(sector);
    const territoryOsids = new Set(sector.territory_osids ?? []);
    const claimedOsids = [...new Set([...frontOsids, ...territoryOsids])].sort(strictCompare);
    for (const osid of claimedOsids) {
      const bucket = claimIndex.get(osid) ?? [];
      bucket.push({
        sector,
        frontOwns: frontOsids.has(osid) ? 1 : 0,
        territoryOwns: territoryOsids.has(osid) ? 1 : 0,
        incidentEdges: countDisplayIncidentEdgesForFrontOsid(sector, osid),
      });
      bucket.sort(compareDisplayFrontEdgeCandidates);
      claimIndex.set(osid, bucket);
    }
  }
  return claimIndex;
}

function getDisplaySectorFrontOsids(sector: CorpsFrontSectorView): Set<string> {
  const frontOsids = new Set<string>();
  for (const subSegment of sector.sub_segments ?? []) {
    for (const osid of subSegment.friendly_osids ?? []) {
      frontOsids.add(osid);
    }
  }
  return frontOsids;
}

function countDisplayIncidentEdgesForFrontOsid(
  sector: CorpsFrontSectorView,
  osid: string,
): number {
  let count = 0;
  for (const edgeId of sector.edge_ids ?? []) {
    const separator = edgeId.indexOf('__');
    if (separator < 0) continue;
    const a = edgeId.slice(0, separator);
    const b = edgeId.slice(separator + 2);
    if (a === osid || b === osid) count++;
  }
  return count;
}

function registerDisplayClaim(
  claimIndex: Map<string, DisplayFrontEdgeCandidate[]>,
  friendlyOsid: string,
  sector: CorpsFrontSectorView,
): void {
  const frontOsids = getDisplaySectorFrontOsids(sector);
  const territoryOsids = new Set(sector.territory_osids ?? []);
  const bucket = claimIndex.get(friendlyOsid) ?? [];
  bucket.push({
    sector,
    frontOwns: frontOsids.has(friendlyOsid) ? 1 : 0,
    territoryOwns: territoryOsids.has(friendlyOsid) ? 1 : 0,
    incidentEdges: countDisplayIncidentEdgesForFrontOsid(sector, friendlyOsid),
  });
  bucket.sort(compareDisplayFrontEdgeCandidates);
  claimIndex.set(friendlyOsid, bucket);
}

function compareDisplayFrontEdgeCandidates(
  a: DisplayFrontEdgeCandidate,
  b: DisplayFrontEdgeCandidate,
): number {
  return (
    getDisplayRearOnlyPenalty(a.sector) - getDisplayRearOnlyPenalty(b.sector)
    || getDisplayStaffCount(b.sector) - getDisplayStaffCount(a.sector)
    ||
    b.frontOwns - a.frontOwns
    || b.territoryOwns - a.territoryOwns
    || b.incidentEdges - a.incidentEdges
    || strictCompare(a.sector.sector_id, b.sector.sector_id)
  );
}

function compareDisplayFrontEdgeCandidatesWithDistance(
  a: DisplayFrontEdgeCandidateWithDistance,
  b: DisplayFrontEdgeCandidateWithDistance,
): number {
  return (
    a.traversalMode - b.traversalMode
    || a.distance - b.distance
    || compareDisplayFrontEdgeCandidates(a, b)
  );
}

function pickDisplaySectorForMissingFrontEdge(
  friendlyOsid: string,
  claimIndex: Map<string, DisplayFrontEdgeCandidate[]>,
  adjacency: Map<string, string[]>,
  friendlyOsids: Set<string>,
): DisplayFrontEdgeCandidateWithDistance | null {
  const direct = (claimIndex.get(friendlyOsid) ?? []).map((candidate) => ({
    ...candidate,
    distance: 0,
    traversalMode: 0 as const,
  }));
  const directActive = direct
    .filter((candidate) => !isRearOnlyDisplaySector(candidate.sector))
    .sort(compareDisplayFrontEdgeCandidatesWithDistance);
  if (directActive.length > 0) {
    return directActive[0] ?? null;
  }

  const sameFactionActive = findNearestDisplayFrontEdgeCandidate(
    friendlyOsid,
    claimIndex,
    adjacency,
    (neighbor) => friendlyOsids.has(neighbor),
    0,
    true,
  );
  if (sameFactionActive) return sameFactionActive;

  const broaderActive = findNearestDisplayFrontEdgeCandidate(
    friendlyOsid,
    claimIndex,
    adjacency,
    () => true,
    1,
    true,
  );
  if (broaderActive) return broaderActive;

  if (direct.length > 0) {
    direct.sort(compareDisplayFrontEdgeCandidatesWithDistance);
    return direct[0] ?? null;
  }

  const sameFaction = findNearestDisplayFrontEdgeCandidate(
    friendlyOsid,
    claimIndex,
    adjacency,
    (neighbor) => friendlyOsids.has(neighbor),
    0,
  );
  if (sameFaction) return sameFaction;

  return findNearestDisplayFrontEdgeCandidate(
    friendlyOsid,
    claimIndex,
    adjacency,
    () => true,
    1,
  );
}

function findNearestDisplayFrontEdgeCandidate(
  startOsid: string,
  claimIndex: Map<string, DisplayFrontEdgeCandidate[]>,
  adjacency: Map<string, string[]>,
  canTraverse: (neighbor: string) => boolean,
  traversalMode: 0 | 1,
  excludeRearOnly = false,
): DisplayFrontEdgeCandidateWithDistance | null {
  const queue: Array<{ osid: string; distance: number }> = [{ osid: startOsid, distance: 0 }];
  const visited = new Set<string>([startOsid]);
  const candidates = new Map<string, DisplayFrontEdgeCandidateWithDistance>();
  let bestDistance: number | null = null;

  for (let i = 0; i < queue.length; i++) {
    const current = queue[i]!;
    if (bestDistance !== null && current.distance > bestDistance) break;
    for (const claim of claimIndex.get(current.osid) ?? []) {
      if (excludeRearOnly && isRearOnlyDisplaySector(claim.sector)) continue;
      const candidate: DisplayFrontEdgeCandidateWithDistance = {
        ...claim,
        distance: current.distance,
        traversalMode,
      };
      const existing = candidates.get(claim.sector.sector_id);
      if (!existing || compareDisplayFrontEdgeCandidatesWithDistance(candidate, existing) < 0) {
        candidates.set(claim.sector.sector_id, candidate);
      }
      if (bestDistance === null || current.distance < bestDistance) {
        bestDistance = current.distance;
      }
    }

    const neighbors = [...(adjacency.get(current.osid) ?? [])].sort(strictCompare);
    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      if (!canTraverse(neighbor)) continue;
      visited.add(neighbor);
      queue.push({ osid: neighbor, distance: current.distance + 1 });
    }
  }

  const ranked = [...candidates.values()].sort(compareDisplayFrontEdgeCandidatesWithDistance);
  return ranked[0] ?? null;
}

function pickExplicitDisplaySectorForEdge(
  sectors: CorpsFrontSectorView[],
  edgeId: string,
  faction: string,
  friendlyOsid: string,
): DisplayFrontEdgeCandidateWithDistance | null {
  const candidates = sectors
    .filter((sector) => sector.faction === faction && (sector.edge_ids ?? []).includes(edgeId))
    .map((sector) => ({
      sector,
      frontOwns: 1,
      territoryOwns: (sector.territory_osids ?? []).includes(friendlyOsid) ? 1 : 0,
      incidentEdges: countDisplayIncidentEdgesForFrontOsid(sector, friendlyOsid),
      distance: 0,
      traversalMode: 0 as const,
    }))
    .sort(compareDisplayFrontEdgeCandidatesWithDistance);
  return candidates[0] ?? null;
}

function pickPreferredDisplayOwner(
  explicit: DisplayFrontEdgeCandidateWithDistance | null,
  projected: DisplayFrontEdgeCandidateWithDistance | null,
): DisplayFrontEdgeCandidateWithDistance | null {
  if (!explicit) return projected;
  if (!projected) return explicit;
  if (!isRearOnlyDisplaySector(explicit.sector)) return explicit;
  if (!isRearOnlyDisplaySector(projected.sector)) return projected;
  return compareDisplayFrontEdgeCandidatesWithDistance(explicit, projected) <= 0
    ? explicit
    : projected;
}

function findDisplaySubSegmentIdForEdge(
  sector: CorpsFrontSectorView,
  edgeId: string,
): string | null {
  for (const subSegment of sector.sub_segments ?? []) {
    if ((subSegment.edge_ids ?? []).includes(edgeId) && subSegment.sub_segment_id) {
      return subSegment.sub_segment_id;
    }
  }
  return null;
}

function getDisplayStaffCount(sector: CorpsFrontSectorView): number {
  return (sector.assigned_brigade_ids?.length ?? 0) + (sector.reserve_brigade_ids?.length ?? 0);
}

function isRearOnlyDisplaySector(sector: CorpsFrontSectorView): boolean {
  return getDisplayStaffCount(sector) === 0 && (sector.rear_brigade_ids?.length ?? 0) > 0;
}

function getDisplayRearOnlyPenalty(sector: CorpsFrontSectorView): number {
  return isRearOnlyDisplaySector(sector) ? 1 : 0;
}
