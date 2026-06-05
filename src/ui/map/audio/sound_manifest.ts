/**
 * Sound manifest for the tactical map audio bus.
 *
 * This kickoff pass defines stable cue metadata only. File paths are optional
 * placeholders for later packaged assets; the current audio bus never fetches
 * or decodes them.
 */

import { resolveCueAssetUrl } from './audioAssets.js';

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
    assetStatus?: AudioCueAssetStatus;
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
        assetStatus: config.assetStatus,
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

/**
 * Resolve a cue's playable asset URL via the Rollup URL-import map
 * (`audioAssets.ts`), NOT the bare-string `filePath`.
 *
 * The tactical-map build sets `publicDir:false` + `copyPublicDir:false`, so the
 * manifest's `filePath` strings (e.g. `'audio/ui_click.mp3'`) never resolve at
 * runtime. The real resolution path is the hashed, bundle-verified URL produced
 * by `audioAssets.ts` (mirroring the proven `.webp` import pattern). Returns
 * `null` when the cue is unknown or still a placeholder (no binary wired), which
 * the bus treats as a silent no-op.
 */
export function resolveCuePlaybackUrl(id: string): string | null {
    if (!cueRegistry.has(id)) return null;
    return resolveCueAssetUrl(id);
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

// Priority-1 UI feedback set — binaries PROVIDED (CC0 Kenney Interface Sounds).
// Real playback resolves via audioAssets.ts (Rollup URL-import map); the `src`
// stems are cosmetic and now point at the committed `.ogg` files. Each cue's
// CC0 provenance is logged in docs/audio/LICENSES/<cue_id>.md.
registerSFX({ id: 'ui_click', src: 'audio/ui/ui_click.ogg', volume: 0.5, assetStatus: 'provided' });
registerSFX({ id: 'ui_hover', src: 'audio/ui/ui_hover.ogg', volume: 0.3, assetStatus: 'provided' });
registerSFX({ id: 'ui_open_panel', src: 'audio/ui/ui_open.ogg', volume: 0.4, assetStatus: 'provided' });
registerSFX({ id: 'ui_close_panel', src: 'audio/ui/ui_close.ogg', volume: 0.4, assetStatus: 'provided' });
registerSFX({ id: 'turn_advance', src: 'audio/ui/turn_advance.ogg', volume: 0.6, assetStatus: 'provided' });
registerSFX({ id: 'turn_complete', src: 'audio/ui/turn_complete.ogg', volume: 0.6, assetStatus: 'provided' });
registerSFX({ id: 'turn_review_open', src: 'audio/ui/turn_review_open.ogg', volume: 0.35, assetStatus: 'provided' });
registerSFX({ id: 'battle_notification', src: 'audio/ui/battle.ogg', volume: 0.5, assetStatus: 'provided' });
registerSFX({ id: 'battle_decisive', src: 'audio/ui/battle_decisive.ogg', volume: 0.7, assetStatus: 'provided' });
registerSFX({ id: 'battle_catastrophic', src: 'audio/ui/battle_catastrophic.ogg', volume: 0.7, assetStatus: 'provided' });
registerSFX({ id: 'operation_launched', src: 'audio/ui/op_launch.ogg', volume: 0.5, assetStatus: 'provided' });
registerSFX({ id: 'operation_complete', src: 'audio/ui/op_complete.ogg', volume: 0.5, assetStatus: 'provided' });
registerSFX({ id: 'event_notification', src: 'audio/ui/event.ogg', volume: 0.5, assetStatus: 'provided' });
registerSFX({ id: 'event_critical', src: 'audio/ui/event_critical.ogg', volume: 0.7, assetStatus: 'provided' });
registerSFX({ id: 'peace_plan_offered', src: 'audio/ui/peace_plan.ogg', volume: 0.6, assetStatus: 'provided' });
registerSFX({ id: 'game_over', src: 'audio/ui/game_over.ogg', volume: 0.8, assetStatus: 'provided' });
registerSFX({ id: 'tutorial_objective_complete', src: 'audio/ui/tutorial_complete.ogg', volume: 0.5, assetStatus: 'provided' });

registerCue({ id: 'ambient_peace_spring', category: 'ambient', defaultVolume: 0.2, filePath: 'audio/ambient/peace_spring.mp3', loop: true });
registerCue({ id: 'ambient_war_winter', category: 'ambient', defaultVolume: 0.18, filePath: 'audio/ambient/war_winter.mp3', loop: true });
registerCue({ id: 'ambient_siege_distant', category: 'ambient', defaultVolume: 0.16, filePath: 'audio/ambient/siege_distant.mp3', loop: true });
// Briefed-but-unregistered ambient beds (composer brief; packet §2A). Manifest slots only — no binaries.
registerCue({ id: 'ambient_diplomatic_table', category: 'ambient', defaultVolume: 0.18, filePath: 'audio/ambient/diplomatic_table.mp3', loop: true });
registerCue({ id: 'ambient_late_war_exhaustion', category: 'ambient', defaultVolume: 0.16, filePath: 'audio/ambient/late_war_exhaustion.mp3', loop: true });
registerCue({ id: 'ambient_dayton_aftermath', category: 'ambient', defaultVolume: 0.16, filePath: 'audio/ambient/dayton_aftermath.mp3', loop: true });

registerMusic({ id: 'menu_theme', src: 'audio/music/menu.mp3', volume: 0.4, loop: true });
registerMusic({ id: 'peace_phase', src: 'audio/music/peace.mp3', volume: 0.3, loop: true });
registerMusic({ id: 'war_phase', src: 'audio/music/war.mp3', volume: 0.3, loop: true });
registerMusic({ id: 'tension', src: 'audio/music/tension.mp3', volume: 0.35, loop: true });
registerMusic({ id: 'victory', src: 'audio/music/victory.mp3', volume: 0.5 });
registerMusic({ id: 'defeat', src: 'audio/music/defeat.mp3', volume: 0.5 });

registerCue({ id: 'stinger_dayton_ceasefire', category: 'stinger', defaultVolume: 0.55, filePath: 'audio/stingers/dayton_ceasefire.mp3' });
registerCue({ id: 'stinger_campaign_verdict', category: 'stinger', defaultVolume: 0.5, filePath: 'audio/stingers/campaign_verdict.mp3' });
// Briefed-but-unregistered stingers (composer brief; packet §2A). Manifest slots only — no binaries.
// stinger_humanitarian_warning marks gravity, never sensationalizes (packet §6).
registerCue({ id: 'stinger_major_escalation', category: 'stinger', defaultVolume: 0.55, filePath: 'audio/stingers/major_escalation.mp3' });
registerCue({ id: 'stinger_humanitarian_warning', category: 'stinger', defaultVolume: 0.5, filePath: 'audio/stingers/humanitarian_warning.mp3' });
