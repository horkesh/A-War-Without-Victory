/**
 * Legacy theatre compatibility helpers.
 *
 * The live player shell no longer treats theatres or theatre-tagged front
 * segments as active ownership concepts. This module remains only so older
 * saves/tests can still be normalized or migrated intentionally.
 */

import type { AssignableFrontSegmentState, FormationId, GameState, TheatreState } from './game_state.js';
import { strictCompare } from './validateGameState.js';

function defaultTheatreIdForFaction(faction: string): string {
    return `${faction}_default`;
}

/**
 * Ensure deterministic default theatres (one per faction) and army->theatre assignments.
 */
export function ensureDefaultTheatres(state: GameState): void {
    if (!state.military.theatres || typeof state.military.theatres !== 'object') state.military.theatres = {};
    if (!state.military.army_theatre_assignment || typeof state.military.army_theatre_assignment !== 'object') {
        state.military.army_theatre_assignment = {};
    }

    const theatres = state.military.theatres;
    const assignment = state.military.army_theatre_assignment;
    const factionIds = (state.factions ?? []).map((f) => f.id).sort(strictCompare);

    for (const factionId of factionIds) {
        const theatreId = defaultTheatreIdForFaction(factionId);
        if (!theatres[theatreId]) {
            theatres[theatreId] = {
                id: theatreId,
                name: `${factionId} Theatre`,
                faction: factionId,
                army_ids: [],
            };
        }
    }

    const formations = state.military.formations ?? {};
    const armyIds = Object.keys(formations)
        .filter((id) => (formations[id]?.kind ?? '') === 'army_hq')
        .sort(strictCompare) as FormationId[];

    for (const armyId of armyIds) {
        const formation = formations[armyId];
        if (!formation?.faction) continue;
        const fallbackTheatreId = defaultTheatreIdForFaction(formation.faction);
        if (!theatres[fallbackTheatreId]) {
            theatres[fallbackTheatreId] = {
                id: fallbackTheatreId,
                name: `${formation.faction} Theatre`,
                faction: formation.faction,
                army_ids: [],
            };
        }
        const assignedTheatreId = assignment[armyId];
        if (!assignedTheatreId || !theatres[assignedTheatreId]) {
            assignment[armyId] = fallbackTheatreId;
        }
    }

    // Canonicalize theatre.army_ids from assignment map.
    for (const theatreId of Object.keys(theatres).sort(strictCompare)) {
        const theatre = theatres[theatreId] as TheatreState;
        const armyIdsForTheatre = Object.keys(assignment)
            .filter((armyId) => assignment[armyId] === theatreId)
            .sort(strictCompare);
        theatre.id = theatreId;
        theatre.army_ids = armyIdsForTheatre;
        if (!theatre.name) theatre.name = `${theatre.faction} Theatre`;
    }
}

/**
 * Assign deterministic theatre_id for each front segment.
 * Geographic mapping is deferred; for now we anchor by side_a/side_b faction defaults.
 */
export function assignFrontSegmentTheatres(
    state: GameState,
    segments: AssignableFrontSegmentState[]
): AssignableFrontSegmentState[] {
    ensureDefaultTheatres(state);
    const theatres = state.military.theatres ?? {};
    const theatreByFaction = new Map<string, string>();
    for (const theatreId of Object.keys(theatres).sort(strictCompare)) {
        const factionId = theatres[theatreId]?.faction;
        if (!factionId || theatreByFaction.has(factionId)) continue;
        theatreByFaction.set(factionId, theatreId);
    }

    const out = segments.map((segment) => {
        const theatreId =
            (segment.side_a && theatreByFaction.get(segment.side_a)) ??
            (segment.side_b && theatreByFaction.get(segment.side_b)) ??
            undefined;
        return theatreId ? { ...segment, theatre_id: theatreId } : { ...segment };
    });
    out.sort((a, b) => a.front_id.localeCompare(b.front_id));
    return out;
}

