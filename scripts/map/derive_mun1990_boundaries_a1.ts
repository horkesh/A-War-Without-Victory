/**
 * Derive mun1990 boundary linework in A1 space from bih_adm3_1990 (WGS84).
 *
 * PURPOSE: Map viewer needs municipalities_1990_boundaries in same coordinate space
 *   as settlements (A1). bih_adm3_1990 is WGS84; project via TPS to A1.
 *
 * INPUTS: data/source/boundaries/bih_adm3_1990.geojson, georef/world_to_svg_transform.json
 * OUTPUTS: data/derived/municipalities_1990_boundaries.geojson (MultiLineString per mun)
 *
 * Determinism: stable sort by mun1990_id; canonical key order.
 * Usage: tsx scripts/map/derive_mun1990_boundaries_a1.ts
 *   or: npm run map:derive:mun1990-boundaries:a1
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { applyTps, TpsParams } from './lib/tps.js';

const ROOT = resolve(process.cwd());
const MUNI_PATH = resolve(ROOT, 'data/source/boundaries/bih_adm3_1990.geojson');
const TRANSFORM_PATH = resolve(ROOT, 'data/derived/georef/world_to_svg_transform.json');
const OUTPUT_PATH = resolve(ROOT, 'data/derived/municipalities_1990_boundaries.geojson');
const INDEX_PATH = resolve(ROOT, 'data/derived/data_index.json');

function sha256Hex(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

function projectPoint(lon: number, lat: number, tps: TpsParams): [number, number] | null {
  if (lon < 15 || lon > 20 || lat < 42 || lat > 46) return null;
  const [x, y] = applyTps(lon, lat, tps);
  if (isNaN(x) || isNaN(y) || Math.abs(x) > 10000 || Math.abs(y) > 10000) return null;
  return [parseFloat(x.toFixed(4)), parseFloat(y.toFixed(4))];
}

function projectRing(ring: number[][], tps: TpsParams): number[][] | null {
  const out: number[][] = [];
  for (const p of ring) {
    const pt = projectPoint(p[0], p[1], tps);
    if (pt) out.push(pt);
  }
  return out.length >= 2 ? out : null;
}

function main() {
  const muni = JSON.parse(readFileSync(MUNI_PATH, 'utf8')) as { features: Array<{ properties?: { mun1990_id?: string; mun1990_name?: string }; geometry?: { type: string; coordinates: unknown } }> };
  const transformRaw = JSON.parse(readFileSync(TRANSFORM_PATH, 'utf8'));
  const tps: TpsParams = transformRaw.coefficients ?? transformRaw;

  const features: Array<{ type: string; properties: Record<string, string>; geometry: { type: string; coordinates: number[][][] } }> = [];

  const sorted = [...(muni.features || [])].sort((a, b) =>
    String(a.properties?.mun1990_id ?? '').localeCompare(String(b.properties?.mun1990_id ?? '')));

  for (const f of sorted) {
    const mun1990Id = String(f.properties?.mun1990_id ?? '');
    const mun1990Name = String(f.properties?.mun1990_name ?? '');
    const geom = f.geometry;
    if (!geom?.coordinates) continue;

    const lines: number[][][] = [];
    if (geom.type === 'Polygon') {
      const ring = (geom.coordinates as number[][][])[0];
      if (ring) {
        const projected = projectRing(ring, tps);
        if (projected && projected.length >= 2) lines.push(projected);
      }
    } else if (geom.type === 'MultiPolygon') {
      for (const poly of geom.coordinates as number[][][][]) {
        const ring = poly[0];
        if (ring) {
          const projected = projectRing(ring, tps);
          if (projected && projected.length >= 2) lines.push(projected);
        }
      }
    }
    if (lines.length > 0) {
      features.push({
        type: 'Feature',
        properties: { mun1990_id: mun1990Id, mun1990_name: mun1990Name },
        geometry: { type: 'MultiLineString', coordinates: lines }
      });
    }
  }

  const fc = {
    type: 'FeatureCollection',
    features
  };
  const fcStr = JSON.stringify(fc);
  writeFileSync(OUTPUT_PATH, fcStr, 'utf8');
  const checksum = sha256Hex(fcStr);
  console.log(`Wrote ${OUTPUT_PATH}: ${features.length} municipality boundaries`);

  if (existsSync(INDEX_PATH)) {
    const index = JSON.parse(readFileSync(INDEX_PATH, 'utf8')) as Record<string, unknown>;
    const datasets = (index.datasets as Record<string, unknown>) ?? {};
    (datasets as Record<string, Record<string, unknown>>).municipalities_1990_boundaries = {
      path: 'municipalities_1990_boundaries.geojson',
      schema: 'awwv://schemas/mun1990_boundaries_v0.json',
      schema_version: '0.0.0',
      id_field: 'mun1990_id',
      geometry_type: 'MultiLineString',
      record_count: features.length,
      checksum_sha256: checksum,
      available: true
    };
    writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), 'utf8');
    console.log(`Updated ${INDEX_PATH}: municipalities_1990_boundaries available`);
  }
}

main();
