import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
    classifyFormationLifeInventory,
} = require('../tools/diagnostics/formation_life_packet_inventory.cjs') as {
    classifyFormationLifeInventory: (state: unknown) => {
        counts: Record<string, number>;
        formations_by_subtype: Record<string, Array<{ formation_id: string; reason: string }>>;
        total: number;
    };
};

function makeFormation(id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        id,
        name: id,
        faction: 'RBiH',
        kind: 'brigade',
        status: 'active',
        corps_id: 'arbih_1st_corps',
        personnel: 1200,
        location_osid: 'op:test:front',
        home_osid: 'op:test:home',
        brigade_history: { battles_fought: 0, engagements: [] },
        ...overrides,
    };
}

function makeFixture(): unknown {
    return {
        meta: { turn: 40, phase: 'war', seed: 'formation-life-inventory-test' },
        military: {
            formations: {
                z_sector_front: makeFormation('z_sector_front', {
                    assignment: { kind: 'sector', role: 'front', sector_id: 'sector:front' },
                }),
                a_loan: makeFormation('a_loan', {
                    corps_id: 'arbih_general_staff',
                    elite_loan_state: { on_loan: true, loaned_to_corps: 'arbih_2nd_corps' },
                }),
                c_sector_reserve: makeFormation('c_sector_reserve', {
                    assignment: { kind: 'sector', role: 'reserve', sector_id: 'sector:reserve' },
                }),
                b_operation: makeFormation('b_operation', {
                    assignment: { kind: 'sector', role: 'front', sector_id: 'sector:front' },
                }),
                d_sector_rear: makeFormation('d_sector_rear', {
                    assignment: { kind: 'sector', role: 'rear', sector_id: 'sector:rear' },
                }),
                e_sector_owned: makeFormation('e_sector_owned', {
                    assignment: { kind: 'sector', sector_id: 'sector:owned' },
                }),
                g_doctrine_garrison: makeFormation('g_doctrine_garrison', {
                    garrison: true,
                    assignment: { kind: 'sector', role: 'front', sector_id: 'sector:front' },
                }),
                f_doctrine_ownerless: makeFormation('f_doctrine_ownerless', {
                    assignment: null,
                }),
                h_doctrine_cold_front: makeFormation('h_doctrine_cold_front', {
                    faction: 'HRHB',
                    corps_id: 'hvo_tomislavgrad',
                    assignment: { kind: 'sector', role: 'front', sector_id: 'sector:cold' },
                }),
                inactive_skip: makeFormation('inactive_skip', { status: 'inactive' }),
                fought_skip: makeFormation('fought_skip', {
                    assignment: { kind: 'sector', role: 'front', sector_id: 'sector:front' },
                    brigade_history: { battles_fought: 1, engagements: [] },
                }),
            },
            corps_command: {
                arbih_1st_corps: {
                    active_operations: [{
                        name: 'Test Operation',
                        participating_brigades: ['b_operation'],
                    }],
                },
            },
            corps_front_sectors: {
                'sector:front': {
                    sector_id: 'sector:front',
                    corps_id: 'arbih_1st_corps',
                    faction: 'RBiH',
                    assigned_brigade_ids: ['z_sector_front', 'b_operation', 'g_doctrine_garrison'],
                    reserve_brigade_ids: [],
                    rear_brigade_ids: [],
                    opposing_factions: ['RS'],
                    sub_segments: [{ friendly_osids: ['op:test:front'], enemy_osids: ['op:test:enemy'] }],
                    territory_osids: ['op:test:front'],
                },
                'sector:reserve': {
                    sector_id: 'sector:reserve',
                    corps_id: 'arbih_1st_corps',
                    faction: 'RBiH',
                    assigned_brigade_ids: [],
                    reserve_brigade_ids: ['c_sector_reserve'],
                    rear_brigade_ids: [],
                    opposing_factions: ['RS'],
                    sub_segments: [],
                    territory_osids: ['op:test:reserve'],
                },
                'sector:rear': {
                    sector_id: 'sector:rear',
                    corps_id: 'arbih_1st_corps',
                    faction: 'RBiH',
                    assigned_brigade_ids: [],
                    reserve_brigade_ids: [],
                    rear_brigade_ids: ['d_sector_rear'],
                    opposing_factions: ['RS'],
                    sub_segments: [],
                    territory_osids: ['op:test:rear'],
                },
                'sector:owned': {
                    sector_id: 'sector:owned',
                    corps_id: 'arbih_1st_corps',
                    faction: 'RBiH',
                    assigned_brigade_ids: [],
                    reserve_brigade_ids: [],
                    rear_brigade_ids: [],
                    opposing_factions: ['RS'],
                    sub_segments: [],
                    territory_osids: ['op:test:owned'],
                },
                'sector:cold': {
                    sector_id: 'sector:cold',
                    corps_id: 'hvo_tomislavgrad',
                    faction: 'HRHB',
                    assigned_brigade_ids: ['h_doctrine_cold_front'],
                    reserve_brigade_ids: [],
                    rear_brigade_ids: [],
                    opposing_factions: ['RS'],
                    sub_segments: [{ friendly_osids: ['op:test:cold'], enemy_osids: ['op:test:rs'] }],
                    territory_osids: ['op:test:cold'],
                },
            },
        },
        political: {
            vienna_declaration_turn: 4,
            vienna_accepted: { RS: true, HRHB: true },
            vienna_herzegovina_broken_by: null,
            vienna_kiseljak_broken: false,
            graz_east_herzegovina_active_turn: 5,
            political_controllers: {
                'op:test:front': 'RBiH',
                'op:test:enemy': 'RS',
            },
        },
    };
}

describe('formation life packet inventory diagnostic', () => {
    it('classifies zero-battle formations into deterministic packet subtypes', () => {
        const inventory = classifyFormationLifeInventory(makeFixture());

        expect(inventory.counts).toEqual({
            loan: 1,
            operation_participant: 1,
            sector_front: 1,
            sector_reserve: 1,
            sector_rear: 1,
            sector_owned: 1,
            doctrine: 3,
        });
        expect(inventory.total).toBe(9);
        expect(inventory.formations_by_subtype.loan.map((row) => row.formation_id)).toEqual(['a_loan']);
        expect(inventory.formations_by_subtype.operation_participant.map((row) => row.formation_id)).toEqual(['b_operation']);
        expect(inventory.formations_by_subtype.sector_front.map((row) => row.formation_id)).toEqual(['z_sector_front']);
        expect(inventory.formations_by_subtype.doctrine.map((row) => row.formation_id)).toEqual([
            'f_doctrine_ownerless',
            'g_doctrine_garrison',
            'h_doctrine_cold_front',
        ]);
        expect(inventory.formations_by_subtype.doctrine.map((row) => row.reason)).toEqual([
            'ownerless_zero_battle',
            'doctrine_or_garrison',
            'cold_front_doctrine',
        ]);
    });
});
