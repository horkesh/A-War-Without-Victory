/**
 * Package "1994-95 attack and defence" P2, orchestrator ruling D (2026-11-17): the cause of the weak
 * Ozren line (Donja Bočinja). Each fix is pinned by a test that failed before it.
 *  Q3. A brigade that left the front while dug in stands down. Off the front `applyPostureOrders`
 *      rejected every posture change, so a dug-in brigade reclassified to reserve or rear kept
 *      `dig_in` for good and every later multi-hop column order to it died at the dig_in lockout.
 *      The posture pass now returns it to `defend` unless it is in a live operation.
 *  P3. Front distribution spread only brigades on their arrival turn, so a stack that survived one
 *      turn was permanent beside empty front cells. A brigade that is surplus on its cell (another
 *      staying brigade outranks it) may now spread to an adjacent empty front cell.
 */
import { describe, expect, it } from 'vitest';

import { applyPostureCosts, applyPostureOrders } from '../src/sim/combat/brigade_posture.js';
import { distributeBrigadesToFront } from '../src/sim/combat/brigade_front_distribution.js';
import { collectSectorDefenseBrigades } from '../src/sim/combat/sector_defense_roster.js';
import type { CorpsFrontSector, FactionId, FormationState, GameState } from '../src/state/game_state.js';

const brigade = (id: string, faction: FactionId, loc: string, extra: Partial<FormationState> = {}): FormationState => ({
    id, faction, name: id, created_turn: 0, status: 'active', assignment: null, kind: 'brigade',
    personnel: 1500, cohesion: 40, tags: [], location_osid: loc, home_osid: loc, hq_sid: 'S1',
    ...extra,
} as FormationState);

describe('Ruling D, Q3: an off-front brigade stands down from a stale dig_in', () => {
    const offFront = (posture: string, order?: string, onFront = false): GameState => ({
        meta: { turn: 120, phase: 'war' },
        factions: [{ id: 'RS' }],
        military: {
            formations: {
                rs_rear: brigade('rs_rear', 'RS', 'op:mun:rear', { posture, dig_in_progress: 1, corps_id: 'corps_1' } as any),
            },
            brigade_posture_orders: order ? [{ brigade_id: 'rs_rear', posture: order }] : [],
            // Off the front: no sector assigns it (unless the case says it is on the line).
            corps_front_sectors: onFront
                ? { sec: { sector_id: 'sec', corps_id: 'corps_1', faction: 'RS', assigned_brigade_ids: ['rs_rear'], reserve_brigade_ids: [], sub_segments: [] } }
                : {},
        },
        political: { political_controllers: {} },
    } as unknown as GameState);

    it('a dug-in off-front brigade stands down to defend on the posture pass, no order needed', () => {
        const s = offFront('dig_in');
        applyPostureCosts(s);
        expect(s.military.formations.rs_rear!.posture).toBe('defend');
        expect((s.military.formations.rs_rear as any).dig_in_progress).toBe(0);
    });

    it('a dug-in participant of a live operation keeps dig_in (an emergent op must leave it put)', () => {
        const s = offFront('dig_in');
        (s.military as any).corps_command = {
            corps_1: { active_operations: [{ name: 'Emergent', type: 'sector_attack', phase: 'planning', participating_brigades: ['rs_rear'] }] },
        };
        applyPostureCosts(s);
        expect(s.military.formations.rs_rear!.posture).toBe('dig_in');
    });

    it('a dug-in brigade on the line keeps dig_in', () => {
        const s = offFront('dig_in', undefined, true);
        applyPostureCosts(s);
        expect(s.military.formations.rs_rear!.posture).toBe('dig_in');
    });

    it('an off-front brigade that is not dug in keeps its posture', () => {
        const s = offFront('hold');
        applyPostureCosts(s);
        expect(s.military.formations.rs_rear!.posture).toBe('hold');
    });

    it('off the front an ordered posture change is still rejected', () => {
        const s = offFront('dig_in', 'attack');
        applyPostureOrders(s);
        expect(s.military.formations.rs_rear!.posture).toBe('dig_in');
    });
});

describe('Ruling D, step 3: a surplus brigade spreads from an entrenched stack', () => {
    // One sub-segment, front cells A-B (adjacent); E is enemy ground facing both.
    const edgeList: Array<[string, string]> = [['A', 'B'], ['A', 'E'], ['B', 'E']];
    const adjacency = (): Map<string, string[]> => {
        const adj = new Map<string, string[]>();
        for (const [a, b] of edgeList) {
            adj.set(a, [...(adj.get(a) ?? []), b].sort());
            adj.set(b, [...(adj.get(b) ?? []), a].sort());
        }
        return adj;
    };
    const stack = (a: Partial<FormationState>, b: Partial<FormationState>, extra: { participant?: string; leaving?: string } = {}): GameState => {
        const formations: Record<string, FormationState> = {
            bde_a: brigade('bde_a', 'RS', 'A', { corps_id: 'corps_1', entrenchment_turns: 6, personnel: 2000, ...a } as any),
            bde_b: brigade('bde_b', 'RS', 'A', { corps_id: 'corps_1', entrenchment_turns: 6, personnel: 1000, ...b } as any),
        };
        const sector = {
            sector_id: 'sec', corps_id: 'corps_1', faction: 'RS',
            sub_segments: [{ sub_segment_id: 'sec:0', friendly_osids: ['A', 'B'], enemy_osids: ['E'], primary_brigade_ids: ['bde_a', 'bde_b'] }],
            assigned_brigade_ids: ['bde_a', 'bde_b'], reserve_brigade_ids: [], rear_brigade_ids: [], territory_osids: ['A', 'B'],
        } as unknown as CorpsFrontSector;
        return {
            meta: { turn: 60, phase: 'war' },
            factions: [{ id: 'RS' }, { id: 'RBiH' }],
            military: {
                formations,
                corps_command: { corps_1: { active_operations: extra.participant ? [{ name: 'Op', type: 'sector_attack', phase: 'planning', participating_brigades: [extra.participant] }] : [] } },
                corps_front_sectors: { sec: sector },
                brigade_movement_orders: extra.leaving ? { [extra.leaving]: { destination_sids: ['E'] } } : {},
                front_pressure: {}, militia_pools: {},
            },
            political: { political_controllers: { A: 'RS', B: 'RS', E: 'RBiH' }, control_events: [] },
        } as unknown as GameState;
    };
    const spread = (s: GameState): void => {
        distributeBrigadesToFront(s, Object.values(s.military.corps_front_sectors!), adjacency(), {});
    };

    it('the weaker of two entrenched brigades on one cell takes the empty neighbour; the stronger holds', () => {
        const s = stack({}, {});
        spread(s);
        expect(s.military.formations.bde_a!.location_osid).toBe('A');
        expect(s.military.formations.bde_b!.location_osid).toBe('B');
        expect(s.military.formations.bde_b!.entrenchment_turns).toBe(0);
    });

    it('the more entrenched brigade holds even when it is smaller', () => {
        const s = stack({ entrenchment_turns: 3 }, { entrenchment_turns: 9 });
        spread(s);
        expect(s.military.formations.bde_b!.location_osid).toBe('A');
        expect(s.military.formations.bde_a!.location_osid).toBe('B');
    });

    it('nobody spreads when the other brigade on the cell is leaving with an operation', () => {
        const s = stack({}, {}, { participant: 'bde_a' });
        spread(s);
        expect(s.military.formations.bde_b!.location_osid).toBe('A');
    });

    it('nobody spreads when the other brigade on the cell has a movement order', () => {
        const s = stack({}, {}, { leaving: 'bde_a' });
        spread(s);
        expect(s.military.formations.bde_b!.location_osid).toBe('A');
    });

    it('a lone entrenched brigade never leaves its cell', () => {
        const s = stack({}, {});
        s.military.formations.bde_b!.location_osid = 'B';
        spread(s);
        expect(s.military.formations.bde_a!.location_osid).toBe('A');
        expect(s.military.formations.bde_b!.location_osid).toBe('B');
    });
});

describe('Ruling D, step 4: a cell on a same-corps sector seam is defended by both rosters', () => {
    // D is a front cell of sector s1 (corps_1) and of sector s0 (corps_1, or corps_2 when crossCorps).
    const roster = (crossCorps = false): string[] => {
        const formations: Record<string, FormationState> = {
            on_cell: brigade('on_cell', 'RS', 'D', { corps_id: 'corps_1' } as any),
            seam_mate: brigade('seam_mate', 'RS', 'P', { corps_id: crossCorps ? 'corps_2' : 'corps_1', personnel: 2800 } as any),
        };
        const sec = (id: string, corps: string, front: string[], assigned: string[]) => ({
            sector_id: id, corps_id: corps, faction: 'RS',
            sub_segments: [{ sub_segment_id: `${id}:0`, friendly_osids: front, enemy_osids: ['E'], primary_brigade_ids: assigned }],
            assigned_brigade_ids: assigned, reserve_brigade_ids: [], territory_osids: front,
        });
        const s = {
            meta: { turn: 104, phase: 'war' },
            factions: [{ id: 'RS' }, { id: 'RBiH' }],
            military: {
                formations,
                corps_front_sectors: {
                    s0: sec('s0', crossCorps ? 'corps_2' : 'corps_1', ['P', 'D'], ['seam_mate']),
                    s1: sec('s1', 'corps_1', ['D'], ['on_cell']),
                },
            },
            political: { political_controllers: { D: 'RS', P: 'RS', E: 'RBiH' } },
        } as unknown as GameState;
        const adjacency = new Map<string, string[]>([['D', ['E', 'P']], ['P', ['D']], ['E', ['D']]]);
        const sector = s.military.corps_front_sectors!.s1!;
        return collectSectorDefenseBrigades(s, sector, 'D', 'RS', adjacency, [s.military.formations.on_cell!]).map((f) => f.id);
    };

    it('the other same-corps sector fronting the cell adds its brigades', () => {
        expect(roster()).toEqual(['on_cell', 'seam_mate']);
    });

    it('another corps fronting the same cell does not', () => {
        expect(roster(true)).toEqual(['on_cell']);
    });
});
