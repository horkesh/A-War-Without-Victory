import type { EdgeRecord } from '../../map/settlements.js';
import type { FormationId, GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

/**
 * Derive corps front edges from existing brigade AoR ownership and control boundaries.
 * brigade_aor is never populated; always returns empty record.
 * Deterministic: sorted output.
 */
export function deriveCorpsFrontEdgesFromBrigadeAoR(
    _state: GameState,
    _edges: EdgeRecord[]
): Record<FormationId, string[]> {
    return {};
}

/**
 * If state.corps_front_edges is absent or missing corps keys, derive defaults from brigade AoR.
 */
export function ensureDerivedCorpsFrontEdges(
    state: GameState,
    edges: EdgeRecord[]
): void {
    const derived = deriveCorpsFrontEdgesFromBrigadeAoR(state, edges);
    if (!state.military.corps_front_edges) {
        state.military.corps_front_edges = derived;
        return;
    }
    for (const corpsId of Object.keys(derived).sort(strictCompare)) {
        if (!Array.isArray(state.military.corps_front_edges[corpsId])) {
            state.military.corps_front_edges[corpsId] = derived[corpsId];
        }
    }
}

/**
 * Apply deterministic, lightweight auto-distribution from corps front edges to brigade AoR.
 * This is intentionally conservative: it assigns only front-adjacent controlled settlements.
 */
export function applyCorpsFrontAutoDistributionForCorps(
    state: GameState,
    corpsId: FormationId
): void {
    const corpsFrontEdges = state.military.corps_front_edges?.[corpsId];
    if (!Array.isArray(corpsFrontEdges) || corpsFrontEdges.length === 0) return;
    const formations = state.military.formations ?? {};
    const corps = formations[corpsId];
    if (!corps || !corps.faction) return;
    const faction = corps.faction;
    const brigades = Object.keys(formations)
        .filter((id) => {
            const f = formations[id];
            return !!f && (f.kind === 'brigade' || f.kind === 'hv_phantom') && f.corps_id === corpsId && f.faction === faction;
        })
        .sort(strictCompare);
    if (brigades.length === 0) return;
}

export function applyCorpsFrontAutoDistribution(
    state: GameState
): void {
    if (!state.military.corps_front_edges) return;
    for (const corpsId of Object.keys(state.military.corps_front_edges).sort(strictCompare)) {
        applyCorpsFrontAutoDistributionForCorps(state, corpsId);
    }
}

