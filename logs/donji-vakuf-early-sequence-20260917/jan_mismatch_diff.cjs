// Read-only: diff two runs' January (t39) mismatch sets against the CURRENT painted jan1993
// reference, so a net-equal score cannot hide a swapped cell.
//
//   node logs/donji-vakuf-early-sequence-20260917/jan_mismatch_diff.cjs <base_run_dir> <cand_run_dir>
//
// Ownership at t39 is replayed as initial_political_controllers + control_events up to t39,
// which is how tools/verify_checkpoints.cjs scores, so the two agree by construction.
const fs = require('fs');

function ownershipAt(dir, turn) {
  const save = JSON.parse(fs.readFileSync(dir + '/final_save.json', 'utf8'));
  const own = { ...(save.political.initial_political_controllers || {}) };
  const events = (save.political.control_events || []).slice().sort((a, b) => a.turn - b.turn);
  for (const e of events) {
    if (e.turn > turn) continue;
    const osid = e.settlement_id || e.osid;
    if (osid) own[osid] = e.to;
  }
  return own;
}

function mismatches(dir, painted, turn) {
  const own = ownershipAt(dir, turn);
  const out = new Map();
  for (const [osid, expected] of Object.entries(painted)) {
    const actual = own[osid] ?? null;
    if (actual !== expected) out.set(osid, { expected, actual });
  }
  return out;
}

const [baseDir, candDir] = process.argv.slice(2);
const TURN = 39;
const paintedRaw = JSON.parse(fs.readFileSync('data/source/calibration/painted_control_jan1993.json', 'utf8')).by_settlement_id;
const painted = {};
for (const [osid, v] of Object.entries(paintedRaw)) painted[osid] = (v && typeof v === 'object') ? v.controller : v;

const base = mismatches(baseDir, painted, TURN);
const cand = mismatches(candDir, painted, TURN);
const total = Object.keys(painted).length;

console.log('painted jan1993 cells: ' + total);
console.log('BASE  ' + baseDir + '  matched ' + (total - base.size) + '/' + total + '  mismatches ' + base.size);
console.log('CAND  ' + candDir + '  matched ' + (total - cand.size) + '/' + total + '  mismatches ' + cand.size);
console.log('');

const fixed = [...base.keys()].filter((o) => !cand.has(o)).sort();
const introduced = [...cand.keys()].filter((o) => !base.has(o)).sort();
const carried = [...cand.keys()].filter((o) => base.has(o)).sort();

console.log('FIXED by the candidate (' + fixed.length + '):');
for (const o of fixed) console.log('   ' + o + '  expected ' + base.get(o).expected + ', base had ' + base.get(o).actual);
console.log('');
console.log('NEWLY INTRODUCED by the candidate (' + introduced.length + '):');
for (const o of introduced) console.log('   ' + o + '  expected ' + cand.get(o).expected + ', candidate has ' + cand.get(o).actual);
console.log('');
console.log('CARRIED (mismatched in both) (' + carried.length + '):');
for (const o of carried) console.log('   ' + o + '  expected ' + cand.get(o).expected + ', candidate has ' + cand.get(o).actual);
