/**
 * Donation readiness — PREDICATE-LEVEL contract.
 *
 * HISTORY (preserved; the assertions below have changed, the history has not).
 *
 *   Phase 1.5 (operations-expert + sector-expert, 2026-05-30) introduced a fallback so the
 *   ADR-0005 v2.2c #3 donation gate could never cancel an otherwise-valid offensive when
 *   the anchoring corps simply had NO eligible donors to muster. An isolated, donor-poor
 *   corps — the ARBiH 5th Corps in the Bihać pocket, with no adjacent donor corps and
 *   candidates blocked by distance / cohesion / residual-floor — had its anchor-only
 *   relief and defensive ops gated out, which dropped the Bihać enclave RBiH→RS wholesale
 *   (measured 188w 615→569). This file pinned that fallback.
 *
 *   Phase 1.6 added a relaxed HRHB readiness fraction for the HVO Mistral-2 westward axes,
 *   where BFS distance-falloff trimmed the few eligible local donors below the 60% floor
 *   and the gate cancelled an axis the flag-off engine prosecuted.
 *
 * ENGINE-HEALTH B3 (2026-09-19) — WHAT CHANGED, AND WHY THIS FILE WAS REWRITTEN.
 *
 *   The Phase-1.5 reasoning — *with zero donors no TG would form anyway, so blocking
 *   degrades a valid lone-anchor op into a cancellation* — is correct, and it applies
 *   verbatim to a pool that exists but is too weak. It had been applied at exactly one
 *   boundary (`donors.length === 0`) instead of to the whole predicate, which left the
 *   gate NON-MONOTONIC: an empty pool passed, a pool one man above empty blocked the
 *   operation. This file previously asserted that non-monotonicity as intended behaviour
 *   ("donors exist but pledge < 60% → BLOCKS (gate intent preserved)"). It was wrong, and
 *   those assertions are gone.
 *
 *   `donationReadinessBlocksAxis` is replaced by `tgDonationMeetsReadiness` in
 *   `tactical_group_selection.ts`: it answers "may the Tactical Group AUGMENTATION form?",
 *   never "may this axis attack?". Inadequate support declines the augmentation; the
 *   operation continues under ordinary opening-attack readiness.
 *
 * The end-to-end lifecycle contract (executability monotonicity, no donor costs on a
 * decline, the HRHB characterisation) lives in
 * `tests/tg_donation_augmentation_monotonic.test.ts`. This file keeps the predicate-level
 * arithmetic and the source-shape guards on the zero-donor fallback.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import {
    tgDonationMeetsReadiness,
    tgDonationReadinessFraction,
    totalPledgedPersonnel,
} from '../src/sim/combat/tactical_group_selection.js';
import {
    DONATION_READINESS_FRACTION,
    DONATION_READINESS_FRACTION_HRHB,
} from '../src/sim/combat/tactical_group_config.js';

describe('tgDonationMeetsReadiness — TG augmentation viability', () => {
    const ANCHOR_PERSONNEL = 2000;
    const THRESHOLD = DONATION_READINESS_FRACTION * ANCHOR_PERSONNEL; // 0.6 * 2000 = 1200

    it('zero eligible donors → readiness not met (no TG; the anchor fights alone)', () => {
        expect(tgDonationMeetsReadiness([], ANCHOR_PERSONNEL)).toBe(false);
    });

    it('zero eligible donors with a zero-personnel anchor → still no TG', () => {
        // Edge: the empty pool short-circuits before any arithmetic, so a degenerate
        // anchor cannot produce a vacuously-satisfied 0 >= 0 readiness.
        expect(tgDonationMeetsReadiness([], 0)).toBe(false);
    });

    it('donors exist but pledge < 60% of anchor → readiness not met (augmentation declined)', () => {
        // Under-committed pool: a lone anchor wearing a TG costume. No TG forms.
        // Pre-B3 this ALSO cancelled the operation; it no longer does — see the
        // lifecycle test file.
        const donors = [{ personnel_lent: 400 }, { personnel_lent: 300 }]; // 700 < 1200
        expect(tgDonationMeetsReadiness(donors, ANCHOR_PERSONNEL)).toBe(false);
    });

    it('donors exist and pledge >= 60% of anchor → readiness met (TG forms)', () => {
        const donors = [{ personnel_lent: 700 }, { personnel_lent: 600 }]; // 1300 >= 1200
        expect(tgDonationMeetsReadiness(donors, ANCHOR_PERSONNEL)).toBe(true);
    });

    it('pledge exactly at the 60% threshold → readiness met (>= boundary)', () => {
        const donors = [{ personnel_lent: THRESHOLD }]; // 1200, not < 1200
        expect(tgDonationMeetsReadiness(donors, ANCHOR_PERSONNEL)).toBe(true);
    });

    it('a single tiny donor is still an under-committed pool', () => {
        expect(tgDonationMeetsReadiness([{ personnel_lent: 1 }], ANCHOR_PERSONNEL)).toBe(false);
    });

    it('totalPledgedPersonnel sums the pool', () => {
        expect(totalPledgedPersonnel([])).toBe(0);
        expect(totalPledgedPersonnel([{ personnel_lent: 400 }, { personnel_lent: 300 }])).toBe(700);
    });

    it('the predicate is monotonic in pledged personnel', () => {
        // Readiness may only ever improve as the pledge grows. This is the arithmetic
        // half of the B3 property; the lifecycle half (executability) is pinned in
        // tests/tg_donation_augmentation_monotonic.test.ts.
        let previous = false;
        for (const pledge of [0, 1, 400, 700, 1199, 1200, 1201, 5000]) {
            const met = tgDonationMeetsReadiness([{ personnel_lent: pledge }], ANCHOR_PERSONNEL);
            if (previous) expect(met).toBe(true); // never regresses
            previous = met;
        }
        expect(previous).toBe(true);
    });

    it('both formation exits are guarded by the single readiness predicate', () => {
        // B3 unified the two exits: the zero-donor fallback and the weak-donor decline take
        // the SAME branch, because `tgDonationMeetsReadiness` is false for both. Guard the
        // shape so a refactor cannot reintroduce a second, divergent rule — that divergence
        // between the launch gate and the formation site is what B3 removed. (The zero-donor
        // behaviour itself is pinned behaviourally in
        // tests/tg_donation_augmentation_monotonic.test.ts, case A.)
        const sectorSource = readFileSync(resolve('src/sim/combat/sector_offensive.ts'), 'utf8');
        const preparationSource = readFileSync(resolve('src/sim/combat/operation_preparation.ts'), 'utf8');
        const combined = `${sectorSource}\n${preparationSource}`;

        expect(combined).not.toContain('EVERY offensive forms a');
        expect(combined).toContain('Every donor-eligible offensive attempts TG formation');
        expect(combined).toContain('zero-donor fallback remains an ordinary operation');
        expect(preparationSource).toContain("if (policy === 'none') return;");
        // One guarded exit per formation branch (multi-axis `continue`, single-axis `return`).
        expect(
            preparationSource.match(/if \(!tgDonationMeetsReadiness\(donors, anchorPersonnel, anchorFaction\)\) \{/g),
        ).toHaveLength(2);
        // …and every decline is recorded, never silent.
        expect(preparationSource.match(/recordTgFormationDecline\(/g)).toHaveLength(3); // 1 def + 2 calls
    });

    it('B3: a declined augmentation is carried into the AAR, unguarded by any blocker', () => {
        // The decline record lives on the live operation and dies with it. Measured on run
        // n425: four fewer TGs formed and not one decline survived to final_save.json. The
        // AAR carryover is what puts it in an artifact a reader will actually open. It must
        // NOT be guarded on a launch_blocker the way launch_blocker_detail is — a declined
        // augmentation is not a blocker, the operation went on to fight.
        const aarSource = readFileSync(resolve('src/sim/combat/operation_aar.ts'), 'utf8');
        expect(aarSource).toContain('tg_formation_decline?: TgFormationDeclineDetail');
        expect(aarSource).toMatch(
            /if \(axis\.tg_formation_decline\) \{\s*\n\s*axisSummary\.tg_formation_decline = axis\.tg_formation_decline;/,
        );
        expect(aarSource).not.toMatch(/axis\.tg_formation_decline && axis\.launch_blocker/);
    });

    it('B3: the launch gate no longer carries a donation check', () => {
        // The readiness rule has ONE owner. If a donation check reappears in the
        // opening-attack path, the non-monotonicity is back. Asserted against CODE
        // shapes, not prose — the retirement note in that file names the old symbol on
        // purpose, so a bare substring check would be self-defeating.
        const launchSource = readFileSync(
            resolve('src/sim/combat/sector_offensive_launch_helpers.ts'), 'utf8',
        );
        expect(launchSource).not.toMatch(/export function donationReadinessBlocksAxis/);
        expect(launchSource).not.toMatch(/\btgDonationMeetsReadiness\s*\(/);
        expect(launchSource).not.toMatch(/\bselectDonors\s*\(/);
        expect(launchSource).not.toMatch(/launch_blocker\s*=\s*'insufficient_donation'/);
        expect(launchSource).not.toMatch(/blocker:\s*'insufficient_donation'/);
    });
});

describe('Phase 1.6 HRHB readiness band — formation quality only', () => {
    const ANCHOR_PERSONNEL = 2000;
    // The Mistral-2 shape: a few far HVO donors clear selection but distance-falloff trims
    // their pledge to ~0.30–0.45x the anchor — above the relaxed HRHB floor (0.25), below
    // the standard 0.60 floor.
    const farWestwardDonors = [{ personnel_lent: 500 }, { personnel_lent: 400 }]; // 900 = 0.45x

    it('the HRHB fraction is strictly lower than the default (a relaxation)', () => {
        expect(DONATION_READINESS_FRACTION_HRHB).toBeLessThan(DONATION_READINESS_FRACTION);
    });

    it('tgDonationReadinessFraction selects the band by faction', () => {
        expect(tgDonationReadinessFraction('HRHB')).toBe(DONATION_READINESS_FRACTION_HRHB);
        expect(tgDonationReadinessFraction('RS')).toBe(DONATION_READINESS_FRACTION);
        expect(tgDonationReadinessFraction('RBiH')).toBe(DONATION_READINESS_FRACTION);
        expect(tgDonationReadinessFraction(undefined)).toBe(DONATION_READINESS_FRACTION);
    });

    it('HRHB forms a TG on a midband pledge where other factions do not', () => {
        // B3: this is now a difference in whether the AUGMENTATION forms. Under the old
        // gate the same comparison decided whether the OPERATION was cancelled.
        expect(tgDonationMeetsReadiness(farWestwardDonors, ANCHOR_PERSONNEL, 'HRHB')).toBe(true);
        expect(tgDonationMeetsReadiness(farWestwardDonors, ANCHOR_PERSONNEL, 'RBiH')).toBe(false);
        expect(tgDonationMeetsReadiness(farWestwardDonors, ANCHOR_PERSONNEL, 'RS')).toBe(false);
    });

    it('omitted faction falls back to the standard fraction', () => {
        expect(tgDonationMeetsReadiness(farWestwardDonors, ANCHOR_PERSONNEL)).toBe(false);
    });

    it('the relaxation lowers the bar, it does not remove it', () => {
        const tinyDonors = [{ personnel_lent: 400 }]; // 400 < 0.25 * 2000 (500)
        expect(tgDonationMeetsReadiness(tinyDonors, ANCHOR_PERSONNEL, 'HRHB')).toBe(false);
    });

    it('an HRHB zero-donor pool forms no TG either', () => {
        expect(tgDonationMeetsReadiness([], ANCHOR_PERSONNEL, 'HRHB')).toBe(false);
    });
});
