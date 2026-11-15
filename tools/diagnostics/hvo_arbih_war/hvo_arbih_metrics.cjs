// Usage: node hvo_arbih_metrics.cjs <run_dir> [repoRoot]
// Measures the RBiH<->HRHB conflict in a finished run.
const fs = require('fs');
const path = require('path');
const runDir = process.argv[2];
const root = process.argv[3] || process.cwd();
const save = JSON.parse(fs.readFileSync(path.join(runDir, 'final_save.json'), 'utf8'));
const isPair = (a, b) => (a === 'RBiH' && b === 'HRHB') || (a === 'HRHB' && b === 'RBiH');
const date = (t) => { const d = new Date(Date.UTC(1992, 3, 6 + 7 * (t - 1))); return d.toISOString().slice(0, 10); };
const quarter = (t) => { const d = new Date(Date.UTC(1992, 3, 6 + 7 * (t - 1))); return `${d.getUTCFullYear()}Q${Math.floor(d.getUTCMonth() / 3) + 1}`; };
const rhs = save.political.rbih_hrhb_state;
console.log('ALLIANCE final', save.political.war_alliance_rbih_hrhb, 'mobilization_t', rhs.mobilization_started_turn, `(${date(rhs.mobilization_started_turn)})`,
  'war_t', rhs.war_started_turn, `(${date(rhs.war_started_turn)})`, 'ceasefire_t', rhs.ceasefire_since_turn, `(${date(rhs.ceasefire_since_turn)})`,
  'washington_t', rhs.washington_turn, `(${date(rhs.washington_turn)})`, 'total_bilateral_flips', rhs.total_bilateral_flips);

// Battles by quarter
const q = {};
const bump = (k, f, n = 1) => { q[k] ??= {}; q[k][f] = (q[k][f] || 0) + n; };
const pairBattles = [];
for (const ts of save.turn_summaries) {
  for (const b of ts.battles || []) {
    const k = quarter(ts.turn);
    bump(k, 'all_battles');
    if (isPair(b.attacker_faction, b.defender_faction)) {
      bump(k, `bat_${b.attacker_faction}>${b.defender_faction}`);
      if (b.territory_flipped) bump(k, `cap_${b.attacker_faction}>${b.defender_faction}`);
      pairBattles.push({ turn: ts.turn, ...b });
    }
  }
}
// Control events by quarter (any mechanism)
const mechs = {};
for (const e of save.political.control_events || []) {
  if (isPair(e.from, e.to)) {
    bump(quarter(e.turn), `flip_${e.from}>${e.to}`);
    mechs[e.mechanism] = (mechs[e.mechanism] || 0) + 1;
  }
}
// Operations
const ops = save.operation_history || [];
const opRows = [];
for (const o of ops) {
  const s = JSON.stringify(o);
  const fac = o.faction;
  const tgtFac = o.target_faction || o.enemy_faction || null;
  opRows.push({ id: o.operation_id || o.id, name: o.name || o.operation_name, faction: fac, corps: o.corps_id, start: o.started_turn ?? o.start_turn ?? o.launched_turn, end: o.ended_turn, tgtFac, raw: s.length });
}
// Displacement by caused_by x ethnicity, and by quarter for the pair
const disp = {};
const dispQ = {};
const lines = fs.readFileSync(path.join(runDir, 'displacement_event_log.jsonl'), 'utf8').split('\n');
for (const l of lines) {
  if (!l) continue; const e = JSON.parse(l);
  const k = `${e.caused_by}->${e.ethnicity}`;
  const tot = (e.displaced || 0) + (e.fled_abroad || 0) + (e.killed || 0) + (e.settled || 0);
  disp[k] ??= { displaced: 0, fled_abroad: 0, killed: 0, settled: 0, events: 0 };
  for (const f of ['displaced', 'fled_abroad', 'killed', 'settled']) disp[k][f] += e[f] || 0;
  disp[k].events++;
  if ((e.caused_by === 'HRHB' && e.ethnicity === 'RBiH') || (e.caused_by === 'RBiH' && e.ethnicity === 'HRHB')) {
    const qq = quarter(e.turn); dispQ[qq] ??= {}; dispQ[qq][k] = (dispQ[qq][k] || 0) + tot;
  }
}
console.log('\nPER QUARTER (pair battles / captures / control flips; all_battles for scale)');
for (const k of Object.keys(q).sort()) console.log(k, JSON.stringify(q[k]), dispQ[k] ? 'DISP ' + JSON.stringify(dispQ[k]) : '');
console.log('\nPAIR FLIP MECHANISMS', JSON.stringify(mechs));
console.log('\nDISPLACEMENT caused_by->ethnicity (sum of fields)');
for (const k of Object.keys(disp).sort()) { const v = disp[k]; console.log(k.padEnd(14), JSON.stringify(v), 'total', v.displaced + v.fled_abroad + v.killed + v.settled); }
console.log('\nPAIR BATTLES LIST');
for (const b of pairBattles) console.log(b.turn, date(b.turn), b.attacker_faction, '>', b.defender_faction, b.osid, b.outcome, b.territory_flipped ? 'FLIP' : '', b.primary_attacker_id, 'vs', b.primary_defender_id);
console.log('\nPAIR CONTROL EVENTS');
for (const e of (save.political.control_events || []).filter((e) => isPair(e.from, e.to))) console.log(e.turn, date(e.turn), e.from, '>', e.to, e.settlement_id, e.mechanism);
// Painted reference: region control over time
const KEYS = { jan1993: 40, apr1994: 104, apr1995: 156, oct1995: 188 };
const events = (save.political.control_events || []).slice().sort((a, b) => a.turn - b.turn);
const init = save.political.initial_political_controllers;
const stateAt = (w) => { const st = { ...init }; for (const e of events) if (e.turn <= w) st[e.settlement_id] = e.to; return st; };
const REGIONS = {
  central_bosnia: ['vitez', 'busovaca', 'novi_travnik', 'travnik', 'kiseljak', 'kresevo', 'fojnica', 'kakanj', 'vares', 'zenica', 'zepce', 'bugojno', 'gornji_vakuf', 'donji_vakuf'],
  north_herzegovina: ['prozor', 'jablanica', 'konjic'],
  mostar_herzegovina: ['mostar', 'capljina', 'stolac', 'citluk', 'listica', 'ljubuski', 'grude', 'posusje', 'neum']
};
const munOf = (osid) => osid.split(':')[1];
console.log('\nREGION CONTROL (sim vs painted) at checkpoints and w0/w52/w78');
for (const [r, muns] of Object.entries(REGIONS)) {
  const set = new Set(muns);
  for (const w of [0, 40, 52, 65, 78, 104, 156, 188]) {
    const st = stateAt(w); const c = {};
    for (const [o, f] of Object.entries(st)) if (set.has(munOf(o))) c[f] = (c[f] || 0) + 1;
    const key = Object.entries(KEYS).find(([, ww]) => ww === w)?.[0];
    let pstr = '';
    if (key) {
      const ref = JSON.parse(fs.readFileSync(path.join(root, 'data/source/calibration', `painted_control_${key}.json`), 'utf8')).by_settlement_id;
      const pc = {}; let mis = 0;
      for (const [o, f] of Object.entries(ref)) if (set.has(munOf(o)) && st[o] !== undefined) { pc[f] = (pc[f] || 0) + 1; if (st[o] !== f) mis++; }
      pstr = ` painted ${JSON.stringify(pc)} mismatch ${mis}`;
    }
    console.log(r.padEnd(20), `w${w}`.padEnd(5), date(Math.max(1, w)), JSON.stringify(c), pstr);
  }
}
// painted delta RBiH<->HRHB between checkpoints, and init vs jan1993
const refs = {}; for (const k of Object.keys(KEYS)) refs[k] = JSON.parse(fs.readFileSync(path.join(root, 'data/source/calibration', `painted_control_${k}.json`), 'utf8')).by_settlement_id;
const cmp = (a, b, label) => { const c = {}; for (const o of Object.keys(b)) { if (a[o] && b[o] && a[o] !== b[o] && isPair(a[o], b[o])) { const k = `${a[o]}>${b[o]}`; (c[k] ??= []).push(o); } } console.log(label, Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v.length])), JSON.stringify(c)); };
console.log('\nPAINTED RBiH<->HRHB changes');
cmp(init, refs.jan1993, 'init(t0 sim) -> painted jan1993');
cmp(refs.jan1993, refs.apr1994, 'painted jan1993 -> apr1994');
cmp(refs.apr1994, refs.oct1995, 'painted apr1994 -> oct1995');
console.log('\nOPERATIONS (faction, corps, name, start-end)');
for (const o of opRows) if (o.faction === 'HRHB' || /3rd_corps|4th_corps|6th|7th/.test(o.corps || '')) console.log(o.faction, o.corps, '|', o.name, '|', o.start, '-', o.end, o.tgtFac ?? '');
