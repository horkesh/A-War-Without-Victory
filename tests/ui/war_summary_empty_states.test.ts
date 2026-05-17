// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { makeMockLoadedGameState } from '../../src/ui/map/__mocks__/loadedGameState.js';

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

afterEach(() => {
    cleanup();
    storeState.loadedGameState = null;
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
});
