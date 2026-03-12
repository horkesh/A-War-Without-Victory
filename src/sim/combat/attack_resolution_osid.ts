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
    type Osid
} from './osid_adjacency.js';
import {
    type OsidEthnicComposition,
    getCoEthnicShare,
    getEthnicDefenseBonus,
} from './ethnic_defense.js';

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
    SECTOR_RESERVE_RESPONSE_FRACTION,
    REACTIVE_DEFENSE_RATIO,
} from './combat_math.js';
import { OFFICER_CASUALTY_MULT, OFFICER_QUALITY_FLOOR } from './officer_quality_update.js';
import { findSectorForEnemyOsid, getCorpsHqOsid } from './corps_front_sectors.js';
import { getEnclaveGarrisonPower, getEnclaveCapitalOsid, isEnclaveCapital, isOsidInSameEnclave } from './enclave_resilience.js';
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

/**
 * Power multiplier applied when sector brigades defend an OSID they are not physically at.
 * Reflects that a brigade spread across multiple front edges cannot concentrate at one point.
 * Combined with the sector's frontDensityModifier: thin sectors defend weakly, dense ones better.
 */
const SECTOR_COVERAGE_PENALTY = 0.5;

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
        const isEnclaveBrigade = formation.tags?.includes('enclave') === true;
        if (isEnclaveBrigade) {
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
    const f = formation as FormationState & { location_osid?: string; entrenchment_turns?: number; defense_streak?: number; disrupted_turns?: number; last_retreat_from?: { osid: string; turn: number } };
    if (dest != null) {
        f.location_osid = dest;
        f.entrenchment_turns = 0;
        f.defense_streak = 0;
        f.disrupted_turns = disruptedTurns;
        formation.cohesion = Math.max(0, (formation.cohesion ?? 60) - cohesionLoss);
        formation.personnel = Math.max(MIN_COMBAT_PERSONNEL, Math.floor((formation.personnel ?? 0) * personnelRetain));
        f.last_retreat_from = { osid: sourceOsid, turn: state.meta?.turn ?? 0 };
    } else {
        // Absolute last resort: no friendly territory exists at all — brigade disperses
        // This should only happen if the entire faction's territory is lost
        f.location_osid = undefined;
        f.entrenchment_turns = 0;
        f.defense_streak = 0;
        f.disrupted_turns = disruptedTurns;
        formation.cohesion = Math.max(0, (formation.cohesion ?? 60) - cohesionLoss);
        formation.personnel = Math.max(MIN_COMBAT_PERSONNEL, Math.floor((formation.personnel ?? 0) * personnelRetain));
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
            (otherFormation as { entrenchment_turns?: number }).entrenchment_turns = 0;
            (otherFormation as { defense_streak?: number }).defense_streak = 0;
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
    }>;
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
                (otherFormation as { entrenchment_turns?: number }).entrenchment_turns = 0;
                (otherFormation as { defense_streak?: number }).defense_streak = 0;
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
            .filter((f): f is FormationState => f != null && f.status === 'active');
        if (attackerFormations.length === 0) continue;

        const firstAttacker = attackerFormations[0]!;
        const attackerFaction = firstAttacker.faction as FactionId;
        const attackerLoc = (firstAttacker as { location_osid?: string }).location_osid;
        if (!attackerLoc) continue;
        const neighbors = adjacency.get(attackerLoc) ?? [];
        if (!neighbors.includes(targetOsid)) continue;

        const defenderFormations = (allFormations as FormationState[])
            .filter(f => f.status === 'active' && (f as { location_osid?: string }).location_osid === targetOsid && f.faction !== attackerFaction)
            .sort((a, b) => strictCompare(a.id, b.id));
        const controller = getPoliticalControllerOSID(state, targetOsid, reverseMap);
        const isEnemyControlled = controller !== null && controller !== attackerFaction;

        let defenderPower: number;
        let defenderFormation: FormationState | null = null;
        let isSectorCoverageDefense = false;
        let sectorDefenseBrigades: FormationState[] | null = null;
        const artSuppression = getArtillerySuppression(attackerFormations, attackerFaction, state);
        const ethBonus = (d: FormationState) => getEthnicDefenseBonus(getCoEthnicShare(targetOsid, d.faction, ethnicComposition));

        // ── Unified sector defense model ──────────────────────────────
        // The front is a continuous locked line. Defense at any OSID in a
        // sector is: total sector brigade power / sector edges × density mod.
        // Whether a specific brigade sits on this OSID or not is irrelevant —
        // the line distributes force evenly. Casualties go to the closest
        // brigade primarily, then proportionally to the rest.
        if (isEnemyControlled) {
            const sector = findSectorForEnemyOsid(state, targetOsid, controller);
            const sectorBrigades = sector
                ? sector.assigned_brigade_ids
                    .map(id => state.military.formations?.[id])
                    .filter((f): f is FormationState => f != null && f.status === 'active')
                : [];
            // (defense path tracking removed — use _defPathCounts diagnostic if needed)
            if (sectorBrigades.length > 0) {
                // Hybrid sector defense:
                // 1. Physical defenders at the OSID fight at full power
                // 2. Sector reserve responds proportional to attack pressure
                // 3. Floor: continuous line guarantees minimum defense per edge
                const { primary, totalPower } = rankDefendersByPower(sectorBrigades, state, targetOsid, terrainMultByOsid, artSuppression, supplyStateByOsid, ethBonus);
                // Physical defenders: brigades at the attacked OSID
                const physicalDefenders = sectorBrigades.filter(
                    f => (f as { location_osid?: string }).location_osid === targetOsid
                );
                let physicalPower = 0;
                for (const pd of physicalDefenders) {
                    physicalPower += computeDefenderPower(state, pd, targetOsid as Osid, terrainMultByOsid, artSuppression, supplyStateByOsid, ethBonus(pd));
                }
                // Reactive defense: reserves mobilize proportional to attack size.
                // A 3-brigade assault draws more reserves than a 1-brigade probe.
                const avgBrigadePower = totalPower / sectorBrigades.length;
                const sectorReserves = totalPower - physicalPower;
                const reactiveResponse = Math.min(
                    sectorReserves,
                    attackerFormations.length * avgBrigadePower * REACTIVE_DEFENSE_RATIO
                );
                defenderPower = physicalPower + reactiveResponse;
                const minFloor = avgBrigadePower * MIN_DEFENSE_FLOOR_FRACTION;
                defenderPower = Math.max(defenderPower, minFloor);
                defenderFormation = primary;
                isSectorCoverageDefense = true;
                sectorDefenseBrigades = sectorBrigades;
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
        const personnelDefender = sectorDefenseBrigades && sectorDefenseBrigades.length > 1
            ? sectorDefenseBrigades.reduce((s, b) => s + (b.personnel ?? 0), 0)
            : defenderFormation ? (defenderFormation.personnel ?? 0) : 5000 * MILITIA_DEFENSE_RATIO;
        const bombardmentMult = getBombardmentCasualtyMult(attackerFormations, attackerFaction, state);
        // Militia-only defense: attacker takes reduced but non-trivial casualties.
        // "Undefended" Bosniak villages had Patriotic League, police, armed residents.
        // n536: raised 0.15→0.30 — sweeping a village costs more than 5 men.
        const militiaOnlyMult = defenderFormation ? 1.0 : 0.30;
        const [, defCasMult] = getPowerRatioCasualtyMult(powerRatio);
        const baseAttackerCas = personnelAttacker * BASE_ATTACKER_LOSS_RATE * (OUTCOME_ATTACKER_MOD[outcome] ?? 1) * lastStandCasMult * militiaOnlyMult;
        const baseDefenderCas = personnelDefender * BASE_DEFENDER_LOSS_RATE * (OUTCOME_DEFENDER_MOD[outcome] ?? 1) * lastStandCasMult * bombardmentMult * defCasMult;
        const finalAttackerCas = Math.min(personnelAttacker - MIN_COMBAT_PERSONNEL, Math.max(0, Math.round(baseAttackerCas)));
        const finalDefenderCas = Math.min(personnelDefender, Math.max(0, Math.round(baseDefenderCas)));

        report.battles.push({
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
        });

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
            const aTanksLost = aComp.tanks > 0 ? Math.max(1, Math.round(aComp.tanks * TANK_LOSS_RATE)) : 0;
            const aArtLost = aComp.artillery > 0 ? Math.max(1, Math.round(aComp.artillery * ARTILLERY_LOSS_RATE)) : 0;
            if (aTanksLost > 0 || aArtLost > 0) {
                aComp.tanks = Math.max(0, aComp.tanks - aTanksLost);
                aComp.artillery = Math.max(0, aComp.artillery - aArtLost);
                recordEquipmentLoss(state.military.casualty_ledger!, a.faction, { tanks: aTanksLost, artillery: aArtLost });
            }
        }
        if (defenderFormation) {
            // ── Sector casualty distribution ──────────────────────────────
            // When the defense is a continuous sector line, casualties are
            // distributed across all brigades in the sector. The closest
            // brigade (primary) takes 50%, the rest share 50% proportionally
            // by personnel. This models the front absorbing the blow.
            const defBrigades = sectorDefenseBrigades && sectorDefenseBrigades.length > 1
                ? sectorDefenseBrigades : [defenderFormation];
            const primaryShare = defBrigades.length > 1 ? 0.5 : 1.0;
            const secondaryPool = finalDefenderCas * (1 - primaryShare);
            const primaryCas = Math.round(finalDefenderCas * primaryShare);

            // Apply to primary (closest) brigade
            applyPersonnelLoss(defenderFormation, primaryCas);
            const primaryKia = Math.floor(primaryCas * KIA_FRACTION);
            const primaryWia = Math.floor(primaryCas * WIA_FRACTION);
            const primaryMia = Math.max(0, primaryCas - primaryKia - primaryWia);
            recordBattleCasualties(state.military.casualty_ledger!, defenderFormation.faction, defenderFormation.id, { killed: primaryKia, wounded: primaryWia, missing_captured: primaryMia });

            // Apply to secondary brigades (rest of sector)
            if (defBrigades.length > 1) {
                const secondaries = defBrigades.filter(b => b.id !== defenderFormation!.id);
                const totalSecPers = secondaries.reduce((s, b) => s + (b.personnel ?? 0), 0);
                for (const sec of secondaries) {
                    const frac = totalSecPers > 0 ? (sec.personnel ?? 0) / totalSecPers : 1 / secondaries.length;
                    const secCas = Math.round(secondaryPool * frac);
                    if (secCas > 0) {
                        applyPersonnelLoss(sec, secCas);
                        const sKia = Math.floor(secCas * KIA_FRACTION);
                        const sWia = Math.floor(secCas * WIA_FRACTION);
                        const sMia = Math.max(0, secCas - sKia - sWia);
                        recordBattleCasualties(state.military.casualty_ledger!, sec.faction, sec.id, { killed: sKia, wounded: sWia, missing_captured: sMia });
                    }
                }
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
            const dTanksLost = dComp.tanks > 0 ? Math.max(1, Math.round(dComp.tanks * TANK_LOSS_RATE * 0.5)) : 0;
            const dArtLost = dComp.artillery > 0 ? Math.max(1, Math.round(dComp.artillery * ARTILLERY_LOSS_RATE * 0.5)) : 0;
            if (dTanksLost > 0 || dArtLost > 0) {
                dComp.tanks = Math.max(0, dComp.tanks - dTanksLost);
                dComp.artillery = Math.max(0, dComp.artillery - dArtLost);
                recordEquipmentLoss(state.military.casualty_ledger!, defenderFormation.faction, { tanks: dTanksLost, artillery: dArtLost });
            }
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

        // Snap: Ammunition Crisis / Pyrrhic Victory
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
            } satisfies ControlEvent);
        }

        if (flip && defenderFormation) {
            const retreatDests = surrenderCascade ? [] : getFriendlyRetreatDestinations(state, defenderFormation, adjacency, reverseMap);
            const dest = retreatDests[0];
            if (dest != null) {
                // Adjacent friendly OSID — standard retreat
                (defenderFormation as { location_osid?: string }).location_osid = dest;
                (defenderFormation as { entrenchment_turns?: number }).entrenchment_turns = 0;
                (defenderFormation as { defense_streak?: number }).defense_streak = 0;
                (defenderFormation as { last_retreat_from?: { osid: string; turn: number } }).last_retreat_from = {
                    osid: targetOsid, turn: state.meta?.turn ?? 0
                };
                if (outcome === 'decisive_victory') (defenderFormation as { disrupted_turns?: number }).disrupted_turns = 2;
                else if (outcome === 'victory') (defenderFormation as { disrupted_turns?: number }).disrupted_turns = 1;
            } else if (isSectorCoverageDefense) {
                // Sector-coverage defenders with no adjacent retreat — rout with heavy penalties
                forceRetreatWithPenalties(state, defenderFormation, reverseMap, targetOsid, {
                    personnelRetain: SECTOR_ROUT_PERSONNEL_RETAIN,
                    cohesionLoss: SECTOR_ROUT_COHESION_LOSS,
                    disruptedTurns: SECTOR_ROUT_DISRUPTED_TURNS,
                    adjacency,
                });
            } else {
                // Direct defender with no adjacent retreat — emergency retreat with penalties
                forceRetreatWithPenalties(state, defenderFormation, reverseMap, targetOsid, { adjacency });
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
                    (otherFormation as { entrenchment_turns?: number }).entrenchment_turns = 0;
                    (otherFormation as { defense_streak?: number }).defense_streak = 0;
                } else {
                    forceRetreatWithPenalties(state, otherFormation, reverseMap, targetOsid, { adjacency });
                }
            }
        }

        // === BRIGADE HISTORY RECORDING ===
        const defFaction = (controller ?? attackerFaction) as FactionId;
        const isConcentrated = attackerFormations.length > 1;
        recordAttackerEngagements(
            attackerFormations, currentTurn, targetOsid, outcome,
            defFaction, flip, finalAttackerCas, finalDefenderCas, isConcentrated,
        );
        if (defenderFormation) {
            recordDefenderEngagement(
                defenderFormation, currentTurn, targetOsid, outcome,
                attackerFaction, flip, finalDefenderCas, finalAttackerCas, isConcentrated,
            );
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
            (otherFormation as { entrenchment_turns?: number }).entrenchment_turns = 0;
            (otherFormation as { defense_streak?: number }).defense_streak = 0;
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
