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

/** Bonus for defending home municipality. */
const HOME_DEFENSE_BONUS = 0.20;

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

/** Get faction's home municipality from formation tags. */
function getFormationHomeMun(formation: FormationState): string | null {
    if (!formation.tags) return null;
    for (const tag of formation.tags) {
        if (tag.startsWith('mun:')) return tag.slice(4);
    }
    return null;
}

/** Check if a brigade's AoR includes settlements in its home municipality. */
function isInHomeMun(
    state: GameState,
    formation: FormationState,
    homeMun: string | null
): boolean {
    if (!homeMun || !state.brigade_aor) return false;
    // Check if the brigade's HQ settlement is in its AoR
    if (formation.hq_sid && state.brigade_aor[formation.hq_sid] === formation.id) {
        return true;
    }
    return false;
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
    const homeMun = getFormationHomeMun(brigade);
    const posture = brigade.posture ?? 'defend';
    const isDefending = posture === 'defend' || posture === 'elastic_defense';
    if (isDefending && isInHomeMun(state, brigade, homeMun)) {
        modifier += HOME_DEFENSE_BONUS;
    }

    // 3. Cohesion under pressure: high-cohesion brigades in desperate situations
    //    Models RBiH determination — applies to any faction but RBiH triggers more
    const cohesion = brigade.cohesion ?? 60;
    if (controlShare < PRESSURE_THRESHOLD && cohesion > MIN_COHESION_FOR_PRESSURE_BONUS) {
        modifier += COHESION_UNDER_PRESSURE_BONUS;
    }

    return modifier;
}
