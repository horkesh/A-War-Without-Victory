import { describe, expect, it } from 'vitest';
import { evaluateReturnToCorps } from '../src/sim/combat/bot_brigade_eval_front.js';
import type { BrigadeEvaluationContext } from '../src/sim/combat/bot_brigade_eval_types.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

function makeContext(overrides: Partial<BrigadeEvaluationContext> = {}): BrigadeEvaluationContext {
    return {
        state: {
            political: {
                political_controllers: {
                    'op:home:a': 'RBiH',
                    'op:mid:b': 'RBiH',
                    'op:front:c': 'RBiH',
                },
            },
            military: {
                corps_front_sectors: {
                    'sector:arbih_2nd_corps:0': {
                        sector_id: 'sector:arbih_2nd_corps:0',
                        corps_id: 'arbih_2nd_corps',
                        faction: 'RBiH',
                        opposing_factions: ['RS'],
                        edge_ids: [],
                        sub_segments: [],
                        length_edges: 0,
                        territory_osids: ['op:front:c'],
                        assigned_brigade_ids: [],
                        reserve_brigade_ids: [],
                        density: 0,
                        threat_ratio: 0,
                        defensive_power: 0,
                        sector_stance: 'defend',
                        stance_source: 'bot',
                    },
                },
            },
        } as any,
        faction: 'RBiH' as any,
        brigade: {
            id: 'arbih_120th_liberation_black_swans',
            faction: 'RBiH',
            corps_id: 'arbih_general_staff',
            status: 'active',
            kind: 'brigade',
            location_osid: 'op:home:a',
            elite_loan_state: {
                on_loan: true,
                loaned_to_corps: 'arbih_2nd_corps',
            },
        } as any,
        loc: 'op:home:a' as Osid,
        corpsId: 'arbih_2nd_corps',
        cmd: null,
        directive: null,
        corpsStance: 'balanced' as any,
        activeOp: null,
        isActiveSectorOperationParticipant: false,
        adjEnemy: [],
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
        adjacency: new Map<Osid, Osid[]>([
            ['op:home:a' as Osid, ['op:mid:b' as Osid]],
            ['op:mid:b' as Osid, ['op:home:a' as Osid, 'op:front:c' as Osid]],
            ['op:front:c' as Osid, ['op:mid:b' as Osid]],
        ]),
        reverseMap: null as any,
        terrainCache: {},
        graphAnalysis: {} as any,
        supplyStateByOsid: null,
        ethnicMap: undefined,
        osidPopulationMap: undefined,
        result: {
            attack_orders: {},
            posture_orders: [],
            movement_orders: {},
            column_march_orders: {},
            eligible_attackers_by_corps: {},
        } as any,
        ...overrides,
    };
}

describe('evaluateReturnToCorps', () => {
    it('routes on-loan elite brigades toward the receiving corps territory', () => {
        const ctx = makeContext();
        const handled = evaluateReturnToCorps(ctx);
        expect(handled).toBe(true);
        expect(ctx.result.movement_orders[ctx.brigade.id]).toBe('op:mid:b');
    });
});
