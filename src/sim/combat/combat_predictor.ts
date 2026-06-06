/**
 * OSID-native combat outcome predictor — read-only.
 *
 * Mirrors the power/outcome logic in attack_resolution_osid.ts but does NOT mutate state.
 * Used by bot brigade AIs to decide whether an attack is worth committing to.
 *
 * FOG OF WAR: The predictor intentionally underestimates enemy strength.
 * Commanders don't know exact enemy power before engaging. After a failed
 * attack (tracked via last_retreat_from), the fog lifts for that target.
 *
 * Actual combat resolution in attack_resolution_osid.ts uses REAL values.
 * The predictor's optimistic bias means some attacks will fail, and brigades
 * learn through the retreat mechanic.
 *
 * Deterministic: no randomness, no timestamps.
 * Canon: BOT_AI_DESIGN_SPEC.md §3.1.
 */

import type {
    CorpsFrontSector,
    FactionId,
    FormationId,
    FormationState,
    GameState
} from '../../state/game_state.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import type { SupplyStateByOsidReport } from '../../state/supply_state_derivation.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { OperationalToCanonicalReverseMap, OsidPopulationMap } from '../../data/operational_data.js';
import type { TerrainScalarsData } from '../../map/terrain_scalars.js';
import { getSeasonalModifiers } from './seasonal_effects.js';
import {
    buildOsidAdjacency,
    munFromOsid,
    type Osid
} from './osid_adjacency.js';
import { getTacticalAdjacentOsids } from './tactical_adjacency.js';
import {
    type OsidEthnicComposition,
    getCoEthnicShare,
    getEthnicDefenseBonus,
} from './ethnic_defense.js';
import { botOrdersPerfTime } from './_perf_profile_bot_orders.js';

// ── Shared combat math ──────────────────────────────────────────────────
import {
    type CombatOutcome,
    getMoraleResistFloor,
    BASE_ATTACKER_LOSS_RATE,
    BASE_DEFENDER_LOSS_RATE,
    MILITIA_DEFENSE_RATIO,
    COORDINATION_PENALTY_2,
    COORDINATION_PENALTY_3PLUS,
    STACKING_DEFENDER_SUPPORT,
    MAX_ENTRENCHMENT,
    OUTCOME_ATTACKER_MOD,
    OUTCOME_DEFENDER_MOD,
    COHESION_ATTACKER,
    COHESION_DEFENDER,
    getArtillerySuppression,
    applyDefensiveFireToRatio,
    classifyOutcome,
    computeAttackerPower,
    computeDefenderPower,
    type OfficerCombatLookup,
    buildTerrainMultByOsid,
    getBombardmentCasualtyMult,
    rankDefendersByPower,
    getPowerRatioCasualtyMult,
    MIN_DEFENSE_FLOOR_FRACTION,
    MAX_EDGES_PER_BRIGADE,
    getSectorReactiveDefensePredictionRatio,
    DEFENDER_CASUALTY_ENGAGEMENT_CAP,
    bfsDistanceFriendly,
    getReactiveDistanceWeight,
    HOME_DEFENSE_REACTIVE_BONUS,
    SECTOR_STANCE_REACTIVE_BONUS,
} from './combat_math.js';
import { findSectorForEnemyOsid, findSubSegmentForOsid } from './corps_front_sectors.js';
import { getEnclaveGarrisonPower } from './enclave_resilience.js';
import { getSectorPairIntelConfidence } from './sector_intel.js';
import { buildLocalFrontDensityModifierByFormationIdForSector } from './local_front_defense.js';
import {
    ENABLE_SHARED_SECTOR_DEFENSE,
    getStandingOgDefenseBrigadeIds,
    isStandingOgDefenseBrigadeAvailable,
} from './standing_og_defense.js';

// Backward-compat re-export
export type PredictedOutcome = CombatOutcome;
export type { CombatOutcome };

// ═══════════════════════════════════════════════════════════════════════════
// Predictor-only constants
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Intel-scaled fog of war.
 * fogMult = FOG_BASE + FOG_INTEL_SCALE * confidence
 *   confidence 0.0 (blind):  0.70 — overconfident, bad predictions
 *   confidence 0.5 (moderate): 0.825 — roughly previous default behavior
 *   confidence 1.0 (fresh):   0.95 — near-perfect picture
 */
const FOG_BASE = 0.70;
const FOG_INTEL_SCALE = 0.25;
/** After retreat, local intel is always good — cap applies. */
const FOG_AFTER_RETREAT_CAP = 0.95;

/** Predicted outcome → numeric score for bot target scoring. */
export const OUTCOME_SCORE: Record<CombatOutcome, number> = {
    decisive_victory: 100,
    victory: 80,
    costly_victory: 40,
    stalemate: 18,
    repulsed: -50,
    catastrophic: -200
};

function predictorPerfTime<T>(profilePrefix: string | undefined, labelSuffix: string, fn: () => T): T {
    return profilePrefix ? botOrdersPerfTime(`${profilePrefix}${labelSuffix}`, fn) : fn();
}

type RankedDefenderPowers = {
    primary: FormationState;
    totalPower: number;
    powerByFormationId: Map<string, number>;
};

function rankDefendersByPowerWithEntries(
    defenders: FormationState[],
    sector: CorpsFrontSector | null | undefined,
    state: GameState,
    targetOsid: Osid,
    terrainMultByOsid: Record<string, number>,
    artSuppression: number,
    supplyStateByOsid: SupplyStateByOsidReport | null | undefined,
    ethnicBonusFn: (d: FormationState) => number,
    profilePrefix?: string,
    officerLookup?: OfficerCombatLookup,
): RankedDefenderPowers {
    const defenderPowerProfilePrefix = profilePrefix ? `${profilePrefix}.rankDefendersByPower.computeDefenderPower` : undefined;
    const defenderPowerProfileTime = defenderPowerProfilePrefix
        ? <T>(labelSuffix: string, fn: () => T): T => predictorPerfTime(defenderPowerProfilePrefix, labelSuffix, fn)
        : undefined;
    const frontDensityModifierByFormationId = defenders.length > 1 && sector
        ? predictorPerfTime(
            profilePrefix,
            '.rankDefendersByPower.frontDensityIndex',
            () => buildLocalFrontDensityModifierByFormationIdForSector(sector),
        )
        : undefined;
    const scored = predictorPerfTime(
        profilePrefix,
        '.rankDefendersByPower.computeDefenderPower',
        () => defenders.map((formation) => ({
            formation,
            power: computeDefenderPower(
                state,
                formation,
                targetOsid,
                terrainMultByOsid,
                artSuppression,
                supplyStateByOsid,
                ethnicBonusFn(formation),
                defenderPowerProfileTime,
                frontDensityModifierByFormationId,
                officerLookup,
            ),
        })),
    );
    return predictorPerfTime(profilePrefix, '.rankDefendersByPower.sortAndTotal', () => {
        const sorted = [...scored].sort((a, b) => b.power - a.power);
        const totalPower = sorted[0]!.power + sorted.slice(1).reduce(
            (sum, entry) => sum + entry.power * STACKING_DEFENDER_SUPPORT,
            0,
        );
        const powerByFormationId = new Map(scored.map(({ formation, power }) => [formation.id, power]));
        return { primary: sorted[0]!.formation, totalPower, powerByFormationId };
    });
}

function collectDefenderFormationsAtTarget(
    state: GameState,
    targetOsid: Osid,
    attackerFaction: FactionId,
    profilePrefix?: string,
): FormationState[] {
    return predictorPerfTime(profilePrefix, '.defenderFormationScan', () =>
        (Object.values(state.military.formations ?? {}) as FormationState[])
            .filter(f => f.status === 'active' && f.location_osid === targetOsid && f.faction !== attackerFaction)
            .sort((a, b) => strictCompare(a.id, b.id))
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface CombatPrediction {
    attacker_power: number;
    defender_power: number;
    power_ratio: number;
    predicted_outcome: CombatOutcome;
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
    /** Number of neighbors of the target that would be friendly after capture (1 = salient tip, 0 = would be surrounded). Used to avoid cut-off risk. */
    friendly_neighbors_after_capture: number;
    defender_has_brigade: boolean;
    defender_disrupted: boolean;
    defender_cohesion: number;
    /** Phase B: sub-segment responsible for defending this OSID (undefined if no sub-segment found). */
    defending_sub_segment_id?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Terrain cache (public API for consumers)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build defender terrain multiplier cache. Call once per turn.
 * Delegates to shared buildTerrainMultByOsid.
 */
export function buildTerrainCache(
    reverseMap: OperationalToCanonicalReverseMap,
    terrainData?: TerrainScalarsData | null
): Record<string, number> {
    return buildTerrainMultByOsid(reverseMap, terrainData);
}

// ═══════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Predict combat outcome for an attacker brigade vs a target OSID.
 *
 * Uses the same formulas as attack_resolution_osid.ts but with FOG OF WAR:
 * defender power is discounted because commanders don't know exact enemy strength.
 *
 * @param attackerPosture — override posture to use for attack power ('attack' or 'assault')
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
    additionalAttackers?: FormationId[],
    supplyStateByOsid?: SupplyStateByOsidReport | null,
    osidPopulationMap?: OsidPopulationMap | null,
    slopeByOsid?: Record<string, number> | null,
    ethnicComposition?: OsidEthnicComposition | null,
    profilePrefix?: string,
    officerLookup?: OfficerCombatLookup,
): CombatPrediction | null {
    const attacker = state.military.formations?.[attackerId];
    if (!attacker || attacker.status !== 'active') return null;

    const attackerLoc = attacker.location_osid;
    if (!attackerLoc) return null;

    const neighbors = getTacticalAdjacentOsids(state, attackerLoc as Osid, adjacency);
    if (!neighbors.includes(targetOsid)) return null;

    const attackerFaction = attacker.faction;

    const allAttackerIds = [attackerId, ...(additionalAttackers ?? [])];
    const attackerFormations = allAttackerIds
        .map(id => state.military.formations?.[id])
        .filter((f): f is FormationState => f != null && f.status === 'active');
    if (attackerFormations.length === 0) return null;

    let defenderFormations: FormationState[] | null = null;
    const getDefenderFormations = (): FormationState[] => {
        defenderFormations ??= collectDefenderFormationsAtTarget(
            state,
            targetOsid,
            attackerFaction,
            profilePrefix,
        );
        return defenderFormations;
    };

    const controller = predictorPerfTime(
        profilePrefix,
        '.controller',
        () => getPoliticalControllerOSID(state, targetOsid, reverseMap),
    );
    const isEnemyControlled = controller !== null && controller !== attackerFaction;

    let defenderPower: number;
    let defenderFormation: FormationState | null = null;
    let defenderHasBrigade = false;
    let defenderDisrupted = false;
    let defenderCohesion = 60;
    let sectorDefBrigades: FormationState[] | null = null;
    // Phase B: sub-segment responsible for defending this OSID
    let defendingSubSegmentId: string | undefined;
    const artSuppression = predictorPerfTime(
        profilePrefix,
        '.artSuppression',
        () => getArtillerySuppression(attackerFormations, attackerFaction, state),
    );

    // Fog of war: did this brigade previously fail at this target?
    const currentTurn = state.meta?.turn ?? 0;
    const retreatInfo = (attacker as { last_retreat_from?: { osid: string; turn: number } }).last_retreat_from;
    const repulseInfo = (attacker as { last_repulsed_from?: { osid: string; turn: number } }).last_repulsed_from;
    const learnedFromTarget =
        (retreatInfo != null && retreatInfo.osid === targetOsid && currentTurn - retreatInfo.turn <= 3) ||
        (repulseInfo != null && repulseInfo.osid === targetOsid && currentTurn - repulseInfo.turn <= 3);

    const ethBonus = (d: FormationState) => getEthnicDefenseBonus(getCoEthnicShare(targetOsid, d.faction, ethnicComposition));

    // ── Distance-weighted sector defense (mirrors resolver) ─────────
    // Physical defenders at OSID fight at full power. Reserves contribute
    // proportional to BFS distance + home-municipality bonus.
    if (isEnemyControlled) {
        const sector = predictorPerfTime(
            profilePrefix,
            '.sectorLookup',
            () => findSectorForEnemyOsid(state, targetOsid, controller),
        );
        // Phase B: identify which sub-segment is responsible for this OSID
        const defendingSubSeg = sector ? findSubSegmentForOsid(sector, targetOsid) : undefined;
        defendingSubSegmentId = defendingSubSeg?.sub_segment_id;
        const sectorBrigades = predictorPerfTime(
            profilePrefix,
            '.sectorBrigades',
            () => sector
                ? getStandingOgDefenseBrigadeIds(sector, ENABLE_SHARED_SECTOR_DEFENSE)
                    .map(id => state.military.formations?.[id])
                    .filter((f): f is FormationState =>
                        f != null
                        && f.status === 'active'
                        && isStandingOgDefenseBrigadeAvailable(state, f.id, ENABLE_SHARED_SECTOR_DEFENSE)
                    )
                : [],
        );
        if (sectorBrigades.length > 0) {
            defenderHasBrigade = true;
            const { primary, totalPower, powerByFormationId } = predictorPerfTime(
                profilePrefix,
                '.rankDefendersByPower',
                () => rankDefendersByPowerWithEntries(sectorBrigades, sector, state, targetOsid, terrainMultByOsid, artSuppression, supplyStateByOsid, ethBonus, profilePrefix, officerLookup),
            );
            const avgBrigadePower = totalPower / sectorBrigades.length;
            const attackerCount = 1 + (additionalAttackers?.length ?? 0);
            const targetMun = munFromOsid(targetOsid);
            const pc = state.political?.political_controllers ?? {};

            // Per-brigade distance-weighted contribution
            const { physicalPower, effectiveReserves, contributingBrigadeCount } = predictorPerfTime(
                profilePrefix,
                '.sectorDefensePower',
                () => {
                    let physicalPower = 0;
                    let effectiveReserves = 0;
                    let contributingBrigadeCount = 0;
                    for (const b of sectorBrigades) {
                        const locOsid = (b as { location_osid?: string }).location_osid ?? '';
                        const bPower = powerByFormationId.get(b.id) ?? computeDefenderPower(
                            state,
                            b,
                            targetOsid as Osid,
                            terrainMultByOsid,
                            artSuppression,
                            supplyStateByOsid,
                            ethBonus(b),
                        );
                        const homeMun = munFromOsid((b as { home_osid?: string }).home_osid ?? '');
                        const homeBonus = (homeMun && homeMun === targetMun) ? HOME_DEFENSE_REACTIVE_BONUS : 1.0;
                        if (locOsid === targetOsid) {
                            physicalPower += bPower;
                            if (bPower * homeBonus > 0) contributingBrigadeCount += 1;
                        } else {
                            const hops = bfsDistanceFriendly(locOsid, targetOsid, adjacency, pc, controller!);
                            const distWeight = getReactiveDistanceWeight(hops);
                            const contribution = bPower * distWeight * homeBonus;
                            effectiveReserves += contribution;
                            if (contribution > 0) contributingBrigadeCount += 1;
                        }
                    }
                    return { physicalPower, effectiveReserves, contributingBrigadeCount };
                }
            );

            // Apply sector stance reactive bonus (Layer B)
            const stanceReactiveBonus = SECTOR_STANCE_REACTIVE_BONUS[sector?.sector_stance ?? 'defend'];
            const boostedReserves = effectiveReserves * stanceReactiveBonus;

            const avgReactivePower = ENABLE_SHARED_SECTOR_DEFENSE && contributingBrigadeCount > 0
                ? (physicalPower + effectiveReserves) / contributingBrigadeCount
                : avgBrigadePower;
            const reactiveResponse = Math.min(
                boostedReserves,
                attackerCount * avgReactivePower * getSectorReactiveDefensePredictionRatio(ENABLE_SHARED_SECTOR_DEFENSE)
            );
            const baseDef = physicalPower + reactiveResponse;
            const minFloor = avgReactivePower * MIN_DEFENSE_FLOOR_FRACTION;
            // Intel-scaled fog: look up sector-pair confidence for this attacker vs defender sector
            const sectorConf = sector ? getSectorPairIntelConfidence(state, attackerLoc, sector.sector_id) : 0;
            const intelFog = FOG_BASE + FOG_INTEL_SCALE * sectorConf;
            // After retreat/repulse, brigade has direct combat intel — fog is at least FOG_AFTER_RETREAT_CAP
            const fogMult = learnedFromTarget ? Math.max(intelFog, FOG_AFTER_RETREAT_CAP) : intelFog;
            defenderPower = Math.max(baseDef, minFloor) * fogMult;
            defenderFormation = primary;
            sectorDefBrigades = sectorBrigades;
            defenderDisrupted = ((defenderFormation as { disrupted_turns?: number }).disrupted_turns ?? 0) > 0 || defenderFormation.disrupted === true;
            defenderCohesion = defenderFormation.cohesion ?? 60;
        } else {
            const fallbackDefenders = getDefenderFormations();
            if (fallbackDefenders.length > 0) {
                // Brigade at OSID but not in any sector (enclave/garrison edge case)
                // No sector → no intel → blind (confidence 0)
                defenderHasBrigade = true;
                const { primary, totalPower } = predictorPerfTime(
                    profilePrefix,
                    '.rankDefendersByPower',
                    () => rankDefendersByPower(fallbackDefenders, state, targetOsid, terrainMultByOsid, artSuppression, supplyStateByOsid, ethBonus),
                );
                const noSectorFog = learnedFromTarget ? FOG_AFTER_RETREAT_CAP : FOG_BASE;
                defenderPower = totalPower * noSectorFog;
                defenderFormation = primary;
                defenderDisrupted = ((defenderFormation as { disrupted_turns?: number }).disrupted_turns ?? 0) > 0 || defenderFormation.disrupted === true;
                defenderCohesion = defenderFormation.cohesion ?? 60;
            } else {
                // Truly undefended: no sector, no brigade — militia ghost only
                defenderPower = (osidPopulationMap?.get(targetOsid) ?? 5000) * MILITIA_DEFENSE_RATIO * 0.25;
            }
        }
    } else {
        const fallbackDefenders = getDefenderFormations();
        if (fallbackDefenders.length > 0) {
            // Not enemy-controlled territory but enemy brigade present — no sector intel available
            defenderHasBrigade = true;
            const { primary, totalPower } = predictorPerfTime(
                profilePrefix,
                '.rankDefendersByPower',
                () => rankDefendersByPower(fallbackDefenders, state, targetOsid, terrainMultByOsid, artSuppression, supplyStateByOsid, ethBonus),
            );
            const noSectorFog2 = learnedFromTarget ? FOG_AFTER_RETREAT_CAP : FOG_BASE;
            defenderPower = totalPower * noSectorFog2;
            defenderFormation = primary;
            defenderDisrupted = ((defenderFormation as { disrupted_turns?: number }).disrupted_turns ?? 0) > 0 || defenderFormation.disrupted === true;
            defenderCohesion = defenderFormation.cohesion ?? 60;
        } else {
            return null;
        }
    }

    // Enclave garrison: organized civilian defense (same as resolver)
    const garrisonPower = getEnclaveGarrisonPower(
        state, targetOsid, osidPopulationMap?.get(targetOsid) ?? 0
    );
    defenderPower += garrisonPower;

    const coordPenalty = attackerFormations.length >= 3 ? COORDINATION_PENALTY_3PLUS
        : attackerFormations.length === 2 ? COORDINATION_PENALTY_2 : 1.0;
    const targetSlope = slopeByOsid?.[targetOsid] ?? 0;
    const seasonal = getSeasonalModifiers(currentTurn, state.meta?.scenario_start_date, targetSlope);
    // Predictor default: 'attack' posture (if no override provided, assume attack intent).
    // Resolver default: 'defend' (formation.posture is always set for ordered brigades).
    const effectivePosture = attackerPosture ?? 'attack';
    const targetTerrainMult = terrainMultByOsid[targetOsid] ?? 1.0;
    const attackerPower = predictorPerfTime(
        profilePrefix,
        '.attackerPower',
        () => attackerFormations.reduce(
            (s, a) => s + computeAttackerPower(state, a, supplyStateByOsid, effectivePosture, targetTerrainMult, targetOsid), 0
        ) * coordPenalty * seasonal.attack_mult,
    );
    defenderPower *= seasonal.defense_mult;

    // COMBAT-P14: fold defender RETURN-FIRE into the predicted power ratio so the
    // bot anticipates the extra attacker cost of assaulting a high-return-fire
    // (artillery-heavy / tank-backed) defender. The resolver
    // (attack_resolution_osid.ts) applies getDefensiveFireMult as an attacker-
    // casualty multiplier AFTER outcome/powerRatio are fixed, so this predictor was
    // blind to return-fire and stayed over-optimistic (zero-effect assaults on
    // dug-in VRS artillery). applyDefensiveFireToRatio REUSES the resolver's
    // getDefensiveFireMult (no parallel formula) on the SAME true defender set the
    // resolver will see (sectorDefBrigades, else the primary defenderFormation),
    // degrading the effective ratio by the bounded return-fire tax (÷[1.0,1.8]).
    // Soft targets (no artillery/armour) are unchanged. No double-counting:
    // entrenchment/terrain/artillery-suppression already live in defenderPower.
    const returnFireDefenders = sectorDefBrigades && sectorDefBrigades.length > 0
        ? sectorDefBrigades
        : defenderFormation ? [defenderFormation] : [];
    const returnFireFactionId = controller ?? defenderFormation?.faction ?? attackerFaction;
    const rawPowerRatio = defenderPower <= 0 ? 10 : attackerPower / defenderPower;
    const powerRatio = applyDefensiveFireToRatio(
        rawPowerRatio,
        returnFireDefenders,
        returnFireFactionId,
        state,
    );
    let predicted = classifyOutcome(powerRatio);

    // Morale resistance: downgrade costly_victory to stalemate if defender morale is high
    const defenderMorale = defenderFormation?.morale ?? 60;
    const defenderFactionId = defenderFormation?.faction as string ?? '';
    if (predicted === 'costly_victory' && defenderMorale >= getMoraleResistFloor(defenderFactionId)) {
        predicted = 'stalemate';
    }

    const {
        personnelAttacker,
        personnelDefender,
        expectedAttCas,
        expectedDefCas,
    } = predictorPerfTime(profilePrefix, '.casualties', () => {
        const personnelAttacker = attackerFormations.reduce((s, a) => s + (a.personnel ?? 0), 0);
        // Sector defense: use total sector personnel as casualty base (mirrors resolver fix n590)
        // n647 fix: cap engaged defender personnel at DEFENDER_CASUALTY_ENGAGEMENT_CAP x attacker
        const rawPersonnelDefender = sectorDefBrigades && sectorDefBrigades.length > 1
            ? sectorDefBrigades.reduce((s, b) => s + (b.personnel ?? 0), 0)
            : defenderFormation ? (defenderFormation.personnel ?? 0) : 5000 * MILITIA_DEFENSE_RATIO;
        const personnelDefender = sectorDefBrigades && sectorDefBrigades.length > 1
            ? Math.min(rawPersonnelDefender, personnelAttacker * DEFENDER_CASUALTY_ENGAGEMENT_CAP)
            : rawPersonnelDefender;
        const bombardmentMult = getBombardmentCasualtyMult(attackerFormations, attackerFaction, state);
        const [attCasMult, defCasMult] = getPowerRatioCasualtyMult(powerRatio);
        const baseAttCas = personnelAttacker * BASE_ATTACKER_LOSS_RATE * (OUTCOME_ATTACKER_MOD[predicted] ?? 1) * attCasMult;
        const baseDefCas = personnelDefender * BASE_DEFENDER_LOSS_RATE * (OUTCOME_DEFENDER_MOD[predicted] ?? 1) * bombardmentMult * defCasMult;
        const expectedAttCas = Math.max(0, Math.round(baseAttCas));
        const expectedDefCas = Math.max(0, Math.round(baseDefCas));
        return { personnelAttacker, personnelDefender, expectedAttCas, expectedDefCas };
    });

    const defEntTurns = defenderFormation
        ? Math.min(MAX_ENTRENCHMENT, (defenderFormation as { entrenchment_turns?: number }).entrenchment_turns ?? 0)
        : 0;

    const isCounterAttack = false;

    const { enemyAdj, friendlyNeighborsAfterCapture } = predictorPerfTime(profilePrefix, '.overextension', () => {
        const targetNeighbors = getTacticalAdjacentOsids(state, targetOsid as Osid, adjacency);
        let enemyAdj = 0;
        for (const n of targetNeighbors) {
            const c = getPoliticalControllerOSID(state, n, reverseMap);
            if (c !== null && c !== attackerFaction) enemyAdj++;
        }
        const friendlyNeighborsAfterCapture = targetNeighbors.length - enemyAdj;
        return { enemyAdj, friendlyNeighborsAfterCapture };
    });

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
        friendly_neighbors_after_capture: friendlyNeighborsAfterCapture,
        defender_has_brigade: defenderHasBrigade,
        defender_disrupted: defenderDisrupted,
        defender_cohesion: defenderCohesion,
        defending_sub_segment_id: defendingSubSegmentId,
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
    attackerPosture?: string,
    supplyStateByOsid?: SupplyStateByOsidReport | null,
    osidPopulationMap?: OsidPopulationMap | null,
    slopeByOsid?: Record<string, number> | null,
    ethnicComposition?: OsidEthnicComposition | null
): Array<{ osid: Osid; prediction: CombatPrediction }> {
    const attacker = state.military.formations?.[attackerId];
    if (!attacker || attacker.status !== 'active') return [];
    const loc = attacker.location_osid;
    if (!loc) return [];
    const factionId = attacker.faction;

    const results: Array<{ osid: Osid; prediction: CombatPrediction }> = [];

    for (const n of getTacticalAdjacentOsids(state, loc as Osid, adjacency)) {
        const controller = getPoliticalControllerOSID(state, n, reverseMap);
        if (controller === null || controller === factionId) continue;
        const pred = predictCombatOutcome(state, attackerId, n, adjacency, reverseMap, terrainMultByOsid, attackerPosture, undefined, supplyStateByOsid, osidPopulationMap, slopeByOsid, ethnicComposition);
        if (pred) results.push({ osid: n, prediction: pred });
    }

    results.sort((a, b) => {
        if (b.prediction.power_ratio !== a.prediction.power_ratio) return b.prediction.power_ratio - a.prediction.power_ratio;
        return strictCompare(a.osid, b.osid);
    });

    return results;
}
