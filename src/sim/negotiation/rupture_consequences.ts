/**
 * Rupture consequence enforcement — Ring 2 of the sensitive-history boundary.
 *
 * Rupture events are locked consequences triggered by war-state conditions.
 * They are NOT player-issued commands and NOT optimization surfaces.
 * Once recorded, they are permanent and propagate condemnation flags to the verdict.
 *
 * Wording is restrained, specific, and historically grounded.
 *
 * Deterministic: no Math.random(), no timestamps, sorted iteration.
 */

import type { GameState } from '../../state/game_state.js';
import type { RuptureConsequence } from '../../state/negotiation_types.js';

/** Canonical Srebrenica OSID — the urban settlement within the municipality. */
const SREBRENICA_OSID = 'op:srebrenica:srebrenica_2';

/** Earliest turn for Srebrenica rupture: aligned to the event-owned fall receipt window. */
const SREBRENICA_MIN_TURN = 160;

/**
 * Check whether Srebrenica rupture conditions are met and record if so.
 *
 * Preconditions (Ring 1 — mechanical):
 * - Srebrenica enclave has formed (event_flags.srebrenica_enclave_formed)
 * - Enclave has fallen to RS control (political_controllers check)
 * - War has progressed to the event-owned fall receipt window (turn >= 160)
 *
 * Consequence (Ring 2 — locked):
 * - Record rupture with genocide_condemnation flag
 * - This flag propagates to FactionVerdict.condemnation_flags via scoring.ts
 *
 * The genocide aftermath is NOT a player action. It is a historically grounded
 * consequence of enclave collapse under specific conditions.
 */
export function evaluateRuptureConsequences(state: GameState): void {
    const negotiation = state.military?.negotiation;
    if (!negotiation) return;

    // Initialize rupture_consequences array if needed
    if (!negotiation.rupture_consequences) {
        negotiation.rupture_consequences = [];
    }

    // Check: already recorded Srebrenica rupture? (idempotent)
    const alreadyRecorded = negotiation.rupture_consequences.some(
        r => r.id === 'srebrenica_genocide_1995'
    );
    if (alreadyRecorded) return;

    // Check precondition: Srebrenica enclave must have formed
    const eventFlags = state.military.event_flags ?? {};
    if (eventFlags.srebrenica_enclave_formed !== true) return;

    // Check precondition: Srebrenica OSID must be RS-controlled (enclave has fallen)
    const controllers = state.political?.political_controllers ?? {};
    if (controllers[SREBRENICA_OSID] !== 'RS') return;

    // Check precondition: must be in the event-owned fall receipt window
    const turn = state.meta?.turn ?? 0;
    if (turn < SREBRENICA_MIN_TURN) return;

    // Record the rupture — locked, permanent, non-reversible
    negotiation.rupture_consequences.push({
        id: 'srebrenica_genocide_1995',
        recorded_turn: turn,
        perpetrator_faction: 'RS',
        description: 'Fall of the Srebrenica safe area and subsequent genocide of Bosniak men and boys',
        condemnation_flag: 'genocide_condemnation',
    });
}

/**
 * Collect condemnation flags from all recorded rupture consequences for a faction.
 * Used by scoring.ts to populate FactionVerdict.condemnation_flags.
 */
export function collectCondemnationFlags(state: GameState, faction: string): string[] {
    const ruptures = state.military?.negotiation?.rupture_consequences ?? [];
    const flags: string[] = [];
    for (const r of ruptures) {
        if (r.perpetrator_faction === faction) {
            flags.push(r.condemnation_flag);
        }
    }
    // Sort for determinism
    flags.sort();
    return flags;
}
