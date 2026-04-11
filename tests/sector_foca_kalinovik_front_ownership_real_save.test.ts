import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildCorpsFrontSectors } from '../src/sim/combat/corps_front_sectors';
import type { GameState } from '../src/state/game_state.js';

type ContactGraphEdge = {
  edge_id: string;
  a: string;
  b: string;
  shared_segments?: number;
};

const ROOT = process.cwd();
const FINAL_SAVE_PATH = path.join(ROOT, 'data', 'derived', 'latest_run_final_save.json');
const CONTACT_GRAPH_PATH = path.join(ROOT, 'data', 'derived', 'operational', 'operational_contact_graph.json');

function loadState(): GameState {
  return JSON.parse(fs.readFileSync(FINAL_SAVE_PATH, 'utf8')) as GameState;
}

function loadEdges(): ContactGraphEdge[] {
  const graph = JSON.parse(fs.readFileSync(CONTACT_GRAPH_PATH, 'utf8')) as { edges: ContactGraphEdge[] };
  return graph.edges.filter((edge) => (edge.shared_segments ?? 0) >= 1);
}

describe('Herzegovina Foca/Kalinovik front ownership from real save', () => {
  function getHerzegovinaRimWarEdgeIds(state: GameState): string[] {
    return (state.military.war_front_edges_osid ?? [])
      .map((edge) => edge.edge_id)
      .filter((edgeId): edgeId is string =>
        edgeId.includes('op:foca:')
        || edgeId.includes('op:kalinovik:')
        || edgeId.includes('op:gacko:')
        || edgeId.includes('op:nevesinje:'),
      );
  }

  it('serializes every live Herzegovina-rim war edge into a Herzegovina sector packet', () => {
    const state = loadState();
    const ownerByEdge = new Map<string, string[]>();
    for (const sector of Object.values(state.military.corps_front_sectors ?? {})) {
      for (const edgeId of sector.edge_ids ?? []) {
        const owners = ownerByEdge.get(edgeId) ?? [];
        owners.push(sector.sector_id);
        ownerByEdge.set(edgeId, owners);
      }
    }

    const expectedEdges = getHerzegovinaRimWarEdgeIds(state);
    expect(expectedEdges.length).toBeGreaterThan(0);

    for (const edgeId of expectedEdges) {
      const owners = ownerByEdge.get(edgeId) ?? [];
      expect(
        owners.some((sectorId) => sectorId.startsWith('sector:vrs_herzegovina:')),
        `${edgeId} should be serialized into a vrs_herzegovina sector packet`,
      ).toBe(true);
    }
  });

  it('keeps every live Herzegovina-rim war edge owned by a Herzegovina sector when rebuilt from the final state', () => {
    const state = loadState();
    const sectors = buildCorpsFrontSectors(state, loadEdges(), null);
    const ownerByEdge = new Map<string, string[]>();
    for (const sector of Object.values(sectors)) {
      for (const edgeId of sector.edge_ids) {
        const owners = ownerByEdge.get(edgeId) ?? [];
        owners.push(sector.sector_id);
        ownerByEdge.set(edgeId, owners);
      }
    }

    const expectedEdges = getHerzegovinaRimWarEdgeIds(state);
    expect(expectedEdges.length).toBeGreaterThan(0);

    for (const edgeId of expectedEdges) {
      const owners = ownerByEdge.get(edgeId) ?? [];
      expect(
        owners.some((sectorId) => sectorId.startsWith('sector:vrs_herzegovina:')),
        `${edgeId} should remain owned by a vrs_herzegovina sector`,
      ).toBe(true);
    }
  });
});
