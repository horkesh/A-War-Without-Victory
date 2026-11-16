// OSID areas (km²) for territory share / km² figures.
//
// Bundled as a JSON module, the same way sim/negotiation (peace_settlement, enclave_credit,
// front_packages, package_area_resolver) and the map UI already load this file. It used to be read
// from `process.cwd()` at runtime, and on any read error it silently fell back to an empty area
// map, so a run started outside the repo root reported zero territory without an error.
import osidAreasJson from '../../data/derived/operational/osid_areas.json';
import type { GameState, FactionId } from '../state/game_state.js';
import { strictCompare } from '../state/validateGameState.js';

export interface OsidAreaData {
    total: number;
    areas: Record<string, number>;
}

const OSID_AREAS: OsidAreaData = {
    total: osidAreasJson.total_area_km2,
    areas: osidAreasJson.areas as Record<string, number>,
};

export function getOsidAreas(): OsidAreaData {
    return OSID_AREAS;
}

/**
 * Faction's current share of Bosnia and Herzegovina by AREA, 0..100: km² held over the
 * country total. Every peace plan's `proposed_split` is an area share (peace_plan_data.ts),
 * and the emergent bots' historical-territory gate (political/historical_territory_band.ts)
 * compares against painted area shares, so both read this one measure. Same measure as
 * negotiation capital (`compute_capital.ts`) and the settlement map (`settlementTerritoryPct`).
 * (B0 #697 introduced it in negotiation/peace_plans.ts, which re-exports it.)
 */
export function getFactionTerritoryAreaPct(state: GameState, faction: FactionId): number {
    const controllers = state.political?.political_controllers;
    if (!controllers) return 0;

    const { areas, total } = OSID_AREAS;
    if (!(total > 0)) return 0;

    let factionKm2 = 0;
    for (const osid of Object.keys(controllers).sort(strictCompare)) {
        if (controllers[osid] === faction) factionKm2 += areas[osid] ?? 0;
    }
    return (factionKm2 / total) * 100;
}
