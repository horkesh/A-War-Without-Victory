const s = require('../data/derived/latest_run_final_save.json');
const sectors = s.military.corps_front_sectors;
const formations = s.military.formations;

// Reconstruct which corps owns which front-edge OSIDs by looking at sector assignments
const osidToCorps = new Map();
for (const [sid, sec] of Object.entries(sectors)) {
  for (const ss of sec.sub_segments) {
    for (const o of ss.friendly_osids) {
      const existing = osidToCorps.get(o);
      if (existing && existing !== sec.corps_id) {
        // Shared between corps — note both
        osidToCorps.set(o, existing + '+' + sec.corps_id);
      } else {
        osidToCorps.set(o, sec.corps_id);
      }
    }
  }
}

// Check Zavidovici/Olovo/Vares area
const check = ['hajderovici_2', 'zavidovici_2', 'ribnica_dio', 'cardak_2',
  'kamensko_2', 'olovo_2', 'gurdici_2', 'milankovici_2',
  'ravne', 'vukanovici', 'brnjic_2', 'budozelje_2',
  'tuholj_2', 'kladanj_3'];
console.log('=== Front-edge OSID corps assignments ===');
for (const slug of check) {
  for (const [osid, corps] of osidToCorps) {
    if (osid.includes(slug)) {
      console.log(osid.padEnd(40) + ' -> ' + corps);
    }
  }
}

// Check brigade seeding: which brigades from which corps are in this area?
console.log('\n=== Brigade locations near Zavidovici/Olovo ===');
const targetMuns = ['zavidovici', 'olovo', 'vares', 'kakanj', 'breza', 'kladanj', 'banovici'];
for (const [fid, f] of Object.entries(formations)) {
  if (f.status !== 'active' || f.faction !== 'RBiH') continue;
  if (!f.location_osid) continue;
  const locMun = f.location_osid.split(':')[1];
  const homeMun = f.home_osid ? f.home_osid.split(':')[1] : '?';
  if (targetMuns.includes(locMun) || targetMuns.includes(homeMun)) {
    console.log((f.name || fid).padEnd(40) + ' corps=' + (f.corps_id || '?').padEnd(20) +
      ' home=' + homeMun.padEnd(15) + ' at=' + locMun);
  }
}

// Check territory_osids to understand corps extent
console.log('\n=== 1st Corps territory municipalities in sector 11 ===');
const sec11 = sectors['sector:arbih_1st_corps:11'];
if (sec11) {
  const muns = new Set();
  for (const o of sec11.territory_osids) muns.add(o.split(':')[1]);
  console.log([...muns].sort().join(', '));
}

console.log('\n=== 3rd Corps sector 0 territory ===');
const sec3_0 = sectors['sector:arbih_3rd_corps:0'];
if (sec3_0) {
  const friendly = sec3_0.sub_segments.flatMap(ss => ss.friendly_osids);
  console.log('friendly:', friendly.join(', '));
  const muns = new Set();
  for (const o of sec3_0.territory_osids) muns.add(o.split(':')[1]);
  console.log('territory muns:', [...muns].sort().join(', '));
}
