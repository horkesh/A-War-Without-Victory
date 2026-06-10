/**
 * peacePlanArt — shared art resolver for the peace-plan modal's documentary
 * still. Mirrors the `verdictArt` / `eventIllustrationArt` /
 * `presidentialCommandArt` resolver idiom exactly so the whole project
 * resolves art the same way and ships consistently with the
 * documentary-realism asset canon (NOT oil-paint, NOT sepia; see
 * docs/40_reports/proposals/20260609_ART_PROMPT_PACK_NON_SECTION6.md +
 * docs/plans/2026-05-24-gui-ai-asset-brief.md).
 *
 * Four 600×400 plan stills ship under `assets/plans/` (owner-approved
 * NO-MAP route, 2026-06-10 — atmospheric document scenes whose object
 * language carries each plan's semantics, not cartographic maps):
 *   - plan_vance_owen.webp        — scattered folder/map mosaic (ten provinces)
 *   - plan_owen_stoltenberg.webp  — three folders at a round table (three republics)
 *   - plan_contact_group.webp     — ruler dividing two document stacks (51/49)
 *   - plan_dayton.webp            — the empty pre-signing conference table
 *
 * PLAN ID → FILE mapping (5 catalog plans, 4 files — `cutileiro` has no
 * dedicated still and resolves `null`; the modal keeps its decision-header
 * treatment unchanged):
 *   vance_owen       → plan_vance_owen
 *   owen_stoltenberg → plan_owen_stoltenberg
 *   contact_group    → plan_contact_group
 *   dayton           → plan_dayton
 *
 * Art resolution: an eager `import.meta.glob` over `assets/plans/*.webp`
 * resolves the mapped basename to a hashed dist URL. When the asset is absent
 * the resolver returns `null` and the caller renders no still — never a
 * broken image.
 *
 * Pure presentation: no engine/state touch, no Math.random/Date.now.
 *
 * Canonical owner: src/ui/map/data/peacePlanArt.ts
 */

// Eager + ?url so the bundler hashes any committed plan still into dist and we
// get a plain URL string keyed by the glob path. An empty directory resolves
// to `{}` and every plan falls through to the no-still layout.
const PEACE_PLAN_ART = import.meta.glob('../assets/plans/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/**
 * Explicit, owner-editable plan id → on-disk basename map.
 *
 * Keys are the `PeacePlanDefinition.id` values from
 * `src/sim/negotiation/peace_plan_data.ts`. `cutileiro` is intentionally
 * absent (no dedicated still); an unmapped or asset-less id resolves to
 * `null` and the modal renders without a still.
 */
export const PEACE_PLAN_ID_TO_BASENAME: Readonly<Record<string, string>> = {
  vance_owen: 'plan_vance_owen.webp',
  owen_stoltenberg: 'plan_owen_stoltenberg.webp',
  contact_group: 'plan_contact_group.webp',
  dayton: 'plan_dayton.webp',
};

/** Resolve a glob record entry whose path ends with the given suffix. */
function resolveGlobBySuffix(glob: Record<string, string>, suffix: string): string | null {
  for (const [path, url] of Object.entries(glob)) {
    if (path.endsWith(suffix)) return url;
  }
  return null;
}

/**
 * Pure resolution core (injectable glob) — exported for tests so the
 * present→url path can be exercised without committing binaries. The public
 * `resolvePeacePlanStill` binds this to the eager `PEACE_PLAN_ART` glob.
 */
export function resolvePeacePlanStillFrom(
  glob: Record<string, string>,
  planId: string | null | undefined,
): string | null {
  if (typeof planId !== 'string') return null;
  const basename = PEACE_PLAN_ID_TO_BASENAME[planId];
  if (!basename) return null;
  return resolveGlobBySuffix(glob, `/${basename}`);
}

/**
 * Resolve the documentary still URL for a peace plan id.
 *
 * Returns the hashed dist URL for the plan's mapped `plan_<id>.webp` when the
 * asset is present, or `null` when no asset matches (the caller renders the
 * modal without a still — never a broken image).
 */
export function resolvePeacePlanStill(planId: string | null | undefined): string | null {
  return resolvePeacePlanStillFrom(PEACE_PLAN_ART, planId);
}
