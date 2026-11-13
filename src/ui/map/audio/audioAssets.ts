/**
 * Audio asset-resolution map (Rollup URL-import substrate).
 *
 * Mirrors `src/ui/map/data/presidentialDeskAssets.ts`: instead of the audio bus
 * trusting the bare-string `filePath` from `sound_manifest.ts` (which does NOT
 * resolve at runtime because the tactical-map build sets `publicDir:false` +
 * `copyPublicDir:false`), each cue resolves to a hashed, bundle-verified URL
 * produced by a Rollup `import url from '../assets/audio/<file>.ogg'` line.
 *
 * Slot-stable, placeholder-first contract (Soundscape packet §5):
 * - Cue IDs are the stable public contract; nothing here is referenced by call
 *   sites — the bus looks cues up by ID.
 * - The priority-1 UI set uses first-party `.ogg` binaries; the
 *   three required ambient beds have first-party `.ogg` binaries. Optional
 *   ambience, other music, and stinger slots remain placeholders.
 * - When another binary lands, add ONE static import + ONE map entry, and flip
 *   that cue's `assetStatus` to `'provided'` in `sound_manifest.ts`. No
 *   call-site or schema change.
 *
 * Determinism: pure module. No network, no `Date.now`, no `Math.random`. Static
 * imports are resolved by the bundler at build time.
 *
 * On-disk layout when binaries arrive (compressed `.ogg` only — see packet §5C):
 *   src/ui/map/assets/audio/ui/        ui_click.ogg, ...           (18 UI cues)
 *   src/ui/map/assets/audio/ambient/   peace_spring.ogg, ...       (3-6 beds)
 *   src/ui/map/assets/audio/music/     menu.ogg, ...               (6 states)
 *   src/ui/map/assets/audio/stingers/  dayton_ceasefire.ogg, ...   (2-5 stingers)
 */

// --- Template for landing a real asset (uncomment + adjust when a binary exists) ---
// import uiClickUrl from '../assets/audio/designed/ui_click.ogg';
//
// then add to AUDIO_ASSET_URLS below:
//   ui_click: uiClickUrl,
// and set that cue's assetStatus to 'provided' in sound_manifest.ts.

// --- Priority-1 UI feedback set (17 cues) ----------------------------------
// First-party designed effects. Retained CC0 sources and reproduction details
// are recorded in docs/audio/LICENSES/<cue_id>.md.
import uiClickUrl from '../assets/audio/designed/ui_click.ogg';
import uiHoverUrl from '../assets/audio/designed/ui_hover.ogg';
import uiOpenUrl from '../assets/audio/designed/ui_open_panel.ogg';
import uiCloseUrl from '../assets/audio/designed/ui_close_panel.ogg';
import turnAdvanceUrl from '../assets/audio/designed/turn_advance.ogg';
import turnCompleteUrl from '../assets/audio/designed/turn_complete.ogg';
import turnReviewOpenUrl from '../assets/audio/designed/turn_review_open.ogg';
import battleUrl from '../assets/audio/designed/battle_notification.ogg';
import battleDecisiveUrl from '../assets/audio/designed/battle_decisive.ogg';
import battleCatastrophicUrl from '../assets/audio/designed/battle_catastrophic.ogg';
import opLaunchUrl from '../assets/audio/designed/operation_launched.ogg';
import opCompleteUrl from '../assets/audio/designed/operation_complete.ogg';
import eventUrl from '../assets/audio/designed/event_notification.ogg';
import eventCriticalUrl from '../assets/audio/designed/event_critical.ogg';
import peacePlanUrl from '../assets/audio/designed/peace_plan_offered.ogg';
import gameOverUrl from '../assets/audio/designed/game_over.ogg';
import tutorialCompleteUrl from '../assets/audio/designed/tutorial_objective_complete.ogg';

// Original sampled compositions: 35-second opening; the menu loops Lines on
// Paper (owner 2026-11-13) so it no longer repeats the opening's melody.
import menuThemeUrl from '../assets/audio/music/lines_on_paper.ogg';
import openingTitlesUrl from '../assets/audio/music/what_remains_of_home_opening.ogg';

// Campaign rotation, requested lazily by the bus: seven approved Revised v2
// originals plus the full What Remains of Home theme (formerly the menu loop).
import campaign0Url from '../assets/audio/music/a_country_before_dawn.ogg';
import campaign1Url from '../assets/audio/music/what_remains_of_home.ogg';
import campaign2Url from '../assets/audio/music/the_long_winter.ogg';
import campaign3Url from '../assets/audio/music/no_answer_on_the_radio.ogg';
import campaign4Url from '../assets/audio/music/the_life_we_remember.ogg';
import campaign5Url from '../assets/audio/music/a_table_for_strangers.ogg';
import campaign6Url from '../assets/audio/music/what_the_maps_cannot_show.ogg';
import campaign7Url from '../assets/audio/music/after_the_guns.ogg';

// --- Required restrained ambient beds (first-party deterministic recipes) ---
import ambientWarroomUrl from '../assets/audio/ambient/ambient_warroom.ogg';
import ambientFieldUrl from '../assets/audio/ambient/ambient_field.ogg';
import ambientArchiveUrl from '../assets/audio/ambient/ambient_archive.ogg';

/**
 * Cue ID -> hashed, bundle-resolved asset URL.
 *
 * Keys MUST match cue IDs registered in `sound_manifest.ts`. Optional ambience,
 * music, and stinger slots stay empty (placeholder-first) until binaries land.
 */
export const AUDIO_ASSET_URLS: Readonly<Record<string, string>> = Object.freeze({
    // Priority-1 UI feedback set (CC0 — Kenney Interface Sounds; see header).
    ui_click: uiClickUrl,
    ui_hover: uiHoverUrl,
    ui_open_panel: uiOpenUrl,
    ui_close_panel: uiCloseUrl,
    turn_advance: turnAdvanceUrl,
    turn_complete: turnCompleteUrl,
    turn_review_open: turnReviewOpenUrl,
    battle_notification: battleUrl,
    battle_decisive: battleDecisiveUrl,
    battle_catastrophic: battleCatastrophicUrl,
    operation_launched: opLaunchUrl,
    operation_complete: opCompleteUrl,
    event_notification: eventUrl,
    event_critical: eventCriticalUrl,
    peace_plan_offered: peacePlanUrl,
    game_over: gameOverUrl,
    tutorial_objective_complete: tutorialCompleteUrl,
    menu_theme: menuThemeUrl,
    opening_titles: openingTitlesUrl,
    campaign_a_country_before_dawn: campaign0Url,
    campaign_what_remains_of_home: campaign1Url,
    campaign_the_long_winter: campaign2Url,
    campaign_no_answer_on_the_radio: campaign3Url,
    campaign_the_life_we_remember: campaign4Url,
    campaign_a_table_for_strangers: campaign5Url,
    campaign_what_the_maps_cannot_show: campaign6Url,
    campaign_after_the_guns: campaign7Url,
    ambient_warroom: ambientWarroomUrl,
    ambient_field: ambientFieldUrl,
    ambient_archive: ambientArchiveUrl,
});

/**
 * Resolve a cue's playable asset URL.
 *
 * Returns the hashed bundler URL when a binary has been wired for the cue, or
 * `null` when the cue is still a placeholder (the bus then performs a silent
 * no-op accept, preserving determinism and the muted-by-default contract).
 */
export function resolveCueAssetUrl(cueId: string): string | null {
    return AUDIO_ASSET_URLS[cueId] ?? null;
}

/**
 * True when a cue has a real, bundle-resolved binary behind it. Lets the bus /
 * manifest distinguish "wired" from "placeholder" without trusting bare-string
 * manifest paths that do not resolve under this build config.
 */
export function hasResolvedCueAsset(cueId: string): boolean {
    return Object.prototype.hasOwnProperty.call(AUDIO_ASSET_URLS, cueId);
}
