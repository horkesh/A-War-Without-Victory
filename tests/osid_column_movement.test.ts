/**
 * Tests for OSID column (undeployed) movement.
 * Covers: terrain cost, column rate, Dijkstra path, transit lifecycle.
 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import type { GameState, FactionId, FormationState } from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { TerrainScalarsData, TerrainScalars } from '../src/map/terrain_scalars.js';
import type { OperationalToCanonicalReverseMap } from '../src/data/operational_data.js';
import {
    averageTerrainForOsid,
    getOsidEdgeMovementCost,
    getOsidColumnRate,
    dijkstraFriendlyPath,
    processOsidColumnMovement,
    OSID_COLUMN_BASE_RATE
} from '../src/sim/phase_ii/osid_column_movement.js';
import { buildOsidAdjacency } from '../src/sim/phase_ii/zoc.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeEdge(a: string, b: string): EdgeRecord {
    return { a, b } as EdgeRecord;
}

/** Linear chain: A–B–C–D–E */
function makeLinearEdges(): EdgeRecord[] {
    return [
        makeEdge('A', 'B'),
        makeEdge('B', 'C'),
        makeEdge('C', 'D'),
        makeEdge('D', 'E')
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
        ...opts
    } as FormationState;
}

function makeState(formations: FormationState[], opts?: Partial<GameState>): GameState {
    const formationsMap: Record<string, FormationState> = {};
    for (const f of formations) formationsMap[f.id] = f;
    return {
        meta: { turn: 1, phase: 'war', schema_version: 1, scenario_id: 'test' },
        factions: [{ id: 'RS' as FactionId }, { id: 'RBiH' as FactionId }, { id: 'HRHB' as FactionId }] as GameState['factions'],
        formations: formationsMap,
        political_controllers: {
            A: 'RS', B: 'RS', C: 'RS', D: 'RS', E: 'RBiH'
        },
        front_pressure: {},
        militia_pools: {},
        ...opts
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
        terrain_friction_index: 0.1
    };
    return {
        by_sid: { A: flat, B: flat, C: flat, D: flat, E: flat }
    };
}

function mountainTerrain(): TerrainScalarsData {
    const mountain: TerrainScalars = {
        road_access_index: 0.1,
        river_crossing_penalty: 0.6,
        elevation_mean_m: 1200,
        elevation_stddev_m: 200,
        slope_index: 0.7,
        terrain_friction_index: 0.6
    };
    return {
        by_sid: { A: mountain, B: mountain, C: mountain, D: mountain, E: mountain }
    };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('averageTerrainForOsid', () => {
    it('returns default for unknown OSID', () => {
        const rm = new Map<string, string[]>();
        const td: TerrainScalarsData = { by_sid: {} };
        const result = averageTerrainForOsid('unknown', rm, td);
        assert.equal(result.road_access_index, 0.5);
    });

    it('averages multiple canonical SIDs', () => {
        const rm = new Map([['op:test', ['s1', 's2']]]);
        const td: TerrainScalarsData = {
            by_sid: {
                s1: { road_access_index: 0.8, river_crossing_penalty: 0, elevation_mean_m: 100, elevation_stddev_m: 5, slope_index: 0.2, terrain_friction_index: 0.1 },
                s2: { road_access_index: 0.4, river_crossing_penalty: 0.4, elevation_mean_m: 300, elevation_stddev_m: 15, slope_index: 0.6, terrain_friction_index: 0.3 }
            }
        };
        const result = averageTerrainForOsid('op:test', rm, td);
        assert.ok(Math.abs(result.road_access_index - 0.6) < 1e-10, `road_access ~0.6, got ${result.road_access_index}`);
        assert.ok(Math.abs(result.river_crossing_penalty - 0.2) < 1e-10, `river ~0.2, got ${result.river_crossing_penalty}`);
        assert.equal(result.elevation_mean_m, 200);
    });
});

describe('getOsidEdgeMovementCost', () => {
    it('flat terrain with good roads is cheap (~0.6–0.8)', () => {
        const rm = mockReverseMap(['A', 'B']);
        const good: TerrainScalars = {
            road_access_index: 1.0, river_crossing_penalty: 0,
            elevation_mean_m: 100, elevation_stddev_m: 5,
            slope_index: 0, terrain_friction_index: 0
        };
        const td: TerrainScalarsData = { by_sid: { A: good, B: good } };
        const cost = getOsidEdgeMovementCost('A', 'B', rm, td);
        assert.ok(cost >= 0.5 && cost <= 0.9, `Expected 0.5–0.9, got ${cost}`);
    });

    it('mountain terrain is expensive (>1.5)', () => {
        const rm = mockReverseMap(['A', 'B']);
        const cost = getOsidEdgeMovementCost('A', 'B', rm, mountainTerrain());
        assert.ok(cost > 1.5, `Expected >1.5, got ${cost}`);
    });

    it('uphill is more expensive than downhill', () => {
        const rm = mockReverseMap(['low', 'high']);
        const td: TerrainScalarsData = {
            by_sid: {
                low: { road_access_index: 0.5, river_crossing_penalty: 0, elevation_mean_m: 100, elevation_stddev_m: 5, slope_index: 0.1, terrain_friction_index: 0.1 },
                high: { road_access_index: 0.5, river_crossing_penalty: 0, elevation_mean_m: 800, elevation_stddev_m: 5, slope_index: 0.1, terrain_friction_index: 0.1 }
            }
        };
        const uphill = getOsidEdgeMovementCost('low', 'high', rm, td);
        const downhill = getOsidEdgeMovementCost('high', 'low', rm, td);
        assert.ok(uphill > downhill, `Uphill (${uphill}) should > downhill (${downhill})`);
    });
});

describe('getOsidColumnRate', () => {
    it('heavy mech (RS) returns 2', () => {
        const f = makeFormation('test', 'RS', 'A', {
            composition: { infantry: 800, tanks: 40, artillery: 30, aa_systems: 5, tank_condition: { operational: 1, degraded: 0, non_operational: 0 }, artillery_condition: { operational: 1, degraded: 0, non_operational: 0 } }
        });
        assert.equal(getOsidColumnRate(f), 2);
    });

    it('light infantry (RBiH) returns 4', () => {
        const f = makeFormation('test', 'RBiH', 'A', {
            composition: { infantry: 950, tanks: 3, artillery: 8, aa_systems: 1, tank_condition: { operational: 1, degraded: 0, non_operational: 0 }, artillery_condition: { operational: 1, degraded: 0, non_operational: 0 } }
        });
        assert.equal(getOsidColumnRate(f), 4);
    });

    it('mixed (HRHB) returns base rate 3', () => {
        const f = makeFormation('test', 'HRHB', 'A', {
            composition: { infantry: 850, tanks: 15, artillery: 15, aa_systems: 3, tank_condition: { operational: 1, degraded: 0, non_operational: 0 }, artillery_condition: { operational: 1, degraded: 0, non_operational: 0 } }
        });
        assert.equal(getOsidColumnRate(f), OSID_COLUMN_BASE_RATE);
    });
});

describe('dijkstraFriendlyPath', () => {
    it('finds path through friendly territory', () => {
        const edges = makeLinearEdges();
        const adjacency = buildOsidAdjacency(edges);
        const rm = mockReverseMap(['A', 'B', 'C', 'D', 'E']);
        const state = makeState([]);
        const td = flatTerrain();
        const result = dijkstraFriendlyPath('A', 'D', 'RS', adjacency, state, rm, td);
        assert.ok(result !== null);
        assert.deepEqual(result.path, ['A', 'B', 'C', 'D']);
        assert.ok(result.totalCost > 0);
    });

    it('returns null when path blocked by enemy territory', () => {
        const edges = makeLinearEdges();
        const adjacency = buildOsidAdjacency(edges);
        const rm = mockReverseMap(['A', 'B', 'C', 'D', 'E']);
        // C is enemy-controlled, blocking A→D path
        const state = makeState([], {
            political_controllers: { A: 'RS', B: 'RS', C: 'RBiH', D: 'RS', E: 'RBiH' }
        });
        const td = flatTerrain();
        const result = dijkstraFriendlyPath('A', 'D', 'RS', adjacency, state, rm, td);
        assert.equal(result, null);
    });

    it('same source and destination returns trivial path', () => {
        const edges = makeLinearEdges();
        const adjacency = buildOsidAdjacency(edges);
        const rm = mockReverseMap(['A']);
        const state = makeState([]);
        const td = flatTerrain();
        const result = dijkstraFriendlyPath('A', 'A', 'RS', adjacency, state, rm, td);
        assert.ok(result !== null);
        assert.deepEqual(result.path, ['A']);
        assert.equal(result.totalCost, 0);
    });

    it('prefers cheaper terrain path', () => {
        // Graph: A—B—D (flat) and A—C—D (mountain)
        const edges = [makeEdge('A', 'B'), makeEdge('B', 'D'), makeEdge('A', 'C'), makeEdge('C', 'D')];
        const adjacency = buildOsidAdjacency(edges);
        const rm = mockReverseMap(['A', 'B', 'C', 'D']);
        const state = makeState([], {
            political_controllers: { A: 'RS', B: 'RS', C: 'RS', D: 'RS' }
        });
        const flat: TerrainScalars = { road_access_index: 1.0, river_crossing_penalty: 0, elevation_mean_m: 100, elevation_stddev_m: 5, slope_index: 0, terrain_friction_index: 0 };
        const mountain: TerrainScalars = { road_access_index: 0, river_crossing_penalty: 0.8, elevation_mean_m: 1500, elevation_stddev_m: 300, slope_index: 0.8, terrain_friction_index: 0.8 };
        const td: TerrainScalarsData = { by_sid: { A: flat, B: flat, C: mountain, D: flat } };
        const result = dijkstraFriendlyPath('A', 'D', 'RS', adjacency, state, rm, td);
        assert.ok(result !== null);
        // Should prefer A→B→D (flat) over A→C→D (mountain)
        assert.deepEqual(result.path, ['A', 'B', 'D']);
    });
});

describe('processOsidColumnMovement', () => {
    it('starts column transit from column order', () => {
        const edges = makeLinearEdges();
        const rm = mockReverseMap(['A', 'B', 'C', 'D', 'E']);
        const f1 = makeFormation('brig1', 'RS', 'A');
        const state = makeState([f1], {
            brigade_movement_orders: {
                brig1: { destination_sids: ['D'], stance: 'column' }
            } as any
        });
        const td = flatTerrain();
        const report = processOsidColumnMovement(state, edges, rm, td);
        assert.equal(report.column_starts, 1);
        assert.equal(report.column_blocked, 0);
        // Brigade should be in_transit
        const ms = state.brigade_movement_state?.brig1;
        assert.ok(ms);
        assert.equal(ms.status, 'in_transit');
        assert.equal(ms.stance, 'column');
        assert.ok((ms.turns_remaining ?? 0) >= 1);
        assert.deepEqual(ms.destination_sids, ['D']);
    });

    it('advances existing column transit (decrement turns_remaining)', () => {
        const edges = makeLinearEdges();
        const rm = mockReverseMap(['A', 'B', 'C', 'D', 'E']);
        const f1 = makeFormation('brig1', 'RS', 'A');
        const state = makeState([f1], {
            brigade_movement_state: {
                brig1: { status: 'in_transit', stance: 'column', destination_sids: ['D'], path: ['A', 'B', 'C', 'D'], turns_remaining: 3 }
            }
        });
        const td = flatTerrain();
        const report = processOsidColumnMovement(state, edges, rm, td);
        assert.equal(report.column_advances, 1);
        const ms = state.brigade_movement_state?.brig1;
        assert.ok(ms);
        assert.equal(ms.turns_remaining, 2);
    });

    it('arrives at destination when turns_remaining reaches 0', () => {
        const edges = makeLinearEdges();
        const rm = mockReverseMap(['A', 'B', 'C', 'D', 'E']);
        const f1 = makeFormation('brig1', 'RS', 'A');
        const state = makeState([f1], {
            brigade_movement_state: {
                brig1: { status: 'in_transit', stance: 'column', destination_sids: ['D'], path: ['A', 'B', 'C', 'D'], turns_remaining: 1 }
            }
        });
        const td = flatTerrain();
        const report = processOsidColumnMovement(state, edges, rm, td);
        assert.equal(report.column_arrivals, 1);
        // Brigade should be at destination
        assert.equal(state.formations?.brig1?.location_osid, 'D');
        // Entrenchment reset on arrival
        assert.equal((state.formations?.brig1 as any)?.entrenchment_turns, 0);
        // Movement state cleaned up
        assert.equal(state.brigade_movement_state?.brig1, undefined);
    });

    it('blocks column transit to unreachable destination', () => {
        const edges = makeLinearEdges();
        const rm = mockReverseMap(['A', 'B', 'C', 'D', 'E']);
        const f1 = makeFormation('brig1', 'RS', 'A');
        // C is enemy-controlled → no path from A to D
        const state = makeState([f1], {
            political_controllers: { A: 'RS', B: 'RS', C: 'RBiH', D: 'RS', E: 'RBiH' },
            brigade_movement_orders: {
                brig1: { destination_sids: ['D'], stance: 'column' }
            } as any
        });
        const td = flatTerrain();
        const report = processOsidColumnMovement(state, edges, rm, td);
        assert.equal(report.column_blocked, 1);
        assert.equal(report.column_starts, 0);
    });

    it('ignores non-column orders (leaves them for ZoC movement)', () => {
        const edges = makeLinearEdges();
        const rm = mockReverseMap(['A', 'B', 'C', 'D', 'E']);
        const f1 = makeFormation('brig1', 'RS', 'A');
        const state = makeState([f1], {
            brigade_movement_orders: {
                brig1: { destination_sids: ['B'] } // No stance: 'column'
            } as any
        });
        const td = flatTerrain();
        const report = processOsidColumnMovement(state, edges, rm, td);
        assert.equal(report.column_starts, 0);
        // Regular order should be preserved for ZoC movement step
        assert.ok(state.brigade_movement_orders?.brig1);
    });

    it('new orders dont get immediate advance (1-turn delay)', () => {
        const edges = makeLinearEdges();
        const rm = mockReverseMap(['A', 'B', 'C', 'D', 'E']);
        const f1 = makeFormation('brig1', 'RS', 'A');
        const state = makeState([f1], {
            brigade_movement_orders: {
                brig1: { destination_sids: ['D'], stance: 'column' }
            } as any
        });
        const td = flatTerrain();
        const report = processOsidColumnMovement(state, edges, rm, td);
        assert.equal(report.column_starts, 1);
        assert.equal(report.column_advances, 0); // No advance on start turn
        assert.equal(report.column_arrivals, 0); // No arrival on start turn
        // Brigade still at original location
        assert.equal(state.formations?.brig1?.location_osid, 'A');
    });
});
