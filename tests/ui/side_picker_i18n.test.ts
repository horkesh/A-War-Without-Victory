// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { setLocale } from '../../src/ui/map/i18n';
import { SidePickerOverlay } from '../../src/ui/map/components/SidePickerOverlay';

const noop = vi.fn();

function renderSidePicker() {
    render(createElement(SidePickerOverlay, {
        isOpen: true,
        starting: false,
        onClose: noop,
        onSelectFaction: noop,
    }));
}

describe('SidePickerOverlay localization', () => {
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

    it('renders English side-picker copy by default', () => {
        renderSidePicker();

        expect(screen.getByRole('heading', { name: 'Choose your faction' })).toBeTruthy();
        expect(screen.getByLabelText('Load save file')).toBeTruthy();
        expect(screen.getByRole('button', { name: /Load Save from Disk/ })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Continue \(Last Run\)/ })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
    });

    it('renders BCS side-picker copy when BCS is selected', () => {
        setLocale('bcs');

        renderSidePicker();

        expect(screen.getByRole('heading', { name: 'Izaberite frakciju' })).toBeTruthy();
        expect(screen.getByLabelText('Ucitaj sacuvanu igru')).toBeTruthy();
        expect(screen.getByRole('button', { name: /Ucitaj save s diska/ })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Nastavi zadnje pokretanje/ })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Zatvori' })).toBeTruthy();
        expect(screen.getAllByText(/^Snage /).length).toBeGreaterThan(0);
    });
});
