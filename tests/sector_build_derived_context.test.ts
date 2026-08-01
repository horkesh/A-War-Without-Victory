import { describe, expect, it } from 'vitest';

import {
    createFormationOccupancyIndex,
    createSectorBuildReachabilityContext,
    type FormationOccupancyIndex,
} from '../src/sim/combat/sector_build_derived_context.js';
import type { CorpsFrontSector, FormationState } from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

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

function sector(
    sectorId: string,
    frontOsids: string[],
    territoryOsids: string[],
): CorpsFrontSector {
    return {
        sector_id: sectorId,
        corps_id: 'corps:test',
        faction: 'RBiH',
        opposing_factions: ['RS'],
        edge_ids: frontOsids.map((osid, index) => `${osid}__enemy:${index}`),
        sub_segments: [{
            sub_segment_id: `subsegment:${sectorId}`,
            edge_ids: frontOsids.map((osid, index) => `${osid}__enemy:${index}`),
            friendly_osids: frontOsids,
            enemy_osids: frontOsids.map((_, index) => `enemy:${index}`),
            length_edges: frontOsids.length,
            primary_brigade_ids: [],
        }],
        length_edges: frontOsids.length,
        territory_osids: territoryOsids,
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        density: 0,
        threat_ratio: 0,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot',
    };
}

describe('SectorBuildReachabilityContext', () => {
    it('builds exact sector facts and preserves legacy start-node reachability semantics', () => {
        const adjacency = new Map<Osid, Osid[]>([
            ['op:test:a' as Osid, ['op:test:b' as Osid]],
            ['op:test:b' as Osid, ['op:test:a' as Osid, 'op:test:c' as Osid]],
            ['op:test:c' as Osid, ['op:test:b' as Osid]],
            ['op:test:d' as Osid, ['op:test:e' as Osid, 'outside:start' as Osid]],
            ['op:test:e' as Osid, ['op:test:d' as Osid]],
            ['outside:start' as Osid, ['op:test:d' as Osid]],
        ]);
        const friendlyOsids = new Set([
            'op:test:a',
            'op:test:b',
            'op:test:c',
            'op:test:d',
            'op:test:e',
        ]);
        const componentOf = new Map<string, number>([
            ['op:test:a', 0],
            ['op:test:b', 0],
            ['op:test:c', 0],
            ['op:test:d', 1],
            ['op:test:e', 1],
        ]);
        const west = sector(
            'sector:test:west',
            ['op:test:b'],
            ['op:test:a', 'op:test:b', 'op:test:c'],
        );
        const east = sector(
            'sector:test:east',
            ['op:test:e'],
            ['op:test:d', 'op:test:e'],
        );
        const empty = sector('sector:test:empty', [], ['op:test:a']);
        const outside = sector('sector:test:outside', ['outside:start'], []);

        const context = createSectorBuildReachabilityContext(
            [west, east, empty, outside],
            adjacency,
            friendlyOsids,
            componentOf,
        );

        const westFacts = context.sectorFacts(west);
        expect([...westFacts.frontOsids]).toEqual(['op:test:b']);
        expect([...westFacts.reserveOsids]).toEqual(['op:test:a', 'op:test:c']);
        expect([...westFacts.territoryOsids]).toEqual(['op:test:a', 'op:test:b', 'op:test:c']);
        expect(westFacts.claimType('op:test:b')).toBe('front');
        expect(westFacts.claimType('op:test:a')).toBe('reserve');
        expect(westFacts.claimType('op:test:c')).toBe('reserve');
        expect(westFacts.claimType('op:test:d')).toBeNull();
        expect(westFacts.canReachFrom('op:test:a')).toBe(true);
        expect(westFacts.canReachFrom('op:test:c')).toBe(true);
        expect(westFacts.canReachFrom('op:test:d')).toBe(false);
        expect(westFacts.canReachFrom(undefined)).toBe(false);

        expect(context.sectorFacts(east).canReachFrom('outside:start')).toBe(true);
        expect(context.sectorFacts(empty).canReachFrom('op:test:a')).toBe(false);
        expect(context.sectorFacts(outside).canReachFrom('outside:start')).toBe(true);
        expect(context.sectorFacts(west)).toBe(westFacts);
    });
});
