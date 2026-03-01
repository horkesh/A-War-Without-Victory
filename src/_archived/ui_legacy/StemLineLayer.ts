/**
 * StemLineLayer — vertical stem lines connecting formation counters to terrain.
 *
 * Each formation gets a vertical line from its sprite position down to the
 * terrain surface, with a radial gradient dot at the contact point.
 * Corps use green (#00ff88), brigades use gray-blue (#aabbcc).
 * Visibility is synced with sprite visibility (LOD).
 */

import * as THREE from 'three';
import type { FormationEntry } from './types';

export interface StemEntry {
    line: THREE.Line;
    dot: THREE.Sprite;
    kind: 'corps' | 'brigade';
}

function makeDotTexture(color: string, size: number): THREE.DataTexture {
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d')!;
    const r = size / 2;
    const grad = ctx.createRadialGradient(r, r, r * 0.15, r, r, r);
    grad.addColorStop(0, color);
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    ctx.beginPath();
    ctx.arc(r, r, r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.7;
    ctx.fill();
    const imgData = ctx.getImageData(0, 0, size, size);
    const tex = new THREE.DataTexture(new Uint8Array(imgData.data.buffer), size, size, THREE.RGBAFormat);
    tex.needsUpdate = true;
    tex.flipY = true;
    return tex;
}

// Shared textures and materials (created lazily)
let corpsDotTex: THREE.DataTexture | null = null;
let brigadeDotTex: THREE.DataTexture | null = null;

function getCorpsDotTex(): THREE.DataTexture {
    if (!corpsDotTex) corpsDotTex = makeDotTexture('rgba(0, 255, 136, 0.8)', 32);
    return corpsDotTex;
}

function getBrigadeDotTex(): THREE.DataTexture {
    if (!brigadeDotTex) brigadeDotTex = makeDotTexture('rgba(160, 180, 200, 0.6)', 24);
    return brigadeDotTex;
}

export function buildStemLines(entries: FormationEntry[]): { group: THREE.Group; stems: StemEntry[] } {
    const group = new THREE.Group();
    group.name = 'stemLines';
    const stems: StemEntry[] = [];

    const corpsLineMat = new THREE.LineBasicMaterial({
        color: 0x00ff88, transparent: true, opacity: 0.55, depthTest: false,
    });
    const brigadeLineMat = new THREE.LineBasicMaterial({
        color: 0xaabbcc, transparent: true, opacity: 0.40, depthTest: false,
    });

    for (const e of entries) {
        const pos = e.sprite.position;
        const terrainY = Math.max(0, pos.y - (e.kind === 'corps' ? 0.35 : 0.25));

        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(pos.x, pos.y, pos.z),
            new THREE.Vector3(pos.x, terrainY, pos.z),
        ]);
        const mat = e.kind === 'corps' ? corpsLineMat : brigadeLineMat;
        const line = new THREE.Line(geometry, mat.clone());
        line.visible = e.sprite.visible;
        group.add(line);

        const dotTex = e.kind === 'corps' ? getCorpsDotTex() : getBrigadeDotTex();
        const dotMat = new THREE.SpriteMaterial({
            map: dotTex, transparent: true, depthTest: false,
            opacity: e.kind === 'corps' ? 0.7 : 0.5,
        });
        const dot = new THREE.Sprite(dotMat);
        const dotSize = e.kind === 'corps' ? 0.12 : 0.06;
        dot.scale.set(dotSize, dotSize, 1);
        dot.position.set(pos.x, terrainY + 0.005, pos.z);
        dot.visible = e.sprite.visible;
        group.add(dot);

        stems.push({ line, dot, kind: e.kind });
    }

    return { group, stems };
}

export function updateStemVisibility(
    stems: StemEntry[],
    formationEntries: FormationEntry[],
): void {
    for (let i = 0; i < stems.length && i < formationEntries.length; i++) {
        const stem = stems[i]!;
        const entry = formationEntries[i]!;
        const vis = entry.sprite.visible;
        const eMat = entry.sprite.material as THREE.SpriteMaterial;

        stem.line.visible = vis;
        const lineMat = stem.line.material as THREE.LineBasicMaterial;
        lineMat.opacity = eMat.opacity * (stem.kind === 'corps' ? 0.55 : 0.40);

        stem.dot.visible = vis;
        const dotMat = stem.dot.material as THREE.SpriteMaterial;
        dotMat.opacity = eMat.opacity * (stem.kind === 'corps' ? 0.7 : 0.5);
    }
}

export function disposeStemLines(group: THREE.Group, stems: StemEntry[]): void {
    for (const stem of stems) {
        const lineGeom = stem.line.geometry as THREE.BufferGeometry;
        lineGeom?.dispose?.();
        const lineMat = stem.line.material as THREE.LineBasicMaterial;
        lineMat?.dispose?.();
        const dotMat = stem.dot.material as THREE.SpriteMaterial;
        dotMat?.dispose?.();
    }
    while (group.children.length > 0) {
        const child = group.children[0];
        if (!child) break;
        group.remove(child);
    }
    stems.length = 0;
}
