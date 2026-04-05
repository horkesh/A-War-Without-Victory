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
import type { SpatialContext } from '../spatial_context.js';
import { buildOsidAdjacency, type Osid } from './osid_adjacency.js';
import { analyzeFactionGraph, type FactionGraphAnalysis } from './osid_graph_analysis.js';

// ── Submodule imports for orchestrator ──────────────────────────────────
import { setArmyStandingOrder, coordinateMultiCorpsOffensive, generateCorpsStanceOrders } from './bot_corps_stance.js';
import { evaluateOperationProgress } from './sector_offensive.js';
import { generateOGActivationOrders, generateEmergencyDefensiveOperations } from './bot_corps_operations.js';
import { attemptCorridorBreach } from './bot_corps_corridor.js';
import { evaluateSectorStances } from './bot_corps_directives.js';
import { generateArmyHQOverrides } from './army_hq_overrides.js';
import { getFactionCorps, getCorpsSubordinates } from './bot_corps_helpers.js';
import { strictCompare } from '../../state/validateGameState.js';

// ── v0.8 Commander Loop ────────────────────────────────────────────────
import { runCommanderForCorps, applyCommanderOutput } from './commander/commander_loop.js';

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

// From sector_offensive (canonical lifecycle owner)
export { evaluateOperationProgress } from './sector_offensive.js';

// From bot_corps_operations (creation/activation entry points only)
export {
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
    collectSectorFriendlyOsids,
    collectSectorEnemyOsids,
    areDirectiveSectorsAdjacent,
    findTargetOsidsFromMunicipalities,
    findFriendlyOsidsFromMunicipalities,
} from './bot_corps_directives.js';

// ═══════════════════════════════════════════════════════════════════════════
// Report types
// ═══════════════════════════════════════════════════════════════════════════

/** Per-corps AI report entry for observability. */
export interface CorpsAiReportEntry {
    corps_id: string;
    faction: string;
    stance: string;
    active_operations: string[];
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
    const corpsCommand = state.military.corps_command;
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

        const opNames = cmd.active_operations.map(op => `${op.type}:${op.phase}`);

        entries.push({
            corps_id: corps.id,
            faction,
            stance: cmd.stance ?? 'balanced',
            active_operations: opNames,
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
    ethnicMap?: OsidEthnicComposition | null,
    preComputedAdjacency?: ReadonlyMap<string, readonly string[]>,
    spatial?: SpatialContext | null,
): void {
    // 0. Generate army HQ overrides for this turn (merge with any existing from gathering)
    const armyOverrides = generateArmyHQOverrides(state, faction);
    const existingOverrides = state.military.army_hq_overrides ?? [];
    const merged = [...existingOverrides, ...armyOverrides];
    state.military.army_hq_overrides = merged.length > 0 ? merged : undefined;

    // 0a. Set army stance from standing orders
    setArmyStandingOrder(state, faction);

    // 0b. Multi-corps coordination: concentrate offensive force
    coordinateMultiCorpsOffensive(state, faction, edges);

    // 1. Evaluate existing operations
    evaluateOperationProgress(state, faction);

    // 2. Corps stance selection
    generateCorpsStanceOrders(state, faction, edges, sidToMun);

    // 3. Named operations now launch from sectors inside the commander loop (step 6).
    // The old catalog-based generateCorpsOperationOrders is disabled — it pulled brigades
    // from the entire corps pool without sector assignment, creating bloated non-sector ops.

    // 3b. Emergency defensive operations for high-threat defensive corps
    generateEmergencyDefensiveOperations(state, faction, edges, sidToMun, preComputedAdjacency);

    // 4. Attempt corridor breach
    attemptCorridorBreach(state, faction, edges, sidToMun);

    // 5. OG activation
    generateOGActivationOrders(state, faction, edges);

    // 6. Generate corps directives (new: HoI-style command hierarchy)
    // Use OSID edges for adjacency (not canonical SID edges)
    const effectiveOsidEdges = osidEdges ?? edges;
    const adjacency = (preComputedAdjacency as Map<Osid, Osid[]>) ?? buildOsidAdjacency(effectiveOsidEdges);
    let graphAnalysis: FactionGraphAnalysis | null = null;
    if (reverseMap) {
        graphAnalysis = analyzeFactionGraph(state, faction, adjacency, reverseMap);
    }
    // 6b. Evaluate sector stances (Layer B: independent sector stances)
    evaluateSectorStances(state, faction);

    if (spatial) {
        // v0.8 Commander Loop: per-corps PERCEIVE→DECIDE→EXECUTE pipeline
        const corpsList = getFactionCorps(state, faction);
        for (const corps of corpsList) {
            const output = runCommanderForCorps(
                state,
                corps.id,
                faction,
                spatial,
                effectiveOsidEdges,
                reverseMap ?? null,
                graphAnalysis,
                supplyByOsid ?? null,
                ethnicMap ?? null,
            );
            applyCommanderOutput(state, corps.id, output);
        }
    }

    // Final cleanup: prune any 0-edge ghost sectors (pocket containment artifacts)
    if (state.military.corps_front_sectors) {
        for (const [sid, sec] of Object.entries(state.military.corps_front_sectors)) {
            if (sec.length_edges === 0) delete state.military.corps_front_sectors[sid];
        }
    }

    // Clear consumed army HQ overrides — they are per-turn directives
    state.military.army_hq_overrides = undefined;
}
