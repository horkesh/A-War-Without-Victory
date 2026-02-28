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
import { MIN_COMBAT_PERSONNEL, getFormationTier } from '../../state/formation_constants.js';
import type {
    CorpsStance,
    FactionId,
    FormationId,
    FormationState,
    GameState
} from '../../state/game_state.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import type { SupplyStateByOsidReport } from '../../state/supply_state_derivation.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { OperationalToCanonicalReverseMap, OsidPopulationMap } from '../../data/operational_data.js';
import { getEnclaveDefenseBonus } from './enclave_resilience.js';
import { getSeasonalModifiers } from './seasonal_effects.js';
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

const MAX_ENTRENCHMENT = 6;             // Tuned: 8→6. Max bonus 1.21× (was 1.28×). RS light infantry needs viable attacks through week 30.
const ENTRENCHMENT_PER_TURN = 0.035;
const MAX_RESILIENCE_STREAK = 4;        // Tuned: 6→4. Still rewards persistent defense.
const RESILIENCE_PER_DEFENSE = 0.025;   // Tuned: 0.05→0.025. Max bonus 1.10× (was 1.30×).

/**
 * Artillery suppression of entrenchment.
 * Heavy weapons (artillery, tanks) reduce the defender's entrenchment bonus.
 * This models artillery preparation fires softening fieldworks and tanks
 * providing direct fire to breach fortified positions.
 *
 * Historical: VRS inherited 330+ tanks and 800+ artillery pieces from JNA.
 * This massive firepower advantage was THE decisive factor allowing VRS to
 * break through entrenched positions throughout the war (Sarajevo, Gorazde,
 * Bihac, Drina valley). ARBiH lacked heavy weapons and struggled to break
 * VRS entrenchment — their offensives required massive numerical superiority.
 *
 * Returns 0–0.7: fraction of entrenchment bonus that is suppressed.
 *   VRS typical: ~0.45 (45% suppression)
 *   HVO typical: ~0.20 (20% suppression)
 *   ARBiH typical: ~0.06 (6% suppression)
 */
function getArtillerySuppression(attackers: FormationState[]): number {
    if (attackers.length === 0) return 0;
    // Use the best-equipped attacker's suppression (corps concentrate fire support)
    let maxSuppression = 0;
    for (const attacker of attackers) {
        const comp = attacker.composition ?? ensureBrigadeComposition(attacker);
        const artEff = comp.artillery * (comp.artillery_condition?.operational ?? 0.5);
        const tankEff = comp.tanks * (comp.tank_condition?.operational ?? 0.5);
        // Artillery is the primary counter to entrenchment; tanks contribute at 50%
        const suppression = (artEff * 1.0 + tankEff * 0.5) / 100;
        if (suppression > maxSuppression) maxSuppression = suppression;
    }
    return Math.min(0.7, maxSuppression);
}

/**
 * Heavy weapons offensive firepower multiplier.
 * Tanks and artillery provide DIRECT firepower advantage in attack, far beyond
 * their proportional weight in the equipment ratio. A tank or artillery piece
 * has 10-15× the offensive firepower of an infantryman.
 *
 * Historical: VRS's JNA-inherited heavy weapons (330+ tanks, 800+ artillery) gave
 * them overwhelming fire superiority in every engagement. ARBiH couldn't match this
 * and relied on terrain, entrenchment, and numerical superiority. The equipment
 * imbalance was THE defining feature of 1992 combat.
 *
 * Formula: Each effective tank = 10× infantry firepower, each artillery = 8×.
 * Capped at 0.6 (max 1.6× multiplier). At 1.6×, a solo VRS brigade can barely
 * achieve costly_victory vs fully entrenched ARBiH (power ratio ~1.01). Two VRS
 * brigades → victory (ratio ~1.8). This matches the historical pattern where VRS
 * needed corps-level force concentration for reliable breakthroughs but individual
 * brigades could still push through weak positions.
 *
 * Typical values:
 *   VRS:  ~1.60 (40 tanks + 30 artillery → overwhelming fire superiority)
 *   HVO:  ~1.27 (15 tanks + 15 artillery → significant advantage)
 *   ARBiH: ~1.09 (3 tanks + 8 artillery → minimal heavy weapons)
 */
function getHeavyWeaponsOffensiveMult(formation: FormationState): number {
    const comp = formation.composition ?? ensureBrigadeComposition(formation);
    const artEff = comp.artillery * (comp.artillery_condition?.operational ?? 0.5);
    const tankEff = comp.tanks * (comp.tank_condition?.operational ?? 0.5);
    // Each effective tank = 10× infantry firepower, each artillery = 8×
    const heavyFirepower = tankEff * 10 + artEff * 8;
    // Scale against a reference heavy force. Faster ramp, higher cap to model
    // historical VRS 3-5:1 equipment advantage over ARBiH in open terrain.
    // Cap 1.5: concentrated VRS attacks (30T + 20A) reach 2.5x; ARBiH light infantry ≈1.03x.
    return 1.0 + Math.min(1.5, heavyFirepower / 300);
}

// Tuned: 0.04→0.06→0.03. Full-war casualties ~62k over 4 years; year 1 should be ~20k.
const BASE_ATTACKER_LOSS_RATE = 0.03;
const BASE_DEFENDER_LOSS_RATE = 0.015;
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

// Tuned: balanced raised 0.8→1.0, offensive 1.0→1.15.
// Corps stance determines HOW MANY brigades attack (bot decision), not individual
// effectiveness. A brigade ordered to attack in a balanced corps fights at full
// capability — only defensive/reorganize stances reduce individual combat power
// (units are focused elsewhere). Offensive corps gets a mild bonus from concentrated
// fire support (artillery grouped at corps level for VRS historical operations).
const CORPS_STANCE_ATTACK: Record<string, number> = {
    defensive: 0.5,
    balanced: 1.0,
    offensive: 1.15,
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

/** Supply mult from OSID report when available; else last_supplied_turn fallback. Adequate→1, Strained→0.75, Critical→0.45 attack / 0.5 defend. */
function getSupplyMult(
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
            if (entry.state === 'adequate') return 1.0;
            if (entry.state === 'strained') return 0.75;
            return mode === 'attack' ? 0.45 : 0.5; // critical
        }
    }
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
        if (sids.length === 0) { out[osid] = 1.0; continue; }
        // Tuned: average terrain across constituent SIDs (was: max).
        // Average better represents operational-level terrain difficulty than worst-case point.
        let sum = 0;
        for (const sid of sids) {
            sum += terrainCompositeForSid(terrainData, sid);
        }
        out[osid] = sum / sids.length;
    }
    return out;
}

function getTerrainMultForOsid(targetOsid: Osid, terrainMultByOsid: Record<string, number>): number {
    return terrainMultByOsid[targetOsid] ?? 1.0;
}

/** Build average slope index per OSID for seasonal terrain interaction. */
function buildSlopeByOsid(
    reverseMap: OperationalToCanonicalReverseMap,
    terrainData?: TerrainScalarsData | null
): Record<string, number> {
    const out: Record<string, number> = {};
    if (!terrainData?.by_sid) return out;
    const osids = Array.from(reverseMap.keys()).sort(strictCompare);
    for (const osid of osids) {
        const sids = reverseMap.get(osid) ?? [];
        if (sids.length === 0) { out[osid] = 0; continue; }
        let sum = 0;
        for (const sid of sids) {
            const t = getTerrainScalarsForSid(terrainData, sid);
            sum += t.slope_index;
        }
        out[osid] = sum / sids.length;
    }
    return out;
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
 *
 * For militia (kind === 'militia') formations, tier-based overrides apply:
 *   Detachment: RBiH 0.15 (hunting rifles/TO stockpiles), RS/HRHB 0.5 (JNA/Croatian stockpiles)
 *   Battalion: RBiH 0.4, RS 0.7, HRHB 0.6
 * These reflect the historical reality that TO-origin units were armed from hidden stockpiles
 * (ARBiH) or JNA/Croatian arsenals (VRS/HVO) before brigade-level equipment was available.
 */
export function getEquipmentRatio(formation: FormationState): number {
    if (formation.kind === 'militia') {
        const tier = getFormationTier(formation);
        if (tier === 'detachment') {
            if (formation.faction === 'RBiH') return 0.15;  // Hunting rifles, hidden TO stockpiles
            return 0.5;  // RS/HRHB: JNA/Croatian stockpiles (infantry base)
        }
        // battalion
        if (formation.faction === 'RBiH') return 0.4;
        if (formation.faction === 'RS') return 0.7;
        return 0.6;  // HRHB
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

/**
 * Base combat power: personnel × equipment_ratio × experience_mult × (cohesion/100) × honor_mult.
 * Experience uses a floor (0.6) so green troops have basic combat effectiveness.
 * Without this floor, formations starting at experience=0 would have zero power,
 * creating a chicken-and-egg problem where no battles can occur to gain experience.
 */
const EXPERIENCE_BASE = 0.6;
const EXPERIENCE_SCALE = 0.4;

/**
 * Unit honor/decoration combat power multiplier (synced with combat_predictor.ts).
 * "Slavna" (glorious) and "Vitezka" (knight/valiant) were ARBiH brigade decorations.
 */
const HONOR_MULT: Record<string, number> = { slavna: 1.10, vitezka: 1.20 };
function getHonorMult(formation: FormationState): number {
    return HONOR_MULT[(formation as { honor?: string }).honor ?? ''] ?? 1.0;
}

function basePower(formation: FormationState): number {
    const personnel = formation.personnel ?? 0;
    const eq = getEquipmentRatio(formation);
    const rawExp = Math.max(0, Math.min(1, formation.experience ?? 0));
    const expMult = EXPERIENCE_BASE + EXPERIENCE_SCALE * rawExp;
    const coh = Math.max(0, Math.min(100, formation.cohesion ?? 60)) / 100;
    const honorMult = getHonorMult(formation);
    return personnel * eq * expMult * coh * honorMult;
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
        attacker_faction: FactionId;
        defender_faction: FactionId;
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
    terrainData?: TerrainScalarsData | null,
    supplyStateByOsid?: SupplyStateByOsidReport | null,
    osidPopulationMap?: OsidPopulationMap | null
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
    const slopeByOsid = buildSlopeByOsid(reverseMap, terrainData);

    // Seasonal effects: compute once per turn (same for all battles this turn)
    const currentTurn = state.meta?.turn ?? 0;
    const startDate = state.meta?.scenario_start_date;

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
        let isZocDefense = false;
        // Artillery/tank suppression: attacker's heavy weapons reduce defender entrenchment bonus
        const artSuppression = getArtillerySuppression(attackerFormations);
        if (defenderFormations.length > 0) {
            const powers = defenderFormations.map(d => computeDefenderPower(state, d, targetOsid, terrainMultByOsid, artSuppression, supplyStateByOsid));
            const sorted = defenderFormations.map((d, i) => ({ f: d, p: powers[i]! })).sort((a, b) => b.p - a.p);
            defenderPower = sorted[0]!.p + sorted.slice(1).reduce((s, x) => s + x.p * STACKING_DEFENDER_SUPPORT, 0);
            defenderFormation = sorted[0]!.f;
        } else if (isEnemyControlled) {
            // ZoC defense: brigades at adjacent OSIDs project Zone of Control.
            // Attacking into a brigade's ZoC is the same as attacking that brigade,
            // but without entrenchment (they're responding, not dug in).
            const zocDefenders = (Object.values(state.formations ?? {}) as FormationState[])
                .filter(f => {
                    if (f.status !== 'active' || f.faction === attackerFaction) return false;
                    if (f.faction !== controller) return false;
                    const loc = (f as { location_osid?: string }).location_osid;
                    if (!loc) return false;
                    const adjToLoc = adjacency.get(loc) ?? [];
                    return adjToLoc.includes(targetOsid);
                })
                .sort((a, b) => strictCompare(a.id, b.id));
            if (zocDefenders.length > 0) {
                // Linked ZoC check: if the target OSID is in the defender faction's linked ZoC,
                // the defense is stronger — the organized front line projects coordinated control.
                // Defense hierarchy:
                //   Direct defense (brigade present):     100% of computeDefenderPower
                //   Linked ZoC (connected chain):          35% of computeDefenderPower
                //   Unlinked ZoC (isolated projection):    entrenchment-scaled (0-100%)
                // Tuned: 0.7→0.35→0.50. At 0.35 linked ZoC was too weak to hold enclave
                // perimeters — 5 Srebrenica brigades couldn't cover 14 OSIDs. At 0.50, a linked
                // front provides credible defense: concentrated attackers can still break through,
                // but isolated probes are repulsed. Multi-brigade assaults remain effective.
                const defenderFaction = zocDefenders[0]!.faction as FactionId;
                const linkedArr = (state as { phase_ii_linked_zoc_by_faction?: Record<string, string[]> }).phase_ii_linked_zoc_by_faction?.[defenderFaction];
                const isLinkedZoc = linkedArr != null && linkedArr.includes(targetOsid);
                const powers = zocDefenders.map(d =>
                    isLinkedZoc
                        ? computeDefenderPower(state, d, targetOsid, terrainMultByOsid, artSuppression, supplyStateByOsid) * getLinkedZocReadiness(d)
                        : computeZocDefenderPower(state, d, targetOsid, terrainMultByOsid, supplyStateByOsid)
                );
                const sorted = zocDefenders.map((d, i) => ({ f: d, p: powers[i]! }))
                    .sort((a, b) => b.p - a.p);
                defenderPower = sorted[0]!.p + sorted.slice(1).reduce((s, x) => s + x.p * STACKING_DEFENDER_SUPPORT, 0);
                defenderFormation = sorted[0]!.f;
                isZocDefense = true;
            } else {
                // No brigade present or projecting ZoC — pure militia defense
                const pop = osidPopulationMap?.get(targetOsid) ?? 5000;
                defenderPower = pop * MILITIA_DEFENSE_RATIO * 0.25;
            }
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
        // Seasonal modifier: winter penalizes attackers, slightly benefits defenders (mountain amplifies)
        const targetSlope = slopeByOsid[targetOsid] ?? 0;
        const seasonal = getSeasonalModifiers(currentTurn, startDate, targetSlope);
        const attackerPower = attackerFormations.reduce((s, a) => s + computeAttackerPower(state, a, supplyStateByOsid), 0)
            * coordPenalty * seasonal.attack_mult;
        defenderPower *= seasonal.defense_mult;

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
            attacker_faction: attackerFaction,
            defender_faction: (controller ?? attackerFaction) as FactionId,
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
            if (outcome === 'repulsed' || outcome === 'catastrophic') {
                (a as { disrupted_turns?: number }).disrupted_turns = 1;
                // Fog of war: attacker learned enemy strength at this target the hard way
                (a as { last_repulsed_from?: { osid: string; turn: number } }).last_repulsed_from = {
                    osid: targetOsid, turn: state.meta?.turn ?? 0
                };
            }
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
        const ammoCrisis = attackerLost && getSupplyMult(firstAttacker, state, 'attack', supplyStateByOsid) < 0.5;
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
                // Track retreat for counter-attack eligibility: only this brigade may counter-attack this OSID next turn
                (defenderFormation as { last_retreat_from?: { osid: string; turn: number } }).last_retreat_from = {
                    osid: targetOsid, turn: state.meta?.turn ?? 0
                };
                if (outcome === 'decisive_victory') (defenderFormation as { disrupted_turns?: number }).disrupted_turns = 2;
                else if (outcome === 'victory') (defenderFormation as { disrupted_turns?: number }).disrupted_turns = 1;
            } else {
                defenderFormation.personnel = 0;
                defenderFormation.status = 'inactive';
            }
        }

        // Attacker advance: move into captured OSID after successful flip.
        // Applies to BOTH defended and undefended captures — without advancing,
        // the attacker stays at its original position and can never reach the new
        // front line beyond the captured territory.
        if (flip) {
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

function computeAttackerPower(
    state: GameState,
    formation: FormationState,
    supplyStateByOsid?: SupplyStateByOsidReport | null
): number {
    const base = basePower(formation);
    const posture = formation.posture ?? 'defend';
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

function computeDefenderPower(
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
    const terrainMult = getTerrainMultForOsid(targetOsid, terrainMultByOsid);
    const entrenchmentTurns = Math.min(MAX_ENTRENCHMENT, (formation as { entrenchment_turns?: number }).entrenchment_turns ?? 0);
    // Artillery suppression reduces the entrenchment bonus (not the base defense).
    // suppressionFactor ranges from 1.0 (no suppression) to 0.3 (70% suppressed by heavy weapons).
    const suppressionFactor = 1.0 - artillerySuppression;
    const entrenchmentMult = 1.0 + entrenchmentTurns * ENTRENCHMENT_PER_TURN * suppressionFactor;
    const corpsStance = getCorpsStance(state, formation);
    const corpsDefMult = corpsStance ? CORPS_STANCE_DEFENSE[corpsStance] ?? 1 : 1;
    const defenseStreak = Math.min(MAX_RESILIENCE_STREAK, (formation as { defense_streak?: number }).defense_streak ?? 0);
    const resilienceMult = 1.0 + defenseStreak * RESILIENCE_PER_DEFENSE;
    const urbanMult = getUrbanMult(state, targetOsid);
    const disruptionMult = getDisruptionMult(formation, 'defend');
    const enclaveMult = getEnclaveDefenseBonus(state, targetOsid);
    const toTerrainMult = getToTerrainDefenseMult(getFormationTier(formation), targetOsid, terrainMultByOsid);
    return base * postureMult * supplyMult * terrainMult * entrenchmentMult * corpsDefMult * resilienceMult * urbanMult * disruptionMult * enclaveMult * toTerrainMult;
}

/**
 * ZoC defender power: brigade projects Zone of Control to adjacent OSIDs.
 * Attacking into ZoC = fighting that brigade, but defense effectiveness
 * scales with entrenchment (readiness). A freshly placed or recently moved
 * brigade (entrenchment 0) projects no ZoC defense — it hasn't organized
 * its area control yet. After 4+ turns in position, full ZoC defense.
 *
 * This creates the historical early-war dynamic: VRS rapid expansion in
 * weeks 1-4 (defenders disorganized, no ZoC projection) → front solidifies
 * as brigades dig in → static siege warfare (strong ZoC defense).
 *
 * No resilience streak bonus (responding, not holding position).
 * Terrain still applies (defenders know the terrain).
 */
function computeZocDefenderPower(
    state: GameState,
    formation: FormationState,
    targetOsid: Osid,
    terrainMultByOsid: Record<string, number>,
    supplyStateByOsid?: SupplyStateByOsidReport | null
): number {
    const base = basePower(formation);
    const posture = formation.posture ?? 'defend';
    const postureMult = POSTURE_DEFENSE[posture] ?? 1;
    const supplyMult = getSupplyMult(formation, state, 'defend', supplyStateByOsid);
    const terrainMult = getTerrainMultForOsid(targetOsid, terrainMultByOsid);
    // ZoC readiness: scales 0→1 over 4 turns of entrenchment.
    // entrenchment 0 = just placed/moved → 0% ZoC (no projection)
    // entrenchment 2 = 2 weeks in position → 50% ZoC
    // entrenchment 4+ = fully organized → 100% ZoC
    const entrench = Math.min(MAX_ENTRENCHMENT, (formation as { entrenchment_turns?: number }).entrenchment_turns ?? 0);
    // ZoC readiness capped by tier: detachments max 0.30, battalions max 0.50, brigades max 1.0
    const maxZocByTier = getFormationTier(formation) === 'detachment' ? 0.30
        : getFormationTier(formation) === 'battalion' ? 0.50 : 1.0;
    const zocReadiness = Math.min(maxZocByTier, entrench / 4);
    const corpsStance = getCorpsStance(state, formation);
    const corpsDefMult = corpsStance ? CORPS_STANCE_DEFENSE[corpsStance] ?? 1 : 1;
    const urbanMult = getUrbanMult(state, targetOsid);
    const disruptionMult = getDisruptionMult(formation, 'defend');
    const toTerrainMult = getToTerrainDefenseMult(getFormationTier(formation), targetOsid, terrainMultByOsid);
    return base * postureMult * supplyMult * terrainMult * corpsDefMult * urbanMult * disruptionMult * zocReadiness * toTerrainMult;
}

/**
 * Additional terrain defense multiplier for TO formations (tier !== 'brigade').
 * Represents light infantry asymmetric advantage in urban/mountain terrain.
 * Brigades use standard combat mechanics (return 1.0).
 *
 * Urban: dense built-up areas — even lightly armed defenders impose real assault costs (BB1 pp.136-141)
 * Mountain: high terrain gives cover and chokepoint advantages to defenders
 * Forest: wooded terrain favors light infantry over mechanized formations
 * Open: no advantage — VRS mechanized forces roll over scattered TO detachments
 *
 * Classification uses terrainMultByOsid (slope proxy for mountain/forest) and OSID name for urban.
 */
export function getToTerrainDefenseMult(
    tier: 'detachment' | 'battalion' | 'brigade',
    targetOsid: string,
    terrainMultByOsid: Record<string, number>
): number {
    if (tier === 'brigade') return 1.0;

    // Urban: check OSID name for known city-center keywords
    const lower = targetOsid.toLowerCase();
    const isUrban = lower.includes('centar') || lower.includes('stari_grad') ||
        lower.includes('novo_sarajevo') || lower.includes('novi_grad') ||
        lower.includes('banja_luka') || lower.includes('tuzla') ||
        lower.includes('zenica') || lower.includes('bihac') ||
        lower.includes('mostar') || lower.includes('sarajevo') ||
        lower.includes('travnik') || lower.includes('prijedor');
    if (isUrban) return 2.5;

    // Mountain/forest: derive from terrainMultByOsid (already incorporates slope + friction)
    const terrainMult = terrainMultByOsid[targetOsid] ?? 1.0;
    if (terrainMult >= 1.35) return 2.0;  // High slope (mountain/ridge terrain)
    if (terrainMult >= 1.15) return 1.5;  // Moderate terrain (wooded/broken ground)
    return 1.0;  // Open terrain: no TO bonus
}

/**
 * ZoC readiness scaling by formation tier.
 * Detachments project very limited ZoC (30%): small, poorly coordinated, local.
 * Battalions project half-strength ZoC (50%): organized but limited command range.
 * Brigades project full ZoC (100%): corps-level coordination, real area denial.
 */
export function getLinkedZocReadiness(formation: FormationState): number {
    const tier = getFormationTier(formation);
    if (tier === 'detachment') return 0.30;
    if (tier === 'battalion') return 0.50;
    return 1.0;  // brigade
}

function applyPersonnelLoss(formation: FormationState, loss: number): void {
    if (typeof formation.personnel !== 'number') return;
    formation.personnel = Math.max(MIN_COMBAT_PERSONNEL, formation.personnel - loss);
}
