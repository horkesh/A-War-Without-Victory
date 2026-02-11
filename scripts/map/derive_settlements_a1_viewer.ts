/**
 * Extract settlement features from A1_BASE_MAP.geojson for map_viewer.
 *
 * PURPOSE: Map viewer expects settlement geometry in a single GeoJSON.
 *   A1_BASE_MAP has role='settlement' features (derived from WGS84).
 *   This script extracts them and updates data_index.json for map_viewer.
 *
 * INPUTS: data/derived/A1_BASE_MAP.geojson, data/derived/data_index.json
 * OUTPUTS: data/derived/settlements_a1_viewer.geojson, data/derived/data_index.json (patched)
 *
 * Determinism: stable sort by sid; canonical key order.
 * Usage: tsx scripts/map/derive_settlements_a1_viewer.ts
 *   or: npm run map:derive:settlements-a1-viewer
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = resolve(process.cwd());
const A1_PATH = resolve(ROOT, 'data/derived/A1_BASE_MAP.geojson');
const INDEX_PATH = resolve(ROOT, 'data/derived/data_index.json');
const OUTPUT_PATH = resolve(ROOT, 'data/derived/settlements_a1_viewer.geojson');

function sha256Hex(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

function main() {
  const a1 = JSON.parse(readFileSync(A1_PATH, 'utf8')) as { features: Array<{ properties?: { role?: string }; geometry?: unknown }> };
  const settlements = (a1.features ?? []).filter((f) => f.properties?.role === 'settlement');
  const sorted = settlements.slice().sort((a, b) => {
    const sa = String((a.properties as Record<string, unknown>)?.sid ?? '');
    const sb = String((b.properties as Record<string, unknown>)?.sid ?? '');
    return sa.localeCompare(sb);
  });

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const f of sorted) {
    const geom = f.geometry as { type?: string; coordinates?: unknown };
    if (!geom?.coordinates) continue;
    const visit = (pt: unknown) => {
      if (Array.isArray(pt) && typeof pt[0] === 'number' && typeof pt[1] === 'number') {
        const [x, y] = pt;
        if (Math.abs(x) < 10000 && Math.abs(y) < 10000) {
          minX = Math.min(minX, x); minY = Math.min(minY, y);
          maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
      }
    };
    if (geom.type === 'Polygon' && Array.isArray(geom.coordinates)) {
      (geom.coordinates as number[][][]).forEach((ring) => ring.forEach(visit));
    } else if (geom.type === 'MultiPolygon' && Array.isArray(geom.coordinates)) {
      (geom.coordinates as number[][][][]).forEach((p) => p.forEach((ring) => ring.forEach(visit)));
    }
  }
  const bbox = [minX === Infinity ? 0 : minX, minY === Infinity ? 0 : minY, maxX === -Infinity ? 1000 : maxX, maxY === -Infinity ? 1000 : maxY] as [number, number, number, number];

  const fc = {
    type: 'FeatureCollection',
    awwv_meta: {
      role: 'settlements_a1_viewer',
      source: 'A1_BASE_MAP.geojson',
      record_count: sorted.length,
      canonical_bbox: bbox,
    },
    features: sorted,
  };
  const fcStr = JSON.stringify(fc);
  writeFileSync(OUTPUT_PATH, fcStr, 'utf8');
  const checksum = sha256Hex(fcStr);
  console.log(`Wrote ${OUTPUT_PATH}: ${sorted.length} settlements`);

  if (existsSync(INDEX_PATH)) {
    const index = JSON.parse(readFileSync(INDEX_PATH, 'utf8')) as Record<string, unknown>;
    const datasets = (index.datasets as Record<string, unknown>) ?? {};
    const layers = (index.layers as Record<string, unknown>) ?? {};
    (datasets as Record<string, Record<string, unknown>>).settlements = {
      path: 'settlements_a1_viewer.geojson',
      schema: 'awwv://schemas/settlements_v0.json',
      schema_version: '0.0.0',
      id_field: 'sid',
      geometry_type: 'Polygon',
      record_count: sorted.length,
      checksum_sha256: checksum,
      available: true,
    };
    (datasets as Record<string, Record<string, unknown>>).settlements_viewer_v1 = {
      path: 'settlements_a1_viewer.geojson',
      schema: 'awwv://schemas/settlement_geometry_viewer_v1.json',
      schema_version: '1.0.0',
      id_field: 'sid',
      geometry_type: 'Polygon',
      type: 'geometry',
      record_count: sorted.length,
      checksum_sha256: checksum,
      available: true,
    };
    (index as Record<string, unknown>).coordinate_space = 'A1_TACTICAL';
    (index as Record<string, unknown>).canonical_bbox = bbox;
    const baseLayer = (layers as Record<string, Record<string, unknown>>).base_settlements;
    if (baseLayer) {
      baseLayer.preferred_datasets = ['settlements_viewer_v1', 'settlements'];
    }
    writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), 'utf8');
    console.log(`Updated ${INDEX_PATH}: settlements -> settlements_a1_viewer.geojson, bbox A1`);
  }
}

main();
