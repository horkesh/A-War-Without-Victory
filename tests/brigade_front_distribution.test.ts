/**
 * Tests for distributeBrigadesToFront — spreads brigades across sector front OSIDs.
 *
 * TDD: tests written first, then implementation.
 */
import { describe, it, expect } from 'vitest';
import { distributeBrigadesToFront } from '../src/sim/combat/brigade_front_distribution.js';
import { makeAdjacency } from './_helpers/adjacency.js';

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeState(formations: Record<string, any>): any {
    return {
        military: {
            formations,
            brigade_movement_orders: {},
        },
        political: {
            political_controllers: {},
        },
    };
}

function makeSector(overrides: Partial<any> = {}): any {
    return {
        corps_id: 'test_corps',
        faction: 'RS',
        sector_id: 'sector:test:0',
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        sub_segments: [],
        ...overrides,
    };
}

function makeFormation(overrides: Partial<any> = {}): any {
    return {
        kind: 'brigade',
        status: 'active',
        faction: 'RS',
        location_osid: 'op:test:a',
        home_osid: 'op:test:a',
        entrenchment_turns: 0,
        disrupted_turns: 0,
        assigned_sub_segment_id: undefined,
        ...overrides,
    };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('distributeBrigadesToFront', () => {
    it('spreads stacked brigades to adjacent empty front OSIDs', () => {
        // 3 brigades all at osid-A, sub-segment front = [A, B, C], A↔B, A↔C
        const state = makeState({
            brig_1: makeFormation({ location_osid: 'op:test:a' }),
            brig_2: makeFormation({ location_osid: 'op:test:a' }),
            brig_3: makeFormation({ location_osid: 'op:test:a' }),
        });

        const sectors = [
            makeSector({
                assigned_brigade_ids: ['brig_1', 'brig_2', 'brig_3'],
                sub_segments: [{
                    sub_segment_id: 'subseg:test:0',
                    friendly_osids: ['op:test:a', 'op:test:b', 'op:test:c'],
                    enemy_osids: ['op:enemy:x'],
                    primary_brigade_ids: ['brig_1', 'brig_2', 'brig_3'],
                    edge_ids: [],
                    length_edges: 3,
                }],
            }),
        ];

        const adjacency = makeAdjacency([
            ['op:test:a', 'op:test:b'],
            ['op:test:a', 'op:test:c'],
        ]);

        distributeBrigadesToFront(state, sectors, adjacency);

        // Each OSID should have exactly 1 brigade
        const locations = [
            state.military.formations.brig_1.location_osid,
            state.military.formations.brig_2.location_osid,
            state.military.formations.brig_3.location_osid,
        ].sort();

        expect(locations).toEqual(['op:test:a', 'op:test:b', 'op:test:c']);
    });

    it('sees sibling-sector front occupants when deconflicting a shared OSID', () => {
        const state = makeState({
            brig_sector_a: makeFormation({ location_osid: 'op:test:shared', entrenchment_turns: 12 }),
            brig_sector_b: makeFormation({ location_osid: 'op:test:shared', entrenchment_turns: 12 }),
        });

        const sectors = [
            makeSector({
                sector_id: 'sector:test:a',
                assigned_brigade_ids: ['brig_sector_a'],
                sub_segments: [{
                    sub_segment_id: 'subseg:test:a',
                    friendly_osids: ['op:test:shared', 'op:test:a_empty'],
                    enemy_osids: ['op:enemy:x'],
                    primary_brigade_ids: ['brig_sector_a'],
                    edge_ids: [],
                    length_edges: 2,
                }],
            }),
            makeSector({
                sector_id: 'sector:test:b',
                assigned_brigade_ids: ['brig_sector_b'],
                sub_segments: [{
                    sub_segment_id: 'subseg:test:b',
                    friendly_osids: ['op:test:shared', 'op:test:b_empty'],
                    enemy_osids: ['op:enemy:y'],
                    primary_brigade_ids: ['brig_sector_b'],
                    edge_ids: [],
                    length_edges: 2,
                }],
            }),
        ];

        const adjacency = makeAdjacency([
            ['op:test:shared', 'op:test:a_empty'],
            ['op:test:shared', 'op:test:b_empty'],
        ]);

        distributeBrigadesToFront(state, sectors, adjacency);

        const locations = [
            state.military.formations.brig_sector_a.location_osid,
            state.military.formations.brig_sector_b.location_osid,
        ].sort();
        expect(locations).toContain('op:test:shared');
        expect(
            locations.includes('op:test:a_empty') || locations.includes('op:test:b_empty'),
        ).toBe(true);
    });

    it('breaks entrenched cross-sector boundary stacks without requiring a normal Phase A spread', () => {
        const state = makeState({
            brig_large_boundary: makeFormation({
                location_osid: 'op:test:shared',
                entrenchment_turns: 12,
                personnel: 2000,
            }),
            brig_smaller_boundary: makeFormation({
                location_osid: 'op:test:shared',
                entrenchment_turns: 12,
                personnel: 700,
            }),
        });

        const sectors = [
            makeSector({
                sector_id: 'sector:test:left',
                assigned_brigade_ids: ['brig_smaller_boundary'],
                sub_segments: [{
                    sub_segment_id: 'subseg:test:left',
                    friendly_osids: ['op:test:shared', 'op:test:left_empty'],
                    enemy_osids: ['op:enemy:left'],
                    primary_brigade_ids: ['brig_smaller_boundary'],
                    edge_ids: [],
                    length_edges: 2,
                }],
            }),
            makeSector({
                sector_id: 'sector:test:right',
                assigned_brigade_ids: ['brig_large_boundary'],
                sub_segments: [{
                    sub_segment_id: 'subseg:test:right',
                    friendly_osids: ['op:test:shared', 'op:test:right_occupied'],
                    enemy_osids: ['op:enemy:right'],
                    primary_brigade_ids: ['brig_large_boundary'],
                    edge_ids: [],
                    length_edges: 2,
                }],
            }),
        ];

        const adjacency = makeAdjacency([
            ['op:test:shared', 'op:test:left_empty'],
            ['op:test:shared', 'op:test:right_occupied'],
        ]);
        state.military.formations.brig_existing = makeFormation({
            location_osid: 'op:test:right_occupied',
            entrenchment_turns: 12,
        });

        distributeBrigadesToFront(state, sectors, adjacency);

        expect(state.military.formations.brig_large_boundary.location_osid).toBe('op:test:shared');
        expect(state.military.formations.brig_smaller_boundary.location_osid).toBe('op:test:left_empty');
    });

    it('issues column march for rear brigade beyond 1 hop', () => {
        // Brigade at rear OSID (4 hops from front), sub-segment front = [F1, F2]
        const state = makeState({
            brig_rear: makeFormation({ location_osid: 'op:test:r4' }),
        });

        const sectors = [
            makeSector({
                assigned_brigade_ids: ['brig_rear'],
                sub_segments: [{
                    sub_segment_id: 'subseg:test:0',
                    friendly_osids: ['op:test:f1', 'op:test:f2'],
                    enemy_osids: ['op:enemy:x'],
                    primary_brigade_ids: ['brig_rear'],
                    edge_ids: [],
                    length_edges: 2,
                }],
            }),
        ];

        // Chain: r4 → r3 → r2 → r1 → f1 ↔ f2
        const adjacency = makeAdjacency([
            ['op:test:r4', 'op:test:r3'],
            ['op:test:r3', 'op:test:r2'],
            ['op:test:r2', 'op:test:r1'],
            ['op:test:r1', 'op:test:f1'],
            ['op:test:f1', 'op:test:f2'],
        ]);

        distributeBrigadesToFront(state, sectors, adjacency);

        // Brigade should NOT have moved directly (too far)
        expect(state.military.formations.brig_rear.location_osid).toBe('op:test:r4');

        // Should have a column march order
        const order = state.military.brigade_movement_orders?.brig_rear;
        expect(order).toBeDefined();
        expect(order.destination_sids).toHaveLength(1);
        // Target should be one of the front OSIDs
        expect(['op:test:f1', 'op:test:f2']).toContain(order.destination_sids[0]);
        expect(order.stance).toBe('column');
    });

    it('skips brigades in active operations', () => {
        const state = makeState({
            brig_op: makeFormation({ location_osid: 'op:test:a' }),
            brig_normal: makeFormation({ location_osid: 'op:test:a' }),
            // Corps asset with active operation referencing brig_op
            test_corps: {
                kind: 'corps_asset',
                status: 'active',
                faction: 'RS',
                active_operations: [{
                    name: 'Op Storm',
                    phase: 'execution',
                    participating_brigades: ['brig_op'],
                }],
            },
        });

        const sectors = [
            makeSector({
                assigned_brigade_ids: ['brig_op', 'brig_normal'],
                sub_segments: [{
                    sub_segment_id: 'subseg:test:0',
                    friendly_osids: ['op:test:a', 'op:test:b'],
                    enemy_osids: ['op:enemy:x'],
                    primary_brigade_ids: ['brig_op', 'brig_normal'],
                    edge_ids: [],
                    length_edges: 2,
                }],
            }),
        ];

        const adjacency = makeAdjacency([
            ['op:test:a', 'op:test:b'],
        ]);

        distributeBrigadesToFront(state, sectors, adjacency);

        // brig_op should stay put (in active operation)
        expect(state.military.formations.brig_op.location_osid).toBe('op:test:a');
        // brig_normal should move to the empty OSID
        expect(state.military.formations.brig_normal.location_osid).toBe('op:test:b');
    });

    it('skips Sarajevo siege sectors (arbih_1st_corps)', () => {
        const state = makeState({
            brig_sarajevo: makeFormation({ location_osid: 'op:novo_sarajevo:sarajevo_dio_novo_sarajevo' }),
            brig_sarajevo_2: makeFormation({ location_osid: 'op:novo_sarajevo:sarajevo_dio_novo_sarajevo' }),
        });

        const sectors = [
            makeSector({
                corps_id: 'arbih_1st_corps',
                faction: 'RBiH',
                assigned_brigade_ids: ['brig_sarajevo', 'brig_sarajevo_2'],
                sub_segments: [{
                    sub_segment_id: 'subseg:arbih_1st:0',
                    friendly_osids: ['op:novo_sarajevo:sarajevo_dio_novo_sarajevo', 'op:novo_sarajevo:hvarska'],
                    enemy_osids: ['op:novo_sarajevo:lukavica'],
                    primary_brigade_ids: ['brig_sarajevo', 'brig_sarajevo_2'],
                    edge_ids: [],
                    length_edges: 2,
                }],
            }),
        ];

        const adjacency = makeAdjacency([
            ['op:novo_sarajevo:sarajevo_dio_novo_sarajevo', 'op:novo_sarajevo:hvarska'],
        ]);

        distributeBrigadesToFront(state, sectors, adjacency);

        // Both should stay stacked — siege sector is exempt
        expect(state.military.formations.brig_sarajevo.location_osid).toBe('op:novo_sarajevo:sarajevo_dio_novo_sarajevo');
        expect(state.military.formations.brig_sarajevo_2.location_osid).toBe('op:novo_sarajevo:sarajevo_dio_novo_sarajevo');
    });

    it('prefers least-stacked OSID for redistribution', () => {
        // 3 brigades: 2 at A, 1 at B. frontOsids=[A,B,C]. A↔B, A↔C, B↔C
        const state = makeState({
            brig_1: makeFormation({ location_osid: 'op:test:a' }),
            brig_2: makeFormation({ location_osid: 'op:test:a' }),
            brig_3: makeFormation({ location_osid: 'op:test:b' }),
        });

        const sectors = [
            makeSector({
                assigned_brigade_ids: ['brig_1', 'brig_2', 'brig_3'],
                sub_segments: [{
                    sub_segment_id: 'subseg:test:0',
                    friendly_osids: ['op:test:a', 'op:test:b', 'op:test:c'],
                    enemy_osids: ['op:enemy:x'],
                    primary_brigade_ids: ['brig_1', 'brig_2', 'brig_3'],
                    edge_ids: [],
                    length_edges: 3,
                }],
            }),
        ];

        const adjacency = makeAdjacency([
            ['op:test:a', 'op:test:b'],
            ['op:test:a', 'op:test:c'],
            ['op:test:b', 'op:test:c'],
        ]);

        distributeBrigadesToFront(state, sectors, adjacency);

        // C was empty, so one brigade from A should move to C
        const locations = [
            state.military.formations.brig_1.location_osid,
            state.military.formations.brig_2.location_osid,
            state.military.formations.brig_3.location_osid,
        ].sort();

        expect(locations).toEqual(['op:test:a', 'op:test:b', 'op:test:c']);
    });

    it('no-op for brigades already spread evenly', () => {
        const state = makeState({
            brig_1: makeFormation({ location_osid: 'op:test:a', entrenchment_turns: 5 }),
            brig_2: makeFormation({ location_osid: 'op:test:b', entrenchment_turns: 3 }),
            brig_3: makeFormation({ location_osid: 'op:test:c', entrenchment_turns: 7 }),
        });

        const sectors = [
            makeSector({
                assigned_brigade_ids: ['brig_1', 'brig_2', 'brig_3'],
                sub_segments: [{
                    sub_segment_id: 'subseg:test:0',
                    friendly_osids: ['op:test:a', 'op:test:b', 'op:test:c'],
                    enemy_osids: ['op:enemy:x'],
                    primary_brigade_ids: ['brig_1', 'brig_2', 'brig_3'],
                    edge_ids: [],
                    length_edges: 3,
                }],
            }),
        ];

        const adjacency = makeAdjacency([
            ['op:test:a', 'op:test:b'],
            ['op:test:b', 'op:test:c'],
        ]);

        distributeBrigadesToFront(state, sectors, adjacency);

        // No movement — already spread
        expect(state.military.formations.brig_1.location_osid).toBe('op:test:a');
        expect(state.military.formations.brig_2.location_osid).toBe('op:test:b');
        expect(state.military.formations.brig_3.location_osid).toBe('op:test:c');
        // Entrenchment should be preserved (no reset)
        expect(state.military.formations.brig_1.entrenchment_turns).toBe(5);
        expect(state.military.formations.brig_2.entrenchment_turns).toBe(3);
        expect(state.military.formations.brig_3.entrenchment_turns).toBe(7);
    });

    it('handles single-OSID sub-segment (no redistribution possible)', () => {
        const state = makeState({
            brig_1: makeFormation({ location_osid: 'op:test:only' }),
            brig_2: makeFormation({ location_osid: 'op:test:only' }),
        });

        const sectors = [
            makeSector({
                assigned_brigade_ids: ['brig_1', 'brig_2'],
                sub_segments: [{
                    sub_segment_id: 'subseg:test:0',
                    friendly_osids: ['op:test:only'],
                    enemy_osids: ['op:enemy:x'],
                    primary_brigade_ids: ['brig_1', 'brig_2'],
                    edge_ids: [],
                    length_edges: 1,
                }],
            }),
        ];

        const adjacency = makeAdjacency([]);

        distributeBrigadesToFront(state, sectors, adjacency);

        // Both stay — only 1 OSID, can't spread
        expect(state.military.formations.brig_1.location_osid).toBe('op:test:only');
        expect(state.military.formations.brig_2.location_osid).toBe('op:test:only');
    });

    it('uses strictCompare tiebreak when stacked (no home_osid preference)', () => {
        // 2 brigades at A, frontOsids=[A, B, C]. A↔B, A↔C.
        // Phase A sorts brigade candidates by strictCompare: brig_1 < brig_2.
        // brig_1 processes first, moves to B (first by strictCompare among empty neighbors B, C).
        // brig_2 is no longer stacked so stays at A.
        const state = makeState({
            brig_1: makeFormation({ location_osid: 'op:test:a', home_osid: 'op:test:a' }),
            brig_2: makeFormation({ location_osid: 'op:test:a', home_osid: 'op:test:b' }),
        });

        const sectors = [
            makeSector({
                assigned_brigade_ids: ['brig_1', 'brig_2'],
                sub_segments: [{
                    sub_segment_id: 'subseg:test:0',
                    friendly_osids: ['op:test:a', 'op:test:b', 'op:test:c'],
                    enemy_osids: ['op:enemy:x'],
                    primary_brigade_ids: ['brig_1', 'brig_2'],
                    edge_ids: [],
                    length_edges: 3,
                }],
            }),
        ];

        const adjacency = makeAdjacency([
            ['op:test:a', 'op:test:b'],
            ['op:test:a', 'op:test:c'],
        ]);

        distributeBrigadesToFront(state, sectors, adjacency);

        // brig_1 (sorts first) moves to B (first empty neighbor by strictCompare), brig_2 stays at A
        expect(state.military.formations.brig_1.location_osid).toBe('op:test:b');
        expect(state.military.formations.brig_2.location_osid).toBe('op:test:a');
    });

    it('resets entrenchment when moving a fresh brigade (entrenchment < 1)', () => {
        const state = makeState({
            brig_1: makeFormation({ location_osid: 'op:test:a', entrenchment_turns: 3 }),
            brig_2: makeFormation({ location_osid: 'op:test:a', entrenchment_turns: 0 }),
        });

        const sectors = [
            makeSector({
                assigned_brigade_ids: ['brig_1', 'brig_2'],
                sub_segments: [{
                    sub_segment_id: 'subseg:test:0',
                    friendly_osids: ['op:test:a', 'op:test:b'],
                    enemy_osids: ['op:enemy:x'],
                    primary_brigade_ids: ['brig_1', 'brig_2'],
                    edge_ids: [],
                    length_edges: 2,
                }],
            }),
        ];

        const adjacency = makeAdjacency([
            ['op:test:a', 'op:test:b'],
        ]);

        distributeBrigadesToFront(state, sectors, adjacency);

        // brig_2 (fresh, entrenchment=0) moved; brig_1 (entrenched) stayed
        expect(state.military.formations.brig_2.location_osid).toBe('op:test:b');
        expect(state.military.formations.brig_2.entrenchment_turns).toBe(0);
        expect(state.military.formations.brig_1.location_osid).toBe('op:test:a');
        expect(state.military.formations.brig_1.entrenchment_turns).toBe(3); // preserved
    });

    it('skips disrupted brigades', () => {
        const state = makeState({
            brig_disrupted: makeFormation({ location_osid: 'op:test:a', disrupted_turns: 2 }),
            brig_normal: makeFormation({ location_osid: 'op:test:a' }),
        });

        const sectors = [
            makeSector({
                assigned_brigade_ids: ['brig_disrupted', 'brig_normal'],
                sub_segments: [{
                    sub_segment_id: 'subseg:test:0',
                    friendly_osids: ['op:test:a', 'op:test:b'],
                    enemy_osids: ['op:enemy:x'],
                    primary_brigade_ids: ['brig_disrupted', 'brig_normal'],
                    edge_ids: [],
                    length_edges: 2,
                }],
            }),
        ];

        const adjacency = makeAdjacency([
            ['op:test:a', 'op:test:b'],
        ]);

        distributeBrigadesToFront(state, sectors, adjacency);

        // Disrupted brigade stays, normal one moves
        expect(state.military.formations.brig_disrupted.location_osid).toBe('op:test:a');
        expect(state.military.formations.brig_normal.location_osid).toBe('op:test:b');
    });

    it('skips vrs_sarajevo_romanija Sarajevo siege sectors', () => {
        const state = makeState({
            brig_srk_1: makeFormation({ location_osid: 'op:novo_sarajevo:lukavica', faction: 'RS' }),
            brig_srk_2: makeFormation({ location_osid: 'op:novo_sarajevo:lukavica', faction: 'RS' }),
        });

        const sectors = [
            makeSector({
                corps_id: 'vrs_sarajevo_romanija',
                faction: 'RS',
                assigned_brigade_ids: ['brig_srk_1', 'brig_srk_2'],
                sub_segments: [{
                    sub_segment_id: 'subseg:srk:0',
                    friendly_osids: ['op:novo_sarajevo:lukavica', 'op:novo_sarajevo:vraca'],
                    enemy_osids: ['op:novo_sarajevo:sarajevo_dio_novo_sarajevo'],
                    primary_brigade_ids: ['brig_srk_1', 'brig_srk_2'],
                    edge_ids: [],
                    length_edges: 2,
                }],
            }),
        ];

        const adjacency = makeAdjacency([
            ['op:novo_sarajevo:lukavica', 'op:novo_sarajevo:vraca'],
        ]);

        distributeBrigadesToFront(state, sectors, adjacency);

        // Both stay stacked — SRK siege sector exempt
        expect(state.military.formations.brig_srk_1.location_osid).toBe('op:novo_sarajevo:lukavica');
        expect(state.military.formations.brig_srk_2.location_osid).toBe('op:novo_sarajevo:lukavica');
    });

    it('still disperses rear stacks in Sarajevo-Romanija sectors', () => {
        const state = makeState({
            brig_srk_front: makeFormation({ location_osid: 'op:sokolac:front', faction: 'RS' }),
            brig_srk_reserve: makeFormation({ location_osid: 'op:sokolac:rear_stack', faction: 'RS' }),
            brig_srk_rear: makeFormation({ location_osid: 'op:sokolac:rear_stack', faction: 'RS' }),
        });

        const sectors = [
            makeSector({
                corps_id: 'vrs_sarajevo_romanija',
                faction: 'RS',
                territory_osids: ['op:sokolac:rear_stack', 'op:sokolac:rear_empty'],
                assigned_brigade_ids: ['brig_srk_front'],
                reserve_brigade_ids: ['brig_srk_reserve'],
                rear_brigade_ids: ['brig_srk_rear'],
                sub_segments: [{
                    sub_segment_id: 'subseg:srk:0',
                    friendly_osids: ['op:sokolac:front'],
                    enemy_osids: ['op:pale:praca'],
                    primary_brigade_ids: ['brig_srk_front'],
                    edge_ids: [],
                    length_edges: 1,
                }],
            }),
        ];

        const adjacency = makeAdjacency([
            ['op:sokolac:rear_stack', 'op:sokolac:rear_empty'],
            ['op:sokolac:rear_stack', 'op:sokolac:front'],
        ]);

        distributeBrigadesToFront(state, sectors, adjacency);

        const locations = [
            state.military.formations.brig_srk_reserve.location_osid,
            state.military.formations.brig_srk_rear.location_osid,
        ].sort();
        expect(locations).toEqual(['op:sokolac:rear_empty', 'op:sokolac:rear_stack']);
    });

    it('skips brigades too far away (> MAX_REDISTRIBUTION_DISTANCE)', () => {
        // Brigade 22 hops from front (beyond MAX_REDISTRIBUTION_DISTANCE=20 and bfsDistance cap=20)
        const state = makeState({
            brig_far: makeFormation({ location_osid: 'op:test:r22' }),
        });

        const sectors = [
            makeSector({
                assigned_brigade_ids: ['brig_far'],
                sub_segments: [{
                    sub_segment_id: 'subseg:test:0',
                    friendly_osids: ['op:test:f1', 'op:test:f2'],
                    enemy_osids: ['op:enemy:x'],
                    primary_brigade_ids: ['brig_far'],
                    edge_ids: [],
                    length_edges: 2,
                }],
            }),
        ];

        // 22-hop chain: r22 → r21 → ... → r1 → f1 ↔ f2
        const pairs: [string, string][] = [
            ['op:test:f1', 'op:test:f2'],
        ];
        for (let i = 1; i <= 22; i++) {
            const from = i === 22 ? 'op:test:r22' : `op:test:r${i}`;
            const to = i === 1 ? 'op:test:f1' : `op:test:r${i - 1}`;
            pairs.push([from, to]);
        }
        const adjacency = makeAdjacency(pairs);

        distributeBrigadesToFront(state, sectors, adjacency);

        // Brigade too far — no movement, no order (bfsDistance caps at 20 and returns Infinity)
        expect(state.military.formations.brig_far.location_osid).toBe('op:test:r22');
        expect(state.military.brigade_movement_orders?.brig_far).toBeUndefined();
    });

    it('directly moves adjacent rear brigade (1 hop)', () => {
        // Brigade at rear OSID adjacent to front
        const state = makeState({
            brig_near: makeFormation({ location_osid: 'op:test:r1', entrenchment_turns: 3 }),
        });

        const sectors = [
            makeSector({
                assigned_brigade_ids: ['brig_near'],
                sub_segments: [{
                    sub_segment_id: 'subseg:test:0',
                    friendly_osids: ['op:test:f1', 'op:test:f2'],
                    enemy_osids: ['op:enemy:x'],
                    primary_brigade_ids: ['brig_near'],
                    edge_ids: [],
                    length_edges: 2,
                }],
            }),
        ];

        const adjacency = makeAdjacency([
            ['op:test:r1', 'op:test:f1'],
            ['op:test:f1', 'op:test:f2'],
        ]);

        distributeBrigadesToFront(state, sectors, adjacency);

        // Brigade should move directly (1 hop)
        expect(['op:test:f1', 'op:test:f2']).toContain(
            state.military.formations.brig_near.location_osid,
        );
        // Entrenchment reset
        expect(state.military.formations.brig_near.entrenchment_turns).toBe(0);
        // No column march order needed
        expect(state.military.brigade_movement_orders?.brig_near).toBeUndefined();
    });

    it('spreads stacked rear brigades across empty sector territory OSIDs', () => {
        const state = makeState({
            brig_front: makeFormation({ location_osid: 'op:test:front' }),
            brig_rear_1: makeFormation({ location_osid: 'op:test:rear_a', entrenchment_turns: 12 }),
            brig_rear_2: makeFormation({ location_osid: 'op:test:rear_a', entrenchment_turns: 12 }),
        });

        const sectors = [
            makeSector({
                assigned_brigade_ids: ['brig_front'],
                reserve_brigade_ids: [],
                rear_brigade_ids: ['brig_rear_1', 'brig_rear_2'],
                territory_osids: ['op:test:front', 'op:test:rear_a', 'op:test:rear_b'],
                sub_segments: [{
                    sub_segment_id: 'subseg:test:0',
                    friendly_osids: ['op:test:front'],
                    enemy_osids: ['op:enemy:x'],
                    primary_brigade_ids: ['brig_front'],
                    edge_ids: [],
                    length_edges: 1,
                }],
            }),
        ];

        const adjacency = makeAdjacency([
            ['op:test:front', 'op:test:rear_a'],
            ['op:test:rear_a', 'op:test:rear_b'],
        ]);

        distributeBrigadesToFront(state, sectors, adjacency);

        const rearLocations = [
            state.military.formations.brig_rear_1.location_osid,
            state.military.formations.brig_rear_2.location_osid,
        ].sort();

        expect(rearLocations).toEqual(['op:test:rear_a', 'op:test:rear_b']);
        expect(state.military.brigade_movement_orders?.brig_rear_1).toBeUndefined();
        expect(state.military.brigade_movement_orders?.brig_rear_2).toBeUndefined();
    });

    it('creates a short same-sector column march when the nearest empty rear target is beyond one hop', () => {
        const state = makeState({
            brig_front: makeFormation({ location_osid: 'op:test:front' }),
            brig_blocker: makeFormation({ location_osid: 'op:test:rear_2' }),
            brig_rear_1: makeFormation({ location_osid: 'op:test:rear_3', entrenchment_turns: 12 }),
            brig_rear_2: makeFormation({ location_osid: 'op:test:rear_3', entrenchment_turns: 12 }),
        });

        const sectors = [
            makeSector({
                assigned_brigade_ids: ['brig_front'],
                reserve_brigade_ids: [],
                rear_brigade_ids: ['brig_rear_1', 'brig_rear_2'],
                territory_osids: ['op:test:front', 'op:test:rear_1', 'op:test:rear_2', 'op:test:rear_3'],
                sub_segments: [{
                    sub_segment_id: 'subseg:test:0',
                    friendly_osids: ['op:test:front'],
                    enemy_osids: ['op:enemy:x'],
                    primary_brigade_ids: ['brig_front'],
                    edge_ids: [],
                    length_edges: 1,
                }],
            }),
        ];

        const adjacency = makeAdjacency([
            ['op:test:front', 'op:test:rear_1'],
            ['op:test:rear_1', 'op:test:rear_2'],
            ['op:test:rear_2', 'op:test:rear_3'],
        ]);

        distributeBrigadesToFront(state, sectors, adjacency);

        const movedDirectly = ['op:test:rear_1', 'op:test:rear_2'].includes(
            state.military.formations.brig_rear_1.location_osid,
        ) || ['op:test:rear_1', 'op:test:rear_2'].includes(
            state.military.formations.brig_rear_2.location_osid,
        );
        const orders = [
            state.military.brigade_movement_orders?.brig_rear_1,
            state.military.brigade_movement_orders?.brig_rear_2,
        ].filter(Boolean);

        expect(movedDirectly).toBe(false);
        expect(orders).toHaveLength(1);
        expect(orders[0]!.destination_sids).toEqual(['op:test:rear_1']);
        expect(orders[0]!.stance).toBe('column');
    });

    it('can directly repair two-hop rear stacks when called from the final truth seal', () => {
        const state = makeState({
            brig_front: makeFormation({ location_osid: 'op:test:front' }),
            brig_blocker: makeFormation({ location_osid: 'op:test:rear_2' }),
            brig_rear_1: makeFormation({ location_osid: 'op:test:rear_3', entrenchment_turns: 12 }),
            brig_rear_2: makeFormation({ location_osid: 'op:test:rear_3', entrenchment_turns: 12 }),
        });

        const sectors = [
            makeSector({
                assigned_brigade_ids: ['brig_front'],
                reserve_brigade_ids: [],
                rear_brigade_ids: ['brig_rear_1', 'brig_rear_2'],
                territory_osids: ['op:test:front', 'op:test:rear_1', 'op:test:rear_2', 'op:test:rear_3'],
                sub_segments: [{
                    sub_segment_id: 'subseg:test:0',
                    friendly_osids: ['op:test:front'],
                    enemy_osids: ['op:enemy:x'],
                    primary_brigade_ids: ['brig_front'],
                    edge_ids: [],
                    length_edges: 1,
                }],
            }),
        ];

        const adjacency = makeAdjacency([
            ['op:test:front', 'op:test:rear_1'],
            ['op:test:rear_1', 'op:test:rear_2'],
            ['op:test:rear_2', 'op:test:rear_3'],
        ]);

        distributeBrigadesToFront(state, sectors, adjacency, { rearDirectRepairMaxHops: 2 });

        const locations = [
            state.military.formations.brig_rear_1.location_osid,
            state.military.formations.brig_rear_2.location_osid,
        ].sort();

        expect(locations).toEqual(['op:test:rear_1', 'op:test:rear_3']);
        expect(state.military.brigade_movement_orders?.brig_rear_1).toBeUndefined();
        expect(state.military.brigade_movement_orders?.brig_rear_2).toBeUndefined();
    });

    it('disperses physically rear assigned brigades even before later bucket reclassification demotes them', () => {
        const state = makeState({
            brig_assigned_offfront: makeFormation({ location_osid: 'op:test:rear_a', entrenchment_turns: 12 }),
            brig_rear: makeFormation({ location_osid: 'op:test:rear_a', entrenchment_turns: 12 }),
        });

        const sectors = [
            makeSector({
                assigned_brigade_ids: ['brig_assigned_offfront'],
                reserve_brigade_ids: [],
                rear_brigade_ids: ['brig_rear'],
                territory_osids: ['op:test:front', 'op:test:rear_a', 'op:test:rear_b'],
                sub_segments: [{
                    sub_segment_id: 'subseg:test:0',
                    friendly_osids: ['op:test:front'],
                    enemy_osids: ['op:enemy:x'],
                    primary_brigade_ids: ['brig_assigned_offfront'],
                    edge_ids: [],
                    length_edges: 1,
                }],
            }),
        ];

        const adjacency = makeAdjacency([
            ['op:test:front', 'op:test:rear_a'],
            ['op:test:rear_a', 'op:test:rear_b'],
        ]);

        distributeBrigadesToFront(state, sectors, adjacency);

        const locations = [
            state.military.formations.brig_assigned_offfront.location_osid,
            state.military.formations.brig_rear.location_osid,
        ].sort();

        expect(locations).toEqual(['op:test:rear_a', 'op:test:rear_b']);
    });

    it('fills an unmanned sub-segment by marching a same-sector reserve brigade to its front', () => {
        const state = makeState({
            brig_reserve: makeFormation({ location_osid: 'op:test:rear_2', entrenchment_turns: 12 }),
        });

        const sectors = [
            makeSector({
                assigned_brigade_ids: [],
                reserve_brigade_ids: ['brig_reserve'],
                rear_brigade_ids: [],
                territory_osids: ['op:test:front', 'op:test:rear_1', 'op:test:rear_2'],
                sub_segments: [{
                    sub_segment_id: 'subseg:test:gap',
                    friendly_osids: ['op:test:front'],
                    enemy_osids: ['op:enemy:x'],
                    primary_brigade_ids: [],
                    edge_ids: ['edge:1', 'edge:2', 'edge:3'],
                    length_edges: 3,
                    gap: true,
                }],
            }),
        ];

        const adjacency = makeAdjacency([
            ['op:test:front', 'op:test:rear_1'],
            ['op:test:rear_1', 'op:test:rear_2'],
        ]);

        distributeBrigadesToFront(state, sectors, adjacency);

        expect(state.military.formations.brig_reserve.location_osid).toBe('op:test:rear_2');
        expect(state.military.brigade_movement_orders?.brig_reserve).toEqual({
            destination_sids: ['op:test:front'],
            stance: 'column',
        });
    });

    it('commits an understrength sector reserve to an otherwise unmanned sub-segment', () => {
        const state = makeState({
            brig_reserve: makeFormation({ location_osid: 'op:test:rear_1', entrenchment_turns: 12 }),
        });

        const sectors = [
            makeSector({
                assigned_brigade_ids: [],
                reserve_brigade_ids: ['brig_reserve'],
                rear_brigade_ids: [],
                territory_osids: ['op:test:front_a', 'op:test:front_b', 'op:test:rear_1'],
                sub_segments: [{
                    sub_segment_id: 'subseg:test:thin',
                    friendly_osids: ['op:test:front_a', 'op:test:front_b'],
                    enemy_osids: ['op:enemy:x'],
                    primary_brigade_ids: [],
                    edge_ids: ['edge:1', 'edge:2'],
                    length_edges: 2,
                    gap: true,
                }],
            }),
        ];

        const adjacency = makeAdjacency([
            ['op:test:front_a', 'op:test:rear_1'],
            ['op:test:front_b', 'op:test:rear_1'],
        ]);

        distributeBrigadesToFront(state, sectors, adjacency);

        expect(state.military.formations.brig_reserve.location_osid).toBe('op:test:front_a');
        expect(state.military.brigade_movement_orders?.brig_reserve).toBeUndefined();
    });

    it('may promote a reserve when the sector has enough active brigades to cover its frontage', () => {
        const state = makeState({
            brig_front: makeFormation({ location_osid: 'op:test:front_a', entrenchment_turns: 12 }),
            brig_reserve: makeFormation({ location_osid: 'op:test:rear_1', entrenchment_turns: 12 }),
        });

        const sectors = [
            makeSector({
                assigned_brigade_ids: ['brig_front'],
                reserve_brigade_ids: ['brig_reserve'],
                rear_brigade_ids: [],
                territory_osids: ['op:test:front_a', 'op:test:front_b', 'op:test:rear_1'],
                sub_segments: [{
                    sub_segment_id: 'subseg:test:coverable',
                    friendly_osids: ['op:test:front_a', 'op:test:front_b'],
                    enemy_osids: ['op:enemy:x'],
                    primary_brigade_ids: ['brig_front'],
                    edge_ids: ['edge:1', 'edge:2'],
                    length_edges: 2,
                    gap: false,
                }],
            }),
        ];

        const adjacency = makeAdjacency([
            ['op:test:front_a', 'op:test:rear_1'],
            ['op:test:front_b', 'op:test:rear_1'],
        ]);

        distributeBrigadesToFront(state, sectors, adjacency);

        expect(
            ['op:test:front_a', 'op:test:front_b'].includes(state.military.formations.brig_reserve.location_osid),
        ).toBe(true);
    });

});
