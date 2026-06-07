// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { setLocale } from '../../src/ui/map/i18n';
import { CreditsScreen } from '../../src/ui/map/components/CreditsScreen';

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
