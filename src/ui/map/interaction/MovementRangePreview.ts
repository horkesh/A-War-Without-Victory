import * as THREE from 'three';

export interface MovementRangePreviewInput {
    group: THREE.Group;
    reachableSids: string[];
    startSid: string | null;
    sidToWorld: ReadonlyMap<string, THREE.Vector3>;
    color: number;
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
