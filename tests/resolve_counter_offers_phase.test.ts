import { describe, expect, it } from 'vitest';

import { resolveCounterOffers } from '../src/sim/negotiation/counter_offer_generator.js';
import { warPhaseNegotiationSteps } from '../src/sim/turn_phases/war_phase_negotiation_steps.js';
import { warPhases } from '../src/sim/turn_phases/war_phases.js';
import type { GameState } from '../src/state/game_state.js';

function makeState(): GameState {
    return {
        schema_version: 13,
        meta: { turn: 70, phase: 'war', seed: 'resolve-counter-offers', player_faction: 'RS' },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: {
            negotiation: {
                capital: {},
                patron_relationships: {},
                peace_plan_history: [],
                pending_peace_plan: {
                    plan_id: 'owen_stoltenberg',
                    turn_offered: 70,
                    bot_responses: { RBiH: 'rejected', HRHB: 'accepted' },
                },
                pending_counter_offers: [],
            },
        },
        political: {
            negotiation_status: {
                ceasefire_active: false,
                ceasefire_since_turn: null,
                last_offer_turn: null,
                last_counter_turn: {},
            },
        },
        displacement: {},
    } as unknown as GameState;
}

describe('resolve-counter-offers phase', () => {
    it('is ordered immediately after evaluate-peace-plans in the negotiation helper slice', () => {
        const helperNames = warPhaseNegotiationSteps.map((step) => step.name);
        expect(helperNames.slice(0, 2)).toEqual(['evaluate-peace-plans', 'resolve-counter-offers']);

        const allNames = warPhases.map((step) => step.name);
        expect(allNames.indexOf('resolve-counter-offers')).toBeGreaterThan(allNames.indexOf('evaluate-peace-plans'));
        expect(allNames.indexOf('resolve-counter-offers')).toBeLessThan(allNames.indexOf('check-victory-conditions'));
    });

    it('appends deterministic bot counters and updates last_counter_turn only for emitting factions', () => {
        const state = makeState();

        const report = resolveCounterOffers(state);

        expect(report.created_counter_offer_ids).toEqual(['HRHB_001', 'RBiH_001']);
        expect(state.military.negotiation?.pending_counter_offers?.map((offer) => offer.id)).toEqual(['HRHB_001', 'RBiH_001']);
        expect(state.political.negotiation_status?.last_counter_turn).toEqual({ HRHB: 70, RBiH: 70 });
    });
});
