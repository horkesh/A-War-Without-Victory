import { describe, expect, it } from 'vitest';
import { evaluateSectorAttack } from '../src/sim/combat/bot_brigade_eval_attack.js';
import type { BrigadeEvaluationContext } from '../src/sim/combat/bot_brigade_eval_types.js';
import type { CorpsOperation, GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { makeCorps, makeFormation } from './test_factories.js';

describe('operation execution staging truth', () => {
    it('does not remarch a brigade that is already tactically adjacent to the current objective', () => {
        const state = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: { turn: 35, phase: 'war', seed: 'adjacent-staging-truth' } as any,
            factions: [
                { id: 'RS', areasOfResponsibility: [] },
                { id: 'RBiH', areasOfResponsibility: [] },
            ] as any,
            military: {
                formations: {
                    rs_corps: makeCorps({ id: 'rs_corps', faction: 'RS', hq_sid: 'S1' }),
                    b1: makeFormation({
                        id: 'b1',
                        faction: 'RS',
                        corps_id: 'rs_corps',
                        hq_sid: 'S1',
                        location_osid: 'op:front:approach_a',
                        posture: 'defend',
                        personnel: 900,
                        cohesion: 65,
                    }),
                    enemy_main: makeFormation({
                        id: 'enemy_main',
                        faction: 'RBiH',
                        corps_id: 'rbih_corps',
                        hq_sid: 'S2',
                        location_osid: 'op:target:objective',
                        personnel: 6000,
                        cohesion: 85,
                    }),
                },
                corps_front_sectors: {},
                corps_command: {},
                war_front_edges_osid: [],
            } as any,
            political: {
                political_controllers: {
                    'op:front:approach_a': 'RS',
                    'op:front:approach_b': 'RS',
                    'op:rear:hub': 'RS',
                    'op:target:objective': 'RBiH',
                },
            } as any,
        } as GameState;

        const activeOp: CorpsOperation = {
            name: 'Sarajevo Rim Push',
            type: 'sector_attack',
            phase: 'execution',
            started_turn: 30,
            phase_started_turn: 34,
            participating_brigades: ['b1'],
            objectives: ['op:target:objective'],
            current_objective_index: 0,
            attack_attempt_count: 0,
            objective_capture_count: 0,
            movement_only_execution_turns: 0,
            idle_execution_turn_streak: 0,
            failure_count: 0,
            consecutive_failures_on_current: 0,
            sector_id: 'sector:rs_corps:0',
        };

        const ctx: BrigadeEvaluationContext = {
            state,
            faction: 'RS',
            brigade: state.military.formations!.b1!,
            loc: 'op:front:approach_a',
            corpsId: 'rs_corps',
            cmd: null,
            directive: null,
            corpsStance: 'offensive',
            activeOp,
            isActiveSectorOperationParticipant: true,
            adjEnemy: ['op:target:objective'],
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
                ['op:front:approach_a', ['op:rear:hub']],
                ['op:rear:hub', ['op:front:approach_a', 'op:front:approach_b']],
                ['op:front:approach_b', ['op:rear:hub', 'op:target:objective']],
                ['op:target:objective', ['op:front:approach_b']],
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
        state.military.war_front_edges_osid = [
            {
                edge_id: 'front:approach-a-objective',
                a: 'op:front:approach_a',
                b: 'op:target:objective',
                side_a: 'RS',
                side_b: 'RBiH',
            },
        ] as any;

        const handled = evaluateSectorAttack(ctx);

        expect(handled).toBe(true);
        expect(ctx.result.attack_orders.b1).toBeUndefined();
        expect(ctx.result.column_march_orders.b1).toBeUndefined();
        expect(ctx.result.posture_orders).toContainEqual({ brigade_id: 'b1', posture: 'defend' });
    });
});
