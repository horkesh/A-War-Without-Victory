/**
 * Phase 6E.8.A: Audit the 23 polygon simplification failures from map build.
 * Audit-only: no geometry or source/derived mutation.
 * Reads: data/derived/polygon_failures.json (primary), map_build_report.json,
 *        settlements_substrate.geojson, settlements_index.json.
 * Writes: docs/audits/phase_6e8_polygon_failures.json, phase_6e8_polygon_failures.md.
 * Deterministic: stable sort by sid; no timestamps.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';


const ROOT = resolve(import.meta.dirname, '../..');
const DERIVED = resolve(ROOT, 'data/derived');
const DOCS_AUDITS = resolve(ROOT, 'docs/audits');

const POLYGON_FAILURES_JSON = resolve(DERIVED, 'polygon_failures.json');
const MAP_BUILD_REPORT_JSON = resolve(DERIVED, 'map_build_report.json');
const SETTLEMENTS_SUBSTRATE_GEOJSON = resolve(DERIVED, 'settlements_substrate.geojson');
const SETTLEMENTS_INDEX_JSON = resolve(DERIVED, 'settlements_index.json');

const OUTPUT_JSON = resolve(DOCS_AUDITS, 'phase_6e8_polygon_failures.json');
const OUTPUT_MD = resolve(DOCS_AUDITS, 'phase_6e8_polygon_failures.md');

const SOURCE_ARTIFACT = 'data/derived/polygon_failures.json';

interface RawPolygonFailure {
  sid: string;
  source_id?: string;
  mun_code?: string;
  mun?: string;
  reason: string;
  d?: string;
  d_hash?: string;
}

interface RawPolygonFailuresFile {
  version?: string;
  total_failures?: number;
  failures: RawPolygonFailure[];
}

interface AuditFailure {
  sid: string;
  municipality: string;
  reason: string;
  source_artifact: string;
  has_polygon_in_substrate: boolean;
}

interface AuditOutput {
  task: string;
  count: number;
  failures: AuditFailure[];
  reason_counts: Record<string, number>;
}

function discoverAndReadPolygonFailures(): RawPolygonFailure[] {
  if (!existsSync(POLYGON_FAILURES_JSON)) {
    throw new Error(
      `Polygon failures artifact not found: ${POLYGON_FAILURES_JSON}. Run "npm run map:build" first to generate it.`
    );
  }
  const raw = JSON.parse(readFileSync(POLYGON_FAILURES_JSON, 'utf8')) as RawPolygonFailuresFile;
  if (!Array.isArray(raw.failures)) {
    throw new Error('polygon_failures.json must contain a "failures" array.');
  }
  return raw.failures;
}

function confirmMapBuildReport(failureCount: number): void {
  if (!existsSync(MAP_BUILD_REPORT_JSON)) {
    throw new Error(
      `Map build report not found: ${MAP_BUILD_REPORT_JSON}. Run "npm run map:build" first.`
    );
  }
  if (failureCount === 0) return;
  const report = JSON.parse(readFileSync(MAP_BUILD_REPORT_JSON, 'utf8')) as {
    stats?: { errors?: string[] };
  };
  const err = report.stats?.errors?.find((e: string) =>
    e.includes('Failed to generate valid polygons')
  );
  if (!err) {
    throw new Error('map_build_report.json does not contain expected polygon failure error line.');
  }
}

function buildSubstrateSidSet(): Set<string> {
  if (!existsSync(SETTLEMENTS_SUBSTRATE_GEOJSON)) {
    return new Set();
  }
  const fc = JSON.parse(readFileSync(SETTLEMENTS_SUBSTRATE_GEOJSON, 'utf8')) as {
    type: string;
    features?: Array<{ properties?: Record<string, unknown> }>;
  };
  const set = new Set<string>();
  for (const f of fc.features ?? []) {
    const sid = f.properties?.sid;
    if (typeof sid === 'string') {
      set.add(sid);
      if (sid.includes(':')) {
        set.add(sid.split(':')[1]!);
      }
    }
  }
  return set;
}

function getMunicipalityFromIndex(sid: string): string {
  if (!existsSync(SETTLEMENTS_INDEX_JSON)) {
    return sid;
  }
  const index = JSON.parse(readFileSync(SETTLEMENTS_INDEX_JSON, 'utf8')) as {
    settlements?: Array<{ sid: string; mun?: string; mun_code?: string }>;
  };
  const s = index.settlements?.find((x) => x.sid === sid);
  return s?.mun ?? s?.mun_code ?? sid;
}

function run(): void {
  const rawFailures = discoverAndReadPolygonFailures();
  confirmMapBuildReport(rawFailures.length);
  const substrateSids = buildSubstrateSidSet();

  const failures: AuditFailure[] = rawFailures.map((f) => ({
    sid: f.sid,
    municipality: f.mun ?? getMunicipalityFromIndex(f.sid),
    reason: f.reason,
    source_artifact: SOURCE_ARTIFACT,
    has_polygon_in_substrate:
      substrateSids.has(f.sid) || (f.source_id != null && substrateSids.has(f.source_id)),
  }));

  failures.sort((a, b) => (a.sid < b.sid ? -1 : a.sid > b.sid ? 1 : 0));

  const reason_counts: Record<string, number> = {};
  for (const f of failures) {
    reason_counts[f.reason] = (reason_counts[f.reason] ?? 0) + 1;
  }

  const output: AuditOutput = {
    task: 'phase_6e8_polygon_failures',
    count: failures.length,
    failures,
    reason_counts,
  };

  writeFileSync(OUTPUT_JSON, JSON.stringify(output, null, 2), 'utf8');
  writeMarkdown(output);
  process.stdout.write(
    `Phase 6E.8.A audit complete: ${output.count} failures -> ${OUTPUT_JSON}, ${OUTPUT_MD}\n`
  );
}

function writeMarkdown(out: AuditOutput): void {
  const lines: string[] = [
    '# Phase 6E.8 — Polygon simplification failures audit',
    '',
    'Audit-only. No geometry or source/derived data was modified.',
    '',
    '## Summary',
    '',
    `- **Total failures:** ${out.count}`,
    `- **Source artifact:** ${SOURCE_ARTIFACT}`,
    '',
    '## Failed SIDs (sorted by sid)',
    '',
    '| sid | municipality | reason | has_polygon_in_substrate |',
    '| --- | ------------ | ------ | ------------------------ |',
  ];

  for (const f of out.failures) {
    lines.push(
      `| ${f.sid} | ${f.municipality} | ${f.reason} | ${f.has_polygon_in_substrate} |`
    );
  }

  lines.push('', '## Reason histogram', '');
  const sortedReasons = Object.entries(out.reason_counts).sort((a, b) =>
    a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0
  );
  for (const [reason, n] of sortedReasons) {
    lines.push(`- **${reason}:** ${n}`);
  }

  lines.push(
    '',
    '## Fixability',
    '',
    '| Reason | Classification |',
    '| ------ | -------------- |',
    '| Simplification did not produce valid polygon | **requires upstream source correction** — invalid or degenerate geometry that cannot be deterministically repaired without invention (e.g. open ring, self-intersection, or topology failure after simplification). Deterministic repair (e.g. close ring if ≥4 points and first≠last, then revalidate) may be allowed in a later phase only if mistake-log rules explicitly permit it; otherwise escalate to source correction. |',
    '',
    'No deterministic repair was applied in this phase. Any repair must be scoped in a separate phase and must comply with FORAWWV (no invention; audit first).',
    '',
    '## No geometry changed',
    '',
    'This phase did not modify any source or derived geometry. Outputs are read-only audit artifacts.'
  );

  writeFileSync(OUTPUT_MD, lines.join('\n'), 'utf8');
}

run();
