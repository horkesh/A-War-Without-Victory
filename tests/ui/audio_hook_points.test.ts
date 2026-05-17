// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import { PeacePlanModal } from '../../src/ui/map/components/PeacePlanModal.js';
import { AdvanceTurnModal } from '../../src/ui/map/components/warroom/AdvanceTurnModal.js';
import { playCue } from '../../src/ui/map/audio/audio_engine.js';

vi.mock('../../src/ui/map/audio/audio_engine.js', () => ({
    playCue: vi.fn(async () => undefined),
}));

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
    return {
        label: 'Turn 40',
        turn: 40,
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
        player_faction: 'RS',
        ...overrides,
    } as LoadedGameState;
}

describe('audio hook points', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Object.defineProperty(window, 'awwv', {
            configurable: true,
            value: {},
        });
        useGameStore.setState({
            loadedGameState: makeState(),
            advanceTurnPending: false,
            osidDisplayNames: null,
            loadError: null,
        });
    });

    afterEach(() => {
        cleanup();
        delete (window as unknown as { awwv?: unknown }).awwv;
        useGameStore.setState({
            loadedGameState: null,
            advanceTurnPending: false,
            osidDisplayNames: null,
            loadError: null,
        });
    });

    it('offers a no-op cue when the peace plan modal opens', () => {
        render(createElement(PeacePlanModal, {
            plan: {
                planId: 'vance_owen',
                planName: 'Vance-Owen Peace Plan',
                narrative: 'UN mediators propose decentralized provinces.',
                turnOffered: 40,
                proposedSplit: { RBiH: 39, RS: 43, HRHB: 18 },
                institutionalModel: '10_provinces',
                botResponses: { RBiH: 'accepted', RS: 'rejected', HRHB: 'accepted' },
            },
            onDismiss: vi.fn(),
        }));

        expect(playCue).toHaveBeenCalledWith('peace_plan_offered');
    });

    it('offers a no-op cue when the advance-turn modal opens', () => {
        useGameStore.setState({
            loadedGameState: makeState(),
            advanceTurnPending: true,
        });

        render(createElement(AdvanceTurnModal, {}));

        expect(playCue).toHaveBeenCalledWith('turn_review_open');
    });
});
