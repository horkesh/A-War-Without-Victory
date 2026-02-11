/**
 * Phase H6.10.0 — Build 1990 municipality overlays from post-1995 aggregation (census)
 *
 * PURPOSE:
 *   Define "1990 municipality overlay" by aggregating post-1995 municipalities via
 *   authoritative census settlement membership. E.g. Cazin(1990) = Cazin(post-1995) + Bužim(post-1995).
 *
 * INPUTS (must exist; STOP if missing):
 *   - data/derived/settlements_substrate.geojson
 *   - data/source/bih_census_1991.json
 *
 * OPTIONAL (do not fail if absent):
 *   - data/derived/settlement_names.json (for labeling; prefer if present)
 *
 * OUTPUTS (untracked debug, deterministic, no timestamps):
 *   - data/derived/_debug/mun1990_overlays_nw_h6_10_0.geojson
 *   - data/derived/_debug/mun1990_overlays_nw_h6_10_0.audit.json
 *   - data/derived/_debug/mun1990_overlays_nw_h6_10_0.audit.txt
 *
 * Scope (NW only): Bihać (1990), Cazin (1990) = Cazin(post-1995) ∪ Bužim(post-1995).
 *
 * Usage:
 *   npx tsx scripts/map/phase_h6_10_0_build_mun1990_overlays_from_post1995_aggregation.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { computeBboxFromFeatures } from './lib/awwv_contracts.js';
import { stripTimestampKeysForArtifacts } from '../../tools/engineering/determinism_guard.js';


const ROOT = resolve();
const DERIVED = resolve(ROOT, 'data/derived');
const SOURCE = resolve(ROOT, 'data/source');
const DEBUG_DIR = resolve(DERIVED, '_debug');

const SUBSTRATE_PATH = resolve(DERIVED, 'settlements_substrate.geojson');
const CENSUS_PATH = resolve(SOURCE, 'bih_census_1991.json');
const SETTLEMENT_NAMES_PATH = resolve(DERIVED, 'settlement_names.json');

const OVERLAY_PATH = resolve(DEBUG_DIR, 'mun1990_overlays_nw_h6_10_0.geojson');
const AUDIT_JSON_PATH = resolve(DEBUG_DIR, 'mun1990_overlays_nw_h6_10_0.audit.json');
const AUDIT_TXT_PATH = resolve(DEBUG_DIR, 'mun1990_overlays_nw_h6_10_0.audit.txt');

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

interface CensusMunicipality {
  n?: string;
  s?: string[];
  [key: string]: unknown;
}

interface CensusData {
  municipalities?: Record<string, CensusMunicipality>;
  [key: string]: unknown;
}

function polygonToMultiPolygonCoords(geom: { type: string; coordinates: Polygon | MultiPolygon }): Polygon[] {
  if (geom.type === 'Polygon' && geom.coordinates) return [geom.coordinates as Polygon];
  if (geom.type === 'MultiPolygon' && geom.coordinates) return geom.coordinates as MultiPolygon;
  return [];
}

function main(): void {
  if (!existsSync(SUBSTRATE_PATH)) {
    console.error('Missing input:', SUBSTRATE_PATH);
    process.exit(1);
  }
  if (!existsSync(CENSUS_PATH)) {
    console.error('Missing input:', CENSUS_PATH);
    process.exit(1);
  }

  const substrateContent = readFileSync(SUBSTRATE_PATH, 'utf8');
  const censusContent = readFileSync(CENSUS_PATH, 'utf8');
  const substrate = JSON.parse(substrateContent) as GeoJSONFC;
  const census = JSON.parse(censusContent) as CensusData;

  if (substrate.type !== 'FeatureCollection' || !Array.isArray(substrate.features)) {
    console.error('Invalid substrate: expected FeatureCollection with features array');
    process.exit(1);
  }

  const municipalities = census.municipalities;
  if (!municipalities || typeof municipalities !== 'object') {
    console.error('Census has no municipalities. STOP.');
    process.exit(1);
  }

  // Identify post-1995 municipalities by name from census (explicit lookup)
  let bihacCode: string | null = null;
  let cazinCode: string | null = null;
  let buzimCode: string | null = null;
  for (const [code, mun] of Object.entries(municipalities)) {
    if (!mun || !mun.n) continue;
    const n = String(mun.n);
    if (n === 'Bihać') bihacCode = code;
    if (n === 'Cazin') cazinCode = code;
    if (n === 'Bužim') buzimCode = code;
  }

  if (!bihacCode) {
    console.error('Bihać post-1995 municipality not found in census. STOP.');
    process.exit(1);
  }
  if (!cazinCode) {
    console.error('Cazin post-1995 municipality not found in census. STOP.');
    process.exit(1);
  }
  if (!buzimCode) {
    console.error('Bužim post-1995 municipality not found in census. STOP.');
    process.exit(1);
  }

  const bihacS = new Set<string>(municipalities[bihacCode].s || []);
  const cazinS = new Set<string>(municipalities[cazinCode].s || []);
  const buzimS = new Set<string>(municipalities[buzimCode].s || []);

  const bihac1990Set = new Set(bihacS);
  const cazin1990Set = new Set<string>([...cazinS, ...buzimS]);

  const compositeDefs: Array<{
    name: string;
    membersPost1995: string[];
    censusIdSet: Set<string>;
  }> = [
    {
      name: 'Bihać (1990)',
      membersPost1995: [municipalities[bihacCode].n || 'Bihać'],
      censusIdSet: bihac1990Set,
    },
    {
      name: 'Cazin (1990)',
      membersPost1995: [municipalities[cazinCode].n || 'Cazin', municipalities[buzimCode].n || 'Bužim'],
      censusIdSet: cazin1990Set,
    },
  ];

  const featuresOut: GeoJSONFeature[] = [];
  const auditPerOverlay: Record<
    string,
    { settlement_count: number; census_id_sample: string[]; bbox: [number, number, number, number] }
  > = {};

  for (const def of compositeDefs) {
    const memberFeatures: GeoJSONFeature[] = [];
    for (const f of substrate.features) {
      const censusId = f.properties?.census_id != null ? String(f.properties.census_id) : null;
      if (censusId == null || !def.censusIdSet.has(censusId)) continue;
      memberFeatures.push(f);
    }

    const polygons: Polygon[] = [];
    const censusIdSample: string[] = [];
    for (const f of memberFeatures) {
      const cid = f.properties?.census_id != null ? String(f.properties.census_id) : '';
      censusIdSample.push(cid);
      for (const poly of polygonToMultiPolygonCoords(f.geometry)) polygons.push(poly);
    }
    censusIdSample.sort((a, b) => a.localeCompare(b));
    const sample = censusIdSample.slice(0, 5);

    const bbox: [number, number, number, number] =
      memberFeatures.length > 0 ? computeBboxFromFeatures(memberFeatures) : [0, 0, 0, 0];

    auditPerOverlay[def.name] = {
      settlement_count: memberFeatures.length,
      census_id_sample: sample,
      bbox,
    };

    featuresOut.push({
      type: 'Feature',
      properties: {
        overlay_type: 'mun1990_composite',
        name: def.name,
        members_post1995: def.membersPost1995,
        settlement_count: memberFeatures.length,
      },
      geometry: {
        type: 'MultiPolygon',
        coordinates: polygons,
      },
    });
  }

  const fc: GeoJSONFC = { type: 'FeatureCollection', features: featuresOut };
  mkdirSync(DEBUG_DIR, { recursive: true });
  writeFileSync(OVERLAY_PATH, JSON.stringify(fc, null, 2), 'utf8');

  const auditPayload = stripTimestampKeysForArtifacts({
    phase: 'H6.10.0',
    overlay_path: 'mun1990_overlays_nw_h6_10_0.geojson',
    post1995_mun_codes: { Bihać: bihacCode, Cazin: cazinCode, Bužim: buzimCode },
    composite_definitions: compositeDefs.map((d) => ({
      name: d.name,
      members_post1995: d.membersPost1995,
      settlement_id_count: d.censusIdSet.size,
    })),
    by_overlay: auditPerOverlay,
    feature_count: featuresOut.length,
  }) as Record<string, unknown>;
  writeFileSync(AUDIT_JSON_PATH, JSON.stringify(auditPayload, null, 2), 'utf8');

  const lines = [
    'Phase H6.10.0 — 1990 composite overlays (NW: Bihać, Cazin = Cazin + Bužim)',
    '',
    `Post-1995 codes: Bihać=${bihacCode}, Cazin=${cazinCode}, Bužim=${buzimCode}`,
    `Feature count: ${featuresOut.length}`,
    '',
  ];
  for (const [name, a] of Object.entries(auditPerOverlay).sort(([x], [y]) => x.localeCompare(y))) {
    lines.push(`${name}: settlement_count=${a.settlement_count} bbox=[${a.bbox.join(', ')}]`);
  }
  writeFileSync(AUDIT_TXT_PATH, lines.join('\n'), 'utf8');

  process.stdout.write(`Wrote ${OVERLAY_PATH} (${featuresOut.length} features)\n`);
  process.stdout.write(`Wrote ${AUDIT_JSON_PATH}\n`);
  process.stdout.write(`Wrote ${AUDIT_TXT_PATH}\n`);
}

main();
