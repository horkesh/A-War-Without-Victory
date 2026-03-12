const fs = require('fs');
const s = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const secs = Object.keys(s.military.corps_front_sectors).filter(k => k.includes('arbih_2nd')).sort();
console.log('2nd corps sectors:', secs.length);
for (const sid of secs) {
  const se = s.military.corps_front_sectors[sid];
  const allF = new Set();
  for (const ss of se.sub_segments) for (const o of ss.friendly_osids) allF.add(o);
  const hasSreb = [...allF].some(o => o.includes('srebrenica') || o.includes('bratunac'));
  const hasCerska = [...allF].some(o => o.includes('vlasenica'));
  const tags = [];
  if (hasSreb) tags.push('SREB');
  if (hasCerska) tags.push('CERSKA');
  console.log(`  ${sid}: ${se.edge_ids.length} edges, ${se.assigned_brigade_ids.length} brigades [${tags.join('+')}]`);
}
