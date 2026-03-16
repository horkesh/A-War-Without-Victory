/**
 * Warlord Friction (v0.4.4 — Weight of Command)
 *
 * Low political reliability corps commanders may ignore army stance
 * or launch unauthorized operations. Models the ARBiH warlord problem
 * (Caco, Cerić, etc.) and VRS corps-level autonomy.
 *
 * Deterministic: uses deterministicRandom, no Math.random().
 */

import type { FactionId, GameState } from '../../state/game_state.js';
import { deterministicRandom } from '../../state/deterministic_random.js';
import { strictCompare } from '../../state/validateGameState.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type FrictionType = 'ignored_stance' | 'unauthorized_op' | 'refused_release';

export interface FrictionEvent {
    officer_id: string;
    turn: number;
    type: FrictionType;
    resolved: boolean;
}

export interface WarlordFrictionReport {
    events: FrictionEvent[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Base friction chance per point below reliability 3.
 * At reliability 1: (3-1) * 0.05 = 10% chance.
 * At reliability 2: (3-2) * 0.05 = 5% chance.
 */
const FRICTION_CHANCE_PER_POINT = 0.05;

/** Reliability threshold: officers at or above this never cause friction. */
const RELIABILITY_THRESHOLD = 3;

// ═══════════════════════════════════════════════════════════════════════════
// Core
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute friction probability for an officer based on political reliability.
 * Returns 0 for officers with reliability >= 3.
 */
export function getFrictionChance(politicalReliability: number): number {
    if (politicalReliability >= RELIABILITY_THRESHOLD) return 0;
    return (RELIABILITY_THRESHOLD - politicalReliability) * FRICTION_CHANCE_PER_POINT;
}

/**
 * Check all active corps commanders for warlord friction this turn.
 * Deterministic: uses officer ID + turn as RNG seed.
 *
 * Friction effects:
 * - 'ignored_stance': commander ignores army-level stance for this turn
 * - 'unauthorized_op': commander launches an unauthorized operation
 * - 'refused_release': commander refuses to release brigades to army reserve
 *
 * Only applies to factions that haven't passed their warlord_friction_end_week.
 */
export function checkWarlordFriction(state: GameState): WarlordFrictionReport {
    const report: WarlordFrictionReport = { events: [] };

    const officers = state.military.named_officers;
    const officerData = state.military.named_officer_data;
    if (!officers || !officerData) return report;

    const turn = state.meta?.turn ?? 0;

    // Ensure friction_events array exists
    if (!state.military.friction_events) {
        state.military.friction_events = [];
    }

    const officerIds = Object.keys(officers).sort(strictCompare);
    for (const id of officerIds) {
        const os = officers[id]!;
        if (os.status !== 'active' || !os.assigned_corps_id) continue;

        const data = officerData.find(o => o.id === id);
        if (!data) continue;

        // Check faction friction end week
        const factionConfig = state.military.war_timeline?.officer_config?.[data.faction as FactionId];
        if (factionConfig?.warlord_friction_end_week !== undefined
            && turn >= factionConfig.warlord_friction_end_week) {
            continue;
        }

        const chance = getFrictionChance(data.political_reliability);
        if (chance <= 0) continue;

        // Deterministic check
        const roll = deterministicRandom(id, `friction:${turn}`);
        if (roll >= chance) continue;

        // Determine friction type based on a second deterministic roll
        const typeRoll = deterministicRandom(id, `friction_type:${turn}`);
        let frictionType: FrictionType;
        if (typeRoll < 0.5) {
            frictionType = 'ignored_stance';
        } else if (typeRoll < 0.85) {
            frictionType = 'unauthorized_op';
        } else {
            frictionType = 'refused_release';
        }

        const event: FrictionEvent = {
            officer_id: id,
            turn,
            type: frictionType,
            resolved: false,
        };

        state.military.friction_events.push(event);
        report.events.push(event);
    }

    return report;
}
