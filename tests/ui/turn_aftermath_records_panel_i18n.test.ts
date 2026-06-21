// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
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

        const { container } = render(createElement(TurnAftermathRecordsPanel));

        expect(screen.getAllByText('Sve').length).toBeGreaterThan(0);
        expect(screen.getByText('Puls kampanje')).toBeTruthy();
        expect(screen.getByText('Dosadasnja cijena kampanje')).toBeTruthy();
        expect(screen.getByText('Strateški signali')).toBeTruthy();
        expect(screen.getAllByText('Arhiva').length).toBeGreaterThan(0);
        expect(container.textContent).toContain('Cijena kritičan');
        expect(screen.queryByText('Campaign pulse')).toBeNull();
        expect(container.textContent).not.toContain('Cijena critical');
    });

    it('renders latest desk item types as player-facing labels instead of raw ids', () => {
        useGameStore.setState({
            ...useGameStore.getInitialState(),
            loadedGameState: {
                ...makeState(),
                pendingEventDecisions: [{
                    event_id: 'evt_latest',
                    event_title: 'Critical decision',
                    turn_fired: 12,
                    faction: 'RBiH',
                    response_options: [{ id: 'yes', label: 'Yes', effects: [] }],
                }],
            } as LoadedGameState,
            osidDisplayNames: {},
        });

        const { container } = render(createElement(TurnAftermathRecordsPanel));

        expect(screen.getByText('Presidential decision')).toBeTruthy();
        expect(container.textContent).not.toMatch(/\bevent decision\b/i);
        expect(container.textContent).not.toContain('event_decision');
    });

    it('localizes non-event latest desk item types in BCS', () => {
        setLocale('bcs');
        useGameStore.setState({
            ...useGameStore.getInitialState(),
            loadedGameState: {
                ...makeState(),
                pendingConvoyDecisions: [{
                    id: 'convoy_latest',
                    target_enclave: 'Srebrenica',
                    route_faction: 'RBiH',
                    supply_amount: 120,
                }],
            } as LoadedGameState,
            osidDisplayNames: {},
        });

        const { container } = render(createElement(TurnAftermathRecordsPanel));

        expect(screen.getAllByText('Humanitarni konvoj').length).toBeGreaterThan(0);
        expect(container.textContent).not.toContain('convoy_decision');
        expect(container.textContent).not.toContain('Humanitarian convoy');
    });

    it('uses explicit aftermath label maps instead of dynamic enum i18n keys', () => {
        const recordsSource = readFileSync('src/ui/map/components/army_hq/TurnAftermathRecordsPanel.tsx', 'utf8');
        const summarySource = readFileSync('src/ui/map/components/army_hq/WarSummaryContent.tsx', 'utf8');

        expect(recordsSource).toContain('TONE_LABEL_KEYS');
        expect(recordsSource).toContain('COST_SEVERITY_LABEL_KEYS');
        expect(recordsSource).toContain('SIGNAL_KIND_LABEL_KEYS');
        expect(recordsSource).toContain('DIRECTION_LABEL_KEYS');
        expect(recordsSource).toContain('MOMENTUM_LABEL_KEYS');
        expect(recordsSource).toContain('ACTION_TYPE_LABEL_KEYS');
        expect(summarySource).toContain('CAMPAIGN_COST_SEVERITY_LABEL_KEYS');
        expect(recordsSource + summarySource).not.toContain('function enumLabel(');
        expect(recordsSource + summarySource).not.toContain('`${prefix}.${value}`');
        expect(recordsSource).not.toContain('`records.actionType.${surface.familyId}`');
    });
});
