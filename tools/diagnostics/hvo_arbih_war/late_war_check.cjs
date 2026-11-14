// node tools/diagnostics/hvo_arbih_war/late_war_check.cjs <mainRunDir> <candRunDir> [mainSave candSave]
// RF-5B §6 panel late-war no-reward check (Red-team round-2 C1; Calibration round-4 R4-1).
// - HRHB brigade personnel at t170/t180/t188 from the brigade log. Corps-less `generated_phase_i0`
//   brigades (the orphan pair of the HVO-ARBiH diagnosis, finding #6: no corps, never fight) are
//   reported separately and left out of the comparison.
// - PASS/FAIL clause: total HRHB stock at the final save (active brigade personnel + strategic
//   reserve + pool available) within main + 1%.
// - Reported: the HRHB recruitment displacement multiplier (recruitment_turn.ts
//   displacementMultiplierByFaction, majority controller by OSID prefix) and Livno's supply
//   population factor (supply_state_derivation.ts populationMult), at a save (default final_save.json).
const fs = require('fs'); const path = require('path');
const [mainDir, candDir, mainSaveArg, candSaveArg] = process.argv.slice(2);
const load = (dir) => JSON.parse(fs.readFileSync(path.join(dir, 'final_save.json'), 'utf8'));
const finalMain = load(mainDir), finalCand = load(candDir);
const orphanIds = (save) => new Set(Object.values(save.military.formations || {})
  .filter((f) => f.faction === 'HRHB' && !f.corps_id && (f.tags || []).includes('generated_phase_i0') && f.kind === 'brigade')
  .map((f) => f.id));
const pers = (dir, orphans) => { const o = {}, x = {}; for (const ln of fs.readFileSync(path.join(dir, 'brigade_temporal_log.jsonl'), 'utf8').split('\n')) { if (!ln) continue; const e = JSON.parse(ln); if (e.faction !== 'HRHB' || e.status !== 'active') continue; if (orphans.has(e.brigade_id)) x[e.turn] = (x[e.turn] || 0) + (e.personnel || 0); else o[e.turn] = (o[e.turn] || 0) + (e.personnel || 0); } return { o, x }; };
const pm = pers(mainDir, orphanIds(finalMain)), pc = pers(candDir, orphanIds(finalCand));
for (const t of [170, 180, 188]) console.log(`t${t} HRHB personnel excl. orphans main ${pm.o[t]} cand ${pc.o[t]} (${(((pc.o[t] - pm.o[t]) / pm.o[t]) * 100).toFixed(2)}%); corps-less generated_phase_i0 main ${pm.x[t] || 0} cand ${pc.x[t] || 0}`);
const stock = (save) => {
  let brig = 0; for (const f of Object.values(save.military.formations || {})) if (f.faction === 'HRHB' && f.status === 'active' && f.kind === 'brigade') brig += f.personnel || 0;
  const sr = save.military.strategic_reserves; const reserve = typeof sr?.HRHB === 'number' ? sr.HRHB : (sr?.HRHB?.personnel ?? sr?.HRHB?.manpower ?? 0);
  let avail = 0; for (const p of Object.values(save.military.militia_pools || {})) if (p.faction === 'HRHB') avail += p.available || 0;
  return { brig, reserve, avail, total: brig + reserve + avail };
};
const sm = stock(finalMain), sc = stock(finalCand);
const stockPass = sc.total <= sm.total * 1.01;
console.log(`t${finalCand.meta.turn} HRHB stock (brigades+reserve+pool available) main ${sm.total} (${sm.brig}/${sm.reserve}/${sm.avail}) cand ${sc.total} (${sc.brig}/${sc.reserve}/${sc.avail}) (${(((sc.total - sm.total) / sm.total) * 100).toFixed(2)}%) ${stockPass ? 'PASS' : 'FAIL'}`);
const atSave = (s) => {
  const pcs = s.political.political_controllers; const counts = {};
  for (const k of Object.keys(pcs)) { if (!k.startsWith('op:')) continue; const m = k.split(':')[1]; (counts[m] ??= {})[pcs[k]] = (counts[m][pcs[k]] || 0) + 1; }
  const ctrl = {}; for (const [m, c] of Object.entries(counts)) ctrl[m] = Object.entries(c).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0][0];
  const ds = s.displacement.displacement_state || {}; let sum = 0, n = 0;
  for (const m of Object.keys(ds).sort()) { if (ctrl[m] !== 'HRHB') continue; const r = ds[m]; if (!r || r.original_population <= 0) continue; sum += Math.min(1, Math.max(0, r.original_population - r.displaced_out - r.lost_population + r.displaced_in) / r.original_population); n++; }
  const l = ds.livno; const livno = l ? Math.min(1, Math.max(0, l.original_population - l.displaced_out - l.lost_population + l.displaced_in) / l.original_population) : null;
  return { turn: s.meta.turn, mult: n ? sum / n : 1, n, livno };
};
const ms = atSave(mainSaveArg ? JSON.parse(fs.readFileSync(mainSaveArg, 'utf8')) : finalMain);
const cs = atSave(candSaveArg ? JSON.parse(fs.readFileSync(candSaveArg, 'utf8')) : finalCand);
console.log(`t${cs.turn} HRHB displacement multiplier main ${ms.mult.toFixed(4)} (n=${ms.n}) cand ${cs.mult.toFixed(4)} (n=${cs.n}) (${(((cs.mult - ms.mult) / ms.mult) * 100).toFixed(2)}%)`);
console.log(`t${cs.turn} Livno supply population factor main ${ms.livno?.toFixed(4)} cand ${cs.livno?.toFixed(4)}`);
console.log(stockPass ? 'LATE-WAR STOCK CHECK: PASS' : 'LATE-WAR STOCK CHECK: FAIL');
process.exit(stockPass ? 0 : 1);
