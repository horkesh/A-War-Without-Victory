/**
 * Phase II: OSID-based attack resolution per Attack Resolution Formula Spec.
 *
 * Formulas: §2–§5, §9 state, §10 constants (docs/30_planning/20260222_ATTACK_RESOLUTION_FORMULA_SPEC.md).
 * One attack resolution = at most one OSID control flip (Engine Invariants §6).
 * Deterministic: sorted formation IDs and target OSIDs; no randomness.
 */

import type { EdgeRecord } from '../../map/settlements.js';
import { getTerrainScalarsForSid, type TerrainScalarsData } from '../../map/terrain_scalars.js';
import {
    initializeCasualtyLedger,
    recordBattleCasualties
} from '../../state/casualty_ledger.js';
import { MIN_COMBAT_PERSONNEL } from '../../state/formation_constants.js';
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
// Constants (§10)
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

const KIA_FRACTION = 0.25;
const WIA_FRACTION = 0.6;
const MIA_FRACTION = 0.15;

// Outcome casualty modifiers (§4.2)
const OUTCOME_ATTACKER_MOD: Record<string, number> = {
    decisive_victory: 1.0,
    victory: 1.2,
    costly_victory: 1.8,
    stalemate: 1.0,
    repulsed: 2.0,
    catastrophic: 3.0
};
const OUTCOME_DEFENDER_MOD: Record<string, number> = {
    decisive_victory: 2.5,
    victory: 1.8,
    costly_victory: 1.2,
    stalemate: 0.8,
    repulsed: 0.5,
    catastrophic: 0.3
};

// Cohesion deltas (§4.5)
const COHESION_ATTACKER: Record<string, number> = {
    decisive_victory: 2,
    victory: 1,
    costly_victory: -5,
    stalemate: -3,
    repulsed: -8,
    catastrophic: -15
};
const COHESION_DEFENDER: Record<string, number> = {
    decisive_victory: -15,
    victory: -8,
    costly_victory: -6,
    stalemate: -1,
    repulsed: 1,
    catastrophic: 3
};

// Part 7a: Experience gain from combat (Mobilization & Force Growth)
const BASE_EXPERIENCE_GAIN = 0.03;
const VICTORY_EXPERIENCE_BONUS = 0.02;
const DEFEAT_EXPERIENCE_GAIN = 0.01;
const FACTION_LEARNING_RATE: Record<string, number> = {
    RBiH: 1.5,
    RS: 0.7,
    HRHB: 1.0
};
const DEFAULT_LEARNING_RATE = 1.0;
const COMMANDER_EXP_LOSS = 0.15; // defender only when commander_casualty snap fires

// Posture multipliers (§2.4) — attack mult / defense mult
const POSTURE_ATTACK: Record<string, number> = {
    defend: 0,
    hold: 0,
    probe: 0.5,
    attack: 1.0,
    assault: 1.2,
    elastic_defense: 0,
    consolidation: 0.6
};
const POSTURE_DEFENSE: Record<string, number> = {
    defend: 1.4,
    hold: 1.2,
    probe: 1.0,
    attack: 0.8,
    assault: 0.6,
    elastic_defense: 1.2,
    consolidation: 1.1
};

const CORPS_STANCE_ATTACK: Record<string, number> = {
    defensive: 0.5,
    balanced: 0.8,
    offensive: 1.0,
    reorganize: 0.5
};
const CORPS_STANCE_DEFENSE: Record<string, number> = {
    defensive: 1.2,
    balanced: 1.0,
    offensive: 0.8,
    reorganize: 1.0
};

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function getSupplyMult(formation: FormationState, _state: GameState, mode: 'attack' | 'defend'): number {
    const lastSupplied = formation.ops?.last_supplied_turn;
    if (lastSupplied != null && _state.meta.turn - lastSupplied <= 2) return 1.0;
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

/** Terrain multiplier for one SID from scalars (Spec §2.5: river ×1.3, mountain ×1.4, slope ×1.15, road ×0.9, friction as forest proxy ×1.2). Multiplicative. */
function terrainCompositeForSid(data: TerrainScalarsData, sid: string): number {
    const t = getTerrainScalarsForSid(data, sid);
    let mult = 1.0;
    if (t.river_crossing_penalty >= 0.5) mult *= 1.3;
    if (t.slope_index >= 0.5) mult *= 1.4;
    else if (t.slope_index >= 0.35) mult *= 1.15;
    if (t.road_access_index >= 0.6) mult *= 0.9;
    if (t.terrain_friction_index >= 0.5) mult *= 1.2;
    return mult;
}

/** Build deterministic defender terrain multipliers per OSID (max of constituent SID composites). */
function buildTerrainMultByOsid(
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
            const comp = terrainCompositeForSid(terrainData, sid);
            if (comp > max) max = comp;
        }
        out[osid] = max;
    }
    return out;
}

function getTerrainMultForOsid(targetOsid: Osid, terrainMultByOsid: Record<string, number>): number {
    return terrainMultByOsid[targetOsid] ?? 1.0;
}

function getUrbanMult(_state: GameState, targetOsid: Osid): number {
    const osidLower = targetOsid.toLowerCase();
    if (osidLower.includes('centar_sarajevo') || osidLower.includes('novo_sarajevo') || osidLower.includes('stari_grad') || osidLower.includes('sarajevo')) return 1.5;
    return 1.0;
}

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

/**
 * Base combat power: personnel × equipment_ratio × experience_mult × (cohesion/100).
 * Experience uses a floor (0.6) so green troops have basic combat effectiveness.
 * Without this floor, formations starting at experience=0 would have zero power,
 * creating a chicken-and-egg problem where no battles can occur to gain experience.
 */
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

export type AttackOutcome =
    | 'decisive_victory' | 'victory' | 'costly_victory'
    | 'stalemate' | 'repulsed' | 'catastrophic';

export type AttackResolutionOsidSnapEventType =
    | 'ammo_crisis'
    | 'commander_casualty'
    | 'last_stand'
    | 'surrender_cascade'
    | 'pyrrhic_victory';

export interface AttackResolutionOsidSnapEvent {
    snap_type: AttackResolutionOsidSnapEventType;
    trigger_phase: 'pre_battle' | 'post_battle';
    attacker_brigade: FormationId;
    target_osid: Osid;
    affected_formation?: FormationId;
    description: string;
    effects: Record<string, number | string | boolean | null>;
}

function classifyOutcome(powerRatio: number): AttackOutcome {
    if (powerRatio >= VICTORY_THRESHOLD_DECISIVE) return 'decisive_victory';
    if (powerRatio >= VICTORY_THRESHOLD_NORMAL) return 'victory';
    if (powerRatio >= VICTORY_THRESHOLD_COSTLY) return 'costly_victory';
    if (powerRatio >= STALEMATE_FLOOR) return 'stalemate';
    if (powerRatio >= REPULSED_FLOOR) return 'repulsed';
    return 'catastrophic';
}

export interface AttackResolutionOsidReport {
    orders_processed: number;
    /** Distinct OSID targets attacked this turn. */
    unique_attack_targets: number;
    flips_applied: number;
    casualty_attacker: number;
    casualty_defender: number;
    /** Orders processed per attacker faction. */
    orders_by_faction: Record<string, number>;
    /** Formation IDs that participated in combat this turn (for cohesion drift skip). */
    engaged_formation_ids: FormationId[];
    snap_events: AttackResolutionOsidSnapEvent[];
    snap_event_counts: Partial<Record<AttackResolutionOsidSnapEventType, number>>;
    battles: Array<{
        attacker_brigade: FormationId;
        target_osid: Osid;
        outcome: AttackOutcome;
        power_ratio: number;
        attacker_won: boolean;
        /** Defender brigade present (null = militia-only defense). */
        defender_brigade: FormationId | null;
        snap_events: AttackResolutionOsidSnapEvent[];
    }>;
}

function pushSnapEvent(report: AttackResolutionOsidReport, event: AttackResolutionOsidSnapEvent): void {
    report.snap_events.push(event);
    report.snap_event_counts[event.snap_type] = (report.snap_event_counts[event.snap_type] ?? 0) + 1;
}

/**
 * Resolve all brigade attack orders (target = OSID) for one turn.
 * Mutates state: political_controllers, formations (personnel, cohesion, entrenchment_turns, defense_streak, disrupted_turns, location_osid), casualty_ledger.
 * Clears brigade_attack_orders. At most one OSID control flip per attack.
 * When operational data (edges + reverseMap) is missing, returns empty report and does not mutate attack orders.
 * Optional terrainData: when provided, defender terrain multiplier is aggregated per OSID from constituent SIDs (Spec §2.5).
 */
export function resolveAttackOrdersOsid(
    state: GameState,
    edges: EdgeRecord[],
    reverseMap: OperationalToCanonicalReverseMap,
    terrainData?: TerrainScalarsData | null
): AttackResolutionOsidReport {
    const report: AttackResolutionOsidReport = {
        orders_processed: 0,
        unique_attack_targets: 0,
        flips_applied: 0,
        casualty_attacker: 0,
        casualty_defender: 0,
        orders_by_faction: {},
        engaged_formation_ids: [],
        snap_events: [],
        snap_event_counts: {},
        battles: []
    };

    const terrainMultByOsid = buildTerrainMultByOsid(reverseMap, terrainData);

    const orders = state.brigade_attack_orders;
    if (!orders || typeof orders !== 'object') return report;

    const adjacency = buildOsidAdjacency(edges);
    const formationIds = Object.keys(orders).sort(strictCompare) as FormationId[];
    const targetToAttackers = new Map<Osid, FormationId[]>();
    for (const fid of formationIds) {
        const target = orders[fid] as string | undefined;
        if (!target) continue;
        const list = targetToAttackers.get(target) ?? [];
        list.push(fid);
        targetToAttackers.set(target, list);
    }
    const targetOsids = Array.from(targetToAttackers.keys()).sort(strictCompare);
    report.unique_attack_targets = targetOsids.length;
    // Count orders by faction
    for (const fid of formationIds) {
        const f = state.formations?.[fid];
        if (!f) continue;
        const fac = f.faction as string;
        report.orders_by_faction[fac] = (report.orders_by_faction[fac] ?? 0) + 1;
    }

    if (!state.casualty_ledger) {
        const factionIds = (state.factions ?? []).map(f => f.id);
        state.casualty_ledger = initializeCasualtyLedger(factionIds);
    }

    for (const targetOsid of targetOsids) {
        const attackerIds = targetToAttackers.get(targetOsid)!;
        if (attackerIds.length === 0) continue;

        const attackerFormations = attackerIds
            .map(id => state.formations?.[id])
            .filter((f): f is FormationState => f != null && f.status === 'active');
        if (attackerFormations.length === 0) continue;

        const firstAttacker = attackerFormations[0]!;
        const attackerFaction = firstAttacker.faction as FactionId;
        const attackerLoc = (firstAttacker as { location_osid?: string }).location_osid;
        if (!attackerLoc) continue;
        const neighbors = adjacency.get(attackerLoc) ?? [];
        if (!neighbors.includes(targetOsid)) continue;

        const defenderFormations = (Object.values(state.formations ?? {}) as FormationState[])
            .filter(f => f.status === 'active' && (f as { location_osid?: string }).location_osid === targetOsid && f.faction !== attackerFaction);
        const controller = getPoliticalControllerOSID(state, targetOsid, reverseMap);
        const isEnemyControlled = controller !== null && controller !== attackerFaction;

        let defenderPower: number;
        let defenderFormation: FormationState | null = null;
        if (defenderFormations.length > 0) {
            const powers = defenderFormations.map(d => computeDefenderPower(state, d, targetOsid, terrainMultByOsid));
            const sorted = defenderFormations.map((d, i) => ({ f: d, p: powers[i]! })).sort((a, b) => b.p - a.p);
            defenderPower = sorted[0]!.p + sorted.slice(1).reduce((s, x) => s + x.p * STACKING_DEFENDER_SUPPORT, 0);
            defenderFormation = sorted[0]!.f;
        } else if (isEnemyControlled) {
            const pop = 5000;
            defenderPower = pop * MILITIA_DEFENSE_RATIO * 0.25;
        } else {
            continue;
        }

        const battleSnapEvents: AttackResolutionOsidSnapEvent[] = [];

        // Snap: Last Stand — defender has no valid retreat → power ×1.5, casualties ×2 (Spec §8)
        let lastStandCasMult = 1;
        if (defenderFormation) {
            const enemyZocForDef = computeEnemyZocOsidsForFaction(state, adjacency, defenderFormation.faction as FactionId);
            const retreatDests = getValidRetreatDestinations(state, defenderFormation.id, adjacency, reverseMap, enemyZocForDef);
            if (retreatDests.length === 0) {
                defenderPower *= 1.5;
                lastStandCasMult = 2;
                const ev: AttackResolutionOsidSnapEvent = {
                    snap_type: 'last_stand',
                    trigger_phase: 'pre_battle',
                    attacker_brigade: firstAttacker.id,
                    target_osid: targetOsid,
                    affected_formation: defenderFormation.id,
                    description: 'Defender has no valid retreat; defensive power and casualty intensity increased.',
                    effects: { defender_power_mult: 1.5, casualty_mult: 2 },
                };
                battleSnapEvents.push(ev);
                pushSnapEvent(report, ev);
            }
        }

        const coordPenalty = attackerFormations.length >= 3 ? COORDINATION_PENALTY_3PLUS : attackerFormations.length === 2 ? COORDINATION_PENALTY_2 : 1.0;
        const attackerPower = attackerFormations.reduce((s, a) => s + computeAttackerPower(state, a), 0) * coordPenalty;

        const powerRatio = defenderPower <= 0 ? 10 : attackerPower / defenderPower;
        // Snap: Surrender Cascade — defender cohesion < 10 and power_ratio > 2.5 → eliminate without retreat (Spec §8)
        const surrenderCascade = defenderFormation !== null
            && (defenderFormation.cohesion ?? 60) < 10
            && powerRatio > 2.5;
        if (surrenderCascade && defenderFormation) {
            const ev: AttackResolutionOsidSnapEvent = {
                snap_type: 'surrender_cascade',
                trigger_phase: 'pre_battle',
                attacker_brigade: firstAttacker.id,
                target_osid: targetOsid,
                affected_formation: defenderFormation.id,
                description: 'Defender cohesion collapsed under overwhelming assault; surrender cascade triggered.',
                effects: { retreat_allowed: false, forced_decisive_victory: true },
            };
            battleSnapEvents.push(ev);
            pushSnapEvent(report, ev);
        }
        const outcome = surrenderCascade ? 'decisive_victory' as AttackOutcome : classifyOutcome(powerRatio);
        report.orders_processed += attackerIds.length;
        report.battles.push({
            attacker_brigade: firstAttacker.id,
            target_osid: targetOsid,
            outcome,
            power_ratio: powerRatio,
            attacker_won: outcome === 'decisive_victory' || outcome === 'victory' || outcome === 'costly_victory',
            defender_brigade: defenderFormation?.id ?? null,
            snap_events: battleSnapEvents
        });
        for (const a of attackerFormations) report.engaged_formation_ids.push(a.id);
        if (defenderFormation) report.engaged_formation_ids.push(defenderFormation.id);

        const personnelAttacker = attackerFormations.reduce((s, a) => s + (a.personnel ?? 0), 0);
        const personnelDefender = defenderFormation ? (defenderFormation.personnel ?? 0) : 5000 * MILITIA_DEFENSE_RATIO;
        const baseAttackerCas = personnelAttacker * BASE_ATTACKER_LOSS_RATE * (OUTCOME_ATTACKER_MOD[outcome] ?? 1) * lastStandCasMult;
        const baseDefenderCas = personnelDefender * BASE_DEFENDER_LOSS_RATE * (OUTCOME_DEFENDER_MOD[outcome] ?? 1) * lastStandCasMult;
        const finalAttackerCas = Math.min(personnelAttacker - MIN_COMBAT_PERSONNEL, Math.max(0, Math.round(baseAttackerCas)));
        const finalDefenderCas = Math.min(personnelDefender, Math.max(0, Math.round(baseDefenderCas)));

        const aKia = Math.floor(finalAttackerCas * KIA_FRACTION);
        const aWia = Math.floor(finalAttackerCas * WIA_FRACTION);
        const aMia = finalAttackerCas - aKia - aWia;
        const dKia = Math.floor(finalDefenderCas * KIA_FRACTION);
        const dWia = Math.floor(finalDefenderCas * WIA_FRACTION);
        const dMia = finalDefenderCas - dKia - dWia;

        report.casualty_attacker += finalAttackerCas;
        report.casualty_defender += finalDefenderCas;

        for (const a of attackerFormations) {
            const frac = (a.personnel ?? 0) / Math.max(1, personnelAttacker);
            const cas = Math.round(finalAttackerCas * frac);
            applyPersonnelLoss(a, cas);
            a.cohesion = Math.max(0, Math.min(100, (a.cohesion ?? 60) + (COHESION_ATTACKER[outcome] ?? 0)));
            if (outcome === 'costly_victory') (a as { disrupted_turns?: number }).disrupted_turns = 1;
            if (outcome === 'repulsed' || outcome === 'catastrophic') (a as { disrupted_turns?: number }).disrupted_turns = 1;
            recordBattleCasualties(state.casualty_ledger!, a.faction, a.id, {
                killed: Math.floor(cas * KIA_FRACTION),
                wounded: Math.floor(cas * WIA_FRACTION),
                missing_captured: Math.max(0, cas - Math.floor(cas * KIA_FRACTION) - Math.floor(cas * WIA_FRACTION))
            });
        }
        if (defenderFormation) {
            applyPersonnelLoss(defenderFormation, finalDefenderCas);
            defenderFormation.cohesion = Math.max(0, Math.min(100, (defenderFormation.cohesion ?? 60) + (COHESION_DEFENDER[outcome] ?? 0)));
            (defenderFormation as { defense_streak?: number }).defense_streak = (outcome === 'stalemate' || outcome === 'repulsed' || outcome === 'catastrophic')
                ? Math.min(MAX_RESILIENCE_STREAK, ((defenderFormation as { defense_streak?: number }).defense_streak ?? 0) + 1)
                : 0;
            recordBattleCasualties(state.casualty_ledger!, defenderFormation.faction, defenderFormation.id, { killed: dKia, wounded: dWia, missing_captured: dMia });
            // Snap: Commander Casualty — defender cohesion dropped below 20 from combat (Spec §8)
            if (defenderFormation.cohesion < 20) {
                defenderFormation.cohesion = Math.max(0, defenderFormation.cohesion - 8);
                (defenderFormation as { defense_streak?: number }).defense_streak = 0;
                const prevExp = defenderFormation.experience ?? 0;
                if (prevExp > 0.3) {
                    defenderFormation.experience = Math.max(0, prevExp - COMMANDER_EXP_LOSS);
                }
                const ev: AttackResolutionOsidSnapEvent = {
                    snap_type: 'commander_casualty',
                    trigger_phase: 'post_battle',
                    attacker_brigade: firstAttacker.id,
                    target_osid: targetOsid,
                    affected_formation: defenderFormation.id,
                    description: 'Defender command cohesion collapsed after heavy losses.',
                    effects: { defender_cohesion_delta: -8, defense_streak_reset: true },
                };
                battleSnapEvents.push(ev);
                pushSnapEvent(report, ev);
            }
        }

        // Snap: Ammunition Crisis (attack failed + supply CRITICAL) or Pyrrhic Victory (won but >15% casualties) — force defend posture (Spec §8)
        const attackerLost = outcome === 'repulsed' || outcome === 'catastrophic';
        const attackerWon = outcome === 'decisive_victory' || outcome === 'victory' || outcome === 'costly_victory';
        const ammoCrisis = attackerLost && getSupplyMult(firstAttacker, state, 'attack') < 0.5;
        const pyrrhic = attackerWon && personnelAttacker > 0 && finalAttackerCas / personnelAttacker > 0.15;
        if (ammoCrisis || pyrrhic) {
            const ev: AttackResolutionOsidSnapEvent = ammoCrisis
                ? {
                    snap_type: 'ammo_crisis',
                    trigger_phase: 'post_battle',
                    attacker_brigade: firstAttacker.id,
                    target_osid: targetOsid,
                    affected_formation: firstAttacker.id,
                    description: 'Attack force suffered ammunition/sustainment collapse after failed assault.',
                    effects: { forced_posture: 'defend', attacker_cohesion_delta: -10 },
                }
                : {
                    snap_type: 'pyrrhic_victory',
                    trigger_phase: 'post_battle',
                    attacker_brigade: firstAttacker.id,
                    target_osid: targetOsid,
                    affected_formation: firstAttacker.id,
                    description: 'Assault succeeded but losses were severe enough to force a defensive reset.',
                    effects: { forced_posture: 'defend', attacker_cohesion_delta: -10 },
                };
            battleSnapEvents.push(ev);
            pushSnapEvent(report, ev);
            for (const a of attackerFormations) {
                a.cohesion = Math.max(0, (a.cohesion ?? 60) - 10);
                a.posture = 'defend';
            }
        }

        // Part 7a: Experience gain for surviving formations (deterministic: attackers then defender)
        const applyExperienceGain = (f: FormationState, won: boolean) => {
            const rate = FACTION_LEARNING_RATE[f.faction] ?? DEFAULT_LEARNING_RATE;
            let gain = BASE_EXPERIENCE_GAIN * rate;
            if (won) gain += VICTORY_EXPERIENCE_BONUS * rate;
            else gain = Math.max(gain, DEFEAT_EXPERIENCE_GAIN * rate);
            const exp = Math.max(0, Math.min(1, f.experience ?? 0));
            const effectiveGain = gain * (1.0 - exp * 0.5);
            (f as { experience?: number }).experience = Math.min(1.0, exp + effectiveGain);
        };
        for (const a of attackerFormations) {
            applyExperienceGain(a, attackerWon);
        }
        if (defenderFormation && (defenderFormation.personnel ?? 0) > 0) {
            applyExperienceGain(defenderFormation, !attackerWon);
        }

        const flip = outcome === 'decisive_victory' || outcome === 'victory' || outcome === 'costly_victory';
        if (flip) {
            if (!state.political_controllers) state.political_controllers = {};
            state.political_controllers[targetOsid] = attackerFaction;
            report.flips_applied += 1;
        }

        if (flip && defenderFormation) {
            const enemyZoc = computeEnemyZocOsidsForFaction(state, adjacency, defenderFormation.faction as FactionId);
            const retreatDests = surrenderCascade ? [] : getValidRetreatDestinations(state, defenderFormation.id, adjacency, reverseMap, enemyZoc);
            const dest = retreatDests[0];
            if (dest != null) {
                (defenderFormation as { location_osid?: string }).location_osid = dest;
                (defenderFormation as { entrenchment_turns?: number }).entrenchment_turns = 0;
                (defenderFormation as { defense_streak?: number }).defense_streak = 0;
                if (outcome === 'decisive_victory') (defenderFormation as { disrupted_turns?: number }).disrupted_turns = 2;
                else if (outcome === 'victory') (defenderFormation as { disrupted_turns?: number }).disrupted_turns = 1;
            } else {
                defenderFormation.personnel = 0;
                defenderFormation.status = 'inactive';
            }
            const advanceFormation = attackerFormations[0];
            if (advanceFormation) {
                (advanceFormation as { location_osid?: string }).location_osid = targetOsid;
                (advanceFormation as { entrenchment_turns?: number }).entrenchment_turns = 0;
            }
        }
    }

    report.snap_events.sort((a, b) => {
        if (a.target_osid !== b.target_osid) return strictCompare(a.target_osid, b.target_osid);
        if (a.attacker_brigade !== b.attacker_brigade) return strictCompare(a.attacker_brigade, b.attacker_brigade);
        if (a.snap_type !== b.snap_type) return strictCompare(a.snap_type, b.snap_type);
        return strictCompare(a.trigger_phase, b.trigger_phase);
    });
    state.brigade_attack_orders = undefined;
    return report;
}

function computeAttackerPower(state: GameState, formation: FormationState): number {
    const base = basePower(formation);
    const posture = formation.posture ?? 'defend';
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
    const terrainMult = getTerrainMultForOsid(targetOsid, terrainMultByOsid);
    const entrenchmentTurns = Math.min(MAX_ENTRENCHMENT, (formation as { entrenchment_turns?: number }).entrenchment_turns ?? 0);
    const entrenchmentMult = 1.0 + entrenchmentTurns * ENTRENCHMENT_PER_TURN;
    const corpsStance = getCorpsStance(state, formation);
    const corpsDefMult = corpsStance ? CORPS_STANCE_DEFENSE[corpsStance] ?? 1 : 1;
    const defenseStreak = Math.min(MAX_RESILIENCE_STREAK, (formation as { defense_streak?: number }).defense_streak ?? 0);
    const resilienceMult = 1.0 + defenseStreak * RESILIENCE_PER_DEFENSE;
    const urbanMult = getUrbanMult(state, targetOsid);
    const disruptionMult = getDisruptionMult(formation, 'defend');
    return base * postureMult * supplyMult * terrainMult * entrenchmentMult * corpsDefMult * resilienceMult * urbanMult * disruptionMult;
}

function applyPersonnelLoss(formation: FormationState, loss: number): void {
    if (typeof formation.personnel !== 'number') return;
    formation.personnel = Math.max(MIN_COMBAT_PERSONNEL, formation.personnel - loss);
}
