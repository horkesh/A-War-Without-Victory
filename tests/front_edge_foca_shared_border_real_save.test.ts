import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { computeFrontEdgesOsid } from '../src/map/front_edges.js';
import { loadSettlementGraph } from '../src/map/settlements.js';
import { deserializeState } from '../src/state/serialize.js';

const SAVE_PATH = resolve(__dirname, '..', 'data', 'derived', 'latest_run_final_save.json');
const hasFixture = existsSync(SAVE_PATH);

describe.skipIf(!hasFixture)('Foca shared-border front edge on live save', () => {
  it('emits Donje Zesce vs Mazlina as a front edge when controllers differ', async () => {
    const state = deserializeState(readFileSync(SAVE_PATH, 'utf8'));
    const graph = await loadSettlementGraph();
    const frontEdges = computeFrontEdgesOsid(state, graph.edges, new Map());

    const target = frontEdges.find((edge) =>
      edge.edge_id === 'op:foca:donje_zesce__op:foca:mazlina'
      || edge.edge_id === 'op:foca:mazlina__op:foca:donje_zesce',
    );

    expect(target).toBeDefined();
  });
});
