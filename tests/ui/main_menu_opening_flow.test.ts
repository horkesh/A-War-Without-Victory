// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createElement } from 'react';
import { readFileSync } from 'node:fs';
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

function dismissSplash() {
    fireEvent.click(screen.getByRole('button', { name: 'Assume responsibility' }));
}

function openingScene(): string | null {
    return screen.getByRole('main').getAttribute('data-opening-scene');
}

describe('MainMenu cinematic opening flow', () => {
    beforeEach(() => {
        setLocale('en');
        window.localStorage.clear();
    });

    afterEach(() => {
        cleanup();
        setLocale('en');
        window.localStorage.clear();
    });

    it('uses opaque institutional command surfaces rather than glass cards', () => {
        const css = readFileSync('src/ui/map/styles/globals.css', 'utf8');
        const surfaces = css.match(/\.main-menu-opening__console,\s*\.main-menu-opening__faction-rail\s*\{([^}]*)\}/)?.[1] ?? '';

        expect(surfaces).toContain('background: #080d0d;');
        expect(surfaces).not.toContain('backdrop-filter');
        expect(surfaces).not.toMatch(/background:\s*rgba/);
    });

    it('shows the splash before exposing the menu', () => {
        renderMenu();

        expect(screen.getByRole('dialog', { name: 'A War Without Victory' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'New War' })).toBeNull();

        dismissSplash();
        expect(screen.getByRole('button', { name: 'New War' })).toBeTruthy();
    });

    it('keeps landing, faction selection, and records on the neutral scene before selection', () => {
        renderMenu();
        dismissSplash();

        expect(openingScene()).toBe('neutral');
        fireEvent.click(screen.getByRole('button', { name: 'Field Records' }));
        expect(openingScene()).toBe('neutral');
        fireEvent.click(screen.getByRole('button', { name: /Back/ }));
        fireEvent.click(screen.getByRole('button', { name: 'New War' }));
        expect(openingScene()).toBe('neutral');
    });

    it('preserves canonical faction order and explicit selected semantics', () => {
        renderMenu();
        dismissSplash();
        fireEvent.click(screen.getByRole('button', { name: 'New War' }));

        const choices = screen.getAllByTestId(/^main-menu-faction-/);
        expect(choices.map((choice) => choice.getAttribute('data-testid'))).toEqual([
            'main-menu-faction-RBiH',
            'main-menu-faction-RS',
            'main-menu-faction-HRHB',
        ]);
        expect(choices.map((choice) => choice.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'false']);

        fireEvent.click(choices[1]);
        expect(screen.getByTestId('main-menu-faction-RS').getAttribute('aria-pressed')).toBe('true');
    });

    it('previews the selected canonical warroom without starting and latest selection wins', () => {
        const { onNewGame } = renderMenu();
        dismissSplash();
        fireEvent.click(screen.getByRole('button', { name: 'New War' }));

        fireEvent.click(screen.getByTestId('main-menu-faction-RS'));
        expect(openingScene()).toBe('RS');
        expect(document.querySelector('img[src*="hq_rs_1992"]')).toBeTruthy();
        expect(onNewGame).not.toHaveBeenCalled();

        fireEvent.click(screen.getByTestId('main-menu-faction-HRHB'));
        expect(openingScene()).toBe('HRHB');
        expect(document.querySelector('img[src*="hq_hrhb_1992"]')).toBeTruthy();
        expect(onNewGame).not.toHaveBeenCalled();
    });

    it('keeps the selected room through dossier and mode while Back never starts', async () => {
        const { onNewGame } = renderMenu();
        dismissSplash();
        fireEvent.click(screen.getByRole('button', { name: 'New War' }));
        fireEvent.click(screen.getByTestId('main-menu-faction-HRHB'));

        expect(openingScene()).toBe('HRHB');
        expect(screen.getByRole('heading', { name: 'Croatian Republic of Herzeg-Bosnia' })).toBeTruthy();
        await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Take command' })));
        fireEvent.click(screen.getByRole('button', { name: 'Take command' }));
        expect(openingScene()).toBe('HRHB');
        fireEvent.click(screen.getByRole('button', { name: /Back/ }));
        expect(openingScene()).toBe('HRHB');
        expect(onNewGame).not.toHaveBeenCalled();
    });

    it('returns to the matching dossier when faction changes from mode', () => {
        const { onNewGame } = renderMenu();
        dismissSplash();
        fireEvent.click(screen.getByRole('button', { name: 'New War' }));
        fireEvent.click(screen.getByTestId('main-menu-faction-RS'));
        fireEvent.click(screen.getByRole('button', { name: 'Take command' }));

        fireEvent.click(screen.getByTestId('main-menu-faction-RBiH'));
        expect(openingScene()).toBe('RBiH');
        expect(screen.getByRole('heading', { name: 'Republic of Bosnia and Herzegovina' })).toBeTruthy();
        expect(screen.getByText('Your war')).toBeTruthy();
        expect(onNewGame).not.toHaveBeenCalled();
    });

    it('starts exactly once only after faction confirmation and mode selection', async () => {
        const { onNewGame } = renderMenu();
        dismissSplash();
        fireEvent.click(screen.getByRole('button', { name: 'New War' }));
        fireEvent.click(screen.getByTestId('main-menu-faction-RBiH'));
        fireEvent.click(screen.getByRole('button', { name: 'Take command' }));

        const modeGroup = screen.getByRole('radiogroup', { name: 'How should the war unfold?' });
        expect(within(modeGroup).getByRole('radio', { name: /Let it run from here/i }).getAttribute('aria-checked')).toBe('true');
        expect(within(modeGroup).getByRole('radio', { name: /Let history run as it did/i }).getAttribute('aria-checked')).toBe('false');

        await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Begin' })));
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
});
