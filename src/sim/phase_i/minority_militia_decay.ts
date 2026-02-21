/**
 * Phase I: Early-war minority militia decay (MVP).
 * First 3 turns of Phase I: in non-urban muns, minority faction pools under opposing
 * consolidated control are reduced by 20–40% (deterministic, census-based formula).
 * See docs/40_reports/MILITIA_BRIGADE_SYSTEM_RESEARCH_AND_REWORK_PLAN.md and design §8.2.
 */

import type { SettlementRecord } from '../../map/settlements.js';
import { isLargeSettlementMun } from '../../state/formation_constants.js';
import type {
    FactionId,
    GameState,
    MilitiaPoolState,
    MunicipalityId
} from '../../state/game_state.js';
import { parseMilitiaPoolKey } from '../../state/militia_pool_key.js';
import { strictCompare } from '../../state/validateGameState.js';
import { buildSettlementsByMun } from './control_strain.js';
import type { MunicipalityPopulation1991Map } from './pool_population.js';

export interface MinorityDecayReport {
    pools_affected: number;
    manpower_removed: number;
}

function getMunicipalityController(state: GameState, sids: string[]): FactionId | null {
    const counts: Record<string, number> = {};
    for (const sid of sids) {
        const c = state.political_controllers?.[sid] ?? null;
        const key = c ?? '_null_';
        counts[key] = (counts[key] ?? 0) + 1;
    }
    let best: string | null = null;
    let bestCount = 0;
    for (const [key, count] of Object.entries(counts)) {
        if (count > bestCount) {
            bestCount = count;
            best = key === '_null_' ? null : key;
        }
    }
    return best as FactionId | null;
}

/** Faction's share of population in mun (0..1) from 1991 census; used for decay strength. */
function getFactionShareInMun(
    pop: MunicipalityPopulation1991Map | undefined,
    munId: string,
    factionId: FactionId
): number {
    if (!pop) return 0.25;
    const entry = pop[munId];
    if (!entry || entry.total <= 0) return 0.25;
    if (factionId === 'RBiH') return entry.bosniak / entry.total;
    if (factionId === 'RS') return entry.serb / entry.total;
    if (factionId === 'HRHB') return entry.croat / entry.total;
    return 0.25;
}

/**
 * Run early-war minority militia decay when in first 3 turns of Phase I.
 * Only runs when meta.phase === 'phase_i', meta.turn in [war_start_turn, war_start_turn + 2].
 * Deterministic: sorted pool keys; decay formula from research (ethnicPct → 20–40%).
 */
export function runMinorityMilitiaDecay(
    state: GameState,
    settlements: Map<string, SettlementRecord>,
    population1991ByMun?: MunicipalityPopulation1991Map
): MinorityDecayReport {
    const report: MinorityDecayReport = { pools_affected: 0, manpower_removed: 0 };

    const warStart = state.meta.war_start_turn;
    const turn = state.meta.turn;
    if (typeof warStart !== 'number' || typeof turn !== 'number') return report;
    if (state.meta.phase !== 'phase_i') return report;
    if (turn < warStart || turn > warStart + 2) return report;

    const pools = state.militia_pools as Record<string, MilitiaPoolState> | undefined;
    if (!pools || typeof pools !== 'object') return report;

    const settlementsByMun = buildSettlementsByMun(settlements);
    const poolKeys = (Object.keys(pools) as string[]).filter((k) => parseMilitiaPoolKey(k) !== null);
    poolKeys.sort(strictCompare);

    const currentTurn = state.meta.turn;

    for (const key of poolKeys) {
        const parsed = parseMilitiaPoolKey(key);
        if (!parsed) continue;

        const { mun_id, faction } = parsed;
        const pool = pools[key];
        if (!pool || pool.available <= 0) continue;

        if (isLargeSettlementMun(mun_id as MunicipalityId)) continue;

        const sids = settlementsByMun.get(mun_id as MunicipalityId);
        if (!sids?.length) continue;

        const controller = getMunicipalityController(state, sids);
        if (controller === null || controller === faction) continue;

        const authorityState = state.municipalities?.[mun_id]?.control ?? 'consolidated';
        if (authorityState !== 'consolidated') continue;

        const ethnicPct = getFactionShareInMun(population1991ByMun, mun_id, faction as FactionId);
        const decay = Math.min(0.4, Math.max(0.2, 0.2 + (0.25 - ethnicPct)));
        const newAvailable = Math.max(0, Math.floor(pool.available * (1 - decay)));
        const removed = pool.available - newAvailable;

        if (removed <= 0) continue;

        pool.available = newAvailable;
        pool.updated_turn = currentTurn;
        report.pools_affected += 1;
        report.manpower_removed += removed;
    }

    return report;
}
