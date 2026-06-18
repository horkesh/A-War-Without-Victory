// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { setLocale } from '../../src/ui/map/i18n';
import { PauseMenu } from '../../src/ui/map/components/PauseMenu';

const noop = vi.fn();

function renderPauseMenu() {
    render(createElement(PauseMenu, {
        onResume: noop,
        onSave: noop,
        onSettings: noop,
        onMainMenu: noop,
        onQuit: noop,
    }));
}

describe('PauseMenu localization', () => {
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

    it('renders English pause menu copy by default', () => {
        renderPauseMenu();

        expect(screen.getByText('Paused')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Resume' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Save Game' })).toBeTruthy();
        expect(screen.getByText('Command paused. Planning state is preserved.')).toBeTruthy();
    });

    it('renders BCS pause menu copy when BCS is selected', () => {
        setLocale('bcs');

        renderPauseMenu();

        expect(screen.getByText('Pauzirano')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Nastavi' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Sačuvaj igru' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Glavni meni' })).toBeTruthy();
        expect(screen.getByText('Komanda je pauzirana. Plansko stanje je sačuvano.')).toBeTruthy();
    });
    it('keeps the outside-click backdrop resumable without exposing a covered named control', () => {
        const onResume = vi.fn();
        render(createElement(PauseMenu, {
            onResume,
            onSave: noop,
            onSettings: noop,
            onMainMenu: noop,
            onQuit: noop,
        }));

        expect(screen.queryByLabelText('Resume game')).toBeNull();
        fireEvent.click(screen.getByTestId('pause-menu-backdrop'));

        expect(onResume).toHaveBeenCalledTimes(1);
    });
});
