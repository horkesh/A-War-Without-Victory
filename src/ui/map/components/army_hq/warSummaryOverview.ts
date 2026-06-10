import osidAreas from '../../../../../data/derived/operational/osid_areas.json';
import type { LoadedGameState } from '../../data/types';
import {
    deriveWarWeariness,
    type WarWearinessDescriptor,
} from '../../data/warWeariness';

export const WAR_SUMMARY_FACTIONS = ['RS', 'RBiH', 'HRHB'] as const;

export interface WarSummaryOverviewModel {
    playerFaction: (typeof WAR_SUMMARY_FACTIONS)[number] | null;
    areaPct: Record<(typeof WAR_SUMMARY_FACTIONS)[number], number>;
    atArmsByFaction: Record<string, number>;
    mobilizedPoolByFaction: Record<string, number>;
    mobilizedTotalByFaction: Record<string, number>;
    personnelByFaction: Record<string, number>;
    totalDisplaced: number;
    displacedByFaction: Record<string, number>;
    /**
     * Cluster C — faction-level war exhaustion passthrough.
     * Sourced from state.warPhaseExhaustion (which is
     * GameState.political.war_exhaustion, adapter-scoped to player faction).
     * Summary-only: the canonical per-corps explanation lives in
     * Army HQ → Command Relationship. WarSummary advertises and hands off.
     */
    warExhaustionByFaction: Partial<Record<(typeof WAR_SUMMARY_FACTIONS)[number], number>>;
    /**
     * Collapse Repurpose Design A — derived war-weariness descriptor per faction
     * (steady → strained → cracking → collapsing) off the same war_exhaustion
     * signal. PURE READ-MODEL (warWeariness.ts): no sim state touched, no
     * persisted field, byte-identical sim. Populated only where
     * warExhaustionByFaction is (i.e. fog-of-war scoped to the player faction);
     * the feel layer shares the one source of truth with the raw passthrough.
     */
    warWearinessByFaction: Partial<Record<(typeof WAR_SUMMARY_FACTIONS)[number], WarWearinessDescriptor>>;
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

    const atArmsByFaction: Record<string, number> = {};
    for (const formation of state.formations) {
        if (formation.status === 'destroyed' || formation.personnel == null) continue;
        atArmsByFaction[formation.faction] = (atArmsByFaction[formation.faction] ?? 0) + formation.personnel;
    }

    const mobilizedPoolByFaction: Record<string, number> = {};
    for (const pool of state.militiaPools ?? []) {
        const poolTotal =
            Math.max(0, pool.available ?? 0)
            + Math.max(0, pool.committed ?? 0)
            + Math.max(0, pool.exhausted ?? 0);
        if (poolTotal <= 0) continue;
        mobilizedPoolByFaction[pool.faction] = (mobilizedPoolByFaction[pool.faction] ?? 0) + poolTotal;
    }

    const mobilizedTotalByFaction: Record<string, number> = {};
    for (const f of WAR_SUMMARY_FACTIONS) {
        const total = (atArmsByFaction[f] ?? 0) + (mobilizedPoolByFaction[f] ?? 0);
        if (total > 0) mobilizedTotalByFaction[f] = total;
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

    const warExhaustionByFaction: WarSummaryOverviewModel['warExhaustionByFaction'] = {};
    const warWearinessByFaction: WarSummaryOverviewModel['warWearinessByFaction'] = {};
    const rawExhaustion = state.warPhaseExhaustion;
    if (rawExhaustion) {
        for (const f of WAR_SUMMARY_FACTIONS) {
            const v = rawExhaustion[f];
            if (typeof v === 'number' && Number.isFinite(v)) {
                warExhaustionByFaction[f] = v;
                // Derive the war-weariness band off the same raw signal. The
                // collapse_eligibility echo is unavailable on the adapter view
                // (gated/default-off), so the descriptor is signal-only here.
                warWearinessByFaction[f] = deriveWarWeariness(v);
            }
        }
    }

    return {
        playerFaction,
        areaPct,
        atArmsByFaction,
        mobilizedPoolByFaction,
        mobilizedTotalByFaction,
        personnelByFaction: atArmsByFaction,
        totalDisplaced,
        displacedByFaction,
        warExhaustionByFaction,
        warWearinessByFaction,
    };
}
