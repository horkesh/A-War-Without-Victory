import { describe, expect, it } from 'vitest';
import { aggregateEffectiveness, computeBrigadeEffectiveness } from '../../src/ui/map/utils/combatEffectiveness.js';
import type { FormationView } from '../../src/ui/map/data/types.js';

function brigade(overrides: Partial<FormationView> = {}): FormationView {
    return {
        id: 'brigade_1',
        name: '1st Brigade',
        kind: 'brigade',
        faction: 'RBiH',
        status: 'active',
        readiness: 'ready',
        personnel: 1200,
        fatigue: 6,
        cohesion: 76,
        morale: 60,
        officer_quality: 0.6,
        createdTurn: 0,
        tags: [],
        ...overrides,
    } as FormationView;
}

describe('combat effectiveness sparse data', () => {
    it('keeps complete reported brigades gradable', () => {
        const aggregate = aggregateEffectiveness([brigade()]);

        expect(aggregate.grade).not.toBe('UNREPORTED');
        expect(aggregate.incompleteCount).toBe(0);
        expect(aggregate.missingFields).toEqual([]);
    });

    it('marks missing grade-critical fields unreported instead of favorable', () => {
        const sparse = brigade({ fatigue: undefined, cohesion: undefined, morale: undefined, officer_quality: undefined });
        const breakdown = computeBrigadeEffectiveness(sparse);
        const aggregate = aggregateEffectiveness([sparse]);

        expect(breakdown.missingFields).toEqual(['fatigue', 'cohesion', 'morale', 'officer_quality']);
        expect(aggregate.grade).toBe('UNREPORTED');
        expect(aggregate.incompleteCount).toBe(1);
        expect(aggregate.missingFields).toEqual(['cohesion', 'fatigue', 'morale', 'officer_quality']);
    });
});
