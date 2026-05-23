// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SettingsScreen } from '../../src/ui/map/components/SettingsScreen';
import { useKeyboardShortcuts } from '../../src/ui/map/hooks/useKeyboardShortcuts';
import { useGameStore } from '../../src/ui/map/store/gameStore';

function KeyboardShortcutProbe() {
    useKeyboardShortcuts();
    return createElement('div');
}

describe('SettingsScreen shell cleanup', () => {
    afterEach(() => {
        cleanup();
        window.localStorage.clear();
        document.documentElement.className = '';
        document.documentElement.removeAttribute('data-cb-preset');
        useGameStore.setState(useGameStore.getInitialState());
    });

    it('does not expose dead local-only settings controls', () => {
        render(createElement(SettingsScreen, { onClose: () => {} }));

        expect(screen.queryByRole('button', { name: 'Display' })).toBeNull();
        expect(screen.queryByText('Turn Confirmation')).toBeNull();
        expect(screen.queryByText('Fog of War')).toBeNull();
        expect(screen.queryByRole('combobox', { name: 'Map quality' })).toBeNull();
    });

    it('keeps only settings backed by existing UI substrates visible in the shell', () => {
        render(createElement(SettingsScreen, { onClose: () => {} }));

        expect(screen.getByRole('button', { name: 'Audio' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Accessibility' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Language' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Diagnostics' })).toBeTruthy();
    });

    it('lets Escape close Settings without reopening the pause menu underneath', () => {
        const onClose = vi.fn();
        useGameStore.setState({
            ...useGameStore.getInitialState(),
            pauseMenuOpen: false,
        });

        render(createElement('div', null, [
            createElement(KeyboardShortcutProbe, { key: 'shortcuts' }),
            createElement(SettingsScreen, { key: 'settings', onClose }),
        ]));

        fireEvent.keyDown(window, { key: 'Escape' });

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(useGameStore.getState().pauseMenuOpen).toBe(false);
    });
});
