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

import { getCueConfig, getMusicConfig, getSfxConfig, type AudioCueCategory } from './sound_manifest.js';

export type AudioVolumeKind = 'master' | AudioCueCategory;

interface AudioBusState {
    enabled: boolean;
    muted: boolean;
    lastCueId: string | null;
    currentMusicId: string | null;
    volumes: Record<AudioVolumeKind, number>;
}

const DEFAULT_VOLUMES: Record<AudioVolumeKind, number> = {
    master: 0,
    ui: 0,
    ambient: 0,
    music: 0,
    stinger: 0,
};

let state: AudioBusState = {
    enabled: false,
    muted: true,
    lastCueId: null,
    currentMusicId: null,
    volumes: { ...DEFAULT_VOLUMES },
};

function clampVolume(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
}

export function initAudio(): void {
    // Stub: intentionally no browser audio initialization.
}

export function setEnabled(enabled: boolean): void {
    state = {
        ...state,
        enabled,
        muted: !enabled,
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

export async function playCue(id: string): Promise<void> {
    if (!state.enabled || state.muted) return;
    const cue = getCueConfig(id);
    if (!cue) return;
    state = { ...state, lastCueId: cue.id };
}

export async function playSFX(id: string): Promise<void> {
    if (!getSfxConfig(id)) return;
    await playCue(id);
}

export async function playMusic(id: string): Promise<void> {
    if (!state.enabled || state.muted) return;
    if (!getMusicConfig(id)) return;
    await playCue(id);
    state = { ...state, currentMusicId: id };
}

export function stopMusic(): void {
    state = { ...state, currentMusicId: null };
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
    state = { ...state, muted: true };
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
        volumes: { ...state.volumes },
    };
}

export function resetAudioForTests(): void {
    state = {
        enabled: false,
        muted: true,
        lastCueId: null,
        currentMusicId: null,
        volumes: { ...DEFAULT_VOLUMES },
    };
}
