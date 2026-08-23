// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { setLocale } from '../../src/ui/map/i18n';
import { MainMenu } from '../../src/ui/map/components/MainMenu';

const noop = vi.fn();

function renderMainMenu(hasSave = true, errorMessage?: string) {
    render(createElement(MainMenu, {
        hasSave,
        errorMessage,
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
        expect(screen.getByRole('button', { name: 'New War' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Field Records' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'New War' }));
        expect(screen.getByRole('button', { name: /Republic of Bosnia and Herzegovina/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Republika Srpska/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Croatian Republic of Herzeg-Bosnia/i })).toBeTruthy();
    });

    it('renders BCS main menu copy when BCS is selected', () => {
        setLocale('bcs');

        renderMainMenu();

        expect(screen.getByText('Pyrrhic Games predstavlja')).toBeTruthy();
        expect(screen.getByText('Bosna i Hercegovina, 1992-1995')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Nastavi' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Ratni zapisi' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Zasluge' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Novi rat' }));
        expect(screen.getByRole('button', { name: /Republika Bosna i Hercegovina/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Republika Srpska/i })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Republic of Bosnia and Herzegovina/i })).toBeNull();
    });

    it('hides localized continue action when no save exists', () => {
        setLocale('bcs');

        renderMainMenu(false);

        expect(screen.queryByRole('button', { name: 'Nastavi' })).toBeNull();
    });

    it('sanitizes raw startup errors before rendering them', () => {
        renderMainMenu(true, 'Missing event_id for response_id opt_a');

        expect(screen.getByText('The requested action could not be completed.')).toBeTruthy();
        expect(screen.queryByText(/event_id|response_id/i)).toBeNull();
    });
});
