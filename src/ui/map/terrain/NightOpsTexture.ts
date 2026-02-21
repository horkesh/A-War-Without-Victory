import * as THREE from 'three';
import { sampleHeight, drawLineFeature, makeCanvasProjection } from './TextureHelpers';

function nightElevationRGB(elev: number): [number, number, number] {
    const stops: [number, number, number, number][] = [
        [0, 14, 38, 22],
        [100, 18, 44, 26],
        [300, 26, 50, 30],
        [600, 40, 48, 30],
        [900, 50, 44, 34],
        [1200, 58, 52, 44],
        [1600, 68, 64, 58],
        [2000, 82, 78, 74],
        [2500, 100, 96, 92],
    ];
    if (elev <= stops[0]![0]) return [stops[0]![1], stops[0]![2], stops[0]![3]];
    if (elev >= stops[stops.length - 1]![0]) {
        const l = stops[stops.length - 1]!;
        return [l[1], l[2], l[3]];
    }
    for (let i = 0; i < stops.length - 1; i++) {
        const [e0, r0, g0, b0] = stops[i]!;
        const [e1, r1, g1, b1] = stops[i + 1]!;
        if (elev >= e0 && elev < e1) {
            const t = (elev - e0) / (e1 - e0);
            return [
                Math.round(r0 + (r1 - r0) * t),
                Math.round(g0 + (g1 - g0) * t),
                Math.round(b0 + (b1 - b0) * t),
            ];
        }
    }
    return [30, 28, 24];
}

export function buildNightOpsTexture(
    hm: { width: number, height: number, bbox: number[], elevations: number[] },
    waterways: any | null,
    roads: any | null,
    settlements: any,
    centroids: Map<string, [number, number]>,
    baseFeatures: any | null,
): { texture: THREE.CanvasTexture } {
    const TEX_W = 2048;
    const TEX_H = 2048;
    const canvas = new OffscreenCanvas(TEX_W, TEX_H);
    const ctx = canvas.getContext('2d')!;
    const proj = makeCanvasProjection(hm.bbox as [number, number, number, number], TEX_W, TEX_H);

    // 1. Elevation base
    const imgData = ctx.createImageData(TEX_W, TEX_H);
    const data = imgData.data;
    for (let py = 0; py < TEX_H; py++) {
        for (let px = 0; px < TEX_W; px++) {
            const lon = hm.bbox[0]! + (px / (TEX_W - 1)) * (hm.bbox[2]! - hm.bbox[0]!);
            const lat = hm.bbox[3]! - (py / (TEX_H - 1)) * (hm.bbox[3]! - hm.bbox[1]!);
            const elev = sampleHeight(hm, lon, lat);
            const [r, g, b] = nightElevationRGB(elev);
            const i = (py * TEX_W + px) * 4;
            data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
        }
    }
    ctx.putImageData(imgData, 0, 0);

    // 2. Rivers
    if (waterways) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const feature of waterways.features) {
            if (feature.properties.waterway === 'river') {
                drawLineFeature(ctx, feature.geometry, proj, 'rgba(20, 60, 140, 0.35)', 8.0);
                drawLineFeature(ctx, feature.geometry, proj, 'rgba(50, 120, 220, 0.85)', 3.0);
            } else if (feature.properties.waterway === 'stream') {
                drawLineFeature(ctx, feature.geometry, proj, 'rgba(30, 70, 140, 0.30)', 1.5);
            }
        }
        ctx.restore();
    }

    // 3. Roads
    if (roads) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const ROAD_STYLES: Record<string, { color: string; width: number }> = {
            motorway: { color: 'rgba(220, 180, 80, 0.80)', width: 3.5 },
            trunk: { color: 'rgba(200, 160, 70, 0.65)', width: 2.8 },
            primary: { color: 'rgba(180, 140, 60, 0.50)', width: 2.2 },
            secondary: { color: 'rgba(140, 110, 50, 0.35)', width: 1.5 },
            tertiary: { color: 'rgba(100, 80, 40, 0.20)', width: 1.0 },
        };
        for (const feature of roads.features) {
            const hwy = feature.properties.highway as string;
            const style = ROAD_STYLES[hwy];
            if (!style) continue;
            drawLineFeature(ctx, feature.geometry, proj, style.color, style.width);
            if (hwy === 'motorway' || hwy === 'trunk') {
                drawLineFeature(ctx, feature.geometry, proj, 'rgba(160, 120, 40, 0.20)', 7.0);
            }
        }
        ctx.restore();
    }

    // 4. City lights
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const feature of settlements.features) {
        const props = feature.properties;
        if (!props || !feature.geometry) continue;
        const centroid = centroids.get(props.sid);
        if (!centroid) continue;
        const pop = props.population_total ?? 0;
        if (pop < 300) continue; // skip very tiny hamlets
        const [cx, cy] = [proj.x(centroid[0]), proj.y(centroid[1])];
        // Much larger radii for visible glow on 2048 canvas
        const radius = pop > 80000 ? 50 : pop > 40000 ? 35 : pop > 15000 ? 25 : pop > 5000 ? 15 : pop > 2000 ? 8 : pop > 800 ? 4 : 2;
        const alpha = pop > 80000 ? 1.0 : pop > 40000 ? 0.85 : pop > 15000 ? 0.7 : pop > 5000 ? 0.55 : pop > 2000 ? 0.4 : pop > 800 ? 0.25 : 0.15;
        // Warm yellow-orange glow halo
        const outerR = radius * 3.5;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerR);
        grad.addColorStop(0, `rgba(255, 230, 160, ${alpha})`);
        grad.addColorStop(0.25, `rgba(255, 200, 100, ${alpha * 0.7})`);
        grad.addColorStop(0.6, `rgba(255, 170, 60, ${alpha * 0.25})`);
        grad.addColorStop(1, 'rgba(255, 140, 40, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(cx - outerR, cy - outerR, outerR * 2, outerR * 2);
        // Bright center dot
        ctx.fillStyle = `rgba(255, 245, 210, ${Math.min(1, alpha + 0.3)})`;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(1, radius * 0.4), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // 5. International borders
    if (baseFeatures) {
        ctx.save();
        for (const feature of baseFeatures.features) {
            if (feature.properties?.role === 'boundary' && feature.properties?.admin_level === '2') {
                ctx.setLineDash([12, 10]);
                drawLineFeature(ctx, feature.geometry, proj, 'rgba(192, 64, 160, 0.45)', 3.0);
            }
        }
        ctx.restore();
    }

    const texture = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
    return { texture };
}
