/**
 * Edge adjacency building for corps front sectors.
 * Extracted from corps_front_sectors.ts — pure refactoring, zero behavior change.
 */

import type { OsidCentroidMap } from '../../data/operational_data_types.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { Osid } from './osid_adjacency.js';

/**
 * Topological verification for Case B connections: does the common hostile OSID H
 * sit between the two friendly OSIDs fi and fj?
 *
 * Case B connects front edges facing the same hostile OSID H. When the friendly
 * OSIDs share a GIS polygon boundary (point touch) but sit on opposite sides
 * of the hostile pocket, they are topologically distinct front segments.
 *
 * Bridge criteria: angle between vectors (H→fi) and (H→fj) > 165°.
 */
export function isCaseBBridge(
    fi: Osid,
    fj: Osid,
    h: Osid,
    centroids?: OsidCentroidMap
): boolean {
    if (!centroids) return false;
    const cFi = centroids.get(fi);
    const cFj = centroids.get(fj);
    const cH = centroids.get(h);
    if (!cFi || !cFj || !cH) return false;

    // Vectors from H to fi and fj
    const v1 = { lat: cFi.lat - cH.lat, lon: cFi.lon - cH.lon };
    const v2 = { lat: cFj.lat - cH.lat, lon: cFj.lon - cH.lon };

    const angle1 = Math.atan2(v1.lat, v1.lon);
    const angle2 = Math.atan2(v2.lat, v2.lon);
    let diff = Math.abs(angle1 - angle2);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;

    const deg = (diff * 180) / Math.PI;
    return deg > 165; // Opposite sides of H -> bridge
}

/** Check if two OSIDs are adjacent in the OSID adjacency map. */
export function isOsidAdjacent(a: Osid, b: Osid, adj: Map<Osid, Osid[]>): boolean {
    return (adj.get(a) ?? []).includes(b);
}

/**
 * Build adjacency map between front edges using front-line-following
 * (triple-junction connectivity).
 *
 * Two front edges are adjacent on the front line iff they meet at a polygon
 * triple junction — three mutually adjacent OSIDs forming a corner of the front.
 *
 * Case A: same friendly OSID F, hostile OSIDs H₁ adj H₂ → triple junction (F, H₁, H₂)
 * Case B: same hostile OSID H, friendly OSIDs F₁ adj F₂ → triple junction (F₁, F₂, H)
 *
 * When faction/osidAdjacency are not provided (decompose/bisect paths), falls back
 * to shared-OSID grouping without adjacency walk.
 */
export function buildEdgeAdjacency(
    edgeIds: string[],
    edgeMeta: Map<string, { a: string; b: string; side_a?: string | null; side_b?: string | null }>,
    faction?: string,
    osidAdjacency?: Map<Osid, Osid[]>,
    sharedBoundaryAdj?: Map<Osid, Osid[]>,
    centroids?: OsidCentroidMap,
): Map<string, string[]> {
    // Use Set-based adjacency for O(1) dedup, convert to sorted arrays at end
    const adjSets = new Map<string, Set<string>>();
    const link = (a: string, b: string) => {
        if (a === b) return;
        let sa = adjSets.get(a);
        if (!sa) { sa = new Set(); adjSets.set(a, sa); }
        sa.add(b);
        let sb = adjSets.get(b);
        if (!sb) { sb = new Set(); adjSets.set(b, sb); }
        sb.add(a);
    };

    if (faction !== undefined && osidAdjacency !== undefined) {
        // Triple-junction connectivity: follow the front line, not territory BFS.
        const friendlyToEdges = new Map<string, string[]>();
        const hostileToEdges = new Map<string, string[]>();
        const edgeHostile = new Map<string, string>();
        const edgeFriendly = new Map<string, string>();

        for (const eid of edgeIds) {
            const meta = edgeMeta.get(eid);
            if (!meta) continue;
            let friendly: string, hostile: string;
            if (meta.side_a === faction) { friendly = meta.a; hostile = meta.b; }
            else if (meta.side_b === faction) { friendly = meta.b; hostile = meta.a; }
            else continue;

            edgeFriendly.set(eid, friendly);
            edgeHostile.set(eid, hostile);

            let list = friendlyToEdges.get(friendly);
            if (!list) { list = []; friendlyToEdges.set(friendly, list); }
            list.push(eid);

            list = hostileToEdges.get(hostile);
            if (!list) { list = []; hostileToEdges.set(hostile, list); }
            list.push(eid);
        }

        // Both Case A and Case B use sharedBoundaryAdj to require true shared
        // polygon boundaries (not distance contacts). Without this, degenerate
        // triple junctions through near-miss polygon adjacency bridge disconnected
        // front segments (e.g. Srebrenica ↔ Cerska via distance_contact hostiles).
        const caseAdj = sharedBoundaryAdj ?? osidAdjacency;

        // Case A: same friendly OSID, hostile OSIDs share a true boundary.
        // Front turns along the friendly polygon boundary at a triple junction.
        for (const edges of friendlyToEdges.values()) {
            for (let i = 0; i < edges.length; i++) {
                const hi = edgeHostile.get(edges[i]!)!;
                for (let j = i + 1; j < edges.length; j++) {
                    const hj = edgeHostile.get(edges[j]!)!;
                    if (isOsidAdjacent(hi as Osid, hj as Osid, caseAdj)) {
                        link(edges[i]!, edges[j]!);
                    }
                }
            }
        }

        // Case B: same hostile OSID, friendly OSIDs share a true boundary.
        // Front turns along the hostile polygon boundary at a triple junction.
        for (const [h, edges] of hostileToEdges.entries()) {
            for (let i = 0; i < edges.length; i++) {
                const fi = edgeFriendly.get(edges[i]!)! as Osid;
                for (let j = i + 1; j < edges.length; j++) {
                    const fj = edgeFriendly.get(edges[j]!)! as Osid;
                    if (isOsidAdjacent(fi, fj, caseAdj)) {
                        // Topological check: is this a bridge across a hostile pocket?
                        if (isCaseBBridge(fi, fj, h as Osid, centroids)) continue;
                        link(edges[i]!, edges[j]!);
                    }
                }
            }
        }

    } else {
        // No faction/adjacency: group by shared OSID only (decompose/bisect paths).
        const osidToEdges = new Map<string, string[]>();
        for (const eid of edgeIds) {
            const meta = edgeMeta.get(eid);
            if (!meta) continue;
            for (const osid of [meta.a, meta.b]) {
                let list = osidToEdges.get(osid);
                if (!list) { list = []; osidToEdges.set(osid, list); }
                list.push(eid);
            }
        }
        for (const edges of osidToEdges.values()) {
            for (let i = 0; i < edges.length; i++) {
                for (let j = i + 1; j < edges.length; j++) {
                    link(edges[i]!, edges[j]!);
                }
            }
        }
    }

    // Convert Sets to sorted arrays
    const adj = new Map<string, string[]>();
    for (const [k, s] of adjSets) {
        adj.set(k, [...s].sort(strictCompare));
    }
    return adj;
}


/**
 * Build edge adjacency using Case A + strict-triple-junction Case B.
 * Case A (same friendly, hostile adj): always included.
 * Case B (same hostile H, friendly fi/fj adj): only included when BOTH
 * fi-H and fj-H are within the provided adjacency threshold. Without this,
 * Case B bridges front edges facing the same enemy pocket from different sides
 * through GIS near-miss contacts (e.g. olovo_2↔krivajevici at 16.9m connects
 * front segments on opposite sides of the RS Vares pocket). The caller controls
 * the threshold via `strictAdjForCaseB` — typically 16.6m (natural gap in the
 * Case B distance distribution between 15.5m and 24.6m).
 */
export function buildEdgeAdjacencyStrictCaseB(
    edgeIds: string[],
    edgeMeta: Map<string, { a: string; b: string; side_a?: string | null; side_b?: string | null }>,
    faction: string,
    caseAdj: Map<Osid, Osid[]>,
    strictAdjForCaseB: Map<Osid, Osid[]>,
    centroids?: OsidCentroidMap,
): Map<string, string[]> {
    const adjSets = new Map<string, Set<string>>();
    const link = (a: string, b: string) => {
        let sa = adjSets.get(a);
        if (!sa) { sa = new Set(); adjSets.set(a, sa); }
        sa.add(b);
        let sb = adjSets.get(b);
        if (!sb) { sb = new Set(); adjSets.set(b, sb); }
        sb.add(a);
    };

    const friendlyToEdges = new Map<string, string[]>();
    const hostileToEdges = new Map<string, string[]>();
    const edgeHostile = new Map<string, string>();
    const edgeFriendly = new Map<string, string>();

    for (const eid of edgeIds) {
        const meta = edgeMeta.get(eid);
        if (!meta) continue;
        let friendly: string, hostile: string;
        if (meta.side_a === faction) { friendly = meta.a; hostile = meta.b; }
        else if (meta.side_b === faction) { friendly = meta.b; hostile = meta.a; }
        else continue;
        edgeFriendly.set(eid, friendly);
        edgeHostile.set(eid, hostile);
        let list = friendlyToEdges.get(friendly);
        if (!list) { list = []; friendlyToEdges.set(friendly, list); }
        list.push(eid);
        list = hostileToEdges.get(hostile);
        if (!list) { list = []; hostileToEdges.set(hostile, list); }
        list.push(eid);
    }

    // Case A: same friendly OSID, hostile OSIDs share a boundary
    for (const edges of friendlyToEdges.values()) {
        for (let i = 0; i < edges.length; i++) {
            const hi = edgeHostile.get(edges[i]!)! as Osid;
            for (let j = i + 1; j < edges.length; j++) {
                const hj = edgeHostile.get(edges[j]!)! as Osid;
                if (isOsidAdjacent(hi, hj, caseAdj)) {
                    link(edges[i]!, edges[j]!);
                }
            }
        }
    }

    // Case B (threshold-gated): same hostile H, friendly fi/fj adj,
    // AND both fi-H and fj-H must be within the provided adjacency threshold.
    // Prevents pocket bridges where GIS polygons are near but not truly shared.
    for (const [h, edges] of hostileToEdges.entries()) {
        for (let i = 0; i < edges.length; i++) {
            const fi = edgeFriendly.get(edges[i]!)! as Osid;
            const hi = edgeHostile.get(edges[i]!)! as Osid; // same as H for all in group
            for (let j = i + 1; j < edges.length; j++) {
                const fj = edgeFriendly.get(edges[j]!)! as Osid;
                if (!isOsidAdjacent(fi, fj, caseAdj)) continue;
                // Strict check: fi-H and fj-H must both be in strict adjacency
                if (!isOsidAdjacent(fi, hi, strictAdjForCaseB)) continue;
                if (!isOsidAdjacent(fj, hi, strictAdjForCaseB)) continue;
                // Topological check: is this a bridge across a hostile pocket?
                if (isCaseBBridge(fi, fj, h as Osid, centroids)) continue;
                link(edges[i]!, edges[j]!);
            }
        }
    }


    const adj = new Map<string, string[]>();
    for (const [k, s] of adjSets) {
        adj.set(k, [...s].sort(strictCompare));
    }
    return adj;
}

/**
 * Check if two sub-segments are adjacent on the front line (triple-junction rule).
 * Two segments are front-adjacent if any of their front edges meet at a polygon
 * triple junction — shared friendly + hostile adj, or shared hostile + friendly adj.
 */
export function isSegmentAdjacent(
    a: { friendly_osids: string[]; enemy_osids: string[]; edge_ids: string[] },
    b: { friendly_osids: string[]; enemy_osids: string[]; edge_ids: string[] },
    osidAdjacency: Map<Osid, Osid[]>,
    sharedBoundaryAdj?: Map<Osid, Osid[]>,
): boolean {
    const aFriendlySet = new Set(a.friendly_osids);
    const bFriendlySet = new Set(b.friendly_osids);

    type FrontEdge = { friendly: string; hostile: string };
    const parseEdges = (seg: { edge_ids: string[] }, friendlySet: Set<string>): FrontEdge[] => {
        const result: FrontEdge[] = [];
        for (const eid of seg.edge_ids) {
            const sep = eid.indexOf('__');
            if (sep < 0) continue;
            const osidA = eid.slice(0, sep);
            const osidB = eid.slice(sep + 2);
            if (friendlySet.has(osidA)) result.push({ friendly: osidA, hostile: osidB });
            else if (friendlySet.has(osidB)) result.push({ friendly: osidB, hostile: osidA });
        }
        return result;
    };

    const edgesA = parseEdges(a, aFriendlySet);
    const edgesB = parseEdges(b, bFriendlySet);

    // Both cases use shared-boundary adjacency to avoid bridging through distance contacts.
    const caseAdj = sharedBoundaryAdj ?? osidAdjacency;

    // Check all pairs for triple-junction connectivity
    for (const ea of edgesA) {
        for (const eb of edgesB) {
            // Case A: same friendly, hostile OSIDs share true boundary
            if (ea.friendly === eb.friendly && (caseAdj.get(ea.hostile as Osid) ?? []).includes(eb.hostile)) return true;
            // Case B: same hostile, friendly OSIDs share true boundary
            if (ea.hostile === eb.hostile && (caseAdj.get(ea.friendly as Osid) ?? []).includes(eb.friendly)) return true;
        }
    }

    return false;
}
