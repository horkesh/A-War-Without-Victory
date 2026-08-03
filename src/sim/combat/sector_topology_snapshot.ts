/**
 * R5 Phase 2e Task 2 — complete deterministic capture of the corps-sector
 * topology solve's read surface into an immutable `SectorTopologySolveInput`.
 *
 * See docs/plans/2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md
 * section 6 and `sector_topology_solver_types.ts`'s docstring for the
 * verified read-allow-list this function implements.
 *
 * Freeze contract: every plain object/array leaf is `Object.freeze`d. Map and
 * Set values are typed `ReadonlyMap`/`ReadonlySet` at the type level — V8
 * does not block `.set()`/`.add()` on a frozen Map/Set instance (a native-slot
 * limitation, not an oversight here), so the real safety property this module
 * guarantees is: every Map/Set/array/object returned is a freshly constructed
 * deep copy that shares no mutable identity with the source `GameState` or
 * caller-supplied `edges`/`reverseMap`/`centroids`/`spatial` — mutating the
 * source after capture cannot change the snapshot. `sector_topology_snapshot.test.ts`
 * verifies this via mutate-after-capture, not via attempted-write-throws on
 * Map/Set fields.
 */

import { strictCompare } from '../../state/validateGameState.js';
import type {
    FactionId,
    FormationId,
    GameState,
} from '../../state/game_state.js';
import type { EdgeRecord } from '../../map/settlements.js';
import type { OsidCentroidMap } from '../../data/operational_data_types.js';
import type { SpatialContext } from '../spatial_context.js';
import { buildOsidAdjacency, buildSharedBoundaryAdjacency, type Osid } from './osid_adjacency.js';
import { buildFriendlyComponents, getFactions } from './sector_utils.js';
import type { EnsureMinimumSectorCoverageOccupancyStrategy } from './brigade_assignment.js';
import type { SectorFrontEdgeAdjacencyStrategy } from './corps_front_sectors.js';
import type { SectorFrontEdgeRelationTestCounters } from './sector_front_edge_relation.js';
import type {
    SectorTopologyCampaignPlanRow,
    SectorTopologyControlEventRow,
    SectorTopologyCorpsCommandRow,
    SectorTopologyEliteLoanSnapshot,
    SectorTopologyFormation,
    SectorTopologyFrontPriorityRow,
    SectorTopologyNamedOfficerRow,
    SectorTopologyNamedOfficerStateRow,
    SectorTopologyOperationRow,
    SectorTopologySolveInput,
    SectorTopologySolveOptions,
    SectorTopologySpatialSnapshot,
    SectorTopologyBrigadeMovementOrder,
    SectorTopologyBrigadeMovementState,
} from './sector_topology_solver_types.js';

export interface SectorTopologySolveInputCaptureOptions {
    readonly isFinalPass?: boolean;
    readonly finalSaveGeometryProjection?: boolean;
    readonly useFixedPointShortcuts?: boolean;
    readonly occupancyStrategy?: EnsureMinimumSectorCoverageOccupancyStrategy;
    readonly frontEdgeAdjacencyStrategy?: SectorFrontEdgeAdjacencyStrategy;
    readonly frontEdgeRelationTestCounters?: SectorFrontEdgeRelationTestCounters;
}

function freezeAdjacency(map: ReadonlyMap<Osid, readonly Osid[]>): Map<Osid, readonly Osid[]> {
    const copy = new Map<Osid, readonly Osid[]>();
    for (const key of [...map.keys()].sort(strictCompare)) {
        copy.set(key, Object.freeze([...(map.get(key) ?? [])]));
    }
    return copy;
}

function captureSpatialSnapshot(
    state: GameState,
    edges: EdgeRecord[],
    factionIds: readonly FactionId[],
    spatial: SpatialContext | undefined,
): SectorTopologySpatialSnapshot {
    // When a live SpatialContext is supplied, deep-copy its fields verbatim.
    // Otherwise, replicate the EXACT fallback buildCorpsFrontSectors/
    // buildFactionSectors compute today: buildOsidAdjacency(edges),
    // buildSharedBoundaryAdjacency(edges), and per-faction friendlyOsids/
    // components derived from political_controllers. Normalizing the
    // fallback into a full snapshot at capture time (rather than deferring
    // the branch to solve time) keeps the pure solver's input shape uniform.
    const adjacencySource = spatial?.adjacency ?? buildOsidAdjacency(edges);
    const sharedBoundaryAdjacencySource = spatial?.sharedBoundaryAdjacency ?? buildSharedBoundaryAdjacency(edges);
    const adjacency = freezeAdjacency(adjacencySource as ReadonlyMap<Osid, readonly Osid[]>);
    const sharedBoundaryAdjacency = freezeAdjacency(sharedBoundaryAdjacencySource as ReadonlyMap<Osid, readonly Osid[]>);

    const politicalControllers = state.political.political_controllers ?? {};

    const friendlyOsidsByFaction = new Map<FactionId, ReadonlySet<string>>();
    const componentsByFaction = new Map<FactionId, ReadonlyMap<string, number>>();
    for (const faction of factionIds) {
        const spatialFriendly = spatial?.friendlyOsidsByFaction.get(faction);
        let friendly: Set<string>;
        if (spatialFriendly) {
            friendly = new Set(spatialFriendly);
        } else {
            friendly = new Set<string>();
            for (const osid of Object.keys(politicalControllers).sort(strictCompare)) {
                if (politicalControllers[osid] === faction) friendly.add(osid);
            }
        }
        friendlyOsidsByFaction.set(faction, friendly);

        const spatialComponents = spatial?.componentsByFaction.get(faction);
        const components = spatialComponents
            ? new Map(spatialComponents)
            : buildFriendlyComponents(adjacencySource as Map<Osid, Osid[]>, friendly);
        componentsByFaction.set(faction, components);
    }

    return Object.freeze({
        adjacency,
        sharedBoundaryAdjacency,
        friendlyOsidsByFaction,
        componentsByFaction,
    });
}

function captureFormation(id: FormationId, f: {
    faction: FactionId;
    name: string;
    status: 'active' | 'inactive';
    kind?: SectorTopologyFormation['kind'];
    readiness?: SectorTopologyFormation['readiness'];
    lifecycle_status?: SectorTopologyFormation['lifecycle_status'];
    tags?: string[];
    corps_id?: string | null;
    location_osid?: string;
    home_osid?: string;
    hq_osid?: string;
    hq_sid?: string;
    personnel?: number;
    personnel_lent_by_tg?: Record<string, number>;
    cohesion?: number;
    experience?: number;
    honor?: SectorTopologyFormation['honor'];
    assignment: SectorTopologyFormation['assignment'];
    assigned_sub_segment_id?: string;
    posture?: SectorTopologyFormation['posture'];
    disrupted?: boolean;
    disrupted_turns?: number;
    stranded_status?: SectorTopologyFormation['stranded_status'];
    elite_loan_state?: { on_loan: boolean; loaned_to_corps: string | null; loan_start_turn: number | null };
}): SectorTopologyFormation {
    let eliteLoanState: SectorTopologyEliteLoanSnapshot | undefined;
    if (f.elite_loan_state) {
        eliteLoanState = Object.freeze({
            on_loan: f.elite_loan_state.on_loan,
            loaned_to_corps: f.elite_loan_state.loaned_to_corps,
            loan_start_turn: f.elite_loan_state.loan_start_turn,
        });
    }
    return Object.freeze({
        id,
        faction: f.faction,
        name: f.name,
        status: f.status,
        kind: f.kind,
        readiness: f.readiness,
        lifecycle_status: f.lifecycle_status,
        tags: f.tags ? Object.freeze([...f.tags]) : undefined,
        corps_id: f.corps_id,
        location_osid: f.location_osid,
        home_osid: f.home_osid,
        hq_osid: f.hq_osid,
        hq_sid: f.hq_sid,
        personnel: f.personnel,
        personnel_lent_by_tg: f.personnel_lent_by_tg ? Object.freeze({ ...f.personnel_lent_by_tg }) : undefined,
        cohesion: f.cohesion,
        experience: f.experience,
        honor: f.honor,
        assignment: f.assignment ? Object.freeze({ ...f.assignment }) : null,
        assigned_sub_segment_id: f.assigned_sub_segment_id,
        posture: f.posture,
        disrupted: f.disrupted,
        disrupted_turns: f.disrupted_turns,
        stranded_status: f.stranded_status,
        elite_loan_state: eliteLoanState,
    });
}

function captureOperation(op: {
    name: string;
    type: string;
    phase: 'planning' | 'execution' | 'recovery';
    sector_id?: string;
    preparation_sub_phase?: string;
    participating_brigades: FormationId[];
    axes?: Array<{ axis_id: string; assigned_brigades: FormationId[] }>;
    objectives?: string[];
}): SectorTopologyOperationRow {
    return Object.freeze({
        name: op.name,
        type: op.type,
        phase: op.phase,
        sector_id: op.sector_id,
        preparation_sub_phase: op.preparation_sub_phase,
        participating_brigades: Object.freeze([...(op.participating_brigades ?? [])]),
        axes: op.axes
            ? Object.freeze(op.axes.map((axis) => Object.freeze({
                axis_id: axis.axis_id,
                assigned_brigades: Object.freeze([...(axis.assigned_brigades ?? [])]),
            })))
            : undefined,
        objectives: op.objectives ? Object.freeze([...op.objectives]) : undefined,
    });
}

/**
 * Capture the complete, immutable read snapshot `buildCorpsFrontSectors`
 * needs, over the exact same positional inputs it already accepts.
 */
export function captureSectorTopologySolveInput(
    state: GameState,
    edges: EdgeRecord[],
    reverseMap: Map<string, string[]> | null,
    centroids: OsidCentroidMap | undefined,
    spatial: SpatialContext | undefined,
    options: SectorTopologySolveInputCaptureOptions = {},
): SectorTopologySolveInput {
    const resolvedOptions: SectorTopologySolveOptions = Object.freeze({
        isFinalPass: options.isFinalPass ?? false,
        finalSaveGeometryProjection: options.finalSaveGeometryProjection ?? false,
        useFixedPointShortcuts: options.useFixedPointShortcuts ?? true,
        occupancyStrategy: options.occupancyStrategy ?? 'dense-index',
        frontEdgeAdjacencyStrategy: options.frontEdgeAdjacencyStrategy ?? 'invocation-front-edge-relation',
        frontEdgeRelationTestCounters: options.frontEdgeRelationTestCounters,
    });

    const factionIds = Object.freeze(getFactions(state));

    // ── Front truth: preserve authored array order (semantic source) ──
    const frontEdges = Object.freeze(
        (state.military.war_front_edges_osid ?? []).map((fe) => Object.freeze({
            edge_id: fe.edge_id,
            a: fe.a,
            b: fe.b,
            side_a: fe.side_a,
            side_b: fe.side_b,
        })),
    );

    // ── Operational graph ──
    const edgeRows = Object.freeze(
        edges.map((e) => Object.freeze({
            a: e.a,
            b: e.b,
            one_way: e.one_way,
            allow_self_loop: e.allow_self_loop,
            type: e.type,
            min_dist: e.min_dist,
            shared_segments: e.shared_segments,
        })),
    );

    let reverseMapEntries: Map<string, readonly string[]> | null = null;
    if (reverseMap) {
        reverseMapEntries = new Map();
        for (const key of [...reverseMap.keys()].sort(strictCompare)) {
            reverseMapEntries.set(key, Object.freeze([...(reverseMap.get(key) ?? [])]));
        }
    }

    let centroidsCopy: OsidCentroidMap | undefined;
    if (centroids) {
        centroidsCopy = new Map();
        for (const key of [...centroids.keys()].sort(strictCompare)) {
            const c = centroids.get(key)!;
            centroidsCopy.set(key, Object.freeze({ lat: c.lat, lon: c.lon }));
        }
    }

    const spatialSnapshot = captureSpatialSnapshot(state, edges, factionIds, spatial);

    // ── Political control ──
    const politicalControllersSource = state.political.political_controllers ?? {};
    const politicalControllers = Object.freeze({ ...politicalControllersSource });
    const grazEastHerzegovinaActiveTurn = state.political.graz_east_herzegovina_active_turn;

    // ── Emergent commander priority ──
    const controlEvents: readonly SectorTopologyControlEventRow[] = Object.freeze(
        (state.political.control_events ?? []).map((ev) => Object.freeze({
            turn: ev.turn,
            settlement_id: ev.settlement_id,
            from: ev.from,
            to: ev.to,
            mun_id: ev.mun_id,
        })),
    );
    const lastSupplyStateByOsid = state.political.last_supply_state_by_osid
        ? Object.freeze({ ...state.political.last_supply_state_by_osid })
        : undefined;

    const campaignPlansByFaction = new Map<FactionId, SectorTopologyCampaignPlanRow | null>();
    for (const faction of factionIds) {
        const plan = state.military.campaign_plans?.[faction];
        if (!plan) {
            campaignPlansByFaction.set(faction, null);
            continue;
        }
        const frontPriorities: readonly SectorTopologyFrontPriorityRow[] = Object.freeze(
            plan.front_priorities.map((fp) => Object.freeze({ corps_id: fp.corps_id, role: fp.role })),
        );
        campaignPlansByFaction.set(faction, Object.freeze({
            valid_until_turn: plan.valid_until_turn,
            front_priorities: frontPriorities,
        }));
    }

    // ── Formations (identity/lifecycle/geography/strength/assignment/eligibility, elite/enclave movement) ──
    const rawFormations = state.military.formations ?? {};
    const formationIdsSorted = Object.freeze(Object.keys(rawFormations).sort(strictCompare) as FormationId[]);
    const formations = new Map<FormationId, SectorTopologyFormation>();
    for (const fid of formationIdsSorted) {
        const f = rawFormations[fid];
        if (!f) continue;
        formations.set(fid, captureFormation(fid, f));
    }

    // ── Movement ownership / player sector direction ──
    const rawMovementState = state.military.brigade_movement_state ?? {};
    const brigadeMovementState = new Map<FormationId, SectorTopologyBrigadeMovementState>();
    for (const fid of Object.keys(rawMovementState).sort(strictCompare) as FormationId[]) {
        const ms = rawMovementState[fid];
        if (!ms) continue;
        brigadeMovementState.set(fid, Object.freeze({
            status: ms.status,
            stance: ms.stance,
            destination_sids: ms.destination_sids ? Object.freeze([...ms.destination_sids]) : undefined,
            path: ms.path ? Object.freeze([...ms.path]) : undefined,
            turns_remaining: ms.turns_remaining,
        }));
    }

    const rawMovementOrders = state.military.brigade_movement_orders ?? {};
    const brigadeMovementOrders = new Map<FormationId, SectorTopologyBrigadeMovementOrder>();
    for (const fid of Object.keys(rawMovementOrders).sort(strictCompare) as FormationId[]) {
        const mo = rawMovementOrders[fid];
        if (!mo) continue;
        brigadeMovementOrders.set(fid, Object.freeze({
            destination_sids: Object.freeze([...mo.destination_sids]),
            stance: mo.stance,
        }));
    }

    const brigadePostureOrders = Object.freeze(
        (state.military.brigade_posture_orders ?? []).map((po) => Object.freeze({
            brigade_id: po.brigade_id,
            posture: po.posture,
        })),
    );

    const brigadeSectorOverride = state.military.brigade_sector_override
        ? Object.freeze({ ...state.military.brigade_sector_override })
        : undefined;

    // ── Corps/operation truth ──
    const rawCorpsCommand = state.military.corps_command ?? {};
    const corpsCommandByCorpsId = new Map<string, SectorTopologyCorpsCommandRow>();
    for (const corpsId of Object.keys(rawCorpsCommand).sort(strictCompare)) {
        const cmd = rawCorpsCommand[corpsId];
        if (!cmd) continue;
        const activeOperations = Object.freeze(
            (cmd.active_operations ?? []).map((op) => captureOperation({
                name: op.name,
                type: op.type,
                phase: op.phase,
                sector_id: op.sector_id,
                preparation_sub_phase: op.preparation_sub_phase,
                participating_brigades: op.participating_brigades ?? [],
                axes: op.axes,
                objectives: op.objectives,
            })),
        );
        corpsCommandByCorpsId.set(corpsId, Object.freeze({
            directive_priority_sector_id: cmd.directive?.priority_sector_id,
            active_operations: activeOperations,
        }));
    }

    // ── Officer profile: verified narrow surface, see module docstring ──
    const rawOfficers = state.military.named_officers ?? {};
    const namedOfficers = new Map<string, SectorTopologyNamedOfficerStateRow>();
    for (const id of Object.keys(rawOfficers).sort(strictCompare)) {
        const os = rawOfficers[id];
        if (!os) continue;
        namedOfficers.set(id, Object.freeze({
            officer_id: os.officer_id,
            status: os.status,
            assigned_corps_id: os.assigned_corps_id,
            effective_competence_penalty: os.effective_competence_penalty,
        }));
    }
    const namedOfficerData: readonly SectorTopologyNamedOfficerRow[] = Object.freeze(
        (state.military.named_officer_data ?? []).map((o) => Object.freeze({
            id: o.id,
            competence: o.competence,
            aggressiveness: o.aggressiveness,
        })),
    );

    return Object.freeze({
        options: resolvedOptions,
        turn: state.meta.turn,
        decisionMode: state.meta.decision_mode,
        factionIds,
        frontEdges,
        edges: edgeRows,
        reverseMapEntries,
        centroids: centroidsCopy,
        spatial: spatialSnapshot,
        politicalControllers,
        grazEastHerzegovinaActiveTurn,
        controlEvents,
        lastSupplyStateByOsid,
        campaignPlansByFaction,
        formations,
        formationIdsSorted,
        brigadeMovementState,
        brigadeMovementOrders,
        brigadePostureOrders,
        brigadeSectorOverride,
        corpsCommandByCorpsId,
        namedOfficers,
        namedOfficerData,
    });
}
