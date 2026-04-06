/**
 * Seam A isolation guard tests.
 *
 * Tests the island-exclusion logic in:
 *   - brigade_front_distribution.ts (Phase B march order issuance)
 *   - commander_march_correction.ts (correctTransitStates cancellation)
 *
 * An "island" OSID has zero friendly-controlled neighbors — marching a brigade
 * there strands it with no supply line and no relief path.
 */

import { describe, expect, it } from 'vitest';
import { distributeBrigadesToFront } from '../src/sim/combat/brigade_front_distribution.js';
import { correctTransitStates } from '../src/sim/combat/commander_march_correction.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

// ── Minimal state builder ──────────────────────────────────────────────────

function makeState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 10, seed: 'seam-a-test', phase: 'war' } as any,
        factions: [] as any,
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            corps_front_sectors: {},
            brigade_movement_orders: {},
            brigade_movement_state: {},
        } as any,
        political: {
            political_controllers: {} as Record<string, string>,
        } as any,
        displacement: {} as any,
    } as GameState;
}

/**
 * Build a minimal CorpsFrontSector for testing.
 * frontOsids = the sub-segment's friendly_osids list.
 * primaryBrigades = brigade IDs assigned to this sub-segment.
 */
function makeSector(
    sectorId: string,
    faction: string,
    frontOsids: string[],
    primaryBrigades: string[],
) {
    return {
        sector_id: sectorId,
        corps_id: `${faction}_corps`,
        faction,
        territory_osids: frontOsids,
        sub_segments: [
            {
                sub_segment_id: `${sectorId}_ss1`,
                friendly_osids: frontOsids,
                primary_brigade_ids: primaryBrigades,
                hostile_osids: [],
            },
        ],
    } as any;
}

// ── Phase B: distributeBrigadesToFront isolation guard ─────────────────────

describe('Phase B isolation guard (distributeBrigadesToFront)', () => {
    it('island candidate is excluded — no march order issued', () => {
        const state = makeState();

        // Topology:
        //   rear_osid (RBiH) → island_front (RBiH)
        //   island_front has neighbors: [enemy_osid] — no RBiH neighbor
        // Brigade is at rear_osid. The only front OSID is island_front.
        // After island guard, effectiveFrontOsids = [] → brigade stays, no march.

        state.political!.political_controllers = {
            'rear_osid': 'RBiH',
            'island_front': 'RBiH',
            'enemy_osid': 'RS',
        } as any;

        state.military.formations = {
            brig1: {
                id: 'brig1',
                faction: 'RBiH',
                corps_id: 'RBiH_corps',
                status: 'active',
                kind: 'brigade',
                location_osid: 'rear_osid',
                assigned_sub_segment_id: 'sector1_ss1',
                disrupted_turns: 0,
                entrenchment_turns: 0,
            } as any,
        };

        const sector = makeSector('sector1', 'RBiH', ['island_front'], ['brig1']);
        state.military.corps_front_sectors = { sector1: sector };

        // Adjacency: island_front's only neighbor is enemy_osid (not RBiH-controlled)
        const adjacency = new Map<string, string[]>([
            ['rear_osid', ['island_front']],
            ['island_front', ['enemy_osid']],   // 0 RBiH neighbors
            ['enemy_osid', ['island_front']],
        ]);

        // front has only 1 OSID — Phase A is skipped (requires >1). Phase B runs.
        // But we want to confirm Phase B also skips when island guard triggers.
        // Use 2 front OSIDs so Phase B runs: add a second candidate that is also an island.
        const sector2 = makeSector('sector1', 'RBiH', ['island_front', 'island_front2'], ['brig1']);
        state.political!.political_controllers = {
            'rear_osid': 'RBiH',
            'island_front': 'RBiH',
            'island_front2': 'RBiH',
            'enemy_osid': 'RS',
        } as any;
        state.military.corps_front_sectors = { sector1: sector2 };

        const adj2 = new Map<string, string[]>([
            ['rear_osid', ['island_front', 'island_front2']],
            ['island_front', ['enemy_osid']],    // 0 RBiH neighbors
            ['island_front2', ['enemy_osid']],   // 0 RBiH neighbors
            ['enemy_osid', ['island_front', 'island_front2']],
        ]);

        distributeBrigadesToFront(state, [sector2], adj2);

        // No march order should be issued — all candidates are islands
        const order = state.military.brigade_movement_orders?.['brig1'];
        expect(order).toBeUndefined();
    });

    it('non-island candidate is allowed — brigade advances toward front', () => {
        const state = makeState();

        // Topology:
        //   deep_rear → mid_osid → front_osid (RBiH neighbor: mid_osid)
        //                       → front_osid2 (RBiH neighbor: mid_osid)
        // Brigade at deep_rear. front OSIDs are non-islands (mid_osid is RBiH).
        // dist from deep_rear to front_osid = 2, so march order is issued (not direct teleport).
        state.political!.political_controllers = {
            'deep_rear': 'RBiH',
            'mid_osid': 'RBiH',
            'front_osid': 'RBiH',
            'front_osid2': 'RBiH',
            'enemy_osid': 'RS',
        } as any;

        state.military.formations = {
            brig1: {
                id: 'brig1',
                faction: 'RBiH',
                corps_id: 'RBiH_corps',
                status: 'active',
                kind: 'brigade',
                location_osid: 'deep_rear',
                assigned_sub_segment_id: 'sector1_ss1',
                disrupted_turns: 0,
                entrenchment_turns: 0,
            } as any,
        };

        // Include mid_osid and deep_rear in territory_osids so corps boundary includes them
        const sector: any = {
            sector_id: 'sector1',
            corps_id: 'RBiH_corps',
            faction: 'RBiH',
            territory_osids: ['deep_rear', 'mid_osid', 'front_osid', 'front_osid2'],
            sub_segments: [{
                sub_segment_id: 'sector1_ss1',
                friendly_osids: ['front_osid', 'front_osid2'],
                primary_brigade_ids: ['brig1'],
                hostile_osids: [],
            }],
        };
        state.military.corps_front_sectors = { sector1: sector };

        // front_osid has RBiH neighbor (mid_osid) → not an island
        const adjacency = new Map<string, string[]>([
            ['deep_rear', ['mid_osid']],
            ['mid_osid', ['deep_rear', 'front_osid', 'front_osid2']],
            ['front_osid', ['mid_osid', 'enemy_osid']],    // mid_osid is RBiH → passes guard
            ['front_osid2', ['mid_osid', 'enemy_osid']],
            ['enemy_osid', ['front_osid', 'front_osid2']],
        ]);

        distributeBrigadesToFront(state, [sector], adjacency);

        // Brigade should either have a march order OR have moved directly (dist=1 teleport).
        // dist(deep_rear → front_osid) = 2, so march order path is taken.
        const order = state.military.brigade_movement_orders?.['brig1'];
        const newLoc = state.military.formations['brig1']?.location_osid;
        const advanced = (order !== undefined) || (newLoc === 'front_osid' || newLoc === 'front_osid2');
        expect(advanced).toBe(true);
    });

    it('all candidates are islands — no march order issued for any brigade', () => {
        const state = makeState();

        state.political!.political_controllers = {
            'rear_a': 'RBiH',
            'rear_b': 'RBiH',
            'island1': 'RBiH',
            'island2': 'RBiH',
            'enemy': 'RS',
        } as any;

        state.military.formations = {
            brigA: {
                id: 'brigA', faction: 'RBiH', corps_id: 'RBiH_corps',
                status: 'active', kind: 'brigade',
                location_osid: 'rear_a', assigned_sub_segment_id: 'sector1_ss1',
                disrupted_turns: 0, entrenchment_turns: 0,
            } as any,
            brigB: {
                id: 'brigB', faction: 'RBiH', corps_id: 'RBiH_corps',
                status: 'active', kind: 'brigade',
                location_osid: 'rear_b', assigned_sub_segment_id: 'sector1_ss1',
                disrupted_turns: 0, entrenchment_turns: 0,
            } as any,
        };

        const sector = makeSector('sector1', 'RBiH', ['island1', 'island2'], ['brigA', 'brigB']);
        state.military.corps_front_sectors = { sector1: sector };

        const adjacency = new Map<string, string[]>([
            ['rear_a', ['island1']],
            ['rear_b', ['island2']],
            ['island1', ['enemy']],   // 0 RBiH neighbors
            ['island2', ['enemy']],   // 0 RBiH neighbors
            ['enemy', ['island1', 'island2']],
        ]);

        distributeBrigadesToFront(state, [sector], adjacency);

        expect(state.military.brigade_movement_orders?.['brigA']).toBeUndefined();
        expect(state.military.brigade_movement_orders?.['brigB']).toBeUndefined();
    });

    it('mixed candidates — brigade advances toward safe_osid, never toward island_osid', () => {
        const state = makeState();

        // Topology:
        //   deep_rear → mid_osid → safe_osid (has mid_osid as RBiH neighbor → NOT an island)
        //                       → island_osid (neighbors = [enemy] only → island, excluded)
        // Brigade at deep_rear (dist=2 to both front OSIDs → march order issued, not teleport).
        state.political!.political_controllers = {
            'deep_rear': 'RBiH',
            'mid_osid': 'RBiH',
            'safe_osid': 'RBiH',
            'island_osid': 'RBiH',
            'enemy': 'RS',
        } as any;

        state.military.formations = {
            brig1: {
                id: 'brig1', faction: 'RBiH', corps_id: 'RBiH_corps',
                status: 'active', kind: 'brigade',
                location_osid: 'deep_rear', assigned_sub_segment_id: 'sector1_ss1',
                disrupted_turns: 0, entrenchment_turns: 0,
            } as any,
        };

        const sector: any = {
            sector_id: 'sector1',
            corps_id: 'RBiH_corps',
            faction: 'RBiH',
            territory_osids: ['deep_rear', 'mid_osid', 'safe_osid', 'island_osid'],
            sub_segments: [{
                sub_segment_id: 'sector1_ss1',
                friendly_osids: ['safe_osid', 'island_osid'],
                primary_brigade_ids: ['brig1'],
                hostile_osids: [],
            }],
        };
        state.military.corps_front_sectors = { sector1: sector };

        const adjacency = new Map<string, string[]>([
            ['deep_rear', ['mid_osid']],
            ['mid_osid', ['deep_rear', 'safe_osid', 'island_osid']],
            ['safe_osid', ['mid_osid', 'enemy']],    // mid_osid is RBiH → NOT an island
            ['island_osid', ['enemy']],              // 0 RBiH neighbors → island, excluded
            ['enemy', ['safe_osid', 'island_osid']],
        ]);

        distributeBrigadesToFront(state, [sector], adjacency);

        // Brigade must NOT be directed to island_osid in any form
        const order = state.military.brigade_movement_orders?.['brig1'];
        const newLoc = state.military.formations['brig1']?.location_osid;

        // island_osid must never be a destination
        expect(order?.destination_sids?.[0]).not.toBe('island_osid');
        expect(newLoc).not.toBe('island_osid');

        // Brigade should have advanced (march order or direct move to safe_osid)
        const advanced = (order?.destination_sids?.[0] === 'safe_osid') ||
                         (newLoc === 'safe_osid') ||
                         (order !== undefined);
        expect(advanced).toBe(true);
    });
});

// ── correctTransitStates isolation guard ──────────────────────────────────

describe('correctTransitStates isolation guard (commander_march_correction)', () => {
    it('in-transit to island destination — transit is cancelled', () => {
        const state = makeState();

        // Brigade in transit to island_dest. island_dest has 0 RBiH neighbors.
        state.political!.political_controllers = {
            'current_loc': 'RBiH',
            'island_dest': 'RBiH',
            'enemy': 'RS',
        } as any;

        state.military.formations = {
            brig1: {
                id: 'brig1', faction: 'RBiH',
                status: 'active', kind: 'brigade',
                location_osid: 'current_loc',
                assigned_sub_segment_id: 'sector1_ss1',
            } as any,
        };

        // Sub-segment has island_dest as a front OSID
        state.military.corps_front_sectors = {
            sector1: makeSector('sector1', 'RBiH', ['island_dest'], ['brig1']),
        };

        // Brigade is in transit to island_dest
        state.military.brigade_movement_state = {
            brig1: {
                status: 'in_transit',
                destination_sids: ['island_dest'],
                stance: 'column',
                turns_in_transit: 2,
                total_turns_required: 5,
            } as any,
        };

        const adjacency = new Map<string, string[]>([
            ['current_loc', ['island_dest']],
            ['island_dest', ['enemy']],   // 0 RBiH neighbors → isolated
            ['enemy', ['island_dest']],
        ]);

        correctTransitStates(state, adjacency);

        // Transit should be cancelled (deleted)
        expect(state.military.brigade_movement_state?.['brig1']).toBeUndefined();
    });

    it('in-transit to valid destination — transit continues unchanged', () => {
        const state = makeState();

        // Brigade in transit to valid_dest. valid_dest has current_loc as RBiH neighbor.
        state.political!.political_controllers = {
            'current_loc': 'RBiH',
            'valid_dest': 'RBiH',
            'enemy': 'RS',
        } as any;

        state.military.formations = {
            brig1: {
                id: 'brig1', faction: 'RBiH',
                status: 'active', kind: 'brigade',
                location_osid: 'current_loc',
                assigned_sub_segment_id: 'sector1_ss1',
            } as any,
        };

        state.military.corps_front_sectors = {
            sector1: makeSector('sector1', 'RBiH', ['valid_dest'], ['brig1']),
        };

        state.military.brigade_movement_state = {
            brig1: {
                status: 'in_transit',
                destination_sids: ['valid_dest'],
                stance: 'column',
                turns_in_transit: 2,
                total_turns_required: 5,
            } as any,
        };

        const adjacency = new Map<string, string[]>([
            ['current_loc', ['valid_dest']],
            ['valid_dest', ['current_loc', 'enemy']],   // current_loc is RBiH → NOT isolated
            ['enemy', ['valid_dest']],
        ]);

        correctTransitStates(state, adjacency);

        // Transit should remain intact
        const ts = state.military.brigade_movement_state?.['brig1'];
        expect(ts).toBeDefined();
        expect(ts?.status).toBe('in_transit');
        expect(ts?.destination_sids?.[0]).toBe('valid_dest');
    });
});
