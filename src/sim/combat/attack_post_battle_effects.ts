/**
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: attack_post_battle_effects.ts
 * DOMAIN:    Post-battle effects — experience, officer loss, morale, disruption, snap events
 * ═══════════════════════════════════════════════════════════════
 *
 * Extracted from attack_resolution_osid.ts (tranche 4, 2026-04-13).
 * Pure helpers — no strategic decisions, no state ownership.
 *
 * UPSTREAM:  attack_resolution_osid.ts (sole caller)
 * ═══════════════════════════════════════════════════════════════
 */

import type {
    FormationId,
    FormationState,
} from '../../state/game_state.js';
import type { CombatOutcome } from './combat_math.js';
import { OFFICER_CASUALTY_MULT, OFFICER_QUALITY_FLOOR } from './officer_quality_update.js';
import type { AttackResolutionOsidSnapEvent } from './attack_resolution_types.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

// Part 7a: Experience gain from combat (Mobilization & Force Growth)
export const BASE_EXPERIENCE_GAIN = 0.03;
export const VICTORY_EXPERIENCE_BONUS = 0.02;
export const DEFEAT_EXPERIENCE_GAIN = 0.01;
export const FACTION_LEARNING_RATE: Record<string, number> = {
    RBiH: 1.5,
    RS: 0.7,
    HRHB: 1.0
};
export const DEFAULT_LEARNING_RATE = 1.0;
export const COMMANDER_EXP_LOSS = 0.15;

// ═══════════════════════════════════════════════════════════════════════════
// Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Apply experience gain to a formation after combat.
 * Faction learning rates differentiate how quickly formations improve.
 * Diminishing returns: experienced formations gain less.
 */
export function applyExperienceGain(f: FormationState, won: boolean): void {
    const rate = FACTION_LEARNING_RATE[f.faction] ?? DEFAULT_LEARNING_RATE;
    let gain = BASE_EXPERIENCE_GAIN * rate;
    if (won) gain += VICTORY_EXPERIENCE_BONUS * rate;
    else gain = Math.max(gain, DEFEAT_EXPERIENCE_GAIN * rate);
    const exp = Math.max(0, Math.min(1, f.experience ?? 0));
    const effectiveGain = gain * (1.0 - exp * 0.5);
    (f as { experience?: number }).experience = Math.min(1.0, exp + effectiveGain);
}

/**
 * Apply officer quality degradation from casualties.
 * Higher casualty ratio = greater officer loss, modulated by current quality.
 */
export function applyOfficerCasualtyLoss(f: FormationState, cas: number, totalPersonnel: number): void {
    if (f.officer_quality === undefined) return;
    if (totalPersonnel <= 0) return;
    const casualtyRatio = cas / totalPersonnel;
    const officerLoss = casualtyRatio * OFFICER_CASUALTY_MULT * (1.0 - f.officer_quality * 0.3);
    f.officer_quality = Math.max(OFFICER_QUALITY_FLOOR, f.officer_quality - officerLoss);
}

/**
 * Map attacker outcome to defender's perspective (inverted).
 */
export function getDefenderOutcomePerspective(outcome: CombatOutcome): string {
    switch (outcome) {
        case 'decisive_victory': return 'catastrophic';
        case 'victory': return 'repulsed';
        case 'costly_victory': return 'stalemate';
        case 'stalemate': return 'costly_victory';
        case 'repulsed': return 'victory';
        case 'catastrophic': return 'decisive_victory';
        default: return outcome;
    }
}

/**
 * Apply disruption effects to a formation based on combat outcome.
 * Costly victory, repulsed, and catastrophic all cause disruption.
 * Repulsed/catastrophic also record the OSID from which the formation was repulsed.
 */
export function applyDisruptionFromOutcome(
    formation: FormationState,
    outcome: CombatOutcome,
    targetOsid: string,
    turn: number,
): void {
    if (outcome === 'costly_victory') (formation as { disrupted_turns?: number }).disrupted_turns = 1;
    if (outcome === 'repulsed' || outcome === 'catastrophic') {
        (formation as { disrupted_turns?: number }).disrupted_turns = 1;
        (formation as { last_repulsed_from?: { osid: string; turn: number } }).last_repulsed_from = {
            osid: targetOsid, turn,
        };
    }
}

/**
 * Apply ammo crisis or pyrrhic victory effects.
 * Returns a snap event if conditions are met, null otherwise.
 * Mutates attacker formations: cohesion -10, posture forced to defend.
 */
export function applyAmmoCrisisPyrrhicEffects(params: {
    isAmmoCrisis: boolean;
    isPyrrhic: boolean;
    firstAttackerId: FormationId;
    targetOsid: string;
    attackerFormations: FormationState[];
}): AttackResolutionOsidSnapEvent | null {
    if (!params.isAmmoCrisis && !params.isPyrrhic) return null;
    const ev: AttackResolutionOsidSnapEvent = params.isAmmoCrisis
        ? {
            snap_type: 'ammo_crisis',
            trigger_phase: 'post_battle',
            attacker_brigade: params.firstAttackerId,
            target_osid: params.targetOsid,
            affected_formation: params.firstAttackerId,
            description: 'Attack force suffered ammunition/sustainment collapse after failed assault.',
            effects: { forced_posture: 'defend', attacker_cohesion_delta: -10 },
        }
        : {
            snap_type: 'pyrrhic_victory',
            trigger_phase: 'post_battle',
            attacker_brigade: params.firstAttackerId,
            target_osid: params.targetOsid,
            affected_formation: params.firstAttackerId,
            description: 'Assault succeeded but losses were severe enough to force a defensive reset.',
            effects: { forced_posture: 'defend', attacker_cohesion_delta: -10 },
        };
    for (const a of params.attackerFormations) {
        a.cohesion = Math.max(0, (a.cohesion ?? 60) - 10);
        a.posture = 'defend';
    }
    return ev;
}

/**
 * Apply post-battle morale effects to attacker and defender formations.
 * Attacker morale changes based on outcome; defender morale drops on flip,
 * gains if held and morale was not absorbed.
 */
export function applyPostBattleMorale(params: {
    attackerFormations: FormationState[];
    defenderFormation: FormationState | null;
    outcome: CombatOutcome;
    flip: boolean;
    moraleAbsorbed: boolean;
}): void {
    const { attackerFormations, defenderFormation, outcome, flip, moraleAbsorbed } = params;
    for (const a of attackerFormations) {
        if (a.morale === undefined) continue;
        switch (outcome) {
            case 'decisive_victory': a.morale = Math.min(100, a.morale + 3); break;
            case 'victory': a.morale = Math.min(100, a.morale + 1); break;
            case 'costly_victory': break;
            case 'stalemate': a.morale = Math.max(0, a.morale - 2); break;
            case 'repulsed': a.morale = Math.max(0, a.morale - 5); break;
            case 'catastrophic': a.morale = Math.max(0, a.morale - 10); break;
        }
    }
    if (defenderFormation?.morale !== undefined) {
        if (flip) {
            defenderFormation.morale = Math.max(0, defenderFormation.morale - 5);
        } else if (!moraleAbsorbed) {
            defenderFormation.morale = Math.min(100, defenderFormation.morale + 1);
        }
    }
}
