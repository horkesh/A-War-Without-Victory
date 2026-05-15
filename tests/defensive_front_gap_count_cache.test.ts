import { describe, expect, it } from 'vitest';

import { evaluateDefensive } from '../src/sim/combat/bot_brigade_eval_attack.js';
import { buildCorpsBrigadeCountsByOsid } from '../src/sim/combat/bot_brigade_context.js';
import type { BrigadeEvaluationContext } from '../src/sim/combat/bot_brigade_eval_types.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';
import type { GameState } from '../src/state/game_state.js';

describe('evaluateDefensive front-gap count cache', () => {
    it('uses cached faction count for current-position defensive gap fill', () => {
        const loc = 'op:test:front' as Osid;
        const gap = 'op:test:gap' as Osid;
        const support = 'op:test:support' as Osid;
        const enemy = 'op:enemy:near' as Osid;
        const state = {
            meta: { turn: 4 },
            military: {
                formations: {
                    brig_test: {
                        id: 'brig_test',
                        faction: 'RBiH',
                        status: 'active',
                        kind: 'brigade',
                        corps_id: 'arbih_1st_corps',
                        location_osid: loc,
                        personnel: 1200,
                        cohesion: 60,
                    },
                },
            },
            political: {
                political_controllers: {
                    [loc]: 'RBiH',
                    [gap]: 'RBiH',
                    [support]: 'RBiH',
                    [enemy]: 'RS',
                },
            },
        } as unknown as GameState;
        const result = {
            posture_orders: [],
            attack_orders: {},
            attack_scores: {},
            movement_orders: {},
            column_march_orders: {},
            eligible_attackers_by_corps: {},
        };
        const counts = buildCorpsBrigadeCountsByOsid(state, 'RBiH');
        counts.get('__all__')?.set(loc, 2);
        const ctx = {
            state,
            faction: 'RBiH',
            brigade: state.military.formations!.brig_test!,
            loc,
            corpsId: 'arbih_1st_corps',
            cmd: null,
            directive: null,
            corpsStance: 'defensive',
            activeOp: null,
            isActiveSectorOperationParticipant: false,
            adjEnemy: [enemy],
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
            corpsBrigadeCountsByOsid: counts,
            adjacency: new Map<Osid, Osid[]>([
                [loc, [gap]],
                [gap, [loc, support, enemy]],
                [support, [gap]],
                [enemy, [gap]],
            ]),
            reverseMap: new Map(),
            terrainCache: {},
            graphAnalysis: {
                osid_analysis: new Map([
                    [loc, { enemy_neighbors: [enemy], friendly_neighbors: [gap], classification: 'contested' }],
                    [gap, { enemy_neighbors: [enemy], friendly_neighbors: [loc, support], classification: 'undefended' }],
                ]),
            },
            result,
        } as unknown as BrigadeEvaluationContext;

        const handled = evaluateDefensive(ctx);

        expect(handled).toBe(true);
        expect((result.movement_orders as Record<string, Osid>).brig_test).toBe(gap);
        expect(result.posture_orders).toContainEqual({ brigade_id: 'brig_test', posture: 'defend' });
    });
});
