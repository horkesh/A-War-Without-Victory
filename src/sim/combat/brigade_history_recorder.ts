/**
 * Brigade history recorder.
 *
 * Records engagement outcomes into BrigadeHistory on FormationState.
 * Called from attack_resolution_osid.ts after each battle resolves.
 *
 * Updates both:
 * - FIFO-capped engagement log (200 entries)
 * - Running tallies (battles, victories, casualties, streaks, milestones)
 */

import type { FormationState, FactionId, GameState } from '../../state/game_state.js';
import {
    type BrigadeEngagement,
    type BrigadeHistory,
    type CombatOutcome,
    ATTACKER_WIN_OUTCOMES,
    ATTACKER_LOSS_OUTCOMES,
    MAX_HISTORY_ENTRIES,
    createEmptyBrigadeHistory,
} from '../../state/brigade_history.js';

/**
 * Ensure a formation has a brigade_history field. Initializes if absent.
 */
export function ensureBrigadeHistory(formation: FormationState): BrigadeHistory {
    if (!formation.brigade_history) {
        formation.brigade_history = createEmptyBrigadeHistory(formation.personnel ?? 1000);
    }
    return formation.brigade_history;
}

/**
 * Record a battle engagement for a single brigade.
 *
 * @param formation - The brigade's FormationState (mutated)
 * @param engagement - The engagement data to record
 * @param state - Optional GameState for elite loan episode tracking
 */
export function recordBrigadeEngagement(
    formation: FormationState,
    engagement: BrigadeEngagement,
    state?: GameState,
): void {
    const h = ensureBrigadeHistory(formation);

    // --- Append to FIFO log ---
    h.engagements.push(engagement);
    if (h.engagements.length > MAX_HISTORY_ENTRIES) {
        h.engagements.splice(0, h.engagements.length - MAX_HISTORY_ENTRIES);
    }

    // --- Update running tallies ---
    h.battles_fought++;
    if (engagement.role === 'attacker') h.battles_as_attacker++;
    else h.battles_as_defender++;

    h.total_casualties_taken += engagement.casualties_taken;
    h.total_casualties_inflicted += engagement.casualties_inflicted;

    // Equipment tracking
    if (engagement.equipment_destroyed) {
        h.total_equipment_destroyed.tanks += engagement.equipment_destroyed.tanks;
        h.total_equipment_destroyed.artillery += engagement.equipment_destroyed.artillery;
    }
    if (engagement.equipment_captured) {
        h.total_equipment_captured.tanks += engagement.equipment_captured.tanks;
        h.total_equipment_captured.artillery += engagement.equipment_captured.artillery;
    }

    // ── Sync elite loan episode if brigade is on loan ──
    const eliteLoanState = formation.elite_loan_state;
    if (state && eliteLoanState?.on_loan && eliteLoanState.current_episode_id != null) {
        const tracker = state.military.elite_brigade_tracker?.[formation.id ?? ''];
        if (tracker) {
            const episode = tracker.episodes[eliteLoanState.current_episode_id];
            if (episode && episode.loan_end_turn == null) {
                episode.battles_fought++;
                episode.casualties_taken += engagement.casualties_taken;
                if (engagement.territory_flipped) episode.osids_captured++;
                episode.kia_inflicted_est += engagement.casualties_inflicted;
            }
        }
    }

    const isWin = isAttackerWin(engagement);
    const isLoss = isAttackerLoss(engagement);

    if (engagement.role === 'attacker') {
        if (isWin) h.victories++;
        else if (isLoss) h.defeats++;
        else h.stalemates++;
    } else {
        // Defender: attacker loss = defender win, attacker win = defender loss
        if (isLoss) h.victories++;
        else if (isWin) h.defeats++;
        else h.stalemates++;
    }

    if (engagement.territory_flipped) {
        if (engagement.role === 'attacker' && isWin) {
            h.total_osids_captured++;
        } else if (engagement.role === 'defender' && isWin) {
            h.total_osids_lost++;
        }
    }

    // --- Update streaks ---
    const thisWin = (engagement.role === 'attacker' && isWin) ||
                    (engagement.role === 'defender' && isLoss);
    if (thisWin) {
        h.current_victory_streak++;
        if (h.current_victory_streak > h.longest_victory_streak) {
            h.longest_victory_streak = h.current_victory_streak;
        }
    } else {
        h.current_victory_streak = 0;
    }

    if (engagement.role === 'defender') {
        const defenderHeld = !isWin; // defender holds if attacker didn't win
        if (defenderHeld) {
            h.current_defense_streak++;
            if (h.current_defense_streak > h.longest_defense_streak) {
                h.longest_defense_streak = h.current_defense_streak;
            }
        } else {
            h.current_defense_streak = 0;
        }
    }

    // --- Update milestones ---
    if (h.first_battle_turn === null) {
        h.first_battle_turn = engagement.turn;
        h.first_battle_osid = engagement.osid;
    }
    if (engagement.casualties_taken > h.worst_single_battle_casualties) {
        h.worst_single_battle_casualties = engagement.casualties_taken;
        h.worst_single_battle_turn = engagement.turn;
    }

    // Update personnel peaks/nadirs
    const currentPersonnel = formation.personnel ?? 1000;
    if (currentPersonnel > h.peak_personnel) {
        h.peak_personnel = currentPersonnel;
    }
    if (currentPersonnel < h.nadir_personnel) {
        h.nadir_personnel = currentPersonnel;
    }
}

/**
 * Record engagement for all attackers in a concentrated assault.
 */
export function recordAttackerEngagements(
    attackerFormations: FormationState[],
    turn: number,
    targetOsid: string,
    outcome: CombatOutcome,
    defenderFaction: FactionId,
    territoryFlipped: boolean,
    totalAttackerCasualties: number,
    totalDefenderCasualties: number,
    isConcentrated: boolean,
    state?: GameState,
    equipmentData?: { destroyed: { tanks: number; artillery: number }; captured: { tanks: number; artillery: number } },
): void {
    const perAttackerCas = attackerFormations.length > 0
        ? Math.floor(totalAttackerCasualties / attackerFormations.length)
        : 0;

    for (const atk of attackerFormations) {
        recordBrigadeEngagement(atk, {
            turn,
            osid: targetOsid,
            role: 'attacker',
            outcome,
            casualties_taken: perAttackerCas,
            casualties_inflicted: Math.floor(totalDefenderCasualties / attackerFormations.length),
            enemy_faction: defenderFaction,
            territory_flipped: territoryFlipped,
            was_concentrated: isConcentrated,
            ...(equipmentData ? {
                equipment_destroyed: equipmentData.destroyed,
                equipment_captured: equipmentData.captured,
            } : {}),
        }, state);
    }
}

/**
 * Record engagement for a defending formation.
 */
export function recordDefenderEngagement(
    defenderFormation: FormationState,
    turn: number,
    osid: string,
    outcome: CombatOutcome,
    attackerFaction: FactionId,
    territoryFlipped: boolean,
    defenderCasualties: number,
    attackerCasualties: number,
    wasConcentrated: boolean,
    state?: GameState,
    equipmentData?: { destroyed: { tanks: number; artillery: number }; captured: { tanks: number; artillery: number } },
): void {
    recordBrigadeEngagement(defenderFormation, {
        turn,
        osid,
        role: 'defender',
        outcome,
        casualties_taken: defenderCasualties,
        casualties_inflicted: attackerCasualties,
        enemy_faction: attackerFaction,
        territory_flipped: territoryFlipped,
        was_concentrated: wasConcentrated,
        ...(equipmentData ? {
            equipment_destroyed: equipmentData.destroyed,
            equipment_captured: equipmentData.captured,
        } : {}),
    }, state);
}

function isAttackerWin(e: BrigadeEngagement): boolean {
    return ATTACKER_WIN_OUTCOMES.includes(e.outcome);
}

function isAttackerLoss(e: BrigadeEngagement): boolean {
    return ATTACKER_LOSS_OUTCOMES.includes(e.outcome);
}
