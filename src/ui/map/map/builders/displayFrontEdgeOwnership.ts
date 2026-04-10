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
    for (const edgeId of sector.edge_ids ?? []) {
      const key = `${edgeId}\0${sector.faction}`;
      if (!corpsByEdgeAndFaction.has(key)) corpsByEdgeAndFaction.set(key, sector.corps_id);
      if (!sectorByEdgeAndFaction.has(key)) sectorByEdgeAndFaction.set(key, sector);
    }
    for (const subSegment of sector.sub_segments ?? []) {
      const subSegmentId = subSegment.sub_segment_id;
      if (!subSegmentId) continue;
      for (const edgeId of subSegment.edge_ids ?? []) {
        const key = `${edgeId}\0${sector.faction}`;
        if (!subSegmentByEdgeAndFaction.has(key)) subSegmentByEdgeAndFaction.set(key, subSegmentId);
      }
    }
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
      if (sectorByEdgeAndFaction.has(key)) continue;
      const winner = pickDisplaySectorForMissingFrontEdge(
        side.friendlyOsid,
        claimIndexByFaction.get(side.faction) ?? new Map<string, DisplayFrontEdgeCandidate[]>(),
        adjacency,
        friendlyOsidsByFaction.get(side.faction) ?? new Set<string>(),
      )?.sector;
      if (!winner) continue;
      sectorByEdgeAndFaction.set(key, winner);
      corpsByEdgeAndFaction.set(key, winner.corps_id);
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
): DisplayFrontEdgeCandidateWithDistance | null {
  const queue: Array<{ osid: string; distance: number }> = [{ osid: startOsid, distance: 0 }];
  const visited = new Set<string>([startOsid]);
  const candidates = new Map<string, DisplayFrontEdgeCandidateWithDistance>();
  let bestDistance: number | null = null;

  for (let i = 0; i < queue.length; i++) {
    const current = queue[i]!;
    if (bestDistance !== null && current.distance > bestDistance) break;
    for (const claim of claimIndex.get(current.osid) ?? []) {
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
