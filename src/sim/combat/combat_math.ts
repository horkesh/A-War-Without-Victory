/**
 * Shared combat math: constants, types, and pure functions used by both
 * attack_resolution_osid.ts (resolver) and combat_predictor.ts (predictor).
 *
 * Authoritative source — both files import from here. No duplication.
 * Deterministic: no randomness, no timestamps.
 */

import { getTerrainScalarsForSid, type TerrainScalarsData } from '../../map/terrain_scalars.js';
import { getDecorationAtkMult, getDecorationDefBonus } from './decoration_evaluator.js';
import { FATIGUE_MAX, getFormationTier } from '../../state/formation_constants.js';
import type {
    CorpsStance,
    FormationState,
    GameState
} from '../../state/game_state.js';
import type { SupplyStateByOsidReport, SupplyStateLevel } from '../../state/supply_state_derivation.js';
import { getEffectiveSupplyState } from '../../state/supply_reserves.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import {
    RESERVE_ADEQUATE_THRESHOLD,
    RESERVE_STRAINED_THRESHOLD,
} from '../../state/supply_reserve_constants.js';
import { getEnclaveDefenseBonus } from './enclave_resilience.js';
import { getLocalFrontDensityModifier } from './local_front_defense.js';
import { ensureBrigadeComposition } from './equipment_effects.js';
import type { Osid } from './osid_adjacency.js';
import { getHomeDistanceMult } from './home_distance.js';

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
 * When 3 brigades attack a sector point, the defender mobilizes 3 × 0.8 = 2.4 brigade
 * equivalents of reserves to the point of contact (capped at available reserves).
 * This prevents concentration from being an automatic win — defenders react.
 *
 * At 0.8: 3 attackers (3000 power with conc) vs 2400 reactive defense → ratio 1.25 (costly_victory)
 * At 1.0: 3 attackers vs 3000 reactive defense → ratio 1.0 (stalemate)
 */
export const REACTIVE_DEFENSE_RATIO = 1.0;
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
 * inflicting attacker losses even when overrun. BB1 p.462: 1992 was deadliest year. */
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
export const DEFENSE_ENV_COMPRESSION = 0.5;

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
export const OUTCOME_DEFENDER_MOD: Record<string, number> = {
    decisive_victory: 2.5, victory: 1.8, costly_victory: 1.2,
    stalemate: 1.0, repulsed: 0.7, catastrophic: 0.3
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
    role: 'attack' | 'defend'
): number {
    const turn = state.meta?.turn ?? 0;

    // Tier 1+2: named officers present
    if (state.military.named_officers && state.military.named_officer_data) {
        const brigMod = getBrigadeOfficerMod(formation, turn);
        const corpsId = formation.corps_id;
        if (!corpsId) return brigMod;

        // C.4: VRS pre-planned/general_offensive ops use army commander (Mladić) modifier
        if (formation.faction === 'RS' && role === 'attack') {
            const corps = state.military.corps_command?.[corpsId];
            if (corps?.active_operation?.type === 'general_offensive' && corps.active_operation.phase === 'execution') {
                // Find army commander instead of corps commander
                const officerIds = Object.keys(state.military.named_officers).sort(strictCompare);
                for (const id of officerIds) {
                    const os = state.military.named_officers[id]!;
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

        // Operation commander: brigades in named ops answer to ops commander
        const corpsCmd = state.military.corps_command?.[corpsId];
        const activeOp = corpsCmd?.active_operation;
        if (activeOp?.commander_officer_id && activeOp.phase === 'execution' &&
            activeOp.participating_brigades.includes(formation.id)) {
            const opsOs = state.military.named_officers[activeOp.commander_officer_id];
            const opsData = opsOs ? state.military.named_officer_data.find(o => o.id === activeOp.commander_officer_id) : null;
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
        const officerIds = Object.keys(state.military.named_officers).sort(strictCompare);
        for (const id of officerIds) {
            const os = state.military.named_officers[id]!;
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
        totalSuppression += suppressions[i]! * 0.3;
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
 */
export function getSupplyMult(
    formation: FormationState,
    state: GameState,
    mode: 'attack' | 'defend',
    supplyStateByOsid?: SupplyStateByOsidReport | null
): number {
    const locationOsid = (formation as { location_osid?: string }).location_osid;
    const factionId = formation.faction as string;
    if (supplyStateByOsid?.factions && locationOsid) {
        const facEntry = supplyStateByOsid.factions.find((f) => f.faction_id === factionId);
        const entry = facEntry?.by_osid?.find((e) => e.osid === locationOsid);
        if (entry) {
            let effectiveState: SupplyStateLevel = entry.state;

            // Phase A: When reserves enabled, combine reachability with reserves
            if (state.meta.supply_reserves_enabled && state.military.general_supply_reserve) {
                const reserveLevel = (state.military.general_supply_reserve as Record<string, number>)[factionId] ?? 100;
                effectiveState = getEffectiveSupplyState(entry.state, reserveLevel);
            }

            if (effectiveState === 'adequate') return 1.0;
            if (effectiveState === 'strained') return 0.75;
            return mode === 'attack' ? 0.45 : 0.5;
        }
    }
    const lastSupplied = formation.ops?.last_supplied_turn;
    if (lastSupplied != null && state.meta.turn - lastSupplied <= 2) return 1.0;
    return mode === 'attack' ? 0.4 : 0.5;
}

export function getCorpsStance(state: GameState, formation: FormationState): CorpsStance | null {
    if (!formation.corps_id || !state.military.corps_command) return null;
    const corps = state.military.corps_command[formation.corps_id];
    return corps?.stance ?? null;
}

export function getOperationsMult(state: GameState, formation: FormationState): number {
    if (!formation.corps_id || !state.military.corps_command) return 1.0;
    const op = state.military.corps_command[formation.corps_id]?.active_operation;
    if (!op || !op.participating_brigades.includes(formation.id)) return 1.0;
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

/**
 * Critical morale penalty: below CRITICAL_MORALE_THRESHOLD (15), combat effectiveness
 * drops sharply — 0.3× at morale=0, scaling linearly to 1.0× at morale=15.
 * Models organic collapse: critically demoralized troops cannot fight effectively.
 */
export function getCriticalMoralePenalty(formation: FormationState): number {
    const morale = formation.morale ?? 50;
    if (morale >= CRITICAL_MORALE_THRESHOLD) return 1.0;
    return Math.max(CRITICAL_MORALE_FLOOR, morale / CRITICAL_MORALE_THRESHOLD);
}

export function getConcentrationBonus(attackerCount: number): number {
    if (attackerCount <= 1) return 1.0;
    return 1.0 + Math.min(CONCENTRATION_BONUS_CAP, (attackerCount - 1) * CONCENTRATION_BONUS_PER_BRIGADE);
}

/**
 * Urban defense multiplier: Sarajevo OSIDs get 2.0×.
 * Military doctrine: urban terrain requires 3:1 attacker advantage.
 * Buildings provide cover, channelize movement, enable ambush.
 */
export function getUrbanMult(targetOsid: Osid): number {
    const lower = targetOsid.toLowerCase();
    if (lower.includes('centar_sarajevo') || lower.includes('novo_sarajevo') || lower.includes('stari_grad') || lower.includes('sarajevo')) return 2.0;
    return 1.0;
}

/**
 * Check if an OSID is urban terrain (for heavy weapons penalty).
 * Tanks in cities are death traps — Grozny, Mogadishu, Sarajevo.
 * Confined streets, ambush from above, RPGs, no maneuver space.
 */
export function isUrbanOsid(osid: string): boolean {
    const lower = osid.toLowerCase();
    return lower.includes('centar_sarajevo') || lower.includes('novo_sarajevo')
        || lower.includes('stari_grad') || lower.includes('sarajevo');
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
    const cache = state.military.home_distance_cache;
    if (!cache) return 1.0;
    const hops = cache[formation.id];
    if (hops === undefined) return 1.0;
    const isElite = !!(formation as { elite_loan_state?: unknown }).elite_loan_state;
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
 */
export function computeAttackerPower(
    state: GameState,
    formation: FormationState,
    supplyStateByOsid?: SupplyStateByOsidReport | null,
    overridePosture?: string,
    targetTerrainMult = 1.0,
    targetOsid?: string
): number {
    const base = basePower(formation);
    const posture = overridePosture ?? formation.posture ?? 'defend';
    const postureMult = POSTURE_ATTACK[posture] ?? 0;
    if (postureMult <= 0) return 0;
    const supplyMult = getSupplyMult(formation, state, 'attack', supplyStateByOsid);
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
    return base * postureMult * supplyMult * corpsMult * opMult * ogMult * disruptionMult * heavyMult * officerMult * fatigueMult * homeMult * moralePenalty;
}

export function computeDefenderPower(
    state: GameState,
    formation: FormationState,
    targetOsid: Osid,
    terrainMultByOsid: Record<string, number>,
    artillerySuppression: number = 0,
    supplyStateByOsid?: SupplyStateByOsidReport | null,
    ethnicDefenseBonus?: number
): number {
    const base = basePower(formation);
    const posture = formation.posture ?? 'defend';
    const rawPostureMult = posture === 'dig_in'
        ? computeDigInDefMult(formation.dig_in_progress)
        : POSTURE_DEFENSE[posture] ?? 1;
    const supplyMult = getSupplyMult(formation, state, 'defend', supplyStateByOsid);
    const terrainMult = terrainMultByOsid[targetOsid] ?? 1.0;
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
    const urbanMult = getUrbanMult(targetOsid);
    const disruptionMult = getDisruptionMult(formation, 'defend');
    const enclaveMult = getEnclaveDefenseBonus(state, targetOsid);
    const toTerrainMult = getToTerrainDefenseMult(getFormationTier(formation), targetOsid, terrainMultByOsid);
    const decorationDefBonus = getDecorationDefBonus(formation);
    const perBrigadeTerrainBonus = 1.0 + (formation.defense_terrain_bonus ?? decorationDefBonus);
    const frontDensityMult = getLocalFrontDensityModifier(state, formation);
    const officerMult = getThreeTierOfficerMod(formation, state, 'defend');
    const ethnicMult = 1.0 + (ethnicDefenseBonus ?? 0);
    const fatigueMult = getFatigueMult(formation, 'defend');
    const homeMult = getHomeDistanceMultFromCache(state, formation);
    const moralePenalty = getCriticalMoralePenalty(formation);

    // ── Mechanic B: Defense environmental soft cap ─────────────────────
    // The product of environmental defense multipliers uses diminishing returns
    // above DEFENSE_ENV_CAP_THRESHOLD to prevent 17 small multipliers from
    // compounding to absurd levels.
    const envProduct = terrainMult * entrenchmentMult * corpsDefMult * resilienceMult
        * urbanMult * enclaveMult * toTerrainMult * perBrigadeTerrainBonus
        * frontDensityMult * ethnicMult;
    const envBonus = envProduct - 1.0;
    const cappedBonus = envBonus <= DEFENSE_ENV_CAP_THRESHOLD
        ? envBonus
        : DEFENSE_ENV_CAP_THRESHOLD + (envBonus - DEFENSE_ENV_CAP_THRESHOLD) * DEFENSE_ENV_COMPRESSION;
    const cappedEnvMult = 1.0 + Math.max(0, cappedBonus);

    return base * postureMult * supplyMult * cappedEnvMult * disruptionMult * officerMult * fatigueMult * homeMult * moralePenalty;
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
): { primary: FormationState; totalPower: number } {
    const powers = defenders.map(d => computeDefenderPower(state, d, targetOsid, terrainMultByOsid, artSuppression, supplyStateByOsid, ethnicBonusFn(d)));
    const sorted = defenders.map((d, i) => ({ f: d, p: powers[i]! })).sort((a, b) => b.p - a.p);
    const totalPower = sorted[0]!.p + sorted.slice(1).reduce((s, x) => s + x.p * STACKING_DEFENDER_SUPPORT, 0);
    return { primary: sorted[0]!.f, totalPower };
}
