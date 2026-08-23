// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createElement } from 'react';
import { MainMenu } from '../../src/ui/map/components/MainMenu';
import { setLocale } from '../../src/ui/map/i18n';

function renderMenu(onNewGame = vi.fn()) {
    render(createElement(MainMenu, {
        hasSave: true,
        onNewGame,
        onContinue: vi.fn(),
        onLoadGame: vi.fn(),
        onSettings: vi.fn(),
        onCredits: vi.fn(),
        onQuit: vi.fn(),
    }));
    return { onNewGame };
}

describe('MainMenu case-file opening flow', () => {
    beforeEach(() => {
        setLocale('en');
        window.localStorage.clear();
    });

    afterEach(() => {
        cleanup();
        setLocale('en');
        window.localStorage.clear();
    });

    it('opens on the landing actions rather than exposing faction cards immediately', () => {
        renderMenu();

        expect(screen.getByRole('button', { name: 'New War' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Field Records' })).toBeTruthy();
        expect(screen.queryByTestId('main-menu-faction-RBiH')).toBeNull();
    });

    it('reveals faction choices in canonical order and does not start on selection', async () => {
        const { onNewGame } = renderMenu();
        fireEvent.click(screen.getByRole('button', { name: 'New War' }));

        const choices = screen.getAllByTestId(/^main-menu-faction-/);
        expect(choices.map((choice) => choice.getAttribute('data-testid'))).toEqual([
            'main-menu-faction-RBiH',
            'main-menu-faction-RS',
            'main-menu-faction-HRHB',
        ]);

        fireEvent.click(choices[1]);
        expect(onNewGame).not.toHaveBeenCalled();
        expect(screen.getByRole('heading', { name: 'Republika Srpska' })).toBeTruthy();
        expect(screen.getByText('Your war')).toBeTruthy();
        expect(screen.getByText('You begin')).toBeTruthy();
        expect(screen.getByText('Your constraint')).toBeTruthy();
        expect(screen.getByText('The arc you face')).toBeTruthy();

        await waitFor(() => {
            expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Take command' }));
        });
    });

    it('starts exactly once only after faction confirmation and mode selection', async () => {
        const { onNewGame } = renderMenu();
        fireEvent.click(screen.getByRole('button', { name: 'New War' }));
        fireEvent.click(screen.getByTestId('main-menu-faction-RBiH'));
        fireEvent.click(screen.getByRole('button', { name: 'Take command' }));

        const modeGroup = screen.getByRole('radiogroup', { name: 'How should the war unfold?' });
        expect(within(modeGroup).getByRole('radio', { name: /Let it run from here/i }).getAttribute('aria-checked')).toBe('true');
        expect(within(modeGroup).getByRole('radio', { name: /Let history run as it did/i }).getAttribute('aria-checked')).toBe('false');

        await waitFor(() => {
            expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Begin' }));
        });
        fireEvent.click(within(modeGroup).getByRole('radio', { name: /Let history run as it did/i }));
        const begin = screen.getByRole('button', { name: 'Begin' });
        fireEvent.click(begin);
        fireEvent.click(begin);

        expect(onNewGame).toHaveBeenCalledTimes(1);
        expect(onNewGame).toHaveBeenCalledWith({
            playerFaction: 'RBiH',
            decisionMode: 'historical',
        });
    });

    it('backs up one beat without starting a campaign', () => {
        const { onNewGame } = renderMenu();
        fireEvent.click(screen.getByRole('button', { name: 'New War' }));
        fireEvent.click(screen.getByTestId('main-menu-faction-HRHB'));
        fireEvent.click(screen.getByRole('button', { name: /Back/ }));

        expect(screen.getByTestId('main-menu-faction-HRHB')).toBeTruthy();
        expect(onNewGame).not.toHaveBeenCalled();
    });
});
