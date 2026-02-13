/**
 * Faction-specific bot strategy profiles for Phase II brigade AI.
 *
 * Defines per-faction behavioral parameters: corridor priorities, posture thresholds,
 * attack/defense balance, and strategic objectives for target scoring.
 *
 * Strategic objectives are grounded in historical patterns:
 *   RS: Posavina corridor, Drina valley consolidation, Sarajevo siege ring
 *   RBiH: Sarajevo defense, enclave survival, central Bosnia corridor
 *   HRHB: Herzegovina consolidation, Mostar control, central Bosnia Croat pockets
 *
 * Consumed by bot_brigade_ai.ts for strategic target selection.
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
  /** Strategic offensive target municipalities (scored higher for attack). */
  offensive_objectives: string[];
  /** Strategic defensive priority municipalities (brigades prefer defend posture). */
  defensive_priorities: string[];
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

/**
 * Drina valley municipalities — RS priority for territorial contiguity with Serbia.
 * Historical pattern: VRS Drina Corps drove to create continuous Serb-controlled
 * corridor along the Drina river from Bijeljina to Foca.
 */
const DRINA_VALLEY: string[] = [
  'zvornik',
  'bratunac',
  'srebrenica',
  'vlasenica',
  'sekovici',
  'han_pijesak',
  'rogatica',
  'visegrad',
  'foca',
  'cajnice',
  'gorazde',
  'rudo'
];

/**
 * Sarajevo siege ring — RS priority to maintain encirclement of Sarajevo.
 * VRS Sarajevo-Romanija Corps invested enormous resources holding this ring.
 */
const SARAJEVO_SIEGE_RING: string[] = [
  'pale',
  'sokolac',
  'han_pijesak',
  'ilidza',
  'hadzici',
  'vogosca',
  'ilijas',
  'trnovo',
  'rogatica'
];

/**
 * Sarajevo core municipalities — RBiH priority: survival of the capital.
 * ARBiH 1st Corps committed its best units to Sarajevo defense.
 */
const SARAJEVO_CORE: string[] = [
  'centar_sarajevo',
  'novi_grad_sarajevo',
  'novo_sarajevo',
  'stari_grad_sarajevo'
];

/**
 * RBiH enclave defense priorities — historically, ARBiH fought desperately to
 * maintain these eastern enclaves and the Bihac pocket.
 */
const RBIH_ENCLAVE_DEFENSE: string[] = [
  'gorazde',
  'srebrenica',
  'zepa',
  'bihac',
  'cazin',
  'velika_kladusa',
  'bosanska_krupa'
];

/**
 * RBiH central Bosnia corridor — the vital supply artery connecting Sarajevo
 * to Tuzla via Zenica-Travnik. ARBiH 3rd Corps' main operational area.
 */
const RBIH_CENTRAL_CORRIDOR: string[] = [
  'zenica',
  'travnik',
  'kakanj',
  'visoko',
  'fojnica',
  'bugojno',
  'gornji_vakuf'
];

/**
 * HRHB Herzegovina heartland — the core of Croat-controlled territory.
 * HVO prioritized consolidating this as a contiguous bloc.
 */
const HRHB_HERZEGOVINA: string[] = [
  'mostar',
  'siroki_brijeg',
  'citluk',
  'capljina',
  'stolac',
  'neum',
  'ljubuski',
  'grude',
  'posusje',
  'livno',
  'tomislavgrad'
];

/**
 * HRHB central Bosnia enclaves — Croat pockets in central Bosnia that HVO
 * fought to connect to Herzegovina. The Lasva Valley was the key battleground.
 */
const HRHB_CENTRAL_BOSNIA: string[] = [
  'vitez',
  'busovaca',
  'kiseljak',
  'novi_travnik',
  'zepce',
  'usora'
];

export const FACTION_STRATEGIES: Record<FactionId, FactionBotStrategy> = {
  RS: {
    corridor_municipalities: POSAVINA_CORRIDOR,
    max_attack_posture_share: 0.3,
    preferred_posture_when_overstaffed: 'probe',
    attack_coverage_threshold: 150,
    defend_critical_territory: true,
    // RS offensive goals: Drina consolidation + siege maintenance
    offensive_objectives: [...DRINA_VALLEY, ...SARAJEVO_SIEGE_RING],
    // RS defensive priorities: Posavina corridor + Banja Luka core
    defensive_priorities: [...POSAVINA_CORRIDOR, 'banja_luka', 'prijedor'],
  },
  RBiH: {
    corridor_municipalities: [...SARAJEVO_CORE, ...RBIH_ENCLAVE_DEFENSE],
    max_attack_posture_share: 0.2,
    preferred_posture_when_overstaffed: 'probe',
    attack_coverage_threshold: 200,
    defend_critical_territory: true,
    // RBiH offensive goals: break siege, relieve enclaves, secure central corridor
    offensive_objectives: ['ilidza', 'hadzici', 'vogosca', 'ilijas', ...RBIH_CENTRAL_CORRIDOR],
    // RBiH defensive priorities: Sarajevo + enclaves + Tuzla industrial base
    defensive_priorities: [...SARAJEVO_CORE, ...RBIH_ENCLAVE_DEFENSE, 'tuzla', 'zenica'],
  },
  HRHB: {
    corridor_municipalities: [...HRHB_HERZEGOVINA],
    max_attack_posture_share: 0.25,
    preferred_posture_when_overstaffed: 'probe',
    attack_coverage_threshold: 180,
    defend_critical_territory: true,
    // HRHB offensive goals: connect central Bosnia pockets to Herzegovina
    offensive_objectives: [...HRHB_CENTRAL_BOSNIA, 'gornji_vakuf', 'jablanica'],
    // HRHB defensive priorities: Herzegovina heartland + Mostar
    defensive_priorities: [...HRHB_HERZEGOVINA, ...HRHB_CENTRAL_BOSNIA],
  },
};

/**
 * Check if a municipality is in a faction's corridor/defensive priority zones.
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

/**
 * Check if a municipality is a strategic offensive objective for the faction.
 */
export function isOffensiveObjective(
  munId: string | undefined | null,
  faction: FactionId
): boolean {
  if (!munId) return false;
  const strategy = FACTION_STRATEGIES[faction];
  return strategy.offensive_objectives.includes(munId);
}

/**
 * Check if a municipality is a defensive priority for the faction.
 */
export function isDefensivePriority(
  munId: string | undefined | null,
  faction: FactionId
): boolean {
  if (!munId) return false;
  const strategy = FACTION_STRATEGIES[faction];
  return strategy.defensive_priorities.includes(munId);
}
