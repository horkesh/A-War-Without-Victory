import assert from 'node:assert';
import { test } from 'node:test';
import type { GameState, SarajevoState } from '../src/state/game_state.js';
import { ensureInternationalVisibilityPressure, updateInternationalVisibilityPressure, updatePatronState } from '../src/state/patron_pressure.js';

test('updateInternationalVisibilityPressure accumulates sarajevo + enclave pressure', () => {
    const state: GameState = {
        schema_version: 1,
        meta: { turn: 12, seed: 'ivp-test' },
        factions: [
            {
                id: 'RBiH',
                profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
                negotiation: { pressure: 10, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null }
            }
        ],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {}
    };
    const sarajevo: SarajevoState = {
        mun_id: '10529',
        settlement_ids: [],
        siege_status: 'BESIEGED',
        siege_duration: 5,
        external_supply: 0,
        internal_supply: 0,
        siege_intensity: 0.5,
        international_focus: 1,
        humanitarian_pressure: 0.2,
        last_updated_turn: 12
    };

    ensureInternationalVisibilityPressure(state);
    const ivp = updateInternationalVisibilityPressure(state, sarajevo, 0.2);
    assert.ok(ivp.sarajevo_siege_visibility > 0);
    assert.ok(ivp.enclave_humanitarian_pressure > 0);
    assert.ok(ivp.negotiation_momentum > 0);

    updatePatronState(state, sarajevo, ivp);
    const patron = state.factions[0].patron_state;
    assert.ok(patron);
    assert.ok(patron.patron_commitment >= 0);
});
