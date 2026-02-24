/**
 * MovementRangePreview — shows reachable settlements for the selected brigade.
 *
 * Enhanced mode: draws full settlement polygons with translucent fill and dashed
 * borders (ported from tactical sandbox). Falls back to flat circle dots when
 * settlement GeoJSON is unavailable.
 */

import * as THREE from 'three';
import { makeCanvasProjection } from '../terrain/TextureHelpers';

// ---------------------------------------------------------------------------
// Settlement polygon helpers (duplicated from map_operational_3d to avoid
// circular imports — simple geometry extraction)
// ---------------------------------------------------------------------------

type Ring = number[][];

function ringsFromSettlement(geom: { type: string; coordinates: number[][][] | number[][][][] }): Ring[] {
    if (geom.type === 'Polygon') {
        const coords = geom.coordinates as number[][][];
        return coords.length ? [coords[0]!] : [];
    }
    if (geom.type === 'MultiPolygon') {
        const coords = geom.coordinates as number[][][][];
        return coords.map((p) => p[0]!).filter((r) => r && r.length > 0);
    }
    return [];
}

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface MovementRangePreviewInput {
    group: THREE.Group;
    reachableSids: string[];
    startSid: string | null;
    sidToWorld: ReadonlyMap<string, THREE.Vector3>;
    color: number;
}

/** Extended input for polygon-based rendering (when GeoJSON is available). */
export interface MovementRangePolygonInput {
    group: THREE.Group;
    reachableSids: string[];
    startSid: string | null;
    /** THREE.Mesh for the terrain — used to position the overlay mesh at same geometry. */
    terrainMesh: THREE.Mesh;
    /** Settlement GeoJSON feature collection. */
    settlements: { features: Array<{ properties: { sid: string; [key: string]: unknown }; geometry: { type: string; coordinates: any } }> };
    /** Heightmap bbox [minLon, minLat, maxLon, maxLat]. */
    bbox: [number, number, number, number];
    /** Fill color rgb components, e.g. { r: 255, g: 200, b: 0 }. */
    fillColor: { r: number; g: number; b: number };
    /** Whether formation is deployed (blue) or undeployed (yellow). */
    deployed: boolean;
}

// ---------------------------------------------------------------------------
// Disposal helpers
// ---------------------------------------------------------------------------

function disposeGroupChildren(group: THREE.Group): void {
    while (group.children.length > 0) {
        const child = group.children[0];
        if (!child) break;
        group.remove(child);
        const mesh = child as THREE.Mesh;
        const geom = mesh.geometry as THREE.BufferGeometry | undefined;
        const mat = mesh.material as THREE.Material | undefined;
        geom?.dispose?.();
        mat?.dispose?.();
    }
}

// ---------------------------------------------------------------------------
// Polygon-based movement range (enhanced)
// ---------------------------------------------------------------------------

export function rebuildMovementRangePolygon(input: MovementRangePolygonInput): void {
    disposeGroupChildren(input.group);

    const reachableSet = new Set(input.reachableSids);
    if (reachableSet.size === 0) return;

    const TEX_W = 4096, TEX_H = 4096;
    const canvas = new OffscreenCanvas(TEX_W, TEX_H);
    const ctx = canvas.getContext('2d')!;
    const proj = makeCanvasProjection(input.bbox, TEX_W, TEX_H);
    ctx.clearRect(0, 0, TEX_W, TEX_H);

    // Color scheme: deployed=blue, undeployed=yellow
    const c = input.deployed
        ? { r: 80, g: 160, b: 255 }
        : { r: 255, g: 200, b: 0 };

    const fillColor = `rgba(${c.r}, ${c.g}, ${c.b}, 0.20)`;
    const strokeColor = `rgba(${c.r}, ${c.g}, ${c.b}, 0.70)`;
    const startFillColor = `rgba(${c.r}, ${c.g}, ${c.b}, 0.40)`;

    for (const feature of input.settlements.features) {
        const props = feature.properties;
        if (!props || !feature.geometry) continue;
        if (!reachableSet.has(props.sid)) continue;
        const rings = ringsFromSettlement(feature.geometry);

        for (const ring of rings) {
            if (ring.length < 3) continue;

            // Solid translucent fill
            ctx.beginPath();
            ctx.moveTo(proj.x(ring[0]![0]!), proj.y(ring[0]![1]!));
            for (let i = 1; i < ring.length; i++) {
                ctx.lineTo(proj.x(ring[i]![0]!), proj.y(ring[i]![1]!));
            }
            ctx.closePath();
            ctx.fillStyle = props.sid === input.startSid ? startFillColor : fillColor;
            ctx.fill();

            // Dashed border for visual distinction from AoR crosshatch
            ctx.setLineDash([12, 6]);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    const texture = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;

    const overlayMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
    });
    const overlay = new THREE.Mesh(input.terrainMesh.geometry.clone(), overlayMat);
    overlay.position.y = 0.012; // Above AoR overlay at 0.010
    overlay.name = 'movementRangePolygon';
    input.group.add(overlay);
}

// ---------------------------------------------------------------------------
// Fallback dot-based rendering (original)
// ---------------------------------------------------------------------------

export function rebuildMovementRangePreview(input: MovementRangePreviewInput): void {
    disposeGroupChildren(input.group);
    const sorted = [...input.reachableSids].sort((a, b) => a.localeCompare(b));
    for (const sid of sorted) {
        const world = input.sidToWorld.get(sid);
        if (!world) continue;
        const geom = new THREE.CircleGeometry(0.028, 16);
        const mat = new THREE.MeshBasicMaterial({
            color: input.color,
            transparent: true,
            opacity: sid === input.startSid ? 0.95 : 0.6,
        });
        const marker = new THREE.Mesh(geom, mat);
        marker.position.copy(world);
        marker.position.y += 0.013;
        marker.rotation.x = -Math.PI / 2;
        input.group.add(marker);
    }
}

export function clearMovementRangePreview(group: THREE.Group): void {
    disposeGroupChildren(group);
}
