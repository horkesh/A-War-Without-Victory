/**
 * v0.8.2 Phase 3 — Compute combat-effective brigade count per faction.
 *
 * A brigade is combat-effective if:
 *   - status === 'active'
 *   - personnel >= 200
 *   - morale >= 40
 *   - kind === 'brigade' or kind is undefined
 *
 * Writes result to state.military.negotiation.capital[faction].combat_effective_brigades.
 * Called once per turn, immediately before evaluate-peace-plans.
 *
 * Deterministic: no Math.random(), no Date.now(), no sorted-iteration dependency.
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import { createEmptyCapital, createDefaultPatronRelationship } from '../../state/negotiation_types.js';

const CANONICAL_FACTIONS: FactionId[] = ['RBiH', 'RS', 'HRHB'];

const EFFECTIVE_PERSONNEL_MIN = 200;
const EFFECTIVE_MORALE_MIN = 40;

/** Ensure negotiation state exists. Mirrors the guard in peace_plans.ts. */
function ensureNegotiationCapital(state: GameState): void {
    if (!state.military.negotiation) {
        const capital: Record<string, ReturnType<typeof createEmptyCapital>> = {};
        const patron_relationships: Record<string, ReturnType<typeof createDefaultPatronRelationship>> = {};
        for (const faction of CANONICAL_FACTIONS) {
            capital[faction] = createEmptyCapital();
            patron_relationships[faction] = createDefaultPatronRelationship(faction);
        }
        state.military.negotiation = {
            capital,
            patron_relationships,
            peace_plan_history: [],
        };
    }
    for (const faction of CANONICAL_FACTIONS) {
        if (!state.military.negotiation.capital[faction]) {
            state.military.negotiation.capital[faction] = createEmptyCapital();
        }
    }
}

/**
 * Counts combat-effective brigades per faction and writes the result to
 * state.military.negotiation.capital[faction].combat_effective_brigades.
 *
 * Called once per turn by the war_phases pipeline, immediately before evaluate-peace-plans.
 */
export function computeCombatEffectiveBrigades(state: GameState): void {
    if (state.meta.phase !== 'war') return;

    ensureNegotiationCapital(state);

    const counts: Record<FactionId, number> = { RBiH: 0, RS: 0, HRHB: 0 };

    const formations = state.military?.formations ?? {};
    for (const formation of Object.values(formations)) {
        const faction = formation.faction;
        if (!faction || !(faction in counts)) continue;
        if (formation.status !== 'active') continue;
        if (formation.kind !== 'brigade' && formation.kind !== undefined) continue;
        const personnel = formation.personnel ?? 1000;
        const morale = formation.morale ?? 100;
        if (personnel < EFFECTIVE_PERSONNEL_MIN) continue;
        if (morale < EFFECTIVE_MORALE_MIN) continue;
        counts[faction]++;
    }

    const neg = state.military.negotiation!;
    for (const faction of CANONICAL_FACTIONS) {
        if (neg.capital[faction]) {
            neg.capital[faction].combat_effective_brigades = counts[faction];
        }
    }
}
