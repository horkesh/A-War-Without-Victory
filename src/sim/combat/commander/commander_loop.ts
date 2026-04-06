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
    SettlementId,
} from '../../../state/game_state.js';
import type { OperationalToCanonicalReverseMap } from '../../../data/operational_data.js';
import type { SupplyStateByOsidReport } from '../../../state/supply_state_derivation.js';
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
import { assembleBeliefState } from './belief.js';

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

        // 3.5 ASSEMBLE BELIEFS — perception layer
        const previousBeliefs = previousState?.belief_state ?? null;
        const beliefState = assembleBeliefState(
            briefing, allocation.zones, forces, previousBeliefs, briefing.turn,
        );

        // 4. DECIDE — reactive intel adjustments, now with beliefs
        const decisions = makeDecisions(
            briefing,
            allocation.zones,
            threats,
            allocation.surplus_pool,
            planDecision.plan,
            previousState,
            beliefState,
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
            beliefState,
        );
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// runCommanderForCorps — per-corps PERCEIVE→DECIDE→EXECUTE commander loop
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run the commander loop for a single corps.
 * Called once per corps (PERCEIVE→DECIDE→EXECUTE) inside generateAllCorpsOrders.
 */
export function runCommanderForCorps(
    state: GameState,
    corpsId: FormationId,
    faction: FactionId,
    spatial: SpatialContext,
    edges: EdgeRecord[],
    reverseMap: OperationalToCanonicalReverseMap | null,
    graphAnalysis: FactionGraphAnalysis | null,
    supplyByOsid: SupplyStateByOsidReport | null,
    ethnicMap: OsidEthnicComposition | null,
): CommanderOutput {
    const briefing = buildBriefing(
        state, corpsId, faction, spatial, edges,
        reverseMap, graphAnalysis, supplyByOsid, ethnicMap,
    );
    const previousState: CommanderState | null =
        state.military.corps_command?.[corpsId]?.commander_state ?? null;
    const commander = new BotCorpsCommander();
    return commander.decide(briefing, previousState);
}

// ═══════════════════════════════════════════════════════════════════════════
// applyCommanderOutput — write output back to GameState
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Apply commander output to game state.
 * Writes CorpsDirective, operations, sector stances back to GameState.
 * Writes CorpsDirective, operations, and sector stances back to GameState.
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

    // 5. Persist commander state for next turn's continuity.
    //    v0.8.4 Phase D — Level 1 plan-launch guard:
    //    If autonomy_level === 1, block plan from advancing to 'executing' unless
    //    player_op_response exists and approved === true for this plan.
    //    If player rejected → abandon the plan (set to null in updated_state).
    //    If no response yet → hold the plan at 'ready' (do not emit the operation).
    //    Guard against headless/test states where meta may be absent.
    const autonomyLevel = state.meta?.autonomy_level ?? 0;
    if (autonomyLevel === 1) {
        const updatedPlan = output.updated_state.current_plan;
        const playerOpResp = corps.player_op_response;
        if (updatedPlan && updatedPlan.status === 'executing') {
            const planApproved =
                playerOpResp !== undefined &&
                playerOpResp.plan_id === updatedPlan.plan_id &&
                playerOpResp.approved === true;
            const planRejected =
                playerOpResp !== undefined &&
                playerOpResp.plan_id === updatedPlan.plan_id &&
                playerOpResp.approved === false;

            if (planRejected) {
                // Player rejected — abandon plan, emit no new operations from it this turn.
                corps.commander_state = { ...output.updated_state, current_plan: null };
                corps.status_reason = 'plan abandoned: player rejected op proposal at Level 1';
                return;
            } else if (!planApproved) {
                // No player response yet — hold plan at 'ready', emit no new operations.
                const heldPlan = { ...updatedPlan, status: 'ready' as const };
                corps.commander_state = { ...output.updated_state, current_plan: heldPlan };
                corps.status_reason = 'plan held at ready: awaiting player approval at Level 1';
                return;
            }
            // planApproved === true → fall through, apply output normally.
        }
    }
    corps.commander_state = output.updated_state;

    // 6. Persist commander reinforcement pressure so Army HQ can consume it next turn.
    corps.commander_reinforcement_requests = output.reinforcement_requests.map(request => ({
        zone_id: request.zone_id,
        brigades_needed: request.brigades_needed,
        priority: request.priority,
    }));

    // 7. Apply prepositioning orders — move unreachable main_effort toward front.
    if (output.prepositioning_orders.length > 0) {
        if (!state.military.brigade_movement_orders) {
            state.military.brigade_movement_orders = {};
        }
        for (const order of output.prepositioning_orders) {
            // Commander prepositioning overrides distribution orders for main_effort surplus.
            // Scope is already limited to unreachable main_effort by buildPrepositioningOrders.
            state.military.brigade_movement_orders[order.brigade_id] = {
                destination_sids: [order.destination_osid as SettlementId],
                stance: 'column',
            } as { destination_sids: SettlementId[] };
        }
    }
}
