import osidAreas from '../../../../../data/derived/operational/osid_areas.json';
import type { LoadedGameState } from '../../data/types';

export const WAR_SUMMARY_FACTIONS = ['RS', 'RBiH', 'HRHB'] as const;

export interface WarSummaryOverviewModel {
    playerFaction: (typeof WAR_SUMMARY_FACTIONS)[number] | null;
    areaPct: Record<(typeof WAR_SUMMARY_FACTIONS)[number], number>;
    personnelByFaction: Record<string, number>;
    totalDisplaced: number;
    displacedByFaction: Record<string, number>;
}

export function buildWarSummaryOverviewModel(state: LoadedGameState): WarSummaryOverviewModel {
    const areasMap = (osidAreas as { total_area_km2: number; areas: Record<string, number> }).areas;
    const areaByFaction: Record<string, number> = {};
    let totalArea = 0;
    for (const [osid, controller] of Object.entries(state.controlBySettlement)) {
        if (!controller) continue;
        const area = areasMap[osid] ?? 0;
        areaByFaction[controller] = (areaByFaction[controller] ?? 0) + area;
        totalArea += area;
    }

    const areaPct = {
        RS: totalArea > 0 ? ((areaByFaction.RS ?? 0) / totalArea) * 100 : 0,
        RBiH: totalArea > 0 ? ((areaByFaction.RBiH ?? 0) / totalArea) * 100 : 0,
        HRHB: totalArea > 0 ? ((areaByFaction.HRHB ?? 0) / totalArea) * 100 : 0,
    };

    const personnelByFaction: Record<string, number> = {};
    for (const formation of state.formations) {
        if (formation.status === 'destroyed' || formation.personnel == null) continue;
        personnelByFaction[formation.faction] = (personnelByFaction[formation.faction] ?? 0) + formation.personnel;
    }

    let totalDisplaced = 0;
    const displacedByFaction: Record<string, number> = {};
    if (state.departedByOsid) {
        for (const factionCounts of Object.values(state.departedByOsid)) {
            for (const [faction, count] of Object.entries(factionCounts)) {
                if (typeof count !== 'number') continue;
                displacedByFaction[faction] = (displacedByFaction[faction] ?? 0) + count;
                totalDisplaced += count;
            }
        }
    } else if (state.displacementByMun) {
        for (const mun of Object.values(state.displacementByMun)) {
            totalDisplaced += mun.displacedOut ?? 0;
        }
    }

    const playerFaction = WAR_SUMMARY_FACTIONS.includes(state.player_faction as (typeof WAR_SUMMARY_FACTIONS)[number])
        ? state.player_faction as (typeof WAR_SUMMARY_FACTIONS)[number]
        : null;

    return {
        playerFaction,
        areaPct,
        personnelByFaction,
        totalDisplaced,
        displacedByFaction,
    };
}
