/**
 * Phase II: Per-turn pool growth from conscription, displacement, and cross-ethnic contributions.
 * Runs before phase-ii-brigade-reinforcement so freshly mobilized manpower is available same turn.
 * Deterministic: sorted mun_id then faction; controller tie-break by localeCompare.
 */

import type { SettlementRecord } from '../../map/settlements.js';
import type {
    FactionId,
    GameState,
    MilitiaPoolState,
    MunicipalityId
} from '../../state/game_state.js';
import { militiaPoolKey } from '../../state/militia_pool_key.js';
import { strictCompare } from '../../state/validateGameState.js';
import { buildSettlementsByMun } from '../early_war/control_strain.js';
import {
    getEligiblePopulationCount,
    getMunicipalityController,
    runDisplacedAndCrossEthnicContributions
} from '../early_war/pool_population.js';
import type { MunicipalityPopulation1991Map } from '../early_war/pool_population.js';

/**
 * Weekly mobilization rate as fraction of eligible military-age population.
 * Calibrated: RBiH ~60-80K → 130K (Apr 92–Apr 93), RS ~80K → 110K, HVO ~30K → 50K.
 */
const BASE_MOBILIZATION_RATE = 0.003;

/**
 * Faction mobilization scale modifiers.
 * Calibrated so personnel totals emerge organically within historical bands
 * without hardcoded ceilings. Pool exhaustion + combat attrition are the natural limiters.
 * n369: RBiH 0.28→151k, RS 0.16→79k, HRHB 0.50→55k (all out of band).
 * n370: RBiH 0.16→134k, RS 0.22→96k (in band), HRHB 0.30→50k.
 * n371: RBiH 0.14→129k (IN BAND), RS 0.22→97k (IN BAND), HRHB 0.24→49k (over by 4k).
 * n372: HRHB 0.24→0.18 — target 42.5k midpoint.
 * n168: MILITARY_AGE_MALE_FRACTION denominator fix. RS scale reduced 0.22→0.16
 *   to account for tighter exhaustion ratios; values will re-converge to historical bands.
 * n174: RBiH 0.17→121k (IN BAND), RS 0.17→106k (6k over), HRHB 0.27→39k (1k under).
 *   RS 0.17→0.15 only dropped RS by 1.8k — pool surplus (27k) absorbs scale reductions.
 * n176: Diagnosis — ongoing mobilization has diminishing effect when pool surplus exists;
 *   reduction must be large enough to meaningfully shrink per-mun pool generation.
 *   RS 0.15→0.12 (large cut to bring below 100k target). HRHB 0.29 unchanged.
 * n178: RS=97.8k (IN BAND), RBiH=124.3k (IN BAND), HRHB=39.4k (600 below 40k floor).
 *   HRHB ongoing scale changes barely effective (pool surplus absorbs them);
 *   initial FACTION_POOL_SCALE controls early-war HRHB trajectory. Restoring 0.29.
 */
const FACTION_MOBILIZATION_SCALE: Record<string, number> = {
    RBiH: 0.17,
    RS: 0.12,
    HRHB: 0.29
};
const DEFAULT_MOBILIZATION_SCALE = 1.0;

/**
 * Mobilization surge: higher early war, tapering with war fatigue.
 * Weeks 1-12: mass TO activation, general mobilization → 2.5x
 *   Reduced from 3.0 — over-charged RBiH early growth, made RS initial advantage disappear.
 * Weeks 13-26: continued high mobilization, volunteers → 2.0x
 * Weeks 27-52: established pipelines, moderating → 1.3x
 * Weeks 53-78: fatigue, diminishing returns → 0.9x
 * Weeks 79-104: deep fatigue → 0.5x
 * 105+: exhaustion → 0.3x
 */
function getMobilizationSurgeFactor(turn: number): number {
    if (turn <= 12) return 2.5;
    if (turn <= 26) return 2.0;
    if (turn <= 52) return 1.3;
    if (turn <= 78) return 0.9;
    if (turn <= 104) return 0.5;
    return 0.3;
}

/** Hard cap per municipality per turn to prevent single-mun dominance. */
const MAX_MOBILIZATION_PER_MUN_PER_TURN = 300;

/**
 * Military-age male fraction of census ethnic population.
 * ~49% male × ~58% in the 15–60 bracket ≈ 28.4%.
 * Applies the exhaustion denominator to military-age males rather than the total
 * ethnic census population, making exhaustion ratios historically meaningful.
 * Historical peak mobilization: ARBiH ~38–47% of mil-age males, VRS ~26–29%, HVO ~23–26%.
 */
const MILITARY_AGE_MALE_FRACTION = 0.28;

/**
 * Exhaustion thresholds: war-weariness bites as pools deplete and casualties mount.
 * Threshold (25%): half-rate mobilization. Hard cap (50%): no more mobilization.
 * Denominator is now military-age males (census × MILITARY_AGE_MALE_FRACTION), so
 * these percentages are directly comparable to historical mobilization rates:
 *   25% → ~96k VRS, ~132k ARBiH, ~53k HVO (half-rate kicks in)
 *   50% → ~191k VRS, ~264k ARBiH, ~107k HVO (hard ceiling)
 * ARBiH peaks at 200–250k in history; cap raised from 0.45 to 0.50 to allow this.
 * VRS naturally plateaus before the hard cap because mobilization rate slows at threshold.
 */
const EXHAUSTION_THRESHOLD = 0.25;
const EXHAUSTION_HARD_CAP = 0.50;

/**
 * Pocket mobilization boost: municipalities with NO friendly neighbor (isolated pockets)
 * mobilize at a higher rate — everyone fights when cut off.
 * Historical: Sarajevo, Bihać pocket, Srebrenica, Goražde had near-total male mobilization.
 * Implemented as a multiplier on the base rate when a faction controls a municipality
 * but no other municipality on the map (faction-controlled OSIDs all in one mun).
 */
const POCKET_MOBILIZATION_MULT = 2.0;

export interface OngoingMobilizationReport {
    total_mobilized: number;
    by_faction: Record<string, number>;
    municipalities_contributing: number;
    exhausted_municipalities: number;
    pocket_municipalities?: number;
    displaced_contributions?: number;
    rbih_10pct_additions?: number;
}

/**
 * Run Phase II ongoing mobilization: conscription then shared displaced + cross-ethnic.
 * Mutates state.militia_pools. Deterministic iteration order.
 */
export function runPhaseIIOngoingMobilization(
    state: GameState,
    settlements: Map<string, SettlementRecord>,
    population1991ByMun?: MunicipalityPopulation1991Map
): OngoingMobilizationReport {
    const report: OngoingMobilizationReport = {
        total_mobilized: 0,
        by_faction: {},
        municipalities_contributing: 0,
        exhausted_municipalities: 0,
        pocket_municipalities: 0
    };

    if (!state.militia_pools || typeof state.militia_pools !== 'object') return report;
    const pools = state.militia_pools as Record<string, MilitiaPoolState>;
    const currentTurn = state.meta.turn;
    const municipalities = state.municipalities ?? {};
    const munIds = (Object.keys(municipalities) as MunicipalityId[]).slice().sort(strictCompare);
    const factionIds: FactionId[] = (state.factions ?? [])
        .map((f) => f.id)
        .filter((x): x is FactionId => typeof x === 'string')
        .slice()
        .sort(strictCompare);
    for (const fid of factionIds) report.by_faction[fid] = 0;

    const settlementsByMun = buildSettlementsByMun(settlements);

    // Build set of municipalities each faction controls (for pocket detection).
    // A faction in only one municipality is isolated — boost their mobilization.
    const factionMunSets = new Map<string, Set<string>>();
    for (const fid of factionIds) factionMunSets.set(fid, new Set());
    const pc = state.political_controllers ?? {};
    for (const osid of Object.keys(pc).sort(strictCompare)) {
        const ctrl = pc[osid];
        if (!ctrl) continue;
        const munId = osid.split(':')[1];
        if (munId) factionMunSets.get(ctrl)?.add(munId);
    }

    for (const munId of munIds) {
        const sids = settlementsByMun.get(munId);
        if (!sids?.length) continue;
        const controller = getMunicipalityController(state, sids, munId);
        if (!controller) continue;

        const censusEligible = getEligiblePopulationCount(population1991ByMun, munId, controller);
        if (censusEligible <= 0) continue;

        const key = militiaPoolKey(munId, controller);
        const pool = pools[key];
        if (!pool) continue;

        // Exhaustion ratio uses military-age males as denominator — historically accurate.
        // FACTION_MOBILIZATION_SCALE was calibrated with full census population for the rate
        // formula, so keep censusEligible there (no net change to per-turn amounts).
        const milAgeMales = Math.max(1, Math.floor(censusEligible * MILITARY_AGE_MALE_FRACTION));
        const cumulative = (pool.committed ?? 0) + (pool.exhausted ?? 0);
        const exhaustionRatio = cumulative / milAgeMales;
        if (exhaustionRatio >= EXHAUSTION_HARD_CAP) {
            report.exhausted_municipalities += 1;
            continue;
        }
        const exhaustionMult = exhaustionRatio >= EXHAUSTION_THRESHOLD ? 0.5 : 1.0;

        // Pocket boost: faction controls only this one municipality — everyone fights.
        const controlledMuns = factionMunSets.get(controller);
        const isPocket = controlledMuns !== undefined && controlledMuns.size === 1 && controlledMuns.has(munId);
        const pocketMult = isPocket ? POCKET_MOBILIZATION_MULT : 1.0;

        const authorityState = state.municipalities?.[munId]?.control ?? 'consolidated';
        const authorityMult =
            authorityState === 'contested' ? 0.7 : authorityState === 'fragmented' ? 0.3 : 1.0;

        const factionScale = FACTION_MOBILIZATION_SCALE[controller] ?? DEFAULT_MOBILIZATION_SCALE;
        const surge = getMobilizationSurgeFactor(currentTurn);
        const raw =
            censusEligible *
            BASE_MOBILIZATION_RATE *
            factionScale *
            surge *
            exhaustionMult *
            pocketMult *
            authorityMult;
        const mobilized = Math.min(
            Math.floor(raw),
            MAX_MOBILIZATION_PER_MUN_PER_TURN
        );
        if (mobilized <= 0) continue;

        pool.available += mobilized;
        pool.updated_turn = currentTurn;
        report.total_mobilized += mobilized;
        report.by_faction[controller] = (report.by_faction[controller] ?? 0) + mobilized;
        report.municipalities_contributing += 1;
        if (isPocket) report.pocket_municipalities = (report.pocket_municipalities ?? 0) + 1;
    }

    const displacedReport = runDisplacedAndCrossEthnicContributions(
        state,
        settlements,
        population1991ByMun
    );
    report.displaced_contributions = displacedReport.displaced_contributions;
    if (displacedReport.rbih_10pct_additions != null)
        report.rbih_10pct_additions = displacedReport.rbih_10pct_additions;

    return report;
}
