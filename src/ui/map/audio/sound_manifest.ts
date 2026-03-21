/**
 * Sound manifest — open registry for SFX and music IDs.
 *
 * Uses registerSFX/registerMusic pattern so downstream milestones
 * can add sounds without modifying this file.
 *
 * All IDs are strings, not enums — extensible by design.
 */

export interface SfxConfig {
    id: string;
    src: string;
    volume?: number;
    sprite?: Record<string, [number, number]>;
}

export interface MusicConfig {
    id: string;
    src: string;
    volume?: number;
    loop?: boolean;
}

const sfxRegistry = new Map<string, SfxConfig>();
const musicRegistry = new Map<string, MusicConfig>();

export function registerSFX(config: SfxConfig): void {
    sfxRegistry.set(config.id, config);
}

export function registerMusic(config: MusicConfig): void {
    musicRegistry.set(config.id, config);
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

// ── Built-in SFX registrations ──────────────────────────────────────────────
// Paths relative to public/audio/ — files must exist for playback.
// All registrations are no-ops at runtime if files are missing.

registerSFX({ id: 'ui_click', src: 'audio/ui_click.mp3', volume: 0.5 });
registerSFX({ id: 'ui_hover', src: 'audio/ui_hover.mp3', volume: 0.3 });
registerSFX({ id: 'ui_open_panel', src: 'audio/ui_open.mp3', volume: 0.4 });
registerSFX({ id: 'ui_close_panel', src: 'audio/ui_close.mp3', volume: 0.4 });
registerSFX({ id: 'turn_advance', src: 'audio/turn_advance.mp3', volume: 0.6 });
registerSFX({ id: 'turn_complete', src: 'audio/turn_complete.mp3', volume: 0.6 });
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

// ── Built-in music registrations ────────────────────────────────────────────
registerMusic({ id: 'menu_theme', src: 'audio/music/menu.mp3', volume: 0.4, loop: true });
registerMusic({ id: 'peace_phase', src: 'audio/music/peace.mp3', volume: 0.3, loop: true });
registerMusic({ id: 'war_phase', src: 'audio/music/war.mp3', volume: 0.3, loop: true });
registerMusic({ id: 'tension', src: 'audio/music/tension.mp3', volume: 0.35, loop: true });
registerMusic({ id: 'victory', src: 'audio/music/victory.mp3', volume: 0.5 });
registerMusic({ id: 'defeat', src: 'audio/music/defeat.mp3', volume: 0.5 });
