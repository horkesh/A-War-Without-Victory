import { describe, it, expect } from 'vitest';
import {
    getIvpComponentContributions,
    IVP_WEIGHT_SARAJEVO_SIEGE,
    IVP_WEIGHT_ENCLAVE_HUMANITARIAN,
    IVP_WEIGHT_ATROCITY_VISIBILITY,
    IVP_WEIGHT_NEGOTIATION_MOMENTUM,
    formatIvpConsequenceLabel,
    ivpComponentLabel,
    sortIvpConsequenceIds,
} from '../src/state/patron_pressure.js';
import type { InternationalVisibilityPressure } from '../src/state/game_state.js';

describe('getIvpComponentContributions', () => {
    it('returns four rows in fixed order with correct weights', () => {
        const ivp: InternationalVisibilityPressure = {
            sarajevo_siege_visibility: 0.5,
            enclave_humanitarian_pressure: 0.4,
            atrocity_visibility: 0.3,
            negotiation_momentum: 0.2,
            composite_ivp: 0.41,
            last_major_shift: null,
        };
        const rows = getIvpComponentContributions(ivp);
        expect(rows).toHaveLength(4);
        expect(rows.map((r) => r.key)).toEqual([
            'sarajevo_siege_visibility',
            'enclave_humanitarian_pressure',
            'atrocity_visibility',
            'negotiation_momentum',
        ]);
        expect(rows[0].weight).toBe(IVP_WEIGHT_SARAJEVO_SIEGE);
        expect(rows[1].weight).toBe(IVP_WEIGHT_ENCLAVE_HUMANITARIAN);
        expect(rows[2].weight).toBe(IVP_WEIGHT_ATROCITY_VISIBILITY);
        expect(rows[3].weight).toBe(IVP_WEIGHT_NEGOTIATION_MOMENTUM);
        expect(rows[0].contribution).toBeCloseTo(0.5 * IVP_WEIGHT_SARAJEVO_SIEGE);
    });

    it('returns empty array when ivp undefined', () => {
        expect(getIvpComponentContributions(undefined)).toEqual([]);
    });
});

describe('ivpComponentLabel', () => {
    it('returns stable player-facing strings', () => {
        expect(ivpComponentLabel('negotiation_momentum')).toBe('Negotiation momentum');
        expect(ivpComponentLabel('atrocity_visibility')).toBe('Displacement visibility');
    });
});

describe('sortIvpConsequenceIds', () => {
    it('orders by IVP_CONSEQUENCE_ORDER then localeCompare', () => {
        expect(sortIvpConsequenceIds(['nato_intervention_threat', 'drina_blockade'])).toEqual([
            'drina_blockade',
            'nato_intervention_threat',
        ]);
    });
});

describe('formatIvpConsequenceLabel', () => {
    it('maps known ids to readable labels', () => {
        expect(formatIvpConsequenceLabel('drina_blockade')).toContain('Drina');
        expect(formatIvpConsequenceLabel('international_sanctions')).toContain('sanctions');
        expect(formatIvpConsequenceLabel('nato_intervention_threat')).toContain('NATO');
    });
});
