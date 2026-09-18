/**
 * Routine movement scope — shared authority decision (owner packet 2026-09-17).
 *
 * POLICY: for an ordinary line brigade with a valid current `assigned_sub_segment_id`,
 * discretionary front repositioning is limited to the friendly front destinations of that
 * assigned sub-segment. Authorized movement (operation, pre-staging, explicit reassignment,
 * player, lifecycle) keeps its authority. The order producer (T2) and the correction layer
 * (T6) must agree on this boundary, and a routine order that violates it must not create a
 * transit state that falsely makes the brigade unavailable to operation admission.
 *
 * This file is the composed-pipeline guard: it drives the REAL production functions
 * (`processOsidColumnMovement`, `correctTransitStates`) and the shared helper — not a
 * hand-cleared movement state. It includes an unrelated faction/corps/location fixture so the
 * rule is not encoded as a Donji Vakuf exception.
 */

import { describe, expect, it } from 'vitest';

import type { FactionId, FormationState, GameState } from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { TerrainScalarsData, TerrainScalars } from '../src/map/terrain_scalars.js';
import type { OperationalToCanonicalReverseMap } from '../src/data/operational_data.js';
import { processOsidColumnMovement } from '../src/sim/combat/osid_column_movement.js';
import { correctTransitStates } from '../src/sim/combat/commander_march_correction.js';
import {
    filterToRoutineScope,
    isDestinationInRoutineScope,
    isRoutineScopeEnforcedForOrder,
    resolveRoutineMovementScope,
} from '../src/sim/combat/brigade_routine_scope.js';
import { evaluateFrontCoverage } from '../src/sim/combat/bot_brigade_eval_front.js';
import { evaluateInteriorMovement } from '../src/sim/combat/bot_brigade_eval_movement.js';
import type { BrigadeEvaluationContext } from '../src/sim/combat/bot_brigade_eval_types.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

function emptyResult(): any {
    return {
        attack_orders: {}, posture_orders: [], movement_orders: {},
        column_march_orders: {}, eligible_attackers_by_corps: {},
    };
}

function sector(opts: {
    sectorId: string; corpsId: string; subSegmentId: string;
    friendlyOsids: string[]; enemyOsids: string[]; territoryOsids: string[];
    assigned: string[];
}): any {
    return {
        sector_id: opts.sectorId, corps_id: opts.corpsId, faction: 'RS',
        opposing_factions: ['RBiH'], edge_ids: [],
        sub_segments: [{
            sub_segment_id: opts.subSegmentId, edge_ids: [],
            friendly_osids: opts.friendlyOsids, enemy_osids: opts.enemyOsids,
            primary_brigade_ids: opts.assigned, length_edges: 1,
        }],
        length_edges: 1, territory_osids: opts.territoryOsids,
        assigned_brigade_ids: opts.assigned, reserve_brigade_ids: [], rear_brigade_ids: [],
        density: 1, threat_ratio: 1, defensive_power: 10,
        sector_stance: 'defend', stance_source: 'bot',
    };
}

/**
 * Brigade b1 at A with a SECOND friendly brigade b2 (Rule 5b needs >= 2 here).
 * Assigned sub-segment front is {A,B}. Adjacent enemy Y is not an offensive target;
 * offensive target X is adjacent to B (in scope); Z is adjacent to D (out of scope).
 */
function makeFrontCoverageCtx(opts: { offensiveTargets?: string[] } = {}): BrigadeEvaluationContext {
    const brigade = {
        id: 'b1', faction: 'RS', corps_id: 'c', status: 'active', kind: 'brigade',
        location_osid: 'A', assigned_sub_segment_id: 'ss:A',
    };
    return {
        state: {
            political: { political_controllers: { A: 'RS', B: 'RS', D: 'RS', X: 'RBiH', Y: 'RBiH', Z: 'RBiH' } },
            military: {
                corps_front_sectors: {
                    'sector:c:0': sector({
                        sectorId: 'sector:c:0', corpsId: 'c', subSegmentId: 'ss:A',
                        friendlyOsids: ['A', 'B'], enemyOsids: ['X', 'Y'],
                        territoryOsids: ['A', 'B'], assigned: ['b1', 'b2'],
                    }),
                },
                formations: {
                    b1: brigade,
                    b2: { ...brigade, id: 'b2' },
                },
            },
        } as any,
        faction: 'RS' as any,
        brigade: brigade as any,
        loc: 'A' as Osid, corpsId: 'c' as any, cmd: null,
        directive: { offensive_targets: opts.offensiveTargets ?? ['X'] } as any,
        corpsStance: 'offensive' as any, activeOp: null, isActiveSectorOperationParticipant: false,
        adjEnemy: ['Y'], isAlliedWithRBiH: false, targetAdjacentCount: new Map(),
        corpsReserve: new Map(), chosenTargets: new Map(), columnAssignments: new Map(),
        counterAttackTarget: null, brigadeSupplyState: 'adequate', isHoldBrigade: false,
        sectorRecentRetreats: new Map(), sectorCounterAttackCount: new Map(),
        adjacency: new Map<Osid, Osid[]>([
            ['A' as Osid, ['B' as Osid, 'Y' as Osid]],
            ['B' as Osid, ['A' as Osid, 'X' as Osid]],
            ['X' as Osid, ['B' as Osid]],
            ['Y' as Osid, ['A' as Osid]],
            ['D' as Osid, ['Z' as Osid]],
            ['Z' as Osid, ['D' as Osid]],
        ]),
        reverseMap: null as any, terrainCache: {},
        graphAnalysis: { osid_analysis: new Map() } as any,
        supplyStateByOsid: null, ethnicMap: undefined, osidPopulationMap: undefined,
        result: emptyResult(),
    } as any;
}

/** Interior brigade at R, assigned front {F}, path R-M-F, offensive target X adjacent to F. */
function makeInteriorCtx(opts: { offensiveTargets?: string[] } = {}): BrigadeEvaluationContext {
    const brigade = {
        id: 'b1', faction: 'RS', corps_id: 'c', status: 'active', kind: 'brigade',
        location_osid: 'R', assigned_sub_segment_id: 'ss:A',
    };
    return {
        state: {
            political: { political_controllers: { R: 'RS', M: 'RS', F: 'RS', X: 'RBiH' } },
            military: {
                corps_front_sectors: {
                    'sector:c:0': sector({
                        sectorId: 'sector:c:0', corpsId: 'c', subSegmentId: 'ss:A',
                        friendlyOsids: ['F'], enemyOsids: ['X'],
                        territoryOsids: ['R', 'M', 'F'], assigned: ['b1'],
                    }),
                },
                formations: { b1: brigade },
            },
        } as any,
        faction: 'RS' as any,
        brigade: brigade as any,
        loc: 'R' as Osid, corpsId: 'c' as any, cmd: null,
        directive: { offensive_targets: opts.offensiveTargets ?? ['X'] } as any,
        corpsStance: 'balanced' as any, activeOp: null, isActiveSectorOperationParticipant: false,
        adjEnemy: [], isAlliedWithRBiH: false, targetAdjacentCount: new Map(),
        corpsReserve: new Map(), chosenTargets: new Map(), columnAssignments: new Map(),
        counterAttackTarget: null, brigadeSupplyState: 'adequate', isHoldBrigade: false,
        sectorRecentRetreats: new Map(), sectorCounterAttackCount: new Map(),
        adjacency: new Map<Osid, Osid[]>([
            ['R' as Osid, ['M' as Osid]],
            ['M' as Osid, ['R' as Osid, 'F' as Osid]],
            ['F' as Osid, ['M' as Osid, 'X' as Osid]],
            ['X' as Osid, ['F' as Osid]],
        ]),
        reverseMap: null as any, terrainCache: {},
        graphAnalysis: { osid_analysis: new Map() } as any,
        supplyStateByOsid: null, ethnicMap: undefined, osidPopulationMap: undefined,
        result: emptyResult(),
    } as any;
}

const ADJ = ['A', 'B', 'C', 'D', 'E'];

function makeEdge(a: string, b: string): EdgeRecord {
    return { a, b } as EdgeRecord;
}
function linearEdges(): EdgeRecord[] {
    return [makeEdge('A', 'B'), makeEdge('B', 'C'), makeEdge('C', 'D'), makeEdge('D', 'E')];
}
function reverseMap(): OperationalToCanonicalReverseMap {
    const map = new Map<string, string[]>();
    for (const osid of ADJ) map.set(osid, [osid]);
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
    return { by_sid: Object.fromEntries(ADJ.map((o) => [o, flat])) };
}
function adjacency(): Map<string, string[]> {
    return new Map([
        ['A', ['B']],
        ['B', ['A', 'C']],
        ['C', ['B', 'D']],
        ['D', ['C', 'E']],
        ['E', ['D']],
    ]);
}

function makeFormation(id: string, faction: string, osid: string, opts: Partial<FormationState> = {}): FormationState {
    return {
        id,
        faction: faction as FactionId,
        kind: 'brigade',
        status: 'active',
        location_osid: osid,
        ...opts,
    } as FormationState;
}

/**
 * One corps sector with one sub-segment. `frontOsids` is the assigned sub-segment's front;
 * `reserve` and `assignedSubSegmentId` let a case opt into the special paths.
 */
function makeState(opts: {
    formationId: string;
    faction: string;
    corpsId: string;
    location: string;
    frontOsids: string[];
    territoryOsids?: string[];
    assignedSubSegmentId?: string;
    reserve?: boolean;
    order?: { destination_sids: string[]; stance?: 'column'; owner?: string };
    transit?: { destination: string; turnsRemaining?: number };
    controllers?: Record<string, string>;
}): GameState {
    const subSegmentId = 'subseg:test:0';
    const territoryOsids = opts.territoryOsids ?? opts.frontOsids;
    const formation = makeFormation(opts.formationId, opts.faction, opts.location, {
        corps_id: opts.corpsId as never,
        ...(opts.assignedSubSegmentId === undefined || opts.assignedSubSegmentId === ''
            ? {}
            : { assigned_sub_segment_id: opts.assignedSubSegmentId }),
    });

    const state = {
        meta: { turn: 2, phase: 'war', schema_version: 1, scenario_id: 'test' } as any,
        factions: [{ id: 'RS' }, { id: 'RBiH' }, { id: 'HRHB' }] as GameState['factions'],
        military: {
            formations: { [opts.formationId]: formation },
            front_pressure: {},
            brigade_movement_orders: {} as Record<string, any>,
            brigade_movement_state: {} as Record<string, any>,
            corps_front_sectors: {
                [`sector:${opts.corpsId}:0`]: {
                    sector_id: `sector:${opts.corpsId}:0`,
                    corps_id: opts.corpsId,
                    faction: opts.faction,
                    opposing_factions: ['RBiH'],
                    edge_ids: [],
                    sub_segments: [{
                        sub_segment_id: subSegmentId,
                        edge_ids: [],
                        friendly_osids: opts.frontOsids,
                        enemy_osids: [],
                        primary_brigade_ids: opts.reserve ? [] : [opts.formationId],
                        length_edges: 1,
                    }],
                    length_edges: 1,
                    territory_osids: territoryOsids,
                    assigned_brigade_ids: opts.reserve ? [] : [opts.formationId],
                    reserve_brigade_ids: opts.reserve ? [opts.formationId] : [],
                    density: 1,
                    threat_ratio: 1,
                    defensive_power: 100,
                    sector_stance: 'defend',
                    stance_source: 'bot',
                },
            },
        } as any,
        political: {
            political_controllers: opts.controllers ?? Object.fromEntries(ADJ.map((o) => [o, opts.faction])),
        } as any,
    } as GameState;

    if (opts.order) {
        (state.military as any).brigade_movement_orders[opts.formationId] = {
            destination_sids: opts.order.destination_sids,
            ...(opts.order.stance ? { stance: opts.order.stance } : {}),
            ...(opts.order.owner ? { owner: opts.order.owner } : {}),
        };
    }
    if (opts.transit) {
        (state.military as any).brigade_movement_state[opts.formationId] = {
            status: 'in_transit',
            stance: 'column',
            destination_sids: [opts.transit.destination],
            path: [opts.location, opts.transit.destination],
            turns_remaining: opts.transit.turnsRemaining ?? 2,
        };
    }
    return state;
}

// ── Shared helper ─────────────────────────────────────────────────────────────────────────

describe('resolveRoutineMovementScope', () => {
    it('restricts a line brigade with a valid assigned sub-segment', () => {
        const state = makeState({
            formationId: 'b19', faction: 'RS', corpsId: 'vrs_1st_krajina', location: 'A',
            frontOsids: ['A'], assignedSubSegmentId: 'subseg:test:0',
        });
        const scope = resolveRoutineMovementScope(state, state.military.formations!.b19);
        expect(scope.restricted).toBe(true);
        expect([...scope.destinations]).toEqual(['A']);
        expect(isDestinationInRoutineScope(scope, 'A')).toBe(true);
        expect(isDestinationInRoutineScope(scope, 'C')).toBe(false);
        expect([...filterToRoutineScope(scope, new Set(['A', 'B', 'C']))]).toEqual(['A']);
    });

    it('is unrestricted when the assignment is missing or stale', () => {
        const missing = makeState({
            formationId: 'b1', faction: 'RS', corpsId: 'corps', location: 'A', frontOsids: ['A'],
        });
        expect(resolveRoutineMovementScope(missing, missing.military.formations!.b1).restricted).toBe(false);
        expect(resolveRoutineMovementScope(missing, missing.military.formations!.b1).source).toBe('missing_assignment');

        const stale = makeState({
            formationId: 'b1', faction: 'RS', corpsId: 'corps', location: 'A', frontOsids: ['A'],
            assignedSubSegmentId: 'subseg:gone:9',
        });
        expect(resolveRoutineMovementScope(stale, stale.military.formations!.b1).source).toBe('stale_assignment');
        expect(resolveRoutineMovementScope(stale, stale.military.formations!.b1).restricted).toBe(false);
    });

    it('is unrestricted for reserve rosters', () => {
        const state = makeState({
            formationId: 'b1', faction: 'RS', corpsId: 'corps', location: 'A', frontOsids: ['A'],
            assignedSubSegmentId: 'subseg:test:0', reserve: true,
        });
        const scope = resolveRoutineMovementScope(state, state.military.formations!.b1);
        expect(scope.restricted).toBe(false);
        expect(scope.source).toBe('reserve_roster');
    });

    it('preserves the unrestricted fallback for a non-line kind', () => {
        const state = makeState({
            formationId: 'asset', faction: 'RS', corpsId: 'corps', location: 'A', frontOsids: ['A'],
            assignedSubSegmentId: 'subseg:test:0',
        });
        state.military.formations!.asset.kind = 'corps_asset' as never;
        expect(resolveRoutineMovementScope(state, state.military.formations!.asset).restricted).toBe(false);
    });
});

describe('isRoutineScopeEnforcedForOrder', () => {
    function enforced(order: any) {
        const state = makeState({
            formationId: 'b19', faction: 'RS', corpsId: 'vrs_1st_krajina', location: 'A',
            frontOsids: ['A'], assignedSubSegmentId: 'subseg:test:0',
        });
        return isRoutineScopeEnforcedForOrder(state, state.military.formations!.b19, order, adjacency());
    }

    it('enforces scope only for tagged discretionary orders under a restricted assignment', () => {
        expect(enforced({ destination_sids: ['C'], stance: 'column', owner: 'bot_discretionary' })).toBe(true);
    });

    it('does not revalidate untagged / authored-preplanned / operation orders', () => {
        expect(enforced({ destination_sids: ['C'], stance: 'column' })).toBe(false);
        expect(enforced({ destination_sids: ['C'], stance: 'column', owner: 'authored_preplanned' })).toBe(false);
    });

    it('does not enforce when the assignment is missing', () => {
        const state = makeState({
            formationId: 'b1', faction: 'RS', corpsId: 'corps', location: 'A', frontOsids: ['A'],
        });
        expect(isRoutineScopeEnforcedForOrder(
            state, state.military.formations!.b1,
            { destination_sids: ['C'], stance: 'column', owner: 'bot_discretionary' }, adjacency(),
        )).toBe(false);
    });
});

// ── Composed pipeline: Pass-2 revalidation ────────────────────────────────────────────────

describe('processOsidColumnMovement — routine scope revalidation', () => {
    it('A. rejects an out-of-sub-segment discretionary order before any transit is created', () => {
        const state = makeState({
            formationId: 'b19', faction: 'RS', corpsId: 'vrs_1st_krajina', location: 'A',
            frontOsids: ['A'], territoryOsids: ['A', 'B', 'C'], assignedSubSegmentId: 'subseg:test:0',
            order: { destination_sids: ['C'], stance: 'column', owner: 'bot_discretionary' },
        });

        const report = processOsidColumnMovement(state, linearEdges(), reverseMap(), flatTerrain());

        expect(report.column_starts).toBe(0);
        expect(report.column_blocked).toBe(1);
        // The spurious transit never exists — operation admission cannot see it.
        expect(state.military.brigade_movement_state?.b19).toBeUndefined();
        // The forbidden order is consumed, not left to be re-issued as pending state.
        expect(state.military.brigade_movement_orders?.b19).toBeUndefined();
        // The brigade stays physically put.
        expect(state.military.formations!.b19.location_osid).toBe('A');
    });

    it('B. admits and starts an in-sub-segment journey with normal travel progress', () => {
        const state = makeState({
            formationId: 'b19', faction: 'RS', corpsId: 'vrs_1st_krajina', location: 'A',
            frontOsids: ['A', 'B'], assignedSubSegmentId: 'subseg:test:0',
            order: { destination_sids: ['B'], stance: 'column', owner: 'bot_discretionary' },
        });

        const report = processOsidColumnMovement(state, linearEdges(), reverseMap(), flatTerrain());

        expect(report.column_starts).toBe(1);
        const transit = state.military.brigade_movement_state!.b19;
        expect(transit.status).toBe('in_transit');
        expect(transit.turns_remaining ?? 0).toBeGreaterThanOrEqual(1);

        // Next pass advances the same journey rather than resetting it.
        const next = processOsidColumnMovement(state, linearEdges(), reverseMap(), flatTerrain());
        expect(next.column_advances + next.column_arrivals).toBeGreaterThanOrEqual(1);
    });

    it('D. does not revalidate an authorized (untagged) out-of-sub-segment order', () => {
        const state = makeState({
            formationId: 'b19', faction: 'RS', corpsId: 'vrs_1st_krajina', location: 'A',
            frontOsids: ['A'], territoryOsids: ['A', 'B', 'C'], assignedSubSegmentId: 'subseg:test:0',
            order: { destination_sids: ['C'], stance: 'column' }, // untagged => lifecycle/repair/authorized
        });

        const report = processOsidColumnMovement(state, linearEdges(), reverseMap(), flatTerrain());
        expect(report.column_starts).toBe(1);
        expect(state.military.brigade_movement_state?.b19?.status).toBe('in_transit');
    });

    it('D2. does not revalidate an authored-preplanned out-of-sub-segment order', () => {
        const state = makeState({
            formationId: 'b19', faction: 'RS', corpsId: 'vrs_1st_krajina', location: 'A',
            frontOsids: ['A'], territoryOsids: ['A', 'B', 'C'], assignedSubSegmentId: 'subseg:test:0',
            order: { destination_sids: ['C'], stance: 'column', owner: 'authored_preplanned' },
        });

        const report = processOsidColumnMovement(state, linearEdges(), reverseMap(), flatTerrain());
        expect(report.column_starts).toBe(1);
        expect(state.military.brigade_movement_state?.b19?.owner).toBe('authored_preplanned');
    });

    it('E. rejects a pending order whose assignment became invalid after issue', () => {
        // Same order/state as A but framed as the assignment-change case: the destination is
        // outside the CURRENT valid assignment, so Pass 2 must refuse to turn it into transit.
        const state = makeState({
            formationId: 'b19', faction: 'RS', corpsId: 'vrs_1st_krajina', location: 'A',
            frontOsids: ['A'], territoryOsids: ['A', 'B', 'C', 'D'], assignedSubSegmentId: 'subseg:test:0',
            order: { destination_sids: ['D'], stance: 'column', owner: 'bot_discretionary' },
        });
        processOsidColumnMovement(state, linearEdges(), reverseMap(), flatTerrain());
        expect(state.military.brigade_movement_state?.b19).toBeUndefined();
    });

    it('G. does not restrict a reserve formation (established behaviour preserved)', () => {
        const state = makeState({
            formationId: 'res1', faction: 'RS', corpsId: 'vrs_1st_krajina', location: 'A',
            frontOsids: ['A'], territoryOsids: ['A', 'B', 'C'], assignedSubSegmentId: 'subseg:test:0', reserve: true,
            order: { destination_sids: ['C'], stance: 'column', owner: 'bot_discretionary' },
        });
        processOsidColumnMovement(state, linearEdges(), reverseMap(), flatTerrain());
        expect(state.military.brigade_movement_state?.res1?.status).toBe('in_transit');
    });

    it('F. a genuine transit remains a transit (unavailable to incompatible commitments)', () => {
        const state = makeState({
            formationId: 'b19', faction: 'RS', corpsId: 'vrs_1st_krajina', location: 'A',
            frontOsids: ['A', 'B'], assignedSubSegmentId: 'subseg:test:0',
            transit: { destination: 'B', turnsRemaining: 3 },
        });
        processOsidColumnMovement(state, linearEdges(), reverseMap(), flatTerrain());
        expect(state.military.brigade_movement_state?.b19?.status).toBe('in_transit');
    });

    it('H. applies generically to an unrelated faction, corps and location', () => {
        const state = makeState({
            formationId: 'hrhb_mostar_brigade', faction: 'HRHB', corpsId: 'hvo_southeast_herzegovina',
            location: 'A', frontOsids: ['A'], territoryOsids: ['A', 'B', 'C'], assignedSubSegmentId: 'subseg:test:0',
            order: { destination_sids: ['C'], stance: 'column', owner: 'bot_discretionary' },
        });
        const report = processOsidColumnMovement(state, linearEdges(), reverseMap(), flatTerrain());
        expect(report.column_blocked).toBe(1);
        expect(state.military.brigade_movement_state?.hrhb_mostar_brigade).toBeUndefined();
    });
});

// ── T6 backstop ───────────────────────────────────────────────────────────────────────────

describe('correctTransitStates — same scope decision as the producer', () => {
    it('C. cancels an out-of-scope stale transit and leaves the brigade physically in place', () => {
        const state = makeState({
            formationId: 'b19', faction: 'RS', corpsId: 'vrs_1st_krajina', location: 'A',
            frontOsids: ['A'], assignedSubSegmentId: 'subseg:test:0',
            transit: { destination: 'C' },
        });
        correctTransitStates(state, adjacency());
        expect(state.military.brigade_movement_state?.b19).toBeUndefined();
        expect(state.military.brigade_movement_orders?.b19).toBeUndefined();
        expect(state.military.formations!.b19.location_osid).toBe('A');
    });

    it('leaves an in-scope transit intact', () => {
        const state = makeState({
            formationId: 'b19', faction: 'RS', corpsId: 'vrs_1st_krajina', location: 'A',
            frontOsids: ['A', 'B'], assignedSubSegmentId: 'subseg:test:0',
            transit: { destination: 'B' },
        });
        // Keep destination friendly and non-isolated.
        correctTransitStates(state, adjacency());
        expect(state.military.brigade_movement_state?.b19?.status).toBe('in_transit');
    });
});

// ── Producer tier (T2) — the layer the helper tests could not see ─────────────────────────
//
// Both defects found in review lived HERE: a helper suite that drives only
// `processOsidColumnMovement` and `correctTransitStates` passes while the ORDER PRODUCER is
// silently emitting nothing. These cases drive the real evaluator functions.

describe('T2 producer — the scope must not forbid lawful movement', () => {
    it('I. an in-scope redeploy toward an offensive target survives (Rule 5b)', () => {
        // Brigade at A; assigned sub-segment front is {A,B}, so B is a LEGAL destination.
        // Adjacent enemy Y is not a target; offensive target X is adjacent to B.
        // Regression: intersecting the ENEMY target set with the FRIENDLY scope emptied it,
        // inverted `hasAdjacentTarget` and suppressed this lawful in-sub-segment move.
        const ctx = makeFrontCoverageCtx();
        evaluateFrontCoverage(ctx);
        expect(ctx.result.movement_orders.b1).toBe('B');
    });

    it('I2. a redeploy toward an out-of-scope offensive target is NOT issued', () => {
        // Same fixture, but the only target is adjacent to D — outside the assigned front.
        const ctx = makeFrontCoverageCtx({ offensiveTargets: ['Z'] });
        evaluateFrontCoverage(ctx);
        expect(ctx.result.movement_orders.b1).toBeUndefined();
    });

    it('J. a restricted interior brigade can still march toward its own assigned front', () => {
        // Interior brigade at R, assigned front {F}, path R-M-F, target X adjacent to F.
        // Regression: the FIRST STEP M was scope-checked against the sub-segment front and
        // rejected, and the block returned true anyway — suppressing `.ownCorpsFront` and
        // `.fallback` below it and freezing the formation in the interior permanently.
        const ctx = makeInteriorCtx();
        evaluateInteriorMovement(ctx);
        expect(ctx.result.movement_orders.b1).toBe('M');
    });

    it('J2. rejecting one candidate does not suppress the brigade\'s remaining rules', () => {
        // No offensive target reachable in scope: `.offensiveTarget` must decline (return
        // false) rather than claim the brigade, so `.ownCorpsFront` still routes it to F.
        const ctx = makeInteriorCtx({ offensiveTargets: ['UNREACHABLE'] });
        evaluateInteriorMovement(ctx);
        expect(ctx.result.movement_orders.b1).toBe('M');
    });
});

// ── Higher-priority authority survives the T3 revalidation ────────────────────────────────

describe('T3 revalidation — corps-directive authority is not routine movement', () => {
    function stateWithTwoSectors(
        directive: Record<string, unknown>,
        opts: { location?: string; frontOsids?: string[]; destination?: string } = {},
    ): GameState {
        const location = opts.location ?? 'A';
        const state = makeState({
            formationId: 'b19', faction: 'RS', corpsId: 'vrs_1st_krajina', location,
            frontOsids: opts.frontOsids ?? [location], territoryOsids: ['A', 'B', 'C', 'D', 'E'],
            assignedSubSegmentId: 'subseg:test:0',
            order: { destination_sids: [opts.destination ?? 'D'], stance: 'column', owner: 'bot_discretionary' },
        });
        (state.military as any).corps_front_sectors['sector:vrs_1st_krajina:1'] = {
            sector_id: 'sector:vrs_1st_krajina:1', corps_id: 'vrs_1st_krajina', faction: 'RS',
            opposing_factions: ['RBiH'], edge_ids: [],
            sub_segments: [{
                sub_segment_id: 'subseg:test:1', edge_ids: [], friendly_osids: ['D'],
                enemy_osids: [], primary_brigade_ids: [], length_edges: 1,
            }],
            length_edges: 1, territory_osids: ['D'], assigned_brigade_ids: [],
            reserve_brigade_ids: [], rear_brigade_ids: [], density: 0, threat_ratio: 1,
            defensive_power: 0, sector_stance: 'defend', stance_source: 'bot',
        };
        (state.military as any).corps_command = {
            vrs_1st_krajina: { active_operations: [], directive },
        };
        return state;
    }

    function enforced(state: GameState): boolean {
        return isRoutineScopeEnforcedForOrder(
            state, state.military.formations!.b19,
            state.military.brigade_movement_orders!.b19, adjacency(),
        );
    }

    // `owner: 'bot_discretionary'` is stamped on EVERY bot order regardless of which rule
    // produced it, so the tag alone cannot tell a routine march from a corps-directed one.
    it('K. a brigade under an explicit sector_reassignment_order is not deleted as out-of-scope', () => {
        expect(enforced(stateWithTwoSectors({
            sector_reassignment_orders: [{ brigade_id: 'b19', to_sector_id: 'sector:vrs_1st_krajina:1' }],
        }))).toBe(false);
    });

    it('K2. without any such directive the same order IS out of scope', () => {
        expect(enforced(stateWithTwoSectors({}))).toBe(true);
    });

    it('K3. the exemption follows the WHOLE journey, not just its final cell', () => {
        // Rule 5b2 emits `findNearestFriendlyOsidInSet`'s return value, which is the FIRST STEP
        // of the path — not the target sector's front. An exemption keyed on "destination lies
        // inside the named sector" would therefore pass the 1-hop case and still delete every
        // reassignment 2+ hops out: exactly the rear brigades density equalization exists to
        // move. C is an intermediate cell, in neither sector.
        const state = stateWithTwoSectors({
            sector_reassignment_orders: [{ brigade_id: 'b19', to_sector_id: 'sector:vrs_1st_krajina:1' }],
        });
        (state.military as any).brigade_movement_orders.b19.destination_sids = ['C'];
        expect(enforced(state)).toBe(false);
    });

    it('K4. corps-WIDE directive fields do not exempt anyone', () => {
        // `priority_sector_id` and `reinforce_sector_ids` name sectors for the whole corps.
        // Honouring them here would hand every brigade in the corps a blanket waiver over the
        // corps main effort — the precise slice of front stale orders drag brigades toward, and
        // the drift the correction layer exists to cancel.
        expect(enforced(stateWithTwoSectors({ priority_sector_id: 'sector:vrs_1st_krajina:1' }))).toBe(true);
        expect(enforced(stateWithTwoSectors({ reinforce_sector_ids: ['sector:vrs_1st_krajina:1'] }))).toBe(true);
    });

    it('K4b. the exemption authorizes movement TOWARD the ordered sector, not anywhere', () => {
        // Chain is A-B-C-D-E; the ordered sector's front is {D}. Brigade stands at C (1 hop from
        // D) and the order points at A (3 hops from D) — i.e. AWAY. That is not covered by the
        // reassignment authority and stays subject to the routine scope. Without this guard a
        // live reassignment would also shield an unrelated stale order, which could become a
        // transit and then be skipped by the bot's in-transit guard while the brigade travelled
        // somewhere nobody ordered.
        const directive = {
            sector_reassignment_orders: [{ brigade_id: 'b19', to_sector_id: 'sector:vrs_1st_krajina:1' }],
        };
        expect(enforced(stateWithTwoSectors(directive, { location: 'C', destination: 'A' }))).toBe(true);
        // The same brigade ordered toward D is exempt.
        expect(enforced(stateWithTwoSectors(directive, { location: 'C', destination: 'D' }))).toBe(false);
    });

    it('K5. a reassignment naming a DIFFERENT brigade does not exempt this one', () => {
        expect(enforced(stateWithTwoSectors({
            sector_reassignment_orders: [{ brigade_id: 'someone_else', to_sector_id: 'sector:vrs_1st_krajina:1' }],
        }))).toBe(true);
    });
});

// ── T6 keeps its own established contract ─────────────────────────────────────────────────

describe("resolveRoutineMovementScope — consumer: 'correction' (T6)", () => {
    // T6 has never had a reserve carve-out, and reserves keep a STALE `assigned_sub_segment_id`
    // because sub-segment assignment skips them. Adopting T2's carve-out here would silently
    // stop correcting formations T6 corrected before this policy existed.
    it('still restricts a reserve-rostered brigade that carries a stale assignment', () => {
        const state = makeState({
            formationId: 'b1', faction: 'RS', corpsId: 'corps', location: 'A', frontOsids: ['A'],
            assignedSubSegmentId: 'subseg:test:0', reserve: true,
        });
        expect(resolveRoutineMovementScope(state, state.military.formations!.b1, 'routing').restricted).toBe(false);
        expect(resolveRoutineMovementScope(state, state.military.formations!.b1, 'correction').restricted).toBe(true);
    });

    it('still restricts a non-line kind that carries an assignment', () => {
        const state = makeState({
            formationId: 'asset', faction: 'RS', corpsId: 'corps', location: 'A', frontOsids: ['A'],
            assignedSubSegmentId: 'subseg:test:0',
        });
        state.military.formations!.asset.kind = 'corps_asset' as never;
        expect(resolveRoutineMovementScope(state, state.military.formations!.asset, 'routing').restricted).toBe(false);
        expect(resolveRoutineMovementScope(state, state.military.formations!.asset, 'correction').restricted).toBe(true);
    });

    it('is unrestricted for both consumers when the assignment is missing or stale', () => {
        for (const consumer of ['routing', 'correction'] as const) {
            const missing = makeState({
                formationId: 'b1', faction: 'RS', corpsId: 'corps', location: 'A', frontOsids: ['A'],
            });
            expect(resolveRoutineMovementScope(missing, missing.military.formations!.b1, consumer).restricted).toBe(false);
            const stale = makeState({
                formationId: 'b1', faction: 'RS', corpsId: 'corps', location: 'A', frontOsids: ['A'],
                assignedSubSegmentId: 'subseg:gone:9',
            });
            expect(resolveRoutineMovementScope(stale, stale.military.formations!.b1, consumer).source).toBe('stale_assignment');
        }
    });
});
