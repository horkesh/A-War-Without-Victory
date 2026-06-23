import { describe, expect, it } from 'vitest';
import {
    PLAYER_DECISION_FAMILIES,
    countBlockingPlayerDecisions,
    listBlockingPlayerDecisions,
    summarizePlayerDecisions,
} from '../src/state/player_decision_manifest.js';

const EXPECTED_FAMILIES = [
    'event_decision',
    'peace_plan',
    'dayton_negotiation',
    'paramilitary_request',
    'convoy_decision',
    'reserve_request',
    'officer_event',
    'autonomy_proposal',
    'operation_opportunity',
] as const;

describe('player decision manifest', () => {
    it('summarizes all current generated player-decision families in stable manifest order', () => {
        const state: any = {
            meta: {
                player_faction: 'RBiH',
                autonomy_level_pending: 2,
                pending_proposal_reviews: [
                    {
                        id: 'PROP_12_military_1',
                        turn: 12,
                        faction: 'RBiH',
                        domain: 'military',
                        description: 'Adjust corps stance.',
                        proposed_action: 'set_corps_stance',
                    },
                    {
                        id: 'OPP_REVIEW_12_1',
                        turn: 12,
                        faction: 'RBiH',
                        domain: 'ops',
                        description: 'Operation opportunity review.',
                        proposed_action: 'OPPORTUNITY:op_alpha',
                    },
                    {
                        id: 'PROP_12_other_faction',
                        turn: 12,
                        faction: 'RS',
                        domain: 'military',
                        description: 'Other faction proposal.',
                        proposed_action: 'set_corps_stance',
                    },
                ],
            },
            pending_paramilitary_requests: [
                { faction: 'RBiH', target_osid: 'zvornik', strength: 120 },
                { faction: 'RS', target_osid: 'prijedor', strength: 90 },
            ],
            military: {
                brigade_sector_override: { arbih_1st_brigade: 'sector_alpha' },
                pending_event_decisions: [
                    {
                        event_id: 'rbih_required',
                        event_title: 'State Presidency Decision',
                        turn_fired: 12,
                        faction: 'RBiH',
                        requires_player_response: true,
                        response_options: [],
                    },
                    {
                        event_id: 'rs_required',
                        event_title: 'RS Assembly Decision',
                        turn_fired: 12,
                        faction: 'RS',
                        requires_player_response: true,
                        response_options: [],
                    },
                ],
                negotiation: {
                    pending_peace_plan: {
                        plan_id: 'vance_owen',
                        turn_offered: 12,
                        bot_responses: {},
                    },
                    pending_dayton: {
                        territorialPackages: [],
                        institutionalPackages: [],
                        factionCapital: {},
                        patronOverride: {},
                    },
                },
                pending_convoy_decisions: [
                    {
                        id: 'convoy_gorazde',
                        target_enclave: 'gorazde',
                        route_faction: 'RBiH',
                        supply_amount: 20,
                    },
                    {
                        id: 'convoy_srebrenica',
                        target_enclave: 'srebrenica',
                        route_faction: 'RS',
                        supply_amount: 20,
                    },
                ],
                pending_reserve_requests: [
                    {
                        request_id: 'reserve_rbih',
                        corps_id: 'arbih_2nd_corps',
                        faction: 'RBiH',
                        reason: 'commander_request',
                    },
                    {
                        request_id: 'reserve_rs',
                        corps_id: 'drina_corps',
                        faction: 'RS',
                        reason: 'commander_request',
                    },
                ],
                pending_officer_events: [
                    {
                        event_id: 'officer_rbih',
                        type: 'order_refused',
                        faction: 'RBiH',
                        acknowledged: false,
                    },
                    {
                        event_id: 'officer_rs',
                        type: 'officer_available',
                        faction: 'RS',
                        acknowledged: false,
                    },
                ],
            },
        };

        const summary = summarizePlayerDecisions(state, 'RBiH');

        expect(PLAYER_DECISION_FAMILIES.map((family) => family.id)).toEqual(EXPECTED_FAMILIES);
        expect(Object.fromEntries(PLAYER_DECISION_FAMILIES.map((family) => [family.id, family.gatePolicy]))).toEqual({
            event_decision: 'hard_block',
            peace_plan: 'modal_required',
            dayton_negotiation: 'modal_required',
            paramilitary_request: 'hard_block',
            convoy_decision: 'modal_required',
            reserve_request: 'advisory',
            officer_event: 'advisory',
            autonomy_proposal: 'advisory',
            operation_opportunity: 'advisory',
        });

        expect(summary.totalCount).toBe(9);
        expect(summary.blockingCount).toBe(5);
        expect(summary.families.map((family) => family.id)).toEqual(EXPECTED_FAMILIES);
        expect(summary.families.map((family) => family.count)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1]);
        expect(listBlockingPlayerDecisions(state, 'RBiH').map((item) => item.familyId)).toEqual([
            'event_decision',
            'peace_plan',
            'dayton_negotiation',
            'paramilitary_request',
            'convoy_decision',
        ]);
        expect(countBlockingPlayerDecisions(state, 'RBiH')).toBe(5);
    });

    it('ignores unresolved convoy decisions owned by another route faction', () => {
        const state: any = {
            military: {
                pending_convoy_decisions: [
                    {
                        id: 'convoy_foreign',
                        target_enclave: 'srebrenica',
                        route_faction: 'RS',
                        supply_amount: 20,
                    },
                ],
            },
        };

        const summary = summarizePlayerDecisions(state, 'RBiH');

        expect(summary.families.find((family) => family.id === 'convoy_decision')).toMatchObject({
            count: 0,
            blockingCount: 0,
        });
        expect(listBlockingPlayerDecisions(state, 'RBiH')).toEqual([]);
        expect(countBlockingPlayerDecisions(state, 'RBiH')).toBe(0);
    });

    it('filters faction-owned instances and only blocks unresolved required/modal decisions', () => {
        const state: any = {
            meta: {
                player_faction: 'RS',
                autonomy_level_pending: 3,
                pending_proposal_reviews: [
                    {
                        id: 'PROP_rs_resolved',
                        turn: 20,
                        faction: 'RS',
                        domain: 'military',
                        description: 'Already resolved.',
                        proposed_action: 'set_corps_stance',
                        accepted: true,
                    },
                    {
                        id: 'OPP_REVIEW_rs_pending',
                        turn: 20,
                        faction: 'RS',
                        domain: 'ops',
                        description: 'Live opportunity.',
                        proposed_action: 'OPPORTUNITY:op_rs',
                    },
                ],
            },
            pending_paramilitary_requests: [
                { faction: 'RS', target_osid: 'prijedor', strength: 90, decision: 'allow' },
            ],
            military: {
                pending_event_decisions: [
                    {
                        event_id: 'rbih_required',
                        event_title: 'RBiH required decision',
                        turn_fired: 20,
                        faction: 'RBiH',
                        requires_player_response: true,
                        response_options: [],
                    },
                    {
                        event_id: 'rs_optional',
                        event_title: 'RS advisory decision',
                        turn_fired: 20,
                        faction: 'RS',
                        requires_player_response: false,
                        response_options: [],
                    },
                ],
                negotiation: {
                    pending_peace_plan: undefined,
                    pending_dayton: undefined,
                },
                pending_convoy_decisions: [
                    {
                        id: 'convoy_decided',
                        target_enclave: 'bihac',
                        route_faction: 'RS',
                        supply_amount: 15,
                        decision: 'divert',
                    },
                ],
                pending_reserve_requests: [
                    { request_id: 'reserve_rs', corps_id: 'drina_corps', faction: 'RS', reason: 'test' },
                ],
                pending_officer_events: [
                    { event_id: 'officer_rs_ack', type: 'officer_available', faction: 'RS', acknowledged: true },
                ],
            },
        };

        const summary = summarizePlayerDecisions(state);

        expect(summary.totalCount).toBe(4);
        expect(summary.blockingCount).toBe(1);
        expect(summary.families.map((family) => [family.id, family.count, family.blockingCount])).toEqual([
            ['event_decision', 1, 0],
            ['peace_plan', 0, 0],
            ['dayton_negotiation', 0, 0],
            ['paramilitary_request', 1, 1],
            ['convoy_decision', 0, 0],
            ['reserve_request', 1, 0],
            ['officer_event', 0, 0],
            ['autonomy_proposal', 0, 0],
            ['operation_opportunity', 1, 0],
        ]);
        expect(listBlockingPlayerDecisions(state).map((item) => item.familyId)).toEqual(['paramilitary_request']);
    });
});
