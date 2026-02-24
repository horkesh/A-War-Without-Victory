/**
 * OSID-native combat outcome predictor — read-only.
 *
 * Mirrors the power/outcome logic in attack_resolution_osid.ts but does NOT mutate state.
 * Used by bot brigade AIs to decide whether an attack is worth committing to.
 *
 * The bot has "formula omniscience": it can compute exact power ratios, predict outcomes,
 * and calculate expected casualties before issuing any attack order.
 *
 * Deterministic: no randomness, no timestamps.
 * Canon: BOT_AI_DESIGN_SPEC.md §3.1.
 */

import type { EdgeRecord } from '../../map/settlements.js';
import { getTerrainScalarsForSid, type TerrainScalarsData } from '../../map/terrain_scalars.js';
import type {
    CorpsStance,
    FactionId,
    FormationId,
    FormationState,
    GameState
} from '../../state/game_state.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import { ensureBrigadeComposition } from './equipment_effects.js';
import {
    buildOsidAdjacency,
    computeEnemyZocOsidsForFaction,
    getValidRetreatDestinations,
    type Osid
} from './zoc.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants — exact mirrors of attack_resolution_osid.ts
// ═══════════════════════════════════════════════════════════════════════════

const VICTORY_THRESHOLD_DECISIVE = 2.0;
const VICTORY_THRESHOLD_NORMAL = 1.5;
const VICTORY_THRESHOLD_COSTLY = 1.0;
const STALEMATE_FLOOR = 0.7;
const REPULSED_FLOOR = 0.5;

const MAX_ENTRENCHMENT = 12;
const ENTRENCHMENT_PER_TURN = 0.065;
const MAX_RESILIENCE_STREAK = 6;
const RESILIENCE_PER_DEFENSE = 0.05;

const BASE_ATTACKER_LOSS_RATE = 0.04;
const BASE_DEFENDER_LOSS_RATE = 0.02;
const MILITIA_DEFENSE_RATIO = 0.03;
const COORDINATION_PENALTY_2 = 0.9;
const COORDINATION_PENALTY_3PLUS = 0.8;
const STACKING_DEFENDER_SUPPORT = 0.3;

const OUTCOME_ATTACKER_MOD: Record<string, number> = {
    decisive_victory: 1.0, victory: 1.2, costly_victory: 1.8,
    stalemate: 1.0, repulsed: 2.0, catastrophic: 3.0
};
const OUTCOME_DEFENDER_MOD: Record<string, number> = {
    decisive_victory: 2.5, victory: 1.8, costly_victory: 1.2,
    stalemate: 0.8, repulsed: 0.5, catastrophic: 0.3
};

const COHESION_ATTACKER: Record<string, number> = {
    decisive_victory: 2, victory: 1, costly_victory: -5,
    stalemate: -3, repulsed: -8, catastrophic: -15
};
const COHESION_DEFENDER: Record<string, number> = {
    decisive_victory: -15, victory: -8, costly_victory: -6,
    stalemate: -1, repulsed: 1, catastrophic: 3
};

const POSTURE_ATTACK: Record<string, number> = {
    defend: 0, hold: 0, probe: 0.5, attack: 1.0, assault: 1.2,
    elastic_defense: 0, consolidation: 0.6
};
const POSTURE_DEFENSE: Record<string, number> = {
    defend: 1.4, hold: 1.2, probe: 1.0, attack: 0.8, assault: 0.6,
    elastic_defense: 1.2, consolidation: 1.1
};

const CORPS_STANCE_ATTACK: Record<string, number> = {
    defensive: 0.5, balanced: 0.8, offensive: 1.0, reorganize: 0.5
};
const CORPS_STANCE_DEFENSE: Record<string, number> = {
    defensive: 1.2, balanced: 1.0, offensive: 0.8, reorganize: 1.0
};

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type PredictedOutcome =
    | 'decisive_victory' | 'victory' | 'costly_victory'
    | 'stalemate' | 'repulsed' | 'catastrophic';

export interface CombatPrediction {
    attacker_power: number;
    defender_power: number;
    power_ratio: number;
    predicted_outcome: PredictedOutcome;
    expected_attacker_casualties: number;
    expected_defender_casualties: number;
    attacker_casualty_percent: number;
    defender_casualty_percent: number;
    net_cohesion_attacker: number;
    net_cohesion_defender: number;
    defender_entrenchment: number;
    defender_terrain_mult: number;
    is_counter_attack_opportunity: boolean;
    overextension_risk: number;
    defender_has_brigade: boolean;
    defender_disrupted: boolean;
    defender_cohesion: number;
}

/** Predicted outcome → numeric score for bot target scoring. */
export const OUTCOME_SCORE: Record<PredictedOutcome, number> = {
    decisive_victory: 100,
    victory: 80,
    costly_victory: 40,
    stalemate: 10,
    repulsed: -50,
    catastrophic: -200
};

// ═══════════════════════════════════════════════════════════════════════════
// Internal helpers — mirrors of attack_resolution_osid.ts (read-only)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Equipment effectiveness ratio (0.5–1.5).
 * Infantry provides base effectiveness (0.5); heavy equipment adds on top.
 * Pure infantry brigades get 0.5 — they can still fight.
 * Well-equipped mechanized brigades with operational tanks+artillery get up to 1.5.
 */
function getEquipmentRatio(formation: FormationState): number {
    const comp = formation.composition ?? ensureBrigadeComposition(formation);
    const total = comp.infantry + comp.tanks + comp.artillery + comp.aa_systems;
    if (total <= 0) return 0.5;
    // Base: infantry provides 0.5 effectiveness always
    const infantryBase = 0.5;
    // Heavy equipment bonus: scales with proportion and operational state
    const heavyCount = comp.tanks + comp.artillery + comp.aa_systems;
    const heavyProportion = heavyCount / total;
    const tankOp = comp.tanks > 0 ? comp.tank_condition.operational : 0;
    const artOp = comp.artillery > 0 ? comp.artillery_condition.operational : 0;
    const heavyCondition = heavyCount > 0
        ? (comp.tanks * tankOp + comp.artillery * artOp) / Math.max(1, comp.tanks + comp.artillery)
        : 0;
    const heavyBonus = heavyProportion * heavyCondition; // 0 to ~1.0
    return Math.min(1.5, infantryBase + heavyBonus);
}

/** Base experience multiplier — even green troops have some combat effectiveness. */
const EXPERIENCE_BASE = 0.6;
const EXPERIENCE_SCALE = 0.4;

function basePower(formation: FormationState): number {
    const personnel = formation.personnel ?? 0;
    const eq = getEquipmentRatio(formation);
    const rawExp = Math.max(0, Math.min(1, formation.experience ?? 0));
    const expMult = EXPERIENCE_BASE + EXPERIENCE_SCALE * rawExp;
    const coh = Math.max(0, Math.min(100, formation.cohesion ?? 60)) / 100;
    return personnel * eq * expMult * coh;
}

function getSupplyMult(formation: FormationState, state: GameState, mode: 'attack' | 'defend'): number {
    const lastSupplied = formation.ops?.last_supplied_turn;
    if (lastSupplied != null && state.meta.turn - lastSupplied <= 2) return 1.0;
    return mode === 'attack' ? 0.4 : 0.5;
}

function getCorpsStance(state: GameState, formation: FormationState): CorpsStance | null {
    if (!formation.corps_id || !state.corps_command) return null;
    const corps = state.corps_command[formation.corps_id];
    return corps?.stance ?? null;
}

function getOperationsMult(state: GameState, formation: FormationState): number {
    if (!formation.corps_id || !state.corps_command) return 1.0;
    const op = state.corps_command[formation.corps_id]?.active_operation;
    if (!op || !op.participating_brigades.includes(formation.id)) return 1.0;
    if (op.phase === 'execution') return 1.3;
    if (op.phase === 'planning') return 1.0;
    if (op.phase === 'recovery') return 0.6;
    return 1.0;
}

function getOgMult(formation: FormationState): number {
    return (formation.kind === 'og' || formation.kind === 'operational_group') ? 1.15 : 1.0;
}

function getDisruptionMult(formation: FormationState, mode: 'attack' | 'defend'): number {
    const disrupted = (formation as { disrupted_turns?: number }).disrupted_turns ?? 0;
    const legacy = formation.disrupted === true;
    if (disrupted > 0 || legacy) return mode === 'attack' ? 0.5 : 0.6;
    return 1.0;
}

function getUrbanMult(targetOsid: Osid): number {
    const lower = targetOsid.toLowerCase();
    if (lower.includes('centar_sarajevo') || lower.includes('novo_sarajevo') || lower.includes('stari_grad') || lower.includes('sarajevo')) return 1.5;
    return 1.0;
}

function classifyOutcome(powerRatio: number): PredictedOutcome {
    if (powerRatio >= VICTORY_THRESHOLD_DECISIVE) return 'decisive_victory';
    if (powerRatio >= VICTORY_THRESHOLD_NORMAL) return 'victory';
    if (powerRatio >= VICTORY_THRESHOLD_COSTLY) return 'costly_victory';
    if (powerRatio >= STALEMATE_FLOOR) return 'stalemate';
    if (powerRatio >= REPULSED_FLOOR) return 'repulsed';
    return 'catastrophic';
}

function computeAttackerPower(state: GameState, formation: FormationState, overridePosture?: string): number {
    const base = basePower(formation);
    const posture = overridePosture ?? formation.posture ?? 'attack';
    const postureMult = POSTURE_ATTACK[posture] ?? 0;
    if (postureMult <= 0) return 0;
    const supplyMult = getSupplyMult(formation, state, 'attack');
    const corpsStance = getCorpsStance(state, formation);
    const corpsMult = corpsStance ? CORPS_STANCE_ATTACK[corpsStance] ?? 1 : 1;
    const opMult = getOperationsMult(state, formation);
    const ogMult = getOgMult(formation);
    const disruptionMult = getDisruptionMult(formation, 'attack');
    return base * postureMult * supplyMult * corpsMult * opMult * ogMult * disruptionMult;
}

function computeDefenderPower(
    state: GameState,
    formation: FormationState,
    targetOsid: Osid,
    terrainMultByOsid: Record<string, number>
): number {
    const base = basePower(formation);
    const posture = formation.posture ?? 'defend';
    const postureMult = POSTURE_DEFENSE[posture] ?? 1;
    const supplyMult = getSupplyMult(formation, state, 'defend');
    const terrainMult = terrainMultByOsid[targetOsid] ?? 1.0;
    const entrenchmentTurns = Math.min(MAX_ENTRENCHMENT, (formation as { entrenchment_turns?: number }).entrenchment_turns ?? 0);
    const entrenchmentMult = 1.0 + entrenchmentTurns * ENTRENCHMENT_PER_TURN;
    const corpsStance = getCorpsStance(state, formation);
    const corpsDefMult = corpsStance ? CORPS_STANCE_DEFENSE[corpsStance] ?? 1 : 1;
    const defenseStreak = Math.min(MAX_RESILIENCE_STREAK, (formation as { defense_streak?: number }).defense_streak ?? 0);
    const resilienceMult = 1.0 + defenseStreak * RESILIENCE_PER_DEFENSE;
    const urbanMult = getUrbanMult(targetOsid);
    const disruptionMult = getDisruptionMult(formation, 'defend');
    return base * postureMult * supplyMult * terrainMult * entrenchmentMult * corpsDefMult * resilienceMult * urbanMult * disruptionMult;
}

// ═══════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build defender terrain multiplier cache. Call once per turn.
 * Mirrors buildTerrainMultByOsid from attack_resolution_osid.ts.
 */
export function buildTerrainCache(
    reverseMap: OperationalToCanonicalReverseMap,
    terrainData?: TerrainScalarsData | null
): Record<string, number> {
    const out: Record<string, number> = {};
    if (!terrainData?.by_sid) return out;
    const osids = Array.from(reverseMap.keys()).sort(strictCompare);
    for (const osid of osids) {
        const sids = reverseMap.get(osid) ?? [];
        let max = 1.0;
        for (const sid of sids) {
            const t = getTerrainScalarsForSid(terrainData, sid);
            let mult = 1.0;
            if (t.river_crossing_penalty >= 0.5) mult *= 1.3;
            if (t.slope_index >= 0.5) mult *= 1.4;
            else if (t.slope_index >= 0.35) mult *= 1.15;
            if (t.road_access_index >= 0.6) mult *= 0.9;
            if (t.terrain_friction_index >= 0.5) mult *= 1.2;
            if (mult > max) max = mult;
        }
        out[osid] = max;
    }
    return out;
}

/**
 * Predict combat outcome for an attacker brigade vs a target OSID.
 *
 * Uses the exact same formulas as attack_resolution_osid.ts but read-only.
 * This is the bot's "formula omniscience" — it knows the outcome before committing.
 *
 * @param attackerPosture — override posture to use for attack power ('attack' or 'probe')
 * @param additionalAttackers — other brigades joining the attack (coordination penalty applies)
 */
export function predictCombatOutcome(
    state: GameState,
    attackerId: FormationId,
    targetOsid: Osid,
    adjacency: Map<Osid, Osid[]>,
    reverseMap: OperationalToCanonicalReverseMap,
    terrainMultByOsid: Record<string, number>,
    attackerPosture?: string,
    additionalAttackers?: FormationId[]
): CombatPrediction | null {
    const attacker = state.formations?.[attackerId];
    if (!attacker || attacker.status !== 'active') return null;

    const attackerLoc = attacker.location_osid;
    if (!attackerLoc) return null;

    // Verify adjacency
    const neighbors = adjacency.get(attackerLoc) ?? [];
    if (!neighbors.includes(targetOsid)) return null;

    const attackerFaction = attacker.faction as FactionId;

    // Collect all attacking formations
    const allAttackerIds = [attackerId, ...(additionalAttackers ?? [])];
    const attackerFormations = allAttackerIds
        .map(id => state.formations?.[id])
        .filter((f): f is FormationState => f != null && f.status === 'active');
    if (attackerFormations.length === 0) return null;

    // Find defenders at target OSID
    const defenderFormations = (Object.values(state.formations ?? {}) as FormationState[])
        .filter(f => f.status === 'active' && f.location_osid === targetOsid && f.faction !== attackerFaction)
        .sort((a, b) => strictCompare(a.id, b.id));

    const controller = getPoliticalControllerOSID(state, targetOsid, reverseMap);
    const isEnemyControlled = controller !== null && controller !== attackerFaction;

    // Compute defender power
    let defenderPower: number;
    let defenderFormation: FormationState | null = null;
    let defenderHasBrigade = false;
    let defenderDisrupted = false;
    let defenderCohesion = 60;

    if (defenderFormations.length > 0) {
        defenderHasBrigade = true;
        const powers = defenderFormations.map(d => computeDefenderPower(state, d, targetOsid, terrainMultByOsid));
        const sorted = defenderFormations.map((d, i) => ({ f: d, p: powers[i]! })).sort((a, b) => b.p - a.p);
        defenderPower = sorted[0]!.p + sorted.slice(1).reduce((s, x) => s + x.p * STACKING_DEFENDER_SUPPORT, 0);
        defenderFormation = sorted[0]!.f;
        defenderDisrupted = ((defenderFormation as { disrupted_turns?: number }).disrupted_turns ?? 0) > 0 || defenderFormation.disrupted === true;
        defenderCohesion = defenderFormation.cohesion ?? 60;
    } else if (isEnemyControlled) {
        defenderPower = 5000 * MILITIA_DEFENSE_RATIO * 0.25;
    } else {
        return null; // Friendly-controlled or neutral — nothing to attack
    }

    // Compute attacker power
    const coordPenalty = attackerFormations.length >= 3 ? COORDINATION_PENALTY_3PLUS
        : attackerFormations.length === 2 ? COORDINATION_PENALTY_2 : 1.0;
    const attackerPower = attackerFormations.reduce(
        (s, a) => s + computeAttackerPower(state, a, attackerPosture), 0
    ) * coordPenalty;

    // Outcome
    const powerRatio = defenderPower <= 0 ? 10 : attackerPower / defenderPower;
    const predicted = classifyOutcome(powerRatio);

    // Expected casualties
    const personnelAttacker = attackerFormations.reduce((s, a) => s + (a.personnel ?? 0), 0);
    const personnelDefender = defenderFormation ? (defenderFormation.personnel ?? 0) : 5000 * MILITIA_DEFENSE_RATIO;
    const baseAttCas = personnelAttacker * BASE_ATTACKER_LOSS_RATE * (OUTCOME_ATTACKER_MOD[predicted] ?? 1);
    const baseDefCas = personnelDefender * BASE_DEFENDER_LOSS_RATE * (OUTCOME_DEFENDER_MOD[predicted] ?? 1);
    const expectedAttCas = Math.max(0, Math.round(baseAttCas));
    const expectedDefCas = Math.max(0, Math.round(baseDefCas));

    // Entrenchment of defender
    const defEntTurns = defenderFormation
        ? Math.min(MAX_ENTRENCHMENT, (defenderFormation as { entrenchment_turns?: number }).entrenchment_turns ?? 0)
        : 0;

    // Counter-attack opportunity: defender just arrived (entrenchment=0)
    const isCounterAttack = defenderHasBrigade && defEntTurns === 0;

    // Overextension: count enemy-controlled neighbors of target (if we advance)
    const targetNeighbors = adjacency.get(targetOsid) ?? [];
    let enemyAdj = 0;
    for (const n of targetNeighbors) {
        const c = getPoliticalControllerOSID(state, n, reverseMap);
        if (c !== null && c !== attackerFaction) enemyAdj++;
    }

    return {
        attacker_power: attackerPower,
        defender_power: defenderPower,
        power_ratio: powerRatio,
        predicted_outcome: predicted,
        expected_attacker_casualties: expectedAttCas,
        expected_defender_casualties: expectedDefCas,
        attacker_casualty_percent: personnelAttacker > 0 ? expectedAttCas / personnelAttacker : 0,
        defender_casualty_percent: personnelDefender > 0 ? expectedDefCas / personnelDefender : 0,
        net_cohesion_attacker: COHESION_ATTACKER[predicted] ?? 0,
        net_cohesion_defender: COHESION_DEFENDER[predicted] ?? 0,
        defender_entrenchment: defEntTurns,
        defender_terrain_mult: terrainMultByOsid[targetOsid] ?? 1.0,
        is_counter_attack_opportunity: isCounterAttack,
        overextension_risk: enemyAdj,
        defender_has_brigade: defenderHasBrigade,
        defender_disrupted: defenderDisrupted,
        defender_cohesion: defenderCohesion
    };
}

/**
 * Convenience: predict outcome for every adjacent enemy OSID.
 * Returns array sorted by power_ratio descending (best opportunities first).
 */
export function predictAllAdjacentTargets(
    state: GameState,
    attackerId: FormationId,
    adjacency: Map<Osid, Osid[]>,
    reverseMap: OperationalToCanonicalReverseMap,
    terrainMultByOsid: Record<string, number>,
    attackerPosture?: string
): Array<{ osid: Osid; prediction: CombatPrediction }> {
    const attacker = state.formations?.[attackerId];
    if (!attacker || attacker.status !== 'active') return [];
    const loc = attacker.location_osid;
    if (!loc) return [];
    const factionId = attacker.faction as FactionId;

    const neighbors = adjacency.get(loc) ?? [];
    const results: Array<{ osid: Osid; prediction: CombatPrediction }> = [];

    for (const n of neighbors) {
        const controller = getPoliticalControllerOSID(state, n, reverseMap);
        if (controller === null || controller === factionId) continue; // Skip friendly/uncontrolled
        const pred = predictCombatOutcome(state, attackerId, n, adjacency, reverseMap, terrainMultByOsid, attackerPosture);
        if (pred) results.push({ osid: n, prediction: pred });
    }

    // Best opportunities first: highest power ratio
    results.sort((a, b) => {
        if (b.prediction.power_ratio !== a.prediction.power_ratio) return b.prediction.power_ratio - a.prediction.power_ratio;
        return strictCompare(a.osid, b.osid);
    });

    return results;
}
