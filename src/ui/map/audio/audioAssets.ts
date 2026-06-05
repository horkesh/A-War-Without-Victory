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
 * - NO binary audio exists in the repo yet (0 of 32 slots). Therefore this map
 *   is intentionally EMPTY: there are no real files to `import`, and Rollup
 *   would fail the build if we imported a non-existent path. Each cue stays a
 *   silent no-op via its manifest `assetStatus: 'missing_placeholder'`.
 * - When a binary lands, add ONE static import + ONE map entry (see the
 *   commented template below), and flip that cue's `assetStatus` to
 *   `'provided'` in `sound_manifest.ts`. No call-site or schema change.
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

/**
 * Cue ID -> hashed, bundle-resolved asset URL.
 *
 * Empty until the first binary lands (placeholder-first; see header). Keys MUST
 * match cue IDs registered in `sound_manifest.ts`.
 */
export const AUDIO_ASSET_URLS: Readonly<Record<string, string>> = Object.freeze({
    // (no resolved binaries yet — every cue is a silent placeholder)
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
