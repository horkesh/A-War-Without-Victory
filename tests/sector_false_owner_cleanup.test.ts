import { describe, expect, it } from 'vitest';

import { relocateMisassignedBrigadesToTruthfulOwners } from '../src/sim/combat/corps_front_sectors.js';
import type { CorpsFrontSector, CorpsFrontSubSegment, FormationId, FormationState, GameState } from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';
import { makeAdjacency as makeAdjacencyShared } from './_helpers/adjacency.js';

const makeAdjacency = (pairs: Array<[string, string]>): Map<Osid, Osid[]> =>
    makeAdjacencyShared(pairs) as unknown as Map<Osid, Osid[]>;

function makeFormation(id: string, location_osid: string): FormationState {
    return {
        id: id as FormationId,
        faction: 'RS',
        name: id,
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        corps_id: 'vrs_test',
        location_osid,
        personnel: 1000,
    };
}

function makeSubSegment(id: string, friendly: string, enemy: string): CorpsFrontSubSegment {
    return {
        sub_segment_id: `subseg:${id}:0`,
        edge_ids: [`${friendly}__${enemy}`],
        friendly_osids: [friendly],
        enemy_osids: [enemy],
        length_edges: 1,
        primary_brigade_ids: [],
    };
}

function makeSector(id: string, friendly: string, enemy: string, territory_osids: string[]): CorpsFrontSector {
    return {
        sector_id: id,
        corps_id: 'vrs_test' as FormationId,
        faction: 'RS',
        opposing_factions: ['RBiH'],
        edge_ids: [`${friendly}__${enemy}`],
        sub_segments: [makeSubSegment(id, friendly, enemy)],
        length_edges: 1,
        territory_osids,
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        rear_brigade_ids: [],
        density: 0,
        threat_ratio: 0,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot',
    };
}

function makeState(pc: Record<string, string>): GameState {
    return {
        schema_version: 1,
        meta: {
            turn: 40,
            seed: 'sector-false-owner-cleanup',
            phase: 'war',
        },
        factions: [],
        political: {
            political_controllers: pc,
        },
        military: {
            formations: {},
            corps_front_sectors: {},
        },
        displacement: {},
    } as unknown as GameState;
}

describe('sector false-owner cleanup', () => {
    it('moves a stale reserve claim into the truthful same-corps reserve bucket when the brigade is in the one-hop reserve band', () => {
        const stale = makeSector(
            'sector:vrs_test:stale',
            'op:test:stale_front',
            'op:test:enemy_a',
            ['op:test:stale_front', 'op:test:stale_depth'],
        );
        stale.reserve_brigade_ids = ['brig_truth' as FormationId];

        const truthful = makeSector(
            'sector:vrs_test:truth',
            'op:test:true_front',
            'op:test:enemy_b',
            ['op:test:true_front', 'op:test:true_depth'],
        );

        const formations: Record<FormationId, FormationState> = {
            brig_truth: makeFormation('brig_truth', 'op:test:true_depth'),
        };
        const state = makeState({
            'op:test:stale_front': 'RS',
            'op:test:stale_depth': 'RS',
            'op:test:true_front': 'RS',
            'op:test:true_depth': 'RS',
        });
        const adjacency = makeAdjacency([
            ['op:test:true_front', 'op:test:true_depth'],
        ]);

        relocateMisassignedBrigadesToTruthfulOwners([stale, truthful], state, formations, adjacency);

        expect(stale.reserve_brigade_ids).toEqual([]);
        expect(truthful.assigned_brigade_ids).toEqual([]);
        expect(truthful.reserve_brigade_ids).toEqual(['brig_truth']);
        expect(truthful.rear_brigade_ids).toEqual([]);
    });

    it('moves a stale rear-bucket claim into the truthful same-corps reserve bucket when the brigade is actually one hop behind the front', () => {
        const stale = makeSector(
            'sector:vrs_test:stale',
            'op:test:stale_front',
            'op:test:enemy_a',
            ['op:test:stale_front', 'op:test:stale_depth'],
        );
        stale.rear_brigade_ids = ['brig_rear_truth' as FormationId];

        const truthful = makeSector(
            'sector:vrs_test:truth',
            'op:test:true_front',
            'op:test:enemy_b',
            ['op:test:true_front', 'op:test:true_depth'],
        );

        const formations: Record<FormationId, FormationState> = {
            brig_rear_truth: makeFormation('brig_rear_truth', 'op:test:true_depth'),
        };
        const state = makeState({
            'op:test:stale_front': 'RS',
            'op:test:stale_depth': 'RS',
            'op:test:true_front': 'RS',
            'op:test:true_depth': 'RS',
        });
        const adjacency = makeAdjacency([
            ['op:test:true_front', 'op:test:true_depth'],
        ]);

        relocateMisassignedBrigadesToTruthfulOwners([stale, truthful], state, formations, adjacency);

        expect(stale.rear_brigade_ids).toEqual([]);
        expect(truthful.assigned_brigade_ids).toEqual([]);
        expect(truthful.reserve_brigade_ids).toEqual(['brig_rear_truth']);
        expect(truthful.rear_brigade_ids).toEqual([]);
    });

    it('moves a stale same-corps reserve claim into the truthful one-hop reserve bucket even when the truthful sector has not yet claimed that rear OSID in territory_osids', () => {
        const stale = makeSector(
            'sector:vrs_test:stale',
            'op:test:stale_front',
            'op:test:enemy_a',
            ['op:test:stale_front', 'op:test:stale_depth'],
        );
        stale.reserve_brigade_ids = ['brig_band_truth' as FormationId];

        const truthful = makeSector(
            'sector:vrs_test:truth',
            'op:test:true_front',
            'op:test:enemy_b',
            ['op:test:true_front'],
        );

        const formations: Record<FormationId, FormationState> = {
            brig_band_truth: makeFormation('brig_band_truth', 'op:test:true_depth'),
        };
        const state = makeState({
            'op:test:stale_front': 'RS',
            'op:test:stale_depth': 'RS',
            'op:test:true_front': 'RS',
            'op:test:true_depth': 'RS',
        });
        const adjacency = makeAdjacency([
            ['op:test:true_front', 'op:test:true_depth'],
        ]);

        relocateMisassignedBrigadesToTruthfulOwners([stale, truthful], state, formations, adjacency);

        expect(stale.reserve_brigade_ids).toEqual([]);
        expect(truthful.assigned_brigade_ids).toEqual([]);
        expect(truthful.reserve_brigade_ids).toEqual(['brig_band_truth']);
        expect(truthful.rear_brigade_ids).toEqual([]);
    });


    it('drops a stale sector claim when no truthful owner exists', () => {
        const stale = makeSector(
            'sector:vrs_test:stale',
            'op:test:stale_front',
            'op:test:enemy_a',
            ['op:test:stale_front', 'op:test:stale_depth'],
        );
        stale.reserve_brigade_ids = ['brig_orphan' as FormationId];

        const formations: Record<FormationId, FormationState> = {
            brig_orphan: makeFormation('brig_orphan', 'op:test:orphan'),
        };
        const state = makeState({
            'op:test:stale_front': 'RS',
            'op:test:stale_depth': 'RS',
            'op:test:orphan': 'RS',
        });
        const adjacency = makeAdjacency([
            ['op:test:stale_front', 'op:test:stale_depth'],
        ]);

        relocateMisassignedBrigadesToTruthfulOwners([stale], state, formations, adjacency);

        expect(stale.assigned_brigade_ids).toEqual([]);
        expect(stale.reserve_brigade_ids).toEqual([]);
        expect(stale.rear_brigade_ids).toEqual([]);
    });

    it('does not launder a non-loaned field brigade into another corps sector just because the location is same-faction truthful there', () => {
        const stale = makeSector(
            'sector:vrs_krajina:stale',
            'op:test:stale_front',
            'op:test:enemy_a',
            ['op:test:stale_front', 'op:test:stale_depth'],
        );
        stale.corps_id = 'vrs_1st_krajina' as FormationId;
        stale.reserve_brigade_ids = ['brig_cross_corps' as FormationId];

        const otherCorpsTruth = makeSector(
            'sector:vrs_east_bosnian:truth',
            'op:test:true_front',
            'op:test:enemy_b',
            ['op:test:true_front', 'op:test:true_depth'],
        );
        otherCorpsTruth.corps_id = 'vrs_east_bosnian' as FormationId;

        const formation = makeFormation('brig_cross_corps', 'op:test:true_depth');
        formation.corps_id = 'vrs_1st_krajina' as FormationId;
        const formations: Record<FormationId, FormationState> = {
            brig_cross_corps: formation,
        };
        const state = makeState({
            'op:test:stale_front': 'RS',
            'op:test:stale_depth': 'RS',
            'op:test:true_front': 'RS',
            'op:test:true_depth': 'RS',
        });
        const adjacency = makeAdjacency([
            ['op:test:true_front', 'op:test:true_depth'],
        ]);

        relocateMisassignedBrigadesToTruthfulOwners([stale, otherCorpsTruth], state, formations, adjacency);

        expect(stale.assigned_brigade_ids).toEqual([]);
        expect(stale.reserve_brigade_ids).toEqual([]);
        expect(stale.rear_brigade_ids).toEqual([]);
        expect(otherCorpsTruth.assigned_brigade_ids).toEqual([]);
        expect(otherCorpsTruth.reserve_brigade_ids).toEqual([]);
        expect(otherCorpsTruth.rear_brigade_ids).toEqual([]);
    });
});
