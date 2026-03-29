/**
 * Tests for distributeBrigadesToFront — spreads brigades across sector front OSIDs.
 *
 * TDD: tests written first, then implementation.
 */
import { describe, it, expect } from 'vitest';
import { distributeBrigadesToFront } from '../src/sim/combat/brigade_front_distribution.js';

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

function makeAdjacency(pairs: [string, string][]): Map<string, string[]> {
    const adj = new Map<string, string[]>();
    for (const [a, b] of pairs) {
        if (!adj.has(a)) adj.set(a, []);
        if (!adj.has(b)) adj.set(b, []);
        adj.get(a)!.push(b);
        adj.get(b)!.push(a);
    }
    // Sort for determinism
    for (const [, v] of adj) v.sort();
    return adj;
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
            brig_sarajevo: makeFormation({ location_osid: 'op:test:a' }),
            brig_sarajevo_2: makeFormation({ location_osid: 'op:test:a' }),
        });

        const sectors = [
            makeSector({
                corps_id: 'arbih_1st_corps',
                faction: 'RBiH',
                assigned_brigade_ids: ['brig_sarajevo', 'brig_sarajevo_2'],
                sub_segments: [{
                    sub_segment_id: 'subseg:arbih_1st:0',
                    friendly_osids: ['op:test:a', 'op:test:b'],
                    enemy_osids: ['op:enemy:x'],
                    primary_brigade_ids: ['brig_sarajevo', 'brig_sarajevo_2'],
                    edge_ids: [],
                    length_edges: 2,
                }],
            }),
        ];

        const adjacency = makeAdjacency([
            ['op:test:a', 'op:test:b'],
        ]);

        distributeBrigadesToFront(state, sectors, adjacency);

        // Both should stay stacked — siege sector is exempt
        expect(state.military.formations.brig_sarajevo.location_osid).toBe('op:test:a');
        expect(state.military.formations.brig_sarajevo_2.location_osid).toBe('op:test:a');
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

    it('prefers home OSID when breaking ties', () => {
        // 2 brigades at A, frontOsids=[A, B, C]. brig_2's home is B. A↔B, A↔C.
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

        // brig_2 should move to B (its home_osid), brig_1 stays at A
        expect(state.military.formations.brig_2.location_osid).toBe('op:test:b');
        expect(state.military.formations.brig_1.location_osid).toBe('op:test:a');
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

    it('skips vrs_sarajevo_romanija sectors', () => {
        const state = makeState({
            brig_srk_1: makeFormation({ location_osid: 'op:test:a', faction: 'RS' }),
            brig_srk_2: makeFormation({ location_osid: 'op:test:a', faction: 'RS' }),
        });

        const sectors = [
            makeSector({
                corps_id: 'vrs_sarajevo_romanija',
                faction: 'RS',
                assigned_brigade_ids: ['brig_srk_1', 'brig_srk_2'],
                sub_segments: [{
                    sub_segment_id: 'subseg:srk:0',
                    friendly_osids: ['op:test:a', 'op:test:b'],
                    enemy_osids: ['op:enemy:x'],
                    primary_brigade_ids: ['brig_srk_1', 'brig_srk_2'],
                    edge_ids: [],
                    length_edges: 2,
                }],
            }),
        ];

        const adjacency = makeAdjacency([
            ['op:test:a', 'op:test:b'],
        ]);

        distributeBrigadesToFront(state, sectors, adjacency);

        // Both stay stacked — SRK siege sector exempt
        expect(state.military.formations.brig_srk_1.location_osid).toBe('op:test:a');
        expect(state.military.formations.brig_srk_2.location_osid).toBe('op:test:a');
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
});
