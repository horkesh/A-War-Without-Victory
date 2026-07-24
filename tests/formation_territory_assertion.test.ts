import { describe, expect, it } from 'vitest';

import { assertFormationsInFriendlyTerritory } from '../src/sim/combat/assert_formation_territory.js';
import type { GameState } from '../src/state/game_state.js';

function makeState(overrides: {
    political_controllers?: Record<string, string | null>;
    formations?: Record<string, any>;
    war_alliance_rbih_hrhb?: number;
}): GameState {
    return {
        meta: { turn: 10, phase: 'war' },
        military: { formations: overrides.formations ?? {} },
        political: {
            political_controllers: overrides.political_controllers ?? {},
            war_alliance_rbih_hrhb: overrides.war_alliance_rbih_hrhb,
        },
    } as unknown as GameState;
}

describe('assertFormationsInFriendlyTerritory', () => {
    it('rejects active physical formations with missing, null, or non-friendly locations', () => {
        const state = makeState({
            political_controllers: {
                'op:test:enemy': 'RS',
                'op:test:null': null,
            },
            formations: {
                a_missing: { id: 'a_missing', status: 'active', faction: 'RBiH', kind: 'brigade' },
                b_null: { id: 'b_null', status: 'active', faction: 'RBiH', kind: 'militia', location_osid: null },
                c_uncontrolled: { id: 'c_uncontrolled', status: 'active', faction: 'RBiH', kind: 'og', location_osid: 'op:test:null' },
                d_enemy: { id: 'd_enemy', status: 'active', faction: 'RBiH', kind: 'paramilitary', location_osid: 'op:test:enemy' },
            },
        });

        expect(assertFormationsInFriendlyTerritory(state)).toEqual([
            {
                severity: 'error',
                code: 'formation.location_missing',
                message: 'Active physical formation a_missing (RBiH) has no location_osid',
                path: 'military.formations.a_missing.location_osid',
            },
            {
                severity: 'error',
                code: 'formation.location_missing',
                message: 'Active physical formation b_null (RBiH) has no location_osid',
                path: 'military.formations.b_null.location_osid',
            },
            {
                severity: 'error',
                code: 'formation.location_not_friendly',
                message: 'Active physical formation c_uncontrolled (RBiH) is at op:test:null controlled by null',
                path: 'military.formations.c_uncontrolled.location_osid',
            },
            {
                severity: 'error',
                code: 'formation.location_not_friendly',
                message: 'Active physical formation d_enemy (RBiH) is at op:test:enemy controlled by RS',
                path: 'military.formations.d_enemy.location_osid',
            },
        ]);
    });

    it('exempts inactive formations and command records', () => {
        const state = makeState({
            political_controllers: { 'op:test:enemy': 'RS' },
            formations: {
                inactive: { id: 'inactive', status: 'inactive', faction: 'RBiH', kind: 'brigade' },
                corps: { id: 'corps', status: 'active', faction: 'RBiH', kind: 'corps', location_osid: 'op:test:enemy' },
                corps_asset: { id: 'corps_asset', status: 'active', faction: 'RBiH', kind: 'corps_asset' },
                army_hq: { id: 'army_hq', status: 'active', faction: 'RBiH', kind: 'army_hq' },
            },
        });

        expect(assertFormationsInFriendlyTerritory(state)).toEqual([]);
    });

    it('accepts own and allied friendly territory', () => {
        const state = makeState({
            political_controllers: {
                'op:test:own': 'RBiH',
                'op:test:ally': 'HRHB',
            },
            formations: {
                own: { id: 'own', status: 'active', faction: 'RBiH', kind: 'brigade', location_osid: 'op:test:own' },
                allied: { id: 'allied', status: 'active', faction: 'RBiH', kind: 'operational_group', location_osid: 'op:test:ally' },
            },
            war_alliance_rbih_hrhb: 0.5,
        });

        expect(assertFormationsInFriendlyTerritory(state)).toEqual([]);
    });
});
