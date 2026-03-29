/**
 * War phase: OSID-based attack resolution per Attack Resolution Formula Spec.
 *
 * Formulas: §2–§5, §9 state, §10 constants (docs/30_planning/20260222_ATTACK_RESOLUTION_FORMULA_SPEC.md).
 * One attack resolution = at most one OSID control flip (Engine Invariants §6).
 * Deterministic: sorted formation IDs and target OSIDs; no randomness.
 */

import type { EdgeRecord } from '../../map/settlements.js';
import type { TerrainScalarsData } from '../../map/terrain_scalars.js';
import { getTerrainScalarsForSid } from '../../map/terrain_scalars.js';
import {
    recordAttackerEngagements,
    recordDefenderEngagement,
} from './brigade_history_recorder.js';
import { updateSectorIntelFromCombat } from './sector_intel.js';
import {
    initializeCasualtyLedger,
    recordBattleCasualties,
    recordEquipmentLoss
} from '../../state/casualty_ledger.js';
import { ensureBrigadeComposition } from './equipment_effects.js';
import { recordFormationFatigue } from '../../state/formation_fatigue.js';
import { FATIGUE_MAX, MIN_COMBAT_PERSONNEL } from '../../state/formation_constants.js';
import type {
    ControlEvent,
    FactionId,
    FormationId,
    FormationState,
    GameState
} from '../../state/game_state.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import type { SupplyStateByOsidReport } from '../../state/supply_state_derivation.js';
import { deductCombatExpenditure } from '../../state/supply_reserves.js';
import { FACILITY_COMBAT_DAMAGE_RATE } from '../../state/supply_reserve_constants.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { OperationalToCanonicalReverseMap, OsidPopulationMap } from '../../data/operational_data.js';
import { getSeasonalModifiers } from './seasonal_effects.js';
import {
    buildOsidAdjacency,
    munFromOsid,
    type Osid
} from './osid_adjacency.js';
import {
    type OsidEthnicComposition,
    getCoEthnicShare,
    getEthnicDefenseBonus,
} from './ethnic_defense.js';
import { removeFromActiveOperation } from './brigade_dissolution.js';
import { isRbihHrhbCombatEnabled } from '../early_war/alliance_update.js';

// ── Shared combat math ──────────────────────────────────────────────────
import {
    type CombatOutcome,
    // Constants used directly in resolver
    MAX_RESILIENCE_STREAK,
    BASE_ATTACKER_LOSS_RATE,
    BASE_DEFENDER_LOSS_RATE,
    MILITIA_DEFENSE_RATIO,
    COORDINATION_PENALTY_2,
    COORDINATION_PENALTY_3PLUS,
    STACKING_DEFENDER_SUPPORT,
    ENTRENCHMENT_DEGRADATION_PER_BATTLE,
    POSTURE_ATTACK,
    OUTCOME_ATTACKER_MOD,
    OUTCOME_DEFENDER_MOD,
    COHESION_ATTACKER,
    COHESION_DEFENDER,
    // Functions
    getMoraleResistFloor,
    getConcentrationBonus,
    getArtillerySuppression,
    getBombardmentCasualtyMult,
    getSupplyMult,
    classifyOutcome,
    computeAttackerPower,
    computeDefenderPower,
    buildTerrainMultByOsid,
    getPowerRatioCasualtyMult,
    // Re-exported for test consumers
    getEquipmentRatio,
    getToTerrainDefenseMult,
    rankDefendersByPower,
    MIN_DEFENSE_FLOOR_FRACTION,
    MAX_EDGES_PER_BRIGADE,
    REACTIVE_DEFENSE_RATIO,
    DEFENDER_CASUALTY_ENGAGEMENT_CAP,
    bfsDistanceFriendly,
    getReactiveDistanceWeight,
    HOME_DEFENSE_REACTIVE_BONUS,
    SECTOR_STANCE_REACTIVE_BONUS,
} from './combat_math.js';
import { OFFICER_CASUALTY_MULT, OFFICER_QUALITY_FLOOR } from './officer_quality_update.js';
import { findSectorForEnemyOsid, findSubSegmentForOsid, getCorpsHqOsid } from './corps_front_sectors.js';
import { getEnclaveGarrisonPower, getEnclaveCapitalOsid, isEnclaveCapital, isEnclaveBrigade, isOsidInSameEnclave } from './enclave_resilience.js';
// frontDensityModifier import removed — no longer used in sector defense

// Backward-compat re-exports
export type AttackOutcome = CombatOutcome;
export { getEquipmentRatio, getToTerrainDefenseMult };
export type { CombatOutcome };

// ═══════════════════════════════════════════════════════════════════════════
// Resolver-only constants
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Homeland determination casualty multiplier.
 * When morale absorption triggers (defender stays after costly_victory),
 * BOTH sides take additional casualties. This is the primary driver of
 * "defending harder, taking more casualties, not yielding ground" behavior.
 * High multiplier = bloodier stalemates (historically accurate for Bosnian War).
 */
const MORALE_ABSORPTION_CAS_MULT = 1.6;

// SECTOR_COVERAGE_PENALTY removed — replaced by distance-weighted reactive defense (n666).

/** Disruption turns applied to a brigade that is routed to its corps HQ after defending a lost sector OSID. */
const SECTOR_ROUT_DISRUPTED_TURNS = 4;
/** Cohesion loss on rout to corps HQ. */
const SECTOR_ROUT_COHESION_LOSS = 30;
/** Personnel fraction retained after rout (0.7 = 30% additional loss). */
const SECTOR_ROUT_PERSONNEL_RETAIN = 0.7;

const KIA_FRACTION = 0.30;
const WIA_FRACTION = 0.55;
const MIA_FRACTION = 0.15;

// Equipment loss rates per battle (same as legacy path in battle_resolution.ts)
const TANK_LOSS_RATE = 0.08;
const ARTILLERY_LOSS_RATE = 0.04;

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
const COMMANDER_EXP_LOSS = 0.15;

// ═══════════════════════════════════════════════════════════════════════════
// Defeat/displacement helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Zero entrenchment and defense streak after displacement or defeat. */
function resetFormationEntrenchment(f: FormationState): void {
    (f as { entrenchment_turns?: number }).entrenchment_turns = 0;
    (f as { defense_streak?: number }).defense_streak = 0;
}

/** Apply standard defeat penalties to a displaced defender: reset entrenchment, record retreat origin, and optionally set disrupted turns. */
function applyDefeatPenalties(
    f: FormationState,
    targetOsid: string,
    turn: number,
    outcome: CombatOutcome,
): void {
    resetFormationEntrenchment(f);
    (f as { last_retreat_from?: { osid: string; turn: number } }).last_retreat_from = {
        osid: targetOsid, turn,
    };
    if (outcome === 'decisive_victory') (f as { disrupted_turns?: number }).disrupted_turns = 2;
    else if (outcome === 'victory') (f as { disrupted_turns?: number }).disrupted_turns = 1;
}

// ═══════════════════════════════════════════════════════════════════════════
// Resolver-only helpers
// ═══════════════════════════════════════════════════════════════════════════

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

/**
 * Find friendly adjacent OSIDs for retreat. Sorted deterministically:
 * fewer enemy neighbors first, then by OSID name.
 */
/**
 * BFS distance from an OSID to a target through friendly territory.
 * Returns hop count, or Infinity if unreachable.
 */
function bfsDistanceToCapital(
    from: Osid,
    target: Osid,
    adjacency: Map<Osid, Osid[]>,
    state: GameState,
    factionId: FactionId,
    reverseMap: OperationalToCanonicalReverseMap
): number {
    if (from === target) return 0;
    const visited = new Set<string>([from]);
    let frontier = [from];
    let dist = 0;
    while (frontier.length > 0 && dist < 50) {
        dist++;
        const next: Osid[] = [];
        for (const osid of frontier) {
            for (const n of (adjacency.get(osid) ?? [])) {
                if (visited.has(n)) continue;
                visited.add(n);
                if (n === target) return dist;
                const c = getPoliticalControllerOSID(state, n, reverseMap);
                if (c === factionId) next.push(n);
            }
        }
        frontier = next;
    }
    return Infinity;
}

function getFriendlyRetreatDestinations(
    state: GameState,
    formation: FormationState,
    adjacency: Map<Osid, Osid[]>,
    reverseMap: OperationalToCanonicalReverseMap
): Osid[] {
    const loc = (formation as { location_osid?: string }).location_osid;
    const factionId = formation.faction as FactionId;
    if (!loc) return [];
    const neighbors = adjacency.get(loc) ?? [];
    let friendly: Osid[] = [];
    for (const n of neighbors) {
        const c = getPoliticalControllerOSID(state, n, reverseMap);
        if (c === factionId) friendly.push(n);
    }

    // Enclave retreat gravity: brigades in enclaves prefer retreating toward the capital.
    // BB2 p.479: beaten units fell back concentrically toward Goražde town.
    const capitalOsid = getEnclaveCapitalOsid(loc);
    if (capitalOsid) {
        // Enclave-tagged brigades MUST NOT retreat outside their enclave.
        // Without this filter, brigades drift out through temporary corridors
        // and end up 100km from their pocket (e.g., Goražde brigades in Visoko).
        if (isEnclaveBrigade(formation)) {
            friendly = friendly.filter(f => isOsidInSameEnclave(loc, f));
        }

        // Pre-compute BFS distance to capital for each candidate
        const distCache = new Map<string, number>();
        for (const f of friendly) {
            distCache.set(f, bfsDistanceToCapital(f, capitalOsid, adjacency, state, factionId, reverseMap));
        }
        friendly.sort((a, b) => {
            const dA = distCache.get(a) ?? Infinity;
            const dB = distCache.get(b) ?? Infinity;
            if (dA !== dB) return dA - dB; // Closer to capital = better
            // Tie-break: fewer enemy neighbors = safer
            const aAdj = (adjacency.get(a) ?? []).filter(n => {
                const c = getPoliticalControllerOSID(state, n, reverseMap);
                return c !== null && c !== factionId;
            }).length;
            const bAdj = (adjacency.get(b) ?? []).filter(n => {
                const c = getPoliticalControllerOSID(state, n, reverseMap);
                return c !== null && c !== factionId;
            }).length;
            if (aAdj !== bAdj) return aAdj - bAdj;
            return strictCompare(a, b);
        });
    } else {
        // Non-enclave: original logic (fewest enemy neighbors first)
        friendly.sort((a, b) => {
            const aAdj = (adjacency.get(a) ?? []).filter(n => {
                const c = getPoliticalControllerOSID(state, n, reverseMap);
                return c !== null && c !== factionId;
            }).length;
            const bAdj = (adjacency.get(b) ?? []).filter(n => {
                const c = getPoliticalControllerOSID(state, n, reverseMap);
                return c !== null && c !== factionId;
            }).length;
            if (aAdj !== bAdj) return aAdj - bAdj;
            return strictCompare(a, b);
        });
    }
    return friendly;
}

/**
 * Find any friendly OSID for a faction as an emergency retreat destination.
 * Priority: home_osid → fallback_osid → BFS nearest (8 hops) → corps HQ → any friendly.
 * BFS step keeps enclave brigades in their pocket instead of teleporting to corps HQ.
 */
/** Max BFS hops when searching for nearest friendly OSID during emergency retreat. */
const EMERGENCY_RETREAT_BFS_MAX_HOPS = 8;

function allocateIntegerByWeights(
    ids: string[],
    total: number,
    weightById: Map<string, number>
): Map<string, number> {
    const out = new Map<string, number>();
    if (total <= 0 || ids.length === 0) return out;
    const sorted = [...ids].sort(strictCompare);
    const totalWeight = sorted.reduce((s, id) => s + Math.max(0, weightById.get(id) ?? 0), 0);
    if (totalWeight <= 0) {
        // If no brigade has defensive weight, attribute all to deterministic primary.
        out.set(sorted[0]!, total);
        return out;
    }
    let assigned = 0;
    const remainderOrder: Array<{ id: string; rem: number }> = [];
    for (const id of sorted) {
        const raw = total * (Math.max(0, weightById.get(id) ?? 0) / totalWeight);
        const whole = Math.floor(raw);
        out.set(id, whole);
        assigned += whole;
        remainderOrder.push({ id, rem: raw - whole });
    }
    remainderOrder.sort((a, b) => (b.rem - a.rem) || strictCompare(a.id, b.id));
    let left = total - assigned;
    for (let i = 0; i < remainderOrder.length && left > 0; i++) {
        const id = remainderOrder[i]!.id;
        out.set(id, (out.get(id) ?? 0) + 1);
        left--;
    }
    return out;
}

function findEmergencyRetreatOsid(
    state: GameState,
    formation: FormationState,
    reverseMap: OperationalToCanonicalReverseMap,
    adjacency?: Map<Osid, Osid[]>,
    sourceOsid?: string
): string | null {
    const factionId = formation.faction as FactionId;
    const pc = state.political?.political_controllers ?? {};

    // 1. Try home_osid
    const homeOsid = (formation as { home_osid?: string }).home_osid;
    if (homeOsid && getPoliticalControllerOSID(state, homeOsid, reverseMap) === factionId) {
        return homeOsid;
    }

    // 2. Try fallback_osid
    const fallbackOsid = (formation as { fallback_osid?: string }).fallback_osid;
    if (fallbackOsid && getPoliticalControllerOSID(state, fallbackOsid, reverseMap) === factionId) {
        return fallbackOsid;
    }

    // 3. BFS from current location: find nearest friendly OSID within limited radius.
    //    Keeps enclave brigades inside their pocket instead of teleporting to corps HQ.
    //    BB2 p.479: beaten units fell back concentrically toward Goražde town.
    const origin = sourceOsid ?? (formation as { location_osid?: string }).location_osid;
    if (adjacency && origin) {
        const visited = new Set<string>([origin]);
        let frontier = [origin as Osid];
        for (let hop = 0; hop < EMERGENCY_RETREAT_BFS_MAX_HOPS && frontier.length > 0; hop++) {
            const next: Osid[] = [];
            for (const curr of frontier) {
                for (const n of (adjacency.get(curr) ?? [])) {
                    if (visited.has(n)) continue;
                    visited.add(n);
                    if (getPoliticalControllerOSID(state, n, reverseMap) === factionId) {
                        return n;
                    }
                    next.push(n);
                }
            }
            frontier = next;
        }
    }

    // 4. Try corps HQ
    const hqOsid = getCorpsHqOsid(state, formation);
    if (hqOsid && getPoliticalControllerOSID(state, hqOsid, reverseMap) === factionId) {
        return hqOsid;
    }

    // 5. Any friendly OSID (sorted for determinism)
    const osids = Object.keys(pc).sort(strictCompare);
    for (const osid of osids) {
        if (pc[osid] === factionId) return osid;
    }

    return null;
}

/** Personnel retain fraction for emergency long-distance retreat (e.g. displaced from behind enemy lines). */
const EMERGENCY_RETREAT_PERSONNEL_RETAIN = 0.60;
/** Cohesion loss on emergency retreat. */
const EMERGENCY_RETREAT_COHESION_LOSS = 20;
/** Disruption turns on emergency retreat. */
const EMERGENCY_RETREAT_DISRUPTED_TURNS = 3;

/** Options for force retreat penalty overrides. */
interface ForceRetreatOptions {
    personnelRetain?: number;
    cohesionLoss?: number;
    disruptedTurns?: number;
    adjacency?: Map<Osid, Osid[]>;
}

/**
 * Force-retreat a formation to a friendly OSID with heavy penalties.
 * Never destroys the brigade — worst case it goes to reserve status with minimal personnel.
 */
function forceRetreatWithPenalties(
    state: GameState,
    formation: FormationState,
    reverseMap: OperationalToCanonicalReverseMap,
    sourceOsid: string,
    opts?: ForceRetreatOptions
): void {
    const personnelRetain = opts?.personnelRetain ?? EMERGENCY_RETREAT_PERSONNEL_RETAIN;
    const cohesionLoss = opts?.cohesionLoss ?? EMERGENCY_RETREAT_COHESION_LOSS;
    const disruptedTurns = opts?.disruptedTurns ?? EMERGENCY_RETREAT_DISRUPTED_TURNS;
    const dest = findEmergencyRetreatOsid(state, formation, reverseMap, opts?.adjacency, sourceOsid);
    const f = formation as FormationState & { location_osid?: string; disrupted_turns?: number; last_retreat_from?: { osid: string; turn: number } };
    resetFormationEntrenchment(formation);
    f.disrupted_turns = disruptedTurns;
    formation.cohesion = Math.max(0, (formation.cohesion ?? 60) - cohesionLoss);
    formation.personnel = Math.max(MIN_COMBAT_PERSONNEL, Math.floor((formation.personnel ?? 0) * personnelRetain));
    if (dest != null) {
        f.location_osid = dest;
        f.last_retreat_from = { osid: sourceOsid, turn: state.meta?.turn ?? 0 };
    } else {
        // Absolute last resort: no friendly territory exists at all — brigade disperses
        // This should only happen if the entire faction's territory is lost
        f.location_osid = undefined;
        removeFromActiveOperation(state, formation.id, formation.corps_id);
        formation.status = 'inactive';
    }
}

/**
 * Displace any active formation that has location_osid in an OSID not controlled by its faction.
 * Used after attack resolution (and optionally at end of turn) to enforce invariant: no brigade in enemy territory.
 * Brigades are NEVER destroyed — they retreat with penalties.
 */
export function displaceFormationsInEnemyTerritory(
    state: GameState,
    edges: EdgeRecord[],
    reverseMap: OperationalToCanonicalReverseMap
): void {
    const adjacency = buildOsidAdjacency(edges);
    const formations = state.military.formations ?? {};
    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid];
        if (!f || f.status !== 'active') continue;
        const loc = (f as { location_osid?: string }).location_osid;
        if (!loc) continue;
        const factionId = f.faction as FactionId;
        if (getPoliticalControllerOSID(state, loc, reverseMap) === factionId) continue;
        const otherFormation = f as FormationState & { location_osid?: string; fallback_osid?: string };
        const retreatDests = getFriendlyRetreatDestinations(state, otherFormation, adjacency, reverseMap);
        const dest = retreatDests[0];
        if (dest != null) {
            // Adjacent friendly OSID — simple displacement, no penalties
            otherFormation.location_osid = dest;
            resetFormationEntrenchment(otherFormation);
        } else {
            // No adjacent friendly — emergency retreat with penalties
            forceRetreatWithPenalties(state, otherFormation, reverseMap, loc, { adjacency });
        }
    }
}

function applyPersonnelLoss(formation: FormationState, loss: number): void {
    if (typeof formation.personnel !== 'number') return;
    formation.personnel = Math.max(MIN_COMBAT_PERSONNEL, formation.personnel - loss);
}

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type AttackResolutionOsidSnapEventType =
    | 'ammo_crisis'
    | 'commander_casualty'
    | 'last_stand'
    | 'surrender_cascade'
    | 'pyrrhic_victory'
    | 'morale_absorption';

export interface AttackResolutionOsidSnapEvent {
    snap_type: AttackResolutionOsidSnapEventType;
    trigger_phase: 'pre_battle' | 'post_battle';
    attacker_brigade: FormationId;
    target_osid: Osid;
    affected_formation?: FormationId;
    description: string;
    effects: Record<string, number | string | boolean | null>;
}

export interface AttackResolutionOsidReport {
    orders_processed: number;
    unique_attack_targets: number;
    flips_applied: number;
    casualty_attacker: number;
    casualty_defender: number;
    orders_by_faction: Record<string, number>;
    engaged_formation_ids: FormationId[];
    snap_events: AttackResolutionOsidSnapEvent[];
    snap_event_counts: Partial<Record<AttackResolutionOsidSnapEventType, number>>;
    battles: Array<{
        /** Deterministic join key: {turn}:{osid}:{attacker_brigade}:{defender_brigade|null} */
        battle_id: string;
        attacker_brigade: FormationId;
        attacker_faction: FactionId;
        defender_faction: FactionId;
        target_osid: Osid;
        outcome: CombatOutcome;
        power_ratio: number;
        attacker_won: boolean;
        defender_brigade: FormationId | null;
        snap_events: AttackResolutionOsidSnapEvent[];
        /** Actual total attacker casualties (KIA+WIA+MIA) from this battle. */
        attacker_casualties: number;
        /** Actual total defender casualties (KIA+WIA+MIA) from this battle. */
        defender_casualties: number;
        /** Per-brigade defender contributions (Layer A distance-weighted). */
        defender_contributions?: DefenderContribution[];
        /** Sub-segment that defended this OSID (Phase B). */
        defending_sub_segment_id?: string;
        /** Equipment destroyed, scavenged, and captured in this battle. */
        equipment?: {
            attacker_tanks_lost: number;
            attacker_artillery_lost: number;
            defender_tanks_lost: number;
            defender_artillery_lost: number;
            scavenged_tanks: number;
            scavenged_artillery: number;
            scavenged_by?: string;
            captured_tanks: number;
            captured_artillery: number;
            captured_by?: string;
        };
    }>;
}

export interface DefenderContribution {
    brigade_id: FormationId;
    /** BFS hop distance from brigade location to battle OSID (0 = physically present). */
    distance_hops: number;
    /** Whether brigade is defending its home municipality. */
    is_home_municipality: boolean;
    /** Reactive weight used for power and casualty calculation. */
    reactive_weight: number;
    /** Casualties absorbed by this brigade in this battle. */
    casualties_taken: number;
}

function pushSnapEvent(report: AttackResolutionOsidReport, event: AttackResolutionOsidSnapEvent): void {
    report.snap_events.push(event);
    report.snap_event_counts[event.snap_type] = (report.snap_event_counts[event.snap_type] ?? 0) + 1;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main resolver
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resolve all brigade attack orders (target = OSID) for one turn.
 * Mutates state: political_controllers, formations, casualty_ledger.
 * Clears brigade_attack_orders. At most one OSID control flip per attack.
 */
export function resolveAttackOrdersOsid(
    state: GameState,
    edges: EdgeRecord[],
    reverseMap: OperationalToCanonicalReverseMap,
    terrainData?: TerrainScalarsData | null,
    supplyStateByOsid?: SupplyStateByOsidReport | null,
    osidPopulationMap?: OsidPopulationMap | null,
    ethnicComposition?: OsidEthnicComposition | null
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

    // COHA ceasefire suppresses all combat (v0.7.0 Phase 4)
    if (state.military.event_flags?.coha_active === true) return report;

    const terrainMultByOsid = buildTerrainMultByOsid(reverseMap, terrainData);
    const slopeByOsid = buildSlopeByOsid(reverseMap, terrainData);

    const currentTurn = state.meta?.turn ?? 0;
    const startDate = state.meta?.scenario_start_date;

    const orders = state.military.brigade_attack_orders;
    const adjacency = buildOsidAdjacency(edges);
    const fmts = state.military.formations ?? {};
    const allFormations = Object.keys(fmts).sort(strictCompare).map(k => fmts[k]!);
    if (!orders || typeof orders !== 'object') {
        // No orders this turn — still run displacement pass so formations left in enemy territory from a previous turn are fixed
        for (const f of allFormations) {
            if (!f || f.status !== 'active') continue;
            const loc = (f as { location_osid?: string }).location_osid;
            if (!loc) continue;
            const factionId = f.faction as FactionId;
            if (getPoliticalControllerOSID(state, loc, reverseMap) === factionId) continue;
            const otherFormation = f as FormationState & { location_osid?: string; fallback_osid?: string };
            const retreatDests = getFriendlyRetreatDestinations(state, otherFormation, adjacency, reverseMap);
            const dest = retreatDests[0];
            if (dest != null) {
                otherFormation.location_osid = dest;
                resetFormationEntrenchment(otherFormation);
            } else {
                forceRetreatWithPenalties(state, otherFormation, reverseMap, loc, { adjacency });
            }
        }
        return report;
    }

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
    for (const fid of formationIds) {
        const f = state.military.formations?.[fid];
        if (!f) continue;
        const fac = f.faction as string;
        report.orders_by_faction[fac] = (report.orders_by_faction[fac] ?? 0) + 1;
    }

    if (!state.military.casualty_ledger) {
        const factionIds = (state.factions ?? []).map(f => f.id);
        state.military.casualty_ledger = initializeCasualtyLedger(factionIds);
    }

    for (const targetOsid of targetOsids) {
        const attackerIds = targetToAttackers.get(targetOsid)!;
        if (attackerIds.length === 0) continue;

        const attackerFormations = attackerIds
            .map(id => state.military.formations?.[id])
            .filter((f): f is FormationState => f != null && f.status === 'active')
            .filter((f) => {
                const loc = (f as { location_osid?: string }).location_osid;
                if (!loc) return false;
                const neighbors = adjacency.get(loc) ?? [];
                return neighbors.includes(targetOsid);
            })
            .sort((a, b) => strictCompare(a.id, b.id));
        if (attackerFormations.length === 0) continue;

        const firstAttacker = attackerFormations[0]!;
        const attackerFaction = firstAttacker.faction as FactionId;

        // Safety gate: suppress HRHB↔RBiH combat during mobilization (belt-and-suspenders).
        // If an attack order somehow slips through (e.g. player-ordered), skip resolution.
        const targetController = getPoliticalControllerOSID(state, targetOsid, reverseMap);
        {
            const isRbihHrhbPair =
                (attackerFaction === 'RBiH' && targetController === 'HRHB') ||
                (attackerFaction === 'HRHB' && targetController === 'RBiH');
            if (isRbihHrhbPair && !isRbihHrhbCombatEnabled(state)) continue;
        }

        const defenderFormations = (allFormations as FormationState[])
            .filter(f => f.status === 'active' && (f as { location_osid?: string }).location_osid === targetOsid && f.faction !== attackerFaction)
            .sort((a, b) => strictCompare(a.id, b.id));
        const controller = targetController;
        const isEnemyControlled = controller !== null && controller !== attackerFaction;

        let defenderPower: number;
        let defenderFormation: FormationState | null = null;
        let isSectorCoverageDefense = false;
        let sectorDefenseBrigades: FormationState[] | null = null;
        // Per-brigade reactive weights for distance-weighted casualty distribution
        let sectorBrigadeWeights: Map<FormationId, number> | null = null;
        // Per-brigade metadata for defender contribution records (Layer C)
        let sectorBrigadeMeta: Map<FormationId, { hops: number; isHome: boolean }> | null = null;
        // Phase B: sub-segment responsible for defending this OSID
        let defendingSubSegmentId: string | undefined;
        const artSuppression = getArtillerySuppression(attackerFormations, attackerFaction, state);
        const ethBonus = (d: FormationState) => getEthnicDefenseBonus(getCoEthnicShare(targetOsid, d.faction, ethnicComposition));
        const pc = state.political?.political_controllers ?? {};

        // ── Distance-weighted sector defense model ───────────────────
        // Physical defenders at the OSID fight at full power.
        // Sector reserves contribute proportional to BFS distance through
        // friendly territory + home-municipality motivation bonus.
        // Casualties distributed by the same weights.
        if (isEnemyControlled) {
            const sector = findSectorForEnemyOsid(state, targetOsid, controller);
            // Phase B: identify which sub-segment is responsible for this OSID
            const defendingSubSeg = sector ? findSubSegmentForOsid(sector, targetOsid) : undefined;
            defendingSubSegmentId = defendingSubSeg?.sub_segment_id;
            const sectorBrigades = sector
                ? sector.assigned_brigade_ids
                    .map(id => state.military.formations?.[id])
                    .filter((f): f is FormationState => f != null && f.status === 'active')
                : [];
            if (sectorBrigades.length > 0) {
                const { primary, totalPower } = rankDefendersByPower(sectorBrigades, state, targetOsid, terrainMultByOsid, artSuppression, supplyStateByOsid, ethBonus);
                const avgBrigadePower = totalPower / sectorBrigades.length;
                const targetMun = munFromOsid(targetOsid);

                // Single-pass: compute per-brigade power, distance weight, and accumulate
                let physicalPower = 0;
                let effectiveReserves = 0;
                const brigadeWeights = new Map<FormationId, number>();
                const brigadeMeta = new Map<FormationId, { hops: number; isHome: boolean }>();
                for (const b of sectorBrigades) {
                    const locOsid = (b as { location_osid?: string }).location_osid ?? '';
                    const bPower = computeDefenderPower(state, b, targetOsid as Osid, terrainMultByOsid, artSuppression, supplyStateByOsid, ethBonus(b));
                    const homeMun = munFromOsid((b as { home_osid?: string }).home_osid ?? '');
                    const isHome = !!(homeMun && homeMun === targetMun);
                    const homeBonus = isHome ? HOME_DEFENSE_REACTIVE_BONUS : 1.0;

                    if (locOsid === targetOsid) {
                        // Physical defenders: full power, weight = 1.0 × homeBonus
                        physicalPower += bPower;
                        brigadeWeights.set(b.id, bPower * homeBonus);
                        brigadeMeta.set(b.id, { hops: 0, isHome });
                    } else {
                        // Reserve: distance-weighted contribution
                        const hops = bfsDistanceFriendly(locOsid, targetOsid, adjacency, pc, controller!);
                        const distWeight = getReactiveDistanceWeight(hops);
                        const contribution = bPower * distWeight * homeBonus;
                        effectiveReserves += contribution;
                        brigadeWeights.set(b.id, contribution);
                        brigadeMeta.set(b.id, { hops, isHome });
                    }
                }

                // Apply sector stance reactive bonus (Layer B)
                const stanceReactiveBonus = SECTOR_STANCE_REACTIVE_BONUS[sector?.sector_stance ?? 'defend'];
                const boostedReserves = effectiveReserves * stanceReactiveBonus;

                // Cap reactive response proportional to attack size
                const reactiveResponse = Math.min(
                    boostedReserves,
                    attackerFormations.length * avgBrigadePower * REACTIVE_DEFENSE_RATIO
                );
                defenderPower = physicalPower + reactiveResponse;
                const minFloor = avgBrigadePower * MIN_DEFENSE_FLOOR_FRACTION;
                defenderPower = Math.max(defenderPower, minFloor);
                defenderFormation = primary;
                isSectorCoverageDefense = true;
                sectorDefenseBrigades = sectorBrigades;
                sectorBrigadeWeights = brigadeWeights;
                sectorBrigadeMeta = brigadeMeta;
            } else if (defenderFormations.length > 0) {
                // Brigade at OSID but not in any sector (edge case: garrison, enclave)
                const { primary, totalPower } = rankDefendersByPower(defenderFormations, state, targetOsid, terrainMultByOsid, artSuppression, supplyStateByOsid, ethBonus);
                defenderPower = totalPower;
                defenderFormation = primary;
            } else {
                // Truly undefended: no sector, no brigade — militia ghost only
                defenderPower = (osidPopulationMap?.get(targetOsid) ?? 5000) * MILITIA_DEFENSE_RATIO * 0.25;
            }
        } else if (defenderFormations.length > 0) {
            // Non-enemy OSID with defenders (shouldn't happen, but safe fallback)
            const { primary, totalPower } = rankDefendersByPower(defenderFormations, state, targetOsid, terrainMultByOsid, artSuppression, supplyStateByOsid, ethBonus);
            defenderPower = totalPower;
            defenderFormation = primary;
        } else {
            continue;
        }

        // ── Enclave garrison bonus ──────────────────────────────────────
        // Organized civilian defense (TDF, Patriotic League, police, volunteers)
        // fights alongside regular brigades in besieged enclaves.
        // Added to ALL defense paths — even ghost militia gets reinforced.
        const garrisonPower = getEnclaveGarrisonPower(
            state, targetOsid, osidPopulationMap?.get(targetOsid) ?? 0
        );
        defenderPower += garrisonPower;

        const battleSnapEvents: AttackResolutionOsidSnapEvent[] = [];

        // Snap: Last Stand — defender has no friendly adjacent OSID to retreat to
        let lastStandCasMult = 1;
        if (defenderFormation) {
            const retreatDests = getFriendlyRetreatDestinations(state, defenderFormation, adjacency, reverseMap);
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
        const targetSlope = slopeByOsid[targetOsid] ?? 0;
        const seasonal = getSeasonalModifiers(currentTurn, startDate, targetSlope);
        const targetTerrainMult = terrainMultByOsid[targetOsid] ?? 1.0;
        const concentrationBonus = getConcentrationBonus(attackerFormations.length);
        // Formations with attack orders attack at their posture — but postures with
        // zero attack mult (defend, hold, dig_in) use 'attack' as minimum, since the
        // attack order itself implies attack intent. Preserves 'assault' (1.2×) bonus.
        const attackerPower = attackerFormations.reduce((s, a) => {
            const posture = a.posture ?? 'defend';
            const atkMult = POSTURE_ATTACK[posture] ?? 0;
            const effectivePosture = atkMult > 0 ? posture : 'attack';
            return s + computeAttackerPower(state, a, supplyStateByOsid, effectivePosture, targetTerrainMult, targetOsid);
        }, 0) * coordPenalty * seasonal.attack_mult * concentrationBonus;
        defenderPower *= seasonal.defense_mult;

        const powerRatio = defenderPower <= 0 ? 10 : attackerPower / defenderPower;
        // Snap: Surrender Cascade
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
        let outcome: CombatOutcome = surrenderCascade ? 'decisive_victory' : classifyOutcome(powerRatio);

        report.orders_processed += attackerIds.length;
        for (const a of attackerFormations) report.engaged_formation_ids.push(a.id);
        if (defenderFormation) report.engaged_formation_ids.push(defenderFormation.id);

        const personnelAttacker = attackerFormations.reduce((s, a) => s + (a.personnel ?? 0), 0);
        // Sector defense: all sector brigades contribute to the casualty base, matching
        // the fact that defense POWER aggregates the entire sector. Without this, a 5-brigade
        // sector generates massive defense power (→ catastrophic outcome for attacker) but
        // bases defender casualties on one brigade's 500 personnel → absurd 44:1 ratios.
        // In reality, the entire sector front absorbs the attack — all brigades take losses.
        // n701 fix: cap engaged defender personnel at DEFENDER_CASUALTY_ENGAGEMENT_CAP × attacker
        // personnel — applied unconditionally (was previously skipped for single-brigade sectors,
        // allowing 109 attackers to generate 900+ defender casualties from an uncapped 3,000-person
        // brigade, producing 0.07:1 att:def ratios).
        const rawPersonnelDefender = sectorDefenseBrigades && sectorDefenseBrigades.length > 0
            ? sectorDefenseBrigades.reduce((s, b) => s + (b.personnel ?? 0), 0)
            : defenderFormation ? (defenderFormation.personnel ?? 0) : 5000 * MILITIA_DEFENSE_RATIO;
        const personnelDefender = Math.min(rawPersonnelDefender, personnelAttacker * DEFENDER_CASUALTY_ENGAGEMENT_CAP);
        const bombardmentMult = getBombardmentCasualtyMult(attackerFormations, attackerFaction, state);
        // Militia-only defense: attacker takes reduced but non-trivial casualties.
        // "Undefended" Bosniak villages had Patriotic League, police, armed residents.
        // n536: raised 0.15→0.30 — sweeping a village costs more than 5 men.
        const militiaOnlyMult = defenderFormation ? 1.0 : 0.30;
        const [attCasMult, defCasMult] = getPowerRatioCasualtyMult(powerRatio);
        const baseAttackerCas = personnelAttacker * BASE_ATTACKER_LOSS_RATE * (OUTCOME_ATTACKER_MOD[outcome] ?? 1) * lastStandCasMult * militiaOnlyMult * attCasMult;
        const baseDefenderCas = personnelDefender * BASE_DEFENDER_LOSS_RATE * (OUTCOME_DEFENDER_MOD[outcome] ?? 1) * lastStandCasMult * bombardmentMult * defCasMult;
        const finalAttackerCas = Math.min(personnelAttacker - MIN_COMBAT_PERSONNEL, Math.max(0, Math.round(baseAttackerCas)));
        const finalDefenderCas = Math.min(personnelDefender, Math.max(0, Math.round(baseDefenderCas)));

        // Build defender contribution records for Layer C battle reports
        let defenderContributions: DefenderContribution[] | undefined;
        if (sectorBrigadeWeights && sectorBrigadeMeta && sectorDefenseBrigades && sectorDefenseBrigades.length > 1) {
            const totalWeight = sectorDefenseBrigades.reduce((s, b) => s + (sectorBrigadeWeights!.get(b.id) ?? 0), 0);
            defenderContributions = [];
            for (const b of sectorDefenseBrigades) {
                const w = sectorBrigadeWeights.get(b.id) ?? 0;
                const meta = sectorBrigadeMeta.get(b.id);
                const frac = totalWeight > 0 ? w / totalWeight : 1 / sectorDefenseBrigades.length;
                defenderContributions.push({
                    brigade_id: b.id,
                    distance_hops: meta?.hops ?? 0,
                    is_home_municipality: meta?.isHome ?? false,
                    reactive_weight: Math.round(w * 100) / 100,
                    casualties_taken: Math.round(finalDefenderCas * frac),
                });
            }
        }

        // Battle report pushed AFTER equipment processing (below) so it includes equipment data.
        // Collect equipment tracking variables here:
        let battleEquipAttackerTanksLost = 0, battleEquipAttackerArtLost = 0;
        let battleEquipDefenderTanksLost = 0, battleEquipDefenderArtLost = 0;
        let battleEquipScavengedTanks = 0, battleEquipScavengedArt = 0;
        let battleEquipCapturedTanks = 0, battleEquipCapturedArt = 0;
        let battleEquipScavengedBy = '' as string;
        let battleEquipCapturedBy = '' as string;

        const aKia = Math.floor(finalAttackerCas * KIA_FRACTION);
        const aWia = Math.floor(finalAttackerCas * WIA_FRACTION);
        const aMia = finalAttackerCas - aKia - aWia;
        const dKia = Math.floor(finalDefenderCas * KIA_FRACTION);
        const dWia = Math.floor(finalDefenderCas * WIA_FRACTION);
        const dMia = finalDefenderCas - dKia - dWia;

        report.casualty_attacker += finalAttackerCas;
        report.casualty_defender += finalDefenderCas;

        // Equipment loss accumulators for battlefield scavenging (summed across attacker formations)
        let totalATanksLost = 0;
        let totalAArtLost = 0;
        let totalDTanksLost = 0;
        let totalDArtLost = 0;

        for (const a of attackerFormations) {
            const frac = (a.personnel ?? 0) / Math.max(1, personnelAttacker);
            const cas = Math.round(finalAttackerCas * frac);
            applyPersonnelLoss(a, cas);
            a.cohesion = Math.max(0, Math.min(100, (a.cohesion ?? 60) + (COHESION_ATTACKER[outcome] ?? 0)));

            // Sweeping undefended territory is less exhausting than real combat but not free —
            // logistics, occupation duties, scattered resistance, and advance tempo take a toll.
            recordFormationFatigue(a, defenderFormation ? 2 : 0.5);

            // Record battle outcome for morale drift (victory boost / defeat penalty).
            (a as { recent_battle_outcome?: string }).recent_battle_outcome = outcome;

            if (outcome === 'costly_victory') (a as { disrupted_turns?: number }).disrupted_turns = 1;
            if (outcome === 'repulsed' || outcome === 'catastrophic') {
                (a as { disrupted_turns?: number }).disrupted_turns = 1;
                (a as { last_repulsed_from?: { osid: string; turn: number } }).last_repulsed_from = {
                    osid: targetOsid, turn: state.meta?.turn ?? 0
                };
            }
            recordBattleCasualties(state.military.casualty_ledger!, a.faction, a.id, {
                killed: Math.floor(cas * KIA_FRACTION),
                wounded: Math.floor(cas * WIA_FRACTION),
                missing_captured: Math.max(0, cas - Math.floor(cas * KIA_FRACTION) - Math.floor(cas * WIA_FRACTION))
            });
            // Equipment losses: minimum 1 per piece type if formation has them
            const aComp = a.composition ?? ensureBrigadeComposition(a);
            // Scarce tank protection: brigades with <10 tanks preserve them more carefully
            // (hull-down positions, indirect fire, not leading assaults). No minimum-1 loss.
            // VRS with 40 tanks loses 3+ per battle; ARBiH with 3 tanks loses 0-1.
            const aTanksLost = aComp.tanks > 0
                ? (aComp.tanks >= 10
                    ? Math.max(1, Math.round(aComp.tanks * TANK_LOSS_RATE))
                    : Math.round(aComp.tanks * TANK_LOSS_RATE * 0.5))
                : 0;
            const aArtLost = aComp.artillery > 0 ? Math.max(1, Math.round(aComp.artillery * ARTILLERY_LOSS_RATE)) : 0;
            if (aTanksLost > 0 || aArtLost > 0) {
                aComp.tanks = Math.max(0, aComp.tanks - aTanksLost);
                aComp.artillery = Math.max(0, aComp.artillery - aArtLost);
                recordEquipmentLoss(state.military.casualty_ledger!, a.faction, { tanks: aTanksLost, artillery: aArtLost });
            }
            totalATanksLost += aTanksLost;
            totalAArtLost += aArtLost;
            battleEquipAttackerTanksLost += aTanksLost;
            battleEquipAttackerArtLost += aArtLost;
        }
        if (defenderFormation) {
            // ── Distance-weighted casualty distribution ───────────────────
            // Casualties distributed proportionally to each brigade's reactive
            // weight. Physical defenders (weight 1.0 × homeBonus) take the most.
            // Distant reserves take almost nothing. No arbitrary 50/50 split.
            const defBrigades = sectorDefenseBrigades && sectorDefenseBrigades.length > 1
                ? sectorDefenseBrigades : [defenderFormation];

            if (sectorBrigadeWeights && defBrigades.length > 1) {
                // Distance-weighted distribution
                const totalWeight = defBrigades.reduce((s, b) => s + (sectorBrigadeWeights!.get(b.id) ?? 0), 0);
                for (const b of defBrigades) {
                    const w = sectorBrigadeWeights.get(b.id) ?? 0;
                    const frac = totalWeight > 0 ? w / totalWeight : 1 / defBrigades.length;
                    const cas = Math.round(finalDefenderCas * frac);
                    if (cas > 0) {
                        applyPersonnelLoss(b, cas);
                        const kia = Math.floor(cas * KIA_FRACTION);
                        const wia = Math.floor(cas * WIA_FRACTION);
                        const mia = Math.max(0, cas - kia - wia);
                        recordBattleCasualties(state.military.casualty_ledger!, b.faction, b.id, { killed: kia, wounded: wia, missing_captured: mia });
                    }
                }
            } else {
                // Single defender or no weights — all casualties to primary
                applyPersonnelLoss(defenderFormation, finalDefenderCas);
                const kia = Math.floor(finalDefenderCas * KIA_FRACTION);
                const wia = Math.floor(finalDefenderCas * WIA_FRACTION);
                const mia = Math.max(0, finalDefenderCas - kia - wia);
                recordBattleCasualties(state.military.casualty_ledger!, defenderFormation.faction, defenderFormation.id, { killed: kia, wounded: wia, missing_captured: mia });
            }

            // Apply cohesion/fatigue/morale to primary defender
            defenderFormation.cohesion = Math.max(0, Math.min(100, (defenderFormation.cohesion ?? 60) + (COHESION_DEFENDER[outcome] ?? 0)));
            recordFormationFatigue(defenderFormation, 1);

            // Record battle outcome for morale drift — defender's perspective is inverted
            (defenderFormation as { recent_battle_outcome?: string }).recent_battle_outcome =
                outcome === 'decisive_victory' ? 'catastrophic' :
                outcome === 'victory' ? 'repulsed' :
                outcome === 'costly_victory' ? 'stalemate' :
                outcome === 'stalemate' ? 'costly_victory' :
                outcome === 'repulsed' ? 'victory' :
                outcome === 'catastrophic' ? 'decisive_victory' : outcome;

            (defenderFormation as { defense_streak?: number }).defense_streak = (outcome === 'stalemate' || outcome === 'repulsed' || outcome === 'catastrophic')
                ? Math.min(MAX_RESILIENCE_STREAK, ((defenderFormation as { defense_streak?: number }).defense_streak ?? 0) + 1)
                : 0;
            const prevEntrenchment = (defenderFormation as { entrenchment_turns?: number }).entrenchment_turns ?? 0;
            (defenderFormation as { entrenchment_turns?: number }).entrenchment_turns = Math.max(0, prevEntrenchment - ENTRENCHMENT_DEGRADATION_PER_BATTLE);
            // Defender equipment losses (primary only)
            const dComp = defenderFormation.composition ?? ensureBrigadeComposition(defenderFormation);
            // Defender tank losses: half rate, and scarce tank protection (no min-1 below 10)
            const dTanksLost = dComp.tanks > 0
                ? (dComp.tanks >= 10
                    ? Math.max(1, Math.round(dComp.tanks * TANK_LOSS_RATE * 0.5))
                    : Math.round(dComp.tanks * TANK_LOSS_RATE * 0.25))
                : 0;
            const dArtLost = dComp.artillery > 0 ? Math.max(1, Math.round(dComp.artillery * ARTILLERY_LOSS_RATE * 0.5)) : 0;
            if (dTanksLost > 0 || dArtLost > 0) {
                dComp.tanks = Math.max(0, dComp.tanks - dTanksLost);
                dComp.artillery = Math.max(0, dComp.artillery - dArtLost);
                recordEquipmentLoss(state.military.casualty_ledger!, defenderFormation.faction, { tanks: dTanksLost, artillery: dArtLost });
            }
            totalDTanksLost += dTanksLost;
            totalDArtLost += dArtLost;
            battleEquipDefenderTanksLost += dTanksLost;
            battleEquipDefenderArtLost += dArtLost;
            // Snap: Commander Casualty
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

        // ── Battlefield scavenging (with fractional accumulator) ──────────────
        // Winner recovers a fraction of destroyed enemy equipment from the battlefield.
        // Uses fractional accumulator: small amounts (e.g. 0.3 tanks) accumulate across
        // battles. When ≥1.0, a whole unit is granted and the accumulator is debited.
        // This ensures scavenging works even when individual battles destroy few units.
        // Zero-sum: scavenged equipment is already destroyed — doesn't reduce the loser's count.
        const attackerLost = outcome === 'repulsed' || outcome === 'catastrophic';
        const attackerWon = outcome === 'decisive_victory' || outcome === 'victory' || outcome === 'costly_victory';

        // Helper: accumulate fractional scavenge, return whole units to grant
        const accumulateScavenge = (formation: FormationState, fracTanks: number, fracArt: number): { tanks: number; art: number } => {
            if (!formation.scavenge_accumulator) formation.scavenge_accumulator = { tanks: 0, artillery: 0 };
            const acc = formation.scavenge_accumulator;
            acc.tanks += fracTanks;
            acc.artillery += fracArt;
            const grantTanks = Math.floor(acc.tanks);
            const grantArt = Math.floor(acc.artillery);
            acc.tanks -= grantTanks;
            acc.artillery -= grantArt;
            return { tanks: grantTanks, art: grantArt };
        };

        // Both sides scavenge from the other's destroyed equipment.
        // Winner gets higher rate; loser still recovers some (the battlefield is
        // contested — knocked-out vehicles left on the field are recovered by field
        // repair teams from both sides). Historically critical: ARBiH recovered disabled
        // VRS tanks even from lost engagements.
        // Note: scavenging is from DESTROYED equipment (already removed from composition
        // above). It does NOT further reduce the loser's count — it's partial recovery
        // of equipment that would otherwise be total write-off.
        const applyScavenge = (
            recipient: FormationState,
            enemyTanksLost: number, enemyArtLost: number,
            rate: number, faction: string
        ) => {
            const comp = recipient.composition;
            if (!comp) return;
            const fracTanks = enemyTanksLost * rate;
            const fracArt = enemyArtLost * rate;
            const { tanks: scavTanks, art: scavArt } = accumulateScavenge(recipient, fracTanks, fracArt);
            if (scavTanks > 0) {
                comp.tanks += scavTanks;
                const frac = scavTanks / Math.max(1, comp.tanks);
                comp.tank_condition.degraded += frac * 0.7;
                comp.tank_condition.operational = Math.max(0, comp.tank_condition.operational - frac * 0.5);
            }
            if (scavArt > 0) {
                comp.artillery += scavArt;
                const frac = scavArt / Math.max(1, comp.artillery);
                comp.artillery_condition.degraded += frac * 0.7;
                comp.artillery_condition.operational = Math.max(0, comp.artillery_condition.operational - frac * 0.5);
            }
            battleEquipScavengedTanks += scavTanks;
            battleEquipScavengedArt += scavArt;
            if (scavTanks > 0 || scavArt > 0) battleEquipScavengedBy = faction;
        };

        if (attackerWon) {
            // Winner (attacker) scavenges from defender's destroyed equipment at high rate
            const winRate = outcome === 'decisive_victory' ? 0.20
                : outcome === 'victory' ? 0.15 : 0.10;
            applyScavenge(firstAttacker, totalDTanksLost, totalDArtLost, winRate, attackerFaction);
            // Loser (defender) recovers disabled enemy vehicles from the battlefield.
            // Rate is meaningful (15%) because the defender is on home ground — they
            // stay on the position (even if pushed back) and have time to recover
            // knocked-out tanks. Historically: ARBiH field repair teams recovered
            // disabled VRS T-55s and M-84s after every major VRS assault.
            if (defenderFormation) {
                const loseRate = 0.15;
                applyScavenge(defenderFormation, totalATanksLost, totalAArtLost, loseRate, defenderFormation.faction as string);
            }
        } else if (attackerLost) {
            // Winner (defender) scavenges from attacker's destroyed equipment at high rate
            // Defender held the field — they get everything the attacker left behind.
            if (defenderFormation) {
                const winRate = outcome === 'catastrophic' ? 0.25 : 0.15;
                applyScavenge(defenderFormation, totalATanksLost, totalAArtLost, winRate, defenderFormation.faction as string);
            }
            // Loser (attacker) retreats — minimal recovery from defender losses
            const loseRate = 0.05;
            applyScavenge(firstAttacker, totalDTanksLost, totalDArtLost, loseRate, attackerFaction);
        } else {
            // Stalemate: both sides recover from each other's losses at moderate rate
            applyScavenge(firstAttacker, totalDTanksLost, totalDArtLost, 0.08, attackerFaction);
            if (defenderFormation) {
                applyScavenge(defenderFormation, totalATanksLost, totalAArtLost, 0.08, defenderFormation.faction as string);
            }
        }

        // ── Equipment capture (from retreating/routed forces) ────────────────
        // Separate from scavenging (destroyed equipment). When one side wins,
        // the loser retreats and abandons some intact equipment on the field.
        // Capture transfers equipment from loser to winner (not destroyed — moved).
        // Decisive outcomes cause more abandonment (rout). Captured gear starts degraded.
        if (attackerWon && defenderFormation?.composition && firstAttacker.composition) {
            const captureRate = outcome === 'decisive_victory' ? 0.08
                : outcome === 'victory' ? 0.05 : 0.02;
            const dComp3 = defenderFormation.composition;
            const aComp3 = firstAttacker.composition;
            const capTanks = Math.floor(dComp3.tanks * captureRate);
            const capArt = Math.floor(dComp3.artillery * captureRate);
            if (capTanks > 0) {
                dComp3.tanks -= capTanks;
                aComp3.tanks += capTanks;
                const frac = capTanks / Math.max(1, aComp3.tanks);
                aComp3.tank_condition.degraded += frac * 0.5;
                aComp3.tank_condition.operational = Math.max(0, aComp3.tank_condition.operational - frac * 0.3);
            }
            if (capArt > 0) {
                dComp3.artillery -= capArt;
                aComp3.artillery += capArt;
                const frac = capArt / Math.max(1, aComp3.artillery);
                aComp3.artillery_condition.degraded += frac * 0.5;
                aComp3.artillery_condition.operational = Math.max(0, aComp3.artillery_condition.operational - frac * 0.3);
            }
            battleEquipCapturedTanks = capTanks;
            battleEquipCapturedArt = capArt;
            battleEquipCapturedBy = attackerFaction;
        } else if (attackerLost && defenderFormation?.composition && firstAttacker.composition) {
            // Defender captures from retreating/routed attacker — ARBiH repulsing
            // a VRS assault recovers abandoned tanks and artillery from the field.
            // Minimum 1 tank captured if attacker had 10+ tanks (disabled vehicle left
            // on the battlefield — historically common when VRS attacked ARBiH positions).
            // Zero-sum: captured equipment is removed from the attacker's composition.
            const captureRate = outcome === 'catastrophic' ? 0.12 : 0.05;
            const aComp3 = firstAttacker.composition;
            const dComp3 = defenderFormation.composition;
            const DEFENSIVE_CAPTURE_MIN_TANKS = 10; // attacker needs 10+ tanks for guaranteed capture
            const DEFENSIVE_CAPTURE_MIN_ART = 15;   // attacker needs 15+ artillery for guaranteed capture
            const rawCapTanks = aComp3.tanks * captureRate;
            const rawCapArt = aComp3.artillery * captureRate;
            const capTanks = rawCapTanks >= 1 ? Math.floor(rawCapTanks)
                : (aComp3.tanks >= DEFENSIVE_CAPTURE_MIN_TANKS ? 1 : 0);
            const capArt = rawCapArt >= 1 ? Math.floor(rawCapArt)
                : (aComp3.artillery >= DEFENSIVE_CAPTURE_MIN_ART ? 1 : 0);
            if (capTanks > 0) {
                aComp3.tanks -= capTanks;
                dComp3.tanks += capTanks;
                const frac = capTanks / Math.max(1, dComp3.tanks);
                dComp3.tank_condition.degraded += frac * 0.5;
                dComp3.tank_condition.operational = Math.max(0, dComp3.tank_condition.operational - frac * 0.3);
            }
            if (capArt > 0) {
                aComp3.artillery -= capArt;
                dComp3.artillery += capArt;
                const frac = capArt / Math.max(1, dComp3.artillery);
                dComp3.artillery_condition.degraded += frac * 0.5;
                dComp3.artillery_condition.operational = Math.max(0, dComp3.artillery_condition.operational - frac * 0.3);
            }
            battleEquipCapturedTanks = capTanks;
            battleEquipCapturedArt = capArt;
            battleEquipCapturedBy = defenderFormation.faction as string;
        }
        // ── Abandoned equipment on uncontested occupation ──────────────────
        // When a force walks into a vacated enemy OSID, it recovers some equipment
        // left behind by the retreating garrison. Historically critical for ARBiH:
        // much of their early heavy equipment came from overrunning JNA barracks
        // and abandoned VRS positions. Amount based on OSID population (proxy for
        // garrison size) and the occupying faction's equipment scarcity.
        if (!defenderFormation && firstAttacker.composition) {
            const pop = osidPopulationMap?.get(targetOsid) ?? 0;
            const defenderFaction = (controller ?? '') as string;
            // Only RS positions leave significant abandoned equipment (JNA inheritance)
            if (defenderFaction === 'RS' && pop > 500) {
                const ABANDONED_TANK_RATE = 0.0004;  // ~1 tank per 2500 pop
                const ABANDONED_ART_RATE = 0.0006;   // ~1.5 artillery per 2500 pop
                const abandonedTanks = Math.floor(pop * ABANDONED_TANK_RATE);
                const abandonedArt = Math.floor(pop * ABANDONED_ART_RATE);
                if (abandonedTanks > 0 || abandonedArt > 0) {
                    const aComp4 = firstAttacker.composition;
                    if (abandonedTanks > 0) {
                        aComp4.tanks += abandonedTanks;
                        const frac = abandonedTanks / Math.max(1, aComp4.tanks);
                        aComp4.tank_condition.degraded += frac * 0.6;
                        aComp4.tank_condition.operational = Math.max(0, aComp4.tank_condition.operational - frac * 0.4);
                    }
                    if (abandonedArt > 0) {
                        aComp4.artillery += abandonedArt;
                        const frac = abandonedArt / Math.max(1, aComp4.artillery);
                        aComp4.artillery_condition.degraded += frac * 0.6;
                        aComp4.artillery_condition.operational = Math.max(0, aComp4.artillery_condition.operational - frac * 0.4);
                    }
                    battleEquipCapturedTanks = abandonedTanks;
                    battleEquipCapturedArt = abandonedArt;
                    battleEquipCapturedBy = attackerFaction;
                }
            }
        }

        // Compute deterministic battle_id join key
        const battleId = `${currentTurn}:${targetOsid}:${firstAttacker.id}:${defenderFormation?.id ?? 'null'}`;

        // Push battle report with equipment data
        report.battles.push({
            battle_id: battleId,
            attacker_brigade: firstAttacker.id,
            attacker_faction: attackerFaction,
            defender_faction: (controller ?? attackerFaction) as FactionId,
            target_osid: targetOsid,
            outcome,
            power_ratio: powerRatio,
            attacker_won: outcome === 'decisive_victory' || outcome === 'victory' || outcome === 'costly_victory',
            defender_brigade: defenderFormation?.id ?? null,
            snap_events: battleSnapEvents,
            attacker_casualties: finalAttackerCas,
            defender_casualties: finalDefenderCas,
            defender_contributions: defenderContributions,
            defending_sub_segment_id: defendingSubSegmentId,
            equipment: {
                attacker_tanks_lost: battleEquipAttackerTanksLost,
                attacker_artillery_lost: battleEquipAttackerArtLost,
                defender_tanks_lost: battleEquipDefenderTanksLost,
                defender_artillery_lost: battleEquipDefenderArtLost,
                scavenged_tanks: battleEquipScavengedTanks,
                scavenged_artillery: battleEquipScavengedArt,
                scavenged_by: battleEquipScavengedBy || undefined,
                captured_tanks: battleEquipCapturedTanks,
                captured_artillery: battleEquipCapturedArt,
                captured_by: battleEquipCapturedBy || undefined,
            },
        });

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

        // Part 6b: Supply reserve expenditure (Phase A)
        if (state.meta.supply_reserves_enabled && state.military.general_supply_reserve && state.military.heavy_munitions_reserve) {
            deductCombatExpenditure(state, attackerFaction, attackerFormations.length, powerRatio);
            if (defenderFormation) {
                deductCombatExpenditure(state, defenderFormation.faction, 1, powerRatio * 0.5);
            }
        }

        // Part 6c: Facility combat damage (Phase B)
        if (state.meta.supply_reserves_enabled && state.military.production_facilities) {
            const osidParts = targetOsid.split(':');
            if (osidParts.length >= 2) {
                const munId = osidParts[1];
                const facilityIds = Object.keys(state.military.production_facilities).sort((a, b) => a.localeCompare(b));
                for (const fId of facilityIds) {
                    const facility = state.military.production_facilities[fId];
                    if (facility && facility.municipality_id === munId) {
                        facility.current_condition = Math.max(0, facility.current_condition - FACILITY_COMBAT_DAMAGE_RATE);
                    }
                }
            }
        }

        // Part 7a: Experience gain
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

        // Officer quality loss from casualties
        const applyOfficerLoss = (f: FormationState, cas: number, totalPersonnel: number) => {
            if (f.officer_quality === undefined) return;
            if (totalPersonnel <= 0) return;
            const casualtyRatio = cas / totalPersonnel;
            const officerLoss = casualtyRatio * OFFICER_CASUALTY_MULT * (1.0 - f.officer_quality * 0.3);
            f.officer_quality = Math.max(OFFICER_QUALITY_FLOOR, f.officer_quality - officerLoss);
        };
        for (const a of attackerFormations) {
            const frac = (a.personnel ?? 0) / Math.max(1, personnelAttacker);
            const cas = Math.round(finalAttackerCas * frac);
            applyOfficerLoss(a, cas, a.personnel ?? 0);
        }
        if (defenderFormation) {
            applyOfficerLoss(defenderFormation, finalDefenderCas, personnelDefender);
        }

        let flip = outcome === 'decisive_victory' || outcome === 'victory' || outcome === 'costly_victory';

        // === MORALE-BASED RETREAT RESISTANCE ===
        let moraleAbsorbed = false;
        const defenderFaction = defenderFormation?.faction as string ?? '';
        if (defenderFormation) {
            const defMorale = defenderFormation.morale ?? 60;
            const resistFloor = getMoraleResistFloor(defenderFaction);
            const coEthnicShare = getCoEthnicShare(targetOsid, defenderFaction, ethnicComposition);
            // Enclave capital last stand: defenders at the capital absorb ALL outcomes
            // except decisive_victory. BB2 p.479: "hung on at Gradina — the key to ARBiH defenses."
            const capitalLastStand = isEnclaveCapital(targetOsid);
            // ARBiH homeland defense: fighters refuse to retreat even under heavy losses.
            // n536: In co-ethnic homeland (≥50%), absorb ALL outcomes including decisive_victory
            // when morale ≥ 40. ARBiH didn't retreat from their villages — they stood and died,
            // and the VRS paid in blood for every meter. This is the Bosnian War's defining
            // characteristic. Both sides bleed (MORALE_ABSORPTION_CAS_MULT applies).
            // At morale < 40, absorb costly_victory + victory only (exhaustion sets in).
            const homelandLastStand = defenderFaction === 'RBiH' && coEthnicShare >= 0.50;
            // n537: morale 40 too aggressive (4/6 fail). n538: morale 55 still too aggressive (3/6 fail).
            // n539: morale 65 — only fresh, high-morale defenders absorb decisive_victory.
            // As morale degrades from repeated attacks, defenders eventually break.
            // This models the historical pattern: initial resistance is fierce, but sustained
            // VRS pressure eventually overruns positions through attrition.
            const homelandAbsorbDecisive = homelandLastStand && defMorale >= 65;
            // All factions: any defender absorbs costly_victory at morale ≥ floor.
            // n536: RS/HRHB also absorb 'victory' at high morale — professional forces
            // don't retreat from a single costly engagement.
            const professionalResilience = defMorale >= resistFloor
                && (outcome === 'costly_victory' || outcome === 'victory');
            const absorb = capitalLastStand
                ? (outcome !== 'decisive_victory')
                : homelandAbsorbDecisive
                    ? (outcome === 'decisive_victory' || outcome === 'victory' || outcome === 'costly_victory')
                    : homelandLastStand
                        ? (outcome === 'costly_victory' || outcome === 'victory')
                        : professionalResilience;
            if (absorb && flip) {
                flip = false;
                moraleAbsorbed = true;
                defenderFormation.morale = Math.max(0, defMorale - 5);
                const ev: AttackResolutionOsidSnapEvent = {
                    snap_type: 'morale_absorption',
                    trigger_phase: 'post_battle',
                    attacker_brigade: firstAttacker.id,
                    target_osid: targetOsid,
                    affected_formation: defenderFormation.id,
                    description: capitalLastStand
                        ? 'Enclave capital last stand — defenders fight to the last.'
                        : homelandAbsorbDecisive
                            ? 'ARBiH homeland determination — refused to abandon homes, both sides bled.'
                            : homelandLastStand
                                ? 'ARBiH homeland last stand — absorbed defeat without retreating.'
                                : 'Defender morale held — absorbed attack without retreating.',
                    effects: { flip_prevented: true, morale_drain: -5 },
                };
                battleSnapEvents.push(ev);
                pushSnapEvent(report, ev);
            }
        }

        // === HOMELAND DETERMINATION: Extra casualties when morale absorption triggers ===
        if (moraleAbsorbed && defenderFormation) {
            const extraMult = MORALE_ABSORPTION_CAS_MULT - 1.0;
            const extraAttackerTotal = Math.round(finalAttackerCas * extraMult);
            if (extraAttackerTotal > 0) {
                for (const a of attackerFormations) {
                    const frac = (a.personnel ?? 0) / Math.max(1, personnelAttacker);
                    const extraCas = Math.min(Math.max(0, (a.personnel ?? 0) - MIN_COMBAT_PERSONNEL), Math.round(extraAttackerTotal * frac));
                    if (extraCas > 0) {
                        applyPersonnelLoss(a, extraCas);
                        report.casualty_attacker += extraCas;
                        recordBattleCasualties(state.military.casualty_ledger!, a.faction, a.id, {
                            killed: Math.floor(extraCas * KIA_FRACTION),
                            wounded: Math.floor(extraCas * WIA_FRACTION),
                            missing_captured: Math.max(0, extraCas - Math.floor(extraCas * KIA_FRACTION) - Math.floor(extraCas * WIA_FRACTION))
                        });
                    }
                }
            }
            const extraDefenderTotal = Math.min(
                Math.max(0, (defenderFormation.personnel ?? 0) - MIN_COMBAT_PERSONNEL),
                Math.round(finalDefenderCas * extraMult)
            );
            if (extraDefenderTotal > 0) {
                applyPersonnelLoss(defenderFormation, extraDefenderTotal);
                report.casualty_defender += extraDefenderTotal;
                recordBattleCasualties(state.military.casualty_ledger!, defenderFormation.faction, defenderFormation.id, {
                    killed: Math.floor(extraDefenderTotal * KIA_FRACTION),
                    wounded: Math.floor(extraDefenderTotal * WIA_FRACTION),
                    missing_captured: Math.max(0, extraDefenderTotal - Math.floor(extraDefenderTotal * KIA_FRACTION) - Math.floor(extraDefenderTotal * WIA_FRACTION))
                });
            }
        }

        if (flip) {
            if (!state.political.political_controllers) state.political.political_controllers = {};
            const prevController = state.political.political_controllers[targetOsid] ?? null;
            state.political.political_controllers[targetOsid] = attackerFaction;
            report.flips_applied += 1;
            // Record control event for GUI battle markers (does not affect simulation logic).
            (state.political.control_events ??= []).push({
                turn: state.meta?.turn ?? 0,
                settlement_id: targetOsid,
                mechanism: 'combat',
                from: prevController,
                to: attackerFaction,
                mun_id: targetOsid.split(':')[1] ?? undefined,
                battle_id: battleId,
                attacker_brigade: firstAttacker.id as string,
            } satisfies ControlEvent);
        }

        // ── Increment operation combat feedback counters ──────────────
        // Find the attacker's active corps operation (if any) and update
        // per-turn and cumulative battle/territory counters.
        const attackerCorpsId = firstAttacker.corps_id;
        if (attackerCorpsId && state.military.corps_command) {
            const attackerCmd = state.military.corps_command[attackerCorpsId];
            const activeOp = attackerCmd?.active_operation;
            if (activeOp && activeOp.phase === 'execution') {
                activeOp.battles_this_turn = (activeOp.battles_this_turn ?? 0) + 1;
                activeOp.total_battles = (activeOp.total_battles ?? 0) + 1;
                if (flip) {
                    activeOp.territory_gained_this_turn = (activeOp.territory_gained_this_turn ?? 0) + 1;
                    activeOp.total_territory_gained = (activeOp.total_territory_gained ?? 0) + 1;
                }
            }
        }

        // ── AAR narrative queue ───────────────────────────────────────
        // Enqueue significant battles for async narrative generation.
        // Significance: decisive/catastrophic outcome, OR territory flip, OR ≥200 total casualties.
        // Guard: skip in cadet mode (no AI client).
        if ((state.meta as any).ai_commander_config?.mode !== 'cadet') {
            const aarTotalCas = finalAttackerCas + finalDefenderCas;
            const aarSignificant =
                outcome === 'decisive_victory' ||
                outcome === 'catastrophic' ||
                flip ||
                aarTotalCas >= 200;
            if (aarSignificant && attackerCorpsId) {
                (state.military.narrative_queue ??= []).push({
                    faction: attackerFaction as FactionId,
                    corpsId: attackerCorpsId,
                    input: {
                        officerName: 'Corps Commander',
                        faction: attackerFaction as FactionId,
                        corpsId: attackerCorpsId,
                        targetOsid,
                        outcome,
                        attackerCasualties: finalAttackerCas,
                        defenderCasualties: finalDefenderCas,
                        attackerBrigades: attackerFormations.map(a => a.id),
                        defenderBrigades: defenderFormation ? [defenderFormation.id] : [],
                        territoryChanged: flip,
                    },
                });
            }
        }

        if (flip && defenderFormation) {
            // Sector-coverage defenders are physically at a DIFFERENT OSID than the
            // target — they project defense across the front line. When the target
            // flips, only physically present defenders should be displaced. Moving a
            // sector-coverage defender would vacate their actual OSID, creating a
            // walk-in opportunity for the enemy (the Gradačac bug).
            const isPhysicalDefender = defenderFormation.location_osid === targetOsid;

            if (isPhysicalDefender) {
                const retreatDests = surrenderCascade ? [] : getFriendlyRetreatDestinations(state, defenderFormation, adjacency, reverseMap);
                const dest = retreatDests[0];
                if (dest != null) {
                    (defenderFormation as { location_osid?: string }).location_osid = dest;
                    applyDefeatPenalties(defenderFormation, targetOsid, state.meta?.turn ?? 0, outcome);
                } else {
                    forceRetreatWithPenalties(state, defenderFormation, reverseMap, targetOsid, { adjacency });
                }
            } else {
                // Sector-coverage defender: DO NOT change location_osid.
                // Apply morale/disruption penalties at their current position —
                // losing a covered OSID is demoralizing and disrupts the formation,
                // but the brigade stays where it physically is.
                applyDefeatPenalties(defenderFormation, targetOsid, state.meta?.turn ?? 0, outcome);
            }
        }

        // === POST-BATTLE MORALE EFFECTS ===
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

        if (flip) {
            const advanceFormation = attackerFormations[0];
            if (advanceFormation) {
                (advanceFormation as { location_osid?: string }).location_osid = targetOsid;
                (advanceFormation as { entrenchment_turns?: number }).entrenchment_turns = 0;
            }
            // Displace any other formations still in the flipped OSID (invariant: no brigade in enemy territory)
            const formations = state.military.formations ?? {};
            for (const fid of Object.keys(formations).sort(strictCompare)) {
                const f = formations[fid];
                if (!f || f.status !== 'active' || (f as { location_osid?: string }).location_osid !== targetOsid) continue;
                if (f.faction === attackerFaction) continue;
                const otherFormation = f as FormationState & { location_osid?: string; fallback_osid?: string };
                const retreatDests = getFriendlyRetreatDestinations(state, otherFormation, adjacency, reverseMap);
                const dest = retreatDests[0];
                if (dest != null) {
                    otherFormation.location_osid = dest;
                    resetFormationEntrenchment(otherFormation);
                } else {
                    forceRetreatWithPenalties(state, otherFormation, reverseMap, targetOsid, { adjacency });
                }
            }
        }

        // === BRIGADE HISTORY RECORDING ===
        const defFaction = (controller ?? attackerFaction) as FactionId;
        const isConcentrated = attackerFormations.length > 1;
        // Attacker: destroyed defender equipment, captured from defender
        const attackerEquipData = {
            destroyed: { tanks: battleEquipDefenderTanksLost, artillery: battleEquipDefenderArtLost },
            captured: { tanks: battleEquipCapturedBy === attackerFaction ? battleEquipCapturedTanks : 0,
                        artillery: battleEquipCapturedBy === attackerFaction ? battleEquipCapturedArt : 0 },
        };
        recordAttackerEngagements(
            attackerFormations, currentTurn, targetOsid, outcome,
            defFaction, flip, finalAttackerCas, finalDefenderCas, isConcentrated, state,
            attackerEquipData, battleId,
        );
        if (defenderFormation) {
            const defenderGroup = sectorDefenseBrigades && sectorDefenseBrigades.length > 1
                ? [...sectorDefenseBrigades].sort((a, b) => strictCompare(a.id, b.id))
                : [defenderFormation];
            if (defenderGroup.length > 1 && sectorBrigadeWeights) {
                const weightById = new Map<string, number>();
                for (const b of defenderGroup) weightById.set(b.id, sectorBrigadeWeights.get(b.id) ?? 0);
                const takenById = allocateIntegerByWeights(
                    defenderGroup.map(b => b.id),
                    finalDefenderCas,
                    weightById
                );
                const inflictedById = allocateIntegerByWeights(
                    defenderGroup.map(b => b.id),
                    finalAttackerCas,
                    weightById
                );
                for (const b of defenderGroup) {
                    const defenderEquipData = {
                        destroyed: { tanks: 0, artillery: 0 },
                        captured: { tanks: 0, artillery: 0 },
                    };
                    recordDefenderEngagement(
                        b, currentTurn, targetOsid, outcome,
                        attackerFaction, flip, takenById.get(b.id) ?? 0, inflictedById.get(b.id) ?? 0, isConcentrated, state,
                        defenderEquipData, battleId,
                    );
                }
            } else {
                // Single/primary defender path keeps equipment accounting attached here.
                const defenderEquipData = {
                    destroyed: { tanks: battleEquipAttackerTanksLost, artillery: battleEquipAttackerArtLost },
                    captured: { tanks: battleEquipCapturedBy === (defenderFormation.faction as string) ? battleEquipCapturedTanks : 0,
                                artillery: battleEquipCapturedBy === (defenderFormation.faction as string) ? battleEquipCapturedArt : 0 },
                };
                recordDefenderEngagement(
                    defenderFormation, currentTurn, targetOsid, outcome,
                    attackerFaction, flip, finalDefenderCas, finalAttackerCas, isConcentrated, state,
                    defenderEquipData, battleId,
                );
            }
        }

        // === SECTOR INTEL: RECON BY FORCE ===
        updateSectorIntelFromCombat(state, attackerFormations[0].location_osid ?? targetOsid, targetOsid, currentTurn);

        // === COMBAT FATIGUE ===
        // Attackers accumulate +2 fatigue per battle; defender +1.
        // Fatigue is reduced by recovery each turn (see formation_fatigue.ts).
        const FATIGUE_ATTACKER = 2;
        const FATIGUE_DEFENDER = 1;
        for (const af of attackerFormations) {
            if (!af.ops) af.ops = { fatigue: 0, last_supplied_turn: null };
            af.ops.fatigue = Math.min(FATIGUE_MAX, (af.ops.fatigue ?? 0) + FATIGUE_ATTACKER);
        }
        if (defenderFormation) {
            if (!defenderFormation.ops) defenderFormation.ops = { fatigue: 0, last_supplied_turn: null };
            defenderFormation.ops.fatigue = Math.min(FATIGUE_MAX, (defenderFormation.ops.fatigue ?? 0) + FATIGUE_DEFENDER);
        }
    }

    // Final pass: displace any formation still in enemy territory (e.g. moved to an OSID that flipped in a later battle this turn)
    const formations = state.military.formations ?? {};
    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid];
        if (!f || f.status !== 'active') continue;
        const loc = (f as { location_osid?: string }).location_osid;
        if (!loc) continue;
        const factionId = f.faction as FactionId;
        const controller = getPoliticalControllerOSID(state, loc, reverseMap);
        if (controller === factionId) continue;
        const otherFormation = f as FormationState & { location_osid?: string; fallback_osid?: string };
        const retreatDests = getFriendlyRetreatDestinations(state, otherFormation, adjacency, reverseMap);
        const dest = retreatDests[0];
        if (dest != null) {
            otherFormation.location_osid = dest;
            resetFormationEntrenchment(otherFormation);
        } else {
            forceRetreatWithPenalties(state, otherFormation, reverseMap, loc, { adjacency });
        }
    }

    report.snap_events.sort((a, b) => {
        if (a.target_osid !== b.target_osid) return strictCompare(a.target_osid, b.target_osid);
        if (a.attacker_brigade !== b.attacker_brigade) return strictCompare(a.attacker_brigade, b.attacker_brigade);
        if (a.snap_type !== b.snap_type) return strictCompare(a.snap_type, b.snap_type);
        return strictCompare(a.trigger_phase, b.trigger_phase);
    });
    state.military.brigade_attack_orders = undefined;
    // (defense path logging removed)
    return report;
}
