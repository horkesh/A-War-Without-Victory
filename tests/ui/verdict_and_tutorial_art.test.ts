/**
 * @vitest-environment jsdom
 *
 * Verdict-background + tutorial-deck art resolvers (graceful fallback).
 *
 * UI/data-only, calibration-INERT. The .webp assets shipped via #378, so the
 * resolvers' real eager glob is populated. This suite proves both halves of the
 * graceful-fallback contract:
 *   - present asset → the mapped basename resolves to its hashed URL (the real
 *     glob for the public resolvers; an injected glob for the pure core);
 *   - absent asset  → `null` (an INJECTED empty glob via the pure core, plus any
 *     non-matching / empty / nullish key).
 *
 * Both resolvers mirror the eventIllustrationArt idiom (eager import.meta.glob +
 * basename suffix resolve + graceful null).
 */

import { describe, expect, it } from 'vitest';
import {
  VERDICT_TONE_TO_BASENAME,
  resolveVerdictBackground,
  resolveVerdictBackgroundFrom,
} from '../../src/ui/map/data/verdictArt.js';
import {
  resolveTutorialSlideArt,
  resolveTutorialSlideArtFrom,
} from '../../src/ui/map/data/tutorialDeckArt.js';
import { ONBOARDING_STEPS } from '../../src/ui/map/components/onboarding/onboardingSteps.js';
import type { VerdictSceneTone } from '../../src/ui/map/data/verdictScene.js';

// ── Verdict background resolver ──────────────────────────────────────────────

describe('resolveVerdictBackground — tone → file mapping', () => {
  it('maps every VerdictSceneTone to a verdict_*.webp basename (somber folds onto pyrrhic)', () => {
    expect(VERDICT_TONE_TO_BASENAME).toEqual({
      early_peace: 'verdict_dayton_close.webp',
      pyrrhic: 'verdict_pyrrhic.webp',
      catastrophic: 'verdict_catastrophic.webp',
      somber: 'verdict_pyrrhic.webp',
    });
  });

  it('resolves the mapped URL for each tone when the asset is present (injected glob)', () => {
    const glob: Record<string, string> = {
      '../assets/verdicts/verdict_dayton_close.webp': '/assets/verdict_dayton_close-aaa.webp',
      '../assets/verdicts/verdict_pyrrhic.webp': '/assets/verdict_pyrrhic-bbb.webp',
      '../assets/verdicts/verdict_catastrophic.webp': '/assets/verdict_catastrophic-ccc.webp',
    };
    expect(resolveVerdictBackgroundFrom(glob, 'early_peace')).toBe('/assets/verdict_dayton_close-aaa.webp');
    expect(resolveVerdictBackgroundFrom(glob, 'pyrrhic')).toBe('/assets/verdict_pyrrhic-bbb.webp');
    expect(resolveVerdictBackgroundFrom(glob, 'catastrophic')).toBe('/assets/verdict_catastrophic-ccc.webp');
    // somber defaults onto the pyrrhic plate.
    expect(resolveVerdictBackgroundFrom(glob, 'somber')).toBe('/assets/verdict_pyrrhic-bbb.webp');
  });

  it('returns null for a tone whose asset is absent from the glob', () => {
    expect(resolveVerdictBackgroundFrom({}, 'pyrrhic')).toBeNull();
    expect(resolveVerdictBackgroundFrom({ '../assets/verdicts/verdict_pyrrhic.webp': '/x.webp' }, 'catastrophic')).toBeNull();
  });

  it('returns null for nullish / unknown tones', () => {
    expect(resolveVerdictBackgroundFrom({}, null)).toBeNull();
    expect(resolveVerdictBackgroundFrom({}, undefined)).toBeNull();
    expect(resolveVerdictBackgroundFrom({}, 'not_a_tone' as unknown as VerdictSceneTone)).toBeNull();
  });

  it('against the real (#378-merged) glob, every tone resolves to its mapped plate', () => {
    // The verdict .webp files shipped via #378, so the eager glob is populated:
    // every tone resolves to a hashed URL ending in its mapped basename, and
    // `somber` folds onto the pyrrhic plate.
    for (const tone of Object.keys(VERDICT_TONE_TO_BASENAME) as VerdictSceneTone[]) {
      const url = resolveVerdictBackground(tone);
      expect(url).not.toBeNull();
      const basename = VERDICT_TONE_TO_BASENAME[tone].replace(/\.webp$/, '');
      // Hashed dist URL: <basename>-<hash>.webp (the build content-hashes assets).
      expect(url).toMatch(new RegExp(`${basename}[^/]*\\.webp$`));
    }
  });
});

// ── Tutorial deck slide resolver ─────────────────────────────────────────────

describe('resolveTutorialSlideArt — step id → tutorial_<id>.webp', () => {
  it('resolves the mapped URL for a step id when the asset is present (injected glob)', () => {
    const glob: Record<string, string> = {
      '../assets/tutorial/tutorial_01_welcome.webp': '/assets/tutorial_01_welcome-aaa.webp',
      '../assets/tutorial/tutorial_08_judge.webp': '/assets/tutorial_08_judge-zzz.webp',
    };
    expect(resolveTutorialSlideArtFrom(glob, '01_welcome')).toBe('/assets/tutorial_01_welcome-aaa.webp');
    expect(resolveTutorialSlideArtFrom(glob, '08_judge')).toBe('/assets/tutorial_08_judge-zzz.webp');
  });

  it('returns null for absent / empty / nullish step ids', () => {
    expect(resolveTutorialSlideArtFrom({}, '01_welcome')).toBeNull();
    expect(resolveTutorialSlideArtFrom({}, '')).toBeNull();
    expect(resolveTutorialSlideArtFrom({}, '   ')).toBeNull();
    expect(resolveTutorialSlideArtFrom({}, null)).toBeNull();
    expect(resolveTutorialSlideArtFrom({}, undefined)).toBeNull();
  });

  it('every authored onboarding step id maps to a tutorial_<id>.webp basename', () => {
    // Build a synthetic glob covering all 8 steps and prove each resolves.
    const glob: Record<string, string> = {};
    for (const step of ONBOARDING_STEPS) {
      glob[`../assets/tutorial/tutorial_${step.id}.webp`] = `/assets/tutorial_${step.id}-h.webp`;
    }
    for (const step of ONBOARDING_STEPS) {
      expect(resolveTutorialSlideArtFrom(glob, step.id)).toBe(`/assets/tutorial_${step.id}-h.webp`);
    }
  });

  it('against the real (#378-merged) glob, every step resolves to its slide still', () => {
    // The tutorial_01..08 .webp slides shipped via #378, so the eager glob is
    // populated: every step id resolves to a hashed URL ending in
    // tutorial_<id>(-<hash>).webp.
    for (const step of ONBOARDING_STEPS) {
      const url = resolveTutorialSlideArt(step.id);
      expect(url).not.toBeNull();
      expect(url).toMatch(new RegExp(`tutorial_${step.id}[^/]*\\.webp$`));
    }
  });
});
