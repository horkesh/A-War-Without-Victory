// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, Fragment, useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
    AUDIO_PREFERENCES_STORAGE_KEY,
    loadAudioPreferences,
} from '../../src/ui/map/audio/audio_preferences.js';
import { SettingsScreen } from '../../src/ui/map/components/SettingsScreen.js';
import { MainMenu } from '../../src/ui/map/components/MainMenu.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';

/**
 * Mirrors `App.tsx`: `MainMenu` and `SettingsScreen` are siblings in that
 * order, so the Settings modal must paint above the menu that opened it.
 */
function MainMenuWithSettings() {
    const [settingsOpen, setSettingsOpen] = useState(false);

    return createElement(
        Fragment,
        null,
        createElement(MainMenu, {
            hasSave: false,
            onNewGame: vi.fn(),
            onContinue: vi.fn(),
            onLoadGame: vi.fn(),
            onSettings: () => setSettingsOpen(true),
            onCredits: vi.fn(),
            onQuit: vi.fn(),
        }),
        settingsOpen && createElement(SettingsScreen, {
            onClose: () => setSettingsOpen(false),
        }),
    );
}

function openSettingsFromMainMenu(): HTMLElement {
    // OpeningSplash owns the first screen; dismiss it with its real Enter path.
    if (screen.queryByRole('button', { name: 'Assume responsibility' })) {
        fireEvent.keyDown(window, { key: 'Enter' });
    }
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    return screen.getByTestId('settings-panel');
}

function rootOf(panel: HTMLElement): HTMLElement {
    const root = panel.parentElement;
    if (!root) throw new Error('Settings panel has no root element');
    return root;
}

describe('SettingsScreen audio preferences', () => {
    beforeEach(() => {
        setLocale('en');
    });

    afterEach(() => {
        cleanup();
        setLocale('en');
        window.localStorage.clear();
    });

    it('renders persisted mute and master volume controls', () => {
        window.localStorage.setItem(
            AUDIO_PREFERENCES_STORAGE_KEY,
            JSON.stringify({ muted: false, masterVolume: 0.4 }),
        );

        render(createElement(SettingsScreen, { onClose: () => {} }));
        fireEvent.click(screen.getByRole('button', { name: 'Audio' }));

        expect(screen.getByRole('button', { name: 'Toggle soundscape audio' }).getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByRole('slider', { name: 'Master volume' }).getAttribute('value')).toBe('40');
    });

    it('persists mute and master volume changes locally', () => {
        render(createElement(SettingsScreen, { onClose: () => {} }));
        fireEvent.click(screen.getByRole('button', { name: 'Audio' }));

        fireEvent.click(screen.getByRole('button', { name: 'Toggle soundscape audio' }));
        fireEvent.change(screen.getByRole('slider', { name: 'Master volume' }), {
            target: { value: '25' },
        });

        expect(loadAudioPreferences(window.localStorage)).toEqual({ musicEnabled: true, musicVolume: 0.5, musicDefaultsVersion: 2, muted: true,
            masterVolume: 0.25,
        });
    });

    it('paints above the real main menu and keeps audio controls reachable', () => {
        render(createElement(MainMenuWithSettings));
        const settingsRoot = rootOf(openSettingsFromMainMenu());
        const menuRoot = screen.getByRole('main');

        const menuTier = Number.parseInt(menuRoot.style.zIndex, 10);
        const settingsTier = Number.parseInt(settingsRoot.style.zIndex, 10);

        expect(Number.isFinite(menuTier)).toBe(true);
        expect(Number.isFinite(settingsTier)).toBe(true);
        expect(settingsTier).toBeGreaterThanOrEqual(menuTier);
        if (settingsTier === menuTier) {
            // Equal tiers: the later DOM sibling (Settings, rendered after
            // MainMenu in App) must win the paint order.
            expect(
                menuRoot.compareDocumentPosition(settingsRoot) & Node.DOCUMENT_POSITION_FOLLOWING,
            ).toBeTruthy();
        }

        fireEvent.click(screen.getByRole('button', { name: 'Audio' }));
        const toggle = screen.getByRole('button', { name: 'Toggle soundscape audio' });
        expect(toggle.getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(toggle);
        fireEvent.change(screen.getByRole('slider', { name: 'Master volume' }), {
            target: { value: '35' },
        });

        expect(loadAudioPreferences(window.localStorage)).toEqual({ musicEnabled: true, musicVolume: 0.5, musicDefaultsVersion: 2, muted: true,
            masterVolume: 0.35,
        });
    });

    it('restores the main menu through Escape and the close control', () => {
        render(createElement(MainMenuWithSettings));
        openSettingsFromMainMenu();

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(screen.queryByTestId('settings-panel')).toBeNull();
        expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(screen.queryByTestId('settings-panel')).toBeNull();
        expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy();
    });
});
