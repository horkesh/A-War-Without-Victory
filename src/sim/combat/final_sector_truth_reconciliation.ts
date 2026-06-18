import type { EdgeRecord } from '../../map/settlements.js';
import type { OsidCentroidMap } from '../../data/operational_data_types.js';
import type { FormationState, GameState } from '../../state/game_state.js';
import type { SupplyStateByOsidReport } from '../../state/supply_state_derivation.js';
import type { SpatialContext } from '../spatial_context.js';
import type { Osid } from './osid_adjacency.js';
import { buildOsidAdjacency } from './osid_adjacency.js';
import {
    applyFinalSectorOwnerTruthPass,
    assignBrigadesToSubSegments,
    buildCorpsFrontSectors,
    collectUnresolvedSectorBrigades,
    emitFinalUnresolvedSectorWarnings,
} from './corps_front_sectors.js';
import { computeSectorCombatRatings } from './sector_combat_rating.js';
import { strictCompare } from '../../state/validateGameState.js';
import { syncSectorAssignmentsToFormations } from './brigade_assignment.js';

export interface FinalSectorTruthReconciliationReport {
    sectors_rebuilt: number;
    sectors_rated: number;
    unresolved_brigades: number;
}

export interface FinalSectorTruthReconciliationOptions {
    finalSaveGeometryProjection?: boolean;
}

/**
 * v0.9.3 Lane 4 C5 — skip the rebuild when the step 2 → step 3 pair runs on
 * byte-identical inputs. `reconcile-final-sector-truth-after-ops` re-runs the
 * exact same pipeline as `reconcile-final-sector-truth`; the only intervening
 * step is `reconcile-final-operation-truth`, which mutates only
 * `operation.participating_brigades` / `operation.sector_id` — none of which
 * `buildCorpsFrontSectors`, `assignBrigadesToSubSegments`, or
 * `computeSectorCombatRatings` read. `isFinalPass` only changes whether the
 * final-unresolved warnings are emitted; everything else is identical.
 *
 * Cache key is a content fingerprint over every input the pipeline reads:
 *   - turn
 *   - war_front_edges_osid content (edge_id, endpoints, faction sides; sorted)
 *   - political_controllers entries (sorted)
 *   - active formations (id, location_osid, faction, status-active)
 *   - supply_state_by_osid report entries used by sector combat ratings
 *
 * On hit: all state writes from the prior run are still present. A false ->
 * true final-pass transition rebuilds once because final pass now enables
 * final-only sector repairs before emitting unresolved warnings.
 */
interface ReconcileCacheEntry {
    fingerprint: string;
    report: FinalSectorTruthReconciliationReport;
    lastFinalPass: boolean;
}
const reconcileCache = new WeakMap<GameState, ReconcileCacheEntry>();

function computeSupplyFingerprint(supplyStateByOsid?: SupplyStateByOsidReport | null): string {
    if (!supplyStateByOsid) return 'none';
    const parts = [`schema=${supplyStateByOsid.schema}`, `turn=${supplyStateByOsid.turn}`];
    for (const faction of [...(supplyStateByOsid.factions ?? [])].sort((a, b) => strictCompare(a.faction_id, b.faction_id))) {
        parts.push(`f=${faction.faction_id}`);
        for (const entry of [...(faction.by_osid ?? [])].sort((a, b) => strictCompare(a.osid, b.osid))) {
            parts.push(`${entry.osid}:${entry.state}`);
        }
    }
    return parts.join('|');
}

function computeCorpsCommandFingerprint(state: GameState): string {
    const corpsCommand = state.military.corps_command ?? {};
    const parts: string[] = [];
    for (const corpsId of Object.keys(corpsCommand).sort(strictCompare)) {
        const cmd = corpsCommand[corpsId];
        const participants = new Set<string>();
        for (const op of cmd?.active_operations ?? []) {
            for (const bid of op.participating_brigades ?? []) {
                participants.add(bid);
            }
        }
        parts.push(`${corpsId}:${[...participants].sort(strictCompare).join(',')}`);
    }
    return parts.join('|');
}

function computeFrontEdgeFingerprint(state: GameState): string {
    const edges = state.military.war_front_edges_osid ?? [];
    const parts = edges.map((edge) => JSON.stringify([
        edge.edge_id ?? '',
        edge.a ?? '',
        edge.b ?? '',
        edge.side_a ?? '',
        edge.side_b ?? '',
    ]));
    return parts.sort(strictCompare).join('|');
}

function computeReconcileFingerprint(state: GameState, supplyStateByOsid?: SupplyStateByOsidReport | null): string {
    const turn = state.meta?.turn ?? 0;
    const frontEdges = computeFrontEdgeFingerprint(state);

    const pc = state.political?.political_controllers ?? {};
    const pcKeys = Object.keys(pc).sort(strictCompare);
    const pcParts: string[] = new Array(pcKeys.length);
    for (let i = 0; i < pcKeys.length; i++) {
        const k = pcKeys[i]!;
        pcParts[i] = k + '=' + ((pc as Record<string, string | null | undefined>)[k] ?? '');
    }

    const formations = state.military?.formations ?? {};
    const fmIds = Object.keys(formations).sort(strictCompare);
    const fmParts: string[] = [];
    for (const id of fmIds) {
        const f: FormationState | undefined = formations[id];
        if (!f || f.status !== 'active') continue;
        fmParts.push(id + '@' + (f.location_osid ?? '') + ':' + f.faction);
    }

    return 't' + turn
        + '|fe' + frontEdges
        + '|pc' + pcParts.join('|')
        + '|fm' + fmParts.join('|')
        + '|supply' + computeSupplyFingerprint(supplyStateByOsid)
        + '|ops' + computeCorpsCommandFingerprint(state);
}

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
    const fingerprint = computeReconcileFingerprint(state, supplyStateByOsid);
    const cached = reconcileCache.get(state);
    const finalPassNeedsRebuild = isFinalPass && !cached?.lastFinalPass;
    const projectionNeedsRebuild = options?.finalSaveGeometryProjection === true;
    if (cached && cached.fingerprint === fingerprint && !finalPassNeedsRebuild && !projectionNeedsRebuild) {
        // State is byte-identical to the last reconcile run. All outputs
        // (corps_front_sectors, sector_combat_ratings, unresolved_sector_brigades,
        // formation.assigned_sub_segment_id) are still present in state.
        return cached.report;
    }

    const sectors = buildCorpsFrontSectors(
        state,
        edges,
        reverseMap,
        centroids,
        spatial,
        isFinalPass,
        options?.finalSaveGeometryProjection === true,
    );
    state.military.corps_front_sectors = sectors;

    const sectorList = Object.values(sectors);
    if (sectorList.length === 0) {
        state.military.sector_combat_ratings = {};
        state.military.unresolved_sector_brigades = [];
        const emptyReport: FinalSectorTruthReconciliationReport = {
            sectors_rebuilt: 0,
            sectors_rated: 0,
            unresolved_brigades: 0,
        };
        reconcileCache.set(state, { fingerprint, report: emptyReport, lastFinalPass: isFinalPass });
        return emptyReport;
    }

    const adjacency = (spatial?.adjacency as Map<Osid, Osid[]>) ?? buildOsidAdjacency(edges);
    assignBrigadesToSubSegments(state, sectorList, adjacency);

    // Clear stale assigned_sub_segment_id on formations not in any sector's brigade lists.
    // Life lesson: "When demoting a brigade, always clear derived cache fields."
    // Late writers (recruitment, mobilization, elite recall) can re-assign ssids after
    // the main sector pipeline clears them — this final sweep catches stragglers.
    const sectorOwnedBrigades = new Set<string>();
    for (const sector of sectorList) {
        for (const bid of sector.assigned_brigade_ids ?? []) sectorOwnedBrigades.add(bid);
        for (const bid of sector.reserve_brigade_ids ?? []) sectorOwnedBrigades.add(bid);
    }
    const formations = state.military.formations ?? {};
    for (const fid of Object.keys(formations)) {
        const f = formations[fid];
        if (f.assigned_sub_segment_id && !sectorOwnedBrigades.has(fid)) {
            f.assigned_sub_segment_id = undefined;
        }
    }

    const ratings = computeSectorCombatRatings(state, supplyStateByOsid ?? null);

    const report: FinalSectorTruthReconciliationReport = {
        sectors_rebuilt: sectorList.length,
        sectors_rated: ratings.sectors_rated,
        unresolved_brigades: state.military.unresolved_sector_brigades?.length ?? 0,
    };
    reconcileCache.set(state, { fingerprint, report, lastFinalPass: isFinalPass });
    return report;
}

export function sealFinalSectorTruthFromCurrentSectors(
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
        };
    }

    const formations = state.military.formations ?? {};
    const adjacency = (spatial?.adjacency as Map<Osid, Osid[]>) ?? buildOsidAdjacency(edges);
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
    const sectorOwnedBrigades = new Set<string>();
    for (const sector of sectorList) {
        for (const bid of sector.assigned_brigade_ids ?? []) sectorOwnedBrigades.add(bid);
        for (const bid of sector.reserve_brigade_ids ?? []) sectorOwnedBrigades.add(bid);
    }
    for (const fid of Object.keys(formations)) {
        const f = formations[fid];
        if (f.assigned_sub_segment_id && !sectorOwnedBrigades.has(fid)) {
            f.assigned_sub_segment_id = undefined;
        }
    }

    const ratings = computeSectorCombatRatings(state, supplyStateByOsid ?? null);
    emitFinalUnresolvedSectorWarnings(state.military.unresolved_sector_brigades ?? [], formations);
    return {
        sectors_rebuilt: 0,
        sectors_rated: ratings.sectors_rated,
        unresolved_brigades: state.military.unresolved_sector_brigades?.length ?? 0,
    };
}
