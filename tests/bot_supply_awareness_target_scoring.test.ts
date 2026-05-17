import { describe, expect, it } from 'vitest';
import type { SupplyStateByOsidReport } from '../src/state/supply_state_derivation.js';
import {
    computeEnemySupplyTargetScoreMultiplier,
    computeOwnSupplyDefensePriorityMultiplier,
} from '../src/sim/combat/bot_corps_directives.js';

const supplyReport: SupplyStateByOsidReport = {
    schema: 1,
    turn: 12,
    factions: [
        {
            faction_id: 'RBiH',
            by_osid: [
                { osid: 'op:alpha:critical', state: 'critical' },
                { osid: 'op:alpha:strained', state: 'strained' },
                { osid: 'op:alpha:adequate', state: 'adequate' },
            ],
        },
        {
            faction_id: 'RS',
            by_osid: [
                { osid: 'op:beta:critical', state: 'critical' },
                { osid: 'op:beta:adequate', state: 'adequate' },
            ],
        },
    ],
};

describe('bot supply awareness target and defense scoring', () => {
    it('scores otherwise-identical enemy targets higher when enemy supply is critical', () => {
        const adequate = computeEnemySupplyTargetScoreMultiplier(supplyReport, 'RBiH', 'op:alpha:adequate');
        const strained = computeEnemySupplyTargetScoreMultiplier(supplyReport, 'RBiH', 'op:alpha:strained');
        const critical = computeEnemySupplyTargetScoreMultiplier(supplyReport, 'RBiH', 'op:alpha:critical');

        expect(adequate).toBe(1);
        expect(strained).toBeGreaterThan(adequate);
        expect(critical).toBeGreaterThan(strained);
        expect(critical).toBeLessThanOrEqual(1.1);
    });

    it('weights own defense priority higher when home OSID supply is critical', () => {
        const adequate = computeOwnSupplyDefensePriorityMultiplier(supplyReport, 'RS', 'op:beta:adequate');
        const critical = computeOwnSupplyDefensePriorityMultiplier(supplyReport, 'RS', 'op:beta:critical');

        expect(adequate).toBe(1);
        expect(critical).toBeGreaterThan(adequate);
        expect(critical).toBeLessThanOrEqual(1.15);
    });
});
