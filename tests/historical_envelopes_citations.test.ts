import { describe, expect, it } from 'vitest';

import {
    HISTORICAL_COUNTER_OFFER_ENVELOPES,
    getCounterOfferEnvelopeForPlan,
} from '../src/sim/negotiation/historical_envelopes.js';

describe('historical counter-offer envelopes', () => {
    it('encodes only BB-cited non-Dayton negotiation envelopes', () => {
        expect(HISTORICAL_COUNTER_OFFER_ENVELOPES.map((entry) => entry.plan_id)).toEqual([
            'vance_owen',
            'owen_stoltenberg',
            'contact_group',
        ]);
        expect(getCounterOfferEnvelopeForPlan('dayton')).toBeNull();
    });

    it('keeps every encoded envelope citation-backed', () => {
        for (const envelope of HISTORICAL_COUNTER_OFFER_ENVELOPES) {
            expect(envelope.source_citation.trim().length).toBeGreaterThan(0);
            for (const factionEnvelope of Object.values(envelope.delta_bounds_per_faction)) {
                expect(factionEnvelope.source_citation.trim().length).toBeGreaterThan(0);
            }
        }
    });
});
