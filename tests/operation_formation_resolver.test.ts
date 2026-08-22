import { describe, expect, it } from 'vitest';
import type { FormationState } from '../src/state/game_state.js';
import { resolveOperationFormation } from '../src/sim/combat/operation_formation_resolver.js';

function formation(id: string, tags: string[] = []): FormationState {
    return {
        id,
        name: id,
        faction: 'RBiH',
        kind: 'brigade',
        status: 'active',
        personnel: 1000,
        tags,
    } as FormationState;
}

describe('resolveOperationFormation', () => {
    it('prefers an exact live key over OOB aliases', () => {
        const result = resolveOperationFormation({
            authored: formation('authored'),
            synthetic: formation('synthetic', ['oob:authored']),
        }, 'authored');

        expect(result).toMatchObject({
            formation_id: 'authored',
            resolution: 'exact',
            alias_matches: [],
        });
    });

    it('resolves a unique synthetic live key by its OOB identity', () => {
        const result = resolveOperationFormation({
            F_RBiH_0001: formation('F_RBiH_0001', ['oob:arbih_328th_mountain']),
        }, 'arbih_328th_mountain');

        expect(result).toMatchObject({
            authored_formation_id: 'arbih_328th_mountain',
            formation_id: 'F_RBiH_0001',
            resolution: 'oob_alias',
            alias_matches: ['F_RBiH_0001'],
        });
    });

    it('rejects ambiguous aliases in deterministic key order', () => {
        const result = resolveOperationFormation({
            z: formation('z', ['oob:authored']),
            a: formation('a', ['oob:authored']),
        }, 'authored');

        expect(result).toMatchObject({
            formation_id: null,
            formation: null,
            resolution: 'ambiguous_oob_alias',
            alias_matches: ['a', 'z'],
        });
    });

    it('distinguishes a truly missing formation', () => {
        expect(resolveOperationFormation({}, 'missing')).toMatchObject({
            formation_id: null,
            resolution: 'missing',
            alias_matches: [],
        });
    });
});
