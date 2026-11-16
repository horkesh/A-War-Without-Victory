/**
 * warroomActivityArt — shared art resolver for the warroom activity strips that
 * surface the patron "activity" lane in the Situation tab:
 *   - the Diplomacy & Patron lane   (patron)
 * (The Humanitarian Convoy lane was retired with the convoy decision family, F1i 2026-11-16.)
 *
 * Mirrors the `eventIllustrationArt` / `tutorialDeckArt` / `verdictArt` resolver
 * idiom EXACTLY (eager `import.meta.glob` + faction-tagged basename suffix
 * resolve + graceful null) so the whole project resolves art the same way and
 * ships consistently with the documentary-realism asset canon (NOT oil-paint,
 * NOT sepia; see docs/plans/2026-05-24-gui-ai-asset-brief.md +
 * docs/30_planning/design/VISUAL_ASSET_STRATEGY.md).
 *
 * The activity still is faction-defining (the art-prompt-pack §4.12 patron
 * "Category-4" still, split per faction —
 * docs/40_reports/proposals/20260609_ART_PROMPT_PACK_NON_SECTION6.md), so each
 * resolves a per-faction basename out of the already-shipped event-illustration
 * directory:
 *   patron → event_patron_relations_<faction>.webp
 * (faction ∈ RBiH | RS | HRHB).
 *
 * Art resolution: an eager `import.meta.glob` over `assets/event_illustrations/*.webp`
 * resolves the mapped basename to a hashed dist URL. The three faction-tagged stills
 * already ship in that directory; when an asset is absent (e.g. a future faction or
 * a base that strips the art) the resolver returns `null` and the caller keeps its
 * existing text-only activity card — never a broken image, never a crash.
 *
 * No NEW art is added by this module — it is the WIRING only, reusing the existing
 * event-illustration stills. Pure presentation: no engine/state touch, no
 * Math.random/Date.now.
 *
 * Canonical owner: src/ui/map/data/warroomActivityArt.ts
 */

/** The activity lane that carries a documentary still. */
export type WarroomActivityKind = 'patron';

/** Canonical player factions whose activity stills ship today. */
export type WarroomActivityFaction = 'RBiH' | 'RS' | 'HRHB';

// Eager + ?url so the bundler hashes the committed activity stills into dist and
// we get a plain URL string keyed by the glob path. This is the SAME directory
// glob the EventModal's `eventIllustrationArt` uses; we share the asset folder so
// the patron stills are never duplicated. If the directory is stripped on a
// given base, the glob resolves to `{}` and every activity renders text-only.
const WARROOM_ACTIVITY_ART = import.meta.glob('../assets/event_illustrations/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/**
 * Activity kind → on-disk basename STEM (sans `_<faction>.webp`). The faction is
 * appended at resolve time. Owner-editable: re-point a lane by editing the stem.
 */
export const WARROOM_ACTIVITY_TO_BASENAME_STEM: Readonly<Record<WarroomActivityKind, string>> = {
  patron: 'event_patron_relations',
};

/** Resolve a glob record entry whose path ends with the given suffix. */
function resolveGlobBySuffix(glob: Record<string, string>, suffix: string): string | null {
  for (const [path, url] of Object.entries(glob)) {
    if (path.endsWith(suffix)) return url;
  }
  return null;
}

function isWarroomActivityFaction(value: unknown): value is WarroomActivityFaction {
  return value === 'RBiH' || value === 'RS' || value === 'HRHB';
}

/**
 * Pure resolution core (injectable glob) — exported for tests so the present→url
 * path can be exercised without committing binaries. The public
 * `resolveWarroomActivityArt` binds this to the eager `WARROOM_ACTIVITY_ART` glob.
 *
 * Returns `null` for an unknown kind, a non-canonical faction, or an absent asset.
 */
export function resolveWarroomActivityArtFrom(
  glob: Record<string, string>,
  kind: WarroomActivityKind | null | undefined,
  faction: string | null | undefined,
): string | null {
  if (kind !== 'patron') return null;
  if (!isWarroomActivityFaction(faction)) return null;
  const stem = WARROOM_ACTIVITY_TO_BASENAME_STEM[kind];
  if (!stem) return null;
  return resolveGlobBySuffix(glob, `/${stem}_${faction}.webp`);
}

/**
 * Resolve the documentary-still URL for a warroom activity lane + player faction.
 *
 * Returns the hashed dist URL for the lane's mapped `<stem>_<faction>.webp` when
 * the asset is present, or `null` when no asset matches (the caller keeps its
 * existing text-only activity card — never a broken image).
 */
export function resolveWarroomActivityArt(
  kind: WarroomActivityKind | null | undefined,
  faction: string | null | undefined,
): string | null {
  return resolveWarroomActivityArtFrom(WARROOM_ACTIVITY_ART, kind, faction);
}
