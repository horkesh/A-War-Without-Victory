import * as THREE from 'three';
import { SharedBorderSegment, FactionId } from './types';
import { wgsToWorld } from './terrain/TerrainMeshBuilder';
import { HeightmapData } from './terrain/TerrainMeshBuilder';
import { sampleHeight } from './terrain/TextureHelpers';

const FACTION_COLORS: Record<string, number> = {
    RS: 0xff4444,
    RBiH: 0x44ff66,
    HRHB: 0x4488ff,
};

function getGlowMaterial(color: number): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });
}

function normalizeEdgeId(a: string, b: string): string {
    return a < b ? `${a}__${b}` : `${b}__${a}`;
}

function buildTubeForLine(
    points: [number, number][],
    hm: HeightmapData,
    offsetX: number,
    offsetZ: number,
    color: number,
    radius: number,
    opacity: number
): THREE.Mesh | null {
    if (points.length < 2) return null;
    try {
        const curvePoints: THREE.Vector3[] = [];
        for (const p of points) {
            const h = sampleHeight(hm, p[0], p[1]);
            const [wx, wy, wz] = wgsToWorld(p[0], p[1], h);
            curvePoints.push(new THREE.Vector3(wx + offsetX, wy + 0.005, wz + offsetZ));
        }

        // CatmullRomCurve3 needs >=3 points for tangent interpolation; insert midpoint when only 2
        if (curvePoints.length === 2) {
            const a = curvePoints[0]!;
            const b = curvePoints[1]!;
            curvePoints.splice(1, 0, new THREE.Vector3(
                (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2
            ));
        }

        const segments = Math.max(3, curvePoints.length * 2);
        const curve = new THREE.CatmullRomCurve3(curvePoints, false, 'catmullrom', 0.1);
        const geometry = new THREE.TubeGeometry(curve, segments, radius, 5, false);
        const material = getGlowMaterial(color);
        material.opacity = opacity;

        return new THREE.Mesh(geometry, material);
    } catch {
        // Skip segments that fail due to degenerate geometry (e.g. collinear or duplicate points)
        return null;
    }
}

export function buildFrontLineMesh(
    hm: HeightmapData,
    sharedBorders: SharedBorderSegment[],
    controllers: Map<string, FactionId>,
    brigadeAor: Record<string, string | null>,
    formations: Record<string, { faction: string }>,
    frontEdges?: Array<{ edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }>,
    frontPressureByEdge?: Record<string, { edge_id: string; value: number; max_abs: number; last_updated_turn: number }>
): THREE.Group {
    const group = new THREE.Group();
    group.name = 'frontLines';
    const canonicalEdgeById = new Map<string, { edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }>();
    if (Array.isArray(frontEdges)) {
        for (const edge of frontEdges) {
            canonicalEdgeById.set(edge.edge_id, edge);
            canonicalEdgeById.set(normalizeEdgeId(edge.a, edge.b), edge);
        }
    }
    const useCanonicalEdges = canonicalEdgeById.size > 0
        && sharedBorders.some((border) => canonicalEdgeById.has(normalizeEdgeId(border.a, border.b)));

    for (const border of sharedBorders) {
        const edgeId = normalizeEdgeId(border.a, border.b);
        const canonicalEdge = useCanonicalEdges ? canonicalEdgeById.get(edgeId) : undefined;
        if (useCanonicalEdges && !canonicalEdge) continue;
        const fa = canonicalEdge?.side_a ?? controllers.get(border.a);
        const fb = canonicalEdge?.side_b ?? controllers.get(border.b);

        // Front line condition: different factions, neither is null
        if (fa && fb && fa !== fb) {
            // Check if there are opposing units
            const aorA = brigadeAor[border.a];
            const aorB = brigadeAor[border.b];

            const hasUnitA = aorA != null && formations[aorA] != null && formations[aorA].faction === fa;
            const hasUnitB = aorB != null && formations[aorB] != null && formations[aorB].faction === fb;

            // "drawn if there are opposing units in neighboring settlements" 
            if (!useCanonicalEdges && !hasUnitA && !hasUnitB) continue;

            const points = border.points as [number, number][];
            if (points.length < 2) continue;

            // We want two lines:
            // One for faction A (on A's side) and one for faction B (on B's side)
            // But we don't know which side of the line is A vs B unless we look at centroids.
            // As a simplified approach for visual distinction, we just offset the two tubes 
            // perpendicularly to the segment's average tangent.

            const p0 = points[0]!;
            const p1 = points[points.length - 1]!;
            // tangent in WGS long/lat
            const dx = p1[0] - p0[0];
            const dy = p1[1] - p0[1];
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len < 1e-12) continue; // degenerate zero-length segment
            const nx = -dy / len;
            const ny = dx / len;

            // Map the WGS normal to world offset
            // approx scale factor to get small world-space offset
            const offWgs = 0.0015;
            const wxOff = nx * offWgs * 2.0; // WORLD_SCALE is 2.0
            const wzOff = -ny * offWgs * 2.0;

            const colorA = FACTION_COLORS[fa] ?? 0xffffff;
            const colorB = FACTION_COLORS[fb] ?? 0xffffff;
            const pressureEntry = frontPressureByEdge?.[edgeId] ?? (canonicalEdge ? frontPressureByEdge?.[canonicalEdge.edge_id] : undefined);
            const pressureRatio = pressureEntry
                ? Math.max(0, Math.min(1, Math.abs(pressureEntry.value) / Math.max(1, pressureEntry.max_abs)))
                : 0.35;
            const radius = 0.002 + pressureRatio * 0.003;
            const opacity = 0.45 + pressureRatio * 0.5;

            const tubeA = buildTubeForLine(points, hm, wxOff, wzOff, colorA, radius, opacity);
            const tubeB = buildTubeForLine(points, hm, -wxOff, -wzOff, colorB, radius, opacity);

            if (tubeA) group.add(tubeA);
            if (tubeB) group.add(tubeB);
        }
    }

    return group;
}
