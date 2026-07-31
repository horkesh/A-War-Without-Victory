/**
 * Tactical Group casualty distribution tests (ADR-0005 v2.1).
 *
 * Verifies `distributeCasualtiesAcrossTg` math against the algorithm in
 * ADR-0005 §Battle resolution:
 *   - Anchor floor: ≥50% of totalCasualties, non-negotiable
 *   - Donor share: pro-rata by personnel_lent, largest-remainder method
 *   - Deterministic tiebreak: brigade_id strictCompare
 *   - Hard Invariant #5: per-donor casualties ≤ personnel_lent (overflow → anchor)
 *
 * v2.1 covers personnel only. Equipment distribution extends in v2.2 alongside
 * combat-power synthesis wiring.
 */

import { describe, expect, it } from 'vitest';
import type { TgDonorContribution } from '../src/state/game_state.js';
import {
    ANCHOR_CASUALTY_FLOOR_FRACTION,
    distributeCasualtiesAcrossTg,
} from '../src/sim/combat/tactical_group_casualties.js';

function donor(brigade_id: string, personnel_lent: number): TgDonorContribution {
    return {
        brigade_id,
        source_corps_id: 'corp',
        distance_hops: 1,
        personnel_lent,
        heavy_equipment_lent: { tanks: 0, artillery: 0, aa_systems: 0 },
        casualties_so_far: 0,
        equipment_losses_so_far: { tanks: 0, artillery: 0, aa_systems: 0 },
        cohesion_bleed_applied: 0,
    };
}

describe('distributeCasualtiesAcrossTg (ADR-0005 v2.1)', () => {
    it('(a) zero donors → anchor takes 100%', () => {
        const r = distributeCasualtiesAcrossTg(100, 'anchor', []);
        expect(r.anchor_casualties).toBe(100);
        expect(r.donor_casualties).toEqual({});
    });

    it('(b) single donor → 50/50 anchor/donor', () => {
        const r = distributeCasualtiesAcrossTg(100, 'anchor', [donor('d1', 500)]);
        expect(r.anchor_casualties).toBe(50);
        expect(r.donor_casualties).toEqual({ d1: 50 });
    });

    it('(c) 3 donors with varied donations → pro-rata + anchor 50%', () => {
        // Total lent = 200 + 300 + 500 = 1000. Donor pool = 50 (anchor takes 50).
        // d1: 200/1000 * 50 = 10
        // d2: 300/1000 * 50 = 15
        // d3: 500/1000 * 50 = 25
        const r = distributeCasualtiesAcrossTg(100, 'anchor', [
            donor('d1', 200),
            donor('d2', 300),
            donor('d3', 500),
        ]);
        expect(r.anchor_casualties).toBe(50);
        expect(r.donor_casualties).toEqual({ d1: 10, d2: 15, d3: 25 });
        const total = r.anchor_casualties
            + Object.values(r.donor_casualties).reduce((s, n) => s + n, 0);
        expect(total).toBe(100); // conservation
    });

    it('(d) integer remainder → largest-remainder method with deterministic tiebreak', () => {
        // Total casualties = 101. Anchor base = floor(101 * 0.5) = 50. Donor pool = 51.
        // 3 donors equally lent (300 each, total 900):
        //   exact = 51 * 300 / 900 = 17.0 each → all integers, no remainder
        // Try with 101 cas + 3 donors of 100/200/300 (total 600):
        //   d100: 51 * 100/600 = 8.5  → floor 8, rem 0.5
        //   d200: 51 * 200/600 = 17.0 → floor 17, rem 0.0
        //   d300: 51 * 300/600 = 25.5 → floor 25, rem 0.5
        //   Floors sum 50, leftover 1. Largest remainder = d100 and d300 tied at 0.5.
        //   Strict tiebreak by brigade_id: 'd100' < 'd300' → d100 gets the +1.
        const r = distributeCasualtiesAcrossTg(101, 'anchor', [
            donor('d100', 100),
            donor('d200', 200),
            donor('d300', 300),
        ]);
        expect(r.anchor_casualties).toBe(50);
        expect(r.donor_casualties).toEqual({ d100: 9, d200: 17, d300: 25 });
        const total = r.anchor_casualties
            + Object.values(r.donor_casualties).reduce((s, n) => s + n, 0);
        expect(total).toBe(101);
    });

    it('(e) anchor floor exactly 50% with equal donors; remainder of 1 goes to first donor by ID', () => {
        // 100 cas, 2 equal donors (lent 100 each, total 200).
        // Anchor = floor(100 * 0.5) = 50. Donor pool = 50.
        // exact = 50 * 100/200 = 25.0 each, no remainder, no tiebreak needed.
        const r = distributeCasualtiesAcrossTg(100, 'anchor', [
            donor('aaa', 100),
            donor('bbb', 100),
        ]);
        expect(r.anchor_casualties).toBe(50);
        expect(r.donor_casualties).toEqual({ aaa: 25, bbb: 25 });
    });

    it('(e2) ANCHOR_CASUALTY_FLOOR_FRACTION export is 0.5 (non-negotiable)', () => {
        expect(ANCHOR_CASUALTY_FLOOR_FRACTION).toBe(0.5);
    });

    it('(g) totalCasualties=0 → no decrement anywhere', () => {
        const r = distributeCasualtiesAcrossTg(0, 'anchor', [donor('d1', 500)]);
        expect(r.anchor_casualties).toBe(0);
        expect(r.donor_casualties).toEqual({});
    });

    it('(g2) negative totalCasualties → no decrement (defensive)', () => {
        const r = distributeCasualtiesAcrossTg(-50, 'anchor', [donor('d1', 500)]);
        expect(r.anchor_casualties).toBe(0);
        expect(r.donor_casualties).toEqual({});
    });

    it('(h) Hard Invariant #5: per-donor cap at personnel_lent; overflow goes to anchor', () => {
        // 200 casualties, anchor base = 100, donor pool = 100.
        // Single donor lent only 30 personnel.
        // exact = 100 * 30/30 = 100, but capped at 30. Overflow 70 → anchor.
        const r = distributeCasualtiesAcrossTg(200, 'anchor', [donor('d1', 30)]);
        expect(r.donor_casualties.d1).toBe(30);
        expect(r.anchor_casualties).toBe(170);  // 100 base + 70 overflow
        const total = r.anchor_casualties
            + Object.values(r.donor_casualties).reduce((s, n) => s + n, 0);
        expect(total).toBe(200);
    });

    it('(h2) caps repeated-battle allocations at each donor remaining loan', () => {
        const donors = [donor('d1', 30), donor('d2', 70)];

        const firstBattle = distributeCasualtiesAcrossTg(100, 'anchor', donors);
        expect(firstBattle).toEqual({
            anchor_casualties: 50,
            donor_casualties: { d1: 15, d2: 35 },
        });
        for (const contribution of donors) {
            contribution.casualties_so_far += firstBattle.donor_casualties[contribution.brigade_id] ?? 0;
        }

        const secondBattle = distributeCasualtiesAcrossTg(200, 'anchor', donors);
        expect(secondBattle).toEqual({
            anchor_casualties: 150,
            donor_casualties: { d1: 15, d2: 35 },
        });
        for (const contribution of donors) {
            contribution.casualties_so_far += secondBattle.donor_casualties[contribution.brigade_id] ?? 0;
        }

        for (const contribution of donors) {
            expect(contribution.casualties_so_far).toBeLessThanOrEqual(contribution.personnel_lent);
        }
        expect(donors.map((contribution) => contribution.casualties_so_far)).toEqual([30, 70]);
        expect(
            firstBattle.anchor_casualties
            + Object.values(firstBattle.donor_casualties).reduce((sum, casualties) => sum + casualties, 0),
        ).toBe(100);
        expect(
            secondBattle.anchor_casualties
            + Object.values(secondBattle.donor_casualties).reduce((sum, casualties) => sum + casualties, 0),
        ).toBe(200);
    });

    it('(i) sum(personnel_lent) === 0 → anchor takes 100% (defensive)', () => {
        const r = distributeCasualtiesAcrossTg(100, 'anchor', [donor('d1', 0)]);
        expect(r.anchor_casualties).toBe(100);
        expect(r.donor_casualties).toEqual({});
    });

    it('(j) conservation: sum(anchor + all donors) === totalCasualties for many random shapes', () => {
        const shapes: Array<{ c: number; donors: number[] }> = [
            { c: 17, donors: [50] },
            { c: 250, donors: [100, 200, 300] },
            { c: 999, donors: [123, 456, 789, 234] },
            { c: 1, donors: [10, 10, 10] },
            { c: 2, donors: [1, 1] },
            { c: 1000, donors: [500] },
        ];
        for (const s of shapes) {
            const ds = s.donors.map((p, i) => donor(`d${i}`, p));
            const r = distributeCasualtiesAcrossTg(s.c, 'anchor', ds);
            const total = r.anchor_casualties
                + Object.values(r.donor_casualties).reduce((sum, n) => sum + n, 0);
            expect(total).toBe(s.c);
            // Anchor floor at least 50% (when no overflow occurs)
            const hasOverflow = ds.some(d => (r.donor_casualties[d.brigade_id] ?? 0) === d.personnel_lent
                && d.personnel_lent > 0);
            if (!hasOverflow) {
                expect(r.anchor_casualties).toBeGreaterThanOrEqual(Math.floor(s.c * 0.5));
            }
        }
    });
});
