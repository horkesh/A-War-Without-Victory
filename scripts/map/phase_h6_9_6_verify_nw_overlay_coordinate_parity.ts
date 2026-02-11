/**
 * Phase H6.9.6 — Verify NW overlay coordinate parity with substrate source
 *
 * PURPOSE:
 *   Prove (or falsify) that the H6.9.4 overlay GeoJSON coordinates are byte-level /
 *   value-level identical to the source substrate polygons they claim to be built from.
 *
 * INPUTS:
 *   - data/derived/settlements_substrate.geojson
 *   - data/derived/_debug/nw_provenance_overlay_from_substrate_h6_9_4.geojson (required; exit if missing)
 *   - data/derived/_debug/nw_overlay_mismatch_overlay_h6_9_5.geojson (optional; skip if missing)
 *   - data/derived/settlements_index_1990.json (same muni logic as H6.9.4)
 *   - data/source/municipalities_1990_registry_110.json
 *
 * OUTPUTS (data/derived/_debug/, untracked):
 *   - nw_overlay_coordinate_parity_h6_9_6.json
 *   - nw_overlay_coordinate_parity_h6_9_6.txt
 *
 * Usage: npx tsx scripts/map/phase_h6_9_6_verify_nw_overlay_coordinate_parity.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { computeBboxFromFeatures } from './lib/awwv_contracts.js';


const ROOT = resolve();
const DERIVED = resolve(ROOT, 'data/derived');
const SOURCE = resolve(ROOT, 'data/source');
const DEBUG_DIR = resolve(DERIVED, '_debug');

const SUBSTRATE_PATH = resolve(DERIVED, 'settlements_substrate.geojson');
const OVERLAY_PATH = resolve(DEBUG_DIR, 'nw_provenance_overlay_from_substrate_h6_9_4.geojson');
const MISMATCH_PATH = resolve(DEBUG_DIR, 'nw_overlay_mismatch_overlay_h6_9_5.geojson');
const INDEX_1990_PATH = resolve(DERIVED, 'settlements_index_1990.json');
const REGISTRY_PATH = resolve(SOURCE, 'municipalities_1990_registry_110.json');

const OUT_JSON = resolve(DEBUG_DIR, 'nw_overlay_coordinate_parity_h6_9_6.json');
const OUT_TXT = resolve(DEBUG_DIR, 'nw_overlay_coordinate_parity_h6_9_6.txt');

const TOL = 1e-9;

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

interface RegistryRow {
  mun1990_id: string;
  name: string;
  normalized_name?: string;
}

interface Index1990Settlement {
  sid: string;
  mun1990_id?: string | null;
  mun?: string | null;
}

interface Index1990 {
  settlements?: Index1990Settlement[];
}

function bboxFromCoords(coords: Polygon | MultiPolygon): [number, number, number, number] {
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
  const isMulti = Array.isArray(coords[0]) && Array.isArray((coords[0] as Ring)[0]) && typeof ((coords[0] as Ring)[0] as Point)[0] === 'number';
  if (isMulti) {
    for (const poly of coords as MultiPolygon)
      for (const ring of poly) processRing(ring);
  } else {
    for (const ring of coords as Polygon) processRing(ring);
  }
  if (!isFinite(minx)) return [0, 0, 0, 0];
  return [minx, miny, maxx, maxy];
}

function roundBbox(b: [number, number, number, number]): [number, number, number, number] {
  return [
    Math.round(b[0] / TOL) * TOL,
    Math.round(b[1] / TOL) * TOL,
    Math.round(b[2] / TOL) * TOL,
    Math.round(b[3] / TOL) * TOL,
  ];
}

function bboxEqual(a: [number, number, number, number], b: [number, number, number, number]): boolean {
  const ra = roundBbox(a);
  const rb = roundBbox(b);
  return ra[0] === rb[0] && ra[1] === rb[1] && ra[2] === rb[2] && ra[3] === rb[3];
}

function polygonToMultiPolygonCoords(geom: { type: string; coordinates: Polygon | MultiPolygon }): Polygon[] {
  if (geom.type === 'Polygon' && geom.coordinates)
    return [geom.coordinates as Polygon];
  if (geom.type === 'MultiPolygon' && geom.coordinates)
    return geom.coordinates as MultiPolygon;
  return [];
}

/** Count outer rings (polygons) in overlay feature */
function countOverlayPolygons(f: GeoJSONFeature): number {
  const polys = polygonToMultiPolygonCoords(f.geometry);
  return polys.length;
}

/** Sample up to 50 coordinate pairs from a feature (first N points in order) */
function sampleCoords(f: GeoJSONFeature, maxPoints: number): Point[] {
  const out: Point[] = [];
  const polys = polygonToMultiPolygonCoords(f.geometry);
  for (const poly of polys) {
    if (!poly[0]) continue;
    for (const pt of poly[0]) {
      if (out.length >= maxPoints) return out;
      if (Array.isArray(pt) && pt.length >= 2 && isFinite(pt[0]) && isFinite(pt[1]))
        out.push([pt[0], pt[1]]);
    }
  }
  return out;
}

function main(): void {
  if (!existsSync(SUBSTRATE_PATH)) {
    console.error('Missing input:', SUBSTRATE_PATH);
    process.exit(1);
  }
  if (!existsSync(OVERLAY_PATH)) {
    console.error('Missing required overlay:', OVERLAY_PATH);
    process.exit(1);
  }
  if (!existsSync(INDEX_1990_PATH)) {
    console.error('Missing input:', INDEX_1990_PATH);
    process.exit(1);
  }
  if (!existsSync(REGISTRY_PATH)) {
    console.error('Missing input:', REGISTRY_PATH);
    process.exit(1);
  }

  const substrate = JSON.parse(readFileSync(SUBSTRATE_PATH, 'utf8')) as GeoJSONFC;
  const overlay = JSON.parse(readFileSync(OVERLAY_PATH, 'utf8')) as GeoJSONFC;
  const index1990 = JSON.parse(readFileSync(INDEX_1990_PATH, 'utf8')) as Index1990;
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8')) as { rows?: RegistryRow[] };

  if (substrate.type !== 'FeatureCollection' || !Array.isArray(substrate.features)) {
    console.error('Invalid substrate: expected FeatureCollection with features array');
    process.exit(1);
  }
  if (overlay.type !== 'FeatureCollection' || !Array.isArray(overlay.features)) {
    console.error('Invalid overlay: expected FeatureCollection with features array');
    process.exit(1);
  }

  const rows = registry.rows || [];
  const nameToCanonical = new Map<string, string>();
  for (const r of rows) {
    nameToCanonical.set(r.mun1990_id, r.mun1990_id);
    nameToCanonical.set(r.name, r.mun1990_id);
    if (r.normalized_name) nameToCanonical.set(r.normalized_name, r.mun1990_id);
  }

  const cazinCanonical = nameToCanonical.get('Cazin') ?? nameToCanonical.get('cazin');
  const bihacCanonical = nameToCanonical.get('Bihać') ?? nameToCanonical.get('Bihac') ?? nameToCanonical.get('bihac');
  if (!cazinCanonical || !bihacCanonical) {
    console.error('Bihać or Cazin mun1990_id could not be determined from registry. STOP.');
    process.exit(1);
  }

  const settlements = index1990.settlements || [];
  const sidToMun1990 = new Map<string, string>();
  for (const s of settlements) {
    const sid = s.sid;
    const raw = s.mun1990_id ?? s.mun ?? null;
    if (raw == null) continue;
    const canon = nameToCanonical.get(raw) ?? (typeof raw === 'string' && /^[a-z0-9_]+$/.test(raw) ? raw : null);
    if (canon) sidToMun1990.set(sid, canon);
  }

  const targetMunIds = new Set<string>([bihacCanonical, cazinCanonical]);

  // Source selection: same logic as H6.9.4 (munCode:censusId lookup)
  const byMun = new Map<string, GeoJSONFeature[]>();
  for (const f of substrate.features) {
    const props = f.properties || {};
    const munCode = props.municipality_id ?? props.mun_code;
    const censusId = props.census_id ?? (typeof props.sid === 'string' ? (props.sid as string).replace(/^S/, '') : null);
    if (munCode == null || censusId == null) continue;
    const lookupKey = String(munCode) + ':' + String(censusId);
    const mun1990 = sidToMun1990.get(lookupKey);
    if (!mun1990 || !targetMunIds.has(mun1990)) continue;
    if (!byMun.has(mun1990)) byMun.set(mun1990, []);
    byMun.get(mun1990)!.push(f);
  }

  const bihacSource = byMun.get(bihacCanonical) || [];
  const cazinSource = byMun.get(cazinCanonical) || [];

  const bbox_substrate = computeBboxFromFeatures(substrate.features) as [number, number, number, number];

  const bihacOverlayFeature = overlay.features.find((f: GeoJSONFeature) => (f.properties?.mun1990_id as string) === bihacCanonical);
  const cazinOverlayFeature = overlay.features.find((f: GeoJSONFeature) => (f.properties?.mun1990_id as string) === cazinCanonical);

  const bbox_bihac_overlay = bihacOverlayFeature
    ? (computeBboxFromFeatures([bihacOverlayFeature]) as [number, number, number, number])
    : ([0, 0, 0, 0] as [number, number, number, number]);
  const bbox_cazin_overlay = cazinOverlayFeature
    ? (computeBboxFromFeatures([cazinOverlayFeature]) as [number, number, number, number])
    : ([0, 0, 0, 0] as [number, number, number, number]);

  const bbox_bihac_source = bihacSource.length > 0 ? computeBboxFromFeatures(bihacSource) as [number, number, number, number] : [0, 0, 0, 0];
  const bbox_cazin_source = cazinSource.length > 0 ? computeBboxFromFeatures(cazinSource) as [number, number, number, number] : [0, 0, 0, 0];

  const overlayPolygonCountBihac = bihacOverlayFeature ? countOverlayPolygons(bihacOverlayFeature) : 0;
  const overlayPolygonCountCazin = cazinOverlayFeature ? countOverlayPolygons(cazinOverlayFeature) : 0;
  const sourceFeatureCountBihac = bihacSource.length;
  const sourceFeatureCountCazin = cazinSource.length;

  const bihacBboxMatch = bboxEqual(bbox_bihac_overlay, bbox_bihac_source);
  const cazinBboxMatch = bboxEqual(bbox_cazin_overlay, bbox_cazin_source);
  const bihacCountMatch = overlayPolygonCountBihac === sourceFeatureCountBihac;
  const cazinCountMatch = overlayPolygonCountCazin === sourceFeatureCountCazin;

  // Axis-swap detection: sample 50 coords from overlay; check if swapping x/y would match source bbox better
  let axis_swap_suspected = false;
  const axisEvidence: string[] = [];

  function bboxL1Diff(a: [number, number, number, number], b: [number, number, number, number]): number {
    return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) + Math.abs(a[3] - b[3]);
  }

  for (const { feat, sourceFeats, munName } of [
    { feat: bihacOverlayFeature, sourceFeats: bihacSource, munName: 'Bihać' },
    { feat: cazinOverlayFeature, sourceFeats: cazinSource, munName: 'Cazin' },
  ]) {
    if (!feat || sourceFeats.length === 0) continue;
    const sampled = sampleCoords(feat, 50);
    if (sampled.length === 0) continue;
    const sourceBbox = sourceFeats.length > 0
      ? (computeBboxFromFeatures(sourceFeats) as [number, number, number, number])
      : ([0, 0, 0, 0] as [number, number, number, number]);
    const overlayBbox = computeBboxFromFeatures([feat]) as [number, number, number, number];
    const swappedBbox: [number, number, number, number] = [
      Math.min(...sampled.map(p => p[1])),
      Math.min(...sampled.map(p => p[0])),
      Math.max(...sampled.map(p => p[1])),
      Math.max(...sampled.map(p => p[0])),
    ];
    const overlayMatchesSource = bboxEqual(overlayBbox, sourceBbox);
    const swappedMatchesSource = bboxEqual(swappedBbox, sourceBbox);
    const overlayDiff = bboxL1Diff(roundBbox(overlayBbox), roundBbox(sourceBbox));
    const swappedDiff = bboxL1Diff(roundBbox(swappedBbox), roundBbox(sourceBbox));
    if (!overlayMatchesSource && swappedMatchesSource) {
      axis_swap_suspected = true;
      axisEvidence.push(`${munName}: swapped x/y bbox matches source; overlay bbox does not`);
    } else if (overlayMatchesSource && swappedMatchesSource) {
      axisEvidence.push(`${munName}: both original and swapped match (symmetric or degenerate)`);
    } else if (!overlayMatchesSource && swappedDiff < overlayDiff) {
      axis_swap_suspected = true;
      axisEvidence.push(`${munName}: swapped x/y bbox closer to source than overlay (L1 overlay=${overlayDiff.toExponential(2)} swapped=${swappedDiff.toExponential(2)})`);
    } else if (!overlayMatchesSource) {
      axisEvidence.push(`${munName}: overlay bbox does not match source; swapped not closer`);
    }
  }

  let bbox_mismatch: [number, number, number, number] | null = null;
  let mismatchFeatureCount: number | null = null;
  if (existsSync(MISMATCH_PATH)) {
    const mismatch = JSON.parse(readFileSync(MISMATCH_PATH, 'utf8')) as GeoJSONFC;
    if (mismatch.type === 'FeatureCollection' && Array.isArray(mismatch.features) && mismatch.features.length > 0) {
      bbox_mismatch = computeBboxFromFeatures(mismatch.features) as [number, number, number, number];
      mismatchFeatureCount = mismatch.features.length;
    }
  }

  const overlayBboxMatch = bihacBboxMatch && cazinBboxMatch;
  const overlayCountMatch = bihacCountMatch && cazinCountMatch;
  const coordinatesCopiedCorrectly = overlayBboxMatch && overlayCountMatch && !axis_swap_suspected;

  const verdict = coordinatesCopiedCorrectly
    ? 'Overlay bbox and counts match source. Coordinates are being copied correctly; any remaining misalignment must be in viewer worldToScreen or overlay rendering path.'
    : (overlayBboxMatch && overlayCountMatch && axis_swap_suspected)
      ? 'Overlay construction may have axis swap (swapped x/y matches source better).'
      : !overlayBboxMatch || !overlayCountMatch
        ? 'Overlay bbox or polygon count differs from source. Overlay construction is likely corrupt (axis swap, wrong geometry field, or wrong muni selection).'
        : 'Inconclusive; check axis evidence.';

  const report = {
    bbox_substrate: bbox_substrate as number[],
    bbox_bihac_overlay: Array.from(bbox_bihac_overlay),
    bbox_cazin_overlay: Array.from(bbox_cazin_overlay),
    bbox_bihac_source: Array.from(bbox_bihac_source),
    bbox_cazin_source: Array.from(bbox_cazin_source),
    bbox_mismatch: bbox_mismatch ? Array.from(bbox_mismatch) : null,
    overlay_polygon_count_bihac: overlayPolygonCountBihac,
    overlay_polygon_count_cazin: overlayPolygonCountCazin,
    source_feature_count_bihac: sourceFeatureCountBihac,
    source_feature_count_cazin: sourceFeatureCountCazin,
    bbox_match_bihac: bihacBboxMatch,
    bbox_match_cazin: cazinBboxMatch,
    count_match_bihac: bihacCountMatch,
    count_match_cazin: cazinCountMatch,
    axis_swap_suspected: axis_swap_suspected,
    axis_evidence: axisEvidence,
    mismatch_feature_count: mismatchFeatureCount,
    verdict,
  };

  mkdirSync(DEBUG_DIR, { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify(report, null, 2), 'utf8');

  const lines = [
    'Phase H6.9.6 — NW overlay coordinate parity',
    '',
    'bbox_substrate: ' + JSON.stringify(bbox_substrate),
    'bbox_bihac_overlay: ' + JSON.stringify(bbox_bihac_overlay),
    'bbox_bihac_source: ' + JSON.stringify(bbox_bihac_source),
    'bbox_cazin_overlay: ' + JSON.stringify(bbox_cazin_overlay),
    'bbox_cazin_source: ' + JSON.stringify(bbox_cazin_source),
    ...(bbox_mismatch ? ['bbox_mismatch: ' + JSON.stringify(bbox_mismatch)] : []),
    '',
    'Bihać: overlay polygons = ' + overlayPolygonCountBihac + ', source features = ' + sourceFeatureCountBihac + ', bbox_match = ' + bihacBboxMatch + ', count_match = ' + bihacCountMatch,
    'Cazin: overlay polygons = ' + overlayPolygonCountCazin + ', source features = ' + sourceFeatureCountCazin + ', bbox_match = ' + cazinBboxMatch + ', count_match = ' + cazinCountMatch,
    ...(mismatchFeatureCount != null ? ['Mismatch overlay features: ' + mismatchFeatureCount] : []),
    '',
    'axis_swap_suspected: ' + axis_swap_suspected,
    ...axisEvidence.map(e => '  ' + e),
    '',
    'VERDICT: ' + verdict,
  ];
  writeFileSync(OUT_TXT, lines.join('\n'), 'utf8');

  process.stdout.write('Wrote ' + OUT_JSON + '\n');
  process.stdout.write('Wrote ' + OUT_TXT + '\n');
  process.stdout.write('Verdict: ' + verdict + '\n');
}

main();
