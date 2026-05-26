import { describe, expect, it } from 'vitest';

import { applyFinalSectorOwnerTruthPass } from '../src/sim/combat/corps_front_sectors.js';
import { buildOsidAdjacency } from '../src/sim/combat/osid_adjacency.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import {
    CURRENT_SCHEMA_VERSION,
    type CorpsFrontSector,
    type FactionId,
    type FormationState,
    type GameState,
} from '../src/state/game_state.js';

function makeFormation(id: string, overrides: Partial<FormationState>): FormationState {
    return {
        id,
        name: id,
        faction: 'RS' as FactionId,
        kind: 'brigade',
        status: 'active',
        created_turn: 1,
        assignment: null,
        personnel: 1000,
        cohesion: 70,
        morale: 70,
        ...overrides,
    } as FormationState;
}

describe('final sector reserve-band truth', () => {
    it('preserves a truthful one-hop reserve even when the reserve OSID is not already in territory_osids', () => {
        const state: GameState = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: {
                turn: 10,
                seed: 'final-sector-reserve-band-truth',
                phase: 'war',
                scenario_start_date: { year: 1992, month: 4, day: 6 },
                referendum_held: true,
                referendum_turn: 1,
                war_start_turn: 1,
            } as GameState['meta'],
            factions: [
                { id: 'RS' as FactionId, profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
                { id: 'RBiH' as FactionId, profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
            ] as unknown as GameState['factions'],
            military: {
                formations: {
                    corps_a: makeFormation('corps_a', {
                        kind: 'corps',
                        location_osid: 'op:hq',
                        personnel: 50,
                    }),
                    brig_reserve: makeFormation('brig_reserve', {
                        corps_id: 'corps_a',
                        location_osid: 'op:rear',
                        home_osid: 'op:rear',
                    }),
                    brig_front: makeFormation('brig_front', {
                        corps_id: 'corps_a',
                        location_osid: 'op:front',
                        home_osid: 'op:front',
                        assignment: { kind: 'sector', sector_id: 'sector:corps_a:0', role: 'front' },
                    }),
                },
                war_front_edges_osid: [
                    { edge_id: 'op:front__op:enemy', a: 'op:front', b: 'op:enemy', side_a: 'RS', side_b: 'RBiH' },
                ],
                front_segments: {},
                front_posture: {},
                front_posture_regions: {},
                front_pressure: {},
                militia_pools: {},
                army_co_decision_traces: {},
                army_corps_directives_by_faction: {},
                event_decision_log: [],
            } as GameState['military'],
            political: {
                political_controllers: {
                    'op:hq': 'RS',
                    'op:front': 'RS',
                    'op:rear': 'RS',
                    'op:enemy': 'RBiH',
                },
            } as unknown as GameState['political'],
            displacement: {} as GameState['displacement'],
        } as GameState;

        const sectors: Record<string, CorpsFrontSector> = {
            'sector:corps_a:0': {
                sector_id: 'sector:corps_a:0',
                faction: 'RS' as FactionId,
                corps_id: 'corps_a',
                edge_ids: ['op:front__op:enemy'],
                length_edges: 1,
                opposing_factions: ['RBiH' as FactionId],
                assigned_brigade_ids: ['brig_front'],
                reserve_brigade_ids: [],
                rear_brigade_ids: [],
                territory_osids: ['op:hq', 'op:front'],
                sub_segments: [{
                    sub_segment_id: 'ssid:0',
                    edge_ids: ['op:front__op:enemy'],
                    friendly_osids: ['op:front'],
                    enemy_osids: ['op:enemy'],
                    length_edges: 1,
                    primary_brigade_ids: ['brig_front'],
                }],
                density: 1,
                threat_ratio: 1,
                defensive_power: 1000,
                sector_stance: 'defend',
                stance_source: 'bot',
            },
        };

        const edges: EdgeRecord[] = [
            { a: 'op:hq', b: 'op:front' } as EdgeRecord,
            { a: 'op:rear', b: 'op:front' } as EdgeRecord,
            { a: 'op:front', b: 'op:enemy' } as EdgeRecord,
        ];
        const adjacency = buildOsidAdjacency(edges);

        applyFinalSectorOwnerTruthPass(sectors, state, state.military.formations, adjacency);

        expect(sectors['sector:corps_a:0']?.reserve_brigade_ids ?? []).toContain('brig_reserve');
        expect(sectors['sector:corps_a:0']?.territory_osids ?? []).toContain('op:rear');
    });

    it('keeps a live front sector rear-only when no brigade physically qualifies for the reserve band', () => {
        const state: GameState = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: {
                turn: 10,
                seed: 'final-sector-rear-only-reserve-promotion',
                phase: 'war',
                scenario_start_date: { year: 1992, month: 4, day: 6 },
                referendum_held: true,
                referendum_turn: 1,
                war_start_turn: 1,
            } as GameState['meta'],
            factions: [
                { id: 'RS' as FactionId, profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
                { id: 'RBiH' as FactionId, profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
            ] as unknown as GameState['factions'],
            military: {
                formations: {
                    corps_a: makeFormation('corps_a', {
                        kind: 'corps',
                        location_osid: 'op:hq',
                        personnel: 50,
                    }),
                    brig_light: makeFormation('brig_light', {
                        corps_id: 'corps_a',
                        location_osid: 'op:rear_light',
                        home_osid: 'op:rear_light',
                        personnel: 600,
                    }),
                    brig_heavy: makeFormation('brig_heavy', {
                        corps_id: 'corps_a',
                        location_osid: 'op:rear_heavy',
                        home_osid: 'op:rear_heavy',
                        personnel: 1000,
                    }),
                },
                war_front_edges_osid: [
                    { edge_id: 'op:front__op:enemy', a: 'op:front', b: 'op:enemy', side_a: 'RS', side_b: 'RBiH' },
                ],
                front_segments: {},
                front_posture: {},
                front_posture_regions: {},
                front_pressure: {},
                militia_pools: {},
                army_co_decision_traces: {},
                army_corps_directives_by_faction: {},
                event_decision_log: [],
            } as GameState['military'],
            political: {
                political_controllers: {
                    'op:hq': 'RS',
                    'op:front': 'RS',
                    'op:rear_light': 'RS',
                    'op:rear_heavy': 'RS',
                    'op:enemy': 'RBiH',
                },
            } as unknown as GameState['political'],
            displacement: {} as GameState['displacement'],
        } as GameState;

        const sectors: Record<string, CorpsFrontSector> = {
            'sector:corps_a:0': {
                sector_id: 'sector:corps_a:0',
                faction: 'RS' as FactionId,
                corps_id: 'corps_a',
                edge_ids: ['op:front__op:enemy'],
                length_edges: 1,
                opposing_factions: ['RBiH' as FactionId],
                assigned_brigade_ids: [],
                reserve_brigade_ids: [],
                rear_brigade_ids: ['brig_light', 'brig_heavy'],
                territory_osids: ['op:hq', 'op:front', 'op:rear_light', 'op:rear_heavy'],
                sub_segments: [{
                    sub_segment_id: 'ssid:0',
                    edge_ids: ['op:front__op:enemy'],
                    friendly_osids: ['op:front'],
                    enemy_osids: ['op:enemy'],
                    length_edges: 1,
                    primary_brigade_ids: [],
                }],
                density: 0,
                threat_ratio: 1,
                defensive_power: 0,
                sector_stance: 'defend',
                stance_source: 'bot',
            },
        };

        const edges: EdgeRecord[] = [
            { a: 'op:hq', b: 'op:front' } as EdgeRecord,
            { a: 'op:hq', b: 'op:rear_light' } as EdgeRecord,
            { a: 'op:hq', b: 'op:rear_heavy' } as EdgeRecord,
            { a: 'op:front', b: 'op:enemy' } as EdgeRecord,
        ];
        const adjacency = buildOsidAdjacency(edges);

        applyFinalSectorOwnerTruthPass(sectors, state, state.military.formations, adjacency);

        expect(sectors['sector:corps_a:0']?.reserve_brigade_ids ?? []).toEqual([]);
        expect(sectors['sector:corps_a:0']?.rear_brigade_ids ?? []).toEqual(['brig_heavy', 'brig_light']);
    });

    it('rescues an empty sibling front pocket by rehoming a same-corps adjacent owner into its truthful one-hop reserve band', () => {
        const state: GameState = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: {
                turn: 10,
                seed: 'final-sector-empty-pocket-rescue',
                phase: 'war',
                scenario_start_date: { year: 1992, month: 4, day: 6 },
                referendum_held: true,
                referendum_turn: 1,
                war_start_turn: 1,
            } as GameState['meta'],
            factions: [
                { id: 'RS' as FactionId, profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
                { id: 'RBiH' as FactionId, profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
            ] as unknown as GameState['factions'],
            military: {
                formations: {
                    corps_a: makeFormation('corps_a', {
                        kind: 'corps',
                        location_osid: 'op:hq',
                        personnel: 50,
                    }),
                    brig_donor_front: makeFormation('brig_donor_front', {
                        corps_id: 'corps_a',
                        location_osid: 'op:staffed_front',
                        home_osid: 'op:staffed_front',
                        assignment: { kind: 'sector', sector_id: 'sector:corps_a:0', role: 'front' },
                    }),
                    brig_donor_reserve: makeFormation('brig_donor_reserve', {
                        corps_id: 'corps_a',
                        location_osid: 'op:staffed_rear',
                        home_osid: 'op:staffed_rear',
                        assignment: { kind: 'sector', sector_id: 'sector:corps_a:0', role: 'reserve' },
                    }),
                },
                war_front_edges_osid: [
                    { edge_id: 'op:staffed_front__op:enemy_a', a: 'op:staffed_front', b: 'op:enemy_a', side_a: 'RS', side_b: 'RBiH' },
                    { edge_id: 'op:empty_front__op:enemy_b', a: 'op:empty_front', b: 'op:enemy_b', side_a: 'RS', side_b: 'RBiH' },
                ],
                front_segments: {},
                front_posture: {},
                front_posture_regions: {},
                front_pressure: {},
                militia_pools: {},
                army_co_decision_traces: {},
                army_corps_directives_by_faction: {},
                event_decision_log: [],
            } as GameState['military'],
            political: {
                political_controllers: {
                    'op:hq': 'RS',
                    'op:staffed_front': 'RS',
                    'op:staffed_rear': 'RS',
                    'op:empty_front': 'RS',
                    'op:enemy_a': 'RBiH',
                    'op:enemy_b': 'RBiH',
                },
            } as unknown as GameState['political'],
            displacement: {} as GameState['displacement'],
        } as GameState;

        const sectors: Record<string, CorpsFrontSector> = {
            'sector:corps_a:0': {
                sector_id: 'sector:corps_a:0',
                faction: 'RS' as FactionId,
                corps_id: 'corps_a',
                edge_ids: ['op:staffed_front__op:enemy_a'],
                length_edges: 1,
                opposing_factions: ['RBiH' as FactionId],
                assigned_brigade_ids: ['brig_donor_front'],
                reserve_brigade_ids: ['brig_donor_reserve'],
                rear_brigade_ids: [],
                territory_osids: ['op:staffed_front', 'op:staffed_rear'],
                sub_segments: [{
                    sub_segment_id: 'ssid:donor',
                    edge_ids: ['op:staffed_front__op:enemy_a'],
                    friendly_osids: ['op:staffed_front'],
                    enemy_osids: ['op:enemy_a'],
                    length_edges: 1,
                    primary_brigade_ids: ['brig_donor_front'],
                }],
                density: 2,
                threat_ratio: 1,
                defensive_power: 1000,
                sector_stance: 'defend',
                stance_source: 'bot',
            },
            'sector:corps_a:1': {
                sector_id: 'sector:corps_a:1',
                faction: 'RS' as FactionId,
                corps_id: 'corps_a',
                edge_ids: ['op:empty_front__op:enemy_b'],
                length_edges: 1,
                opposing_factions: ['RBiH' as FactionId],
                assigned_brigade_ids: [],
                reserve_brigade_ids: [],
                rear_brigade_ids: [],
                territory_osids: ['op:empty_front'],
                sub_segments: [{
                    sub_segment_id: 'ssid:empty',
                    edge_ids: ['op:empty_front__op:enemy_b'],
                    friendly_osids: ['op:empty_front'],
                    enemy_osids: ['op:enemy_b'],
                    length_edges: 1,
                    primary_brigade_ids: [],
                }],
                density: 0,
                threat_ratio: 1,
                defensive_power: 0,
                sector_stance: 'defend',
                stance_source: 'bot',
            },
        };

        const edges: EdgeRecord[] = [
            { a: 'op:hq', b: 'op:staffed_rear' } as EdgeRecord,
            { a: 'op:staffed_rear', b: 'op:staffed_front' } as EdgeRecord,
            { a: 'op:staffed_front', b: 'op:empty_front' } as EdgeRecord,
            { a: 'op:staffed_front', b: 'op:enemy_a' } as EdgeRecord,
            { a: 'op:empty_front', b: 'op:enemy_b' } as EdgeRecord,
        ];
        const adjacency = buildOsidAdjacency(edges);

        applyFinalSectorOwnerTruthPass(sectors, state, state.military.formations, adjacency);

        expect(sectors['sector:corps_a:1']?.assigned_brigade_ids ?? []).toEqual([]);
        expect(sectors['sector:corps_a:1']?.reserve_brigade_ids ?? []).toEqual(['brig_donor_front']);
        expect(sectors['sector:corps_a:0']?.assigned_brigade_ids ?? []).toEqual([]);
        expect(sectors['sector:corps_a:0']?.reserve_brigade_ids ?? []).toEqual(['brig_donor_reserve']);
    });
});
