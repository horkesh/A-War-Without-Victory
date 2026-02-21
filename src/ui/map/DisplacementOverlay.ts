import * as THREE from 'three';

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

export function rebuildDisplacementOverlay(
    group: THREE.Group,
    settlementDisplacement: Record<string, number> | null | undefined,
    sidToWorld: ReadonlyMap<string, THREE.Vector3>
): void {
    disposeGroupChildren(group);
    if (!settlementDisplacement) return;
    for (const sid of Object.keys(settlementDisplacement).sort((a, b) => a.localeCompare(b))) {
        const amount = Math.max(0, Math.min(1, settlementDisplacement[sid] ?? 0));
        if (amount <= 0) continue;
        const world = sidToWorld.get(sid);
        if (!world) continue;
        const geom = new THREE.CircleGeometry(0.012 + amount * 0.035, 20);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xff8a4c,
            transparent: true,
            opacity: 0.2 + amount * 0.45,
            depthWrite: false,
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(world.x, world.y + 0.022, world.z);
        mesh.rotation.x = -Math.PI / 2;
        group.add(mesh);
    }
}

export function clearDisplacementOverlay(group: THREE.Group): void {
    disposeGroupChildren(group);
}
