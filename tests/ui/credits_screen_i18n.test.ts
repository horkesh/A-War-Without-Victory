// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { setLocale } from '../../src/ui/map/i18n';
import { CreditsScreen } from '../../src/ui/map/components/CreditsScreen';
import { Z } from '../../src/ui/shared/zIndex';

const noop = vi.fn();

describe('CreditsScreen localization', () => {
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

    it('renders English credits copy by default', () => {
        render(createElement(CreditsScreen, { onClose: noop }));

        expect(screen.getByRole('heading', { name: 'Credits' })).toBeTruthy();
        expect(screen.getByText('Historical Sources')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
    });

    it('opens above the main menu with its panel above the backdrop close target', () => {
        render(createElement(CreditsScreen, { onClose: noop }));

        const overlay = screen.getByTestId('credits-osm-attribution').closest('.fixed') as HTMLElement;
        // The main menu sits at HARD_MODAL; at MODAL_HARD the credits rendered behind it.
        expect(overlay.style.zIndex).toBe(String(Z.HARD_MODAL));
        // The backdrop button is absolutely positioned; a static panel would sit under it
        // and the copyright link and Close button could not be clicked.
        const panel = screen.getByRole('heading', { name: 'Credits' }).parentElement as HTMLElement;
        expect(panel.className.split(/\s+/)).toContain('relative');
    });

    it('credits OpenStreetMap under ODbL 1.0 in English', () => {
        render(createElement(CreditsScreen, { onClose: noop }));

        expect(screen.getByText('Map Data')).toBeTruthy();
        expect(screen.getByTestId('credits-osm-attribution').textContent).toBe('© OpenStreetMap contributors');
        expect(screen.getByText(/available under the Open Database License \(ODbL\) 1\.0/)).toBeTruthy();
        const link = screen.getByRole('link', { name: 'openstreetmap.org/copyright' });
        expect(link.getAttribute('href')).toBe('https://www.openstreetmap.org/copyright');
    });

    it('credits OpenStreetMap in BCS and shows the copyright page as text in the desktop app', () => {
        setLocale('bcs');
        (window as Window & { awwv?: unknown }).awwv = {};
        try {
            render(createElement(CreditsScreen, { onClose: noop }));

            expect(screen.getByText('Kartografski podaci')).toBeTruthy();
            expect(screen.getByTestId('credits-osm-attribution').textContent).toBe('© OpenStreetMap saradnici');
            expect(screen.getByText(/dostupni pod licencom Open Database License \(ODbL\) 1\.0/)).toBeTruthy();
            expect(screen.getByText('openstreetmap.org/copyright')).toBeTruthy();
            expect(screen.queryByRole('link', { name: 'openstreetmap.org/copyright' })).toBeNull();
        } finally {
            delete (window as Window & { awwv?: unknown }).awwv;
        }
    });

    it('renders BCS credits copy when BCS is selected', () => {
        setLocale('bcs');

        render(createElement(CreditsScreen, { onClose: noop }));

        expect(screen.getByRole('heading', { name: 'Zasluge' })).toBeTruthy();
        expect(screen.getByText('Dizajn i razvoj')).toBeTruthy();
        expect(screen.getByText('Historijski izvori')).toBeTruthy();
        expect(screen.getByText('Strateška simulacija bosanskog rata 1992-1995')).toBeTruthy();
        expect(screen.getByText('Ova igra je posvećena sjećanju na sve koji su patili u bosanskom ratu, 1992-1995.')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Zatvori' })).toBeTruthy();
    });
});
