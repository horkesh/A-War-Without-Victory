/**
 * War phase: Per-turn pool growth from conscription, displacement, and cross-ethnic contributions.
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
    getActiveMunicipalitySupport,
    RBIH_WEAPONS_SHIPMENT_BONUS
} from './municipality_support.js';
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
 * n181: w80 projection revealed structural problems — RS declines 97.8k→81.7k,
 *   RBiH overshoots 170.8k, HRHB flat 38.9k. Root cause: scale=0.12 can't sustain
 *   RS vs casualties at half-rate exhaustion; global surge blindly drops all factions.
 *   Fix: faction-differentiated surge curves (see getMobilizationSurgeFactor below).
 *   RS 0.12→0.13 (compensate for lower early RS surge), RBiH 0.17→0.16
 *   (compensate for higher early RBiH surge). HRHB unchanged.
 * n182: First faction-differentiated run: w40 RS=97.3k ✓, RBiH=124.8k ✓, HRHB=39.6k (≈✓).
 *   w80: RS=85.9k (target 100-110k), RBiH=161.5k (barely over 140-160k), HRHB=42.5k (target 45-50k).
 *   RS still declining due to high attacker casualties (229 RS attacks in 80w) vs half-rate mobilization.
 *   Fix: RS w53-78 1.1→1.4, w79-104 1.0→1.5; HRHB w53-78 1.0→1.3, w79-104 0.6→0.9.
 */
const FACTION_MOBILIZATION_SCALE: Record<string, number> = {
    RBiH: 0.10,
    RS: 0.12,
    HRHB: 0.29
};
const DEFAULT_MOBILIZATION_SCALE = 1.0;

/**
 * Mobilization surge: faction-differentiated to match historical trajectories.
 * n181: Global surge caused RS w80 collapse (81.7k→target 100-110k) and RBiH overshoot (170.8k).
 * Fix: each faction gets its own curve reflecting its mobilization arc.
 *
 * VRS (RS): JNA inheritance → organized from start, lower initial rush, more sustained.
 *   w1-12: 2.0× (vs 2.5 global); sustained 1.1× at w53-78, 1.0× at w79-104 (vs 0.5 global).
 *   RS scale raised 0.12→0.13 to compensate for reduced early surge.
 *
 * ARBiH (RBiH): Desperate mass mobilization → high initial rush, exhaustion bites faster.
 *   w1-12: 2.8×; faster burnout: 0.8× at w53-78, 0.45× at w79-104.
 *   RBiH scale reduced 0.17→0.16 to compensate for higher early surge.
 *
 * HVO (HRHB): Capable early, slight growth boost mid-war, decline after two-front stress.
 *   Moderate sustained curve; 1.0× at w53-78, 0.6× at w79-104.
 */
function getMobilizationSurgeFactor(turn: number, faction: string): number {
    if (faction === 'RS') {
        // VRS: JNA inheritance → organized, lower initial rush, more sustained
        if (turn <= 12) return 2.0;
        if (turn <= 26) return 1.8;
        if (turn <= 52) return 1.3;
        if (turn <= 78) return 1.1;
        if (turn <= 104) return 1.0;
        return 0.6;
    }
    if (faction === 'RBiH') {
        // ARBiH: desperate mass mobilization early, exhaustion-driven decline
        if (turn <= 12) return 2.8;
        if (turn <= 26) return 2.2;
        if (turn <= 52) return 1.3;
        if (turn <= 78) return 0.8;
        if (turn <= 104) return 0.45;
        return 0.3;
    }
    if (faction === 'HRHB') {
        // HVO: capable early, slight growth boost, two-front stress decline late
        if (turn <= 12) return 2.5;
        if (turn <= 26) return 2.0;
        if (turn <= 52) return 1.4;
        if (turn <= 78) return 1.0;
        if (turn <= 104) return 0.6;
        return 0.4;
    }
    // Default fallback
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
 * Run War phase ongoing mobilization: conscription then shared displaced + cross-ethnic.
 * Mutates state.militia_pools. Deterministic iteration order.
 */
export function runOngoingMobilization(
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
        const surge = getMobilizationSurgeFactor(currentTurn, controller);
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
        const localSupport = getActiveMunicipalitySupport(state, controller, munId, currentTurn);
        const shipmentBonus =
            localSupport?.type === 'weapons_shipment' && controller === 'RBiH'
                ? RBIH_WEAPONS_SHIPMENT_BONUS
                : 0;
        if (mobilized + shipmentBonus <= 0) continue;

        pool.available += mobilized + shipmentBonus;
        pool.updated_turn = currentTurn;
        report.total_mobilized += mobilized + shipmentBonus;
        report.by_faction[controller] = (report.by_faction[controller] ?? 0) + mobilized + shipmentBonus;
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
