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
 *  B.  The corps breach answer. After a fresh combat loss with no healthy brigade next to the lost
 *      cell, the corps sends its strongest spare brigade (never a lone holder) next to it, so the P2
 *      step-3 retake has someone in reach. Movement only.
 */
import { describe, expect, it } from 'vitest';

import { applyPostureCosts, applyPostureOrders } from '../src/sim/combat/brigade_posture.js';
import { distributeBrigadesToFront } from '../src/sim/combat/brigade_front_distribution.js';
import { isBreachAnswerDonor } from '../src/sim/combat/brigade_routine_scope.js';
import { collectSectorDefenseBrigades } from '../src/sim/combat/sector_defense_roster.js';
import { processOsidColumnMovement } from '../src/sim/combat/osid_column_movement.js';
import type { CorpsFrontSector, FactionId, FormationState, GameState } from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { OperationalToCanonicalReverseMap } from '../src/data/operational_data.js';
import type { TerrainScalarsData } from '../src/map/terrain_scalars.js';

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

describe('Ruling D, B: the corps breach answer', () => {
    // Front cells A-B-C of one sub-segment; X was lost in combat last turn and borders C only.
    // R is a rear cell two hops from C (R-B-C); E is enemy ground facing the line.
    const osids = ['A', 'B', 'C', 'X', 'R', 'E', 'Y'];
    const edgeList: Array<[string, string]> = [['A', 'B'], ['B', 'C'], ['C', 'X'], ['R', 'B'], ['A', 'E'], ['B', 'E'], ['X', 'E'], ['A', 'Y']];
    const edges = (): EdgeRecord[] => edgeList.map(([a, b]) => ({ a, b })) as unknown as EdgeRecord[];
    const adjacency = (): Map<string, string[]> => {
        const adj = new Map<string, string[]>();
        for (const [a, b] of edgeList) {
            adj.set(a, [...(adj.get(a) ?? []), b].sort());
            adj.set(b, [...(adj.get(b) ?? []), a].sort());
        }
        return adj;
    };
    const reverseMap = (): OperationalToCanonicalReverseMap => new Map(osids.map((o) => [o, [o]])) as any;
    const terrain = (): TerrainScalarsData => ({ by_sid: Object.fromEntries(osids.map((o) => [o, {}])) }) as any;

    type Opts = {
        faction?: FactionId; enemy?: FactionId; donorAt?: string; donorStacked?: boolean; weak?: boolean;
        retakerOnC?: boolean; secondLoss?: boolean; noLoss?: boolean; participant?: boolean; posture?: string;
        secondDonor?: boolean;
    };
    const state = (o: Opts = {}): GameState => {
        const f = o.faction ?? 'RS';
        const e = o.enemy ?? 'RBiH';
        const donorAt = o.donorAt ?? 'B';
        const formations: Record<string, FormationState> = {
            holder_a: brigade('holder_a', f, 'A', { corps_id: 'corps_1', personnel: 300, cohesion: 20, entrenchment_turns: 5 } as any),
            donor: brigade('donor', f, donorAt, {
                corps_id: 'corps_1', personnel: o.weak ? 400 : 2000, cohesion: 60, entrenchment_turns: 5,
                posture: o.posture ?? 'defend', dig_in_progress: 1,
            } as any),
        };
        if (o.donorStacked !== false) {
            formations.holder_b = brigade('holder_b', f, 'B', { corps_id: 'corps_1', personnel: 300, cohesion: 20, entrenchment_turns: 5 } as any);
        }
        if (o.retakerOnC) formations.retaker = brigade('retaker', f, 'C', { corps_id: 'corps_1', personnel: 1200, cohesion: 50, entrenchment_turns: 5 } as any);
        else formations.holder_c = brigade('holder_c', f, 'C', { corps_id: 'corps_1', personnel: 300, cohesion: 20, entrenchment_turns: 5 } as any);
        if (o.secondDonor) formations.donor2 = brigade('donor2', f, 'R', { corps_id: 'corps_1', personnel: 1800, cohesion: 60, entrenchment_turns: 5 } as any);
        const rearIds = Object.keys(formations).filter((id) => formations[id]!.location_osid === 'R').sort();
        const lineIds = Object.keys(formations).filter((id) => !rearIds.includes(id)).sort();
        const sector = {
            sector_id: 'sec', corps_id: 'corps_1', faction: f,
            sub_segments: [{ sub_segment_id: 'sec:0', friendly_osids: ['A', 'B', 'C'], enemy_osids: ['E', 'X', 'Y'], primary_brigade_ids: lineIds }],
            assigned_brigade_ids: lineIds,
            reserve_brigade_ids: rearIds, rear_brigade_ids: [], territory_osids: ['A', 'B', 'C', 'R'],
        } as unknown as CorpsFrontSector;
        const events = o.noLoss ? [] : [
            { turn: 49, settlement_id: 'X', from: f, to: e, mechanism: 'combat' },
            ...(o.secondLoss ? [{ turn: 49, settlement_id: 'Y', from: f, to: e, mechanism: 'combat' }] : []),
        ];
        return {
            meta: { turn: 50, phase: 'war' },
            factions: [{ id: f }, { id: e }],
            military: {
                formations,
                corps_command: { corps_1: { active_operations: o.participant ? [{ name: 'Op', type: 'sector_attack', phase: 'planning', participating_brigades: ['donor'] }] : [] } },
                corps_front_sectors: { sec: sector },
                brigade_movement_orders: {},
                front_pressure: {}, militia_pools: {},
            },
            political: {
                political_controllers: { A: f, B: f, C: f, R: f, X: e, E: e, Y: e },
                control_events: events,
            },
        } as unknown as GameState;
    };
    const answer = (s: GameState, breachAnswer = true): void => {
        distributeBrigadesToFront(s, Object.values(s.military.corps_front_sectors!), adjacency(), { breachAnswer });
    };

    it('a stacked spare brigade one hop away is placed next to the fresh loss', () => {
        const s = state();
        answer(s);
        expect(s.military.formations.donor!.location_osid).toBe('C');
    });

    it('does nothing unless the final pass asks for it', () => {
        const s = state();
        answer(s, false);
        expect(s.military.formations.donor!.location_osid).toBe('B');
    });

    it('the rule is the same for every faction', () => {
        for (const [faction, enemy] of [['RBiH', 'RS'], ['HRHB', 'RS']] as const) {
            const s = state({ faction, enemy });
            answer(s);
            expect(s.military.formations.donor!.location_osid).toBe('C');
        }
    });

    it('never strips a lone holder', () => {
        const s = state({ donorStacked: false });
        answer(s);
        expect(s.military.formations.donor!.location_osid).toBe('B');
    });

    it('does nothing when a healthy brigade already stands next to the lost cell', () => {
        const s = state({ retakerOnC: true });
        answer(s);
        expect(s.military.formations.donor!.location_osid).toBe('B');
    });

    it('does nothing without a fresh combat loss', () => {
        const s = state({ noLoss: true });
        answer(s);
        expect(s.military.formations.donor!.location_osid).toBe('B');
    });

    it('takes no brigade below the retake strength gates or in an operation', () => {
        const weak = state({ weak: true });
        answer(weak);
        expect(weak.military.formations.donor!.location_osid).toBe('B');
        const busy = state({ participant: true });
        answer(busy);
        expect(busy.military.formations.donor!.location_osid).toBe('B');
    });

    it('a rear donor two hops away gets an untagged column order to the cell next to the loss', () => {
        const s = state({ donorAt: 'R' });
        answer(s);
        expect(s.military.formations.donor!.location_osid).toBe('R');
        expect(s.military.brigade_movement_orders?.donor).toEqual({ destination_sids: ['C'], stance: 'column' });
    });

    it('answers one breach per corps per call, with the strongest donor', () => {
        const s = state({ donorAt: 'R', secondLoss: true, secondDonor: true });
        answer(s);
        expect(Object.keys(s.military.brigade_movement_orders ?? {})).toEqual(['donor']);
    });

    it('isBreachAnswerDonor: off the front or sharing a cell, never alone on a front cell', () => {
        const front = new Set(['A', 'B', 'C']);
        const stacked = state();
        expect(isBreachAnswerDonor(stacked, stacked.military.formations.donor!, front)).toBe(true);
        const alone = state({ donorStacked: false });
        expect(isBreachAnswerDonor(alone, alone.military.formations.donor!, front)).toBe(false);
        const rear = state({ donorAt: 'R' });
        expect(isBreachAnswerDonor(rear, rear.military.formations.donor!, front)).toBe(true);
    });

    it('the breach-answer march releases dig_in; without a fresh loss it does not', () => {
        const s = state({ donorAt: 'R', posture: 'dig_in' });
        s.military.brigade_movement_orders = { donor: { destination_sids: ['C'], stance: 'column' } } as any;
        const report = processOsidColumnMovement(s, edges(), reverseMap(), terrain());
        expect(report.column_blocked).toBe(0);
        expect(s.military.formations.donor!.posture).toBe('defend');

        const quiet = state({ donorAt: 'R', posture: 'dig_in', noLoss: true });
        quiet.military.brigade_movement_orders = { donor: { destination_sids: ['C'], stance: 'column' } } as any;
        const blocked = processOsidColumnMovement(quiet, edges(), reverseMap(), terrain());
        expect(blocked.column_blocked).toBe(1);
        expect(quiet.military.formations.donor!.posture).toBe('dig_in');
    });
});
