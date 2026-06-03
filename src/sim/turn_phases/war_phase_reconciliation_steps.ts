import { assertControlEventConsistency } from '../combat/assert_control_events.js';
import { assertFormationsInFriendlyTerritory } from '../combat/assert_formation_territory.js';
import { assertOperationLifecycle } from '../combat/assert_operation_lifecycle.js';
import { distributeBrigadesToFront } from '../combat/brigade_front_distribution.js';
import { reconcileFinalOperationTruth } from '../combat/final_operation_truth_reconciliation.js';
import { reconcileFinalSectorTruth } from '../combat/final_sector_truth_reconciliation.js';
import { computeCombatEffectiveBrigades } from '../negotiation/compute_combat_effective.js';
import { computeSpatialContext } from '../spatial_context.js';
import type { NamedPhase } from '../turn_pipeline_types.js';
import {
    getOperationalData,
    getPoliticalControlSnapshot,
    getSpatialContextCache,
    setSpatialContextCache,
    getAllianceAtTurnStart,
} from '../turn_pipeline_types.js';
import { CANONICAL_FACTIONS } from '../../state/game_state.js';
import { computeFrontEdgesOsid } from '../../map/front_edges.js';

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
            reconcileFinalSectorTruth(
                context.state,
                od.edges,
                od.opData?.operationalToCanonical ?? null,
                od.centroids,
                finalSpatial,
                context.report?.supply_resolution?.supply_state_by_osid ?? null,
            );
        }
    },
    {
        name: 'reconcile-final-operation-truth',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            reconcileFinalOperationTruth(context.state);
        }
    },
    {
        name: 'reconcile-final-sector-truth-after-ops',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const od = getOperationalData(context);
            if (!od?.edges?.length) return;
            const cachedSpatial = getSpatialContextCache(context)?.postCombat;
            reconcileFinalSectorTruth(
                context.state,
                od.edges,
                od.opData?.operationalToCanonical ?? null,
                od.centroids,
                cachedSpatial,
                context.report?.supply_resolution?.supply_state_by_osid ?? null,
                true,
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
        }
    },
    {
        name: 'assert-final-operation-lifecycle',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            assertOperationLifecycle(context.state);
        }
    },
    {
        name: 'assert-formations-in-friendly-territory',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            assertFormationsInFriendlyTerritory(context.state);
        }
    },
    {
        name: 'assert-control-event-consistency',
        run: (context) => {
            if (context.state.meta.phase !== 'war') return;
            const snapshot = getPoliticalControlSnapshot(context);
            if (snapshot) assertControlEventConsistency(context.state, snapshot);
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
