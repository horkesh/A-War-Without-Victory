// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { TerritoryOverTimeChart } from '../../src/ui/map/components/TerritoryOverTimeChart';
import { useGameStore } from '../../src/ui/map/store/gameStore';

function makeTurnSummary(turn: number, rs: number, rbih: number, hrhb: number) {
    return {
        turn,
        territory_snapshot: { RS: rs, RBiH: rbih, HRHB: hrhb },
    };
}

afterEach(() => {
    cleanup();
    useGameStore.setState({ loadedGameState: null });
});

describe('TerritoryOverTimeChart timing labels', () => {
    it('renders compact calendar tick labels instead of raw T-turn labels', () => {
        useGameStore.setState({
            loadedGameState: {
                player_faction: null,
                turnSummaries: [
                    makeTurnSummary(12, 0.52, 0.33, 0.15),
                    makeTurnSummary(24, 0.54, 0.31, 0.15),
                    makeTurnSummary(36, 0.56, 0.29, 0.15),
                ],
            } as any,
        });

        const { container } = render(createElement(TerritoryOverTimeChart));
        const text = container.textContent ?? '';

        expect(text).toContain('Jun 1992');
        expect(text).not.toMatch(/\bT\d+\b/);
    });

    it('ignores setup territory snapshots when plotting Records history', () => {
        useGameStore.setState({
            loadedGameState: {
                player_faction: null,
                turnSummaries: [
                    { ...makeTurnSummary(0, 0.8, 0.1, 0.1), mechanism: 'setup_control' },
                    { ...makeTurnSummary(1, 0.75, 0.15, 0.1), summary_kind: 'scenario_start' },
                    makeTurnSummary(12, 0.52, 0.33, 0.15),
                    makeTurnSummary(24, 0.54, 0.31, 0.15),
                ],
            } as any,
        });

        const { container } = render(createElement(TerritoryOverTimeChart));
        const text = container.textContent ?? '';

        expect(text).toContain('Jun 1992');
        expect(text).toContain('Sep 1992');
        expect(text).not.toContain('Apr 1992');
    });
});
