/**
 * Shared combat math: constants, types, and pure functions used by both
 * attack_resolution_osid.ts (resolver) and combat_predictor.ts (predictor).
 *
 * Authoritative source — both files import from here. No duplication.
 * Deterministic: no randomness, no timestamps.
 */

import type { FrontRegionsFile } from '../../map/front_regions.js';
import { getTerrainScalarsForSid, type TerrainScalarsData } from '../../map/terrain_scalars.js';
import { getDecorationAtkMult, getDecorationDefBonus } from './decoration_evaluator.js';
import { FATIGUE_MAX, getFormationTier } from '../../state/formation_constants.js';
import type {
    CorpsStance,
    FormationState,
    GameState,
    SectorStance,
} from '../../state/game_state.js';
import type { NamedOfficer, NamedOfficerState } from '../../state/officer_types.js';
import type { SupplyStateByOsidReport, SupplyStateLevel } from '../../state/supply_state_derivation.js';
import { getEffectiveSupplyState } from '../../state/supply_reserves.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import {
    RESERVE_ADEQUATE_THRESHOLD,
    RESERVE_STRAINED_THRESHOLD,
} from '../../state/supply_reserve_constants.js';
import { findBrigadeOperation } from './corps_operation_helpers.js';
import { getEnclaveDefenseBonus } from './enclave_resilience.js';
import {
    getLocalFrontDensityModifier,
    type LocalFrontDensityModifierLookup,
} from './local_front_defense.js';
import { ensureBrigadeComposition } from './equipment_effects.js';
import type { Osid } from './osid_adjacency.js';
import { getHomeDistanceMult } from './home_distance.js';
import { getActiveEquipmentQualityMultiplier } from '../events/active_modifiers.js';

type CombatMathProfileTimer = <T>(labelSuffix: string, fn: () => T) => T;

export interface DefenderPowerBreakdown {
    base: number;
    postureMult: number;
    entrenchmentMult: number;
    supplyMult: number;
    terrainMult: number;
    terrainClassMult: number;
    toTerrainMult: number;
    perBrigadeTerrainBonus: number;
    corpsDefMult: number;
    resilienceMult: number;
    frontDensityMult: number;
    ethnicMult: number;
    finalEnvMult: number;
    disruptionMult: number;
    officerMult: number;
    fatigueMult: number;
    homeMult: number;
    moraleMult: number;
    equipmentQualityMult: number;
    power: number;
}

export const LOGISTICS_PRIORITY_MIN = 0.5;
export const LOGISTICS_PRIORITY_MAX = 1.5;
export const INTEL_EXECUTION_ATTACK_POWER_MIN = 0.85;
export const INTEL_EXECUTION_OPSEC_DEFENDER_POWER_MULT = 1.08;
export const INTEL_EXECUTION_AMBUSH_CONFIDENCE_THRESHOLD = 1 / 3;
export const INTEL_EXECUTION_AMBUSH_ATTACKER_CASUALTY_MULT = 1.12;
export const INTEL_EXECUTION_AMBUSH_DEFENDER_CASUALTY_MULT = 0.94;

function combatMathProfileTime<T>(
    profileTime: CombatMathProfileTimer | undefined,
    labelSuffix: string,
    fn: () => T,
): T {
    return profileTime ? profileTime(labelSuffix, fn) : fn();
}

// ═══════════════════════════════════════════════════════════════════════════
// Outcome type
// ═══════════════════════════════════════════════════════════════════════════

export type CombatOutcome =
    | 'decisive_victory' | 'victory' | 'costly_victory'
    | 'stalemate' | 'repulsed' | 'catastrophic';

// ═══════════════════════════════════════════════════════════════════════════
// Constants (§10)
// ═══════════════════════════════════════════════════════════════════════════

export const VICTORY_THRESHOLD_DECISIVE = 2.0;
export const VICTORY_THRESHOLD_NORMAL = 1.5;
export const VICTORY_THRESHOLD_COSTLY = 1.0;
export const STALEMATE_FLOOR = 0.7;
export const REPULSED_FLOOR = 0.5;

export const MAX_ENTRENCHMENT = 6;
export const ENTRENCHMENT_PER_TURN = 0.035;

/**
 * Maximum edges one brigade can effectively cover in a sector.
 * Caps the edge denominator so thinly-held sectors don't collapse.
 * E.g., 6 brigades × 4 = 24 max edges. A sector with 30 edges uses min(30, 24) = 24.
 * This produces: 6 brigades averaging 840 each → totalPower 5040 / 24 × density.
 * Without cap: 5040 / 30 = 168 per edge (trivial). With cap: 5040 / 24 = 210 per edge.
 * Combined with density modifier (0.6× for thin sectors), this gives meaningful resistance.
 *
 * At 3: a single brigade sector with 15 edges → effective 3 → defense = totalPower/3
 * which means a single attacker at equal power gets ratio ~3.0 → decisive but costly.
 * At 4: more lenient, 6 brigades cover 24 edges before cap kicks in.
 */
export const MAX_EDGES_PER_BRIGADE = 2;

/**
 * Minimum sector defense floor as fraction of average brigade power.
 * Secondary floor: even if edge cap doesn't apply (few edges), defense
 * per edge is at least this fraction of one brigade's average power.
 */
export const MIN_DEFENSE_FLOOR_FRACTION = 0.75;

/**
 * Sector reserve response fraction.
 * When a sector is attacked, brigades not at the OSID can partially respond.
 * This fraction of the sector's remaining power (excluding physical defenders)
 * reinforces the point of contact. Represents reserve mobilization, lateral
 * movement, and fire support from adjacent positions.
 *
 * At 0.30: sector with 5 brigades (1 at OSID, 4 elsewhere) → physical defender
 * fights at full power, plus 30% of the other 4 brigades' power reinforces.
 * Total defense ≈ 1.0 + 0.30×4 = 2.2 brigade equivalents.
 */
export const SECTOR_RESERVE_RESPONSE_FRACTION = 0.45;

/**
 * Reactive defense ratio: brigade-equivalents the defender mobilizes per attacker brigade.
 * When 3 brigades attack a sector point, the defender mobilizes 3 × 1.0 = 3.0 brigade
 * equivalents of reserves to the point of contact (capped at available reserves).
 * This prevents concentration from being an automatic win — defenders react.
 *
 * At 0.8: 3 attackers (3000 power with conc) vs 2400 reactive defense → ratio 1.25 (costly_victory)
 * At 1.0: 3 attackers vs 3000 reactive defense → ratio 1.0 (stalemate)
 */
export const REACTIVE_DEFENSE_RATIO = 1.5;

// ── Distance-weighted reactive defense constants ────────────────────────────
// Per-brigade reserve contribution decays exponentially with BFS distance.
// Home-municipality brigades get a motivation bonus.

/** Base for exponential distance decay: contribution = base^hops. */
export const REACTIVE_DISTANCE_BASE = 0.60;

/** Max BFS hops for reactive defense contribution. Beyond this = 0. */
export const REACTIVE_DISTANCE_MAX_HOPS = 5;

/** Multiplier when defending brigade's home municipality matches attacked OSID. */
export const HOME_DEFENSE_REACTIVE_BONUS = 1.3;

// ── Sector stance effect tables (Layer B) ────────────────────────────────────
// Each sector stance modifies reactive defense, entrenchment growth, and readiness.

/** Reactive defense multiplier per sector stance. Applied to reactive reserve response. */
export const SECTOR_STANCE_REACTIVE_BONUS: Record<SectorStance, number> = {
    fortify: 1.3,
    defend: 1.15,
    elastic: 1.0,
    active_defense: 0.85,
    screening: 0.5,
};

/** Entrenchment growth rate multiplier per sector stance. */
export const SECTOR_STANCE_ENTRENCHMENT_RATE: Record<SectorStance, number> = {
    fortify: 2.0,
    defend: 1.2,
    elastic: 0.8,
    active_defense: 0.6,
    screening: 0.0,
};

/** Which sector stances are allowed under each corps stance. */
export const CORPS_STANCE_ALLOWED_SECTOR_STANCES: Record<string, SectorStance[]> = {
    offensive: ['active_defense', 'elastic', 'defend'],
    balanced: ['fortify', 'defend', 'elastic', 'active_defense', 'screening'],
    defensive: ['fortify', 'defend', 'elastic'],
    reorganize: ['fortify', 'defend', 'screening'],
};

/**
 * Compute the reactive distance weight for a given number of BFS hops.
 * Returns 0 for unreachable or beyond max hops.
 */
export function getReactiveDistanceWeight(hops: number): number {
    if (!Number.isFinite(hops) || hops < 0 || hops > REACTIVE_DISTANCE_MAX_HOPS) return 0;
    return Math.pow(REACTIVE_DISTANCE_BASE, hops);
}

/**
 * BFS through friendly territory from `from` to `to`.
 * Returns hop count, or Infinity if unreachable within maxHops.
 * Only traverses OSIDs controlled by `factionId`.
 * Deterministic: BFS is deterministic with sorted adjacency lists.
 */
export function bfsDistanceFriendly(
    from: string,
    to: string,
    adjacency: Map<string, string[]>,
    politicalControllers: Record<string, string | null | undefined>,
    factionId: string,
    maxHops: number = REACTIVE_DISTANCE_MAX_HOPS
): number {
    if (from === to) return 0;
    const visited = new Set<string>([from]);
    let frontier = [from];
    let dist = 0;
    while (frontier.length > 0 && dist < maxHops) {
        dist++;
        const next: string[] = [];
        for (const osid of frontier) {
            for (const n of (adjacency.get(osid) ?? [])) {
                if (visited.has(n)) continue;
                visited.add(n);
                if (n === to) return dist;
                if (politicalControllers[n] === factionId) next.push(n);
            }
        }
        frontier = next;
    }
    return Infinity;
}

/**
 * Defender casualty engagement cap: maximum ratio of defender-to-attacker personnel
 * used as the casualty base. Prevents a small probe (500 men) against a large sector
 * (5,000 men) from inflicting 1,600+ defender casualties via the sector-wide
 * proportional distribution. The engaged defender force is capped at
 * personnelAttacker × this value.
 *
 * At 3.0: a 500-man attack engages at most 1,500 defender personnel for casualty purposes.
 * At 5.0: more permissive — 500-man attack engages up to 2,500.
 * The full sector still contributes to DEFENSE POWER (outcome determination),
 * but only the engaged fraction takes casualties.
 */
export const DEFENDER_CASUALTY_ENGAGEMENT_CAP = 1.5;
export const MAX_RESILIENCE_STREAK = 4;
export const RESILIENCE_PER_DEFENSE = 0.025;

/** Critical morale threshold: below this, combat effectiveness drops sharply. */
export const CRITICAL_MORALE_THRESHOLD = 15;
/** Minimum combat effectiveness at morale=0 (30% of normal). */
export const CRITICAL_MORALE_FLOOR = 0.3;

/** Minimum morale to resist retreat on costly_victory. */
const MORALE_RESIST_FLOOR = 70;

/** Per-faction retreat resistance floors.
 * When morale ≥ floor AND outcome is costly_victory, defender absorbs (holds ground,
 * both sides take extra casualties from MORALE_ABSORPTION_CAS_MULT).
 * Lower floor = more frequent absorption = stickier fronts + higher casualties.
 *
 * RBiH: defending homes, no retreat option → very low threshold (almost always holds).
 * RS: professional withdrawal discipline → moderate threshold.
 * HRHB: Croatian homeland defense → moderate-low threshold. */
const FACTION_MORALE_RESIST_FLOOR: Record<string, number> = {
    RBiH: 50,
    RS: 55,
    HRHB: 60,
};

export function getMoraleResistFloor(faction: string): number {
    return FACTION_MORALE_RESIST_FLOOR[faction] ?? MORALE_RESIST_FLOOR;
}

/** Increased 0.04→0.06 (n482)→0.08 (n536: 24k casualties vs 40-60k historical).
 * Historical: even VRS decisive victories cost blood. ARBiH stood and died,
 * inflicting attacker losses even when overrun. BB1 p.462: 1992 was deadliest year.
 *
 * Issue #30 (REAL_WAR_MASTER.md): Early-war VRS operations (w0-w12) show 3.8:1
 * (Operation Corridor) and 4.3:1 (Prsten) attacker:defender exchange — too costly
 * for operations the VRS won with massive artillery advantage. Likely this rate
 * amplifies late-operation stalled attacks that drag the per-operation average up.
 * Consider a faction×period attacker modifier: RS w0-12 could apply 0.75× to this
 * base rate to reflect JNA-inheritance firepower advantage in the blitz phase. */
export const BASE_ATTACKER_LOSS_RATE = 0.08;
/** Increased 0.028→0.042 (n482)→0.06 (n536: defender casualties also too low).
 * ARBiH fighters in homeland didn't retreat — they fought to the last, taking
 * heavier losses but also bleeding the attacker. Op Corridor: HVO 918 KIA defending. */
export const BASE_DEFENDER_LOSS_RATE = 0.06;
/** n536: raised 0.03→0.05 — even "undefended" Bosniak settlements had Patriotic
 * League, police, armed residents. 42% of early-war VRS attacks were against ghosts
 * at trivial 37.5 defense power. Historical: JNA/VRS had to fight for villages. */
export const MILITIA_DEFENSE_RATIO = 0.05;
export const COORDINATION_PENALTY_2 = 0.9;
export const COORDINATION_PENALTY_3PLUS = 0.8;
export const STACKING_DEFENDER_SUPPORT = 0.3;

/** Offensive concentration bonus — multi-brigade attacks coordinate for extra effectiveness. */
export const CONCENTRATION_BONUS_PER_BRIGADE = 0.10;
export const CONCENTRATION_BONUS_CAP = 0.30;

/** Entrenchment degradation per battle — sustained offensives erode defensive positions. */
export const ENTRENCHMENT_DEGRADATION_PER_BATTLE = 0.5;

/**
 * Hasty defense: formations that haven't been in position long enough get reduced
 * posture defense effectiveness. At entrenchment_turns=0, posture contributes nothing
 * beyond baseline (1.0×). Ramps to full over HASTY_DEFENSE_RAMP turns.
 * Models the historical reality that improvised positions (barricades, roadblocks)
 * are much weaker than prepared defensive works.
 * Organic: driven by per-formation entrenchment_turns, not game clock.
 */
export const HASTY_DEFENSE_RAMP = 5;

/**
 * Defense environmental soft cap: diminishing returns on the product of
 * terrain × entrenchment × corps × resilience × urban × density × enclave × etc.
 * Prevents 17 small multipliers from compounding to absurd levels (3-4×).
 * DEFENSE_ENV_CAP_THRESHOLD = bonus above 1.0 before compression starts.
 * DEFENSE_ENV_COMPRESSION = fraction of excess bonus retained above threshold.
 */
export const DEFENSE_ENV_CAP_THRESHOLD = 0.5;
export const DEFENSE_ENV_COMPRESSION = 0.35;  // Was 0.5 — tighter compression above threshold
/** Hard cap on total defensive environmental multiplier. Prevents impenetrable late-war walls. */
export const DEFENSE_ENV_HARD_CAP = 2.5;

/** Base experience multiplier — even green troops have some combat effectiveness. */
export const EXPERIENCE_BASE = 0.6;
export const EXPERIENCE_SCALE = 0.4;

/** Unit honor/decoration combat power multiplier. */
export const HONOR_MULT: Record<string, number> = { slavna: 1.10, viteska: 1.20 };

/** Honor-derived defense terrain bonus (used when no explicit defense_terrain_bonus in OOB). */
export const HONOR_DEFENSE_BONUS: Record<string, number> = { slavna: 0.10, viteska: 0.15 };

// Outcome casualty modifiers (§4.2)
// n536: decisive_victory raised 1.0→1.3 — even clean victories cost blood.
// VRS paid for every village in Bosnia, even when they won overwhelmingly.
// stalemate raised 1.0→1.2 — stalemated attacks still produce friction casualties.
export const OUTCOME_ATTACKER_MOD: Record<string, number> = {
    decisive_victory: 1.3, victory: 1.4, costly_victory: 1.8,
    stalemate: 1.2, repulsed: 2.0, catastrophic: 3.0
};
// catastrophic raised 0.3→0.7 — even a doomed assault inflicts casualties on the defender.
// At 0.3 combined with power-ratio floor 0.6, defenders took only 18% of base casualties,
// producing absurd 43-50:1 ratios. Real failed attacks still cost defenders meaningfully.
// H5 AUDIT NOTE: att:def 0.79:1 (defenders take 27% more) is historically correct for
// 1992 VRS blitz — Op Corridor 92 data VRS 413 KIA vs HVO 918 KIA = 0.45:1 att:def.
// H5 target range: 0.5:1 to 1:1 (defenders take equal to 2x more than attackers).
// Previous "fix" attempts (n26-n29) that raised attacker mod to 1.5-1.6 produced
// historically incorrect 1.17-1.31:1 ratios and -7pp DRINA regression.
export const OUTCOME_DEFENDER_MOD: Record<string, number> = {
    decisive_victory: 2.5, victory: 1.8, costly_victory: 1.2,
    stalemate: 1.0, repulsed: 0.7, catastrophic: 0.7
};

/**
 * Power-ratio casualty scaling — stronger forces inflict proportionally more casualties.
 * Returns [attackerMult, defenderMult].
 * - High powerRatio (attacker advantage): defender takes more, attacker takes less
 * - Low powerRatio (defender advantage): attacker takes more, defender takes less
 * Uses cube-root scaling (exponent 0.33) for moderate effect — outcome modifiers
 * already capture gross power differences, this adds continuous within-band scaling.
 */
export const POWER_RATIO_CASUALTY_EXPONENT = 0.33;
export const POWER_RATIO_CASUALTY_MAX = 2.0;
/** n536: raised 0.4→0.6 — attacker always takes ≥60% of base casualties even
 * at huge power advantage. VRS had 400 tanks + 800 artillery vs zero ARBiH
 * anti-armor, but still took meaningful losses from small arms, ambushes, IEDs,
 * and stubborn village-by-village resistance. No free wars. */
export const POWER_RATIO_CASUALTY_MIN = 0.6;

export function getPowerRatioCasualtyMult(powerRatio: number): [attackerMult: number, defenderMult: number] {
    const clamped = Math.max(0.1, Math.min(10, powerRatio));
    const base = Math.pow(clamped, POWER_RATIO_CASUALTY_EXPONENT);
    const clamp = (v: number) => Math.min(POWER_RATIO_CASUALTY_MAX, Math.max(POWER_RATIO_CASUALTY_MIN, v));
    return [clamp(1 / base), clamp(base)];
}

export function getIntelExecutionFrictionMultipliers(
    confidence: number | null | undefined,
    defenderOpsecActive: boolean,
): { attackerPowerMult: number; defenderPowerMult: number } {
    const clampedConfidence = Number.isFinite(confidence)
        ? Math.max(0, Math.min(1, confidence as number))
        : 0;
    return {
        attackerPowerMult: INTEL_EXECUTION_ATTACK_POWER_MIN
            + (1 - INTEL_EXECUTION_ATTACK_POWER_MIN) * clampedConfidence,
        defenderPowerMult: defenderOpsecActive ? INTEL_EXECUTION_OPSEC_DEFENDER_POWER_MULT : 1,
    };
}

export function getIntelAmbushAttackerCasualtyMult(
    confidence: number | null | undefined,
    defenderOpsecActive: boolean,
): number {
    const clampedConfidence = Number.isFinite(confidence)
        ? Math.max(0, Math.min(1, confidence as number))
        : 0;
    if (!defenderOpsecActive || clampedConfidence >= INTEL_EXECUTION_AMBUSH_CONFIDENCE_THRESHOLD) return 1;
    const confidenceGapRatio = (INTEL_EXECUTION_AMBUSH_CONFIDENCE_THRESHOLD - clampedConfidence)
        / INTEL_EXECUTION_AMBUSH_CONFIDENCE_THRESHOLD;
    return 1 + (INTEL_EXECUTION_AMBUSH_ATTACKER_CASUALTY_MULT - 1) * confidenceGapRatio;
}

export function getIntelAmbushDefenderCasualtyMult(
    confidence: number | null | undefined,
    defenderOpsecActive: boolean,
): number {
    const clampedConfidence = Number.isFinite(confidence)
        ? Math.max(0, Math.min(1, confidence as number))
        : 0;
    if (!defenderOpsecActive || clampedConfidence >= INTEL_EXECUTION_AMBUSH_CONFIDENCE_THRESHOLD) return 1;
    const confidenceGapRatio = (INTEL_EXECUTION_AMBUSH_CONFIDENCE_THRESHOLD - clampedConfidence)
        / INTEL_EXECUTION_AMBUSH_CONFIDENCE_THRESHOLD;
    return 1 - (1 - INTEL_EXECUTION_AMBUSH_DEFENDER_CASUALTY_MULT) * confidenceGapRatio;
}

// Cohesion deltas (§4.5)
export const COHESION_ATTACKER: Record<string, number> = {
    decisive_victory: 2, victory: 1, costly_victory: -5,
    stalemate: -3, repulsed: -8, catastrophic: -15
};
export const COHESION_DEFENDER: Record<string, number> = {
    decisive_victory: -15, victory: -8, costly_victory: -6,
    stalemate: -1, repulsed: 1, catastrophic: 3
};

// Posture multipliers (§2.4)
export const POSTURE_ATTACK: Record<string, number> = {
    hold: 0, defend: 0, defend_at_all_costs: 0, elastic_defense: 0,
    counterattack: 0.65, dig_in: 0, attack: 1.0, assault: 1.20
};
export const POSTURE_DEFENSE: Record<string, number> = {
    hold: 1.20, defend: 1.40, defend_at_all_costs: 1.60, elastic_defense: 1.10,
    counterattack: 1.15, dig_in: 1.35,  // base value; ramp applied in computeDefenderPower
    attack: 0.80, assault: 0.60
};

export const HOME_GROUND_DEFENSE_MULT = 1.25;
export const HOME_GROUND_COUNTERATTACK_MULT = 1.15;
export const HOME_GROUND_OQ_BONUS = 0.10;
export const HOME_GROUND_MORALE_FLOOR = 15;
export const HOME_GROUND_COHESION_BONUS = 0.5;
export const DIG_IN_BASE_DEF = 1.35;
export const DIG_IN_FULL_DEF = 1.60;
export const DIG_IN_FULL_EFFECT_THRESHOLD = 0.75;

/**
 * Computes the defense multiplier for dig_in posture based on construction progress.
 * Ramps from DIG_IN_BASE_DEF (1.35) at progress=0 to DIG_IN_FULL_DEF (1.60) at progress>=0.75.
 */
export function computeDigInDefMult(progress: number = 0): number {
    const ratio = Math.min(1, progress / DIG_IN_FULL_EFFECT_THRESHOLD);
    return DIG_IN_BASE_DEF + ratio * (DIG_IN_FULL_DEF - DIG_IN_BASE_DEF);
}

// Corps stance multipliers
export const CORPS_STANCE_ATTACK: Record<string, number> = {
    defensive: 0.5, balanced: 1.0, offensive: 1.15, reorganize: 0.5
};
export const CORPS_STANCE_DEFENSE: Record<string, number> = {
    defensive: 1.2, balanced: 1.0, offensive: 0.8, reorganize: 1.0
};

// ═══════════════════════════════════════════════════════════════════════════
// Officer quality — faction-level command effectiveness
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Officer quality multiplier based on faction and week of war.
 *
 * Models the documented command structure asymmetry:
 * - VRS: Inherited full JNA officer corps — professional, but irreplaceable.
 *   Peaks early, decays as officers are killed/captured with no pipeline.
 * - ARBiH: Nearly no trained officers at start (TDF cadres only).
 *   Steep learning curve from battlefield promotions and foreign-trained returnees.
 * - HVO: Croatian Army secondees provide stable but limited officer quality.
 *
 * Applied multiplicatively to both attack and defense power.
 */
export function getOfficerQualityMult(faction: string, turn: number): number {
    switch (faction) {
        case 'RS': {
            // VRS: JNA officers. Peak early, slow decay as irreplaceable officers lost.
            const peak = 1.10;
            const decayStart = 20;
            const decayRate = 0.002;
            const decay = Math.max(0, turn - decayStart) * decayRate;
            return Math.max(0.95, peak - decay);
        }
        case 'RBiH': {
            // ARBiH: Almost no officers at start. Rapid battlefield learning.
            const floor = 0.85;
            const growthRate = 0.003;
            const growth = turn * growthRate;
            return Math.min(1.05, floor + growth);
        }
        case 'HRHB': {
            // HVO: Croatian Army cadres, stable but limited.
            return 0.97;
        }
        default: return 1.0;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Brigade officer quality — per-brigade command effectiveness (Tier 2)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Faction default officer quality [0,1].
 * Calibration-safe: chosen so getBrigadeOfficerMod(default, t=0) ≈ getOfficerQualityMult(faction, t=0).
 *   RS:   0.55 → mod 1.10 (matches VRS peak 1.10)
 *   RBiH: 0.05 → mod 0.90 (matches ARBiH floor 0.85 at t=0 → actually 0.85, but we want smooth transition)
 *   HRHB: 0.225 → mod 0.97 (matches HVO constant 0.97)
 */
export function getFactionDefaultOfficerQuality(faction: string, turn: number): number {
    switch (faction) {
        case 'RS':
            // VRS: JNA inheritance. Starts high, decays as officers lost.
            return Math.max(0.45, 0.55 - turn * 0.002);
        case 'RBiH':
            // ARBiH: Almost no officers. Rapid battlefield learning.
            return Math.min(0.50, 0.05 + turn * 0.004);
        case 'HRHB':
            // HVO: Croatian Army cadres, stable.
            return 0.225;
        default:
            return 0.30;
    }
}

/**
 * Per-brigade officer modifier from officer_quality.
 * Maps quality [0,1] to combat multiplier centered around 1.0 at quality=0.30.
 *   quality 0.00 → 0.88
 *   quality 0.05 → 0.90
 *   quality 0.225 → 0.97
 *   quality 0.30 → 1.00
 *   quality 0.55 → 1.10
 *   quality 0.90 → 1.24
 */
export function getBrigadeOfficerMod(formation: FormationState, turn: number): number {
    const quality = formation.officer_quality ?? getFactionDefaultOfficerQuality(formation.faction, turn);
    return 1.0 + (quality - 0.30) * 0.4;
}

type OfficerCombatEntry = {
    officerId: string;
    state: NamedOfficerState;
    data: NamedOfficer;
};

export type OfficerCombatLookup = {
    stateById: ReadonlyMap<string, NamedOfficerState>;
    dataById: ReadonlyMap<string, NamedOfficer>;
    activeArmyCommanderByFaction: ReadonlyMap<string, OfficerCombatEntry>;
    activeCommanderByCorpsId: ReadonlyMap<string, OfficerCombatEntry>;
};

export function buildOfficerCombatLookup(state: GameState): OfficerCombatLookup | undefined {
    const officerStates = state.military.named_officers;
    const officerData = state.military.named_officer_data;
    if (!officerStates || !officerData) return undefined;

    const stateById = new Map<string, NamedOfficerState>();
    const dataById = new Map<string, NamedOfficer>();
    for (const data of officerData) {
        if (!dataById.has(data.id)) dataById.set(data.id, data);
    }

    const activeArmyCommanderByFaction = new Map<string, OfficerCombatEntry>();
    const activeCommanderByCorpsId = new Map<string, OfficerCombatEntry>();
    for (const id in officerStates) {
        const officerState = officerStates[id];
        if (!officerState) continue;
        stateById.set(id, officerState);

        const data = dataById.get(id);
        if (!data || officerState.status !== 'active') continue;
        const entry = { officerId: id, state: officerState, data };
        const activeArmyCommander = activeArmyCommanderByFaction.get(data.faction);
        if (
            data.rank === 'army_commander'
            && (!activeArmyCommander || strictCompare(id, activeArmyCommander.officerId) < 0)
        ) {
            activeArmyCommanderByFaction.set(data.faction, entry);
        }
        if (officerState.assigned_corps_id) {
            const activeCorpsCommander = activeCommanderByCorpsId.get(officerState.assigned_corps_id);
            if (!activeCorpsCommander || strictCompare(id, activeCorpsCommander.officerId) < 0) {
                activeCommanderByCorpsId.set(officerState.assigned_corps_id, entry);
            }
        }
    }

    return {
        stateById,
        dataById,
        activeArmyCommanderByFaction,
        activeCommanderByCorpsId,
    };
}

function getOfficerCombatEntryById(
    lookup: OfficerCombatLookup | undefined,
    officerId: string,
): OfficerCombatEntry | undefined {
    const officerState = lookup?.stateById.get(officerId);
    const data = lookup?.dataById.get(officerId);
    return officerState && data ? { officerId, state: officerState, data } : undefined;
}

/**
 * Three-tier officer combat modifier:
 *   1. named_officers present → corps commander × brigade mod
 *   2. officer_quality present → brigade mod only
 *   3. Neither → legacy getOfficerQualityMult
 *
 * Inlined here to avoid circular dependency with officer_system.ts.
 */
export function getThreeTierOfficerMod(
    formation: FormationState,
    state: GameState,
    role: 'attack' | 'defend',
    officerLookup?: OfficerCombatLookup,
): number {
    const turn = state.meta?.turn ?? 0;

    // Tier 1+2: named officers present
    if (state.military.named_officers && state.military.named_officer_data) {
        const brigMod = getBrigadeOfficerMod(formation, turn);
        const corpsId = formation.corps_id;
        if (!corpsId) return brigMod;

        // C.4: VRS pre-planned/general_offensive ops use army commander (Mladić) modifier
        if (formation.faction === 'RS' && role === 'attack') {
            const corpsCommand = state.military.corps_command?.[corpsId];
            const brigadeOp = corpsCommand ? findBrigadeOperation(corpsCommand, formation.id) : undefined;
            if (brigadeOp?.type === 'general_offensive' && brigadeOp.phase === 'execution') {
                const armyCommander = officerLookup?.activeArmyCommanderByFaction.get('RS');
                if (armyCommander) {
                    const penalty = armyCommander.state.penalty_turns_remaining > 0 ? armyCommander.state.effective_competence_penalty : 0;
                    const comp = Math.max(1, Math.min(5, armyCommander.data.competence - penalty));
                    const armyMod = 0.90 + comp * 0.03 + armyCommander.data.aggressiveness * 0.01;
                    return brigMod * armyMod;
                }
                if (!officerLookup) {
                    // Find army commander instead of corps commander
                    const officerIds = Object.keys(state.military.named_officers).sort(strictCompare);
                    for (const id of officerIds) {
                        const os = state.military.named_officers[id];
                        if (!os) continue;
                        if (os.status !== 'active') continue;
                        const data = state.military.named_officer_data.find(o => o.id === id);
                        if (!data || data.faction !== 'RS' || data.rank !== 'army_commander') continue;
                        const penalty = os.penalty_turns_remaining > 0 ? os.effective_competence_penalty : 0;
                        const comp = Math.max(1, Math.min(5, data.competence - penalty));
                        const armyMod = 0.90 + comp * 0.03 + data.aggressiveness * 0.01;
                        return brigMod * armyMod;
                    }
                }
            }
        }

        // Operation commander: brigades in named ops answer to ops commander
        const corpsCmd = state.military.corps_command?.[corpsId];
        const activeOp = corpsCmd ? findBrigadeOperation(corpsCmd, formation.id) : null;
        if (activeOp?.commander_officer_id && activeOp.phase === 'execution') {
            const opsEntry = officerLookup
                ? getOfficerCombatEntryById(officerLookup, activeOp.commander_officer_id)
                : undefined;
            const opsOs = opsEntry?.state ?? state.military.named_officers[activeOp.commander_officer_id];
            const opsData = opsEntry?.data ?? (opsOs ? state.military.named_officer_data.find(o => o.id === activeOp.commander_officer_id) : null);
            if (opsOs && opsData && opsOs.status === 'active') {
                const penalty = opsOs.penalty_turns_remaining > 0 ? opsOs.effective_competence_penalty : 0;
                const comp = Math.max(1, Math.min(5, opsData.competence - penalty));
                const opsMod = role === 'attack'
                    ? 0.90 + comp * 0.03 + opsData.aggressiveness * 0.01
                    : 0.90 + comp * 0.03 + opsData.defensive_skill * 0.01;
                return brigMod * opsMod;
            }
        }

        // Find corps commander
        const lookupCommander = officerLookup?.activeCommanderByCorpsId.get(corpsId);
        if (lookupCommander) {
            const penalty = lookupCommander.state.penalty_turns_remaining > 0 ? lookupCommander.state.effective_competence_penalty : 0;
            const comp = Math.max(1, Math.min(5, lookupCommander.data.competence - penalty));
            const corpsMod = lookupCommander.state.acting_commander
                ? 0.92
                : role === 'attack'
                    ? 0.90 + comp * 0.03 + lookupCommander.data.aggressiveness * 0.01
                    : 0.90 + comp * 0.03 + lookupCommander.data.defensive_skill * 0.01;
            return brigMod * corpsMod;
        }
        if (officerLookup) return brigMod; // No commander found for corps

        const officerIds = Object.keys(state.military.named_officers).sort(strictCompare);
        for (const id of officerIds) {
            const os = state.military.named_officers[id];
            if (!os) continue;
            if (os.status !== 'active' || os.assigned_corps_id !== corpsId) continue;
            const data = state.military.named_officer_data.find(o => o.id === id);
            if (!data) continue;

            // Compute effective competence with assignment penalty
            const penalty = os.penalty_turns_remaining > 0 ? os.effective_competence_penalty : 0;
            const comp = Math.max(1, Math.min(5, data.competence - penalty));

            let corpsMod: number;
            if (os.acting_commander) {
                corpsMod = 0.92;
            } else if (role === 'attack') {
                corpsMod = 0.90 + comp * 0.03 + data.aggressiveness * 0.01;
            } else {
                corpsMod = 0.90 + comp * 0.03 + data.defensive_skill * 0.01;
            }
            return brigMod * corpsMod;
        }
        return brigMod; // No commander found for corps
    }

    // Tier 2 only: brigade officer quality
    if (formation.officer_quality !== undefined) {
        return getBrigadeOfficerMod(formation, turn);
    }

    // Legacy fallback
    return getOfficerQualityMult(formation.faction, turn);
}

// ═══════════════════════════════════════════════════════════════════════════
// Pure functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Heavy munitions scale factor for bombardment and suppression.
 * Adequate (≥50) → 1.0, Strained (20–49) → 0.75, Critical (<20) → 0.5.
 * Returns 1.0 when supply_reserves_enabled is false.
 */
function getHeavyMunitionsMult(factionId: string, state: GameState): number {
    if (!state.meta?.supply_reserves_enabled || !state.military.heavy_munitions_reserve) return 1.0;
    const reserve = (state.military.heavy_munitions_reserve as Record<string, number>)[factionId] ?? 100;
    if (reserve >= RESERVE_ADEQUATE_THRESHOLD) return 1.0;
    if (reserve >= RESERVE_STRAINED_THRESHOLD) return 0.75;
    return 0.5;
}

/**
 * Artillery suppression of entrenchment.
 * Uses the best-equipped attacker's suppression (corps concentrate fire support).
 * Returns 0–0.7: fraction of entrenchment bonus that is suppressed.
 * Scaled by heavy munitions reserve when supply system is enabled.
 */
export function getArtillerySuppression(attackers: FormationState[], attackerFactionId: string, state: GameState): number {
    if (attackers.length === 0) return 0;
    // Best attacker provides full suppression; each additional attacker adds 30% of theirs.
    // Models corps-level fire coordination: multiple batteries can suppress entrenchment
    // more than one alone, but with diminishing returns from coordination overhead.
    const suppressions: number[] = [];
    for (const attacker of attackers) {
        const comp = attacker.composition ?? ensureBrigadeComposition(attacker);
        const artEff = comp.artillery * (comp.artillery_condition?.operational ?? 0.5);
        const tankEff = comp.tanks * (comp.tank_condition?.operational ?? 0.5);
        suppressions.push((artEff * 1.0 + tankEff * 0.5) / 100);
    }
    suppressions.sort((a, b) => b - a); // best first
    let totalSuppression = suppressions[0] ?? 0;
    for (let i = 1; i < suppressions.length; i++) {
        const suppression = suppressions[i];
        if (suppression !== undefined) totalSuppression += suppression * 0.3;
    }
    const munitionsMult = getHeavyMunitionsMult(attackerFactionId, state);
    return Math.min(0.7, totalSuppression) * munitionsMult;
}

/**
 * Bombardment casualty multiplier for defenders.
 * When attackers have significant heavy weapons (artillery + tanks), defenders
 * take additional casualties from shelling even when they hold ground.
 * Models VRS artillery bombardment causing ARBiH losses while ARBiH never yields.
 * Returns 1.0 (no bonus) to MAX_BOMBARDMENT_CAS_MULT based on attacker firepower.
 * Uses same firepower formula as getArtillerySuppression but different scaling.
 */
const MAX_BOMBARDMENT_CAS_MULT = 2.2;    // up to 120% extra defender casualties from bombardment
const BOMBARDMENT_DIVISOR = 60;           // firepower units needed for full effect

export function getBombardmentCasualtyMult(attackers: FormationState[], attackerFactionId: string, state: GameState): number {
    if (attackers.length === 0) return 1.0;
    let totalFirepower = 0;
    for (const attacker of attackers) {
        const comp = attacker.composition ?? ensureBrigadeComposition(attacker);
        const artEff = comp.artillery * (comp.artillery_condition?.operational ?? 0.5);
        const tankEff = comp.tanks * (comp.tank_condition?.operational ?? 0.5);
        totalFirepower += artEff + tankEff * 0.5;
    }
    const bombardmentFraction = Math.min(1.0, totalFirepower / BOMBARDMENT_DIVISOR);
    const munitionsMult = getHeavyMunitionsMult(attackerFactionId, state);
    return 1.0 + (MAX_BOMBARDMENT_CAS_MULT - 1.0) * bombardmentFraction * munitionsMult;
}

/**
 * Defensive fire multiplier for attacker casualties.
 * Defenders with artillery and tanks lay down return fire, forcing attackers to take cover,
 * slowing advances, and inflicting additional casualties.
 * Returns 1.0 (no bonus) to MAX_DEFENSIVE_FIRE_MULT based on defender heavy weapons.
 * Mirrors getBombardmentCasualtyMult but applied to attacker casualties.
 */
const MAX_DEFENSIVE_FIRE_MULT = 1.8;
const DEFENSIVE_FIRE_DIVISOR = 80;

export function getDefensiveFireMult(
    defenders: FormationState[],
    defenderFactionId: string,
    state: GameState
): number {
    if (defenders.length === 0) return 1.0;
    let totalFirepower = 0;
    for (const d of defenders) {
        const comp = d.composition;
        if (!comp) continue;
        const artEff = (comp.artillery ?? 0) * (comp.artillery_condition?.operational ?? 0.5);
        const tankEff = (comp.tanks ?? 0) * (comp.tank_condition?.operational ?? 0.5);
        totalFirepower += artEff * 1.0 + tankEff * 0.4;
    }
    const munitionsMult = getHeavyMunitionsMult(defenderFactionId, state);
    const fraction = Math.min(1.0, totalFirepower / DEFENSIVE_FIRE_DIVISOR);
    return 1.0 + (MAX_DEFENSIVE_FIRE_MULT - 1.0) * fraction * munitionsMult;
}

/**
 * Heavy weapons offensive firepower multiplier.
 * Cap 1.5 (2.5× max), divisor 200.
 *
 * Tanks are terrain-penalized: open ground (terrainMult≈1.0) → full effectiveness;
 * hills (≈1.4) → ~60%; mountains/rivers (≥1.7) → floored at 30%.
 * Artillery is terrain-independent (indirect fire works anywhere).
 *
 * Formula: tankTerrainFactor = max(0.3, 2.0 − terrainMult)
 *   terrainMult=1.0 → 1.00 (flat, full tank power)
 *   terrainMult=1.3 → 0.70 (rolling hills, moderate penalty)
 *   terrainMult=1.5 → 0.50 (steep hills / river crossing, heavy penalty)
 *   terrainMult=1.7 → 0.30 (mountains, minimum effectiveness)
 */
export function getHeavyWeaponsOffensiveMult(formation: FormationState, terrainMult = 1.0, targetOsid?: string): number {
    const comp = formation.composition ?? ensureBrigadeComposition(formation);
    const artEff = comp.artillery * (comp.artillery_condition?.operational ?? 0.5);
    const tankEff = comp.tanks * (comp.tank_condition?.operational ?? 0.5);
    // Urban terrain is at least as bad for tanks as mountains — treat as terrainMult≥1.7
    const effectiveTerrainMult = (targetOsid && isUrbanOsid(targetOsid))
        ? Math.max(terrainMult, URBAN_TANK_TERRAIN_FLOOR)
        : terrainMult;
    const tankTerrainFactor = Math.max(0.3, 2.0 - effectiveTerrainMult);
    const heavyFirepower = tankEff * tankTerrainFactor * 10 + artEff * 8;
    return 1.0 + Math.min(1.5, heavyFirepower / 200);
}

/**
 * Equipment effectiveness ratio (0.5–1.5).
 * Militia formations use tier-based overrides.
 */
export function getEquipmentRatio(formation: FormationState): number {
    if (formation.kind === 'militia') {
        const tier = getFormationTier(formation);
        if (tier === 'detachment') {
            if (formation.faction === 'RBiH') return 0.15;
            return 0.5;
        }
        if (formation.faction === 'RBiH') return 0.4;
        if (formation.faction === 'RS') return 0.7;
        return 0.6;
    }
    const comp = formation.composition ?? ensureBrigadeComposition(formation);
    const total = comp.infantry + comp.tanks + comp.artillery + comp.aa_systems;
    if (total <= 0) return 0.5;
    const infantryBase = 0.5;
    const heavyCount = comp.tanks + comp.artillery + comp.aa_systems;
    const heavyProportion = heavyCount / total;
    const tankOp = comp.tanks > 0 ? comp.tank_condition.operational : 0;
    const artOp = comp.artillery > 0 ? comp.artillery_condition.operational : 0;
    const heavyCondition = heavyCount > 0
        ? (comp.tanks * tankOp + comp.artillery * artOp) / Math.max(1, comp.tanks + comp.artillery)
        : 0;
    const heavyBonus = heavyProportion * heavyCondition;
    const decayMult = formation.equipment_decay ?? 1.0;
    return Math.min(1.5, (infantryBase + heavyBonus) * decayMult);
}

export function getHonorMult(formation: FormationState): number {
    // Decoration system supersedes legacy honor field
    return getDecorationAtkMult(formation);
}

export function basePower(formation: FormationState): number {
    const personnel = formation.personnel ?? 0;
    const eq = getEquipmentRatio(formation);
    const rawExp = Math.max(0, Math.min(1, formation.experience ?? 0));
    const expMult = EXPERIENCE_BASE + EXPERIENCE_SCALE * rawExp;
    const coh = Math.max(0, Math.min(100, formation.cohesion ?? 60)) / 100;
    const honorMult = getHonorMult(formation);
    return personnel * eq * expMult * coh * honorMult;
}

/**
 * Supply mult from OSID report when available; else last_supplied_turn fallback.
 * When supply_reserves_enabled, combines OSID reachability with faction reserve level
 * per SUPPLY_AMMO_SYSTEM_PLAN.md §3.4 interaction table.
 *
 * LANE-2026-05-02-IN-TRANSIT-COMBAT-POWER-CONTEXT: optional `contextLocationOverride`
 * shifts the supply-state-by-osid lookup (branch (a)) to the override OSID instead
 * of `formation.location_osid`. Used by `computeAttackerPower` when the caller
 * (`estimateForceRatio`) determines the brigade is committed-in-transit toward an
 * operation-relevant OSID — the brigade is en-route to the destination it has been
 * committed to, so context should be evaluated there rather than at the intermediate
 * march OSID. Branch (b) `last_supplied_turn` fallback is faction/turn-keyed and
 * unaffected by the override (semantically "when did this brigade last receive
 * supply" — destination-independent).
 */
export function getSupplyMult(
    formation: FormationState,
    state: GameState,
    mode: 'attack' | 'defend',
    supplyStateByOsid?: SupplyStateByOsidReport | null,
    contextLocationOverride?: string,
): number {
    // LANE-2026-05-02-IN-TRANSIT-COMBAT-POWER-CONTEXT: prefer override when caller supplies it.
    const locationOsid = contextLocationOverride
        ?? (formation as { location_osid?: string }).location_osid;
    const factionId = formation.faction as string;
    const applyPriority = (base: number): number => applyLogisticsPriorityClamp(base, state, formation);
    if (supplyStateByOsid?.factions && locationOsid) {
        const rawState = getSupplyStateForOsid(supplyStateByOsid, state.meta.turn, factionId, locationOsid);
        if (rawState) {
            let effectiveState: SupplyStateLevel = rawState;

            // Phase A: When reserves enabled, combine reachability with reserves
            if (state.meta.supply_reserves_enabled && state.military.general_supply_reserve) {
                const reserveLevel = (state.military.general_supply_reserve as Record<string, number>)[factionId] ?? 100;
                effectiveState = getEffectiveSupplyState(rawState, reserveLevel);
            }

            if (effectiveState === 'adequate') return applyPriority(1.0);
            if (effectiveState === 'strained') return applyPriority(0.75);
            return applyPriority(mode === 'attack' ? 0.45 : 0.5);
        }
    }
    const lastSupplied = formation.ops?.last_supplied_turn;
    if (lastSupplied != null && state.meta.turn - lastSupplied <= 2) return applyPriority(1.0);
    return applyPriority(mode === 'attack' ? 0.4 : 0.5);
}

function clampLogisticsPriority(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 1.0;
    return Math.max(LOGISTICS_PRIORITY_MIN, Math.min(LOGISTICS_PRIORITY_MAX, value));
}

export function lookupLogisticsPriority(
    state: GameState,
    formation: FormationState,
    frontRegions?: FrontRegionsFile,
): number {
    const assignment = formation?.assignment;
    if (!assignment || typeof assignment !== 'object') return 1.0;

    const factionId = formation?.faction;
    if (typeof factionId !== 'string') return 1.0;

    const logisticsPriority = state.military.logistics_priority?.[factionId];
    if (!logisticsPriority) return 1.0;

    if (assignment.kind === 'edge' && typeof assignment.edge_id === 'string') {
        return clampLogisticsPriority(logisticsPriority[assignment.edge_id]);
    }

    if (assignment.kind === 'region' && typeof assignment.region_id === 'string') {
        const region = frontRegions?.regions.find((r) => r.region_id === assignment.region_id);
        const priorities: number[] = [];
        if (region) {
            for (const edgeId of region.edge_ids) {
                priorities.push(
                    Object.prototype.hasOwnProperty.call(logisticsPriority, edgeId)
                        ? clampLogisticsPriority(logisticsPriority[edgeId])
                        : 1.0
                );
            }
        }
        if (Object.prototype.hasOwnProperty.call(logisticsPriority, assignment.region_id)) {
            priorities.push(clampLogisticsPriority(logisticsPriority[assignment.region_id]));
        }
        const firstPriority = priorities[0];
        if (firstPriority === undefined) return 1.0;
        return priorities.reduce((min, value) => Math.min(min, value), firstPriority);
    }

    return 1.0;
}

export function applyLogisticsPriorityClamp(
    base: number,
    state: GameState,
    formation: FormationState,
    frontRegions?: FrontRegionsFile,
): number {
    return base * lookupLogisticsPriority(state, formation, frontRegions);
}

interface SupplyStateLookupIndex {
    factionsRef: SupplyStateByOsidReport['factions'];
    stateTurn: number;
    turn: number;
    byFactionOsid: Map<string, Map<string, SupplyStateLevel>>;
}

const supplyStateLookupCache: WeakMap<SupplyStateByOsidReport, SupplyStateLookupIndex> = new WeakMap();

function buildSupplyStateLookupIndex(report: SupplyStateByOsidReport, stateTurn: number): SupplyStateLookupIndex {
    const byFactionOsid = new Map<string, Map<string, SupplyStateLevel>>();
    for (const factionEntry of report.factions ?? []) {
        if (byFactionOsid.has(factionEntry.faction_id)) continue;
        const byOsid = new Map<string, SupplyStateLevel>();
        for (const osidEntry of factionEntry.by_osid ?? []) {
            if (!byOsid.has(osidEntry.osid)) byOsid.set(osidEntry.osid, osidEntry.state);
        }
        byFactionOsid.set(factionEntry.faction_id, byOsid);
    }
    const index = {
        factionsRef: report.factions,
        stateTurn,
        turn: report.turn,
        byFactionOsid,
    };
    supplyStateLookupCache.set(report, index);
    return index;
}

function getSupplyStateLookupIndex(report: SupplyStateByOsidReport, stateTurn: number): SupplyStateLookupIndex {
    const cached = supplyStateLookupCache.get(report);
    if (cached && cached.factionsRef === report.factions && cached.turn === report.turn && cached.stateTurn === stateTurn) return cached;
    return buildSupplyStateLookupIndex(report, stateTurn);
}

function getSupplyStateForOsid(
    report: SupplyStateByOsidReport,
    stateTurn: number,
    factionId: string,
    osid: string,
): SupplyStateLevel | undefined {
    return getSupplyStateLookupIndex(report, stateTurn).byFactionOsid.get(factionId)?.get(osid);
}

export function getCorpsStance(state: GameState, formation: FormationState): CorpsStance | null {
    if (!formation.corps_id || !state.military.corps_command) return null;
    const corps = state.military.corps_command[formation.corps_id];
    return corps?.stance ?? null;
}

export function getOperationsMult(state: GameState, formation: FormationState): number {
    if (!formation.corps_id || !state.military.corps_command) return 1.0;
    const cmd = state.military.corps_command[formation.corps_id];
    if (!cmd) return 1.0;
    const op = findBrigadeOperation(cmd, formation.id);
    if (!op) return 1.0;
    if (op.phase === 'execution') return 1.3;
    if (op.phase === 'planning') return 1.0;
    if (op.phase === 'recovery') return 0.6;
    return 1.0;
}

export function getOgMult(formation: FormationState): number {
    return (formation.kind === 'og' || formation.kind === 'operational_group') ? 1.15 : 1.0;
}

export function getDisruptionMult(formation: FormationState, mode: 'attack' | 'defend'): number {
    const disrupted = (formation as { disrupted_turns?: number }).disrupted_turns ?? 0;
    const legacy = formation.disrupted === true;
    if (disrupted > 0 || legacy) return mode === 'attack' ? 0.5 : 0.6;
    return 1.0;
}

/**
 * Combat fatigue multiplier: exhausted units fight worse.
 * Linear degradation from 1.0 (fresh) to floor at max fatigue.
 * Attackers suffer more (0.6 floor) than defenders (0.75 floor) —
 * offensive operations require more coordination and energy.
 * Uses FATIGUE_MAX from formation_constants.ts (shared with attack_resolution, fatigue recovery).
 */
const FATIGUE_ATTACK_FLOOR = 0.6;
const FATIGUE_DEFEND_FLOOR = 0.75;

export function getFatigueMult(formation: FormationState, mode: 'attack' | 'defend'): number {
    const fatigue = formation.ops?.fatigue ?? 0;
    if (fatigue <= 0) return 1.0;
    const ratio = Math.min(1.0, fatigue / FATIGUE_MAX);
    const floor = mode === 'attack' ? FATIGUE_ATTACK_FLOOR : FATIGUE_DEFEND_FLOOR;
    return 1.0 - ratio * (1.0 - floor);
}

const MORALE_GRAD_BASE  = 1.0;
const MORALE_GRAD_SCALE = 0.15;

/**
 * Critical morale penalty / graduated morale effectiveness curve.
 *
 * Below CRITICAL_MORALE_THRESHOLD (15): effectiveness drops sharply —
 *   0.3× at morale=0, scaling linearly to 1.0× at morale=15.
 *   Models organic collapse: critically demoralized troops cannot fight effectively.
 *
 * At or above threshold: soft bonus proportional to morale —
 *   morale 100 = +15% (1.15×), morale 50 = +7.5% (1.075×), morale 15 = +0% (1.0×).
 *   Rewards high-morale formations without penalizing average ones.
 */
export function getCriticalMoralePenalty(formation: FormationState): number {
    const morale = formation.morale ?? 50;

    // Hard gate below critical floor — unchanged
    if (morale < CRITICAL_MORALE_THRESHOLD) {
        return Math.max(CRITICAL_MORALE_FLOOR, morale / CRITICAL_MORALE_THRESHOLD);
    }

    // Soft bonus above critical floor: morale 100 = +15%, morale 50 = +7.5%, morale 15 = +0%
    return MORALE_GRAD_BASE + MORALE_GRAD_SCALE * (morale / 100);
}

export function getConcentrationBonus(attackerCount: number): number {
    if (attackerCount <= 1) return 1.0;
    return 1.0 + Math.min(CONCENTRATION_BONUS_CAP, (attackerCount - 1) * CONCENTRATION_BONUS_PER_BRIGADE);
}

// ---------------------------------------------------------------------------
// Urban OSID set — loaded once from data/derived/operational/urban_osids.json.
// Generated by population+density threshold: pop >= 10,000 AND pop/area >= 500.
// Source of truth: census data, not hardcoded strings.
// ---------------------------------------------------------------------------
let _urbanOsidSet: Set<string> | null = null;

export function setUrbanOsidSet(set: Set<string>): void {
    _urbanOsidSet = set;
}

export function getUrbanOsidSet(): Set<string> {
    return _urbanOsidSet ?? new Set<string>();
}

/**
 * Urban defense multiplier: urban OSIDs get 2.0×.
 * Military doctrine: urban terrain requires 3:1 attacker advantage.
 * Buildings provide cover, channelize movement, enable ambush.
 * Source: population+density threshold (pop>=10k, density>=500/km²).
 */
export function getUrbanMult(targetOsid: Osid): number {
    return isUrbanOsid(targetOsid) ? 2.0 : 1.0;
}

// ---------------------------------------------------------------------------
// Forest OSID set — loaded once from data/derived/operational/forest_osids.json.
// Generated by elevation+slope proxy: elevation_mean_m >= 900 AND slope_index >= 0.50
// for >=50% of constituent SIDs. Covers Vlašić, Romanija, Igman, Bjelašnica,
// Treskavica, and other highland massifs. Defender only.
// ---------------------------------------------------------------------------
const FOREST_DEFENSE_MULT = 1.15;

let _forestOsidSet: Set<string> | null = null;

export function setForestOsidSet(set: Set<string>): void {
    _forestOsidSet = set;
}

export function getForestOsidSet(): Set<string> {
    return _forestOsidSet ?? new Set<string>();
}

/**
 * Forest defense multiplier: highland forest OSIDs get 1.15×.
 * Dense highland forest limits visibility, disrupts formation movement,
 * and advantages prepared defenders. Applies to defender only.
 */
export function getForestMult(targetOsid: string): number {
    if (!_forestOsidSet) return 1.0;
    return _forestOsidSet.has(targetOsid) ? FOREST_DEFENSE_MULT : 1.0;
}

/**
 * Check if an OSID is urban terrain (for heavy weapons penalty).
 * Tanks in cities are death traps — Grozny, Mogadishu, Sarajevo.
 * Confined streets, ambush from above, RPGs, no maneuver space.
 * Uses data-driven urban set; falls back to legacy Sarajevo string match if set not loaded.
 */
export function isUrbanOsid(osid: string): boolean {
    if (_urbanOsidSet) return _urbanOsidSet.has(osid);
    // Legacy fallback: only if urban_osids.json could not be loaded at all
    return osid.toLowerCase().includes('sarajevo');
}

/** Minimum effective terrain mult for tank penalty in urban areas.
 *  Tanks in urban terrain are at least as penalized as in mountains (terrainMult≥1.7). */
export const URBAN_TANK_TERRAIN_FLOOR = 1.7;

/**
 * Additional terrain defense multiplier for TO formations (tier !== 'brigade').
 */
export function getToTerrainDefenseMult(
    tier: 'detachment' | 'battalion' | 'brigade',
    targetOsid: string,
    terrainMultByOsid: Record<string, number>
): number {
    if (tier === 'brigade') return 1.0;

    const lower = targetOsid.toLowerCase();
    const isUrban = lower.includes('centar') || lower.includes('stari_grad') ||
        lower.includes('novo_sarajevo') || lower.includes('novi_grad') ||
        lower.includes('banja_luka') || lower.includes('tuzla') ||
        lower.includes('zenica') || lower.includes('bihac') ||
        lower.includes('mostar') || lower.includes('sarajevo') ||
        lower.includes('travnik') || lower.includes('prijedor');
    if (isUrban) return 2.5;

    const terrainMult = terrainMultByOsid[targetOsid] ?? 1.0;
    if (terrainMult >= 1.35) return 2.0;
    if (terrainMult >= 1.15) return 1.5;
    return 1.0;
}

/**
 * Look up the home distance multiplier for a formation from the per-turn cache.
 * Returns 1.0 if no cache or no entry (backwards compatible).
 */
function getHomeDistanceMultFromCache(state: GameState, formation: FormationState): number {
    if (formation.elite_loan_state?.on_loan) {
        // Loaned elites are intentionally unconstrained by home distance.
        return 1.0;
    }
    const cache = state.military.home_distance_cache;
    if (!cache) return 1.0;
    const hops = cache[formation.id];
    if (hops === undefined) return 1.0;
    const isElite = !!formation.elite_loan_state
        || formation.equipment_class === 'mechanized' || formation.equipment_class === 'motorized';
    return getHomeDistanceMult(hops, isElite);
}

export function classifyOutcome(powerRatio: number): CombatOutcome {
    if (powerRatio >= VICTORY_THRESHOLD_DECISIVE) return 'decisive_victory';
    if (powerRatio >= VICTORY_THRESHOLD_NORMAL) return 'victory';
    if (powerRatio >= VICTORY_THRESHOLD_COSTLY) return 'costly_victory';
    if (powerRatio >= STALEMATE_FLOOR) return 'stalemate';
    if (powerRatio >= REPULSED_FLOOR) return 'repulsed';
    return 'catastrophic';
}

/**
 * Compute attacker power for a single formation.
 * @param overridePosture — optional posture override (predictor uses this for 'attack'/'assault')
 * @param targetTerrainMult — defender terrain multiplier for the target OSID; gates tank effectiveness
 * @param contextLocationOverride — LANE-2026-05-02-IN-TRANSIT-COMBAT-POWER-CONTEXT.
 *   Optional OSID override that shifts location-dependent context lookups
 *   (currently `getSupplyMult` branch (a)) to evaluate against the override
 *   OSID instead of `formation.location_osid`. Used by `estimateForceRatio`
 *   when the brigade is committed-in-transit toward an operation-relevant OSID —
 *   the brigade is en-route to that destination, so its predicted attacker
 *   context is the destination it will arrive at, not the intermediate march
 *   OSID. Default-undefined preserves byte-stable behavior for resolver
 *   (`attack_resolution_osid.ts`), predictor (`combat_predictor.ts`), and
 *   sector-rating (`sector_combat_rating.ts`) callers — all of which evaluate
 *   formations against their CURRENT physical location and must remain so.
 *   Home-distance context is intentionally NOT overridden (cache is per-formation
 *   keyed and recomputing in this hot path is a layer violation; effect is
 *   marginal vs the supply-state binary cliff 1.0 → 0.45).
 */
export function computeAttackerPower(
    state: GameState,
    formation: FormationState,
    supplyStateByOsid?: SupplyStateByOsidReport | null,
    overridePosture?: string,
    targetTerrainMult = 1.0,
    targetOsid?: string,
    contextLocationOverride?: string,
): number {
    const base = basePower(formation);
    const posture = overridePosture ?? formation.posture ?? 'defend';
    const postureMult = POSTURE_ATTACK[posture] ?? 0;
    if (postureMult <= 0) return 0;
    // LANE-2026-05-02-IN-TRANSIT-COMBAT-POWER-CONTEXT: thread override into supply context.
    const supplyMult = getSupplyMult(formation, state, 'attack', supplyStateByOsid, contextLocationOverride);
    const corpsStance = getCorpsStance(state, formation);
    const corpsMult = corpsStance ? CORPS_STANCE_ATTACK[corpsStance] ?? 1 : 1;
    const opMult = getOperationsMult(state, formation);
    const ogMult = getOgMult(formation);
    const disruptionMult = getDisruptionMult(formation, 'attack');
    const heavyMult = getHeavyWeaponsOffensiveMult(formation, targetTerrainMult, targetOsid);
    const officerMult = getThreeTierOfficerMod(formation, state, 'attack');
    const fatigueMult = getFatigueMult(formation, 'attack');
    const homeMult = getHomeDistanceMultFromCache(state, formation);
    const moralePenalty = getCriticalMoralePenalty(formation);
    let power = base * postureMult * supplyMult * corpsMult * opMult * ogMult * disruptionMult * heavyMult * officerMult * fatigueMult * homeMult * moralePenalty;
    // LANE-NIGHTSHIFT-EQUIPMENT-QUALITY-MODIFIER-SUBSTRATE: faction-scoped power
    // multiplier from arms-flow / embargo-lift events. Gated `!== 1.0` so the
    // historical (no-event) path is byte-stable — same pattern used to keep
    // recruitment_modifier hash-neutral on 40w.
    const eqMult = getActiveEquipmentQualityMultiplier(state, formation.faction, state.meta.turn ?? 0);
    if (eqMult !== 1.0) power *= eqMult;
    return power;
}

export function computeDefenderPower(
    state: GameState,
    formation: FormationState,
    targetOsid: Osid,
    terrainMultByOsid: Record<string, number>,
    artillerySuppression: number = 0,
    supplyStateByOsid?: SupplyStateByOsidReport | null,
    ethnicDefenseBonus?: number,
    profileTime?: CombatMathProfileTimer,
    densityModifierByFormationId?: LocalFrontDensityModifierLookup,
    officerLookup?: OfficerCombatLookup,
): number {
    return computeDefenderPowerBreakdown(
        state,
        formation,
        targetOsid,
        terrainMultByOsid,
        artillerySuppression,
        supplyStateByOsid,
        ethnicDefenseBonus,
        profileTime,
        densityModifierByFormationId,
        officerLookup,
    ).power;
}

export function computeDefenderPowerBreakdown(
    state: GameState,
    formation: FormationState,
    targetOsid: Osid,
    terrainMultByOsid: Record<string, number>,
    artillerySuppression: number = 0,
    supplyStateByOsid?: SupplyStateByOsidReport | null,
    ethnicDefenseBonus?: number,
    profileTime?: CombatMathProfileTimer,
    densityModifierByFormationId?: LocalFrontDensityModifierLookup,
    officerLookup?: OfficerCombatLookup,
): DefenderPowerBreakdown {
    const base = combatMathProfileTime(profileTime, '.base', () => basePower(formation));
    const {
        postureMult,
        entrenchmentMult,
        corpsDefMult,
        resilienceMult,
        disruptionMult,
    } = combatMathProfileTime(profileTime, '.postureContext', () => {
        const posture = formation.posture ?? 'defend';
        const rawPostureMult = posture === 'dig_in'
            ? computeDigInDefMult(formation.dig_in_progress)
            : POSTURE_DEFENSE[posture] ?? 1;
        const entrenchmentTurns = Math.min(MAX_ENTRENCHMENT, (formation as { entrenchment_turns?: number }).entrenchment_turns ?? 0);
        const suppressionFactor = 1.0 - artillerySuppression;

        // ── Mechanic A: Hasty defense penalty ──────────────────────────────
        // Formations that haven't been in position long enough get reduced posture
        // defense effectiveness. At et=0, posture contributes nothing (1.0×).
        // Ramps to full over HASTY_DEFENSE_RAMP turns.
        const hastyFactor = Math.min(1.0, entrenchmentTurns / HASTY_DEFENSE_RAMP);
        const postureMult = 1.0 + (rawPostureMult - 1.0) * hastyFactor;

        // Diminishing returns: sqrt curve — first turns of digging in matter most.
        // At 1 turn: 0.07 (was 0.035). At 6 turns: 0.07×√6 = 0.171 (was 0.21).
        const entrenchmentMult = 1.0 + Math.sqrt(entrenchmentTurns) * ENTRENCHMENT_PER_TURN * 2 * suppressionFactor;
        const corpsStance = getCorpsStance(state, formation);
        const corpsDefMult = corpsStance ? CORPS_STANCE_DEFENSE[corpsStance] ?? 1 : 1;
        const defenseStreak = Math.min(MAX_RESILIENCE_STREAK, (formation as { defense_streak?: number }).defense_streak ?? 0);
        const resilienceMult = 1.0 + defenseStreak * RESILIENCE_PER_DEFENSE;
        const disruptionMult = getDisruptionMult(formation, 'defend');
        return { postureMult, entrenchmentMult, corpsDefMult, resilienceMult, disruptionMult };
    });
    const supplyMult = combatMathProfileTime(profileTime, '.supply', () =>
        getSupplyMult(formation, state, 'defend', supplyStateByOsid)
    );
    const {
        terrainMult,
        urbanMult,
        forestMult,
        enclaveMult,
        toTerrainMult,
        perBrigadeTerrainBonus,
    } = combatMathProfileTime(profileTime, '.terrainFactors', () => {
        const terrainMult = terrainMultByOsid[targetOsid] ?? 1.0;
        const urbanMult = getUrbanMult(targetOsid);
        const forestMult = getForestMult(targetOsid);
        const enclaveMult = getEnclaveDefenseBonus(state, targetOsid);
        const toTerrainMult = getToTerrainDefenseMult(getFormationTier(formation), targetOsid, terrainMultByOsid);
        const decorationDefBonus = getDecorationDefBonus(formation);
        const perBrigadeTerrainBonus = 1.0 + (formation.defense_terrain_bonus ?? decorationDefBonus);
        return { terrainMult, urbanMult, forestMult, enclaveMult, toTerrainMult, perBrigadeTerrainBonus };
    });
    const frontDensityMult = combatMathProfileTime(profileTime, '.frontDensity', () =>
        getLocalFrontDensityModifier(state, formation, densityModifierByFormationId)
    );
    const officerMult = combatMathProfileTime(profileTime, '.officer', () =>
        getThreeTierOfficerMod(formation, state, 'defend', officerLookup)
    );
    const ethnicMult = 1.0 + (ethnicDefenseBonus ?? 0);
    const fatigueMult = combatMathProfileTime(profileTime, '.fatigue', () =>
        getFatigueMult(formation, 'defend')
    );
    const homeMult = combatMathProfileTime(profileTime, '.home', () =>
        getHomeDistanceMultFromCache(state, formation)
    );
    const moralePenalty = combatMathProfileTime(profileTime, '.morale', () =>
        getCriticalMoralePenalty(formation)
    );

    // ── LANE-NIGHTSHIFT-STUPCANICA-DEFENDER-STACK-PHASE-1-IMPLEMENTATION ──
    // SHAPE B mutual-exclusivity collapse on the terrain-class triplet
    // {urban, forest, enclave}. An OSID is one terrain class — historically,
    // the Žepa enclave-interior is highland forest, NOT a stack of three
    // independent terrain advantages. Pre-collapse: urbanMult * forestMult *
    // enclaveMult was triple-multiplicative. Post-collapse: a single MAX-of-set
    // dominant-class multiplier participates in envProduct. All other defender
    // modifiers (entrench, posture, home, per-brigade-terrain, officer, etc.)
    // remain orthogonal and multiplicative as before. The existing soft-cap
    // (DEFENSE_ENV_CAP_THRESHOLD / DEFENSE_ENV_COMPRESSION / DEFENSE_ENV_HARD_CAP=2.5)
    // remains UNTOUCHED as the second-line backstop (panel SHAPE A fallback).
    // §6 sign-off chain (b03333af):
    //   - docs/40_reports/audits/20260505_STUPCANICA_S6_HISTORIAN_SIGN_OFF.md (APPROVED-WITH-CAVEAT)
    //   - docs/40_reports/audits/20260505_STUPCANICA_S6_GAME_DESIGNER_SIGN_OFF.md (APPROVED + AC-14)
    //   - docs/40_reports/audits/20260505_STUPCANICA_S6_WAR_OR_GAME_SIGN_OFF.md (APPROVED-WITH-CAVEAT + AC-15 + ST-6 Goražde extension)
    // Faction-symmetric mechanism: applies to every defender at every OSID
    // where two or more of {urban, forest, enclave} are >1.0, irrespective of
    // faction or operation. ICTY Krstić IT-98-33-T §§120-150 + Popović IT-05-88-T
    // §§240-250 ground the historical record (an OSID is one terrain class).
    const {
        finalEnvMult,
        terrainClassMult,
    } = combatMathProfileTime(profileTime, '.environmentCap', () => {
        const terrainClassMult = Math.max(urbanMult, forestMult, enclaveMult);

        // ── Mechanic B: Defense environmental soft cap ─────────────────────
        // The product of environmental defense multipliers uses diminishing returns
        // above DEFENSE_ENV_CAP_THRESHOLD to prevent 17 small multipliers from
        // compounding to absurd levels.
        const envProduct = terrainMult * entrenchmentMult * corpsDefMult * resilienceMult
            * terrainClassMult * toTerrainMult * perBrigadeTerrainBonus
            * frontDensityMult * ethnicMult;
        const envBonus = envProduct - 1.0;
        const cappedBonus = envBonus <= DEFENSE_ENV_CAP_THRESHOLD
            ? envBonus
            : DEFENSE_ENV_CAP_THRESHOLD + (envBonus - DEFENSE_ENV_CAP_THRESHOLD) * DEFENSE_ENV_COMPRESSION;
        const cappedEnvMult = 1.0 + Math.max(0, cappedBonus);
        return {
            finalEnvMult: Math.min(cappedEnvMult, DEFENSE_ENV_HARD_CAP),
            terrainClassMult,
        };
    });

    let power = combatMathProfileTime(profileTime, '.powerProduct', () =>
        base * postureMult * supplyMult * finalEnvMult * disruptionMult * officerMult * fatigueMult * homeMult * moralePenalty
    );
    // LANE-NIGHTSHIFT-EQUIPMENT-QUALITY-MODIFIER-SUBSTRATE: faction-scoped power
    // multiplier from arms-flow / embargo-lift events. Gated `!== 1.0` so the
    // historical (no-event) path is byte-stable.
    const eqMult = combatMathProfileTime(profileTime, '.equipmentQuality', () =>
        getActiveEquipmentQualityMultiplier(state, formation.faction, state.meta.turn ?? 0)
    );
    if (eqMult !== 1.0) power *= eqMult;
    return {
        base,
        postureMult,
        entrenchmentMult,
        supplyMult,
        terrainMult,
        terrainClassMult,
        toTerrainMult,
        perBrigadeTerrainBonus,
        corpsDefMult,
        resilienceMult,
        frontDensityMult,
        ethnicMult,
        finalEnvMult,
        disruptionMult,
        officerMult,
        fatigueMult,
        homeMult,
        moraleMult: moralePenalty,
        equipmentQualityMult: eqMult,
        power,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Terrain helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Terrain multiplier for one SID from scalars. Multiplicative. */
export function terrainCompositeForSid(data: TerrainScalarsData, sid: string): number {
    const t = getTerrainScalarsForSid(data, sid);
    let mult = 1.0;
    if (t.river_crossing_penalty >= 0.5) mult *= 1.3;
    if (t.slope_index >= 0.5) mult *= 1.4;
    else if (t.slope_index >= 0.35) mult *= 1.15;
    if (t.road_access_index >= 0.6) mult *= 0.9;
    if (t.terrain_friction_index >= 0.5) mult *= 1.2;
    return mult;
}

/** Build deterministic defender terrain multipliers per OSID (average of constituent SID composites). */
export function buildTerrainMultByOsid(
    reverseMap: OperationalToCanonicalReverseMap,
    terrainData?: TerrainScalarsData | null
): Record<string, number> {
    const out: Record<string, number> = {};
    if (!terrainData?.by_sid) return out;
    const osids = Array.from(reverseMap.keys()).sort(strictCompare);
    for (const osid of osids) {
        const sids = reverseMap.get(osid) ?? [];
        if (sids.length === 0) { out[osid] = 1.0; continue; }
        let sum = 0;
        for (const sid of sids) {
            sum += terrainCompositeForSid(terrainData, sid);
        }
        out[osid] = sum / sids.length;
    }
    return out;
}

/**
 * Rank a list of defender formations by power (highest first) and compute
 * the stacked defender total. Returns { primary, totalPower } where primary
 * is the highest-power formation that takes casualties.
 * Used identically in resolver and predictor for both direct and sector defense.
 */
export function rankDefendersByPower(
    defenders: FormationState[],
    state: GameState,
    targetOsid: string,
    terrainMultByOsid: Record<string, number>,
    artSuppression: number,
    supplyStateByOsid: import('../../state/supply_state_derivation.js').SupplyStateByOsidReport | null | undefined,
    ethnicBonusFn: (d: FormationState) => number
): { primary: FormationState; totalPower: number; rankedDefenders: Array<{ id: string; power: number; breakdown: DefenderPowerBreakdown }> } {
    const sorted = defenders
        .map(d => {
            const breakdown = computeDefenderPowerBreakdown(
                    state,
                    d,
                    targetOsid,
                    terrainMultByOsid,
                    artSuppression,
                    supplyStateByOsid,
                    ethnicBonusFn(d),
                );
            return { f: d, p: breakdown.power, breakdown };
        })
        .sort((a, b) => b.p - a.p);
    const primary = sorted[0];
    if (primary === undefined) {
        throw new Error('rankDefendersByPower requires at least one defender');
    }
    const totalPower = primary.p + sorted.slice(1).reduce((s, x) => s + x.p * STACKING_DEFENDER_SUPPORT, 0);
    return {
        primary: primary.f,
        totalPower,
        rankedDefenders: sorted.map((entry) => ({
            id: entry.f.id,
            power: entry.p,
            breakdown: entry.breakdown,
        })),
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// P7 — War Exhaustion → Attack Tempo Penalty
// ═══════════════════════════════════════════════════════════════════════════

const WAR_EXHAUSTION_TEMPO_THRESHOLD_LOW  = 500;
const WAR_EXHAUSTION_TEMPO_THRESHOLD_HIGH = 800;
const WAR_EXHAUSTION_TEMPO_MULT_MIN       = 0.85;

/**
 * Returns a [0.85, 1.0] multiplier on attacker power based on faction war exhaustion.
 * Applied to attacker power ONLY — never to defender power.
 * Linear interpolation between thresholds 500 and 800.
 */
export function getWarExhaustionTempoMult(
    state: GameState,
    factionId: string,
): number {
    const exhaustion = (state.political?.war_exhaustion as Record<string, number> | undefined)?.[factionId] ?? 0;
    if (exhaustion <= WAR_EXHAUSTION_TEMPO_THRESHOLD_LOW) return 1.0;
    if (exhaustion >= WAR_EXHAUSTION_TEMPO_THRESHOLD_HIGH) return WAR_EXHAUSTION_TEMPO_MULT_MIN;
    const fraction = (exhaustion - WAR_EXHAUSTION_TEMPO_THRESHOLD_LOW)
                   / (WAR_EXHAUSTION_TEMPO_THRESHOLD_HIGH - WAR_EXHAUSTION_TEMPO_THRESHOLD_LOW);
    return 1.0 - fraction * (1.0 - WAR_EXHAUSTION_TEMPO_MULT_MIN);
}

// ═══════════════════════════════════════════════════════════════════════════
// P10 — Lanchester Numerical Superiority Bonus
// ═══════════════════════════════════════════════════════════════════════════

const LANCHESTER_ATTACKER_MIN            = 3;
const LANCHESTER_POWER_RATIO_MIN         = 1.5;
const LANCHESTER_BONUS_PER_EXTRA_BRIGADE = 0.05;
const LANCHESTER_MAX_BONUS               = 0.30;

/**
 * Returns a [1.0, 1.30] multiplier on finalDefenderCas when the attacker has
 * numerical superiority (≥3 brigades, power ratio ≥1.5).
 * Applied to finalDefenderCas ONLY — not to defender power.
 */
export function getLanchesterConcentrationBonus(
    attackerCount: number,
    powerRatio: number,
): number {
    if (attackerCount < LANCHESTER_ATTACKER_MIN) return 1.0;
    if (powerRatio < LANCHESTER_POWER_RATIO_MIN) return 1.0;
    const extraBrigades = attackerCount - 2;
    const bonus = Math.min(LANCHESTER_MAX_BONUS, extraBrigades * LANCHESTER_BONUS_PER_EXTRA_BRIGADE);
    return 1.0 + bonus;
}
