import * as THREE from 'three';

interface SupplyFactionReport {
    faction_id: string;
    isolated_controlled: string[];
}

export interface SupplyOverlayReport {
    factions: SupplyFactionReport[];
}

const FACTION_COLOR: Record<string, number> = {
    RBiH: 0x55b56f,
    RS: 0xd66a6a,
    HRHB: 0x6f9fe8,
};

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

export function rebuildSupplyOverlay(
    group: THREE.Group,
    report: SupplyOverlayReport | null,
    sidToWorld: ReadonlyMap<string, THREE.Vector3>,
    focusFaction: string | null = null
): void {
    disposeGroupChildren(group);
    if (!report?.factions) return;
    const factions = [...report.factions].sort((a, b) => a.faction_id.localeCompare(b.faction_id));
    for (const faction of factions) {
        if (focusFaction && faction.faction_id !== focusFaction) continue;
        const color = FACTION_COLOR[faction.faction_id] ?? 0xc8c8c8;
        for (const sid of [...(faction.isolated_controlled ?? [])].sort((a, b) => a.localeCompare(b))) {
            const world = sidToWorld.get(sid);
            if (!world) continue;
            const geom = new THREE.RingGeometry(0.012, 0.027, 16);
            const mat = new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 0.7,
                depthWrite: false,
            });
            const mesh = new THREE.Mesh(geom, mat);
            mesh.position.set(world.x, world.y + 0.021, world.z);
            mesh.rotation.x = -Math.PI / 2;
            group.add(mesh);
        }
    }
}

export function clearSupplyOverlay(group: THREE.Group): void {
    disposeGroupChildren(group);
}
