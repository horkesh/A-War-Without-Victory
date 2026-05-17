import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';
import {
    getFactionLiveSupplyCondition,
    getFactionLiveSupplyPressure,
} from '../src/sim/combat/supply_condition.js';
import { computeFactionPoolPressureFactor } from '../src/sim/combat/corps_operation_readiness.js';

// Direct `war_supply_pressure` readers audited 2026-05-17:
// - src/sim/combat/supply_condition.ts:100, helper fallback only.
// - src/sim/combat/supply_pressure.ts:105-124, cumulative writer only.
// - src/scenario/scenario_reporting.ts:160, report field only; live condition is adjacent at :161.
// All current-supply decision readers must use getFactionLiveSupplyPressure/Condition.

function makeState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 12,
            seed: 'supply-pressure-condition-reconciliation',
            phase: 'war',
            scenario_start_date: { year: 1992, month: 4, day: 6 },
            referendum_held: true,
            referendum_turn: 1,
            war_start_turn: 1,
        },
        factions: [
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
        ],
        political: {
            political_controllers: {},
            war_supply_pressure: { RBiH: 19 },
            war_supply_condition: { RBiH: 81 },
        },
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        },
        displacement: {},
    } as unknown as GameState;
}

describe('war_supply_pressure vs war_supply_condition reconciliation', () => {
    it('current supply truth prefers live condition over cumulative legacy pressure', () => {
        const state = makeState();

        expect(getFactionLiveSupplyCondition(state, 'RBiH')).toBe(81);
        expect(getFactionLiveSupplyPressure(state, 'RBiH')).toBe(19);
        expect(computeFactionPoolPressureFactor(state, 'RBiH')).toBeCloseTo(19 / 100, 6);
    });

    it('documents war_supply_pressure as cumulative and keeps direct sim readers fenced', () => {
        const gameStateSource = readFileSync('src/state/game_state.ts', 'utf8');
        expect(gameStateSource).toContain('Cumulative supply pressure');

        const readinessSource = readFileSync('src/sim/combat/corps_operation_readiness.ts', 'utf8');
        expect(readinessSource).toContain('state.political.war_supply_condition');
        expect(readinessSource).not.toContain('state.political.war_supply_condition/pressure');
    });
});
