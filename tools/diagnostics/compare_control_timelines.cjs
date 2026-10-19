#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DEFAULT_EPOCHS = [
  { id: 'jan1993', turn: 39 },
  { id: 'apr1994', turn: 104 },
  { id: 'apr1995', turn: 156 },
  { id: 'oct1995', turn: 188 },
];
const CONTROL_OWNERS = new Set(['RBiH', 'RS', 'HRHB']);
const CONTROL_MECHANISMS = new Set(['combat', 'paramilitary', 'consolidation', 'abandoned', 'event', 'setup_control']);

const compareAscii = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const sha256File = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

class DiagnosticInputError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'DiagnosticInputError';
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) {
  throw new DiagnosticInputError(code, message, details);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail('INVALID_JSON', `cannot read JSON ${file}: ${error.message}`, { file });
  }
}

function readJsonLinesStrict(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (error) {
    fail('UNREADABLE_JSONL', `cannot read JSONL ${file}: ${error.message}`, { file });
  }
  if (!text.endsWith('\n')) fail('TRUNCATED_JSONL', `${file} is missing its terminal newline`, { file });
  const lines = text.slice(0, -1).split(/\r?\n/);
  if (lines.some((line) => line.length === 0)) fail('MALFORMED_JSONL', `${file} contains a blank record`, { file });
  return lines.map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      fail('MALFORMED_JSONL', `${file} line ${index + 1} is invalid JSON: ${error.message}`, { file, line: index + 1 });
    }
  });
}

function assertOwnerValue(value, label, allowNull) {
  if (value === null && allowNull) return;
  if (!CONTROL_OWNERS.has(value)) fail('INVALID_OWNER_DOMAIN', `${label} has invalid owner ${String(value)}`, { owner: value, allowed: [...CONTROL_OWNERS] });
}

function assertOwnerMap(value, label, allowNull = true) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('INVALID_OWNER_MAP', `${label} must be an object`);
  for (const [osid, owner] of Object.entries(value)) {
    if (!osid) fail('INVALID_OWNER_MAP', `${label} has an empty OSID`);
    assertOwnerValue(owner, `${label} row ${osid}`, allowNull);
  }
  return value;
}

function normalizeControlEvents(rawEvents, horizon) {
  if (!Array.isArray(rawEvents)) fail('INVALID_EVENTS', 'control_events must be an array');
  let previousTurn = 0;
  return rawEvents.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('INVALID_EVENT', `control event ${index} must be an object`);
    const hasNative = own(raw, 'settlement_id');
    const hasCompact = own(raw, 'osid');
    if (hasNative && hasCompact) fail('AMBIGUOUS_EVENT_ID', `control event ${index} has ambiguous settlement identifiers`);
    if (!hasNative && !hasCompact) fail('MISSING_EVENT_ID', `control event ${index} is missing a settlement identifier`);
    const osid = hasNative ? raw.settlement_id : raw.osid;
    if (typeof osid !== 'string' || !osid) fail('INVALID_EVENT_ID', `control event ${index} has an invalid settlement identifier`);
    if (!Number.isInteger(raw.turn) || raw.turn < 1 || raw.turn > horizon) fail('EVENT_TURN_OUT_OF_BOUNDS', `control event ${index} turn is outside 1..${horizon}`);
    if (raw.turn < previousTurn) fail('UNSORTED_EVENTS', `control event ${index} precedes the previous turn`);
    previousTurn = raw.turn;
    if (!own(raw, 'mechanism')) fail('MISSING_EVENT_KEY', `control event ${index} is missing mechanism`);
    if (!CONTROL_MECHANISMS.has(raw.mechanism)) fail('INVALID_MECHANISM', `control event ${index} has invalid mechanism ${String(raw.mechanism)}`);
    if (!own(raw, 'from')) fail('MISSING_EVENT_KEY', `control event ${index} is missing from owner`);
    if (!own(raw, 'to')) fail('MISSING_EVENT_KEY', `control event ${index} is missing to owner`);
    assertOwnerValue(raw.from, `control event ${index} from owner`, true);
    assertOwnerValue(raw.to, `control event ${index} to owner`, true);
    const event = {
      index,
      turn: raw.turn,
      osid,
      mechanism: raw.mechanism,
      from: raw.from,
      to: raw.to,
      battle_id: raw.battle_id ?? null,
      attacker_brigade: raw.attacker_brigade ?? null,
    };
    if (event.mechanism === 'combat' && (typeof event.battle_id !== 'string' || !event.battle_id || typeof event.attacker_brigade !== 'string' || !event.attacker_brigade)) {
      fail('MISSING_BATTLE_RECEIPT', `combat event ${index} has a missing battle receipt`, { index, osid });
    }
    return event;
  });
}

function replay(initial, events, turn, label = 'run') {
  const state = { ...initial };
  for (const event of events) {
    if (event.turn > turn) break;
    if (!own(state, event.osid)) fail('UNKNOWN_EVENT_OSID', `${label} event ${event.index} names unknown OSID ${event.osid}`);
    if (state[event.osid] !== event.from) fail('BROKEN_EVENT_CHAIN', `${label} event ${event.index} from owner does not match replay state`, { osid: event.osid, expected: state[event.osid], actual: event.from });
    state[event.osid] = event.to;
  }
  return state;
}

function mapDiff(left, right) {
  const ids = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort(compareAscii);
  return ids.filter((id) => left[id] !== right[id]).map((osid) => ({ osid, left: left[osid] ?? null, right: right[osid] ?? null }));
}

function assertSameCoverage(left, right, label) {
  const leftKeys = Object.keys(left).sort(compareAscii);
  const rightKeys = Object.keys(right).sort(compareAscii);
  if (JSON.stringify(leftKeys) !== JSON.stringify(rightKeys)) fail('COVERAGE_MISMATCH', `${label} does not have identical OSID coverage`, { left_count: leftKeys.length, right_count: rightKeys.length });
}

function recordedBattle(battle, actualTurn) {
  const result = {
    battle_id: battle.battle_id,
    turn: actualTurn,
    target_osid: battle.target_osid,
    attacker_brigade: battle.attacker_brigade,
    attacker_faction: battle.attacker_faction,
    attacker_won: battle.attacker_won,
  };
  for (const key of ['defender_brigade', 'defender_faction', 'operation_id', 'operation_name', 'outcome', 'power_ratio']) {
    if (own(battle, key)) result[key] = battle[key];
  }
  if (Array.isArray(battle.contributing_operation_ids)) result.contributing_operation_ids = [...new Set(battle.contributing_operation_ids)].sort(compareAscii);
  return result;
}

function classifyCapture(event, battle) {
  if (event.mechanism !== 'combat') return { kind: 'non_combat_mechanism', operation_ids: [] };
  const operationIds = [];
  if (battle && Array.isArray(battle.contributing_operation_ids)) {
    operationIds.push(...battle.contributing_operation_ids.filter((id) => typeof id === 'string' && id));
  }
  if (battle && typeof battle.operation_id === 'string' && battle.operation_id) operationIds.push(battle.operation_id);
  const unique = [...new Set(operationIds)].sort(compareAscii);
  return unique.length
    ? { kind: 'operation_owned', operation_ids: unique }
    : { kind: 'operationless_or_unattributed', operation_ids: [] };
}

function readRun(runDir, referenceIds) {
  const initialPath = path.join(runDir, 'initial_save.json');
  const finalPath = path.join(runDir, 'final_save.json');
  const weeklyPath = path.join(runDir, 'weekly_report.jsonl');
  const metaPath = path.join(runDir, 'run_meta.json');
  for (const file of [initialPath, finalPath, weeklyPath, metaPath]) if (!fs.existsSync(file)) fail('MISSING_INPUT', `required input is missing: ${file}`, { file });
  const initialSave = readJson(initialPath);
  const finalSave = readJson(finalPath);
  const runMeta = readJson(metaPath);
  const horizon = finalSave?.meta?.turn;
  if (!Number.isInteger(horizon) || horizon < 1 || runMeta.weeks !== horizon) fail('INVALID_HORIZON', `${runDir} final turn and run_meta weeks must match`, { final_turn: horizon, run_meta_weeks: runMeta.weeks });
  const initial = assertOwnerMap(initialSave?.political?.political_controllers, `${runDir} initial controllers`);
  const stampedInitial = assertOwnerMap(finalSave?.political?.initial_political_controllers, `${runDir} stamped initial controllers`);
  const final = assertOwnerMap(finalSave?.political?.political_controllers, `${runDir} final controllers`);
  assertSameCoverage(initial, stampedInitial, `${runDir} initial maps`);
  assertSameCoverage(initial, final, `${runDir} initial/final maps`);
  if (mapDiff(initial, stampedInitial).length) fail('INITIAL_STATE_MISMATCH', `${runDir} initial save differs from stamped initial controllers`);
  if (referenceIds) assertSameCoverage(initial, Object.fromEntries(referenceIds.map((id) => [id, 'reference'])), `${runDir} reference coverage`);
  const events = normalizeControlEvents(finalSave?.political?.control_events, horizon);
  const replayFinal = replay(stampedInitial, events, horizon, runDir);
  const finalMismatches = mapDiff(replayFinal, final);
  if (finalMismatches.length) fail('FINAL_REPLAY_MISMATCH', `${runDir} final control does not match replay`, { mismatches: finalMismatches });

  const weekly = readJsonLinesStrict(weeklyPath);
  if (weekly.length !== horizon) fail('WEEKLY_COUNT_MISMATCH', `${weeklyPath} must contain ${horizon} records`, { actual: weekly.length });
  const battleById = new Map();
  for (let index = 0; index < weekly.length; index++) {
    const row = weekly[index];
    const actualTurn = index + 1;
    if (row.week_index !== actualTurn) fail('WEEKLY_INDEX_MISMATCH', `${weeklyPath} record ${actualTurn} has week_index ${row.week_index}`);
    if (own(row, 'battles') && !Array.isArray(row.battles)) fail('INVALID_BATTLES', `${weeklyPath} record ${actualTurn} has an invalid battles field`);
    for (const battle of row.battles ?? []) {
      if (!battle || typeof battle.battle_id !== 'string' || !battle.battle_id) fail('INVALID_BATTLE', `${weeklyPath} turn ${actualTurn} has an invalid battle`);
      if (battleById.has(battle.battle_id)) fail('DUPLICATE_BATTLE_ID', `duplicate battle_id ${battle.battle_id}`);
      if (own(battle, 'turn') && battle.turn !== actualTurn) fail('BATTLE_TURN_MISMATCH', `battle ${battle.battle_id} contradicts its weekly turn`);
      battleById.set(battle.battle_id, recordedBattle(battle, actualTurn));
    }
  }

  let combatEvents = 0;
  for (const event of events) {
    if (event.mechanism !== 'combat') continue;
    combatEvents++;
    const battle = battleById.get(event.battle_id);
    if (!battle) fail('MISSING_BATTLE_RECEIPT', `combat event ${event.index} has missing battle receipt ${event.battle_id}`);
    if (battle.turn !== event.turn || battle.target_osid !== event.osid || battle.attacker_brigade !== event.attacker_brigade || battle.attacker_won !== true || battle.attacker_faction !== event.to) {
      fail('CONTRADICTORY_BATTLE_RECEIPT', `combat event ${event.index} has a contradictory battle receipt`, { event, battle });
    }
  }

  const saveFiles = fs.readdirSync(runDir).filter((name) => /^save_w\d+\.json$/.test(name)).sort((left, right) => {
    const turnDelta = Number(left.match(/\d+/)[0]) - Number(right.match(/\d+/)[0]);
    return turnDelta || compareAscii(left, right);
  });
  const seenSaveTurns = new Set();
  const saveValidation = [];
  for (const name of saveFiles) {
    const namedTurn = Number(name.match(/\d+/)[0]);
    if (seenSaveTurns.has(namedTurn)) fail('DUPLICATE_SAVE_TURN', `${runDir} has duplicate saves for turn ${namedTurn}`);
    seenSaveTurns.add(namedTurn);
    const saved = readJson(path.join(runDir, name));
    if (saved?.meta?.turn !== namedTurn || namedTurn < 1 || namedTurn > horizon) fail('SAVE_TURN_MISMATCH', `${name} is not bound to its meta.turn`);
    const savedOwners = assertOwnerMap(saved?.political?.political_controllers, `${name} controllers`);
    assertSameCoverage(initial, savedOwners, `${name} coverage`);
    const mismatches = mapDiff(replay(stampedInitial, events, namedTurn, runDir), savedOwners);
    if (mismatches.length) fail('SAVE_REPLAY_MISMATCH', `${name} control does not match replay`, { mismatches });
    saveValidation.push({ file: name, turn: namedTurn, mismatch_count: 0 });
  }

  const manifestRows = runMeta?.provenance?.consumed_inputs?.files;
  if (!Array.isArray(manifestRows)) fail('MISSING_INPUT_MANIFEST', `${runDir} has no consumed-input file manifest`);
  const manifest = new Map();
  for (const row of manifestRows) {
    if (!row || typeof row.path !== 'string' || typeof row.sha256 !== 'string') fail('INVALID_INPUT_MANIFEST', `${runDir} has an invalid manifest row`);
    if (manifest.has(row.path)) fail('DUPLICATE_INPUT_MANIFEST_ROW', `${runDir} repeats manifest path ${row.path}`);
    manifest.set(row.path, row.sha256);
  }
  return {
    dir: path.resolve(runDir), horizon, initial, final, events, battleById, manifest, runMeta,
    replay_validation: { final_mismatch_count: 0, saved_turns: saveValidation },
    capture_join_coverage: { combat_events: combatEvents, exact_battle_joins: combatEvents },
    input_hashes: {
      initial_save: sha256File(initialPath), final_save: sha256File(finalPath), weekly_report: sha256File(weeklyPath), run_meta: sha256File(metaPath),
    },
  };
}

function stateAt(run, turn) {
  return replay(run.initial, run.events, turn, run.dir);
}

function eventWithJoin(run, event) {
  const battle = event.battle_id ? run.battleById.get(event.battle_id) ?? null : null;
  return { ...event, attribution: classifyCapture(event, battle), battle };
}

function compareManifests(baseline, candidate) {
  const paths = [...new Set([...baseline.keys(), ...candidate.keys()])].sort(compareAscii);
  return paths.filter((name) => baseline.get(name) !== candidate.get(name)).map((name) => ({
    path: name,
    baseline_sha256: baseline.get(name) ?? null,
    candidate_sha256: candidate.get(name) ?? null,
    kind: !baseline.has(name) ? 'missing_from_baseline' : !candidate.has(name) ? 'missing_from_candidate' : 'hash_changed',
  }));
}

function compareControlTimelines(options) {
  const epochs = options.epochs ?? DEFAULT_EPOCHS;
  const referencesDir = options.referencesDir ?? path.resolve('data/source/calibration');
  const references = epochs.map((epoch) => {
    const file = path.join(referencesDir, `painted_control_${epoch.id}.json`);
    const owners = assertOwnerMap(readJson(file)?.by_settlement_id, `${epoch.id} reference`, false);
    return { ...epoch, file: path.resolve(file), owners, sha256: sha256File(file) };
  });
  const referenceIds = Object.keys(references[0].owners).sort(compareAscii);
  for (const reference of references.slice(1)) assertSameCoverage(references[0].owners, reference.owners, `${reference.id} reference coverage`);
  const baseline = readRun(options.baselineDir, referenceIds);
  const candidate = readRun(options.candidateDir, referenceIds);
  if (baseline.horizon !== candidate.horizon) fail('HORIZON_MISMATCH', 'baseline and candidate horizons differ');
  for (const epoch of epochs) if (!Number.isInteger(epoch.turn) || epoch.turn < 0 || epoch.turn > baseline.horizon) fail('EPOCH_OUT_OF_BOUNDS', `${epoch.id} turn ${epoch.turn} is outside the run horizon`);

  const checkpoints = [];
  const regressed = new Map();
  const changed = new Map();
  for (const reference of references) {
    const baselineState = stateAt(baseline, reference.turn);
    const candidateState = stateAt(candidate, reference.turn);
    const lost = [];
    const gained = [];
    const triples = [];
    let baselineScore = 0;
    let candidateScore = 0;
    for (const osid of referenceIds) {
      const expected = reference.owners[osid];
      const baselineMatch = baselineState[osid] === expected;
      const candidateMatch = candidateState[osid] === expected;
      if (baselineMatch) baselineScore++;
      if (candidateMatch) candidateScore++;
      if (baselineMatch && !candidateMatch) { lost.push(osid); regressed.set(osid, true); }
      if (!baselineMatch && candidateMatch) gained.push(osid);
      if (baselineState[osid] !== candidateState[osid]) {
        triples.push({ osid, baseline_owner: baselineState[osid], candidate_owner: candidateState[osid], expected_owner: expected });
        changed.set(osid, true);
      }
    }
    checkpoints.push({ epoch: reference.id, turn: reference.turn, baseline_score: baselineScore, candidate_score: candidateScore, gross_lost: lost.length, gross_gained: gained.length, net: gained.length - lost.length, lost_osids: lost, gained_osids: gained, owner_triples: triples });
  }

  const states = [];
  for (let turn = 0; turn <= baseline.horizon; turn++) {
    const left = stateAt(baseline, turn);
    const right = stateAt(candidate, turn);
    states.push({ turn, differences: mapDiff(left, right) });
  }
  const firstTransient = states.find((row) => row.differences.length) ?? null;
  const finalDifferenceIds = new Set(states.at(-1).differences.map((row) => row.osid));
  const persistentRows = [...finalDifferenceIds].sort(compareAscii).map((osid) => {
    let lastEqualTurn = -1;
    for (const row of states) if (!row.differences.some((difference) => difference.osid === osid)) lastEqualTurn = row.turn;
    return { osid, turn: lastEqualTurn + 1 };
  });
  const earliestPersistent = persistentRows.length ? [...persistentRows].sort((left, right) => left.turn - right.turn || compareAscii(left.osid, right.osid))[0] : null;

  const changedOsids = [...changed.keys()].sort(compareAscii).map((osid) => {
    const baselineEvents = baseline.events.filter((event) => event.osid === osid).map((event) => eventWithJoin(baseline, event));
    const candidateEvents = candidate.events.filter((event) => event.osid === osid).map((event) => eventWithJoin(candidate, event));
    const missingBeneficial = [];
    const newAdverse = [];
    for (const checkpoint of checkpoints.filter((row) => row.lost_osids.includes(osid))) {
      const expected = references.find((row) => row.id === checkpoint.epoch).owners[osid];
      const baselineBeneficial = baselineEvents.filter((event) => event.turn <= checkpoint.turn && event.mechanism === 'combat' && event.to === expected);
      const candidateBeneficial = candidateEvents.filter((event) => event.turn <= checkpoint.turn && event.mechanism === 'combat' && event.to === expected);
      if (baselineBeneficial.length && !candidateBeneficial.length) missingBeneficial.push({ epoch: checkpoint.epoch, expected_owner: expected, baseline_event_indices: baselineBeneficial.map((event) => event.index) });
      const baselineAdverse = new Set(baselineEvents.filter((event) => event.turn <= checkpoint.turn && event.mechanism === 'combat' && event.to !== expected).map((event) => `${event.turn}|${event.to}|${event.battle_id ?? ''}`));
      for (const event of candidateEvents.filter((item) => item.turn <= checkpoint.turn && item.mechanism === 'combat' && item.to !== expected)) {
        if (!baselineAdverse.has(`${event.turn}|${event.to}|${event.battle_id ?? ''}`)) newAdverse.push({ epoch: checkpoint.epoch, candidate_event_index: event.index, turn: event.turn, owner: event.to });
      }
    }
    return {
      osid,
      baseline: { initial_owner: baseline.initial[osid], final_owner: baseline.final[osid], events: baselineEvents },
      candidate: { initial_owner: candidate.initial[osid], final_owner: candidate.final[osid], events: candidateEvents },
      missing_beneficial_captures: missingBeneficial,
      new_adverse_captures: newAdverse,
    };
  });
  const regressedOsids = changedOsids.filter((row) => regressed.has(row.osid));

  return {
    schema_version: 1,
    baseline: { dir: baseline.dir, horizon: baseline.horizon, replay_validation: baseline.replay_validation, capture_join_coverage: baseline.capture_join_coverage, input_hashes: baseline.input_hashes },
    candidate: { dir: candidate.dir, horizon: candidate.horizon, replay_validation: candidate.replay_validation, capture_join_coverage: candidate.capture_join_coverage, input_hashes: candidate.input_hashes },
    references: references.map((reference) => ({ epoch: reference.id, turn: reference.turn, path: reference.file, sha256: reference.sha256, osid_count: referenceIds.length })),
    checkpoints,
    timeline: {
      first_transient_divergence: firstTransient ? { turn: firstTransient.turn, osids: firstTransient.differences.map((row) => row.osid) } : null,
      earliest_persistent_divergence: earliestPersistent,
      persistent_osids: persistentRows,
    },
    changed_osids: changedOsids,
    regressed_osids: regressedOsids,
    provenance: {
      consumed_input_differences: compareManifests(baseline.manifest, candidate.manifest),
      baseline_git_commit: baseline.runMeta?.provenance?.git_commit ?? null,
      candidate_git_commit: candidate.runMeta?.provenance?.git_commit ?? null,
      baseline_git_dirty: baseline.runMeta?.provenance?.git_dirty ?? null,
      candidate_git_dirty: candidate.runMeta?.provenance?.git_dirty ?? null,
      interpretation: 'Manifest rows compare recorded content hashes. Git HEAD and dirty flags do not prove source-byte identity.',
    },
    causal_boundary: { source_cause: 'UNMEASURED', decision_cause: 'UNMEASURED' },
  };
}

function stableClone(value) {
  if (Array.isArray(value)) return value.map(stableClone);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort(compareAscii).map((key) => [key, stableClone(value[key])]));
  return value;
}

function stableSerialize(value) {
  return JSON.stringify(stableClone(value), null, 2) + '\n';
}

function usage() {
  return [
    'Usage: node tools/diagnostics/compare_control_timelines.cjs --baseline DIR --candidate DIR --out NEW_JSON [--references DIR]',
    '',
    'Compares two completed run directories without running the simulation.',
    'The output path must not already exist.',
  ].join('\n');
}

function parseArgs(argv) {
  if (argv.includes('--help') || argv.includes('-h')) return { help: true };
  const allowed = new Set(['--baseline', '--candidate', '--out', '--references']);
  const parsed = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!allowed.has(flag) || value === undefined || value.startsWith('--')) fail('INVALID_ARGUMENTS', `invalid argument ${flag ?? '<missing>'}`);
    parsed[flag.slice(2)] = value;
  }
  for (const required of ['baseline', 'candidate', 'out']) if (!parsed[required]) fail('INVALID_ARGUMENTS', `missing --${required}`);
  return parsed;
}

function main(argv = process.argv.slice(2)) {
  try {
    const args = parseArgs(argv);
    if (args.help) {
      process.stdout.write(usage() + '\n');
      return 0;
    }
    const output = path.resolve(args.out);
    if (fs.existsSync(output)) fail('OUTPUT_EXISTS', `output already exists: ${output}`, { output });
    const report = compareControlTimelines({ baselineDir: path.resolve(args.baseline), candidateDir: path.resolve(args.candidate), referencesDir: args.references ? path.resolve(args.references) : undefined });
    fs.writeFileSync(output, stableSerialize(report), { encoding: 'utf8', flag: 'wx' });
    process.stdout.write(stableSerialize({ status: 'ok', output, baseline_score: report.checkpoints.map((row) => row.baseline_score), candidate_score: report.checkpoints.map((row) => row.candidate_score) }));
    return 0;
  } catch (error) {
    const problem = error instanceof DiagnosticInputError
      ? { status: 'failed', confident_attribution: false, problem: { code: error.code, message: error.message, details: error.details } }
      : { status: 'failed', confident_attribution: false, problem: { code: 'UNEXPECTED_ERROR', message: error instanceof Error ? error.message : String(error) } };
    process.stderr.write(stableSerialize(problem));
    return 2;
  }
}

module.exports = {
  DiagnosticInputError,
  classifyCapture,
  compareControlTimelines,
  normalizeControlEvents,
  readJsonLinesStrict,
  stableSerialize,
  main,
};

if (require.main === module) process.exitCode = main();
