// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { AudioCueObserver } from '../../src/ui/map/components/AudioCueObserver.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import type { TurnSummary } from '../../src/state/turn_summary.js';
import { playCue } from '../../src/ui/map/audio/audio_engine.js';

vi.mock('../../src/ui/map/audio/audio_engine.js', () => ({
    playCue: vi.fn(async () => undefined),
}));

function makeSummary(overrides: Partial<TurnSummary> = {}): TurnSummary {
    return {
        turn: 11,
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

function makeState(summary: TurnSummary | null): LoadedGameState {
    return {
        label: summary ? `Turn ${summary.turn}` : 'Turn 0',
        turn: summary?.turn ?? 0,
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
        latestTurnSummary: summary,
        turnSummaries: summary ? [summary] : [],
        player_faction: 'RBiH',
    } as LoadedGameState;
}

describe('AudioCueObserver', () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
        useGameStore.setState({ loadedGameState: null });
    });

    it('does not emit cues on initial hydration, then emits for a later observed turn', async () => {
        useGameStore.setState({ loadedGameState: makeState(makeSummary({ turn: 11 })) });

        render(createElement(AudioCueObserver, { nowProvider: () => 5000 }));

        expect(playCue).not.toHaveBeenCalled();

        await act(async () => {
            useGameStore.setState({
                loadedGameState: makeState(makeSummary({
                    turn: 12,
                    events_fired: [{ id: 'event_alpha', text: 'Alpha.' }],
                })),
            });
        });

        expect(playCue).toHaveBeenCalledWith('turn_complete', 5000);
        expect(playCue).toHaveBeenCalledWith('event_notification', 5000);
    });
});
