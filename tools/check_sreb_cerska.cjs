const fs = require('fs');
const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json','utf8'));
const sectors = save.military.corps_front_sectors;
const srebMunis = new Set(['srebrenica', 'bratunac']);
const cerskaMunis = new Set(['vlasenica']);
for (const [sid, sec] of Object.entries(sectors).sort()) {
  if (!sid.includes('arbih_2nd_corps')) continue;
  const friendly = new Set();
  for (const ss of sec.sub_segments) for (const o of ss.friendly_osids) friendly.add(o);
  const hasSreb = [...friendly].some(o => srebMunis.has(o.split(':')[1]));
  const hasCerska = [...friendly].some(o => cerskaMunis.has(o.split(':')[1]));
  if (hasSreb || hasCerska) {
    const tag = (hasSreb ? 'SREB' : '') + (hasSreb && hasCerska ? '+' : '') + (hasCerska ? 'CERSKA' : '');
    console.log(sid + ': ' + sec.edge_ids.length + ' edges, ' + sec.assigned_brigade_ids.length + ' brigades [' + tag + ']');
    for (const o of [...friendly].sort()) {
      const mun = o.split(':')[1];
      if (srebMunis.has(mun) || cerskaMunis.has(mun)) console.log('  ' + o);
    }
  }
}
