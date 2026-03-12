const fs = require('fs');
const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const formations = save.military.formations;

for (const corpsId of ['arbih_1st_corps', 'arbih_4th_corps']) {
  console.log('=== ' + corpsId + ' ===\n');
  const brigades = [];
  for (const [id, f] of Object.entries(formations)) {
    if (f.faction !== 'RBiH' || f.status !== 'active') continue;
    if (f.kind !== 'brigade' && f.kind !== 'og') continue;
    if (f.corps_id !== corpsId) continue;
    const mun = f.location_osid ? f.location_osid.split(':')[1] : 'none';
    brigades.push({ id, loc: f.location_osid, mun, pers: f.personnel, home: f.home_osid });
  }
  brigades.sort((a, b) => a.mun.localeCompare(b.mun));
  for (const b of brigades) {
    const homeMun = b.home ? b.home.split(':')[1] : 'none';
    console.log('  ' + b.id + '  loc=' + b.mun + '  home=' + homeMun + '  pers=' + b.pers);
  }
  console.log();
}
