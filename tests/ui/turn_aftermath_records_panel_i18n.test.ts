// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { TurnAftermathRecordsPanel } from '../../src/ui/map/components/army_hq/TurnAftermathRecordsPanel.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import type { TurnSummary } from '../../src/state/turn_summary.js';

function makeSummary(overrides: Partial<TurnSummary> = {}): TurnSummary {
    return {
        turn: 12,
        battles: [],
        territory_net: {},
        notable_flips: [],
        displacement_total: 0,
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

function makeState(): LoadedGameState {
    const turn11 = makeSummary({ turn: 11, territory_net: { RBiH: -1 }, displacement_total: 1200 });
    const turn12 = makeSummary({
        turn: 12,
        territory_net: { RBiH: 2 },
        events_fired: [{ id: 'event_a', text: 'Operational window opened.' }],
    });
    return {
        label: 'Turn 12',
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
        latestTurnSummary: turn12,
        turnSummaries: [turn11],
        player_faction: 'RBiH',
    } as LoadedGameState;
}

describe('TurnAftermathRecordsPanel localization', () => {
    afterEach(() => {
        cleanup();
        setLocale('en');
        useGameStore.setState(useGameStore.getInitialState());
    });

    it('renders BCS archive chrome and campaign summaries', () => {
        setLocale('bcs');
        useGameStore.setState({
            ...useGameStore.getInitialState(),
            loadedGameState: makeState(),
            osidDisplayNames: {},
        });

        render(createElement(TurnAftermathRecordsPanel));

        expect(screen.getAllByText('Sve').length).toBeGreaterThan(0);
        expect(screen.getByText('Puls kampanje')).toBeTruthy();
        expect(screen.getByText('Dosadasnja cijena kampanje')).toBeTruthy();
        expect(screen.getByText('Strateški signali')).toBeTruthy();
        expect(screen.getAllByText('Arhiva').length).toBeGreaterThan(0);
        expect(screen.queryByText('Campaign pulse')).toBeNull();
    });
});
