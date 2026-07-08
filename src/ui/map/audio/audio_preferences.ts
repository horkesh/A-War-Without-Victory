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

export const AUDIO_PREFERENCES_STORAGE_KEY_V1 = 'awwv.audio.preferences.v1';
export const AUDIO_PREFERENCES_STORAGE_KEY = 'awwv.audio.preferences.v2';
export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = {
    muted: false,
    masterVolume: 0.5,
};

const OLD_V1_DEFAULT_AUDIO_PREFERENCES: AudioPreferences = {
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

function isOldV1Default(value: AudioPreferences): boolean {
    return value.muted === OLD_V1_DEFAULT_AUDIO_PREFERENCES.muted
        && value.masterVolume === OLD_V1_DEFAULT_AUDIO_PREFERENCES.masterVolume;
}

function trySaveAudioPreferencesV2(storage: StorageLike, preferences: AudioPreferences): void {
    try {
        storage.setItem(AUDIO_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    } catch {
        // Persistence is best-effort; the in-memory bus state still updates.
    }
}

export function loadAudioPreferences(storage: StorageLike | null = getBrowserStorage()): AudioPreferences {
    if (!storage) return { ...DEFAULT_AUDIO_PREFERENCES };
    try {
        const raw = storage.getItem(AUDIO_PREFERENCES_STORAGE_KEY);
        if (raw) return normalizeAudioPreferences(JSON.parse(raw));
        const legacyRaw = storage.getItem(AUDIO_PREFERENCES_STORAGE_KEY_V1);
        if (!legacyRaw) return { ...DEFAULT_AUDIO_PREFERENCES };
        const legacy = normalizeAudioPreferences(JSON.parse(legacyRaw));
        // Pre-WP-8 untouched profiles stored this exact silent default. A user who
        // deliberately accepted mute at 0.5 is indistinguishable, so prefer unmuting:
        // accidental silence hides that the soundscape exists, while mute is one click.
        const migrated = isOldV1Default(legacy) ? { ...DEFAULT_AUDIO_PREFERENCES } : legacy;
        trySaveAudioPreferencesV2(storage, migrated);
        return migrated;
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
        trySaveAudioPreferencesV2(storage, normalized);
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
