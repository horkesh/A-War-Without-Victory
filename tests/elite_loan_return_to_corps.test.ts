import { describe, expect, it } from 'vitest';
import { evaluateReturnToCorps } from '../src/sim/combat/bot_brigade_eval_front.js';
import * as botBrigadeContext from '../src/sim/combat/bot_brigade_context.js';
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
    it('does not recall an active operation participant away from its staging area', () => {
        const ctx = makeContext({ isActiveSectorOperationParticipant: true });

        const handled = evaluateReturnToCorps(ctx);

        expect(handled).toBe(false);
        expect(ctx.result.movement_orders[ctx.brigade.id]).toBeUndefined();
    });

    it('routes on-loan elite brigades toward the receiving corps territory', () => {
        const ctx = makeContext();
        const handled = evaluateReturnToCorps(ctx);
        expect(handled).toBe(true);
        expect(ctx.result.movement_orders[ctx.brigade.id]).toBe('op:mid:b');
    });

    it('uses cached sector assignment membership to skip already-rostered brigades', () => {
        const ctx = makeContext();
        const sector = ctx.state.military.corps_front_sectors!['sector:arbih_2nd_corps:0']!;
        ctx.sectorAssignment = {
            sector,
            isReserve: false,
            frontOsids: new Set(sector.territory_osids),
        };

        const handled = evaluateReturnToCorps(ctx);

        expect(handled).toBe(false);
        expect(ctx.result.movement_orders[ctx.brigade.id]).toBeUndefined();
    });

    it('uses cached corps territory to skip brigades already inside the receiving corps footprint', () => {
        const ctx = makeContext() as BrigadeEvaluationContext & {
            corpsTerritoryOsidsByCorps: Map<string, Set<string>>;
        };
        ctx.corpsTerritoryOsidsByCorps = new Map([
            ['arbih_2nd_corps', new Set(['op:home:a', 'op:front:c'])],
        ]);

        const handled = evaluateReturnToCorps(ctx);

        expect(handled).toBe(false);
        expect(ctx.result.movement_orders[ctx.brigade.id]).toBeUndefined();
    });
});

describe('buildCorpsTerritoryOsidsByCorps', () => {
    it('builds deterministic corps territory sets from sorted sector ids', () => {
        const build = (botBrigadeContext as {
            buildCorpsTerritoryOsidsByCorps?: (state: unknown) => Map<string, Set<string>>;
        }).buildCorpsTerritoryOsidsByCorps;
        expect(build).toBeTypeOf('function');

        const cache = build!({
            military: {
                corps_front_sectors: {
                    'sector:z': {
                        corps_id: 'arbih_2nd_corps',
                        territory_osids: ['op:z'],
                    },
                    'sector:a': {
                        corps_id: 'arbih_2nd_corps',
                        territory_osids: ['op:a'],
                    },
                    'sector:b': {
                        corps_id: 'arbih_3rd_corps',
                        territory_osids: ['op:b'],
                    },
                },
            },
        });

        expect([...cache.keys()]).toEqual(['arbih_2nd_corps', 'arbih_3rd_corps']);
        expect([...(cache.get('arbih_2nd_corps') ?? [])]).toEqual(['op:a', 'op:z']);
        expect([...(cache.get('arbih_3rd_corps') ?? [])]).toEqual(['op:b']);
    });
});
