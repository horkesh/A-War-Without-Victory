// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { setLocale } from '../../src/ui/map/i18n';

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
        setLocale('en');
    });

    afterEach(() => {
        cleanup();
        setLocale('en');
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

    it('localizes BCS empty-selection Codex chrome', () => {
        setLocale('bcs');

        renderPanel();

        expect(screen.getByText('Kodeks')).toBeTruthy();
        expect(screen.getByText('0 eseja dostupno')).toBeTruthy();
        expect(screen.getByText('Izaberite esej')).toBeTruthy();
        expect(screen.queryByText('Select an essay')).toBeNull();
        expect(screen.getByText(/Historijski eseji se otvaraju/)).toBeTruthy();
    });

    it('localizes BCS Codex dilemma and history-comparison chrome without translating authored labels', () => {
        setLocale('bcs');
        storeState = {
            loadedGameState: {
                firedEvents: [firedEvent('arms_embargo_impact_1992')],
                turn: 40,
                dilemmaSpine: [
                    {
                        dilemmaId: 'arms_embargo',
                        title: 'Arms embargo decision',
                        essayId: 'essay_arms_embargo_impact_1992',
                        sensitive: false,
                        faced: true,
                        chosenResponseId: 'appeal',
                        chosenBranchLabel: 'Appeal for relief',
                        decisionTurn: 12,
                    },
                    {
                        dilemmaId: 'locked_essay',
                        title: 'Unopened linked decision',
                        essayId: 'essay_battle_of_the_barracks_sarajevo',
                        sensitive: false,
                        faced: false,
                        chosenResponseId: null,
                        chosenBranchLabel: null,
                        decisionTurn: null,
                    },
                    {
                        dilemmaId: 'no_essay',
                        title: 'Decision without essay',
                        essayId: null,
                        sensitive: false,
                        faced: false,
                        chosenResponseId: null,
                        chosenBranchLabel: null,
                        decisionTurn: null,
                    },
                ],
                distanceFromHistory: {
                    totalDecided: 2,
                    matchedHistory: 1,
                    diverged: 1,
                    divergencePct: 50,
                    playerDiverged: 1,
                    divergences: [
                        {
                            eventId: 'arms_embargo_impact_1992',
                            title: 'Arms Embargo',
                            chosen: 'Appeal for relief',
                            historical: 'Endure the embargo',
                            chosenResponseId: 'appeal',
                            historicalResponseId: 'endure',
                            turn: 12,
                            faction: 'RBiH',
                            source: 'player',
                        },
                    ],
                },
            },
        };

        renderPanel();

        const panel = screen.getByTestId('codex-panel');
        expect(screen.getByText('Izbori koji su oblikovali ovaj rat')).toBeTruthy();
        expect(screen.getByText('Suočeno')).toBeTruthy();
        expect(screen.getAllByText('Još ne').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText(/Izabrano:/)).toBeTruthy();
        expect(screen.getByText('Čitaj esej')).toBeTruthy();
        expect(screen.getByText('Zaključano')).toBeTruthy();
        expect(screen.getByText('Nema eseja')).toBeTruthy();
        expect(screen.getByText('Vaš rat i historija')).toBeTruthy();
        expect(screen.getByText('Vaše')).toBeTruthy();

        expect(panel.textContent).not.toContain('The Choices That Made This War');
        expect(panel.textContent).not.toContain('Faced');
        expect(panel.textContent).not.toContain('Not yet');
        expect(panel.textContent).not.toContain('Chose:');
        expect(panel.textContent).not.toContain('Read essay');
        expect(panel.textContent).not.toContain('Locked');
        expect(panel.textContent).not.toContain('No essay');
        expect(panel.textContent).not.toContain('Your War vs History');
        expect(panel.textContent).not.toContain('You authored');
        expect(panel.textContent).not.toContain('Yours');
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
        const essayRow = screen.getByText('The Dayton Agreement: Ending the War, Freezing the Questions').closest('button');
        expect(essayRow?.getAttribute('data-testid')).toBe('codex-essay-row');
        expect(essayRow?.getAttribute('data-awwv-codex-state')).toBe('unlocked');
        expect(essayRow?.getAttribute('data-selected')).toBe('false');
        fireEvent.click(essayRow!);

        expect(screen.getByTestId('codex-selected-essay')).toBeTruthy();
        expect(screen.getByTestId('codex-selected-essay').getAttribute('data-essay-id')).toBe('essay_dayton_signed_1995');
        expect(screen.getByTestId('codex-selected-essay-body').getAttribute('data-awwv-codex-selected-state')).toBe('unlocked');
        expect(essayRow?.getAttribute('data-selected')).toBe('true');
        expect(screen.getAllByText('Player War Divergence')).toHaveLength(2);
        expect(screen.getByText('War lasted 6 weeks longer than the historical 182 weeks')).toBeTruthy();
        expect(screen.getByText('Federation controlled 54.0% territory vs historical 51%')).toBeTruthy();
    });

    it('localizes generated BCS divergence notes inside dynamic Codex essays', () => {
        setLocale('bcs');
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
        fireEvent.click(screen.getByText('Daytonski sporazum: kraj rata, zamrznuta pitanja'));

        expect(screen.getAllByText('Odstupanje igračevog rata').length).toBeGreaterThanOrEqual(2);
        expect(screen.queryByText('Player War Divergence')).toBeNull();
        expect(screen.getByText('Historijski kontekst')).toBeTruthy();
        expect(screen.queryByText('War lasted 6 weeks longer than the historical 182 weeks')).toBeNull();
        expect(screen.getByText('Podaci iz zavrsnog zapisa: Rat je trajao 6 sedmica duže od historijskih 182 sedmica.')).toBeTruthy();
        expect(screen.getByText('Federacija je kontrolisala 54.0% teritorije naspram historijskih 51%.')).toBeTruthy();
    });

    it('renders Cost Ledger prosecutorial findings in Codex endgame essays', () => {
        storeState = {
            loadedGameState: {
                firedEvents: [firedEvent('dayton_signed_1995')],
                gameOver: true,
                historicalComparison: {
                    duration_delta_weeks: 0,
                    territory_divergence: {},
                    casualty_ratio: 1,
                    displacement_ratio: 1,
                    rupture_divergence: [],
                    divergence_notes: [],
                },
                costLedger: {
                    war_duration_weeks: 188,
                    entries: [],
                    rupture_consequences: [],
                    total_military_killed: 46500,
                    total_civilian_killed: 38000,
                    findings: [
                        {
                            id: 'human_cost_record',
                            category: 'human_cost',
                            severity: 'grave',
                            title: 'Human cost record',
                            text: 'The ledger records 46,500 military killed and 38,000 civilian killed.',
                            sources: ['RDC Sarajevo, Bosnian Book of the Dead (2007)'],
                        },
                        {
                            id: 'war_crimes_record_RS',
                            category: 'war_crimes',
                            severity: 'grave',
                            faction: 'RS',
                            title: 'RS war-crimes record',
                            text: 'RS capital records contain 14 war-crime events.',
                            sources: ['Sensitive History Design Gate §4'],
                        },
                    ],
                },
            },
        };

        renderPanel();
        fireEvent.click(screen.getByText('1995'));
        fireEvent.click(screen.getByText('The Dayton Agreement: Ending the War, Freezing the Questions'));

        expect(screen.getAllByText('Player War Divergence').length).toBeGreaterThanOrEqual(2);
        expect(screen.getByText('Human cost record: The ledger records 46,500 military killed and 38,000 civilian killed.')).toBeTruthy();
        expect(screen.getAllByText(/Sources: RDC Sarajevo/).length).toBeGreaterThanOrEqual(1);
    });

    it('hides unfired non-ghost essays from the sidebar entirely', () => {
        // Per the 2026-05-17 visibility spec: the Codex must not list essays that
        // were never surfaced to the player. Locked entries used to render greyed-out
        // and clickable; they no longer do. With no fired events and no ghost
        // conditions met, every year section is empty and collapses.
        storeState = {
            loadedGameState: {
                firedEvents: [],
                gameOver: false,
            },
        };

        renderPanel();

        expect(screen.queryByText('The Dayton Agreement: Ending the War, Freezing the Questions')).toBeNull();
        expect(screen.queryByText('1995')).toBeNull();
        expect(screen.queryByText('1992')).toBeNull();
    });
});
