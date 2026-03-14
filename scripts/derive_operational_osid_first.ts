/**
 * derive_operational_osid_first.ts (Phase 2 B(a) — OSID as base layer)
 *
 * Produces operational_settlements.geojson, canonical_to_operational_map.json,
 * and operational_contact_graph.json from an OSID-native geometry source only.
 * No SID geometry is used to *build* operational boundaries; operational_settlements
 * is the source of truth. Canonical layer is used only to derive SID→OSID via
 * point-in-polygon.
 *
 * Inputs:
 *   - data/derived/operational/operational_settlements.geojson (OSID-native source; bootstrap from legacy derive or Merger export)
 *   - data/derived/settlements_wgs84_1990.geojson (canonical features for centroid → point-in-polygon)
 *
 * Outputs (same paths as legacy):
 *   - data/derived/operational/operational_settlements.geojson (passthrough)
 *   - data/derived/operational/canonical_to_operational_map.json
 *   - data/derived/operational/operational_contact_graph.json
 *
 * Determinism: All iteration over OSIDs and SIDs uses localeCompare sort. No timestamps or randomness.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as turf from '@turf/turf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJ_ROOT = resolve(__dirname, '..');
const DATA_DIR = resolve(PROJ_ROOT, 'data');
const OUT_DIR = resolve(DATA_DIR, 'derived', 'operational');

function strictCompare(a: string, b: string): number {
    return a.localeCompare(b, 'en');
}

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// ─── Load OSID-native source ────────────────────────────────────────────────
console.log('Loading OSID-native source...');
const opPath = resolve(OUT_DIR, 'operational_settlements.geojson');
if (!existsSync(opPath)) {
    throw new Error(
        `operational_settlements.geojson not found at ${opPath}. Run legacy derive (map:derive:operational-settlements) once to bootstrap, or provide OSID GeoJSON.`
    );
}
const opGeo = JSON.parse(readFileSync(opPath, 'utf8')) as GeoJSON.FeatureCollection;
const opFeatures = opGeo.features ?? [];
if (opFeatures.length === 0) throw new Error('operational_settlements.geojson has no features');

// Build OSID → feature map; sort OSIDs for deterministic order
const osidToFeature = new Map<string, GeoJSON.Feature>();
for (const f of opFeatures) {
    const osid = (f.properties as Record<string, unknown>)?.osid as string;
    if (typeof osid !== 'string') continue;
    osidToFeature.set(osid, f);
}
const osids = Array.from(osidToFeature.keys()).sort(strictCompare);
console.log(`  OSID features: ${osids.length}`);

// ─── Load canonical settlements for point-in-polygon ────────────────────────
console.log('Loading canonical settlements for SID→OSID derivation...');
const canonPath = resolve(DATA_DIR, 'derived', 'settlements_wgs84_1990.geojson');
if (!existsSync(canonPath)) throw new Error(`Canonical GeoJSON not found: ${canonPath}`);
const canonGeo = JSON.parse(readFileSync(canonPath, 'utf8')) as GeoJSON.FeatureCollection;
const canonFeatures = canonGeo.features ?? [];
const canonicalToOperational: Record<string, string> = {};

// Deterministic: process canonical features in sorted order by sid (or fallback id)
const sidFromProps = (p: Record<string, unknown>): string =>
    (p.sid as string) ?? (p.settlement_id as string) ?? (p.id as string) ?? '';
const withSid = canonFeatures
    .filter((f) => f.properties && sidFromProps(f.properties as Record<string, unknown>))
    .map((f) => ({ sid: sidFromProps(f.properties as Record<string, unknown>), feature: f }));
withSid.sort((a, b) => strictCompare(a.sid, b.sid));

for (const { sid, feature } of withSid) {
    const pt = turf.centroid(feature as turf.helpers.Feature<turf.helpers.Polygon | turf.helpers.MultiPolygon>);
    let found: string | null = null;
    for (const osid of osids) {
        const opF = osidToFeature.get(osid)!;
        if (turf.booleanPointInPolygon(pt, opF as turf.helpers.Feature<turf.helpers.Polygon | turf.helpers.MultiPolygon>)) {
            found = osid;
            break;
        }
    }
    if (found) canonicalToOperational[sid] = found;
}
const sidKeys = Object.keys(canonicalToOperational).sort(strictCompare);
console.log(`  Canonical SIDs assigned to OSID: ${sidKeys.length}`);

// ─── Derive contact graph from OSID geometry (booleanIntersects) ─────────────
console.log('Deriving operational contact graph from geometry...');
const edges: { a: string; b: string }[] = [];
for (let i = 0; i < osids.length; i++) {
    const osidA = osids[i]!;
    const featA = osidToFeature.get(osidA)!;
    for (let j = i + 1; j < osids.length; j++) {
        const osidB = osids[j]!;
        const featB = osidToFeature.get(osidB)!;
        if (turf.booleanIntersects(featA as turf.helpers.Feature<turf.helpers.Polygon | turf.helpers.MultiPolygon>, featB as turf.helpers.Feature<turf.helpers.Polygon | turf.helpers.MultiPolygon>)) {
            edges.push({ a: osidA, b: osidB });
        }
    }
}
edges.sort((x, y) => strictCompare(`${x.a}\t${x.b}`, `${y.a}\t${y.b}`));
console.log(`  Edges: ${edges.length}`);

// ─── Write outputs ──────────────────────────────────────────────────────────
console.log('Writing outputs...');
writeFileSync(opPath, JSON.stringify(opGeo));

const mapping: Record<string, string> = {};
for (const sid of sidKeys) mapping[sid] = canonicalToOperational[sid]!;
writeFileSync(resolve(OUT_DIR, 'canonical_to_operational_map.json'), JSON.stringify(mapping, null, 2));

const opContactGraph = {
    schema_version: 1,
    parameters: { derived_from: 'osid_first_geometry' },
    nodes: osids.map((id) => {
        const feat = osidToFeature.get(id)!;
        const ctr = turf.centroid(feat as any).geometry.coordinates;
        return { id, lat: ctr[1], lon: ctr[0] };
    }),
    edges
};
writeFileSync(resolve(OUT_DIR, 'operational_contact_graph.json'), JSON.stringify(opContactGraph));

console.log('Done (OSID-first pipeline).');
