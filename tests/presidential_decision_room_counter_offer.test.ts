import { describe, expect, it } from 'vitest';

import { buildPresidentialDecisionRoomView } from '../src/ui/map/data/presidentialDecisionRoom.js';
import type { LoadedGameState } from '../src/ui/map/data/types.js';

function makeState(): LoadedGameState {
    return {
        label: 'Turn 70',
        turn: 70,
        phase: 'war',
        formations: [],
        militiaPools: [],
        controlBySettlement: {},
        statusBySettlement: {},
        brigadeAorByFormationId: {},
        attackOrders: [],
        aorOrders: [],
        recentControlEvents: [],
        allControlEvents: [],
        displacementEventLog: [],
        battlesByOsid: {},
        movementsByOsid: {},
        supplyTransitionsByOsid: {},
        historicalEventsByTurn: [],
        pressureWarning: false,
        latestTurnSummary: null,
        turnSummaries: [],
        player_faction: 'RBiH',
        pendingCounterOffers: [
            {
                id: 'HRHB_001',
                author: 'HRHB',
                parentOfferId: 'owen_stoltenberg',
                planId: 'owen_stoltenberg',
                planName: 'Owen-Stoltenberg Plan',
                chainDepth: 1,
                createdTurn: 70,
                response: 'conditional_accept',
                proposedSplit: { RBiH: 33, RS: 52, HRHB: 15 },
                institutionalModel: 'union_3_republics',
                sourceCitation: 'BB1 p.49',
                rider: 'withdraw territorial concessions',
            },
        ],
    } as LoadedGameState;
}

describe('Presidential Decision Room counter-offer surface', () => {
    it('projects pending counter offers as blocking Decision Room cards with diff evidence', () => {
        const view = buildPresidentialDecisionRoomView({ state: makeState() });
        const card = view.cards.find((entry) => entry.id === 'counter-offer:HRHB_001');

        expect(card).toMatchObject({
            category: 'counter_offer',
            severity: 'blocking',
            title: 'Counter-offer from HRHB',
            sourceOwner: 'Counter-offer docket',
            sourceLabel: 'Owen-Stoltenberg Plan',
            actionLabel: 'Review Counter',
            navigationTarget: { kind: 'counter-offer', counterOfferId: 'HRHB_001' },
        });
        expect(card?.evidence).toContain('RBiH 33 / RS 52 / HRHB 15');
        expect(view.lenses.map((lens) => lens.id)).toContain('counter_offer');
        expect(view.advanceReadiness.items.map((item) => item.id)).toContain('counter-offer:HRHB_001');
    });
});
