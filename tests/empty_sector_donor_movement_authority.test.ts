/**
 * Focused contract regression: an empty, reachable, same-corps front sector with a
 * legal donor must be relieved through movement authority (T1 intent -> T2 column
 * order -> T3 delayed physical movement), not by a direct location rewrite during
 * sector construction.
 *
 * Canon:
 *   - Engine_Invariants_v0_9_0.md section 14.9 (war movement pipeline order)
 *   - Systems_Manual_v0_9_0.md section 6.3 (empty reachable same-corps sectors)
 *   - MOVEMENT_AUTHORITY.md sections 3-4 (empty-sector relief lifecycle / pipeline)
 *
 * Deliberate scope boundaries:
 *   - This is NOT the already-staffed local-sector relief case. The target sector
 *     here is truly empty (no assigned, reserve, or rear brigade), so it is not the
 *     permitted "promote this sector's own reserve/rear onto its own front" path.
 *   - The donor is otherwise fully legal: same corps, above its own line minimum,
 *     no operation commitment, no player movement/posture order, no elite loan, no
 *     active transit, and a friendly route to the target front.
 *   - No claim is made here about any historical 181st/851st relocation branch.
 */

import { describe, expect, it } from 'vitest';

import {
    classifyBrigadesByTerritory,
    ensureMinimumSectorCoverage,
} from '../src/sim/combat/brigade_assignment.js';
import { computeEmptySectorReliefReassignments } from '../src/sim/combat/commander/decide.js';
import { emitCommanderOutput } from '../src/sim/combat/commander/emit.js';
import { evaluateSectorMarch } from '../src/sim/combat/bot_brigade_eval_front.js';
import type { BrigadeEvaluationContext } from '../src/sim/combat/bot_brigade_eval_types.js';
import { createColumnMovementOrder } from '../src/sim/combat/brigade_movement_order_helpers.js';
import { processOsidColumnMovement } from '../src/sim/combat/osid_column_movement.js';
import { spatialFriendlyDistance } from '../src/sim/spatial_context.js';
import type { OperationalToCanonicalReverseMap } from '../src/data/operational_data.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { TerrainScalarsData, TerrainScalars } from '../src/map/terrain_scalars.js';
import type {
    CorpsFrontSector,
    CorpsFrontSubSegment,
    FormationId,
    FormationState,
    GameState,
} from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';
import type { SectorTopologyWorkingFormation } from '../src/sim/combat/sector_topology_narrow_formation.js';

const CORPS_ID = 'corps_a';
const FACTION = 'RS';

const DONOR_LOCATION = 'op:donor:f1';
const DONOR_SECOND_LOCATION = 'op:donor:f2';
const ROUTE_MIDDLE = 'op:route:mid';
const EMPTY_FRONT = 'op:empty:f1';

function makeSubSegment(id: string, friendlyOsids: string[]): CorpsFrontSubSegment {
    return {
        sub_segment_id: id,
        edge_ids: friendlyOsids.map((osid, index) => `${id}:edge:${index}:${osid}`),
        friendly_osids: friendlyOsids,
        enemy_osids: friendlyOsids.map((_, index) => `${id}:enemy:${index}`),
        length_edges: friendlyOsids.length,
        primary_brigade_ids: [],
    };
}

function makeSector(input: {
    sectorId: string;
    frontOsids: string[];
    assigned?: string[];
    reserve?: string[];
    rear?: string[];
    threatRatio?: number;
}): CorpsFrontSector {
    const subSegment = makeSubSegment(`subseg:${input.sectorId}`, input.frontOsids);
    return {
        sector_id: input.sectorId,
        corps_id: CORPS_ID,
        faction: FACTION,
        opposing_factions: ['RBiH'],
        edge_ids: [...subSegment.edge_ids],
        sub_segments: [subSegment],
        length_edges: subSegment.length_edges,
        territory_osids: [...input.frontOsids],
        assigned_brigade_ids: [...(input.assigned ?? [])],
        reserve_brigade_ids: [...(input.reserve ?? [])],
        rear_brigade_ids: [...(input.rear ?? [])],
        density: (input.assigned?.length ?? 0) / Math.max(1, subSegment.length_edges),
        threat_ratio: input.threatRatio ?? 0,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot',
    } as CorpsFrontSector;
}

function makeFormation(id: string, location: string, personnel: number): FormationState {
    return {
        id,
        name: id,
        faction: FACTION,
        kind: 'brigade',
        status: 'active',
        created_turn: 1,
        assignment: null,
        corps_id: CORPS_ID,
        location_osid: location,
        home_osid: location,
        personnel,
        cohesion: 70,
        morale: 75,
        disrupted_turns: 0,
    } as FormationState;
}

function makeAdjacency(edges: Array<[string, string]>): Map<Osid, Osid[]> {
    const adjacency = new Map<string, Set<string>>();
    const add = (left: string, right: string): void => {
        const bucket = adjacency.get(left) ?? new Set<string>();
        bucket.add(right);
        adjacency.set(left, bucket);
    };
    for (const [left, right] of edges) {
        add(left, right);
        add(right, left);
    }
    return new Map(
        [...adjacency.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([osid, neighbors]) => [osid as Osid, [...neighbors].sort()] as const),
    );
}

/**
 * General fixture:
 *   - `sector:corps_a:empty` is a truly empty same-corps front sector.
 *   - `sector:corps_a:donor` holds two line brigades on a two-edge front, so it is
 *     above its own `ceil(length_edges / 8)` line minimum and is a legal donor.
 *   - The only route DONOR_LOCATION -> ROUTE_MIDDLE -> EMPTY_FRONT is friendly.
 */
function makeFixture() {
    const emptySector = makeSector({
        sectorId: 'sector:corps_a:empty',
        frontOsids: [EMPTY_FRONT],
        threatRatio: 0,
    });
    const donorSector = makeSector({
        sectorId: 'sector:corps_a:donor',
        frontOsids: [DONOR_LOCATION, DONOR_SECOND_LOCATION],
        assigned: ['donor_brigade', 'donor_brigade_second'],
        threatRatio: 40,
    });

    const formations: Record<FormationId, SectorTopologyWorkingFormation> = {
        donor_brigade: makeFormation('donor_brigade', DONOR_LOCATION, 1200) as SectorTopologyWorkingFormation,
        donor_brigade_second: makeFormation(
            'donor_brigade_second',
            DONOR_SECOND_LOCATION,
            900,
        ) as SectorTopologyWorkingFormation,
    };
    const adjacency = makeAdjacency([
        [DONOR_LOCATION, ROUTE_MIDDLE],
        [ROUTE_MIDDLE, EMPTY_FRONT],
        [DONOR_LOCATION, DONOR_SECOND_LOCATION],
    ]);
    const friendlyOsids = new Set<string>([
        DONOR_LOCATION,
        DONOR_SECOND_LOCATION,
        ROUTE_MIDDLE,
        EMPTY_FRONT,
    ]);
    const componentOf = new Map<string, number>(
        [...friendlyOsids].map((osid) => [osid, 0] as const),
    );
    const sectors = [emptySector, donorSector];

    return {
        sectors,
        emptySector,
        donorSector,
        formations,
        adjacency,
        friendlyOsids,
        componentOf,
    };
}

function makeNarrowState(
    fixture: ReturnType<typeof makeFixture>,
    options: {
        activeOperations?: Array<{ participating_brigades: string[] }>;
        movementOrders?: Record<string, unknown>;
        movementState?: Record<string, unknown>;
        postureOrders?: Array<{ brigade_id: string; posture: string }>;
    } = {},
) {
    return {
        meta: { turn: 12 },
        political: {},
        factions: [{ id: FACTION }],
        military: {
            formations: fixture.formations,
            brigade_movement_orders: options.movementOrders,
            brigade_movement_state: options.movementState,
            brigade_posture_orders: options.postureOrders,
            corps_command: options.activeOperations
                ? {
                    [CORPS_ID]: {
                        active_operations: options.activeOperations.map((operation) => ({
                            type: 'attack',
                            phase: 'execution',
                            ...operation,
                        })),
                    },
                }
                : undefined,
        },
    } as any;
}

function makePipelineState(fixture: ReturnType<typeof makeFixture>) {
    const politicalControllers: Record<string, string> = {};
    for (const osid of fixture.friendlyOsids) politicalControllers[osid] = FACTION;

    return {
        meta: { turn: 12, phase: 'war', schema_version: 1, scenario_id: 'empty-sector-contract' },
        factions: [{ id: FACTION }, { id: 'RBiH' }, { id: 'HRHB' }],
        military: {
            formations: fixture.formations,
            corps_front_sectors: Object.fromEntries(
                fixture.sectors.map((sector) => [sector.sector_id, sector]),
            ),
            brigade_movement_orders: {},
            brigade_movement_state: {},
            brigade_posture_orders: [],
            corps_command: {},
        },
        political: {
            political_controllers: politicalControllers,
        },
        displacement: {},
    } as unknown as GameState;
}

function makeBriefing(fixture: ReturnType<typeof makeFixture>, state: GameState) {
    return {
        corps_id: CORPS_ID,
        faction: FACTION,
        turn: 12,
        sectors: fixture.sectors,
        brigades: Object.values(fixture.formations),
        state_ref: state,
        must_hold_osids: [],
        active_operations: [],
        current_state: null,
        previous_state: null,
        sector_activity: [],
        officer_personality: {
            aggression: 0.5,
            caution: 0.3,
            competence: 0.6,
            loyalty: 0.7,
            independence: 0.4,
        },
        spatial: {
            adjacency: fixture.adjacency,
            friendlyOsidsByFaction: new Map([[FACTION, fixture.friendlyOsids]]),
            componentsByFaction: new Map([[FACTION, fixture.componentOf]]),
        },
    } as any;
}

function makeSectorMarchContext(
    fixture: ReturnType<typeof makeFixture>,
    state: GameState,
    directive: { sector_reassignment_orders?: Array<{ brigade_id: string; to_sector_id: string }> },
): BrigadeEvaluationContext {
    const brigade = state.military.formations!.donor_brigade as FormationState;
    const donorFrontOsids = new Set<string>([DONOR_LOCATION, DONOR_SECOND_LOCATION]);
    return {
        state,
        faction: FACTION as any,
        brigade,
        loc: brigade.location_osid!,
        corpsId: CORPS_ID,
        cmd: null,
        directive: directive as any,
        corpsStance: 'defensive',
        activeOp: null,
        isActiveSectorOperationParticipant: false,
        adjEnemy: [],
        isAlliedWithRBiH: false,
        targetAdjacentCount: new Map(),
        corpsReserve: new Map(),
        chosenTargets: new Map(),
        columnAssignments: new Map(),
        counterAttackTarget: null,
        brigadeSupplyState: 'adequate',
        isHoldBrigade: false,
        sectorRecentRetreats: new Map(),
        sectorCounterAttackCount: new Map(),
        sectorAssignment: {
            sector: fixture.donorSector,
            isReserve: false,
            frontOsids: donorFrontOsids,
        },
        assignedSectorFrontOsids: donorFrontOsids,
        adjacency: fixture.adjacency as Map<Osid, Osid[]>,
        reverseMap: new Map(),
        terrainCache: {} as any,
        graphAnalysis: { osid_analysis: new Map() } as BrigadeEvaluationContext['graphAnalysis'],
        result: {
            posture_orders: [],
            attack_orders: {},
            attack_scores: {},
            movement_orders: {},
            column_march_orders: {},
            eligible_attackers_by_corps: {},
        },
    } as BrigadeEvaluationContext;
}

function makeEdge(a: string, b: string): EdgeRecord {
    return { a, b } as EdgeRecord;
}

function makeFlatTerrain(osids: string[]): TerrainScalarsData {
    const flat: TerrainScalars = {
        road_access_index: 0.5,
        river_crossing_penalty: 0,
        elevation_mean_m: 200,
        elevation_stddev_m: 10,
        slope_index: 0.1,
        terrain_friction_index: 0.1,
    };
    return { by_sid: Object.fromEntries(osids.map((osid) => [osid, flat])) };
}

function makeReverseMap(osids: string[]): OperationalToCanonicalReverseMap {
    const map = new Map<string, string[]>();
    for (const osid of osids) map.set(osid, [osid]);
    return map;
}

describe('empty reachable same-corps sector donor movement authority', () => {
    it('leaves a legal donor physically in place during construction and supplies delayed relief only through T1/T2/T3', () => {
        const fixture = makeFixture();

        // ── Distinctions that make this the empty-sector donor contract ──
        // Already-staffed local-sector relief is a different, permitted path and is not
        // asserted against here. This target is truly empty.
        expect(fixture.emptySector.assigned_brigade_ids).toEqual([]);
        expect(fixture.emptySector.reserve_brigade_ids).toEqual([]);
        expect(fixture.emptySector.rear_brigade_ids).toEqual([]);

        // Donor minimum: the donor sector remains above its own line floor after donating.
        const donorMinimum = Math.max(1, Math.ceil(fixture.donorSector.length_edges / 8));
        expect(fixture.donorSector.assigned_brigade_ids.length).toBeGreaterThan(donorMinimum);

        // Player / operation / loan / transit authority: none is suppressing or driving
        // this case. The donor is an ordinary uncommitted line brigade.
        const donor = fixture.formations.donor_brigade!;
        expect(donor.elite_loan_state).toBeUndefined();
        expect(fixture.formations.donor_brigade_second!.elite_loan_state).toBeUndefined();
        expect(donor.disrupted_turns ?? 0).toBe(0);
        expect(donor.posture).not.toBe('dig_in');

        const constructionState = makeNarrowState(fixture);
        expect(constructionState.military.corps_command).toBeUndefined();
        expect(constructionState.military.brigade_movement_orders).toBeUndefined();
        expect(constructionState.military.brigade_movement_state).toBeUndefined();
        expect(constructionState.military.brigade_posture_orders).toBeUndefined();

        // Legal friendly route: the donor can reach the empty sector front through
        // friendly territory, so a legal donor genuinely exists.
        expect(spatialFriendlyDistance(
            {
                adjacency: fixture.adjacency,
                friendlyOsidsByFaction: new Map([[FACTION, fixture.friendlyOsids]]),
            } as any,
            FACTION as any,
            DONOR_LOCATION,
            EMPTY_FRONT,
            30,
        )).toBe(2);

        // ── T1: strategic intent only; the donor does not move ──
        const state = makePipelineState(fixture);
        const briefing = makeBriefing(fixture, state);
        const intent = computeEmptySectorReliefReassignments(briefing);
        expect(intent).toEqual([{
            brigade_id: 'donor_brigade',
            to_sector_id: fixture.emptySector.sector_id,
            reason: 'empty front sector requires corps relief',
        }]);
        expect(state.military.formations!.donor_brigade!.location_osid).toBe(DONOR_LOCATION);

        // Ordinary command emission converts that intent into a reassignment order.
        const output = emitCommanderOutput(
            briefing,
            [] as any,
            { total_brigades: 2 } as any,
            { zones: [], garrison_locks: [], surplus_pool: [] } as any,
            { plan: null, action: 'none', reason: 'contract test', alternatives: [] } as any,
            {
                stance_changes: [],
                reserve_shifts: [],
                empty_sector_relief_reassignments: intent,
                reinforcement_requests: [],
                activity_entries: [],
            } as any,
            { threatened_zones: [], global_threat_level: 'low' } as any,
            null,
        );
        expect(output.directive.sector_reassignment_orders).toEqual([{
            brigade_id: 'donor_brigade',
            to_sector_id: fixture.emptySector.sector_id,
        }]);

        // ── T2: the reassignment becomes a column destination, still without a move ──
        const sectorMarchContext = makeSectorMarchContext(fixture, state, output.directive as any);
        expect(evaluateSectorMarch(sectorMarchContext)).toBe(true);
        const columnDestination = sectorMarchContext.result.column_march_orders.donor_brigade;
        expect(columnDestination).toBe(EMPTY_FRONT);
        expect(state.military.formations!.donor_brigade!.location_osid).toBe(DONOR_LOCATION);

        // ── T3: the ordinary column processor starts transit now and moves later ──
        state.military.corps_command = {
            [CORPS_ID]: { directive: output.directive },
        } as any;
        state.military.brigade_movement_orders = {
            donor_brigade: createColumnMovementOrder(columnDestination!),
        };
        const edges = [
            makeEdge(DONOR_LOCATION, ROUTE_MIDDLE),
            makeEdge(ROUTE_MIDDLE, EMPTY_FRONT),
            makeEdge(DONOR_LOCATION, DONOR_SECOND_LOCATION),
        ];
        const osids = [DONOR_LOCATION, DONOR_SECOND_LOCATION, ROUTE_MIDDLE, EMPTY_FRONT];
        const reverseMap = makeReverseMap(osids);
        const terrain = makeFlatTerrain(osids);

        const firstExecution = processOsidColumnMovement(
            state,
            edges,
            reverseMap,
            terrain,
            fixture.adjacency,
        );
        expect(firstExecution.column_starts).toBe(1);
        expect(state.military.formations!.donor_brigade!.location_osid).toBe(DONOR_LOCATION);
        expect(state.military.brigade_movement_state?.donor_brigade?.status).toBe('in_transit');

        let turnsToArrive = 0;
        while (state.military.formations!.donor_brigade!.location_osid !== EMPTY_FRONT && turnsToArrive < 6) {
            processOsidColumnMovement(state, edges, reverseMap, terrain, fixture.adjacency);
            turnsToArrive += 1;
        }
        expect(turnsToArrive).toBeGreaterThan(0);
        expect(state.military.formations!.donor_brigade!.location_osid).toBe(EMPTY_FRONT);

        // ── Sector construction: the same legal donor must still be in place ──
        // This is the contract under test. A direct cross-sector location rewrite here
        // would bypass T1/T2/T3 delayed relief.
        const constructionFixture = makeFixture();
        const before = {
            donor: constructionFixture.formations.donor_brigade!.location_osid,
            donorSecond: constructionFixture.formations.donor_brigade_second!.location_osid,
        };

        ensureMinimumSectorCoverage(
            constructionFixture.sectors,
            constructionFixture.formations,
            constructionFixture.adjacency,
            constructionFixture.friendlyOsids,
            constructionFixture.componentOf,
            makeNarrowState(constructionFixture),
        );

        expect(
            constructionFixture.formations.donor_brigade!.location_osid,
            'sector construction must not directly relocate the legal donor for an empty reachable same-corps sector',
        ).toBe(before.donor);
        expect(
            constructionFixture.formations.donor_brigade_second!.location_osid,
            'sector construction must not directly relocate any legal donor for an empty reachable same-corps sector',
        ).toBe(before.donorSecond);
        expect(
            constructionFixture.emptySector.assigned_brigade_ids,
            'sector construction must not fabricate staffing; relief arrives through T1/T2/T3',
        ).toEqual([]);
    });

    it('keeps the empty sector unstaffed across war-phase turn timing until the column actually arrives', () => {
        const fixture = makeFixture();
        const state = makePipelineState(fixture);
        const startTurn = 20;
        state.meta.turn = startTurn;
        const briefing = makeBriefing(fixture, state);
        briefing.turn = startTurn;

        // ── Turn N: T1 intent and T2 column order only ──
        const intent = computeEmptySectorReliefReassignments(briefing);
        expect(intent).toEqual([{
            brigade_id: 'donor_brigade',
            to_sector_id: fixture.emptySector.sector_id,
            reason: 'empty front sector requires corps relief',
        }]);
        const output = emitCommanderOutput(
            briefing,
            [] as any,
            { total_brigades: 2 } as any,
            { zones: [], garrison_locks: [], surplus_pool: [] } as any,
            { plan: null, action: 'none', reason: 'timing contract', alternatives: [] } as any,
            {
                stance_changes: [],
                reserve_shifts: [],
                empty_sector_relief_reassignments: intent,
                reinforcement_requests: [],
                activity_entries: [],
            } as any,
            { threatened_zones: [], global_threat_level: 'low' } as any,
            null,
        );
        const sectorMarchContext = makeSectorMarchContext(fixture, state, output.directive as any);
        expect(evaluateSectorMarch(sectorMarchContext)).toBe(true);
        const columnDestination = sectorMarchContext.result.column_march_orders.donor_brigade;
        expect(columnDestination).toBe(EMPTY_FRONT);

        state.military.corps_command = { [CORPS_ID]: { directive: output.directive } } as any;
        state.military.brigade_movement_orders = {
            donor_brigade: createColumnMovementOrder(columnDestination!),
        };

        // No same-turn physical movement, transit, or fabricated staffing.
        const pendingOrder = { ...state.military.brigade_movement_orders.donor_brigade! };
        expect(state.military.formations!.donor_brigade!.location_osid).toBe(DONOR_LOCATION);
        expect(state.military.brigade_movement_state?.donor_brigade).toBeUndefined();
        expect(fixture.emptySector.assigned_brigade_ids).toEqual([]);

        // Turn N coverage still runs with the pending order, before the first T3
        // movement pass. It must preserve the order and physical location.
        ensureMinimumSectorCoverage(
            fixture.sectors,
            fixture.formations,
            fixture.adjacency,
            fixture.friendlyOsids,
            fixture.componentOf,
            state,
        );
        expect(state.military.formations!.donor_brigade!.location_osid).toBe(DONOR_LOCATION);
        expect(state.military.brigade_movement_state?.donor_brigade).toBeUndefined();
        expect(state.military.brigade_movement_orders.donor_brigade).toEqual(pendingOrder);
        expect(fixture.emptySector.assigned_brigade_ids).toEqual([]);

        const edges = [
            makeEdge(DONOR_LOCATION, ROUTE_MIDDLE),
            makeEdge(ROUTE_MIDDLE, EMPTY_FRONT),
            makeEdge(DONOR_LOCATION, DONOR_SECOND_LOCATION),
        ];
        const osids = [DONOR_LOCATION, DONOR_SECOND_LOCATION, ROUTE_MIDDLE, EMPTY_FRONT];
        const reverseMap = makeReverseMap(osids);
        const terrain = makeFlatTerrain(osids);

        // ── Later turns: T3 runs before partition/coverage in the real war phase ──
        let turn = startTurn;
        let sawColumnStart = false;
        let guard = 0;
        while (state.military.formations!.donor_brigade!.location_osid !== EMPTY_FRONT && guard < 6) {
            turn += 1;
            state.meta.turn = turn;
            const movementReport = processOsidColumnMovement(
                state,
                edges,
                reverseMap,
                terrain,
                fixture.adjacency,
            );

            if (!sawColumnStart) {
                expect(turn).toBe(startTurn + 1);
                expect(movementReport.column_starts).toBe(1);
                expect(state.military.formations!.donor_brigade!.location_osid).toBe(DONOR_LOCATION);
                expect(state.military.brigade_movement_state?.donor_brigade?.status).toBe('in_transit');
                expect(state.military.brigade_movement_state?.donor_brigade?.destination_sids)
                    .toEqual([EMPTY_FRONT]);
                sawColumnStart = true;
            }

            // Partition/classification runs after T3 in the same turn.
            classifyBrigadesByTerritory(
                fixture.sectors,
                FACTION as any,
                fixture.formations,
                fixture.adjacency,
                fixture.friendlyOsids,
                fixture.componentOf,
                new Map(),
                undefined,
                state,
            );

            const pathBefore = state.military.brigade_movement_state?.donor_brigade?.path
                ? [...state.military.brigade_movement_state.donor_brigade.path]
                : null;

            // Coverage runs while the column is pending or in transit.
            ensureMinimumSectorCoverage(
                fixture.sectors,
                fixture.formations,
                fixture.adjacency,
                fixture.friendlyOsids,
                fixture.componentOf,
                state,
            );

            if (state.military.formations!.donor_brigade!.location_osid !== EMPTY_FRONT) {
                expect(fixture.emptySector.assigned_brigade_ids).toEqual([]);
                expect(state.military.brigade_movement_state?.donor_brigade?.status).toBe('in_transit');
                expect(state.military.brigade_movement_state?.donor_brigade?.path).toEqual(pathBefore);
            }
            guard += 1;
        }

        expect(guard).toBeLessThan(6);
        expect(state.military.formations!.donor_brigade!.location_osid).toBe(EMPTY_FRONT);
        expect(state.military.brigade_movement_state?.donor_brigade).toBeUndefined();
        expect(fixture.emptySector.assigned_brigade_ids).toContain('donor_brigade');
    });
});
