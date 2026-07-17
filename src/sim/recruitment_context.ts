import type { CanonicalToOperationalMap, OperationalToCanonicalReverseMap } from '../data/operational_data_types.js';
import type { SettlementRecord } from '../map/settlements.js';
import { buildOsidToMunFromReverseMap, buildSidToMunFromSettlements } from '../scenario/oob_early_war_entry.js';
import type { GameState, MunicipalityId, SettlementId } from '../state/game_state.js';
import { strictCompare } from '../state/validateGameState.js';

export interface RecruitmentOperationalMaps {
    canonicalToOperational: CanonicalToOperationalMap;
    operationalToCanonical: OperationalToCanonicalReverseMap;
}

export interface RecruitmentContext {
    sidToMun: Map<SettlementId, MunicipalityId>;
    municipalityHqSettlement: Record<string, string>;
    canonicalToOperational?: CanonicalToOperationalMap;
}

/** Build the canonical recruitment spatial context for desktop and turn execution. */
export function buildRecruitmentContext(
    state: GameState,
    settlements: Map<string, SettlementRecord>,
    municipalityHqSettlement: Record<string, string>,
    operationalMaps?: RecruitmentOperationalMaps,
): RecruitmentContext {
    const canonicalSidToMun = buildSidToMunFromSettlements(settlements);
    const controllerKeys = Object.keys(state.political.political_controllers ?? {}).sort(strictCompare);
    const sidToMun = controllerKeys[0]?.startsWith('op:') && operationalMaps
        ? buildOsidToMunFromReverseMap(operationalMaps.operationalToCanonical, canonicalSidToMun)
        : canonicalSidToMun;

    return {
        sidToMun,
        municipalityHqSettlement,
        ...(operationalMaps ? { canonicalToOperational: operationalMaps.canonicalToOperational } : {}),
    };
}
