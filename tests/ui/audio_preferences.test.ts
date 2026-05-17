import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    getAudioState,
    resetAudioForTests,
} from '../../src/ui/map/audio/audio_engine.js';
import {
    AUDIO_PREFERENCES_STORAGE_KEY,
    applyAudioPreferences,
    loadAudioPreferences,
    saveAudioPreferences,
} from '../../src/ui/map/audio/audio_preferences.js';

class MemoryStorage {
    private readonly values = new Map<string, string>();

    getItem(key: string): string | null {
        return this.values.get(key) ?? null;
    }

    setItem(key: string, value: string): void {
        this.values.set(key, value);
    }
}

describe('audio preference persistence', () => {
    beforeEach(() => {
        resetAudioForTests();
        vi.stubGlobal('fetch', vi.fn());
        vi.stubGlobal('AudioContext', vi.fn());
    });

    it('defaults to muted with a clamped nonzero master volume preference', () => {
        const prefs = loadAudioPreferences(new MemoryStorage());

        expect(prefs).toEqual({ muted: true, masterVolume: 0.5 });
    });

    it('persists normalized mute and master volume preferences', () => {
        const storage = new MemoryStorage();

        const saved = saveAudioPreferences({ muted: false, masterVolume: 2 }, storage);

        expect(saved).toEqual({ muted: false, masterVolume: 1 });
        expect(JSON.parse(storage.getItem(AUDIO_PREFERENCES_STORAGE_KEY) ?? '{}')).toEqual(saved);
        expect(loadAudioPreferences(storage)).toEqual(saved);
    });

    it('applies preferences to the silent bus without browser audio or network IO', () => {
        const prefs = applyAudioPreferences({ muted: false, masterVolume: 0.35 });

        expect(prefs).toEqual({ muted: false, masterVolume: 0.35 });
        expect(getAudioState()).toMatchObject({
            enabled: true,
            muted: false,
            volumes: expect.objectContaining({ master: 0.35 }),
        });
        expect(globalThis.fetch).not.toHaveBeenCalled();
        expect(globalThis.AudioContext).not.toHaveBeenCalled();
    });
});
