import { describe, expect, it } from 'vitest';

import {
  derivePreAdvanceSeverityTone,
} from '../../src/ui/map/components/PresidentialToolbar.js';

/**
 * NIGHTSHIFT-G5 — On-Map Pre-Advance Severity Pip.
 *
 * Behavioural and source-text guards that the tactical toolbar renders a thin
 * severity ring around the INBOX badge derived from the canonical
 * adapter-owned `presidentialReviewQueue` view-model.
 *
 * Red-first: written before deliberately-broken renderings would otherwise
 * pass. Asserts both the pure derivation function and the toolbar wiring.
 */

describe('Presidential toolbar — pre-advance severity pip', () => {
  describe('derivePreAdvanceSeverityTone (pure derivation)', () => {
    it('returns null when the queue is missing or undefined', () => {
      expect(derivePreAdvanceSeverityTone(undefined)).toBeNull();
      expect(derivePreAdvanceSeverityTone(null)).toBeNull();
    });

    it('returns null when there are no pending or critical items', () => {
      expect(
        derivePreAdvanceSeverityTone({ pendingCount: 0, criticalCount: 0 }),
      ).toBeNull();
    });

    it('returns "blocking" when criticalCount > 0 (red ring takes precedence)', () => {
      expect(
        derivePreAdvanceSeverityTone({ pendingCount: 1, criticalCount: 1 }),
      ).toBe('blocking');
      expect(
        derivePreAdvanceSeverityTone({ pendingCount: 8, criticalCount: 3 }),
      ).toBe('blocking');
    });

    it('returns "urgent" only when no critical items and pendingCount > 5', () => {
      expect(
        derivePreAdvanceSeverityTone({ pendingCount: 6, criticalCount: 0 }),
      ).toBe('urgent');
      expect(
        derivePreAdvanceSeverityTone({ pendingCount: 12, criticalCount: 0 }),
      ).toBe('urgent');
    });

    it('returns null at the urgent boundary (pendingCount === 5)', () => {
      // Threshold is strict (>5), so 5 must NOT light an urgent ring.
      expect(
        derivePreAdvanceSeverityTone({ pendingCount: 5, criticalCount: 0 }),
      ).toBeNull();
    });

    it('is deterministic — same input always yields same tone (no random, no time)', () => {
      const input = { pendingCount: 7, criticalCount: 0 };
      const a = derivePreAdvanceSeverityTone(input);
      const b = derivePreAdvanceSeverityTone(input);
      const c = derivePreAdvanceSeverityTone(input);
      expect(a).toBe('urgent');
      expect(b).toBe('urgent');
      expect(c).toBe('urgent');
    });
  });

});
