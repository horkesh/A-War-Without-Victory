/**
 * Export a downsampled heightmap from the DEM for the browser 3D viewer.
 * Does not run in browser; run once with: npm run map:export:heightmap-3d
 *
 * INPUT:  data/derived/terrain/dem_clip_h6_2.tif
 * OUTPUT: data/derived/terrain/heightmap_3d_viewer.json
 *         { bbox: [minLon, minLat, maxLon, maxLat], width, height, elevations: number[] }
 *         elevations are row-major; row 0 = north (maxLat), row height-1 = south (minLat).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import * as GeoTIFF from 'geotiff';

const ROOT = resolve();
const TERRAIN_DIR = resolve(ROOT, 'data/derived/terrain');
const DEM_PATH = resolve(TERRAIN_DIR, 'dem_clip_h6_2.tif');
const OUT_PATH = resolve(TERRAIN_DIR, 'heightmap_3d_viewer.json');

const OUT_WIDTH = 1024;
const OUT_HEIGHT = 1024;

async function main(): Promise<void> {
  if (!existsSync(DEM_PATH)) {
    throw new Error(`Missing DEM: ${DEM_PATH}. Run the terrain pipeline (e.g. map:snapshot:dem-clip:h6_2) first.`);
  }
  const buffer = readFileSync(DEM_PATH);
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const tiff = await GeoTIFF.fromArrayBuffer(ab);
  const image = await tiff.getImage();
  const w = image.getWidth();
  const h = image.getHeight();
  const bbox = image.getBoundingBox() as [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  const rasters = await image.readRasters({ interleave: false });
  const elev = (rasters[0] as Float32Array) ?? new Float32Array(0);

  const minLon = bbox[0];
  const minLat = bbox[1];
  const maxLon = bbox[2];
  const maxLat = bbox[3];

  const elevations: number[] = [];
  for (let j = 0; j < OUT_HEIGHT; j++) {
    for (let i = 0; i < OUT_WIDTH; i++) {
      const si = (i / (OUT_WIDTH - 1)) * (w - 1);
      const sj = (j / (OUT_HEIGHT - 1)) * (h - 1);
      const i0 = Math.floor(si);
      const j0 = Math.floor(sj);
      const i1 = Math.min(i0 + 1, w - 1);
      const j1 = Math.min(j0 + 1, h - 1);
      const fx = si - i0;
      const fy = sj - j0;
      const v00 = elev[j0 * w + i0] ?? 0;
      const v10 = elev[j0 * w + i1] ?? 0;
      const v01 = elev[j1 * w + i0] ?? 0;
      const v11 = elev[j1 * w + i1] ?? 0;
      const v = (1 - fx) * (1 - fy) * v00 + fx * (1 - fy) * v10 + (1 - fx) * fy * v01 + fx * fy * v11;
      elevations.push(Number.isFinite(v) ? Math.round(v * 10) / 10 : 0);
    }
  }

  const out = {
    bbox: [minLon, minLat, maxLon, maxLat],
    width: OUT_WIDTH,
    height: OUT_HEIGHT,
    elevations,
  };

  if (!existsSync(TERRAIN_DIR)) mkdirSync(TERRAIN_DIR, { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(out), 'utf8');
  console.log(`Wrote ${OUT_PATH} (${OUT_WIDTH}x${OUT_HEIGHT}, ${elevations.length} values)`);
}

main().catch(console.error);
