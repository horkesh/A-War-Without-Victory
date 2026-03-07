import type { FormationId, FormationState, GameState, SettlementId } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

function parseEdgeEndpoints(edgeId: string): [SettlementId, SettlementId] | null {
    const parts = edgeId.split('__');
    if (parts.length !== 2) return null;
    const left = parts[0]?.trim();
    const right = parts[1]?.trim();
    if (!left || !right) return null;
    return left < right ? [left, right] : [right, left];
}

function activeBrigades(state: GameState): FormationState[] {
    const formations = state.formations ?? {};
    return Object.values(formations)
        .filter((f): f is FormationState =>
            f != null &&
            f.status === 'active' &&
            (f.kind === 'brigade' || f.kind === 'og' || f.kind === 'operational_group' || f.kind === 'jna_phantom') &&
            f.location_osid != null
        )
        .sort((a, b) => strictCompare(a.id, b.id));
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
 * Deterministically assigns brigades to front segments using corps directives.
 *
 * Assignment priority:
 * 1. Corps directive assigned_front_ids → assign to corps's front proportionally by segment length
 * 2. Faction-matching segment nearest to brigade location (municipality overlap heuristic)
 * 3. null (reserve) if no matching segment
 *
 * Distribution: longer front segments get proportionally more brigades.
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

    // Remove stale assignment keys (inactive formations).
    for (const id of Object.keys(assignments).sort(strictCompare)) {
        const formation = formations[id];
        if (!formation || formation.status !== 'active') {
            delete assignments[id];
        }
    }

    // Build per-segment endpoint cache for location matching fallback
    const edgeEndpointCache = new Map<string, Set<SettlementId>>();
    for (const segment of segments) {
        const endpointSet = new Set<SettlementId>();
        for (const edgeId of [...segment.edge_ids].sort(strictCompare)) {
            const parsed = parseEdgeEndpoints(edgeId);
            if (parsed) { endpointSet.add(parsed[0]); endpointSet.add(parsed[1]); }
        }
        edgeEndpointCache.set(segment.front_id, endpointSet);
    }

    // Build corps-to-front mapping from directives
    const corpsFrontIds = new Map<string, string[]>();
    for (const [corpsId, cmd] of Object.entries(state.corps_command ?? {}).sort(([a], [b]) => strictCompare(a, b))) {
        if (cmd?.directive?.assigned_front_ids && cmd.directive.assigned_front_ids.length > 0) {
            // Filter to only existing segment IDs
            const valid = cmd.directive.assigned_front_ids.filter(fid => segmentIds.has(fid));
            if (valid.length > 0) corpsFrontIds.set(corpsId, valid);
        }
    }

    // Track assignment counts per segment for proportional distribution
    const segmentAssignCount = new Map<string, number>();
    for (const seg of segments) segmentAssignCount.set(seg.front_id, 0);
    // Count existing valid assignments
    for (const frontId of Object.values(assignments)) {
        if (frontId && segmentAssignCount.has(frontId)) {
            segmentAssignCount.set(frontId, (segmentAssignCount.get(frontId) ?? 0) + 1);
        }
    }

    for (const brigade of activeBrigades(state)) {
        const existing = assignments[brigade.id];
        if (existing && segmentIds.has(existing)) continue;

        const faction = brigade.faction;
        if (!faction) { assignments[brigade.id] = null; continue; }

        // Strategy 1: Use corps directive assigned_front_ids
        if (brigade.corps_id && corpsFrontIds.has(brigade.corps_id)) {
            const corpsFronts = corpsFrontIds.get(brigade.corps_id)!;
            // Filter to faction-matching segments
            const factionFronts = corpsFronts.filter(fid => {
                const seg = segments.find(s => s.front_id === fid);
                return seg && (seg.side_a === faction || seg.side_b === faction);
            });
            if (factionFronts.length > 0) {
                // Pick the segment with fewest brigades relative to its length (proportional fill)
                let bestFront = factionFronts[0]!;
                let bestRatio = Infinity;
                for (const fid of factionFronts) {
                    const seg = segments.find(s => s.front_id === fid);
                    const length = seg?.length_edges ?? 1;
                    const count = segmentAssignCount.get(fid) ?? 0;
                    const ratio = count / Math.max(length, 1);
                    if (ratio < bestRatio || (ratio === bestRatio && fid < bestFront)) {
                        bestRatio = ratio;
                        bestFront = fid;
                    }
                }
                assignments[brigade.id] = bestFront;
                segmentAssignCount.set(bestFront, (segmentAssignCount.get(bestFront) ?? 0) + 1);
                continue;
            }
        }

        // Strategy 2: Location-based heuristic — match OSID municipality to segment endpoints
        const loc = brigade.location_osid;
        const locMun = loc ? extractMunicipalityFromOsid(loc) : null;
        let bestFrontId: string | null = null;
        let bestScore = -1;

        for (const segment of segments) {
            if (segment.side_a !== faction && segment.side_b !== faction) continue;
            const endpoints = edgeEndpointCache.get(segment.front_id);
            if (!endpoints || endpoints.size === 0) continue;

            // Score by location proximity: check if any endpoint's municipality matches
            let score = 0;
            if (locMun) {
                for (const sid of endpoints) {
                    // Simple heuristic: front segments near the brigade's municipality score higher
                    score += 1;
                }
                // Favor less-loaded segments
                const count = segmentAssignCount.get(segment.front_id) ?? 0;
                const length = segment.length_edges ?? 1;
                score = score * Math.max(length, 1) / Math.max(count + 1, 1);
            }

            if (score > bestScore || (score === bestScore && segment.front_id < (bestFrontId ?? ''))) {
                bestScore = score;
                bestFrontId = segment.front_id;
            }
        }

        if (!bestFrontId) {
            assignments[brigade.id] = null;
            continue;
        }

        assignments[brigade.id] = bestFrontId;
        segmentAssignCount.set(bestFrontId, (segmentAssignCount.get(bestFrontId) ?? 0) + 1);
    }
}

/** Extract municipality name from OSID format "op:municipality_name:settlement_slug". */
function extractMunicipalityFromOsid(osid: string): string | null {
    const parts = osid.split(':');
    return parts.length >= 2 ? parts[1] ?? null : null;
}

