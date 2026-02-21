import type { LoadedSettlementGraph } from '../map/settlements.js';
import { SARAJEVO_MUN_IDS, SARAJEVO_PRESSURE_MULTIPLIER } from './enclave_integrity.js';
import type { GameState, SarajevoState, SettlementId } from './game_state.js';
import type { SupplyStateDerivationReport, SupplyStateLevel } from './supply_state_derivation.js';

const BASE_IMPORTANCE = 1.0;

function clamp01(value: number): number {
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
}

function supplyStateToScore(state: SupplyStateLevel): number {
    if (state === 'adequate') return 1;
    if (state === 'strained') return 0.5;
    return 0;
}

function getSettlementSupplyState(
    supplyReport: SupplyStateDerivationReport | undefined,
    factionId: string,
    sid: SettlementId
): SupplyStateLevel | null {
    if (!supplyReport) return null;
    const entry = supplyReport.factions.find((f) => f.faction_id === factionId);
    if (!entry) return null;
    const found = entry.by_settlement.find((s) => s.sid === sid);
    return found?.state ?? null;
}

function getSarajevoSettlementIds(graph: LoadedSettlementGraph): SettlementId[] {
    const ids: SettlementId[] = [];
    for (const [sid, rec] of graph.settlements.entries()) {
        const munId = (rec.mun1990_id ?? rec.mun_code) as string;
        if (SARAJEVO_MUN_IDS.includes(munId)) ids.push(sid);
    }
    ids.sort((a, b) => a.localeCompare(b));
    return ids;
}

function getMajorityController(state: GameState, settlementIds: SettlementId[]): string | null {
    const counts: Record<string, number> = {};
    for (const sid of settlementIds) {
        const controller = state.political_controllers?.[sid];
        const key = controller ?? '_null_';
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
    return best;
}

export function updateSarajevoState(
    state: GameState,
    graph: LoadedSettlementGraph,
    supplyReport: SupplyStateDerivationReport | undefined
): SarajevoState {
    const settlementIds = getSarajevoSettlementIds(graph);
    const controller = getMajorityController(state, settlementIds);
    const prev = state.sarajevo_state;
    const turn = state.meta.turn;

    let supplyScoreSum = 0;
    let count = 0;
    if (controller) {
        for (const sid of settlementIds) {
            const supplyState = getSettlementSupplyState(supplyReport, controller, sid);
            if (!supplyState) continue;
            supplyScoreSum += supplyStateToScore(supplyState);
            count += 1;
        }
    }
    const internalSupply = count > 0 ? clamp01(supplyScoreSum / count) : 0;
    const externalSupply = internalSupply;
    const siegeStatus = internalSupply < 0.4 ? 'BESIEGED' : internalSupply < 0.8 ? 'PARTIAL' : 'OPEN';
    const siegeDuration =
        siegeStatus === 'OPEN' ? 0 : (prev?.siege_duration ?? 0) + 1;
    const siegeIntensity =
        (siegeStatus === 'BESIEGED' ? 1.0 : 0.5) *
        (siegeDuration / 20) *
        (1.0 - externalSupply);

    const humanitarianPressure = clamp01((1 - internalSupply) * SARAJEVO_PRESSURE_MULTIPLIER);
    const internationalFocus = BASE_IMPORTANCE + siegeIntensity * 10.0 + humanitarianPressure * 0.5;

    const sarajevo: SarajevoState = {
        mun_id: 'sarajevo_cluster_1990',
        mun_ids: SARAJEVO_MUN_IDS.slice(),
        settlement_ids: settlementIds,
        siege_status: siegeStatus,
        siege_duration: siegeDuration,
        external_supply: externalSupply,
        internal_supply: internalSupply,
        siege_intensity: clamp01(siegeIntensity),
        international_focus: internationalFocus,
        humanitarian_pressure: humanitarianPressure,
        last_updated_turn: turn
    };

    state.sarajevo_state = sarajevo;
    return sarajevo;
}
