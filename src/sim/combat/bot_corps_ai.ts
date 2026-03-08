/**
 * Bot AI for corps-level decisions: stance selection, named operations,
 * operational group activation, and corridor breach detection.
 *
 * Sits above bot_brigade_ai_osid.ts in the decision hierarchy.
 * Corps stance flows down to modulate brigade posture decisions.
 *
 * This file is the slim orchestrator + backward-compatible re-export hub.
 * Implementation lives in:
 *   - bot_corps_helpers.ts    (shared utilities)
 *   - bot_corps_stance.ts     (stance selection, army standing orders)
 *   - bot_corps_operations.ts (named ops, OG activation, emergency defense)
 *   - bot_corps_corridor.ts   (corridor breach detection)
 *   - bot_corps_directives.ts (directive generation)
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random().
 */

import type { EdgeRecord } from '../../map/settlements.js';
import type { OsidEthnicComposition } from './ethnic_defense.js';
import type {
    FactionId,
    GameState,
    SettlementId
} from '../../state/game_state.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import type { SupplyStateByOsidReport } from '../../state/supply_state_derivation.js';
import { buildOsidAdjacency } from './osid_adjacency.js';
import { analyzeFactionGraph, type FactionGraphAnalysis } from './osid_graph_analysis.js';

// ── Submodule imports for orchestrator ──────────────────────────────────
import { setArmyStandingOrder, coordinateMultiCorpsOffensive, generateCorpsStanceOrders } from './bot_corps_stance.js';
import { evaluateOperationProgress, generateOGActivationOrders, generateEmergencyDefensiveOperations } from './bot_corps_operations.js';
import { attemptCorridorBreach } from './bot_corps_corridor.js';
import { generateCorpsDirectives } from './bot_corps_directives.js';
import { getFactionCorps, getCorpsSubordinates } from './bot_corps_helpers.js';
import { strictCompare } from '../../state/validateGameState.js';

// ═══════════════════════════════════════════════════════════════════════════
// Re-exports for backward compatibility
// All public symbols that were previously exported from this file.
// ═══════════════════════════════════════════════════════════════════════════

// From bot_corps_helpers
export {
    assessCorpsSupplyHealth,
    getFactionCorps,
    getCorpsSubordinates,
    averagePersonnelFraction,
    averageCohesion,
    countHealthyBrigades,
    sortByPersonnelDesc,
    getCorpsHomeMun,
    computeSectorThreat,
} from './bot_corps_helpers.js';

// From bot_corps_stance
export {
    generateCorpsStanceOrders,
    setArmyStandingOrder,
    coordinateMultiCorpsOffensive,
} from './bot_corps_stance.js';

// From bot_corps_operations
export {
    getOperationCatalog,
    generateCorpsOperationOrders,
    evaluateOperationProgress,
    generateOGActivationOrders,
    generateEmergencyDefensiveOperations,
} from './bot_corps_operations.js';

// From bot_corps_corridor
export {
    type CorridorTarget,
    detectCorridorBreachOpportunities,
    attemptCorridorBreach,
} from './bot_corps_corridor.js';

// From bot_corps_directives
export {
    AGGRESSION_FLOOR,
    deriveCorpsFrontMapping,
    collectSectorFriendlyOsids,
    collectSectorEnemyOsids,
    areDirectiveSectorsAdjacent,
    findTargetOsidsFromMunicipalities,
    findFriendlyOsidsFromMunicipalities,
    generateCorpsDirectives,
} from './bot_corps_directives.js';

// ═══════════════════════════════════════════════════════════════════════════
// Report types
// ═══════════════════════════════════════════════════════════════════════════

/** Per-corps AI report entry for observability. */
export interface CorpsAiReportEntry {
    corps_id: string;
    faction: string;
    stance: string;
    active_operation: string | null;
    offensive_target_count: number;
    offensive_target_municipalities: string[];
    hold_osid_count: number;
    aggression_modifier: number;
    subordinate_count: number;
}

/**
 * Extract a report from current corps_command state after generateAllCorpsOrders.
 * Deterministic: corps sorted by strictCompare.
 */
export function extractCorpsAiReport(state: GameState, faction: FactionId): CorpsAiReportEntry[] {
    const corpsCommand = state.corps_command;
    if (!corpsCommand) return [];

    const entries: CorpsAiReportEntry[] = [];
    const corpsList = getFactionCorps(state, faction);

    for (const corps of corpsList) {
        const cmd = corpsCommand[corps.id];
        if (!cmd) continue;

        const directive = cmd.directive;
        const offensiveTargets = directive?.offensive_targets ?? [];

        // Deduplicate municipality names from OSID targets (format: op:municipality:slug)
        const munSet = new Set<string>();
        for (const osid of offensiveTargets) {
            const match = osid.match(/^op:([^:]+):/);
            if (match) munSet.add(match[1]);
        }
        const municipalities = [...munSet].sort(strictCompare);

        const opName = cmd.active_operation
            ? `${cmd.active_operation.type}:${cmd.active_operation.phase}`
            : null;

        entries.push({
            corps_id: corps.id,
            faction,
            stance: cmd.stance ?? 'balanced',
            active_operation: opName,
            offensive_target_count: offensiveTargets.length,
            offensive_target_municipalities: municipalities,
            hold_osid_count: directive?.hold_osids?.length ?? 0,
            aggression_modifier: directive?.aggression_modifier ?? 0,
            subordinate_count: cmd.subordinate_count ?? 0,
        });
    }

    return entries;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main entry point
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run all corps-level AI decisions for a faction.
 * Call before generate-bot-brigade-orders in the pipeline.
 *
 * Order:
 * 0. Set army stance from historical standing orders
 * 0b. Multi-corps coordination (concentrate force for general_offensive)
 * 1. Evaluate progress of existing operations (advance/abort)
 * 2. Set corps stances
 * 3. Launch new named operations
 * 3b. Emergency defensive operations (high-threat corps without active ops)
 * 4. Attempt corridor breach if opportunity exists
 * 5. Generate OG activation orders
 * 6. Generate corps directives for brigade AI
 */
export function generateAllCorpsOrders(
    state: GameState,
    faction: FactionId,
    edges: EdgeRecord[],
    sidToMun: Map<SettlementId, string>,
    reverseMap?: OperationalToCanonicalReverseMap | null,
    osidEdges?: EdgeRecord[],
    supplyByOsid?: SupplyStateByOsidReport | null,
    ethnicMap?: OsidEthnicComposition | null
): void {
    // 0. Set army stance from standing orders
    setArmyStandingOrder(state, faction);

    // 0b. Multi-corps coordination: concentrate offensive force
    coordinateMultiCorpsOffensive(state, faction, edges);

    // 1. Evaluate existing operations
    evaluateOperationProgress(state, faction);

    // 2. Corps stance selection
    generateCorpsStanceOrders(state, faction, edges, sidToMun);

    // 3. Named operations now launch from sectors inside generateCorpsDirectives (step 6).
    // The old catalog-based generateCorpsOperationOrders is disabled — it pulled brigades
    // from the entire corps pool without sector assignment, creating bloated non-sector ops.

    // 3b. Emergency defensive operations for high-threat defensive corps
    generateEmergencyDefensiveOperations(state, faction, edges, sidToMun);

    // 4. Attempt corridor breach
    attemptCorridorBreach(state, faction, edges, sidToMun);

    // 5. OG activation
    generateOGActivationOrders(state, faction, edges);

    // 6. Generate corps directives (new: HoI-style command hierarchy)
    // Use OSID edges for adjacency (not canonical SID edges)
    const effectiveOsidEdges = osidEdges ?? edges;
    let graphAnalysis: FactionGraphAnalysis | null = null;
    if (reverseMap) {
        const adjacency = buildOsidAdjacency(effectiveOsidEdges);
        graphAnalysis = analyzeFactionGraph(state, faction, adjacency, reverseMap);
    }
    generateCorpsDirectives(state, faction, effectiveOsidEdges, reverseMap ?? null, graphAnalysis, supplyByOsid, ethnicMap);

    // Final cleanup: prune any 0-edge ghost sectors (pocket containment artifacts)
    if (state.corps_front_sectors) {
        for (const [sid, sec] of Object.entries(state.corps_front_sectors)) {
            if (sec.length_edges === 0) delete state.corps_front_sectors[sid];
        }
    }
}
