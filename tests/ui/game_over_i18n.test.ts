// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { setLocale } from '../../src/ui/map/i18n';
import { GameOverModal } from '../../src/ui/map/components/GameOverModal';
import { useGameStore } from '../../src/ui/map/store/gameStore';
import type { LoadedGameState } from '../../src/ui/map/data/types';

function makeGameOverState(): LoadedGameState {
    return {
        label: 'i18n-game-over-proof',
        turn: 65,
        phase: 'war',
        metadata: { turn: 65, date: 'May 1993' },
        formations: [
            { id: 'arbih_test_brigade', kind: 'brigade', status: 'active', faction: 'RBiH' },
            { id: 'vrs_test_brigade', kind: 'brigade', status: 'active', faction: 'RS' },
        ],
        militiaPools: [],
        controlBySettlement: { osid_a: 'RBiH', osid_b: 'RS', osid_c: 'RS' },
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
        gameOver: true,
        gameOutcome: 'timeout_stalemate',
    } as unknown as LoadedGameState;
}

function renderGameOver() {
    useGameStore.setState({ loadedGameState: makeGameOverState() });
    render(createElement(GameOverModal));
}

describe('GameOverModal localization', () => {
    beforeEach(() => {
        window.localStorage.clear();
        setLocale('en');
        useGameStore.setState(useGameStore.getInitialState());
    });

    afterEach(() => {
        cleanup();
        useGameStore.setState(useGameStore.getInitialState());
        window.localStorage.clear();
        setLocale('en');
    });

    it('renders English game-over copy by default', () => {
        renderGameOver();

        expect(screen.getByRole('dialog', { name: 'Stalemate' })).toBeTruthy();
        expect(screen.getByText('Stalemate')).toBeTruthy();
        expect(screen.getByText('Final Standings')).toBeTruthy();
        expect(screen.getByText('1 OSID controlled')).toBeTruthy();
        expect(screen.getAllByText('1 active brigade')).toHaveLength(2);
        expect(screen.getByText('Campaign lasted 65 weeks (1 year, 13 weeks)')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'New Game' })).toBeTruthy();
    });

    it('renders BCS game-over copy when BCS is selected', () => {
        setLocale('bcs');

        renderGameOver();

        expect(screen.getByRole('dialog', { name: 'Pat pozicija' })).toBeTruthy();
        expect(screen.getByText('Pat pozicija')).toBeTruthy();
        expect(screen.getByText('Konacni poredak')).toBeTruthy();
        expect(screen.getByText('1 OSID pod kontrolom')).toBeTruthy();
        expect(screen.getAllByText('1 aktivna brigada')).toHaveLength(2);
        expect(screen.getByText('Kampanja je trajala 65 sedmica (1 godina, 13 sedmica)')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Nova igra' })).toBeTruthy();
    });
});
