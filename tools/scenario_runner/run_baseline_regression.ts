/**
 * Phase H2.3: Golden baseline regression for scenario harness.
 * Compares run artifacts (SHA256) to committed baselines. Default: fail on mismatch.
 * Baseline updates only when UPDATE_BASELINES=1.
 */

import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';


import { checkDataPrereqs, formatMissingRemediation } from '../../src/data_prereq/check_data_prereqs.js';
import { runScenario } from '../../src/scenario/scenario_runner.js';
import { loadScenario, computeRunId } from '../../src/scenario/scenario_loader.js';
import { stableStringify } from '../../src/utils/stable_json.js';


/** Artifacts to baseline (sorted; hashes only; no paths in content). end_report.md is deterministic (no timestamps, stable ordering). */
const ARTIFACTS = [
  'activity_summary.json',
  'control_delta.json',
  'control_events.jsonl',
  'end_report.md',
  'formation_delta.json',
  'final_save.json',
  'run_summary.json',
  'weekly_report.jsonl'
].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

const BASELINES_DIR = join(process.cwd(), 'data', 'derived', 'scenario', 'baselines');
const MANIFEST_PATH = join(BASELINES_DIR, 'manifest.json');
const BASE_TMP = join(process.cwd(), 'data', 'derived', 'scenario', '_baseline_tmp');

/**
 * Baseline scenarios: noop_4w (quick sanity), baseline_ops_4w (displacement activity).
 * No existing scenario sets war/declared so Phase I control flips do not occur; document gap.
 */
const DEFAULT_SCENARIOS: Array<{ id: string; scenario_path: string; weeks?: number }> = [
  { id: 'noop_4w', scenario_path: 'data/scenarios/noop_4w.json', weeks: 4 },
  { id: 'baseline_ops_4w', scenario_path: 'data/scenarios/baseline_ops_4w.json', weeks: 4 }
];

export interface ScenarioBaselineEntry {
  id: string;
  scenario_path: string;
  weeks: number;
  expected_files: string[];
  hashes: Record<string, string>;
}

export interface BaselineManifest {
  schema_version: number;
  artifacts: string[];
  scenarios: ScenarioBaselineEntry[];
}

function sha256Hex(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function hashFileIfPresent(dir: string, name: string): Promise<string | null> {
  const path = join(dir, name);
  if (!existsSync(path)) return null;
  const buf = await readFile(path);
  return sha256Hex(buf);
}

/**
 * Run one scenario into a temp dir and hash all baseline artifacts.
 */
export async function runScenarioAndHash(
  scenarioPath: string,
  outDir: string,
  artifactNames: string[]
): Promise<{ hashes: Record<string, string>; runDir: string }> {
  const result = await runScenario({
    scenarioPath: join(process.cwd(), scenarioPath),
    outDirBase: join(outDir, '_dummy'),
    outDirOverride: outDir
  });
  const hashes: Record<string, string> = {};
  for (const name of artifactNames.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
    const h = await hashFileIfPresent(result.outDir, name);
    if (h != null) hashes[name] = h;
  }
  return { hashes, runDir: result.outDir };
}

export function loadManifestSync(content: string): BaselineManifest {
  const raw = JSON.parse(content) as unknown;
  if (typeof raw !== 'object' || raw === null) throw new Error('manifest.json: invalid root');
  const m = raw as Record<string, unknown>;
  if (!Array.isArray(m.artifacts)) throw new Error('manifest.json: missing or invalid artifacts');
  if (!Array.isArray(m.scenarios)) throw new Error('manifest.json: missing or invalid scenarios');
  return {
    schema_version: (m.schema_version as number) ?? 1,
    artifacts: (m.artifacts as string[]).slice().sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
    scenarios: (m.scenarios as ScenarioBaselineEntry[]).map((s) => ({
      ...s,
      expected_files: (s.expected_files ?? []).slice().sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
      hashes: s.hashes && typeof s.hashes === 'object' ? { ...s.hashes } : {}
    }))
  };
}

function formatMismatchReport(
  scenarioId: string,
  artifact: string,
  expectedHash: string,
  actualHash: string,
  runDir: string
): string {
  return [
    `Baseline mismatch: scenario=${scenarioId} artifact=${artifact}`,
    `  expected: ${expectedHash}`,
    `  actual:   ${actualHash}`,
    `  run dir:  ${runDir}`
  ].join('\n');
}

/**
 * Compare current run hashes to manifest. Throws on first mismatch with clear report.
 */
export async function compareAgainstBaselines(manifest: BaselineManifest): Promise<void> {
  await mkdir(BASE_TMP, { recursive: true });
  for (const entry of manifest.scenarios) {
    const outDir = join(BASE_TMP, entry.id);
    const { hashes: actualHashes, runDir } = await runScenarioAndHash(
      entry.scenario_path,
      outDir,
      manifest.artifacts
    );
    for (const name of manifest.artifacts) {
      const expected = entry.hashes[name];
      if (expected == null) continue;
      const actual = actualHashes[name];
      if (actual == null) {
        throw new Error(
          formatMismatchReport(entry.id, name, expected, '(file missing)', runDir)
        );
      }
      if (actual !== expected) {
        throw new Error(formatMismatchReport(entry.id, name, expected, actual, runDir));
      }
    }
  }
}

/**
 * Build or update manifest from current runs. Use when UPDATE_BASELINES=1.
 */
export async function updateBaselines(manifest: BaselineManifest | null): Promise<BaselineManifest> {
  const scenariosToRun =
    manifest?.scenarios ??
    (await Promise.all(
      DEFAULT_SCENARIOS.map(async (s) => {
        const sc = await loadScenario(join(process.cwd(), s.scenario_path));
        return {
          id: s.id,
          scenario_path: s.scenario_path,
          weeks: s.weeks ?? sc.weeks,
          expected_files: ARTIFACTS.slice(),
          hashes: {} as Record<string, string>
        };
      })
    ));
  const resolved: ScenarioBaselineEntry[] = [];
  await mkdir(BASE_TMP, { recursive: true });
  for (const entry of scenariosToRun) {
    const weeks = typeof entry.weeks === 'number' ? entry.weeks : (await loadScenario(join(process.cwd(), entry.scenario_path))).weeks;
    const outDir = join(BASE_TMP, entry.id);
    const { hashes } = await runScenarioAndHash(entry.scenario_path, outDir, ARTIFACTS);
    const hashesSorted: Record<string, string> = {};
    for (const k of Object.keys(hashes).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
      hashesSorted[k] = hashes[k];
    }
    resolved.push({
      id: entry.id,
      scenario_path: entry.scenario_path,
      weeks,
      expected_files: ARTIFACTS.slice(),
      hashes: hashesSorted
    });
  }
  resolved.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return {
    schema_version: 1,
    artifacts: ARTIFACTS.slice(),
    scenarios: resolved
  };
}

async function main(): Promise<void> {
  const prereqResult = checkDataPrereqs();
  if (!prereqResult.ok) {
    process.stderr.write(formatMissingRemediation(prereqResult));
    process.exitCode = 1;
    return;
  }
  const updateBaselinesEnv = process.env.UPDATE_BASELINES === '1';
  let manifest: BaselineManifest | null = null;
  if (existsSync(MANIFEST_PATH)) {
    const content = await readFile(MANIFEST_PATH, 'utf8');
    manifest = loadManifestSync(content);
  }
  if (updateBaselinesEnv) {
    const next = await updateBaselines(manifest);
    await mkdir(BASELINES_DIR, { recursive: true });
    await writeFile(MANIFEST_PATH, stableStringify(next, 2) + '\n', 'utf8');
    process.stdout.write(`Updated ${MANIFEST_PATH}\n`);
    return;
  }
  if (!manifest || manifest.scenarios.length === 0) {
    process.stderr.write(
      `No manifest at ${MANIFEST_PATH}. Run with UPDATE_BASELINES=1 to create baselines.\n`
    );
    process.exitCode = 1;
    return;
  }
  await compareAgainstBaselines(manifest);
  process.stdout.write('Baseline regression: all scenarios match.\n');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
