import * as THREE from 'three';

function disposeGroupChildren(group: THREE.Group): void {
    while (group.children.length > 0) {
        const child = group.children[0];
        if (!child) break;
        group.remove(child);
        const line = child as THREE.Line;
        const geom = line.geometry as THREE.BufferGeometry | undefined;
        const mat = line.material as THREE.Material | undefined;
        geom?.dispose?.();
        mat?.dispose?.();
    }
}

export function clearOrderArrows(group: THREE.Group): void {
    disposeGroupChildren(group);
}

export function drawMovementOrderArrow(
    group: THREE.Group,
    pathSids: string[],
    sidToWorld: ReadonlyMap<string, THREE.Vector3>,
    color = 0x78aefc
): void {
    disposeGroupChildren(group);
    if (pathSids.length < 2) return;
    const points: THREE.Vector3[] = [];
    for (const sid of pathSids) {
        const world = sidToWorld.get(sid);
        if (!world) continue;
        points.push(new THREE.Vector3(world.x, world.y + 0.018, world.z));
    }
    if (points.length < 2) return;
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
        color,
        dashSize: 0.04,
        gapSize: 0.02,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
    });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    group.add(line);
}
