/**
 * Command Strain — derived per-corps metric.
 *
 * Computes a command strain score for a given corps from existing data:
 *   - active operations with was_force_launched=true (+3 each)
 *   - unresolved warlord friction events for that corps's commander (+2 each)
 *   - turn-based decay (−1 per turn elapsed since the event, floor 0)
 *
 * This is a DERIVED value — NOT stored on GameState. Computed on-read.
 * Deterministic: all inputs are sorted, no Math.random(), no Date.now().
 *
 * See docs/20_engineering/PRESIDENTIAL_COMMAND_DOCTRINE.md §Level 3.
 */

import type { GameState } from '../../../state/game_state.js';
import type { FrictionEvent } from '../../../sim/combat/warlord_friction.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Strain added per force-launched active operation on this corps. */
const FORCE_LAUNCH_STRAIN = 3;

/** Strain added per unresolved warlord friction event for this corps's commander. */
const FRICTION_EVENT_STRAIN = 2;

/** Strain decay per turn (applied to turn-age of each contributing event). */
const DECAY_PER_TURN = 1;

/** Strain threshold for 'strained' label. */
const STRAINED_THRESHOLD = 1;

/** Strain threshold for 'compromised' label. */
const COMPROMISED_THRESHOLD = 6;

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type CommandStrainLabel = 'healthy' | 'strained' | 'compromised';

// ═══════════════════════════════════════════════════════════════════════════
// Core
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute the command strain score for a specific corps.
 *
 * Strain sources (each decayed by 1 per turn since they occurred):
 *  - Each force-launched active operation on this corps: +3
 *  - Each unresolved warlord friction event for this corps's active commander: +2
 *
 * Decay: each source contributes Math.max(0, rawStrain − turnAge).
 * Total is summed and floored at 0.
 *
 * @param corpsId - The corps formation ID to compute strain for.
 * @param state   - Raw GameState (not adapted). Read-only.
 * @returns integer strain score [0, ∞). 0 = healthy, 1–5 = strained, 6+ = compromised.
 */
export function computeCorpsCommandStrain(corpsId: string, state: GameState): number {
    const currentTurn = state.meta?.turn ?? 0;
    let totalStrain = 0;

    // ── Source 1: force-launched active operations on this corps ──────────
    const corps = state.military.corps_command?.[corpsId];
    if (corps) {
        // Sort by name for determinism
        const activeOps = [...(corps.active_operations ?? [])].sort((a, b) =>
            a.name.localeCompare(b.name)
        );
        for (const op of activeOps) {
            if (op.was_force_launched !== true) continue;
            const launchTurn = op.started_turn ?? currentTurn;
            const turnAge = Math.max(0, currentTurn - launchTurn);
            const rawStrain = FORCE_LAUNCH_STRAIN;
            totalStrain += Math.max(0, rawStrain - turnAge);
        }
    }

    // ── Source 2: unresolved friction events for this corps's commander ───
    const frictionEvents: FrictionEvent[] = state.military.friction_events ?? [];
    // Find which officer is the active commander of this corps
    const namedOfficers = state.military.named_officers;
    if (namedOfficers) {
        // Sorted officer IDs for determinism
        const officerIds = Object.keys(namedOfficers).sort();
        for (const officerId of officerIds) {
            const os = namedOfficers[officerId];
            if (!os || os.status !== 'active' || os.assigned_corps_id !== corpsId) continue;
            // This officer commands the corps — find their unresolved friction events
            // Sort events by turn for determinism
            const officerEvents = frictionEvents
                .filter((e: FrictionEvent) => e.officer_id === officerId && !e.resolved)
                .sort((a, b) => a.turn - b.turn);
            for (const event of officerEvents) {
                const turnAge = Math.max(0, currentTurn - event.turn);
                const rawStrain = FRICTION_EVENT_STRAIN;
                totalStrain += Math.max(0, rawStrain - turnAge);
            }
        }
    }

    return Math.max(0, Math.round(totalStrain));
}

/**
 * Convert a numeric strain score to a player-facing label.
 *
 * @param score - Result of computeCorpsCommandStrain.
 * @returns 'healthy' | 'strained' | 'compromised'
 */
export function getCommandStrainLabel(score: number): CommandStrainLabel {
    if (score >= COMPROMISED_THRESHOLD) return 'compromised';
    if (score >= STRAINED_THRESHOLD) return 'strained';
    return 'healthy';
}
