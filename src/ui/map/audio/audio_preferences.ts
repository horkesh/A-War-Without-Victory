import {
    muteAudio,
    setEnabled,
    setMasterVolume,
    unmuteAudio,
} from './audio_engine.js';

export interface AudioPreferences {
    muted: boolean;
    masterVolume: number;
}

interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

export const AUDIO_PREFERENCES_STORAGE_KEY = 'awwv.audio.preferences.v1';
export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = {
    muted: true,
    masterVolume: 0.5,
};

function clampMasterVolume(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return DEFAULT_AUDIO_PREFERENCES.masterVolume;
    }
    return Math.max(0, Math.min(1, value));
}

export function normalizeAudioPreferences(value: unknown): AudioPreferences {
    if (!value || typeof value !== 'object') {
        return { ...DEFAULT_AUDIO_PREFERENCES };
    }
    const record = value as Partial<AudioPreferences>;
    return {
        muted: typeof record.muted === 'boolean' ? record.muted : DEFAULT_AUDIO_PREFERENCES.muted,
        masterVolume: clampMasterVolume(record.masterVolume),
    };
}

function getBrowserStorage(): StorageLike | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
}

export function loadAudioPreferences(storage: StorageLike | null = getBrowserStorage()): AudioPreferences {
    if (!storage) return { ...DEFAULT_AUDIO_PREFERENCES };
    try {
        const raw = storage.getItem(AUDIO_PREFERENCES_STORAGE_KEY);
        return raw ? normalizeAudioPreferences(JSON.parse(raw)) : { ...DEFAULT_AUDIO_PREFERENCES };
    } catch {
        return { ...DEFAULT_AUDIO_PREFERENCES };
    }
}

export function saveAudioPreferences(
    preferences: AudioPreferences,
    storage: StorageLike | null = getBrowserStorage(),
): AudioPreferences {
    const normalized = normalizeAudioPreferences(preferences);
    if (storage) {
        try {
            storage.setItem(AUDIO_PREFERENCES_STORAGE_KEY, JSON.stringify(normalized));
        } catch {
            // Persistence is best-effort; the in-memory bus state still updates.
        }
    }
    return normalized;
}

export function applyAudioPreferences(preferences: AudioPreferences): AudioPreferences {
    const normalized = normalizeAudioPreferences(preferences);
    setEnabled(!normalized.muted);
    if (normalized.muted) {
        muteAudio();
    } else {
        unmuteAudio();
    }
    setMasterVolume(normalized.masterVolume);
    return normalized;
}
