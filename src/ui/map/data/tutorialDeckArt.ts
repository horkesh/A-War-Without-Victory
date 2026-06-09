/**
 * tutorialDeckArt — shared art resolver for the A4 onboarding teaching deck
 * (the 8-slide presidential-campaign-loop tutorial; see `onboardingSteps.ts`).
 *
 * Mirrors the `eventIllustrationArt` / `verdictArt` resolver idiom exactly so
 * the whole project resolves art the same way and ships consistently with the
 * documentary-realism asset canon (see docs/plans/2026-05-24-gui-ai-asset-brief.md).
 *
 * Eight 600×400 slide stills ship under `assets/tutorial/`, one per step id:
 *   tutorial_01_welcome.webp … tutorial_08_judge.webp
 *
 * The onboarding step ids are `01_welcome … 08_judge` (`onboardingSteps.ts`),
 * so a slide's asset basename is simply `tutorial_<step.id>.webp`. Resolution is
 * by trailing path-segment suffix (a leading `/` anchors the match to a full
 * basename, never a partial-name collision).
 *
 * Art resolution: an eager `import.meta.glob` over `assets/tutorial/*.webp`
 * resolves the basename to a hashed dist URL. When the asset is absent (the
 * files ship via a separate art PR), the resolver returns `null` and the slide
 * renders without an image — never a broken image, never a crash.
 *
 * Pure presentation: no engine/state touch, no Math.random/Date.now.
 *
 * Canonical owner: src/ui/map/data/tutorialDeckArt.ts
 */

// Eager + ?url so the bundler hashes any committed slide still into dist and we
// get a plain URL string keyed by the glob path. The directory may be empty on
// a given base (assets ship via a separate art PR); the glob then resolves to
// `{}` and every slide renders image-less exactly as before.
const TUTORIAL_DECK_ART = import.meta.glob('../assets/tutorial/*.webp', {
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
 * Pure resolution core (injectable glob) — exported for tests so the present→url
 * path can be exercised without committing binaries. The public
 * `resolveTutorialSlideArt` binds this to the eager `TUTORIAL_DECK_ART` glob.
 */
export function resolveTutorialSlideArtFrom(
  glob: Record<string, string>,
  stepId: string | null | undefined,
): string | null {
  if (typeof stepId !== 'string') return null;
  const trimmed = stepId.trim();
  if (trimmed.length === 0) return null;
  return resolveGlobBySuffix(glob, `/tutorial_${trimmed}.webp`);
}

/**
 * Resolve the slide-still URL for an onboarding step id (`01_welcome` …
 * `08_judge`).
 *
 * The on-disk basename is `tutorial_<stepId>.webp`. Returns the hashed dist URL
 * when the asset is present, or `null` when no asset matches (the slide renders
 * without an image).
 */
export function resolveTutorialSlideArt(stepId: string | null | undefined): string | null {
  return resolveTutorialSlideArtFrom(TUTORIAL_DECK_ART, stepId);
}
