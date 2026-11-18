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
    useIPC: () => ({}),
}));

// @ts-expect-error TS1378: Vitest supports top-level await in ESM tests.
const { EmptyState } = await import('../../src/ui/map/components/EmptyState');
// @ts-expect-error TS1378: Vitest supports top-level await in ESM tests.
const { WarSummaryContent } = await import('../../src/ui/map/components/army_hq/WarSummaryContent');

function stateForEmptySummary(): LoadedGameState {
    return {
        ...makeMockLoadedGameState(),
        player_faction: 'RS',
        municipalitySupportOrders: undefined,
        strategicDimensions: undefined,
        patronOverrideAuthority: undefined,
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
        ['support', 'No local support order is staged this week.'],
        ['capital', 'Diplomacy capital is not available in this view.'],
    ] as const)('renders an EmptyState for the empty %s section', (section, message) => {
        storeState.loadedGameState = stateForEmptySummary();

        render(createElement(WarSummaryContent, { focusSection: section }));

        expect(screen.getByText(message)).toBeTruthy();
    });

    it.each([
        ['support', 'Nema lokalne naredbe podrške za ovaj potez.'],
        ['capital', 'Diplomatski kapital nije dostupan u ovom prikazu.'],
    ] as const)('localizes the empty %s section in BCS mode', (section, message) => {
        setLocale('bcs');
        storeState.loadedGameState = stateForEmptySummary();

        render(createElement(WarSummaryContent, { focusSection: section }));

        expect(screen.getByText(message)).toBeTruthy();
        expect(screen.queryByText('No local support order is staged this week.')).toBeNull();
    });

    it('F1i: shows no convoy section or convoy decision buttons (convoys are not modelled in 1.0)', () => {
        storeState.loadedGameState = stateForEmptySummary();

        const { container } = render(createElement(WarSummaryContent, { focusSection: 'overview' }));

        expect(container.querySelector('[data-summary-section="convoys"]')).toBeNull();
        expect(container.textContent ?? '').not.toMatch(/convoy/i);
        expect(screen.queryByRole('button', { name: 'Allow' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Divert' })).toBeNull();
    });
});
