const n668 = require('../runs/apr1992_definitive_40w__1062074ab386fe0c__w40_n668/final_save.json');
const n692 = require('../data/derived/latest_run_final_save.json');
const count = (sectors) => {
  const m = {};
  for (const sec of Object.values(sectors)) m[sec.corps_id] = (m[sec.corps_id] || 0) + 1;
  return m;
};
const c668 = count(n668.military.corps_front_sectors);
const c692 = count(n692.military.corps_front_sectors);
const allCorps = [...new Set([...Object.keys(c668), ...Object.keys(c692)])].sort();
console.log('Corps'.padEnd(30) + 'n668'.padStart(5) + 'n692'.padStart(5) + 'delta'.padStart(6));
let t668=0, t692=0;
for (const c of allCorps) {
  const v668 = c668[c] || 0, v692 = c692[c] || 0;
  const d = v692 - v668;
  t668 += v668; t692 += v692;
  if (d !== 0) console.log(c.padEnd(30) + String(v668).padStart(5) + String(v692).padStart(5) + (d>0?'+'+d:String(d)).padStart(6));
}
console.log('TOTAL'.padEnd(30) + String(t668).padStart(5) + String(t692).padStart(5) + (t692-t668>0?'+'+(t692-t668):String(t692-t668)).padStart(6));
