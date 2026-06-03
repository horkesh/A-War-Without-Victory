#!/usr/bin/env node
/**
 * Read-only diagnostic for one preplanned operation in preserved run artifacts.
 *
 * Usage:
 *   node tools/diagnostics/preplanned_operation_trace.cjs <run_dir> [operation name/id substring]
 *
 * Default operation substring: "Operation Foca".
 *
 * Reads only:
 *   - operation_aars.json, or final_save.json operation_history
 *   - final_save.json, when present, for active operations and final brigade state
 *   - run_summary.json, when present
 *   - weekly_report.jsonl, when present
 *
 * Writes nothing, runs no scenarios, and emits deterministic JSON.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_OPERATION_QUERY = 'Operation Foca';

function strictCompare(a, b) {
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function fail(message) {
  process.stderr.write(`preplanned_operation_trace: ${message}\n`);
  process.exit(1);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`could not parse JSON artifact ${filePath}: ${error.message}`);
  }
}

function readJsonIfExists(filePath) {
  return fs.existsSync(filePath) ? readJson(filePath) : null;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function lower(value) {
  return String(value ?? '').toLowerCase();
}

function matchesQuery(value, query) {
  return lower(value).includes(lower(query));
}

function normalizeIds(values) {
  return Array.from(new Set(asArray(values).map((v) => String(v)))).sort(strictCompare);
}

function loadOperationAars(runDir, finalSave) {
  const aarPath = path.join(runDir, 'operation_aars.json');
  if (fs.existsSync(aarPath)) {
    const aars = readJson(aarPath);
    if (!Array.isArray(aars)) fail(`operation_aars.json must contain an array: ${aarPath}`);
    return aars;
  }

  const history = asArray(finalSave && finalSave.operation_history);
  if (history.length > 0) return history;

  fail(`missing operation history artifact; expected operation_aars.json or final_save.json operation_history in ${runDir}`);
}

function collectActiveOperations(finalSave) {
  const active = [];
  const corpsCommand = (finalSave && finalSave.military && finalSave.military.corps_command) || {};
  for (const corpsId of Object.keys(corpsCommand).sort(strictCompare)) {
    const cmd = corpsCommand[corpsId] || {};
    for (const op of asArray(cmd.active_operations)) {
      active.push({ corpsId, op });
    }
  }
  active.sort((a, b) => {
    const ta = asNumber(a.op.started_turn, 0);
    const tb = asNumber(b.op.started_turn, 0);
    if (ta !== tb) return ta - tb;
    return strictCompare(`${a.corpsId}:${a.op.name || ''}`, `${b.corpsId}:${b.op.name || ''}`);
  });
  return active;
}

function findMatchingAars(aars, query) {
  return aars
    .filter((aar) => {
      if (!aar) return false;
      if (matchesQuery(aar.operation_name, query) || matchesQuery(aar.operation_id, query)) return true;
      return asArray(aar.axis_summaries).some((axis) => (
        matchesQuery(axis && axis.axis_id, query) || matchesQuery(axis && axis.axis_name, query)
      ));
    })
    .sort((a, b) => {
      const ta = asNumber(a.started_turn, 0);
      const tb = asNumber(b.started_turn, 0);
      if (ta !== tb) return ta - tb;
      return strictCompare(String(a.operation_id || a.operation_name || ''), String(b.operation_id || b.operation_name || ''));
    });
}

function findMatchingActive(activeOps, query) {
  return activeOps.filter(({ corpsId, op }) => (
    matchesQuery(op && op.name, query)
    || matchesQuery(`${corpsId}:${op && op.name}:t${op && op.started_turn}`, query)
  ));
}

function summarizeAxis(axis) {
  const objectivesTargeted = normalizeIds(axis && axis.objectives_targeted);
  const objectivesCaptured = normalizeIds(axis && axis.objectives_captured);
  return {
    axis_id: String((axis && axis.axis_id) || ''),
    axis_name: String((axis && axis.axis_name) || ''),
    brigades: normalizeIds(axis && axis.brigades),
    staging_osid: String((axis && axis.staging_osid) || ''),
    launch_blocker: axis && typeof axis.launch_blocker === 'string' ? axis.launch_blocker : null,
    unreachable_at_launch: Boolean(axis && axis.unreachable_at_launch === true),
    total_attacks: asNumber(axis && axis.total_attacks, 0),
    objectives_targeted: objectivesTargeted,
    objectives_captured: objectivesCaptured,
    capture_count: objectivesCaptured.length,
  };
}

function summarizeActiveAxis(axis) {
  const objectives = normalizeIds(axis && axis.objectives);
  return {
    axis_id: String((axis && axis.axis_id) || ''),
    axis_name: String((axis && axis.name) || ''),
    brigades: normalizeIds(axis && axis.assigned_brigades),
    staging_osid: String((axis && axis.staging_osid) || ''),
    launch_blocker: axis && typeof axis.launch_blocker === 'string' ? axis.launch_blocker : null,
    unreachable_at_launch: Boolean(axis && axis.unreachable_at_launch === true),
    total_attacks: asNumber(axis && axis.attack_attempt_count, 0),
    objectives_targeted: objectives,
    objectives_captured: [],
    capture_count: 0,
  };
}

function summarizeBrigades(brigadeIds, finalSave) {
  const formations = (finalSave && finalSave.military && finalSave.military.formations) || finalSave?.formations || {};
  return brigadeIds.map((id) => {
    const f = formations[id] || {};
    return {
      brigade_id: id,
      name: typeof f.name === 'string' ? f.name : '',
      status: typeof f.status === 'string' ? f.status : '',
      faction: typeof f.faction === 'string' ? f.faction : '',
      corps_id: typeof f.corps_id === 'string' ? f.corps_id : '',
      location_osid: typeof f.location_osid === 'string' ? f.location_osid : '',
      personnel: Number.isFinite(+f.personnel) ? +f.personnel : null,
      morale: Number.isFinite(+f.morale) ? +f.morale : null,
      cohesion: Number.isFinite(+f.cohesion) ? +f.cohesion : null,
    };
  });
}

function summarizeAar(aar, finalSave) {
  const axes = asArray(aar.axis_summaries).map(summarizeAxis).sort((a, b) => strictCompare(a.axis_id, b.axis_id));
  const axisBrigades = axes.flatMap((axis) => axis.brigades);
  const brigadeIds = normalizeIds([...asArray(aar.participating_brigades), ...axisBrigades]);
  const launchBlockers = axes
    .filter((axis) => axis.launch_blocker || axis.unreachable_at_launch)
    .map((axis) => ({
      axis_id: axis.axis_id,
      axis_name: axis.axis_name,
      launch_blocker: axis.launch_blocker,
      unreachable_at_launch: axis.unreachable_at_launch,
    }))
    .sort((a, b) => strictCompare(a.axis_id, b.axis_id));

  return {
    source: 'operation_aars',
    operation_id: String(aar.operation_id || ''),
    operation_name: String(aar.operation_name || ''),
    corps_id: String(aar.corps_id || ''),
    faction: String(aar.faction || ''),
    type: String(aar.type || ''),
    status: 'completed',
    outcome: String(aar.outcome || ''),
    recovery_reason: aar.recovery_reason ?? null,
    capture_provenance: aar.capture_provenance ?? null,
    started_turn: Number.isFinite(+aar.started_turn) ? +aar.started_turn : null,
    ended_turn: Number.isFinite(+aar.ended_turn) ? +aar.ended_turn : null,
    duration_turns: Number.isFinite(+aar.duration_turns) ? +aar.duration_turns : null,
    grade: aar.grade || null,
    total_attacks: asNumber(aar.total_attacks, 0),
    total_captures: asArray(aar.objectives_captured).length,
    objectives_targeted: normalizeIds(aar.objectives_targeted),
    objectives_captured: normalizeIds(aar.objectives_captured),
    participants: {
      brigade_ids: brigadeIds,
      brigade_count: brigadeIds.length,
      brigades: summarizeBrigades(brigadeIds, finalSave),
    },
    axis_launch_blockers: launchBlockers,
    axes,
    aar_weekly_log: asArray(aar.weekly_log)
      .map((entry) => ({
        turn: Number.isFinite(+entry.turn) ? +entry.turn : null,
        phase: String(entry.phase || ''),
        attacks_this_turn: asNumber(entry.attacks_this_turn, 0),
        objectives_captured_this_turn: normalizeIds(entry.objectives_captured_this_turn),
        objectives_lost_this_turn: normalizeIds(entry.objectives_lost_this_turn),
        notable_events: normalizeIds(entry.notable_events),
        axis_entries: entry.axis_entries || null,
      }))
      .sort((a, b) => (asNumber(a.turn, 0) - asNumber(b.turn, 0))),
  };
}

function summarizeActiveOperation(row, finalSave) {
  const { corpsId, op } = row;
  const axes = asArray(op.axes).map(summarizeActiveAxis).sort((a, b) => strictCompare(a.axis_id, b.axis_id));
  const brigadeIds = normalizeIds([...asArray(op.participating_brigades), ...axes.flatMap((axis) => axis.brigades)]);
  const launchBlockers = axes
    .filter((axis) => axis.launch_blocker || axis.unreachable_at_launch)
    .map((axis) => ({
      axis_id: axis.axis_id,
      axis_name: axis.axis_name,
      launch_blocker: axis.launch_blocker,
      unreachable_at_launch: axis.unreachable_at_launch,
    }))
    .sort((a, b) => strictCompare(a.axis_id, b.axis_id));

  return {
    source: 'final_save.active_operations',
    operation_id: `${corpsId}:${op.name || 'unnamed'}:t${op.started_turn || 0}:active`,
    operation_name: String(op.name || ''),
    corps_id: String(corpsId),
    faction: '',
    type: String(op.type || ''),
    status: String(op.phase || 'active'),
    outcome: 'active',
    recovery_reason: op.recovery_reason ?? null,
    capture_provenance: null,
    started_turn: Number.isFinite(+op.started_turn) ? +op.started_turn : null,
    ended_turn: null,
    duration_turns: null,
    grade: null,
    total_attacks: asNumber(op.attack_attempt_count, 0),
    total_captures: asNumber(op.objective_capture_count, 0),
    objectives_targeted: normalizeIds(op.objectives),
    objectives_captured: [],
    participants: {
      brigade_ids: brigadeIds,
      brigade_count: brigadeIds.length,
      brigades: summarizeBrigades(brigadeIds, finalSave),
    },
    axis_launch_blockers: launchBlockers,
    axes,
    aar_weekly_log: [],
  };
}

function parseWeeklyReport(runDir, query) {
  const weeklyPath = path.join(runDir, 'weekly_report.jsonl');
  if (!fs.existsSync(weeklyPath)) {
    return { artifact_present: false, entries: [] };
  }

  const entries = [];
  const lines = fs.readFileSync(weeklyPath, 'utf8').split(/\r?\n/).filter(Boolean);
  lines.forEach((line, index) => {
    let row;
    try {
      row = JSON.parse(line);
    } catch (error) {
      fail(`could not parse weekly_report.jsonl line ${index + 1}: ${error.message}`);
    }

    const operationDiagnostics = asArray(row.operation_diagnostics)
      .filter((diag) => (
        matchesQuery(diag && diag.operation_name, query)
        || matchesQuery(diag && diag.operation_id, query)
      ))
      .map((diag) => ({
        operation_name: String(diag.operation_name || ''),
        corps_id: String(diag.corps_id || ''),
        faction_id: String(diag.faction_id || ''),
        operation_phase: String(diag.operation_phase || ''),
        current_objective: diag.current_objective ?? null,
        current_objectives: normalizeIds(diag.current_objectives),
        participating_brigades: normalizeIds(diag.participating_brigades),
        attack_attempt_count: asNumber(diag.attack_attempt_count, 0),
        battle_count: asNumber(diag.battle_count, 0),
        movement_order_count: asNumber(diag.movement_order_count, 0),
        eligible_attacker_count: asNumber(diag.eligible_attacker_count, 0),
        objective_attempt_count: asNumber(diag.objective_attempt_count, 0),
        objective_capture_count: asNumber(diag.objective_capture_count, 0),
        invalid_for_combat_calibration: Boolean(diag.invalid_for_combat_calibration),
        invalidation_reasons: normalizeIds(diag.invalidation_reasons),
        recovery_reason: diag.recovery_reason ?? null,
        attack_order_targets: asArray(diag.attack_order_targets)
          .map((target) => ({
            target_osid: String(target.target_osid || ''),
            order_count: asNumber(target.order_count, 0),
            battle_count: asNumber(target.battle_count, 0),
            current_objective: Boolean(target.current_objective),
          }))
          .sort((a, b) => strictCompare(a.target_osid, b.target_osid)),
        participant_attack_orders: asArray(diag.participant_attack_orders)
          .map((order) => ({
            brigade_id: String(order.brigade_id || ''),
            location_osid: String(order.location_osid || ''),
            target_osid: String(order.target_osid || ''),
            target_is_current_objective: Boolean(order.target_is_current_objective),
            resolver_seen_target_osid: order.resolver_seen_target_osid ?? null,
            battle_count: asNumber(order.battle_count, 0),
          }))
          .sort((a, b) => strictCompare(a.brigade_id, b.brigade_id)),
        skipped_attack_orders: asArray(diag.skipped_attack_orders)
          .map((skip) => ({
            brigade_id: String(skip.brigade_id || ''),
            location_osid: String(skip.location_osid || ''),
            target_osid: String(skip.target_osid || ''),
            reason: String(skip.reason || ''),
            target_controller: skip.target_controller ?? null,
          }))
          .sort((a, b) => strictCompare(`${a.brigade_id}:${a.target_osid}`, `${b.brigade_id}:${b.target_osid}`)),
      }))
      .sort((a, b) => strictCompare(a.operation_name, b.operation_name));

    const battles = asArray(row.battles)
      .filter((battle) => (
        matchesQuery(battle && battle.operation_name, query)
        || matchesQuery(battle && battle.operation_id, query)
      ))
      .map((battle) => ({
        operation_id: String(battle.operation_id || ''),
        operation_name: String(battle.operation_name || ''),
        battle_id: String(battle.battle_id || ''),
        attacker_brigade: String(battle.attacker_brigade || ''),
        defender_brigade: battle.defender_brigade ?? null,
        target_osid: String(battle.target_osid || ''),
        attacker_won: Boolean(battle.attacker_won),
        outcome: String(battle.outcome || ''),
        power_ratio: Number.isFinite(+battle.power_ratio) ? +battle.power_ratio : null,
      }))
      .sort((a, b) => strictCompare(a.battle_id, b.battle_id));

    if (operationDiagnostics.length > 0 || battles.length > 0) {
      entries.push({
        week_index: Number.isFinite(+row.week_index) ? +row.week_index : index + 1,
        operation_diagnostics: operationDiagnostics,
        battles,
      });
    }
  });

  entries.sort((a, b) => a.week_index - b.week_index);
  return { artifact_present: true, entries };
}

function buildReport(runDir, query) {
  if (!fs.existsSync(runDir)) fail(`run directory does not exist: ${runDir}`);
  const stat = fs.statSync(runDir);
  if (!stat.isDirectory()) fail(`run path is not a directory: ${runDir}`);

  const finalSave = readJsonIfExists(path.join(runDir, 'final_save.json'));
  const summary = readJsonIfExists(path.join(runDir, 'run_summary.json'));
  const aars = loadOperationAars(runDir, finalSave);
  const matchingAars = findMatchingAars(aars, query);
  const matchingActive = finalSave ? findMatchingActive(collectActiveOperations(finalSave), query) : [];

  if (matchingAars.length === 0 && matchingActive.length === 0) {
    fail(`no operation matched substring "${query}" in ${runDir}`);
  }

  const operations = [
    ...matchingAars.map((aar) => summarizeAar(aar, finalSave)),
    ...matchingActive.map((active) => summarizeActiveOperation(active, finalSave)),
  ].sort((a, b) => {
    const ta = asNumber(a.started_turn, 0);
    const tb = asNumber(b.started_turn, 0);
    if (ta !== tb) return ta - tb;
    return strictCompare(a.operation_id, b.operation_id);
  });

  const totals = {
    operation_count: operations.length,
    total_attacks: operations.reduce((sum, op) => sum + asNumber(op.total_attacks, 0), 0),
    total_captures: operations.reduce((sum, op) => sum + asNumber(op.total_captures, 0), 0),
    axis_launch_blocker_count: operations.reduce((sum, op) => sum + op.axis_launch_blockers.length, 0),
  };

  return {
    run_dir: path.resolve(runDir),
    query,
    run_summary: summary
      ? {
        run_id: summary.run_id ?? null,
        scenario_id: summary.scenario_id ?? null,
        weeks: summary.weeks ?? summary.summary?.final_turn ?? null,
        final_state_hash: summary.final_state_hash ?? null,
      }
      : null,
    artifact_presence: {
      final_save_json: Boolean(finalSave),
      operation_aars_json: fs.existsSync(path.join(runDir, 'operation_aars.json')),
      run_summary_json: Boolean(summary),
      weekly_report_jsonl: fs.existsSync(path.join(runDir, 'weekly_report.jsonl')),
    },
    totals,
    operations,
    weekly_trace: parseWeeklyReport(runDir, query),
  };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1 || args.length > 2 || args.includes('--help') || args.includes('-h')) {
    process.stderr.write('Usage: node tools/diagnostics/preplanned_operation_trace.cjs <run_dir> [operation name/id substring]\n');
    process.exit(args.includes('--help') || args.includes('-h') ? 0 : 2);
  }

  const runDir = args[0];
  const query = args[1] || DEFAULT_OPERATION_QUERY;
  const report = buildReport(path.resolve(runDir), query);
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

if (require.main === module) {
  main();
}

module.exports = {
  buildReport,
  strictCompare,
};
