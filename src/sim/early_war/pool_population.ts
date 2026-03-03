/**
 * Phase I: Militia pool population from war_militia_strength and displacement.
 * Plan: militia_and_brigade_formation_system.
 * Deterministic: mun_id then faction sorted; displaced contribution by controller.
 */

import type { SettlementRecord } from '../../map/settlements.js';
import type {
    DisplacementState,
    FactionId,
    GameState,
    MilitiaPoolState,
    MunicipalityId
} from '../../state/game_state.js';
import {
    SIEGE_RATIO_FULL,
    SIEGE_RATIO_MOSTLY,
    SIEGE_RATIO_PARTIAL
} from '../../state/formation_constants.js';
import { militiaPoolKey } from '../../state/militia_pool_key.js';
import { strictCompare } from '../../state/validateGameState.js';
import { buildSettlementsByMun, getMunicipalityController } from './control_strain.js';
import { type SiegeRatioByMunFaction, getSiegeRatio } from './compute_siege_state.js';

/** Re-export for consumers that import from pool_population (e.g. ongoing_mobilization). */
export { buildSettlementsByMun, getMunicipalityController };

/** Scale war_militia_strength [0,100] to pool available (integer).
 * Raised for long-horizon (52w/104w) personnel growth calibration while keeping deterministic flow. */
const POOL_SCALE_FACTOR = 65;
/** Displaced_in contribution rate per turn (acute phase: first 8 weeks of war).
 * Higher rate reflects urgent mobilization of newly displaced military-age men. */
const REINFORCEMENT_RATE_ACUTE = 0.04;
/** Displaced_in contribution rate per turn (sustained phase: after 8 weeks).
 * At 0.01, ~50% mobilized over 52 turns which is still generous but tracks "total war" mobilization. */
const REINFORCEMENT_RATE_SUSTAINED = 0.01;
/** Number of weeks the acute displacement mobilization rate applies. */
const ACUTE_DISPLACEMENT_WEEKS = 8;
/** Cap per mun per turn from displaced. Raised from 500 to allow acute-phase surge. */
const DISPLACED_CONTRIBUTION_CAP = 800;

/** When population1991 is used, pool is weighted by eligible pop / this normalizer (no cap). Aim: ARBiH ~80–100 brigades at batchSize 1000. */
const ELIGIBLE_POP_NORMALIZER = 50_000;

/** Faction asymmetry calibration for early-war manpower envelopes.
 * Reflects mobilization capacity: ARBiH largest (Bosniak plurality), VRS JNA inheritance,
 * HVO smallest but ~30-40k historical. HRHB scale is higher because Croat population
 * is concentrated in fewer municipalities — each HVO-controlled mun mobilized proportionally
 * more of its population (near-total male mobilization in western Herzegovina). */
/** Holistic tuning: RBiH 1.20→0.85→0.60 — manpower-rich but equipment-poor, many unarmed.
 * At 0.85 + displacement, ARBiH grew to 167k (target 100-110k). At 0.60, expect ~110-120k.
 * Historical: ARBiH couldn't convert population into combat power until mid-1993 professionalization. */
/** Holistic tuning log:
 * RBiH: 1.20→0.85→0.60→0.40→0.30→0.24→0.20→0.18. At 0.20: 120k. 0.18: 127k (n233).
 * RS: 1.00→0.70→0.55→0.45→0.40→0.35. At 0.40: 111k. 0.35: 113k (n233).
 * HRHB: 1.60 (unchanged). At 1.60: 42k end (target ~40k). On target.
 * Note: pool scale diminishing returns below 0.25 — troop growth driven by elective recruitment capital. */
const FACTION_POOL_SCALE: Record<string, number> = {
    RBiH: 0.18,
    RS: 0.25,
    HRHB: 1.55    // n375: 1.70→47k. Target 42k; reducing to 1.55.
};
const DEFAULT_FACTION_POOL_SCALE = 1.0;

export type MunicipalityPopulation1991Map = Record<
    string,
    { total: number; bosniak: number; serb: number; croat: number; other: number }
>;

function getEligiblePopulation(
    pop: MunicipalityPopulation1991Map | undefined,
    munId: string,
    factionId: string
): number {
    if (!pop) return ELIGIBLE_POP_NORMALIZER;
    const entry = pop[munId];
    if (!entry) return ELIGIBLE_POP_NORMALIZER;
    if (factionId === 'RBiH') return entry.bosniak;
    if (factionId === 'RS') return entry.serb;
    if (factionId === 'HRHB') return entry.croat;
    return ELIGIBLE_POP_NORMALIZER;
}

/** Faction-eligible 1991 population in mun (for demographic gating). Returns 0 when no data or no entry. */
export function getEligiblePopulationCount(
    pop: MunicipalityPopulation1991Map | undefined,
    munId: string,
    factionId: string
): number {
    if (!pop) return 0;
    const entry = pop[munId];
    if (!entry) return 0;
    if (factionId === 'RBiH') return entry.bosniak;
    if (factionId === 'RS') return entry.serb;
    if (factionId === 'HRHB') return entry.croat;
    return 0;
}

/** RBiH cross-ethnic rule: Serbs and Croats contribute 10–15% to RBiH pool (MILITIA_BRIGADE_FORMATION_DESIGN §3). */
const RBIH_CROSS_ETHNIC_SHARE = 0.12;
/** RBiH cross-ethnic cap per mun per turn. */
const RBIH_CROSS_ETHNIC_CAP_PER_MUN = 500;

/**
 * RS JNA inheritance: one-time pool bonus at scenario init (12 May 1992).
 * Includes JNA regulars (~10K), trained reservists (~15K), and TO cadres (~5K)
 * absorbed by VRS during May-June 1992 handover. Calibrated to historical RS start ~80K.
 * n369: 12k undershoot VRS to 79k; restored to 15k.
 */
const RS_JNA_INHERITANCE_BONUS = 15_000;

export interface RsJnaInheritanceReport {
    total_added: number;
    pools_updated: number;
}

/**
 * Apply one-time RS JNA inheritance bonus to RS militia pools. Distribution proportional to eligible Serb population.
 * Call after runPoolPopulation at scenario init. Deterministic: sorted pool keys.
 */
export function applyRsJnaInheritanceBonus(
    state: GameState,
    population1991ByMun?: MunicipalityPopulation1991Map
): RsJnaInheritanceReport {
    const report: RsJnaInheritanceReport = { total_added: 0, pools_updated: 0 };
    if (!state.militia_pools || typeof state.militia_pools !== 'object') return report;
    if (!population1991ByMun || Object.keys(population1991ByMun).length === 0) return report;
    const pools = state.militia_pools as Record<string, MilitiaPoolState>;
    const currentTurn = state.meta.turn;

    const rsPoolKeys = (Object.keys(pools) as string[]).filter((k) => pools[k].faction === 'RS').sort(strictCompare);
    if (rsPoolKeys.length === 0) return report;

    let totalEligible = 0;
    const eligibleByKey: Record<string, number> = {};
    for (const key of rsPoolKeys) {
        const pool = pools[key];
        const munId = pool.mun_id;
        const serb = getEligiblePopulationCount(population1991ByMun, munId, 'RS');
        eligibleByKey[key] = serb;
        totalEligible += serb;
    }

    if (totalEligible <= 0) {
        const evenShare = Math.floor(RS_JNA_INHERITANCE_BONUS / rsPoolKeys.length);
        for (const key of rsPoolKeys) {
            pools[key].available += evenShare;
            pools[key].updated_turn = currentTurn;
            report.total_added += evenShare;
            report.pools_updated += 1;
        }
        return report;
    }

    let allocated = 0;
    for (const key of rsPoolKeys) {
        const share = eligibleByKey[key]! / totalEligible;
        const add = Math.floor(RS_JNA_INHERITANCE_BONUS * share);
        pools[key].available += add;
        pools[key].updated_turn = currentTurn;
        allocated += add;
        report.pools_updated += 1;
    }
    report.total_added = allocated;
    return report;
}

export interface PoolPopulationReport {
    pools_updated: number;
    pools_created: number;
    displaced_contributions: number;
    rbih_10pct_additions?: number;
}

export interface DisplacedAndCrossEthnicReport {
    displaced_contributions: number;
    rbih_10pct_additions?: number;
}

/**
 * Add displaced-in and RBiH cross-ethnic contributions to militia_pools.
 * Shared by Phase I runPoolPopulation and Phase II ongoing mobilization. Deterministic.
 */
export function runDisplacedAndCrossEthnicContributions(
    state: GameState,
    settlements: Map<string, SettlementRecord>,
    population1991ByMun?: MunicipalityPopulation1991Map
): DisplacedAndCrossEthnicReport {
    const report: DisplacedAndCrossEthnicReport = { displaced_contributions: 0 };
    let rbih10pctTotal = 0;
    if (!state.militia_pools || typeof state.militia_pools !== 'object') {
        (state as GameState & { militia_pools: Record<string, MilitiaPoolState> }).militia_pools = {};
    }
    const pools = state.militia_pools as Record<string, MilitiaPoolState>;
    const currentTurn = state.meta.turn;
    // Acute vs sustained displacement mobilization rate (global heuristic)
    const reinforcementRate = currentTurn <= ACUTE_DISPLACEMENT_WEEKS
        ? REINFORCEMENT_RATE_ACUTE
        : REINFORCEMENT_RATE_SUSTAINED;
    const municipalities = state.municipalities ?? {};
    const munIds = (Object.keys(municipalities) as MunicipalityId[]).slice().sort(strictCompare);
    const settlementsByMun = buildSettlementsByMun(settlements);
    const displacement = state.displacement_state ?? {};
    const displacementMunIds = (Object.keys(displacement) as MunicipalityId[]).slice().sort(strictCompare);

    for (const munId of displacementMunIds) {
        const disp = displacement[munId] as DisplacementState | undefined;
        if (!disp || disp.displaced_in <= 0) continue;
        const sids = settlementsByMun.get(munId);
        if (!sids?.length) continue;
        const byFaction = disp.displaced_in_by_faction;
        if (byFaction && typeof byFaction === 'object') {
            for (const factionId of (Object.keys(byFaction) as FactionId[]).sort(strictCompare)) {
                const displacedForFaction = byFaction[factionId];
                if (displacedForFaction == null || displacedForFaction <= 0) continue;
                const contribution = Math.min(
                    Math.floor(displacedForFaction * reinforcementRate),
                    DISPLACED_CONTRIBUTION_CAP
                );
                if (contribution <= 0) continue;
                const key = militiaPoolKey(munId, factionId);
                const pool = pools[key];
                if (pool) {
                    pool.available += contribution;
                    pool.updated_turn = currentTurn;
                    report.displaced_contributions += 1;
                } else {
                    pools[key] = {
                        mun_id: munId,
                        faction: factionId,
                        available: contribution,
                        committed: 0,
                        exhausted: 0,
                        updated_turn: currentTurn
                    };
                    report.displaced_contributions += 1;
                }
            }
        } else {
            const controller = getMunicipalityController(state, sids, munId);
            if (!controller) continue;
            const contribution = Math.min(
                Math.floor(disp.displaced_in * reinforcementRate),
                DISPLACED_CONTRIBUTION_CAP
            );
            if (contribution <= 0) continue;
            const key = militiaPoolKey(munId, controller);
            const pool = pools[key];
            if (pool) {
                pool.available += contribution;
                pool.updated_turn = currentTurn;
                report.displaced_contributions += 1;
            } else {
                pools[key] = {
                    mun_id: munId,
                    faction: controller,
                    available: contribution,
                    committed: 0,
                    exhausted: 0,
                    updated_turn: currentTurn
                };
                report.displaced_contributions += 1;
            }
        }
    }

    const formations = state.formations ?? {};
    const hasRBiHBrigade = Object.values(formations).some(
        (f) => f && typeof f === 'object' && (f as { faction?: string; kind?: string }).faction === 'RBiH' && (f as { kind?: string }).kind === 'brigade'
    );
    if (hasRBiHBrigade && population1991ByMun) {
        for (const munId of munIds) {
            const sids = settlementsByMun.get(munId);
            if (!sids?.length) continue;
            const controller = getMunicipalityController(state, sids, munId);
            if (controller !== 'RBiH') continue;
            const entry = population1991ByMun[munId];
            if (!entry) continue;
            const nonBosniak = entry.serb + entry.croat + entry.other;
            if (nonBosniak <= 0) continue;
            const rawContribution = Math.floor(
                (nonBosniak / ELIGIBLE_POP_NORMALIZER) * POOL_SCALE_FACTOR * RBIH_CROSS_ETHNIC_SHARE
            );
            const contribution = Math.min(rawContribution, RBIH_CROSS_ETHNIC_CAP_PER_MUN);
            if (contribution <= 0) continue;
            const key = militiaPoolKey(munId, 'RBiH');
            const pool = pools[key];
            if (pool) {
                pool.available += contribution;
                pool.updated_turn = currentTurn;
            } else {
                pools[key] = {
                    mun_id: munId,
                    faction: 'RBiH',
                    available: contribution,
                    committed: 0,
                    exhausted: 0,
                    updated_turn: currentTurn
                };
            }
            rbih10pctTotal += contribution;
        }
        if (rbih10pctTotal > 0) report.rbih_10pct_additions = rbih10pctTotal;
    }
    return report;
}

/**
 * Update militia_pools from war_militia_strength and (optionally) displaced_in.
 * Uses composite key "mun_id:faction". Does not decrease available; only adds or sets from strength.
 * When population1991ByMun is provided, pool available is weighted by eligible population (bosniak/serb/croat)
 * so that brigade counts reflect demographics — ARBiH gets most where Bosniaks are, etc.
 * Preserves committed, exhausted, updated_turn.
 *
 * When siegeRatios is provided (Phase F Step 24), pool growth is multiplied by a siege bonus:
 *   siege_ratio >= SIEGE_RATIO_FULL (0.90) → 3.0× growth
 *   siege_ratio >= SIEGE_RATIO_MOSTLY (0.75) → 2.0× growth
 *   siege_ratio >= SIEGE_RATIO_PARTIAL (0.50) → 1.5× growth
 *   otherwise → 1.0× (no change)
 * This reflects the historical total-war mobilization in besieged enclaves (Sarajevo, Bihac, Srebrenica).
 */
export function runPoolPopulation(
    state: GameState,
    settlements: Map<string, SettlementRecord>,
    population1991ByMun?: MunicipalityPopulation1991Map,
    siegeRatios?: SiegeRatioByMunFaction
): PoolPopulationReport {
    const report: PoolPopulationReport = {
        pools_updated: 0,
        pools_created: 0,
        displaced_contributions: 0
    };

    if (!state.militia_pools || typeof state.militia_pools !== 'object') {
        (state as GameState & { militia_pools: Record<string, MilitiaPoolState> }).militia_pools = {};
    }
    const pools = state.militia_pools as Record<string, MilitiaPoolState>;
    const currentTurn = state.meta.turn;
    const strengthMap = state.war_militia_strength ?? {};
    const municipalities = state.municipalities ?? {};
    const munIds = (Object.keys(municipalities) as MunicipalityId[]).slice().sort(strictCompare);
    const factionIds: FactionId[] = (state.factions ?? [])
        .map((f) => f.id)
        .filter((x): x is FactionId => typeof x === 'string')
        .slice()
        .sort(strictCompare);

    // 1) From war_militia_strength: ensure (mun_id, faction) pools and set available
    for (const munId of munIds) {
        const byFaction = strengthMap[munId] ?? {};
        for (const factionId of factionIds) {
            const strength = byFaction[factionId] ?? 0;
            if (strength <= 0) continue;

            const eligiblePop = getEligiblePopulation(population1991ByMun, munId, factionId);
            const populationWeight =
                population1991ByMun != null ? eligiblePop / ELIGIBLE_POP_NORMALIZER : 1;
            const factionScale = FACTION_POOL_SCALE[factionId] ?? DEFAULT_FACTION_POOL_SCALE;

            const key = militiaPoolKey(munId, factionId);
            const existing = pools[key];
            // Phase F Step 24: siege mobilization multiplier
            const siegeRatio = getSiegeRatio(siegeRatios ?? new Map(), munId, factionId);
            const siegeMult = siegeRatio >= SIEGE_RATIO_FULL ? 3.0
                : siegeRatio >= SIEGE_RATIO_MOSTLY ? 2.0
                : siegeRatio >= SIEGE_RATIO_PARTIAL ? 1.5
                : 1.0;
            let derivedAvailable = Math.floor(strength * POOL_SCALE_FACTOR * populationWeight * factionScale * siegeMult);
            const authorityState = state.municipalities?.[munId]?.control ?? 'consolidated';
            if (authorityState === 'contested') derivedAvailable = Math.floor(derivedAvailable * 0.85);
            else if (authorityState === 'fragmented') derivedAvailable = Math.floor(derivedAvailable * 0.7);
            const newAvailable = existing
                ? Math.max(existing.available, derivedAvailable)
                : derivedAvailable;

            if (existing) {
                if (newAvailable > existing.available) {
                    existing.available = newAvailable;
                    existing.updated_turn = currentTurn;
                    report.pools_updated += 1;
                }
            } else {
                pools[key] = {
                    mun_id: munId,
                    faction: factionId,
                    available: newAvailable,
                    committed: 0,
                    exhausted: 0,
                    updated_turn: currentTurn
                };
                report.pools_created += 1;
            }
        }
    }

    // 2) Displaced + 3) RBiH cross-ethnic: shared path (Phase I and Phase II).
    const displacedReport = runDisplacedAndCrossEthnicContributions(state, settlements, population1991ByMun);
    report.displaced_contributions = displacedReport.displaced_contributions;
    if (displacedReport.rbih_10pct_additions != null) report.rbih_10pct_additions = displacedReport.rbih_10pct_additions;

    return report;
}

export interface CasualtyPoolExhaustionReport {
    formations_processed: number;
    total_exhaustion_added: number;
    by_faction: Record<string, number>;
}

/**
 * Apply casualty-driven pool exhaustion: killed + missing_captured from battle
 * casualties feed back into the origin municipality's pool.exhausted.
 * This ensures the exhaustion gating in ongoing_mobilization activates when
 * a municipality's demographic base is being consumed by combat losses.
 *
 * Deterministic: sorted formation IDs.
 */
export function applyCasualtyPoolExhaustion(
    state: GameState,
    battleCasualties: Array<{ formation_id: string; faction: string; killed: number; missing_captured: number }>
): CasualtyPoolExhaustionReport {
    const report: CasualtyPoolExhaustionReport = {
        formations_processed: 0,
        total_exhaustion_added: 0,
        by_faction: {}
    };

    if (!state.militia_pools || typeof state.militia_pools !== 'object') return report;
    const pools = state.militia_pools as Record<string, MilitiaPoolState>;

    for (const cas of battleCasualties) {
        const formation = state.formations?.[cas.formation_id];
        if (!formation) continue;
        const originMun = formation.origin_mun;
        if (!originMun) continue;

        const permanentLoss = cas.killed + cas.missing_captured;
        if (permanentLoss <= 0) continue;

        const key = militiaPoolKey(originMun, cas.faction);
        const pool = pools[key];
        if (!pool) continue;

        pool.exhausted = (pool.exhausted ?? 0) + permanentLoss;
        report.formations_processed += 1;
        report.total_exhaustion_added += permanentLoss;
        report.by_faction[cas.faction] = (report.by_faction[cas.faction] ?? 0) + permanentLoss;
    }

    return report;
}

