// Read-only: for the Jajce / Donji Vakuf operational cells, print the settlements each cell
// contains, its initial controller, its control history in a run, and every painted reference.
//
//   node logs/jajce-donji-vakuf-chronology-20260917/cells.cjs <run_dir>
//
// Turn N boundary date = 1992-04-06 + 7N days (src/ui/map/utils/formatters.ts turnToDateString).
const fs = require('fs');
const runDir = process.argv[2];

const names = JSON.parse(fs.readFileSync('data/derived/settlement_names.json', 'utf8')).by_census_id;
const canonical = JSON.parse(fs.readFileSync('data/derived/operational/canonical_to_operational_map.json', 'utf8'));
const save = JSON.parse(fs.readFileSync(runDir + '/final_save.json', 'utf8'));
const init = save.political.initial_political_controllers || {};
const events = (save.political.control_events || []).slice().sort((a, b) => a.turn - b.turn);

const REFS = ['jan1993', 'apr1994', 'apr1995', 'oct1995'];
const painted = {};
for (const r of REFS) {
  painted[r] = JSON.parse(fs.readFileSync('data/source/calibration/painted_control_' + r + '.json', 'utf8')).by_settlement_id;
}

const WANT = /^op:(jajce|donji_vakuf):|^op:travnik:gornje_krcevine$/;
const members = new Map();
for (const [sid, osid] of Object.entries(canonical)) {
  if (!WANT.test(osid)) continue;
  const n = names[String(sid).replace(/^S/, '')];
  if (!members.has(osid)) members.set(osid, []);
  members.get(osid).push(n ? n.name : sid);
}

const date = (t) => {
  const x = new Date('1992-04-06T00:00:00Z');
  x.setUTCDate(x.getUTCDate() + t * 7);
  return x.toISOString().slice(0, 10);
};

for (const osid of [...members.keys()].sort()) {
  const hits = events.filter((e) => (e.settlement_id || e.osid) === osid);
  const refs = REFS.map((r) => r + '=' + (painted[r][osid] ?? '(absent)')).join('  ');
  console.log(osid);
  console.log('    settlements : ' + members.get(osid).sort().join(', '));
  console.log('    t0          : ' + init[osid] + '   ' + refs);
  if (hits.length === 0) console.log('    control     : (no control events)');
  for (const h of hits) {
    console.log('    control     : t' + h.turn + ' ' + date(h.turn) + '  ' + h.from + ' -> ' + h.to +
      '  attacker=' + h.attacker_brigade + '  mechanism=' + h.mechanism);
  }
}
