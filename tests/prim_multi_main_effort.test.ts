/**
 * PRIM-MULTI (rulings §26 Q2; Fable consult 10 appendix B; corps seat spec, lane B s24).
 * A multi-axis operation's estimate is taken at its MAIN EFFORT: the first-battle cell whose own
 * axes commit the most men, then the greatest summed attack power, then the lowest authored axis
 * index. Before, it was the lowest-sorted cell, so a name decided it.
 *
 * Fixture: the RBiH attackers stand on E. Two RS cells, P and Q, each adjacent to E, each in
 * its own sector with one defender (Q's is stronger), so the divisor is 1 for a lone axis and
 * the estimate tells which cell was read. The cell names are parameters, so a test can put the
 * main effort on the lower- or the higher-sorted name.
 */
import { describe, expect, it } from 'vitest';

import { estimateForceRatio } from '../src/sim/combat/operation_preparation.js';
import type { CorpsOperation, FactionId, FormationState, GameState } from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

const brigade = (id: string, faction: FactionId, loc: string, extra: Partial<FormationState> = {}): FormationState => ({
    id, faction, name: id, created_turn: 0, status: 'active', assignment: null, kind: 'brigade',
    personnel: 1500, cohesion: 60, tags: [], location_osid: loc, home_osid: loc, hq_sid: 'S1',
    ...extra,
} as FormationState);

type Names = { P: string; Q: string };
const AA_ZZ: Names = { P: 'AA', Q: 'ZZ' };
const ZZ_AA: Names = { P: 'ZZ', Q: 'AA' };

function fixture(names: Names, attackers: FormationState[]): GameState {
    const formations: Record<string, FormationState> = {
        d_p: brigade('d_p', 'RS', names.P, { corps_id: 'corps_1', personnel: 1200, cohesion: 55 } as any),
        d_q: brigade('d_q', 'RS', names.Q, { corps_id: 'corps_2', personnel: 3000, cohesion: 75 } as any),
    };
    for (const a of attackers) formations[a.id] = a;
    return {
        meta: { turn: 30, phase: 'war' },
        factions: [{ id: 'RS' }, { id: 'RBiH' }],
        military: {
            formations,
            corps_front_sectors: {
                s_p: {
                    sector_id: 's_p', corps_id: 'corps_1', faction: 'RS',
                    sub_segments: [{ sub_segment_id: 's_p:0', friendly_osids: [names.P], enemy_osids: ['E'], primary_brigade_ids: ['d_p'] }],
                    assigned_brigade_ids: ['d_p'], reserve_brigade_ids: [], territory_osids: [names.P],
                },
                s_q: {
                    sector_id: 's_q', corps_id: 'corps_2', faction: 'RS',
                    sub_segments: [{ sub_segment_id: 's_q:0', friendly_osids: [names.Q], enemy_osids: ['E'], primary_brigade_ids: ['d_q'] }],
                    assigned_brigade_ids: ['d_q'], reserve_brigade_ids: [], territory_osids: [names.Q],
                },
            },
        },
        political: { political_controllers: { [names.P]: 'RS', [names.Q]: 'RS', E: 'RBiH', H: 'RBiH' } },
    } as unknown as GameState;
}

const adjacency = (names: Names): Map<Osid, Osid[]> => new Map<Osid, Osid[]>([
    ['E', [names.P, names.Q]],
    [names.P, ['E']],
    [names.Q, ['E']],
] as Array<[Osid, Osid[]]>);

const atk = (id: string, personnel: number, extra: Partial<FormationState> = {}) =>
    brigade(id, 'RBiH', 'E', { corps_id: 'corps_x', personnel, cohesion: 65, ...extra } as any);

type Axis = { axis_id: string; objectives: string[]; assigned_brigades: string[]; current_objective_index: number; late_phase?: unknown };
const axis = (axis_id: string, objectives: string[], assigned_brigades: string[]): Axis =>
    ({ axis_id, objectives, assigned_brigades, current_objective_index: 0 });

const estimate = (s: GameState, names: Names, axes: Axis[], participants: string[]): number =>
    estimateForceRatio(s, {
        name: 'T', type: 'sector_attack', phase: 'planning',
        participating_brigades: participants, objectives: [], axes,
    } as unknown as CorpsOperation, 3, 0.9, null, {}, adjacency(names));

describe('PRIM-MULTI: the estimate is taken at the main effort', () => {
    it('name independence: renaming axes and cells, authored order and brigades unchanged, leaves the estimate unchanged', () => {
        const attackers = [atk('b1', 1500), atk('b2', 1500), atk('s1', 400)];
        const ids = attackers.map((a) => a.id);
        const run = (names: Names, idP: string, idQ: string) => {
            const s = fixture(names, attackers.map((a) => ({ ...a })));
            return estimate(s, names, [axis(idP, [names.P], ['b1', 'b2']), axis(idQ, [names.Q], ['s1'])], ids);
        };
        const base = run(AA_ZZ, 'a1', 'a2');
        expect(run(ZZ_AA, 'x9', 'b0')).toBe(base);
        expect(run(AA_ZZ, 'z_last', 'a_first')).toBe(base);
    });

    it('the cell with more men committed wins over a lower-sorted cell with fewer', () => {
        // The main effort is at P = 'ZZ'; the lower-sorted 'AA' (Q) has one small brigade.
        const attackers = [atk('b1', 1500), atk('b2', 1500), atk('s1', 400)];
        const ids = attackers.map((a) => a.id);
        const s = fixture(ZZ_AA, attackers);
        const both = estimate(s, ZZ_AA, [axis('a1', ['ZZ'], ['b1', 'b2']), axis('a2', ['AA'], ['s1'])], ids);
        const mainOnly = estimate(s, ZZ_AA, [axis('a1', ['ZZ'], ['b1', 'b2'])], ids);
        const otherOnly = estimate(s, ZZ_AA, [axis('a2', ['AA'], ['s1'])], ids);
        expect(both).toBe(mainOnly);
        expect(both).not.toBeCloseTo(otherOnly, 3);
    });

    it('three 100-man brigades do not outrank two full ones', () => {
        const attackers = [atk('f1', 1500), atk('f2', 1500), atk('h1', 100), atk('h2', 100), atk('h3', 100)];
        const ids = attackers.map((a) => a.id);
        const s = fixture(ZZ_AA, attackers);
        const axes = [axis('a1', ['AA'], ['h1', 'h2', 'h3']), axis('a2', ['ZZ'], ['f1', 'f2'])];
        const full = estimate(s, ZZ_AA, [axes[1]!], ids);
        const hollow = estimate(s, ZZ_AA, [axes[0]!], ids);
        expect(estimate(s, ZZ_AA, axes, ids)).toBe(full);
        expect(full).not.toBeCloseTo(hollow, 3);
    });

    it('converging axes pool their brigades at their shared cell; a brigade on both counts once', () => {
        const attackers = [atk('c1', 1000), atk('c2', 1000), atk('m1', 1500)];
        const ids = attackers.map((a) => a.id);
        const s = fixture(ZZ_AA, attackers);
        // Two axes converge on 'ZZ' (1000 + 1000) against one on 'AA' (1500): 'ZZ' is the main effort.
        const pooled = [axis('a1', ['ZZ'], ['c1']), axis('a2', ['ZZ'], ['c2']), axis('a3', ['AA'], ['m1'])];
        const zzOnly = estimate(s, ZZ_AA, [pooled[0]!, pooled[1]!], ids);
        expect(estimate(s, ZZ_AA, pooled, ids)).toBe(zzOnly);
        // The same brigade listed on both converging axes is 1000 men, not 2000: 'AA' wins.
        const shared = [axis('a1', ['ZZ'], ['c1']), axis('a2', ['ZZ'], ['c1']), axis('a3', ['AA'], ['m1'])];
        expect(estimate(s, ZZ_AA, shared, ids)).toBe(estimate(s, ZZ_AA, [shared[2]!], ids));
        expect(zzOnly).not.toBeCloseTo(estimate(s, ZZ_AA, [shared[2]!], ids), 3);
    });

    it('a tie on men goes to the greater summed attack power; a full tie to the lower authored axis index', () => {
        // Equal men; 'ZZ''s brigade has more cohesion, so more attack power.
        const strong = [atk('w1', 1500, { cohesion: 85 } as any), atk('w2', 1500, { cohesion: 40 } as any)];
        const ids = ['w1', 'w2'];
        const s = fixture(ZZ_AA, strong);
        const powerAxes = [axis('a1', ['AA'], ['w2']), axis('a2', ['ZZ'], ['w1'])];
        expect(estimate(s, ZZ_AA, powerAxes, ids)).toBe(estimate(s, ZZ_AA, [powerAxes[1]!], ids));
        // Identical brigades: the first authored axis is the main effort, whatever its cell's name.
        const twins = [atk('t1', 1500), atk('t2', 1500)];
        const t = fixture(ZZ_AA, twins);
        const zzFirst = [axis('a1', ['ZZ'], ['t1']), axis('a2', ['AA'], ['t2'])];
        const aaFirst = [axis('a1', ['AA'], ['t2']), axis('a2', ['ZZ'], ['t1'])];
        expect(estimate(t, ZZ_AA, zzFirst, ['t1', 't2'])).toBe(estimate(t, ZZ_AA, [zzFirst[0]!], ['t1', 't2']));
        expect(estimate(t, ZZ_AA, aaFirst, ['t1', 't2'])).toBe(estimate(t, ZZ_AA, [aaFirst[0]!], ['t1', 't2']));
        expect(estimate(t, ZZ_AA, zzFirst, ['t1', 't2'])).not.toBeCloseTo(estimate(t, ZZ_AA, aaFirst, ['t1', 't2']), 3);
    });

    it('excluded axes, axes with no active brigade and axes with no contested objective are never chosen', () => {
        // Every distractor sorts before 'ZZ' or carries more men than the real axis.
        const attackers = [atk('r1', 600), atk('gone', 5000, { status: 'inactive' } as any), atk('idle', 5000)];
        const s = fixture(ZZ_AA, attackers);
        const real = axis('a_real', ['ZZ'], ['r1']);
        const excluded = { ...axis('a_excl', ['AA'], []), late_phase: { phase: 'holding', handoff: { to: 'x' } } };
        const inactiveOnly = axis('a_gone', ['AA'], ['gone']);
        const notParticipating = axis('a_idle', ['AA'], ['idle']);
        const friendlyHeld = axis('a_held', ['H'], ['r1']);
        const all = [excluded, inactiveOnly, notParticipating, friendlyHeld, real];
        // 'idle' is active but not a participant of the operation, so it commits no one.
        const participants = ['r1', 'gone'];
        expect(estimate(s, ZZ_AA, all, participants)).toBe(estimate(s, ZZ_AA, [real], participants));
        expect(estimate(s, ZZ_AA, [real], participants))
            .not.toBeCloseTo(estimate(s, ZZ_AA, [axis('a_aa', ['AA'], ['r1'])], participants), 3);
    });

    it('a single-axis operation, and live axes that share one cell, read that cell exactly as before', () => {
        const attackers = [atk('b1', 1500), atk('b2', 900)];
        const ids = ['b1', 'b2'];
        const s = fixture(AA_ZZ, attackers);
        const single = estimate(s, AA_ZZ, [axis('a1', ['ZZ', 'AA'], ['b1', 'b2'])], ids);
        // Pinned on main 57a9f52e7 (the pre-change code) for this fixture.
        expect(single).toBe(SINGLE_AXIS_PIN);
        const shared = estimate(s, AA_ZZ, [axis('a1', ['ZZ'], ['b1']), axis('a2', ['ZZ'], ['b2'])], ids);
        expect(shared).toBe(SHARED_CELL_PIN);
    });
});

// Values read from main 57a9f52e7 with this file's fixture (lane B s29).
const SINGLE_AXIS_PIN = 0.38979674666445263;
const SHARED_CELL_PIN = 0.38979674666445263;
