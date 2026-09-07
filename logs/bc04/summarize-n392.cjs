const fs = require('node:fs');
const path = require('node:path');

const runDir = path.resolve('runs/apr1992_definitive_188w__6898d6d2e324c7a3__w188_n392');
const state = JSON.parse(fs.readFileSync(path.join(runDir, 'final_save.json'), 'utf8'));
const ids = [
  'ahmici_massacre_1993', 'tuzla_gate_massacre_1995', 'un_hostage_crisis_1995',
  'rapid_reaction_force_1995', 'srebrenica_falls_1995', 'srebrenica_column_breakout_1995',
  'zepa_falls_1995', 'second_markale_massacre_1995', 'nato_deliberate_force_1995',
  'operation_storm_1995', 'operation_mistral_2_1995',
];
const fired = new Set(state.military?.fired_event_ids ?? []);
const firedTurns = state.military?.event_last_fired_turn ?? {};
const control162 = (state.political?.control_events ?? []).filter((row) => row.turn === 162);
const mechanismCounts = {};
for (const row of control162) mechanismCounts[row.mechanism] = (mechanismCounts[row.mechanism] ?? 0) + 1;

const brigadeIds = new Set([
  'arbih_280th_east_bosnian_light', 'arbih_281st_east_bosnian_light',
  'arbih_282nd_east_bosnian_light', 'arbih_283rd_east_bosnian_light',
  'arbih_284th_east_bosnian_light',
]);
const snapshots = fs.readFileSync(path.join(runDir, 'brigade_temporal_log.jsonl'), 'utf8')
  .split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))
  .filter((row) => brigadeIds.has(row.brigade_id) && [160, 162, 167, 176, 179].includes(row.turn))
  .map((row) => ({ turn: row.turn, brigade_id: row.brigade_id, personnel: row.personnel, location_osid: row.location_osid, status: row.status }));

const output = {
  run_dir: runDir,
  event_receipts: ids.map((id) => ({ id, fired: fired.has(id), fired_turn: firedTurns[id] ?? null })),
  turn_162_all_control_events: control162.length,
  turn_162_mechanism_counts: mechanismCounts,
  enclave_displaced_brigade_snapshots: snapshots,
  calendar: {
    epoch: '1992-04-06',
    convention: 'one-based historical bucket wN = floor((date - 1992-04-06) / 7) + 1; not the runtime date of tN',
    runtime_convention: 'displayed date = 1992-04-06 + turn * 7 days; week_index is zero-based',
    runtime_dates: { t54: '1993-04-19', t164: '1995-05-29', t171: '1995-07-17', t172: '1995-07-24', t173: '1995-07-31', t178: '1995-09-04', t179: '1995-09-11' },
    w54: '1993-04-12..18',
    w164: '1995-05-22..28',
    w171: '1995-07-10..16',
    w178: '1995-08-28..09-03',
  },
  current_code_candidate: {
    turn_min: 169,
    rate: '1 + 2 coha_expired - 0.5 rrf_deployed + 1 un_hostage_crisis_occurred = 3.5',
    accrual: ['t169=3.5', 't170=7.0', 't171=10.5 => receipt'],
    caveat: 'requires_events consumers observe the prerequisite on a later evaluation turn; do not promise same-turn column or Deliberate Force receipts without changing engine semantics',
  },
};
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
