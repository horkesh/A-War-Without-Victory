/**
 * HoI Terrain Texture — painted war-map aesthetic.
 *
 * Builds a 2048x2048 CanvasTexture with:
 *   1. Hypsometric elevation coloring:
 *      muted green lowlands -> olive-sage foothills -> brown highlands -> grey peaks
 *   2. Hillshade from heightmap normals (visible through 75% control overlay)
 *   3. Rivers (blue-grey, per HOI_VISUAL_GUI_OVERHAUL_SPEC S9.1)
 *   4. Roads (ochre/brown, subdued)
 *   5. Settlement markers (dots + labels for major towns)
 *
 * Follows the same pattern as DayOpsTexture.ts; reuses TextureHelpers.
 */

import * as THREE from 'three';
import { sampleHeight, drawLineFeature, makeCanvasProjection, sampleNormal, computeHillshade } from './TextureHelpers.js';

// -- GeoJSON types for waterways/roads/settlements --------------------------

interface LineGeoJSON {
    type: string;
    features: {
        type: string;
        geometry: { type: string; coordinates: unknown };
        properties: Record<string, unknown>;
    }[];
}

interface SettlementGeoJSON {
    type: string;
    features: {
        type: string;
        geometry: { type: string; coordinates: unknown };
        properties: Record<string, unknown>;
    }[];
}

interface HeightmapInput {
    width: number;
    height: number;
    bbox: number[];
    elevations: number[];
}

// -- Physical-atlas hypsometric ramp ----------------------------------------
// Muted natural colors: green valleys -> olive hills -> brown mountains -> grey peaks
// Inspired by the Natural Earth / Swiss-style topo map palette, desaturated
// to work as a war-map base that doesn't compete with faction fills.

function hoiElevationRGB(elev: number): [number, number, number] {
    const stops: [number, number, number, number][] = [
        [0,    172, 190, 145],  // #acbe91 — muted sage-green lowlands (Posavina)
        [100,  178, 192, 148],  // #b2c094 — light green valley floors
        [250,  186, 190, 148],  // #babe94 — green-olive transition
        [400,  192, 185, 145],  // #c0b991 — warm olive (low foothills)
        [600,  195, 178, 140],  // #c3b28c — olive-tan transition
        [800,  192, 170, 135],  // #c0aa87 — tan-olive (mid hills)
        [1000, 185, 162, 130],  // #b9a282 — warm brown (highlands)
        [1300, 172, 150, 122],  // #ac967a — brown (mountain slopes)
        [1600, 160, 142, 118],  // #a08e76 — dark brown (upper mountains)
        [2000, 168, 160, 150],  // #a8a096 — grey-brown (high ridges)
        [2500, 185, 180, 175],  // #b9b4af — pale grey (peaks/snow line)
    ];

    if (elev <= stops[0]![0]) return [stops[0]![1], stops[0]![2], stops[0]![3]];
    const last = stops[stops.length - 1]!;
    if (elev >= last[0]) return [last[1], last[2], last[3]];

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
    return [172, 190, 145];
}

// -- Road styles (ochre/brown, subdued -- "pre-modern road map") ------------

const ROAD_STYLES: Record<string, { fill: string; width: number }> = {
    motorway:  { fill: 'rgba(150, 115, 55, 0.65)', width: 2.5 },
    trunk:     { fill: 'rgba(150, 120, 70, 0.55)', width: 2.0 },
    primary:   { fill: 'rgba(150, 120, 70, 0.45)', width: 1.5 },
    secondary: { fill: 'rgba(140, 120, 80, 0.30)', width: 1.0 },
};
const ROAD_CASING = 'rgba(70, 50, 30, 0.35)';

// -- Settlement marker thresholds -------------------------------------------
// NOTE: The texture is 2048x2048 covering ~300km. 1 pixel ≈ 150m.
// Only dots are baked into the texture (NATO convention: black fill for urban).
// Labels float as 3D sprites in the scene — see HoIMapRenderer.buildSettlementLabels().

/** Population thresholds for drawing settlement dots on the terrain texture. */
const CITY_POP_THRESHOLD = 15000;   // large black filled circle (NATO urban)
const TOWN_POP_THRESHOLD = 5000;    // medium black filled circle
const VILLAGE_POP_THRESHOLD = 2000; // small black dot

// -- Main builder -----------------------------------------------------------

/** Chunk size (rows) for async texture build to avoid blocking the event loop. */
const ASYNC_CHUNK_ROWS = 256;
/** Async path uses 1024² so init completes in a few seconds; full 2048² can be added later. */
const ASYNC_TEX_W = 1024;
const ASYNC_TEX_H = 1024;

/** Create a 2D canvas for async texture build. Use HTMLCanvasElement so THREE.CanvasTexture works in all browsers. */
function createTextureCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context for terrain texture');
  return { canvas, ctx };
}

/**
 * Async version of buildHoITerrainTexture: yields every ASYNC_CHUNK_ROWS rows
 * so the main thread can paint and other init can proceed. Use this during
 * HoIMapRenderer init to prevent initialization hang.
 */
export async function buildHoITerrainTextureAsync(
    hm: HeightmapInput,
    waterways: LineGeoJSON | null,
    roads: LineGeoJSON | null,
    settlements?: SettlementGeoJSON | null,
): Promise<{ texture: THREE.CanvasTexture }> {
    const TEX_W = ASYNC_TEX_W;
    const TEX_H = ASYNC_TEX_H;
    const { canvas, ctx } = createTextureCanvas(TEX_W, TEX_H);
    const proj = makeCanvasProjection(hm.bbox as [number, number, number, number], TEX_W, TEX_H);

    const cellWidthM = 1000;
    const lightDir: [number, number, number] = [-0.5, 0.5, 0.707];

    const imgData = ctx.createImageData(TEX_W, TEX_H);
    const data = imgData.data;

    for (let chunkStart = 0; chunkStart < TEX_H; chunkStart += ASYNC_CHUNK_ROWS) {
      const chunkEnd = Math.min(chunkStart + ASYNC_CHUNK_ROWS, TEX_H);
      for (let py = chunkStart; py < chunkEnd; py++) {
        for (let px = 0; px < TEX_W; px++) {
          const lon = hm.bbox[0]! + (px / (TEX_W - 1)) * (hm.bbox[2]! - hm.bbox[0]!);
          const lat = hm.bbox[3]! - (py / (TEX_H - 1)) * (hm.bbox[3]! - hm.bbox[1]!);

          const elev = sampleHeight(hm, lon, lat);
          const [br, bg, bb] = hoiElevationRGB(elev);

          const normal = sampleNormal(hm, lon, lat, cellWidthM);
          const shade = computeHillshade(normal, lightDir);

          const shadeFactor = 0.65 + shade * 0.50;

          const i = (py * TEX_W + px) * 4;
          data[i]     = Math.min(255, Math.round(br * shadeFactor));
          data[i + 1] = Math.min(255, Math.round(bg * shadeFactor));
          data[i + 2] = Math.min(255, Math.round(bb * shadeFactor));
          data[i + 3] = 255;
        }
      }
      await new Promise<void>((r) => setTimeout(r, 0));
    }

    ctx.putImageData(imgData, 0, 0);

    if (waterways) {
        ctx.save();
        for (const feature of waterways.features) {
            const ww = feature.properties.waterway as string | undefined;
            if (ww === 'river') {
                const name = feature.properties.name as string | undefined;
                const isMajor = name === 'Bosna' || name === 'Vrbas' || name === 'Drina'
                    || name === 'Neretva' || name === 'Una' || name === 'Sava' || name === 'Sana';
                const width = isMajor ? 4.0 : 2.0;
                drawLineFeature(ctx, feature.geometry, proj, 'rgba(75, 110, 140, 0.6)', width);
            } else if (ww === 'stream') {
                drawLineFeature(ctx, feature.geometry, proj, 'rgba(85, 120, 150, 0.25)', 0.8);
            }
        }
        ctx.restore();
    }

    if (roads) {
        ctx.save();
        for (const feature of roads.features) {
            const hwy = feature.properties.highway as string;
            const style = ROAD_STYLES[hwy];
            if (!style) continue;
            drawLineFeature(ctx, feature.geometry, proj, ROAD_CASING, style.width + 1.2);
        }
        for (const feature of roads.features) {
            const hwy = feature.properties.highway as string;
            const style = ROAD_STYLES[hwy];
            if (!style) continue;
            drawLineFeature(ctx, feature.geometry, proj, style.fill, style.width);
        }
        ctx.restore();
    }

    if (settlements) {
        ctx.save();
        for (const feature of settlements.features) {
            const pop = feature.properties.population_total as number | undefined;
            if (typeof pop !== 'number' || pop < VILLAGE_POP_THRESHOLD) continue;

            const centroid = featureCentroid(feature.geometry);
            if (!centroid) continue;
            const cx = proj.x(centroid[0]);
            const cy = proj.y(centroid[1]);

            let dotR: number;
            if (pop >= CITY_POP_THRESHOLD) dotR = 2.5;
            else if (pop >= TOWN_POP_THRESHOLD) dotR = 1.8;
            else dotR = 1.0;

            ctx.beginPath();
            ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(20, 18, 15, 0.85)';
            ctx.fill();
        }
        ctx.restore();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
    return { texture };
}

export function buildHoITerrainTexture(
    hm: HeightmapInput,
    waterways: LineGeoJSON | null,
    roads: LineGeoJSON | null,
    settlements?: SettlementGeoJSON | null,
): { texture: THREE.CanvasTexture } {
    const TEX_W = 2048;
    const TEX_H = 2048;
    const canvas = new OffscreenCanvas(TEX_W, TEX_H);
    const ctx = canvas.getContext('2d')!;
    const proj = makeCanvasProjection(hm.bbox as [number, number, number, number], TEX_W, TEX_H);

    const cellWidthM = 1000; // rough approx for 1024 cells over ~300km box
    const lightDir: [number, number, number] = [-0.5, 0.5, 0.707]; // NW sun

    // -- 1. Elevation base + hillshade --------------------------------------

    const imgData = ctx.createImageData(TEX_W, TEX_H);
    const data = imgData.data;
    for (let py = 0; py < TEX_H; py++) {
        for (let px = 0; px < TEX_W; px++) {
            const lon = hm.bbox[0]! + (px / (TEX_W - 1)) * (hm.bbox[2]! - hm.bbox[0]!);
            const lat = hm.bbox[3]! - (py / (TEX_H - 1)) * (hm.bbox[3]! - hm.bbox[1]!);

            const elev = sampleHeight(hm, lon, lat);
            const [br, bg, bb] = hoiElevationRGB(elev);

            const normal = sampleNormal(hm, lon, lat, cellWidthM);
            const shade = computeHillshade(normal, lightDir);

            // Stronger hillshade blend (0.65-1.15) to be visible through 75% control fill
            const shadeFactor = 0.65 + shade * 0.50;

            const i = (py * TEX_W + px) * 4;
            data[i]     = Math.min(255, Math.round(br * shadeFactor));
            data[i + 1] = Math.min(255, Math.round(bg * shadeFactor));
            data[i + 2] = Math.min(255, Math.round(bb * shadeFactor));
            data[i + 3] = 255;
        }
    }
    ctx.putImageData(imgData, 0, 0);

    // -- 2. Rivers (blue-grey) ----------------------------------------------

    if (waterways) {
        ctx.save();
        for (const feature of waterways.features) {
            const ww = feature.properties.waterway as string | undefined;
            if (ww === 'river') {
                const name = feature.properties.name as string | undefined;
                const isMajor = name === 'Bosna' || name === 'Vrbas' || name === 'Drina'
                    || name === 'Neretva' || name === 'Una' || name === 'Sava' || name === 'Sana';
                const width = isMajor ? 4.0 : 2.0;
                drawLineFeature(ctx, feature.geometry, proj, 'rgba(75, 110, 140, 0.6)', width);
            } else if (ww === 'stream') {
                drawLineFeature(ctx, feature.geometry, proj, 'rgba(85, 120, 150, 0.25)', 0.8);
            }
        }
        ctx.restore();
    }

    // -- 3. Roads (ochre/brown, subdued) ------------------------------------

    if (roads) {
        ctx.save();
        // Pass 1: dark casing
        for (const feature of roads.features) {
            const hwy = feature.properties.highway as string;
            const style = ROAD_STYLES[hwy];
            if (!style) continue;
            drawLineFeature(ctx, feature.geometry, proj, ROAD_CASING, style.width + 1.2);
        }
        // Pass 2: fill on top
        for (const feature of roads.features) {
            const hwy = feature.properties.highway as string;
            const style = ROAD_STYLES[hwy];
            if (!style) continue;
            drawLineFeature(ctx, feature.geometry, proj, style.fill, style.width);
        }
        ctx.restore();
    }

    // -- 4. Settlement dots (NATO convention: black filled circles) ----------
    // Only dots baked into texture. Labels are floating 3D sprites (see renderer).

    if (settlements) {
        ctx.save();

        for (const feature of settlements.features) {
            const pop = feature.properties.population_total as number | undefined;
            if (typeof pop !== 'number' || pop < VILLAGE_POP_THRESHOLD) continue;

            const centroid = featureCentroid(feature.geometry);
            if (!centroid) continue;
            const cx = proj.x(centroid[0]);
            const cy = proj.y(centroid[1]);

            // NATO convention: black filled circle, size by settlement class
            let dotR: number;
            if (pop >= CITY_POP_THRESHOLD) dotR = 2.5;
            else if (pop >= TOWN_POP_THRESHOLD) dotR = 1.8;
            else dotR = 1.0;

            // Filled black dot
            ctx.beginPath();
            ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(20, 18, 15, 0.85)';
            ctx.fill();
        }

        ctx.restore();
    }

    // -- Build Three.js texture ---------------------------------------------

    const texture = new THREE.CanvasTexture(canvas as unknown as HTMLCanvasElement);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
    return { texture };
}

// -- Helpers ----------------------------------------------------------------

/** Compute centroid of a GeoJSON geometry (Polygon or MultiPolygon). */
function featureCentroid(geometry: { type: string; coordinates: unknown }): [number, number] | null {
    if (!geometry) return null;
    if (geometry.type === 'Polygon') {
        const ring = (geometry.coordinates as number[][][])?.[0];
        if (!ring?.length) return null;
        let sumLon = 0, sumLat = 0;
        for (const pt of ring) { sumLon += pt[0]!; sumLat += pt[1]!; }
        return [sumLon / ring.length, sumLat / ring.length];
    }
    if (geometry.type === 'MultiPolygon') {
        const polys = geometry.coordinates as number[][][][];
        let sumLon = 0, sumLat = 0, count = 0;
        for (const poly of polys) {
            const ring = poly?.[0];
            if (!ring?.length) continue;
            for (const pt of ring) { sumLon += pt[0]!; sumLat += pt[1]!; count++; }
        }
        if (count === 0) return null;
        return [sumLon / count, sumLat / count];
    }
    return null;
}
