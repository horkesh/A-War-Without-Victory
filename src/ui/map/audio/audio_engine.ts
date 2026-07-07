/**
 * Deterministic audio bus stub.
 *
 * Audio is disabled by default and this module performs no network, Web Audio,
 * timestamp, or random work. It exposes the bus shape that later asset-backed
 * audio can implement without changing call sites.
 *
 * Howler.js is intentionally not added for this kickoff pass: there are no
 * real assets to load yet, and adding a runtime dependency would increase
 * packaging scope before playback requirements are proven.
 */

import { getCueConfig, getMusicConfig, getSfxConfig, resolveCuePlaybackUrl, type AudioCueCategory } from './sound_manifest.js';

export type AudioVolumeKind = 'master' | AudioCueCategory;

interface AudioBusState {
    enabled: boolean;
    muted: boolean;
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

const playbackElementsByCueId = new Map<string, HTMLAudioElement>();

let state: AudioBusState = {
    enabled: false,
    muted: true,
    userGestureUnlocked: false,
    lastCueId: null,
    lastResolvedAssetUrl: null,
    currentMusicId: null,
    currentAmbientId: null,
    requestedAmbientId: null,
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
    if (existing?.src === resolvedAssetUrl) return existing;
    const element = new Audio(resolvedAssetUrl);
    element.preload = 'auto';
    playbackElementsByCueId.set(cueId, element);
    return element;
}

function playResolvedAsset(cueId: string, resolvedAssetUrl: string, category: AudioCueCategory, defaultVolume: number, loop = false): void {
    const element = getPlaybackElement(cueId, resolvedAssetUrl);
    if (!element) return;
    element.loop = loop;
    element.volume = clampVolume(state.volumes.master * state.volumes[category] * defaultVolume);
    try {
        if (!loop) element.currentTime = 0;
        void element.play()?.catch(() => undefined);
    } catch {
        // Playback is best-effort. Autoplay or decode failures must not surface
        // as console noise or block UI flow.
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
): () => void {
    if (!target) return () => undefined;
    const unlock = () => {
        unlockAudioForUserGesture();
        onUnlock?.();
    };
    target.addEventListener('pointerdown', unlock, { once: true });
    target.addEventListener('keydown', unlock, { once: true });
    return () => {
        target.removeEventListener('pointerdown', unlock);
        target.removeEventListener('keydown', unlock);
    };
}

export function setEnabled(enabled: boolean): void {
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

export function setVolume(kind: AudioVolumeKind, value: number): void {
    state = {
        ...state,
        volumes: {
            ...state.volumes,
            [kind]: clampVolume(value),
        },
    };
}

export async function playCue(id: string, nowMs?: number): Promise<void> {
    if (!state.enabled || state.muted || !state.userGestureUnlocked) return;
    const cue = getCueConfig(id);
    if (!cue) return;
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
    if (!state.enabled || state.muted || !state.userGestureUnlocked) return;
    if (!getMusicConfig(id)) return;
    await playCue(id);
    state = { ...state, currentMusicId: id };
}

export function stopMusic(): void {
    state = { ...state, currentMusicId: null };
}

export async function playAmbientBed(id: string): Promise<void> {
    state = { ...state, requestedAmbientId: id };
    if (!state.enabled || state.muted || !state.userGestureUnlocked) return;
    const cue = getCueConfig(id);
    if (!cue || cue.category !== 'ambient') return;
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
    state = {
        enabled: false,
        muted: true,
        userGestureUnlocked: false,
        lastCueId: null,
        lastResolvedAssetUrl: null,
        currentMusicId: null,
        currentAmbientId: null,
        requestedAmbientId: null,
        acceptedCueCount: 0,
        lastCueAcceptedAtMsById: {},
        volumes: { ...DEFAULT_VOLUMES },
    };
}
