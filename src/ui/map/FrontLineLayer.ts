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

function buildTubeForLine(
    points: [number, number][],
    hm: HeightmapData,
    offsetX: number,
    offsetZ: number,
    color: number
): THREE.Mesh | null {
    if (points.length < 2) return null;
    const curvePoints: THREE.Vector3[] = [];
    for (const p of points) {
        const h = sampleHeight(hm, p[0], p[1]);
        const [wx, wy, wz] = wgsToWorld(p[0], p[1], h);
        // Slightly offset outward to separate the two fronts and lift them above terrain
        curvePoints.push(new THREE.Vector3(wx + offsetX, wy + 0.005, wz + offsetZ));
    }

    const curve = new THREE.CatmullRomCurve3(curvePoints, false, 'catmullrom', 0.1);
    const geometry = new THREE.TubeGeometry(curve, points.length * 2, 0.003, 5, false);
    const material = getGlowMaterial(color);

    return new THREE.Mesh(geometry, material);
}

export function buildFrontLineMesh(
    hm: HeightmapData,
    sharedBorders: SharedBorderSegment[],
    controllers: Map<string, FactionId>,
    brigadeAor: Record<string, string | null>,
    formations: Record<string, { faction: string }>
): THREE.Group {
    const group = new THREE.Group();
    group.name = 'frontLines';

    for (const border of sharedBorders) {
        const fa = controllers.get(border.a);
        const fb = controllers.get(border.b);

        // Front line condition: different factions, neither is null
        if (fa && fb && fa !== fb) {
            // Check if there are opposing units
            const aorA = brigadeAor[border.a];
            const aorB = brigadeAor[border.b];

            const hasUnitA = aorA != null && formations[aorA] != null && formations[aorA].faction === fa;
            const hasUnitB = aorB != null && formations[aorB] != null && formations[aorB].faction === fb;

            // "drawn if there are opposing units in neighboring settlements" 
            if (!hasUnitA && !hasUnitB) continue;

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
            const nx = -dy / len;
            const ny = dx / len;

            // Map the WGS normal to world offset
            // approx scale factor to get small world-space offset
            const offWgs = 0.0015;
            const wxOff = nx * offWgs * 2.0; // WORLD_SCALE is 2.0
            const wzOff = -ny * offWgs * 2.0;

            const colorA = FACTION_COLORS[fa] ?? 0xffffff;
            const colorB = FACTION_COLORS[fb] ?? 0xffffff;

            const tubeA = buildTubeForLine(points, hm, wxOff, wzOff, colorA);
            const tubeB = buildTubeForLine(points, hm, -wxOff, -wzOff, colorB);

            if (tubeA) group.add(tubeA);
            if (tubeB) group.add(tubeB);
        }
    }

    return group;
}
