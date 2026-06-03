// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { setLocale } from '../../src/ui/map/i18n';
import { MainMenu } from '../../src/ui/map/components/MainMenu';

const noop = vi.fn();

function renderMainMenu(hasSave = true) {
    render(createElement(MainMenu, {
        hasSave,
        onNewGame: noop,
        onContinue: noop,
        onLoadGame: noop,
        onSettings: noop,
        onCredits: noop,
        onQuit: noop,
    }));
}

describe('MainMenu localization', () => {
    beforeEach(() => {
        window.localStorage.clear();
        setLocale('en');
        noop.mockClear();
    });

    afterEach(() => {
        cleanup();
        window.localStorage.clear();
        setLocale('en');
    });

    it('renders English main menu copy by default', () => {
        renderMainMenu();

        expect(screen.getByText('Pyrrhic Games presents')).toBeTruthy();
        expect(screen.getByRole('button', { name: /Republic of Bosnia and Herzegovina/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Republika Srpska/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Croatian Republic of Herzeg-Bosnia/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Load Game' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Credits' })).toBeTruthy();
    });

    it('renders BCS main menu copy when BCS is selected', () => {
        setLocale('bcs');

        renderMainMenu();

        expect(screen.getByText('Pyrrhic Games predstavlja')).toBeTruthy();
        expect(screen.getByText('Bosna i Hercegovina, 1992-1995')).toBeTruthy();
        expect(screen.getByRole('button', { name: /Republika Srpska/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Nastavi' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Učitaj igru' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Zasluge' })).toBeTruthy();
    });

    it('hides localized continue action when no save exists', () => {
        setLocale('bcs');

        renderMainMenu(false);

        expect(screen.queryByRole('button', { name: 'Nastavi' })).toBeNull();
    });
});
