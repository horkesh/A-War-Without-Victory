import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
    collectAssignmentCompletenessIssues,
    validateState,
} = require('../tools/validate_run_consistency.cjs') as {
    collectAssignmentCompletenessIssues: (state: any) => Array<{ id: string; corps: string; faction: string }>;
    validateState: (state: any, runLabel: string) => { failures: number; lines: string[] };
};

function makeBrigade(id: string, overrides: Record<string, unknown> = {}) {
    return {
        id,
        kind: 'brigade',
        status: 'active',
        faction: 'RS',
        corps_id: 'vrs_drina',
        personnel: 1200,
        assignment: null,
        ...overrides,
    };
}

describe('validate_run_consistency assignment completeness', () => {
    it('uses canonical final unresolved-sector truth instead of treating every unassigned brigade as a failure', () => {
        const state = {
            meta: { turn: 10 },
            military: {
                formations: {
                    hrhb_travnik_brigade: makeBrigade('hrhb_travnik_brigade', {
                        faction: 'HRHB',
                        corps_id: 'hvo_central_bosnia',
                        location_osid: 'op:novi_travnik:rat_2',
                        home_osid: 'op:novi_travnik:rat_2',
                    }),
                    brig_truthful_unresolved: makeBrigade('brig_truthful_unresolved', {
                        location_osid: 'op:rogatica:rogatica_2',
                    }),
                },
                corps_front_sectors: {
                    'sector:hvo_central_bosnia:0': {
                        sector_id: 'sector:hvo_central_bosnia:0',
                        corps_id: 'hvo_central_bosnia',
                        assigned_brigade_ids: [],
                        reserve_brigade_ids: [],
                    },
                    'sector:vrs_drina:0': {
                        sector_id: 'sector:vrs_drina:0',
                        corps_id: 'vrs_drina',
                        assigned_brigade_ids: [],
                        reserve_brigade_ids: [],
                    },
                },
                unresolved_sector_brigades: ['brig_truthful_unresolved'],
                sector_intel: {
                    'sector:vrs_drina:0': [{ offensive_signs: true }],
                },
            },
        };

        expect(collectAssignmentCompletenessIssues(state)).toEqual([
            {
                id: 'brig_truthful_unresolved',
                corps: 'vrs_drina',
                faction: 'RS',
            },
        ]);

        const result = validateState(state, 'synthetic');
        expect(result.failures).toBe(1);
        expect(result.lines.some((line) => line.includes('brig_truthful_unresolved'))).toBe(true);
        expect(result.lines.some((line) => line.includes('hrhb_travnik_brigade'))).toBe(false);
    });
});
