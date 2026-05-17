// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { PresidentialToolbar } from '../../src/ui/map/components/PresidentialToolbar.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import { openArmyHQRecordsSubTab } from '../../src/ui/map/utils/shellNavigation.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

function makeLoadedState(): LoadedGameState {
    return {
        label: 'RS turn 12',
        turn: 12,
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
    } as LoadedGameState;
}

describe('PresidentialToolbar RECORDS button', () => {
    beforeEach(() => {
        useGameStore.setState({
            ...useGameStore.getInitialState(),
            loadedGameState: makeLoadedState(),
        });
    });

    afterEach(() => {
        cleanup();
        useGameStore.setState(useGameStore.getInitialState());
    });

    it('opens Army HQ Records on the AAR subtab in the visible store state', () => {
        render(createElement(PresidentialToolbar, {
            pendingReviews: 0,
            pressureWarning: false,
            onOpenRecords: () => openArmyHQRecordsSubTab(useGameStore.getState(), 'aar'),
        }));

        const recordsButton = screen.getByRole('button', { name: 'RECORDS' });
        expect(recordsButton.getAttribute('title')).toBe('Open Army HQ Records: after-action reports');

        fireEvent.click(recordsButton);

        expect(useGameStore.getState()).toMatchObject({
            selectedArmyId: 'RS',
            armyHQOpen: true,
            armyHQTab: 'records',
            armyHQRecordsSubTab: 'aar',
        });
    });
});
