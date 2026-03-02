/**
 * Shared combat math: constants, types, and pure functions used by both
 * attack_resolution_osid.ts (resolver) and combat_predictor.ts (predictor).
 *
 * Authoritative source — both files import from here. No duplication.
 * Deterministic: no randomness, no timestamps.
 */

import { getTerrainScalarsForSid, type TerrainScalarsData } from '../../map/terrain_scalars.js';
import { getFormationTier } from '../../state/formation_constants.js';
import type {
    CorpsStance,
    FormationState,
    GameState
} from '../../state/game_state.js';
import type { SupplyStateByOsidReport, SupplyStateLevel } from '../../state/supply_state_derivation.js';
import { getEffectiveSupplyState } from '../../state/supply_reserves.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import { getEnclaveDefenseBonus } from './enclave_resilience.js';
import { getLocalFrontDensityModifier } from './local_front_defense.js';
import { ensureBrigadeComposition } from './equipment_effects.js';
import type { Osid } from './osid_adjacency.js';

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
export const MAX_RESILIENCE_STREAK = 4;
export const RESILIENCE_PER_DEFENSE = 0.025;

/** Minimum morale to resist retreat on costly_victory. */
const MORALE_RESIST_FLOOR = 70;

/** Per-faction retreat resistance floors.
 * RBiH: defending homes, no retreat option → lower threshold (holds more).
 * RS: professional withdrawal discipline → standard threshold.
 * HRHB: middle ground. */
const FACTION_MORALE_RESIST_FLOOR: Record<string, number> = {
    RBiH: 62,
    RS: 70,
    HRHB: 65,
};

export function getMoraleResistFloor(faction: string): number {
    return FACTION_MORALE_RESIST_FLOOR[faction] ?? MORALE_RESIST_FLOOR;
}

export const BASE_ATTACKER_LOSS_RATE = 0.045;
export const BASE_DEFENDER_LOSS_RATE = 0.02;
export const MILITIA_DEFENSE_RATIO = 0.03;
export const COORDINATION_PENALTY_2 = 0.9;
export const COORDINATION_PENALTY_3PLUS = 0.8;
export const STACKING_DEFENDER_SUPPORT = 0.3;

/** Base experience multiplier — even green troops have some combat effectiveness. */
export const EXPERIENCE_BASE = 0.6;
export const EXPERIENCE_SCALE = 0.4;

/** Unit honor/decoration combat power multiplier. */
export const HONOR_MULT: Record<string, number> = { slavna: 1.10, viteska: 1.20 };

/** Honor-derived defense terrain bonus (used when no explicit defense_terrain_bonus in OOB). */
export const HONOR_DEFENSE_BONUS: Record<string, number> = { slavna: 0.10, viteska: 0.15 };

// Outcome casualty modifiers (§4.2)
export const OUTCOME_ATTACKER_MOD: Record<string, number> = {
    decisive_victory: 1.0, victory: 1.2, costly_victory: 1.8,
    stalemate: 1.0, repulsed: 2.0, catastrophic: 3.0
};
export const OUTCOME_DEFENDER_MOD: Record<string, number> = {
    decisive_victory: 2.5, victory: 1.8, costly_victory: 1.2,
    stalemate: 0.8, repulsed: 0.5, catastrophic: 0.3
};

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
    defend: 0, hold: 0, probe: 0.5, attack: 1.0, assault: 1.2,
    elastic_defense: 0, consolidation: 0.6
};
export const POSTURE_DEFENSE: Record<string, number> = {
    defend: 1.4, hold: 1.2, probe: 1.0, attack: 0.8, assault: 0.6,
    elastic_defense: 1.2, consolidation: 1.1
};

// Corps stance multipliers
export const CORPS_STANCE_ATTACK: Record<string, number> = {
    defensive: 0.5, balanced: 1.0, offensive: 1.15, reorganize: 0.5
};
export const CORPS_STANCE_DEFENSE: Record<string, number> = {
    defensive: 1.2, balanced: 1.0, offensive: 0.8, reorganize: 1.0
};

// ═══════════════════════════════════════════════════════════════════════════
// Pure functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Artillery suppression of entrenchment.
 * Uses the best-equipped attacker's suppression (corps concentrate fire support).
 * Returns 0–0.7: fraction of entrenchment bonus that is suppressed.
 */
export function getArtillerySuppression(attackers: FormationState[]): number {
    if (attackers.length === 0) return 0;
    let maxSuppression = 0;
    for (const attacker of attackers) {
        const comp = attacker.composition ?? ensureBrigadeComposition(attacker);
        const artEff = comp.artillery * (comp.artillery_condition?.operational ?? 0.5);
        const tankEff = comp.tanks * (comp.tank_condition?.operational ?? 0.5);
        const suppression = (artEff * 1.0 + tankEff * 0.5) / 100;
        if (suppression > maxSuppression) maxSuppression = suppression;
    }
    return Math.min(0.7, maxSuppression);
}

/**
 * Heavy weapons offensive firepower multiplier.
 * Cap 1.5 (2.5× max), divisor 300.
 */
export function getHeavyWeaponsOffensiveMult(formation: FormationState): number {
    const comp = formation.composition ?? ensureBrigadeComposition(formation);
    const artEff = comp.artillery * (comp.artillery_condition?.operational ?? 0.5);
    const tankEff = comp.tanks * (comp.tank_condition?.operational ?? 0.5);
    const heavyFirepower = tankEff * 10 + artEff * 8;
    return 1.0 + Math.min(1.5, heavyFirepower / 300);
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
    return Math.min(1.5, infantryBase + heavyBonus);
}

export function getHonorMult(formation: FormationState): number {
    return HONOR_MULT[(formation as { honor?: string }).honor ?? ''] ?? 1.0;
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
            if (state.meta.supply_reserves_enabled && state.general_supply_reserve) {
                const reserveLevel = (state.general_supply_reserve as Record<string, number>)[factionId] ?? 100;
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
    if (!formation.corps_id || !state.corps_command) return null;
    const corps = state.corps_command[formation.corps_id];
    return corps?.stance ?? null;
}

export function getOperationsMult(state: GameState, formation: FormationState): number {
    if (!formation.corps_id || !state.corps_command) return 1.0;
    const op = state.corps_command[formation.corps_id]?.active_operation;
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

/** Urban defense multiplier: Sarajevo OSIDs get 1.5×. */
export function getUrbanMult(targetOsid: Osid): number {
    const lower = targetOsid.toLowerCase();
    if (lower.includes('centar_sarajevo') || lower.includes('novo_sarajevo') || lower.includes('stari_grad') || lower.includes('sarajevo')) return 1.5;
    return 1.0;
}

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
 * @param overridePosture — optional posture override (predictor uses this for 'attack'/'probe')
 */
export function computeAttackerPower(
    state: GameState,
    formation: FormationState,
    supplyStateByOsid?: SupplyStateByOsidReport | null,
    overridePosture?: string
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
    const heavyMult = getHeavyWeaponsOffensiveMult(formation);
    return base * postureMult * supplyMult * corpsMult * opMult * ogMult * disruptionMult * heavyMult;
}

export function computeDefenderPower(
    state: GameState,
    formation: FormationState,
    targetOsid: Osid,
    terrainMultByOsid: Record<string, number>,
    artillerySuppression: number = 0,
    supplyStateByOsid?: SupplyStateByOsidReport | null
): number {
    const base = basePower(formation);
    const posture = formation.posture ?? 'defend';
    const postureMult = POSTURE_DEFENSE[posture] ?? 1;
    const supplyMult = getSupplyMult(formation, state, 'defend', supplyStateByOsid);
    const terrainMult = terrainMultByOsid[targetOsid] ?? 1.0;
    const entrenchmentTurns = Math.min(MAX_ENTRENCHMENT, (formation as { entrenchment_turns?: number }).entrenchment_turns ?? 0);
    const suppressionFactor = 1.0 - artillerySuppression;
    const entrenchmentMult = 1.0 + entrenchmentTurns * ENTRENCHMENT_PER_TURN * suppressionFactor;
    const corpsStance = getCorpsStance(state, formation);
    const corpsDefMult = corpsStance ? CORPS_STANCE_DEFENSE[corpsStance] ?? 1 : 1;
    const defenseStreak = Math.min(MAX_RESILIENCE_STREAK, (formation as { defense_streak?: number }).defense_streak ?? 0);
    const resilienceMult = 1.0 + defenseStreak * RESILIENCE_PER_DEFENSE;
    const urbanMult = getUrbanMult(targetOsid);
    const disruptionMult = getDisruptionMult(formation, 'defend');
    const enclaveMult = getEnclaveDefenseBonus(state, targetOsid);
    const toTerrainMult = getToTerrainDefenseMult(getFormationTier(formation), targetOsid, terrainMultByOsid);
    const honorDefBonus = HONOR_DEFENSE_BONUS[(formation as { honor?: string }).honor ?? ''] ?? 0;
    const perBrigadeTerrainBonus = 1.0 + (formation.defense_terrain_bonus ?? honorDefBonus);
    const frontDensityMult = getLocalFrontDensityModifier(state, formation);
    return base * postureMult * supplyMult * terrainMult * entrenchmentMult * corpsDefMult * resilienceMult * urbanMult * disruptionMult * enclaveMult * toTerrainMult * perBrigadeTerrainBonus * frontDensityMult;
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
