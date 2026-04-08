import { describe, expect, it } from 'vitest';

import { auditSectorTruth } from '../src/sim/combat/sector_truth_audit.js';
import type {
    CorpsFrontSector,
    CorpsFrontSubSegment,
    CURRENT_SCHEMA_VERSION,
    FormationState,
    GameState,
} from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';

function makeSubSegment(
    sectorId: string,
    friendlyOsids: string[],
    enemyOsids: string[],
    edgeIds: string[],
): CorpsFrontSubSegment {
    return {
        sub_segment_id: `subseg:${sectorId}:0`,
        friendly_osids: friendlyOsids,
        enemy_osids: enemyOsids,
        edge_ids: edgeIds,
        length_edges: edgeIds.length,
        primary_brigade_ids: [],
    };
}

function makeSector(
    sectorId: string,
    corpsId: string,
    faction: 'RS' | 'RBiH',
    friendlyOsids: string[],
    enemyOsids: string[],
    edgeIds: string[],
    territoryOsids: string[],
    assigned: string[],
    reserve: string[] = [],
): CorpsFrontSector {
    const subSegment = makeSubSegment(sectorId, friendlyOsids, enemyOsids, edgeIds);
    return {
        sector_id: sectorId,
        corps_id: corpsId,
        faction,
        opposing_factions: [faction === 'RS' ? 'RBiH' : 'RS'],
        edge_ids: [...edgeIds],
        sub_segments: [subSegment],
        length_edges: edgeIds.length,
        territory_osids: territoryOsids,
        assigned_brigade_ids: assigned,
        reserve_brigade_ids: reserve,
        density: edgeIds.length > 0 ? assigned.length / edgeIds.length : 0,
        threat_ratio: 0,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot',
    } as CorpsFrontSector;
}

function makeFormation(id: string, faction: 'RS' | 'RBiH', corpsId: string, location_osid: string): FormationState {
    return {
        id,
        name: id,
        faction,
        kind: 'brigade',
        status: 'active',
        created_turn: 1,
        assignment: null,
        corps_id: corpsId,
        location_osid,
        home_osid: location_osid,
        personnel: 1000,
        cohesion: 60,
        morale: 60,
    } as FormationState;
}

function makeState(formations: Record<string, FormationState>, frontEdges: GameState['military']['war_front_edges_osid'], controllers: Record<string, string>): GameState {
    return {
        schema_version: 1 as typeof CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 1,
            seed: 'sector-truth-audit',
            phase: 'war',
            scenario_start_date: { year: 1992, month: 4, day: 6 },
            referendum_held: true,
            referendum_turn: 1,
            war_start_turn: 1,
        },
        factions: [],
        military: {
            formations,
            war_front_edges_osid: frontEdges,
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            unresolved_sector_brigades: [],
        },
        political: {
            political_controllers: controllers,
        },
        displacement: {},
    } as unknown as GameState;
}

describe('auditSectorTruth', () => {
    it('reports reserve-only, overlap, untruthful assignment, stale density, and edge mismatch issues', () => {
        const edges: EdgeRecord[] = [
            { a: 'op:front:shared', b: 'op:enemy:1' } as EdgeRecord,
            { a: 'op:front:left', b: 'op:enemy:2' } as EdgeRecord,
            { a: 'op:front:right', b: 'op:enemy:3' } as EdgeRecord,
            { a: 'op:front:shared', b: 'op:rear:shared' } as EdgeRecord,
        ];
        const state = makeState(
            {
                brig_false: makeFormation('brig_false', 'RS', 'corps_a', 'op:away'),
                brig_reserve: makeFormation('brig_reserve', 'RS', 'corps_a', 'op:rear:shared'),
            },
            [
                { edge_id: 'op:front:shared__op:enemy:1', a: 'op:front:shared', b: 'op:enemy:1', side_a: 'RS', side_b: 'RBiH' },
                { edge_id: 'op:front:left__op:enemy:2', a: 'op:front:left', b: 'op:enemy:2', side_a: 'RS', side_b: 'RBiH' },
                { edge_id: 'op:front:right__op:enemy:3', a: 'op:front:right', b: 'op:enemy:3', side_a: 'RS', side_b: 'RBiH' },
            ],
            {
                'op:front:shared': 'RS',
                'op:front:left': 'RS',
                'op:front:right': 'RS',
                'op:rear:shared': 'RS',
                'op:away': 'RBiH',
                'op:enemy:1': 'RBiH',
                'op:enemy:2': 'RBiH',
                'op:enemy:3': 'RBiH',
            },
        );

        const sectors = [
            makeSector(
                'sector:corps_a:0',
                'corps_a',
                'RS',
                ['op:front:shared', 'op:front:left'],
                ['op:enemy:1', 'op:enemy:2'],
                ['op:front:shared__op:enemy:1', 'op:front:left__op:enemy:2'],
                ['op:front:shared', 'op:front:left'],
                ['brig_false'],
            ),
            makeSector(
                'sector:corps_a:1',
                'corps_a',
                'RS',
                ['op:front:shared'],
                ['op:enemy:1'],
                ['op:front:shared__op:enemy:1', 'op:front:right__op:enemy:3'],
                ['op:front:right'],
                [],
                ['brig_reserve'],
            ),
        ];
        sectors[1]!.density = 99;

        const audit = auditSectorTruth(state, sectors, edges);

        expect(audit.counts.reserve_only_live_sectors).toBe(1);
        expect(audit.counts.same_corps_front_overlaps).toBe(1);
        expect(audit.counts.untruthful_assigned_brigades).toBe(1);
        expect(audit.counts.stale_density_sectors).toBe(1);
        expect(audit.counts.edge_front_mismatches).toBe(1);
        expect(audit.counts.unresolved_sector_brigades).toBe(0);
        expect(audit.counts.active_formations_in_enemy_territory).toBe(1);
    });

    it('returns a clean audit for truthful non-overlapping sectors', () => {
        const edges: EdgeRecord[] = [
            { a: 'op:front:a', b: 'op:enemy:a' } as EdgeRecord,
            { a: 'op:front:b', b: 'op:enemy:b' } as EdgeRecord,
            { a: 'op:front:a', b: 'op:rear:a' } as EdgeRecord,
        ];
        const state = makeState(
            {
                brig_a: makeFormation('brig_a', 'RS', 'corps_a', 'op:front:a'),
                brig_b: makeFormation('brig_b', 'RS', 'corps_a', 'op:front:b'),
            },
            [
                { edge_id: 'op:front:a__op:enemy:a', a: 'op:front:a', b: 'op:enemy:a', side_a: 'RS', side_b: 'RBiH' },
                { edge_id: 'op:front:b__op:enemy:b', a: 'op:front:b', b: 'op:enemy:b', side_a: 'RS', side_b: 'RBiH' },
            ],
            {
                'op:front:a': 'RS',
                'op:front:b': 'RS',
                'op:rear:a': 'RS',
                'op:enemy:a': 'RBiH',
                'op:enemy:b': 'RBiH',
            },
        );

        const sectors = [
            makeSector(
                'sector:corps_a:0',
                'corps_a',
                'RS',
                ['op:front:a'],
                ['op:enemy:a'],
                ['op:front:a__op:enemy:a'],
                ['op:front:a', 'op:rear:a'],
                ['brig_a'],
            ),
            makeSector(
                'sector:corps_a:1',
                'corps_a',
                'RS',
                ['op:front:b'],
                ['op:enemy:b'],
                ['op:front:b__op:enemy:b'],
                ['op:front:b'],
                ['brig_b'],
            ),
        ];

        const audit = auditSectorTruth(state, sectors, edges);

        expect(audit.counts.reserve_only_live_sectors).toBe(0);
        expect(audit.counts.same_corps_front_overlaps).toBe(0);
        expect(audit.counts.untruthful_assigned_brigades).toBe(0);
        expect(audit.counts.stale_density_sectors).toBe(0);
        expect(audit.counts.edge_front_mismatches).toBe(0);
        expect(audit.counts.unresolved_sector_brigades).toBe(0);
        expect(audit.counts.active_formations_in_enemy_territory).toBe(0);
        expect(audit.ok).toBe(true);
    });
});
