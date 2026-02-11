/**
 * Derive 100 m elevation contours from DEM, project to A1 (SVG) space.
 * Output: data/derived/terrain/contours_A1.geojson (deterministic, no timestamps).
 * Run: tsx scripts/map/derive_contours.ts  or npm run map:contours:a1
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import * as GeoTIFF from 'geotiff';
import { applyTps, type TpsParams } from './lib/tps.js';

const ROOT = resolve(process.cwd());
const TIF_PATH = resolve(ROOT, 'data/derived/terrain/dem_clip_h6_2.tif');
const TRANSFORM_PATH = resolve(ROOT, 'data/derived/georef/world_to_svg_transform.json');
const OUTPUT_PATH = resolve(ROOT, 'data/derived/terrain/contours_A1.geojson');
const CONTOUR_INTERVAL = 100;

function pixelToLonLat(
    x: number, y: number,
    w: number, h: number,
    bbox: [number, number, number, number]
): [number, number] {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    const lon = minLon + (x / Math.max(1, w - 1)) * (maxLon - minLon);
    const lat = maxLat - (y / Math.max(1, h - 1)) * (maxLat - minLat);
    return [lon, lat];
}

/** Linear interpolate where contour level crosses edge between two values. */
function lerp(a: number, b: number, level: number): number {
    if (a === b) return 0.5;
    return (level - a) / (b - a);
}

/** Marching squares: for one 2x2 cell, return 0-2 segments (each as [x0,y0,x1,y1] in pixel space). */
function cellContour(
    x: number, y: number,
    vals: Float32Array, w: number, h: number,
    level: number
): [number, number, number, number][] {
    const i00 = y * w + x;
    const i10 = y * w + (x + 1);
    const i01 = (y + 1) * w + x;
    const i11 = (y + 1) * w + (x + 1);
    if (x + 1 >= w || y + 1 >= h) return [];
    const v00 = vals[i00] ?? -1e9;
    const v10 = vals[i10] ?? -1e9;
    const v01 = vals[i01] ?? -1e9;
    const v11 = vals[i11] ?? -1e9;
    const above = (v: number) => (v >= level ? 1 : 0);
    const code = above(v00) | (above(v10) << 1) | (above(v01) << 2) | (above(v11) << 3);
    const segments: [number, number, number, number][] = [];
    const t = (v1: number, v2: number, e: number) => {
        const s = lerp(v1, v2, level);
        return Math.max(0, Math.min(1, s));
    };
    // Edges: 0=bottom (y+1), 1=right (x+1), 2=top (y), 3=left (x)
    const add = (x0: number, y0: number, x1: number, y1: number) => segments.push([x0, y0, x1, y1]);
    switch (code) {
        case 1: add(x + t(v00, v10, level), y + 1, x, y + t(v00, v01, level)); break;
        case 2: add(x + t(v00, v10, level), y + 1, x + 1, y + t(v10, v11, level)); break;
        case 3: add(x, y + t(v00, v01, level), x + 1, y + t(v10, v11, level)); break;
        case 4: add(x, y + t(v00, v01, level), x + t(v01, v11, level), y + 1); break;
        case 5: add(x + t(v00, v10, level), y + 1, x + t(v01, v11, level), y + 1); break;
        case 6: add(x + t(v00, v10, level), y + 1, x + 1, y + t(v10, v11, level)); add(x, y + t(v00, v01, level), x + t(v01, v11, level), y + 1); break;
        case 7: add(x, y + t(v00, v01, level), x + 1, y + t(v10, v11, level)); break;
        case 8: add(x + t(v01, v11, level), y + 1, x + 1, y + t(v10, v11, level)); break;
        case 9: add(x + t(v00, v10, level), y + 1, x + 1, y + t(v10, v11, level)); add(x + t(v01, v11, level), y + 1, x, y + t(v00, v01, level)); break;
        case 10: add(x + t(v01, v11, level), y + 1, x + t(v00, v10, level), y + 1); break;
        case 11: add(x + t(v01, v11, level), y + 1, x + 1, y + t(v10, v11, level)); break;
        case 12: add(x, y + t(v00, v01, level), x + t(v01, v11, level), y + 1); break;
        case 13: add(x + t(v00, v10, level), y + 1, x, y + t(v00, v01, level)); break;
        case 14: add(x + t(v00, v10, level), y + 1, x + t(v01, v11, level), y + 1); break;
        default: break;
    }
    return segments;
}

// Same orientation as phase_A1_derive_base_map: [lon, lat] -> [x, -y] roughly gives [East, North]
function projectToSvg(lon: number, lat: number, tpsParams: TpsParams): [number, number] | null {
    if (lon < 15 || lon > 20 || lat < 42 || lat > 46) return null;
    const [x, y] = applyTps(lon, lat, tpsParams);
    if (isNaN(x) || isNaN(y) || Math.abs(x) > 10000 || Math.abs(y) > 10000) return null;
    const u = x;
    const v = -y;
    return [parseFloat(u.toFixed(4)), parseFloat(v.toFixed(4))];
}

async function main() {
    console.log('--- A1 Contours Derivation (100 m interval) ---');

    if (!existsSync(TIF_PATH)) {
        console.log('DEM not found; skipping contours. Run map:snapshot:dem-clip:h6_2 first.');
        writeFileSync(OUTPUT_PATH, JSON.stringify({ type: 'FeatureCollection', features: [] }));
        return;
    }
    if (!existsSync(TRANSFORM_PATH)) {
        console.log('world_to_svg_transform.json not found; skipping contours.');
        writeFileSync(OUTPUT_PATH, JSON.stringify({ type: 'FeatureCollection', features: [] }));
        return;
    }

    const buffer = readFileSync(TIF_PATH);
    const tiff = await GeoTIFF.fromArrayBuffer(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
    const image = await tiff.getImage();
    const rasters = await image.readRasters();
    const values = rasters[0] as unknown as Float32Array;
    const w = image.getWidth();
    const h = image.getHeight();
    const bbox = image.getBoundingBox() as [number, number, number, number];

    const transform = JSON.parse(readFileSync(TRANSFORM_PATH, 'utf-8'));
    const tpsParams: TpsParams = transform.coefficients;

    let minV = Infinity, maxV = -Infinity;
    for (let i = 0; i < values.length; i++) {
        const v = values[i];
        if (Number.isFinite(v)) { minV = Math.min(minV, v); maxV = Math.max(maxV, v); }
    }
    const levels: number[] = [];
    for (let L = Math.ceil(minV / CONTOUR_INTERVAL) * CONTOUR_INTERVAL; L <= maxV; L += CONTOUR_INTERVAL) {
        levels.push(L);
    }
    console.log(`Generating ${levels.length} levels: ${levels.join(', ')}`);

    const features: any[] = [];
    for (const level of levels) {
        process.stdout.write(`Processing level ${level}m... `);
        const segments: [number, number][][] = [];
        for (let y = 0; y < h - 1; y++) {
            for (let x = 0; x < w - 1; x++) {
                const cellSegs = cellContour(x, y, values, w, h, level);
                for (const [x0, y0, x1, y1] of cellSegs) {
                    const [lon0, lat0] = pixelToLonLat(x0, y0, w, h, bbox);
                    const [lon1, lat1] = pixelToLonLat(x1, y1, w, h, bbox);
                    const p0 = projectToSvg(lon0, lat0, tpsParams);
                    const p1 = projectToSvg(lon1, lat1, tpsParams);
                    if (p0 && p1) {
                        segments.push([p0, p1]);
                    }
                }
            }
        }
        if (segments.length > 0) {
            features.push({
                type: 'Feature',
                properties: { elevation_m: level },
                geometry: { type: 'MultiLineString', coordinates: segments }
            });
        }
        console.log(`${segments.length} segments.`);
    }

    const dir = resolve(ROOT, 'data/derived/terrain');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const fc = { type: 'FeatureCollection' as const, features };
    writeFileSync(OUTPUT_PATH, JSON.stringify(fc));
    console.log(`Wrote ${features.length} contour features to ${OUTPUT_PATH}`);
}

main().catch(console.error);
