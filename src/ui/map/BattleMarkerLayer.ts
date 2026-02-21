import * as THREE from 'three';

export interface BattleReplayEvent {
    turn: number;
    settlement_id: string;
    from: string | null;
    to: string | null;
    mechanism: string;
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

function eventColor(event: BattleReplayEvent): number {
    if (event.mechanism === 'battle_resolution') return 0xff6a6a;
    if (event.mechanism.includes('flip')) return 0xffb66a;
    return 0xf3e19b;
}

export class BattleMarkerLayer {
    private readonly group: THREE.Group;
    private events: BattleReplayEvent[] = [];
    private sidToWorld: ReadonlyMap<string, THREE.Vector3> = new Map();
    private timer: ReturnType<typeof setTimeout> | null = null;
    private index = 0;
    private playing = false;

    constructor(group: THREE.Group) {
        this.group = group;
    }

    clear(): void {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.events = [];
        this.index = 0;
        this.playing = false;
        disposeGroupChildren(this.group);
    }

    isPlaying(): boolean {
        return this.playing;
    }

    skip(): void {
        if (!this.playing) return;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        while (this.index < this.events.length) {
            this.renderEvent(this.events[this.index]!);
            this.index += 1;
        }
        this.playing = false;
    }

    play(
        events: BattleReplayEvent[],
        sidToWorld: ReadonlyMap<string, THREE.Vector3>,
        intervalMs = 260
    ): void {
        this.clear();
        this.events = [...events];
        this.sidToWorld = sidToWorld;
        this.playing = this.events.length > 0;
        if (!this.playing) return;
        const tick = () => {
            if (this.index >= this.events.length) {
                this.playing = false;
                this.timer = null;
                return;
            }
            this.renderEvent(this.events[this.index]!);
            this.index += 1;
            this.timer = setTimeout(tick, intervalMs);
        };
        tick();
    }

    private renderEvent(event: BattleReplayEvent): void {
        const world = this.sidToWorld.get(event.settlement_id);
        if (!world) return;
        const geom = new THREE.RingGeometry(0.018, 0.038, 22);
        const mat = new THREE.MeshBasicMaterial({
            color: eventColor(event),
            transparent: true,
            opacity: 0.78,
            depthWrite: false,
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(world.x, world.y + 0.024, world.z);
        mesh.rotation.x = -Math.PI / 2;
        this.group.add(mesh);
    }
}
