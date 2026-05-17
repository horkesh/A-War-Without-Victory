// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { ParamilitaryReviewModal } from '../../src/ui/map/components/ParamilitaryReviewModal.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';

function makeState(overrides: Partial<LoadedGameState> = {}): LoadedGameState {
    return {
        label: 'rs turn 1',
        turn: 1,
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
        pendingParamilitaryRequests: [
            { faction: 'RS', strength: 600, target_osid: 'op:zvornik:zvornik_2', mode: 'offensive' },
        ],
        ...overrides,
    } as LoadedGameState;
}

describe('ParamilitaryReviewModal', () => {
    afterEach(() => {
        cleanup();
        delete (window as unknown as { awwv?: unknown }).awwv;
        useGameStore.setState({
            loadedGameState: null,
            osidDisplayNames: null,
            loadError: null,
        });
    });

    it('renders warning copy and submits explicit decisions', async () => {
        const resolveParamilitaryRequests = vi.fn(async () => ({ ok: true }));
        Object.defineProperty(window, 'awwv', {
            configurable: true,
            value: {
                resolveParamilitaryRequests,
            },
        });
        useGameStore.setState({
            loadedGameState: makeState(),
            osidDisplayNames: { 'op:zvornik:zvornik_2': 'Zvornik' },
        });

        render(createElement(ParamilitaryReviewModal, { isOpen: true, onClose: vi.fn() }));

        expect(screen.getByText('Paramilitary Authorization')).toBeTruthy();
        expect(screen.getByText(/war crimes/i)).toBeTruthy();
        expect(screen.getByText(/civilian casualties/i)).toBeTruthy();
        expect(screen.getByText('Zvornik')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /deny all/i }));
        fireEvent.click(screen.getByRole('button', { name: /submit decisions/i }));

        await waitFor(() => {
            expect(resolveParamilitaryRequests).toHaveBeenCalledWith([
                { target_osid: 'op:zvornik:zvornik_2', decision: 'deny' },
            ]);
        });
    });
});
