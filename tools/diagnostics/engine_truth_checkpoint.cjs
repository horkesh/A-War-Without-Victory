#!/usr/bin/env node
'use strict';

/**
 * Deterministic, read-only post-run truth checkpoint.
 *
 * Inputs are explicit run artifacts. Missing console-warning evidence is reported
 * as unavailable, never as zero. No clocks, randomness, directory discovery, or
 * simulation state mutation are used.
 */

const fs = require('node:fs');
const path = require('node:path');

const STRICT_COMPARE = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const CANONICAL_FACTIONS = Object.freeze(['HRHB', 'RBiH', 'RS']);

function finiteNonNegative(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function roundedRatio(numerator, denominator) {
  if (denominator === 0) return numerator === 0 ? null : null;
  return Number((numerator / denominator).toFixed(6));
}

function dateForWeek(start, weekIndex) {
  if (!start || !Number.isInteger(start.year) || !Number.isInteger(start.month) || !Number.isInteger(start.day)) {
    return null;
  }
  const milliseconds = Date.UTC(start.year, start.month - 1, start.day) + weekIndex * 7 * 24 * 60 * 60 * 1000;
  return new Date(milliseconds).toISOString().slice(0, 10);
}

function forceTotals(temporalRows, scenarioStartDate) {
  const groups = new Map();
  for (const row of temporalRows) {
    const week = row.week_index;
    const faction = row.faction;
    if (!Number.isInteger(week) || typeof faction !== 'string') continue;
    const key = `${String(week).padStart(8, '0')}\u0000${faction}`;
    let group = groups.get(key);
    if (!group) {
      group = { week_index: week, date: dateForWeek(scenarioStartDate, week), faction, personnel: 0, formation_count: 0, active_formation_count: 0 };
      groups.set(key, group);
    }
    if (typeof row.personnel === 'number' && Number.isFinite(row.personnel)) group.personnel += row.personnel;
    group.formation_count += 1;
    if (row.status === 'active') group.active_formation_count += 1;
  }
  return [...groups.values()].sort((a, b) => a.week_index - b.week_index || STRICT_COMPARE(a.faction, b.faction));
}

/** Sum one breakdown record (per_formation or per_militia_pool) into K/W/M totals. */
function sumBreakdown(breakdown) {
  const out = { killed: 0, wounded: 0, missing_captured: 0 };
  for (const key of Object.keys(breakdown || {}).sort(STRICT_COMPARE)) {
    const row = breakdown[key] || {};
    out.killed += row.killed || 0;
    out.wounded += row.wounded || 0;
    out.missing_captured += row.missing_captured || 0;
  }
  return out;
}

function casualtyReport(ledger) {
  const out = {};
  for (const faction of Object.keys(ledger || {}).sort(STRICT_COMPARE)) {
    const row = ledger[faction] || {};
    const killed = row.killed;
    const wounded = row.wounded;
    const missingCaptured = row.missing_captured;

    // ACCOUNTING INVARIANT: a faction total must equal the sum of BOTH breakdown
    // classes. Militia defenders have no formation id, so their losses live in
    // per_militia_pool; if a total drifts from the two breakdowns, a casualty event was
    // written twice, written to the wrong class, or dropped.
    const formations = sumBreakdown(row.per_formation);
    const militia = sumBreakdown(row.per_militia_pool);
    const accounting = {
      per_formation: formations,
      per_militia_pool: militia,
      balanced:
        killed === formations.killed + militia.killed
        && wounded === formations.wounded + militia.wounded
        && missingCaptured === formations.missing_captured + militia.missing_captured,
    };

    out[faction] = {
      killed,
      wounded,
      missing_captured: missingCaptured,
      accounting,
      ratios: {
        wounded_per_killed: roundedRatio(wounded, killed),
        missing_captured_per_killed: roundedRatio(missingCaptured, killed),
      },
    };
  }
  return out;
}

function sumFields(rows, fields) {
  const out = Object.fromEntries(fields.map((field) => [field, 0]));
  for (const row of rows) {
    for (const field of fields) {
      if (typeof row[field] === 'number' && Number.isFinite(row[field])) out[field] += row[field];
    }
  }
  return out;
}

function civilianReport(displacement, displacementRows, runSummary) {
  const byFaction = {};
  for (const faction of Object.keys(displacement?.civilian_casualties || {}).sort(STRICT_COMPARE)) {
    const row = displacement.civilian_casualties[faction] || {};
    byFaction[faction] = { killed: row.killed, fled_abroad: row.fled_abroad };
  }
  const stateRows = Object.keys(displacement?.displacement_state || {}).sort(STRICT_COMPARE)
    .map((key) => displacement.displacement_state[key]);
  const eventTotals = sumFields(displacementRows, ['killed', 'displaced', 'fled_abroad']);
  const finalCivilianTotals = sumFields(Object.values(byFaction), ['killed', 'fled_abroad']);
  const summaryDisplacedTotal = runSummary?.takeover_displacement?.displaced_total;
  return {
    by_faction: byFaction,
    event_totals: eventTotals,
    final_civilian_totals: finalCivilianTotals,
    summary_displaced_total: summaryDisplacedTotal,
    reconciliation: {
      killed_matches_final: eventTotals.killed === finalCivilianTotals.killed,
      fled_abroad_matches_final: eventTotals.fled_abroad === finalCivilianTotals.fled_abroad,
      displaced_matches_summary: eventTotals.displaced === summaryDisplacedTotal,
    },
    municipality_state_totals: sumFields(stateRows, ['displaced_in', 'displaced_out', 'lost_population']),
    event_count: displacementRows.length,
  };
}

function normalizedAbsolute(candidate) {
  return typeof candidate === 'string' && candidate.trim() !== '' ? path.resolve(candidate.trim()) : null;
}

function parseAssignmentLog(assignmentLog, finalSave, bindingInput) {
  if (typeof assignmentLog !== 'string') {
    return {
      evidence_available: false,
      warning_count: null,
      warning_resolution_correctness: 'NOT_ESTABLISHED',
      binding: {
        status: 'NOT_ESTABLISHED',
        bound: false,
        emitted_out_dir: null,
        emitted_final_state_hash: null,
        emitted_scenario_path: null,
        scenario_path_matches: false,
        out_dir_matches: false,
        final_state_hash_matches: false,
      },
      final_seals: {
        marker_count: 0, unresolved_sum: null, turns: [], turn_coverage_complete: false,
        turn_marker_count: 0, final_save_marker_count: 0,
        exactly_one_turn_marker_per_turn: false, exactly_one_final_save_marker: false,
        marker_protocol_valid: false, unknown_or_malformed_count: 0, warnings_reconciled: false,
      },
      warnings: [],
    };
  }
  const ids = [];
  const pattern = /\[brigade_assignment\]\s+UNRESOLVED\s+([^\s(:]+)/;
  for (const line of assignmentLog.split(/\r?\n/)) {
    const match = line.match(pattern);
    if (match) ids.push(match[1]);
  }
  const outDirMatchesAll = [...assignmentLog.matchAll(/^outDir:\s*(.+?)\s*$/gmi)];
  const hashMatchesAll = [...assignmentLog.matchAll(/^final_state_hash:\s*([0-9a-f]+)\s*$/gmi)];
  const scenarioMatchesAll = [...assignmentLog.matchAll(/^>\s+tsx\s+tools[\\/]scenario_runner[\\/]run_scenario_with_preflight\.ts\s+.*?--scenario\s+(\S+)/gmi)];
  const emittedOutDir = outDirMatchesAll.length === 1 ? outDirMatchesAll[0]?.[1]?.trim() ?? null : null;
  const emittedHash = hashMatchesAll.length === 1 ? hashMatchesAll[0]?.[1]?.toLowerCase() ?? null : null;
  const emittedScenarioPath = scenarioMatchesAll.length === 1 ? scenarioMatchesAll[0]?.[1] ?? null : null;
  const resolvedRunDir = normalizedAbsolute(bindingInput.runDir);
  const resolvedMetaOutDir = normalizedAbsolute(bindingInput.metaOutDir);
  const resolvedEmittedOutDir = normalizedAbsolute(emittedOutDir);
  const outDirMatches = resolvedRunDir !== null && resolvedMetaOutDir === resolvedRunDir && resolvedEmittedOutDir === resolvedRunDir;
  const expectedHash = typeof bindingInput.finalStateHash === 'string' ? bindingInput.finalStateHash.toLowerCase() : null;
  const finalStateHashMatches = emittedHash !== null && expectedHash !== null && emittedHash === expectedHash;
  const expectedScenarioPath = typeof bindingInput.scenarioPath === 'string' ? bindingInput.scenarioPath.replaceAll('\\', '/') : null;
  const scenarioPathMatches = emittedScenarioPath !== null && expectedScenarioPath !== null &&
    emittedScenarioPath.replaceAll('\\', '/') === expectedScenarioPath;
  const singleRunSegment = outDirMatchesAll.length === 1 && hashMatchesAll.length === 1 && scenarioMatchesAll.length === 1;
  const bindingFieldsAvailable = singleRunSegment && emittedOutDir !== null && emittedHash !== null && resolvedRunDir !== null &&
    resolvedMetaOutDir !== null && expectedHash !== null && emittedScenarioPath !== null && expectedScenarioPath !== null;
  const bound = bindingFieldsAvailable && outDirMatches && finalStateHashMatches && scenarioPathMatches;
  const formations = finalSave?.military?.formations || {};
  const warnings = ids.map((formationId, warningIndex) => {
    const formation = formations[formationId];
    return {
      warning_index: warningIndex,
      formation_id: formationId,
      formation_record_exists_in_final_save: Boolean(formation),
      final_status: formation?.status ?? null,
      formation_survives_final_state: formation?.status === 'active',
    };
  });
  const rawSealMarkerCount = [...assignmentLog.matchAll(/\[brigade_assignment\]\s+FINAL_SEAL\b/g)].length;
  const parsedSeals = [...assignmentLog.matchAll(/\[brigade_assignment\]\s+FINAL_SEAL\s+kind=([^\s]+)\s+turn=(\d+)\s+unresolved=(\d+)/g)]
    .map((match, markerIndex) => ({ kind: match[1], marker_index: markerIndex, turn: Number(match[2]), unresolved: Number(match[3]) }));
  const knownSeals = parsedSeals.filter((seal) => seal.kind === 'turn' || seal.kind === 'final_save');
  const turnSeals = knownSeals.filter((seal) => seal.kind === 'turn');
  const finalSaveSeals = knownSeals.filter((seal) => seal.kind === 'final_save');
  const unknownOrMalformedCount = rawSealMarkerCount - knownSeals.length;
  const markerProtocolValid = rawSealMarkerCount === parsedSeals.length && unknownOrMalformedCount === 0;
  const sealTurns = [...new Set(turnSeals.map((seal) => seal.turn))].sort((a, b) => a - b);
  const resumeWindowValid = bindingInput.resumeFromSavePath == null ||
    (Number.isInteger(bindingInput.resumeFromWeekIndex) && bindingInput.resumeFromWeekIndex >= 0 &&
      bindingInput.resumeFromWeekIndex < bindingInput.weeks);
  const expectedStartWeek = Number.isInteger(bindingInput.resumeFromWeekIndex) ? bindingInput.resumeFromWeekIndex : 0;
  const expectedTurns = resumeWindowValid && Number.isInteger(bindingInput.weeks) && bindingInput.weeks > expectedStartWeek
    ? Array.from({ length: bindingInput.weeks - expectedStartWeek }, (_, index) => expectedStartWeek + index + 1)
    : [];
  const turnCoverageComplete = expectedTurns.length > 0 && expectedTurns.length === sealTurns.length &&
    expectedTurns.every((turn, index) => turn === sealTurns[index]);
  const markerCountsByTurn = new Map();
  for (const seal of turnSeals) markerCountsByTurn.set(seal.turn, (markerCountsByTurn.get(seal.turn) ?? 0) + 1);
  const exactlyOneTurnMarkerPerTurn = turnCoverageComplete && turnSeals.length === expectedTurns.length &&
    expectedTurns.every((turn) => markerCountsByTurn.get(turn) === 1);
  const exactlyOneFinalSaveMarker = expectedTurns.length > 0 && finalSaveSeals.length === 1 &&
    finalSaveSeals[0].turn === expectedTurns[expectedTurns.length - 1];
  const unresolvedSum = knownSeals.reduce((sum, seal) => sum + seal.unresolved, 0);
  const warningsReconciled = knownSeals.length > 0 && unresolvedSum === warnings.length;
  return {
    evidence_available: true,
    warning_count: warnings.length,
    warning_resolution_correctness: warnings.length > 0 ? 'NOT_ESTABLISHED' : 'NOT_APPLICABLE',
    binding: {
      status: bound ? 'ESTABLISHED' : bindingFieldsAvailable ? 'MISMATCH' : 'NOT_ESTABLISHED',
      bound,
      emitted_out_dir: emittedOutDir,
      emitted_final_state_hash: emittedHash,
      emitted_scenario_path: emittedScenarioPath,
      out_dir_matches: outDirMatches,
      final_state_hash_matches: finalStateHashMatches,
      scenario_path_matches: scenarioPathMatches,
      single_run_segment: singleRunSegment,
    },
    final_seals: {
      marker_count: knownSeals.length,
      turn_marker_count: turnSeals.length,
      final_save_marker_count: finalSaveSeals.length,
      unresolved_sum: unresolvedSum,
      turns: sealTurns,
      turn_coverage_complete: turnCoverageComplete,
      exactly_one_turn_marker_per_turn: exactlyOneTurnMarkerPerTurn,
      exactly_one_final_save_marker: exactlyOneFinalSaveMarker,
      marker_protocol_valid: markerProtocolValid,
      unknown_or_malformed_count: unknownOrMalformedCount,
      warnings_reconciled: warningsReconciled,
    },
    warnings,
  };
}

function operationsReport(summary) {
  const combat = summary?.combat_causality || {};
  const attack = summary?.attack_resolution || {};
  const injection = summary?.op_injection_validation || {};
  return {
    valid_for_combat_calibration: combat.valid_for_combat_calibration,
    total_attack_orders: combat.total_attack_orders,
    total_battles: combat.total_battles,
    total_objective_attempts: combat.total_objective_attempts,
    total_objective_captures: combat.total_objective_captures,
    invalid_operation_count: combat.invalid_operation_count,
    recovery_without_logged_attempt_count: combat.recovery_without_logged_attempt_count,
    zero_eligible_attacker_operation_count: combat.zero_eligible_attacker_operation_count,
    orders_processed: attack.orders_processed,
    flips_applied: attack.flips_applied,
    injection_count: injection.count,
    injection_errors: injection.errors,
    injection_warnings: injection.warnings,
    injection_issues: [...(injection.issues || [])].sort((a, b) =>
      Number(a.turn || 0) - Number(b.turn || 0) || STRICT_COMPARE(String(a.op_name || ''), String(b.op_name || '')) ||
      STRICT_COMPARE(String(a.check || ''), String(b.check || ''))),
  };
}

function calibrationReport(summary, runMeta) {
  const pair = summary?.historical_fit?.osid_pair_match || {};
  const normalizeAnchors = (source) => [...(source || [])]
    .sort((a, b) => STRICT_COMPARE(String(a.anchor_id || ''), String(b.anchor_id || '')))
    .map((anchor) => ({
      anchor_id: anchor.anchor_id,
      anchor_type: anchor.anchor_type,
      expected_controller: anchor.expected_controller,
      actual_controller: anchor.actual_controller,
      passed: anchor.passed,
    }));
  const anchors = normalizeAnchors(summary?.anchor_checks);
  const historicalFitAnchors = normalizeAnchors(summary?.historical_fit?.anchor_checks);
  const anchorCopiesMatch = JSON.stringify(anchors) === JSON.stringify(historicalFitAnchors);
  const contract = runMeta?.anchor_contract;
  const contractAnchors = [...(Array.isArray(contract?.anchors) ? contract.anchors : [])]
    .map((anchor) => ({
      anchor_id: anchor.anchor_id,
      anchor_type: anchor.anchor_type,
      expected_controller: anchor.expected_controller,
    }))
    .sort((a, b) => STRICT_COMPARE(String(a.anchor_id || ''), String(b.anchor_id || '')));
  const topExpected = anchors.map(({ anchor_id, anchor_type, expected_controller }) => ({ anchor_id, anchor_type, expected_controller }));
  const historicalExpected = historicalFitAnchors.map(({ anchor_id, anchor_type, expected_controller }) => ({ anchor_id, anchor_type, expected_controller }));
  const contractIds = contractAnchors.map((anchor) => anchor.anchor_id);
  const contractShapeValid = contract?.schema_version === 1 && contract?.scenario_id === runMeta?.scenario_id &&
    contract?.weeks === runMeta?.weeks && typeof contract?.epoch === 'string' && contract.epoch.length > 0 &&
    contract?.source === 'src/scenario/historical_anchors.ts#canonical-anchor-contract-v1' &&
    /^[0-9a-f]{40}$/i.test(runMeta?.provenance?.git_commit ?? '') && contractAnchors.length > 0 &&
    new Set(contractIds).size === contractIds.length && contractAnchors.every((anchor) =>
      typeof anchor.anchor_id === 'string' && typeof anchor.anchor_type === 'string' && typeof anchor.expected_controller === 'string');
  const contractMatches = contractShapeValid && JSON.stringify(contractAnchors) === JSON.stringify(topExpected) &&
    JSON.stringify(contractAnchors) === JSON.stringify(historicalExpected);
  return {
    matched_osids: pair.matched_osids,
    total_osids: pair.total_osids,
    match_ratio: pair.match_ratio,
    anchors_passed: anchors.filter((anchor) => anchor.passed === true).length,
    anchors_total: anchors.length,
    anchors,
    anchor_sources: {
      top_level_count: anchors.length,
      historical_fit_count: historicalFitAnchors.length,
      copies_match: anchorCopiesMatch,
      contract_available: contract != null,
      contract_count: contractAnchors.length,
      contract_matches: contractMatches,
      contract_scenario_id: contract?.scenario_id ?? null,
      contract_epoch: contract?.epoch ?? null,
      contract_source: contract?.source ?? null,
      control_band_anchor_count: anchors.filter((anchor) => anchor.anchor_type === 'control_band').length,
      external_authored_source_available: contractShapeValid,
    },
  };
}

function buildChecks(input, sections) {
  const checks = [];
  const add = (id, ok, detail) => checks.push({ id, ok, detail });
  const idsMatch = typeof input.runMeta?.run_id === 'string' && input.runMeta.run_id === input.runSummary?.run_id &&
    input.runMeta?.scenario_id === input.runSummary?.scenario_id && Number.isInteger(input.runMeta?.weeks) &&
    input.runMeta.weeks === input.runSummary?.weeks && input.finalSave?.meta?.turn === input.runMeta.weeks;
  add('artifact_identity', idsMatch, idsMatch ? 'run_id, scenario_id, weeks, and final turn agree' :
    'run_id, scenario_id, weeks, or final turn mismatch/missing');

  const expectedWeeks = input.runMeta?.weeks;
  const resumeWindowValid = input.runMeta?.resume_from_save_path == null ||
    (Number.isInteger(input.runMeta?.resume_from_week_index) && input.runMeta.resume_from_week_index >= 0 &&
      input.runMeta.resume_from_week_index < expectedWeeks);
  const expectedStartWeek = Number.isInteger(input.runMeta?.resume_from_week_index) ? input.runMeta.resume_from_week_index : 0;
  const expectedCellKeys = new Set();
  if (resumeWindowValid && Number.isInteger(expectedWeeks) && expectedWeeks > expectedStartWeek) {
    for (let week = expectedStartWeek; week < expectedWeeks; week += 1) {
      for (const faction of CANONICAL_FACTIONS) expectedCellKeys.add(`${week}\u0000${faction}`);
    }
  }
  const actualCellKeys = new Set(sections.force_totals.map((row) => `${row.week_index}\u0000${row.faction}`));
  const formationWeekKeys = new Set();
  let duplicateFormationWeek = false;
  let temporalTurnMismatch = false;
  const weeksByFormation = new Map();
  for (const row of input.temporalRows) {
    const key = `${row.week_index}\u0000${row.brigade_id}`;
    if (formationWeekKeys.has(key)) duplicateFormationWeek = true;
    formationWeekKeys.add(key);
    if (row.turn !== row.week_index + 1) temporalTurnMismatch = true;
    if (!weeksByFormation.has(row.brigade_id)) weeksByFormation.set(row.brigade_id, new Set());
    weeksByFormation.get(row.brigade_id).add(row.week_index);
  }
  const formationTimelinesContiguous = [...weeksByFormation.values()].every((weeks) => {
    const ordered = [...weeks].sort((a, b) => a - b);
    return ordered.length > 0 && ordered.length === ordered[ordered.length - 1] - ordered[0] + 1;
  });
  const finalWeek = Number.isInteger(expectedWeeks) ? expectedWeeks - 1 : null;
  const finalWeekFormationIds = new Set(input.temporalRows.filter((row) => row.week_index === finalWeek).map((row) => row.brigade_id));
  const finalActiveBrigadeIds = Object.values(input.finalSave?.military?.formations || {})
    .filter((formation) => (formation.kind ?? 'brigade') === 'brigade' && formation.status === 'active')
    .map((formation) => formation.id);
  const finalSurvivorsCovered = finalActiveBrigadeIds.every((formationId) => finalWeekFormationIds.has(formationId));
  const exactCells = actualCellKeys.size === expectedCellKeys.size &&
    [...expectedCellKeys].every((key) => actualCellKeys.has(key));
  const forceValid = resumeWindowValid && expectedCellKeys.size > 0 && input.temporalRows.length > 0 && !duplicateFormationWeek && !temporalTurnMismatch &&
    formationTimelinesContiguous && finalSurvivorsCovered &&
    input.temporalRows.every((row) => typeof row.brigade_id === 'string' &&
    Number.isInteger(row.week_index) && typeof row.faction === 'string' && finiteNonNegative(row.personnel)) &&
    sections.force_totals.every((row) => row.date !== null && finiteNonNegative(row.personnel)) && exactCells;
  add('force_timeline', forceValid,
    forceValid ? `${sections.force_totals.length}/${expectedCellKeys.size} canonical faction-week totals; no duplicate formation-week rows` :
      'truncated, duplicate, non-contiguous, turn-misaligned, missing-survivor/noncanonical faction-week, or invalid temporal force evidence');

  const casualtyFactions = Object.keys(sections.casualties).sort(STRICT_COMPARE);
  const casualtyRows = Object.values(sections.casualties);
  const casualtiesValid = JSON.stringify(casualtyFactions) === JSON.stringify([...CANONICAL_FACTIONS].sort(STRICT_COMPARE)) && casualtyRows.every((row) =>
    finiteNonNegative(row.killed) && finiteNonNegative(row.wounded) && finiteNonNegative(row.missing_captured));
  add('casualty_ledger', casualtiesValid, casualtiesValid ? `${casualtyRows.length} faction ledgers valid` : 'missing, negative, or non-finite casualty value');

  // faction total === sum(per_formation) + sum(per_militia_pool), for every faction.
  // sections.casualties is already casualtyReport(...) output, which carries `accounting`.
  const unbalanced = Object.keys(sections.casualties).sort(STRICT_COMPARE)
    .filter((faction) => sections.casualties[faction]?.accounting?.balanced !== true);
  add(
    'casualty_accounting_balanced',
    unbalanced.length === 0,
    unbalanced.length === 0
      ? 'faction totals equal per_formation + per_militia_pool'
      : `unbalanced: ${unbalanced.join(', ')}`,
  );

  const civilianRows = Object.values(sections.civilians.by_faction);
  const eventValues = Object.values(sections.civilians.event_totals);
  const civilianValid = input.displacementRows.length > 0 && civilianRows.length > 0 &&
    civilianRows.every((row) => finiteNonNegative(row.killed) && finiteNonNegative(row.fled_abroad)) &&
    input.displacementRows.every((row) => ['killed', 'displaced', 'fled_abroad'].every((field) => finiteNonNegative(row[field]))) &&
    eventValues.every(finiteNonNegative) && sections.civilians.reconciliation.killed_matches_final &&
    sections.civilians.reconciliation.fled_abroad_matches_final && sections.civilians.reconciliation.displaced_matches_summary;
  add('civilian_displacement', civilianValid, civilianValid ?
    `${input.displacementRows.length} events; killed/fled match final aggregate and displaced matches run summary` :
    'missing/invalid/partial log: event totals do not reconcile to final civilian aggregate and run summary');

  const bindingValid = sections.assignment_log.evidence_available && sections.assignment_log.binding.bound;
  add('assignment_log_binding', bindingValid, bindingValid ?
    'combined stdout/stderr outDir and final_state_hash bind to this run' :
    'combined stdout/stderr missing or outDir/final_state_hash binding NOT_ESTABLISHED/mismatched');
  const seal = sections.assignment_log.final_seals;
  const warningStreamValid = bindingValid && seal.marker_count > 0 && seal.turn_coverage_complete &&
    seal.exactly_one_turn_marker_per_turn && seal.exactly_one_final_save_marker &&
    seal.marker_protocol_valid && seal.warnings_reconciled;
  add('assignment_warning_stream', warningStreamValid, warningStreamValid ?
    `${seal.turn_marker_count} turn seals plus 1 final-save seal; unresolved sum reconciles to warning emissions` :
    'turn/final-save seal missing, duplicate, malformed, unknown, misplaced, or unresolved sum does not reconcile');
  const assignmentHealthValid = warningStreamValid && sections.assignment_log.warning_count === 0;
  add('assignment_unresolved_health', assignmentHealthValid, !warningStreamValid ?
    'cannot assess unresolved health without a bound, coherent turn/final-save seal stream' :
    assignmentHealthValid ? '0 UNRESOLVED warning emissions' : `${sections.assignment_log.warning_count} UNRESOLVED warning emission(s)`);

  const ops = sections.operations_combat;
  const injectionIssueCount = ops.injection_issues.length;
  const injectionWarningCount = ops.injection_issues.filter((issue) => issue.severity === 'warning').length;
  const injectionErrorCount = ops.injection_issues.filter((issue) => issue.severity === 'error').length;
  const opsValid = ops.valid_for_combat_calibration === true && ops.invalid_operation_count === 0 &&
    ops.recovery_without_logged_attempt_count === 0 && ops.zero_eligible_attacker_operation_count === 0 &&
    finiteNonNegative(ops.total_attack_orders) && ops.total_attack_orders > 0 &&
    finiteNonNegative(ops.total_battles) && ops.total_battles > 0 && ops.injection_errors === 0 &&
    ops.orders_processed === ops.total_attack_orders && ops.flips_applied <= ops.orders_processed &&
    ops.injection_count === injectionIssueCount && ops.injection_warnings === injectionWarningCount &&
    ops.injection_errors === injectionErrorCount;
  add('operations_combat', opsValid, opsValid ? `${ops.total_battles} battles; no hard causality failures` : 'combat calibration invalid, inert, or operation errors present');

  const cal = sections.calibration;
  const expectedRatio = finiteNonNegative(cal.total_osids) && cal.total_osids > 0 ? cal.matched_osids / cal.total_osids : NaN;
  const calibrationValid = Number.isInteger(cal.matched_osids) && Number.isInteger(cal.total_osids) &&
    cal.matched_osids >= 0 && cal.matched_osids <= cal.total_osids && typeof cal.match_ratio === 'number' &&
    Math.abs(cal.match_ratio - expectedRatio) <= 0.000001 && cal.anchors_total > 0 && cal.anchors_passed === cal.anchors_total &&
    cal.anchor_sources.copies_match && cal.anchor_sources.contract_matches;
  add('calibration_anchors', calibrationValid,
    calibrationValid ? `${cal.matched_osids}/${cal.total_osids}; ${cal.anchors_passed}/${cal.anchors_total} anchors` : 'invalid score reconciliation or one or more anchors failed/missing');
  return checks;
}

function buildEngineTruthCheckpoint(input) {
  const normalized = {
    runMeta: input.runMeta || {},
    finalSave: input.finalSave || {},
    runSummary: input.runSummary || {},
    temporalRows: Array.isArray(input.temporalRows) ? input.temporalRows : [],
    displacementRows: Array.isArray(input.displacementRows) ? input.displacementRows : [],
    assignmentLog: input.assignmentLog,
    runDir: input.runDir,
  };
  const sections = {
    schema_version: 1,
    run: {
      run_id: normalized.runMeta.run_id ?? null,
      scenario_id: normalized.runMeta.scenario_id ?? null,
      weeks: normalized.runMeta.weeks ?? normalized.runSummary.weeks ?? null,
      final_turn: normalized.finalSave?.meta?.turn ?? normalized.runSummary?.summary?.final_turn ?? null,
    },
    force_totals: forceTotals(normalized.temporalRows, normalized.finalSave?.meta?.scenario_start_date),
    casualties: casualtyReport(normalized.finalSave?.military?.casualty_ledger || {}),
    civilians: civilianReport(normalized.finalSave?.displacement || {}, normalized.displacementRows, normalized.runSummary),
    assignment_log: parseAssignmentLog(normalized.assignmentLog, normalized.finalSave, {
      runDir: normalized.runDir,
      metaOutDir: normalized.runMeta.out_dir,
      finalStateHash: normalized.runSummary.final_state_hash,
      scenarioPath: normalized.runMeta.scenario_path,
      weeks: normalized.runMeta.weeks,
      resumeFromSavePath: normalized.runMeta.resume_from_save_path,
      resumeFromWeekIndex: normalized.runMeta.resume_from_week_index,
    }),
    operations_combat: operationsReport(normalized.runSummary),
    calibration: calibrationReport(normalized.runSummary, normalized.runMeta),
  };
  const checks = buildChecks(normalized, sections);
  return { ...sections, checks, pass: checks.every((check) => check.ok) };
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort(STRICT_COMPARE).map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function renderEngineTruthCheckpoint(report) {
  return JSON.stringify(canonicalize(report), null, 2) + '\n';
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readJsonl(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((line) => line.trim() !== '').map((line) => JSON.parse(line));
}

function parseCli(argv) {
  let runDir = null;
  let assignmentLogPath = null;
  let outPath = null;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--assignment-log') assignmentLogPath = argv[++index];
    else if (arg === '--out') outPath = argv[++index];
    else if (!runDir) runDir = arg;
    else throw new Error(`unexpected argument: ${arg}`);
  }
  if (!runDir) throw new Error('usage: node tools/diagnostics/engine_truth_checkpoint.cjs <run-dir> [--assignment-log <combined-stdout-stderr.log>] [--out <report.json>]');
  return { runDir: path.resolve(runDir), assignmentLogPath, outPath };
}

function collectRunArtifacts(runDir, assignmentLogPath) {
  return {
    runDir: path.resolve(runDir),
    runMeta: readJson(path.join(runDir, 'run_meta.json')),
    finalSave: readJson(path.join(runDir, 'final_save.json')),
    runSummary: readJson(path.join(runDir, 'run_summary.json')),
    temporalRows: readJsonl(path.join(runDir, 'brigade_temporal_log.jsonl')),
    displacementRows: readJsonl(path.join(runDir, 'displacement_event_log.jsonl')),
    assignmentLog: assignmentLogPath ? fs.readFileSync(path.resolve(assignmentLogPath), 'utf8') : undefined,
  };
}

if (require.main === module) {
  try {
    const flags = parseCli(process.argv.slice(2));
    const report = buildEngineTruthCheckpoint(collectRunArtifacts(flags.runDir, flags.assignmentLogPath));
    const rendered = renderEngineTruthCheckpoint(report);
    if (flags.outPath) fs.writeFileSync(path.resolve(flags.outPath), rendered, 'utf8');
    else process.stdout.write(rendered);
    process.exitCode = report.pass ? 0 : 1;
  } catch (error) {
    process.stderr.write(`[engine_truth_checkpoint] ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
  }
}

module.exports = {
  buildEngineTruthCheckpoint,
  collectRunArtifacts,
  parseAssignmentLog,
  renderEngineTruthCheckpoint,
};
