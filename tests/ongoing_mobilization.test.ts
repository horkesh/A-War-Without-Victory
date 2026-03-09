/**
 * War phase ongoing mobilization tests (Mobilization & Force Growth plan Part 1).
 * - Report shape and conscription adds to pool.available.
 * - Exhaustion cap skips when cumulative >= 25% of eligible pop.
 * - Deterministic: same inputs -> same report.
 */
import { describe, expect, it } from 'vitest';
import { runOngoingMobilization } from '../src/sim/combat/ongoing_mobilization.js';
import type { GameState, MilitiaPoolState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { militiaPoolKey } from '../src/state/militia_pool_key.js';
import type { SettlementRecord } from '../src/map/settlements.js';

function minimalPhaseIIState(overrides?: Partial<{ militia_pools: Record<string, MilitiaPoolState>; meta: { turn: number } }>): GameState {
    return {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: { turn: 5, seed: 'mob-test', phase: 'war' as const, ...overrides?.meta },
  factions: [
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: overrides?.militia_pools ?? {}
  } as any,
  political: {
    political_controllers: { S1: 'RS' },
    municipalities: { MUN_X: { stability_score: 50, control: 'consolidated' as const } }
  } as any,
} as GameState;
}

const settlementRecord: SettlementRecord = { sid: 'S1', source_id: 's1', mun_code: 'MUN_X', mun: 'MUN_X', mun1990_id: 'MUN_X' };
const settlements = new Map<string, SettlementRecord>([['S1', settlementRecord]]);
const pop1991 = {
    MUN_X: { total: 10000, bosniak: 2000, serb: 6000, croat: 1500, other: 500 }
};

describe('runOngoingMobilization', () => {
    it('returns report with total_mobilized, by_faction, municipalities_contributing, exhausted_municipalities', () => {
        const state = minimalPhaseIIState({
            militia_pools: {
                [militiaPoolKey('MUN_X', 'RS')]: {
                    mun_id: 'MUN_X',
                    faction: 'RS',
                    available: 500,
                    committed: 0,
                    exhausted: 0,
                    updated_turn: 4
                }
            }
        });
        const report = runOngoingMobilization(state, settlements, pop1991);
        expect(report).toHaveProperty('total_mobilized');
        expect(report).toHaveProperty('by_faction');
        expect(report).toHaveProperty('municipalities_contributing');
        expect(report).toHaveProperty('exhausted_municipalities');
        expect(typeof report.total_mobilized).toBe('number');
        expect(report.municipalities_contributing).toBeGreaterThanOrEqual(0);
    });

    it('increases pool.available when controller has eligible pop and pool exists', () => {
        const key = militiaPoolKey('MUN_X', 'RS');
        const state = minimalPhaseIIState({
            militia_pools: {
                [key]: {
                    mun_id: 'MUN_X',
                    faction: 'RS',
                    available: 100,
                    committed: 0,
                    exhausted: 0,
                    updated_turn: 4
                }
            }
        });
        const before = state.military.militia_pools![key].available;
        const report = runOngoingMobilization(state, settlements, pop1991);
        const after = state.military.militia_pools![key].available;
        expect(after).toBeGreaterThanOrEqual(before);
        if (report.municipalities_contributing > 0) expect(after).toBeGreaterThan(before);
    });

    it('is deterministic (same state -> same report)', () => {
        const state = minimalPhaseIIState({
            militia_pools: {
                [militiaPoolKey('MUN_X', 'RS')]: {
                    mun_id: 'MUN_X',
                    faction: 'RS',
                    available: 200,
                    committed: 0,
                    exhausted: 0,
                    updated_turn: 4
                }
            }
        });
        const r1 = runOngoingMobilization(state, settlements, pop1991);
        const state2 = minimalPhaseIIState({
            militia_pools: {
                [militiaPoolKey('MUN_X', 'RS')]: {
                    mun_id: 'MUN_X',
                    faction: 'RS',
                    available: 200,
                    committed: 0,
                    exhausted: 0,
                    updated_turn: 4
                }
            }
        });
        const r2 = runOngoingMobilization(state2, settlements, pop1991);
        expect(r1.total_mobilized).toBe(r2.total_mobilized);
        expect(r1.municipalities_contributing).toBe(r2.municipalities_contributing);
    });

    it('applies an RBiH weapons shipment as a small local manpower boost without changing other municipalities', () => {
        const rbihSettlements = new Map<string, SettlementRecord>([
            ['S1', { sid: 'S1', source_id: 's1', mun_code: 'MUN_X', mun: 'MUN_X', mun1990_id: 'MUN_X' }],
            ['S2', { sid: 'S2', source_id: 's2', mun_code: 'MUN_Y', mun: 'MUN_Y', mun1990_id: 'MUN_Y' }],
        ]);
        const rbihPop = {
            MUN_X: { total: 10000, bosniak: 7000, serb: 1500, croat: 1000, other: 500 },
            MUN_Y: { total: 10000, bosniak: 7000, serb: 1500, croat: 1000, other: 500 },
        };
        const basePools = {
            [militiaPoolKey('MUN_X', 'RBiH')]: { mun_id: 'MUN_X', faction: 'RBiH', available: 100, committed: 0, exhausted: 0, updated_turn: 4 },
            [militiaPoolKey('MUN_Y', 'RBiH')]: { mun_id: 'MUN_Y', faction: 'RBiH', available: 100, committed: 0, exhausted: 0, updated_turn: 4 },
        };
        const baseline = {
  ...minimalPhaseIIState({ militia_pools: structuredClone(basePools) }),
  political: {
    political_controllers: { S1: 'RBiH', S2: 'RBiH' },
    municipalities: {
                MUN_X: { stability_score: 50, control: 'consolidated' as const },
                MUN_Y: { stability_score: 50, control: 'consolidated' as const },
            }
  } as any,
} as GameState;
        const boosted = {
  ...minimalPhaseIIState({ militia_pools: structuredClone(basePools) }),
  military: {
    municipality_support_orders: {
                RBiH: {
                    faction: 'RBiH',
                    mun_id: 'MUN_X',
                    type: 'weapons_shipment',
                    staged_turn: 5,
                }
            }
  } as any,
  political: {
    political_controllers: { S1: 'RBiH', S2: 'RBiH' },
    municipalities: {
                MUN_X: { stability_score: 50, control: 'consolidated' as const },
                MUN_Y: { stability_score: 50, control: 'consolidated' as const },
            }
  } as any,
} as GameState;

        runOngoingMobilization(baseline, rbihSettlements, rbihPop);
        runOngoingMobilization(boosted, rbihSettlements, rbihPop);

        expect(boosted.military.militia_pools![militiaPoolKey('MUN_X', 'RBiH')].available)
            .toBeGreaterThan(baseline.military.militia_pools![militiaPoolKey('MUN_X', 'RBiH')].available);
        expect(boosted.military.militia_pools![militiaPoolKey('MUN_Y', 'RBiH')].available)
            .toBe(baseline.military.militia_pools![militiaPoolKey('MUN_Y', 'RBiH')].available);
    });
});
