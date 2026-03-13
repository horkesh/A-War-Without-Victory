const fs = require('fs');
const s = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const sectors = s.military.corps_front_sectors;

// Check: what does the corps_aor map say for Sarajevo-area OSIDs?
const corpsAor = s.military.corps_aor;
if (!corpsAor) {
    console.log('No corps_aor in save file');
} else {
    console.log('=== corps_aor for Sarajevo municipalities ===');
    const sarajevoMunis = ['centar_sarajevo', 'stari_grad_sarajevo', 'novo_sarajevo',
        'novi_grad_sarajevo', 'ilidza', 'ilijas', 'vogosca', 'trnovo', 'pale', 'hadzici'];
    for (const [osid, corps] of Object.entries(corpsAor).sort()) {
        const mun = osid.split(':')[1];
        if (sarajevoMunis.includes(mun)) {
            console.log('  ' + osid + ' -> ' + corps);
        }
    }
}

// Check sector sub_segments for Sarajevo-area front edges
console.log('\n=== Herzegovina sector sub_segments with Sarajevo OSIDs ===');
for (const [sid, sec] of Object.entries(sectors).sort()) {
    if (sec.corps_id !== 'vrs_herzegovina') continue;
    for (const ss of sec.sub_segments) {
        const friendlySarj = ss.friendly_osids.filter(o => {
            const m = o.split(':')[1];
            return ['centar_sarajevo','stari_grad_sarajevo','novo_sarajevo',
                'novi_grad_sarajevo','ilidza','ilijas','vogosca','trnovo','pale','hadzici'].includes(m);
        });
        if (friendlySarj.length > 0) {
            console.log('  ' + sid + ' sub_segment:');
            console.log('    friendly (Sarajevo): ' + friendlySarj.join(', '));
            console.log('    hostile: ' + (ss.hostile_osids || []).join(', '));
        }
    }
}

// Sector territory_osids
console.log('\n=== Sector territory_osids in Sarajevo area ===');
const sarajevoMunis2 = ['centar_sarajevo','stari_grad_sarajevo','novo_sarajevo',
    'novi_grad_sarajevo','ilidza','ilijas','vogosca','trnovo','pale','hadzici'];
for (const [sid, sec] of Object.entries(sectors).sort()) {
    if (sec.faction !== 'RS') continue;
    const terr = sec.territory_osids || [];
    const sarajevoTerr = terr.filter(o => sarajevoMunis2.includes(o.split(':')[1]));
    if (sarajevoTerr.length > 0) {
        console.log('  ' + sid + ' [' + sec.corps_id + ']: ' + sarajevoTerr.length + ' Sarajevo territory OSIDs');
        for (const o of sarajevoTerr.sort()) {
            console.log('    ' + o);
        }
    }
}
