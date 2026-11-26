/**
 * P3-EST (freeze inventory §8 queue, 2026-11-26; operations seat spec): the planner's force-ratio
 * estimate is the honest ratio against the defence the battle builds.
 *  1. Parity: `estimateSectorDefensePower` equals the predictor's defence (which mirrors the
 *     resolver) with the predictor's intel fog taken out. This is the drift guard between the
 *     planner's estimate and the battle model.
 *  2. No estimation error: the estimate no longer scales with intel confidence or competence.
 *  3. Reach: a defender brigade cut off from the target by enemy ground adds nothing (this is
 *     what the removed enclave-interior filter used to do by hand).
 */
import { describe, expect, it } from 'vitest';

import { predictCombatOutcome } from '../src/sim/combat/combat_predictor.js';
import { getArtillerySuppression } from '../src/sim/combat/combat_math.js';
import { estimateForceRatio, estimateSectorDefensePower } from '../src/sim/combat/operation_preparation.js';
import type { CorpsOperation, FactionId, FormationId, FormationState, GameState } from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

// The predictor's intel fog with no sector intel (combat_predictor.ts FOG_BASE).
const PREDICTOR_FOG_WITHOUT_INTEL = 0.70;

const brigade = (id: string, faction: FactionId, loc: string, extra: Partial<FormationState> = {}): FormationState => ({
    id, faction, name: id, created_turn: 0, status: 'active', assignment: null, kind: 'brigade',
    personnel: 1500, cohesion: 60, tags: [], location_osid: loc, home_osid: loc, hq_sid: 'S1',
    ...extra,
} as FormationState);

// Line D-C1-C2-C3, all RS; X is an RS cell cut off from D by RBiH ground at Y.
// The RBiH attacker stands on E next to D. RS holds D with `on_cell`; `reserve` stands at C2
// (2 hops) and `cut_off` at X (reachable only through RBiH-held Y).
const chain = ['D', 'C1', 'C2', 'C3'];
const fixture = (withCutOff: boolean): GameState => {
    const formations: Record<string, FormationState> = {
        on_cell: brigade('on_cell', 'RS', 'D', { corps_id: 'corps_1', personnel: 1200, cohesion: 55 } as any),
        reserve: brigade('reserve', 'RS', 'C2', { corps_id: 'corps_1', personnel: 2200, cohesion: 65 } as any),
        attacker: brigade('attacker', 'RBiH', 'E', { corps_id: 'corps_x', personnel: 2500, cohesion: 70 } as any),
        attacker_2: brigade('attacker_2', 'RBiH', 'E', { corps_id: 'corps_x', personnel: 1800, cohesion: 60 } as any),
    };
    const assigned = ['on_cell', 'reserve'];
    if (withCutOff) {
        formations.cut_off = brigade('cut_off', 'RS', 'X', { corps_id: 'corps_1', personnel: 3000, cohesion: 80 } as any);
        assigned.push('cut_off');
    }
    return {
        meta: { turn: 30, phase: 'war' },
        factions: [{ id: 'RS' }, { id: 'RBiH' }],
        military: {
            formations,
            corps_front_sectors: {
                s_a: {
                    sector_id: 's_a', corps_id: 'corps_1', faction: 'RS',
                    sub_segments: [{ sub_segment_id: 's_a:0', friendly_osids: ['D'], enemy_osids: ['E'], primary_brigade_ids: assigned }],
                    assigned_brigade_ids: assigned, reserve_brigade_ids: [], territory_osids: [...chain, 'X'],
                },
            },
        },
        political: { political_controllers: { ...Object.fromEntries(chain.map((c) => [c, 'RS'])), X: 'RS', Y: 'RBiH', E: 'RBiH' } },
    } as unknown as GameState;
};
const adjacency = (): Map<Osid, Osid[]> => new Map<Osid, Osid[]>([
    ['E', ['D', 'Y']],
    ['D', ['C1', 'E']],
    ['C1', ['C2', 'D']],
    ['C2', ['C1', 'C3']],
    ['C3', ['C2']],
    ['Y', ['E', 'X']],
    ['X', ['Y']],
] as Array<[Osid, Osid[]]>);
const op = (): CorpsOperation => ({
    name: 'Test', type: 'sector_attack', phase: 'planning',
    participating_brigades: ['attacker', 'attacker_2'], objectives: ['D'],
} as unknown as CorpsOperation);

const planner = (s: GameState) => {
    const attackers = [s.military.formations.attacker!, s.military.formations.attacker_2!];
    return estimateSectorDefensePower(
        s, 'D', 'RBiH', attackers.length, adjacency(), {}, getArtillerySuppression(attackers, 'RBiH', s), null, () => 0,
    );
};

describe('P3-EST: the planner estimates the defence the battle builds', () => {
    it('equals the predictor defence (fog removed) for physical + reactive defenders', () => {
        const s = fixture(false);
        const est = planner(s);
        expect(est).not.toBeNull();
        expect(est!.contributors).toBe(2);
        const p = predictCombatOutcome(s, 'attacker' as FormationId, 'D' as Osid, adjacency(), new Map(), {}, 'attack', ['attacker_2' as FormationId]);
        expect(p).not.toBeNull();
        expect(p!.defender_power / PREDICTOR_FOG_WITHOUT_INTEL).toBeCloseTo(est!.power, 6);
    });

    it('a brigade cut off from the target by enemy ground adds nothing', () => {
        const without = planner(fixture(false))!;
        const withCutOff = planner(fixture(true))!;
        expect(withCutOff.contributors).toBe(without.contributors);
        // Only the cap/floor average can move (the roster average includes it); the reactive sum cannot.
        const p = predictCombatOutcome(fixture(true), 'attacker' as FormationId, 'D' as Osid, adjacency(), new Map(), {}, 'attack', ['attacker_2' as FormationId]);
        expect(p!.defender_power / PREDICTOR_FOG_WITHOUT_INTEL).toBeCloseTo(withCutOff.power, 6);
    });

    it('the estimate no longer depends on intel confidence or competence', () => {
        const s = fixture(false);
        const blind = estimateForceRatio(s, op(), 1, 0.1, null, {}, adjacency());
        const sure = estimateForceRatio(s, op(), 5, 0.95, null, {}, adjacency());
        expect(blind).toBeGreaterThan(0);
        expect(sure).toBeCloseTo(blind, 9);
    });

    it('not enemy-held, or no contributing defender: no estimate (the caller keeps its sentinel)', () => {
        const s = fixture(false);
        expect(estimateSectorDefensePower(s, 'E', 'RBiH', 1, adjacency(), {}, 0, null, () => 0)).toBeNull();
        expect(estimateSectorDefensePower(s, 'D', 'RS', 1, adjacency(), {}, 0, null, () => 0)).toBeNull();
    });
});
