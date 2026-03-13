const fs = require('fs');
const s = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const f = s.military.formations;
const pc = s.political.political_controllers;

// Reconstruct what mapOsidsToCorps Phase 1 would do for RS
// Phase 1: home_osid seeds
console.log('=== Phase 1: home_osid seeds (RS, Sarajevo area) ===');
const sarajevoMunis = ['centar_sarajevo','stari_grad_sarajevo','novo_sarajevo',
    'novi_grad_sarajevo','ilidza','ilijas','vogosca','trnovo','pale','hadzici'];

for (const [fid, fm] of Object.entries(f).sort()) {
    if (fm.faction !== 'RS' || fm.kind !== 'brigade' || fm.status !== 'active') continue;
    if (!fm.home_osid) continue;
    const mun = fm.home_osid.split(':')[1];
    if (!sarajevoMunis.includes(mun)) continue;
    const ctrl = pc[fm.home_osid];
    const isRS = ctrl === 'RS';
    console.log('  ' + fid + ' corps=' + fm.corps_id + ' home=' + fm.home_osid + ' ctrl=' + ctrl + ' seeds=' + (isRS ? 'YES' : 'NO (enemy)'));
}

// Phase 1b: location seeds
console.log('\n=== Phase 1b: location seeds (RS, Sarajevo area) ===');
for (const [fid, fm] of Object.entries(f).sort()) {
    if (fm.faction !== 'RS' || fm.kind !== 'brigade' || fm.status !== 'active') continue;
    if (!fm.location_osid) continue;
    const mun = fm.location_osid.split(':')[1];
    if (!sarajevoMunis.includes(mun)) continue;
    const ctrl = pc[fm.location_osid];
    console.log('  ' + fid + ' corps=' + fm.corps_id + ' loc=' + fm.location_osid + ' ctrl=' + ctrl);
}

// Check: how many RS-controlled OSIDs in Sarajevo area are there?
console.log('\n=== RS-controlled OSIDs in Sarajevo municipalities ===');
let count = 0;
for (const [osid, ctrl] of Object.entries(pc).sort()) {
    const mun = osid.split(':')[1];
    if (ctrl === 'RS' && sarajevoMunis.includes(mun)) {
        count++;
        console.log('  ' + osid);
    }
}
console.log('Total: ' + count);
