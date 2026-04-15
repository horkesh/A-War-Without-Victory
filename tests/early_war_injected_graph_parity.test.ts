/**
 * Phase 4: Injected settlement graph parity.
 * runTurn(state, { seed, settlementGraph }) must produce the same nextState as
 * runTurn(state, { seed }) when settlementGraph is the graph from loadSettlementGraph().
 */

import { expect, test } from 'vitest';
import { loadSettlementGraph } from '../src/map/settlements.js';
import { runTurn } from '../src/sim/turn_pipeline.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function cloneState(state: GameState): GameState {
    return JSON.parse(JSON.stringify(state)) as GameState;
}

function minimalPhaseIState(): GameState {
    return {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: {
            turn: 10,
            seed: 'injected-graph-parity',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 6,
            war_start_turn: 10
        },
  factions: [
            {
                id: 'RBiH',
                profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
                declared: false,
                declaration_turn: null
            },
            {
                id: 'RS',
                profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
                declared: false,
                declaration_turn: null
            },
            {
                id: 'HRHB',
                profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 },
                areasOfResponsibility: [],
                supply_sources: [],
                declared: false,
                declaration_turn: null
            }
        ],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    war_militia_strength: {
            MUN_A: { RBiH: 30, RS: 60, HRHB: 10 },
            MUN_B: { RBiH: 25, RS: 70, HRHB: 5 }
        }
  } as any,
  political: {
    political_controllers: { s1: 'RBiH', s2: 'RS' },
    municipalities: { MUN_A: { stability_score: 50 }, MUN_B: { stability_score: 50 } },
    war_consolidation_until: {}
  } as any,
        displacement: {} as any
    };
}

test('Peace phase: injected settlementGraph produces same nextState as loadSettlementGraph path', async () => {
    const graph = await loadSettlementGraph();
    const seed = 'injected-graph-parity';
    const initial = minimalPhaseIState();
    const stateA = cloneState(initial);
    const stateB = cloneState(initial);

    const { nextState: nextA } = await runTurn(stateA, { seed, settlementGraph: graph });
    const { nextState: nextB } = await runTurn(stateB, { seed });

    expect(nextA.meta.turn).toBe(nextB.meta.turn);
    expect(nextA.meta.phase).toBe(nextB.meta.phase);

    const keysA = Object.keys(nextA.political.political_controllers ?? {}).sort((a, b) => a.localeCompare(b));
    const keysB = Object.keys(nextB.political.political_controllers ?? {}).sort((a, b) => a.localeCompare(b));
    expect(keysA).toEqual(keysB);

    for (const k of keysA) {
        expect((nextA.political.political_controllers as Record<string, string | null>)[k]).toBe((nextB.political.political_controllers as Record<string, string | null>)[k]);
    }

    const formationsA = Object.keys(nextA.military.formations ?? {}).sort((a, b) => a.localeCompare(b));
    const formationsB = Object.keys(nextB.military.formations ?? {}).sort((a, b) => a.localeCompare(b));
    expect(formationsA).toEqual(formationsB);
});
