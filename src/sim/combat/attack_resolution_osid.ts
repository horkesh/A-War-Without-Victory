/**
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: Execution-Only
 * DOMAIN:    Combat resolution — attack outcomes, retreats, advances
 * ═══════════════════════════════════════════════════════════════
 *
 * DECIDES:   Nothing strategic — resolves combat-forced position changes only
 * WRITES:    location_osid (defender retreat, attacker advance, displacement)
 * READS:     combat outcome, fallback destinations, terrain/supply modifiers
 * MUST NOT:  issue march orders — only resolve positions forced by battle outcome
 *
 * UPSTREAM:  sector_offensive.ts (attack orders), bot_brigade_ai_osid.ts (attack posture)
 * DOWNSTREAM: political_controllers (OSID flip), brigade history recorder
 *
 * TRUTH INVARIANTS:
 * - One attack resolution = at most one OSID control flip (Engine Invariants §6)
 * - Deterministic: sorted formation IDs and target OSIDs; no Math.random()
 * - Never writes brigade_movement_orders — only location_osid and retreat/advance state
 *
 * MOVEMENT TIER: T4 — Combat Consequence (see MOVEMENT_AUTHORITY.md)
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * War phase: OSID-based attack resolution per Attack Resolution Formula Spec.
 *
 * Formulas: §2–§5, §9 state, §10 constants (docs/30_planning/20260222_ATTACK_RESOLUTION_FORMULA_SPEC.md).
 * One attack resolution = at most one OSID control flip (Engine Invariants §6).
 * Deterministic: sorted formation IDs and target OSIDs; no randomness.
 */

import type { EdgeRecord } from '../../map/settlements.js';
import type { TerrainScalarsData } from '../../map/terrain_scalars.js';
import { recordBattleHistory } from './attack_history_recording.js';
import { updateSectorIntelFromCombat } from './sector_intel.js';
import {
    initializeCasualtyLedger,
    recordBattleCasualties,
} from '../../state/casualty_ledger.js';
import { recordFormationFatigue } from '../../state/formation_fatigue.js';
import type {
    ControlEvent,
    FactionId,
    FormationId,
    FormationState,
    GameState
} from '../../state/game_state.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import type { SupplyStateByOsidReport } from '../../state/supply_state_derivation.js';
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
import { isRbihHrhbCombatBlocked } from '../early_war/alliance_update.js';
import { getPostWashingtonJointPressureMultiplier } from '../early_war/washington_agreement.js';
import { findBrigadeOperation, findBrigadeOperationAnywhere, countAxisConcentrationSupport } from './corps_operation_helpers.js';
import { getBrigadeAxis } from './bot_brigade_ai_osid.js';

// ── Shared combat math ──────────────────────────────────────────────────
import {
    type CombatOutcome,
    // Constants used directly in resolver
    MAX_RESILIENCE_STREAK,
    MILITIA_DEFENSE_RATIO,
    COORDINATION_PENALTY_2,
    COORDINATION_PENALTY_3PLUS,
    STACKING_DEFENDER_SUPPORT,
    ENTRENCHMENT_DEGRADATION_PER_BATTLE,
    POSTURE_ATTACK,
    COHESION_ATTACKER,
    COHESION_DEFENDER,
    // Functions (getMoraleResistFloor moved to attack_morale_absorption.ts)
    getConcentrationBonus,
    getArtillerySuppression,
    getBombardmentCasualtyMult,
    getDefensiveFireMult,
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
    getWarExhaustionTempoMult,
    getIntelAmbushAttackerCasualtyMult,
    getIntelAmbushDefenderCasualtyMult,
    getIntelExecutionFrictionMultipliers,
} from './combat_math.js';
// OFFICER_CASUALTY_MULT, OFFICER_QUALITY_FLOOR moved to attack_post_battle_effects.ts
import { isSupportBrigadeOnActiveOp } from './sector_offensive_axis_helpers.js';
import { SUPPORT_POWER_MULT } from './bot_constants.js';
import { findSectorForEnemyOsid, findSubSegmentForOsid } from './corps_front_sectors.js';
import { getEnclaveGarrisonPower, isEnclaveCapital } from './enclave_resilience.js';
import { getTacticalAdjacentOsids } from './tactical_adjacency.js';
// frontDensityModifier import removed — no longer used in sector defense

// ── Retreat & displacement helpers (extracted to attack_retreat_displacement.ts) ──
import {
    buildSlopeByOsid,
    buildFriendlySet,
    getFriendlyRetreatDestinations,
    resetFormationEntrenchment,
    forceRetreatWithPenalties,
    applyDefeatPenalties,
    applyPersonnelLoss,
    findEmergencyRetreatOsid as _findEmergencyRetreatOsid,
    displaceFormationsInEnemyTerritory as _displaceFormationsInEnemyTerritory,
} from './attack_retreat_displacement.js';

// ── Equipment battle effects (extracted to attack_equipment_effects.ts) ──
import {
    computeFormationEquipmentLoss,
    processEquipmentTransfers,
    buildBattleEquipmentReport,
    type EquipmentTransferResult,
    type BattleEquipmentData,
} from './attack_equipment_effects.js';

// ── Battle report types (extracted to attack_resolution_types.ts) ──
import {
    type AttackResolutionOsidSnapEventType,
    type AttackResolutionOsidSnapEvent,
    type AttackResolutionOsidReport,
    type AttackOrderSkipReason,
    type DefenderContribution,
    type IntelConfidenceBand,
    type IntelFrictionLabel,
    type PublicIntelFrictionAnnotation,
    pushSnapEvent,
} from './attack_resolution_types.js';

// ── Morale absorption & homeland determination (extracted to attack_morale_absorption.ts) ──
import { evaluateAndApplyMoraleAbsorption } from './attack_morale_absorption.js';

// ── Resource aftermath: supply expenditure, facility damage, fatigue (extracted to attack_resource_aftermath.ts) ──
import {
    deductCombatSupplyExpenditure,
    applyFacilityCombatDamage,
    applyCombatFatigue,
} from './attack_resource_aftermath.js';

// ── Casualty calculation & distribution (extracted to attack_casualty_distribution.ts) ──
import {
    splitKiaWiaMia,
    computeFinalCasualties,
    computeAttackerCasualtyShares,
    distributeDefenderCasualties,
    buildDefenderContributions,
} from './attack_casualty_distribution.js';

// ── Post-battle effects (extracted to attack_post_battle_effects.ts) ──
import {
    applyExperienceGain,
    applyOfficerCasualtyLoss,
    getDefenderOutcomePerspective,
    applyDisruptionFromOutcome,
    applyAmmoCrisisPyrrhicEffects,
    applyPostBattleMorale,
    COMMANDER_EXP_LOSS,
} from './attack_post_battle_effects.js';

// Backward-compat re-exports (types)
export type AttackOutcome = CombatOutcome;
export { getEquipmentRatio, getToTerrainDefenseMult };
export type { CombatOutcome };
export type { AttackResolutionOsidSnapEventType, AttackResolutionOsidSnapEvent, AttackResolutionOsidReport, DefenderContribution };
export { pushSnapEvent };

// Backward-compat re-exports for retreat/displacement (consumers may import from this file)
export { _findEmergencyRetreatOsid as findEmergencyRetreatOsid };
export { _displaceFormationsInEnemyTerritory as displaceFormationsInEnemyTerritory };

function findFriendlySectorIdForOsid(state: GameState, osid: string): string | null {
    const sectors = state.military.corps_front_sectors;
    if (!sectors) return null;
    const sectorIds = Object.keys(sectors).sort(strictCompare);
    for (const sectorId of sectorIds) {
        const sector = sectors[sectorId];
        if (!sector) continue;
        for (const subSegment of sector.sub_segments ?? []) {
            if (subSegment.friendly_osids.includes(osid)) return sectorId;
        }
    }
    return null;
}

function getAttackIntelConfidence(
    state: GameState,
    attackerOsid: string,
    defenderSectorId: string | undefined,
    targetOsid: string,
): number {
    if (!defenderSectorId) return 0;
    const attackerSectorId = findFriendlySectorIdForOsid(state, attackerOsid);
    if (!attackerSectorId) return 0;
    const record = state.military.sector_intel?.[attackerSectorId]
        ?.find(rec => rec.enemy_sector_id === defenderSectorId);
    if (!record) return 0;
    const osidConfidence = record.osid_confidence
        ?.find(entry => entry.osid === targetOsid)
        ?.confidence;
    return osidConfidence ?? record.confidence;
}

function getIntelConfidenceBand(confidence: number): IntelConfidenceBand {
    if (confidence < 1 / 3) return 'low';
    if (confidence < 2 / 3) return 'medium';
    return 'high';
}

function buildPublicIntelFrictionAnnotation(
    confidence: number,
    attackerPowerMult: number,
    defenderPowerMult: number,
    attackerCasualtyMult: number,
): PublicIntelFrictionAnnotation | undefined {
    const labels: IntelFrictionLabel[] = [];
    if (attackerPowerMult < 1) labels.push('stale_intel');
    if (defenderPowerMult > 1) labels.push('defender_opsec');
    if (attackerCasualtyMult > 1) labels.push('ambush_risk');
    if (labels.length === 0) return undefined;
    return {
        labels,
        ...(attackerPowerMult < 1 ? { attacker_confidence_band: getIntelConfidenceBand(confidence) } : {}),
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Resolver-only constants
// ═══════════════════════════════════════════════════════════════════════════

// MORALE_ABSORPTION_CAS_MULT moved to attack_morale_absorption.ts

// SECTOR_COVERAGE_PENALTY removed — replaced by distance-weighted reactive defense (n666).
// SECTOR_ROUT_* and EMERGENCY_RETREAT_* constants moved to attack_retreat_displacement.ts

// KIA_FRACTION, WIA_FRACTION, MIA_FRACTION moved to attack_casualty_distribution.ts

// Equipment loss rates moved to attack_equipment_effects.ts

// Experience constants + COMMANDER_EXP_LOSS moved to attack_post_battle_effects.ts

// Defeat/displacement helpers, terrain helpers, retreat/displacement functions
// moved to attack_retreat_displacement.ts — imported above.

// Types and pushSnapEvent imported from attack_resolution_types.ts above.

/**
 * Fall-1995 mechanic E-A4: cascade trigger writer.
 *
 * When OSID `targetOsid` flips from `prevController` to a new faction in
 * turn T, every front-edge-adjacent OSID Y still owned by `prevController`
 * receives a 1-turn defender-power penalty applied in turn T+1.
 *
 * Models the counter-clockwise collapse pattern in VRS 2nd Krajina Corps
 * Sept 1995: adjacent-OSID loss demoralizes/destabilizes the remaining
 * defenders before they can entrench or reposition.
 *
 * Determinism: adjacent OSIDs are iterated in sorted order via strictCompare.
 * GC: `cleanupExpiredEventModifiers` (in active_modifiers.ts) drops entries
 *   when `expires_turn <= currentTurn`. The reader filter
 *   `getCascadePenaltyForOsid` uses `expires_turn > currentTurn`, so
 *   `expires_turn = turn + 2` means the penalty is active exactly on
 *   turn `turn+1` and is GC'd at start of turn `turn+2`.
 * Byte-stability: writes only on a flip with a non-null `prevController`.
 *
 * Singular ownership: this writer is the only path that emits cascade entries
 * for E-A4. Reader: `getCascadePenaltyForOsid` (active_modifiers.ts) consumed
 * in `computeDefenderPowerBreakdown` (combat_math.ts).
 *
 * See docs/40_reports/proposals/20260523_ENGINE_SYNTHESIS_FALL_1995.md §3 E-A4.
 *
 * Exported for unit-test isolation; production caller is the OSID-flip site
 * in `resolveAttackOrdersOsid` below.
 */
export function emitCascadePenaltiesOnFlip(
    state: GameState,
    targetOsid: string,
    prevController: FactionId | null,
    adjacency: ReadonlyMap<string, readonly string[]> | Map<string, string[]>,
    multiplier: number = 0.85,
): void {
    if (!prevController) return;
    const currentTurn = state.meta?.turn ?? 0;
    const neighbors = adjacency.get(targetOsid) ?? [];
    const sortedNeighbors = [...neighbors].sort(strictCompare);
    const pcMap = state.political?.political_controllers ?? {};
    const penaltyList = (state.military.cascade_penalties ??= []);
    for (const neighborOsid of sortedNeighbors) {
        if (neighborOsid === targetOsid) continue;
        if (pcMap[neighborOsid] !== prevController) continue;
        penaltyList.push({
            osid: neighborOsid,
            multiplier,
            expires_turn: currentTurn + 2,
        });
    }
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
    ethnicComposition?: OsidEthnicComposition | null,
    preComputedAdjacency?: ReadonlyMap<string, readonly string[]>,
): AttackResolutionOsidReport {
    const report: AttackResolutionOsidReport = {
        orders_processed: 0,
        unique_attack_targets: 0,
        flips_applied: 0,
        casualty_attacker: 0,
        casualty_defender: 0,
        orders_by_faction: {},
        orders_seen_by_brigade: {},
        engaged_formation_ids: [],
        snap_events: [],
        snap_event_counts: {},
        skipped_attack_orders: [],
        battles: []
    };

    // COHA ceasefire suppresses all combat (v0.7.0 Phase 4)
    if (state.military.event_flags?.coha_active === true) return report;

    const terrainMultByOsid = buildTerrainMultByOsid(reverseMap, terrainData);
    const slopeByOsid = buildSlopeByOsid(reverseMap, terrainData);

    const currentTurn = state.meta?.turn ?? 0;
    const startDate = state.meta?.scenario_start_date;

    const orders = state.military.brigade_attack_orders;
    const adjacency = (preComputedAdjacency as Map<Osid, Osid[]>) ?? buildOsidAdjacency(edges);
    const fmts = state.military.formations ?? {};
    const allFormations = Object.keys(fmts).sort(strictCompare).map(k => fmts[k]!);

    // Lazy per-faction friendly sets for direction-aware retreat
    const friendlyCache = new Map<string, Set<string>>();
    const getFriendlyForFaction = (fac: string): Set<string> => {
        let s = friendlyCache.get(fac);
        if (!s) {
            const pc = state.political?.political_controllers ?? {};
            s = buildFriendlySet(pc, fac);
            friendlyCache.set(fac, s);
        }
        return s;
    };
    if (!orders || typeof orders !== 'object') {
        // No orders this turn — still run displacement pass so formations left in enemy territory from a previous turn are fixed
        for (const f of allFormations) {
            if (!f || f.status !== 'active') continue;
            const loc = (f as { location_osid?: string }).location_osid;
            if (!loc) continue;
            const factionId = f.faction;
            if (getPoliticalControllerOSID(state, loc, reverseMap) === factionId) continue;
            const otherFormation = f as FormationState & { location_osid?: string; fallback_osid?: string };
            const retreatDests = getFriendlyRetreatDestinations(state, otherFormation, adjacency, reverseMap);
            const dest = retreatDests[0];
            if (dest != null) {
                otherFormation.location_osid = dest;
                resetFormationEntrenchment(otherFormation);
            } else {
                forceRetreatWithPenalties(state, otherFormation, reverseMap, loc, { adjacency, friendlyOsids: getFriendlyForFaction(factionId) });
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
        (report.orders_seen_by_brigade ??= {})[fid] = target as Osid;
    }
    const targetOsids = Array.from(targetToAttackers.keys()).sort(strictCompare);
    report.unique_attack_targets = targetOsids.length;
    for (const fid of formationIds) {
        const f = state.military.formations?.[fid];
        if (!f) continue;
        const fac = f.faction as string;
        report.orders_by_faction[fac] = (report.orders_by_faction[fac] ?? 0) + 1;
    }

    const recordSkippedOrder = (
        brigadeId: FormationId,
        targetOsid: Osid,
        reason: AttackOrderSkipReason,
        locationOsid?: string,
        targetController?: FactionId | null,
    ): void => {
        (report.skipped_attack_orders ??= []).push({
            brigade_id: brigadeId,
            target_osid: targetOsid,
            reason,
            ...(locationOsid ? { location_osid: locationOsid } : {}),
            ...(targetController !== undefined ? { target_controller: targetController } : {}),
        });
    };

    if (!state.military.casualty_ledger) {
        const factionIds = (state.factions ?? []).map(f => f.id);
        state.military.casualty_ledger = initializeCasualtyLedger(factionIds);
    }

    for (const targetOsid of targetOsids) {
        const attackerIds = targetToAttackers.get(targetOsid)!;
        if (attackerIds.length === 0) continue;

        const attackerFormations: FormationState[] = [];
        for (const attackerId of attackerIds) {
            const formation = state.military.formations?.[attackerId];
            if (!formation || formation.status !== 'active') {
                recordSkippedOrder(attackerId, targetOsid, 'missing_or_inactive_formation');
                continue;
            }
            const loc = (formation as { location_osid?: string }).location_osid;
            if (!loc) {
                recordSkippedOrder(attackerId, targetOsid, 'no_location');
                continue;
            }
            const neighbors = getTacticalAdjacentOsids(state, loc as Osid, adjacency);
            if (!neighbors.includes(targetOsid)) {
                recordSkippedOrder(attackerId, targetOsid, 'not_tactically_adjacent', loc);
                continue;
            }
            attackerFormations.push(formation);
        }
        attackerFormations.sort((a, b) => strictCompare(a.id, b.id));
        if (attackerFormations.length === 0) continue;

        const firstAttacker = attackerFormations[0]!;
        const attackerFaction = firstAttacker.faction;

        // Safety gate: suppress HRHB↔RBiH combat when mobilizing, ceasefire-active, or
        // post-Washington. Belt-and-suspenders if an order slips through upstream.
        const targetController = getPoliticalControllerOSID(state, targetOsid, reverseMap);
        if (isRbihHrhbCombatBlocked(state, attackerFaction, targetController)) {
            for (const attacker of attackerFormations) {
                recordSkippedOrder(attacker.id, targetOsid, 'alliance_blocked', attacker.location_osid, targetController);
            }
            continue;
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
        let defendingSectorId: string | undefined;
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
            defendingSectorId = sector?.sector_id;
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
                // Populate sector defense data for proportional casualty distribution
                if (defenderFormations.length > 1) {
                    sectorDefenseBrigades = defenderFormations;
                    const totalPers = defenderFormations.reduce((s, b) => s + (b.personnel ?? 0), 0);
                    sectorBrigadeWeights = new Map<FormationId, number>();
                    sectorBrigadeMeta = new Map<FormationId, { hops: number; isHome: boolean }>();
                    for (const b of defenderFormations) {
                        const pers = b.personnel ?? 0;
                        sectorBrigadeWeights.set(b.id, totalPers > 0 ? pers / totalPers : 1 / defenderFormations.length);
                        sectorBrigadeMeta.set(b.id, { hops: 0, isHome: false });
                    }
                }
            } else {
                // Truly undefended: no sector, no brigade — militia ghost only
                defenderPower = (osidPopulationMap?.get(targetOsid) ?? 5000) * MILITIA_DEFENSE_RATIO * 0.25;
            }
        } else if (defenderFormations.length > 0) {
            // Non-enemy OSID with defenders (shouldn't happen, but safe fallback)
            const { primary, totalPower } = rankDefendersByPower(defenderFormations, state, targetOsid, terrainMultByOsid, artSuppression, supplyStateByOsid, ethBonus);
            defenderPower = totalPower;
            defenderFormation = primary;
            // Populate sector defense data for proportional casualty distribution
            if (defenderFormations.length > 1) {
                sectorDefenseBrigades = defenderFormations;
                const totalPers = defenderFormations.reduce((s, b) => s + (b.personnel ?? 0), 0);
                sectorBrigadeWeights = new Map<FormationId, number>();
                sectorBrigadeMeta = new Map<FormationId, { hops: number; isHome: boolean }>();
                for (const b of defenderFormations) {
                    const pers = b.personnel ?? 0;
                    sectorBrigadeWeights.set(b.id, totalPers > 0 ? pers / totalPers : 1 / defenderFormations.length);
                    sectorBrigadeMeta.set(b.id, { hops: 0, isHome: false });
                }
            }
        } else {
            for (const attacker of attackerFormations) {
                recordSkippedOrder(
                    attacker.id,
                    targetOsid,
                    'not_enemy_controlled_without_defenders',
                    attacker.location_osid,
                    targetController,
                );
            }
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
        defenderPower *= getPostWashingtonJointPressureMultiplier(state, controller, attackerFaction, targetOsid);

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
        // R13b op-level concentration mirror: amplify the concentration bonus
        // when same-axis op-mates are within 2 hops of the target (theater
        // coordination). Capped at 4 effective via Math.min to stay within
        // the existing CONCENTRATION_BONUS_CAP=0.30. Same-axis (not whole op)
        // scope prevents cross-axis amplification on Sarajevo ring / Drina.
        let effectiveAttackerCount = attackerFormations.length;
        const opMatch = findBrigadeOperationAnywhere(state, firstAttacker.id);
        if (opMatch) {
            const axis = getBrigadeAxis(opMatch.op, firstAttacker.id);
            const sameAxisBrigades = axis?.assigned_brigades ?? opMatch.op.participating_brigades ?? [];
            const attackerIds = new Set<FormationId>(attackerFormations.map(a => a.id));
            effectiveAttackerCount += countAxisConcentrationSupport(
                state,
                sameAxisBrigades,
                attackerIds,
                adjacency,
                targetOsid,
            );
        }
        const concentrationBonus = getConcentrationBonus(Math.min(4, effectiveAttackerCount));
        // Formations with attack orders attack at their posture — but postures with
        // zero attack mult (defend, hold, dig_in) use 'attack' as minimum, since the
        // attack order itself implies attack intent. Preserves 'assault' (1.2×) bonus.
        const attackerPower = attackerFormations.reduce((s, a) => {
            const posture = a.posture ?? 'defend';
            const atkMult = POSTURE_ATTACK[posture] ?? 0;
            const effectivePosture = atkMult > 0 ? posture : 'attack';
            const rawPower = computeAttackerPower(state, a, supplyStateByOsid, effectivePosture, targetTerrainMult, targetOsid);
            // Support brigades contribute reduced power — main brigade carries the assault
            const supportMult = isSupportBrigadeOnActiveOp(state, a.id, a.corps_id) ? SUPPORT_POWER_MULT : 1.0;
            return s + rawPower * supportMult;
        }, 0) * coordPenalty * seasonal.attack_mult * concentrationBonus
            * getWarExhaustionTempoMult(state, attackerFaction); // P7: war exhaustion → attack tempo penalty
        defenderPower *= seasonal.defense_mult;
        const attackerIntelConfidence = getAttackIntelConfidence(
            state,
            firstAttacker.location_osid ?? '',
            defendingSectorId,
            targetOsid,
        );
        const intelFriction = getIntelExecutionFrictionMultipliers(
            attackerIntelConfidence,
            defendingSectorId ? (state.military.opsec_sectors ?? []).includes(defendingSectorId) : false,
        );
        const intelAmbushAttackerCasualtyMult = getIntelAmbushAttackerCasualtyMult(
            attackerIntelConfidence,
            defendingSectorId ? (state.military.opsec_sectors ?? []).includes(defendingSectorId) : false,
        );
        const intelAmbushDefenderCasualtyMult = getIntelAmbushDefenderCasualtyMult(
            attackerIntelConfidence,
            defendingSectorId ? (state.military.opsec_sectors ?? []).includes(defendingSectorId) : false,
        );
        const effectiveAttackerPower = attackerPower * intelFriction.attackerPowerMult;
        defenderPower *= intelFriction.defenderPowerMult;
        const executionFriction = buildPublicIntelFrictionAnnotation(
            attackerIntelConfidence,
            intelFriction.attackerPowerMult,
            intelFriction.defenderPowerMult,
            intelAmbushAttackerCasualtyMult,
        );

        const powerRatio = defenderPower <= 0 ? 10 : effectiveAttackerPower / defenderPower;
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
        const defensiveFireMult = getDefensiveFireMult(
            sectorDefenseBrigades ?? (defenderFormation ? [defenderFormation] : []),
            controller ?? attackerFaction,
            state
        );
        const { finalAttackerCas, finalDefenderCas } = computeFinalCasualties({
            personnelAttacker,
            personnelDefender,
            outcome,
            lastStandCasMult,
            militiaOnlyMult,
            attCasMult: attCasMult * intelAmbushAttackerCasualtyMult,
            defCasMult: defCasMult * intelAmbushDefenderCasualtyMult,
            defensiveFireMult,
            bombardmentMult,
            attackerCount: attackerFormations.length,
            powerRatio,
        });

        // Build defender contribution records for Layer C battle reports
        const defenderContributions = (sectorBrigadeWeights && sectorBrigadeMeta && sectorDefenseBrigades && sectorDefenseBrigades.length > 1)
            ? buildDefenderContributions({
                sectorDefenseBrigades,
                sectorBrigadeWeights,
                sectorBrigadeMeta,
                finalDefenderCas,
            })
            : undefined;

        // Battle report pushed AFTER equipment processing (below) so it includes equipment data.
        // Collect equipment tracking variables here:
        let battleEquipAttackerTanksLost = 0, battleEquipAttackerArtLost = 0;
        let battleEquipDefenderTanksLost = 0, battleEquipDefenderArtLost = 0;
        let battleEquipScavengedTanks = 0, battleEquipScavengedArt = 0;
        let battleEquipCapturedTanks = 0, battleEquipCapturedArt = 0;
        let battleEquipScavengedBy = '' as string;
        let battleEquipCapturedBy = '' as string;

        report.casualty_attacker += finalAttackerCas;
        report.casualty_defender += finalDefenderCas;

        // Equipment loss accumulators for battlefield scavenging (summed across attacker formations)
        let totalATanksLost = 0;
        let totalAArtLost = 0;
        let totalDTanksLost = 0;
        let totalDArtLost = 0;

        // Pre-classify support roles for weight computation
        const anySupport = attackerFormations.some(a => isSupportBrigadeOnActiveOp(state, a.id, a.corps_id));
        const casShares = computeAttackerCasualtyShares(
            attackerFormations.map(a => ({
                id: a.id,
                personnel: a.personnel ?? 0,
                supportRole: isSupportBrigadeOnActiveOp(state, a.id, a.corps_id) ? 'support' as const
                    : anySupport ? 'main' as const : 'none' as const,
            })),
            personnelAttacker,
            finalAttackerCas,
        );
        for (const a of attackerFormations) {
            const cas = casShares.get(a.id) ?? 0;
            applyPersonnelLoss(a, cas);
            a.cohesion = Math.max(0, Math.min(100, (a.cohesion ?? 60) + (COHESION_ATTACKER[outcome] ?? 0)));

            // Sweeping undefended territory is less exhausting than real combat but not free —
            // logistics, occupation duties, scattered resistance, and advance tempo take a toll.
            recordFormationFatigue(a, defenderFormation ? 2 : 0.5);

            // Record battle outcome for morale drift (victory boost / defeat penalty).
            (a as { recent_battle_outcome?: string }).recent_battle_outcome = outcome;

            applyDisruptionFromOutcome(a, outcome, targetOsid, state.meta?.turn ?? 0);
            recordBattleCasualties(state.military.casualty_ledger!, a.faction, a.id, splitKiaWiaMia(cas));
            // Equipment losses (extracted to attack_equipment_effects.ts)
            const { tanksLost: aTanksLost, artLost: aArtLost } = computeFormationEquipmentLoss(a, 'attacker', state.military.casualty_ledger!);
            totalATanksLost += aTanksLost;
            totalAArtLost += aArtLost;
            battleEquipAttackerTanksLost += aTanksLost;
            battleEquipAttackerArtLost += aArtLost;
        }
        if (defenderFormation) {
            // ── Distance-weighted casualty distribution ───────────────────
            distributeDefenderCasualties({
                defenderFormation,
                sectorDefenseBrigades,
                sectorBrigadeWeights,
                finalDefenderCas,
                casualtyLedger: state.military.casualty_ledger!,
            });

            // Apply cohesion/fatigue/morale to primary defender
            defenderFormation.cohesion = Math.max(0, Math.min(100, (defenderFormation.cohesion ?? 60) + (COHESION_DEFENDER[outcome] ?? 0)));
            recordFormationFatigue(defenderFormation, 1);

            // Record battle outcome for morale drift — defender's perspective is inverted
            (defenderFormation as { recent_battle_outcome?: string }).recent_battle_outcome = getDefenderOutcomePerspective(outcome);

            (defenderFormation as { defense_streak?: number }).defense_streak = (outcome === 'stalemate' || outcome === 'repulsed' || outcome === 'catastrophic')
                ? Math.min(MAX_RESILIENCE_STREAK, ((defenderFormation as { defense_streak?: number }).defense_streak ?? 0) + 1)
                : 0;
            const prevEntrenchment = (defenderFormation as { entrenchment_turns?: number }).entrenchment_turns ?? 0;
            (defenderFormation as { entrenchment_turns?: number }).entrenchment_turns = Math.max(0, prevEntrenchment - ENTRENCHMENT_DEGRADATION_PER_BATTLE);
            // Defender equipment losses (extracted to attack_equipment_effects.ts)
            const { tanksLost: dTanksLost, artLost: dArtLost } = computeFormationEquipmentLoss(defenderFormation, 'defender', state.military.casualty_ledger!);
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

        // ── Equipment transfers (extracted to attack_equipment_effects.ts) ──
        const attackerLost = outcome === 'repulsed' || outcome === 'catastrophic';
        const attackerWon = outcome === 'decisive_victory' || outcome === 'victory' || outcome === 'costly_victory';

        const transfers = processEquipmentTransfers({
            outcome, firstAttacker, defenderFormation, attackerFaction,
            controller, targetOsid,
            totalATanksLost, totalAArtLost, totalDTanksLost, totalDArtLost,
            osidPopulationMap,
        });
        battleEquipScavengedTanks = transfers.scavengedTanks;
        battleEquipScavengedArt = transfers.scavengedArt;
        battleEquipScavengedBy = transfers.scavengedBy;
        battleEquipCapturedTanks = transfers.capturedTanks;
        battleEquipCapturedArt = transfers.capturedArt;
        battleEquipCapturedBy = transfers.capturedBy;

        const attackerCorpsId = firstAttacker.corps_id;
        const attackerCmd = attackerCorpsId && state.military.corps_command
            ? state.military.corps_command[attackerCorpsId]
            : null;
        const activeOp = attackerCmd ? findBrigadeOperation(attackerCmd, firstAttacker.id) : null;
        const executionOp = activeOp && activeOp.phase === 'execution' ? activeOp : null;
        const activeOperationId = executionOp
            ? `${attackerCorpsId}:${executionOp.name}:t${executionOp.started_turn}`
            : undefined;

        // Compute deterministic battle_id join key
        const battleId = `${currentTurn}:${targetOsid}:${firstAttacker.id}:${defenderFormation?.id ?? 'null'}`;

        // Push battle report with equipment data
        report.battles.push({
            battle_id: battleId,
            attacker_brigade: firstAttacker.id,
            attacker_faction: attackerFaction,
            defender_faction: controller ?? attackerFaction,
            target_osid: targetOsid,
            outcome,
            power_ratio: powerRatio,
            attacker_won: outcome === 'decisive_victory' || outcome === 'victory' || outcome === 'costly_victory',
            defender_brigade: defenderFormation?.id ?? null,
            snap_events: battleSnapEvents,
            attacker_casualties: finalAttackerCas,
            defender_casualties: finalDefenderCas,
            defender_contributions: defenderContributions,
            ...(executionFriction ? { execution_friction: executionFriction } : {}),
            defending_sub_segment_id: defendingSubSegmentId,
            equipment: buildBattleEquipmentReport(
                battleEquipAttackerTanksLost, battleEquipAttackerArtLost,
                battleEquipDefenderTanksLost, battleEquipDefenderArtLost,
                transfers,
            ),
            ...(executionOp ? {
                operation_id: activeOperationId,
                operation_name: executionOp.name,
            } : {}),
        });

        const ammoCrisis = attackerLost && getSupplyMult(firstAttacker, state, 'attack', supplyStateByOsid) < 0.5;
        const pyrrhic = attackerWon && personnelAttacker > 0 && finalAttackerCas / personnelAttacker > 0.15;
        const crisisEvent = applyAmmoCrisisPyrrhicEffects({
            isAmmoCrisis: ammoCrisis,
            isPyrrhic: pyrrhic,
            firstAttackerId: firstAttacker.id,
            targetOsid,
            attackerFormations,
        });
        if (crisisEvent) {
            battleSnapEvents.push(crisisEvent);
            pushSnapEvent(report, crisisEvent);
        }

        // Part 6b: Supply reserve expenditure (Phase A)
        deductCombatSupplyExpenditure({
            state,
            attackerFaction,
            attackerCount: attackerFormations.length,
            powerRatio,
            defenderFormation,
        });

        // Part 6c: Facility combat damage (Phase B)
        applyFacilityCombatDamage({ state, targetOsid });

        // Part 7a: Experience gain (extracted to attack_post_battle_effects.ts)
        for (const a of attackerFormations) applyExperienceGain(a, attackerWon);
        if (defenderFormation && (defenderFormation.personnel ?? 0) > 0) applyExperienceGain(defenderFormation, !attackerWon);

        // Officer quality loss from casualties (extracted to attack_post_battle_effects.ts)
        for (const a of attackerFormations) {
            const frac = (a.personnel ?? 0) / Math.max(1, personnelAttacker);
            applyOfficerCasualtyLoss(a, Math.round(finalAttackerCas * frac), a.personnel ?? 0);
        }
        if (defenderFormation) applyOfficerCasualtyLoss(defenderFormation, finalDefenderCas, personnelDefender);

        // Probes are recon-by-force and never capture territory. Capture
        // requires a sector_attack or other offensive op type. See
        // buildProbeOperation in corps_operation_helpers.ts.
        const isProbeOp = activeOp?.type === 'probe';
        let flip = (outcome === 'decisive_victory' || outcome === 'victory' || outcome === 'costly_victory')
            && !isProbeOp;

        // === MORALE-BASED RETREAT RESISTANCE + HOMELAND DETERMINATION (extracted to attack_morale_absorption.ts) ===
        const { moraleAbsorbed, flip: updatedFlip } = evaluateAndApplyMoraleAbsorption({
            defenderFormation,
            attackerFormations,
            targetOsid,
            outcome,
            flip,
            ethnicComposition,
            personnelAttacker,
            finalAttackerCas,
            finalDefenderCas,
            casualtyLedger: state.military.casualty_ledger!,
            report,
            firstAttackerId: firstAttacker.id,
            battleSnapEvents,
        });
        flip = updatedFlip;

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

            // Fall-1995 mechanic E-A4: cascade trigger (writer extracted for testability).
            emitCascadePenaltiesOnFlip(state, targetOsid, prevController, adjacency);
        }

        // ── Increment operation combat feedback counters ──────────────
        // Find the attacker's active corps operation (if any) and update
        // per-turn and cumulative battle/territory counters.
        if (activeOp && activeOp.phase === 'execution') {
            activeOp.battles_this_turn = (activeOp.battles_this_turn ?? 0) + 1;
            activeOp.total_battles = (activeOp.total_battles ?? 0) + 1;
            const activeAxis = activeOp.axes?.find(axis => axis.assigned_brigades.includes(firstAttacker.id as FormationId));
            if (activeAxis) {
                activeAxis.battles_this_turn = (activeAxis.battles_this_turn ?? 0) + 1;
                activeAxis.total_battles = (activeAxis.total_battles ?? 0) + 1;
            }
            if (flip) {
                activeOp.territory_gained_this_turn = (activeOp.territory_gained_this_turn ?? 0) + 1;
                activeOp.total_territory_gained = (activeOp.total_territory_gained ?? 0) + 1;
            }
        }

        // ── AAR narrative queue ───────────────────────────────────────
        // Enqueue significant battles for async narrative generation.
        // Significance: decisive/catastrophic outcome, OR territory flip, OR ≥200 total casualties.
        // Guard: skip in cadet mode (no AI client).
        if (state.meta.ai_commander_config?.mode !== 'cadet') {
            const aarTotalCas = finalAttackerCas + finalDefenderCas;
            const aarSignificant =
                outcome === 'decisive_victory' ||
                outcome === 'catastrophic' ||
                flip ||
                aarTotalCas >= 200;
            if (aarSignificant && attackerCorpsId) {
                (state.military.narrative_queue ??= []).push({
                    faction: attackerFaction,
                    corpsId: attackerCorpsId,
                    input: {
                        officerName: 'Corps Commander',
                        faction: attackerFaction,
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
                    forceRetreatWithPenalties(state, defenderFormation, reverseMap, targetOsid, { adjacency, friendlyOsids: getFriendlyForFaction(defenderFormation.faction as string) });
                }
            } else {
                // Sector-coverage defender: DO NOT change location_osid.
                // Apply morale/disruption penalties at their current position —
                // losing a covered OSID is demoralizing and disrupts the formation,
                // but the brigade stays where it physically is.
                applyDefeatPenalties(defenderFormation, targetOsid, state.meta?.turn ?? 0, outcome);
            }
        }

        // === POST-BATTLE MORALE EFFECTS (extracted to attack_post_battle_effects.ts) ===
        applyPostBattleMorale({ attackerFormations, defenderFormation, outcome, flip, moraleAbsorbed });

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
                    forceRetreatWithPenalties(state, otherFormation, reverseMap, targetOsid, { adjacency, friendlyOsids: getFriendlyForFaction(f.faction as string) });
                }
            }
        }

        // === BRIGADE HISTORY RECORDING ===
        recordBattleHistory({
            attackerFormations,
            defenderFormation,
            sectorDefenseBrigades,
            sectorBrigadeWeights,
            currentTurn,
            targetOsid,
            outcome,
            attackerFaction,
            controller,
            flip,
            finalAttackerCas,
            finalDefenderCas,
            state,
            battleId,
            battleEquipDefenderTanksLost,
            battleEquipDefenderArtLost,
            battleEquipAttackerTanksLost,
            battleEquipAttackerArtLost,
            battleEquipCapturedBy,
            battleEquipCapturedTanks,
            battleEquipCapturedArt,
        });

        // === SECTOR INTEL: RECON BY FORCE ===
        updateSectorIntelFromCombat(state, attackerFormations[0].location_osid ?? targetOsid, targetOsid, currentTurn);

        // === COMBAT FATIGUE ===
        applyCombatFatigue({ attackerFormations, defenderFormation });
    }

    // Final pass: displace any formation still in enemy territory (e.g. moved to an OSID that flipped in a later battle this turn)
    // Rebuild fresh friendly sets — political_controllers changed during combat
    const finalFriendlyCache = new Map<string, Set<string>>();
    const getFinalFriendly = (fac: string): Set<string> => {
        let s = finalFriendlyCache.get(fac);
        if (!s) {
            const pcFinal = state.political?.political_controllers ?? {};
            s = buildFriendlySet(pcFinal, fac);
            finalFriendlyCache.set(fac, s);
        }
        return s;
    };
    const formations = state.military.formations ?? {};
    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid];
        if (!f || f.status !== 'active') continue;
        const loc = (f as { location_osid?: string }).location_osid;
        if (!loc) continue;
        const factionId = f.faction;
        const controller = getPoliticalControllerOSID(state, loc, reverseMap);
        if (controller === factionId) continue;
        const otherFormation = f as FormationState & { location_osid?: string; fallback_osid?: string };
        const retreatDests = getFriendlyRetreatDestinations(state, otherFormation, adjacency, reverseMap);
        const dest = retreatDests[0];
        if (dest != null) {
            otherFormation.location_osid = dest;
            resetFormationEntrenchment(otherFormation);
        } else {
            forceRetreatWithPenalties(state, otherFormation, reverseMap, loc, { adjacency, friendlyOsids: getFinalFriendly(factionId) });
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
