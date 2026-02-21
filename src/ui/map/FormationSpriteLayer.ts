import * as THREE from 'three';
import { GameSave, FormationRecord, CorpsAggregate, FormationEntry } from './types';
import { HeightmapData, wgsToWorld } from './terrain/TerrainMeshBuilder';
import { sampleHeight } from './terrain/TextureHelpers';
import { FORMATION_COUNTER_DATA_MODES, type FormationCounterDataMode } from './constants';

export const FORMATION_LOD_THRESHOLD = 4.0;
export const FORMATION_FADE_ZONE = 0.20;

const FACTION_BASE_RGB: Record<string, [number, number, number]> = {
    RS: [180, 50, 50],
    RBiH: [55, 140, 75],
    HRHB: [50, 110, 170],
};

function clampChannel(v: number): number {
    return Math.max(0, Math.min(255, Math.round(v)));
}

function toRgbString(rgb: [number, number, number]): string {
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

function toRgbaString(rgb: [number, number, number], alpha: number): string {
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function stableHash(input: string): number {
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function deriveCorpsTint(formation: FormationRecord): [number, number, number] {
    const base = FACTION_BASE_RGB[formation.faction] ?? [90, 90, 110];
    const corpsKey = formation.kind === 'brigade'
        ? (formation.corps_id ?? formation.id)
        : formation.id;
    const h = stableHash(`${formation.faction}:${corpsKey}`);
    const shift = ((h % 7) - 3) * 10; // deterministic shade family per corps
    const r = clampChannel(base[0] + shift);
    const g = clampChannel(base[1] + Math.round(shift * 0.6));
    const b = clampChannel(base[2] - Math.round(shift * 0.4));
    return [r, g, b];
}

function postureAbbrev(posture: string): string {
    if (posture === 'defend') return 'DEF';
    if (posture === 'probe') return 'PRB';
    if (posture === 'attack') return 'ATK';
    if (posture === 'elastic_defense') return 'ELD';
    if (posture === 'consolidation') return 'CON';
    return posture.slice(0, 3).toUpperCase();
}

function getModeValue(formation: FormationRecord, mode: FormationCounterDataMode): string {
    if (mode === 'strength') {
        return formation.personnel >= 1000 ? `${(formation.personnel / 1000).toFixed(1)}k` : `${formation.personnel}`;
    }
    if (mode === 'cohesion') return `${Math.round(formation.cohesion ?? 0)}`;
    if (mode === 'posture') return postureAbbrev(formation.posture);
    if (mode === 'fatigue') return `${Math.round(formation.fatigue ?? 0)}`;
    // Supply is not directly persisted on formation records in this view.
    const supplyProxy = Math.max(0, Math.min(100, Math.round(100 - (formation.fatigue ?? 0) * 1.25)));
    return `${supplyProxy}%`;
}

function getDataBadgeColor(formation: FormationRecord, mode: FormationCounterDataMode): string {
    if (mode === 'cohesion') {
        const c = formation.cohesion ?? 0;
        if (c >= 60) return '#2f8f4f';
        if (c >= 35) return '#8a7a32';
        return '#8a3a3a';
    }
    if (mode === 'fatigue') {
        const f = formation.fatigue ?? 0;
        if (f <= 20) return '#2f8f4f';
        if (f <= 45) return '#8a7a32';
        return '#8a3a3a';
    }
    if (mode === 'posture') return '#4a5f8f';
    if (mode === 'supply') return '#3e7a5f';
    return '#5a4a70';
}

function getSoftFactorColor(formation: FormationRecord): string {
    const cohesion = formation.cohesion ?? 0;
    const fatigue = formation.fatigue ?? 0;
    const personnel = formation.personnel ?? 0;
    if (cohesion >= 55 && fatigue <= 30 && personnel >= 500) return '#44c16d';
    if (cohesion >= 35 && fatigue <= 55) return '#d3bf47';
    return '#d45858';
}

export function nextCounterDataMode(current: FormationCounterDataMode): FormationCounterDataMode {
    const idx = FORMATION_COUNTER_DATA_MODES.indexOf(current);
    const nextIdx = idx < 0 ? 0 : (idx + 1) % FORMATION_COUNTER_DATA_MODES.length;
    return FORMATION_COUNTER_DATA_MODES[nextIdx]!;
}

export function isCorpsLikeKind(kind: string): boolean {
    return kind === 'corps' || kind === 'corps_asset' || kind === 'army_hq';
}

export function buildCorpsAggregates(save: GameSave): Map<string, CorpsAggregate> {
    const aggregates = new Map<string, CorpsAggregate>();
    const postureCounts = new Map<string, Map<string, number>>();
    const formationIds = Object.keys(save.formations).sort((a, b) => a.localeCompare(b));

    for (const fid of formationIds) {
        const formation = save.formations[fid];
        if (!formation) continue;
        if (!isCorpsLikeKind(formation.kind)) continue;
        aggregates.set(formation.id, {
            formation,
            totalPersonnel: 0,
            brigadeCount: 0,
            childIds: [],
            dominantPosture: 'defend',
        });
        postureCounts.set(formation.id, new Map<string, number>());
    }

    for (const fid of formationIds) {
        const formation = save.formations[fid];
        if (!formation || formation.kind !== 'brigade' || !formation.corps_id) continue;
        const agg = aggregates.get(formation.corps_id);
        if (!agg) continue;
        agg.totalPersonnel += formation.personnel ?? 0;
        agg.brigadeCount++;
        agg.childIds.push(formation.id);
        const pc = postureCounts.get(formation.corps_id);
        if (!pc) continue;
        pc.set(formation.posture, (pc.get(formation.posture) ?? 0) + 1);
    }

    for (const [corpsId, agg] of aggregates.entries()) {
        agg.childIds.sort((a, b) => a.localeCompare(b));
        const pc = postureCounts.get(corpsId);
        if (!pc) continue;
        let maxCount = 0;
        for (const [posture, count] of pc.entries()) {
            if (count > maxCount) {
                maxCount = count;
                agg.dominantPosture = posture;
            }
        }
    }

    return aggregates;
}

export function updateFormationVisibility(
    entries: FormationEntry[],
    camera: THREE.PerspectiveCamera,
    selectedFormationId: string | null,
    selectedCorpsChildIds: ReadonlySet<string>,
    selectedParentCorpsId: string | null,
): void {
    if (entries.length === 0) return;

    const camY = camera.position.y;
    const threshold = FORMATION_LOD_THRESHOLD;
    const fadeStart = threshold * (1 - FORMATION_FADE_ZONE);
    const fadeRange = threshold - fadeStart;
    // Tighter LOD scale so icons stay smaller (convene: 3D icons workstream)
    const corpsScale = Math.max(0.7, Math.min(1.0, 1.6 / Math.sqrt(Math.max(camY, 0.5))));
    const camRatio = Math.min(camY, threshold) / threshold;
    const brigadeScale = Math.max(0.05, Math.pow(camRatio, 1.4));

    for (const e of entries) {
        const mat = e.sprite.material as THREE.SpriteMaterial;
        const sf = e.kind === 'corps' ? corpsScale : brigadeScale;

        if (e.kind === 'corps') {
            if (camY < fadeStart) {
                e.sprite.visible = false;
                mat.opacity = 1.0;
            } else {
                e.sprite.visible = true;
                const t = Math.min(1.0, (camY - fadeStart) / fadeRange);
                mat.opacity = t;
                e.sprite.scale.set(e.baseScaleX * sf, e.baseScaleY * sf, 1);
            }
        } else {
            if (camY >= threshold) {
                e.sprite.visible = false;
                mat.opacity = 1.0;
            } else if (camY >= fadeStart) {
                e.sprite.visible = true;
                const t = 1.0 - Math.min(1.0, (camY - fadeStart) / fadeRange);
                mat.opacity = t;
                e.sprite.scale.set(e.baseScaleX * sf, e.baseScaleY * sf, 1);
            } else {
                e.sprite.visible = true;
                mat.opacity = 1.0;
                e.sprite.scale.set(e.baseScaleX * sf, e.baseScaleY * sf, 1);
            }
        }

        if (selectedCorpsChildIds.has(e.formationId) && e.kind === 'brigade') {
            e.sprite.visible = true;
            mat.opacity = Math.max(mat.opacity, 0.9);
        }
        if (selectedParentCorpsId && e.kind === 'corps' && e.formationId === selectedParentCorpsId) {
            e.sprite.visible = true;
            mat.opacity = Math.max(mat.opacity, 0.95);
        }
        if (selectedFormationId && e.formationId === selectedFormationId) {
            e.sprite.visible = true;
            mat.opacity = 1.0;
            e.sprite.scale.set(e.baseScaleX * sf * 1.08, e.baseScaleY * sf * 1.08, 1);
        }
    }
}

export function paintFormationCounter(
    ctx: OffscreenCanvasRenderingContext2D,
    w: number,
    h: number,
    formation: FormationRecord,
    mode: FormationCounterDataMode = FORMATION_COUNTER_DATA_MODES[0],
): void {
    const factionRgb = FACTION_BASE_RGB[formation.faction] ?? [90, 90, 110];
    const corpsRgb = deriveCorpsTint(formation);

    ctx.fillStyle = 'rgba(14, 14, 28, 0.93)';
    ctx.fillRect(0, 0, w, h);

    // Corps tint provides quick visual grouping without replacing faction identity.
    ctx.fillStyle = toRgbaString(corpsRgb, 0.36);
    ctx.fillRect(6, 1, w - 7, h - 2);

    ctx.fillStyle = toRgbString(factionRgb);
    ctx.fillRect(0, 0, 6, h);
    ctx.strokeStyle = toRgbString(corpsRgb);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0.75, 0.75, w - 1.5, h - 1.5);

    const symbolX = w / 2 + 3, symbolY = h * 0.36;
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1.5;
    if (formation.kind === 'brigade') {
        ctx.strokeRect(symbolX - 10, symbolY - 7, 20, 14);
    } else if (isCorpsLikeKind(formation.kind)) {
        ctx.beginPath();
        ctx.moveTo(symbolX - 12, symbolY - 6); ctx.lineTo(symbolX - 4, symbolY + 6);
        ctx.moveTo(symbolX - 4, symbolY - 6); ctx.lineTo(symbolX - 12, symbolY + 6);
        ctx.moveTo(symbolX + 4, symbolY - 6); ctx.lineTo(symbolX + 12, symbolY + 6);
        ctx.moveTo(symbolX + 12, symbolY - 6); ctx.lineTo(symbolX + 4, symbolY + 6);
        ctx.stroke();
    }

    ctx.fillStyle = '#e0e8e0';
    ctx.font = `bold 10px 'IBM Plex Mono', 'Consolas', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const nameStr = formation.name.length > 14 ? formation.name.slice(0, 13) + '\u2026' : formation.name;
    ctx.fillText(nameStr, w / 2 + 3, h * 0.72);

    const modeValue = getModeValue(formation, mode);
    ctx.fillStyle = getDataBadgeColor(formation, mode);
    ctx.fillRect(w - 30, h - 14, 28, 12);
    ctx.fillStyle = '#ffffff';
    ctx.font = `8px 'IBM Plex Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(modeValue, w - 16, h - 8);

    // Tiny top-right triangle for soft-factors at-a-glance (green/yellow/red).
    ctx.fillStyle = getSoftFactorColor(formation);
    ctx.beginPath();
    ctx.moveTo(w - 2, 2);
    ctx.lineTo(w - 14, 2);
    ctx.lineTo(w - 2, 14);
    ctx.closePath();
    ctx.fill();

    // Mode marker at top-left to signal active data view.
    const modeInitial = mode === 'strength' ? 'S'
        : mode === 'cohesion' ? 'C'
            : mode === 'supply' ? 'U'
                : mode === 'posture' ? 'P'
                    : 'F';
    ctx.fillStyle = 'rgba(220, 230, 230, 0.9)';
    ctx.font = `bold 7px 'IBM Plex Mono', monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(modeInitial, 8, 3);
}

export function buildFormationSprite(
    formation: FormationRecord,
    mode: FormationCounterDataMode = FORMATION_COUNTER_DATA_MODES[0],
): THREE.Sprite {
    const W = 128, H = 72;
    const canvas = new OffscreenCanvas(W, H);
    const ctx = canvas.getContext('2d')!;
    paintFormationCounter(ctx, W, H, formation, mode);
    const imgData = ctx.getImageData(0, 0, W, H);
    const tex = new THREE.DataTexture(new Uint8Array(imgData.data.buffer), W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.needsUpdate = true;
    tex.flipY = true;
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, opacity: 1.0 });
    const sprite = new THREE.Sprite(mat);
    // Smaller base so icons are not oversized (convene: 3D icons workstream)
    const baseX = isCorpsLikeKind(formation.kind) ? 0.44 : 0.38;
    const baseY = isCorpsLikeKind(formation.kind) ? 0.26 : 0.22;
    sprite.scale.set(baseX, baseY, 1);
    return sprite;
}

export function repaintFormationSprite(
    sprite: THREE.Sprite,
    formation: FormationRecord,
    mode: FormationCounterDataMode = FORMATION_COUNTER_DATA_MODES[0],
): void {
    const W = 128, H = 72;
    const canvas = new OffscreenCanvas(W, H);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    paintFormationCounter(ctx, W, H, formation, mode);
    const imgData = ctx.getImageData(0, 0, W, H);
    const tex = new THREE.DataTexture(new Uint8Array(imgData.data.buffer), W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.needsUpdate = true;
    tex.flipY = true;
    const mat = sprite.material as THREE.SpriteMaterial;
    if (mat.map) mat.map.dispose();
    mat.map = tex;
    mat.needsUpdate = true;
}

export function buildFormationLODLayer(
    hm: HeightmapData,
    save: GameSave,
    centroids: Map<string, [number, number]>,
    corpsAggregates: Map<string, CorpsAggregate>,
    mode: FormationCounterDataMode = FORMATION_COUNTER_DATA_MODES[0],
): { group: THREE.Group; entries: FormationEntry[] } {
    const group = new THREE.Group();
    group.name = 'formationGroup';

    const entries: FormationEntry[] = [];
    for (const corpsId of [...corpsAggregates.keys()].sort((a, b) => a.localeCompare(b))) {
        const agg = corpsAggregates.get(corpsId);
        if (!agg) continue;
        const formation = agg.formation;
        if (formation.status !== 'active') continue;
        if (!formation.hq_sid) continue;
        if (agg.brigadeCount <= 0) continue;
        const centroid = centroids.get(formation.hq_sid);
        if (!centroid) continue;
        const [lon, lat] = centroid;
        const elev = sampleHeight(hm, lon, lat);
        const [wx, wy, wz] = wgsToWorld(lon, lat, elev);
        const sprite = buildFormationSprite(formation, mode);
        sprite.position.set(wx, wy + 0.08, wz);
        sprite.name = `corps_${formation.id}`;
        sprite.visible = true;
        group.add(sprite);
        entries.push({
            sprite,
            formationId: formation.id,
            kind: 'corps',
            baseScaleX: 0.44,
            baseScaleY: 0.26,
        });
    }

    for (const fid of Object.keys(save.formations).sort((a, b) => a.localeCompare(b))) {
        const formation = save.formations[fid];
        if (!formation) continue;
        if (formation.status !== 'active') continue;
        if (formation.kind !== 'brigade') continue;
        if (!formation.hq_sid) continue;

        let posLon: number | undefined;
        let posLat: number | undefined;
        let sumLon = 0;
        let sumLat = 0;
        let count = 0;
        for (const sid of Object.keys(save.brigade_aor).sort((a, b) => a.localeCompare(b))) {
            if (save.brigade_aor[sid] !== formation.id) continue;
            const c = centroids.get(sid);
            if (!c) continue;
            sumLon += c[0];
            sumLat += c[1];
            count++;
        }
        if (count > 0) {
            posLon = sumLon / count;
            posLat = sumLat / count;
        }
        if (posLon === undefined || posLat === undefined) {
            const centroid = centroids.get(formation.hq_sid);
            if (!centroid) continue;
            posLon = centroid[0];
            posLat = centroid[1];
        }

        const elev = sampleHeight(hm, posLon, posLat);
        const [wx, wy, wz] = wgsToWorld(posLon, posLat, elev);
        const sprite = buildFormationSprite(formation, mode);
        sprite.position.set(wx, wy + 0.06, wz);
        sprite.name = `brigade_${formation.id}`;
        sprite.visible = false;
        group.add(sprite);
        entries.push({
            sprite,
            formationId: formation.id,
            kind: 'brigade',
            corpsId: formation.corps_id,
            baseScaleX: 0.38,
            baseScaleY: 0.22,
        });
    }
    return { group, entries };
}
