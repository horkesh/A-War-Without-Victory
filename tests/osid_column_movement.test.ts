import { afterEach, describe, expect, it } from 'vitest';

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
import { getSectorOffensiveApproachOsids } from '../src/sim/combat/operation_approach_osids.js';
import { applyBrigadeMovementOrders } from '../src/sim/combat/brigade_movement_orders.js';
import { resetReasonCodeTopicCacheForTests } from '../src/sim/combat/reason_code_debug.js';

afterEach(() => {
    delete process.env.AWWV_DEBUG_REASON_CODES;
    resetReasonCodeTopicCacheForTests();
});

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
                    brig1: { destination_sids: ['C'], stance: 'column', owner: 'bot_discretionary' },
                },
            } as any,
        });

        const report = processOsidColumnMovement(state, makeLinearEdges(), mockReverseMap(['A', 'B', 'C', 'D', 'E']), flatTerrain());

        expect(report.column_starts).toBe(1);
        expect(report.column_advances).toBe(0);
        expect(state.military.brigade_movement_state?.brig1?.status).toBe('in_transit');
        expect(state.military.brigade_movement_state?.brig1?.destination_sids).toEqual(['C']);
        expect(state.military.brigade_movement_state?.brig1?.owner).toBe('bot_discretionary');
        expect(state.military.formations?.brig1?.location_osid).toBe('A');
        expect(state.military.brigade_movement_orders?.brig1).toBeUndefined();
    });

    it('starts column transit for an active HV expeditionary phantom', () => {
        const state = makeState([
            makeFormation('hv_4th_guards_1995', 'HRHB', 'A', {
                kind: 'hv_phantom',
                corps_id: 'hvo_tomislavgrad' as any,
            }),
        ], {
            military: {
                brigade_movement_orders: {
                    hv_4th_guards_1995: { destination_sids: ['C'], stance: 'column' },
                },
            } as any,
            political: {
                political_controllers: { A: 'HRHB', B: 'HRHB', C: 'HRHB' },
            } as any,
        });

        const report = processOsidColumnMovement(
            state,
            makeLinearEdges(),
            mockReverseMap(['A', 'B', 'C', 'D', 'E']),
            flatTerrain(),
        );

        expect(report.column_starts).toBe(1);
        expect(state.military.brigade_movement_state?.hv_4th_guards_1995?.status).toBe('in_transit');
        expect(state.military.brigade_movement_orders?.hv_4th_guards_1995).toBeUndefined();
    });

    it('does not broaden new column transit to a JNA phantom', () => {
        const state = makeState([
            makeFormation('jna_uzice_corps_tg', 'RS', 'A', {
                kind: 'jna_phantom',
                corps_id: 'vrs_herzegovina' as any,
            }),
        ], {
            military: {
                brigade_movement_orders: {
                    jna_uzice_corps_tg: { destination_sids: ['C'], stance: 'column' },
                },
            } as any,
        });

        const report = processOsidColumnMovement(
            state,
            makeLinearEdges(),
            mockReverseMap(['A', 'B', 'C', 'D', 'E']),
            flatTerrain(),
        );

        expect(report.column_starts).toBe(0);
        expect(state.military.brigade_movement_state?.jna_uzice_corps_tg).toBeUndefined();
    });

    it('emits an opt-in, formation-specific reason when a column order has no friendly path', () => {
        process.env.AWWV_DEBUG_REASON_CODES = 'movement_reject';
        resetReasonCodeTopicCacheForTests();
        const state = makeState([
            makeFormation('loaned_guard', 'HRHB', 'A', {
                corps_id: 'hvo_main_staff' as any,
                elite_loan_state: {
                    on_loan: true,
                    loaned_to_corps: 'hvo_tomislavgrad' as any,
                } as any,
            }),
        ], {
            military: {
                brigade_movement_orders: {
                    loaned_guard: { destination_sids: ['C'], stance: 'column' },
                },
            } as any,
            political: {
                political_controllers: { A: 'HRHB', B: 'RS', C: 'HRHB' },
            } as any,
        });

        const report = processOsidColumnMovement(
            state,
            makeLinearEdges(),
            mockReverseMap(['A', 'B', 'C', 'D', 'E']),
            flatTerrain(),
        );

        expect(report.column_blocked).toBe(1);
        expect(report.column_rejections).toEqual([{
            formation_id: 'loaned_guard',
            reason: 'no_friendly_path',
            location_osid: 'A',
            destination_osid: 'C',
            formation_corps_id: 'hvo_main_staff',
            loaned_to_corps_id: 'hvo_tomislavgrad',
            routing_corps_id: 'hvo_main_staff',
            routing_scope_osid_count: null,
            source_in_routing_scope: null,
            destination_in_routing_scope: null,
        }]);
    });

    it('emits an opt-in reason when posture rejects a column order before pathfinding', () => {
        process.env.AWWV_DEBUG_REASON_CODES = 'movement_reject';
        resetReasonCodeTopicCacheForTests();
        const state = makeState([
            makeFormation('dug_in_guard', 'HRHB', 'A', {
                corps_id: 'hvo_main_staff' as any,
                posture: 'dig_in',
                elite_loan_state: {
                    on_loan: true,
                    loaned_to_corps: 'hvo_tomislavgrad' as any,
                } as any,
            }),
        ], {
            military: {
                brigade_movement_orders: {
                    dug_in_guard: { destination_sids: ['C'], stance: 'column' },
                },
            } as any,
            political: {
                political_controllers: { A: 'HRHB', B: 'HRHB', C: 'HRHB' },
            } as any,
        });

        const report = processOsidColumnMovement(
            state,
            makeLinearEdges(),
            mockReverseMap(['A', 'B', 'C', 'D', 'E']),
            flatTerrain(),
        );

        expect(report.column_blocked).toBe(1);
        expect(report.column_rejections).toEqual([expect.objectContaining({
            formation_id: 'dug_in_guard',
            reason: 'posture_dig_in',
            location_osid: 'A',
            destination_osid: 'C',
            formation_corps_id: 'hvo_main_staff',
            loaned_to_corps_id: 'hvo_tomislavgrad',
        })]);
    });

    it('does not add column rejection payload when the diagnostic topic is off', () => {
        const state = makeState([
            makeFormation('brig1', 'RS', 'A'),
        ], {
            military: {
                brigade_movement_orders: {
                    brig1: { destination_sids: ['E'], stance: 'column' },
                },
            } as any,
        });

        const report = processOsidColumnMovement(
            state,
            makeLinearEdges(),
            mockReverseMap(['A', 'B', 'C', 'D', 'E']),
            flatTerrain(),
        );

        expect(Object.prototype.hasOwnProperty.call(report, 'column_rejections')).toBe(false);
    });

    it('applies an adjacent friendly move for an active HV expeditionary phantom', () => {
        const state = makeState([
            makeFormation('hv_112th_infantry_1995', 'HRHB', 'A', {
                kind: 'hv_phantom',
                corps_id: 'hvo_tomislavgrad' as any,
            }),
        ], {
            military: {
                brigade_movement_orders: {
                    hv_112th_infantry_1995: { destination_sids: ['B'] },
                },
            } as any,
            political: {
                political_controllers: { A: 'HRHB', B: 'HRHB' },
            } as any,
        });

        const report = applyBrigadeMovementOrders(
            state,
            [makeEdge('A', 'B')],
            mockReverseMap(['A', 'B']),
        );

        expect(report.moves_applied).toBe(1);
        expect(state.military.formations?.hv_112th_infantry_1995?.location_osid).toBe('B');
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

// ── operation-authorized dug-in march ───────────────────────────────────────────────────────
//
// Measured defect (logs/vlasic-march-timing-20260928/): an operation admits rear-role `dig_in`
// brigades and orders them toward its own staging/approach OSIDs, but `applyPostureOrders`
// cannot change a rear-role posture and this processor rejected every such order as
// `posture_dig_in`, deleting it each turn — the two brigades never left home. The fix is the
// same release `issueEliteDeploymentOrder` performs (army_reserve_system.ts): an
// operation-authorized destination supersedes the stale defensive posture, but only once the
// order is actually accepted for transit. These tests pin that boundary.

/** Minimal active corps operation whose staging OSID is the operation-authorizing anchor. */
function makeOperation(
    brigadeId: string,
    stagingOsid: string,
    phase: 'planning' | 'execution' = 'execution',
    opts?: {
        type?: 'general_offensive' | 'sector_attack';
        objectives?: string[];
        isPrePlanned?: boolean;
        startedTurn?: number;
    },
): any {
    return {
        name: 'Test Operation',
        type: opts?.type ?? 'general_offensive',
        phase,
        started_turn: opts?.startedTurn ?? 1,
        phase_started_turn: opts?.startedTurn ?? 1,
        participating_brigades: [brigadeId],
        objectives: opts?.objectives ?? [],
        staging_osid: stagingOsid,
        ...(opts?.isPrePlanned ? { is_pre_planned: true } : {}),
    };
}

/**
 * An approved opportunity resolution row matching `makeOperation`'s default name/start turn.
 * This is the persisted authorization record a corps op spawned from an approved opportunity
 * carries (`OperationOpportunityResolution`); name + response turn + approval status pin the
 * identity without a bare name match.
 */
function approvedResolution(
    executedOpName: string,
    responseTurn: number,
    response: string = 'approve',
): Record<string, unknown> {
    return {
        proposal_id: `OPP_${responseTurn}_test_opportunity`,
        opportunity_id: 'test_opportunity',
        response,
        response_turn: responseTurn,
        executed_op_name: executedOpName,
    };
}

/** One rear-held sector the brigade sits in — mirrors the measured rear-role `dig_in` shape. */
function makeRearSector(brigadeId: string): Record<string, unknown> {
    return {
        'sector:corps_1:0': {
            sector_id: 'sector:corps_1:0',
            corps_id: 'corps_1',
            faction: 'RS',
            opposing_factions: ['RBiH'],
            edge_ids: ['A__B'],
            sub_segments: [{
                sub_segment_id: 'subseg:corps_1:0',
                edge_ids: ['A__B'],
                friendly_osids: ['A'],
                enemy_osids: ['E'],
                primary_brigade_ids: [],
                length_edges: 1,
            }],
            length_edges: 1,
            territory_osids: ['A', 'B', 'C', 'D', 'E'],
            assigned_brigade_ids: [],
            reserve_brigade_ids: [],
            rear_brigade_ids: [brigadeId],
            density: 0,
            threat_ratio: 1,
            defensive_power: 0,
            sector_stance: 'defend',
            stance_source: 'bot',
        },
    };
}

describe('processOsidColumnMovement — operation-authorized dig-in march', () => {
    it('starts transit for a rear-role dig_in brigade whose destination a pre-planned active operation authorizes', () => {
        process.env.AWWV_DEBUG_REASON_CODES = 'movement_reject';
        resetReasonCodeTopicCacheForTests();
        const state = makeState([
            makeFormation('brig_op', 'RS', 'A', {
                corps_id: 'corps_1' as any,
                posture: 'dig_in',
                dig_in_progress: 12,
            }),
        ], {
            military: {
                corps_front_sectors: makeRearSector('brig_op'),
                corps_command: {
                    // A scenario-authored pre-planned operation: authorized by `is_pre_planned`.
                    corps_1: { active_operations: [makeOperation('brig_op', 'C', 'execution', { isPrePlanned: true })] },
                },
                brigade_movement_orders: {
                    brig_op: { destination_sids: ['C'], stance: 'column', owner: 'bot_discretionary' },
                },
            } as any,
        });

        const report = processOsidColumnMovement(
            state,
            makeLinearEdges(),
            mockReverseMap(['A', 'B', 'C', 'D', 'E']),
            flatTerrain(),
        );

        expect(report.column_starts).toBe(1);
        expect(report.column_blocked).toBe(0);
        expect(state.military.brigade_movement_state?.brig_op?.status).toBe('in_transit');
        expect(state.military.brigade_movement_state?.brig_op?.destination_sids).toEqual(['C']);
        expect(state.military.brigade_movement_orders?.brig_op).toBeUndefined();
        // The accepted operation-authorized order supersedes the stale defensive posture.
        expect(state.military.formations?.brig_op?.posture).toBe('defend');
        expect(state.military.formations?.brig_op?.dig_in_progress).toBe(0);
    });

    it('starts an approved-opportunity planning sector_attack participant to a friendly approach OSID distinct from staging', () => {
        process.env.AWWV_DEBUG_REASON_CODES = 'movement_reject';
        resetReasonCodeTopicCacheForTests();
        // The measured Vlašić defect is a PLANNING-phase approach march toward an axis approach,
        // not merely to staging. This case builds a planning `sector_attack` toward enemy-held
        // `E`; `D` is its friendly approach OSID (authorized by `getSectorOffensiveApproachOsids`)
        // and the operation stages on the distinct OSID `B`. The operation was spawned by an
        // APPROVED opportunity (its resolution is persisted), so the rear-role, `dig_in`
        // participant ordered to the approach must enter ordinary column transit and release its
        // posture — mirroring the measured t150 Vlašić march.
        const operation = makeOperation('brig_op', 'B', 'planning', {
            type: 'sector_attack',
            objectives: ['E'],
        });
        const state = makeState([
            makeFormation('brig_op', 'RS', 'A', {
                corps_id: 'corps_1' as any,
                posture: 'dig_in',
                dig_in_progress: 9,
            }),
        ], {
            military: {
                corps_front_sectors: makeRearSector('brig_op'),
                corps_command: {
                    corps_1: { active_operations: [operation] },
                },
                operation_opportunity_resolutions: [approvedResolution('Test Operation', 1)],
                brigade_movement_orders: {
                    brig_op: { destination_sids: ['D'], stance: 'column', owner: 'bot_discretionary' },
                },
            } as any,
        });

        // Precondition: the shared approach predicate authorizes D, not the distinct staging OSID B,
        // so this case genuinely exercises the approach destination rather than staging.
        const approach = getSectorOffensiveApproachOsids(
            state,
            operation,
            'RS',
            buildOsidAdjacency(makeLinearEdges()),
            mockReverseMap(['A', 'B', 'C', 'D', 'E']),
            'brig_op',
        );
        expect([...approach]).toEqual(['D']);

        const report = processOsidColumnMovement(
            state,
            makeLinearEdges(),
            mockReverseMap(['A', 'B', 'C', 'D', 'E']),
            flatTerrain(),
        );

        expect(report.column_starts).toBe(1);
        expect(report.column_blocked).toBe(0);
        expect(state.military.brigade_movement_state?.brig_op?.status).toBe('in_transit');
        expect(state.military.brigade_movement_state?.brig_op?.destination_sids).toEqual(['D']);
        expect(state.military.brigade_movement_orders?.brig_op).toBeUndefined();
        // Released only because the order was accepted for transit.
        expect(state.military.formations?.brig_op?.posture).toBe('defend');
        expect(state.military.formations?.brig_op?.dig_in_progress).toBe(0);
    });

    it('still blocks a dig_in participant whose planning sector_attack destination is authorized but the operation has no approval record', () => {
        process.env.AWWV_DEBUG_REASON_CODES = 'movement_reject';
        resetReasonCodeTopicCacheForTests();
        // Same shape as the approved case above, but the operation is an EMERGENT bot
        // `sector_attack` with no authorization record in state — the measured t20 Operation
        // Jajce. Its approach OSID `D` is operation-authorized, yet the stale defensive posture
        // must NOT be released: an unauthorized operation may not uproot a dug-in brigade.
        const operation = makeOperation('brig_op', 'B', 'planning', {
            type: 'sector_attack',
            objectives: ['E'],
        });
        const state = makeState([
            makeFormation('brig_op', 'RS', 'A', {
                corps_id: 'corps_1' as any,
                posture: 'dig_in',
                dig_in_progress: 9,
            }),
        ], {
            military: {
                corps_front_sectors: makeRearSector('brig_op'),
                corps_command: {
                    corps_1: { active_operations: [operation] },
                },
                brigade_movement_orders: {
                    brig_op: { destination_sids: ['D'], stance: 'column', owner: 'bot_discretionary' },
                },
            } as any,
        });

        // Precondition: the destination really is operation-authorized — the only thing missing
        // is the operation's own authorization.
        const approach = getSectorOffensiveApproachOsids(
            state,
            operation,
            'RS',
            buildOsidAdjacency(makeLinearEdges()),
            mockReverseMap(['A', 'B', 'C', 'D', 'E']),
            'brig_op',
        );
        expect([...approach]).toEqual(['D']);

        const report = processOsidColumnMovement(
            state,
            makeLinearEdges(),
            mockReverseMap(['A', 'B', 'C', 'D', 'E']),
            flatTerrain(),
        );

        expect(report.column_starts).toBe(0);
        expect(report.column_blocked).toBe(1);
        expect(state.military.brigade_movement_state?.brig_op).toBeUndefined();
        expect(state.military.formations?.brig_op?.posture).toBe('dig_in');
        expect(state.military.formations?.brig_op?.dig_in_progress).toBe(9);
        expect(state.military.brigade_movement_orders?.brig_op).toBeUndefined();
        expect(report.column_rejections).toEqual([expect.objectContaining({
            formation_id: 'brig_op',
            reason: 'posture_dig_in',
            destination_osid: 'D',
        })]);
    });

    it('still blocks a planning sector_attack participant when the approval record does not match the operation identity', () => {
        process.env.AWWV_DEBUG_REASON_CODES = 'movement_reject';
        resetReasonCodeTopicCacheForTests();
        // Three resolutions, each matching on only PART of the identity tuple:
        //   A — same turn, different executed name;
        //   B — same name, different response turn;
        //   C — same name and turn, non-approval status.
        // None may authorize the operation, so the release stays blocked. This fails if the
        // predicate degrades to a bare (or partial) name/turn match.
        const operation = makeOperation('brig_op', 'B', 'planning', {
            type: 'sector_attack',
            objectives: ['E'],
        });
        const state = makeState([
            makeFormation('brig_op', 'RS', 'A', {
                corps_id: 'corps_1' as any,
                posture: 'dig_in',
                dig_in_progress: 4,
            }),
        ], {
            military: {
                corps_front_sectors: makeRearSector('brig_op'),
                corps_command: {
                    corps_1: { active_operations: [operation] },
                },
                operation_opportunity_resolutions: [
                    approvedResolution('Some Other Operation', 1),
                    approvedResolution('Test Operation', 5),
                    approvedResolution('Test Operation', 1, 'decline'),
                ],
                brigade_movement_orders: {
                    brig_op: { destination_sids: ['D'], stance: 'column', owner: 'bot_discretionary' },
                },
            } as any,
        });

        const report = processOsidColumnMovement(
            state,
            makeLinearEdges(),
            mockReverseMap(['A', 'B', 'C', 'D', 'E']),
            flatTerrain(),
        );

        expect(report.column_starts).toBe(0);
        expect(report.column_blocked).toBe(1);
        expect(state.military.brigade_movement_state?.brig_op).toBeUndefined();
        expect(state.military.formations?.brig_op?.posture).toBe('dig_in');
        expect(state.military.formations?.brig_op?.dig_in_progress).toBe(4);
        expect(report.column_rejections).toEqual([expect.objectContaining({
            formation_id: 'brig_op',
            reason: 'posture_dig_in',
            destination_osid: 'D',
        })]);
    });

    it('starts transit for a triggered historical operation accepted into the operations ledger', () => {
        process.env.AWWV_DEBUG_REASON_CODES = 'movement_reject';
        resetReasonCodeTopicCacheForTests();
        // Triggered / Army-HQ historical operations are not `is_pre_planned`; their authorization
        // is the acceptance ledger `military.triggered_operations_accepted`, the same record
        // `war_phases.isPlayerHistoricalOperationAssistOperation` reads.
        const state = makeState([
            makeFormation('brig_op', 'RS', 'A', {
                corps_id: 'corps_1' as any,
                posture: 'dig_in',
                dig_in_progress: 6,
            }),
        ], {
            military: {
                corps_front_sectors: makeRearSector('brig_op'),
                corps_command: {
                    corps_1: { active_operations: [makeOperation('brig_op', 'C')] },
                },
                triggered_operations_accepted: { 'Test Operation': 1 },
                brigade_movement_orders: {
                    brig_op: { destination_sids: ['C'], stance: 'column', owner: 'bot_discretionary' },
                },
            } as any,
        });

        const report = processOsidColumnMovement(
            state,
            makeLinearEdges(),
            mockReverseMap(['A', 'B', 'C', 'D', 'E']),
            flatTerrain(),
        );

        expect(report.column_starts).toBe(1);
        expect(report.column_blocked).toBe(0);
        expect(state.military.brigade_movement_state?.brig_op?.status).toBe('in_transit');
        expect(state.military.formations?.brig_op?.posture).toBe('defend');
        expect(state.military.formations?.brig_op?.dig_in_progress).toBe(0);
    });

    it('still blocks a triggered-operation march when the acceptance ledger records a different launch turn', () => {
        process.env.AWWV_DEBUG_REASON_CODES = 'movement_reject';
        resetReasonCodeTopicCacheForTests();
        // The acceptance ledger is name → accepted launch turn: both injection producers write
        // `triggered_operations_accepted[def.name] = turn`, and the operation they inject carries
        // that same `started_turn` (`buildOperation`). A same-name entry from a DIFFERENT launch
        // turn is therefore not this operation's authorization — identity is name AND turn. This
        // fails if the predicate degrades to bare name membership (`!= null`).
        const state = makeState([
            makeFormation('brig_op', 'RS', 'A', {
                corps_id: 'corps_1' as any,
                posture: 'dig_in',
                dig_in_progress: 6,
            }),
        ], {
            military: {
                corps_front_sectors: makeRearSector('brig_op'),
                corps_command: {
                    // started_turn defaults to 1; the ledger's accepted turn is 5.
                    corps_1: { active_operations: [makeOperation('brig_op', 'C')] },
                },
                triggered_operations_accepted: { 'Test Operation': 5 },
                brigade_movement_orders: {
                    brig_op: { destination_sids: ['C'], stance: 'column', owner: 'bot_discretionary' },
                },
            } as any,
        });

        const report = processOsidColumnMovement(
            state,
            makeLinearEdges(),
            mockReverseMap(['A', 'B', 'C', 'D', 'E']),
            flatTerrain(),
        );

        expect(report.column_starts).toBe(0);
        expect(report.column_blocked).toBe(1);
        expect(state.military.brigade_movement_state?.brig_op).toBeUndefined();
        expect(state.military.formations?.brig_op?.posture).toBe('dig_in');
        expect(state.military.formations?.brig_op?.dig_in_progress).toBe(6);
        expect(state.military.brigade_movement_orders?.brig_op).toBeUndefined();
        expect(report.column_rejections).toEqual([expect.objectContaining({
            formation_id: 'brig_op',
            reason: 'posture_dig_in',
            destination_osid: 'C',
        })]);
    });

    it('still blocks a dig_in column order that no active operation authorizes', () => {
        process.env.AWWV_DEBUG_REASON_CODES = 'movement_reject';
        resetReasonCodeTopicCacheForTests();
        const state = makeState([
            makeFormation('brig_dug', 'RS', 'A', { corps_id: 'corps_1' as any, posture: 'dig_in' }),
        ], {
            military: {
                brigade_movement_orders: {
                    brig_dug: { destination_sids: ['C'], stance: 'column', owner: 'bot_discretionary' },
                },
            } as any,
        });

        const report = processOsidColumnMovement(
            state,
            makeLinearEdges(),
            mockReverseMap(['A', 'B', 'C', 'D', 'E']),
            flatTerrain(),
        );

        expect(report.column_starts).toBe(0);
        expect(report.column_blocked).toBe(1);
        expect(state.military.brigade_movement_state?.brig_dug).toBeUndefined();
        expect(state.military.brigade_movement_orders?.brig_dug).toBeUndefined();
        expect(state.military.formations?.brig_dug?.posture).toBe('dig_in');
        expect(report.column_rejections).toEqual([expect.objectContaining({
            formation_id: 'brig_dug',
            reason: 'posture_dig_in',
            destination_osid: 'C',
        })]);
    });

    it('still blocks a dig_in participant ordered to a destination the operation does not authorize', () => {
        process.env.AWWV_DEBUG_REASON_CODES = 'movement_reject';
        resetReasonCodeTopicCacheForTests();
        // The operation stages on C; the pending order is to D, so no authority covers it. The
        // operation is itself authorized (pre-planned) to isolate the destination check.
        const state = makeState([
            makeFormation('brig_op', 'RS', 'A', {
                corps_id: 'corps_1' as any,
                posture: 'dig_in',
                dig_in_progress: 5,
            }),
        ], {
            military: {
                corps_front_sectors: makeRearSector('brig_op'),
                corps_command: {
                    corps_1: { active_operations: [makeOperation('brig_op', 'C', 'execution', { isPrePlanned: true })] },
                },
                brigade_movement_orders: {
                    brig_op: { destination_sids: ['D'], stance: 'column', owner: 'bot_discretionary' },
                },
            } as any,
        });

        const report = processOsidColumnMovement(
            state,
            makeLinearEdges(),
            mockReverseMap(['A', 'B', 'C', 'D', 'E']),
            flatTerrain(),
        );

        expect(report.column_starts).toBe(0);
        expect(report.column_blocked).toBe(1);
        expect(state.military.brigade_movement_state?.brig_op).toBeUndefined();
        expect(state.military.formations?.brig_op?.posture).toBe('dig_in');
        expect(state.military.formations?.brig_op?.dig_in_progress).toBe(5);
        expect(report.column_rejections).toEqual([expect.objectContaining({
            formation_id: 'brig_op',
            reason: 'posture_dig_in',
            destination_osid: 'D',
        })]);
    });

    it('does not release dig_in posture when the operation-authorized order has no friendly path', () => {
        process.env.AWWV_DEBUG_REASON_CODES = 'movement_reject';
        resetReasonCodeTopicCacheForTests();
        // The operation stages on D, but C is enemy-held, so A cannot reach D through friendly
        // territory. The operation is authorized (pre-planned) and the order is authorized, yet
        // it is unexecutable: posture must remain untouched.
        const state = makeState([
            makeFormation('brig_op', 'RS', 'A', {
                corps_id: 'corps_1' as any,
                posture: 'dig_in',
                dig_in_progress: 7,
            }),
        ], {
            military: {
                corps_command: {
                    corps_1: { active_operations: [makeOperation('brig_op', 'D', 'execution', { isPrePlanned: true })] },
                },
                brigade_movement_orders: {
                    brig_op: { destination_sids: ['D'], stance: 'column', owner: 'bot_discretionary' },
                },
            } as any,
            political: {
                political_controllers: { A: 'RS', B: 'RS', C: 'RBiH', D: 'RS', E: 'RS' },
            } as any,
        });

        const report = processOsidColumnMovement(
            state,
            makeLinearEdges(),
            mockReverseMap(['A', 'B', 'C', 'D', 'E']),
            flatTerrain(),
        );

        expect(report.column_starts).toBe(0);
        expect(report.column_blocked).toBe(1);
        expect(state.military.brigade_movement_state?.brig_op).toBeUndefined();
        expect(state.military.formations?.brig_op?.posture).toBe('dig_in');
        expect(state.military.formations?.brig_op?.dig_in_progress).toBe(7);
        expect(report.column_rejections).toEqual([expect.objectContaining({
            formation_id: 'brig_op',
            reason: 'no_friendly_path',
        })]);
    });
});
