/**
 * Phase H6.9.8b — Audit substrate settlement name fields
 *
 * PURPOSE:
 *   Determine why "settlement names" appear as municipality names (viewer key vs
 *   substrate property corruption). Output fingerprint and verdict.
 *
 * CLI:
 *   --substrate <path>   (required) Path to substrate GeoJSON
 *   --sample <n>         (optional, default 200) Number of features to sample
 *
 * OUTPUTS (data/derived/_debug/, untracked):
 *   substrate_name_field_audit_h6_9_8b.json
 *   substrate_name_field_audit_h6_9_8b.txt
 *
 * Usage: npx tsx scripts/map/phase_h6_9_8b_audit_substrate_name_fields.ts --substrate data/derived/settlements_substrate.geojson
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { computeBboxFromFeatures, computeSha256Hex } from './lib/awwv_contracts.js';


const LABEL_CANDIDATE_KEYS = [
  'name',
  'settlement_name',
  'label',
  'display_name',
  'municipality_name',
  'municipality_id',
  'mun_name',
  'sid',
  'census_id',
] as const;

const ROOT = resolve();
const DEBUG_DIR = resolve(ROOT, 'data/derived/_debug');
const VIEWER_JS_PATH = resolve(ROOT, 'data/derived/substrate_viewer/viewer.js');
const BUILD_INDEX_PATH = resolve(ROOT, 'scripts/map/build_substrate_viewer_index.ts');

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

interface AuditResult {
  phase: string;
  substrate_path: string;
  substrate_sha256: string;
  feature_count: number;
  global_bbox: [number, number, number, number];
  sample_size: number;
  property_keys_present: string[];
  viewer_label_key_in_index_builder: string;
  chosen_label_key_for_audit: string | null;
  top25_label_values: { value: string; count: number }[];
  unique_label_values: number;
  features_with_same_label: number;
  likely_wrong_label_field: boolean;
  verdict: string;
  next_action?: string;
}

function parseArgs(): { substrate: string; sample: number } {
  const args = process.argv.slice(2);
  let substrate = '';
  let sample = 200;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--substrate' && args[i + 1]) {
      substrate = args[i + 1];
      i++;
    } else if (args[i] === '--sample' && args[i + 1]) {
      sample = Math.max(1, parseInt(args[i + 1], 10) || 200);
      i++;
    }
  }
  if (!substrate) {
    console.error('Missing required --substrate <path>');
    process.exit(1);
  }
  return { substrate, sample };
}

function detectViewerLabelKey(): string {
  if (existsSync(BUILD_INDEX_PATH)) {
    const content = readFileSync(BUILD_INDEX_PATH, 'utf8');
    if (content.includes("feature.properties.name || feature.properties.settlement_name")) {
      return 'name or settlement_name (first present)';
    }
    if (content.includes('properties.settlement_name')) return 'settlement_name';
    if (content.includes('properties.name')) return 'name';
  }
  if (existsSync(VIEWER_JS_PATH)) {
    const content = readFileSync(VIEWER_JS_PATH, 'utf8');
    if (content.includes('indexEntry.name')) return 'index entry name (from index builder)';
  }
  return 'unknown';
}

function main(): void {
  const { substrate: substrateArg, sample } = parseArgs();
  const substratePath = resolve(ROOT, substrateArg);
  if (!existsSync(substratePath)) {
    console.error('Substrate file not found:', substratePath);
    process.exit(1);
  }

  const substrateBytes = readFileSync(substratePath);
  const substrateSha256 = computeSha256Hex(substrateBytes);
  const substrate = JSON.parse(substrateBytes.toString('utf8')) as GeoJSONFC;
  if (substrate.type !== 'FeatureCollection' || !Array.isArray(substrate.features)) {
    console.error('Invalid substrate: expected FeatureCollection with features array');
    process.exit(1);
  }

  const features = substrate.features;
  const featureCount = features.length;
  const globalBbox = computeBboxFromFeatures(features);

  const n = Math.min(sample, featureCount);
  const sampled = features.slice(0, n);

  const keysPresent = new Set<string>();
  for (const f of sampled) {
    const p = f.properties || {};
    for (const key of LABEL_CANDIDATE_KEYS) {
      if (p[key] !== undefined && p[key] !== null) keysPresent.add(key);
    }
  }

  const viewerLabelKey = detectViewerLabelKey();
  let chosenLabelKey: string | null = null;
  if (keysPresent.has('name')) chosenLabelKey = 'name';
  else if (keysPresent.has('settlement_name')) chosenLabelKey = 'settlement_name';
  else if (keysPresent.has('label')) chosenLabelKey = 'label';
  else if (keysPresent.has('display_name')) chosenLabelKey = 'display_name';

  const valueCounts = new Map<string, number>();
  for (const f of sampled) {
    const p = f.properties || {};
    const raw = chosenLabelKey ? p[chosenLabelKey] : null;
    const value = raw != null ? String(raw).trim() : '';
    valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
  }

  const sortedEntries = [...valueCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const top25 = sortedEntries.slice(0, 25).map(([value, count]) => ({ value: value || '(empty)', count }));
  const uniqueLabelValues = valueCounts.size;
  const featuresWithSameLabel = sortedEntries.filter(([, c]) => c > 1).reduce((s, [, c]) => s + c, 0);

  let likelyWrongLabelField = false;
  if (chosenLabelKey && top25.length > 0) {
    const manyRepeated = featuresWithSameLabel > n * 0.5;
    const looksLikeMunicipalityNames = top25.some(
      (t) => t.value && /^[A-Za-zčćžšđČĆŽŠĐ\s\-]+$/.test(t.value) && t.value.length < 50
    );
    if (manyRepeated && looksLikeMunicipalityNames) likelyWrongLabelField = true;
    if (chosenLabelKey === 'municipality_name' || chosenLabelKey === 'mun_name') likelyWrongLabelField = true;
  }

  let verdict: string;
  let nextAction: string | undefined;
  if (likelyWrongLabelField && chosenLabelKey === 'name') {
    verdict = 'Substrate property field appears overwritten';
    nextAction = 'Substrate "name" likely holds municipality name. Prefer settlement_name or add settlement name from census/registry.';
  } else if (likelyWrongLabelField && chosenLabelKey === 'settlement_name') {
    verdict = 'Substrate property field appears overwritten';
    nextAction = 'Substrate "settlement_name" holds municipality names (many features share same value). Use settlement registry or census for distinct settlement names.';
  } else if (likelyWrongLabelField && (chosenLabelKey === 'municipality_name' || chosenLabelKey === 'mun_name')) {
    verdict = 'Viewer is using wrong property key';
    nextAction = 'Index builder should use settlement_name or name from settlement registry, not municipality name.';
  } else if (viewerLabelKey.includes('name') && chosenLabelKey === 'name' && likelyWrongLabelField) {
    verdict = 'Both plausible; next action: verify substrate provenance';
    nextAction = 'Compare with restored backup substrate; if backup has distinct settlement names, substrate was overwritten.';
  } else if (!chosenLabelKey) {
    verdict = 'No settlement name field found in substrate';
    nextAction = 'Substrate is missing names; do not invent them. Add settlement name source to pipeline if required.';
  } else {
    verdict = 'Label field appears correct';
    nextAction = undefined;
  }

  const audit: AuditResult = {
    phase: 'H6.9.8b',
    substrate_path: substratePath,
    substrate_sha256: substrateSha256,
    feature_count: featureCount,
    global_bbox: globalBbox,
    sample_size: n,
    property_keys_present: [...keysPresent].sort(),
    viewer_label_key_in_index_builder: viewerLabelKey,
    chosen_label_key_for_audit: chosenLabelKey,
    top25_label_values: top25,
    unique_label_values: uniqueLabelValues,
    features_with_same_label: featuresWithSameLabel,
    likely_wrong_label_field: likelyWrongLabelField,
    verdict,
    ...(nextAction && { next_action: nextAction }),
  };

  mkdirSync(DEBUG_DIR, { recursive: true });
  const jsonPath = resolve(DEBUG_DIR, 'substrate_name_field_audit_h6_9_8b.json');
  const txtPath = resolve(DEBUG_DIR, 'substrate_name_field_audit_h6_9_8b.txt');
  writeFileSync(jsonPath, JSON.stringify(audit, null, 2), 'utf8');

  const lines: string[] = [
    'Phase H6.9.8b — Substrate name field audit',
    '',
    `Substrate: ${substratePath}`,
    `SHA256: ${substrateSha256}`,
    `Feature count: ${featureCount}`,
    `Global bbox: [${globalBbox.join(', ')}]`,
    `Sample size: ${n}`,
    '',
    'Property keys present (candidates): ' + audit.property_keys_present.join(', ') || '(none)',
    `Viewer label key (index builder): ${viewerLabelKey}`,
    `Chosen label key for audit: ${chosenLabelKey ?? '(none)'}`,
    `Unique label values (in sample): ${uniqueLabelValues}`,
    `Features sharing a label (count): ${featuresWithSameLabel}`,
    `Likely wrong label field: ${likelyWrongLabelField}`,
    '',
    `Verdict: ${verdict}`,
    ...(nextAction ? [`Next action: ${nextAction}`] : []),
    '',
    'Top 25 label values:',
    ...top25.map((t) => `  ${t.count}\t${t.value}`),
  ];
  writeFileSync(txtPath, lines.join('\n'), 'utf8');

  process.stdout.write(`Wrote ${jsonPath}\n`);
  process.stdout.write(`Wrote ${txtPath}\n`);
  process.stdout.write(`Verdict: ${verdict}\n`);
}

main();
