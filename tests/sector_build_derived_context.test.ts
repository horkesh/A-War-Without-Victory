import { describe, expect, it } from 'vitest';

import {
    createFormationOccupancyIndex,
    type FormationOccupancyIndex,
} from '../src/sim/combat/sector_build_derived_context.js';
import type { FormationState } from '../src/state/game_state.js';

function formation(
    id: string,
    overrides: Partial<FormationState> = {},
): FormationState {
    return {
        id,
        faction: 'RBiH',
        name: id,
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        readiness: 'active',
        location_osid: 'op:test:a',
        ...overrides,
    };
}

function expectParity(
    index: FormationOccupancyIndex,
    formations: Readonly<Record<string, FormationState>>,
): void {
    expect(() => index.assertEquivalent(formations)).not.toThrow();
}

describe('FormationOccupancyIndex', () => {
    it('uses stable strict OSID ordinals and exactly matches roster-eligible counts', () => {
        const formations = {
            active_default_kind: formation('active_default_kind', { kind: undefined }),
            active_og: formation('active_og', { faction: 'RS', kind: 'og', location_osid: 'op:test:b' }),
            active_operational_group: formation('active_operational_group', {
                faction: 'HRHB',
                kind: 'operational_group',
                location_osid: 'op:test:b',
            }),
            inactive: formation('inactive', { status: 'inactive' }),
            forming: formation('forming', { readiness: 'forming' }),
            destroyed_readiness: formation('destroyed_readiness', { readiness: 'destroyed' as FormationState['readiness'] }),
            destroyed_lifecycle: formation('destroyed_lifecycle', { lifecycle_status: 'destroyed' }),
            disbanded: formation('disbanded', { lifecycle_status: 'disbanded' }),
            corps: formation('corps', { kind: 'corps' }),
            missing_location: formation('missing_location', { location_osid: undefined }),
        } satisfies Record<string, FormationState>;

        const first = createFormationOccupancyIndex(
            ['op:test:c', 'op:test:a', 'op:test:b', 'op:test:a'],
            formations,
        );
        const second = createFormationOccupancyIndex(
            ['op:test:b', 'op:test:c', 'op:test:a'],
            formations,
        );

        expect(first.orderedOsids()).toEqual(['op:test:a', 'op:test:b', 'op:test:c']);
        expect(second.orderedOsids()).toEqual(first.orderedOsids());
        expect(first.ordinalOf('op:test:a')).toBe(0);
        expect(first.ordinalOf('op:test:b')).toBe(1);
        expect(first.ordinalOf('op:test:c')).toBe(2);
        expect(first.ordinalOf('op:test:unknown')).toBeUndefined();
        expect(first.count('op:test:a')).toBe(1);
        expect(first.count('op:test:b')).toBe(2);
        expect(first.count('op:test:c')).toBe(0);
        expect(first.count('op:test:unknown')).toBe(0);
        expect(first.get('op:test:a')).toBe(1);
        expect(first.get('op:test:c')).toBeUndefined();
        expectParity(first, formations);
        expectParity(second, formations);
    });

    it('stays equal to a full scan after deterministic creation, status, and location mutations', () => {
        const formations: Record<string, FormationState> = {
            alpha: formation('alpha'),
            bravo: formation('bravo', { faction: 'RS', location_osid: 'op:test:b' }),
            forming: formation('forming', { readiness: 'forming', location_osid: 'op:test:c' }),
        };
        const index = createFormationOccupancyIndex(
            ['op:test:a', 'op:test:b', 'op:test:c'],
            formations,
        );
        expectParity(index, formations);

        const sync = (id: string, mutate: (current: FormationState | undefined) => FormationState | undefined): void => {
            const previous = formations[id];
            const next = mutate(previous);
            index.syncFormation(id, previous, next);
            if (next) formations[id] = next;
            else delete formations[id];
            expectParity(index, formations);
        };

        sync('charlie', () => formation('charlie', { faction: 'HRHB', location_osid: 'op:test:c' }));
        sync('alpha', (current) => ({ ...current!, location_osid: 'op:test:b' }));
        sync('alpha', (current) => ({ ...current!, location_osid: 'op:test:a' }));
        sync('alpha', (current) => ({ ...current!, location_osid: 'op:test:a' }));
        sync('bravo', (current) => ({ ...current!, status: 'inactive' }));
        sync('bravo', (current) => ({ ...current!, status: 'active', readiness: 'forming' }));
        sync('bravo', (current) => ({ ...current!, readiness: 'active', location_osid: undefined }));
        sync('bravo', (current) => ({ ...current!, location_osid: 'op:test:c' }));
        sync('forming', (current) => ({ ...current!, readiness: 'active' }));
        sync('forming', (current) => ({ ...current!, lifecycle_status: 'destroyed' }));
        sync('charlie', () => undefined);
    });

    it('moves tracked formations in lockstep and fails closed on stale, unknown, or underflowing writes', () => {
        const formations: Record<string, FormationState> = {
            alpha: formation('alpha'),
        };
        const index = createFormationOccupancyIndex(
            ['op:test:a', 'op:test:b'],
            formations,
        );

        index.move('alpha', 'op:test:a', 'op:test:b');
        formations.alpha!.location_osid = 'op:test:b';
        expectParity(index, formations);

        index.move('alpha', 'op:test:b', 'op:test:b');
        expectParity(index, formations);

        expect(() => index.move('alpha', 'op:test:a', 'op:test:b')).toThrow(/stale formation location/i);
        expect(() => index.move('alpha', 'op:test:b', 'op:test:unknown')).toThrow(/unknown OSID/i);

        index.move('alpha', 'op:test:b', undefined);
        delete formations.alpha!.location_osid;
        expectParity(index, formations);
        expect(() => index.move('alpha', 'op:test:b', undefined)).toThrow(/stale formation location/i);
    });

    it('fails construction and parity checks when an eligible formation uses an unregistered OSID', () => {
        const unknown = formation('unknown', { location_osid: 'op:test:unknown' });
        expect(() => createFormationOccupancyIndex(['op:test:a'], { unknown })).toThrow(/unknown OSID/i);

        const formations = { alpha: formation('alpha') };
        const index = createFormationOccupancyIndex(['op:test:a'], formations);
        formations.alpha.location_osid = 'op:test:unknown';
        expect(() => index.assertEquivalent(formations)).toThrow(/unknown OSID/i);
    });
});
