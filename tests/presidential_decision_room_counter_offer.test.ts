import { describe, expect, it } from 'vitest';

import { buildPresidentialDecisionRoomView } from '../src/ui/map/data/presidentialDecisionRoom.js';
import { setLocale } from '../src/ui/map/i18n/index.js';
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
                targetFaction: 'RBiH',
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
            title: 'Counter-offer from Croatian Republic of Herzeg-Bosnia',
            sourceOwner: 'Counter-offer docket',
            sourceLabel: 'Owen-Stoltenberg Plan',
            actionLabel: 'Review Counter',
            navigationTarget: { kind: 'counter-offer', counterOfferId: 'HRHB_001' },
        });
        expect(card?.evidence).toContain('Republic of Bosnia and Herzegovina 33% / Republika Srpska 52% / Croatian Republic of Herzeg-Bosnia 15%');
        expect(card?.title).not.toContain('HRHB');
        expect(card?.evidence.join(' ')).not.toMatch(/\bRBiH\b|\bHRHB\b/);
        expect(view.lenses.map((lens) => lens.id)).toContain('counter_offer');
        expect(view.advanceReadiness.items.map((item) => item.id)).toContain('counter-offer:HRHB_001');
    });

    it('localizes counter-offer faction evidence in BCS mode', () => {
        setLocale('bcs');
        try {
            const view = buildPresidentialDecisionRoomView({ state: makeState() });
            const card = view.cards.find((entry) => entry.id === 'counter-offer:HRHB_001');

            expect(card?.title).toBe('Kontra-ponuda od Hrvatska Republika Herceg-Bosna');
            expect(card?.evidence).toContain('Republika Bosna i Hercegovina 33% / Republika Srpska 52% / Hrvatska Republika Herceg-Bosna 15%');
            expect(card?.evidence.join(' ')).not.toMatch(/\bRBiH\b|\bHRHB\b/);
        } finally {
            setLocale('en');
        }
    });

    it('does not expose counter-offers addressed to another player faction', () => {
        const state = makeState();
        state.pendingCounterOffers = [
            {
                ...state.pendingCounterOffers![0],
                id: 'HRHB_FOREIGN',
                targetFaction: 'RS',
            },
        ];

        const view = buildPresidentialDecisionRoomView({ state });

        expect(view.cards.find((entry) => entry.id === 'counter-offer:HRHB_FOREIGN')).toBeUndefined();
        expect(view.advanceReadiness.items.map((item) => item.id)).not.toContain('counter-offer:HRHB_FOREIGN');
        expect(view.metrics.priorityCounts.required).toBe(0);
    });

    it('keeps every hard blocker in advance review when more than four are pending', () => {
        const state = makeState();
        const template = state.pendingCounterOffers![0];
        state.pendingCounterOffers = Array.from({ length: 5 }, (_, index) => ({
            ...template,
            id: `HRHB_00${index + 1}`,
            createdTurn: 70 + index,
        }));
        const selectedCardId = 'counter-offer:HRHB_005';

        const view = buildPresidentialDecisionRoomView({ state, selectedCardId });
        const readinessIds = view.advanceReadiness.items.map((item) => item.id);

        expect(readinessIds).toHaveLength(5);
        expect(readinessIds).toEqual(expect.arrayContaining(
            state.pendingCounterOffers.map((offer) => `counter-offer:${offer.id}`),
        ));
        expect(view.advanceReadiness.blockedByExistingSystems).toBe(true);
        expect(view.activeDossier).toMatchObject({
            cardId: selectedCardId,
            advanceSensitive: true,
            advanceLabel: 'Review before advance',
        });
    });
});
