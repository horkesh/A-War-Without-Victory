import { describe, it, expect } from 'vitest';
import { autoProposeBrigades, estimateMarchTurns } from '../../src/ui/map/components/ops_modal/autoPropose';
import type { FormationView } from '../../src/ui/map/data/types';

function makeBrigade(id: string, personnel: number, osid: string, opts?: Partial<FormationView>): FormationView {
    return {
        id,
        faction: 'RBiH',
        name: id,
        kind: 'brigade',
        readiness: 'good',
        cohesion: 70,
        fatigue: 5,
        status: 'active',
        createdTurn: 0,
        tags: [],
        personnel,
        location_osid: osid,
        composition: { infantry: personnel, tanks: 0, artillery: 0, aa_systems: 0 },
        ...opts,
    } as FormationView;
}

function makeLookup(): Map<string, [number, number]> {
    return new Map([
        ['osid_a', [17.5, 44.0]],
        ['osid_b', [17.6, 44.1]],
        ['osid_c', [18.0, 44.5]],
        ['obj_1', [17.7, 44.2]],
        ['obj_2', [18.1, 44.6]],
    ]);
}

describe('autoProposeBrigades', () => {
    it('returns empty for no brigades', () => {
        expect(autoProposeBrigades([], ['obj_1'], makeLookup(), 12)).toEqual([]);
    });

    it('returns empty for no objectives', () => {
        const brigades = [makeBrigade('b1', 1500, 'osid_a')];
        expect(autoProposeBrigades(brigades, [], makeLookup(), 12)).toEqual([]);
    });

    it('excludes combat ineffective brigades', () => {
        const brigades = [
            makeBrigade('b1', 300, 'osid_a'),  // < 400
            makeBrigade('b2', 1500, 'osid_a'),
        ];
        const result = autoProposeBrigades(brigades, ['obj_1'], makeLookup(), 12);
        expect(result).toHaveLength(1);
        expect(result[0].brigadeId).toBe('b2');
    });

    it('excludes disrupted brigades', () => {
        const brigades = [
            makeBrigade('b1', 1500, 'osid_a', { disrupted_turns: 3 } as Partial<FormationView>),
            makeBrigade('b2', 1500, 'osid_a'),
        ];
        const result = autoProposeBrigades(brigades, ['obj_1'], makeLookup(), 12);
        expect(result).toHaveLength(1);
        expect(result[0].brigadeId).toBe('b2');
    });

    it('caps at maxBrigades', () => {
        const brigades = Array.from({ length: 15 }, (_, i) =>
            makeBrigade(`b${i}`, 2000, `osid_a`)
        );
        const result = autoProposeBrigades(brigades, ['obj_1'], makeLookup(), 12);
        expect(result).toHaveLength(12);
    });

    it('returns all when fewer than max', () => {
        const brigades = Array.from({ length: 5 }, (_, i) =>
            makeBrigade(`b${i}`, 2000, `osid_a`)
        );
        const result = autoProposeBrigades(brigades, ['obj_1'], makeLookup(), 12);
        expect(result).toHaveLength(5);
    });

    it('sorts by score descending', () => {
        const brigades = [
            makeBrigade('weak', 500, 'osid_c'),   // far, weak
            makeBrigade('strong', 3000, 'osid_a'), // close, strong
        ];
        const result = autoProposeBrigades(brigades, ['obj_1'], makeLookup(), 12);
        expect(result[0].brigadeId).toBe('strong');
    });
});

describe('estimateMarchTurns', () => {
    it('returns 0 for brigade at staging OSID', () => {
        const lookup = new Map([['osid_a', [17.5, 44.0] as [number, number]]]);
        expect(estimateMarchTurns('osid_a', 'osid_a', lookup)).toBe(0);
    });

    it('returns positive turns for distant brigade', () => {
        const lookup = new Map([
            ['osid_a', [17.5, 44.0] as [number, number]],
            ['osid_b', [18.0, 44.5] as [number, number]],
        ]);
        expect(estimateMarchTurns('osid_a', 'osid_b', lookup)).toBeGreaterThan(0);
    });

    it('returns 99 for unknown OSID', () => {
        const lookup = new Map([['osid_a', [17.5, 44.0] as [number, number]]]);
        expect(estimateMarchTurns('osid_a', 'unknown', lookup)).toBe(99);
    });
});
