import { describe, expect, it } from 'vitest';

import type { GameState, FactionId, FormationState } from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { TerrainScalarsData, TerrainScalars } from '../src/map/terrain_scalars.js';
import type { OperationalToCanonicalReverseMap } from '../src/data/operational_data.js';
import {
    averageTerrainForOsid,
    dijkstraFriendlyPath,
    getOsidColumnRate,
    getOsidEdgeMovementCost,
    OSID_COLUMN_BASE_RATE,
    processOsidColumnMovement,
} from '../src/sim/combat/osid_column_movement.js';
import { buildOsidAdjacency } from '../src/sim/combat/osid_adjacency.js';
import { applyBrigadeMovementOrders } from '../src/sim/combat/brigade_movement_orders.js';

function makeEdge(a: string, b: string): EdgeRecord {
    return { a, b } as EdgeRecord;
}

function makeLinearEdges(): EdgeRecord[] {
    return [
        makeEdge('A', 'B'),
        makeEdge('B', 'C'),
        makeEdge('C', 'D'),
        makeEdge('D', 'E'),
    ];
}

function makeFormation(id: string, faction: string, osid: string, opts?: Partial<FormationState>): FormationState {
    return {
        id,
        faction: faction as FactionId,
        kind: 'brigade',
        status: 'active',
        location_osid: osid,
        hq_sid: osid,
        ...opts,
    } as FormationState;
}

function makeState(
    formations: FormationState[],
    opts?: Partial<GameState>,
): GameState {
    const formationsMap: Record<string, FormationState> = {};
    for (const formation of formations) formationsMap[formation.id] = formation;

    const militaryOverrides = (opts?.military ?? {}) as Record<string, unknown>;
    const politicalOverrides = (opts?.political ?? {}) as Record<string, unknown>;

    return {
        meta: { turn: 1, phase: 'war', schema_version: 1, scenario_id: 'test' } as any,
        factions: [{ id: 'RS' as FactionId }, { id: 'RBiH' as FactionId }, { id: 'HRHB' as FactionId }] as GameState['factions'],
        ...opts,
        military: {
            formations: formationsMap,
            front_pressure: {},
            militia_pools: {},
            ...militaryOverrides,
        } as any,
        political: {
            political_controllers: {
                A: 'RS',
                B: 'RS',
                C: 'RS',
                D: 'RS',
                E: 'RBiH',
            },
            ...politicalOverrides,
        } as any,
    } as GameState;
}

function mockReverseMap(osids: string[]): OperationalToCanonicalReverseMap {
    const map = new Map<string, string[]>();
    for (const osid of osids) map.set(osid, [osid]);
    return map;
}

function flatTerrain(): TerrainScalarsData {
    const flat: TerrainScalars = {
        road_access_index: 0.5,
        river_crossing_penalty: 0,
        elevation_mean_m: 200,
        elevation_stddev_m: 10,
        slope_index: 0.1,
        terrain_friction_index: 0.1,
    };
    return {
        by_sid: { A: flat, B: flat, C: flat, D: flat, E: flat },
    };
}

function mountainTerrain(): TerrainScalarsData {
    const mountain: TerrainScalars = {
        road_access_index: 0.1,
        river_crossing_penalty: 0.6,
        elevation_mean_m: 1200,
        elevation_stddev_m: 200,
        slope_index: 0.7,
        terrain_friction_index: 0.6,
    };
    return {
        by_sid: { A: mountain, B: mountain, C: mountain, D: mountain, E: mountain },
    };
}

describe('averageTerrainForOsid', () => {
    it('returns the default scalars for unknown OSIDs', () => {
        const result = averageTerrainForOsid('unknown', new Map(), { by_sid: {} });
        expect(result.road_access_index).toBe(0.5);
    });

    it('averages all canonical SIDs mapped to an OSID', () => {
        const result = averageTerrainForOsid('op:test', new Map([['op:test', ['s1', 's2']]]), {
            by_sid: {
                s1: { road_access_index: 0.8, river_crossing_penalty: 0, elevation_mean_m: 100, elevation_stddev_m: 5, slope_index: 0.2, terrain_friction_index: 0.1 },
                s2: { road_access_index: 0.4, river_crossing_penalty: 0.4, elevation_mean_m: 300, elevation_stddev_m: 15, slope_index: 0.6, terrain_friction_index: 0.3 },
            },
        });

        expect(result.road_access_index).toBeCloseTo(0.6);
        expect(result.river_crossing_penalty).toBeCloseTo(0.2);
        expect(result.elevation_mean_m).toBe(200);
    });
});

describe('getOsidEdgeMovementCost', () => {
    it('makes flat terrain with good roads cheap', () => {
        const rm = mockReverseMap(['A', 'B']);
        const good: TerrainScalars = {
            road_access_index: 1.0,
            river_crossing_penalty: 0,
            elevation_mean_m: 100,
            elevation_stddev_m: 5,
            slope_index: 0,
            terrain_friction_index: 0,
        };
        const cost = getOsidEdgeMovementCost('A', 'B', rm, { by_sid: { A: good, B: good } });
        expect(cost).toBeGreaterThanOrEqual(0.5);
        expect(cost).toBeLessThanOrEqual(0.9);
    });

    it('makes mountain terrain expensive', () => {
        const cost = getOsidEdgeMovementCost('A', 'B', mockReverseMap(['A', 'B']), mountainTerrain());
        expect(cost).toBeGreaterThan(1.5);
    });

    it('charges more for uphill movement than downhill movement', () => {
        const rm = mockReverseMap(['low', 'high']);
        const td: TerrainScalarsData = {
            by_sid: {
                low: { road_access_index: 0.5, river_crossing_penalty: 0, elevation_mean_m: 100, elevation_stddev_m: 5, slope_index: 0.1, terrain_friction_index: 0.1 },
                high: { road_access_index: 0.5, river_crossing_penalty: 0, elevation_mean_m: 800, elevation_stddev_m: 5, slope_index: 0.1, terrain_friction_index: 0.1 },
            },
        };

        expect(getOsidEdgeMovementCost('low', 'high', rm, td)).toBeGreaterThan(getOsidEdgeMovementCost('high', 'low', rm, td));
    });
});

describe('getOsidColumnRate', () => {
    it('returns 2 for heavy mechanized formations', () => {
        const formation = makeFormation('test', 'RS', 'A', {
            composition: {
                infantry: 800,
                tanks: 40,
                artillery: 30,
                aa_systems: 5,
                tank_condition: { operational: 1, degraded: 0, non_operational: 0 },
                artillery_condition: { operational: 1, degraded: 0, non_operational: 0 },
            },
        });
        expect(getOsidColumnRate(formation)).toBe(2);
    });

    it('returns 4 for light infantry formations', () => {
        const formation = makeFormation('test', 'RBiH', 'A', {
            composition: {
                infantry: 950,
                tanks: 3,
                artillery: 8,
                aa_systems: 1,
                tank_condition: { operational: 1, degraded: 0, non_operational: 0 },
                artillery_condition: { operational: 1, degraded: 0, non_operational: 0 },
            },
        });
        expect(getOsidColumnRate(formation)).toBe(4);
    });

    it('returns the base rate for mixed compositions', () => {
        const formation = makeFormation('test', 'HRHB', 'A', {
            composition: {
                infantry: 850,
                tanks: 15,
                artillery: 15,
                aa_systems: 3,
                tank_condition: { operational: 1, degraded: 0, non_operational: 0 },
                artillery_condition: { operational: 1, degraded: 0, non_operational: 0 },
            },
        });
        expect(getOsidColumnRate(formation)).toBe(OSID_COLUMN_BASE_RATE);
    });
});

describe('dijkstraFriendlyPath', () => {
    it('finds a path through friendly territory', () => {
        const result = dijkstraFriendlyPath('A', 'D', 'RS', buildOsidAdjacency(makeLinearEdges()), makeState([]), mockReverseMap(['A', 'B', 'C', 'D', 'E']), flatTerrain());
        expect(result).not.toBeNull();
        expect(result?.path).toEqual(['A', 'B', 'C', 'D']);
        expect(result?.totalCost ?? 0).toBeGreaterThan(0);
    });

    it('returns null when the only path crosses enemy-controlled intermediate territory', () => {
        const state = makeState([], {
            political: {
                political_controllers: { A: 'RS', B: 'RS', C: 'RBiH', D: 'RS', E: 'RBiH' },
            } as any,
        });
        const result = dijkstraFriendlyPath('A', 'D', 'RS', buildOsidAdjacency(makeLinearEdges()), state, mockReverseMap(['A', 'B', 'C', 'D', 'E']), flatTerrain());
        expect(result).toBeNull();
    });

    it('returns a trivial path when source and destination match', () => {
        const result = dijkstraFriendlyPath('A', 'A', 'RS', buildOsidAdjacency(makeLinearEdges()), makeState([]), mockReverseMap(['A']), flatTerrain());
        expect(result).toEqual({ path: ['A'], totalCost: 0 });
    });
});

describe('processOsidColumnMovement', () => {
    it('starts column transit from a column order without immediately advancing', () => {
        const state = makeState([
            makeFormation('brig1', 'RS', 'A', { corps_id: 'corps_1' as any }),
        ], {
            military: {
                corps_front_sectors: {
                    'sector:corps_1:0': {
                        sector_id: 'sector:corps_1:0',
                        corps_id: 'corps_1',
                        faction: 'RS',
                        opposing_factions: ['RBiH'],
                        edge_ids: ['A__B'],
                        sub_segments: [{
                            sub_segment_id: 'subseg:0',
                            edge_ids: ['A__B'],
                            friendly_osids: ['A', 'B', 'C'],
                            enemy_osids: ['E'],
                            primary_brigade_ids: ['brig1'],
                            length_edges: 1,
                        }],
                        length_edges: 1,
                        territory_osids: ['A', 'B', 'C'],
                        assigned_brigade_ids: ['brig1'],
                        reserve_brigade_ids: [],
                        density: 1,
                        threat_ratio: 1,
                        defensive_power: 100,
                        sector_stance: 'defend',
                        stance_source: 'bot',
                    },
                },
                brigade_movement_orders: {
                    brig1: { destination_sids: ['C'], stance: 'column' },
                },
            } as any,
        });

        const report = processOsidColumnMovement(state, makeLinearEdges(), mockReverseMap(['A', 'B', 'C', 'D', 'E']), flatTerrain());

        expect(report.column_starts).toBe(1);
        expect(report.column_advances).toBe(0);
        expect(state.military.brigade_movement_state?.brig1?.status).toBe('in_transit');
        expect(state.military.brigade_movement_state?.brig1?.destination_sids).toEqual(['C']);
        expect(state.military.formations?.brig1?.location_osid).toBe('A');
        expect(state.military.brigade_movement_orders?.brig1).toBeUndefined();
    });

    it('single-hop movement pass ignores column orders owned by column movement', () => {
        const state = makeState([
            makeFormation('brig1', 'RS', 'A'),
        ], {
            military: {
                brigade_movement_orders: {
                    brig1: { destination_sids: ['C'], stance: 'column' },
                },
            } as any,
        });

        const report = applyBrigadeMovementOrders(
            state,
            makeLinearEdges(),
            mockReverseMap(['A', 'B', 'C', 'D', 'E']),
        );

        expect(report.moves_applied).toBe(0);
        expect(state.military.formations?.brig1?.location_osid).toBe('A');
        expect(state.military.brigade_movement_orders?.brig1).toEqual({
            destination_sids: ['C'],
            stance: 'column',
        });
    });

    it('arrives on a later turn and clears movement state', () => {
        const state = makeState([
            makeFormation('brig1', 'RS', 'A'),
        ], {
            military: {
                brigade_movement_state: {
                    brig1: {
                        status: 'in_transit',
                        stance: 'column',
                        destination_sids: ['B'],
                        path: ['A', 'B'],
                        turns_remaining: 1,
                    },
                },
            } as any,
        });

        const report = processOsidColumnMovement(state, [makeEdge('A', 'B')], mockReverseMap(['A', 'B']), flatTerrain());

        expect(report.column_arrivals).toBe(1);
        expect(state.military.formations?.brig1?.location_osid).toBe('B');
        expect(state.military.brigade_movement_state).toBeUndefined();
    });
});
