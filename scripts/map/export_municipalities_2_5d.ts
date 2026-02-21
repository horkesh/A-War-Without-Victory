/**
 * Export municipalities GeoJSON with elevation_mean_m for the 2.5D viewer.
 * Uses real BiH 1990 municipal borders (bih_adm3_1990) and samples elevation from the heightmap.
 * Run after map:export:heightmap-3d. Output: data/derived/municipalities_2_5d_viewer.geojson
 *
 * INPUTS:  data/source/boundaries/bih_adm3_1990.geojson, data/derived/terrain/heightmap_3d_viewer.json
 * OUTPUT:  data/derived/municipalities_2_5d_viewer.geojson
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve();
const BOUNDARIES_PATH = resolve(ROOT, 'data/source/boundaries/bih_adm3_1990.geojson');
const HEIGHTMAP_PATH = resolve(ROOT, 'data/derived/terrain/heightmap_3d_viewer.json');
const OUT_PATH = resolve(ROOT, 'data/derived/municipalities_2_5d_viewer.geojson');

interface HeightmapData {
  bbox: [number, number, number, number];
  width: number;
  height: number;
  elevations: number[];
}

function centroidOfRing(ring: number[][]): [number, number] {
  if (ring.length === 0) return [0, 0];
  let sumLon = 0, sumLat = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    sumLon += ring[i]![0]!;
    sumLat += ring[i]![1]!;
  }
  return [sumLon / n, sumLat / n];
}

function sampleElevation(
  hm: HeightmapData,
  lon: number,
  lat: number
): number {
  const [minLon, minLat, maxLon, maxLat] = hm.bbox;
  const { width, height, elevations } = hm;
  const si = ((lon - minLon) / (maxLon - minLon)) * (width - 1);
  const sj = ((maxLat - lat) / (maxLat - minLat)) * (height - 1);
  const i0 = Math.floor(si);
  const j0 = Math.floor(sj);
  const i1 = Math.min(i0 + 1, width - 1);
  const j1 = Math.min(j0 + 1, height - 1);
  const fx = si - i0;
  const fy = sj - j0;
  const v00 = elevations[j0 * width + i0] ?? 0;
  const v10 = elevations[j0 * width + i1] ?? 0;
  const v01 = elevations[j1 * width + i0] ?? 0;
  const v11 = elevations[j1 * width + i1] ?? 0;
  const v = (1 - fx) * (1 - fy) * v00 + fx * (1 - fy) * v10 + (1 - fx) * fy * v01 + fx * fy * v11;
  return Number.isFinite(v) ? Math.round(v * 10) / 10 : 0;
}

function main(): void {
  if (!existsSync(BOUNDARIES_PATH)) {
    throw new Error(`Missing boundaries: ${BOUNDARIES_PATH}`);
  }
  if (!existsSync(HEIGHTMAP_PATH)) {
    throw new Error(`Missing heightmap: ${HEIGHTMAP_PATH}. Run npm run map:export:heightmap-3d first.`);
  }

  const fc = JSON.parse(readFileSync(BOUNDARIES_PATH, 'utf8')) as { features?: Array<{ type: string; geometry?: { type: string; coordinates?: number[][][] | number[][][][] }; properties?: Record<string, unknown> }> };
  const hm = JSON.parse(readFileSync(HEIGHTMAP_PATH, 'utf8')) as HeightmapData;

  const features = (fc.features ?? []).map((f) => {
    const geom = f.geometry;
    if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) return f;
    let lon = 0, lat = 0;
    if (geom.type === 'Polygon' && geom.coordinates?.[0]?.length) {
      [lon, lat] = centroidOfRing(geom.coordinates[0]!);
    } else if (geom.type === 'MultiPolygon' && geom.coordinates?.[0]?.[0]?.length) {
      [lon, lat] = centroidOfRing(geom.coordinates[0]![0]!);
    }
    const elevation_mean_m = sampleElevation(hm, lon, lat);
    return {
      ...f,
      properties: { ...(f.properties ?? {}), elevation_mean_m },
    };
  });

  const out = { type: 'FeatureCollection' as const, features };
  const outDir = resolve(ROOT, 'data/derived');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(out), 'utf8');
  console.log(`Wrote ${OUT_PATH} (${features.length} municipalities with elevation)`);
}

main();
