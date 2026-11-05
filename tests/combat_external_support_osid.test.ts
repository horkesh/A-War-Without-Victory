import { describe, expect, it } from 'vitest';
import { computeAttackerPower } from '../src/sim/combat/combat_math.js';
import { makeFormation } from './test_factories.js';
import type { GameState } from '../src/state/game_state.js';

describe('dated attack support in OSID combat', () => {
    it('applies only within its faction, municipality, and turn window', () => {
        const brigade = makeFormation({
            id: 'rs_brigade', faction: 'RS', posture: 'attack',
            location_osid: 'op:test:stage',
            composition: {
                infantry: 1000, tanks: 0, artillery: 0, aa_systems: 0,
                tank_condition: { operational: 0, degraded: 0, non_operational: 0 },
                artillery_condition: { operational: 0, degraded: 0, non_operational: 0 },
            },
        });
        const state = {
            meta: { turn: 69 },
            military: { formations: { rs_brigade: brigade }, war_timeline: { external_support: [{
                faction: 'RS', end_turn: 80, municipalities: ['trnovo'], combat_multiplier: 1.26,
            }] } },
            political: { political_controllers: { 'op:test:stage': 'RS' } },
        } as unknown as GameState;
        const baseline = computeAttackerPower(state, brigade, null, 'attack', 1, 'op:trnovo:trnovo');
        state.military.war_timeline!.external_support.push({
            faction: 'RS', role: 'attack', osid_attack_support: true, start_turn: 69, end_turn: 79,
            municipalities: ['trnovo'], combat_multiplier: 1.6,
        });
        expect(computeAttackerPower(state, brigade, null, 'attack', 1, 'op:trnovo:trnovo') / baseline).toBeCloseTo(1.6);
        expect(computeAttackerPower(state, brigade, null, 'attack', 1, 'op:foca:mazlina')).toBeCloseTo(baseline);
        state.meta.turn = 79;
        const outsideWindow = computeAttackerPower(state, brigade, null, 'attack', 1, 'op:trnovo:trnovo');
        state.military.war_timeline!.external_support = [];
        expect(outsideWindow).toBeCloseTo(computeAttackerPower(state, brigade, null, 'attack', 1, 'op:trnovo:trnovo'));
    });
});
