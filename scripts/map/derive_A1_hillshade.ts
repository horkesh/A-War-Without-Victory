import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import * as GeoTIFF from 'geotiff';
import { applyTps, TpsParams } from './lib/tps.js';

const TIF_PATH = resolve('data/derived/terrain/dem_clip_h6_2.tif');
const TRANSFORM_PATH = resolve('data/derived/georef/world_to_svg_transform.json');
const OUTPUT_PATH = resolve('data/derived/A1_HILLSHADE.png');

async function main() {
    console.log('--- Phase A1: Hillshade Derivation ---');

    // 1. Read DEM
    if (!existsSync(TIF_PATH)) throw new Error(`Missing DEM: ${TIF_PATH}`);
    const buffer = readFileSync(TIF_PATH);
    const tiff = await GeoTIFF.fromBuffer(buffer);
    const image = await tiff.getImage();
    const rasters = await image.readRasters();
    const elevation = rasters[0] as unknown as Float32Array;
    const w = image.getWidth();
    const h = image.getHeight();
    const bbox = image.getBoundingBox(); // [minLon, minLat, maxLon, maxLat] or [minX, minY, maxX, maxY]
    const resX = (bbox[2] - bbox[0]) / w;
    const resY = (bbox[3] - bbox[1]) / h;

    // 2. Compute Hillshade (4326 grid)
    console.log(`Computing hillshade for ${w}x${h} grid...`);
    const shade = new Uint8Array(w * h);
    const azimuth = 315 * Math.PI / 180; // NW light
    const altitude = 45 * Math.PI / 180;
    const zFactor = 0.0001; // Scale elevation to lon/lat units roughly

    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            const i = y * w + x;

            // Central difference slope
            const dzdx = ((elevation[i + 1] + 2 * elevation[i + 1] + elevation[i + 1 + w]) -
                (elevation[i - 1] + 2 * elevation[i - 1] + elevation[i - 1 - w])) / (8 * resX);
            const dzdy = ((elevation[i - w] + 2 * elevation[i - w] + elevation[i + 1 - w]) -
                (elevation[i + w] + 2 * elevation[i + w] + elevation[i + 1 + w])) / (8 * resY);

            const aspect = Math.atan2(dzdy, -dzdx);
            const slope = Math.atan(zFactor * Math.sqrt(dzdx * dzdx + dzdy * dzdy));

            let val = Math.sin(altitude) * Math.cos(slope) +
                Math.cos(altitude) * Math.sin(slope) * Math.cos(azimuth - aspect);

            val = Math.max(0, val);
            shade[i] = Math.round(val * 255);
        }
    }

    // 3. Project to Canvas (SVG space)
    // Actually, I'll just write the shade as a JSON grid or a raw PNG first.
    // But better to warp it.

    // For now, let's just write the first 100x100 values to check.
    console.log('Hillshade computed.');
}

main().catch(console.error);
