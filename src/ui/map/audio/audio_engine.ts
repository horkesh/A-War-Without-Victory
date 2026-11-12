/**
 * Renderer-only, best-effort audio bus using bundled media URLs.
 * Playback requires enabled sound and a user gesture. Music additionally
 * requires explicit opt-in; the separate ambience policy defaults off.
 * Playback never writes simulation state or blocks a player action.
 */

import { getCueConfig, getMusicConfig, getSfxConfig, resolveCuePlaybackUrl, type AudioCueCategory } from './sound_manifest.js';
import { CAMPAIGN_MUSIC_IDS, createMusicShuffleBag } from './music_shuffle_bag.js';

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
const musicFailureByElement = new Map<HTMLAudioElement, () => void>();
// Exactly one owner holds continuation listeners, including paused music.
let openingContinuation: (() => void) | null = null;
let musicSurface: 'mainMenu' | 'campaign' | null = null;
let nextCampaignTrack = createMusicShuffleBag(CAMPAIGN_MUSIC_IDS);
let campaignTrackId: string | null = null;
let consecutiveCampaignFailures = 0;
let campaignExhausted = false;
// A new campaign started from the menu plays the opening on entering play.
let campaignOpeningPending = false;

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
): boolean {
    if (playbackAttemptByElement.get(element) !== attempt) {
        // A late play promise may settle after pause. Do not let an ownerless
        // media element resume; a newer attempt on this element keeps ownership.
        if (status === 'success' && !playbackAttemptByElement.has(element)) {
            try { element.pause(); } catch { /* best effort */ }
        }
        return false;
    }
    attempt.status = status;
    return true;
}

function playResolvedAsset(cueId: string, resolvedAssetUrl: string, category: AudioCueCategory, defaultVolume: number, loop = false, resume = false): void {
    try {
        const element = getPlaybackElement(cueId, resolvedAssetUrl);
        if (!element) return;
        const loopChanged = element.loop !== loop;
        if (loopChanged) element.loop = loop;
        const volume = clampVolume(state.volumes.master * state.volumes[category] * defaultVolume);
        if (element.volume !== volume) element.volume = volume;
        if (resume && playbackAttemptByElement.get(element)?.status === 'pending') return;
        if (resume && playbackAttemptByElement.get(element)?.status === 'success'
            && element.paused === false && !element.ended && !element.error) return;
        if (!loopChanged && loop && isHealthyRunningLoop(element)) return;
        const attempt: PlaybackAttempt = { status: 'pending' };
        playbackAttemptByElement.set(element, attempt);
        try {
            if ((!loop && !resume) || element.ended) element.currentTime = 0;
            const playResult: Promise<void> | undefined = element.play();
            if (playResult && typeof playResult.then === 'function') {
                void playResult.then(
                    () => settlePlaybackAttempt(element, attempt, 'success'),
                    (reason: unknown) => {
                        if (settlePlaybackAttempt(element, attempt, 'failure')
                            && reason instanceof Error && reason.name === 'NotSupportedError') {
                            musicFailureByElement.get(element)?.();
                        }
                    },
                );
            }
        } catch (reason) {
            if (settlePlaybackAttempt(element, attempt, 'failure')
                && reason instanceof Error && reason.name === 'NotSupportedError') {
                musicFailureByElement.get(element)?.();
            }
            // Autoplay/decode failures cannot interrupt the player action.
        }
    } catch {
        // Media construction and property setters can fail as well as play().
    }
}

function stopPlayback(cueId: string): void {
    const element = playbackElementsByCueId.get(cueId);
    if (!element) return;
    playbackAttemptByElement.delete(element);
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

/** Request the short opening identity once for the owning controller lifetime. */
export function playOpeningMusic(): void {
    void playMusic('opening_titles');
}

/** Select presentation music without changing simulation or saved campaign state. */
export function setMusicSurface(surface: 'mainMenu' | 'campaign', allowOpening = false): void {
    if (musicSurface === surface) return;
    const previousSurface = musicSurface;
    musicSurface = surface;
    if (surface === 'campaign') {
        if (state.requestedMusicId === 'opening_titles' && isOpeningStarted()) return;
        if (campaignOpeningPending) {
            campaignOpeningPending = false;
            playOpeningMusic();
            return;
        }
        requestCampaignMusic();
    } else if (previousSurface === null && allowOpening) {
        playOpeningMusic();
    } else {
        void playMusic('menu_theme');
    }
}

function isOpeningStarted(): boolean {
    const opening = playbackElementsByCueId.get('opening_titles');
    return Boolean(opening && !opening.error && !opening.ended
        && (playbackAttemptByElement.get(opening)?.status === 'success' || opening.currentTime > 0));
}

function isMusicAudible(): boolean {
    return state.musicPlaybackEnabled && state.enabled && !state.muted && state.userGestureUnlocked;
}

/**
 * A new campaign is a new opening session (owner 2026-11-12): draw a fresh
 * bag and play the opening first instead of resuming the previous campaign's
 * track. An opening already audible finishes into the fresh bag; an unheard
 * opening is skipped, as on game entry. Loading a save does not call this and
 * keeps resume-in-place. Presentation only: nothing here is persisted.
 */
export function beginNewCampaignMusic(): void {
    const openingAudible = state.requestedMusicId === 'opening_titles' && isOpeningStarted();
    // Keep the menu theme until the screen leaves the menu; release anything else.
    if (!openingAudible && state.requestedMusicId !== 'menu_theme') stopMusicPlayback();
    const released = openingAudible ? CAMPAIGN_MUSIC_IDS : [...CAMPAIGN_MUSIC_IDS, 'opening_titles'];
    for (const cueId of released) {
        if (!playbackElementsByCueId.has(cueId)) continue;
        stopPlayback(cueId);
        playbackElementsByCueId.delete(cueId);
    }
    nextCampaignTrack = createMusicShuffleBag(CAMPAIGN_MUSIC_IDS);
    campaignTrackId = null;
    consecutiveCampaignFailures = 0;
    campaignExhausted = false;
    campaignOpeningPending = false;
    if (openingAudible) return;
    if (musicSurface !== 'campaign') {
        campaignOpeningPending = isMusicAudible();
        return;
    }
    if (isMusicAudible()) playOpeningMusic();
    else requestCampaignMusic();
}

function requestCampaignMusic(): void {
    if (campaignExhausted) return;
    campaignTrackId ??= nextCampaignTrack();
    void playMusic(campaignTrackId);
}

/** Compatibility entry point: entering play changes the opening successor. */
export function leaveOpeningMusicWindow(): void {
    setMusicSurface('campaign');
}

function continueMusicAfterOpening(): void {
    if (musicSurface === 'campaign') requestCampaignMusic();
    else void playMusic('menu_theme');
}

function advanceCampaignMusic(failed: boolean): void {
    consecutiveCampaignFailures = failed ? consecutiveCampaignFailures + 1 : 0;
    campaignTrackId = null;
    if (consecutiveCampaignFailures >= CAMPAIGN_MUSIC_IDS.length) {
        // Eight consecutive media failures: remain silent until a new
        // controller lifetime instead of retrying forever on gestures.
        campaignExhausted = true;
        stopMusicPlayback();
        return;
    }
    requestCampaignMusic();
}

/** Retry the existing owner request after a trusted gesture, without replacing it. */
export function retryRequestedMusic(): void {
    if (state.requestedMusicId) void playMusic(state.requestedMusicId);
}

export async function playMusic(id: string): Promise<void> {
    const cue = getCueConfig(id);
    if (!getMusicConfig(id) || !cue) return;
    if (state.requestedMusicId !== id) {
        openingContinuation?.();
        openingContinuation = null;
        // The previous request may still be pending and lack a current ID.
        if (state.requestedMusicId) stopPlayback(state.requestedMusicId);
    }
    state = { ...state, requestedMusicId: id };
    if (!state.musicPlaybackEnabled || !state.enabled || state.muted || !state.userGestureUnlocked) return;
    const resolvedAssetUrl = resolveCuePlaybackUrl(id);
    if (!resolvedAssetUrl) return;
    let element: HTMLAudioElement | null;
    try { element = getPlaybackElement(id, resolvedAssetUrl); } catch { return; }
    if (!element) return;
    const campaign = CAMPAIGN_MUSIC_IDS.includes(id);
    if ((id === 'opening_titles' || campaign) && !openingContinuation) {
        let active = true;
        const finish = () => {
            if (!element.ended || !active || state.requestedMusicId !== id || !state.enabled || state.muted || !state.musicPlaybackEnabled) return;
            if (campaign) advanceCampaignMusic(false);
            else continueMusicAfterOpening();
        };
        const fail = () => {
            // Unplayable media is skipped even while preferences pause playback.
            // The successor remains silent under the same playback gates.
            if (!active || state.requestedMusicId !== id) return;
            if (campaign) advanceCampaignMusic(true);
            else continueMusicAfterOpening();
        };
        // Queued terminal notifications can outlive the former surface owner.
        // Only current terminal media state may advance healthy resumed media.
        const mediaError = () => { if (element.error) fail(); };
        musicFailureByElement.set(element, fail);
        element.addEventListener?.('ended', finish);
        element.addEventListener?.('error', mediaError);
        openingContinuation = () => {
            active = false;
            musicFailureByElement.delete(element);
            element.removeEventListener?.('ended', finish);
            element.removeEventListener?.('error', mediaError);
        };
    }
    state = { ...state, currentMusicId: id, lastResolvedAssetUrl: resolvedAssetUrl };
    playResolvedAsset(id, resolvedAssetUrl, cue.category, cue.defaultVolume, cue.loop === true, true);
}

function stopMusicPlayback(): void {
    openingContinuation?.();
    openingContinuation = null;
    // Stop cached music as well as committed playback so cleanup cannot
    // leave an in-flight request running without an owner.
    for (const cueId of playbackElementsByCueId.keys()) {
        if (getCueConfig(cueId)?.category === 'music') stopPlayback(cueId);
    }
    state = { ...state, currentMusicId: null, requestedMusicId: null };
}

export function stopMusic(): void {
    stopMusicPlayback();
    musicSurface = null;
    // A remounted owner receives fresh media so queued old events cannot reach
    // its listeners. Mute and room changes retain their current media/position.
    for (const cueId of playbackElementsByCueId.keys()) {
        if (getCueConfig(cueId)?.category === 'music') playbackElementsByCueId.delete(cueId);
    }
    // An exhausted set is retried only by a new controller owner.
    campaignExhausted = false;
    consecutiveCampaignFailures = 0;
    campaignOpeningPending = false;
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
    stopMusic();
    nextCampaignTrack = createMusicShuffleBag(CAMPAIGN_MUSIC_IDS);
    campaignTrackId = null;
    campaignOpeningPending = false;
    stopAllPlayback();
    playbackElementsByCueId.clear();
    playbackAttemptByElement.clear();
    musicFailureByElement.clear();
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
