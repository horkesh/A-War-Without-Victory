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
    isFinalPass: boolean = false,
): FinalSectorTruthReconciliationReport {
    const sectors = buildCorpsFrontSectors(state, edges, reverseMap, centroids, spatial, isFinalPass);
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

    // Clear stale assigned_sub_segment_id on formations not in any sector's brigade lists.
    // Life lesson: "When demoting a brigade, always clear derived cache fields."
    // Late writers (recruitment, mobilization, elite recall) can re-assign ssids after
    // the main sector pipeline clears them — this final sweep catches stragglers.
    const sectorOwnedBrigades = new Set<string>();
    for (const sector of sectorList) {
        for (const bid of sector.assigned_brigade_ids ?? []) sectorOwnedBrigades.add(bid);
        for (const bid of sector.reserve_brigade_ids ?? []) sectorOwnedBrigades.add(bid);
    }
    const formations = state.military.formations ?? {};
    for (const fid of Object.keys(formations)) {
        const f = formations[fid];
        if (f.assigned_sub_segment_id && !sectorOwnedBrigades.has(fid)) {
            f.assigned_sub_segment_id = undefined;
        }
    }

    const ratings = computeSectorCombatRatings(state, supplyStateByOsid ?? null);

    return {
        sectors_rebuilt: sectorList.length,
        sectors_rated: ratings.sectors_rated,
        unresolved_brigades: state.military.unresolved_sector_brigades?.length ?? 0,
    };
}
