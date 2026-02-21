import * as THREE from 'three';

export interface CorpsSectorOverlayEntry {
    corps_id: string;
    faction: string;
    settlement_ids: string[];
}

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

function stableHash(input: string): number {
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function corpsColor(corpsId: string): number {
    const h = stableHash(corpsId) % 360;
    const c = new THREE.Color();
    c.setHSL(h / 360, 0.65, 0.55);
    return c.getHex();
}

export function rebuildCorpsSectorOverlay(
    group: THREE.Group,
    sectors: CorpsSectorOverlayEntry[] | null | undefined,
    sidToWorld: ReadonlyMap<string, THREE.Vector3>
): void {
    disposeGroupChildren(group);
    if (!sectors) return;
    const sortedSectors = [...sectors].sort((a, b) => a.corps_id.localeCompare(b.corps_id));
    for (const sector of sortedSectors) {
        const color = corpsColor(sector.corps_id);
        for (const sid of [...(sector.settlement_ids ?? [])].sort((a, b) => a.localeCompare(b))) {
            const world = sidToWorld.get(sid);
            if (!world) continue;
            const geom = new THREE.RingGeometry(0.009, 0.018, 6);
            const mat = new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 0.55,
                depthWrite: false,
            });
            const mesh = new THREE.Mesh(geom, mat);
            mesh.position.set(world.x, world.y + 0.019, world.z);
            mesh.rotation.x = -Math.PI / 2;
            group.add(mesh);
        }
    }
}

export function clearCorpsSectorOverlay(group: THREE.Group): void {
    disposeGroupChildren(group);
}
