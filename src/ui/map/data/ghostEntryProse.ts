/**
 * ghostEntryProse — UI-side resolver for ghost-codex narrative bodies.
 *
 * Orphaned-wiring audit finding T2-A / content C5
 * (docs/40_reports/proposals/20260609_ORPHANED_WIRING_AUDIT_content.md): the
 * VerdictScreen Campaign Codex panel rendered the raw repo-relative
 * markdown PATH (e.g. literally `data/codex/ghost_entries/winter_held.md`)
 * instead of the authored narrative. 20 EN + 20 BCS prose bodies exist on disk
 * (`data/codex/ghost_entries/`, `data/codex/ghost_entries_bcs/`) and were read
 * by zero runtime code. This module bundles those bodies (raw markdown) at
 * build time and resolves them by ghost id + locale.
 *
 * Resolution mirrors the `eventIllustrationArt` resolver idiom: eager
 * `import.meta.glob` of the on-disk bodies, keyed by the trailing path segment
 * (`<ghost_id>.md`). Missing → `null` → the caller degrades gracefully (renders
 * the label only), exactly as the art resolver degrades to text-only.
 *
 * §6 DISCIPLINE: two ghost bodies are §6-adjacent (`cleansing_refused`,
 * `enclave_defended` — the latter is the AUDIT-ONLY Srebrenica-framing entry).
 * Their prose is NOT surfaced here pending owner + §6 sign-off; they fall
 * through to `null` (label only) like any body with no matching file. See the
 * audit master §6-GATED note and SENSITIVE_HISTORY_DESIGN_GATE.md §6.
 *
 * Pure presentation: no engine/state touch, no Math.random/Date.now.
 *
 * Canonical owner: src/ui/map/data/ghostEntryProse.ts
 */

import type { Locale } from '../i18n';
import type { GhostRecordClassification } from '../../../sim/codex/dynamic_section_builder.js';

export interface GhostProseBlock {
  kind: 'heading' | 'paragraph';
  text: string;
}

/** Render the authored Markdown subset without exposing source markers. */
export function parseGhostEntryProse(
  markdown: string,
  classification: GhostRecordClassification,
): GhostProseBlock[] {
  const stripInlineMarkers = (value: string): string => value
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/[\*_`]/g, '')
    .trim();

  return markdown
    .split(/\r?\n\s*\r?\n/)
    .map((rawBlock): GhostProseBlock | null => {
      const block = rawBlock.trim();
      if (block.length === 0) return null;
      const heading = block.match(/^#{1,6}\s+([\s\S]+)$/);
      const parsed: GhostProseBlock = heading
        ? { kind: 'heading', text: stripInlineMarkers(heading[1]) }
        : { kind: 'paragraph', text: stripInlineMarkers(block.replace(/\r?\n/g, ' ')) };
      // Four reclassified EN context bodies carry a legacy classification strapline.
      // It is metadata, not factual prose, and must not mislabel a context row
      // as a path-not-taken record.
      if (classification !== 'path_not_taken' && /path[-\s]?not[-\s]?taken/i.test(parsed.text)) {
        return null;
      }
      return parsed.text.length > 0 ? parsed : null;
    })
    .filter((block): block is GhostProseBlock => block !== null);
}

/**
 * Ghost ids whose authored body is §6-adjacent and must NOT be surfaced without
 * owner + sensitive-history sign-off. These resolve to `null` (label only) even
 * though the body exists on disk.
 */
const SECTION6_GATED_GHOST_IDS: ReadonlySet<string> = new Set([
  'cleansing_refused',
  'enclave_defended',
]);

// Eager raw glob so the bundler inlines every authored body as a string keyed
// by glob path. The directories are content-complete (20 EN + 20 BCS); a
// missing body resolves to `null` and the caller renders the label only.
const GHOST_PROSE_EN = import.meta.glob('../../../../data/codex/ghost_entries/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const GHOST_PROSE_BCS = import.meta.glob('../../../../data/codex/ghost_entries_bcs/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

/** Resolve a glob record entry whose path ends with the given suffix. */
function resolveGlobBySuffix(glob: Record<string, string>, suffix: string): string | null {
  for (const [path, body] of Object.entries(glob)) {
    if (path.endsWith(suffix)) return body;
  }
  return null;
}

/**
 * Resolve the authored markdown body for a ghost entry, respecting locale.
 *
 * @param ghostId  Stable ghost id (file basename, no extension), e.g. `winter_held`.
 * @param locale   Canonical `'en'` or `'bs'` (plus QA-only `'qps'`). Falls back to
 *                 the EN body when the legacy-authored Bosnian body
 *                 is absent (none are today, but the fallback keeps the panel
 *                 populated rather than blank if a locale gap appears).
 * @returns the raw markdown body, or `null` when no body should be surfaced
 *          (unknown id, missing file, or §6-gated id).
 */
export function resolveGhostEntryProse(ghostId: string, locale: Locale): string | null {
  if (typeof ghostId !== 'string') return null;
  const id = ghostId.trim();
  if (id.length === 0) return null;
  if (SECTION6_GATED_GHOST_IDS.has(id)) return null;

  const suffix = `/${id}.md`;
  if (locale === 'bs') {
    const bs = resolveGlobBySuffix(GHOST_PROSE_BCS, suffix);
    if (bs !== null) return bs;
  }
  return resolveGlobBySuffix(GHOST_PROSE_EN, suffix);
}
