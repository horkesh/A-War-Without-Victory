import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadOobCorps } from '../src/scenario/oob_loader.js';
import { createStateFromScenario } from '../src/scenario/scenario_runner.js';
import { activateCorpsForTurn } from '../src/sim/early_war/activate_corps.js';

const root = process.cwd();
const scenario = join(root, 'data/scenarios/apr1992_definitive_188w.json');

describe('ARBiH 7th Corps formation week', () => {
    it('is a strict mid-war corps in the OOB: Travnik, week 99 (26 Feb 1994)', async () => {
        const corps = await loadOobCorps(root);
        expect(corps.find((c) => c.id === 'arbih_7th_corps')).toMatchObject({
            faction: 'RBiH', hq_mun: 'travnik', available_from: 99, strict_available_from: true,
        });
        // Only the 7th opts in; every other corps keeps scenario-start creation.
        expect(corps.filter((c) => c.strict_available_from).map((c) => c.id)).toEqual(['arbih_7th_corps']);
    });

    it('does not exist at scenario start, and the war step creates it on week 99, not 98', async () => {
        const state = await createStateFromScenario(scenario, root);
        expect(state.military.formations.arbih_7th_corps).toBeUndefined();
        expect(state.military.formations.arbih_3rd_corps).toBeDefined();
        const corps = await loadOobCorps(root);
        activateCorpsForTurn(state, corps, 98);
        expect(state.military.formations.arbih_7th_corps).toBeUndefined();
        activateCorpsForTurn(state, corps, 99);
        expect(state.military.formations.arbih_7th_corps).toMatchObject({ status: 'active', kind: 'corps_asset', created_turn: 99, hq_osid: 'op:travnik:travnik_2' });
    }, 120_000);
});
