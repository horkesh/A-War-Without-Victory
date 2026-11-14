// node tools/diagnostics/hvo_arbih_war/hrhb_manpower_check.cjs <mainRunDir> <candidateRunDir>
// RF-5B §6 panel Calibration condition (d), "no reward": HRHB brigade personnel at t66/t80/t90/t100
// within main + 1%; end-state HRHB strategic reserve and HRHB pool committed within main + 2%;
// total HRHB refugees sheltering across all municipalities within main + 500 (panel round 2, replacing the
// Livno proxy: refugees moved between towns by the pass-through are not added); Vitez HRHB refugees at least main - 500.
const fs = require('fs');
const path = require('path');
const [mainDir, candDir] = process.argv.slice(2);

function personnelByTurn(dir) {
  const out = {};
  for (const ln of fs.readFileSync(path.join(dir, 'brigade_temporal_log.jsonl'), 'utf8').split('\n')) {
    if (!ln) continue;
    const e = JSON.parse(ln);
    if (e.faction !== 'HRHB' || e.status !== 'active') continue;
    out[e.turn] = (out[e.turn] || 0) + (e.personnel || 0);
  }
  return out;
}
function findReserve(mil, faction) {
  // Look for any military.* object keyed by faction whose name mentions "reserve" and sum numeric personnel.
  for (const k of Object.keys(mil).sort()) {
    if (!/reserve/i.test(k)) continue;
    const v = mil[k];
    if (v && typeof v === 'object' && v[faction] !== undefined) {
      const x = v[faction];
      if (typeof x === 'number') return { key: k, value: x };
      if (x && typeof x === 'object') {
        for (const f of ['personnel', 'manpower', 'pool', 'available', 'total']) if (typeof x[f] === 'number') return { key: `${k}.${f}`, value: x[f] };
      }
    }
  }
  return null;
}
function endState(dir) {
  const s = JSON.parse(fs.readFileSync(path.join(dir, 'final_save.json'), 'utf8'));
  let committed = 0;
  for (const p of Object.values(s.military.militia_pools || {})) if (p.faction === 'HRHB') committed += p.committed || 0;
  const ds = s.displacement.displacement_state || {};
  return {
    reserve: findReserve(s.military, 'HRHB'),
    committed,
    totalRefugees: Object.values(ds).reduce((sum, r) => sum + (r?.displaced_in_by_faction?.HRHB ?? 0), 0),
    vitez: ds.vitez?.displaced_in_by_faction?.HRHB ?? 0,
  };
}
const pm = personnelByTurn(mainDir);
const pc = personnelByTurn(candDir);
let ok = true;
for (const t of [66, 80, 90, 100]) {
  const lim = (pm[t] || 0) * 1.01;
  const pass = (pc[t] || 0) <= lim;
  ok = ok && pass;
  console.log(`t${t} HRHB personnel main ${pm[t]} cand ${pc[t]} (${(((pc[t] - pm[t]) / pm[t]) * 100).toFixed(2)}%) ${pass ? 'PASS' : 'FAIL'}`);
}
const em = endState(mainDir);
const ec = endState(candDir);
const pct = (a, b) => (((b - a) / a) * 100).toFixed(2) + '%';
if (em.reserve && ec.reserve) {
  const pass = ec.reserve.value <= em.reserve.value * 1.02; ok = ok && pass;
  console.log(`reserve (${em.reserve.key}) main ${em.reserve.value} cand ${ec.reserve.value} (${pct(em.reserve.value, ec.reserve.value)}) ${pass ? 'PASS' : 'FAIL'}`);
} else console.log('reserve: field not found', JSON.stringify(em.reserve), JSON.stringify(ec.reserve));
{ const pass = ec.committed <= em.committed * 1.02; ok = ok && pass; console.log(`HRHB pool committed main ${em.committed} cand ${ec.committed} (${pct(em.committed, ec.committed)}) ${pass ? 'PASS' : 'FAIL'}`); }
{ const pass = ec.totalRefugees <= em.totalRefugees + 500; ok = ok && pass; console.log(`Total HRHB refugees sheltering main ${em.totalRefugees} cand ${ec.totalRefugees} ${pass ? 'PASS' : 'FAIL'}`); }
{ const pass = ec.vitez >= em.vitez - 500; ok = ok && pass; console.log(`Vitez HRHB refugees main ${em.vitez} cand ${ec.vitez} ${pass ? 'PASS' : 'FAIL'}`); }
console.log(ok ? 'NO-REWARD CHECK: PASS' : 'NO-REWARD CHECK: FAIL');
process.exit(ok ? 0 : 1);
