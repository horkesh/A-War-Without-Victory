import { describe, expect, it } from 'vitest';
import {
    PLAYER_DECISION_FAMILIES,
    listBlockingPlayerDecisions,
} from '../src/state/player_decision_manifest.js';

describe('paramilitary review decision manifest', () => {
    it('routes pending paramilitary requests to the mounted review modal action', () => {
        const family = PLAYER_DECISION_FAMILIES.find((entry) => entry.ownerSurface === 'paramilitary_review');

        expect(family).toMatchObject({
            id: 'paramilitary_request',
            statePath: 'pending_paramilitary_requests',
            inboxType: 'paramilitary_request',
            ownerSurface: 'paramilitary_review',
            resolver: 'resolve-paramilitary-requests',
            gatePolicy: 'hard_block',
        });

        const blocking = listBlockingPlayerDecisions({
            meta: { player_faction: 'RS' },
            pending_paramilitary_requests: [
                {
                    faction: 'RS',
                    target_osid: 'op:bijeljina:bijeljina_2',
                    strength: 150,
                    estimated_civilian_risk: 100,
                },
            ],
        } as any);

        expect(blocking).toEqual([
            expect.objectContaining({
                familyId: 'paramilitary_request',
                id: 'op:bijeljina:bijeljina_2',
                gatePolicy: 'hard_block',
                blocking: true,
            }),
        ]);
    });
});
