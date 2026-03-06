/**
 * Phase II: OSID-based attack resolution per Attack Resolution Formula Spec.
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
    recordBattleCasualties
} from '../../state/casualty_ledger.js';
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
    OUTCOME_ATTACKER_MOD,
    OUTCOME_DEFENDER_MOD,
    COHESION_ATTACKER,
    COHESION_DEFENDER,
    // Functions
    getMoraleResistFloor,
    getArtillerySuppression,
    getBombardmentCasualtyMult,
    getSupplyMult,
    classifyOutcome,
    computeAttackerPower,
    computeDefenderPower,
    buildTerrainMultByOsid,
    // Re-exported for test consumers
    getEquipmentRatio,
    getToTerrainDefenseMult,
    rankDefendersByPower,
} from './combat_math.js';
import { OFFICER_CASUALTY_MULT, OFFICER_QUALITY_FLOOR } from './officer_quality_update.js';
import { findSectorForEnemyOsid, getCorpsHqOsid } from './corps_front_sectors.js';
import { frontDensityModifier } from './local_front_defense.js';

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
const MORALE_ABSORPTION_CAS_MULT = 1.35;

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
    const friendly: Osid[] = [];
    for (const n of neighbors) {
        const c = getPoliticalControllerOSID(state, n, reverseMap);
        if (c === factionId) friendly.push(n);
    }
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
    return friendly;
}

/**
 * Displace any active formation that has location_osid in an OSID not controlled by its faction.
 * Used after attack resolution (and optionally at end of turn) to enforce invariant: no brigade in enemy territory.
 */
export function displaceFormationsInEnemyTerritory(
    state: GameState,
    edges: EdgeRecord[],
    reverseMap: OperationalToCanonicalReverseMap
): void {
    const adjacency = buildOsidAdjacency(edges);
    const formations = state.formations ?? {};
    for (const f of Object.values(formations)) {
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
        } else if (otherFormation.fallback_osid && getPoliticalControllerOSID(state, otherFormation.fallback_osid, reverseMap) === factionId) {
            otherFormation.location_osid = otherFormation.fallback_osid;
            (otherFormation as { entrenchment_turns?: number }).entrenchment_turns = 0;
            (otherFormation as { defense_streak?: number }).defense_streak = 0;
        } else {
            otherFormation.personnel = 0;
            otherFormation.status = 'inactive';
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

    const orders = state.brigade_attack_orders;
    const adjacency = buildOsidAdjacency(edges);
    const allFormations = Object.values(state.formations ?? {});
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
            } else if (otherFormation.fallback_osid && getPoliticalControllerOSID(state, otherFormation.fallback_osid, reverseMap) === factionId) {
                otherFormation.location_osid = otherFormation.fallback_osid;
                (otherFormation as { entrenchment_turns?: number }).entrenchment_turns = 0;
                (otherFormation as { defense_streak?: number }).defense_streak = 0;
            } else {
                otherFormation.personnel = 0;
                otherFormation.status = 'inactive';
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

        const defenderFormations = (allFormations as FormationState[])
            .filter(f => f.status === 'active' && (f as { location_osid?: string }).location_osid === targetOsid && f.faction !== attackerFaction)
            .sort((a, b) => strictCompare(a.id, b.id));
        const controller = getPoliticalControllerOSID(state, targetOsid, reverseMap);
        const isEnemyControlled = controller !== null && controller !== attackerFaction;

        let defenderPower: number;
        let defenderFormation: FormationState | null = null;
        let isSectorCoverageDefense = false;
        const artSuppression = getArtillerySuppression(attackerFormations, attackerFaction, state);
        const ethBonus = (d: FormationState) => getEthnicDefenseBonus(getCoEthnicShare(targetOsid, d.faction, ethnicComposition));
        if (defenderFormations.length > 0) {
            // Brigade physically at the OSID — standard resolution
            const { primary, totalPower } = rankDefendersByPower(defenderFormations, state, targetOsid, terrainMultByOsid, artSuppression, supplyStateByOsid, ethBonus);
            defenderPower = totalPower;
            defenderFormation = primary;
        } else if (isEnemyControlled) {
            // No brigade at the OSID. Try sector-pooled defense: brigades in the owning sector
            // cover the entire sector frontline even when not physically at this OSID.
            const sector = findSectorForEnemyOsid(state, targetOsid);
            const sectorBrigades = sector
                ? sector.assigned_brigade_ids
                    .map(id => state.formations?.[id])
                    .filter((f): f is FormationState => f != null && f.status === 'active')
                : [];
            if (sectorBrigades.length > 0) {
                const coverageMult = frontDensityModifier(sector!.assigned_brigade_ids.length, sector!.length_edges) * SECTOR_COVERAGE_PENALTY;
                const { primary, totalPower } = rankDefendersByPower(sectorBrigades, state, targetOsid, terrainMultByOsid, artSuppression, supplyStateByOsid, ethBonus);
                defenderPower = totalPower * coverageMult;
                defenderFormation = primary;
                isSectorCoverageDefense = true;
            } else {
                // Truly undefended: militia ghost only (no brigades in sector)
                defenderPower = (osidPopulationMap?.get(targetOsid) ?? 5000) * MILITIA_DEFENSE_RATIO * 0.25;
            }
        } else {
            continue;
        }

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
        const attackerPower = attackerFormations.reduce((s, a) => s + computeAttackerPower(state, a, supplyStateByOsid, undefined, targetTerrainMult), 0)
            * coordPenalty * seasonal.attack_mult;
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
        const outcome: CombatOutcome = surrenderCascade ? 'decisive_victory' : classifyOutcome(powerRatio);
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
        const bombardmentMult = getBombardmentCasualtyMult(attackerFormations, attackerFaction, state);
        const baseAttackerCas = personnelAttacker * BASE_ATTACKER_LOSS_RATE * (OUTCOME_ATTACKER_MOD[outcome] ?? 1) * lastStandCasMult;
        const baseDefenderCas = personnelDefender * BASE_DEFENDER_LOSS_RATE * (OUTCOME_DEFENDER_MOD[outcome] ?? 1) * lastStandCasMult * bombardmentMult;
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
        if (state.meta.supply_reserves_enabled && state.general_supply_reserve && state.heavy_munitions_reserve) {
            deductCombatExpenditure(state, attackerFaction, attackerFormations.length, powerRatio);
            if (defenderFormation) {
                deductCombatExpenditure(state, defenderFormation.faction, 1, powerRatio * 0.5);
            }
        }

        // Part 6c: Facility combat damage (Phase B)
        if (state.meta.supply_reserves_enabled && state.production_facilities) {
            const osidParts = targetOsid.split(':');
            if (osidParts.length >= 2) {
                const munId = osidParts[1];
                const facilityIds = Object.keys(state.production_facilities).sort((a, b) => a.localeCompare(b));
                for (const fId of facilityIds) {
                    const facility = state.production_facilities[fId];
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
            // ARBiH homeland defense: fighters refuse to retreat even under heavy losses.
            // In co-ethnic homeland (≥50%), absorb up to 'victory'; elsewhere absorb 'costly_victory' if morale holds.
            const homelandLastStand = defenderFaction === 'RBiH' && coEthnicShare >= 0.50;
            const absorb = homelandLastStand
                ? (outcome === 'costly_victory' || outcome === 'victory')
                : (outcome === 'costly_victory' && defMorale >= resistFloor);
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
                    description: homelandLastStand
                        ? 'ARBiH homeland last stand — absorbed defeat without retreating.'
                        : 'Defender morale held — absorbed costly victory without retreating.',
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
                        recordBattleCasualties(state.casualty_ledger!, a.faction, a.id, {
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
                recordBattleCasualties(state.casualty_ledger!, defenderFormation.faction, defenderFormation.id, {
                    killed: Math.floor(extraDefenderTotal * KIA_FRACTION),
                    wounded: Math.floor(extraDefenderTotal * WIA_FRACTION),
                    missing_captured: Math.max(0, extraDefenderTotal - Math.floor(extraDefenderTotal * KIA_FRACTION) - Math.floor(extraDefenderTotal * WIA_FRACTION))
                });
            }
        }

        if (flip) {
            if (!state.political_controllers) state.political_controllers = {};
            const prevController = state.political_controllers[targetOsid] ?? null;
            state.political_controllers[targetOsid] = attackerFaction;
            report.flips_applied += 1;
            // Record control event for GUI battle markers (does not affect simulation logic).
            (state.control_events ??= []).push({
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
                (defenderFormation as { location_osid?: string }).location_osid = dest;
                (defenderFormation as { entrenchment_turns?: number }).entrenchment_turns = 0;
                (defenderFormation as { defense_streak?: number }).defense_streak = 0;
                (defenderFormation as { last_retreat_from?: { osid: string; turn: number } }).last_retreat_from = {
                    osid: targetOsid, turn: state.meta?.turn ?? 0
                };
                if (outcome === 'decisive_victory') (defenderFormation as { disrupted_turns?: number }).disrupted_turns = 2;
                else if (outcome === 'victory') (defenderFormation as { disrupted_turns?: number }).disrupted_turns = 1;
            } else if (isSectorCoverageDefense) {
                // Sector-coverage defenders with no retreat path rout to their corps HQ.
                // They were not physically at the OSID, so destruction is historically wrong —
                // the unit still exists, just shattered and pulled back to reform.
                const hqOsid = getCorpsHqOsid(state, defenderFormation);
                const hqController = hqOsid ? getPoliticalControllerOSID(state, hqOsid, reverseMap) : null;
                if (hqOsid && hqController === defenderFormation.faction) {
                    (defenderFormation as { location_osid?: string }).location_osid = hqOsid;
                    (defenderFormation as { entrenchment_turns?: number }).entrenchment_turns = 0;
                    (defenderFormation as { defense_streak?: number }).defense_streak = 0;
                    (defenderFormation as { disrupted_turns?: number }).disrupted_turns = SECTOR_ROUT_DISRUPTED_TURNS;
                    defenderFormation.cohesion = Math.max(0, (defenderFormation.cohesion ?? 60) - SECTOR_ROUT_COHESION_LOSS);
                    defenderFormation.personnel = Math.floor((defenderFormation.personnel ?? 0) * SECTOR_ROUT_PERSONNEL_RETAIN);
                    (defenderFormation as { last_retreat_from?: { osid: string; turn: number } }).last_retreat_from = {
                        osid: targetOsid, turn: state.meta?.turn ?? 0
                    };
                } else {
                    // HQ also lost or unknown — brigade destroyed
                    defenderFormation.personnel = 0;
                    defenderFormation.status = 'inactive';
                }
            } else if ((defenderFormation as { fallback_osid?: string }).fallback_osid) {
                // Fallback retreat: brigade reforms at fallback OSID only if it is still friendly
                const fallback = (defenderFormation as { fallback_osid?: string }).fallback_osid!;
                const fallbackController = getPoliticalControllerOSID(state, fallback, reverseMap);
                if (fallbackController === defenderFormation.faction) {
                    (defenderFormation as { location_osid?: string }).location_osid = fallback;
                    (defenderFormation as { entrenchment_turns?: number }).entrenchment_turns = 0;
                    (defenderFormation as { defense_streak?: number }).defense_streak = 0;
                    (defenderFormation as { disrupted_turns?: number }).disrupted_turns = 3;
                    defenderFormation.cohesion = Math.max(0, (defenderFormation.cohesion ?? 60) - 20);
                    defenderFormation.personnel = Math.max(MIN_COMBAT_PERSONNEL, Math.floor((defenderFormation.personnel ?? 0) * 0.6));
                    (defenderFormation as { last_retreat_from?: { osid: string; turn: number } }).last_retreat_from = {
                        osid: targetOsid, turn: state.meta?.turn ?? 0
                    };
                } else {
                    // Fallback OSID is enemy-controlled; no valid retreat — treat as destroyed
                    defenderFormation.personnel = 0;
                    defenderFormation.status = 'inactive';
                }
            } else {
                defenderFormation.personnel = 0;
                defenderFormation.status = 'inactive';
            }
        }

        // === POST-BATTLE MORALE EFFECTS ===
        for (const a of attackerFormations) {
            if (a.morale === undefined) continue;
            switch (outcome) {
                case 'decisive_victory': a.morale = Math.min(100, a.morale + 3); break;
                case 'victory':          a.morale = Math.min(100, a.morale + 1); break;
                case 'costly_victory':   break;
                case 'stalemate':        a.morale = Math.max(0, a.morale - 2); break;
                case 'repulsed':         a.morale = Math.max(0, a.morale - 5); break;
                case 'catastrophic':     a.morale = Math.max(0, a.morale - 10); break;
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
            const formations = state.formations ?? {};
            for (const f of Object.values(formations)) {
                if (!f || f.status !== 'active' || (f as { location_osid?: string }).location_osid !== targetOsid) continue;
                if (f.faction === attackerFaction) continue;
                const otherFormation = f as FormationState & { location_osid?: string; fallback_osid?: string };
                const retreatDests = getFriendlyRetreatDestinations(state, otherFormation, adjacency, reverseMap);
                const dest = retreatDests[0];
                if (dest != null) {
                    otherFormation.location_osid = dest;
                    (otherFormation as { entrenchment_turns?: number }).entrenchment_turns = 0;
                    (otherFormation as { defense_streak?: number }).defense_streak = 0;
                } else if (otherFormation.fallback_osid && getPoliticalControllerOSID(state, otherFormation.fallback_osid, reverseMap) === otherFormation.faction) {
                    otherFormation.location_osid = otherFormation.fallback_osid;
                    (otherFormation as { entrenchment_turns?: number }).entrenchment_turns = 0;
                    (otherFormation as { defense_streak?: number }).defense_streak = 0;
                } else {
                    otherFormation.personnel = 0;
                    otherFormation.status = 'inactive';
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
    const formations = state.formations ?? {};
    for (const f of Object.values(formations)) {
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
        } else if (otherFormation.fallback_osid && getPoliticalControllerOSID(state, otherFormation.fallback_osid, reverseMap) === factionId) {
            otherFormation.location_osid = otherFormation.fallback_osid;
            (otherFormation as { entrenchment_turns?: number }).entrenchment_turns = 0;
            (otherFormation as { defense_streak?: number }).defense_streak = 0;
        } else {
            otherFormation.personnel = 0;
            otherFormation.status = 'inactive';
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
