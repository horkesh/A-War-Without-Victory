import { beforeAll, describe, expect, it } from 'vitest';
import { startNewCampaign } from '../src/desktop/desktop_sim.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';
import type { LoadedGameState } from '../src/ui/map/data/types.js';

describe('officer biography read model', () => {
    let view: LoadedGameState;

    beforeAll(async () => {
        const state = (await startNewCampaign(process.cwd(), 'RBiH', 'apr_1992')).state;
        view = parseGameState(deserializeState(serializeState(state)));
    }, 120_000);

    it('projects authored biography and exact assignment fields after save hydration', () => {
        const byId = new Map((view.namedOfficerData ?? []).map((officer) => [officer.id, officer]));
        expect(byId.get('arbih_halilovic')).toMatchObject({
            id: 'arbih_halilovic',
            faction: 'RBiH',
            rank: 'army_commander',
            bio_short: 'JNA-background officer leading the RBiH army command at scenario start.',
            command_style: 'Assertive, improvised central command',
            known_for: 'Opening RBiH army command',
            political_alignment_note: 'Modeled as an RBiH army-command appointment.',
        });
        expect(byId.get('vrs_talic')).toMatchObject({
            faction: 'RS',
            home_corps_id: 'vrs_1st_krajina',
            historical_corps_id: 'vrs_1st_krajina',
            assigned_corps_id: 'vrs_1st_krajina',
        });
    });

    it('keeps unsupported identities absent instead of resolving similar names', () => {
        const ids = new Set((view.namedOfficerData ?? []).map((officer) => officer.id));
        expect(ids.has('hvo_i_nakic')).toBe(false);
        expect(ids.has('hvo_bilonjic')).toBe(false);
        expect(ids.has('hvo_nakic')).toBe(true);
    });

    it('sorts the read model by immutable officer ID', () => {
        const ids = (view.namedOfficerData ?? []).map((officer) => officer.id);
        expect(ids).toEqual([...ids].sort());
    });
});
