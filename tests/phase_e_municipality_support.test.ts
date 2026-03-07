import { describe, expect, it } from 'vitest';
import { reinforceBrigadesFromPools } from '../src/sim/formation_spawn.js';
import type { GameState, MilitiaPoolState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { militiaPoolKey } from '../src/state/militia_pool_key.js';

function makePool(munId: string, faction: 'RS' | 'HRHB', available: number): MilitiaPoolState {
    return {
        mun_id: munId,
        faction,
        available,
        committed: 0,
        exhausted: 0,
        updated_turn: 4
    };
}

function makeState(
    faction: 'RS' | 'HRHB',
    extra: Record<string, unknown> = {}
): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 5, seed: 'phase-e-support', phase: 'war' as const, recruitment_mode: 'player_choice' as const },
        factions: [
            { id: faction, profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        formations: {
            b1: {
                id: 'b1',
                faction,
                name: `${faction} Brigade`,
                created_turn: 0,
                status: 'active',
                kind: 'brigade',
                readiness: 'active',
                cohesion: 52,
                personnel: 1000,
                tags: ['mun:MUN_X'],
                origin_mun: 'MUN_X',
            }
        },
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {
            [militiaPoolKey('MUN_X', faction)]: makePool('MUN_X', faction, 1000)
        },
        political_controllers: {},
        municipalities: {
            MUN_X: { stability_score: 50, control: 'consolidated' as const }
        },
        ...extra,
    } as unknown as GameState;
}

describe('Phase E municipality support', () => {
    it('applies RS staff priority as a local reinforcement-rate boost without creating new pool manpower', () => {
        const baseline = makeState('RS');
        const boosted = makeState('RS', {
            municipality_support_orders: {
                RS: {
                    faction: 'RS',
                    mun_id: 'MUN_X',
                    type: 'staff_priority',
                    staged_turn: 5,
                }
            }
        });

        reinforceBrigadesFromPools(baseline);
        reinforceBrigadesFromPools(boosted);

        expect((boosted.formations!.b1.personnel ?? 0)).toBeGreaterThan(baseline.formations!.b1.personnel ?? 0);
        expect((boosted.militia_pools![militiaPoolKey('MUN_X', 'RS')].available ?? 0))
            .toBeLessThan(baseline.militia_pools![militiaPoolKey('MUN_X', 'RS')].available ?? 0);
    });

    it('applies an HRHB support package as a local cohesion bonus when reinforcement occurs', () => {
        const baseline = makeState('HRHB');
        const boosted = makeState('HRHB', {
            municipality_support_orders: {
                HRHB: {
                    faction: 'HRHB',
                    mun_id: 'MUN_X',
                    type: 'croatian_support_package',
                    staged_turn: 5,
                }
            }
        });

        reinforceBrigadesFromPools(baseline);
        reinforceBrigadesFromPools(boosted);

        expect(boosted.formations!.b1.personnel).toBe(baseline.formations!.b1.personnel);
        expect((boosted.formations!.b1.cohesion ?? 0)).toBeGreaterThan(baseline.formations!.b1.cohesion ?? 0);
    });
});
