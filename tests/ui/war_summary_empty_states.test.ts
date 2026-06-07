// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { makeMockLoadedGameState } from '../../src/ui/map/__mocks__/loadedGameState.js';
import { setLocale } from '../../src/ui/map/i18n';

const storeState: { loadedGameState: LoadedGameState | null } = {
    loadedGameState: null,
};

vi.mock('../../src/ui/map/store/gameStore', () => ({
    useGameStore: (selector: (s: typeof storeState) => unknown) => selector(storeState),
}));

vi.mock('../../src/ui/map/desktop/useIPC', () => ({
    useIPC: () => ({ stageConvoyDecision: vi.fn() }),
}));

// @ts-expect-error TS1378: Vitest supports top-level await in ESM tests.
const { EmptyState } = await import('../../src/ui/map/components/EmptyState');
// @ts-expect-error TS1378: Vitest supports top-level await in ESM tests.
const { WarSummaryContent } = await import('../../src/ui/map/components/army_hq/WarSummaryContent');

function stateForEmptySummary(): LoadedGameState {
    return {
        ...makeMockLoadedGameState(),
        player_faction: 'RS',
        pendingConvoyDecisions: [],
        municipalitySupportOrders: undefined,
        strategicDimensions: undefined,
        patronOverrideAuthority: undefined,
    } as LoadedGameState;
}

function stateForPendingConvoySummary(): LoadedGameState {
    return {
        ...stateForEmptySummary(),
        pendingConvoyDecisions: [{
            id: 'convoy:srebrenica:rs',
            target_enclave: 'Srebrenica',
            route_faction: 'RS',
            supply_amount: 0.4,
        }],
    } as LoadedGameState;
}

afterEach(() => {
    cleanup();
    setLocale('en');
    storeState.loadedGameState = null;
    setLocale('en');
});

describe('War Summary empty states', () => {
    it('renders the reusable empty state message', () => {
        render(createElement(EmptyState, { message: 'No records available.' }));

        expect(screen.getByText('No records available.')).toBeTruthy();
    });

    it.each([
        ['convoys', 'No convoy decisions are pending.'],
        ['support', 'No local support order is staged this turn.'],
        ['capital', 'Diplomacy capital is not available in this view.'],
    ] as const)('renders an EmptyState for the empty %s section', (section, message) => {
        storeState.loadedGameState = stateForEmptySummary();

        render(createElement(WarSummaryContent, { focusSection: section }));

        expect(screen.getByText(message)).toBeTruthy();
    });

    it.each([
        ['convoys', 'Nema konvojskih odluka na čekanju.'],
        ['support', 'Nema lokalne naredbe podrške za ovaj potez.'],
        ['capital', 'Diplomatski kapital nije dostupan u ovom prikazu.'],
    ] as const)('localizes the empty %s section in BCS mode', (section, message) => {
        setLocale('bcs');
        storeState.loadedGameState = stateForEmptySummary();

        render(createElement(WarSummaryContent, { focusSection: section }));

        expect(screen.getByText(message)).toBeTruthy();
        expect(screen.queryByText('No convoy decisions are pending.')).toBeNull();
    });

    it('localizes convoy action buttons in BCS mode', () => {
        setLocale('bcs');
        storeState.loadedGameState = stateForPendingConvoySummary();

        render(createElement(WarSummaryContent, { focusSection: 'convoys' }));

        expect(screen.getByRole('button', { name: 'Dozvoli' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Blokiraj' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Preusmjeri' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Allow' })).toBeNull();
    });
});
