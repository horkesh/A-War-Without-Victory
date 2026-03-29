/**
 * commander_loop.ts — The main corps commander decision loop.
 *
 * Wires: briefing -> ASSESS -> ALLOCATE -> PLAN -> DECIDE -> EMIT
 * Implements ICorpsCommander for the bot AI.
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random(), no Date.now().
 */

import type { EdgeRecord } from '../../../map/settlements.js';
import type {
    FactionId,
    FormationId,
    GameState,
    SectorStance,
} from '../../../state/game_state.js';
import type { OperationalToCanonicalReverseMap } from '../../../data/operational_data.js';
import type { OsidEthnicComposition } from '../ethnic_defense.js';
import type { FactionGraphAnalysis } from '../osid_graph_analysis.js';
import type { SpatialContext } from '../../spatial_context.js';
import type {
    CommanderBriefing,
    CommanderOutput,
    CommanderState,
    ICorpsCommander,
} from './commander_state.js';

import { buildBriefing } from './briefing.js';
import { assessSituation } from './assess.js';
import { allocateBrigades } from './allocate.js';
import { managePlan } from './plan.js';
import { makeDecisions } from './decide.js';
import { emitCommanderOutput } from './emit.js';

// ═══════════════════════════════════════════════════════════════════════════
// BotCorpsCommander — deterministic bot implementation of ICorpsCommander
// ═══════════════════════════════════════════════════════════════════════════

/**
 * BotCorpsCommander — deterministic bot implementation of ICorpsCommander.
 * Each corps gets one instance per turn.
 */
export class BotCorpsCommander implements ICorpsCommander {
    decide(briefing: CommanderBriefing, previousState: CommanderState | null): CommanderOutput {
        // 1. ASSESS — zones, threats, force eval
        const { zones, forces, threats } = assessSituation(briefing);

        // 2. ALLOCATE — garrison first, surplus for ops
        const allocation = allocateBrigades(zones, forces, briefing.officer_personality);

        // 3. PLAN — multi-turn intentions
        const planDecision = managePlan(
            briefing,
            allocation.zones,
            forces,
            allocation.surplus_pool,
            previousState?.current_plan ?? null,
            briefing.turn,
        );

        // 4. DECIDE — reactive intel adjustments
        const decisions = makeDecisions(
            briefing,
            allocation.zones,
            threats,
            allocation.surplus_pool,
            planDecision.plan,
            previousState,
        );

        // 5. EMIT — produce CorpsDirective + operations
        return emitCommanderOutput(
            briefing,
            allocation.zones,
            forces,
            allocation,
            planDecision,
            decisions,
            threats,
        );
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// runCommanderForCorps — drop-in replacement for generateCorpsDirectives (per-corps)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run the commander loop for a single corps.
 * This is the drop-in replacement for generateCorpsDirectives,
 * called once per corps instead of once per faction.
 */
export function runCommanderForCorps(
    state: GameState,
    corpsId: FormationId,
    faction: FactionId,
    spatial: SpatialContext,
    edges: EdgeRecord[],
    reverseMap: OperationalToCanonicalReverseMap | null,
    graphAnalysis: FactionGraphAnalysis | null,
    supplyByOsid: unknown,
    ethnicMap: OsidEthnicComposition | null,
): CommanderOutput {
    const briefing = buildBriefing(
        state, corpsId, faction, spatial, edges,
        reverseMap, graphAnalysis, supplyByOsid, ethnicMap,
    );
    // Will read from state.military.corps_command[corpsId].commander_state once Step 9 lands
    const previousState: CommanderState | null = null;
    const commander = new BotCorpsCommander();
    return commander.decide(briefing, previousState);
}

// ═══════════════════════════════════════════════════════════════════════════
// applyCommanderOutput — write output back to GameState
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Apply commander output to game state.
 * Writes CorpsDirective, operations, sector stances back to GameState.
 * This replaces the mutation logic in generateCorpsDirectives.
 */
export function applyCommanderOutput(
    state: GameState,
    corpsId: FormationId,
    output: CommanderOutput,
): void {
    const corps = state.military.corps_command?.[corpsId];
    if (!corps) return;

    // 1. Set directive
    corps.directive = output.directive;

    // 2. Mark this corps as AI-decided (so old formula bot skips it)
    corps.ai_decided = true;

    // 3. Add new operations (don't replace existing active ones)
    for (const op of output.operations) {
        // Check if this operation already exists (by name)
        const existing = corps.active_operations.find(ao => ao.name === op.name);
        if (!existing) {
            corps.active_operations.push(op as typeof corps.active_operations[number]);
        }
    }

    // 4. Apply sector stances
    const sectorLookup = state.military.corps_front_sectors;
    if (sectorLookup) {
        for (const stanceUpdate of output.sector_stances) {
            const sector = sectorLookup[stanceUpdate.sector_id];
            if (sector) {
                sector.sector_stance = stanceUpdate.stance as SectorStance;
                sector.stance_source = 'bot';
            }
        }
    }
}
