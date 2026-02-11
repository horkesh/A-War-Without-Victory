/**
 * Phase H6.10.4 — Encode NW ordering invariants (Bihać/Cazin/Bužim/Velika Kladuša) and prove which mapping is wrong
 *
 * PURPOSE:
 *   Turn geographic truth into deterministic invariants and check whether the substrate's
 *   municipality_id tagging and/or census→geometry relationship violates those invariants.
 *
 * INVARIANTS (substrate coords, y increasing downward = north is smaller y):
 *   - Cazin north of Bihać:      cy(Cazin) < cy(Bihać)
 *   - Velika Kladuša north of Cazin: cy(VK) < cy(Cazin)
 *   - Bužim east of Cazin:      cx(Bužim) > cx(Cazin)
 *   - Bužim north of Bihać:     cy(Bužim) < cy(Bihać)
 *   - Bužim south of VK:        cy(Bužim) > cy(VK)
 *
 * INPUTS:
 *   - data/derived/settlements_substrate.geojson
 *   - data/source/bih_census_1991.json (for VK code resolution by name)
 *
 * OUTPUTS (untracked, data/derived/_debug/):
 *   - nw_ordering_invariants_h6_10_4.txt
 *   - nw_ordering_invariants_h6_10_4.json
 *   - nw_ordering_invariants_overlay_h6_10_4.geojson
 *
 * Usage:
 *   npx tsx scripts/map/phase_h6_10_4_check_nw_ordering_invariants.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { computeBboxFromFeatures, computeSha256Hex } from './lib/awwv_contracts.js';


const ROOT = resolve();
const DERIVED = resolve(ROOT, 'data/derived');
const SOURCE = resolve(ROOT, 'data/source');
const DEBUG_DIR = resolve(DERIVED, '_debug');

const SUBSTRATE_PATH = resolve(DERIVED, 'settlements_substrate.geojson');
const CENSUS_PATH = resolve(SOURCE, 'bih_census_1991.json');

const TARGET_CODES = ['10049', '10227', '11240'] as const; // Bihać, Cazin, Bužim
const VK_NAME_PATTERNS = ['velika kladuša', 'velika kladusa'];

type Point = [number, number];
type Ring = Point[];
type Polygon = Ring[];
type MultiPolygon = Polygon[];

interface SubstrateFeature {
  type: 'Feature';
  properties: {
    municipality_id?: string | number | null;
    [key: string]: unknown;
  };
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: Polygon | MultiPolygon };
}

interface GeoJSONFC {
  type: 'FeatureCollection';
  features: SubstrateFeature[];
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

function bboxFromCoords(coords: Polygon | MultiPolygon): { minx: number; miny: number; maxx: number; maxy: number } {
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  const processRing = (ring: Ring) => {
    for (const pt of ring) {
      if (!Array.isArray(pt) || pt.length < 2) continue;
      const [x, y] = pt;
      if (!isFinite(x) || !isFinite(y)) continue;
      minx = Math.min(minx, x); miny = Math.min(miny, y);
      maxx = Math.max(maxx, x); maxy = Math.max(maxy, y);
    }
  };
  const d00 = coords[0] && (coords[0] as Ring[])[0];
  const isMulti = d00 && Array.isArray((d00 as Ring)[0]);
  if (isMulti) {
    for (const poly of coords as MultiPolygon)
      for (const ring of poly) processRing(ring);
  } else {
    for (const ring of coords as Polygon) processRing(ring);
  }
  if (!isFinite(minx)) return { minx: 0, miny: 0, maxx: 0, maxy: 0 };
  return { minx, miny, maxx, maxy };
}

function bboxCenter(bbox: { minx: number; miny: number; maxx: number; maxy: number }): [number, number] {
  return [(bbox.minx + bbox.maxx) / 2, (bbox.miny + bbox.maxy) / 2];
}

/** Normalize for name match: lowercase, strip common diacritics */
function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

/** Resolve Velika Kladuša code from census by name (case/diacritics insensitive). */
function resolveVelikaKladusaCode(census: CensusData): { code: string; matchedName: string } | { error: string } {
  const municipalities = census.municipalities || {};
  const normalizedTargets = VK_NAME_PATTERNS.map(normalizeName);
  const candidates: { code: string; name: string }[] = [];
  for (const [code, mun] of Object.entries(municipalities)) {
    const name = mun.n;
    if (!name || typeof name !== 'string') continue;
    const norm = normalizeName(name);
    if (normalizedTargets.some(t => norm === t)) {
      candidates.push({ code, name });
    }
  }
  if (candidates.length === 0) {
    return { error: 'No municipality matched "Velika Kladuša" / "Velika Kladusa". Census keys sampled: ' + Object.keys(municipalities).slice(0, 20).join(', ') + '...' };
  }
  if (candidates.length > 1) {
    return {
      error: 'Multiple matches for Velika Kladuša. Candidates: ' + candidates.map(c => `${c.code} (${c.name})`).join('; '),
    };
  }
  return { code: candidates[0].code, matchedName: candidates[0].name };
}

type InvRole = 'bihac' | 'cazin' | 'buzim' | 'vk';

interface MunInfo {
  code: string;
  name: string;
  inv_role: InvRole;
  feature_count: number;
  bbox: { minx: number; miny: number; maxx: number; maxy: number };
  centroid: [number, number];
  missing: boolean;
}

interface InvariantResult {
  id: string;
  description: string;
  pass: boolean;
  value_left: number;
  value_right: number;
  relation: string;
  cannot_evaluate: boolean;
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

  mkdirSync(DEBUG_DIR, { recursive: true });

  const substrateBytes = readFileSync(SUBSTRATE_PATH);
  const substrateSha = computeSha256Hex(substrateBytes);
  const substrate = JSON.parse(substrateBytes.toString('utf8')) as GeoJSONFC;
  const features = substrate.features || [];
  const globalBbox = computeBboxFromFeatures(features);

  const censusBytes = readFileSync(CENSUS_PATH);
  const censusSha = computeSha256Hex(censusBytes);
  const census = JSON.parse(censusBytes.toString('utf8')) as CensusData;

  const vkResolution = resolveVelikaKladusaCode(census);
  let vkCode: string;
  let vkMatchedName: string;
  if ('error' in vkResolution) {
    console.error('VK resolution failed:', vkResolution.error);
    process.exit(1);
  }
  vkCode = vkResolution.code;
  vkMatchedName = vkResolution.matchedName;

  const nameByCode: Record<string, string> = {
    '10049': 'Bihać',
    '10227': 'Cazin',
    '11240': 'Bužim',
    [vkCode]: vkMatchedName,
  };

  const buckets = new Map<string, { bbox: { minx: number; miny: number; maxx: number; maxy: number }; count: number }>();
  for (const f of features) {
    const mid = f.properties.municipality_id != null ? String(f.properties.municipality_id) : '';
    if (!mid) continue;
    let bucket = buckets.get(mid);
    if (!bucket) {
      bucket = { bbox: { minx: Infinity, miny: Infinity, maxx: -Infinity, maxy: -Infinity }, count: 0 };
      buckets.set(mid, bucket);
    }
    bucket.count++;
    const b = bboxFromCoords(f.geometry.coordinates);
    bucket.bbox.minx = Math.min(bucket.bbox.minx, b.minx);
    bucket.bbox.miny = Math.min(bucket.bbox.miny, b.miny);
    bucket.bbox.maxx = Math.max(bucket.bbox.maxx, b.maxx);
    bucket.bbox.maxy = Math.max(bucket.bbox.maxy, b.maxy);
  }

  const allCodes = [...TARGET_CODES, vkCode];
  const munInfos: MunInfo[] = [];
  for (const code of allCodes) {
    const bucket = buckets.get(code);
    const inv_role: InvRole = code === '10049' ? 'bihac' : code === '10227' ? 'cazin' : code === '11240' ? 'buzim' : 'vk';
    const name = nameByCode[code] ?? code;
    if (!bucket) {
      munInfos.push({
        code,
        name,
        inv_role,
        feature_count: 0,
        bbox: { minx: 0, miny: 0, maxx: 0, maxy: 0 },
        centroid: [0, 0],
        missing: true,
      });
      continue;
    }
    const centroid = bboxCenter(bucket.bbox);
    munInfos.push({
      code,
      name,
      inv_role,
      feature_count: bucket.count,
      bbox: bucket.bbox,
      centroid,
      missing: false,
    });
  }

  const byRole = new Map<InvRole, MunInfo>();
  for (const m of munInfos) {
    byRole.set(m.inv_role, m);
  }

  const bihac = byRole.get('bihac')!;
  const cazin = byRole.get('cazin')!;
  const buzim = byRole.get('buzim')!;
  const vk = byRole.get('vk')!;

  const canEval = (a: MunInfo, b: MunInfo) => !a.missing && !b.missing;

  const invariants: InvariantResult[] = [];
  const failLines: { from: [number, number]; to: [number, number]; invariant_id: string; expected_relation: string }[] = [];

  // Cazin north of Bihać: cy(Cazin) < cy(Bihać)
  const inv1: InvariantResult = {
    id: 'cazin_north_of_bihac',
    description: 'Cazin north of Bihać',
    pass: false,
    value_left: cazin.centroid[1],
    value_right: bihac.centroid[1],
    relation: 'cy(Cazin) < cy(Bihać)',
    cannot_evaluate: !canEval(cazin, bihac),
  };
  if (!inv1.cannot_evaluate) {
    inv1.pass = cazin.centroid[1] < bihac.centroid[1];
    if (!inv1.pass) failLines.push({ from: cazin.centroid, to: bihac.centroid, invariant_id: inv1.id, expected_relation: 'expected cazin north of bihac' });
  }
  invariants.push(inv1);

  // VK north of Cazin: cy(VK) < cy(Cazin)
  const inv2: InvariantResult = {
    id: 'vk_north_of_cazin',
    description: 'Velika Kladuša north of Cazin',
    pass: false,
    value_left: vk.centroid[1],
    value_right: cazin.centroid[1],
    relation: 'cy(VK) < cy(Cazin)',
    cannot_evaluate: !canEval(vk, cazin),
  };
  if (!inv2.cannot_evaluate) {
    inv2.pass = vk.centroid[1] < cazin.centroid[1];
    if (!inv2.pass) failLines.push({ from: vk.centroid, to: cazin.centroid, invariant_id: inv2.id, expected_relation: 'expected vk north of cazin' });
  }
  invariants.push(inv2);

  // Bužim east of Cazin: cx(Bužim) > cx(Cazin)
  const inv3: InvariantResult = {
    id: 'buzim_east_of_cazin',
    description: 'Bužim east of Cazin',
    pass: false,
    value_left: buzim.centroid[0],
    value_right: cazin.centroid[0],
    relation: 'cx(Bužim) > cx(Cazin)',
    cannot_evaluate: !canEval(buzim, cazin),
  };
  if (!inv3.cannot_evaluate) {
    inv3.pass = buzim.centroid[0] > cazin.centroid[0];
    if (!inv3.pass) failLines.push({ from: buzim.centroid, to: cazin.centroid, invariant_id: inv3.id, expected_relation: 'expected buzim east of cazin' });
  }
  invariants.push(inv3);

  // Bužim north of Bihać: cy(Bužim) < cy(Bihać)
  const inv4: InvariantResult = {
    id: 'buzim_north_of_bihac',
    description: 'Bužim north of Bihać',
    pass: false,
    value_left: buzim.centroid[1],
    value_right: bihac.centroid[1],
    relation: 'cy(Bužim) < cy(Bihać)',
    cannot_evaluate: !canEval(buzim, bihac),
  };
  if (!inv4.cannot_evaluate) {
    inv4.pass = buzim.centroid[1] < bihac.centroid[1];
    if (!inv4.pass) failLines.push({ from: buzim.centroid, to: bihac.centroid, invariant_id: inv4.id, expected_relation: 'expected buzim north of bihac' });
  }
  invariants.push(inv4);

  // Bužim south of VK: cy(Bužim) > cy(VK)
  const inv5: InvariantResult = {
    id: 'buzim_south_of_vk',
    description: 'Bužim south of Velika Kladuša',
    pass: false,
    value_left: buzim.centroid[1],
    value_right: vk.centroid[1],
    relation: 'cy(Bužim) > cy(VK)',
    cannot_evaluate: !canEval(buzim, vk),
  };
  if (!inv5.cannot_evaluate) {
    inv5.pass = buzim.centroid[1] > vk.centroid[1];
    if (!inv5.pass) failLines.push({ from: buzim.centroid, to: vk.centroid, invariant_id: inv5.id, expected_relation: 'expected buzim south of vk' });
  }
  invariants.push(inv5);

  const diagnosisHints: string[] = [];
  if (!inv1.cannot_evaluate && !inv1.pass) {
    diagnosisHints.push('cy(Cazin) > cy(Bihać): likely Cazin-tagged features are actually south of Bihać in substrate');
  }
  if (!inv3.cannot_evaluate && !inv3.pass) {
    diagnosisHints.push('cx(Bužim) <= cx(Cazin): likely Bužim-tagged bucket is wrong or empty');
  }
  if (!inv2.cannot_evaluate && !inv2.pass) {
    diagnosisHints.push('VK resolves but is not northmost: likely VK code mapping/tagging issue');
  }

  const auditJson = {
    awwv_meta: { role: 'nw_ordering_invariants_audit', phase: 'h6_10_4' },
    substrate_sha256: substrateSha,
    substrate_bbox: globalBbox,
    substrate_feature_count: features.length,
    vk_resolution: { code: vkCode, matched_name: vkMatchedName },
    municipalities: munInfos.map(m => ({
      code: m.code,
      name: m.name,
      inv_role: m.inv_role,
      feature_count: m.feature_count,
      bbox: m.bbox,
      centroid: m.centroid,
      missing: m.missing,
    })),
    invariants: invariants.map(i => ({
      id: i.id,
      description: i.description,
      pass: i.pass,
      value_left: i.value_left,
      value_right: i.value_right,
      relation: i.relation,
      cannot_evaluate: i.cannot_evaluate,
    })),
    diagnosis_hints: diagnosisHints,
    fail_line_count: failLines.length,
  };

  const txtLines: string[] = [];
  txtLines.push('NW ordering invariants (H6.10.4)');
  txtLines.push('Substrate: ' + SUBSTRATE_PATH);
  txtLines.push('Substrate sha256: ' + substrateSha);
  txtLines.push('Substrate bbox: ' + JSON.stringify(globalBbox));
  txtLines.push('Substrate feature_count: ' + features.length);
  txtLines.push('');
  txtLines.push('VK resolution: code=' + vkCode + ' matched_name=' + vkMatchedName);
  txtLines.push('');
  txtLines.push('Per municipality:');
  for (const m of munInfos) {
    txtLines.push('  ' + m.name + ' ' + m.code + ' inv_role=' + m.inv_role + ' feature_count=' + m.feature_count + (m.missing ? ' MISSING' : '') + ' bbox=' + JSON.stringify(m.bbox) + ' centroid=' + JSON.stringify(m.centroid));
  }
  txtLines.push('');
  txtLines.push('Invariant results:');
  for (const i of invariants) {
    const status = i.cannot_evaluate ? 'cannot_evaluate' : i.pass ? 'PASS' : 'FAIL';
    txtLines.push('  ' + i.id + ' ' + status + ' ' + i.relation + ' value_left=' + i.value_left + ' value_right=' + i.value_right);
  }
  if (diagnosisHints.length > 0) {
    txtLines.push('');
    txtLines.push('Diagnosis hints:');
    for (const h of diagnosisHints) txtLines.push('  - ' + h);
  }

  writeFileSync(resolve(DEBUG_DIR, 'nw_ordering_invariants_h6_10_4.json'), JSON.stringify(auditJson, null, 2), 'utf8');
  writeFileSync(resolve(DEBUG_DIR, 'nw_ordering_invariants_h6_10_4.txt'), txtLines.join('\n'), 'utf8');

  interface OverlayFeature {
    type: 'Feature';
    properties: Record<string, unknown>;
    geometry: { type: 'Polygon'; coordinates: number[][][] } | { type: 'Point'; coordinates: [number, number] } | { type: 'LineString'; coordinates: [number, number][] };
  }
  const overlayFeatures: OverlayFeature[] = [];
  const bboxToRing = (bbox: { minx: number; miny: number; maxx: number; maxy: number }) => [
    [bbox.minx, bbox.miny],
    [bbox.maxx, bbox.miny],
    [bbox.maxx, bbox.maxy],
    [bbox.minx, bbox.maxy],
    [bbox.minx, bbox.miny],
  ];
  for (const m of munInfos) {
    if (m.missing) continue;
    const label = `${m.name} ${m.code} cx=${m.centroid[0].toFixed(3)} cy=${m.centroid[1].toFixed(3)}`;
    overlayFeatures.push({
      type: 'Feature',
      properties: { label, inv_role: m.inv_role, overlay_type: 'bbox' },
      geometry: { type: 'Polygon', coordinates: [bboxToRing(m.bbox)] },
    });
    overlayFeatures.push({
      type: 'Feature',
      properties: { label, inv_role: m.inv_role, overlay_type: 'centroid' },
      geometry: { type: 'Point', coordinates: m.centroid },
    });
  }
  for (const line of failLines) {
    overlayFeatures.push({
      type: 'Feature',
      properties: { overlay_type: 'FAIL', invariant_id: line.invariant_id, expected_relation: line.expected_relation },
      geometry: { type: 'LineString', coordinates: [line.from, line.to] },
    });
  }
  const overlayFc = {
    type: 'FeatureCollection' as const,
    features: overlayFeatures,
  };
  writeFileSync(resolve(DEBUG_DIR, 'nw_ordering_invariants_overlay_h6_10_4.geojson'), JSON.stringify(overlayFc, null, 2), 'utf8');

  console.log('Wrote ' + resolve(DEBUG_DIR, 'nw_ordering_invariants_h6_10_4.txt'));
  console.log('Wrote ' + resolve(DEBUG_DIR, 'nw_ordering_invariants_h6_10_4.json'));
  console.log('Wrote ' + resolve(DEBUG_DIR, 'nw_ordering_invariants_overlay_h6_10_4.geojson'));
  for (const i of invariants) {
    const status = i.cannot_evaluate ? 'cannot_evaluate' : i.pass ? 'PASS' : 'FAIL';
    console.log('  ' + i.id + ' ' + status);
  }
  if (failLines.length > 0) {
    console.log('FAIL lines in overlay: ' + failLines.length);
    for (const h of diagnosisHints) console.log('  Hint: ' + h);
  }
}

main();
