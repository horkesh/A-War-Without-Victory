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
import { getArtillerySuppression, getAttackerFirepowerDeficitMult } from '../src/sim/combat/combat_math.js';
import { estimateForceRatio, estimateSectorDefensePower } from '../src/sim/combat/operation_preparation.js';
import { ensureBrigadeComposition } from '../src/sim/combat/equipment_effects.js';
import { getSeasonalModifiers } from '../src/sim/combat/seasonal_effects.js';
import { SUPPORT_POWER_MULT } from '../src/sim/combat/bot_constants.js';
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

// P3-EST §11 (2026-11-26): the 188w hist read the estimate ~2.5x above the realised battle
// ratio. The causes were on the attack side: the battle's firepower deficit, its season and
// whole-force arithmetic, and the split of an operation's brigades across axes.
describe('P3-EST §11: the attack side mirrors the battle', () => {
    it('equals the predictor ratio (fog removed): computeAttackForcePower plus own execution friction', () => {
        const s = fixture(false);
        const est = estimateForceRatio(s, op(), 3, 0.9, null, {}, adjacency());
        const p = predictCombatOutcome(s, 'attacker' as FormationId, 'D' as Osid, adjacency(), new Map(), {}, 'attack', ['attacker_2' as FormationId]);
        expect(p).not.toBeNull();
        expect(est).toBeCloseTo(p!.attacker_power / (p!.defender_power / PREDICTOR_FOG_WITHOUT_INTEL), 6);
    });

    it('only the axis that holds the primary objective fights there', () => {
        const s = fixture(false);
        const twoAxes = {
            ...op(),
            objectives: [],
            axes: [
                { axis_id: 'a1', objectives: ['D'], assigned_brigades: ['attacker'], current_objective_index: 0 },
                { axis_id: 'a2', objectives: ['Y2'], assigned_brigades: ['attacker_2'], current_objective_index: 0 },
            ],
        } as unknown as CorpsOperation;
        const scoped = estimateForceRatio(s, twoAxes, 3, 0.9, null, {}, adjacency());
        const p = predictCombatOutcome(s, 'attacker' as FormationId, 'D' as Osid, adjacency(), new Map(), {}, 'attack');
        expect(p).not.toBeNull();
        expect(scoped).toBeCloseTo(p!.attacker_power / (p!.defender_power / PREDICTOR_FOG_WITHOUT_INTEL), 6);
        expect(scoped).toBeLessThan(estimateForceRatio(s, op(), 3, 0.9, null, {}, adjacency()));
    });

    it('P3-EST-PRIM: the primary objective is the live axis current objective, not a lower-sorted depth objective', () => {
        const s = fixture(false);
        // 'C3' sorts before 'D' but is the axis's depth objective; the first battle is at 'D'.
        const axisOp = {
            ...op(),
            objectives: [],
            axes: [{ axis_id: 'a1', objectives: ['D', 'C3'], assigned_brigades: ['attacker', 'attacker_2'], current_objective_index: 0 }],
        } as unknown as CorpsOperation;
        const atCurrent = estimateForceRatio(s, axisOp, 3, 0.9, null, {}, adjacency());
        expect(atCurrent).toBeCloseTo(estimateForceRatio(s, op(), 3, 0.9, null, {}, adjacency()), 9);
        // PRIM-A3 (operations seat, s27): an index carried through a recovery is reset to 0 at
        // launch (`resetAxisForExecution`), so with 'D' still RS-held the first battle is at 'D'.
        const advanced = { ...axisOp, axes: [{ ...(axisOp.axes as any)[0], current_objective_index: 1 }] } as unknown as CorpsOperation;
        expect(estimateForceRatio(s, advanced, 3, 0.9, null, {}, adjacency())).toBeCloseTo(atCurrent, 9);
        // Once 'D' is taken, the launch reconcile drops it and the first battle is at the depth cell.
        const taken = fixture(false);
        (taken.political as any).political_controllers.D = 'RBiH';
        const atDepth = estimateForceRatio(taken, advanced, 3, 0.9, null, {}, adjacency());
        expect(atDepth).not.toBeCloseTo(atCurrent, 3);
        expect(atDepth).not.toBeCloseTo(3.0, 6);
    });

    it('P3-EST-PRIM: an axis current objective the attacker already holds is skipped; the read is at its next contested objective', () => {
        const s = fixture(false);
        // 'A0' (RBiH-held, so no battle is fought there) sorts first and is the axis's current
        // objective; 'B0' is uncontrolled. The first battle is at 'D'.
        (s.political as any).political_controllers.A0 = 'RBiH';
        const axisOp = {
            ...op(),
            objectives: [],
            axes: [{ axis_id: 'a1', objectives: ['A0', 'B0', 'D'], assigned_brigades: ['attacker', 'attacker_2'], current_objective_index: 0 }],
        } as unknown as CorpsOperation;
        const est = estimateForceRatio(s, axisOp, 3, 0.9, null, {}, adjacency());
        expect(est).toBeCloseTo(estimateForceRatio(s, op(), 3, 0.9, null, {}, adjacency()), 9);
        // Not the no-defender sentinel a friendly-held read would give.
        expect(est).not.toBeCloseTo(3.0, 6);
        // PRIM-A3: an index past the end reads what launch gives the axis. The reconcile keeps the
        // foreign-held cells (['D']) and launch walks them from index 0, so the first battle is
        // still at 'D' (main read past the end and fell back to the sentinel).
        const pastEnd = { ...axisOp, axes: [{ ...(axisOp.axes as any)[0], current_objective_index: 9 }] } as unknown as CorpsOperation;
        expect(estimateForceRatio(s, pastEnd, 3, 0.9, null, {}, adjacency()))
            .toBeCloseTo(estimateForceRatio(s, op(), 3, 0.9, null, {}, adjacency()), 9);
        // An axis the reconcile drops (no foreign-held objective left) has no first battle: the
        // lowest objective, friendly-held 'A0', gives the no-defender sentinel.
        const allHeld = { ...axisOp, axes: [{ ...(axisOp.axes as any)[0], objectives: ['A0'] }] } as unknown as CorpsOperation;
        expect(estimateForceRatio(s, allHeld, 3, 0.9, null, {}, adjacency())).toBeCloseTo(3.0, 9);
    });

    it('PRIM-HOSTILE: an axis whose current cell is HRHB-held and combat-blocked (ceasefire, mobilizing) parks there, as in the battle', () => {
        // a1's current objective 'A0' (HRHB-held) sorts first; the battle refuses it and the results
        // pass does not credit it, so a1 parks: no first battle, not one at its depth cell 'C3'.
        // a2 fights at 'D'. So the estimate is a2's brigade alone at 'D'.
        // PRIM-MULTI: a1 carries the larger brigade, so in open war A0 is the main effort.
        const twoAxes = {
            ...op(),
            objectives: [],
            axes: [
                { axis_id: 'a1', objectives: ['A0', 'C3'], assigned_brigades: ['attacker'], current_objective_index: 0 },
                { axis_id: 'a2', objectives: ['D'], assigned_brigades: ['attacker_2'], current_objective_index: 0 },
            ],
        } as unknown as CorpsOperation;
        const at = (alliance: number, rhs: Record<string, unknown>) => {
            const s = fixture(false);
            (s.meta as any).turn = 60;
            (s.political as any).political_controllers.A0 = 'HRHB';
            (s.political as any).war_alliance_rbih_hrhb = alliance;
            (s.political as any).rbih_hrhb_state = rhs;
            const p = predictCombatOutcome(s, 'attacker_2' as FormationId, 'D' as Osid, adjacency(), new Map(), {}, 'attack');
            return { est: estimateForceRatio(s, twoAxes, 3, 0.9, null, {}, adjacency()), aloneAtD: p!.attacker_power / (p!.defender_power / PREDICTOR_FOG_WITHOUT_INTEL) };
        };
        // At war, under a ceasefire: not allied (so `isFriendlyFaction` alone called A0 contested), but combat is blocked.
        const ceasefire = at(-0.3, { ceasefire_active: true });
        expect(ceasefire.est).toBeCloseTo(ceasefire.aloneAtD, 6);
        // Mobilizing: below the alliance threshold, combat not yet enabled.
        const mobilizing = at(0.1, {});
        expect(mobilizing.est).toBeCloseTo(mobilizing.aloneAtD, 6);
        // Open war, no block: A0 is a legal battle and is the primary (no defender there, so the sentinel).
        const war = at(-0.3, {});
        expect(war.est).not.toBeCloseTo(war.aloneAtD, 3);
    });

    it('PRIM-ATT: an axis that holds the primary only as a depth objective does not fight there first', () => {
        const s = fixture(false);
        // a1 fights at 'D' first. a2's first contested objective is 'Z0' (RS-held); 'D' is only its depth.
        (s.political as any).political_controllers.Z0 = 'RS';
        const depthAxisOp = {
            ...op(),
            objectives: [],
            axes: [
                { axis_id: 'a1', objectives: ['D'], assigned_brigades: ['attacker'], current_objective_index: 0 },
                { axis_id: 'a2', objectives: ['Z0', 'D'], assigned_brigades: ['attacker_2'], current_objective_index: 0 },
            ],
        } as unknown as CorpsOperation;
        const est = estimateForceRatio(s, depthAxisOp, 3, 0.9, null, {}, adjacency());
        // Only 'attacker' fights at D, as in the battle.
        const p = predictCombatOutcome(s, 'attacker' as FormationId, 'D' as Osid, adjacency(), new Map(), {}, 'attack');
        expect(p).not.toBeNull();
        expect(est).toBeCloseTo(p!.attacker_power / (p!.defender_power / PREDICTOR_FOG_WITHOUT_INTEL), 6);
        expect(est).toBeLessThan(estimateForceRatio(s, op(), 3, 0.9, null, {}, adjacency()));
    });

    it('PRIM-ATT fallback: with no axis fighting anywhere first, the lowest objective is read with every participating brigade', () => {
        const s = fixture(false);
        // Neither axis has a first contested objective inside the preparation view (the operation's
        // objectives, ['D']): a1's 'C3' and a2's 'C1' are outside it. (PRIM-A3: an index past the
        // end no longer empties an axis; the launch reconcile clamps it.) The primary falls back to
        // the lowest objective ('D'), and no axis fights there first, so every participating brigade
        // counts.
        const outsideView = {
            ...op(),
            objectives: ['D'],
            axes: [
                { axis_id: 'a1', objectives: ['C3'], assigned_brigades: ['attacker'], current_objective_index: 0 },
                { axis_id: 'a2', objectives: ['C1'], assigned_brigades: ['attacker_2'], current_objective_index: 0 },
            ],
        } as unknown as CorpsOperation;
        expect(estimateForceRatio(s, outsideView, 3, 0.9, null, {}, adjacency()))
            .toBeCloseTo(estimateForceRatio(s, op(), 3, 0.9, null, {}, adjacency()), 9);
    });

    it('PRIM-A3: a leading objective the launch reconcile cuts as unreachable is not read as the first battle', () => {
        // The ops seat's case: axis A = [unreachable C3, D], axis B = [D]. At launch the reconcile
        // cuts C3 (no approach OSID), so both axes fight at D. The estimate reads both at D, which
        // equals the post-launch shape (both axes ['D'], two axes splitting s_a's reserve). Main
        // read A at C3 (lower-sorted), so C3 became the primary.
        const s = fixture(false);
        (s.military as any).war_front_edges_osid = [{ edge_id: 'e:E-D', a: 'E', b: 'D', side_a: 'RBiH', side_b: 'RS' }];
        const axes = (preserve: boolean) => ({
            ...op(),
            objectives: [],
            axes: [
                { axis_id: 'a1', objectives: ['C3', 'D'], assigned_brigades: ['attacker_2'], current_objective_index: 0, ...(preserve ? { preserve_objective_sequence: true } : {}) },
                { axis_id: 'a2', objectives: ['D'], assigned_brigades: ['attacker'], current_objective_index: 0 },
            ],
        } as unknown as CorpsOperation);
        const launched = {
            ...op(),
            objectives: [],
            axes: [
                { axis_id: 'a1', objectives: ['D'], assigned_brigades: ['attacker_2'], current_objective_index: 0 },
                { axis_id: 'a2', objectives: ['D'], assigned_brigades: ['attacker'], current_objective_index: 0 },
            ],
        } as unknown as CorpsOperation;
        const both = estimateForceRatio(s, launched, 3, 0.9, null, {}, adjacency());
        expect(estimateForceRatio(s, axes(false), 3, 0.9, null, {}, adjacency())).toBeCloseTo(both, 9);
        // An axis that keeps its authored sequence is not cut at launch, so C3 stays its first battle.
        expect(estimateForceRatio(s, axes(true), 3, 0.9, null, {}, adjacency())).not.toBeCloseTo(both, 3);
    });

    it('PRIM-A4: the sector split counts axes in the preparation view, as the primary and attacker picks do', () => {
        // op.objectives is ['D']; a2's 'C1' is outside that view, so a2 has no first battle and does
        // not split s_a's reserves. The estimate equals the operation with a1 alone (main counted
        // a2 at C1 on s_a and halved the reserve).
        const s = fixture(false);
        const withA2 = {
            ...op(),
            objectives: ['D'],
            axes: [
                { axis_id: 'a1', objectives: ['D'], assigned_brigades: ['attacker', 'attacker_2'], current_objective_index: 0 },
                { axis_id: 'a2', objectives: ['C1'], assigned_brigades: [], current_objective_index: 0 },
            ],
        } as unknown as CorpsOperation;
        const a1Only = { ...withA2, axes: [(withA2.axes as any)[0]] } as unknown as CorpsOperation;
        expect(estimateForceRatio(s, withA2, 3, 0.9, null, {}, adjacency()))
            .toBeCloseTo(estimateForceRatio(s, a1Only, 3, 0.9, null, {}, adjacency()), 9);
    });

    it('keeps predictor parity in a winter month (seasonal attack and defence multipliers)', () => {
        const s = fixture(false);
        (s.meta as any).scenario_start_date = { year: 1992, month: 5, day: 1 };
        const season = getSeasonalModifiers(30, (s.meta as any).scenario_start_date, 0);
        expect(season.attack_mult).not.toBe(1);
        expect(season.defense_mult).not.toBe(1);
        const est = estimateForceRatio(s, op(), 3, 0.9, null, {}, adjacency());
        const p = predictCombatOutcome(s, 'attacker' as FormationId, 'D' as Osid, adjacency(), new Map(), {}, 'attack', ['attacker_2' as FormationId]);
        expect(est).toBeCloseTo(p!.attacker_power / (p!.defender_power / PREDICTOR_FOG_WITHOUT_INTEL), 6);
    });

    it("carries the operation's authored execution modifier, which the battle applies in execution", () => {
        const s = fixture(false);
        const plain = estimateForceRatio(s, op(), 3, 0.9, null, {}, adjacency());
        const boosted = estimateForceRatio(s, { ...op(), execution_attack_power_mult: 2.5 } as CorpsOperation, 3, 0.9, null, {}, adjacency());
        expect(boosted / plain).toBeCloseTo(2.5, 6);
        const capped = estimateForceRatio(s, { ...op(), execution_attack_power_mult: 9 } as CorpsOperation, 3, 0.9, null, {}, adjacency());
        expect(capped / plain).toBeCloseTo(3, 6);
    });

    it('support brigades fight at full power, so planning (where support status is not yet set) matches the battle', () => {
        // If this changes, estimateForceRatio must pass the support multiplier too: it is
        // taken while the operation plans, and isSupportBrigadeOnActiveOp reads execution only.
        expect(SUPPORT_POWER_MULT).toBe(1);
    });

    it('applies the battle firepower deficit against the defending roster', () => {
        const heavy = { artillery: 30, tanks: 6, artillery_condition: { operational: 1 }, tank_condition: { operational: 1 } };
        const armed = (on: boolean): GameState => {
            const s = fixture(false);
            (s.meta as any).firepower_deficit_penalty_enabled = on;
            for (const id of ['on_cell', 'reserve']) {
                const f = s.military.formations[id]!;
                f.composition = { ...ensureBrigadeComposition({ ...f }), ...heavy } as any;
            }
            return s;
        };
        const off = estimateForceRatio(armed(false), op(), 3, 0.9, null, {}, adjacency());
        const sOn = armed(true);
        const on = estimateForceRatio(sOn, op(), 3, 0.9, null, {}, adjacency());
        const mult = getAttackerFirepowerDeficitMult(
            sOn,
            [sOn.military.formations.attacker!, sOn.military.formations.attacker_2!],
            [sOn.military.formations.on_cell!, sOn.military.formations.reserve!],
        );
        expect(Number.isFinite(off)).toBe(true);
        expect(mult).toBeLessThan(1);
        expect(on / off).toBeCloseTo(mult, 6);
    });
});
