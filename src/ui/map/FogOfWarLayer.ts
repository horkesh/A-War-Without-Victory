import * as THREE from 'three';
import type { FormationEntry, GameSave } from './types';

type ReconFactionView = {
    detected_brigades?: Record<string, { strength_category?: string; detected_via?: string }>;
    confirmed_empty?: string[];
};

function getReconView(save: GameSave, playerFaction: string | null): ReconFactionView | null {
    if (!playerFaction) return null;
    const recon = save.recon_intelligence?.[playerFaction];
    return recon ?? null;
}

function getDetectedSids(recon: ReconFactionView | null): Set<string> {
    if (!recon?.detected_brigades) return new Set<string>();
    return new Set(Object.keys(recon.detected_brigades).sort((a, b) => a.localeCompare(b)));
}

function ghostColorForStrength(strengthCategory: string | undefined): number {
    if (strengthCategory === 'heavy') return 0xffa077;
    if (strengthCategory === 'medium') return 0xffcc77;
    if (strengthCategory === 'light') return 0xfff0aa;
    return 0xd8d8d8;
}

function disposeGhostGroup(group: THREE.Group): void {
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

export function applyFogOfWarToEntries(
    entries: FormationEntry[],
    save: GameSave | null,
    playerFactionOverride: string | null = null
): void {
    if (!save) return;
    const playerFaction = playerFactionOverride ?? (save.player_faction ?? null);
    if (!playerFaction) return;
    const detectedSids = getDetectedSids(getReconView(save, playerFaction));
    for (const entry of entries) {
        const formation = save.formations?.[entry.formationId];
        if (!formation) continue;
        if (formation.faction === playerFaction) continue;
        const hq = formation.hq_sid;
        const isDetected = !!hq && detectedSids.has(hq);
        if (!isDetected) {
            entry.sprite.visible = false;
            continue;
        }
        const mat = entry.sprite.material as THREE.SpriteMaterial;
        mat.opacity = Math.min(1, Math.max(mat.opacity, 0.55));
    }
}

export function rebuildGhostCounterLayer(
    group: THREE.Group,
    save: GameSave | null,
    sidToWorld: ReadonlyMap<string, THREE.Vector3>,
    playerFactionOverride: string | null = null
): void {
    disposeGhostGroup(group);
    if (!save) return;
    const playerFaction = playerFactionOverride ?? (save.player_faction ?? null);
    if (!playerFaction) return;
    const recon = getReconView(save, playerFaction);
    if (!recon?.detected_brigades) return;
    const sids = Object.keys(recon.detected_brigades).sort((a, b) => a.localeCompare(b));
    for (const sid of sids) {
        const world = sidToWorld.get(sid);
        if (!world) continue;
        const info = recon.detected_brigades[sid];
        const geom = new THREE.RingGeometry(0.016, 0.032, 16);
        const mat = new THREE.MeshBasicMaterial({
            color: ghostColorForStrength(info?.strength_category),
            transparent: true,
            opacity: 0.75,
            depthWrite: false,
        });
        const ring = new THREE.Mesh(geom, mat);
        ring.position.set(world.x, world.y + 0.02, world.z);
        ring.rotation.x = -Math.PI / 2;
        group.add(ring);
    }
}
