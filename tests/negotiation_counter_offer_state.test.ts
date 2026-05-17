import { describe, expect, it } from 'vitest';

import { serializeGameState } from '../src/state/serializeGameState.js';
import { sortCounterOffers } from '../src/sim/negotiation/counter_offer_generator.js';
import type { CounterOffer } from '../src/state/negotiation_types.js';

function makeCounter(id: string): CounterOffer {
    return {
        id,
        author: id.startsWith('PLAYER') ? 'PLAYER' : id.split('_')[0] as CounterOffer['author'],
        parent_offer_id: 'vance_owen',
        delta: {
            plan_id: 'vance_owen',
            response: 'conditional_accept',
            proposed_split: { RBiH: 39, RS: 43, HRHB: 18 },
            source_citation: 'BB1 p.44',
        },
        chain_depth: 1,
        created_turn: 40,
    };
}

describe('negotiation counter-offer state', () => {
    it('sorts pending counter offers by strict id ordering before serialization', () => {
        const pending = [
            makeCounter('RS_002'),
            makeCounter('RBiH_001'),
            makeCounter('HRHB_001'),
        ];

        const state = {
            schema_version: 13,
            meta: { turn: 40, phase: 'war' },
            military: {
                negotiation: {
                    capital: {},
                    patron_relationships: {},
                    peace_plan_history: [],
                    pending_counter_offers: sortCounterOffers(pending),
                },
            },
            political: {
                political_controllers: {},
                negotiation_status: {
                    ceasefire_active: false,
                    ceasefire_since_turn: null,
                    last_offer_turn: null,
                    last_counter_turn: {},
                },
            },
            displacement: {},
        } as any;

        expect(state.military.negotiation.pending_counter_offers.map((offer: CounterOffer) => offer.id)).toEqual([
            'HRHB_001',
            'RBiH_001',
            'RS_002',
        ]);
        expect(serializeGameState(state)).toContain('"pending_counter_offers"');
    });
});
