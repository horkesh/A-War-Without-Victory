/**
 * Audio engine — manages SFX playback and music state machine.
 *
 * Uses Web Audio API directly (no Howler dependency required).
 * All operations are no-ops if audio files are missing or audio context
 * is unavailable. Gracefully degrades in all environments.
 *
 * DECISION FLAG: Howler.js installation deferred to avoid npm install
 * in inner workspace (napkin item 7). Web Audio API used instead.
 * If Howler is later installed, swap the playback implementation
 * without changing the public API.
 */

import { getSfxConfig, getMusicConfig } from './sound_manifest.js';

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let currentMusicSource: AudioBufferSourceNode | null = null;
let currentMusicId: string | null = null;

let masterVolume = 0.8;
let sfxVolume = 0.7;
let musicVolume = 0.5;
let muted = false;

const audioBufferCache = new Map<string, AudioBuffer>();

function getContext(): AudioContext | null {
    if (!audioContext && typeof AudioContext !== 'undefined') {
        try {
            audioContext = new AudioContext();
            masterGain = audioContext.createGain();
            masterGain.connect(audioContext.destination);
            sfxGain = audioContext.createGain();
            sfxGain.connect(masterGain);
            musicGain = audioContext.createGain();
            musicGain.connect(masterGain);
            applyVolumes();
        } catch {
            return null;
        }
    }
    return audioContext;
}

function applyVolumes(): void {
    const effective = muted ? 0 : masterVolume;
    if (masterGain) masterGain.gain.value = effective;
    if (sfxGain) sfxGain.gain.value = sfxVolume;
    if (musicGain) musicGain.gain.value = musicVolume;
}

async function loadBuffer(src: string): Promise<AudioBuffer | null> {
    const cached = audioBufferCache.get(src);
    if (cached) return cached;

    const ctx = getContext();
    if (!ctx) return null;

    try {
        const response = await fetch(src);
        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        const buffer = await ctx.decodeAudioData(arrayBuffer);
        audioBufferCache.set(src, buffer);
        return buffer;
    } catch {
        return null;
    }
}

/** Initialize audio context (call on first user interaction). */
export function initAudio(): void {
    getContext();
}

/** Play a one-shot sound effect. No-op if missing. */
export async function playSFX(id: string): Promise<void> {
    const config = getSfxConfig(id);
    if (!config) return;

    const ctx = getContext();
    if (!ctx || !sfxGain) return;

    const buffer = await loadBuffer(config.src);
    if (!buffer) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.value = config.volume ?? 1.0;
    source.connect(gain);
    gain.connect(sfxGain);
    source.start(0);
}

/** Play background music with optional crossfade. */
export async function playMusic(id: string, fadeDuration = 1.0): Promise<void> {
    if (currentMusicId === id) return;

    const config = getMusicConfig(id);
    if (!config) return;

    const ctx = getContext();
    if (!ctx || !musicGain) return;

    // Fade out current
    if (currentMusicSource) {
        try { currentMusicSource.stop(ctx.currentTime + fadeDuration); } catch { /* already stopped */ }
        currentMusicSource = null;
    }

    const buffer = await loadBuffer(config.src);
    if (!buffer) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = config.loop ?? false;

    const gain = ctx.createGain();
    gain.gain.value = config.volume ?? 0.5;
    source.connect(gain);
    gain.connect(musicGain);
    source.start(0);

    currentMusicSource = source;
    currentMusicId = id;
}

/** Stop current music with fade. */
export function stopMusic(fadeDuration = 1.0): void {
    const ctx = getContext();
    if (!ctx || !currentMusicSource) return;
    try { currentMusicSource.stop(ctx.currentTime + fadeDuration); } catch { /* already stopped */ }
    currentMusicSource = null;
    currentMusicId = null;
}

export function setMasterVolume(v: number): void { masterVolume = Math.max(0, Math.min(1, v)); applyVolumes(); }
export function setMusicVolume(v: number): void { musicVolume = Math.max(0, Math.min(1, v)); applyVolumes(); }
export function setSFXVolume(v: number): void { sfxVolume = Math.max(0, Math.min(1, v)); applyVolumes(); }
export function muteAudio(): void { muted = true; applyVolumes(); }
export function unmuteAudio(): void { muted = false; applyVolumes(); }
export function isMuted(): boolean { return muted; }
export function getCurrentMusicId(): string | null { return currentMusicId; }
