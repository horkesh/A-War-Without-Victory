import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
    classifyFormationLifeInventory,
} = require('../tools/diagnostics/formation_life_packet_inventory.cjs') as {
    classifyFormationLifeInventory: (state: unknown) => {
        packet_summaries: {
            fl_b_far_from_home_owner_truth: {
                counts: Record<string, number>;
                formations: Array<{
                    formation_id: string;
                    packet: string;
                    owner_kind: string;
                    distance: number | null;
                }>;
            };
        };
    };
};

function formation(id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        id,
        name: id,
        faction: 'RBiH',
        kind: 'brigade',
        status: 'active',
        corps_id: 'arbih_1st_corps',
        location_osid: 'op:test:away',
        home_osid: 'op:test:home',
        brigade_history: { battles_fought: 0, engagements: [] },
        ...overrides,
    };
}

describe('FL-B far-from-home owner-truth packet', () => {
    it('splits far-from-home formations by live owner instead of blending them as bugs', () => {
        const inventory = classifyFormationLifeInventory({
            meta: { turn: 40, phase: 'war' },
            political: { political_controllers: {} },
            military: {
                home_distance_cache: {
                    a_redeployed: 8,
                    b_loan: 9,
                    c_operation: 10,
                    d_unassigned: 11,
                    e_near: 2,
                },
                brigade_movement_orders: {},
                formations: {
                    a_redeployed: formation('a_redeployed', {
                        assignment: { kind: 'sector', role: 'front', sector_id: 'sector:front' },
                    }),
                    b_loan: formation('b_loan', {
                        elite_loan_state: { on_loan: true, loaned_to_corps: 'arbih_2nd_corps' },
                    }),
                    c_operation: formation('c_operation', {
                        assignment: { kind: 'sector', role: 'front', sector_id: 'sector:front' },
                    }),
                    d_unassigned: formation('d_unassigned', {
                        assignment: null,
                    }),
                    e_near: formation('e_near', {
                        assignment: null,
                    }),
                },
                corps_command: {
                    arbih_1st_corps: {
                        active_operations: [{
                            name: 'Test operation',
                            participating_brigades: ['c_operation'],
                        }],
                    },
                },
                corps_front_sectors: {
                    'sector:front': {
                        sector_id: 'sector:front',
                        corps_id: 'arbih_1st_corps',
                        faction: 'RBiH',
                        assigned_brigade_ids: ['a_redeployed', 'c_operation'],
                        reserve_brigade_ids: [],
                        rear_brigade_ids: [],
                        opposing_factions: ['RS'],
                        sub_segments: [{ friendly_osids: ['op:test:away'], enemy_osids: ['op:test:enemy'] }],
                        territory_osids: ['op:test:away'],
                    },
                },
            },
        });

        const packet = inventory.packet_summaries.fl_b_far_from_home_owner_truth;
        expect(packet.counts).toEqual({
            redeployed: 1,
            loan: 1,
            operation: 1,
            home_recall: 0,
            unassigned: 1,
        });
        expect(packet.formations.map((row) => `${row.formation_id}:${row.owner_kind}`)).toEqual([
            'a_redeployed:redeployed',
            'b_loan:loan',
            'c_operation:operation',
            'd_unassigned:unassigned',
        ]);
        expect(packet.formations.every((row) => row.packet === 'FL-B')).toBe(true);
        expect(packet.formations.map((row) => row.distance)).toEqual([8, 9, 10, 11]);
    });
});
