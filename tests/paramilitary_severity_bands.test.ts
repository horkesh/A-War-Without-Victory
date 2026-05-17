import { describe, expect, it } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import { classifyParamilitaryDeploymentBand } from '../src/sim/combat/paramilitary_sweep.js';
import {
    computeNegotiationBreakdown,
    computeParamilitaryInternationalStandingPenalty,
} from '../src/sim/negotiation/compute_capital.js';

function makeState(deployments: number): GameState {
    return {
        meta: { turn: 12, phase: 'war', seed: 1, date: '1992-06-24' },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        paramilitary_deployment_count: { RS: deployments },
        military: {
            formations: {},
            cost_ledger_annotations: [{
                event_id: 'cost_war_crimes_findings_RS',
                tag: `paramilitary_war_crimes_${classifyParamilitaryDeploymentBand(deployments)}`,
                text: `deployment_count=${deployments}`,
                turn: 12,
                faction: 'RS',
            }],
        },
        political: { political_controllers: {}, war_alliance_rbih_hrhb: 1 },
        displacement: {
            displacement_humanitarian_aggregates: {
                RS: {
                    RBiH: {
                        refugees_created: 0,
                        refugees_received: 0,
                        civilian_casualties_caused: 0,
                    },
                },
            },
        },
    } as unknown as GameState;
}

describe('paramilitary severity bands', () => {
    it.each([
        [1, 'minor', 2, 48],
        [4, 'mid', 16, 34],
        [10, 'severe', 60, 0],
    ] as const)('classifies %i deployments as %s and applies exact international-standing penalty', (deployments, band, expectedPenalty, expectedStanding) => {
        expect(classifyParamilitaryDeploymentBand(deployments)).toBe(band);
        expect(computeParamilitaryInternationalStandingPenalty(band, deployments)).toBe(expectedPenalty);

        const state = makeState(deployments);
        computeNegotiationBreakdown(state);

        expect(state.military.negotiation!.strategic_dimensions!.RS.international_standing.base_value)
            .toBe(expectedStanding);
    });
});
