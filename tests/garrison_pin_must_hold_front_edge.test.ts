/**
 * Tests for pinGarrisonToMustHoldFrontEdge (exercised via distributeBrigadesToFront).
 *
 * The pin places ONE idle, same-corps, >=400-pers brigade onto each friendly,
 * currently-undefended scenario-authored must-hold OSID. These tests assert each
 * of the 7 strict guards plus determinism.
 *
 * Faction-agnostic; deterministic (no Math.random / Date.now).
 */
import { describe, it, expect } from 'vitest';
import { distributeBrigadesToFront } from '../src/sim/combat/brigade_front_distribution.js';
import { makeAdjacency } from './_helpers/adjacency.js';

const MUST_HOLD = 'op:zvornik:zvornik';
const NEAR = 'op:zvornik:kozluk_2';   // adjacent to MUST_HOLD
const FAR = 'op:zvornik:far_rear';    // 1 hop from NEAR (2 hops from MUST_HOLD)
const CORPS = 'vrs_drina';

/**
 * Build a state where:
 *  - MUST_HOLD, NEAR, FAR are all RS-controlled (friendly).
 *  - The corps owns those OSIDs via a sector (so corps-boundary BFS resolves).
 *  - must_hold_osids_by_corps[CORPS] = [MUST_HOLD].
 */
function makeState(
    formations: Record<string, any>,
    opts: { mustHold?: Record<string, string[]>; controllers?: Record<string, string> } = {},
): any {
    return {
        military: {
            formations,
            brigade_movement_orders: {},
            brigade_movement_state: {},
            must_hold_osids_by_corps: opts.mustHold ?? { [CORPS]: [MUST_HOLD] },
            corps_front_sectors: {
                'sector:vrs_drina:0': {
                    corps_id: CORPS,
                    faction: 'RS',
                    sector_id: 'sector:vrs_drina:0',
                    territory_osids: [MUST_HOLD, NEAR, FAR],
                    assigned_brigade_ids: [],
                    reserve_brigade_ids: [],
                    sub_segments: [],
                },
            },
        },
        political: {
            political_controllers: opts.controllers ?? {
                [MUST_HOLD]: 'RS',
                [NEAR]: 'RS',
                [FAR]: 'RS',
            },
        },
    };
}

function makeBrigade(overrides: Partial<any> = {}): any {
    return {
        kind: 'brigade',
        status: 'active',
        faction: 'RS',
        corps_id: CORPS,
        location_osid: NEAR,
        personnel: 1000,
        entrenchment_turns: 0,
        disrupted_turns: 0,
        ...overrides,
    };
}

const ADJ = makeAdjacency([
    [MUST_HOLD, NEAR],
    [NEAR, FAR],
]);

// No sub-segments with >1 friendly OSID on the pin sector, so only the pin acts.
const NO_OP_SECTORS: any[] = [];

describe('pinGarrisonToMustHoldFrontEdge', () => {
    it('pins an idle same-corps >=400 brigade onto an undefended must-hold OSID (adjacent → direct move)', () => {
        const state = makeState({
            reserve_brig: makeBrigade({ location_osid: NEAR }),
        });
        distributeBrigadesToFront(state, NO_OP_SECTORS, ADJ);
        expect(state.military.formations.reserve_brig.location_osid).toBe(MUST_HOLD);
        expect(state.military.formations.reserve_brig.entrenchment_turns).toBe(0);
    });

    it('issues a column march when the candidate is >1 hop from the must-hold OSID', () => {
        const state = makeState({
            reserve_brig: makeBrigade({ location_osid: FAR }),
        });
        distributeBrigadesToFront(state, NO_OP_SECTORS, ADJ);
        // Not moved directly; a movement order toward MUST_HOLD is issued.
        expect(state.military.formations.reserve_brig.location_osid).toBe(FAR);
        expect(state.military.brigade_movement_orders.reserve_brig).toBeTruthy();
    });

    // Guard 1: scoped to must_hold_osids_by_corps ONLY — no must-hold ⇒ no-op.
    it('GUARD 1: does nothing when must_hold_osids_by_corps is absent', () => {
        const state = makeState(
            { reserve_brig: makeBrigade({ location_osid: NEAR }) },
            { mustHold: undefined as any },
        );
        delete state.military.must_hold_osids_by_corps;
        distributeBrigadesToFront(state, NO_OP_SECTORS, ADJ);
        expect(state.military.formations.reserve_brig.location_osid).toBe(NEAR);
        expect(state.military.brigade_movement_orders.reserve_brig).toBeFalsy();
    });

    // Guard 2: corps-gated — a brigade from a different corps is NOT pinned.
    it('GUARD 2: does not pin a brigade belonging to a different corps', () => {
        const state = makeState({
            other_corps_brig: makeBrigade({ location_osid: NEAR, corps_id: 'vrs_east_bosnian' }),
        });
        distributeBrigadesToFront(state, NO_OP_SECTORS, ADJ);
        expect(state.military.formations.other_corps_brig.location_osid).toBe(NEAR);
        expect(state.military.brigade_movement_orders.other_corps_brig).toBeFalsy();
    });

    // Guard 3: idle-only — an operation participant is NOT pinned.
    it('GUARD 3: does not pin a brigade participating in an active operation', () => {
        const state = makeState({
            busy_brig: makeBrigade({ location_osid: NEAR }),
            // Op participation is declared on a corps_asset holder (how the engine
            // tracks operation rosters); busy_brig is listed as a participant.
            op_holder: {
                kind: 'corps_asset',
                status: 'active',
                faction: 'RS',
                corps_id: CORPS,
                active_operations: [{ participating_brigades: ['busy_brig'], axes: [] }],
            },
        });
        distributeBrigadesToFront(state, NO_OP_SECTORS, ADJ);
        expect(state.military.formations.busy_brig.location_osid).toBe(NEAR);
        expect(state.military.brigade_movement_orders.busy_brig).toBeFalsy();
    });

    // Guard 4: >=400 personnel — a sub-threshold brigade is NOT pinned.
    it('GUARD 4: does not pin a brigade below the personnel floor', () => {
        const state = makeState({
            tiny_brig: makeBrigade({ location_osid: NEAR, personnel: 399 }),
        });
        distributeBrigadesToFront(state, NO_OP_SECTORS, ADJ);
        expect(state.military.formations.tiny_brig.location_osid).toBe(NEAR);
        expect(state.military.brigade_movement_orders.tiny_brig).toBeFalsy();
    });

    it('GUARD 4 boundary: pins a brigade with exactly 400 personnel', () => {
        const state = makeState({
            edge_brig: makeBrigade({ location_osid: NEAR, personnel: 400 }),
        });
        distributeBrigadesToFront(state, NO_OP_SECTORS, ADJ);
        expect(state.military.formations.edge_brig.location_osid).toBe(MUST_HOLD);
    });

    // Lane-3 (b) 2026-06-09: the entrenchment exclusion was DROPPED for the must-hold
    // backfill. When a must-hold OSID has ZERO active defenders it is the corps's highest
    // priority, so an entrenched same-corps reserve IS now eligible to re-garrison it.
    // (Phase-A front dispersion still respects ENTRENCHMENT_REDISTRIBUTION_THRESHOLD.)
    it('LANE-3 b: an entrenched candidate IS pinned to an undefended must-hold OSID', () => {
        const state = makeState({
            dug_in_brig: makeBrigade({ location_osid: NEAR, entrenchment_turns: 5 }),
        });
        distributeBrigadesToFront(state, NO_OP_SECTORS, ADJ);
        // NEAR is adjacent to MUST_HOLD (dist ≤ 1) ⇒ direct relocation onto the objective.
        expect(state.military.formations.dug_in_brig.location_osid).toBe(MUST_HOLD);
        expect(state.military.formations.dug_in_brig.entrenchment_turns).toBe(0);
    });

    // Guard 6a: must-hold OSID already defended (>=1 active occupant) ⇒ no pin.
    it('GUARD 6: does not pin when the must-hold OSID is already defended', () => {
        const state = makeState({
            garrison_brig: makeBrigade({ location_osid: MUST_HOLD }),
            spare_brig: makeBrigade({ location_osid: NEAR }),
        });
        distributeBrigadesToFront(state, NO_OP_SECTORS, ADJ);
        // spare_brig should NOT be pulled onto an already-defended OSID.
        expect(state.military.formations.spare_brig.location_osid).toBe(NEAR);
        expect(state.military.brigade_movement_orders.spare_brig).toBeFalsy();
        expect(state.military.formations.garrison_brig.location_osid).toBe(MUST_HOLD);
    });

    // Guard 6b: must-hold OSID controlled by the enemy ⇒ no pin (engine never
    // marches a garrison brigade into enemy-held territory via this lane).
    it('GUARD 6: does not pin when the must-hold OSID is enemy-controlled', () => {
        const state = makeState(
            { reserve_brig: makeBrigade({ location_osid: NEAR }) },
            {
                controllers: { [MUST_HOLD]: 'RBiH', [NEAR]: 'RS', [FAR]: 'RS' },
            },
        );
        distributeBrigadesToFront(state, NO_OP_SECTORS, ADJ);
        expect(state.military.formations.reserve_brig.location_osid).toBe(NEAR);
        expect(state.military.brigade_movement_orders.reserve_brig).toBeFalsy();
    });

    // Guard 3 (disrupted) + in-transit exclusions.
    it('GUARD: does not pin a disrupted or in-transit brigade', () => {
        const state = makeState({
            disrupted_brig: makeBrigade({ location_osid: NEAR, disrupted_turns: 2 }),
        });
        distributeBrigadesToFront(state, NO_OP_SECTORS, ADJ);
        expect(state.military.formations.disrupted_brig.location_osid).toBe(NEAR);

        const state2 = makeState({
            transit_brig: makeBrigade({ location_osid: NEAR }),
        });
        state2.military.brigade_movement_state.transit_brig = { status: 'in_transit' };
        distributeBrigadesToFront(state2, NO_OP_SECTORS, ADJ);
        expect(state2.military.formations.transit_brig.location_osid).toBe(NEAR);
    });

    // Guard 7: deterministic — among equal-distance, equal-personnel candidates,
    // the lexicographically-first brigade id is chosen, and only ONE is pinned.
    it('GUARD 7: deterministic single-brigade selection (tie-break by bid)', () => {
        const state = makeState({
            brig_c: makeBrigade({ location_osid: NEAR, personnel: 1000 }),
            brig_a: makeBrigade({ location_osid: NEAR, personnel: 1000 }),
            brig_b: makeBrigade({ location_osid: NEAR, personnel: 1000 }),
        });
        distributeBrigadesToFront(state, NO_OP_SECTORS, ADJ);
        const onMustHold = ['brig_a', 'brig_b', 'brig_c']
            .filter((b) => state.military.formations[b].location_osid === MUST_HOLD);
        expect(onMustHold).toEqual(['brig_a']); // lexicographically first, exactly one
    });

    // Codex #279 — garrison double-use: a single idle brigade must satisfy at
    // most ONE must-hold OSID per pass. The direct-move branch (dist<=1) used to
    // leave no movement marker, so the same brigade could be pinned to multiple
    // undefended must-hold OSIDs. With one idle brigade and two undefended
    // adjacent must-hold OSIDs, exactly one is garrisoned by it; the other
    // remains undefended (it needs a different brigade).
    it('does not let one brigade satisfy two must-hold OSIDs (direct-move branch)', () => {
        const SECOND = 'op:zvornik:second_hold'; // also adjacent to NEAR → dist 1
        const ADJ2 = makeAdjacency([
            [MUST_HOLD, NEAR],
            [SECOND, NEAR],
            [NEAR, FAR],
        ]);
        // Single idle brigade at NEAR (adjacent to both must-hold OSIDs).
        const state = makeState(
            { lone_brig: makeBrigade({ location_osid: NEAR }) },
            {
                mustHold: { [CORPS]: [MUST_HOLD, SECOND] },
                controllers: {
                    [MUST_HOLD]: 'RS',
                    [SECOND]: 'RS',
                    [NEAR]: 'RS',
                    [FAR]: 'RS',
                },
            },
        );
        // Register SECOND in the sector territory so corps-boundary BFS resolves.
        state.military.corps_front_sectors['sector:vrs_drina:0'].territory_osids = [
            MUST_HOLD, SECOND, NEAR, FAR,
        ];
        distributeBrigadesToFront(state, NO_OP_SECTORS, ADJ2);

        // The lone brigade lands on exactly ONE must-hold OSID — the
        // strictCompare-first target, which is SECOND ('op:zvornik:second_hold'
        // sorts before 'op:zvornik:zvornik') — and is NOT also given a movement
        // order toward the other must-hold OSID (the pre-fix bug: the direct-move
        // branch left no marker, so the same brigade got an order to MUST_HOLD).
        expect(state.military.formations.lone_brig.location_osid).toBe(SECOND);
        expect(state.military.brigade_movement_orders.lone_brig).toBeFalsy();
        // The other must-hold OSID is left for a DIFFERENT brigade (undefended here).
        const onMustHold = Object.values(state.military.formations)
            .filter((f: any) => f.location_osid === MUST_HOLD);
        expect(onMustHold).toHaveLength(0);
    });

    it('GUARD 7: prefers the closest candidate, then highest personnel', () => {
        const state = makeState({
            far_big: makeBrigade({ location_osid: FAR, personnel: 5000 }),
            near_small: makeBrigade({ location_osid: NEAR, personnel: 500 }),
        });
        distributeBrigadesToFront(state, NO_OP_SECTORS, ADJ);
        // near_small is 1 hop (adjacent) vs far_big at 2 hops → near wins on distance.
        expect(state.military.formations.near_small.location_osid).toBe(MUST_HOLD);
        expect(state.military.formations.far_big.location_osid).toBe(FAR);
    });
});
