/**
 * Sound manifest for the tactical map audio bus.
 *
 * This kickoff pass defines stable cue metadata only. File paths are optional
 * placeholders for later packaged assets; the current audio bus never fetches
 * or decodes them.
 */

export type AudioCueCategory = 'ui' | 'ambient' | 'music' | 'stinger';
export type AudioCueAssetStatus = 'missing_placeholder' | 'provided';
export type AudioCueReducedMotionPolicy = 'play' | 'suppress_motion_only';

export interface AudioCueConfig {
    id: string;
    category: AudioCueCategory;
    defaultVolume: number;
    cooldownMs: number;
    assetStatus: AudioCueAssetStatus;
    reducedMotionPolicy: AudioCueReducedMotionPolicy;
    filePath?: string;
    loop?: boolean;
}

type AudioCueRegistration = Omit<AudioCueConfig, 'cooldownMs' | 'assetStatus' | 'reducedMotionPolicy'> &
    Partial<Pick<AudioCueConfig, 'cooldownMs' | 'assetStatus' | 'reducedMotionPolicy'>>;

export interface SfxConfig {
    id: string;
    src?: string;
    volume?: number;
    sprite?: Record<string, [number, number]>;
}

export interface MusicConfig {
    id: string;
    src?: string;
    volume?: number;
    loop?: boolean;
}

const cueRegistry = new Map<string, AudioCueConfig>();
const sfxRegistry = new Map<string, SfxConfig>();
const musicRegistry = new Map<string, MusicConfig>();

const DEFAULT_COOLDOWN_MS_BY_CATEGORY: Record<AudioCueCategory, number> = {
    ui: 75,
    ambient: 5000,
    music: 5000,
    stinger: 1500,
};

function clampVolume(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
}

export function registerCue(config: AudioCueRegistration): void {
    cueRegistry.set(config.id, {
        ...config,
        defaultVolume: clampVolume(config.defaultVolume),
        cooldownMs: Math.max(0, Math.floor(config.cooldownMs ?? DEFAULT_COOLDOWN_MS_BY_CATEGORY[config.category])),
        assetStatus: config.assetStatus ?? 'missing_placeholder',
        reducedMotionPolicy: config.reducedMotionPolicy ?? 'play',
    });
}

export function registerSFX(config: SfxConfig): void {
    sfxRegistry.set(config.id, config);
    registerCue({
        id: config.id,
        category: 'ui',
        defaultVolume: config.volume ?? 1,
        filePath: config.src,
    });
}

export function registerMusic(config: MusicConfig): void {
    musicRegistry.set(config.id, config);
    registerCue({
        id: config.id,
        category: 'music',
        defaultVolume: config.volume ?? 1,
        filePath: config.src,
        loop: config.loop,
    });
}

export function getCueConfig(id: string): AudioCueConfig | undefined {
    return cueRegistry.get(id);
}

export function getAllAudioCues(): AudioCueConfig[] {
    return [...cueRegistry.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function getAllCueIds(): string[] {
    return getAllAudioCues().map((cue) => cue.id);
}

export function getSfxConfig(id: string): SfxConfig | undefined {
    return sfxRegistry.get(id);
}

export function getMusicConfig(id: string): MusicConfig | undefined {
    return musicRegistry.get(id);
}

export function getAllSfxIds(): string[] {
    return [...sfxRegistry.keys()].sort();
}

export function getAllMusicIds(): string[] {
    return [...musicRegistry.keys()].sort();
}

registerSFX({ id: 'ui_click', src: 'audio/ui_click.mp3', volume: 0.5 });
registerSFX({ id: 'ui_hover', src: 'audio/ui_hover.mp3', volume: 0.3 });
registerSFX({ id: 'ui_open_panel', src: 'audio/ui_open.mp3', volume: 0.4 });
registerSFX({ id: 'ui_close_panel', src: 'audio/ui_close.mp3', volume: 0.4 });
registerSFX({ id: 'turn_advance', src: 'audio/turn_advance.mp3', volume: 0.6 });
registerSFX({ id: 'turn_complete', src: 'audio/turn_complete.mp3', volume: 0.6 });
registerSFX({ id: 'turn_review_open', src: 'audio/turn_review_open.mp3', volume: 0.35 });
registerSFX({ id: 'battle_notification', src: 'audio/battle.mp3', volume: 0.5 });
registerSFX({ id: 'battle_decisive', src: 'audio/battle_decisive.mp3', volume: 0.7 });
registerSFX({ id: 'battle_catastrophic', src: 'audio/battle_catastrophic.mp3', volume: 0.7 });
registerSFX({ id: 'operation_launched', src: 'audio/op_launch.mp3', volume: 0.5 });
registerSFX({ id: 'operation_complete', src: 'audio/op_complete.mp3', volume: 0.5 });
registerSFX({ id: 'event_notification', src: 'audio/event.mp3', volume: 0.5 });
registerSFX({ id: 'event_critical', src: 'audio/event_critical.mp3', volume: 0.7 });
registerSFX({ id: 'peace_plan_offered', src: 'audio/peace_plan.mp3', volume: 0.6 });
registerSFX({ id: 'game_over', src: 'audio/game_over.mp3', volume: 0.8 });
registerSFX({ id: 'tutorial_objective_complete', src: 'audio/tutorial_complete.mp3', volume: 0.5 });

registerCue({ id: 'ambient_peace_spring', category: 'ambient', defaultVolume: 0.2, filePath: 'audio/ambient/peace_spring.mp3', loop: true });
registerCue({ id: 'ambient_war_winter', category: 'ambient', defaultVolume: 0.18, filePath: 'audio/ambient/war_winter.mp3', loop: true });
registerCue({ id: 'ambient_siege_distant', category: 'ambient', defaultVolume: 0.16, filePath: 'audio/ambient/siege_distant.mp3', loop: true });

registerMusic({ id: 'menu_theme', src: 'audio/music/menu.mp3', volume: 0.4, loop: true });
registerMusic({ id: 'peace_phase', src: 'audio/music/peace.mp3', volume: 0.3, loop: true });
registerMusic({ id: 'war_phase', src: 'audio/music/war.mp3', volume: 0.3, loop: true });
registerMusic({ id: 'tension', src: 'audio/music/tension.mp3', volume: 0.35, loop: true });
registerMusic({ id: 'victory', src: 'audio/music/victory.mp3', volume: 0.5 });
registerMusic({ id: 'defeat', src: 'audio/music/defeat.mp3', volume: 0.5 });

registerCue({ id: 'stinger_dayton_ceasefire', category: 'stinger', defaultVolume: 0.55, filePath: 'audio/stingers/dayton_ceasefire.mp3' });
registerCue({ id: 'stinger_campaign_verdict', category: 'stinger', defaultVolume: 0.5, filePath: 'audio/stingers/campaign_verdict.mp3' });
