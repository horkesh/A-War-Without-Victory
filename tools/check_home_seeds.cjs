const fs = require('fs');
const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const formations = save.military.formations;
const pc = save.political.political_controllers || {};

console.log('=== 1st Corps Brigade Home OSIDs ===\n');
for (const [id, f] of Object.entries(formations).sort()) {
  if (f.faction !== 'RBiH' || f.status !== 'active') continue;
  if (f.kind !== 'brigade' && f.kind !== 'og') continue;
  if (f.corps_id !== 'arbih_1st_corps') continue;
  const home = f.home_osid;
  const ctrl = pc[home] || 'unknown';
  const friendly = ctrl === 'RBiH';
  console.log('  ' + id + '  home=' + home + '  ctrl=' + ctrl + (friendly ? '' : '  *** ENEMY ***'));
}

console.log('\n=== 4th Corps Brigade Home OSIDs ===\n');
for (const [id, f] of Object.entries(formations).sort()) {
  if (f.faction !== 'RBiH' || f.status !== 'active') continue;
  if (f.kind !== 'brigade' && f.kind !== 'og') continue;
  if (f.corps_id !== 'arbih_4th_corps') continue;
  const home = f.home_osid;
  const ctrl = pc[home] || 'unknown';
  const friendly = ctrl === 'RBiH';
  console.log('  ' + id + '  home=' + home + '  ctrl=' + ctrl + (friendly ? '' : '  *** ENEMY ***'));
}
