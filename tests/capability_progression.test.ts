import assert from 'node:assert';
import { test } from 'node:test';
import { updateCapabilityProfiles } from '../src/state/capability_progression.js';
import type { GameState } from '../src/state/game_state.js';

function baseState(turn: number): GameState {
    return {
        schema_version: 1,
        meta: { turn, seed: 'cap-test' },
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

test('updateCapabilityProfiles applies year-based curves', () => {
    const state = baseState(0);
    updateCapabilityProfiles(state);
    const rbih = state.factions.find((f) => f.id === 'RBiH')!;
    const rs = state.factions.find((f) => f.id === 'RS')!;
    assert.strictEqual(rbih.capability_profile?.equipment_access, 0.15);
    assert.strictEqual(rs.capability_profile?.equipment_operational, 0.9);

    state.meta.turn = 104; // 1994 start
    updateCapabilityProfiles(state);
    const hrhb = state.factions.find((f) => f.id === 'HRHB')!;
    assert.strictEqual(hrhb.capability_profile?.equipment_access, 0.5);

    state.meta.turn = 130; // 1994 post-Washington phase
    updateCapabilityProfiles(state);
    assert.strictEqual(hrhb.capability_profile?.equipment_access, 0.65);
});
