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
                    makeTurnSummary(0, 0.5, 0.35, 0.15),
                    makeTurnSummary(12, 0.52, 0.33, 0.15),
                    makeTurnSummary(24, 0.54, 0.31, 0.15),
                ],
            } as any,
        });

        const { container } = render(createElement(TerritoryOverTimeChart));
        const text = container.textContent ?? '';

        expect(text).toContain('Apr 1992');
        expect(text).not.toMatch(/\bT\d+\b/);
    });
});
