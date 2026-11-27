/**
 * PRIM-MULTI-TB (rulings §37; Codex review thread r4714094168 on #893).
 * The main-effort tie-break on summed attack power reads each brigade's power AT ITS CELL.
 * Before, `selectMainEffortCell` called `computeAttackerPower` with no target OSID, so the
 * per-target multipliers (`getHeavyWeaponsOffensiveMult`'s urban floor, the dated external
 * attack support by municipality) never entered the tie-break, and two cells with equal men
 * tied on power and fell to the authored axis order.
 *
 * Fixture: the RBiH attackers stand on E. Two RS cells, A (municipality `muna`) and B
 * (`munb`), each adjacent to E and each in its own sector with one defender. A dated external
 * attack support row (osid_attack_support) covers `munb` only. Two identical brigades, one
 * per axis: equal men, equal power off-target. Axis 0 attacks A, so the authored order alone
 * would pick A; the support at B must decide for B.
 */
import { describe, expect, it } from 'vitest';

import { estimateForceRatio } from '../src/sim/combat/operation_preparation.js';
import type { CorpsOperation, FactionId, FormationState, GameState } from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

const A = 'op:muna:a';
const B = 'op:munb:b';

const brigade = (id: string, faction: FactionId, loc: string, extra: Partial<FormationState> = {}): FormationState => ({
    id, faction, name: id, created_turn: 0, status: 'active', assignment: null, kind: 'brigade',
    personnel: 1500, cohesion: 60, tags: [], location_osid: loc, home_osid: loc, hq_sid: 'S1',
    ...extra,
} as FormationState);

const support = [{
    faction: 'RBiH', role: 'attack', osid_attack_support: true,
    start_turn: 0, end_turn: 999, municipalities: ['munb'], combat_multiplier: 1.6,
}];

function fixture(withSupport: boolean): GameState {
    const formations: Record<string, FormationState> = {
        d_a: brigade('d_a', 'RS', A, { corps_id: 'corps_1', personnel: 1200, cohesion: 55 } as any),
        d_b: brigade('d_b', 'RS', B, { corps_id: 'corps_2', personnel: 3000, cohesion: 75 } as any),
        t1: brigade('t1', 'RBiH', 'E', { corps_id: 'corps_x', personnel: 1500, cohesion: 65 } as any),
        t2: brigade('t2', 'RBiH', 'E', { corps_id: 'corps_x', personnel: 1500, cohesion: 65 } as any),
    };
    return {
        meta: { turn: 30, phase: 'war' },
        factions: [{ id: 'RS' }, { id: 'RBiH' }],
        military: {
            formations,
            war_timeline: withSupport ? { external_support: support } : undefined,
            corps_front_sectors: {
                s_a: {
                    sector_id: 's_a', corps_id: 'corps_1', faction: 'RS',
                    sub_segments: [{ sub_segment_id: 's_a:0', friendly_osids: [A], enemy_osids: ['E'], primary_brigade_ids: ['d_a'] }],
                    assigned_brigade_ids: ['d_a'], reserve_brigade_ids: [], territory_osids: [A],
                },
                s_b: {
                    sector_id: 's_b', corps_id: 'corps_2', faction: 'RS',
                    sub_segments: [{ sub_segment_id: 's_b:0', friendly_osids: [B], enemy_osids: ['E'], primary_brigade_ids: ['d_b'] }],
                    assigned_brigade_ids: ['d_b'], reserve_brigade_ids: [], territory_osids: [B],
                },
            },
        },
        political: { political_controllers: { [A]: 'RS', [B]: 'RS', E: 'RBiH' } },
    } as unknown as GameState;
}

const adjacency = new Map<Osid, Osid[]>([
    ['E', [A, B]],
    [A, ['E']],
    [B, ['E']],
] as Array<[Osid, Osid[]]>);

type Axis = { axis_id: string; objectives: string[]; assigned_brigades: string[]; current_objective_index: number };
const axis = (axis_id: string, objectives: string[], assigned_brigades: string[]): Axis =>
    ({ axis_id, objectives, assigned_brigades, current_objective_index: 0 });

const estimate = (s: GameState, axes: Axis[]): number =>
    estimateForceRatio(s, {
        name: 'T', type: 'sector_attack', phase: 'planning',
        participating_brigades: ['t1', 't2'], objectives: [], axes,
    } as unknown as CorpsOperation, 3, 0.9, null, {}, adjacency);

describe('PRIM-MULTI-TB: the power tie-break reads each brigade at its own cell', () => {
    const axisA = axis('a1', [A], ['t1']);
    const axisB = axis('a2', [B], ['t2']);

    it('equal men: the external attack support at B decides for B over the first authored axis', () => {
        const s = fixture(true);
        const atB = estimate(s, [axisB]);
        const atA = estimate(s, [axisA]);
        expect(atB).not.toBeCloseTo(atA, 3);
        expect(estimate(s, [axisA, axisB])).toBe(atB);
    });

    it('with no per-target multiplier the full tie still goes to the first authored axis', () => {
        const s = fixture(false);
        expect(estimate(s, [axisA, axisB])).toBe(estimate(s, [axisA]));
        expect(estimate(s, [axisB, axisA])).toBe(estimate(s, [axisB]));
    });
});
