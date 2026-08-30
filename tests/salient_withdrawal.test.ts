import { describe, expect, it } from 'vitest';
import type { FormationState, GameState } from '../src/state/game_state.js';
import { evacuateFormationsSeveredByCapture } from '../src/sim/combat/salient_withdrawal.js';

function brigade(id: string, location: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id, name: id, faction: 'RBiH', kind: 'brigade', status: 'active', created_turn: 0,
        personnel: 1500, cohesion: 60, morale: 60, location_osid: location,
        assignment: { kind: 'sector', sector_id: 'sector:rbih:pocket' },
        ...overrides,
    } as FormationState;
}

function stateWith(formations: Record<string, FormationState>): GameState {
    return {
        meta: { turn: 23, phase: 'war', seed: 'salient-withdrawal' },
        factions: [{ id: 'RBiH' }, { id: 'HRHB' }, { id: 'RS' }],
        military: { formations } as any,
        political: {
            war_alliance_rbih_hrhb: 0.75,
            political_controllers: {
                pocket: 'RBiH', corridor: 'HRHB', neck: 'RS', rear: 'RBiH', rear2: 'RBiH',
            },
            last_supply_state_by_osid: {
                pocket: 'critical', corridor: 'adequate', neck: 'adequate', rear: 'adequate', rear2: 'adequate',
            },
        } as any,
        displacement: {} as any,
    } as unknown as GameState;
}

const adjacency = new Map<string, readonly string[]>([
    ['pocket', ['corridor']],
    ['corridor', ['neck', 'pocket']],
    ['neck', ['corridor', 'rear']],
    ['rear', ['neck', 'rear2']],
    ['rear2', ['rear']],
]);

describe('salient withdrawal on a collapsing neck', () => {
    it('evacuates a non-enclave brigade through an allied corridor to the main line', () => {
        const state = stateWith({ pocket_brigade: brigade('pocket_brigade', 'pocket') });

        const report = evacuateFormationsSeveredByCapture(state, 'neck', 'RBiH', adjacency);

        expect(report.evacuated_formation_ids).toEqual(['pocket_brigade']);
        expect(state.military.formations.pocket_brigade.location_osid).toBe('rear');
        expect(state.military.formations.pocket_brigade.stranded_status).toBe('reconnected');
        expect(state.military.formations.pocket_brigade.personnel).toBe(1500);
    });

    it('does not evacuate a hard-coded enclave brigade', () => {
        const state = stateWith({ enclave: brigade('enclave', 'pocket', { tags: ['enclave'] }) });

        const report = evacuateFormationsSeveredByCapture(state, 'neck', 'RBiH', adjacency);

        expect(report.evacuated_formation_ids).toEqual([]);
        expect(state.military.formations.enclave.location_osid).toBe('pocket');
    });

    it('does not evacuate a brigade committed to an active operation in the pocket', () => {
        const state = stateWith({ committed: brigade('committed', 'pocket') });
        state.military.corps_command = {
            arbih_2nd_corps: {
                corps_id: 'arbih_2nd_corps',
                stance: 'offensive',
                active_operations: [{
                    id: 'op_link', name: 'Pocket Link', corps_id: 'arbih_2nd_corps',
                    faction: 'RBiH', type: 'sector_attack', phase: 'planning',
                    participating_brigades: ['committed'], axes: [], objectives: [],
                } as any],
            } as any,
        };

        const report = evacuateFormationsSeveredByCapture(state, 'neck', 'RBiH', adjacency);

        expect(report.evacuated_formation_ids).toEqual([]);
        expect(state.military.formations.committed.location_osid).toBe('pocket');
    });

    it('does not evacuate a local brigade holding an active operation staging cell', () => {
        const state = stateWith({ local_guard: brigade('local_guard', 'pocket') });
        state.military.corps_command = {
            arbih_2nd_corps: {
                corps_id: 'arbih_2nd_corps',
                stance: 'offensive',
                active_operations: [{
                    id: 'op_link', name: 'Pocket Link', corps_id: 'arbih_2nd_corps',
                    faction: 'RBiH', type: 'sector_attack', phase: 'planning',
                    participating_brigades: ['other'],
                    staging_osid: 'pocket', axes: [], objectives: [],
                } as any],
            } as any,
        };

        const report = evacuateFormationsSeveredByCapture(state, 'neck', 'RBiH', adjacency);

        expect(report.evacuated_formation_ids).toEqual([]);
        expect(state.military.formations.local_guard.location_osid).toBe('pocket');
    });
});
