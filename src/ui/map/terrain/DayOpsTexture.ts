import * as THREE from 'three';
import { sampleHeight, drawLineFeature, makeCanvasProjection, sampleNormal, computeHillshade } from './TextureHelpers';

function dayElevationRGB(elev: number): [number, number, number] {
    // Tracestrack Topo style: gray/beige hypsometry
    const stops: [number, number, number, number][] = [
        [0, 240, 240, 235],    // Lowlands (pale beige/gray)
        [200, 235, 235, 230],
        [500, 225, 225, 220],
        [1000, 215, 215, 210],
        [1500, 205, 205, 200],
        [2000, 210, 210, 215], // Slight blue-gray up high
        [2500, 230, 230, 235], // Peaks
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
    return [240, 240, 235];
}

export function buildDayOpsTexture(
    hm: { width: number, height: number, bbox: number[], elevations: number[] },
    waterways: any | null,
    roads: any | null,
    settlements: any,
    baseFeatures: any | null,
): { texture: THREE.CanvasTexture } {
    const TEX_W = 2048;
    const TEX_H = 2048;
    const canvas = new OffscreenCanvas(TEX_W, TEX_H);
    const ctx = canvas.getContext('2d')!;
    const proj = makeCanvasProjection(hm.bbox as [number, number, number, number], TEX_W, TEX_H);

    const cellWidthM = 1000; // rough approx for 1024 cells over ~300km box
    const lightDir: [number, number, number] = [-0.5, 0.5, 0.707]; // Top-left sun

    // 1. Elevation and Hillshade base
    const imgData = ctx.createImageData(TEX_W, TEX_H);
    const data = imgData.data;
    for (let py = 0; py < TEX_H; py++) {
        for (let px = 0; px < TEX_W; px++) {
            const lon = hm.bbox[0]! + (px / (TEX_W - 1)) * (hm.bbox[2]! - hm.bbox[0]!);
            const lat = hm.bbox[3]! - (py / (TEX_H - 1)) * (hm.bbox[3]! - hm.bbox[1]!);

            const elev = sampleHeight(hm, lon, lat);
            const [br, bg, bb] = dayElevationRGB(elev);

            const normal = sampleNormal(hm, lon, lat, cellWidthM);
            const shade = computeHillshade(normal, lightDir);

            // Subtle hillshade blend (0.7 to 1.1 multiplier)
            const shadeFactor = 0.7 + (shade * 0.4);

            const i = (py * TEX_W + px) * 4;
            data[i] = Math.min(255, br * shadeFactor);
            data[i + 1] = Math.min(255, bg * shadeFactor);
            data[i + 2] = Math.min(255, bb * shadeFactor);
            data[i + 3] = 255;
        }
    }
    ctx.putImageData(imgData, 0, 0);

    // 2. Rivers (Steel Blue matching Topo design)
    if (waterways) {
        ctx.save();
        for (const feature of waterways.features) {
            if (feature.properties.waterway === 'river') {
                // Approximate stream order or default to base width
                const order = feature.properties.stream_order ?? (feature.properties.name === 'Bosna' || feature.properties.name === 'Vrbas' ? 4 : 2);
                const width = Math.min(6, Math.max(1.5, order * 0.8));
                drawLineFeature(ctx, feature.geometry, proj, 'rgba(74, 144, 200, 0.9)', width);
            } else if (feature.properties.waterway === 'stream') {
                drawLineFeature(ctx, feature.geometry, proj, 'rgba(106, 168, 216, 0.6)', 1.0);
            }
        }
        ctx.restore();
    }

    // 3. Roads (Cased style for Topo)
    if (roads) {
        ctx.save();
        const ROAD_STYLES: Record<string, { fill: string; width: number }> = {
            motorway: { fill: 'rgba(200, 64, 64, 1.0)', width: 3.5 },      // E-roads (Red-orange)
            trunk: { fill: 'rgba(216, 152, 48, 1.0)', width: 2.5 },        // MSRs (Orange)
            primary: { fill: 'rgba(232, 208, 80, 1.0)', width: 2.0 },      // Secondary (Yellow)
            secondary: { fill: 'rgba(245, 245, 245, 1.0)', width: 1.5 },   // Local (White)
            tertiary: { fill: 'rgba(215, 215, 215, 0.8)', width: 0.8 },
        };
        const CASING_COLOR = 'rgba(68, 68, 68, 1.0)'; // Dark grey

        // Pass 1: Casing (draw bottom layer wider)
        for (const feature of roads.features) {
            const hwy = feature.properties.highway as string;
            const style = ROAD_STYLES[hwy];
            if (!style) continue;
            drawLineFeature(ctx, feature.geometry, proj, CASING_COLOR, style.width + 1.8);
        }

        // Pass 2: Fill (draw on top)
        for (const feature of roads.features) {
            const hwy = feature.properties.highway as string;
            const style = ROAD_STYLES[hwy];
            if (!style) continue;
            drawLineFeature(ctx, feature.geometry, proj, style.fill, style.width);
        }
        ctx.restore();
    }

    // 4. International borders
    if (baseFeatures) {
        ctx.save();
        for (const feature of baseFeatures.features) {
            if (feature.properties?.role === 'boundary' && feature.properties?.admin_level === '2') {
                ctx.setLineDash([12, 10]);
                drawLineFeature(ctx, feature.geometry, proj, 'rgba(192, 64, 160, 0.7)', 3.0);
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
