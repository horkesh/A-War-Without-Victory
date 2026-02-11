/**
 * Phase H6.10.11 — Extract legacy NW bbox table from legacy substrate (if present)
 *
 * PURPOSE:
 *   Build a deterministic bbox table for NW post-1995 municipality ids from a
 *   legacy/authoritative substrate so the derive script can use legacy-anchored
 *   chooser instead of topology fallback (which compares mixed coordinate spaces).
 *
 * INPUTS:
 *   - Legacy substrate at first existing path:
 *     data/source/settlements_substrate.geojson
 *     data/derived/_legacy_master_substrate/settlements_substrate.geojson
 *
 * OUTPUTS (untracked, deterministic, no timestamps):
 *   - data/derived/_debug/legacy_nw_bboxes_h6_10_11.json
 *   - data/derived/_debug/legacy_nw_bboxes_h6_10_11.txt
 *
 * NW mun1990 ids: 10049 Bihać, 10227 Cazin, 11240 Bužim, 11118 Velika Kladuša.
 * If legacy file is missing, exits with message; does not write. If any of the
 * four have zero features, that is recorded clearly (we do not invent bboxes).
 *
 * Usage:
 *   npx tsx scripts/map/phase_h6_10_11_extract_legacy_nw_bboxes.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';



const ROOT = resolve();
const DERIVED = resolve(ROOT, 'data/derived');
const DEBUG_DIR = resolve(DERIVED, '_debug');
const SOURCE_PATH = resolve(ROOT, 'data/source/settlements_substrate.geojson');
const LEGACY_PATH = resolve(DERIVED, '_legacy_master_substrate/settlements_substrate.geojson');

const NW_MUN_IDS = ['10049', '10227', '11240', '11118'] as const;
const NW_MUN_LABELS: Record<string, string> = {
  '10049': 'Bihać',
  '10227': 'Cazin',
  '11240': 'Bužim',
  '11118': 'Velika Kladuša'
};

type Point = [number, number];
type Ring = Point[];
type Polygon = Ring[];
type MultiPolygon = Polygon[];

interface GeoJSONFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: Polygon | MultiPolygon };
}

interface GeoJSONFC {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

function bboxFromCoords(coords: Polygon | MultiPolygon): [number, number, number, number] {
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  const rings: Ring[] = coords.length > 0 && typeof (coords as Polygon)[0][0]?.[0] === 'number'
    ? (coords as Polygon)
    : (coords as MultiPolygon).flat();
  for (const ring of rings) {
    for (const pt of ring) {
      if (isFinite(pt[0]) && isFinite(pt[1])) {
        minx = Math.min(minx, pt[0]);
        miny = Math.min(miny, pt[1]);
        maxx = Math.max(maxx, pt[0]);
        maxy = Math.max(maxy, pt[1]);
      }
    }
  }
  return [minx, miny, maxx, maxy];
}

function main(): void {
  const legacyPath = existsSync(SOURCE_PATH) ? SOURCE_PATH : (existsSync(LEGACY_PATH) ? LEGACY_PATH : null);
  if (!legacyPath) {
    process.stdout.write(`No legacy substrate found at ${SOURCE_PATH} or ${LEGACY_PATH}; skipping extract.\n`);
    process.exit(0);
  }

  const raw = readFileSync(legacyPath, 'utf8');
  const fc = JSON.parse(raw) as GeoJSONFC;
  if (fc.type !== 'FeatureCollection' || !Array.isArray(fc.features)) {
    process.stderr.write('Invalid GeoJSON: expected FeatureCollection with features\n');
    process.exit(1);
  }

  const byMun: Record<string, [number, number, number, number]> = {};
  const featureCount: Record<string, number> = {};
  for (const id of NW_MUN_IDS) {
    featureCount[id] = 0;
  }

  for (const f of fc.features) {
    const mid = f.properties?.municipality_id as string | undefined;
    if (!mid || !NW_MUN_IDS.includes(mid as typeof NW_MUN_IDS[number])) continue;
    const coords = f.geometry?.coordinates;
    if (!coords) continue;
    featureCount[mid] = (featureCount[mid] ?? 0) + 1;
    const bbox = bboxFromCoords(coords as Polygon | MultiPolygon);
    const existing = byMun[mid];
    if (existing) {
      byMun[mid] = [
        Math.min(existing[0], bbox[0]),
        Math.min(existing[1], bbox[1]),
        Math.max(existing[2], bbox[2]),
        Math.max(existing[3], bbox[3])
      ];
    } else {
      byMun[mid] = bbox;
    }
  }

  const payload: Record<string, unknown> = {
    phase: 'H6.10.11',
    source_path: legacyPath,
    nw_mun_ids: [...NW_MUN_IDS],
    bboxes: {} as Record<string, number[]>,
    feature_counts: featureCount,
    missing_or_zero: [] as string[]
  };

  for (const id of NW_MUN_IDS) {
    if (featureCount[id] === 0 || !byMun[id]) {
      (payload.missing_or_zero as string[]).push(id);
    } else {
      const b = byMun[id]!;
      (payload.bboxes as Record<string, number[]>)[id] = b.map(x => Math.round(x * 1000) / 1000);
    }
  }

  mkdirSync(DEBUG_DIR, { recursive: true });
  const jsonPath = resolve(DEBUG_DIR, 'legacy_nw_bboxes_h6_10_11.json');
  const txtPath = resolve(DEBUG_DIR, 'legacy_nw_bboxes_h6_10_11.txt');

  writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf8');

  const lines = [
    'Phase H6.10.11 — Legacy NW bbox extraction',
    '',
    `Source: ${legacyPath}`,
    '',
    'Feature counts and bboxes (sorted by mun id):',
    ...NW_MUN_IDS.map(id => {
      const n = featureCount[id] ?? 0;
      const label = NW_MUN_LABELS[id] ?? id;
      const b = byMun[id];
      if (n === 0 || !b) return `  ${id} ${label}: 0 features (no bbox)`;
      return `  ${id} ${label}: ${n} features, bbox=[${b.map(x => x.toFixed(3)).join(', ')}]`;
    }),
    '',
    'Missing or zero features: ' + (payload.missing_or_zero as string[]).join(', ') || 'none'
  ];
  writeFileSync(txtPath, lines.join('\n'), 'utf8');

  process.stdout.write(`Wrote ${jsonPath}\n`);
  process.stdout.write(`Wrote ${txtPath}\n`);
}

main();
