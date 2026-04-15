// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

let storeState: Record<string, any> = { loadedGameState: null };

vi.mock('../../src/ui/map/store/gameStore', () => ({
    useGameStore: Object.assign(
        (selector: (state: any) => any) => selector(storeState),
        {
            getState: () => storeState,
            setState: (partial: any) => { Object.assign(storeState, partial); },
            subscribe: () => () => {},
        },
    ),
}));

// @ts-expect-error TS1378: top-level await is supported by vitest runtime.
const { CodexPanel } = await import('../../src/ui/map/components/CodexPanel');

function renderPanel() {
    return render(createElement(CodexPanel, { isOpen: true, onClose: () => {} }));
}

function firedEvent(id: string) {
    return {
        id,
        turn: 188,
        title: id,
        narrative: '',
        category: 'diplomatic',
        effects: [],
        isDecision: false,
    };
}

describe('CodexPanel dynamic essay proof', () => {
    beforeEach(() => {
        storeState = { loadedGameState: null };
    });

    afterEach(() => {
        cleanup();
    });

    it('surfaces Srebrenica as a ghost entry when the rupture never occurred', () => {
        storeState = {
            loadedGameState: {
                firedEvents: [],
                gameOver: true,
                historicalComparison: {
                    duration_delta_weeks: -6,
                    territory_divergence: {},
                    casualty_ratio: 0.8,
                    displacement_ratio: 0.7,
                    rupture_divergence: [],
                    divergence_notes: ['Srebrenica enclave survived'],
                },
            },
        };

        renderPanel();
        fireEvent.click(screen.getByText('1995'));
        expect(screen.getByText('The Fall of Srebrenica: Europe\'s Worst Atrocity Since 1945')).toBeTruthy();
        expect(screen.getAllByText('Ghost').length).toBeGreaterThan(0);

        fireEvent.click(screen.getByText('The Fall of Srebrenica: Europe\'s Worst Atrocity Since 1945'));

        expect(screen.getByText('Historical Ghost Entry')).toBeTruthy();
        expect(
            screen.getByText('This entry records the historical fall of Srebrenica. In your war, the enclave survived; the historical July 1995 catastrophe never arrived.'),
        ).toBeTruthy();
    });

    it('renders live divergence notes inside the Dayton essay after game over', () => {
        storeState = {
            loadedGameState: {
                firedEvents: [firedEvent('dayton_signed_1995')],
                gameOver: true,
                historicalComparison: {
                    duration_delta_weeks: 6,
                    territory_divergence: { RS: -3 },
                    casualty_ratio: 0.9,
                    displacement_ratio: 0.95,
                    rupture_divergence: [],
                    divergence_notes: [
                        'War lasted 6 weeks longer than the historical 182 weeks',
                        'Federation controlled 54.0% territory vs historical 51%',
                    ],
                },
            },
        };

        renderPanel();
        fireEvent.click(screen.getByText('1995'));
        fireEvent.click(screen.getByText('The Dayton Agreement: Ending the War, Freezing the Questions'));

        expect(screen.getAllByText('Player War Divergence')).toHaveLength(2);
        expect(screen.getByText('War lasted 6 weeks longer than the historical 182 weeks')).toBeTruthy();
        expect(screen.getByText('Federation controlled 54.0% territory vs historical 51%')).toBeTruthy();
    });

    it('keeps unfired non-ghost essays locked', () => {
        storeState = {
            loadedGameState: {
                firedEvents: [],
                gameOver: false,
            },
        };

        renderPanel();
        fireEvent.click(screen.getByText('1995'));
        fireEvent.click(screen.getByText('The Dayton Agreement: Ending the War, Freezing the Questions'));

        expect(
            screen.getByText('Experience this event during gameplay to unlock the full historical essay.'),
        ).toBeTruthy();
    });
});
