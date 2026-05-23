// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import type { TurnSummary } from '../../src/state/turn_summary.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import { makeMockLoadedGameState } from '../../src/ui/map/__mocks__/loadedGameState.js';

const storeState: { loadedGameState: LoadedGameState | null } = {
    loadedGameState: null,
};

vi.mock('../../src/ui/map/store/gameStore', () => ({
    useGameStore: (selector: (s: typeof storeState) => unknown) => selector(storeState),
}));

// @ts-expect-error TS1378: Vitest supports top-level await in ESM tests.
const { WarSummaryContent } = await import('../../src/ui/map/components/army_hq/WarSummaryContent');

function makeSummary(overrides: Partial<TurnSummary> = {}): TurnSummary {
    return {
        turn: 8,
        battles: [{
            osid: 'osid_test',
            attacker_faction: 'RBiH',
            defender_faction: 'RS',
            primary_attacker_id: 'arbih_test_brigade',
            primary_defender_id: 'rs_test_brigade',
            all_attacker_ids: ['arbih_test_brigade'],
            outcome: 'repulsed',
            attacker_casualties: 80,
            defender_casualties: 55,
            territory_flipped: false,
            was_concentrated: false,
        }],
        territory_net: { RBiH: -1 },
        notable_flips: [],
        displacement_total: 2600,
        displacement_by_ethnicity: {},
        decoration_awards: [],
        arc_transitions: [],
        formation_spawns: [],
        formation_destructions: [],
        supply_deltas: {},
        heavy_munitions_deltas: {},
        movements: [],
        supply_transitions: [],
        events_fired: [],
        notable_events: [],
        ...overrides,
    };
}

function stateWithCampaignCost(): LoadedGameState {
    return {
        ...makeMockLoadedGameState(),
        label: 'Turn 8',
        turn: 8,
        player_faction: 'RBiH',
        latestTurnSummary: makeSummary(),
        turnSummaries: [makeSummary({ turn: 7, displacement_total: 1200 })],
    } as LoadedGameState;
}

describe('War Summary campaign cost localization', () => {
    afterEach(() => {
        cleanup();
        setLocale('en');
        storeState.loadedGameState = null;
    });

    it('renders BCS campaign cost chrome in the overview', () => {
        setLocale('bcs');
        storeState.loadedGameState = stateWithCampaignCost();

        render(createElement(WarSummaryContent, { focusSection: 'overview' }));

        const campaignCost = screen.getByTestId('war-summary-campaign-cost');
        expect(screen.getByText('Teritorija')).toBeTruthy();
        expect(screen.getByText('Prijateljska kontrola')).toBeTruthy();
        expect(screen.getByText('Neprijateljska kontrola sazimlje se kroz stabske procjene i izvjestaje s fronta, ne kao tacni frakcijski ukupni iznosi.')).toBeTruthy();
        expect(screen.getByText('Vojna snaga')).toBeTruthy();
        expect(screen.getByText('Ljudstvo pod oruzjem')).toBeTruthy();
        expect(screen.getByText('Raseljavanje')).toBeTruthy();
        expect(screen.getByText('Raseljeni na ratistu')).toBeTruthy();
        expect(screen.getByText('Vlastiti raseljeni')).toBeTruthy();
        expect(screen.getByText('Neprijateljsko raseljavanje nije razlozeno ovdje kao tacni frakcijski ukupni iznosi u igracu sigurnom modu.')).toBeTruthy();
        expect(screen.getByText('Cijena kampanje')).toBeTruthy();
        expect(within(campaignCost).getByText('Ozbiljnost')).toBeTruthy();
        expect(within(campaignCost).getByText('Prijateljski gubici')).toBeTruthy();
        expect(within(campaignCost).getByText('Raseljeni')).toBeTruthy();
        expect(within(campaignCost).getByText('Neto OSID-i')).toBeTruthy();
        expect(screen.queryByText('Campaign Cost')).toBeNull();
        expect(screen.queryByText('Enemy control is summarized through staff assessments and front reports, not exact faction-wide totals.')).toBeNull();
    });
});
