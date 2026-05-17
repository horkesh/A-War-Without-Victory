import type { CounterOfferFaction, CounterOfferResponse } from '../../state/negotiation_types.js';

export interface HistoricalCounterOfferFactionEnvelope {
    response: CounterOfferResponse;
    counter_legal: boolean;
    proposed_split: Record<CounterOfferFaction, number>;
    institutional_model?: string;
    rider?: string;
    source_citation: string;
}

export interface HistoricalCounterOfferEnvelope {
    plan_id: string;
    source_citation: string;
    delta_bounds_per_faction: Record<CounterOfferFaction, HistoricalCounterOfferFactionEnvelope>;
}

const EXACT_OS_SPLIT: Record<CounterOfferFaction, number> = { RBiH: 33, RS: 52, HRHB: 15 };
const EXACT_CONTACT_GROUP_SPLIT: Record<CounterOfferFaction, number> = { RBiH: 33, RS: 49, HRHB: 18 };
const EXACT_VANCE_OWEN_SPLIT: Record<CounterOfferFaction, number> = { RBiH: 39, RS: 43, HRHB: 18 };

export const HISTORICAL_COUNTER_OFFER_ENVELOPES: readonly HistoricalCounterOfferEnvelope[] = [
    {
        plan_id: 'vance_owen',
        source_citation: 'BB1 p.44',
        delta_bounds_per_faction: {
            HRHB: {
                response: 'accept',
                counter_legal: false,
                proposed_split: EXACT_VANCE_OWEN_SPLIT,
                institutional_model: '10_provinces',
                source_citation: 'BB1 p.44',
            },
            RBiH: {
                response: 'accept',
                counter_legal: false,
                proposed_split: EXACT_VANCE_OWEN_SPLIT,
                institutional_model: '10_provinces',
                source_citation: 'BB1 p.44',
            },
            RS: {
                response: 'reject',
                counter_legal: false,
                proposed_split: EXACT_VANCE_OWEN_SPLIT,
                institutional_model: '10_provinces',
                source_citation: 'BB1 p.44',
            },
        },
    },
    {
        plan_id: 'owen_stoltenberg',
        source_citation: 'BB1 p.45; BB1 p.49',
        delta_bounds_per_faction: {
            HRHB: {
                response: 'conditional_accept',
                counter_legal: true,
                proposed_split: EXACT_OS_SPLIT,
                institutional_model: 'union_3_republics',
                rider: 'withdraw territorial concessions made to Bosnian Muslims',
                source_citation: 'BB1 p.49',
            },
            RBiH: {
                response: 'conditional_accept',
                counter_legal: true,
                proposed_split: EXACT_OS_SPLIT,
                institutional_model: 'union_3_republics',
                rider: 'return territory seized by force',
                source_citation: 'BB1 p.49',
            },
            RS: {
                response: 'accept',
                counter_legal: false,
                proposed_split: EXACT_OS_SPLIT,
                institutional_model: 'union_3_republics',
                source_citation: 'BB1 p.45',
            },
        },
    },
    {
        plan_id: 'contact_group',
        source_citation: 'BB1 p.57; BB1 p.58; BB1 p.61',
        delta_bounds_per_faction: {
            HRHB: {
                response: 'accept',
                counter_legal: false,
                proposed_split: EXACT_CONTACT_GROUP_SPLIT,
                institutional_model: '51_49_entities',
                source_citation: 'BB1 p.58',
            },
            RBiH: {
                response: 'accept',
                counter_legal: false,
                proposed_split: EXACT_CONTACT_GROUP_SPLIT,
                institutional_model: '51_49_entities',
                source_citation: 'BB1 p.58',
            },
            RS: {
                response: 'reject',
                counter_legal: false,
                proposed_split: EXACT_CONTACT_GROUP_SPLIT,
                institutional_model: '51_49_entities',
                source_citation: 'BB1 p.57; BB1 p.61',
            },
        },
    },
];

export function getCounterOfferEnvelopeForPlan(planId: string): HistoricalCounterOfferEnvelope | null {
    return HISTORICAL_COUNTER_OFFER_ENVELOPES.find((entry) => entry.plan_id === planId) ?? null;
}
