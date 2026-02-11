/**
 * Phase 6E.9: Assert map:build polygon completeness (feature count == settlement count).
 * Deterministic: stable sort; no timestamps.
 * Reads: data/derived/settlements_index.json, data/derived/settlements_polygons.geojson.
 * Writes: docs/audits/phase_6e9_polygon_completeness.json, phase_6e9_polygon_completeness.md.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';


const ROOT = resolve(import.meta.dirname, '../..');
const DERIVED = resolve(ROOT, 'data/derived');
const DOCS_AUDITS = resolve(ROOT, 'docs/audits');

const SETTLEMENTS_INDEX_JSON = resolve(DERIVED, 'settlements_index.json');
const SETTLEMENTS_POLYGONS_GEOJSON = resolve(DERIVED, 'settlements_polygons.geojson');
const OUTPUT_JSON = resolve(DOCS_AUDITS, 'phase_6e9_polygon_completeness.json');
const OUTPUT_MD = resolve(DOCS_AUDITS, 'phase_6e9_polygon_completeness.md');

interface IndexRoot {
  settlements?: Array<{ sid: string }>;
}

interface GeoJSONFeature {
  type: string;
  properties?: Record<string, unknown>;
  geometry?: unknown;
}

interface GeoJSONFC {
  type: string;
  features?: GeoJSONFeature[];
}

function run(): void {
  if (!existsSync(SETTLEMENTS_INDEX_JSON)) {
    throw new Error(`Settlements index not found: ${SETTLEMENTS_INDEX_JSON}. Run "npm run map:build" first.`);
  }
  if (!existsSync(SETTLEMENTS_POLYGONS_GEOJSON)) {
    throw new Error(`Polygons GeoJSON not found: ${SETTLEMENTS_POLYGONS_GEOJSON}. Run "npm run map:build" first.`);
  }

  const index = JSON.parse(readFileSync(SETTLEMENTS_INDEX_JSON, 'utf8')) as IndexRoot;
  const settlements = index.settlements ?? [];
  const expectedSids = new Set(settlements.map((s) => s.sid));
  const N = expectedSids.size;

  const fc = JSON.parse(readFileSync(SETTLEMENTS_POLYGONS_GEOJSON, 'utf8')) as GeoJSONFC;
  const features = fc.features ?? [];
  const polygonSids = features.map((f) => (f.properties?.sid ?? f.properties?.source_id) as string).filter(Boolean);
  const polygonSidCounts = new Map<string, number>();
  for (const sid of polygonSids) {
    polygonSidCounts.set(sid, (polygonSidCounts.get(sid) ?? 0) + 1);
  }

  const missing: string[] = [];
  for (const sid of expectedSids) {
    if ((polygonSidCounts.get(sid) ?? 0) < 1) {
      missing.push(sid);
    }
  }
  missing.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  const polygonSidSet = new Set(polygonSids);
  const extraUnique: string[] = [...polygonSidSet]
    .filter(
      (sid) => !expectedSids.has(sid) || (polygonSidCounts.get(sid) ?? 0) > 1
    )
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  const countMatch = features.length === N;
  const noMissing = missing.length === 0;
  const noExtra = extraUnique.length === 0;
  const pass = countMatch && noMissing && noExtra;

  const out = {
    task: 'phase_6e9_polygon_completeness',
    settlement_count: N,
    polygon_feature_count: features.length,
    count_match: countMatch,
    missing_sids: missing,
    extra_sids: extraUnique,
    pass
  };

  writeFileSync(OUTPUT_JSON, JSON.stringify(out, null, 2), 'utf8');

  const md = [
    '# Phase 6E.9 — Map build polygon completeness',
    '',
    `- **Settlement count (index):** ${N}`,
    `- **Polygon feature count:** ${features.length}`,
    `- **Count match:** ${countMatch}`,
    `- **Missing SIDs:** ${missing.length} (must be 0)`,
    `- **Extra SIDs:** ${extraUnique.length} (must be 0)`,
    `- **Pass:** ${pass}`,
    '',
    '## Missing SIDs (sorted)',
    '',
    ...(missing.length === 0 ? ['(none)'] : missing.map((s) => `- ${s}`)),
    '',
    '## Extra SIDs (sorted)',
    '',
    ...(extraUnique.length === 0 ? ['(none)'] : extraUnique.map((s) => `- ${s}`)),
    ''
  ].join('\n');
  writeFileSync(OUTPUT_MD, md, 'utf8');

  process.stdout.write(
    `Phase 6E.9 polygon completeness: settlements=${N}, polygons=${features.length}, pass=${pass}\n`
  );
  if (!pass) {
    process.stderr.write(`FAIL: missing=${missing.length}, extra=${extraUnique.length}\n`);
    process.exitCode = 1;
  }
}

run();
