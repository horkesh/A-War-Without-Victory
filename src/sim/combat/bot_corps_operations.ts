/**
 * Operation Creation / Activation Entry Points
 *
 * This file contains the ONLY permitted creation and activation entry points
 * that feed INTO the canonical operation lifecycle:
 *   - generateOGActivationOrders   — legacy flag-off compatibility producer only
 *
 * (generateEmergencyDefensiveOperations was retired 2026-11-15, RF-emergency-defense: its
 * operation had no axes, objectives or staging point, froze a threatened corps' four strongest
 * brigades for about seven turns, cost +15 exhaustion and a recovery defence penalty, and would
 * have targeted ALLIED ground. A real emergency defence is a post-1.0 design item.)
 *
 * These functions CREATE or ACTIVATE operations. They do NOT advance operation phases.
 * The canonical lifecycle (planning → execution → recovery → removal) for ALL op types
 * now lives in sector_offensive.ts:
 *   - advanceSectorOffensives()         handles sector_attack / probe / feint
 *   - evaluateOperationProgress()       handles general_offensive / strategic_defense
 *
 * Do NOT add new operation lifecycle logic here.
 */

/**
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: Transitional — legacy/compatibility operation creation
 * DOMAIN:    OG activation entry point only (emergency defense retired 2026-11-15)
 * ═══════════════════════════════════════════════════════════════
 *
 * DECIDES:   Whether an OG activation is warranted
 * WRITES:    og_orders (OG activation only — no operation types)
 * READS:     corps threat state, operation slot availability, sector assignments
 * MUST NOT:  create operations;
 *            advance operation lifecycle (owned by sector_offensive.ts)
 *
 * UPSTREAM:  war_phases.ts pipeline (inject-queued-operations step, before commander)
 * DOWNSTREAM: sector_offensive.ts (canonical lifecycle takes over after creation)
 *
 * TRUTH INVARIANTS:
 * - This file's creation paths will be folded into commander/emit.ts in a future version
 * - TWO OP SYSTEMS exist: legacy injectQueuedOperation (this file's consumer) runs BEFORE
 *   commander; commander tryCreateFromOpportunity runs AFTER for corps with no pre-planned ops
 * ═══════════════════════════════════════════════════════════════
 */

import type { EdgeRecord } from '../../map/settlements.js';
import type {
    FactionId,
    FormationState,
    GameState,
    OGActivationOrder,
} from '../../state/game_state.js';
import {
    OG_DEFAULT_DURATION,
    OG_MAX_CONTRIBUTION_PER_DONOR,
    OG_MIN_DONOR_RESIDUAL,
} from './bot_constants.js';
import {
    getFactionCorps,
    sortByPersonnelDesc,
} from './bot_corps_helpers.js';
import { hasActiveOperation } from './corps_operation_helpers.js';
import { ENABLE_TACTICAL_GROUPS } from './tactical_group_config.js';

/**
 * Legacy flag-off compatibility producer for OG activation orders.
 * TG-enabled campaigns preserve an empty serialized queue and enqueue nothing.
 */
export function generateOGActivationOrders(
    state: GameState,
    faction: FactionId,
    edges: EdgeRecord[]
): void {
    // Keep the serialized legacy queue shape stable while TGs own temporary force concentration.
    if (!state.military.og_orders) state.military.og_orders = [];
    if (ENABLE_TACTICAL_GROUPS) return;

    const corpsCommand = state.military.corps_command;
    if (!corpsCommand) return;

    const corpsList = getFactionCorps(state, faction);
    const formations = state.military.formations ?? {};

    for (const corps of corpsList) {
        const cmd = corpsCommand[corps.id];
        if (!hasActiveOperation(cmd)) continue;

        for (const op of cmd.active_operations) {
            // Only activate OGs during execution phase (all operation types except reorganization)
            if (op.phase !== 'execution') continue;

            // Check if OG slot is available
            if (cmd.active_ogs.length >= cmd.og_slots) continue;

            // Select donor brigades from operation participants
            const donors: OGActivationOrder['donors'] = [];
            const participantsSorted = sortByPersonnelDesc(
                op.participating_brigades
                    .map(bid => formations[bid])
                    .filter((b): b is FormationState => b != null && b.status === 'active')
            );

            // HRHB: lower threshold (2 donors). (The corridor-breach exception was removed with
            // that pass, RF-corridor-breach 2026-11-15: no operation of that name is created.)
            const minDonors = faction === 'HRHB' ? 2 : 3;
            const maxDonors = 4;

            for (const brigade of participantsSorted) {
                if (donors.length >= maxDonors) break;
                const personnel = brigade.personnel ?? 0;
                const residual = personnel - OG_MIN_DONOR_RESIDUAL;
                if (residual <= 0) continue;
                const contribution = Math.min(OG_MAX_CONTRIBUTION_PER_DONOR, residual);
                if (contribution < 100) continue;
                donors.push({
                    brigade_id: brigade.id,
                    personnel_contribution: contribution
                });
            }

            if (donors.length < minDonors) continue;

            const ogOrder: OGActivationOrder = {
                corps_id: corps.id,
                donors,
                focus_settlements: op.target_settlements ?? [],
                posture: op.type === 'strategic_defense' ? 'defend' : 'attack',
                max_duration: OG_DEFAULT_DURATION
            };

            state.military.og_orders.push(ogOrder);
        }
    }
}

