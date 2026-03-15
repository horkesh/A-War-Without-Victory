/**
 * Historical peace plan definitions for the Bosnian War (1992-1995).
 *
 * Each plan has a trigger_week (weeks from April 1992 scenario start),
 * proposed territorial split, institutional model, and consequences for rejection.
 *
 * Deterministic: constant data, no randomness.
 */

import type { PeacePlanDefinition } from '../../state/negotiation_types.js';

/**
 * Cutileiro Plan (Lisbon Agreement), March 1992.
 * Proposed ethnic cantonization of BiH into three constituent units.
 * Trigger: week ~0 (pre-war, but included for completeness in Apr 1992 scenarios).
 */
const CUTILEIRO_PLAN: PeacePlanDefinition = {
    id: 'cutileiro',
    name: 'Cutileiro Plan (Lisbon Agreement)',
    trigger_week: 0,
    proposed_split: {
        RBiH: 44,
        RS: 44,
        HRHB: 12,
    },
    institutional_model: 'cantonization',
    override_change_on_reject: {
        RBiH: 5,
        RS: 5,
        HRHB: 5,
    },
    credibility_change_on_reject: {
        RBiH: -5,
        RS: -5,
        HRHB: -5,
    },
    narrative: 'The EC-brokered Cutileiro Plan proposes dividing Bosnia-Herzegovina into three '
        + 'ethnically-defined cantons under a weak central government. Each constituent people '
        + 'would govern areas where they form a majority. The split would give Bosniaks and Serbs '
        + '44% each, with Croats receiving 12%. All three sides initially agreed in Lisbon, but '
        + 'the deal is fragile — rejection by any party will signal that partition cannot be '
        + 'achieved through negotiation alone.',
};

/**
 * Vance-Owen Peace Plan, January 1993.
 * 10 decentralized provinces (3 Bosniak-majority, 3 Serb-majority, 3 Croat-majority, 1 mixed Sarajevo).
 * Trigger: week ~40 (roughly January 1993).
 */
const VANCE_OWEN_PLAN: PeacePlanDefinition = {
    id: 'vance_owen',
    name: 'Vance-Owen Peace Plan',
    trigger_week: 40,
    proposed_split: {
        RBiH: 53,
        RS: 30,
        HRHB: 17,
    },
    institutional_model: '10_provinces',
    override_change_on_reject: {
        RBiH: 5,
        RS: 15,
        HRHB: 5,
    },
    credibility_change_on_reject: {
        RBiH: -5,
        RS: -20,
        HRHB: -5,
    },
    narrative: 'UN mediators Cyrus Vance and Lord Owen propose dividing Bosnia into 10 '
        + 'decentralized provinces — three Bosniak-majority, three Serb-majority, three '
        + 'Croat-majority, and a mixed Sarajevo district. The plan would require the VRS to '
        + 'withdraw from roughly 30% of the territory it currently holds. The Bosnian Serb '
        + 'assembly has indicated fierce opposition. Rejection by RS will dramatically increase '
        + 'international pressure and may trigger sanctions from Belgrade itself.',
};

/**
 * Owen-Stoltenberg Plan, August 1993.
 * Union of three ethnically-defined republics within BiH.
 * Trigger: week ~70 (roughly August 1993).
 */
const OWEN_STOLTENBERG_PLAN: PeacePlanDefinition = {
    id: 'owen_stoltenberg',
    name: 'Owen-Stoltenberg Plan',
    trigger_week: 70,
    proposed_split: {
        RBiH: 53,
        RS: 30,
        HRHB: 17,
    },
    institutional_model: 'union_3_republics',
    override_change_on_reject: {
        RBiH: 10,
        RS: 5,
        HRHB: 10,
    },
    credibility_change_on_reject: {
        RBiH: -10,
        RS: -5,
        HRHB: -10,
    },
    narrative: 'Lord Owen and Thorvald Stoltenberg propose a "Union of Three Republics" — '
        + 'effectively partitioning Bosnia into three ethnically-defined entities with a weak '
        + 'central government. Unlike Vance-Owen, this plan acknowledges the reality of ethnic '
        + 'separation. The Bosnian government sees it as rewarding ethnic cleansing. The Serbs '
        + 'find the territorial allocation insufficient given their military holdings. Rejection '
        + 'signals deepening intractability.',
};

/**
 * Contact Group Plan, July 1994.
 * 51% Federation (Bosniak-Croat) / 49% RS split.
 * Trigger: week ~118 (roughly July 1994).
 */
const CONTACT_GROUP_PLAN: PeacePlanDefinition = {
    id: 'contact_group',
    name: 'Contact Group Plan',
    trigger_week: 118,
    proposed_split: {
        RBiH: 33,
        RS: 49,
        HRHB: 18,
    },
    institutional_model: '51_49_entities',
    override_change_on_reject: {
        RBiH: 5,
        RS: 30,
        HRHB: 5,
    },
    credibility_change_on_reject: {
        RBiH: -10,
        RS: -25,
        HRHB: -10,
    },
    narrative: 'The Contact Group (US, UK, France, Germany, Russia) presents a take-it-or-leave-it '
        + 'map: 51% to the newly-formed Bosniak-Croat Federation, 49% to Republika Srpska. '
        + 'This is the first plan backed by all major powers simultaneously. The Federation has '
        + 'accepted. Belgrade is pressuring the Bosnian Serbs to accept, threatening to cut '
        + 'support if they refuse. Rejection by RS will trigger Belgrade sanctions — a dramatic '
        + 'rupture between patron and client that will fundamentally alter the strategic balance.',
};

/** All historical peace plans in chronological order. */
export const PEACE_PLANS: readonly PeacePlanDefinition[] = [
    CUTILEIRO_PLAN,
    VANCE_OWEN_PLAN,
    OWEN_STOLTENBERG_PLAN,
    CONTACT_GROUP_PLAN,
];

/** Look up a peace plan by ID. */
export function getPeacePlanById(planId: string): PeacePlanDefinition | undefined {
    return PEACE_PLANS.find(p => p.id === planId);
}
