import { describe, expect, it } from 'vitest';

import { commanderReviewAssignment, type CorpsCommanderProfile } from '../src/sim/combat/commander_override.js';
import type { CorpsFrontSector, FormationState } from '../src/state/game_state.js';

function makeSector(
    sectorId: string,
    territoryOsids: string[],
    frontOsids: string[],
    assigned: string[],
    threatRatio: number,
): CorpsFrontSector {
    return {
        sector_id: sectorId,
        corps_id: 'vrs_drina',
        faction: 'RS',
        opposing_factions: ['RBiH'],
        edge_ids: [`edge:${sectorId}`],
        sub_segments: [
            {
                sub_segment_id: `ss:${sectorId}`,
                edge_ids: [`edge:${sectorId}`],
                friendly_osids: frontOsids,
                enemy_osids: ['enemy'],
                length_edges: 1,
                primary_brigade_ids: [],
            },
        ],
        length_edges: 1,
        territory_osids: territoryOsids,
        assigned_brigade_ids: assigned,
        reserve_brigade_ids: [],
        density: assigned.length,
        threat_ratio: threatRatio,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot',
    } as unknown as CorpsFrontSector;
}

function makeFormation(id: string, location: string): FormationState {
    return {
        id,
        name: id,
        faction: 'RS',
        kind: 'brigade',
        status: 'active',
        personnel: 1200,
        corps_id: 'vrs_drina',
        location_osid: location,
    } as FormationState;
}

describe('commander position viability overrides', () => {
    it('never withdraws an exposed brigade into a different connected component', () => {
        const sectors = [
            makeSector('sector:vrs_drina:0', ['op:a:rear', 'op:a:front'], ['op:a:front'], ['rs_skelani_battalion'], 3.0),
            makeSector('sector:vrs_drina:1', ['op:b:rear', 'op:b:front'], ['op:b:front'], ['rs_safe_brigade'], 0.2),
        ];
        const formations: Record<string, FormationState> = {
            rs_skelani_battalion: makeFormation('rs_skelani_battalion', 'op:a:rear'),
            rs_safe_brigade: makeFormation('rs_safe_brigade', 'op:b:front'),
        };
        const commanderProfile: CorpsCommanderProfile = {
            competence: 0.9,
            aggressiveness: 0.2,
            preStagingSectorWeights: new Map(),
        };
        const componentOf = new Map<string, number>([
            ['op:a:rear', 6],
            ['op:a:front', 6],
            ['op:b:rear', 1],
            ['op:b:front', 1],
        ]);
        const adjacency = new Map<string, string[]>([
            ['op:a:rear', []],
            ['op:a:front', ['op:a:rear']],
            ['op:b:rear', ['op:b:front']],
            ['op:b:front', ['op:b:rear']],
        ]);
        const friendlyOsids = new Set<string>(['op:a:rear', 'op:a:front', 'op:b:rear', 'op:b:front']);

        const overrides = commanderReviewAssignment(
            'vrs_drina',
            sectors,
            formations,
            [],
            commanderProfile,
            componentOf,
            adjacency,
            friendlyOsids,
        );

        expect(overrides).toEqual([]);
        expect(sectors[0].assigned_brigade_ids).toEqual(['rs_skelani_battalion']);
        expect(sectors[1].assigned_brigade_ids).toEqual(['rs_safe_brigade']);
    });
});
