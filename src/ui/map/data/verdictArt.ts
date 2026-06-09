/**
 * verdictArt — shared art resolver for the cinematic verdict (endgame) screen
 * background. Mirrors the `eventIllustrationArt` / `presidentialCommandArt`
 * resolver idiom exactly so the whole project resolves art the same way and
 * ships consistently with the documentary-realism asset canon (NOT oil-paint,
 * NOT sepia; see docs/plans/2026-05-24-gui-ai-asset-brief.md +
 * docs/30_planning/design/VISUAL_ASSET_STRATEGY.md).
 *
 * The CinematicVerdict header already derives a `VerdictSceneTone`
 * (`somber | pyrrhic | catastrophic | early_peace`, see `verdictScene.ts`).
 * Three 1920×1080 verdict backgrounds ship under `assets/verdicts/`:
 *   - verdict_dayton_close.webp  — negotiated peace / Dayton-table close
 *   - verdict_pyrrhic.webp       — survived-but-broken pyrrhic outcome
 *   - verdict_catastrophic.webp  — collapse / atrocity-condemned outcome
 *
 * TONE → FILE mapping (4 tones, 3 files — sombre default folds onto pyrrhic):
 *   early_peace  → verdict_dayton_close   (the hopeful, negotiated close)
 *   pyrrhic      → verdict_pyrrhic
 *   catastrophic → verdict_catastrophic
 *   somber       → verdict_pyrrhic        (default sombre bg)
 *
 * TODO(art): `somber` currently reuses the pyrrhic plate as the default sombre
 * background. If a dedicated `verdict_somber.webp` is later generated, add it to
 * `assets/verdicts/` and point the `somber` row at `dayton_close`-style/somber
 * art here — no other code change is required (eager glob + basename resolve).
 *
 * Art resolution: an eager `import.meta.glob` over `assets/verdicts/*.webp`
 * resolves the mapped basename to a hashed dist URL. When the asset is absent
 * (the files ship via a separate art PR), the resolver returns `null` and the
 * caller keeps its existing solid/gradient background — never a broken image.
 *
 * Pure presentation: no engine/state touch, no Math.random/Date.now.
 *
 * Canonical owner: src/ui/map/data/verdictArt.ts
 */

import type { VerdictSceneTone } from './verdictScene.js';

// Eager + ?url so the bundler hashes any committed verdict background into dist
// and we get a plain URL string keyed by the glob path. The directory may be
// empty on a given base (assets ship via a separate art PR); the glob then
// resolves to `{}` and every tone falls through to the gradient background.
const VERDICT_ART = import.meta.glob('../assets/verdicts/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/**
 * Explicit, owner-editable tone → on-disk basename map.
 *
 * `somber` folds onto the pyrrhic plate as the default sombre background (see
 * the module TODO). Re-map by editing this table; a tone whose mapped asset is
 * absent resolves to `null` and the caller keeps its gradient background.
 */
export const VERDICT_TONE_TO_BASENAME: Readonly<Record<VerdictSceneTone, string>> = {
  early_peace: 'verdict_dayton_close.webp',
  pyrrhic: 'verdict_pyrrhic.webp',
  catastrophic: 'verdict_catastrophic.webp',
  // TODO(art): no dedicated somber plate yet — default sombre bg reuses pyrrhic.
  somber: 'verdict_pyrrhic.webp',
};

/** Resolve a glob record entry whose path ends with the given suffix. */
function resolveGlobBySuffix(glob: Record<string, string>, suffix: string): string | null {
  for (const [path, url] of Object.entries(glob)) {
    if (path.endsWith(suffix)) return url;
  }
  return null;
}

/**
 * Pure resolution core (injectable glob) — exported for tests so the present→url
 * path can be exercised without committing binaries. The public
 * `resolveVerdictBackground` binds this to the eager `VERDICT_ART` glob.
 */
export function resolveVerdictBackgroundFrom(
  glob: Record<string, string>,
  tone: VerdictSceneTone | null | undefined,
): string | null {
  if (typeof tone !== 'string') return null;
  const basename = VERDICT_TONE_TO_BASENAME[tone as VerdictSceneTone];
  if (!basename) return null;
  return resolveGlobBySuffix(glob, `/${basename}`);
}

/**
 * Resolve the background image URL for a verdict tone.
 *
 * Returns the hashed dist URL for the tone's mapped `verdict_<tone>.webp` when
 * the asset is present, or `null` when no asset matches (the caller keeps its
 * existing solid/gradient background — never a broken image).
 */
export function resolveVerdictBackground(tone: VerdictSceneTone | null | undefined): string | null {
  return resolveVerdictBackgroundFrom(VERDICT_ART, tone);
}
