import { assertControlEventConsistency } from '../combat/assert_control_events.js';
import { assertFormationsInFriendlyTerritory } from '../combat/assert_formation_territory.js';
import { assertOperationLifecycle } from '../combat/assert_operation_lifecycle.js';
import { distributeBrigadesToFront } from '../combat/brigade_front_distribution.js';
import { reconcileFinalOperationTruth } from '../combat/final_operation_truth_reconciliation.js';
import {
    createFinalSectorReconciliationSession,
    recordFinalSectorReconciliationMutation,
    reconcileFinalSectorTruth,
    sealFinalSectorTruthFromCurrentSectors,
} from '../combat/final_sector_truth_reconciliation.js';
import { computeCombatEffectiveBrigades } from '../negotiation/compute_combat_effective.js';
import { computeSpatialContext } from '../spatial_context.js';
import type { NamedPhase, TurnContext } from '../turn_pipeline_types.js';
import {
    getOperationalData,
    getPoliticalControlSnapshot,
    getSpatialContextCache,
    setSpatialContextCache,
    getAllianceAtTurnStart,
} from '../turn_pipeline_types.js';
import { CANONICAL_FACTIONS } from '../../state/game_state.js';
import { computeFrontEdgesOsid } from '../../map/front_edges.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { ValidationIssue } from '../../validate/validate.js';

function compareIssues(a: ValidationIssue, b: ValidationIssue): number {
    return strictCompare(a.path ?? '', b.path ?? '')
        || strictCompare(a.code, b.code)
        || strictCompare(a.message, b.message);
}

/** Engine Invariants section 1: the single final, deterministic post-turn barrier. */
export function runPostTurnInvariantBarrier(context: TurnContext): ValidationIssue[] {
    if (context.state.meta.phase !== 'war') return [];

    const issues = [
        ...assertOperationLifecycle(context.state),
        ...assertFormationsInFriendlyTerritory(context.state),
    ];
    const controlSnapshot = getPoliticalControlSnapshot(context);
    if (controlSnapshot) {
        issues.push(...assertControlEventConsistency(context.state, controlSnapshot));
    } else {
        issues.push({
            severity: 'error',
            code: 'control_event.snapshot_missing',
            message: 'Post-turn control-event validation requires the turn-start political control snapshot',
            path: 'political.political_controllers',
        });
    }
    return issues.sort(compareIssues);
}

export const warPhaseReconciliationSteps: NamedPhase[] = [
    {
        name: 'rederive-osid-front-segments',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const od = getOperationalData(context);
            if (!od?.opData?.operationalToCanonical || !od?.edges?.length) {
                context.state.military.war_front_edges_osid = undefined;
                return;
            }
            const osidFrontEdges = computeFrontEdgesOsid(context.state, od.edges, od.opData.operationalToCanonical);
            context.state.military.war_front_edges_osid = osidFrontEdges;
        }
    },
    {
        name: 'reconcile-final-sector-truth',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const od = getOperationalData(context);
            if (!od?.edges?.length) return;
            const spatial = getSpatialContextCache(context);
            // Issue #13: use turn-start alliance snapshot for posture inertia.
            // Snapshot-captured (even undefined) takes priority; fall back only if missing.
            const allianceSnap = getAllianceAtTurnStart(context);
            const allianceForZones = allianceSnap !== undefined
                ? allianceSnap.value
                : context.state.political.war_alliance_rbih_hrhb;
            const finalSpatial = computeSpatialContext(
                od.edges,
                context.state.political.political_controllers ?? {},
                CANONICAL_FACTIONS,
                context.state.meta.turn,
                'post-combat',
                context.state.military.war_front_edges_osid,
                spatial?.preCombat.adjacency,
                spatial?.preCombat.sharedBoundaryAdjacency,
                allianceForZones,
            );
            setSpatialContextCache(context, {
                preCombat: spatial?.preCombat ?? finalSpatial,
                postCombat: finalSpatial,
            });
            const reconciliationSession = context.finalSectorReconciliationSession ??=
                createFinalSectorReconciliationSession(context.state.meta.turn, 'postcombat-geometry');
            const report = reconcileFinalSectorTruth(
                context.state,
                od.edges,
                od.opData?.operationalToCanonical ?? null,
                od.centroids,
                finalSpatial,
                context.report?.supply_resolution?.supply_state_by_osid ?? null,
                false,
                { session: reconciliationSession },
            );
            if (report.geometry_input_mutations > 0) {
                recordFinalSectorReconciliationMutation(
                    reconciliationSession,
                    'geometry',
                    'postcombat-formation-location-writeback',
                );
            }
        }
    },
    {
        name: 'reconcile-final-operation-truth',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const report = reconcileFinalOperationTruth(context.state);
            const reconciliationSession = context.finalSectorReconciliationSession;
            if (reconciliationSession && report.sector_reconciliation_required) {
                recordFinalSectorReconciliationMutation(
                    reconciliationSession,
                    'operation-roster',
                    'reconcile-final-operation-truth',
                );
            }
        }
    },
    {
        name: 'reconcile-final-sector-truth-after-ops',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const od = getOperationalData(context);
            if (!od?.edges?.length) return;
            const cachedSpatial = getSpatialContextCache(context)?.postCombat;
            const reconciliationSession = context.finalSectorReconciliationSession ??=
                createFinalSectorReconciliationSession(context.state.meta.turn, 'postcombat-geometry');
            reconcileFinalSectorTruth(
                context.state,
                od.edges,
                od.opData?.operationalToCanonical ?? null,
                od.centroids,
                cachedSpatial,
                context.report?.supply_resolution?.supply_state_by_osid ?? null,
                false,
                { session: reconciliationSession },
            );
        }
    },
    {
        name: 'final-distribute-brigades-to-front',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const sectorMap = context.state.military.corps_front_sectors;
            if (!sectorMap) return;
            const spatial = getSpatialContextCache(context);
            const adjacency = spatial?.postCombat?.adjacency ?? spatial?.preCombat.adjacency;
            if (!adjacency) return;
            distributeBrigadesToFront(context.state, Object.values(sectorMap), adjacency as Map<string, string[]>, {
                population1991ByMun: context.input.municipalityPopulation1991,
            });
            const reconciliationSession = context.finalSectorReconciliationSession;
            if (reconciliationSession) {
                recordFinalSectorReconciliationMutation(
                    reconciliationSession,
                    'distribution-roster',
                    'final-distribute-brigades-to-front',
                );
            }
            const finalEdges = context.state.military.war_front_edges_osid ?? [];
            if (finalEdges.length === 0) return;
            sealFinalSectorTruthFromCurrentSectors(
                context.state,
                finalEdges,
                context.report?.supply_resolution?.supply_state_by_osid ?? null,
                spatial?.postCombat,
                reconciliationSession ? { session: reconciliationSession } : undefined,
            );
        }
    },
    {
        name: 'seal-final-sector-truth-after-distribution',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const finalEdges = context.state.military.war_front_edges_osid ?? [];
            if (finalEdges.length === 0) return;
            const spatial = getSpatialContextCache(context);
            const reconciliationSession = context.finalSectorReconciliationSession;
            sealFinalSectorTruthFromCurrentSectors(
                context.state,
                finalEdges,
                context.report?.supply_resolution?.supply_state_by_osid ?? null,
                spatial?.postCombat,
                reconciliationSession ? { session: reconciliationSession } : undefined,
            );
        }
    },
    {
        name: 'compute-combat-effective-brigades',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            computeCombatEffectiveBrigades(context.state);
        },
    },
];
