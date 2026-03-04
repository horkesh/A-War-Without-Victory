/**
 * Local Truces — Vienna Declaration (RS-HRHB Non-Aggression).
 *
 * Historical context: In May 1992 (~week 4), Bosnian Serb and Bosnian Croat
 * leaders met in Vienna and declared their war over. A de facto non-aggression
 * pact held across most of Bosnia. Fighting continued only in the Posavina
 * corridor and around Jajce, where RS and HRHB forces were entangled with each
 * other indirectly via RBiH presence.
 *
 * Mechanic:
 * - At VIENNA_DECLARATION_TURN, fire a narrative event and set
 *   state.vienna_declaration_turn.
 * - After that turn, bot AI (RS and HRHB corps) removes the other faction's
 *   controlled OSIDs from offensive_targets, except municipalities in
 *   TRUCE_EXCEPTION_MUNICIPALITIES.
 * - Player CAN still attack across the truce; this is recorded in
 *   state.truce_broken_turn (per-faction) and yields a warning notification.
 * - When a faction breaks the truce, the opponent bot gets an aggression
 *   modifier spike for TRUCE_BREAK_SPIKE_TURNS turns.
 *
 * Deterministic: no randomness, no timestamps.
 */

import type { FactionId, GameState } from '../state/game_state.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Week at which the Vienna Declaration fires (May 1992 ≈ week 4 of the scenario). */
export const VIENNA_DECLARATION_TURN = 4;

/**
 * Municipalities where RS-HRHB fighting continued despite the declaration.
 * OSIDs in these municipalities are NOT covered by the truce.
 * Posavina corridor (historically contested RS/HRHB/RBiH zone) + Jajce.
 */
export const TRUCE_EXCEPTION_MUNICIPALITIES = new Set([
    // Posavina corridor
    'brod',
    'derventa',
    'odzak',
    'bosanski_samac',
    'orasje',
    // Jajce (RS-HRHB friction point through 1992)
    'jajce',
]);

/**
 * Number of turns an aggression spike lasts after the opponent breaks the truce.
 * Represents the reactive military mobilization after a truce violation.
 */
const TRUCE_BREAK_SPIKE_TURNS = 6;

/** Aggression modifier applied to the wronged faction after truce break. */
const TRUCE_BREAK_AGGRESSION_SPIKE = 0.25;

// ═══════════════════════════════════════════════════════════════════════════
// Core queries
// ═══════════════════════════════════════════════════════════════════════════

/** Return true if the Vienna Declaration is currently active (fired and not permanently broken). */
export function isViennaDeclarationActive(state: GameState): boolean {
    return state.vienna_declaration_turn != null
        && (state.meta?.turn ?? 0) >= state.vienna_declaration_turn;
}

/**
 * Return true if this OSID is in a municipality exempt from the truce.
 * OSIDs in Posavina corridor or Jajce can still be attacked across faction lines.
 */
export function isTruceException(osid: string): boolean {
    const mun = osid.split(':')[1];
    return mun != null && TRUCE_EXCEPTION_MUNICIPALITIES.has(mun);
}

/**
 * Return the truce partner for a given faction under the Vienna Declaration.
 * RS ↔ HRHB. RBiH has no truce partner.
 */
export function getTrucePartner(faction: FactionId): FactionId | null {
    if (faction === 'RS') return 'HRHB';
    if (faction === 'HRHB') return 'RS';
    return null;
}

/**
 * Return extra aggression modifier for `faction` because the opponent broke the truce.
 * Returns TRUCE_BREAK_AGGRESSION_SPIKE for TRUCE_BREAK_SPIKE_TURNS turns after the break.
 * Returns 0 otherwise.
 */
export function getTruceBreakAggressionBonus(faction: FactionId, state: GameState): number {
    if (!isViennaDeclarationActive(state)) return 0;
    const partner = getTrucePartner(faction);
    if (!partner) return 0;

    const brokenTurn = state.truce_broken_turn?.[partner];
    if (brokenTurn == null) return 0;

    const currentTurn = state.meta?.turn ?? 0;
    if (currentTurn < brokenTurn + TRUCE_BREAK_SPIKE_TURNS) {
        return TRUCE_BREAK_AGGRESSION_SPIKE;
    }
    return 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// State mutation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fire the Vienna Declaration event if it hasn't fired yet and the current
 * turn is >= VIENNA_DECLARATION_TURN.
 *
 * Sets state.vienna_declaration_turn and returns the narrative text if fired,
 * or null if already fired or not yet time.
 */
export function checkAndFireViennaDeclaration(state: GameState): string | null {
    if (state.vienna_declaration_turn != null) return null; // already fired
    if (state.meta?.phase !== 'war') return null;
    const turn = state.meta?.turn ?? 0;
    if (turn < VIENNA_DECLARATION_TURN) return null;

    state.vienna_declaration_turn = turn;
    return 'May 1992 — Serb and Croat leaders meet in Vienna and declare their war at an end. '
        + 'A de facto truce takes hold across most of Bosnia — '
        + 'though fighting continues in the Posavina corridor and around Jajce.';
}

/**
 * Record that `faction` broke the RS-HRHB truce by attacking the partner's territory.
 * Only records if truce is active and the OSID is not a truce exception.
 * Returns the warning text if newly recorded, or null if already broken or not applicable.
 */
export function recordTruceBroken(faction: FactionId, targetOsid: string, state: GameState): string | null {
    if (!isViennaDeclarationActive(state)) return null;
    const partner = getTrucePartner(faction);
    if (!partner) return null;
    if (isTruceException(targetOsid)) return null;

    // Only record the first break (don't reset the timer on repeated attacks)
    if (state.truce_broken_turn?.[faction] != null) return null;

    if (!state.truce_broken_turn) state.truce_broken_turn = {};
    state.truce_broken_turn[faction] = state.meta?.turn ?? 0;

    const factionName = faction === 'RS' ? 'Serb forces' : 'Croat forces';
    const partnerName = partner === 'HRHB' ? 'Croat' : 'Serb';
    return `Warning: ${factionName} are attacking ${partnerName}-held territory, `
        + `breaking the informal Vienna Declaration truce. `
        + `${partnerName} forces will respond aggressively.`;
}
