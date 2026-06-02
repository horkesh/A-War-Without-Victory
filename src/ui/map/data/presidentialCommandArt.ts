/**
 * presidentialCommandArt — shared art resolver for the presidential command
 * surface (warroom CommandCard strip + the Decision Room DirectiveCard act layer).
 *
 * This is the SINGLE place the presidential-desk art globs live. Both the
 * CommandCard (4:3 category cards / 16:9 action cards) and the DirectiveCard
 * (16:9 dossier header) resolve through here so the `import.meta.glob` patterns
 * are never duplicated across components.
 *
 * Art resolution precedence (first hit wins):
 *   1. a per-card override at `assets/command_cards/<id>.webp` (drop one in and it
 *      wins with no code edit — eager `import.meta.glob`, hashed into dist);
 *   2. an explicit id → existing desk-asset basename map the caller supplies
 *      (category cards reuse the 4:3 `packet_thumbnails/`, action / directive cards
 *      reuse the 16:9 `consequence_stills/`);
 *   3. otherwise `null` — the caller renders its own placeholder so the feature
 *      works fully even for unmapped ids.
 *
 * No new art is added — step 2 reuses the desk assets that already ship for the
 * decision modals. Pure presentation: no engine/state touch, no Math.random/Date.now.
 *
 * Canonical owner: src/ui/map/data/presidentialCommandArt.ts
 */

// Drop-in per-card override: place `<id>.webp` in assets/command_cards/ and it
// wins with no code edit. Eager + ?url so the bundler hashes the asset into dist
// and we get a plain URL string keyed by the glob path.
const COMMAND_CARD_OVERRIDE_ART = import.meta.glob('../assets/command_cards/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

// Shared desk art: the already-generated presidential-desk decision-family
// thumbnails/stills. ES-import (same packaging-safe pattern as the override glob)
// so these existing assets hash into dist and ship automatically.
const PRESIDENTIAL_DESK_ART = import.meta.glob(
  '../assets/presidential_desk/{packet_thumbnails,consequence_stills}/*.webp',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>;

/** Resolve a glob record entry whose path ends with the given suffix. */
function resolveGlobBySuffix(glob: Record<string, string>, suffix: string): string | null {
  for (const [path, url] of Object.entries(glob)) {
    if (path.endsWith(suffix)) return url;
  }
  return null;
}

/** Resolve a per-card override (`command_cards/<id>.webp`) if one exists. */
export function resolveCommandCardOverride(id: string): string | null {
  return resolveGlobBySuffix(COMMAND_CARD_OVERRIDE_ART, `/${id}.webp`);
}

/** Resolve a shared presidential-desk asset by its basename (e.g. `foo.webp`). */
export function resolveDeskAssetByBasename(basename: string): string | null {
  return resolveGlobBySuffix(PRESIDENTIAL_DESK_ART, `/${basename}`);
}

/**
 * Resolve art for a command-surface id against an explicit basename map.
 *
 * Precedence: per-id override (`command_cards/<id>.webp`) → mapped shared desk
 * asset → null (caller renders its own placeholder).
 */
export function resolvePresidentialCommandArt(
  id: string,
  deskAssetMap: Readonly<Record<string, string>>,
): string | null {
  // 1. Per-id override always wins.
  const override = resolveCommandCardOverride(id);
  if (override) return override;
  // 2. Shared desk asset for this id, if mapped.
  const deskBasename = deskAssetMap[id];
  if (deskBasename) {
    const shared = resolveDeskAssetByBasename(deskBasename);
    if (shared) return shared;
  }
  // 3. No art — caller falls back to its placeholder.
  return null;
}
