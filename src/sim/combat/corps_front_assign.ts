import type { EdgeRecord } from '../../map/settlements.js';
import type { FormationId, GameState, SettlementId } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

function edgeId(a: string, b: string): string {
    return a < b ? `${a}__${b}` : `${b}__${a}`;
}

function parseEdgeId(id: string): [SettlementId, SettlementId] | null {
    const parts = id.split('__');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    return [parts[0] as SettlementId, parts[1] as SettlementId];
}

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
    if (!state.corps_front_edges) {
        state.corps_front_edges = derived;
        return;
    }
    for (const corpsId of Object.keys(derived).sort(strictCompare)) {
        if (!Array.isArray(state.corps_front_edges[corpsId])) {
            state.corps_front_edges[corpsId] = derived[corpsId];
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
    const corpsFrontEdges = state.corps_front_edges?.[corpsId];
    if (!Array.isArray(corpsFrontEdges) || corpsFrontEdges.length === 0) return;
    const formations = state.formations ?? {};
    const corps = formations[corpsId];
    if (!corps || !corps.faction) return;
    const faction = corps.faction;
    const brigades = Object.keys(formations)
        .filter((id) => {
            const f = formations[id];
            return !!f && (f.kind ?? 'brigade') === 'brigade' && f.corps_id === corpsId && f.faction === faction;
        })
        .sort(strictCompare);
    if (brigades.length === 0) return;
}

export function applyCorpsFrontAutoDistribution(
    state: GameState
): void {
    if (!state.corps_front_edges) return;
    for (const corpsId of Object.keys(state.corps_front_edges).sort(strictCompare)) {
        applyCorpsFrontAutoDistributionForCorps(state, corpsId);
    }
}

/**
 * Translate corps-level attack axis intents into per-brigade attack targets.
 * Deterministic: sorted corps, brigades, and target settlement IDs.
 */
export function applyCorpsAttackAxisOrders(
    state: GameState
): void {
    const axisOrders = state.corps_attack_axis_orders;
    if (!axisOrders) return;
    const formations = state.formations ?? {};
    const controllers = state.political_controllers ?? {};
    if (!state.brigade_attack_orders) state.brigade_attack_orders = {};
    for (const corpsId of Object.keys(axisOrders).sort(strictCompare)) {
        const corps = formations[corpsId];
        if (!corps || !corps.faction) continue;
        const edgeIds = (axisOrders[corpsId]?.edge_ids ?? []).slice().sort(strictCompare);
        if (edgeIds.length === 0) continue;
        const targets = new Set<string>();
        for (const edgeId of edgeIds) {
            const parsed = parseEdgeId(edgeId);
            if (!parsed) continue;
            const [a, b] = parsed;
            if (controllers[a] && controllers[a] !== corps.faction) targets.add(a);
            if (controllers[b] && controllers[b] !== corps.faction) targets.add(b);
        }
        const targetList = [...targets].sort(strictCompare);
        if (targetList.length === 0) continue;
        const brigades = Object.keys(formations)
            .filter((id) => {
                const f = formations[id];
                return !!f && (f.kind ?? 'brigade') === 'brigade' && f.corps_id === corpsId && f.faction === corps.faction;
            })
            .sort(strictCompare);
        for (let i = 0; i < brigades.length; i++) {
            state.brigade_attack_orders[brigades[i]] = targetList[i % targetList.length];
        }
    }
}

