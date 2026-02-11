/**
 * Build settlement attributes (WGS84) from census rollup + optional terrain scalars.
 *
 * PURPOSE: Single enrichment artifact per SETTLEMENT_ATTRIBUTES_WGS84 spec.
 *   Population and ethnicity from census_rolled_up_wgs84; slope/river/road from
 *   terrain scalars (DEM/OSM-derived) when present.
 *
 * INPUTS:
 *   - data/derived/settlements_wgs84_1990.geojson (authoritative sid list)
 *   - data/derived/census_rolled_up_wgs84.json (by_sid: n, m, p)
 *   - data/derived/terrain/settlements_terrain_scalars.json (optional; by_sid terrain)
 *
 * OUTPUT:
 *   - data/derived/settlement_attributes_wgs84.json
 *
 * Determinism: stable sid sort; canonical key order; no timestamps/randomness.
 * Usage: tsx scripts/map/build_settlement_attributes_wgs84.ts
 *   or: npm run map:build:settlement-attributes:wgs84
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const WGS84_PATH = resolve(ROOT, 'data/derived/settlements_wgs84_1990.geojson');
const CENSUS_PATH = resolve(ROOT, 'data/derived/census_rolled_up_wgs84.json');
const TERRAIN_PATH = resolve(ROOT, 'data/derived/terrain/settlements_terrain_scalars.json');
const OUTPUT_PATH = resolve(ROOT, 'data/derived/settlement_attributes_wgs84.json');

interface CensusRecord {
  n: string;
  m: string;
  p: number[];
}

interface TerrainRecord {
  road_access_index?: number;
  river_crossing_penalty?: number;
  elevation_mean_m?: number;
  elevation_stddev_m?: number;
  slope_index?: number;
  terrain_friction_index?: number;
}

function main() {
  const geojson = JSON.parse(readFileSync(WGS84_PATH, 'utf8')) as { features?: Array<{ properties?: { sid?: string } }> };
  const census = JSON.parse(readFileSync(CENSUS_PATH, 'utf8')) as { by_sid: Record<string, CensusRecord> };
  const features = geojson.features ?? [];

  const sids = features
    .map((f, i) => ((f.properties ?? {}).sid ?? '').trim() || `_idx_${i}`)
    .sort((a, b) => a.localeCompare(b));

  let terrainBySid: Record<string, TerrainRecord> = {};
  if (existsSync(TERRAIN_PATH)) {
    const terrain = JSON.parse(readFileSync(TERRAIN_PATH, 'utf8')) as { by_sid?: Record<string, TerrainRecord> };
    terrainBySid = terrain.by_sid ?? {};
  }

  const bySid: Record<string, Record<string, unknown>> = {};
  for (const sid of sids) {
    const rec = census.by_sid?.[sid] as CensusRecord | undefined;
    const n = rec?.n ?? '';
    const m = rec?.m ?? '';
    const p = Array.isArray(rec?.p) ? rec.p : [0, 0, 0, 0, 0];
    const population_total = typeof p[0] === 'number' ? p[0] : p.reduce((a, b) => a + b, 0);

    const out: Record<string, unknown> = {
      sid,
      n,
      m,
      p,
      population_total: Number(population_total)
    };

    const tr = terrainBySid[sid];
    if (tr) {
      if (typeof tr.slope_index === 'number') out.slope_index = Math.round(tr.slope_index * 1000) / 1000;
      if (typeof tr.road_access_index === 'number') out.road_access_index = Math.round(tr.road_access_index * 1000) / 1000;
      if (typeof tr.river_crossing_penalty === 'number') out.river_crossing_penalty = Math.round(tr.river_crossing_penalty * 1000) / 1000;
      if (typeof tr.elevation_mean_m === 'number') out.elevation_mean_m = Math.round(tr.elevation_mean_m * 10) / 10;
      if (typeof tr.elevation_stddev_m === 'number') out.elevation_stddev_m = Math.round(tr.elevation_stddev_m * 10) / 10;
      if (typeof tr.terrain_friction_index === 'number') out.terrain_friction_index = Math.round(tr.terrain_friction_index * 1000) / 1000;
    }

    bySid[sid] = out;
  }

  const payload = {
    schema_version: '1',
    source_geojson: 'data/derived/settlements_wgs84_1990.geojson',
    source_census: 'data/derived/census_rolled_up_wgs84.json',
    source_terrain: existsSync(TERRAIN_PATH) ? 'data/derived/terrain/settlements_terrain_scalars.json' : null,
    record_count: sids.length,
    by_sid: bySid
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Wrote ${OUTPUT_PATH}: ${sids.length} settlements`);
}

main();
