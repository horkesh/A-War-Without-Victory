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
});
