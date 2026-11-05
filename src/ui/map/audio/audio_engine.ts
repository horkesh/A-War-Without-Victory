/**
 * Renderer-only, best-effort audio bus using bundled media URLs.
 * Playback requires enabled sound and a user gesture. Music additionally
 * requires explicit opt-in; the separate ambience policy defaults off.
 * Playback never writes simulation state or blocks a player action.
 */

import { getCueConfig, getMusicConfig, getSfxConfig, resolveCuePlaybackUrl, type AudioCueCategory } from './sound_manifest.js';

export type AudioVolumeKind = 'master' | AudioCueCategory;

interface AudioBusState {
    enabled: boolean;
    muted: boolean;
    /**
     * Reversible ambience-only playback policy gate. Defaults off so ambient
     * beds are silent regardless of global audio enable/mute/volume; UI, music,
     * and stinger cues are unaffected. Owning callers may explicitly opt in.
     */
    ambientPlaybackEnabled: boolean;
    userGestureUnlocked: boolean;
    lastCueId: string | null;
    /**
     * Resolved playback URL for the last accepted cue, via the `audioAssets.ts`
     * Rollup URL-import map. `null` when the cue is a placeholder (no binary
     * wired) — the bus then decodes nothing (silent no-op). This is the field
     * that proves the asset-resolution path is wired without trusting bare
     * manifest strings that do not resolve under `publicDir:false`.
     */
    lastResolvedAssetUrl: string | null;
    currentMusicId: string | null;
    currentAmbientId: string | null;
    requestedAmbientId: string | null;
    requestedMusicId: string | null;
    musicPlaybackEnabled: boolean;
    acceptedCueCount: number;
    lastCueAcceptedAtMsById: Record<string, number>;
    volumes: Record<AudioVolumeKind, number>;
}

const DEFAULT_VOLUMES: Record<AudioVolumeKind, number> = {
    master: 0,
    ui: 0,
    ambient: 0,
    music: 0,
    stinger: 0,
};

type PlaybackAttemptStatus = 'pending' | 'success' | 'failure';

interface PlaybackAttempt {
    status: PlaybackAttemptStatus;
}

const playbackElementsByCueId = new Map<string, HTMLAudioElement>();
const playbackAttemptByElement = new Map<HTMLAudioElement, PlaybackAttempt>();

let state: AudioBusState = {
    enabled: false,
    muted: true,
    ambientPlaybackEnabled: false,
    userGestureUnlocked: false,
    lastCueId: null,
    lastResolvedAssetUrl: null,
    currentMusicId: null,
    currentAmbientId: null,
    requestedAmbientId: null,
    requestedMusicId: null,
    musicPlaybackEnabled: false,
    acceptedCueCount: 0,
    lastCueAcceptedAtMsById: {},
    volumes: { ...DEFAULT_VOLUMES },
};

function clampVolume(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
}

function getPlaybackElement(cueId: string, resolvedAssetUrl: string): HTMLAudioElement | null {
    if (typeof Audio === 'undefined') return null;
    const existing = playbackElementsByCueId.get(cueId);
    // Browser src is absolute even when the bundled URL is relative. The
    // cue's cached element already owns its URL; only failed decodes need a
    // fresh element to reset the browser's terminal media-error state.
    if (existing && !existing.error) return existing;
    if (existing) {
        stopPlayback(cueId);
        playbackAttemptByElement.delete(existing);
    }
    const element = new Audio(resolvedAssetUrl);
    element.preload = 'auto';
    playbackElementsByCueId.set(cueId, element);
    return element;
}

function isHealthyRunningLoop(element: HTMLAudioElement): boolean {
    const attempt = playbackAttemptByElement.get(element);
    return attempt?.status === 'success'
        && element.loop === true
        && element.paused === false
        && element.ended === false
        && element.error === null;
}

function settlePlaybackAttempt(
    element: HTMLAudioElement,
    attempt: PlaybackAttempt,
    status: 'success' | 'failure',
): void {
    if (playbackAttemptByElement.get(element) !== attempt) return;
    attempt.status = status;
}

function playResolvedAsset(cueId: string, resolvedAssetUrl: string, category: AudioCueCategory, defaultVolume: number, loop = false): void {
    try {
        const element = getPlaybackElement(cueId, resolvedAssetUrl);
        if (!element) return;
        const loopChanged = element.loop !== loop;
        if (loopChanged) element.loop = loop;
        const volume = clampVolume(state.volumes.master * state.volumes[category] * defaultVolume);
        if (element.volume !== volume) element.volume = volume;
        if (!loopChanged && loop && isHealthyRunningLoop(element)) return;
        const attempt: PlaybackAttempt = { status: 'pending' };
        playbackAttemptByElement.set(element, attempt);
        try {
            if (!loop) element.currentTime = 0;
            const playResult: Promise<void> | undefined = element.play();
            if (playResult && typeof playResult.then === 'function') {
                void playResult.then(
                    () => settlePlaybackAttempt(element, attempt, 'success'),
                    () => settlePlaybackAttempt(element, attempt, 'failure'),
                );
            }
        } catch {
            // Autoplay/decode failures cannot interrupt the player action.
            settlePlaybackAttempt(element, attempt, 'failure');
        }
    } catch {
        // Media construction and property setters can fail as well as play().
    }
}

function stopPlayback(cueId: string): void {
    const element = playbackElementsByCueId.get(cueId);
    if (!element) return;
    try {
        element.pause();
    } catch {
        // Best-effort stop; the bus state remains canonical.
    }
}

function stopAllPlayback(): void {
    for (const cueId of playbackElementsByCueId.keys()) {
        stopPlayback(cueId);
    }
}

export function initAudio(): void {
    // Browser audio work is deferred until cue playback after user gesture.
}

export function unlockAudioForUserGesture(): void {
    state = { ...state, userGestureUnlocked: true };
}

export function installAudioGestureUnlockListeners(
    target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'> | null =
        typeof window === 'undefined' ? null : window,
    onUnlock?: () => void,
    retryPlaybackOnGesture = false,
): () => void {
    if (!target) return () => undefined;
    const cleanup = () => {
        target.removeEventListener('pointerdown', unlock);
        target.removeEventListener('keydown', unlock);
    };
    const unlock = () => {
        if (!retryPlaybackOnGesture) cleanup();
        unlockAudioForUserGesture();
        onUnlock?.();
    };
    target.addEventListener('pointerdown', unlock, { once: !retryPlaybackOnGesture });
    target.addEventListener('keydown', unlock, { once: !retryPlaybackOnGesture });
    return cleanup;
}

export function setEnabled(enabled: boolean): void {
    if (state.enabled === enabled) return;
    if (!enabled) stopAllPlayback();
    state = {
        ...state,
        enabled,
        muted: !enabled,
        currentAmbientId: enabled ? state.currentAmbientId : null,
        currentMusicId: enabled ? state.currentMusicId : null,
        volumes: enabled
            ? { master: 1, ui: 1, ambient: 1, music: 1, stinger: 1 }
            : { ...DEFAULT_VOLUMES },
    };
}

export function isAudioEnabled(): boolean {
    return state.enabled;
}

export function isAmbientPlaybackEnabled(): boolean {
    return state.ambientPlaybackEnabled;
}

/**
 * Reversible ambience-only policy gate. Disabling pauses every cached
 * ambient-category element (including beds started through the generic cue
 * path) and clears the active bed id; UI, music, and stinger elements and
 * state are left untouched. Global enable/mute/volume are independent.
 */
export function setAmbientPlaybackEnabled(enabled: boolean): void {
    if (!enabled && state.ambientPlaybackEnabled) {
        for (const cueId of playbackElementsByCueId.keys()) {
            if (getCueConfig(cueId)?.category === 'ambient') {
                stopPlayback(cueId);
            }
        }
    }
    state = {
        ...state,
        ambientPlaybackEnabled: enabled,
        currentAmbientId: enabled ? state.currentAmbientId : null,
    };
}

export function setVolume(kind: AudioVolumeKind, value: number): void {
    state = {
        ...state,
        volumes: {
            ...state.volumes,
            [kind]: clampVolume(value),
        },
    };
    for (const [cueId, element] of playbackElementsByCueId) {
        const cue = getCueConfig(cueId);
        if (!cue || (kind !== 'master' && cue.category !== kind)) continue;
        const volume = clampVolume(state.volumes.master * state.volumes[cue.category] * cue.defaultVolume);
        try { if (element.volume !== volume) element.volume = volume; } catch { /* best effort */ }
    }
}

export async function playCue(id: string, nowMs?: number): Promise<void> {
    if (!state.enabled || state.muted || !state.userGestureUnlocked) return;
    const cue = getCueConfig(id);
    if (!cue) return;
    if (cue.category === 'ambient' && !state.ambientPlaybackEnabled) return;
    if (cue.category === 'music' && !state.musicPlaybackEnabled) return;
    const normalizedNowMs = Number.isFinite(nowMs) ? Math.max(0, Math.floor(nowMs as number)) : null;
    const previousAcceptedAtMs = state.lastCueAcceptedAtMsById[cue.id];
    if (
        normalizedNowMs !== null &&
        previousAcceptedAtMs !== undefined &&
        normalizedNowMs - previousAcceptedAtMs < cue.cooldownMs
    ) {
        return;
    }
    // Resolve via the audioAssets URL-import map (NOT the bare manifest string,
    // which does not resolve under publicDir:false). `null` => placeholder =>
    // nothing is decoded (silent no-op), preserving the muted-by-default and
    // determinism contracts.
    const resolvedAssetUrl = resolveCuePlaybackUrl(cue.id);
    state = {
        ...state,
        lastCueId: cue.id,
        lastResolvedAssetUrl: resolvedAssetUrl,
        acceptedCueCount: state.acceptedCueCount + 1,
        lastCueAcceptedAtMsById: normalizedNowMs === null
            ? state.lastCueAcceptedAtMsById
            : { ...state.lastCueAcceptedAtMsById, [cue.id]: normalizedNowMs },
    };
    if (resolvedAssetUrl) {
        playResolvedAsset(cue.id, resolvedAssetUrl, cue.category, cue.defaultVolume, cue.loop === true);
    }
}

export async function playSFX(id: string): Promise<void> {
    if (!getSfxConfig(id)) return;
    await playCue(id);
}

export async function playMusic(id: string): Promise<void> {
    if (!getMusicConfig(id)) return;
    state = { ...state, requestedMusicId: id };
    if (!state.musicPlaybackEnabled || !state.enabled || state.muted || !state.userGestureUnlocked) return;
    if (state.currentMusicId && state.currentMusicId !== id) stopPlayback(state.currentMusicId);
    await playCue(id);
    if (state.enabled && !state.muted && state.musicPlaybackEnabled && state.requestedMusicId === id) {
        state = { ...state, currentMusicId: id };
    }
}

export function stopMusic(): void {
    // A request starts its media before playMusic's await assigns the current
    // id. Stop cached music as well as committed playback so cleanup cannot
    // leave an in-flight request running without an owner.
    for (const cueId of playbackElementsByCueId.keys()) {
        if (getCueConfig(cueId)?.category === 'music') stopPlayback(cueId);
    }
    state = { ...state, currentMusicId: null, requestedMusicId: null };
}

export function setMusicPlaybackEnabled(enabled: boolean): void {
    if (!enabled) {
        for (const cueId of playbackElementsByCueId.keys()) {
            if (getCueConfig(cueId)?.category === 'music') stopPlayback(cueId);
        }
    }
    state = { ...state, musicPlaybackEnabled: enabled, currentMusicId: enabled ? state.currentMusicId : null };
    if (enabled && state.requestedMusicId) void playMusic(state.requestedMusicId);
}

export async function playAmbientBed(id: string): Promise<void> {
    state = { ...state, requestedAmbientId: id };
    if (!state.ambientPlaybackEnabled) return;
    if (!state.enabled || state.muted || !state.userGestureUnlocked) return;
    const cue = getCueConfig(id);
    if (!cue || cue.category !== 'ambient') return;
    if (state.currentAmbientId && state.currentAmbientId !== id) stopPlayback(state.currentAmbientId);
    const resolvedAssetUrl = resolveCuePlaybackUrl(cue.id);
    state = {
        ...state,
        currentAmbientId: cue.id,
        lastResolvedAssetUrl: resolvedAssetUrl,
    };
    if (resolvedAssetUrl) {
        playResolvedAsset(cue.id, resolvedAssetUrl, cue.category, cue.defaultVolume, true);
    }
}

export function stopAmbientBed(id?: string): void {
    if (id && state.currentAmbientId !== id) return;
    if (state.currentAmbientId) stopPlayback(state.currentAmbientId);
    state = { ...state, currentAmbientId: null };
}

export function setMasterVolume(value: number): void {
    setVolume('master', value);
}

export function setMusicVolume(value: number): void {
    setVolume('music', value);
}

export function setSFXVolume(value: number): void {
    setVolume('ui', value);
}

export function muteAudio(): void {
    if (state.muted) return;
    stopAllPlayback();
    state = { ...state, muted: true, currentAmbientId: null, currentMusicId: null };
}

export function unmuteAudio(): void {
    state = { ...state, muted: false };
}

export function isMuted(): boolean {
    return state.muted;
}

export function getCurrentMusicId(): string | null {
    return state.currentMusicId;
}

export function getAudioState(): AudioBusState {
    return {
        ...state,
        lastCueAcceptedAtMsById: { ...state.lastCueAcceptedAtMsById },
        volumes: { ...state.volumes },
    };
}

export function resetAudioForTests(): void {
    stopAllPlayback();
    playbackElementsByCueId.clear();
    playbackAttemptByElement.clear();
    state = {
        enabled: false,
        muted: true,
        ambientPlaybackEnabled: false,
        userGestureUnlocked: false,
        lastCueId: null,
        lastResolvedAssetUrl: null,
        currentMusicId: null,
        currentAmbientId: null,
        requestedAmbientId: null,
        requestedMusicId: null,
        musicPlaybackEnabled: false,
        acceptedCueCount: 0,
        lastCueAcceptedAtMsById: {},
        volumes: { ...DEFAULT_VOLUMES },
    };
}
