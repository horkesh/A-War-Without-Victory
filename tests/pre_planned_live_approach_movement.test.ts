import { describe, expect, it } from 'vitest';

import {
    _ALL_PRE_PLANNED,
    prestageDeferredPrePlannedElites,
} from '../src/sim/combat/pre_planned_operations.js';
import { processOsidColumnMovement } from '../src/sim/combat/osid_column_movement.js';
import { getOperationAuthorizedDestinations } from '../src/sim/combat/brigade_routine_scope.js';
import type { CorpsOperation, FormationState, GameState } from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { OperationalToCanonicalReverseMap } from '../src/data/operational_data.js';

const OP_NAME = 'Operation Lukavac 93';
const CORPS = 'vrs_sarajevo_romanija';
const BRIGADE = 'rs_1st_sarajevo_mechanized';
const STAGING = 'op:trnovo:gornja_presjenica';
const APPROACH = 'op:trnovo:kijevo_2';
const OBJECTIVE = 'op:trnovo:delijas';
const UNRELATED = 'op:trnovo:tusila';
const MID = 'op:trnovo:lukavac';
const OTHER_OP_NAME = 'Other Planning Op';
const SUBSEGMENT = 'subseg:test:lukavac';

const LUKAVAC_DEF = _ALL_PRE_PLANNED.find((def) => def.name === OP_NAME);
if (!LUKAVAC_DEF) throw new Error('missing Lukavac pre-planned definition');
const PRESTAGE_TURN = LUKAVAC_DEF.prestage_from;
if (PRESTAGE_TURN == null) throw new Error('Lukavac definition lost its prestage turn');

const ADJACENCY = new Map<string, string[]>([
    [STAGING, [APPROACH]],
    [APPROACH, [STAGING, OBJECTIVE, MID]],
    [OBJECTIVE, [APPROACH]],
    [MID, [APPROACH]],
    [UNRELATED, []],
]);
const REVERSE_MAP: OperationalToCanonicalReverseMap = new Map(
    [STAGING, APPROACH, OBJECTIVE, UNRELATED, MID].map((osid) => [osid, [osid]]),
);
const EDGES = [
    { a: STAGING, b: APPROACH },
    { a: APPROACH, b: OBJECTIVE },
    { a: MID, b: APPROACH },
] as EdgeRecord[];
const FLAT_TERRAIN = {
    by_sid: Object.fromEntries([STAGING, APPROACH, OBJECTIVE, UNRELATED, MID].map((osid) => [
        osid,
        {
            road_access_index: 0.5,
            river_crossing_penalty: 0,
            elevation_mean_m: 200,
            elevation_stddev_m: 10,
            slope_index: 0.1,
            terrain_friction_index: 0.1,
        },
    ])),
};

type StateOptions = {
    location?: string;
    orderDestination?: string | string[];
    orderOwner?: 'bot_discretionary' | 'authored_preplanned' | undefined;
    transitDestination?: string | string[];
    transitTurns?: number;
    transitOwner?: 'bot_discretionary' | 'authored_preplanned' | undefined;
    phase?: 'planning' | 'execution' | 'recovery';
    active?: boolean;
    participant?: boolean;
    queued?: boolean;
    conflictingOperation?: boolean;
    playerFaction?: string;
};

function makeLiveOperation(options: StateOptions): CorpsOperation {
    const participant = options.participant !== false;
    const axes = participant
        ? [{
            axis_id: 'trnovo_corridor',
            name: 'Trnovo Corridor',
            assigned_brigades: [BRIGADE],
            objectives: [OBJECTIVE],
            current_objective_index: 0,
            status: 'executing',
            failure_count: 0,
            consecutive_failures_on_current: 0,
            momentum: 0,
            attack_attempt_count: 0,
            objective_capture_count: 0,
            movement_only_execution_turns: 0,
            idle_execution_turn_streak: 0,
            staging_osid: STAGING,
        }]
        : [];
    return {
        name: OP_NAME,
        type: 'sector_attack',
        phase: options.phase ?? 'planning',
        started_turn: 60,
        phase_started_turn: 60,
        participating_brigades: participant ? [BRIGADE] : [],
        objectives: [OBJECTIVE],
        current_objective_index: 0,
        staging_osid: STAGING,
        is_pre_planned: true,
        axes,
    } as unknown as CorpsOperation;
}

function makeOtherOperation(): CorpsOperation {
    return {
        name: OTHER_OP_NAME,
        type: 'sector_attack',
        phase: 'planning',
        started_turn: 61,
        phase_started_turn: 61,
        participating_brigades: [BRIGADE],
        objectives: [OBJECTIVE],
        current_objective_index: 0,
        staging_osid: STAGING,
        is_pre_planned: true,
        axes: [{
            axis_id: 'other',
            name: 'Other',
            assigned_brigades: [BRIGADE],
            objectives: [OBJECTIVE],
            current_objective_index: 0,
            status: 'executing',
            failure_count: 0,
            consecutive_failures_on_current: 0,
            momentum: 0,
            attack_attempt_count: 0,
            objective_capture_count: 0,
            movement_only_execution_turns: 0,
            idle_execution_turn_streak: 0,
            staging_osid: STAGING,
        }],
    } as unknown as CorpsOperation;
}

function makeState(options: StateOptions = {}): GameState {
    const liveOperation = makeLiveOperation(options);
    const activeOperations = options.active === false
        ? []
        : options.conflictingOperation
            ? [makeOtherOperation()]
            : [liveOperation];
    const formation: FormationState = {
        id: BRIGADE,
        name: '1st Sarajevo Mechanized Brigade',
        kind: 'brigade',
        status: 'active',
        faction: 'RS',
        corps_id: CORPS,
        personnel: 1000,
        cohesion: 50,
        morale: 55,
        location_osid: options.location ?? STAGING,
        assigned_sub_segment_id: SUBSEGMENT,
        posture: 'defend',
        composition: {
            infantry: 800,
            tanks: 40,
            artillery: 30,
            aa_systems: 5,
            tank_condition: { operational: 0.8 },
            artillery_condition: { operational: 0.8 },
        },
    } as unknown as FormationState;
    const orderDestinations = options.orderDestination == null
        ? []
        : Array.isArray(options.orderDestination)
            ? [...options.orderDestination]
            : [options.orderDestination];
    const transitDestinations = options.transitDestination == null
        ? []
        : Array.isArray(options.transitDestination)
            ? [...options.transitDestination]
            : [options.transitDestination];
    const state = {
        schema_version: 0,
        meta: {
            turn: PRESTAGE_TURN,
            phase: 'war',
            seed: 'lukavac-live-approach',
            player_faction: options.playerFaction ?? 'RBiH',
        },
        factions: [{ id: 'RS' }, { id: 'RBiH' }],
        military: {
            formations: { [BRIGADE]: formation },
            corps_command: {
                [CORPS]: {
                    command_span: 5,
                    subordinate_count: 1,
                    og_slots: 0,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'offensive',
                    active_operations: activeOperations,
                    queued_operations: options.queued ? [OP_NAME] : [],
                },
            },
            corps_front_sectors: {
                'sector:test:lukavac': {
                    sector_id: 'sector:test:lukavac',
                    corps_id: CORPS,
                    faction: 'RS',
                    opposing_factions: ['RBiH'],
                    edge_ids: [],
                    sub_segments: [{
                        sub_segment_id: SUBSEGMENT,
                        edge_ids: [],
                        friendly_osids: [STAGING],
                        enemy_osids: [OBJECTIVE],
                        primary_brigade_ids: [BRIGADE],
                        length_edges: 1,
                    }],
                    length_edges: 1,
                    territory_osids: [STAGING],
                    assigned_brigade_ids: [BRIGADE],
                    reserve_brigade_ids: [],
                    rear_brigade_ids: [],
                    density: 1,
                    threat_ratio: 1,
                    defensive_power: 10,
                    sector_stance: 'defend',
                    stance_source: 'bot',
                },
            },
            brigade_movement_orders: orderDestinations.length > 0
                ? {
                    [BRIGADE]: {
                        destination_sids: orderDestinations,
                        stance: 'column',
                        ...(options.orderOwner ? { owner: options.orderOwner } : {}),
                    },
                }
                : {},
            brigade_movement_state: transitDestinations.length > 0
                ? {
                    [BRIGADE]: {
                        status: 'in_transit',
                        stance: 'column',
                        destination_sids: transitDestinations,
                        path: [options.location ?? MID, ...transitDestinations],
                        turns_remaining: options.transitTurns ?? 1,
                        ...(options.transitOwner ? { owner: options.transitOwner } : {}),
                    },
                }
                : {},
            front_pressure: {},
        },
        political: {
            political_controllers: {
                [STAGING]: 'RS',
                [APPROACH]: 'RS',
                [OBJECTIVE]: 'RBiH',
                [UNRELATED]: 'RS',
                [MID]: 'RS',
            },
        },
    } as unknown as GameState;
    return state;
}

function runMovement(state: GameState) {
    return processOsidColumnMovement(
        state,
        EDGES,
        REVERSE_MAP,
        FLAT_TERRAIN as never,
        ADJACENCY,
    );
}

describe('live planning operation approach movement across prestaging', () => {
    it('preserves an active planning participant approach order at staging and starts normal transit', () => {
        const state = makeState({
            location: STAGING,
            orderDestination: APPROACH,
            orderOwner: 'bot_discretionary',
        });
        const controllersBefore = structuredClone(state.political.political_controllers);
        const operation = state.military.corps_command?.[CORPS]?.active_operations?.[0];
        expect(operation?.phase).toBe('planning');
        expect(operation?.axes?.[0]?.objectives).toEqual([OBJECTIVE]);
        expect(operation?.axes?.[0]?.objectives).not.toContain(APPROACH);
        expect(getOperationAuthorizedDestinations(
            state,
            BRIGADE,
            operation,
            ADJACENCY,
            REVERSE_MAP,
        ).has(APPROACH)).toBe(true);

        prestageDeferredPrePlannedElites(state, ADJACENCY as never, REVERSE_MAP);
        expect(state.military.brigade_movement_orders?.[BRIGADE]?.destination_sids).toEqual([APPROACH]);

        const report = runMovement(state);
        expect(report.column_starts).toBe(1);
        expect(state.military.brigade_movement_state?.[BRIGADE]).toMatchObject({
            status: 'in_transit',
            destination_sids: [APPROACH],
        });
        expect(state.military.brigade_movement_state?.[BRIGADE]?.turns_remaining)
            .toBeGreaterThanOrEqual(1);
        expect(state.political.political_controllers).toEqual(controllersBefore);
    });

    it('preserves an already in-transit participant approach column and arrives normally', () => {
        const state = makeState({
            location: MID,
            transitDestination: APPROACH,
            transitTurns: 1,
            transitOwner: 'bot_discretionary',
        });
        prestageDeferredPrePlannedElites(state, ADJACENCY as never, REVERSE_MAP);
        expect(state.military.brigade_movement_state?.[BRIGADE]).toMatchObject({
            status: 'in_transit',
            destination_sids: [APPROACH],
            turns_remaining: 1,
        });

        const report = runMovement(state);
        expect(report.column_arrivals).toBe(1);
        expect(state.military.formations?.[BRIGADE]?.location_osid).toBe(APPROACH);
    });

    it('preserves the live approach through adjacency-only public prestage plumbing', () => {
        const state = makeState({
            location: STAGING,
            orderDestination: APPROACH,
            orderOwner: 'bot_discretionary',
        });
        prestageDeferredPrePlannedElites(state, ADJACENCY as never);
        expect(state.military.brigade_movement_orders?.[BRIGADE]?.destination_sids).toEqual([APPROACH]);
    });

    it('authorizes the remaining hostile objective approach after a friendly first objective is filtered', () => {
        const state = makeState({
            location: STAGING,
            orderDestination: APPROACH,
            orderOwner: 'bot_discretionary',
        });
        const operation = state.military.corps_command?.[CORPS]?.active_operations?.[0];
        expect(operation?.axes?.[0]?.objectives).toEqual([OBJECTIVE]);
        expect(state.political.political_controllers?.[APPROACH]).toBe('RS');
        expect(state.political.political_controllers?.[OBJECTIVE]).toBe('RBiH');
        expect(getOperationAuthorizedDestinations(
            state,
            BRIGADE,
            operation,
            ADJACENCY,
            REVERSE_MAP,
        ).has(APPROACH)).toBe(true);

        prestageDeferredPrePlannedElites(state, ADJACENCY as never, REVERSE_MAP);
        expect(state.military.brigade_movement_orders?.[BRIGADE]?.destination_sids).toEqual([APPROACH]);
    });

    it('preserves a pending own-approach order from outside authored staging over a real friendly route', () => {
        const state = makeState({
            location: MID,
            orderDestination: APPROACH,
            orderOwner: 'bot_discretionary',
        });
        prestageDeferredPrePlannedElites(state, ADJACENCY as never, REVERSE_MAP);
        expect(state.military.brigade_movement_orders?.[BRIGADE]).toMatchObject({
            destination_sids: [APPROACH],
            owner: 'bot_discretionary',
        });
        const report = runMovement(state);
        expect(report.column_starts).toBe(1);
        expect(state.military.brigade_movement_state?.[BRIGADE]).toMatchObject({
            status: 'in_transit',
            destination_sids: [APPROACH],
            path: [MID, APPROACH],
        });
    });

    it('holds a participant after ordinary arrival at its own approach on the next prestage', () => {
        const state = makeState({
            location: STAGING,
            orderDestination: APPROACH,
            orderOwner: 'bot_discretionary',
        });
        prestageDeferredPrePlannedElites(state, ADJACENCY as never, REVERSE_MAP);
        expect(state.military.brigade_movement_orders?.[BRIGADE]?.destination_sids).toEqual([APPROACH]);
        runMovement(state);
        expect(state.military.brigade_movement_state?.[BRIGADE]?.status).toBe('in_transit');

        state.meta.turn += 1;
        const arrival = runMovement(state);
        expect(arrival.column_arrivals).toBe(1);
        expect(state.military.formations?.[BRIGADE]?.location_osid).toBe(APPROACH);
        expect(state.military.brigade_movement_state?.[BRIGADE]).toBeUndefined();

        prestageDeferredPrePlannedElites(state, ADJACENCY as never, REVERSE_MAP);
        expect(state.military.formations?.[BRIGADE]?.location_osid).toBe(APPROACH);
        expect(state.military.brigade_movement_orders?.[BRIGADE]).toBeUndefined();
        expect(state.military.brigade_movement_state?.[BRIGADE]).toBeUndefined();
    });

    it('holds an arrived participant repeatedly instead of emitting a return-to-staging order', () => {
        const state = makeState({ location: APPROACH });
        const controllersBefore = structuredClone(state.political.political_controllers);
        prestageDeferredPrePlannedElites(state, ADJACENCY as never, REVERSE_MAP);
        expect(state.military.brigade_movement_orders?.[BRIGADE]).toBeUndefined();
        expect(state.military.brigade_movement_state?.[BRIGADE]).toBeUndefined();
        prestageDeferredPrePlannedElites(state, ADJACENCY as never, REVERSE_MAP);
        expect(state.military.brigade_movement_orders?.[BRIGADE]).toBeUndefined();
        expect(state.military.brigade_movement_state?.[BRIGADE]).toBeUndefined();
        expect(state.political.political_controllers).toEqual(controllersBefore);
    });

    it('cancels an unrelated discretionary departure and holds at the valid approach', () => {
        const pending = makeState({
            location: APPROACH,
            orderDestination: UNRELATED,
            orderOwner: 'bot_discretionary',
        });
        prestageDeferredPrePlannedElites(pending, ADJACENCY as never, REVERSE_MAP);
        expect(pending.military.brigade_movement_orders?.[BRIGADE]).toBeUndefined();
        expect(pending.military.brigade_movement_state?.[BRIGADE]).toBeUndefined();

        const transit = makeState({
            location: APPROACH,
            transitDestination: UNRELATED,
            transitTurns: 2,
            transitOwner: 'bot_discretionary',
        });
        prestageDeferredPrePlannedElites(transit, ADJACENCY as never, REVERSE_MAP);
        expect(transit.military.brigade_movement_state?.[BRIGADE]).toBeUndefined();
        expect(transit.military.brigade_movement_orders?.[BRIGADE]).toBeUndefined();
    });

    it('leaves manual or protected movement at a valid approach untouched', () => {
        const manualOrder = makeState({
            location: APPROACH,
            orderDestination: UNRELATED,
        });
        prestageDeferredPrePlannedElites(manualOrder, ADJACENCY as never, REVERSE_MAP);
        expect(manualOrder.military.brigade_movement_orders?.[BRIGADE]).toMatchObject({
            destination_sids: [UNRELATED],
        });

        const manualTransit = makeState({
            location: APPROACH,
            transitDestination: UNRELATED,
            transitTurns: 2,
        });
        prestageDeferredPrePlannedElites(manualTransit, ADJACENCY as never, REVERSE_MAP);
        expect(manualTransit.military.brigade_movement_state?.[BRIGADE]).toMatchObject({
            status: 'in_transit',
            destination_sids: [UNRELATED],
        });
    });

    it('grants no arrival hold for wrong-axis, nonparticipant, hostile or queued states', () => {
        const wrongAxis = makeState({ location: UNRELATED });
        prestageDeferredPrePlannedElites(wrongAxis, ADJACENCY as never, REVERSE_MAP);
        expect(wrongAxis.military.brigade_movement_orders?.[BRIGADE]?.destination_sids).toEqual([STAGING]);

        const nonparticipant = makeState({ location: APPROACH, participant: false });
        prestageDeferredPrePlannedElites(nonparticipant, ADJACENCY as never, REVERSE_MAP);
        expect(nonparticipant.military.brigade_movement_orders?.[BRIGADE]?.destination_sids).toEqual([STAGING]);

        const hostile = makeState({ location: OBJECTIVE });
        prestageDeferredPrePlannedElites(hostile, ADJACENCY as never, REVERSE_MAP);
        expect(hostile.military.brigade_movement_orders?.[BRIGADE]?.destination_sids).toEqual([STAGING]);

        const queued = makeState({ location: APPROACH, active: false, queued: true });
        prestageDeferredPrePlannedElites(queued, ADJACENCY as never, REVERSE_MAP);
        expect(queued.military.brigade_movement_orders?.[BRIGADE]?.destination_sids).toEqual([STAGING]);
    });

    it('uses legacy off-staging concentration for a nonparticipant untagged pending order', () => {
        const state = makeState({
            location: MID,
            orderDestination: UNRELATED,
            active: false,
        });
        prestageDeferredPrePlannedElites(state, ADJACENCY as never, REVERSE_MAP);
        expect(state.military.brigade_movement_orders?.[BRIGADE]).toMatchObject({
            destination_sids: [STAGING],
            owner: 'authored_preplanned',
        });
    });

    it.each(['in_transit', 'packing', 'unpacking'] as const)(
        'keeps the original at-staging Main Staff reclaim rule for %s movement',
        (status) => {
            const state = makeState({ location: STAGING });
            state.military.formations![BRIGADE]!.corps_id = 'vrs_main_staff' as never;
            state.military.brigade_movement_state = {
                [BRIGADE]: {
                    status,
                    destination_sids: [UNRELATED],
                    turns_remaining: 1,
                },
            } as never;
            prestageDeferredPrePlannedElites(state, ADJACENCY as never, REVERSE_MAP);
            expect(
                state.military.brigade_movement_state?.[BRIGADE],
                `legacy away movement must be reclaimed for status ${status}`,
            ).toBeUndefined();
            expect(state.military.brigade_movement_orders?.[BRIGADE]).toBeUndefined();
        },
    );

    it('does not let a valid pending order mask unrelated active transit', () => {
        const botTransit = makeState({
            location: MID,
            transitDestination: UNRELATED,
            transitTurns: 2,
            transitOwner: 'bot_discretionary',
            orderDestination: APPROACH,
            orderOwner: 'bot_discretionary',
        });
        prestageDeferredPrePlannedElites(botTransit, ADJACENCY as never, REVERSE_MAP);
        expect(botTransit.military.brigade_movement_state?.[BRIGADE]).toBeUndefined();
        expect(botTransit.military.brigade_movement_orders?.[BRIGADE]?.destination_sids).toEqual([STAGING]);

        const protectedTransit = makeState({
            location: MID,
            transitDestination: UNRELATED,
            transitTurns: 2,
            orderDestination: APPROACH,
            orderOwner: 'bot_discretionary',
        });
        prestageDeferredPrePlannedElites(protectedTransit, ADJACENCY as never, REVERSE_MAP);
        expect(protectedTransit.military.brigade_movement_state?.[BRIGADE]).toMatchObject({
            status: 'in_transit',
            destination_sids: [UNRELATED],
        });
        expect(protectedTransit.military.brigade_movement_orders?.[BRIGADE]?.destination_sids).toEqual([APPROACH]);
    });

    it('does not shield an unauthorized first pending destination with a later lawful approach', () => {
        const state = makeState({
            location: STAGING,
            orderDestination: [UNRELATED, APPROACH],
            orderOwner: 'bot_discretionary',
        });
        prestageDeferredPrePlannedElites(state, ADJACENCY as never, REVERSE_MAP);
        expect(state.military.brigade_movement_orders?.[BRIGADE]).toBeUndefined();
    });

    it('does not shield an unauthorized first in-transit destination with a later lawful approach', () => {
        const state = makeState({
            location: MID,
            transitDestination: [UNRELATED, APPROACH],
            transitTurns: 2,
            transitOwner: 'bot_discretionary',
        });
        prestageDeferredPrePlannedElites(state, ADJACENCY as never, REVERSE_MAP);
        expect(state.military.brigade_movement_state?.[BRIGADE]).toBeUndefined();
        expect(state.military.brigade_movement_orders?.[BRIGADE]?.destination_sids).toEqual([STAGING]);
    });

    it('does not shield a hostile first destination with a later lawful approach', () => {
        const state = makeState({
            location: STAGING,
            orderDestination: [OBJECTIVE, APPROACH],
            orderOwner: 'bot_discretionary',
        });
        prestageDeferredPrePlannedElites(state, ADJACENCY as never, REVERSE_MAP);
        expect(state.military.brigade_movement_orders?.[BRIGADE]).toBeUndefined();
    });

    it('still reclaims an unrelated discretionary destination to the operation staging area', () => {
        const state = makeState({
            location: MID,
            transitDestination: UNRELATED,
            transitTurns: 2,
            transitOwner: 'bot_discretionary',
        });
        prestageDeferredPrePlannedElites(state, ADJACENCY as never, REVERSE_MAP);
        expect(state.military.brigade_movement_state?.[BRIGADE]).toBeUndefined();
        expect(state.military.brigade_movement_orders?.[BRIGADE]?.destination_sids).toEqual([STAGING]);
    });

    it('grants no exemption without a live operation, without spatial context, or for a nonparticipant', () => {
        const noOperation = makeState({
            location: STAGING,
            orderDestination: APPROACH,
            orderOwner: 'bot_discretionary',
            active: false,
        });
        prestageDeferredPrePlannedElites(noOperation, ADJACENCY as never, REVERSE_MAP);
        expect(noOperation.military.brigade_movement_orders?.[BRIGADE]).toBeUndefined();

        const noSpatialContext = makeState({
            location: STAGING,
            orderDestination: APPROACH,
            orderOwner: 'bot_discretionary',
        });
        prestageDeferredPrePlannedElites(noSpatialContext);
        expect(noSpatialContext.military.brigade_movement_orders?.[BRIGADE]).toBeUndefined();

        const nonparticipant = makeState({
            location: STAGING,
            orderDestination: APPROACH,
            orderOwner: 'bot_discretionary',
            participant: false,
        });
        prestageDeferredPrePlannedElites(nonparticipant, ADJACENCY as never, REVERSE_MAP);
        expect(nonparticipant.military.brigade_movement_orders?.[BRIGADE]).toBeUndefined();
    });

    it('does not treat a terminal operation as an approach authority', () => {
        const state = makeState({
            location: STAGING,
            orderDestination: APPROACH,
            orderOwner: 'bot_discretionary',
            phase: 'recovery',
        });
        const operation = state.military.corps_command?.[CORPS]?.active_operations?.[0];
        expect(getOperationAuthorizedDestinations(
            state,
            BRIGADE,
            operation,
            ADJACENCY,
            REVERSE_MAP,
        ).size).toBe(0);
        const before = structuredClone(state.military.brigade_movement_orders?.[BRIGADE]);
        prestageDeferredPrePlannedElites(state, ADJACENCY as never, REVERSE_MAP);
        // Legacy early-return for a non-planning live operation is preserved; the
        // approach authority itself correctly returns no destinations.
        expect(state.military.brigade_movement_orders?.[BRIGADE]).toEqual(before);
    });

    it('still sets a concentration order for a queued/prelaunch operation', () => {
        const state = makeState({
            location: MID,
            queued: true,
            active: false,
        });
        prestageDeferredPrePlannedElites(state, ADJACENCY as never, REVERSE_MAP);
        expect(state.military.brigade_movement_orders?.[BRIGADE]).toMatchObject({
            destination_sids: [STAGING],
            owner: 'authored_preplanned',
        });
    });

    it('retains manual movement and conflicting-operation protections', () => {
        const manual = makeState({
            location: STAGING,
            orderDestination: UNRELATED,
        });
        prestageDeferredPrePlannedElites(manual, ADJACENCY as never, REVERSE_MAP);
        expect(manual.military.brigade_movement_orders?.[BRIGADE]?.destination_sids).toEqual([UNRELATED]);

        const manualTransit = makeState({
            location: MID,
            transitDestination: UNRELATED,
            transitTurns: 2,
        });
        prestageDeferredPrePlannedElites(manualTransit, ADJACENCY as never, REVERSE_MAP);
        expect(manualTransit.military.brigade_movement_state?.[BRIGADE]).toBeDefined();

        const conflicting = makeState({
            location: STAGING,
            orderDestination: UNRELATED,
            orderOwner: 'bot_discretionary',
            conflictingOperation: true,
        });
        prestageDeferredPrePlannedElites(conflicting, ADJACENCY as never, REVERSE_MAP);
        expect(conflicting.military.brigade_movement_orders?.[BRIGADE]?.destination_sids).toEqual([UNRELATED]);
    });

    it('is deterministic across repeat prestaging and does not change simulated control', () => {
        const first = makeState({
            location: STAGING,
            orderDestination: APPROACH,
            orderOwner: 'bot_discretionary',
        });
        const second = structuredClone(first);
        const controllersBefore = structuredClone(first.political.political_controllers);
        prestageDeferredPrePlannedElites(first, ADJACENCY as never, REVERSE_MAP);
        prestageDeferredPrePlannedElites(second, ADJACENCY as never, REVERSE_MAP);
        expect(second.military.brigade_movement_orders).toEqual(first.military.brigade_movement_orders);
        prestageDeferredPrePlannedElites(first, ADJACENCY as never, REVERSE_MAP);
        expect(first.military.brigade_movement_orders).toEqual(second.military.brigade_movement_orders);
        expect(first.political.political_controllers).toEqual(controllersBefore);
    });
});
