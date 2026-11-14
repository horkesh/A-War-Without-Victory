// node tools/diagnostics/hvo_arbih_war/late_war_check.cjs <mainRunDir> <candRunDir> [mainSave candSave]
// RF-5B §6 round-2 Red-team C1: late-war no-reward check. HRHB brigade personnel at t170/t180/t188
// (brigade log); at a save (default final_save.json): the HRHB recruitment displacement multiplier
// (recruitment_turn.ts displacementMultiplierByFaction, majority controller by OSID prefix) and Livno's
// supply population factor (supply_state_derivation.ts populationMult).
const fs = require('fs'); const path = require('path');
const [mainDir, candDir, mainSaveArg, candSaveArg] = process.argv.slice(2);
const pers = (dir) => { const o = {}; for (const ln of fs.readFileSync(path.join(dir, 'brigade_temporal_log.jsonl'), 'utf8').split('\n')) { if (!ln) continue; const e = JSON.parse(ln); if (e.faction === 'HRHB' && e.status === 'active') o[e.turn] = (o[e.turn] || 0) + (e.personnel || 0); } return o; };
const pm = pers(mainDir), pc = pers(candDir);
for (const t of [170, 180, 188]) console.log(`t${t} HRHB personnel main ${pm[t]} cand ${pc[t]} (${(((pc[t] - pm[t]) / pm[t]) * 100).toFixed(2)}%)`);
const atSave = (file) => {
  const s = JSON.parse(fs.readFileSync(file, 'utf8'));
  const pcs = s.political.political_controllers; const counts = {};
  for (const k of Object.keys(pcs)) { if (!k.startsWith('op:')) continue; const m = k.split(':')[1]; (counts[m] ??= {})[pcs[k]] = (counts[m][pcs[k]] || 0) + 1; }
  const ctrl = {}; for (const [m, c] of Object.entries(counts)) ctrl[m] = Object.entries(c).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0][0];
  const ds = s.displacement.displacement_state || {}; let sum = 0, n = 0;
  for (const m of Object.keys(ds).sort()) { if (ctrl[m] !== 'HRHB') continue; const r = ds[m]; if (!r || r.original_population <= 0) continue; sum += Math.min(1, Math.max(0, r.original_population - r.displaced_out - r.lost_population + r.displaced_in) / r.original_population); n++; }
  const l = ds.livno; const livno = l ? Math.min(1, Math.max(0, l.original_population - l.displaced_out - l.lost_population + l.displaced_in) / l.original_population) : null;
  return { turn: s.meta.turn, mult: n ? sum / n : 1, n, livno };
};
const ms = atSave(mainSaveArg || path.join(mainDir, 'final_save.json')); const cs = atSave(candSaveArg || path.join(candDir, 'final_save.json'));
console.log(`t${cs.turn} HRHB displacement multiplier main ${ms.mult.toFixed(4)} (n=${ms.n}) cand ${cs.mult.toFixed(4)} (n=${cs.n}) (${(((cs.mult - ms.mult) / ms.mult) * 100).toFixed(2)}%)`);
console.log(`t${cs.turn} Livno supply population factor main ${ms.livno?.toFixed(4)} cand ${cs.livno?.toFixed(4)}`);
