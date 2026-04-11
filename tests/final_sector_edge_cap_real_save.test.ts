import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { loadSettlementGraph } from '../src/map/settlements.js';
import { buildCorpsFrontSectors } from '../src/sim/combat/corps_front_sectors.js';
import { MAX_SECTOR_EDGES } from '../src/sim/combat/corps_front_sectors_constants.js';
import { deserializeState } from '../src/state/serialize.js';

const SAVE_PATH = resolve(__dirname, '..', 'data', 'derived', 'latest_run_final_save.json');
const hasFixture = existsSync(SAVE_PATH);

describe.skipIf(!hasFixture)('final sector edge cap on live save', () => {
  it('does not serialize rebuilt sectors above the hard sector edge cap', async () => {
    const state = deserializeState(readFileSync(SAVE_PATH, 'utf8'));
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
});
