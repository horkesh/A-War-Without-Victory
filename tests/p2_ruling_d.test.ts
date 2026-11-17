/**
 * Package "1994-95 attack and defence" P2, orchestrator ruling D (2026-11-17): the cause of the weak
 * Ozren line (Donja Bočinja). Each fix is pinned by a test that failed before it.
 *  Q3. A brigade that left the front while dug in may stand down. Off the front `applyPostureOrders`
 *      rejected every posture change, so a dug-in brigade reclassified to reserve or rear kept
 *      `dig_in` for good and every later multi-hop column order to it died at the dig_in lockout.
 *  B.  The corps breach answer. After a fresh combat loss with no healthy brigade next to the lost
 *      cell, the corps sends its strongest spare brigade (never a lone holder) next to it, so the P2
 *      step-3 retake has someone in reach. Movement only.
 */
import { describe, expect, it } from 'vitest';

import { applyPostureOrders } from '../src/sim/combat/brigade_posture.js';
import { distributeBrigadesToFront } from '../src/sim/combat/brigade_front_distribution.js';
import { isBreachAnswerDonor } from '../src/sim/combat/brigade_routine_scope.js';
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

describe('Ruling D, Q3: an off-front brigade may stand down from a stale dig_in', () => {
    const offFront = (posture: string, order: string): GameState => ({
        meta: { turn: 120, phase: 'war' },
        factions: [{ id: 'RS' }],
        military: {
            formations: {
                rs_rear: brigade('rs_rear', 'RS', 'op:mun:rear', { posture, dig_in_progress: 1 } as any),
            },
            brigade_posture_orders: [{ brigade_id: 'rs_rear', posture: order }],
            corps_front_sectors: {}, // off the front: no sector assigns it
        },
        political: { political_controllers: {} },
    } as unknown as GameState);

    it('a dug-in off-front brigade takes its defend order', () => {
        const s = offFront('dig_in', 'defend');
        applyPostureOrders(s);
        expect(s.military.formations.rs_rear!.posture).toBe('defend');
    });

    it('a dug-in off-front brigade takes a hold order', () => {
        const s = offFront('dig_in', 'hold');
        applyPostureOrders(s);
        expect(s.military.formations.rs_rear!.posture).toBe('hold');
    });

    it('a dug-in off-front brigade still cannot take an attack posture', () => {
        const s = offFront('dig_in', 'attack');
        applyPostureOrders(s);
        expect(s.military.formations.rs_rear!.posture).toBe('dig_in');
    });

    it('an off-front brigade that is not dug in still cannot change posture', () => {
        const s = offFront('defend', 'hold');
        applyPostureOrders(s);
        expect(s.military.formations.rs_rear!.posture).toBe('defend');
    });

    it('a dug-in participant of a live operation does not stand down (an emergent op must leave it put)', () => {
        const s = offFront('dig_in', 'defend');
        (s.military as any).corps_command = {
            corps_1: { active_operations: [{ name: 'Emergent', type: 'sector_attack', phase: 'planning', participating_brigades: ['rs_rear'] }] },
        };
        applyPostureOrders(s);
        expect(s.military.formations.rs_rear!.posture).toBe('dig_in');
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
