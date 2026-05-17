import { describe, expect, it } from 'vitest';
import {
    countBlockingPlayerDecisions,
    listBlockingPlayerDecisions,
} from '../src/state/player_decision_manifest.js';

describe('desktop player decision gate contract', () => {
    it('counts required event and paramilitary decisions from the same manifest', () => {
        const state: any = {
            meta: { player_faction: 'RS' },
            pending_paramilitary_requests: [
                { faction: 'RS', target_osid: 'op:bijeljina:bijeljina_2', strength: 100 },
            ],
            military: {
                pending_event_decisions: [
                    {
                        event_id: 'rs_required',
                        event_title: 'RS required decision',
                        faction: 'RS',
                        requires_player_response: true,
                    },
                ],
            },
        };

        expect(countBlockingPlayerDecisions(state, 'RS')).toBe(2);
        expect(listBlockingPlayerDecisions(state, 'RS').map((item) => item.familyId)).toEqual([
            'event_decision',
            'paramilitary_request',
        ]);
    });

    it('does not block on another faction decision or advisory queues', () => {
        const state: any = {
            meta: { player_faction: 'RBiH' },
            pending_paramilitary_requests: [
                { faction: 'RS', target_osid: 'op:bijeljina:bijeljina_2', strength: 100 },
            ],
            military: {
                pending_event_decisions: [
                    {
                        event_id: 'rs_required',
                        event_title: 'RS required decision',
                        faction: 'RS',
                        requires_player_response: true,
                    },
                ],
                pending_reserve_requests: [
                    { faction: 'RBiH', request_id: 'reserve_1', corps_id: 'arbih_1st_corps' },
                ],
                pending_officer_events: [
                    { faction: 'RBiH', id: 'officer_1', type: 'officer_available' },
                ],
            },
        };

        expect(countBlockingPlayerDecisions(state, 'RBiH')).toBe(0);
        expect(listBlockingPlayerDecisions(state, 'RBiH')).toEqual([]);
    });
});
