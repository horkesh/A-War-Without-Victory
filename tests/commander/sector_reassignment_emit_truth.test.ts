import { describe, expect, it } from 'vitest';

import { emitCommanderOutput } from '../../src/sim/combat/commander/emit.js';

function makeSector(sectorId: string, territoryOsids: string[]) {
    return {
        sector_id: sectorId,
        corps_id: 'test_corps',
        faction: 'RS',
        edge_ids: territoryOsids.map((osid) => `${osid}__enemy`),
        length_edges: territoryOsids.length,
        territory_osids: territoryOsids,
        assigned_brigade_ids: ['line_holder'],
        reserve_brigade_ids: [],
        sub_segments: [{
            sub_segment_id: `${sectorId}:sub`,
            edge_ids: territoryOsids.map((osid) => `${osid}__enemy`),
            friendly_osids: territoryOsids,
            enemy_osids: territoryOsids.map((osid) => `${osid}:enemy`),
            primary_brigade_ids: ['line_holder'],
            length_edges: territoryOsids.length,
        }],
        density: 1,
        threat_ratio: 1,
        defensive_power: 100,
        sector_stance: 'defend',
        stance_source: 'bot',
    };
}

function baseBriefing() {
    return {
        corps_id: 'test_corps',
        faction: 'RS',
        officer_personality: {
            aggression: 0.5,
            caution: 0.3,
            competence: 0.6,
            loyalty: 0.7,
            independence: 0.4,
        },
        sectors: [
            makeSector('sector:test:0', ['op:quiet:front']),
            makeSector('sector:test:1', ['op:threat:front']),
        ],
        active_operations: [],
        current_state: null,
        previous_state: null,
        sector_activity: [],
        turn: 12,
    };
}

describe('commander sector reassignment emission truth', () => {
    it('maps reserve-shift destination zones to the overlapping sector instead of the first sector', () => {
        const output = emitCommanderOutput(
            baseBriefing() as any,
            [
                {
                    zone_id: 'zone:quiet',
                    osids: ['op:quiet:front'],
                    posture: 'balanced',
                    assigned_brigades: ['line_holder'],
                    surplus_brigades: ['shift_me'],
                    deficit: 0,
                    commitment_ratio: 1,
                },
                {
                    zone_id: 'zone:threat',
                    osids: ['op:threat:front'],
                    posture: 'defending',
                    assigned_brigades: [],
                    surplus_brigades: [],
                    deficit: 1,
                    commitment_ratio: 2,
                },
            ] as any,
            { total_brigades: 2 } as any,
            {
                zones: [],
                garrison_locks: [],
                surplus_pool: [],
            } as any,
            { plan: null, action: 'none', reason: 'test', alternatives: [] } as any,
            {
                stance_changes: [],
                reserve_shifts: [{
                    brigade_id: 'shift_me',
                    from_zone: 'zone:quiet',
                    to_zone: 'zone:threat',
                    reason: 'test shift',
                }],
                reinforcement_requests: [],
                activity_entries: [],
            } as any,
            { threatened_zones: [], global_threat_level: 'low' } as any,
            null,
        );

        expect(output.directive.sector_reassignment_orders).toEqual([{
            brigade_id: 'shift_me',
            to_sector_id: 'sector:test:1',
        }]);
    });

    it('emits direct empty-sector relief ahead of a duplicate reserve shift', () => {
        const output = emitCommanderOutput(
            baseBriefing() as any,
            [] as any,
            { total_brigades: 2 } as any,
            { zones: [], garrison_locks: [], surplus_pool: [] } as any,
            { plan: null, action: 'none', reason: 'test', alternatives: [] } as any,
            {
                stance_changes: [],
                reserve_shifts: [{
                    brigade_id: 'shift_me',
                    from_zone: 'zone:quiet',
                    to_zone: 'zone:threat',
                    reason: 'duplicate shift',
                }],
                empty_sector_relief_reassignments: [{
                    brigade_id: 'shift_me',
                    to_sector_id: 'sector:test:1',
                    reason: 'empty front sector requires corps relief',
                }],
                reinforcement_requests: [],
                activity_entries: [],
            } as any,
            { threatened_zones: [], global_threat_level: 'low' } as any,
            null,
        );

        expect(output.directive.sector_reassignment_orders).toEqual([{
            brigade_id: 'shift_me',
            to_sector_id: 'sector:test:1',
        }]);
    });
});
