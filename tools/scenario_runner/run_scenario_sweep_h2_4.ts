/**
 * Phase H2.4: Deterministic scenario sweep runner.
 * Enumerates scenarios (baselines manifest + data/scenarios/*.json), runs each,
 * extracts metrics from artifacts, produces aggregate_summary.json + .md.
 * STRICT determinism: sweep_id fixed "h2_4_sweep"; no timestamps; stable ordering.
 */

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';


import { checkDataPrereqs, formatMissingRemediation } from '../../src/data_prereq/check_data_prereqs.js';
import { runScenario } from '../../src/scenario/scenario_runner.js';
import { loadScenario } from '../../src/scenario/scenario_loader.js';
import { loadManifestSync, type BaselineManifest } from './run_baseline_regression.js';
import { stableStringify } from '../../src/utils/stable_json.js';


const SWEEP_ID = 'h2_4_sweep';
const SWEEPS_BASE = join(process.cwd(), 'data', 'derived', 'scenario', 'sweeps', 'h2_4');
const MANIFEST_PATH = join(process.cwd(), 'data', 'derived', 'scenario', 'baselines', 'manifest.json');
const SCENARIOS_DIR = join(process.cwd(), 'data', 'scenarios');

export interface SweepScenarioRow {
  scenario_id: string;
  scenario_path: string;
  weeks: number;
  run_dir: string;
  run_id: string;
  phase: string;
  war_started: boolean;
  phase_i_ran: boolean;
  phase_ii_ran: boolean;
  pressure_eligible_max: number;
  front_active_max: number;
  displacement_trigger_max: number;
  aor_total: number;
  control_flips_total: number;
  displacement_settlement_end: number;
  displacement_municipality_end: number;
  formations_initial_total: number;
  formations_final_total: number;
  formations_added_count: number;
  exhaustion_start: Record<string, number>;
  exhaustion_end: Record<string, number>;
  supply_pressure_start: Record<string, number>;
  supply_pressure_end: Record<string, number>;
  classification: 'A_missing_inputs' | 'B_war_gate' | 'C_bug' | 'active';
}

export interface AggregateSummary {
  sweep_id: string;
  scenario_count: number;
  scenarios: SweepScenarioRow[];
}

function sortStr(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Cap total scenarios for sweep runtime (prefer manifest + short-horizon first). Set SWEEP_MAX_WEEKS to limit horizon (e.g. 13). */
const SWEEP_MAX_SCENARIOS = process.env.SWEEP_MAX_SCENARIOS
  ? Math.max(2, parseInt(process.env.SWEEP_MAX_SCENARIOS, 10) || 20)
  : 20;
const SWEEP_MAX_WEEKS = process.env.SWEEP_MAX_WEEKS
  ? Math.max(4, parseInt(process.env.SWEEP_MAX_WEEKS, 10) || 52)
  : 52;

/**
 * List scenario paths: manifest scenarios first (by id), then any under data/scenarios not in manifest (stable sort by scenario_id).
 * Respects SWEEP_MAX_SCENARIOS and SWEEP_MAX_WEEKS when set.
 */
async function listScenarioPaths(): Promise<Array<{ id: string; path: string; weeks: number }>> {
  const entries: Array<{ id: string; path: string; weeks: number }> = [];
  const seenIds = new Set<string>();

  if (existsSync(MANIFEST_PATH)) {
    const raw = await readFile(MANIFEST_PATH, 'utf8');
    const manifest = loadManifestSync(raw) as BaselineManifest;
    for (const s of manifest.scenarios) {
      if (s.weeks <= SWEEP_MAX_WEEKS) {
        entries.push({
          id: s.id,
          path: s.scenario_path,
          weeks: s.weeks
        });
        seenIds.add(s.id);
      }
    }
  }

  if (existsSync(SCENARIOS_DIR)) {
    const files = await readdir(SCENARIOS_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json')).sort(sortStr);
    for (const f of jsonFiles) {
      if (entries.length >= SWEEP_MAX_SCENARIOS) break;
      const path = `data/scenarios/${f}`;
      let id: string;
      let weeks: number;
      try {
        const sc = await loadScenario(join(process.cwd(), path));
        id = sc.scenario_id;
        weeks = sc.weeks;
      } catch {
        continue;
      }
      if (seenIds.has(id)) continue;
      if (weeks > SWEEP_MAX_WEEKS) continue;
      seenIds.add(id);
      entries.push({ id, path, weeks });
    }
  }

  entries.sort((a, b) => sortStr(a.id, b.id));
  return entries.slice(0, SWEEP_MAX_SCENARIOS);
}

/**
 * Parse artifacts in runDir and build one metrics row. Missing files => partial row (zeros where needed).
 */
async function extractMetricsRow(
  scenarioId: string,
  scenarioPath: string,
  weeks: number,
  runDir: string,
  runId: string
): Promise<SweepScenarioRow> {
  const phase = 'phase_ii'; // harness always starts phase_ii
  const war_started = true; // no phase_0 in harness
  const phase_i_ran = false; // harness starts in phase_ii
  const phase_ii_ran = true;

  let pressure_eligible_max = 0;
  let front_active_max = 0;
  let displacement_trigger_max = 0;
  let control_flips_total = 0;
  let displacement_settlement_end = 0;
  let displacement_municipality_end = 0;
  let formations_initial_total = 0;
  let formations_final_total = 0;
  let formations_added_count = 0;
  const exhaustion_start: Record<string, number> = {};
  const exhaustion_end: Record<string, number> = {};
  const supply_pressure_start: Record<string, number> = {};
  const supply_pressure_end: Record<string, number> = {};
  let aor_total = 0;

  const activityPath = join(runDir, 'activity_summary.json');
  if (existsSync(activityPath)) {
    const activity = JSON.parse(await readFile(activityPath, 'utf8')) as {
      metrics?: Record<string, { max?: number }>;
    };
    const m = activity.metrics ?? {};
    pressure_eligible_max = m.pressure_eligible_size?.max ?? 0;
    front_active_max = m.front_active_set_size?.max ?? 0;
    displacement_trigger_max = m.displacement_trigger_eligible_size?.max ?? 0;
  }

  const controlDeltaPath = join(runDir, 'control_delta.json');
  if (existsSync(controlDeltaPath)) {
    const cd = JSON.parse(await readFile(controlDeltaPath, 'utf8')) as { total_flips?: number };
    control_flips_total = cd.total_flips ?? 0;
  }

  const formationDeltaPath = join(runDir, 'formation_delta.json');
  if (existsSync(formationDeltaPath)) {
    const fd = JSON.parse(await readFile(formationDeltaPath, 'utf8')) as {
      formations_added?: unknown[];
      counts_initial_by_kind?: Record<string, number>;
      counts_final_by_kind?: Record<string, number>;
    };
    formations_added_count = Array.isArray(fd.formations_added) ? fd.formations_added.length : 0;
    const ci = fd.counts_initial_by_kind ?? {};
    const cf = fd.counts_final_by_kind ?? {};
    formations_initial_total = Object.values(ci).reduce((a, b) => a + b, 0);
    formations_final_total = Object.values(cf).reduce((a, b) => a + b, 0);
  }

  const weeklyPath = join(runDir, 'weekly_report.jsonl');
  if (existsSync(weeklyPath)) {
    const lines = (await readFile(weeklyPath, 'utf8')).trim().split('\n').filter(Boolean);
    if (lines.length > 0) {
      const first = JSON.parse(lines[0]!) as {
        factions?: Array<{ id: string; exhaustion?: number; supply_pressure?: number }>;
        settlement_displacement_total?: number;
        municipality_displacement_total?: number;
      };
      const last = JSON.parse(lines[lines.length - 1]!) as typeof first;
      for (const f of first.factions ?? []) {
        exhaustion_start[f.id] = f.exhaustion ?? 0;
        supply_pressure_start[f.id] = f.supply_pressure ?? 0;
      }
      for (const f of last.factions ?? []) {
        exhaustion_end[f.id] = f.exhaustion ?? 0;
        supply_pressure_end[f.id] = f.supply_pressure ?? 0;
      }
      displacement_settlement_end = last.settlement_displacement_total ?? 0;
      displacement_municipality_end = last.municipality_displacement_total ?? 0;
    }
  }

  const finalSavePath = join(runDir, 'final_save.json');
  if (existsSync(finalSavePath)) {
    const state = JSON.parse(await readFile(finalSavePath, 'utf8')) as {
      factions?: Array<{ areasOfResponsibility?: unknown[] }>;
    };
    for (const fa of state.factions ?? []) {
      aor_total += Array.isArray(fa.areasOfResponsibility) ? fa.areasOfResponsibility.length : 0;
    }
  }

  let classification: SweepScenarioRow['classification'] = 'active';
  if (control_flips_total === 0 && formations_added_count === 0 && front_active_max > 0 && pressure_eligible_max > 0) {
    classification = 'A_missing_inputs'; // activity but no control/formation change → missing directives
  } else if (front_active_max === 0 && pressure_eligible_max === 0) {
    classification = 'B_war_gate'; // no activity → gate/phase never enabled
  }
  // C_bug only if we detect contradiction with docs; leave as active otherwise

  return {
    scenario_id: scenarioId,
    scenario_path: scenarioPath,
    weeks,
    run_dir: runDir.replace(process.cwd(), '').replace(/^[/\\]/, '') || runDir,
    run_id: runId,
    phase,
    war_started,
    phase_i_ran,
    phase_ii_ran,
    pressure_eligible_max,
    front_active_max,
    displacement_trigger_max,
    aor_total,
    control_flips_total,
    displacement_settlement_end,
    displacement_municipality_end,
    formations_initial_total,
    formations_final_total,
    formations_added_count,
    exhaustion_start,
    exhaustion_end,
    supply_pressure_start,
    supply_pressure_end,
    classification
  };
}

/**
 * Run sweep: for each scenario run into sweep dir, extract metrics, write aggregate summary.
 */
export async function runSweep(): Promise<AggregateSummary> {
  const scenarios = await listScenarioPaths();
  const sweepOutBase = join(SWEEPS_BASE, SWEEP_ID);
  await mkdir(sweepOutBase, { recursive: true });

  const rows: SweepScenarioRow[] = [];
  for (const s of scenarios) {
    const scenarioPath = join(process.cwd(), s.path);
    const outDirOverride = join(sweepOutBase, s.id);
    const result = await runScenario({
      scenarioPath,
      outDirBase: sweepOutBase,
      outDirOverride
    });
    const row = await extractMetricsRow(
      s.id,
      s.path,
      s.weeks,
      result.outDir,
      result.run_id
    );
    rows.push(row);
  }

  const summary: AggregateSummary = {
    sweep_id: SWEEP_ID,
    scenario_count: rows.length,
    scenarios: rows
  };

  const summaryJsonPath = join(sweepOutBase, 'aggregate_summary.json');
  await writeFile(summaryJsonPath, stableStringify(summary, 2) + '\n', 'utf8');

  const summaryMdPath = join(sweepOutBase, 'aggregate_summary.md');
  await writeFile(summaryMdPath, formatAggregateMarkdown(summary), 'utf8');

  return summary;
}

function formatAggregateMarkdown(summary: AggregateSummary): string {
  const lines: string[] = [
    `# Scenario sweep: ${summary.sweep_id}`,
    '',
    `Scenario count: ${summary.scenario_count}`,
    ''
  ];
  for (const r of summary.scenarios) {
    lines.push(`## ${r.scenario_id}`);
    lines.push(`- Path: ${r.scenario_path}, weeks: ${r.weeks}`);
    lines.push(`- Run dir: ${r.run_dir}`);
    lines.push(`- Phase: ${r.phase}, war_started: ${r.war_started}, phase_ii_ran: ${r.phase_ii_ran}`);
    lines.push(`- Activity: front_active_max=${r.front_active_max}, pressure_eligible_max=${r.pressure_eligible_max}`);
    lines.push(`- Control flips: ${r.control_flips_total}, AoR total: ${r.aor_total}`);
    lines.push(`- Formations: initial=${r.formations_initial_total}, final=${r.formations_final_total}, added=${r.formations_added_count}`);
    lines.push(`- Displacement end: settlement=${r.displacement_settlement_end}, municipality=${r.displacement_municipality_end}`);
    lines.push(`- Classification: ${r.classification}`);
    lines.push('');
  }
  return lines.join('\n');
}

async function main(): Promise<void> {
  const prereq = checkDataPrereqs();
  if (!prereq.ok) {
    process.stderr.write(formatMissingRemediation(prereq));
    process.exitCode = 1;
    return;
  }
  const summary = await runSweep();
  process.stdout.write(`Sweep complete: ${summary.scenario_count} scenarios → data/derived/scenario/sweeps/h2_4/${SWEEP_ID}/\n`);
  process.stdout.write(`  aggregate_summary.json\n  aggregate_summary.md\n`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
