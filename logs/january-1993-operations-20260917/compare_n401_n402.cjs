const fs = require('fs');
const crypto = require('crypto');

const A = 'runs/apr1992_definitive_188w__9137f75e9f35be20__w39_n401';
const B = 'runs/apr1992_definitive_188w__9137f75e9f35be20__w39_n402';

function sha(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }

const artifacts = ['final_save.json', 'run_summary.json', 'control_delta.json', 'weekly_report.jsonl', 'formation_delta.json', 'activity_summary.json', 'initial_save.json'];
console.log('=== artifact SHA-256 n401 vs n402 ===');
for (const f of artifacts) {
  const a = fs.existsSync(A + '/' + f) ? sha(A + '/' + f) : '(absent)';
  const b = fs.existsSync(B + '/' + f) ? sha(B + '/' + f) : '(absent)';
  console.log((a === b ? 'IDENTICAL ' : 'DIFF      ') + f);
}

function stateAt(rd) {
  const s = JSON.parse(fs.readFileSync(rd + '/final_save.json', 'utf8'));
  const init = s.political.initial_political_controllers;
  const ev = (s.political.control_events || []).slice().sort((x, y) => x.turn - y.turn);
  const out = { ...init };
  for (const e of ev) if (e.turn <= 39) out[e.settlement_id] = e.to;
  return out;
}
const ref = JSON.parse(fs.readFileSync('data/source/calibration/painted_control_jan1993.json', 'utf8')).by_settlement_id;
const sa = stateAt(A), sb = stateAt(B);
const ma = Object.keys(ref).filter((o) => sa[o] !== ref[o]).sort();
const mb = Object.keys(ref).filter((o) => sb[o] !== ref[o]).sort();
console.log('=== mismatch sets ===');
console.log('n401 count', ma.length, 'n402 count', mb.length, 'identical sets:', JSON.stringify(ma) === JSON.stringify(mb));
console.log('mismatches:', ma.join(', '));

function cap(rd, osid) {
  const s = JSON.parse(fs.readFileSync(rd + '/final_save.json', 'utf8'));
  return (s.political.control_events || []).filter((e) => e.settlement_id === osid).map((e) => `t${e.turn} ${e.from}->${e.to} ${e.mechanism} ${e.attacker_brigade}`);
}
console.log('=== key receipts n401 | n402 ===');
for (const o of ['op:stolac:pjesivac_kula_2', 'op:zavidovici:cardak_2', 'op:stolac:hatelji_2', 'op:donji_vakuf:prusac_2']) {
  console.log(o);
  console.log('  n401:', JSON.stringify(cap(A, o)));
  console.log('  n402:', JSON.stringify(cap(B, o)));
}

console.log('=== run_meta digests ===');
for (const rd of [A, B]) {
  const m = JSON.parse(fs.readFileSync(rd + '/run_meta.json', 'utf8'));
  console.log(rd.split('_').pop(), m.provenance.git_commit, m.provenance.node_version, m.provenance.consumed_inputs.digest);
}
