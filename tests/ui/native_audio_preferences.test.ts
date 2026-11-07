// @vitest-environment jsdom

import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AudioSurfaceBedController } from '../../src/ui/map/components/AudioSurfaceBedController';
import { SettingsScreen } from '../../src/ui/map/components/SettingsScreen';
import { InterfaceScaleLayer } from '../../src/ui/map/preferences/InterfaceScale';
import { setInterfaceScale } from '../../src/ui/map/preferences/interfaceScalePreference';
import { setLocale } from '../../src/ui/map/i18n';

const preload = window as Window & { awwv?: unknown };
const initialAudio = { muted: true, musicEnabled: true, masterVolume: .35, musicVolume: .65 };

function renderSettings() {
    setLocale('en');
    render(React.createElement(React.Fragment, null,
        React.createElement(AudioSurfaceBedController, { appScreen: 'mainMenu' }),
        React.createElement(InterfaceScaleLayer, null, React.createElement(SettingsScreen, { onClose: vi.fn() })),
    ));
}

afterEach(() => {
    cleanup();
    delete preload.awwv;
    localStorage.clear();
    setInterfaceScale(100);
});

describe('native audio preference ownership', () => {
    it('hydrates all controls and preserves audio, scale, and unknown keys across overlapping edits', async () => {
        let settings = { audioPreferences: initialAudio, interfaceScale: 125, futureSetting: { present: true } };
        const saveSettings = vi.fn(async (patch: Partial<typeof settings>) => {
            await new Promise(resolve => setTimeout(resolve, 5));
            settings = { ...settings, ...patch, audioPreferences: { ...settings.audioPreferences, ...patch.audioPreferences } };
            return { ok: true };
        });
        preload.awwv = {
            getSettings: vi.fn(async () => ({ ok: true, settings: structuredClone(settings) })),
            saveSettings,
        };

        renderSettings();
        const music = screen.getByRole('button', { name: 'Toggle background music' });
        const mute = screen.getByRole('button', { name: 'Toggle soundscape audio' });
        const master = screen.getByRole<HTMLInputElement>('slider', { name: 'Master volume' });
        const musicVolume = screen.getByRole<HTMLInputElement>('slider', { name: 'Music volume' });
        await waitFor(() => expect(music.getAttribute('aria-pressed')).toBe('true'));
        expect(saveSettings).not.toHaveBeenCalled();
        expect(mute.getAttribute('aria-pressed')).toBe('false');
        expect(master.value).toBe('35');
        expect(musicVolume.value).toBe('65');

        act(() => setInterfaceScale(150));
        fireEvent.change(master, { target: { value: '45' } });
        fireEvent.change(musicVolume, { target: { value: '25' } });
        await waitFor(() => expect(settings).toEqual({
            audioPreferences: { ...initialAudio, masterVolume: .45, musicVolume: .25 },
            interfaceScale: 150,
            futureSetting: { present: true },
        }));
    });

    it('merges an edit made during hydration with the other native audio choices', async () => {
        const settings = { audioPreferences: initialAudio, interfaceScale: 125 };
        let finishRead!: (result: { ok: boolean; settings: typeof settings }) => void;
        const initialRead = new Promise<{ ok: boolean; settings: typeof settings }>(resolve => {
            finishRead = resolve;
        });
        const saveSettings = vi.fn(async () => ({ ok: true }));
        preload.awwv = { getSettings: () => initialRead, saveSettings };

        renderSettings();
        const master = screen.getByRole<HTMLInputElement>('slider', { name: 'Master volume' });
        fireEvent.change(master, { target: { value: '70' } });
        expect(master.value).toBe('70');
        expect(saveSettings).not.toHaveBeenCalled();

        await act(async () => finishRead({ ok: true, settings }));
        expect(master.value).toBe('70');
        expect(screen.getByRole('button', { name: 'Toggle background music' }).getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByRole('slider', { name: 'Music volume' })).toHaveProperty('value', '65');
        await waitFor(() => expect(saveSettings).toHaveBeenCalledWith(
            { audioPreferences: { masterVolume: .7 } },
            expect.objectContaining({ merge: true }),
        ));
    });

    it('retries a failed field alongside the next edit', async () => {
        const saveSettings = vi.fn()
            .mockResolvedValueOnce({ ok: false })
            .mockResolvedValueOnce({ ok: true });
        preload.awwv = {
            getSettings: async () => ({ ok: true, settings: { audioPreferences: initialAudio, interfaceScale: 125 } }),
            saveSettings,
        };
        renderSettings();
        const master = screen.getByRole<HTMLInputElement>('slider', { name: 'Master volume' });
        const music = screen.getByRole<HTMLInputElement>('slider', { name: 'Music volume' });
        await waitFor(() => expect(master.value).toBe('35'));
        fireEvent.change(master, { target: { value: '45' } });
        fireEvent.change(music, { target: { value: '25' } });
        await waitFor(() => expect(saveSettings).toHaveBeenLastCalledWith(
            { audioPreferences: { masterVolume: .45, musicVolume: .25 } },
            expect.objectContaining({ merge: true }),
        ));
    });
});
