import { describe, expect, it } from 'vitest';

import { frontDensityModifier } from '../src/sim/combat/local_front_defense.js';
import {
    findSectorForEnemyOsid,
    getCorpsHqOsid,
} from '../src/sim/combat/corps_front_sectors.js';
import { buildSectorDefenseByFactionAndOsid } from '../src/sim/combat/sector_utils.js';
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

const PHYSICAL_TARGET = 'op:rbih:physical_target';

interface OverlapOptions {
    residentIdFirst: boolean;
    residentKeyFirst: boolean;
    residentPhysical: boolean;
    reservePhysical: boolean;
    residentStatus?: FormationState['status'];
    residentLifecycleStatus?: 'forming' | 'destroyed' | 'active';
}

function makeOverlapState(options: OverlapOptions): {
    state: GameState;
    residentSectorId: string;
    reserveSectorId: string;
    sortedFirstSectorId: string;
} {
    const residentPrefix = options.residentIdFirst ? 'aaa' : 'zzz';
    const reservePrefix = options.residentIdFirst ? 'zzz' : 'aaa';
    const residentSectorId = `sector:${residentPrefix}_resident:0`;
    const reserveSectorId = `sector:${reservePrefix}_reserve:0`;
    const residentBrigadeId = `brig_${residentPrefix}_resident`;
    const reserveBrigadeId = `brig_${reservePrefix}_reserve`;
    const reserveRearId = `brig_${reservePrefix}_reserve_rear`;

    const residentSector = makeSector(
        residentSectorId,
        `${residentPrefix}_resident`,
        'RBiH',
        [residentBrigadeId],
        [makeSubSegment(`sub_${residentPrefix}_resident`, [PHYSICAL_TARGET], ['op:rs:resident'], [`e_${residentPrefix}_resident`])],
    );
    const reserveSector = makeSector(
        reserveSectorId,
        `${reservePrefix}_reserve`,
        'RBiH',
        [reserveBrigadeId, reserveRearId],
        [makeSubSegment(`sub_${reservePrefix}_reserve`, [PHYSICAL_TARGET], ['op:rs:reserve'], [`e_${reservePrefix}_reserve`])],
    );

    const residentFormation = makeFormation(
        residentBrigadeId,
        'RBiH',
        'brigade',
        options.residentPhysical ? PHYSICAL_TARGET : 'op:rbih:resident:rear',
        options.residentStatus ? { status: options.residentStatus } : {},
    );
    if (options.residentLifecycleStatus) {
        (residentFormation as FormationState & { lifecycle_status?: string }).lifecycle_status =
            options.residentLifecycleStatus;
    }

    const formations: Record<string, FormationState> = {
        [residentBrigadeId]: residentFormation,
        [reserveBrigadeId]: makeFormation(
            reserveBrigadeId,
            'RBiH',
            'brigade',
            options.reservePhysical ? PHYSICAL_TARGET : 'op:rbih:reserve:rear',
        ),
        [reserveRearId]: makeFormation(reserveRearId, 'RBiH', 'brigade', 'op:rbih:reserve:far'),
    };

    const sectors: Record<string, CorpsFrontSector> = {};
    const insertionOrder: Array<[string, CorpsFrontSector]> = options.residentKeyFirst
        ? [[residentSectorId, residentSector], [reserveSectorId, reserveSector]]
        : [[reserveSectorId, reserveSector], [residentSectorId, residentSector]];
    for (const [id, sector] of insertionOrder) sectors[id] = sector;

    return {
        state: makeState(formations, { [PHYSICAL_TARGET]: 'RBiH' }, sectors),
        residentSectorId,
        reserveSectorId,
        sortedFirstSectorId: residentSectorId < reserveSectorId ? residentSectorId : reserveSectorId,
    };
}

function makeTerritoryOnlySector(
    sectorId: string,
    prefix: string,
    brigadeId: string,
    targetOsid: string,
): CorpsFrontSector {
    const sector = makeSector(
        sectorId,
        prefix,
        'RBiH',
        [brigadeId],
        [makeSubSegment(`sub_${prefix}`, [`op:rbih:depth:${prefix}`], ['op:rs:depth'], [`e_${prefix}`])],
    );
    sector.territory_osids = [targetOsid];
    return sector;
}

describe('physical defender sector preference', () => {
    it('selects the resident combat sector over a remote reserve sector in any ID and insertion order', () => {
        for (const residentIdFirst of [true, false]) {
            for (const residentKeyFirst of [true, false]) {
                const { state, residentSectorId } = makeOverlapState({
                    residentIdFirst,
                    residentKeyFirst,
                    residentPhysical: true,
                    reservePhysical: false,
                });

                expect(findSectorForEnemyOsid(state, PHYSICAL_TARGET, 'RBiH')?.sector_id)
                    .toBe(residentSectorId);
                expect(buildSectorDefenseByFactionAndOsid(state).get('RBiH')?.get(PHYSICAL_TARGET)?.sector_id)
                    .toBe(residentSectorId);
            }
        }
    });

    it('keeps deterministic sorted order when neither or both sectors have a physical combat defender', () => {
        for (const physical of [false, true]) {
            for (const residentIdFirst of [true, false]) {
                const { state, sortedFirstSectorId } = makeOverlapState({
                    residentIdFirst,
                    residentKeyFirst: true,
                    residentPhysical: physical,
                    reservePhysical: physical,
                });

                expect(findSectorForEnemyOsid(state, PHYSICAL_TARGET, 'RBiH')?.sector_id)
                    .toBe(sortedFirstSectorId);
                expect(buildSectorDefenseByFactionAndOsid(state).get('RBiH')?.get(PHYSICAL_TARGET)?.sector_id)
                    .toBe(sortedFirstSectorId);
            }
        }
    });

    it('does not treat forming, destroyed, or inactive physical records as defenders', () => {
        for (const status of ['forming', 'destroyed', 'inactive']) {
            const { state, reserveSectorId } = makeOverlapState({
                residentIdFirst: true,
                residentKeyFirst: true,
                residentPhysical: true,
                reservePhysical: false,
                residentStatus: status as FormationState['status'],
            });

            expect(findSectorForEnemyOsid(state, PHYSICAL_TARGET, 'RBiH')?.sector_id)
                .toBe(reserveSectorId);
            expect(buildSectorDefenseByFactionAndOsid(state).get('RBiH')?.get(PHYSICAL_TARGET)?.sector_id)
                .toBe(reserveSectorId);
        }
    });

    it('does not treat active-status records with lifecycle forming or destroyed as physical defenders', () => {
        for (const lifecycle of ['forming', 'destroyed'] as const) {
            const { state, reserveSectorId } = makeOverlapState({
                residentIdFirst: true,
                residentKeyFirst: true,
                residentPhysical: true,
                reservePhysical: true,
                residentLifecycleStatus: lifecycle,
            });

            expect(findSectorForEnemyOsid(state, PHYSICAL_TARGET, 'RBiH')?.sector_id)
                .toBe(reserveSectorId);
            expect(buildSectorDefenseByFactionAndOsid(state).get('RBiH')?.get(PHYSICAL_TARGET)?.sector_id)
                .toBe(reserveSectorId);
        }
    });

    it('keeps inactive status records out of the physical-defender preference', () => {
        const { state, reserveSectorId } = makeOverlapState({
            residentIdFirst: true,
            residentKeyFirst: true,
            residentPhysical: true,
            reservePhysical: true,
            residentStatus: 'inactive' as FormationState['status'],
        });

        expect(findSectorForEnemyOsid(state, PHYSICAL_TARGET, 'RBiH')?.sector_id)
            .toBe(reserveSectorId);
        expect(buildSectorDefenseByFactionAndOsid(state).get('RBiH')?.get(PHYSICAL_TARGET)?.sector_id)
            .toBe(reserveSectorId);
    });

    it('keeps front-subsegment claims ahead of physically staffed territory-only claims', () => {
        const frontSector = makeSector(
            'sector:aaa_front:0',
            'aaa_front',
            'RBiH',
            ['brig_front'],
            [makeSubSegment('subFront', [PHYSICAL_TARGET], ['op:rs:front'], ['eFront'])],
        );
        const depthSector = makeSector(
            'sector:zzz_depth:0',
            'zzz_depth',
            'RBiH',
            ['brig_depth'],
            [makeSubSegment('subDepth', ['op:rbih:depth_front'], ['op:rs:depth'], ['eDepth'])],
        );
        depthSector.territory_osids = [PHYSICAL_TARGET];
        const state = makeState({
            brig_front: makeFormation('brig_front', 'RBiH', 'brigade', 'op:rbih:front_rear'),
            brig_depth: makeFormation('brig_depth', 'RBiH', 'brigade', PHYSICAL_TARGET),
        }, { [PHYSICAL_TARGET]: 'RBiH' }, {
            'sector:aaa_front:0': frontSector,
            'sector:zzz_depth:0': depthSector,
        });

        expect(findSectorForEnemyOsid(state, PHYSICAL_TARGET, 'RBiH')?.sector_id)
            .toBe('sector:aaa_front:0');
        expect(buildSectorDefenseByFactionAndOsid(state).get('RBiH')?.get(PHYSICAL_TARGET)?.sector_id)
            .toBe('sector:aaa_front:0');
    });

    it('selects the physical owner among territory-only claims and keeps deterministic ties', () => {
        const cases: Array<{ aaaPhysical: boolean; zzzPhysical: boolean; expected: string }> = [
            { aaaPhysical: false, zzzPhysical: true, expected: 'sector:zzz_owner:0' },
            { aaaPhysical: false, zzzPhysical: false, expected: 'sector:aaa_owner:0' },
            { aaaPhysical: true, zzzPhysical: true, expected: 'sector:aaa_owner:0' },
        ];
        for (const testCase of cases) {
            const state = makeState({
                brig_aaa_owner: makeFormation(
                    'brig_aaa_owner',
                    'RBiH',
                    'brigade',
                    testCase.aaaPhysical ? PHYSICAL_TARGET : 'op:rbih:aaa:rear',
                ),
                brig_zzz_owner: makeFormation(
                    'brig_zzz_owner',
                    'RBiH',
                    'brigade',
                    testCase.zzzPhysical ? PHYSICAL_TARGET : 'op:rbih:zzz:rear',
                ),
            }, { [PHYSICAL_TARGET]: 'RBiH' }, {
                'sector:aaa_owner:0': makeTerritoryOnlySector(
                    'sector:aaa_owner:0',
                    'aaa_owner',
                    'brig_aaa_owner',
                    PHYSICAL_TARGET,
                ),
                'sector:zzz_owner:0': makeTerritoryOnlySector(
                    'sector:zzz_owner:0',
                    'zzz_owner',
                    'brig_zzz_owner',
                    PHYSICAL_TARGET,
                ),
            });

            expect(findSectorForEnemyOsid(state, PHYSICAL_TARGET, 'RBiH')?.sector_id)
                .toBe(testCase.expected);
            expect(buildSectorDefenseByFactionAndOsid(state).get('RBiH')?.get(PHYSICAL_TARGET)?.sector_id)
                .toBe(testCase.expected);
        }
    });

    it('does not treat a corps or command formation at the target as a combat defender', () => {
        const hqSector = makeSector(
            'sector:aaa_hq:0',
            'aaa_hq',
            'RBiH',
            ['corps_hq'],
            [makeSubSegment('subHq', [PHYSICAL_TARGET], ['op:rs:1'], ['e1'])],
        );
        const lineSector = makeSector(
            'sector:zzz_line:0',
            'zzz_line',
            'RBiH',
            ['brig_line'],
            [makeSubSegment('subLine', [PHYSICAL_TARGET], ['op:rs:2'], ['e2'])],
        );
        const state = makeState({
            corps_hq: makeFormation('corps_hq', 'RBiH', 'corps', PHYSICAL_TARGET),
            brig_line: makeFormation('brig_line', 'RBiH', 'brigade', PHYSICAL_TARGET),
        }, { [PHYSICAL_TARGET]: 'RBiH' }, {
            'sector:aaa_hq:0': hqSector,
            'sector:zzz_line:0': lineSector,
        });

        expect(findSectorForEnemyOsid(state, PHYSICAL_TARGET, 'RBiH')?.sector_id)
            .toBe('sector:zzz_line:0');
        expect(buildSectorDefenseByFactionAndOsid(state).get('RBiH')?.get(PHYSICAL_TARGET)?.sector_id)
            .toBe('sector:zzz_line:0');
    });

    it('keeps defender-faction filtering when both factions claim the target', () => {
        const rsSector = makeSector(
            'sector:aaa_rs:0',
            'aaa_rs',
            'RS',
            ['brig_rs'],
            [makeSubSegment('subRs', [PHYSICAL_TARGET], ['op:rbih:x'], ['e1'])],
        );
        const rbihSector = makeSector(
            'sector:zzz_rbih:0',
            'zzz_rbih',
            'RBiH',
            ['brig_rbih'],
            [makeSubSegment('subRbih', [PHYSICAL_TARGET], ['op:rs:x'], ['e2'])],
        );
        const state = makeState({
            brig_rs: makeFormation('brig_rs', 'RS', 'brigade', PHYSICAL_TARGET),
            brig_rbih: makeFormation('brig_rbih', 'RBiH', 'brigade', PHYSICAL_TARGET),
        }, { [PHYSICAL_TARGET]: 'RBiH' }, {
            'sector:aaa_rs:0': rsSector,
            'sector:zzz_rbih:0': rbihSector,
        });
        const byFaction = buildSectorDefenseByFactionAndOsid(state);

        expect(findSectorForEnemyOsid(state, PHYSICAL_TARGET, 'RBiH')?.sector_id).toBe('sector:zzz_rbih:0');
        expect(findSectorForEnemyOsid(state, PHYSICAL_TARGET, 'RS')?.sector_id).toBe('sector:aaa_rs:0');
        expect(byFaction.get('RBiH')?.get(PHYSICAL_TARGET)?.sector_id).toBe('sector:zzz_rbih:0');
        expect(byFaction.get('RS')?.get(PHYSICAL_TARGET)?.sector_id).toBe('sector:aaa_rs:0');
    });

    it('still prefers an active remote sector over an empty overlapping claim in the resolver map', () => {
        const emptySector = makeSector(
            'sector:aaa_empty:0',
            'aaa_empty',
            'RBiH',
            [],
            [makeSubSegment('subEmpty', [PHYSICAL_TARGET], ['op:rs:1'], ['e1'])],
        );
        const activeSector = makeSector(
            'sector:zzz_active:0',
            'zzz_active',
            'RBiH',
            ['brig_active'],
            [makeSubSegment('subActive', [PHYSICAL_TARGET], ['op:rs:2'], ['e2'])],
        );
        const state = makeState({
            brig_active: makeFormation('brig_active', 'RBiH', 'brigade', 'op:rbih:rear'),
        }, { [PHYSICAL_TARGET]: 'RBiH' }, {
            'sector:aaa_empty:0': emptySector,
            'sector:zzz_active:0': activeSector,
        });

        expect(findSectorForEnemyOsid(state, PHYSICAL_TARGET, 'RBiH')?.sector_id).toBe('sector:zzz_active:0');
        expect(buildSectorDefenseByFactionAndOsid(state).get('RBiH')?.get(PHYSICAL_TARGET)?.sector_id)
            .toBe('sector:zzz_active:0');
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
