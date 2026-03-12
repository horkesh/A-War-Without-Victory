const fs = require('fs');
const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const formations = save.military.formations;

console.log('=== All Corps/Army Formations ===\n');
for (const [id, f] of Object.entries(formations).sort()) {
  if (f.kind !== 'corps' && f.kind !== 'army') continue;
  console.log(id + '  kind=' + f.kind + '  faction=' + f.faction + '  loc=' + f.location_osid + '  hq=' + f.hq_osid + '  home=' + f.home_osid);
}
