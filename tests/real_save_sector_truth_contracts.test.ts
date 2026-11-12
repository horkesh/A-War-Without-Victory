import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadOperationalCentroids } from '../src/data/operational_data.js';
import { loadSettlementGraph } from '../src/map/settlements.js';
import { parseEdges, type EdgeRecord } from '../src/map/settlements_parse.js';
import { buildOsidAdjacency, buildSharedBoundaryAdjacency, type Osid } from '../src/sim/combat/osid_adjacency.js';
import { buildCorpsFrontSectors } from '../src/sim/combat/corps_front_sectors.js';
import { MAX_SECTOR_EDGES } from '../src/sim/combat/corps_front_sectors_constants.js';
import { splitNonContiguousSectors } from '../src/sim/combat/sector_splitting.js';
import type { CorpsFrontSector, GameState } from '../src/state/game_state.js';
import { deserializeState } from '../src/state/serialize.js';
import { strictCompare } from '../src/state/validateGameState.js';

type ContactGraphEdge = {
  edge_id: string;
  a: string;
  b: string;
  shared_segments?: number;
  min_dist?: number;
};

type SectorLike = {
  sector_id: string;
  corps_id: string;
  faction?: string;
  opposing_factions?: string[];
  edge_ids?: string[];
  territory_osids?: string[];
  assigned_brigade_ids?: string[];
  reserve_brigade_ids?: string[];
  rear_brigade_ids?: string[];
  sub_segments?: Array<{
    sub_segment_id: string;
    friendly_osids: string[];
    enemy_osids: string[];
    edge_ids: string[];
    length_edges: number;
    primary_brigade_ids: string[];
  }>;
  length_edges?: number;
};

const ROOT = process.cwd();
const SAVE_PATH = path.join(ROOT, 'data', 'derived', 'latest_run_final_save.json');
const CONTACT_GRAPH_PATH = path.join(ROOT, 'data', 'derived', 'operational', 'operational_contact_graph.json');
const hasFixture = existsSync(SAVE_PATH);
const CASE_B_SPLIT_THRESHOLD = 0.00015;

function loadState(): GameState {
  return deserializeState(readFileSync(SAVE_PATH, 'utf8')) as GameState;
}

function loadContactGraphEdges(): ContactGraphEdge[] {
  const graph = JSON.parse(readFileSync(CONTACT_GRAPH_PATH, 'utf8')) as { edges: ContactGraphEdge[] };
  return graph.edges.filter((edge) => (edge.shared_segments ?? 0) >= 1);
}

function loadCaseBSplitAdj(edges: EdgeRecord[]): Map<Osid, Osid[]> {
  const caseBSplitAdj = new Map<Osid, Osid[]>();
  for (const edge of edges) {
    if (!edge?.a || !edge?.b) continue;
    if (edge.min_dist !== undefined && edge.min_dist > CASE_B_SPLIT_THRESHOLD) continue;
    const listA = caseBSplitAdj.get(edge.a as Osid) ?? [];
    if (!listA.includes(edge.b as Osid)) listA.push(edge.b as Osid);
    caseBSplitAdj.set(edge.a as Osid, listA);
    const listB = caseBSplitAdj.get(edge.b as Osid) ?? [];
    if (!listB.includes(edge.a as Osid)) listB.push(edge.a as Osid);
    caseBSplitAdj.set(edge.b as Osid, listB);
  }
  for (const list of caseBSplitAdj.values()) list.sort(strictCompare);
  return caseBSplitAdj;
}

function buildEdgeMeta(state: GameState): Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }> {
  const edgeMeta = new Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>();
  for (const edge of state.military.war_front_edges_osid ?? []) {
    edgeMeta.set(edge.edge_id, { a: edge.a, b: edge.b, side_a: edge.side_a, side_b: edge.side_b });
  }
  return edgeMeta;
}

function parseEdgeId(edgeId: string): { a: string; b: string } | null {
  const splitAt = edgeId.indexOf('__');
  if (splitAt <= 0) return null;
  return {
    a: edgeId.slice(0, splitAt),
    b: edgeId.slice(splitAt + 2),
  };
}

function liveOwnerCount(sector: SectorLike): number {
  return (sector.assigned_brigade_ids?.length ?? 0) + (sector.reserve_brigade_ids?.length ?? 0);
}

function collectDuplicateEdgeOwners(
  sectors: Array<{ sector_id: string; corps_id: string; faction: string; edge_ids: string[] }>,
  keyFn: (sector: { sector_id: string; corps_id: string; faction: string }, edgeId: string) => string,
) {
  const ownerBuckets = new Map<string, string[]>();
  for (const sector of sectors) {
    for (const edgeId of sector.edge_ids ?? []) {
      const key = keyFn(sector, edgeId);
      const owners = ownerBuckets.get(key) ?? [];
      owners.push(sector.sector_id);
      ownerBuckets.set(key, owners);
    }
  }

  return [...ownerBuckets.entries()]
    .filter(([, owners]) => owners.length > 1)
    .map(([key, owners]) => ({ key, owners: [...owners].sort() }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

function collectMissingFactionSideOwners(state: GameState, sectors: Array<{ faction: string; edge_ids: string[] }>) {
  const byFactionEdge = new Map<string, number>();
  for (const sector of sectors) {
    for (const edgeId of sector.edge_ids ?? []) {
      const key = `${sector.faction}::${edgeId}`;
      byFactionEdge.set(key, (byFactionEdge.get(key) ?? 0) + 1);
    }
  }

  return (state.military.war_front_edges_osid ?? [])
    .flatMap((edge) => {
      const misses: Array<{ edge_id: string; faction: string; osid: string }> = [];
      if (edge.side_a) {
        const key = `${edge.side_a}::${edge.edge_id}`;
        if (!byFactionEdge.has(key)) {
          misses.push({ edge_id: edge.edge_id, faction: edge.side_a, osid: edge.a });
        }
      }
      if (edge.side_b) {
        const key = `${edge.side_b}::${edge.edge_id}`;
        if (!byFactionEdge.has(key)) {
          misses.push({ edge_id: edge.edge_id, faction: edge.side_b, osid: edge.b });
        }
      }
      return misses;
    })
    .sort((a, b) =>
      a.faction.localeCompare(b.faction)
      || a.edge_id.localeCompare(b.edge_id)
      || a.osid.localeCompare(b.osid),
    );
}

describe.skipIf(!hasFixture)('real save sector truth contracts', () => {
  it('does not serialize rebuilt sectors above the hard sector edge cap', async () => {
    const state = loadState();
    const graph = await loadSettlementGraph();
    const rebuilt = Object.values(buildCorpsFrontSectors(state, graph.edges, null));

    const oversized = rebuilt
      .filter((sector) => sector.edge_ids.length > MAX_SECTOR_EDGES)
      .map((sector) => ({
        sector_id: sector.sector_id,
        corps_id: sector.corps_id,
        edge_count: sector.edge_ids.length,
      }));

    expect(oversized).toEqual([]);
  });

  it('serializes every sector as exactly one contiguous front line', async () => {
    const state = loadState();
    const graphEdges = parseEdges(JSON.parse(readFileSync(CONTACT_GRAPH_PATH, 'utf8')) as { edges: ContactGraphEdge[] });
    const adjacency = buildOsidAdjacency(graphEdges);
    const sharedBoundaryAdj = buildSharedBoundaryAdjacency(graphEdges);
    const caseBSplitAdj = loadCaseBSplitAdj(graphEdges);
    const edgeMeta = buildEdgeMeta(state);
    const centroids = await loadOperationalCentroids(ROOT);
    const sectors = Object.values(state.military.corps_front_sectors ?? {}) as CorpsFrontSector[];

    const fractured = sectors
      .map((sector) => ({
        sector_id: sector.sector_id,
        pieces: splitNonContiguousSectors(
          [sector],
          adjacency,
          sector.faction,
          edgeMeta,
          sharedBoundaryAdj,
          undefined,
          caseBSplitAdj,
          centroids,
        ),
      }))
      .filter((entry) => entry.pieces.length !== 1)
      .map((entry) => ({
        sector_id: entry.sector_id,
        pieces: entry.pieces.length,
        piece_edges: entry.pieces.map((piece) => piece.edge_ids),
      }));

    expect(fractured).toEqual([]);
  });

  it('does not leave zero-owner sibling fragments with overlapping same-corps territory in the final save', () => {
    const state = loadState();
    const graphEdges = parseEdges(JSON.parse(readFileSync(CONTACT_GRAPH_PATH, 'utf8')) as { edges: ContactGraphEdge[] });
    const adjacency = buildOsidAdjacency(graphEdges);
    const sharedBoundaryAdj = buildSharedBoundaryAdjacency(graphEdges);
    const caseBSplitAdj = loadCaseBSplitAdj(graphEdges);
    const edgeMeta = buildEdgeMeta(state);
    const sectors = Object.values(state.military.corps_front_sectors ?? {}) as SectorLike[];

    const offenders = sectors.flatMap((target) => {
      if ((target.edge_ids?.length ?? 0) === 0 || liveOwnerCount(target) > 0) return [];

      const targetTerritory = new Set(target.territory_osids ?? []);
      const targetEndpoints = new Set<string>();
      for (const edgeId of target.edge_ids ?? []) {
        const parsed = parseEdgeId(edgeId);
        if (!parsed) continue;
        targetEndpoints.add(parsed.a);
        targetEndpoints.add(parsed.b);
      }

      return sectors.flatMap((candidate) => {
        if (candidate.sector_id === target.sector_id) return [];
        if (candidate.corps_id !== target.corps_id) return [];
        if (liveOwnerCount(candidate) === 0) return [];

        const candidateTerritory = new Set(candidate.territory_osids ?? []);
        const candidateEndpoints = new Set<string>();
        for (const edgeId of candidate.edge_ids ?? []) {
          const parsed = parseEdgeId(edgeId);
          if (!parsed) continue;
          candidateEndpoints.add(parsed.a);
          candidateEndpoints.add(parsed.b);
        }

        const territoryOverlap = [...targetTerritory].filter((osid) => candidateTerritory.has(osid));
        const endpointOverlap = [...targetEndpoints].filter((osid) => candidateEndpoints.has(osid));
        if (territoryOverlap.length === 0) return [];

        const merged = {
          ...candidate,
          edge_ids: [...new Set([...(candidate.edge_ids ?? []), ...(target.edge_ids ?? [])])].sort(strictCompare),
          territory_osids: [...new Set([...(candidate.territory_osids ?? []), ...(target.territory_osids ?? [])])].sort(strictCompare),
          assigned_brigade_ids: [...new Set([...(candidate.assigned_brigade_ids ?? []), ...(target.assigned_brigade_ids ?? [])])].sort(strictCompare),
          reserve_brigade_ids: [...new Set([...(candidate.reserve_brigade_ids ?? []), ...(target.reserve_brigade_ids ?? [])])].sort(strictCompare),
          rear_brigade_ids: [...new Set([...(candidate.rear_brigade_ids ?? []), ...(target.rear_brigade_ids ?? [])])].sort(strictCompare),
          sub_segments: [...(candidate.sub_segments ?? []), ...(target.sub_segments ?? [])],
          length_edges: [...new Set([...(candidate.edge_ids ?? []), ...(target.edge_ids ?? [])])].length,
        } as SectorLike;
        const pieces = splitNonContiguousSectors(
          [merged as any],
          adjacency,
          candidate.faction,
          edgeMeta,
          sharedBoundaryAdj,
          undefined,
          caseBSplitAdj,
          undefined,
        );
        if (pieces.length !== 1) return [];

        return [{
          target: target.sector_id,
          candidate: candidate.sector_id,
          territoryOverlap,
          endpointOverlap,
        }];
      });
    });

    expect(offenders).toEqual([]);
  });

  it('keeps each live front edge side owned by at most one sector per faction and corps after rebuild', async () => {
    const centroids = await loadOperationalCentroids(ROOT);
    const sectors = Object.values(buildCorpsFrontSectors(loadState(), loadContactGraphEdges(), null, centroids));

    const duplicateFactionEdgeOwners = collectDuplicateEdgeOwners(
      sectors,
      (sector, edgeId) => `${sector.faction}::${edgeId}`,
    );
    const duplicateCorpsEdgeOwners = collectDuplicateEdgeOwners(
      sectors,
      (sector, edgeId) => `${sector.corps_id}::${edgeId}`,
    );

    expect(duplicateFactionEdgeOwners).toEqual([]);
    expect(duplicateCorpsEdgeOwners).toEqual([]);
  });

  it('keeps every live war-edge side owned by a same-faction sector both in the save and after rebuild', async () => {
    const state = loadState();
    const serializedSectors = Object.values(state.military.corps_front_sectors ?? {});
    const serializedMissing = collectMissingFactionSideOwners(state, serializedSectors);

    const centroids = await loadOperationalCentroids(ROOT);
    const rebuilt = Object.values(buildCorpsFrontSectors(state, loadContactGraphEdges(), null, centroids));
    const rebuiltMissing = collectMissingFactionSideOwners(state, rebuilt);

    expect(serializedMissing).toEqual([]);
    expect(rebuiltMissing).toEqual([]);
  });
});
