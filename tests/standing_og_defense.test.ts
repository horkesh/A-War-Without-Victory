import { describe, expect, it } from 'vitest';

import { isStandingOgDefenseBrigadeAvailable } from '../src/sim/combat/standing_og_defense.js';
import type { FormationId, GameState } from '../src/state/game_state.js';

function makeState(): GameState {
    return {
        meta: { turn: 5, phase: 'war', seed: 'standing-og-availability' },
        factions: [],
        military: {
            formations: {
                available: {
                    id: 'available',
                    name: 'Available',
                    faction: 'RBiH',
                    kind: 'brigade',
                    status: 'active',
                    personnel: 1000,
                    cohesion: 60,
                    morale: 60,
                    experience: 0.3,
                    location_osid: 'op:test:home',
                },
                arbih_246th_vitezka_mountain: {
                    id: 'arbih_246th_vitezka_mountain',
                    name: '246th Vitezka Mountain',
                    faction: 'RBiH',
                    kind: 'brigade',
                    status: 'active',
                    personnel: 600,
                    cohesion: 60,
                    morale: 60,
                    experience: 0.3,
                    location_osid: 'op:zvornik:sapna',
                },
                operation_participant: {
                    id: 'operation_participant',
                    name: 'Operation participant',
                    faction: 'RBiH',
                    kind: 'brigade',
                    status: 'active',
                    personnel: 1000,
                    cohesion: 60,
                    morale: 60,
                    experience: 0.3,
                    location_osid: 'op:test:assembly',
                },
                disrupted: {
                    id: 'disrupted',
                    name: 'Disrupted',
                    faction: 'RBiH',
                    kind: 'brigade',
                    status: 'active',
                    personnel: 1000,
                    cohesion: 60,
                    morale: 60,
                    experience: 0.3,
                    disrupted_turns: 1,
                    location_osid: 'op:test:home',
                },
                moving: {
                    id: 'moving',
                    name: 'Moving',
                    faction: 'RBiH',
                    kind: 'brigade',
                    status: 'active',
                    personnel: 1000,
                    cohesion: 60,
                    morale: 60,
                    experience: 0.3,
                    location_osid: 'op:test:home',
                },
                ordered: {
                    id: 'ordered',
                    name: 'Ordered',
                    faction: 'RBiH',
                    kind: 'brigade',
                    status: 'active',
                    personnel: 1000,
                    cohesion: 60,
                    morale: 60,
                    experience: 0.3,
                    location_osid: 'op:test:home',
                },
            },
            corps_command: {
                arbih_test_corps: {
                    corps_id: 'arbih_test_corps',
                    faction: 'RBiH',
                    stance: 'offensive',
                    active_operations: [{
                        name: 'Assembly operation',
                        type: 'sector_attack',
                        phase: 'planning',
                        started_turn: 0,
                        participating_brigades: ['operation_participant'],
                    }],
                },
                arbih_2nd_corps: {
                    corps_id: 'arbih_2nd_corps',
                    faction: 'RBiH',
                    stance: 'offensive',
                    active_operations: [],
                    queued_operations: ['Srebrenica–Cerska Link-Up'],
                },
            },
            brigade_movement_state: {
                moving: {
                    status: 'in_transit',
                    destination_sids: ['op:test:assembly'],
                },
            },
            brigade_movement_orders: {
                ordered: {
                    destination_sids: ['op:test:assembly'],
                },
            },
        },
        political: {},
    } as unknown as GameState;
}

describe('standing OG reactive-defense availability', () => {
    it('does not borrow formations already committed to another action', () => {
        const state = makeState();

        expect(isStandingOgDefenseBrigadeAvailable(state, 'available' as FormationId)).toBe(true);
        expect(isStandingOgDefenseBrigadeAvailable(state, 'operation_participant' as FormationId)).toBe(false);
        expect(isStandingOgDefenseBrigadeAvailable(state, 'disrupted' as FormationId)).toBe(false);
        expect(isStandingOgDefenseBrigadeAvailable(state, 'moving' as FormationId)).toBe(false);
        expect(isStandingOgDefenseBrigadeAvailable(state, 'ordered' as FormationId)).toBe(false);
        expect(isStandingOgDefenseBrigadeAvailable(state, 'arbih_246th_vitezka_mountain' as FormationId)).toBe(false);
    });
});
