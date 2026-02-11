/**
 * Phase H1.11: Baseline ops sensitivity harness (scenario-only, deterministic).
 * Runs multiple (scalar, weeks, scope) tuples; produces per-run metrics and aggregated report.
 * No mechanics changes; no timestamps; stable ordering.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { runScenario } from './scenario_runner.js';
import { stableStringify } from '../utils/stable_json.js';
import type { BaselineOpsScopeMode } from './scenario_runner.js';

/** Default intensity scalars (harness default set). */
export const DEFAULT_SCALARS = [0.25, 0.5, 1.0, 2.0, 4.0];

/** Default duration weeks (104 available but not default in tests). */
export const DEFAULT_WEEKS = [26, 52];

/** Default scope modes. */
export const DEFAULT_SCOPE_MODES: BaselineOpsScopeMode[] = [
  'all_front_active',
  'static_front_only',
  'fluid_front_only'
];

export interface SensitivityConfig {
  scalars: number[];
  weeks: number[];
  scope_modes: BaselineOpsScopeMode[];
  outDir: string;
  scenarioDir: string;
}

export interface PerRunMetrics {
  scope: BaselineOpsScopeMode;
  weeks: number;
  scalar: number;
  factions: {
    exhaustion_end: Record<string, number>;
  };
  displacement_end_mean: number;
  displacement_end_p95: number;
  displacement_end_max: number;
  front_count_end?: number;
  stability_mix_end?: Record<string, number>;
}

export interface SensitivityReportMeta {
  scenarios: string[];
  scalars: number[];
  weeks: number[];
  scope_modes: string[];
  deterministic_note: string;
}

export interface SensitivityChecks {
  monotonicity: { pass: boolean; counterexamples?: string[] };
  intensity_ordering: { pass: boolean; counterexamples?: string[] };
}

export interface BaselineOpsSensitivityReport {
  meta: SensitivityReportMeta;
  per_run: PerRunMetrics[];
  checks: SensitivityChecks;
}

function strictCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function recordFromFactionKeys(obj: Record<string, number> | undefined): Record<string, number> {
  if (!obj || typeof obj !== 'object') return {};
  const out: Record<string, number> = {};
  for (const k of Object.keys(obj).sort(strictCompare)) {
    const v = obj[k];
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

function displacementStats(sd: Record<string, number> | undefined): {
  mean: number;
  p95: number;
  max: number;
} {
  if (!sd || typeof sd !== 'object') return { mean: 0, p95: 0, max: 0 };
  const values = Object.values(sd).filter((v) => typeof v === 'number' && Number.isFinite(v)) as number[];
  if (values.length === 0) return { mean: 0, p95: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / sorted.length;
  const p95Idx = Math.min(sorted.length - 1, Math.floor(0.95 * sorted.length));
  const p95 = sorted[p95Idx] ?? 0;
  const max = sorted[sorted.length - 1] ?? 0;
  return { mean, p95, max };
}

/** Build per-run folder name: run_{scope}_{weeks}w_x{scalar}. */
function runFolderName(scope: BaselineOpsScopeMode, weeks: number, scalar: number): string {
  const scalarStr = String(scalar).replace('.', '_');
  return `run_${scope}_${weeks}w_x${scalarStr}`;
}

/** Scenario path for weeks (26 or 52). */
function scenarioPathForWeeks(scenarioDir: string, weeks: number): string {
  return join(scenarioDir, `baseline_ops_${weeks}w.json`);
}

/**
 * Run one sensitivity run; return metrics and outDir.
 */
async function runOne(
  config: SensitivityConfig,
  scope: BaselineOpsScopeMode,
  weeks: number,
  scalar: number
): Promise<{ outDir: string; metrics: PerRunMetrics }> {
  const runFolder = runFolderName(scope, weeks, scalar);
  const outDir = join(config.outDir, runFolder);
  const scenarioPath = scenarioPathForWeeks(config.scenarioDir, weeks);

  await runScenario({
    scenarioPath,
    outDirBase: config.outDir,
    outDirOverride: outDir,
    scopeMode: scope,
    baselineOpsScalar: scalar
  });

  const finalSaveRaw = await readFile(join(outDir, 'final_save.json'), 'utf8');
  const finalSave = JSON.parse(finalSaveRaw) as {
    phase_ii_exhaustion?: Record<string, number>;
    settlement_displacement?: Record<string, number>;
  };

  const exhaustion_end = recordFromFactionKeys(finalSave.phase_ii_exhaustion);
  const disp = displacementStats(finalSave.settlement_displacement);

  const metrics: PerRunMetrics = {
    scope,
    weeks,
    scalar,
    factions: { exhaustion_end },
    displacement_end_mean: disp.mean,
    displacement_end_p95: disp.p95,
    displacement_end_max: disp.max
  };

  const metricsPath = join(outDir, 'sensitivity_run_metrics.json');
  await writeFile(metricsPath, stableStringify(metrics, 2), 'utf8');

  return { outDir, metrics };
}

/**
 * Check monotonicity: exhaustion and displacement non-decreasing week over week in weekly_report.
 */
async function checkMonotonicity(outDir: string): Promise<{ pass: boolean; counterexamples: string[] }> {
  const counterexamples: string[] = [];
  const raw = await readFile(join(outDir, 'weekly_report.jsonl'), 'utf8');
  const lines = raw.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return { pass: true, counterexamples };

  let prevEx: Record<string, number> = {};
  let prevDispTotal = 0;
  for (let i = 0; i < lines.length; i++) {
    const row = JSON.parse(lines[i]!) as {
      factions?: Array<{ id: string; exhaustion?: number }>;
      settlement_displacement_total?: number;
    };
    const exMap = new Map((row.factions ?? []).map((f) => [f.id, f.exhaustion ?? 0]));
    const dispTotal = row.settlement_displacement_total ?? 0;
    if (i > 0) {
      for (const [fid, ex] of exMap) {
        const prev = prevEx[fid] ?? 0;
        if (ex < prev) {
          counterexamples.push(`week ${i} faction ${fid} exhaustion ${ex} < prev ${prev}`);
        }
      }
      if (dispTotal < prevDispTotal) {
        counterexamples.push(`week ${i} settlement_displacement_total ${dispTotal} < prev ${prevDispTotal}`);
      }
    }
    prevEx = Object.fromEntries(exMap);
    prevDispTotal = dispTotal;
  }
  return { pass: counterexamples.length === 0, counterexamples };
}

/**
 * Check intensity ordering: for same (scope, weeks), higher scalar => exhaustion_end and displacement_mean >=.
 */
function checkIntensityOrdering(per_run: PerRunMetrics[]): { pass: boolean; counterexamples: string[] } {
  const counterexamples: string[] = [];
  const byKey = new Map<string, PerRunMetrics[]>();
  for (const r of per_run) {
    const key = `${r.scope}\t${r.weeks}`;
    const list = byKey.get(key) ?? [];
    list.push(r);
    byKey.set(key, list);
  }
  for (const list of byKey.values()) {
    list.sort((a, b) => a.scalar - b.scalar);
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1]!;
      const curr = list[i]!;
      const factionIds = Object.keys(curr.factions.exhaustion_end).sort(strictCompare);
      for (const fid of factionIds) {
        const prevEx = prev.factions.exhaustion_end[fid] ?? 0;
        const currEx = curr.factions.exhaustion_end[fid] ?? 0;
        if (currEx < prevEx) {
          counterexamples.push(
            `scope=${curr.scope} weeks=${curr.weeks} scalar ${prev.scalar}->${curr.scalar} faction ${fid} exhaustion ${prevEx}->${currEx}`
          );
        }
      }
      if (curr.displacement_end_mean < prev.displacement_end_mean) {
        counterexamples.push(
          `scope=${curr.scope} weeks=${curr.weeks} scalar ${prev.scalar}->${curr.scalar} displacement_mean ${prev.displacement_end_mean}->${curr.displacement_end_mean}`
        );
      }
    }
  }
  return { pass: counterexamples.length === 0, counterexamples };
}

/**
 * Sort per_run by (scope, weeks, scalar) for stable output.
 */
function sortPerRun(per_run: PerRunMetrics[]): PerRunMetrics[] {
  return [...per_run].sort((a, b) => {
    const c0 = strictCompare(a.scope, b.scope);
    if (c0 !== 0) return c0;
    if (a.weeks !== b.weeks) return a.weeks - b.weeks;
    return a.scalar - b.scalar;
  });
}

/**
 * Run full sensitivity harness; write per-run artifacts and aggregated report.
 * Fails hard on monotonicity or intensity ordering violation.
 */
export async function runSensitivityHarness(config: SensitivityConfig): Promise<BaselineOpsSensitivityReport> {
  await mkdir(config.outDir, { recursive: true });

  const per_run: PerRunMetrics[] = [];
  const monotonicityCounterexamples: string[] = [];

  for (const scope of config.scope_modes) {
    for (const weeks of config.weeks) {
      const scenarioPath = scenarioPathForWeeks(config.scenarioDir, weeks);
      try {
        await readFile(scenarioPath, 'utf8');
      } catch {
        continue;
      }
      for (const scalar of config.scalars) {
        const { metrics } = await runOne(config, scope, weeks, scalar);
        per_run.push(metrics);
        const runFolder = runFolderName(scope, weeks, scalar);
        const outDir = join(config.outDir, runFolder);
        const mono = await checkMonotonicity(outDir);
        if (!mono.pass) {
          monotonicityCounterexamples.push(...mono.counterexamples.map((c) => `[${runFolder}] ${c}`));
        }
      }
    }
  }

  const sortedPerRun = sortPerRun(per_run);
  const intensityCheck = checkIntensityOrdering(sortedPerRun);

  const report: BaselineOpsSensitivityReport = {
    meta: {
      scenarios: config.scope_modes.map((s) => `baseline_ops_*w (${s})`),
      scalars: [...config.scalars].sort((a, b) => a - b),
      weeks: [...config.weeks].sort((a, b) => a - b),
      scope_modes: [...config.scope_modes],
      deterministic_note: 'No timestamps; stable sort by (scope, weeks, scalar).'
    },
    per_run: sortedPerRun,
    checks: {
      monotonicity: {
        pass: monotonicityCounterexamples.length === 0,
        counterexamples:
          monotonicityCounterexamples.length > 0 ? monotonicityCounterexamples : undefined
      },
      intensity_ordering: {
        pass: intensityCheck.pass,
        counterexamples: intensityCheck.counterexamples
      }
    }
  };

  const reportPath = join(config.outDir, 'baseline_ops_sensitivity_report.json');
  await writeFile(reportPath, stableStringify(report, 2), 'utf8');

  if (monotonicityCounterexamples.length > 0) {
    throw new Error(`Monotonicity violation: ${monotonicityCounterexamples.join('; ')}`);
  }
  if (!intensityCheck.pass && intensityCheck.counterexamples && intensityCheck.counterexamples.length > 0) {
    throw new Error(`Intensity ordering violation: ${intensityCheck.counterexamples.join('; ')}`);
  }

  return report;
}
