import { describe, expect, it } from 'vitest';

import {
    MAX_AMBITION_POINTS,
    affordableAmbitionPoints,
    clampAmbition,
    getMarginalAmbitionCost,
    getTerritorialAmbitionCost,
} from '../src/sim/negotiation/territorial_ambition.js';

describe('DIMENSION 7 — territorial ambition', () => {
    it('asking for nothing costs nothing', () => {
        // Load-bearing: the historical settlement must stay byte-identical, so a
        // proposal that never mentions ambition may not be charged for it.
        expect(getTerritorialAmbitionCost(0)).toBe(0);
        expect(clampAmbition(0)).toBe(0);
        expect(clampAmbition(-3)).toBe(0);
        expect(clampAmbition(Number.NaN)).toBe(0);
    });

    it('the marginal point gets dearer, so a wide demand is not a scaled narrow one', () => {
        const marginals = [];
        for (let n = 0; n < MAX_AMBITION_POINTS; n += 1) marginals.push(getMarginalAmbitionCost(n));
        for (let i = 1; i < marginals.length; i += 1) {
            expect(marginals[i], `point ${i + 1} must cost more than point ${i}`)
                .toBeGreaterThan(marginals[i - 1]);
        }
        // Superlinear, not merely increasing: five points cost far more than 5x one.
        expect(getTerritorialAmbitionCost(5)).toBeGreaterThan(getTerritorialAmbitionCost(1) * 5);
    });

    it('the cap holds against any input', () => {
        expect(clampAmbition(99)).toBe(MAX_AMBITION_POINTS);
        expect(getTerritorialAmbitionCost(99)).toBe(getTerritorialAmbitionCost(MAX_AMBITION_POINTS));
        expect(getMarginalAmbitionCost(MAX_AMBITION_POINTS)).toBe(0);
        expect(clampAmbition(2.9)).toBe(2); // whole points only
    });

    it('the first point costs about what a sovereign-core competency does', () => {
        // Ambition must be a real alternative to the institutional dimensions, not a
        // token. `sovereign-core` → state is 20 (competency_packages COST_BANDS); the
        // first point of map sits in that neighbourhood so the two genuinely compete
        // for the same capital.
        expect(getTerritorialAmbitionCost(1)).toBeGreaterThan(10);
        expect(getTerritorialAmbitionCost(1)).toBeLessThan(30);
    });

    it('a modest war chest buys one or two points, never the map', () => {
        expect(affordableAmbitionPoints(0)).toBe(0);
        expect(affordableAmbitionPoints(17)).toBe(0); // cannot afford the first point
        expect(affordableAmbitionPoints(18)).toBe(1);
        expect(affordableAmbitionPoints(47)).toBe(1); // first two cost 48
        expect(affordableAmbitionPoints(48)).toBe(2);
    });

    it('the full five is out of reach for any plausible capital', () => {
        // The anti-power-fantasy gate extended to territory: nobody buys 56/44.
        const fullCost = getTerritorialAmbitionCost(MAX_AMBITION_POINTS);
        expect(fullCost).toBeGreaterThan(250);
        expect(affordableAmbitionPoints(200)).toBeLessThan(MAX_AMBITION_POINTS);
    });

    it('affordability is consistent with the cost curve', () => {
        for (let n = 0; n <= MAX_AMBITION_POINTS; n += 1) {
            const cost = getTerritorialAmbitionCost(n);
            expect(affordableAmbitionPoints(cost), `exactly ${n} points' worth`).toBe(n);
            if (n < MAX_AMBITION_POINTS) {
                expect(affordableAmbitionPoints(cost + getMarginalAmbitionCost(n) - 1)).toBe(n);
            }
        }
    });
});
