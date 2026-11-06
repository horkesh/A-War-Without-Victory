/**
 * eventIllustrationArt — shared art resolver for historical event illustrations
 * shown in the EventModal (the documentary-realism still that sits above the
 * event narrative when an event authors an `image`).
 *
 * Mirrors the `presidentialCommandArt` resolver idiom exactly so the whole
 * project resolves art the same way and ships consistently with the 56 shipped
 * presidential-desk / command-card assets (documentary realism — NOT oil-paint,
 * NOT sepia; see docs/plans/2026-05-24-gui-ai-asset-brief.md +
 * docs/30_planning/design/VISUAL_ASSET_STRATEGY.md).
 *
 * Art resolution precedence (first hit wins):
 *   1. an illustration at `assets/event_illustrations/<basename>.webp` whose path
 *      ends with the authored `image` key (drop one in and it renders with no code
 *      edit — eager `import.meta.glob`, hashed into dist);
 *   2. otherwise `null` — the caller renders its text-only layout unchanged, so an
 *      event WITHOUT an `image` (most shipped events) looks byte-identical to
 *      before, and an event WITH an `image` key that has no asset on disk yet still
 *      degrades gracefully to text-only.
 *
 * No new art is added by this module — it is the WIRING only. As of 2026-11-05
 * the `event_illustrations/` directory ships 31 documentary stills and 28 catalog
 * events author an `image` key; the §6-sensitive subset stays Historian-gated.
 *
 * Pure presentation: no engine/state touch, no Math.random/Date.now.
 *
 * Canonical owner: src/ui/map/data/eventIllustrationArt.ts
 */

import { t, type MessageKey } from '../i18n';

/**
 * The §6-gated event stills (docs/40_reports/governance/20260610_SECTION6_ART_SIGNOFF.md).
 * A still listed here is never decorative: wherever it renders it carries this factual alt
 * text, and a surface that composites faction colour over its art uses the neutral accent
 * instead (§6 panel on visual-polish D8, 2026-11-06). Keyed by on-disk basename without
 * extension. Category plates are never in this table, so they never stand in for a §6 still.
 */
const SECTION6_STILL_ALT_KEYS: Readonly<Record<string, MessageKey>> = Object.freeze({
  event_concentration_camps_revealed_1992: 'eventArt.alt.event_concentration_camps_revealed_1992',
  event_ahmici_massacre_1993: 'eventArt.alt.event_ahmici_massacre_1993',
  event_drina_valley_ethnic_cleansing_1992: 'eventArt.alt.event_drina_valley_ethnic_cleansing_1992',
  event_markale_shelling: 'eventArt.alt.event_markale_shelling',
  event_srebrenica_falls_1995: 'eventArt.alt.event_srebrenica_falls_1995',
  event_zepa_falls_1995: 'eventArt.alt.event_zepa_falls_1995',
});

/** Basename of an authored `image` key without directory or extension; null when blank. */
function imageStem(image: string | null | undefined): string | null {
  if (typeof image !== 'string') return null;
  const trimmed = image.trim();
  if (trimmed.length === 0) return null;
  const lastSlash = trimmed.lastIndexOf('/');
  const basename = lastSlash >= 0 ? trimmed.slice(lastSlash + 1) : trimmed;
  return basename.replace(/\.webp$/i, '') || null;
}

/**
 * The factual alt text for a §6-gated still, localised; null for any other image, which a
 * caller may then treat as decorative (`alt=""`).
 */
export function section6StillAlt(image: string | null | undefined): string | null {
  const stem = imageStem(image);
  const key = stem ? SECTION6_STILL_ALT_KEYS[stem] : undefined;
  return key ? t(key) : null;
}

// Eager + ?url so the bundler hashes any committed illustration into dist and we
// get a plain URL string keyed by the glob path. An `image` with no matching
// asset resolves to null and that event falls through to text-only.
const EVENT_ILLUSTRATION_ART = import.meta.glob('../assets/event_illustrations/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** Resolve a glob record entry whose path ends with the given suffix. */
function resolveGlobBySuffix(glob: Record<string, string>, suffix: string): string | null {
  for (const [path, url] of Object.entries(glob)) {
    if (path.endsWith(suffix)) return url;
  }
  return null;
}

/**
 * Resolve the illustration URL for an authored `image` key.
 *
 * The key may be a bare basename (`jna_withdrawal_1992.webp`) or any path that
 * ends with the on-disk basename — resolution is by trailing-segment suffix so
 * authors can write either form. A leading-slash suffix match keeps the lookup
 * anchored to a full path segment (never a partial-name collision).
 *
 * Returns `null` when no asset matches, so the caller renders text-only.
 */
export function resolveEventIllustration(image: string | null | undefined): string | null {
  if (typeof image !== 'string') return null;
  const trimmed = image.trim();
  if (trimmed.length === 0) return null;
  // Anchor on the trailing path segment so `image: 'foo.webp'` and
  // `image: 'event_illustrations/foo.webp'` both resolve to `/foo.webp`.
  const lastSlash = trimmed.lastIndexOf('/');
  const basename = lastSlash >= 0 ? trimmed.slice(lastSlash + 1) : trimmed;
  if (basename.length === 0) return null;
  return resolveGlobBySuffix(EVENT_ILLUSTRATION_ART, `/${basename}`);
}
