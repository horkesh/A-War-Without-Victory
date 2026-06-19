// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { setLocale } from '../../src/ui/map/i18n';
import { WarHasBegunSplash } from '../../src/ui/map/components/WarHasBegunSplash';
import { PeaceWarTransition } from '../../src/ui/map/components/PeaceWarTransition';
import { makeMockLoadedGameState } from '../../src/ui/map/__mocks__/loadedGameState';
import type { LoadedGameState } from '../../src/ui/map/data/types';

function playerState(faction: LoadedGameState['player_faction']): LoadedGameState {
    return { ...makeMockLoadedGameState(), player_faction: faction };
}

describe('WarHasBegunSplash (game-start intro — step 1)', () => {
    beforeEach(() => {
        window.localStorage.clear();
        setLocale('en');
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        cleanup();
        window.localStorage.clear();
        setLocale('en');
    });

    it('renders the blood-red splash title, date, and acknowledge affordance', () => {
        render(createElement(WarHasBegunSplash, { onDismiss: vi.fn() }));
        expect(screen.getByText('WAR HAS STARTED')).toBeTruthy();
        expect(screen.getByText('APRIL 1992')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Acknowledge' })).toBeTruthy();
    });

    it('auto-advances exactly once after the hold elapses', () => {
        const onDismiss = vi.fn();
        render(createElement(WarHasBegunSplash, { onDismiss, holdMs: 2000 }));
        expect(onDismiss).not.toHaveBeenCalled();
        act(() => {
            vi.advanceTimersByTime(5000);
        });
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('skips on click and dismisses once after the fade-out', () => {
        const onDismiss = vi.fn();
        render(createElement(WarHasBegunSplash, { onDismiss }));
        fireEvent.click(screen.getByRole('dialog'));
        act(() => {
            vi.advanceTimersByTime(2000);
        });
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('skips on any key press', () => {
        const onDismiss = vi.fn();
        render(createElement(WarHasBegunSplash, { onDismiss }));
        fireEvent.keyDown(window, { key: 'Enter' });
        act(() => {
            vi.advanceTimersByTime(2000);
        });
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });
});

describe('PeaceWarTransition identity block (game-start intro — step 2)', () => {
    beforeEach(() => {
        window.localStorage.clear();
        setLocale('en');
    });

    afterEach(() => {
        cleanup();
        window.localStorage.clear();
        setLocale('en');
    });

    it('renders the RBiH "who you are" block with the President-of-the-Presidency copy', () => {
        render(createElement(PeaceWarTransition, { onDismiss: vi.fn(), state: playerState('RBiH') }));
        expect(screen.getByRole('dialog', { name: /War begins:/i })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Begin' })).toBeTruthy();
        expect(screen.getByText('WHO YOU ARE')).toBeTruthy();
        expect(
            screen.getByText(/President of the Presidency of the Republic of Bosnia and Herzegovina/),
        ).toBeTruthy();
        expect(screen.getByText('What you cannot escape')).toBeTruthy();
    });

    it('renders the RS Assembly / genocide-warning copy for the RS player', () => {
        render(createElement(PeaceWarTransition, { onDismiss: vi.fn(), state: playerState('RS') }));
        expect(screen.getByText(/six strategic goals for the Serb people of Bosnia/)).toBeTruthy();
        expect(screen.getByText(/constitute genocide/)).toBeTruthy();
    });

    it('renders the HRHB two-capitals copy for the HRHB player', () => {
        render(createElement(PeaceWarTransition, { onDismiss: vi.fn(), state: playerState('HRHB') }));
        expect(screen.getByText(/Croat para-state proclaimed at Grude/)).toBeTruthy();
    });

    it('omits the identity block when there is no player faction', () => {
        render(createElement(PeaceWarTransition, { onDismiss: vi.fn(), state: playerState(null) }));
        expect(screen.queryByText('WHO YOU ARE')).toBeNull();
    });

    it('keeps the outside-click backdrop dismissible without exposing a covered named control', () => {
        const onDismiss = vi.fn();
        render(createElement(PeaceWarTransition, { onDismiss, state: playerState('RBiH') }));

        expect(screen.queryByRole('button', { name: 'Close WAR BEGINS' })).toBeNull();
        fireEvent.click(screen.getByTestId('glass-panel-backdrop'));

        expect(onDismiss).toHaveBeenCalledTimes(1);
    });
});
