import type { CounterOfferFaction, CounterOfferResponse } from '../../state/negotiation_types.js';
import { getPeacePlanById } from './peace_plan_data.js';

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

// Single owner: the plan definitions (peace_plan_data.ts, corrected 2026-11-07 against the
// UN maps; docs/40_reports/20261107_PEACE_PLANS_RESEARCH.md). Previously duplicated here.
function planSplit(planId: string): Record<CounterOfferFaction, number> {
    const split = getPeacePlanById(planId)?.proposed_split;
    if (!split) throw new Error(`historical_envelopes: no proposed_split for ${planId}`);
    return { RBiH: split.RBiH, RS: split.RS, HRHB: split.HRHB };
}
const EXACT_OS_SPLIT = planSplit('owen_stoltenberg');
const EXACT_CONTACT_GROUP_SPLIT = planSplit('contact_group');
const EXACT_VANCE_OWEN_SPLIT = planSplit('vance_owen');

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
        source_citation: 'BB1 p.47; BB1 p.49',
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
                source_citation: 'BB1 p.47', // RS Assembly accepted unconditionally, 28 Aug 1993 (p.45 is the 19 Jun proposal)
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
