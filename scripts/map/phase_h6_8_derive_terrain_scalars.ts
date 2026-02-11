/**
 * Phase H6.8 — Derive terrain scalars (data-only, inert).
 *
 * PURPOSE:
 *   Derive per-settlement terrain scalar datasets from H6.2 outputs and H6.0 georef.
 *   No simulation consumption; no mechanics changes; deterministic outputs only.
 *
 * INPUTS (must exist; STOP on first missing):
 *   - data/derived/terrain/osm_roads_snapshot_h6_2.geojson
 *   - data/derived/terrain/osm_waterways_snapshot_h6_2.geojson
 *   - data/derived/terrain/dem_clip_h6_2.tif
 *   - data/derived/terrain/osm_snapshot_audit_h6_2.json
 *   - data/derived/terrain/dem_snapshot_audit_h6_2.json
 *   - data/derived/settlements_substrate.geojson
 *   - data/derived/georef/svg_to_world_transform.json
 *
 * OUTPUTS:
 *   - data/derived/terrain/settlements_terrain_scalars.json (awwv_meta + checksum)
 *   - data/derived/terrain/terrain_scalars_audit_h6_8.json
 *   - data/derived/terrain/terrain_scalars_audit_h6_8.txt
 *
 * Usage: tsx scripts/map/phase_h6_8_derive_terrain_scalars.ts
 *   or: npm run map:derive:terrain-scalars:h6_8
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

import { stripTimestampKeysForArtifacts } from '../../tools/engineering/determinism_guard.js';
import * as turf from '@turf/turf';
import { fromFile as geotiffFromFile } from 'geotiff';


const ROOT = resolve();
const DERIVED = resolve(ROOT, 'data/derived');
const TERRAIN_DIR = resolve(DERIVED, 'terrain');
const GEOREF_DIR = resolve(DERIVED, 'georef');
const SUBSTRATE_PATH = resolve(DERIVED, 'settlements_substrate.geojson');

const OSM_ROADS_PATH = resolve(TERRAIN_DIR, 'osm_roads_snapshot_h6_2.geojson');
const OSM_WATERWAYS_PATH = resolve(TERRAIN_DIR, 'osm_waterways_snapshot_h6_2.geojson');
const DEM_CLIP_PATH = resolve(TERRAIN_DIR, 'dem_clip_h6_2.tif');
const OSM_AUDIT_PATH = resolve(TERRAIN_DIR, 'osm_snapshot_audit_h6_2.json');
const DEM_AUDIT_PATH = resolve(TERRAIN_DIR, 'dem_snapshot_audit_h6_2.json');
const GEOREF_TRANSFORM_PATH = resolve(GEOREF_DIR, 'svg_to_world_transform.json');

const SCALARS_OUT_PATH = resolve(TERRAIN_DIR, 'settlements_terrain_scalars.json');
const AUDIT_JSON_PATH = resolve(TERRAIN_DIR, 'terrain_scalars_audit_h6_8.json');
const AUDIT_TXT_PATH = resolve(TERRAIN_DIR, 'terrain_scalars_audit_h6_8.txt');

// Fixed precision per spec (1 for elevation m, 3 for normalized indices)
function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}

// Clamp to [0, 1]
function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

// --- Georef: SVG → world (lon, lat) ---
type TransformCoeff = { method: 'tps'; coefficients: { wx: number[]; wy: number[]; ax: number[]; ay: number[]; pts: number[][] } } | { method: 'affine'; coefficients: number[] };

function tpsBasis(r: number): number {
  if (r < 1e-10) return 0;
  return r * r * Math.log(r);
}

function applyTps(x: number, y: number, p: { wx: number[]; wy: number[]; ax: number[]; ay: number[]; pts: number[][] }): [number, number] {
  let u = p.ax[0] + p.ax[1] * x + p.ax[2] * y;
  let v = p.ay[0] + p.ay[1] * x + p.ay[2] * y;
  for (let i = 0; i < p.pts.length; i++) {
    const dx = x - p.pts[i][0];
    const dy = y - p.pts[i][1];
    const r = Math.sqrt(dx * dx + dy * dy);
    u += p.wx[i] * tpsBasis(r);
    v += p.wy[i] * tpsBasis(r);
  }
  return [u, v];
}

function applyAffine(x: number, y: number, params: number[]): [number, number] {
  const [a, b, c, d, e, f] = params;
  return [a * x + b * y + c, d * x + e * y + f];
}

function buildSvgToWorld(transformPath: string): (x: number, y: number) => [number, number] {
  const raw = readFileSync(transformPath, 'utf8');
  const t = JSON.parse(raw) as TransformCoeff;
  if (t.method === 'tps' && t.coefficients && typeof (t.coefficients as any).pts !== 'undefined') {
    const c = t.coefficients as { wx: number[]; wy: number[]; ax: number[]; ay: number[]; pts: number[][] };
    return (x, y) => applyTps(x, y, c);
  }
  if (t.method === 'affine' && Array.isArray((t as any).coefficients)) {
    const params = (t as any).coefficients as number[];
    return (x, y) => applyAffine(x, y, params);
  }
  throw new Error('svg_to_world_transform.json: unsupported method or missing coefficients');
}

// --- Polygon centroid (first ring) ---
function polygonCentroid(coords: number[][][]): [number, number] {
  const ring = coords[0];
  if (!ring?.length) return [0, 0];
  let sx = 0, sy = 0, n = 0;
  for (const p of ring) {
    if (p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])) {
      sx += p[0]; sy += p[1]; n++;
    }
  }
  return n === 0 ? [0, 0] : [sx / n, sy / n];
}

function multiPolygonCentroid(coords: number[][][][]): [number, number] {
  let sx = 0, sy = 0, n = 0;
  for (const poly of coords) {
    const [cx, cy] = polygonCentroid(poly);
    if (Number.isFinite(cx) && Number.isFinite(cy)) {
      sx += cx; sy += cy; n++;
    }
  }
  return n === 0 ? [0, 0] : [sx / n, sy / n];
}

function geomToWorldRing(geom: { type: string; coordinates: unknown }, svgToWorld: (x: number, y: number) => [number, number]): number[][] {
  const c = geom.coordinates as number[][][] | number[][][][];
  if (!Array.isArray(c)) return [];
  if ((geom as any).type === 'Polygon') {
    const ring = (c as number[][][])[0];
    if (!ring) return [];
    return ring.map((p) => svgToWorld(p[0], p[1]));
  }
  if ((geom as any).type === 'MultiPolygon') {
    const out: number[][] = [];
    for (const poly of c as number[][][][]) {
      const ring = poly[0];
      if (ring) out.push(...ring.map((p) => svgToWorld(p[0], p[1])));
    }
    return out;
  }
  return [];
}

// Convert polygon (world coords) to Turf polygon for intersection
function worldRingToTurfPolygon(ring: number[][]): turf.helpers.Position[] {
  if (ring.length < 3) return [];
  const closed = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
    ? ring
    : [...ring, ring[0]];
  return closed.map((p) => [p[0], p[1]]);
}

// --- DEM: read raster and sample elevation + slope ---
const SLOPE_NORMALIZE_DEG = 45; // 45 deg = slope_index 1

async function loadDemRaster(tifPath: string): Promise<{
  width: number;
  height: number;
  origin: [number, number];
  resolution: [number, number];
  elev: Float32Array | Float64Array | Uint16Array;
  slopeDeg: Float32Array;
}> {
  const tif = await geotiffFromFile(tifPath);
  const image = await tif.getImage();
  const width = image.getWidth();
  const height = image.getHeight();
  const origin = image.getOrigin() as [number, number];
  const res = image.getResolution();
  const resolution: [number, number] = [res[0], Math.abs(res[1])];

  const rasters = await image.readRasters({ interleave: false });
  const elev = (rasters[0] as Float32Array | Float64Array | Uint16Array) ?? new Float32Array(0);

  // Slope from elevation (Horn 3x3): slope in degrees at each pixel (edge pixels get 0)
  const slopeDeg = new Float32Array(width * height);
  for (let j = 1; j < height - 1; j++) {
    for (let i = 1; i < width - 1; i++) {
      const idx = j * width + i;
      const degToM = 111320;
      const dzdx = (elev[(j - 1) * width + i + 1]! + 2 * elev[idx + 1]! + elev[(j + 1) * width + i + 1]!
        - elev[(j - 1) * width + i - 1]! - 2 * elev[idx - 1]! - elev[(j + 1) * width + i - 1]!) / (8 * resolution[0] * degToM);
      const dzdy = (elev[(j + 1) * width + i - 1]! + 2 * elev[(j + 1) * width + i]! + elev[(j + 1) * width + i + 1]!
        - elev[(j - 1) * width + i - 1]! - 2 * elev[(j - 1) * width + i]! - elev[(j - 1) * width + i + 1]!) / (8 * resolution[1] * degToM);
      const slopeRad = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy));
      slopeDeg[idx] = (slopeRad * 180) / Math.PI;
    }
  }

  return { width, height, origin, resolution, elev, slopeDeg };
}

function pixelAt(dem: { width: number; height: number; origin: [number, number]; resolution: [number, number]; elev: Float32Array | Float64Array | Uint16Array; slopeDeg: Float32Array }, lon: number, lat: number): { elev: number; slopeDeg: number } | null {
  const px = (lon - dem.origin[0]) / dem.resolution[0];
  const py = (dem.origin[1] - lat) / dem.resolution[1];
  const ix = Math.floor(px);
  const iy = Math.floor(py);
  if (ix < 0 || ix >= dem.width || iy < 0 || iy >= dem.height) return null;
  const idx = iy * dem.width + ix;
  const elev = dem.elev[idx];
  const slopeDeg = dem.slopeDeg[idx];
  if (elev == null || !Number.isFinite(elev as number)) return null;
  return { elev: elev as number, slopeDeg: slopeDeg ?? 0 };
}

// Sample all pixels whose centers fall inside the polygon (world bbox then point-in-polygon)
function sampleDemInPolygon(
  dem: Awaited<ReturnType<typeof loadDemRaster>>,
  ring: number[][]
): { elevs: number[]; slopes: number[] } {
  const poly = turf.polygon([worldRingToTurfPolygon(ring)]);
  const elevs: number[] = [];
  const slopes: number[] = [];
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const p of ring) {
    minLon = Math.min(minLon, p[0]); maxLon = Math.max(maxLon, p[0]);
    minLat = Math.min(minLat, p[1]); maxLat = Math.max(maxLat, p[1]);
  }
  const origin = dem.origin;
  const res = dem.resolution;
  const i0 = Math.max(0, Math.floor((minLon - origin[0]) / res[0]));
  const i1 = Math.min(dem.width, Math.ceil((maxLon - origin[0]) / res[0]) + 1);
  const j0 = Math.max(0, Math.floor((origin[1] - maxLat) / res[1]));
  const j1 = Math.min(dem.height, Math.ceil((origin[1] - minLat) / res[1]) + 1);
  for (let j = j0; j < j1; j++) {
    for (let i = i0; i < i1; i++) {
      const lon = origin[0] + (i + 0.5) * res[0];
      const lat = origin[1] - (j + 0.5) * res[1];
      if (!turf.booleanPointInPolygon([lon, lat], poly)) continue;
      const v = pixelAt(dem, lon, lat);
      if (v && Number.isFinite(v.elev)) {
        elevs.push(v.elev);
        slopes.push(v.slopeDeg);
      }
    }
  }
  return { elevs, slopes };
}

// --- OSM: presence and density (bbox pre-filter + midpoint-in-polygon for speed) ---
function bboxOfLine(coords: number[][]): [number, number, number, number] {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const p of coords) {
    if (p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])) {
      minLon = Math.min(minLon, p[0]); maxLon = Math.max(maxLon, p[0]);
      minLat = Math.min(minLat, p[1]); maxLat = Math.max(maxLat, p[1]);
    }
  }
  return [minLon, minLat, maxLon, maxLat];
}

function bboxesOverlap(a: [number, number, number, number], b: [number, number, number, number]): boolean {
  return !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
}

type LineWithBbox = { mid: [number, number]; bbox: [number, number, number, number] };

function precomputeLinesWithBbox(features: Array<{ geometry?: { type: string; coordinates: number[][] | number[][][] } }>): LineWithBbox[] {
  const out: LineWithBbox[] = [];
  for (const f of features) {
    const geom = f.geometry;
    if (!geom?.coordinates) continue;
    const coords = geom.type === 'LineString' ? [geom.coordinates as number[][]] : (geom.coordinates as number[][][]);
    for (const line of coords) {
      if (!Array.isArray(line) || line.length < 2) continue;
      const pts = line as [number, number][];
      const mid: [number, number] = [(pts[0]![0] + pts[pts.length - 1]![0]) / 2, (pts[0]![1] + pts[pts.length - 1]![1]) / 2];
      out.push({ mid, bbox: bboxOfLine(pts) });
    }
  }
  return out;
}

/** Returns count of lines whose midpoint falls inside the polygon (bbox pre-filter). Normalize to [0,1] by caller. */
function countLinesInPolygon(
  lines: LineWithBbox[],
  worldPoly: turf.helpers.Feature<turf.helpers.Polygon>,
  polyBbox: [number, number, number, number]
): number {
  let count = 0;
  for (const { mid, bbox } of lines) {
    if (!bboxesOverlap(polyBbox, bbox)) continue;
    if (turf.booleanPointInPolygon(mid, worldPoly)) count++;
  }
  return count;
}

async function run(): Promise<void> {
  if (!existsSync(OSM_ROADS_PATH)) {
    console.error('Missing:', OSM_ROADS_PATH);
    process.exit(1);
  }
  if (!existsSync(OSM_WATERWAYS_PATH)) {
    console.error('Missing:', OSM_WATERWAYS_PATH);
    process.exit(1);
  }
  if (!existsSync(DEM_CLIP_PATH)) {
    console.error('Missing:', DEM_CLIP_PATH);
    process.exit(1);
  }
  if (!existsSync(OSM_AUDIT_PATH)) {
    console.error('Missing:', OSM_AUDIT_PATH);
    process.exit(1);
  }
  if (!existsSync(DEM_AUDIT_PATH)) {
    console.error('Missing:', DEM_AUDIT_PATH);
    process.exit(1);
  }
  if (!existsSync(SUBSTRATE_PATH)) {
    console.error('Missing:', SUBSTRATE_PATH);
    process.exit(1);
  }
  if (!existsSync(GEOREF_TRANSFORM_PATH)) {
    console.error('Missing:', GEOREF_TRANSFORM_PATH);
    process.exit(1);
  }

  if (!existsSync(TERRAIN_DIR)) mkdirSync(TERRAIN_DIR, { recursive: true });

  const svgToWorld = buildSvgToWorld(GEOREF_TRANSFORM_PATH);

  const substrateRaw = readFileSync(SUBSTRATE_PATH, 'utf8');
  const substrate = JSON.parse(substrateRaw) as { type: string; features?: Array<{ properties?: { sid?: string }; geometry?: { type: string; coordinates: unknown } }> };
  const features = substrate.features ?? [];
  const sortedFeatures = [...features].sort((a, b) =>
    String(a.properties?.sid ?? '').localeCompare(String(b.properties?.sid ?? ''))
  );

  const roadsFc = JSON.parse(readFileSync(OSM_ROADS_PATH, 'utf8')) as { features?: Array<{ geometry?: { type: string; coordinates: number[][] | number[][][] } }> };
  const waterwaysFc = JSON.parse(readFileSync(OSM_WATERWAYS_PATH, 'utf8')) as { features?: Array<{ geometry?: { type: string; coordinates: number[][] | number[][][] } }> };
  const roadsFeatures = roadsFc.features ?? [];
  const waterwaysFeatures = waterwaysFc.features ?? [];
  const roadsLines = precomputeLinesWithBbox(roadsFeatures);
  const waterwaysLines = precomputeLinesWithBbox(waterwaysFeatures);

  const dem = await loadDemRaster(DEM_CLIP_PATH);

    const bySid: Record<string, {
      road_access_index: number;
      river_crossing_penalty: number;
      elevation_mean_m: number;
      elevation_stddev_m: number;
      slope_index: number;
      terrain_friction_index: number;
    }> = {};

    let zeroRoads = 0;
    let zeroWaterways = 0;
    let zeroDemPixels = 0;

    for (const f of sortedFeatures) {
      const sid = f.properties?.sid;
      if (sid == null || sid === '') continue;

      const geom = f.geometry;
      if (!geom?.coordinates) {
        zeroDemPixels++;
        bySid[sid] = {
          road_access_index: 0,
          river_crossing_penalty: 0,
          elevation_mean_m: 0,
          elevation_stddev_m: 0,
          slope_index: 0,
          terrain_friction_index: 0,
        };
        continue;
      }

      const ring = geomToWorldRing(geom as { type: string; coordinates: unknown }, svgToWorld);
      if (ring.length < 3) {
        zeroDemPixels++;
        bySid[sid] = {
          road_access_index: 0,
          river_crossing_penalty: 0,
          elevation_mean_m: 0,
          elevation_stddev_m: 0,
          slope_index: 0,
          terrain_friction_index: 0,
        };
        continue;
      }

      const worldPoly = turf.polygon([worldRingToTurfPolygon(ring)]);
      const polyBbox = turf.bbox(worldPoly) as [number, number, number, number];
      const areaKm2 = turf.area(worldPoly) / 1_000_000;
      const roadCount = countLinesInPolygon(roadsLines, worldPoly, polyBbox);
      const waterwayCount = countLinesInPolygon(waterwaysLines, worldPoly, polyBbox);

      if (roadCount <= 0) zeroRoads++;
      if (waterwayCount <= 0) zeroWaterways++;

      // Normalize: density-based index min(1, count / (area*K + epsilon)); binary 0/1 if no area
      const road_access_index = clamp01(round3(areaKm2 > 0 ? Math.min(1, roadCount / (areaKm2 * 2 + 0.1)) : (roadCount > 0 ? 1 : 0)));
      const river_crossing_penalty = clamp01(round3(areaKm2 > 0 ? Math.min(1, waterwayCount / (areaKm2 * 1 + 0.1)) : (waterwayCount > 0 ? 1 : 0)));

      const { elevs, slopes } = sampleDemInPolygon(dem, ring);
      if (elevs.length === 0) zeroDemPixels++;

      let elevation_mean_m = 0;
      let elevation_stddev_m = 0;
      let slope_index = 0;
      if (elevs.length > 0) {
        const mean = elevs.reduce((a, b) => a + b, 0) / elevs.length;
        const variance = elevs.reduce((s, v) => s + (v - mean) ** 2, 0) / elevs.length;
        elevation_mean_m = round1(mean);
        elevation_stddev_m = round1(Math.sqrt(variance));
        const maxSlope = Math.max(...slopes);
        slope_index = clamp01(round3(Math.min(1, maxSlope / SLOPE_NORMALIZE_DEG)));
      }

      const terrain_friction_index = slope_index;

      bySid[sid] = {
        road_access_index,
        river_crossing_penalty,
        elevation_mean_m,
        elevation_stddev_m,
        slope_index,
        terrain_friction_index,
      };
    }

    const sortedSids = Object.keys(bySid).sort((a, b) => a.localeCompare(b));
    const bySidSorted: Record<string, typeof bySid[string]> = {};
    for (const sid of sortedSids) {
      bySidSorted[sid] = bySid[sid];
    }

    const payload = {
      awwv_meta: {
        role: 'terrain_scalars_per_settlement',
        version: 'h6_8',
        id_field: 'sid',
        record_count: sortedSids.length,
        scalar_fields: ['road_access_index', 'river_crossing_penalty', 'elevation_mean_m', 'elevation_stddev_m', 'slope_index', 'terrain_friction_index'],
        checksum_sha256: '',
      },
      by_sid: bySidSorted,
    };

    const contentForChecksum = JSON.stringify({ awwv_meta: { ...payload.awwv_meta, checksum_sha256: '' }, by_sid: payload.by_sid });
    const contentSha = createHash('sha256').update(contentForChecksum, 'utf8').digest('hex');
    payload.awwv_meta.checksum_sha256 = contentSha;

    const stripped = stripTimestampKeysForArtifacts(payload) as typeof payload;
    writeFileSync(SCALARS_OUT_PATH, JSON.stringify(stripped, null, 2), 'utf8');

    const audit = {
      phase: 'h6_8',
      inputs: {
        osm_roads_snapshot_h6_2_geojson: OSM_ROADS_PATH,
        osm_waterways_snapshot_h6_2_geojson: OSM_WATERWAYS_PATH,
        dem_clip_h6_2_tif: DEM_CLIP_PATH,
        osm_snapshot_audit_h6_2_json: OSM_AUDIT_PATH,
        dem_snapshot_audit_h6_2_json: DEM_AUDIT_PATH,
        settlements_substrate_geojson: SUBSTRATE_PATH,
        svg_to_world_transform_json: GEOREF_TRANSFORM_PATH,
      },
      georef: { artifact: GEOREF_TRANSFORM_PATH, method: 'svg_to_world' },
      outputs: {
        settlements_terrain_scalars_json: SCALARS_OUT_PATH,
        terrain_scalars_audit_h6_8_json: AUDIT_JSON_PATH,
        terrain_scalars_audit_h6_8_txt: AUDIT_TXT_PATH,
      },
      scalar_field_list: payload.awwv_meta.scalar_fields,
      coverage: {
        settlements_populated: sortedSids.length,
        zero_roads_count: zeroRoads,
        zero_waterways_count: zeroWaterways,
        zero_dem_pixels_count: zeroDemPixels,
      },
    };

    const auditStripped = stripTimestampKeysForArtifacts(audit);
    writeFileSync(AUDIT_JSON_PATH, JSON.stringify(auditStripped, null, 2), 'utf8');

    const txtLines = [
      'Phase H6.8 — Terrain scalars derivation audit',
      '============================================',
      '',
      'Inputs:',
      ...Object.entries(audit.inputs).map(([k, v]) => `  ${k}: ${v}`),
      '',
      'Georef: ' + audit.georef.artifact + ' (' + audit.georef.method + ')',
      '',
      'Outputs:',
      ...Object.entries(audit.outputs).map(([k, v]) => `  ${k}: ${v}`),
      '',
      'Scalar fields: ' + audit.scalar_field_list.join(', '),
      '',
      'Coverage:',
      `  settlements_populated: ${audit.coverage.settlements_populated}`,
      `  zero_roads_count: ${audit.coverage.zero_roads_count}`,
      `  zero_waterways_count: ${audit.coverage.zero_waterways_count}`,
      `  zero_dem_pixels_count: ${audit.coverage.zero_dem_pixels_count}`,
    ];
    writeFileSync(AUDIT_TXT_PATH, txtLines.join('\n'), 'utf8');

  console.log('Phase H6.8 terrain scalars written to', SCALARS_OUT_PATH);
  console.log('  settlements_populated:', sortedSids.length);
  console.log('  audit:', AUDIT_JSON_PATH, AUDIT_TXT_PATH);
}

function main(): void {
  if (!existsSync(OSM_ROADS_PATH)) {
    console.error('Missing:', OSM_ROADS_PATH);
    process.exit(1);
  }
  if (!existsSync(OSM_WATERWAYS_PATH)) {
    console.error('Missing:', OSM_WATERWAYS_PATH);
    process.exit(1);
  }
  if (!existsSync(DEM_CLIP_PATH)) {
    console.error('Missing:', DEM_CLIP_PATH);
    process.exit(1);
  }
  if (!existsSync(OSM_AUDIT_PATH)) {
    console.error('Missing:', OSM_AUDIT_PATH);
    process.exit(1);
  }
  if (!existsSync(DEM_AUDIT_PATH)) {
    console.error('Missing:', DEM_AUDIT_PATH);
    process.exit(1);
  }
  if (!existsSync(SUBSTRATE_PATH)) {
    console.error('Missing:', SUBSTRATE_PATH);
    process.exit(1);
  }
  if (!existsSync(GEOREF_TRANSFORM_PATH)) {
    console.error('Missing:', GEOREF_TRANSFORM_PATH);
    process.exit(1);
  }

  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

main();
