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
 * Vance-Owen Peace Plan, January 1993.
 * 10 decentralized provinces (3 Bosniak-majority, 3 Serb-majority, 3 Croat-majority, 1 mixed Sarajevo).
 * Trigger: week ~40 (roughly January 1993).
 */
const VANCE_OWEN_PLAN: PeacePlanDefinition = {
    id: 'vance_owen',
    name: 'Vance-Owen Peace Plan',
    trigger_week: 40,
    historical_responses: {
        RBiH: 'accepted',
        RS: 'rejected',
        HRHB: 'accepted',
    },
    // Measured on the signed 25 Mar 1993 map (S/25479), area-weighted as the game measures
    // (docs/40_reports/20261107_PEACE_PLANS_RESEARCH.md): Serb-led provinces 2/4/6 43.0%
    // (BB1 p.218: 43%), Croat-led 3/8/10 25.3%, Bosniak-led 1/5/9 26.5% plus Sarajevo
    // province 7 (shared) 4.9% and an unnumbered corridor 0.3% → RBiH 32 incl. Sarajevo.
    // The former HRHB 18 was about 7 points too low. The settlement itself is applied
    // from the map (peace_settlement.ts), not from these percentages.
    proposed_split: {
        RBiH: 32,
        RS: 43,
        HRHB: 25,
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
        + 'decentralized provinces — three Bosniak-led, three Serb-led, three Croat-led, and a '
        + 'shared Sarajevo province. The Serbs would keep 43 percent of the country, giving up '
        + 'about a third of what the VRS holds. Republika Srpska would cease to exist as a unit: '
        + 'its three provinces would not touch, with the Croat-led Posavina province cutting the '
        + 'corridor. The Bosnian Serb assembly has indicated fierce opposition. Rejection by RS '
        + 'will dramatically increase international pressure and may trigger sanctions from '
        + 'Belgrade itself.',
};

/**
 * Owen-Stoltenberg Plan, August 1993.
 * Union of three ethnically-defined republics within BiH.
 * Trigger: week ~70 (roughly August 1993).
 *
 * Historical split: Bosniaks ~33%, Serbs ~52%, Croats ~15%.
 * Sources: Owen "Balkan Odyssey" (1995), pp. 214-219; HMS Invincible talks, September 1993.
 * The previous values (RBiH:53, RS:30, HRHB:17) were Vance-Owen's numbers — incorrect for O-S.
 * Note: trigger_week=70 is the proposal date; O-S talks concluded ~week 72 (August 1993).
 */
const OWEN_STOLTENBERG_PLAN: PeacePlanDefinition = {
    id: 'owen_stoltenberg',
    name: 'Owen-Stoltenberg Plan',
    trigger_week: 70,
    historical_responses: {
        RBiH: 'rejected',
        RS: 'accepted',
        HRHB: 'accepted',
    },
    // 20 Aug 1993 Geneva map (S/26337): published 30 / 52.5 / 17.5 (the text sets 30% as
    // the Muslim floor). Measured on the georeferenced map: RS 52.3, Muslim 28.7, Croat
    // 16.0, UN Sarajevo district 3.0. The former 33/52/15 mixed the August map with the
    // September Invincible figure (33/49/17.5), and 15 had no source.
    proposed_split: {
        RBiH: 30,
        RS: 52.5,
        HRHB: 17.5,
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
        + 'separation. The Bosnian Serb assembly accepts it; the Croat assembly accepts while '
        + 'demanding more land; the Bosnian government sees it as rewarding ethnic cleansing and '
        + 'a landlocked republic. No republic would keep an army. Rejection signals deepening '
        + 'intractability.',
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
    historical_responses: {
        RBiH: 'accepted',
        RS: 'rejected',
        HRHB: 'accepted',
    },
    // UN map 4128: RS 48.9, Federation 48.2 + Sarajevo neutral zone 2.8 (51/49 published).
    // The Bosniak/Croat split inside the Federation is NOT part of the plan; 35/16 is the
    // research's inferred faction layer on that map (RBiH 33.1 + neutral zone, HRHB 15.2).
    proposed_split: {
        RBiH: 35,
        RS: 49,
        HRHB: 16,
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

// Dayton Peace Agreement (General Framework Agreement for Peace, Annex 2)
// Initialed Dayton, Ohio, 21 November 1995; signed Paris, 14 December 1995.
// proposed_split: RS=49% from Dayton Annex 2 IEBL (51/49 entity split).
//   Within Federation: see the measured faction layer below (RBiH 32, HRHB 19); the Contact Group
//   contributed only the 51:49 parameter (docs/40_reports/20261107_PEACE_PLANS_RESEARCH.md §6).
// credibility_change_on_reject: RS=-30 (highest in sequence; rejecting Dayton post-Krajina
//   post-Deliberate Force was diplomatic self-destruction; ICTY IT-95-5/18-T Vol. 4 §§4900–4940).
export const DAYTON_PLAN: PeacePlanDefinition = {
    id: 'dayton',
    name: 'Dayton Peace Agreement',
    trigger_week: 185,
    historical_responses: {
        RBiH: 'accepted',
        RS: 'accepted',
        HRHB: 'accepted',
    },
    // Published 51/49. Measured on the post-1995 municipal structure: RS 48.3, Federation
    // 50.8 (inferred faction layer RBiH 31.3 / HRHB 19.5), Brčko District 0.9. Only the
    // 51:49 parameter carried over from the Contact Group; the map is substantially different.
    proposed_split: {
        RBiH: 32,
        RS: 49,
        HRHB: 19,
    },
    institutional_model: 'two_entities',
    override_change_on_reject: {
        RBiH: -5,
        RS: -20,
        HRHB: -5,
    },
    credibility_change_on_reject: {
        RBiH: -15,
        RS: -30,
        HRHB: -15,
    },
    narrative: 'The Dayton Peace Agreement (November 1995) establishes two entities — Republika Srpska (49%) and the Bosniak-Croat Federation (51%) — with IFOR enforcing the ceasefire. It keeps the Contact Group\'s 51:49 parameter on a new map: Sarajevo unified in the Federation with a corridor to Goražde, Srebrenica and Žepa in Republika Srpska, western Bosnia returned in part. For the first time Republika Srpska is recognised by name, keeps its army and the Posavina corridor; Brčko goes to arbitration.',
};

/**
 * All historical peace plans in chronological order.
 *
 * CUTILEIRO REMOVED 2026-08-31 (owner: "Cutiliero needs to be removed ... It's
 * ahistorical, that happened in March, before the war started"). The Lisbon
 * Agreement was signed 18 March 1992 and Izetbegovic withdrew on 28 March —
 * both before this scenario's April 1992 start. Modelling it as a live wartime
 * negotiation required three special cases (a week-0 -> week-1 catch-up, a
 * documented-outcome replay, and an exclusion from personality scoring), and
 * the replay comment conceded the sim would otherwise "manufacture an
 * ahistorical unanimous settlement before play begins". All three are gone
 * with it.
 */
export const PEACE_PLANS: readonly PeacePlanDefinition[] = [
    VANCE_OWEN_PLAN,
    OWEN_STOLTENBERG_PLAN,
    CONTACT_GROUP_PLAN,
    DAYTON_PLAN,
];

/** Look up a peace plan by ID. */
export function getPeacePlanById(planId: string): PeacePlanDefinition | undefined {
    return PEACE_PLANS.find(p => p.id === planId);
}
