/**
 * Faction-specific bot strategy profiles for Phase II brigade AI.
 *
 * Defines per-faction behavioral parameters: corridor priorities, posture thresholds,
 * and attack/defense balance. Consumed by bot_brigade_ai.ts for strategic target selection.
 *
 * Deterministic: no randomness.
 */

import type { FactionId, BrigadePosture } from '../../state/game_state.js';

// --- Faction strategy profiles ---

export interface FactionBotStrategy {
  /** Hardcoded corridor municipality IDs (defensive priority). */
  corridor_municipalities: string[];
  /** Max fraction of brigades allowed in attack/probe posture simultaneously. */
  max_attack_posture_share: number;
  /** Posture to adopt when overstaffed and on front. */
  preferred_posture_when_overstaffed: BrigadePosture;
  /** Minimum density (personnel/settlement) before switching to attack/probe. */
  attack_coverage_threshold: number;
  /** Force defend posture on brigades in corridor municipalities. */
  defend_critical_territory: boolean;
}

/**
 * Posavina corridor municipalities — historically the critical RS supply link
 * between Banja Luka (1st Krajina Corps) and Bijeljina (East Bosnia Corps).
 * RS committed significant forces to securing this narrow corridor.
 */
const POSAVINA_CORRIDOR: string[] = [
  'brcko',
  'bijeljina',
  'bosanski_samac',
  'modrica',
  'derventa',
  'bosanska_gradiska',
  'doboj',
  'bosanski_brod',
  'odzak',
  'gradacac',
  'orasje'
];

export const FACTION_STRATEGIES: Record<FactionId, FactionBotStrategy> = {
  RS: {
    corridor_municipalities: POSAVINA_CORRIDOR,
    max_attack_posture_share: 0.3,
    preferred_posture_when_overstaffed: 'probe',
    attack_coverage_threshold: 150,
    defend_critical_territory: true,
  },
  RBiH: {
    corridor_municipalities: [],
    max_attack_posture_share: 0.2,
    preferred_posture_when_overstaffed: 'probe',
    attack_coverage_threshold: 200,
    defend_critical_territory: false,
  },
  HRHB: {
    corridor_municipalities: [],
    max_attack_posture_share: 0.25,
    preferred_posture_when_overstaffed: 'probe',
    attack_coverage_threshold: 180,
    defend_critical_territory: false,
  },
};

/**
 * Check if a settlement is in a faction's corridor priority municipalities.
 * Uses the settlement graph's mun_code / mun1990_id to determine municipality membership.
 */
export function isCorridorMunicipality(
  munId: string | undefined | null,
  faction: FactionId
): boolean {
  if (!munId) return false;
  const strategy = FACTION_STRATEGIES[faction];
  return strategy.corridor_municipalities.includes(munId);
}
