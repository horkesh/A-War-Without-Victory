import type { OsidCentroidMap } from '../../data/operational_data_types.js';
import type { EdgeRecord } from '../../map/settlements.js';
import type { GameState } from '../../state/game_state.js';
import type { SupplyStateByOsidReport } from '../../state/supply_state_derivation.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { SpatialContext } from '../spatial_context.js';
import { syncSectorAssignmentsToFormations } from './brigade_assignment.js';
import {
    applyFinalSectorOwnerTruthPass,
    assignBrigadesToSubSegments,
    buildCorpsFrontSectors,
    collectUnresolvedSectorBrigades,
    emitFinalUnresolvedSectorWarnings,
    reconcileOperationSensitiveSectorRoster,
    rescueUnassignedLoanedElitesInTerritory,
} from './corps_front_sectors.js';
import type { Osid } from './osid_adjacency.js';
import { buildOsidAdjacency } from './osid_adjacency.js';
import { computeSectorCombatRatings } from './sector_combat_rating.js';

export interface FinalSectorTruthReconciliationReport {
    sectors_rebuilt: number;
    sectors_rated: number;
    unresolved_brigades: number;
    /** Active formation locations changed while geometry was being rebuilt. */
    geometry_input_mutations: number;
}

export type FinalSectorReconciliationStage = 'geometry' | 'territory' | 'roster' | 'ratings';

export type FinalSectorReconciliationMutation =
    | 'geometry'
    | 'operation-roster'
    | 'distribution-roster'
    | 'seal-roster'
    | 'ratings';

export interface FinalSectorReconciliationReceipt {
    epoch: number;
    mutation: FinalSectorReconciliationMutation;
    source: string;
    dirty_stages: FinalSectorReconciliationStage[];
}

/**
 * Explicit single-turn reconciliation state. It is caller-owned, never
 * serialized, and must never be reused for another turn.
 */
export interface FinalSectorReconciliationSession {
    readonly turn: number;
    stage_epochs: Record<FinalSectorReconciliationStage, number>;
    requested_stage_epochs: Record<FinalSectorReconciliationStage, number>;
    dirty_worklist: FinalSectorReconciliationStage[];
    receipts: FinalSectorReconciliationReceipt[];
    processed_receipts: number;
    geometry_builds: number;
    next_epoch: number;
    last_report?: FinalSectorTruthReconciliationReport;
}

export interface FinalSectorTruthReconciliationOptions {
    finalSaveGeometryProjection?: boolean;
    session?: FinalSectorReconciliationSession;
}

export interface FinalSectorTruthSealOptions {
    session?: FinalSectorReconciliationSession;
}

const RECONCILIATION_STAGE_ORDER: readonly FinalSectorReconciliationStage[] = [
    'geometry',
    'territory',
    'roster',
    'ratings',
];

function stagesForMutation(mutation: FinalSectorReconciliationMutation): FinalSectorReconciliationStage[] {
    if (mutation === 'geometry') return [...RECONCILIATION_STAGE_ORDER];
    if (mutation === 'ratings') return ['ratings'];
    return ['roster', 'ratings'];
}

function refreshDirtyWorklist(session: FinalSectorReconciliationSession): void {
    session.dirty_worklist = RECONCILIATION_STAGE_ORDER.filter(
        (stage) => session.stage_epochs[stage] < session.requested_stage_epochs[stage],
    );
}

export function recordFinalSectorReconciliationMutation(
    session: FinalSectorReconciliationSession,
    mutation: FinalSectorReconciliationMutation,
    source: string,
): FinalSectorReconciliationReceipt {
    const epoch = session.next_epoch;
    session.next_epoch += 1;
    const dirtyStages = stagesForMutation(mutation);
    for (const stage of dirtyStages) {
        session.requested_stage_epochs[stage] = epoch;
    }
    const receipt: FinalSectorReconciliationReceipt = {
        epoch,
        mutation,
        source,
        dirty_stages: dirtyStages,
    };
    session.receipts.push(receipt);
    refreshDirtyWorklist(session);
    return receipt;
}

export function createFinalSectorReconciliationSession(
    turn: number,
    initialSource: string,
): FinalSectorReconciliationSession {
    const session: FinalSectorReconciliationSession = {
        turn,
        stage_epochs: { geometry: 0, territory: 0, roster: 0, ratings: 0 },
        requested_stage_epochs: { geometry: 0, territory: 0, roster: 0, ratings: 0 },
        dirty_worklist: [],
        receipts: [],
        processed_receipts: 0,
        geometry_builds: 0,
        next_epoch: 1,
    };
    recordFinalSectorReconciliationMutation(session, 'geometry', initialSource);
    return session;
}

function assertSessionTurn(session: FinalSectorReconciliationSession, state: GameState): void {
    if (session.turn !== state.meta.turn) {
        throw new Error(
            `Final-sector reconciliation session is turn-local: session=${session.turn}, state=${state.meta.turn}`,
        );
    }
}

function pendingReceipts(session: FinalSectorReconciliationSession): FinalSectorReconciliationReceipt[] {
    return session.receipts.slice(session.processed_receipts);
}

function completePendingStages(session: FinalSectorReconciliationSession): void {
    for (const stage of RECONCILIATION_STAGE_ORDER) {
        if (session.requested_stage_epochs[stage] > session.stage_epochs[stage]) {
            session.stage_epochs[stage] = session.requested_stage_epochs[stage];
        }
    }
    session.processed_receipts = session.receipts.length;
    refreshDirtyWorklist(session);
}

function reportFromCurrentState(state: GameState): FinalSectorTruthReconciliationReport {
    return {
        sectors_rebuilt: 0,
        sectors_rated: Object.keys(state.military.sector_combat_ratings ?? {}).length,
        unresolved_brigades: state.military.unresolved_sector_brigades?.length ?? 0,
        geometry_input_mutations: 0,
    };
}

function captureActiveFormationLocations(state: GameState): Map<string, string | undefined> {
    const locations = new Map<string, string | undefined>();
    const formations = state.military.formations ?? {};
    for (const formationId of Object.keys(formations).sort(strictCompare)) {
        const formation = formations[formationId];
        if (formation?.status === 'active') {
            locations.set(formationId, formation.location_osid);
        }
    }
    return locations;
}

function countActiveFormationLocationMutations(
    before: ReadonlyMap<string, string | undefined>,
    state: GameState,
): number {
    const formations = state.military.formations ?? {};
    let mutations = 0;
    for (const [formationId, locationOsid] of before) {
        const formation = formations[formationId];
        if (formation?.status === 'active' && formation.location_osid !== locationOsid) {
            mutations += 1;
        }
    }
    return mutations;
}

function clearStaleSubSegmentAssignments(state: GameState): void {
    const sectorOwnedBrigades = new Set<string>();
    for (const sector of Object.values(state.military.corps_front_sectors ?? {})) {
        for (const brigadeId of sector.assigned_brigade_ids ?? []) sectorOwnedBrigades.add(brigadeId);
        for (const brigadeId of sector.reserve_brigade_ids ?? []) sectorOwnedBrigades.add(brigadeId);
    }
    const formations = state.military.formations ?? {};
    for (const formationId of Object.keys(formations).sort(strictCompare)) {
        const formation = formations[formationId];
        if (formation?.assigned_sub_segment_id && !sectorOwnedBrigades.has(formationId)) {
            formation.assigned_sub_segment_id = undefined;
        }
    }
}

function runFullGeometryReconciliation(
    state: GameState,
    edges: EdgeRecord[],
    reverseMap: Map<string, string[]> | null,
    centroids: OsidCentroidMap | undefined,
    spatial: SpatialContext | undefined,
    supplyStateByOsid: SupplyStateByOsidReport | null | undefined,
    isFinalPass: boolean,
    finalSaveGeometryProjection: boolean,
): FinalSectorTruthReconciliationReport {
    const activeFormationLocations = captureActiveFormationLocations(state);
    const sectors = buildCorpsFrontSectors(
        state,
        edges,
        reverseMap,
        centroids,
        spatial,
        isFinalPass,
        finalSaveGeometryProjection,
    );
    state.military.corps_front_sectors = sectors;

    const sectorList = Object.values(sectors);
    if (sectorList.length === 0) {
        state.military.sector_combat_ratings = {};
        state.military.unresolved_sector_brigades = [];
        return {
            sectors_rebuilt: 0,
            sectors_rated: 0,
            unresolved_brigades: 0,
            geometry_input_mutations: countActiveFormationLocationMutations(activeFormationLocations, state),
        };
    }

    const adjacency = (spatial?.adjacency as Map<Osid, Osid[]>) ?? buildOsidAdjacency(edges);
    assignBrigadesToSubSegments(state, sectorList, adjacency);
    clearStaleSubSegmentAssignments(state);
    const ratings = computeSectorCombatRatings(state, supplyStateByOsid ?? null);
    return {
        sectors_rebuilt: sectorList.length,
        sectors_rated: ratings.sectors_rated,
        unresolved_brigades: state.military.unresolved_sector_brigades?.length ?? 0,
        geometry_input_mutations: countActiveFormationLocationMutations(activeFormationLocations, state),
    };
}

function runCurrentSectorSeal(
    state: GameState,
    edges: EdgeRecord[],
    supplyStateByOsid?: SupplyStateByOsidReport | null,
    spatial?: SpatialContext,
): FinalSectorTruthReconciliationReport {
    const sectors = state.military.corps_front_sectors;
    if (!sectors || Object.keys(sectors).length === 0) {
        state.military.sector_combat_ratings = {};
        state.military.unresolved_sector_brigades = [];
        return {
            sectors_rebuilt: 0,
            sectors_rated: 0,
            unresolved_brigades: 0,
            geometry_input_mutations: 0,
        };
    }

    const formations = state.military.formations ?? {};
    const adjacency = (spatial?.adjacency as Map<Osid, Osid[]>) ?? buildOsidAdjacency(edges);
    applyFinalSectorOwnerTruthPass(sectors, state, formations, adjacency, {
        allowCollapsedRearGuardAbsorption: true,
    });
    rescueUnassignedLoanedElitesInTerritory(sectors, formations);
    applyFinalSectorOwnerTruthPass(sectors, state, formations, adjacency, {
        allowCollapsedRearGuardAbsorption: true,
    });
    syncSectorAssignmentsToFormations(sectors, formations, adjacency);
    state.military.unresolved_sector_brigades = collectUnresolvedSectorBrigades(
        state,
        sectors,
        formations,
        adjacency,
    );

    const sectorList = Object.values(sectors);
    assignBrigadesToSubSegments(state, sectorList, adjacency);
    clearStaleSubSegmentAssignments(state);
    const ratings = computeSectorCombatRatings(state, supplyStateByOsid ?? null);
    emitFinalUnresolvedSectorWarnings(state.military.unresolved_sector_brigades ?? [], formations);
    return {
        sectors_rebuilt: 0,
        sectors_rated: ratings.sectors_rated,
        unresolved_brigades: state.military.unresolved_sector_brigades?.length ?? 0,
        geometry_input_mutations: 0,
    };
}

function runOperationRosterReconciliation(
    state: GameState,
    edges: EdgeRecord[],
    supplyStateByOsid?: SupplyStateByOsidReport | null,
    spatial?: SpatialContext,
): FinalSectorTruthReconciliationReport {
    const sectors = state.military.corps_front_sectors ?? {};
    const adjacency = (spatial?.adjacency as Map<Osid, Osid[]>) ?? buildOsidAdjacency(edges);
    reconcileOperationSensitiveSectorRoster(state, sectors, adjacency, spatial);
    const sectorList = Object.values(sectors);
    assignBrigadesToSubSegments(state, sectorList, adjacency);
    clearStaleSubSegmentAssignments(state);
    const ratings = computeSectorCombatRatings(state, supplyStateByOsid ?? null);
    return {
        sectors_rebuilt: 0,
        sectors_rated: ratings.sectors_rated,
        unresolved_brigades: state.military.unresolved_sector_brigades?.length ?? 0,
        geometry_input_mutations: 0,
    };
}

/**
 * Run a full geometry epoch, or consume a caller-owned roster/rating receipt.
 * Without a session this preserves the legacy direct-call contract: every call
 * performs a complete rebuild. The turn pipeline always supplies a session.
 */
export function reconcileFinalSectorTruth(
    state: GameState,
    edges: EdgeRecord[],
    reverseMap: Map<string, string[]> | null,
    centroids?: OsidCentroidMap,
    spatial?: SpatialContext,
    supplyStateByOsid?: SupplyStateByOsidReport | null,
    isFinalPass: boolean = false,
    options?: FinalSectorTruthReconciliationOptions,
): FinalSectorTruthReconciliationReport {
    const session = options?.session;
    if (!session) {
        return runFullGeometryReconciliation(
            state,
            edges,
            reverseMap,
            centroids,
            spatial,
            supplyStateByOsid,
            isFinalPass,
            options?.finalSaveGeometryProjection === true,
        );
    }

    assertSessionTurn(session, state);
    const receipts = pendingReceipts(session);
    if (receipts.length === 0) {
        return session.last_report ?? reportFromCurrentState(state);
    }

    const hasGeometryMutation = receipts.some((receipt) => receipt.mutation === 'geometry');
    const hasRosterSealMutation = receipts.some(
        (receipt) => receipt.mutation === 'distribution-roster' || receipt.mutation === 'seal-roster',
    );
    let report: FinalSectorTruthReconciliationReport;

    if (hasGeometryMutation) {
        session.geometry_builds += 1;
        report = runFullGeometryReconciliation(
            state,
            edges,
            reverseMap,
            centroids,
            spatial,
            supplyStateByOsid,
            isFinalPass,
            options?.finalSaveGeometryProjection === true,
        );
    } else if (hasRosterSealMutation) {
        report = runCurrentSectorSeal(state, edges, supplyStateByOsid, spatial);
    } else if (receipts.some((receipt) => receipt.mutation === 'ratings')) {
        const ratings = computeSectorCombatRatings(state, supplyStateByOsid ?? null);
        report = {
            sectors_rebuilt: 0,
            sectors_rated: ratings.sectors_rated,
            unresolved_brigades: state.military.unresolved_sector_brigades?.length ?? 0,
            geometry_input_mutations: 0,
        };
    } else {
        // Operation truth removes duplicate, inactive, or foreign-claimed
        // participants. Geometry and territory stay authoritative, but the new
        // participant set can change coverage donors, commander moves, unstaffed
        // annotations, unresolved brigades, and ratings. Rebuild that complete
        // roster projection without repartitioning topology.
        report = runOperationRosterReconciliation(state, edges, supplyStateByOsid, spatial);
    }

    completePendingStages(session);
    session.last_report = report;
    return report;
}

/**
 * Reconcile only roster/seal/rating truth against existing geometry. With a
 * clean caller-owned session this is a deterministic no-op.
 */
export function sealFinalSectorTruthFromCurrentSectors(
    state: GameState,
    edges: EdgeRecord[],
    supplyStateByOsid?: SupplyStateByOsidReport | null,
    spatial?: SpatialContext,
    options?: FinalSectorTruthSealOptions,
): FinalSectorTruthReconciliationReport {
    const session = options?.session;
    if (!session) return runCurrentSectorSeal(state, edges, supplyStateByOsid, spatial);

    assertSessionTurn(session, state);
    const receipts = pendingReceipts(session);
    if (receipts.length === 0) {
        return session.last_report ?? reportFromCurrentState(state);
    }
    if (receipts.some((receipt) => receipt.mutation === 'geometry')) {
        throw new Error('A full geometry receipt must be processed by reconcileFinalSectorTruth');
    }

    let report: FinalSectorTruthReconciliationReport;
    if (receipts.some(
        (receipt) => receipt.mutation === 'distribution-roster' || receipt.mutation === 'seal-roster',
    )) {
        report = runCurrentSectorSeal(state, edges, supplyStateByOsid, spatial);
    } else if (receipts.some((receipt) => receipt.mutation === 'ratings')) {
        const ratings = computeSectorCombatRatings(state, supplyStateByOsid ?? null);
        report = {
            sectors_rebuilt: 0,
            sectors_rated: ratings.sectors_rated,
            unresolved_brigades: state.military.unresolved_sector_brigades?.length ?? 0,
            geometry_input_mutations: 0,
        };
    } else {
        report = runOperationRosterReconciliation(state, edges, supplyStateByOsid, spatial);
    }

    completePendingStages(session);
    session.last_report = report;
    return report;
}
