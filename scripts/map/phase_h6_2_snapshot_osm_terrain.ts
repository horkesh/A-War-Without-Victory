/**
 * Phase H6.2 — OSM terrain snapshot (roads + waterways).
 *
 * PURPOSE:
 *   Extracts roads and waterways from OSM PBF, clipped to Bosnia bbox (+margin).
 *   DATA ONLY. Deterministic. No simulation logic.
 *
 * INPUTS:
 *   - data/source/osm/bosnia-herzegovina-latest.osm.pbf
 *   - data/source/boundaries/bih_adm3_1990.geojson (for bbox)
 *
 * OUTPUTS:
 *   - data/derived/terrain/osm_roads_snapshot_h6_2.geojson (+ .gz)
 *   - data/derived/terrain/osm_waterways_snapshot_h6_2.geojson (+ .gz)
 *   - data/derived/terrain/osm_snapshot_audit_h6_2.json, .txt
 *
 * WHY EXECUTION MAY FAIL:
 *   - osmium (osmium-tool) not installed or not on PATH — preflight throws with install hint
 *   - OSM PBF or bih_adm3_1990.geojson missing — throws before extraction
 *
 * DO NOT: Consume terrain here. This script produces snapshots only. Downstream
 *         scalar derivation (e.g. H6.6) will consume outputs when implemented.
 *
 * Usage: tsx scripts/map/phase_h6_2_snapshot_osm_terrain.ts
 *   or: npm run map:snapshot:osm-terrain:h6_2
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, createWriteStream } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { computeSha256Hex } from './lib/awwv_contracts.js';
import { requireTools, OSMIUM_SPEC } from './_shared/toolchain_preflight.js';


const { results: toolchainResults } = requireTools([OSMIUM_SPEC]);

const ROOT = resolve();
const DERIVED = resolve(ROOT, 'data/derived');
const TERRAIN_DIR = resolve(DERIVED, 'terrain');
const BOUNDARIES_PATH = resolve(ROOT, 'data/source/boundaries/bih_adm3_1990.geojson');
const PBF_PATH = resolve(ROOT, 'data/source/osm/bosnia-herzegovina-latest.osm.pbf');
const MARGIN_DEG = 0.1;

// Excluded highway values (deterministic)
const HIGHWAY_EXCLUDE = new Set(['construction', 'proposed', 'steps']);
const WATERWAY_INCLUDE = new Set(['river', 'stream', 'canal', 'drain', 'ditch']);

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

function runOsmium(args: string[], cwd: string = ROOT): { ok: boolean; stdout: Buffer; stderr: Buffer } {
  const r = spawnSync('osmium', args, { cwd, encoding: 'buffer', timeout: 300_000 });
  return { ok: r.status === 0, stdout: r.stdout ?? Buffer.alloc(0), stderr: r.stderr ?? Buffer.alloc(0) };
}

function bboxIntersects(bbox: BBox, coords: number[][]): boolean {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of coords) {
    if (p.length >= 2) {
      minX = Math.min(minX, p[0]);
      minY = Math.min(minY, p[1]);
      maxX = Math.max(maxX, p[0]);
      maxY = Math.max(maxY, p[1]);
    }
  }
  return !(maxX < bbox[0] || minX > bbox[2] || maxY < bbox[1] || minY > bbox[3]);
}

function getCoords(geom: { type: string; coordinates: unknown }): number[][] {
  const c = geom.coordinates;
  if (!Array.isArray(c)) return [];
  if (geom.type === 'LineString') return c as number[][];
  if (geom.type === 'MultiLineString') return (c as number[][][]).flat();
  return [];
}

interface OsmFeature {
  type: string;
  properties?: Record<string, unknown>;
  geometry?: { type: string; coordinates: unknown };
}

function extractRoads(bbox: BBox): { features: OsmFeature[]; tooling: string } {
  const tempDir = resolve(TERRAIN_DIR, '_tmp');
  if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });
  const extractedPbf = resolve(tempDir, 'extracted.pbf');
  const roadsPbf = resolve(tempDir, 'roads.pbf');
  const roadsGeojson = resolve(tempDir, 'roads_raw.geojson');

  const [minLon, minLat, maxLon, maxLat] = bbox;
  const bboxStr = `${minLon},${minLat},${maxLon},${maxLat}`;

  const ext = runOsmium(['extract', '--bbox', bboxStr, PBF_PATH, '-o', extractedPbf, '-O']);
  if (!ext.ok) {
    const err = ext.stderr.toString('utf8') || ext.stdout.toString('utf8');
    throw new Error(`osmium extract failed. Is osmium installed? Run: osmium --version\n${err}`);
  }

  const tf = runOsmium(['tags-filter', extractedPbf, 'w/highway', '-o', roadsPbf, '-O']);
  if (!tf.ok) {
    const err = tf.stderr.toString('utf8') || tf.stdout.toString('utf8');
    throw new Error(`osmium tags-filter (highways) failed\n${err}`);
  }

  const exp = runOsmium(['export', '-f', 'geojson', '-a', 'id', '-o', roadsGeojson, '-O', roadsPbf]);
  if (!exp.ok) {
    const err = exp.stderr.toString('utf8') || exp.stdout.toString('utf8');
    throw new Error(`osmium export (roads) failed\n${err}`);
  }

  const raw = JSON.parse(readFileSync(roadsGeojson, 'utf8')) as { features?: OsmFeature[] };
  const all = raw.features ?? [];

  const features: OsmFeature[] = [];
  for (const f of all) {
    const hw = f.properties?.highway;
    if (typeof hw === 'string' && HIGHWAY_EXCLUDE.has(hw)) continue;
    const geom = f.geometry;
    if (!geom || (geom.type !== 'LineString' && geom.type !== 'MultiLineString')) continue;
    const coords = getCoords(geom);
    if (coords.length < 2) continue;
    if (!bboxIntersects(bbox, coords)) continue;

    const osmId = f.properties?.['@id'] ?? f.properties?.id ?? f.properties?.osm_id;
    const idStr = osmId != null ? String(osmId) : '';
    features.push({
      type: 'Feature',
      properties: {
        osm_id: idStr,
        highway: typeof hw === 'string' ? hw : null,
        name: f.properties?.name ?? null,
        ref: f.properties?.ref ?? null,
        bridge: f.properties?.bridge ?? null,
        tunnel: f.properties?.tunnel ?? null,
        oneway: f.properties?.oneway ?? null,
        surface: f.properties?.surface ?? null,
        maxspeed: f.properties?.maxspeed ?? null,
        layer: f.properties?.layer ?? null,
        source: 'osm',
      },
      geometry: geom,
    });
  }

  features.sort((a, b) => {
    const na = parseInt(String(a.properties?.osm_id || ''), 10);
    const nb = parseInt(String(b.properties?.osm_id || ''), 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return String(a.properties?.osm_id || '').localeCompare(String(b.properties?.osm_id || ''));
  });

  unlinkSync(extractedPbf);
  unlinkSync(roadsPbf);
  unlinkSync(roadsGeojson);

  return { features, tooling: 'osmium (extract, tags-filter, export)' };
}

function extractWaterways(bbox: BBox): { features: OsmFeature[]; tooling: string } {
  const tempDir = resolve(TERRAIN_DIR, '_tmp');
  const extractedPbf = resolve(tempDir, 'extracted.pbf');
  const waterPbf = resolve(tempDir, 'waterways.pbf');
  const waterGeojson = resolve(tempDir, 'waterways_raw.geojson');

  const [minLon, minLat, maxLon, maxLat] = bbox;
  const bboxStr = `${minLon},${minLat},${maxLon},${maxLat}`;

  const ext = runOsmium(['extract', '--bbox', bboxStr, PBF_PATH, '-o', extractedPbf, '-O']);
  if (!ext.ok) throw new Error('osmium extract failed (waterways)');

  const tf = runOsmium(['tags-filter', extractedPbf, 'w/waterway=river,stream,canal,drain,ditch', '-o', waterPbf, '-O']);
  if (!tf.ok) throw new Error('osmium tags-filter (waterways) failed');

  const exp = runOsmium(['export', '-f', 'geojson', '-a', 'id', '-o', waterGeojson, '-O', waterPbf]);
  if (!exp.ok) throw new Error('osmium export (waterways) failed');

  const raw = JSON.parse(readFileSync(waterGeojson, 'utf8')) as { features?: OsmFeature[] };
  const all = raw.features ?? [];

  const features: OsmFeature[] = [];
  for (const f of all) {
    const ww = f.properties?.waterway;
    if (typeof ww !== 'string' || !WATERWAY_INCLUDE.has(ww)) continue;
    const geom = f.geometry;
    if (!geom || (geom.type !== 'LineString' && geom.type !== 'MultiLineString')) continue;
    const coords = getCoords(geom);
    if (coords.length < 2) continue;
    if (!bboxIntersects(bbox, coords)) continue;

    const osmId = f.properties?.['@id'] ?? f.properties?.id ?? f.properties?.osm_id;
    const idStr = osmId != null ? String(osmId) : '';
    features.push({
      type: 'Feature',
      properties: {
        osm_id: idStr,
        waterway: ww,
        name: f.properties?.name ?? null,
        tunnel: f.properties?.tunnel ?? null,
        intermittent: f.properties?.intermittent ?? null,
        source: 'osm',
      },
      geometry: geom,
    });
  }

  features.sort((a, b) => {
    const na = parseInt(String(a.properties?.osm_id || ''), 10);
    const nb = parseInt(String(b.properties?.osm_id || ''), 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return String(a.properties?.osm_id || '').localeCompare(String(b.properties?.osm_id || ''));
  });

  unlinkSync(extractedPbf);
  unlinkSync(waterPbf);
  unlinkSync(waterGeojson);

  return { features, tooling: 'osmium (extract, tags-filter, export)' };
}

function buildRoadsGeoJSON(bbox: BBox, features: OsmFeature[], pbfPath: string) {
  const awwvMetaEmpty = {
    role: 'terrain_osm_roads_snapshot',
    version: 'h6_2',
    bbox_world: bbox,
    feature_count: features.length,
    source_files: [pbfPath],
    filter_spec: { highway_include: 'any', highway_exclude: [...HIGHWAY_EXCLUDE], geometry_types: ['LineString', 'MultiLineString'] },
    checksum_sha256: '',
  };
  const fc = { type: 'FeatureCollection' as const, awwv_meta: { ...awwvMetaEmpty }, features };
  const contentJson = JSON.stringify(fc, null, 2);
  const contentSha = computeSha256Hex(Buffer.from(contentJson, 'utf8'));
  (fc.awwv_meta as Record<string, string>).checksum_sha256 = contentSha;
  return { fc, contentSha };
}

function buildWaterwaysGeoJSON(bbox: BBox, features: OsmFeature[], pbfPath: string) {
  const awwvMetaEmpty = {
    role: 'terrain_osm_waterways_snapshot',
    version: 'h6_2',
    bbox_world: bbox,
    feature_count: features.length,
    source_files: [pbfPath],
    filter_spec: { waterway_include: [...WATERWAY_INCLUDE], geometry_types: ['LineString', 'MultiLineString'] },
    checksum_sha256: '',
  };
  const fc = { type: 'FeatureCollection' as const, awwv_meta: { ...awwvMetaEmpty }, features };
  const contentJson = JSON.stringify(fc, null, 2);
  const contentSha = computeSha256Hex(Buffer.from(contentJson, 'utf8'));
  (fc.awwv_meta as Record<string, string>).checksum_sha256 = contentSha;
  return { fc, contentSha };
}

async function main(): Promise<void> {
  if (!existsSync(PBF_PATH)) {
    throw new Error(`OSM PBF not found: ${PBF_PATH}`);
  }
  if (!existsSync(BOUNDARIES_PATH)) {
    throw new Error(`Boundaries not found: ${BOUNDARIES_PATH}`);
  }

  const baseBbox = computeBboxFromAdm3();
  const bbox = expandBbox(baseBbox, MARGIN_DEG);

  if (!existsSync(TERRAIN_DIR)) mkdirSync(TERRAIN_DIR, { recursive: true });
  const tempDir = resolve(TERRAIN_DIR, '_tmp');
  if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });

  const roadsResult = extractRoads(bbox);
  const waterwaysResult = extractWaterways(bbox);

  const relPbf = 'data/source/osm/bosnia-herzegovina-latest.osm.pbf';
  const roadsOut = buildRoadsGeoJSON(bbox, roadsResult.features, relPbf);
  const waterwaysOut = buildWaterwaysGeoJSON(bbox, waterwaysResult.features, relPbf);

  const roadsPath = resolve(TERRAIN_DIR, 'osm_roads_snapshot_h6_2.geojson');
  const roadsGzPath = resolve(TERRAIN_DIR, 'osm_roads_snapshot_h6_2.geojson.gz');
  const waterwaysPath = resolve(TERRAIN_DIR, 'osm_waterways_snapshot_h6_2.geojson');
  const waterwaysGzPath = resolve(TERRAIN_DIR, 'osm_waterways_snapshot_h6_2.geojson.gz');

  const roadsJson = JSON.stringify(roadsOut.fc, null, 2);
  const waterwaysJson = JSON.stringify(waterwaysOut.fc, null, 2);

  writeFileSync(roadsPath, roadsJson, 'utf8');
  writeFileSync(waterwaysPath, waterwaysJson, 'utf8');

  const roadsBytes = Buffer.from(roadsJson, 'utf8');
  const waterwaysBytes = Buffer.from(waterwaysJson, 'utf8');
  const roadsFileSha = computeSha256Hex(roadsBytes);
  const waterwaysFileSha = computeSha256Hex(waterwaysBytes);

  await pipeline(Readable.from([roadsJson]), createGzip(), createWriteStream(roadsGzPath));
  await pipeline(Readable.from([waterwaysJson]), createGzip(), createWriteStream(waterwaysGzPath));

  const roadsGzSha = computeSha256Hex(readFileSync(roadsGzPath));
  const waterwaysGzSha = computeSha256Hex(readFileSync(waterwaysGzPath));

  const roadsByHighway: Record<string, number> = {};
  for (const f of roadsResult.features) {
    const hw = String(f.properties?.highway ?? 'other');
    roadsByHighway[hw] = (roadsByHighway[hw] ?? 0) + 1;
  }
  const hwEntries = Object.entries(roadsByHighway).sort((a, b) => b[1] - a[1]);
  const top30 = Object.fromEntries(hwEntries.slice(0, 30));
  const otherCount = hwEntries.slice(30).reduce((s, [, v]) => s + v, 0);
  if (otherCount > 0) (top30 as Record<string, number>).other = otherCount;

  const waterwaysByType: Record<string, number> = {};
  for (const f of waterwaysResult.features) {
    const ww = String(f.properties?.waterway ?? 'unknown');
    waterwaysByType[ww] = (waterwaysByType[ww] ?? 0) + 1;
  }

  const roadsWithName = roadsResult.features.filter(f => f.properties?.name != null && f.properties.name !== '').length;
  const roadsWithRef = roadsResult.features.filter(f => f.properties?.ref != null && f.properties.ref !== '').length;
  const roadsWithMaxspeed = roadsResult.features.filter(f => f.properties?.maxspeed != null && f.properties.maxspeed !== '').length;
  const waterWithName = waterwaysResult.features.filter(f => f.properties?.name != null && f.properties.name !== '').length;

  const audit = {
    bbox_world: bbox,
    counts: {
      roads_total: roadsResult.features.length,
      roads_by_highway: top30,
      waterways_total: waterwaysResult.features.length,
      waterways_by_type: waterwaysByType,
    },
    tag_coverage: {
      roads_name_pct: roadsResult.features.length ? Math.round((1000 * roadsWithName) / roadsResult.features.length) / 10 : 0,
      roads_ref_pct: roadsResult.features.length ? Math.round((1000 * roadsWithRef) / roadsResult.features.length) / 10 : 0,
      roads_maxspeed_pct: roadsResult.features.length ? Math.round((1000 * roadsWithMaxspeed) / roadsResult.features.length) / 10 : 0,
      waterways_name_pct: waterwaysResult.features.length ? Math.round((1000 * waterWithName) / waterwaysResult.features.length) / 10 : 0,
    },
    sha256: {
      osm_roads_geojson: roadsFileSha,
      osm_roads_geojson_gz: roadsGzSha,
      osm_waterways_geojson: waterwaysFileSha,
      osm_waterways_geojson_gz: waterwaysGzSha,
    },
    content_checksum_sha256: {
      osm_roads: roadsOut.contentSha,
      osm_waterways: waterwaysOut.contentSha,
    },
    runtime: { tooling: roadsResult.tooling },
    toolchain: { tools: toolchainResults },
  };

  writeFileSync(resolve(TERRAIN_DIR, 'osm_snapshot_audit_h6_2.json'), JSON.stringify(audit, null, 2), 'utf8');
  const txtLines = [
    'OSM Terrain Snapshot H6.2 Audit',
    `bbox_world: ${bbox.join(', ')}`,
    `roads_total: ${audit.counts.roads_total}`,
    `roads_by_highway (top 30): ${JSON.stringify(audit.counts.roads_by_highway)}`,
    `waterways_total: ${audit.counts.waterways_total}`,
    `waterways_by_type: ${JSON.stringify(audit.counts.waterways_by_type)}`,
    `tag_coverage: ${JSON.stringify(audit.tag_coverage)}`,
    `sha256 roads geojson: ${audit.sha256.osm_roads_geojson}`,
    `sha256 roads gz: ${audit.sha256.osm_roads_geojson_gz}`,
    `sha256 waterways geojson: ${audit.sha256.osm_waterways_geojson}`,
    `sha256 waterways gz: ${audit.sha256.osm_waterways_geojson_gz}`,
    `content_checksum roads: ${audit.content_checksum_sha256.osm_roads}`,
    `content_checksum waterways: ${audit.content_checksum_sha256.osm_waterways}`,
    `tooling: ${audit.runtime.tooling}`,
  ];
  writeFileSync(resolve(TERRAIN_DIR, 'osm_snapshot_audit_h6_2.txt'), txtLines.join('\n'), 'utf8');

  console.log('Phase H6.2 OSM snapshot done.');
  console.log('  Roads:', roadsResult.features.length);
  console.log('  Waterways:', waterwaysResult.features.length);
  console.log('  Outputs:', roadsPath, waterwaysPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
