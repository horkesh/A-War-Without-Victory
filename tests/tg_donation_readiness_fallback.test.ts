/**
 * Phase 1.5 donor-readiness fallback (ADR-0005 v2.2c #3 gate, operations-expert +
 * sector-expert, 2026-05-30).
 *
 * The donation-readiness gate (`donationReadinessBlocksAxis`) must NEVER cancel an
 * otherwise-valid offensive when the anchoring corps simply has NO eligible donors to
 * muster — an isolated / encircled, donor-poor corps (e.g. the ARBiH 5th Corps in the
 * Bihać pocket) must degrade to legacy lone-anchor behaviour rather than being blocked
 * with `insufficient_donation`. The gate's real intent — refuse an under-committed
 * *multi-donor* TG — is preserved: it still fires when donors exist but pledge < 60%.
 */

import { describe, expect, it } from 'vitest';
import { donationReadinessBlocksAxis } from '../src/sim/combat/sector_offensive_launch_helpers.js';
import {
    DONATION_READINESS_FRACTION,
    DONATION_READINESS_FRACTION_HRHB,
} from '../src/sim/combat/tactical_group_config.js';

describe('Phase 1.5 donor-readiness fallback', () => {
    const ANCHOR_PERSONNEL = 2000;
    const THRESHOLD = DONATION_READINESS_FRACTION * ANCHOR_PERSONNEL; // 0.6 * 2000 = 1200

    it('zero eligible donors → does NOT block (lone-anchor fallback)', () => {
        // Donor-poor / isolated corps: selectDonors returned []. Pre-fix this blocked
        // the op (0 < 0.6 * anchor → insufficient_donation), cancelling a valid
        // anchor-only relief/defensive op. The fallback must let it proceed.
        expect(donationReadinessBlocksAxis([], ANCHOR_PERSONNEL)).toBe(false);
    });

    it('zero eligible donors with zero-personnel anchor → still does NOT block', () => {
        // Edge: empty donor pool short-circuits before any arithmetic. Even a degenerate
        // anchor (0 personnel) degrades to lone-anchor rather than blocking.
        expect(donationReadinessBlocksAxis([], 0)).toBe(false);
    });

    it('donors exist but pledge < 60% of anchor → BLOCKS (gate intent preserved)', () => {
        // Under-committed multi-donor TG: a lone anchor wearing a TG costume. Block.
        const donors = [{ personnel_lent: 400 }, { personnel_lent: 300 }]; // 700 < 1200
        expect(donationReadinessBlocksAxis(donors, ANCHOR_PERSONNEL)).toBe(true);
    });

    it('donors exist and pledge >= 60% of anchor → does NOT block (TG launches)', () => {
        const donors = [{ personnel_lent: 700 }, { personnel_lent: 600 }]; // 1300 >= 1200
        expect(donationReadinessBlocksAxis(donors, ANCHOR_PERSONNEL)).toBe(false);
    });

    it('donors pledge exactly at the 60% threshold → does NOT block (>= boundary)', () => {
        const donors = [{ personnel_lent: THRESHOLD }]; // 1200, not < 1200
        expect(donationReadinessBlocksAxis(donors, ANCHOR_PERSONNEL)).toBe(false);
    });

    it('single tiny donor below threshold → BLOCKS (one donor is still "donors exist")', () => {
        // A single sub-threshold donor is the canonical under-committed TG; the
        // length>0 branch must keep firing for it (not just multi-donor pools).
        const donors = [{ personnel_lent: 1 }]; // 1 < 1200
        expect(donationReadinessBlocksAxis(donors, ANCHOR_PERSONNEL)).toBe(true);
    });
});

describe('Phase 1.6 HVO Mistral-2 westward-reach lever', () => {
    const ANCHOR_PERSONNEL = 2000;
    // The Mistral-2 failure mode: a few far HVO donors clear selection but distance-falloff
    // trims their pledge to ~0.30–0.45× the anchor — above the relaxed HRHB floor (0.25)
    // but below the standard 0.60 floor. The lever must let HRHB through while still
    // blocking the same under-committed pool for any non-HRHB faction.
    const farWestwardDonors = [{ personnel_lent: 500 }, { personnel_lent: 400 }]; // 900 = 0.45×anchor

    it('HRHB-specific fraction is strictly lower than the default (a relaxation)', () => {
        expect(DONATION_READINESS_FRACTION_HRHB).toBeLessThan(DONATION_READINESS_FRACTION);
    });

    it('HRHB westward axis: pledge between HRHB floor and default floor → does NOT block', () => {
        // 900 >= 0.25*2000 (500) → HRHB passes; 900 < 0.6*2000 (1200) → default would block.
        expect(donationReadinessBlocksAxis(farWestwardDonors, ANCHOR_PERSONNEL, 'HRHB')).toBe(false);
    });

    it('same under-committed pool blocks for RBiH / RS (lever is HRHB-only)', () => {
        expect(donationReadinessBlocksAxis(farWestwardDonors, ANCHOR_PERSONNEL, 'RBiH')).toBe(true);
        expect(donationReadinessBlocksAxis(farWestwardDonors, ANCHOR_PERSONNEL, 'RS')).toBe(true);
    });

    it('omitted faction falls back to the standard (default) fraction', () => {
        // Backward-compat: undefined faction must behave exactly as the pre-1.6 signature.
        expect(donationReadinessBlocksAxis(farWestwardDonors, ANCHOR_PERSONNEL)).toBe(true);
    });

    it('HRHB still blocks a pool below even the relaxed floor', () => {
        // The relaxation lowers the bar; it does not remove it. 400 < 0.25*2000 (500) → block.
        const tinyDonors = [{ personnel_lent: 400 }];
        expect(donationReadinessBlocksAxis(tinyDonors, ANCHOR_PERSONNEL, 'HRHB')).toBe(true);
    });

    it('HRHB zero-donor pool still degrades to lone-anchor (fallback unchanged)', () => {
        expect(donationReadinessBlocksAxis([], ANCHOR_PERSONNEL, 'HRHB')).toBe(false);
    });
});
