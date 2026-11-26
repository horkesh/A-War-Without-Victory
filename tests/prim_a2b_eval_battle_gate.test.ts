/**
 * PRIM-A2b (orchestrator rulings §25.4, the §19 class): the brigade attack evaluation uses the
 * battle's own RBiH-HRHB gate (`isRbihHrhbCombatBlocked`), not `isRbihHrhbCombatEnabled`. The two
 * differ before the earliest war turn, under a ceasefire and after Washington; in each of those
 * windows the battle blocks the pair, so the evaluation must never aim a brigade at the ally.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { evaluateSectorAttack } from '../src/sim/combat/bot_brigade_eval_attack.js';
import type { BrigadeEvaluationContext } from '../src/sim/combat/bot_brigade_eval_types.js';
import * as combatPredictor from '../src/sim/combat/combat_predictor.js';
import type { CorpsOperation, GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { isRbihHrhbCombatBlocked, isRbihHrhbCombatEnabled } from '../src/sim/early_war/alliance_update.js';
import { makeCorps, makeFormation } from './test_factories.js';

const APPROACH = 'op:front:approach_a';
const OBJECTIVE = 'op:target:objective';

type Window = 'war' | 'washington' | 'ceasefire' | 'before_earliest_turn';

function makeFixture(window: Window): BrigadeEvaluationContext {
    const turn = window === 'before_earliest_turn' ? 30 : 110;
    const state = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, phase: 'war', seed: 'prim-a2b', rbih_hrhb_war_earliest_turn: 40 } as any,
        factions: [
            { id: 'RBiH', areasOfResponsibility: [] },
            { id: 'HRHB', areasOfResponsibility: [] },
        ] as any,
        military: {
            formations: {
                rbih_corps: makeCorps({ id: 'rbih_corps', faction: 'RBiH', hq_sid: 'S1' }),
                b1: makeFormation({
                    id: 'b1',
                    faction: 'RBiH',
                    corps_id: 'rbih_corps',
                    hq_sid: 'S1',
                    location_osid: APPROACH,
                    posture: 'defend',
                    personnel: 3000,
                    cohesion: 80,
                }),
                hvo: makeFormation({
                    id: 'hvo',
                    faction: 'HRHB',
                    corps_id: 'hvo_corps',
                    hq_sid: 'S2',
                    location_osid: OBJECTIVE,
                    personnel: 800,
                    cohesion: 50,
                }),
            },
            corps_front_sectors: {},
            corps_command: {},
            war_front_edges_osid: [{
                edge_id: 'front:approach-objective',
                a: APPROACH,
                b: OBJECTIVE,
                side_a: 'RBiH',
                side_b: 'HRHB',
            }],
        } as any,
        political: {
            // At war: the alliance is at the hostile floor, so `isRbihHrhbCombatEnabled` is true.
            war_alliance_rbih_hrhb: -0.5,
            rbih_hrhb_state: {
                war_started_turn: 49,
                washington_signed: window === 'washington',
                ceasefire_active: window === 'ceasefire',
            },
            political_controllers: { [APPROACH]: 'RBiH', [OBJECTIVE]: 'HRHB' },
        } as any,
    } as GameState;

    const activeOp: CorpsOperation = {
        name: 'Lasva Push',
        type: 'sector_attack',
        phase: 'execution',
        started_turn: turn - 5,
        phase_started_turn: turn - 1,
        participating_brigades: ['b1'],
        objectives: [OBJECTIVE],
        current_objective_index: 0,
        attack_attempt_count: 0,
        objective_capture_count: 0,
        movement_only_execution_turns: 0,
        idle_execution_turn_streak: 0,
        failure_count: 0,
        consecutive_failures_on_current: 0,
        sector_id: 'sector:rbih_corps:0',
        axes: [{
            axis_id: 'main',
            name: 'Main Axis',
            assigned_brigades: ['b1'],
            objectives: [OBJECTIVE],
            current_objective_index: 0,
            status: 'executing',
            failure_count: 0,
            consecutive_failures_on_current: 0,
            momentum: 0,
            attack_attempt_count: 0,
            objective_capture_count: 0,
            movement_only_execution_turns: 0,
            idle_execution_turn_streak: 0,
        }],
    };

    return {
        state,
        faction: 'RBiH',
        brigade: state.military.formations!.b1!,
        loc: APPROACH,
        corpsId: 'rbih_corps',
        cmd: null,
        directive: null,
        corpsStance: 'offensive',
        activeOp,
        isActiveSectorOperationParticipant: true,
        adjEnemy: [OBJECTIVE],
        isAlliedWithRBiH: false,
        targetAdjacentCount: new Map(),
        corpsReserve: new Map(),
        chosenTargets: new Map(),
        columnAssignments: new Map(),
        counterAttackTarget: null,
        brigadeSupplyState: 'adequate',
        isHoldBrigade: false,
        sectorRecentRetreats: new Map(),
        sectorCounterAttackCount: new Map(),
        adjacency: new Map([
            [APPROACH, [OBJECTIVE]],
            [OBJECTIVE, [APPROACH]],
        ]),
        reverseMap: new Map(),
        terrainCache: {},
        graphAnalysis: {} as any,
        result: {
            posture_orders: [],
            attack_orders: {},
            attack_scores: {},
            movement_orders: {},
            column_march_orders: {},
            eligible_attackers_by_corps: {},
        },
    };
}

/** Records every OSID the evaluation asks the predictor about. */
function spyPredictedTargets(): { direct: string[]; fallback: string[] } {
    const seen = { direct: [] as string[], fallback: [] as string[] };
    vi.spyOn(combatPredictor, 'predictCombatOutcome').mockImplementation(((...args: any[]) => {
        seen.direct.push(String(args[2]));
        return { outcome: 'defender_holds', ratio: 0.1 } as unknown as ReturnType<typeof combatPredictor.predictCombatOutcome>;
    }) as any);
    vi.spyOn(combatPredictor, 'predictAllAdjacentTargets').mockImplementation(((...args: any[]) => {
        seen.fallback.push('called');
        return [{ osid: OBJECTIVE, outcome: 'attacker_wins', ratio: 9 }] as unknown as ReturnType<typeof combatPredictor.predictAllAdjacentTargets>;
    }) as any);
    return seen;
}

describe('PRIM-A2b: the brigade attack evaluation uses the battle gate', () => {
    afterEach(() => vi.restoreAllMocks());

    it('the fixture windows are exactly the ones where the two predicates differ', () => {
        for (const w of ['washington', 'ceasefire', 'before_earliest_turn'] as const) {
            const { state } = makeFixture(w);
            expect(isRbihHrhbCombatEnabled(state)).toBe(true);
            expect(isRbihHrhbCombatBlocked(state, 'RBiH', 'HRHB')).toBe(true);
        }
        const { state } = makeFixture('war');
        expect(isRbihHrhbCombatBlocked(state, 'RBiH', 'HRHB')).toBe(false);
    });

    for (const w of ['washington', 'ceasefire', 'before_earliest_turn'] as const) {
        it(`${w}: the ally's cell is neither predicted nor attacked`, () => {
            const ctx = makeFixture(w);
            const seen = spyPredictedTargets();
            evaluateSectorAttack(ctx);
            expect(seen.direct).not.toContain(OBJECTIVE);
            expect(ctx.result.attack_orders.b1).toBeUndefined();
        });
    }

    it('at war (the battle allows the pair) the direct objective is still evaluated', () => {
        const ctx = makeFixture('war');
        const seen = spyPredictedTargets();
        evaluateSectorAttack(ctx);
        expect(seen.direct).toContain(OBJECTIVE);
    });
});
