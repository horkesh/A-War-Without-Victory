import { describe, expect, it } from 'vitest';
import { consolidateRearPockets } from '../src/sim/combat/rear_pocket_consolidation.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { GameState } from '../src/state/game_state.js';

const POCKET = 'op:a_test:donji_koricani';
const RS_RING = Array.from({ length: 10 }, (_, index) => `op:z_test:rs_${index}`);
const RBIH_RING = 'op:z_test:rbih_0';

function makeEdges(): EdgeRecord[] {
    return [
        ...[...RS_RING, RBIH_RING].map((osid) => ({ a: POCKET, b: osid } as EdgeRecord)),
        ...RS_RING.slice(0, -1).map((osid, index) => ({
            a: osid,
            b: RS_RING[index + 1]!,
        } as EdgeRecord)),
    ];
}

function makeState(options: {
    rsBrigade?: boolean;
    pocketBrigade?: boolean;
    supply?: 'adequate' | 'critical';
} = {}): GameState {
    const politicalControllers: Record<string, 'RS' | 'RBiH' | 'HRHB'> = {
        [POCKET]: 'HRHB',
        [RBIH_RING]: 'RBiH',
    };
    for (const osid of RS_RING) politicalControllers[osid] = 'RS';

    const formations: Record<string, unknown> = {
        rbih_boundary_brigade: {
            id: 'rbih_boundary_brigade', faction: 'RBiH', kind: 'brigade', status: 'active',
            location_osid: RBIH_RING,
        },
    };
    if (options.rsBrigade !== false) {
        formations.rs_ring_brigade = {
            id: 'rs_ring_brigade', faction: 'RS', kind: 'brigade', status: 'active',
            location_osid: RS_RING[0],
        };
    }
    if (options.pocketBrigade) {
        formations.hrhb_pocket_brigade = {
            id: 'hrhb_pocket_brigade', faction: 'HRHB', kind: 'brigade', status: 'active',
            location_osid: POCKET,
        };
    }

    return {
        meta: { turn: 32, phase: 'war', seed: 'rear-pocket-abandonment' },
        factions: [{ id: 'RS' }, { id: 'RBiH' }, { id: 'HRHB' }],
        military: { formations },
        political: {
            political_controllers: politicalControllers,
            control_events: [],
            last_supply_state_by_osid: { [POCKET]: options.supply ?? 'critical' },
        },
        displacement: { hostile_takeover_timers: {} },
    } as unknown as GameState;
}

describe('rear-pocket abandonment', () => {
    it('transfers an empty critical mixed-ring pocket to the dominant adjacent hostile force', () => {
        const state = makeState();

        const report = consolidateRearPockets(state, makeEdges(), new Map());

        expect(report.flipped).toContainEqual({ osid: POCKET, from: 'HRHB', to: 'RS' });
        expect(state.political.political_controllers?.[POCKET]).toBe('RS');
        expect(state.political.control_events).toContainEqual(expect.objectContaining({
            settlement_id: POCKET,
            mechanism: 'abandoned',
            from: 'HRHB',
            to: 'RS',
        }));
    });

    it('does not transfer the pocket without an adjacent organized claimant force', () => {
        const state = makeState({ rsBrigade: false });

        const report = consolidateRearPockets(state, makeEdges(), new Map());

        expect(report.total_flipped).toBe(0);
        expect(state.political.political_controllers?.[POCKET]).toBe('HRHB');
    });

    it('does not transfer a pocket whose physical supply is not critical', () => {
        const state = makeState({ supply: 'adequate' });

        const report = consolidateRearPockets(state, makeEdges(), new Map());

        expect(report.total_flipped).toBe(0);
        expect(state.political.political_controllers?.[POCKET]).toBe('HRHB');
    });

    it('does not transfer a pocket containing an active defending brigade', () => {
        const state = makeState({ pocketBrigade: true });

        const report = consolidateRearPockets(state, makeEdges(), new Map());

        expect(report.total_flipped).toBe(0);
        expect(state.political.political_controllers?.[POCKET]).toBe('HRHB');
    });

    it('is invariant to contact-edge input order', () => {
        const forwardState = makeState();
        const reverseState = makeState();

        const forward = consolidateRearPockets(forwardState, makeEdges(), new Map());
        const reverse = consolidateRearPockets(reverseState, makeEdges().reverse(), new Map());

        expect(reverse).toEqual(forward);
        expect(reverseState.political.control_events).toEqual(forwardState.political.control_events);
    });
});
