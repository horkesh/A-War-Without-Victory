import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildCorpsFrontSectors } from '../src/sim/combat/corps_front_sectors.js';
import { loadOperationalEdges } from '../src/data/operational_data.js';

describe('Drina sector frontline integrity', () => {
    it('rebuilds the latest Drina run into single-frontline sectors', async () => {
        const raw = fs.readFileSync(
            './runs/apr1992_definitive_40w__d452d2a10f3d69af__w40_n1304/final_save.json',
            'utf8',
        );
        const state = JSON.parse(raw);
        const edges = await loadOperationalEdges();

        const rebuilt = buildCorpsFrontSectors(state, edges, null);
        const drinaSectors = Object.values(rebuilt).filter((sector) => sector.corps_id === 'vrs_drina');

        assert.ok(drinaSectors.length > 0, 'Expected Drina sectors to exist after rebuild');
        for (const sector of drinaSectors) {
            assert.equal(
                sector.sub_segments.length,
                1,
                `Sector ${sector.sector_id} should resolve to exactly one frontline sub-segment`,
            );
        }
    });
});
