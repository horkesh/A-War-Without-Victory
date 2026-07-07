import { describe, expect, it } from 'vitest';

import { frontDensityModifier } from '../src/sim/combat/local_front_defense.js';
import {
    findSectorForEnemyOsid,
    getCorpsHqOsid,
} from '../src/sim/combat/corps_front_sectors.js';
import type {
    CorpsFrontSector,
    CorpsFrontSubSegment,
    FactionId,
    FormationState,
    GameState,
} from '../src/state/game_state.js';

function makeFormation(
    id: string,
    faction: FactionId,
    kind: 'brigade' | 'corps',
    locationOsid: string,
    overrides: Partial<FormationState> = {},
): FormationState {
    return {
        id,
        name: id,
        faction,
        kind,
        status: 'active',
        personnel: 1000,
        cohesion: 60,
        morale: 60,
        experience: 0.3,
        location_osid: locationOsid,
        ...overrides,
    } as FormationState;
}

function makeState(
    formations: Record<string, FormationState>,
    politicalControllers: Record<string, FactionId>,
    corpsFrontSectors: Record<string, CorpsFrontSector> = {},
): GameState {
    return {
        meta: {
            turn: 5,
            phase: 'war',
            seed: 'sector-coverage-defense',
            scenario_start_date: { year: 1992, month: 4, day: 6 },
        } as unknown as GameState['meta'],
        factions: [
            { id: 'RS' as FactionId },
            { id: 'RBiH' as FactionId },
        ] as GameState['factions'],
        military: {
            formations,
            corps_front_sectors: corpsFrontSectors,
            corps_command: {},
        } as any,
        political: {
            political_controllers: politicalControllers,
        } as any,
    } as GameState;
}

function makeSubSegment(
    id: string,
    defendedOsids: string[],
    enemyOsids: string[],
    edgeIds: string[],
): CorpsFrontSubSegment {
    return {
        sub_segment_id: id,
        edge_ids: edgeIds,
        friendly_osids: defendedOsids,
        enemy_osids: enemyOsids,
        primary_brigade_ids: [],
        length_edges: edgeIds.length,
    };
}

function makeSector(
    id: string,
    corpsId: string,
    faction: FactionId,
    brigadeIds: string[],
    subSegments: CorpsFrontSubSegment[],
): CorpsFrontSector {
    return {
        sector_id: id,
        corps_id: corpsId as any,
        faction,
        opposing_factions: [],
        edge_ids: subSegments.flatMap((segment) => segment.edge_ids),
        sub_segments: subSegments,
        length_edges: subSegments.reduce((sum, segment) => sum + segment.length_edges, 0),
        territory_osids: subSegments.flatMap((segment) => segment.friendly_osids),
        assigned_brigade_ids: brigadeIds as any[],
        reserve_brigade_ids: [],
        density: 1,
        threat_ratio: 1,
        defensive_power: 100,
        sector_stance: 'defend',
        stance_source: 'bot',
    };
}

describe('findSectorForEnemyOsid', () => {
    it('returns null when no corps_front_sectors exist', () => {
        const state = makeState({}, {});
        expect(findSectorForEnemyOsid(state, 'op:foo:1')).toBeNull();
    });

    it('returns null when no sector defends the target OSID', () => {
        const sector = makeSector(
            'sector:vrs_1st:0',
            'vrs_1st',
            'RS',
            ['brig1'],
            [makeSubSegment('sub1', ['op:rs:1'], ['op:rbih:1'], ['e1'])],
        );
        const state = makeState({}, { 'op:rs:1': 'RS', 'op:rbih:1': 'RBiH' }, { 'sector:vrs_1st:0': sector });
        expect(findSectorForEnemyOsid(state, 'op:rbih:99')).toBeNull();
    });

    it('finds the sector that defends a friendly-side OSID', () => {
        const sectorA = makeSector(
            'sector:vrs_1st:0',
            'vrs_1st',
            'RS',
            ['brig1'],
            [makeSubSegment('subA', ['op:rs:1', 'op:rs:2'], ['op:rbih:1'], ['e1', 'e2'])],
        );
        const sectorB = makeSector(
            'sector:vrs_2nd:0',
            'vrs_2nd',
            'RS',
            ['brig2'],
            [makeSubSegment('subB', ['op:rs:5', 'op:rs:6'], ['op:rbih:5'], ['e5', 'e6'])],
        );
        const state = makeState({}, {
            'op:rs:1': 'RS',
            'op:rs:2': 'RS',
            'op:rs:5': 'RS',
            'op:rs:6': 'RS',
            'op:rbih:1': 'RBiH',
            'op:rbih:5': 'RBiH',
        }, {
            'sector:vrs_1st:0': sectorA,
            'sector:vrs_2nd:0': sectorB,
        });

        expect(findSectorForEnemyOsid(state, 'op:rs:5')?.sector_id).toBe('sector:vrs_2nd:0');
    });

    it('returns the first matching sector in sorted order when claims overlap', () => {
        const sectorA = makeSector(
            'sector:aaa:0',
            'aaa',
            'RS',
            ['brigA'],
            [makeSubSegment('subA', ['op:rs:shared'], ['op:rbih:1'], ['e1'])],
        );
        const sectorB = makeSector(
            'sector:zzz:0',
            'zzz',
            'RS',
            ['brigB'],
            [makeSubSegment('subB', ['op:rs:shared'], ['op:rbih:2'], ['e2'])],
        );
        const state = makeState({}, { 'op:rs:shared': 'RS' }, {
            'sector:zzz:0': sectorB,
            'sector:aaa:0': sectorA,
        });

        expect(findSectorForEnemyOsid(state, 'op:rs:shared')?.sector_id).toBe('sector:aaa:0');
    });

    it('prefers a live defended sector over an empty overlapping sector claim', () => {
        const emptySector = makeSector(
            'sector:aaa_empty:0',
            'aaa_empty',
            'RBiH',
            [],
            [makeSubSegment('subEmpty', ['op:rbih:shared'], ['op:rs:1'], ['e1'])],
        );
        const defendedSector = makeSector(
            'sector:zzz_defended:0',
            'zzz_defended',
            'RBiH',
            ['arbih_line'],
            [makeSubSegment('subDefended', ['op:rbih:shared'], ['op:rs:2'], ['e2'])],
        );
        const defender = makeFormation('arbih_line', 'RBiH', 'brigade', 'op:rbih:rear');
        const state = makeState({ arbih_line: defender }, { 'op:rbih:shared': 'RBiH' }, {
            'sector:aaa_empty:0': emptySector,
            'sector:zzz_defended:0': defendedSector,
        });

        expect(findSectorForEnemyOsid(state, 'op:rbih:shared', 'RBiH')?.sector_id)
            .toBe('sector:zzz_defended:0');
    });
});

describe('getCorpsHqOsid', () => {
    it('returns null when a brigade has no corps tag or corps_id', () => {
        const brig = makeFormation('brig1', 'RS', 'brigade', 'op:rs:1');
        const state = makeState({ brig1: brig }, {});
        expect(getCorpsHqOsid(state, brig)).toBeNull();
    });

    it('returns the corps location_osid when the corps is found', () => {
        const corps = makeFormation('vrs_1st', 'RS', 'corps', 'op:rs:hq');
        const brig = makeFormation('brig1', 'RS', 'brigade', 'op:rs:1', {
            tags: ['corps:vrs_1st'] as any,
        });
        const state = makeState({ vrs_1st: corps, brig1: brig }, {});

        expect(getCorpsHqOsid(state, brig)).toBe('op:rs:hq');
    });
});

describe('frontDensityModifier', () => {
    it('returns 1.0 for zero-length front', () => {
        expect(frontDensityModifier(1, 0)).toBe(1);
    });

    it('applies a bounded penalty for thin fronts', () => {
        const mod = frontDensityModifier(1, 4);
        expect(mod).toBeLessThan(1);
        expect(mod).toBeGreaterThanOrEqual(0.6);
    });

    it('returns 1.0 for normal density', () => {
        expect(frontDensityModifier(2, 3)).toBe(1);
    });

    it('applies a bounded bonus for dense fronts', () => {
        const mod = frontDensityModifier(4, 2);
        expect(mod).toBeGreaterThan(1);
        expect(mod).toBeLessThanOrEqual(1.25);
    });

    it('caps extremely thin fronts at the minimum penalty', () => {
        expect(frontDensityModifier(0, 10)).toBe(0.6);
    });
});
