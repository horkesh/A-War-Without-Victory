/**
 * Robustness fix (task #95): commitment_ratio keeps its Infinity in-memory sentinel
 * (computeCommitmentRatio — no finite value preserves both the
 * computeMustHoldMultiplier floor-clamp and the assess/decide `> 4/6/8` thresholds),
 * so the finite swap happens ONLY at the persistence boundary:
 * emit.ts sanitizeZoneAssessmentsForPersistence.
 */

import { describe, expect, it } from 'vitest';
import { sanitizeZoneAssessmentsForPersistence } from '../../src/sim/combat/commander/emit.js';
import { COMMITMENT_RATIO_UNBOUNDED_PERSISTED } from '../../src/sim/combat/commander/zone_detection.js';
import { makeCommanderZone as makeZone } from '../_helpers/commander.js';

describe('sanitizeZoneAssessmentsForPersistence (#95)', () => {
    it('swaps a non-finite commitment_ratio for the documented finite sentinel in the persisted copy', () => {
        const zone = makeZone({ commitment_ratio: Infinity });
        const [sanitized] = sanitizeZoneAssessmentsForPersistence([zone]);
        expect(sanitized.commitment_ratio).toBe(COMMITMENT_RATIO_UNBOUNDED_PERSISTED);
        expect(Number.isFinite(sanitized.commitment_ratio)).toBe(true);
        // In-memory object untouched (consumers already ran on Infinity this turn).
        expect(zone.commitment_ratio).toBe(Infinity);
    });

    it('passes finite zones through by reference (persisted bytes unchanged)', () => {
        const zone = makeZone({ commitment_ratio: 8.9 });
        const [sanitized] = sanitizeZoneAssessmentsForPersistence([zone]);
        expect(sanitized).toBe(zone);
    });
});
