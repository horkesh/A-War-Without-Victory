/**
 * Patron leverage at Dayton (owner ruling 2026-11-07, RD-PATRON-OVERRIDE): an area budget
 * that grows with override authority, protected ground that is never forced.
 */
import { describe, expect, it } from 'vitest';

import type { TerritorialPackage } from '../src/state/negotiation_types.js';
import { getTerritorialPackageById } from '../src/sim/negotiation/territorial_packages.js';
import { isProtectedFor, patronAreaBudgetPct, selectPatronForced } from '../src/sim/negotiation/patron_leverage.js';

const front = (id: string, mun: string, area: number, holder = 'RS'): TerritorialPackage => ({
    id, name: id, description: '', default_holder: holder, capital_cost_to_demand: 5, capital_cost_to_concede: 3,
    osid_keywords: [], osids: [`op:${mun}:x`], claimant: 'RBiH', area_pct: area, municipality: mun,
});

describe('patron area budget', () => {
    it('is zero below 75 and grows 0.15 points of BiH per point of override, capped at 4.25', () => {
        expect(patronAreaBudgetPct(74.9)).toBe(0);
        expect(patronAreaBudgetPct(75)).toBeCloseTo(0.5);
        expect(patronAreaBudgetPct(78.5)).toBeCloseTo(1.025);
        expect(patronAreaBudgetPct(90)).toBeCloseTo(2.75);
        expect(patronAreaBudgetPct(100)).toBeCloseTo(4.25);
    });
});

describe('protected ground', () => {
    it('RS heartland and the Posavina corridor; Mostar and western Herzegovina for HRHB', () => {
        expect(isProtectedFor(front('a', 'prijedor', 0.3), 'RS')).toBe(true);
        expect(isProtectedFor(front('b', 'banja_luka', 0.3), 'RS')).toBe(true);
        expect(isProtectedFor(front('c', 'sipovo', 0.3), 'RS')).toBe(false);
        expect(isProtectedFor(getTerritorialPackageById('posavina_pocket')!, 'RS')).toBe(true);
        expect(isProtectedFor(getTerritorialPackageById('brcko_district')!, 'RS')).toBe(true);
        expect(isProtectedFor(getTerritorialPackageById('gorazde_corridor')!, 'RS')).toBe(false);
        expect(isProtectedFor(getTerritorialPackageById('sarajevo_suburbs')!, 'RS')).toBe(false);
        expect(isProtectedFor(getTerritorialPackageById('mostar')!, 'HRHB')).toBe(true);
        expect(isProtectedFor(front('d', 'prijedor', 0.3), 'HRHB')).toBe(false);
    });
});

describe('selectPatronForced', () => {
    const never = () => false;
    it('forces the smallest refused pieces first while the budget lasts', () => {
        const refused = [front('big', 'sipovo', 0.8), front('mid', 'kalinovik', 0.4), front('small', 'nevesinje', 0.3)];
        expect(selectPatronForced(refused, 'RS', 78.5, never)).toEqual(['mid', 'small']); // 0.3 + 0.4 ≤ 1.025
        expect(selectPatronForced(refused, 'RS', 74, never)).toEqual([]);
    });

    it('skips protected and post-decline ground', () => {
        const refused = [front('prijedor', 'prijedor', 0.2), front('late', 'kalinovik', 0.2), front('ok', 'sipovo', 0.2)];
        expect(selectPatronForced(refused, 'RS', 95, (p) => p.id === 'late')).toEqual(['ok']);
    });
});
