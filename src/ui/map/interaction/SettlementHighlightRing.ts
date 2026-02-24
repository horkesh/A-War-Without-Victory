/**
 * SettlementHighlightRing — animated ring geometry placed flat on terrain
 * at settlement centroids. Color-coded by context:
 *   - Blue  (0x4488ff) — HQ selection
 *   - Green (0x44cc44) — move target
 *   - Red   (0xff4444) — attack target
 *
 * Rings rotate slowly for visual emphasis and use depthTest: false
 * so they are always visible above terrain.
 */

import * as THREE from 'three';
import type { HeightmapData } from '../terrain/TerrainMeshBuilder';
import { sampleHeight, } from '../terrain/TextureHelpers';
import { wgsToWorld } from '../terrain/TerrainMeshBuilder';

export const RING_COLOR_SELECTION = 0x4488ff;
export const RING_COLOR_MOVE = 0x44cc44;
export const RING_COLOR_ATTACK = 0xff4444;

export interface HighlightRingEntry {
    mesh: THREE.Mesh;
    purpose: 'selection' | 'move' | 'attack';
    sid: string;
}

export class SettlementHighlightRings {
    private group: THREE.Group;
    private rings: HighlightRingEntry[] = [];

    constructor() {
        this.group = new THREE.Group();
        this.group.name = 'settlementHighlightRings';
    }

    getGroup(): THREE.Group {
        return this.group;
    }

    /** Add a highlight ring at the given settlement centroid. */
    addRing(
        sid: string,
        centroids: Map<string, [number, number]>,
        hm: HeightmapData,
        color: number,
        purpose: 'selection' | 'move' | 'attack' = 'selection',
    ): void {
        const centroid = centroids.get(sid);
        if (!centroid) return;

        // Don't duplicate — remove existing ring for same sid+purpose
        this.removeRing(sid, purpose);

        const elev = sampleHeight(hm, centroid[0], centroid[1]);
        const [wx, wy, wz] = wgsToWorld(centroid[0], centroid[1], elev);

        const ringGeo = new THREE.RingGeometry(0.012, 0.018, 24);
        const ringMat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            depthTest: false,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(wx, wy + 0.01, wz);
        ring.rotation.x = -Math.PI / 2; // Lay flat on terrain
        ring.name = `highlight_${purpose}_${sid}`;

        this.group.add(ring);
        this.rings.push({ mesh: ring, purpose, sid });
    }

    /** Remove a specific ring by sid and purpose. */
    removeRing(sid: string, purpose?: 'selection' | 'move' | 'attack'): void {
        const toRemove: number[] = [];
        for (let i = 0; i < this.rings.length; i++) {
            const r = this.rings[i]!;
            if (r.sid === sid && (!purpose || r.purpose === purpose)) {
                this.group.remove(r.mesh);
                (r.mesh.geometry as THREE.BufferGeometry).dispose();
                (r.mesh.material as THREE.Material).dispose();
                toRemove.push(i);
            }
        }
        for (let i = toRemove.length - 1; i >= 0; i--) {
            this.rings.splice(toRemove[i]!, 1);
        }
    }

    /** Remove all rings of a given purpose (or all). */
    clearRings(purpose?: 'selection' | 'move' | 'attack'): void {
        const toRemove: number[] = [];
        for (let i = 0; i < this.rings.length; i++) {
            const r = this.rings[i]!;
            if (!purpose || r.purpose === purpose) {
                this.group.remove(r.mesh);
                (r.mesh.geometry as THREE.BufferGeometry).dispose();
                (r.mesh.material as THREE.Material).dispose();
                toRemove.push(i);
            }
        }
        for (let i = toRemove.length - 1; i >= 0; i--) {
            this.rings.splice(toRemove[i]!, 1);
        }
    }

    /** Animate: rotate all rings slowly. Call in the render loop. */
    update(): void {
        for (const r of this.rings) {
            r.mesh.rotation.z += 0.01;
        }
    }

    dispose(): void {
        this.clearRings();
    }
}
