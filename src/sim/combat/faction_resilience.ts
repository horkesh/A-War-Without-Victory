/**
 * Stage 3B: Faction resilience / desperation modifier.
 *
 * Models why ARBiH held despite being outgunned:
 * - Existential threat: faction with low control share fights harder
 * - Home territory defense: brigades defending home municipality
 * - Cohesion under pressure: high-cohesion brigades in desperate situations
 * - Urban defense: settlements with high population get defensive bonus
 *
 * Faction-neutral: any faction under existential threat benefits,
 * but historically ARBiH triggers these conditions more often.
 *
 * Deterministic: no randomness.
 */

import type {
    FactionId,
    FormationState,
    GameState
} from '../../state/game_state.js';

// --- Constants ---

/** Control share below which existential threat modifier kicks in. */
const EXISTENTIAL_THREAT_THRESHOLD = 0.30;

/** Maximum bonus from existential threat. */
const EXISTENTIAL_THREAT_MAX_BONUS = 0.30;

/** Control share below which cohesion-under-pressure bonus activates. */
const PRESSURE_THRESHOLD = 0.40;

/** Bonus for high-cohesion brigades under pressure. */
const COHESION_UNDER_PRESSURE_BONUS = 0.15;

/** Minimum cohesion to qualify for cohesion-under-pressure bonus. */
const MIN_COHESION_FOR_PRESSURE_BONUS = 50;

// --- Helpers ---

/** Count settlements controlled by a faction. */
function countFactionSettlements(state: GameState, faction: FactionId): number {
    const pc = state.political_controllers;
    if (!pc) return 0;
    let count = 0;
    for (const sid of Object.keys(pc)) {
        if (pc[sid] === faction) count++;
    }
    return count;
}

// --- Main function ---

/**
 * Compute resilience modifier for a brigade based on faction strategic situation.
 *
 * Returns a multiplier >= 1.0 (bonus only, no penalty).
 */
export function computeResilienceModifier(
    state: GameState,
    faction: FactionId,
    brigade: FormationState
): number {
    let modifier = 1.0;

    const pc = state.political_controllers;
    if (!pc) return modifier;

    const totalSettlements = Object.keys(pc).length;
    if (totalSettlements === 0) return modifier;

    const factionSettlements = countFactionSettlements(state, faction);
    const controlShare = factionSettlements / totalSettlements;

    // 1. Existential threat: faction controls < 30% of settlements
    //    Linear ramp: 0% control → full bonus, 30% → 0 bonus
    if (controlShare < EXISTENTIAL_THREAT_THRESHOLD) {
        modifier += EXISTENTIAL_THREAT_MAX_BONUS *
            (1 - controlShare / EXISTENTIAL_THREAT_THRESHOLD);
    }

    // 2. Home territory defense: brigade defending its home municipality
    // (brigade_aor removed — HOME_DEFENSE_BONUS via AoR dead path removed)

    // 3. Cohesion under pressure: high-cohesion brigades in desperate situations
    //    Models RBiH determination — applies to any faction but RBiH triggers more
    const cohesion = brigade.cohesion ?? 60;
    if (controlShare < PRESSURE_THRESHOLD && cohesion > MIN_COHESION_FOR_PRESSURE_BONUS) {
        modifier += COHESION_UNDER_PRESSURE_BONUS;
    }

    return modifier;
}
