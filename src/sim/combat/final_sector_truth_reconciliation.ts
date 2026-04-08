import type { EdgeRecord } from '../../map/settlements.js';
import type { OsidCentroidMap } from '../../data/operational_data_types.js';
import type { GameState } from '../../state/game_state.js';
import type { SupplyStateByOsidReport } from '../../state/supply_state_derivation.js';
import type { SpatialContext } from '../spatial_context.js';
import type { Osid } from './osid_adjacency.js';
import { buildOsidAdjacency } from './osid_adjacency.js';
import { assignBrigadesToSubSegments, buildCorpsFrontSectors } from './corps_front_sectors.js';
import { computeSectorCombatRatings } from './sector_combat_rating.js';

export interface FinalSectorTruthReconciliationReport {
    sectors_rebuilt: number;
    sectors_rated: number;
    unresolved_brigades: number;
}

export function reconcileFinalSectorTruth(
    state: GameState,
    edges: EdgeRecord[],
    reverseMap: Map<string, string[]> | null,
    centroids?: OsidCentroidMap,
    spatial?: SpatialContext,
    supplyStateByOsid?: SupplyStateByOsidReport | null,
): FinalSectorTruthReconciliationReport {
    const sectors = buildCorpsFrontSectors(state, edges, reverseMap, centroids, spatial);
    state.military.corps_front_sectors = sectors;

    const sectorList = Object.values(sectors);
    if (sectorList.length === 0) {
        state.military.sector_combat_ratings = {};
        state.military.unresolved_sector_brigades = [];
        return {
            sectors_rebuilt: 0,
            sectors_rated: 0,
            unresolved_brigades: 0,
        };
    }

    const adjacency = (spatial?.adjacency as Map<Osid, Osid[]>) ?? buildOsidAdjacency(edges);
    assignBrigadesToSubSegments(state, sectorList, adjacency);
    const ratings = computeSectorCombatRatings(state, supplyStateByOsid ?? null);

    return {
        sectors_rebuilt: sectorList.length,
        sectors_rated: ratings.sectors_rated,
        unresolved_brigades: state.military.unresolved_sector_brigades?.length ?? 0,
    };
}
