import { describe, expect, it } from 'vitest';
import { isOperationOppositeSector } from '../src/sim/combat/sector_intel.js';

const friendly: any = {
    sector_id: 's0', corps_id: 'arbih_1', faction: 'RBiH',
    territory_osids: ['T1'],
    sub_segments: [{ friendly_osids: ['A', 'B'], enemy_osids: ['X', 'Y'] }],
};

function op(extra: Record<string, unknown>): any {
    return { name: 'op', type: 'sector_attack', phase: 'planning', started_turn: 1, phase_started_turn: 1, participating_brigades: [], ...extra };
}

function state(locations: Record<string, string> = {}): any {
    return { military: { formations: Object.fromEntries(Object.entries(locations).map(([id, loc]) => [id, { id, location_osid: loc }])) } };
}

describe('enemy massing is local to the OG (SE4)', () => {
    it('ignores an operation aimed elsewhere on the enemy corps front', () => {
        expect(isOperationOppositeSector(op({ objectives: ['FAR'], participating_brigades: ['b1'] }), friendly, state({ b1: 'FAR_STAGE' }))).toBe(false);
    });

    it('sees an objective in the OG ground (flat list, axis, target settlement, probe target)', () => {
        expect(isOperationOppositeSector(op({ objectives: ['A'] }), friendly, state())).toBe(true);
        expect(isOperationOppositeSector(op({ axes: [{ objectives: ['B'] }] }), friendly, state())).toBe(true);
        expect(isOperationOppositeSector(op({ target_settlements: ['T1'] }), friendly, state())).toBe(true);
        expect(isOperationOppositeSector(op({ type: 'probe', active_probe: { target_osid: 'A' } }), friendly, state())).toBe(true);
    });

    it('sees staging or a participant on the enemy ground the OG faces', () => {
        expect(isOperationOppositeSector(op({ staging_osid: 'X' }), friendly, state())).toBe(true);
        expect(isOperationOppositeSector(op({ axes: [{ objectives: [], staging_osid: 'Y' }] }), friendly, state())).toBe(true);
        expect(isOperationOppositeSector(op({ participating_brigades: ['b1'] }), friendly, state({ b1: 'Y' }))).toBe(true);
    });
});
