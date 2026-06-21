// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';

import { OrderInterpretationPanel } from '../../src/ui/map/components/army_hq/OrderInterpretationPanel.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
    return {
        label: 'RBiH test',
        turn: 12,
        phase: 'war',
        player_faction: 'RBiH',
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
        corpsFrontSectors: [],
        operations: [],
        factionReserves: {},
        ...overrides,
    } as LoadedGameState;
}

afterEach(() => {
    cleanup();
    setLocale('en', undefined);
    useGameStore.setState(useGameStore.getInitialState());
});

describe('OrderInterpretationPanel i18n', () => {
    it('renders BCS chrome without translating authored reason prose', () => {
        const authoredReason = 'Commander says the bridge approach is mined.';

        setLocale('bcs', undefined);
        render(createElement(OrderInterpretationPanel, {
            playerFaction: 'RBiH',
            gameState: makeState({
                pendingOfficerEvents: [
                    {
                        event_id: 'evt-modified',
                        type: 'order_modified',
                        faction: 'RBiH',
                        turn: 12,
                        officer_id: 'officer_1',
                        officer_name: 'Commander One',
                        officer_competence: 3,
                        officer_aggressiveness: 2,
                        officer_defensive_skill: 3,
                        corps_id: 'arbih_1st_corps',
                        corps_name: '1st Corps',
                        acknowledged: false,
                        reason: authoredReason,
                    },
                    {
                        event_id: 'evt-pushback',
                        type: 'order_pushback',
                        faction: 'RBiH',
                        turn: 12,
                        officer_id: 'officer_2',
                        officer_name: 'Commander Two',
                        officer_competence: 3,
                        officer_aggressiveness: 2,
                        officer_defensive_skill: 3,
                        acknowledged: false,
                        reason: 'Operational staff requests clarification.',
                    },
                    {
                        event_id: 'evt-refused',
                        type: 'order_refused',
                        faction: 'RBiH',
                        turn: 12,
                        officer_id: 'officer_3',
                        officer_name: 'Commander Three',
                        officer_competence: 3,
                        officer_aggressiveness: 2,
                        officer_defensive_skill: 3,
                        acknowledged: false,
                        reason: 'The commander refuses to advance without artillery.',
                        overridable: true,
                    },
                ],
            }),
        }));

        const copy = document.body.textContent ?? '';

        expect(screen.getByText(authoredReason)).toBeTruthy();
        expect(copy).toContain('TUMACENJA NAREDBI - 3 NA CEKANJU');
        expect(copy).toContain('IZMIJENJENO');
        expect(copy).toContain('PRIGOVOR');
        expect(copy).toContain('ODBIJENO');
        expect(copy).toContain('Prihvati');
        expect(copy).toContain('nije dostupan');
        expect(copy).toContain('Moral oficira');

        for (const leak of [
            'ORDER INTERPRETATIONS',
            'MODIFIED',
            'PUSHBACK',
            'REFUSED',
            'ACCEPT',
            'OVERRIDE',
            'Officer morale',
        ]) {
            expect(copy).not.toContain(leak);
        }
    });
});
