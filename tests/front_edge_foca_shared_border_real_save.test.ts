import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { computeFrontEdgesOsid } from '../src/map/front_edges.js';
import { loadSettlementGraph } from '../src/map/settlements.js';
import { deserializeState } from '../src/state/serialize.js';

const SAVE_PATH = resolve(__dirname, '..', 'data', 'derived', 'latest_run_final_save.json');
const hasFixture = existsSync(SAVE_PATH);

describe.skipIf(!hasFixture)('Foca shared-border front edge on live save', () => {
  it('emits every current Donje Zesce hostile shared-boundary edge when controllers differ', async () => {
    const state = deserializeState(readFileSync(SAVE_PATH, 'utf8'));
    const graph = await loadSettlementGraph();
    const frontEdges = computeFrontEdgesOsid(state, graph.edges, new Map());
    const controllers = state.political.political_controllers ?? {};
    const donjeZesce = 'op:foca:donje_zesce';
    const candidateNeighbors = [
      'op:foca:izbisno',
      'op:foca:patkovina',
      'op:foca:ustikolina',
      'op:foca:mazlina',
    ];

    const hostileNeighbors = candidateNeighbors.filter((neighbor) => {
      const neighborController = controllers[neighbor];
      return typeof neighborController === 'string' && neighborController !== controllers[donjeZesce];
    });

    expect(hostileNeighbors.length).toBeGreaterThan(0);
    for (const neighbor of hostileNeighbors) {
      const edgeId = [donjeZesce, neighbor].sort().join('__');
      expect(frontEdges.some((edge) => edge.edge_id === edgeId), `${edgeId} should be a live war edge`).toBe(true);
    }
  });
});
