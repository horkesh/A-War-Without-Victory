import { expect, test } from 'vitest';
import { updateCapabilityProfiles } from '../src/state/capability_progression.js';
import type { GameState } from '../src/state/game_state.js';

function baseState(turn: number): GameState {
    return {
        schema_version: 1,
        meta: { turn, seed: 'cap-test' },
        factions: [
            { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        } as any,
        political: {} as any,
        displacement: {} as any,
    };
}

test('updateCapabilityProfiles applies year-based curves', () => {
    const state = baseState(0);
    updateCapabilityProfiles(state);
    const rbih = state.factions.find((faction) => faction.id === 'RBiH');
    const rs = state.factions.find((faction) => faction.id === 'RS');
    expect(rbih?.capability_profile?.equipment_access).toBe(0.15);
    expect(rs?.capability_profile?.equipment_operational).toBe(0.9);

    state.meta.turn = 104;
    updateCapabilityProfiles(state);
    const hrhb = state.factions.find((faction) => faction.id === 'HRHB');
    expect(hrhb?.capability_profile?.equipment_access).toBe(0.5);

    state.meta.turn = 130;
    updateCapabilityProfiles(state);
    expect(hrhb?.capability_profile?.equipment_access).toBe(0.65);
});
