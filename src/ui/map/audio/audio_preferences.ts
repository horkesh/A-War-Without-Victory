import { useEffect, useRef, useState } from 'react';
import { settingsRecord, type SettingsBridge } from '../preferences/nativeSettings.js';
import {
    muteAudio,
    setEnabled,
    setMasterVolume,
    setMusicPlaybackEnabled,
    setMusicVolume,
    unmuteAudio,
} from './audio_engine.js';

export interface AudioPreferences {
    muted: boolean;
    masterVolume: number;
    musicEnabled?: boolean;
    musicVolume?: number;
    /** Set once music on/off is read under the current default (see MUSIC_DEFAULTS_VERSION). */
    musicDefaultsVersion?: number;
}

/**
 * Music plays by default (owner, 2026-11-10). Profiles saved before this stored the old
 * "off" default, indistinguishable from a deliberate choice, so a record from an older
 * defaults version takes the new default once; any later choice is kept.
 */
export const MUSIC_DEFAULTS_VERSION = 2;

interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

export const AUDIO_PREFERENCES_STORAGE_KEY_V1 = 'awwv.audio.preferences.v1';
export const AUDIO_PREFERENCES_STORAGE_KEY = 'awwv.audio.preferences.v2';
export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = {
    muted: false,
    masterVolume: 0.5,
    musicEnabled: true,
    musicVolume: 0.5,
    musicDefaultsVersion: MUSIC_DEFAULTS_VERSION,
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
        musicEnabled: typeof record.musicEnabled === 'boolean' ? record.musicEnabled : DEFAULT_AUDIO_PREFERENCES.musicEnabled,
        musicVolume: clampMasterVolume(record.musicVolume),
        musicDefaultsVersion: MUSIC_DEFAULTS_VERSION,
    };
}

/**
 * Read a SAVED record (browser storage or the desktop profile). A record from before
 * MUSIC_DEFAULTS_VERSION stored the old "music off" default, not a choice: it takes the
 * current default once. In-memory updates go through normalizeAudioPreferences only.
 */
export function readStoredAudioPreferences(value: unknown): AudioPreferences {
    const record = value && typeof value === 'object' ? value as Partial<AudioPreferences> : {};
    const migrated = record.musicDefaultsVersion === MUSIC_DEFAULTS_VERSION
        ? record
        : { ...record, musicEnabled: DEFAULT_AUDIO_PREFERENCES.musicEnabled };
    return normalizeAudioPreferences(migrated);
}

function getBrowserStorage(): StorageLike | null {
    if (typeof window === 'undefined') return null;
    try { return window.localStorage; } catch { return null; }
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
        if (raw) return readStoredAudioPreferences(JSON.parse(raw));
        const legacyRaw = storage.getItem(AUDIO_PREFERENCES_STORAGE_KEY_V1);
        if (!legacyRaw) return { ...DEFAULT_AUDIO_PREFERENCES };
        const legacy = readStoredAudioPreferences(JSON.parse(legacyRaw));
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
    setMusicVolume(normalized.musicVolume ?? 0.5);
    setMusicPlaybackEnabled(normalized.musicEnabled === true);
    return normalized;
}

const listeners = new Set<(value: AudioPreferences) => void>();
let nativeSession: {
    current: AudioPreferences;
    update: (patch: Partial<AudioPreferences>) => void;
} | undefined;

function publishAudioPreferences(value: AudioPreferences): void {
    for (const listener of listeners) listener(value);
}

function hasBrowserPreferences(): boolean {
    try {
        const raw = getBrowserStorage()?.getItem(AUDIO_PREFERENCES_STORAGE_KEY);
        return !!raw && settingsRecord(JSON.parse(raw));
    } catch {
        return false;
    }
}

/** The root audio controller owns native hydration even when Settings is closed. */
export function connectNativeAudioPreferences(bridge: SettingsBridge): () => void {
    const browser = loadAudioPreferences();
    const hasBrowser = hasBrowserPreferences();
    let pending: Partial<AudioPreferences> = {};
    let unsaved: Partial<AudioPreferences> = {};
    let writeTail = Promise.resolve();
    let hydrating = true;

    const apply = () => {
        saveAudioPreferences(session.current);
        applyAudioPreferences(session.current);
        publishAudioPreferences(session.current);
    };
    const persist = (patch: Partial<AudioPreferences>) => {
        writeTail = writeTail.then(async () => {
            // The native store merges patches: stamp the defaults version with every write so a
            // music choice saved there reads back as a choice (MUSIC_DEFAULTS_VERSION).
            unsaved = { ...unsaved, ...patch, musicDefaultsVersion: MUSIC_DEFAULTS_VERSION };
            const result = await bridge.saveSettings({ audioPreferences: unsaved }, {
                merge: true,
                audioDefaults: { ...browser },
            });
            if (result.ok) unsaved = {};
        }).catch(() => { /* Retry unsaved choices with the next edit. */ });
    };
    const session = {
        current: browser,
        update(patch: Partial<AudioPreferences>) {
            session.current = normalizeAudioPreferences({ ...session.current, ...patch });
            if (hydrating) {
                pending = { ...pending, ...patch };
                publishAudioPreferences(session.current);
                return;
            }
            apply();
            persist(patch);
        },
    };
    nativeSession = session;

    void (async () => {
        let profile: Record<string, unknown> | undefined;
        try {
            const result = await bridge.getSettings();
            if (result.ok && settingsRecord(result.settings)) profile = result.settings;
        } catch { /* Use the browser copy if the profile cannot be read. */ }
        if (nativeSession !== session) return;

        const stored = settingsRecord(profile?.audioPreferences) ? profile.audioPreferences : null;
        const edited = Object.keys(pending).length > 0;
        session.current = normalizeAudioPreferences({ ...(stored ? readStoredAudioPreferences(stored) : browser), ...pending });
        hydrating = false;
        if (stored || edited) saveAudioPreferences(session.current);
        applyAudioPreferences(session.current);
        publishAudioPreferences(session.current);
        if (edited || (profile && !stored && hasBrowser)) persist(pending);
    })();

    return () => {
        if (nativeSession === session) nativeSession = undefined;
    };
}

export function useAudioPreferences() {
    const [value, setValue] = useState(() => nativeSession?.current ?? loadAudioPreferences());
    const latest = useRef(value);
    useEffect(() => {
        const receive = (next: AudioPreferences) => {
            latest.current = next;
            setValue(next);
        };
        listeners.add(receive);
        if (nativeSession) receive(nativeSession.current);
        return () => { listeners.delete(receive); };
    }, []);

    const update = (patch: Partial<AudioPreferences>) => {
        if (nativeSession) {
            nativeSession.update(patch);
            return;
        }
        const next = saveAudioPreferences({ ...latest.current, ...patch });
        applyAudioPreferences(next);
        publishAudioPreferences(next);
    };
    return [value, update] as const;
}
