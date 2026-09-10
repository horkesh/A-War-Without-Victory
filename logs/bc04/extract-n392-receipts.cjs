const fs = require('node:fs');
const path = require('node:path');

const runDir = path.resolve('runs/apr1992_definitive_188w__6898d6d2e324c7a3__w188_n392');
const state = JSON.parse(fs.readFileSync(path.join(runDir, 'final_save.json'), 'utf8'));
const watched = [
  'ahmici_massacre_1993',
  'tuzla_gate_massacre_1995',
  'un_hostage_crisis_1995',
  'rapid_reaction_force_1995',
  'srebrenica_falls_1995',
  'srebrenica_column_breakout_1995',
  'zepa_falls_1995',
  'second_markale_massacre_1995',
  'nato_deliberate_force_1995',
  'operation_storm_1995',
  'operation_mistral_2_1995',
];

function eventRows() {
  const fired = new Set(state.military?.fired_event_ids ?? []);
  const turns = state.military?.event_last_fired_turn ?? {};
  const readiness = state.military?.event_readiness ?? {};
  return watched.map((id) => ({ id, fired: fired.has(id), fired_turn: turns[id] ?? null, final_readiness: readiness[id] ?? null }));
}

function controlRows() {
  const targetTurns = new Set([162, 163, 164, 168, 170, 171, 174, 179]);
  return (state.political?.control_events ?? [])
    .filter((row) => targetTurns.has(row.turn) && /srebrenica|zepa|zivinice|lopare/i.test(`${row.settlement_id ?? ''} ${row.mun_id ?? ''}`))
    .map((row) => ({
      turn: row.turn,
      settlement_id: row.settlement_id,
      mun_id: row.mun_id,
      from: row.from,
      to: row.to,
      mechanism: row.mechanism,
    }));
}

function displacementRows() {
  const logPath = path.join(runDir, 'brigade_temporal_log.jsonl');
  return fs.readFileSync(logPath, 'utf8').split(/\r?\n/).filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((row) => row.turn >= 160 && row.turn <= 179)
    .filter((row) => /srebrenica|zepa|gracanica|zivinice|280th|281st|282nd|283rd|284th/i.test(JSON.stringify(row)))
    .map((row) => ({
      turn: row.turn,
      formation_id: row.formation_id ?? row.id,
      event: row.event ?? row.kind ?? row.reason,
      location: row.location ?? row.osid ?? row.location_osid,
      personnel: row.personnel,
      readiness: row.readiness,
      raw: row,
    }));
}

function operationRows() {
  const parsed = JSON.parse(fs.readFileSync(path.join(runDir, 'operation_aars.json'), 'utf8'));
  const rows = Array.isArray(parsed) ? parsed : (parsed.operations ?? parsed.aars ?? Object.values(parsed));
  return rows.filter((row) => {
    const text = JSON.stringify(row);
    const turn = row.start_turn ?? row.turn_started ?? row.launch_turn ?? row.turn ?? -1;
    return (turn >= 160 && turn <= 188) || /Sana|Mistral|Storm|Deliberate|Lopare|Posavina|Zivinice/i.test(text);
  }).map((row) => ({
    id: row.operation_id ?? row.id,
    name: row.operation_name ?? row.name,
    start_turn: row.start_turn ?? row.turn_started ?? row.launch_turn ?? row.turn,
    end_turn: row.end_turn ?? row.turn_completed,
    faction: row.faction ?? row.faction_id,
    total_attacks: row.total_attacks,
    captured_objectives: row.captured_objectives,
  }));
}

const output = {
  run_dir: runDir,
  state_turn: state.meta?.turn,
  events: eventRows(),
  relevant_control_events: controlRows(),
  relevant_brigade_temporal_rows: displacementRows(),
  late_operations: operationRows(),
};

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
