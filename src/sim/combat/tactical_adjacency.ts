/**
 * Tactical adjacency includes graph neighbors plus live war-front contacts.
 *
 * Some canonical front contacts, especially Sarajevo core exception edges, are
 * authored into military.war_front_edges_osid rather than the base movement
 * graph. Attack eligibility must see those contacts without turning them into
 * general movement paths.
 */

import type { GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { Osid } from './osid_adjacency.js';

export function getTacticalAdjacentOsids(
    state: GameState,
    loc: Osid,
    adjacency: Map<Osid, Osid[]>,
): Osid[] {
    const result = new Set<Osid>(adjacency.get(loc) ?? []);
    for (const edge of state.military?.war_front_edges_osid ?? []) {
        if (edge.a === loc && edge.b) result.add(edge.b as Osid);
        else if (edge.b === loc && edge.a) result.add(edge.a as Osid);
    }
    return [...result].sort(strictCompare);
}
