// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
    AUDIO_PREFERENCES_STORAGE_KEY,
    loadAudioPreferences,
} from '../../src/ui/map/audio/audio_preferences.js';
import { SettingsScreen } from '../../src/ui/map/components/SettingsScreen.js';

describe('SettingsScreen audio preferences', () => {
    afterEach(() => {
        cleanup();
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

        expect(loadAudioPreferences(window.localStorage)).toEqual({
            muted: true,
            masterVolume: 0.25,
        });
    });
});
