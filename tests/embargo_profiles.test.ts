import assert from 'node:assert';
import { test } from 'node:test';
import { updateEmbargoProfiles } from '../src/state/embargo.js';
import type { GameState } from '../src/state/game_state.js';

function baseState(turn: number): GameState {
    return {
        schema_version: 1,
        meta: { turn, seed: 'embargo-test' },
        factions: [
            { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {}
    };
}

test('updateEmbargoProfiles initializes and progresses smuggling', () => {
    const state = baseState(0);
    updateEmbargoProfiles(state);
    const rs = state.factions.find((f) => f.id === 'RS')!;
    assert.ok(rs.embargo_profile);
    assert.strictEqual(rs.embargo_profile.heavy_equipment_access, 0.9);
    assert.strictEqual(rs.embargo_profile.smuggling_efficiency, 0);

    state.meta.turn = 200;
    updateEmbargoProfiles(state);
    assert.ok(rs.embargo_profile.smuggling_efficiency >= 0.29);
    assert.ok(rs.embargo_profile.smuggling_efficiency <= 0.31);
});
