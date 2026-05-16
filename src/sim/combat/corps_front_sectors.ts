/**
 * Corps Front Sectors: partitions the hostile boundary into per-corps sectors.
 *
 * Each corps owns a contiguous slice of the OSID-level hostile boundary in its
 * area of responsibility. Multi-source BFS from corps HQ locations assigns each
 * friendly OSID to the nearest corps; front edges are then partitioned accordingly.
 *
 * GOLDEN RULES:
 *   1. Every active non-exempt field brigade should be assigned to a sector
 *      when that assignment is spatially truthful. Army-HQ / main-staff reserve
 *      brigades are the standing exception until loaned, and disconnected or
 *      unresolved brigades must stay unresolved rather than being force-written
 *      into false sector truth.
 *   2. Brigades at a sector MUST be at the frontline. Exception: one reserve
 *      brigade per sector sits 1 hop behind the front (recovery/reaction).
 *      Deep-rear brigades remain sector-owned, but not in the frontline-assigned bucket.
 *
 * Derived each turn (Engine Invariants §13: no serialization of derived state).
 * Deterministic: sorted iteration via strictCompare, no Math.random().
 *
 * This file is a thin orchestrator. Implementation lives in extracted modules:
 *   sector_utils.ts, sector_edge_adjacency.ts, sector_assertions.ts,
 *   sector_territory.ts, sector_building.ts, sector_splitting.ts,
 *   brigade_assignment.ts, commander_override.ts, subsegment_assignment.ts
 */

import type {
    CorpsFrontSector,
    CorpsFrontSubSegment,
    FactionId,
    FormationId,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import type { EdgeRecord } from '../../map/settlements.js';
import type { OsidCentroidMap } from '../../data/operational_data_types.js';
import type { SpatialContext } from '../spatial_context.js';
import { buildOsidAdjacency, buildSharedBoundaryAdjacency, type Osid } from './osid_adjacency.js';
import { getFormationCorpsId } from './corps_sector_partition.js';
import { strictCompare } from '../../state/validateGameState.js';
import { emitRoutineConsoleWarn } from '../../utils/routine_console_diagnostics.js';
import {
    isSectorAssignmentExemptCorpsId,
    MAX_SECTOR_EDGES,
    MAX_RESERVES_PER_SECTOR,
    MIN_SECTOR_BRIGADES,
} from './corps_front_sectors_constants.js';
import { getCorpsArmyPriorities } from './bot_strategy.js';

// ── Imported from extracted modules ──────────────────────────────────────
import { buildFriendlyComponents, getSectorComponent, getSectorFrontOsids, getSectorUniqueFrontOsids, canAnyBrigadeReachAny, getCorpsForFaction, getFactions, isSectorColdFront } from './sector_utils.js';
import { buildEdgeAdjacency as _buildEdgeAdjacency } from './sector_edge_adjacency.js';
import { assertBrigadeReachability, assertSectorBrigadesActive } from './sector_assertions.js';
import {
    mapOsidsToCorps,
    assignTerritoryVoronoi,
    repairDisconnectedTerritory,
    partitionFrontEdges,
    consolidateCrossCorpsFronts,
    consolidateIsolatedCorpsPockets,
} from './sector_territory.js';
import { buildMultiSectorsForCorps, buildSectorFromSubSegments, findSubSegments, splitOversizedSubSegments } from './sector_building.js';
import { areSectorsEdgeAdjacent, mergeSectors, splitNonContiguousSectors } from './sector_splitting.js';
import {
    classifyBrigadesByTerritory,
    assignCrossCorpsEnclaveDefenders,
    buildOneHopReserveBand,
    ensureMinimumSectorCoverage,
    reclassifyRearBrigades,
    brigadeRequiresSectorAssignment,
    enforcePhysicalSectorOwnership,
    rehomeUnassignedBrigadesToPhysicalSectorOwners,
    deduplicateBrigadesAcrossSectors,
    isMovementOwnedHomeReturn,
    isMovementOwnedReturnToCorps,
    recomputeSectorPowerAndThreat,
    syncSectorAssignmentsToFormations,
    TRUTHFUL_SECTOR_REACHABILITY_MAX_HOPS,
} from './brigade_assignment.js';
import {
    buildCorpsCommanderProfiles,
    commanderReviewAssignment,
} from './commander_override.js';

// node:fs / node:path are imported only for the env-flag-gated jsonl writer
// in `_flushInvocation` below. They are dead-code-eliminable when the flag is
// OFF — the writer's first line is `if (!SECTOR_PARTITION_PERF_FLAG) return null;`
// — but ESM forbids dynamic require() so we name the modules here. UI builds
// (Electron renderer / Vite map) never import this file; it is a sim-only module.
import * as _fsModule from 'node:fs';
import * as _pathModule from 'node:path';

// ═══════════════════════════════════════════════════════════════════════════
// Sector-Partition Perf Instrumentation (LANE-NIGHTSHIFT-SECTOR-PARTITION-INSTRUMENTATION)
//
// Default-OFF env-flag-gated hrtime wrappers around the major sub-functions
// of buildCorpsFrontSectors. Activated by setting the literal string "true" in
// `PERF_PROFILE_SECTOR_PARTITION` in the process env. When the flag is unset
// (or any other value), `_perfTime` short-circuits to a direct call so
// production runs pay only one boolean read per wrapped site invocation.
//
// At the end of each `buildCorpsFrontSectors` call, when the flag is ON, one
// JSONL line is appended to data/derived/_debug/sector_partition_perf.jsonl
// describing per-faction + per-sub-function nanosecond costs for that single
// invocation. Per-corps detail (faction-grouped) is captured during faction-
// sector building; per-pass detail (sealMergedSectorTruth, recoverDroppedFront-
// Edges, applyFinalSectorOwnerTruthPass — all called multiple times per turn)
// is captured per-call and aggregated by label.
//
// Determinism contract:
//   - process.hrtime.bigint() reads only — no Math.random, no Date.now, no
//     new Date, no locale-sort, no environment leak into game state.
//   - jsonl writes happen ONLY when flag is ON; production runs are byte-stable
//     vs flag-OFF runs (verified by tests/sector_partition_instrumentation.test.ts).
// ═══════════════════════════════════════════════════════════════════════════

const nodeProcess = (globalThis as { process?: NodeJS.Process }).process;

const SECTOR_PARTITION_PERF_FLAG: boolean =
    nodeProcess?.env?.PERF_PROFILE_SECTOR_PARTITION === 'true';

/** Returns true iff the sector-partition perf-profile flag is enabled for this process. */
export function isSectorPartitionPerfEnabled(): boolean {
    return SECTOR_PARTITION_PERF_FLAG;
}

interface SectorPartitionPerfBucket {
    /** Total elapsed nanoseconds across all calls within the current invocation. */
    totalNs: bigint;
    /** Number of calls within the current invocation. */
    count: number;
}

interface SectorPartitionInvocationRecord {
    /** Per-invocation per-faction sub-bucket: faction → corps_id → totalNs. */
    perFactionPerCorpsNs: Map<FactionId, Map<string, bigint>>;
    /** Per-invocation per-sub-function bucket. */
    subFunctionNs: Map<string, SectorPartitionPerfBucket>;
}

/**
 * Per-invocation-scoped timing record. The outer call to `buildCorpsFrontSectors`
 * creates one of these and threads it through the body via this module-local
 * field. Each wrapped sub-function call adds to its bucket. At the end of the
 * invocation, the record is flushed as one jsonl line and reset. Reentrant
 * calls share the outer record (we never expect reentrancy — buildCorpsFront-
 * Sectors is not called recursively — but the record is replaced atomically
 * at entry so the worst case is a lost-jsonl-line, never a corrupted state).
 */
let _activeInvocation: SectorPartitionInvocationRecord | null = null;

function _newInvocation(): SectorPartitionInvocationRecord {
    return {
        perFactionPerCorpsNs: new Map(),
        subFunctionNs: new Map(),
    };
}

/**
 * Wrap a synchronous function call with hrtime instrumentation. When the env
 * flag is OFF or no invocation is active, `_perfTime` is a tail-call to `fn()`
 * (only added cost: the boolean check + the function-call frame).
 *
 * If `fn()` throws, the elapsed time IS still recorded (in a `finally` block)
 * and the error is re-thrown — instrumentation never swallows.
 */
function _perfTime<T>(label: string, fn: () => T): T {
    if (!SECTOR_PARTITION_PERF_FLAG) return fn();
    if (!_activeInvocation) return fn();
    const start = nodeProcess!.hrtime.bigint();
    try {
        return fn();
    } finally {
        const elapsed = nodeProcess!.hrtime.bigint() - start;
        const inv = _activeInvocation!;
        let bucket = inv.subFunctionNs.get(label);
        if (!bucket) {
            bucket = { totalNs: 0n, count: 0 };
            inv.subFunctionNs.set(label, bucket);
        }
        bucket.totalNs += elapsed;
        bucket.count += 1;
    }
}

/**
 * Flush the active invocation record as one JSONL line to the canonical _debug
 * path, then clear it. Returns the absolute path written, or null when the flag
 * is OFF or no invocation is active.
 *
 * Output path: data/derived/_debug/sector_partition_perf.jsonl (gitignored).
 *
 * Lazy-loaded `node:fs` and `node:path` so this module remains tree-shakeable
 * for browser builds.
 */
function _flushInvocation(state: GameState, totalNs: bigint, isFinalPass: boolean): string | null {
    if (!SECTOR_PARTITION_PERF_FLAG) return null;
    if (!_activeInvocation) return null;
    const fs = _fsModule;
    const path = _pathModule;
    const cwd = nodeProcess!.cwd();
    const outDir = path.join(cwd, 'data', 'derived', '_debug');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'sector_partition_perf.jsonl');

    const inv = _activeInvocation;
    // Sort sub-functions by label for stable jsonl output.
    const subFunctionLabels = Array.from(inv.subFunctionNs.keys()).sort(strictCompare);
    const subFunctionRows = subFunctionLabels.map((label) => {
        const b = inv.subFunctionNs.get(label)!;
        return { label, total_ns: b.totalNs.toString(), count: b.count };
    });
    // Sort factions then corps for stable jsonl output.
    const factions = Array.from(inv.perFactionPerCorpsNs.keys()).sort(strictCompare);
    const perFactionRows = factions.map((faction) => {
        const corpsMap = inv.perFactionPerCorpsNs.get(faction)!;
        const corpsIds = Array.from(corpsMap.keys()).sort(strictCompare);
        const perCorps = corpsIds.map((corpsId) => ({
            corps_id: corpsId,
            total_ns: corpsMap.get(corpsId)!.toString(),
        }));
        const factionTotal = corpsIds.reduce((acc, c) => acc + corpsMap.get(c)!, 0n);
        return { faction, total_ns: factionTotal.toString(), per_corps: perCorps };
    });

    const line = {
        schema_version: 1,
        flag: 'PERF_PROFILE_SECTOR_PARTITION',
        turn: state.meta.turn,
        is_final_pass: isFinalPass,
        total_ns: totalNs.toString(),
        per_faction: perFactionRows,
        sub_functions: subFunctionRows,
    };
    fs.appendFileSync(outPath, JSON.stringify(line) + '\n', { encoding: 'utf8' });

    _activeInvocation = null;
    return outPath;
}

// ── Test-only surfaces ───────────────────────────────────────────────────
// Exposed solely so tests can verify wrapper non-throwing, jsonl write, and
// flag-gating without spinning up a full scenario run. Production code paths
// inside buildCorpsFrontSectors use the unexported closures directly.
export const __sectorPartitionPerfTestHooks = {
    isFlagOn: () => SECTOR_PARTITION_PERF_FLAG,
    openInvocation: () => {
        _activeInvocation = _newInvocation();
    },
    closeInvocation: () => {
        _activeInvocation = null;
    },
    perfTime: _perfTime,
    snapshotInvocation: () => {
        if (!_activeInvocation) return null;
        const inv = _activeInvocation;
        const subFunctionLabels = Array.from(inv.subFunctionNs.keys()).sort(strictCompare);
        return {
            subFunctions: subFunctionLabels.map((label) => {
                const b = inv.subFunctionNs.get(label)!;
                return { label, totalNs: b.totalNs, count: b.count };
            }),
            perFaction: Array.from(inv.perFactionPerCorpsNs.entries())
                .sort(([a], [b]) => strictCompare(a, b))
                .map(([faction, corpsMap]) => ({
                    faction,
                    perCorps: Array.from(corpsMap.entries())
                        .sort(([a], [b]) => strictCompare(a, b))
                        .map(([corpsId, totalNs]) => ({ corpsId, totalNs })),
                })),
        };
    },
    addFactionCorpsCost: (faction: FactionId, corpsId: string, ns: bigint) => {
        if (!_activeInvocation) return;
        let factionMap = _activeInvocation.perFactionPerCorpsNs.get(faction);
        if (!factionMap) {
            factionMap = new Map<string, bigint>();
            _activeInvocation.perFactionPerCorpsNs.set(faction, factionMap);
        }
        factionMap.set(corpsId, (factionMap.get(corpsId) ?? 0n) + ns);
    },
};

// ═══════════════════════════════════════════════════════════════════════════
// Main Entry Point
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build corps front sectors for all factions.
 * Requires operational edges and OSID front edges to be available.
 *
 * @param state - Current game state (must have war_front_edges_osid populated)
 * @param edges - Operational contact graph edges (for threshold-filtered adjacency maps not in SpatialContext)
 * @param reverseMap - operationalToCanonical map for getPoliticalControllerOSID
 * @param centroids - Optional OSID centroid map
 * @param spatial - SpatialContext providing adjacency, sharedBoundaryAdj, friendlyOsids, components
 * @param isFinalPass - When true, emit "fell through sector pipeline" warnings. Default false
 *   suppresses warnings because early/mid-pipeline invocations produce transient unresolved
 *   brigades that later repair passes resolve. Only the genuinely final invocation
 *   (reconcile-final-sector-truth-after-ops) should set this to true.
 */
export function buildCorpsFrontSectors(
    state: GameState,
    edges: EdgeRecord[],
    reverseMap: Map<string, string[]> | null,
    centroids?: OsidCentroidMap,
    spatial?: SpatialContext,
    isFinalPass: boolean = false,
): Record<string, CorpsFrontSector> {
    const osidFrontEdges = state.military.war_front_edges_osid;
    if (!osidFrontEdges || osidFrontEdges.length === 0) return {};
    if (!edges || edges.length === 0) return {};

    // Open a per-invocation perf record (no-op when flag is OFF).
    const _invStart: bigint = SECTOR_PARTITION_PERF_FLAG ? nodeProcess!.hrtime.bigint() : 0n;
    if (SECTOR_PARTITION_PERF_FLAG) {
        _activeInvocation = _newInvocation();
    }

    // Use SpatialContext adjacency if available, otherwise build from edges (backward compat)
    const adjacency = (spatial?.adjacency as Map<Osid, Osid[]>) ?? buildOsidAdjacency(edges);
    // Shared-boundary-only adjacency for territory contiguity checks.
    // Territory must be connected through direct polygon contact — no distance-contact bridging.
    const sharedBoundaryAdj = (spatial?.sharedBoundaryAdjacency as Map<Osid, Osid[]>) ?? buildSharedBoundaryAdjacency(edges);
    // Strict shared-boundary adjacency (5.5m) for friendly-territory reachability.
    // Same as sharedBoundaryAdj — reuse the already-computed map.
    const strictAdj = sharedBoundaryAdj;
    // Intermediate adjacency (~16.6m) for Case B split threshold.
    const CASE_B_SPLIT_THRESHOLD = 0.00015; // ~16.6m
    const caseBSplitAdj = _perfTime('adjacency-build-caseB', () => {
        const m = new Map<Osid, Osid[]>();
        for (const e of edges) {
            if (!e?.a || !e?.b) continue;
            if (e.min_dist !== undefined && e.min_dist > CASE_B_SPLIT_THRESHOLD) continue;
            const listA = m.get(e.a as Osid) ?? [];
            if (!listA.includes(e.b as Osid)) listA.push(e.b as Osid);
            m.set(e.a as Osid, listA);
            const listB = m.get(e.b as Osid) ?? [];
            if (!listB.includes(e.a as Osid)) listB.push(e.a as Osid);
            m.set(e.b as Osid, listB);
        }
        for (const list of m.values()) list.sort(strictCompare);
        return m;
    });
    // Build edge metadata lookup from osidFrontEdges — used by areSectorsFrontEdgeAdjacent
    // for triple-junction edge-to-edge adjacency checks in both merge passes.
    const globalEdgeMeta = new Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>();
    for (const fe of osidFrontEdges) {
        globalEdgeMeta.set(fe.edge_id, { a: fe.a, b: fe.b, side_a: fe.side_a, side_b: fe.side_b });
    }

    const formations = state.military.formations ?? {};
    const factions = getFactions(state);
    const result: Record<string, CorpsFrontSector> = {};

    for (const faction of factions) {
        const factionSectors = _perfTime(`buildFactionSectors:${faction}`, () => buildFactionSectors(
            state, faction, osidFrontEdges, adjacency, sharedBoundaryAdj, strictAdj, caseBSplitAdj, globalEdgeMeta, formations, reverseMap, centroids, spatial
        ));
        for (const sector of factionSectors) {
            result[sector.sector_id] = sector;
        }
        // Per-corps cost contribution: each faction's sectors carry corps_id;
        // attribute the faction-level cost equally across that faction's corps so
        // a per-corps timeline is available without instrumenting deep into
        // sector_territory.ts (out of EFO scope). This is a faction-bounded
        // approximation, sufficient for spike characterization at corps grain.
        if (SECTOR_PARTITION_PERF_FLAG && _activeInvocation) {
            const inv = _activeInvocation;
            const factionLabel = `buildFactionSectors:${faction}`;
            const factionBucket = inv.subFunctionNs.get(factionLabel);
            if (factionBucket && factionSectors.length > 0) {
                const corpsSet = new Set<string>();
                for (const s of factionSectors) corpsSet.add(s.corps_id);
                const numCorps = corpsSet.size;
                if (numCorps > 0) {
                    const perCorpsNs = factionBucket.totalNs / BigInt(numCorps);
                    let factionMap = inv.perFactionPerCorpsNs.get(faction);
                    if (!factionMap) {
                        factionMap = new Map<string, bigint>();
                        inv.perFactionPerCorpsNs.set(faction, factionMap);
                    }
                    for (const corpsId of corpsSet) {
                        factionMap.set(corpsId, (factionMap.get(corpsId) ?? 0n) + perCorpsNs);
                    }
                }
            }
        }
    }

    // Post-processing: merge small adjacent sectors in the same corps that share
    // municipality territory. Prevents splitting two brigades defending the same
    // area into separate sectors (Brcko fix: 215th and 108th were in different
    // sectors, so reactive defense couldn't concentrate them).
    _perfTime('mergeSmallAdjacentSectors', () => mergeSmallAdjacentSectors(result, adjacency, globalEdgeMeta, sharedBoundaryAdj, centroids));

    // Post-merge contiguity repair: mergeSmallAdjacentSectors unions territory sets
    // without verifying contiguity. Repair any disconnected territory that resulted.
    _perfTime('repairDisconnectedTerritory:post-merge', () => {
        const allSectors = Object.values(result);
        const allFriendly = new Set<string>();
        for (const s of allSectors) {
            for (const osid of s.territory_osids) allFriendly.add(osid);
        }
        repairDisconnectedTerritory(allSectors, sharedBoundaryAdj, allFriendly);
    });
    const emptiedSectorIds = _perfTime('canonicalizeSiblingFrontOwnership:1', () => canonicalizeSiblingFrontOwnership(
        Object.values(result),
        formations,
        globalEdgeMeta,
        adjacency,
        sharedBoundaryAdj,
        caseBSplitAdj,
        centroids,
    ));
    for (const sectorId of emptiedSectorIds) {
        delete result[sectorId];
    }
    _perfTime('mergeLateSiblingFrontFragments', () => mergeLateSiblingFrontFragments(result, adjacency, globalEdgeMeta, sharedBoundaryAdj, centroids));
    _perfTime('enforceFinalSectorGeometryInvariants:1', () => enforceFinalSectorGeometryInvariants(result, adjacency, globalEdgeMeta, sharedBoundaryAdj, caseBSplitAdj, centroids, formations));
    const postInvariantEmptiedSectorIds = _perfTime('canonicalizeSiblingFrontOwnership:2', () => canonicalizeSiblingFrontOwnership(
        Object.values(result),
        formations,
        globalEdgeMeta,
        adjacency,
        sharedBoundaryAdj,
        caseBSplitAdj,
        centroids,
    ));
    for (const sectorId of postInvariantEmptiedSectorIds) {
        delete result[sectorId];
    }
    _perfTime('sealMergedSectorTruth:1', () => sealMergedSectorTruth(result, state, formations, adjacency, globalEdgeMeta, sharedBoundaryAdj, caseBSplitAdj, centroids, spatial));
    _perfTime('relocateMisassignedBrigadesToTruthfulOwners', () => relocateMisassignedBrigadesToTruthfulOwners(Object.values(result), state, formations, adjacency));
    _perfTime('sealMergedSectorTruth:2', () => sealMergedSectorTruth(result, state, formations, adjacency, globalEdgeMeta, sharedBoundaryAdj, caseBSplitAdj, centroids, spatial));
    _perfTime('pruneGhostArtifactSectors:1', () => pruneGhostArtifactSectors(result));
    _perfTime('recoverDroppedFrontEdges:1', () => recoverDroppedFrontEdges(result, state, osidFrontEdges, adjacency, sharedBoundaryAdj, caseBSplitAdj, globalEdgeMeta, formations, reverseMap, centroids, spatial));
    _perfTime('sealMergedSectorTruth:3', () => sealMergedSectorTruth(result, state, formations, adjacency, globalEdgeMeta, sharedBoundaryAdj, caseBSplitAdj, centroids, spatial));
    _perfTime('pruneGhostArtifactSectors:2', () => pruneGhostArtifactSectors(result));
    _perfTime('recoverDroppedFrontEdges:2', () => recoverDroppedFrontEdges(result, state, osidFrontEdges, adjacency, sharedBoundaryAdj, caseBSplitAdj, globalEdgeMeta, formations, reverseMap, centroids, spatial));

    // Final geometry barrier: late recovery and seal passes can still leave
    // duplicate same-corps front ownership on sibling fragments. Resolve those
    // at whole-piece granularity before the final packet rebuild so the last
    // rebuild sees one canonical owner per front fragment instead of trying to
    // canonicalize individual edges in place.
    _perfTime('canonicalizeDuplicateFrontOwnershipByPiece', () => canonicalizeDuplicateFrontOwnershipByPiece(
        result,
        formations,
        adjacency,
        globalEdgeMeta,
        sharedBoundaryAdj,
        caseBSplitAdj,
        centroids,
    ));

    // Final geometry barrier: late recovery and seal passes can still leave
    // fractured frontline packets. Rebuild the final packets from edge truth
    // one last time and preserve brigade ownership across any split so no
    // later writer can silently re-fragment the serialized result.
    _perfTime('enforceFinalSectorGeometryInvariants:2', () => enforceFinalSectorGeometryInvariants(result, adjacency, globalEdgeMeta, sharedBoundaryAdj, caseBSplitAdj, centroids, formations));
    _perfTime('pruneGhostArtifactSectors:3', () => pruneGhostArtifactSectors(result));

    // The final geometry rebuild can leave territory packets stale relative to
    // the recovered/split edge truth. Refresh territory one last time before
    // the final live-owner seal, otherwise zero-owner sibling fragments keep
    // their old one-OSID packets and survive absorption even though the line
    // truth has changed underneath them.
    _perfTime('assignTerritoryVoronoi:1', () => {
        const byFaction = new Map<FactionId, CorpsFrontSector[]>();
        for (const sector of Object.values(result)) {
            const list = byFaction.get(sector.faction) ?? [];
            list.push(sector);
            byFaction.set(sector.faction, list);
        }
        for (const [faction, factionSectors] of byFaction) {
            const friendlyOsids = spatial?.friendlyOsidsByFaction.get(faction)
                ? new Set(spatial.friendlyOsidsByFaction.get(faction)!)
                : buildFriendlyOsidsFromState(state, adjacency, faction);
            const osidToCorps = mapOsidsToCorps(
                state,
                faction,
                getCorpsForFaction(formations, faction),
                adjacency,
                formations,
                reverseMap,
            );
            assignTerritoryVoronoi(factionSectors, adjacency, friendlyOsids, osidToCorps);
            repairDisconnectedTerritory(factionSectors, sharedBoundaryAdj, friendlyOsids);
        }
    });

    // Late recovery can still leave zero-owner sibling fragments behind even
    // after the final geometry rebuild. Run one last live-owner sealing pass so
    // overlapping same-corps fragments are absorbed before final packet truth is
    // synchronized into formation assignments and UI-facing sector geometry.
    _perfTime('sealMergedSectorTruth:4', () => sealMergedSectorTruth(result, state, formations, adjacency, globalEdgeMeta, sharedBoundaryAdj, caseBSplitAdj, centroids, spatial));
    _perfTime('pruneGhostArtifactSectors:4', () => pruneGhostArtifactSectors(result));

    // Merge passes can zero density/power/threat when they union sectors. Refresh
    // metrics before we sync assignments back into formation truth.
    _perfTime('recomputeMetricsByFaction:1', () => recomputeMetricsByFaction(Object.values(result), formations, state));

    // Final packet truth must be reconciled before the last late seal. Any sector
    // bucket that does not physically own its brigade is false final state and must
    // be moved or dropped before the closing absorb/seal pass serializes assignments.
    _perfTime('applyFinalSectorOwnerTruthPass:1', () => applyFinalSectorOwnerTruthPass(result, state, formations, adjacency));
    _perfTime('sealMergedSectorTruth:5', () => sealMergedSectorTruth(result, state, formations, adjacency, globalEdgeMeta, sharedBoundaryAdj, caseBSplitAdj, centroids, spatial));
    _perfTime('pruneGhostArtifactSectors:5', () => pruneGhostArtifactSectors(result));
    _perfTime('rescueUnassignedLoanedElitesInTerritory', () => rescueUnassignedLoanedElitesInTerritory(result, formations));
    _perfTime('applyFinalSectorOwnerTruthPass:2', () => applyFinalSectorOwnerTruthPass(result, state, formations, adjacency));
    const _absorbed = _perfTime('absorbEmptyStaffableSiblingSectors', () => absorbEmptyStaffableSiblingSectors(
        result,
        state,
        formations,
        adjacency,
        sharedBoundaryAdj,
        caseBSplitAdj,
        globalEdgeMeta,
        centroids,
        spatial,
    ));
    if (_absorbed) {
        _perfTime('enforceFinalSectorGeometryInvariants:3', () => enforceFinalSectorGeometryInvariants(result, adjacency, globalEdgeMeta, sharedBoundaryAdj, caseBSplitAdj, centroids, formations));
        _perfTime('pruneGhostArtifactSectors:6', () => pruneGhostArtifactSectors(result));
        _perfTime('assignTerritoryVoronoi:2-post-absorb', () => {
            for (const faction of getFactions(state)) {
                const factionSectors = Object.values(result).filter((sector) => sector.faction === faction);
                if (factionSectors.length === 0) continue;
                const friendlyOsids = spatial?.friendlyOsidsByFaction.get(faction)
                    ? new Set(spatial.friendlyOsidsByFaction.get(faction)!)
                    : buildFriendlyOsidsFromState(state, adjacency, faction);
                const osidToCorps = mapOsidsToCorps(state, faction, getCorpsForFaction(formations, faction), adjacency, formations, reverseMap);
                assignTerritoryVoronoi(factionSectors, adjacency, friendlyOsids, osidToCorps);
                repairDisconnectedTerritory(factionSectors, sharedBoundaryAdj, friendlyOsids);
            }
        });
        _perfTime('applyFinalSectorOwnerTruthPass:3', () => applyFinalSectorOwnerTruthPass(result, state, formations, adjacency));
    }
    _perfTime('repairDisconnectedTerritory:final', () => {
        for (const faction of getFactions(state)) {
            const factionSectors = Object.values(result).filter((sector) => sector.faction === faction);
            if (factionSectors.length === 0) continue;
            const friendlyOsids = spatial?.friendlyOsidsByFaction.get(faction)
                ? new Set(spatial.friendlyOsidsByFaction.get(faction)!)
                : buildFriendlyOsidsFromState(state, adjacency, faction);
            repairDisconnectedTerritory(factionSectors, sharedBoundaryAdj, friendlyOsids);
        }
    });
    _perfTime('applyFinalSectorOwnerTruthPass:4', () => applyFinalSectorOwnerTruthPass(result, state, formations, adjacency));
    _perfTime('annotateUnstaffedFrontSectors', () => annotateUnstaffedFrontSectors(result, state, formations, adjacency, spatial));
    _perfTime('recomputeMetricsByFaction:2', () => recomputeMetricsByFaction(Object.values(result), formations, state));

    // Sync sector assignments back to formation.assignment
    _perfTime('syncSectorAssignmentsToFormations', () => syncSectorAssignmentsToFormations(result, formations, adjacency));
    const _unresolvedBrigades = _perfTime('collectUnresolvedSectorBrigades',
        () => collectUnresolvedSectorBrigades(state, result, formations, adjacency));
    state.military.unresolved_sector_brigades = _unresolvedBrigades;
    if (isFinalPass) {
        emitFinalUnresolvedSectorWarnings(_unresolvedBrigades, formations);
    }

    // Flush jsonl line for this invocation (no-op when flag is OFF).
    if (SECTOR_PARTITION_PERF_FLAG) {
        const totalNs = nodeProcess!.hrtime.bigint() - _invStart;
        _flushInvocation(state, totalNs, isFinalPass);
    }

    return result;
}

/**
 * Rescue pass for loaned elite brigades dropped by merge/seal.
 *
 * A loaned elite may be placed by the loaned-elites pass in classifyBrigadesByTerritory,
 * but sealMergedSectorTruth rebuilds assignments and can discard the placement when the
 * brigade is component-separated from the sector front. This pass runs after all merge/seal
 * work is complete and assigns any unplaced loaned elite as a reserve in its target-corps
 * sector if the brigade is physically in that sector's territory.
 */
function rescueUnassignedLoanedElitesInTerritory(
    sectors: Record<string, CorpsFrontSector>,
    formations: Record<FormationId, FormationState>,
): void {
    const assigned = new Set<FormationId>();
    for (const sec of Object.values(sectors)) {
        for (const bid of sec.assigned_brigade_ids ?? []) assigned.add(bid);
        for (const bid of sec.reserve_brigade_ids ?? []) assigned.add(bid);
        for (const bid of sec.rear_brigade_ids ?? []) assigned.add(bid);
    }

    const sectorList = Object.values(sectors);
    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid];
        if (!f || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (!f.elite_loan_state?.on_loan || !f.elite_loan_state.loaned_to_corps) continue;
        if (assigned.has(fid as FormationId)) continue;
        if (!f.location_osid) continue;

        const targetCorps = f.elite_loan_state.loaned_to_corps;
        let bestSector: CorpsFrontSector | null = null;
        for (const sec of sectorList) {
            if (sec.corps_id !== targetCorps) continue;
            if (!sec.territory_osids.includes(f.location_osid)) continue;
            if (!bestSector || strictCompare(sec.sector_id, bestSector.sector_id) < 0) {
                bestSector = sec;
            }
        }
        if (bestSector) {
            if (bestSector.reserve_brigade_ids.length < MAX_RESERVES_PER_SECTOR) {
                bestSector.reserve_brigade_ids.push(fid as FormationId);
            } else {
                bestSector.assigned_brigade_ids.push(fid as FormationId);
                bestSector.assigned_brigade_ids.sort(strictCompare);
            }
        }
    }
}

function collectUnresolvedSectorBrigades(
    state: GameState,
    sectors: Record<string, CorpsFrontSector>,
    formations: Record<FormationId, FormationState>,
    adjacency: Map<Osid, Osid[]>,
): FormationId[] {
    const sectorList = Object.values(sectors);
    const frontEdges = state.military.war_front_edges_osid ?? [];

    return Object.keys(formations)
        .sort(strictCompare)
        .filter((formationId): formationId is FormationId => {
            const formation = formations[formationId];
            if (!formation || formation.status !== 'active') return false;
            if (formation.kind !== 'brigade' && formation.kind !== 'og' && formation.kind !== 'operational_group') return false;
            const corpsId = getFormationCorpsId(formation);
            const loaned = !!formation.elite_loan_state?.on_loan;
            if (isSectorAssignmentExemptCorpsId(corpsId) && !loaned) return false;
            if (isMovementOwnedHomeReturn(state, formationId, formation)) {
                return false;
            }
            if (isMovementOwnedReturnToCorps(state, formationId, formation, sectorList)) {
                return false;
            }
            if (!brigadeRequiresSectorAssignment(formation, sectorList, adjacency, frontEdges)) return false;
            return formation.assignment?.kind !== 'sector';
        });
}

export function emitFinalUnresolvedSectorWarnings(
    unresolved: FormationId[],
    formations: Record<FormationId, FormationState>,
): void {
    for (const formationId of unresolved) {
        const formation = formations[formationId];
        if (!formation) continue;
        emitRoutineConsoleWarn(
            `[brigade_assignment] UNRESOLVED ${formationId} (${formation.personnel ?? 0} pers): ` +
            `fell through sector pipeline, corps=${getFormationCorpsId(formation)}`
        );
    }
}

function recomputeMetricsByFaction(
    sectors: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
    state: GameState,
): void {
    const byFaction = new Map<FactionId, CorpsFrontSector[]>();
    for (const sector of sectors) {
        const list = byFaction.get(sector.faction) ?? [];
        list.push(sector);
        byFaction.set(sector.faction, list);
    }
    for (const [faction, factionSectors] of byFaction) {
        recomputeSectorPowerAndThreat(factionSectors, formations, faction, state);
    }
}

function canCorpsStaffSectorFront(
    sector: CorpsFrontSector,
    siblingSectors: CorpsFrontSector[],
    corpsBrigadeLocations: string[],
    factionBrigadeLocations: string[],
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
    componentOf: Map<string, number>,
    corpsBrigadeComponents: Set<number>,
    factionBrigadeComponents: Set<number>,
): boolean {
    const uniqueFrontOsids = getSectorUniqueFrontOsids(sector, siblingSectors);
    if (uniqueFrontOsids.size > 0) {
        if (canAnyBrigadeReachAny(
            corpsBrigadeLocations,
            uniqueFrontOsids,
            adjacency,
            friendlyOsids,
            TRUTHFUL_SECTOR_REACHABILITY_MAX_HOPS,
        )) {
            return true;
        }
        return !canAnyBrigadeReachAny(
            factionBrigadeLocations,
            uniqueFrontOsids,
            adjacency,
            friendlyOsids,
            TRUTHFUL_SECTOR_REACHABILITY_MAX_HOPS,
        );
    }

    const sectorComp = getSectorComponent(sector, componentOf);
    return sectorComp === -1
        || corpsBrigadeComponents.has(sectorComp)
        || !factionBrigadeComponents.has(sectorComp);
}

function isSectorUnstaffableByFaction(
    sector: CorpsFrontSector,
    siblingSectors: CorpsFrontSector[],
    factionBrigadeLocations: string[],
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
    componentOf: Map<string, number>,
    factionBrigadeComponents: Set<number>,
): boolean {
    const uniqueFrontOsids = getSectorUniqueFrontOsids(sector, siblingSectors);
    if (uniqueFrontOsids.size > 0) {
        return !canAnyBrigadeReachAny(
            factionBrigadeLocations,
            uniqueFrontOsids,
            adjacency,
            friendlyOsids,
            TRUTHFUL_SECTOR_REACHABILITY_MAX_HOPS,
        );
    }

    const sectorComp = getSectorComponent(sector, componentOf);
    return sectorComp === -1 || !factionBrigadeComponents.has(sectorComp);
}

export function annotateUnstaffedFrontSectors(
    sectors: Record<string, CorpsFrontSector>,
    state: GameState,
    formations: Record<FormationId, FormationState>,
    adjacency: Map<Osid, Osid[]>,
    _spatial?: SpatialContext,
): void {
    const byFaction = new Map<FactionId, CorpsFrontSector[]>();
    for (const sector of Object.values(sectors)) {
        delete sector.unstaffed_front;
        const list = byFaction.get(sector.faction) ?? [];
        list.push(sector);
        byFaction.set(sector.faction, list);
    }

    for (const faction of getFactions(state)) {
        const factionSectors = byFaction.get(faction) ?? [];
        if (factionSectors.length === 0) continue;
        const friendlyOsids = buildFriendlyOsidsFromState(state, adjacency, faction);
        const componentOf = buildFriendlyComponents(adjacency, friendlyOsids);
        const factionBrigadeLocations = Object.values(formations)
            .filter((formation) =>
                formation.faction === faction
                && formation.status === 'active'
                && formation.location_osid)
            .map((formation) => formation.location_osid!);
        const factionBrigadeComponents = new Set<number>();
        for (const location of factionBrigadeLocations) {
            const component = componentOf.get(location);
            if (component != null) factionBrigadeComponents.add(component);
        }

        for (const sector of factionSectors) {
            if (sector.edge_ids.length === 0) continue;
            if ((sector.assigned_brigade_ids?.length ?? 0) + (sector.reserve_brigade_ids?.length ?? 0) > 0) continue;
            if (!isSectorUnstaffableByFaction(
                sector,
                factionSectors,
                factionBrigadeLocations,
                adjacency,
                friendlyOsids,
                componentOf,
                factionBrigadeComponents,
            )) {
                continue;
            }
            sector.unstaffed_front = true;
        }
    }
}

function absorbEmptyStaffableSiblingSectors(
    sectors: Record<string, CorpsFrontSector>,
    state: GameState,
    formations: Record<FormationId, FormationState>,
    adjacency: Map<Osid, Osid[]>,
    sharedBoundaryAdj: Map<Osid, Osid[]>,
    caseBSplitAdj: Map<Osid, Osid[]>,
    edgeMeta: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>,
    centroids?: OsidCentroidMap,
    spatial?: SpatialContext,
): boolean {
    let changed = false;
    const factionGroups = new Map<FactionId, CorpsFrontSector[]>();
    for (const sector of Object.values(sectors)) {
        const list = factionGroups.get(sector.faction) ?? [];
        list.push(sector);
        factionGroups.set(sector.faction, list);
    }

    for (const [faction, factionSectors] of factionGroups) {
        const friendlyOsids = spatial?.friendlyOsidsByFaction.get(faction)
            ? new Set(spatial.friendlyOsidsByFaction.get(faction)!)
            : buildFriendlyOsidsFromState(state, adjacency, faction);
        const componentOf = spatial?.componentsByFaction.get(faction)
            ? new Map(spatial.componentsByFaction.get(faction)!)
            : buildFriendlyComponents(adjacency, friendlyOsids);
        const factionBrigadeLocations: string[] = [];
        const factionBrigadeComponents = new Set<number>();
        for (const fid of Object.keys(formations).sort(strictCompare)) {
            const formation = formations[fid];
            if (!formation || formation.faction !== faction || formation.status !== 'active') continue;
            if (formation.kind !== 'brigade' && formation.kind !== 'og' && formation.kind !== 'operational_group') continue;
            if (!formation.location_osid) continue;
            factionBrigadeLocations.push(formation.location_osid);
            const componentId = componentOf.get(formation.location_osid);
            if (componentId !== undefined) factionBrigadeComponents.add(componentId);
        }

        const corpsGroups = new Map<FormationId, CorpsFrontSector[]>();
        for (const sector of factionSectors) {
            const list = corpsGroups.get(sector.corps_id) ?? [];
            list.push(sector);
            corpsGroups.set(sector.corps_id, list);
        }

        for (const [, corpsSectors] of corpsGroups) {
            for (const sector of [...corpsSectors].sort((a, b) => strictCompare(a.sector_id, b.sector_id))) {
                if (!sectors[sector.sector_id]) continue;
                if (sector.edge_ids.length === 0) continue;
                if ((sector.assigned_brigade_ids?.length ?? 0) + (sector.reserve_brigade_ids?.length ?? 0) > 0) continue;
                if (isSectorUnstaffableByFaction(
                    sector,
                    corpsSectors,
                    factionBrigadeLocations,
                    adjacency,
                    friendlyOsids,
                    componentOf,
                    factionBrigadeComponents,
                )) {
                    continue;
                }

                const staffedSiblings = corpsSectors.filter((candidate) =>
                    candidate.sector_id !== sector.sector_id
                    && sectors[candidate.sector_id]
                    && ((candidate.assigned_brigade_ids?.length ?? 0) + (candidate.reserve_brigade_ids?.length ?? 0) > 0),
                );
                if (staffedSiblings.length === 0) continue;
                const recipient = pickRecoveredFrontEdgeRecipient(
                    sector,
                    staffedSiblings,
                    adjacency,
                    sharedBoundaryAdj,
                    caseBSplitAdj,
                    edgeMeta,
                    centroids,
                );
                if (!recipient) continue;

                recipient.edge_ids = [...new Set([...recipient.edge_ids, ...sector.edge_ids])].sort(strictCompare);
                normalizeSectorSubSegmentsFromEdges(recipient, edgeMeta);
                delete sectors[sector.sector_id];
                changed = true;
            }
        }
    }

    return changed;
}

function mergeLateSiblingFrontFragments(
    sectors: Record<string, CorpsFrontSector>,
    adjacency: Map<Osid, Osid[]>,
    edgeMeta: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>,
    sharedBoundaryAdj: Map<Osid, Osid[]>,
    centroids?: OsidCentroidMap,
): void {
    mergeSmallAdjacentSectors(sectors, adjacency, edgeMeta, sharedBoundaryAdj, centroids);
    const allSectors = Object.values(sectors);
    const allFriendly = new Set<string>();
    for (const sector of allSectors) {
        for (const osid of sector.territory_osids) allFriendly.add(osid);
    }
    repairDisconnectedTerritory(allSectors, sharedBoundaryAdj, allFriendly);
}

function enforceFinalSectorGeometryInvariants(
    sectors: Record<string, CorpsFrontSector>,
    adjacency: Map<Osid, Osid[]>,
    edgeMeta: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>,
    sharedBoundaryAdj: Map<Osid, Osid[]>,
    caseBSplitAdj: Map<Osid, Osid[]>,
    centroids?: OsidCentroidMap,
    formations?: Record<FormationId, FormationState>,
): void {
    const nextSectors: Record<string, CorpsFrontSector> = {};
    const splitGroups: Array<{ original: CorpsFrontSector; pieces: CorpsFrontSector[] }> = [];
    const byCorps = new Map<FormationId, CorpsFrontSector[]>();
    const friendlyByFaction = new Map<FactionId, Set<Osid>>();
    const osidToCorpsByFaction = new Map<FactionId, Map<Osid, FormationId>>();

    for (const sector of Object.values(sectors).sort((a, b) => strictCompare(a.sector_id, b.sector_id))) {
        const list = byCorps.get(sector.corps_id) ?? [];
        list.push(sector);
        byCorps.set(sector.corps_id, list);

        let friendly = friendlyByFaction.get(sector.faction);
        if (!friendly) {
            friendly = new Set<Osid>();
            friendlyByFaction.set(sector.faction, friendly);
        }
        let osidToCorps = osidToCorpsByFaction.get(sector.faction);
        if (!osidToCorps) {
            osidToCorps = new Map<Osid, FormationId>();
            osidToCorpsByFaction.set(sector.faction, osidToCorps);
        }
        for (const osid of sector.territory_osids) {
            friendly.add(osid as Osid);
            if (!osidToCorps.has(osid as Osid)) {
                osidToCorps.set(osid as Osid, sector.corps_id);
            }
        }
    }

    for (const corpsId of [...byCorps.keys()].sort(strictCompare)) {
        const corpsSectors = byCorps.get(corpsId) ?? [];
        let nextIndex = 0;

        for (const sector of corpsSectors) {
            normalizeSectorSubSegmentsFromEdges(sector, edgeMeta);

            const contiguousPieces = splitNonContiguousSectors(
                [sector],
                adjacency,
                sector.faction,
                edgeMeta,
                sharedBoundaryAdj,
                undefined,
                caseBSplitAdj,
                centroids,
            ).sort((a, b) =>
                strictCompare(a.edge_ids[0] ?? a.sector_id, b.edge_ids[0] ?? b.sector_id)
                || strictCompare(a.sector_id, b.sector_id),
            );

            for (const contiguousPiece of contiguousPieces) {
                normalizeSectorSubSegmentsFromEdges(contiguousPiece, edgeMeta);
                const splitPieces = contiguousPiece.edge_ids.length > MAX_SECTOR_EDGES
                    ? splitOversizedSubSegments(contiguousPiece.corps_id, contiguousPiece.sub_segments, edgeMeta)
                    : contiguousPiece.sub_segments;
                const orderedPieces = splitPieces
                    .map((piece) => buildSectorSliceFromSubSegment(contiguousPiece, piece))
                    .sort((a, b) =>
                        strictCompare(a.edge_ids[0] ?? a.sector_id, b.edge_ids[0] ?? b.sector_id)
                        || strictCompare(a.sector_id, b.sector_id),
                    );

                for (let i = 0; i < orderedPieces.length; i++) {
                    const piece = orderedPieces[i]!;
                    const sectorId = `sector:${corpsId}:${nextIndex++}`;
                    piece.sector_id = sectorId;
                    piece.sub_segments = piece.sub_segments.map((subSegment, subIndex) => ({
                        ...subSegment,
                        sub_segment_id: `subseg:${sectorId}:${subIndex}`,
                    }));
                    nextSectors[sectorId] = piece;
                }

                splitGroups.push({ original: sector, pieces: orderedPieces });
            }
        }
    }

    for (const key of Object.keys(sectors)) delete sectors[key];
    for (const [sectorId, sector] of Object.entries(nextSectors).sort((a, b) => strictCompare(a[0], b[0]))) {
        sectors[sectorId] = sector;
    }

    const repairedSectors = Object.values(sectors);
    const byFaction = new Map<FactionId, CorpsFrontSector[]>();
    for (const sector of repairedSectors) {
        const list = byFaction.get(sector.faction) ?? [];
        list.push(sector);
        byFaction.set(sector.faction, list);
    }

    for (const [faction, factionSectors] of byFaction) {
        const friendly = friendlyByFaction.get(faction);
        if (!friendly || friendly.size === 0) continue;
        assignTerritoryVoronoi(
            factionSectors,
            adjacency,
            friendly,
            osidToCorpsByFaction.get(faction),
        );
        repairDisconnectedTerritory(factionSectors, sharedBoundaryAdj, friendly);
    }

    if (formations) {
        for (const group of splitGroups) {
            seedSplitPieceBrigadeBuckets(group.original, group.pieces, formations, adjacency);
        }
    }
}

export function applyFinalSectorOwnerTruthPass(
    sectors: Record<string, CorpsFrontSector>,
    state: GameState,
    formations: Record<FormationId, FormationState>,
    adjacency: Map<Osid, Osid[]>,
): void {
    const sectorList = Object.values(sectors);
    relocateMisassignedBrigadesToTruthfulOwners(sectorList, state, formations, adjacency);

    const byFaction = new Map<FactionId, CorpsFrontSector[]>();
    for (const sector of sectorList) {
        const list = byFaction.get(sector.faction) ?? [];
        list.push(sector);
        byFaction.set(sector.faction, list);
    }

    for (const [faction, factionSectors] of byFaction) {
        const friendlyOsids = buildFriendlyOsidsFromState(state, adjacency, faction);
        rehomeUnassignedBrigadesToPhysicalSectorOwners(
            factionSectors,
            formations,
            faction,
            adjacency,
            friendlyOsids,
        );
        rescueAdjacentLiveOwnersForEmptyFrontSectors(
            factionSectors,
            formations,
            adjacency,
            friendlyOsids,
        );
    }

    normalizeFinalSectorBuckets(
        sectorList,
        formations,
        adjacency,
        state.political?.political_controllers,
    );
}

function rescueAdjacentLiveOwnersForEmptyFrontSectors(
    sectors: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
): void {
    const liveOwnerCount = (sector: CorpsFrontSector): number =>
        sector.assigned_brigade_ids.length + sector.reserve_brigade_ids.length;

    const claims = sectors.map((sector) => {
        const frontSet = getSectorFrontOsids(sector);
        const oneHopBehind = buildOneHopReserveBand(frontSet, adjacency, friendlyOsids);
        return { sector, frontSet, oneHopBehind };
    });

    const byCorps = new Map<FormationId, typeof claims>();
    for (const claim of claims) {
        const list = byCorps.get(claim.sector.corps_id) ?? [];
        list.push(claim);
        byCorps.set(claim.sector.corps_id, list);
    }

    for (const [, corpsClaims] of [...byCorps.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
        const orderedClaims = corpsClaims.sort((a, b) => strictCompare(a.sector.sector_id, b.sector.sector_id));
        for (const recipient of orderedClaims) {
            if (recipient.sector.edge_ids.length === 0) continue;
            if (liveOwnerCount(recipient.sector) > 0) continue;

            const candidates = orderedClaims
                .filter((donor) =>
                    donor.sector.sector_id !== recipient.sector.sector_id
                    && liveOwnerCount(donor.sector) > 1,
                )
                .flatMap((donor) => {
                    const donorReserve = donor.sector.reserve_brigade_ids
                        .filter((brigadeId) => recipient.oneHopBehind.has(formations[brigadeId]?.location_osid ?? ''))
                        .sort(strictCompare)
                        .map((brigadeId) => ({
                            donor,
                            brigadeId,
                            donorRole: 'reserve' as const,
                        }));
                    const donorFront = donor.sector.assigned_brigade_ids
                        .filter((brigadeId) => recipient.oneHopBehind.has(formations[brigadeId]?.location_osid ?? ''))
                        .sort(strictCompare)
                        .map((brigadeId) => ({
                            donor,
                            brigadeId,
                            donorRole: 'front' as const,
                        }));
                    return [...donorReserve, ...donorFront];
                })
                .sort((a, b) =>
                    Number(a.donorRole !== 'reserve') - Number(b.donorRole !== 'reserve')
                    || liveOwnerCount(b.donor.sector) - liveOwnerCount(a.donor.sector)
                    || strictCompare(a.donor.sector.sector_id, b.donor.sector.sector_id)
                    || strictCompare(a.brigadeId, b.brigadeId),
                );

            const best = candidates[0];
            if (!best) continue;

            if (best.donorRole === 'reserve') {
                best.donor.sector.reserve_brigade_ids = best.donor.sector.reserve_brigade_ids
                    .filter((brigadeId) => brigadeId !== best.brigadeId);
            } else {
                best.donor.sector.assigned_brigade_ids = best.donor.sector.assigned_brigade_ids
                    .filter((brigadeId) => brigadeId !== best.brigadeId);
            }
            recipient.sector.reserve_brigade_ids.push(best.brigadeId);
            recipient.sector.reserve_brigade_ids.sort(strictCompare);
        }
    }
}

function normalizeFinalSectorBuckets(
    sectors: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
    adjacency: Map<Osid, Osid[]>,
    politicalControllers?: Record<string, FactionId | null | undefined>,
): void {
    for (const sector of sectors) {
        const frontSet = getSectorFrontOsids(sector);
        const territorySet = new Set(sector.territory_osids);
        const expandedTerritory = new Set(territorySet);
        const friendlyUniverse = politicalControllers
            ? new Set(
                Object.entries(politicalControllers)
                    .filter(([, controller]) => controller === sector.faction)
                    .map(([osid]) => osid),
            )
            : new Set(territorySet);
        const reserveBand = new Set<string>();
        for (const frontOsid of frontSet) {
            for (const neighbor of adjacency.get(frontOsid as Osid) ?? []) {
                if (frontSet.has(neighbor)) continue;
                if (!friendlyUniverse.has(neighbor)) continue;
                reserveBand.add(neighbor);
            }
        }

        const nextAssigned: FormationId[] = [];
        const nextRear: FormationId[] = [];
        const reserveCandidates: Array<{ bid: FormationId; personnel: number }> = [];
        const rearCandidates: Array<{ bid: FormationId; personnel: number }> = [];
        const allBrigades = [...new Set([
            ...sector.assigned_brigade_ids,
            ...sector.reserve_brigade_ids,
            ...(sector.rear_brigade_ids ?? []),
        ])].sort(strictCompare);

        for (const brigadeId of allBrigades) {
            const locationOsid = formations[brigadeId]?.location_osid;
            if (!locationOsid) {
                nextRear.push(brigadeId);
                continue;
            }
            if (frontSet.has(locationOsid)) {
                expandedTerritory.add(locationOsid);
                nextAssigned.push(brigadeId);
                continue;
            }
            if (reserveBand.has(locationOsid)) {
                expandedTerritory.add(locationOsid);
                reserveCandidates.push({ bid: brigadeId, personnel: formations[brigadeId]?.personnel ?? 0 });
                continue;
            }
            if (territorySet.has(locationOsid)) {
                rearCandidates.push({ bid: brigadeId, personnel: formations[brigadeId]?.personnel ?? 0 });
                nextRear.push(brigadeId);
            }
        }

        reserveCandidates.sort((a, b) => b.personnel - a.personnel || strictCompare(a.bid, b.bid));
        const nextReserve = reserveCandidates.slice(0, MAX_RESERVES_PER_SECTOR).map((entry) => entry.bid);
        nextRear.push(...reserveCandidates.slice(MAX_RESERVES_PER_SECTOR).map((entry) => entry.bid));

        sector.assigned_brigade_ids = nextAssigned.sort(strictCompare);
        sector.reserve_brigade_ids = nextReserve.sort(strictCompare);
        sector.rear_brigade_ids = nextRear.sort(strictCompare);
        sector.territory_osids = [...expandedTerritory].sort(strictCompare);
    }
}

function clearRearOnlySectorClaims(
    sectors: CorpsFrontSector[],
): void {
    for (const sector of sectors) {
        if (
            sector.assigned_brigade_ids.length === 0
            && sector.reserve_brigade_ids.length === 0
            && (sector.rear_brigade_ids?.length ?? 0) > 0
        ) {
            sector.rear_brigade_ids = [];
        }
    }
}

function buildSectorSliceFromSubSegment(
    template: CorpsFrontSector,
    subSegment: CorpsFrontSubSegment,
): CorpsFrontSector {
    return {
        ...template,
        edge_ids: [...subSegment.edge_ids].sort(strictCompare),
        sub_segments: [{
            ...subSegment,
            edge_ids: [...subSegment.edge_ids].sort(strictCompare),
            friendly_osids: [...subSegment.friendly_osids].sort(strictCompare),
            enemy_osids: [...subSegment.enemy_osids].sort(strictCompare),
            primary_brigade_ids: [],
        }],
        length_edges: subSegment.edge_ids.length,
        territory_osids: [],
        rear_brigade_ids: [],
        density: 0,
        threat_ratio: 0,
        defensive_power: 0,
    };
}

function seedSplitPieceBrigadeBuckets(
    original: CorpsFrontSector,
    pieces: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
    adjacency: Map<Osid, Osid[]>,
): void {
    const brigadeIds = [...new Set([
        ...original.assigned_brigade_ids,
        ...original.reserve_brigade_ids,
        ...(original.rear_brigade_ids ?? []),
    ])].sort(strictCompare);

    for (const piece of pieces) {
        piece.assigned_brigade_ids = [];
        piece.reserve_brigade_ids = [];
        piece.rear_brigade_ids = [];
    }

    const claims = pieces.map((piece) => {
        const frontSet = getSectorFrontOsids(piece);
        const territorySet = new Set(piece.territory_osids);
        const reserveBand = buildOneHopReserveBand(frontSet, adjacency, territorySet);
        return { piece, frontSet, territorySet, reserveBand };
    });

    for (const brigadeId of brigadeIds) {
        const locationOsid = formations[brigadeId]?.location_osid;
        if (!locationOsid) continue;

        const candidates = claims
            .map((claim) => {
                let role: 'front' | 'reserve' | 'rear' | null = null;
                if (claim.frontSet.has(locationOsid)) role = 'front';
                else if (claim.reserveBand.has(locationOsid)) role = 'reserve';
                else if (claim.territorySet.has(locationOsid)) role = 'rear';
                if (!role) return null;
                return {
                    piece: claim.piece,
                    role,
                    roleRank: role === 'front' ? 0 : role === 'reserve' ? 1 : 2,
                    load:
                        claim.piece.assigned_brigade_ids.length
                        + claim.piece.reserve_brigade_ids.length
                        + (claim.piece.rear_brigade_ids?.length ?? 0),
                };
            })
            .filter((candidate): candidate is {
                piece: CorpsFrontSector;
                role: 'front' | 'reserve' | 'rear';
                roleRank: number;
                load: number;
            } => candidate != null)
            .sort((a, b) =>
                a.roleRank - b.roleRank
                || a.load - b.load
                || strictCompare(a.piece.sector_id, b.piece.sector_id),
            );

        if (candidates.length === 0) continue;
        const best = candidates[0]!;
        if (best.role === 'front') best.piece.assigned_brigade_ids.push(brigadeId);
        else if (best.role === 'reserve') best.piece.reserve_brigade_ids.push(brigadeId);
        else {
            best.piece.rear_brigade_ids ??= [];
            best.piece.rear_brigade_ids.push(brigadeId);
        }
    }

    normalizeFinalSectorBuckets(pieces, formations, adjacency);
}

function canonicalizeDuplicateFrontOwnershipByPiece(
    sectors: Record<string, CorpsFrontSector>,
    formations: Record<FormationId, FormationState>,
    adjacency: Map<Osid, Osid[]>,
    edgeMeta: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>,
    sharedBoundaryAdj: Map<Osid, Osid[]>,
    caseBSplitAdj: Map<Osid, Osid[]>,
    centroids?: OsidCentroidMap,
): void {
    const seenTopologies = new Set<string>();
    let changed = true;
    while (changed) {
        const topologySignature = Object.values(sectors)
            .sort((a, b) => strictCompare(a.sector_id, b.sector_id))
            .map((sector) => `${sector.sector_id}=${[...sector.edge_ids].sort(strictCompare).join(',')}`)
            .join('|');
        if (seenTopologies.has(topologySignature)) {
            break;
        }
        seenTopologies.add(topologySignature);
        changed = false;
        const byCorps = new Map<FormationId, CorpsFrontSector[]>();
        for (const sector of Object.values(sectors).sort((a, b) => strictCompare(a.sector_id, b.sector_id))) {
            if (sector.length_edges === 0) continue;
            const list = byCorps.get(sector.corps_id) ?? [];
            list.push(sector);
            byCorps.set(sector.corps_id, list);
        }

        outer:
        for (const [corpsId, corpsSectors] of [...byCorps.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
            const frontOwnerMap = new Map<string, CorpsFrontSector[]>();
            for (const sector of corpsSectors) {
                for (const osid of [...getSectorFrontOsids(sector)].sort(strictCompare)) {
                    const owners = frontOwnerMap.get(osid) ?? [];
                    owners.push(sector);
                    frontOwnerMap.set(osid, owners);
                }
            }

            for (const [frontOsid, owners] of [...frontOwnerMap.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
                if (owners.length <= 1) continue;

                const ownerPieces = owners
                    .map((sector) => {
                        const pieces = splitNonContiguousSectors(
                            [sector],
                            adjacency,
                            sector.faction,
                            edgeMeta,
                            sharedBoundaryAdj,
                            undefined,
                            caseBSplitAdj,
                            centroids,
                        );
                        const piece = pieces.find((candidate) => getSectorFrontOsids(candidate).has(frontOsid));
                        if (!piece || piece.edge_ids.length === 0) return null;
                        return {
                            sector,
                            piece,
                            incidentEdges: countIncidentEdgesForFrontOsid(piece, frontOsid, edgeMeta),
                            brigadesAtOsid: countBrigadesAtOsid(sector, formations, frontOsid),
                            pieceSize: piece.edge_ids.length,
                        };
                    })
                    .filter((entry): entry is {
                        sector: CorpsFrontSector;
                        piece: CorpsFrontSector;
                        incidentEdges: number;
                        brigadesAtOsid: number;
                        pieceSize: number;
                    } => entry != null)
                    .sort((a, b) =>
                        b.incidentEdges - a.incidentEdges
                        || b.brigadesAtOsid - a.brigadesAtOsid
                        || b.pieceSize - a.pieceSize
                        || strictCompare(a.sector.sector_id, b.sector.sector_id),
                    );

                if (ownerPieces.length <= 1) continue;

                let winnerEntry: (typeof ownerPieces)[number] | null = null;
                let mergedWinnerEdges: string[] = [];
                for (const candidate of ownerPieces) {
                    let nextMergedEdges = [...candidate.piece.edge_ids].sort(strictCompare);
                    let viable = true;
                    for (const loser of ownerPieces) {
                        if (loser.sector.sector_id === candidate.sector.sector_id) continue;
                        const hypotheticalWinner: CorpsFrontSector = {
                            ...candidate.sector,
                            edge_ids: [...new Set([...nextMergedEdges, ...loser.piece.edge_ids])].sort(strictCompare),
                            sub_segments: candidate.sector.sub_segments.map((subSegment) => ({
                                ...subSegment,
                                edge_ids: [...subSegment.edge_ids],
                                friendly_osids: [...subSegment.friendly_osids],
                                enemy_osids: [...subSegment.enemy_osids],
                                primary_brigade_ids: [...subSegment.primary_brigade_ids],
                            })),
                            territory_osids: [...candidate.sector.territory_osids],
                            assigned_brigade_ids: [...candidate.sector.assigned_brigade_ids],
                            reserve_brigade_ids: [...candidate.sector.reserve_brigade_ids],
                            rear_brigade_ids: [...(candidate.sector.rear_brigade_ids ?? [])],
                        };
                        normalizeSectorSubSegmentsFromEdges(hypotheticalWinner, edgeMeta);
                        const split = splitNonContiguousSectors(
                            [hypotheticalWinner],
                            adjacency,
                            candidate.sector.faction,
                            edgeMeta,
                            sharedBoundaryAdj,
                            undefined,
                            caseBSplitAdj,
                            centroids,
                        );
                        if (split.length !== 1) {
                            viable = false;
                            break;
                        }
                        nextMergedEdges = hypotheticalWinner.edge_ids;
                    }
                    if (!viable) continue;
                    winnerEntry = candidate;
                    mergedWinnerEdges = nextMergedEdges;
                    break;
                }

                if (!winnerEntry) continue;

                let mutated = false;
                const winner = winnerEntry.sector;
                const nextWinnerEdgeIds = [
                    ...new Set([
                        ...winner.edge_ids.filter((edgeId) => !winnerEntry!.piece.edge_ids.includes(edgeId)),
                        ...mergedWinnerEdges,
                    ]),
                ].sort(strictCompare);
                if (nextWinnerEdgeIds.length !== winner.edge_ids.length
                    || nextWinnerEdgeIds.some((edgeId, index) => edgeId !== winner.edge_ids[index])) {
                    winner.edge_ids = nextWinnerEdgeIds;
                    normalizeSectorSubSegmentsFromEdges(winner, edgeMeta);
                    mutated = true;
                }

                for (const loser of ownerPieces) {
                    if (loser.sector.sector_id === winner.sector_id) continue;
                    const nextLoserEdgeIds = loser.sector.edge_ids
                        .filter((edgeId) => !loser.piece.edge_ids.includes(edgeId))
                        .sort(strictCompare);
                    if (nextLoserEdgeIds.length !== loser.sector.edge_ids.length
                        || nextLoserEdgeIds.some((edgeId, index) => edgeId !== loser.sector.edge_ids[index])) {
                        loser.sector.edge_ids = nextLoserEdgeIds;
                        normalizeSectorSubSegmentsFromEdges(loser.sector, edgeMeta);
                        mutated = true;
                    }
                }

                if (!mutated) {
                    continue;
                }

                changed = true;
                break outer;
            }
        }
    }
}

export function pruneGhostArtifactSectors(sectors: Record<string, CorpsFrontSector>): void {
    for (const sectorId of Object.keys(sectors).sort(strictCompare)) {
        const sector = sectors[sectorId];
        if (!sector) continue;
        if (
            sector.length_edges > 0
            && sector.territory_osids.length === 0
            && sector.assigned_brigade_ids.length === 0
            && sector.reserve_brigade_ids.length === 0
            && (sector.rear_brigade_ids?.length ?? 0) === 0
        ) {
            delete sectors[sectorId];
        }
    }
}

function recoverDroppedFrontEdges(
    sectors: Record<string, CorpsFrontSector>,
    state: GameState,
    osidFrontEdges: Array<{ edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }>,
    adjacency: Map<Osid, Osid[]>,
    sharedBoundaryAdj: Map<Osid, Osid[]>,
    caseBSplitAdj: Map<Osid, Osid[]>,
    edgeMeta: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>,
    formations: Record<FormationId, FormationState>,
    reverseMap: Map<string, string[]> | null,
    centroids?: OsidCentroidMap,
    spatial?: SpatialContext,
): void {
    let recoveredAny = false;

    for (const faction of getFactions(state)) {
        const corpsIds = getCorpsForFaction(formations, faction);
        if (corpsIds.length === 0) continue;

        const osidToCorps = mapOsidsToCorps(state, faction, corpsIds, adjacency, formations, reverseMap);
        const corpsEdges = partitionFrontEdges(osidFrontEdges, faction, osidToCorps, state, reverseMap, corpsIds, adjacency);
        consolidateCrossCorpsFronts(corpsEdges, osidFrontEdges, faction, adjacency, formations, osidToCorps, centroids, sharedBoundaryAdj);
        consolidateIsolatedCorpsPockets(corpsEdges, osidFrontEdges, faction, adjacency, formations, centroids, sharedBoundaryAdj);
        const friendlyOsids = spatial?.friendlyOsidsByFaction.get(faction)
            ? new Set(spatial.friendlyOsidsByFaction.get(faction)!)
            : buildFriendlyOsidsFromState(state, adjacency, faction);
        const componentOf = spatial?.componentsByFaction.get(faction)
            ? new Map(spatial.componentsByFaction.get(faction)!)
            : buildFriendlyComponents(adjacency, friendlyOsids);
        const factionBrigadeLocations: string[] = [];
        const factionBrigadeComponents = new Set<number>();
        for (const fid of Object.keys(formations).sort(strictCompare)) {
            const formation = formations[fid];
            if (!formation || formation.faction !== faction || formation.status !== 'active') continue;
            if (formation.kind !== 'brigade' && formation.kind !== 'og' && formation.kind !== 'operational_group') continue;
            if (!formation.location_osid) continue;
            factionBrigadeLocations.push(formation.location_osid);
            const componentId = componentOf.get(formation.location_osid);
            if (componentId !== undefined) factionBrigadeComponents.add(componentId);
        }

        for (const corpsId of corpsIds) {
            const expectedEdgeIds = corpsEdges.get(corpsId) ?? [];
            if (expectedEdgeIds.length === 0) continue;

            const currentEdgeIds = new Set<string>();
            const corpsSectorIds = Object.keys(sectors)
                .sort(strictCompare)
                .filter((sectorId) => sectors[sectorId]?.corps_id === corpsId);

            for (const sectorId of corpsSectorIds) {
                const sector = sectors[sectorId];
                if (!sector) continue;
                for (const edgeId of sector.edge_ids) currentEdgeIds.add(edgeId);
            }

            const missingEdgeIds = expectedEdgeIds.filter((edgeId) => !currentEdgeIds.has(edgeId));
            if (missingEdgeIds.length === 0) continue;

            const corpsBrigadeLocations: string[] = [];
            const corpsBrigadeComponents = new Set<number>();
            for (const fid of Object.keys(formations).sort(strictCompare)) {
                const formation = formations[fid];
                if (!formation || formation.faction !== faction || formation.status !== 'active') continue;
                if (formation.kind !== 'brigade' && formation.kind !== 'og' && formation.kind !== 'operational_group') continue;
                if (getFormationCorpsId(formation) !== corpsId) continue;
                if (!formation.location_osid) continue;
                corpsBrigadeLocations.push(formation.location_osid);
                const componentId = componentOf.get(formation.location_osid);
                if (componentId !== undefined) corpsBrigadeComponents.add(componentId);
            }

            const recoveredSubSegments = findSubSegments(
                corpsId,
                faction,
                missingEdgeIds,
                edgeMeta,
                adjacency,
                sharedBoundaryAdj,
                centroids,
            );
            if (recoveredSubSegments.length === 0) continue;

            let nextIndex = 0;
            for (const sectorId of corpsSectorIds) {
                const match = /^sector:[^:]+:(\d+)$/.exec(sectorId);
                if (!match) continue;
                nextIndex = Math.max(nextIndex, Number(match[1]) + 1);
            }

            for (const subSegment of recoveredSubSegments) {
                const recoveredSector = buildSectorFromSubSegments(
                    state,
                    corpsId,
                    faction,
                    nextIndex++,
                    [subSegment],
                    edgeMeta,
                    formations,
                );
                if (!recoveredSector || recoveredSector.edge_ids.length === 0) continue;
                const currentCorpsSectors = corpsSectorIds
                    .map((sectorId) => sectors[sectorId])
                    .filter((sector): sector is CorpsFrontSector => Boolean(sector && sector.corps_id === corpsId));
                if (!canCorpsStaffSectorFront(
                    recoveredSector,
                    [...currentCorpsSectors, recoveredSector],
                    corpsBrigadeLocations,
                    factionBrigadeLocations,
                    adjacency,
                    friendlyOsids,
                    componentOf,
                    corpsBrigadeComponents,
                    factionBrigadeComponents,
                )) {
                    continue;
                }
                const recipient = pickRecoveredFrontEdgeRecipient(
                    recoveredSector,
                    currentCorpsSectors,
                    adjacency,
                    sharedBoundaryAdj,
                    caseBSplitAdj,
                    edgeMeta,
                    centroids,
                );
                if (recipient) {
                    recipient.edge_ids = [...new Set([...recipient.edge_ids, ...recoveredSector.edge_ids])].sort(strictCompare);
                    normalizeSectorSubSegmentsFromEdges(recipient, edgeMeta);
                } else {
                    sectors[recoveredSector.sector_id] = recoveredSector;
                }
                recoveredAny = true;
            }
        }
    }

    if (!recoveredAny) return;

    const emptiedSectorIds = canonicalizeSiblingFrontOwnership(
        Object.values(sectors),
        formations,
        edgeMeta,
        adjacency,
        sharedBoundaryAdj,
        caseBSplitAdj,
        centroids,
    );
    for (const sectorId of emptiedSectorIds) {
        delete sectors[sectorId];
    }

    // Re-run the late sibling merge and final geometry invariant pass after
    // synthetic recovery inserts new sectors. Without this, the recovered edge
    // owner can survive as a same-corps fragment and split a single frontline
    // territory across multiple sectors in the final save.
    mergeLateSiblingFrontFragments(sectors, adjacency, edgeMeta, sharedBoundaryAdj, centroids);
    enforceFinalSectorGeometryInvariants(sectors, adjacency, edgeMeta, sharedBoundaryAdj, caseBSplitAdj, centroids, formations);
    const postInvariantEmptiedRecoveredSectorIds = canonicalizeSiblingFrontOwnership(
        Object.values(sectors),
        formations,
        edgeMeta,
        adjacency,
        sharedBoundaryAdj,
        caseBSplitAdj,
        centroids,
    );
    for (const sectorId of postInvariantEmptiedRecoveredSectorIds) {
        delete sectors[sectorId];
    }

    const sectorList = Object.values(sectors).sort((a, b) => strictCompare(a.sector_id, b.sector_id));
    const byFaction = new Map<FactionId, CorpsFrontSector[]>();
    for (const sector of sectorList) {
        const list = byFaction.get(sector.faction) ?? [];
        list.push(sector);
        byFaction.set(sector.faction, list);
    }

    for (const [faction, factionSectors] of byFaction) {
        const friendlyOsids = spatial?.friendlyOsidsByFaction.get(faction)
            ? new Set(spatial.friendlyOsidsByFaction.get(faction)!)
            : buildFriendlyOsidsFromState(state, adjacency, faction);
        const componentOf = spatial?.componentsByFaction.get(faction)
            ? new Map(spatial.componentsByFaction.get(faction)!)
            : buildFriendlyComponents(adjacency, friendlyOsids);
        const osidToCorps = mapOsidsToCorps(
            state,
            faction,
            getCorpsForFaction(formations, faction),
            adjacency,
            formations,
            reverseMap,
        );

        assignTerritoryVoronoi(factionSectors, adjacency, friendlyOsids, osidToCorps);
        repairDisconnectedTerritory(factionSectors, sharedBoundaryAdj, friendlyOsids);
        classifyBrigadesByTerritory(factionSectors, faction, formations, adjacency, friendlyOsids, componentOf, buildCorpsCommanderProfiles(state, factionSectors), state.military.brigade_sector_override, state);
        assignCrossCorpsEnclaveDefenders(factionSectors, formations, faction, componentOf);
        ensureMinimumSectorCoverage(factionSectors, formations, adjacency, friendlyOsids, componentOf, state);
        reclassifyRearBrigades(factionSectors, formations, adjacency, friendlyOsids);
        deduplicateBrigadesAcrossSectors(factionSectors);
        enforcePhysicalSectorOwnership(factionSectors, formations, adjacency, friendlyOsids);
        rehomeUnassignedBrigadesToPhysicalSectorOwners(factionSectors, formations, faction, adjacency, friendlyOsids);
        reclassifyRearBrigades(factionSectors, formations, adjacency, friendlyOsids);
        recomputeSectorPowerAndThreat(factionSectors, formations, faction, state);
    }

    pruneGhostArtifactSectors(sectors);
}

function pickRecoveredFrontEdgeRecipient(
    recoveredSector: CorpsFrontSector,
    siblingSectors: CorpsFrontSector[],
    adjacency: Map<Osid, Osid[]>,
    sharedBoundaryAdj: Map<Osid, Osid[]>,
    caseBSplitAdj: Map<Osid, Osid[]>,
    edgeMeta: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>,
    centroids?: OsidCentroidMap,
): CorpsFrontSector | null {
    const recoveredFront = getSectorFrontOsids(recoveredSector);
    const recoveredTerritory = new Set(recoveredSector.territory_osids ?? []);
    const recoveredClaimed = new Set<string>([...recoveredFront, ...recoveredTerritory]);

    const candidates = siblingSectors
        .filter((sector) => sector.edge_ids.length > 0)
        .map((sector) => {
            const sectorFront = getSectorFrontOsids(sector);
            const sectorTerritory = new Set(sector.territory_osids ?? []);
            let adjacentClaims = 0;
            for (const osid of recoveredClaimed) {
                if (sectorFront.has(osid)) adjacentClaims += 4;
                if (sectorTerritory.has(osid)) adjacentClaims += 3;
                for (const neighbor of adjacency.get(osid as Osid) ?? []) {
                    if (sectorFront.has(neighbor)) adjacentClaims += 2;
                    if (sectorTerritory.has(neighbor)) adjacentClaims += 1;
                }
            }
            return {
                sector,
                adjacentClaims,
                frontOverlap: [...recoveredFront].filter((osid) => sectorFront.has(osid)).length,
                territoryOverlap: [...recoveredClaimed].filter((osid) => sectorTerritory.has(osid)).length,
                shareEndpoint: shareFrontEdgeEndpoint(recoveredSector, sector) ? 1 : 0,
                edgeAdjacent: areSectorsEdgeAdjacent(recoveredSector, sector, edgeMeta, recoveredSector.faction, sharedBoundaryAdj, centroids) ? 1 : 0,
            };
        })
        .filter((candidate) =>
            candidate.frontOverlap > 0
            || candidate.territoryOverlap > 0
            || candidate.shareEndpoint > 0
            || candidate.edgeAdjacent > 0
            || candidate.adjacentClaims > 0,
        )
        .sort((a, b) =>
            b.frontOverlap - a.frontOverlap
            || b.territoryOverlap - a.territoryOverlap
            || b.shareEndpoint - a.shareEndpoint
            || b.edgeAdjacent - a.edgeAdjacent
            || b.adjacentClaims - a.adjacentClaims
            || strictCompare(a.sector.sector_id, b.sector.sector_id),
        );

    for (const candidate of candidates) {
        const merged = mergeSectors(
            recoveredSector.corps_id,
            candidate.sector,
            recoveredSector,
            candidate.sector.length_edges + recoveredSector.length_edges,
        );
        const contiguousPieces = splitNonContiguousSectors(
            [merged],
            adjacency,
            recoveredSector.faction,
            edgeMeta,
            sharedBoundaryAdj,
            undefined,
            caseBSplitAdj,
            centroids,
        );
        if (contiguousPieces.length === 1) {
            return candidate.sector;
        }
    }

    return null;
}

function sealMergedSectorTruth(
    sectors: Record<string, CorpsFrontSector>,
    state: GameState,
    formations: Record<FormationId, FormationState>,
    adjacency: Map<Osid, Osid[]>,
    edgeMeta: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>,
    sharedBoundaryAdj: Map<Osid, Osid[]>,
    caseBSplitAdj: Map<Osid, Osid[]>,
    centroids?: OsidCentroidMap,
    spatial?: SpatialContext,
): void {
    const sectorList = Object.values(sectors);
    const byFaction = new Map<FactionId, CorpsFrontSector[]>();
    for (const sector of sectorList) {
        const list = byFaction.get(sector.faction) ?? [];
        list.push(sector);
        byFaction.set(sector.faction, list);
    }

    for (const [faction, factionSectors] of byFaction) {
        const friendlyOsids = spatial?.friendlyOsidsByFaction.get(faction)
            ? new Set(spatial.friendlyOsidsByFaction.get(faction)!)
            : buildFriendlyOsidsFromState(state, adjacency, faction);
        const componentOf = spatial?.componentsByFaction.get(faction)
            ? new Map(spatial.componentsByFaction.get(faction)!)
            : buildFriendlyComponents(adjacency, friendlyOsids);

        deduplicateBrigadesAcrossSectors(factionSectors);
        enforcePhysicalSectorOwnership(factionSectors, formations, adjacency, friendlyOsids);
        rehomeUnassignedBrigadesToPhysicalSectorOwners(factionSectors, formations, faction, adjacency, friendlyOsids);
        deduplicateBrigadesAcrossSectors(factionSectors);
        ensureMinimumSectorCoverage(factionSectors, formations, adjacency, friendlyOsids, componentOf, state);
        reclassifyRearBrigades(factionSectors, formations, adjacency, friendlyOsids);
        if (absorbUnstaffedSiblingFrontSectors(sectors, factionSectors, adjacency, edgeMeta, sharedBoundaryAdj, caseBSplitAdj, centroids)) {
            const refreshedFactionSectors = Object.values(sectors).filter((sector) => sector.faction === faction);
            deduplicateBrigadesAcrossSectors(refreshedFactionSectors);
            enforcePhysicalSectorOwnership(refreshedFactionSectors, formations, adjacency, friendlyOsids);
            rehomeUnassignedBrigadesToPhysicalSectorOwners(refreshedFactionSectors, formations, faction, adjacency, friendlyOsids);
            deduplicateBrigadesAcrossSectors(refreshedFactionSectors);
            ensureMinimumSectorCoverage(refreshedFactionSectors, formations, adjacency, friendlyOsids, componentOf, state);
            reclassifyRearBrigades(refreshedFactionSectors, formations, adjacency, friendlyOsids);
        }
    }
}

export function absorbUnstaffedSiblingFrontSectors(
    sectors: Record<string, CorpsFrontSector>,
    factionSectors: CorpsFrontSector[],
    adjacency: Map<Osid, Osid[]>,
    edgeMeta: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>,
    sharedBoundaryAdj: Map<Osid, Osid[]>,
    caseBSplitAdj: Map<Osid, Osid[]>,
    centroids?: OsidCentroidMap,
): boolean {
    let changed = false;
    const liveOwnerCount = (sector: CorpsFrontSector): number =>
        sector.assigned_brigade_ids.length + sector.reserve_brigade_ids.length;
    const byCorps = new Map<FormationId, CorpsFrontSector[]>();
    for (const sector of factionSectors) {
        const list = byCorps.get(sector.corps_id) ?? [];
        list.push(sector);
        byCorps.set(sector.corps_id, list);
    }

    for (const corpsId of [...byCorps.keys()].sort(strictCompare)) {
        const corpsSectors = (byCorps.get(corpsId) ?? []).sort((a, b) => strictCompare(a.sector_id, b.sector_id));
        for (const target of corpsSectors) {
            if (sectors[target.sector_id] !== target) continue;
            const ownerCount = liveOwnerCount(target);
            if (ownerCount > 0 || target.length_edges === 0) continue;

            const recipient = corpsSectors
                .filter((candidate) =>
                    candidate.sector_id !== target.sector_id
                    && liveOwnerCount(candidate) > 0
                    && (
                        shareFrontEdgeEndpoint(target, candidate)
                        || areSectorsEdgeAdjacent(target, candidate, edgeMeta, target.faction, sharedBoundaryAdj, centroids)
                    ))
                .sort((a, b) =>
                    liveOwnerCount(b) - liveOwnerCount(a)
                    || strictCompare(a.sector_id, b.sector_id)
                )[0];

            if (!recipient) continue;

            const liveRecipient = sectors[recipient.sector_id] ?? recipient;
            if (liveRecipient.length_edges + target.length_edges > MAX_SECTOR_EDGES) continue;
            const merged = mergeSectors(corpsId, liveRecipient, target, liveRecipient.length_edges + target.length_edges);
            const contiguousPieces = splitNonContiguousSectors(
                [merged],
                adjacency,
                target.faction,
                edgeMeta,
                sharedBoundaryAdj,
                undefined,
                caseBSplitAdj,
                centroids,
            );
            if (contiguousPieces.length !== 1) continue;
            merged.sector_id = recipient.sector_id;
            merged.sub_segments = merged.sub_segments.map((subSegment, index) => ({
                ...subSegment,
                sub_segment_id: `subseg:${recipient.sector_id}:${index}`,
            }));
            sectors[recipient.sector_id] = merged;
            delete sectors[target.sector_id];
            changed = true;
        }
    }

    return changed;
}

function shareFrontEdgeEndpoint(a: CorpsFrontSector, b: CorpsFrontSector): boolean {
    const endpoints = new Set<string>();
    for (const edgeId of a.edge_ids) {
        const parsed = parseEdgeId(edgeId);
        if (!parsed) continue;
        endpoints.add(parsed.a);
        endpoints.add(parsed.b);
    }
    for (const edgeId of b.edge_ids) {
        const parsed = parseEdgeId(edgeId);
        if (!parsed) continue;
        if (endpoints.has(parsed.a) || endpoints.has(parsed.b)) return true;
    }
    return false;
}

function buildFriendlyOsidsFromState(
    state: GameState,
    adjacency: Map<Osid, Osid[]>,
    faction: FactionId,
): Set<string> {
    const friendly = new Set<string>();
    const pc = state.political.political_controllers ?? {};
    for (const osid of adjacency.keys()) {
        if (pc[osid] === faction) friendly.add(osid);
    }
    for (const [osid, controller] of Object.entries(pc)) {
        if (controller === faction) friendly.add(osid);
    }
    return friendly;
}

export function relocateMisassignedBrigadesToTruthfulOwners(
    sectors: CorpsFrontSector[],
    state: GameState,
    formations: Record<FormationId, FormationState>,
    adjacency: Map<Osid, Osid[]>,
): void {
    const byFaction = new Map<FactionId, CorpsFrontSector[]>();
    for (const sector of sectors) {
        const list = byFaction.get(sector.faction) ?? [];
        list.push(sector);
        byFaction.set(sector.faction, list);
    }

    for (const [faction, factionSectors] of byFaction) {
        const friendlyOsids = buildFriendlyOsidsFromState(state, adjacency, faction);
        const claims = factionSectors.map((sector) => {
            const frontSet = getSectorFrontOsids(sector);
            const territorySet = new Set(sector.territory_osids);
            const oneHopBehind = buildOneHopReserveBand(frontSet, adjacency, friendlyOsids);
            return { sector, frontSet, territorySet, oneHopBehind };
        });

        for (const { sector, frontSet, territorySet, oneHopBehind } of claims) {
            const currentAssigned = [...sector.assigned_brigade_ids];
            const currentReserve = [...sector.reserve_brigade_ids];
            const currentRear = [...(sector.rear_brigade_ids ?? [])];
            sector.assigned_brigade_ids = [];
            sector.reserve_brigade_ids = [];
            sector.rear_brigade_ids = [];

            const keepOrMove = (brigadeId: FormationId, currentRole: 'front' | 'reserve' | 'rear'): void => {
                const formation = formations[brigadeId];
                const locationOsid = formations[brigadeId]?.location_osid;
                const currentClaim = locationOsid == null ? null
                    : frontSet.has(locationOsid) ? 'front'
                        : oneHopBehind.has(locationOsid) ? 'reserve'
                            : territorySet.has(locationOsid) ? 'territory'
                                : null;
                if (currentClaim === 'front') {
                    sector.assigned_brigade_ids.push(brigadeId);
                    return;
                }
                if (currentClaim === 'reserve') {
                    sector.reserve_brigade_ids.push(brigadeId);
                    return;
                }
                if (currentClaim === 'territory') {
                    sector.rear_brigade_ids ??= [];
                    sector.rear_brigade_ids.push(brigadeId);
                    return;
                }

                const candidates = claims
                    .map((candidate) => {
                        if (!locationOsid) return null;
                        const effectiveCorpsId =
                            (formations[brigadeId]?.elite_loan_state?.on_loan && formations[brigadeId]?.elite_loan_state?.loaned_to_corps)
                                ? formations[brigadeId]!.elite_loan_state!.loaned_to_corps
                                : formations[brigadeId]?.corps_id;
                        if (!effectiveCorpsId || candidate.sector.corps_id !== effectiveCorpsId) return null;
                        let claim: 'front' | 'territory' | 'reserve' | null = null;
                        if (candidate.frontSet.has(locationOsid)) claim = 'front';
                        else if (candidate.oneHopBehind.has(locationOsid)) claim = 'reserve';
                        else if (candidate.territorySet.has(locationOsid)) claim = 'territory';
                        if (!claim) return null;
                        return {
                            sector: candidate.sector,
                            claim,
                            claimRank: claim === 'front' ? 0 : claim === 'reserve' ? 1 : 2,
                            load: candidate.sector.assigned_brigade_ids.length + candidate.sector.reserve_brigade_ids.length,
                        };
                    })
                    .filter((candidate): candidate is {
                        sector: CorpsFrontSector;
                        claim: 'front' | 'territory' | 'reserve';
                        claimRank: number;
                        load: number;
                    } => candidate != null)
                    .sort((a, b) =>
                        a.claimRank - b.claimRank
                        || a.load - b.load
                        || strictCompare(a.sector.sector_id, b.sector.sector_id),
                    );

                if (candidates.length === 0) return;
                const best = candidates[0]!;
                if (best.claim === 'reserve') {
                    best.sector.reserve_brigade_ids.push(brigadeId);
                } else if (best.claim === 'territory') {
                    best.sector.rear_brigade_ids ??= [];
                    best.sector.rear_brigade_ids.push(brigadeId);
                } else {
                    best.sector.assigned_brigade_ids.push(brigadeId);
                }
            };

            for (const brigadeId of currentAssigned) keepOrMove(brigadeId, 'front');
            for (const brigadeId of currentReserve) keepOrMove(brigadeId, 'reserve');
            for (const brigadeId of currentRear) keepOrMove(brigadeId, 'rear');

            sector.assigned_brigade_ids.sort(strictCompare);
            sector.reserve_brigade_ids.sort(strictCompare);
            sector.rear_brigade_ids.sort(strictCompare);
        }
    }
}

export function canonicalizeSiblingFrontOwnership(
    sectors: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
    edgeMeta?: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>,
    adjacency?: Map<Osid, Osid[]>,
    sharedBoundaryAdj?: Map<Osid, Osid[]>,
    caseBSplitAdj?: Map<Osid, Osid[]>,
    centroids?: OsidCentroidMap,
): string[] {
    const byCorps = new Map<FormationId, CorpsFrontSector[]>();
    const emptied = new Set<string>();
    for (const sector of sectors) {
        const list = byCorps.get(sector.corps_id) ?? [];
        list.push(sector);
        byCorps.set(sector.corps_id, list);
    }

    for (const corpsSectors of byCorps.values()) {
        const frontOsidToSectors = new Map<string, CorpsFrontSector[]>();
        for (const sector of corpsSectors) {
            const frontOsids = new Set<string>();
            for (const subSegment of sector.sub_segments) {
                for (const osid of subSegment.friendly_osids) frontOsids.add(osid);
            }
            for (const osid of frontOsids) {
                const owners = frontOsidToSectors.get(osid) ?? [];
                owners.push(sector);
                frontOsidToSectors.set(osid, owners);
            }
        }

        for (const [osid, owners] of [...frontOsidToSectors.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
            if (owners.length <= 1) continue;
            const rankedOwners = owners
                .map((sector) => ({
                    sector,
                    incidentEdges: countIncidentEdgesForFrontOsid(sector, osid, edgeMeta),
                    brigadesAtOsid: countBrigadesAtOsid(sector, formations, osid),
                    territoryOwns: sector.territory_osids.includes(osid) ? 1 : 0,
                    totalFrontOsids: getSectorFrontOsids(sector).size,
                }))
                .sort((a, b) =>
                    b.incidentEdges - a.incidentEdges
                    || b.brigadesAtOsid - a.brigadesAtOsid
                    || b.territoryOwns - a.territoryOwns
                    || b.totalFrontOsids - a.totalFrontOsids
                    || strictCompare(a.sector.sector_id, b.sector.sector_id),
                );
            const winner = rankedOwners[0]!.sector;
            for (const owner of rankedOwners.slice(1)) {
                const frontSet = getSectorFrontOsids(owner.sector);
                const movedEdgeIds = owner.sector.edge_ids.filter((edgeId) => {
                    const meta = edgeMeta?.get(edgeId) ?? parseEdgeId(edgeId);
                    if (!meta) return false;
                    const friendlyEndpoint = getFriendlyEndpointForSector(meta, owner.sector.faction);
                    if (friendlyEndpoint != null) return friendlyEndpoint === osid;
                    return meta.a === osid || meta.b === osid;
                });
                if (movedEdgeIds.length === 0) continue;

                if (adjacency && sharedBoundaryAdj && caseBSplitAdj && edgeMeta) {
                    const hypotheticalWinner: CorpsFrontSector = {
                        ...winner,
                        edge_ids: [...new Set([...winner.edge_ids, ...movedEdgeIds])].sort(strictCompare),
                        sub_segments: winner.sub_segments.map((subSegment) => ({
                            ...subSegment,
                            edge_ids: [...subSegment.edge_ids],
                            friendly_osids: [...subSegment.friendly_osids],
                            enemy_osids: [...subSegment.enemy_osids],
                            primary_brigade_ids: [...subSegment.primary_brigade_ids],
                        })),
                        territory_osids: [...winner.territory_osids],
                        assigned_brigade_ids: [...winner.assigned_brigade_ids],
                        reserve_brigade_ids: [...winner.reserve_brigade_ids],
                        rear_brigade_ids: [...(winner.rear_brigade_ids ?? [])],
                    };
                    normalizeSectorSubSegmentsFromEdges(hypotheticalWinner, edgeMeta);
                    const contiguousPieces = splitNonContiguousSectors(
                        [hypotheticalWinner],
                        adjacency,
                        winner.faction,
                        edgeMeta,
                        sharedBoundaryAdj,
                        undefined,
                        caseBSplitAdj,
                        centroids,
                    );
                    if (contiguousPieces.length !== 1) continue;
                }

                owner.sector.edge_ids = owner.sector.edge_ids.filter((edgeId) => !movedEdgeIds.includes(edgeId));
                winner.edge_ids = [...new Set([...winner.edge_ids, ...movedEdgeIds])].sort(strictCompare);
                normalizeSectorSubSegmentsFromEdges(owner.sector, edgeMeta);
                normalizeSectorSubSegmentsFromEdges(winner, edgeMeta);

                if (owner.sector.edge_ids.length === 0 || getSectorFrontOsids(owner.sector).size === 0) {
                    winner.assigned_brigade_ids = [...new Set([...winner.assigned_brigade_ids, ...owner.sector.assigned_brigade_ids])].sort(strictCompare);
                    winner.reserve_brigade_ids = [...new Set([...winner.reserve_brigade_ids, ...owner.sector.reserve_brigade_ids])].sort(strictCompare);
                    winner.territory_osids = [...new Set([...winner.territory_osids, ...owner.sector.territory_osids])].sort(strictCompare);
                    owner.sector.edge_ids = [];
                    owner.sector.sub_segments = [];
                    owner.sector.assigned_brigade_ids = [];
                    owner.sector.reserve_brigade_ids = [];
                    owner.sector.territory_osids = [];
                    owner.sector.length_edges = 0;
                    emptied.add(owner.sector.sector_id);
                    normalizeSectorSubSegmentsFromEdges(winner, edgeMeta);
                }
            }
        }

        for (const sector of corpsSectors) {
            if (emptied.has(sector.sector_id)) continue;
            normalizeSectorSubSegmentsFromEdges(sector, edgeMeta);
        }
    }

    return [...emptied].sort(strictCompare);
}

function countIncidentEdgesForFrontOsid(
    sector: CorpsFrontSector,
    osid: string,
    edgeMeta?: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>,
): number {
    let count = 0;
    for (const edgeId of sector.edge_ids) {
        const meta = edgeMeta?.get(edgeId) ?? parseEdgeId(edgeId);
        if (!meta) continue;
        if (meta.a === osid || meta.b === osid) count++;
    }
    return count;
}

function countBrigadesAtOsid(
    sector: CorpsFrontSector,
    formations: Record<FormationId, FormationState>,
    osid: string,
): number {
    let count = 0;
    for (const brigadeId of [...sector.assigned_brigade_ids, ...sector.reserve_brigade_ids]) {
        if (formations[brigadeId]?.location_osid === osid) count++;
    }
    return count;
}

function parseEdgeId(edgeId: string): { a: string; b: string } | null {
    const separator = edgeId.indexOf('__');
    if (separator < 0) return null;
    return {
        a: edgeId.slice(0, separator),
        b: edgeId.slice(separator + 2),
    };
}

function getFriendlyEndpointForSector(
    edge: { a: string; b: string; side_a?: string | null; side_b?: string | null },
    faction: FactionId,
): string | null {
    if (edge.side_a === faction) return edge.a;
    if (edge.side_b === faction) return edge.b;
    return null;
}

function getEnemyEndpointForSector(
    edge: { a: string; b: string; side_a?: string | null; side_b?: string | null },
    faction: FactionId,
): string | null {
    if (edge.side_a === faction) return edge.b;
    if (edge.side_b === faction) return edge.a;
    return null;
}

function normalizeSectorSubSegmentsFromEdges(
    sector: CorpsFrontSector,
    edgeMeta?: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>,
): void {
    sector.edge_ids = [...new Set(sector.edge_ids)].sort(strictCompare);
    sector.length_edges = sector.edge_ids.length;
    if (sector.edge_ids.length === 0) {
        sector.sub_segments = [];
        return;
    }

    const friendlyOsids = new Set<string>();
    const enemyOsids = new Set<string>();
    for (const edgeId of sector.edge_ids) {
        const meta = edgeMeta?.get(edgeId) ?? parseEdgeId(edgeId);
        if (!meta) continue;
        const friendlyEndpoint = getFriendlyEndpointForSector(meta, sector.faction);
        const enemyEndpoint = getEnemyEndpointForSector(meta, sector.faction);
        if (friendlyEndpoint) friendlyOsids.add(friendlyEndpoint);
        if (enemyEndpoint) enemyOsids.add(enemyEndpoint);
    }

    const subSegmentId = sector.sub_segments[0]?.sub_segment_id ?? `subseg:${sector.sector_id}:0`;
    const primaryBrigadeIds = sector.sub_segments[0]?.primary_brigade_ids ?? [];
    sector.sub_segments = [{
        sub_segment_id: subSegmentId,
        edge_ids: [...sector.edge_ids],
        friendly_osids: [...friendlyOsids].sort(strictCompare),
        enemy_osids: [...enemyOsids].sort(strictCompare),
        length_edges: sector.edge_ids.length,
        primary_brigade_ids: [...primaryBrigadeIds].sort(strictCompare),
    }];
}

/** Maximum combined brigades for a merge candidate pair. */
const MERGE_MAX_COMBINED_BRIGADES = 6;
/** Maximum brigades in a single sector to be considered "small" for merging. */
const MERGE_SMALL_SECTOR_THRESHOLD = 3;

/**
 * Merge small adjacent sectors belonging to the same corps when they share
 * municipality territory. "Adjacent" means their territory_osids overlap in
 * at least one municipality, OR their friendly_osids are OSID-adjacent.
 * Front-edge contiguity guard: only merges if the two sectors' edge sets are
 * connected via triple-junction edge adjacency (Cases A/B via buildEdgeAdjacency).
 */
function mergeSmallAdjacentSectors(
    sectors: Record<string, CorpsFrontSector>,
    adjacency: Map<Osid, Osid[]>,
    edgeMeta: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>,
    sharedBoundaryAdj: Map<Osid, Osid[]>,
    centroids?: OsidCentroidMap,
): void {
    let merged = true;
    while (merged) {
        merged = false;
        const sectorIds = Object.keys(sectors).sort(strictCompare);
        for (let i = 0; i < sectorIds.length && !merged; i++) {
            const a = sectors[sectorIds[i]];
            if (!a) continue;
            if (a.assigned_brigade_ids.length > MERGE_SMALL_SECTOR_THRESHOLD) continue;
            if (a.assigned_brigade_ids.length === 0) continue; // don't merge empty sectors
            for (let j = i + 1; j < sectorIds.length && !merged; j++) {
                const b = sectors[sectorIds[j]];
                if (!b) continue;
                if (b.corps_id !== a.corps_id) continue;
                if (b.assigned_brigade_ids.length > MERGE_SMALL_SECTOR_THRESHOLD) continue;
                if (b.assigned_brigade_ids.length === 0) continue; // don't merge empty sectors
                if (a.assigned_brigade_ids.length + b.assigned_brigade_ids.length > MERGE_MAX_COMBINED_BRIGADES) continue;

                // Check territory adjacency: do any territory OSIDs share an OSID neighbor?
                if (!areSectorsTerritoryAdjacent(a, b, adjacency)) continue;
                // Front-edge contiguity guard: sectors must share at least one
                // front-edge-adjacent OSID pair. Blocks merging isolated fronts
                // (e.g. enclave ring + main front) that share territory topology
                // but whose front-line edge sets are geographically disconnected.
                if (!areSectorsFrontEdgeAdjacent(a, b, edgeMeta, sharedBoundaryAdj, centroids)) continue;

                // Merge b into a as one contiguous frontline sector.
                const mergedSector = mergeSectors(a.corps_id, a, b, 0);
                a.edge_ids = mergedSector.edge_ids;
                a.territory_osids = mergedSector.territory_osids;
                a.assigned_brigade_ids = mergedSector.assigned_brigade_ids;
                a.reserve_brigade_ids = mergedSector.reserve_brigade_ids;
                a.opposing_factions = mergedSector.opposing_factions;
                a.length_edges = mergedSector.length_edges;
                a.density = mergedSector.density;
                a.sub_segments = mergedSector.sub_segments;

                // Remove b
                delete sectors[sectorIds[j]];
                merged = true;
            }
        }
    }
}

function areSectorsTerritoryAdjacent(
    a: CorpsFrontSector,
    b: CorpsFrontSector,
    adjacency: Map<Osid, Osid[]>,
): boolean {
    const bTerrSet = new Set(b.territory_osids);
    for (const osid of a.territory_osids) {
        const neighbors = adjacency.get(osid as Osid) ?? [];
        for (const n of neighbors) {
            if (bTerrSet.has(n)) return true;
        }
    }
    return false;
}

/**
 * Front-edge contiguity guard for sector merges.
 *
 * Returns true iff at least one edge in sector A's edge set is triple-junction-adjacent
 * to at least one edge in sector B's edge set, via buildEdgeAdjacency (Cases A/B).
 *
 * This is stricter than OSID-level polygon adjacency: two front-line OSIDs can share
 * a polygon corner (min_dist=0) while belonging to entirely different front-line arcs
 * (e.g. donje_zesce facing east on the Goražde ring, izbisno facing south on the
 * Kalinovik/Konjic front). OSID adjacency connects them; edge adjacency does not —
 * because no triple junction exists between their edge sets.
 *
 * Sectors with no edge_ids on either side will always return false — they cannot be
 * merged under this guard (no edge evidence of connectivity).
 */
function areSectorsFrontEdgeAdjacent(
    a: CorpsFrontSector,
    b: CorpsFrontSector,
    edgeMeta: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>,
    sharedBoundaryAdj: Map<Osid, Osid[]>,
    centroids?: OsidCentroidMap,
): boolean {
    const aEdges = a.edge_ids;
    const bEdges = b.edge_ids;
    if (aEdges.length === 0 || bEdges.length === 0) return false;

    const bEdgeSet = new Set(bEdges);

    // Determine faction from sector — needed to orient friendly/hostile sides in buildEdgeAdjacency.
    const faction = a.faction;

    // Build edge adjacency for the combined edge set using triple-junction (Cases A/B).
    const combined = [...aEdges, ...bEdges];
    const edgeAdj = _buildEdgeAdjacency(combined, edgeMeta, faction, sharedBoundaryAdj, sharedBoundaryAdj, centroids);

    // Check: does any edge in A have a neighbor in B?
    for (const eid of aEdges) {
        const neighbors = edgeAdj.get(eid) ?? [];
        for (const n of neighbors) {
            if (bEdgeSet.has(n)) return true;
        }
    }
    return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// Per-Faction Sector Building
// ═══════════════════════════════════════════════════════════════════════════

function buildFactionSectors(
    state: GameState,
    faction: FactionId,
    osidFrontEdges: Array<{ edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }>,
    adjacency: Map<Osid, Osid[]>,
    sharedBoundaryAdj: Map<Osid, Osid[]>,
    strictAdj: Map<Osid, Osid[]>,
    caseBSplitAdj: Map<Osid, Osid[]>,
    edgeMeta: Map<string, { a: string; b: string; side_a: string | null; side_b: string | null }>,
    formations: Record<FormationId, FormationState>,
    reverseMap: Map<string, string[]> | null,
    centroids?: OsidCentroidMap,
    spatial?: SpatialContext,
): CorpsFrontSector[] {
    // Step 1: Find corps for this faction
    const corpsIds = getCorpsForFaction(formations, faction);
    if (corpsIds.length === 0) return [];

    // Step 2: Map OSIDs to corps via multi-source BFS
    const osidToCorps = mapOsidsToCorps(
        state, faction, corpsIds, adjacency, formations, reverseMap
    );

    // Step 3: Partition front edges to corps
    const corpsEdges = partitionFrontEdges(
        osidFrontEdges, faction, osidToCorps, state, reverseMap, corpsIds, adjacency
    );
    // Step 3b: Consolidate cross-corps front splits.
    consolidateCrossCorpsFronts(corpsEdges, osidFrontEdges, faction, adjacency, formations, osidToCorps, centroids, sharedBoundaryAdj);
    // Step 3c: Consolidate isolated corps pockets.
    consolidateIsolatedCorpsPockets(corpsEdges, osidFrontEdges, faction, adjacency, formations, centroids, sharedBoundaryAdj);

    // Pre-compute friendly OSIDs once for territory, brigade assignment, and contiguity checks.
    // Use SpatialContext if available; otherwise build from political_controllers (backward compat).
    let friendlyOsids: Set<string>;
    if (spatial) {
        const spatialFriendly = spatial.friendlyOsidsByFaction.get(faction);
        friendlyOsids = spatialFriendly ? new Set(spatialFriendly) : new Set<string>();
    } else {
        friendlyOsids = new Set<string>();
        const pc = state.political.political_controllers ?? {};
        for (const osid of adjacency.keys()) {
            if (pc[osid] === faction) friendlyOsids.add(osid);
        }
        for (const [osid, ctrl] of Object.entries(pc)) {
            if (ctrl === faction) friendlyOsids.add(osid);
        }
    }

    // Pre-compute friendly connected components for staffability check (FIX 1).
    // A sector is "unstaffable" if no brigade from its corps exists in the same
    // friendly connected component — meaning no unit can physically reach it.
    // Use SpatialContext if available; otherwise build from adjacency + friendlyOsids.
    const preComponentOf = ((spatial?.componentsByFaction.get(faction)) ?? buildFriendlyComponents(adjacency, friendlyOsids)) as Map<string, number>;
    const factionBrigadeLocations: string[] = [];
    const factionBrigadeComponents = new Set<number>();
    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid];
        if (!f || f.faction !== faction || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (!f.location_osid) continue;
        factionBrigadeLocations.push(f.location_osid);
        const comp = preComponentOf.get(f.location_osid);
        if (comp !== undefined) factionBrigadeComponents.add(comp);
    }

    // Step 4: Build multi-sectors (sub-segments promoted to independent sectors)
    const sectors: CorpsFrontSector[] = [];
    for (const corpsId of corpsIds) {
        if (isSectorAssignmentExemptCorpsId(corpsId)) continue;
        const edgeIds = corpsEdges.get(corpsId);
        if (!edgeIds || edgeIds.length === 0) continue;

        // Collect component IDs where this corps has at least one brigade.
        const corpsBrigadeComponents = new Set<number>();
        for (const fid of Object.keys(formations).sort(strictCompare)) {
            const f = formations[fid];
            if (!f || f.faction !== faction || f.status !== 'active') continue;
            if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
            if (getFormationCorpsId(f) !== corpsId) continue;
            if (!f.location_osid) continue;
            const comp = preComponentOf.get(f.location_osid);
            if (comp !== undefined) corpsBrigadeComponents.add(comp);
        }

        const corpsMultiSectors = buildMultiSectorsForCorps(
            state, corpsId, faction, edgeIds, osidFrontEdges,
            adjacency, sharedBoundaryAdj, strictAdj, caseBSplitAdj, formations, reverseMap, centroids, friendlyOsids
        );

        // Collect sorted brigade locations for reachability BFS (deterministic: sorted by formation ID).
        const corpsBrigadeLocations: string[] = [];
        for (const fid of Object.keys(formations).sort(strictCompare)) {
            const f = formations[fid];
            if (!f || f.faction !== faction || f.status !== 'active') continue;
            if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
            if (getFormationCorpsId(f) !== corpsId) continue;
            if (f.location_osid) corpsBrigadeLocations.push(f.location_osid);
        }

        for (const sector of corpsMultiSectors) {
            // FIX 1 (Option Y): Strengthened unstaffable-sector guard.
            //
            // Original check: if no corps brigade shares the same friendly connected
            // component as the sector, skip it. Bug: getSectorComponent returns the
            // component of the FIRST territory OSID found in componentOf, which may
            // be a shared junction OSID (kijevo_2) that IS in the main component —
            // causing a ghost sector (golubici_2 is unreachable) to pass the guard.
            //
            // New check: compute the sector's UNIQUE front OSIDs (front OSIDs not
            // shared with any sibling sector for this corps). If unique OSIDs exist
            // and NO corps brigade can reach any of them within
            // TRUTHFUL_SECTOR_REACHABILITY_MAX_HOPS hops through friendly territory,
            // the sector is an unstaffable ghost — skip it early.
            //
            // Falls back to the original component check when all front OSIDs are
            // shared (no unique ones), so junction-only sectors are still handled.
            if (!canCorpsStaffSectorFront(
                sector,
                corpsMultiSectors,
                corpsBrigadeLocations,
                factionBrigadeLocations,
                adjacency,
                friendlyOsids,
                preComponentOf,
                corpsBrigadeComponents,
                factionBrigadeComponents,
            )) {
                continue;
            }
            sectors.push(sector);
        }
    }

    // NOTE: Cold-front sector suppression was attempted here but reverted.
    // Removing even tiny cold-front sectors changes Territory Voronoi (Step 5),
    // cascading into different brigade distribution and combat outcomes globally.
    // The ghost sector sanitizer (sanitize-ghost-sector-power pipeline step)
    // already zeros stats for empty sectors — that's sufficient.

    // Step 4d: Merge undersized corps sectors when brigade/sector ratio < MIN_SECTOR_BRIGADES.
    // Herzegovina Corps with 8 brigades and 5 sectors (1.6 brig/sector) creates empty sectors.
    // Merge the smallest adjacent pair until the ratio is met or no adjacent merges remain.
    {
        const corpsIdSet = new Set(sectors.map(s => s.corps_id));
        for (const cid of [...corpsIdSet].sort(strictCompare)) {
            // Count active brigades for this corps
            let corpsBrigadeCount = 0;
            for (const fid of Object.keys(formations).sort(strictCompare)) {
                const f = formations[fid];
                if (!f || f.faction !== faction || f.status !== 'active') continue;
                if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
                if (getFormationCorpsId(f) !== cid) continue;
                corpsBrigadeCount++;
            }

            // Iteratively merge the smallest adjacent sector pair until ratio is met
            let changed = true;
            while (changed) {
                changed = false;
                const corpsSectors = sectors.filter(s => s.corps_id === cid);
                if (corpsSectors.length <= 1) break;
                if (corpsBrigadeCount / corpsSectors.length >= MIN_SECTOR_BRIGADES) break;

                // Find the smallest sector (by edge count, ties broken by ID)
                let smallestIdx = -1;
                let smallestSize = Infinity;
                for (let i = 0; i < corpsSectors.length; i++) {
                    const s = corpsSectors[i]!;
                    if (s.length_edges < smallestSize ||
                        (s.length_edges === smallestSize && smallestIdx >= 0 &&
                            strictCompare(s.sector_id, corpsSectors[smallestIdx]!.sector_id) < 0)) {
                        smallestSize = s.length_edges;
                        smallestIdx = i;
                    }
                }
                if (smallestIdx === -1) break;

                const target = corpsSectors[smallestIdx]!;
                // Find the smallest adjacent neighbor
                let bestNeighborIdx = -1;
                let bestNeighborSize = Infinity;
                for (let i = 0; i < corpsSectors.length; i++) {
                    if (i === smallestIdx) continue;
                    const candidate = corpsSectors[i]!;
                    if (!areSectorsTerritoryAdjacent(target, candidate, adjacency)) continue;
                    // Front-edge contiguity guard: block merges across isolated fronts
                    if (!areSectorsFrontEdgeAdjacent(target, candidate, edgeMeta, sharedBoundaryAdj, centroids)) continue;
                    if (candidate.length_edges < bestNeighborSize ||
                        (candidate.length_edges === bestNeighborSize && bestNeighborIdx >= 0 &&
                            strictCompare(candidate.sector_id, corpsSectors[bestNeighborIdx]!.sector_id) < 0)) {
                        bestNeighborSize = candidate.length_edges;
                        bestNeighborIdx = i;
                    }
                }
                if (bestNeighborIdx === -1) break; // No adjacent neighbor — can't merge further

                // Merge target into neighbor (in the main sectors array)
                const neighbor = corpsSectors[bestNeighborIdx]!;
                const mergedIdx = sectors.indexOf(neighbor);
                const targetMainIdx = sectors.indexOf(target);
                if (mergedIdx === -1 || targetMainIdx === -1) break;

                // Merge in-place as one contiguous frontline sector.
                const mergedSector = mergeSectors(cid, neighbor, target, 0);
                neighbor.edge_ids = mergedSector.edge_ids;
                neighbor.territory_osids = mergedSector.territory_osids;
                neighbor.assigned_brigade_ids = mergedSector.assigned_brigade_ids;
                neighbor.reserve_brigade_ids = mergedSector.reserve_brigade_ids;
                neighbor.opposing_factions = mergedSector.opposing_factions;
                neighbor.length_edges = mergedSector.length_edges;
                neighbor.sub_segments = mergedSector.sub_segments;
                neighbor.density = mergedSector.density;

                // Remove the target sector
                sectors.splice(targetMainIdx, 1);
                changed = true;
            }
        }
    }

    // Step 5: Territory Voronoi — BFS from Front Edges into Depth
    assignTerritoryVoronoi(sectors, adjacency, friendlyOsids, osidToCorps);

    // Step 5b: Repair disconnected territory — Voronoi BFS can assign non-contiguous
    // OSIDs to a sector when front edges are separated. BFS through each sector's
    // territory, keep the largest connected component, reassign orphans to adjacent sectors.
    repairDisconnectedTerritory(sectors, sharedBoundaryAdj, friendlyOsids);

    // Pre-compute friendly territory connected components (used by steps 6 and 7).
    // Use SpatialContext if available; otherwise build from adjacency + friendlyOsids.
    const componentOf = ((spatial?.componentsByFaction.get(faction)) ?? buildFriendlyComponents(adjacency, friendlyOsids)) as Map<string, number>;

    // Step 6: Classify brigades — corps-driven assignment.
    const commanderProfiles = buildCorpsCommanderProfiles(state, sectors);
    const playerOverrides = state.military.brigade_sector_override;
    classifyBrigadesByTerritory(sectors, faction, formations, adjacency, friendlyOsids, componentOf, commanderProfiles, playerOverrides, state);

    // Step 6b: Cross-corps enclave defense
    assignCrossCorpsEnclaveDefenders(sectors, formations, faction, componentOf);

    // Step 7: Ensure every sector with front edges has at least one assigned brigade.
    ensureMinimumSectorCoverage(sectors, formations, adjacency, friendlyOsids, componentOf, state);

    // Step 8: Reclassify brigades by frontline proximity.
    reclassifyRearBrigades(sectors, formations, adjacency, friendlyOsids);

    // Step 8a: Commander reviews mechanical assignment and issues overrides.
    {
        const uniqueCorps = [...new Set(sectors.map(s => s.corps_id))].sort();
        for (const cid of uniqueCorps) {
            const profile = commanderProfiles.get(cid);
            if (!profile) continue;
            const priorities = getCorpsArmyPriorities(faction, cid, state.meta.turn);
            // Build op participants set — never reassign brigades mid-operation
            const opParticipants = new Set<string>();
            const cmd = state.military.corps_command?.[cid];
            if (cmd?.active_operations) {
                for (const op of cmd.active_operations) {
                    for (const bid of op.participating_brigades) {
                        opParticipants.add(bid);
                    }
                }
            }
            commanderReviewAssignment(
                cid, sectors, formations, priorities, profile,
                componentOf, adjacency, friendlyOsids, opParticipants,
            );
        }
    }

    // Step 8b: Deduplicate
    deduplicateBrigadesAcrossSectors(sectors);

    // Step 8c: Strip any residual paper assignments that do not physically belong to the sector.
    enforcePhysicalSectorOwnership(sectors, formations, adjacency, friendlyOsids);

    // Step 8d: Reattach any now-unassigned brigades whose current locations are still
    // truthfully owned by an existing sector.
    rehomeUnassignedBrigadesToPhysicalSectorOwners(sectors, formations, faction, adjacency, friendlyOsids);

    // Step 8e: Re-normalize reserve/frontline roles after truthful rehome.
    reclassifyRearBrigades(sectors, formations, adjacency, friendlyOsids);

    // Step 8f: Recompute defensive_power and threat_ratio from final brigade sets.
    recomputeSectorPowerAndThreat(sectors, formations, faction, state);

    // Final prune: remove ghost artifact sectors
    const sectorMap = Object.fromEntries(sectors.map((sector) => [sector.sector_id, sector] as const));
    pruneGhostArtifactSectors(sectorMap);
    const pruned = Object.values(sectorMap).filter(s => {
        if (s.length_edges === 0) return false;
        return true;
    });
    pruned.sort((a, b) => strictCompare(a.sector_id, b.sector_id));

    // ── INVARIANT assertions ──
    // assertBrigadeReachability returns unreachable brigade IDs; demote them from
    // assigned_brigade_ids to reserve_brigade_ids so the pipeline does not write
    // false frontline state. Does NOT throw — demotion is safer than hard-crash.
    const unreachableIds = assertBrigadeReachability(pruned, formations, componentOf);
    if (unreachableIds.length > 0) {
        const unreachableSet = new Set(unreachableIds);
        for (const sec of pruned) {
            const demoted: string[] = [];
            sec.assigned_brigade_ids = sec.assigned_brigade_ids.filter(bid => {
                if (unreachableSet.has(bid)) { demoted.push(bid); return false; }
                return true;
            });
            for (const bid of demoted) {
                if (!sec.reserve_brigade_ids.includes(bid)) {
                    sec.reserve_brigade_ids.push(bid);
                }
                // GAP 1 fix: clear stale sub-segment assignment on demoted brigades.
                // A demoted brigade no longer holds a frontline sub-segment — leaving
                // assigned_sub_segment_id set would cause the UI adapter to show it as
                // still assigned to a sub-segment it no longer defends.
                const f = formations[bid];
                if (f) f.assigned_sub_segment_id = undefined;
            }
        }
    }
    ensureMinimumSectorCoverage(pruned, formations, adjacency, friendlyOsids, componentOf, state);
    reclassifyRearBrigades(pruned, formations, adjacency, friendlyOsids);
    recomputeSectorPowerAndThreat(pruned, formations, faction, state);
    assertSectorBrigadesActive(pruned, formations);

    return pruned;
}

// ═══════════════════════════════════════════════════════════════════════════
// Re-exports for backward compatibility
// All consumers import from this file; extracted modules are internal.
// ═══════════════════════════════════════════════════════════════════════════

// sector_utils.ts
export {
    buildFriendlyComponents,
    getSectorComponent,
    getSectorFrontOsids,
    findSectorForEnemyOsid,
    buildSectorDefenseByFactionAndOsid,
    getCorpsHqOsid,
    bfsToNearestSector,
    bfsDistance,
    getCorpsForFaction,
    getFactions,
    REASSIGNMENT_ENTRENCHMENT_RETAIN,
    isSectorColdFront,
} from './sector_utils.js';

// sector_edge_adjacency.ts
export {
    buildEdgeAdjacency,
    buildEdgeAdjacencyStrictCaseB,
    isSegmentAdjacent,
    isCaseBBridge,
    isOsidAdjacent,
} from './sector_edge_adjacency.js';

// sector_assertions.ts
export {
    assertSectorBrigadesActive,
    filterReachableReassignmentOrders,
} from './sector_assertions.js';

// sector_territory.ts
export {
    mapOsidsToCorps,
    assignTerritoryVoronoi,
    repairDisconnectedTerritory,
    partitionFrontEdges,
    bfsNearestClaimedCorps,
    findSubordinateOsid,
    consolidateCrossCorpsFronts,
    consolidateIsolatedCorpsPockets,
    isEdgeProtectedFromReassignment,
} from './sector_territory.js';

// sector_building.ts
export {
    buildMultiSectorsForCorps,
    findSubSegments,
    buildSectorFromSubSegments,
    splitOversizedSubSegments,
    decomposeIntoConnectedComponents,
    splitSubSegmentAtMidpoint,
    walkEdgeChain,
    buildSubSegmentFromEdges,
} from './sector_building.js';

// sector_splitting.ts
export {
    splitNonContiguousSectors,
    mergeUndersizedSubSegments,
    mergeUndersizedSectors,
    mergeSubSegmentsInto,
    areSectorsEdgeAdjacent,
    mergeSectors,
} from './sector_splitting.js';

// brigade_assignment.ts
export {
    classifyBrigadesByTerritory,
    assignCrossCorpsEnclaveDefenders,
    reclassifyRearBrigades,
    ensureMinimumSectorCoverage,
    deduplicateBrigadesAcrossSectors,
    recomputeSectorPowerAndThreat,
    syncSectorAssignmentsToFormations,
} from './brigade_assignment.js';

// commander_override.ts
export {
    type CorpsCommanderProfile,
    type CommanderOverride,
    commanderReviewAssignment,
    buildCorpsCommanderProfiles,
} from './commander_override.js';

// Re-export constants that were previously exported from this file
export { GARRISON_BUDGET_EDGES_PER_BRIGADE } from './corps_front_sectors_constants.js';

// subsegment_assignment.ts
export {
    assignBrigadesToSubSegments,
    mergeGapSubSegments,
    findSubSegmentForOsid,
} from './subsegment_assignment.js';

/** @internal Exported for targeted testing only. */
export { rescueUnassignedLoanedElitesInTerritory };
export { mergeLateSiblingFrontFragments };
/** @internal Exported for targeted testing only. */
export { collectUnresolvedSectorBrigades };

// Re-export constants from corps_front_sectors_constants.ts
export { MIN_SECTOR_EDGES } from './corps_front_sectors_constants.js';
export { MAX_SECTOR_EDGES } from './corps_front_sectors_constants.js';
export { MAX_SECTOR_BRIGADES } from './corps_front_sectors_constants.js';
export { MAX_RESERVES_PER_SECTOR } from './corps_front_sectors_constants.js';
