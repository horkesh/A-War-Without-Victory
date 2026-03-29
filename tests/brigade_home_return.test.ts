/**
 * Tests for brigade_home_return — periodic return-to-home march for displaced brigades.
 *
 * Deterministic: sorted iteration, no randomness.
 */
import { describe, it, expect } from 'vitest';
import {
    computeReturnMarches,
    evaluateHomeReturn,
    RETURN_CHECK_INTERVAL,
    RETURN_DISPLACEMENT_THRESHOLD,
    RETURN_MAX_PER_CORPS,
    RETURN_MAX_MARCH_HOPS,
} from '../src/sim/combat/brigade_home_return.js';

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeState(formations: Record<string, any>, overrides: Partial<any> = {}): any {
    return {
        meta: { turn: 0, phase: 'war', ...(overrides.meta ?? {}) },
        military: {
            formations,
            brigade_movement_orders: {},
            corps_command: {},
            ...(overrides.military ?? {}),
        },
        political: {
            political_controllers: {},
            ...(overrides.political ?? {}),
        },
    };
}

function makeFormation(overrides: Partial<any> = {}): any {
    return {
        kind: 'brigade',
        status: 'active',
        faction: 'RBiH',
        location_osid: 'op:zenica:zenica_1',
        home_osid: 'op:zenica:zenica_1',
        corps_id: 'arbih_3rd_corps',
        personnel: 1500,
        entrenchment_turns: 0,
        disrupted_turns: 0,
        ...overrides,
    };
}

/**
 * Build adjacency map from pairs. Bidirectional.
 */
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

/**
 * Build a linear chain of OSIDs: op:mun1:slug1 ↔ op:mun2:slug2 ↔ ...
 * Returns adjacency and the list of OSID strings.
 */
function makeLinearChain(segments: Array<{ mun: string; slug: string }>): {
    adjacency: Map<string, string[]>;
    osids: string[];
    friendlyOsids: Set<string>;
} {
    const osids = segments.map(s => `op:${s.mun}:${s.slug}`);
    const pairs: [string, string][] = [];
    for (let i = 0; i < osids.length - 1; i++) {
        pairs.push([osids[i]!, osids[i + 1]!]);
    }
    return {
        adjacency: makeAdjacency(pairs),
        osids,
        friendlyOsids: new Set(osids),
    };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('computeReturnMarches', () => {
    it('does NOT return brigade already in home municipality', () => {
        const { adjacency, friendlyOsids } = makeLinearChain([
            { mun: 'zenica', slug: 'zenica_1' },
            { mun: 'zenica', slug: 'zenica_2' },
        ]);
        const state = makeState({
            brig_1: makeFormation({
                location_osid: 'op:zenica:zenica_1',
                home_osid: 'op:zenica:zenica_2',
            }),
        });

        const orders = computeReturnMarches(state, 'RBiH', adjacency, friendlyOsids);
        expect(orders).toHaveLength(0);
    });

    it('returns brigade 4+ hops from home with target toward home', () => {
        // Chain: travnik_1 ↔ travnik_2 ↔ vitez_1 ↔ vitez_2 ↔ zenica_1 ↔ zenica_2
        // Brigade at travnik_1, home_osid at zenica_2.
        // BFS finds first zenica OSID (zenica_1) at distance 4.
        const { adjacency, friendlyOsids } = makeLinearChain([
            { mun: 'travnik', slug: 'travnik_1' },
            { mun: 'travnik', slug: 'travnik_2' },
            { mun: 'vitez', slug: 'vitez_1' },
            { mun: 'vitez', slug: 'vitez_2' },
            { mun: 'zenica', slug: 'zenica_1' },
            { mun: 'zenica', slug: 'zenica_2' },
        ]);
        const state = makeState({
            brig_1: makeFormation({
                location_osid: 'op:travnik:travnik_1',
                home_osid: 'op:zenica:zenica_2',
            }),
        });

        const orders = computeReturnMarches(state, 'RBiH', adjacency, friendlyOsids);
        expect(orders).toHaveLength(1);
        expect(orders[0]!.brigade_id).toBe('brig_1');
        expect(orders[0]!.hops).toBe(4); // BFS to nearest zenica OSID
        // Target should be 4 hops along path = the home municipality itself
        expect(orders[0]!.target_osid).toBe('op:zenica:zenica_1');
        expect(orders[0]!.home_municipality).toBe('zenica');
        expect(orders[0]!.current_municipality).toBe('travnik');
    });

    it('skips brigade in active operation (corps_command)', () => {
        const { adjacency, friendlyOsids } = makeLinearChain([
            { mun: 'travnik', slug: 'travnik_1' },
            { mun: 'travnik', slug: 'travnik_2' },
            { mun: 'vitez', slug: 'vitez_1' },
            { mun: 'vitez', slug: 'vitez_2' },
            { mun: 'zenica', slug: 'zenica_1' },
        ]);
        const state = makeState(
            {
                brig_1: makeFormation({
                    location_osid: 'op:travnik:travnik_1',
                    home_osid: 'op:zenica:zenica_1',
                }),
            },
            {
                military: {
                    formations: undefined, // will be overwritten by makeState
                    brigade_movement_orders: {},
                    corps_command: {
                        arbih_3rd_corps: {
                            active_operations: [{
                                phase: 'execution',
                                participating_brigades: ['brig_1'],
                            }],
                        },
                    },
                },
            },
        );
        // Fix formations into the state (makeState merges military)
        state.military.formations = {
            brig_1: makeFormation({
                location_osid: 'op:travnik:travnik_1',
                home_osid: 'op:zenica:zenica_1',
            }),
        };

        const orders = computeReturnMarches(state, 'RBiH', adjacency, friendlyOsids);
        expect(orders).toHaveLength(0);
    });

    it('skips brigade with disrupted_turns > 0', () => {
        const { adjacency, friendlyOsids } = makeLinearChain([
            { mun: 'travnik', slug: 'travnik_1' },
            { mun: 'travnik', slug: 'travnik_2' },
            { mun: 'vitez', slug: 'vitez_1' },
            { mun: 'vitez', slug: 'vitez_2' },
            { mun: 'zenica', slug: 'zenica_1' },
        ]);
        const state = makeState({
            brig_1: makeFormation({
                location_osid: 'op:travnik:travnik_1',
                home_osid: 'op:zenica:zenica_1',
                disrupted_turns: 2,
            }),
        });

        const orders = computeReturnMarches(state, 'RBiH', adjacency, friendlyOsids);
        expect(orders).toHaveLength(0);
    });

    it('enforces RETURN_MAX_PER_CORPS — 3 displaced but only 2 get orders', () => {
        // 6-hop chain
        const { adjacency, friendlyOsids } = makeLinearChain([
            { mun: 'bugojno', slug: 'bugojno_1' },
            { mun: 'bugojno', slug: 'bugojno_2' },
            { mun: 'travnik', slug: 'travnik_1' },
            { mun: 'travnik', slug: 'travnik_2' },
            { mun: 'vitez', slug: 'vitez_1' },
            { mun: 'zenica', slug: 'zenica_1' },
            { mun: 'zenica', slug: 'zenica_2' },
        ]);
        const state = makeState({
            brig_a: makeFormation({
                location_osid: 'op:bugojno:bugojno_1',
                home_osid: 'op:zenica:zenica_2',
                corps_id: 'arbih_3rd_corps',
            }),
            brig_b: makeFormation({
                location_osid: 'op:bugojno:bugojno_2',
                home_osid: 'op:zenica:zenica_2',
                corps_id: 'arbih_3rd_corps',
            }),
            brig_c: makeFormation({
                location_osid: 'op:travnik:travnik_1',
                home_osid: 'op:zenica:zenica_2',
                corps_id: 'arbih_3rd_corps',
            }),
        });

        const orders = computeReturnMarches(state, 'RBiH', adjacency, friendlyOsids);
        expect(orders).toHaveLength(RETURN_MAX_PER_CORPS); // 2
        // Most displaced first (brig_a and brig_b at 6 hops, brig_c at 4 hops)
        // brig_a and brig_b both at 6 hops, tie-break by ID ASC
        expect(orders[0]!.brigade_id).toBe('brig_a');
        expect(orders[1]!.brigade_id).toBe('brig_b');
    });

    it('targets partial distance — 5 hops away gets order for 4 hops closer', () => {
        // Chain: prozor_1 ↔ prozor_2 ↔ jablanica_1 ↔ konjic_1 ↔ konjic_2 ↔ zenica_1 ↔ zenica_2
        // BFS from prozor_1 to first zenica OSID (zenica_1) = 5 hops
        // March target = 4 hops along path = konjic_2
        const { adjacency, friendlyOsids } = makeLinearChain([
            { mun: 'prozor', slug: 'prozor_1' },
            { mun: 'prozor', slug: 'prozor_2' },
            { mun: 'jablanica', slug: 'jablanica_1' },
            { mun: 'konjic', slug: 'konjic_1' },
            { mun: 'konjic', slug: 'konjic_2' },
            { mun: 'zenica', slug: 'zenica_1' },
            { mun: 'zenica', slug: 'zenica_2' },
        ]);
        const state = makeState({
            brig_1: makeFormation({
                location_osid: 'op:prozor:prozor_1',
                home_osid: 'op:zenica:zenica_2',
            }),
        });

        const orders = computeReturnMarches(state, 'RBiH', adjacency, friendlyOsids);
        expect(orders).toHaveLength(1);
        expect(orders[0]!.hops).toBe(5);
        // 4 hops from prozor_1 along the path: prozor_2, jablanica_1, konjic_1, konjic_2
        expect(orders[0]!.target_osid).toBe('op:konjic:konjic_2');
    });

    it('does NOT trigger for brigade within displacement threshold', () => {
        // 3 hops = exactly at threshold, should NOT trigger (> threshold required)
        const { adjacency, friendlyOsids } = makeLinearChain([
            { mun: 'travnik', slug: 'travnik_1' },
            { mun: 'vitez', slug: 'vitez_1' },
            { mun: 'vitez', slug: 'vitez_2' },
            { mun: 'zenica', slug: 'zenica_1' },
        ]);
        const state = makeState({
            brig_1: makeFormation({
                location_osid: 'op:travnik:travnik_1',
                home_osid: 'op:zenica:zenica_1',
            }),
        });

        const orders = computeReturnMarches(state, 'RBiH', adjacency, friendlyOsids);
        expect(orders).toHaveLength(0);
    });

    it('produces deterministic ordering — same state = same orders', () => {
        const { adjacency, friendlyOsids } = makeLinearChain([
            { mun: 'bugojno', slug: 'bugojno_1' },
            { mun: 'travnik', slug: 'travnik_1' },
            { mun: 'vitez', slug: 'vitez_1' },
            { mun: 'vitez', slug: 'vitez_2' },
            { mun: 'zenica', slug: 'zenica_1' },
        ]);
        const mkState = () => makeState({
            brig_z: makeFormation({
                location_osid: 'op:bugojno:bugojno_1',
                home_osid: 'op:zenica:zenica_1',
                corps_id: 'arbih_3rd_corps',
            }),
            brig_a: makeFormation({
                location_osid: 'op:bugojno:bugojno_1',
                home_osid: 'op:zenica:zenica_1',
                corps_id: 'arbih_3rd_corps',
            }),
        });

        const orders1 = computeReturnMarches(mkState(), 'RBiH', adjacency, friendlyOsids);
        const orders2 = computeReturnMarches(mkState(), 'RBiH', adjacency, friendlyOsids);
        expect(orders1).toEqual(orders2);
        // Both at same distance → tie-break by ID ASC
        expect(orders1[0]!.brigade_id).toBe('brig_a');
        expect(orders1[1]!.brigade_id).toBe('brig_z');
    });
});

describe('evaluateHomeReturn', () => {
    it('only runs on RETURN_CHECK_INTERVAL turns', () => {
        const { adjacency, friendlyOsids } = makeLinearChain([
            { mun: 'travnik', slug: 'travnik_1' },
            { mun: 'travnik', slug: 'travnik_2' },
            { mun: 'vitez', slug: 'vitez_1' },
            { mun: 'vitez', slug: 'vitez_2' },
            { mun: 'zenica', slug: 'zenica_1' },
        ]);

        // Build political controllers
        const pc: Record<string, string> = {};
        for (const osid of friendlyOsids) pc[osid] = 'RBiH';

        // Turn 1 = off-interval → no orders
        const stateOff = makeState(
            {
                brig_1: makeFormation({
                    location_osid: 'op:travnik:travnik_1',
                    home_osid: 'op:zenica:zenica_1',
                }),
            },
            {
                meta: { turn: 1, phase: 'war' },
                political: { political_controllers: pc },
            },
        );
        evaluateHomeReturn(stateOff, adjacency);
        expect(Object.keys(stateOff.military.brigade_movement_orders ?? {})).toHaveLength(0);

        // Turn 4 = on-interval → should produce orders
        const stateOn = makeState(
            {
                brig_1: makeFormation({
                    location_osid: 'op:travnik:travnik_1',
                    home_osid: 'op:zenica:zenica_1',
                }),
            },
            {
                meta: { turn: RETURN_CHECK_INTERVAL, phase: 'war' },
                political: { political_controllers: pc },
            },
        );
        evaluateHomeReturn(stateOn, adjacency);
        expect(Object.keys(stateOn.military.brigade_movement_orders ?? {})).toHaveLength(1);
    });

    it('issues column march orders with correct format', () => {
        const { adjacency, friendlyOsids } = makeLinearChain([
            { mun: 'travnik', slug: 'travnik_1' },
            { mun: 'travnik', slug: 'travnik_2' },
            { mun: 'vitez', slug: 'vitez_1' },
            { mun: 'vitez', slug: 'vitez_2' },
            { mun: 'zenica', slug: 'zenica_1' },
        ]);

        const pc: Record<string, string> = {};
        for (const osid of friendlyOsids) pc[osid] = 'RBiH';

        const state = makeState(
            {
                brig_1: makeFormation({
                    location_osid: 'op:travnik:travnik_1',
                    home_osid: 'op:zenica:zenica_1',
                }),
            },
            {
                meta: { turn: 0, phase: 'war' },
                political: { political_controllers: pc },
            },
        );
        evaluateHomeReturn(state, adjacency);

        const order = state.military.brigade_movement_orders?.['brig_1'];
        expect(order).toBeDefined();
        expect(order.destination_sids).toHaveLength(1);
        expect(order.stance).toBe('column');
    });
});
