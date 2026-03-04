/**
 * Shared helpers for displacement state and settlement→municipality mapping.
 * Used by displacement_takeover, minority_flight, and displacement modules.
 */

import type { SettlementRecord } from '../map/settlements.js';
import type { DisplacementState, FactionId, GameState, MunicipalityId } from './game_state.js';

/** 52w plan Step 6.5.2: true when the faction has at least one brigade present in the municipality (OSID location). */
export function factionHasBrigadeInMunicipality(
    state: GameState,
    factionId: FactionId,
    munId: MunicipalityId,
    _settlements: Map<string, SettlementRecord>
): boolean {
    const formations = state.formations ?? {};
    // OSID-level brigade location — "op:municipality:slug"
    const osidPrefix = `op:${munId}:`;
    for (const f of Object.values(formations)) {
        if (!f || f.faction !== factionId || f.kind !== 'brigade' || f.status !== 'active') continue;
        const loc = (f as { location_osid?: string }).location_osid;
        if (loc && loc.startsWith(osidPrefix)) return true;
    }
    return false;
}

const FACTION_IDS: FactionId[] = ['HRHB', 'RBiH', 'RS'];

/** Ensure civilian_casualties exists and has all factions. */
function ensureCivilianCasualties(state: GameState): void {
    if (!state.civilian_casualties) {
        state.civilian_casualties = {};
        for (const fid of FACTION_IDS) {
            state.civilian_casualties[fid] = { killed: 0, fled_abroad: 0 };
        }
    }
}

/** Record civilian displacement casualties (killed, fled_abroad) for an ethnicity-aligned faction. */
export function recordCivilianDisplacementCasualties(
    state: GameState,
    factionId: FactionId,
    killed: number,
    fledAbroad: number
): void {
    ensureCivilianCasualties(state);
    const entry = state.civilian_casualties![factionId];
    if (entry) {
        entry.killed += killed;
        entry.fled_abroad += fledAbroad;
    }
}

export function getOrInitDisplacementState(
    state: GameState,
    munId: MunicipalityId,
    originalPopulation: number
): DisplacementState {
    if (!state.displacement_state) state.displacement_state = {};
    const existing = state.displacement_state[munId];
    if (existing) return existing;
    const created: DisplacementState = {
        mun_id: munId,
        original_population: originalPopulation,
        displaced_out: 0,
        displaced_in: 0,
        lost_population: 0,
        last_updated_turn: state.meta.turn
    };
    state.displacement_state[munId] = created;
    return created;
}

export function getMunicipalityIdFromRecord(rec: SettlementRecord): MunicipalityId {
    return (rec.mun1990_id ?? rec.mun_code) as MunicipalityId;
}
