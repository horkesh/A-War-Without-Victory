import { FrontPostureAssignment, GameState, PostureLevel } from './game_state.js';

function isPostureLevel(value: unknown): value is PostureLevel {
    return value === 'hold' || value === 'probe' || value === 'push';
}

function clampWeight(value: unknown): number {
    if (!Number.isInteger(value)) return 0;
    const n = value as number;
    return n < 0 ? 0 : n;
}

/**
 * Deterministically normalize front posture assignments (state hygiene only).
 *
 * - Removes stale edge assignments not present in state.military.front_segments.
 * - Keeps assignments for inactive segments but forces weight=0.
 * - Clamps weight to integer >= 0.
 * - Coerces invalid posture values to "hold".
 *
 * No gameplay effects are applied.
 */
export function normalizeFrontPosture(state: GameState): void {
    if (!state.military.front_posture || typeof state.military.front_posture !== 'object') {
        state.military.front_posture = {};
        return;
    }

    const segmentKeys = new Set(Object.keys(state.military.front_segments ?? {}));
    const factionIdsSorted = Object.keys(state.military.front_posture).sort();

    for (const factionId of factionIdsSorted) {
        const fp = state.military.front_posture[factionId];
        if (!fp || typeof fp !== 'object') continue;
        const assignments = fp.assignments;
        if (!assignments || typeof assignments !== 'object') {
            fp.assignments = {};
            continue;
        }

        const edgeIdsSorted = Object.keys(assignments).sort();
        const next: Record<string, FrontPostureAssignment> = {};

        for (const edge_id of edgeIdsSorted) {
            const a = assignments[edge_id];
            if (!a || typeof a !== 'object') continue;

            // Remove stale edge assignments not present in front_segments.
            if (!segmentKeys.has(edge_id)) continue;

            const seg = state.military.front_segments[edge_id];
            const isActive = seg && seg.active === true;

            const posture: PostureLevel = isPostureLevel(a.posture) ? a.posture : 'hold';
            const weight = isActive ? clampWeight(a.weight) : 0;

            next[edge_id] = { edge_id, posture, weight };
        }

        fp.assignments = next;
    }
}

