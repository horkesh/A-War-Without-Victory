/**
 * Default-off `corps_plan` receipts (AWWV_DEBUG_REASON_CODES=corps_plan), 2026-11-15.
 *
 * One stdout line per corps per bot pass, written after the commander loop, that says why the
 * corps did or did not make a plan: its stance and the formula layer that set it, its exhaustion,
 * the commander's plan action and reason, the force tiers the readiness layer reads, and the
 * healthy-brigade count by the fixed 3,000 cap and by each brigade's designed `max_personnel`.
 *
 * OBSERVATION ONLY. Every value is read from state the pass already wrote, or computed here from
 * it. Nothing is written to GameState or to any report, and no decision reads anything this file
 * computes. With the topic off, `emitCorpsPlanTrace` returns before reading anything.
 *
 * Deterministic: corps are visited in `getFactionCorps` order (sorted), brigades by sorted id.
 */

import type { FactionId, FormationState, GameState } from '../../state/game_state.js';
import { MAX_BRIGADE_PERSONNEL } from '../../state/formation_constants.js';
import type { CorpsStanceTrace } from './bot_corps_stance.js';
import { COHESION_HEALTHY_THRESHOLD, PERSONNEL_HEALTHY_THRESHOLD } from './bot_constants.js';
import { countHealthyBrigades, getCorpsSubordinates, getFactionCorps } from './bot_corps_helpers.js';
import { emitCorpsPlanRecord, isReasonCodeTopicEnabled } from './reason_code_debug.js';

/** Healthy by the fixed 3,000 cap (the pre-RF-STRENGTH yardstick), kept for comparison. */
function countHealthyByCap(brigades: readonly FormationState[]): number {
    let count = 0;
    for (const b of brigades) {
        if ((b.personnel ?? 0) / MAX_BRIGADE_PERSONNEL >= PERSONNEL_HEALTHY_THRESHOLD && (b.cohesion ?? 60) >= COHESION_HEALTHY_THRESHOLD) count++;
    }
    return count;
}

/** Healthy by designed strength: personnel at 70% of the brigade's own max_personnel, cohesion 50. */
function countHealthyByDesignedStrength(brigades: readonly FormationState[]): number {
    let count = 0;
    for (const b of brigades) {
        const designed = b.max_personnel && b.max_personnel > 0 ? b.max_personnel : MAX_BRIGADE_PERSONNEL;
        const frac = (b.personnel ?? 0) / designed;
        if (frac >= PERSONNEL_HEALTHY_THRESHOLD && (b.cohesion ?? 60) >= COHESION_HEALTHY_THRESHOLD) count++;
    }
    return count;
}

export function emitCorpsPlanTrace(
    state: GameState,
    faction: FactionId,
    stanceTrace: ReadonlyMap<string, CorpsStanceTrace> | undefined,
): void {
    if (!isReasonCodeTopicEnabled('corps_plan')) return;
    const corpsCommand = state.military.corps_command;
    if (!corpsCommand) return;
    const turn = state.meta?.turn ?? null;
    for (const corps of getFactionCorps(state, faction)) {
        const cmd = corpsCommand[corps.id];
        if (!cmd) continue;
        const subs = getCorpsSubordinates(state, corps.id);
        const cs = cmd.commander_state;
        const tiers = cs?.force_assessment?.tier_counts;
        const traced = stanceTrace?.get(corps.id);
        emitCorpsPlanRecord({
            turn,
            faction,
            corps_id: corps.id,
            stance: cmd.stance ?? null,
            stance_driver: traced?.driver ?? null,
            corps_exhaustion: cmd.corps_exhaustion ?? null,
            plan_action: cs?.last_plan_action ?? null,
            plan_reason: cs?.last_plan_reason ?? null,
            current_plan_status: cs?.current_plan?.status ?? null,
            active_operations: (cmd.active_operations ?? []).map(op => `${op.type}:${op.phase}`),
            tier_main_effort: tiers?.main_effort ?? null,
            tier_active_defense: tiers?.active_defense ?? null,
            tier_garrison: tiers?.garrison ?? null,
            brigades: subs.length,
            healthy_by_cap: countHealthyByCap(subs),
            healthy_by_designed: countHealthyByDesignedStrength(subs),
            healthy_corps_count: countHealthyBrigades(subs),
        });
    }
}
