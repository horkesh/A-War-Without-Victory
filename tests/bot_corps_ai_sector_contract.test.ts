import assert from 'node:assert';
import test from 'node:test';

import { generateCorpsDirectives } from '../src/sim/combat/bot_corps_ai.js';
import { initializeCorpsCommand } from '../src/sim/combat/corps_command.js';
import type { CorpsFrontSector, FactionId, FormationState, GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function makeBrigade(id: string, faction: FactionId, corpsId: string, locationOsid: string): FormationState {
    return {
        id,
        faction,
        name: id,
        created_turn: 1,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        personnel: 1000,
        cohesion: 65,
        hq_sid: 'S1',
        corps_id: corpsId,
        location_osid: locationOsid,
        tags: [],
    };
}

function makeCorps(id: string, faction: FactionId): FormationState {
    return {
        id,
        faction,
        name: id,
        created_turn: 1,
        status: 'active',
        assignment: null,
        kind: 'corps',
        personnel: 50,
        cohesion: 80,
        hq_sid: 'S1',
        tags: ['mun:test_mun'],
    };
}

function makeSector(
    sectorId: string,
    corpsId: string,
    lengthEdges: number,
    friendlyOsids: string[],
    enemyOsids: string[],
    assignedBrigadeIds: string[],
): CorpsFrontSector {
    const edgeIds = lengthEdges > 0 ? Array.from({ length: lengthEdges }, (_, i) => `${sectorId}:e${i}`) : [];
    return {
        sector_id: sectorId,
        corps_id: corpsId,
        faction: 'RS',
        opposing_factions: ['RBiH'],
        edge_ids: edgeIds,
        sub_segments: [
            {
                sub_segment_id: `subseg:${sectorId}:0`,
                edge_ids: edgeIds,
                friendly_osids: friendlyOsids,
                enemy_osids: enemyOsids,
                length_edges: lengthEdges,
            }
        ],
        length_edges: lengthEdges,
        territory_osids: friendlyOsids,
        assigned_brigade_ids: assignedBrigadeIds,
        reserve_brigade_ids: [],
        density: lengthEdges > 0 ? assignedBrigadeIds.length / lengthEdges : 0,
        threat_ratio: 0,
        defensive_power: 0,
    };
}

test('generateCorpsDirectives ignores zero-edge containment sectors for reinforcement targeting', () => {
    const corpsId = 'vrs_test_corps';
    const state: GameState = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 20, seed: 'sector-contract', phase: 'war' } as any,
        factions: [
            {
                id: 'RS',
                profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: []
            }
        ],
        formations: {
            [corpsId]: makeCorps(corpsId, 'RS'),
            brig_a: makeBrigade('brig_a', 'RS', corpsId, 'op:test:a'),
            brig_b: makeBrigade('brig_b', 'RS', corpsId, 'op:test:b'),
        },
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: {
            'op:test:a': 'RS',
            'op:test:b': 'RS',
            'op:test:c': 'RS',
            'op:test:enemy_front': 'RBiH',
            'op:test:pocket_enemy': 'RBiH',
        },
        corps_front_sectors: {
            'sector:vrs_test_corps:front': makeSector(
                'sector:vrs_test_corps:front',
                corpsId,
                4,
                ['op:test:a', 'op:test:b', 'op:test:c'],
                ['op:test:enemy_front'],
                ['brig_a', 'brig_b']
            ),
            'sector:vrs_test_corps:pocket': makeSector(
                'sector:vrs_test_corps:pocket',
                corpsId,
                0,
                ['op:test:b'],
                ['op:test:pocket_enemy'],
                []
            ),
        },
    } as GameState;

    initializeCorpsCommand(state);
    assert.ok(state.military.corps_command?.[corpsId], 'corps command should initialize');
    state.military.corps_command![corpsId].stance = 'balanced';
    generateCorpsDirectives(state, 'RS', [], new Map(), null, null);

    const directive = state.military.corps_command?.[corpsId]?.directive;
    assert.ok(directive, 'directive should be generated');
    assert.equal(directive.reinforce_sector_ids, undefined, 'zero-edge containment sectors must not become reinforcement targets');
    assert.notEqual(directive.priority_sector_id, 'sector:vrs_test_corps:pocket', 'zero-edge containment sectors must not become priority sectors');
});

test.skip('generateCorpsDirectives can synthesize a launchable offensive sector from adjacent thin sectors', () => {
    const corpsId = 'vrs_1st_krajina';
    const state: GameState = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 20, seed: 'sector-concentration', phase: 'war' } as any,
        factions: [
            {
                id: 'RS',
                profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: []
            }
        ],
        formations: {
            [corpsId]: makeCorps(corpsId, 'RS'),
            brig_a: makeBrigade('brig_a', 'RS', corpsId, 'op:test:a'),
            brig_b: makeBrigade('brig_b', 'RS', corpsId, 'op:test:b'),
            brig_c: makeBrigade('brig_c', 'RS', corpsId, 'op:test:c'),
        },
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: {
            'op:test:a': 'RS',
            'op:test:b': 'RS',
            'op:test:c': 'RS',
            'op:doboj:t1': 'RBiH',
            'op:doboj:t2': 'RBiH',
            'op:doboj:t3': 'RBiH',
        },
        corps_front_sectors: {
            'sector:vrs_1st_krajina:0': makeSector(
                'sector:vrs_1st_krajina:0',
                corpsId,
                4,
                ['op:test:a'],
                ['op:doboj:t1'],
                ['brig_a']
            ),
            'sector:vrs_1st_krajina:1': makeSector(
                'sector:vrs_1st_krajina:1',
                corpsId,
                4,
                ['op:test:b'],
                ['op:doboj:t2'],
                ['brig_b']
            ),
            'sector:vrs_1st_krajina:2': makeSector(
                'sector:vrs_1st_krajina:2',
                corpsId,
                4,
                ['op:test:c'],
                ['op:doboj:t3'],
                ['brig_c']
            ),
        },
    } as GameState;

    initializeCorpsCommand(state);
    assert.ok(state.military.corps_command?.[corpsId], 'corps command should initialize');
    state.military.corps_command![corpsId].stance = 'balanced';

    const edges = [
        { a: 'op:test:a', b: 'op:test:b' },
        { a: 'op:test:b', b: 'op:test:c' },
    ] as any;
    const reverseMap = new Map<string, string[]>([
        ['op:test:a', ['S1']],
        ['op:test:b', ['S2']],
        ['op:test:c', ['S3']],
        ['op:doboj:t1', ['E1']],
        ['op:doboj:t2', ['E2']],
        ['op:doboj:t3', ['E3']],
    ]);

    generateCorpsDirectives(state, 'RS', edges, reverseMap, null, null);

    const activeOperation = state.military.corps_command?.[corpsId]?.active_operation;
    assert.ok(activeOperation, 'adjacent thin sectors with overlapping targets should still launch a sector operation');
    assert.equal(activeOperation?.type, 'sector_attack');
});

test.skip('generateCorpsDirectives concentrates based on live brigade positions, not stale assigned sector lists', () => {
    const corpsId = 'vrs_1st_krajina';
    const state: GameState = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 20, seed: 'sector-concentration-live-locations', phase: 'war' } as any,
        factions: [
            {
                id: 'RS',
                profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: []
            }
        ],
        formations: {
            [corpsId]: makeCorps(corpsId, 'RS'),
            brig_a: makeBrigade('brig_a', 'RS', corpsId, 'op:test:a'),
            brig_b: makeBrigade('brig_b', 'RS', corpsId, 'op:test:b'),
            brig_c: makeBrigade('brig_c', 'RS', corpsId, 'op:test:c'),
        },
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: {
            'op:test:a': 'RS',
            'op:test:b': 'RS',
            'op:test:c': 'RS',
            'op:doboj:t1': 'RBiH',
            'op:doboj:t2': 'RBiH',
            'op:doboj:t3': 'RBiH',
        },
        corps_front_sectors: {
            'sector:vrs_1st_krajina:0': makeSector(
                'sector:vrs_1st_krajina:0',
                corpsId,
                4,
                ['op:test:a'],
                ['op:doboj:t1'],
                ['brig_a', 'brig_b', 'brig_c']
            ),
            'sector:vrs_1st_krajina:1': makeSector(
                'sector:vrs_1st_krajina:1',
                corpsId,
                4,
                ['op:test:b'],
                ['op:doboj:t2'],
                []
            ),
            'sector:vrs_1st_krajina:2': makeSector(
                'sector:vrs_1st_krajina:2',
                corpsId,
                4,
                ['op:test:c'],
                ['op:doboj:t3'],
                []
            ),
        },
    } as GameState;

    initializeCorpsCommand(state);
    state.military.corps_command![corpsId].stance = 'balanced';

    const edges = [
        { a: 'op:test:a', b: 'op:test:b' },
        { a: 'op:test:b', b: 'op:test:c' },
    ] as any;
    const reverseMap = new Map<string, string[]>([
        ['op:test:a', ['S1']],
        ['op:test:b', ['S2']],
        ['op:test:c', ['S3']],
        ['op:doboj:t1', ['E1']],
        ['op:doboj:t2', ['E2']],
        ['op:doboj:t3', ['E3']],
    ]);

    generateCorpsDirectives(state, 'RS', edges, reverseMap, null, null);

    const activeOperation = state.military.corps_command?.[corpsId]?.active_operation;
    assert.ok(activeOperation, 'launch concentration must use live brigade locations when sector assigned lists are stale');
    assert.equal(activeOperation?.type, 'sector_attack');
});

test.skip('generateCorpsDirectives can launch an operation from adjacent sectors even when permanent sector merge is edge-capped', () => {
    const corpsId = 'vrs_1st_krajina';
    const state: GameState = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 20, seed: 'sector-launch-cluster', phase: 'war' } as any,
        factions: [
            {
                id: 'RS',
                profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: []
            }
        ],
        formations: {
            [corpsId]: makeCorps(corpsId, 'RS'),
            brig_a: makeBrigade('brig_a', 'RS', corpsId, 'op:test:a'),
            brig_b: makeBrigade('brig_b', 'RS', corpsId, 'op:test:b'),
            brig_c: makeBrigade('brig_c', 'RS', corpsId, 'op:test:c'),
        },
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: {
            'op:test:a': 'RS',
            'op:test:b': 'RS',
            'op:test:c': 'RS',
            'op:doboj:t1': 'RBiH',
            'op:doboj:t2': 'RBiH',
            'op:doboj:t3': 'RBiH',
        },
        corps_front_sectors: {
            'sector:vrs_1st_krajina:0': makeSector(
                'sector:vrs_1st_krajina:0',
                corpsId,
                23,
                ['op:test:a'],
                ['op:doboj:t1'],
                ['brig_a']
            ),
            'sector:vrs_1st_krajina:1': makeSector(
                'sector:vrs_1st_krajina:1',
                corpsId,
                4,
                ['op:test:b'],
                ['op:doboj:t2'],
                ['brig_b']
            ),
            'sector:vrs_1st_krajina:2': makeSector(
                'sector:vrs_1st_krajina:2',
                corpsId,
                4,
                ['op:test:c'],
                ['op:doboj:t3'],
                ['brig_c']
            ),
        },
    } as GameState;

    initializeCorpsCommand(state);
    state.military.corps_command![corpsId].stance = 'balanced';

    const edges = [
        { a: 'op:test:a', b: 'op:test:b' },
        { a: 'op:test:b', b: 'op:test:c' },
    ] as any;
    const reverseMap = new Map<string, string[]>([
        ['op:test:a', ['S1']],
        ['op:test:b', ['S2']],
        ['op:test:c', ['S3']],
        ['op:doboj:t1', ['E1']],
        ['op:doboj:t2', ['E2']],
        ['op:doboj:t3', ['E3']],
    ]);

    generateCorpsDirectives(state, 'RS', edges, reverseMap, null, null);

    const activeOperation = state.military.corps_command?.[corpsId]?.active_operation;
    assert.ok(activeOperation, 'operation launch should cluster adjacent sectors temporarily even when permanent sector merge exceeds edge cap');
    assert.equal(activeOperation?.type, 'sector_attack');
});
