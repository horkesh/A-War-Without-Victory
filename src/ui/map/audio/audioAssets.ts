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
 * - The priority-1 UI feedback set has committed CC0 `.ogg` binaries and static
 *   imports below. Ambient, music, and stinger slots remain placeholders until
 *   their separate approval/content lane lands binaries.
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
// import uiClickUrl from '../assets/audio/ui/ui_click.ogg';
//
// then add to AUDIO_ASSET_URLS below:
//   ui_click: uiClickUrl,
// and set that cue's assetStatus to 'provided' in sound_manifest.ts.

// --- Priority-1 UI feedback set (17 cues) ----------------------------------
// Source: Kenney "Interface Sounds" pack (v1.0), licensed CC0 / public domain
// (https://creativecommons.org/publicdomain/zero/1.0/). Commercial redistribution
// inside a sold desktop binary is permitted; attribution not required. Per-cue
// provenance is recorded in docs/audio/LICENSES/<cue_id>.md. Selections favor the
// dry/quiet/tactile variants the composer brief requires (no bright game beeps).
import uiClickUrl from '../assets/audio/ui/ui_click.ogg';
import uiHoverUrl from '../assets/audio/ui/ui_hover.ogg';
import uiOpenUrl from '../assets/audio/ui/ui_open.ogg';
import uiCloseUrl from '../assets/audio/ui/ui_close.ogg';
import turnAdvanceUrl from '../assets/audio/ui/turn_advance.ogg';
import turnCompleteUrl from '../assets/audio/ui/turn_complete.ogg';
import turnReviewOpenUrl from '../assets/audio/ui/turn_review_open.ogg';
import battleUrl from '../assets/audio/ui/battle.ogg';
import battleDecisiveUrl from '../assets/audio/ui/battle_decisive.ogg';
import battleCatastrophicUrl from '../assets/audio/ui/battle_catastrophic.ogg';
import opLaunchUrl from '../assets/audio/ui/op_launch.ogg';
import opCompleteUrl from '../assets/audio/ui/op_complete.ogg';
import eventUrl from '../assets/audio/ui/event.ogg';
import eventCriticalUrl from '../assets/audio/ui/event_critical.ogg';
import peacePlanUrl from '../assets/audio/ui/peace_plan.ogg';
import gameOverUrl from '../assets/audio/ui/game_over.ogg';
import tutorialCompleteUrl from '../assets/audio/ui/tutorial_complete.ogg';

/**
 * Cue ID -> hashed, bundle-resolved asset URL.
 *
 * Keys MUST match cue IDs registered in `sound_manifest.ts`. Ambient, music, and
 * stinger slots stay empty (placeholder-first) until those binaries land.
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
