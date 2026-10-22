#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const PREFIX = '[pool_flow]';
const TARGET_TURNS = [21, 22];
const WRITERS = new Set([
  'ongoing_mobilization|direct_controller',
  'pool_population|shared_displaced_by_faction',
  'pool_population|shared_displaced_controller',
  'pool_decay|war_weariness',
  'formation_spawn|militia_wia',
]);
const REQUIRED_WRITERS_BY_PHASE = new Map([
  ['ongoing-mobilization', ['direct', 'shared']],
  ['pool-war-weariness-decay', ['decay']],
  ['wia-trickleback', ['wia']],
]);

function fail(message) { throw new Error(message); }
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}
function same(a, b) { return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b)); }
function value(observation, label) {
  if (!observation || observation.presence !== 'present_value' || typeof observation.value !== 'number' || !Number.isFinite(observation.value)) {
    fail(`${label} must be a finite present_value`);
  }
  return observation.value;
}
function validatePool(pool, label) {
  if (!pool || !['missing', 'present'].includes(pool.presence)) fail(`${label} has invalid presence`);
  if (pool.presence === 'missing') return;
  for (const field of ['available', 'committed', 'exhausted', 'wounded_pending']) {
    const observed = pool[field];
    if (!observed || !['present_undefined', 'present_null', 'present_nonfinite', 'present_value'].includes(observed.presence)) fail(`${label}.${field} has invalid presence`);
    if (observed.presence === 'present_value' && (typeof observed.value !== 'number' || !Number.isFinite(observed.value))) fail(`${label}.${field} has invalid value`);
    if (observed.presence === 'present_nonfinite' && typeof observed.value !== 'string') fail(`${label}.${field} has invalid nonfinite tag`);
  }
}
function recordStartPool(row) { return ['mutation','writer_qualification'].includes(row.event) ? row.before : row.pool; }
function recordEndPool(row) { return ['mutation','writer_qualification'].includes(row.event) ? row.after : row.pool; }
function numberOperand(row, name) { return value(row.operands?.[name], `${row.writer_group}.${name}`); }
function validateMutationArithmetic(row) {
  if (!WRITERS.has(`${row.source}|${row.branch}`)) fail('unknown mutation writer');
  const expectedGroup = row.source === 'ongoing_mobilization' ? 'direct'
    : row.source === 'pool_population' ? 'shared'
      : row.source === 'pool_decay' ? 'decay' : row.source === 'formation_spawn' ? 'wia' : null;
  if (row.writer_group !== expectedGroup) fail('writer group/source mismatch');
  if (!['credited','debited','zero'].includes(row.result)) fail('invalid mutation result');
  if (row.before.presence !== 'present' || row.after.presence !== 'present') fail('mutation requires present before/after pool');
  const beforeAvailable = value(row.before.available, 'before available');
  const afterAvailable = value(row.after.available, 'after available');
  if (numberOperand(row,'available_before') !== beforeAvailable || numberOperand(row,'available_after') !== afterAvailable) fail('available binding mismatch');
  if (row.writer_group === 'direct') {
    const raw = numberOperand(row,'census_eligible') * numberOperand(row,'base_rate') * numberOperand(row,'faction_scale')
      * numberOperand(row,'surge') * numberOperand(row,'exhaustion_multiplier') * numberOperand(row,'pocket_multiplier')
      * numberOperand(row,'authority_multiplier') * numberOperand(row,'event_multiplier');
    if (numberOperand(row,'raw') !== raw) fail('direct raw arithmetic mismatch');
    const mobilized = Math.min(Math.floor(raw), numberOperand(row,'mobilization_cap'));
    if (numberOperand(row,'mobilized') !== mobilized) fail('direct mobilized arithmetic mismatch');
    const credit = mobilized + numberOperand(row,'shipment_bonus');
    if (numberOperand(row,'credit') !== credit || afterAvailable - beforeAvailable !== credit) fail('direct credit composition mismatch');
  } else if (row.writer_group === 'shared') {
    const contribution = Math.min(Math.floor(numberOperand(row,'displaced_in') * numberOperand(row,'reinforcement_rate')), numberOperand(row,'contribution_cap'));
    if (numberOperand(row,'credit') !== contribution || afterAvailable - beforeAvailable !== contribution) fail('shared displaced arithmetic mismatch');
  } else if (row.writer_group === 'decay') {
    const debit = Math.floor(beforeAvailable * numberOperand(row,'rate'));
    if (numberOperand(row,'debit') !== debit || afterAvailable !== Math.max(0,beforeAvailable-debit)) fail('decay arithmetic mismatch');
  } else {
    const pendingBefore = numberOperand(row,'wounded_pending_before');
    const returned = Math.min(pendingBefore, numberOperand(row,'trickle_rate'));
    if (numberOperand(row,'returned') !== returned || numberOperand(row,'wounded_pending_after') !== pendingBefore-returned) fail('WIA pending conservation mismatch');
    if (afterAvailable !== Math.max(0,beforeAvailable+returned)) fail('WIA available conservation mismatch');
  }
}

function validatePoolFlowStream(text) {
  if (typeof text !== 'string') fail('input must be text');
  const rows = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith(PREFIX + ' ')) {
      let parsed;
      try { parsed = JSON.parse(line.slice(PREFIX.length + 1)); } catch { fail('malformed pool_flow JSON'); }
      rows.push(parsed);
    } else if (PREFIX.startsWith(line) || line.startsWith('[pool_fl')) {
      fail('partial topic prefix');
    }
  }
  if (rows.length === 0) fail('missing pool_flow rows');
  const turns = [];
  let previousTurn = -Infinity;
  for (const row of rows) {
    if (!row || row.schema_version !== 1) fail('unsupported schema_version');
    if (row.pool_key !== 'pale:RS') fail('unexpected pool selector');
    if (!TARGET_TURNS.includes(row.completed_turn)) fail('unexpected completed turn');
    if (row.completed_turn < previousTurn) fail('turn order');
    previousTurn = row.completed_turn;
    if (!turns.includes(row.completed_turn)) turns.push(row.completed_turn);
    if (!['phase_start', 'phase_end', 'mutation', 'writer_qualification', 'terminal'].includes(row.event)) fail('unknown event');
  }
  if (!same(turns, TARGET_TURNS)) fail('missing required turn');

  let mutationCount = 0;
  let terminalCount = 0;
  const uninstrumentedPhaseDeltas = [];
  let previousTurnTerminalPool = null;
  for (const turn of TARGET_TURNS) {
    const group = rows.filter((row) => row.completed_turn === turn);
    if (group.length === 0) fail(`turn ${turn} missing`);
    let openPhase = null;
    let openWriterRows = [];
    const phaseStarts = [];
    let lastPool = null;
    let phaseStartPool = null;
    for (let index = 0; index < group.length; index += 1) {
      const row = group[index];
      if (row.sequence !== index + 1) fail(`turn ${turn} sequence discontinuity`);
      const startPool = recordStartPool(row);
      const endPool = recordEndPool(row);
      validatePool(startPool, `turn ${turn} row ${index + 1} start pool`);
      validatePool(endPool, `turn ${turn} row ${index + 1} end pool`);
      if (index === 0 && previousTurnTerminalPool && !same(previousTurnTerminalPool, startPool)) fail('two-turn pool continuity failure');
      if (row.event === 'phase_start') {
        if (openPhase) fail(`turn ${turn} nested phase`);
        if (lastPool && !same(lastPool, startPool)) fail(`turn ${turn} cross-phase pool continuity failure`);
        openPhase = [row.phase_name, row.phase_family, row.phase_index];
        openWriterRows = [];
        phaseStartPool = startPool;
        phaseStarts.push({ phase_name: row.phase_name, phase_family: row.phase_family });
      } else if (row.event === 'phase_end') {
        if (!openPhase || !same(openPhase, [row.phase_name, row.phase_family, row.phase_index])) fail(`turn ${turn} unmatched phase end`);
        if (!['executed', 'skipped'].includes(row.status)) fail(`turn ${turn} invalid phase status`);
        if (openWriterRows.length > 0 && lastPool && !same(lastPool, startPool)) fail(`turn ${turn} covered phase pool continuity failure`);
        if (openWriterRows.length === 0 && !same(phaseStartPool, endPool)) {
          if (row.status !== 'executed') fail(`turn ${turn} skipped phase changed pool`);
          uninstrumentedPhaseDeltas.push({
            completed_turn: turn,
            phase_name: row.phase_name,
            phase_family: row.phase_family,
            phase_index: row.phase_index,
            before: phaseStartPool,
            after: endPool,
          });
        }
        const required = REQUIRED_WRITERS_BY_PHASE.get(row.phase_name) ?? [];
        if (!same(openWriterRows.map((item)=>item.writer_group).slice().sort(), required.slice().sort())) fail(`turn ${turn} ${row.phase_name} writer coverage mismatch`);
        for (const writer of openWriterRows) {
          if (writer.event === 'mutation' && row.status !== 'executed') fail('mutation in skipped phase');
          if (writer.event === 'writer_qualification') {
            if (row.status === 'skipped' && (writer.result !== 'skipped' || writer.skip_reason !== row.skip_reason)) fail('writer skip semantics mismatch');
            if (row.status === 'executed' && (writer.result !== 'unreached' || writer.skip_reason !== null)) fail('writer skip semantics mismatch');
          }
        }
        openPhase = null;
        phaseStartPool = null;
      } else if (row.event === 'mutation') {
        mutationCount += 1;
        if (!openPhase) fail(`turn ${turn} mutation outside phase`);
        if (lastPool && !same(lastPool, startPool)) fail(`turn ${turn} mutation pool continuity failure`);
        if (openWriterRows.some((item)=>item.writer_group===row.writer_group)) fail('duplicate writer coverage');
        openWriterRows.push(row);
        if (!row.operands || typeof row.operands !== 'object') fail('missing mutation operands');
        for (const [name, observed] of Object.entries(row.operands)) value(observed, `operand ${name}`);
        validateMutationArithmetic(row);
      } else if (row.event === 'writer_qualification') {
        if (!openPhase) fail(`turn ${turn} qualification outside phase`);
        if (lastPool && !same(lastPool, startPool)) fail(`turn ${turn} qualification pool continuity failure`);
        if (openWriterRows.some((item)=>item.writer_group===row.writer_group)) fail('duplicate writer coverage');
        openWriterRows.push(row);
        const expectedSource = row.writer_group === 'direct' ? 'ongoing_mobilization' : row.writer_group === 'shared' ? 'pool_population' : row.writer_group === 'decay' ? 'pool_decay' : row.writer_group === 'wia' ? 'formation_spawn' : null;
        if (row.source !== expectedSource) fail('qualification writer group/source mismatch');
        if (!['skipped','unreached'].includes(row.result) || row.branch !== 'not_reached') fail('invalid writer qualification');
        if (!same(row.before,row.after) || Object.keys(row.operands ?? {}).length !== 0) fail('writer qualification changed balance or invented operands');
      } else {
        terminalCount += 1;
        if (lastPool && !same(lastPool, startPool)) fail(`turn ${turn} terminal pool continuity failure`);
        if (index !== group.length - 1) fail(`turn ${turn} terminal is not final`);
        if (openPhase) fail(`turn ${turn} terminal with open phase`);
        if (row.status !== 'success' || row.error_status !== null) fail(`turn ${turn} terminal status incomplete`);
        if (row.attempted_record_count !== row.sequence || row.emitted_record_count !== row.sequence - 1 || row.diagnostic_error_count !== 0) fail(`turn ${turn} terminal manifest mismatch`);
        if (!Array.isArray(row.expected_phase_manifest) || !Array.isArray(row.observed_phase_manifest)) fail(`turn ${turn} missing phase manifest`);
        if (!same(row.expected_phase_manifest,row.observed_phase_manifest) || !same(row.observed_phase_manifest,phaseStarts)) fail(`turn ${turn} phase manifest mismatch`);
        for (const requiredPhase of REQUIRED_WRITERS_BY_PHASE.keys()) if (!row.expected_phase_manifest.some((phase) => phase.phase_name === requiredPhase && phase.phase_family === 'war')) fail(`turn ${turn} phase manifest missing ${requiredPhase}`);
      }
      lastPool = endPool;
    }
    if (group[group.length - 1].event !== 'terminal') fail(`turn ${turn} missing terminal`);
    previousTurnTerminalPool = recordEndPool(group[group.length - 1]);
  }
  return {
    schema_version: 1,
    pool_key: 'pale:RS',
    turns: TARGET_TURNS.slice(),
    row_count: rows.length,
    terminal_count: terminalCount,
    mutation_count: mutationCount,
    uninstrumented_phase_delta_count: uninstrumentedPhaseDeltas.length,
    uninstrumented_phase_deltas: uninstrumentedPhaseDeltas,
  };
}

function main(argv) {
  let input = null; let output = null;
  for (let i = 0; i < argv.length; i += 2) {
    if (argv[i] === '--input') input = argv[i + 1];
    else if (argv[i] === '--output') output = argv[i + 1];
    else fail(`unknown argument: ${argv[i]}`);
  }
  if (!input || !output) { process.stderr.write('usage: pool_flow_reader.cjs --input FILE --output FILE\n'); return 3; }
  if (fs.existsSync(output)) fail('output already exists');
  const result = validatePoolFlowStream(fs.readFileSync(input, 'utf8'));
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
  return 0;
}

module.exports = { validatePoolFlowStream };
if (require.main === module) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 2; }
}
