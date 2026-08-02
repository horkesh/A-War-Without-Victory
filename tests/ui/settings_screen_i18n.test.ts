// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LOCALE_STORAGE_KEY, setLocale } from '../../src/ui/map/i18n';
import { SettingsScreen } from '../../src/ui/map/components/SettingsScreen';

describe('SettingsScreen localization control', () => {
    afterEach(() => {
        cleanup();
        window.localStorage.clear();
    });

    it('renders English settings copy by default', () => {
        render(createElement(SettingsScreen, { onClose: () => {} }));

        expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Language' }));
        expect(screen.getByRole('combobox', { name: 'Language' })).toBeTruthy();
        expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull();
    });

    it('persists and renders preview Bosnian settings copy when selected', () => {
        render(createElement(SettingsScreen, { onClose: () => {} }));

        fireEvent.click(screen.getByRole('button', { name: 'Language' }));
        fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), {
            target: { value: 'bs' },
        });

        expect(screen.getByRole('heading', { name: 'Postavke' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Zatvori' })).toBeTruthy();
        expect(screen.getByRole('option', { name: 'Bosanski (Preview)' })).toBeTruthy();
        expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('bs');
    });

    it('renders Bosnian audio settings copy when Bosnian is selected', () => {
        setLocale('bs');

        render(createElement(SettingsScreen, { onClose: () => {} }));

        expect(screen.getByRole('button', { name: 'Zvuk' })).toBeTruthy();
        expect(screen.getByText('Zvučna slika')).toBeTruthy();
        expect(screen.getByText('Dozvoli audio signale taktičke karte')).toBeTruthy();
        expect(screen.getByRole('slider', { name: 'Glavna jačina zvuka' })).toBeTruthy();
    });
});
