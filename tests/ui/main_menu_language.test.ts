// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LOCALE_STORAGE_KEY } from '../../src/ui/map/i18n';
import { MainMenu } from '../../src/ui/map/components/MainMenu';

const noop = () => {};

describe('MainMenu language control', () => {
    afterEach(() => {
        cleanup();
        window.localStorage.clear();
    });

    it('exposes language selection on the initial screen', () => {
        render(createElement(MainMenu, {
            hasSave: false,
            onNewGame: noop,
            onContinue: noop,
            onLoadGame: noop,
            onSettings: noop,
            onCredits: noop,
            onQuit: noop,
        }));

        expect(screen.getByRole('combobox', { name: 'Language' })).toBeTruthy();
    });

    it('persists canonical Bosnian from the initial screen before opening settings', () => {
        render(createElement(MainMenu, {
            hasSave: false,
            onNewGame: noop,
            onContinue: noop,
            onLoadGame: noop,
            onSettings: noop,
            onCredits: noop,
            onQuit: noop,
        }));

        fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), {
            target: { value: 'bs' },
        });

        expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('bs');
        expect(screen.getByRole('button', { name: /Republika Srpska/i })).toBeTruthy();
    });
});
