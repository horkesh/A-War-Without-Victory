import { describe, expect, it } from 'vitest';

import type { FormationState, GameState } from '../src/state/game_state.js';
import { getCorpsHomeMun, getFactionCorps } from '../src/sim/combat/bot_corps_helpers.js';

function brigade(id: string, corpsId: string, osid: string): FormationState {
    return {
        id,
        faction: 'RBiH',
        kind: 'brigade',
        status: 'active',
        corps_id: corpsId,
        location_osid: osid,
    } as FormationState;
}

function corpsAsset(id: string, tags?: string[]): FormationState {
    return {
        id,
        faction: 'RBiH',
        kind: 'corps_asset',
        status: 'active',
        ...(tags ? { tags } : {}),
    } as FormationState;
}

function stateWith(corps: FormationState): GameState {
    return {
        military: {
            formations: {
                [corps.id]: corps,
                b1: brigade('b1', corps.id, 'op:maglaj:a'),
                b2: brigade('b2', corps.id, 'op:maglaj:b'),
                b3: brigade('b3', corps.id, 'op:zenica:c'),
            },
            corps_command: { [corps.id]: {} },
        },
    } as unknown as GameState;
}

describe('corps home reads the own tag', () => {
    it('uses the mun: tag of a loaded corps_asset, not the mode of its brigades', () => {
        const state = stateWith(corpsAsset('corps_3', ['mun:zenica']));
        const [corps] = getFactionCorps(state, 'RBiH');
        expect(corps.id).toBe('corps_3');
        expect(getCorpsHomeMun(corps)).toBe('zenica');
    });

    it('still reads the own tag when the loaded kind is corps', () => {
        const state = stateWith({ ...corpsAsset('corps_3', ['mun:zenica']), kind: 'corps' } as FormationState);
        const [corps] = getFactionCorps(state, 'RBiH');
        expect(getCorpsHomeMun(corps)).toBe('zenica');
    });

    it('falls back to the brigade-location mode when the corps has no own tag', () => {
        const state = stateWith(corpsAsset('corps_3'));
        const [corps] = getFactionCorps(state, 'RBiH');
        expect(getCorpsHomeMun(corps)).toBe('maglaj');
    });
});
