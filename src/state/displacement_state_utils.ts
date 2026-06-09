/**
 * Shared helpers for displacement state and settlement→municipality mapping.
 * Used by displacement_takeover and displacement modules (minority_flight removed 2026-06-09).
 */

import type { SettlementRecord } from '../map/settlements.js';
import type { CivilianCasualtiesByFaction, DisplacementState, FactionId, GameState, MunicipalityId } from './game_state.js';

/** 52w plan Step 6.5.2: true when the faction has at least one brigade present in the municipality (OSID location). */
export function factionHasBrigadeInMunicipality(
    state: GameState,
    factionId: FactionId,
    munId: MunicipalityId,
    _settlements: Map<string, SettlementRecord>
): boolean {
    const formations = state.military.formations ?? {};
    // OSID-level brigade location — "op:municipality:slug"
    const osidPrefix = `op:${munId}:`;
    for (const f of Object.values(formations)) {
        if (!f || f.faction !== factionId || f.kind !== 'brigade' || f.status !== 'active') continue;
        const loc = (f as { location_osid?: string }).location_osid;
        if (loc && loc.startsWith(osidPrefix)) return true;
    }
    return false;
}

/** Ensure civilian_casualties exists without pre-seeding factions. */
function ensureCivilianCasualties(state: GameState): CivilianCasualtiesByFaction {
    if (!state.displacement.civilian_casualties) {
        state.displacement.civilian_casualties = {};
    }
    return state.displacement.civilian_casualties;
}

/** Record civilian displacement casualties (killed, fled_abroad) for an ethnicity-aligned faction. */
export function recordCivilianDisplacementCasualties(
    state: GameState,
    factionId: FactionId,
    killed: number,
    fledAbroad: number
): void {
    const casualties = ensureCivilianCasualties(state);
    const entry = casualties[factionId] ??= { killed: 0, fled_abroad: 0 };
    entry.killed += killed;
    entry.fled_abroad += fledAbroad;
}

export function getOrInitDisplacementState(
    state: GameState,
    munId: MunicipalityId,
    originalPopulation: number
): DisplacementState {
    if (!state.displacement.displacement_state) state.displacement.displacement_state = {};
    const existing = state.displacement.displacement_state[munId];
    if (existing) return existing;
    const created: DisplacementState = {
        mun_id: munId,
        original_population: originalPopulation,
        displaced_out: 0,
        displaced_in: 0,
        lost_population: 0,
        last_updated_turn: state.meta.turn
    };
    state.displacement.displacement_state[munId] = created;
    return created;
}

export function getMunicipalityIdFromRecord(rec: SettlementRecord): MunicipalityId {
    return (rec.mun1990_id ?? rec.mun_code) as MunicipalityId;
}
