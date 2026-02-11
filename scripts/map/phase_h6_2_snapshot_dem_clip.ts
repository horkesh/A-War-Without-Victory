/**
 * Phase H6.2 — DEM clip snapshot (Copernicus GLO-30).
 *
 * PURPOSE:
 *   Clips DEM to Bosnia bbox (+margin) using gdalwarp. DATA ONLY. Deterministic.
 *   No simulation logic.
 *
 * INPUTS:
 *   - data/source/dem/raw/copernicus_dem_glo30_raw.tif (or .tiff)
 *   - data/source/boundaries/bih_adm3_1990.geojson (for bbox)
 *
 * OUTPUTS:
 *   - data/derived/terrain/dem_clip_h6_2.tif
 *   - data/derived/terrain/dem_snapshot_audit_h6_2.json, .txt
 *
 * WHY EXECUTION MAY FAIL:
 *   - gdalwarp (GDAL) not installed or not on PATH — preflight throws with install hint
 *   - DEM file or bih_adm3_1990.geojson missing — throws before clip
 *
 * DO NOT: Consume terrain here. This script produces a clipped DEM snapshot only.
 *         Downstream scalar derivation (e.g. H6.6) will consume outputs when implemented.
 *
 * Usage: tsx scripts/map/phase_h6_2_snapshot_dem_clip.ts
 *   or: npm run map:snapshot:dem-clip:h6_2
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { requireTools, GDALWARP_SPEC } from './_shared/toolchain_preflight.js';


const { results: toolchainResults } = requireTools([GDALWARP_SPEC]);

const ROOT = resolve();
const DERIVED = resolve(ROOT, 'data/derived');
const TERRAIN_DIR = resolve(DERIVED, 'terrain');
const BOUNDARIES_PATH = resolve(ROOT, 'data/source/boundaries/bih_adm3_1990.geojson');
const MARGIN_DEG = 0.1;

const DEM_PATHS = [
  resolve(ROOT, 'data/source/dem/raw/copernicus_dem_glo30_raw.tif'),
  resolve(ROOT, 'data/source/dem/raw/copernicus_dem_glo30_raw.tiff'),
];

type BBox = [number, number, number, number];

function computeBboxFromAdm3(): BBox {
  const content = readFileSync(BOUNDARIES_PATH, 'utf8');
  const fc = JSON.parse(content) as { features?: Array<{ geometry?: { type: string; coordinates: unknown } }> };
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  function processRing(ring: number[][]): void {
    for (const p of ring) {
      if (p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])) {
        const [lon, lat] = p;
        minLon = Math.min(minLon, lon);
        minLat = Math.min(minLat, lat);
        maxLon = Math.max(maxLon, lon);
        maxLat = Math.max(maxLat, lat);
      }
    }
  }

  function processCoords(coords: unknown): void {
    if (!Array.isArray(coords)) return;
    const first = coords[0];
    if (Array.isArray(first)) {
      const inner = first[0];
      if (Array.isArray(inner) && typeof inner[0] === 'number') {
        for (const ring of coords as number[][][]) processRing(ring);
      } else {
        for (const pt of coords as number[][]) processRing([pt]);
      }
    }
  }

  for (const f of fc.features ?? []) {
    const geom = f.geometry;
    if (!geom?.coordinates) continue;
    const c = geom.coordinates;
    if (geom.type === 'Polygon') processCoords(c);
    else if (geom.type === 'MultiPolygon') {
      for (const poly of c as number[][][][]) processCoords(poly);
    }
  }

  if (!Number.isFinite(minLon)) {
    throw new Error('bih_adm3_1990.geojson: no valid coordinates found');
  }
  return [minLon, minLat, maxLon, maxLat];
}

function expandBbox(bbox: BBox, margin: number): BBox {
  return [
    bbox[0] - margin,
    bbox[1] - margin,
    bbox[2] + margin,
    bbox[3] + margin,
  ];
}

function sha256Hex(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function runGdalInfo(tifPath: string): { ok: boolean; stdout: string; stderr: string } {
  const r = spawnSync('gdalinfo', ['-json', '-mm', tifPath], { encoding: 'utf8', timeout: 60_000 });
  return {
    ok: r.status === 0,
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
  };
}

function runGdalwarp(
  inputPath: string,
  outputPath: string,
  bbox: BBox,
  resampling: string = 'bilinear'
): { ok: boolean; stderr: string } {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const te = `${minLon} ${minLat} ${maxLon} ${maxLat}`;
  const args = [
    '-t_srs', 'EPSG:4326',
    '-te', minLon.toString(), minLat.toString(), maxLon.toString(), maxLat.toString(),
    '-r', resampling,
    '-co', 'COMPRESS=LZW',
    '-overwrite',
    inputPath,
    outputPath,
  ];
  const r = spawnSync('gdalwarp', args, { encoding: 'utf8', timeout: 300_000 });
  return { ok: r.status === 0, stderr: r.stderr ?? '' };
}

interface GdalInfo {
  size?: [number, number];
  geoTransform?: number[];
  coordinateSystem?: { wkt?: string };
  bands?: Array<{
    band?: number;
    type?: string;
    noDataValue?: number | null;
    min?: number;
    max?: number;
  }>;
}

function computeRasterStats(tifPath: string): {
  min: number;
  max: number;
  mean: number;
  width: number;
  height: number;
  nodata: number | null;
  inputCrs: string;
  outputCrs: string;
  pixelSize: [number, number];
} {
  const info = runGdalInfo(tifPath);
  if (!info.ok) {
    throw new Error(`gdalinfo failed: ${info.stderr}`);
  }
  const j: GdalInfo = JSON.parse(info.stdout);
  const size = j.size ?? [0, 0];
  const width = size[0];
  const height = size[1];
  const gt = j.geoTransform ?? [0, 1, 0, 0, 0, -1];
  const pixelSize: [number, number] = [Math.abs(gt[1]), Math.abs(gt[5])];
  const bands = j.bands ?? [];
  const band0 = bands[0];
  const nodata = band0?.noDataValue ?? null;
  const min = band0?.min ?? 0;
  const max = band0?.max ?? 0;
  const mean = Number.isFinite(min) && Number.isFinite(max) ? (min + max) / 2 : 0;

  let inputCrs = 'unknown';
  let outputCrs = 'EPSG:4326';
  const wkt = j.coordinateSystem?.wkt ?? '';
  if (wkt.includes('WGS_1984') || wkt.includes('4326')) inputCrs = 'EPSG:4326';
  else if (wkt) inputCrs = 'detected (see wkt)';

  return {
    min, max, mean, width, height, nodata,
    inputCrs, outputCrs, pixelSize,
  };
}

function main(): void {
  let demPath: string | null = null;
  for (const p of DEM_PATHS) {
    if (existsSync(p)) {
      demPath = p;
      break;
    }
  }
  if (!demPath) {
    throw new Error(`DEM not found. Tried: ${DEM_PATHS.join(', ')}`);
  }

  if (!existsSync(BOUNDARIES_PATH)) {
    throw new Error(`Boundaries not found: ${BOUNDARIES_PATH}`);
  }

  const baseBbox = computeBboxFromAdm3();
  const bbox = expandBbox(baseBbox, MARGIN_DEG);

  if (!existsSync(TERRAIN_DIR)) mkdirSync(TERRAIN_DIR, { recursive: true });

  const outputPath = resolve(TERRAIN_DIR, 'dem_clip_h6_2.tif');
  const warp = runGdalwarp(demPath, outputPath, bbox, 'bilinear');
  if (!warp.ok) {
    throw new Error(`gdalwarp failed. Is GDAL installed? Run: gdalwarp --version\n${warp.stderr}`);
  }

  const stats = computeRasterStats(outputPath);
  const tifBytes = readFileSync(outputPath);
  const tifSha = sha256Hex(tifBytes);

  const audit = {
    bbox_world: bbox,
    input_crs: stats.inputCrs,
    output_crs: stats.outputCrs,
    pixel_size: stats.pixelSize,
    width: stats.width,
    height: stats.height,
    nodata_value: stats.nodata,
    elevation: { min: stats.min, max: stats.max, mean: stats.mean },
    sha256: tifSha,
    runtime: { tooling: 'gdalwarp', resampling: 'bilinear', compression: 'LZW' },
    toolchain: { tools: toolchainResults },
  };

  writeFileSync(
    resolve(TERRAIN_DIR, 'dem_snapshot_audit_h6_2.json'),
    JSON.stringify(audit, null, 2),
    'utf8'
  );
  const txtLines = [
    'DEM Clip Snapshot H6.2 Audit',
    `bbox_world: ${bbox.join(', ')}`,
    `input_crs: ${audit.input_crs}`,
    `output_crs: ${audit.output_crs}`,
    `pixel_size: ${audit.pixel_size.join(', ')}`,
    `width: ${audit.width}, height: ${audit.height}`,
    `nodata_value: ${audit.nodata_value}`,
    `elevation min: ${audit.elevation.min}, max: ${audit.elevation.max}, mean: ${audit.elevation.mean}`,
    `sha256: ${audit.sha256}`,
    `tooling: ${audit.runtime.tooling}`,
  ];
  writeFileSync(
    resolve(TERRAIN_DIR, 'dem_snapshot_audit_h6_2.txt'),
    txtLines.join('\n'),
    'utf8'
  );

  console.log('Phase H6.2 DEM clip done.');
  console.log('  Output:', outputPath);
  console.log('  Dimensions:', stats.width, 'x', stats.height);
  console.log('  Elevation:', stats.min, '-', stats.max, '(mean', stats.mean, ')');
}

main();
