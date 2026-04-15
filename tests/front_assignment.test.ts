import { expect, test } from 'vitest';

import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { buildFrontlineAssignedFormationSet, hasLiveSectorFrontlineTruth, isBrigadeAssignedToFront } from '../src/sim/combat/front_assignment.js';

function makeState(): GameState {
    return {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 8, seed: 'test', phase: 'war' } as any,
  factions: [],
  brigade_aor: {
            S1: 'b1',
            S2: 'b2',
        },
  military: {
    formations: {
            b1: {
                id: 'b1',
                faction: 'RBiH',
                name: 'B1',
                created_turn: 1,
                status: 'active',
                assignment: null,
                kind: 'brigade',
                personnel: 1000,
                cohesion: 60,
                tags: [],
                location_osid: 'op:test_mun:s1',
            },
            b2: {
                id: 'b2',
                faction: 'RS',
                name: 'B2',
                created_turn: 1,
                status: 'active',
                assignment: null,
                kind: 'brigade',
                personnel: 1000,
                cohesion: 60,
                tags: [],
                location_osid: 'op:test_mun:s2',
            },
        } as any,
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    assignable_front_segments: [
            {
                front_id: 'RBiH__RS__S1__S2',
                edge_ids: ['S1__S2'],
                side_a: 'RBiH',
                side_b: 'RS',
                length_edges: 1,
            },
        ]
  } as any,
} as unknown as GameState;
}

test('legacy brigade_front_assignment no longer creates runtime frontline truth', () => {
    const state = makeState();
    state.military.brigade_front_assignment = { b1: 'RBiH__RS__S1__S2', b2: 'RBiH__RS__S1__S2' };
    const assigned = buildFrontlineAssignedFormationSet(state);
    expect([...assigned]).toEqual([]);
    expect(isBrigadeAssignedToFront(state, 'b1')).toBe(false);
    expect(isBrigadeAssignedToFront(state, 'b2')).toBe(false);
});

test('isBrigadeAssignedToFront treats only assigned corps-sector brigades as frontline truth', () => {
    const state = makeState();
    state.military.brigade_front_assignment = {};
    state.military.corps_front_sectors = {
        sector_1: {
            sector_id: 'sector_1',
            corps_id: 'arbih_3rd_corps',
            assigned_brigade_ids: ['b1'],
            reserve_brigade_ids: ['b2'],
            edge_ids: ['S1__S2'],
            length_edges: 1,
            posture: 'balanced',
            objective: 'hold_line',
            pressure_target: 0.5,
            last_updated_turn: 8,
        },
    } as any;

    const assigned = buildFrontlineAssignedFormationSet(state);
    expect([...assigned].sort()).toEqual(['b1']);
    expect(isBrigadeAssignedToFront(state, 'b1')).toBeTruthy();
    expect(isBrigadeAssignedToFront(state, 'b2')).toBe(false);
});

test('sector frontline truth ignores stale legacy front assignments when sectors exist', () => {
    const state = makeState();
    state.military.brigade_front_assignment = {
        b1: 'RBiH__RS__S1__S2',
        b2: 'RBiH__RS__S1__S2',
        b3: 'RBiH__RS__S1__S2',
    } as any;
    state.military.formations = {
        ...state.military.formations,
        b3: {
            id: 'b3',
            faction: 'RBiH',
            name: 'Reserve Ghost',
            created_turn: 1,
            status: 'active',
            assignment: null,
            kind: 'brigade',
            personnel: 700,
            cohesion: 55,
            tags: [],
            location_osid: 'op:test_mun:s1',
        },
    } as any;
    state.military.corps_front_sectors = {
        sector_1: {
            sector_id: 'sector_1',
            corps_id: 'arbih_3rd_corps',
            assigned_brigade_ids: ['b1'],
            reserve_brigade_ids: ['b2'],
            edge_ids: ['S1__S2'],
            length_edges: 1,
            posture: 'balanced',
            objective: 'hold_line',
            pressure_target: 0.5,
            last_updated_turn: 8,
        },
    } as any;

    const assigned = buildFrontlineAssignedFormationSet(state);
    expect([...assigned].sort()).toEqual(['b1']);
    expect(isBrigadeAssignedToFront(state, 'b3')).toBe(false);
});

test('legacy frontline fallback does not revive invalid or inactive formations', () => {
    const state = makeState();
    state.military.brigade_front_assignment = {
        b1: 'RBiH__RS__S1__S2',
        b2: 'MISSING_FRONT',
        b3: 'RBiH__RS__S1__S2',
    } as any;
    state.military.formations = {
        ...state.military.formations,
        b3: {
            id: 'b3',
            faction: 'RBiH',
            name: 'Inactive Ghost',
            created_turn: 1,
            status: 'destroyed',
            assignment: null,
            kind: 'brigade',
            personnel: 0,
            cohesion: 0,
            tags: [],
            location_osid: 'op:test_mun:s1',
        },
    } as any;

    const assigned = buildFrontlineAssignedFormationSet(state);
    expect([...assigned]).toEqual([]);
    expect(isBrigadeAssignedToFront(state, 'b2')).toBe(false);
    expect(isBrigadeAssignedToFront(state, 'b3')).toBe(false);
});

test('hasLiveSectorFrontlineTruth only reports true when sector state actually exists', () => {
    const state = makeState();
    expect(hasLiveSectorFrontlineTruth(state)).toBe(false);

    state.military.corps_front_sectors = {
        sector_1: {
            sector_id: 'sector_1',
            corps_id: 'arbih_3rd_corps',
            assigned_brigade_ids: [],
            reserve_brigade_ids: [],
            edge_ids: ['S1__S2'],
            length_edges: 1,
            posture: 'balanced',
            objective: 'hold_line',
            pressure_target: 0.5,
            last_updated_turn: 8,
        },
    } as any;

    expect(hasLiveSectorFrontlineTruth(state)).toBe(true);
});

