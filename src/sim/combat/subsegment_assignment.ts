/**
 * Brigade-to-sub-segment assignment within sectors.
 * Extracted from corps_front_sectors.ts — pure refactoring, zero behavior change.
 */

import type {
    CorpsFrontSector,
    CorpsFrontSubSegment,
    FactionId,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getCorpsCommander } from './officer_system.js';
import { bfsDistance } from './sector_utils.js';

/** Sub-segments wider than this get 2+ brigades. */
const WIDE_SEGMENT_THRESHOLD = 5;

/** Home OSID affinity bonus when brigade's home_osid is in the sub-segment's friendly OSIDs. */
const HOME_AFFINITY_BONUS = 1.3;

/** Mechanized/motorized brigade terrain affinity bonus for non-mountain sub-segments. */
const MECH_TERRAIN_BONUS = 1.2;

/** Aggressive commander bonus: best personnel brigades get extra affinity for the widest sub-segment (most enemy OSIDs). */
const AGGRESSIVE_COMMANDER_CONCENTRATION_BONUS = 1.4;

/** Cautious commander spread bonus: brigades get extra affinity for under-covered sub-segments. */
const CAUTIOUS_COMMANDER_SPREAD_BONUS = 1.25;

/**
 * Assign front-line brigades to sub-segments within each sector.
 * Each brigade gets exactly one sub-segment (their AoR). Each sub-segment
 * should have at least one brigade if possible. Widest segments get priority.
 *
 * Deterministic: sorted iteration, greedy best-fit.
 */
export function assignBrigadesToSubSegments(
    state: GameState,
    sectors: CorpsFrontSector[],
    adjacency: Map<string, string[]>
): void {
    const formations = state.military.formations ?? {};

    // Build friendly OSID sets per faction (BFS should not path through enemy territory)
    const friendlyByFaction = new Map<FactionId, Set<string>>();
    const pc = state.political?.political_controllers ?? {};
    for (const [osid, controller] of Object.entries(pc)) {
        if (!controller) continue;
        let s = friendlyByFaction.get(controller as FactionId);
        if (!s) { s = new Set<string>(); friendlyByFaction.set(controller as FactionId, s); }
        s.add(osid);
    }

    for (const sector of sectors) {
        if (sector.sub_segments.length === 0) continue;

        // Reset previous assignments
        for (const ss of sector.sub_segments) {
            ss.primary_brigade_ids = [];
            ss.gap = false;
        }

        // Separate front-line brigades from reserves
        const frontBrigadeIds: string[] = [];
        for (const bid of sector.assigned_brigade_ids) {
            if (sector.reserve_brigade_ids.includes(bid)) continue;
            const f = formations[bid];
            if (!f || f.status === 'inactive') continue;
            frontBrigadeIds.push(bid);
        }

        if (frontBrigadeIds.length === 0) {
            for (const ss of sector.sub_segments) {
                ss.gap = true;
            }
            continue;
        }

        // If only 1 sub-segment, assign all front brigades to it
        if (sector.sub_segments.length === 1) {
            sector.sub_segments[0]!.primary_brigade_ids = [...frontBrigadeIds].sort(strictCompare);
            for (const bid of frontBrigadeIds) {
                const f = formations[bid];
                if (f) f.assigned_sub_segment_id = sector.sub_segments[0]!.sub_segment_id;
            }
            continue;
        }

        // Compute affinity for each brigade × sub-segment pair
        const commander = getCorpsCommander(sector.corps_id, state);
        const commanderAggr = commander?.data.aggressiveness ?? 3;

        let maxEnemyOsids = 0;
        let maxEnemySsIdx = 0;
        if (commanderAggr >= 4) {
            for (let si = 0; si < sector.sub_segments.length; si++) {
                const enemyCount = sector.sub_segments[si]!.enemy_osids.length;
                if (enemyCount > maxEnemyOsids ||
                    (enemyCount === maxEnemyOsids && si < maxEnemySsIdx)) {
                    maxEnemyOsids = enemyCount;
                    maxEnemySsIdx = si;
                }
            }
        }

        let minEdges = Infinity;
        let minEdgesSsIdx = 0;
        if (commanderAggr <= 1) {
            for (let si = 0; si < sector.sub_segments.length; si++) {
                const edges = sector.sub_segments[si]!.length_edges;
                if (edges < minEdges) {
                    minEdges = edges;
                    minEdgesSsIdx = si;
                }
            }
        }

        const brigadePersonnel = new Map<string, number>();
        for (const bid of frontBrigadeIds) {
            const f = formations[bid];
            brigadePersonnel.set(bid, f?.personnel ?? 0);
        }
        const topHalfPersonnel = new Set<string>();
        if (commanderAggr >= 4) {
            const sorted = [...frontBrigadeIds].sort((a, b) =>
                (brigadePersonnel.get(b) ?? 0) - (brigadePersonnel.get(a) ?? 0) ||
                a.localeCompare(b));
            const halfCount = Math.ceil(sorted.length / 2);
            for (let i = 0; i < halfCount; i++) topHalfPersonnel.add(sorted[i]!);
        }

        const affinities: Array<{ bid: string; ssIdx: number; score: number }> = [];
        for (const bid of frontBrigadeIds) {
            const f = formations[bid];
            if (!f) continue;
            const brigLoc = (f as FormationState & { location_osid?: string }).location_osid ?? '';
            const brigHome = f.home_osid ?? '';
            const isMech = f.equipment_class === 'mechanized' || f.equipment_class === 'motorized';

            for (let si = 0; si < sector.sub_segments.length; si++) {
                const ss = sector.sub_segments[si]!;
                let minDist = Infinity;
                for (const fOsid of ss.friendly_osids) {
                    if (fOsid === brigLoc) { minDist = 0; break; }
                    const d = bfsDistance(brigLoc, fOsid, adjacency, friendlyByFaction.get(sector.faction));
                    if (d < minDist) minDist = d;
                }
                let score = 1.0 / (1 + (minDist === Infinity ? 20 : minDist));

                if (brigHome && ss.friendly_osids.includes(brigHome)) {
                    score *= HOME_AFFINITY_BONUS;
                }

                if (isMech) {
                    score *= MECH_TERRAIN_BONUS;
                }

                if (commanderAggr >= 4 && si === maxEnemySsIdx && topHalfPersonnel.has(bid)) {
                    score *= AGGRESSIVE_COMMANDER_CONCENTRATION_BONUS;
                }

                if (commanderAggr <= 1 && si === minEdgesSsIdx) {
                    score *= CAUTIOUS_COMMANDER_SPREAD_BONUS;
                }

                affinities.push({ bid, ssIdx: si, score });
            }
        }

        const ssOrder = sector.sub_segments
            .map((ss, i) => ({ idx: i, width: ss.length_edges }))
            .sort((a, b) => b.width - a.width || a.idx - b.idx);

        const assignedBrigades = new Set<string>();
        const brigadesPerSubSeg: Map<number, string[]> = new Map();

        // First pass: assign one brigade to each sub-segment (widest first)
        for (const { idx } of ssOrder) {
            const candidates = affinities
                .filter(a => a.ssIdx === idx && !assignedBrigades.has(a.bid))
                .sort((a, b) => b.score - a.score || a.bid.localeCompare(b.bid));

            if (candidates.length > 0) {
                const best = candidates[0]!;
                assignedBrigades.add(best.bid);
                brigadesPerSubSeg.set(idx, [best.bid]);
            }
        }

        // Second pass: assign remaining brigades to sub-segments that need more
        const unassigned = frontBrigadeIds
            .filter(b => !assignedBrigades.has(b))
            .sort(strictCompare);

        for (const bid of unassigned) {
            const candidates = affinities
                .filter(a => a.bid === bid)
                .sort((a, b) => {
                    const ssA = sector.sub_segments[a.ssIdx]!;
                    const ssB = sector.sub_segments[b.ssIdx]!;
                    const countA = brigadesPerSubSeg.get(a.ssIdx)?.length ?? 0;
                    const countB = brigadesPerSubSeg.get(b.ssIdx)?.length ?? 0;
                    const needsA = ssA.length_edges >= WIDE_SEGMENT_THRESHOLD && countA < 2 ? 1 : 0;
                    const needsB = ssB.length_edges >= WIDE_SEGMENT_THRESHOLD && countB < 2 ? 1 : 0;
                    if (needsA !== needsB) return needsB - needsA;
                    return b.score - a.score || a.ssIdx - b.ssIdx;
                });

            if (candidates.length > 0) {
                const best = candidates[0]!;
                const list = brigadesPerSubSeg.get(best.ssIdx) ?? [];
                list.push(bid);
                brigadesPerSubSeg.set(best.ssIdx, list);
            }
        }

        // Write assignments to sub-segments and formations
        for (let si = 0; si < sector.sub_segments.length; si++) {
            const ss = sector.sub_segments[si]!;
            const assigned = brigadesPerSubSeg.get(si) ?? [];
            ss.primary_brigade_ids = assigned.sort(strictCompare);
            ss.gap = assigned.length === 0;

            for (const bid of assigned) {
                const f = formations[bid];
                if (f) f.assigned_sub_segment_id = ss.sub_segment_id;
            }
        }

        mergeGapSubSegments(sector, brigadesPerSubSeg, formations);
    }
}

/**
 * Merge gap sub-segments into their nearest non-gap neighbor.
 * The neighbor's brigade stretches to cover the gap — AoR widens, defense thins,
 * but every front edge has a responsible brigade. No unowned holes in the line.
 */
export function mergeGapSubSegments(
    sector: CorpsFrontSector,
    brigadesPerSubSeg: Map<number, string[]>,
    formations: Record<string, FormationState>
): void {
    if (sector.sub_segments.length <= 1) return;

    const gapIndices: number[] = [];
    for (let si = 0; si < sector.sub_segments.length; si++) {
        if (sector.sub_segments[si]!.gap) gapIndices.push(si);
    }
    if (gapIndices.length === 0) return;
    if (gapIndices.length === sector.sub_segments.length) return;

    for (const gapIdx of gapIndices) {
        const gapSS = sector.sub_segments[gapIdx]!;
        const gapFriendly = new Set(gapSS.friendly_osids);

        let bestNeighborIdx = -1;
        let bestOverlap = -Infinity;

        for (let si = 0; si < sector.sub_segments.length; si++) {
            if (si === gapIdx) continue;
            const candidate = sector.sub_segments[si]!;
            if (candidate.gap) continue;

            let overlap = 0;
            for (const osid of candidate.friendly_osids) {
                if (gapFriendly.has(osid)) overlap++;
            }
            if (overlap === 0) overlap = -Math.abs(si - gapIdx);

            if (overlap > bestOverlap || (overlap === bestOverlap && si < bestNeighborIdx)) {
                bestOverlap = overlap;
                bestNeighborIdx = si;
            }
        }

        if (bestNeighborIdx < 0) continue;

        const neighbor = sector.sub_segments[bestNeighborIdx]!;
        for (const eid of gapSS.edge_ids) {
            if (!neighbor.edge_ids.includes(eid)) neighbor.edge_ids.push(eid);
        }
        for (const osid of gapSS.friendly_osids) {
            if (!neighbor.friendly_osids.includes(osid)) neighbor.friendly_osids.push(osid);
        }
        for (const osid of gapSS.enemy_osids) {
            if (!neighbor.enemy_osids.includes(osid)) neighbor.enemy_osids.push(osid);
        }
        neighbor.edge_ids.sort(strictCompare);
        neighbor.friendly_osids.sort(strictCompare);
        neighbor.enemy_osids.sort(strictCompare);
        neighbor.length_edges = neighbor.edge_ids.length;

        for (const bid of neighbor.primary_brigade_ids) {
            const f = formations[bid];
            if (f) f.assigned_sub_segment_id = neighbor.sub_segment_id;
        }

        gapSS.edge_ids = [];
        gapSS.friendly_osids = [];
        gapSS.enemy_osids = [];
        gapSS.length_edges = 0;
    }

    sector.sub_segments = sector.sub_segments.filter(ss => ss.length_edges > 0);
}

/**
 * Find which sub-segment contains a given OSID (either as friendly or enemy).
 * Returns the sub-segment, or undefined if not found.
 */
export function findSubSegmentForOsid(
    sector: CorpsFrontSector,
    targetOsid: string
): CorpsFrontSubSegment | undefined {
    for (const ss of sector.sub_segments) {
        if (ss.friendly_osids.includes(targetOsid) || ss.enemy_osids.includes(targetOsid)) {
            return ss;
        }
    }
    return undefined;
}
