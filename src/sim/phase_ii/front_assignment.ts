import type { FormationId, GameState, SettlementId } from '../../state/game_state.js';
import { getLegacyAoR } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

function parseEdgeEndpoints(edgeId: string): [SettlementId, SettlementId] | null {
    const parts = edgeId.split('__');
    if (parts.length !== 2) return null;
    const left = parts[0]?.trim();
    const right = parts[1]?.trim();
    if (!left || !right) return null;
    return left < right ? [left, right] : [right, left];
}

function activeBrigadeIds(state: GameState): FormationId[] {
    const formations = state.formations ?? {};
    return Object.keys(formations)
        .filter((id) => {
            const formation = formations[id];
            return !!formation && (formation.kind ?? 'brigade') === 'brigade';
        })
        .sort(strictCompare);
}

function brigadeAorSet(state: GameState, formationId: FormationId): Set<SettlementId> {
    const out = new Set<SettlementId>();
    const brigadeAor = getLegacyAoR(state).brigade_aor ?? {};
    for (const sid of Object.keys(brigadeAor).sort(strictCompare)) {
        if (brigadeAor[sid] === formationId) out.add(sid);
    }
    return out;
}

export function hasValidFrontAssignment(state: GameState, formationId: FormationId): boolean {
    const segments = state.assignable_front_segments ?? [];
    // Backward-compatible behavior for legacy saves/tests before segment derivation exists.
    if (segments.length === 0) return true;
    const assignmentMap = state.brigade_front_assignment;
    if (!assignmentMap || Object.keys(assignmentMap).length === 0) return true;
    const assignment = assignmentMap[formationId];
    if (!assignment) return false;
    return segments.some((segment) => segment.front_id === assignment);
}

export function isBrigadeAssignedToFront(state: GameState, formationId: FormationId): boolean {
    const formation = state.formations?.[formationId];
    if (!formation || (formation.kind ?? 'brigade') !== 'brigade') return false;
    return hasValidFrontAssignment(state, formationId);
}

/**
 * Deterministically assigns brigades to currently available hostile front segments.
 * Existing valid assignments are preserved. Missing/invalid assignments are repaired.
 */
export function ensureBrigadeFrontAssignments(state: GameState): void {
    if (!state.brigade_front_assignment || typeof state.brigade_front_assignment !== 'object') {
        state.brigade_front_assignment = {};
    }
    const assignments = state.brigade_front_assignment;
    const segments = (state.assignable_front_segments ?? []).slice().sort((a, b) => a.front_id.localeCompare(b.front_id));
    const segmentIds = new Set(segments.map((segment) => segment.front_id));
    const formations = state.formations ?? {};

    // Remove stale assignment keys (non-brigade formations).
    for (const id of Object.keys(assignments).sort(strictCompare)) {
        const formation = formations[id];
        if (!formation || (formation.kind ?? 'brigade') !== 'brigade') {
            delete assignments[id];
        }
    }

    const edgeEndpointCache = new Map<string, Set<SettlementId>>();
    for (const segment of segments) {
        const endpointSet = new Set<SettlementId>();
        const edgeIds = [...segment.edge_ids].sort(strictCompare);
        for (const edgeId of edgeIds) {
            const parsed = parseEdgeEndpoints(edgeId);
            if (!parsed) continue;
            endpointSet.add(parsed[0]);
            endpointSet.add(parsed[1]);
        }
        edgeEndpointCache.set(segment.front_id, endpointSet);
    }

    for (const brigadeId of activeBrigadeIds(state)) {
        const existing = assignments[brigadeId];
        if (existing && segmentIds.has(existing)) continue;

        const formation = formations[brigadeId];
        if (!formation || !formation.faction) {
            assignments[brigadeId] = null;
            continue;
        }

        const aorSettlements = brigadeAorSet(state, brigadeId);
        const faction = formation.faction;
        let bestFrontId: string | null = null;
        let bestScore = -1;

        for (const segment of segments) {
            if (segment.side_a !== faction && segment.side_b !== faction) continue;
            const endpoints = edgeEndpointCache.get(segment.front_id);
            if (!endpoints || endpoints.size === 0) continue;

            let overlap = 0;
            for (const sid of endpoints) {
                if (aorSettlements.has(sid)) overlap += 1;
            }
            if (overlap > bestScore) {
                bestScore = overlap;
                bestFrontId = segment.front_id;
            }
        }

        if (!bestFrontId) {
            assignments[brigadeId] = null;
            continue;
        }

        assignments[brigadeId] = bestFrontId;
    }
}

