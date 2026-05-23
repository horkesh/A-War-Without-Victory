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
const { WarSummaryContent } = await import('../../src/ui/map/components/army_hq/WarSummaryContent');
// @ts-expect-error TS1378: Vitest supports top-level await in ESM tests.
const { buildWarSummaryOverviewModel } = await import('../../src/ui/map/components/army_hq/warSummaryOverview');

function stateWithMobilizedPool(): LoadedGameState {
    return {
        ...makeMockLoadedGameState(),
        player_faction: 'RS',
        formations: [
            {
                id: 'rs_bde_1',
                faction: 'RS',
                name: '1st Brigade',
                kind: 'brigade',
                readiness: 'active',
                cohesion: 70,
                fatigue: 0,
                status: 'active',
                createdTurn: 0,
                tags: [],
                personnel: 82500,
            },
        ],
        militiaPools: [
            { munId: 'banja_luka', faction: 'RS', available: 20000, committed: 10000, exhausted: 5500, fatigue: 0 },
        ],
    } as LoadedGameState;
}

afterEach(() => {
    cleanup();
    storeState.loadedGameState = null;
    setLocale('en');
});

describe('War Summary personnel labels', () => {
    it('models at-arms personnel separately from mobilized pool manpower', () => {
        const model = buildWarSummaryOverviewModel(stateWithMobilizedPool());

        expect(model.atArmsByFaction.RS).toBe(82500);
        expect(model.mobilizedPoolByFaction.RS).toBe(35500);
        expect(model.mobilizedTotalByFaction.RS).toBe(118000);
    });

    it('labels at-arms and mobilized totals in the overview', () => {
        storeState.loadedGameState = stateWithMobilizedPool();

        render(createElement(WarSummaryContent, { focusSection: 'overview' }));

        expect(screen.getByText('Personnel at arms')).toBeTruthy();
        expect(screen.getByText('Mobilized pool')).toBeTruthy();
        expect(screen.getByText('Mobilized total')).toBeTruthy();
        expect(screen.getByText('82.5k')).toBeTruthy();
        expect(screen.getByText('35.5k')).toBeTruthy();
        expect(screen.getByText('118.0k')).toBeTruthy();
    });

    it('localizes overview labels in BCS mode', () => {
        setLocale('bcs');
        storeState.loadedGameState = stateWithMobilizedPool();

        render(createElement(WarSummaryContent, { focusSection: 'overview' }));

        expect(screen.getByText('Pregled rata')).toBeTruthy();
        expect(screen.getByText('Teritorija')).toBeTruthy();
        expect(screen.getByText('Vojna snaga')).toBeTruthy();
        expect(screen.getByText('Ljudstvo pod oruzjem')).toBeTruthy();
        expect(screen.getByText('Mobilizacijski bazen')).toBeTruthy();
        expect(screen.getByText('Mobilizirano ukupno')).toBeTruthy();
        expect(screen.queryByText('Personnel at arms')).toBeNull();
    });
});
