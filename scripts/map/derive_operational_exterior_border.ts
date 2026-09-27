import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type Position = [number, number];
type StateCode = 'HRV' | 'MNE' | 'SRB';
type Segment = { a: Position; b: Position; minX: number; minY: number; maxX: number; maxY: number };

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const OPERATIONAL_GEOMETRY = resolve(ROOT, 'data/derived/operational/operational_settlements.geojson');
const CONTACT_GRAPH = resolve(ROOT, 'data/derived/operational/operational_contact_graph.json');
const MERGE_MAP = resolve(ROOT, 'data/derived/operational/micro_osid_merge_map.json');
const BIH_BOUNDARY = resolve(ROOT, 'data/source/boundaries/bih_adm0.geojson');
const SOURCE_DIR = resolve(ROOT, 'data/source/boundaries/geoboundaries_adm0_2023');
const SOURCE_PROVENANCE = resolve(SOURCE_DIR, 'provenance.json');
const OUTPUT_JSON = resolve(ROOT, 'data/derived/operational/osid_exterior_border.json');
const OUTPUT_TS = resolve(ROOT, 'src/sim/combat/commander/osid_exterior_border_data.ts');

// The OSID geometry was clipped to the BIH ADM0 outline but passed through several
// geometry transforms. Twenty metres admits their observed floating-point drift while
// remaining far below the 1 km micro-OSID fold threshold.
const EXTERIOR_TOLERANCE_KM = 0.02;
// The simplified adjacent ADM0 segment midpoints differ from the BIH source by up to
// 2.969 km on the pinned inputs. Membership is unchanged from 1.84 through 3 km; the
// ceiling remains fail-closed and every source file is checksum-pinned below.
const NEIGHBOR_ATTRIBUTION_TOLERANCE_KM = 3;
// Point/corner contacts are not usable border frontage. Require 50 m of classified line.
const MINIMUM_SHARED_BORDER_KM = 0.05;
const KM_PER_DEGREE_LAT = 111.1950802335329;

function strictCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function parseJson(path: string): any {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function geometryRings(geometry: any): Position[][] {
  if (geometry?.type === 'Polygon') return geometry.coordinates;
  if (geometry?.type === 'MultiPolygon') return geometry.coordinates.flat();
  throw new Error(`Expected Polygon or MultiPolygon, got ${String(geometry?.type)}`);
}

function geometrySegments(geometry: any): Segment[] {
  const segments: Segment[] = [];
  for (const ring of geometryRings(geometry)) {
    for (let i = 1; i < ring.length; i += 1) {
      const a = ring[i - 1] as Position;
      const b = ring[i] as Position;
      segments.push({
        a,
        b,
        minX: Math.min(a[0], b[0]),
        minY: Math.min(a[1], b[1]),
        maxX: Math.max(a[0], b[0]),
        maxY: Math.max(a[1], b[1]),
      });
    }
  }
  return segments;
}

function distanceKm(a: Position, b: Position): number {
  const radians = Math.PI / 180;
  const lat1 = a[1] * radians;
  const lat2 = b[1] * radians;
  const dLat = (b[1] - a[1]) * radians;
  const dLon = (b[0] - a[0]) * radians;
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function pointSegmentDistanceKm(point: Position, segment: Segment): number {
  const meanLat = ((point[1] + segment.a[1] + segment.b[1]) / 3) * Math.PI / 180;
  const xScale = KM_PER_DEGREE_LAT * Math.cos(meanLat);
  const yScale = KM_PER_DEGREE_LAT;
  const ax = (segment.a[0] - point[0]) * xScale;
  const ay = (segment.a[1] - point[1]) * yScale;
  const bx = (segment.b[0] - point[0]) * xScale;
  const by = (segment.b[1] - point[1]) * yScale;
  const dx = bx - ax;
  const dy = by - ay;
  const denominator = dx * dx + dy * dy;
  const t = denominator === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / denominator));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

function nearestDistanceKm(point: Position, segments: readonly Segment[], stopBelowKm = -1): number {
  let best = Number.POSITIVE_INFINITY;
  for (const segment of segments) {
    const distance = pointSegmentDistanceKm(point, segment);
    if (distance < best) best = distance;
    if (best <= stopBelowKm) return best;
  }
  return best;
}

function midpoint(segment: Segment): Position {
  return [(segment.a[0] + segment.b[0]) / 2, (segment.a[1] + segment.b[1]) / 2];
}

function isExteriorSegment(segment: Segment, bihSegments: readonly Segment[]): boolean {
  return nearestDistanceKm(segment.a, bihSegments, EXTERIOR_TOLERANCE_KM) <= EXTERIOR_TOLERANCE_KM
    && nearestDistanceKm(segment.b, bihSegments, EXTERIOR_TOLERANCE_KM) <= EXTERIOR_TOLERANCE_KM
    && nearestDistanceKm(midpoint(segment), bihSegments, EXTERIOR_TOLERANCE_KM) <= EXTERIOR_TOLERANCE_KM;
}

function formatRuntimeModule(osids: Record<string, StateCode[]>): string {
  const lines = Object.entries(osids).map(([osid, states]) =>
    `  ${JSON.stringify(osid)}: [${states.map((state) => JSON.stringify(state)).join(', ')}],`);
  return [
    '// Generated by scripts/map/derive_operational_exterior_border.ts. Do not edit by hand.',
    '',
    "export type ExteriorBorderState = 'HRV' | 'MNE' | 'SRB';",
    '',
    'export const OSID_EXTERIOR_BORDER_BY_OSID: Readonly<Record<string, readonly ExteriorBorderState[]>> = {',
    ...lines,
    '};',
    '',
  ].join('\n');
}

function buildOutputs(): { json: string; runtime: string; count: number } {
  const operational = parseJson(OPERATIONAL_GEOMETRY);
  const graph = parseJson(CONTACT_GRAPH);
  const mergeMap = parseJson(MERGE_MAP) as Record<string, string>;
  const bih = parseJson(BIH_BOUNDARY);
  const sourceProvenance = parseJson(SOURCE_PROVENANCE);
  const activeOsids = new Set<string>(graph.nodes.map((node: any) => String(node.id)));
  if (operational.features.length !== 744 || activeOsids.size !== 712) {
    throw new Error(`Unexpected operational fold: ${operational.features.length} source features, ${activeOsids.size} active OSIDs`);
  }
  if (Object.keys(mergeMap).length !== 32) {
    throw new Error(`Expected 32 micro-OSID redirects, got ${Object.keys(mergeMap).length}`);
  }

  const bihSegments = geometrySegments(bih.features[0].geometry);
  const stateSegments = new Map<StateCode, Segment[]>();
  for (const source of sourceProvenance.sources as any[]) {
    const state = source.state as StateCode;
    const path = resolve(ROOT, source.path);
    const metadataPath = resolve(ROOT, source.metadata_path);
    if (sha256(path) !== source.sha256) throw new Error(`Source checksum mismatch: ${source.path}`);
    if (sha256(metadataPath) !== source.metadata_sha256) throw new Error(`Metadata checksum mismatch: ${source.metadata_path}`);
    const metadata = parseJson(metadataPath);
    if (metadata.boundaryID !== source.boundary_id
      || metadata.boundaryLicense !== source.license
      || metadata.boundaryYear !== source.boundary_year) {
      throw new Error(`Source metadata contract mismatch: ${source.metadata_path}`);
    }
    stateSegments.set(state, geometrySegments(parseJson(path).features[0].geometry));
  }
  const states = [...stateSegments.keys()].sort(strictCompare);
  const borderLengths = new Map<string, Map<StateCode, number>>();

  for (const feature of operational.features) {
    const sourceOsid = String(feature.properties?.osid);
    const activeOsid = mergeMap[sourceOsid] ?? sourceOsid;
    if (!activeOsids.has(activeOsid)) throw new Error(`Fold target is not active: ${sourceOsid} -> ${activeOsid}`);
    for (const segment of geometrySegments(feature.geometry)) {
      if (!isExteriorSegment(segment, bihSegments)) continue;
      const point = midpoint(segment);
      const ranked = states.map((state) => ({
        state,
        distance: nearestDistanceKm(point, stateSegments.get(state)!),
      })).sort((left, right) => left.distance - right.distance || strictCompare(left.state, right.state));
      const nearest = ranked[0]!;
      if (nearest.distance > NEIGHBOR_ATTRIBUTION_TOLERANCE_KM) {
        throw new Error(`Unattributed exterior segment at ${point.join(',')} (${nearest.distance.toFixed(3)} km)`);
      }
      const byState = borderLengths.get(activeOsid) ?? new Map<StateCode, number>();
      byState.set(nearest.state, (byState.get(nearest.state) ?? 0) + distanceKm(segment.a, segment.b));
      borderLengths.set(activeOsid, byState);
    }
  }

  const osids: Record<string, StateCode[]> = {};
  for (const osid of [...activeOsids].sort(strictCompare)) {
    const statesForOsid = [...(borderLengths.get(osid)?.entries() ?? [])]
      .filter(([, length]) => length >= MINIMUM_SHARED_BORDER_KM)
      .map(([state]) => state)
      .sort(strictCompare);
    if (statesForOsid.length > 0) osids[osid] = statesForOsid;
  }

  const artifact = {
    schema_version: 1,
    provenance: {
      description: 'Active operational OSIDs with usable line frontage on the Bosnia and Herzegovina exterior boundary, attributed to adjacent states.',
      crs: 'OGC:CRS84 (WGS84 longitude, latitude)',
      operational_geometry: {
        path: 'data/derived/operational/operational_settlements.geojson',
        source_feature_count: 744,
        active_osid_count: 712,
        fold_map: 'data/derived/operational/micro_osid_merge_map.json',
        fold_count: 32,
      },
      bih_boundary: {
        path: 'data/source/boundaries/bih_adm0.geojson',
        boundary_id: 'BIH-ADM0-45210373',
        sha256: sha256(BIH_BOUNDARY),
      },
      neighbor_boundaries: (sourceProvenance.sources as any[]).map((source) => ({ ...source })),
      method: {
        algorithm: 'Classify source polygon line segments whose endpoints and midpoint are within the BIH-boundary tolerance; attribute each midpoint to the nearest adjacent ADM0 boundary; sum frontage after the 744-to-712 redirect fold.',
        exterior_tolerance_km: EXTERIOR_TOLERANCE_KM,
        neighbor_attribution_tolerance_km: NEIGHBOR_ATTRIBUTION_TOLERANCE_KM,
        minimum_shared_border_km: MINIMUM_SHARED_BORDER_KM,
        ordering: 'strictCompare',
      },
    },
    osids,
  };
  return {
    json: `${JSON.stringify(artifact, null, 2)}\n`,
    runtime: formatRuntimeModule(osids),
    count: Object.keys(osids).length,
  };
}

function main(): void {
  const outputs = buildOutputs();
  if (process.argv.includes('--check')) {
    const mismatches = [
      [OUTPUT_JSON, outputs.json],
      [OUTPUT_TS, outputs.runtime],
    ].filter(([path, expected]) => readFileSync(path, 'utf8') !== expected).map(([path]) => path);
    if (mismatches.length > 0) throw new Error(`Generated outputs are stale: ${mismatches.join(', ')}`);
    console.log(`Operational exterior border outputs are deterministic and current (${outputs.count} OSIDs).`);
    return;
  }
  writeFileSync(OUTPUT_JSON, outputs.json, 'utf8');
  writeFileSync(OUTPUT_TS, outputs.runtime, 'utf8');
  console.log(`Wrote ${OUTPUT_JSON} and ${OUTPUT_TS} (${outputs.count} OSIDs).`);
}

main();
