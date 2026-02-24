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
import { buildSettlementsByMun } from '../phase_i/control_strain.js';
import {
    getEligiblePopulationCount,
    getMunicipalityController,
    runDisplacedAndCrossEthnicContributions
} from '../phase_i/pool_population.js';
import type { MunicipalityPopulation1991Map } from '../phase_i/pool_population.js';

/**
 * Weekly mobilization rate as fraction of eligible military-age population.
 * Calibrated: RBiH ~60-80K → 130K (Apr 92–Apr 93), RS ~80K → 110K, HVO ~30K → 50K.
 */
const BASE_MOBILIZATION_RATE = 0.003;

/**
 * Faction mobilization scale modifiers.
 * RS: 0.25 — VRS was already near full mobilization from JNA handover; growth was only ~38%.
 *   RS controls the largest territory with the highest ethnic majority, so the low scale
 *   correctly models that most eligible Serbs were already mobilized by May 1992.
 * RBiH: 1.3 — Mass TO activation + refugee mobilization; fastest growing force.
 * HRHB: 1.2 — Organized Croatian cadres + diaspora support.
 */
const FACTION_MOBILIZATION_SCALE: Record<string, number> = {
    RBiH: 1.1,
    RS: 0.15,
    HRHB: 1.2
};
const DEFAULT_MOBILIZATION_SCALE = 1.0;

/**
 * Mobilization surge: higher early war, tapering with war fatigue.
 * Weeks 1-12: mass TO activation, general mobilization → 3.0x
 * Weeks 13-26: continued high mobilization, volunteers → 2.2x
 * Weeks 27-52: established pipelines, moderating → 1.4x
 * Weeks 53-78: fatigue, diminishing returns → 0.9x
 * Weeks 79-104: deep fatigue → 0.5x
 * 105+: exhaustion → 0.3x
 */
function getMobilizationSurgeFactor(turn: number): number {
    if (turn <= 12) return 3.0;
    if (turn <= 26) return 2.2;
    if (turn <= 52) return 1.4;
    if (turn <= 78) return 0.9;
    if (turn <= 104) return 0.5;
    return 0.3;
}

/** Hard cap per municipality per turn to prevent single-mun dominance. */
const MAX_MOBILIZATION_PER_MUN_PER_TURN = 300;
/**
 * Exhaustion thresholds: historically BiH factions mobilized 15-25% of total population.
 * Threshold (20%): half-rate mobilization. Hard cap (35%): no more mobilization.
 * Higher than initial values to match historical mobilization depth.
 */
const EXHAUSTION_THRESHOLD = 0.20;
const EXHAUSTION_HARD_CAP = 0.35;

export interface OngoingMobilizationReport {
    total_mobilized: number;
    by_faction: Record<string, number>;
    municipalities_contributing: number;
    exhausted_municipalities: number;
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
        exhausted_municipalities: 0
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

    for (const munId of munIds) {
        const sids = settlementsByMun.get(munId);
        if (!sids?.length) continue;
        const controller = getMunicipalityController(state, sids, munId);
        if (!controller) continue;

        const eligiblePop = getEligiblePopulationCount(population1991ByMun, munId, controller);
        if (eligiblePop <= 0) continue;

        const key = militiaPoolKey(munId, controller);
        const pool = pools[key];
        if (!pool) continue;

        const cumulative = (pool.committed ?? 0) + (pool.exhausted ?? 0);
        const exhaustionRatio = cumulative / eligiblePop;
        if (exhaustionRatio >= EXHAUSTION_HARD_CAP) {
            report.exhausted_municipalities += 1;
            continue;
        }
        const exhaustionMult = exhaustionRatio >= EXHAUSTION_THRESHOLD ? 0.5 : 1.0;

        const authorityState = state.municipalities?.[munId]?.control ?? 'consolidated';
        const authorityMult =
            authorityState === 'contested' ? 0.7 : authorityState === 'fragmented' ? 0.3 : 1.0;

        const factionScale = FACTION_MOBILIZATION_SCALE[controller] ?? DEFAULT_MOBILIZATION_SCALE;
        const surge = getMobilizationSurgeFactor(currentTurn);
        const raw =
            eligiblePop *
            BASE_MOBILIZATION_RATE *
            factionScale *
            surge *
            exhaustionMult *
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
