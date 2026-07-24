import { describe, expect, it } from 'vitest';

import {
    generateCounterOffer,
    submitPlayerCounterOffer,
} from '../src/sim/negotiation/counter_offer_generator.js';
import { getCounterOfferEnvelopeForPlan } from '../src/sim/negotiation/historical_envelopes.js';
import { getPeacePlanById } from '../src/sim/negotiation/peace_plan_data.js';
import type { GameState } from '../src/state/game_state.js';

function makeState(overrides: Partial<GameState> = {}): GameState {
    return {
        schema_version: 13,
        meta: { turn: 70, phase: 'war', seed: 'counter-offer-test', player_faction: 'RBiH' },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: {
            negotiation: {
                capital: {},
                patron_relationships: {},
                peace_plan_history: [],
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
        ...overrides,
    } as GameState;
}

describe('generateCounterOffer', () => {
    it('returns null at the chain-depth cap', () => {
        const state = makeState();
        const envelope = getCounterOfferEnvelopeForPlan('owen_stoltenberg');
        const parent = {
            id: 'RBiH_001',
            plan_id: 'owen_stoltenberg',
            chain_depth: 2,
            proposed_split: { RBiH: 33, RS: 52, HRHB: 15 },
            institutional_model: 'union_3_republics',
        };

        expect(generateCounterOffer(state, 'HRHB', parent, envelope)).toBeNull();
    });

    it('returns null when the faction already countered this turn', () => {
        const state = makeState({
            political: {
                negotiation_status: {
                    ceasefire_active: false,
                    ceasefire_since_turn: null,
                    last_offer_turn: null,
                    last_counter_turn: { HRHB: 70 },
                },
            } as any,
        });
        const plan = getPeacePlanById('owen_stoltenberg')!;

        expect(generateCounterOffer(state, 'HRHB', plan, getCounterOfferEnvelopeForPlan(plan.id))).toBeNull();
    });

    it('constrains generated deltas to the cited envelope', () => {
        const state = makeState();
        const plan = getPeacePlanById('owen_stoltenberg')!;
        const counter = generateCounterOffer(state, 'RBiH', plan, getCounterOfferEnvelopeForPlan(plan.id));

        expect(counter).toMatchObject({
            id: 'RBiH_001',
            author: 'RBiH',
            parent_offer_id: 'owen_stoltenberg',
            chain_depth: 1,
            created_turn: 70,
        });
        expect(counter?.delta.response).toBe('conditional_accept');
        expect(counter?.delta.proposed_split).toEqual({ RBiH: 33, RS: 52, HRHB: 15 });
        expect(counter?.delta.source_citation).toContain('BB1 p.49');
    });

    it('does not invent counters for accept/reject-only historical envelopes', () => {
        const state = makeState({ meta: { turn: 118, phase: 'war', seed: 'counter-offer-test' } as any });
        const plan = getPeacePlanById('contact_group')!;

        expect(generateCounterOffer(state, 'RS', plan, getCounterOfferEnvelopeForPlan(plan.id))).toBeNull();
        expect(generateCounterOffer(state, 'RBiH', plan, getCounterOfferEnvelopeForPlan(plan.id))).toBeNull();
    });

    it('produces byte-identical counters for identical inputs', () => {
        const plan = getPeacePlanById('owen_stoltenberg')!;
        const envelope = getCounterOfferEnvelopeForPlan(plan.id);
        const first = generateCounterOffer(makeState(), 'HRHB', plan, envelope);
        const second = generateCounterOffer(makeState(), 'HRHB', plan, envelope);

        expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    });

    it('consumes only the exact source when the player submits a counter-offer', () => {
        const state = makeState();
        state.military.negotiation!.pending_counter_offers = [
            {
                id: 'RS_002',
                author: 'RS',
                parent_offer_id: 'owen_stoltenberg',
                delta: {
                    plan_id: 'owen_stoltenberg',
                    response: 'counter',
                    proposed_split: { RBiH: 30, RS: 55, HRHB: 15 },
                    source_citation: 'BB1 p.49',
                },
                chain_depth: 1,
                created_turn: 70,
            },
            {
                id: 'HRHB_001',
                author: 'HRHB',
                parent_offer_id: 'owen_stoltenberg',
                delta: {
                    plan_id: 'owen_stoltenberg',
                    response: 'conditional_accept',
                    proposed_split: { RBiH: 33, RS: 52, HRHB: 15 },
                    source_citation: 'BB1 p.49',
                },
                chain_depth: 1,
                created_turn: 70,
            },
            {
                id: 'RBiH_001',
                author: 'RBiH',
                parent_offer_id: 'owen_stoltenberg',
                delta: {
                    plan_id: 'owen_stoltenberg',
                    response: 'conditional_accept',
                    proposed_split: { RBiH: 33, RS: 52, HRHB: 15 },
                    source_citation: 'BB1 p.49',
                },
                chain_depth: 1,
                created_turn: 70,
            },
        ];

        const submitted = submitPlayerCounterOffer(state, {
            parentOfferId: 'HRHB_001',
            planId: 'owen_stoltenberg',
            response: 'conditional_accept',
            proposedSplit: { RBiH: 33, RS: 52, HRHB: 15 },
        });

        expect(submitted).toMatchObject({
            id: 'PLAYER_001',
            author: 'PLAYER',
            parent_offer_id: 'HRHB_001',
            chain_depth: 2,
        });
        expect(state.military.negotiation!.pending_counter_offers).toEqual([
            submitted,
            expect.objectContaining({ id: 'RBiH_001' }),
            expect.objectContaining({ id: 'RS_002' }),
        ]);
    });
});
