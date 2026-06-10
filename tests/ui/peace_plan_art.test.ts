/**
 * @vitest-environment jsdom
 *
 * Peace-plan still resolver (PeacePlanModal `assets/plans/` wiring).
 *
 * UI/data-only, calibration-INERT: pure presentation resolver, no
 * engine/state touch. This suite proves:
 *   - the resolver maps exactly the four shipped plan ids to committed
 *     assets (owner-approved NO-MAP route, 2026-06-10) and resolves each to
 *     a real URL through the eager glob;
 *   - `cutileiro` (no dedicated still), unknown ids, and null/undefined all
 *     resolve `null` (graceful fallback — the modal renders without a still,
 *     never a broken image);
 *   - the injectable core resolves by basename suffix and ignores unmapped
 *     glob entries.
 */

import { describe, expect, it } from 'vitest';
import {
  PEACE_PLAN_ID_TO_BASENAME,
  resolvePeacePlanStill,
  resolvePeacePlanStillFrom,
} from '../../src/ui/map/data/peacePlanArt.js';
import { PEACE_PLANS } from '../../src/sim/negotiation/peace_plan_data.js';

const SHIPPED_PLAN_IDS = ['vance_owen', 'owen_stoltenberg', 'contact_group', 'dayton'] as const;

describe('resolvePeacePlanStill (eager glob over committed assets)', () => {
  it('resolves a URL for each of the four shipped plan stills', () => {
    for (const planId of SHIPPED_PLAN_IDS) {
      const url = resolvePeacePlanStill(planId);
      expect(url, `plan ${planId} should resolve to a committed asset`).toBeTruthy();
      expect(url).toContain(`plan_${planId}`);
    }
  });

  it('returns null for cutileiro (intentionally no dedicated still)', () => {
    expect(resolvePeacePlanStill('cutileiro')).toBeNull();
  });

  it('returns null for unknown / null / undefined plan ids', () => {
    expect(resolvePeacePlanStill('not_a_plan')).toBeNull();
    expect(resolvePeacePlanStill(null)).toBeNull();
    expect(resolvePeacePlanStill(undefined)).toBeNull();
    expect(resolvePeacePlanStill('')).toBeNull();
  });
});

describe('PEACE_PLAN_ID_TO_BASENAME mapping integrity', () => {
  it('maps only real catalog plan ids (no orphan keys)', () => {
    const catalogIds = new Set(PEACE_PLANS.map((p) => p.id));
    for (const mappedId of Object.keys(PEACE_PLAN_ID_TO_BASENAME)) {
      expect(catalogIds.has(mappedId), `mapped id ${mappedId} must exist in PEACE_PLANS`).toBe(true);
    }
  });

  it('covers every catalog plan except cutileiro', () => {
    const mapped = new Set(Object.keys(PEACE_PLAN_ID_TO_BASENAME));
    for (const plan of PEACE_PLANS) {
      if (plan.id === 'cutileiro') {
        expect(mapped.has(plan.id)).toBe(false);
      } else {
        expect(mapped.has(plan.id), `catalog plan ${plan.id} should have a still`).toBe(true);
      }
    }
  });
});

describe('resolvePeacePlanStillFrom (injectable core)', () => {
  const FAKE_GLOB = {
    '../assets/plans/plan_vance_owen.webp': '/assets/plan_vance_owen-abc123.webp',
    '../assets/plans/plan_dayton.webp': '/assets/plan_dayton-def456.webp',
  };

  it('resolves a mapped id whose asset is present', () => {
    expect(resolvePeacePlanStillFrom(FAKE_GLOB, 'vance_owen')).toBe('/assets/plan_vance_owen-abc123.webp');
    expect(resolvePeacePlanStillFrom(FAKE_GLOB, 'dayton')).toBe('/assets/plan_dayton-def456.webp');
  });

  it('returns null for a mapped id whose asset is absent (separate art PR case)', () => {
    expect(resolvePeacePlanStillFrom(FAKE_GLOB, 'contact_group')).toBeNull();
    expect(resolvePeacePlanStillFrom({}, 'vance_owen')).toBeNull();
  });

  it('matches by full basename, not substring (no accidental prefix hits)', () => {
    const trickyGlob = {
      '../assets/plans/not_plan_dayton.webp': '/assets/wrong.webp',
    };
    // `/plan_dayton.webp` suffix does match `not_plan_dayton.webp`? No —
    // the resolver requires the `/`-prefixed basename, so this must miss.
    expect(resolvePeacePlanStillFrom(trickyGlob, 'dayton')).toBeNull();
  });
});
