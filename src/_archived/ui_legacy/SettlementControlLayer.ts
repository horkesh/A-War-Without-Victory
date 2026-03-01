import * as THREE from 'three';
import { FactionId, SettlementProperties, SettlementsGeoJSON } from './types';
import { BIH_CENTER_LAT, BIH_CENTER_LON, ringsFromSettlement, ringCentroid } from './geo/MapProjection';
import { HeightmapData } from './terrain/TerrainMeshBuilder';

export function factionFromEthnicity(props: SettlementProperties): FactionId {
    const b = props.population_bosniaks ?? 0;
    const s = props.population_serbs ?? 0;
    const c = props.population_croats ?? 0;
    if (b > s && b > c) return 'RBiH';
    if (s > b && s > c) return 'RS';
    if (c > b && c > s) return 'HRHB';
    return null;
}

function createHatchPattern(ctxMain: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, color: string): CanvasPattern | null {
    const off = new OffscreenCanvas(16, 16);
    const ctx = off.getContext('2d');
    if (!ctx) return null;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 16); ctx.lineTo(16, 0);
    ctx.moveTo(-4, 4); ctx.lineTo(4, -4);
    ctx.moveTo(12, 20); ctx.lineTo(20, 12);
    ctx.stroke();
    ctx.stroke();
    return ctxMain.createPattern(off, 'repeat');
}

function fillRings(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    proj: { x: (lon: number) => number; y: (lat: number) => number },
    rings: number[][][],
    fillStyle: string | CanvasPattern
): void {
    if (!rings || rings.length === 0) return;
    for (const ring of rings) {
        if (ring.length < 3) continue;
        ctx.beginPath();
        ctx.moveTo(proj.x(ring[0]![0]!), proj.y(ring[0]![1]!));
        for (let i = 1; i < ring.length; i++) {
            ctx.lineTo(proj.x(ring[i]![0]!), proj.y(ring[i]![1]!));
        }
        ctx.closePath();
        ctx.fillStyle = fillStyle;
        ctx.fill();
    }
}

export function buildFactionTexture(
    hm: HeightmapData,
    settlements: SettlementsGeoJSON,
    controllers: Map<string, FactionId> | null,
    controlStatus: Record<string, string> | null = null,
    edges: { a: string, b: string }[] | null = null
): THREE.CanvasTexture {
    const TEX_W = 4096;
    const TEX_H = 4096;
    const canvas = new OffscreenCanvas(TEX_W, TEX_H);
    const ctx = canvas.getContext('2d')!;

    // Proj definition
    const proj = {
        x: (lon: number) => ((lon - hm.bbox[0]) / (hm.bbox[2] - hm.bbox[0])) * TEX_W,
        y: (lat: number) => ((hm.bbox[3] - lat) / (hm.bbox[3] - hm.bbox[1])) * TEX_H
    };

    ctx.clearRect(0, 0, TEX_W, TEX_H);

    const FACTION_RGB: Record<string, string> = {
        RS: '220, 60, 60',
        RBiH: '60, 180, 90',
        HRHB: '60, 130, 210',
        null: '80, 80, 100',
    };

    const hatchPatterns: Record<string, CanvasPattern | string> = {};
    for (const [fk, rgb] of Object.entries(FACTION_RGB)) {
        hatchPatterns[fk] = createHatchPattern(ctx, `rgba(${rgb}, 0.7)`) ?? `rgba(${rgb}, 0.35)`;
    }

    // Depth computation for territorial shading
    const depthMap = new Map<string, number>();
    if (controllers && edges) {
        const frontier = new Set<string>();
        const adj = new Map<string, string[]>();
        for (const e of edges) {
            if (!adj.has(e.a)) adj.set(e.a, []);
            if (!adj.has(e.b)) adj.set(e.b, []);
            adj.get(e.a)!.push(e.b);
            adj.get(e.b)!.push(e.a);

            const ca = controllers.get(e.a) ?? null;
            const cb = controllers.get(e.b) ?? null;
            if (ca !== cb) {
                if (ca) frontier.add(e.a);
                if (cb) frontier.add(e.b);
            }
        }

        let pQueue = Array.from(frontier);
        for (const f of pQueue) depthMap.set(f, 0);
        let qIndex = 0;
        while (qIndex < pQueue.length) {
            const sid = pQueue[qIndex++];
            const d = depthMap.get(sid)!;
            const myCtrl = controllers.get(sid) ?? null;

            for (const n of (adj.get(sid) ?? [])) {
                if (!depthMap.has(n)) {
                    const nCtrl = controllers.get(n) ?? null;
                    if (nCtrl === myCtrl) {
                        depthMap.set(n, d + 1);
                        pQueue.push(n);
                    }
                }
            }
        }
    }

    // Pass 1: standard fill (with depth shading)
    for (const feature of settlements.features) {
        const props = feature.properties;
        if (!props || !feature.geometry) continue;
        const faction: FactionId = controllers
            ? (controllers.get(props.sid) ?? null)
            : factionFromEthnicity(props);
        const fk = faction ?? 'null';
        const depth = depthMap.get(props.sid) ?? 0;

        // Depth 0 = front interior (alpha 0.45), Depth 1 = 0.30, Depth >= 2 = 0.15
        let alpha = 0.15;
        if (depth === 0) alpha = 0.45;
        else if (depth === 1) alpha = 0.30;
        if (fk === 'null') alpha = 0.05; // Neutrals stay faint

        const rings = ringsFromSettlement(feature.geometry);
        fillRings(ctx, proj, rings, `rgba(${FACTION_RGB[fk] ?? FACTION_RGB['null']}, ${alpha})`);
    }

    // Pass 2: Contested patterns and darkening
    for (const feature of settlements.features) {
        const props = feature.properties;
        if (!props || !feature.geometry) continue;

        const isContested = controlStatus && controlStatus[props.sid] === 'CONTESTED';
        if (!isContested) continue;

        const faction: FactionId = controllers ? (controllers.get(props.sid) ?? null) : factionFromEthnicity(props);
        const fk = faction ?? 'null';

        const rings = ringsFromSettlement(feature.geometry);
        // Battle damage darkening
        fillRings(ctx, proj, rings, `rgba(0, 0, 0, 0.4)`);
        // Hatch pattern over it
        fillRings(ctx, proj, rings, hatchPatterns[fk] ?? hatchPatterns['null']!);
    }

    const texture = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
    return texture;
}
