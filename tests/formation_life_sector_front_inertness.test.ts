import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
    classifyFormationLifeInventory,
} = require('../tools/diagnostics/formation_life_packet_inventory.cjs') as {
    classifyFormationLifeInventory: (state: unknown) => {
        packet_summaries: {
            fl_a_sector_front_inertness: {
                counts: Record<string, number>;
                formations: Array<{
                    formation_id: string;
                    packet: string;
                    reason: string;
                    has_local_enemy_contact: boolean;
                    legal_corps_authority: boolean;
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
        location_osid: 'op:test:front',
        home_osid: 'op:test:home',
        brigade_history: { battles_fought: 0, engagements: [] },
        assignment: { kind: 'sector', role: 'front', sector_id: 'sector:front' },
        ...overrides,
    };
}

describe('FL-A sector-front inertness packet', () => {
    it('separates legal local front-contact inertness from no-contact and foreign-owner cases', () => {
        const inventory = classifyFormationLifeInventory({
            meta: { turn: 40, phase: 'war' },
            political: { political_controllers: {} },
            military: {
                formations: {
                    z_contact: formation('z_contact'),
                    a_no_contact: formation('a_no_contact', {
                        location_osid: 'op:test:rear',
                    }),
                    b_foreign_owner: formation('b_foreign_owner', {
                        corps_id: 'arbih_2nd_corps',
                    }),
                    fought_skip: formation('fought_skip', {
                        brigade_history: { battles_fought: 1, engagements: [] },
                    }),
                },
                corps_command: {},
                corps_front_sectors: {
                    'sector:front': {
                        sector_id: 'sector:front',
                        corps_id: 'arbih_1st_corps',
                        faction: 'RBiH',
                        assigned_brigade_ids: ['z_contact', 'a_no_contact', 'b_foreign_owner', 'fought_skip'],
                        reserve_brigade_ids: [],
                        rear_brigade_ids: [],
                        opposing_factions: ['RS'],
                        sub_segments: [{
                            friendly_osids: ['op:test:front'],
                            enemy_osids: ['op:test:enemy'],
                        }],
                        territory_osids: ['op:test:front', 'op:test:rear'],
                    },
                },
            },
        });

        const packet = inventory.packet_summaries.fl_a_sector_front_inertness;
        expect(packet.counts).toEqual({
            front_contact_legal_authority: 1,
            front_without_local_contact: 1,
            no_legal_corps_authority: 1,
        });
        expect(packet.formations.map((row) => row.formation_id)).toEqual([
            'a_no_contact',
            'b_foreign_owner',
            'z_contact',
        ]);
        expect(packet.formations.map((row) => row.reason)).toEqual([
            'sector_front_without_local_contact',
            'sector_front_foreign_corps_authority',
            'sector_front_contact_no_battle',
        ]);
        expect(packet.formations.every((row) => row.packet === 'FL-A')).toBe(true);
        expect(packet.formations.find((row) => row.formation_id === 'z_contact')?.has_local_enemy_contact).toBe(true);
        expect(packet.formations.find((row) => row.formation_id === 'b_foreign_owner')?.legal_corps_authority).toBe(false);
    });
});
