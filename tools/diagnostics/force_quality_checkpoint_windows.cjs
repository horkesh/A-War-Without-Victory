#!/usr/bin/env node
/**
 * Force Quality Checkpoint/Window Diagnostic.
 *
 * Read-only extractor for the force-quality trajectory audit. Consumes existing
 * run artifacts and emits deterministic JSON grouped by fixed checkpoint turns
 * and date windows. No source, scenario, or run files are modified.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const FACTIONS = ['HRHB', 'RBiH', 'RS'];
const CHECKPOINTS = [40, 104, 156, 188];
const WINDOWS = [
  { key: '0-40', start: 0, end: 40 },
  { key: '40-104', start: 40, end: 104 },
  { key: '104-156', start: 104, end: 156 },
  { key: '156-188', start: 156, end: 188 },
  { key: '183-188', start: 183, end: 188 },
];
const BRIGADE_METRICS = ['cohesion', 'fatigue', 'morale', 'officer_quality', 'personnel'];
const TRAIT_METRICS = [
  'axis_coordination',
  'failure_recovery',
  'operation_readiness',
  'reserve_response',
  'staging_reliability',
  'support_delivery',
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const out = [];
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (t) out.push(JSON.parse(t));
  }
  return out;
}

function mean(xs) {
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function pctile(sortedXs, q) {
  if (!sortedXs.length) return null;
  if (sortedXs.length === 1) return sortedXs[0];
  const idx = q * (sortedXs.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedXs[lo];
  const frac = idx - lo;
  return sortedXs[lo] * (1 - frac) + sortedXs[hi] * frac;
}

function summarize(xs) {
  const sorted = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  return {
    mean: mean(sorted),
    p25: pctile(sorted, 0.25),
    p75: pctile(sorted, 0.75),
  };
}

function emptyMetricSummary() {
  const out = { active_brigades: 0 };
  for (const metric of BRIGADE_METRICS) out[metric] = { mean: null, p25: null, p75: null };
  return out;
}

function buildCheckpoints(rows) {
  const activeRows = rows
    .filter((r) => r && r.kind === 'brigade' && r.status === 'active' && Number.isFinite(Number(r.turn)))
    .sort((a, b) => {
      const dt = Number(a.turn) - Number(b.turn);
      if (dt !== 0) return dt;
      const fa = String(a.faction || '');
      const fb = String(b.faction || '');
      if (fa !== fb) return fa < fb ? -1 : 1;
      return String(a.brigade_id || '').localeCompare(String(b.brigade_id || ''));
    });
  const byTurnFaction = new Map();
  for (const row of activeRows) {
    const key = `${Number(row.turn)}|${row.faction}`;
    let bucket = byTurnFaction.get(key);
    if (!bucket) {
      bucket = [];
      byTurnFaction.set(key, bucket);
    }
    bucket.push(row);
  }
  const availableTurns = Array.from(new Set(activeRows.map((r) => Number(r.turn)))).sort((a, b) => a - b);
  const out = {};
  for (const checkpoint of CHECKPOINTS) {
    let observedTurn = null;
    for (const turn of availableTurns) {
      if (turn <= checkpoint) observedTurn = turn;
      else break;
    }
    out[String(checkpoint)] = {};
    for (const faction of FACTIONS) {
      if (observedTurn === null) {
        out[String(checkpoint)][faction] = emptyMetricSummary();
        continue;
      }
      const bucket = byTurnFaction.get(`${observedTurn}|${faction}`) || [];
      const cell = { active_brigades: bucket.length, observed_turn: observedTurn };
      for (const metric of BRIGADE_METRICS) {
        const vals = [];
        for (const row of bucket) {
          const v = Number(row[metric]);
          if (Number.isFinite(v)) vals.push(v);
        }
        cell[metric] = summarize(vals);
      }
      out[String(checkpoint)][faction] = cell;
    }
  }
  return out;
}

function windowsForTurn(turn) {
  const keys = [];
  for (const w of WINDOWS) {
    if (turn >= w.start && turn < w.end) keys.push(w.key);
  }
  return keys;
}

function emptyWeeklyCell() {
  return {
    unique_ops: 0,
    diagnostic_rows: 0,
    planning_rows: 0,
    execution_rows: 0,
    recovery_rows: 0,
    attack_attempt_count: 0,
    battle_count: 0,
    objective_attempt_count: 0,
    objective_capture_count: 0,
    movement_order_count: 0,
    eligible_attacker_count: 0,
    max_participating_brigades: 0,
    avg_participating_brigades: null,
  };
}

function initWindowFactionCells(makeCell) {
  const out = {};
  for (const w of WINDOWS) {
    out[w.key] = {};
    for (const faction of FACTIONS) out[w.key][faction] = makeCell();
  }
  return out;
}

function phaseKind(phase) {
  const p = String(phase || '').toLowerCase();
  if (p.includes('plan') || p.includes('prep') || p.includes('stage')) return 'planning_rows';
  if (p.includes('recover') || p.includes('complete') || p.includes('finish')) return 'recovery_rows';
  return 'execution_rows';
}

function buildWeeklyWindows(rows) {
  const out = initWindowFactionCells(emptyWeeklyCell);
  const opSets = {};
  const brigadeSums = {};
  for (const w of WINDOWS) {
    opSets[w.key] = {};
    brigadeSums[w.key] = {};
    for (const faction of FACTIONS) {
      opSets[w.key][faction] = new Set();
      brigadeSums[w.key][faction] = { sum: 0, rows: 0 };
    }
  }
  for (const row of rows) {
    const week = Number(row.week_index);
    if (!Number.isFinite(week)) continue;
    const windows = windowsForTurn(week);
    if (!windows.length) continue;
    const diagnostics = Array.isArray(row.operation_diagnostics) ? row.operation_diagnostics : [];
    for (const diag of diagnostics) {
      const faction = diag.faction_id || diag.faction;
      if (!FACTIONS.includes(faction)) continue;
      for (const window of windows) {
        const cell = out[window][faction];
        cell.diagnostic_rows += 1;
        const opId = diag.operation_id || diag.operation_name || `${week}:${cell.diagnostic_rows}`;
        opSets[window][faction].add(String(opId));
        const phaseCounter = phaseKind(diag.operation_phase);
        cell[phaseCounter] += 1;
        for (const field of [
          'attack_attempt_count',
          'battle_count',
          'objective_attempt_count',
          'objective_capture_count',
          'movement_order_count',
          'eligible_attacker_count',
        ]) {
          const v = Number(diag[field]);
          if (Number.isFinite(v)) cell[field] += v;
        }
        const bCount = Array.isArray(diag.participating_brigades) ? diag.participating_brigades.length : 0;
        cell.max_participating_brigades = Math.max(cell.max_participating_brigades, bCount);
        brigadeSums[window][faction].sum += bCount;
        brigadeSums[window][faction].rows += 1;
      }
    }
  }
  for (const w of WINDOWS) {
    for (const faction of FACTIONS) {
      const cell = out[w.key][faction];
      cell.unique_ops = opSets[w.key][faction].size;
      const b = brigadeSums[w.key][faction];
      cell.avg_participating_brigades = b.rows ? b.sum / b.rows : null;
    }
  }
  return out;
}

function emptyCompletedCell() {
  const traits = {};
  for (const trait of TRAIT_METRICS) traits[trait] = { mean: null };
  return {
    ops: 0,
    total_attacks: 0,
    objectives_captured: 0,
    objectives_logged_captured: 0,
    movement_only_ops: 0,
    staging_failures: 0,
    multi_brigade_3plus: 0,
    multi_brigade_5plus: 0,
    multi_axis_2plus: 0,
    max_brigades: 0,
    max_axes: 0,
    traits,
  };
}

function buildCompletedOperations(ops) {
  const out = initWindowFactionCells(emptyCompletedCell);
  const traitValues = {};
  for (const w of WINDOWS) {
    traitValues[w.key] = {};
    for (const faction of FACTIONS) {
      traitValues[w.key][faction] = {};
      for (const trait of TRAIT_METRICS) traitValues[w.key][faction][trait] = [];
    }
  }
  const sortedOps = (Array.isArray(ops) ? ops : []).slice().sort((a, b) => {
    const dt = Number(a.started_turn || 0) - Number(b.started_turn || 0);
    if (dt !== 0) return dt;
    return String(a.operation_id || '').localeCompare(String(b.operation_id || ''));
  });
  for (const op of sortedOps) {
    const faction = op.faction;
    if (!FACTIONS.includes(faction)) continue;
    const started = Number(op.started_turn || 0);
    const windows = windowsForTurn(started);
    if (!windows.length) continue;
    for (const window of windows) {
      const cell = out[window][faction];
      cell.ops += 1;
      const attacks = Number(op.total_attacks || 0);
      cell.total_attacks += attacks;
      const captured = Array.isArray(op.objectives_captured) ? op.objectives_captured.length : 0;
      const logged = Array.isArray(op.objectives_logged_captured) ? op.objectives_logged_captured.length : 0;
      cell.objectives_captured += captured;
      cell.objectives_logged_captured += logged;
      if (attacks === 0) cell.movement_only_ops += 1;
      const outcome = String(op.outcome || '').toLowerCase();
      if (outcome.includes('staging') || outcome.includes('abandon') || outcome === 'preparation_failed' || outcome === 'aborted') {
        cell.staging_failures += 1;
      }
      const bCount = Array.isArray(op.participating_brigades) ? op.participating_brigades.length : 0;
      if (bCount >= 3) cell.multi_brigade_3plus += 1;
      if (bCount >= 5) cell.multi_brigade_5plus += 1;
      cell.max_brigades = Math.max(cell.max_brigades, bCount);
      const axes = Array.isArray(op.axis_summaries) ? op.axis_summaries.length : 0;
      if (axes >= 2) cell.multi_axis_2plus += 1;
      cell.max_axes = Math.max(cell.max_axes, axes);
      const traits = op.force_quality_traits_at_launch && op.force_quality_traits_at_launch.traits;
      if (traits && typeof traits === 'object') {
        for (const trait of TRAIT_METRICS) {
          const v = Number(traits[trait]);
          if (Number.isFinite(v)) traitValues[window][faction][trait].push(v);
        }
      }
    }
  }
  for (const w of WINDOWS) {
    for (const faction of FACTIONS) {
      for (const trait of TRAIT_METRICS) {
        out[w.key][faction].traits[trait].mean = mean(traitValues[w.key][faction][trait]);
      }
    }
  }
  return out;
}

function buildReport(runDir) {
  const summaryPath = path.join(runDir, 'run_summary.json');
  const brigadePath = path.join(runDir, 'brigade_temporal_log.jsonl');
  if (!fs.existsSync(summaryPath)) throw new Error(`missing run_summary.json: ${summaryPath}`);
  if (!fs.existsSync(brigadePath)) throw new Error(`missing brigade_temporal_log.jsonl: ${brigadePath}`);
  const summary = readJson(summaryPath);
  const brigadeRows = readJsonl(brigadePath);
  const weeklyRows = readJsonl(path.join(runDir, 'weekly_report.jsonl'));
  const aarsPath = path.join(runDir, 'operation_aars.json');
  const aars = fs.existsSync(aarsPath) ? readJson(aarsPath) : [];
  return {
    run: {
      run_dir: path.basename(runDir),
      weeks: summary.weeks ?? null,
      final_state_hash: summary.final_state_hash ?? null,
    },
    checkpoints: buildCheckpoints(brigadeRows),
    weekly_windows: buildWeeklyWindows(weeklyRows),
    completed_operations: buildCompletedOperations(aars),
    opportunity_comparison: {
      status: 'artifact_missing',
      note: 'No paired with/without opportunity-proposal run artifacts were supplied to this diagnostic.',
    },
  };
}

function main() {
  const args = process.argv.slice(2);
  const runDir = args.find((a) => !a.startsWith('--'));
  if (!runDir) {
    process.stderr.write('Usage: node tools/diagnostics/force_quality_checkpoint_windows.cjs <run_dir> [--json]\n');
    process.exit(2);
  }
  try {
    const report = buildReport(runDir);
    process.stdout.write(JSON.stringify(report, null, 2));
    process.stdout.write('\n');
  } catch (err) {
    process.stderr.write(`ERROR: ${err && err.message ? err.message : String(err)}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = {
  buildReport,
  buildCheckpoints,
  buildWeeklyWindows,
  buildCompletedOperations,
  windowsForTurn,
  FACTIONS,
  CHECKPOINTS,
  WINDOWS,
};
